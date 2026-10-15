/**
 * RentHub - Firebase Connection & Health Check Utility
 * Run with: node Backend/testFirebase.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');

async function testFirebase() {
    console.log('\n=================================================');
    console.log('🔥 RentHub Firebase Connection Diagnostic');
    console.log('=================================================\n');

    const keyPath = path.join(__dirname, 'serviceAccountKey.json');
    const keyExists = fs.existsSync(keyPath);

    console.log(`1. Key File Check:`);
    console.log(`   - Looking for: ${keyPath}`);
    console.log(`   - Found: ${keyExists ? '✅ YES' : '❌ NO'}`);

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.log(`   - Inline FIREBASE_SERVICE_ACCOUNT env: ✅ Found`);
    }

    console.log(`\n2. Project Configuration:`);
    console.log(`   - Project ID: ${process.env.FIREBASE_PROJECT_ID || 'rent-hub-d4944'}`);

    console.log(`\n3. Initializing Firebase Admin SDK...`);
    const { db, isFirebaseEnabled } = require('./services/firebase');

    if (!isFirebaseEnabled() || !db) {
        console.log('\n❌ Firebase Cloud Firestore is NOT yet active.');
        console.log('\n👉 Quick Steps to connect:');
        console.log('   1. Open Firebase Console: https://console.firebase.google.com/');
        console.log(`   2. Select project (e.g. ${process.env.FIREBASE_PROJECT_ID || 'rent-hub-d4944'})`);
        console.log('   3. Go to Project Settings -> Service Accounts');
        console.log('   4. Click "Generate new private key"');
        console.log('   5. Save the downloaded file as:');
        console.log(`      ${keyPath}`);
        console.log('\n   Once saved, rerun: node Backend/testFirebase.js');
        console.log('   Then seed your database with: node Database/seedFirestore.js\n');
        process.exit(0);
    }

    try {
        console.log('   - Contacting Cloud Firestore...');
        const collections = await db.listCollections();
        console.log(`✅ Successfully connected to Cloud Firestore!`);
        console.log(`   Found ${collections.length} collections:`, collections.map(c => c.id).join(', ') || '(empty database)');

        console.log('\n🎉 Ready to seed! Run:');
        console.log('   node Database/seedFirestore.js\n');
    } catch (err) {
        console.error('❌ Error communicating with Firestore:', err.message);
    }
}

testFirebase();
