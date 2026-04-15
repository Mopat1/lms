const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  return transporter;
}

const LIBRARY_NAME = () => process.env.LIBRARY_NAME || 'City Public Library';
const FINE_PER_DAY = () => parseFloat(process.env.FINE_PER_DAY) || 2.00;
const CURRENCY = () => process.env.CURRENCY_SYMBOL || '₹';

function baseTemplate(title, content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background:#f0f4f8; }
    .wrapper { max-width:600px; margin:30px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.10); }
    .header { background:linear-gradient(135deg, #1a3a5c 0%, #2d6a9f 100%); padding:36px 32px; text-align:center; }
    .header h1 { color:#fff; font-size:22px; font-weight:700; letter-spacing:0.5px; }
    .header p { color:rgba(255,255,255,0.75); font-size:13px; margin-top:6px; }
    .badge { display:inline-block; background:rgba(255,255,255,0.15); color:#fff; padding:4px 14px; border-radius:20px; font-size:12px; margin-top:10px; }
    .body { padding:36px 32px; }
    .greeting { font-size:18px; font-weight:600; color:#1a3a5c; margin-bottom:12px; }
    .text { color:#444; font-size:15px; line-height:1.7; margin-bottom:16px; }
    .info-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:20px 24px; margin:20px 0; }
    .info-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #e8edf3; }
    .info-row:last-child { border-bottom:none; }
    .info-label { color:#64748b; font-size:13px; font-weight:500; }
    .info-value { color:#1e293b; font-size:13px; font-weight:600; }
    .alert-box { background:#fff5f5; border:1px solid #fed7d7; border-radius:10px; padding:16px 20px; margin:20px 0; }
    .alert-box p { color:#c53030; font-size:14px; }
    .success-box { background:#f0fff4; border:1px solid #c6f6d5; border-radius:10px; padding:16px 20px; margin:20px 0; }
    .success-box p { color:#276749; font-size:14px; }
    .warning-box { background:#fffbeb; border:1px solid #fde68a; border-radius:10px; padding:16px 20px; margin:20px 0; }
    .warning-box p { color:#92400e; font-size:14px; }
    .btn { display:inline-block; background:linear-gradient(135deg,#1a3a5c,#2d6a9f); color:#fff; padding:13px 30px; border-radius:8px; text-decoration:none; font-size:15px; font-weight:600; margin:8px 0; }
    .footer { background:#f8fafc; padding:20px 32px; text-align:center; border-top:1px solid #e2e8f0; }
    .footer p { color:#94a3b8; font-size:12px; line-height:1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>📚 ${LIBRARY_NAME()}</h1>
      <p>Library Management System</p>
      <span class="badge">Official Notification</span>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated notification from ${LIBRARY_NAME()}.<br>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Welcome email after signup ──────────────────────────────────────────────
async function sendWelcomeEmail(to, name) {
  const html = baseTemplate('Welcome to the Library', `
    <p class="greeting">Welcome, ${name}! 👋</p>
    <p class="text">Your library account has been successfully created. You now have access to our full catalog of books.</p>
    <div class="success-box"><p>✅ Your account is active and ready to use.</p></div>
    <p class="text">With your account you can:</p>
    <ul style="color:#444;font-size:14px;line-height:2;padding-left:20px;margin-bottom:16px;">
      <li>Browse and search our entire book catalog</li>
      <li>Issue books (up to ${process.env.MAX_BOOKS_PER_USER || 5} at a time)</li>
      <li>Reserve books online</li>
      <li>Track your borrowing history</li>
      <li>Receive due-date reminders</li>
    </ul>
    <p class="text">The standard loan period is <strong>${process.env.LOAN_PERIOD_DAYS || 14} days</strong>. A fine of <strong>${CURRENCY()}${FINE_PER_DAY()} per day</strong> applies for overdue returns.</p>
  `);
  return sendMail(to, `Welcome to ${LIBRARY_NAME()}!`, html);
}

// ── Book issued confirmation ────────────────────────────────────────────────
async function sendBookIssuedEmail(to, name, book, dueDate) {
  const html = baseTemplate('Book Issued Successfully', `
    <p class="greeting">Book Issued, ${name}!</p>
    <p class="text">The following book has been successfully issued to your account:</p>
    <div class="info-card">
      <div class="info-row"><span class="info-label">📖 Book Title</span><span class="info-value">${book.title}</span></div>
      <div class="info-row"><span class="info-label">✍️ Author</span><span class="info-value">${book.author}</span></div>
      <div class="info-row"><span class="info-label">📅 Issue Date</span><span class="info-value">${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})}</span></div>
      <div class="info-row"><span class="info-label">⏰ Due Date</span><span class="info-value">${new Date(dueDate).toLocaleDateString('en-IN',{dateStyle:'long'})}</span></div>
      <div class="info-row"><span class="info-label">💰 Fine if overdue</span><span class="info-value">${CURRENCY()}${FINE_PER_DAY()} per day</span></div>
    </div>
    <div class="warning-box"><p>⚠️ Please return the book by the due date to avoid fines.</p></div>
  `);
  return sendMail(to, `Book Issued: ${book.title}`, html);
}

// ── Overdue reminder to member ──────────────────────────────────────────────
async function sendOverdueReminderToMember(to, name, book, dueDate, daysOverdue) {
  const fine = (daysOverdue * FINE_PER_DAY()).toFixed(2);
  const html = baseTemplate('⚠️ Overdue Book Notice', `
    <p class="greeting">Dear ${name},</p>
    <p class="text">This is an urgent reminder that a book borrowed from ${LIBRARY_NAME()} is <strong>overdue</strong>. Please return it immediately to avoid further fines.</p>
    <div class="alert-box"><p>🚨 Your book is <strong>${daysOverdue} day${daysOverdue>1?'s':''} overdue!</strong> Current fine: <strong>${CURRENCY()}${fine}</strong></p></div>
    <div class="info-card">
      <div class="info-row"><span class="info-label">📖 Book Title</span><span class="info-value">${book.title}</span></div>
      <div class="info-row"><span class="info-label">✍️ Author</span><span class="info-value">${book.author}</span></div>
      <div class="info-row"><span class="info-label">📅 Was Due On</span><span class="info-value">${new Date(dueDate).toLocaleDateString('en-IN',{dateStyle:'long'})}</span></div>
      <div class="info-row"><span class="info-label">📆 Days Overdue</span><span class="info-value" style="color:#c53030">${daysOverdue} days</span></div>
      <div class="info-row"><span class="info-label">💰 Current Fine</span><span class="info-value" style="color:#c53030">${CURRENCY()}${fine}</span></div>
    </div>
    <p class="text">Please visit the library as soon as possible to return the book and clear your dues. Fine increases by <strong>${CURRENCY()}${FINE_PER_DAY()} per day</strong>.</p>
  `);
  return sendMail(to, `OVERDUE: Please Return "${book.title}"`, html);
}

// ── Overdue alert to librarian ──────────────────────────────────────────────
async function sendOverdueAlertToLibrarian(book, member, dueDate, daysOverdue) {
  const to = process.env.LIBRARIAN_EMAIL;
  if (!to) return;
  const fine = (daysOverdue * FINE_PER_DAY()).toFixed(2);
  const html = baseTemplate('📋 Overdue Book Alert', `
    <p class="greeting">Librarian Notice</p>
    <p class="text">The following book has not been returned and is <strong>${daysOverdue} day${daysOverdue>1?'s':''} overdue</strong>. The member has been notified automatically.</p>
    <div class="alert-box"><p>🚨 Overdue by <strong>${daysOverdue} days</strong>. Accumulated fine: <strong>${CURRENCY()}${fine}</strong></p></div>
    <div class="info-card">
      <div class="info-row"><span class="info-label">📖 Book</span><span class="info-value">${book.title}</span></div>
      <div class="info-row"><span class="info-label">👤 Member Name</span><span class="info-value">${member.name}</span></div>
      <div class="info-row"><span class="info-label">📧 Member Email</span><span class="info-value">${member.email}</span></div>
      <div class="info-row"><span class="info-label">📱 Member Phone</span><span class="info-value">${member.phone || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">📅 Due Date</span><span class="info-value">${new Date(dueDate).toLocaleDateString('en-IN',{dateStyle:'long'})}</span></div>
      <div class="info-row"><span class="info-label">💰 Fine Accrued</span><span class="info-value" style="color:#c53030">${CURRENCY()}${fine}</span></div>
    </div>
    <p class="text">Please follow up with the member if the book is not returned within the next 2 days.</p>
  `);
  return sendMail(to, `[ACTION REQUIRED] Overdue Book: ${book.title} — ${member.name}`, html);
}

// ── Reservation confirmation ────────────────────────────────────────────────
async function sendReservationEmail(to, name, book) {
  const html = baseTemplate('Book Reserved Successfully', `
    <p class="greeting">Reservation Confirmed, ${name}!</p>
    <p class="text">Your book reservation has been successfully placed. You will be notified when the book becomes available.</p>
    <div class="success-box"><p>✅ Reservation is active. You are in the queue.</p></div>
    <div class="info-card">
      <div class="info-row"><span class="info-label">📖 Book Title</span><span class="info-value">${book.title}</span></div>
      <div class="info-row"><span class="info-label">✍️ Author</span><span class="info-value">${book.author}</span></div>
      <div class="info-row"><span class="info-label">📅 Reserved On</span><span class="info-value">${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})}</span></div>
    </div>
    <p class="text">When the book is available, you will have <strong>48 hours</strong> to come and collect it before the reservation is cancelled.</p>
  `);
  return sendMail(to, `Reservation Confirmed: ${book.title}`, html);
}

// ── Book available for reserved member ─────────────────────────────────────
async function sendBookAvailableEmail(to, name, book) {
  const html = baseTemplate('📬 Reserved Book Now Available!', `
    <p class="greeting">Great news, ${name}!</p>
    <p class="text">The book you reserved is now available for collection at the library.</p>
    <div class="success-box"><p>✅ Your reserved book is ready for pickup!</p></div>
    <div class="info-card">
      <div class="info-row"><span class="info-label">📖 Book Title</span><span class="info-value">${book.title}</span></div>
      <div class="info-row"><span class="info-label">✍️ Author</span><span class="info-value">${book.author}</span></div>
    </div>
    <div class="alert-box"><p>⚠️ Please collect the book within <strong>48 hours</strong> or your reservation will be automatically cancelled.</p></div>
  `);
  return sendMail(to, `Your Reserved Book is Available: ${book.title}`, html);
}

// ── Return confirmation ─────────────────────────────────────────────────────
async function sendReturnConfirmationEmail(to, name, book, fine) {
  const html = baseTemplate('Book Returned Successfully', `
    <p class="greeting">Thank you, ${name}!</p>
    <p class="text">The following book has been successfully returned to the library.</p>
    <div class="success-box"><p>✅ Book returned successfully. Thank you!</p></div>
    <div class="info-card">
      <div class="info-row"><span class="info-label">📖 Book Title</span><span class="info-value">${book.title}</span></div>
      <div class="info-row"><span class="info-label">📅 Return Date</span><span class="info-value">${new Date().toLocaleDateString('en-IN',{dateStyle:'long'})}</span></div>
      <div class="info-row"><span class="info-label">💰 Fine Paid</span><span class="info-value">${fine > 0 ? CURRENCY()+fine.toFixed(2) : 'None (Returned on time!)'}</span></div>
    </div>
    ${fine > 0 ? `<div class="alert-box"><p>💳 A fine of ${CURRENCY()}${fine.toFixed(2)} was applied for late return.</p></div>` : `<div class="success-box"><p>🎉 No fines — returned on time!</p></div>`}
    <p class="text">You can now borrow up to ${process.env.MAX_BOOKS_PER_USER || 5} books from the library. Thank you for being a responsible member!</p>
  `);
  return sendMail(to, `Book Returned: ${book.title}`, html);
}

// ── Core send function ──────────────────────────────────────────────────────
async function sendMail(to, subject, html) {
  try {
    const info = await getTransporter().sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || LIBRARY_NAME()}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${subject} [${info.messageId}]`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Email failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = {
  sendWelcomeEmail,
  sendBookIssuedEmail,
  sendOverdueReminderToMember,
  sendOverdueAlertToLibrarian,
  sendReservationEmail,
  sendBookAvailableEmail,
  sendReturnConfirmationEmail,
};
