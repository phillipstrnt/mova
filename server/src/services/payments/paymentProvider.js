
import PaymentProvider from "../../models/PaymentProvider.js";

/*
|--------------------------------------------------------------------------
| PAYMENT PROVIDER SERVICE
|--------------------------------------------------------------------------
|
| This file is the central entry point for MOVA payment providers.
|
| IMPORTANT:
| We do NOT pretend to approve physical card transactions.
|
| A real provider adapter will eventually communicate with:
|
|   Pesapal Sabi
|   Stanbic terminal
|   Absa terminal
|   Flutterwave terminal
|   MTN
|   Airtel
|   etc.
|
|--------------------------------------------------------------------------
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

  /*
  |--------------------------------------------------------------------------
  | CASH
  |--------------------------------------------------------------------------
  */

  if (method === "CASH") {
    return {
      success: true,
      handledInternally: true,
      status: "APPROVED",
      provider: "NONE",
      message: "Cash payment accepted.",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | PROVIDER LOOKUP
  |--------------------------------------------------------------------------
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

  /*
  |--------------------------------------------------------------------------
  | PHYSICAL TERMINAL
  |--------------------------------------------------------------------------
  |
  | We intentionally stop here until the provider's actual terminal
  | integration credentials/API/SDK have been configured.
  |
  */

  if (method === "CARD") {
    return {
      success: false,
      readyForTerminal: true,
      status: "PENDING",
      provider:
        configuredProvider.provider,
      terminalId:
        configuredProvider.terminalId,
      message:
        "Card terminal integration is configured architecturally but the provider terminal API has not yet been connected.",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | MOBILE MONEY
  |--------------------------------------------------------------------------
  */

  if (method === "MOBILE_MONEY") {
    return {
      success: false,
      readyForMobileMoney: true,
      status: "PENDING",
      provider:
        configuredProvider.provider,
      message:
        "Mobile money provider integration is not connected yet.",
    };
  }

  /*
  |--------------------------------------------------------------------------
  | BANK TRANSFER
  |--------------------------------------------------------------------------
  */

  if (method === "BANK_TRANSFER") {
    return {
      success: false,
      readyForBankTransfer: true,
      status: "PENDING",
      provider:
        configuredProvider.provider,
      message:
        "Bank transfer integration is not connected yet.",
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