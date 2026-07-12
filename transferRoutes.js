const express = require('express');
const router = express.Router();
const c = require('../controllers/transferController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, c.getAll);
router.post('/', authenticate, c.create);
router.put('/:id/status', authenticate, authorize('Admin'), c.updateStatus);

module.exports = router;
