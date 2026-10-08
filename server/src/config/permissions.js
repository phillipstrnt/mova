
/*
|--------------------------------------------------------------------------
| MOVA ROLE & PERMISSION SYSTEM
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
| OWNER
|--------------------------------------------------------------------------
*/

const OWNER_PERMISSIONS = [
  ...Object.values(PERMISSIONS),
];

/*
|--------------------------------------------------------------------------
| ADMIN
|--------------------------------------------------------------------------
*/

const ADMIN_PERMISSIONS = [
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
];

/*
|--------------------------------------------------------------------------
| MANAGER
|--------------------------------------------------------------------------
| Manager can manage operational areas, branches and view users.
|--------------------------------------------------------------------------
*/

const MANAGER_PERMISSIONS = [
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
  PERMISSIONS.PAYMENTS_CREATE,

  /*
   * User management
   *
   * Manager can SEE users but does not create,
   * disable or change user accounts.
   */
  PERMISSIONS.USERS_VIEW,

  /*
   * Branch management
   *
   * Manager can view, create and update branches.
   */
  PERMISSIONS.BRANCHES_VIEW,
  PERMISSIONS.BRANCHES_CREATE,
  PERMISSIONS.BRANCHES_UPDATE,

  PERMISSIONS.SETTINGS_VIEW,
];

/*
|--------------------------------------------------------------------------
| CASHIER
|--------------------------------------------------------------------------
*/

const CASHIER_PERMISSIONS = [
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
  PERMISSIONS.PRODUCTS_DELETE,

  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.INVENTORY_ADJUST,

  PERMISSIONS.PURCHASES_VIEW,
  PERMISSIONS.PURCHASES_CREATE,

  PERMISSIONS.SUPPLIERS_VIEW,
  PERMISSIONS.SUPPLIERS_CREATE,

  PERMISSIONS.CUSTOMERS_VIEW,

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

  PERMISSIONS.EXPENSES_VIEW,
  PERMISSIONS.EXPENSES_CREATE,
  PERMISSIONS.EXPENSES_APPROVE,

  PERMISSIONS.PAYMENTS_VIEW,

  PERMISSIONS.REPORTS_VIEW,
  PERMISSIONS.REPORTS_FINANCIAL,

  PERMISSIONS.CUSTOMERS_VIEW,

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
  [ROLES.INVENTORY_MANAGER]: INVENTORY_MANAGER_PERMISSIONS,
  [ROLES.ACCOUNTANT]: ACCOUNTANT_PERMISSIONS,
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

export const hasPermission = (role, permission) => {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole || !permission) {
    return false;
  }

  const rolePermissions =
    ROLE_PERMISSIONS[normalizedRole] || [];

  return rolePermissions.includes(permission);
};

/*
|--------------------------------------------------------------------------
| GET ROLE PERMISSIONS
|--------------------------------------------------------------------------
*/

export const getRolePermissions = (role) => {
  const normalizedRole = normalizeRole(role);

  return [
    ...(ROLE_PERMISSIONS[normalizedRole] || []),
  ];
};

/*
|--------------------------------------------------------------------------
| GET ROLE PERMISSION OBJECT
|--------------------------------------------------------------------------
*/

export const getPermissionMapForRole = (role) => {
  const permissions = getRolePermissions(role);

  return Object.values(PERMISSIONS).reduce(
    (result, permission) => {
      result[permission] =
        permissions.includes(permission);

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

export const isValidRole = (role) => {
  const normalizedRole = normalizeRole(role);

  return Boolean(
    ROLE_PERMISSIONS[normalizedRole]
  );
};

/*
|--------------------------------------------------------------------------
| DEFAULT EXPORT
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
