import mongoose from "mongoose";

import Product from "../models/Product.js";
import ProductBranchStock from "../models/ProductBranchStock.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Branch from "../models/Branch.js";

/*
|--------------------------------------------------------------------------
| RESOLVE ACTIVE BRANCH
|--------------------------------------------------------------------------
*/

const resolveActiveBranch =
  async (req, requestedBranchId = null) => {
    const businessId =
      req.user.businessId;

    const activeBranchId =
      requestedBranchId ||
      req.user.activeBranchId ||
      req.user.branchId;

    if (!activeBranchId) {
      return null;
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        activeBranchId
      )
    ) {
      return null;
    }

    const branch =
      await Branch.findOne({
        _id: activeBranchId,
        businessId,
        isActive: true,
      });

    if (!branch) {
      return null;
    }

    if (
      req.user.role === "OWNER" ||
      req.user.role === "ADMIN"
    ) {
      return branch;
    }

    const assignedBranches =
      Array.isArray(
        req.user.branchIds
      )
        ? req.user.branchIds.map(
            (id) => String(id)
          )
        : [];

    if (
      !assignedBranches.includes(
        String(branch._id)
      )
    ) {
      return null;
    }

    return branch;
  };

/*
|--------------------------------------------------------------------------
| GET INVENTORY TRANSACTIONS
|--------------------------------------------------------------------------
*/

