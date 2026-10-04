import express from "express";

import {
  createPaymentTransaction,
  getPaymentTransaction,
  getPaymentProviders,
  updatePaymentStatus,
} from "../controllers/paymentController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

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
| PAYMENT TRANSACTIONS
|--------------------------------------------------------------------------
*/

router.post(
  "/transactions",
  createPaymentTransaction
);

router.get(
  "/transactions/:id",
  getPaymentTransaction
);

router.patch(
  "/transactions/:id/status",
  updatePaymentStatus
);

export default router;