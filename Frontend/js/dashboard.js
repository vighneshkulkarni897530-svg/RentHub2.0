/**
 * RentHub Shop Dashboard Controller (3-Card Format)
 */

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('renthub_shop_token');
    const shopDataRaw = localStorage.getItem('renthub_shop_data');

    // If not logged in, redirect to login page
    if (!token || !shopDataRaw) {
        window.location.href = 'index.html';
        return;
    }

    const currentShop = JSON.parse(shopDataRaw);

    // Categories State - Starts empty with NO pre-added categories (Owner adds custom categories)
    if (!localStorage.getItem('renthub_custom_categories_v2')) {
        localStorage.removeItem('renthub_categories');
        localStorage.setItem('renthub_custom_categories_v2', 'true');
    }

    let storeCategories = JSON.parse(localStorage.getItem('renthub_categories')) || [];
    let selectedCategory = 'All';

    // DOM Elements
    const hubViewWrapper = document.getElementById('hubViewWrapper');
    const hubShopTitleText = document.getElementById('hubShopTitleText');
    const topBrandShopName = document.getElementById('topBrandShopName');
    const hubTotalProductsTag = document.getElementById('hubTotalProductsTag');
    const hubActiveOrdersTag = document.getElementById('hubActiveOrdersTag');
    const hubLogoutBtn = document.getElementById('hubLogoutBtn');

    const productsContainer = document.getElementById('productsContainer');
    const ordersTableBody = document.getElementById('ordersTableBody');
    const productSearchInput = document.getElementById('productSearchInput');
    const orderStatusFilter = document.getElementById('orderStatusFilter');

    // Sidebar Category Elements
    const sidebarCategoryList = document.getElementById('sidebarCategoryList');
    const sidebarCatCount = document.getElementById('sidebarCatCount');
    const sidebarAddCategoryForm = document.getElementById('sidebarAddCategoryForm');
    const sidebarCatIcon = document.getElementById('sidebarCatIcon');
    const sidebarCatName = document.getElementById('sidebarCatName');
    const currentCategoryHeading = document.getElementById('currentCategoryHeading');
    const catalogFilteredCount = document.getElementById('catalogFilteredCount');

    // Add Product Modal
    const openAddProductModalBtn = document.getElementById('openAddProductModalBtn');
    const openAddProductModalBtnSecondary = document.getElementById('openAddProductModalBtnSecondary');
    const addProductModal = document.getElementById('addProductModal');
    const closeAddProductModal = document.getElementById('closeAddProductModal');
    const addProductForm = document.getElementById('addProductForm');
    const newProdCategory = document.getElementById('newProdCategory');

    // Category Modal (Kept for compatibility)
    const openCategoryModalBtn = document.getElementById('openCategoryModalBtn');
    const categoryModal = document.getElementById('categoryModal');
    const closeCategoryModal = document.getElementById('closeCategoryModal');
    const addCategoryForm = document.getElementById('addCategoryForm');
    const newCatName = document.getElementById('newCatName');
    const newCatIcon = document.getElementById('newCatIcon');
    const categoryManagerList = document.getElementById('categoryManagerList');

    // Set Shop Name in Title & Profile
    let activeShop = currentShop;

    function populateProfile(shop, stats = null) {
        if (!shop) return;
        const sName = shop.shop_name || 'Apex Gear & Electronics Hub';
        const oName = shop.owner_name || 'Shop Administrator';
        const sCity = shop.city || 'Bangalore';
        const sCat = shop.category || 'Electronics & Gadgets';
        const sId = shop.id || 1;

        if (hubShopTitleText) hubShopTitleText.textContent = sName;
        if (topBrandShopName) topBrandShopName.textContent = sName;

        // Hero card fields
        const profHeroShopName = document.getElementById('profHeroShopName');
        const profHeroOwnerName = document.getElementById('profHeroOwnerName');
        const profHeroCategory = document.getElementById('profHeroCategory');
        const profHeroStoreId = document.getElementById('profHeroStoreId');
        const profHeroCity = document.getElementById('profHeroCity');

        if (profHeroShopName) profHeroShopName.textContent = sName;
        if (profHeroOwnerName) profHeroOwnerName.textContent = oName;
        if (profHeroCategory) profHeroCategory.textContent = sCat;
        if (profHeroStoreId) profHeroStoreId.textContent = `STORE #RH-${String(sId).padStart(3, '0')}`;
        if (profHeroCity) profHeroCity.textContent = sCity;

        // Form fields
        const profOwnerName = document.getElementById('profOwnerName');
        const profShopName = document.getElementById('profShopName');
        const profEmail = document.getElementById('profEmail');
        const profPhone = document.getElementById('profPhone');
        const profCategory = document.getElementById('profCategory');
        const profGst = document.getElementById('profGst');
        const profAddress = document.getElementById('profAddress');
        const profCityInput = document.getElementById('profCity');

        if (profOwnerName) profOwnerName.value = oName;
        if (profShopName) profShopName.value = sName;
        if (profEmail) profEmail.value = shop.email || '';
        if (profPhone) profPhone.value = shop.phone || '';
        if (profCategory) profCategory.value = sCat;
        if (profGst) profGst.value = shop.gst_number || '';
        if (profAddress) profAddress.value = shop.address || '';
        if (profCityInput) profCityInput.value = sCity;

        // Update stats if provided
        if (stats) {
            const profHeroInventoryCount = document.getElementById('profHeroInventoryCount');
            const profHeroActiveCount = document.getElementById('profHeroActiveCount');
            if (profHeroInventoryCount) profHeroInventoryCount.textContent = stats.total_products || 0;
            if (profHeroActiveCount) profHeroActiveCount.textContent = stats.active_rentals || 0;
        }

        // Storefront URL box in Profile
        const profStorefrontUrl = document.getElementById('profStorefrontUrl');
        const profStorefrontAnchor = document.getElementById('profStorefrontAnchor');
        const publicStoreUrl = `${window.location.origin}/store.html?shop=${sId}`;
        if (profStorefrontUrl) profStorefrontUrl.value = publicStoreUrl;
        if (profStorefrontAnchor) profStorefrontAnchor.href = `store.html?shop=${sId}`;
    }

    // Initial Profile Populate
    populateProfile(activeShop);

    // Toast helper
    const toastMsg = document.getElementById('toastMsg');
    function showToast(msg, type = 'info') {
        toastMsg.textContent = msg;
        toastMsg.className = `toast-msg show ${type}`;
        setTimeout(() => { toastMsg.className = 'toast-msg'; }, 3500);
    }

    // Public Customer Storefront Link Initializer & Handlers (Grand Hub Banner)
    const publicStorefrontUrlInput = document.getElementById('publicStorefrontUrlInput');
    const openStorefrontAnchor = document.getElementById('openStorefrontAnchor');
    const shopId = activeShop.id || 1;
    const publicStoreUrl = `${window.location.origin}/store.html?shop=${shopId}`;
    if (publicStorefrontUrlInput) publicStorefrontUrlInput.value = publicStoreUrl;
    if (openStorefrontAnchor) openStorefrontAnchor.href = `store.html?shop=${shopId}`;

    window.copyStorefrontLink = () => {
        const url = publicStorefrontUrlInput ? publicStorefrontUrlInput.value : `${window.location.origin}/store.html?shop=${activeShop.id || 1}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast('Customer Storefront link copied to clipboard!', 'success');
            const copyBtnText = document.getElementById('copyBtnText');
            if (copyBtnText) {
                copyBtnText.textContent = 'Copied!';
                setTimeout(() => { copyBtnText.textContent = 'Copy Link'; }, 2500);
            }
        }).catch(() => {
            if (publicStorefrontUrlInput) {
                publicStorefrontUrlInput.select();
                document.execCommand('copy');
                showToast('Storefront link copied!', 'success');
            }
        });
    };

    window.copyProductLink = (productId) => {
        const url = `${window.location.origin}/store.html?shop=${activeShop.id || 1}&product=${productId}`;
        navigator.clipboard.writeText(url).then(() => {
            showToast('Direct Product link copied to clipboard!', 'success');
        }).catch(() => {
            showToast(`Product Link: ${url}`, 'info');
        });
    };

    // 1. Navigation Between 3-Card Hub and Expanded Modules
    window.openModule = (sectionId) => {
        hubViewWrapper.classList.add('hidden');
        document.querySelectorAll('.module-expanded-view').forEach(v => v.classList.remove('active'));
        
        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    window.backToHub = () => {
        document.querySelectorAll('.module-expanded-view').forEach(v => v.classList.remove('active'));
        hubViewWrapper.classList.remove('hidden');
        loadDashboardStats();
    };

    // 2. Fetch Stats & Refresh Hub & Profile Badges
    async function loadDashboardStats() {
        const res = await window.API.getProfile(token);
        if (res.success && res.shop) {
            activeShop = res.shop;
            localStorage.setItem('renthub_shop_data', JSON.stringify(res.shop));
            populateProfile(res.shop, res.stats);
        }
        if (res.success && res.stats) {
            if (hubTotalProductsTag) hubTotalProductsTag.textContent = `${res.stats.total_products} Items`;
            if (hubActiveOrdersTag) hubActiveOrdersTag.textContent = `${res.stats.active_rentals} Active`;
        }
    }

    // 3. Admin Profile Form Save Handler
    const adminProfileForm = document.getElementById('adminProfileForm');
    if (adminProfileForm) {
        adminProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const updatePayload = {
                owner_name: document.getElementById('profOwnerName').value.trim(),
                shop_name: document.getElementById('profShopName').value.trim(),
                email: document.getElementById('profEmail').value.trim(),
                phone: document.getElementById('profPhone').value.trim(),
                category: document.getElementById('profCategory').value.trim(),
                gst_number: document.getElementById('profGst').value.trim(),
                address: document.getElementById('profAddress').value.trim(),
                city: document.getElementById('profCity').value.trim()
            };

            const saveBtn = document.getElementById('saveProfileBtn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span>⏳ Saving...</span>';
            }

            const res = await window.API.updateProfile(token, updatePayload);
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<span>💾 Save Profile Changes</span>';
            }

            if (res.success && res.shop) {
                activeShop = res.shop;
                localStorage.setItem('renthub_shop_data', JSON.stringify(res.shop));
                populateProfile(res.shop);
                showToast('Admin & Store Profile updated successfully!', 'success');
            } else {
                showToast(res.message || 'Failed to update profile', 'error');
            }
        });
    }

    // 3. Category Management & Left Sidebar Logic
    function updateCategoryDropdowns() {
        const optionsHtml = storeCategories.length > 0 
            ? storeCategories.map(c => `<option value="${c.name}">${c.icon || '📦'} ${c.name}</option>`).join('')
            : `<option value="General">📦 General</option>`;

        if (newProdCategory) newProdCategory.innerHTML = optionsHtml;
        const editProdCategory = document.getElementById('editProdCategory');
        if (editProdCategory) editProdCategory.innerHTML = optionsHtml;
    }

    function renderSidebarCategories(allProducts = []) {
        if (!sidebarCategoryList) return;

        if (sidebarCatCount) {
            sidebarCatCount.textContent = `${storeCategories.length} Categories`;
        }

        const totalProducts = allProducts.length;

        let html = `
            <div class="cat-sidebar-item ${selectedCategory === 'All' ? 'active' : ''}" onclick="selectCategory('All')">
                <div class="cat-item-left">
                    <span class="cat-item-icon">🌟</span>
                    <span class="cat-item-name">All Rental Items</span>
                </div>
                <div class="cat-item-right">
                    <span class="cat-item-count">${totalProducts}</span>
                </div>
            </div>
        `;

        if (storeCategories.length === 0) {
            html += `
                <div style="padding: 16px 10px; text-align: center; color: #94a3b8; font-size: 12.5px; border-radius: 8px; border: 1px dashed #e2e8f0; margin-top: 10px; line-height: 1.4;">
                    No categories yet.<br>Add your custom categories above!
                </div>
            `;
        } else {
            html += storeCategories.map((cat, idx) => {
                const count = allProducts.filter(p => p.category === cat.name).length;
                const isSelected = selectedCategory === cat.name;

                return `
                    <div class="cat-sidebar-item ${isSelected ? 'active' : ''}" onclick="selectCategory('${cat.name}')">
                        <div class="cat-item-left">
                            <span class="cat-item-icon">${cat.icon || '📦'}</span>
                            <span class="cat-item-name" title="${cat.name}">${cat.name}</span>
                        </div>
                        <div class="cat-item-right">
                            <span class="cat-item-count">${count}</span>
                            <button class="btn-cat-del-sidebar" title="Delete category" onclick="deleteSidebarCategory(${idx}, event)">✕</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        sidebarCategoryList.innerHTML = html;
    }

    window.selectCategory = (catName) => {
        selectedCategory = catName;
        
        if (currentCategoryHeading) {
            if (catName === 'All') {
                currentCategoryHeading.textContent = 'All Rental Items';
            } else {
                const found = storeCategories.find(c => c.name === catName);
                currentCategoryHeading.textContent = `${found ? found.icon : '📦'} ${catName}`;
            }
        }

        loadProducts();
    };

    window.deleteSidebarCategory = (idx, e) => {
        if (e) e.stopPropagation();
        const cat = storeCategories[idx];
        if (confirm(`Delete category "${cat.name}"?`)) {
            storeCategories.splice(idx, 1);
            localStorage.setItem('renthub_categories', JSON.stringify(storeCategories));
            showToast(`Category "${cat.name}" removed`, 'info');
            
            if (selectedCategory === cat.name) {
                selectedCategory = 'All';
                if (currentCategoryHeading) currentCategoryHeading.textContent = 'All Rental Items';
            }
            
            updateCategoryDropdowns();
            loadProducts();
        }
    };

    // Sidebar Inline Add Category Form
    if (sidebarAddCategoryForm) {
        sidebarAddCategoryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = sidebarCatName.value.trim();
            const icon = sidebarCatIcon.value.trim() || '📦';

            if (!name) return;

            if (storeCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                showToast('This category already exists!', 'error');
                return;
            }

            storeCategories.push({ name, icon });
            localStorage.setItem('renthub_categories', JSON.stringify(storeCategories));

            showToast(`Category "${name}" added successfully!`, 'success');
            sidebarAddCategoryForm.reset();
            sidebarCatIcon.value = '📦';

            selectedCategory = name;
            if (currentCategoryHeading) currentCategoryHeading.textContent = `${icon} ${name}`;

            updateCategoryDropdowns();
            loadProducts();
        });
    }

    // Modal Add Category (if opened)
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = newCatName.value.trim();
            const icon = newCatIcon.value.trim() || '📦';

            if (!name) return;

            if (storeCategories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                showToast('Category already exists!', 'error');
                return;
            }

            storeCategories.push({ name, icon });
            localStorage.setItem('renthub_categories', JSON.stringify(storeCategories));
            
            showToast(`Category "${name}" added!`, 'success');
            addCategoryForm.reset();
            newCatIcon.value = '📦';
            
            updateCategoryDropdowns();
            loadProducts();
            if (categoryModal) categoryModal.classList.remove('active');
        });
    }

    // 4. Load Products
    async function loadProducts() {
        const search = productSearchInput ? productSearchInput.value.trim() : '';

        productsContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px;">Loading inventory...</div>`;

        // Fetch all products first to calculate sidebar category counts accurately
        const allRes = await window.API.getProducts(token, 'All', '');
        const allProducts = (allRes.success && allRes.products) ? allRes.products : [];
        renderSidebarCategories(allProducts);

        // Now fetch filtered products for display
        const res = await window.API.getProducts(token, selectedCategory, search);
        const filteredProducts = (res.success && res.products) ? res.products : [];

        if (catalogFilteredCount) {
            catalogFilteredCount.textContent = `${filteredProducts.length} item${filteredProducts.length === 1 ? '' : 's'}`;
        }

        if (filteredProducts.length > 0) {
            productsContainer.innerHTML = filteredProducts.map(p => {
                const mediaList = Array.isArray(p.media) ? p.media : (p.image_url ? [{ type: 'image', url: p.image_url }] : []);
                const hasVideo = mediaList.some(m => m.type === 'video');
                const photoCount = mediaList.filter(m => m.type === 'image').length;
                const primaryMedia = mediaList.find(m => m.is_primary) || mediaList[0] || { type: 'image', url: p.image_url };

                return `
                <div class="product-item-card">
                    <div style="position: relative; width: 100%; aspect-ratio: 16/10; overflow: hidden; background: #0f172a; border-radius: 12px 12px 0 0;">
                        ${primaryMedia.type === 'video' ? `
                            <video src="${primaryMedia.url}" style="width: 100%; height: 100%; object-fit: cover;" muted></video>
                            <div class="media-video-icon-overlay" style="width: 38px; height: 38px; font-size: 16px;">▶</div>
                        ` : `
                            <img src="${p.image_url}" alt="${p.name}" class="product-thumb" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'">
                        `}
                        ${mediaList.length > 1 ? `
                            <span class="card-media-count-badge">
                                ${hasVideo ? '🎬 Video +' : '📷'} ${photoCount}
                            </span>
                        ` : hasVideo ? `
                            <span class="card-media-count-badge">🎬 Video</span>
                        ` : ''}
                    </div>
                    <div class="product-body">
                        <div>
                            <span class="product-category-tag">${p.category}</span>
                            <h3 class="product-name">${p.name}</h3>
                        </div>
                        <div>
                            <div class="product-price-row">
                                <div>
                                    <span class="price">₹${p.rent_price_per_day}</span>
                                    <span style="font-size: 12px; color: #94a3b8;">/ day</span>
                                </div>
                                <span class="stock-badge ${p.available_stock > 0 ? 'stock-in' : 'stock-low'}">
                                    ${p.available_stock} of ${p.total_stock} Available
                                </span>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-top: 10px;">
                                <button class="btn-edit-prod" onclick='openEditProduct(${JSON.stringify(p).replace(/'/g, "&apos;")})'>✏️ Edit</button>
                                <button class="btn-share-prod" onclick="copyProductLink(${p.id})">🔗 Share</button>
                                <button class="btn-delete-prod" onclick="deleteItem(${p.id})">Remove</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        } else {
            productsContainer.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1;">
                    <p style="font-size: 16px; font-weight: 700; color: #0f172a;">No rental products in this category.</p>
                    <p style="font-size: 13px; margin-top: 6px; color: #64748b;">Click <b>+ Add Rental Item</b> above or add a product to get started.</p>
                </div>
            `;
        }
    }

    // 5. Load Orders
    async function loadOrders() {
        const status = orderStatusFilter ? orderStatusFilter.value : 'All';
        const res = await window.API.getOrders(token, status);

        if (res.success && res.orders.length > 0) {
            ordersTableBody.innerHTML = res.orders.map(o => `
                <tr>
                    <td><b>#${o.id}</b></td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <img src="${o.product_image}" style="width: 36px; height: 36px; border-radius: 6px; object-fit: cover;">
                            <div>
                                <div style="font-weight: 700; color: #fff;">${o.product_name}</div>
                                <div style="font-size: 11px; color: #94a3b8;">${o.product_category}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="font-weight: 600; color: #fff;">${o.customer_name}</div>
                        <div style="font-size: 11px; color: #94a3b8;">📞 ${o.customer_phone}</div>
                    </td>
                    <td>
                        <div>${o.start_date} → ${o.end_date}</div>
                        <div style="font-size: 11px; color: #94a3b8;">${o.total_days} days (${o.delivery_type})</div>
                    </td>
                    <td>
                        <div style="font-weight: 800; color: #ffd166;">₹${o.total_amount}</div>
                        <div style="font-size: 11px; color: #34d399;">Deposit: ₹${o.deposit_amount}</div>
                    </td>
                    <td>
                        <span class="status-pill status-${o.status}">${o.status}</span>
                    </td>
                    <td>
                        ${o.status === 'Pending' ? `
                            <button class="btn-action-small" onclick="updateStatus(${o.id}, 'Active')">Approve</button>
                        ` : o.status === 'Active' ? `
                            <button class="btn-action-small" onclick="updateStatus(${o.id}, 'Returned')">Mark Returned</button>
                        ` : `<span style="color: #94a3b8; font-size: 12px;">Completed</span>`}
                    </td>
                </tr>
            `).join('');
        } else {
            ordersTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 24px;">No rental orders found.</td></tr>`;
        }
    }

    // 6. Global Actions
    window.deleteItem = async (id) => {
        if (confirm('Are you sure you want to remove this product from your rental inventory?')) {
            const res = await window.API.deleteProduct(token, id);
            if (res.success) {
                showToast('Product removed from inventory', 'success');
                loadProducts();
                loadDashboardStats();
            } else {
                showToast(res.message || 'Failed to delete', 'error');
            }
        }
    };

    window.updateStatus = async (orderId, newStatus) => {
        const res = await window.API.updateOrderStatus(token, orderId, newStatus);
        if (res.success) {
            showToast(`Order status updated to ${newStatus}`, 'success');
            loadOrders();
            loadDashboardStats();
        }
    };

    // Filter listeners
    if (productSearchInput) {
        productSearchInput.addEventListener('input', () => {
            clearTimeout(window.searchTimer);
            window.searchTimer = setTimeout(loadProducts, 300);
        });
    }
    if (orderStatusFilter) orderStatusFilter.addEventListener('change', loadOrders);

    // Modal Handlers
    // =======================================================
    // MULTI-IMAGE & MULTI-VIDEO PRODUCT MEDIA MANAGER
    // =======================================================
    let currentAttachedMedia = [];

    const mediaDropzone = document.getElementById('mediaDropzone');
    const mediaFileInput = document.getElementById('mediaFileInput');
    const mediaPreviewGrid = document.getElementById('mediaPreviewGrid');
    const mediaCountBadge = document.getElementById('mediaCountBadge');

    function updateMediaUI() {
        if (!mediaPreviewGrid || !mediaCountBadge) return;

        const photoCount = currentAttachedMedia.filter(m => m.type === 'image').length;
        const videoCount = currentAttachedMedia.filter(m => m.type === 'video').length;
        const total = currentAttachedMedia.length;

        if (total === 0) {
            mediaCountBadge.textContent = '0 Added';
            mediaPreviewGrid.style.display = 'none';
            mediaPreviewGrid.innerHTML = '';
            return;
        }

        mediaCountBadge.textContent = `${total} Attached (${photoCount} 📷, ${videoCount} 🎬)`;
        mediaPreviewGrid.style.display = 'grid';

        mediaPreviewGrid.innerHTML = currentAttachedMedia.map((m, idx) => `
            <div class="media-preview-card ${idx === 0 ? 'is-cover' : ''}">
                ${m.type === 'image' ? `
                    <img src="${m.url}" alt="Preview" class="media-preview-thumb" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'">
                ` : `
                    <div class="media-video-container">
                        <video src="${m.url}" preload="metadata" muted></video>
                        <div class="media-video-icon-overlay">▶</div>
                    </div>
                `}
                <span class="media-card-badge ${idx === 0 ? 'cover-badge' : ''}">
                    ${idx === 0 ? '⭐ Cover' : m.type === 'video' ? '🎬 Video' : 'Photo'}
                </span>
                <button type="button" class="btn-remove-media-item" onclick="removeAttachedMedia(${idx})" title="Remove">✕</button>
            </div>
        `).join('');
    }

    window.removeAttachedMedia = (index) => {
        currentAttachedMedia.splice(index, 1);
        updateMediaUI();
    };

    // File Drop & Select Handlers
    if (mediaDropzone && mediaFileInput) {
        mediaDropzone.addEventListener('click', () => mediaFileInput.click());

        mediaDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            mediaDropzone.classList.add('drag-over');
        });

        mediaDropzone.addEventListener('dragleave', () => {
            mediaDropzone.classList.remove('drag-over');
        });

        mediaDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            mediaDropzone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processMediaFiles(e.dataTransfer.files);
            }
        });

        mediaFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                processMediaFiles(e.target.files);
            }
        });
    }

    function compressImage(file, maxDimension = 1200, quality = 0.82) {
        return new Promise((resolve) => {
            if (!file.type.startsWith('image/')) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        } else {
                            width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const compressed = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressed);
                };
                img.onerror = () => resolve(e.target.result);
                img.src = e.target.result;
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
        });
    }

    async function processMediaFiles(files) {
        const fileList = Array.from(files);
        for (const file of fileList) {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');

            if (!isImage && !isVideo) {
                showToast(`Skipped non-media file: ${file.name}`, 'error');
                continue;
            }

            if (isVideo) {
                if (file.size > 15 * 1024 * 1024) {
                    showToast(`Video ${file.name} is larger than 15MB. Please choose a smaller video.`, 'error');
                    continue;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    currentAttachedMedia.push({
                        type: 'video',
                        url: event.target.result,
                        is_primary: currentAttachedMedia.length === 0
                    });
                    updateMediaUI();
                };
                reader.readAsDataURL(file);
            } else if (isImage) {
                const compressedUrl = await compressImage(file);
                if (compressedUrl) {
                    currentAttachedMedia.push({
                        type: 'image',
                        url: compressedUrl,
                        is_primary: currentAttachedMedia.length === 0
                    });
                    updateMediaUI();
                }
            }
        }
    }

    // Modal Handlers
    if (openAddProductModalBtn) {
        openAddProductModalBtn.addEventListener('click', () => {
            currentAttachedMedia = [];
            updateMediaUI();
            updateCategoryDropdowns();
            addProductModal.classList.add('active');
        });
    }

    if (openAddProductModalBtnSecondary) {
        openAddProductModalBtnSecondary.addEventListener('click', () => {
            currentAttachedMedia = [];
            updateMediaUI();
            updateCategoryDropdowns();
            addProductModal.classList.add('active');
        });
    }

    if (closeAddProductModal) {
        closeAddProductModal.addEventListener('click', () => {
            addProductModal.classList.remove('active');
        });
    }

    if (addProductModal) {
        addProductModal.addEventListener('click', (e) => {
            if (e.target === addProductModal) addProductModal.classList.remove('active');
        });
    }

    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nameInput = document.getElementById('newProdName');
            const catSelect = document.getElementById('newProdCategory');
            const priceInput = document.getElementById('newProdPriceDay');
            const depositInput = document.getElementById('newProdDeposit');
            const stockInput = document.getElementById('newProdStock');
            const descInput = document.getElementById('newProdDesc');

            const nameVal = nameInput ? nameInput.value.trim() : '';
            const catVal = (catSelect && catSelect.value) ? catSelect.value : 'General';
            const priceVal = priceInput ? parseFloat(priceInput.value) : 0;
            const depositVal = depositInput ? parseFloat(depositInput.value) || 0 : 0;
            const stockVal = stockInput ? parseInt(stockInput.value) || 1 : 1;
            const descVal = descInput ? descInput.value.trim() : '';

            if (!nameVal) {
                showToast('Please enter a Product Name', 'error');
                if (nameInput) {
                    nameInput.focus();
                    nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            if (!priceVal || priceVal <= 0) {
                showToast('Please enter a valid Daily Rental Price (₹)', 'error');
                if (priceInput) {
                    priceInput.focus();
                    priceInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            // Default fallback if no media attached
            let primaryImg = '';
            if (currentAttachedMedia.length > 0) {
                const primary = currentAttachedMedia.find(m => m.is_primary) || currentAttachedMedia[0];
                primaryImg = primary.url;
            } else {
                primaryImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
                currentAttachedMedia.push({ type: 'image', url: primaryImg, is_primary: true });
            }

            const newProd = {
                name: nameVal,
                category: catVal,
                rent_price_per_day: priceVal,
                deposit_amount: depositVal,
                total_stock: stockVal,
                image_url: primaryImg,
                media: currentAttachedMedia,
                description: descVal
            };

            const submitBtn = addProductForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>⏳ Publishing Item...</span>';
            }

            try {
                const res = await window.API.addProduct(token, newProd);

                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>✨ Publish Item to Rental Inventory &rarr;</span>';
                }

                if (res && res.success) {
                    showToast('🎉 New rental product published to inventory & storefront!', 'success');
                    addProductModal.classList.remove('active');
                    addProductForm.reset();
                    currentAttachedMedia = [];
                    updateMediaUI();
                    loadProducts();
                    loadDashboardStats();
                } else {
                    showToast(res && res.message ? res.message : 'Failed to add product', 'error');
                }
            } catch (err) {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>✨ Publish Item to Rental Inventory &rarr;</span>';
                }
                showToast('Error saving product: ' + err.message, 'error');
            }
        });
    }

    // =======================================================
    // EDIT PRODUCT LOGIC
    // =======================================================
    let currentEditMedia = [];
    const editProductModal = document.getElementById('editProductModal');
    const closeEditProductModal = document.getElementById('closeEditProductModal');
    const editProductForm = document.getElementById('editProductForm');
    const editMediaDropzone = document.getElementById('editMediaDropzone');
    const editMediaFileInput = document.getElementById('editMediaFileInput');
    const editMediaPreviewGrid = document.getElementById('editMediaPreviewGrid');
    const editMediaCountBadge = document.getElementById('editMediaCountBadge');

    function updateEditMediaUI() {
        if (!editMediaPreviewGrid || !editMediaCountBadge) return;

        const photoCount = currentEditMedia.filter(m => m.type === 'image').length;
        const videoCount = currentEditMedia.filter(m => m.type === 'video').length;
        const total = currentEditMedia.length;

        if (total === 0) {
            editMediaCountBadge.textContent = '0 Added';
            editMediaPreviewGrid.style.display = 'none';
            editMediaPreviewGrid.innerHTML = '';
            return;
        }

        editMediaCountBadge.textContent = `${total} Attached (${photoCount} 📷, ${videoCount} 🎬)`;
        editMediaPreviewGrid.style.display = 'grid';

        editMediaPreviewGrid.innerHTML = currentEditMedia.map((m, idx) => `
            <div class="media-preview-card ${idx === 0 ? 'is-cover' : ''}">
                ${m.type === 'image' ? `
                    <img src="${m.url}" alt="Preview" class="media-preview-thumb" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'">
                ` : `
                    <div class="media-video-container">
                        <video src="${m.url}" preload="metadata" muted></video>
                        <div class="media-video-icon-overlay">▶</div>
                    </div>
                `}
                <span class="media-card-badge ${idx === 0 ? 'cover-badge' : ''}">
                    ${idx === 0 ? '⭐ Cover' : m.type === 'video' ? '🎬 Video' : 'Photo'}
                </span>
                <button type="button" class="btn-remove-media-item" onclick="removeEditMedia(${idx})" title="Remove">✕</button>
            </div>
        `).join('');
    }

    window.removeEditMedia = (index) => {
        currentEditMedia.splice(index, 1);
        updateEditMediaUI();
    };

    if (editMediaDropzone && editMediaFileInput) {
        editMediaDropzone.addEventListener('click', () => editMediaFileInput.click());

        editMediaDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            editMediaDropzone.classList.add('drag-over');
        });

        editMediaDropzone.addEventListener('dragleave', () => {
            editMediaDropzone.classList.remove('drag-over');
        });

        editMediaDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            editMediaDropzone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processEditMediaFiles(e.dataTransfer.files);
            }
        });

        editMediaFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                processEditMediaFiles(e.target.files);
            }
        });
    }

    async function processEditMediaFiles(files) {
        const fileList = Array.from(files);
        for (const file of fileList) {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');

            if (!isImage && !isVideo) {
                showToast(`Skipped non-media file: ${file.name}`, 'error');
                continue;
            }

            if (isVideo) {
                if (file.size > 15 * 1024 * 1024) {
                    showToast(`Video ${file.name} is larger than 15MB. Please choose a smaller video.`, 'error');
                    continue;
                }
                const reader = new FileReader();
                reader.onload = (event) => {
                    currentEditMedia.push({
                        type: 'video',
                        url: event.target.result,
                        is_primary: currentEditMedia.length === 0
                    });
                    updateEditMediaUI();
                };
                reader.readAsDataURL(file);
            } else if (isImage) {
                const compressedUrl = await compressImage(file);
                if (compressedUrl) {
                    currentEditMedia.push({
                        type: 'image',
                        url: compressedUrl,
                        is_primary: currentEditMedia.length === 0
                    });
                    updateEditMediaUI();
                }
            }
        }
    }

    window.openEditProduct = (prod) => {
        updateCategoryDropdowns();
        
        document.getElementById('editProdId').value = prod.id;
        document.getElementById('editProdName').value = prod.name || '';
        document.getElementById('editProdCategory').value = prod.category || 'General';
        document.getElementById('editProdPriceDay').value = prod.rent_price_per_day || '';
        document.getElementById('editProdDeposit').value = prod.deposit_amount || 0;
        document.getElementById('editProdStock').value = prod.total_stock || 1;
        document.getElementById('editProdAvailableStock').value = prod.available_stock !== undefined ? prod.available_stock : prod.total_stock || 1;
        document.getElementById('editProdDesc').value = prod.description || '';

        // Media
        if (Array.isArray(prod.media) && prod.media.length > 0) {
            currentEditMedia = JSON.parse(JSON.stringify(prod.media));
        } else if (prod.image_url) {
            currentEditMedia = [{ type: 'image', url: prod.image_url, is_primary: true }];
        } else {
            currentEditMedia = [];
        }

        updateEditMediaUI();
        if (editProductModal) editProductModal.classList.add('active');
    };

    if (closeEditProductModal) {
        closeEditProductModal.addEventListener('click', () => {
            if (editProductModal) editProductModal.classList.remove('active');
        });
    }

    if (editProductModal) {
        editProductModal.addEventListener('click', (e) => {
            if (e.target === editProductModal) editProductModal.classList.remove('active');
        });
    }

    if (editProductForm) {
        editProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const prodId = document.getElementById('editProdId').value;
            const nameInput = document.getElementById('editProdName');
            const catSelect = document.getElementById('editProdCategory');
            const priceInput = document.getElementById('editProdPriceDay');
            const depositInput = document.getElementById('editProdDeposit');
            const stockInput = document.getElementById('editProdStock');
            const availInput = document.getElementById('editProdAvailableStock');
            const descInput = document.getElementById('editProdDesc');

            const nameVal = nameInput ? nameInput.value.trim() : '';
            const catVal = (catSelect && catSelect.value) ? catSelect.value : 'General';
            const priceVal = priceInput ? parseFloat(priceInput.value) : 0;
            const depositVal = depositInput ? parseFloat(depositInput.value) || 0 : 0;
            const stockVal = stockInput ? parseInt(stockInput.value) || 1 : 1;
            const availVal = availInput ? parseInt(availInput.value) : stockVal;
            const descVal = descInput ? descInput.value.trim() : '';

            if (!nameVal) {
                showToast('Please enter a Product Name', 'error');
                if (nameInput) {
                    nameInput.focus();
                    nameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            if (!priceVal || priceVal <= 0) {
                showToast('Please enter a valid Daily Rental Price (₹)', 'error');
                if (priceInput) {
                    priceInput.focus();
                    priceInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            let primaryImg = '';
            if (currentEditMedia.length > 0) {
                const primary = currentEditMedia.find(m => m.is_primary) || currentEditMedia[0];
                primaryImg = primary.url;
            } else {
                primaryImg = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
                currentEditMedia.push({ type: 'image', url: primaryImg, is_primary: true });
            }

            const updatePayload = {
                name: nameVal,
                category: catVal,
                rent_price_per_day: priceVal,
                deposit_amount: depositVal,
                total_stock: stockVal,
                available_stock: availVal,
                image_url: primaryImg,
                media: currentEditMedia,
                description: descVal
            };

            const submitBtn = editProductForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span>⏳ Saving Changes...</span>';
            }

            try {
                const res = await window.API.updateProduct(token, prodId, updatePayload);

                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>💾 Save & Update Rental Item &rarr;</span>';
                }

                if (res && res.success) {
                    showToast('Rental item updated successfully!', 'success');
                    if (editProductModal) editProductModal.classList.remove('active');
                    loadProducts();
                    loadDashboardStats();
                } else {
                    showToast(res && res.message ? res.message : 'Failed to update product', 'error');
                }
            } catch (err) {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span>💾 Save & Update Rental Item &rarr;</span>';
                }
                showToast('Error updating product: ' + err.message, 'error');
            }
        });
    }

    // Hub Logout
    if (hubLogoutBtn) {
        hubLogoutBtn.addEventListener('click', () => {
            if (confirm('Log out from RentHub Shop Portal?')) {
                localStorage.removeItem('renthub_shop_token');
                localStorage.removeItem('renthub_shop_data');
                window.location.href = 'index.html';
            }
        });
    }

    // Initial Load
    updateCategoryDropdowns();
    loadDashboardStats();
    loadProducts();
    loadOrders();
});
