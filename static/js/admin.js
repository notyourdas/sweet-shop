/**
 * admin.js - MithAI Sweet Shop Admin Portal
 * Protected analytics dashboard with Authentication Gate, Chart.js visualizations,
 * and live sales transactions ledger backed by Flask & Firebase.
 */

let dailySalesChartInstance = null;
let sweetDistChartInstance = null;
let cachedSales = [];

async function parseJsonSafe(res) {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch (err) {
    return { status: 'error', message: 'Server communication error. Please try again.' };
  }
}

// Helper for authenticated requests supporting both session cookies and Bearer tokens
function adminFetch(url, options = {}) {
  const token = localStorage.getItem('mithai_admin_token') || 'admin123';
  const headers = Object.assign({}, options.headers || {});
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Admin-Token'] = token;
  }
  options.headers = headers;
  options.credentials = 'include';
  return fetch(url, options);
}

document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
  setupAuthEventListeners();
  setupDashboardEventListeners();
});

// ---------------------------------------------------------------------------
// 1. Authentication State Check & Gate Management
// ---------------------------------------------------------------------------
async function checkAdminAuth() {
  try {
    const res = await adminFetch('/api/auth/me');
    const data = await parseJsonSafe(res);

    if (data.authenticated && data.user && data.user.role === 'admin') {
      unlockAdminDashboard(data.user);
    } else {
      // Check if stored token can restore session
      const existingToken = localStorage.getItem('mithai_admin_token');
      if (existingToken) {
        const tokenRes = await fetch(`/api/auth/me?token=${encodeURIComponent(existingToken)}`, { credentials: 'include' });
        const tokenData = await parseJsonSafe(tokenRes);
        if (tokenData.authenticated && tokenData.user && tokenData.user.role === 'admin') {
          unlockAdminDashboard(tokenData.user);
          return;
        }
      }
      lockAdminDashboard();
    }
  } catch (err) {
    console.error('Error checking auth state:', err);
    lockAdminDashboard();
  }
}

function unlockAdminDashboard(adminUser) {
  const gate = document.getElementById('adminAuthGate');
  const content = document.getElementById('adminDashboardContent');
  const userSection = document.getElementById('adminUserSection');
  const displayName = document.getElementById('adminDisplayName');

  if (gate) gate.classList.add('d-none');
  if (content) content.classList.remove('d-none');
  if (userSection) userSection.classList.remove('d-none');
  if (displayName) displayName.textContent = adminUser.name || 'Store Admin';

  // Load analytics and sales ledger
  loadDashboardMetrics();
  loadSalesLedger();
}

function lockAdminDashboard() {
  const gate = document.getElementById('adminAuthGate');
  const content = document.getElementById('adminDashboardContent');
  const userSection = document.getElementById('adminUserSection');

  if (gate) gate.classList.remove('d-none');
  if (content) content.classList.add('d-none');
  if (userSection) userSection.classList.add('d-none');
}

// ---------------------------------------------------------------------------
// 2. Auth Event Handlers (Instant Login, Password Toggle, Login, Signup, Logout)
// ---------------------------------------------------------------------------
async function doQuickAdmin(email) {
  const alertBox = document.getElementById('adminLoginAlert');
  if (alertBox) alertBox.classList.add('d-none');

  try {
    const res = await fetch('/api/auth/quick-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (res.ok && data.status === 'success') {
      if (data.token) {
        localStorage.setItem('mithai_admin_token', data.token);
      }
      unlockAdminDashboard(data.user);
    } else {
      if (alertBox) {
        alertBox.textContent = data.message || 'Instant login failed. Please try credentials.';
        alertBox.classList.remove('d-none');
      }
    }
  } catch (err) {
    console.error('Instant admin login error:', err);
    if (alertBox) {
      alertBox.textContent = 'Connection error during instant login.';
      alertBox.classList.remove('d-none');
    }
  }
}

