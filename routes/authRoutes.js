const express = require("express");
const passport = require("passport");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Google Auth Route
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google Auth Callback
router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    const { user, token } = req.user;
    res.json({ user, token });
  }
);

// Logout Route
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "User logged out" });
  });
});

module.exports = router;
