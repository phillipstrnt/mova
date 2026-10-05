import { useEffect, useMemo, useRef, useState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Clock3,
  HandCoins,
  Keyboard,
  PauseCircle,
  PlayCircle,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
  User,
  UserPlus,
  Wallet,
  X,
} from "lucide-react";

import api from "../../services/api";

// IMPORTANT:
// POS.jsx is inside pages/pos/
// Receipts.jsx is inside pages/receipts/
import Receipt from "../receipts/Receipts";

/* =========================================================
   CONSTANTS
========================================================= */

const PAYMENT_METHODS = [
  {
    value: "CASH",
    label: "Cash",
    icon: Wallet,
  },
  {
    value: "MOBILE_MONEY",
    label: "Mobile Money",
    icon: Smartphone,
  },
  {
    value: "CARD",
    label: "Card",
    icon: CreditCard,
  },
  {
    value: "BANK",
    label: "Bank",
    icon: CreditCard,
  },
];

const HELD_SALES_KEY = "mova_held_sales";
const RECEIPT_SETTINGS_KEY = "mova_receipt_settings";

const DEFAULT_RECEIPT_SETTINGS = {
  afterSaleAction: "SHOW",
  returnToPOS: false,
  showAmountPaid: true,
  showChange: true,
  showCashier: true,
  showCustomer: true,
  showLogo: true,
};

/* =========================================================
   HELPERS
========================================================= */

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
};

const loadReceiptSettings = () => {
  try {
    const stored = localStorage.getItem(RECEIPT_SETTINGS_KEY);

    if (!stored) {
      return DEFAULT_RECEIPT_SETTINGS;
    }

    return {
      ...DEFAULT_RECEIPT_SETTINGS,
      ...JSON.parse(stored),
    };
  } catch (error) {
    console.error("Failed to load receipt settings:", error);
    return DEFAULT_RECEIPT_SETTINGS;
  }
};

const loadHeldSales = () => {
  try {
    const stored = localStorage.getItem(HELD_SALES_KEY);

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load held sales:", error);
    return [];
  }
};

const saveHeldSales = (sales) => {
  try {
    localStorage.setItem(
      HELD_SALES_KEY,
      JSON.stringify(sales)
    );
  } catch (error) {
    console.error("Failed to save held sales:", error);
  }
};

/* =========================================================
   POS
========================================================= */

