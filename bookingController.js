const pool = require('../config/db');

exports.getAll = async (req, res) => {
  const { resource_id } = req.query;
  let sql = 'SELECT * FROM bookings WHERE 1=1';
  const params = [];
  if (resource_id) { sql += ' AND resource_id = ?'; params.push(resource_id); }
  const [rows] = await pool.query(sql, params);
  res.json(rows);
};

exports.create = async (req, res) => {
  const { resource_id, booked_by, start_time, end_time } = req.body;
  if (!resource_id || !booked_by || !start_time || !end_time) {
    return res.status(400).json({ message: 'resource_id, booked_by, start_time and end_time are required.' });
  }
  if (new Date(start_time) >= new Date(end_time)) {
    return res.status(400).json({ message: 'Start time must be before end time.' });
  }

  const [conflicts] = await pool.query(
    `SELECT * FROM bookings WHERE resource_id = ? AND status = 'Confirmed'
     AND NOT (end_time <= ? OR start_time >= ?)`,
    [resource_id, start_time, end_time]
  );
  if (conflicts.length > 0) {
    return res.status(409).json({ message: 'Selected time slot is unavailable.' });
  }

  const [result] = await pool.query(
    'INSERT INTO bookings (resource_id, booked_by, start_time, end_time, status) VALUES (?, ?, ?, ?, "Confirmed")',
    [resource_id, booked_by, start_time, end_time]
  );
  const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [result.insertId]);
  res.status(201).json({ message: 'Booking confirmed.', booking: rows[0] });
};

exports.cancel = async (req, res) => {
  await pool.query('UPDATE bookings SET status = "Cancelled" WHERE id = ?', [req.params.id]);
  res.json({ message: 'Booking cancelled.' });
};

exports.reschedule = async (req, res) => {
  const { start_time, end_time } = req.body;
  const [rows] = await pool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: 'Booking not found.' });
  const booking = rows[0];

  const [conflicts] = await pool.query(
    `SELECT * FROM bookings WHERE resource_id = ? AND id != ? AND status = 'Confirmed'
     AND NOT (end_time <= ? OR start_time >= ?)`,
    [booking.resource_id, req.params.id, start_time, end_time]
  );
  if (conflicts.length > 0) {
    return res.status(409).json({ message: 'Selected time slot is unavailable.' });
  }
  await pool.query('UPDATE bookings SET start_time = ?, end_time = ? WHERE id = ?', [start_time, end_time, req.params.id]);
  res.json({ message: 'Booking rescheduled.' });
};
