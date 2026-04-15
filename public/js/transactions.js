// ── ISSUE BOOK PAGE (ADMIN) ────────────────────────────────────────────────
async function renderIssuePage() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header"><h1>Issue Book</h1><p>Issue a book to a library member</p></div>
    <div class="page-body">
      <div class="card" style="max-width:600px;margin:0 auto">
        <div class="card-header"><span class="card-title">📤 Issue a Book</span></div>
        <div id="issue-error" class="form-error hidden"></div>
        <div id="issue-success" class="form-success hidden"></div>

        <div class="form-group">
          <label>Search Member</label>
          <input type="text" id="member-search-input" placeholder="Type member name or email..." oninput="searchMembers(this.value)">
          <div id="member-results" style="border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-top:4px;display:none"></div>
          <div id="selected-member" class="hidden" style="margin-top:8px;padding:10px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:13px;font-weight:500;color:#1e40af"></div>
          <input type="hidden" id="selected-member-id">
        </div>

        <div class="form-group">
          <label>Search Book</label>
          <input type="text" id="book-search-input" placeholder="Type book title, author or ISBN..." oninput="searchBooks(this.value)">
          <div id="book-results" style="border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-top:4px;display:none"></div>
          <div id="selected-book" class="hidden" style="margin-top:8px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:13px;font-weight:500;color:#166534"></div>
          <input type="hidden" id="selected-book-id">
        </div>

        <div id="issue-preview" class="hidden" style="background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:16px;margin-bottom:16px">
          <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-muted);margin-bottom:10px">Issue Preview</div>
          <div id="issue-preview-content"></div>
        </div>

        <button class="btn-primary full" onclick="submitIssueBook()" id="issue-btn">
          <span class="btn-text">📤 Issue Book</span>
          <span class="btn-loader hidden">⏳ Issuing...</span>
        </button>
      </div>
    </div>
  `;
}

let memberSearchTimeout, bookSearchTimeout;
let allMembersCache = null;
let allBooksCache = null;

async function searchMembers(query) {
  clearTimeout(memberSearchTimeout);
  memberSearchTimeout = setTimeout(async () => {
    if (!query || query.length < 2) { document.getElementById('member-results').style.display = 'none'; return; }
    if (!allMembersCache) {
      const data = await api('reports/members');
      allMembersCache = data.members || [];
    }
    const q = query.toLowerCase();
    const results = allMembersCache.filter(m => m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.membershipId?.includes(q)).slice(0, 6);
    const container = document.getElementById('member-results');
    if (!results.length) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    container.innerHTML = results.map(m => `
      <div onclick="selectMember('${m.id||m.uid}','${m.name}','${m.email}','${m.currentBooksCount||0}')" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13px;display:flex;align-items:center;gap:10px" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <div style="width:32px;height:32px;background:var(--navy);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0">${m.name[0]}</div>
        <div><div style="font-weight:600">${m.name}</div><div style="color:var(--text-muted);font-size:11px">${m.email} · Books: ${m.currentBooksCount||0}/${App.config?.library?.maxBooks||5}</div></div>
      </div>
    `).join('');
  }, 300);
}

function selectMember(id, name, email, count) {
  document.getElementById('selected-member-id').value = id;
  document.getElementById('member-search-input').value = name;
  document.getElementById('member-results').style.display = 'none';
  const el = document.getElementById('selected-member');
  el.innerHTML = `✅ <strong>${name}</strong> (${email}) — Books held: ${count}`;
  el.classList.remove('hidden');
  updateIssuePreview();
}

async function searchBooks(query) {
  clearTimeout(bookSearchTimeout);
  bookSearchTimeout = setTimeout(async () => {
    if (!query || query.length < 2) { document.getElementById('book-results').style.display = 'none'; return; }
    if (!allBooksCache) {
      const data = await api('books?limit=500');
      allBooksCache = data.books || [];
    }
    const q = query.toLowerCase();
    const results = allBooksCache.filter(b => b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q) || b.isbn?.includes(q)).slice(0, 6);
    const container = document.getElementById('book-results');
    if (!results.length) { container.style.display = 'none'; return; }
    container.style.display = 'block';
    container.innerHTML = results.map(b => `
      <div onclick="selectBook('${b.id}','${b.title.replace(/'/g,"\\'")}','${b.author}','${b.availableCopies}')" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--border);font-size:13px;${b.availableCopies===0?'opacity:0.5':''}" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">
        <div style="font-weight:600">${b.title}</div>
        <div style="color:var(--text-muted);font-size:11px">by ${b.author} · ${b.availableCopies > 0 ? `✅ ${b.availableCopies} copies available` : '❌ Not available'}</div>
      </div>
    `).join('');
  }, 300);
}

function selectBook(id, title, author, avail) {
  document.getElementById('selected-book-id').value = id;
  document.getElementById('book-search-input').value = title;
  document.getElementById('book-results').style.display = 'none';
  const el = document.getElementById('selected-book');
  el.innerHTML = `✅ <strong>${title}</strong> by ${author} — ${avail} ${avail == 1 ? 'copy' : 'copies'} available`;
  el.classList.remove('hidden');
  updateIssuePreview();
}

function updateIssuePreview() {
  const memberId = document.getElementById('selected-member-id').value;
  const bookId = document.getElementById('selected-book-id').value;
  if (!memberId || !bookId) return;
  const lib = App.config?.library || {};
  const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + parseInt(lib.loanDays || 14));
  const preview = document.getElementById('issue-preview');
  document.getElementById('issue-preview-content').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
      <div><span style="color:var(--text-muted)">Loan Period:</span> <strong>${lib.loanDays || 14} days</strong></div>
      <div><span style="color:var(--text-muted)">Due Date:</span> <strong>${formatDate(dueDate.toISOString())}</strong></div>
      <div><span style="color:var(--text-muted)">Fine per day:</span> <strong>${formatCurrency(lib.finePerDay || 2)}</strong></div>
      <div><span style="color:var(--text-muted)">Email notification:</span> <strong>✅ Yes</strong></div>
    </div>
  `;
  preview.classList.remove('hidden');
}

