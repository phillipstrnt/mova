import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Download,
  Eye,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  X,
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import api from "../../services/api";
import { useBusiness } from "../../context/BusinessContext";

const getId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return value?._id || value?.id || "";
  }

  return String(value);
};

const isValidMongoId = (value) => {
  if (!value) return false;

  return /^[a-f\d]{24}$/i.test(String(value));
};

const formatCurrency = (value) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-UG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getErrorMessage = (
  error,
  fallback = "Something went wrong."
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

const getSaleId = (sale) => {
  return sale?._id || sale?.id || "";
};

const getSaleNumber = (sale) => {
  return (
    sale?.invoiceNumber ||
    sale?.receiptNumber ||
    sale?.saleNumber ||
    sale?.reference ||
    sale?.invoiceNo ||
    (getSaleId(sale)
      ? `SALE-${String(getSaleId(sale)).slice(-8).toUpperCase()}`
      : "SALE")
  );
};

const getCustomerName = (sale) => {
  return (
    sale?.customer?.name ||
    sale?.customer?.fullName ||
    sale?.customerName ||
    sale?.customer?.phone ||
    "Walk-in Customer"
  );
};

const getPaymentMethod = (sale) => {
  return (
    sale?.paymentMethod ||
    sale?.payment?.method ||
    sale?.payments?.[0]?.method ||
    "—"
  );
};

const getSaleStatus = (sale) => {
  return String(
    sale?.status || "COMPLETED"
  ).toUpperCase();
};

const getSaleTotal = (sale) => {
  return Number(
    sale?.grandTotal ??
      sale?.totalAmount ??
      sale?.total ??
      sale?.amount ??
      sale?.netTotal ??
      0
  );
};

const getSaleItems = (sale) => {
  return Array.isArray(sale?.items)
    ? sale.items
    : [];
};

const getItemName = (item) => {
  return (
    item?.product?.name ||
    item?.productName ||
    item?.name ||
    "Unknown Product"
  );
};

const getItemQuantity = (item) => {
  return Number(
    item?.quantity ??
      item?.qty ??
      0
  );
};

const getItemPrice = (item) => {
  return Number(
    item?.sellingPrice ??
      item?.unitPrice ??
      item?.price ??
      item?.salePrice ??
      0
  );
};

const getItemTotal = (item) => {
  return (
    getItemQuantity(item) *
    getItemPrice(item)
  );
};

const Sales = () => {
  const location = useLocation();
  const {
    branch,
    activeBranchId: contextActiveBranchId,
    user,
  } = useBusiness();

  const activeBranchId = useMemo(() => {
    return String(
      getId(contextActiveBranchId) ||
        getId(branch) ||
        ""
    );
  }, [contextActiveBranchId, branch]);

  const userRole = String(
    user?.role || ""
  ).toUpperCase();

  const branchRequired =
    Boolean(user) &&
    !["OWNER", "ADMIN"].includes(userRole);

  const hasValidBranch =
    !branchRequired ||
    isValidMongoId(activeBranchId);

  const activeBranchName =
    branch?.name ||
    branch?.branchName ||
    branch?.code ||
    "No branch selected";

  const [sales, setSales] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [paymentFilter, setPaymentFilter] =
    useState("ALL");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [page, setPage] =
    useState(1);

  const [pageSize] =
    useState(10);

  const [totalSales, setTotalSales] =
    useState(0);

  const [totalPages, setTotalPages] =
    useState(1);

  const [selectedSale, setSelectedSale] =
    useState(null);

  const [showSaleModal, setShowSaleModal] =
    useState(false);

  const [showReturnModal, setShowReturnModal] =
    useState(false);

  const [returnSale, setReturnSale] =
    useState(null);

  const [returnItems, setReturnItems] =
    useState([]);

  const [returnReason, setReturnReason] =
    useState("");

  const [returnType, setReturnType] =
    useState("REFUND");

  const [returnSubmitting, setReturnSubmitting] =
    useState(false);

  const ensureBranchContext = useCallback(() => {
    if (!branchRequired) {
      return true;
    }

    if (!activeBranchId) {
      setError(
        "No valid active branch is selected. Please select a branch or ask an administrator to assign a branch to your account."
      );

      return false;
    }

    if (!isValidMongoId(activeBranchId)) {
      setError(
        "The active branch is invalid. Please sign out and sign in again, or ask an administrator to assign a valid branch."
      );

      return false;
    }

    return true;
  }, [
    activeBranchId,
    branchRequired,
  ]);

  const fetchSales = useCallback(
    async (showRefresh = false) => {
      if (
        branchRequired &&
        !isValidMongoId(activeBranchId)
      ) {
        setLoading(false);
        setRefreshing(false);
        setSales([]);
        setTotalSales(0);
        setTotalPages(1);

        setError(
          "No valid active branch is selected. Please select a branch or ask an administrator to assign a branch to your account."
        );

        return;
      }

      if (startDate && endDate && startDate > endDate) {
        setLoading(false);
        setRefreshing(false);
        setError("The start date must be on or before the end date.");
        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        setError("");

        const params = {
          page,
          limit: pageSize,
        };

        if (activeBranchId) {
          params.branchId = activeBranchId;
        }

        if (search.trim()) {
          params.search = search.trim();
        }

        if (paymentFilter !== "ALL") {
          params.paymentMethod =
            paymentFilter;
        }

        if (statusFilter !== "ALL") {
          params.status = statusFilter;
        }

        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const response = await api.get(
          "/sales",
          {
            params,
          }
        );

        const data =
          response?.data || {};

        const loadedSales =
          Array.isArray(data.sales)
            ? data.sales
            : Array.isArray(data.data)
            ? data.data
            : Array.isArray(data)
            ? data
            : [];

        setSales(loadedSales);

        const pagination =
          data.pagination || {};

        const total =
          Number(
            pagination.total ??
              data.total ??
              data.totalSales ??
              loadedSales.length
          ) || 0;

        const pages =
          Number(
            pagination.pages ??
              pagination.totalPages ??
              data.pages ??
              Math.ceil(
                total / pageSize
              )
          ) || 1;

        setTotalSales(total);

        setTotalPages(
          Math.max(1, pages)
        );
      } catch (requestError) {
        console.error(
          "Unable to load sales:",
          requestError
        );

        setSales([]);
        setTotalSales(0);
        setTotalPages(1);

        setError(
          getErrorMessage(
            requestError,
            "Unable to load sales. Please try again."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      activeBranchId,
      branchRequired,
      page,
      pageSize,
      paymentFilter,
      search,
      statusFilter,
      startDate,
      endDate,
    ]
  );

  useEffect(() => {
    const globalSearch = new URLSearchParams(location.search).get("search");
    if (globalSearch !== null) {
      setSearch(globalSearch);
      setPage(1);
    }
  }, [location.search]);

  useEffect(() => {
    const timer = setTimeout(
      () => {
        fetchSales();
      },
      search.trim() ? 350 : 0
    );

    return () =>
      clearTimeout(timer);
  }, [fetchSales, search]);

  useEffect(() => {
    setPage(1);
  }, [
    paymentFilter,
    statusFilter,
    startDate,
    endDate,
  ]);

  const handleViewSale = async (
    sale
  ) => {
    const saleId =
      getSaleId(sale);

    if (!saleId) {
      setError(
        "This sale does not have a valid ID."
      );

      return;
    }

    if (!ensureBranchContext()) {
      return;
    }

    try {
      setError("");

      const params = {};

      if (activeBranchId) {
        params.branchId =
          activeBranchId;
      }

      const response =
        await api.get(
          `/sales/${saleId}`,
          {
            params,
          }
        );

      const loadedSale =
        response?.data?.sale ||
        response?.data?.data ||
        response?.data ||
        sale;

      setSelectedSale(
        loadedSale
      );

      setShowSaleModal(true);
    } catch (requestError) {
      console.error(
        "Unable to load sale:",
        requestError
      );

      setError(
        getErrorMessage(
          requestError,
          "Unable to load the selected sale."
        )
      );
    }
  };

  const closeSaleModal = () => {
    setShowSaleModal(false);
    setSelectedSale(null);
  };

  const handlePrintReceipt = (
    sale
  ) => {
    const saleNumber =
      getSaleNumber(sale);

    const customerName =
      getCustomerName(sale);

    const items =
      getSaleItems(sale);

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=450,height=700"
      );

    if (!printWindow) {
      setError(
        "Unable to open the print window. Please allow pop-ups for MOVA."
      );

      return;
    }

    const rows = items
      .map(
        (item) => `
          <tr>
            <td>${getItemName(
              item
            )}</td>

            <td style="text-align:center">
              ${getItemQuantity(
                item
              )}
            </td>

            <td style="text-align:right">
              ${formatCurrency(
                getItemPrice(item)
              )}
            </td>

            <td style="text-align:right">
              ${formatCurrency(
                getItemTotal(item)
              )}
            </td>
          </tr>
        `
      )
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>

      <html>
        <head>
          <title>
            MOVA Receipt - ${saleNumber}
          </title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #111827;
              background: #ffffff;
            }

            .receipt {
              width: 100%;
              max-width: 420px;
              margin: 0 auto;
            }

            h1 {
              margin: 0;
              text-align: center;
              font-size: 25px;
            }

            .subtitle {
              margin-top: 4px;
              text-align: center;
              color: #6b7280;
              font-size: 13px;
            }

            .divider {
              margin: 15px 0;
              border-top: 1px dashed #9ca3af;
            }

            .meta {
              font-size: 13px;
              line-height: 1.8;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }

            th {
              padding-bottom: 8px;
              border-bottom: 1px solid #d1d5db;
              text-align: left;
            }

            td {
              padding: 7px 0;
              vertical-align: top;
            }

            .total {
              display: flex;
              justify-content: space-between;
              font-size: 18px;
              font-weight: bold;
              margin-top: 12px;
            }

            .footer {
              margin-top: 25px;
              text-align: center;
              font-size: 12px;
              color: #6b7280;
              line-height: 1.6;
            }

            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>

        <body>
          <div class="receipt">

            <h1>MOVA</h1>

            <div class="subtitle">
              Business Management Platform
            </div>

            <div class="divider"></div>

            <div class="meta">
              <div>
                <strong>Receipt:</strong>
                ${saleNumber}
              </div>

              <div>
                <strong>Date:</strong>
                ${formatDate(
                  sale?.createdAt ||
                    sale?.date
                )}
              </div>

              <div>
                <strong>Customer:</strong>
                ${customerName}
              </div>

              <div>
                <strong>Payment:</strong>
                ${getPaymentMethod(
                  sale
                )}
              </div>
            </div>

            <div class="divider"></div>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align:center">
                    Qty
                  </th>
                  <th style="text-align:right">
                    Price
                  </th>
                  <th style="text-align:right">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody>
                ${rows}
              </tbody>
            </table>

            <div class="divider"></div>

            <div class="total">
              <span>Total</span>

              <span>
                ${formatCurrency(
                  getSaleTotal(sale)
                )}
              </span>
            </div>

            <div class="footer">
              Thank you for your business.

              <br />

              Powered by MOVA.
            </div>

          </div>

          <script>
            window.onload = function () {
              window.print();

              setTimeout(function () {
                window.close();
              }, 500);
            };
          </script>

        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const handleDownloadPdf = (
    sale
  ) => {
    try {
      const doc =
        new jsPDF();

      const saleNumber =
        getSaleNumber(sale);

      const customerName =
        getCustomerName(sale);

      const items =
        getSaleItems(sale);

      doc.setFontSize(20);
      doc.text(
        "MOVA",
        14,
        18
      );

      doc.setFontSize(10);

      doc.text(
        "Business Management Platform",
        14,
        25
      );

      doc.setFontSize(12);

      doc.text(
        `Receipt: ${saleNumber}`,
        14,
        36
      );

      doc.text(
        `Date: ${formatDate(
          sale?.createdAt ||
            sale?.date
        )}`,
        14,
        43
      );

      doc.text(
        `Customer: ${customerName}`,
        14,
        50
      );

      doc.text(
        `Payment: ${getPaymentMethod(
          sale
        )}`,
        14,
        57
      );

      const rows =
        items.map(
          (item) => [
            getItemName(item),
            String(
              getItemQuantity(item)
            ),
            formatCurrency(
              getItemPrice(item)
            ),
            formatCurrency(
              getItemTotal(item)
            ),
          ]
        );

      autoTable(doc, {
        startY: 65,

        head: [
          [
            "Product",
            "Qty",
            "Unit Price",
            "Amount",
          ],
        ],

        body: rows,

        styles: {
          fontSize: 9,
        },
      });

      const finalY =
        doc.lastAutoTable?.finalY ||
        80;

      doc.setFontSize(13);

      doc.text(
        `Total: ${formatCurrency(
          getSaleTotal(sale)
        )}`,
        14,
        finalY + 15
      );

      doc.setFontSize(9);

      doc.text(
        "Powered by MOVA",
        14,
        finalY + 25
      );

      doc.save(
        `MOVA-${saleNumber}.pdf`
      );
    } catch (requestError) {
      console.error(
        "Unable to generate PDF:",
        requestError
      );

      setError(
        "Unable to generate the receipt PDF."
      );
    }
  };

  const handleShareReceipt = async (
    sale
  ) => {
    const saleNumber =
      getSaleNumber(sale);

    const shareText = [
      "MOVA",
      "Business Management Platform",
      "",
      `Receipt: ${saleNumber}`,
      `Customer: ${getCustomerName(
        sale
      )}`,
      `Payment: ${getPaymentMethod(
        sale
      )}`,
      `Total: ${formatCurrency(
        getSaleTotal(sale)
      )}`,
      `Date: ${formatDate(
        sale?.createdAt ||
          sale?.date
      )}`,
    ].join("\n");

    try {
      if (
        navigator.share
      ) {
        await navigator.share({
          title: `MOVA Receipt ${saleNumber}`,
          text: shareText,
        });

        return;
      }

      if (
        navigator.clipboard
      ) {
        await navigator.clipboard.writeText(
          shareText
        );

        setError(
          "Receipt details copied to clipboard."
        );

        setTimeout(() => {
          setError("");
        }, 2500);

        return;
      }

      setError(
        "Sharing is not supported on this device."
      );
    } catch (shareError) {
      if (
        shareError?.name !==
        "AbortError"
      ) {
        console.error(
          "Unable to share receipt:",
          shareError
        );

        setError(
          "Unable to share this receipt."
        );
      }
    }
  };

  const openReturnModal = async (
    sale
  ) => {
    const saleId =
      getSaleId(sale);

    if (!saleId) {
      setError(
        "This sale does not have a valid ID."
      );

      return;
    }

    if (!ensureBranchContext()) {
      return;
    }

    try {
      setError("");

      const params = {};

      if (activeBranchId) {
        params.branchId =
          activeBranchId;
      }

      const response =
        await api.get(
          `/returns/sale/${saleId}`,
          {
            params,
          }
        );

      const loadedSale =
        response?.data?.sale ||
        response?.data?.data ||
        response?.data ||
        sale;

      const items =
        getSaleItems(
          loadedSale
        );

      setReturnSale(
        loadedSale
      );

      setReturnItems(
        items.map(
          (item) => ({
            productId:
              item?.productId ||
              item?.product?._id ||
              item?.product?.id ||
              "",

            productName:
              getItemName(item),

            quantity:
              getItemQuantity(
                item
              ),

            returnQuantity: 0,

            unitPrice:
              getItemPrice(item),

            maxReturnQuantity:
              getItemQuantity(
                item
              ),
          })
        )
      );

      setReturnReason("");
      setReturnType("REFUND");

      setShowReturnModal(true);
    } catch (requestError) {
      console.error(
        "Unable to load return information:",
        requestError
      );

      const items =
        getSaleItems(sale);

      if (items.length > 0) {
        setReturnSale(sale);

        setReturnItems(
          items.map(
            (item) => ({
              productId:
                item?.productId ||
                item?.product?._id ||
                item?.product?.id ||
                "",

              productName:
                getItemName(item),

              quantity:
                getItemQuantity(
                  item
                ),

              returnQuantity: 0,

              unitPrice:
                getItemPrice(item),

              maxReturnQuantity:
                getItemQuantity(
                  item
                ),
            })
          )
        );

        setReturnReason("");
        setReturnType("REFUND");

        setShowReturnModal(true);

        return;
      }

      setError(
        getErrorMessage(
          requestError,
          "Unable to prepare this sale for return."
        )
      );
    }
  };

  const closeReturnModal = () => {
    if (returnSubmitting) {
      return;
    }

    setShowReturnModal(false);
    setReturnSale(null);
    setReturnItems([]);
    setReturnReason("");
    setReturnType("REFUND");
  };

  const updateReturnQuantity = (
    index,
    value
  ) => {
    const numericValue =
      Math.max(
        0,
        Number(value || 0)
      );

    setReturnItems(
      (currentItems) =>
        currentItems.map(
          (item, itemIndex) => {
            if (
              itemIndex !==
              index
            ) {
              return item;
            }

            return {
              ...item,

              returnQuantity:
                Math.min(
                  numericValue,
                  Number(
                    item.maxReturnQuantity ||
                      0
                  )
                ),
            };
          }
        )
    );
  };

  const submitReturn = async () => {
    if (!returnSale) {
      setError(
        "No sale has been selected for return."
      );

      return;
    }

    if (!ensureBranchContext()) {
      return;
    }

    const saleId =
      getSaleId(returnSale);

    if (!saleId) {
      setError(
        "The selected sale does not have a valid ID."
      );

      return;
    }

    const selectedItems =
      returnItems
        .filter(
          (item) =>
            Number(
              item.returnQuantity ||
                0
            ) > 0
        )
        .map(
          (item) => ({
            productId:
              item.productId,

            quantity:
              Number(
                item.returnQuantity
              ),

            unitPrice:
              Number(
                item.unitPrice ||
                  0
              ),
          })
        );

    if (
      selectedItems.length ===
      0
    ) {
      setError(
        "Please select at least one item to return."
      );

      return;
    }

    const invalidItem =
      selectedItems.find(
        (item) =>
          !item.productId
      );

    if (invalidItem) {
      setError(
        "One or more selected products do not have a valid product ID."
      );

      return;
    }

    try {
      setReturnSubmitting(true);
      setError("");

      const payload = {
        saleId,

        items:
          selectedItems,

        reason:
          returnReason.trim() ||
          "Customer return",

        type: returnType,

        ...(activeBranchId
          ? {
              branchId:
                activeBranchId,
            }
          : {}),
      };

      const requestConfig =
        activeBranchId
          ? {
              params: {
                branchId:
                  activeBranchId,
              },
            }
          : undefined;

      await api.post(
        "/returns",
        payload,
        requestConfig
      );

      setShowReturnModal(false);
      setReturnSale(null);
      setReturnItems([]);
      setReturnReason("");
      setReturnType("REFUND");

      await fetchSales(true);
    } catch (requestError) {
      console.error(
        "Unable to submit return:",
        requestError
      );

      setError(
        getErrorMessage(
          requestError,
          "Unable to process the return."
        )
      );
    } finally {
      setReturnSubmitting(false);
    }
  };

  const goToPreviousPage =
    () => {
      setPage(
        (currentPage) =>
          Math.max(
            1,
            currentPage - 1
          )
      );
    };

  const goToNextPage =
    () => {
      setPage(
        (currentPage) =>
          Math.min(
            totalPages,
            currentPage + 1
          )
      );
    };

  const clearFilters = () => {
    setSearch("");
    setPaymentFilter("ALL");
    setStatusFilter("ALL");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasFilters =
    Boolean(search.trim()) ||
    paymentFilter !== "ALL" ||
    statusFilter !== "ALL" ||
    Boolean(startDate) ||
    Boolean(endDate);

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <FileText size={22} />
            </div>

            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-blue-600">Sales &amp; checkout</p>
              <h1 className="text-3xl font-black tracking-tight text-slate-950">Sales</h1>
            </div>

            {branchRequired && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  hasValidBranch
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />

                {activeBranchName}
              </span>
            )}

          </div>

          <p className="max-w-2xl text-sm leading-6 text-slate-500">
            Review transactions, filter by date, and manage completed sales and returns.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            fetchSales(true)
          }
          disabled={
            refreshing ||
            loading
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>

      </div>

      {error && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 ${
            error.includes(
              "copied to clipboard"
            )
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {error.includes(
            "copied to clipboard"
          ) ? (
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
            />
          ) : (
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />
          )}

          <div className="flex-1">
            <p className="font-medium">
              {error.includes(
                "copied to clipboard"
              )
                ? "Success"
                : "Something went wrong"}
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
            className="rounded-md p-1 transition hover:bg-black/5"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {branchRequired &&
        !hasValidBranch && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">

            <div className="flex items-start gap-3">

              <AlertCircle
                size={22}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>
                <h2 className="font-semibold text-amber-900">
                  Branch selection required
                </h2>

                <p className="mt-1 text-sm text-amber-800">
                  Your account does not currently
                  have a valid active branch.
                </p>

                <p className="mt-2 text-sm text-amber-800">
                  Sales are restricted by branch
                  for your account. Please select
                  a branch or ask an administrator
                  to assign one to your account.
                </p>
              </div>

            </div>

          </div>
        )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">

          <div className="relative">

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
              placeholder="Search sales..."
              className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>

          <div className="relative">

            <select
              value={
                paymentFilter
              }
              onChange={(event) =>
                setPaymentFilter(
                  event.target.value
                )
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">
                All payment methods
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
              <option value="CREDIT">Store credit</option>
            </select>

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

          </div>

          <div className="relative">

            <select
              value={
                statusFilter
              }
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
              className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-3 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">
                All statuses
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

            <ChevronDown
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

          </div>

          <label className="block text-xs font-semibold text-slate-500">
            From date
            <input type="date" value={startDate} max={endDate || undefined} onChange={(event) => setStartDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>

          <label className="block text-xs font-semibold text-slate-500">
            To date
            <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>

          <button
            type="button"
            onClick={
              clearFilters
            }
            disabled={
              !hasFilters
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X size={16} />

            Clear filters
          </button>

        </div>

      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Sales found
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {totalSales}
          </p>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Current page
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {page}
          </p>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Total pages
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {totalPages}
          </p>

        </div>

      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">

            <div className="flex items-center gap-3 text-slate-500">

              <Loader2
                size={22}
                className="animate-spin"
              />

              <span>
                Loading sales...
              </span>

            </div>

          </div>
        ) : sales.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">

            <div className="mb-4 rounded-full bg-slate-100 p-4">

              <FileText
                size={28}
                className="text-slate-400"
              />

            </div>

            <h3 className="text-lg font-semibold text-slate-900">
              No sales found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              There are no sales matching your current filters.
            </p>

          </div>
        ) : (
          <>

            <div className="overflow-x-auto">

              <table className="min-w-full divide-y divide-slate-200">

                <thead className="bg-slate-50">

                  <tr>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Sale
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Customer
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Payment
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Total
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Date
                    </th>

                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-slate-200">

                  {sales.map(
                    (sale) => {
                      const saleId =
                        getSaleId(
                          sale
                        );

                      const status =
                        getSaleStatus(
                          sale
                        );

                      let statusClasses =
                        "bg-amber-100 text-amber-700";

                      if (
                        status ===
                        "COMPLETED"
                      ) {
                        statusClasses =
                          "bg-green-100 text-green-700";
                      }

                      if (
                        status ===
                        "CANCELLED"
                      ) {
                        statusClasses =
                          "bg-red-100 text-red-700";
                      }

                      if (
                        status ===
                        "REFUNDED"
                      ) {
                        statusClasses =
                          "bg-purple-100 text-purple-700";
                      }

                      return (
                        <tr
                          key={
                            saleId
                          }
                          className="transition hover:bg-slate-50"
                        >

                          <td className="whitespace-nowrap px-4 py-4">

                            <div className="font-medium text-slate-900">
                              {getSaleNumber(
                                sale
                              )}
                            </div>

                            <div className="text-xs text-slate-500">
                              {
                                getSaleItems(
                                  sale
                                ).length
                              }{" "}
                              item
                              {getSaleItems(
                                sale
                              ).length ===
                              1
                                ? ""
                                : "s"}
                            </div>

                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                            {getCustomerName(
                              sale
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-700">
                            {getPaymentMethod(
                              sale
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses}`}
                            >
                              {status.replaceAll(
                                "_",
                                " "
                              )}
                            </span>

                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-semibold text-slate-900">
                            {formatCurrency(
                              getSaleTotal(
                                sale
                              )
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                            {formatDate(
                              sale?.createdAt ||
                                sale?.date
                            )}
                          </td>

                          <td className="whitespace-nowrap px-4 py-4">

                            <div className="flex justify-end gap-1">

                              <button
                                type="button"
                                title="View sale"
                                onClick={() =>
                                  handleViewSale(
                                    sale
                                  )
                                }
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
                              >
                                <Eye
                                  size={17}
                                />
                              </button>

                              <button
                                type="button"
                                title="Print receipt"
                                onClick={() =>
                                  handlePrintReceipt(
                                    sale
                                  )
                                }
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
                              >
                                <Printer
                                  size={17}
                                />
                              </button>

                              <button
                                type="button"
                                title="Download PDF"
                                onClick={() =>
                                  handleDownloadPdf(
                                    sale
                                  )
                                }
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
                              >
                                <Download
                                  size={17}
                                />
                              </button>

                              <button
                                type="button"
                                title="Share receipt"
                                onClick={() =>
                                  handleShareReceipt(
                                    sale
                                  )
                                }
                                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
                              >
                                <Share2
                                  size={17}
                                />
                              </button>

                              {status !==
                                "REFUNDED" &&
                                status !==
                                  "CANCELLED" && (
                                  <button
                                    type="button"
                                    title="Return sale"
                                    onClick={() =>
                                      openReturnModal(
                                        sale
                                      )
                                    }
                                    className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-orange-600"
                                  >
                                    <RotateCcw
                                      size={
                                        17
                                      }
                                    />
                                  </button>
                                )}

                            </div>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-sm text-slate-500">
                Page{" "}
                {page}{" "}
                of{" "}
                {totalPages}
              </p>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  onClick={
                    goToPreviousPage
                  }
                  disabled={
                    page <= 1
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft
                    size={16}
                  />

                  Previous
                </button>

                <button
                  type="button"
                  onClick={
                    goToNextPage
                  }
                  disabled={
                    page >=
                    totalPages
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next

                  <ArrowRight
                    size={16}
                  />
                </button>

              </div>

            </div>

          </>
        )}

      </div>

      {showSaleModal &&
        selectedSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

            <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Sale Details
                  </h2>

                  <p className="text-sm text-slate-500">
                    {getSaleNumber(
                      selectedSale
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeSaleModal
                  }
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100"
                >
                  <X size={20} />
                </button>

              </div>

              <div className="max-h-[calc(90vh-145px)] overflow-y-auto p-5">

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Customer
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {getCustomerName(
                        selectedSale
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Payment
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {getPaymentMethod(
                        selectedSale
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Status
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {getSaleStatus(
                        selectedSale
                      ).replaceAll(
                        "_",
                        " "
                      )}
                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Date
                    </p>

                    <p className="mt-1 font-semibold text-slate-900">
                      {formatDate(
                        selectedSale?.createdAt ||
                          selectedSale?.date
                      )}
                    </p>

                  </div>

                </div>

                <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">

                  <table className="min-w-full divide-y divide-slate-200">

                    <thead className="bg-slate-50">

                      <tr>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Product
                        </th>

                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Qty
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Unit Price
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Amount
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-200">

                      {getSaleItems(
                        selectedSale
                      ).map(
                        (
                          item,
                          index
                        ) => (
                          <tr
                            key={
                              item?._id ||
                              item?.productId ||
                              index
                            }
                          >

                            <td className="px-4 py-3 text-sm text-slate-900">
                              {getItemName(
                                item
                              )}
                            </td>

                            <td className="px-4 py-3 text-center text-sm text-slate-700">
                              {getItemQuantity(
                                item
                              )}
                            </td>

                            <td className="px-4 py-3 text-right text-sm text-slate-700">
                              {formatCurrency(
                                getItemPrice(
                                  item
                                )
                              )}
                            </td>

                            <td className="px-4 py-3 text-right text-sm font-medium text-slate-900">
                              {formatCurrency(
                                getItemTotal(
                                  item
                                )
                              )}
                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

                <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 p-4">

                  <span className="font-semibold text-slate-700">
                    Total
                  </span>

                  <span className="text-xl font-bold text-slate-900">
                    {formatCurrency(
                      getSaleTotal(
                        selectedSale
                      )
                    )}
                  </span>

                </div>

              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">

                <button
                  type="button"
                  onClick={() =>
                    handlePrintReceipt(
                      selectedSale
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Printer
                    size={16}
                  />

                  Print
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleDownloadPdf(
                      selectedSale
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Download
                    size={16}
                  />

                  PDF
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleShareReceipt(
                      selectedSale
                    )
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Share2
                    size={16}
                  />

                  Share
                </button>

                <button
                  type="button"
                  onClick={
                    closeSaleModal
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Close
                </button>

              </div>

            </div>

          </div>
        )}

      {showReturnModal &&
        returnSale && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">

            <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">

              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

                <div>

                  <div className="flex items-center gap-2">

                    <RotateCcw
                      size={20}
                      className="text-orange-500"
                    />

                    <h2 className="text-lg font-bold text-slate-900">
                      Process Return
                    </h2>

                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {getSaleNumber(
                      returnSale
                    )}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    closeReturnModal
                  }
                  disabled={
                    returnSubmitting
                  }
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X size={20} />
                </button>

              </div>

              <div className="max-h-[calc(90vh-145px)] overflow-y-auto p-5">

                <div className="overflow-x-auto rounded-xl border border-slate-200">

                  <table className="min-w-full divide-y divide-slate-200">

                    <thead className="bg-slate-50">

                      <tr>

                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Product
                        </th>

                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Sold
                        </th>

                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Unit Price
                        </th>

                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Return Qty
                        </th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-200">

                      {returnItems.map(
                        (
                          item,
                          index
                        ) => (
                          <tr
                            key={
                              item.productId ||
                              index
                            }
                          >

                            <td className="px-4 py-4">

                              <div className="font-medium text-slate-900">
                                {
                                  item.productName
                                }
                              </div>

                            </td>

                            <td className="px-4 py-4 text-center text-sm text-slate-700">
                              {
                                item.maxReturnQuantity
                              }
                            </td>

                            <td className="px-4 py-4 text-right text-sm text-slate-700">
                              {formatCurrency(
                                item.unitPrice
                              )}
                            </td>

                            <td className="px-4 py-4">

                              <input
                                type="number"
                                min="0"
                                max={
                                  item.maxReturnQuantity
                                }
                                step="1"
                                value={
                                  item.returnQuantity
                                }
                                onChange={(
                                  event
                                ) =>
                                  updateReturnQuantity(
                                    index,
                                    event
                                      .target
                                      .value
                                  )
                                }
                                className="mx-auto block w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-center text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                              />

                            </td>

                          </tr>
                        )
                      )}

                    </tbody>

                  </table>

                </div>

                <div className="mt-5">

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Return type
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                    <button
                      type="button"
                      onClick={() =>
                        setReturnType(
                          "REFUND"
                        )
                      }
                      className={`rounded-xl border p-4 text-left transition ${
                        returnType ===
                        "REFUND"
                          ? "border-orange-500 bg-orange-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >

                      <p className="font-semibold text-slate-900">
                        Refund
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Refund the customer using the configured return process.
                      </p>

                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setReturnType(
                          "STORE_CREDIT"
                        )
                      }
                      className={`rounded-xl border p-4 text-left transition ${
                        returnType ===
                        "STORE_CREDIT"
                          ? "border-orange-500 bg-orange-50"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >

                      <p className="font-semibold text-slate-900">
                        Store Credit
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Give the customer store credit instead of an immediate refund.
                      </p>

                    </button>

                  </div>

                </div>

                <div className="mt-5">

                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Return reason
                  </label>

                  <textarea
                    value={
                      returnReason
                    }
                    onChange={(
                      event
                    ) =>
                      setReturnReason(
                        event.target
                          .value
                      )
                    }
                    rows={3}
                    placeholder="Enter the reason for this return..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                  />

                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl bg-orange-50 p-4">

                  <span className="font-medium text-orange-800">
                    Return amount
                  </span>

                  <span className="text-xl font-bold text-orange-900">
                    {formatCurrency(
                      returnItems.reduce(
                        (
                          total,
                          item
                        ) =>
                          total +
                          Number(
                            item.returnQuantity ||
                              0
                          ) *
                            Number(
                              item.unitPrice ||
                                0
                            ),
                        0
                      )
                    )}
                  </span>

                </div>

              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-4">

                <button
                  type="button"
                  onClick={
                    closeReturnModal
                  }
                  disabled={
                    returnSubmitting
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    submitReturn
                  }
                  disabled={
                    returnSubmitting
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {returnSubmitting ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />

                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={17}
                      />

                      Complete Return
                    </>
                  )}

                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
};

export default Sales;
