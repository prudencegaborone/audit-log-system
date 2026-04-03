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
      await db.query(
        `INSERT INTO audit_logs 
        (user_id, action_type, description, ip_address, status, system_source) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [username, 'LOGIN', 'Failed login - username not found', ip, 'FAILED', 'AUDIT_LOG_SYSTEM']
      );
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      await db.query(
        `INSERT INTO audit_logs 
        (user_id, action_type, description, ip_address, status, system_source) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [username, 'LOGIN', 'Failed login - wrong password', ip, 'FAILED', 'AUDIT_LOG_SYSTEM']
      );
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await db.query(
      `INSERT INTO audit_logs 
      (user_id, action_type, description, ip_address, status, system_source) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [username, 'LOGIN', 'Successful login', ip, 'SUCCESS', 'AUDIT_LOG_SYSTEM']
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.post('/logout', async (req, res) => {
  const { username } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  try {
    await db.query(
      `INSERT INTO audit_logs 
      (user_id, action_type, description, ip_address, status, system_source) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [username, 'LOGOUT', 'User logged out', ip, 'SUCCESS', 'AUDIT_LOG_SYSTEM']
    );
    res.json({ message: 'Logout successful' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error during logout' });
  }
});

module.exports = router;