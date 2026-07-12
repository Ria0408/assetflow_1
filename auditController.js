const pool = require('../config/db');

exports.getCycles = async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM audit_cycles');
  res.json(rows);
};

exports.createCycle = async (req, res) => {
  const { department_id, start_date, end_date } = req.body;
  if (!department_id || !start_date || !end_date) {
    return res.status(400).json({ message: 'department_id, start_date and end_date are required.' });
  }
  const [result] = await pool.query(
    'INSERT INTO audit_cycles (department_id, start_date, end_date, status) VALUES (?, ?, ?, "Open")',
    [department_id, start_date, end_date]
  );
  const [rows] = await pool.query('SELECT * FROM audit_cycles WHERE id = ?', [result.insertId]);
  res.status(201).json({ message: 'Audit cycle created.', cycle: rows[0] });
};

exports.addItem = async (req, res) => {
  const { audit_cycle_id, asset_id, reported_location, verification } = req.body;
  if (!audit_cycle_id || !asset_id || !verification) {
    return res.status(400).json({ message: 'audit_cycle_id, asset_id and verification are required.' });
  }
  const [result] = await pool.query(
    'INSERT INTO audit_items (audit_cycle_id, asset_id, reported_location, verification) VALUES (?, ?, ?, ?)',
    [audit_cycle_id, asset_id, reported_location || null, verification]
  );
  if (verification === 'Missing') {
    await pool.query('UPDATE assets SET status = "Lost" WHERE id = ?', [asset_id]);
  } else if (verification === 'Damaged') {
    await pool.query('UPDATE assets SET `condition` = "Damaged" WHERE id = ?', [asset_id]);
  }
  const [rows] = await pool.query('SELECT * FROM audit_items WHERE id = ?', [result.insertId]);
  res.status(201).json(rows[0]);
};

exports.closeCycle = async (req, res) => {
  await pool.query('UPDATE audit_cycles SET status = "Closed" WHERE id = ?', [req.params.id]);
  const [discrepancies] = await pool.query(
    'SELECT * FROM audit_items WHERE audit_cycle_id = ? AND verification != "Verified"',
    [req.params.id]
  );
  res.json({
    message: discrepancies.length > 0
      ? `Audit cycle closed. Discrepancy report generated automatically (${discrepancies.length} flagged).`
      : 'Audit cycle closed. No discrepancies found.',
    discrepancies
  });
};
