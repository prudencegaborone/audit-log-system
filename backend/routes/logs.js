const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, adminOnly, auditorAndAbove } = require('../middleware/authMiddleware');

// GET all logs with filters and pagination
// Both admin and auditor can view logs
router.get('/', authMiddleware, async (req, res) => {
  const { username, action_type, status, start_date, end_date, system_source, page = 1, limit = 50 } = req.query;

  try {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const params = [];
    const countParams = [];

    if (username) {
      query += ' AND user_id LIKE ?';
      countQuery += ' AND user_id LIKE ?';
      params.push(`%${username}%`);
      countParams.push(`%${username}%`);
    }
    if (action_type) {
      query += ' AND action_type = ?';
      countQuery += ' AND action_type = ?';
      params.push(action_type);
      countParams.push(action_type);
    }
    if (status) {
      query += ' AND status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }
    if (start_date) {
      query += ' AND created_at >= ?';
      countQuery += ' AND created_at >= ?';
      params.push(start_date);
      countParams.push(start_date);
    }
    if (end_date) {
      query += ' AND created_at <= ?';
      countQuery += ' AND created_at <= ?';
      params.push(end_date);
      countParams.push(end_date);
    }
    if (system_source) {
      query += ' AND system_source = ?';
      countQuery += ' AND system_source = ?';
      params.push(system_source);
      countParams.push(system_source);
    }

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await db.query(query, params);

    res.json({
      logs,
      pagination: {
        total,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Server error fetching logs' });
  }
});

// GET suspicious activity
// Both admin and auditor can view
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

// GET dashboard stats
// Both admin and auditor can view
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
// Both admin and auditor can export
router.get('/export', authMiddleware, auditorAndAbove, async (req, res) => {
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

// ARCHIVE logs — admin only
// Auditors cannot archive — protects log integrity
router.delete('/retention', authMiddleware, adminOnly, async (req, res) => {
  const { days = 90 } = req.query;
  const username = req.user.username;
  const ip = req.ip || req.connection.remoteAddress;

  try {
    const [archiveResult] = await db.query(
      `INSERT INTO audit_logs_archive 
       (id, user_id, action_type, description, ip_address, status, system_source, created_at)
       SELECT id, user_id, action_type, description, ip_address, status, system_source, created_at
       FROM audit_logs
       WHERE created_at < NOW() - INTERVAL ? DAY
       AND system_source != 'AUDIT_LOG_SYSTEM'`,
      [parseInt(days)]
    );

    const [deleteResult] = await db.query(
      `DELETE FROM audit_logs
       WHERE created_at < NOW() - INTERVAL ? DAY
       AND system_source != 'AUDIT_LOG_SYSTEM'`,
      [parseInt(days)]
    );

    await db.query(
      `INSERT INTO audit_logs
       (user_id, action_type, description, ip_address, status, system_source)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [username, 'DELETE',
        `Log archiving applied: moved ${deleteResult.affectedRows} records older than ${days} days to archive`,
        ip, 'SUCCESS', 'AUDIT_LOG_SYSTEM']
    );

    res.json({
      message: `Successfully archived logs older than ${days} days`,
      archivedCount: deleteResult.affectedRows
    });

  } catch (error) {
    console.error('Archive error:', error);
    res.status(500).json({ message: 'Server error during archiving' });
  }
});

// GET archived logs
// Both admin and auditor can view archive
router.get('/archive', authMiddleware, auditorAndAbove, async (req, res) => {
  const { username, action_type, status, system_source } = req.query;

  try {
    let query = 'SELECT * FROM audit_logs_archive WHERE 1=1';
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
    if (system_source) {
      query += ' AND system_source = ?';
      params.push(system_source);
    }

    query += ' ORDER BY created_at DESC';

    const [logs] = await db.query(query, params);
    res.json({ logs, total: logs.length });

  } catch (error) {
    console.error('Error fetching archive:', error);
    res.status(500).json({ message: 'Server error fetching archive' });
  }
});

module.exports = router;