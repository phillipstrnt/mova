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

/*
|--------------------------------------------------------------------------
| BUSINESS PROFILE
|--------------------------------------------------------------------------
*/

router.get(
  "/profile",
  protect,
  getBusinessProfile
);

router.put(
  "/profile",
  protect,
  authorize("OWNER", "ADMIN"),
  updateBusinessProfile
);

/*
|--------------------------------------------------------------------------
| ONBOARDING / SETUP STATUS
|--------------------------------------------------------------------------
*/

router.get(
  "/setup-status",
  protect,
  getSetupStatus
);

export default router;