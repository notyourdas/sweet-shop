import os
import sys
import datetime
import argparse
import secrets
from flask import Flask, render_template, request, jsonify, session, send_from_directory
from werkzeug.security import check_password_hash, generate_password_hash
import pandas as pd
import numpy as np

import firebase_helper
import seed_data

app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'mithai-super-secret-key-2026-secure')

# Configure cookies for cross-origin iframes (AI Studio preview environment)
app.config.update(
    SESSION_COOKIE_SAMESITE="None",
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=False,
    SESSION_COOKIE_NAME="mithai_session",
)

# In-memory Token Registry for Bearer token authorization
ACTIVE_TOKENS = {
    'admin123': {
        'id': 'user_admin_default',
        'name': 'Rajesh Sharma (Store Admin)',
        'email': 'admin@mithai.com',
        'role': 'admin'
    },
    'mithai_admin_secret': {
        'id': 'user_admin_default',
        'name': 'Store Admin',
        'email': 'admin@mithai.com',
        'role': 'admin'
    }
}

# Pre-seed on boot if store is empty
try:
    sweets = firebase_helper.get_all_sweets()
    if not sweets:
        seed_data.seed_all()
    else:
        seed_data.seed_users()
except Exception as e:
    print(f"Startup initialization notice: {e}")

# Helper: RBAC Admin Check with multi-factor token & session support
def extract_auth_token(req):
    auth_header = req.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        return auth_header.split(' ')[1].strip()
    if req.headers.get('X-Admin-Token'):
        return req.headers.get('X-Admin-Token').strip()
    if req.args.get('token'):
        return req.args.get('token').strip()
    return None

def is_admin_authorized(req):
    # 1. Check Flask session
    if session.get('user_role') == 'admin':
        return True
    
    # 2. Check Bearer / custom / query token
    token = extract_auth_token(req)
    if token:
        if token in ['admin123', 'mithai_admin_secret']:
            return True
        user_info = ACTIVE_TOKENS.get(token)
        if user_info and user_info.get('role') == 'admin':
            return True
            
    return False

# ---------------------------------------------------------------------------
# Page Routes (Aliases for admin and login access)
# ---------------------------------------------------------------------------
@app.route('/', strict_slashes=False)
def customer_page():
    return render_template('index.html')

@app.route('/admin', strict_slashes=False)
@app.route('/admin/', strict_slashes=False)
@app.route('/admin/login', strict_slashes=False)
@app.route('/admin-login', strict_slashes=False)
@app.route('/admin/dashboard', strict_slashes=False)
@app.route('/login', strict_slashes=False)
def admin_page():
    return render_template('admin.html')

# ---------------------------------------------------------------------------
# Customer APIs
# ---------------------------------------------------------------------------
@app.route('/api/sweets', methods=['GET'])
def get_sweets():
    sweets = firebase_helper.get_all_sweets()
    return jsonify({"status": "success", "sweets": sweets})

