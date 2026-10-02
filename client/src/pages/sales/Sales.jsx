import { useEffect, useMemo, useState } from "react";

import api from "../../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Package,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  X,
} from "lucide-react";

const paymentLabels = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Card",
  BANK: "Bank",
};

const paymentClasses = {
  CASH: "bg-emerald-50 text-emerald-700",
  MOBILE_MONEY: "bg-blue-50 text-blue-700",
  CARD: "bg-violet-50 text-violet-700",
  BANK: "bg-amber-50 text-amber-700",
};

const statusClasses = {
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
  PARTIALLY_REFUNDED: "bg-orange-50 text-orange-700",
  REFUNDED: "bg-purple-50 text-purple-700",
};

const refundMethods = [
  {
    value: "CASH",
    label: "Cash",
  },
  {
    value: "MOBILE_MONEY",
    label: "Mobile Money",
  },
  {
    value: "CARD",
    label: "Card",
  },
  {
    value: "BANK",
    label: "Bank",
  },
  {
    value: "STORE_CREDIT",
    label: "Store Credit",
  },
];

const formatCurrency = (amount = 0) => {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
};

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getReceiptCustomer = (sale) => {
  const customer = sale?.customer;

  const name =
    customer?.name ||
    customer?.customerName ||
    sale?.customerName ||
    "";

  const phone =
    customer?.phone ||
    customer?.phoneNumber ||
    sale?.customerPhone ||
    "";

  return { name, phone };
};

const getReceiptPaymentDetails = (sale) => {
  const amountPaid =
    sale?.amountPaid ??
    sale?.paidAmount ??
    sale?.paymentAmount;

  const change =
    sale?.change ??
    sale?.changeAmount;

  return {
    hasAmountPaid: amountPaid !== undefined && amountPaid !== null && amountPaid !== "",
    hasChange: change !== undefined && change !== null && change !== "",
    amountPaid: Number(amountPaid) || 0,
    change: Number(change) || 0,
  };
};

/*
 * IMPORTANT:
 *
 * Sale.items.productId is the actual MongoDB Product _id.
 *
 * We deliberately DO NOT use item._id because the Sale
 * schema has _id: false on sale items.
 */
const getProductId = (item) => {
  if (!item) return "";

  const productId = item.productId;

  if (!productId) {
    return "";
  }

  if (typeof productId === "string") {
    return productId;
  }

  if (typeof productId === "object") {
    if (typeof productId._id === "string") {
      return productId._id;
    }

    if (productId._id) {
      return String(productId._id);
    }

    if (typeof productId.$oid === "string") {
      return productId.$oid;
    }
  }

  return "";
};

/*
 * Basic MongoDB ObjectId validation on the frontend.
 *
 * The backend performs the authoritative validation.
 */
const isValidObjectId = (value) => {
  return /^[a-fA-F0-9]{24}$/.test(
    String(value || "")
  );
};

