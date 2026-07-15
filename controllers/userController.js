const User = require("../models/User");

const sanitizeUser = (user) => {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};
exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = [
      "name",
      "avatarUrl",
      "bio",
      "location",
      "phone",
      "skills",
      "hourlyRate",
      "portfolio",
      "availability",
      "companyName",
      "companyWebsite",
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.searchFreelancers = async (req, res) => {
  try {
    const {
      skill,
      location,
      minRating,
      maxRate,
      search,
      page = 1,
      limit = 12,
    } = req.query;
    const query = { role: "freelancer" };

    if (skill) query.skills = { $in: [new RegExp(skill, "i")] };
    if (location) query.location = new RegExp(location, "i");
    if (minRating) query.ratingAverage = { $gte: Number(minRating) };
    if (maxRate)
      query.hourlyRate = { ...(query.hourlyRate || {}), $lte: Number(maxRate) };
    if (search) {
      query.$or = [
        { name: new RegExp(search, "i") },
        { bio: new RegExp(search, "i") },
        { skills: { $in: [new RegExp(search, "i")] } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [freelancers, total] = await Promise.all([
      User.find(query)
        .sort({ ratingAverage: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.json({
      freelancers: freelancers.map(sanitizeUser),
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
