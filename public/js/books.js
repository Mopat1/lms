let allBooks = [];
let genres = [];

async function loadBooks(search = '', genre = '', available = '') {
  const params = new URLSearchParams({ page: 1, limit: 100 });
  if (search) params.set('search', search);
  if (genre) params.set('genre', genre);
  if (available) params.set('available', available);
  const data = await api(`books?${params}`);
  allBooks = data.books || [];
  return allBooks;
}

// ── ADMIN BOOKS PAGE ───────────────────────────────────────────────────────
async function renderBooksAdmin() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <h1>Book Catalog</h1>
      <p>Manage all books in the library</p>
    </div>
    <div class="page-body">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">
        <div class="filter-bar" style="flex:1">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="book-search" placeholder="Search by title, author, ISBN..." oninput="filterBooks()">
          </div>
          <select class="filter-select" id="genre-filter" onchange="filterBooks()">
            <option value="">All Genres</option>
          </select>
          <select class="filter-select" id="avail-filter" onchange="filterBooks()">
            <option value="">All</option>
            <option value="true">Available Only</option>
          </select>
        </div>
        <button class="btn-primary" onclick="openAddBookModal()">➕ Add Book</button>
      </div>
      <div id="books-grid" class="books-grid">
        <div class="flex-center" style="height:200px;grid-column:1/-1"><div class="loading-spinner" style="border-color:rgba(26,46,74,0.2);border-top-color:var(--navy)"></div></div>
      </div>
    </div>
  `;

  try {
    const [booksData, genresData] = await Promise.all([loadBooks(), api('books/genres/list')]);
    genres = genresData.genres || [];
    const genreSelect = document.getElementById('genre-filter');
    genres.forEach(g => { const opt = document.createElement('option'); opt.value = g; opt.textContent = g; genreSelect.appendChild(opt); });
    renderBooksGrid(allBooks, true);
  } catch (err) {
    showToast(err.message, 'error');
    document.getElementById('books-grid').innerHTML = `<div class="form-error" style="grid-column:1/-1">${err.message}</div>`;
  }
}

// ── MEMBER BROWSE PAGE ─────────────────────────────────────────────────────
async function renderBrowse() {
  const main = document.getElementById('main-content');
  main.innerHTML = `
    <div class="page-header">
      <h1>Browse Books</h1>
      <p>Explore our collection and reserve or request books</p>
    </div>
    <div class="page-body">
      <div class="filter-bar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="book-search" placeholder="Search by title, author, ISBN, genre..." oninput="filterBooks()">
        </div>
        <select class="filter-select" id="genre-filter" onchange="filterBooks()">
          <option value="">All Genres</option>
        </select>
        <select class="filter-select" id="avail-filter" onchange="filterBooks()">
          <option value="">All Books</option>
          <option value="true">Available Now</option>
        </select>
      </div>
      <div id="books-grid" class="books-grid">
        <div class="flex-center" style="height:200px;grid-column:1/-1"><div class="loading-spinner" style="border-color:rgba(26,46,74,0.2);border-top-color:var(--navy)"></div></div>
      </div>
    </div>
  `;

  try {
    const [booksData, genresData] = await Promise.all([loadBooks(), api('books/genres/list')]);
    genres = genresData.genres || [];
    const genreSelect = document.getElementById('genre-filter');
    genres.forEach(g => { const opt = document.createElement('option'); opt.value = g; opt.textContent = g; genreSelect.appendChild(opt); });
    renderBooksGrid(allBooks, false);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function filterBooks() {
  const search = document.getElementById('book-search')?.value || '';
  const genre = document.getElementById('genre-filter')?.value || '';
  const avail = document.getElementById('avail-filter')?.value || '';
  const isAdmin = App.user?.role === 'admin';

  let filtered = allBooks;
  if (search) { const s = search.toLowerCase(); filtered = filtered.filter(b => b.title?.toLowerCase().includes(s) || b.author?.toLowerCase().includes(s) || b.isbn?.includes(s) || b.genre?.toLowerCase().includes(s)); }
  if (genre) filtered = filtered.filter(b => b.genre === genre);
  if (avail === 'true') filtered = filtered.filter(b => b.availableCopies > 0);

  renderBooksGrid(filtered, isAdmin);
}

function renderBooksGrid(books, isAdmin) {
  const grid = document.getElementById('books-grid');
  if (!books.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📭</div><h3>No books found</h3><p>Try adjusting your search filters</p></div>`;
    return;
  }
  grid.innerHTML = books.map(book => {
    const avail = book.availableCopies || 0;
    const availClass = avail === 0 ? 'none' : avail <= 2 ? 'low' : 'ok';
    const availText = avail === 0 ? '❌ Not Available' : avail === 1 ? '⚠️ Last Copy' : `✅ ${avail} Available`;
    return `
      <div class="book-card">
        <div class="book-spine" style="background:linear-gradient(90deg,${genreColor(book.genre)})"></div>
        <div class="book-body">
          <div class="book-genre">${book.genre || 'General'}</div>
          <div class="book-title">${book.title}</div>
          <div class="book-author">by ${book.author}</div>
          <div class="book-meta">
            <span class="info-pill">📋 ISBN: ${book.isbn}</span>
            ${book.publishYear ? `<span class="info-pill">📅 ${book.publishYear}</span>` : ''}
            ${book.shelfLocation ? `<span class="info-pill">📍 ${book.shelfLocation}</span>` : ''}
          </div>
          <div class="book-avail ${availClass}" style="margin-bottom:14px;font-size:13px">${availText}</div>
          <div class="book-actions">
            ${isAdmin ? `
              <button class="btn-secondary btn-sm" onclick="openEditBookModal('${book.id}')">✏️ Edit</button>
              <button class="btn-primary btn-sm danger" onclick="deleteBook('${book.id}','${book.title.replace(/'/g,"\\'")}')">🗑</button>
            ` : `
              ${avail > 0 ? '' : `<button class="btn-primary btn-sm gold" onclick="reserveBook('${book.id}','${book.title.replace(/'/g,"\\'")}')">🔖 Reserve</button>`}
              <button class="btn-secondary btn-sm" onclick="viewBookDetails('${book.id}')">👁 Details</button>
              ${avail > 0 ? `<button class="btn-primary btn-sm" onclick="reserveBook('${book.id}','${book.title.replace(/'/g,"\\'")}')">🔖 Reserve</button>` : ''}
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function genreColor(genre) {
  const colors = { Fiction: '#667eea,#764ba2', Science: '#4facfe,#00f2fe', History: '#43e97b,#38f9d7', Technology: '#fa709a,#fee140', Literature: '#a18cd1,#fbc2eb', General: '#1a3a5c,#2d6a9f' };
  return colors[genre] || '#1a3a5c,#2d6a9f';
}

// ── ADD BOOK MODAL ─────────────────────────────────────────────────────────
function openAddBookModal() {
  openModal(`
    <div class="modal-header"><h3>➕ Add New Book</h3></div>
    <div class="modal-body">
      <div id="add-book-error" class="form-error hidden"></div>
      <div class="form-row">
        <div class="form-group"><label>Title *</label><input type="text" id="b-title" placeholder="Book title" required></div>
        <div class="form-group"><label>Author *</label><input type="text" id="b-author" placeholder="Author name" required></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>ISBN *</label><input type="text" id="b-isbn" placeholder="978-..."></div>
        <div class="form-group"><label>Genre</label>
          <select id="b-genre">
            <option>General</option><option>Fiction</option><option>Non-Fiction</option><option>Science</option>
            <option>Technology</option><option>History</option><option>Literature</option><option>Mathematics</option>
            <option>Biography</option><option>Philosophy</option><option>Arts</option><option>Religion</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Total Copies</label><input type="number" id="b-copies" value="1" min="1"></div>
        <div class="form-group"><label>Publish Year</label><input type="text" id="b-year" placeholder="2023"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Publisher</label><input type="text" id="b-publisher" placeholder="Publisher name"></div>
        <div class="form-group"><label>Shelf Location</label><input type="text" id="b-shelf" placeholder="A-12"></div>
      </div>
      <div class="form-group"><label>Description</label><textarea id="b-desc" rows="3" placeholder="Brief description..."></textarea></div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
        <button class="btn-secondary" onclick="closeModal()">Cancel</button>
        <button class="btn-primary" onclick="submitAddBook()">➕ Add Book</button>
      </div>
    </div>
  `);
}

async function submitAddBook() {
  const title = document.getElementById('b-title').value.trim();
  const author = document.getElementById('b-author').value.trim();
  const isbn = document.getElementById('b-isbn').value.trim();

  if (!title || !author || !isbn) { document.getElementById('add-book-error').textContent = 'Title, Author and ISBN are required'; document.getElementById('add-book-error').classList.remove('hidden'); return; }

  try {
    await api('books', 'POST', {
      title, author, isbn,
      genre: document.getElementById('b-genre').value,
      totalCopies: document.getElementById('b-copies').value,
      publishYear: document.getElementById('b-year').value,
      publisher: document.getElementById('b-publisher').value,
      shelfLocation: document.getElementById('b-shelf').value,
      description: document.getElementById('b-desc').value,
    });
    showToast(`"${title}" added successfully!`, 'success');
    closeModal();
    renderBooksAdmin();
  } catch (err) {
    document.getElementById('add-book-error').textContent = err.message;
    document.getElementById('add-book-error').classList.remove('hidden');
  }
}

// ── EDIT BOOK MODAL ────────────────────────────────────────────────────────
async function openEditBookModal(bookId) {
  try {
    const data = await api(`books/${bookId}`);
    const b = data.book;
    openModal(`
      <div class="modal-header"><h3>✏️ Edit Book</h3></div>
      <div class="modal-body">
        <div id="edit-book-error" class="form-error hidden"></div>
        <div class="form-row">
          <div class="form-group"><label>Title</label><input type="text" id="eb-title" value="${b.title || ''}"></div>
          <div class="form-group"><label>Author</label><input type="text" id="eb-author" value="${b.author || ''}"></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>ISBN</label><input type="text" id="eb-isbn" value="${b.isbn || ''}"></div>
          <div class="form-group"><label>Genre</label>
            <select id="eb-genre">
              ${['General','Fiction','Non-Fiction','Science','Technology','History','Literature','Mathematics','Biography','Philosophy','Arts','Religion'].map(g => `<option ${b.genre===g?'selected':''}>${g}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Total Copies</label><input type="number" id="eb-copies" value="${b.totalCopies || 1}" min="1"></div>
          <div class="form-group"><label>Shelf Location</label><input type="text" id="eb-shelf" value="${b.shelfLocation || ''}"></div>
        </div>
        <div class="form-group"><label>Description</label><textarea id="eb-desc" rows="3">${b.description || ''}</textarea></div>
        <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px">
          <button class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button class="btn-primary" onclick="submitEditBook('${bookId}')">💾 Save Changes</button>
        </div>
      </div>
    `);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function submitEditBook(bookId) {
  try {
    await api(`books/${bookId}`, 'PUT', {
      title: document.getElementById('eb-title').value.trim(),
      author: document.getElementById('eb-author').value.trim(),
      isbn: document.getElementById('eb-isbn').value.trim(),
      genre: document.getElementById('eb-genre').value,
      totalCopies: document.getElementById('eb-copies').value,
      shelfLocation: document.getElementById('eb-shelf').value.trim(),
      description: document.getElementById('eb-desc').value.trim(),
    });
    showToast('Book updated successfully!', 'success');
    closeModal();
    renderBooksAdmin();
  } catch (err) {
    document.getElementById('edit-book-error').textContent = err.message;
    document.getElementById('edit-book-error').classList.remove('hidden');
  }
}

async function deleteBook(bookId, title) {
  if (!confirm(`Delete "${title}"?\n\nThis action cannot be undone.`)) return;
  try {
    await api(`books/${bookId}`, 'DELETE');
    showToast(`"${title}" deleted.`, 'success');
    renderBooksAdmin();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function viewBookDetails(bookId) {
  try {
    const data = await api(`books/${bookId}`);
    const b = data.book;
    openModal(`
      <div class="modal-header"><h3>📖 Book Details</h3></div>
      <div class="modal-body">
        <div class="book-spine" style="height:6px;border-radius:3px;background:linear-gradient(90deg,${genreColor(b.genre)});margin-bottom:20px"></div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:var(--text-muted);margin-bottom:4px">${b.genre || 'General'}</div>
          <div style="font-family:var(--font-head);font-size:22px;font-weight:700;color:var(--navy)">${b.title}</div>
          <div style="color:var(--text-muted);font-size:14px">by ${b.author}</div></div>
          <hr class="section-divider">
          <div class="info-card" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px">
            ${[['ISBN',b.isbn],['Publisher',b.publisher||'—'],['Year',b.publishYear||'—'],['Shelf',b.shelfLocation||'—'],['Total Copies',b.totalCopies],['Available',b.availableCopies],['Times Issued',b.timesIssued||0]].map(([k,v])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e8edf3"><span style="color:var(--text-muted);font-size:12px">${k}</span><span style="font-weight:600;font-size:13px">${v}</span></div>`).join('')}
          </div>
          ${b.description ? `<div><p style="color:var(--text);font-size:13px;line-height:1.7">${b.description}</p></div>` : ''}
          ${b.availableCopies > 0 ? `<button class="btn-primary full" onclick="reserveBook('${b.id}','${b.title.replace(/'/g,"\\'")}');closeModal()">🔖 Reserve This Book</button>` : `<div class="form-error">No copies currently available. You can reserve to get notified.</div><button class="btn-primary full gold" onclick="reserveBook('${b.id}','${b.title.replace(/'/g,"\\'")}');closeModal()">🔖 Join Waiting List</button>`}
        </div>
      </div>
    `);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function reserveBook(bookId, title) {
  try {
    await api('transactions/reserve', 'POST', { bookId });
    showToast(`"${title}" reserved! Confirmation email sent.`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
