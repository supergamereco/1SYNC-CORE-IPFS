const express = require('express');
const router = express.Router();

const IndexController = require('../controllers/index');

indexController = new IndexController();

router.get('/', indexController.index);

module.exports = router;