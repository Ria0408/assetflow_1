const pool = require('../config/db');

exports.getAll = async (req, res) => {
  const { status, category_id, department_id, search } = req.query;
  let sql = 'SELECT * FROM assets WHERE 1=1';
  const params = [];
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (category_id) { sql += ' AND category_id = ?'; params.push(category_id); }
  if (search) { sql += ' AND (asset_tag LIKE ? OR name LIKE ? OR serial_number LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const [rows] = await pool.query(sql, params);
  res.json(rows);
};

exports.getOne = async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM assets WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: 'Asset not found.' });
  res.json(rows[0]);
};

exports.create = async (req, res) => {
  const { asset_tag, name, category_id, serial_number, purchase_date, purchase_cost, location, condition, status } = req.body;
  if (!asset_tag || !name) return res.status(400).json({ message: 'Asset tag and name are required.' });

  const [dupTag] = await pool.query('SELECT id FROM assets WHERE asset_tag = ?', [asset_tag]);
  if (dupTag.length > 0) return res.status(409).json({ message: 'Asset tag already exists.' });

  if (serial_number) {
    const [dupSerial] = await pool.query('SELECT id FROM assets WHERE serial_number = ?', [serial_number]);
    if (dupSerial.length > 0) return res.status(409).json({ message: 'Serial number already exists.' });
  }

  const [result] = await pool.query(
    `INSERT INTO assets (asset_tag, name, category_id, serial_number, purchase_date, purchase_cost, location, \`condition\`, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [asset_tag, name, category_id || null, serial_number || null, purchase_date || null, purchase_cost || null, location || null, condition || 'Good', status || 'Available']
  );
  const [rows] = await pool.query('SELECT * FROM assets WHERE id = ?', [result.insertId]);
  res.status(201).json({ message: 'Asset registered successfully.', asset: rows[0] });
};

exports.update = async (req, res) => {
  const fields = ['name', 'category_id', 'serial_number', 'purchase_date', 'purchase_cost', 'location', 'condition', 'status'];
  const present = fields.filter((f) => req.body[f] !== undefined);
  if (present.length === 0) return res.status(400).json({ message: 'No valid fields provided.' });
  const setClause = present.map((f) => (f === 'condition' ? '`condition` = ?' : `${f} = ?`)).join(', ');
  const values = present.map((f) => req.body[f]);
  values.push(req.params.id);
  await pool.query(`UPDATE assets SET ${setClause} WHERE id = ?`, values);
  const [rows] = await pool.query('SELECT * FROM assets WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ message: 'Asset not found.' });
  res.json(rows[0]);
};

exports.remove = async (req, res) => {
  await pool.query('DELETE FROM assets WHERE id = ?', [req.params.id]);
  res.json({ message: 'Asset deleted.' });
};
