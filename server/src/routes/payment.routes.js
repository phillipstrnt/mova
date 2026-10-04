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

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                              AUTHENTICATION                                */
/* -------------------------------------------------------------------------- */

router.use(protect);

/* -------------------------------------------------------------------------- */
/*                         ELECTRONIC PAYMENT PROVIDERS                       */
/* -------------------------------------------------------------------------- */

/*
 * GET /api/payments/providers
 */
router.get(
  "/providers",
  getPaymentProviders
);

/* -------------------------------------------------------------------------- */
/*                      ELECTRONIC PAYMENT TRANSACTIONS                       */
/* -------------------------------------------------------------------------- */

/*
 * POST /api/payments/transactions
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
 * GET /api/payments/transactions/:id
 */
router.get(
  "/transactions/:id",
  getPaymentTransaction
);

/*
 * PATCH /api/payments/transactions/:id/status
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

/* -------------------------------------------------------------------------- */
/*                            ACTUAL SALE PAYMENTS                            */
/* -------------------------------------------------------------------------- */

/*
 * GET /api/payments
 *
 * Used by Payments.jsx.
 */
router.get(
  "/",
  getPayments
);

/*
 * GET /api/payments/:id
 *
 * Gets one actual Payment record.
 */
router.get(
  "/:id",
  getPayment
);

export default router;