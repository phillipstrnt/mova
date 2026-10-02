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

router.get("/", getExpenses);

/*
|--------------------------------------------------------------------------
| Get Single Expense
|--------------------------------------------------------------------------
*/

router.get("/:id", getExpenseById);

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
  cancelExpense
);

export default router;