const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// Helper function to log actions - now includes system_source
const logAction = async (username, actionType, description, ip, status) => {
  await db.query(
    `INSERT INTO audit_logs 
    (user_id, action_type, description, ip_address, status, system_source)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [username, actionType, description, ip, status, 'PATIENT_RECORDS_SYSTEM']
  );
};

// GET all patients
router.get('/', authMiddleware, async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const username = req.user.username;

  try {
    const [patients] = await db.query('SELECT * FROM patients ORDER BY created_at DESC');
    await logAction(username, 'VIEW', 'Viewed all patient records', ip, 'SUCCESS');
    res.json({ patients });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET single patient
router.get('/:id', authMiddleware, async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const username = req.user.username;
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT * FROM patients WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const patient = rows[0];
    await logAction(
      username, 'VIEW',
      `Viewed patient record: ${patient.first_name} ${patient.last_name}`,
      ip, 'SUCCESS'
    );
    res.json({ patient });
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// CREATE patient
router.post('/', authMiddleware, async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const username = req.user.username;
  const { first_name, last_name, date_of_birth, gender, phone, email, address, diagnosis } = req.body;

  try {
    const [result] = await db.query(
      `INSERT INTO patients 
       (first_name, last_name, date_of_birth, gender, phone, email, address, diagnosis, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, date_of_birth, gender, phone, email, address, diagnosis, username]
    );

    await logAction(
      username, 'CREATE',
      `Created new patient record: ${first_name} ${last_name}`,
      ip, 'SUCCESS'
    );

    res.json({ message: 'Patient created successfully', id: result.insertId });
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE patient
router.put('/:id', authMiddleware, async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const username = req.user.username;
  const { id } = req.params;
  const { first_name, last_name, date_of_birth, gender, phone, email, address, diagnosis } = req.body;

  try {
    await db.query(
      `UPDATE patients SET 
       first_name=?, last_name=?, date_of_birth=?, gender=?, 
       phone=?, email=?, address=?, diagnosis=?
       WHERE id=?`,
      [first_name, last_name, date_of_birth, gender, phone, email, address, diagnosis, id]
    );

    await logAction(
      username, 'UPDATE',
      `Updated patient record: ${first_name} ${last_name} (ID: ${id})`,
      ip, 'SUCCESS'
    );

    res.json({ message: 'Patient updated successfully' });
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE patient
router.delete('/:id', authMiddleware, async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const username = req.user.username;
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT * FROM patients WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const patient = rows[0];
    await db.query('DELETE FROM patients WHERE id = ?', [id]);

    await logAction(
      username, 'DELETE',
      `Deleted patient record: ${patient.first_name} ${patient.last_name} (ID: ${id})`,
      ip, 'SUCCESS'
    );

    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;