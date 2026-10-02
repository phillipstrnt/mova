import express from "express";

import {
  getSalesReport,
  getPaymentReport,
  getExpenseReport,
  getProfitReport,
  getInventoryReport,
} from "../controllers/reportController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All report endpoints require authentication
router.use(protect);

// Sales report
router.get("/sales", getSalesReport);

// Payment report
router.get("/payments", getPaymentReport);

// Expense report
router.get("/expenses", getExpenseReport);

// Profit report
router.get("/profit", getProfitReport);

// Inventory report
router.get("/inventory", getInventoryReport);

export default router;