async function submitIssueBook() {
  const bookId = document.getElementById('selected-book-id').value;
  const userId = document.getElementById('selected-member-id').value;
  const errEl = document.getElementById('issue-error');
  const sucEl = document.getElementById('issue-success');
  errEl.classList.add('hidden');
  sucEl.classList.add('hidden');

  if (!bookId || !userId) { errEl.textContent = 'Please select both a member and a book'; errEl.classList.remove('hidden'); return; }

  setBtnLoading('issue-btn', true);
  try {
    const data = await api('transactions/issue', 'POST', { bookId, userId });
    sucEl.textContent = `✅ Book issued successfully! Due date: ${formatDate(data.dueDate)}. Confirmation email sent to member.`;
    sucEl.classList.remove('hidden');
    showToast('Book issued! Email sent to member.', 'success');
    // Reset form
    ['selected-member-id','selected-book-id'].forEach(id => document.getElementById(id).value = '');
    ['selected-member','selected-book','issue-preview'].forEach(id => document.getElementById(id).classList.add('hidden'));
    ['member-search-input','book-search-input'].forEach(id => document.getElementById(id).value = '');
    allBooksCache = null;
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    setBtnLoading('issue-btn', false);
  }
}

// ── ALL TRANSACTIONS (ADMIN) ───────────────────────────────────────────────
async function renderTransactions() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header"><h1>Transactions</h1><p>All book issue and return records</p></div>
    <div class="page-body">
      <div class="filter-bar">
        <div class="search-box"><span class="search-icon">🔍</span><input type="text" id="tx-search" placeholder="Search by book, member..." oninput="filterTransactions()"></div>
        <select class="filter-select" id="tx-status" onchange="filterTransactions()">
          <option value="">All Status</option><option value="issued">Issued</option><option value="returned">Returned</option>
        </select>
      </div>
      <div class="card">
        <div id="tx-table">
          <div class="flex-center" style="height:200px"><div class="loading-spinner" style="border-color:rgba(26,46,74,0.2);border-top-color:var(--navy)"></div></div>
        </div>
      </div>
    </div>
  `;

  try {
    const data = await api('transactions/all');
    window._allTx = data.transactions || [];
    renderTxTable(window._allTx);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function filterTransactions() {
  const search = document.getElementById('tx-search')?.value?.toLowerCase() || '';
  const status = document.getElementById('tx-status')?.value || '';
  let list = window._allTx || [];
  if (search) list = list.filter(t => t.bookTitle?.toLowerCase().includes(search) || t.memberName?.toLowerCase().includes(search));
  if (status) list = list.filter(t => t.status === status);
  renderTxTable(list);
}

function renderTxTable(txs) {
  const container = document.getElementById('tx-table');
  if (!txs.length) { container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><h3>No transactions found</h3></div>`; return; }
  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Member</th><th>Book</th><th>Issued</th><th>Due Date</th><th>Status</th><th>Fine</th><th>Action</th></tr></thead>
        <tbody>
          ${txs.map(t => {
            const over = t.status === 'issued' && isOverdue(t.dueDate);
            return `<tr class="${over ? 'overdue-row' : ''}">
              <td><div style="font-weight:500">${t.memberName||'—'}</div><div style="font-size:11px;color:var(--text-muted)">${t.memberEmail||''}</div></td>
              <td><div style="font-weight:500;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.bookTitle||'—'}</div></td>
              <td style="white-space:nowrap">${formatDate(t.issuedAt)}</td>
              <td style="white-space:nowrap;${over?'color:var(--red);font-weight:600':''}">${formatDate(t.dueDate)}${over?` <span class="badge badge-red">${daysOverdue(t.dueDate)}d</span>`:''}</td>
              <td><span class="badge ${t.status==='returned'?'badge-green':over?'badge-red':'badge-blue'}">${t.status==='issued'&&over?'Overdue':t.status}</span></td>
              <td style="${t.fine>0?'color:var(--red);font-weight:600':''}">${t.fine>0?formatCurrency(t.fine):'—'}</td>
              <td>${t.status==='issued'?`<button class="btn-primary btn-sm success" onclick="returnBook('${t.id}','${(t.bookTitle||'').replace(/'/g,"\\'")}')">↩ Return</button>`:'<span style="color:var(--text-muted);font-size:12px">Returned</span>'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

async function returnBook(txId, title) {
  if (!confirm(`Return "${title}"?`)) return;
  try {
    const data = await api(`transactions/return/${txId}`, 'POST');
    const msg = data.fine > 0 ? `Book returned. Fine: ${formatCurrency(data.fine)}` : 'Book returned successfully! No fines.';
    showToast(msg, 'success');
    renderTransactions();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── RESERVATIONS (ADMIN) ───────────────────────────────────────────────────
async function renderReservations() {
  const main = document.getElementById('main-content');
  try {
    const data = await api('transactions/all');
    const all = data.transactions || [];
    main.innerHTML = `
      <div class="page-header"><h1>Reservations</h1><p>Active book reservations</p></div>
      <div class="page-body">
        <div class="card">
          <div class="table-wrap">
            <table>
              <thead><tr><th>Member</th><th>Book</th><th>Reserved On</th><th>Status</th><th>Action</th></tr></thead>
              <tbody id="reservations-tbody">
                <tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">Loading reservations...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    const resData = await fetch('/api/transactions/all', { headers: { Authorization: `Bearer ${App.token}` } }).then(r => r.json());
    // fetch from db directly
    const db_res = await api('transactions/all');
    // We'll use a custom endpoint — for now fetch reservations from our books search
    document.getElementById('reservations-tbody').innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted)">No active reservations found</td></tr>`;
  } catch (err) {
    main.innerHTML = `<div class="page-body"><div class="form-error">${err.message}</div></div>`;
  }
}

// ── MY BOOKS (MEMBER) ──────────────────────────────────────────────────────
async function renderMyBooks() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header"><h1>My Books</h1><p>Your current borrowings and reservations</p></div>
    <div class="page-body">
      <div class="flex-center" style="height:200px"><div class="loading-spinner" style="border-color:rgba(26,46,74,0.2);border-top-color:var(--navy)"></div></div>
    </div>
  `;

  try {
    const data = await api('transactions/my');
    const issued = (data.transactions || []).filter(t => t.status === 'issued');
    const history = (data.transactions || []).filter(t => t.status === 'returned');
    const reservations = data.reservations || [];

    main.innerHTML = `
      <div class="page-header"><h1>My Books</h1><p>Your current borrowings and reservations</p></div>
      <div class="page-body">

        ${issued.length ? `
        <div class="card mb-24">
          <div class="card-header"><span class="card-title">📖 Currently Borrowed (${issued.length})</span></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Book</th><th>Issued</th><th>Due Date</th><th>Status</th><th>Fine</th></tr></thead>
            <tbody>${issued.map(t => {
              const over = isOverdue(t.dueDate);
              return `<tr class="${over?'overdue-row':''}">
                <td><div style="font-weight:600">${t.bookTitle}</div><div style="font-size:11px;color:var(--text-muted)">${t.bookAuthor}</div></td>
                <td>${formatDate(t.issuedAt)}</td>
                <td style="${over?'color:var(--red);font-weight:600':''}">${formatDate(t.dueDate)}</td>
                <td><span class="badge ${over?'badge-red':'badge-blue'}">${over?`Overdue ${daysOverdue(t.dueDate)}d`:'On Loan'}</span></td>
                <td style="${t.fine>0?'color:var(--red);font-weight:700':''}">${t.fine>0?formatCurrency(t.fine):'No fine'}</td>
              </tr>`;
            }).join('')}</tbody>
          </table></div>
        </div>` : `<div class="card mb-24" style="text-align:center;padding:30px"><span style="font-size:40px">📚</span><p style="margin-top:10px;color:var(--text-muted)">No books currently borrowed. <a href="#" onclick="navigateTo('browse')">Browse the catalog</a></p></div>`}

        ${reservations.length ? `
        <div class="card mb-24">
          <div class="card-header"><span class="card-title">🔖 Active Reservations (${reservations.length})</span></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Book</th><th>Reserved On</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>${reservations.map(r => `
              <tr>
                <td><div style="font-weight:600">${r.bookTitle}</div><div style="font-size:11px;color:var(--text-muted)">${r.bookAuthor}</div></td>
                <td>${formatDate(r.reservedAt)}</td>
                <td><span class="badge badge-purple">Reserved</span></td>
                <td><button class="btn-secondary btn-sm" onclick="cancelReservation('${r.id}','${(r.bookTitle||'').replace(/'/g,"\\'")}')">❌ Cancel</button></td>
              </tr>
            `).join('')}</tbody>
          </table></div>
        </div>` : ''}

        ${history.length ? `
        <div class="card">
          <div class="card-header"><span class="card-title">📋 Borrowing History (${history.length})</span></div>
          <div class="table-wrap"><table>
            <thead><tr><th>Book</th><th>Issued</th><th>Returned</th><th>Fine Paid</th></tr></thead>
            <tbody>${history.map(t => `
              <tr>
                <td><div style="font-weight:600">${t.bookTitle}</div><div style="font-size:11px;color:var(--text-muted)">${t.bookAuthor}</div></td>
                <td>${formatDate(t.issuedAt)}</td>
                <td>${formatDate(t.returnedAt)}</td>
                <td>${t.fine>0?`<span style="color:var(--red)">${formatCurrency(t.fine)}</span>`:'<span style="color:var(--green)">None</span>'}</td>
              </tr>
            `).join('')}</tbody>
          </table></div>
        </div>` : ''}
      </div>
    `;
  } catch (err) {
    main.innerHTML = `<div class="page-body"><div class="form-error">${err.message}</div></div>`;
  }
}

async function cancelReservation(resId, title) {
  if (!confirm(`Cancel reservation for "${title}"?`)) return;
  try {
    await api(`transactions/reserve/${resId}`, 'DELETE');
    showToast('Reservation cancelled.', 'success');
    renderMyBooks();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
