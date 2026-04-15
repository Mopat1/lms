const { getAuth } = require('../config/firebase');

// Verify Firebase ID token
async function requireAuth(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split('Bearer ')[1]
      : req.session?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const decoded = await getAuth().verifyIdToken(token);

    // attach user
    req.user = decoded;

    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

// Admin middleware
async function requireAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split('Bearer ')[1]
      : req.session?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const decoded = await getAuth().verifyIdToken(token);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error('Admin auth error:', err.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

module.exports = { requireAuth, requireAdmin };