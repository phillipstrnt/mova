import mongoose from "mongoose";

import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import Customer from "../models/Customer.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Payment from "../models/Payment.js";

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
        message:
          "Invalid payment method.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | DISCOUNT VALIDATION
    |--------------------------------------------------------------------------
    */

    const numericDiscount =
      Number(discount);

    if (
      !Number.isFinite(
        numericDiscount
      ) ||
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
      /*
      |--------------------------------------------------------------------------
      | PRODUCT ID
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | QUANTITY
      |--------------------------------------------------------------------------
      */

      const quantity =
        Number(item.quantity);

      if (
        !Number.isInteger(
          quantity
        ) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Product quantity must be a positive whole number.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | FIND PRODUCT
      |--------------------------------------------------------------------------
      */

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
        product.stockQuantity <
          quantity
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock for ${product.name}. ` +
            `Available: ${product.stockQuantity}.`,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | USE SERVER-SIDE SELLING PRICE
      |--------------------------------------------------------------------------
      |
      | We deliberately use the product's current
      | selling price rather than trusting a price
      | sent from the browser.
      |
      */

      const unitPrice =
        Number(
          product.sellingPrice
        );

      if (
        !Number.isFinite(
          unitPrice
        ) ||
        unitPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Invalid selling price for ${product.name}.`,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | ITEM SUBTOTAL
      |--------------------------------------------------------------------------
      */

      const itemSubtotal =
        unitPrice * quantity;

      subtotal += itemSubtotal;

      /*
      |--------------------------------------------------------------------------
      | STORE NORMALIZED ITEM
      |--------------------------------------------------------------------------
      */

      normalizedItems.push({
        product,

        productId:
          product._id,

        name:
          product.name,

        sku:
          product.sku,

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
    | DISCOUNT CHECK
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

    /*
    |--------------------------------------------------------------------------
    | CALCULATE TOTAL
    |--------------------------------------------------------------------------
    */

    const total =
      subtotal -
      numericDiscount;

    /*
    |--------------------------------------------------------------------------
    | PREPARE SALE ITEMS
    |--------------------------------------------------------------------------
    */

    const saleItems =
      normalizedItems.map(
        (item) => ({
          productId:
            item.productId,

          name:
            item.name,

          sku:
            item.sku,

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

    /*
    |--------------------------------------------------------------------------
    | GENERATE RECEIPT
    |--------------------------------------------------------------------------
    */

    const receiptNumber =
      generateReceiptNumber();

    /*
    |--------------------------------------------------------------------------
    | UPDATE STOCK
    |--------------------------------------------------------------------------
    */

    const inventoryEntries = [];

    for (
      const item of normalizedItems
    ) {
      const product =
        item.product;

      if (
        product.trackStock
      ) {
        const updatedProduct =
          await Product.findOneAndUpdate(
            {
              _id:
                product._id,

              businessId,

              isActive:
                true,

              stockQuantity: {
                $gte:
                  item.quantity,
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
            }
          );

        if (
          !updatedProduct
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Insufficient stock for ${product.name}.`,
          });
        }

        inventoryEntries.push({
          businessId,

          branchId,

          productId:
            product._id,

          userId:
            cashierId,

          type:
            "SALE",

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

    const sale =
      await Sale.create({
        businessId,

        branchId,

        cashierId,

        customerId:
          customer
            ? customer._id
            : null,

        receiptNumber,

        items:
          saleItems,

        subtotal,

        discount:
          numericDiscount,

        total,

        paymentMethod,

        paymentStatus:
          "PAID",

        status:
          "COMPLETED",

        notes:
          typeof notes === "string"
            ? notes.trim()
            : "",
      });

    /*
    |--------------------------------------------------------------------------
    | CREATE INVENTORY LEDGER
    |--------------------------------------------------------------------------
    */

    if (
      inventoryEntries.length >
      0
    ) {
      for (
        const entry of
          inventoryEntries
      ) {
        await InventoryTransaction.create({
          ...entry,

          referenceId:
            sale._id,
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE PAYMENT RECORD
    |--------------------------------------------------------------------------
    |
    | Every completed POS sale automatically
    | receives a corresponding payment record.
    |
    */

    const payment =
      await Payment.create({
        businessId,

        branchId,

        saleId:
          sale._id,

        customerId:
          customer
            ? customer._id
            : null,

        receivedBy:
          cashierId,

        amount:
          total,

        paymentMethod,

        reference:
          "",

        notes:
          `Payment for receipt ${receiptNumber}`,

        status:
          "COMPLETED",

        paymentDate:
          new Date(),
      });

    /*
    |--------------------------------------------------------------------------
    | UPDATE CUSTOMER STATISTICS
    |--------------------------------------------------------------------------
    */

    if (customer) {
      await Customer.updateOne(
        {
          _id:
            customer._id,

          businessId,
        },
        {
          $inc: {
            totalOrders:
              1,

            totalSpent:
              total,
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

      message:
        "Sale completed successfully.",

      sale: {
        id:
          sale._id,

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

      payment: {
        id:
          payment._id,

        saleId:
          payment.saleId,

        amount:
          payment.amount,

        paymentMethod:
          payment.paymentMethod,

        status:
          payment.status,

        paymentDate:
          payment.paymentDate,
      },
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
        "Failed to complete sale.",
    });
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
      paymentStatus,
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

    if (
      typeof search === "string" &&
      search.trim()
    ) {
      filter.receiptNumber = {
        $regex:
          search.trim(),

        $options:
          "i",
      };
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT METHOD
    |--------------------------------------------------------------------------
    */

    if (paymentMethod) {
      if (
        !VALID_PAYMENT_METHODS.includes(
          paymentMethod
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment method.",
        });
      }

      filter.paymentMethod =
        paymentMethod;
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT STATUS
    |--------------------------------------------------------------------------
    */

    if (paymentStatus) {
      if (
        !VALID_PAYMENT_STATUSES.includes(
          paymentStatus
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment status.",
        });
      }

      filter.paymentStatus =
        paymentStatus;
    }

    /*
    |--------------------------------------------------------------------------
    | SALE STATUS
    |--------------------------------------------------------------------------
    */

    if (status) {
      if (
        !VALID_SALE_STATUSES.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid sale status.",
        });
      }

      filter.status =
        status;
    }

    /*
    |--------------------------------------------------------------------------
    | CASHIER
    |--------------------------------------------------------------------------
    */

    if (cashierId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          cashierId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid cashier ID.",
        });
      }

      filter.cashierId =
        cashierId;
    }

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER
    |--------------------------------------------------------------------------
    */

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
    |--------------------------------------------------------------------------
    | PAGINATION
    |--------------------------------------------------------------------------
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
    |--------------------------------------------------------------------------
    | FETCH SALES
    |--------------------------------------------------------------------------
    */

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
          createdAt:
            -1,
        })
        .skip(skip)
        .limit(
          limitNumber
        ),

      Sale.countDocuments(
        filter
      ),
    ]);

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

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

export const getSaleById =
  async (
    req,
    res
  ) => {
    try {
      const { id } =
        req.params;

      /*
      |--------------------------------------------------------------------------
      | VALIDATE ID
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | FIND SALE
      |--------------------------------------------------------------------------
      */

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

      /*
      |--------------------------------------------------------------------------
      | SALE NOT FOUND
      |--------------------------------------------------------------------------
      */

      if (!sale) {
        return res.status(404).json({
          success: false,
          message:
            "Sale not found.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | FETCH PAYMENTS FOR SALE
      |--------------------------------------------------------------------------
      */

      const payments =
        await Payment.find({
          businessId:
            req.user.businessId,

          saleId:
            sale._id,
        })
          .populate(
            "receivedBy",
            "name email role"
          )
          .sort({
            paymentDate:
              -1,
          });

      /*
      |--------------------------------------------------------------------------
      | CALCULATE PAYMENT SUMMARY
      |--------------------------------------------------------------------------
      */

      const completedPayments =
        payments.filter(
          (payment) =>
            payment.status ===
            "COMPLETED"
        );

      const totalPaid =
        completedPayments.reduce(
          (sum, payment) =>
            sum +
            Number(
              payment.amount
            ),
          0
        );

      const balance =
        Math.max(
          sale.total -
            totalPaid,
          0
        );

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      return res.json({
        success: true,

        sale,

        payments,

        paymentSummary: {
          saleTotal:
            sale.total,

          totalPaid,

          balance,

          paymentStatus:
            balance === 0
              ? "PAID"
              : totalPaid > 0
              ? "PENDING"
              : "PENDING",
        },
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