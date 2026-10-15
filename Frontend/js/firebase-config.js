/**
 * RentHub Firebase Configuration (Client-Side Web SDK)
 * Project: rent-hub-d4944
 */

window.firebaseConfig = {
  apiKey: "AIzaSyDENzexf1j9VTiFyz2mpX1nRWfRJ4_FsWU",
  authDomain: "rent-hub-d4944.firebaseapp.com",
  projectId: "rent-hub-d4944",
  storageBucket: "rent-hub-d4944.firebasestorage.app",
  messagingSenderId: "890753283822",
  appId: "1:890753283822:web:f8c29b11570792baa525ff",
  measurementId: "G-1EHJ2LGPE1"
};

// Expose configuration globally
window.RentHubFirebaseConfig = window.firebaseConfig;

window.isFirebaseConfigured = function() {
    return true;
};

// Initialize Firebase Web SDK & Firestore Client
(function initFirebaseWebSDK() {
    console.log('🔥 [Firebase] RentHub configured with Project ID: rent-hub-d4944');

    function setupFirebaseInstances() {
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
            window.firebaseApp = firebase.initializeApp(window.firebaseConfig);
            if (firebase.firestore) {
                window.firestoreDb = firebase.firestore();
                console.log('✅ [Firebase Firestore] Client-side Firestore connected & active!');
            }
            if (firebase.analytics) {
                window.firebaseAnalytics = firebase.analytics();
            }
        }
    }

    if (typeof firebase !== 'undefined' && firebase.initializeApp) {
        setupFirebaseInstances();
    } else if (typeof document !== 'undefined') {
        // Dynamically load Firebase App & Firestore SDKs from Google's CDN
        const appScript = document.createElement('script');
        appScript.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js";
        appScript.onload = () => {
            const fsScript = document.createElement('script');
            fsScript.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js";
            fsScript.onload = () => {
                const analyticsScript = document.createElement('script');
                analyticsScript.src = "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics-compat.js";
                analyticsScript.onload = () => {
                    setupFirebaseInstances();
                };
                document.head.appendChild(analyticsScript);
            };
            document.head.appendChild(fsScript);
        };
        document.head.appendChild(appScript);
    }
})();
