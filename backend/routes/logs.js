const express = require('express');
const router = express.Router();

const db = require('../db');

const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, async (req, res) => {

    const { username, action_type, status, start_date, end_date } = req.query;

  try {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';

    const params = [];

    if (username) {
      query += ' AND user_id LIKE ?';
      // The % signs mean "contains" — so it matches partial usernames too
      params.push(`%${username}%`);
    }

    if (action_type) {
      query += ' AND action_type = ?';
      params.push(action_type);
    }

    // If the admin filtered by status (SUCCESS or FAILED)
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    // If the admin set a start date, only show logs from that date onwards
    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }

    // If the admin set an end date, only show logs up to that date
    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY created_at DESC';

    // Run the final query with all the filters applied
    const [logs] = await db.query(query, params);

    // Send the log records back to the admin dashboard as JSON
    res.json({ logs });

  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Server error fetching logs' });
  }
});

router.get('/suspicious', authMiddleware, async (req, res) => {
  try {

    const [suspicious] = await db.query(`
      SELECT 
        ip_address, 
        COUNT(*) as failed_attempts,
        MAX(created_at) as last_attempt
      FROM audit_logs
      WHERE 
        action_type = 'LOGIN' 
        AND status = 'FAILED'
        AND created_at >= NOW() - INTERVAL 10 MINUTE
      GROUP BY ip_address
      HAVING COUNT(*) >= 5
      ORDER BY failed_attempts DESC
    `);

    // Send the list of suspicious IP addresses back to the dashboard
    res.json({ suspicious });

  } catch (error) {
    console.error('Error fetching suspicious activity:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/stats', authMiddleware, async (req, res) => {
  try {

    // Count the total number of log entries ever recorded
    const [total] = await db.query(
      'SELECT COUNT(*) as count FROM audit_logs'
    );

    // Count how many failed logins happened today
    const [failedToday] = await db.query(`
      SELECT COUNT(*) as count 
      FROM audit_logs 
      WHERE status = 'FAILED' 
      AND DATE(created_at) = CURDATE()
    `);

    const [successToday] = await db.query(`
      SELECT COUNT(*) as count 
      FROM audit_logs 
      WHERE action_type = 'LOGIN' 
      AND status = 'SUCCESS' 
      AND DATE(created_at) = CURDATE()
    `);

    // Send all the stats back to the dashboard
    res.json({
      totalLogs: total[0].count,
      failedLoginsToday: failedToday[0].count,
      successfulLoginsToday: successToday[0].count
    });

    } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Export this router so server.js can use it
module.exports = router;