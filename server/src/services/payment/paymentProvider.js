import PaymentProvider from "../../models/PaymentProvider.js";

/**
 * Find the active payment provider configured
 * for a particular business and branch.
 */
const getActiveProvider = async ({
  businessId,
  branchId,
  provider,
}) => {
  if (!businessId || !branchId) {
    throw new Error(
      "Business and branch are required to select a payment provider."
    );
  }

  const filter = {
    businessId,
    branchId,
    isActive: true,
  };

  if (provider) {
    filter.provider = provider;
  }

  const paymentProvider = await PaymentProvider.findOne(
    filter
  ).sort({
    createdAt: 1,
  });

  return paymentProvider;
};

/**
 * Generate a MOVA transaction reference.
 *
 * This is useful for the competition/demo environment
 * and will also give real provider integrations a local
 * reference that can be linked to the provider reference.
 */
const generateTransactionReference = (method) => {
  const prefixMap = {
    CARD: "CARD",
    MOBILE_MONEY: "MM",
    BANK_TRANSFER: "BANK",
  };

  const prefix = prefixMap[method] || "PAY";

  const date = new Date();

  const datePart =
    `${date.getFullYear()}` +
    `${String(date.getMonth() + 1).padStart(2, "0")}` +
    `${String(date.getDate()).padStart(2, "0")}`;

  const randomPart = Math.floor(
    100000 + Math.random() * 900000
  );

  return `MOVA-${prefix}-${datePart}-${randomPart}`;
};

/**
 * Create/prepare a payment request.
 *
 * CASH is handled directly by MOVA.
 *
 * CARD, MOBILE_MONEY and BANK_TRANSFER
 * require a configured payment provider.
 */
const createPaymentRequest = async ({
  businessId,
  branchId,
  amount,
  currency = "UGX",
  method,
  provider,
  saleId = null,
  cashierId,
}) => {
  const numericAmount = Number(amount);

  if (
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }

  if (!method) {
    throw new Error(
      "Payment method is required."
    );
  }

  /**
   * CASH
   *
   * Cash does not need an external provider.
   */
  if (method === "CASH") {
    return {
      success: true,
      handledInternally: true,
      status: "APPROVED",
      provider: "NONE",
      amount: numericAmount,
      currency,
      saleId,
      cashierId,
      transactionReference: generateTransactionReference(
        "CASH"
      ),
      message: "Cash payment accepted.",
    };
  }

  /**
   * Electronic payment methods require
   * an active provider.
   */
  const configuredProvider =
    await getActiveProvider({
      businessId,
      branchId,
      provider,
    });

  if (!configuredProvider) {
    throw new Error(
      `No active payment provider is configured for ${method}.`
    );
  }

  const transactionReference =
    generateTransactionReference(method);

  /**
   * CARD
   */
  if (method === "CARD") {
    if (!configuredProvider.supportsCard) {
      throw new Error(
        `${configuredProvider.displayName} is not configured to accept card payments.`
      );
    }

    return {
      success: true,
      readyForTerminal: true,
      status: "PENDING",

      provider:
        configuredProvider.provider,

      terminalId:
        configuredProvider.terminalId || "",

      terminalName:
        configuredProvider.displayName || "",

      amount: numericAmount,

      currency,

      saleId,

      cashierId,

      transactionReference,

      paymentOption: "CARD",

      metadata: {
        mode:
          configuredProvider.mode ||
          "DEMO",

        provider:
          configuredProvider.provider,

        providerId:
          configuredProvider._id,
      },

      message:
        "Payment request is ready for the configured card terminal.",
    };
  }

  /**
   * MOBILE MONEY
   */
  if (method === "MOBILE_MONEY") {
    if (
      !configuredProvider.supportsMobileMoney
    ) {
      throw new Error(
        `${configuredProvider.displayName} is not configured for mobile money.`
      );
    }

    return {
      success: true,
      readyForMobileMoney: true,
      status: "PENDING",

      provider:
        configuredProvider.provider,

      amount: numericAmount,

      currency,

      saleId,

      cashierId,

      transactionReference,

      paymentOption:
        "MOBILE_MONEY",

      metadata: {
        mode:
          configuredProvider.mode ||
          "DEMO",

        provider:
          configuredProvider.provider,

        providerId:
          configuredProvider._id,
      },

      message:
        "Mobile money payment request is ready.",
    };
  }

  /**
   * BANK TRANSFER
   */
  if (method === "BANK_TRANSFER") {
    if (
      !configuredProvider.supportsBankTransfer
    ) {
      throw new Error(
        `${configuredProvider.displayName} is not configured for bank transfer.`
      );
    }

    return {
      success: true,
      readyForBankTransfer: true,
      status: "PENDING",

      provider:
        configuredProvider.provider,

      amount: numericAmount,

      currency,

      saleId,

      cashierId,

      transactionReference,

      paymentOption:
        "BANK_TRANSFER",

      metadata: {
        mode:
          configuredProvider.mode ||
          "DEMO",

        provider:
          configuredProvider.provider,

        providerId:
          configuredProvider._id,
      },

      message:
        "Bank transfer payment request is ready.",
    };
  }

  throw new Error(
    `Unsupported payment method: ${method}`
  );
};

export {
  getActiveProvider,
  createPaymentRequest,
  generateTransactionReference,
};