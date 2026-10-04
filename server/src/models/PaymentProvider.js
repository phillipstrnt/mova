import PaymentProvider from "../../models/PaymentProvider.js";

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

  const paymentProvider =
    await PaymentProvider.findOne(filter).sort({
      createdAt: 1,
    });

  return paymentProvider;
};

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
  if (!amount || Number(amount) <= 0) {
    throw new Error(
      "Payment amount must be greater than zero."
    );
  }

  if (!method) {
    throw new Error(
      "Payment method is required."
    );
  }

  if (method === "CASH") {
    return {
      success: true,
      handledInternally: true,
      status: "APPROVED",
      provider: "NONE",
      message: "Cash payment accepted.",
    };
  }

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

  if (method === "CARD") {
    if (!configuredProvider.supportsCard) {
      throw new Error(
        `${configuredProvider.displayName} is not configured to accept card payments.`
      );
    }

    return {
      success: false,
      readyForTerminal: true,
      status: "PENDING",
      provider:
        configuredProvider.provider,
      terminalId:
        configuredProvider.terminalId,
      terminalName:
        configuredProvider.displayName,
      message:
        "Payment request is ready for the configured card terminal.",
    };
  }

  if (method === "MOBILE_MONEY") {
    if (
      !configuredProvider.supportsMobileMoney
    ) {
      throw new Error(
        `${configuredProvider.displayName} is not configured for mobile money.`
      );
    }

    return {
      success: false,
      readyForMobileMoney: true,
      status: "PENDING",
      provider:
        configuredProvider.provider,
      message:
        "Mobile money payment request is ready.",
    };
  }

  if (method === "BANK_TRANSFER") {
    if (
      !configuredProvider.supportsBankTransfer
    ) {
      throw new Error(
        `${configuredProvider.displayName} is not configured for bank transfer.`
      );
    }

    return {
      success: false,
      readyForBankTransfer: true,
      status: "PENDING",
      provider:
        configuredProvider.provider,
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
};