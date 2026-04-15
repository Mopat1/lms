async function renderMembers() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header"><h1>Members</h1><p>Manage all library members</p></div>
    <div class="page-body">
      <div class="filter-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="member-filter-input" placeholder="Search by name, email, membership ID..." oninput="filterMembersList()">
        </div>
        <select class="filter-select" id="member-status-filter" onchange="filterMembersList()">
          <option value="">All Members</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="holding">Currently Holding Books</option>
        </select>
      </div>
      <div class="card">
        <div id="members-table">
          <div class="flex-center" style="height:200px">
            <div class="loading-spinner" style="border-color:rgba(26,46,74,0.2);border-top-color:var(--navy)"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const data = await api('reports/members');
    window._allMembers = data.members || [];
    renderMembersTable(window._allMembers);
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('members-table').innerHTML = `<div class="form-error">${err.message}</div>`;
  }
}

function filterMembersList() {
  const search = (document.getElementById('member-filter-input')?.value || '').toLowerCase();
  const status = document.getElementById('member-status-filter')?.value || '';
  let list = window._allMembers || [];

  if (search) {
    list = list.filter(m =>
      m.name?.toLowerCase().includes(search) ||
      m.email?.toLowerCase().includes(search) ||
      m.membershipId?.toLowerCase().includes(search) ||
      m.phone?.includes(search)
    );
  }
  if (status === 'active') list = list.filter(m => m.isActive !== false);
  if (status === 'inactive') list = list.filter(m => m.isActive === false);
  if (status === 'holding') list = list.filter(m => (m.currentBooksCount || 0) > 0);

  renderMembersTable(list);
}

