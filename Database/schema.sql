-- RentHub Shop & Inventory Database Schema (SQLite)

PRAGMA foreign_keys = ON;

-- 1. Shops / Store Owners Table
CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General Rental', -- e.g. Electronics, Clothing & Costumes, Furniture, Tools & Equipment, Vehicles/Bikes
    address TEXT,
    city TEXT DEFAULT 'Local City',
    gst_number TEXT,
    logo_url TEXT,
    rating REAL DEFAULT 4.9,
    total_reviews INTEGER DEFAULT 24,
    is_verified BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Rental Products / Inventory Table (Owned by Shops)
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    rent_price_per_day REAL NOT NULL,
    rent_price_per_month REAL,
    deposit_amount REAL DEFAULT 0,
    total_stock INTEGER NOT NULL DEFAULT 1,
    available_stock INTEGER NOT NULL DEFAULT 1,
    image_url TEXT NOT NULL,
    condition TEXT DEFAULT 'Excellent', -- 'Like New', 'Excellent', 'Good'
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE
);

-- 3. Rental Orders / Bookings received by the Shop
CREATE TABLE IF NOT EXISTS rental_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER NOT NULL DEFAULT 1,
    total_amount REAL NOT NULL,
    deposit_amount REAL DEFAULT 0,
    status TEXT CHECK(status IN ('Active', 'Pending', 'Returned', 'Overdue', 'Cancelled')) DEFAULT 'Active',
    payment_status TEXT CHECK(payment_status IN ('Paid', 'Pending', 'Refunded')) DEFAULT 'Paid',
    delivery_type TEXT CHECK(delivery_type IN ('Store Pickup', 'Home Delivery')) DEFAULT 'Store Pickup',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 4. Shop Revenue & Analytics Summary View
CREATE INDEX IF NOT EXISTS idx_shops_email ON shops(email);
CREATE INDEX IF NOT EXISTS idx_shops_phone ON shops(phone);
CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON rental_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON rental_orders(status);