function setupAuthEventListeners() {
  // Instant 1-Click Login Buttons
  const instantLoginDefaultBtn = document.getElementById('instantLoginDefaultBtn');
  if (instantLoginDefaultBtn) {
    instantLoginDefaultBtn.addEventListener('click', () => doQuickAdmin('admin@mithai.com'));
  }

  const instantLoginRushikeshBtn = document.getElementById('instantLoginRushikeshBtn');
  if (instantLoginRushikeshBtn) {
    instantLoginRushikeshBtn.addEventListener('click', () => doQuickAdmin('rushikeshphonea17@gmail.com'));
  }

  // Quick fill chips
  const quickFillAdmin1 = document.getElementById('quickFillAdmin1');
  if (quickFillAdmin1) {
    quickFillAdmin1.addEventListener('click', () => {
      const emailInput = document.getElementById('adminEmail');
      const passInput = document.getElementById('adminPassword');
      if (emailInput) emailInput.value = 'admin@mithai.com';
      if (passInput) passInput.value = 'admin123';
    });
  }

  const quickFillAdmin2 = document.getElementById('quickFillAdmin2');
  if (quickFillAdmin2) {
    quickFillAdmin2.addEventListener('click', () => {
      const emailInput = document.getElementById('adminEmail');
      const passInput = document.getElementById('adminPassword');
      if (emailInput) emailInput.value = 'rushikeshphonea17@gmail.com';
      if (passInput) passInput.value = 'admin123';
    });
  }

  // Fill Demo Admin Credentials button
  const fillDemoAdminBtn = document.getElementById('fillDemoAdminBtn');
  if (fillDemoAdminBtn) {
    fillDemoAdminBtn.addEventListener('click', () => {
      const emailInput = document.getElementById('adminEmail');
      const passInput = document.getElementById('adminPassword');
      if (emailInput) emailInput.value = 'admin@mithai.com';
      if (passInput) passInput.value = 'admin123';
    });
  }

  // Password visibility toggle helpers
  function setupPasswordToggle(btnId, inputId, iconId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (btn && input) {
      btn.addEventListener('click', () => {
        if (input.type === 'password') {
          input.type = 'text';
          if (icon) {
            icon.classList.remove('bi-eye');
            icon.classList.add('bi-eye-slash');
          }
        } else {
          input.type = 'password';
          if (icon) {
            icon.classList.remove('bi-eye-slash');
            icon.classList.add('bi-eye');
          }
        }
      });
    }
  }

  setupPasswordToggle('toggleLoginPasswordBtn', 'adminPassword', 'toggleLoginPasswordIcon');
  setupPasswordToggle('toggleSignupPasswordBtn', 'adminSignupPassword', 'toggleSignupPasswordIcon');
  setupPasswordToggle('togglePasscodeBtn', 'adminSignupCode', 'togglePasscodeIcon');

  // Fill Passcode button in signup
  const fillPasscodeBtn = document.getElementById('fillPasscodeBtn');
  if (fillPasscodeBtn) {
    fillPasscodeBtn.addEventListener('click', () => {
      const codeInput = document.getElementById('adminSignupCode');
      if (codeInput) codeInput.value = 'admin123';
    });
  }

  // Admin Login Submission
  const adminLoginForm = document.getElementById('adminLoginForm');
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value;
      const alertBox = document.getElementById('adminLoginAlert');
      const spinner = document.getElementById('adminLoginSpinner');
      const submitBtn = document.getElementById('adminLoginSubmitBtn');

      alertBox.classList.add('d-none');
      spinner.classList.remove('d-none');
      submitBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password, required_role: 'admin' })
        });
        const data = await parseJsonSafe(res);

        if (res.ok && data.status === 'success') {
          if (data.token) {
            localStorage.setItem('mithai_admin_token', data.token);
          }
          unlockAdminDashboard(data.user);
        } else {
          alertBox.textContent = data.message || 'Invalid administrator credentials.';
          alertBox.classList.remove('d-none');
        }
      } catch (err) {
        alertBox.textContent = 'Connection error. Please try again.';
        alertBox.classList.remove('d-none');
      } finally {
        spinner.classList.add('d-none');
        submitBtn.disabled = false;
      }
    });
  }

  // Admin Signup Submission
  const adminSignupForm = document.getElementById('adminSignupForm');
  if (adminSignupForm) {
    adminSignupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('adminSignupName').value.trim();
      const email = document.getElementById('adminSignupEmail').value.trim();
      const password = document.getElementById('adminSignupPassword').value;
      const admin_code = document.getElementById('adminSignupCode').value.trim();
      const alertBox = document.getElementById('adminSignupAlert');
      const spinner = document.getElementById('adminSignupSpinner');
      const submitBtn = document.getElementById('adminSignupSubmitBtn');

      alertBox.classList.add('d-none');
      spinner.classList.remove('d-none');
      submitBtn.disabled = true;

      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name, email, password, role: 'admin', admin_code })
        });
        const data = await parseJsonSafe(res);

        if (res.ok && data.status === 'success') {
          if (data.token) {
            localStorage.setItem('mithai_admin_token', data.token);
          }
          unlockAdminDashboard(data.user);
        } else {
          alertBox.textContent = data.message || 'Failed to create admin account.';
          alertBox.classList.remove('d-none');
        }
      } catch (err) {
        alertBox.textContent = 'Connection error during admin signup.';
        alertBox.classList.remove('d-none');
      } finally {
        spinner.classList.add('d-none');
        submitBtn.disabled = false;
      }
    });
  }

  // Admin Logout
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', async () => {
      try {
        await adminFetch('/api/auth/logout', { method: 'POST' });
        localStorage.removeItem('mithai_admin_token');
        lockAdminDashboard();
      } catch (err) {
        console.error('Logout error:', err);
        localStorage.removeItem('mithai_admin_token');
        lockAdminDashboard();
      }
    });
  }
}

