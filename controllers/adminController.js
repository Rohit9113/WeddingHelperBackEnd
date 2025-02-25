// adminController.js
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const Vendor = require("../models/Vendor");

// Admin SignUp
const adminSignup = async (req, res) => {
  try {
    console.log("Request Body:", req.body); // Debugging line
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    let existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ name, email, password: hashedPassword, role: "admin" });
    await newAdmin.save();

    const token = jwt.sign({ adminId: newAdmin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.status(201).json({ message: "Admin registered successfully", token, admin: newAdmin });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


// Admin Login
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ adminId: admin._id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.status(200).json({ message: "Login successful", token, admin });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get All Vendor Requests (Admin Side)
const getAllVendorRequests = async (req, res) => {
  try {
    const vendorRequests = await Vendor.find({ status: "pending" });
    res.status(200).json(vendorRequests);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get Vendor Request Details by ID (Admin Side)
const getVendorRequestById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor request not found" });
    }
    res.status(200).json(vendor);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


// Accept Request and reject
const approveOrRejectVendor = async (req, res) => {
  try {
    const vendorId = req.params.id || req.body.vendorId; // Support both params and body
    const { status } = req.body;

    // Check if vendorId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ message: "Invalid Vendor ID format" });
    }

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    if (status === "approved") {
      const tempPassword = Math.random().toString(36).slice(-8);
      vendor.password = await bcrypt.hash(tempPassword, 10);
      vendor.status = "approved"; // Ensure status updates
      await vendor.save();

      sendEmail(vendor.email, vendor.name, "approved", tempPassword);
      res.status(200).json({ message: "Vendor approved successfully" });
    } else if (status === "rejected") {
      sendEmail(vendor.email, vendor.name, "rejected");
      await Vendor.findByIdAndDelete(vendorId); // Delete from DB
      res.status(200).json({ message: "Vendor request rejected and deleted" });
    } else {
      res.status(400).json({ message: "Invalid status" });
    }
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


// Count Pending Vendor Requests
const countPendingVendorRequests = async (req, res) => {
  try {
    // Check if the user is an admin (already verified in middleware)
    if (req.admin.role !== "admin") {
      return res.status(403).json({ message: "Access Denied! Only admin can perform this action" });
    }

    const count = await Vendor.countDocuments({ status: "pending" });
    res.status(200).json({ pendingRequests: count });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Function to send a message to a vendor
const sendVendorMessage = async (req, res) => {
  try {
    // Get the 'select' option and 'text' from the request body
    const { select, text } = req.body;
    const vendorId = req.params.id; // Get vendorId from the URL

    // Validate if the 'select' option is one of the predefined options
    const validSelectOptions = ["Congratulation", "Warning", "General", "Offer", "Other"];
    if (!validSelectOptions.includes(select)) {
      return res.status(400).json({ message: "Invalid select option. Please choose a valid message type." });
    }

    // Find the vendor by ID
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Format the message
    const message = {
      type: select, // Store the message type
      text,         // Store the actual message
      from: "Admin - WeddingHelper",
      sentAt: new Date(),
    };

    // Add the message to the vendor's messages array
    vendor.messages.push(message);
    await vendor.save();

    res.status(200).json({ message: "Message sent successfully", messageData: message });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};



// Modify sendEmail function to handle vendor deletion
const sendEmail = async (email, name, status, data = "") => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  let subject, text;

  if (status === "approved") {
    subject = "Your Vendor Account Approved";
    text = `Hello ${name},\n\nYour vendor request has been approved.\n\nLogin with:\n📧 Email: ${email}\n🔑 Password: ${data}\n\nChange your password immediately.\n\nThank you, Admin Team`;
  } else if (status === "deleted") {
    subject = "Your Vendor Account Has Been Deleted";
    text = `Hello ${name},\n\nYour vendor account has been deleted. If you have any questions, please contact the admin team.\n\nThank you, Admin Team`;
  } else {
    subject = "Your Vendor Account Request Rejected";
    text = `Hello ${name},\n\nYour vendor request was rejected.\n\nThank you, Admin Team`;
  }

  const mailOptions = { from: process.env.EMAIL_USER, to: email, subject, text };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};



// Count Approved Vendor Requests
const countApprovedVendors = async (req, res) => {
  try {
    // Check if the user is an admin (already verified in middleware)
    if (req.admin.role !== "admin") {
      return res.status(403).json({ message: "Access Denied! Only admin can perform this action" });
    }

    const count = await Vendor.countDocuments({ status: "approved" });
    res.status(200).json({ approvedVendors: count });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Get All Approved Vendor Details
const getApprovedVendors = async (req, res) => {
  try {
    const approvedVendors = await Vendor.find({ status: "approved" });
    res.status(200).json(approvedVendors);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// adminController.js

// Delete Vendor by ID
const deleteVendor = async (req, res) => {
  try {
    const vendorId = req.params.id; // Get vendor ID from the URL

    // Validate if the vendorId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ message: "Invalid Vendor ID format" });
    }

    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Delete the vendor
    await Vendor.findByIdAndDelete(vendorId);

    // Optionally, send an email to the vendor about the deletion
    sendEmail(vendor.email, vendor.name, "deleted");

    res.status(200).json({ message: "Vendor deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};



const getAllRatingsAndComments = async (req, res) => {
  try {
    const vendors = await Vendor.find({}, "shopName rating comments");

    const vendorRatings = vendors.map((vendor) => {
      // Calculate average rating
      const totalRatings = vendor.comments.reduce((sum, comment) => sum + comment.rating, 0);
      const averageRating = vendor.comments.length ? (totalRatings / vendor.comments.length).toFixed(1) : 0;

      // Get latest comment (sorted by createdAt)
      const latestComment = vendor.comments.length ? vendor.comments.sort((a, b) => b.createdAt - a.createdAt)[0] : null;

      return {
        vendorId: vendor._id,
        shopName: vendor.shopName,
        averageRating: averageRating,
        latestComment: latestComment
          ? {
            commentId: latestComment._id,
            userName: latestComment.name,
            text: latestComment.text,
            rating: latestComment.rating,
            createdAt: latestComment.createdAt,
          }
          : null,
      };
    });

    res.status(200).json(vendorRatings);
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const getRatingsAndCommentsById = async (req, res) => {
  try {
    const vendorId = req.params.vendorId;

    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return res.status(400).json({ message: "Invalid Vendor ID format" });
    }

    const vendor = await Vendor.findById(vendorId, "shopName rating comments");

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const totalRatings = vendor.comments.reduce((sum, comment) => sum + comment.rating, 0);
    const averageRating = vendor.comments.length ? (totalRatings / vendor.comments.length).toFixed(1) : 0;

    res.status(200).json({
      vendorId: vendor._id,
      shopName: vendor.shopName,
      averageRating: averageRating,
      comments: vendor.comments.map((comment) => ({
        commentId: comment._id,
        userName: comment.name,
        text: comment.text,
        rating: comment.rating,
        createdAt: comment.createdAt,
      })),
    });
  } catch (err) {
    console.error("Error in getRatingsAndCommentsById:", err);
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


const deleteVendorComment = async (req, res) => {
  try {
    const { vendorId, commentId } = req.params;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(vendorId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ message: "Invalid Vendor ID or Comment ID format" });
    }

    // Find the vendor
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Filter out the comment to delete
    const updatedComments = vendor.comments.filter((comment) => comment._id.toString() !== commentId);
    vendor.comments = updatedComments;
    await vendor.save();

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};


module.exports = {
  adminSignup,
  adminLogin,
  getAllVendorRequests,
  getVendorRequestById,
  approveOrRejectVendor,
  countPendingVendorRequests,
  sendVendorMessage,
  countApprovedVendors,
  getApprovedVendors,
  deleteVendor,
  getAllRatingsAndComments,
  getRatingsAndCommentsById,
  deleteVendorComment
};