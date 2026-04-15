async function renderReport() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
        <div><h1>Library Report</h1><p>Complete overview of library operations</p></div>
        <button class="btn-primary" onclick="printReport()">🖨️ Print Report</button>
      </div>
    </div>
    <div class="page-body">
      <div class="flex-center" style="height:300px">
        <div class="loading-spinner" style="border-color:rgba(26,46,74,0.2);border-top-color:var(--navy)"></div>
      </div>
    </div>
  `;

  try {
    const data = await api('reports/overview');
    const r = data.report;
    const s = r.summary;
    const lib = App.config?.library || {};

    main.innerHTML = `
      <div class="page-header" id="report-top">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <h1>Library Report</h1>
            <p>Generated on ${new Date(r.generatedAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })}</p>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn-secondary" onclick="triggerOverdueCheck()">📧 Send Overdue Alerts</button>
            <button class="btn-primary" onclick="printReport()">🖨️ Print Report</button>
          </div>
        </div>
      </div>
      <div class="page-body" id="report-body">

        <!-- Summary Banner -->
        <div style="background:linear-gradient(135deg,var(--navy-dark),var(--navy-light));border-radius:var(--radius);padding:24px;color:#fff;margin-bottom:24px">
          <div style="font-family:var(--font-head);font-size:22px;font-weight:700;margin-bottom:4px">📚 ${r.libraryName}</div>
          <div style="opacity:0.6;font-size:13px">Annual Library Performance Summary</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:16px;margin-top:20px">
            ${[
              ['Total Books', s.totalBooks, '📚'],
              ['Total Copies', s.totalCopies, '📋'],
              ['Total Members', s.totalMembers, '👥'],
              ['Total Issued', s.totalTransactions, '📤'],
              ['Fines Collected', formatCurrency(s.totalFinesCollected), '💰'],
            ].map(([label, val, icon]) => `
              <div style="background:rgba(255,255,255,0.08);border-radius:10px;padding:14px;text-align:center">
                <div style="font-size:24px;margin-bottom:4px">${icon}</div>
                <div style="font-family:var(--font-head);font-size:24px;font-weight:700">${val}</div>
                <div style="font-size:11px;opacity:0.65;text-transform:uppercase;letter-spacing:0.5px;margin-top:2px">${label}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Row 1: Status breakdown + Fines -->
        <div class="stats-grid" style="margin-bottom:24px">
          <div class="stat-card blue"><div class="stat-icon">✅</div><div class="stat-value">${s.availableCopies}</div><div class="stat-label">Available Copies</div></div>
          <div class="stat-card gold"><div class="stat-icon">📤</div><div class="stat-value">${s.currentlyIssued}</div><div class="stat-label">Currently Issued</div></div>
          <div class="stat-card red"><div class="stat-icon">⚠️</div><div class="stat-value">${s.overdueCount}</div><div class="stat-label">Overdue Books</div></div>
          <div class="stat-card purple"><div class="stat-icon">🔖</div><div class="stat-value">${s.activeReservations}</div><div class="stat-label">Active Reservations</div></div>
          <div class="stat-card green"><div class="stat-icon">💵</div><div class="stat-value">${formatCurrency(s.totalFinesCollected)}</div><div class="stat-label">Fines Collected</div></div>
          <div class="stat-card red"><div class="stat-icon">⏳</div><div class="stat-value">${formatCurrency(s.pendingFines)}</div><div class="stat-label">Pending Fines</div></div>
        </div>

        <!-- Row 2: Genre + Top Members -->
        <div class="report-grid" style="margin-bottom:24px">
          <!-- Genre breakdown -->
          <div class="card">
            <div class="card-header"><span class="card-title">📊 Books by Genre</span></div>
            ${buildGenreChart(r.genreBreakdown, s.totalBooks)}
          </div>

          <!-- Top members -->
          <div class="card">
            <div class="card-header"><span class="card-title">🏆 Top Borrowers</span></div>
            ${r.topMembers.length ? r.topMembers.map((m, i) => `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
                <div style="width:28px;height:28px;background:${['#d4890a','#94a3b8','#cd7f32','var(--blue)','var(--navy)'][i]||'var(--navy)'};color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.name}</div>
                  <div style="color:var(--text-muted);font-size:11px">${m.email}</div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:13px;font-weight:700;color:var(--navy)">${m.totalBooksIssued || 0}</div>
                  <div style="font-size:10px;color:var(--text-muted)">books</div>
                </div>
              </div>
            `).join('') : '<p class="text-muted">No data yet</p>'}
          </div>
        </div>

        <!-- Monthly Activity Chart -->
        <div class="card" style="margin-bottom:24px">
          <div class="card-header"><span class="card-title">📈 Monthly Activity (Last 6 Months)</span></div>
          ${buildMonthlyChart(r.monthlyStats)}
        </div>

        <!-- Top Books -->
        <div class="report-grid" style="margin-bottom:24px">
          <div class="card">
            <div class="card-header"><span class="card-title">📚 Most Issued Books</span></div>
            ${r.topBooks.length ? r.topBooks.map((b, i) => `
              <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
                <div style="width:28px;height:28px;background:var(--navy);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.title}</div>
                  <div style="color:var(--text-muted);font-size:11px">${b.author} · ${b.genre || 'General'}</div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:13px;font-weight:700;color:var(--blue)">${b.timesIssued || 0}×</div>
                  <div style="font-size:10px;color:var(--text-muted)">issued</div>
                </div>
              </div>
            `).join('') : '<p class="text-muted">No data yet</p>'}
          </div>

          <!-- Quick stats -->
          <div class="card">
            <div class="card-header"><span class="card-title">⚙️ Library Settings</span></div>
            <div style="display:flex;flex-direction:column;gap:0">
              ${[
                ['Library Name', lib.name || '—'],
                ['Loan Period', `${lib.loanDays || 14} days`],
                ['Max Books / Member', lib.maxBooks || 5],
                ['Fine Per Day', formatCurrency(lib.finePerDay || 2)],
                ['Currency', lib.currency || '₹'],
                ['Total Admins', s.totalAdmins],
                ['Active Members', s.activeMembers],
              ].map(([k, v]) => `
                <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)">
                  <span style="color:var(--text-muted);font-size:13px">${k}</span>
                  <span style="font-weight:600;font-size:13px">${v}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Overdue Table -->
        ${s.overdueCount > 0 ? `
        <div class="card" style="border-color:#fecaca;margin-bottom:24px">
          <div class="card-header">
            <span class="card-title" style="color:var(--red)">⚠️ All Overdue Books (${s.overdueCount})</span>
            <button class="btn-primary btn-sm danger" onclick="triggerOverdueCheck()">📧 Notify All</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Book</th><th>Member</th><th>Email</th><th>Due Date</th><th>Days Overdue</th><th>Fine Accrued</th></tr></thead>
              <tbody>
                ${r.overdueList.map(o => `
                  <tr class="overdue-row">
                    <td style="font-weight:500">${o.bookTitle}</td>
                    <td>${o.memberName}</td>
                    <td style="font-size:12px;color:var(--text-muted)">${o.memberEmail}</td>
                    <td style="white-space:nowrap">${formatDate(o.dueDate)}</td>
                    <td><span class="badge badge-red">${o.daysOverdue} days</span></td>
                    <td style="color:var(--red);font-weight:700">${formatCurrency(o.fine)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : `
        <div class="card" style="border-color:#bbf7d0;text-align:center;padding:24px;margin-bottom:24px">
          <span style="font-size:40px">🎉</span>
          <p style="color:var(--green);font-weight:700;font-size:16px;margin-top:10px">No overdue books!</p>
          <p style="color:var(--text-muted);font-size:13px;margin-top:4px">All members are returning books on time.</p>
        </div>
        `}

        <!-- Recent Transactions -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">🔄 Recent Transactions</span>
            <button class="btn-secondary btn-sm" onclick="navigateTo('transactions')">View All</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>Book</th><th>Issue Date</th><th>Due / Return</th><th>Status</th><th>Fine</th></tr></thead>
              <tbody>
                ${r.recentActivity.map(t => `
                  <tr class="${t.status === 'issued' && isOverdue(t.dueDate) ? 'overdue-row' : ''}">
                    <td style="font-weight:500">${t.memberName || '—'}</td>
                    <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.bookTitle || '—'}</td>
                    <td style="white-space:nowrap">${formatDate(t.issuedAt)}</td>
                    <td style="white-space:nowrap">${formatDate(t.returnedAt || t.dueDate)}</td>
                    <td>
                      <span class="badge ${t.status === 'returned' ? 'badge-green' : (isOverdue(t.dueDate) ? 'badge-red' : 'badge-blue')}">
                        ${t.status === 'issued' && isOverdue(t.dueDate) ? 'Overdue' : t.status}
                      </span>
                    </td>
                    <td style="${(t.fine || 0) > 0 ? 'color:var(--red);font-weight:600' : ''}">${(t.fine || 0) > 0 ? formatCurrency(t.fine) : '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;
  } catch (err) {
    main.innerHTML = `<div class="page-body"><div class="form-error">${err.message}</div></div>`;
  }
}

function buildGenreChart(genreMap, total) {
  if (!genreMap || !Object.keys(genreMap).length) return '<p class="text-muted">No genre data yet</p>';
  const sorted = Object.entries(genreMap).sort((a, b) => b[1] - a[1]);
  const colors = ['#2563eb', '#d4890a', '#059669', '#7c3aed', '#dc2626', '#0891b2', '#d97706', '#65a30d'];
  return `
    <div class="genre-list">
      ${sorted.map(([genre, count], i) => `
        <div class="genre-item">
          <div class="genre-label" style="font-size:12px;font-weight:500">${genre}</div>
          <div class="genre-bar-wrap">
            <div class="genre-bar" style="width:${Math.round((count / Math.max(...Object.values(genreMap))) * 100)}%;background:${colors[i % colors.length]}"></div>
          </div>
          <div class="genre-count" style="font-size:12px;font-weight:700;min-width:28px">${count}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function buildMonthlyChart(monthlyStats) {
  if (!monthlyStats) return '<p class="text-muted">No data</p>';
  const entries = Object.entries(monthlyStats);
  const maxIssued = Math.max(...entries.map(([, v]) => v.issued || 0), 1);

  return `
    <div style="display:grid;grid-template-columns:repeat(${entries.length},1fr);gap:12px;align-items:end;height:180px;padding:0 8px">
      ${entries.map(([month, stats]) => {
        const pct = Math.round(((stats.issued || 0) / maxIssued) * 100);
        const label = new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        return `
          <div style="display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end">
            <div style="font-size:11px;font-weight:700;color:var(--navy)">${stats.issued || 0}</div>
            <div style="width:100%;background:var(--border);border-radius:4px 4px 0 0;position:relative;overflow:hidden" title="Issued: ${stats.issued || 0}, Returned: ${stats.returned || 0}">
              <div style="height:${Math.max(pct * 1.2, 4)}px;background:linear-gradient(180deg,var(--blue-light),var(--navy));border-radius:4px 4px 0 0;transition:height 0.6s ease"></div>
            </div>
            <div style="font-size:10px;color:var(--text-muted);text-align:center;white-space:nowrap">${label}</div>
          </div>
        `;
      }).join('')}
    </div>
    <div style="display:flex;align-items:center;gap:16px;margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:6px"><div style="width:12px;height:12px;background:var(--navy);border-radius:2px"></div><span style="font-size:12px;color:var(--text-muted)">Books Issued</span></div>
      <div style="font-size:12px;color:var(--text-muted)">Total this period: <strong style="color:var(--navy)">${Object.values(monthlyStats).reduce((s, v) => s + (v.issued || 0), 0)}</strong></div>
      <div style="font-size:12px;color:var(--text-muted)">Fines collected: <strong style="color:var(--green)">${formatCurrency(Object.values(monthlyStats).reduce((s, v) => s + (v.fines || 0), 0))}</strong></div>
    </div>
  `;
}

function printReport() {
  window.print();
}
