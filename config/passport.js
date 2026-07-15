const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("../models/User");

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5000";

const roleFromState = (state) =>
  state === "freelancer" || state === "client" ? state : "client";

async function findOrCreateUser({
  provider,
  providerId,
  name,
  email,
  avatarUrl,
  role,
}) {
  const idField = provider === "google" ? "googleId" : "githubId";

  let user = await User.findOne({ [idField]: providerId });
  if (user) return user;

  if (email) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user[idField] = providerId;
      if (!user.avatarUrl && avatarUrl) user.avatarUrl = avatarUrl;
      await user.save();
      return user;
    }
  }

  user = await User.create({
    name: name || "New User",
    email: email
      ? email.toLowerCase()
      : `${provider}_${providerId}@social.local`,
    provider,
    [idField]: providerId,
    avatarUrl: avatarUrl || "",
    role,
  });
  return user;
}

// ---- Google ----------------------------------------------------------------
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${SERVER_URL}/api/auth/google/callback`,
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const user = await findOrCreateUser({
            provider: "google",
            providerId: profile.id,
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            avatarUrl: profile.photos?.[0]?.value,
            role: roleFromState(req.query.state),
          });
          done(null, user);
        } catch (err) {
          done(err);
        }
      },
    ),
  );
} else {
  console.warn(
    "[passport] Google login disabled — set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env",
  );
}

// ---- GitHub ----------------------------------------------------------------
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${SERVER_URL}/api/auth/github/callback`,
        scope: ["user:email"],
        passReqToCallback: true,
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.find((e) => e.value)?.value || undefined;
          const user = await findOrCreateUser({
            provider: "github",
            providerId: profile.id,
            name: profile.displayName || profile.username,
            email,
            avatarUrl: profile.photos?.[0]?.value,
            role: roleFromState(req.query.state),
          });
          done(null, user);
        } catch (err) {
          done(err);
        }
      },
    ),
  );
} else {
  console.warn(
    "[passport] GitHub login disabled — set GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET in .env",
  );
}

module.exports = passport;
