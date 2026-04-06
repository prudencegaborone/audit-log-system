const jwt = require('jsonwebtoken');
require('dotenv').config();

// Basic auth middleware — allows admin and auditor
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      message: 'Access denied. No token provided. Please log in.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Allow admin and auditor roles only
    if (!['admin', 'auditor', 'viewer'].includes(decoded.role)) {
      return res.status(403).json({
        message: 'Access denied. Insufficient permissions.'
      });
    }

    req.user = decoded;
    next();

  } catch (error) {
    return res.status(401).json({
      message: 'Invalid or expired token. Please log in again.'
    });
  }
};

// Admin only middleware — protects sensitive actions
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'Access denied. This action requires admin privileges.'
    });
  }
  next();
};

// Auditor and admin middleware — allows viewing and exporting
const auditorAndAbove = (req, res, next) => {
  if (!['admin', 'auditor'].includes(req.user.role)) {
    return res.status(403).json({
      message: 'Access denied. Auditor or admin role required.'
    });
  }
  next();
};

module.exports = { authMiddleware, adminOnly, auditorAndAbove };