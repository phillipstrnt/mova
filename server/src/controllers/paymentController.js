import mongoose from "mongoose";

import Payment from "../models/Payment.js";
import PaymentTransaction from "../models/PaymentTransaction.js";
import PaymentProvider from "../models/PaymentProvider.js";
import Branch from "../models/Branch.js";

import {
  createPaymentRequest,
} from "../services/payment/paymentProvider.js";

/*
|--------------------------------------------------------------------------
| RESOLVE ACTIVE BRANCH
|--------------------------------------------------------------------------
*/

const resolveBranch = async (req) => {
  const businessId = req.user.businessId;

  const activeBranchId =
    req.user.activeBranchId ||
    req.user.branchId;

  if (!businessId) {
    throw new Error(
      "User is not associated with a business."
    );
  }

  if (!activeBranchId) {
    throw new Error(
      "No active branch is selected."
    );
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      activeBranchId
    )
  ) {
    throw new Error(
      "Invalid active branch."
    );
  }

  const branch =
    await Branch.findOne({
      _id: activeBranchId,
      businessId,
      isActive: true,
    });

  if (!branch) {
    throw new Error(
      "Active branch could not be found."
    );
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

  if (
    !assignedBranches.includes(
      String(branch._id)
    )
  ) {
    throw new Error(
      "You do not have access to the selected branch."
    );
  }

  return branch;
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
      page = 1,
      limit = 20,
      startDate,
      endDate,
    } = req.query;

    const businessId =
      req.user.businessId;

    const branch =
      await resolveBranch(req);

    const filter = {
      businessId,
      branchId: branch._id,
    };

    /*
    |--------------------------------------------------------------------------
    | PAYMENT METHOD
    |--------------------------------------------------------------------------
    */

    if (paymentMethod) {
      const validMethods = [
        "CASH",
        "MOBILE_MONEY",
        "CARD",
        "BANK",
      ];

      if (
        !validMethods.includes(
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
        !validStatuses.includes(status)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment status.",
        });
      }

      filter.status = status;
    }

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    if (
      typeof search === "string" &&
      search.trim()
    ) {
      filter.$or = [
        {
          reference: {
            $regex:
              search.trim(),
            $options: "i",
          },
        },
        {
          notes: {
            $regex:
              search.trim(),
            $options: "i",
          },
        },
      ];
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
      (pageNumber - 1) *
      limitNumber;

    /*
    |--------------------------------------------------------------------------
    | FETCH
    |--------------------------------------------------------------------------
    */

    const [
      payments,
      total,
    ] = await Promise.all([
      Payment.find(filter)
        .populate(
          "saleId",
          "receiptNumber total status"
        )
        .populate(
          "customerId",
          "name phone email"
        )
        .populate(
          "receivedBy",
          "name email role"
        )
        .populate(
          "branchId",
          "name code"
        )
        .sort({
          paymentDate: -1,
        })
        .skip(skip)
        .limit(limitNumber),

      Payment.countDocuments(
        filter
      ),
    ]);

    /*
    |--------------------------------------------------------------------------
    | SUMMARY
    |--------------------------------------------------------------------------
    */

    const [
      summary,
    ] = await Payment.aggregate([
      {
        $match: {
          businessId:
            new mongoose.Types.ObjectId(
              businessId
            ),

          branchId:
            new mongoose.Types.ObjectId(
              branch._id
            ),
        },
      },

      {
        $group: {
          _id: null,

          totalAmount: {
            $sum: "$amount",
          },

          completedAmount: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "COMPLETED",
                  ],
                },
                "$amount",
                0,
              ],
            },
          },

          cashAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: [
                        "$status",
                        "COMPLETED",
                      ],
                    },
                    {
                      $eq: [
                        "$paymentMethod",
                        "CASH",
                      ],
                    },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },

          mobileMoneyAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: [
                        "$status",
                        "COMPLETED",
                      ],
                    },
                    {
                      $eq: [
                        "$paymentMethod",
                        "MOBILE_MONEY",
                      ],
                    },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },

          cardAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: [
                        "$status",
                        "COMPLETED",
                      ],
                    },
                    {
                      $eq: [
                        "$paymentMethod",
                        "CARD",
                      ],
                    },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },

          bankAmount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    {
                      $eq: [
                        "$status",
                        "COMPLETED",
                      ],
                    },
                    {
                      $eq: [
                        "$paymentMethod",
                        "BANK",
                      ],
                    },
                  ],
                },
                "$amount",
                0,
              ],
            },
          },

          completedCount: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "COMPLETED",
                  ],
                },
                1,
                0,
              ],
            },
          },

          refundedCount: {
            $sum: {
              $cond: [
                {
                  $eq: [
                    "$status",
                    "REFUNDED",
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    return res.json({
      success: true,

      payments,

      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.ceil(
          total / limitNumber
        ),
      },

      summary:
        summary || {
          totalAmount: 0,
          completedAmount: 0,
          cashAmount: 0,
          mobileMoneyAmount: 0,
          cardAmount: 0,
          bankAmount: 0,
          completedCount: 0,
          refundedCount: 0,
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
        error.message ||
        "Failed to fetch payments.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE PAYMENT
|--------------------------------------------------------------------------
*/

export const getPayment = async (
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

    const branch =
      await resolveBranch(req);

    const payment =
      await Payment.findOne({
        _id: id,
        businessId:
          req.user.businessId,
        branchId: branch._id,
      })
        .populate(
          "saleId",
          "receiptNumber total status"
        )
        .populate(
          "customerId",
          "name phone email"
        )
        .populate(
          "receivedBy",
          "name email role"
        )
        .populate(
          "branchId",
          "name code"
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
        error.message ||
        "Failed to fetch payment.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| CREATE PAYMENT TRANSACTION
|--------------------------------------------------------------------------
*/

export const createPaymentTransaction =
  async (req, res) => {
    try {
      const {
        amount,
        method,
        currency = "UGX",
        provider,
        saleId = null,
        metadata = {},
      } = req.body;

      const businessId =
        req.user.businessId;

      const cashierId =
        req.user._id;

      const branch =
        await resolveBranch(req);

      /*
      |--------------------------------------------------------------------------
      | VALIDATION
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

      const allowedMethods = [
        "CARD",
        "MOBILE_MONEY",
        "BANK_TRANSFER",
      ];

      if (
        !allowedMethods.includes(
          method
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Only electronic payment methods can create payment transactions.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | PREPARE PROVIDER REQUEST
      |--------------------------------------------------------------------------
      */

      const request =
        await createPaymentRequest({
          businessId,
          branchId:
            branch._id,
          amount:
            numericAmount,
          currency,
          method,
          provider,
          saleId,
          cashierId,
        });

      /*
      |--------------------------------------------------------------------------
      | CREATE TRANSACTION
      |--------------------------------------------------------------------------
      */

      const transaction =
        await PaymentTransaction.create(
          {
            businessId,

            branchId:
              branch._id,

            saleId:
              saleId || null,

            cashierId,

            method,

            provider:
              request.provider ||
              "NONE",

            terminalId:
              request.terminalId ||
              "",

            terminalName:
              request.terminalName ||
              "",

            amount:
              numericAmount,

            currency,

            status:
              request.status ||
              "PENDING",

            transactionReference:
              request.transactionReference ||
              "",

            providerReference:
              request.providerReference ||
              "",

            authorizationCode:
              request.authorizationCode ||
              "",

            paymentOption:
              request.paymentOption ||
              "",

            providerResponse:
              request.providerResponse ||
              null,

            metadata: {
              ...metadata,

              ...(request.metadata ||
                {}),
            },
          }
        );

      return res.status(201).json({
        success: true,

        message:
          request.message ||
          "Payment transaction created.",

        paymentTransaction:
          transaction,

        transaction,
      });
    } catch (error) {
      console.error(
        "Create payment transaction error:",
        error
      );

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Failed to create payment transaction.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| GET PAYMENT TRANSACTION
|--------------------------------------------------------------------------
*/

export const getPaymentTransaction =
  async (req, res) => {
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
            "Invalid payment transaction ID.",
        });
      }

      const transaction =
        await PaymentTransaction.findOne(
          {
            _id: id,
            businessId:
              req.user.businessId,
          }
        )
          .populate(
            "cashierId",
            "name email role"
          )
          .populate(
            "branchId",
            "name code"
          )
          .populate(
            "saleId",
            "receiptNumber total status"
          );

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message:
            "Payment transaction not found.",
        });
      }

      return res.json({
        success: true,

        paymentTransaction:
          transaction,

        transaction,
      });
    } catch (error) {
      console.error(
        "Get payment transaction error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch payment transaction.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| GET PAYMENT PROVIDERS
|--------------------------------------------------------------------------
*/

export const getPaymentProviders =
  async (req, res) => {
    try {
      const branch =
        await resolveBranch(req);

      const providers =
        await PaymentProvider.find({
          businessId:
            req.user.businessId,

          branchId:
            branch._id,

          isActive: true,
        }).sort({
          createdAt: 1,
        });

      return res.json({
        success: true,

        providers,
      });
    } catch (error) {
      console.error(
        "Get payment providers error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to fetch payment providers.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| UPDATE PAYMENT TRANSACTION STATUS
|--------------------------------------------------------------------------
*/

export const updatePaymentStatus =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        status,
        providerReference,
        authorizationCode,
        providerResponse,
        failureReason,
        transactionReference,
      } = req.body;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment transaction ID.",
        });
      }

      const validStatuses = [
        "PROCESSING",
        "APPROVED",
        "DECLINED",
        "CANCELLED",
        "FAILED",
      ];

      if (
        !validStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment transaction status.",
        });
      }

      const transaction =
        await PaymentTransaction.findOne({
          _id: id,
          businessId:
            req.user.businessId,
        });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message:
            "Payment transaction not found.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | DO NOT CHANGE AN ALREADY COMPLETED PAYMENT
      |--------------------------------------------------------------------------
      */

      if (
        transaction.status ===
          "APPROVED" &&
        status !== "APPROVED"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "An approved payment transaction cannot be moved back to another status.",
        });
      }

      const update = {
        status,
      };

      if (
        providerReference !==
        undefined
      ) {
        update.providerReference =
          providerReference;
      }

      if (
        authorizationCode !==
        undefined
      ) {
        update.authorizationCode =
          authorizationCode;
      }

      if (
        transactionReference !==
        undefined
      ) {
        update.transactionReference =
          transactionReference;
      }

      if (
        providerResponse !==
        undefined
      ) {
        update.providerResponse =
          providerResponse;
      }

      if (
        failureReason !==
        undefined
      ) {
        update.failureReason =
          failureReason;
      }

      /*
      |--------------------------------------------------------------------------
      | PROCESSING
      |--------------------------------------------------------------------------
      */

      if (
        status ===
        "PROCESSING"
      ) {
        update.processedAt =
          new Date();
      }

      /*
      |--------------------------------------------------------------------------
      | APPROVED
      |--------------------------------------------------------------------------
      */

      if (
        status ===
        "APPROVED"
      ) {
        update.processedAt =
          transaction.processedAt ||
          new Date();

        update.verifiedAt =
          new Date();

        update.failureReason =
          "";
      }

      /*
      |--------------------------------------------------------------------------
      | FAILED / DECLINED / CANCELLED
      |--------------------------------------------------------------------------
      */

      if (
        [
          "FAILED",
          "DECLINED",
          "CANCELLED",
        ].includes(status)
      ) {
        update.processedAt =
          new Date();
      }

      const updatedTransaction =
        await PaymentTransaction.findOneAndUpdate(
          {
            _id: id,
            businessId:
              req.user.businessId,
          },
          {
            $set: update,
          },
          {
            new: true,
          }
        )
          .populate(
            "cashierId",
            "name email role"
          )
          .populate(
            "branchId",
            "name code"
          )
          .populate(
            "saleId",
            "receiptNumber total status"
          );

      return res.json({
        success: true,

        message:
          `Payment transaction status updated to ${status}.`,

        paymentTransaction:
          updatedTransaction,

        transaction:
          updatedTransaction,
      });
    } catch (error) {
      console.error(
        "Update payment status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to update payment transaction.",
      });
    }
  };

export {
  resolveBranch,
};