const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyShopToken } = require('../middleware/authMiddleware');

// Shop Auth Routes (Shop / Store Owner Only)
router.post('/login', authController.shopLogin);
router.post('/register', authController.shopRegister);
router.get('/profile', verifyShopToken, authController.getShopProfile);
router.put('/profile', verifyShopToken, authController.updateShopProfile);

module.exports = router;

