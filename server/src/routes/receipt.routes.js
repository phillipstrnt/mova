
import express from "express";

import {
  getReceiptSettings,
  updateReceiptSettings,
} from "../controllers/receiptController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  getReceiptSettings
);

router.put(
  "/",
  protect,
  authorize("OWNER", "ADMIN"),
  updateReceiptSettings
);

export default router;