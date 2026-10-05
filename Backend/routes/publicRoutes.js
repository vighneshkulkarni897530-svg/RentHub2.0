const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Public customer routes (No shop JWT required)
router.get('/store/:shopId', publicController.getPublicStore);
router.get('/product/:productId', publicController.getPublicProduct);
router.post('/book', publicController.createCustomerBooking);

module.exports = router;
