import mongoose from "mongoose";

import InventoryTransaction from "../models/InventoryTransaction.js";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";

const generateReceiptNumber = () => {
  const timestamp = Date.now();

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `MOVA-${timestamp}-${random}`;
};

export const createSale = async (req, res) => {
  try {
    const {
      items,
      discount = 0,
      paymentMethod,
      notes = "",
    } = req.body;

    /*
     * ----------------------------------------------------
     * 1. VALIDATE CART
     * ----------------------------------------------------
     */

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "The cart cannot be empty.",
      });
    }

    /*
     * ----------------------------------------------------
     * 2. VALIDATE PAYMENT METHOD
     * ----------------------------------------------------
     */

    const allowedPaymentMethods = [
      "CASH",
      "MOBILE_MONEY",
      "CARD",
      "BANK",
    ];

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method.",
      });
    }

    /*
     * ----------------------------------------------------
     * 3. VALIDATE DISCOUNT
     * ----------------------------------------------------
     */

    const discountAmount = Number(discount);

    if (
      Number.isNaN(discountAmount) ||
      discountAmount < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid discount.",
      });
    }

    /*
     * ----------------------------------------------------
     * 4. PREPARE SALE ITEMS
     * ----------------------------------------------------
     */

    const normalizedItems = [];

    const stockChanges = [];

    let subtotal = 0;

    for (const item of items) {
      /*
       * Validate product ID.
       */

      if (!item.productId) {
        return res.status(400).json({
          success: false,
          message:
            "Every sale item must have a product.",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          item.productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID.",
        });
      }

      /*
       * Validate quantity.
       */

      const quantity = Number(item.quantity);

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Product quantities must be whole numbers greater than zero.",
        });
      }

      /*
       * Find the product.
       *
       * Business ID is included to prevent one business
       * from accessing another business's products.
       */

      const product = await Product.findOne({
        _id: item.productId,
        businessId: req.user.businessId,
        isActive: true,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "One of the selected products was not found.",
        });
      }

      /*
       * Check available stock.
       */

      if (
        product.trackStock &&
        product.stockQuantity < quantity
      ) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name}. Available: ${product.stockQuantity}.`,
        });
      }

      /*
       * Calculate item subtotal.
       */

      const itemSubtotal =
        Number(product.sellingPrice) * quantity;

      subtotal += itemSubtotal;

      /*
       * Save a snapshot of the product information
       * inside the sale.
       */

      normalizedItems.push({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        quantity,
        unitPrice: product.sellingPrice,
        buyingPrice: product.buyingPrice,
        subtotal: itemSubtotal,
      });

      /*
       * Only products with stock tracking enabled
       * should affect inventory.
       */

      if (product.trackStock) {
        stockChanges.push({
          productId: product._id,
          quantity,
        });
      }
    }

    /*
     * ----------------------------------------------------
     * 5. VALIDATE DISCOUNT AGAINST SUBTOTAL
     * ----------------------------------------------------
     */

    if (discountAmount > subtotal) {
      return res.status(400).json({
        success: false,
        message:
          "Discount cannot be greater than the subtotal.",
      });
    }

    const total = subtotal - discountAmount;

    /*
     * ----------------------------------------------------
     * 6. REDUCE INVENTORY
     * ----------------------------------------------------
     *
     * We use an atomic update with $gte.
     *
     * Example:
     *
     * Stock = 20
     * Sale = 5
     *
     * Database becomes:
     *
     * 20 -> 15
     *
     * The returned product contains the new stock.
     *
     * Therefore:
     *
     * stockBefore = newStock + quantity
     * stockAfter  = newStock
     */

    const updatedProducts = [];

    try {
      for (const change of stockChanges) {
        const updatedProduct =
          await Product.findOneAndUpdate(
            {
              _id: change.productId,
              businessId: req.user.businessId,
              stockQuantity: {
                $gte: change.quantity,
              },
            },
            {
              $inc: {
                stockQuantity: -change.quantity,
              },
            },
            {
              new: true,
            }
          );

        if (!updatedProduct) {
          throw new Error(
            "Stock changed before the sale could be completed."
          );
        }

        /*
         * Calculate the stock before and after
         * the sale.
         */

        const stockAfter =
          updatedProduct.stockQuantity;

        const stockBefore =
          stockAfter + change.quantity;

        updatedProducts.push({
          productId: change.productId,
          quantity: change.quantity,
          stockBefore,
          stockAfter,
        });
      }
    } catch (stockError) {
      /*
       * ------------------------------------------------
       * ROLLBACK STOCK
       * ------------------------------------------------
       *
       * If one product fails, restore all products
       * that were already successfully reduced.
       */

      for (const change of updatedProducts) {
        await Product.updateOne(
          {
            _id: change.productId,
            businessId: req.user.businessId,
          },
          {
            $inc: {
              stockQuantity: change.quantity,
            },
          }
        );
      }

      return res.status(409).json({
        success: false,
        message:
          stockError.message ||
          "Unable to update inventory.",
      });
    }

    /*
     * ----------------------------------------------------
     * 7. CREATE SALE
     * ----------------------------------------------------
     */

    let sale;

    try {
      sale = await Sale.create({
        businessId: req.user.businessId,
        branchId: req.user.branchId || null,
        cashierId: req.user._id,

        receiptNumber: generateReceiptNumber(),

        items: normalizedItems,

        subtotal,
        discount: discountAmount,
        total,

        paymentMethod,

        paymentStatus: "PAID",
        status: "COMPLETED",

        notes,
      });
    } catch (saleError) {
      /*
       * ------------------------------------------------
       * ROLLBACK INVENTORY IF SALE CREATION FAILS
       * ------------------------------------------------
       */

      for (const change of updatedProducts) {
        await Product.updateOne(
          {
            _id: change.productId,
            businessId: req.user.businessId,
          },
          {
            $inc: {
              stockQuantity: change.quantity,
            },
          }
        );
      }

      throw saleError;
    }

    /*
     * ----------------------------------------------------
     * 8. CREATE INVENTORY TRANSACTIONS
     * ----------------------------------------------------
     *
     * Every tracked product sold gets a SALE transaction.
     */

    const createdTransactions = [];

    try {
      for (const change of updatedProducts) {
        const transaction =
          await InventoryTransaction.create({
            businessId: req.user.businessId,

            branchId:
              req.user.branchId || null,

            productId: change.productId,

            userId: req.user._id,

            type: "SALE",

            quantity: change.quantity,

            stockBefore: change.stockBefore,

            stockAfter: change.stockAfter,

            reason: "Product sold",

            referenceType: "SALE",

            referenceId: sale._id,

            notes: `Stock reduced through sale ${sale.receiptNumber}`,
          });

        createdTransactions.push(transaction);
      }
    } catch (transactionError) {
      /*
       * ------------------------------------------------
       * FULL ROLLBACK
       * ------------------------------------------------
       *
       * If inventory ledger creation fails:
       *
       * 1. Delete any ledger records already created.
       * 2. Restore stock.
       * 3. Delete the sale.
       *
       * This prevents a completed sale from being
       * left in an inconsistent state.
       */

      if (createdTransactions.length > 0) {
        await InventoryTransaction.deleteMany({
          _id: {
            $in: createdTransactions.map(
              (transaction) => transaction._id
            ),
          },
        });
      }

      for (const change of updatedProducts) {
        await Product.updateOne(
          {
            _id: change.productId,
            businessId: req.user.businessId,
          },
          {
            $inc: {
              stockQuantity: change.quantity,
            },
          }
        );
      }

      await Sale.deleteOne({
        _id: sale._id,
        businessId: req.user.businessId,
      });

      throw transactionError;
    }

    /*
     * ----------------------------------------------------
     * 9. SUCCESS RESPONSE
     * ----------------------------------------------------
     */

    return res.status(201).json({
      success: true,
      message: "Sale completed successfully.",
      sale,
    });
  } catch (error) {
    console.error(
      "Create sale error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to complete the sale.",
    });
  }
};

/*
 * ========================================================
 * GET ALL SALES
 * ========================================================
 */

export const getSales = async (req, res) => {
  try {
    const {
      paymentMethod,
      cashierId,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {
      businessId: req.user.businessId,
    };

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (cashierId) {
      filter.cashierId = cashierId;
    }

    if (search) {
      filter.receiptNumber = {
        $regex: search,
        $options: "i",
      };
    }

    const pageNumber = Math.max(
      Number(page),
      1
    );

    const limitNumber = Math.min(
      Math.max(Number(limit), 1),
      100
    );

    const skip =
      (pageNumber - 1) *
      limitNumber;

    const [sales, total] =
      await Promise.all([
        Sale.find(filter)
          .populate(
            "cashierId",
            "name email role"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber),

        Sale.countDocuments(filter),
      ]);

    return res.json({
      success: true,
      sales,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },
    });
  } catch (error) {
    console.error(
      "Get sales error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load sales.",
    });
  }
};

/*
 * ========================================================
 * GET ONE SALE
 * ========================================================
 */

export const getSaleById = async (
  req,
  res
) => {
  try {
    const sale =
      await Sale.findOne({
        _id: req.params.id,
        businessId: req.user.businessId,
      }).populate(
        "cashierId",
        "name email role"
      );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found.",
      });
    }

    return res.json({
      success: true,
      sale,
    });
  } catch (error) {
    console.error(
      "Get sale error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load sale.",
    });
  }
};