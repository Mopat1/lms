const router = require('express').Router();
const { getDb } = require('../config/firebase');
const { requireAdmin } = require('../middleware/auth');

const FINE_PER_DAY = () => parseFloat(process.env.FINE_PER_DAY) || 2.00;

function calcFine(dueDate) {
  const now = new Date();
  const due = new Date(dueDate);
  if (now <= due) return 0;
  const days = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
  return parseFloat((days * FINE_PER_DAY()).toFixed(2));
}

// GET /api/reports/overview — full library report (admin only)
router.get('/overview', requireAdmin, async (req, res) => {
  const db = getDb();
  try {
    const [booksSnap, usersSnap, txSnap, reservationsSnap] = await Promise.all([
      db.collection('books').get(),
      db.collection('users').get(),
      db.collection('transactions').get(),
      db.collection('reservations').where('status', '==', 'active').get(),
    ]);

    const books = booksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const transactions = txSnap.docs.map(d => {
      const tx = d.data();
      return { id: d.id, ...tx, currentFine: tx.status === 'issued' ? calcFine(tx.dueDate) : tx.fine };
    });

    const now = new Date();
    const issuedTx = transactions.filter(t => t.status === 'issued');
    const overdueList = issuedTx.filter(t => new Date(t.dueDate) < now);
    const returnedTx = transactions.filter(t => t.status === 'returned');
    const members = users.filter(u => u.role === 'member');
    const admins = users.filter(u => u.role === 'admin');

    // Fines
    const totalFinesAccrued = transactions.reduce((s, t) => s + (t.currentFine || 0), 0);
    const totalFinesCollected = returnedTx.reduce((s, t) => s + (t.fine || 0), 0);
    const pendingFines = issuedTx.reduce((s, t) => s + (t.currentFine || 0), 0);

    // Genre breakdown
    const genreMap = {};
    books.forEach(b => {
      genreMap[b.genre || 'General'] = (genreMap[b.genre || 'General'] || 0) + 1;
    });

    // Top 5 most issued books
    const topBooks = [...books].sort((a, b) => (b.timesIssued || 0) - (a.timesIssued || 0)).slice(0, 5);

    // Monthly issue stats (last 6 months)
    const monthlyStats = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyStats[key] = { issued: 0, returned: 0, fines: 0 };
    }
    transactions.forEach(t => {
      const key = t.issuedAt?.slice(0, 7);
      if (monthlyStats[key]) {
        monthlyStats[key].issued++;
        if (t.status === 'returned') {
          monthlyStats[key].returned++;
          monthlyStats[key].fines += t.fine || 0;
        }
      }
    });

    // Recent activity (last 10)
    const recentActivity = transactions
      .sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt))
      .slice(0, 10);

    // Members with most books
    const topMembers = [...members]
      .sort((a, b) => (b.totalBooksIssued || 0) - (a.totalBooksIssued || 0))
      .slice(0, 5)
      .map(m => ({ name: m.name, email: m.email, totalBooksIssued: m.totalBooksIssued, currentBooksCount: m.currentBooksCount }));

    res.json({
      success: true,
      report: {
        generatedAt: now.toISOString(),
        libraryName: process.env.LIBRARY_NAME || 'Library',
        summary: {
          totalBooks: books.length,
          totalCopies: books.reduce((s, b) => s + (b.totalCopies || 0), 0),
          availableCopies: books.reduce((s, b) => s + (b.availableCopies || 0), 0),
          issuedCopies: issuedTx.length,
          totalMembers: members.length,
          activeMembers: members.filter(m => m.currentBooksCount > 0).length,
          totalAdmins: admins.length,
          totalTransactions: transactions.length,
          currentlyIssued: issuedTx.length,
          overdueCount: overdueList.length,
          returnedCount: returnedTx.length,
          activeReservations: reservationsSnap.size,
          totalFinesAccrued: parseFloat(totalFinesAccrued.toFixed(2)),
          totalFinesCollected: parseFloat(totalFinesCollected.toFixed(2)),
          pendingFines: parseFloat(pendingFines.toFixed(2)),
        },
        genreBreakdown: genreMap,
        topBooks,
        topMembers,
        monthlyStats,
        overdueList: overdueList.map(t => ({
          bookTitle: t.bookTitle,
          memberName: t.memberName,
          memberEmail: t.memberEmail,
          dueDate: t.dueDate,
          daysOverdue: Math.ceil((now - new Date(t.dueDate)) / (1000 * 60 * 60 * 24)),
          fine: t.currentFine,
        })),
        recentActivity,
      }
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/reports/members — all members list (admin only)
router.get('/members', requireAdmin, async (req, res) => {
  const db = getDb();
  try {
    const snap = await db.collection('users').where('role', '==', 'member').orderBy('name').get();
    const members = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, members });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/reports/members/:id/toggle — activate/deactivate member
router.put('/members/:id/toggle', requireAdmin, async (req, res) => {
  const db = getDb();
  try {
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'User not found' });
    const current = doc.data().isActive;
    await doc.ref.update({ isActive: !current });
    res.json({ success: true, message: `Member ${!current ? 'activated' : 'deactivated'}`, isActive: !current });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
