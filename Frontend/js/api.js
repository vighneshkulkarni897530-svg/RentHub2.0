/**
 * RentHub API Client Service Layer
 * Connects to Backend REST API (http://localhost:5000/api)
 */

const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http'))
    ? `${window.location.origin}/api`
    : 'http://localhost:7000/api';

const API = {
    // 1. Shop Authentication
    login: async (identifier, password) => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            return await res.json();
        } catch (error) {
            console.warn('Backend API unreachable, using local fallback:', error);
            // Standalone Fallback for demo
            if ((identifier === 'shop@renthub.com' || identifier === '9876543210') && (password === 'shop123' || password === 'password')) {
                return {
                    success: true,
                    token: 'mock_jwt_token_apex_shop',
                    shop: {
                        id: 1,
                        shop_name: 'Apex Gear & Electronics Hub',
                        owner_name: 'Rajesh Sharma',
                        email: 'shop@renthub.com',
                        phone: '9876543210',
                        category: 'Electronics & Gadgets',
                        city: 'Bangalore',
                        rating: 4.9
                    }
                };
            }
            return {
                success: false,
                message: 'Unable to connect to backend server. Make sure backend is running on port 5000.'
            };
        }
    },

    // 2. Shop Registration
    register: async (shopData) => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(shopData)
            });
            return await res.json();
        } catch (error) {
            return {
                success: false,
                message: 'Backend server error: ' + error.message
            };
        }
    },

    // 3. Get Shop Profile & Dashboard Stats
    getProfile: async (token) => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return await res.json();
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateProfile: async (token, updateData) => {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });
            return await res.json();
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // 4. Products / Inventory
    getProducts: async (token, category = '', search = '') => {
        try {
            let url = `${API_BASE_URL}/products?`;
            if (category) url += `category=${encodeURIComponent(category)}&`;
            if (search) url += `search=${encodeURIComponent(search)}`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return await res.json();
        } catch (error) {
            return { success: false, products: [] };
        }
    },

    addProduct: async (token, productData) => {
        try {
            const res = await fetch(`${API_BASE_URL}/products`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productData)
            });
            let data;
            try {
                data = await res.json();
            } catch (e) {
                return { success: false, message: `Server response error (${res.status}: ${res.statusText})` };
            }
            if (!res.ok && !data.message) {
                data.message = `Request failed with status ${res.status}`;
            }
            return data;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    updateProduct: async (token, productId, productData) => {
        try {
            const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(productData)
            });
            let data;
            try {
                data = await res.json();
            } catch (e) {
                return { success: false, message: `Server response error (${res.status}: ${res.statusText})` };
            }
            if (!res.ok && !data.message) {
                data.message = `Request failed with status ${res.status}`;
            }
            return data;
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    deleteProduct: async (token, productId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/products/${productId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return await res.json();
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // 5. Rental Orders
    getOrders: async (token, status = '') => {
        try {
            let url = `${API_BASE_URL}/orders?`;
            if (status) url += `status=${encodeURIComponent(status)}`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return await res.json();
        } catch (error) {
            return { success: false, orders: [] };
        }
    },

    updateOrderStatus: async (token, orderId, status) => {
        try {
            const res = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            return await res.json();
        } catch (error) {
            return { success: false, message: error.message };
        }
    },

    // 6. Customer / Renter User Authentication
    userLogin: async (identifier, password) => {
        try {
            const res = await fetch(`${API_BASE_URL}/user/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, password })
            });
            return await res.json();
        } catch (error) {
            return { success: false, message: 'Unable to connect to customer auth server: ' + error.message };
        }
    },

    userRegister: async (userData) => {
        try {
            const res = await fetch(`${API_BASE_URL}/user/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });
            return await res.json();
        } catch (error) {
            return { success: false, message: 'Customer registration failed: ' + error.message };
        }
    },

    getUserOrders: async (phone = '', email = '') => {
        try {
            let url = `${API_BASE_URL}/user/orders?`;
            if (phone) url += `phone=${encodeURIComponent(phone)}&`;
            if (email) url += `email=${encodeURIComponent(email)}`;
            const res = await fetch(url);
            return await res.json();
        } catch (error) {
            return { success: false, orders: [] };
        }
    }
};

window.API = API;
