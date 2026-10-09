import mongoose from "mongoose";

import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import ProductBranchStock from "../models/ProductBranchStock.js";
import Customer from "../models/Customer.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Payment from "../models/Payment.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import Branch from "../models/Branch.js";
import { hasPermission } from "../config/permissions.js";

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
];

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

const serializeSaleItems = (items, canViewCosts) => (items || []).map((item) => {
  const safeItem = typeof item?.toObject === "function" ? item.toObject() : { ...item };
  if (!canViewCosts) delete safeItem.buyingPrice;
  return safeItem;
});

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

    const total = subtotal - numericDiscount;
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

    for (const item of normalizedItems) {
      const product = item.product;

      if (!product.trackStock) {
        continue;
      }

      const stockBefore = Number(
        item.branchStock.stockQuantity
      );

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
        for (const previous of normalizedItems) {
          if (
            previous.product.trackStock &&
            previous.product._id.toString() !==
              product._id.toString()
          ) {
            await ProductBranchStock.updateOne(
              {
                _id: previous.branchStock._id,
                businessId,
                branchId,
                productId: previous.product._id,
              },
              {
                $inc: {
                  stockQuantity: previous.quantity,
                },
              }
            );
          }
        }

        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock for ${product.name} at ${branch.name}. The stock may have changed because another sale was completed.`,
        });
      }

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
        items: saleItems,
        subtotal,
        discount: numericDiscount,
        total,
        loyaltyPointsEarned,
        paymentMethod,
        paymentStatus: "PAID",
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
      payment = await Payment.create({
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

      throw paymentError;
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
            loyaltyPoints: loyaltyPointsEarned,
            lifetimeLoyaltyPoints: loyaltyPointsEarned,
          },
        }
      );
    }

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
        paymentMethod: sale.paymentMethod,
        paymentStatus: sale.paymentStatus,
        status: sale.status,
        createdAt: sale.createdAt,
      },

      payment: {
        id: payment._id,
        saleId: payment.saleId,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        status: payment.status,
        reference: payment.reference,
        paymentDate: payment.paymentDate,
      },

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

      if (startDate) {
        const start = new Date(
          `${startDate}T00:00:00`
        );

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date.",
          });
        }

        filter.createdAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(
          `${endDate}T23:59:59.999`
        );

        if (Number.isNaN(end.getTime())) {
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
