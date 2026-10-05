const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyShopToken } = require('../middleware/authMiddleware');

// All product routes require Shop authentication
router.use(verifyShopToken);

router.get('/', productController.getShopProducts);
router.post('/', productController.addProduct);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

module.exports = router;
