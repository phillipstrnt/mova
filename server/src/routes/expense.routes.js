import express from "express";

import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  cancelExpense,
} from "../controllers/expenseController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";
import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| Get Expenses
|--------------------------------------------------------------------------
|
| All authenticated active users can view expenses.
|
*/

router.get("/", requirePermission("expenses.view"), getExpenses);

/*
|--------------------------------------------------------------------------
| Get Single Expense
|--------------------------------------------------------------------------
*/

router.get("/:id", requirePermission("expenses.view"), getExpenseById);

/*
|--------------------------------------------------------------------------
| Create Expense
|--------------------------------------------------------------------------
|
| CASHIER is allowed to record an expense.
| This is important because the current MOVA user system
| can assign CASHIER as the logged-in user's role.
|
*/

router.post(
  "/",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "ACCOUNTANT",
    "CASHIER"
  ),
  requirePermission("expenses.create"),
  createExpense
);

/*
|--------------------------------------------------------------------------
| Update Expense
|--------------------------------------------------------------------------
|
| Editing financial records is restricted to management/accounting roles.
|
*/

router.put(
  "/:id",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "ACCOUNTANT"
  ),
  requirePermission("expenses.update"),
  updateExpense
);

/*
|--------------------------------------------------------------------------
| Cancel Expense
|--------------------------------------------------------------------------
|
| Cancellation is restricted to management/accounting roles.
|
*/

router.post(
  "/:id/cancel",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "ACCOUNTANT"
  ),
  requirePermission("expenses.update"),
  cancelExpense
);

export default router;
