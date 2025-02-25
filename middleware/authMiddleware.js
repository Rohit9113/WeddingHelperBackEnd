const jwt = require("jsonwebtoken");
require("dotenv").config();

// Middleware to verify Admin Authentication
const adminAuth = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ message: "Access Denied! No token provided" });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access Denied! Only admin can perform this action" });
    }

    req.admin = decoded; // Store decoded admin data in request object
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid Token" });
  }
};

// Middleware to verify Vendor Authentication
const vendorAuth = (req, res, next) => {
  const token = req.headers.authorization; // Extract token from headers

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  try {
    // console.log("Token received:", token);
    // Remove "Bearer " if present in the token and verify it
    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);

    // Log decoded token for debugging
    // console.log("Decoded Token: ", decoded);

    // Ensure that the decoded token contains vendorId or _id (based on your setup)
    if (!decoded._id && !decoded.vendorId) {
      return res.status(400).json({ message: "Invalid token structure: missing _id or vendorId" });
    }

    // Attach vendor information to request object
    req.vendor = decoded; // Store decoded vendor data in request object
    next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized: Invalid token", error: error.message });
  }
};

module.exports = { adminAuth, vendorAuth };
