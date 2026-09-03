import json
import os
import time
import urllib.request
import urllib.error
from werkzeug.security import generate_password_hash, check_password_hash

CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'firebase-applet-config.json')
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
STORE_FILE = os.path.join(DATA_DIR, 'store.json')

# Load Firebase configuration
config = {}
if os.path.exists(CONFIG_PATH):
    try:
        with open(CONFIG_PATH, 'r') as f:
            config = json.load(f)
    except Exception as e:
        print(f"Warning: Could not parse firebase-applet-config.json: {e}")

PROJECT_ID = config.get('projectId', 'innate-embassy-4xjsq')
API_KEY = config.get('apiKey', '')
DATABASE_ID = config.get('firestoreDatabaseId', '(default)')

FIRESTORE_REST_BASE = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/{DATABASE_ID}/documents"

# Ensure local data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

def _load_local_store():
    if os.path.exists(STORE_FILE):
        try:
            with open(STORE_FILE, 'r') as f:
                return json.load(f)
        except Exception:
            pass
    return {"sweets": {}, "sales": {}, "users": {}}

def _save_local_store(data):
    try:
        with open(STORE_FILE, 'w') as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error saving local store: {e}")

def _to_firestore_fields(doc_dict):
    fields = {}
    for k, v in doc_dict.items():
        if k == 'id':
            continue
        if isinstance(v, bool):
            fields[k] = {"booleanValue": v}
        elif isinstance(v, (int, float)):
            if isinstance(v, int):
                fields[k] = {"integerValue": str(v)}
            else:
                fields[k] = {"doubleValue": float(v)}
        elif isinstance(v, str):
            fields[k] = {"stringValue": v}
        elif isinstance(v, list):
            fields[k] = {"arrayValue": {"values": [_to_firestore_val(i) for i in v]}}
        elif isinstance(v, dict):
            fields[k] = {"mapValue": {"fields": _to_firestore_fields(v)}}
        elif v is None:
            fields[k] = {"nullValue": None}
    return fields

def _to_firestore_val(v):
    if isinstance(v, bool):
        return {"booleanValue": v}
    elif isinstance(v, int):
        return {"integerValue": str(v)}
    elif isinstance(v, float):
        return {"doubleValue": float(v)}
    elif isinstance(v, str):
        return {"stringValue": v}
    return {"stringValue": str(v)}

def _from_firestore_fields(fields):
    doc = {}
    for k, v in fields.items():
        if "stringValue" in v:
            doc[k] = v["stringValue"]
        elif "integerValue" in v:
            doc[k] = int(v["integerValue"])
        elif "doubleValue" in v:
            doc[k] = float(v["doubleValue"])
        elif "booleanValue" in v:
            doc[k] = v["booleanValue"]
        elif "nullValue" in v:
            doc[k] = None
        elif "arrayValue" in v:
            arr = v["arrayValue"].get("values", [])
            doc[k] = [_from_firestore_val(i) for i in arr]
        elif "mapValue" in v:
            doc[k] = _from_firestore_fields(v["mapValue"].get("fields", {}))
    return doc

def _from_firestore_val(v):
    for key in ["stringValue", "booleanValue"]:
        if key in v:
            return v[key]
    if "integerValue" in v:
        return int(v["integerValue"])
    if "doubleValue" in v:
        return float(v["doubleValue"])
    return None

# ---------------------------------------------------------------------------
# Firestore REST API Helper with Local Fallback
# ---------------------------------------------------------------------------
def _firestore_get_collection(collection_name):
    store = _load_local_store()
    cached = list(store.get(collection_name, {}).values())
    if cached:
        return cached

    url = f"{FIRESTORE_REST_BASE}/{collection_name}?pageSize=300"
    if API_KEY:
        url += f"&key={API_KEY}"
    try:
        req = urllib.request.Request(url, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=1.5) as res:
            data = json.loads(res.read().decode('utf-8'))
            docs = []
            for item in data.get('documents', []):
                doc_id = item['name'].split('/')[-1]
                fields = item.get('fields', {})
                parsed = _from_firestore_fields(fields)
                parsed['id'] = doc_id
                docs.append(parsed)
            if docs:
                for d in docs:
                    if collection_name not in store:
                        store[collection_name] = {}
                    store[collection_name][d['id']] = d
                _save_local_store(store)
                return docs
    except Exception as e:
        pass

    return list(store.get(collection_name, {}).values())

