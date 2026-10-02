
import { useEffect, useMemo, useState } from "react";

import api from "../../services/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Printer,
  RefreshCw,
  Search,
  Share2,
  X,
} from "lucide-react";

// ==========================================
// PAYMENT LABELS
// ==========================================

const paymentLabels = {
  CASH: "Cash",
  MOBILE_MONEY: "Mobile Money",
  CARD: "Card",
  BANK: "Bank",
};

// ==========================================
// PAYMENT COLORS
// ==========================================

const paymentClasses = {
  CASH: "bg-emerald-50 text-emerald-700",
  MOBILE_MONEY: "bg-blue-50 text-blue-700",
  CARD: "bg-violet-50 text-violet-700",
  BANK: "bg-amber-50 text-amber-700",
};

// ==========================================
// STATUS COLORS
// ==========================================

const statusClasses = {
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-red-50 text-red-700",
  PARTIALLY_REFUNDED: "bg-orange-50 text-orange-700",
  REFUNDED: "bg-purple-50 text-purple-700",
};

// ==========================================
// CURRENCY FORMATTER
// ==========================================

const formatCurrency = (amount = 0) => {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
};

// ==========================================
// DATE FORMATTER
// ==========================================

const formatDate = (date) => {
  if (!date) {
    return "-";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "-";
  }

  return parsedDate.toLocaleString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ==========================================
// ERROR HANDLER
// ==========================================

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

// ==========================================
// HTML ESCAPER
// ==========================================

const escapeHtml = (value) => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

// ==========================================
// CUSTOMER DETAILS
// ==========================================

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

  return {
    name,
    phone,
  };
};

// ==========================================
// PAYMENT DETAILS
// ==========================================

const getReceiptPaymentDetails = (sale) => {
  const amountPaid =
    sale?.amountPaid ??
    sale?.paidAmount ??
    sale?.paymentAmount;

  const change =
    sale?.change ??
    sale?.changeAmount;

  return {
    hasAmountPaid:
      amountPaid !== undefined &&
      amountPaid !== null &&
      amountPaid !== "",

    hasChange:
      change !== undefined &&
      change !== null &&
      change !== "",

    amountPaid:
      Number(amountPaid) || 0,

    change:
      Number(change) || 0,
  };
};

// ==========================================
// RECEIPTS PAGE
// ==========================================

