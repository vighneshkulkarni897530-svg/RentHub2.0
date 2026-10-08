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
            condition,
            variants
        } = req.body;

        const prodCategory = (category && category.trim()) ? category.trim() : 'General';

        if (!name) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a Product Name.'
            });
        }

        // Process variants if provided
        let variantsList = Array.isArray(variants) ? variants : [];
        if (variantsList.length > 0) {
            // Validate variants
            for (const v of variantsList) {
                if (!v.color_name || !v.color_name.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each variant must have a valid colour name.'
                    });
                }
                const vPrice = parseFloat(v.rent_price_per_day);
                if (isNaN(vPrice) || vPrice <= 0) {
                    return res.status(400).json({
                        success: false,
                        message: `Daily rent for colour [${v.color_name}] must be greater than 0.`
                    });
                }
                const vStock = parseInt(v.total_stock);
                if (isNaN(vStock) || vStock < 1) {
                    return res.status(400).json({
                        success: false,
                        message: `Stock for colour [${v.color_name}] must be at least 1 unit.`
                    });
                }
            }
        } else {
            // Backward compatibility: create default variant if none provided
            const singlePrice = parseFloat(rent_price_per_day);
            if (isNaN(singlePrice) || singlePrice <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Please provide a valid Daily Rental Price (₹).'
                });
            }
            const singleStock = parseInt(total_stock) || 1;
            variantsList = [{
                id: 'var_' + Date.now() + '_1',
                color_name: 'Standard',
                color_code: '#111827',
                rent_price_per_day: singlePrice,
                deposit_amount: parseFloat(deposit_amount) || 0,
                total_stock: singleStock,
                available_stock: singleStock,
                media: Array.isArray(media) ? media : (image_url ? [{ type: 'image', url: image_url, is_primary: true }] : []),
                specifications: description || ''
            }];
        }

        const primaryVariant = variantsList[0];
        const computedTotalStock = variantsList.reduce((sum, v) => sum + parseInt(v.total_stock || 1), 0);
        const computedAvailStock = variantsList.reduce((sum, v) => sum + parseInt(v.available_stock !== undefined ? v.available_stock : (v.total_stock || 1)), 0);
        const computedRentPrice = parseFloat(primaryVariant.rent_price_per_day) || parseFloat(rent_price_per_day) || 500;
        const computedDeposit = parseFloat(primaryVariant.deposit_amount) !== undefined ? parseFloat(primaryVariant.deposit_amount) : (parseFloat(deposit_amount) || 0);

        let mediaArray = (primaryVariant.media && primaryVariant.media.length > 0) ? primaryVariant.media : (Array.isArray(media) ? media : []);
        let defaultImg = image_url;
        if (!defaultImg && mediaArray.length > 0) {
            const primary = mediaArray.find(m => m.is_primary) || mediaArray[0];
            defaultImg = primary.url;
        }
        if (!defaultImg) {
            defaultImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
        }

        const result = await db.run(
            `INSERT INTO products (shop_id, name, description, category, rent_price_per_day, rent_price_per_month, deposit_amount, total_stock, available_stock, image_url, condition, media, variants)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                shopId,
                name,
                primaryVariant.specifications || description || '',
                prodCategory,
                computedRentPrice,
                rent_price_per_month ? parseFloat(rent_price_per_month) : null,
                computedDeposit,
                computedTotalStock,
                computedAvailStock,
                defaultImg,
                condition || 'Excellent',
                mediaArray,
                variantsList
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
            is_active,
            variants
        } = req.body;

        // Verify product belongs to shop
        const existing = await db.get(`SELECT * FROM products WHERE id = ? AND shop_id = ?`, [productId, shopId]);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Product not found or unauthorized' });
        }

        let variantsList = Array.isArray(variants) ? variants : null;
        let computedTotalStock = total_stock !== undefined ? parseInt(total_stock) : null;
        let computedAvailStock = available_stock !== undefined ? parseInt(available_stock) : null;
        let computedPrice = rent_price_per_day !== undefined ? parseFloat(rent_price_per_day) : null;
        let computedDeposit = deposit_amount !== undefined ? parseFloat(deposit_amount) : null;

        if (variantsList && variantsList.length > 0) {
            computedTotalStock = variantsList.reduce((sum, v) => sum + parseInt(v.total_stock || 1), 0);
            computedAvailStock = variantsList.reduce((sum, v) => sum + parseInt(v.available_stock !== undefined ? v.available_stock : (v.total_stock || 1)), 0);
            computedPrice = parseFloat(variantsList[0].rent_price_per_day) || computedPrice;
            computedDeposit = parseFloat(variantsList[0].deposit_amount) !== undefined ? parseFloat(variantsList[0].deposit_amount) : computedDeposit;
        }

        let mediaArray = Array.isArray(media) ? media : (variantsList && variantsList[0] ? variantsList[0].media : null);
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
                media = COALESCE(?, media),
                variants = COALESCE(?, variants)
             WHERE id = ? AND shop_id = ?`,
            [
                name,
                description,
                category,
                computedPrice,
                rent_price_per_month !== undefined ? parseFloat(rent_price_per_month) : null,
                computedDeposit,
                computedTotalStock,
                computedAvailStock,
                primaryImg,
                condition,
                is_active,
                mediaArray,
                variantsList,
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
