const pool = require('../config/db');

const STAGES = ['Pending', 'Approved', 'Technician Assigned', 'In Progress', 'Resolved'];

exports.getAll = async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM maintenance_requests');
  res.json(rows);
};

exports.create = async (req, res) => {
  const { asset_id, raised_by, issue_description, priority } = req.body;
  if (!asset_id || !raised_by || !issue_description) {
    return res.status(400).json({ message: 'asset_id, raised_by and issue_description are required.' });
  }
  const [result] = await pool.query(
    'INSERT INTO maintenance_requests (asset_id, raised_by, issue_description, priority, stage) VALUES (?, ?, ?, ?, "Pending")',
    [asset_id, raised_by, issue_description, priority || 'Medium']
  );
  const [rows] = await pool.query('SELECT * FROM maintenance_requests WHERE id = ?', [result.insertId]);
  res.status(201).json({ message: 'Maintenance request submitted.', request: rows[0] });
};

exports.updateStage = async (req, res) => {
  const { stage, technician } = req.body;
  if (!STAGES.includes(stage)) return res.status(400).json({ message: 'Invalid stage.' });

  const [rows] = await pool.query('SELECT * FROM maintenance_requests WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: 'Maintenance request not found.' });
  const request = rows[0];

  if (stage === 'Approved') {
    await pool.query('UPDATE assets SET status = "Under Maintenance" WHERE id = ?', [request.asset_id]);
  }

  const resolvedAt = stage === 'Resolved' ? new Date() : null;
  await pool.query(
    'UPDATE maintenance_requests SET stage = ?, technician = COALESCE(?, technician), resolved_at = ? WHERE id = ?',
    [stage, technician || null, resolvedAt, req.params.id]
  );

  if (stage === 'Resolved') {
    await pool.query('UPDATE assets SET status = "Available" WHERE id = ?', [request.asset_id]);
  }

  res.json({ message: `Maintenance ${stage.toLowerCase()} successfully.` });
};
