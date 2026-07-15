const mongoose = require('mongoose');

const WORKING_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const sampleSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    caption: { type: String, default: '', trim: true, maxlength: 140 },
    // 'image'/'pdf' come from uploads, 'link' is an external URL (Behance, GitHub…)
    fileType: { type: String, enum: ['image', 'pdf', 'link'], default: 'image' },
    fileName: { type: String, default: '' },
    size: { type: Number, default: 0 },
  },
  { _id: true, timestamps: false }
);

const availabilitySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['available', 'limited', 'booked'],
      default: 'available',
    },
    hoursPerWeek: { type: Number, min: 0, max: 168, default: 0 },
    availableFrom: { type: Date },
    workingDays: [{ type: String, enum: WORKING_DAYS }],
    timezone: { type: String, default: '', trim: true, maxlength: 60 },
    note: { type: String, default: '', trim: true, maxlength: 200 },
  },
  { _id: false }
);

const serviceSchema = new mongoose.Schema(
  {
    freelancer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    priceType: { type: String, enum: ['fixed', 'hourly'], default: 'fixed' },
    deliveryDays: { type: Number, default: 3 },
    samples: [sampleSchema],
    availability: { type: availabilitySchema, default: () => ({}) },
    tags: [{ type: String }],
    isActive: { type: Boolean, default: true },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

serviceSchema.index({ title: 'text', description: 'text', tags: 'text', category: 'text' });
serviceSchema.index({ 'availability.status': 1 });

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
module.exports.WORKING_DAYS = WORKING_DAYS;