// ---------------------------------------------------------------------------
// 3. Dashboard Data & Chart Visualizations
// ---------------------------------------------------------------------------
function setupDashboardEventListeners() {
  const refreshMetricsBtn = document.getElementById('refreshMetricsBtn');
  if (refreshMetricsBtn) {
    refreshMetricsBtn.addEventListener('click', () => {
      loadDashboardMetrics();
      loadSalesLedger();
      showDashboardAlert('Dashboard metrics refreshed from Firebase.');
    });
  }

  const seedDataBtn = document.getElementById('seedDataBtn');
  if (seedDataBtn) {
    seedDataBtn.addEventListener('click', async () => {
      if (!confirm('This will seed the database with realistic sales data. Continue?')) return;
      try {
        const res = await adminFetch('/api/seed', { method: 'POST' });
        const data = await res.json();
        if (data.status === 'success') {
          showDashboardAlert('Sample sales, sweets, and accounts seeded successfully!');
          loadDashboardMetrics();
          loadSalesLedger();
        }
      } catch (err) {
        alert('Failed to re-seed data: ' + err.message);
      }
    });
  }

  const tableSearchInput = document.getElementById('tableSearchInput');
  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', (e) => {
      filterSalesTable(e.target.value.toLowerCase());
    });
  }

  const exportCsvBtn = document.getElementById('exportCsvBtn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportSalesToCSV);
  }
}

async function loadDashboardMetrics() {
  try {
    const res = await adminFetch('/api/admin/metrics');
    if (res.status === 401) {
      lockAdminDashboard();
      return;
    }
    const data = await res.json();

    if (data.status !== 'success') return;

    // Update KPIs
    document.getElementById('kpiTotalRevenue').textContent = `₹${data.total_revenue.toLocaleString('en-IN')}`;
    document.getElementById('kpiTotalOrders').textContent = data.total_orders.toLocaleString();
    document.getElementById('kpiUnitsSold').textContent = data.total_sweets_sold.toLocaleString();
    document.getElementById('kpiAvgOrder').textContent = `Avg Order: ₹${data.avg_order_value}`;
    document.getElementById('kpiTopSweet').textContent = data.top_sweet || 'Kaju Katli';

    // Update Forecast / Trend Summary
    if (data.trend_summary) {
      document.getElementById('trendSlopeLabel').textContent = `Slope: +₹${data.trend_summary.slope}/day`;
      document.getElementById('rSquaredValue').textContent = data.trend_summary.r_squared;
      document.getElementById('projectedRevenueValue').textContent = `₹${data.trend_summary.projected_7day_revenue.toLocaleString('en-IN')}`;
      document.getElementById('forecastTotalStat').textContent = `₹${data.trend_summary.projected_7day_revenue.toLocaleString('en-IN')}`;

      const badge = document.getElementById('trendDirectionBadge');
      if (badge) {
        if (data.trend_summary.direction === 'growing') {
          badge.className = 'badge bg-success rounded-pill px-3 py-1';
          badge.textContent = '🚀 Strong Growth Trend';
        } else {
          badge.className = 'badge bg-secondary rounded-pill px-3 py-1';
          badge.textContent = 'Stable Trend';
        }
      }
    }

    // Render Chart.js Visualizations
    renderDailySalesChart(data.daily_labels, data.daily_sales, data.regression_trend, data.forecast_labels, data.forecast_sales);
    renderSweetDistChart(data.sweet_labels, data.sweet_revenues);

  } catch (err) {
    console.error('Failed to load metrics:', err);
  }
}

