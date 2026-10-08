/**
 * Public Customer Storefront & Booking Controller
 * Allows customers/users to browse shop products and submit rental bookings without logging into shop portal
 */

const db = require('../../Database/db');

// 1. Get Public Storefront Info & Active Products by Shop ID
exports.getPublicStore = async (req, res) => {
    try {
        const shopId = parseInt(req.params.shopId) || 1;
        const { category, search } = req.query;

        // Fetch shop profile info
        const shop = await db.get(
            `SELECT id, shop_name, owner_name, email, phone, category, address, city, logo_url, rating, total_reviews, is_verified 
             FROM shops WHERE id = ?`,
            [shopId]
        );

        if (!shop) {
            return res.status(404).json({
                success: false,
                message: 'Shop not found.'
            });
        }

        // Fetch active products for this shop
        let query = `SELECT * FROM products WHERE shop_id = ? AND is_active = 1`;
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
            shop,
            products,
            count: products.length
        });
    } catch (error) {
        console.error('getPublicStore error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get Single Product Details (for direct customer product links)
exports.getPublicProduct = async (req, res) => {
    try {
        const productId = parseInt(req.params.productId);

        const product = await db.get(`SELECT * FROM products WHERE id = ? AND is_active = 1`, [productId]);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found or currently unavailable.'
            });
        }

        const shop = await db.get(
            `SELECT id, shop_name, owner_name, phone, address, city, is_verified FROM shops WHERE id = ?`,
            [product.shop_id]
        );

        return res.status(200).json({
            success: true,
            product,
            shop
        });
    } catch (error) {
        console.error('getPublicProduct error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Customer Creates Rental Booking / Order
exports.createCustomerBooking = async (req, res) => {
    try {
        const {
            product_id,
            variant_id,
            variant_color,
            variant_color_code,
            customer_name,
            customer_phone,
            customer_email,
            customer_address,
            start_date,
            end_date,
            delivery_type,
            special_instructions
        } = req.body;

        if (!product_id || !customer_name || !customer_phone || !start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Please provide Customer Name, Phone, and Rental Start & End Dates.'
            });
        }

        // Verify product existence and stock
        const product = await db.get(`SELECT * FROM products WHERE id = ? AND is_active = 1`, [product_id]);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Selected product is not available for rent.'
            });
        }

        // Find specific variant if product has variants
        let selectedVariant = null;
        const variantsList = Array.isArray(product.variants) ? product.variants : [];
        if (variantsList.length > 0) {
            if (variant_id) {
                selectedVariant = variantsList.find(v => v.id === variant_id);
            }
            if (!selectedVariant && variant_color) {
                selectedVariant = variantsList.find(v => v.color_name && v.color_name.toLowerCase() === variant_color.toLowerCase());
            }
            if (!selectedVariant) {
                selectedVariant = variantsList[0];
            }
        }

        const variantStock = selectedVariant ? parseInt(selectedVariant.available_stock !== undefined ? selectedVariant.available_stock : selectedVariant.total_stock) : (product.available_stock !== undefined ? product.available_stock : product.total_stock);

        if (variantStock <= 0) {
            return res.status(400).json({
                success: false,
                message: selectedVariant && selectedVariant.color_name !== 'Standard'
                    ? `Sorry, colour variant [${selectedVariant.color_name}] is currently out of stock.`
                    : 'Sorry, this item is currently out of stock.'
            });
        }

        // Calculate rental days
        const start = new Date(start_date);
        const end = new Date(end_date);
        const diffTime = Math.abs(end - start);
        let total_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (total_days <= 0) total_days = 1;

        const effectiveDailyRent = selectedVariant ? parseFloat(selectedVariant.rent_price_per_day) : parseFloat(product.rent_price_per_day);
        const effectiveDeposit = selectedVariant && selectedVariant.deposit_amount !== undefined ? parseFloat(selectedVariant.deposit_amount) : (parseFloat(product.deposit_amount) || 0);

        const total_amount = total_days * effectiveDailyRent;
        const deposit_amount = effectiveDeposit;

        const finalVariantId = selectedVariant ? selectedVariant.id : (variant_id || null);
        const finalVariantColor = selectedVariant ? selectedVariant.color_name : (variant_color || null);
        const finalVariantColorCode = selectedVariant ? selectedVariant.color_code : (variant_color_code || null);

        let variantMedia = (selectedVariant && Array.isArray(selectedVariant.media) && selectedVariant.media.length > 0) ? selectedVariant.media : (Array.isArray(product.media) ? product.media : []);
        let variantImg = product.image_url;
        if (variantMedia.length > 0) {
            const prim = variantMedia.find(m => m.is_primary) || variantMedia[0];
            if (prim && prim.url) variantImg = prim.url;
        }

        // Insert new order into rental_orders table
        const newOrder = await db.run(
            `INSERT INTO rental_orders (
                shop_id, product_id, customer_name, customer_phone,
                customer_address, start_date, end_date, total_days,
                total_amount, deposit_amount, delivery_type,
                variant_id, variant_color, variant_color_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                product.shop_id,
                product.id,
                customer_name.trim(),
                customer_phone.trim(),
                customer_address ? customer_address.trim() : '',
                start_date,
                end_date,
                total_days,
                total_amount,
                deposit_amount,
                delivery_type || 'Store Pickup',
                finalVariantId,
                finalVariantColor,
                finalVariantColorCode
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Rental booking submitted successfully! The shop owner will review your order.',
            order: {
                id: newOrder.lastID,
                product_name: product.name,
                product_image: variantImg,
                variant_id: finalVariantId,
                variant_color: finalVariantColor,
                variant_color_code: finalVariantColorCode,
                customer_name,
                customer_phone,
                total_days,
                total_amount,
                deposit_amount,
                start_date,
                end_date,
                status: 'Pending',
                delivery_type: delivery_type || 'Store Pickup'
            }
        });
    } catch (error) {
        console.error('createCustomerBooking error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
