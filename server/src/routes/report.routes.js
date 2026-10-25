import express from "express";
import rateLimit from "express-rate-limit";

import {
  getReports,
  getSalesReport,
  getPaymentReport,
  getExpenseReport,
  getProfitReport,
  getInventoryReport,
  searchReportAssistant,
} from "../controllers/reportController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router =
  express.Router();

const assistantSearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  keyGenerator: (req) => String(req.user?._id || "authenticated"),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Please wait a moment before searching again." },
});

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
|
| Every report endpoint requires an authenticated MOVA user.
|
*/

router.use(protect);
router.use(requirePermission("reports.view"));

/*
|--------------------------------------------------------------------------
| GENERAL REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports
|
*/

router.get(
  "/",
  getReports
);

router.post(
  "/assistant-search",
  assistantSearchLimiter,
  searchReportAssistant
);

/*
|--------------------------------------------------------------------------
| SALES REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/sales
|
| Example:
|
| /api/reports/sales
| /api/reports/sales?startDate=2026-10-01&endDate=2026-10-06
| /api/reports/sales?startDate=2026-10-01&endDate=2026-10-06&branchId=...
|
*/

router.get(
  "/sales",
  getSalesReport
);

/*
|--------------------------------------------------------------------------
| PAYMENT REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/payments
|
*/

router.get(
  "/payments",
  getPaymentReport
);

/*
|--------------------------------------------------------------------------
| EXPENSE REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/expenses
|
*/

router.get(
  "/expenses",
  getExpenseReport
);

/*
|--------------------------------------------------------------------------
| PROFIT REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/profit
|
*/

router.get(
  "/profit",
  getProfitReport
);

/*
|--------------------------------------------------------------------------
| INVENTORY REPORT
|--------------------------------------------------------------------------
|
| GET /api/reports/inventory
|
*/

router.get(
  "/inventory",
  getInventoryReport
);

export default router;