function renderDailySalesChart(labels, sales, trend, forecastLabels, forecastSales) {
  const ctx = document.getElementById('dailySalesChart');
  if (!ctx) return;

  if (dailySalesChartInstance) {
    dailySalesChartInstance.destroy();
  }

  // Combine actual and forecast timeline
  const combinedLabels = [...labels, ...(forecastLabels || [])];
  const actualData = [...sales, ...new Array(forecastLabels ? forecastLabels.length : 0).fill(null)];
  const regressionData = [...trend, ...(forecastSales || [])];

  dailySalesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: combinedLabels,
      datasets: [
        {
          label: 'Daily Revenue (₹)',
          data: actualData,
          borderColor: '#d97706',
          backgroundColor: 'rgba(217, 119, 6, 0.1)',
          fill: true,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'NumPy Regression Fit & Forecast (₹)',
          data: regressionData,
          borderColor: '#2563eb',
          borderDash: [5, 5],
          tension: 0,
          borderWidth: 2,
          fill: false,
          pointRadius: (ctx) => (ctx.dataIndex >= labels.length ? 5 : 0),
          pointBackgroundColor: '#2563eb'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ₹${context.raw ? context.raw.toLocaleString() : 0}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => `₹${v.toLocaleString()}`
          }
        }
      }
    }
  });
}

function renderSweetDistChart(labels, revenues) {
  const ctx = document.getElementById('sweetDistributionChart');
  if (!ctx) return;

  if (sweetDistChartInstance) {
    sweetDistChartInstance.destroy();
  }

  const palette = [
    '#d97706', '#f59e0b', '#fbbf24', '#fde68a',
    '#059669', '#10b981', '#34d399', '#6ee7b7'
  ];

  sweetDistChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: revenues,
        backgroundColor: palette.slice(0, labels.length),
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12 } },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ₹${ctx.raw.toLocaleString()}`
          }
        }
      }
    }
  });
}

// ---------------------------------------------------------------------------
// 4. Sales Ledger Table & CSV Export
// ---------------------------------------------------------------------------
async function loadSalesLedger() {
  const tbody = document.getElementById('salesTableBody');
  if (!tbody) return;

  try {
    const res = await adminFetch('/api/sales');
    if (res.status === 401) {
      lockAdminDashboard();
      return;
    }
    const data = await res.json();

    if (data.status === 'success' && Array.isArray(data.sales)) {
      cachedSales = data.sales;
      renderSalesTable(cachedSales);
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-3">Error loading transactions.</td></tr>`;
  }
}

function renderSalesTable(sales) {
  const tbody = document.getElementById('salesTableBody');
  if (!tbody) return;

  if (!sales || sales.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No sales records registered yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = sales.slice(0, 100).map(s => {
    const dateStr = s.timestamp ? new Date(s.timestamp).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }) : 'Just now';

    return `
      <tr>
        <td class="font-monospace text-muted small">${(s.id || '').substring(0, 14)}...</td>
        <td class="text-nowrap">${dateStr}</td>
        <td class="fw-semibold text-dark">${s.sweet_name}</td>
        <td>₹${s.price}</td>
        <td><span class="badge bg-light text-dark border">${s.quantity || 1}</span></td>
        <td class="fw-bold text-success">₹${(s.total_price || (s.price * (s.quantity || 1))).toLocaleString()}</td>
        <td class="fw-medium">${s.customer_name || 'Guest'}</td>
        <td class="text-muted small">${s.customer_email || '—'}</td>
      </tr>
    `;
  }).join('');
}

function filterSalesTable(query) {
  if (!query) {
    renderSalesTable(cachedSales);
    return;
  }
  const filtered = cachedSales.filter(s =>
    (s.sweet_name || '').toLowerCase().includes(query) ||
    (s.customer_name || '').toLowerCase().includes(query) ||
    (s.customer_email || '').toLowerCase().includes(query)
  );
  renderSalesTable(filtered);
}

function exportSalesToCSV() {
  if (!cachedSales || cachedSales.length === 0) {
    alert('No sales data to export.');
    return;
  }

  const headers = ['Order ID', 'Timestamp', 'Sweet Item', 'Unit Price (INR)', 'Quantity', 'Total Amount (INR)', 'Customer Name', 'Customer Email'];
  const rows = cachedSales.map(s => [
    `"${s.id || ''}"`,
    `"${s.timestamp || ''}"`,
    `"${s.sweet_name || ''}"`,
    s.price || 0,
    s.quantity || 1,
    s.total_price || 0,
    `"${s.customer_name || ''}"`,
    `"${s.customer_email || ''}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `mithai_sales_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function showDashboardAlert(msg) {
  const alert = document.getElementById('dashboardAlert');
  const msgSpan = document.getElementById('dashboardAlertMsg');
  if (alert && msgSpan) {
    msgSpan.textContent = msg;
    alert.classList.remove('d-none');
    setTimeout(() => alert.classList.add('d-none'), 4000);
  }
}
