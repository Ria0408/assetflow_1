const pool = require('../config/db');

exports.getAll = async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM transfer_requests');
  res.json(rows);
};

exports.create = async (req, res) => {
  const { asset_id, from_employee_id, to_employee_id, reason } = req.body;
  if (!asset_id || !from_employee_id || !to_employee_id) {
    return res.status(400).json({ message: 'asset_id, from_employee_id and to_employee_id are required.' });
  }
  const [result] = await pool.query(
    'INSERT INTO transfer_requests (asset_id, from_employee_id, to_employee_id, reason, status) VALUES (?, ?, ?, ?, "Pending")',
    [asset_id, from_employee_id, to_employee_id, reason || null]
  );
  const [rows] = await pool.query('SELECT * FROM transfer_requests WHERE id = ?', [result.insertId]);
  res.status(201).json({ message: 'Transfer request submitted successfully.', transfer: rows[0] });
};

exports.updateStatus = async (req, res) => {
  const { status } = req.body; // Approved | Rejected
  if (!['Approved', 'Rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status.' });

  const [rows] = await pool.query('SELECT * FROM transfer_requests WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: 'Transfer request not found.' });
  const transfer = rows[0];

  await pool.query('UPDATE transfer_requests SET status = ? WHERE id = ?', [status, req.params.id]);

  if (status === 'Approved') {
    await pool.query(
      'UPDATE allocations SET status = "Returned", returned_at = NOW() WHERE asset_id = ? AND employee_id = ? AND status = "Active"',
      [transfer.asset_id, transfer.from_employee_id]
    );
    await pool.query(
      'INSERT INTO allocations (asset_id, employee_id, allocated_at, status) VALUES (?, ?, NOW(), "Active")',
      [transfer.asset_id, transfer.to_employee_id]
    );
    await pool.query('UPDATE assets SET status = "Allocated" WHERE id = ?', [transfer.asset_id]);
  }
  res.json({ message: `Transfer ${status.toLowerCase()}.` });
};
