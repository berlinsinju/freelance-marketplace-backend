const Review = require("../models/Review");
const Contract = require("../models/Contract");
const User = require("../models/User");
const createNotification = require("../utils/createNotification");

const recalcFreelancerRating = async (freelancerId) => {
  const reviews = await Review.find({ reviewee: freelancerId });
  const count = reviews.length;
  const average = count
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
    : 0;
  await User.findByIdAndUpdate(freelancerId, {
    ratingAverage: Math.round(average * 10) / 10,
    ratingCount: count,
  });
};
exports.createReview = async (req, res) => {
  try {
    const { contract: contractId, rating, comment } = req.body;
    const contract = await Contract.findById(contractId);
    if (!contract)
      return res.status(404).json({ message: "Contract not found" });
    if (contract.client.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({
          message: "Only the client on this contract can leave a review",
        });
    }
    if (contract.status !== "completed") {
      return res
        .status(400)
        .json({
          message: "Contract must be completed before leaving a review",
        });
    }

    const review = await Review.create({
      contract: contractId,
      reviewer: req.user._id,
      reviewee: contract.freelancer,
      rating,
      comment,
    });

    await recalcFreelancerRating(contract.freelancer);

    await createNotification({
      user: contract.freelancer,
      type: "new_review",
      message: `${req.user.name} left you a ${rating}-star review`,
      link: `/profile/${contract.freelancer}`,
    });

    res.status(201).json({ review });
  } catch (err) {
    if (err.code === 11000)
      return res
        .status(400)
        .json({ message: "You already reviewed this contract" });
    res.status(500).json({ message: err.message });
  }
};

exports.respondToReview = async (req, res) => {
  try {
    const { text } = req.body;
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (review.reviewee.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to respond to this review" });
    }
    review.response = { text, createdAt: new Date() };
    await review.save();

    await createNotification({
      user: review.reviewer,
      type: "review_response",
      message: `${req.user.name} responded to your review`,
      link: `/profile/${review.reviewee}`,
    });

    res.json({ review });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getReviewsForUser = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate("reviewer", "name avatarUrl")
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
