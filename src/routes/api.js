const express = require('express');
const router = express.Router();
const keywordController = require('../controllers/keywordController');

// We use router.get here. 
// These link the URL path to the function in the Controller.
router.get('/search', keywordController.handleSearch);
router.get('/keys', keywordController.getKeys);

module.exports = router;