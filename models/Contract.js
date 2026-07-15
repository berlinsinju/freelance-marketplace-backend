const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'in_progress', 'submitted', 'approved', 'paid'], default: 'pending' },
  dueDate: Date,
  paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
});

const contractSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled', 'disputed'],
      default: 'active',
    },
    milestones: [milestoneSchema],
    startDate: { type: Date, default: Date.now },
    endDate: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Contract', contractSchema);
