
import mongoose from "mongoose";

import InventoryTransaction from "../models/InventoryTransaction.js";
import Product from "../models/Product.js";
import ProductBranchStock from "../models/ProductBranchStock.js";
import Branch from "../models/Branch.js";

/* ============================================================
   HELPERS
============================================================ */

const getActiveBranchId = (
  req
) => {
  return (
    req.user?.activeBranchId?._id ||
    req.user?.activeBranchId ||
    req.user?.branchId ||
    req.branchId ||
    null
  );
};

const validateActiveBranch =
  async (req) => {
    const businessId =
      req.user.businessId;

    const branchId =
      getActiveBranchId(req);

    if (!branchId) {
      return null;
    }

    return Branch.findOne({
      _id: branchId,
      businessId,
      isActive: true,
    });
  };

/* ============================================================
   GET INVENTORY TRANSACTIONS
============================================================ */

export const getInventoryTransactions =
  async (
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

      const businessId =
        req.user.businessId;

      const branchId =
        getActiveBranchId(req);

      if (!branchId) {
        return res.status(400).json({
          success: false,
          message:
            "No active branch is selected.",
        });
      }

      const query = {
        businessId,
        branchId,
      };

      if (productId) {
        if (
          !mongoose.Types.ObjectId.isValid(
            productId
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid product ID.",
          });
        }

        query.productId =
          productId;
      }

      if (type) {
        query.type =
          type;
      }

      if (
        startDate ||
        endDate
      ) {
        query.createdAt =
          {};

        if (startDate) {
          query.createdAt.$gte =
            new Date(
              `${startDate}T00:00:00`
            );
        }

        if (endDate) {
          query.createdAt.$lte =
            new Date(
              `${endDate}T23:59:59`
            );
        }
      }

      const pageNumber =
        Math.max(
          Number(page),
          1
        );

      const limitNumber =
        Math.min(
          Math.max(
            Number(limit),
            1
          ),
          100
        );

      const skip =
        (pageNumber - 1) *
        limitNumber;

      const [
        transactions,
        total,
      ] = await Promise.all([
        InventoryTransaction.find(
          query
        )
          .populate(
            "productId",
            "name sku"
          )
          .populate(
            "userId",
            "name email role"
          )
          .populate(
            "branchId",
            "name code"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(
            limitNumber
          )
          .lean(),

        InventoryTransaction.countDocuments(
          query
        ),
      ]);

      return res.json({
        success: true,
        activeBranchId:
          branchId,
        transactions,
        pagination: {
          page:
            pageNumber,
          limit:
            limitNumber,
          total,
          pages:
            Math.ceil(
              total /
                limitNumber
            ),
        },
      });
    } catch (error) {
      next(error);
    }
  };

/* ============================================================
   GET PRODUCT INVENTORY TRANSACTIONS
============================================================ */

export const getProductInventoryTransactions =
  async (
    req,
    res,
    next
  ) => {
    try {
      const {
        productId,
      } = req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product ID.",
        });
      }

      const businessId =
        req.user.businessId;

      const branchId =
        getActiveBranchId(req);

      if (!branchId) {
        return res.status(400).json({
          success: false,
          message:
            "No active branch is selected.",
        });
      }

      const product =
        await Product.findOne({
          _id: productId,
          businessId,
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found.",
        });
      }

      const branch =
        await Branch.findOne({
          _id: branchId,
          businessId,
          isActive: true,
        });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message:
            "Active branch not found.",
        });
      }

      let branchStock =
        await ProductBranchStock.findOne(
          {
            businessId,
            productId,
            branchId,
          }
        ).lean();

      /*
       * Backward-compatible migration:
       *
       * If this product has never received a
       * branch stock record, initialize the
       * currently active branch using the
       * old product stock value.
       *
       * This should mainly affect existing
       * products created before multi-branch
       * stock was introduced.
       */

      if (!branchStock) {
        branchStock =
          await ProductBranchStock.create(
            {
              businessId,
              productId,
              branchId,
              stockQuantity:
                product.stockQuantity ||
                0,
              minimumStock:
                product.minimumStock ||
                0,
              lastStockUpdate:
                new Date(),
            }
          );

        branchStock =
          branchStock.toObject();
      }

      const transactions =
        await InventoryTransaction.find(
          {
            businessId,
            branchId,
            productId,
          }
        )
          .populate(
            "userId",
            "name email role"
          )
          .populate(
            "branchId",
            "name code"
          )
          .sort({
            createdAt: -1,
          })
          .lean();

      const productResponse =
        product.toObject();

      productResponse.stockQuantity =
        branchStock.stockQuantity;

      productResponse.branchStock =
        branchStock.stockQuantity;

      productResponse.branchId =
        branchId;

      return res.json({
        success: true,
        activeBranchId:
          branchId,
        product:
          productResponse,
        branchStock,
        transactions,
      });
    } catch (error) {
      next(error);
    }
  };

/* ============================================================
   ADJUST INVENTORY
============================================================ */

