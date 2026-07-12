const express = require('express');
const router = express.Router();
const c = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/auth');

router.get('/summary', authenticate, c.summary);
router.get('/utilization-by-department', authenticate, c.utilizationByDepartment);
router.get('/idle-assets', authenticate, c.idleAssets);
router.get('/maintenance-frequency', authenticate, c.maintenanceFrequency);

module.exports = router;
