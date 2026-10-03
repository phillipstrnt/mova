import express from "express";

import {
  getBusinessProfile,
  updateBusinessProfile,
} from "../controllers/businessController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// GET BUSINESS PROFILE
// ==========================================
// Any authenticated user in the business
// can view the business profile.

router.get(
  "/profile",
  protect,
  getBusinessProfile
);

// ==========================================
// UPDATE BUSINESS PROFILE
// ==========================================
// Only OWNER and ADMIN can update
// business information.

router.put(
  "/profile",
  protect,
  authorize("OWNER", "ADMIN"),
  updateBusinessProfile
);

export default router;