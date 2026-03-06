const express = require('express');
const router = express.Router();

const bcrypt = require('bcryptjs');

const jwt = require('jsonwebtoken');

const db = require('../db');

require('dotenv').config();

router.post('/login', async (req, res) => {
const { username, password } = req.body;
const ip = req.ip || req.connection.remoteAddress;

try {
     const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ?', 
      [username]
    );
    if (rows.length === 0) {

      // Save a FAILED log entry to the audit_logs table
      await db.query(
        `INSERT INTO audit_logs 
        (user_id, action_type, description, ip_address, status) 
        VALUES (?, ?, ?, ?, ?)`,
        [username, 'LOGIN', `Failed login - username not found`, ip, 'FAILED']
      );

      // Send a 401 response back to the frontend meaning unauthorised
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // If user was found, get the first result from the array
    const user = rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password);

    // If the password does not match
    if (!passwordMatch) {

      // Save a FAILED log entry
      await db.query(
        `INSERT INTO audit_logs 
        (user_id, action_type, description, ip_address, status) 
        VALUES (?, ?, ?, ?, ?)`,
        [username, 'LOGIN', `Failed login - wrong password`, ip, 'FAILED']
      );

      // Send 401 unauthorised response
      return res.status(401).json({ message: 'Invalid username or password' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Save a SUCCESS log entry to the audit_logs table
    await db.query(
      `INSERT INTO audit_logs 
      (user_id, action_type, description, ip_address, status) 
      VALUES (?, ?, ?, ?, ?)`,
      [username, 'LOGIN', `Successful login`, ip, 'SUCCESS']
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });

  } catch (error) {
    // If anything unexpected goes wrong, log it and send a 500 server error
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.post('/logout', async (req, res) => {

  // Get username from the request body
  const { username } = req.body;

  // Get IP address
  const ip = req.ip || req.connection.remoteAddress;

  try {
    // Save a logout log entry to the audit_logs table
    await db.query(
      `INSERT INTO audit_logs 
      (user_id, action_type, description, ip_address, status) 
      VALUES (?, ?, ?, ?, ?)`,
      [username, 'LOGOUT', `User logged out`, ip, 'SUCCESS']
    );

    // Send a success response back to the frontend
    res.json({ message: 'Logout successful' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

// Export this router so server.js can use it
module.exports = router;