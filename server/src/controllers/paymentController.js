import mongoose from "mongoose";

import Payment from "../models/Payment.js";
import Sale from "../models/Sale.js";
import Customer from "../models/Customer.js";

/*
|--------------------------------------------------------------------------
| VALID PAYMENT METHODS
|--------------------------------------------------------------------------
*/

const VALID_PAYMENT_METHODS = [
  "CASH",
  "MOBILE_MONEY",
  "CARD",
  "BANK",
];

/*
|--------------------------------------------------------------------------
| CREATE PAYMENT
|--------------------------------------------------------------------------
*/

export const createPayment = async (
  req,
  res
) => {
  try {
    const {
      saleId,
      amount,
      paymentMethod,
      reference = "",
      notes = "",
      paymentDate,
    } = req.body;

    const businessId =
      req.user.businessId;

    const branchId =
      req.user.branchId || null;

    const receivedBy =
      req.user._id;

    /*
    |--------------------------------------------------------------------------
    | SALE ID VALIDATION
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
        message: "Invalid sale ID.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | AMOUNT VALIDATION
    |--------------------------------------------------------------------------
    */

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment amount must be greater than zero.",
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
    | FIND SALE
    |--------------------------------------------------------------------------
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

    /*
    |--------------------------------------------------------------------------
    | PREVENT PAYMENTS FOR CANCELLED SALES
    |--------------------------------------------------------------------------
    */

    if (
      sale.status ===
      "CANCELLED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payments cannot be added to a cancelled sale.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | PREVENT PAYMENT ABOVE SALE TOTAL
    |--------------------------------------------------------------------------
    */

    const existingPayments =
      await Payment.aggregate([
        {
          $match: {
            businessId,
            saleId: sale._id,
            status: "COMPLETED",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$amount",
            },
          },
        },
      ]);

    const amountAlreadyPaid =
      existingPayments.length > 0
        ? Number(
            existingPayments[0]
              .total
          )
        : 0;

    const remainingBalance =
      Math.max(
        sale.total -
          amountAlreadyPaid,
        0
      );

    if (
      numericAmount >
      remainingBalance
    ) {
      return res.status(400).json({
        success: false,
        message:
          `Payment exceeds the remaining balance. ` +
          `Remaining balance: UGX ${remainingBalance.toLocaleString()}.`,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CUSTOMER
    |--------------------------------------------------------------------------
    */

    let customer = null;

    if (sale.customerId) {
      customer =
        await Customer.findOne({
          _id: sale.customerId,
          businessId,
        });
    }

    /*
    |--------------------------------------------------------------------------
    | PAYMENT DATE
    |--------------------------------------------------------------------------
    */

    let finalPaymentDate =
      new Date();

    if (paymentDate) {
      finalPaymentDate =
        new Date(paymentDate);

      if (
        Number.isNaN(
          finalPaymentDate.getTime()
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment date.",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE PAYMENT
    |--------------------------------------------------------------------------
    */

    const payment =
      await Payment.create({
        businessId,
        branchId,
        saleId: sale._id,
        customerId:
          customer?._id ||
          sale.customerId ||
          null,
        receivedBy,
        amount:
          numericAmount,
        paymentMethod,
        reference:
          reference.trim(),
        notes:
          notes.trim(),
        status:
          "COMPLETED",
        paymentDate:
          finalPaymentDate,
      });

    /*
    |--------------------------------------------------------------------------
    | CALCULATE NEW BALANCE
    |--------------------------------------------------------------------------
    */

    const newPaidAmount =
      amountAlreadyPaid +
      numericAmount;

    const newBalance =
      Math.max(
        sale.total -
          newPaidAmount,
        0
      );

    /*
    |--------------------------------------------------------------------------
    | UPDATE SALE PAYMENT STATUS
    |--------------------------------------------------------------------------
    */

    let paymentStatus =
      "PENDING";

    if (
      newBalance === 0
    ) {
      paymentStatus =
        "PAID";
    }

    await Sale.updateOne(
      {
        _id: sale._id,
        businessId,
      },
      {
        $set: {
          paymentStatus,
        },
      }
    );

    /*
    |--------------------------------------------------------------------------
    | SUCCESS
    |--------------------------------------------------------------------------
    */

    return res.status(201).json({
      success: true,

      message:
        "Payment recorded successfully.",

      payment: {
        id: payment._id,

        saleId:
          payment.saleId,

        customerId:
          payment.customerId,

        amount:
          payment.amount,

        paymentMethod:
          payment.paymentMethod,

        reference:
          payment.reference,

        status:
          payment.status,

        paymentDate:
          payment.paymentDate,
      },

      summary: {
        saleTotal:
          sale.total,

        amountAlreadyPaid,

        amountPaidNow:
          numericAmount,

        totalPaid:
          newPaidAmount,

        remainingBalance:
          newBalance,

        paymentStatus,
      },
    });
  } catch (error) {
    console.error(
      "Create payment error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to record payment.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET PAYMENTS
|--------------------------------------------------------------------------
*/

export const getPayments = async (
  req,
  res
) => {
  try {
    const {
      search = "",
      paymentMethod,
      status,
      saleId,
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
    | STATUS
    |--------------------------------------------------------------------------
    */

    if (status) {
      const validStatuses = [
        "COMPLETED",
        "CANCELLED",
        "REFUNDED",
      ];

      if (
        !validStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment status.",
        });
      }

      filter.status =
        status;
    }

    /*
    |--------------------------------------------------------------------------
    | SALE
    |--------------------------------------------------------------------------
    */

    if (saleId) {
      if (
        !mongoose.Types.ObjectId.isValid(
          saleId
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid sale ID.",
        });
      }

      filter.saleId =
        saleId;
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
    | SEARCH
    |--------------------------------------------------------------------------
    */

    if (search.trim()) {
      filter.reference = {
        $regex:
          search.trim(),
        $options: "i",
      };
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
      filter.paymentDate = {};

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

        filter.paymentDate.$gte =
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

        filter.paymentDate.$lte =
          end;
      }
    }

    /*
    |--------------------------------------------------------------------------
    | PAGINATION
    |--------------------------------------------------------------------------
    */

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

    /*
    |--------------------------------------------------------------------------
    | FETCH PAYMENTS
    |--------------------------------------------------------------------------
    */

    const [
      payments,
      total,
    ] = await Promise.all([
      Payment.find(filter)
        .populate(
          "saleId",
          "receiptNumber total paymentMethod status createdAt"
        )
        .populate(
          "customerId",
          "name phone email"
        )
        .populate(
          "receivedBy",
          "name email role"
        )
        .sort({
          paymentDate: -1,
        })
        .skip(skip)
        .limit(
          limitNumber
        ),

      Payment.countDocuments(
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

      payments,

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
      "Get payments error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch payments.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET PAYMENT BY ID
|--------------------------------------------------------------------------
*/

export const getPaymentById =
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
            "Invalid payment ID.",
        });
      }

      const payment =
        await Payment.findOne({
          _id: id,
          businessId:
            req.user.businessId,
        })
          .populate(
            "saleId",
            "receiptNumber total paymentMethod status createdAt items"
          )
          .populate(
            "customerId",
            "name phone email address"
          )
          .populate(
            "receivedBy",
            "name email role"
          );

      if (!payment) {
        return res.status(404).json({
          success: false,
          message:
            "Payment not found.",
        });
      }

      return res.json({
        success: true,
        payment,
      });
    } catch (error) {
      console.error(
        "Get payment error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch payment.",
      });
    }
  };