
/*
|--------------------------------------------------------------------------
| MOVA PERMISSIONS
|--------------------------------------------------------------------------
|
| Central permission configuration for the MOVA business management
| platform.
|
| Roles:
|   OWNER
|   ADMIN
|   MANAGER
|   CASHIER
|   INVENTORY_MANAGER
|   ACCOUNTANT
|
|--------------------------------------------------------------------------
*/

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",

  // POS
  POS_VIEW: "pos.view",
  POS_CREATE_SALE: "pos.create_sale",

  // Sales
  SALES_VIEW: "sales.view",
  SALES_CREATE: "sales.create",
  SALES_UPDATE: "sales.update",
  SALES_CANCEL: "sales.cancel",

  // Receipts
  RECEIPTS_VIEW: "receipts.view",
  RECEIPTS_PRINT: "receipts.print",
  RECEIPTS_DOWNLOAD: "receipts.download",

  // Returns
  RETURNS_VIEW: "returns.view",
  RETURNS_CREATE: "returns.create",
  RETURNS_UPDATE: "returns.update",

  // Products
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_DELETE: "products.delete",

  // Categories
  CATEGORIES_VIEW: "categories.view",
  CATEGORIES_CREATE: "categories.create",
  CATEGORIES_UPDATE: "categories.update",
  CATEGORIES_DELETE: "categories.delete",

  // Inventory
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_CREATE: "inventory.create",
  INVENTORY_UPDATE: "inventory.update",
  INVENTORY_ADJUST: "inventory.adjust",

  // Customers
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_UPDATE: "customers.update",
  CUSTOMERS_DELETE: "customers.delete",

  // Suppliers
  SUPPLIERS_VIEW: "suppliers.view",
  SUPPLIERS_CREATE: "suppliers.create",
  SUPPLIERS_UPDATE: "suppliers.update",
  SUPPLIERS_DELETE: "suppliers.delete",

  // Purchases
  PURCHASES_VIEW: "purchases.view",
  PURCHASES_CREATE: "purchases.create",
  PURCHASES_UPDATE: "purchases.update",
  PURCHASES_DELETE: "purchases.delete",

  // Expenses
  EXPENSES_VIEW: "expenses.view",
  EXPENSES_CREATE: "expenses.create",
  EXPENSES_UPDATE: "expenses.update",
  EXPENSES_DELETE: "expenses.delete",

  // Payments
  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_CREATE: "payments.create",
  PAYMENTS_UPDATE: "payments.update",
  PAYMENTS_REFUND: "payments.refund",

  // Reports
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",

  // Users
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DISABLE: "users.disable",

  // Branches
  BRANCHES_VIEW: "branches.view",
  BRANCHES_CREATE: "branches.create",
  BRANCHES_UPDATE: "branches.update",
  BRANCHES_DELETE: "branches.delete",

  // Audit
  AUDIT_VIEW: "audit.view",

  // Settings
  SETTINGS_VIEW: "settings.view",
  SETTINGS_UPDATE: "settings.update",
};

/*
|--------------------------------------------------------------------------
| OWNER
|--------------------------------------------------------------------------
|
| Owner has unrestricted access.
|
|--------------------------------------------------------------------------
*/

const OWNER_PERMISSIONS = Object.values(PERMISSIONS);

/*
|--------------------------------------------------------------------------
| ADMIN
|--------------------------------------------------------------------------
|
| Admin has full operational access.
|
|--------------------------------------------------------------------------
*/

const ADMIN_PERMISSIONS = Object.values(PERMISSIONS);

/*
|--------------------------------------------------------------------------
| MANAGER
|--------------------------------------------------------------------------
*/

