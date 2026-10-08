
/*
|--------------------------------------------------------------------------
| MOVA ROLE & PERMISSION SYSTEM
|--------------------------------------------------------------------------
|
| The frontend may hide buttons/pages from users, but these permissions
| are enforced on the backend as the real security boundary.
|
| Roles:
|
| OWNER
| ADMIN
| MANAGER
| CASHIER
| INVENTORY_MANAGER
| ACCOUNTANT
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
| ALL MOVA PERMISSIONS
|--------------------------------------------------------------------------
*/

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",

  // POS
  POS_ACCESS: "pos.access",

  // Sales
  SALES_VIEW: "sales.view",
  SALES_CREATE: "sales.create",
  SALES_CANCEL: "sales.cancel",

  // Receipts
  RECEIPTS_VIEW: "receipts.view",

  // Returns
  RETURNS_VIEW: "returns.view",
  RETURNS_CREATE: "returns.create",
  RETURNS_APPROVE: "returns.approve",

  // Products
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_UPDATE: "products.update",
  PRODUCTS_DELETE: "products.delete",

  // Inventory
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_ADJUST: "inventory.adjust",

  // Purchases
  PURCHASES_VIEW: "purchases.view",
  PURCHASES_CREATE: "purchases.create",

  // Customers
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_UPDATE: "customers.update",

  // Suppliers
  SUPPLIERS_VIEW: "suppliers.view",
  SUPPLIERS_CREATE: "suppliers.create",

  // Expenses
  EXPENSES_VIEW: "expenses.view",
  EXPENSES_CREATE: "expenses.create",
  EXPENSES_APPROVE: "expenses.approve",

  // Reports
  REPORTS_VIEW: "reports.view",
  REPORTS_FINANCIAL: "reports.financial",

  // Payments
  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_CREATE: "payments.create",

  // Users
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",
  USERS_DISABLE: "users.disable",

  // Branches
  BRANCHES_VIEW: "branches.view",
  BRANCHES_CREATE: "branches.create",
  BRANCHES_UPDATE: "branches.update",

  // Settings
  SETTINGS_VIEW: "settings.view",
  SETTINGS_UPDATE: "settings.update",

  // Audit
  AUDIT_VIEW: "audit.view",
};

/*
|--------------------------------------------------------------------------
| OWNER
|--------------------------------------------------------------------------
|
| The business owner has complete access to the business.
|
*/

const OWNER_PERMISSIONS = [
  ...Object.values(PERMISSIONS),
];

/*
|--------------------------------------------------------------------------
| ADMIN
|--------------------------------------------------------------------------
|
| Admin can manage most business operations.
|
| Owner-only responsibilities remain outside the normal
| admin workflow, especially ownership.
|
*/

const ADMIN_PERMISSIONS = [
  // Dashboard
  PERMISSIONS.DASHBOARD_VIEW,

  // POS
  PERMISSIONS.POS_ACCESS,

  // Sales
  PERMISSIONS.SALES_VIEW,
  PERMISSIONS.SALES_CREATE,
  PERMISSIONS.SALES_CANCEL,

  // Receipts
  PERMISSIONS.RECEIPTS_VIEW,

  // Returns
  PERMISSIONS.RETURNS_VIEW,
  PERMISSIONS.RETURNS_CREATE,
  PERMISSIONS.RETURNS_APPROVE,

  // Products
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.PRODUCTS_CREATE,
  PERMISSIONS.PRODUCTS_UPDATE,
  PERMISSIONS.PRODUCTS_DELETE,

  // Inventory
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.INVENTORY_ADJUST,

  // Purchases
  PERMISSIONS.PURCHASES_VIEW,
  PERMISSIONS.PURCHASES_CREATE,

  // Customers
  PERMISSIONS.CUSTOMERS_VIEW,
  PERMISSIONS.CUSTOMERS_CREATE,
  PERMISSIONS.CUSTOMERS_UPDATE,

  // Suppliers
  PERMISSIONS.SUPPLIERS_VIEW,
  PERMISSIONS.SUPPLIERS_CREATE,

  // Expenses
  PERMISSIONS.EXPENSES_VIEW,
  PERMISSIONS.EXPENSES_CREATE,
  PERMISSIONS.EXPENSES_APPROVE,

  // Reports
  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.REPORTS_FINANCIAL,

  // Payments
  PERMISSIONS.PAYMENTS_VIEW,
  PERMISSIONS.PAYMENTS_CREATE,

  // Users
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.USERS_UPDATE,
  PERMISSIONS.USERS_DISABLE,

  // Branches
  PERMISSIONS.BRANCHES_VIEW,
  PERMISSIONS.BRANCHES_CREATE,
  PERMISSIONS.BRANCHES_UPDATE,

  // Settings
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.SETTINGS_UPDATE,

  // Audit
  PERMISSIONS.AUDIT_VIEW,
];

