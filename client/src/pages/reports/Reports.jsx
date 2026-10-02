import { useEffect, useState } from "react";

import {
  BarChart3,
  Calendar,
  DollarSign,
  Package,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";

import api from "../../api";

/* =========================================================
   HELPERS
========================================================= */

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
};

/* =========================================================
   REPORTS
========================================================= */

const Reports = () => {
  const today = getLocalDateString();

  const firstDayDate = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const firstDay = getLocalDateString(firstDayDate);

  /* =======================================================
     DATE STATE
  ======================================================= */

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(today);

  /* =======================================================
     LOADING / ERROR
  ======================================================= */

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /* =======================================================
     REPORT STATE
  ======================================================= */

  const [salesReport, setSalesReport] = useState(null);
  const [paymentReport, setPaymentReport] = useState(null);
  const [expenseReport, setExpenseReport] = useState(null);
  const [profitReport, setProfitReport] = useState(null);
  const [inventoryReport, setInventoryReport] = useState(null);

  /* =======================================================
     LOAD REPORTS
  ======================================================= */

  const loadReports = async () => {
    if (!startDate || !endDate) {
      setError("Please select both a start date and an end date.");
      return;
    }

    if (startDate > endDate) {
      setError("Start date cannot be after the end date.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const params = {
        startDate,
        endDate,
      };

      console.log("Loading reports for:", params);

      const [
        salesResponse,
        paymentResponse,
        expenseResponse,
        profitResponse,
        inventoryResponse,
      ] = await Promise.all([
        api.get("/reports/sales", {
          params,
        }),

        api.get("/reports/payments", {
          params,
        }),

        api.get("/reports/expenses", {
          params,
        }),

        api.get("/reports/profit", {
          params,
        }),

        // Inventory is a current snapshot.
        api.get("/reports/inventory"),
      ]);

      console.log("Sales report:", salesResponse.data);
      console.log("Payment report:", paymentResponse.data);
      console.log("Expense report:", expenseResponse.data);
      console.log("Profit report:", profitResponse.data);
      console.log("Inventory report:", inventoryResponse.data);

      /*
       * IMPORTANT:
       *
       * The backend returns:
       *
       * response.data.report.totalSales
       *
       * NOT:
       *
       * response.data.report.summary.totalSales
       */

      setSalesReport(
        salesResponse.data?.report || null
      );

      setPaymentReport(
        paymentResponse.data?.report || null
      );

      setExpenseReport(
        expenseResponse.data?.report || null
      );

      setProfitReport(
        profitResponse.data?.report || null
      );

      setInventoryReport(
        inventoryResponse.data?.report || null
      );
    } catch (err) {
      console.error("Reports error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load reports."
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadReports();
  }, []);

  /* =======================================================
     RETURN UI
  ======================================================= */

  return (
    <div className="space-y-6">

      {/* =========================================
          HEADER
      ========================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Reports
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Analyze MOVA business performance.
          </p>
        </div>

        <button
          onClick={loadReports}
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

      {/* =========================================
          DATE FILTERS
      ========================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="grid gap-4 md:grid-cols-3">

          {/* START DATE */}

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
                value={startDate}
                onChange={(event) =>
                  setStartDate(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-slate-500"
              />

            </div>
          </div>

          {/* END DATE */}

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
                value={endDate}
                onChange={(event) =>
                  setEndDate(event.target.value)
                }
                className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-slate-500"
              />

            </div>
          </div>

          {/* APPLY */}

          <div className="flex items-end">

            <button
              onClick={loadReports}
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Loading..."
                : "Apply Date Range"}
            </button>

          </div>

        </div>

        {/* SELECTED RANGE */}

        <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Showing reports from{" "}
          <span className="font-semibold text-slate-900">
            {startDate}
          </span>{" "}
          to{" "}
          <span className="font-semibold text-slate-900">
            {endDate}
          </span>
        </div>

      </div>

      {/* =========================================
          ERROR
      ========================================= */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =========================================
          PROFIT SUMMARY
      ========================================= */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* REVENUE */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-slate-500">
                Revenue
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatCurrency(
                  profitReport?.revenue
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3">
              <DollarSign
                size={22}
                className="text-slate-700"
              />
            </div>

          </div>

        </div>

        {/* COST OF GOODS */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-slate-500">
                Cost of Goods
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatCurrency(
                  profitReport?.costOfGoods
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3">
              <Package
                size={22}
                className="text-slate-700"
              />
            </div>

          </div>

        </div>

        {/* GROSS PROFIT */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-slate-500">
                Gross Profit
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatCurrency(
                  profitReport?.grossProfit
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3">
              <TrendingUp
                size={22}
                className="text-slate-700"
              />
            </div>

          </div>

        </div>

        {/* NET PROFIT */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>
              <p className="text-sm text-slate-500">
                Net Profit
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatCurrency(
                  profitReport?.netProfit
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 p-3">
              <BarChart3
                size={22}
                className="text-slate-700"
              />
            </div>

          </div>

        </div>

      </div>

      {/* =========================================
          SALES / PAYMENTS / EXPENSES
      ========================================= */}

      <div className="grid gap-6 lg:grid-cols-3">

        {/* SALES */}

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
            {salesReport?.totalTransactions || 0}{" "}
            transactions
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {salesReport?.totalItems || 0} items sold
          </p>

        </div>

        {/* PAYMENTS */}

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
            {paymentReport?.totalTransactions || 0}{" "}
            payment transactions
          </p>

        </div>

        {/* EXPENSES */}

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
            {expenseReport?.totalTransactions || 0}{" "}
            expenses
          </p>

        </div>

      </div>

      {/* =========================================
          PAYMENT BREAKDOWN
      ========================================= */}

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
          ].map((method) => (

            <div
              key={method}
              className="rounded-xl bg-slate-50 p-4"
            >

              <p className="text-sm font-medium text-slate-500">
                {method.replace("_", " ")}
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatCurrency(
                  paymentReport?.breakdown?.[method]
                )}
              </p>

            </div>

          ))}

        </div>

      </div>

      {/* =========================================
          INVENTORY
      ========================================= */}

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
                inventoryReport?.inventoryValue
              )}
            </p>

          </div>

        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">

          {/* TOTAL PRODUCTS */}

          <div className="rounded-xl bg-slate-50 p-4">

            <p className="text-sm text-slate-500">
              Total Products
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {inventoryReport?.totalProducts || 0}
            </p>

          </div>

          {/* LOW STOCK */}

          <div className="rounded-xl bg-slate-50 p-4">

            <p className="text-sm text-slate-500">
              Low Stock
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {inventoryReport?.lowStockCount || 0}
            </p>

          </div>

          {/* OUT OF STOCK */}

          <div className="rounded-xl bg-slate-50 p-4">

            <p className="text-sm text-slate-500">
              Out of Stock
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {inventoryReport?.outOfStockCount || 0}
            </p>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Reports;