const Job = require("../models/Job");
const createNotification = require("../utils/createNotification");

exports.createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      budgetMin,
      budgetMax,
      budgetType,
      deadline,
      skillsRequired,
    } = req.body;
    const job = await Job.create({
      client: req.user._id,
      title,
      description,
      category,
      budgetMin,
      budgetMax,
      budgetType,
      deadline,
      skillsRequired,
    });
    res.status(201).json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.client.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to edit this job" });
    }
    const editable = [
      "title",
      "description",
      "category",
      "budgetMin",
      "budgetMax",
      "budgetType",
      "deadline",
      "skillsRequired",
      "status",
    ];
    editable.forEach((f) => {
      if (req.body[f] !== undefined) job[f] = req.body[f];
    });
    await job.save();
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.client.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this job" });
    }
    await job.deleteOne();
    res.json({ message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getJobs = async (req, res) => {
  try {
    const {
      category,
      minBudget,
      maxBudget,
      search,
      status,
      skill,
      page = 1,
      limit = 12,
    } = req.query;
    const query = {};
    if (category) query.category = new RegExp(category, "i");
    if (status) query.status = status;
    else query.status = "open";
    if (skill) query.skillsRequired = { $in: [new RegExp(skill, "i")] };
    if (minBudget || maxBudget) {
      query.budgetMax = {};
      if (minBudget) query.budgetMax.$gte = Number(minBudget);
      if (maxBudget) query.budgetMin = { $lte: Number(maxBudget) };
    }
    if (search) query.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate("client", "name avatarUrl companyName location")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Job.countDocuments(query),
    ]);

    res.json({
      jobs,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("client", "name avatarUrl companyName location")
      .populate(
        "proposals.freelancer",
        "name avatarUrl ratingAverage ratingCount skills",
      );
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ client: req.user._id })
      .populate("proposals.freelancer", "name avatarUrl ratingAverage")
      .sort({ createdAt: -1 });
    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.submitProposal = async (req, res) => {
  try {
    const { coverLetter, proposedAmount, estimatedDays } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.status !== "open")
      return res
        .status(400)
        .json({ message: "This job is no longer accepting proposals" });

    const already = job.proposals.find(
      (p) => p.freelancer.toString() === req.user._id.toString(),
    );
    if (already)
      return res
        .status(400)
        .json({ message: "You already submitted a proposal for this job" });

    job.proposals.push({
      freelancer: req.user._id,
      coverLetter,
      proposedAmount,
      estimatedDays,
    });
    await job.save();

    await createNotification({
      user: job.client,
      type: "new_proposal",
      message: `${req.user.name} submitted a proposal for "${job.title}"`,
      link: `/jobs/${job._id}`,
    });

    res.status(201).json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateProposalStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (job.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }
    const proposal = job.proposals.id(req.params.proposalId);
    if (!proposal)
      return res.status(404).json({ message: "Proposal not found" });

    proposal.status = status;
    if (status === "accepted") job.status = "in_progress";
    await job.save();

    await createNotification({
      user: proposal.freelancer,
      type: status === "accepted" ? "proposal_accepted" : "proposal_rejected",
      message: `Your proposal for "${job.title}" was ${status}`,
      link: `/jobs/${job._id}`,
    });

    res.json({ job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
