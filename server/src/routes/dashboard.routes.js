import express from "express";

import {
  getDashboard,
} from "../controllers/dashboardController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

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
