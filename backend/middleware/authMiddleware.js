const jwt = require('jsonwebtoken');

require('dotenv').config();

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

    if (decoded.role !== 'admin') {
      return res.status(403).json({ 
        message: 'Access denied. Admins only.' 
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

// Export the middleware so logs.js can import and use it
module.exports = authMiddleware;