const Sales = () => {
  const [sales, setSales] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalSales, setTotalSales] = useState(0);

  const [selectedSale, setSelectedSale] = useState(null);
  const [loadingSale, setLoadingSale] = useState(false);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnSale, setReturnSale] = useState(null);

  const [returnableItems, setReturnableItems] = useState([]);
  const [loadingReturnItems, setLoadingReturnItems] =
    useState(false);

  const [returnQuantities, setReturnQuantities] = useState({});

  const [refundMethod, setRefundMethod] =
    useState("CASH");

  const [returnReason, setReturnReason] = useState("");

  const [returnNotes, setReturnNotes] = useState("");

  const [returnSubmitting, setReturnSubmitting] =
    useState(false);

  const [returnSuccess, setReturnSuccess] =
    useState(null);

  const [receiptActionMessage, setReceiptActionMessage] =
    useState("");

  const pageSize = 10;

  const fetchSales = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const params = {
        page,
        limit: pageSize,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (paymentFilter !== "ALL") {
        params.paymentMethod = paymentFilter;
      }

      if (statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      const response = await api.get("/sales", {
        params,
      });

      const data = response.data;

      setSales(
        Array.isArray(data.sales)
          ? data.sales
          : []
      );

      setTotalSales(
        data.pagination?.total ||
          data.total ||
          data.count ||
          0
      );

      setPages(
        data.pagination?.pages ||
          data.pages ||
          1
      );
    } catch (requestError) {
      console.error(
        "Failed to load sales:",
        requestError
      );

      setError(
        getErrorMessage(
          requestError,
          "Failed to load sales."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [page, paymentFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchSales();
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  const visibleSales = useMemo(() => {
    return Array.isArray(sales) ? sales : [];
  }, [sales]);

  const summary = useMemo(() => {
    const totalAmount = visibleSales.reduce(
      (sum, sale) =>
        sum + Number(sale.total || 0),
      0
    );

    const completed = visibleSales.filter(
      (sale) => sale.status === "COMPLETED"
    ).length;

    const refunded = visibleSales.filter(
      (sale) =>
        sale.status === "REFUNDED" ||
        sale.status === "PARTIALLY_REFUNDED"
    ).length;

    return {
      totalAmount,
      completed,
      refunded,
    };
  }, [visibleSales]);

  const handleViewSale = async (saleId) => {
    try {
      setLoadingSale(true);
      setError("");

      const response = await api.get(
        `/sales/${saleId}`
      );

      setSelectedSale(
        response.data.sale ||
          response.data
      );
    } catch (requestError) {
      console.error(
        "Failed to load sale:",
        requestError
      );

      setError(
        getErrorMessage(
          requestError,
          "Failed to load sale details."
        )
      );
    } finally {
      setLoadingSale(false);
    }
  };

  const buildReceiptHtml = (sale) => {
    const customer = getReceiptCustomer(sale);
    const paymentDetails = getReceiptPaymentDetails(sale);

    const customerHtml =
      customer.name || customer.phone
        ? `
          <div>
            <strong>Customer:</strong>
            ${escapeHtml(customer.name || "Walk-in Customer")}
          </div>
          ${
            customer.phone
              ? `<div><strong>Phone:</strong> ${escapeHtml(customer.phone)}</div>`
              : ""
          }
        `
        : "";

    const paymentDetailsHtml =
      paymentDetails.hasAmountPaid || paymentDetails.hasChange
        ? `
          <hr />
          ${
            paymentDetails.hasAmountPaid
              ? `<div class="row"><span>Amount Paid</span><span>${formatCurrency(paymentDetails.amountPaid)}</span></div>`
              : ""
          }
          ${
            paymentDetails.hasChange
              ? `<div class="row"><span>Change</span><span>${formatCurrency(paymentDetails.change)}</span></div>`
              : ""
          }
        `
        : "";

    const itemsHtml = (sale.items || [])
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name || "-")}</td>
            <td style="text-align:center;">${Number(item.quantity) || 0}</td>
            <td style="text-align:right;">${formatCurrency(item.subtotal)}</td>
          </tr>
        `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Receipt ${escapeHtml(sale.receiptNumber || "")}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; background: #fff; }
            .receipt { max-width: 420px; margin: 0 auto; }
            h1 { text-align: center; margin: 0 0 4px; font-size: 28px; }
            .center { text-align: center; }
            .muted { color: #6b7280; }
            .meta { line-height: 1.7; font-size: 13px; }
            hr { border: 0; border-top: 1px dashed #9ca3af; margin: 16px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            th { text-align: left; color: #4b5563; }
            .row { display: flex; justify-content: space-between; gap: 20px; margin: 8px 0; font-size: 14px; }
            .total { font-size: 18px; font-weight: bold; }
            .footer { margin-top: 20px; text-align: center; color: #6b7280; font-size: 12px; }
            @media print { body { padding: 8px; } .receipt { max-width: 100%; } }
          </style>
        </head>
        <body>
          <div class="receipt">
            <h1>MOVA</h1>
            <div class="center muted">Business Management Platform</div>
            <hr />
            <div class="meta">
              <div><strong>Receipt:</strong> ${escapeHtml(sale.receiptNumber || "-")}</div>
              <div><strong>Date:</strong> ${escapeHtml(formatDate(sale.createdAt))}</div>
              <div><strong>Payment:</strong> ${escapeHtml(paymentLabels[sale.paymentMethod] || sale.paymentMethod || "-")}</div>
              ${customerHtml}
            </div>
            <hr />
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align:center;">Qty</th>
                  <th style="text-align:right;">Amount</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>
            <hr />
            <div class="row"><span>Subtotal</span><span>${formatCurrency(sale.subtotal)}</span></div>
            <div class="row"><span>Discount</span><span>${formatCurrency(sale.discount)}</span></div>
            <div class="row total"><span>Total</span><span>${formatCurrency(sale.total)}</span></div>
            ${paymentDetailsHtml}
            <div class="footer">Thank you for your business.</div>
          </div>
        </body>
      </html>
    `;
  };

  const createReceiptPdf = (sale) => {
    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
    });

    const customer = getReceiptCustomer(sale);
    const paymentDetails = getReceiptPaymentDetails(sale);
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    doc.setFontSize(22);
    doc.setFont(undefined, "bold");
    doc.text("MOVA", pageWidth / 2, y, { align: "center" });

    y += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text("Business Management Platform", pageWidth / 2, y, { align: "center" });

    y += 10;
    doc.setFontSize(9);
    doc.text(`Receipt: ${sale.receiptNumber || "-"}`, 14, y);
    y += 5;
    doc.text(`Date: ${formatDate(sale.createdAt)}`, 14, y);
    y += 5;
    doc.text(`Payment: ${paymentLabels[sale.paymentMethod] || sale.paymentMethod || "-"}`, 14, y);

    if (customer.name || customer.phone) {
      y += 5;
      doc.text(`Customer: ${customer.name || "Walk-in Customer"}`, 14, y);
      if (customer.phone) {
        y += 5;
        doc.text(`Phone: ${customer.phone}`, 14, y);
      }
    }

    const rows = (sale.items || []).map((item) => [
      item.name || "-",
      Number(item.quantity) || 0,
      formatCurrency(item.unitPrice),
      formatCurrency(item.subtotal),
    ]);

    autoTable(doc, {
      startY: y + 7,
      head: [["Item", "Qty", "Unit Price", "Amount"]],
      body: rows,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
      headStyles: {
        fontStyle: "bold",
      },
      columnStyles: {
        1: { halign: "center", cellWidth: 16 },
        2: { halign: "right", cellWidth: 32 },
        3: { halign: "right", cellWidth: 32 },
      },
      margin: { left: 14, right: 14 },
    });

    y = (doc.lastAutoTable?.finalY || y + 20) + 10;

    const totals = [
      ["Subtotal", formatCurrency(sale.subtotal)],
      ["Discount", formatCurrency(sale.discount)],
      ["Total", formatCurrency(sale.total)],
    ];

    if (paymentDetails.hasAmountPaid) {
      totals.push(["Amount Paid", formatCurrency(paymentDetails.amountPaid)]);
    }

    if (paymentDetails.hasChange) {
      totals.push(["Change", formatCurrency(paymentDetails.change)]);
    }

    totals.forEach(([label, value], index) => {
      const isTotal = label === "Total";
      doc.setFont(undefined, isTotal ? "bold" : "normal");
      doc.setFontSize(isTotal ? 11 : 9);
      doc.text(label, pageWidth - 80, y);
      doc.text(value, pageWidth - 14, y, { align: "right" });
      y += isTotal ? 7 : 5;
    });

    y += 7;
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    doc.text("Thank you for your business.", pageWidth / 2, y, { align: "center" });

    return doc;
  };

  const handlePrintReceipt = (sale) => {
    if (!sale) return;

    const receiptWindow = window.open(
      "",
      "_blank",
      "width=500,height=700"
    );

    if (!receiptWindow) {
      setReceiptActionMessage("Please allow pop-ups to print the receipt.");
      return;
    }

    receiptWindow.document.write(buildReceiptHtml(sale));
    receiptWindow.document.close();
    receiptWindow.focus();

    setTimeout(() => {
      receiptWindow.print();
    }, 300);
  };

  const handleDownloadReceipt = (sale) => {
    if (!sale) return;

    try {
      const doc = createReceiptPdf(sale);
      const receiptName = sale.receiptNumber || sale._id || "receipt";
      doc.save(`MOVA_Receipt_${receiptName}.pdf`);
      setReceiptActionMessage("Receipt PDF downloaded successfully.");
    } catch (requestError) {
      console.error("Failed to create receipt PDF:", requestError);
      setReceiptActionMessage("Unable to create the receipt PDF.");
    }
  };

  const handleShareReceipt = async (sale) => {
    if (!sale) return;

    try {
      const doc = createReceiptPdf(sale);
      const pdfBlob = doc.output("blob");
      const receiptName = `MOVA_Receipt_${sale.receiptNumber || sale._id || "receipt"}.pdf`;
      const file = new File([pdfBlob], receiptName, {
        type: "application/pdf",
      });

      const shareText = [
        `MOVA Receipt: ${sale.receiptNumber || "-"}`,
        `Date: ${formatDate(sale.createdAt)}`,
        `Total: ${formatCurrency(sale.total)}`,
        `Payment: ${paymentLabels[sale.paymentMethod] || sale.paymentMethod || "-"}`,
      ].join("\n");

      if (navigator.share) {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            title: `MOVA Receipt ${sale.receiptNumber || ""}`.trim(),
            text: shareText,
            files: [file],
          });
        } else {
          await navigator.share({
            title: `MOVA Receipt ${sale.receiptNumber || ""}`.trim(),
            text: shareText,
          });
        }

        setReceiptActionMessage("Receipt sharing opened successfully.");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setReceiptActionMessage("Receipt summary copied to the clipboard.");
        return;
      }

      doc.save(receiptName);
      setReceiptActionMessage("Sharing is unavailable, so the receipt PDF was downloaded instead.");
    } catch (requestError) {
      if (requestError?.name === "AbortError") {
        return;
      }

      console.error("Failed to share receipt:", requestError);
      setReceiptActionMessage("Unable to share the receipt.");
    }
  };

  const openReturnModal = async (sale) => {
    if (!sale?._id) {
      setError(
        "This sale does not have a valid sale ID."
      );
      return;
    }

    try {
      setReturnSale(sale);
      setReturnSuccess(null);
      setReturnReason("");
      setReturnNotes("");
      setRefundMethod("CASH");
      setReturnQuantities({});
      setReturnableItems([]);
      setError("");
      setShowReturnModal(true);
      setLoadingReturnItems(true);

      const response = await api.get(
        `/returns/sale/${sale._id}`
      );

      const items =
        response.data.items ||
        response.data.returnableItems ||
        [];

      /*
       * Normalize the response.
       *
       * We do not create an ID when the backend
       * doesn't provide one.
       */
      const normalizedItems = Array.isArray(items)
        ? items.map((item) => {
            const productId =
              getProductId(item);

            return {
              ...item,
              productId,
              invalidProductId:
                !isValidObjectId(productId),
            };
          })
        : [];

      setReturnableItems(normalizedItems);
    } catch (requestError) {
      console.error(
        "Failed to load returnable items:",
        requestError
      );

      setReturnableItems([]);

      setError(
        getErrorMessage(
          requestError,
          "Unable to load returnable items."
        )
      );
    } finally {
      setLoadingReturnItems(false);
    }
  };

  const closeReturnModal = () => {
    if (returnSubmitting) return;

    setShowReturnModal(false);
    setReturnSale(null);
    setReturnableItems([]);
    setReturnQuantities({});
    setReturnSuccess(null);
    setReturnReason("");
    setReturnNotes("");
    setRefundMethod("CASH");
  };

  const updateReturnQuantity = (
    productId,
    value,
    max
  ) => {
    if (!isValidObjectId(productId)) {
      return;
    }

    let quantity = Number(value);

    if (Number.isNaN(quantity)) {
      quantity = 0;
    }

    quantity = Math.max(
      0,
      Math.min(quantity, max)
    );

    setReturnQuantities((current) => ({
      ...current,
      [productId]: quantity,
    }));
  };

  const getReturnQuantity = (item) => {
    const productId =
      getProductId(item);

    if (!isValidObjectId(productId)) {
      return 0;
    }

    return Number(
      returnQuantities[productId] || 0
    );
  };

  const selectedReturnItems = useMemo(() => {
    return returnableItems
      .map((item) => {
        /*
         * ONLY productId is accepted.
         *
         * We intentionally do NOT fall back to:
         * item._id
         */
        const productId =
          getProductId(item);

        const quantity =
          Number(
            returnQuantities[productId] || 0
          );

        const maxQuantity =
          Number(
            item.returnableQuantity ??
              item.quantity ??
              0
          );

        return {
          ...item,
          productId,
          quantity: Math.min(
            Math.max(quantity, 0),
            maxQuantity
          ),
        };
      })
      .filter(
        (item) =>
          isValidObjectId(item.productId) &&
          item.quantity > 0
      );
  }, [
    returnableItems,
    returnQuantities,
  ]);

  const invalidReturnItems = useMemo(() => {
    return returnableItems.filter(
      (item) =>
        !isValidObjectId(
          getProductId(item)
        )
    );
  }, [returnableItems]);

  const returnTotal = useMemo(() => {
    return selectedReturnItems.reduce(
      (sum, item) => {
        const price =
          Number(
            item.unitPrice ||
              item.sellingPrice ||
              0
          );

        return (
          sum +
          price * item.quantity
        );
      },
      0
    );
  }, [selectedReturnItems]);

  const submitReturn = async (event) => {
    event.preventDefault();

    if (!returnSale?._id) {
      setError(
        "The selected sale does not have a valid ID."
      );
      return;
    }

    if (
      selectedReturnItems.length === 0
    ) {
      setError(
        "Select at least one valid item to return."
      );
      return;
    }

    if (!returnReason.trim()) {
      setError(
        "Please provide a reason for the return."
      );
      return;
    }

    /*
     * Final frontend validation before sending
     * anything to the backend.
     */
    const invalidSelectedItem =
      selectedReturnItems.find(
        (item) =>
          !isValidObjectId(
            item.productId
          )
      );

    if (invalidSelectedItem) {
      setError(
        "One or more returned items have an invalid product ID. Please close and reopen the return window."
      );
      return;
    }

    try {
      setReturnSubmitting(true);
      setError("");

      const payload = {
        saleId: returnSale._id,

        items: selectedReturnItems.map(
          (item) => ({
            productId: String(
              item.productId
            ),
            quantity: Number(
              item.quantity
            ),
          })
        ),

        refundMethod,

        reason: returnReason.trim(),

        notes: returnNotes.trim(),
      };

      console.log(
        "RETURN PAYLOAD:",
        payload
      );

      const response = await api.post(
        "/returns",
        payload
      );

      setReturnSuccess(
        response.data.return ||
          response.data
      );

      await fetchSales(false);
    } catch (requestError) {
      console.error(
        "Failed to create return:",
        requestError
      );

      setError(
        getErrorMessage(
          requestError,
          "Failed to process the return."
        )
      );
    } finally {
      setReturnSubmitting(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setPaymentFilter("ALL");
    setStatusFilter("ALL");
    setPage(1);
  };

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Package size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                Sales
              </h1>

              <p className="text-sm text-slate-500">
                View, search and manage business transactions.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchSales(false)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>

      </div>

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">

          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1">

            <p className="font-bold">
              Something went wrong
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>

          </div>

          <button
            type="button"
            onClick={() => setError("")}
            className="rounded-lg p-1 hover:bg-red-100"
          >
            <X size={18} />
          </button>

        </div>
      )}

      {receiptActionMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span className="font-semibold">{receiptActionMessage}</span>
          <button
            type="button"
            onClick={() => setReceiptActionMessage("")}
            className="rounded-lg p-1 hover:bg-emerald-100"
            aria-label="Dismiss receipt message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* SUMMARY */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Transactions
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900">
            {totalSales}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Current Page Sales
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900">
            {summary.completed}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Current Page Revenue
          </p>

          <p className="mt-2 text-2xl font-black text-blue-600">
            {formatCurrency(
              summary.totalAmount
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Returned Transactions
          </p>

          <p className="mt-2 text-2xl font-black text-orange-600">
            {summary.refunded}
          </p>
        </div>

      </div>

      {/* FILTERS */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">

          <div className="relative lg:col-span-2">

            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search receipt number..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />

          </div>

          <select
            value={paymentFilter}
            onChange={(event) => {
              setPaymentFilter(
                event.target.value
              );
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">
              All Payment Methods
            </option>

            <option value="CASH">
              Cash
            </option>

            <option value="MOBILE_MONEY">
              Mobile Money
            </option>

            <option value="CARD">
              Card
            </option>

            <option value="BANK">
              Bank
            </option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(
                event.target.value
              );
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="ALL">
              All Statuses
            </option>

            <option value="COMPLETED">
              Completed
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>

            <option value="PARTIALLY_REFUNDED">
              Partially Refunded
            </option>

            <option value="REFUNDED">
              Refunded
            </option>
          </select>

        </div>

        <div className="mt-3 flex justify-end">

          <button
            type="button"
            onClick={clearFilters}
            className="text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>

        </div>

      </div>

      {/* SALES TABLE */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">

            <div className="flex items-center gap-3 text-slate-500">

              <RefreshCw
                size={22}
                className="animate-spin"
              />

              <span className="font-semibold">
                Loading sales...
              </span>

            </div>

          </div>
        ) : visibleSales.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">

            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Package size={30} />
            </div>

            <h3 className="mt-4 text-lg font-black text-slate-900">
              No sales found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              No transactions match your current search and filters.
            </p>

          </div>
        ) : (
          <>
            <div className="overflow-x-auto">

              <table className="min-w-[900px] w-full">

                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                      Receipt
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                      Items
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                      Payment
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                      Total
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                      Actions
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {visibleSales.map(
                    (sale) => (
                      <tr
                        key={sale._id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >

                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">
                            {sale.receiptNumber ||
                              "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {formatDate(
                            sale.createdAt
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {sale.items?.length ||
                            0}{" "}
                          item
                          {sale.items?.length ===
                          1
                            ? ""
                            : "s"}
                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              paymentClasses[
                                sale.paymentMethod
                              ] ||
                              "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {paymentLabels[
                              sale.paymentMethod
                            ] ||
                              sale.paymentMethod ||
                              "-"}
                          </span>

                        </td>

                        <td className="px-5 py-4 text-right font-black text-slate-900">
                          {formatCurrency(
                            sale.total
                          )}
                        </td>

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              statusClasses[
                                sale.status
                              ] ||
                              "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {String(
                              sale.status ||
                                "-"
                            )
                              .replaceAll(
                                "_",
                                " "
                              )
                              .toLowerCase()
                              .replace(
                                /^\w/,
                                (letter) =>
                                  letter.toUpperCase()
                              )}
                          </span>

                        </td>

                        <td className="px-5 py-4">

                          <div className="flex justify-end gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                handleViewSale(
                                  sale._id
                                )
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                              title="View sale"
                            >
                              <Eye size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePrintReceipt(sale)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                              title="Print receipt"
                            >
                              <Printer size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadReceipt(sale)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                              title="Download receipt PDF"
                            >
                              <Download size={17} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleShareReceipt(sale)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
                              title="Share receipt"
                            >
                              <Share2 size={17} />
                            </button>

                            {sale.status ===
                              "COMPLETED" && (
                              <button
                                type="button"
                                onClick={() =>
                                  openReturnModal(
                                    sale
                                  )
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
                                title="Return items"
                              >
                                <RotateCcw
                                  size={17}
                                />
                              </button>
                            )}

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

            {/* PAGINATION */}

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-sm text-slate-500">
                Page{" "}
                <span className="font-bold text-slate-700">
                  {page}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-700">
                  {pages}
                </span>
              </p>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          1,
                          current - 1
                        )
                    )
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft
                    size={18}
                  />
                </button>

                <span className="min-w-20 text-center text-sm font-bold text-slate-700">
                  {page} / {pages}
                </span>

                <button
                  type="button"
                  disabled={
                    page >= pages
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.min(
                          pages,
                          current + 1
                        )
                    )
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight
                    size={18}
                  />
                </button>

              </div>

            </div>
          </>
        )}

      </div>

      {/* SALE DETAILS MODAL */}

      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <div>
                <h2 className="text-lg font-black text-slate-900">
                  Sale Details
                </h2>

                <p className="text-sm text-slate-500">
                  {selectedSale.receiptNumber ||
                    "-"}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedSale(null)
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={20} />
              </button>

            </div>

            <div className="space-y-6 p-5">

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Receipt
                  </p>

                  <p className="mt-1 font-black text-slate-900">
                    {selectedSale.receiptNumber ||
                      "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Date
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {formatDate(
                      selectedSale.createdAt
                    )}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Payment
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {paymentLabels[
                      selectedSale.paymentMethod
                    ] ||
                      selectedSale.paymentMethod ||
                      "-"}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Status
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {selectedSale.status ||
                      "-"}
                  </p>
                </div>

              </div>

              <div>

                <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">
                  Items
                </h3>

                <div className="overflow-hidden rounded-xl border border-slate-200">

                  <table className="w-full">

                    <thead>
                      <tr className="bg-slate-50">

                        <th className="px-4 py-3 text-left text-xs font-bold uppercase text-slate-500">
                          Product
                        </th>

                        <th className="px-4 py-3 text-center text-xs font-bold uppercase text-slate-500">
                          Qty
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                          Price
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-bold uppercase text-slate-500">
                          Subtotal
                        </th>

                      </tr>
                    </thead>

                    <tbody>

                      {(selectedSale.items ||
                        []).map(
                        (item, index) => (
                          <tr
                            key={`${getProductId(
                              item
                            )}-${index}`}
                            className="border-t border-slate-100"
                          >

                            <td className="px-4 py-3">

                              <p className="font-bold text-slate-900">
                                {item.name ||
                                  "-"}
                              </p>

                              <p className="text-xs text-slate-500">
                                {item.sku ||
                                  ""}
                              </p>

                            </td>

                            <td className="px-4 py-3 text-center text-sm text-slate-700">
                              {item.quantity}
                            </td>

                            <td className="px-4 py-3 text-right text-sm text-slate-700">
                              {formatCurrency(
                                item.unitPrice
                              )}
                            </td>

                            <td className="px-4 py-3 text-right font-bold text-slate-900">
                              {formatCurrency(
                                item.subtotal
                              )}
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

              </div>

              <div className="ml-auto max-w-sm space-y-2">

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span className="font-bold text-slate-900">
                    {formatCurrency(
                      selectedSale.subtotal
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Discount
                  </span>

                  <span className="font-bold text-slate-900">
                    {formatCurrency(
                      selectedSale.discount
                    )}
                  </span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-3">

                  <span className="font-black text-slate-900">
                    Total
                  </span>

                  <span className="text-xl font-black text-blue-600">
                    {formatCurrency(
                      selectedSale.total
                    )}
                  </span>

                </div>

              </div>

              <div className="flex flex-wrap justify-end gap-3">

                {selectedSale.status ===
                  "COMPLETED" && (
                  <button
                    type="button"
                    onClick={() => {
                      const sale =
                        selectedSale;

                      setSelectedSale(null);

                      openReturnModal(
                        sale
                      );
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-100"
                  >
                    <RotateCcw size={17} />
                    Return Items
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handlePrintReceipt(selectedSale)}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <Printer size={17} />
                  Print Receipt
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadReceipt(selectedSale)}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
                >
                  <Download size={17} />
                  Download PDF
                </button>

                <button
                  type="button"
                  onClick={() => handleShareReceipt(selectedSale)}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
                >
                  <Share2 size={17} />
                  Share Receipt
                </button>

              </div>

            </div>

          </div>

        </div>
      )}

      {/* RETURN MODAL */}

      {showReturnModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">

          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <RotateCcw
                    size={20}
                  />
                </div>

                <div>

                  <h2 className="text-lg font-black text-slate-900">
                    Return Items
                  </h2>

                  <p className="text-sm text-slate-500">
                    Receipt:{" "}
                    {returnSale?.receiptNumber ||
                      "-"}
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={closeReturnModal}
                disabled={
                  returnSubmitting
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>

            </div>

            {returnSuccess ? (
              <div className="p-8 text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2
                    size={34}
                  />
                </div>

                <h3 className="mt-4 text-2xl font-black text-slate-900">
                  Return Processed
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  The returned items have been recorded successfully.
                </p>

                {returnSuccess.returnNumber && (
                  <div className="mx-auto mt-5 max-w-sm rounded-xl bg-slate-50 p-4">

                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Return Number
                    </p>

                    <p className="mt-1 text-lg font-black text-slate-900">
                      {
                        returnSuccess.returnNumber
                      }
                    </p>

                  </div>
                )}

                <button
                  type="button"
                  onClick={closeReturnModal}
                  className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
                >
                  Done
                </button>

              </div>
            ) : (
              <form
                onSubmit={submitReturn}
                className="space-y-6 p-5"
              >

                {loadingReturnItems ? (
                  <div className="flex min-h-[200px] items-center justify-center">

                    <div className="flex items-center gap-3 text-slate-500">

                      <RefreshCw
                        size={22}
                        className="animate-spin"
                      />

                      <span className="font-semibold">
                        Loading returnable items...
                      </span>

                    </div>

                  </div>
                ) : returnableItems.length ===
                  0 ? (
                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 text-center">

                    <AlertCircle
                      size={28}
                      className="mx-auto text-orange-600"
                    />

                    <p className="mt-2 font-bold text-orange-800">
                      No returnable items found.
                    </p>

                    <p className="mt-1 text-sm text-orange-700">
                      This sale may already have been fully returned.
                    </p>

                  </div>
                ) : (
                  <>
                    {invalidReturnItems.length >
                      0 && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">

                        <div className="flex items-start gap-3">

                          <AlertCircle
                            size={20}
                            className="mt-0.5 shrink-0 text-red-600"
                          />

                          <div>

                            <p className="font-bold text-red-800">
                              Some items cannot be returned
                            </p>

                            <p className="mt-1 text-sm text-red-700">
                              One or more sale items do not contain a valid product ID. Those items have been disabled to prevent an invalid return.
                            </p>

                          </div>

                        </div>

                      </div>
                    )}

                    <div>

                      <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">
                        Select Items
                      </h3>

                      <div className="space-y-3">

                        {returnableItems.map(
                          (item, index) => {
                            const productId =
                              getProductId(
                                item
                              );

                            const validProductId =
                              isValidObjectId(
                                productId
                              );

                            const maxQuantity =
                              Number(
                                item.returnableQuantity ??
                                  item.quantity ??
                                  0
                              );

                            const quantity =
                              getReturnQuantity(
                                item
                              );

                            return (
                              <div
                                key={`${productId || "invalid"}-${index}`}
                                className={`rounded-xl border p-4 ${
                                  validProductId
                                    ? "border-slate-200"
                                    : "border-red-200 bg-red-50"
                                }`}
                              >

                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                                  <div className="min-w-0">

                                    <p className="font-bold text-slate-900">
                                      {item.name ||
                                        item.productName ||
                                        "Product"}
                                    </p>

                                    {item.sku && (
                                      <p className="mt-1 text-xs text-slate-500">
                                        SKU:{" "}
                                        {
                                          item.sku
                                        }
                                      </p>
                                    )}

                                    {validProductId ? (
                                      <p className="mt-1 text-xs text-slate-500">
                                        Available to return:{" "}
                                        {
                                          maxQuantity
                                        }
                                      </p>
                                    ) : (
                                      <p className="mt-1 text-xs font-bold text-red-600">
                                        Invalid product ID
                                      </p>
                                    )}

                                    <p className="mt-1 text-sm font-semibold text-slate-700">
                                      {formatCurrency(
                                        item.unitPrice ||
                                          item.sellingPrice ||
                                          0
                                      )}{" "}
                                      each
                                    </p>

                                  </div>

                                  <div className="flex items-center gap-3">

                                    <label className="text-xs font-bold text-slate-500">
                                      Quantity
                                    </label>

                                    <input
                                      type="number"
                                      min="0"
                                      max={
                                        maxQuantity
                                      }
                                      value={
                                        validProductId
                                          ? quantity
                                          : 0
                                      }
                                      disabled={
                                        !validProductId ||
                                        maxQuantity <=
                                          0
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        updateReturnQuantity(
                                          productId,
                                          event
                                            .target
                                            .value,
                                          maxQuantity
                                        )
                                      }
                                      className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-bold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                                    />

                                  </div>

                                </div>

                              </div>
                            );
                          }
                        )}

                      </div>

                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                      <div>

                        <label className="mb-2 block text-sm font-bold text-slate-700">
                          Refund Method
                        </label>

                        <select
                          value={
                            refundMethod
                          }
                          onChange={(
                            event
                          ) =>
                            setRefundMethod(
                              event.target
                                .value
                            )
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        >
                          {refundMethods.map(
                            (method) => (
                              <option
                                key={
                                  method.value
                                }
                                value={
                                  method.value
                                }
                              >
                                {
                                  method.label
                                }
                              </option>
                            )
                          )}
                        </select>

                      </div>

                      <div className="rounded-xl bg-orange-50 p-4">

                        <p className="text-xs font-bold uppercase tracking-wider text-orange-700">
                          Estimated Refund
                        </p>

                        <p className="mt-1 text-2xl font-black text-orange-700">
                          {formatCurrency(
                            returnTotal
                          )}
                        </p>

                      </div>

                    </div>

                    <div>

                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Reason
                      </label>

                      <input
                        type="text"
                        value={
                          returnReason
                        }
                        onChange={(event) =>
                          setReturnReason(
                            event.target
                              .value
                          )
                        }
                        placeholder="e.g. Damaged product"
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />

                    </div>

                    <div>

                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Notes
                      </label>

                      <textarea
                        value={
                          returnNotes
                        }
                        onChange={(event) =>
                          setReturnNotes(
                            event.target
                              .value
                          )
                        }
                        rows="3"
                        placeholder="Additional information..."
                        className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />

                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">

                      <button
                        type="button"
                        onClick={
                          closeReturnModal
                        }
                        disabled={
                          returnSubmitting
                        }
                        className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={
                          returnSubmitting ||
                          selectedReturnItems.length ===
                            0
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {returnSubmitting ? (
                          <>
                            <RefreshCw
                              size={17}
                              className="animate-spin"
                            />

                            Processing...
                          </>
                        ) : (
                          <>
                            <RotateCcw
                              size={17}
                            />

                            Process Return
                          </>
                        )}
                      </button>

                    </div>

                  </>
                )}

              </form>
            )}

          </div>

        </div>
      )}

      {/* LOADING SALE */}

      {loadingSale && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30">

          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-xl">

            <RefreshCw
              size={20}
              className="animate-spin text-blue-600"
            />

            <span className="font-bold text-slate-700">
              Loading sale...
            </span>

          </div>

        </div>
      )}

    </div>
  );
};

export default Sales;