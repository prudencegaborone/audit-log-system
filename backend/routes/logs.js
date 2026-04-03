const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// GET all logs with optional filters including system_source
router.get('/', authMiddleware, async (req, res) => {
  const { username, action_type, status, start_date, end_date, system_source } = req.query;

  try {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (username) {
      query += ' AND user_id LIKE ?';
      params.push(`%${username}%`);
    }
    if (action_type) {
      query += ' AND action_type = ?';
      params.push(action_type);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date);
    }
    if (system_source) {
      query += ' AND system_source = ?';
      params.push(system_source);
    }

    query += ' ORDER BY created_at DESC';

    const [logs] = await db.query(query, params);
    res.json({ logs });

  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Server error fetching logs' });
  }
});

// GET suspicious activity
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
    res.json({ suspicious });
  } catch (error) {
    console.error('Error fetching suspicious activity:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET dashboard stats — separated by system_source
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const [total] = await db.query(
      'SELECT COUNT(*) as count FROM audit_logs'
    );

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

    // Count logs per system source
    const [auditSystemLogs] = await db.query(`
      SELECT COUNT(*) as count 
      FROM audit_logs 
      WHERE system_source = 'AUDIT_LOG_SYSTEM'
    `);

    const [patientSystemLogs] = await db.query(`
      SELECT COUNT(*) as count 
      FROM audit_logs 
      WHERE system_source = 'PATIENT_RECORDS_SYSTEM'
    `);

    res.json({
      totalLogs: total[0].count,
      failedLoginsToday: failedToday[0].count,
      successfulLoginsToday: successToday[0].count,
      auditSystemLogs: auditSystemLogs[0].count,
      patientSystemLogs: patientSystemLogs[0].count
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// EXPORT logs as CSV
router.get('/export', authMiddleware, async (req, res) => {
  const { username, action_type, status, start_date, end_date, system_source } = req.query;

  try {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (username) {
      query += ' AND user_id LIKE ?';
      params.push(`%${username}%`);
    }
    if (action_type) {
      query += ' AND action_type = ?';
      params.push(action_type);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date);
    }
    if (system_source) {
      query += ' AND system_source = ?';
      params.push(system_source);
    }

    query += ' ORDER BY created_at DESC';

    const [logs] = await db.query(query, params);

    // Build CSV with system_source column included
    const headers = 'ID,Username,Action,Description,IP Address,Status,System,Date & Time\n';
    const rows = logs.map(log => {
      const date = new Date(log.created_at).toLocaleString();
      return `${log.id},${log.user_id},${log.action_type},"${log.description}",${log.ip_address},${log.status},${log.system_source},"${date}"`;
    }).join('\n');

    const csv = headers + rows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Server error during export' });
  }
});

module.exports = router;