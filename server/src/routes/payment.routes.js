import express from "express";

import {
  createPayment,
  getPayments,
  getPaymentById,
} from "../controllers/paymentController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

const router =
  express.Router();

/*
|--------------------------------------------------------------------------
| AUTHENTICATION
|--------------------------------------------------------------------------
*/

router.use(protect);

/*
|--------------------------------------------------------------------------
| PAYMENTS
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  getPayments
);

router.get(
  "/:id",
  getPaymentById
);

router.post(
  "/",
  createPayment
);

export default router;