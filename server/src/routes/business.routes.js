import express from "express";

import {
  getBusinessProfile,
  updateBusinessProfile,
  getSetupStatus,
} from "../controllers/businessController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// GET BUSINESS PROFILE
// ==========================================
//
// Any authenticated user in the business
// can view the business profile.
//
router.get(
  "/profile",
  protect,
  getBusinessProfile
);

// ==========================================
// UPDATE BUSINESS PROFILE
// ==========================================
//
// Only OWNER and ADMIN can update
// business information.
//
router.put(
  "/profile",
  protect,
  authorize("OWNER", "ADMIN"),
  updateBusinessProfile
);

// ==========================================
// GET BUSINESS SETUP STATUS
// ==========================================
//
// Used by MOVA to determine whether the
// initial business setup is complete.
//
// Setup requires:
// 1. Business information
// 2. At least one active branch
// 3. Receipt settings
//
router.get(
  "/setup-status",
  protect,
  getSetupStatus
);

export default router;