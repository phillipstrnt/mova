
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Edit3,
  Loader2,
  Plus,
  ReceiptText,
  Search,
  ScanLine,
  Smartphone,
  Trash2,
  User,
  UserPlus,
  X,
  Clock3,
} from "lucide-react";

import api from "../../services/api";
import Receipt from "../receipts/Receipts";
import {
  countPendingOfflineSales,
  enqueueOfflineAuditEvent,
  enqueueOfflineSale,
  readPosCatalog,
  savePosCatalog,
} from "../../offline/database";
import { syncOfflineSales, watchOfflineSaleSync } from "../../offline/syncManager";
import BarcodeScanner from "../../components/POS/BarcodeScanner";
import CashierShiftClock from "../../components/POS/CashierShiftClock";
import ProductImage from "../../components/products/ProductImage";

const readOfflineIdentity = () => {
  try {
    const user = JSON.parse(localStorage.getItem("mova_user") || "null");
    const business = JSON.parse(localStorage.getItem("mova_business") || "null");
    const branch = JSON.parse(localStorage.getItem("mova_branch") || "null");
    return {
      userId: String(user?._id || user?.id || ""),
      businessId: String(user?.businessId?._id || user?.businessId || business?._id || business?.id || ""),
      branchId: String(branch?._id || branch?.id || user?.activeBranchId || user?.branchId || ""),
    };
  } catch {
    return { userId: "", businessId: "", branchId: "" };
  }
};

