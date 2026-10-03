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

/*
|--------------------------------------------------------------------------
| BUSINESS PROFILE
|--------------------------------------------------------------------------
| Only authenticated OWNER/ADMIN users can modify business information.
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

export default router;