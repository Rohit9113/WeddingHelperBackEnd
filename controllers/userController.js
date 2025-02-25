const Vendor = require("../models/Vendor");

// Get all approved vendors
const getApprovedVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ status: "approved" }).select(
      "shopName shopAddress businessName images location rating"
    );
    res.status(200).json(vendors);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get specific vendor details
const getVendorDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findById(id);

    if (!vendor || vendor.status !== "approved") {
      return res.status(404).json({ message: "Vendor not found or not approved" });
    }

    res.status(200).json(vendor);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Add rating and comment
const addRatingAndComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, name, text } = req.body;

    console.log("Received Rating:", rating, typeof rating)

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5 stars" });
    }

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const comment = {
      name: name?.trim() || "Anonymous",
      text,
      rating,
      createdAt: new Date(),
    };

    vendor.comments.push(comment);
    vendor.rating = vendor.comments.reduce((acc, c) => acc + c.rating, 0) / vendor.comments.length; // Average Rating

    await vendor.save();

    res.status(201).json({ message: "Rating and comment added successfully", vendor });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Edit a comment within 1 hour
const editComment = async (req, res) => {
    try {
      const { text } = req.body;
      const { id, commentId } = req.params;
      const vendor = await Vendor.findById(id);
  
      if (!vendor) {
        return res.status(404).json({ message: "Vendor not found" });
      }
  
      const comment = vendor.comments.id(commentId);
      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }
  
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (new Date(comment.createdAt) < oneHourAgo) {
        return res.status(400).json({ message: "You can only edit comments within 1 hour" });
      }
  
      comment.text = text;
      await vendor.save();
  
      res.status(200).json({ message: "Comment updated successfully", vendor });
    } catch (err) {
      res.status(500).json({ message: "Server Error", error: err.message });
    }
};

module.exports = { getApprovedVendors, getVendorDetails, addRatingAndComment, editComment };
