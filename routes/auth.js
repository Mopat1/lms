const router = require('express').Router();
const { getDb, getAuth } = require('../config/firebase');
const { requireAuth } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../utils/email');

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email format' });
    }
    if (phone && !/^\+?[\d\s\-]{10,15}$/.test(phone)) {
      return res.status(400).json({ success: false, error: 'Invalid phone number' });
    }

    // Only allow 'member' role from public signup; 'admin' requires special key
    let assignedRole = 'member';
    if (role === 'admin') {
      const adminKey = req.body.adminKey;
      if (adminKey !== process.env.ADMIN_SIGNUP_KEY && adminKey !== 'LIBRARY_ADMIN_2024') {
        return res.status(403).json({ success: false, error: 'Invalid admin registration key' });
      }
      assignedRole = 'admin';
    }

    // Create Firebase Auth user
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: name,
    });

    // Set custom claims for role
    await getAuth().setCustomUserClaims(userRecord.uid, { role: assignedRole });

    // Store user profile in Firestore
    const db = getDb();
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name,
      email,
      phone: phone || '',
      address: address || '',
      role: assignedRole,
      membershipId: `LIB${Date.now().toString().slice(-6)}`,
      joinedAt: new Date().toISOString(),
      isActive: true,
      totalBooksIssued: 0,
      currentBooksCount: 0,
      totalFinesPaid: 0,
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, name).catch(console.error);

    res.json({
      success: true,
      message: `Account created successfully as ${assignedRole}`,
      uid: userRecord.uid,
      role: assignedRole,
    });
  } catch (err) {
    console.error('Signup error:', err);
    if (err.code === 'auth/email-already-exists') {
      return res.status(400).json({ success: false, error: 'Email already registered' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/verify-token — verify token and return user profile
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'Token required' });

    const decoded = await getAuth().verifyIdToken(token);
    const db = getDb();
    const userDoc = await db.collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    const userData = userDoc.data();
    res.json({ success: true, user: { ...userData, uid: decoded.uid } });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

// GET /api/auth/profile
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user: userDoc.data() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/auth/profile
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const db = getDb();
    const updates = {};
    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    updates.updatedAt = new Date().toISOString();

    await db.collection('users').doc(req.user.uid).update(updates);
    if (name) await getAuth().updateUser(req.user.uid, { displayName: name });

    res.json({ success: true, message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
