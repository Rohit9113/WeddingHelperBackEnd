const mongoose = require("mongoose");

// Define Comment Schema first
const CommentSchema = new mongoose.Schema({
  name: { type: String, default: "Anonymous" },
  text: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now },
});

// Now define Vendor Schema
const VendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  businessName: { type: String, required: true },
  shopName: { type: String, required: true },
  shopAddress: { type: String, required: true },
  password: { type: String },
  role: { type: String, default: "vendor" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  images: [{ type: String }],
  rating: { type: Number, default: 0 }, // Average rating
  comments: [CommentSchema], // Array of comments
  createdAt: { type: Date, default: Date.now },

  // Messages from Admin
  messages: [
    {
      text: { type: String, required: true },
      from: { type: String, default: "Admin - WeddingHelper" },
      sentAt: { type: Date, default: Date.now }
    }
  ],

  // OTP for Password Reset
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },
});

// Export only Vendor Model (no need to pass CommentSchema separately)
module.exports = mongoose.model("Vendor", VendorSchema);
