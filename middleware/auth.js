const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getAuth } = require('../config/firebase');


// ===============================
// 🔐 SIGNUP
// ===============================
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName: name
    });

    res.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName
      }
    });

  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});


// ===============================
// 🔐 LOGIN (TOKEN VERIFY)
// ===============================
router.post('/login', async (req, res) => {
  try {
    const { token } = req.body;

    const decoded = await getAuth().verifyIdToken(token);

    // store session
    req.session.token = token;

    res.json({
      success: true,
      user: decoded
    });

  } catch (err) {
    res.status(401).json({
      success: false,
      error: 'Invalid login'
    });
  }
});


// ===============================
// 👤 GET PROFILE (FIX)
// ===============================
router.get('/profile', requireAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


// ===============================
// ✏️ UPDATE PROFILE (ALREADY USED BY YOUR FRONTEND)
// ===============================
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    // update Firebase user
    await getAuth().updateUser(req.user.uid, {
      displayName: name
    });

    res.json({
      success: true,
      message: 'Profile updated'
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});


// ===============================
module.exports = router;