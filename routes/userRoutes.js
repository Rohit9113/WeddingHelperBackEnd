const express = require("express");
const {
  getApprovedVendors,
  getVendorDetails,
  addRatingAndComment,
  editComment, 
} = require("../controllers/userController");

const router = express.Router();

// Get all approved vendors
router.get("/vendors", getApprovedVendors);

// Get specific vendor details by ID
router.get("/vendor/:id", getVendorDetails);

// Add rating and comment
router.post("/vendor/:id/rating", addRatingAndComment);

// Edit comment within 1 hour
router.put("/vendor/:id/comment/:commentId", editComment);


module.exports = router;
