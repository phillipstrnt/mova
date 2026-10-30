import express from "express";

import {
  getDashboard,
  getBranchDashboardSummary,
} from "../controllers/dashboardController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

router.get(
  "/branches/summary",
  protect,
  authorize("OWNER"),
  getBranchDashboardSummary
);

/*
|--------------------------------------------------------------------------
| MAIN DASHBOARD
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  protect,
  requirePermission("dashboard.view"),
  getDashboard
);

/*
|--------------------------------------------------------------------------
| DASHBOARD OVERVIEW
|--------------------------------------------------------------------------
|
| Dashboard.jsx requests:
|
| GET /api/dashboard/overview
|
|--------------------------------------------------------------------------
*/

router.get(
  "/overview",
  protect,
  requirePermission("dashboard.view"),
  getDashboard
);

export default router;