const MANAGER_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_VIEW,

  PERMISSIONS.POS_VIEW,
  PERMISSIONS.POS_CREATE_SALE,

  PERMISSIONS.SALES_VIEW,
  PERMISSIONS.SALES_CREATE,
  PERMISSIONS.SALES_UPDATE,

  PERMISSIONS.RECEIPTS_VIEW,
  PERMISSIONS.RECEIPTS_PRINT,
  PERMISSIONS.RECEIPTS_DOWNLOAD,

  PERMISSIONS.RETURNS_VIEW,
  PERMISSIONS.RETURNS_CREATE,
  PERMISSIONS.RETURNS_UPDATE,

  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.PRODUCTS_CREATE,
  PERMISSIONS.PRODUCTS_UPDATE,

  PERMISSIONS.CATEGORIES_VIEW,
  PERMISSIONS.CATEGORIES_CREATE,
  PERMISSIONS.CATEGORIES_UPDATE,

  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.INVENTORY_CREATE,
  PERMISSIONS.INVENTORY_UPDATE,
  PERMISSIONS.INVENTORY_ADJUST,

  PERMISSIONS.CUSTOMERS_VIEW,
  PERMISSIONS.CUSTOMERS_CREATE,
  PERMISSIONS.CUSTOMERS_UPDATE,

  PERMISSIONS.SUPPLIERS_VIEW,
  PERMISSIONS.SUPPLIERS_CREATE,
  PERMISSIONS.SUPPLIERS_UPDATE,

  PERMISSIONS.PURCHASES_VIEW,
  PERMISSIONS.PURCHASES_CREATE,
  PERMISSIONS.PURCHASES_UPDATE,

  PERMISSIONS.EXPENSES_VIEW,
  PERMISSIONS.EXPENSES_CREATE,
  PERMISSIONS.EXPENSES_UPDATE,

  PERMISSIONS.PAYMENTS_VIEW,
  PERMISSIONS.PAYMENTS_CREATE,
  PERMISSIONS.PAYMENTS_UPDATE,

  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.REPORTS_EXPORT,

  PERMISSIONS.USERS_VIEW,

  PERMISSIONS.BRANCHES_VIEW,
  PERMISSIONS.BRANCHES_CREATE,
  PERMISSIONS.BRANCHES_UPDATE,

  PERMISSIONS.SETTINGS_VIEW,
];

/*
|--------------------------------------------------------------------------
| CASHIER
|--------------------------------------------------------------------------
|
| Cashiers only receive permissions required for daily sales operations.
|
|--------------------------------------------------------------------------
*/

const CASHIER_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_VIEW,

  PERMISSIONS.POS_VIEW,
  PERMISSIONS.POS_CREATE_SALE,

  PERMISSIONS.SALES_VIEW,
  PERMISSIONS.SALES_CREATE,

  PERMISSIONS.RECEIPTS_VIEW,
  PERMISSIONS.RECEIPTS_PRINT,
  PERMISSIONS.RECEIPTS_DOWNLOAD,

  PERMISSIONS.RETURNS_VIEW,
  PERMISSIONS.RETURNS_CREATE,

  // Cashiers can manage customers from POS/customer screen.
  PERMISSIONS.CUSTOMERS_VIEW,
  PERMISSIONS.CUSTOMERS_CREATE,
  PERMISSIONS.CUSTOMERS_UPDATE,

  PERMISSIONS.PAYMENTS_VIEW,
  PERMISSIONS.PAYMENTS_CREATE,
];

/*
|--------------------------------------------------------------------------
| INVENTORY MANAGER
|--------------------------------------------------------------------------
*/

const INVENTORY_MANAGER_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_VIEW,

  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.PRODUCTS_CREATE,
  PERMISSIONS.PRODUCTS_UPDATE,

  PERMISSIONS.CATEGORIES_VIEW,
  PERMISSIONS.CATEGORIES_CREATE,
  PERMISSIONS.CATEGORIES_UPDATE,

  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.INVENTORY_CREATE,
  PERMISSIONS.INVENTORY_UPDATE,
  PERMISSIONS.INVENTORY_ADJUST,

  PERMISSIONS.PURCHASES_VIEW,
  PERMISSIONS.PURCHASES_CREATE,
  PERMISSIONS.PURCHASES_UPDATE,

  PERMISSIONS.SUPPLIERS_VIEW,
  PERMISSIONS.SUPPLIERS_CREATE,
  PERMISSIONS.SUPPLIERS_UPDATE,

  PERMISSIONS.CUSTOMERS_VIEW,
  PERMISSIONS.CUSTOMERS_CREATE,
  PERMISSIONS.CUSTOMERS_UPDATE,

  PERMISSIONS.SALES_VIEW,

  PERMISSIONS.REPORTS_VIEW,
];

