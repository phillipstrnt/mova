
import mongoose from "mongoose";

import Return from "../models/Return.js";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import InventoryTransaction from "../models/InventoryTransaction.js";

/*
|--------------------------------------------------------------------------
| Generate Return Number
|--------------------------------------------------------------------------
*/

const generateReturnNumber = async () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const prefix = `RET-${year}${month}${day}`;

  const latestReturn = await Return.findOne({
    returnNumber: new RegExp(`^${prefix}-`),
  }).sort({ createdAt: -1 });

  let sequence = 1;

  if (latestReturn?.returnNumber) {
    const parts = latestReturn.returnNumber.split("-");
    const lastSequence = Number(parts[parts.length - 1]);

    if (Number.isInteger(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }

  return `${prefix}-${String(sequence).padStart(4, "0")}`;
};

/*
|--------------------------------------------------------------------------
| GET ALL RETURNS
|--------------------------------------------------------------------------
*/

export const getReturns = async (req, res, next) => {
  try {
    const {
      saleId,
      status,
      refundMethod,
      search = "",
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    const query = {
      businessId: req.user.businessId,
    };

    /*
    |--------------------------------------------------------------------------
    | Sale Filter
    |--------------------------------------------------------------------------
    */

    if (saleId) {
      if (!mongoose.Types.ObjectId.isValid(saleId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid sale ID.",
        });
      }

      query.saleId = saleId;
    }

    /*
    |--------------------------------------------------------------------------
    | Status Filter
    |--------------------------------------------------------------------------
    */

    if (status) {
      query.status = status;
    }

    /*
    |--------------------------------------------------------------------------
    | Refund Method Filter
    |--------------------------------------------------------------------------
    */

    if (refundMethod) {
      query.refundMethod = refundMethod;
    }

    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */

    if (search.trim()) {
      query.returnNumber = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | Date Filter
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Pagination
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | Query Database
    |--------------------------------------------------------------------------
    */

    const [returns, total] = await Promise.all([
      Return.find(query)
        .populate(
          "saleId",
          "receiptNumber total status createdAt"
        )
        .populate(
          "userId",
          "name email role"
        )
        .populate(
          "customerId",
          "name phone email"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      Return.countDocuments(query),
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
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET RETURN BY ID
|--------------------------------------------------------------------------
*/

export const getReturnById = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid return ID.",
      });
    }

    const returnRecord =
      await Return.findOne({
        _id: id,
        businessId: req.user.businessId,
      })
        .populate(
          "saleId",
          "receiptNumber total status createdAt paymentMethod"
        )
        .populate(
          "userId",
          "name email role"
        )
        .populate(
          "customerId",
          "name phone email"
        )
        .populate(
          "items.productId",
          "name sku stockQuantity"
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
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET RETURNABLE ITEMS FOR A SALE
|--------------------------------------------------------------------------
|
| This endpoint tells the frontend:
|
| - How many units were sold
| - How many were already returned
| - How many are still returnable
|
|--------------------------------------------------------------------------
*/

export const getSaleReturnableItems = async (
  req,
  res,
  next
) => {
  try {
    const { saleId } = req.params;

    /*
    |--------------------------------------------------------------------------
    | Validate Sale ID
    |--------------------------------------------------------------------------
    */

    if (!mongoose.Types.ObjectId.isValid(saleId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid sale ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Sale
    |--------------------------------------------------------------------------
    */

    const sale = await Sale.findOne({
      _id: saleId,
      businessId: req.user.businessId,
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

    /*
    |--------------------------------------------------------------------------
    | Check Sale Status
    |--------------------------------------------------------------------------
    */

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
    |--------------------------------------------------------------------------
    | Get Previous Returns
    |--------------------------------------------------------------------------
    */

    const previousReturns =
      await Return.find({
        businessId: req.user.businessId,
        saleId: sale._id,
        status: "COMPLETED",
      }).lean();

    /*
    |--------------------------------------------------------------------------
    | Calculate Returned Quantities
    |--------------------------------------------------------------------------
    */

    const returnedQuantities = {};

    for (const returnRecord of previousReturns) {
      for (const item of returnRecord.items) {
        const productId =
          item.productId.toString();

        returnedQuantities[productId] =
          (returnedQuantities[productId] || 0) +
          Number(item.quantity);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Build Returnable Items
    |--------------------------------------------------------------------------
    */

    const items = sale.items.map((item) => {
      const productId =
        item.productId?.toString();

      const soldQuantity = Number(
        item.quantity
      );

      const alreadyReturned =
        returnedQuantities[productId] || 0;

      const returnableQuantity = Math.max(
        soldQuantity - alreadyReturned,
        0
      );

      return {
        productId,

        productName:
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
      };
    });

    return res.json({
      success: true,

      sale: {
        _id: sale._id,
        receiptNumber: sale.receiptNumber,
        subtotal: sale.subtotal,
        discount: sale.discount,
        total: sale.total,
        status: sale.status,
        createdAt: sale.createdAt,
      },

      items,
    });
  } catch (error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| CREATE RETURN
|--------------------------------------------------------------------------
*/

export const createReturn = async (
  req,
  res,
  next
) => {
  const stockChanges = [];
  let createdReturn = null;
  let ledgerCreated = false;

  try {
    const {
      saleId,
      items,
      refundMethod,
      reason = "",
      notes = "",
    } = req.body;

    /*
    |--------------------------------------------------------------------------
    | Validate Sale ID
    |--------------------------------------------------------------------------
    */

    if (
      !saleId ||
      !mongoose.Types.ObjectId.isValid(
        saleId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid sale ID is required.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Items
    |--------------------------------------------------------------------------
    */

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "At least one product must be returned.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Refund Method
    |--------------------------------------------------------------------------
    */

    const allowedRefundMethods = [
      "CASH",
      "MOBILE_MONEY",
      "CARD",
      "BANK",
      "STORE_CREDIT",
    ];

    if (
      !allowedRefundMethods.includes(
        refundMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid refund method.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Sale
    |--------------------------------------------------------------------------
    */

    const sale = await Sale.findOne({
      _id: saleId,
      businessId: req.user.businessId,
    });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Sale Status
    |--------------------------------------------------------------------------
    */

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
    |--------------------------------------------------------------------------
    | Find Previous Returns
    |--------------------------------------------------------------------------
    */

    const previousReturns =
      await Return.find({
        businessId: req.user.businessId,
        saleId: sale._id,
        status: "COMPLETED",
      }).lean();

    /*
    |--------------------------------------------------------------------------
    | Calculate Previously Returned Quantity
    |--------------------------------------------------------------------------
    */

    const returnedQuantities = {};

    for (const returnRecord of previousReturns) {
      for (const item of returnRecord.items) {
        const productId =
          item.productId.toString();

        returnedQuantities[productId] =
          (returnedQuantities[productId] || 0) +
          Number(item.quantity);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Build Sale Item Lookup
    |--------------------------------------------------------------------------
    */

    const saleItems = {};

    for (const saleItem of sale.items) {
      const productId =
        saleItem.productId?.toString();

      if (!productId) {
        continue;
      }

      saleItems[productId] = saleItem;
    }

    /*
    |--------------------------------------------------------------------------
    | Prevent Duplicate Products
    |--------------------------------------------------------------------------
    */

    const requestedProductIds =
      items.map(
        (item) =>
          item.productId?.toString()
      );

    const uniqueProductIds =
      new Set(requestedProductIds);

    if (
      uniqueProductIds.size !==
      requestedProductIds.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Each product should appear only once in a return.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate And Normalize Items
    |--------------------------------------------------------------------------
    */

    const normalizedItems = [];

    for (const requestedItem of items) {
      const productId =
        requestedItem.productId;

      /*
      |--------------------------------------------------------------------------
      | Validate Product ID
      |--------------------------------------------------------------------------
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
            "Every returned item must have a valid product ID.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Check Product Was Sold
      |--------------------------------------------------------------------------
      */

      const saleItem =
        saleItems[productId];

      if (!saleItem) {
        return res.status(400).json({
          success: false,
          message:
            "A product in the return was not part of the original sale.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Validate Quantity
      |--------------------------------------------------------------------------
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
            "Return quantity must be a whole number greater than zero.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Calculate Returnable Quantity
      |--------------------------------------------------------------------------
      */

      const soldQuantity = Number(
        saleItem.quantity
      );

      const alreadyReturned =
        returnedQuantities[productId] || 0;

      const returnableQuantity = Math.max(
        soldQuantity - alreadyReturned,
        0
      );

      /*
      |--------------------------------------------------------------------------
      | Prevent Over-Returning
      |--------------------------------------------------------------------------
      */

      if (
        quantity > returnableQuantity
      ) {
        return res.status(400).json({
          success: false,
          message: `Cannot return ${quantity} unit(s) of ${saleItem.name}. Only ${returnableQuantity} unit(s) are still returnable.`,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Find Product
      |--------------------------------------------------------------------------
      */

      const product = await Product.findOne({
        _id: productId,
        businessId: req.user.businessId,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            `Product "${saleItem.name}" was not found.`,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | Calculate Price
      |--------------------------------------------------------------------------
      */

      const unitPrice = Number(
        saleItem.unitPrice || 0
      );

      const total =
        unitPrice * quantity;

      /*
      |--------------------------------------------------------------------------
      | Add Normalized Item
      |--------------------------------------------------------------------------
      */

      normalizedItems.push({
        productId: product._id,

        productName:
          saleItem.name ||
          product.name,

        sku:
          saleItem.sku ||
          product.sku,

        quantity,

        unitPrice,

        total,

        reason:
          requestedItem.reason ||
          reason ||
          "",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Calculate Refund
    |--------------------------------------------------------------------------
    */

    const subtotal =
      normalizedItems.reduce(
        (sum, item) =>
          sum + item.total,
        0
      );

    const refundAmount = subtotal;

    /*
    |--------------------------------------------------------------------------
    | Restore Inventory
    |--------------------------------------------------------------------------
    */

    for (const item of normalizedItems) {
      const product =
        await Product.findOne({
          _id: item.productId,
          businessId:
            req.user.businessId,
        });

      if (!product) {
        throw new Error(
          `Product "${item.productName}" was not found.`
        );
      }

      const stockBefore = Number(
        product.stockQuantity
      );

      const stockAfter =
        stockBefore + item.quantity;

      /*
      |--------------------------------------------------------------------------
      | Atomic Stock Update
      |--------------------------------------------------------------------------
      */

      const updatedProduct =
        await Product.findOneAndUpdate(
          {
            _id: item.productId,
            businessId:
              req.user.businessId,

            stockQuantity:
              stockBefore,
          },
          {
            $inc: {
              stockQuantity:
                item.quantity,
            },
          },
          {
            new: true,
          }
        );

      if (!updatedProduct) {
        throw new Error(
          `Inventory changed while returning "${item.productName}". Please try again.`
        );
      }

      stockChanges.push({
        productId: item.productId,
        quantity: item.quantity,
        stockBefore,
        stockAfter,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Generate Return Number
    |--------------------------------------------------------------------------
    */

    const returnNumber =
      await generateReturnNumber();

    /*
    |--------------------------------------------------------------------------
    | Create Return Record
    |--------------------------------------------------------------------------
    */

    createdReturn =
      await Return.create({
        businessId:
          req.user.businessId,

        branchId:
          req.user.branchId || null,

        saleId: sale._id,

        customerId:
          sale.customerId || null,

        userId:
          req.user._id,

        returnNumber,

        items: normalizedItems,

        subtotal,

        refundAmount,

        refundMethod,

        reason,

        status: "COMPLETED",

        notes,
      });

    /*
    |--------------------------------------------------------------------------
    | Create Inventory Ledger Records
    |--------------------------------------------------------------------------
    */

    try {
      for (const change of stockChanges) {
        const returnedItem =
          normalizedItems.find(
            (item) =>
              item.productId.toString() ===
              change.productId.toString()
          );

        await InventoryTransaction.create({
          businessId:
            req.user.businessId,

          branchId:
            req.user.branchId || null,

          productId:
            change.productId,

          userId:
            req.user._id,

          type: "RETURN",

          quantity:
            change.quantity,

          stockBefore:
            change.stockBefore,

          stockAfter:
            change.stockAfter,

          reason:
            returnedItem?.reason ||
            reason ||
            "Product returned",

          referenceType: "RETURN",

          referenceId:
            createdReturn._id,

          notes:
            `Stock restored through return ${returnNumber}`,
        });
      }

      ledgerCreated = true;
    } catch (ledgerError) {
      /*
      |--------------------------------------------------------------------------
      | Remove Any Ledger Entries Already Created
      |--------------------------------------------------------------------------
      */

      if (createdReturn) {
        await InventoryTransaction.deleteMany({
          referenceType: "RETURN",
          referenceId:
            createdReturn._id,
          businessId:
            req.user.businessId,
        });
      }

      throw ledgerError;
    }

    /*
    |--------------------------------------------------------------------------
    | Calculate Total Returned Quantity
    |--------------------------------------------------------------------------
    */

    let totalReturnedQuantity = 0;

    const allCompletedReturns =
      await Return.find({
        businessId: req.user.businessId,
        saleId: sale._id,
        status: "COMPLETED",
      }).lean();

    for (const returnRecord of allCompletedReturns) {
      for (const item of returnRecord.items) {
        totalReturnedQuantity +=
          Number(item.quantity);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Calculate Total Sold Quantity
    |--------------------------------------------------------------------------
    */

    const totalSoldQuantity =
      sale.items.reduce(
        (sum, item) =>
          sum + Number(item.quantity),
        0
      );

    /*
    |--------------------------------------------------------------------------
    | Determine New Sale Status
    |--------------------------------------------------------------------------
    */

    let newSaleStatus =
      "PARTIALLY_REFUNDED";

    if (
      totalReturnedQuantity >=
      totalSoldQuantity
    ) {
      newSaleStatus = "REFUNDED";
    }

    /*
    |--------------------------------------------------------------------------
    | Update Sale
    |--------------------------------------------------------------------------
    */

    await Sale.updateOne(
      {
        _id: sale._id,
        businessId:
          req.user.businessId,
      },
      {
        $set: {
          status: newSaleStatus,
        },
      }
    );

    /*
    |--------------------------------------------------------------------------
    | Update Payment Status
    |--------------------------------------------------------------------------
    |
    | A full return means the original sale has been fully
    | refunded.
    |
    */

    if (newSaleStatus === "REFUNDED") {
      await Sale.updateOne(
        {
          _id: sale._id,
          businessId:
            req.user.businessId,
        },
        {
          $set: {
            paymentStatus: "REFUNDED",
          },
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Success Response
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,

      message:
        "Return processed successfully.",

      return: createdReturn,

      saleStatus: newSaleStatus,

      inventoryRestored:
        stockChanges.map(
          (change) => ({
            productId:
              change.productId,

            quantity:
              change.quantity,

            stockBefore:
              change.stockBefore,

            stockAfter:
              change.stockAfter,
          })
        ),
    });
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | Roll Back Inventory
    |--------------------------------------------------------------------------
    |
    | If something failed after stock was restored,
    | restore the previous inventory state.
    |
    */

    if (stockChanges.length > 0) {
      for (const change of stockChanges) {
        try {
          await Product.updateOne(
            {
              _id:
                change.productId,

              businessId:
                req.user.businessId,

              stockQuantity:
                change.stockAfter,
            },
            {
              $inc: {
                stockQuantity:
                  -change.quantity,
              },
            }
          );
        } catch (rollbackError) {
          console.error(
            "Return inventory rollback failed:",
            rollbackError
          );
        }
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Remove Created Ledger Entries
    |--------------------------------------------------------------------------
    */

    if (createdReturn) {
      try {
        await InventoryTransaction.deleteMany({
          referenceType: "RETURN",
          referenceId:
            createdReturn._id,
          businessId:
            req.user.businessId,
        });
      } catch (ledgerCleanupError) {
        console.error(
          "Return ledger cleanup failed:",
          ledgerCleanupError
        );
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Remove Return Record
    |--------------------------------------------------------------------------
    */

    if (createdReturn) {
      try {
        await Return.deleteOne({
          _id: createdReturn._id,
        });
      } catch (returnCleanupError) {
        console.error(
          "Return cleanup failed:",
          returnCleanupError
        );
      }
    }

    console.error(
      "Create return error:",
      error
    );

    next(error);
  }
};
