const pool = require('../config/db');

exports.getAll = async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM allocations');
  res.json(rows);
};

exports.allocate = async (req, res) => {
  const { asset_id, employee_id, expected_return_date } = req.body;
  if (!asset_id || !employee_id) return res.status(400).json({ message: 'asset_id and employee_id are required.' });

  const [asset] = await pool.query('SELECT * FROM assets WHERE id = ?', [asset_id]);
  if (asset.length === 0) return res.status(404).json({ message: 'Asset not found.' });

  const [active] = await pool.query(
    'SELECT a.*, u.name AS employee_name FROM allocations a JOIN users u ON u.id = a.employee_id WHERE a.asset_id = ? AND a.status = "Active"',
    [asset_id]
  );
  if (active.length > 0) {
    return res.status(409).json({ message: `This asset is already allocated to ${active[0].employee_name}.` });
  }

  const [result] = await pool.query(
    'INSERT INTO allocations (asset_id, employee_id, allocated_at, expected_return_date, status) VALUES (?, ?, NOW(), ?, "Active")',
    [asset_id, employee_id, expected_return_date || null]
  );
  await pool.query('UPDATE assets SET status = "Allocated" WHERE id = ?', [asset_id]);
  const [rows] = await pool.query('SELECT * FROM allocations WHERE id = ?', [result.insertId]);
  res.status(201).json({ message: 'Asset allocated successfully.', allocation: rows[0] });
};

exports.returnAsset = async (req, res) => {
  const { return_condition } = req.body;
  const [rows] = await pool.query('SELECT * FROM allocations WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: 'Allocation not found.' });
  const alloc = rows[0];
  if (alloc.status === 'Returned') return res.status(400).json({ message: 'Asset already returned.' });

  await pool.query(
    'UPDATE allocations SET status = "Returned", returned_at = NOW(), return_condition = ? WHERE id = ?',
    [return_condition || null, req.params.id]
  );
  await pool.query('UPDATE assets SET status = "Available", `condition` = COALESCE(?, `condition`) WHERE id = ?', [return_condition, alloc.asset_id]);
  res.json({ message: 'Asset returned successfully.' });
};
