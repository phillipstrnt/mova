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


// ============================================================
// ALL SUPPLIER ROUTES REQUIRE AUTHENTICATION
// ============================================================

router.use(protect);


// ============================================================
// GET ALL SUPPLIERS
// GET /api/suppliers
// ============================================================

router.get(
  "/",
  getSuppliers
);


// ============================================================
// GET SINGLE SUPPLIER
// GET /api/suppliers/:id
// ============================================================

router.get(
  "/:id",
  getSupplierById
);


// ============================================================
// CREATE SUPPLIER
// POST /api/suppliers
// ============================================================

router.post(
  "/",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  createSupplier
);


// ============================================================
// UPDATE SUPPLIER
// PUT /api/suppliers/:id
// ============================================================

router.put(
  "/:id",
  authorize(
    "OWNER",
    "ADMIN",
    "MANAGER"
  ),
  updateSupplier
);


// ============================================================
// DEACTIVATE SUPPLIER
// DELETE /api/suppliers/:id
// ============================================================

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