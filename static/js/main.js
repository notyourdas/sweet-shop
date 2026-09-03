/**
 * main.js - MithAI Sweet Shop Customer Storefront
 * Vanilla JavaScript managing sweets catalog display, filtering,
 * shopping cart, and Firebase sale registrations via Flask API.
 */

// State
let allSweets = [];
let cart = [];
let selectedQuickBuySweet = null;
let currentUser = null;

// DOM Elements
const sweetsLoading = document.getElementById('sweetsLoading');
const sweetsGrid = document.getElementById('sweetsGrid');
const cartBadge = document.getElementById('cartBadge');
const cartItemsList = document.getElementById('cartItemsList');
const cartEmptyMessage = document.getElementById('cartEmptyMessage');
const cartFooter = document.getElementById('cartFooter');
const cartTotalItems = document.getElementById('cartTotalItems');
const cartTotalAmount = document.getElementById('cartTotalAmount');
const checkoutCartBtn = document.getElementById('checkoutCartBtn');
const cartCustomerName = document.getElementById('cartCustomerName');

// User Auth DOM Elements
const navUserLoggedOut = document.getElementById('navUserLoggedOut');
const navUserLoggedIn = document.getElementById('navUserLoggedIn');
const navUserName = document.getElementById('navUserName');
const navUserEmailHeader = document.getElementById('navUserEmailHeader');
const adminPortalItem = document.getElementById('adminPortalItem');
const navLogoutBtn = document.getElementById('navLogoutBtn');
const navMyOrdersBtn = document.getElementById('navMyOrdersBtn');

