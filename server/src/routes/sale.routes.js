import express from "express";

import {
  createSale,
  getSales,
  getSaleById,
} from "../controllers/saleController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  getSales
);

router.get(
  "/:id",
  getSaleById
);

router.post(
  "/",
  createSale
);

export default router;