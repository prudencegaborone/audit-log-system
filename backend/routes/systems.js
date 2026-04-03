const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// GET all monitored systems
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [systems] = await db.query(
      'SELECT * FROM monitored_systems WHERE is_active = TRUE ORDER BY created_at ASC'
    );
    res.json({ systems });
  } catch (error) {
    console.error('Error fetching systems:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADD a new monitored system
router.post('/', authMiddleware, async (req, res) => {
  const { system_key, system_name, description, icon } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  const username = req.user.username;

  try {
    await db.query(
      `INSERT INTO monitored_systems (system_key, system_name, description, icon)
       VALUES (?, ?, ?, ?)`,
      [system_key, system_name, description, icon || '🔌']
    );

    // Log the addition of a new system
    await db.query(
      `INSERT INTO audit_logs
       (user_id, action_type, description, ip_address, status, system_source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, 'CREATE', `Added new monitored system: ${system_name}`, ip, 'SUCCESS', 'AUDIT_LOG_SYSTEM']
    );

    res.json({ message: 'System added successfully' });
  } catch (error) {
    console.error('Error adding system:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DEACTIVATE a system
router.put('/:id/deactivate', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const ip = req.ip || req.connection.remoteAddress;
  const username = req.user.username;

  try {
    const [rows] = await db.query('SELECT * FROM monitored_systems WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'System not found' });
    }

    await db.query('UPDATE monitored_systems SET is_active = FALSE WHERE id = ?', [id]);

    await db.query(
      `INSERT INTO audit_logs
       (user_id, action_type, description, ip_address, status, system_source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, 'UPDATE', `Deactivated monitored system: ${rows[0].system_name}`, ip, 'SUCCESS', 'AUDIT_LOG_SYSTEM']
    );

    res.json({ message: 'System deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating system:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
