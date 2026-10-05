/**
 * RentHub Firebase Configuration (Client-Side Web SDK)
 * Project: renthub-28307
 */

window.firebaseConfig = {
  apiKey: "AIzaSyB33NRwAp51i1coKn8u79psI7FTlVRmMQ8",
  authDomain: "renthub-28307.firebaseapp.com",
  projectId: "renthub-28307",
  storageBucket: "renthub-28307.firebasestorage.app",
  messagingSenderId: "13094915189",
  appId: "1:13094915189:web:4ef7446ae8cf0fd4ca7c3c",
  measurementId: "G-VKJ9B1LE9F"
};

// Also expose as RentHubFirebaseConfig for backwards compatibility
window.RentHubFirebaseConfig = window.firebaseConfig;

window.isFirebaseConfigured = function() {
    return true;
};

console.log('🔥 [Firebase] RentHub configured with Project ID: renthub-28307');