/*
|--------------------------------------------------------------------------
| ACCOUNTANT
|--------------------------------------------------------------------------
*/

const ACCOUNTANT_PERMISSIONS = [
  PERMISSIONS.DASHBOARD_VIEW,

  PERMISSIONS.SALES_VIEW,

  PERMISSIONS.RECEIPTS_VIEW,
  PERMISSIONS.RECEIPTS_DOWNLOAD,

  PERMISSIONS.CUSTOMERS_VIEW,

  PERMISSIONS.SUPPLIERS_VIEW,

  PERMISSIONS.EXPENSES_VIEW,
  PERMISSIONS.EXPENSES_CREATE,
  PERMISSIONS.EXPENSES_UPDATE,

  PERMISSIONS.PAYMENTS_VIEW,
  PERMISSIONS.PAYMENTS_CREATE,
  PERMISSIONS.PAYMENTS_UPDATE,

  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.REPORTS_EXPORT,
];

/*
|--------------------------------------------------------------------------
| ROLE PERMISSIONS
|--------------------------------------------------------------------------
*/

export const ROLE_PERMISSIONS = {
  OWNER: OWNER_PERMISSIONS,
  ADMIN: ADMIN_PERMISSIONS,
  MANAGER: MANAGER_PERMISSIONS,
  CASHIER: CASHIER_PERMISSIONS,
  INVENTORY_MANAGER: INVENTORY_MANAGER_PERMISSIONS,
  ACCOUNTANT: ACCOUNTANT_PERMISSIONS,
};

/*
|--------------------------------------------------------------------------
| GET ROLE PERMISSIONS
|--------------------------------------------------------------------------
|
| This function is intentionally exported because permissionMiddleware.js
| uses it.
|
|--------------------------------------------------------------------------
*/

export const getRolePermissions = (role) => {
  if (!role) {
    return [];
  }

  const normalizedRole = String(role).toUpperCase();

  return ROLE_PERMISSIONS[normalizedRole] || [];
};

/*
|--------------------------------------------------------------------------
| CHECK ONE PERMISSION
|--------------------------------------------------------------------------
*/

export const hasPermission = (role, permission) => {
  if (!role || !permission) {
    return false;
  }

  const normalizedRole = String(role).toUpperCase();

  // Owner has unrestricted access.
  if (normalizedRole === "OWNER") {
    return true;
  }

  const permissions = getRolePermissions(normalizedRole);

  return permissions.includes(permission);
};

/*
|--------------------------------------------------------------------------
| CHECK ANY PERMISSION
|--------------------------------------------------------------------------
*/

export const hasAnyPermission = (role, permissions = []) => {
  if (!role || !Array.isArray(permissions)) {
    return false;
  }

  if (String(role).toUpperCase() === "OWNER") {
    return true;
  }

  return permissions.some((permission) =>
    hasPermission(role, permission)
  );
};

/*
|--------------------------------------------------------------------------
| CHECK ALL PERMISSIONS
|--------------------------------------------------------------------------
*/

export const hasAllPermissions = (role, permissions = []) => {
  if (!role || !Array.isArray(permissions)) {
    return false;
  }

  if (String(role).toUpperCase() === "OWNER") {
    return true;
  }

  return permissions.every((permission) =>
    hasPermission(role, permission)
  );
};

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
|--------------------------------------------------------------------------
|
| Useful for files that import the permission configuration as an object.
|
|--------------------------------------------------------------------------
*/

export default {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  getRolePermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
};
