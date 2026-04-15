const router = require('express').Router();
const { getDb } = require('../config/firebase');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// GET /api/books — list all books with search/filter
router.get('/', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const { search, genre, available, page = 1, limit = 20 } = req.query;

    let query = db.collection('books');
    if (available === 'true') query = query.where('availableCopies', '>', 0);

    const snapshot = await query.orderBy('title').get();
    let books = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Client-side filtering for search (Firestore doesn't support full-text)
    if (search) {
      const s = search.toLowerCase();
      books = books.filter(b =>
        b.title?.toLowerCase().includes(s) ||
        b.author?.toLowerCase().includes(s) ||
        b.isbn?.includes(s) ||
        b.genre?.toLowerCase().includes(s)
      );
    }
    if (genre) books = books.filter(b => b.genre?.toLowerCase() === genre.toLowerCase());

    const total = books.length;
    const start = (parseInt(page) - 1) * parseInt(limit);
    books = books.slice(start, start + parseInt(limit));

    res.json({ success: true, books, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/books/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('books').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Book not found' });
    res.json({ success: true, book: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/books — add book (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, author, isbn, genre, description, totalCopies, publishYear, publisher, shelfLocation } = req.body;
    if (!title || !author || !isbn) {
      return res.status(400).json({ success: false, error: 'Title, author and ISBN are required' });
    }
    const db = getDb();

    // Check ISBN uniqueness
    const existing = await db.collection('books').where('isbn', '==', isbn).get();
    if (!existing.empty) {
      return res.status(400).json({ success: false, error: 'A book with this ISBN already exists' });
    }

    const copies = parseInt(totalCopies) || 1;
    const bookRef = await db.collection('books').add({
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim(),
      genre: genre || 'General',
      description: description || '',
      totalCopies: copies,
      availableCopies: copies,
      publishYear: publishYear || '',
      publisher: publisher || '',
      shelfLocation: shelfLocation || '',
      addedAt: new Date().toISOString(),
      timesIssued: 0,
    });

    res.json({ success: true, message: 'Book added successfully', id: bookRef.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/books/:id — update book (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const { title, author, isbn, genre, description, totalCopies, publishYear, publisher, shelfLocation } = req.body;
    const doc = await db.collection('books').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Book not found' });

    const current = doc.data();
    const newTotal = parseInt(totalCopies) || current.totalCopies;
    const diff = newTotal - current.totalCopies;

    const updates = {
      ...(title && { title }),
      ...(author && { author }),
      ...(isbn && { isbn }),
      ...(genre && { genre }),
      ...(description !== undefined && { description }),
      ...(publishYear && { publishYear }),
      ...(publisher && { publisher }),
      ...(shelfLocation && { shelfLocation }),
      totalCopies: newTotal,
      availableCopies: Math.max(0, current.availableCopies + diff),
      updatedAt: new Date().toISOString(),
    };

    await db.collection('books').doc(req.params.id).update(updates);
    res.json({ success: true, message: 'Book updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/books/:id — delete book (admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('books').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Book not found' });

    const book = doc.data();
    if (book.availableCopies < book.totalCopies) {
      return res.status(400).json({ success: false, error: 'Cannot delete book — copies are currently issued' });
    }

    await db.collection('books').doc(req.params.id).delete();
    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/books/genres/list — all genres
router.get('/genres/list', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('books').get();
    const genres = [...new Set(snap.docs.map(d => d.data().genre).filter(Boolean))].sort();
    res.json({ success: true, genres });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