/*
|--------------------------------------------------------------------------
| MANAGER
|--------------------------------------------------------------------------
|
| Manager manages day-to-day operations but should not have
| full administrative control over users/settings.
|
*/

const MANAGER_PERMISSIONS = [
  // Dashboard
  PERMISSIONS.DASHBOARD_VIEW,

  // POS
  PERMISSIONS.POS_ACCESS,

  // Sales
  PERMISSIONS.SALES_VIEW,
  PERMISSIONS.SALES_CREATE,
  PERMISSIONS.SALES_CANCEL,

  // Receipts
  PERMISSIONS.RECEIPTS_VIEW,

  // Returns
  PERMISSIONS.RETURNS_VIEW,
  PERMISSIONS.RETURNS_CREATE,
  PERMISSIONS.RETURNS_APPROVE,

  // Products
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.PRODUCTS_CREATE,
  PERMISSIONS.PRODUCTS_UPDATE,

  // Inventory
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.INVENTORY_ADJUST,

  // Purchases
  PERMISSIONS.PURCHASES_VIEW,
  PERMISSIONS.PURCHASES_CREATE,

  // Customers
  PERMISSIONS.CUSTOMERS_VIEW,
  PERMISSIONS.CUSTOMERS_CREATE,
  PERMISSIONS.CUSTOMERS_UPDATE,

  // Suppliers
  PERMISSIONS.SUPPLIERS_VIEW,
  PERMISSIONS.SUPPLIERS_CREATE,

  // Expenses
  PERMISSIONS.EXPENSES_VIEW,
  PERMISSIONS.EXPENSES_CREATE,

  // Reports
  PERMISSIONS.REPORTS_VIEW,

  // Payments
  PERMISSIONS.PAYMENTS_VIEW,
  PERMISSIONS.PAYMENTS_CREATE,

  // Users
  PERMISSIONS.USERS_VIEW,

  // Branches
  PERMISSIONS.BRANCHES_VIEW,

  // Settings
  PERMISSIONS.SETTINGS_VIEW,
];

/*
|--------------------------------------------------------------------------
| CASHIER
|--------------------------------------------------------------------------
|
| A cashier is intentionally restricted.
|
| A cashier should primarily:
|
| - access POS
| - create sales
| - receive payments
| - view receipts
| - handle normal customer operations
| - initiate returns where allowed
|
| A cashier CANNOT:
|
| - create users
| - disable users
| - change settings
| - manage branches
| - access financial reports
| - adjust inventory
| - create products
|
|--------------------------------------------------------------------------
*/

const CASHIER_PERMISSIONS = [
  // Dashboard
  PERMISSIONS.DASHBOARD_VIEW,

  // POS
  PERMISSIONS.POS_ACCESS,

  // Sales
  PERMISSIONS.SALES_VIEW,
  PERMISSIONS.SALES_CREATE,

  // Receipts
  PERMISSIONS.RECEIPTS_VIEW,

  // Returns
  PERMISSIONS.RETURNS_VIEW,
  PERMISSIONS.RETURNS_CREATE,

  // Customers
  PERMISSIONS.CUSTOMERS_VIEW,
  PERMISSIONS.CUSTOMERS_CREATE,
  PERMISSIONS.CUSTOMERS_UPDATE,

  // Payments
  PERMISSIONS.PAYMENTS_VIEW,
  PERMISSIONS.PAYMENTS_CREATE,
];

/*
|--------------------------------------------------------------------------
| INVENTORY MANAGER
|--------------------------------------------------------------------------
*/

