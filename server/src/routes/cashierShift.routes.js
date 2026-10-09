import express from "express";

import {
  assignCashierShiftSchedule,
  getCashierShiftSchedules,
} from "../controllers/cashierShiftController.js";
import {
  closeCashierShift,
  getCurrentCashierShift,
  startCashierShift,
} from "../controllers/cashierShiftSessionController.js";
import { PERMISSIONS } from "../config/permissions.js";
import { protect } from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/sessions/current", requirePermission(PERMISSIONS.SHIFTS_CLOCK), getCurrentCashierShift);
router.post("/sessions/start", requirePermission(PERMISSIONS.SHIFTS_CLOCK), startCashierShift);
router.post("/sessions/:id/end", requirePermission(PERMISSIONS.SHIFTS_CLOCK), closeCashierShift);

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
