const express = require('express');
const router = express.Router();
const generic = require('../controllers/genericController')('departments', ['name', 'head_id', 'parent_dept_id', 'status']);
const { authenticate, authorize } = require('../middleware/auth');

router.get('/', authenticate, generic.getAll);
router.get('/:id', authenticate, generic.getOne);
router.post('/', authenticate, authorize('Admin'), generic.create);
router.put('/:id', authenticate, authorize('Admin'), generic.update);
router.delete('/:id', authenticate, authorize('Admin'), generic.remove);

module.exports = router;
