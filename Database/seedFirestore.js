/**
 * RentHub Firestore Seeder
 * Uploads initial default data (Shops, Products, and Orders) from Database/renthub_data.json to Cloud Firestore.
 * 
 * Usage:
 *   node Database/seedFirestore.js
 */

const fs = require('fs');
const path = require('path');
const { db, isFirebaseEnabled } = require('../Backend/services/firebase');

async function seedFirestore() {
    console.log('🚀 Starting RentHub Firestore Seeder...');

    if (!isFirebaseEnabled() || !db) {
        console.error('❌ Firebase is not connected.');
        console.error('👉 Please make sure you have serviceAccountKey.json in Backend/ or FIREBASE_SERVICE_ACCOUNT in .env');
        process.exit(1);
    }

    const jsonPath = path.join(__dirname, 'renthub_data.json');
    if (!fs.existsSync(jsonPath)) {
        console.error('❌ renthub_data.json not found at:', jsonPath);
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // 1. Seed Shops
    if (data.shops && data.shops.length > 0) {
        console.log(`📦 Seeding ${data.shops.length} Shops into Firestore...`);
        for (const shop of data.shops) {
            const existing = await db.collection('shops').where('email', '==', shop.email).get();
            if (existing.empty) {
                await db.collection('shops').add(shop);
                console.log(`  ✓ Added Shop: ${shop.shop_name} (${shop.email})`);
            } else {
                console.log(`  ℹ️ Shop already exists: ${shop.shop_name}`);
            }
        }
    }

    // 2. Seed Products
    if (data.products && data.products.length > 0) {
        console.log(`📦 Seeding ${data.products.length} Products into Firestore...`);
        for (const prod of data.products) {
            const existing = await db.collection('products').where('name', '==', prod.name).where('shop_id', '==', prod.shop_id).get();
            if (existing.empty) {
                await db.collection('products').add(prod);
                console.log(`  ✓ Added Product: ${prod.name}`);
            } else {
                console.log(`  ℹ️ Product already exists: ${prod.name}`);
            }
        }
    }

    // 3. Seed Orders
    if (data.rental_orders && data.rental_orders.length > 0) {
        console.log(`📦 Seeding ${data.rental_orders.length} Rental Orders into Firestore...`);
        for (const order of data.rental_orders) {
            const existing = await db.collection('rental_orders').where('id', '==', order.id).get();
            if (existing.empty) {
                await db.collection('rental_orders').add(order);
                console.log(`  ✓ Added Order #${order.id}`);
            }
        }
    }

    console.log('🎉 Cloud Firestore seeding completed successfully!');
    process.exit(0);
}

seedFirestore().catch(err => {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
});
