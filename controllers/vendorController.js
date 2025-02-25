const Vendor = require("../models/Vendor");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");


// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer with Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "vendor_images",
    allowed_formats: ["jpg", "png", "jpeg", "webp"]
  }
});
const upload = multer({ storage });

// Vendor Requests an Account 
const vendorRequest = async (req, res) => {
  try {
    const { name, email, phone, businessName, shopName, shopAddress } = req.body;

    if (!name || !email || !phone || !businessName || !shopName || !shopAddress) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(400).json({ message: "A request has already been sent with this email" });
    }

    const newVendor = new Vendor({ name, email, phone, businessName, shopName, shopAddress });
    await newVendor.save();

    res.status(201).json({ message: "Vendor request sent successfully", vendor: newVendor });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


const vendorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (vendor.status !== "approved") {
      return res.status(403).json({ message: "Your request is still pending or has been rejected" });
    }

    const isMatch = await bcrypt.compare(password, vendor.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { vendorId: vendor._id, role: vendor.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      role: vendor.role,
      data: {
        id: vendor._id,
        name: vendor.name,
        email: vendor.email,
        phone: vendor.phone,
        businessName: vendor.businessName,
        shopName: vendor.shopName,
        shopAddress: vendor.shopAddress,
        address: vendor.address,
        createdAt: vendor.createdAt,
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get Messages for a Vendor
const getVendorMessages = async (req, res) => {
  try {
    const vendorId = req.vendor.vendorId || req.vendor._id;

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({ messages: vendor.messages });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


const sendResetPasswordOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database (hashed for security)
    const salt = await bcrypt.genSalt(10);
    vendor.resetToken = await bcrypt.hash(otp, salt);
    vendor.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes expiry

    await vendor.save();

    // Send OTP to vendor's email
    sendEmail(email, vendor.name, "Password Reset OTP", `Your OTP is: ${otp}`);

    res.status(200).json({ message: "OTP sent to email" });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


const resetPasswordWithOTP = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;

    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Check if OTP is valid
    if (!vendor.resetToken || !vendor.resetTokenExpiry || Date.now() > vendor.resetTokenExpiry) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    const isMatch = await bcrypt.compare(otp, vendor.resetToken);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check new password and confirmation
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // Hash and update new password
    vendor.password = await bcrypt.hash(newPassword, 10);
    vendor.resetToken = null;
    vendor.resetTokenExpiry = null;

    await vendor.save();

    res.status(200).json({ message: "Password reset successful. You can now log in with your new password." });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const sendEmail = async (to, name, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS, // Your email password or app password
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text: `Hello ${name},\n\n${text}\n\nRegards,\nYour Team`,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};


const getVendorRatingsAndComments = async (req, res) => {
  try {
    const vendorId = req.vendor.vendorId || req.vendor._id;

    const vendor = await Vendor.findById(vendorId).select("comments rating");
    
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({
      averageRating: vendor.rating,
      comments: vendor.comments,
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


// const uploadVendorImages = async (req, res) => {
//   try {
//     const vendorId = req.vendor.vendorId || req.vendor._id;

//     const vendor = await Vendor.findById(vendorId);
//     if (!vendor) {
//       return res.status(404).json({ message: "Vendor not found" });
//     }

//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ message: "No images uploaded" });
//     }

//     // Check total number of images
//     if (req.files.length > 20) {
//       return res.status(400).json({ message: "Maximum 20 images allowed" });
//     }

//     // Check total size limit (150MB)
//     const totalSizeMB = req.files.reduce((acc, file) => acc + file.size, 0) / (1024 * 1024);
//     if (totalSizeMB > 150) {
//       return res.status(400).json({ message: "Total image size exceeds 150MB" });
//     }

//     // Convert images to Base64 or upload to cloud storage (like AWS S3, Firebase, etc.)
//     const imagePaths = req.files.map((file) => `uploads/${file.originalname}`);

//     // Store image paths in DB
//     vendor.images = vendor.images.concat(imagePaths);
//     await vendor.save();

//     res.status(200).json({
//       message: "Images uploaded successfully",
//       images: vendor.images,
//     });
//   } catch (err) {
//     res.status(500).json({ message: "Server Error", error: err.message });
//   }
// };


// Get all vendor images
const getVendorImages = async (req, res) => {
  try {
    const vendorId = req.vendor.vendorId || req.vendor._id;
    
    const vendor = await Vendor.findById(vendorId).select("images");
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({
      message: "Vendor images fetched successfully",
      images: vendor.images,
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Delete a specific image
// const deleteVendorImage = async (req, res) => {
//   try {
//     const vendorId = req.vendor.vendorId || req.vendor._id;
//     const { imageName } = req.params;

//     const vendor = await Vendor.findById(vendorId);
//     if (!vendor) {
//       return res.status(404).json({ message: "Vendor not found" });
//     }

//     const imageIndex = vendor.images.findIndex((img) => img.includes(imageName));
//     if (imageIndex === -1) {
//       return res.status(404).json({ message: "Image not found" });
//     }

//     vendor.images.splice(imageIndex, 1); // Remove the image from array
//     await vendor.save();

//     res.status(200).json({ message: "Image deleted successfully", images: vendor.images });
//   } catch (err) {
//     res.status(500).json({ message: "Server Error", error: err.message });
//   }
// };


// Update uploadVendorImages function
const uploadVendorImages = async (req, res) => {
  try {
    const vendorId = req.vendor.vendorId || req.vendor._id;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No images uploaded" });
    }

    // Upload images to Cloudinary and get their URLs
    const imageUrls = req.files.map(file => file.path);

    // Store image URLs in MongoDB
    vendor.images = vendor.images.concat(imageUrls);
    await vendor.save();

    res.status(200).json({
      message: "Images uploaded successfully",
      images: vendor.images
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Delete Image from Cloudinary
const deleteVendorImage = async (req, res) => {
  try {
    const vendorId = req.vendor.vendorId || req.vendor._id;
    const { imageName } = req.params;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const imageIndex = vendor.images.findIndex(img => img.includes(imageName));
    if (imageIndex === -1) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Extract public_id from Cloudinary URL
    const publicId = vendor.images[imageIndex].split("/").pop().split(".")[0];

    // Delete image from Cloudinary
    await cloudinary.uploader.destroy(`vendor_images/${publicId}`);

    // Remove the image from MongoDB
    vendor.images.splice(imageIndex, 1);
    await vendor.save();

    res.status(200).json({ message: "Image deleted successfully", images: vendor.images });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


module.exports = {
  vendorRequest,
  vendorLogin,
  getVendorMessages,
  sendResetPasswordOTP, 
  resetPasswordWithOTP,
  sendEmail,
  getVendorRatingsAndComments,
  uploadVendorImages,
  getVendorImages,
  deleteVendorImage
};
