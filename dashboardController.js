const pool = require('../config/db');

exports.summary = async (req, res) => {
  const [[assetTotals]] = await pool.query(`
    SELECT
      COUNT(*) AS total_assets,
      SUM(status = 'Available') AS available,
      SUM(status = 'Allocated') AS allocated,
      SUM(status = 'Under Maintenance') AS under_maintenance
    FROM assets
  `);
  const [[bookings]] = await pool.query(`SELECT COUNT(*) AS active_bookings FROM bookings WHERE status = 'Confirmed'`);
  const [[maintenance]] = await pool.query(`SELECT COUNT(*) AS pending_maintenance FROM maintenance_requests WHERE stage != 'Resolved'`);
  const [[overdue]] = await pool.query(`SELECT COUNT(*) AS overdue_returns FROM allocations WHERE status = 'Active' AND expected_return_date < CURDATE()`);
  const [[transfers]] = await pool.query(`SELECT COUNT(*) AS pending_transfers FROM transfer_requests WHERE status = 'Pending'`);
  const [recentActivity] = await pool.query(`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10`);

  res.json({
    total_assets: assetTotals.total_assets,
    available: assetTotals.available,
    allocated: assetTotals.allocated,
    under_maintenance: assetTotals.under_maintenance,
    active_bookings: bookings.active_bookings,
    pending_maintenance: maintenance.pending_maintenance,
    overdue_returns: overdue.overdue_returns,
    pending_transfers: transfers.pending_transfers,
    recent_activity: recentActivity
  });
};

exports.utilizationByDepartment = async (req, res) => {
  const [rows] = await pool.query(`
    SELECT d.name AS department, COUNT(a.id) AS allocated_assets
    FROM allocations a
    JOIN users u ON u.id = a.employee_id
    JOIN departments d ON d.id = u.department_id
    WHERE a.status = 'Active'
    GROUP BY d.name
  `);
  res.json(rows);
};

exports.idleAssets = async (req, res) => {
  const [rows] = await pool.query(`
    SELECT * FROM assets WHERE status = 'Available'
    AND id NOT IN (SELECT asset_id FROM allocations WHERE allocated_at > DATE_SUB(NOW(), INTERVAL 60 DAY))
  `);
  res.json(rows);
};

exports.maintenanceFrequency = async (req, res) => {
  const [rows] = await pool.query(`
    SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS requests
    FROM maintenance_requests GROUP BY month ORDER BY month
  `);
  res.json(rows);
};
