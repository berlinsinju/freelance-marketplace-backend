const Stripe = require("stripe");
const Contract = require("../models/Contract");
const Payment = require("../models/Payment");
const createNotification = require("../utils/createNotification");

const stripe = process.env.STRIPE_SECRET_KEY
  ? Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

exports.createCheckoutSession = async (req, res) => {
  try {
    if (!stripe)
      return res
        .status(500)
        .json({ message: "Stripe is not configured on the server" });

    const { contractId, milestoneId } = req.body;
    const contract = await Contract.findById(contractId).populate(
      "freelancer",
      "name",
    );
    if (!contract)
      return res.status(404).json({ message: "Contract not found" });
    if (contract.client.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only the client can pay for this contract" });
    }

    const milestone = contract.milestones.id(milestoneId);
    if (!milestone)
      return res.status(404).json({ message: "Milestone not found" });
    if (milestone.status === "paid")
      return res.status(400).json({ message: "Milestone already paid" });

    const payment = await Payment.create({
      contract: contract._id,
      payer: req.user._id,
      payee: contract.freelancer._id,
      milestoneId: milestone._id,
      amount: milestone.amount,
      status: "pending",
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${contract.title} — ${milestone.title}` },
            unit_amount: Math.round(milestone.amount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/contracts/${contract._id}?payment=success`,
      cancel_url: `${process.env.CLIENT_URL}/contracts/${contract._id}?payment=cancelled`,
      metadata: {
        paymentId: payment._id.toString(),
        contractId: contract._id.toString(),
        milestoneId: milestone._id.toString(),
      },
    });

    payment.stripeSessionId = session.id;
    await payment.save();

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { paymentId, contractId, milestoneId } = session.metadata;

    const payment = await Payment.findById(paymentId);
    if (payment) {
      payment.status = "succeeded";
      payment.stripePaymentIntentId = session.payment_intent;
      await payment.save();

      const contract = await Contract.findById(contractId);
      const milestone = contract.milestones.id(milestoneId);
      milestone.status = "paid";
      milestone.paymentId = payment._id;

      const allPaid = contract.milestones.every((m) => m.status === "paid");
      if (allPaid) {
        contract.status = "completed";
        contract.endDate = new Date();
      }
      await contract.save();

      await createNotification({
        user: payment.payee,
        type: "payment_received",
        message: `You received a payment of $${payment.amount} for "${milestone.title}"`,
        link: `/contracts/${contract._id}`,
      });
    }
  }

  res.json({ received: true });
};

exports.mockPay = async (req, res) => {
  try {
    const { contractId, milestoneId } = req.body;
    const contract = await Contract.findById(contractId);
    if (!contract)
      return res.status(404).json({ message: "Contract not found" });
    if (contract.client.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Only the client can pay for this contract" });
    }
    const milestone = contract.milestones.id(milestoneId);
    if (!milestone)
      return res.status(404).json({ message: "Milestone not found" });

    const payment = await Payment.create({
      contract: contract._id,
      payer: req.user._id,
      payee: contract.freelancer,
      milestoneId: milestone._id,
      amount: milestone.amount,
      status: "succeeded",
    });

    milestone.status = "paid";
    milestone.paymentId = payment._id;

    const allPaid = contract.milestones.every((m) => m.status === "paid");
    if (allPaid) {
      contract.status = "completed";
      contract.endDate = new Date();
    }
    await contract.save();

    await createNotification({
      user: contract.freelancer,
      type: "payment_received",
      message: `You received a payment of $${milestone.amount} for "${milestone.title}"`,
      link: `/contracts/${contract._id}`,
    });

    res.json({ contract, payment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPaymentHistory = async (req, res) => {
  try {
    const payments = await Payment.find({
      $or: [{ payer: req.user._id }, { payee: req.user._id }],
    })
      .populate("contract", "title")
      .populate("payer", "name")
      .populate("payee", "name")
      .sort({ createdAt: -1 });
    res.json({ payments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