const createClientSaleId = () => globalThis.crypto?.randomUUID?.() || `mova-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const PAYMENT_METHODS = [
  {
    value: "CASH",
    label: "Cash",
    icon: Banknote,
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
    icon: Banknote,
  },
  { value: "CREDIT", label: "Store credit", icon: Banknote },
];

const LOYALTY_POINT_VALUE = 10;

const emptyCustomerForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  creditLimit: 0,
  notes: "",
};

const formatUGX = (amount) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const getErrorMessage = (error, fallback = "Something went wrong.") =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const getId = (item) => item?._id || item?.id;

export default function POS() {
  const productSearchRef = useRef(null);
  const customerSearchRef = useRef(null);
  const paymentRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productSearch, setProductSearch] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);
  const [offlineSyncMessage, setOfflineSyncMessage] = useState("");

  const [cart, setCart] = useState([]);
  const lastLoggedDiscountRef = useRef("");

  const offlineIdentity = readOfflineIdentity();

  const refreshOfflineCount = useCallback(async () => {
    if (!offlineIdentity.userId) return;
    try {
      setPendingOfflineCount(await countPendingOfflineSales(offlineIdentity.userId));
    } catch (error) {
      console.warn("MOVA offline queue is unavailable:", error);
    }
  }, [offlineIdentity.userId]);

  const recordAuditEvent = useCallback(async (event) => {
    const eventRecord = { ...event, branchId: offlineIdentity.branchId };
    if (navigator.onLine) {
      try {
        await api.post("/audit-logs/events", eventRecord);
        return;
      } catch (error) {
        console.warn("POS activity will be recorded with the next sale sync:", error);
      }
    }
    await enqueueOfflineAuditEvent(eventRecord, offlineIdentity).catch((error) => console.error("Unable to save POS audit activity offline:", error));
  }, [offlineIdentity.branchId, offlineIdentity.businessId, offlineIdentity.userId]);

  const [discount, setDiscount] = useState("");
  const [loyaltyPointsRedeemed, setLoyaltyPointsRedeemed] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [cashReceived, setCashReceived] = useState("");

  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [customerPanelOpen, setCustomerPanelOpen] = useState(false);

  /*
   * Customer create/edit modal
   */
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [customerForm, setCustomerForm] = useState(emptyCustomerForm);
  const [savingCustomer, setSavingCustomer] = useState(false);

  /*
   * Sale state
   */
  const [processingSale, setProcessingSale] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /*
   * Card payment
   */
  const [paymentTransaction, setPaymentTransaction] = useState(null);
  const [cardPaymentLoading, setCardPaymentLoading] = useState(false);
  const [cardPaymentError, setCardPaymentError] = useState("");
  const [cardPaymentStatus, setCardPaymentStatus] = useState("");

  /*
   * Held sales
   */
  const [heldSales, setHeldSales] = useState([]);
  const [heldSalesOpen, setHeldSalesOpen] = useState(false);

  /*
   * Receipt
   */
  const [completedSale, setCompletedSale] = useState(null);

  /*
   * Receipt settings
   */
  const [receiptSettings, setReceiptSettings] = useState(() => {
    try {
      const saved = localStorage.getItem("mova_receipt_settings");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  /*
   * ---------------------------------------------------------
   * Product loading
   * ---------------------------------------------------------
   */

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);

      if (!navigator.onLine) {
        const cached = await readPosCatalog(offlineIdentity);
        if (Array.isArray(cached?.products)) setProducts(cached.products);
        else setSaleError("This device has no saved product list for this branch yet. Connect once before using offline sales.");
        return;
      }

      const response = await api.get(
        "/products?limit=100&status=active"
      );

      const data = response?.data;

      const loadedProducts =
        data?.products ||
        data?.data?.products ||
        data?.data ||
        [];

      setProducts(Array.isArray(loadedProducts) ? loadedProducts : []);
      if (offlineIdentity.businessId && offlineIdentity.branchId) {
        const cached = await readPosCatalog(offlineIdentity).catch(() => null);
        await savePosCatalog({
          ...offlineIdentity,
          products: Array.isArray(loadedProducts) ? loadedProducts : [],
          customers: cached?.customers || [],
        }).catch((cacheError) => console.warn("Unable to save the offline product list:", cacheError));
      }
    } catch (error) {
      const cached = await readPosCatalog(offlineIdentity).catch(() => null);
      if (Array.isArray(cached?.products) && cached.products.length) {
        setProducts(cached.products);
        setOfflineSyncMessage("Showing the last saved product list. Sales will sync when the connection returns.");
        return;
      }
      setSaleError(
        getErrorMessage(error, "Unable to load products.")
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const updateNetwork = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) {
        syncOfflineSales(api, offlineIdentity.userId).then(({ synced }) => {
          if (synced) setOfflineSyncMessage(`${synced} queued sale${synced === 1 ? "" : "s"} synced successfully.`);
          refreshOfflineCount();
        }).catch((error) => console.warn("MOVA sale sync failed:", error));
      }
    };
    const stopWatching = watchOfflineSaleSync(api, offlineIdentity.userId, (event) => {
      if (event.status === "SYNCED") setOfflineSyncMessage("An offline sale has synced successfully.");
      if (event.status === "BLOCKED") setOfflineSyncMessage(`A queued sale needs attention: ${event.message}`);
      refreshOfflineCount();
    });
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    refreshOfflineCount();
    return () => {
      stopWatching();
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, [offlineIdentity.userId, refreshOfflineCount]);

  /*
   * ---------------------------------------------------------
   * Customer search
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const value = customerSearch.trim();

    if (!customerPanelOpen || !value) {
      setCustomers([]);
      setSearchingCustomers(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        setSearchingCustomers(true);

        if (!navigator.onLine) {
          const cached = await readPosCatalog(offlineIdentity);
          const term = value.toLowerCase();
          const matches = (cached?.customers || []).filter((customer) =>
            [customer.name, customer.phone, customer.email].some((field) => String(field || "").toLowerCase().includes(term))
          ).slice(0, 10);
          if (!cancelled) setCustomers(matches);
          return;
        }

        const response = await api.get(
          `/customers?search=${encodeURIComponent(
            value
          )}&limit=10&status=active`
        );

        if (cancelled) return;

        const data = response?.data;

        const result =
          data?.customers ||
          data?.data?.customers ||
          data?.data ||
          [];

        setCustomers(Array.isArray(result) ? result : []);
        if (offlineIdentity.businessId && offlineIdentity.branchId && Array.isArray(result)) {
          const cached = await readPosCatalog(offlineIdentity).catch(() => null);
          await savePosCatalog({
            ...offlineIdentity,
            products: cached?.products || products,
            customers: [...(cached?.customers || []), ...result]
              .filter((customer, index, all) => all.findIndex((item) => getId(item) === getId(customer)) === index),
          }).catch((cacheError) => console.warn("Unable to save offline customer lookup:", cacheError));
        }
      } catch (error) {
        if (!cancelled) {
          setCustomers([]);
          setSaleError(
            getErrorMessage(
              error,
              "Unable to search customers."
            )
          );
        }
      } finally {
        if (!cancelled) {
          setSearchingCustomers(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [customerSearch, customerPanelOpen]);

  /*
   * ---------------------------------------------------------
   * Keyboard shortcuts
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const handleKeyboard = (event) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
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
          setCustomerPanelOpen(true);
          setTimeout(() => {
            customerSearchRef.current?.focus();
          }, 50);
          break;

        case "F6":
          event.preventDefault();
          paymentRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          break;

        case "F7":
          event.preventDefault();
          holdSale();
          break;

        case "F8":
          event.preventDefault();
          setHeldSalesOpen(true);
          break;

        case "F9":
          event.preventDefault();
          completeSale();
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.removeEventListener("keydown", handleKeyboard);
    };
  });

  /*
   * ---------------------------------------------------------
   * Product calculations
   * ---------------------------------------------------------
   */

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();

    if (!search) {
      return products;
    }

    return products.filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const sku = String(product.sku || "").toLowerCase();
      const barcode = String(
        product.barcode || ""
      ).toLowerCase();

      return (
        name.includes(search) ||
        sku.includes(search) ||
        barcode.includes(search)
      );
    });
  }, [products, productSearch]);

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) =>
          sum +
          Number(item.sellingPrice || item.price || 0) *
            Number(item.quantity || 0),
        0
      ),
    [cart]
  );

  const parsedDiscount = Math.max(
    0,
    Number(discount || 0)
  );

  const parsedRedeemedPoints = selectedCustomer
    ? Math.min(
        Math.max(0, Math.floor(Number(loyaltyPointsRedeemed || 0))),
        Number(selectedCustomer.loyaltyPoints || 0),
        Math.floor(Math.max(0, subtotal - parsedDiscount) / LOYALTY_POINT_VALUE)
      )
    : 0;
  const loyaltyRedemptionDiscount = parsedRedeemedPoints * LOYALTY_POINT_VALUE;

  const total = Math.max(
    0,
    subtotal - parsedDiscount - loyaltyRedemptionDiscount
  );

  const loyaltyPointsToEarn = selectedCustomer
    ? Math.floor(total / 1000)
    : 0;

  const parsedCashReceived = Math.max(
    0,
    Number(cashReceived || 0)
  );

  const change =
    paymentMethod === "CASH"
      ? Math.max(0, parsedCashReceived - total)
      : 0;

  /*
   * ---------------------------------------------------------
   * Payment state
   * ---------------------------------------------------------
   */

  const isCardApproved =
    paymentMethod === "CARD" &&
    Boolean(paymentTransaction) &&
    [
      "APPROVED",
      "COMPLETED",
      "SUCCESS",
      "SUCCEEDED",
    ].includes(
      String(
        paymentTransaction?.status || ""
      ).toUpperCase()
    );

  const paymentReady =
    paymentMethod === "CASH"
      ? parsedCashReceived >= total
      : true;

  /*
   * ---------------------------------------------------------
   * Cart
   * ---------------------------------------------------------
   */

  const addToCart = (product) => {
    const productId = getId(product);

    setSaleError("");
    setSuccessMessage("");

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => getId(item) === productId
      );

      if (existing) {
        const stock =
          Number(
            product.stock ??
              product.quantity ??
              product.currentStock ??
              Infinity
          );

        if (
          Number.isFinite(stock) &&
          existing.quantity >= stock
        ) {
          setSaleError(
            `Only ${stock} unit(s) of ${product.name} available.`
          );
          return currentCart;
        }

        return currentCart.map((item) =>
          getId(item) === productId
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

  const updateCartQuantity = (productId, quantity) => {
    const nextQuantity = Number(quantity);

    if (!Number.isFinite(nextQuantity)) return;

    if (nextQuantity <= 0) {
      const removed = cart.find((item) => getId(item) === productId);
      if (removed) recordAuditEvent({
        action: "CART_ITEM_REMOVED",
        description: `Voided ${removed.name} from the current cart.`,
        metadata: { productId: getId(removed), productName: removed.name, quantity: removed.quantity },
      });
      setCart((currentCart) =>
        currentCart.filter(
          (item) => getId(item) !== productId
        )
      );
      return;
    }

    const product = cart.find(
      (item) => getId(item) === productId
    );

    if (!product) return;

    const stock = Number(
      product.stock ??
        product.quantityAvailable ??
        product.currentStock ??
        Infinity
    );

    if (
      Number.isFinite(stock) &&
      nextQuantity > stock
    ) {
      setSaleError(
        `Only ${stock} unit(s) of ${product.name} available.`
      );
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        getId(item) === productId
          ? {
              ...item,
              quantity: nextQuantity,
            }
          : item
      )
    );
  };

  const removeFromCart = (productId) => {
    const removed = cart.find((item) => getId(item) === productId);
    if (removed) recordAuditEvent({
      action: "CART_ITEM_REMOVED",
      description: `Removed ${removed.name} (${removed.quantity}) from the current cart.`,
      metadata: { productId: getId(removed), productName: removed.name, quantity: removed.quantity },
    });
    setCart((currentCart) =>
      currentCart.filter(
        (item) => getId(item) !== productId
      )
    );
  };

  const clearCart = ({ logActivity = true } = {}) => {
    if (logActivity && cart.length) recordAuditEvent({
      action: "CART_CLEARED",
      description: `Cleared a cart containing ${cart.length} item line(s).`,
      metadata: { itemCount: cart.length },
    });
    setCart([]);
    setDiscount("");
    setCashReceived("");
    setSaleError("");
    setSuccessMessage("");
    setPaymentTransaction(null);
    setCardPaymentError("");
    setCardPaymentStatus("");
    setManualPaymentVerified(false);
    setManualPaymentReference("");
  };

  /*
   * ---------------------------------------------------------
   * Customer create/edit
   * ---------------------------------------------------------
   */

  const openCreateCustomerModal = () => {
    setEditingCustomer(null);

    setCustomerForm({
      ...emptyCustomerForm,
    });

    setSaleError("");
    setCustomerModalOpen(true);
  };

  const openEditCustomerModal = (customer) => {
    if (!customer) return;

    setEditingCustomer(customer);

    setCustomerForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      creditLimit: customer.creditLimit ?? 0,
      notes: customer.notes || "",
    });

    setSaleError("");
    setCustomerModalOpen(true);
  };

  const closeCustomerModal = () => {
    if (savingCustomer) return;

    setCustomerModalOpen(false);
    setEditingCustomer(null);
    setCustomerForm({
      ...emptyCustomerForm,
    });
  };

  const handleCustomerFormChange = (event) => {
    const { name, value } = event.target;

    setCustomerForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const saveCustomer = async (event) => {
    event.preventDefault();

    const name = customerForm.name.trim();

    if (!name) {
      setSaleError("Customer name is required.");
      return;
    }

    try {
      setSavingCustomer(true);
      setSaleError("");

      const payload = {
        name,
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim(),
        address: customerForm.address.trim(),
        creditLimit: Number(
          customerForm.creditLimit || 0
        ),
        notes: customerForm.notes.trim(),
      };

      let response;

      if (editingCustomer) {
        response = await api.patch(
          `/customers/${getId(editingCustomer)}`,
          payload
        );
      } else {
        response = await api.post(
          "/customers",
          payload
        );
      }

      const data = response?.data;

      const customer =
        data?.customer ||
        data?.data?.customer ||
        data?.data;

      if (!customer) {
        throw new Error(
          "Customer was saved but the server did not return the customer."
        );
      }

      /*
       * Automatically select the newly created/edited
       * customer for the current sale.
       */
      setSelectedCustomer(customer);

      setCustomerSearch(
        customer.name ||
          customer.phone ||
          ""
      );

      setCustomers([customer]);

      setCustomerModalOpen(false);
      setEditingCustomer(null);

      setCustomerForm({
        ...emptyCustomerForm,
      });

      setSuccessMessage(
        editingCustomer
          ? "Customer updated successfully."
          : "Customer added successfully."
      );

      setCustomerPanelOpen(true);
    } catch (error) {
      setSaleError(
        getErrorMessage(
          error,
          editingCustomer
            ? "Unable to update customer."
            : "Unable to create customer."
        )
      );
    } finally {
      setSavingCustomer(false);
    }
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setLoyaltyPointsRedeemed("");
    setCustomerSearch(
      customer.name ||
        customer.phone ||
        ""
    );
    setCustomers([]);
    setCustomerPanelOpen(false);
    setSaleError("");
  };

  const removeCustomer = () => {
    setSelectedCustomer(null);
    setLoyaltyPointsRedeemed("");
    setCustomerSearch("");
    setCustomers([]);
  };

  /*
   * ---------------------------------------------------------
   * Card payment
   * ---------------------------------------------------------
   */

  const createCardPayment = async () => {
    if (total <= 0) {
      setCardPaymentError(
        "The sale amount must be greater than zero."
      );
      return;
    }

    try {
      setCardPaymentLoading(true);
      setCardPaymentError("");
      setCardPaymentStatus("");

      const response = await api.post(
        "/payments/transactions",
        {
          amount: total,
          paymentMethod: "CARD",
          customerId:
            selectedCustomer
              ? getId(selectedCustomer)
              : null,
        }
      );

      const transaction =
        response?.data?.paymentTransaction ||
        response?.data?.transaction ||
        response?.data?.data;

      if (!transaction) {
        throw new Error(
          "The payment transaction was not returned."
        );
      }

      setPaymentTransaction(transaction);

      const transactionId =
        transaction.id ||
        transaction._id;

      if (!transactionId) {
        throw new Error(
          "The card transaction has no ID."
        );
      }

      setCardPaymentStatus(
        "Waiting for card payment..."
      );

      await pollCardPayment(transactionId);
    } catch (error) {
      setCardPaymentError(
        getErrorMessage(
          error,
          "Unable to start card payment."
        )
      );
    } finally {
      setCardPaymentLoading(false);
    }
  };

  const pollCardPayment = async (transactionId) => {
    let attempts = 0;

    while (attempts < 30) {
      attempts += 1;

      try {
        const response = await api.get(
          `/payments/transactions/${transactionId}`
        );

        const transaction =
          response?.data?.paymentTransaction ||
          response?.data?.transaction ||
          response?.data?.data;

        if (transaction) {
          setPaymentTransaction(transaction);

          const status = String(
            transaction.status || ""
          ).toUpperCase();

          if (
            [
              "APPROVED",
              "COMPLETED",
              "SUCCESS",
              "SUCCEEDED",
            ].includes(status)
          ) {
            setCardPaymentStatus(
              "Card payment approved."
            );
            return;
          }

          if (
            [
              "FAILED",
              "DECLINED",
              "CANCELLED",
              "CANCELED",
              "EXPIRED",
            ].includes(status)
          ) {
            setCardPaymentStatus(
              `Card payment ${status.toLowerCase()}.`
            );
            return;
          }
        }
      } catch (error) {
        setCardPaymentError(
          getErrorMessage(
            error,
            "Unable to check card payment status."
          )
        );
        return;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 2000)
      );
    }

    setCardPaymentStatus(
      "Card payment timed out. Please check the payment terminal."
    );
  };

  const cancelCardPayment = async () => {
    const transactionId =
      paymentTransaction?.id ||
      paymentTransaction?._id;

    if (!transactionId) {
      setPaymentTransaction(null);
      return;
    }

    try {
      await api.patch(
        `/payments/transactions/${transactionId}/status`,
        {
          status: "CANCELLED",
        }
      );
    } catch {
      // Even if the provider cannot be cancelled,
      // clear the local POS state.
    } finally {
      setPaymentTransaction(null);
      setCardPaymentStatus("");
      setCardPaymentError("");
    }
  };

  /*
   * ---------------------------------------------------------
   * Change payment method
   * ---------------------------------------------------------
   */

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);

    setPaymentTransaction(null);
    setCardPaymentError("");
    setCardPaymentStatus("");

    setSaleError("");
  };

  /*
   * ---------------------------------------------------------
   * Complete sale
   * ---------------------------------------------------------
   */

  const completeSale = async () => {
    setSaleError("");
    setSuccessMessage("");

    if (cart.length === 0) {
      setSaleError(
        "Add at least one product before completing the sale."
      );
      return;
    }

    if (parsedDiscount > subtotal) {
      setSaleError(
        "Discount cannot be greater than the subtotal."
      );
      return;
    }

    if (
      paymentMethod === "CASH" &&
      parsedCashReceived < total
    ) {
      setSaleError(
        `Insufficient cash. ${formatUGX(
          total - parsedCashReceived
        )} more is required.`
      );
      return;
    }

    try {
      setProcessingSale(true);

      const payload = {
        clientSaleId: createClientSaleId(),
        expectedTotal: total,
        loyaltyPointsRedeemed: parsedRedeemedPoints,
        items: cart.map((item) => ({
          productId: getId(item),
          quantity: Number(item.quantity),
        })),

        discount: parsedDiscount,

        paymentMethod,

        customerId: selectedCustomer
          ? getId(selectedCustomer)
          : null,

        paymentTransactionId:
          paymentMethod === "CARD" &&
          isCardApproved
            ? paymentTransaction?.id ||
              paymentTransaction?._id ||
              null
            : null,
        offlineQueued: !navigator.onLine,
      };

      const saveLocally = async () => {
        if (!["CASH", "MOBILE_MONEY"].includes(paymentMethod)) {
          throw new Error("While offline, only cash and Mobile Money sales can be queued. Card and bank payments need a live connection.");
        }
        if (!offlineIdentity.userId || !offlineIdentity.businessId || !offlineIdentity.branchId) {
          throw new Error("Offline checkout needs a saved cashier, business, and active branch. Reconnect and sign in once before using offline sales.");
        }
        const receiptNumber = `OFFLINE-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
        await enqueueOfflineSale({
          clientSaleId: payload.clientSaleId,
          userId: offlineIdentity.userId,
          businessId: offlineIdentity.businessId,
          branchId: offlineIdentity.branchId,
          receiptNumber,
          payload,
        });
        const localSale = {
          id: payload.clientSaleId,
          receiptNumber,
          items: cart.map((item) => ({
            productId: getId(item),
            name: item.name,
            sku: item.sku || "",
            quantity: Number(item.quantity),
            unitPrice: Number(item.sellingPrice ?? item.price ?? 0),
            subtotal: Number(item.sellingPrice ?? item.price ?? 0) * Number(item.quantity),
          })),
          subtotal,
          discount: parsedDiscount,
          total,
          paymentMethod,
          paymentStatus: "PAID",
          status: "COMPLETED",
          offlineStatus: "QUEUED",
          customer: selectedCustomer,
          createdAt: new Date().toISOString(),
        };
        setCompletedSale(localSale);
        setSuccessMessage("Sale saved on this device. It will sync automatically when the connection returns.");
        clearCart({ logActivity: false });
        setSelectedCustomer(null);
        setLoyaltyPointsRedeemed("");
        setCustomerSearch("");
        setCustomerPanelOpen(false);
        await refreshOfflineCount();
        if (navigator.onLine) {
          syncOfflineSales(api, offlineIdentity.userId).catch((syncError) => console.warn("Queued sale will retry:", syncError));
        }
      };

      if (!navigator.onLine) {
        await saveLocally();
        return;
      }

      let response;
      try {
        response = await api.post("/sales", payload);
      } catch (requestError) {
        if (!requestError?.response && ["CASH", "MOBILE_MONEY"].includes(paymentMethod)) {
          await saveLocally();
          return;
        }
        throw requestError;
      }

      const data = response?.data;

      const sale =
        data?.sale ||
        data?.data?.sale ||
        data?.data;

      if (!sale) {
        throw new Error(
          "The sale was completed but no sale record was returned."
        );
      }

      /*
       * Preserve the receipt data before clearing the POS.
       */
      setCompletedSale(sale);

      setSuccessMessage(
        "Sale completed successfully."
      );

      clearCart({ logActivity: false });

      setSelectedCustomer(null);
      setLoyaltyPointsRedeemed("");
      setCustomerSearch("");
      setCustomerPanelOpen(false);

      await fetchProducts();
    } catch (error) {
      setSaleError(
        getErrorMessage(
          error,
          "Unable to complete the sale."
        )
      );
    } finally {
      setProcessingSale(false);
    }
  };

  const handleBarcodeDetected = useCallback((value) => {
    const normalized = String(value || "").trim().toLowerCase();
    const product = products.find((item) => [item.barcode, item.sku].some((code) => String(code || "").trim().toLowerCase() === normalized));
    if (product) {
      addToCart(product);
      setProductSearch("");
      setSuccessMessage(`${product.name} added to the sale.`);
      return;
    }
    setProductSearch(String(value || ""));
    setSaleError(`No product matches barcode ${value}. Check the code or add the product in Products.`);
  }, [products, addToCart]);

  /*
   * ---------------------------------------------------------
   * Held sales
   * ---------------------------------------------------------
   */

  const holdSale = () => {
    if (cart.length === 0) {
      setSaleError(
        "There is no sale to hold."
      );
      return;
    }

    const heldSale = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      cart,
      discount,
      customer: selectedCustomer,
      paymentMethod,
      cashReceived,
    };

    setHeldSales((current) => [
      ...current,
      heldSale,
    ]);

    clearCart({ logActivity: false });
    setSelectedCustomer(null);
    setCustomerSearch("");

    setSuccessMessage(
      "Sale held successfully."
    );
  };

  const resumeHeldSale = (heldSale) => {
    setCart(heldSale.cart || []);
    setDiscount(heldSale.discount || "");
    setSelectedCustomer(
      heldSale.customer || null
    );
    setPaymentMethod(
      heldSale.paymentMethod || "CASH"
    );
    setCashReceived(
      heldSale.cashReceived || ""
    );

    setManualPaymentVerified(false);
    setManualPaymentReference("");
    setPaymentTransaction(null);

    setHeldSales((current) =>
      current.filter(
        (item) => item.id !== heldSale.id
      )
    );

    setHeldSalesOpen(false);
    setSaleError("");
  };

  const deleteHeldSale = (id) => {
    setHeldSales((current) =>
      current.filter((item) => item.id !== id)
    );
  };

  /*
   * ---------------------------------------------------------
   * Receipt close
   * ---------------------------------------------------------
   */

  const closeReceipt = () => {
    setCompletedSale(null);
  };

  /*
   * ---------------------------------------------------------
   * Render
   * ---------------------------------------------------------
   */

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <div className="mx-auto max-w-[1600px]">
        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Point of Sale
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create sales, manage customers and process
              payments.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setHeldSalesOpen(true)
              }
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Clock3 size={17} />
              Held Sales
              {heldSales.length > 0 && (
                <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">
                  {heldSales.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={holdSale}
              disabled={cart.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Clock3 size={17} />
              Hold Sale
            </button>
          </div>
        </div>

        <div className={`mb-4 flex flex-col gap-2 rounded-xl border p-3 text-sm sm:flex-row sm:items-center sm:justify-between ${isOnline ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
          <div>
            <span className="font-semibold">{isOnline ? "Online" : "Offline cashier mode"}</span>
            <span className="ml-2">{isOnline ? "Sales save to the business immediately." : "Cash and Mobile Money sales are saved on this device and sync when you reconnect."}</span>
            {pendingOfflineCount > 0 && <span className="ml-2 font-semibold">{pendingOfflineCount} sale{pendingOfflineCount === 1 ? "" : "s"} waiting to sync</span>}
          </div>
          {isOnline && pendingOfflineCount > 0 && <button type="button" onClick={() => syncOfflineSales(api, offlineIdentity.userId).then(refreshOfflineCount)} className="rounded-lg border border-current/20 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-100">Sync now</button>}
        </div>
        {offlineSyncMessage && <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">{offlineSyncMessage}</div>}
        <CashierShiftClock isOnline={isOnline} />

        {/* Alerts */}
        {saleError && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              {saleError}
            </div>

            <button
              type="button"
              onClick={() => setSaleError("")}
            >
              <X size={17} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              {successMessage}
            </div>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
            >
              <X size={17} />
            </button>
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-[1fr_430px]">
          {/* LEFT */}
          <div className="space-y-5">
            {/* Products */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Products
                    </h2>

                    <p className="text-xs text-slate-500">
                      Press F2 to search products
                    </p>
                  </div>

                  <div className="flex w-full gap-2 md:max-w-xl">
                    <div className="relative min-w-0 flex-1">
                      <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                      <input
                        ref={productSearchRef}
                        type="text"
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                        placeholder="Search product, SKU or barcode..."
                        className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                    <button type="button" onClick={() => setScannerOpen(true)} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50" title="Scan product barcode">
                      <ScanLine size={18} /><span className="hidden sm:inline">Scan</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {loadingProducts ? (
                  <div className="flex min-h-[180px] items-center justify-center">
                    <Loader2
                      className="animate-spin text-slate-500"
                      size={28}
                    />
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    No products found.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {filteredProducts.map(
                      (product) => {
                        const price = Number(
                          product.sellingPrice ??
                            product.price ??
                            0
                        );

                        const stock =
                          product.stock ??
                          product.quantity ??
                          product.currentStock;

                        return (
                          <button
                            key={getId(product)}
                            type="button"
                            onClick={() =>
                              addToCart(product)
                            }
                            className="group rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-400 hover:shadow-sm"
                          >
                            <ProductImage product={product} className="mb-3 h-24 w-full rounded-lg object-cover transition group-hover:brightness-[1.02]" />

                            <div className="truncate text-sm font-semibold text-slate-900">
                              {product.name}
                            </div>

                            {product.sku && (
                              <div className="mt-1 truncate text-xs text-slate-500">
                                SKU: {product.sku}
                              </div>
                            )}

                            <div className="mt-2 font-semibold text-slate-900">
                              {formatUGX(price)}
                            </div>

                            {stock !== undefined && (
                              <div className="mt-1 text-xs text-slate-500">
                                Stock: {stock}
                              </div>
                            )}
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Cart */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Current Sale
                  </h2>

                  <p className="text-xs text-slate-500">
                    {cart.length} product
                    {cart.length === 1
                      ? ""
                      : "s"} in cart
                  </p>
                </div>

                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="p-4">
                {cart.length === 0 ? (
                  <div className="py-14 text-center">
                    <ReceiptText
                      size={42}
                      className="mx-auto mb-3 text-slate-300"
                    />

                    <p className="font-medium text-slate-600">
                      Your cart is empty
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Select a product above to start a
                      sale.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => {
                      const itemId =
                        getId(item);

                      const price = Number(
                        item.sellingPrice ??
                          item.price ??
                          0
                      );

                      const quantity = Number(
                        item.quantity || 0
                      );

                      return (
                        <div
                          key={itemId}
                          className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-slate-900">
                              {item.name}
                            </div>

                            <div className="text-xs text-slate-500">
                              {formatUGX(price)} each
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(
                                  itemId,
                                  quantity - 1
                                )
                              }
                              className="h-8 w-8 rounded-md border border-slate-300"
                            >
                              −
                            </button>

                            <input
                              value={quantity}
                              onChange={(event) =>
                                updateCartQuantity(
                                  itemId,
                                  event.target.value
                                )
                              }
                              className="h-8 w-14 rounded-md border border-slate-300 text-center text-sm"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(
                                  itemId,
                                  quantity + 1
                                )
                              }
                              className="h-8 w-8 rounded-md border border-slate-300"
                            >
                              +
                            </button>
                          </div>

                          <div className="w-28 text-right font-semibold text-slate-900">
                            {formatUGX(
                              price * quantity
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeFromCart(itemId)
                            }
                            className="rounded-md p-2 text-red-500 hover:bg-red-50"
                            title="Remove item"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Customer */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900">
                      Customer
                    </h2>

                    <p className="text-xs text-slate-500">
                      Search, add or edit customers
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={openCreateCustomerModal}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <UserPlus size={17} />
                    Add Customer
                  </button>
                </div>
              </div>

              <div className="p-4">
                {selectedCustomer ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600">
                      <User size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900">
                        {selectedCustomer.name}
                      </div>

                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                        {selectedCustomer.phone && (
                          <span>
                            {selectedCustomer.phone}
                          </span>
                        )}

                        {selectedCustomer.email && (
                          <span>
                            {selectedCustomer.email}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-700">
                        <span>{Number(selectedCustomer.loyaltyPoints || 0).toLocaleString("en-UG")} MOVA points</span>
                        {loyaltyPointsToEarn > 0 && <span>· Earn {loyaltyPointsToEarn} on this sale</span>}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">Earn 1 point per UGX 1,000 on completed purchases.</p>
                      {Number(selectedCustomer.loyaltyPoints || 0) > 0 && <label className="mt-3 block max-w-xs text-xs font-semibold text-slate-600">Redeem points (UGX 10 each)
                        <input type="number" min="0" max={Number(selectedCustomer.loyaltyPoints || 0)} step="1" value={loyaltyPointsRedeemed} onChange={(event) => setLoyaltyPointsRedeemed(event.target.value)} placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                        {parsedRedeemedPoints > 0 && <span className="mt-1 block text-emerald-700">{parsedRedeemedPoints} points apply {formatUGX(loyaltyRedemptionDiscount)} to this sale.</span>}
                      </label>}
                      <div className="mt-2 text-xs text-slate-600">Store credit: {formatUGX(selectedCustomer.outstandingBalance || 0)} owing · limit {formatUGX(selectedCustomer.creditLimit || 0)}</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditCustomerModal(
                            selectedCustomer
                          )
                        }
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Edit3 size={16} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={removeCustomer}
                        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Search
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      ref={customerSearchRef}
                      type="text"
                      value={customerSearch}
                      onFocus={() =>
                        setCustomerPanelOpen(true)
                      }
                      onChange={(event) => {
                        setCustomerSearch(
                          event.target.value
                        );
                        setCustomerPanelOpen(true);
                      }}
                      placeholder="Search customer by name or phone..."
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />

                    {customerPanelOpen &&
                      customerSearch.trim() && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                          {searchingCustomers ? (
                            <div className="flex items-center gap-2 p-4 text-sm text-slate-500">
                              <Loader2
                                size={16}
                                className="animate-spin"
                              />
                              Searching...
                            </div>
                          ) : customers.length ===
                            0 ? (
                            <div className="p-4">
                              <p className="text-sm text-slate-500">
                                No customer found.
                              </p>

                              <button
                                type="button"
                                onClick={
                                  openCreateCustomerModal
                                }
                                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-900"
                              >
                                <Plus size={16} />
                                Add new customer
                              </button>
                            </div>
                          ) : (
                            customers.map(
                              (customer) => (
                                <div
                                  key={getId(
                                    customer
                                  )}
                                  className="flex items-center gap-2 border-b border-slate-100 p-3 last:border-b-0 hover:bg-slate-50"
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      selectCustomer(
                                        customer
                                      )
                                    }
                                    className="min-w-0 flex-1 text-left"
                                  >
                                    <div className="truncate text-sm font-medium text-slate-900">
                                      {
                                        customer.name
                                      }
                                    </div>

                                    <div className="text-xs text-slate-500">
                                      {customer.phone ||
                                        customer.email ||
                                        "No contact"}
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditCustomerModal(
                                        customer
                                      )
                                    }
                                    className="rounded-md p-2 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                                    title="Edit customer"
                                  >
                                    <Edit3 size={16} />
                                  </button>
                                </div>
                              )
                            )
                          )}
                        </div>
                      )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <div
            ref={paymentRef}
            className="space-y-5"
          >
            {/* Summary */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <h2 className="font-semibold text-slate-900">
                  Order Summary
                </h2>
              </div>

              <div className="space-y-4 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span className="font-medium text-slate-900">
                    {formatUGX(subtotal)}
                  </span>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Discount
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(event) =>
                      setDiscount(
                        event.target.value
                      )
                    }
                    onBlur={() => {
                      const amount = Number(discount || 0);
                      if (amount > 0 && String(amount) !== lastLoggedDiscountRef.current) {
                        lastLoggedDiscountRef.current = String(amount);
                        recordAuditEvent({
                          action: "DISCOUNT_APPLIED",
                          description: `Applied a ${formatUGX(amount)} discount to the sale.`,
                          metadata: { discountAmount: amount, itemCount: cart.length },
                        });
                      }
                    }}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                  <span className="text-lg font-semibold text-slate-900">
                    Total
                  </span>

                  <span className="text-2xl font-bold text-slate-900">
                    {formatUGX(total)}
                  </span>
                </div>
                {loyaltyRedemptionDiscount > 0 && <p className="mt-2 text-right text-xs text-emerald-700">Loyalty reward applied: −{formatUGX(loyaltyRedemptionDiscount)}</p>}
              </div>
            </section>

            {/* Payment */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-4">
                <h2 className="font-semibold text-slate-900">
                  Payment
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Press F6 to jump to payment
                </p>
              </div>

              <div className="p-4">
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(
                    (method) => {
                      const Icon = method.icon;
                      const active =
                        paymentMethod ===
                        method.value;

                      return (
                        <button
                          key={method.value}
                          type="button"
                          onClick={() =>
                            handlePaymentMethodChange(
                              method.value
                            )
                          }
                          className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-medium ${
                            active
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Icon size={17} />
                          {method.label}
                        </button>
                      );
                    }
                  )}
                </div>

                {paymentMethod === "CREDIT" && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{selectedCustomer ? `This sale will add ${formatUGX(total)} to ${selectedCustomer.name}'s store credit. Available credit: ${formatUGX(Math.max(0, Number(selectedCustomer.creditLimit || 0) - Number(selectedCustomer.outstandingBalance || 0)))}` : "Choose a customer with an approved credit limit to use store credit."}</div>}

                {/* CASH */}
                {paymentMethod === "CASH" && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Cash Received
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={cashReceived}
                        onChange={(event) =>
                          setCashReceived(
                            event.target.value
                          )
                        }
                        placeholder="Enter amount received"
                        className="w-full rounded-lg border border-slate-300 px-3 py-3 text-lg outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                      <span className="text-sm text-slate-600">
                        Change
                      </span>

                      <span className="font-bold text-slate-900">
                        {formatUGX(change)}
                      </span>
                    </div>
                  </div>
                )}

                {/* CARD */}
                {paymentMethod === "CARD" && (
                  <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                      Use an in-app card terminal (optional)
                    </summary>

                    <div className="mt-3 space-y-3">
                    {!paymentTransaction ? (
                      <button
                        type="button"
                        onClick={createCardPayment}
                        disabled={
                          total <= 0 ||
                          cardPaymentLoading
                        }
                        className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {cardPaymentLoading ? (
                          <span className="inline-flex items-center gap-2">
                            <Loader2
                              size={18}
                              className="animate-spin"
                            />
                            Starting Card Payment...
                          </span>
                        ) : (
                          "Start Card Payment"
                        )}
                      </button>
                    ) : (
                      <div className="rounded-lg border border-slate-200 p-4">
                        <div className="flex items-center gap-3">
                          {isCardApproved ? (
                            <CheckCircle2
                              size={26}
                              className="text-emerald-600"
                            />
                          ) : (
                            <Loader2
                              size={26}
                              className="animate-spin text-slate-500"
                            />
                          )}

                          <div>
                            <div className="font-semibold text-slate-900">
                              {isCardApproved
                                ? "Card payment approved"
                                : "Waiting for card payment"}
                            </div>

                            <div className="text-xs text-slate-500">
                              {cardPaymentStatus ||
                                paymentTransaction.status ||
                                "Processing"}
                            </div>
                          </div>
                        </div>

                        {!isCardApproved && (
                          <button
                            type="button"
                            onClick={
                              cancelCardPayment
                            }
                            className="mt-3 w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                          >
                            Cancel Card Payment
                          </button>
                        )}
                      </div>
                    )}

                    {cardPaymentError && (
                      <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {cardPaymentError}
                      </div>
                    )}

                    </div>
                  </details>
                )}

                {/* Complete Sale */}
                <button
                  type="button"
                  onClick={completeSale}
                  disabled={
                    cart.length === 0 ||
                    processingSale ||
                    !paymentReady ||
                    (paymentMethod === "CREDIT" && !selectedCustomer)
                  }
                  className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-4 text-base font-bold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {processingSale ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2
                        size={20}
                        className="animate-spin"
                      />
                      Completing Sale...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 size={20} />
                      Complete Sale ·{" "}
                      {formatUGX(total)}
                    </span>
                  )}
                </button>

                <p className="mt-2 text-center text-xs text-slate-400">
                  Shortcut: F9
                </p>
              </div>
            </section>

            {/* Shortcuts */}
            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                POS Shortcuts
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-slate-50 p-2">
                  <b>F2</b> — Products
                </div>

                <div className="rounded bg-slate-50 p-2">
                  <b>F4</b> — Customer
                </div>

                <div className="rounded bg-slate-50 p-2">
                  <b>F6</b> — Payment
                </div>

                <div className="rounded bg-slate-50 p-2">
                  <b>F7</b> — Hold
                </div>

                <div className="rounded bg-slate-50 p-2">
                  <b>F8</b> — Held Sales
                </div>

                <div className="rounded bg-slate-50 p-2">
                  <b>F9</b> — Complete
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* =====================================================
          CUSTOMER CREATE / EDIT MODAL
          ===================================================== */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingCustomer
                    ? "Edit Customer"
                    : "Add Customer"}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {editingCustomer
                    ? "Update this customer's information."
                    : "Create a customer for the current branch."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeCustomerModal}
                disabled={savingCustomer}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={saveCustomer}
              className="space-y-4 p-5"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={customerForm.name}
                  onChange={handleCustomerFormChange}
                  placeholder="Customer name"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Phone
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={customerForm.phone}
                    onChange={handleCustomerFormChange}
                    placeholder="07XXXXXXXX"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={customerForm.email}
                    onChange={handleCustomerFormChange}
                    placeholder="customer@example.com"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Address
                </label>

                <input
                  type="text"
                  name="address"
                  value={customerForm.address}
                  onChange={handleCustomerFormChange}
                  placeholder="Customer address"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Credit Limit
                </label>

                <input
                  type="number"
                  min="0"
                  name="creditLimit"
                  value={customerForm.creditLimit}
                  onChange={handleCustomerFormChange}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={customerForm.notes}
                  onChange={handleCustomerFormChange}
                  rows={3}
                  placeholder="Optional notes"
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                The customer will automatically be
                associated with the branch you are currently
                authorized to work in.
              </div>

              <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCustomerModal}
                  disabled={savingCustomer}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    savingCustomer ||
                    !customerForm.name.trim()
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingCustomer ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      {editingCustomer ? (
                        <Edit3 size={17} />
                      ) : (
                        <UserPlus size={17} />
                      )}

                      {editingCustomer
                        ? "Save Changes"
                        : "Add Customer"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================
          HELD SALES MODAL
          ===================================================== */}
      {heldSalesOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Held Sales
                </h2>

                <p className="text-xs text-slate-500">
                  Resume a sale that was put on hold.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setHeldSalesOpen(false)
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[65vh] overflow-y-auto p-5">
              {heldSales.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  No held sales.
                </div>
              ) : (
                <div className="space-y-3">
                  {heldSales.map((heldSale) => {
                    const heldSubtotal =
                      heldSale.cart.reduce(
                        (sum, item) =>
                          sum +
                          Number(
                            item.sellingPrice ??
                              item.price ??
                              0
                          ) *
                            Number(
                              item.quantity || 0
                            ),
                        0
                      );

                    return (
                      <div
                        key={heldSale.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="font-semibold text-slate-900">
                              {heldSale.customer
                                ?.name ||
                                "Walk-in Customer"}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {heldSale.cart.length} item
                              {heldSale.cart
                                .length === 1
                                ? ""
                                : "s"}{" "}
                              ·{" "}
                              {formatUGX(
                                heldSubtotal
                              )}
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                              {new Date(
                                heldSale.createdAt
                              ).toLocaleString()}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                resumeHeldSale(
                                  heldSale
                                )
                              }
                              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                            >
                              Resume
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                deleteHeldSale(
                                  heldSale.id
                                )
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50"
                              title="Delete held sale"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          RECEIPT
          ===================================================== */}
      {completedSale && (
        <Receipt
          sale={completedSale}
          receiptSettings={receiptSettings}
          onClose={closeReceipt}
        />
      )}
      {scannerOpen && <BarcodeScanner onDetected={handleBarcodeDetected} onClose={() => setScannerOpen(false)} />}
    </div>
  );
}
