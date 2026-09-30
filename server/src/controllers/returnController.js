import mongoose from "mongoose";

import Return from "../models/Return.js";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import InventoryTransaction from "../models/InventoryTransaction.js";

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

const getObjectIdString = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (typeof value === "object") {
    if (value._id) {
      return getObjectIdString(value._id);
    }

    if (value.$oid) {
      return String(value.$oid);
    }
  }

  return "";
};

const getSaleItemProductId = (saleItem) => {
  if (!saleItem) {
    return "";
  }

  /*
   * Sale items have _id: false.
   *
   * Therefore the only valid product ID is
   * saleItem.productId.
   */
  return getObjectIdString(saleItem.productId);
};

/*
|--------------------------------------------------------------------------
| Generate Return Number
|--------------------------------------------------------------------------
*/

const generateReturnNumber = async () => {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const prefix = `RET-${year}${month}${day}-`;

  const lastReturn = await Return.findOne({
    returnNumber: {
      $regex: `^${prefix}`,
    },
  })
    .sort({
      returnNumber: -1,
    })
    .lean();

  let nextNumber = 1;

  if (lastReturn?.returnNumber) {
    const lastNumber = Number(
      lastReturn.returnNumber.split("-").pop()
    );

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${String(
    nextNumber
  ).padStart(4, "0")}`;
};

/*
|--------------------------------------------------------------------------
| GET ALL RETURNS
|--------------------------------------------------------------------------
*/

export const getReturns = async (req, res) => {
  try {
    const {
      saleId,
      status,
      refundMethod,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const businessId = req.user.businessId;

    const filter = {
      businessId,
    };

    if (saleId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          saleId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid sale ID.",
        });
      }

      filter.saleId = saleId;
    }

    if (status) {
      filter.status = status;
    }

    if (refundMethod) {
      filter.refundMethod = refundMethod;
    }

    if (search?.trim()) {
      filter.$or = [
        {
          returnNumber: {
            $regex: search.trim(),
            $options: "i",
          },
        },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        filter.createdAt.$gte =
          new Date(startDate);
      }

      if (endDate) {
        const end = new Date(endDate);

        end.setHours(
          23,
          59,
          59,
          999
        );

        filter.createdAt.$lte = end;
      }
    }

    const pageNumber = Math.max(
      Number(page) || 1,
      1
    );

    const limitNumber = Math.min(
      Math.max(
        Number(limit) || 20,
        1
      ),
      100
    );

    const skip =
      (pageNumber - 1) * limitNumber;

    const [returns, total] =
      await Promise.all([
        Return.find(filter)
          .populate(
            "saleId",
            "receiptNumber total createdAt status"
          )
          .populate(
            "userId",
            "name email"
          )
          .populate(
            "customerId",
            "name phone"
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limitNumber)
          .lean(),

        Return.countDocuments(filter),
      ]);

    return res.json({
      success: true,
      returns,
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
      "Get returns error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to load returns.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE RETURN
|--------------------------------------------------------------------------
*/

export const getReturnById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid return ID.",
      });
    }

    const returnRecord =
      await Return.findOne({
        _id: id,
        businessId:
          req.user.businessId,
      })
        .populate(
          "saleId",
          "receiptNumber items subtotal discount total paymentMethod status createdAt"
        )
        .populate(
          "userId",
          "name email"
        )
        .populate(
          "customerId",
          "name phone"
        )
        .populate(
          "items.productId",
          "name sku sellingPrice stockQuantity"
        );

    if (!returnRecord) {
      return res.status(404).json({
        success: false,
        message: "Return not found.",
      });
    }

    return res.json({
      success: true,
      return: returnRecord,
    });
  } catch (error) {
    console.error(
      "Get return by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to load return.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET RETURNABLE ITEMS FOR A SALE
|--------------------------------------------------------------------------
*/

export const getSaleReturnableItems =
  async (req, res) => {
    try {
      const { saleId } = req.params;

      const businessId =
        req.user.businessId;

      if (
        !mongoose.Types.ObjectId.isValid(
          saleId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid sale ID.",
        });
      }

      const sale =
        await Sale.findOne({
          _id: saleId,
          businessId,
        }).populate(
          "items.productId",
          "name sku sellingPrice stockQuantity"
        );

      if (!sale) {
        return res.status(404).json({
          success: false,
          message: "Sale not found.",
        });
      }

      if (sale.status === "CANCELLED") {
        return res.status(400).json({
          success: false,
          message:
            "Cancelled sales cannot be returned.",
        });
      }

      if (sale.status === "REFUNDED") {
        return res.status(400).json({
          success: false,
          message:
            "This sale has already been fully refunded.",
        });
      }

      /*
       * Find all completed returns for this sale.
       */
      const previousReturns =
        await Return.find({
          saleId: sale._id,
          businessId,
          status: "COMPLETED",
        }).lean();

      /*
       * Calculate quantities already returned
       * for each product.
       */
      const returnedQuantities = {};

      for (const returnRecord of previousReturns) {
        for (
          const item of
            returnRecord.items || []
        ) {
          const productId =
            getObjectIdString(
              item.productId
            );

          if (!productId) {
            continue;
          }

          returnedQuantities[
            productId
          ] =
            (returnedQuantities[
              productId
            ] || 0) +
            Number(item.quantity || 0);
        }
      }

      const items = sale.items.map(
        (item) => {
          const productId =
            getSaleItemProductId(item);

          const soldQuantity = Number(
            item.quantity || 0
          );

          if (!productId) {
            return {
              productId: null,

              productName:
                item.name ||
                "Unknown product",

              name:
                item.name ||
                "Unknown product",

              sku:
                item.sku || "",

              soldQuantity,

              alreadyReturned: 0,

              returnableQuantity: 0,

              unitPrice: Number(
                item.unitPrice || 0
              ),

              invalidProductId: true,
            };
          }

          const alreadyReturned =
            returnedQuantities[
              productId
            ] || 0;

          const returnableQuantity =
            Math.max(
              soldQuantity -
                alreadyReturned,
              0
            );

          return {
            productId,

            productName:
              item.name ||
              item.productId?.name ||
              "Unknown product",

            name:
              item.name ||
              item.productId?.name ||
              "Unknown product",

            sku:
              item.sku ||
              item.productId?.sku ||
              "",

            soldQuantity,

            alreadyReturned,

            returnableQuantity,

            unitPrice: Number(
              item.unitPrice || 0
            ),

            invalidProductId: false,
          };
        }
      );

      return res.json({
        success: true,

        sale: {
          _id: sale._id,
          receiptNumber:
            sale.receiptNumber,
          status: sale.status,
          subtotal: sale.subtotal,
          discount: sale.discount,
          total: sale.total,
          paymentMethod:
            sale.paymentMethod,
          createdAt: sale.createdAt,
        },

        items,
      });
    } catch (error) {
      console.error(
        "Get sale returnable items error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to load returnable items.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| CREATE RETURN
|--------------------------------------------------------------------------
*/

export const createReturn = async (
  req,
  res
) => {
  const {
    saleId,
    items,
    refundMethod,
    reason,
    notes = "",
  } = req.body;

  const businessId =
    req.user.businessId;

  const userId =
    req.user._id || req.user.id;

  /*
   * Keep track of inventory changes so
   * everything can be rolled back if
   * something fails.
   */
  const stockChanges = [];

  let createdReturn = null;

  let createdInventoryTransactions =
    [];

  try {
    /*
     * ---------------------------------------------------------------
     * BASIC VALIDATION
     * ---------------------------------------------------------------
     */

    if (
      !saleId ||
      !mongoose.Types.ObjectId.isValid(
        saleId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A valid sale ID is required.",
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one item must be returned.",
      });
    }

    if (!refundMethod) {
      return res.status(400).json({
        success: false,
        message:
          "Refund method is required.",
      });
    }

    if (!reason?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "Return reason is required.",
      });
    }

    /*
     * ---------------------------------------------------------------
     * LOAD SALE
     * ---------------------------------------------------------------
     */

    const sale =
      await Sale.findOne({
        _id: saleId,
        businessId,
      });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found.",
      });
    }

    if (sale.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message:
          "Cancelled sales cannot be returned.",
      });
    }

    if (sale.status === "REFUNDED") {
      return res.status(400).json({
        success: false,
        message:
          "This sale has already been fully refunded.",
      });
    }

    /*
     * ---------------------------------------------------------------
     * GET PREVIOUS RETURNS
     * ---------------------------------------------------------------
     */

    const previousReturns =
      await Return.find({
        saleId: sale._id,
        businessId,
        status: "COMPLETED",
      }).lean();

    const previouslyReturned = {};

    for (const previousReturn of previousReturns) {
      for (
        const item of
          previousReturn.items || []
      ) {
        const productId =
          getObjectIdString(
            item.productId
          );

        if (!productId) {
          continue;
        }

        previouslyReturned[
          productId
        ] =
          (previouslyReturned[
            productId
          ] || 0) +
          Number(item.quantity || 0);
      }
    }

    /*
     * ---------------------------------------------------------------
     * BUILD SALE ITEM LOOKUP
     * ---------------------------------------------------------------
     */

    const saleItemsByProductId =
      new Map();

    for (const saleItem of sale.items) {
      const productId =
        getSaleItemProductId(
          saleItem
        );

      if (!productId) {
        continue;
      }

      saleItemsByProductId.set(
        productId,
        saleItem
      );
    }

    /*
     * ---------------------------------------------------------------
     * CHECK DUPLICATE PRODUCTS
     * ---------------------------------------------------------------
     */

    const requestedProductIds =
      new Set();

    for (const requestedItem of items) {
      const productId =
        getObjectIdString(
          requestedItem?.productId
        );

      if (!productId) {
        return res.status(400).json({
          success: false,
          message:
            "Every returned item must have a valid product ID.",
        });
      }

      if (
        !mongoose.Types.ObjectId.isValid(
          productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Every returned item must have a valid product ID.",
        });
      }

      if (
        requestedProductIds.has(
          productId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The same product cannot appear more than once in a return.",
        });
      }

      requestedProductIds.add(
        productId
      );
    }

    /*
     * ---------------------------------------------------------------
     * NORMALIZE RETURN ITEMS
     * ---------------------------------------------------------------
     */

    const normalizedItems = [];

    let refundAmount = 0;

    for (const requestedItem of items) {
      const productId =
        getObjectIdString(
          requestedItem.productId
        );

      /*
       * Make sure this product was
       * actually part of the sale.
       */
      const saleItem =
        saleItemsByProductId.get(
          productId
        );

      if (!saleItem) {
        return res.status(400).json({
          success: false,
          message:
            "One or more returned products were not part of this sale.",
        });
      }

      /*
       * Validate quantity.
       */
      const quantity = Number(
        requestedItem.quantity
      );

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Return quantity must be a positive whole number.",
        });
      }

      const soldQuantity = Number(
        saleItem.quantity || 0
      );

      const alreadyReturned =
        previouslyReturned[
          productId
        ] || 0;

      const returnableQuantity =
        Math.max(
          soldQuantity -
            alreadyReturned,
          0
        );

      if (
        quantity >
        returnableQuantity
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot return ${quantity} unit(s) of ${saleItem.name}. Only ${returnableQuantity} unit(s) are available for return.`,
        });
      }

      /*
       * -------------------------------------------------------------
       * LOAD PRODUCT
       * -------------------------------------------------------------
       */

      const product =
        await Product.findOne({
          _id: productId,
          businessId,
        });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${saleItem.name} was not found.`,
        });
      }

      /*
       * Use the original sale price.
       */
      const unitPrice = Number(
        saleItem.unitPrice || 0
      );

      const subtotal =
        unitPrice * quantity;

      refundAmount += subtotal;

      /*
       * Return schema requires:
       *
       * productId
       * name
       * sku
       * quantity
       * unitPrice
       * subtotal
       */
      normalizedItems.push({
        productId,

        name:
          saleItem.name ||
          product.name ||
          "Unknown product",

        sku:
          saleItem.sku ||
          product.sku ||
          "N/A",

        quantity,

        unitPrice,

        subtotal,
      });

      /*
       * -------------------------------------------------------------
       * RESTORE INVENTORY
       * -------------------------------------------------------------
       */

      /*
       * This is the important part of the fix.
       *
       * stockBefore = current stock before
       * adding the returned quantity.
       *
       * stockAfter = stockBefore + returned quantity.
       */
      const stockBefore = Number(
        product.stockQuantity || 0
      );

      const stockAfter =
        stockBefore + quantity;

      /*
       * Update product stock.
       */
      const updatedProduct =
        await Product.findOneAndUpdate(
          {
            _id: productId,
            businessId,
            stockQuantity:
              stockBefore,
          },
          {
            $inc: {
              stockQuantity:
                quantity,
            },
          },
          {
            new: true,
          }
        );

      if (!updatedProduct) {
        throw new Error(
          `Stock for ${saleItem.name} changed before the return could be completed. Please try again.`
        );
      }

      /*
       * Save the exact stock movement.
       * This is also used if rollback is necessary.
       */
      stockChanges.push({
        productId,
        quantity,
        stockBefore,
        stockAfter,
      });
    }

    /*
     * ---------------------------------------------------------------
     * CREATE RETURN NUMBER
     * ---------------------------------------------------------------
     */

    const returnNumber =
      await generateReturnNumber();

    /*
     * ---------------------------------------------------------------
     * CREATE RETURN
     * ---------------------------------------------------------------
     */

    createdReturn =
      await Return.create({
        businessId,

        branchId:
          sale.branchId || null,

        saleId: sale._id,

        customerId:
          sale.customerId || null,

        userId,

        returnNumber,

        items: normalizedItems,

        subtotal: refundAmount,

        refundAmount,

        refundMethod,

        reason: reason.trim(),

        status: "COMPLETED",

        notes:
          typeof notes === "string"
            ? notes.trim()
            : "",
      });

    /*
     * ---------------------------------------------------------------
     * CREATE INVENTORY TRANSACTIONS
     * ---------------------------------------------------------------
     */

    /*
     * IMPORTANT FIX:
     *
     * InventoryTransaction requires:
     *
     * stockBefore
     * stockAfter
     *
     * We saved those values in stockChanges
     * above, so we use them here.
     */
    for (
      const stockChange of stockChanges
    ) {
      const transaction =
        await InventoryTransaction.create(
          {
            businessId,

            branchId:
              sale.branchId || null,

            productId:
              stockChange.productId,

            userId,

            type: "RETURN",

            quantity:
              stockChange.quantity,

            stockBefore:
              stockChange.stockBefore,

            stockAfter:
              stockChange.stockAfter,

            referenceType: "RETURN",

            referenceId:
              createdReturn._id,

            reason:
              `Customer return - ${reason.trim()}`,

            notes:
              `Return ${returnNumber}`,
          }
        );

      createdInventoryTransactions.push(
        transaction
      );
    }

    /*
     * ---------------------------------------------------------------
     * DETERMINE NEW SALE STATUS
     * ---------------------------------------------------------------
     */

    const finalReturnedQuantities = {
      ...previouslyReturned,
    };

    for (
      const item of normalizedItems
    ) {
      const productId =
        getObjectIdString(
          item.productId
        );

      finalReturnedQuantities[
        productId
      ] =
        (finalReturnedQuantities[
          productId
        ] || 0) +
        Number(item.quantity || 0);
    }

    let fullyRefunded = true;

    for (const saleItem of sale.items) {
      const productId =
        getSaleItemProductId(
          saleItem
        );

      if (!productId) {
        fullyRefunded = false;
        break;
      }

      const soldQuantity = Number(
        saleItem.quantity || 0
      );

      const returnedQuantity =
        Number(
          finalReturnedQuantities[
            productId
          ] || 0
        );

      if (
        returnedQuantity <
        soldQuantity
      ) {
        fullyRefunded = false;
        break;
      }
    }

    const newStatus = fullyRefunded
      ? "REFUNDED"
      : "PARTIALLY_REFUNDED";

    /*
     * ---------------------------------------------------------------
     * UPDATE SALE
     * ---------------------------------------------------------------
     */

    sale.status = newStatus;

    if (fullyRefunded) {
      sale.paymentStatus =
        "REFUNDED";
    }

    await sale.save();

    /*
     * ---------------------------------------------------------------
     * SUCCESS
     * ---------------------------------------------------------------
     */

    return res.status(201).json({
      success: true,

      message:
        "Return processed successfully.",

      return: createdReturn,

      saleStatus: newStatus,

      inventoryRestored: true,
    });
  } catch (error) {
    console.error(
      "Create return error:",
      error
    );

    /*
     * ---------------------------------------------------------------
     * ROLLBACK RETURN
     * ---------------------------------------------------------------
     */

    try {
      if (createdReturn?._id) {
        await Return.deleteOne({
          _id: createdReturn._id,
        });
      }
    } catch (rollbackError) {
      console.error(
        "Failed to rollback return record:",
        rollbackError
      );
    }

    /*
     * ---------------------------------------------------------------
     * ROLLBACK INVENTORY TRANSACTIONS
     * ---------------------------------------------------------------
     */

    try {
      if (
        createdInventoryTransactions.length >
        0
      ) {
        await InventoryTransaction.deleteMany(
          {
            _id: {
              $in:
                createdInventoryTransactions.map(
                  (transaction) =>
                    transaction._id
                ),
            },
          }
        );
      }
    } catch (rollbackError) {
      console.error(
        "Failed to rollback inventory transactions:",
        rollbackError
      );
    }

    /*
     * ---------------------------------------------------------------
     * ROLLBACK STOCK
     * ---------------------------------------------------------------
     */

    try {
      for (
        const change of stockChanges
      ) {
        /*
         * Instead of blindly subtracting,
         * restore the exact stockBefore value.
         *
         * This is safer if the transaction
         * failed after multiple products.
         */
        await Product.findOneAndUpdate(
          {
            _id: change.productId,
            businessId,
          },
          {
            $set: {
              stockQuantity:
                change.stockBefore,
            },
          }
        );
      }
    } catch (rollbackError) {
      console.error(
        "Failed to rollback product stock:",
        rollbackError
      );
    }

    /*
     * ---------------------------------------------------------------
     * RETURN ERROR
     * ---------------------------------------------------------------
     */

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to process return.",
    });
  }
};