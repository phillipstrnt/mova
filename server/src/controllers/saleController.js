import mongoose from "mongoose";

import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import ProductBranchStock from "../models/ProductBranchStock.js";
import Customer from "../models/Customer.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Payment from "../models/Payment.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import Branch from "../models/Branch.js";
import Business from "../models/Business.js";
import { hasPermission } from "../config/permissions.js";
import AuditLog from "../models/AuditLog.js";
import InventoryBatch from "../models/InventoryBatch.js";
import CustomerCreditDebt from "../models/CustomerCreditDebt.js";

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const VALID_PAYMENT_METHODS = [
  "CASH",
  "MOBILE_MONEY",
  "CARD",
  "BANK",
  "CREDIT",
];

const LOYALTY_POINT_VALUE = 10;

const VALID_PAYMENT_STATUSES = [
  "PAID",
  "PENDING",
  "REFUNDED",
];

const VALID_SALE_STATUSES = [
  "COMPLETED",
  "CANCELLED",
  "PARTIALLY_REFUNDED",
  "REFUNDED",
];

const getLocalDayStart = (dateValue, timeZone) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ""));
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const localAsUtc = Date.UTC(year, month - 1, day);
  const check = new Date(localAsUtc);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;

  let candidate = localAsUtc;
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const wholeSecond = Math.floor(candidate / 1000) * 1000;
    const parts = Object.fromEntries(formatter.formatToParts(new Date(wholeSecond)).map(({ type, value }) => [type, value]));
    const representedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
    const offset = representedAsUtc - wholeSecond;
    const adjusted = localAsUtc - offset;
    if (adjusted === candidate) break;
    candidate = adjusted;
  }
  return new Date(candidate);
};

