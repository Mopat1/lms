// ── LOGIN ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const signupForm = document.getElementById('signup-form');
  if (signupForm) {
    signupForm.dataset.role = 'member';
    signupForm.addEventListener('submit', handleSignup);
  }
});

function clearErrors(ids) { ids.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; }); }
function setError(id, msg) { const el = document.getElementById(id); if (el) el.textContent = msg; }
function showFormError(id, msg) { const el = document.getElementById(id); if (el) { el.textContent = msg; el.classList.remove('hidden'); } }
function hideFormError(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }

async function handleLogin(e) {
  e.preventDefault();
  clearErrors(['login-email-err', 'login-pw-err']);
  hideFormError('login-error');

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  let valid = true;
  if (!email) { setError('login-email-err', 'Email is required'); valid = false; }
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('login-email-err', 'Enter a valid email'); valid = false; }
  if (!password) { setError('login-pw-err', 'Password is required'); valid = false; }
  if (!valid) return;

  setBtnLoading('login-btn', true);
  try {
    const cred = await App.auth.signInWithEmailAndPassword(email, password);
    App.token = await cred.user.getIdToken();
    const resp = await api('auth/verify-token', 'POST', { token: App.token });
    if (resp.success) {
      App.user = resp.user;
      showToast(`Welcome back, ${App.user.name}! 👋`, 'success');
      showApp();
    }
  } catch (err) {
    let msg = 'Sign in failed. Please try again.';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
    else if (err.code === 'auth/too-many-requests') msg = 'Too many failed attempts. Please try again later.';
    else if (err.code === 'auth/user-disabled') msg = 'This account has been disabled.';
    else if (err.message) msg = err.message;
    showFormError('login-error', msg);
  } finally {
    setBtnLoading('login-btn', false);
  }
}

async function handleSignup(e) {
  e.preventDefault();
  clearErrors(['su-name-err', 'su-email-err', 'su-phone-err', 'su-pw-err', 'su-cpw-err', 'su-key-err']);
  hideFormError('signup-error');
  hideFormError('signup-success');

  const name = document.getElementById('su-name').value.trim();
  const email = document.getElementById('su-email').value.trim();
  const phone = document.getElementById('su-phone').value.trim();
  const address = document.getElementById('su-address').value.trim();
  const password = document.getElementById('su-password').value;
  const confirmPw = document.getElementById('su-confirm-pw').value;
  const adminKey = document.getElementById('su-admin-key').value;
  const role = document.getElementById('signup-form').dataset.role || 'member';

  let valid = true;
  if (!name || name.length < 2) { setError('su-name-err', 'Name must be at least 2 characters'); valid = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('su-email-err', 'Enter a valid email address'); valid = false; }
  if (phone && !/^\+?[\d\s\-]{10,15}$/.test(phone)) { setError('su-phone-err', 'Enter a valid phone number (10-15 digits)'); valid = false; }
  if (password.length < 8) { setError('su-pw-err', 'Password must be at least 8 characters'); valid = false; }
  if (password !== confirmPw) { setError('su-cpw-err', 'Passwords do not match'); valid = false; }
  if (role === 'admin' && !adminKey) { setError('su-key-err', 'Admin key is required'); valid = false; }
  if (!valid) return;

  setBtnLoading('signup-btn', true);
  try {
    const resp = await api('auth/signup', 'POST', { name, email, password, phone, address, role, adminKey });
    if (resp.success) {
      const successEl = document.getElementById('signup-success');
      successEl.textContent = `✅ Account created successfully as ${resp.role}! A welcome email has been sent. Please sign in.`;
      successEl.classList.remove('hidden');
      document.getElementById('signup-form').reset();
      setTimeout(() => showPage('login-page'), 3000);
    }
  } catch (err) {
    showFormError('signup-error', err.message || 'Registration failed. Please try again.');
  } finally {
    setBtnLoading('signup-btn', false);
  }
}