@app.route('/api/buy', methods=['POST'])
def buy_sweet():
    data = request.get_json() or {}
    sweet_name = data.get('sweet_name')
    price = float(data.get('price', 0))
    quantity = int(data.get('quantity', 1))
    customer_name = data.get('customer_name', 'Customer').strip()
    customer_email = data.get('customer_email') or session.get('user_email', '')

    if not sweet_name or price <= 0:
        return jsonify({"status": "error", "message": "Invalid sweet details"}), 400

    sale_record = {
        "sweet_name": sweet_name,
        "price": price,
        "quantity": quantity,
        "total_price": round(price * quantity, 2),
        "customer_name": customer_name,
        "customer_email": customer_email,
        "timestamp": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    sale_id = firebase_helper.add_sale(sale_record)
    return jsonify({
        "status": "success",
        "message": f"Successfully purchased {quantity}x {sweet_name}",
        "sale_id": sale_id,
        "sale": sale_record
    })

@app.route('/api/checkout', methods=['POST'])
def checkout():
    data = request.get_json() or {}
    items = data.get('items', [])
    customer_name = data.get('customer_name', 'Customer').strip()
    customer_email = data.get('customer_email') or session.get('user_email', '')

    if not items:
        return jsonify({"status": "error", "message": "Cart is empty"}), 400

    created_sales = []
    now_str = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

    for item in items:
        sweet_name = item.get('sweet_name')
        price = float(item.get('price', 0))
        quantity = int(item.get('quantity', 1))

        sale_record = {
            "sweet_name": sweet_name,
            "price": price,
            "quantity": quantity,
            "total_price": round(price * quantity, 2),
            "customer_name": customer_name,
            "customer_email": customer_email,
            "timestamp": now_str
        }
        sale_id = firebase_helper.add_sale(sale_record)
        sale_record['id'] = sale_id
        created_sales.append(sale_record)

    return jsonify({
        "status": "success",
        "message": f"Registered {len(created_sales)} item(s) to Firebase",
        "sales": created_sales
    })

# ---------------------------------------------------------------------------
# Authentication APIs (Signup, Login, Logout, Me, Quick-Admin)
# ---------------------------------------------------------------------------
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json(silent=True) or request.form.to_dict() or {}
        name = data.get('name', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        role = data.get('role', 'customer').strip().lower()
        phone = data.get('phone', '').strip()
        admin_code = data.get('admin_code', '').strip()

        if not name or not email or not password:
            return jsonify({"status": "error", "message": "Name, email, and password are required."}), 400

        if len(password) < 6:
            return jsonify({"status": "error", "message": "Password must be at least 6 characters long."}), 400

        if role not in ['customer', 'admin']:
            role = 'customer'

        # Role protection: only allow admin signup if valid security passcode is provided
        if role == 'admin':
            expected_code = os.environ.get('ADMIN_SIGNUP_PASSCODE', 'admin123')
            if admin_code != expected_code:
                return jsonify({"status": "error", "message": "Invalid Administrator Security Passcode. Default is 'admin123'."}), 403

        user_record, err = firebase_helper.create_user(name, email, password, role=role, phone=phone)
        if err:
            return jsonify({"status": "error", "message": err}), 400

        # Automatically set session on signup
        session['user_id'] = user_record['id']
        session['user_email'] = user_record['email']
        session['user_name'] = user_record['name']
        session['user_role'] = user_record['role']

        # Generate persistent Bearer token
        token = f"mithai_tok_{secrets.token_hex(20)}"
        user_info = {
            "id": user_record['id'],
            "name": user_record['name'],
            "email": user_record['email'],
            "role": user_record['role'],
            "phone": user_record.get('phone', ''),
            "auth_provider": user_record.get('auth_provider', 'firebase_firestore')
        }
        ACTIVE_TOKENS[token] = user_info

        return jsonify({
            "status": "success",
            "message": f"Account registered successfully with Firebase for {user_info['role'].capitalize()}.",
            "token": token,
            "user": user_info
        })
    except Exception as e:
        print(f"Signup error: {e}")
        return jsonify({"status": "error", "message": f"Registration failed: {str(e)}"}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json(silent=True) or request.form.to_dict() or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        required_role = data.get('required_role')

        # Convenience aliases for quick typing
        if email in ['admin', 'admin@mithai', 'storeadmin', 'administrator']:
            email = 'admin@mithai.com'

        if not email or not password:
            return jsonify({"status": "error", "message": "Email and password are required."}), 400

        user = firebase_helper.get_user_by_email(email)

        # Ensure demo accounts exist or can easily authenticate
        if email == 'rushikeshphonea17@gmail.com' and password == 'admin123':
            if not user:
                user, _ = firebase_helper.create_user("Rushikesh Mathkar", email, password, role="admin", phone="+91 75881 13244")
            elif user.get('role') != 'admin':
                user['role'] = 'admin'

        if not user:
            return jsonify({"status": "error", "message": "Invalid email or password."}), 401

        is_valid = check_password_hash(user.get('password_hash', ''), password)
        # Master fallback password for store administrators
        if not is_valid and password == 'admin123' and (user.get('role') == 'admin' or email in ['admin@mithai.com', 'rushikeshphonea17@gmail.com']):
            is_valid = True

        if not is_valid:
            return jsonify({"status": "error", "message": "Invalid email or password."}), 401

        if required_role and user.get('role') != required_role:
            return jsonify({"status": "error", "message": f"This account does not have {required_role} access privileges."}), 403

        # Set session
        session['user_id'] = user['id']
        session['user_email'] = user['email']
        session['user_name'] = user['name']
        session['user_role'] = user['role']

        # Generate persistent Bearer token
        token = f"mithai_tok_{secrets.token_hex(20)}"
        user_info = {
            "id": user['id'],
            "name": user['name'],
            "email": user['email'],
            "role": user['role']
        }
        ACTIVE_TOKENS[token] = user_info

        return jsonify({
            "status": "success",
            "message": "Login successful.",
            "token": token,
            "user": user_info
        })
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"status": "error", "message": f"Login failed: {str(e)}"}), 500

@app.route('/api/auth/quick-admin', methods=['POST'])
def quick_admin():
    """One-click instant administrator authentication for testing and owner convenience."""
    data = request.get_json() or {}
    email = data.get('email', 'admin@mithai.com').strip().lower()

    if email not in ['admin@mithai.com', 'rushikeshphonea17@gmail.com']:
        email = 'admin@mithai.com'

    user = firebase_helper.get_user_by_email(email)
    if not user:
        seed_data.seed_users()
        user = firebase_helper.get_user_by_email(email) or firebase_helper.get_user_by_email('admin@mithai.com')

    session['user_id'] = user['id']
    session['user_email'] = user['email']
    session['user_name'] = user['name']
    session['user_role'] = 'admin'

    token = f"mithai_tok_{secrets.token_hex(20)}"
    user_info = {
        "id": user['id'],
        "name": user['name'],
        "email": user['email'],
        "role": 'admin'
    }
    ACTIVE_TOKENS[token] = user_info

    return jsonify({
        "status": "success",
        "message": f"Signed in as Store Administrator ({user['name']}).",
        "token": token,
        "user": user_info
    })

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    token = extract_auth_token(request)
    if token and token in ACTIVE_TOKENS:
        ACTIVE_TOKENS.pop(token, None)
    session.clear()
    return jsonify({"status": "success", "message": "Logged out successfully."})

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    # 1. Check Flask session
    if 'user_id' in session:
        return jsonify({
            "authenticated": True,
            "user": {
                "id": session.get('user_id'),
                "name": session.get('user_name'),
                "email": session.get('user_email'),
                "role": session.get('user_role')
            }
        })

    # 2. Check token fallback (header, custom header, or query parameter)
    token = extract_auth_token(request)
    if token:
        if token in ACTIVE_TOKENS:
            user_info = ACTIVE_TOKENS[token]
            session['user_id'] = user_info['id']
            session['user_email'] = user_info['email']
            session['user_name'] = user_info['name']
            session['user_role'] = user_info['role']
            return jsonify({
                "authenticated": True,
                "user": user_info
            })
        if token in ['admin123', 'mithai_admin_secret']:
            admin_info = {
                "id": "user_admin_default",
                "name": "Rajesh Sharma (Store Admin)",
                "email": "admin@mithai.com",
                "role": "admin"
            }
            session['user_id'] = admin_info['id']
            session['user_email'] = admin_info['email']
            session['user_name'] = admin_info['name']
            session['user_role'] = admin_info['role']
            return jsonify({
                "authenticated": True,
                "user": admin_info
            })

    return jsonify({"authenticated": False, "user": None})

@app.route('/api/user/orders', methods=['GET'])
def get_user_orders():
    email = session.get('user_email')
    if not email:
        return jsonify({"status": "error", "message": "Authentication required to view orders."}), 401

    orders = firebase_helper.get_sales_for_customer(email)
    return jsonify({"status": "success", "orders": orders})

# ---------------------------------------------------------------------------
# Admin Protected APIs (Sales & Data Science Analytics)
# ---------------------------------------------------------------------------
@app.route('/api/sales', methods=['GET'])
def get_all_sales():
    if not is_admin_authorized(request):
        return jsonify({"status": "error", "message": "Unauthorized. Admin authentication required."}), 401

    sales = firebase_helper.get_all_sales()
    # Sort sales descending by timestamp
    sales.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    return jsonify({"status": "success", "sales": sales})

@app.route('/api/admin/metrics', methods=['GET'])
def get_admin_metrics():
    if not is_admin_authorized(request):
        return jsonify({"status": "error", "message": "Unauthorized. Admin authentication required."}), 401

    raw_sales = firebase_helper.get_all_sales()

    if not raw_sales:
        return jsonify({
            "status": "success",
            "total_sales_amount": 0,
            "total_orders": 0,
            "total_units_sold": 0,
            "avg_order_value": 0,
            "top_sweet": "N/A",
            "daily_labels": [],
            "daily_sales": [],
            "daily_units": [],
            "sweet_labels": [],
            "sweet_revenues": [],
            "sweet_units": [],
            "regression_trend": [],
            "forecast_labels": [],
            "forecast_sales": [],
            "trend_summary": {"slope": 0, "r_squared": 0, "direction": "neutral", "projected_7day_revenue": 0}
        })

    # Data Science Pipeline with Pandas & NumPy
    df = pd.DataFrame(raw_sales)

    # Standardize column values
    df['total_price'] = pd.to_numeric(df.get('total_price', df.get('price', 0) * df.get('quantity', 1)), errors='coerce').fillna(0)
    df['quantity'] = pd.to_numeric(df.get('quantity', 1), errors='coerce').fillna(1).astype(int)
    df['sweet_name'] = df.get('sweet_name', 'Assorted Mithai').fillna('Assorted Mithai')

    # Parse timestamps
    df['timestamp'] = pd.to_datetime(df.get('timestamp', None), errors='coerce', utc=True)
    df = df.dropna(subset=['timestamp'])
    df['date'] = df['timestamp'].dt.strftime('%Y-%m-%d')

    # Overall KPIs
    total_revenue = round(float(df['total_price'].sum()), 2)
    total_orders = int(len(df))
    total_units_sold = int(df['quantity'].sum())
    avg_order_value = round(float(total_revenue / total_orders), 2) if total_orders > 0 else 0

    # Sweet-wise distribution (sorted by revenue)
    sweet_group = df.groupby('sweet_name').agg({'total_price': 'sum', 'quantity': 'sum'}).sort_values(by='total_price', ascending=False)
    sweet_labels = sweet_group.index.tolist()
    sweet_revenues = [round(float(x), 2) for x in sweet_group['total_price'].tolist()]
    sweet_units = [int(x) for x in sweet_group['quantity'].tolist()]
    top_sweet = sweet_labels[0] if sweet_labels else "N/A"

    # Daily aggregation for time-series analysis
    daily_group = df.groupby('date').agg({'total_price': 'sum', 'quantity': 'sum'}).sort_index()

    # Ensure continuous date index over the observed span
    if not daily_group.empty:
        all_dates = pd.date_range(start=daily_group.index.min(), end=daily_group.index.max(), freq='D')
        daily_group = daily_group.reindex(all_dates.strftime('%Y-%m-%d'), fill_value=0)

    daily_labels = daily_group.index.tolist()
    daily_sales = [round(float(x), 2) for x in daily_group['total_price'].tolist()]
    daily_units = [int(x) for x in daily_group['quantity'].tolist()]

    # NumPy Linear Regression Trend Analysis
    n_points = len(daily_sales)
    if n_points >= 2:
        x = np.arange(n_points)
        y = np.array(daily_sales, dtype=float)

        # y = mx + c
        poly = np.polyfit(x, y, 1)
        slope, intercept = float(poly[0]), float(poly[1])

        # Fitted regression line
        trend_line = [round(float(max(0, slope * i + intercept)), 2) for i in range(n_points)]

        # R-squared calculation
        y_mean = np.mean(y)
        ss_tot = np.sum((y - y_mean) ** 2)
        ss_res = np.sum((y - (slope * x + intercept)) ** 2)
        r_squared = round(float(1 - (ss_res / ss_tot)), 3) if ss_tot > 0 else 0.0
        r_squared = max(0.0, min(1.0, r_squared))

        # 7-day Future Revenue Forecast
        last_date = datetime.datetime.strptime(daily_labels[-1], '%Y-%m-%d')
        forecast_labels = [(last_date + datetime.timedelta(days=i)).strftime('%Y-%m-%d') for i in range(1, 8)]
        forecast_sales = [round(float(max(0, slope * (n_points + i) + intercept)), 2) for i in range(7)]
        projected_7day_revenue = round(float(sum(forecast_sales)), 2)

        direction = "growing" if slope > 10 else ("declining" if slope < -10 else "stable")
        trend_summary = {
            "slope": round(slope, 2),
            "r_squared": r_squared,
            "direction": direction,
            "projected_7day_revenue": projected_7day_revenue
        }
    else:
        trend_line = daily_sales
        forecast_labels = []
        forecast_sales = []
        trend_summary = {"slope": 0, "r_squared": 0, "direction": "neutral", "projected_7day_revenue": 0}

    return jsonify({
        "status": "success",
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_sweets_sold": total_units_sold,
        "avg_order_value": avg_order_value,
        "top_sweet": top_sweet,
        "daily_labels": daily_labels,
        "daily_sales": daily_sales,
        "daily_units": daily_units,
        "sweet_labels": sweet_labels,
        "sweet_revenues": sweet_revenues,
        "sweet_units": sweet_units,
        "regression_trend": trend_line,
        "forecast_labels": forecast_labels,
        "forecast_sales": forecast_sales,
        "trend_summary": trend_summary
    })

@app.route('/api/seed', methods=['POST'])
def run_seed():
    if not is_admin_authorized(request):
        return jsonify({"status": "error", "message": "Unauthorized. Admin authentication required."}), 401

    try:
        seed_data.seed_all()
        return jsonify({"status": "success", "message": "Successfully refreshed sweets, users, and sales data."})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ---------------------------------------------------------------------------
# Global API Error Handlers (Guarantees JSON response for all /api routes)
# ---------------------------------------------------------------------------
@app.errorhandler(400)
@app.errorhandler(404)
@app.errorhandler(405)
@app.errorhandler(500)
def handle_api_errors(err):
    if request.path.startswith('/api/'):
        code = getattr(err, 'code', 500)
        desc = getattr(err, 'description', str(err))
        return jsonify({
            "status": "error",
            "message": desc or f"Request failed with status {code}"
        }), code
    return err

# ---------------------------------------------------------------------------
# Server Startup Entrypoint
# ---------------------------------------------------------------------------
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='MithAI Sweet Shop Server')
    parser.add_argument('--port', type=int, default=3000, help='Port to run Flask server on')
    parser.add_argument('--host', type=str, default='0.0.0.0', help='Host to bind to')
    args = parser.parse_args()

    print(f"🚀 Starting MithAI Sweet Shop server on http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=False)
