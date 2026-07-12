const express = require('express');
const router = express.Router();
const c = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/cycles', authenticate, c.getCycles);
router.post('/cycles', authenticate, authorize('Admin'), c.createCycle);
router.put('/cycles/:id/close', authenticate, authorize('Admin'), c.closeCycle);
router.post('/items', authenticate, authorize('Admin'), c.addItem);

module.exports = router;