import threading

def _async_cloud_write(url, payload):
    try:
        req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'}, method='PATCH')
        with urllib.request.urlopen(req, timeout=3) as res:
            pass
    except Exception:
        pass

def _firestore_save_document(collection_name, doc_id, data_dict):
    # Always save locally first to guarantee zero data loss & instant response
    store = _load_local_store()
    if collection_name not in store:
        store[collection_name] = {}
    store[collection_name][doc_id] = {**data_dict, "id": doc_id}
    _save_local_store(store)

    # Attempt cloud firestore write in background thread
    url = f"{FIRESTORE_REST_BASE}/{collection_name}/{doc_id}"
    if API_KEY:
        url += f"?key={API_KEY}"
    payload = json.dumps({"fields": _to_firestore_fields(data_dict)}).encode('utf-8')

    t = threading.Thread(target=_async_cloud_write, args=(url, payload), daemon=True)
    t.start()
    return True

# ---------------------------------------------------------------------------
# Public Functions
# ---------------------------------------------------------------------------
def get_all_sweets():
    sweets = _firestore_get_collection('sweets')
    if not sweets:
        import seed_data
        seed_data.seed_sweets()
        sweets = _firestore_get_collection('sweets')
    return sweets

def get_sweet_by_name(name):
    for sweet in get_all_sweets():
        if sweet.get('name', '').lower() == name.lower():
            return sweet
    return None

def add_sale(sale_record):
    sale_id = f"sale_{int(time.time()*1000)}_{os.urandom(3).hex()}"
    if 'timestamp' not in sale_record:
        sale_record['timestamp'] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    _firestore_save_document('sales', sale_id, sale_record)
    return sale_id

def get_all_sales():
    return _firestore_get_collection('sales')

def get_sales_for_customer(email):
    all_sales = get_all_sales()
    if not email:
        return []
    filtered = []
    for s in all_sales:
        if s.get('customer_email', '').lower() == email.lower():
            filtered.append(s)
    # Sort descending by timestamp
    filtered.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    return filtered

def get_user_by_email(email):
    if not email:
        return None
    users = _firestore_get_collection('users')
    for u in users:
        if u.get('email', '').lower() == email.lower():
            return u
    return None

def register_firebase_auth_user(email, password, display_name=None):
    """
    Attempts to register user with Firebase Authentication Identity Toolkit REST API.
    Returns (auth_data, error_str). If service is not enabled, fails gracefully.
    """
    if not API_KEY:
        return None, "No Firebase API key found"
    
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signUp?key={API_KEY}"
    payload = {
        "email": email,
        "password": password,
        "returnSecureToken": True
    }
    if display_name:
        payload["displayName"] = display_name

    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            return data, None
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode('utf-8'))
            err_msg = err_body.get('error', {}).get('message', str(e))
            return None, err_msg
        except Exception:
            return None, str(e)
    except Exception as e:
        return None, str(e)

def create_user(name, email, password, role='customer', phone=''):
    email_clean = email.strip().lower()
    existing = get_user_by_email(email_clean)
    if existing:
        return None, "An account with this email address already exists."

    # Attempt registration with Firebase Authentication Identity Toolkit
    fb_auth_data, fb_err = register_firebase_auth_user(email_clean, password, display_name=name)
    fb_uid = fb_auth_data.get('localId') if fb_auth_data else None

    password_hash = generate_password_hash(password)
    user_id = fb_uid or f"user_{int(time.time()*1000)}_{os.urandom(3).hex()}"

    user_record = {
        "id": user_id,
        "firebase_auth_uid": fb_uid or "",
        "name": name.strip(),
        "email": email_clean,
        "password_hash": password_hash,
        "role": role,
        "phone": phone.strip() if phone else "",
        "auth_provider": "firebase_auth" if fb_uid else "firebase_firestore",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    _firestore_save_document('users', user_id, user_record)
    return user_record, None
