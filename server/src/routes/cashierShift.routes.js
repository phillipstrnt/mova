import express from "express";

import {
  assignCashierShiftSchedule,
  getCashierShiftSchedules,
} from "../controllers/cashierShiftController.js";
import { PERMISSIONS } from "../config/permissions.js";
import { protect } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  requirePermission(PERMISSIONS.SHIFTS_VIEW),
  getCashierShiftSchedules
);

router.put(
  "/",
  requirePermission(PERMISSIONS.SHIFTS_MANAGE),
  assignCashierShiftSchedule
);

export default router;
