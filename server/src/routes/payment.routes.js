import express from "express";

import {
  getPayments,
  getPayment,
  createPaymentTransaction,
  getPaymentTransaction,
  getPaymentProviders,
  updatePaymentStatus,
} from "../controllers/paymentController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| PROTECT ALL PAYMENT ROUTES
|--------------------------------------------------------------------------
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| PAYMENT PROVIDERS
|--------------------------------------------------------------------------
*/

router.get(
  "/providers",
  getPaymentProviders
);

/*
|--------------------------------------------------------------------------
| CREATE ELECTRONIC PAYMENT TRANSACTION
|--------------------------------------------------------------------------
*/

router.post(
  "/transactions",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "ACCOUNTANT",
    "CASHIER"
  ),
  createPaymentTransaction
);

/*
|--------------------------------------------------------------------------
| GET ELECTRONIC PAYMENT TRANSACTION
|--------------------------------------------------------------------------
*/

router.get(
  "/transactions/:id",
  getPaymentTransaction
);

/*
|--------------------------------------------------------------------------
| UPDATE ELECTRONIC PAYMENT TRANSACTION STATUS
|--------------------------------------------------------------------------
*/

router.patch(
  "/transactions/:id/status",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER",
    "ACCOUNTANT",
    "CASHIER"
  ),
  updatePaymentStatus
);

/*
|--------------------------------------------------------------------------
| PAYMENT HISTORY
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  getPayments
);

/*
|--------------------------------------------------------------------------
| GET SINGLE COMPLETED PAYMENT
|--------------------------------------------------------------------------
|
| IMPORTANT:
| This route must come AFTER /transactions/:id.
|
*/

router.get(
  "/:id",
  getPayment
);

export default router;