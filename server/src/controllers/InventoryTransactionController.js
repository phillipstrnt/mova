import mongoose from "mongoose";

import InventoryTransaction from "../models/InventoryTransaction.js";
import Product from "../models/Product.js";

export const getInventoryTransactions = async (
  req,
  res,
  next
) => {
  try {
    const {
      productId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      businessId: req.user.businessId,
    };

    if (productId) {
      query.productId = productId;
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};

      if (startDate) {
        query.createdAt.$gte = new Date(
          `${startDate}T00:00:00`
        );
      }

      if (endDate) {
        query.createdAt.$lte = new Date(
          `${endDate}T23:59:59`
        );
      }
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
      (pageNumber - 1) * limitNumber;

    const [transactions, total] =
      await Promise.all([
        InventoryTransaction.find(query)
          .populate(
            "productId",
            "name sku stockQuantity"
          )
          .populate(
            "userId",
            "name email role"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNumber),

        InventoryTransaction.countDocuments(
          query
        ),
      ]);

    return res.json({
      success: true,
      transactions,
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
    next(error);
  }
};

export const getProductInventoryTransactions =
  async (req, res, next) => {
    try {
      const { productId } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product ID.",
        });
      }

      const product = await Product.findOne({
        _id: productId,
        businessId: req.user.businessId,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found.",
        });
      }

      const transactions =
        await InventoryTransaction.find({
          businessId: req.user.businessId,
          productId,
        })
          .populate(
            "userId",
            "name email role"
          )
          .sort({ createdAt: -1 });

      return res.json({
        success: true,
        product,
        transactions,
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * ========================================================
 * ADJUST INVENTORY
 * ========================================================
 *
 * This endpoint is used when a user manually changes
 * product stock.
 *
 * Examples:
 *
 * Add 20 units:
 * ADJUSTMENT_IN
 *
 * Remove 5 units:
 * ADJUSTMENT_OUT
 *
 * Damaged 3 units:
 * DAMAGE
 *
 * Lost 2 units:
 * LOSS
 */

export const adjustInventory = async (
  req,
  res,
  next
) => {
  try {
    const {
      productId,
      quantity,
      type,
      reason = "",
      notes = "",
    } = req.body;

    /*
     * ----------------------------------------------------
     * 1. VALIDATE PRODUCT ID
     * ----------------------------------------------------
     */

    if (
      !productId ||
      !mongoose.Types.ObjectId.isValid(
        productId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid product ID is required.",
      });
    }

    /*
     * ----------------------------------------------------
     * 2. VALIDATE QUANTITY
     * ----------------------------------------------------
     */

    const adjustmentQuantity = Number(
      quantity
    );

    if (
      !Number.isInteger(
        adjustmentQuantity
      ) ||
      adjustmentQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be a whole number greater than zero.",
      });
    }

    /*
     * ----------------------------------------------------
     * 3. VALIDATE TRANSACTION TYPE
     * ----------------------------------------------------
     */

    const allowedTypes = [
      "STOCK_RECEIVED",
      "ADJUSTMENT_IN",
      "ADJUSTMENT_OUT",
      "DAMAGE",
      "LOSS",
    ];

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inventory adjustment type.",
      });
    }

    /*
     * ----------------------------------------------------
     * 4. FIND PRODUCT
     * ----------------------------------------------------
     */

    const product = await Product.findOne({
      _id: productId,
      businessId: req.user.businessId,
      isActive: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    /*
     * ----------------------------------------------------
     * 5. DETERMINE WHETHER STOCK GOES UP OR DOWN
     * ----------------------------------------------------
     */

    const stockIncreasingTypes = [
      "STOCK_RECEIVED",
      "ADJUSTMENT_IN",
    ];

    const increasesStock =
      stockIncreasingTypes.includes(type);

    const stockBefore =
      Number(product.stockQuantity);

    let stockAfter;

    if (increasesStock) {
      stockAfter =
        stockBefore + adjustmentQuantity;
    } else {
      stockAfter =
        stockBefore - adjustmentQuantity;
    }

    /*
     * Stock can never become negative.
     */

    if (stockAfter < 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot remove ${adjustmentQuantity} units. Current stock is ${stockBefore}.`,
      });
    }

    /*
     * ----------------------------------------------------
     * 6. UPDATE PRODUCT STOCK
     * ----------------------------------------------------
     */

    const updatedProduct =
      await Product.findOneAndUpdate(
        {
          _id: productId,
          businessId: req.user.businessId,
          isActive: true,

          /*
           * Extra protection against stock changing
           * between reading and updating.
           */
          stockQuantity: stockBefore,
        },
        {
          $set: {
            stockQuantity: stockAfter,
          },
        },
        {
          new: true,
        }
      );

    if (!updatedProduct) {
      return res.status(409).json({
        success: false,
        message:
          "Inventory changed before this adjustment could be completed. Please try again.",
      });
    }

    /*
     * ----------------------------------------------------
     * 7. CREATE INVENTORY LEDGER ENTRY
     * ----------------------------------------------------
     */

    let transaction;

    try {
      transaction =
        await InventoryTransaction.create({
          businessId:
            req.user.businessId,

          branchId:
            req.user.branchId || null,

          productId:
            updatedProduct._id,

          userId:
            req.user._id,

          type,

          quantity:
            adjustmentQuantity,

          stockBefore,

          stockAfter,

          reason,

          referenceType:
            "ADJUSTMENT",

          referenceId: null,

          notes,
        });
    } catch (transactionError) {
      /*
       * ------------------------------------------------
       * ROLLBACK PRODUCT STOCK
       * ------------------------------------------------
       */

      await Product.updateOne(
        {
          _id: productId,
          businessId: req.user.businessId,
          stockQuantity: stockAfter,
        },
        {
          $set: {
            stockQuantity: stockBefore,
          },
        }
      );

      throw transactionError;
    }

    return res.status(200).json({
      success: true,
      message:
        "Inventory adjusted successfully.",

      product: updatedProduct,

      transaction,
    });
  } catch (error) {
    console.error(
      "Adjust inventory error:",
      error
    );

    next(error);
  }
};