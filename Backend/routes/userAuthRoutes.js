const express = require('express');
const router = express.Router();
const userAuthController = require('../controllers/userAuthController');

// Customer / User Authentication Routes
router.post('/login', userAuthController.userLogin);
router.post('/register', userAuthController.userRegister);
router.get('/orders', userAuthController.getUserOrders);

module.exports = router;
