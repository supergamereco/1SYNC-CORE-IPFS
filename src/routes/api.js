const express = require('express');
// const asyncHandler = require('express-async-handler')
const router = express.Router();

const ApiController = require('../controllers/api');
const controller = new ApiController();

/* POST ipfs. */
router.post('/ipns', controller.postIpns);
router.post('/image/upload', controller.postImageUpload);
router.post('/image/token', controller.postImageToken);
router.put('/ipns', controller.postIpns);  //Mutate data can use same method with create new metadata
router.put('/image/token', controller.postImageToken); //Mutate data can use same method with create new metadata

module.exports = router;
