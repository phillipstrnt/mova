
/*
|--------------------------------------------------------------------------
| MOVA ROLE PERMISSIONS
|--------------------------------------------------------------------------
|
| This file defines what each MOVA role can do.
|
| IMPORTANT:
| These permissions are enforced by the backend.
| Hiding a menu item in React is NOT enough for security.
|
|--------------------------------------------------------------------------
*/

export const ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
  INVENTORY_MANAGER: "INVENTORY_MANAGER",
  ACCOUNTANT: "ACCOUNTANT",
};

/*
|--------------------------------------------------------------------------
| PERMISSIONS
|--------------------------------------------------------------------------
*/

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",

  POS_ACCESS: "pos.access",

  SALES_VIEW: "sales.view",
  SALES_CREATE: "sales.create",
  SALES_CANCEL: "sales.cancel",

  RECEIPTS_VIEW: "receipts.view",

  RETURNS_VIEW: "returns.view",
  RETURNS_CREATE: "returns.create",
  RETURNS_APPROVE: "returns.approve",

  PRODUCTS_VIEW: "products.view",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_DELETE: "products.delete",

  INVENTORY_VIEW: "inventory.view",
  INVENTORY_ADJUST: "inventory.adjust",

  PURCHASES_VIEW: "purchases.view",
  PURCHASES_CREATE: "purchases.create",

  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_UPDATE: "customers.update",

  SUPPLIERS_VIEW: "suppliers.view",
  SUPPLIERS_CREATE: "suppliers.create",

  EXPENSES_VIEW: "expenses.view",
  EXPENSES_CREATE: "expenses.create",
  EXPENSES_APPROVE: "expenses.approve",

  REPORTS_VIEW: "reports.view",
  REPORTS_FINANCIAL: "reports.financial",

  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_CREATE: "payments.create",

  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DISABLE: "users.disable",

  BRANCHES_VIEW: "branches.view",
  BRANCHES_CREATE: "branches.create",
  BRANCHES_UPDATE: "branches.update",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_UPDATE: "settings.update",

  AUDIT_VIEW: "audit.view",
};

/*
|--------------------------------------------------------------------------
| ROLE PERMISSION MATRIX
|--------------------------------------------------------------------------
*/

export const ROLE_PERMISSIONS = {
  /*
  |--------------------------------------------------------------------------
  | OWNER
  |--------------------------------------------------------------------------
  */

  OWNER: Object.values(PERMISSIONS),

  /*
  |--------------------------------------------------------------------------
  | ADMIN
  |--------------------------------------------------------------------------
  */

  ADMIN: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.POS_ACCESS,

    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.SALES_CREATE,
    PERMISSIONS.SALES_CANCEL,

    PERMISSIONS.RECEIPTS_VIEW,

    PERMISSIONS.RETURNS_VIEW,
    PERMISSIONS.RETURNS_CREATE,
    PERMISSIONS.RETURNS_APPROVE,

    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_DELETE,

    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,

    PERMISSIONS.PURCHASES_VIEW,
    PERMISSIONS.PURCHASES_CREATE,

    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,

    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.SUPPLIERS_CREATE,

    PERMISSIONS.EXPENSES_VIEW,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.EXPENSES_APPROVE,

    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_FINANCIAL,

    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_CREATE,

    PERMISSIONS.USERS_VIEW,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DISABLE,

    PERMISSIONS.BRANCHES_VIEW,
    PERMISSIONS.BRANCHES_CREATE,
    PERMISSIONS.BRANCHES_UPDATE,

    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.SETTINGS_UPDATE,

    PERMISSIONS.AUDIT_VIEW,
  ],

  /*
  |--------------------------------------------------------------------------
  | MANAGER
  |--------------------------------------------------------------------------
  */

  MANAGER: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.POS_ACCESS,

    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.SALES_CREATE,

    PERMISSIONS.RECEIPTS_VIEW,

    PERMISSIONS.RETURNS_VIEW,
    PERMISSIONS.RETURNS_CREATE,
    PERMISSIONS.RETURNS_APPROVE,

    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_UPDATE,

    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,

    PERMISSIONS.PURCHASES_VIEW,
    PERMISSIONS.PURCHASES_CREATE,

    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,

    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.SUPPLIERS_CREATE,

    PERMISSIONS.EXPENSES_VIEW,
    PERMISSIONS.EXPENSES_CREATE,

    PERMISSIONS.REPORTS_VIEW,

    PERMISSIONS.PAYMENTS_VIEW,

    PERMISSIONS.USERS_VIEW,

    PERMISSIONS.BRANCHES_VIEW,

    PERMISSIONS.SETTINGS_VIEW,
  ],

  /*
  |--------------------------------------------------------------------------
  | CASHIER
  |--------------------------------------------------------------------------
  */

  CASHIER: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.POS_ACCESS,

    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.SALES_CREATE,

    PERMISSIONS.RECEIPTS_VIEW,

    PERMISSIONS.RETURNS_VIEW,
    PERMISSIONS.RETURNS_CREATE,

    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_CREATE,
    PERMISSIONS.CUSTOMERS_UPDATE,

    PERMISSIONS.PAYMENTS_VIEW,
    PERMISSIONS.PAYMENTS_CREATE,
  ],

  /*
  |--------------------------------------------------------------------------
  | INVENTORY MANAGER
  |--------------------------------------------------------------------------
  */

  INVENTORY_MANAGER: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_DELETE,

    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,

    PERMISSIONS.PURCHASES_VIEW,
    PERMISSIONS.PURCHASES_CREATE,

    PERMISSIONS.SUPPLIERS_VIEW,
    PERMISSIONS.SUPPLIERS_CREATE,
  ],

  /*
  |--------------------------------------------------------------------------
  | ACCOUNTANT
  |--------------------------------------------------------------------------
  */

  ACCOUNTANT: [
    PERMISSIONS.DASHBOARD_VIEW,

    PERMISSIONS.SALES_VIEW,
    PERMISSIONS.RECEIPTS_VIEW,

    PERMISSIONS.EXPENSES_VIEW,
    PERMISSIONS.EXPENSES_CREATE,
    PERMISSIONS.EXPENSES_APPROVE,

    PERMISSIONS.PAYMENTS_VIEW,

    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.REPORTS_FINANCIAL,

    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.SUPPLIERS_VIEW,
  ],
};

/*
|--------------------------------------------------------------------------
| CHECK PERMISSION
|--------------------------------------------------------------------------
*/

export const hasPermission = (
  role,
  permission
) => {
  const permissions =
    ROLE_PERMISSIONS[role] || [];

  return permissions.includes(permission);
};

/*
|--------------------------------------------------------------------------
| GET ROLE PERMISSIONS
|--------------------------------------------------------------------------
*/

export const getRolePermissions = (
  role
) => {
  return ROLE_PERMISSIONS[role] || [];
};