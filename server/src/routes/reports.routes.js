import express from "express";

import {
  getReports,
  getSalesReport,
  getPaymentReport,
  getExpenseReport,
  getProfitReport,
  getInventoryReport,
} from "../controllers/reportController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
|
| Every report endpoint requires an authenticated MOVA user.
|
*/

router.use(protect);

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