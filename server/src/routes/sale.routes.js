import express from "express";

import {
  createSale,
  getSales,
  getSaleById,
} from "../controllers/saleController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", createSale);

router.get("/", getSales);

router.get("/:id", getSaleById);

export default router;