const express = require("express");
const {
  vendorRequest,
  vendorLogin,
  getVendorMessages,
  sendResetPasswordOTP, 
  resetPasswordWithOTP,
  getVendorRatingsAndComments,
  uploadVendorImages,
  getVendorImages,
  deleteVendorImage
} = require("../controllers/vendorController");

const { vendorAuth } = require("../middleware/authMiddleware"); // Fix import

const router = express.Router();
// const multer = require("multer");

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("cloudinary").v2;

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "vendor_images",
    allowed_formats: ["jpg", "png", "jpeg", "webp"]
  }
});
const upload = multer({ storage });


// Multer Storage Configuration
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });

// Vendor submits an account request (Public)
router.post("/request", vendorRequest);

// Vendor Login
router.post("/login", vendorLogin);

// Vendor retrieves messages
router.get("/messages", vendorAuth, getVendorMessages);

// Route to send OTP for password reset
router.post("/send-reset-otp", sendResetPasswordOTP);

// Route to reset password using OTP
router.post("/reset-password", resetPasswordWithOTP);


// Vendor retrieves their ratings and comments
router.get("/ratings-comments", vendorAuth, getVendorRatingsAndComments);

// router.post("/upload-images", vendorAuth, upload.array("images", 20), uploadVendorImages);

// Get all vendor images
router.get("/images", vendorAuth, getVendorImages);

// Delete a specific image
// router.delete("/images/:imageName", vendorAuth, deleteVendorImage);


// Image Upload Route
router.post("/upload-images", vendorAuth, upload.array("images", 20), uploadVendorImages);

// Delete Image Route
router.delete("/images/:imageName", vendorAuth, deleteVendorImage);



module.exports = router;