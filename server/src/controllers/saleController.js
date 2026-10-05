import mongoose from "mongoose";

import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import ProductBranchStock from "../models/ProductBranchStock.js";
import Customer from "../models/Customer.js";
import InventoryTransaction from "../models/InventoryTransaction.js";
import Payment from "../models/Payment.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import Branch from "../models/Branch.js";

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
    100000 +
      Math.random() * 900000
  );

  return `MOVA-${year}${month}${day}-${random}`;
};

/*
|--------------------------------------------------------------------------
| RESOLVE ACTIVE BRANCH
|--------------------------------------------------------------------------
*/

const resolveActiveBranch = async (req) => {
  const businessId =
    req.user.businessId;

  const activeBranchId =
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

  const isOwnerOrAdmin =
    req.user.role === "OWNER" ||
    req.user.role === "ADMIN";

  if (isOwnerOrAdmin) {
    return branch;
  }

  const assignedBranches =
    Array.isArray(req.user.branchIds)
      ? req.user.branchIds.map(
          (id) => String(id)
        )
      : [];

  const hasAccess =
    assignedBranches.includes(
      String(branch._id)
    );

  if (!hasAccess) {
    return null;
  }

  return branch;
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
      paymentTransactionId = null,
      customerId = null,
      notes = "",
    } = req.body;

    const businessId =
      req.user.businessId;

    const cashierId =
      req.user._id;

    /*
    |--------------------------------------------------------------------------
    | RESOLVE BRANCH
    |--------------------------------------------------------------------------
    */

    const branch =
      await resolveActiveBranch(req);

    if (!branch) {
      return res.status(400).json({
        success: false,
        message:
          "No valid active branch is selected. Please select a branch before making a sale.",
      });
    }

    const branchId =
      branch._id;

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
    | PAYMENT TRANSACTION
    |
    | IMPORTANT:
    |
    | ONLY CARD payments use the electronic
    | PaymentTransaction system.
    |
    | CASH:
    | No transaction required.
    |
    | MOBILE MONEY:
    | Cashier manually verifies payment.
    | No transaction required.
    |
    | BANK:
    | Cashier manually verifies payment.
    | No transaction required.
    |
    | CARD:
    | Must have an APPROVED PaymentTransaction.
    |--------------------------------------------------------------------------
    */

    let paymentTransaction = null;

    if (paymentMethod === "CARD") {
      /*
      |--------------------------------------------------------------------------
      | CARD TRANSACTION IS REQUIRED
      |--------------------------------------------------------------------------
      */

      if (!paymentTransactionId) {
        return res.status(400).json({
          success: false,
          message:
            "An approved card payment transaction is required before completing a card sale.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VALIDATE TRANSACTION ID
      |--------------------------------------------------------------------------
      */

      if (
        !mongoose.Types.ObjectId.isValid(
          paymentTransactionId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid card payment transaction ID.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | FIND CARD TRANSACTION
      |--------------------------------------------------------------------------
      */

      paymentTransaction =
        await PaymentTransaction.findOne({
          _id: paymentTransactionId,
          businessId,
          branchId,
          cashierId,
        });

      if (!paymentTransaction) {
        return res.status(404).json({
          success: false,
          message:
            "Card payment transaction was not found for this cashier and branch.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VERIFY CARD PAYMENT METHOD
      |--------------------------------------------------------------------------
      */

      if (
        paymentTransaction.method !==
        "CARD"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The payment transaction is not a card transaction.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VERIFY CARD APPROVAL
      |--------------------------------------------------------------------------
      */

      if (
        paymentTransaction.status !==
        "APPROVED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Card payment has not been approved. Current status: ${paymentTransaction.status}.`,
        });
      }
    } else {
      /*
      |--------------------------------------------------------------------------
      | NON-CARD PAYMENTS
      |--------------------------------------------------------------------------
      |
      | CASH, MOBILE MONEY AND BANK DO NOT
      | REQUIRE PaymentTransaction.
      |
      | The cashier is responsible for confirming
      | that the payment has been received.
      |--------------------------------------------------------------------------
      */

      paymentTransaction = null;
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

      let branchStock =
        await ProductBranchStock.findOne({
          businessId,
          branchId,
          productId:
            product._id,
          isActive: true,
        });

      /*
      |--------------------------------------------------------------------------
      | LEGACY STOCK MIGRATION FALLBACK
      |--------------------------------------------------------------------------
      */

      if (!branchStock) {
        const activeBranchCount =
          await Branch.countDocuments({
            businessId,
            isActive: true,
          });

        if (
          activeBranchCount === 1
        ) {
          branchStock =
            await ProductBranchStock.create(
              {
                businessId,
                branchId,
                productId:
                  product._id,

                stockQuantity:
                  Number(
                    product.stockQuantity ||
                      0
                  ),

                minimumStock:
                  Number(
                    product.minimumStock ||
                      0
                  ),

                isActive: true,
              }
            );
        } else {
          branchStock =
            await ProductBranchStock.create(
              {
                businessId,
                branchId,
                productId:
                  product._id,

                stockQuantity: 0,

                minimumStock:
                  Number(
                    product.minimumStock ||
                      0
                  ),

                isActive: true,
              }
            );
        }
      }

      /*
      |--------------------------------------------------------------------------
      | STOCK CHECK
      |--------------------------------------------------------------------------
      */

      if (
        product.trackStock &&
        Number(
          branchStock.stockQuantity
        ) < quantity
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock for ${product.name} at ${branch.name}. Available: ${branchStock.stockQuantity}.`,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | SERVER-SIDE SELLING PRICE
      |--------------------------------------------------------------------------
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

      const itemSubtotal =
        unitPrice * quantity;

      subtotal +=
        itemSubtotal;

      normalizedItems.push({
        product,
        branchStock,

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
    | VERIFY CARD PAYMENT AMOUNT
    |
    | Only CARD reaches this section because
    | only CARD creates paymentTransaction.
    |--------------------------------------------------------------------------
    */

    if (paymentTransaction) {
      if (
        Number(
          paymentTransaction.amount
        ) !== Number(total)
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Card payment amount (${paymentTransaction.amount}) does not match the sale total (${total}).`,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | PREVENT REUSING A CARD TRANSACTION
      |--------------------------------------------------------------------------
      */

      if (
        paymentTransaction.saleId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This card payment transaction is already associated with another sale.",
        });
      }
    }

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
    | UPDATE BRANCH STOCK
    |--------------------------------------------------------------------------
    */

    const inventoryEntries = [];

    for (
      const item of normalizedItems
    ) {
      const product =
        item.product;

      if (
        !product.trackStock
      ) {
        continue;
      }

      const stockBefore =
        Number(
          item.branchStock
            .stockQuantity
        );

      const updatedBranchStock =
        await ProductBranchStock.findOneAndUpdate(
          {
            _id:
              item.branchStock
                ._id,

            businessId,

            branchId,

            productId:
              product._id,

            isActive: true,

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
        !updatedBranchStock
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Insufficient stock for ${product.name} at ${branch.name}. The stock may have changed because another sale was completed.`,
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

        stockBefore,

        stockAfter:
          updatedBranchStock.stockQuantity,

        reason:
          "Product sold",

        referenceType:
          "SALE",

        notes:
          `Sale of ${item.quantity} ${product.unit}(s) at ${branch.name}.`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE SALE
    |--------------------------------------------------------------------------
    */

    let sale;

    try {
      sale =
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
            typeof notes ===
            "string"
              ? notes.trim()
              : "",
        });
    } catch (saleError) {
      /*
      |--------------------------------------------------------------------------
      | ROLLBACK STOCK
      |--------------------------------------------------------------------------
      */

      for (
        const item of normalizedItems
      ) {
        if (
          !item.product
            .trackStock
        ) {
          continue;
        }

        await ProductBranchStock.updateOne(
          {
            _id:
              item.branchStock
                ._id,

            businessId,

            branchId,

            productId:
              item.product
                ._id,
          },
          {
            $inc: {
              stockQuantity:
                item.quantity,
            },
          }
        );
      }

      throw saleError;
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE INVENTORY LEDGER
    |--------------------------------------------------------------------------
    */

    try {
      for (
        const entry of
          inventoryEntries
      ) {
        await InventoryTransaction.create(
          {
            ...entry,

            referenceId:
              sale._id,
          }
        );
      }
    } catch (inventoryError) {
      await Sale.deleteOne({
        _id:
          sale._id,

        businessId,
      });

      for (
        const item of normalizedItems
      ) {
        if (
          !item.product
            .trackStock
        ) {
          continue;
        }

        await ProductBranchStock.updateOne(
          {
            _id:
              item.branchStock
                ._id,

            businessId,

            branchId,

            productId:
              item.product
                ._id,
          },
          {
            $inc: {
              stockQuantity:
                item.quantity,
            },
          }
        );
      }

      throw inventoryError;
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE PAYMENT
    |--------------------------------------------------------------------------
    |
    | All payment methods create a completed
    | Payment record.
    |
    | The difference is:
    |
    | CARD -> linked to PaymentTransaction.
    | CASH -> manually received by cashier.
    | MOBILE_MONEY -> manually verified by cashier.
    | BANK -> manually verified by cashier.
    |--------------------------------------------------------------------------
    */

    let payment;

    try {
      payment =
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
            paymentTransaction
              ? paymentTransaction
                  .transactionReference ||
                paymentTransaction
                  .providerReference ||
                ""
              : "",

          notes:
            `Payment for receipt ${receiptNumber}`,

          status:
            "COMPLETED",

          paymentDate:
            new Date(),
        });
    } catch (paymentError) {
      /*
      |--------------------------------------------------------------------------
      | ROLLBACK PAYMENT FAILURE
      |--------------------------------------------------------------------------
      */

      await Payment.deleteMany({
        saleId:
          sale._id,

        businessId,
      });

      await InventoryTransaction.deleteMany(
        {
          referenceId:
            sale._id,

          businessId,

          branchId,
        }
      );

      await Sale.deleteOne({
        _id:
          sale._id,

        businessId,
      });

      for (
        const item of normalizedItems
      ) {
        if (
          !item.product
            .trackStock
        ) {
          continue;
        }

        await ProductBranchStock.updateOne(
          {
            _id:
              item.branchStock
                ._id,

            businessId,

            branchId,

            productId:
              item.product
                ._id,
          },
          {
            $inc: {
              stockQuantity:
                item.quantity,
            },
          }
        );
      }

      throw paymentError;
    }

    /*
    |--------------------------------------------------------------------------
    | LINK CARD TRANSACTION TO SALE
    |--------------------------------------------------------------------------
    |
    | This executes ONLY for CARD.
    |--------------------------------------------------------------------------
    */

    if (paymentTransaction) {
      await PaymentTransaction.updateOne(
        {
          _id:
            paymentTransaction._id,

          businessId,

          branchId,

          cashierId,

          status:
            "APPROVED",

          saleId: null,
        },
        {
          $set: {
            saleId:
              sale._id,

            verifiedAt:
              paymentTransaction
                .verifiedAt ||
              new Date(),
          },
        }
      );
    }

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

        businessId:
          sale.businessId,

        branchId:
          sale.branchId,

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

        reference:
          payment.reference,

        paymentDate:
          payment.paymentDate,
      },

      paymentTransaction:
        paymentTransaction
          ? {
              id:
                paymentTransaction._id,

              transactionReference:
                paymentTransaction.transactionReference,

              provider:
                paymentTransaction.provider,

              status:
                paymentTransaction.status,
            }
          : null,

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

    const branch =
      await resolveActiveBranch(
        req
      );

    if (!branch) {
      return res.status(400).json({
        success: false,
        message:
          "No valid active branch is selected.",
      });
    }

    const branchId =
      branch._id;

    const filter = {
      businessId,
      branchId,
    };

    if (
      typeof search === "string" &&
      search.trim()
    ) {
      filter.receiptNumber = {
        $regex:
          search.trim(),

        $options: "i",
      };
    }

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
        .populate(
          "branchId",
          "name code phone address"
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(
          limitNumber
        ),

      Sale.countDocuments(
        filter
      ),
    ]);

    return res.json({
      success: true,

      sales,

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

      const branch =
        await resolveActiveBranch(
          req
        );

      if (!branch) {
        return res.status(400).json({
          success: false,
          message:
            "No valid active branch is selected.",
        });
      }

      const sale =
        await Sale.findOne({
          _id: id,

          businessId:
            req.user.businessId,

          branchId:
            branch._id,
        })
          .populate(
            "cashierId",
            "name email role"
          )
          .populate(
            "customerId",
            "name phone email address"
          )
          .populate(
            "branchId",
            "name code phone address"
          );

      if (!sale) {
        return res.status(404).json({
          success: false,
          message:
            "Sale not found in the selected branch.",
        });
      }

      const payments =
        await Payment.find({
          businessId:
            req.user.businessId,

          branchId:
            branch._id,

          saleId:
            sale._id,
        })
          .populate(
            "receivedBy",
            "name email role"
          )
          .sort({
            paymentDate: -1,
          });

      const completedPayments =
        payments.filter(
          (payment) =>
            payment.status ===
            "COMPLETED"
        );

      const totalPaid =
        completedPayments.reduce(
          (
            sum,
            payment
          ) =>
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

      const calculatedPaymentStatus =
        balance === 0
          ? "PAID"
          : "PENDING";

      return res.json({
        success: true,

        sale,

        payments,

        branch: {
          id:
            branch._id,

          name:
            branch.name,

          code:
            branch.code,
        },

        paymentSummary: {
          saleTotal:
            sale.total,

          totalPaid,

          balance,

          paymentStatus:
            calculatedPaymentStatus,
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