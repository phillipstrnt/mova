import express from "express";

import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplierController.js";

import {
  protect,
  authorize,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All supplier routes require authentication
router.use(protect);

// Get all suppliers
router.get(
  "/",
  getSuppliers
);

// Get one supplier
router.get(
  "/:id",
  getSupplierById
);

// Create supplier
router.post(
  "/",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  createSupplier
);

// Update supplier
router.put(
  "/:id",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  updateSupplier
);

// Deactivate supplier
router.delete(
  "/:id",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  deleteSupplier
);

export default router;