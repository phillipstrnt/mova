import express from "express";

import {
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

router.use(protect);

/*
==================================================
SALES
==================================================
*/

router.get(
  "/sales",
  getSalesReport
);

/*
==================================================
PAYMENTS
==================================================
*/

router.get(
  "/payments",
  getPaymentReport
);

/*
==================================================
EXPENSES
==================================================
*/

router.get(
  "/expenses",
  getExpenseReport
);

/*
==================================================
PROFIT
==================================================
*/

router.get(
  "/profit",
  getProfitReport
);

/*
==================================================
INVENTORY
==================================================
*/

router.get(
  "/inventory",
  getInventoryReport
);

export default router;