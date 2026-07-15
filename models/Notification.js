const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'new_proposal',
        'proposal_accepted',
        'proposal_rejected',
        'contract_created',
        'milestone_update',
        'payment_received',
        'new_review',
        'review_response',
        'job_posted',
      ],
      required: true,
    },
    message: { type: String, required: true },
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
