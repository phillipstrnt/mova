import express from "express";

import {
  getReports,
  getSalesReport,
  getPaymentsReport,
} from "../controllers/reportController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

const router = express.Router();

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