async function renderProfile() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header"><h1>My Profile</h1><p>Manage your account details</p></div>
    <div class="page-body">
      <div class="flex-center" style="height:200px">
        <div class="loading-spinner" style="border-color:rgba(26,46,74,0.2);border-top-color:var(--navy)"></div>
      </div>
    </div>
  `;

  try {
    const data = await api('auth/profile');
    const u = data.user;
    const lib = App.config?.library || {};

    main.innerHTML = `
      <div class="page-header"><h1>My Profile</h1><p>Manage your library account</p></div>
      <div class="page-body" style="max-width:720px">

        <!-- Profile Card -->
        <div class="card" style="margin-bottom:20px">
          <div style="display:flex;align-items:center;gap:20px;margin-bottom:24px;flex-wrap:wrap">
            <div style="width:80px;height:80px;background:linear-gradient(135deg,var(--navy),var(--blue));color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:700;flex-shrink:0">${(u.name||'?')[0].toUpperCase()}</div>
            <div>
              <div style="font-family:var(--font-head);font-size:24px;font-weight:700;color:var(--navy)">${u.name}</div>
              <div style="color:var(--text-muted);font-size:14px">${u.email}</div>
              <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
                <span class="badge badge-blue">${u.role === 'admin' ? '🔑 Admin' : '👤 Member'}</span>
                <span class="info-pill">🪪 ${u.membershipId || 'N/A'}</span>
                <span class="badge ${u.isActive !== false ? 'badge-green' : 'badge-red'}">${u.isActive !== false ? '● Active' : '● Inactive'}</span>
              </div>
            </div>
          </div>

          <!-- Stats row -->
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px;padding:16px;background:#f8fafc;border-radius:10px">
            ${[
              ['📚', 'Books Held', `${u.currentBooksCount || 0} / ${lib.maxBooks || 5}`],
              ['📋', 'Total Borrowed', u.totalBooksIssued || 0],
              ['💰', 'Fines Paid', formatCurrency(u.totalFinesPaid || 0)],
              ['📅', 'Member Since', formatDate(u.joinedAt)],
            ].map(([icon, label, val]) => `
              <div style="text-align:center;padding:10px">
                <div style="font-size:22px">${icon}</div>
                <div style="font-family:var(--font-head);font-size:18px;font-weight:700;color:var(--navy);margin:4px 0">${val}</div>
                <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">${label}</div>
              </div>
            `).join('')}
          </div>

          <!-- Edit form -->
          <div class="card-header" style="margin-bottom:16px">
            <span class="card-title">Edit Profile</span>
          </div>
          <div id="profile-error" class="form-error hidden"></div>
          <div id="profile-success" class="form-success hidden"></div>
          <div class="form-row">
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" id="p-name" value="${u.name || ''}" placeholder="Your full name">
              <span class="field-error" id="p-name-err"></span>
            </div>
            <div class="form-group">
              <label>Phone Number</label>
              <input type="tel" id="p-phone" value="${u.phone || ''}" placeholder="+91 9876543210">
              <span class="field-error" id="p-phone-err"></span>
            </div>
          </div>
          <div class="form-group">
            <label>Address</label>
            <input type="text" id="p-address" value="${u.address || ''}" placeholder="Your address">
          </div>
          <div class="form-group">
            <label>Email Address</label>
            <input type="email" value="${u.email}" disabled style="background:#f1f5f9;cursor:not-allowed;opacity:0.7">
            <span style="font-size:11px;color:var(--text-muted)">Email cannot be changed</span>
          </div>
          <button class="btn-primary" onclick="saveProfile()" id="save-profile-btn">
            <span class="btn-text">💾 Save Changes</span>
            <span class="btn-loader hidden">⏳ Saving...</span>
          </button>
        </div>

        <!-- Library Info Card -->
        <div class="card">
          <div class="card-header"><span class="card-title">📖 Library Policy</span></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
            ${[
              ['Loan Period', `${lib.loanDays || 14} days`],
              ['Max Books at Once', lib.maxBooks || 5],
              ['Fine Per Overdue Day', formatCurrency(lib.finePerDay || 2)],
              ['Reservation Hold', '48 hours'],
            ].map(([k, v]) => `
              <div style="display:flex;flex-direction:column;gap:4px;padding:14px;border-bottom:1px solid var(--border);border-right:1px solid var(--border)">
                <span style="font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">${k}</span>
                <span style="font-weight:700;font-size:16px;color:var(--navy)">${v}</span>
              </div>
            `).join('')}
          </div>
          <div style="padding:16px;background:#fffbeb;border-radius:0 0 var(--radius) var(--radius)">
            <p style="font-size:13px;color:#92400e">⚠️ Books not returned by the due date incur a fine of <strong>${formatCurrency(lib.finePerDay || 2)} per day</strong>. You will receive email reminders for overdue books.</p>
          </div>
        </div>

      </div>
    `;
  } catch (err) {
    main.innerHTML = `<div class="page-body"><div class="form-error">${err.message}</div></div>`;
  }
}

async function saveProfile() {
  const name = document.getElementById('p-name')?.value?.trim();
  const phone = document.getElementById('p-phone')?.value?.trim();
  const address = document.getElementById('p-address')?.value?.trim();
  const errEl = document.getElementById('profile-error');
  const sucEl = document.getElementById('profile-success');

  errEl?.classList.add('hidden');
  sucEl?.classList.add('hidden');
  document.getElementById('p-name-err').textContent = '';
  document.getElementById('p-phone-err').textContent = '';

  if (!name || name.length < 2) {
    document.getElementById('p-name-err').textContent = 'Name must be at least 2 characters';
    return;
  }
  if (phone && !/^\+?[\d\s\-]{10,15}$/.test(phone)) {
    document.getElementById('p-phone-err').textContent = 'Enter a valid phone number';
    return;
  }

  setBtnLoading('save-profile-btn', true);
  try {
    await api('auth/profile', 'PUT', { name, phone, address });

    // Update local state
    App.user.name = name;
    App.user.phone = phone;
    App.user.address = address;

    // Update sidebar
    const nameEl = document.getElementById('user-name-sidebar');
    const avatarEl = document.getElementById('user-avatar-sidebar');
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = name[0].toUpperCase();

    sucEl.textContent = '✅ Profile updated successfully!';
    sucEl.classList.remove('hidden');
    showToast('Profile updated!', 'success');
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    setBtnLoading('save-profile-btn', false);
  }
}
