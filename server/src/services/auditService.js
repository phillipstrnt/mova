
import mongoose from "mongoose";
import AuditLog from "../models/AuditLog.js";

/*
|--------------------------------------------------------------------------
| CREATE AUDIT LOG
|--------------------------------------------------------------------------
*/

export const createAuditLog = async ({
  req,
  businessId,
  branchId = null,
  action,
  entity,
  entityId = null,
  description,
  severity = "INFO",
  metadata = {},
}) => {
  try {
    if (!businessId) {
      console.warn(
        "Audit log skipped: businessId is missing."
      );

      return null;
    }

    if (!action) {
      console.warn(
        "Audit log skipped: action is missing."
      );

      return null;
    }

    if (!entity) {
      console.warn(
        "Audit log skipped: entity is missing."
      );

      return null;
    }

    if (!description) {
      console.warn(
        "Audit log skipped: description is missing."
      );

      return null;
    }

    const user = req?.user || null;

    const actorId =
      user?._id &&
      mongoose.Types.ObjectId.isValid(user._id)
        ? user._id
        : null;

    const actorName =
      user?.name ||
      user?.fullName ||
      user?.email ||
      "System";

    const actorRole =
      user?.role ||
      "SYSTEM";

    const ipAddress =
      req?.headers?.["x-forwarded-for"] ||
      req?.socket?.remoteAddress ||
      "";

    const userAgent =
      req?.headers?.["user-agent"] ||
      "";

    const auditLog = await AuditLog.create({
      businessId,
      branchId,
      actorId,
      actorName,
      actorRole,
      action,
      entity,
      entityId,
      description,
      severity,
      metadata,
      ipAddress:
        typeof ipAddress === "string"
          ? ipAddress.split(",")[0].trim()
          : "",
      userAgent,
    });

    return auditLog;
  } catch (error) {
    /*
     * Audit logging must NEVER break the actual
     * business operation.
     */

    console.error(
      "Audit log creation failed:",
      error
    );

    return null;
  }
};


/*
|--------------------------------------------------------------------------
| COMMON AUDIT ACTIONS
|--------------------------------------------------------------------------
*/

export const auditUserCreated = async ({
  req,
  businessId,
  branchId,
  user,
}) => {
  return createAuditLog({
    req,
    businessId,
    branchId,
    action: "USER_CREATED",
    entity: "User",
    entityId: user?._id || null,
    description: `Created user ${user?.name || user?.email || "Unknown user"} with role ${user?.role || "UNKNOWN"}.`,
    metadata: {
      userId: user?._id || null,
      userName: user?.name || "",
      email: user?.email || "",
      role: user?.role || "",
    },
  });
};


export const auditUserUpdated = async ({
  req,
  businessId,
  branchId,
  user,
  changes = {},
}) => {
  return createAuditLog({
    req,
    businessId,
    branchId,
    action: "USER_UPDATED",
    entity: "User",
    entityId: user?._id || null,
    description: `Updated user ${user?.name || user?.email || "Unknown user"}.`,
    metadata: {
      userId: user?._id || null,
      changes,
    },
  });
};


export const auditUserDisabled = async ({
  req,
  businessId,
  branchId,
  user,
}) => {
  return createAuditLog({
    req,
    businessId,
    branchId,
    action: "USER_DISABLED",
    entity: "User",
    entityId: user?._id || null,
    description: `Disabled user ${user?.name || user?.email || "Unknown user"}.`,
    severity: "WARNING",
    metadata: {
      userId: user?._id || null,
      userName: user?.name || "",
      role: user?.role || "",
    },
  });
};


export const auditUserEnabled = async ({
  req,
  businessId,
  branchId,
  user,
}) => {
  return createAuditLog({
    req,
    businessId,
    branchId,
    action: "USER_ENABLED",
    entity: "User",
    entityId: user?._id || null,
    description: `Enabled user ${user?.name || user?.email || "Unknown user"}.`,
    metadata: {
      userId: user?._id || null,
      userName: user?.name || "",
      role: user?.role || "",
    },
  });
};


export const auditSaleCompleted = async ({
  req,
  businessId,
  branchId,
  sale,
}) => {
  return createAuditLog({
    req,
    businessId,
    branchId,
    action: "SALE_COMPLETED",
    entity: "Sale",
    entityId: sale?._id || null,
    description: `Completed sale ${sale?.receiptNumber || sale?._id || ""} for UGX ${Number(sale?.total || 0).toLocaleString()}.`,
    metadata: {
      saleId: sale?._id || null,
      receiptNumber: sale?.receiptNumber || "",
      total: sale?.total || 0,
      paymentMethod:
        sale?.paymentMethod || "",
    },
  });
};


export const auditReturnCreated = async ({
  req,
  businessId,
  branchId,
  returnRecord,
}) => {
  return createAuditLog({
    req,
    businessId,
    branchId,
    action: "RETURN_CREATED",
    entity: "Return",
    entityId: returnRecord?._id || null,
    description: `Created a return for sale ${returnRecord?.saleId || ""}.`,
    severity: "WARNING",
    metadata: {
      returnId:
        returnRecord?._id || null,
      saleId:
        returnRecord?.saleId || null,
      amount:
        returnRecord?.amount || 0,
    },
  });
};


export const auditStockAdjusted = async ({
  req,
  businessId,
  branchId,
  product,
  previousQuantity,
  newQuantity,
}) => {
  return createAuditLog({
    req,
    businessId,
    branchId,
    action: "STOCK_ADJUSTED",
    entity: "Product",
    entityId: product?._id || null,
    description: `Adjusted stock for ${product?.name || "product"} from ${previousQuantity} to ${newQuantity}.`,
    severity: "WARNING",
    metadata: {
      productId:
        product?._id || null,
      productName:
        product?.name || "",
      previousQuantity,
      newQuantity,
      difference:
        Number(newQuantity || 0) -
        Number(previousQuantity || 0),
    },
  });
};


export const auditExpenseCreated = async ({
  req,
  businessId,
  branchId,
  expense,
}) => {
  return createAuditLog({
    req,
    businessId,
    branchId,
    action: "EXPENSE_CREATED",
    entity: "Expense",
    entityId: expense?._id || null,
    description: `Created an expense of UGX ${Number(expense?.amount || 0).toLocaleString()}.`,
    metadata: {
      expenseId:
        expense?._id || null,
      amount:
        expense?.amount || 0,
      category:
        expense?.category || "",
    },
  });
};


export const auditPurchaseCreated = async ({
  req,
  businessId,
  branchId,
  purchase,
}) => {
  return createAuditLog({
    req,
    businessId,
    branchId,
    action: "PURCHASE_CREATED",
    entity: "Purchase",
    entityId: purchase?._id || null,
    description: `Created a purchase transaction.`,
    metadata: {
      purchaseId:
        purchase?._id || null,
      total:
        purchase?.total || 0,
    },
  });
};


export const auditBusinessSettingsUpdated = async ({
  req,
  businessId,
  branchId,
  changes = {},
}) => {
  return createAuditLog({
    req,
    businessId,
    branchId,
    action: "BUSINESS_SETTINGS_UPDATED",
    entity: "Business",
    entityId: businessId,
    description:
      "Business settings were updated.",
    metadata: {
      changes,
    },
  });
};
