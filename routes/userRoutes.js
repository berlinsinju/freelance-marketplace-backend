const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { updateProfile, getUserProfile, searchFreelancers } = require('../controllers/userController');

router.get('/freelancers', searchFreelancers);
router.put('/me', protect, updateProfile);
router.get('/:id', getUserProfile);

module.exports = router;
