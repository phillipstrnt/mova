import mongoose from "mongoose";

import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import InventoryTransaction from "../models/InventoryTransaction.js";

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
| CREATE SALE
|--------------------------------------------------------------------------
*/

export const createSale = async (
  req,
  res
) => {
  const session = await mongoose.startSession();

  try {
    const {
      items,
      discount = 0,
      paymentMethod,
      customerId = null,
      notes = "",
    } = req.body;

    const businessId =
      req.user.businessId;

    const branchId =
      req.user.branchId || null;

    const cashierId =
      req.user._id;

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

    const validPaymentMethods = [
      "CASH",
      "MOBILE_MONEY",
      "CARD",
      "BANK",
    ];

    if (
      !validPaymentMethods.includes(
        paymentMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid payment method.",
      });
    }

    const numericDiscount =
      Number(discount);

    if (
      Number.isNaN(numericDiscount) ||
      numericDiscount < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount must be a valid positive number.",
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
          message:
            "Invalid customer ID.",
        });
      }

      customer =
        await Customer.findOne({
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
    | NORMALIZE CART
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

      const quantity =
        Number(item.quantity);

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

      const product =
        await Product.findOne({
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

      /*
      |--------------------------------------------------------------------------
      | STOCK CHECK
      |--------------------------------------------------------------------------
      */

      if (
        product.trackStock &&
        product.stockQuantity < quantity
      ) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}.`,
        });
      }

      const unitPrice =
        Number(
          item.unitPrice ??
            product.sellingPrice
        );

      if (
        Number.isNaN(unitPrice) ||
        unitPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid selling price for ${product.name}.`,
        });
      }

      const itemSubtotal =
        unitPrice * quantity;

      subtotal += itemSubtotal;

      normalizedItems.push({
        product,
        productId: product._id,
        name: product.name,
        sku: product.sku,
        quantity,
        unitPrice,
        buyingPrice:
          product.buyingPrice,
        subtotal:
          itemSubtotal,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | DISCOUNT VALIDATION
    |--------------------------------------------------------------------------
    */

    if (
      numericDiscount >
      subtotal
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Discount cannot be greater than the sale subtotal.",
      });
    }

    const total =
      subtotal - numericDiscount;

    /*
    |--------------------------------------------------------------------------
    | START SESSION
    |--------------------------------------------------------------------------
    */

    session.startTransaction();

    /*
    |--------------------------------------------------------------------------
    | UPDATE STOCK
    |--------------------------------------------------------------------------
    */

    const inventoryEntries = [];

    for (const item of normalizedItems) {
      const product =
        item.product;

      /*
      | Products with stock tracking
      | get their stock reduced.
      */
      if (product.trackStock) {
        const updatedProduct =
          await Product.findOneAndUpdate(
            {
              _id: product._id,
              businessId,
              isActive: true,
              stockQuantity: {
                $gte: item.quantity,
              },
            },
            {
              $inc: {
                stockQuantity:
                  -item.quantity,
              },
            },
            {
              new: true,
              session,
            }
          );

        if (!updatedProduct) {
          throw new Error(
            `Insufficient stock for ${product.name}.`
          );
        }

        inventoryEntries.push({
          businessId,
          branchId,
          productId:
            product._id,
          userId: cashierId,
          type: "SALE",
          quantity:
            item.quantity,
          stockBefore:
            product.stockQuantity,
          stockAfter:
            updatedProduct.stockQuantity,
          reason:
            "Product sold",
          referenceType:
            "SALE",
          notes:
            `Sale of ${item.quantity} ${product.unit}(s).`,
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE SALE
    |--------------------------------------------------------------------------
    */

    const saleItems =
      normalizedItems.map(
        (item) => ({
          productId:
            item.productId,
          name: item.name,
          sku: item.sku,
          quantity:
            item.quantity,
          unitPrice:
            item.unitPrice,
          buyingPrice:
            item.buyingPrice,
          subtotal:
            item.subtotal,
        })
      );

    const receiptNumber =
      generateReceiptNumber();

    const saleDocuments =
      await Sale.create(
        [
          {
            businessId,
            branchId,
            cashierId,

            customerId:
              customer
                ? customer._id
                : null,

            receiptNumber,

            items: saleItems,

            subtotal,

            discount:
              numericDiscount,

            total,

            paymentMethod,

            paymentStatus:
              "PAID",

            status:
              "COMPLETED",

            notes,
          },
        ],
        {
          session,
        }
      );

    const sale =
      saleDocuments[0];

    /*
    |--------------------------------------------------------------------------
    | CREATE INVENTORY LEDGER
    |--------------------------------------------------------------------------
    */

    if (
      inventoryEntries.length > 0
    ) {
      for (const entry of inventoryEntries) {
        await InventoryTransaction.create(
          [
            {
              ...entry,
              referenceId:
                sale._id,
            },
          ],
          {
            session,
          }
        );
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
          },
        },
        {
          session,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | COMMIT TRANSACTION
    |--------------------------------------------------------------------------
    */

    await session.commitTransaction();

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,
      message:
        "Sale completed successfully.",
      sale: {
        id: sale._id,
        receiptNumber:
          sale.receiptNumber,
        customerId:
          sale.customerId,
        items:
          sale.items,
        subtotal:
          sale.subtotal,
        discount:
          sale.discount,
        total:
          sale.total,
        paymentMethod:
          sale.paymentMethod,
        paymentStatus:
          sale.paymentStatus,
        status:
          sale.status,
        createdAt:
          sale.createdAt,
      },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error(
      "Create sale error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to complete sale.",
    });
  } finally {
    await session.endSession();
  }
};

/*
|--------------------------------------------------------------------------
| GET SALES
|--------------------------------------------------------------------------
*/

export const getSales = async (
  req,
  res
) => {
  try {
    const {
      search = "",
      paymentMethod,
      status,
      cashierId,
      customerId,
      page = 1,
      limit = 20,
      startDate,
      endDate,
    } = req.query;

    const businessId =
      req.user.businessId;

    const filter = {
      businessId,
    };

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    if (search.trim()) {
      filter.receiptNumber = {
        $regex:
          search.trim(),
        $options: "i",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | FILTERS
    |--------------------------------------------------------------------------
    */

    if (paymentMethod) {
      filter.paymentMethod =
        paymentMethod;
    }

    if (status) {
      filter.status =
        status;
    }

    if (cashierId) {
      filter.cashierId =
        cashierId;
    }

    if (customerId) {
      filter.customerId =
        customerId;
    }

    /*
    |--------------------------------------------------------------------------
    | DATE FILTER
    |--------------------------------------------------------------------------
    */

    if (
      startDate ||
      endDate
    ) {
      filter.createdAt = {};

      if (startDate) {
        filter.createdAt.$gte =
          new Date(
            `${startDate}T00:00:00`
          );
      }

      if (endDate) {
        filter.createdAt.$lte =
          new Date(
            `${endDate}T23:59:59.999`
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
      sales,
      total,
    ] = await Promise.all([
      Sale.find(filter)
        .populate(
          "cashierId",
          "name email role"
        )
        .populate(
          "customerId",
          "name phone email"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Sale.countDocuments(
        filter
      ),
    ]);

    return res.json({
      success: true,
      sales,
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
      "Get sales error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch sales.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SALE BY ID
|--------------------------------------------------------------------------
*/

export const getSaleById = async (
  req,
  res
) => {
  try {
    const { id } =
      req.params;

    if (
      !mongoose.Types.ObjectId.isValid(
        id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid sale ID.",
      });
    }

    const sale =
      await Sale.findOne({
        _id: id,
        businessId:
          req.user.businessId,
      })
        .populate(
          "cashierId",
          "name email role"
        )
        .populate(
          "customerId",
          "name phone email address"
        );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message:
          "Sale not found.",
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
      message:
        "Failed to fetch sale.",
    });
  }
};