const Receipts = () => {
  const [receipts, setReceipts] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [paymentFilter, setPaymentFilter] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [page, setPage] =
    useState(1);

  const [pages, setPages] =
    useState(1);

  const [totalReceipts, setTotalReceipts] =
    useState(0);

  const [selectedReceipt, setSelectedReceipt] =
    useState(null);

  const [loadingReceipt, setLoadingReceipt] =
    useState(false);

  const [actionMessage, setActionMessage] =
    useState("");

  const pageSize = 10;

  // ========================================
  // FETCH RECEIPTS
  // ========================================

  const fetchReceipts = async (
    showLoader = true
  ) => {
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
        params.search =
          search.trim();
      }

      if (
        paymentFilter !== "ALL"
      ) {
        params.paymentMethod =
          paymentFilter;
      }

      if (
        statusFilter !== "ALL"
      ) {
        params.status =
          statusFilter;
      }

      const response = await api.get(
        "/sales",
        {
          params,
        }
      );

      const data =
        response.data;

      const sales =
        Array.isArray(data.sales)
          ? data.sales
          : [];

      setReceipts(sales);

      setTotalReceipts(
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
        "Failed to load receipts:",
        requestError
      );

      setError(
        getErrorMessage(
          requestError,
          "Failed to load receipts."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ========================================
  // INITIAL / FILTER FETCH
  // ========================================

  useEffect(() => {
    fetchReceipts();
  }, [
    page,
    paymentFilter,
    statusFilter,
  ]);

  // ========================================
  // SEARCH
  // ========================================

  useEffect(() => {
    const timer =
      setTimeout(() => {
        setPage(1);
        fetchReceipts();
      }, 400);

    return () =>
      clearTimeout(timer);
  }, [search]);

  // ========================================
  // VISIBLE RECEIPTS
  // ========================================

  const visibleReceipts =
    useMemo(() => {
      return Array.isArray(receipts)
        ? receipts
        : [];
    }, [receipts]);

  // ========================================
  // SUMMARY
  // ========================================

  const summary =
    useMemo(() => {
      const totalAmount =
        visibleReceipts.reduce(
          (sum, receipt) =>
            sum +
            Number(
              receipt.total || 0
            ),
          0
        );

      const completed =
        visibleReceipts.filter(
          (receipt) =>
            receipt.status ===
            "COMPLETED"
        ).length;

      const refunded =
        visibleReceipts.filter(
          (receipt) =>
            receipt.status ===
              "REFUNDED" ||
            receipt.status ===
              "PARTIALLY_REFUNDED"
        ).length;

      return {
        totalAmount,
        completed,
        refunded,
      };
    }, [visibleReceipts]);

  // ========================================
  // VIEW RECEIPT
  // ========================================

  const handleViewReceipt =
    async (receiptId) => {
      if (!receiptId) {
        setError(
          "This receipt does not have a valid sale ID."
        );

        return;
      }

      try {
        setLoadingReceipt(true);
        setError("");

        const response =
          await api.get(
            `/sales/${receiptId}`
          );

        setSelectedReceipt(
          response.data.sale ||
            response.data
        );
      } catch (requestError) {
        console.error(
          "Failed to load receipt:",
          requestError
        );

        setError(
          getErrorMessage(
            requestError,
            "Failed to load receipt details."
          )
        );
      } finally {
        setLoadingReceipt(false);
      }
    };

  // ========================================
  // BUILD PRINT RECEIPT HTML
  // ========================================

  const buildReceiptHtml =
    (sale) => {
      const customer =
        getReceiptCustomer(
          sale
        );

      const paymentDetails =
        getReceiptPaymentDetails(
          sale
        );

      const customerHtml =
        customer.name ||
        customer.phone
          ? `
            <div>
              <strong>Customer:</strong>
              ${escapeHtml(
                customer.name ||
                  "Walk-in Customer"
              )}
            </div>

            ${
              customer.phone
                ? `
                  <div>
                    <strong>Phone:</strong>
                    ${escapeHtml(
                      customer.phone
                    )}
                  </div>
                `
                : ""
            }
          `
          : "";

      const paymentDetailsHtml =
        paymentDetails.hasAmountPaid ||
        paymentDetails.hasChange
          ? `
            <hr />

            ${
              paymentDetails.hasAmountPaid
                ? `
                  <div class="row">
                    <span>Amount Paid</span>
                    <span>
                      ${formatCurrency(
                        paymentDetails.amountPaid
                      )}
                    </span>
                  </div>
                `
                : ""
            }

            ${
              paymentDetails.hasChange
                ? `
                  <div class="row">
                    <span>Change</span>
                    <span>
                      ${formatCurrency(
                        paymentDetails.change
                      )}
                    </span>
                  </div>
                `
                : ""
            }
          `
          : "";

      const itemsHtml =
        (sale.items || [])
          .map(
            (item) => `
              <tr>
                <td>
                  ${escapeHtml(
                    item.name || "-"
                  )}
                </td>

                <td style="text-align:center;">
                  ${
                    Number(
                      item.quantity
                    ) || 0
                  }
                </td>

                <td style="text-align:right;">
                  ${formatCurrency(
                    item.subtotal
                  )}
                </td>
              </tr>
            `
          )
          .join("");

      return `
        <!DOCTYPE html>

        <html>
          <head>
            <meta charset="UTF-8" />

            <title>
              Receipt
              ${escapeHtml(
                sale.receiptNumber ||
                  ""
              )}
            </title>

            <style>
              * {
                box-sizing: border-box;
              }

              body {
                font-family:
                  Arial,
                  sans-serif;

                padding: 24px;

                color: #111827;

                background: #fff;
              }

              .receipt {
                max-width: 420px;

                margin: 0 auto;
              }

              h1 {
                text-align: center;

                margin: 0 0 4px;

                font-size: 28px;
              }

              .center {
                text-align: center;
              }

              .muted {
                color: #6b7280;
              }

              .meta {
                line-height: 1.7;

                font-size: 13px;
              }

              hr {
                border: 0;

                border-top:
                  1px dashed
                  #9ca3af;

                margin: 16px 0;
              }

              table {
                width: 100%;

                border-collapse:
                  collapse;
              }

              th,
              td {
                padding: 8px 0;

                border-bottom:
                  1px solid
                  #e5e7eb;

                font-size: 13px;
              }

              th {
                text-align: left;

                color: #4b5563;
              }

              .row {
                display: flex;

                justify-content:
                  space-between;

                gap: 20px;

                margin: 8px 0;

                font-size: 14px;
              }

              .total {
                font-size: 18px;

                font-weight: bold;
              }

              .footer {
                margin-top: 20px;

                text-align: center;

                color: #6b7280;

                font-size: 12px;
              }

              @media print {
                body {
                  padding: 8px;
                }

                .receipt {
                  max-width: 100%;
                }
              }
            </style>
          </head>

          <body>
            <div class="receipt">

              <h1>MOVA</h1>

              <div class="center muted">
                Business Management Platform
              </div>

              <hr />

              <div class="meta">

                <div>
                  <strong>Receipt:</strong>
                  ${escapeHtml(
                    sale.receiptNumber ||
                      "-"
                  )}
                </div>

                <div>
                  <strong>Date:</strong>
                  ${escapeHtml(
                    formatDate(
                      sale.createdAt
                    )
                  )}
                </div>

                <div>
                  <strong>Payment:</strong>
                  ${escapeHtml(
                    paymentLabels[
                      sale.paymentMethod
                    ] ||
                      sale.paymentMethod ||
                      "-"
                  )}
                </div>

                ${customerHtml}

              </div>

              <hr />

              <table>

                <thead>
                  <tr>
                    <th>Item</th>

                    <th
                      style="
                        text-align:center;
                      "
                    >
                      Qty
                    </th>

                    <th
                      style="
                        text-align:right;
                      "
                    >
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  ${itemsHtml}
                </tbody>

              </table>

              <hr />

              <div class="row">
                <span>Subtotal</span>

                <span>
                  ${formatCurrency(
                    sale.subtotal
                  )}
                </span>
              </div>

              <div class="row">
                <span>Discount</span>

                <span>
                  ${formatCurrency(
                    sale.discount
                  )}
                </span>
              </div>

              <div class="row total">
                <span>Total</span>

                <span>
                  ${formatCurrency(
                    sale.total
                  )}
                </span>
              </div>

              ${paymentDetailsHtml}

              <div class="footer">
                Thank you for your business.
              </div>

            </div>
          </body>
        </html>
      `;
    };

  // ========================================
  // CREATE PDF
  // ========================================

  const createReceiptPdf =
    (sale) => {
      const doc =
        new jsPDF({
          unit: "mm",
          format: "a4",
        });

      const customer =
        getReceiptCustomer(
          sale
        );

      const paymentDetails =
        getReceiptPaymentDetails(
          sale
        );

      const pageWidth =
        doc.internal.pageSize.getWidth();

      let y = 18;

      doc.setFontSize(22);

      doc.setFont(
        undefined,
        "bold"
      );

      doc.text(
        "MOVA",
        pageWidth / 2,
        y,
        {
          align: "center",
        }
      );

      y += 7;

      doc.setFontSize(10);

      doc.setFont(
        undefined,
        "normal"
      );

      doc.text(
        "Business Management Platform",
        pageWidth / 2,
        y,
        {
          align: "center",
        }
      );

      y += 10;

      doc.setFontSize(9);

      doc.text(
        `Receipt: ${
          sale.receiptNumber ||
          "-"
        }`,
        14,
        y
      );

      y += 5;

      doc.text(
        `Date: ${formatDate(
          sale.createdAt
        )}`,
        14,
        y
      );

      y += 5;

      doc.text(
        `Payment: ${
          paymentLabels[
            sale.paymentMethod
          ] ||
          sale.paymentMethod ||
          "-"
        }`,
        14,
        y
      );

      if (
        customer.name ||
        customer.phone
      ) {
        y += 5;

        doc.text(
          `Customer: ${
            customer.name ||
            "Walk-in Customer"
          }`,
          14,
          y
        );

        if (customer.phone) {
          y += 5;

          doc.text(
            `Phone: ${customer.phone}`,
            14,
            y
          );
        }
      }

      const rows =
        (sale.items || []).map(
          (item) => [
            item.name || "-",
            Number(
              item.quantity
            ) || 0,
            formatCurrency(
              item.unitPrice
            ),
            formatCurrency(
              item.subtotal
            ),
          ]
        );

      autoTable(doc, {
        startY: y + 7,

        head: [
          [
            "Item",
            "Qty",
            "Unit Price",
            "Amount",
          ],
        ],

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
          1: {
            halign: "center",
            cellWidth: 16,
          },

          2: {
            halign: "right",
            cellWidth: 32,
          },

          3: {
            halign: "right",
            cellWidth: 32,
          },
        },

        margin: {
          left: 14,
          right: 14,
        },
      });

      y =
        (doc.lastAutoTable
          ?.finalY ||
          y + 20) + 10;

      const totals = [
        [
          "Subtotal",
          formatCurrency(
            sale.subtotal
          ),
        ],

        [
          "Discount",
          formatCurrency(
            sale.discount
          ),
        ],

        [
          "Total",
          formatCurrency(
            sale.total
          ),
        ],
      ];

      if (
        paymentDetails.hasAmountPaid
      ) {
        totals.push([
          "Amount Paid",
          formatCurrency(
            paymentDetails.amountPaid
          ),
        ]);
      }

      if (
        paymentDetails.hasChange
      ) {
        totals.push([
          "Change",
          formatCurrency(
            paymentDetails.change
          ),
        ]);
      }

      totals.forEach(
        ([label, value]) => {
          const isTotal =
            label === "Total";

          doc.setFont(
            undefined,
            isTotal
              ? "bold"
              : "normal"
          );

          doc.setFontSize(
            isTotal ? 11 : 9
          );

          doc.text(
            label,
            pageWidth - 80,
            y
          );

          doc.text(
            value,
            pageWidth - 14,
            y,
            {
              align: "right",
            }
          );

          y += isTotal ? 7 : 5;
        }
      );

      y += 7;

      doc.setFont(
        undefined,
        "normal"
      );

      doc.setFontSize(9);

      doc.text(
        "Thank you for your business.",
        pageWidth / 2,
        y,
        {
          align: "center",
        }
      );

      return doc;
    };

  // ========================================
  // PRINT RECEIPT
  // ========================================

  const handlePrintReceipt =
    (sale) => {
      if (!sale) {
        return;
      }

      const receiptWindow =
        window.open(
          "",
          "_blank",
          "width=500,height=700"
        );

      if (!receiptWindow) {
        setActionMessage(
          "Please allow pop-ups to print the receipt."
        );

        return;
      }

      receiptWindow.document.write(
        buildReceiptHtml(sale)
      );

      receiptWindow.document.close();

      receiptWindow.focus();

      setTimeout(() => {
        receiptWindow.print();
      }, 300);
    };

  // ========================================
  // DOWNLOAD RECEIPT
  // ========================================

  const handleDownloadReceipt =
    (sale) => {
      if (!sale) {
        return;
      }

      try {
        const doc =
          createReceiptPdf(
            sale
          );

        const receiptName =
          sale.receiptNumber ||
          sale._id ||
          "receipt";

        doc.save(
          `MOVA_Receipt_${receiptName}.pdf`
        );

        setActionMessage(
          "Receipt PDF downloaded successfully."
        );
      } catch (requestError) {
        console.error(
          "Failed to create receipt PDF:",
          requestError
        );

        setActionMessage(
          "Unable to create the receipt PDF."
        );
      }
    };

  // ========================================
  // SHARE RECEIPT
  // ========================================

  const handleShareReceipt =
    async (sale) => {
      if (!sale) {
        return;
      }

      try {
        const doc =
          createReceiptPdf(
            sale
          );

        const pdfBlob =
          doc.output("blob");

        const receiptName =
          `MOVA_Receipt_${
            sale.receiptNumber ||
            sale._id ||
            "receipt"
          }.pdf`;

        const file =
          new File(
            [pdfBlob],
            receiptName,
            {
              type: "application/pdf",
            }
          );

        const shareText = [
          `MOVA Receipt: ${
            sale.receiptNumber ||
            "-"
          }`,

          `Date: ${formatDate(
            sale.createdAt
          )}`,

          `Total: ${formatCurrency(
            sale.total
          )}`,

          `Payment: ${
            paymentLabels[
              sale.paymentMethod
            ] ||
            sale.paymentMethod ||
            "-"
          }`,
        ].join("\n");

        if (
          navigator.share
        ) {
          if (
            navigator.canShare?.({
              files: [file],
            })
          ) {
            await navigator.share({
              title: `MOVA Receipt ${
                sale.receiptNumber ||
                ""
              }`.trim(),

              text: shareText,

              files: [file],
            });
          } else {
            await navigator.share({
              title: `MOVA Receipt ${
                sale.receiptNumber ||
                ""
              }`.trim(),

              text: shareText,
            });
          }

          setActionMessage(
            "Receipt sharing opened successfully."
          );

          return;
        }

        if (
          navigator.clipboard?.writeText
        ) {
          await navigator.clipboard.writeText(
            shareText
          );

          setActionMessage(
            "Receipt summary copied to the clipboard."
          );

          return;
        }

        doc.save(
          receiptName
        );

        setActionMessage(
          "Sharing is unavailable, so the receipt PDF was downloaded instead."
        );
      } catch (requestError) {
        if (
          requestError?.name ===
          "AbortError"
        ) {
          return;
        }

        console.error(
          "Failed to share receipt:",
          requestError
        );

        setActionMessage(
          "Unable to share the receipt."
        );
      }
    };

  // ========================================
  // CLEAR FILTERS
  // ========================================

  const clearFilters = () => {
    setSearch("");

    setPaymentFilter(
      "ALL"
    );

    setStatusFilter(
      "ALL"
    );

    setPage(1);
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="space-y-6">

      {/* ====================================
          HEADER
      ==================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <FileText size={22} />
          </div>

          <div>

            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Receipts
            </h1>

            <p className="text-sm text-slate-500">
              View, print, download and share customer receipts.
            </p>

          </div>

        </div>

        <button
          type="button"
          onClick={() =>
            fetchReceipts(false)
          }
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

      {/* ====================================
          ERROR
      ==================================== */}

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
            onClick={() =>
              setError("")
            }
            className="rounded-lg p-1 hover:bg-red-100"
          >
            <X size={18} />
          </button>

        </div>
      )}

      {/* ====================================
          ACTION MESSAGE
      ==================================== */}

      {actionMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">

          <span className="font-semibold">
            {actionMessage}
          </span>

          <button
            type="button"
            onClick={() =>
              setActionMessage("")
            }
            className="rounded-lg p-1 hover:bg-emerald-100"
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>

        </div>
      )}

      {/* ====================================
          SUMMARY
      ==================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-sm font-semibold text-slate-500">
            Total Receipts
          </p>

          <p className="mt-2 text-2xl font-black text-slate-900">
            {totalReceipts}
          </p>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-sm font-semibold text-slate-500">
            Completed
          </p>

          <p className="mt-2 text-2xl font-black text-emerald-600">
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
            Returned
          </p>

          <p className="mt-2 text-2xl font-black text-orange-600">
            {summary.refunded}
          </p>

        </div>

      </div>

      {/* ====================================
          FILTERS
      ==================================== */}

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
            onClick={
              clearFilters
            }
            className="text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>

        </div>

      </div>

      {/* ====================================
          RECEIPTS TABLE
      ==================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">

            <div className="flex items-center gap-3 text-slate-500">

              <RefreshCw
                size={22}
                className="animate-spin"
              />

              <span className="font-semibold">
                Loading receipts...
              </span>

            </div>

          </div>
        ) : visibleReceipts.length ===
          0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">

            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <FileText size={30} />
            </div>

            <h3 className="mt-4 text-lg font-black text-slate-900">
              No receipts found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Receipts generated from completed sales will appear here.
            </p>

          </div>
        ) : (
          <>

            <div className="overflow-x-auto">

              <table className="min-w-[1000px] w-full">

                <thead>

                  <tr className="border-b border-slate-200 bg-slate-50">

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                      Receipt
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-500">
                      Customer
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

                  {visibleReceipts.map(
                    (receipt) => {
                      const customer =
                        getReceiptCustomer(
                          receipt
                        );

                      return (
                        <tr
                          key={
                            receipt._id
                          }
                          className="border-b border-slate-100 transition hover:bg-slate-50"
                        >

                          {/* RECEIPT NUMBER */}

                          <td className="px-5 py-4">

                            <p className="font-bold text-slate-900">
                              {receipt.receiptNumber ||
                                "-"}
                            </p>

                          </td>

                          {/* DATE */}

                          <td className="px-5 py-4 text-sm text-slate-600">
                            {formatDate(
                              receipt.createdAt
                            )}
                          </td>

                          {/* CUSTOMER */}

                          <td className="px-5 py-4">

                            <p className="text-sm font-bold text-slate-900">
                              {customer.name ||
                                "Walk-in Customer"}
                            </p>

                            {customer.phone && (
                              <p className="mt-1 text-xs text-slate-500">
                                {
                                  customer.phone
                                }
                              </p>
                            )}

                          </td>

                          {/* PAYMENT */}

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                paymentClasses[
                                  receipt.paymentMethod
                                ] ||
                                "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {paymentLabels[
                                receipt.paymentMethod
                              ] ||
                                receipt.paymentMethod ||
                                "-"}
                            </span>

                          </td>

                          {/* TOTAL */}

                          <td className="px-5 py-4 text-right font-black text-slate-900">
                            {formatCurrency(
                              receipt.total
                            )}
                          </td>

                          {/* STATUS */}

                          <td className="px-5 py-4">

                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                                statusClasses[
                                  receipt.status
                                ] ||
                                "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {String(
                                receipt.status ||
                                  "-"
                              )
                                .replaceAll(
                                  "_",
                                  " "
                                )
                                .toLowerCase()
                                .replace(
                                  /^\w/,
                                  (
                                    letter
                                  ) =>
                                    letter.toUpperCase()
                                )}
                            </span>

                          </td>

                          {/* ACTIONS */}

                          <td className="px-5 py-4">

                            <div className="flex justify-end gap-2">

                              {/* VIEW */}

                              <button
                                type="button"
                                onClick={() =>
                                  handleViewReceipt(
                                    receipt._id
                                  )
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                title="View receipt"
                              >
                                <Eye
                                  size={17}
                                />
                              </button>

                              {/* PRINT */}

                              <button
                                type="button"
                                onClick={() =>
                                  handlePrintReceipt(
                                    receipt
                                  )
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                title="Print receipt"
                              >
                                <Printer
                                  size={17}
                                />
                              </button>

                              {/* DOWNLOAD */}

                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadReceipt(
                                    receipt
                                  )
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                title="Download receipt PDF"
                              >
                                <Download
                                  size={17}
                                />
                              </button>

                              {/* SHARE */}

                              <button
                                type="button"
                                onClick={() =>
                                  handleShareReceipt(
                                    receipt
                                  )
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
                                title="Share receipt"
                              >
                                <Share2
                                  size={17}
                                />
                              </button>

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

            {/* ==================================
                PAGINATION
            ================================== */}

            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-sm text-slate-500">

                Page{" "}

                <span className="font-bold text-slate-700">
                  {page}
                </span>

                {" "}of{" "}

                <span className="font-bold text-slate-700">
                  {pages}
                </span>

              </p>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  disabled={
                    page <= 1
                  }
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

      {/* ====================================
          RECEIPT DETAILS MODAL
      ==================================== */}

      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

            {/* HEADER */}

            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">

              <div>

                <h2 className="text-lg font-black text-slate-900">
                  Receipt Details
                </h2>

                <p className="text-sm text-slate-500">
                  {selectedReceipt.receiptNumber ||
                    "-"}
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedReceipt(
                    null
                  )
                }
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={20} />
              </button>

            </div>

            <div className="space-y-6 p-5">

              {/* RECEIPT INFORMATION */}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                <div className="rounded-xl bg-slate-50 p-4">

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Receipt
                  </p>

                  <p className="mt-1 font-black text-slate-900">
                    {selectedReceipt.receiptNumber ||
                      "-"}
                  </p>

                </div>

                <div className="rounded-xl bg-slate-50 p-4">

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Date
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {formatDate(
                      selectedReceipt.createdAt
                    )}
                  </p>

                </div>

                <div className="rounded-xl bg-slate-50 p-4">

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Customer
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {
                      getReceiptCustomer(
                        selectedReceipt
                      ).name ||
                        "Walk-in Customer"
                    }
                  </p>

                </div>

                <div className="rounded-xl bg-slate-50 p-4">

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Payment
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {paymentLabels[
                      selectedReceipt
                        .paymentMethod
                    ] ||
                      selectedReceipt.paymentMethod ||
                      "-"}
                  </p>

                </div>

              </div>

              {/* CUSTOMER PHONE */}

              {getReceiptCustomer(
                selectedReceipt
              ).phone && (
                <div className="rounded-xl border border-slate-200 bg-white p-4">

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Customer Phone
                  </p>

                  <p className="mt-1 font-bold text-slate-900">
                    {
                      getReceiptCustomer(
                        selectedReceipt
                      ).phone
                    }
                  </p>

                </div>
              )}

              {/* ITEMS */}

              <div>

                <h3 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-500">
                  Purchased Items
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

                      {(
                        selectedReceipt.items ||
                        []
                      ).map(
                        (
                          item,
                          index
                        ) => (
                          <tr
                            key={`${item.name || "item"}-${index}`}
                            className="border-t border-slate-100"
                          >

                            <td className="px-4 py-3">

                              <p className="font-bold text-slate-900">
                                {item.name ||
                                  "-"}
                              </p>

                              {item.sku && (
                                <p className="text-xs text-slate-500">
                                  {item.sku}
                                </p>
                              )}

                            </td>

                            <td className="px-4 py-3 text-center text-sm text-slate-700">
                              {item.quantity ||
                                0}
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

              {/* TOTALS */}

              <div className="ml-auto max-w-sm space-y-2">

                <div className="flex justify-between text-sm">

                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span className="font-bold text-slate-900">
                    {formatCurrency(
                      selectedReceipt.subtotal
                    )}
                  </span>

                </div>

                <div className="flex justify-between text-sm">

                  <span className="text-slate-500">
                    Discount
                  </span>

                  <span className="font-bold text-slate-900">
                    {formatCurrency(
                      selectedReceipt.discount
                    )}
                  </span>

                </div>

                <div className="flex justify-between border-t border-slate-200 pt-3">

                  <span className="font-black text-slate-900">
                    Total
                  </span>

                  <span className="text-xl font-black text-blue-600">
                    {formatCurrency(
                      selectedReceipt.total
                    )}
                  </span>

                </div>

                {(() => {
                  const paymentDetails =
                    getReceiptPaymentDetails(
                      selectedReceipt
                    );

                  return (
                    <>
                      {paymentDetails.hasAmountPaid && (
                        <div className="flex justify-between text-sm">

                          <span className="text-slate-500">
                            Amount Paid
                          </span>

                          <span className="font-bold text-slate-900">
                            {formatCurrency(
                              paymentDetails.amountPaid
                            )}
                          </span>

                        </div>
                      )}

                      {paymentDetails.hasChange && (
                        <div className="flex justify-between text-sm">

                          <span className="text-slate-500">
                            Change
                          </span>

                          <span className="font-bold text-slate-900">
                            {formatCurrency(
                              paymentDetails.change
                            )}
                          </span>

                        </div>
                      )}
                    </>
                  );
                })()}

              </div>

              {/* ACTIONS */}

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">

                <button
                  type="button"
                  onClick={() =>
                    handlePrintReceipt(
                      selectedReceipt
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <Printer size={17} />
                  Print Receipt
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDownloadReceipt(
                      selectedReceipt
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
                >
                  <Download size={17} />
                  Download PDF
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleShareReceipt(
                      selectedReceipt
                    )
                  }
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

      {/* ====================================
          LOADING RECEIPT
      ==================================== */}

      {loadingReceipt && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/30">

          <div className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 shadow-xl">

            <RefreshCw
              size={20}
              className="animate-spin text-blue-600"
            />

            <span className="font-bold text-slate-700">
              Loading receipt...
            </span>

          </div>

        </div>
      )}

    </div>
  );
};

export default Receipts;