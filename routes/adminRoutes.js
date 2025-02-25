const express = require("express");
const { adminSignup,
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
    deleteVendorComment,
    getRatingsAndCommentsById
}
    = require("../controllers/adminController");

const { adminAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", adminSignup);
router.post("/login", adminLogin);

// Count Pending Vendor Requests (Admin Protected)
router.get("/requests/count", adminAuth, countPendingVendorRequests);

// Admin fetches all pending vendor requests (Protected)
router.get("/requests", adminAuth, getAllVendorRequests);

// Admin views a specific vendor request (Protected)
router.get("/requests/:id", adminAuth, getVendorRequestById);

// Admin approves or rejects a vendor request (Protected)
router.put("/requests/:id", adminAuth, approveOrRejectVendor);

// Admin sends a message to a specific vendor
router.post("/:id/message", adminAuth, sendVendorMessage);

// Count Approved Vendor Requests (Admin Protected)
router.get("/approved/count", adminAuth, countApprovedVendors);

router.get("/approved/vendors", adminAuth, getApprovedVendors);

router.delete("/vendors/:id", adminAuth, deleteVendor);

// Get all ratings and comments
router.get("/vendors/ratings-comments", adminAuth, getAllRatingsAndComments);

/// Route to get ratings and comments by vendor ID
router.get('/ratings-comments/:vendorId', adminAuth, getRatingsAndCommentsById);

// Delete a specific comment by vendor ID and comment ID
router.delete("/vendors/:vendorId/comments/:commentId", adminAuth, deleteVendorComment);


module.exports = router;
