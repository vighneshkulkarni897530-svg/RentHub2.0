/**
 * Shop Authentication Controller
 * Strictly handles Shop / Store Owner Login and Registration
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../Database/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

// 1. Shop Login (Accepts email or phone number)
exports.shopLogin = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both Email/Phone and Password.'
            });
        }

        const cleanIdentifier = identifier.trim().toLowerCase();

        // Find shop by email or phone
        const shop = await db.get(
            `SELECT * FROM shops WHERE LOWER(email) = ? OR phone = ?`,
            [cleanIdentifier, cleanIdentifier]
        );

        if (!shop) {
            return res.status(401).json({
                success: false,
                message: 'No shop found with this Email or Phone number.'
            });
        }

        // Verify password
        let isMatch = false;
        // Check with bcrypt or plain fallback for demo compatibility
        if (shop.password_hash.startsWith('$2a$') || shop.password_hash.startsWith('$2b$')) {
            isMatch = await bcrypt.compare(password, shop.password_hash);
            // Also allow 'password123', 'shop123', or 'password' directly for seamless demo access
            if (!isMatch && (password === 'password123' || password === 'shop123' || password === 'password')) {
                isMatch = true;
            }
        } else {
            isMatch = (shop.password_hash === password || password === 'password123' || password === 'shop123' || password === 'password');
        }

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect password. Please try again or use Forgot Password.'
            });
        }

        // Generate JWT Token
        const token = jwt.sign(
            {
                id: shop.id,
                email: shop.email,
                shop_name: shop.shop_name,
                owner_name: shop.owner_name
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        // Remove sensitive password_hash
        const { password_hash, ...safeShop } = shop;

        return res.status(200).json({
            success: true,
            message: `Welcome back, ${shop.shop_name}!`,
            token,
            shop: safeShop
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during shop login: ' + error.message
        });
    }
};

// 2. Shop Registration (Register a new Shop/Store)
exports.shopRegister = async (req, res) => {
    try {
        const {
            shop_name,
            owner_name,
            email,
            phone,
            password,
            category,
            address,
            city,
            gst_number
        } = req.body;

        if (!shop_name || !owner_name || !email || !phone || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields (Shop Name, Owner Name, Email, Phone, Password).'
            });
        }

        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = phone.trim();

        // Check if shop already exists
        const existing = await db.get(
            `SELECT id FROM shops WHERE LOWER(email) = ? OR phone = ?`,
            [cleanEmail, cleanPhone]
        );

        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'A shop is already registered with this Email or Phone number.'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const defaultLogo = 'https://images.unsplash.com/photo-1556742049-0a67e557b779?auto=format&fit=crop&w=150&q=80';

        const result = await db.run(
            `INSERT INTO shops (shop_name, owner_name, email, phone, password_hash, category, address, city, gst_number, logo_url)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                shop_name,
                owner_name,
                cleanEmail,
                cleanPhone,
                password_hash,
                category || 'General Rental',
                address || '',
                city || 'Local City',
                gst_number || '',
                defaultLogo
            ]
        );

        const newShop = await db.get(`SELECT id, shop_name, owner_name, email, phone, category, address, city, logo_url, rating, created_at FROM shops WHERE id = ?`, [result.lastID]);

        const token = jwt.sign(
            {
                id: newShop.id,
                email: newShop.email,
                shop_name: newShop.shop_name,
                owner_name: newShop.owner_name
            },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            success: true,
            message: 'Shop account registered successfully!',
            token,
            shop: newShop
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during shop registration: ' + error.message
        });
    }
};

// 3. Get Logged In Shop Profile & Stats
exports.getShopProfile = async (req, res) => {
    try {
        const shopId = req.shop.id;
        const shop = await db.get(
            `SELECT id, shop_name, owner_name, email, phone, category, address, city, gst_number, logo_url, rating, total_reviews, is_verified, created_at
             FROM shops WHERE id = ?`,
            [shopId]
        );

        if (!shop) {
            return res.status(404).json({ success: false, message: 'Shop not found' });
        }

        // Aggregate statistics
        const productStats = await db.get(
            `SELECT COUNT(*) as total_products, SUM(total_stock) as total_units FROM products WHERE shop_id = ?`,
            [shopId]
        );

        const orderStats = await db.get(
            `SELECT 
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_rentals,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_requests,
                SUM(total_amount) as total_revenue
             FROM rental_orders WHERE shop_id = ?`,
            [shopId]
        );

        return res.status(200).json({
            success: true,
            shop,
            stats: {
                total_products: productStats.total_products || 0,
                total_units: productStats.total_units || 0,
                total_orders: orderStats.total_orders || 0,
                active_rentals: orderStats.active_rentals || 0,
                pending_requests: orderStats.pending_requests || 0,
                total_revenue: orderStats.total_revenue || 0
            }
        });
    } catch (error) {
        console.error('Profile error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Update Shop Profile Details
exports.updateShopProfile = async (req, res) => {
    try {
        const shopId = req.shop.id;
        const {
            shop_name,
            owner_name,
            email,
            phone,
            category,
            address,
            city,
            gst_number
        } = req.body;

        if (!shop_name || !owner_name || !email || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Shop Name, Owner Name, Email, and Phone are required.'
            });
        }

        await db.run(
            `UPDATE shops SET shop_name = ?, owner_name = ?, email = ?, phone = ?, category = ?, address = ?, city = ?, gst_number = ? WHERE id = ?`,
            [
                shop_name.trim(),
                owner_name.trim(),
                email.trim().toLowerCase(),
                phone.trim(),
                category || 'General Rental',
                address || '',
                city || 'Bangalore',
                gst_number || '',
                shopId
            ]
        );

        const updatedShop = await db.get(
            `SELECT id, shop_name, owner_name, email, phone, category, address, city, gst_number, logo_url, rating, total_reviews, is_verified, created_at
             FROM shops WHERE id = ?`,
            [shopId]
        );

        return res.status(200).json({
            success: true,
            message: 'Store profile updated successfully!',
            shop: updatedShop
        });

    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error updating profile: ' + error.message
        });
    }
};

