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

const formatTime = (date) => {
  if (!date) {
    return "-";
  }

  try {
    return new Date(date).toLocaleTimeString(
      "en-UG",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    return "-";
  }
};

const loadHeldSales = () => {
  try {
    const stored = localStorage.getItem(
      HELD_SALES_KEY
    );

    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.error(
      "Failed to load held sales:",
      error
    );

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
    console.error(
      "Failed to save held sales:",
      error
    );
  }
};


/* =========================================================
   POS COMPONENT
========================================================= */

const POS = () => {
  /* =======================================================
     PRODUCTS
  ======================================================= */

  const [products, setProducts] =
    useState([]);

  const [productSearch, setProductSearch] =
    useState("");

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  const productSearchRef =
    useRef(null);


  /* =======================================================
     CART
  ======================================================= */

  const [cart, setCart] =
    useState([]);

  const [discount, setDiscount] =
    useState(0);


  /* =======================================================
     CUSTOMER
  ======================================================= */

  const [customerSearch, setCustomerSearch] =
    useState("");

  const [customers, setCustomers] =
    useState([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState(null);

  const [searchingCustomers, setSearchingCustomers] =
    useState(false);

  const [customerPanelOpen, setCustomerPanelOpen] =
    useState(false);

  const customerSearchRef =
    useRef(null);


  /* =======================================================
     PAYMENT
  ======================================================= */

  const [paymentMethod, setPaymentMethod] =
    useState("CASH");

  const [cashReceived, setCashReceived] =
    useState("");

  const [paymentPanelOpen, setPaymentPanelOpen] =
    useState(true);

  /*
   * IMPORTANT:
   *
   * CARD PROCESSING IS ONLY A UI STATE FOR NOW.
   * We will connect this to the physical terminal
   * after the backend payment architecture is ready.
   */
  const [cardPaymentStatus, setCardPaymentStatus] =
    useState("IDLE");

  const [paymentTransaction, setPaymentTransaction] =
    useState(null);

  const [paymentPolling, setPaymentPolling] =
    useState(false);


  /* =======================================================
     HELD SALES
  ======================================================= */

  const [heldSales, setHeldSales] =
    useState(() => loadHeldSales());

  const [heldSalesOpen, setHeldSalesOpen] =
    useState(false);


  /* =======================================================
     SALE
  ======================================================= */

  const [processingSale, setProcessingSale] =
    useState(false);

  const [saleSuccess, setSaleSuccess] =
    useState(null);

  const [completedSale, setCompletedSale] =
    useState(null);

  const [completedCustomer, setCompletedCustomer] =
    useState(null);

  const [showReceipt, setShowReceipt] =
    useState(false);

  const [receiptAutoPrint, setReceiptAutoPrint] =
    useState(false);

  const [receiptSettings, setReceiptSettings] =
    useState(() => loadReceiptSettings());

  const [error, setError] =
    useState("");


  /* =======================================================
     SHORTCUTS
  ======================================================= */

  const [shortcutsOpen, setShortcutsOpen] =
    useState(false);


  /* =======================================================
     LOAD PRODUCTS
  ======================================================= */

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);

      const response = await api.get(
        "/products",
        {
          params: {
            limit: 100,
            status: "active",
          },
        }
      );

      const productData =
        response.data?.products ||
        response.data?.data ||
        [];

      setProducts(
        Array.isArray(productData)
          ? productData
          : []
      );
    } catch (requestError) {
      console.error(
        "Failed to load products:",
        requestError
      );

      setError(
        requestError.response?.data
          ?.message ||
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
     SAVE HELD SALES
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
    const searchCustomers =
      async () => {
        if (!customerSearch.trim()) {
          setCustomers([]);
          return;
        }

        try {
          setSearchingCustomers(
            true
          );

          const response =
            await api.get(
              "/customers",
              {
                params: {
                  search:
                    customerSearch.trim(),
                  limit: 10,
                  status: "active",
                },
              }
            );

          const customerData =
            response.data
              ?.customers ||
            response.data?.data ||
            [];

          setCustomers(
            Array.isArray(
              customerData
            )
              ? customerData
              : []
          );
        } catch (requestError) {
          console.error(
            "Customer search failed:",
            requestError
          );
        } finally {
          setSearchingCustomers(
            false
          );
        }
      };

    const timer =
      setTimeout(
        searchCustomers,
        300
      );

    return () =>
      clearTimeout(timer);
  }, [customerSearch]);


  /* =======================================================
     FILTER PRODUCTS
  ======================================================= */

  const filteredProducts =
    useMemo(() => {
      const search =
        productSearch
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
    }, [
      products,
      productSearch,
    ]);


  /* =======================================================
     TOTALS
  ======================================================= */

  const subtotal =
    useMemo(() => {
      return cart.reduce(
        (sum, item) =>
          sum +
          Number(
            item.sellingPrice || 0
          ) *
            Number(
              item.quantity || 0
            ),
        0
      );
    }, [cart]);

  const parsedDiscount =
    Number(discount) || 0;

  const total = Math.max(
    subtotal -
      parsedDiscount,
    0
  );

  const parsedCashReceived =
    Number(cashReceived) ||
    0;

  const change = Math.max(
    parsedCashReceived -
      total,
    0
  );

  const cashIsEnough =
    paymentMethod !==
      "CASH" ||
    parsedCashReceived >=
      total;


  /* =======================================================
     ADD PRODUCT
  ======================================================= */

  const addToCart = (
    product
  ) => {
    setError("");

    if (
      product.trackStock &&
      Number(
        product.stockQuantity || 0
      ) <= 0
    ) {
      setError(
        `${product.name} is out of stock.`
      );

      return;
    }

    setCart(
      (currentCart) => {
        const existing =
          currentCart.find(
            (item) =>
              item._id ===
              product._id
          );

        if (existing) {
          if (
            product.trackStock &&
            existing.quantity >=
              Number(
                product.stockQuantity ||
                  0
              )
          ) {
            setError(
              `Only ${product.stockQuantity} units of ${product.name} are available.`
            );

            return currentCart;
          }

          return currentCart.map(
            (item) =>
              item._id ===
              product._id
                ? {
                    ...item,
                    quantity:
                      item.quantity +
                      1,
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
      }
    );
  };


  /* =======================================================
     INCREASE QUANTITY
  ======================================================= */

  const increaseQuantity = (
    productId
  ) => {
    setCart(
      (currentCart) =>
        currentCart.map(
          (item) => {
            if (
              item._id !==
              productId
            ) {
              return item;
            }

            if (
              item.trackStock &&
              item.quantity >=
                Number(
                  item.stockQuantity ||
                    0
                )
            ) {
              setError(
                `Only ${item.stockQuantity} units of ${item.name} are available.`
              );

              return item;
            }

            return {
              ...item,
              quantity:
                item.quantity +
                1,
            };
          }
        )
    );
  };


  /* =======================================================
     DECREASE QUANTITY
  ======================================================= */

  const decreaseQuantity = (
    productId
  ) => {
    setCart(
      (currentCart) =>
        currentCart
          .map((item) =>
            item._id ===
            productId
              ? {
                  ...item,
                  quantity:
                    item.quantity -
                    1,
                }
              : item
          )
          .filter(
            (item) =>
              item.quantity >
              0
          )
    );
  };


  /* =======================================================
     REMOVE PRODUCT
  ======================================================= */

  const removeFromCart = (
    productId
  ) => {
    setCart(
      (currentCart) =>
        currentCart.filter(
          (item) =>
            item._id !==
            productId
        )
    );
  };


  /* =======================================================
     CLEAR CURRENT SALE
  ======================================================= */

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCashReceived("");
    setPaymentMethod("CASH");
    setSelectedCustomer(null);
    setCustomerSearch("");
    setCustomers([]);
    setPaymentPanelOpen(false);
    setCardPaymentStatus("IDLE");
    setPaymentTransaction(null);
    setPaymentPolling(false);
  };


  /* =======================================================
     SELECT CUSTOMER
  ======================================================= */

  const selectCustomer = (
    customer
  ) => {
    setSelectedCustomer(
      customer
    );

    setCustomerSearch("");
    setCustomers([]);
    setCustomerPanelOpen(false);
    setError("");
  };


  /* =======================================================
     REMOVE CUSTOMER
  ======================================================= */

  const removeCustomer = () => {
    setSelectedCustomer(
      null
    );
  };


  /* =======================================================
     HOLD CURRENT SALE
  ======================================================= */

  const holdCurrentSale = () => {
    setError("");

    if (cart.length === 0) {
      setError(
        "There is no sale to hold."
      );

      return;
    }

    if (
      parsedDiscount >
      subtotal
    ) {
      setError(
        "Discount cannot be greater than the subtotal."
      );

      return;
    }

    const heldSale = {
      id:
        `HELD-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      createdAt:
        new Date().toISOString(),

      customer:
        selectedCustomer ||
        null,

      cart: cart.map(
        (item) => ({
          ...item,
        })
      ),

      discount:
        parsedDiscount,

      paymentMethod:
        paymentMethod,

      cashReceived:
        parsedCashReceived,

      subtotal,
      total,
    };

    setHeldSales(
      (current) => [
        heldSale,
        ...current,
      ]
    );

    /*
     * THIS IS THE IMPORTANT PART.
     *
     * We clear the active transaction
     * immediately.
     *
     * No blocking modal is opened.
     *
     * The cashier can now serve
     * another customer.
     */
    clearCart();

    setProductSearch("");

    setHeldSalesOpen(false);

    setError(
      "Sale held successfully. You can now serve another customer."
    );
  };


  /* =======================================================
     RESUME HELD SALE
  ======================================================= */

  const resumeHeldSale = (
    heldSale
  ) => {
    if (!heldSale) {
      return;
    }

    if (cart.length > 0) {
      const shouldContinue =
        window.confirm(
          "You currently have an active sale. Resume the held sale and replace the current cart?"
        );

      if (!shouldContinue) {
        return;
      }
    }

    setCart(
      Array.isArray(
        heldSale.cart
      )
        ? heldSale.cart
        : []
    );

    setDiscount(
      heldSale.discount ||
        0
    );

    setPaymentMethod(
      heldSale.paymentMethod ||
        "CASH"
    );

    setCashReceived(
      heldSale.cashReceived ||
        ""
    );

    setSelectedCustomer(
      heldSale.customer ||
        null
    );

    setSaleSuccess(null);
    setCompletedSale(null);
    setCompletedCustomer(
      null
    );
    setShowReceipt(false);
    setError("");
    setCardPaymentStatus(
      "IDLE"
    );

    setHeldSales(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            heldSale.id
        )
    );

    setHeldSalesOpen(false);
  };


  /* =======================================================
     DELETE HELD SALE
  ======================================================= */

  const deleteHeldSale = (
    heldSaleId
  ) => {
    const confirmed =
      window.confirm(
        "Delete this held sale? This cannot be undone."
      );

    if (!confirmed) {
      return;
    }

    setHeldSales(
      (current) =>
        current.filter(
          (item) =>
            item.id !==
            heldSaleId
        )
    );
  };


  /* =======================================================
     ELECTRONIC PAYMENTS
  ======================================================= */

  const getElectronicPaymentMethod = (method) => {
    if (method === "BANK") {
      return "BANK_TRANSFER";
    }

    return method;
  };

  const createElectronicPayment = async () => {
    if (total <= 0) {
      setError("Add products before starting payment.");
      return null;
    }

    if (paymentMethod === "CASH") {
      return null;
    }

    try {
      setError("");
      setPaymentPolling(true);
      setCardPaymentStatus("PROCESSING");

      const response = await api.post("/payments/transactions", {
        amount: total,
        method: getElectronicPaymentMethod(paymentMethod),
        currency: "UGX",
        metadata: {
          source: "MOVA_POS",
          customerId: selectedCustomer?._id || null,
          cartItems: cart.map((item) => ({
            productId: item._id,
            quantity: item.quantity,
          })),
        },
      });

      const transaction =
        response.data?.paymentTransaction ||
        response.data?.data;

      if (!transaction?.id && !transaction?._id) {
        throw new Error(
          "The payment server did not return a payment transaction."
        );
      }

      const normalizedTransaction = {
        ...transaction,
        id: transaction.id || transaction._id,
      };

      setPaymentTransaction(normalizedTransaction);

      const initialStatus =
        normalizedTransaction.status || "PENDING";

      if (initialStatus === "APPROVED") {
        setCardPaymentStatus("APPROVED");
        setPaymentPolling(false);
        return normalizedTransaction;
      }

      if (
        [
          "DECLINED",
          "FAILED",
          "CANCELLED",
        ].includes(initialStatus)
      ) {
        setCardPaymentStatus(initialStatus);
        setPaymentPolling(false);

        throw new Error(
          `Payment ${initialStatus.toLowerCase()}.`
        );
      }

      return normalizedTransaction;
    } catch (requestError) {
      console.error(
        "Electronic payment failed to start:",
        requestError
      );

      setPaymentPolling(false);
      setCardPaymentStatus("IDLE");
      setPaymentTransaction(null);

      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to start electronic payment."
      );

      return null;
    }
  };

  const beginCardPayment = () => {
    createElectronicPayment();
  };

  const beginElectronicPayment = () => {
    createElectronicPayment();
  };

  const approveDemoPayment = async () => {
    const transactionId =
      paymentTransaction?.id ||
      paymentTransaction?._id;

    if (!transactionId) {
      setError("Start the payment first, then approve it.");
      return;
    }

    try {
      setError("");

      const demoReference =
        paymentTransaction?.transactionReference ||
        `MOVA-DEMO-${Date.now()}`;

      const response = await api.patch(
        `/payments/transactions/${transactionId}/status`,
        {
          status: "APPROVED",
          transactionReference: demoReference,
          providerReference: demoReference,
          providerResponse: {
            mode: "DEMO",
            source: "MOVA_POS",
            approvedAt: new Date().toISOString(),
          },
        }
      );

      const transaction =
        response.data?.paymentTransaction ||
        response.data?.data;

      if (transaction) {
        setPaymentTransaction({
          ...transaction,
          id: transaction.id || transaction._id,
        });
      }

      setCardPaymentStatus("APPROVED");
      setPaymentPolling(false);
    } catch (requestError) {
      console.error("Demo payment approval failed:", requestError);
      setError(
        requestError.response?.data?.message ||
          requestError.message ||
          "Unable to approve the demo payment."
      );
    }
  };


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
          "Failed to cancel payment transaction:",
          requestError
        );
      }
    }

    setCardPaymentStatus("IDLE");
    setPaymentTransaction(null);
    setPaymentPolling(false);
  };

  useEffect(() => {
    const transactionId =
      paymentTransaction?.id ||
      paymentTransaction?._id;

    if (
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

        if (!transaction || cancelled) {
          return;
        }

        setPaymentTransaction({
          ...transaction,
          id: transaction.id || transaction._id,
        });

        const status = transaction.status;

        if (status === "APPROVED") {
          setCardPaymentStatus("APPROVED");
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
          setCardPaymentStatus(status);
          setPaymentPolling(false);

          setError(
            transaction.failureReason ||
              `Payment ${status.toLowerCase()}.`
          );
        }
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        console.error(
          "Payment status check failed:",
          requestError
        );

        setPaymentPolling(false);
        setError(
          requestError.response?.data?.message ||
            "Unable to check payment status."
        );
      }
    };

    pollPayment();

    const interval = window.setInterval(
      pollPayment,
      2000
    );

    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        setPaymentPolling(false);
        setError(
          "Payment is still pending. Complete or approve the payment on the provider/terminal, then try again."
        );
      }
    }, 120000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [
    paymentTransaction?.id,
    paymentTransaction?._id,
    cardPaymentStatus,
  ]);


  /* =======================================================
     PAYMENT METHOD
  ======================================================= */

  const changePaymentMethod = (
    method
  ) => {
    if (method !== paymentMethod) {
      setCardPaymentStatus("IDLE");
      setPaymentTransaction(null);
      setPaymentPolling(false);
    }

    setPaymentMethod(method);
    setPaymentPanelOpen(true);
    setError("");

    if (method === "CASH") {
      setCashReceived("");
    }
  };


  /* =======================================================
     COMPLETE SALE
  ======================================================= */

  const completeSale =
    async () => {
      setError("");
      setSaleSuccess(null);

      if (cart.length === 0) {
        setError(
          "Add at least one product to the cart."
        );

        return;
      }

      if (
        parsedDiscount >
        subtotal
      ) {
        setError(
          "Discount cannot be greater than the subtotal."
        );

        return;
      }

      if (
        paymentMethod ===
          "CASH" &&
        !cashIsEnough
      ) {
        setError(
          `Customer still owes ${formatCurrency(
            total -
              parsedCashReceived
          )}.`
        );

        setPaymentPanelOpen(
          true
        );

        return;
      }

      /*
       * Every electronic payment must be approved
       * before MOVA creates the sale.
       */
      const isElectronicPayment =
        paymentMethod !== "CASH";

      if (
        isElectronicPayment &&
        cardPaymentStatus !== "APPROVED"
      ) {
        setError(
          "The electronic payment must be approved before the sale can be completed."
        );

        setPaymentPanelOpen(true);
        return;
      }

      try {
        setProcessingSale(
          true
        );

        const payload = {
          items: cart.map(
            (item) => ({
              productId:
                item._id,
              quantity:
                item.quantity,
            })
          ),

          discount:
            parsedDiscount,

          paymentMethod,

          customerId:
            selectedCustomer?._id ||
            null,

          paymentTransactionId:
            isElectronicPayment
              ? paymentTransaction?.id ||
                paymentTransaction?._id ||
                null
              : null,
        };

        const response =
          await api.post(
            "/sales",
            payload
          );

        const sale =
          response.data?.sale ||
          response.data?.data;

        if (!sale) {
          throw new Error(
            "Sale was created but the server did not return the sale."
          );
        }

        const customer =
          response.data?.customer ||
          selectedCustomer ||
          null;

        const saleWithPayment =
          {
            ...sale,

            amountPaid:
              paymentMethod ===
              "CASH"
                ? parsedCashReceived
                : sale.amountPaid,

            change:
              paymentMethod ===
              "CASH"
                ? change
                : sale.change,
          };

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
            paymentMethod ===
            "CASH"
              ? parsedCashReceived
              : null,

          change:
            paymentMethod ===
            "CASH"
              ? change
              : null,
        });

        const afterSaleAction =
          receiptSettings.afterSaleAction ||
          "SHOW";

        const shouldOpenReceipt =
          afterSaleAction === "SHOW" ||
          afterSaleAction === "PRINT" ||
          afterSaleAction === "SHOW_AND_PRINT";

        const shouldAutoPrint =
          afterSaleAction === "PRINT" ||
          afterSaleAction === "SHOW_AND_PRINT";

        setReceiptAutoPrint(
          shouldAutoPrint
        );

        setShowReceipt(
          shouldOpenReceipt
        );

        clearCart();

        await fetchProducts();
      } catch (requestError) {
        console.error(
          "Sale failed:",
          requestError
        );

        setError(
          requestError.response
            ?.data?.message ||
            requestError.message ||
            "Failed to complete sale."
        );
      } finally {
        setProcessingSale(
          false
        );
      }
    };


  /* =======================================================
     NEW SALE
  ======================================================= */

  const startNewSale = () => {
    setSaleSuccess(null);
    setCompletedSale(null);
    setCompletedCustomer(
      null
    );
    setShowReceipt(false);
    setReceiptAutoPrint(false);
    setError("");
    setPaymentTransaction(null);
    setPaymentPolling(false);
    setCardPaymentStatus("IDLE");
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

        /*
         * Don't interfere with typing.
         */
        if (
          isTyping &&
          event.key !==
            "Escape"
        ) {
          return;
        }

        switch (event.key) {
          case "F2":
            event.preventDefault();

            productSearchRef.current?.focus();

            break;

          case "F4":
            event.preventDefault();

            setCustomerPanelOpen(
              true
            );

            setTimeout(() => {
              customerSearchRef.current?.focus();
            }, 50);

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
              (current) =>
                !current
            );

            break;

          case "F9":
            event.preventDefault();

            completeSale();

            break;

          case "Escape":
            event.preventDefault();

            setHeldSalesOpen(
              false
            );

            setCustomerPanelOpen(
              false
            );

            setPaymentPanelOpen(
              false
            );

            setShortcutsOpen(
              false
            );

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
     SALE SUCCESS
  ======================================================= */

  if (saleSuccess) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">

        <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">

            <CheckCircle2
              size={42}
              className="text-emerald-600"
            />

          </div>

          <h1 className="mt-6 text-3xl font-black text-slate-900">
            Sale Completed
          </h1>

          <p className="mt-2 text-slate-500">
            The transaction was
            successfully recorded.
          </p>


          <div className="mt-8 grid gap-4 sm:grid-cols-2">

            <div className="rounded-2xl bg-slate-50 p-5">

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Receipt
              </p>

              <p className="mt-2 font-black text-slate-900">
                {
                  saleSuccess.receiptNumber
                }
              </p>

            </div>


            <div className="rounded-2xl bg-slate-50 p-5">

              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Total
              </p>

              <p className="mt-2 text-xl font-black text-blue-600">
                {formatCurrency(
                  saleSuccess.total
                )}
              </p>

            </div>

          </div>


          {saleSuccess.customer && (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-left">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">

                  <User
                    size={20}
                    className="text-blue-600"
                  />

                </div>

                <div>

                  <p className="text-xs font-bold uppercase tracking-wide text-blue-500">
                    Customer
                  </p>

                  <p className="font-bold text-slate-900">
                    {
                      saleSuccess
                        .customer
                        .name
                    }
                  </p>

                </div>

              </div>

            </div>
          )}


          {saleSuccess.paymentMethod ===
            "CASH" && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">

              <div className="rounded-2xl border border-slate-200 p-5 text-left">

                <p className="text-xs font-bold uppercase text-slate-400">
                  Cash Received
                </p>

                <p className="mt-2 text-xl font-black text-slate-900">
                  {formatCurrency(
                    saleSuccess.amountPaid
                  )}
                </p>

              </div>


              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left">

                <p className="text-xs font-bold uppercase text-emerald-600">
                  Change
                </p>

                <p className="mt-2 text-xl font-black text-emerald-700">
                  {formatCurrency(
                    saleSuccess.change
                  )}
                </p>

              </div>

            </div>
          )}


          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">

            <button
              type="button"
              onClick={() =>
                setShowReceipt(
                  true
                )
              }
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
            >
              View Receipt
            </button>


            <button
              type="button"
              onClick={
                startNewSale
              }
              className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700"
            >
              New Sale
            </button>

          </div>

        </div>


        {showReceipt &&
          completedSale && (
            <Receipt
              sale={
                completedSale
              }
              customer={
                completedCustomer
              }
              onClose={() =>
                setShowReceipt(
                  false
                )
              }
              onNewSale={
                startNewSale
              }
              autoPrint={
                receiptAutoPrint
              }
              receiptSettings={
                receiptSettings
              }
            />
          )}

      </div>
    );
  }


  /* =======================================================
     MAIN POS
  ======================================================= */

  return (
    <div className="relative space-y-6">

      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <h1 className="text-3xl font-black text-slate-900">
            Point of Sale
          </h1>

          <p className="mt-1 text-slate-500">
            Sell products quickly
            and accurately.
          </p>

        </div>


        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            onClick={() =>
              setHeldSalesOpen(
                true
              )
            }
            className="relative inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-700 transition hover:bg-amber-100"
          >

            <PauseCircle
              size={18}
            />

            Held Sales

            {heldSales.length >
              0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-amber-600 px-1.5 text-xs font-black text-white">
                {
                  heldSales.length
                }
              </span>
            )}

            <span className="hidden text-xs opacity-60 sm:inline">
              F8
            </span>

          </button>


          <button
            type="button"
            onClick={() =>
              setShortcutsOpen(
                (current) =>
                  !current
              )
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >

            <Keyboard
              size={18}
            />

            Shortcuts

          </button>

        </div>

      </div>


      {/* ===================================================
          ERROR
      =================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">

          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <p className="text-sm font-medium">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="ml-auto"
          >
            <X size={18} />
          </button>

        </div>
      )}


      {/* ===================================================
          SHORTCUTS
      =================================================== */}

      {shortcutsOpen && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">

          <div className="mb-4 flex items-center justify-between">

            <div>

              <h2 className="font-black text-slate-900">
                POS Keyboard Shortcuts
              </h2>

              <p className="text-sm text-slate-500">
                Designed for fast
                cashier operation.
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setShortcutsOpen(
                  false
                )
              }
              className="rounded-lg p-2 text-slate-400 hover:bg-white"
            >
              <X size={18} />
            </button>

          </div>


          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {[
              ["F2", "Search products"],
              ["F4", "Customer"],
              ["F6", "Payment"],
              ["F7", "Hold sale"],
              ["F8", "Held sales"],
              ["F9", "Complete sale"],
              ["ESC", "Close panels"],
            ].map(
              ([key, description]) => (
                <div
                  key={key}
                  className="flex items-center gap-3 rounded-xl bg-white p-3"
                >

                  <kbd className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm">
                    {key}
                  </kbd>

                  <span className="text-sm font-semibold text-slate-600">
                    {
                      description
                    }
                  </span>

                </div>
              )
            )}

          </div>

        </div>
      )}


      {/* ===================================================
          CUSTOMER
      =================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">

              <User
                size={21}
                className="text-blue-600"
              />

            </div>

            <div>

              <h2 className="font-bold text-slate-900">
                Customer
              </h2>

              <p className="text-sm text-slate-500">
                Optional — walk-in
                customers are supported.
              </p>

            </div>

          </div>


          {selectedCustomer ? (
            <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">

                <User
                  size={19}
                  className="text-blue-600"
                />

              </div>


              <div className="min-w-0 flex-1">

                <p className="font-bold text-slate-900">
                  {
                    selectedCustomer.name
                  }
                </p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">

                  {selectedCustomer.phone && (
                    <span>
                      {
                        selectedCustomer.phone
                      }
                    </span>
                  )}

                  <span>
                    Spent:{" "}
                    {formatCurrency(
                      selectedCustomer.totalSpent
                    )}
                  </span>

                  <span>
                    Credit:{" "}
                    {formatCurrency(
                      selectedCustomer.outstandingBalance
                    )}
                  </span>

                </div>

              </div>


              <button
                type="button"
                onClick={
                  removeCustomer
                }
                className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-red-600"
              >
                <X size={18} />
              </button>

            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                setCustomerPanelOpen(
                  (open) => !open
                )
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            >

              <UserPlus
                size={18}
              />

              Select Customer

              {customerPanelOpen ? (
                <ChevronUp
                  size={17}
                />
              ) : (
                <ChevronDown
                  size={17}
                />
              )}

            </button>
          )}

        </div>


        {customerPanelOpen &&
          !selectedCustomer && (
            <div className="mt-5 border-t border-slate-100 pt-5">

              <div className="relative">

                <Search
                  size={19}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  ref={
                    customerSearchRef
                  }
                  type="text"
                  value={
                    customerSearch
                  }
                  onChange={(event) =>
                    setCustomerSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search customer by name, phone or email..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

              </div>


              {searchingCustomers && (
                <p className="mt-3 text-sm text-slate-500">
                  Searching customers...
                </p>
              )}


              {!searchingCustomers &&
                customerSearch.trim() &&
                customers.length ===
                  0 && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                    No customers found.
                  </div>
                )}


              {customers.length >
                0 && (
                <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">

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
                        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-blue-50"
                      >

                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">

                          <User
                            size={18}
                            className="text-slate-500"
                          />

                        </div>


                        <div className="min-w-0 flex-1">

                          <p className="font-bold text-slate-900">
                            {
                              customer.name
                            }
                          </p>

                          <p className="text-sm text-slate-500">
                            {
                              customer.phone ||
                              customer.email ||
                              "No contact information"
                            }
                          </p>

                        </div>


                        <div className="hidden text-right sm:block">

                          <p className="text-xs text-slate-400">
                            Total spent
                          </p>

                          <p className="font-bold text-slate-700">
                            {formatCurrency(
                              customer.totalSpent
                            )}
                          </p>

                        </div>

                      </button>
                    )
                  )}

                </div>
              )}

            </div>
          )}

      </div>


      {/* ===================================================
          PRODUCTS + CART
      =================================================== */}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">

        {/* =================================================
            PRODUCTS
        ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-xl font-black text-slate-900">
                Products
              </h2>

              <p className="text-sm text-slate-500">
                Search by product,
                SKU or barcode.
              </p>

            </div>


            <div className="relative sm:w-80">

              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                ref={
                  productSearchRef
                }
                type="text"
                value={
                  productSearch
                }
                onChange={(event) =>
                  setProductSearch(
                    event.target.value
                  )
                }
                placeholder="Search products or scan barcode..."
                className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

          </div>


          {loadingProducts ? (
            <div className="flex min-h-64 items-center justify-center">

              <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

            </div>
          ) : filteredProducts.length ===
            0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">

              <ShoppingCart
                size={42}
                className="text-slate-300"
              />

              <h3 className="mt-4 font-bold text-slate-700">
                No products found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Try another search or
                barcode.
              </p>

            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">

              {filteredProducts.map(
                (product) => {
                  const outOfStock =
                    product.trackStock &&
                    Number(
                      product.stockQuantity ||
                        0
                    ) <= 0;

                  return (
                    <button
                      key={
                        product._id
                      }
                      type="button"
                      disabled={
                        outOfStock
                      }
                      onClick={() =>
                        addToCart(
                          product
                        )
                      }
                      className={`group overflow-hidden rounded-2xl border text-left transition ${
                        outOfStock
                          ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                      }`}
                    >

                      <div className="flex aspect-square items-center justify-center bg-slate-100">

                        {product.image ? (
                          <img
                            src={
                              product.image
                            }
                            alt={
                              product.name
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <ShoppingCart
                            size={35}
                            className="text-slate-300"
                          />
                        )}

                      </div>


                      <div className="p-3">

                        <h3 className="line-clamp-2 min-h-10 text-sm font-bold text-slate-800">
                          {
                            product.name
                          }
                        </h3>

                        <p className="mt-1 text-xs text-slate-400">
                          {
                            product.sku
                          }
                        </p>


                        <div className="mt-3 flex items-end justify-between gap-2">

                          <p className="font-black text-blue-600">
                            {formatCurrency(
                              product.sellingPrice
                            )}
                          </p>

                          <p
                            className={`text-xs font-bold ${
                              outOfStock
                                ? "text-red-500"
                                : "text-slate-400"
                            }`}
                          >
                            {product.trackStock
                              ? `${product.stockQuantity} left`
                              : "No tracking"}
                          </p>

                        </div>

                      </div>

                    </button>
                  );
                }
              )}

            </div>
          )}

        </section>


        {/* =================================================
            CART
        ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="text-xl font-black text-slate-900">
                Current Sale
              </h2>

              <p className="text-sm text-slate-500">
                {cart.length} product
                {cart.length ===
                1
                  ? ""
                  : "s"}
              </p>

            </div>


            {cart.length >
              0 && (
              <button
                type="button"
                onClick={
                  clearCart
                }
                className="text-sm font-bold text-red-500 hover:text-red-700"
              >
                Clear
              </button>
            )}

          </div>


          <div className="mt-5 max-h-[430px] space-y-3 overflow-y-auto">

            {cart.length ===
            0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl bg-slate-50 text-center">

                <ShoppingCart
                  size={40}
                  className="text-slate-300"
                />

                <p className="mt-3 font-bold text-slate-600">
                  Cart is empty
                </p>

                <p className="mt-1 text-sm text-slate-400">
                  Select products to
                  start a sale.
                </p>

              </div>
            ) : (
              cart.map(
                (item) => (
                  <div
                    key={
                      item._id
                    }
                    className="rounded-xl border border-slate-100 p-3"
                  >

                    <div className="flex gap-3">

                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">

                        {item.image ? (
                          <img
                            src={
                              item.image
                            }
                            alt={
                              item.name
                            }
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ShoppingCart
                              size={18}
                              className="text-slate-300"
                            />
                          </div>
                        )}

                      </div>


                      <div className="min-w-0 flex-1">

                        <div className="flex items-start justify-between gap-2">

                          <div className="min-w-0">

                            <p className="truncate text-sm font-bold text-slate-800">
                              {
                                item.name
                              }
                            </p>

                            <p className="text-xs text-slate-400">
                              {formatCurrency(
                                item.sellingPrice
                              )}{" "}
                              each
                            </p>

                          </div>


                          <button
                            type="button"
                            onClick={() =>
                              removeFromCart(
                                item._id
                              )
                            }
                            className="shrink-0 text-slate-300 hover:text-red-500"
                          >
                            <X
                              size={17}
                            />
                          </button>

                        </div>


                        <div className="mt-3 flex items-center justify-between">

                          <div className="flex items-center rounded-lg border border-slate-200">

                            <button
                              type="button"
                              onClick={() =>
                                decreaseQuantity(
                                  item._id
                                )
                              }
                              className="px-3 py-1.5 text-slate-500 hover:bg-slate-50"
                            >
                              −
                            </button>

                            <span className="min-w-8 text-center text-sm font-bold">
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
                              className="px-3 py-1.5 text-slate-500 hover:bg-slate-50"
                            >
                              +
                            </button>

                          </div>


                          <p className="font-black text-slate-900">
                            {formatCurrency(
                              Number(
                                item.sellingPrice ||
                                  0
                              ) *
                                Number(
                                  item.quantity ||
                                    0
                                )
                            )}
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>
                )
              )
            )}

          </div>


          {/* =================================================
              TOTALS
          ================================================= */}

          <div className="mt-5 border-t border-slate-100 pt-5">

            <div className="flex items-center justify-between text-sm">

              <span className="text-slate-500">
                Subtotal
              </span>

              <span className="font-bold text-slate-800">
                {formatCurrency(
                  subtotal
                )}
              </span>

            </div>


            <div className="mt-3">

              <label className="mb-2 block text-sm font-bold text-slate-700">
                Discount
              </label>

              <input
                type="number"
                min="0"
                value={
                  discount
                }
                onChange={(event) =>
                  setDiscount(
                    event.target.value
                  )
                }
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>


            <div className="mt-5 flex items-center justify-between">

              <span className="text-lg font-bold text-slate-700">
                Total
              </span>

              <span className="text-2xl font-black text-blue-600">
                {formatCurrency(
                  total
                )}
              </span>

            </div>


            {/* =================================================
                PAYMENT
            ================================================= */}

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

                  {paymentMethod !== "CASH" && paymentTransaction && cardPaymentStatus === "PROCESSING" && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-black uppercase tracking-wide text-amber-700">
                        MOVA Demo / Test Mode
                      </p>
                      <p className="mt-1 text-sm text-amber-800">
                        No live provider is connected yet. Use this button to simulate a successful provider approval.
                      </p>
                      <button
                        type="button"
                        onClick={approveDemoPayment}
                        className="mt-3 w-full rounded-xl bg-amber-600 px-4 py-3 font-black text-white hover:bg-amber-700"
                      >
                        Approve Payment (Demo)
                      </button>
                    </div>
                  )}

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
                        onChange={(event) =>
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
                            Insufficient cash:
                            {" "}
                            {formatCurrency(
                              total -
                                parsedCashReceived
                            )}{" "}
                            remaining.
                          </p>
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

                          <p className="font-bold text-slate-900">
                            Card Terminal
                          </p>

                          <p className="text-xs text-slate-500">
                            Amount to charge:
                            {" "}
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
                            beginCardPayment
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
                            Waiting for
                            terminal
                          </p>

                          <p className="mt-1 text-sm text-blue-700">
                            Present, insert
                            or swipe the
                            customer's card
                            on the connected
                            payment terminal.
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

                      {cardPaymentStatus === "APPROVED" && (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
                          <p className="font-black text-emerald-700">
                            Card payment approved
                          </p>
                          <p className="mt-1 text-sm text-emerald-600">
                            You can now complete the sale.
                          </p>
                        </div>
                      )}

                    </div>
                  )}


                  {/* MOBILE MONEY */}

                  {paymentMethod ===
                    "MOBILE_MONEY" && (
                    <div className="rounded-xl bg-white p-4">

                      <div className="flex items-center gap-3">

                        <Smartphone
                          size={21}
                          className="text-blue-600"
                        />

                        <div>

                          <p className="font-bold text-slate-900">
                            Mobile Money
                          </p>

                          <p className="text-xs text-slate-500">
                            Amount:
                            {" "}
                            {formatCurrency(
                              total
                            )}
                          </p>

                        </div>

                      </div>


                      {cardPaymentStatus === "APPROVED" ? (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <p className="font-black text-emerald-700">
                            Payment approved
                          </p>
                          <p className="mt-1 text-xs text-emerald-600">
                            The sale can now be completed.
                          </p>
                        </div>
                      ) : cardPaymentStatus === "PROCESSING" ? (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
                          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                          <p className="mt-3 font-bold text-blue-900">
                            Waiting for Mobile Money approval...
                          </p>
                          {paymentTransaction?.transactionReference && (
                            <p className="mt-1 text-xs text-blue-700">
                              Ref: {paymentTransaction.transactionReference}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={cancelCardPayment}
                            className="mt-3 text-sm font-bold text-red-600"
                          >
                            Cancel payment
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={beginElectronicPayment}
                          className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-black text-white hover:bg-blue-700"
                        >
                          Start Mobile Money Payment
                        </button>
                      )}

                    </div>
                  )}


                  {/* BANK */}

                  {paymentMethod ===
                    "BANK" && (
                    <div className="rounded-xl bg-white p-4">

                      <div className="flex items-center gap-3">

                        <CreditCard
                          size={21}
                          className="text-blue-600"
                        />

                        <div>

                          <p className="font-bold text-slate-900">
                            Bank Payment
                          </p>

                          <p className="text-xs text-slate-500">
                            Amount:
                            {" "}
                            {formatCurrency(
                              total
                            )}
                          </p>

                        </div>

                      </div>


                      {cardPaymentStatus === "APPROVED" ? (
                        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                          <p className="font-black text-emerald-700">
                            Payment approved
                          </p>
                          <p className="mt-1 text-xs text-emerald-600">
                            The sale can now be completed.
                          </p>
                        </div>
                      ) : cardPaymentStatus === "PROCESSING" ? (
                        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
                          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                          <p className="mt-3 font-bold text-blue-900">
                            Waiting for bank payment approval...
                          </p>
                          <button
                            type="button"
                            onClick={cancelCardPayment}
                            className="mt-3 text-sm font-bold text-red-600"
                          >
                            Cancel payment
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={beginElectronicPayment}
                          className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 font-black text-white hover:bg-blue-700"
                        >
                          Start Bank Payment
                        </button>
                      )}

                    </div>
                  )}

                </div>
              )}

            </div>


            {/* =================================================
                SALE ACTIONS
            ================================================= */}

            <div className="mt-5 grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={
                  holdCurrentSale
                }
                disabled={
                  cart.length ===
                  0
                }
                className="flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 font-black text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
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
                (paymentMethod !== "CASH" &&
                  cardPaymentStatus !== "APPROVED")
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

        </section>

      </div>


      {/* ===================================================
          HELD SALES DRAWER
      =================================================== */}

      {heldSalesOpen && (
        <>

          <div
            className="fixed inset-0 z-40 bg-slate-900/20"
            onClick={() =>
              setHeldSalesOpen(
                false
              )
            }
          />


          <aside className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl">

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

              <div>

                <div className="flex items-center gap-2">

                  <PauseCircle
                    size={21}
                    className="text-amber-600"
                  />

                  <h2 className="font-black text-slate-900">
                    Held Sales
                  </h2>

                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {heldSales.length} sale
                  {heldSales.length ===
                  1
                    ? ""
                    : "s"} waiting
                </p>

              </div>


              <button
                type="button"
                onClick={() =>
                  setHeldSalesOpen(
                    false
                  )
                }
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>

            </div>


            {/* HELD SALES */}

            <div className="flex-1 overflow-y-auto p-4">

              {heldSales.length ===
              0 ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center text-center">

                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">

                    <PauseCircle
                      size={30}
                      className="text-slate-400"
                    />

                  </div>

                  <h3 className="mt-4 font-black text-slate-800">
                    No held sales
                  </h3>

                  <p className="mt-1 max-w-xs text-sm text-slate-500">
                    When you press F7,
                    the current customer
                    will appear here while
                    you serve another
                    customer.
                  </p>

                </div>
              ) : (
                <div className="space-y-3">

                  {heldSales.map(
                    (heldSale) => (
                      <div
                        key={
                          heldSale.id
                        }
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="min-w-0">

                            <p className="font-black text-slate-900">
                              {heldSale
                                .customer
                                ?.name ||
                                "Walk-in Customer"}
                            </p>

                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">

                              <Clock3
                                size={13}
                              />

                              {formatTime(
                                heldSale.createdAt
                              )}

                            </div>

                          </div>


                          <button
                            type="button"
                            onClick={() =>
                              deleteHeldSale(
                                heldSale.id
                              )
                            }
                            className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-600"
                            title="Delete held sale"
                          >
                            <Trash2
                              size={17}
                            />
                          </button>

                        </div>


                        <div className="mt-4 grid grid-cols-3 gap-2">

                          <div className="rounded-xl bg-slate-50 p-3">

                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              Items
                            </p>

                            <p className="mt-1 font-black text-slate-800">
                              {
                                heldSale
                                  .cart
                                  ?.length ||
                                0
                              }
                            </p>

                          </div>


                          <div className="rounded-xl bg-slate-50 p-3">

                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              Total
                            </p>

                            <p className="mt-1 text-sm font-black text-blue-600">
                              {formatCurrency(
                                heldSale.total
                              )}
                            </p>

                          </div>


                          <div className="rounded-xl bg-slate-50 p-3">

                            <p className="text-[10px] font-bold uppercase text-slate-400">
                              Payment
                            </p>

                            <p className="mt-1 text-xs font-black text-slate-700">
                              {
                                heldSale.paymentMethod
                              }
                            </p>

                          </div>

                        </div>


                        <button
                          type="button"
                          onClick={() =>
                            resumeHeldSale(
                              heldSale
                            )
                          }
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-black text-white hover:bg-blue-700"
                        >

                          <PlayCircle
                            size={18}
                          />

                          Resume Sale

                        </button>

                      </div>
                    )
                  )}

                </div>
              )}

            </div>


            {/* FOOTER */}

            <div className="border-t border-slate-200 bg-slate-50 p-4">

              <div className="flex items-center gap-2 text-xs text-slate-500">

                <Keyboard
                  size={15}
                />

                <span>
                  Press F8 to open or
                  close this panel.
                </span>

              </div>

            </div>

          </aside>

        </>
      )}

    </div>
  );
};


export default POS;