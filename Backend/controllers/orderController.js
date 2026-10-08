/**
 * Rental Orders Controller for Shop Owners
 */

const db = require('../../Database/db');

// Get all rental bookings for this shop
exports.getShopOrders = async (req, res) => {
    try {
        const shopId = req.shop.id;
        const { status } = req.query;

        let query = `
            SELECT 
                ro.id,
                ro.customer_name,
                ro.customer_phone,
                ro.customer_email,
                ro.start_date,
                ro.end_date,
                ro.total_days,
                ro.total_amount,
                ro.deposit_amount,
                ro.status,
                ro.payment_status,
                ro.delivery_type,
                ro.variant_id,
                ro.variant_color,
                ro.variant_color_code,
                ro.created_at,
                p.name as product_name,
                p.image_url as product_image,
                p.category as product_category
            FROM rental_orders ro
            JOIN products p ON ro.product_id = p.id
            WHERE ro.shop_id = ?
        `;
        const params = [shopId];

        if (status && status !== 'All') {
            query += ` AND ro.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY ro.created_at DESC`;

        const orders = await db.all(query, params);

        return res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (error) {
        console.error('getShopOrders error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Update order status (e.g. Approve, Mark Returned, Cancel)
exports.updateOrderStatus = async (req, res) => {
    try {
        const shopId = req.shop.id;
        const orderId = req.params.id;
        const { status, payment_status } = req.body;

        const existing = await db.get(`SELECT * FROM rental_orders WHERE id = ? AND shop_id = ?`, [orderId, shopId]);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Rental order not found' });
        }

        await db.run(
            `UPDATE rental_orders SET 
                status = COALESCE(?, status),
                payment_status = COALESCE(?, payment_status)
             WHERE id = ? AND shop_id = ?`,
            [status, payment_status, orderId, shopId]
        );

        // If returned, increment available stock on variant & product
        if (status === 'Returned' && existing.status !== 'Returned') {
            const prod = await db.get(`SELECT * FROM products WHERE id = ?`, [existing.product_id]);
            if (prod) {
                let updatedAvail = Math.min(prod.total_stock || 1, (prod.available_stock || 0) + 1);
                let updatedVariants = Array.isArray(prod.variants) ? [...prod.variants] : [];
                if (updatedVariants.length > 0 && (existing.variant_id || existing.variant_color)) {
                    updatedVariants = updatedVariants.map(v => {
                        if ((existing.variant_id && v.id === existing.variant_id) || (existing.variant_color && v.color_name === existing.variant_color)) {
                            const vTotal = parseInt(v.total_stock || 1);
                            const vCur = parseInt(v.available_stock !== undefined ? v.available_stock : vTotal);
                            return { ...v, available_stock: Math.min(vTotal, vCur + 1) };
                        }
                        return v;
                    });
                }
                await db.run(
                    `UPDATE products SET available_stock = ?, variants = ? WHERE id = ? AND shop_id = ?`,
                    [updatedAvail, updatedVariants, prod.id, prod.shop_id]
                );
            }
        }

        const updated = await db.get(`SELECT * FROM rental_orders WHERE id = ?`, [orderId]);

        return res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            order: updated
        });
    } catch (error) {
        console.error('updateOrderStatus error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
