const express = require('express');
const router = express.Router();
const c = require('../controllers/assetController');
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, c.getAll);
router.get('/:id', authenticate, c.getOne);
router.post('/', authenticate, authorize('Admin'), c.create);
router.put('/:id', authenticate, authorize('Admin'), c.update);
router.delete('/:id', authenticate, authorize('Admin'), c.remove);

module.exports = router;
