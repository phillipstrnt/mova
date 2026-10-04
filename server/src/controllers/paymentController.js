import mongoose from "mongoose";

import PaymentTransaction from "../models/PaymentTransaction.js";
import PaymentProvider from "../models/PaymentProvider.js";
import Branch from "../models/Branch.js";
import {
  createPaymentRequest,
} from "../services/payment/paymentProvider.js";

const resolveBranch = async (req) => {
  const businessId = req.user.businessId;

  const branchId =
    req.user.activeBranchId ||
    req.user.branchId;

  if (!branchId) {
    return null;
  }

  if (
    !mongoose.Types.ObjectId.isValid(
      branchId
    )
  ) {
    return null;
  }

  const branch = await Branch.findOne({
    _id: branchId,
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

  const branchIds = Array.isArray(
    req.user.branchIds
  )
    ? req.user.branchIds.map((id) =>
        String(id)
      )
    : [];

  if (
    !branchIds.includes(
      String(branch._id)
    )
  ) {
    return null;
  }

  return branch;
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
        provider,
        currency = "UGX",
        terminalId = "",
        terminalName = "",
        metadata = {},
      } = req.body;

      const businessId =
        req.user.businessId;

      const cashierId =
        req.user._id;

      const branch =
        await resolveBranch(req);

      if (!branch) {
        return res.status(400).json({
          success: false,
          message:
            "No valid active branch is selected.",
        });
      }

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
            "This endpoint is for electronic payments only.",
        });
      }

      const request =
        await createPaymentRequest({
          businessId,
          branchId: branch._id,
          amount: numericAmount,
          currency,
          method,
          provider,
          cashierId,
        });

      const paymentTransaction =
        await PaymentTransaction.create({
          businessId,
          branchId:
            branch._id,
          cashierId,
          method,
          provider:
            request.provider || "NONE",
          terminalId:
            terminalId ||
            request.terminalId ||
            "",
          terminalName:
            terminalName ||
            request.terminalName ||
            "",
          amount:
            numericAmount,
          currency,
          status:
            request.status ||
            "PENDING",
          metadata,
        });

      return res.status(201).json({
        success: true,

        message:
          request.message ||
          "Payment transaction created.",

        paymentTransaction: {
          id:
            paymentTransaction._id,

          businessId:
            paymentTransaction.businessId,

          branchId:
            paymentTransaction.branchId,

          method:
            paymentTransaction.method,

          provider:
            paymentTransaction.provider,

          terminalId:
            paymentTransaction.terminalId,

          terminalName:
            paymentTransaction.terminalName,

          amount:
            paymentTransaction.amount,

          currency:
            paymentTransaction.currency,

          status:
            paymentTransaction.status,

          transactionReference:
            paymentTransaction.transactionReference,

          createdAt:
            paymentTransaction.createdAt,
        },

        terminal: {
          ready:
            Boolean(
              request.readyForTerminal
            ),

          provider:
            request.provider ||
            null,

          terminalId:
            request.terminalId ||
            null,

          terminalName:
            request.terminalName ||
            null,
        },
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
          "Unable to create payment transaction.",
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
        await PaymentTransaction.findOne({
          _id: id,
          businessId:
            req.user.businessId,
        })
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
| GET ACTIVE PAYMENT PROVIDERS
|--------------------------------------------------------------------------
*/

export const getPaymentProviders =
  async (req, res) => {
    try {
      const branch =
        await resolveBranch(req);

      if (!branch) {
        return res.status(400).json({
          success: false,
          message:
            "No valid active branch is selected.",
        });
      }

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
          "Failed to fetch payment providers.",
      });
    }
  };

/*
|--------------------------------------------------------------------------
| PAYMENT STATUS
|--------------------------------------------------------------------------
*/

export const updatePaymentStatus =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        status,
        transactionReference = "",
        providerReference = "",
        authorizationCode = "",
        providerResponse = null,
        failureReason = "",
      } = req.body;

      const allowedStatuses = [
        "PROCESSING",
        "APPROVED",
        "DECLINED",
        "CANCELLED",
        "FAILED",
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment status.",
        });
      }

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

      transaction.status =
        status;

      if (
        transactionReference
      ) {
        transaction.transactionReference =
          String(
            transactionReference
          );
      }

      if (
        providerReference
      ) {
        transaction.providerReference =
          String(
            providerReference
          );
      }

      if (
        authorizationCode
      ) {
        transaction.authorizationCode =
          String(
            authorizationCode
          );
      }

      if (
        providerResponse !==
        null
      ) {
        transaction.providerResponse =
          providerResponse;
      }

      transaction.failureReason =
        failureReason || "";

      if (
        [
          "APPROVED",
          "DECLINED",
          "CANCELLED",
          "FAILED",
        ].includes(status)
      ) {
        transaction.processedAt =
          new Date();
      }

      if (
        status === "APPROVED"
      ) {
        transaction.verifiedAt =
          new Date();
      }

      await transaction.save();

      return res.json({
        success: true,
        message:
          `Payment marked ${status.toLowerCase()}.`,
        paymentTransaction:
          transaction,
      });
    } catch (error) {
      console.error(
        "Update payment status error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to update payment status.",
      });
    }
  };