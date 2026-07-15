const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { createReview, respondToReview, getReviewsForUser } = require('../controllers/reviewController');

router.get('/user/:userId', getReviewsForUser);
router.post('/', protect, authorize('client'), createReview);
router.put('/:id/respond', protect, authorize('freelancer'), respondToReview);

module.exports = router;
