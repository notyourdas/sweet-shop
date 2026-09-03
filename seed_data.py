import datetime
import random
from werkzeug.security import generate_password_hash
from firebase_helper import _load_local_store, _save_local_store

SWEETS_CATALOG = [
    {
        "id": "sweet_kaju_katli",
        "name": "Kaju Katli",
        "price": 420.0,
        "category": "Dry Fruit & Silver Leaf",
        "description": "Exquisite diamond-cut fudge handcrafted from premium Goan cashews, pure sugar, and edible silver foil.",
        "unit": "Gift Box (400g)",
        "rating": 5.0,
        "image_url": "/static/images/sweets/kaju_katli.jpg",
        "fallback_url": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80",
        "in_stock": True
    },
    {
        "id": "sweet_gulab_jamun",
        "name": "Gulab Jamun",
        "price": 120.0,
        "category": "Syrup & Warm",
        "description": "Golden khoya spheres slow-fried in desi ghee, soaked in rose and saffron infused sugar nectar.",
        "unit": "Box of 6 pcs (350g)",
        "rating": 4.9,
        "image_url": "/static/images/sweets/gulab_jamun.jpg",
        "fallback_url": "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=800&q=80",
        "in_stock": True
    },
    {
        "id": "sweet_rasgulla",
        "name": "Rasgulla",
        "price": 140.0,
        "category": "Syrup & Spongy",
        "description": "Delicate, spongy Chenna (cottage cheese) balls slow-cooked in clarified light cardamom sugar nectar.",
        "unit": "Box of 8 pcs (500g)",
        "rating": 4.8,
        "image_url": "/static/images/sweets/rasgulla.jpg",
        "fallback_url": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80",
        "in_stock": True
    },
    {
        "id": "sweet_motichoor_ladoo",
        "name": "Motichoor Ladoo",
        "price": 180.0,
        "category": "Desi Ghee Classic",
        "description": "Melt-in-mouth tiny gram flour pearls fried in pure desi ghee, infused with saffron, melon seeds, and cardamom.",
        "unit": "Box of 12 pcs (500g)",
        "rating": 4.7,
        "image_url": "/static/images/sweets/motichoor_ladoo.jpg",
        "fallback_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80",
        "in_stock": True
    },
    {
        "id": "sweet_mysore_pak",
        "name": "Mysore Pak",
        "price": 260.0,
        "category": "Desi Ghee Classic",
        "description": "Royal South Indian honeycomb delight made from roasted gram flour, generous pure ghee, and caramelized sugar.",
        "unit": "Box (500g)",
        "rating": 4.8,
        "image_url": "/static/images/sweets/mysore_pak.jpg",
        "fallback_url": "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=800&q=80",
        "in_stock": True
    },
    {
        "id": "sweet_rasmalai",
        "name": "Rasmalai",
        "price": 220.0,
        "category": "Milk & Cream",
        "description": "Velvety flattened paneer discs poached in chilled, thick saffron-pistachio rabdi cream.",
        "unit": "Bowl of 4 pcs (400g)",
        "rating": 4.9,
        "image_url": "/static/images/sweets/rasmalai.jpg",
        "fallback_url": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80",
        "in_stock": True
    },
    {
        "id": "sweet_crispy_jalebi",
        "name": "Crispy Jalebi",
        "price": 120.0,
        "category": "Syrup & Crispy",
        "description": "Crispy spiral coils made from fermented batter, fried crisp in pure ghee and dipped in hot saffron syrup.",
        "unit": "Fresh pack (400g)",
        "rating": 4.6,
        "image_url": "/static/images/sweets/crispy_jalebi.jpg",
        "fallback_url": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80",
        "in_stock": True
    },
    {
        "id": "sweet_mathura_peda",
        "name": "Mathura Peda",
        "price": 200.0,
        "category": "Khoya Specialties",
        "description": "Caramelized slow-roasted mawa infused with nutmeg, cardamom, and dusted with fragrant sugar.",
        "unit": "Box (500g)",
        "rating": 4.7,
        "image_url": "/static/images/sweets/mathura_peda.jpg",
        "fallback_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=800&q=80",
        "in_stock": True
    }
]

def seed_all():
    store = _load_local_store()
    if 'sweets' not in store:
        store['sweets'] = {}
    if 'users' not in store:
        store['users'] = {}
    if 'sales' not in store:
        store['sales'] = {}

    # Seed sweets
    for sweet in SWEETS_CATALOG:
        store['sweets'][sweet['id']] = sweet

    # Seed users
    admin_id = "user_admin_default"
    store['users'][admin_id] = {
        "id": admin_id,
        "name": "Rajesh Sharma (Store Admin)",
        "email": "admin@mithai.com",
        "password_hash": generate_password_hash("admin123"),
        "role": "admin",
        "phone": "+91 98765 43210",
        "created_at": "2026-08-15T10:00:00Z"
    }

    admin_rushikesh_id = "user_admin_rushikesh"
    store['users'][admin_rushikesh_id] = {
        "id": admin_rushikesh_id,
        "name": "Rushikesh Mathkar (Store Admin)",
        "email": "rushikeshphonea17@gmail.com",
        "password_hash": generate_password_hash("admin123"),
        "role": "admin",
        "phone": "+91 75881 13244",
        "created_at": "2026-08-15T10:00:00Z"
    }

    cust_id = "user_customer_default"
    store['users'][cust_id] = {
        "id": cust_id,
        "name": "Priya Patel",
        "email": "user@mithai.com",
        "password_hash": generate_password_hash("user123"),
        "role": "customer",
        "phone": "+91 91234 56789",
        "created_at": "2026-08-20T11:00:00Z"
    }

    # Seed sales if empty
    if not store['sales']:
        today = datetime.datetime.utcnow()
        customers = [
            ("Priya Patel", "user@mithai.com"),
            ("Amit Verma", "amit.verma@example.com"),
            ("Neha Gupta", "neha.g@example.com"),
            ("Vikram Malhotra", "vikram.m@example.com"),
            ("Ananya Sen", "ananya.sen@example.com"),
            ("Rohit Deshmukh", "rohit.d@example.com"),
            ("Sunita Reddy", "sunita.r@example.com")
        ]

        base_count = 6
        for day_offset in range(13, -1, -1):
            order_date = today - datetime.timedelta(days=day_offset)
            daily_orders = base_count + int((14 - day_offset) * 0.8) + random.randint(-1, 2)

            for i in range(max(2, daily_orders)):
                sweet = random.choice(SWEETS_CATALOG)
                qty = random.choices([1, 2, 3, 4], weights=[0.6, 0.25, 0.1, 0.05])[0]
                cust_name, cust_email = random.choice(customers)
                order_time = order_date.replace(
                    hour=random.randint(9, 21),
                    minute=random.randint(0, 59),
                    second=random.randint(0, 59)
                )

                sale_id = f"sale_seed_{day_offset}_{i}_{random.randint(100, 999)}"
                store['sales'][sale_id] = {
                    "id": sale_id,
                    "sweet_name": sweet["name"],
                    "price": float(sweet["price"]),
                    "quantity": int(qty),
                    "total_price": float(sweet["price"] * qty),
                    "customer_name": cust_name,
                    "customer_email": cust_email,
                    "timestamp": order_time.strftime("%Y-%m-%dT%H:%M:%SZ")
                }

    _save_local_store(store)
    print("✅ Seeded sweets, users, and sales data successfully in milliseconds.")

def seed_sweets():
    seed_all()

def seed_users():
    seed_all()

def seed_sales():
    seed_all()

if __name__ == '__main__':
    seed_all()