export const adjustInventory =
  async (
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

      const businessId =
        req.user.businessId;

      const branchId =
        getActiveBranchId(req);

      /*
       * ======================================================
       * 1. VALIDATE BRANCH
       * ======================================================
       */

      if (!branchId) {
        return res.status(400).json({
          success: false,
          message:
            "No active branch is selected. Please select a branch before adjusting inventory.",
        });
      }

      const branch =
        await validateActiveBranch(
          req
        );

      if (!branch) {
        return res.status(403).json({
          success: false,
          message:
            "The selected branch is invalid or inactive.",
        });
      }

      /*
       * ======================================================
       * 2. VALIDATE PRODUCT ID
       * ======================================================
       */

      if (
        !productId ||
        !mongoose.Types.ObjectId.isValid(
          productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Valid product ID is required.",
        });
      }

      /*
       * ======================================================
       * 3. VALIDATE QUANTITY
       * ======================================================
       */

      const adjustmentQuantity =
        Number(quantity);

      if (
        !Number.isInteger(
          adjustmentQuantity
        ) ||
        adjustmentQuantity <=
          0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be a whole number greater than zero.",
        });
      }

      /*
       * ======================================================
       * 4. VALIDATE TRANSACTION TYPE
       * ======================================================
       */

      const allowedTypes = [
        "STOCK_RECEIVED",
        "ADJUSTMENT_IN",
        "ADJUSTMENT_OUT",
        "DAMAGE",
        "LOSS",
      ];

      if (
        !allowedTypes.includes(
          type
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid inventory adjustment type.",
        });
      }

      /*
       * ======================================================
       * 5. FIND PRODUCT
       * ======================================================
       */

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
            "Product not found.",
        });
      }

      /*
       * ======================================================
       * 6. GET OR CREATE BRANCH STOCK
       * ======================================================
       */

      let branchStock =
        await ProductBranchStock.findOne(
          {
            businessId,
            productId,
            branchId,
          }
        );

      /*
       * Existing products created before
       * branch stock existed are migrated
       * when first operated on.
       */

      if (!branchStock) {
        branchStock =
          await ProductBranchStock.create(
            {
              businessId,
              productId,
              branchId,
              stockQuantity:
                product.stockQuantity ||
                0,
              minimumStock:
                product.minimumStock ||
                0,
              lastStockUpdate:
                new Date(),
            }
          );
      }

      /*
       * ======================================================
       * 7. DETERMINE STOCK DIRECTION
       * ======================================================
       */

      const stockIncreasingTypes = [
        "STOCK_RECEIVED",
        "ADJUSTMENT_IN",
      ];

      const increasesStock =
        stockIncreasingTypes.includes(
          type
        );

      const stockBefore =
        Number(
          branchStock.stockQuantity
        );

      let stockAfter;

      if (increasesStock) {
        stockAfter =
          stockBefore +
          adjustmentQuantity;
      } else {
        stockAfter =
          stockBefore -
          adjustmentQuantity;
      }

      /*
       * ======================================================
       * 8. PREVENT NEGATIVE STOCK
       * ======================================================
       */

      if (
        stockAfter < 0
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot remove ${adjustmentQuantity} units. Current stock in ${branch.name} is ${stockBefore}.`,
        });
      }

      /*
       * ======================================================
       * 9. UPDATE BRANCH STOCK SAFELY
       * ======================================================
       *
       * The stockBefore condition prevents two simultaneous
       * operations from overwriting each other.
       */

      const updatedBranchStock =
        await ProductBranchStock.findOneAndUpdate(
          {
            _id:
              branchStock._id,
            businessId,
            productId,
            branchId,
            stockQuantity:
              stockBefore,
          },
          {
            $set: {
              stockQuantity:
                stockAfter,
              lastStockUpdate:
                new Date(),
            },
          },
          {
            new: true,
          }
        );

      if (
        !updatedBranchStock
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Inventory changed before this adjustment could be completed. Please try again.",
        });
      }

      /*
       * ======================================================
       * 10. CREATE LEDGER ENTRY
       * ======================================================
       */

      let transaction;

      try {
        transaction =
          await InventoryTransaction.create(
            {
              businessId,

              branchId,

              productId:
                product._id,

              userId:
                req.user._id,

              type,

              quantity:
                adjustmentQuantity,

              stockBefore,

              stockAfter,

              reason:
                reason.trim(),

              referenceType:
                "ADJUSTMENT",

              referenceId:
                null,

              notes:
                notes.trim(),
            }
          );
      } catch (
        transactionError
      ) {
        /*
         * Roll branch stock back if the ledger
         * entry fails.
         */

        await ProductBranchStock.updateOne(
          {
            _id:
              branchStock._id,
            businessId,
            productId,
            branchId,
            stockQuantity:
              stockAfter,
          },
          {
            $set: {
              stockQuantity:
                stockBefore,
              lastStockUpdate:
                new Date(),
            },
          }
        );

        throw transactionError;
      }

      /*
       * ======================================================
       * 11. TEMPORARY LEGACY SYNCHRONIZATION
       * ======================================================
       *
       * Existing MOVA frontend/POS code may still read
       * Product.stockQuantity.
       *
       * We keep it synchronized with the currently active
       * branch for now.
       *
       * The POS/Sales refactor will remove this dependency.
       */

      await Product.updateOne(
        {
          _id:
            product._id,
          businessId,
        },
        {
          $set: {
            stockQuantity:
              stockAfter,
          },
        }
      );

      /*
       * ======================================================
       * 12. RESPONSE
       * ======================================================
       */

      const updatedProduct =
        await Product.findById(
          product._id
        ).populate(
          "categoryId",
          "name"
        );

      const productResponse =
        updatedProduct.toObject();

      productResponse.stockQuantity =
        stockAfter;

      productResponse.branchStock =
        stockAfter;

      productResponse.branchId =
        branchId;

      return res.status(200).json({
        success: true,

        message:
          "Inventory adjusted successfully.",

        product:
          productResponse,

        branchStock:
          updatedBranchStock,

        transaction,

        branch: {
          _id:
            branch._id,
          name:
            branch.name,
          code:
            branch.code,
        },
      });
    } catch (error) {
      console.error(
        "Adjust inventory error:",
        error
      );

      next(error);
    }
  };