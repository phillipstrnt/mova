import express from "express";

import {
  getReturns,
  getReturnById,
  getSaleReturnableItems,
  createReturn,
} from "../controllers/returnController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  getReturns
);

router.get(
  "/sale/:saleId",
  getSaleReturnableItems
);

router.get(
  "/:id",
  getReturnById
);

router.post(
  "/",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  createReturn
);

export default router;