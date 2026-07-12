const express = require('express');
const router = express.Router();
const generic = require('../controllers/genericController')('resources', ['name', 'type']);
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, generic.getAll);
router.post('/', authenticate, authorize('Admin'), generic.create);
router.put('/:id', authenticate, authorize('Admin'), generic.update);
router.delete('/:id', authenticate, authorize('Admin'), generic.remove);

module.exports = router;