// Auth Modal Elements
const authModalElement = document.getElementById('authModal');
const authModal = authModalElement ? new bootstrap.Modal(authModalElement) : null;
const customerLoginForm = document.getElementById('customerLoginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const loginSpinner = document.getElementById('loginSpinner');
const loginAlert = document.getElementById('loginAlert');
const fillDemoCustomerBtn = document.getElementById('fillDemoCustomerBtn');

const customerSignupForm = document.getElementById('customerSignupForm');
const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupRole = document.getElementById('signupRole');
const signupAdminCodeGroup = document.getElementById('signupAdminCodeGroup');
const signupAdminCode = document.getElementById('signupAdminCode');
const signupPhone = document.getElementById('signupPhone');
const signupSubmitBtn = document.getElementById('signupSubmitBtn');
const signupSpinner = document.getElementById('signupSpinner');
const signupAlert = document.getElementById('signupAlert');

// Orders Modal Elements
const ordersModalElement = document.getElementById('ordersModal');
const ordersModal = ordersModalElement ? new bootstrap.Modal(ordersModalElement) : null;
const ordersLoading = document.getElementById('ordersLoading');
const ordersListContainer = document.getElementById('ordersListContainer');

// Quick Buy Modal Elements
const quickBuyModalElement = document.getElementById('quickBuyModal');
const quickBuyModal = new bootstrap.Modal(quickBuyModalElement);
const modalSweetImg = document.getElementById('modalSweetImg');
const modalSweetName = document.getElementById('modalSweetName');
const modalSweetUnit = document.getElementById('modalSweetUnit');
const modalSweetPrice = document.getElementById('modalSweetPrice');
const modalSweetQty = document.getElementById('modalSweetQty');
const modalCustomerName = document.getElementById('modalCustomerName');
const modalTotalPayable = document.getElementById('modalTotalPayable');
const modalConfirmBuyBtn = document.getElementById('modalConfirmBuyBtn');
const modalBuySpinner = document.getElementById('modalBuySpinner');
const modalQtyMinus = document.getElementById('modalQtyMinus');
const modalQtyPlus = document.getElementById('modalQtyPlus');

// Toast
const toastElement = document.getElementById('orderSuccessToast');
const toastMessage = document.getElementById('toastMessage');
const orderToast = new bootstrap.Toast(toastElement, { delay: 4500 });

// ---------------------------------------------------------------------------
// 1. Fetch Sweets Catalog from Firebase via Flask API
// ---------------------------------------------------------------------------
async function fetchSweets() {
  try {
    const response = await fetch('/api/sweets');
    const data = await response.json();
    if (data.status === 'success' && Array.isArray(data.sweets)) {
      allSweets = data.sweets;
      renderSweets(allSweets);
    } else {
      sweetsGrid.innerHTML = `
        <div class="col-12 text-center py-5">
          <p class="text-danger fw-bold">Failed to load sweets catalog from Firebase.</p>
          <button class="btn btn-brand btn-sm" onclick="fetchSweets()">Retry</button>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error fetching sweets:', error);
    sweetsGrid.innerHTML = `
      <div class="col-12 text-center py-5">
        <p class="text-danger fw-bold">Network error while connecting to server.</p>
        <button class="btn btn-brand btn-sm" onclick="fetchSweets()">Retry</button>
      </div>
    `;
  } finally {
    sweetsLoading.classList.add('d-none');
    sweetsGrid.classList.remove('d-none');
  }
}

// ---------------------------------------------------------------------------
// 2. Render Sweets in Grid (with Authentic Indian Sweet Photos)
// ---------------------------------------------------------------------------
function renderSweets(sweets) {
  if (!sweets || sweets.length === 0) {
    sweetsGrid.innerHTML = `
      <div class="col-12 text-center py-5">
        <p class="text-muted">No sweets found matching this category.</p>
      </div>
    `;
    return;
  }

  sweetsGrid.innerHTML = sweets.map((sweet, index) => {
    // Generate accurate fallback based on name
    const sweetSlug = (sweet.name || 'sweet').toLowerCase().replace(/[^a-z0-9]/g, '_');
    const localImg = `/static/images/sweets/${sweetSlug}.jpg`;
    const fallbackImg = sweet.fallback_url || localImg;
    const imgUrl = sweet.image_url || localImg;
    const rating = sweet.rating || 4.8;
    const unit = sweet.unit || 'Standard Box';
    const category = sweet.category || 'Traditional';

    return `
      <div class="col-sm-6 col-lg-4 col-xl-3">
        <div class="card sweet-card h-100 rounded-3 overflow-hidden shadow-sm d-flex flex-column">
          <div class="sweet-img-wrapper position-relative">
            <img src="${imgUrl}" alt="${sweet.name}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackImg}'">
            <span class="sweet-category-badge">${category}</span>
            <span class="sweet-rating-badge">★ ${rating}</span>
          </div>
          <div class="card-body p-3 d-flex flex-column flex-grow-1">
            <div class="d-flex justify-content-between align-items-baseline mb-1">
              <h5 class="fw-bold mb-0 text-dark">${sweet.name}</h5>
              <span class="fs-5 fw-bold text-brand">₹${Number(sweet.price).toFixed(0)}</span>
            </div>
            <p class="text-muted small mb-2">${unit}</p>
            <p class="card-text text-secondary small flex-grow-1 mb-3" style="line-height: 1.4;">
              ${sweet.description || 'Authentic traditional Indian sweet prepared fresh daily.'}
            </p>

            <div class="mt-auto pt-2 border-top">
              <div class="d-flex gap-2">
                <button class="btn btn-outline-brand btn-sm flex-fill fw-semibold d-flex align-items-center justify-content-center" onclick="addToCart('${sweet.name}', ${sweet.price}, '${imgUrl}')">
                  <i class="bi bi-cart-plus me-1"></i> Add
                </button>
                <button class="btn btn-brand btn-sm flex-fill fw-bold d-flex align-items-center justify-content-center" onclick="openQuickBuy('${sweet.name}', ${sweet.price}, '${imgUrl}', '${unit}')">
                  <i class="bi bi-lightning-fill me-1"></i> Buy Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ---------------------------------------------------------------------------
// 3. Category Filter Handlers
// ---------------------------------------------------------------------------
document.getElementById('categoryFilters').addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') {
    // Toggle active classes
    document.querySelectorAll('#categoryFilters button').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');

    const selectedCategory = e.target.getAttribute('data-category');
    if (selectedCategory === 'All') {
      renderSweets(allSweets);
    } else {
      const filtered = allSweets.filter(s => s.category && s.category.toLowerCase().includes(selectedCategory.toLowerCase()));
      renderSweets(filtered);
    }
  }
});

// ---------------------------------------------------------------------------
// 4. Shopping Cart Management
// ---------------------------------------------------------------------------
function addToCart(name, price, imgUrl) {
  const existing = cart.find(item => item.name === name);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      name: name,
      price: Number(price),
      imgUrl: imgUrl,
      quantity: 1
    });
  }
  updateCartUI();
  showToast(`Added 1x ${name} to your sweet box!`);
}

function changeCartQty(name, delta) {
  const item = cart.find(i => i.name === name);
  if (item) {
    item.quantity += delta;
    if (item.quantity <= 0) {
      cart = cart.filter(i => i.name !== name);
    }
  }
  updateCartUI();
}

