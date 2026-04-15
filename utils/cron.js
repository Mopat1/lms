const cron = require('node-cron');
const { getDb } = require('../config/firebase');
const email = require('./email');

const FINE_PER_DAY = () => parseFloat(process.env.FINE_PER_DAY) || 2.00;

function daysOverdue(dueDate) {
  return Math.ceil((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24));
}

// Run every day at 9:00 AM
async function checkOverdueBooks() {
  console.log('🔔 Running overdue check cron job...');
  const db = getDb();
  const now = new Date().toISOString();

  try {
    const snap = await db.collection('transactions')
      .where('status', '==', 'issued')
      .where('dueDate', '<', now)
      .get();

    if (snap.empty) {
      console.log('✅ No overdue books found.');
      return;
    }

    console.log(`⚠️  Found ${snap.size} overdue book(s). Sending notifications...`);

    const batch = db.batch();
    const notificationPromises = [];

    for (const doc of snap.docs) {
      const tx = doc.data();
      const days = daysOverdue(tx.dueDate);
      const fine = parseFloat((days * FINE_PER_DAY()).toFixed(2));

      // Fetch user info
      const userDoc = await db.collection('users').doc(tx.userId).get();
      if (!userDoc.exists) continue;
      const user = userDoc.data();

      const book = { title: tx.bookTitle, author: tx.bookAuthor };
      const member = { name: user.name, email: user.email, phone: user.phone };

      // Send to member
      notificationPromises.push(
        email.sendOverdueReminderToMember(user.email, user.name, book, tx.dueDate, days)
      );

      // Send to librarian
      notificationPromises.push(
        email.sendOverdueAlertToLibrarian(book, member, tx.dueDate, days)
      );

      // Update fine in Firestore
      batch.update(doc.ref, { fine, lastNotifiedAt: new Date().toISOString() });

      console.log(`  📧 Notifying: ${user.name} (${user.email}) — "${tx.bookTitle}" — ${days} days overdue — Fine: ₹${fine}`);
    }

    await Promise.allSettled(notificationPromises);
    await batch.commit();
    console.log(`✅ Overdue notifications sent for ${snap.size} book(s).`);
  } catch (err) {
    console.error('❌ Overdue cron error:', err.message);
  }
}

// Also expire old reservations (> 48 hrs after book became available)
async function expireReservations() {
  const db = getDb();
  try {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 48);

    const snap = await db.collection('reservations')
      .where('status', '==', 'active')
      .where('expiresAt', '<', cutoff.toISOString())
      .get();

    if (!snap.empty) {
      const batch = db.batch();
      snap.forEach(doc => batch.update(doc.ref, { status: 'expired', expiredAt: new Date().toISOString() }));
      await batch.commit();
      console.log(`🗑️  Expired ${snap.size} reservation(s)`);
    }
  } catch (err) {
    console.error('❌ Reservation expiry error:', err.message);
  }
}

function startCronJobs() {
  // Every day at 9 AM
  cron.schedule('0 9 * * *', () => {
    checkOverdueBooks();
    expireReservations();
  });

  console.log('⏰ Cron jobs scheduled: Daily overdue check at 9:00 AM');

  // Also run once on startup (after 5 seconds)
  setTimeout(() => {
    console.log('🚀 Running initial overdue check on startup...');
    checkOverdueBooks();
  }, 5000);
}

module.exports = { startCronJobs, checkOverdueBooks };
