/**
 * RentHub Firestore Adapter
 * Executes CRUD operations against Cloud Firestore collections:
 *   - 'shops'
 *   - 'products'
 *   - 'rental_orders'
 */

const { db, isFirebaseEnabled } = require('../Backend/services/firebase');

const firestoreAdapter = {
    // Check if Firestore is active and ready
    isReady: () => isFirebaseEnabled() && db !== null,

    // ----------------------------------------------------
    // SHOPS COLLECTION
    // ----------------------------------------------------
    getShopByEmailOrPhone: async (identifier) => {
        if (!firestoreAdapter.isReady()) return null;
        const clean = identifier.toLowerCase().trim();

        // Check email
        const emailSnap = await db.collection('shops')
            .where('email', '==', clean)
            .limit(1)
            .get();

        if (!emailSnap.empty) {
            const doc = emailSnap.docs[0];
            return { id: doc.data().id || doc.id, _docId: doc.id, ...doc.data() };
        }

        // Check phone
        const phoneSnap = await db.collection('shops')
            .where('phone', '==', clean)
            .limit(1)
            .get();

        if (!phoneSnap.empty) {
            const doc = phoneSnap.docs[0];
            return { id: doc.data().id || doc.id, _docId: doc.id, ...doc.data() };
        }

        return null;
    },

    getShopById: async (shopId) => {
        if (!firestoreAdapter.isReady()) return null;
        const targetId = parseInt(shopId);

        const snap = await db.collection('shops')
            .where('id', '==', targetId)
            .limit(1)
            .get();

        if (!snap.empty) {
            const doc = snap.docs[0];
            return { id: doc.data().id || doc.id, _docId: doc.id, ...doc.data() };
        }

        // Fallback check by doc ID
        const directDoc = await db.collection('shops').doc(String(shopId)).get();
        if (directDoc.exists) {
            return { id: directDoc.data().id || directDoc.id, _docId: directDoc.id, ...directDoc.data() };
        }

        return null;
    },

    createShop: async (shopData) => {
        if (!firestoreAdapter.isReady()) return null;
        // Determine next integer ID
        const allShopsSnap = await db.collection('shops').get();
        let maxId = 0;
        allShopsSnap.forEach(d => {
            const val = d.data().id;
            if (val && typeof val === 'number' && val > maxId) maxId = val;
        });
        const newId = maxId + 1;

        const newShopDoc = {
            id: newId,
            shop_name: shopData.shop_name,
            owner_name: shopData.owner_name,
            email: shopData.email.toLowerCase().trim(),
            phone: shopData.phone.trim(),
            password_hash: shopData.password_hash,
            category: shopData.category || 'General Rental',
            address: shopData.address || '',
            city: shopData.city || 'Bangalore',
            gst_number: shopData.gst_number || '',
            logo_url: shopData.logo_url || '',
            rating: 5.0,
            total_reviews: 1,
            is_verified: 1,
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('shops').add(newShopDoc);
        return { lastID: newId, docId: docRef.id };
    },

    updateShop: async (shopId, updateData) => {
        if (!firestoreAdapter.isReady()) return false;
        const targetId = parseInt(shopId);

        const snap = await db.collection('shops')
            .where('id', '==', targetId)
            .limit(1)
            .get();

        if (!snap.empty) {
            const doc = snap.docs[0];
            await doc.ref.update(updateData);
            return true;
        }
        return false;
    },

    // ----------------------------------------------------
    // PRODUCTS COLLECTION
    // ----------------------------------------------------
    getProducts: async (shopId, category = '', search = '') => {
        if (!firestoreAdapter.isReady()) return [];
        const targetShopId = parseInt(shopId);

        let query = db.collection('products').where('shop_id', '==', targetShopId);
        if (category && category !== 'All') {
            query = query.where('category', '==', category);
        }

        const snap = await query.get();
        let products = [];
        snap.forEach(doc => {
            products.push({ id: doc.data().id || doc.id, _docId: doc.id, ...doc.data() });
        });

        // Search filter in-memory for flexible substring matching
        if (search) {
            const cleanSearch = search.toLowerCase();
            products = products.filter(p => 
                (p.name && p.name.toLowerCase().includes(cleanSearch)) || 
                (p.description && p.description.toLowerCase().includes(cleanSearch))
            );
        }

        return products;
    },

    getProductById: async (productId) => {
        if (!firestoreAdapter.isReady()) return null;
        const targetId = parseInt(productId);

        const snap = await db.collection('products')
            .where('id', '==', targetId)
            .limit(1)
            .get();

        if (!snap.empty) {
            const doc = snap.docs[0];
            return { id: doc.data().id || doc.id, _docId: doc.id, ...doc.data() };
        }
        return null;
    },

    createProduct: async (productData) => {
        if (!firestoreAdapter.isReady()) return null;
        const allProdsSnap = await db.collection('products').get();
        let maxId = 0;
        allProdsSnap.forEach(d => {
            const val = d.data().id;
            if (val && typeof val === 'number' && val > maxId) maxId = val;
        });
        const newId = maxId + 1;

        // Determine primary image or first media item
        let mediaArray = Array.isArray(productData.media) ? productData.media : [];
        if (mediaArray.length === 0 && productData.image_url) {
            mediaArray = [{ type: 'image', url: productData.image_url, is_primary: true }];
        }

        const primaryItem = mediaArray.find(m => m.is_primary) || mediaArray[0] || {};
        const primaryImg = primaryItem.url || productData.image_url || '';

        const newProd = {
            id: newId,
            shop_id: parseInt(productData.shop_id),
            name: productData.name,
            description: productData.description || '',
            category: productData.category || 'General',
            rent_price_per_day: parseFloat(productData.rent_price_per_day) || 0,
            rent_price_per_month: parseFloat(productData.rent_price_per_month) || 0,
            deposit_amount: parseFloat(productData.deposit_amount) || 0,
            total_stock: parseInt(productData.total_stock) || 1,
            available_stock: parseInt(productData.available_stock !== undefined ? productData.available_stock : productData.total_stock) || 1,
            image_url: primaryImg,
            media: mediaArray,
            condition: productData.condition || 'Excellent',
            is_active: 1,
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('products').add(newProd);
        return { lastID: newId, docId: docRef.id };
    },

    updateProduct: async (productId, shopId, updateData) => {
        if (!firestoreAdapter.isReady()) return false;
        const targetId = parseInt(productId);
        const targetShopId = parseInt(shopId);

        const snap = await db.collection('products')
            .where('id', '==', targetId)
            .where('shop_id', '==', targetShopId)
            .limit(1)
            .get();

        if (!snap.empty) {
            const doc = snap.docs[0];
            await doc.ref.update(updateData);
            return true;
        }
        return false;
    },

    deleteProduct: async (productId, shopId) => {
        if (!firestoreAdapter.isReady()) return 0;
        const targetId = parseInt(productId);
        const targetShopId = parseInt(shopId);

        const snap = await db.collection('products')
            .where('id', '==', targetId)
            .where('shop_id', '==', targetShopId)
            .limit(1)
            .get();

        if (!snap.empty) {
            await snap.docs[0].ref.delete();
            return 1;
        }
        return 0;
    },

    // ----------------------------------------------------
    // RENTAL ORDERS COLLECTION
    // ----------------------------------------------------
    getOrders: async (shopId, status = '') => {
        if (!firestoreAdapter.isReady()) return [];
        const targetShopId = parseInt(shopId);

        let query = db.collection('rental_orders').where('shop_id', '==', targetShopId);
        if (status && status !== 'All') {
            query = query.where('status', '==', status);
        }

        const snap = await query.get();
        const orders = [];
        snap.forEach(doc => {
            orders.push({ id: doc.data().id || doc.id, _docId: doc.id, ...doc.data() });
        });

        // Join product details
        const productsSnap = await db.collection('products').where('shop_id', '==', targetShopId).get();
        const productMap = {};
        productsSnap.forEach(d => {
            productMap[d.data().id] = d.data();
        });

        return orders.map(o => {
            const prod = productMap[o.product_id] || {};
            return {
                ...o,
                product_name: o.product_name || prod.name || 'Sony FX3 Cinema Camera Kit',
                product_image: o.product_image || prod.image_url || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
                product_category: o.product_category || prod.category || 'Electronics & Camera Rentals',
                product_description: prod.description || o.product_description || 'Professional cinema camera with 4K 120fps recording, XLR audio handle, 2x 160GB CFexpress cards, 3x batteries, and full cage rig.',
                rent_price_per_day: prod.rent_price_per_day || (o.total_amount && o.total_days ? Math.round(o.total_amount / o.total_days) : 1500),
                deposit_amount: o.deposit_amount || prod.deposit_amount || 8000
            };
        });
    },

    createOrder: async (orderData) => {
        if (!firestoreAdapter.isReady()) return null;
        const allOrdersSnap = await db.collection('rental_orders').get();
        let maxId = 100;
        allOrdersSnap.forEach(d => {
            const val = d.data().id;
            if (val && typeof val === 'number' && val > maxId) maxId = val;
        });
        const newId = maxId + 1;

        const newOrder = {
            id: newId,
            shop_id: parseInt(orderData.shop_id),
            product_id: parseInt(orderData.product_id),
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone,
            customer_address: orderData.customer_address || '',
            start_date: orderData.start_date,
            end_date: orderData.end_date,
            total_days: parseInt(orderData.total_days) || 1,
            total_amount: parseFloat(orderData.total_amount) || 0,
            deposit_amount: parseFloat(orderData.deposit_amount) || 0,
            status: orderData.status || 'Pending',
            delivery_type: orderData.delivery_type || 'Store Pickup',
            payment_status: orderData.payment_status || 'Pending',
            created_at: new Date().toISOString()
        };

        const docRef = await db.collection('rental_orders').add(newOrder);
        return { lastID: newId, docId: docRef.id };
    },

    updateOrderStatus: async (orderId, shopId, newStatus, paymentStatus) => {
        if (!firestoreAdapter.isReady()) return false;
        const targetId = parseInt(orderId);
        const targetShopId = parseInt(shopId);

        const snap = await db.collection('rental_orders')
            .where('id', '==', targetId)
            .where('shop_id', '==', targetShopId)
            .limit(1)
            .get();

        if (!snap.empty) {
            const updateFields = {};
            if (newStatus) updateFields.status = newStatus;
            if (paymentStatus) updateFields.payment_status = paymentStatus;
            await snap.docs[0].ref.update(updateFields);
            return true;
        }
        return false;
    },

    // ----------------------------------------------------
    // AGGREGATE DASHBOARD STATS
    // ----------------------------------------------------
    getStats: async (shopId) => {
        if (!firestoreAdapter.isReady()) return null;
        const targetShopId = parseInt(shopId);

        const prodsSnap = await db.collection('products').where('shop_id', '==', targetShopId).get();
        let totalProds = 0;
        let totalUnits = 0;
        prodsSnap.forEach(d => {
            totalProds++;
            totalUnits += (d.data().total_stock || 1);
        });

        const ordersSnap = await db.collection('rental_orders').where('shop_id', '==', targetShopId).get();
        let totalOrders = 0;
        let activeRentals = 0;
        let pendingRequests = 0;
        let totalRev = 0;

        ordersSnap.forEach(d => {
            totalOrders++;
            const data = d.data();
            if (data.status === 'Active') activeRentals++;
            if (data.status === 'Pending') pendingRequests++;
            totalRev += (data.total_amount || 0);
        });

        return {
            total_products: totalProds,
            total_units: totalUnits,
            total_orders: totalOrders,
            active_rentals: activeRentals,
            pending_requests: pendingRequests,
            total_revenue: totalRev
        };
    }
};

module.exports = firestoreAdapter;