const INVENTORY_MANAGER_PERMISSIONS = [
  // Dashboard
  PERMISSIONS.DASHBOARD_VIEW,

  // Products
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.PRODUCTS_CREATE,
  PERMISSIONS.PRODUCTS_UPDATE,
  PERMISSIONS.PRODUCTS_DELETE,

  // Inventory
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.INVENTORY_ADJUST,

  // Purchases
  PERMISSIONS.PURCHASES_VIEW,
  PERMISSIONS.PURCHASES_CREATE,

  // Suppliers
  PERMISSIONS.SUPPLIERS_VIEW,
  PERMISSIONS.SUPPLIERS_CREATE,

  // Customers
  PERMISSIONS.CUSTOMERS_VIEW,

  // Sales
  PERMISSIONS.SALES_VIEW,

  // Reports
  PERMISSIONS.REPORTS_VIEW,
];

/*
|--------------------------------------------------------------------------
| ACCOUNTANT
|--------------------------------------------------------------------------
*/

const ACCOUNTANT_PERMISSIONS = [
  // Dashboard
  PERMISSIONS.DASHBOARD_VIEW,

  // Sales
  PERMISSIONS.SALES_VIEW,

  // Receipts
  PERMISSIONS.RECEIPTS_VIEW,

  // Expenses
  PERMISSIONS.EXPENSES_VIEW,
  PERMISSIONS.EXPENSES_CREATE,
  PERMISSIONS.EXPENSES_APPROVE,

  // Payments
  PERMISSIONS.PAYMENTS_VIEW,

  // Reports
  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.REPORTS_FINANCIAL,

  // Customers
  PERMISSIONS.CUSTOMERS_VIEW,

  // Suppliers
  PERMISSIONS.SUPPLIERS_VIEW,
];

/*
|--------------------------------------------------------------------------
| ROLE → PERMISSIONS
|--------------------------------------------------------------------------
*/

export const ROLE_PERMISSIONS = {
  [ROLES.OWNER]: OWNER_PERMISSIONS,

  [ROLES.ADMIN]: ADMIN_PERMISSIONS,

  [ROLES.MANAGER]: MANAGER_PERMISSIONS,

  [ROLES.CASHIER]: CASHIER_PERMISSIONS,

  [ROLES.INVENTORY_MANAGER]:
    INVENTORY_MANAGER_PERMISSIONS,

  [ROLES.ACCOUNTANT]:
    ACCOUNTANT_PERMISSIONS,
};

/*
|--------------------------------------------------------------------------
| NORMALIZE ROLE
|--------------------------------------------------------------------------
*/

const normalizeRole = (role) => {
  return String(role || "")
    .trim()
    .toUpperCase();
};

/*
|--------------------------------------------------------------------------
| HAS PERMISSION
|--------------------------------------------------------------------------
*/

export const hasPermission = (
  role,
  permission
) => {
  const normalizedRole =
    normalizeRole(role);

  if (!normalizedRole || !permission) {
    return false;
  }

  const rolePermissions =
    ROLE_PERMISSIONS[
      normalizedRole
    ] || [];

  return rolePermissions.includes(
    permission
  );
};

/*
|--------------------------------------------------------------------------
| GET ROLE PERMISSIONS
|--------------------------------------------------------------------------
*/

export const getRolePermissions = (
  role
) => {
  const normalizedRole =
    normalizeRole(role);

  return [
    ...(ROLE_PERMISSIONS[
      normalizedRole
    ] || []),
  ];
};

/*
|--------------------------------------------------------------------------
| GET ROLE PERMISSION OBJECT
|--------------------------------------------------------------------------
|
| Useful for frontend/admin screens if we later need to
| show a permission matrix.
|
*/

export const getPermissionMapForRole = (
  role
) => {
  const permissions =
    getRolePermissions(role);

  return Object.values(
    PERMISSIONS
  ).reduce(
    (result, permission) => {
      result[permission] =
        permissions.includes(
          permission
        );

      return result;
    },
    {}
  );
};

/*
|--------------------------------------------------------------------------
| IS VALID ROLE
|--------------------------------------------------------------------------
*/

export const isValidRole = (
  role
) => {
  const normalizedRole =
    normalizeRole(role);

  return Boolean(
    ROLE_PERMISSIONS[
      normalizedRole
    ]
  );
};

/*
|--------------------------------------------------------------------------
| EXPORT DEFAULT
|--------------------------------------------------------------------------
*/

export default {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  getRolePermissions,
  getPermissionMapForRole,
  isValidRole,
};
