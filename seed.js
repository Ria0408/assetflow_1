require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const DATA_DIR = path.join(__dirname, '..', 'data');

// Load order respects FK dependencies. FK checks disabled during load to
// allow departments<->users circular reference from source CSVs.
const TABLES = [
  'departments',
  'users',
  'categories',
  'assets',
  'allocations',
  'transfer_requests',
  'resources',
  'bookings',
  'maintenance_requests',
  'audit_cycles',
  'audit_items',
  'notifications',
  'activity_logs',
];

function readCsv(table) {
  const file = path.join(DATA_DIR, `${table}.csv`);
  if (!fs.existsSync(file)) return [];
  const content = fs.readFileSync(file, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

function toNullable(v) {
  return v === '' || v === undefined ? null : v;
}

async function insertRows(conn, table, rows) {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const placeholders = `(${columns.map(() => '?').join(', ')})`;
  const sql = `INSERT INTO ${table} (${columns.map((c) => (c === 'condition' ? '`condition`' : c)).join(', ')}) VALUES ${placeholders}`;
  for (const row of rows) {
    const values = columns.map((c) => toNullable(row[c]));
    await conn.query(sql, values);
  }
}

async function seed() {
  // Connect WITHOUT selecting a database first, so we can drop + recreate it.
  // This guarantees the schema is always fresh — avoids "unknown column"
  // errors from an old database created before a schema change.
  const bootstrapConn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });
  const dbName = process.env.DB_NAME || 'assetflow';
  console.log(`Resetting database "${dbName}"...`);
  await bootstrapConn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
  await bootstrapConn.end();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  console.log('Applying schema...');
  const schema = fs.readFileSync(path.join(__dirname, '..', 'config', 'schema.sql'), 'utf8');
  await conn.query(schema);
  await conn.query(`USE \`${dbName}\``);

  console.log('Disabling FK checks and truncating tables...');
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of [...TABLES].reverse()) {
    await conn.query(`TRUNCATE TABLE ${table}`);
  }

  for (const table of TABLES) {
    const rows = readCsv(table);
    console.log(`Seeding ${table}: ${rows.length} rows`);
    await insertRows(conn, table, rows);
  }

  // There is exactly ONE Admin account in this system. Everyone else who
  // signs up through the app becomes an Employee automatically.
  console.log('Creating the single Admin account...');
  const adminAccount = { name: 'Priya Shah', email: 'admin@assetflow.com', password: 'Admin@123', role: 'Admin', department_id: 1 };
  const hash = await bcrypt.hash(adminAccount.password, 12);
  await conn.query(
    `INSERT INTO users (name, email, password_hash, role, department_id, is_verified)
     VALUES (?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role), is_verified = 1`,
    [adminAccount.name, adminAccount.email, hash, adminAccount.role, adminAccount.department_id]
  );
  // Make sure every other pre-existing (CSV-imported) user is treated as a
  // verified, ordinary Employee — only the account above keeps Admin.
  await conn.query(`UPDATE users SET is_verified = 1 WHERE email != ?`, [adminAccount.email]);
  await conn.query(`UPDATE users SET role = 'Employee' WHERE email != ?`, [adminAccount.email]);

  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();

  console.log('\nSeed complete.');
  console.log(`  Admin login:  ${adminAccount.email}  /  ${adminAccount.password}`);
  console.log('  Everyone else: sign up in the app — new accounts are always Employees.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
