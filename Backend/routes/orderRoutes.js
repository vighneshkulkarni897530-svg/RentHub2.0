const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyShopToken } = require('../middleware/authMiddleware');

// All order routes require Shop authentication
router.use(verifyShopToken);

router.get('/', orderController.getShopOrders);
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;
