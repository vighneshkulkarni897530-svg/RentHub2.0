# 🔥 RentHub - Firebase Cloud Firestore Setup Guide

RentHub is equipped with a full-stack **Firebase Cloud Firestore** database architecture. It operates in **dual-mode**:
- When Firebase credentials are provided, it automatically reads and writes to your live **Cloud Firestore** collections (`shops`, `products`, `rental_orders`).
- When running locally without Firebase keys, it falls back seamlessly to the local persisted database with zero downtime.

---

## ⚡ How to Connect Your Firebase Database (2 Easy Steps)

### Step 1: Download your Firebase Service Account Key
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select or create your Firebase Project.
3. Click the ⚙️ **Settings icon** next to *Project Overview* -> **Project settings**.
4. Navigate to the **Service accounts** tab.
5. Click **Generate new private key**, then click **Generate key**.
6. A JSON file will download. Rename it to:
   ```
   serviceAccountKey.json
   ```
7. Place this file inside the `Backend/` folder:
   ```
   d:/Rent Hub/Backend/serviceAccountKey.json
   ```

*(Alternatively, you can copy the contents of the JSON file and paste it into `Backend/.env` as `FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'`)*

---

### Step 2: (Optional) Seed Existing Demo Data into Firestore
To immediately populate your Firebase Console with demo shops, rental catalog items, and orders:
```bash
node Database/seedFirestore.js
```

---

## 📁 Firestore Database Structure

| Collection | Document Fields | Purpose |
| :--- | :--- | :--- |
| **`shops`** | `id`, `shop_name`, `owner_name`, `email`, `phone`, `password_hash`, `category`, `address`, `city`, `gst_number`, `rating` | Store owner profiles & credentials |
| **`products`** | `id`, `shop_id`, `name`, `category`, `rent_price_per_day`, `deposit_amount`, `total_stock`, `available_stock`, `image_url` | Rental catalog & live inventory |
| **`rental_orders`** | `id`, `shop_id`, `product_id`, `customer_name`, `customer_phone`, `start_date`, `end_date`, `total_amount`, `status` | Active customer bookings & orders |

---

## 🌐 Client-Side Web Configuration (Optional)
If you want to use the Firebase Web SDK on the frontend for real-time listeners:
- Open [`Frontend/js/firebase-config.js`](Frontend/js/firebase-config.js)
- Paste your web app configuration from Firebase Console:
```javascript
window.RentHubFirebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-app",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```
