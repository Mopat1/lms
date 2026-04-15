const router = require('express').Router();
const { getDb } = require('../config/firebase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const email = require('../utils/email');

const LOAN_DAYS = () => parseInt(process.env.LOAN_PERIOD_DAYS) || 14;
const FINE_PER_DAY = () => parseFloat(process.env.FINE_PER_DAY) || 2.00;
const MAX_BOOKS = () => parseInt(process.env.MAX_BOOKS_PER_USER) || 5;

function calcDueDate() {
  const d = new Date();
  d.setDate(d.getDate() + LOAN_DAYS());
  return d.toISOString();
}

function calcFine(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  if (now <= due) return 0;
  const days = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
  return parseFloat((days * FINE_PER_DAY()).toFixed(2));
}

// POST /api/transactions/issue — issue a book to a member (admin only)
router.post('/issue', requireAdmin, async (req, res) => {
  const db = getDb();
  const { bookId, userId } = req.body;
  if (!bookId || !userId) return res.status(400).json({ success: false, error: 'bookId and userId required' });

  try {
    // Fetch book and user in parallel
    const [bookDoc, userDoc] = await Promise.all([
      db.collection('books').doc(bookId).get(),
      db.collection('users').doc(userId).get(),
    ]);

    if (!bookDoc.exists) return res.status(404).json({ success: false, error: 'Book not found' });
    if (!userDoc.exists) return res.status(404).json({ success: false, error: 'User not found' });

    const book = bookDoc.data();
    const user = userDoc.data();

    if (book.availableCopies < 1) return res.status(400).json({ success: false, error: 'No available copies' });
    if (user.currentBooksCount >= MAX_BOOKS()) {
      return res.status(400).json({ success: false, error: `Member has reached the max limit of ${MAX_BOOKS()} books` });
    }

    // Check if user already has this book
    const existing = await db.collection('transactions')
      .where('bookId', '==', bookId).where('userId', '==', userId)
      .where('status', '==', 'issued').get();
    if (!existing.empty) return res.status(400).json({ success: false, error: 'Member already has this book' });

    // Cancel any reservation for this book by this user
    const reservations = await db.collection('reservations')
      .where('bookId', '==', bookId).where('userId', '==', userId)
      .where('status', '==', 'active').get();

    const batch = db.batch();

    reservations.forEach(r => batch.update(r.ref, { status: 'fulfilled', fulfilledAt: new Date().toISOString() }));

    const dueDate = calcDueDate();
    const txRef = db.collection('transactions').doc();
    batch.set(txRef, {
      id: txRef.id,
      bookId,
      userId,
      bookTitle: book.title,
      bookAuthor: book.author,
      memberName: user.name,
      memberEmail: user.email,
      issuedAt: new Date().toISOString(),
      dueDate,
      returnedAt: null,
      status: 'issued',
      fine: 0,
      finePaid: false,
      issuedBy: req.user.uid,
    });

    batch.update(db.collection('books').doc(bookId), {
      availableCopies: book.availableCopies - 1,
      timesIssued: (book.timesIssued || 0) + 1,
    });

    batch.update(db.collection('users').doc(userId), {
      currentBooksCount: (user.currentBooksCount || 0) + 1,
      totalBooksIssued: (user.totalBooksIssued || 0) + 1,
    });

    await batch.commit();

    // Send email notification
    email.sendBookIssuedEmail(user.email, user.name, book, dueDate).catch(console.error);

    res.json({ success: true, message: 'Book issued successfully', transactionId: txRef.id, dueDate });
  } catch (err) {
    console.error('Issue error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/transactions/return/:txId — return a book (admin only)
router.post('/return/:txId', requireAdmin, async (req, res) => {
  const db = getDb();
  try {
    const txDoc = await db.collection('transactions').doc(req.params.txId).get();
    if (!txDoc.exists) return res.status(404).json({ success: false, error: 'Transaction not found' });

    const tx = txDoc.data();
    if (tx.status !== 'issued') return res.status(400).json({ success: false, error: 'Book is not currently issued' });

    const fine = calcFine(tx.dueDate);
    const batch = db.batch();

    batch.update(txDoc.ref, {
      status: 'returned',
      returnedAt: new Date().toISOString(),
      fine,
      finePaid: fine === 0,
    });

    batch.update(db.collection('books').doc(tx.bookId), {
      availableCopies: require('firebase-admin').firestore.FieldValue.increment(1),
    });

    batch.update(db.collection('users').doc(tx.userId), {
      currentBooksCount: require('firebase-admin').firestore.FieldValue.increment(-1),
      totalFinesPaid: require('firebase-admin').firestore.FieldValue.increment(fine),
    });

    await batch.commit();

    // Notify next person in reservation queue
    const nextReservation = await db.collection('reservations')
      .where('bookId', '==', tx.bookId).where('status', '==', 'active')
      .orderBy('reservedAt').limit(1).get();

    if (!nextReservation.empty) {
      const res_doc = nextReservation.docs[0];
      const reservation = res_doc.data();
      const nextUserDoc = await db.collection('users').doc(reservation.userId).get();
      if (nextUserDoc.exists) {
        const nextUser = nextUserDoc.data();
        const bookDoc = await db.collection('books').doc(tx.bookId).get();
        email.sendBookAvailableEmail(nextUser.email, nextUser.name, bookDoc.data()).catch(console.error);
      }
    }

    // Send return confirmation to member
    const userDoc = await db.collection('users').doc(tx.userId).get();
    if (userDoc.exists) {
      email.sendReturnConfirmationEmail(userDoc.data().email, userDoc.data().name, { title: tx.bookTitle }, fine).catch(console.error);
    }

    res.json({ success: true, message: 'Book returned successfully', fine });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/transactions/reserve — reserve a book
router.post('/reserve', requireAuth, async (req, res) => {
  const db = getDb();
  const { bookId } = req.body;
  const userId = req.user.uid;

  if (!bookId) return res.status(400).json({ success: false, error: 'bookId required' });

  try {
    const [bookDoc, userDoc] = await Promise.all([
      db.collection('books').doc(bookId).get(),
      db.collection('users').doc(userId).get(),
    ]);

    if (!bookDoc.exists) return res.status(404).json({ success: false, error: 'Book not found' });
    if (!userDoc.exists) return res.status(404).json({ success: false, error: 'User not found' });

    // Check duplicate reservation
    const existingRes = await db.collection('reservations')
      .where('bookId', '==', bookId).where('userId', '==', userId).where('status', '==', 'active').get();
    if (!existingRes.empty) return res.status(400).json({ success: false, error: 'You already have an active reservation for this book' });

    // Check if user already has this book
    const existingIssue = await db.collection('transactions')
      .where('bookId', '==', bookId).where('userId', '==', userId).where('status', '==', 'issued').get();
    if (!existingIssue.empty) return res.status(400).json({ success: false, error: 'You already have this book issued' });

    const book = bookDoc.data();
    const user = userDoc.data();

    const resRef = await db.collection('reservations').add({
      bookId,
      userId,
      bookTitle: book.title,
      bookAuthor: book.author,
      memberName: user.name,
      memberEmail: user.email,
      reservedAt: new Date().toISOString(),
      status: 'active',
      expiresAt: null,
    });

    email.sendReservationEmail(user.email, user.name, book).catch(console.error);

    res.json({ success: true, message: 'Book reserved successfully', reservationId: resRef.id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/transactions/reserve/:resId — cancel reservation
router.delete('/reserve/:resId', requireAuth, async (req, res) => {
  const db = getDb();
  try {
    const doc = await db.collection('reservations').doc(req.params.resId).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Reservation not found' });
    const reservation = doc.data();

    // Allow admin or own reservation
    if (req.user.role !== 'admin' && reservation.userId !== req.user.uid) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    await doc.ref.update({ status: 'cancelled', cancelledAt: new Date().toISOString() });
    res.json({ success: true, message: 'Reservation cancelled' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/transactions/my — current user's transactions
router.get('/my', requireAuth, async (req, res) => {
  const db = getDb();
  try {
    const [txSnap, resSnap] = await Promise.all([
      db.collection('transactions').where('userId', '==', req.user.uid).orderBy('issuedAt', 'desc').get(),
      db.collection('reservations').where('userId', '==', req.user.uid).where('status', '==', 'active').get(),
    ]);

    const transactions = txSnap.docs.map(d => {
      const tx = d.data();
      return { id: d.id, ...tx, fine: tx.status === 'issued' ? calcFine(tx.dueDate) : tx.fine };
    });
    const reservations = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    res.json({ success: true, transactions, reservations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/transactions/all — admin: all transactions
router.get('/all', requireAdmin, async (req, res) => {
  const db = getDb();
  try {
    const { status, userId } = req.query;
    let query = db.collection('transactions').orderBy('issuedAt', 'desc');
    if (status) query = query.where('status', '==', status);
    if (userId) query = query.where('userId', '==', userId);

    const snap = await query.limit(200).get();
    const transactions = snap.docs.map(d => {
      const tx = d.data();
      return { id: d.id, ...tx, fine: tx.status === 'issued' ? calcFine(tx.dueDate) : tx.fine };
    });
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/transactions/overdue — admin: all overdue
router.get('/overdue', requireAdmin, async (req, res) => {
  const db = getDb();
  try {
    const now = new Date().toISOString();
    const snap = await db.collection('transactions')
      .where('status', '==', 'issued')
      .where('dueDate', '<', now)
      .orderBy('dueDate').get();

    const transactions = snap.docs.map(d => {
      const tx = d.data();
      return { id: d.id, ...tx, fine: calcFine(tx.dueDate) };
    });
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