function updateCartUI() {
  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  cartBadge.textContent = totalCount;

  if (cart.length === 0) {
    cartEmptyMessage.classList.remove('d-none');
    cartItemsList.classList.add('d-none');
    cartFooter.classList.add('d-none');
  } else {
    cartEmptyMessage.classList.add('d-none');
    cartItemsList.classList.remove('d-none');
    cartFooter.classList.remove('d-none');

    cartTotalItems.textContent = totalCount;
    cartTotalAmount.textContent = `₹${totalAmount.toFixed(2)}`;

    cartItemsList.innerHTML = cart.map(item => `
      <div class="cart-item d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <img src="${item.imgUrl}" alt="${item.name}" class="cart-item-img">
          <div>
            <h6 class="fw-bold mb-0 text-dark">${item.name}</h6>
            <small class="text-muted">₹${item.price.toFixed(0)} each</small>
          </div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-secondary px-2" onclick="changeCartQty('${item.name}', -1)">-</button>
            <span class="btn btn-light px-2 fw-bold disabled text-dark">${item.quantity}</span>
            <button class="btn btn-outline-secondary px-2" onclick="changeCartQty('${item.name}', 1)">+</button>
          </div>
          <span class="fw-bold text-brand ms-1" style="min-width: 55px; text-align: right;">
            ₹${(item.price * item.quantity).toFixed(0)}
          </span>
        </div>
      </div>
    `).join('');
  }
}

