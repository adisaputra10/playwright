const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

router.get('/', employeeController.index);
router.get('/create', employeeController.showCreate);
router.post('/', employeeController.create);
router.get('/:id/edit', employeeController.showEdit);
router.get('/:id', employeeController.show);
router.put('/:id', employeeController.update);
router.delete('/:id', employeeController.delete);

module.exports = router;
