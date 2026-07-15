const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");
require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { errorHandler, notFound } = require("./middleware/errorHandler");
const { stripeWebhook } = require("./controllers/paymentController");
const passport = require("./config/passport");

connectDB();

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));

app.use(passport.initialize());

app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook,
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded work samples
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    maxAge: "7d",
    fallthrough: true,
  }),
);

app.get("/", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/services", require("./routes/serviceRoutes"));
app.use("/api/jobs", require("./routes/jobRoutes"));
app.use("/api/contracts", require("./routes/contractRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
