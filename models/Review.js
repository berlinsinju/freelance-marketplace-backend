const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // client
    reviewee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // freelancer
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    response: {
      text: String,
      createdAt: Date,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ contract: 1, reviewer: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
