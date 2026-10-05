/**
 * RentHub Shop Portal Login & Registration Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const shopLoginForm = document.getElementById('shopLoginForm');
    const identifierInput = document.getElementById('identifierInput');
    const passwordInput = document.getElementById('passwordInput');
    const togglePasswordBtn = document.getElementById('togglePasswordBtn');
    const eyeIcon = document.getElementById('eyeIcon');
    const rememberMeCheckbox = document.getElementById('rememberMeCheckbox');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const fillDemoBtn = document.getElementById('fillDemoBtn');
    const googleLoginBtn = document.getElementById('googleLoginBtn');
    const forgotPassBtn = document.getElementById('forgotPassBtn');
    const helpBtn = document.getElementById('helpBtn');

    // Registration Modal Elements
    const registerModal = document.getElementById('registerModal');
    const openRegisterModalBtn = document.getElementById('openRegisterModalBtn');
    const closeRegisterModal = document.getElementById('closeRegisterModal');
    const shopRegisterForm = document.getElementById('shopRegisterForm');

    // Toast element
    const toastMsg = document.getElementById('toastMsg');

    function showToast(message, type = 'info') {
        toastMsg.textContent = message;
        toastMsg.className = `toast-msg show ${type}`;
        setTimeout(() => {
            toastMsg.className = 'toast-msg';
        }, 4000);
    }

    // Auto load saved identifier if Remember Me was used
    const savedIdentifier = localStorage.getItem('renthub_saved_identifier');
    if (savedIdentifier) {
        identifierInput.value = savedIdentifier;
    }

    // 1. Password Visibility Toggle
    togglePasswordBtn.addEventListener('click', () => {
        const isPassword = passwordInput.getAttribute('type') === 'password';
        passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
        
        if (isPassword) {
            // Crossed eye icon
            eyeIcon.innerHTML = `
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            `;
        } else {
            // Normal eye icon
            eyeIcon.innerHTML = `
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
            `;
        }
    });

    // 2. Auto Fill Demo Credentials
    fillDemoBtn.addEventListener('click', () => {
        identifierInput.value = 'shop@renthub.com';
        passwordInput.value = 'shop123';
        showToast('Demo shop credentials filled!', 'info');
    });

    // 3. Handle Shop Login Submission
    shopLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const identifier = identifierInput.value.trim();
        const password = passwordInput.value.trim();

        if (!identifier || !password) {
            showToast('Please enter your Shop Email/Phone and Password.', 'error');
            return;
        }

        // Set Loading State
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.innerHTML = `<span>Signing in...</span>`;

        try {
            const response = await window.API.login(identifier, password);

            if (response.success) {
                showToast(`Login successful! Welcome ${response.shop.shop_name}`, 'success');

                // Store JWT token & Shop Session
                localStorage.setItem('renthub_shop_token', response.token);
                localStorage.setItem('renthub_shop_data', JSON.stringify(response.shop));

                if (rememberMeCheckbox.checked) {
                    localStorage.setItem('renthub_saved_identifier', identifier);
                } else {
                    localStorage.removeItem('renthub_saved_identifier');
                }

                // Redirect to Shop Dashboard after 800ms
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 800);

            } else {
                showToast(response.message || 'Invalid shop credentials.', 'error');
                loginSubmitBtn.disabled = false;
                loginSubmitBtn.innerHTML = `<span>Login</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
            }
        } catch (err) {
            showToast('Error connecting to backend server.', 'error');
            loginSubmitBtn.disabled = false;
            loginSubmitBtn.innerHTML = `<span>Login</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;
        }
    });

    // 4. Google Login Mock
    googleLoginBtn.addEventListener('click', () => {
        identifierInput.value = 'shop@renthub.com';
        passwordInput.value = 'shop123';
        showToast('Google Partner Account linked! Logging in...', 'info');
        setTimeout(() => {
            shopLoginForm.dispatchEvent(new Event('submit'));
        }, 500);
    });

    // 5. Help / Forgot Password Handlers
    helpBtn.addEventListener('click', (e) => {
        e.preventDefault();
        alert("📞 RentHub Shop Partner Support:\n\nEmail: partner-support@renthub.com\nHelpline: +1 (800) 555-RENT (Mon-Sat 9AM-8PM)");
    });

    forgotPassBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const email = prompt("Enter your registered Shop Email to receive a password reset link:", identifierInput.value || "shop@renthub.com");
        if (email) {
            showToast(`Password reset link dispatched to ${email}`, 'success');
        }
    });

    // 6. Shop Registration Modal
    openRegisterModalBtn.addEventListener('click', (e) => {
        e.preventDefault();
        registerModal.classList.add('active');
    });

    closeRegisterModal.addEventListener('click', () => {
        registerModal.classList.remove('active');
    });

    registerModal.addEventListener('click', (e) => {
        if (e.target === registerModal) {
            registerModal.classList.remove('active');
        }
    });

    shopRegisterForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newShopData = {
            shop_name: document.getElementById('regShopName').value.trim(),
            owner_name: document.getElementById('regOwnerName').value.trim(),
            category: document.getElementById('regCategory').value,
            email: document.getElementById('regEmail').value.trim(),
            phone: document.getElementById('regPhone').value.trim(),
            address: document.getElementById('regAddress').value.trim(),
            password: document.getElementById('regPassword').value
        };

        try {
            const res = await window.API.register(newShopData);
            if (res.success) {
                showToast('Shop registered successfully! Logging you in...', 'success');
                localStorage.setItem('renthub_shop_token', res.token);
                localStorage.setItem('renthub_shop_data', JSON.stringify(res.shop));
                registerModal.classList.remove('active');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                showToast(res.message || 'Registration failed', 'error');
            }
        } catch (err) {
            showToast('Registration error: ' + err.message, 'error');
        }
    });
});