const getLocalDayEnd = (dateValue, timeZone) => {
  const start = getLocalDayStart(dateValue, timeZone);
  if (!start) return null;
  const nextDate = new Date(`${dateValue}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const nextDay = getLocalDayStart(nextDate.toISOString().slice(0, 10), timeZone);
  return nextDay ? new Date(nextDay.getTime() - 1) : null;
};

const serializeSaleItems = (items, canViewCosts) => (items || []).map((item) => {
  const safeItem = typeof item?.toObject === "function" ? item.toObject() : { ...item };
  if (!canViewCosts) delete safeItem.buyingPrice;
  return safeItem;
});

const restoreBatchDeductions = async (deductions = []) => {
  for (const deduction of deductions) {
    await InventoryBatch.updateOne(
      { _id: deduction.batchId },
      { $inc: { remainingQuantity: deduction.quantity }, $set: { status: "ACTIVE" } }
    );
  }
};

const consumeBatches = async ({ businessId, branchId, item, stockBefore }) => {
  const batches = await InventoryBatch.find({
    businessId,
    branchId,
    productId: item.product._id,
    status: { $ne: "CANCELLED" },
    remainingQuantity: { $gt: 0 },
  }).lean();
  if (!batches.length) return [];

  const totalBatchedStock = batches.reduce((sum, batch) => sum + Number(batch.remainingQuantity || 0), 0);
  const legacyAvailable = Math.max(0, Number(stockBefore || 0) - totalBatchedStock);
  const now = new Date();
  const availableBatches = batches
    .filter((batch) => !batch.expiryDate || new Date(batch.expiryDate) > now)
    .sort((first, second) => item.product.stockRotation === "LIFO"
      ? new Date(second.receivedAt) - new Date(first.receivedAt)
      : new Date(first.receivedAt) - new Date(second.receivedAt));
  const batchedAvailable = availableBatches.reduce((sum, batch) => sum + Number(batch.remainingQuantity || 0), 0);
  if (batchedAvailable + legacyAvailable < Number(item.quantity)) {
    throw new Error(`Only ${batchedAvailable + legacyAvailable} non-expired unit(s) of ${item.product.name} are available.`);
  }

  let remaining = Math.max(0, Number(item.quantity) - legacyAvailable);
  const deductions = [];
  try {
    for (const batch of availableBatches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, Number(batch.remainingQuantity || 0));
      const updated = await InventoryBatch.findOneAndUpdate(
        { _id: batch._id, remainingQuantity: { $gte: take }, status: { $ne: "CANCELLED" } },
        { $inc: { remainingQuantity: -take } },
        { new: true }
      );
      if (!updated) throw new Error("A batch quantity changed during checkout. Refresh the cart and try again.");
      if (updated.remainingQuantity === 0) {
        updated.status = "DEPLETED";
        await updated.save();
      }
      deductions.push({ batchId: batch._id, quantity: take });
      remaining -= take;
    }
    return deductions;
  } catch (error) {
    await restoreBatchDeductions(deductions);
    throw error;
  }
};

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const getId = (value) => {
  if (!value) return null;

  if (typeof value === "object") {
    return value._id || value.id || null;
  }

  return value;
};

const normalizeId = (value) => {
  const id = getId(value);
  return id ? String(id) : null;
};

/*
|--------------------------------------------------------------------------
| GENERATE RECEIPT NUMBER
|--------------------------------------------------------------------------
*/

const generateReceiptNumber = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  const random = Math.floor(
    100000 + Math.random() * 900000
  );

  return `MOVA-${year}${month}${day}-${random}`;
};

/*
|--------------------------------------------------------------------------
| RESOLVE ACTIVE BRANCH
|--------------------------------------------------------------------------
|
| Branch selection priority:
|
| 1. Explicit branch ID sent by the request.
| 2. Authenticated user's activeBranchId.
| 3. Authenticated user's branchId.
|
| Security:
| - The branch must belong to the user's business.
| - The branch must be active.
| - OWNER and ADMIN can access any branch in their business.
| - Other users must be assigned to the requested branch.
|--------------------------------------------------------------------------
*/

const resolveActiveBranch = async (
  req,
  requestedBranchId = null
) => {
  const businessId = getId(
    req.user?.businessId
  );

  if (!businessId) {
    return null;
  }

  const role = String(
    req.user?.role || ""
  ).trim().toUpperCase();

  const isOwnerOrAdmin =
    role === "OWNER" ||
    role === "ADMIN";

  const activeBranchId =
    requestedBranchId ||
    req.user?.activeBranchId ||
    req.user?.branchId ||
    null;

  const normalizedBranchId =
    normalizeId(activeBranchId);

  if (
    !normalizedBranchId ||
    !mongoose.Types.ObjectId.isValid(
      normalizedBranchId
    )
  ) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | CHECK BRANCH PERMISSIONS
  |--------------------------------------------------------------------------
  */

  if (!isOwnerOrAdmin) {
    const assignedBranchIds = [
      ...(Array.isArray(req.user?.branchIds)
        ? req.user.branchIds.map(normalizeId)
        : []),

      normalizeId(req.user?.branchId),
      normalizeId(req.user?.activeBranchId),
    ].filter(Boolean);

    if (
      !assignedBranchIds.includes(
        normalizedBranchId
      )
    ) {
      return null;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | VERIFY BUSINESS OWNERSHIP AND ACTIVE STATUS
  |--------------------------------------------------------------------------
  */

  const branch = await Branch.findOne({
    _id: normalizedBranchId,
    businessId,
    isActive: true,
  });

  return branch || null;
};

/*
|--------------------------------------------------------------------------
| CREATE SALE
|--------------------------------------------------------------------------
*/

export const createSale = async (
  req,
  res
) => {
  try {
    const {
      items,
      discount = 0,
      paymentMethod,
      paymentTransactionId = null,
      paymentReference = "",
      customerId = null,
      notes = "",
      clientSaleId = "",
      offlineQueued = false,
      expectedTotal,
      loyaltyPointsRedeemed = 0,
      branchId: requestedBranchId = null,
      activeBranchId: requestedActiveBranchId = null,
    } = req.body;

    const businessId = getId(
      req.user?.businessId
    );

    const cashierId = getId(
      req.user?._id
    );

    if (!businessId || !cashierId) {
      return res.status(401).json({
        success: false,
        message:
          "Your login session is invalid. Please sign in again.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | RESOLVE BRANCH
    |--------------------------------------------------------------------------
    */

    const branch = await resolveActiveBranch(
      req,
      requestedActiveBranchId ||
        requestedBranchId
    );

    if (!branch) {
      return res.status(400).json({
        success: false,
        message:
          "No valid active branch is selected, or you do not have access to the selected branch. Please select an assigned branch and try again.",
      });
    }

    const branchId = branch._id;
    const normalizedClientSaleId = String(clientSaleId || "").trim().slice(0, 100);

    if (normalizedClientSaleId) {
      const existingQueuedSale = await Sale.findOne({
        businessId,
        branchId,
        cashierId,
        offlineClientSaleId: normalizedClientSaleId,
      }).lean();
      if (existingQueuedSale) {
        const safeExistingSale = {
          ...existingQueuedSale,
          id: existingQueuedSale._id,
          items: serializeSaleItems(existingQueuedSale.items, hasPermission(req.user?.role, "products.view")),
        };
        return res.status(200).json({
          success: true,
          message: "This sale was already synchronized.",
          sale: safeExistingSale,
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | BASIC VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A sale must contain at least one product.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT METHOD VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      !VALID_PAYMENT_METHODS.includes(
        paymentMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    const normalizedPaymentReference =
      typeof paymentReference === "string"
        ? paymentReference.trim()
        : "";

    /*
    |--------------------------------------------------------------------------
    | CARD PAYMENT TRANSACTION
    |--------------------------------------------------------------------------
    |
    | CARD can be linked to an approved PaymentTransaction when a terminal
    | integration is used. Payment references are optional for every method.
    |--------------------------------------------------------------------------
    */

    let paymentTransaction = null;

    if (paymentMethod === "CARD" && paymentTransactionId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          paymentTransactionId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid card payment transaction ID.",
        });
      }

      paymentTransaction =
        await PaymentTransaction.findOne({
          _id: paymentTransactionId,
          businessId,
          branchId,
          cashierId,
        });

      if (!paymentTransaction) {
        return res.status(404).json({
          success: false,
          message:
            "Card payment transaction was not found for this cashier and branch.",
        });
      }

      if (
        paymentTransaction.method !== "CARD"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The payment transaction is not a card transaction.",
        });
      }

      if (
        paymentTransaction.status !== "APPROVED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Card payment has not been approved. Current status: ${paymentTransaction.status}.`,
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | DISCOUNT VALIDATION
    |--------------------------------------------------------------------------
    */

    const numericDiscount = Number(discount);

    if (
      !Number.isFinite(numericDiscount) ||
      numericDiscount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount must be a valid non-negative number.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER VALIDATION
    |--------------------------------------------------------------------------
    */

    let customer = null;

    if (customerId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          customerId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID.",
        });
      }

      customer = await Customer.findOne({
        _id: customerId,
        businessId,
        isActive: true,
      });

      if (!customer) {
        return res.status(404).json({
          success: false,
          message:
            "Customer not found or inactive.",
        });
      }
    }

    if (paymentMethod === "CREDIT" && !customer) {
      return res.status(400).json({ success: false, message: "Select a customer before adding this sale to their store credit." });
    }

    /*
    |--------------------------------------------------------------------------
    | NORMALIZE CART AND CHECK STOCK
    |--------------------------------------------------------------------------
    */

    const normalizedItems = [];
    let subtotal = 0;

    for (const item of items) {
      if (
        !item.productId ||
        !mongoose.Types.ObjectId.isValid(
          item.productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "One or more products have an invalid ID.",
        });
      }

      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Product quantity must be a positive whole number.",
        });
      }

      const product = await Product.findOne({
        _id: item.productId,
        businessId,
        isActive: true,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "One or more products could not be found.",
        });
      }

      let branchStock =
        await ProductBranchStock.findOne({
          businessId,
          branchId,
          productId: product._id,
          isActive: true,
        });

      /*
      |--------------------------------------------------------------------------
      | LEGACY STOCK MIGRATION FALLBACK
      |--------------------------------------------------------------------------
      */

      if (!branchStock) {
        const activeBranchCount =
          await Branch.countDocuments({
            businessId,
            isActive: true,
          });

        branchStock =
          await ProductBranchStock.create({
            businessId,
            branchId,
            productId: product._id,

            stockQuantity:
              activeBranchCount === 1
                ? Number(product.stockQuantity || 0)
                : 0,

            minimumStock: Number(
              product.minimumStock || 0
            ),

            isActive: true,
          });
      }

      /*
      |--------------------------------------------------------------------------
      | STOCK CHECK
      |--------------------------------------------------------------------------
      */

      if (
        product.trackStock &&
        Number(branchStock.stockQuantity) <
          quantity
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock for ${product.name} at ${branch.name}. Available: ${branchStock.stockQuantity}.`,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | SERVER-SIDE SELLING PRICE
      |--------------------------------------------------------------------------
      */

      const unitPrice = Number(
        product.sellingPrice
      );

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid selling price for ${product.name}.`,
        });
      }

      const itemSubtotal = unitPrice * quantity;

      subtotal += itemSubtotal;

      normalizedItems.push({
        product,
        branchStock,
        productId: product._id,
        name: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        buyingPrice: product.buyingPrice,
        subtotal: itemSubtotal,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | DISCOUNT CHECK
    |--------------------------------------------------------------------------
    */

    if (numericDiscount > subtotal) {
      return res.status(400).json({
        success: false,
        message:
          "Discount cannot be greater than the sale subtotal.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CALCULATE TOTAL
    |--------------------------------------------------------------------------
    */

    const pointsToRedeem = Number(loyaltyPointsRedeemed);
    if (!Number.isInteger(pointsToRedeem) || pointsToRedeem < 0) {
      return res.status(400).json({ success: false, message: "Loyalty points to redeem must be a whole number." });
    }
    if (pointsToRedeem > Number(customer?.loyaltyPoints || 0)) {
      return res.status(400).json({ success: false, message: "The customer does not have enough loyalty points." });
    }
    const loyaltyDiscount = pointsToRedeem * LOYALTY_POINT_VALUE;
    if (loyaltyDiscount > subtotal - numericDiscount) {
      return res.status(400).json({ success: false, message: "Loyalty rewards cannot be greater than the remaining sale total." });
    }
    const total = subtotal - numericDiscount - loyaltyDiscount;
    if (paymentMethod === "CREDIT" && Number(customer.creditLimit || 0) <= 0) {
      return res.status(400).json({ success: false, message: "Set a credit limit for this customer before using store credit." });
    }
    if (paymentMethod === "CREDIT" && Number(customer.outstandingBalance || 0) + total > Number(customer.creditLimit || 0)) {
      return res.status(400).json({ success: false, message: "This sale would exceed the customer’s available credit limit." });
    }
    if (paymentMethod === "CREDIT" && total <= 0) {
      return res.status(400).json({ success: false, message: "A zero-balance sale cannot be added to store credit." });
    }
    if (offlineQueued && Number.isFinite(Number(expectedTotal)) && Math.abs(total - Number(expectedTotal)) > 0.01) {
      return res.status(409).json({
        success: false,
        message: "A product price changed while this device was offline. Review the sale total before syncing it.",
        expectedTotal: Number(expectedTotal),
        currentTotal: total,
      });
    }
    const loyaltyPointsEarned = customer
      ? Math.floor(total / 1000)
      : 0;

    /*
    |--------------------------------------------------------------------------
    | VERIFY CARD PAYMENT AMOUNT AND REUSE
    |--------------------------------------------------------------------------
    */

    if (paymentTransaction) {
      if (
        Number(paymentTransaction.amount) !==
        Number(total)
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Card payment amount (${paymentTransaction.amount}) does not match the sale total (${total}).`,
        });
      }

      if (paymentTransaction.saleId) {
        return res.status(400).json({
          success: false,
          message:
            "This card payment transaction is already associated with another sale.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | PREPARE SALE ITEMS
    |--------------------------------------------------------------------------
    */

    const saleItems = normalizedItems.map(
      (item) => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        buyingPrice: item.buyingPrice,
        subtotal: item.subtotal,
      })
    );

    const receiptNumber = generateReceiptNumber();

    /*
    |--------------------------------------------------------------------------
    | UPDATE BRANCH STOCK
    |--------------------------------------------------------------------------
    */

    const inventoryEntries = [];
    const stockDeductions = [];
    const batchDeductions = [];

    for (const item of normalizedItems) {
      const product = item.product;

      if (!product.trackStock) {
        continue;
      }

      const stockBefore = Number(
        item.branchStock.stockQuantity
      );

      let usedBatches = [];
      try {
        usedBatches = await consumeBatches({ businessId, branchId, item, stockBefore });
        item.batchConsumptions = usedBatches;
        batchDeductions.push(...usedBatches);
      } catch (batchError) {
        for (const deduction of stockDeductions) {
          await ProductBranchStock.updateOne({ _id: deduction.stockId, businessId, branchId }, { $inc: { stockQuantity: deduction.quantity } });
        }
        await restoreBatchDeductions(batchDeductions);
        return res.status(409).json({ success: false, message: batchError.message || "Unable to allocate inventory batches." });
      }

      const updatedBranchStock =
        await ProductBranchStock.findOneAndUpdate(
          {
            _id: item.branchStock._id,
            businessId,
            branchId,
            productId: product._id,
            isActive: true,
            stockQuantity: {
              $gte: item.quantity,
            },
          },
          {
            $inc: {
              stockQuantity: -item.quantity,
            },
          },
          {
            new: true,
          }
        );

      if (!updatedBranchStock) {
        /*
         * Restore any earlier stock deductions from this request.
         */
        for (const deduction of stockDeductions) {
          await ProductBranchStock.updateOne(
            { _id: deduction.stockId, businessId, branchId },
            { $inc: { stockQuantity: deduction.quantity } }
          );
        }
        await restoreBatchDeductions(batchDeductions);

        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock for ${product.name} at ${branch.name}. The stock may have changed because another sale was completed.`,
        });
      }

      stockDeductions.push({ stockId: item.branchStock._id, quantity: item.quantity });

      inventoryEntries.push({
        businessId,
        branchId,
        productId: product._id,
        userId: cashierId,
        type: "SALE",
        quantity: item.quantity,
        stockBefore,
        stockAfter: updatedBranchStock.stockQuantity,
        reason: "Product sold",
        referenceType: "SALE",
        notes:
          `Sale of ${item.quantity} ${product.unit}(s) at ${branch.name}.`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE SALE
    |--------------------------------------------------------------------------
    */

    let sale;

    try {
      sale = await Sale.create({
        businessId,
        branchId,
        cashierId,

        customerId: customer
          ? customer._id
          : null,

        receiptNumber,
        offlineClientSaleId: normalizedClientSaleId || undefined,
        items: saleItems,
        subtotal,
        discount: numericDiscount,
        total,
        loyaltyPointsEarned,
        loyaltyPointsRedeemed: pointsToRedeem,
        paymentMethod,
        paymentStatus: paymentMethod === "CREDIT" ? "PENDING" : "PAID",
        status: "COMPLETED",

        notes:
          typeof notes === "string"
            ? notes.trim()
            : "",
      });
    } catch (saleError) {
      for (const item of normalizedItems) {
        if (!item.product.trackStock) {
          continue;
        }

        await ProductBranchStock.updateOne(
          {
            _id: item.branchStock._id,
            businessId,
            branchId,
            productId: item.product._id,
          },
          {
            $inc: {
              stockQuantity: item.quantity,
            },
          }
        );
      }
      await restoreBatchDeductions(batchDeductions);

      if (saleError?.code === 11000 && normalizedClientSaleId) {
        const alreadyCreated = await Sale.findOne({
          businessId,
          branchId,
          cashierId,
          offlineClientSaleId: normalizedClientSaleId,
        }).lean();
        if (alreadyCreated) {
          return res.status(200).json({
            success: true,
            message: "This sale was already synchronized.",
            sale: {
              ...alreadyCreated,
              id: alreadyCreated._id,
              items: serializeSaleItems(alreadyCreated.items, hasPermission(req.user?.role, "products.view")),
            },
          });
        }
      }

      throw saleError;
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE INVENTORY LEDGER
    |--------------------------------------------------------------------------
    */

    try {
      for (const entry of inventoryEntries) {
        await InventoryTransaction.create({
          ...entry,
          referenceId: sale._id,
        });
      }
    } catch (inventoryError) {
      await Sale.deleteOne({
        _id: sale._id,
        businessId,
      });

      await InventoryTransaction.deleteMany({
        referenceId: sale._id,
        businessId,
        branchId,
      });

      for (const item of normalizedItems) {
        if (!item.product.trackStock) {
          continue;
        }

        await ProductBranchStock.updateOne(
          {
            _id: item.branchStock._id,
            businessId,
            branchId,
            productId: item.product._id,
          },
          {
            $inc: {
              stockQuantity: item.quantity,
            },
          }
        );
      }
      await restoreBatchDeductions(batchDeductions);

      throw inventoryError;
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE PAYMENT
    |--------------------------------------------------------------------------
    |
    | Every payment method creates a completed Payment record.
    | Only CARD is linked to a PaymentTransaction.
    |--------------------------------------------------------------------------
    */

    let payment;

    try {
      if (paymentMethod !== "CREDIT" && total > 0) payment = await Payment.create({
        businessId,
        branchId,
        saleId: sale._id,

        customerId: customer
          ? customer._id
          : null,

        receivedBy: cashierId,
        amount: total,
        paymentMethod,

        reference: paymentTransaction
          ? paymentTransaction.transactionReference ||
            paymentTransaction.providerReference ||
            normalizedPaymentReference
          : normalizedPaymentReference,

        notes: `Payment for receipt ${receiptNumber}`,
        status: "COMPLETED",
        paymentDate: new Date(),
      });
    } catch (paymentError) {
      await Payment.deleteMany({
        saleId: sale._id,
        businessId,
      });

      await InventoryTransaction.deleteMany({
        referenceId: sale._id,
        businessId,
        branchId,
      });

      await Sale.deleteOne({
        _id: sale._id,
        businessId,
      });

      for (const item of normalizedItems) {
        if (!item.product.trackStock) {
          continue;
        }

        await ProductBranchStock.updateOne(
          {
            _id: item.branchStock._id,
            businessId,
            branchId,
            productId: item.product._id,
          },
          {
            $inc: {
              stockQuantity: item.quantity,
            },
          }
        );
      }
      await restoreBatchDeductions(batchDeductions);

      throw paymentError;
    }

    if (paymentMethod === "CREDIT") {
      try {
        await CustomerCreditDebt.create({
          businessId,
          branchId,
          customerId: customer._id,
          saleId: sale._id,
          originalAmount: total,
          remainingBalance: total,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          openedBy: cashierId,
          notes: "Customer store credit from POS sale.",
        });
      } catch (creditError) {
        await Payment.deleteMany({ saleId: sale._id, businessId });
        await InventoryTransaction.deleteMany({ referenceId: sale._id, businessId, branchId });
        await Sale.deleteOne({ _id: sale._id, businessId });
        for (const item of normalizedItems) {
          if (item.product.trackStock) await ProductBranchStock.updateOne({ _id: item.branchStock._id, businessId, branchId }, { $inc: { stockQuantity: item.quantity } });
        }
        await restoreBatchDeductions(batchDeductions);
        throw creditError;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | LINK CARD TRANSACTION TO SALE
    |--------------------------------------------------------------------------
    */

    if (paymentTransaction) {
      const linkedTransaction =
        await PaymentTransaction.updateOne(
          {
            _id: paymentTransaction._id,
            businessId,
            branchId,
            cashierId,
            status: "APPROVED",
            saleId: null,
          },
          {
            $set: {
              saleId: sale._id,
              verifiedAt:
                paymentTransaction.verifiedAt ||
                new Date(),
            },
          }
        );

      if (linkedTransaction.modifiedCount !== 1) {
        /*
         * Do not silently report success if the card transaction
         * could not be linked to this sale.
         */
        await Payment.deleteMany({
          saleId: sale._id,
          businessId,
        });

        await InventoryTransaction.deleteMany({
          referenceId: sale._id,
          businessId,
          branchId,
        });

        await Sale.deleteOne({
          _id: sale._id,
          businessId,
        });

        for (const item of normalizedItems) {
          if (!item.product.trackStock) {
            continue;
          }

          await ProductBranchStock.updateOne(
            {
              _id: item.branchStock._id,
              businessId,
              branchId,
              productId: item.product._id,
            },
            {
              $inc: {
                stockQuantity: item.quantity,
              },
            }
          );
        }
        await restoreBatchDeductions(batchDeductions);

        return res.status(409).json({
          success: false,
          message:
            "The card payment transaction has already been used or changed. Please verify the payment status before trying again.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | UPDATE CUSTOMER STATISTICS
    |--------------------------------------------------------------------------
    */

    if (customer) {
      await Customer.updateOne(
        {
          _id: customer._id,
          businessId,
        },
        {
          $inc: {
            totalOrders: 1,
            totalSpent: total,
            loyaltyPoints: loyaltyPointsEarned - pointsToRedeem,
            lifetimeLoyaltyPoints: loyaltyPointsEarned,
            ...(paymentMethod === "CREDIT" ? { outstandingBalance: total } : {}),
          },
        }
      );
    }

    const allowedPosEvents = new Set(["CART_ITEM_REMOVED", "CART_CLEARED", "DISCOUNT_APPLIED", "DISCOUNT_CHANGED"]);
    const queuedAuditLogs = (Array.isArray(req.body.auditEvents) ? req.body.auditEvents : [])
      .filter((event) => allowedPosEvents.has(String(event?.action || "")))
      .slice(0, 100)
      .map((event) => {
        const metadata = {};
        for (const key of ["productId", "productName", "quantity", "discountAmount", "itemCount"]) {
          if (event?.metadata?.[key] !== undefined) metadata[key] = typeof event.metadata[key] === "string" ? event.metadata[key].slice(0, 120) : Number(event.metadata[key]);
        }
        return {
          businessId,
          branchId,
          actorId: cashierId,
          actorName: req.user.name || "",
          actorRole: String(req.user.role || "").toUpperCase(),
          action: event.action,
          entity: "POS_ACTIVITY",
          entityId: sale._id,
          description: String(event.description || event.action).slice(0, 500),
          severity: ["CART_CLEARED", "DISCOUNT_APPLIED"].includes(event.action) ? "WARNING" : "INFO",
          metadata,
          ipAddress: req.ip || "",
          userAgent: String(req.get("user-agent") || "").slice(0, 500),
        };
      });
    queuedAuditLogs.push({
      businessId,
      branchId,
      actorId: cashierId,
      actorName: req.user.name || "",
      actorRole: String(req.user.role || "").toUpperCase(),
      action: offlineQueued ? "OFFLINE_SALE_SYNCED" : "SALE_COMPLETED",
      entity: "SALE",
      entityId: sale._id,
      description: `${offlineQueued ? "Offline sale synchronized" : "Sale completed"}: ${sale.receiptNumber}.`,
      severity: "INFO",
      metadata: { receiptNumber: sale.receiptNumber, total: sale.total, paymentMethod: sale.paymentMethod },
      ipAddress: req.ip || "",
      userAgent: String(req.get("user-agent") || "").slice(0, 500),
    });
    await AuditLog.insertMany(queuedAuditLogs, { ordered: false }).catch((auditError) => {
      console.error("Unable to write sale audit trail:", auditError);
    });

    /*
    |--------------------------------------------------------------------------
    | SUCCESS RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,
      message: "Sale completed successfully.",

      sale: {
        id: sale._id,
        receiptNumber: sale.receiptNumber,
        businessId: sale.businessId,
        branchId: sale.branchId,
        customerId: sale.customerId,
        items: serializeSaleItems(
          sale.items,
          hasPermission(req.user?.role, "products.view")
        ),
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
        loyaltyPointsEarned: sale.loyaltyPointsEarned || 0,
        loyaltyPointsRedeemed: sale.loyaltyPointsRedeemed || 0,
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus,
        status: sale.status,
        createdAt: sale.createdAt,
      },

      payment: payment ? {
        id: payment._id,
        saleId: payment.saleId,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        reference: payment.reference,
        paymentDate: payment.paymentDate,
      } : null,

      paymentTransaction: paymentTransaction
        ? {
            id: paymentTransaction._id,
            transactionReference:
              paymentTransaction.transactionReference,
            provider: paymentTransaction.provider,
            status: paymentTransaction.status,
          }
        : null,

      branch: {
        id: branch._id,
        name: branch.name,
        code: branch.code,
      },
    });
  } catch (error) {
    console.error("Create sale error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to complete sale.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SALES
|--------------------------------------------------------------------------
*/

export const getSales = async (req, res) => {
  try {
    const {
      search = "",
      paymentMethod,
      paymentStatus,
      status,
      cashierId,
      customerId,
      page = 1,
      limit = 20,
      startDate,
      endDate,
      branchId: requestedBranchId,
    } = req.query;

    const businessId = getId(
      req.user?.businessId
    );

    const branch = await resolveActiveBranch(
      req,
      requestedBranchId
    );

    if (!branch) {
      return res.status(400).json({
        success: false,
        message:
          "No valid active branch is selected.",
      });
    }

    const branchId = branch._id;

    const filter = {
      businessId,
      branchId,
    };

    if (String(req.user?.role || "").toUpperCase() === "CASHIER") {
      filter.cashierId = req.user._id;
    }

    if (
      typeof search === "string" &&
      search.trim()
    ) {
      filter.receiptNumber = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    if (paymentMethod) {
      if (
        !VALID_PAYMENT_METHODS.includes(
          paymentMethod
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment method.",
        });
      }

      filter.paymentMethod = paymentMethod;
    }

    if (paymentStatus) {
      if (
        !VALID_PAYMENT_STATUSES.includes(
          paymentStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status.",
        });
      }

      filter.paymentStatus = paymentStatus;
    }

    if (status) {
      if (
        !VALID_SALE_STATUSES.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid sale status.",
        });
      }

      filter.status = status;
    }

    if (cashierId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          cashierId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid cashier ID.",
        });
      }

      filter.cashierId = cashierId;
    }

    if (customerId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          customerId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid customer ID.",
        });
      }

      filter.customerId = customerId;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      const business = await Business.findById(businessId).select("timezone").lean();
      const timeZone = business?.timezone || "Africa/Kampala";

      if (startDate) {
        const start = getLocalDayStart(startDate, timeZone);
        if (!start) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date.",
          });
        }

        filter.createdAt.$gte = start;
      }

      if (endDate) {
        const end = getLocalDayEnd(endDate, timeZone);
        if (!end) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date.",
          });
        }

        filter.createdAt.$lte = end;
      }
    }

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);

    const pageNumber = Number.isFinite(parsedPage)
      ? Math.max(parsedPage, 1)
      : 1;

    const limitNumber = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 20;

    const skip = (pageNumber - 1) * limitNumber;

    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .populate("cashierId", "name email role")
        .populate("customerId", "name phone email")
        .populate("branchId", "name code phone address")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      Sale.countDocuments(filter),
    ]);

    const safeSales = hasPermission(req.user?.role, "products.view")
      ? sales
      : sales.map((sale) => ({
          ...sale.toObject(),
          items: serializeSaleItems(sale.items, false),
        }));

    return res.json({
      success: true,
      sales: safeSales,

      branch: {
        id: branch._id,
        name: branch.name,
        code: branch.code,
      },

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get sales error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SALE BY ID
|--------------------------------------------------------------------------
*/

export const getSaleById = async (req, res) => {
  try {
    const { id } = req.params;
    const { branchId: requestedBranchId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale ID.",
      });
    }

    const branch = await resolveActiveBranch(
      req,
      requestedBranchId
    );

    if (!branch) {
      return res.status(400).json({
        success: false,
        message:
          "No valid active branch is selected.",
      });
    }

    const businessId = getId(
      req.user?.businessId
    );

    const saleFilter = {
      _id: id,
      businessId,
      branchId: branch._id,
    };

    if (String(req.user?.role || "").toUpperCase() === "CASHIER") {
      saleFilter.cashierId = req.user._id;
    }

    const sale = await Sale.findOne(saleFilter)
      .populate("cashierId", "name email role")
      .populate(
        "customerId",
        "name phone email address"
      )
      .populate(
        "branchId",
        "name code phone address"
      );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message:
          "Sale not found in the selected branch.",
      });
    }

    const payments = await Payment.find({
      businessId,
      branchId: branch._id,
      saleId: sale._id,
    })
      .populate("receivedBy", "name email role")
      .sort({ paymentDate: -1 });

    const completedPayments = payments.filter(
      (payment) => payment.status === "COMPLETED"
    );

    const totalPaid = completedPayments.reduce(
      (sum, payment) =>
        sum + Number(payment.amount),
      0
    );

    const balance = Math.max(
      sale.total - totalPaid,
      0
    );

    const calculatedPaymentStatus =
      balance === 0 ? "PAID" : "PENDING";

    const saleResponse = sale.toObject();
    saleResponse.items = serializeSaleItems(
      saleResponse.items,
      hasPermission(req.user?.role, "products.view")
    );

    return res.json({
      success: true,
      sale: saleResponse,
      payments,

      branch: {
        id: branch._id,
        name: branch.name,
        code: branch.code,
      },

      paymentSummary: {
        saleTotal: sale.total,
        totalPaid,
        balance,
        paymentStatus: calculatedPaymentStatus,
      },
    });
  } catch (error) {
    console.error("Get sale error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch sale.",
    });
  }
};
