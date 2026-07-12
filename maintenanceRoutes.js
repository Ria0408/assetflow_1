const express = require('express');
const router = express.Router();
const c = require('../controllers/maintenanceController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, c.getAll);
router.post('/', authenticate, c.create);
router.put('/:id/stage', authenticate, authorize('Admin'), c.updateStage);

module.exports = router;
