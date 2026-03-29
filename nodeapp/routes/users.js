const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { ensureAuthenticated } = require('../middleware/auth');

router.use(ensureAuthenticated);

router.get('/', userController.index);
router.get('/create', userController.showCreate);
router.post('/', userController.create);
router.get('/:id/edit', userController.showEdit);
router.put('/:id', userController.update);
router.delete('/:id', userController.delete);

module.exports = router;
