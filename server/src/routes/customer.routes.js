import express from "express";

import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  activateCustomer,
  deactivateCustomer,
  getCustomerSales,
} from "../controllers/customerController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get(
  "/",
  getCustomers
);

router.get(
  "/:id/sales",
  getCustomerSales
);

router.get(
  "/:id",
  getCustomerById
);

router.post(
  "/",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  createCustomer
);

router.patch(
  "/:id",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  updateCustomer
);

router.patch(
  "/:id/activate",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  activateCustomer
);

router.patch(
  "/:id/deactivate",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  deactivateCustomer
);

export default router;