const express = require('express');
const router = express.Router();
const c = require('../controllers/allocationController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, c.getAll);
router.post('/', authenticate, authorize('Admin'), c.allocate);
router.post('/:id/return', authenticate, authorize('Admin'), c.returnAsset);

module.exports = router;
