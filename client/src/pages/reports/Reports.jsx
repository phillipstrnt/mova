import { useEffect, useState } from "react";

import {
  BarChart3,
  Calendar,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Printer,
  RefreshCw,
  Save,
  Share2,
  Trash2,
  Wallet,
} from "lucide-react";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import api from "../../api";

/* =========================================================
   HELPERS
========================================================= */

const getLocalDateString = (
  date = new Date()
) => {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatCurrency = (
  value
) => {
  return new Intl.NumberFormat(
    "en-UG",
    {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0,
    }
  ).format(
    Number(value) || 0
  );
};

const numberValue = (
  value
) => Number(value) || 0;

const formatNumber = (
  value
) => {
  return new Intl.NumberFormat(
    "en-UG"
  ).format(
    numberValue(value)
  );
};

const formatReportDate = (
  date
) => {
  if (!date) {
    return "";
  }

  const parsed =
    new Date(
      `${date}T00:00:00`
    );

  return parsed.toLocaleDateString(
    "en-UG",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
};

const formatSavedDate = (
  date
) => {
  if (!date) {
    return "";
  }

  return new Date(
    date
  ).toLocaleDateString(
    "en-UG",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
};

/* =========================================================
   REPORTS COMPONENT
========================================================= */

const Reports = () => {
  const today =
    getLocalDateString();

  const firstDayDate =
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );

  const firstDay =
    getLocalDateString(
      firstDayDate
    );

  /* =========================================================
     DATE STATE
  ========================================================= */

  const [
    startDate,
    setStartDate,
  ] = useState(firstDay);

  const [
    endDate,
    setEndDate,
  ] = useState(today);

  /* =========================================================
     REPORT STATE
  ========================================================= */

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    salesReport,
    setSalesReport,
  ] = useState(null);

  const [
    paymentReport,
    setPaymentReport,
  ] = useState(null);

  const [
    expenseReport,
    setExpenseReport,
  ] = useState(null);

  const [
    profitReport,
    setProfitReport,
  ] = useState(null);

  const [
    inventoryReport,
    setInventoryReport,
  ] = useState(null);

  /* =========================================================
     SHARING STATE
  ========================================================= */

  const [
    sharingReport,
    setSharingReport,
  ] = useState(false);

  const [
    shareMessage,
    setShareMessage,
  ] = useState("");

  /* =========================================================
     SAVED REPORT STATE
  ========================================================= */

  const [
    savedReports,
    setSavedReports,
  ] = useState([]);

  const [
    savingReport,
    setSavingReport,
  ] = useState(false);

  const [
    saveReportName,
    setSaveReportName,
  ] = useState("");

  const [
    selectedSavedReport,
    setSelectedSavedReport,
  ] = useState(null);

  const [
    savedReportLoading,
    setSavedReportLoading,
  ] = useState(false);

  /* =========================================================
     LOAD CURRENT REPORTS
  ========================================================= */

  const loadReports =
    async () => {
      if (
        !startDate ||
        !endDate
      ) {
        setError(
          "Please select both a start date and an end date."
        );

        return;
      }

      if (
        startDate >
        endDate
      ) {
        setError(
          "Start date cannot be after the end date."
        );

        return;
      }

      try {
        setLoading(true);

        setError("");

        const params = {
          startDate,
          endDate,
        };

        console.log(
          "Loading reports for:",
          params
        );

        const [
          salesResponse,
          paymentResponse,
          expenseResponse,
          profitResponse,
          inventoryResponse,
        ] =
          await Promise.all([
            api.get(
              "/reports/sales",
              {
                params,
              }
            ),

            api.get(
              "/reports/payments",
              {
                params,
              }
            ),

            api.get(
              "/reports/expenses",
              {
                params,
              }
            ),

            api.get(
              "/reports/profit",
              {
                params,
              }
            ),

            api.get(
              "/reports/inventory"
            ),
          ]);

        console.log(
          "Sales report:",
          salesResponse.data
        );

        console.log(
          "Payment report:",
          paymentResponse.data
        );

        console.log(
          "Expense report:",
          expenseResponse.data
        );

        console.log(
          "Profit report:",
          profitResponse.data
        );

        console.log(
          "Inventory report:",
          inventoryResponse.data
        );

        setSalesReport(
          salesResponse.data
            ?.report || null
        );

        setPaymentReport(
          paymentResponse.data
            ?.report || null
        );

        setExpenseReport(
          expenseResponse.data
            ?.report || null
        );

        setProfitReport(
          profitResponse.data
            ?.report || null
        );

        setInventoryReport(
          inventoryResponse.data
            ?.report || null
        );
      } catch (err) {
        console.error(
          "Reports error:",
          err
        );

        setError(
          err.response?.data
            ?.message ||
            "Failed to load reports."
        );
      } finally {
        setLoading(false);
      }
    };

  /* =========================================================
     LOAD SAVED REPORTS
  ========================================================= */

  const loadSavedReports =
    async () => {
      try {
        const response =
          await api.get(
            "/reports/saved"
          );

        setSavedReports(
          response.data
            ?.reports || []
        );
      } catch (err) {
        console.error(
          "Saved reports error:",
          err
        );
      }
    };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadReports();
    loadSavedReports();
  }, []);

  /* =========================================================
     REPORT SUMMARY
  ========================================================= */

  const getReportSummary =
    () => {
      return {
        revenue:
          numberValue(
            profitReport?.revenue
          ),

        costOfGoods:
          numberValue(
            profitReport?.costOfGoods
          ),

        grossProfit:
          numberValue(
            profitReport?.grossProfit
          ),

        expenses:
          numberValue(
            profitReport?.totalExpenses
          ),

        netProfit:
          numberValue(
            profitReport?.netProfit
          ),

        totalSales:
          numberValue(
            salesReport?.totalSales
          ),

        totalTransactions:
          numberValue(
            salesReport?.totalTransactions
          ),

        totalItems:
          numberValue(
            salesReport?.totalItems
          ),

        totalDiscount:
          numberValue(
            salesReport?.totalDiscount
          ),

        totalPayments:
          numberValue(
            paymentReport?.totalPayments
          ),

        cash:
          numberValue(
            paymentReport
              ?.breakdown?.CASH
          ),

        mobileMoney:
          numberValue(
            paymentReport
              ?.breakdown
              ?.MOBILE_MONEY
          ),

        card:
          numberValue(
            paymentReport
              ?.breakdown?.CARD
          ),

        bank:
          numberValue(
            paymentReport
              ?.breakdown?.BANK
          ),

        totalExpenses:
          numberValue(
            expenseReport
              ?.totalExpenses
          ),

        inventoryValue:
          numberValue(
            inventoryReport
              ?.inventoryValue
          ),

        totalProducts:
          numberValue(
            inventoryReport
              ?.totalProducts
          ),

        lowStock:
          numberValue(
            inventoryReport
              ?.lowStockCount
          ),

        outOfStock:
          numberValue(
            inventoryReport
              ?.outOfStockCount
          ),
      };
    };

  /* =========================================================
     SAVE REPORT
  ========================================================= */

  const handleSaveReport =
    async () => {
      if (
        !saveReportName.trim()
      ) {
        setError(
          "Please enter a name for the report."
        );

        return;
      }

      if (
        !startDate ||
        !endDate
      ) {
        setError(
          "Please select a valid date range."
        );

        return;
      }

      if (
        startDate >
        endDate
      ) {
        setError(
          "Start date cannot be after the end date."
        );

        return;
      }

      try {
        setSavingReport(true);

        setError("");

        const reportData =
          getReportSummary();

        await api.post(
          "/reports/saved",
          {
            name:
              saveReportName.trim(),

            reportType:
              "BUSINESS",

            startDate,

            endDate,

            data: {
              ...reportData,

              paymentBreakdown:
                paymentReport
                  ?.breakdown || {},

              expenseBreakdown:
                expenseReport
                  ?.categoryBreakdown ||
                {},
            },
          }
        );

        setSaveReportName("");

        await loadSavedReports();
      } catch (err) {
        console.error(
          "Save report error:",
          err
        );

        setError(
          err.response?.data
            ?.message ||
            "Failed to save report."
        );
      } finally {
        setSavingReport(false);
      }
    };

  /* =========================================================
     VIEW SAVED REPORT
  ========================================================= */

  const handleViewSavedReport =
    async (id) => {
      try {
        setSavedReportLoading(
          true
        );

        const response =
          await api.get(
            `/reports/saved/${id}`
          );

        setSelectedSavedReport(
          response.data
            ?.report || null
        );
      } catch (err) {
        console.error(
          "View saved report error:",
          err
        );

        setError(
          err.response?.data
            ?.message ||
            "Failed to open saved report."
        );
      } finally {
        setSavedReportLoading(
          false
        );
      }
    };

  /* =========================================================
     DELETE SAVED REPORT
  ========================================================= */

  const handleDeleteSavedReport =
    async (id) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this saved report?"
        );

      if (!confirmed) {
        return;
      }

      try {
        setError("");

        await api.delete(
          `/reports/saved/${id}`
        );

        if (
          selectedSavedReport?._id ===
          id
        ) {
          setSelectedSavedReport(
            null
          );
        }

        await loadSavedReports();
      } catch (err) {
        console.error(
          "Delete report error:",
          err
        );

        setError(
          err.response?.data
            ?.message ||
            "Failed to delete report."
        );
      }
    };

  /* =========================================================
     CREATE PDF DOCUMENT
  ========================================================= */

  const createPdfDocument =
    () => {
      const report =
        getReportSummary();

      const doc =
        new jsPDF();

      doc.setFontSize(20);

      doc.text(
        "MOVA",
        14,
        18
      );

      doc.setFontSize(11);

      doc.text(
        "Business Management Platform",
        14,
        25
      );

      doc.setFontSize(16);

      doc.text(
        "Business Performance Report",
        14,
        38
      );

      doc.setFontSize(10);

      doc.text(
        `Period: ${formatReportDate(
          startDate
        )} - ${formatReportDate(
          endDate
        )}`,
        14,
        46
      );

      doc.text(
        `Generated: ${new Date().toLocaleString(
          "en-UG"
        )}`,
        14,
        52
      );

      autoTable(
        doc,
        {
          startY: 60,

          head: [
            [
              "Performance",
              "Amount",
            ],
          ],

          body: [
            [
              "Revenue",
              formatCurrency(
                report.revenue
              ),
            ],

            [
              "Cost of Goods",
              formatCurrency(
                report.costOfGoods
              ),
            ],

            [
              "Gross Profit",
              formatCurrency(
                report.grossProfit
              ),
            ],

            [
              "Expenses",
              formatCurrency(
                report.expenses
              ),
            ],

            [
              "Net Profit",
              formatCurrency(
                report.netProfit
              ),
            ],
          ],
        }
      );

      const paymentStart =
        doc.lastAutoTable
          .finalY + 10;

      autoTable(
        doc,
        {
          startY:
            paymentStart,

          head: [
            [
              "Payment Method",
              "Amount",
            ],
          ],

          body: [
            [
              "Cash",
              formatCurrency(
                report.cash
              ),
            ],

            [
              "Mobile Money",
              formatCurrency(
                report.mobileMoney
              ),
            ],

            [
              "Card",
              formatCurrency(
                report.card
              ),
            ],

            [
              "Bank",
              formatCurrency(
                report.bank
              ),
            ],

            [
              "Total Payments",
              formatCurrency(
                report.totalPayments
              ),
            ],
          ],
        }
      );

      const salesStart =
        doc.lastAutoTable
          .finalY + 10;

      autoTable(
        doc,
        {
          startY:
            salesStart,

          head: [
            [
              "Sales Information",
              "Value",
            ],
          ],

          body: [
            [
              "Total Sales",
              formatCurrency(
                report.totalSales
              ),
            ],

            [
              "Transactions",
              formatNumber(
                report.totalTransactions
              ),
            ],

            [
              "Items Sold",
              formatNumber(
                report.totalItems
              ),
            ],

            [
              "Discounts",
              formatCurrency(
                report.totalDiscount
              ),
            ],

            [
              "Expenses",
              formatCurrency(
                report.totalExpenses
              ),
            ],
          ],
        }
      );

      const inventoryStart =
        doc.lastAutoTable
          .finalY + 10;

      autoTable(
        doc,
        {
          startY:
            inventoryStart,

          head: [
            [
              "Inventory",
              "Value",
            ],
          ],

          body: [
            [
              "Total Products",
              formatNumber(
                report.totalProducts
              ),
            ],

            [
              "Inventory Value",
              formatCurrency(
                report.inventoryValue
              ),
            ],

            [
              "Low Stock",
              formatNumber(
                report.lowStock
              ),
            ],

            [
              "Out of Stock",
              formatNumber(
                report.outOfStock
              ),
            ],
          ],
        }
      );

      return doc;
    };

  /* =========================================================
     PDF EXPORT
  ========================================================= */

  const exportPDF = () => {
    try {
      setError("");

      const doc =
        createPdfDocument();

      doc.save(
        `MOVA_Report_${startDate}_${endDate}.pdf`
      );
    } catch (err) {
      console.error(
        "PDF export error:",
        err
      );

      setError(
        "Failed to generate the PDF report."
      );
    }
  };

  /* =========================================================
     SHARE REPORT
  ========================================================= */

  const shareReport =
    async () => {
      try {
        setSharingReport(true);

        setShareMessage("");

        setError("");

        const report =
          getReportSummary();

        const doc =
          createPdfDocument();

        const fileName =
          `MOVA_Report_${startDate}_${endDate}.pdf`;

        const pdfBlob =
          doc.output("blob");

        const pdfFile =
          new File(
            [pdfBlob],
            fileName,
            {
              type:
                "application/pdf",
            }
          );

        const shareText = [
          "MOVA BUSINESS REPORT",
          "",
          `Period: ${formatReportDate(
            startDate
          )} - ${formatReportDate(
            endDate
          )}`,
          "",
          `Revenue: ${formatCurrency(
            report.revenue
          )}`,
          `Gross Profit: ${formatCurrency(
            report.grossProfit
          )}`,
          `Net Profit: ${formatCurrency(
            report.netProfit
          )}`,
          `Total Sales: ${formatCurrency(
            report.totalSales
          )}`,
          `Transactions: ${formatNumber(
            report.totalTransactions
          )}`,
          `Items Sold: ${formatNumber(
            report.totalItems
          )}`,
          `Total Expenses: ${formatCurrency(
            report.totalExpenses
          )}`,
          "",
          "Generated by MOVA Business Management Platform.",
        ].join("\n");

        /* =====================================================
           OPTION 1: NATIVE FILE SHARING
        ===================================================== */

        if (
          typeof navigator !==
            "undefined" &&
          typeof navigator.share ===
            "function"
        ) {
          let canShareFile =
            false;

          if (
            typeof navigator.canShare ===
            "function"
          ) {
            try {
              canShareFile =
                navigator.canShare({
                  files: [
                    pdfFile,
                  ],
                });
            } catch {
              canShareFile = false;
            }
          }

          if (
            canShareFile
          ) {
            await navigator.share(
              {
                title:
                  "MOVA Business Report",

                text:
                  shareText,

                files: [
                  pdfFile,
                ],
              }
            );

            setShareMessage(
              "Report shared successfully."
            );

            return;
          }

          /* ===================================================
             OPTION 2: NATIVE TEXT SHARING
          =================================================== */

          await navigator.share(
            {
              title:
                "MOVA Business Report",

              text:
                shareText,
            }
          );

          setShareMessage(
            "Report summary shared successfully. Use Download PDF if you also need the PDF file."
          );

          return;
        }

        /* =====================================================
           OPTION 3: CLIPBOARD FALLBACK
        ===================================================== */

        if (
          typeof navigator !==
            "undefined" &&
          navigator.clipboard &&
          typeof navigator.clipboard
            .writeText ===
            "function"
        ) {
          try {
            await navigator.clipboard.writeText(
              shareText
            );

            setShareMessage(
              "Report summary copied to clipboard. You can paste it into WhatsApp, email, SMS or another app. The PDF can be downloaded using Download PDF."
            );

            return;
          } catch (
            clipboardError
          ) {
            console.warn(
              "Clipboard sharing failed:",
              clipboardError
            );
          }
        }

        /* =====================================================
           OPTION 4: DOWNLOAD FALLBACK
        ===================================================== */

        doc.save(
          fileName
        );

        setShareMessage(
          "Your browser does not support direct sharing. The PDF has been downloaded so you can share it manually."
        );
      } catch (err) {
        /*
          When the user cancels the native share dialog,
          browsers may throw an AbortError. This should not
          appear as a scary application error.
        */

        if (
          err?.name ===
          "AbortError"
        ) {
          setShareMessage(
            "Sharing was cancelled."
          );

          return;
        }

        console.error(
          "Share report error:",
          err
        );

        setError(
          "Unable to share the report. Please try Download PDF instead."
        );
      } finally {
        setSharingReport(false);
      }
    };

  /* =========================================================
     EXCEL EXPORT
  ========================================================= */

  const exportExcel =
    () => {
      try {
        setError("");

        const report =
          getReportSummary();

        const workbook =
          XLSX.utils.book_new();

        const summaryData = [
          [
            "MOVA BUSINESS REPORT",
            "",
          ],

          [
            "Reporting Period",
            `${startDate} to ${endDate}`,
          ],

          [],

          [
            "PERFORMANCE",
            "VALUE",
          ],

          [
            "Revenue",
            report.revenue,
          ],

          [
            "Cost of Goods",
            report.costOfGoods,
          ],

          [
            "Gross Profit",
            report.grossProfit,
          ],

          [
            "Expenses",
            report.expenses,
          ],

          [
            "Net Profit",
            report.netProfit,
          ],

          [],

          [
            "SALES",
            "VALUE",
          ],

          [
            "Total Sales",
            report.totalSales,
          ],

          [
            "Transactions",
            report.totalTransactions,
          ],

          [
            "Items Sold",
            report.totalItems,
          ],

          [
            "Discounts",
            report.totalDiscount,
          ],

          [],

          [
            "PAYMENT METHODS",
            "VALUE",
          ],

          [
            "Cash",
            report.cash,
          ],

          [
            "Mobile Money",
            report.mobileMoney,
          ],

          [
            "Card",
            report.card,
          ],

          [
            "Bank",
            report.bank,
          ],

          [
            "Total Payments",
            report.totalPayments,
          ],

          [],

          [
            "INVENTORY",
            "VALUE",
          ],

          [
            "Total Products",
            report.totalProducts,
          ],

          [
            "Inventory Value",
            report.inventoryValue,
          ],

          [
            "Low Stock",
            report.lowStock,
          ],

          [
            "Out of Stock",
            report.outOfStock,
          ],
        ];

        const worksheet =
          XLSX.utils.aoa_to_sheet(
            summaryData
          );

        worksheet["!cols"] = [
          {
            width: 30,
          },

          {
            width: 24,
          },
        ];

        XLSX.utils.book_append_sheet(
          workbook,
          worksheet,
          "Summary"
        );

        const salesData = [
          [
            "Metric",
            "Value",
          ],

          [
            "Total Sales",
            report.totalSales,
          ],

          [
            "Transactions",
            report.totalTransactions,
          ],

          [
            "Items Sold",
            report.totalItems,
          ],

          [
            "Discounts",
            report.totalDiscount,
          ],
        ];

        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet(
            salesData
          ),
          "Sales"
        );

        const paymentsData = [
          [
            "Payment Method",
            "Amount",
          ],

          [
            "Cash",
            report.cash,
          ],

          [
            "Mobile Money",
            report.mobileMoney,
          ],

          [
            "Card",
            report.card,
          ],

          [
            "Bank",
            report.bank,
          ],

          [
            "Total",
            report.totalPayments,
          ],
        ];

        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet(
            paymentsData
          ),
          "Payments"
        );

        const expensesData = [
          [
            "Category",
            "Amount",
          ],
        ];

        Object.entries(
          expenseReport
            ?.categoryBreakdown ||
            {}
        ).forEach(
          ([
            category,
            amount,
          ]) => {
            expensesData.push([
              category,
              numberValue(
                amount
              ),
            ]);
          }
        );

        expensesData.push([
          "Total Expenses",
          report.totalExpenses,
        ]);

        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet(
            expensesData
          ),
          "Expenses"
        );

        const inventoryData = [
          [
            "Metric",
            "Value",
          ],

          [
            "Total Products",
            report.totalProducts,
          ],

          [
            "Inventory Value",
            report.inventoryValue,
          ],

          [
            "Low Stock",
            report.lowStock,
          ],

          [
            "Out of Stock",
            report.outOfStock,
          ],
        ];

        XLSX.utils.book_append_sheet(
          workbook,
          XLSX.utils.aoa_to_sheet(
            inventoryData
          ),
          "Inventory"
        );

        XLSX.writeFile(
          workbook,
          `MOVA_Report_${startDate}_${endDate}.xlsx`
        );
      } catch (err) {
        console.error(
          "Excel export error:",
          err
        );

        setError(
          "Failed to generate the Excel report."
        );
      }
    };

  /* =========================================================
     CSV EXPORT
  ========================================================= */

  const exportCSV = () => {
    try {
      setError("");

      const report =
        getReportSummary();

      const rows = [
        [
          "MOVA BUSINESS REPORT",
          "",
        ],

        [
          "Period",
          `${startDate} to ${endDate}`,
        ],

        [],

        [
          "Metric",
          "Value",
        ],

        [
          "Revenue",
          report.revenue,
        ],

        [
          "Cost of Goods",
          report.costOfGoods,
        ],

        [
          "Gross Profit",
          report.grossProfit,
        ],

        [
          "Expenses",
          report.expenses,
        ],

        [
          "Net Profit",
          report.netProfit,
        ],

        [
          "Total Sales",
          report.totalSales,
        ],

        [
          "Transactions",
          report.totalTransactions,
        ],

        [
          "Items Sold",
          report.totalItems,
        ],

        [
          "Discounts",
          report.totalDiscount,
        ],

        [
          "Cash Payments",
          report.cash,
        ],

        [
          "Mobile Money",
          report.mobileMoney,
        ],

        [
          "Card Payments",
          report.card,
        ],

        [
          "Bank Payments",
          report.bank,
        ],

        [
          "Total Payments",
          report.totalPayments,
        ],

        [
          "Total Products",
          report.totalProducts,
        ],

        [
          "Inventory Value",
          report.inventoryValue,
        ],

        [
          "Low Stock",
          report.lowStock,
        ],

        [
          "Out of Stock",
          report.outOfStock,
        ],
      ];

      const csvContent =
        rows
          .map(
            (row) =>
              row
                .map(
                  (cell) => {
                    const value =
                      String(
                        cell ?? ""
                      );

                    return `"${value.replace(
                      /"/g,
                      '""'
                    )}"`;
                  }
                )
                .join(",")
          )
          .join("\n");

      const blob =
        new Blob(
          [csvContent],
          {
            type:
              "text/csv;charset=utf-8;",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        `MOVA_Report_${startDate}_${endDate}.csv`;

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      URL.revokeObjectURL(
        url
      );
    } catch (err) {
      console.error(
        "CSV export error:",
        err
      );

      setError(
        "Failed to generate the CSV report."
      );
    }
  };

  /* =========================================================
     PRINT REPORT
  ========================================================= */

  const printReport = () => {
    const report =
      getReportSummary();

    const printWindow =
      window.open(
        "",
        "_blank",
        "width=1000,height=800"
      );

    if (!printWindow) {
      setError(
        "Please allow pop-ups in your browser to print the report."
      );

      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

        <head>

          <title>
            MOVA Business Report
          </title>

          <style>

            body {
              font-family:
                Arial,
                sans-serif;

              padding: 40px;

              color: #111827;
            }

            h1 {
              margin-bottom: 4px;
            }

            h2 {
              margin-top: 30px;

              border-bottom:
                1px solid #ddd;

              padding-bottom: 8px;
            }

            .subtitle {
              color: #6b7280;

              margin-bottom: 25px;
            }

            table {
              width: 100%;

              border-collapse:
                collapse;

              margin-top: 12px;
            }

            th,
            td {
              border:
                1px solid #ddd;

              padding: 10px;

              text-align: left;
            }

            th {
              background:
                #f3f4f6;
            }

            .profit {
              font-weight: bold;
            }

            .footer {
              margin-top: 40px;

              font-size: 12px;

              color: #6b7280;
            }

            @media print {

              body {
                padding: 20px;
              }

            }

          </style>

        </head>

        <body>

          <h1>MOVA</h1>

          <div>
            Business Management Platform
          </div>

          <div class="subtitle">

            Business Performance Report

            <br />

            ${formatReportDate(
              startDate
            )}

            -

            ${formatReportDate(
              endDate
            )}

          </div>

          <h2>
            Performance
          </h2>

          <table>

            <tr>
              <th>Metric</th>
              <th>Amount</th>
            </tr>

            <tr>
              <td>Revenue</td>
              <td>
                ${formatCurrency(
                  report.revenue
                )}
              </td>
            </tr>

            <tr>
              <td>Cost of Goods</td>
              <td>
                ${formatCurrency(
                  report.costOfGoods
                )}
              </td>
            </tr>

            <tr>
              <td>Gross Profit</td>
              <td>
                ${formatCurrency(
                  report.grossProfit
                )}
              </td>
            </tr>

            <tr>
              <td>Expenses</td>
              <td>
                ${formatCurrency(
                  report.expenses
                )}
              </td>
            </tr>

            <tr class="profit">
              <td>Net Profit</td>
              <td>
                ${formatCurrency(
                  report.netProfit
                )}
              </td>
            </tr>

          </table>

          <h2>
            Sales
          </h2>

          <table>

            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>

            <tr>
              <td>Total Sales</td>
              <td>
                ${formatCurrency(
                  report.totalSales
                )}
              </td>
            </tr>

            <tr>
              <td>Transactions</td>
              <td>
                ${formatNumber(
                  report.totalTransactions
                )}
              </td>
            </tr>

            <tr>
              <td>Items Sold</td>
              <td>
                ${formatNumber(
                  report.totalItems
                )}
              </td>
            </tr>

            <tr>
              <td>Discounts</td>
              <td>
                ${formatCurrency(
                  report.totalDiscount
                )}
              </td>
            </tr>

          </table>

          <h2>
            Payments
          </h2>

          <table>

            <tr>
              <th>
                Payment Method
              </th>

              <th>
                Amount
              </th>
            </tr>

            <tr>
              <td>Cash</td>

              <td>
                ${formatCurrency(
                  report.cash
                )}
              </td>
            </tr>

            <tr>
              <td>
                Mobile Money
              </td>

              <td>
                ${formatCurrency(
                  report.mobileMoney
                )}
              </td>
            </tr>

            <tr>
              <td>Card</td>

              <td>
                ${formatCurrency(
                  report.card
                )}
              </td>
            </tr>

            <tr>
              <td>Bank</td>

              <td>
                ${formatCurrency(
                  report.bank
                )}
              </td>
            </tr>

            <tr class="profit">

              <td>
                Total Payments
              </td>

              <td>
                ${formatCurrency(
                  report.totalPayments
                )}
              </td>

            </tr>

          </table>

          <h2>
            Inventory
          </h2>

          <table>

            <tr>
              <th>Metric</th>
              <th>Value</th>
            </tr>

            <tr>
              <td>
                Total Products
              </td>

              <td>
                ${formatNumber(
                  report.totalProducts
                )}
              </td>
            </tr>

            <tr>
              <td>
                Inventory Value
              </td>

              <td>
                ${formatCurrency(
                  report.inventoryValue
                )}
              </td>
            </tr>

            <tr>
              <td>
                Low Stock
              </td>

              <td>
                ${formatNumber(
                  report.lowStock
                )}
              </td>
            </tr>

            <tr>
              <td>
                Out of Stock
              </td>

              <td>
                ${formatNumber(
                  report.outOfStock
                )}
              </td>
            </tr>

          </table>

          <div class="footer">

            Generated by MOVA

            <br />

            Generated on:
            ${new Date().toLocaleString(
              "en-UG"
            )}

          </div>

        </body>

      </html>
    `);

    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="space-y-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>

          <h1 className="text-2xl font-bold text-slate-900">
            Reports
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Analyze, save, export and manage MOVA
            business reports.
          </p>

        </div>

        <button
          onClick={
            loadReports
          }
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >

          <RefreshCw
            size={17}
            className={
              loading
                ? "animate-spin"
                : ""
            }
          />

          Refresh

        </button>

      </div>

      {/* =====================================================
          DATE FILTER
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="grid gap-4 md:grid-cols-3">

          <div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              Start Date
            </label>

            <div className="relative">

              <Calendar
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="date"
                value={
                  startDate
                }
                onChange={(event) =>
                  setStartDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-slate-500"
              />

            </div>

          </div>

          <div>

            <label className="mb-2 block text-sm font-medium text-slate-700">
              End Date
            </label>

            <div className="relative">

              <Calendar
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="date"
                value={
                  endDate
                }
                onChange={(event) =>
                  setEndDate(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-slate-500"
              />

            </div>

          </div>

          <div className="flex items-end">

            <button
              onClick={
                loadReports
              }
              disabled={
                loading
              }
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Loading..."
                : "Apply Date Range"}
            </button>

          </div>

        </div>

        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">

          Showing reports from{" "}

          <span className="font-semibold text-slate-900">
            {formatReportDate(
              startDate
            )}
          </span>

          {" "}to{" "}

          <span className="font-semibold text-slate-900">
            {formatReportDate(
              endDate
            )}
          </span>

        </div>

      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (

        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

          {error}

        </div>

      )}

      {/* =====================================================
          EXPORT
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="mb-4">

          <h2 className="font-semibold text-slate-900">
            Export & Share
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Save this report locally or share the report
            with another person or application.
          </p>

        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">

          <button
            onClick={
              exportPDF
            }
            disabled={
              loading ||
              sharingReport
            }
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >

            <FileText
              size={18}
            />

            Download PDF

          </button>

          <button
            onClick={
              exportExcel
            }
            disabled={
              loading ||
              sharingReport
            }
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >

            <FileSpreadsheet
              size={18}
            />

            Export Excel

          </button>

          <button
            onClick={
              exportCSV
            }
            disabled={
              loading ||
              sharingReport
            }
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >

            <Download
              size={18}
            />

            Export CSV

          </button>

          <button
            onClick={
              printReport
            }
            disabled={
              loading ||
              sharingReport
            }
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >

            <Printer
              size={18}
            />

            Print Report

          </button>

          <button
            onClick={
              shareReport
            }
            disabled={
              loading ||
              sharingReport
            }
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >

            <Share2
              size={18}
            />

            {sharingReport
              ? "Preparing..."
              : "Share Report"}

          </button>

        </div>

        {shareMessage && (

          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">

            {shareMessage}

          </div>

        )}

      </div>

      {/* =====================================================
          SAVE REPORT
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="mb-4">

          <h2 className="font-semibold text-slate-900">
            Save Report
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Store a permanent snapshot of this report in
            MOVA.
          </p>

        </div>

        <div className="flex flex-col gap-3 md:flex-row">

          <input
            type="text"
            value={
              saveReportName
            }
            onChange={(event) =>
              setSaveReportName(
                event.target.value
              )
            }
            placeholder="e.g. September 2026 Business Report"
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
          />

          <button
            onClick={
              handleSaveReport
            }
            disabled={
              savingReport ||
              !saveReportName.trim()
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >

            <Save
              size={18}
            />

            {savingReport
              ? "Saving..."
              : "Save Report"}

          </button>

        </div>

      </div>

      {/* =====================================================
          PROFIT CARDS
      ===================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Revenue
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(
              profitReport?.revenue
            )}
          </p>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Cost of Goods
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(
              profitReport?.costOfGoods
            )}
          </p>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Gross Profit
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(
              profitReport?.grossProfit
            )}
          </p>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Net Profit
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(
              profitReport?.netProfit
            )}
          </p>

        </div>

      </div>

      {/* =====================================================
          SALES / PAYMENTS / EXPENSES
      ===================================================== */}

      <div className="grid gap-6 lg:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="font-semibold text-slate-900">
            Sales
          </h2>

          <p className="mt-4 text-3xl font-bold text-slate-900">
            {formatCurrency(
              salesReport?.totalSales
            )}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {formatNumber(
              salesReport?.totalTransactions
            )} transactions
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {formatNumber(
              salesReport?.totalItems
            )} items sold
          </p>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="font-semibold text-slate-900">
            Payments
          </h2>

          <p className="mt-4 text-3xl font-bold text-slate-900">
            {formatCurrency(
              paymentReport?.totalPayments
            )}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {formatNumber(
              paymentReport?.totalTransactions
            )} payment transactions
          </p>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h2 className="font-semibold text-slate-900">
            Expenses
          </h2>

          <p className="mt-4 text-3xl font-bold text-slate-900">
            {formatCurrency(
              expenseReport?.totalExpenses
            )}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {formatNumber(
              expenseReport?.totalTransactions
            )} expenses
          </p>

        </div>

      </div>

      {/* =====================================================
          PAYMENT METHODS
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5 flex items-center gap-3">

          <div className="rounded-xl bg-slate-100 p-3">

            <Wallet
              size={20}
              className="text-slate-700"
            />

          </div>

          <div>

            <h2 className="font-semibold text-slate-900">
              Payment Methods
            </h2>

            <p className="text-sm text-slate-500">
              Payment breakdown for the selected period.
            </p>

          </div>

        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          {[
            "CASH",
            "MOBILE_MONEY",
            "CARD",
            "BANK",
          ].map(
            (method) => (

              <div
                key={method}
                className="rounded-xl bg-slate-50 p-4"
              >

                <p className="text-sm font-medium text-slate-500">
                  {method.replace(
                    "_",
                    " "
                  )}
                </p>

                <p className="mt-2 text-xl font-bold text-slate-900">

                  {formatCurrency(
                    paymentReport
                      ?.breakdown?.[
                      method
                    ]
                  )}

                </p>

              </div>

            )
          )}

        </div>

      </div>

      {/* =====================================================
          INVENTORY
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="font-semibold text-slate-900">
              Inventory Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current inventory position.
            </p>

          </div>

          <div className="text-left sm:text-right">

            <p className="text-sm text-slate-500">
              Inventory Value
            </p>

            <p className="text-xl font-bold text-slate-900">

              {formatCurrency(
                inventoryReport
                  ?.inventoryValue
              )}

            </p>

          </div>

        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">

          <div className="rounded-xl bg-slate-50 p-4">

            <p className="text-sm text-slate-500">
              Total Products
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatNumber(
                inventoryReport
                  ?.totalProducts
              )}
            </p>

          </div>

          <div className="rounded-xl bg-slate-50 p-4">

            <p className="text-sm text-slate-500">
              Low Stock
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatNumber(
                inventoryReport
                  ?.lowStockCount
              )}
            </p>

          </div>

          <div className="rounded-xl bg-slate-50 p-4">

            <p className="text-sm text-slate-500">
              Out of Stock
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatNumber(
                inventoryReport
                  ?.outOfStockCount
              )}
            </p>

          </div>

        </div>

      </div>

      {/* =====================================================
          EXPENSE BREAKDOWN
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-slate-100 p-3">

            <BarChart3
              size={20}
              className="text-slate-700"
            />

          </div>

          <div>

            <h2 className="font-semibold text-slate-900">
              Expense Breakdown
            </h2>

            <p className="text-sm text-slate-500">
              Expenses by category.
            </p>

          </div>

        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">

          {Object.entries(
            expenseReport
              ?.categoryBreakdown ||
              {}
          ).map(
            ([
              category,
              amount,
            ]) => (

              <div
                key={category}
                className="rounded-xl bg-slate-50 p-4"
              >

                <p className="text-sm text-slate-500">
                  {category}
                </p>

                <p className="mt-2 text-lg font-bold text-slate-900">
                  {formatCurrency(
                    amount
                  )}
                </p>

              </div>

            )
          )}

          {Object.keys(
            expenseReport
              ?.categoryBreakdown ||
              {}
          ).length === 0 && (

            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">

              No expenses recorded
              for this period.

            </div>

          )}

        </div>

      </div>

      {/* =====================================================
          SAVED REPORTS
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="mb-5">

          <h2 className="font-semibold text-slate-900">
            Saved Reports
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Previously saved business reports.
          </p>

        </div>

        {savedReports.length ===
        0 ? (

          <div className="rounded-xl bg-slate-50 p-8 text-center">

            <FileText
              size={36}
              className="mx-auto text-slate-400"
            />

            <p className="mt-3 text-sm font-medium text-slate-700">
              No saved reports yet.
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Save your first report using the Save Report
              section above.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[800px]">

              <thead>

                <tr className="border-b border-slate-200 text-left">

                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">
                    Report
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">
                    Period
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">
                    Type
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">
                    Created
                  </th>

                  <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">
                    Actions
                  </th>

                </tr>

              </thead>

              <tbody>

                {savedReports.map(
                  (report) => (

                    <tr
                      key={
                        report._id
                      }
                      className="border-b border-slate-100"
                    >

                      <td className="px-4 py-4">

                        <p className="font-medium text-slate-900">
                          {report.name}
                        </p>

                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">

                        {formatSavedDate(
                          report.startDate
                        )}

                        {" - "}

                        {formatSavedDate(
                          report.endDate
                        )}

                      </td>

                      <td className="px-4 py-4">

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">

                          {
                            report.reportType
                          }

                        </span>

                      </td>

                      <td className="px-4 py-4 text-sm text-slate-600">

                        {formatSavedDate(
                          report.createdAt
                        )}

                      </td>

                      <td className="px-4 py-4">

                        <div className="flex items-center gap-2">

                          <button
                            onClick={() =>
                              handleViewSavedReport(
                                report._id
                              )
                            }
                            disabled={
                              savedReportLoading
                            }
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                            title="View report"
                          >

                            <Eye
                              size={
                                17
                              }
                            />

                          </button>

                          <button
                            onClick={() =>
                              handleDeleteSavedReport(
                                report._id
                              )
                            }
                            className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                            title="Delete report"
                          >

                            <Trash2
                              size={
                                17
                              }
                            />

                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* =====================================================
          SAVED REPORT MODAL
      ===================================================== */}

      {selectedSavedReport && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">

            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">

              <div>

                <h2 className="text-lg font-bold text-slate-900">
                  {
                    selectedSavedReport.name
                  }
                </h2>

                <p className="mt-1 text-sm text-slate-500">

                  {formatSavedDate(
                    selectedSavedReport.startDate
                  )}

                  {" - "}

                  {formatSavedDate(
                    selectedSavedReport.endDate
                  )}

                </p>

              </div>

              <button
                onClick={() =>
                  setSelectedSavedReport(
                    null
                  )
                }
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>

            </div>

            <div className="space-y-6 p-6">

              {/* PERFORMANCE */}

              <div>

                <h3 className="mb-3 font-semibold text-slate-900">
                  Performance
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Revenue
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">

                      {formatCurrency(
                        selectedSavedReport
                          .data
                          ?.revenue
                      )}

                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Cost of Goods
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">

                      {formatCurrency(
                        selectedSavedReport
                          .data
                          ?.costOfGoods
                      )}

                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Gross Profit
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">

                      {formatCurrency(
                        selectedSavedReport
                          .data
                          ?.grossProfit
                      )}

                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Net Profit
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-900">

                      {formatCurrency(
                        selectedSavedReport
                          .data
                          ?.netProfit
                      )}

                    </p>

                  </div>

                </div>

              </div>

              {/* SALES */}

              <div>

                <h3 className="mb-3 font-semibold text-slate-900">
                  Sales
                </h3>

                <div className="grid gap-3 sm:grid-cols-3">

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Total Sales
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900">

                      {formatCurrency(
                        selectedSavedReport
                          .data
                          ?.totalSales
                      )}

                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Transactions
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900">

                      {formatNumber(
                        selectedSavedReport
                          .data
                          ?.totalTransactions
                      )}

                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Items Sold
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900">

                      {formatNumber(
                        selectedSavedReport
                          .data
                          ?.totalItems
                      )}

                    </p>

                  </div>

                </div>

              </div>

              {/* PAYMENTS */}

              <div>

                <h3 className="mb-3 font-semibold text-slate-900">
                  Payments
                </h3>

                <div className="grid gap-3 sm:grid-cols-2">

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Cash
                    </p>

                    <p className="mt-1 font-bold text-slate-900">

                      {formatCurrency(
                        selectedSavedReport
                          .data
                          ?.paymentBreakdown
                          ?.CASH
                      )}

                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Mobile Money
                    </p>

                    <p className="mt-1 font-bold text-slate-900">

                      {formatCurrency(
                        selectedSavedReport
                          .data
                          ?.paymentBreakdown
                          ?.MOBILE_MONEY
                      )}

                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Card
                    </p>

                    <p className="mt-1 font-bold text-slate-900">

                      {formatCurrency(
                        selectedSavedReport
                          .data
                          ?.paymentBreakdown
                          ?.CARD
                      )}

                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Bank
                    </p>

                    <p className="mt-1 font-bold text-slate-900">

                      {formatCurrency(
                        selectedSavedReport
                          .data
                          ?.paymentBreakdown
                          ?.BANK
                      )}

                    </p>

                  </div>

                </div>

              </div>

              {/* INVENTORY */}

              <div>

                <h3 className="mb-3 font-semibold text-slate-900">
                  Inventory Snapshot
                </h3>

                <div className="grid gap-3 sm:grid-cols-3">

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Products
                    </p>

                    <p className="mt-1 font-bold text-slate-900">

                      {formatNumber(
                        selectedSavedReport
                          .data
                          ?.totalProducts
                      )}

                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Low Stock
                    </p>

                    <p className="mt-1 font-bold text-slate-900">

                      {formatNumber(
                        selectedSavedReport
                          .data
                          ?.lowStock
                      )}

                    </p>

                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">

                    <p className="text-sm text-slate-500">
                      Out of Stock
                    </p>

                    <p className="mt-1 font-bold text-slate-900">

                      {formatNumber(
                        selectedSavedReport
                          .data
                          ?.outOfStock
                      )}

                    </p>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>
  );
};

export default Reports;