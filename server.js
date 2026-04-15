require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { initFirebase } = require('./config/firebase');
const { startCronJobs } = require('./utils/cron');

// Initialize Firebase
initFirebase();

const app = express();

// ── Security & Middleware ──────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'lms-secret-dev',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
}));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { success: false, error: 'Too many requests' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { success: false, error: 'Too many auth attempts' } });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// ── Static Files ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/reports', require('./routes/reports'));

// ── Firebase config endpoint (sends only PUBLIC config to frontend) ────────
app.get('/api/config', (req, res) => {
  res.json({
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    },
    library: {
      name: process.env.LIBRARY_NAME || 'City Public Library',
      maxBooks: process.env.MAX_BOOKS_PER_USER || 5,
      loanDays: process.env.LOAN_PERIOD_DAYS || 14,
      finePerDay: process.env.FINE_PER_DAY || 2.00,
      currency: process.env.CURRENCY_SYMBOL || '₹',
    }
  });
});

// ── Trigger manual overdue check (admin) ──────────────────────────────────
app.post('/api/admin/trigger-overdue-check', async (req, res) => {
  const { checkOverdueBooks } = require('./utils/cron');
  await checkOverdueBooks();
  res.json({ success: true, message: 'Overdue check triggered' });
});

// ── Serve SPA for all non-API routes ──────────────────────────────────────
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ success: false, error: 'API endpoint not found' });
  }
});

// ── Error handler ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Library Management System running at http://localhost:${PORT}`);
  console.log(`📚 Library: ${process.env.LIBRARY_NAME || 'City Public Library'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}\n`);
  startCronJobs();
});

module.exports = app;
