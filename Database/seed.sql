-- RentHub Shop & Products Seed Data

-- Clear existing data
DELETE FROM rental_orders;
DELETE FROM products;
DELETE FROM shops;

-- 1. Insert Sample Shops (Store Owners)
-- Note: default demo password is 'shop123' (bcrypt hash for demo)
INSERT INTO shops (id, shop_name, owner_name, email, phone, password_hash, category, address, city, logo_url, rating, total_reviews, is_verified) VALUES
(
    1,
    'Apex Gear & Electronics Hub',
    'Rajesh Sharma',
    'shop@renthub.com',
    '9876543210',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- 'password' or 'shop123'
    'Electronics & Gadgets',
    'Shop #14, Ground Floor, Cyber Plaza, MG Road',
    'Bangalore',
    'https://images.unsplash.com/photo-1556742049-0a67e557b779?auto=format&fit=crop&w=150&q=80',
    4.9,
    48,
    1
),
(
    2,
    'Urban Living Appliances & Furniture',
    'Ananya Verma',
    'urbanliving@renthub.com',
    '9123456780',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Home Appliances & Furniture',
    'Plot 45, Sector 18, Commercial Belt',
    'Mumbai',
    'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=150&q=80',
    4.8,
    36,
    1
),
(
    3,
    'Glamour Wardrobe & Event Outfits',
    'Pooja Mehta',
    'glamour@renthub.com',
    '9811223344',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'Designer Clothes & Costumes',
    'Boutique 8, Fashion Street',
    'Delhi',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    4.95,
    52,
    1
);

-- 2. Insert Products matching items in RentHub showcase (Cameras, Laptops, Fridges, Bikes, Clothes, etc.)
INSERT INTO products (id, shop_id, name, description, category, rent_price_per_day, rent_price_per_month, deposit_amount, total_stock, available_stock, image_url, condition, is_active) VALUES
(
    1,
    1,
    'Sony Alpha 7 IV Mirrorless Camera + 24-70mm GM Lens',
    'Professional 33MP Full-frame Hybrid camera ideal for photo shoots, cinematic 4K video recording, and weddings. Includes 2 batteries, 128GB SD card, and camera bag.',
    'Electronics & Cameras',
    1200.00,
    18000.00,
    5000.00,
    3,
    2,
    'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
    'Like New',
    1
),
(
    2,
    1,
    'Apple MacBook Pro 16" M3 Pro (36GB RAM, 512GB SSD)',
    'High performance workstation for video editing, software development, and graphic rendering. Super fast and reliable.',
    'Laptops & Computers',
    950.00,
    14500.00,
    4000.00,
    4,
    3,
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
    'Like New',
    1
),
(
    3,
    1,
    'Smart Fitness GPS Smartwatch (Series 9)',
    'Advanced health sensors, heart rate tracking, always-on OLED retina display, water resistant up to 50m.',
    'Gadgets & Wearables',
    250.00,
    3200.00,
    1000.00,
    5,
    4,
    'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=800&q=80',
    'Excellent',
    1
),
(
    4,
    2,
    'Double Door Frost-Free Refrigerator (265L, 3 Star)',
    'Energy efficient smart refrigerator with inverter compressor, quick chill mode, and spacious vegetable crisper.',
    'Home Appliances',
    450.00,
    2200.00,
    2000.00,
    6,
    4,
    'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&w=800&q=80',
    'Excellent',
    1
),
(
    5,
    2,
    'Front Load Fully Automatic Washing Machine (7.5 kg)',
    'Steam wash technology, 14 wash programs, child lock, ultra quiet inverter motor.',
    'Home Appliances',
    400.00,
    1950.00,
    2000.00,
    5,
    3,
    'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=800&q=80',
    'Excellent',
    1
),
(
    6,
    2,
    'Nordic 3-Seater Fabric Sofa (Warm Beige)',
    'Ultra comfortable high-density foam cushions with stain-resistant fabric and solid oak wooden legs.',
    'Furniture',
    350.00,
    2400.00,
    1500.00,
    4,
    2,
    'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
    'Excellent',
    1
),
(
    7,
    1,
    'Urban Commuter Mountain Bicycle (21 Speed Shimano)',
    'Lightweight alloy frame, front disc brakes, suspension fork, ergonomic saddle. Perfect for fitness and weekend city rides.',
    'Vehicles & Cycles',
    200.00,
    1800.00,
    800.00,
    8,
    6,
    'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
    'Excellent',
    1
),
(
    8,
    3,
    'Designer Embroidered Silk Sherwani / Tuxedo Suit Set',
    'Premium royal silk ethnic outfit with hand embroidery, matching stole and brocade accessories for wedding & events.',
    'Fashion & Wardrobe',
    800.00,
    0,
    2500.00,
    3,
    2,
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80',
    'Like New',
    1
),
(
    9,
    1,
    'Digital Rapid Air Fryer & Oven (5.5L Capacity)',
    'Touch screen with 8 preset recipes, 360-degree rapid heat circulation, oil-free healthy cooking.',
    'Kitchen Appliances',
    150.00,
    1100.00,
    500.00,
    6,
    5,
    'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
    'Excellent',
    1
),
(
    10,
    1,
    'Hard Shell Lightweight Travel Suitcase (Large 28")',
    '360-degree silent spinner wheels, TSA approved combination lock, scratch-resistant polycarbonate shell.',
    'Travel Gear',
    180.00,
    1200.00,
    600.00,
    5,
    3,
    'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?auto=format&fit=crop&w=800&q=80',
    'Like New',
    1
);

-- 3. Insert Sample Rental Orders for Shop #1
INSERT INTO rental_orders (id, shop_id, product_id, customer_name, customer_phone, customer_email, start_date, end_date, total_days, total_amount, deposit_amount, status, payment_status, delivery_type) VALUES
(1, 1, 1, 'Karan Malhotra', '9899001122', 'karan@gmail.com', '2026-09-20', '2026-09-23', 3, 3600.00, 5000.00, 'Active', 'Paid', 'Store Pickup'),
(2, 1, 2, 'Priya Nair', '9877112233', 'priya.nair@yahoo.com', '2026-09-18', '2026-09-25', 7, 6650.00, 4000.00, 'Active', 'Paid', 'Home Delivery'),
(3, 1, 7, 'Amit Patel', '9811445566', 'amit.patel@gmail.com', '2026-09-15', '2026-09-19', 4, 800.00, 800.00, 'Returned', 'Paid', 'Store Pickup'),
(4, 1, 10, 'Sneha Joshi', '9988776655', 'sneha.j@gmail.com', '2026-09-22', '2026-09-26', 4, 720.00, 600.00, 'Pending', 'Pending', 'Store Pickup');
