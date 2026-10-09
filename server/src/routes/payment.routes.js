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

import { requirePermission } from "../middleware/permissionMiddleware.js";
import { PERMISSIONS } from "../config/permissions.js";

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
  requirePermission(PERMISSIONS.PAYMENTS_VIEW),
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
  requirePermission(PERMISSIONS.PAYMENTS_VIEW),
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
  requirePermission(PERMISSIONS.PAYMENTS_VIEW),
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
  requirePermission(PERMISSIONS.PAYMENTS_VIEW),
  getPayment
);

export default router;
