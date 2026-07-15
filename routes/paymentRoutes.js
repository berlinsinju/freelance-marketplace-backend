const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  createCheckoutSession,
  mockPay,
  getPaymentHistory,
} = require("../controllers/paymentController");

router.post("/checkout", protect, authorize("client"), createCheckoutSession);
router.post("/mock-pay", protect, authorize("client"), mockPay);
router.get("/history", protect, getPaymentHistory);

module.exports = router;
