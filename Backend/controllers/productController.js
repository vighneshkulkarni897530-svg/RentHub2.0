/**
 * Product & Inventory Controller for Shop Owners
 */

const db = require('../../Database/db');

// Get all products owned by the shop
exports.getShopProducts = async (req, res) => {
    try {
        const shopId = req.shop.id;
        const { category, search } = req.query;

        let query = `SELECT * FROM products WHERE shop_id = ?`;
        const params = [shopId];

        if (category && category !== 'All') {
            query += ` AND category = ?`;
            params.push(category);
        }

        if (search) {
            query += ` AND (name LIKE ? OR description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY created_at DESC`;

        const products = await db.all(query, params);

        return res.status(200).json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        console.error('getShopProducts error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Add new rental product to shop
exports.addProduct = async (req, res) => {
    try {
        const shopId = req.shop.id;
        const {
            name,
            description,
            category,
            rent_price_per_day,
            rent_price_per_month,
            deposit_amount,
            total_stock,
            image_url,
            media,
            condition
        } = req.body;

        const prodCategory = (category && category.trim()) ? category.trim() : 'General';

        if (!name || !rent_price_per_day) {
            return res.status(400).json({
                success: false,
                message: 'Please provide Product Name and Daily Rental Price.'
            });
        }

        const stock = parseInt(total_stock) || 1;
        let mediaArray = Array.isArray(media) ? media : [];
        let defaultImg = image_url;
        if (!defaultImg && mediaArray.length > 0) {
            const primary = mediaArray.find(m => m.is_primary) || mediaArray[0];
            defaultImg = primary.url;
        }
        if (!defaultImg) {
            defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
        }

        const result = await db.run(
            `INSERT INTO products (shop_id, name, description, category, rent_price_per_day, rent_price_per_month, deposit_amount, total_stock, available_stock, image_url, condition, media)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                shopId,
                name,
                description || '',
                prodCategory,
                parseFloat(rent_price_per_day),
                rent_price_per_month ? parseFloat(rent_price_per_month) : null,
                deposit_amount ? parseFloat(deposit_amount) : 0,
                stock,
                stock,
                defaultImg,
                condition || 'Excellent',
                mediaArray
            ]
        );

        const newProduct = await db.get(`SELECT * FROM products WHERE id = ?`, [result.lastID]);

        return res.status(201).json({
            success: true,
            message: 'Rental item added to inventory!',
            product: newProduct
        });
    } catch (error) {
        console.error('addProduct error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        const shopId = req.shop.id;
        const productId = req.params.id;
        const {
            name,
            description,
            category,
            rent_price_per_day,
            rent_price_per_month,
            deposit_amount,
            total_stock,
            available_stock,
            image_url,
            media,
            condition,
            is_active
        } = req.body;

        // Verify product belongs to shop
        const existing = await db.get(`SELECT * FROM products WHERE id = ? AND shop_id = ?`, [productId, shopId]);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Product not found or unauthorized' });
        }

        let mediaArray = Array.isArray(media) ? media : null;
        let primaryImg = image_url;
        if (!primaryImg && mediaArray && mediaArray.length > 0) {
            const primary = mediaArray.find(m => m.is_primary) || mediaArray[0];
            primaryImg = primary.url;
        }

        await db.run(
            `UPDATE products SET
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                category = COALESCE(?, category),
                rent_price_per_day = COALESCE(?, rent_price_per_day),
                rent_price_per_month = COALESCE(?, rent_price_per_month),
                deposit_amount = COALESCE(?, deposit_amount),
                total_stock = COALESCE(?, total_stock),
                available_stock = COALESCE(?, available_stock),
                image_url = COALESCE(?, image_url),
                condition = COALESCE(?, condition),
                is_active = COALESCE(?, is_active),
                media = COALESCE(?, media)
             WHERE id = ? AND shop_id = ?`,
            [
                name,
                description,
                category,
                rent_price_per_day !== undefined ? parseFloat(rent_price_per_day) : null,
                rent_price_per_month !== undefined ? parseFloat(rent_price_per_month) : null,
                deposit_amount !== undefined ? parseFloat(deposit_amount) : null,
                total_stock !== undefined ? parseInt(total_stock) : null,
                available_stock !== undefined ? parseInt(available_stock) : null,
                primaryImg,
                condition,
                is_active,
                mediaArray,
                productId,
                shopId
            ]
        );

        const updated = await db.get(`SELECT * FROM products WHERE id = ?`, [productId]);

        return res.status(200).json({
            success: true,
            message: 'Product updated successfully',
            product: updated
        });
    } catch (error) {
        console.error('updateProduct error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        const shopId = req.shop.id;
        const productId = req.params.id;

        const result = await db.run(`DELETE FROM products WHERE id = ? AND shop_id = ?`, [productId, shopId]);

        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Product not found or already deleted' });
        }

        return res.status(200).json({
            success: true,
            message: 'Product removed from shop inventory'
        });
    } catch (error) {
        console.error('deleteProduct error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
