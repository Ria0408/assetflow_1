const pool = require('../config/db');

// Generic CRUD factory for simple tables.
module.exports = function (table, allowedFields) {
  return {
    getAll: async (req, res) => {
      const [rows] = await pool.query(`SELECT * FROM ${table}`);
      res.json(rows);
    },
    getOne: async (req, res) => {
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ message: `${table} not found.` });
      res.json(rows[0]);
    },
    create: async (req, res) => {
      const fields = allowedFields.filter((f) => req.body[f] !== undefined);
      if (fields.length === 0) return res.status(400).json({ message: 'No valid fields provided.' });
      const values = fields.map((f) => req.body[f]);
      const placeholders = fields.map(() => '?').join(', ');
      const [result] = await pool.query(
        `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`,
        values
      );
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [result.insertId]);
      res.status(201).json(rows[0]);
    },
    update: async (req, res) => {
      const fields = allowedFields.filter((f) => req.body[f] !== undefined);
      if (fields.length === 0) return res.status(400).json({ message: 'No valid fields provided.' });
      const setClause = fields.map((f) => `${f} = ?`).join(', ');
      const values = fields.map((f) => req.body[f]);
      values.push(req.params.id);
      await pool.query(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);
      const [rows] = await pool.query(`SELECT * FROM ${table} WHERE id = ?`, [req.params.id]);
      if (rows.length === 0) return res.status(404).json({ message: `${table} not found.` });
      res.json(rows[0]);
    },
    remove: async (req, res) => {
      await pool.query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
      res.json({ message: `${table} deleted.` });
    },
  };
};
