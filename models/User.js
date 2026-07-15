const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
      required: function () {
        return this.provider === "local";
      },
    },
    role: {
      type: String,
      enum: ["freelancer", "client", "admin"],
      required: true,
      default: "client",
    },

    // Shared profile fields
    avatarUrl: { type: String, default: "" },
    bio: { type: String, default: "" },
    location: { type: String, default: "" },
    phone: { type: String, default: "" },

    // Freelancer-specific
    skills: [{ type: String }],
    hourlyRate: { type: Number, default: 0 },
    portfolio: [
      {
        title: String,
        description: String,
        link: String,
        imageUrl: String,
      },
    ],
    availability: {
      type: String,
      enum: ["available", "busy", "unavailable"],
      default: "available",
    },
    ratingAverage: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },

    // Client-specific
    companyName: { type: String, default: "" },
    companyWebsite: { type: String, default: "" },

    // Auth extras
    passwordResetToken: { type: String },
    passwordResetExpires: { type: Date },

    // Social login
    provider: {
      type: String,
      enum: ["local", "google", "github"],
      default: "local",
    },
    googleId: { type: String },
    githubId: { type: String },
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  if (!this.password) return false; // social accounts have no local password
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
