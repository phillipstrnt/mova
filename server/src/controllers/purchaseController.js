import mongoose from "mongoose";

import Purchase from "../models/Purchase.js";
import Supplier from "../models/Supplier.js";
import Product from "../models/Product.js";
import ProductBranchStock from "../models/ProductBranchStock.js";
import Branch from "../models/Branch.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import InventoryBatch from "../models/InventoryBatch.js";

// ============================================================
// HELPER: GENERATE PURCHASE NUMBER
// ============================================================

const generatePurchaseNumber = () => {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  const hours = String(
    now.getHours()
  ).padStart(2, "0");

  const minutes = String(
    now.getMinutes()
  ).padStart(2, "0");

  const seconds = String(
    now.getSeconds()
  ).padStart(2, "0");

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `PUR-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
};

// ============================================================
// HELPER: RESOLVE ACTIVE BRANCH
// ============================================================

const resolvePurchaseBranch = async (req) => {
  const businessId = req.user?.businessId;

  if (!businessId) {
    const error = new Error(
      "Business information is missing from your account."
    );

    error.status = 400;

    throw error;
  }

  // ----------------------------------------------------------
  // FIRST: CHECK ACTIVE BRANCH
  // ----------------------------------------------------------

  const requestedBranchId =
    req.body?.branchId ||
    req.query?.branchId ||
    req.user?.activeBranchId ||
    req.user?.branchId;

  // ----------------------------------------------------------
  // IF A BRANCH WAS PROVIDED, VALIDATE IT
  // ----------------------------------------------------------

  if (requestedBranchId) {
    if (
      !mongoose.Types.ObjectId.isValid(
        requestedBranchId
      )
    ) {
      const error = new Error(
        "Invalid branch ID."
      );

      error.status = 400;

      throw error;
    }

    const branch =
      await Branch.findOne({
        _id: requestedBranchId,
        businessId,
        isActive: true,
      });

    if (!branch) {
      const error = new Error(
        "Selected branch was not found or is inactive."
      );

      error.status = 404;

      throw error;
    }

    // --------------------------------------------------------
    // CHECK USER BRANCH ACCESS
    // --------------------------------------------------------

    const isOwnerOrAdmin =
      ["OWNER", "ADMIN"].includes(
        req.user.role
      );

    const authorizedBranches = (
      req.user.branchIds || []
    ).map((id) => String(id));

    const hasAccess =
      isOwnerOrAdmin ||
      authorizedBranches.includes(
        String(branch._id)
      );

    // --------------------------------------------------------
    // LEGACY FALLBACK
    // --------------------------------------------------------
    //
    // Existing demo users may have branchId but
    // branchIds may not yet be populated.
    //
    // Allow their assigned branch.
    //

    const assignedBranch =
      req.user.branchId
        ? String(req.user.branchId) ===
          String(branch._id)
        : false;

    if (
      !hasAccess &&
      !assignedBranch
    ) {
      const error = new Error(
        "You do not have access to this branch."
      );

      error.status = 403;

      throw error;
    }

    return branch;
  }

  // ----------------------------------------------------------
  // NO BRANCH SELECTED
  // ----------------------------------------------------------
  //
  // Since your demo currently has one branch,
  // automatically use the only active branch.
  //

  const activeBranches =
    await Branch.find({
      businessId,
      isActive: true,
    }).sort({
      createdAt: 1,
    });

  if (activeBranches.length === 0) {
    const error = new Error(
      "No active branch exists for this business. Please complete branch setup."
    );

    error.status = 400;

    throw error;
  }

  if (activeBranches.length === 1) {
    return activeBranches[0];
  }

  // ----------------------------------------------------------
  // MULTIPLE BRANCHES BUT NO ACTIVE BRANCH SELECTED
  // ----------------------------------------------------------

  const error = new Error(
    "Please select a branch before creating a purchase."
  );

  error.status = 400;

  throw error;
};

// ============================================================
// HELPER: GET OR CREATE BRANCH STOCK
// ============================================================

const getOrCreateBranchStock = async ({
  businessId,
  branchId,
  product,
}) => {
  let stock =
    await ProductBranchStock.findOne({
      businessId,
      branchId,
      productId: product._id,
    });

  if (stock) {
    return stock;
  }

  // ----------------------------------------------------------
  // DETERMINE LEGACY STOCK
  // ----------------------------------------------------------
  //
  // Because the demo currently has one active branch,
  // existing Product.stockQuantity can safely be migrated
  // to the Main Branch.
  //

  const activeBranchCount =
    await Branch.countDocuments({
      businessId,
      isActive: true,
    });

  const legacyStock =
    activeBranchCount === 1
      ? Number(product.stockQuantity || 0)
      : 0;

  const legacyMinimumStock =
    activeBranchCount === 1
      ? Number(product.minimumStock || 0)
      : 0;

  try {
    stock =
      await ProductBranchStock.create({
        businessId,
        branchId,
        productId: product._id,
        stockQuantity:
          legacyStock,
        minimumStock:
          legacyMinimumStock,
        isActive: true,
      });

    return stock;
  } catch (error) {
    // --------------------------------------------------------
    // HANDLE RACE CONDITION
    // --------------------------------------------------------

    if (error.code === 11000) {
      const existingStock =
        await ProductBranchStock.findOne({
          businessId,
          branchId,
          productId: product._id,
        });

      if (existingStock) {
        return existingStock;
      }
    }

    throw error;
  }
};

// ============================================================
// GET ALL PURCHASES
// GET /api/purchases
// ============================================================

const getPurchases = async (req, res) => {
  try {
    const businessId =
      req.user?.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message:
          "Business information is missing from your account.",
      });
    }

    const {
      search = "",
      supplierId = "",
      status = "",
      paymentStatus = "",
      branchId = "",
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      businessId,
    };

    // --------------------------------------------------------
    // BRANCH FILTER
    // --------------------------------------------------------

    if (branchId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          branchId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid branch ID.",
        });
      }

      filter.branchId = branchId;
    } else {
      // Automatically use user's active branch
      // for normal branch users.

      const activeBranchId =
        req.user?.activeBranchId ||
        req.user?.branchId;

      if (activeBranchId) {
        filter.branchId =
          activeBranchId;
      }
    }

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (search.trim()) {
      const searchRegex =
        new RegExp(
          search.trim(),
          "i"
        );

      const matchingSuppliers =
        await Supplier.find({
          businessId,
          $or: [
            {
              name: searchRegex,
            },
            {
              phone: searchRegex,
            },
            {
              email: searchRegex,
            },
          ],
        }).select("_id");

      const supplierIds =
        matchingSuppliers.map(
          (supplier) =>
            supplier._id
        );

      filter.$or = [
        {
          purchaseNumber:
            searchRegex,
        },
        {
          invoiceNumber:
            searchRegex,
        },
      ];

      if (supplierIds.length > 0) {
        filter.$or.push({
          supplierId: {
            $in: supplierIds,
          },
        });
      }
    }

    // --------------------------------------------------------
    // SUPPLIER FILTER
    // --------------------------------------------------------

    if (supplierId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          supplierId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid supplier ID.",
        });
      }

      filter.supplierId =
        supplierId;
    }

    // --------------------------------------------------------
    // STATUS FILTER
    // --------------------------------------------------------

    if (status) {
      filter.status = status;
    }

    // --------------------------------------------------------
    // PAYMENT STATUS FILTER
    // --------------------------------------------------------

    if (paymentStatus) {
      filter.paymentStatus =
        paymentStatus;
    }

    // --------------------------------------------------------
    // PAGINATION
    // --------------------------------------------------------

    const currentPage = Math.max(
      Number(page) || 1,
      1
    );

    const pageSize = Math.min(
      Math.max(
        Number(limit) || 20,
        1
      ),
      100
    );

    const skip =
      (currentPage - 1) *
      pageSize;

    const [
      purchases,
      total,
    ] = await Promise.all([
      Purchase.find(filter)
        .populate(
          "supplierId",
          "name contactPerson phone email"
        )
        .populate(
          "userId",
          "name email"
        )
        .populate(
          "branchId",
          "name code address"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(pageSize)
        .lean(),

      Purchase.countDocuments(
        filter
      ),
    ]);

    return res.status(200).json({
      success: true,
      purchases,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        pages: Math.ceil(
          total / pageSize
        ),
      },
    });
  } catch (error) {
    console.error(
      "Get purchases error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch purchases.",
    });
  }
};

// ============================================================
// GET SINGLE PURCHASE
// GET /api/purchases/:id
// ============================================================

const getPurchaseById = async (
  req,
  res
) => {
  try {
    const businessId =
      req.user?.businessId;

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid purchase ID.",
      });
    }

    const purchase =
      await Purchase.findOne({
        _id: req.params.id,
        businessId,
      })
        .populate(
          "supplierId",
          "name contactPerson phone email address taxNumber"
        )
        .populate(
          "userId",
          "name email"
        )
        .populate(
          "branchId",
          "name code address"
        )
        .lean();

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message:
          "Purchase not found.",
      });
    }

    return res.status(200).json({
      success: true,
      purchase,
    });
  } catch (error) {
    console.error(
      "Get purchase by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch purchase.",
    });
  }
};

// ============================================================
// CREATE PURCHASE
// POST /api/purchases
// ============================================================

const createPurchase = async (
  req,
  res
) => {
  const updatedBranchStocks = [];
  const createdInventoryTransactions = [];
  const createdInventoryBatches = [];

  try {
    const businessId =
      req.user?.businessId;

    const userId =
      req.user?._id;

    if (!businessId || !userId) {
      return res.status(400).json({
        success: false,
        message:
          "Business or user information is missing.",
      });
    }

    // --------------------------------------------------------
    // RESOLVE BRANCH
    // --------------------------------------------------------

    const branch =
      await resolvePurchaseBranch(
        req
      );

    const branchId =
      branch._id;

    const {
      supplierId,
      invoiceNumber = "",
      items,
      discount = 0,
      paymentMethod,
      paymentStatus = "PAID",
      notes = "",
    } = req.body;

    // --------------------------------------------------------
    // VALIDATE SUPPLIER
    // --------------------------------------------------------

    if (
      !supplierId ||
      !mongoose.Types.ObjectId.isValid(
        supplierId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid supplier is required.",
      });
    }

    const supplier =
      await Supplier.findOne({
        _id: supplierId,
        businessId,
        isActive: true,
      });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message:
          "Supplier not found or is inactive.",
      });
    }

    // --------------------------------------------------------
    // VALIDATE ITEMS
    // --------------------------------------------------------

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A purchase must contain at least one item.",
      });
    }

    // --------------------------------------------------------
    // VALIDATE PAYMENT METHOD
    // --------------------------------------------------------

    const allowedPaymentMethods = [
      "CASH",
      "MOBILE_MONEY",
      "CARD",
      "BANK",
      "CREDIT",
    ];

    if (
      !allowedPaymentMethods.includes(
        paymentMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment method.",
      });
    }

    // --------------------------------------------------------
    // VALIDATE PAYMENT STATUS
    // --------------------------------------------------------

    const allowedPaymentStatuses = [
      "PAID",
      "PENDING",
      "PARTIALLY_PAID",
    ];

    if (
      !allowedPaymentStatuses.includes(
        paymentStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment status.",
      });
    }

    // --------------------------------------------------------
    // VALIDATE DISCOUNT
    // --------------------------------------------------------

    const numericDiscount =
      Number(discount);

    if (
      Number.isNaN(
        numericDiscount
      ) ||
      numericDiscount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount must be a valid non-negative amount.",
      });
    }

    // --------------------------------------------------------
    // PREPARE ITEMS
    // --------------------------------------------------------

    const normalizedItems = [];

    for (
      const item of items
    ) {
      const {
        productId,
        quantity,
        buyingPrice,
        batchCode = "",
        expiryDate = null,
      } = item;

      if (
        !productId ||
        !mongoose.Types.ObjectId.isValid(
          productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Every purchase item must have a valid product ID.",
        });
      }

      const numericQuantity =
        Number(quantity);

      const numericBuyingPrice =
        Number(buyingPrice);

      if (
        !Number.isInteger(
          numericQuantity
        ) ||
        numericQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Product quantity must be a positive whole number.",
        });
      }

      if (
        Number.isNaN(
          numericBuyingPrice
        ) ||
        numericBuyingPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Buying price must be a valid non-negative amount.",
        });
      }

      const product =
        await Product.findOne({
          _id: productId,
          businessId,
          isActive: true,
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "One of the selected products was not found or is inactive.",
        });
      }

      const subtotal =
        numericQuantity *
        numericBuyingPrice;

      const parsedExpiryDate = expiryDate ? new Date(expiryDate) : null;
      if (parsedExpiryDate && Number.isNaN(parsedExpiryDate.getTime())) {
        return res.status(400).json({ success: false, message: "Enter a valid expiry date for each batch." });
      }

      normalizedItems.push({
        productId:
          product._id,
        name:
          product.name,
        sku:
          product.sku,
        quantity:
          numericQuantity,
        buyingPrice:
          numericBuyingPrice,
        subtotal,
        batchCode: String(batchCode || "").trim().slice(0, 100),
        expiryDate: parsedExpiryDate,
      });
    }

    // --------------------------------------------------------
    // CALCULATE TOTALS
    // --------------------------------------------------------

    const subtotal =
      normalizedItems.reduce(
        (sum, item) =>
          sum + item.subtotal,
        0
      );

    if (
      numericDiscount > subtotal
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount cannot be greater than the purchase subtotal.",
      });
    }

    const total =
      subtotal -
      numericDiscount;

    // --------------------------------------------------------
    // CREATE PURCHASE
    // --------------------------------------------------------

    const purchase =
      await Purchase.create({
        businessId,

        branchId,

        supplierId,

        userId,

        purchaseNumber:
          generatePurchaseNumber(),

        invoiceNumber:
          typeof invoiceNumber ===
          "string"
            ? invoiceNumber.trim()
            : "",

        items:
          normalizedItems,

        subtotal,

        discount:
          numericDiscount,

        total,

        paymentMethod,

        paymentStatus,

        status:
          "RECEIVED",

        notes:
          typeof notes ===
          "string"
            ? notes.trim()
            : "",
      });

    // --------------------------------------------------------
    // UPDATE BRANCH STOCK
    // --------------------------------------------------------

    try {
      for (
        const item of normalizedItems
      ) {
        const product =
          await Product.findOne({
            _id: item.productId,
            businessId,
          });

        if (!product) {
          throw new Error(
            `Product ${item.productId} no longer exists.`
          );
        }

        // ----------------------------------------------------
        // NON-STOCK PRODUCTS
        // ----------------------------------------------------

        if (!product.trackStock) {
          product.buyingPrice =
            item.buyingPrice;

          await product.save();

          continue;
        }

        // ----------------------------------------------------
        // GET BRANCH STOCK
        // ----------------------------------------------------

        const branchStock =
          await getOrCreateBranchStock({
            businessId,
            branchId,
            product,
          });

        const stockBefore =
          Number(
            branchStock.stockQuantity ||
              0
          );

        const stockAfter =
          stockBefore +
          item.quantity;

        // ----------------------------------------------------
        // UPDATE BRANCH STOCK
        // ----------------------------------------------------

        branchStock.stockQuantity =
          stockAfter;

        branchStock.isActive =
          true;

        await branchStock.save();

        // ----------------------------------------------------
        // UPDATE PRODUCT BUYING PRICE
        // ----------------------------------------------------

        product.buyingPrice =
          item.buyingPrice;

        await product.save();

        updatedBranchStocks.push({
          stockId:
            branchStock._id,

          productId:
            product._id,

          stockBefore,

          stockAfter,

          quantity:
            item.quantity,

          buyingPrice:
            product.buyingPrice,
        });

        // ----------------------------------------------------
        // INVENTORY TRANSACTION
        // ----------------------------------------------------

        const inventoryTransaction =
          await InventoryTransaction.create(
            {
              businessId,

              branchId,

              productId:
                product._id,

              userId,

              type:
                "STOCK_RECEIVED",

              quantity:
                item.quantity,

              stockBefore,

              stockAfter,

              reason:
                `Purchase ${purchase.purchaseNumber}`,

              referenceType:
                "PURCHASE",

              referenceId:
                purchase._id,

              notes:
                `Stock received from ${supplier.name}`,
            }
          );

        createdInventoryTransactions.push(
          inventoryTransaction._id
        );

        const batch = await InventoryBatch.create({
          businessId,
          branchId,
          productId: product._id,
          purchaseId: purchase._id,
          batchCode: item.batchCode,
          quantityReceived: item.quantity,
          remainingQuantity: item.quantity,
          unitCost: item.buyingPrice,
          expiryDate: item.expiryDate,
        });
        createdInventoryBatches.push(batch._id);
      }
    } catch (stockError) {
      console.error(
        "Purchase branch stock update error:",
        stockError
      );

      // ------------------------------------------------------
      // ROLLBACK BRANCH STOCK
      // ------------------------------------------------------

      for (
        const updated of
        [...updatedBranchStocks].reverse()
      ) {
        await ProductBranchStock.findOneAndUpdate(
          {
            _id:
              updated.stockId,

            businessId,

            branchId,
          },
          {
            $set: {
              stockQuantity:
                updated.stockBefore,
            },
          }
        );
      }

      // ------------------------------------------------------
      // REMOVE INVENTORY TRANSACTIONS
      // ------------------------------------------------------

      if (
        createdInventoryTransactions
          .length > 0
      ) {
        await InventoryTransaction.deleteMany(
          {
            _id: {
              $in:
                createdInventoryTransactions,
            },
          }
        );
      }

      if (createdInventoryBatches.length) {
        await InventoryBatch.deleteMany({ _id: { $in: createdInventoryBatches }, businessId, branchId });
      }

      // ------------------------------------------------------
      // REMOVE PURCHASE
      // ------------------------------------------------------

      await Purchase.findByIdAndDelete(
        purchase._id
      );

      throw stockError;
    }

    // --------------------------------------------------------
    // RETURN PURCHASE
    // --------------------------------------------------------

    const populatedPurchase =
      await Purchase.findById(
        purchase._id
      )
        .populate(
          "supplierId",
          "name contactPerson phone email address taxNumber"
        )
        .populate(
          "userId",
          "name email"
        )
        .populate(
          "branchId",
          "name code address"
        )
        .lean();

    return res.status(201).json({
      success: true,

      message:
        `Purchase received successfully at ${branch.name}.`,

      purchase:
        populatedPurchase,
    });
  } catch (error) {
    console.error(
      "Create purchase error:",
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to create purchase.",
    });
  }
};

// ============================================================
// CANCEL PURCHASE
// POST /api/purchases/:id/cancel
// ============================================================

const cancelPurchase = async (
  req,
  res
) => {
  const reversedStocks = [];
  const createdTransactions = [];

  try {
    const businessId =
      req.user?.businessId;

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid purchase ID.",
      });
    }

    const purchase =
      await Purchase.findOne({
        _id: req.params.id,
        businessId,
      });

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message:
          "Purchase not found.",
      });
    }

    if (
      purchase.status ===
      "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This purchase has already been cancelled.",
      });
    }

    if (!purchase.branchId) {
      return res.status(400).json({
        success: false,
        message:
          "This purchase has no branch assigned and cannot be safely reversed.",
      });
    }

    // --------------------------------------------------------
    // VERIFY BRANCH
    // --------------------------------------------------------

    const branch =
      await Branch.findOne({
        _id: purchase.branchId,
        businessId,
        isActive: true,
      });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message:
          "The purchase branch was not found or is inactive.",
      });
    }

    const purchaseBatches = await InventoryBatch.find({
      businessId,
      branchId: purchase.branchId,
      purchaseId: purchase._id,
      status: { $ne: "CANCELLED" },
    });
    if (purchaseBatches.some((batch) => Number(batch.remainingQuantity) !== Number(batch.quantityReceived))) {
      return res.status(409).json({
        success: false,
        message: "This purchase includes stock already sold or used. It cannot be cancelled safely; record a stock adjustment instead.",
      });
    }

    // --------------------------------------------------------
    // REVERSE BRANCH STOCK
    // --------------------------------------------------------

    try {
      for (
        const item of
        purchase.items
      ) {
        const product =
          await Product.findOne({
            _id: item.productId,
            businessId,
          });

        if (!product) {
          throw new Error(
            `Product ${item.name} no longer exists.`
          );
        }

        if (!product.trackStock) {
          continue;
        }

        // ----------------------------------------------------
        // FIND BRANCH STOCK
        // ----------------------------------------------------

        const branchStock =
          await ProductBranchStock.findOne(
            {
              businessId,
              branchId:
                purchase.branchId,
              productId:
                item.productId,
            }
          );

        if (!branchStock) {
          throw new Error(
            `Branch stock for ${item.name} could not be found.`
          );
        }

        const stockBefore =
          Number(
            branchStock.stockQuantity ||
              0
          );

        if (
          stockBefore <
          item.quantity
        ) {
          throw new Error(
            `Cannot cancel purchase because ${product.name} only has ${stockBefore} units at ${branch.name}, but ${item.quantity} units need to be removed.`
          );
        }

        const stockAfter =
          stockBefore -
          item.quantity;

        branchStock.stockQuantity =
          stockAfter;

        await branchStock.save();

        reversedStocks.push({
          stockId:
            branchStock._id,

          stockBefore,

          stockAfter,

          quantity:
            item.quantity,
        });

        // ----------------------------------------------------
        // RECORD REVERSAL
        // ----------------------------------------------------

        const transaction =
          await InventoryTransaction.create(
            {
              businessId,

              branchId:
                purchase.branchId,

              productId:
                product._id,

              userId:
                req.user._id,

              type:
                "ADJUSTMENT_OUT",

              quantity:
                item.quantity,

              stockBefore,

              stockAfter,

              reason:
                `Cancelled purchase ${purchase.purchaseNumber}`,

              referenceType:
                "PURCHASE",

              referenceId:
                purchase._id,

              notes:
                "Stock reversed because purchase was cancelled.",
            }
          );

        createdTransactions.push(
          transaction._id
        );
      }
    } catch (stockError) {
      console.error(
        "Cancel purchase stock error:",
        stockError
      );

      // ------------------------------------------------------
      // ROLLBACK STOCK
      // ------------------------------------------------------

      for (
        const reversed of
        [...reversedStocks].reverse()
      ) {
        await ProductBranchStock.findOneAndUpdate(
          {
            _id:
              reversed.stockId,

            businessId,

            branchId:
              purchase.branchId,
          },
          {
            $set: {
              stockQuantity:
                reversed.stockBefore,
            },
          }
        );
      }

      // ------------------------------------------------------
      // REMOVE TRANSACTIONS
      // ------------------------------------------------------

      if (
        createdTransactions
          .length > 0
      ) {
        await InventoryTransaction.deleteMany(
          {
            _id: {
              $in:
                createdTransactions,
            },
          }
        );
      }

      throw stockError;
    }

    // --------------------------------------------------------
    // UPDATE PURCHASE
    // --------------------------------------------------------

    purchase.status =
      "CANCELLED";

    await purchase.save();
    if (purchaseBatches.length) {
      await InventoryBatch.updateMany({ _id: { $in: purchaseBatches.map((batch) => batch._id) } }, { $set: { status: "CANCELLED", remainingQuantity: 0 } });
    }

    return res.status(200).json({
      success: true,

      message:
        `Purchase cancelled and stock reversed at ${branch.name}.`,

      purchase,
    });
  } catch (error) {
    console.error(
      "Cancel purchase error:",
      error
    );

    return res.status(
      error.status || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Failed to cancel purchase.",
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

export {
  getPurchases,
  getPurchaseById,
  createPurchase,
  cancelPurchase,
};
