const express = require('express');
const router = express.Router();
const c = require('../controllers/bookingController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, c.getAll);
router.post('/', authenticate, c.create);
router.put('/:id/cancel', authenticate, c.cancel);
router.put('/:id/reschedule', authenticate, c.reschedule);

module.exports = router;