// ---------------------------------------------------------------------------
// 5. Checkout Cart Items into Firebase
// ---------------------------------------------------------------------------
checkoutCartBtn.addEventListener('click', async () => {
  if (cart.length === 0) return;

  const customer = cartCustomerName.value.trim() || 'Valued Customer';
  checkoutCartBtn.disabled = true;
  checkoutCartBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Processing...`;

  try {
    // Register each sweet item in Firebase via Flask /api/buy
    let successCount = 0;
    for (const item of cart) {
      const res = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sweet_name: item.name,
          price: item.price,
          quantity: item.quantity,
          customer_name: customer
        })
      });
      if (res.ok) successCount++;
    }

    // Clear cart
    const purchasedItemCount = cart.length;
    cart = [];
    updateCartUI();

    // Close offcanvas
    const offcanvasInstance = bootstrap.Offcanvas.getInstance(document.getElementById('cartOffcanvas'));
    if (offcanvasInstance) offcanvasInstance.hide();

    showToast(`🎉 Thank you, ${customer}! ${purchasedItemCount} item(s) ordered and saved to Firebase Firestore.`);
  } catch (error) {
    console.error('Error during checkout:', error);
    alert('An error occurred while saving your order to Firebase. Please try again.');
  } finally {
    checkoutCartBtn.disabled = false;
    checkoutCartBtn.innerHTML = `<i class="bi bi-check-circle-fill me-2"></i> Confirm & Buy Sweets`;
  }
});

// ---------------------------------------------------------------------------
// 6. Single-Click "Buy Now" Quick Modal Logic
// ---------------------------------------------------------------------------
function openQuickBuy(name, price, imgUrl, unit) {
  selectedQuickBuySweet = { name, price: Number(price), imgUrl, unit };

  modalSweetImg.src = imgUrl;
  modalSweetName.textContent = name;
  modalSweetUnit.textContent = unit;
  modalSweetPrice.textContent = `₹${Number(price).toFixed(2)}`;
  modalSweetQty.value = 1;
  updateModalTotal();

  quickBuyModal.show();
}

function updateModalTotal() {
  if (!selectedQuickBuySweet) return;
  const qty = parseInt(modalSweetQty.value, 10) || 1;
  const total = selectedQuickBuySweet.price * qty;
  modalTotalPayable.textContent = `₹${total.toFixed(2)}`;
}

modalQtyMinus.addEventListener('click', () => {
  let val = parseInt(modalSweetQty.value, 10);
  if (val > 1) {
    modalSweetQty.value = val - 1;
    updateModalTotal();
  }
});

modalQtyPlus.addEventListener('click', () => {
  let val = parseInt(modalSweetQty.value, 10);
  if (val < 20) {
    modalSweetQty.value = val + 1;
    updateModalTotal();
  }
});

modalConfirmBuyBtn.addEventListener('click', async () => {
  if (!selectedQuickBuySweet) return;

  const qty = parseInt(modalSweetQty.value, 10) || 1;
  const customer = modalCustomerName.value.trim() || 'Valued Customer';

  modalConfirmBuyBtn.disabled = true;
  modalBuySpinner.classList.remove('d-none');

  try {
    const res = await fetch('/api/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sweet_name: selectedQuickBuySweet.name,
        price: selectedQuickBuySweet.price,
        quantity: qty,
        customer_name: customer
      })
    });

    const result = await res.json();
    if (res.ok && result.status === 'success') {
      quickBuyModal.hide();
      showToast(`🎉 Order confirmed! Registered ${qty}x ${selectedQuickBuySweet.name} into Firebase for ${customer}.`);
    } else {
      alert(`Could not complete purchase: ${result.message || 'Server error'}`);
    }
  } catch (err) {
    console.error('Buy now error:', err);
    alert('Failed to connect to Firebase. Please try again.');
  } finally {
    modalConfirmBuyBtn.disabled = false;
    modalBuySpinner.classList.add('d-none');
  }
});

// ---------------------------------------------------------------------------
// 7. Customer & Admin Authentication (Firebase Auth & Firestore DB)
// ---------------------------------------------------------------------------
async function parseJsonSafe(res) {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch (err) {
    return { status: 'error', message: 'Server communication error. Please try again.' };
  }
}

function authFetch(url, options = {}) {
  const token = localStorage.getItem('mithai_user_token') || localStorage.getItem('mithai_admin_token');
  const headers = { ...(options.headers || {}) };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Admin-Token'] = token;
  }
  return fetch(url, {
    ...options,
    credentials: 'include',
    headers
  });
}

async function checkUserAuth() {
  try {
    const res = await authFetch('/api/auth/me');
    const data = await parseJsonSafe(res);

    if (data.authenticated && data.user) {
      currentUser = data.user;
      renderLoggedInNav(currentUser);
    } else {
      currentUser = null;
      renderLoggedOutNav();
    }
  } catch (err) {
    console.warn('User auth check failed:', err);
    currentUser = null;
    renderLoggedOutNav();
  }
}

function renderLoggedInNav(user) {
  if (navUserLoggedOut) navUserLoggedOut.classList.add('d-none');
  if (navUserLoggedIn) {
    navUserLoggedIn.classList.remove('d-none');
    navUserLoggedIn.classList.add('d-inline-block');
  }
  if (navUserName) navUserName.textContent = user.name || (user.role === 'admin' ? 'Administrator' : 'Customer');
  if (navUserEmailHeader) navUserEmailHeader.textContent = user.email || '';

  // Show Admin Portal link in dropdown if user has admin privileges
  if (adminPortalItem) {
    if (user.role === 'admin') {
      adminPortalItem.classList.remove('d-none');
    } else {
      adminPortalItem.classList.add('d-none');
    }
  }

  // Prepopulate customer name fields
  if (modalCustomerName && (!modalCustomerName.value || modalCustomerName.value === 'Priya Patel')) {
    modalCustomerName.value = user.name;
  }
  if (cartCustomerName && (!cartCustomerName.value || cartCustomerName.value === 'Priya Patel')) {
    cartCustomerName.value = user.name;
  }
}

function renderLoggedOutNav() {
  if (navUserLoggedOut) navUserLoggedOut.classList.remove('d-none');
  if (navUserLoggedIn) {
    navUserLoggedIn.classList.add('d-none');
    navUserLoggedIn.classList.remove('d-inline-block');
  }
  if (adminPortalItem) adminPortalItem.classList.add('d-none');
}

// 7a. Fill Demo Customer Credentials
if (fillDemoCustomerBtn) {
  fillDemoCustomerBtn.addEventListener('click', () => {
    loginEmail.value = 'user@mithai.com';
    loginPassword.value = 'user123';
  });
}

// Quick Fill Sample Customer for Signup
const quickFillCustomerSignup = document.getElementById('quickFillCustomerSignup');
if (quickFillCustomerSignup) {
  quickFillCustomerSignup.addEventListener('click', () => {
    signupName.value = 'Ramesh Verma';
    signupEmail.value = `customer_${Math.floor(100 + Math.random() * 900)}@mithai.com`;
    signupPassword.value = 'password123';
    signupRole.value = 'customer';
    if (signupPhone) signupPhone.value = '+91 98200 12345';
    if (signupAdminCodeGroup) signupAdminCodeGroup.classList.add('d-none');
    if (signupAdminCode) signupAdminCode.required = false;
  });
}

// Quick Fill Sample Admin for Signup
const quickFillAdminSignup = document.getElementById('quickFillAdminSignup');
if (quickFillAdminSignup) {
  quickFillAdminSignup.addEventListener('click', () => {
    signupName.value = 'Vikram Malhotra';
    signupEmail.value = `admin_${Math.floor(100 + Math.random() * 900)}@mithai.com`;
    signupPassword.value = 'adminpass123';
    signupRole.value = 'admin';
    if (signupPhone) signupPhone.value = '+91 98111 54321';
    if (signupAdminCodeGroup) signupAdminCodeGroup.classList.remove('d-none');
    if (signupAdminCode) {
      signupAdminCode.required = true;
      signupAdminCode.value = 'admin123';
    }
  });
}

// Auto Fill Admin Passcode button
const autoFillPasscodeBtn = document.getElementById('autoFillPasscodeBtn');
if (autoFillPasscodeBtn && signupAdminCode) {
  autoFillPasscodeBtn.addEventListener('click', () => {
    signupAdminCode.value = 'admin123';
  });
}

// Password toggle helper for signup
const toggleSignupPassBtn = document.getElementById('toggleSignupPassBtn');
const toggleSignupPassIcon = document.getElementById('toggleSignupPassIcon');
if (toggleSignupPassBtn && signupPassword) {
  toggleSignupPassBtn.addEventListener('click', () => {
    const isPass = signupPassword.type === 'password';
    signupPassword.type = isPass ? 'text' : 'password';
    if (toggleSignupPassIcon) {
      toggleSignupPassIcon.className = isPass ? 'bi bi-eye-slash' : 'bi bi-eye';
    }
  });
}

// Admin passcode toggle helper
const toggleAdminCodeBtn = document.getElementById('toggleAdminCodeBtn');
const toggleAdminCodeIcon = document.getElementById('toggleAdminCodeIcon');
if (toggleAdminCodeBtn && signupAdminCode) {
  toggleAdminCodeBtn.addEventListener('click', () => {
    const isPass = signupAdminCode.type === 'password';
    signupAdminCode.type = isPass ? 'text' : 'password';
    if (toggleAdminCodeIcon) {
      toggleAdminCodeIcon.className = isPass ? 'bi bi-eye-slash' : 'bi bi-eye';
    }
  });
}

// 7b. Role selector change in signup (toggle admin passcode)
if (signupRole) {
  signupRole.addEventListener('change', () => {
    if (signupRole.value === 'admin') {
      signupAdminCodeGroup.classList.remove('d-none');
      signupAdminCode.required = true;
      if (!signupAdminCode.value) {
        signupAdminCode.value = 'admin123';
      }
    } else {
      signupAdminCodeGroup.classList.add('d-none');
      signupAdminCode.required = false;
    }
  });
}

// 7c. Customer Login Submit
if (customerLoginForm) {
  customerLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    loginSubmitBtn.disabled = true;
    loginSpinner.classList.remove('d-none');
    loginAlert.innerHTML = '';

    try {
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await parseJsonSafe(res);

      if (res.ok && data.status === 'success') {
        currentUser = data.user;
        if (data.token) {
          localStorage.setItem('mithai_user_token', data.token);
          if (currentUser.role === 'admin') {
            localStorage.setItem('mithai_admin_token', data.token);
          }
        }
        renderLoggedInNav(currentUser);
        if (authModal) authModal.hide();
        showToast(`👋 Welcome back, ${currentUser.name}! You are now signed in with Firebase.`);
      } else {
        loginAlert.innerHTML = `
          <div class="alert alert-danger py-2 px-3 small rounded-3 mb-2">
            ${data.message || 'Invalid email or password.'}
          </div>
        `;
      }
    } catch (err) {
      console.error('Login error:', err);
      loginAlert.innerHTML = `
        <div class="alert alert-danger py-2 px-3 small rounded-3 mb-2">
          Network error. Please try again.
        </div>
      `;
    } finally {
      loginSubmitBtn.disabled = false;
      loginSpinner.classList.add('d-none');
    }
  });
}

// 7d. Customer & Admin Signup Submit with Firebase
if (customerSignupForm) {
  customerSignupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;
    const role = signupRole.value;
    const admin_code = signupAdminCode ? signupAdminCode.value.trim() : '';
    const phone = signupPhone ? signupPhone.value.trim() : '';

    signupSubmitBtn.disabled = true;
    signupSpinner.classList.remove('d-none');
    signupAlert.classList.add('d-none');
    signupAlert.innerHTML = '';

    try {
      const res = await authFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, admin_code, phone })
      });
      const data = await parseJsonSafe(res);

      if (res.ok && data.status === 'success') {
        currentUser = data.user;
        if (data.token) {
          localStorage.setItem('mithai_user_token', data.token);
          if (currentUser.role === 'admin') {
            localStorage.setItem('mithai_admin_token', data.token);
          }
        }
        renderLoggedInNav(currentUser);
        if (authModal) authModal.hide();

        if (currentUser.role === 'admin') {
          showToast(`🎉 Firebase Admin account created for ${currentUser.name}! Accessing store intelligence...`);
          setTimeout(() => {
            if (confirm(`Welcome Administrator ${currentUser.name}! Would you like to proceed to the Admin Intelligence Dashboard now?`)) {
              window.location.href = '/admin';
            }
          }, 500);
        } else {
          showToast(`🎉 Account created with Firebase! Welcome to MithAI Sweet Shop, ${currentUser.name}!`);
        }
      } else {
        signupAlert.classList.remove('d-none');
        signupAlert.innerHTML = `
          <div class="alert alert-danger py-2 px-3 small rounded-3 mb-0">
            ${data.message || 'Signup failed. Please check inputs.'}
          </div>
        `;
      }
    } catch (err) {
      console.error('Signup error:', err);
      signupAlert.classList.remove('d-none');
      signupAlert.innerHTML = `
        <div class="alert alert-danger py-2 px-3 small rounded-3 mb-0">
          Network communication error. Please try again.
        </div>
      `;
    } finally {
      signupSubmitBtn.disabled = false;
      signupSpinner.classList.add('d-none');
    }
  });
}

// 7e. Customer Logout
if (navLogoutBtn) {
  navLogoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout error:', err);
    }
    currentUser = null;
    renderLoggedOutNav();
    showToast('You have been signed out.');
  });
}

// 7f. View My Orders History
if (navMyOrdersBtn) {
  navMyOrdersBtn.addEventListener('click', async () => {
    if (!ordersModal) return;
    ordersModal.show();
    ordersLoading.classList.remove('d-none');
    ordersListContainer.classList.add('d-none');

    try {
      const res = await fetch('/api/user/orders');
      const data = await res.json();

      if (res.ok && data.orders && data.orders.length > 0) {
        ordersListContainer.innerHTML = `
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light small text-uppercase">
                <tr>
                  <th>Order Date</th>
                  <th>Sweet Ordered</th>
                  <th class="text-center">Qty</th>
                  <th class="text-end">Total</th>
                  <th class="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                ${data.orders.map(o => {
                  const dateStr = o.timestamp ? new Date(o.timestamp).toLocaleString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : 'Recent';
                  return `
                    <tr>
                      <td class="small text-muted font-monospace">${dateStr}</td>
                      <td class="fw-bold">${o.sweet_name}</td>
                      <td class="text-center"><span class="badge bg-light text-dark border">${o.quantity}</span></td>
                      <td class="text-end fw-bold text-brand">₹${Number(o.total_price || 0).toFixed(2)}</td>
                      <td class="text-center"><span class="badge bg-success-subtle text-success border border-success-subtle">Completed</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      } else {
        ordersListContainer.innerHTML = `
          <div class="text-center py-4">
            <i class="bi bi-box2 text-muted fs-1 mb-2 d-block"></i>
            <h6 class="text-dark fw-bold">No previous orders found</h6>
            <p class="text-muted small">Once you buy sweets from our shop, your transaction history will appear here!</p>
          </div>
        `;
      }
    } catch (err) {
      console.error('Error fetching customer orders:', err);
      ordersListContainer.innerHTML = `
        <div class="alert alert-warning text-center small mb-0">
          Failed to load order history from Firebase.
        </div>
      `;
    } finally {
      ordersLoading.classList.add('d-none');
      ordersListContainer.classList.remove('d-none');
    }
  });
}

// ---------------------------------------------------------------------------
// 8. Toast Helper
// ---------------------------------------------------------------------------
function showToast(msg) {
  toastMessage.textContent = msg;
  orderToast.show();
}

// Initial boot
document.addEventListener('DOMContentLoaded', () => {
  fetchSweets();
  checkUserAuth();
});
