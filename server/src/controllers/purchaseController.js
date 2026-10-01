import mongoose from "mongoose";

import Purchase from "../models/Purchase.js";
import Supplier from "../models/Supplier.js";
import Product from "../models/Product.js";
import InventoryTransaction from "../models/InventoryTransaction.js";


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
// GET ALL PURCHASES
// GET /api/purchases
// ============================================================

const getPurchases = async (req, res) => {
  try {
    const businessId = req.user?.businessId;

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
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      businessId,
    };

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (search.trim()) {
      const searchRegex = new RegExp(
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
          (supplier) => supplier._id
        );

      filter.$or = [
        {
          purchaseNumber: searchRegex,
        },
        {
          invoiceNumber: searchRegex,
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
          message: "Invalid supplier ID.",
        });
      }

      filter.supplierId = supplierId;
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
        message: "Invalid purchase ID.",
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
        .lean();

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found.",
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
  const updatedProducts = [];
  const createdInventoryTransactions = [];

  try {
    const businessId =
      req.user?.businessId;

    const branchId =
      req.user?.branchId || null;

    const userId =
      req.user?._id;

    if (!businessId || !userId) {
      return res.status(400).json({
        success: false,
        message:
          "Business or user information is missing.",
      });
    }

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
    // PREPARE PURCHASE ITEMS
    // --------------------------------------------------------

    const normalizedItems = [];

    for (
      const item of items
    ) {
      const {
        productId,
        quantity,
        buyingPrice,
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
    // UPDATE STOCK
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

        const stockBefore =
          Number(
            product.stockQuantity || 0
          );

        const stockAfter =
          product.trackStock
            ? stockBefore +
              item.quantity
            : stockBefore;

        // Update buying price even if
        // stock tracking is disabled.
        product.buyingPrice =
          item.buyingPrice;

        if (product.trackStock) {
          product.stockQuantity =
            stockAfter;
        }

        await product.save();

        updatedProducts.push({
          productId:
            product._id,
          stockBefore,
          stockAfter,
          buyingPrice:
            product.buyingPrice,
          quantity:
            item.quantity,
          trackStock:
            product.trackStock,
        });

        // ----------------------------------------------------
        // INVENTORY TRANSACTION
        // ----------------------------------------------------

        if (product.trackStock) {
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
        }
      }
    } catch (stockError) {
      console.error(
        "Purchase stock update error:",
        stockError
      );

      // ------------------------------------------------------
      // ROLLBACK PRODUCT STOCK
      // ------------------------------------------------------

      for (
        const updated of
        updatedProducts.reverse()
      ) {
        await Product.findOneAndUpdate(
          {
            _id:
              updated.productId,
            businessId,
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

      // ------------------------------------------------------
      // REMOVE PURCHASE
      // ------------------------------------------------------

      await Purchase.findByIdAndDelete(
        purchase._id
      );

      throw stockError;
    }

    // --------------------------------------------------------
    // RETURN CREATED PURCHASE
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
        .lean();

    return res.status(201).json({
      success: true,
      message:
        "Purchase created and stock received successfully.",
      purchase:
        populatedPurchase,
    });
  } catch (error) {
    console.error(
      "Create purchase error:",
      error
    );

    return res.status(500).json({
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
  const reversedProducts = [];
  const deletedTransactions = [];

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

    // --------------------------------------------------------
    // REVERSE STOCK
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

        const stockBefore =
          Number(
            product.stockQuantity || 0
          );

        if (
          stockBefore <
          item.quantity
        ) {
          throw new Error(
            `Cannot cancel purchase because ${product.name} only has ${stockBefore} units in stock, but ${item.quantity} units need to be removed.`
          );
        }

        const stockAfter =
          stockBefore -
          item.quantity;

        product.stockQuantity =
          stockAfter;

        await product.save();

        reversedProducts.push({
          productId:
            product._id,
          stockBefore,
          stockAfter,
          quantity:
            item.quantity,
        });

        // ----------------------------------------------------
        // RECORD REVERSAL TRANSACTION
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

        deletedTransactions.push(
          transaction._id
        );
      }
    } catch (stockError) {
      console.error(
        "Cancel purchase stock error:",
        stockError
      );

      // ------------------------------------------------------
      // ROLLBACK STOCK REVERSALS
      // ------------------------------------------------------

      for (
        const reversed of
        reversedProducts.reverse()
      ) {
        await Product.findOneAndUpdate(
          {
            _id:
              reversed.productId,
            businessId,
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
      // REMOVE REVERSAL TRANSACTIONS
      // ------------------------------------------------------

      if (
        deletedTransactions
          .length > 0
      ) {
        await InventoryTransaction.deleteMany(
          {
            _id: {
              $in:
                deletedTransactions,
            },
          }
        );
      }

      throw stockError;
    }

    // --------------------------------------------------------
    // UPDATE PURCHASE STATUS
    // --------------------------------------------------------

    purchase.status =
      "CANCELLED";

    await purchase.save();

    return res.status(200).json({
      success: true,
      message:
        "Purchase cancelled and stock reversed successfully.",
      purchase,
    });
  } catch (error) {
    console.error(
      "Cancel purchase error:",
      error
    );

    return res.status(500).json({
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