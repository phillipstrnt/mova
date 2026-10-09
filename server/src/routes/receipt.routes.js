import express from "express";

import {
  getReports,
  getSalesReport,
  getPaymentsReport,
} from "../controllers/reportController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

// This legacy receipts endpoint returns business report data, so it uses
// the same report permission as the canonical /api/reports routes.
router.use(protect, requirePermission("reports.view"));

/*
|--------------------------------------------------------------------------
| GENERAL REPORTS
|--------------------------------------------------------------------------
| GET /api/reports
|--------------------------------------------------------------------------
*/
router.get(
  "/",
  protect,
  getReports
);

/*
|--------------------------------------------------------------------------
| SALES REPORT
|--------------------------------------------------------------------------
| GET /api/reports/sales
|--------------------------------------------------------------------------
*/
router.get(
  "/sales",
  protect,
  getSalesReport
);

/*
|--------------------------------------------------------------------------
| PAYMENTS REPORT
|--------------------------------------------------------------------------
| GET /api/reports/payments
|--------------------------------------------------------------------------
*/
router.get(
  "/payments",
  protect,
  getPaymentsReport
);

export default router;