function renderMembersTable(members) {
  const container = document.getElementById('members-table');
  if (!members.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">👥</div><h3>No members found</h3><p>Try adjusting your search or filters</p></div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <span style="font-size:13px;color:var(--text-muted)">${members.length} member${members.length !== 1 ? 's' : ''} found</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Member</th>
            <th>Membership ID</th>
            <th>Phone</th>
            <th>Joined</th>
            <th>Books Held</th>
            <th>Total Issued</th>
            <th>Fines Paid</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${members.map(m => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:10px">
                  <div style="width:34px;height:34px;background:linear-gradient(135deg,var(--navy),var(--blue));color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0">${(m.name||'?')[0].toUpperCase()}</div>
                  <div>
                    <div style="font-weight:600;font-size:13px">${m.name || '—'}</div>
                    <div style="color:var(--text-muted);font-size:11px">${m.email || ''}</div>
                  </div>
                </div>
              </td>
              <td><span class="info-pill">${m.membershipId || '—'}</span></td>
              <td style="font-size:12px;color:var(--text-muted)">${m.phone || '—'}</td>
              <td style="font-size:12px;white-space:nowrap">${formatDate(m.joinedAt)}</td>
              <td style="text-align:center">
                <span class="badge ${m.currentBooksCount > 0 ? 'badge-blue' : 'badge-gray'}">${m.currentBooksCount || 0} / ${App.config?.library?.maxBooks || 5}</span>
              </td>
              <td style="text-align:center;font-weight:600">${m.totalBooksIssued || 0}</td>
              <td style="color:var(--text-muted)">${m.totalFinesPaid > 0 ? formatCurrency(m.totalFinesPaid) : '—'}</td>
              <td>
                <span class="badge ${m.isActive !== false ? 'badge-green' : 'badge-red'}">
                  ${m.isActive !== false ? '● Active' : '● Inactive'}
                </span>
              </td>
              <td>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  <button class="btn-secondary btn-sm" onclick="viewMemberDetails('${m.id || m.uid}')">👁 View</button>
                  <button class="btn-secondary btn-sm" onclick="toggleMemberStatus('${m.id || m.uid}','${(m.name||'').replace(/'/g,"\\'")}',${m.isActive !== false})"
                    style="${m.isActive !== false ? 'color:var(--red)' : 'color:var(--green)'}">
                    ${m.isActive !== false ? '🔒 Deactivate' : '🔓 Activate'}
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function viewMemberDetails(memberId) {
  try {
    const [membersData, txData] = await Promise.all([
      api('reports/members'),
      api(`transactions/all`)
    ]);
    const member = (membersData.members || []).find(m => (m.id || m.uid) === memberId);
    if (!member) { showToast('Member not found', 'error'); return; }

    const memberTx = (txData.transactions || []).filter(t => t.userId === memberId);
    const issued = memberTx.filter(t => t.status === 'issued');
    const returned = memberTx.filter(t => t.status === 'returned');
    const totalFines = memberTx.reduce((s, t) => s + (t.fine || 0), 0);

    openModal(`
      <div class="modal-header">
        <h3>👤 Member Profile</h3>
      </div>
      <div class="modal-body">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
          <div style="width:60px;height:60px;background:linear-gradient(135deg,var(--navy),var(--blue));color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;flex-shrink:0">${(member.name||'?')[0].toUpperCase()}</div>
          <div>
            <div style="font-family:var(--font-head);font-size:20px;font-weight:700;color:var(--navy)">${member.name}</div>
            <div style="color:var(--text-muted);font-size:13px">${member.email}</div>
            <span class="badge ${member.isActive !== false ? 'badge-green' : 'badge-red'}" style="margin-top:4px">${member.isActive !== false ? '● Active' : '● Inactive'}</span>
          </div>
        </div>

        <div style="background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:16px;margin-bottom:16px">
          ${[
            ['Membership ID', member.membershipId || '—'],
            ['Phone', member.phone || '—'],
            ['Address', member.address || '—'],
            ['Joined', formatDate(member.joinedAt)],
            ['Books Currently Held', `${member.currentBooksCount || 0} / ${App.config?.library?.maxBooks || 5}`],
            ['Total Books Issued', member.totalBooksIssued || 0],
            ['Total Fines Paid', formatCurrency(member.totalFinesPaid || 0)],
          ].map(([k,v]) => `
            <div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e8edf3">
              <span style="color:var(--text-muted);font-size:12px">${k}</span>
              <span style="font-weight:600;font-size:13px">${v}</span>
            </div>
          `).join('')}
        </div>

        ${issued.length ? `
          <div style="margin-bottom:12px">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:8px">Currently Holding</div>
            ${issued.map(t => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:${isOverdue(t.dueDate)?'#fff5f5':'#f0fdf4'};border-radius:6px;margin-bottom:6px">
                <div>
                  <div style="font-weight:600;font-size:13px">${t.bookTitle}</div>
                  <div style="font-size:11px;color:var(--text-muted)">Due: ${formatDate(t.dueDate)}</div>
                </div>
                ${isOverdue(t.dueDate) ? `<span class="badge badge-red">⚠ Overdue ${daysOverdue(t.dueDate)}d</span>` : '<span class="badge badge-green">On Time</span>'}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="display:flex;gap:8px">
          <button class="btn-secondary" style="flex:1" onclick="closeModal()">Close</button>
          <button class="btn-primary" style="flex:1;${member.isActive !== false ? 'background:linear-gradient(135deg,#dc2626,#b91c1c)' : ''}"
            onclick="toggleMemberStatus('${member.id||member.uid}','${(member.name||'').replace(/'/g,"\\'")}',${member.isActive !== false});closeModal()">
            ${member.isActive !== false ? '🔒 Deactivate Member' : '🔓 Activate Member'}
          </button>
        </div>
      </div>
    `);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function toggleMemberStatus(memberId, name, currentlyActive) {
  const action = currentlyActive ? 'deactivate' : 'activate';
  if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} member "${name}"?`)) return;
  try {
    const data = await api(`reports/members/${memberId}/toggle`, 'PUT');
    showToast(`${name} has been ${data.isActive ? 'activated' : 'deactivated'}.`, 'success');
    // Refresh
    const freshData = await api('reports/members');
    window._allMembers = freshData.members || [];
    filterMembersList();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
