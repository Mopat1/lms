async function renderDashboard() {
  const main = document.getElementById('main-content');
  const lib = App.config?.library || {};

  try {
    const data = await api('reports/overview');
    const r = data.report;
    const s = r.summary;

    main.innerHTML = `
      <div class="page-header">
        <h1>Dashboard</h1>
        <p>Overview of ${lib.name || 'Library'} — ${formatDate(r.generatedAt)}</p>
      </div>
      <div class="page-body">
        <div class="welcome-banner">
          <h2>Good ${getGreeting()}, ${App.user?.name?.split(' ')[0] || 'Admin'}!</h2>
          <p>Here's what's happening at your library today.</p>
        </div>

        <div class="stats-grid">
          <div class="stat-card blue"><div class="stat-icon">📚</div><div class="stat-value">${s.totalBooks}</div><div class="stat-label">Total Books</div></div>
          <div class="stat-card green"><div class="stat-icon">✅</div><div class="stat-value">${s.availableCopies}</div><div class="stat-label">Available Copies</div></div>
          <div class="stat-card gold"><div class="stat-icon">📤</div><div class="stat-value">${s.currentlyIssued}</div><div class="stat-label">Currently Issued</div></div>
          <div class="stat-card red"><div class="stat-icon">⚠️</div><div class="stat-value">${s.overdueCount}</div><div class="stat-label">Overdue Books</div></div>
          <div class="stat-card purple"><div class="stat-icon">👥</div><div class="stat-value">${s.totalMembers}</div><div class="stat-label">Total Members</div></div>
          <div class="stat-card gold"><div class="stat-icon">🔖</div><div class="stat-value">${s.activeReservations}</div><div class="stat-label">Reservations</div></div>
          <div class="stat-card green"><div class="stat-icon">💰</div><div class="stat-value">${formatCurrency(s.totalFinesCollected)}</div><div class="stat-label">Fines Collected</div></div>
          <div class="stat-card red"><div class="stat-icon">⏳</div><div class="stat-value">${formatCurrency(s.pendingFines)}</div><div class="stat-label">Pending Fines</div></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
          <!-- Recent Activity -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Recent Activity</span>
              <button class="btn-secondary btn-sm" onclick="navigateTo('transactions')">View All</button>
            </div>
            <div class="table-wrap">
              <table>
                <thead><tr><th>Member</th><th>Book</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>
                  ${r.recentActivity.slice(0,8).map(t => `
                    <tr>
                      <td>${t.memberName || '—'}</td>
                      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${t.bookTitle}">${t.bookTitle || '—'}</td>
                      <td>${formatDate(t.issuedAt)}</td>
                      <td><span class="badge ${t.status === 'issued' ? (isOverdue(t.dueDate) ? 'badge-red' : 'badge-blue') : 'badge-green'}">${t.status === 'issued' && isOverdue(t.dueDate) ? 'Overdue' : t.status}</span></td>
                    </tr>
                  `).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">No activity yet</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>

          <!-- Top Books -->
          <div class="card">
            <div class="card-header">
              <span class="card-title">Most Issued Books</span>
            </div>
            ${r.topBooks.length ? r.topBooks.map((b,i) => `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
                <div style="width:28px;height:28px;background:var(--navy);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${i+1}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.title}</div>
                  <div style="color:var(--text-muted);font-size:11px">${b.author}</div>
                </div>
                <div style="font-size:12px;font-weight:600;color:var(--blue)">${b.timesIssued || 0}×</div>
              </div>
            `).join('') : '<p class="text-muted">No data yet</p>'}
          </div>
        </div>

        <!-- Overdue Alert -->
        ${s.overdueCount > 0 ? `
        <div class="card" style="border-color:#fecaca">
          <div class="card-header">
            <span class="card-title" style="color:var(--red)">⚠️ Overdue Books (${s.overdueCount})</span>
            <button class="btn-primary btn-sm danger" onclick="triggerOverdueCheck()">📧 Send Notifications</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Book</th><th>Member</th><th>Due Date</th><th>Days Overdue</th><th>Fine</th></tr></thead>
              <tbody>
                ${r.overdueList.slice(0,5).map(o => `
                  <tr class="overdue-row">
                    <td>${o.bookTitle}</td>
                    <td>${o.memberName}</td>
                    <td>${formatDate(o.dueDate)}</td>
                    <td><span class="badge badge-red">${o.daysOverdue} days</span></td>
                    <td style="color:var(--red);font-weight:600">${formatCurrency(o.fine)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ${s.overdueCount > 5 ? `<p style="text-align:center;margin-top:12px;font-size:12px;color:var(--text-muted)">And ${s.overdueCount - 5} more... <a href="#" onclick="navigateTo('report')">View full report</a></p>` : ''}
        </div>
        ` : `<div class="card" style="border-color:#bbf7d0;text-align:center;padding:20px"><span style="font-size:28px">🎉</span><p style="color:var(--green);font-weight:600;margin-top:8px">No overdue books! All members are on track.</p></div>`}
      </div>
    `;
  } catch (err) {
    main.innerHTML = `<div class="page-body"><div class="form-error">${err.message}</div></div>`;
  }
}

async function triggerOverdueCheck() {
  try {
    await api('admin/trigger-overdue-check', 'POST');
    showToast('Overdue notifications sent to all members and librarian!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
