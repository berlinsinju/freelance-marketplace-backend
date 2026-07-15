const express = require("express");
const router = express.Router();
const passport = require("passport");
const { protect } = require("../middleware/auth");
const {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  socialAuthSuccess,
} = require("../controllers/authController");

// ---- Local (email/password) ----
router.post("/register", register);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.put("/change-password", protect, changePassword);

const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";

// ---- Google OAuth ----
router.get("/google", (req, res, next) => {
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: req.query.role || "client",
  })(req, res, next);
});
// Step 2: Google redirects back here.
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${clientUrl}/login?error=oauth_failed`,
  }),
  socialAuthSuccess,
);

// ---- GitHub OAuth ----
router.get("/github", (req, res, next) => {
  passport.authenticate("github", {
    scope: ["user:email"],
    session: false,
    state: req.query.role || "client",
  })(req, res, next);
});
router.get(
  "/github/callback",
  passport.authenticate("github", {
    session: false,
    failureRedirect: `${clientUrl}/login?error=oauth_failed`,
  }),
  socialAuthSuccess,
);

module.exports = router;
