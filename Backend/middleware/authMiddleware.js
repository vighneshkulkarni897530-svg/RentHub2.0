/**
 * Authentication Middleware for Shop Verification
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'renthub_super_secret_jwt_key_2026_shop_portal';

function verifyShopToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No shop authorization token provided.'
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.shop = decoded; // { id, email, shop_name }
        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired shop session. Please login again.'
        });
    }
}

module.exports = { verifyShopToken, JWT_SECRET };