export const getInventoryTransactions =
  async (
    req,
    res
  ) => {
    try {
      const {
        productId,
        type,
        page = 1,
        limit = 20,
        startDate,
        endDate,
      } = req.query;

      const businessId =
        req.user.businessId;

      const branch =
        await resolveActiveBranch(req);

      if (!branch) {
        return res.status(400).json({
          success: false,
          message:
            "No valid active branch is selected.",
        });
      }

      const filter = {
        businessId,

        branchId:
          branch._id,
      };

      /*
       * Product filter.
       */
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

        filter.productId =
          productId;
      }

      /*
       * Transaction type.
       */
      if (type) {
        const validTypes = [
          "OPENING_STOCK",
          "STOCK_RECEIVED",
          "SALE",
          "RETURN",
          "ADJUSTMENT_IN",
          "ADJUSTMENT_OUT",
          "DAMAGE",
          "LOSS",
          "TRANSFER_IN",
          "TRANSFER_OUT",
        ];

        if (
          !validTypes.includes(
            type
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid inventory transaction type.",
          });
        }

        filter.type =
          type;
      }

      /*
       * Date filter.
       */
      if (
        startDate ||
        endDate
      ) {
        filter.createdAt = {};

        if (startDate) {
          const start =
            new Date(
              `${startDate}T00:00:00`
            );

          if (
            Number.isNaN(
              start.getTime()
            )
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid start date.",
            });
          }

          filter.createdAt.$gte =
            start;
        }

        if (endDate) {
          const end =
            new Date(
              `${endDate}T23:59:59.999`
            );

          if (
            Number.isNaN(
              end.getTime()
            )
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid end date.",
            });
          }

          filter.createdAt.$lte =
            end;
        }
      }

      /*
       * Pagination.
       */
      const parsedPage =
        Number(page);

      const parsedLimit =
        Number(limit);

      const pageNumber =
        Number.isFinite(
          parsedPage
        )
          ? Math.max(
              parsedPage,
              1
            )
          : 1;

      const limitNumber =
        Number.isFinite(
          parsedLimit
        )
          ? Math.min(
              Math.max(
                parsedLimit,
                1
              ),
              100
            )
          : 20;

      const skip =
        (pageNumber - 1) *
        limitNumber;

      /*
       * Fetch.
       */
      const [
        transactions,
        total,
      ] =
        await Promise.all([
          InventoryTransaction.find(
            filter
          )
            .populate(
              "productId",
              "name sku unit"
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
              createdAt:
                -1,
            })
            .skip(skip)
            .limit(
              limitNumber
            ),

          InventoryTransaction.countDocuments(
            filter
          ),
        ]);

      return res.json({
        success: true,

        transactions,

        branch: {
          id:
            branch._id,

          name:
            branch.name,

          code:
            branch.code,
        },

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
      console.error(
        "Get inventory transactions error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch inventory transactions.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| GET PRODUCT INVENTORY TRANSACTIONS
|--------------------------------------------------------------------------
*/

export const getProductInventoryTransactions =
  async (
    req,
    res
  ) => {
    try {
      const { productId } =
        req.params;

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

      /*
       * Confirm product belongs to
       * this business.
       */
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
        await resolveActiveBranch(req);

      if (!branch) {
        return res.status(400).json({
          success: false,
          message:
            "No valid active branch is selected.",
        });
      }

      /*
       * Current branch stock.
       */
      const branchStock =
        await ProductBranchStock.findOne({
          businessId,

          branchId:
            branch._id,

          productId:
            product._id,

          isActive: true,
        });

      /*
       * History.
       */
      const transactions =
        await InventoryTransaction.find(
          {
            businessId,

            branchId:
              branch._id,

            productId:
              product._id,
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
            createdAt:
              -1,
          });

      return res.json({
        success: true,

        product: {
          id:
            product._id,

          name:
            product.name,

          sku:
            product.sku,

          unit:
            product.unit,
        },

        branch: {
          id:
            branch._id,

          name:
            branch.name,

          code:
            branch.code,
        },

        stock: {
          quantity:
            branchStock
              ? branchStock.stockQuantity
              : 0,

          minimumStock:
            branchStock
              ? branchStock.minimumStock
              : 0,
        },

        transactions,
      });
    } catch (error) {
      console.error(
        "Get product inventory transactions error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch product inventory history.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| ADJUST INVENTORY
|--------------------------------------------------------------------------
*/

export const adjustInventory =
  async (
    req,
    res
  ) => {
    try {
      const {
        productId,
        type,
        quantity,
        reason = "",
        notes = "",
        clientAdjustmentId,
      } = req.body;

      const businessId =
        req.user.businessId;

      const userId =
        req.user._id;

      /*
       * Branch.
       */
      const branch =
        await resolveActiveBranch(req, req.body?.branchId);

      if (!branch) {
        return res.status(400).json({
          success: false,
          message:
            "No valid active branch is selected.",
        });
      }

      const branchId =
        branch._id;

      if (clientAdjustmentId !== undefined &&
        (typeof clientAdjustmentId !== "string" ||
          clientAdjustmentId.length < 8 ||
          clientAdjustmentId.length > 120)) {
        return res.status(400).json({ success: false, message: "Invalid offline adjustment ID." });
      }

      /*
       * Product ID.
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
            "Invalid product ID.",
        });
      }

      if (clientAdjustmentId) {
        const existingTransaction = await InventoryTransaction.findOne({
          businessId,
          branchId,
          clientAdjustmentId,
        });
        if (existingTransaction) {
          const isSameRequest =
            String(existingTransaction.userId) === String(userId) &&
            String(existingTransaction.productId) === String(productId) &&
            existingTransaction.type === type &&
            Number(existingTransaction.quantity) === Number(quantity);
          if (!isSameRequest) {
            return res.status(409).json({ success: false, message: "This offline adjustment ID was already used for a different change." });
          }
          return res.json({
            success: true,
            message: "Inventory adjustment was already synchronized.",
            transaction: existingTransaction,
            stock: { before: existingTransaction.stockBefore, after: existingTransaction.stockAfter },
            alreadySynced: true,
          });
        }
      }

      /*
       * Quantity.
       */
      const numericQuantity =
        Number(quantity);

      if (
        !Number.isInteger(
          numericQuantity
        ) ||
        numericQuantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Quantity must be a positive whole number.",
        });
      }

      /*
       * Allowed types.
       */
      const allowedTypes = [
        "OPENING_STOCK",
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
       * Product.
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
            "Product not found or inactive.",
        });
      }

      /*
       * Find or create branch stock.
       */
      let branchStock =
        await ProductBranchStock.findOne(
          {
            businessId,

            branchId,

            productId:
              product._id,

            isActive: true,
          }
        );

      if (!branchStock) {
        /*
         * For a brand-new branch stock record,
         * start at zero.
         *
         * This is safer than copying the global
         * product stock into every branch.
         */
        branchStock =
          await ProductBranchStock.create(
            {
              businessId,

              branchId,

              productId:
                product._id,

              stockQuantity:
                0,

              minimumStock:
                Number(
                  product.minimumStock ||
                    0
                ),

              isActive: true,
            }
          );
      }

      const stockBefore =
        Number(
          branchStock.stockQuantity
        );

      /*
       * Determine direction.
       */
      const isStockIncrease =
        type ===
          "OPENING_STOCK" ||
        type ===
          "STOCK_RECEIVED" ||
        type ===
          "ADJUSTMENT_IN";

      const isStockDecrease =
        type ===
          "ADJUSTMENT_OUT" ||
        type ===
          "DAMAGE" ||
        type ===
          "LOSS";

      let stockAfter;

      if (
        isStockIncrease
      ) {
        stockAfter =
          stockBefore +
          numericQuantity;
      } else if (
        isStockDecrease
      ) {
        stockAfter =
          stockBefore -
          numericQuantity;
      } else {
        return res.status(400).json({
          success: false,
          message:
            "Unable to determine inventory adjustment direction.",
        });
      }

      /*
       * Prevent negative stock.
       */
      if (
        stockAfter < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock. Available: ${stockBefore}.`,
        });
      }

      /*
       * Optimistic update.
       */
      const updatedBranchStock =
        await ProductBranchStock.findOneAndUpdate(
          {
            _id:
              branchStock._id,

            businessId,

            branchId,

            productId:
              product._id,

            isActive: true,

            stockQuantity:
              stockBefore,
          },

          {
            $set: {
              stockQuantity:
                stockAfter,
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
            "Stock changed while this adjustment was being processed. Please try again.",
        });
      }

      /*
       * Create ledger record.
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

              userId,

              type,

              quantity:
                numericQuantity,

              stockBefore,

              stockAfter,

              reason:
                String(
                  reason || ""
                ).trim(),

              referenceType:
                "ADJUSTMENT",

              referenceId:
                null,

              notes:
                String(
                  notes || ""
                ).trim(),
              ...(clientAdjustmentId ? { clientAdjustmentId } : {}),
            }
          );
      } catch (ledgerError) {
        /*
         * Roll back stock.
         */
        await ProductBranchStock.updateOne(
          {
            _id:
              branchStock._id,

            businessId,

            branchId,

            productId:
              product._id,

            stockQuantity:
              stockAfter,
          },

          {
            $set: {
              stockQuantity:
                stockBefore,
            },
          }
        );

        throw ledgerError;
      }

      return res.json({
        success: true,

        message:
          "Inventory adjusted successfully.",

        transaction,

        stock: {
          before:
            stockBefore,

          after:
            stockAfter,
        },

        branch: {
          id:
            branch._id,

          name:
            branch.name,

          code:
            branch.code,
        },
      });
    } catch (error) {
      if (error?.code === 11000 && req.body?.clientAdjustmentId) {
        const existingTransaction = await InventoryTransaction.findOne({
          businessId: req.user.businessId,
          clientAdjustmentId: req.body.clientAdjustmentId,
        }).catch(() => null);
        if (existingTransaction && String(existingTransaction.userId) === String(req.user._id)) {
          return res.json({
            success: true,
            message: "Inventory adjustment was already synchronized.",
            transaction: existingTransaction,
            stock: { before: existingTransaction.stockBefore, after: existingTransaction.stockAfter },
            alreadySynced: true,
          });
        }
      }
      console.error(
        "Adjust inventory error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to adjust inventory.",
      });
    }
  };
