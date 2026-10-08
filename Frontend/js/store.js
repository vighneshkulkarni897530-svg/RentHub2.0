/**
 * RentHub Public Customer Storefront & Booking Controller
 */

document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http'))
        ? `${window.location.origin}/api/public`
        : 'http://localhost:7000/api/public';
    
    // Get shopId from URL query param (?shop=1 or default 1)
    const urlParams = new URLSearchParams(window.location.search);
    const shopId = urlParams.get('shop') || 1;
    const highlightProductId = urlParams.get('product');

    let currentShop = null;
    let allProducts = [];
    let selectedCategory = 'All';
    let activeProductForBooking = null;

    // DOM Elements
    const storeShopName = document.getElementById('storeShopName');
    const storeShopAddress = document.getElementById('storeShopAddress');
    const storeShopRating = document.getElementById('storeShopRating');
    const storeProductGrid = document.getElementById('storeProductGrid');
    const storeCategoryPills = document.getElementById('storeCategoryPills');
    const storeProductCount = document.getElementById('storeProductCount');
    const storeSearchInput = document.getElementById('storeSearchInput');
    const storeCatalogTitle = document.getElementById('storeCatalogTitle');

    // Booking Modal Elements
    const bookingModal = document.getElementById('bookingModal');
    const closeBookingModal = document.getElementById('closeBookingModal');
    const customerBookingForm = document.getElementById('customerBookingForm');
    const bookingProductId = document.getElementById('bookingProductId');
    const custStartDate = document.getElementById('custStartDate');
    const custEndDate = document.getElementById('custEndDate');
    const calcDuration = document.getElementById('calcDuration');
    const calcRentAmount = document.getElementById('calcRentAmount');
    const calcDeposit = document.getElementById('calcDeposit');
    const calcTotalPayable = document.getElementById('calcTotalPayable');
    const bookingSuccessBox = document.getElementById('bookingSuccessBox');
    const submitBookingBtn = document.getElementById('submitBookingBtn');

    // Cart State & Elements
    let cartItems = JSON.parse(localStorage.getItem('renthub_cart_items')) || [];
    const cartNavCount = document.getElementById('cartNavCount');
    const cartModal = document.getElementById('cartModal');
    const cartModalBody = document.getElementById('cartModalBody');
    const cartItemCountSub = document.getElementById('cartItemCountSub');
    const storeToast = document.getElementById('storeToast');

    // Detail Modal Elements
    const productDetailModal = document.getElementById('productDetailModal');
    const detailCatBadge = document.getElementById('detailCatBadge');
    const detailModalTitle = document.getElementById('detailModalTitle');
    const detailMainImg = document.getElementById('detailMainImg');
    const detailVideoContainer = document.getElementById('detailVideoContainer');
    const detailMainVideo = document.getElementById('detailMainVideo');
    const galleryAngleCounter = document.getElementById('galleryAngleCounter');
    const detailThumbStrip = document.getElementById('detailThumbStrip');
    const detailStockBadgeContainer = document.getElementById('detailStockBadgeContainer');
    const detailPricePerDay = document.getElementById('detailPricePerDay');
    const detailDepositAmount = document.getElementById('detailDepositAmount');
    const detailStockUnits = document.getElementById('detailStockUnits');
    const detailDescriptionText = document.getElementById('detailDescriptionText');
    const detailActionButtons = document.getElementById('detailActionButtons');

    let activeDetailProduct = null;
    let activeDetailVariant = null;
    let detailMediaList = [];
    let currentDetailMediaIdx = 0;

    // Track currently active selected variant on each catalog card
    const cardActiveVariantMap = {};

    // Helper: Safely get product variants array
    function getProductVariants(prod) {
        if (Array.isArray(prod.variants) && prod.variants.length > 0) {
            return prod.variants;
        }
        const mediaArray = Array.isArray(prod.media) && prod.media.length > 0 ? prod.media : (prod.image_url ? [{ type: 'image', url: prod.image_url, is_primary: true }] : []);
        return [{
            id: 'var_' + (prod.id || 'std') + '_1',
            product_id: prod.id,
            color_name: 'Standard',
            color_code: '#111827',
            rent_price_per_day: parseFloat(prod.rent_price_per_day) || 0,
            deposit_amount: parseFloat(prod.deposit_amount) || 0,
            total_stock: parseInt(prod.total_stock) || 1,
            available_stock: parseInt(prod.available_stock !== undefined ? prod.available_stock : (prod.total_stock || 1)),
            media: mediaArray,
            specifications: prod.description || ''
        }];
    }

    // Helper: Get active variant for a product card
    function getActiveCardVariant(prod) {
        const variants = getProductVariants(prod);
        const selectedId = cardActiveVariantMap[prod.id];
        if (selectedId) {
            const found = variants.find(v => v.id === selectedId);
            if (found) return found;
        }
        return variants[0];
    }

    // Helper: Normalize cart items against allProducts catalog
    function getNormalizedCartItems() {
        return cartItems.map(item => {
            const itemId = typeof item === 'object' ? item.id : item;
            const matched = allProducts.find(p => p.id == itemId);
            const days = (typeof item === 'object' && item.days) ? item.days : 1;
            const variantId = typeof item === 'object' ? item.variant_id : null;
            
            if (matched) {
                const variants = getProductVariants(matched);
                const matchedVar = variantId ? (variants.find(v => v.id === variantId) || variants[0]) : variants[0];
                const vPrice = matchedVar ? parseFloat(matchedVar.rent_price_per_day) : (parseFloat(matched.rent_price_per_day) || 0);
                const vDeposit = matchedVar && matchedVar.deposit_amount !== undefined ? parseFloat(matchedVar.deposit_amount) : (parseFloat(matched.deposit_amount) || 0);
                const vMedia = (matchedVar && Array.isArray(matchedVar.media) && matchedVar.media[0]) ? matchedVar.media[0].url : (matched.image_url || '');

                return {
                    cart_item_id: (typeof item === 'object' && item.cart_item_id) ? item.cart_item_id : `${matched.id}_${matchedVar ? matchedVar.id : 'std'}`,
                    id: matched.id,
                    variant_id: matchedVar ? matchedVar.id : null,
                    variant_color: matchedVar ? matchedVar.color_name : null,
                    variant_color_code: matchedVar ? matchedVar.color_code : null,
                    name: matched.name,
                    category: matched.category,
                    rent_price_per_day: vPrice,
                    deposit_amount: vDeposit,
                    image_url: vMedia,
                    available_stock: matchedVar ? (matchedVar.available_stock !== undefined ? matchedVar.available_stock : matchedVar.total_stock) : matched.available_stock,
                    total_stock: matchedVar ? matchedVar.total_stock : matched.total_stock,
                    days: Math.max(1, days)
                };
            }
            return typeof item === 'object' ? {
                ...item,
                cart_item_id: item.cart_item_id || `${item.id}_${item.variant_id || 'std'}`,
                rent_price_per_day: parseFloat(item.rent_price_per_day) || 0,
                deposit_amount: parseFloat(item.deposit_amount) || 0,
                days: Math.max(1, item.days || 1)
            } : { cart_item_id: `${item}_std`, id: item, days: 1, name: 'Rental Item', rent_price_per_day: 0, deposit_amount: 0, image_url: '' };
        });
    }

    // =======================================================
    // 1. Fetch Store Data & Products
    // =======================================================
    async function loadStoreData() {
        try {
            if (storeProductGrid) {
                storeProductGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 40px;">Loading catalog...</div>`;
            }

            const res = await fetch(`${API_BASE}/store/${shopId}`);
            const data = await res.json();

            if (data.success && data.shop) {
                currentShop = data.shop;
                allProducts = data.products || [];

                // Normalize cart with fetched products
                cartItems = getNormalizedCartItems();
                localStorage.setItem('renthub_cart_items', JSON.stringify(cartItems));

                // Set shop header info
                document.title = `${currentShop.shop_name} - RentHub Storefront`;
                if (storeShopName) storeShopName.textContent = currentShop.shop_name;
                if (storeShopAddress) storeShopAddress.textContent = `${currentShop.address || ''}, ${currentShop.city || ''}`;
                if (storeShopRating) storeShopRating.textContent = `${currentShop.rating || 4.9} ★ Verified Store`;

                // Render category pills & products
                renderCategoryPills();
                renderProducts();
                updateCartBadge();

                // If a specific product was linked in URL, open its booking directly
                if (highlightProductId) {
                    const targetProd = allProducts.find(p => p.id == highlightProductId);
                    if (targetProd) openBookingModal(targetProd);
                }
            } else {
                if (storeProductGrid) {
                    storeProductGrid.innerHTML = `
                        <div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 40px;">
                            <h3>Shop not found</h3>
                            <p style="color: #64748b; margin-top: 6px;">Please check the link or browse our main directory.</p>
                        </div>
                    `;
                }
            }
        } catch (err) {
            console.error('Error loading store:', err);
            if (storeProductGrid) {
                storeProductGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #ef4444; padding: 40px;">Failed to load store catalog. Please ensure the backend server is running.</div>`;
            }
        }
    }

    // =======================================================
    // 2. Category Filter Pills
    // =======================================================
    function renderCategoryPills() {
        if (!storeCategoryPills) return;

        const uniqueCategories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

        let html = `
            <button class="cat-pill ${selectedCategory === 'All' ? 'active' : ''}" onclick="filterStoreCategory('All')">
                🌟 All Products (${allProducts.length})
            </button>
        `;

        uniqueCategories.forEach(cat => {
            const count = allProducts.filter(p => p.category === cat).length;
            const isSelected = selectedCategory === cat;
            html += `
                <button class="cat-pill ${isSelected ? 'active' : ''}" onclick="filterStoreCategory('${cat}')">
                    ${cat} (${count})
                </button>
            `;
        });

        storeCategoryPills.innerHTML = html;
    }

    window.filterStoreCategory = (cat) => {
        selectedCategory = cat;
        if (storeCatalogTitle) {
            storeCatalogTitle.textContent = cat === 'All' ? 'Available Rental Items' : cat;
        }
        renderCategoryPills();
        renderProducts();
    };

    // =======================================================
    // 3. Render Product Cards Grid (With Variant Swatches)
    // =======================================================
    window.selectCardColorVariant = (prodId, varId) => {
        cardActiveVariantMap[prodId] = varId;
        renderProducts();
    };

    function renderProducts() {
        if (!storeProductGrid) return;
        const search = storeSearchInput ? storeSearchInput.value.trim().toLowerCase() : '';

        let filtered = allProducts;
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(p => p.category === selectedCategory);
        }

        if (search) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(search) || 
                (p.description && p.description.toLowerCase().includes(search)) ||
                (p.variants && p.variants.some(v => v.color_name && v.color_name.toLowerCase().includes(search)))
            );
        }

        if (storeProductCount) {
            storeProductCount.textContent = `${filtered.length} item${filtered.length === 1 ? '' : 's'}`;
        }

        if (filtered.length > 0) {
            storeProductGrid.innerHTML = filtered.map(p => {
                const variants = getProductVariants(p);
                const activeVar = getActiveCardVariant(p);
                const isMultiColor = variants.length > 1 || (variants.length === 1 && variants[0].color_name && variants[0].color_name !== 'Standard');

                // Media for the active variant
                const varMedia = (Array.isArray(activeVar.media) && activeVar.media.length > 0)
                    ? activeVar.media
                    : (Array.isArray(p.media) && p.media.length > 0 ? p.media : (p.image_url ? [{ type: 'image', url: p.image_url }] : []));
                
                const hasVideo = varMedia.some(m => m.type === 'video');
                const photoCount = varMedia.filter(m => m.type === 'image').length;
                const primaryMedia = varMedia.find(m => m.is_primary) || varMedia[0] || { type: 'image', url: p.image_url };
                const varThumb = primaryMedia.url || p.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';

                const varPrice = activeVar.rent_price_per_day !== undefined ? activeVar.rent_price_per_day : p.rent_price_per_day;
                const varDeposit = activeVar.deposit_amount !== undefined ? activeVar.deposit_amount : (p.deposit_amount || 0);
                const varStock = activeVar.available_stock !== undefined ? activeVar.available_stock : (activeVar.total_stock !== undefined ? activeVar.total_stock : p.available_stock);
                const isAvailable = varStock > 0;

                const cartItemId = `${p.id}_${activeVar.id}`;
                const inCart = cartItems.some(item => (item.cart_item_id === cartItemId) || ((item.id || item) == p.id && (!item.variant_id || item.variant_id === activeVar.id)));

                return `
                <div class="customer-product-card">
                    <div class="customer-product-thumb-wrapper" onclick="openProductDetailsById(${p.id}, '${activeVar.id}')" title="Click photo to view angles & specifications">
                        ${primaryMedia.type === 'video' ? `
                            <video src="${primaryMedia.url}" style="width: 100%; height: 100%; object-fit: cover;" muted></video>
                            <div class="media-video-icon-overlay" style="width: 38px; height: 38px; font-size: 16px;">▶</div>
                        ` : `
                            <img src="${varThumb}" alt="${p.name} - ${activeVar.color_name}" class="customer-product-thumb" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'">
                        `}
                        <div class="thumb-hover-overlay">
                            <span>🔍 View Details &amp; Angles</span>
                        </div>
                        ${inCart ? `
                            <span class="card-in-cart-badge">✓ In Cart</span>
                        ` : ''}
                        ${varMedia.length > 1 ? `
                            <span class="card-media-count-badge">
                                ${hasVideo ? '🎬 Video +' : '📷'} ${photoCount} Angles
                            </span>
                        ` : hasVideo ? `
                            <span class="card-media-count-badge">🎬 Video</span>
                        ` : ''}
                        ${!isAvailable ? `
                            <span class="card-out-of-stock-overlay">Out of Stock</span>
                        ` : ''}
                    </div>
                    <div class="customer-product-body">
                        <div>
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                                <span class="customer-cat-badge">${p.category}</span>
                                ${isAvailable ? `
                                    <span class="stock-pill in-stock">🟢 ${varStock} Available</span>
                                ` : `
                                    <span class="stock-pill out-of-stock">🔴 Out of Stock</span>
                                `}
                            </div>
                            <h3 class="customer-product-title" onclick="openProductDetailsById(${p.id}, '${activeVar.id}')" style="cursor: pointer;" title="Click for specs & angles">${p.name}</h3>
                            
                            <!-- Color Swatches UI -->
                            ${isMultiColor ? `
                                <div class="card-variants-row" onclick="event.stopPropagation()">
                                    <span class="card-variants-label">Colour:</span>
                                    <div class="card-color-swatches">
                                        ${variants.map(v => {
                                            const isSelected = v.id === activeVar.id;
                                            const vAvail = (v.available_stock !== undefined ? v.available_stock : v.total_stock) > 0;
                                            const dotColor = v.color_code || '#111827';
                                            return `
                                                <button type="button" 
                                                    class="card-color-chip ${isSelected ? 'active' : ''} ${!vAvail ? 'out-of-stock' : ''}" 
                                                    onclick="selectCardColorVariant(${p.id}, '${v.id}')"
                                                    title="${v.color_name} (${vAvail ? `${v.available_stock !== undefined ? v.available_stock : v.total_stock} units available` : 'Out of stock'})">
                                                    <span class="color-chip-dot" style="background-color: ${dotColor};"></span>
                                                    <span>${v.color_name}</span>
                                                </button>
                                            `;
                                        }).join('')}
                                    </div>
                                </div>
                            ` : ''}

                            <p class="customer-product-desc">${activeVar.specifications || p.description || 'Quality verified rental product.'}</p>
                        </div>
                        <div>
                            <div class="customer-price-box">
                                <div>
                                    <div class="daily-rent-price">₹${varPrice} <span style="font-size: 12px; color: #64748b; font-weight: 500;">/ day</span></div>
                                    <div class="deposit-info">Deposit: ₹${varDeposit}</div>
                                </div>
                            </div>
                            ${!isAvailable ? `
                                <button class="btn-out-of-stock" onclick="openProductDetailsById(${p.id}, '${activeVar.id}')">
                                    <span>🔴 Out of Stock (View Details)</span>
                                </button>
                            ` : inCart ? `
                                <div class="product-actions-group">
                                    <button class="btn-remove-from-cart" onclick="removeSingleCartItem('${cartItemId}')" title="Remove product from cart">
                                        <span>🗑️ Remove from Cart</span>
                                    </button>
                                    <button class="btn-rent-direct" onclick="openCartModal()" title="View your rental cart">
                                        <span>🛒 View Cart &rarr;</span>
                                    </button>
                                </div>
                            ` : `
                                <div class="product-actions-group">
                                    <button class="btn-add-to-cart" onclick="addToCartById(${p.id}, '${activeVar.id}')" title="Add this colour variant to rental cart">
                                        <span>🛒 Add to Cart</span>
                                    </button>
                                    <button class="btn-rent-direct" onclick="openBookingModalById(${p.id}, '${activeVar.id}')" title="Book this colour variant directly">
                                        <span>⚡ Rent Now</span>
                                    </button>
                                </div>
                            `}
                        </div>
                    </div>
                </div>
                `;
            }).join('');
        } else {
            storeProductGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 48px; background: #ffffff; border-radius: 18px; border: 1px dashed #e2e8f0;">
                    <p style="font-size: 16px; font-weight: 700; color: #0a192f;">No matching rental items found.</p>
                    <p style="font-size: 13px; color: #64748b; margin-top: 4px;">Try searching for a different item or select another category.</p>
                </div>
            `;
        }
    }

    // =======================================================
    // 4. Product Details & Multi-Angle Showcase Logic
    // =======================================================
    window.openProductDetailsById = (prodId, selectedVariantId = null) => {
        const prod = allProducts.find(p => p.id == prodId);
        if (prod) openProductDetails(prod, selectedVariantId);
    };

    window.openProductDetails = (prod, selectedVariantId = null) => {
        activeDetailProduct = prod;
        const variants = getProductVariants(prod);
        activeDetailVariant = selectedVariantId ? (variants.find(v => v.id === selectedVariantId) || variants[0]) : variants[0];

        renderDetailModalData();
        if (productDetailModal) productDetailModal.classList.add('active');
    };

    window.switchDetailVariant = (varId) => {
        if (!activeDetailProduct) return;
        const variants = getProductVariants(activeDetailProduct);
        activeDetailVariant = variants.find(v => v.id === varId) || variants[0];
        cardActiveVariantMap[activeDetailProduct.id] = activeDetailVariant.id;
        renderDetailModalData();
        renderProducts();
    };

    function renderDetailModalData() {
        if (!activeDetailProduct) return;
        const prod = activeDetailProduct;
        const variants = getProductVariants(prod);
        const v = activeDetailVariant || variants[0];
        const isMultiColor = variants.length > 1 || (variants.length === 1 && variants[0].color_name && variants[0].color_name !== 'Standard');

        const isAvailable = (v.available_stock !== undefined ? v.available_stock : (v.total_stock || 1)) > 0;
        const cartItemId = `${prod.id}_${v.id}`;
        const inCart = cartItems.some(item => (item.cart_item_id === cartItemId) || ((item.id || item) == prod.id && (!item.variant_id || item.variant_id === v.id)));

        if (detailCatBadge) detailCatBadge.textContent = prod.category || 'Rental Gear';
        if (detailModalTitle) detailModalTitle.textContent = prod.name;
        if (detailPricePerDay) detailPricePerDay.textContent = v.rent_price_per_day;
        if (detailDepositAmount) detailDepositAmount.textContent = v.deposit_amount || 0;
        if (detailStockUnits) {
            const avail = v.available_stock !== undefined ? v.available_stock : (v.total_stock || 1);
            const total = v.total_stock || avail || 1;
            detailStockUnits.textContent = isAvailable ? `${avail} of ${total} units available` : '0 units available';
        }
        if (detailDescriptionText) {
            detailDescriptionText.textContent = v.specifications && v.specifications.trim() ? v.specifications : (prod.description && prod.description.trim() ? prod.description : 'High-quality professional rental gear. Carefully inspected, fully functional, and ready for immediate deployment.');
        }

        // Color Swatches in Detail Modal
        const detailVariantsBox = document.getElementById('detailVariantsSelectorBox');
        const detailVariantSwatches = document.getElementById('detailVariantSwatches');
        if (detailVariantsBox && detailVariantSwatches) {
            if (isMultiColor) {
                detailVariantsBox.style.display = 'block';
                detailVariantSwatches.innerHTML = variants.map(variant => {
                    const isSelected = variant.id === v.id;
                    const vAvail = (variant.available_stock !== undefined ? variant.available_stock : variant.total_stock) > 0;
                    const dotColor = variant.color_code || '#111827';
                    return `
                        <button type="button" 
                            class="detail-variant-pill ${isSelected ? 'active' : ''} ${!vAvail ? 'out-of-stock' : ''}" 
                            onclick="switchDetailVariant('${variant.id}')"
                            title="${variant.color_name} (${vAvail ? `${variant.available_stock || variant.total_stock} units in stock` : 'Out of stock'})">
                            <span class="detail-variant-dot" style="background-color: ${dotColor};"></span>
                            <span>${variant.color_name}</span>
                        </button>
                    `;
                }).join('');
            } else {
                detailVariantsBox.style.display = 'none';
            }
        }

        // Stock Status Badge
        if (detailStockBadgeContainer) {
            const avail = v.available_stock !== undefined ? v.available_stock : (v.total_stock || 1);
            if (isAvailable) {
                detailStockBadgeContainer.innerHTML = `
                    <span class="status-badge-lg in-stock">
                        <span>🟢</span> In Stock &amp; Available (${avail} unit${avail === 1 ? '' : 's'} in stock)
                    </span>
                `;
            } else {
                detailStockBadgeContainer.innerHTML = `
                    <span class="status-badge-lg out-of-stock">
                        <span>🔴</span> Out of Stock (${v.color_name !== 'Standard' ? v.color_name : 'Item'} Currently Rented Out)
                    </span>
                `;
            }
        }

        // Action Buttons
        if (detailActionButtons) {
            if (!isAvailable) {
                detailActionButtons.innerHTML = `
                    <button class="btn-out-of-stock" disabled style="grid-column: 1/-1; height: 48px; font-size: 14px;">
                        <span>🔴 Currently Out of Stock</span>
                    </button>
                `;
            } else if (inCart) {
                detailActionButtons.innerHTML = `
                    <button class="btn-remove-from-cart" style="height: 48px; font-size: 14px;" onclick="removeFromCartFromDetail()">
                        <span>🗑️ Remove from Cart</span>
                    </button>
                    <button class="btn-rent-direct" style="height: 48px; font-size: 14px;" onclick="openCartModal(); closeProductDetailModal();">
                        <span>🛒 View Cart (${cartItems.length}) &rarr;</span>
                    </button>
                `;
            } else {
                detailActionButtons.innerHTML = `
                    <button class="btn-add-to-cart" style="height: 48px; font-size: 14px;" onclick="addToCartFromDetail()">
                        <span>🛒 Add to Cart</span>
                    </button>
                    <button class="btn-rent-direct" style="height: 48px; font-size: 14px;" onclick="rentNowFromDetail()">
                        <span>⚡ Rent Now &rarr;</span>
                    </button>
                `;
            }
        }

        // Media Gallery for selected variant
        detailMediaList = (Array.isArray(v.media) && v.media.length > 0)
            ? v.media
            : (Array.isArray(prod.media) && prod.media.length > 0 ? prod.media : [{ type: 'image', url: prod.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80' }]);

        currentDetailMediaIdx = 0;
        renderDetailThumbnails();
        showDetailMedia(0);
    }

    window.closeProductDetailModal = () => {
        if (detailMainVideo) {
            detailMainVideo.pause();
            detailMainVideo.src = '';
        }
        if (productDetailModal) productDetailModal.classList.remove('active');
    };

    if (productDetailModal) {
        productDetailModal.addEventListener('click', (e) => {
            if (e.target === productDetailModal) closeProductDetailModal();
        });
    }

    function renderDetailThumbnails() {
        if (!detailThumbStrip) return;
        if (detailMediaList.length <= 1) {
            detailThumbStrip.innerHTML = '';
            detailThumbStrip.style.display = 'none';
            return;
        }

        detailThumbStrip.style.display = 'flex';
        detailThumbStrip.innerHTML = detailMediaList.map((m, idx) => `
            <button type="button" class="detail-thumb-item ${idx === 0 ? 'active' : ''}" onclick="switchDetailAngle(${idx})">
                ${m.type === 'video' ? `
                    <video src="${m.url}" muted></video>
                    <span class="store-modal-thumb-video-tag">▶</span>
                ` : `
                    <img src="${m.url}" alt="Angle ${idx + 1}">
                `}
            </button>
        `).join('');
    }

    function showDetailMedia(index) {
        if (!detailMediaList[index]) return;
        currentDetailMediaIdx = index;
        const item = detailMediaList[index];

        if (galleryAngleCounter) {
            galleryAngleCounter.textContent = `${item.type === 'video' ? '🎬 Video' : 'Angle'} ${index + 1} of ${detailMediaList.length}`;
        }

        if (item.type === 'video') {
            if (detailMainImg) detailMainImg.style.display = 'none';
            if (detailVideoContainer) {
                detailVideoContainer.style.display = 'block';
                if (detailMainVideo) {
                    detailMainVideo.src = item.url;
                    detailMainVideo.play().catch(() => {});
                }
            }
        } else {
            if (detailMainVideo) {
                detailMainVideo.pause();
                detailMainVideo.src = '';
            }
            if (detailVideoContainer) detailVideoContainer.style.display = 'none';
            if (detailMainImg) {
                detailMainImg.style.display = 'block';
                detailMainImg.src = item.url;
            }
        }

        // Update active thumbnail
        if (detailThumbStrip) {
            const buttons = detailThumbStrip.querySelectorAll('.detail-thumb-item');
            buttons.forEach((b, i) => b.classList.toggle('active', i === index));
        }
    }

    window.switchDetailAngle = (idx) => showDetailMedia(idx);

    window.prevDetailAngle = () => {
        if (detailMediaList.length <= 1) return;
        let newIdx = currentDetailMediaIdx - 1;
        if (newIdx < 0) newIdx = detailMediaList.length - 1;
        showDetailMedia(newIdx);
    };

    window.nextDetailAngle = () => {
        if (detailMediaList.length <= 1) return;
        let newIdx = currentDetailMediaIdx + 1;
        if (newIdx >= detailMediaList.length) newIdx = 0;
        showDetailMedia(newIdx);
    };

    window.addToCartFromDetail = () => {
        if (activeDetailProduct) {
            addToCart(activeDetailProduct, activeDetailVariant);
            renderDetailModalData();
        }
    };

    window.removeFromCartFromDetail = () => {
        if (activeDetailProduct) {
            const cartItemId = `${activeDetailProduct.id}_${activeDetailVariant ? activeDetailVariant.id : 'std'}`;
            removeSingleCartItem(cartItemId);
            renderDetailModalData();
        }
    };

    window.rentNowFromDetail = () => {
        if (activeDetailProduct) {
            closeProductDetailModal();
            openBookingModal(activeDetailProduct, activeDetailVariant ? activeDetailVariant.id : null);
        }
    };

    // =======================================================
    // 5. Direct Product Booking Modal Logic (Variant Aware)
    // =======================================================
    let activeBookingVariant = null;

    window.openBookingModalById = (prodId, selectedVariantId = null) => {
        const prod = allProducts.find(p => p.id == prodId);
        if (prod) openBookingModal(prod, selectedVariantId);
    };

    window.initBooking = (prod, selectedVariantId = null) => {
        openBookingModal(prod, selectedVariantId);
    };

    window.switchBookingVariant = (varId) => {
        if (!activeProductForBooking) return;
        const variants = getProductVariants(activeProductForBooking);
        activeBookingVariant = variants.find(v => v.id === varId) || variants[0];
        cardActiveVariantMap[activeProductForBooking.id] = activeBookingVariant.id;
        renderBookingModalVariantData();
    };

    function renderBookingModalVariantData() {
        if (!activeProductForBooking) return;
        const prod = activeProductForBooking;
        const variants = getProductVariants(prod);
        const v = activeBookingVariant || variants[0];
        const isMultiColor = variants.length > 1 || (variants.length === 1 && variants[0].color_name && variants[0].color_name !== 'Standard');

        const bookingVariantId = document.getElementById('bookingVariantId');
        const bookingVariantColor = document.getElementById('bookingVariantColor');
        const bookingVariantColorCode = document.getElementById('bookingVariantColorCode');

        if (bookingVariantId) bookingVariantId.value = v.id;
        if (bookingVariantColor) bookingVariantColor.value = v.color_name;
        if (bookingVariantColorCode) bookingVariantColorCode.value = v.color_code;

        const modalProdPrice = document.getElementById('modalProductPrice');
        const modalProdDeposit = document.getElementById('modalProductDeposit');
        if (modalProdPrice) modalProdPrice.textContent = v.rent_price_per_day;
        if (modalProdDeposit) modalProdDeposit.textContent = v.deposit_amount || 0;

        // Color Swatches in Booking Modal
        const bookingVarBox = document.getElementById('bookingVariantSelectorBox');
        const bookingVarSwatches = document.getElementById('bookingVariantSwatches');
        if (bookingVarBox && bookingVarSwatches) {
            if (isMultiColor) {
                bookingVarBox.style.display = 'block';
                bookingVarSwatches.innerHTML = variants.map(variant => {
                    const isSelected = variant.id === v.id;
                    const vAvail = (variant.available_stock !== undefined ? variant.available_stock : variant.total_stock) > 0;
                    const dotColor = variant.color_code || '#111827';
                    return `
                        <button type="button" 
                            class="booking-variant-pill ${isSelected ? 'active' : ''} ${!vAvail ? 'out-of-stock' : ''}" 
                            onclick="switchBookingVariant('${variant.id}')"
                            title="${variant.color_name} (${vAvail ? `${variant.available_stock || variant.total_stock} in stock` : 'Out of stock'})">
                            <span class="booking-variant-dot" style="background-color: ${dotColor};"></span>
                            <span>${variant.color_name}</span>
                        </button>
                    `;
                }).join('');
            } else {
                bookingVarBox.style.display = 'none';
            }
        }

        // Multi-media gallery for selected variant
        const mediaList = (Array.isArray(v.media) && v.media.length > 0)
            ? v.media
            : (Array.isArray(prod.media) && prod.media.length > 0 ? prod.media : [{ type: 'image', url: prod.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80' }]);

        const modalProdImg = document.getElementById('modalProductImg');
        const modalVideoWrapper = document.getElementById('modalVideoWrapper');
        const modalProdVideo = document.getElementById('modalProductVideo');
        const modalMediaThumbStrip = document.getElementById('modalMediaThumbStrip');

        function showMedia(index) {
            const item = mediaList[index];
            if (!item) return;

            if (item.type === 'video') {
                if (modalProdImg) modalProdImg.style.display = 'none';
                if (modalVideoWrapper) {
                    modalVideoWrapper.style.display = 'block';
                    if (modalProdVideo) {
                        modalProdVideo.src = item.url;
                        modalProdVideo.play().catch(() => {});
                    }
                }
            } else {
                if (modalProdVideo) {
                    modalProdVideo.pause();
                    modalProdVideo.src = '';
                }
                if (modalVideoWrapper) modalVideoWrapper.style.display = 'none';
                if (modalProdImg) {
                    modalProdImg.style.display = 'block';
                    modalProdImg.src = item.url;
                }
            }

            if (modalMediaThumbStrip) {
                const buttons = modalMediaThumbStrip.querySelectorAll('.store-modal-thumb-btn');
                buttons.forEach((b, i) => b.classList.toggle('active', i === index));
            }
        }

        if (modalMediaThumbStrip) {
            if (mediaList.length > 1) {
                modalMediaThumbStrip.style.display = 'flex';
                modalMediaThumbStrip.innerHTML = mediaList.map((m, idx) => `
                    <button type="button" class="store-modal-thumb-btn ${idx === 0 ? 'active' : ''}" onclick="window.switchModalMedia(${idx})">
                        ${m.type === 'video' ? `
                            <video src="${m.url}" muted></video>
                            <span class="store-modal-thumb-video-tag">▶</span>
                        ` : `
                            <img src="${m.url}" alt="Thumbnail" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'">
                        `}
                    </button>
                `).join('');
            } else {
                modalMediaThumbStrip.style.display = 'none';
                modalMediaThumbStrip.innerHTML = '';
            }
        }

        window.switchModalMedia = (idx) => showMedia(idx);
        showMedia(0);

        calculatePriceBreakdown();
    }

    function openBookingModal(prod, selectedVariantId = null) {
        const variants = getProductVariants(prod);
        activeBookingVariant = selectedVariantId ? (variants.find(v => v.id === selectedVariantId) || variants[0]) : variants[0];

        const isAvailable = (activeBookingVariant.available_stock !== undefined ? activeBookingVariant.available_stock : (activeBookingVariant.total_stock || 1)) > 0;
        if (!isAvailable) {
            showStoreToast(`${prod.name} (${activeBookingVariant.color_name}) is currently Out of Stock! 🔴`, 'error');
            return;
        }

        activeProductForBooking = prod;
        if (bookingProductId) bookingProductId.value = prod.id;
        
        const modalProdName = document.getElementById('modalProductName');
        const modalProdCat = document.getElementById('modalProductCategory');
        if (modalProdName) modalProdName.textContent = prod.name;
        if (modalProdCat) modalProdCat.textContent = prod.category || 'General';

        // Default start date = today, end date = tomorrow
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        if (custStartDate) {
            custStartDate.value = today.toISOString().split('T')[0];
            custStartDate.min = today.toISOString().split('T')[0];
        }
        if (custEndDate) {
            custEndDate.value = tomorrow.toISOString().split('T')[0];
            custEndDate.min = today.toISOString().split('T')[0];
        }

        renderBookingModalVariantData();

        // Reset forms
        if (customerBookingForm) customerBookingForm.style.display = 'block';
        if (bookingSuccessBox) bookingSuccessBox.style.display = 'none';
        if (submitBookingBtn) {
            submitBookingBtn.disabled = false;
            submitBookingBtn.innerHTML = `<span>Confirm &amp; Book Rental &rarr;</span>`;
        }

        if (bookingModal) bookingModal.classList.add('active');
    }

    function calculatePriceBreakdown() {
        if (!activeProductForBooking || !custStartDate || !custEndDate) return;

        const start = new Date(custStartDate.value);
        const end = new Date(custEndDate.value);

        let diffDays = 1;
        if (!isNaN(start) && !isNaN(end)) {
            const diffTime = end - start;
            diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 0) diffDays = 1;
        }

        const v = activeBookingVariant || activeProductForBooking;
        const pricePerDay = parseFloat(v.rent_price_per_day) || 0;
        const deposit = parseFloat(v.deposit_amount) || 0;
        const rentalAmount = diffDays * pricePerDay;
        const totalPayable = rentalAmount + deposit;

        if (calcDuration) calcDuration.textContent = `${diffDays} Day${diffDays === 1 ? '' : 's'}`;
        if (calcRentAmount) calcRentAmount.textContent = rentalAmount.toLocaleString('en-IN');
        if (calcDeposit) calcDeposit.textContent = deposit.toLocaleString('en-IN');
        if (calcTotalPayable) calcTotalPayable.textContent = totalPayable.toLocaleString('en-IN');
    }

    // Modal Close
    if (closeBookingModal) {
        closeBookingModal.addEventListener('click', () => {
            bookingModal.classList.remove('active');
        });
    }

    if (bookingModal) {
        bookingModal.addEventListener('click', (e) => {
            if (e.target === bookingModal) bookingModal.classList.remove('active');
        });
    }

    // Date change listeners
    if (custStartDate) {
        custStartDate.addEventListener('change', () => {
            if (custStartDate.value > custEndDate.value) {
                custEndDate.value = custStartDate.value;
            }
            calculatePriceBreakdown();
        });
    }
    if (custEndDate) custEndDate.addEventListener('change', calculatePriceBreakdown);

    // Search input
    if (storeSearchInput) {
        storeSearchInput.addEventListener('input', () => {
            clearTimeout(window.storeSearchTimer);
            window.storeSearchTimer = setTimeout(renderProducts, 250);
        });
    }

    // Single Booking Submit
    if (customerBookingForm) {
        customerBookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            submitBookingBtn.disabled = true;
            submitBookingBtn.innerHTML = `<span>Processing Booking...</span>`;

            const bookingData = {
                product_id: parseInt(bookingProductId.value),
                variant_id: document.getElementById('bookingVariantId') ? document.getElementById('bookingVariantId').value : (activeBookingVariant ? activeBookingVariant.id : null),
                variant_color: document.getElementById('bookingVariantColor') ? document.getElementById('bookingVariantColor').value : (activeBookingVariant ? activeBookingVariant.color_name : null),
                variant_color_code: document.getElementById('bookingVariantColorCode') ? document.getElementById('bookingVariantColorCode').value : (activeBookingVariant ? activeBookingVariant.color_code : null),
                customer_name: document.getElementById('custName').value.trim(),
                customer_phone: document.getElementById('custPhone').value.trim(),
                customer_address: document.getElementById('custAddress').value.trim(),
                delivery_type: document.getElementById('custDeliveryType').value,
                start_date: custStartDate.value,
                end_date: custEndDate.value
            };

            try {
                const res = await fetch(`${API_BASE}/book`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });

                const result = await res.json();

                if (result.success && result.order) {
                    customerBookingForm.style.display = 'none';
                    bookingSuccessBox.style.display = 'block';

                    const colorSuffix = result.order.variant_color && result.order.variant_color !== 'Standard' ? ` (${result.order.variant_color})` : '';
                    document.getElementById('successOrderId').textContent = `#${result.order.id}`;
                    document.getElementById('successCustName').textContent = `${result.order.customer_name} (📞 ${result.order.customer_phone})${colorSuffix}`;
                    document.getElementById('successDates').textContent = `${result.order.start_date} → ${result.order.end_date} (${result.order.total_days} days)`;
                    document.getElementById('successAmount').textContent = `₹${result.order.total_amount} (Deposit: ₹${result.order.deposit_amount})`;
                } else {
                    alert(result.message || 'Failed to submit booking. Please try again.');
                    submitBookingBtn.disabled = false;
                    submitBookingBtn.innerHTML = `<span>Confirm &amp; Book Rental &rarr;</span>`;
                }
            } catch (err) {
                console.error('Booking error:', err);
                alert('Network error submitting booking. Please try again.');
                submitBookingBtn.disabled = false;
                submitBookingBtn.innerHTML = `<span>Confirm &amp; Book Rental &rarr;</span>`;
            }
        });
    }

    window.closeSuccessAndReload = () => {
        bookingModal.classList.remove('active');
        loadStoreData();
    };

    // =======================================================
    // 6. RENTAL CART LOGIC & INDIVIDUAL REMOVE OPTIONS
    // =======================================================
    let pendingRemovalCartItemId = null;
    const removeConfirmModal = document.getElementById('removeConfirmModal');
    const confirmRemoveProdName = document.getElementById('confirmRemoveProdName');

    function showStoreToast(msg, type = 'info') {
        if (!storeToast) return;
        storeToast.textContent = msg;
        storeToast.className = `store-toast-msg show ${type}`;
        setTimeout(() => {
            storeToast.className = 'store-toast-msg';
        }, 3200);
    }

    function updateCartBadge() {
        const count = cartItems.length;
        if (cartNavCount) {
            cartNavCount.textContent = count;
            cartNavCount.style.transform = 'scale(1.35)';
            setTimeout(() => { cartNavCount.style.transform = 'scale(1)'; }, 200);
        }
        if (cartItemCountSub) {
            cartItemCountSub.textContent = `${count} Item${count === 1 ? '' : 's'} Selected`;
        }
    }

    window.addToCartById = (productId, variantId = null) => {
        const product = allProducts.find(p => p.id == productId);
        if (product) {
            const variants = getProductVariants(product);
            const variant = variantId ? (variants.find(v => v.id === variantId) || variants[0]) : variants[0];
            addToCart(product, variant);
        }
    };

    window.addToCart = (product, variant = null) => {
        const variants = getProductVariants(product);
        const activeV = variant || (activeDetailVariant ? activeDetailVariant : variants[0]);
        const available = activeV ? (activeV.available_stock !== undefined ? activeV.available_stock : activeV.total_stock) : (product.available_stock !== undefined ? product.available_stock : product.total_stock);

        if (available <= 0) {
            showStoreToast(`${product.name} (${activeV.color_name}) is currently Out of Stock! 🔴`, 'error');
            return;
        }

        const cartItemId = `${product.id}_${activeV.id}`;
        const existingIdx = cartItems.findIndex(item => item.cart_item_id === cartItemId || ((item.id || item) == product.id && (!item.variant_id || item.variant_id === activeV.id)));

        if (existingIdx > -1) {
            cartItems[existingIdx].days = (cartItems[existingIdx].days || 1) + 1;
            showStoreToast(`Added +1 day for ${product.name} (${activeV.color_name})! 🛒`, 'success');
        } else {
            const vPrice = parseFloat(activeV.rent_price_per_day) || parseFloat(product.rent_price_per_day) || 0;
            const vDeposit = activeV.deposit_amount !== undefined ? parseFloat(activeV.deposit_amount) : (parseFloat(product.deposit_amount) || 0);
            const vImg = (activeV.media && activeV.media[0] ? activeV.media[0].url : product.image_url) || '';

            cartItems.push({
                cart_item_id: cartItemId,
                id: product.id,
                variant_id: activeV.id,
                variant_color: activeV.color_name,
                variant_color_code: activeV.color_code,
                name: product.name,
                category: product.category,
                rent_price_per_day: vPrice,
                deposit_amount: vDeposit,
                image_url: vImg,
                available_stock: available,
                days: 1
            });
            showStoreToast(`Added ${product.name} (${activeV.color_name}) to Cart! 🛒`, 'success');
        }

        localStorage.setItem('renthub_cart_items', JSON.stringify(cartItems));
        updateCartBadge();
        renderProducts();
        if (activeDetailProduct && activeDetailProduct.id == product.id) {
            renderDetailModalData();
        }
    };

    // INDIVIDUAL REMOVE CONFIRMATION POPUP SYSTEM
    window.promptRemoveCartItem = (cartItemId, productName) => {
        pendingRemovalCartItemId = cartItemId;
        const item = cartItems.find(it => (it.cart_item_id || it.id) == cartItemId);
        const name = productName || (item ? item.name : 'this product');
        
        if (confirmRemoveProdName) {
            confirmRemoveProdName.textContent = `"${name}"`;
        }
        if (removeConfirmModal) {
            removeConfirmModal.classList.add('active');
        } else {
            if (confirm(`Are you sure you want to remove "${name}" from your rental cart?`)) {
                executeRemoveCartItem(cartItemId);
            }
        }
    };

    window.cancelRemoveCartItem = () => {
        pendingRemovalCartItemId = null;
        if (removeConfirmModal) {
            removeConfirmModal.classList.remove('active');
        }
    };

    if (removeConfirmModal) {
        removeConfirmModal.addEventListener('click', (e) => {
            if (e.target === removeConfirmModal) cancelRemoveCartItem();
        });
    }

    window.confirmExecuteRemove = () => {
        if (pendingRemovalCartItemId !== null && pendingRemovalCartItemId !== undefined) {
            const idToRemove = pendingRemovalCartItemId;
            cancelRemoveCartItem();
            executeRemoveCartItem(idToRemove);
        }
    };

    window.removeSingleCartItem = (cartItemId) => {
        const item = cartItems.find(it => (it.cart_item_id || it.id) == cartItemId);
        promptRemoveCartItem(cartItemId, item ? `${item.name}${item.variant_color && item.variant_color !== 'Standard' ? ` (${item.variant_color})` : ''}` : '');
    };

    window.removeFromCart = (cartItemId) => {
        window.removeSingleCartItem(cartItemId);
    };

    // Executes individual removal, keeping all other items untouched & recalculating all totals
    function executeRemoveCartItem(cartItemId) {
        const itemIdx = cartItems.findIndex(item => (item.cart_item_id || item.id) == cartItemId);
        if (itemIdx > -1) {
            const removedItem = cartItems[itemIdx];
            const name = removedItem.name || 'Product';

            const cardRow = document.getElementById(`cart-item-row-${cartItemId}`) || document.getElementById(`cart-item-row-${removedItem.id}`);
            if (cardRow) {
                cardRow.classList.add('is-removing');
            }

            setTimeout(() => {
                cartItems.splice(itemIdx, 1);
                localStorage.setItem('renthub_cart_items', JSON.stringify(cartItems));

                updateCartBadge();
                renderProducts();
                renderCartModal();

                if (activeDetailProduct && activeDetailProduct.id == removedItem.id) {
                    renderDetailModalData();
                }
                showStoreToast(`Removed "${name}" from cart 🗑️`, 'info');
            }, cardRow ? 180 : 0);
        }
    }

    // Stepper for individual product duration
    window.updateCartDays = (cartItemId, delta) => {
        const idx = cartItems.findIndex(item => (item.cart_item_id || item.id) == cartItemId);
        if (idx > -1) {
            const curDays = cartItems[idx].days || 1;
            const newDays = curDays + delta;
            if (newDays >= 1) {
                cartItems[idx].days = newDays;
                localStorage.setItem('renthub_cart_items', JSON.stringify(cartItems));
                renderCartModal();
            }
        }
    };

    window.openCartModal = () => {
        renderCartModal();
        if (cartModal) {
            cartModal.classList.add('active');
            const body = document.getElementById('cartModalBody');
            if (body) body.scrollTop = 0;
        }
    };

    window.closeCartModal = () => {
        if (cartModal) cartModal.classList.remove('active');
    };

    if (cartModal) {
        cartModal.addEventListener('click', (e) => {
            if (e.target === cartModal) closeCartModal();
        });
    }

    window.viewProductFromCart = (productId, variantId = null) => {
        closeCartModal();
        const prod = allProducts.find(p => p.id == productId);
        if (prod) {
            let variant = null;
            if (variantId) {
                const vars = getProductVariants(prod);
                variant = vars.find(v => v.id === variantId) || vars[0];
            }
            openProductDetails(prod, variant);
        }
    };

    window.openDirectBookingFromCart = (productId, variantId = null) => {
        closeCartModal();
        const prod = allProducts.find(p => p.id == productId);
        if (prod) {
            let variant = null;
            if (variantId) {
                const vars = getProductVariants(prod);
                variant = vars.find(v => v.id === variantId) || vars[0];
            }
            openBookingModal(prod, variant);
        }
    };

    function renderCartModal() {
        if (!cartModalBody) return;
        
        // Normalize cart items with catalog data
        cartItems = getNormalizedCartItems();
        localStorage.setItem('renthub_cart_items', JSON.stringify(cartItems));
        updateCartBadge();

        if (cartItems.length === 0) {
            cartModalBody.innerHTML = `
                <div class="fk-empty-cart-wrap">
                    <img src="assets/cart_3d_icon.png" alt="Empty Cart" class="fk-empty-3d-img">
                    <h4 class="fk-empty-title">Your Rental Cart is Empty</h4>
                    <p class="fk-empty-desc">Explore verified cameras, prime lenses, drones, audio rigs, and production equipment to start renting.</p>
                    <button type="button" class="fk-empty-btn" onclick="closeCartModal()">
                        <span>⚡ Explore Store Catalog</span>
                    </button>
                </div>
            `;
            return;
        }

        // Calculate item subtotals and overall totals
        let totalRentCharges = 0;
        let totalDepositCharges = 0;

        const itemsRowsHtml = cartItems.map(item => {
            const days = item.days || 1;
            const dailyRent = parseFloat(item.rent_price_per_day) || 0;
            const itemDeposit = parseFloat(item.deposit_amount) || 0;
            const itemRentSubtotal = dailyRent * days;
            const mrp = Math.round(dailyRent * 1.55);
            const discountPct = Math.round(((mrp - dailyRent) / mrp) * 100);

            totalRentCharges += itemRentSubtotal;
            totalDepositCharges += itemDeposit;

            const imgUrl = item.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80';
            const safeName = (item.name || 'Rental Item').replace(/'/g, "\\'");
            const rowKey = item.cart_item_id || item.id;
            const safeVariantId = item.variant_id ? `'${item.variant_id}'` : 'null';

            return `
                <div class="fk-cart-item-card" id="cart-item-row-${rowKey}">
                    <!-- Main item row: image + stepper on left, details on right -->
                    <div class="fk-item-main-row">
                        <!-- Left: Image & Stepper -->
                        <div class="fk-item-left-box">
                            <div class="fk-item-img-wrap" onclick="viewProductFromCart(${item.id}, ${safeVariantId})" style="cursor: pointer;" title="Click to view details">
                                <img src="${imgUrl}" alt="${item.name}" class="fk-item-img" onerror="this.src='https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80'">
                            </div>
                            <div class="fk-stepper-wrap">
                                <button type="button" class="fk-stepper-btn" onclick="updateCartDays('${rowKey}', -1)" title="Decrease 1 Day">−</button>
                                <span class="fk-stepper-val">${days} ${days === 1 ? 'Day' : 'Days'}</span>
                                <button type="button" class="fk-stepper-btn" onclick="updateCartDays('${rowKey}', 1)" title="Increase 1 Day">+</button>
                            </div>
                        </div>

                        <!-- Right: Details & Pricing -->
                        <div class="fk-item-details-box">
                            <div class="fk-item-header-row">
                                <div>
                                    <h4 class="fk-item-name" title="${item.name}" onclick="viewProductFromCart(${item.id}, ${safeVariantId})" style="cursor: pointer;">${item.name}</h4>
                                    ${item.variant_color && item.variant_color !== 'Standard' ? `
                                        <div style="margin-top: 4px;">
                                            <span class="cart-variant-pill" style="display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 700; color: #1e293b; background: #f1f5f9; padding: 2px 8px; border-radius: 999px; border: 1px solid #cbd5e1;">
                                                <span class="color-chip-dot" style="width: 8px; height: 8px; border-radius: 50%; background-color: ${item.variant_color_code || '#334155'}; display: inline-block;"></span>
                                                ${item.variant_color}
                                            </span>
                                        </div>
                                    ` : ''}
                                </div>
                                <span class="fk-item-badge-pill">${item.category || 'Gear'}</span>
                            </div>

                            <!-- Rating & Assured Tag -->
                            <div class="fk-item-rating-row">
                                <span class="fk-rating-badge">4.8 ★</span>
                                <span>(Verified Listing)</span>
                                <span class="fk-assured-tag">🛡️ Assured</span>
                            </div>

                            <!-- Pricing Details: Discount %, crossed price, daily rate -->
                            <div class="fk-item-pricing-row">
                                <span class="fk-discount-tag">↓ ${discountPct}% OFF</span>
                                <span class="fk-strikethrough-price">₹${mrp.toLocaleString('en-IN')}</span>
                                <span class="fk-active-rent-price">₹${dailyRent.toLocaleString('en-IN')} <span>/day</span></span>
                            </div>

                            <!-- Deposit & Subtotal -->
                            <div class="fk-item-deposit-info">
                                <span>🛡️ ₹${itemDeposit.toLocaleString('en-IN')} Refundable Deposit</span>
                            </div>

                            <div class="fk-item-subtotal-bar">
                                <span>Item Subtotal for <b>${days} Day${days === 1 ? '' : 's'}</b>:</span>
                                <span class="fk-subtotal-val">₹${itemRentSubtotal.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Bottom Action Row with INDIVIDUAL REMOVE BUTTON -->
                    <div class="fk-item-actions-row">
                        <div class="fk-actions-left">
                            <button type="button" class="fk-btn-secondary-action" onclick="showStoreToast('Item saved to your wishlist! 🔖', 'info')">
                                <span>🔖 Save for later</span>
                            </button>
                            <button type="button" class="fk-btn-remove" onclick="promptRemoveCartItem('${rowKey}', '${safeName}')" title="Remove this variant only from cart">
                                <span>🗑️ REMOVE</span>
                            </button>
                        </div>
                        <div class="fk-actions-right" style="display: flex; align-items: center; gap: 8px;">
                            <button type="button" class="fk-btn-secondary-action" onclick="viewProductFromCart(${item.id}, ${safeVariantId})" style="color: #0265fe; font-weight: 700;">
                                <span>🔍 View Angles</span>
                            </button>
                            <button type="button" class="fk-btn-rent-single" onclick="openDirectBookingFromCart(${item.id}, ${safeVariantId})">
                                <span>⚡ Rent This Now</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const grandTotal = totalRentCharges + totalDepositCharges;
        const totalSavings = Math.round(totalRentCharges * 0.42);

        // Default dates: today and tomorrow
        const today = new Date().toISOString().split('T')[0];
        const tomorrowDate = new Date();
        tomorrowDate.setDate(tomorrowDate.getDate() + 1);
        const tomorrow = tomorrowDate.toISOString().split('T')[0];

        cartModalBody.innerHTML = `
            <!-- 1. Flipkart-Style Deliver To Location Bar -->
            <div class="fk-deliver-bar">
                <div class="fk-deliver-text">
                    <span>📍 Deliver to: <b>Rahul Sharma, 411001</b></span>
                    <span class="fk-deliver-badge">HOME</span>
                </div>
                <button type="button" class="fk-deliver-btn" onclick="document.getElementById('cartCustName')?.focus()">Change</button>
            </div>

            <!-- 2. Main 2-Column Layout: Products Column + Price Details Sidebar -->
            <div class="fk-cart-grid">
                
                <!-- Left: Products In Cart Column -->
                <div class="fk-items-col">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                        <span style="font-size: 13.5px; font-weight: 800; color: #0a192f;">
                            📦 Products in Cart (${cartItems.length})
                        </span>
                        <span style="font-size: 11.5px; color: #64748b; font-weight: 600;">
                            Each item has independent duration &amp; remove
                        </span>
                    </div>

                    ${itemsRowsHtml}
                </div>

                <!-- Right: Flipkart Price Details & Checkout Sidebar -->
                <div class="fk-sidebar-col">
                    
                    <!-- Flipkart PRICE DETAILS Card -->
                    <div class="fk-price-details-card">
                        <h4 class="fk-price-title">PRICE DETAILS</h4>
                        
                        <div class="fk-price-row">
                            <span>Rental Charges (${cartItems.length} Item${cartItems.length === 1 ? '' : 's'})</span>
                            <span class="fk-price-row highlight">₹${totalRentCharges.toLocaleString('en-IN')}</span>
                        </div>
                        
                        <div class="fk-price-row">
                            <span>Refundable Security Deposit</span>
                            <span style="color: #10b981; font-weight: 700;">₹${totalDepositCharges.toLocaleString('en-IN')}</span>
                        </div>
                        
                        <div class="fk-price-row free">
                            <span>Inspection &amp; Sanitization Fee</span>
                            <span>FREE</span>
                        </div>

                        <div class="fk-price-row free">
                            <span>Direct Handover Guarantee</span>
                            <span>FREE</span>
                        </div>

                        <div class="fk-price-divider"></div>
                        
                        <div class="fk-total-row">
                            <span>Total Amount Payable</span>
                            <span class="fk-grand-amount">₹${grandTotal.toLocaleString('en-IN')}</span>
                        </div>

                        <div class="fk-savings-banner">
                            <span>🛡️ You'll save ₹${totalSavings.toLocaleString('en-IN')} on this rental order!</span>
                        </div>

                        <div class="fk-security-assurance">
                            <span>🔒 Safe and secure payments. 100% authentic items. Easy return inspection.</span>
                        </div>
                    </div>

                    <!-- Customer Quick Booking Form Card -->
                    <form id="cartCheckoutForm" class="fk-checkout-card" onsubmit="submitCartCheckout(event)">
                        <div class="fk-checkout-header">
                            <span>📋 Customer Contact &amp; Rental Dates</span>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">Full Name *</label>
                                <input type="text" id="cartCustName" class="form-control" style="height: 36px; font-size: 13px;" placeholder="e.g. Rahul Sharma" value="${(() => { try { const u = JSON.parse(localStorage.getItem('renthub_customer_data') || '{}'); return u.name || ''; } catch(e){ return ''; } })()}" required>
                            </div>

                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">Phone Number *</label>
                                <input type="tel" id="cartCustPhone" class="form-control" style="height: 36px; font-size: 13px;" placeholder="9876543210" value="${(() => { try { const u = JSON.parse(localStorage.getItem('renthub_customer_data') || '{}'); return u.phone || ''; } catch(e){ return ''; } })()}" required>
                            </div>

                            <div class="form-group" style="margin: 0;">
                                <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">Fulfillment Preference</label>
                                <select id="cartDeliveryType" class="form-control" style="height: 36px; font-size: 13px;">
                                    <option value="Store Pickup">🏬 Self Store Pickup</option>
                                    <option value="Home Delivery">🚚 Doorstep Delivery</option>
                                </select>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">Start Date *</label>
                                    <input type="date" id="cartStartDate" class="form-control" style="height: 36px; font-size: 12.5px;" value="${today}" min="${today}" required>
                                </div>
                                <div class="form-group" style="margin: 0;">
                                    <label class="form-label" style="font-size: 11.5px; font-weight: 700; color: #334155; margin-bottom: 4px;">End Date *</label>
                                    <input type="date" id="cartEndDate" class="form-control" style="height: 36px; font-size: 12.5px;" value="${tomorrow}" min="${today}" required>
                                </div>
                            </div>

                            <button type="submit" class="fk-btn-place-order" id="cartSubmitBtn">
                                <span>⚡ PLACE RENTAL ORDER (${cartItems.length}) &rarr;</span>
                            </button>
                        </div>
                    </form>

                </div>

            </div>
        `;
    }

    window.submitCartCheckout = async (e) => {
        e.preventDefault();
        if (cartItems.length === 0) return;

        const cartSubmitBtn = document.getElementById('cartSubmitBtn');
        if (cartSubmitBtn) {
            cartSubmitBtn.disabled = true;
            cartSubmitBtn.innerHTML = '<span>⏳ Processing Booking...</span>';
        }

        const name = document.getElementById('cartCustName').value.trim();
        const phone = document.getElementById('cartCustPhone').value.trim();
        const delivery = document.getElementById('cartDeliveryType').value;
        const startDate = document.getElementById('cartStartDate').value;
        const endDate = document.getElementById('cartEndDate').value;

        try {
            let placedCount = 0;
            for (const item of cartItems) {
                const bookingData = {
                    product_id: parseInt(item.id),
                    variant_id: item.variant_id || null,
                    variant_color: item.variant_color || null,
                    variant_color_code: item.variant_color_code || null,
                    customer_name: name,
                    customer_phone: phone,
                    delivery_type: delivery,
                    start_date: startDate,
                    end_date: endDate
                };

                const res = await fetch(`${API_BASE}/book`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });
                const data = await res.json();
                if (data.success) placedCount++;
            }

            // Clear cart upon successful order placement
            cartItems = [];
            localStorage.removeItem('renthub_cart_items');
            updateCartBadge();
            checkOrdersCount();
            renderProducts();

            // Show success in modal
            cartModalBody.innerHTML = `
                <div class="order-success-box" style="text-align: center; padding: 28px 16px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
                    <div class="success-icon-big" style="font-size: 48px; margin-bottom: 8px;">🎉</div>
                    <h3 style="font-size: 20px; font-weight: 800; color: #0a192f; margin-bottom: 6px;">Rental Booking Placed!</h3>
                    <p style="font-size: 13.5px; color: #64748b; margin-bottom: 18px;">
                        Successfully submitted <b>${placedCount}</b> item(s) directly to the store administrator.
                    </p>
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: left; font-size: 13px; margin-bottom: 20px;">
                        <div style="margin-bottom: 6px;"><b>Customer:</b> ${name} (📞 ${phone})</div>
                        <div style="margin-bottom: 6px;"><b>Fulfillment:</b> ${delivery}</div>
                        <div style="margin-bottom: 6px;"><b>Dates:</b> ${startDate} &rarr; ${endDate}</div>
                        <div><b>Status:</b> <span style="background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: 700;">Pending Shop Approval</span></div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <button class="btn-orders-nav" onclick="closeCartModal(); openOrdersModal();" style="justify-content: center; padding: 12px;">
                            <span>📦 View My Orders</span>
                        </button>
                        <button class="btn-rent-direct" onclick="closeCartModal()" style="width: 100%; justify-content: center; padding: 12px;">
                            <span>Continue Browsing</span>
                        </button>
                    </div>
                </div>
            `;
            showStoreToast('Rental checkout completed! 🎉', 'success');
        } catch (err) {
            console.error('Cart checkout error:', err);
            showStoreToast('Error placing booking. Please try again.', 'error');
            if (cartSubmitBtn) {
                cartSubmitBtn.disabled = false;
                cartSubmitBtn.innerHTML = `<span>⚡ PLACE RENTAL ORDER (${cartItems.length}) &rarr;</span>`;
            }
        }
    };

    // =======================================================
    // 7. CUSTOMER / USER ACCOUNT ACCESS & PORTAL SYSTEM
    // =======================================================
    const accountModal = document.getElementById('accountModal');
    const openAccountBtn = document.getElementById('openAccountBtn');
    const accountLoggedInView = document.getElementById('accountLoggedInView');
    const accountLoggedOutView = document.getElementById('accountLoggedOutView');
    const accountNavLabel = document.getElementById('accountNavLabel');
    const accountNavSub = document.getElementById('accountNavSub');
    const accountNavIcon = document.getElementById('accountNavIcon');

    function checkAccountAuthState() {
        const token = localStorage.getItem('renthub_customer_token');
        const userDataStr = localStorage.getItem('renthub_customer_data');

        if (token && userDataStr) {
            try {
                const user = JSON.parse(userDataStr);
                if (openAccountBtn) openAccountBtn.classList.add('logged-in');
                if (accountNavIcon) accountNavIcon.textContent = '👤';
                if (accountNavLabel) {
                    const firstName = user.name ? user.name.split(' ')[0] : 'Customer';
                    accountNavLabel.textContent = firstName.length > 12 ? firstName.substring(0, 10) + '...' : firstName;
                }
                if (accountNavSub) accountNavSub.textContent = '✓ My Account';

                if (accountLoggedInView) accountLoggedInView.style.display = 'block';
                if (accountLoggedOutView) accountLoggedOutView.style.display = 'none';

                const userNameEl = document.getElementById('accountUserName');
                const userEmailEl = document.getElementById('accountUserEmail');
                const userPhoneEl = document.getElementById('accountUserPhone');
                const userAddressEl = document.getElementById('accountUserAddress');

                if (userNameEl) userNameEl.textContent = user.name || 'Customer Account';
                if (userEmailEl) userEmailEl.textContent = user.email || 'customer@renthub.com';
                if (userPhoneEl) userPhoneEl.textContent = `📞 +91 ${user.phone || '9876543210'}`;
                if (userAddressEl) userAddressEl.textContent = `${user.address || ''}${user.city ? ', ' + user.city : ''}${user.pincode ? ' ' + user.pincode : ''}` || 'Not provided yet';
                return;
            } catch (e) {
                console.warn('Error parsing customer session:', e);
            }
        }

        // Default: Customer Logged out
        if (openAccountBtn) openAccountBtn.classList.remove('logged-in');
        if (accountNavIcon) accountNavIcon.textContent = '👤';
        if (accountNavLabel) accountNavLabel.textContent = 'Account';
        if (accountNavSub) accountNavSub.textContent = 'Access / Login';

        if (accountLoggedInView) accountLoggedInView.style.display = 'none';
        if (accountLoggedOutView) accountLoggedOutView.style.display = 'block';
    }

    window.openAccountModal = () => {
        window.location.href = 'user-login.html';
    };

    window.closeAccountModal = () => {
        if (accountModal) accountModal.classList.remove('active');
    };

    if (accountModal) {
        accountModal.addEventListener('click', (e) => {
            if (e.target === accountModal) closeAccountModal();
        });
    }

    window.switchAccountTab = (tabName) => {
        const tabs = ['userLogin', 'userRegister'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}Btn`);
            const pane = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}Content`);
            if (btn) btn.classList.toggle('active', t === tabName);
            if (pane) {
                pane.style.display = (t === tabName) ? 'block' : 'none';
                pane.classList.toggle('active', t === tabName);
            }
        });
    };

    window.toggleAccPasswordVisibility = (inputId) => {
        const inp = document.getElementById(inputId);
        if (inp) {
            inp.type = inp.type === 'password' ? 'text' : 'password';
        }
    };

    window.fillCustomerDemoCredentials = () => {
        const idInput = document.getElementById('accCustLoginId');
        const passInput = document.getElementById('accCustLoginPassword');
        if (idInput) idInput.value = 'rahul.sharma@example.com';
        if (passInput) passInput.value = 'user123';
        showStoreToast('Demo customer credentials filled! ⚡', 'info');
    };

    window.handleCustomerLoginSubmit = async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('accCustLoginId').value.trim();
        const password = document.getElementById('accCustLoginPassword').value.trim();
        const submitBtn = document.getElementById('custLoginSubmitBtn');

        if (!identifier || !password) {
            showStoreToast('Please enter your email/phone and password.', 'error');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>⏳ Signing In...</span>';
        }

        try {
            let res;
            if (window.API && window.API.userLogin) {
                res = await window.API.userLogin(identifier, password);
            } else {
                const response = await fetch('http://localhost:5000/api/user/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier, password })
                });
                res = await response.json();
            }

            if (res.success && res.user) {
                localStorage.setItem('renthub_customer_token', res.token || 'demo_customer_token');
                localStorage.setItem('renthub_customer_data', JSON.stringify(res.user));
                checkAccountAuthState();
                
                // Pre-fill checkout form if open
                const nameInp = document.getElementById('cartCustName');
                const phoneInp = document.getElementById('cartCustPhone');
                if (nameInp && res.user.name) nameInp.value = res.user.name;
                if (phoneInp && res.user.phone) phoneInp.value = res.user.phone;

                showStoreToast(`Welcome, ${res.user.name}! 🎉`, 'success');
                setTimeout(() => { if (typeof closeAccountModal === 'function') closeAccountModal(); }, 500);
            } else {
                showStoreToast(res.message || 'Login failed. Please check credentials.', 'error');
            }
        } catch (err) {
            console.error('Customer login error:', err);
            // Fallback for standalone demo
            if ((identifier === 'rahul.sharma@example.com' || identifier === '9876543210') && (password === 'user123' || password === 'password')) {
                const demoUser = {
                    id: 1,
                    name: 'Rahul Sharma',
                    email: 'rahul.sharma@example.com',
                    phone: '9876543210',
                    address: 'Flat 402, Green Valley Heights, MG Road',
                    city: 'Pune',
                    pincode: '411001'
                };
                localStorage.setItem('renthub_customer_token', 'demo_user_token_123');
                localStorage.setItem('renthub_customer_data', JSON.stringify(demoUser));
                checkAccountAuthState();
                showStoreToast('Logged in as Rahul Sharma! 🎉', 'success');
                setTimeout(() => { if (typeof closeAccountModal === 'function') closeAccountModal(); }, 500);
            } else {
                showStoreToast('Login error. Please try again.', 'error');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>🔐 Sign In to Customer Account &rarr;</span>';
            }
        }
    };

    window.handleCustomerRegisterSubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('regCustName').value.trim();
        const email = document.getElementById('regCustEmail').value.trim();
        const phone = document.getElementById('regCustPhone').value.trim();
        const address = document.getElementById('regCustAddress').value.trim();
        const city = document.getElementById('regCustCity').value.trim();
        const pincode = document.getElementById('regCustPincode').value.trim();
        const password = document.getElementById('regCustPassword').value.trim();
        const submitBtn = document.getElementById('custRegSubmitBtn');

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>⏳ Creating Account...</span>';
        }

        try {
            const payload = { name, email, phone, address, city, pincode, password };
            let data;
            if (window.API && window.API.userRegister) {
                data = await window.API.userRegister(payload);
            } else {
                const res = await fetch('http://localhost:5000/api/user/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                data = await res.json();
            }

            if (data.success && data.user) {
                localStorage.setItem('renthub_customer_token', data.token || 'user_token_new');
                localStorage.setItem('renthub_customer_data', JSON.stringify(data.user));
                checkAccountAuthState();
                
                const nameInp = document.getElementById('cartCustName');
                const phoneInp = document.getElementById('cartCustPhone');
                if (nameInp && data.user.name) nameInp.value = data.user.name;
                if (phoneInp && data.user.phone) phoneInp.value = data.user.phone;

                showStoreToast(`Welcome to Rent Hub, ${name}! 🎉`, 'success');
                setTimeout(() => { if (typeof closeAccountModal === 'function') closeAccountModal(); }, 500);
            } else {
                showStoreToast(data.message || 'Registration failed.', 'error');
            }
        } catch (err) {
            console.error('Customer registration error:', err);
            showStoreToast('Server error during customer registration.', 'error');
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>✨ Create Customer Account &rarr;</span>';
            }
        }
    };

    window.handleCustomerLogout = () => {
        localStorage.removeItem('renthub_customer_token');
        localStorage.removeItem('renthub_customer_data');
        checkAccountAuthState();
        showStoreToast('Signed out of Customer Account successfully! 🚪', 'info');
    };

    // =======================================================
    // 8. ORDERS MODAL & CUSTOMER BOOKINGS CONTROLLER
    // =======================================================
    const ordersModal = document.getElementById('ordersModal');
    const ordersModalBody = document.getElementById('ordersModalBody');
    const ordersNavCount = document.getElementById('ordersNavCount');
    const ordersNavSub = document.getElementById('ordersNavSub');

    async function checkOrdersCount() {
        try {
            const userDataStr = localStorage.getItem('renthub_customer_data');
            if (!userDataStr) {
                if (ordersNavCount) ordersNavCount.style.display = 'none';
                if (ordersNavSub) ordersNavSub.textContent = 'My Bookings';
                return;
            }
            const user = JSON.parse(userDataStr);
            if (!user.phone) return;

            let data;
            if (window.API && window.API.getUserOrders) {
                data = await window.API.getUserOrders(user.phone);
            } else {
                const res = await fetch(`http://localhost:5000/api/user/orders?phone=${encodeURIComponent(user.phone)}`);
                data = await res.json();
            }

            if (data.success && Array.isArray(data.orders)) {
                const count = data.orders.length;
                if (ordersNavCount) {
                    if (count > 0) {
                        ordersNavCount.textContent = count;
                        ordersNavCount.style.display = 'inline-block';
                    } else {
                        ordersNavCount.style.display = 'none';
                    }
                }
                if (ordersNavSub) {
                    ordersNavSub.textContent = count > 0 ? `${count} Active` : 'My Bookings';
                }
            }
        } catch (e) {
            console.warn('Error checking orders count:', e);
        }
    }

    window.openOrdersModal = async () => {
        if (ordersModal) ordersModal.classList.add('active');
        await renderOrdersModalContent();
    };

    window.closeOrdersModal = () => {
        if (ordersModal) ordersModal.classList.remove('active');
    };

    if (ordersModal) {
        ordersModal.addEventListener('click', (e) => {
            if (e.target === ordersModal) closeOrdersModal();
        });
    }

    let cachedCustomerOrders = [];

    window.printOrderReceipt = (orderId) => {
        const ord = cachedCustomerOrders.find(o => String(o.id) === String(orderId));
        if (ord) {
            showStoreToast(`Generating invoice receipt for Booking #${orderId}... 📄`, 'info');
            setTimeout(() => {
                window.print();
            }, 500);
        } else {
            showStoreToast('Order receipt ready.', 'info');
        }
    };

    window.viewOrderDetail = (orderId) => {
        if (!ordersModalBody) return;
        const ord = cachedCustomerOrders.find(o => String(o.id) === String(orderId));
        if (!ord) {
            showStoreToast('Order details not found.', 'error');
            renderOrdersModalContent();
            return;
        }

        const status = ord.status || 'Active';
        const isDoneOrReturned = status === 'Returned' || status === 'Completed';
        const isOutForDelivery = status === 'Out for Delivery' || status === 'Ready';
        const isActiveRental = status === 'Active' || status === 'Approved';

        // Step 1 Status
        const step1Class = 'done';
        const step1Icon = '✓';

        // Step 2 Status (Quality inspection)
        let step2Class = 'done';
        let step2Icon = '✓';
        let step2Time = '✓ Inspection Passed';
        if (status === 'Pending') {
            step2Class = 'active-step';
            step2Icon = '🔍';
            step2Time = '⏳ In Progress by Store Technician';
        }

        // Step 3 Status (Dispatched / Ready)
        let step3Class = isDoneOrReturned || isActiveRental ? 'done' : (isOutForDelivery ? 'active-step' : '');
        let step3Icon = isDoneOrReturned || isActiveRental ? '✓' : '🚚';
        let step3Time = isDoneOrReturned || isActiveRental ? '✓ Handed Over' : (isOutForDelivery ? '⚡ Ready / In Transit' : 'Pending Step 2');

        // Step 4 Status (Active Rental Period)
        let step4Class = isDoneOrReturned ? 'done' : (isActiveRental ? 'active-step' : '');
        let step4Icon = isDoneOrReturned ? '✓' : '⏱️';
        let step4Time = isDoneOrReturned ? '✓ Completed' : (isActiveRental ? `🟢 Active (${ord.start_date} → ${ord.end_date})` : 'Awaiting Fulfillment');

        // Step 5 Status (Return & Refund)
        let step5Class = isDoneOrReturned ? 'done' : '';
        let step5Icon = isDoneOrReturned ? '✓' : '🔄';
        let step5Time = isDoneOrReturned ? `✓ ₹${(ord.deposit_amount || 0).toLocaleString('en-IN')} Refunded` : `Scheduled for ${ord.end_date}`;

        ordersModalBody.innerHTML = `
            <div class="order-detail-view">
                <!-- Top Header & Navigation -->
                <div class="order-detail-top-nav">
                    <button type="button" class="btn-back-orders" onclick="renderOrdersModalContent()">
                        <span>&larr; Back to All Orders</span>
                    </button>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 13px; font-weight: 700; color: #64748b;">Order:</span>
                        <strong style="font-size: 14px; color: #0265fe;">#${ord.id}</strong>
                        <span class="orders-status-pill ${(ord.status || 'pending').toLowerCase()}">
                            ${ord.status || 'Active'}
                        </span>
                    </div>
                </div>

                <!-- 1. Product Spotlight Card -->
                <div class="order-product-spotlight">
                    <img src="${ord.product_image || 'assets/inventory_products.png'}" alt="${ord.product_name || 'Item'}" class="order-product-big-img">
                    <div class="order-product-info">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px;">
                            <div class="order-product-name" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span>${ord.product_name || 'Rental Item'}</span>
                                ${ord.variant_color && ord.variant_color !== 'Standard' ? `
                                    <span class="order-variant-pill" style="font-size: 11.5px; font-weight: 700; color: #1e293b; background: #f1f5f9; padding: 2px 8px; border-radius: 999px; border: 1px solid #cbd5e1; display: inline-flex; align-items: center; gap: 5px;">
                                        <span class="color-chip-dot" style="width: 8px; height: 8px; border-radius: 50%; background-color: ${ord.variant_color_code || '#334155'}; display: inline-block;"></span>
                                        ${ord.variant_color}
                                    </span>
                                ` : ''}
                            </div>
                            <span class="order-tag" style="background: #eff6ff; color: #0265fe; border-color: #bfdbfe; white-space: nowrap;">
                                ${ord.product_category || 'Electronics & Gear'}
                            </span>
                        </div>
                        <p class="order-product-desc">
                            ${ord.product_description || 'Certified high-grade rental gear, comprehensively tested, sanitized, and packed with original accessories by store technician.'}
                        </p>
                        <div class="order-product-tags">
                            <span class="order-tag">💰 ₹${(ord.rent_price_per_day || Math.round((ord.total_amount || 1500) / (ord.total_days || 1))).toLocaleString('en-IN')} / Day</span>
                            <span class="order-tag" style="color: #10b981; border-color: #a7f3d0; background: #ecfdf5;">🛡️ ₹${(ord.deposit_amount || 0).toLocaleString('en-IN')} Refundable Deposit</span>
                            <span class="order-tag">📅 ${ord.total_days || 1} Days Rental</span>
                        </div>
                    </div>
                </div>

                <!-- 2. Live Order Tracking & Logistics Timeline -->
                <div class="order-tracking-card">
                    <div class="tracking-header-title">
                        <span>📍 Live Order Tracking &amp; Status</span>
                        <span style="font-size: 11.5px; color: #10b981; font-weight: 700; background: #ecfdf5; padding: 2px 8px; border-radius: 4px; border: 1px solid #a7f3d0;">
                            ● Live Sync
                        </span>
                    </div>

                    <div class="tracking-timeline">
                        <!-- Step 1 -->
                        <div class="tracking-step ${step1Class}">
                            <div class="tracking-step-line"></div>
                            <div class="tracking-step-icon">${step1Icon}</div>
                            <div class="tracking-step-content">
                                <div class="tracking-step-title">1. Booking Confirmed &amp; Escrow Locked</div>
                                <div class="tracking-step-desc">Order #${ord.id} received and verified. Security deposit of ₹${(ord.deposit_amount || 0).toLocaleString('en-IN')} held in safe escrow.</div>
                                <div class="tracking-step-time">⏱️ Placed: ${ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recently'}</div>
                            </div>
                        </div>

                        <!-- Step 2 -->
                        <div class="tracking-step ${step2Class}">
                            <div class="tracking-step-line"></div>
                            <div class="tracking-step-icon">${step2Icon}</div>
                            <div class="tracking-step-content">
                                <div class="tracking-step-title">2. Quality Check &amp; Gear Sanitization</div>
                                <div class="tracking-step-desc">Diagnostic hardware check, sensor/lens cleaning, battery health test, and protective packaging.</div>
                                <div class="tracking-step-time">${step2Time}</div>
                            </div>
                        </div>

                        <!-- Step 3 -->
                        <div class="tracking-step ${step3Class}">
                            <div class="tracking-step-line"></div>
                            <div class="tracking-step-icon">${step3Icon}</div>
                            <div class="tracking-step-content">
                                <div class="tracking-step-title">3. ${ord.delivery_type === 'Home Delivery' ? 'Out for Doorstep Delivery' : 'Ready for Counter Pickup'}</div>
                                <div class="tracking-step-desc">${ord.delivery_type === 'Home Delivery' ? 'Dispatched with verified courier partner for doorstep delivery.' : 'Available for immediate pickup at store reception counter with Gov ID.'}</div>
                                <div class="tracking-step-time">${step3Time}</div>
                            </div>
                        </div>

                        <!-- Step 4 -->
                        <div class="tracking-step ${step4Class}">
                            <div class="tracking-step-line"></div>
                            <div class="tracking-step-icon">${step4Icon}</div>
                            <div class="tracking-step-content">
                                <div class="tracking-step-title">4. Active Rental Period</div>
                                <div class="tracking-step-desc">Item in customer possession: <b>${ord.start_date}</b> &rarr; <b>${ord.end_date}</b> (${ord.total_days || 1} Days).</div>
                                <div class="tracking-step-time">${step4Time}</div>
                            </div>
                        </div>

                        <!-- Step 5 -->
                        <div class="tracking-step ${step5Class}">
                            <div class="tracking-step-icon">${step5Icon}</div>
                            <div class="tracking-step-content">
                                <div class="tracking-step-title">5. Return Inspection &amp; Deposit Refund</div>
                                <div class="tracking-step-desc">${isDoneOrReturned ? 'Return inspection cleared! Full escrow deposit of ₹' + (ord.deposit_amount || 0).toLocaleString('en-IN') + ' released.' : 'Scheduled return on ' + ord.end_date + '. Escrow deposit will be immediately refunded post-check.'}</div>
                                <div class="tracking-step-time">${step5Time}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 3. Fulfillment & Price Summary (2-Col Grid) -->
                <div class="order-info-grid-2col">
                    <!-- Left: Customer & Delivery Details -->
                    <div class="order-info-card-box">
                        <div class="order-info-box-title">
                            <span>👤 Customer &amp; Fulfillment Info</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12.5px;">
                            <div><b>Customer Name:</b> ${ord.customer_name || 'Customer'}</div>
                            <div><b>Phone Number:</b> 📞 +91 ${ord.customer_phone || '9876543210'}</div>
                            <div><b>Fulfillment Method:</b> 🚚 ${ord.delivery_type || 'Store Pickup'}</div>
                            <div><b>Rental Duration:</b> ${ord.start_date} &rarr; ${ord.end_date} (${ord.total_days || 1} Days)</div>
                            ${ord.customer_address ? `<div><b>Delivery Address:</b> ${ord.customer_address}</div>` : ''}
                        </div>
                    </div>

                    <!-- Right: Price & Deposit Escrow Breakdown -->
                    <div class="order-info-card-box">
                        <div class="order-info-box-title">
                            <span>💳 Payment &amp; Escrow Breakdown</span>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 12.5px;">
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #64748b;">Rental Charges (${ord.total_days || 1} days):</span>
                                <b>₹${(ord.total_amount || 0).toLocaleString('en-IN')}</b>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                                <span style="color: #64748b;">Escrow Security Deposit:</span>
                                <b style="color: #10b981;">₹${(ord.deposit_amount || 0).toLocaleString('en-IN')}</b>
                            </div>
                            <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 6px; margin-top: 2px;">
                                <b>Grand Total Commitment:</b>
                                <b style="font-size: 14px; color: #0265fe;">₹${((ord.total_amount || 0) + (ord.deposit_amount || 0)).toLocaleString('en-IN')}</b>
                            </div>
                            <div style="font-size: 11px; color: #10b981; font-weight: 700; background: #ecfdf5; padding: 4px 8px; border-radius: 6px; margin-top: 4px;">
                                🛡️ ₹${(ord.deposit_amount || 0).toLocaleString('en-IN')} deposit will be 100% refunded upon return inspection.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 4. Action Buttons -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 14px; margin-top: 4px; gap: 10px; flex-wrap: wrap;">
                    <button type="button" class="btn-confirm-cancel" onclick="renderOrdersModalContent()" style="padding: 10px 18px; font-size: 13px;">
                        <span>&larr; Back to All Orders</span>
                    </button>
                    
                    <div style="display: flex; gap: 8px;">
                        <button type="button" class="btn-acc-demo-fill" onclick="window.printOrderReceipt('${ord.id}')" style="padding: 8px 14px; background: #f8fafc; border: 1px solid #cbd5e1;">
                            <span>📄 Print / Receipt</span>
                        </button>
                        <a href="tel:+919876543210" class="btn-rent-direct" style="text-decoration: none; padding: 10px 16px; font-size: 13px;">
                            <span>📞 Call Store</span>
                        </a>
                    </div>
                </div>
            </div>
        `;
    };

    async function renderOrdersModalContent(searchPhone = null) {
        if (!ordersModalBody) return;

        let targetPhone = searchPhone;
        let customer = null;

        try {
            const userStr = localStorage.getItem('renthub_customer_data');
            if (userStr) {
                customer = JSON.parse(userStr);
                if (!targetPhone && customer.phone) targetPhone = customer.phone;
            }
        } catch (e) {}

        if (!targetPhone) {
            // Guest View: Phone search + 1-Click Login
            ordersModalBody.innerHTML = `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; text-align: center;">
                    <div style="font-size: 38px; margin-bottom: 8px;">📦</div>
                    <h4 style="font-size: 16px; font-weight: 800; color: #0a192f; margin-bottom: 6px;">Lookup Your Rental Bookings</h4>
                    <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">
                        Enter your phone number to view all live rental orders and deposit refunds, or sign in to your customer account.
                    </p>
                    
                    <form onsubmit="handleOrdersPhoneSearch(event)" style="display: flex; gap: 8px; max-width: 420px; margin: 0 auto 16px auto;">
                        <input type="tel" id="ordersPhoneInput" class="form-control" placeholder="Enter your 10-digit phone" required style="height: 40px; font-size: 13.5px;">
                        <button type="submit" class="btn-track-lookup" style="padding: 0 18px; white-space: nowrap;">
                            <span>Search &rarr;</span>
                        </button>
                    </form>

                    <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
                        <button type="button" class="btn-acc-demo-fill" onclick="quickLoginAndShowOrders()" style="background: #eff6ff; padding: 6px 12px; border: 1px solid #bfdbfe;">
                            <span>⚡ Quick Sign In (Rahul Sharma)</span>
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Loading state
        ordersModalBody.innerHTML = `
            <div style="text-align: center; padding: 30px 10px;">
                <div style="font-size: 32px; animation: spin 1s infinite linear;">⏳</div>
                <p style="font-size: 13.5px; color: #64748b; margin-top: 8px;">Loading rental orders for <b>${targetPhone}</b>...</p>
            </div>
        `;

        try {
            let data;
            if (window.API && window.API.getUserOrders) {
                data = await window.API.getUserOrders(targetPhone);
            } else {
                const res = await fetch(`http://localhost:5000/api/user/orders?phone=${encodeURIComponent(targetPhone)}`);
                data = await res.json();
            }

            if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
                const orders = data.orders;
                cachedCustomerOrders = orders;
                const activeCount = orders.filter(o => (o.status || 'Pending') !== 'Returned' && (o.status || '') !== 'Completed').length;
                const totalDeposit = orders.reduce((sum, o) => sum + (o.deposit_amount || 0), 0);

                const ordersHtml = orders.map(ord => {
                    const statusClass = (ord.status || 'pending').toLowerCase();
                    return `
                        <div class="orders-item-card clickable" onclick="viewOrderDetail('${ord.id}')">
                            <div class="orders-item-header">
                                <div>
                                    <strong style="color: #0265fe; font-size: 13.5px;">Booking #${ord.id}</strong>
                                    <span style="color: #64748b; font-size: 11.5px; margin-left: 6px;">📅 Placed ${ord.created_at ? new Date(ord.created_at).toLocaleDateString() : 'Recently'}</span>
                                </div>
                                <span class="orders-status-pill ${statusClass}">
                                    ${ord.status || 'Pending Shop Approval'}
                                </span>
                            </div>
                            <div class="orders-item-body">
                                <img src="${ord.product_image || 'assets/inventory_products.png'}" alt="Product" class="orders-item-img">
                                <div class="orders-item-details">
                                    <div class="orders-item-title" style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                        <span>${ord.product_name || 'Rental Item'}</span>
                                        ${ord.variant_color && ord.variant_color !== 'Standard' ? `
                                            <span class="order-variant-pill" style="font-size: 11px; font-weight: 700; color: #1e293b; background: #f1f5f9; padding: 1px 7px; border-radius: 999px; border: 1px solid #cbd5e1; display: inline-flex; align-items: center; gap: 4px;">
                                                <span class="color-chip-dot" style="width: 7px; height: 7px; border-radius: 50%; background-color: ${ord.variant_color_code || '#334155'}; display: inline-block;"></span>
                                                ${ord.variant_color}
                                            </span>
                                        ` : ''}
                                    </div>
                                    <div class="orders-item-meta">
                                        <span>📅 ${ord.start_date} &rarr; ${ord.end_date} (${ord.total_days || 1} Days)</span>
                                        <span>🚚 ${ord.delivery_type || 'Store Pickup'}</span>
                                    </div>
                                    <div style="font-size: 11.5px; color: #64748b; margin-top: 3px;">
                                        Customer: <b>${ord.customer_name || 'Customer'}</b> (📞 ${ord.customer_phone})
                                    </div>
                                </div>
                                <div class="orders-item-pricing">
                                    <div class="orders-total-amt">₹${(ord.total_amount || 0).toLocaleString('en-IN')}</div>
                                    <div class="orders-deposit-amt">Deposit: ₹${(ord.deposit_amount || 0).toLocaleString('en-IN')}</div>
                                    <span style="font-size: 10px; color: #10b981; font-weight: 700;">100% Refundable</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                ordersModalBody.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; font-size: 12.5px;">
                        <div>
                            <span>Customer: <b>${customer ? customer.name : targetPhone}</b></span>
                            <span style="color: #64748b; margin-left: 8px;">(${orders.length} Total Bookings, ${activeCount} Active)</span>
                        </div>
                        <div style="font-weight: 700; color: #10b981;">
                            Total Deposit in Escrow: ₹${totalDeposit.toLocaleString('en-IN')}
                        </div>
                    </div>

                    <div class="orders-list-scroll">
                        ${ordersHtml}
                    </div>

                    <div style="display: flex; justify-content: flex-end; align-items: center; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 4px;">
                        <button type="button" class="btn-confirm-cancel" onclick="closeOrdersModal()" style="padding: 9px 18px; font-size: 13px;">
                            <span>Close</span>
                        </button>
                    </div>
                `;
            } else {
                ordersModalBody.innerHTML = `
                    <div style="text-align: center; padding: 28px 16px; background: #f8fafc; border-radius: 14px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 40px; margin-bottom: 8px;">📭</div>
                        <h4 style="font-size: 16px; font-weight: 800; color: #0a192f; margin-bottom: 6px;">No Rental Bookings Found</h4>
                        <p style="font-size: 13px; color: #64748b; margin-bottom: 16px;">
                            No active or past bookings were found for phone <b>${targetPhone}</b>.
                        </p>
                        <div style="display: flex; justify-content: center; gap: 10px;">
                            <button type="button" class="btn-rent-direct" onclick="closeOrdersModal();" style="padding: 10px 20px;">
                                <span>🛍️ Browse Store Catalog</span>
                            </button>
                            <button type="button" class="btn-confirm-cancel" onclick="renderOrdersModalContent('')" style="padding: 10px 16px;">
                                <span>Try Another Phone</span>
                            </button>
                        </div>
                    </div>
                `;
            }
        } catch (err) {
            console.error('Error rendering orders modal:', err);
            ordersModalBody.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #ef4444;">
                    <p style="font-size: 13.5px; font-weight: 700;">Error fetching orders.</p>
                    <button type="button" class="btn-confirm-cancel" onclick="renderOrdersModalContent('${targetPhone}')" style="margin-top: 8px; padding: 6px 14px;">Retry</button>
                </div>
            `;
        }
    }

    window.handleOrdersPhoneSearch = (e) => {
        e.preventDefault();
        const inp = document.getElementById('ordersPhoneInput');
        if (inp && inp.value.trim()) {
            renderOrdersModalContent(inp.value.trim());
        }
    };

    window.quickLoginAndShowOrders = async () => {
        const demoUser = {
            id: 1,
            name: 'Rahul Sharma',
            email: 'rahul.sharma@example.com',
            phone: '9876543210',
            address: 'Flat 402, Green Valley Heights, MG Road',
            city: 'Pune',
            pincode: '411001'
        };
        localStorage.setItem('renthub_customer_token', 'demo_customer_token');
        localStorage.setItem('renthub_customer_data', JSON.stringify(demoUser));
        checkAccountAuthState();
        await checkOrdersCount();
        await renderOrdersModalContent('9876543210');
        showStoreToast('Logged in as Rahul Sharma! 🎉', 'success');
    };

    // Initial Load & Auth State Check
    checkAccountAuthState();
    checkOrdersCount();
    loadStoreData();
});
