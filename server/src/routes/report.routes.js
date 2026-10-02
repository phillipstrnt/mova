import express from "express";

import {
  getSalesReport,
  getPaymentReport,
  getExpenseReport,
  getProfitReport,
  getInventoryReport,
  saveReport,
  getSavedReports,
  getSavedReport,
  deleteSavedReport,
} from "../controllers/reportController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/* =========================================================
   PROTECT ALL REPORT ROUTES
========================================================= */

router.use(protect);

/* =========================================================
   GENERATED REPORTS
========================================================= */

router.get(
  "/sales",
  getSalesReport
);

router.get(
  "/payments",
  getPaymentReport
);

router.get(
  "/expenses",
  getExpenseReport
);

router.get(
  "/profit",
  getProfitReport
);

router.get(
  "/inventory",
  getInventoryReport
);

/* =========================================================
   SAVED REPORTS
========================================================= */

router.post(
  "/saved",
  saveReport
);

router.get(
  "/saved",
  getSavedReports
);

router.get(
  "/saved/:id",
  getSavedReport
);

router.delete(
  "/saved/:id",
  deleteSavedReport
);

export default router;