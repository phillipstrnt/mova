
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Clock3,
  DollarSign,
  Download,
  Package,
  RefreshCw,
  ShoppingCart,
  Smartphone,
  Users,
  Wallet,
  X,
} from "lucide-react";

import api from "../../services/api";

import { useAuth } from "../../context/AuthContext";
import { useBusiness } from "../../context/BusinessContext";

import {
  installPWA,
  isPWAInstalled,
  subscribeToPWAInstallState,
} from "../../pwa.js";

const Dashboard = () => {
  const { user } = useAuth();
  const isCashier = String(user?.role || "").toUpperCase() === "CASHIER";

  const {
    business,
    activeBranch,
    activeBranchId,
  } = useBusiness();

  const [dashboardData, setDashboardData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const dashboardRequestRef = useRef(0);

  /* =========================================================
     PWA STATE
  ========================================================= */

  const [installed, setInstalled] =
    useState(() => isPWAInstalled());

  const [installing, setInstalling] =
    useState(false);

  const [showInstallHelp, setShowInstallHelp] =
    useState(false);

  /* =========================================================
     PWA INSTALL STATE
  ========================================================= */

  useEffect(() => {
    const unsubscribe =
      subscribeToPWAInstallState(
        ({
          isInstalled,
        }) => {
          setInstalled(isInstalled);

          if (isInstalled) {
            setShowInstallHelp(false);
          }
        }
      );

    return unsubscribe;
  }, []);

  /* =========================================================
     PWA INSTALLED EVENT
  ========================================================= */

  useEffect(() => {
    const handleInstalled = () => {
      setInstalled(true);
      setInstalling(false);
      setShowInstallHelp(false);
    };

    window.addEventListener(
      "mova:pwa-installed",
      handleInstalled
    );

    return () => {
      window.removeEventListener(
        "mova:pwa-installed",
        handleInstalled
      );
    };
  }, []);

  /* =========================================================
     INSTALL MOVA
  ========================================================= */

  const handleInstallMova = async () => {
    if (installing) {
      return;
    }

    /*
     * If MOVA is already installed, don't attempt
     * another installation.
     */
    if (isPWAInstalled()) {
      setInstalled(true);
      return;
    }

    setInstalling(true);
    setShowInstallHelp(false);

    try {
      const result = await installPWA();

      console.log(
        "MOVA installation result:",
        result
      );

      /*
       * Native browser installation succeeded.
       */
      if (result?.success) {
        setInstalled(true);
        setShowInstallHelp(false);
        return;
      }

      /*
       * Some browsers do not provide an automatic prompt. Show
       * manual instructions only in that case. A dismissed native
       * prompt is not an installation failure.
       */
      if (result?.outcome === "manual") {
        setShowInstallHelp(true);
      }
    } catch (installError) {
      console.error(
        "MOVA PWA installation failed:",
        installError
      );

      setShowInstallHelp(true);
    } finally {
      setInstalling(false);
    }
  };

  /* =========================================================
     DASHBOARD REQUEST
  ========================================================= */

  const loadDashboard = useCallback(
    async ({
      silent = false,
    } = {}) => {
      const requestId = ++dashboardRequestRef.current;

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const params = {
          _t: Date.now(),
        };

        if (activeBranchId) {
          params.branchId =
            activeBranchId;
        }

        const response =
          await api.get(
            "/dashboard/overview",
            {
              params,
            }
          );

        const data =
          response?.data?.data ??
          response?.data ??
          null;

        if (requestId === dashboardRequestRef.current) {
          setDashboardData(data);
          setLastUpdated(new Date());
        }
      } catch (requestError) {
        console.error(
          "MOVA Dashboard Error:",
          requestError
        );

        const message =
          requestError?.response?.data
            ?.message ||
          requestError?.message ||
          "Unable to load dashboard data.";

        if (requestId === dashboardRequestRef.current) {
          setError(message);
        }
      } finally {
        if (requestId === dashboardRequestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [activeBranchId]
  );

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* =========================================================
     AUTOMATIC REFRESH
  ========================================================= */

  useEffect(() => {
    const interval =
      setInterval(() => {
        loadDashboard({
          silent: true,
        });
      }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [loadDashboard]);

  /* =========================================================
     REFRESH ON FOCUS / VISIBILITY
  ========================================================= */

  useEffect(() => {
    const handleFocus = () => {
      loadDashboard({
        silent: true,
      });
    };

    const handleVisibility = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        loadDashboard({
          silent: true,
        });
      }
    };

    window.addEventListener(
      "focus",
      handleFocus
    );

    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, [loadDashboard]);

  /* =========================================================
     REFRESH ON MOVA DATA EVENTS
  ========================================================= */

  useEffect(() => {
    const events = [
      "mova:data-updated",
      "mova:sale-created",
      "mova:sale-updated",
      "mova:inventory-updated",
      "mova:customer-created",
      "mova:expense-created",
      "mova:payment-created",
      "mova:return-created",
      "mova:data-changed",
      "mova:branch-changed",
    ];

    const handleDataChange = () => {
      loadDashboard({
        silent: true,
      });
    };

    events.forEach(
      (eventName) => {
        window.addEventListener(
          eventName,
          handleDataChange
        );
      }
    );

    return () => {
      events.forEach(
        (eventName) => {
          window.removeEventListener(
            eventName,
            handleDataChange
          );
        }
      );
    };
  }, [loadDashboard]);

  /* =========================================================
     FORMATTERS
  ========================================================= */

  const formatCurrency =
    useCallback(
      (value) => {
        const amount =
          Number(value) || 0;

        return new Intl.NumberFormat(
          "en-UG",
          {
            style: "currency",
            currency:
              business?.currency ||
              "UGX",
            maximumFractionDigits: 0,
          }
        ).format(amount);
      },
      [business?.currency]
    );

  const formatNumber =
    useCallback(
      (value) => {
        return new Intl.NumberFormat(
          "en-UG"
        ).format(
          Number(value) || 0
        );
      },
      []
    );

  /* =========================================================
     SAFE DATA
  ========================================================= */

  const safeData =
    dashboardData || {};

  const stats = safeData.stats || {};
  const summary = safeData.summary || {};

  const todaySales =
    Number(
      stats.todayRevenue ??
        stats.todaySales ??
        safeData.todayRevenue ??
        safeData.todaySales ??
        0
    );

  const monthlyRevenue =
    Number(
      stats.monthRevenue ??
        stats.monthSales ??
        summary.revenue ??
        safeData.monthRevenue ??
        safeData.monthlyRevenue ??
        0
    );

  const monthlyExpenses =
    Number(
      stats.totalExpenses ??
        summary.expenses ??
        safeData.totalExpenses ??
        safeData.monthlyExpenses ??
        0
    );

  const totalCustomers =
    Number(
      stats.totalCustomers ??
        summary.customers ??
        safeData.totalCustomers ??
        safeData.customers ??
        0
    );

  const lowStockCount =
    Number(
      summary.lowStock ??
        stats.lowStock ??
      safeData.lowStock ??
        safeData.lowStockCount ??
        0
    );

  const grossProfit =
    Number(
      stats.grossProfit ??
        summary.grossProfit ??
        safeData.grossProfit ??
        safeData.monthGrossProfit ??
        monthlyRevenue -
          monthlyExpenses
    );

  /* =========================================================
     CHART DATA
  ========================================================= */

  const salesChart =
    Array.isArray(
      safeData.salesChart
    )
      ? safeData.salesChart
      : Array.isArray(
          safeData.salesTrend
        )
      ? safeData.salesTrend
      : [];

  const rawPaymentBreakdown =
    safeData.paymentBreakdown ??
    stats.paymentBreakdown ??
    {};

  const paymentBreakdown = Array.isArray(rawPaymentBreakdown)
    ? rawPaymentBreakdown
    : Object.entries(rawPaymentBreakdown).map(
        ([method, amount]) => ({ method, amount })
      );

  const recentSales =
    Array.isArray(
      safeData.recentSales
    )
      ? safeData.recentSales
      : [];

  const lowStockProducts =
    Array.isArray(
      safeData.lowStockProducts
    )
      ? safeData.lowStockProducts
      : [];

  const inventoryForecasts = Array.isArray(safeData.inventoryForecasts)
    ? safeData.inventoryForecasts
    : [];
  const expiryAlerts = Array.isArray(safeData.expiryAlerts) ? safeData.expiryAlerts : [];

  /* =========================================================
     PROFIT MARGIN
  ========================================================= */

  const profitMargin =
    monthlyRevenue > 0
      ? (
          (grossProfit /
            monthlyRevenue) *
          100
        ).toFixed(1)
      : "0.0";

  /* =========================================================
     TOTAL PAYMENTS
  ========================================================= */

  const totalPayments =
    useMemo(() => {
      return paymentBreakdown.reduce(
        (
          total,
          item
        ) => {
          return (
            total +
            Number(
              item?.amount ??
                item?.total ??
                0
            )
          );
        },
        0
      );
    }, [paymentBreakdown]);

  /* =========================================================
     GREETING
  ========================================================= */

  const greeting =
    useMemo(() => {
      const hour =
        new Date().getHours();

      if (hour < 12) {
        return "Good morning";
      }

      if (hour < 18) {
        return "Good afternoon";
      }

      return "Good evening";
    }, []);

  /* =========================================================
     LOADING STATE
  ========================================================= */

  if (
    loading &&
    !dashboardData
  ) {
    return (
      <div className="space-y-6">

        <div className="flex items-center justify-between">

          <div>
            <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-200" />

            <div className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-100" />
          </div>

          <div className="h-10 w-32 animate-pulse rounded-xl bg-slate-200" />

        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {Array.from({
            length: 4,
          }).map(
            (_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl bg-slate-100"
              />
            )
          )}

        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          <div className="h-80 animate-pulse rounded-2xl bg-slate-100 xl:col-span-2" />

          <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />

        </div>

      </div>
    );
  }

  /* =========================================================
     MAIN DASHBOARD
  ========================================================= */

  return (
    <div className="space-y-6 pb-8">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

        <div>

          <div className="flex flex-wrap items-center gap-2">

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {greeting},{" "}
              {user?.name ||
                user?.firstName ||
                "there"}
              !
            </h1>

            {activeBranch?.name && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {activeBranch.name}
              </span>
            )}

          </div>

          <p className="mt-1 text-sm text-slate-500">
            Here's what's happening with your business today.
          </p>

          {lastUpdated && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">

              <Clock3 size={13} />

              Updated{" "}
              {lastUpdated.toLocaleTimeString(
                "en-UG",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                }
              )}

            </div>
          )}

        </div>

        {/* ===================================================
            HEADER ACTIONS
        =================================================== */}

        <div className="flex flex-wrap items-center gap-2">

          {!installed ? (

            /*
             * IMPORTANT:
             *
             * There is NO:
             *
             * disabled={!canInstall}
             *
             * here.
             *
             * Therefore the button is ALWAYS ACTIVE.
             */

            <button
              type="button"
              onClick={
                handleInstallMova
              }
              disabled={installing}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
            >

              {installing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                  Installing...
                </>
              ) : (
                <>
                  <Download size={17} />

                  Install MOVA App
                </>
              )}

            </button>

          ) : (

            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700">

              <CheckCircle2
                size={17}
              />

              MOVA Installed

            </div>

          )}

          <button
            type="button"
            onClick={() =>
              loadDashboard({
                silent: true,
              })
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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

      </div>

      <section className="relative isolate flex min-h-36 items-center overflow-hidden rounded-3xl bg-slate-950 px-6 py-6 shadow-sm sm:px-8" aria-label="MOVA store operations">
        <img src="/images/market-produce.jpg" alt="Fresh produce in a neighborhood market" className="absolute inset-y-0 right-0 h-full w-full object-cover object-center sm:w-3/5" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/10 sm:to-slate-950/20" />
        <div className="relative max-w-xl text-white"><p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-blue-200">Your store, in focus</p><h2 className="mt-2 text-lg font-black tracking-tight sm:text-xl">Make every shelf and every sale count.</h2><p className="mt-1 max-w-md text-xs leading-5 text-slate-200/85">Your live figures below bring together the activity happening across your business.</p></div>
      </section>

      {/* =====================================================
          INSTALLATION HELP
      ===================================================== */}

      {showInstallHelp &&
        !installed && (
          <div className="overflow-hidden rounded-2xl border border-blue-200 bg-blue-50">

            <div className="flex items-start justify-between gap-4 p-5">

              <div className="flex gap-3">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Smartphone size={21} />
                </div>

                <div>

                  <h3 className="font-bold text-blue-900">
                    Install MOVA on this device
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-blue-800">
                    Your browser did not provide the automatic
                    installation prompt. You can still install
                    MOVA manually using your browser's installation
                    option.
                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={() =>
                  setShowInstallHelp(
                    false
                  )
                }
                className="rounded-lg p-1.5 text-blue-500 transition hover:bg-blue-100 hover:text-blue-800"
                aria-label="Close installation instructions"
              >
                <X size={18} />
              </button>

            </div>

            <div className="grid gap-3 border-t border-blue-200 bg-white/60 p-5 md:grid-cols-3">

              <div className="rounded-xl border border-blue-100 bg-white p-4">

                <p className="text-sm font-bold text-slate-900">
                  Chrome / Edge
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Look for the install icon on the right side
                  of the address bar. You can also open the
                  browser menu and choose
                  <strong> Install MOVA</strong> or
                  <strong> Install app</strong>.
                </p>

              </div>

              <div className="rounded-xl border border-blue-100 bg-white p-4">

                <p className="text-sm font-bold text-slate-900">
                  Android
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Open the browser menu and choose
                  <strong> Install app</strong> or
                  <strong> Add to Home screen</strong>.
                </p>

              </div>

              <div className="rounded-xl border border-blue-100 bg-white p-4">

                <p className="text-sm font-bold text-slate-900">
                  iPhone / iPad
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  In Safari, tap
                  <strong> Share</strong>, then choose
                  <strong> Add to Home Screen</strong>.
                </p>

              </div>

            </div>

          </div>
        )}

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">

          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0 text-red-600"
          />

          <div className="flex-1">

            <p className="font-semibold text-red-800">
              Dashboard data could not be loaded
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

          </div>

          <button
            type="button"
            onClick={() =>
              loadDashboard()
            }
            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
          >
            Try Again
          </button>

        </div>
      )}

      {/* =====================================================
          KPI CARDS
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-medium text-slate-500">
                Today's Sales
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(
                  todaySales
                )}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign
                size={21}
              />
            </div>

          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">

            <ArrowUpRight
              size={14}
              className="text-emerald-600"
            />

            Current business day

          </div>

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-medium text-slate-500">
                Monthly Revenue
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(
                  monthlyRevenue
                )}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <BarChart3
                size={21}
              />
            </div>

          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">

            <ArrowUpRight
              size={14}
              className="text-blue-600"
            />

            This month

          </div>

        </div>

        {!isCashier && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-medium text-slate-500">
                Monthly Expenses
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(
                  monthlyExpenses
                )}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Wallet
                size={21}
              />
            </div>

          </div>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">

            <ArrowDownRight
              size={14}
              className="text-orange-600"
            />

            Recorded expenses

          </div>

        </div>}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-start justify-between">

            <div>

              <p className="text-sm font-medium text-slate-500">
                Customers
              </p>

              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {formatNumber(
                  totalCustomers
                )}
              </p>

            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Users
                size={21}
              />
            </div>

          </div>

          <div className="mt-4 text-xs text-slate-500">
            Customers registered
          </div>

        </div>

      </div>

      {/* =====================================================
          SECONDARY KPI
      ===================================================== */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

        {!isCashier && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-medium text-slate-500">
                Gross Profit
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatCurrency(
                  grossProfit
                )}
              </p>

            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2
                size={20}
              />
            </div>

          </div>

          <p className="mt-3 text-xs text-slate-500">
            Profit margin:{" "}
            <span className="font-semibold text-slate-700">
              {profitMargin}%
            </span>
          </p>

        </div>}

        {!isCashier && <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-medium text-slate-500">
                Low Stock
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatNumber(
                  lowStockCount
                )}
              </p>

            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Boxes size={20} />
            </div>

          </div>

          <p className="mt-3 text-xs text-slate-500">
            Products requiring attention
          </p>

        </div>}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <p className="text-sm font-medium text-slate-500">
                Payments
              </p>

              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatCurrency(
                  totalPayments
                )}
              </p>

            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Wallet size={20} />
            </div>

          </div>

          <p className="mt-3 text-xs text-slate-500">
            Recorded payment activity
          </p>

        </div>

      </div>

      {/* =====================================================
          SALES + PAYMENTS
      ===================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="font-bold text-slate-900">
                Sales Overview
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Recent sales performance
              </p>

            </div>

            <BarChart3
              size={20}
              className="text-slate-400"
            />

          </div>

          {salesChart.length ===
          0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              No sales chart data available yet.
            </div>
          ) : (
            <div className="mt-6 flex h-64 items-end gap-3 overflow-x-auto">

              {salesChart.map(
                (
                  item,
                  index
                ) => {
                  const amount =
                    Number(
                      item?.amount ??
                        item?.revenue ??
                        item?.total ??
                        0
                    );

                  const maxAmount =
                    Math.max(
                      ...salesChart.map(
                        (
                          chartItem
                        ) =>
                          Number(
                            chartItem?.amount ??
                              chartItem?.revenue ??
                              chartItem?.total ??
                              0
                          )
                      ),
                      1
                    );

                  const height =
                    Math.max(
                      8,
                      (amount /
                        maxAmount) *
                        100
                    );

                  return (
                    <div
                      key={
                        item?._id ||
                        item?.date ||
                        index
                      }
                      className="flex min-w-[44px] flex-1 flex-col items-center justify-end gap-2"
                    >

                      <div className="group relative flex h-full w-full items-end justify-center">

                        <div
                          className="w-full max-w-12 rounded-t-lg bg-slate-900 transition hover:bg-slate-700"
                          style={{
                            height: `${height}%`,
                          }}
                        />

                        <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white group-hover:block">
                          {formatCurrency(
                            amount
                          )}
                        </div>

                      </div>

                      <span className="max-w-16 truncate text-[10px] text-slate-400">
                        {item?.label ||
                          item?.date ||
                          item?.day ||
                          ""}
                      </span>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex items-center justify-between">

            <div>

              <h2 className="font-bold text-slate-900">
                Payment Breakdown
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Payment methods
              </p>

            </div>

            <Wallet
              size={20}
              className="text-slate-400"
            />

          </div>

          {paymentBreakdown.length ===
          0 ? (
            <div className="flex h-64 items-center justify-center text-center text-sm text-slate-400">
              No payment data available yet.
            </div>
          ) : (
            <div className="mt-6 space-y-4">

              {paymentBreakdown.map(
                (
                  item,
                  index
                ) => {
                  const amount =
                    Number(
                      item?.amount ??
                        item?.total ??
                        0
                    );

                  const percentage =
                    totalPayments > 0
                      ? Math.round(
                          (amount /
                            totalPayments) *
                            100
                        )
                      : 0;

                  return (
                    <div
                      key={
                        item?.method ||
                        item?.paymentMethod ||
                        index
                      }
                    >

                      <div className="mb-2 flex items-center justify-between text-xs">

                        <span className="font-medium text-slate-600">
                          {item?.method ||
                            item?.paymentMethod ||
                            "Other"}
                        </span>

                        <span className="font-semibold text-slate-900">
                          {formatCurrency(
                            amount
                          )}
                        </span>

                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                        <div
                          className="h-full rounded-full bg-slate-900"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />

                      </div>

                      <div className="mt-1 text-right text-[10px] text-slate-400">
                        {percentage}%
                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

      </div>

      {/* =====================================================
          RECENT SALES + LOW STOCK
      ===================================================== */}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

            <div>

              <h2 className="font-bold text-slate-900">
                Recent Sales
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Latest transactions
              </p>

            </div>

            <ShoppingCart
              size={20}
              className="text-slate-400"
            />

          </div>

          {recentSales.length ===
          0 ? (
            <div className="flex min-h-56 items-center justify-center px-5 text-center text-sm text-slate-400">
              No recent sales available.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">

              {recentSales
                .slice(0, 6)
                .map(
                  (
                    sale,
                    index
                  ) => {
                    const total =
                      Number(
                        sale?.total ??
                          sale?.grandTotal ??
                          sale?.amount ??
                          0
                      );

                    return (
                      <div
                        key={
                          sale?._id ||
                          sale?.id ||
                          index
                        }
                        className="flex items-center justify-between gap-4 px-5 py-4"
                      >

                        <div className="min-w-0">

                          <p className="truncate text-sm font-semibold text-slate-800">
                            {sale?.invoiceNumber ||
                              sale?.receiptNumber ||
                              sale?.reference ||
                              `Sale #${
                                index +
                                1
                              }`}
                          </p>

                          <p className="mt-1 truncate text-xs text-slate-400">
                            {sale?.customer
                              ?.name ||
                              sale?.customerName ||
                              sale?.paymentMethod ||
                              "Walk-in customer"}
                          </p>

                        </div>

                        <div className="shrink-0 text-right">

                          <p className="text-sm font-bold text-slate-900">
                            {formatCurrency(
                              total
                            )}
                          </p>

                          <p className="mt-1 text-[10px] text-slate-400">
                            {sale?.createdAt
                              ? new Date(
                                  sale.createdAt
                                ).toLocaleTimeString(
                                  "en-UG",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                              : ""}
                          </p>

                        </div>

                      </div>
                    );
                  }
                )}

            </div>
          )}

        </div>

        {!isCashier && <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">

            <div>

              <h2 className="font-bold text-slate-900">
                Low Stock
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Products requiring attention
              </p>

            </div>

            <Package
              size={20}
              className="text-slate-400"
            />

          </div>

          {lowStockProducts.length ===
          0 ? (
            <div className="flex min-h-56 items-center justify-center px-5 text-center">

              <div>

                <CheckCircle2
                  size={28}
                  className="mx-auto text-emerald-500"
                />

                <p className="mt-2 text-sm font-semibold text-slate-700">
                  Stock levels look good
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  No low-stock products detected.
                </p>

              </div>

            </div>
          ) : (
            <div className="divide-y divide-slate-100">

              {lowStockProducts
                .slice(0, 6)
                .map(
                  (
                    product,
                    index
                  ) => {
                    const stock =
                      Number(
                        product?.stockQuantity ??
                        product?.stock ??
                          product?.quantity ??
                          product?.currentStock ??
                          0
                      );

                    const minimum =
                      Number(
                        product?.minStock ??
                          product?.minimumStock ??
                          0
                      );

                    return (
                      <div
                        key={
                          product?._id ||
                          product?.id ||
                          index
                        }
                        className="flex items-center justify-between gap-4 px-5 py-4"
                      >

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                            <Package
                              size={17}
                            />
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-sm font-semibold text-slate-800">
                              {product?.name ||
                                "Unnamed product"}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Minimum:{" "}
                              {formatNumber(
                                minimum
                              )}
                            </p>

                          </div>

                        </div>

                        <div className="shrink-0 text-right">

                          <p className="text-sm font-bold text-red-600">
                            {formatNumber(
                              stock
                            )}
                          </p>

                          <p className="text-[10px] text-slate-400">
                            remaining
                          </p>

                        </div>

                      </div>
                    );
                  }
                )}

            </div>
          )}

        </div>}

      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Inventory outlook</h2>
            <p className="mt-1 text-xs text-slate-500">Estimated days of stock from the branch’s last 30 days of sales.</p>
          </div>
          <Package size={20} className="text-slate-400" />
        </div>
        {inventoryForecasts.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">More sales history is needed before inventory run-out estimates are available.</p>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {inventoryForecasts.slice(0, 6).map((product) => (
              <div key={product._id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatNumber(product.stockQuantity)} in stock · {Number(product.averageDailySales || 0).toFixed(1)} sold/day</p>
                </div>
                <div className={`shrink-0 rounded-lg px-2.5 py-1.5 text-right ${Number(product.estimatedDaysRemaining) <= 7 ? "bg-red-100 text-red-700" : Number(product.estimatedDaysRemaining) <= 14 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                  <p className="text-sm font-bold">{Number(product.estimatedDaysRemaining).toFixed(1)}</p>
                  <p className="text-[10px]">days left</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Expiry watch</h2>
            <p className="mt-1 text-xs text-slate-600">Track active batches expiring in the next 60 days or already expired.</p>
          </div>
          <AlertCircle size={20} className="text-amber-700" />
        </div>
        {expiryAlerts.length === 0 ? (
          <p className="px-5 py-5 text-sm text-slate-500">No batches are nearing expiry.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {expiryAlerts.slice(0, 6).map((batch) => (
              <div key={batch._id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{batch.productId?.name || "Product"} {batch.batchCode ? `· ${batch.batchCode}` : ""}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatNumber(batch.remainingQuantity)} units · expires {new Date(batch.expiryDate).toLocaleDateString("en-UG")} {Number(batch.daysUntilExpiry) >= 0 && `· suggested ${batch.suggestedDiscountPercent}% clearance`}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${Number(batch.daysUntilExpiry) < 0 ? "bg-red-100 text-red-700" : Number(batch.daysUntilExpiry) <= 7 ? "bg-orange-100 text-orange-800" : "bg-amber-100 text-amber-800"}`}>
                  {Number(batch.daysUntilExpiry) < 0 ? `${Math.abs(Number(batch.daysUntilExpiry))} days expired` : `${batch.daysUntilExpiry} days`}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div className="flex items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
              <BarChart3
                size={19}
              />
            </div>

            <div>

              <p className="text-sm font-bold text-slate-800">
                Business Command Center
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                MOVA automatically refreshes dashboard
                activity so your business information stays
                current.
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2 text-xs font-semibold">

            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <span className="text-slate-600">
              Dashboard monitoring active
            </span>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;
