// ── GLOBAL STATE ──────────────────────────────────────────────────────────
const App = {
  user: null,
  token: null,
  config: null,
  currentPage: null,
  firebase: null,
  auth: null,
};

// ── INIT ──────────────────────────────────────────────────────────────────
async function initApp() {
  try {
    const res = await fetch('/api/config');
    App.config = await res.json();
    firebase.initializeApp(App.config.firebase);
    App.auth = firebase.auth();

    // Update library name in UI
    document.title = App.config.library.name + ' — LMS';

    // Auth state listener
    App.auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          App.token = token;
          const resp = await api('/auth/verify-token', 'POST', { token });
          if (resp.success) {
            App.user = resp.user;
            showApp();
          } else {
            showAuth();
          }
        } catch {
          showAuth();
        }
      } else {
        showAuth();
      }
    });
  } catch (err) {
    console.error('Init error:', err);
    showToast('Failed to connect to server. Please check your configuration.', 'error');
  }
}

// ── API HELPER ─────────────────────────────────────────────────────────────
async function api(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (App.token) opts.headers['Authorization'] = `Bearer ${App.token}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`/api/${endpoint}`, opts);
  const data = await res.json();
  if (!res.ok && !data.success) throw new Error(data.error || 'Request failed');
  return data;
}

// ── NAVIGATION ─────────────────────────────────────────────────────────────
function showApp() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('app-section').classList.remove('hidden');

  // Set sidebar user info
  const nameEl = document.getElementById('user-name-sidebar');
  const roleEl = document.getElementById('user-role-sidebar');
  const avatarEl = document.getElementById('user-avatar-sidebar');
  const libEl = document.getElementById('library-name-sidebar');

  if (nameEl) nameEl.textContent = App.user?.name || 'User';
  if (roleEl) roleEl.textContent = App.user?.role || 'member';
  if (avatarEl) avatarEl.textContent = (App.user?.name || 'U')[0].toUpperCase();
  if (libEl) libEl.textContent = App.config?.library?.name || 'Library';

  buildSidebarNav();

  // Default page based on role
  const defaultPage = App.user?.role === 'admin' ? 'dashboard' : 'browse';
  navigateTo(defaultPage);
}

function showAuth() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('app-section').classList.add('hidden');
  showPage('login-page');
}

function showPage(pageId) {
  document.querySelectorAll('.auth-page').forEach(p => p.classList.add('hidden'));
  const page = document.getElementById(pageId);
  if (page) page.classList.remove('hidden');
}

function buildSidebarNav() {
  const isAdmin = App.user?.role === 'admin';
  const nav = document.getElementById('sidebar-nav');
  const items = isAdmin ? [
    { label: 'Dashboard', icon: '🏠', page: 'dashboard' },
    { label: 'Books', icon: '📚', page: 'books' },
    { label: 'Issue Book', icon: '📤', page: 'issue' },
    { label: 'Transactions', icon: '🔄', page: 'transactions' },
    { label: 'Members', icon: '👥', page: 'members' },
    { label: 'Reservations', icon: '🔖', page: 'reservations' },
    { label: 'Library Report', icon: '📊', page: 'report' },
  ] : [
    { label: 'Browse Books', icon: '📚', page: 'browse' },
    { label: 'My Books', icon: '📖', page: 'mybooks' },
    { label: 'My Profile', icon: '👤', page: 'profile' },
  ];

  nav.innerHTML = items.map(item => `
    <div class="nav-item" data-page="${item.page}" onclick="navigateTo('${item.page}')">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
    </div>
  `).join('');
}

function navigateTo(page) {
  App.currentPage = page;
  // Update active nav
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
  closeSidebar();

  const main = document.getElementById('main-content');
  main.innerHTML = '<div class="flex-center" style="height:200px"><div class="loading-spinner" style="border-color:rgba(26,46,74,0.2);border-top-color:var(--navy)"></div></div>';

  // Route
  switch (page) {
    case 'dashboard': renderDashboard(); break;
    case 'books': renderBooksAdmin(); break;
    case 'browse': renderBrowse(); break;
    case 'issue': renderIssuePage(); break;
    case 'transactions': renderTransactions(); break;
    case 'members': renderMembers(); break;
    case 'reservations': renderReservations(); break;
    case 'report': renderReport(); break;
    case 'mybooks': renderMyBooks(); break;
    case 'profile': renderProfile(); break;
    default: main.innerHTML = '<div class="page-body"><p>Page not found.</p></div>';
  }
}

// ── TOAST ──────────────────────────────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  document.getElementById('toast-container').appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(20px)'; toast.style.transition = '0.3s'; setTimeout(() => toast.remove(), 300); }, duration);
}

// ── MODAL ──────────────────────────────────────────────────────────────────
function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-content').innerHTML = '';
}

// ── SIDEBAR ────────────────────────────────────────────────────────────────
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebar-overlay').classList.toggle('open'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('open'); }

// ── LOGOUT ─────────────────────────────────────────────────────────────────
async function logout() {
  await App.auth.signOut();
  App.user = null;
  App.token = null;
  showAuth();
}

// ── HELPERS ────────────────────────────────────────────────────────────────
function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}

function selectRole(role) {
  document.getElementById('role-member').classList.toggle('active', role === 'member');
  document.getElementById('role-admin').classList.toggle('active', role === 'admin');
  document.getElementById('admin-key-group').classList.toggle('hidden', role !== 'admin');
  document.getElementById('signup-form').dataset.role = role;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount) {
  const sym = App.config?.library?.currency || '₹';
  return `${sym}${parseFloat(amount || 0).toFixed(2)}`;
}

function isOverdue(dueDate) { return new Date(dueDate) < new Date(); }

function daysOverdue(dueDate) {
  const diff = new Date() - new Date(dueDate);
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

function setBtnLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  if (loading) { btn.disabled = true; text?.classList.add('hidden'); loader?.classList.remove('hidden'); }
  else { btn.disabled = false; text?.classList.remove('hidden'); loader?.classList.add('hidden'); }
}

// ── PASSWORD STRENGTH ──────────────────────────────────────────────────────
document.addEventListener('input', (e) => {
  if (e.target.id === 'su-password') {
    const pw = e.target.value;
    const bar = document.getElementById('pw-strength');
    if (!bar) return;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
    const widths = ['25%', '50%', '75%', '100%'];
    bar.innerHTML = `<div class="pw-strength-bar" style="width:${widths[score-1]||0};background:${colors[score-1]||'#e2e8f0'}"></div>`;
  }
});

window.addEventListener('load', initApp);
