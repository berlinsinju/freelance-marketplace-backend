const Contract = require("../models/Contract");
const Job = require("../models/Job");
const createNotification = require("../utils/createNotification");
exports.createContract = async (req, res) => {
  try {
    const { job, service, freelancer, title, totalAmount, milestones } =
      req.body;

    const contract = await Contract.create({
      job,
      service,
      client: req.user._id,
      freelancer,
      title,
      totalAmount,
      milestones:
        milestones && milestones.length
          ? milestones
          : [{ title: "Full payment on completion", amount: totalAmount }],
    });

    if (job) {
      await Job.findByIdAndUpdate(job, { status: "in_progress" });
    }

    await createNotification({
      user: freelancer,
      type: "contract_created",
      message: `A new contract "${title}" has been created with you`,
      link: `/contracts/${contract._id}`,
    });

    res.status(201).json({ contract });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyContracts = async (req, res) => {
  try {
    const filter =
      req.user.role === "freelancer"
        ? { freelancer: req.user._id }
        : { client: req.user._id };
    const contracts = await Contract.find(filter)
      .populate("client", "name avatarUrl companyName")
      .populate("freelancer", "name avatarUrl")
      .populate("job", "title")
      .populate("service", "title")
      .sort({ createdAt: -1 });
    res.json({ contracts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getContractById = async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate("client", "name avatarUrl companyName")
      .populate("freelancer", "name avatarUrl")
      .populate("job", "title")
      .populate("service", "title");
    if (!contract)
      return res.status(404).json({ message: "Contract not found" });

    const isParty = [
      contract.client._id.toString(),
      contract.freelancer._id.toString(),
    ].includes(req.user._id.toString());
    if (!isParty)
      return res
        .status(403)
        .json({ message: "Not authorized to view this contract" });

    res.json({ contract });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateMilestoneStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const contract = await Contract.findById(req.params.id);
    if (!contract)
      return res.status(404).json({ message: "Contract not found" });

    const isParty = [
      contract.client.toString(),
      contract.freelancer.toString(),
    ].includes(req.user._id.toString());
    if (!isParty) return res.status(403).json({ message: "Not authorized" });

    const milestone = contract.milestones.id(req.params.milestoneId);
    if (!milestone)
      return res.status(404).json({ message: "Milestone not found" });

    milestone.status = status;

    const allPaid = contract.milestones.every((m) => m.status === "paid");
    if (allPaid) {
      contract.status = "completed";
      contract.endDate = new Date();
    }

    await contract.save();

    const notifyTarget =
      req.user._id.toString() === contract.client.toString()
        ? contract.freelancer
        : contract.client;
    await createNotification({
      user: notifyTarget,
      type: "milestone_update",
      message: `Milestone "${milestone.title}" updated to "${status}"`,
      link: `/contracts/${contract._id}`,
    });

    res.json({ contract });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
