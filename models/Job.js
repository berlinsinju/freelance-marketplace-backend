const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true },
    budgetMin: {
      type: Number,
      required: true,
      min: [1, "Budget must be greater than 0"],
    },
    budgetMax: {
      type: Number,
      required: true,
      min: [1, "Budget must be greater than 0"],
    },
    budgetType: { type: String, enum: ["fixed", "hourly"], default: "fixed" },
    deadline: { type: Date },
    skillsRequired: [{ type: String }],
    status: {
      type: String,
      enum: ["open", "in_progress", "completed", "closed"],
      default: "open",
    },
    proposals: [
      {
        freelancer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        coverLetter: String,
        proposedAmount: {
          type: Number,
          required: true,
          min: [1, "Amount must be greater than 0"],
        },

        estimatedDays: {
          type: Number,
          required: true,
          min: [1, "Days must be at least 1"],
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

jobSchema.index({
  title: "text",
  description: "text",
  skillsRequired: "text",
  category: "text",
});

module.exports = mongoose.model("Job", jobSchema);
