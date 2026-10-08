/**
 * RentHub Portable Data Layer
 * Provides persistent relational-style CRUD operations for Shops, Products, and Rental Orders
 * Stored cleanly in Database/renthub_data.json with initial seed values.
 */

const fs = require('fs');
const path = require('path');
const firestoreAdapter = require('./firestoreAdapter');

const DB_FILE = path.join(__dirname, 'renthub_data.json');

// Default initial dataset matching seed.sql
const DEFAULT_DATA = {
    shops: [
        {
            id: 1,
            shop_name: "Apex Gear & Electronics Hub",
            owner_name: "Rajesh Sharma",
            email: "shop@renthub.com",
            phone: "9876543210",
            password_hash: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // 'shop123' or 'password'
            category: "Electronics & Gadgets",
            address: "Shop #14, Ground Floor, Cyber Plaza, MG Road",
            city: "Bangalore",
            gst_number: "29AAAAA0000A1Z5",
            logo_url: "https://images.unsplash.com/photo-1556742049-0a67e557b779?auto=format&fit=crop&w=150&q=80",
            rating: 4.9,
            total_reviews: 48,
            is_verified: 1,
            created_at: new Date().toISOString()
        },
        {
            id: 2,
            shop_name: "Urban Living Appliances & Furniture",
            owner_name: "Ananya Verma",
            email: "urbanliving@renthub.com",
            phone: "9123456780",
            password_hash: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
            category: "Home Appliances & Furniture",
            address: "Plot 45, Sector 18, Commercial Belt",
            city: "Mumbai",
            gst_number: "27AAAAA1111B1Z2",
            logo_url: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=150&q=80",
            rating: 4.8,
            total_reviews: 36,
            is_verified: 1,
            created_at: new Date().toISOString()
        }
    ],
    products: [],
    rental_orders: []
};

// Ensure database file exists
function loadData() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf8');
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
    try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DATA, null, 2), 'utf8');
        return JSON.parse(JSON.stringify(DEFAULT_DATA));
    }
}

