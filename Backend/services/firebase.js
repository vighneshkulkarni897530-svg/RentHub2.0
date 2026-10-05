/**
 * Firebase Admin SDK & Cloud Firestore Service Initialization
 * Supports:
 *  1. Service Account JSON file (e.g. Backend/serviceAccountKey.json)
 *  2. Inline JSON string via process.env.FIREBASE_SERVICE_ACCOUNT
 *  3. Project ID with Application Default Credentials (ADC)
 *  4. Graceful fallback when Firebase credentials are not yet configured.
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });


let admin = null;
let firestoreDb = null;
let isFirebaseEnabled = false;

try {
    const adminApp = require('firebase-admin/app');
    const adminFirestore = require('firebase-admin/firestore');
    
    // Check possible service account file locations
    const possibleKeyPaths = [
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
        path.join(__dirname, '../serviceAccountKey.json'),
        path.join(__dirname, '../serviceAccountKey.json.json'),
        path.join(__dirname, '../../serviceAccountKey.json'),
        path.join(__dirname, '../firebase-service-account.json')
    ].filter(Boolean);

    let credential = null;

    // 1. Check for Service Account Key file
    for (const keyPath of possibleKeyPaths) {
        if (fs.existsSync(keyPath)) {
            try {
                const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
                credential = adminApp.cert(serviceAccount);
                console.log(`🔥 [Firebase] Loaded Service Account from: ${keyPath}`);
                break;
            } catch (err) {
                console.warn(`⚠️ [Firebase] Could not parse service account at ${keyPath}:`, err.message);
            }
        }
    }

    // 2. Check for inline JSON string in environment variable
    if (!credential && process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
            const inlineAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            credential = adminApp.cert(inlineAccount);
            console.log('🔥 [Firebase] Loaded Service Account from FIREBASE_SERVICE_ACCOUNT env var');
        } catch (err) {
            console.warn('⚠️ [Firebase] Failed to parse FIREBASE_SERVICE_ACCOUNT env var:', err.message);
        }
    }

    // 3. Fallback to GOOGLE_APPLICATION_CREDENTIALS if specified
    if (!credential && process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
        try {
            const fileAccount = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
            credential = adminApp.cert(fileAccount);
            console.log(`🔥 [Firebase] Loaded credentials from GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
        } catch (adcErr) {
            console.warn(`⚠️ [Firebase] Could not load GOOGLE_APPLICATION_CREDENTIALS:`, adcErr.message);
        }
    }

    // Initialize Firebase Admin if credential is provided
    if (credential) {
        const apps = adminApp.getApps();
        let appInstance = null;
        if (apps.length === 0) {
            appInstance = adminApp.initializeApp({
                credential,
                projectId: process.env.FIREBASE_PROJECT_ID || 'renthub-28307'
            });
        } else {
            appInstance = apps[0];
        }

        firestoreDb = adminFirestore.getFirestore(appInstance);
        firestoreDb.settings({ ignoreUndefinedProperties: true });
        isFirebaseEnabled = true;
        console.log(`✅ [Firebase] Cloud Firestore authenticated and initialized for: ${process.env.FIREBASE_PROJECT_ID || 'renthub-28307'}`);
    } else if (process.env.FIREBASE_PROJECT_ID) {
        console.log(`🔥 [Firebase] Web App Configured for Project: ${process.env.FIREBASE_PROJECT_ID}`);
        console.log(`ℹ️ [Firebase] Note: To enable Backend Firestore Admin sync, place 'serviceAccountKey.json' in 'd:/Rent Hub/Backend/'`);
        console.log(`ℹ️ [Firebase] RentHub is running in dual-mode with Local Data Layer actively serving all requests.`);
    } else {
        console.log('ℹ️ [Firebase] No serviceAccountKey.json found. RentHub is running in Local Data Layer mode.');
    }

} catch (error) {
    console.warn('ℹ️ [Firebase] Firebase Admin note:', error.message);
}

module.exports = {
    admin,
    db: firestoreDb,
    isFirebaseEnabled: () => isFirebaseEnabled && firestoreDb !== null
};

