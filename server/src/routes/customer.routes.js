// server/src/routes/customer.routes.js

import express from "express";

import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  activateCustomer,
  deactivateCustomer,
  deleteCustomer,
  getCustomerSales,
} from "../controllers/customerController.js";

import {
  protect,
} from "../middleware/authMiddleware.js";

import {
  requirePermission,
} from "../middleware/permissionMiddleware.js";

import {
  PERMISSIONS,
} from "../config/permissions.js";


const router =
  express.Router();


// ============================================================
// AUTHENTICATION
// ============================================================

router.use(protect);


// ============================================================
// GET CUSTOMERS
// ============================================================

router.get(
  "/",
  requirePermission(
    PERMISSIONS.CUSTOMERS_VIEW
  ),
  getCustomers
);


// ============================================================
// CREATE CUSTOMER
// ============================================================

router.post(
  "/",
  requirePermission(
    PERMISSIONS.CUSTOMERS_CREATE
  ),
  createCustomer
);


// ============================================================
// GET CUSTOMER SALES HISTORY
// ============================================================

router.get(
  "/:id/sales",
  requirePermission(
    PERMISSIONS.CUSTOMERS_VIEW
  ),
  getCustomerSales
);


// ============================================================
// GET SINGLE CUSTOMER
// ============================================================

router.get(
  "/:id",
  requirePermission(
    PERMISSIONS.CUSTOMERS_VIEW
  ),
  getCustomer
);


// ============================================================
// UPDATE CUSTOMER
// ============================================================

router.patch(
  "/:id",
  requirePermission(
    PERMISSIONS.CUSTOMERS_UPDATE
  ),
  updateCustomer
);


// ============================================================
// ACTIVATE CUSTOMER
// ============================================================

router.patch(
  "/:id/activate",
  requirePermission(
    PERMISSIONS.CUSTOMERS_UPDATE
  ),
  activateCustomer
);


// ============================================================
// DEACTIVATE CUSTOMER
// ============================================================

router.patch(
  "/:id/deactivate",
  requirePermission(
    PERMISSIONS.CUSTOMERS_UPDATE
  ),
  deactivateCustomer
);


// ============================================================
// DELETE CUSTOMER
// ============================================================

router.delete(
  "/:id",
  requirePermission(
    PERMISSIONS.CUSTOMERS_DELETE
  ),
  deleteCustomer
);


// ============================================================
// EXPORT
// ============================================================

export default router;