function saveData(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const db = {
    // 1. Get single record matching SQL-like pattern
    get: async (sql, params = []) => {
        const clean = sql.toLowerCase();

        // Check if Cloud Firestore is active
        if (firestoreAdapter.isReady()) {
            try {
                if (clean.includes('from shops')) {
                    if (clean.includes('lower(email) = ? or phone = ?')) {
                        const shop = await firestoreAdapter.getShopByEmailOrPhone(params[0]);
                        if (shop) return shop;
                    }
                    if (clean.includes('where id = ?')) {
                        const shop = await firestoreAdapter.getShopById(params[0]);
                        if (shop) return shop;
                    }
                }
                if (clean.includes('from products')) {
                    if (clean.includes('where id = ?')) {
                        const prod = await firestoreAdapter.getProductById(params[0]);
                        if (prod) return prod;
                    }
                }
                if (clean.includes('sum(case when status') || clean.includes('count(*) as total_products')) {
                    const shopId = parseInt(params[0]);
                    const stats = await firestoreAdapter.getStats(shopId);
                    if (stats) return stats;
                }
            } catch (err) {
                console.warn('ℹ️ [Firestore] Notice: fallback to local database due to:', err.message);
            }
        }

        // Local JSON Store Fallback
        const data = loadData();

        if (clean.includes('from shops')) {
            if (clean.includes('lower(email) = ? or phone = ?')) {
                const idVal = params[0];
                return data.shops.find(s => s.email.toLowerCase() === idVal.toLowerCase() || s.phone === idVal) || null;
            }
            if (clean.includes('where id = ?')) {
                return data.shops.find(s => s.id === parseInt(params[0])) || null;
            }
            if (clean.includes('count(*)')) {
                return { count: data.shops.length };
            }
        }

        if (clean.includes('from products')) {
            if (clean.includes('where id = ? and shop_id = ?')) {
                const prod = data.products.find(p => p.id === parseInt(params[0]) && p.shop_id === parseInt(params[1])) || null;
                if (prod) {
                    return {
                        ...prod,
                        variants: (Array.isArray(prod.variants) && prod.variants.length > 0)
                            ? prod.variants
                            : [{
                                id: 'var_' + prod.id + '_1',
                                product_id: prod.id,
                                color_name: 'Standard',
                                color_code: '#111827',
                                rent_price_per_day: parseFloat(prod.rent_price_per_day) || 0,
                                deposit_amount: parseFloat(prod.deposit_amount) || 0,
                                total_stock: parseInt(prod.total_stock) || 1,
                                available_stock: parseInt(prod.available_stock !== undefined ? prod.available_stock : (prod.total_stock || 1)),
                                media: Array.isArray(prod.media) && prod.media.length > 0 ? prod.media : (prod.image_url ? [{ type: 'image', url: prod.image_url, is_primary: true }] : []),
                                specifications: prod.description || ''
                            }]
                    };
                }
                return null;
            }
            if (clean.includes('where id = ?')) {
                const prod = data.products.find(p => p.id === parseInt(params[0])) || null;
                if (prod) {
                    return {
                        ...prod,
                        variants: (Array.isArray(prod.variants) && prod.variants.length > 0)
                            ? prod.variants
                            : [{
                                id: 'var_' + prod.id + '_1',
                                product_id: prod.id,
                                color_name: 'Standard',
                                color_code: '#111827',
                                rent_price_per_day: parseFloat(prod.rent_price_per_day) || 0,
                                deposit_amount: parseFloat(prod.deposit_amount) || 0,
                                total_stock: parseInt(prod.total_stock) || 1,
                                available_stock: parseInt(prod.available_stock !== undefined ? prod.available_stock : (prod.total_stock || 1)),
                                media: Array.isArray(prod.media) && prod.media.length > 0 ? prod.media : (prod.image_url ? [{ type: 'image', url: prod.image_url, is_primary: true }] : []),
                                specifications: prod.description || ''
                            }]
                    };
                }
                return null;
            }
            if (clean.includes('count(*) as total_products')) {
                const shopId = parseInt(params[0]);
                const shopProds = data.products.filter(p => p.shop_id === shopId);
                const totalUnits = shopProds.reduce((sum, p) => sum + (p.total_stock || 1), 0);
                return { total_products: shopProds.length, total_units: totalUnits };
            }
        }

        if (clean.includes('from rental_orders')) {
            if (clean.includes('where id = ? and shop_id = ?')) {
                return data.rental_orders.find(o => o.id === parseInt(params[0]) && o.shop_id === parseInt(params[1])) || null;
            }
            if (clean.includes('where id = ?')) {
                return data.rental_orders.find(o => o.id === parseInt(params[0])) || null;
            }
            if (clean.includes('sum(case when status')) {
                const shopId = parseInt(params[0]);
                const shopOrders = data.rental_orders.filter(o => o.shop_id === shopId);
                const active = shopOrders.filter(o => o.status === 'Active').length;
                const pending = shopOrders.filter(o => o.status === 'Pending').length;
                const totalRev = shopOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
                return {
                    total_orders: shopOrders.length,
                    active_rentals: active,
                    total_revenue: totalRev
                };
            }
        }

        if (clean.includes('from users')) {
            if (!data.users) data.users = [];
            if (clean.includes('lower(email) = ? or phone = ?')) {
                const idVal = params[0];
                return data.users.find(u => (u.email && u.email.toLowerCase() === idVal.toLowerCase()) || u.phone === idVal) || null;
            }
            if (clean.includes('where id = ?')) {
                return data.users.find(u => u.id === parseInt(params[0])) || null;
            }
            if (clean.includes('count(*)')) {
                return { count: data.users.length };
            }
        }

        return null;
    },

    // 2. Get list of records
    all: async (sql, params = []) => {
        const clean = sql.toLowerCase();

        // Check if Cloud Firestore is active
        if (firestoreAdapter.isReady()) {
            try {
                if (clean.includes('from products')) {
                    const shopId = parseInt(params[0]);
                    const cat = (params.length > 1 && clean.includes('category = ?')) ? params[1] : '';
                    const search = clean.includes('like ?') ? params[params.length - 1].replace(/%/g, '') : '';
                    const prods = await firestoreAdapter.getProducts(shopId, cat, search);
                    if (prods && prods.length > 0) return prods;
                }

                if (clean.includes('from rental_orders')) {
                    const shopId = parseInt(params[0]);
                    const stat = (params.length > 1 && clean.includes('status = ?')) ? params[1] : '';
                    const orders = await firestoreAdapter.getOrders(shopId, stat);
                    if (orders && orders.length > 0) return orders;
                }
            } catch (err) {
                console.warn('ℹ️ [Firestore] Notice: fallback to local database due to:', err.message);
            }
        }

        // Local JSON Store Fallback
        const data = loadData();

        if (clean.includes('from products')) {
            const shopId = parseInt(params[0]);
            let list = data.products.filter(p => p.shop_id === shopId);
            
            if (params.length > 1 && clean.includes('category = ?')) {
                const cat = params[1];
                list = list.filter(p => p.category === cat);
            }
            if (clean.includes('like ?')) {
                const searchTerm = params[params.length - 1].replace(/%/g, '').toLowerCase();
                list = list.filter(p => p.name.toLowerCase().includes(searchTerm) || (p.description && p.description.toLowerCase().includes(searchTerm)));
            }
            return list.map(p => ({
                ...p,
                variants: (Array.isArray(p.variants) && p.variants.length > 0)
                    ? p.variants
                    : [{
                        id: 'var_' + p.id + '_1',
                        product_id: p.id,
                        color_name: 'Standard',
                        color_code: '#111827',
                        rent_price_per_day: parseFloat(p.rent_price_per_day) || 0,
                        deposit_amount: parseFloat(p.deposit_amount) || 0,
                        total_stock: parseInt(p.total_stock) || 1,
                        available_stock: parseInt(p.available_stock !== undefined ? p.available_stock : (p.total_stock || 1)),
                        media: Array.isArray(p.media) && p.media.length > 0 ? p.media : (p.image_url ? [{ type: 'image', url: p.image_url, is_primary: true }] : []),
                        specifications: p.description || ''
                    }]
            }));
        }

        if (clean.includes('from rental_orders')) {
            const shopId = (params.length > 0 && !isNaN(parseInt(params[0]))) ? parseInt(params[0]) : (clean.includes('shop_id = 1') ? 1 : null);
            let orders = shopId ? data.rental_orders.filter(o => o.shop_id === shopId) : data.rental_orders;
            
            if (params.length > 1 && clean.includes('status = ?')) {
                const stat = params[1];
                orders = orders.filter(o => o.status === stat);
            }

            // Join product details
            return orders.map(o => {
                const prod = data.products.find(p => p.id === o.product_id) || {};
                return {
                    ...o,
                    variant_id: o.variant_id || null,
                    variant_color: o.variant_color || null,
                    variant_color_code: o.variant_color_code || null,
                    product_name: o.product_name || prod.name || 'Rental Item',
                    product_image: o.product_image || prod.image_url || 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
                    product_category: o.product_category || prod.category || 'General',
                    product_description: prod.description || o.product_description || '',
                    rent_price_per_day: prod.rent_price_per_day || (o.total_amount && o.total_days ? Math.round(o.total_amount / o.total_days) : 0),
                    deposit_amount: o.deposit_amount !== undefined ? o.deposit_amount : (prod.deposit_amount || 0)
                };
            });
        }

        return [];
    },


    // 3. Insert / Update / Delete
    run: async (sql, params = []) => {
        const clean = sql.toLowerCase();

        // Check if Cloud Firestore is active
        if (firestoreAdapter.isReady()) {
            if (clean.startsWith('insert into shops')) {
                const res = await firestoreAdapter.createShop({
                    shop_name: params[0],
                    owner_name: params[1],
                    email: params[2],
                    phone: params[3],
                    password_hash: params[4],
                    category: params[5],
                    address: params[6],
                    city: params[7],
                    gst_number: params[8],
                    logo_url: params[9]
                });
                return res || { lastID: null, changes: 0 };
            }

            if (clean.startsWith('update shops')) {
                const shopId = parseInt(params[params.length - 1]);
                const updatePayload = {
                    shop_name: params[0],
                    owner_name: params[1],
                    email: params[2],
                    phone: params[3],
                    category: params[4],
                    address: params[5],
                    city: params[6],
                    gst_number: params[7]
                };
                const ok = await firestoreAdapter.updateShop(shopId, updatePayload);
                return { lastID: shopId, changes: ok ? 1 : 0 };
            }

            if (clean.startsWith('insert into products')) {
                let mediaArray = [];
                if (params[11]) {
                    try {
                        mediaArray = typeof params[11] === 'string' ? JSON.parse(params[11]) : params[11];
                    } catch (e) {
                        mediaArray = [];
                    }
                }
                let variantsArray = [];
                if (params[12]) {
                    try {
                        variantsArray = typeof params[12] === 'string' ? JSON.parse(params[12]) : params[12];
                    } catch (e) {
                        variantsArray = [];
                    }
                }
                const res = await firestoreAdapter.createProduct({
                    shop_id: params[0],
                    name: params[1],
                    description: params[2],
                    category: params[3],
                    rent_price_per_day: params[4],
                    rent_price_per_month: params[5],
                    deposit_amount: params[6],
                    total_stock: params[7],
                    available_stock: params[8],
                    image_url: params[9],
                    condition: params[10],
                    media: mediaArray,
                    variants: variantsArray
                });
                return res || { lastID: null, changes: 0 };
            }

            if (clean.startsWith('update products')) {
                const prodId = parseInt(params[params.length - 2]);
                const shopId = parseInt(params[params.length - 1]);
                let mediaArray = undefined;
                if (params[11] !== undefined && params[11] !== null) {
                    try {
                        mediaArray = typeof params[11] === 'string' ? JSON.parse(params[11]) : params[11];
                    } catch (e) {
                        mediaArray = undefined;
                    }
                }
                let variantsArray = undefined;
                if (params[12] !== undefined && params[12] !== null) {
                    try {
                        variantsArray = typeof params[12] === 'string' ? JSON.parse(params[12]) : params[12];
                    } catch (e) {
                        variantsArray = undefined;
                    }
                }

                const updatePayload = {};
                if (params[0] !== undefined && params[0] !== null) updatePayload.name = params[0];
                if (params[1] !== undefined && params[1] !== null) updatePayload.description = params[1];
                if (params[2] !== undefined && params[2] !== null) updatePayload.category = params[2];
                if (params[3] !== undefined && params[3] !== null) updatePayload.rent_price_per_day = parseFloat(params[3]);
                if (params[4] !== undefined && params[4] !== null) updatePayload.rent_price_per_month = parseFloat(params[4]);
                if (params[5] !== undefined && params[5] !== null) updatePayload.deposit_amount = parseFloat(params[5]);
                if (params[6] !== undefined && params[6] !== null) updatePayload.total_stock = parseInt(params[6]);
                if (params[7] !== undefined && params[7] !== null) updatePayload.available_stock = parseInt(params[7]);
                if (params[8] !== undefined && params[8] !== null) updatePayload.image_url = params[8];
                if (params[9] !== undefined && params[9] !== null) updatePayload.condition = params[9];
                if (params[10] !== undefined && params[10] !== null) updatePayload.is_active = params[10];
                if (mediaArray !== undefined) updatePayload.media = mediaArray;
                if (variantsArray !== undefined) updatePayload.variants = variantsArray;

                const ok = await firestoreAdapter.updateProduct(prodId, shopId, updatePayload);
                return { lastID: prodId, changes: ok ? 1 : 0 };
            }

            if (clean.startsWith('delete from products')) {
                const prodId = parseInt(params[0]);
                const shopId = parseInt(params[1]);
                const changes = await firestoreAdapter.deleteProduct(prodId, shopId);
                return { changes };
            }

            if (clean.startsWith('insert into rental_orders')) {
                const res = await firestoreAdapter.createOrder({
                    shop_id: params[0],
                    product_id: params[1],
                    customer_name: params[2],
                    customer_phone: params[3],
                    customer_address: params[4],
                    start_date: params[5],
                    end_date: params[6],
                    total_days: params[7],
                    total_amount: params[8],
                    deposit_amount: params[9],
                    delivery_type: params[10],
                    variant_id: params[11] || null,
                    variant_color: params[12] || null,
                    variant_color_code: params[13] || null
                });
                return res || { lastID: null, changes: 0 };
            }

            if (clean.startsWith('update rental_orders')) {
                const orderId = parseInt(params[params.length - 2]);
                const shopId = parseInt(params[params.length - 1]);
                const ok = await firestoreAdapter.updateOrderStatus(orderId, shopId, params[0], params[1]);
                return { lastID: orderId, changes: ok ? 1 : 0 };
            }
        }

        // Local JSON Store Fallback
        const data = loadData();

        if (clean.startsWith('insert into shops')) {
            const newId = (data.shops.length > 0 ? Math.max(...data.shops.map(s => s.id)) : 0) + 1;
            const newShop = {
                id: newId,
                shop_name: params[0],
                owner_name: params[1],
                email: params[2],
                phone: params[3],
                password_hash: params[4],
                category: params[5],
                address: params[6],
                city: params[7],
                gst_number: params[8],
                logo_url: params[9],
                rating: 5.0,
                total_reviews: 1,
                is_verified: 1,
                created_at: new Date().toISOString()
            };
            data.shops.push(newShop);
            saveData(data);
            return { lastID: newId, changes: 1 };
        }

        if (clean.startsWith('insert into products')) {
            const newId = (data.products.length > 0 ? Math.max(...data.products.map(p => p.id)) : 0) + 1;
            let mediaArray = [];
            if (params[11]) {
                try {
                    mediaArray = typeof params[11] === 'string' ? JSON.parse(params[11]) : params[11];
                } catch (e) {
                    mediaArray = [];
                }
            }
            let variantsArray = [];
            if (params[12]) {
                try {
                    variantsArray = typeof params[12] === 'string' ? JSON.parse(params[12]) : params[12];
                } catch (e) {
                    variantsArray = [];
                }
            }

            if (variantsArray.length === 0) {
                variantsArray = [{
                    id: 'var_' + newId + '_1',
                    product_id: newId,
                    color_name: 'Standard',
                    color_code: '#111827',
                    rent_price_per_day: parseFloat(params[4]) || 0,
                    deposit_amount: parseFloat(params[6]) || 0,
                    total_stock: parseInt(params[7]) || 1,
                    available_stock: parseInt(params[8] !== undefined ? params[8] : params[7]) || 1,
                    media: mediaArray.length > 0 ? mediaArray : (params[9] ? [{ type: 'image', url: params[9], is_primary: true }] : []),
                    specifications: params[2] || ''
                }];
            }

            if (mediaArray.length === 0 && params[9]) {
                mediaArray = [{ type: 'image', url: params[9], is_primary: true }];
            }
            const primaryItem = mediaArray.find(m => m.is_primary) || mediaArray[0] || {};
            const primaryImg = primaryItem.url || params[9] || '';

            const newProd = {
                id: newId,
                shop_id: params[0],
                name: params[1],
                description: params[2],
                category: params[3],
                rent_price_per_day: params[4],
                rent_price_per_month: params[5],
                deposit_amount: params[6],
                total_stock: params[7],
                available_stock: params[8],
                image_url: primaryImg,
                media: mediaArray,
                variants: variantsArray,
                condition: params[10],
                is_active: 1,
                created_at: new Date().toISOString()
            };
            data.products.unshift(newProd);
            saveData(data);
            return { lastID: newId, changes: 1 };
        }

        if (clean.startsWith('update products')) {
            const prodId = parseInt(params[params.length - 2]);
            const shopId = parseInt(params[params.length - 1]);
            const index = data.products.findIndex(p => p.id === prodId && p.shop_id === shopId);
            if (index !== -1) {
                const p = data.products[index];
                p.name = params[0] !== undefined && params[0] !== null ? params[0] : p.name;
                p.description = params[1] !== undefined && params[1] !== null ? params[1] : p.description;
                p.category = params[2] !== undefined && params[2] !== null ? params[2] : p.category;
                p.rent_price_per_day = params[3] !== undefined && params[3] !== null ? params[3] : p.rent_price_per_day;
                p.rent_price_per_month = params[4] !== undefined && params[4] !== null ? params[4] : p.rent_price_per_month;
                p.deposit_amount = params[5] !== undefined && params[5] !== null ? params[5] : p.deposit_amount;
                p.total_stock = params[6] !== undefined && params[6] !== null ? params[6] : p.total_stock;
                p.available_stock = params[7] !== undefined && params[7] !== null ? params[7] : p.available_stock;
                p.image_url = params[8] !== undefined && params[8] !== null ? params[8] : p.image_url;
                p.condition = params[9] !== undefined && params[9] !== null ? params[9] : p.condition;
                p.is_active = params[10] !== undefined && params[10] !== null ? params[10] : p.is_active;
                if (params[11] !== undefined && params[11] !== null) {
                    try {
                        p.media = typeof params[11] === 'string' ? JSON.parse(params[11]) : params[11];
                    } catch (e) {
                        p.media = params[11];
                    }
                }
                if (params[12] !== undefined && params[12] !== null) {
                    try {
                        p.variants = typeof params[12] === 'string' ? JSON.parse(params[12]) : params[12];
                    } catch (e) {
                        p.variants = params[12];
                    }
                }
                saveData(data);
                return { lastID: prodId, changes: 1 };
            }
            return { lastID: null, changes: 0 };
        }

        if (clean.startsWith('delete from products')) {
            const prodId = parseInt(params[0]);
            const shopId = parseInt(params[1]);
            const initialLen = data.products.length;
            data.products = data.products.filter(p => !(p.id === prodId && p.shop_id === shopId));
            saveData(data);
            return { changes: initialLen - data.products.length };
        }

        if (clean.startsWith('insert into rental_orders')) {
            const newId = (data.rental_orders.length > 0 ? Math.max(...data.rental_orders.map(o => o.id)) : 100) + 1;
            const newOrder = {
                id: newId,
                shop_id: parseInt(params[0]),
                product_id: parseInt(params[1]),
                variant_id: params[11] || null,
                variant_color: params[12] || null,
                variant_color_code: params[13] || null,
                customer_name: params[2],
                customer_phone: params[3],
                customer_address: params[4] || '',
                start_date: params[5],
                end_date: params[6],
                total_days: parseInt(params[7]) || 1,
                total_amount: parseFloat(params[8]) || 0,
                deposit_amount: parseFloat(params[9]) || 0,
                status: 'Pending',
                delivery_type: params[10] || 'Store Pickup',
                payment_status: 'Pending',
                created_at: new Date().toISOString()
            };
            data.rental_orders.unshift(newOrder);

            // Decrement variant stock & product available stock
            const targetProd = data.products.find(p => p.id === newOrder.product_id);
            if (targetProd) {
                targetProd.available_stock = Math.max(0, (targetProd.available_stock || 1) - 1);
                if (Array.isArray(targetProd.variants) && (newOrder.variant_id || newOrder.variant_color)) {
                    targetProd.variants = targetProd.variants.map(v => {
                        if ((newOrder.variant_id && v.id === newOrder.variant_id) || (newOrder.variant_color && v.color_name === newOrder.variant_color)) {
                            const curStock = parseInt(v.available_stock !== undefined ? v.available_stock : (v.total_stock || 1));
                            return { ...v, available_stock: Math.max(0, curStock - 1) };
                        }
                        return v;
                    });
                }
            }

            saveData(data);
            return { lastID: newId, changes: 1 };
        }

        if (clean.startsWith('update shops')) {
            const shopId = parseInt(params[params.length - 1]);
            const index = data.shops.findIndex(s => s.id === shopId);
            if (index !== -1) {
                const s = data.shops[index];
                if (params[0] !== undefined && params[0] !== null) s.shop_name = params[0];
                if (params[1] !== undefined && params[1] !== null) s.owner_name = params[1];
                if (params[2] !== undefined && params[2] !== null) s.email = params[2];
                if (params[3] !== undefined && params[3] !== null) s.phone = params[3];
                if (params[4] !== undefined && params[4] !== null) s.category = params[4];
                if (params[5] !== undefined && params[5] !== null) s.address = params[5];
                if (params[6] !== undefined && params[6] !== null) s.city = params[6];
                if (params[7] !== undefined && params[7] !== null) s.gst_number = params[7];
                saveData(data);
                return { lastID: shopId, changes: 1 };
            }
            return { lastID: null, changes: 0 };
        }

        if (clean.startsWith('update rental_orders')) {
            const orderId = parseInt(params[params.length - 2]);
            const shopId = parseInt(params[params.length - 1]);
            const order = data.rental_orders.find(o => o.id === orderId && o.shop_id === shopId);
            if (order) {
                const prevStatus = order.status;
                if (params[0]) order.status = params[0];
                if (params[1]) order.payment_status = params[1];

                // If returned, increment stock on variant & product
                if (params[0] === 'Returned' && prevStatus !== 'Returned') {
                    const targetProd = data.products.find(p => p.id === order.product_id);
                    if (targetProd) {
                        targetProd.available_stock = Math.min(targetProd.total_stock || 1, (targetProd.available_stock || 0) + 1);
                        if (Array.isArray(targetProd.variants) && (order.variant_id || order.variant_color)) {
                            targetProd.variants = targetProd.variants.map(v => {
                                if ((order.variant_id && v.id === order.variant_id) || (order.variant_color && v.color_name === order.variant_color)) {
                                    const vTotal = parseInt(v.total_stock || 1);
                                    const vCur = parseInt(v.available_stock !== undefined ? v.available_stock : vTotal);
                                    return { ...v, available_stock: Math.min(vTotal, vCur + 1) };
                                }
                                return v;
                            });
                        }
                    }
                }

                saveData(data);
                return { lastID: orderId, changes: 1 };
            }
            return { lastID: null, changes: 0 };
        }

        if (clean.startsWith('insert into users')) {
            if (!data.users) data.users = [];
            const newId = (data.users.length > 0 ? Math.max(...data.users.map(u => u.id)) : 0) + 1;
            const newUser = {
                id: newId,
                name: params[0],
                email: params[1],
                phone: params[2],
                password_hash: params[3],
                address: params[4] || '',
                city: params[5] || '',
                pincode: params[6] || '',
                avatar_url: params[7] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
                created_at: new Date().toISOString()
            };
            data.users.unshift(newUser);
            saveData(data);
            return { lastID: newId, changes: 1 };
        }

        if (clean.startsWith('update users')) {
            if (!data.users) data.users = [];
            const userId = parseInt(params[params.length - 1]);
            const user = data.users.find(u => u.id === userId);
            if (user) {
                if (params[0] !== undefined && params[0] !== null) user.name = params[0];
                if (params[1] !== undefined && params[1] !== null) user.email = params[1];
                if (params[2] !== undefined && params[2] !== null) user.phone = params[2];
                if (params[3] !== undefined && params[3] !== null) user.address = params[3];
                if (params[4] !== undefined && params[4] !== null) user.city = params[4];
                if (params[5] !== undefined && params[5] !== null) user.pincode = params[5];
                saveData(data);
                return { lastID: userId, changes: 1 };
            }
            return { lastID: null, changes: 0 };
        }

        return { changes: 0 };
    },

    reset: () => {
        saveData(DEFAULT_DATA);
        console.log('✅ Database reset to default seed data.');
    }
};

module.exports = db;