const POS = () => {
  /* =======================================================
     PRODUCTS
  ======================================================= */

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);

  const productSearchRef = useRef(null);

  /* =======================================================
     CART
  ======================================================= */

  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);

  /* =======================================================
     CUSTOMER
  ======================================================= */

  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerPanelOpen, setCustomerPanelOpen] = useState(false);

  const customerSearchRef = useRef(null);

  /* =======================================================
     PAYMENT
  ======================================================= */

  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [cashReceived, setCashReceived] = useState("");

  const [paymentPanelOpen, setPaymentPanelOpen] = useState(true);

  /*
   * CARD ONLY
   *
   * Card is the only payment method that currently requires
   * an actual electronic payment transaction/approval.
   */
  const [cardPaymentStatus, setCardPaymentStatus] =
    useState("IDLE");

  const [paymentTransaction, setPaymentTransaction] =
    useState(null);

  const [paymentPolling, setPaymentPolling] =
    useState(false);

  /*
   * MANUAL PAYMENT VERIFICATION
   *
   * Mobile Money and Bank do NOT require provider polling.
   *
   * The cashier verifies the payment manually and then
   * confirms that the money has been received.
   */
  const [manualPaymentVerified, setManualPaymentVerified] =
    useState(false);

  /* =======================================================
     HELD SALES
  ======================================================= */

  const [heldSales, setHeldSales] = useState(() =>
    loadHeldSales()
  );

  const [heldSalesOpen, setHeldSalesOpen] = useState(false);

  /* =======================================================
     SALE
  ======================================================= */

  const [processingSale, setProcessingSale] = useState(false);

  const [saleSuccess, setSaleSuccess] = useState(null);

  const [completedSale, setCompletedSale] = useState(null);

  const [completedCustomer, setCompletedCustomer] =
    useState(null);

  const [showReceipt, setShowReceipt] = useState(false);

  const [receiptAutoPrint, setReceiptAutoPrint] =
    useState(false);

  const [receiptSettings, setReceiptSettings] =
    useState(() => loadReceiptSettings());

  const [error, setError] = useState("");

  /* =======================================================
     SHORTCUTS
  ======================================================= */

  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  /* =======================================================
     LOAD PRODUCTS
  ======================================================= */

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);

      const response = await api.get("/products", {
        params: {
          limit: 100,
          status: "active",
        },
      });

      const productData =
        response.data?.products ||
        response.data?.data ||
        [];

      setProducts(
        Array.isArray(productData) ? productData : []
      );
    } catch (requestError) {
      console.error(
        "Failed to load products:",
        requestError
      );

      setError(
        requestError.response?.data?.message ||
          "Failed to load products."
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  /* =======================================================
     HELD SALES STORAGE
  ======================================================= */

  useEffect(() => {
    saveHeldSales(heldSales);
  }, [heldSales]);

  /* =======================================================
     RECEIPT SETTINGS
  ======================================================= */

  useEffect(() => {
    const refreshReceiptSettings = () => {
      setReceiptSettings(loadReceiptSettings());
    };

    window.addEventListener(
      "mova:receipt-settings-changed",
      refreshReceiptSettings
    );

    return () => {
      window.removeEventListener(
        "mova:receipt-settings-changed",
        refreshReceiptSettings
      );
    };
  }, []);

  /* =======================================================
     CUSTOMER SEARCH
  ======================================================= */

  useEffect(() => {
    const searchCustomers = async () => {
      if (!customerSearch.trim()) {
        setCustomers([]);
        return;
      }

      try {
        setSearchingCustomers(true);

        const response = await api.get("/customers", {
          params: {
            search: customerSearch.trim(),
            limit: 10,
            status: "active",
          },
        });

        const customerData =
          response.data?.customers ||
          response.data?.data ||
          [];

        setCustomers(
          Array.isArray(customerData)
            ? customerData
            : []
        );
      } catch (requestError) {
        console.error(
          "Customer search failed:",
          requestError
        );
      } finally {
        setSearchingCustomers(false);
      }
    };

    const timer = setTimeout(
      searchCustomers,
      300
    );

    return () => clearTimeout(timer);
  }, [customerSearch]);

  /* =======================================================
     FILTER PRODUCTS
  ======================================================= */

  const filteredProducts = useMemo(() => {
    const search = productSearch
      .trim()
      .toLowerCase();

    if (!search) {
      return products;
    }

    return products.filter(
      (product) =>
        product.name
          ?.toLowerCase()
          .includes(search) ||
        product.sku
          ?.toLowerCase()
          .includes(search) ||
        product.barcode
          ?.toLowerCase()
          .includes(search)
    );
  }, [products, productSearch]);

  /* =======================================================
     TOTALS
  ======================================================= */

  const subtotal = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum +
        Number(item.sellingPrice || 0) *
          Number(item.quantity || 0),
      0
    );
  }, [cart]);

  const parsedDiscount = Number(discount) || 0;

  const total = Math.max(
    subtotal - parsedDiscount,
    0
  );

  const parsedCashReceived =
    Number(cashReceived) || 0;

  const change = Math.max(
    parsedCashReceived - total,
    0
  );

  const cashIsEnough =
    paymentMethod !== "CASH" ||
    parsedCashReceived >= total;

  /* =======================================================
     ADD PRODUCT
  ======================================================= */

  const addToCart = (product) => {
    setError("");

    if (
      product.trackStock &&
      Number(product.stockQuantity || 0) <= 0
    ) {
      setError(
        `${product.name} is out of stock.`
      );

      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item._id === product._id
      );

      if (existing) {
        if (
          product.trackStock &&
          existing.quantity >=
            Number(product.stockQuantity || 0)
        ) {
          setError(
            `Only ${product.stockQuantity} units of ${product.name} are available.`
          );

          return currentCart;
        }

        return currentCart.map((item) =>
          item._id === product._id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ];
    });
  };

  /* =======================================================
     INCREASE QUANTITY
  ======================================================= */

  const increaseQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item._id !== productId) {
          return item;
        }

        if (
          item.trackStock &&
          item.quantity >=
            Number(item.stockQuantity || 0)
        ) {
          setError(
            `Only ${item.stockQuantity} units of ${item.name} are available.`
          );

          return item;
        }

        return {
          ...item,
          quantity: item.quantity + 1,
        };
      })
    );
  };

  /* =======================================================
     DECREASE QUANTITY
  ======================================================= */

  const decreaseQuantity = (productId) => {
    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item._id !== productId) {
            return item;
          }

          return {
            ...item,
            quantity: item.quantity - 1,
          };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  /* =======================================================
     REMOVE PRODUCT
  ======================================================= */

  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item._id !== productId
      )
    );
  };

  /* =======================================================
     CLEAR CART
  ======================================================= */

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCashReceived("");

    setPaymentTransaction(null);
    setPaymentPolling(false);
    setCardPaymentStatus("IDLE");

    setManualPaymentVerified(false);

    setError("");
  };

  /* =======================================================
     SELECT CUSTOMER
  ======================================================= */

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(
      customer.name ||
        customer.fullName ||
        customer.phone ||
        ""
    );
    setCustomers([]);
    setCustomerPanelOpen(false);
  };

  /* =======================================================
     REMOVE CUSTOMER
  ======================================================= */

  const removeCustomer = () => {
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomers([]);
  };

  /* =======================================================
     HOLD SALE
  ======================================================= */

  const holdCurrentSale = () => {
    if (cart.length === 0) {
      setError(
        "Add products before holding a sale."
      );
      return;
    }

    const heldSale = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      cart,
      discount,
      selectedCustomer,
      paymentMethod,
    };

    setHeldSales((current) => [
      ...current,
      heldSale,
    ]);

    clearCart();

    setSelectedCustomer(null);
    setCustomerSearch("");

    setHeldSalesOpen(true);
  };

  /* =======================================================
     RESUME HELD SALE
  ======================================================= */

  const resumeHeldSale = (heldSale) => {
    setCart(heldSale.cart || []);
    setDiscount(heldSale.discount || 0);

    setSelectedCustomer(
      heldSale.selectedCustomer || null
    );

    setCustomerSearch(
      heldSale.selectedCustomer?.name ||
        heldSale.selectedCustomer?.fullName ||
        heldSale.selectedCustomer?.phone ||
        ""
    );

    setPaymentMethod(
      heldSale.paymentMethod || "CASH"
    );

    setCashReceived("");

    setManualPaymentVerified(false);

    setCardPaymentStatus("IDLE");
    setPaymentTransaction(null);
    setPaymentPolling(false);

    setHeldSales((current) =>
      current.filter(
        (item) => item.id !== heldSale.id
      )
    );

    setHeldSalesOpen(false);
    setError("");
  };

  /* =======================================================
     DELETE HELD SALE
  ======================================================= */

  const deleteHeldSale = (heldSaleId) => {
    const confirmed = window.confirm(
      "Delete this held sale? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setHeldSales((current) =>
      current.filter(
        (item) => item.id !== heldSaleId
      )
    );
  };

  /* =======================================================
     CARD PAYMENT ONLY
  ======================================================= */

  const createCardPayment = async () => {
    if (total <= 0) {
      setError(
        "Add products before starting payment."
      );
      return null;
    }

    try {
      setError("");
      setPaymentPolling(true);
      setCardPaymentStatus("PROCESSING");

      const response = await api.post(
        "/payments/transactions",
        {
          amount: total,
          method: "CARD",
          currency: "UGX",
          metadata: {
            source: "MOVA_POS",
            customerId:
              selectedCustomer?._id || null,
            cartItems: cart.map((item) => ({
              productId: item._id,
              quantity: item.quantity,
            })),
          },
        }
      );

      const transaction =
        response.data?.paymentTransaction ||
        response.data?.data;

      if (
        !transaction?.id &&
        !transaction?._id
      ) {
        throw new Error(
          "The payment server did not return a payment transaction."
        );
      }

      const normalizedTransaction = {
        ...transaction,
        id:
          transaction.id ||
          transaction._id,
      };

      setPaymentTransaction(
        normalizedTransaction
      );

      const initialStatus =
        normalizedTransaction.status ||
        "PENDING";

      if (
        initialStatus === "APPROVED"
      ) {
        setCardPaymentStatus(
          "APPROVED"
        );
        setPaymentPolling(false);
      }

      return normalizedTransaction;
    } catch (requestError) {
      console.error(
        "Card payment failed:",
        requestError
      );

      setPaymentPolling(false);
      setCardPaymentStatus("IDLE");
      setPaymentTransaction(null);

      setError(
        requestError.response?.data
          ?.message ||
          requestError.message ||
          "Unable to start card payment."
      );

      return null;
    }
  };

  /* =======================================================
     CANCEL CARD PAYMENT
  ======================================================= */

  const cancelCardPayment = async () => {
    const transactionId =
      paymentTransaction?.id ||
      paymentTransaction?._id;

    if (transactionId) {
      try {
        await api.patch(
          `/payments/transactions/${transactionId}/status`,
          {
            status: "CANCELLED",
            failureReason:
              "Cancelled by cashier before sale completion.",
          }
        );
      } catch (requestError) {
        console.error(
          "Failed to cancel card payment:",
          requestError
        );
      }
    }

    setCardPaymentStatus("IDLE");
    setPaymentTransaction(null);
    setPaymentPolling(false);
  };

  /* =======================================================
     CARD PAYMENT POLLING
  ======================================================= */

  useEffect(() => {
    const transactionId =
      paymentTransaction?.id ||
      paymentTransaction?._id;

    /*
     * IMPORTANT:
     * Poll ONLY CARD payments.
     *
     * Mobile Money and Bank do not use polling.
     */
    if (
      paymentMethod !== "CARD" ||
      !transactionId ||
      cardPaymentStatus !== "PROCESSING"
    ) {
      return undefined;
    }

    let cancelled = false;

    const pollPayment = async () => {
      try {
        const response = await api.get(
          `/payments/transactions/${transactionId}`
        );

        const transaction =
          response.data?.paymentTransaction ||
          response.data?.data;

        if (
          !transaction ||
          cancelled
        ) {
          return;
        }

        setPaymentTransaction({
          ...transaction,
          id:
            transaction.id ||
            transaction._id,
        });

        const status =
          transaction.status;

        if (
          status === "APPROVED"
        ) {
          setCardPaymentStatus(
            "APPROVED"
          );
          setPaymentPolling(false);
          return;
        }

        if (
          [
            "DECLINED",
            "FAILED",
            "CANCELLED",
          ].includes(status)
        ) {
          setCardPaymentStatus(
            status
          );

          setPaymentPolling(false);

          setError(
            transaction.failureReason ||
              `Card payment ${status.toLowerCase()}.`
          );
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        console.error(
          "Card payment status check failed:",
          requestError
        );

        setPaymentPolling(false);

        setError(
          requestError.response?.data
            ?.message ||
            "Unable to check card payment status."
        );
      }
    };

    pollPayment();

    const interval =
      window.setInterval(
        pollPayment,
        2000
      );

    return () => {
      cancelled = true;

      window.clearInterval(
        interval
      );
    };
  }, [
    paymentMethod,
    paymentTransaction?.id,
    paymentTransaction?._id,
    cardPaymentStatus,
  ]);

  /* =======================================================
     CHANGE PAYMENT METHOD
  ======================================================= */

  const changePaymentMethod = (
    method
  ) => {
    if (
      method !==
      paymentMethod
    ) {
      setCardPaymentStatus(
        "IDLE"
      );

      setPaymentTransaction(
        null
      );

      setPaymentPolling(
        false
      );

      setManualPaymentVerified(
        false
      );
    }

    setPaymentMethod(method);
    setPaymentPanelOpen(true);
    setError("");

    if (method === "CASH") {
      setCashReceived("");
    }
  };

  /* =======================================================
     MANUAL MOBILE MONEY VERIFICATION
  ======================================================= */

  const verifyMobileMoneyPayment = () => {
    if (total <= 0) {
      setError(
        "Add products before confirming payment."
      );
      return;
    }

    const confirmed = window.confirm(
      `Confirm that you have verified receipt of ${formatCurrency(
        total
      )} in the customer's Mobile Money payment.`
    );

    if (!confirmed) {
      return;
    }

    setManualPaymentVerified(true);
    setError("");
  };

  /* =======================================================
     MANUAL BANK VERIFICATION
  ======================================================= */

  const verifyBankPayment = () => {
    if (total <= 0) {
      setError(
        "Add products before confirming payment."
      );
      return;
    }

    const confirmed = window.confirm(
      `Confirm that you have verified receipt of ${formatCurrency(
        total
      )} in the customer's bank payment.`
    );

    if (!confirmed) {
      return;
    }

    setManualPaymentVerified(true);
    setError("");
  };

  /* =======================================================
   COMPLETE SALE
======================================================= */

const completeSale = async () => {
  setError("");
  setSaleSuccess(null);

  /* -------------------------------------------------------
     VALIDATE CART
  ------------------------------------------------------- */

  if (cart.length === 0) {
    setError(
      "Add at least one product to the cart."
    );
    return;
  }

  /* -------------------------------------------------------
     VALIDATE DISCOUNT
  ------------------------------------------------------- */

  if (parsedDiscount > subtotal) {
    setError(
      "Discount cannot be greater than the subtotal."
    );
    return;
  }

  /* -------------------------------------------------------
     CASH PAYMENT
  ------------------------------------------------------- */

  if (
    paymentMethod === "CASH" &&
    !cashIsEnough
  ) {
    setError(
      `Customer still owes ${formatCurrency(
        total - parsedCashReceived
      )}.`
    );

    setPaymentPanelOpen(true);
    return;
  }

  /* -------------------------------------------------------
     MOBILE MONEY PAYMENT
     
     Mobile Money is manually verified by the cashier.
     No electronic provider approval is required.
  ------------------------------------------------------- */

  if (
    paymentMethod === "MOBILE_MONEY" &&
    !manualPaymentVerified
  ) {
    setError(
      "Verify that the Mobile Money payment has been received, then click Payment Received."
    );

    setPaymentPanelOpen(true);
    return;
  }

  /* -------------------------------------------------------
     BANK PAYMENT
     
     Bank payments are manually verified by the cashier.
  ------------------------------------------------------- */

  if (
    paymentMethod === "BANK" &&
    !manualPaymentVerified
  ) {
    setError(
      "Verify that the bank payment has been received, then confirm the payment."
    );

    setPaymentPanelOpen(true);
    return;
  }

  /* -------------------------------------------------------
     CARD PAYMENT
     
     CARD is the only payment method that requires
     electronic provider/terminal approval.
  ------------------------------------------------------- */

  if (
    paymentMethod === "CARD" &&
    cardPaymentStatus !== "APPROVED"
  ) {
    setError(
      "The card payment must be approved before the sale can be completed."
    );

    setPaymentPanelOpen(true);
    return;
  }

  try {
    setProcessingSale(true);

    /* -----------------------------------------------------
       BUILD SALE PAYLOAD
    ----------------------------------------------------- */

    const payload = {
      items: cart.map((item) => ({
        productId: item._id,
        quantity: item.quantity,
      })),

      discount: parsedDiscount,

      paymentMethod,

      customerId:
        selectedCustomer?._id || null,

      /*
       * Only CARD sends a payment transaction.
       *
       * CASH, MOBILE MONEY and BANK are handled
       * directly by the sale.
       */
      paymentTransactionId:
        paymentMethod === "CARD"
          ? paymentTransaction?.id ||
            paymentTransaction?._id ||
            null
          : null,
    };

    /* -----------------------------------------------------
       CREATE SALE
    ----------------------------------------------------- */

    const response = await api.post(
      "/sales",
      payload
    );

    /* -----------------------------------------------------
       GET CREATED SALE
    ----------------------------------------------------- */

    const sale =
      response?.data?.sale ||
      response?.data?.data;

    if (!sale) {
      throw new Error(
        "Sale was created but the server did not return the sale."
      );
    }

    /* -----------------------------------------------------
       GET CUSTOMER
    ----------------------------------------------------- */

    const customer =
      response?.data?.customer ||
      selectedCustomer ||
      null;

    /* -----------------------------------------------------
       NOTIFY MOVA DASHBOARD
       
       The Dashboard listens for this event and
       automatically requests fresh dashboard data.
    ----------------------------------------------------- */

    window.dispatchEvent(
      new CustomEvent(
        "mova:data-updated",
        {
          detail: {
            type: "SALE_COMPLETED",

            saleId:
              sale?._id || null,

            receiptNumber:
              sale?.receiptNumber || null,

            total:
              Number(sale?.total) || 0,

            paymentMethod:
              sale?.paymentMethod ||
              paymentMethod,

            timestamp:
              new Date().toISOString(),
          },
        }
      )
    );

    /* -----------------------------------------------------
       PREPARE COMPLETED SALE
    ----------------------------------------------------- */

    const saleWithPayment = {
      ...sale,

      amountPaid:
        paymentMethod === "CASH"
          ? parsedCashReceived
          : sale.amountPaid ??
            total,

      change:
        paymentMethod === "CASH"
          ? change
          : sale.change ?? 0,
    };

    /* -----------------------------------------------------
       UPDATE SUCCESS STATE
    ----------------------------------------------------- */

    setCompletedSale(
      saleWithPayment
    );

    setCompletedCustomer(
      customer
    );

    setSaleSuccess({
      receiptNumber:
        sale.receiptNumber,

      total:
        sale.total,

      paymentMethod:
        sale.paymentMethod,

      customer,

      amountPaid:
        paymentMethod === "CASH"
          ? parsedCashReceived
          : total,

      change:
        paymentMethod === "CASH"
          ? change
          : 0,
    });

    /* -----------------------------------------------------
       RECEIPT SETTINGS
    ----------------------------------------------------- */

    const afterSaleAction =
      receiptSettings.afterSaleAction ||
      "SHOW";

    const shouldOpenReceipt =
      afterSaleAction === "SHOW" ||
      afterSaleAction === "PRINT" ||
      afterSaleAction ===
        "SHOW_AND_PRINT";

    const shouldAutoPrint =
      afterSaleAction === "PRINT" ||
      afterSaleAction ===
        "SHOW_AND_PRINT";

    setReceiptAutoPrint(
      shouldAutoPrint
    );

    setShowReceipt(
      shouldOpenReceipt
    );

    /* -----------------------------------------------------
       CLEAR CART
    ----------------------------------------------------- */

    clearCart();

    /* -----------------------------------------------------
       CLEAR CUSTOMER
    ----------------------------------------------------- */

    setSelectedCustomer(null);

    setCustomerSearch("");

    /* -----------------------------------------------------
       REFRESH PRODUCTS
       
       This makes the POS product stock reflect the
       newly completed sale.
    ----------------------------------------------------- */

    await fetchProducts();
  } catch (requestError) {
    console.error(
      "Sale failed:",
      requestError
    );

    setError(
      requestError?.response?.data
        ?.message ||
        requestError?.message ||
        "Failed to complete sale."
    );
  } finally {
    setProcessingSale(false);
  }
};
  /* =======================================================
     NEW SALE
  ======================================================= */

  const startNewSale = () => {
    setSaleSuccess(null);
    setCompletedSale(null);
    setCompletedCustomer(null);
    setShowReceipt(false);
    setReceiptAutoPrint(false);
    setError("");

    setPaymentTransaction(null);
    setPaymentPolling(false);
    setCardPaymentStatus("IDLE");
    setManualPaymentVerified(false);

    setCashReceived("");
  };

  /* =======================================================
     KEYBOARD SHORTCUTS
  ======================================================= */

  useEffect(() => {
    const handleKeyDown =
      (event) => {
        const target =
          event.target;

        const isTyping =
          target?.tagName ===
            "INPUT" ||
          target?.tagName ===
            "TEXTAREA" ||
          target?.tagName ===
            "SELECT" ||
          target?.isContentEditable;

        if (
          isTyping &&
          event.key !==
            "Escape"
        ) {
          return;
        }

        switch (
          event.key
        ) {
          case "F2":
            event.preventDefault();
            productSearchRef.current?.focus();
            break;

          case "F4":
            event.preventDefault();

            setCustomerPanelOpen(
              true
            );

            setTimeout(
              () => {
                customerSearchRef.current?.focus();
              },
              50
            );

            break;

          case "F6":
            event.preventDefault();
            setPaymentPanelOpen(
              true
            );
            break;

          case "F7":
            event.preventDefault();
            holdCurrentSale();
            break;

          case "F8":
            event.preventDefault();
            setHeldSalesOpen(
              true
            );
            break;

          case "F9":
            event.preventDefault();
            completeSale();
            break;

          case "Escape":
            setError("");
            break;

          default:
            break;
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  });

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-5">

      {/* HEADER */}

      <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-2xl font-black text-slate-900">
            MOVA POS
          </h1>

          <p className="text-sm text-slate-500">
            Sales & checkout
          </p>
        </div>

        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            onClick={() =>
              setShortcutsOpen(
                (current) =>
                  !current
              )
            }
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <Keyboard
              size={17}
            />

            Shortcuts

            {shortcutsOpen ? (
              <ChevronUp
                size={16}
              />
            ) : (
              <ChevronDown
                size={16}
              />
            )}
          </button>

          <button
            type="button"
            onClick={
              holdCurrentSale
            }
            className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-100"
          >
            <PauseCircle
              size={17}
            />

            Hold
          </button>

          <button
            type="button"
            onClick={() =>
              setHeldSalesOpen(
                true
              )
            }
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <Clock3
              size={17}
            />

            Held

            {heldSales.length >
              0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                {
                  heldSales.length
                }
              </span>
            )}
          </button>

        </div>

      </div>

      {/* SHORTCUT PANEL */}

      {shortcutsOpen && (
        <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-4">

          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">

            <div>
              <strong>F2</strong>
              <p className="text-slate-500">
                Search products
              </p>
            </div>

            <div>
              <strong>F4</strong>
              <p className="text-slate-500">
                Customer
              </p>
            </div>

            <div>
              <strong>F6</strong>
              <p className="text-slate-500">
                Payment
              </p>
            </div>

            <div>
              <strong>F9</strong>
              <p className="text-slate-500">
                Complete sale
              </p>
            </div>

          </div>

        </div>
      )}

      {/* ERROR */}

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">

          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1">
            <p className="font-bold">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            <X
              size={18}
            />
          </button>

        </div>
      )}

      {/* MAIN */}

      <div className="grid gap-4 xl:grid-cols-[1fr_430px]">

        {/* PRODUCTS */}

        <div className="rounded-2xl bg-white p-4 shadow-sm">

          <div className="mb-4 flex items-center gap-3">

            <div className="relative flex-1">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                ref={
                  productSearchRef
                }
                value={
                  productSearch
                }
                onChange={(
                  event
                ) =>
                  setProductSearch(
                    event.target.value
                  )
                }
                placeholder="Search products by name, SKU or barcode..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

          </div>

          {loadingProducts ? (
            <div className="flex min-h-[300px] items-center justify-center text-slate-500">
              Loading products...
            </div>
          ) : filteredProducts.length ===
            0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center text-center text-slate-500">

              <ShoppingCart
                size={40}
                className="mb-3 text-slate-300"
              />

              <p className="font-bold">
                No products found
              </p>

            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">

              {filteredProducts.map(
                (product) => (
                  <button
                    key={
                      product._id
                    }
                    type="button"
                    onClick={() =>
                      addToCart(
                        product
                      )
                    }
                    className="rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                  >

                    <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-slate-100">

                      {product.imageUrl ||
                      product.image ? (
                        <img
                          src={
                            product.imageUrl ||
                            product.image
                          }
                          alt={
                            product.name
                          }
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ShoppingCart
                          size={30}
                          className="text-slate-300"
                        />
                      )}

                    </div>

                    <p className="line-clamp-2 text-sm font-black text-slate-800">
                      {
                        product.name
                      }
                    </p>

                    <p className="mt-1 text-sm font-bold text-blue-600">
                      {formatCurrency(
                        product.sellingPrice
                      )}
                    </p>

                    {product.trackStock && (
                      <p className="mt-1 text-xs text-slate-400">
                        Stock:{" "}
                        {
                          product.stockQuantity
                        }
                      </p>
                    )}

                  </button>
                )
              )}

            </div>
          )}

        </div>

        {/* CHECKOUT */}

        <div className="rounded-2xl bg-white p-4 shadow-sm">

          {/* CUSTOMER */}

          <div className="mb-5">

            <div className="mb-2 flex items-center justify-between">

              <p className="text-sm font-black text-slate-700">
                Customer
              </p>

              <button
                type="button"
                onClick={() =>
                  setCustomerPanelOpen(
                    (current) =>
                      !current
                  )
                }
                className="flex items-center gap-1 text-xs font-bold text-blue-600"
              >
                <UserPlus
                  size={15}
                />

                Add customer
              </button>

            </div>

            <div className="relative">

              <User
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                ref={
                  customerSearchRef
                }
                value={
                  customerSearch
                }
                onChange={(
                  event
                ) => {
                  setCustomerSearch(
                    event.target.value
                  );
                  setCustomerPanelOpen(
                    true
                  );
                }}
                placeholder="Search customer..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {selectedCustomer && (
              <div className="mt-2 flex items-center justify-between rounded-xl bg-blue-50 p-3">

                <div>
                  <p className="font-bold text-blue-900">
                    {
                      selectedCustomer.name ||
                      selectedCustomer.fullName
                    }
                  </p>

                  <p className="text-xs text-blue-600">
                    {
                      selectedCustomer.phone
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    removeCustomer
                  }
                  className="text-blue-600"
                >
                  <X
                    size={17}
                  />
                </button>

              </div>
            )}

            {customerPanelOpen &&
              customerSearch &&
              customers.length >
                0 && (
                <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">

                  {customers.map(
                    (customer) => (
                      <button
                        key={
                          customer._id
                        }
                        type="button"
                        onClick={() =>
                          selectCustomer(
                            customer
                          )
                        }
                        className="flex w-full items-center gap-3 border-b border-slate-100 p-3 text-left last:border-0 hover:bg-slate-50"
                      >

                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                          <User
                            size={17}
                          />
                        </div>

                        <div>
                          <p className="font-bold">
                            {
                              customer.name ||
                              customer.fullName
                            }
                          </p>

                          <p className="text-xs text-slate-500">
                            {
                              customer.phone
                            }
                          </p>
                        </div>

                      </button>
                    )
                  )}

                </div>
              )}

          </div>

          {/* CART */}

          <div className="mb-5">

            <div className="mb-3 flex items-center justify-between">

              <p className="text-sm font-black text-slate-700">
                Cart
              </p>

              {cart.length >
                0 && (
                <button
                  type="button"
                  onClick={
                    clearCart
                  }
                  className="text-xs font-bold text-red-600"
                >
                  Clear
                </button>
              )}

            </div>

            {cart.length ===
            0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">

                <ShoppingCart
                  size={30}
                  className="mx-auto mb-2 text-slate-300"
                />

                <p className="text-sm font-bold text-slate-500">
                  Cart is empty
                </p>

              </div>
            ) : (
              <div className="max-h-[330px] space-y-2 overflow-y-auto">

                {cart.map(
                  (item) => (
                    <div
                      key={
                        item._id
                      }
                      className="rounded-xl border border-slate-200 p-3"
                    >

                      <div className="flex items-start justify-between gap-3">

                        <div className="min-w-0 flex-1">

                          <p className="truncate text-sm font-black text-slate-800">
                            {
                              item.name
                            }
                          </p>

                          <p className="text-xs text-slate-500">
                            {formatCurrency(
                              item.sellingPrice
                            )}
                          </p>

                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              item._id
                            )
                          }
                          className="text-red-500"
                        >
                          <Trash2
                            size={16}
                          />
                        </button>

                      </div>

                      <div className="mt-3 flex items-center justify-between">

                        <div className="flex items-center gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              decreaseQuantity(
                                item._id
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 font-black"
                          >
                            −
                          </button>

                          <span className="w-8 text-center font-black">
                            {
                              item.quantity
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              increaseQuantity(
                                item._id
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 font-black"
                          >
                            +
                          </button>

                        </div>

                        <p className="font-black text-slate-900">
                          {formatCurrency(
                            Number(
                              item.sellingPrice
                            ) *
                              Number(
                                item.quantity
                              )
                          )}
                        </p>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

          {/* TOTALS */}

          <div className="space-y-3 border-t border-slate-200 pt-4">

            <div className="flex justify-between text-sm">

              <span className="text-slate-500">
                Subtotal
              </span>

              <span className="font-bold">
                {formatCurrency(
                  subtotal
                )}
              </span>

            </div>

            <div className="flex items-center justify-between gap-3">

              <span className="text-sm text-slate-500">
                Discount
              </span>

              <input
                type="number"
                min="0"
                value={
                  discount
                }
                onChange={(
                  event
                ) =>
                  setDiscount(
                    event.target.value
                  )
                }
                className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-right font-bold outline-none focus:border-blue-500"
              />

            </div>

            <div className="flex justify-between border-t border-slate-200 pt-3">

              <span className="text-lg font-black text-slate-900">
                Total
              </span>

              <span className="text-xl font-black text-blue-600">
                {formatCurrency(
                  total
                )}
              </span>

            </div>

          </div>

          {/* PAYMENT */}

          <div className="mt-5">

            <div className="mb-3 flex items-center justify-between">

              <p className="text-sm font-bold text-slate-700">
                Payment Method
              </p>

              <button
                type="button"
                onClick={() =>
                  setPaymentPanelOpen(
                    (current) =>
                      !current
                  )
                }
                className="text-xs font-bold text-blue-600"
              >
                {paymentPanelOpen
                  ? "Hide"
                  : "Payment details"}
              </button>

            </div>

            <div className="grid grid-cols-2 gap-2">

              {PAYMENT_METHODS.map(
                ({
                  value,
                  label,
                  icon: Icon,
                }) => (
                  <button
                    key={
                      value
                    }
                    type="button"
                    onClick={() =>
                      changePaymentMethod(
                        value
                      )
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition ${
                      paymentMethod ===
                      value
                        ? "border-blue-500 bg-blue-50 text-blue-600"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon
                      size={17}
                    />

                    {
                      label
                    }
                  </button>
                )
              )}

            </div>

            {paymentPanelOpen && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                {/* CASH */}

                {paymentMethod ===
                  "CASH" && (
                  <div>

                    <div className="flex items-center gap-2">

                      <HandCoins
                        size={18}
                        className="text-emerald-600"
                      />

                      <p className="font-bold text-slate-800">
                        Cash Payment
                      </p>

                    </div>

                    <label className="mt-4 mb-2 block text-sm font-bold text-slate-600">
                      Cash received
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={
                        cashReceived
                      }
                      onChange={(
                        event
                      ) =>
                        setCashReceived(
                          event.target.value
                        )
                      }
                      placeholder="Enter amount received"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-lg font-bold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <div className="mt-4 grid grid-cols-2 gap-3">

                      <div className="rounded-xl bg-white p-3">

                        <p className="text-xs font-bold uppercase text-slate-400">
                          Customer owes
                        </p>

                        <p className="mt-1 font-black text-slate-900">
                          {formatCurrency(
                            total
                          )}
                        </p>

                      </div>

                      <div className="rounded-xl bg-emerald-50 p-3">

                        <p className="text-xs font-bold uppercase text-emerald-600">
                          Change
                        </p>

                        <p className="mt-1 font-black text-emerald-700">
                          {formatCurrency(
                            change
                          )}
                        </p>

                      </div>

                    </div>

                    {parsedCashReceived >
                      0 &&
                      !cashIsEnough && (
                        <p className="mt-3 text-sm font-bold text-red-600">
                          Insufficient cash:{" "}
                          {formatCurrency(
                            total -
                              parsedCashReceived
                          )}{" "}
                          remaining.
                        </p>
                      )}

                  </div>
                )}

                {/* MOBILE MONEY */}

                {paymentMethod ===
                  "MOBILE_MONEY" && (
                  <div>

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">

                        <Smartphone
                          size={21}
                          className="text-blue-600"
                        />

                      </div>

                      <div>

                        <p className="font-black text-slate-900">
                          Mobile Money
                        </p>

                        <p className="text-xs text-slate-500">
                          Amount to receive:{" "}
                          {formatCurrency(
                            total
                          )}
                        </p>

                      </div>

                    </div>

                    {!manualPaymentVerified ? (
                      <div className="mt-4">

                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

                          <p className="font-black text-amber-800">
                            Verify payment manually
                          </p>

                          <p className="mt-1 text-sm text-amber-700">
                            Ask the customer to send the money, then check your Mobile Money phone/account and confirm that the money has actually been received.
                          </p>

                        </div>

                        <button
                          type="button"
                          onClick={
                            verifyMobileMoneyPayment
                          }
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 font-black text-white hover:bg-emerald-700"
                        >

                          <CheckCircle2
                            size={20}
                          />

                          Payment Received — Complete Sale

                        </button>

                      </div>
                    ) : (
                      <div className="mt-4">

                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                          <div className="flex items-center gap-3">

                            <CheckCircle2
                              size={24}
                              className="text-emerald-600"
                            />

                            <div>

                              <p className="font-black text-emerald-700">
                                Mobile Money payment verified
                              </p>

                              <p className="text-sm text-emerald-600">
                                {formatCurrency(
                                  total
                                )}{" "}
                                has been confirmed as received.
                              </p>

                            </div>

                          </div>

                        </div>

                        <button
                          type="button"
                          onClick={
                            completeSale
                          }
                          disabled={
                            processingSale
                          }
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-4 font-black text-white hover:bg-blue-700 disabled:opacity-50"
                        >

                          <CheckCircle2
                            size={20}
                          />

                          Complete Sale

                        </button>

                      </div>
                    )}

                  </div>
                )}

                {/* CARD */}

                {paymentMethod ===
                  "CARD" && (
                  <div>

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">

                        <CreditCard
                          size={20}
                          className="text-blue-600"
                        />

                      </div>

                      <div>

                        <p className="font-black text-slate-900">
                          Card Terminal
                        </p>

                        <p className="text-xs text-slate-500">
                          Amount to charge:{" "}
                          {formatCurrency(
                            total
                          )}
                        </p>

                      </div>

                    </div>

                    {cardPaymentStatus ===
                      "IDLE" && (
                      <button
                        type="button"
                        onClick={
                          createCardPayment
                        }
                        className="mt-4 w-full rounded-xl bg-slate-900 px-4 py-3 font-black text-white hover:bg-slate-800"
                      >
                        Start Card Payment
                      </button>
                    )}

                    {cardPaymentStatus ===
                      "PROCESSING" && (
                      <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">

                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">

                          <CreditCard
                            size={25}
                            className="animate-pulse text-blue-600"
                          />

                        </div>

                        <p className="mt-3 font-black text-blue-900">
                          Waiting for card terminal
                        </p>

                        <p className="mt-1 text-sm text-blue-700">
                          Present, insert or swipe the customer's card on the connected payment terminal.
                        </p>

                        <button
                          type="button"
                          onClick={
                            cancelCardPayment
                          }
                          className="mt-4 text-sm font-bold text-red-600"
                        >
                          Cancel payment
                        </button>

                      </div>
                    )}

                    {cardPaymentStatus ===
                      "APPROVED" && (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                        <div className="flex items-center gap-3">

                          <CheckCircle2
                            size={23}
                            className="text-emerald-600"
                          />

                          <div>

                            <p className="font-black text-emerald-700">
                              Card payment approved
                            </p>

                            <p className="text-sm text-emerald-600">
                              You can now complete the sale.
                            </p>

                          </div>

                        </div>

                      </div>
                    )}

                  </div>
                )}

                {/* BANK */}

                {paymentMethod ===
                  "BANK" && (
                  <div>

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">

                        <CreditCard
                          size={20}
                          className="text-blue-600"
                        />

                      </div>

                      <div>

                        <p className="font-black text-slate-900">
                          Bank Payment
                        </p>

                        <p className="text-xs text-slate-500">
                          Amount to receive:{" "}
                          {formatCurrency(
                            total
                          )}
                        </p>

                      </div>

                    </div>

                    {!manualPaymentVerified ? (
                      <div className="mt-4">

                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">

                          <p className="font-black text-amber-800">
                            Verify bank payment manually
                          </p>

                          <p className="mt-1 text-sm text-amber-700">
                            Confirm from your bank/account notification that the customer's payment has actually been received.
                          </p>

                        </div>

                        <button
                          type="button"
                          onClick={
                            verifyBankPayment
                          }
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-4 font-black text-white hover:bg-emerald-700"
                        >

                          <CheckCircle2
                            size={20}
                          />

                          Payment Received

                        </button>

                      </div>
                    ) : (
                      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">

                        <div className="flex items-center gap-3">

                          <CheckCircle2
                            size={23}
                            className="text-emerald-600"
                          />

                          <div>

                            <p className="font-black text-emerald-700">
                              Bank payment verified
                            </p>

                            <p className="text-sm text-emerald-600">
                              The payment has been manually confirmed.
                            </p>

                          </div>

                        </div>

                      </div>
                    )}

                  </div>
                )}

              </div>
            )}

          </div>

          {/* ACTIONS */}

          <div className="mt-5 grid grid-cols-2 gap-2">

            <button
              type="button"
              onClick={
                holdCurrentSale
              }
              disabled={
                cart.length ===
                0
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-4 font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >

              <PauseCircle
                size={19}
              />

              Hold

              <span className="hidden text-xs opacity-60 sm:inline">
                F7
              </span>

            </button>

            <button
              type="button"
              onClick={() =>
                setHeldSalesOpen(
                  true
                )
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-4 font-black text-slate-700 transition hover:bg-slate-50"
            >

              <Clock3
                size={19}
              />

              Held

              {heldSales.length >
                0 && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                  {
                    heldSales.length
                  }
                </span>
              )}

            </button>

          </div>

          {/* MAIN COMPLETE BUTTON */}

          <button
            type="button"
            onClick={
              completeSale
            }
            disabled={
              processingSale ||
              cart.length ===
                0 ||
              !cashIsEnough ||
              /*
               * Only CARD is blocked until provider approval.
               *
               * Mobile Money and Bank are allowed once the
               * cashier manually verifies payment.
               */
              (paymentMethod ===
                "CARD" &&
                cardPaymentStatus !==
                  "APPROVED")
            }
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {processingSale ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                Processing...
              </>
            ) : (
              <>
                <CheckCircle2
                  size={19}
                />

                Complete Sale

                <span className="hidden text-xs opacity-60 sm:inline">
                  F9
                </span>
              </>
            )}

          </button>

        </div>

      </div>

      {/* HELD SALES MODAL */}

      {heldSalesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">

            <div className="mb-4 flex items-center justify-between">

              <div>

                <h2 className="text-xl font-black text-slate-900">
                  Held Sales
                </h2>

                <p className="text-sm text-slate-500">
                  Resume a sale later
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setHeldSalesOpen(
                    false
                  )
                }
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X
                  size={20}
                />
              </button>

            </div>

            {heldSales.length ===
            0 ? (
              <div className="py-10 text-center text-slate-500">
                No held sales.
              </div>
            ) : (
              <div className="max-h-[500px] space-y-3 overflow-y-auto">

                {heldSales.map(
                  (heldSale) => (
                    <div
                      key={
                        heldSale.id
                      }
                      className="rounded-xl border border-slate-200 p-4"
                    >

                      <div className="flex items-center justify-between">

                        <div>

                          <p className="font-black text-slate-900">
                            {heldSale.cart?.length ||
                              0}{" "}
                            item(s)
                          </p>

                          <p className="text-xs text-slate-500">
                            {
                              heldSale.selectedCustomer
                                ?.name
                            }
                          </p>

                        </div>

                        <div className="flex gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              resumeHeldSale(
                                heldSale
                              )
                            }
                            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white"
                          >

                            <PlayCircle
                              size={15}
                            />

                            Resume

                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteHeldSale(
                                heldSale.id
                              )
                            }
                            className="rounded-lg bg-red-50 px-3 py-2 text-xs font-black text-red-600"
                          >
                            Delete
                          </button>

                        </div>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </div>

        </div>
      )}

      {/* SALE SUCCESS / RECEIPT */}

      {saleSuccess &&
        !showReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

            <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">

                <CheckCircle2
                  size={35}
                  className="text-emerald-600"
                />

              </div>

              <h2 className="mt-4 text-2xl font-black text-slate-900">
                Sale Completed
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Receipt:{" "}
                {
                  saleSuccess.receiptNumber
                }
              </p>

              <p className="mt-4 text-3xl font-black text-blue-600">
                {formatCurrency(
                  saleSuccess.total
                )}
              </p>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {
                  saleSuccess.paymentMethod
                }
              </p>

              <button
                type="button"
                onClick={() =>
                  setShowReceipt(
                    true
                  )
                }
                className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-4 font-black text-white hover:bg-blue-700"
              >
                View Receipt
              </button>

              <button
                type="button"
                onClick={
                  startNewSale
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-4 font-black text-slate-700 hover:bg-slate-50"
              >
                New Sale
              </button>

            </div>

          </div>
        )}

      {/* RECEIPT */}

      {showReceipt &&
        completedSale && (
          <Receipt
            sale={
              completedSale
            }
            customer={
              completedCustomer
            }
            open={
              showReceipt
            }
            onClose={() =>
              setShowReceipt(
                false
              )
            }
            autoPrint={
              receiptAutoPrint
            }
            settings={
              receiptSettings
            }
          />
        )}

    </div>
  );
};

export default POS;