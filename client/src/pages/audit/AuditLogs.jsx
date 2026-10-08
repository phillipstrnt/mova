
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Info,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  X,
} from "lucide-react";

import api from "../../services/api";

const ENTITY_OPTIONS = [
  "ALL",
  "USER",
  "SALE",
  "RETURN",
  "PRODUCT",
  "INVENTORY",
  "EXPENSE",
  "PURCHASE",
  "BUSINESS",
  "BRANCH",
  "PAYMENT",
  "SYSTEM",
];

const SEVERITY_OPTIONS = [
  "ALL",
  "INFO",
  "WARNING",
  "CRITICAL",
];

const PAGE_SIZE = 20;

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  try {
    return new Intl.DateTimeFormat("en-UG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "—";
  }
};

const formatRelativeTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const seconds = Math.floor(
    (Date.now() - date.getTime()) / 1000
  );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 30) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return formatDateTime(value);
};

const getSeverityClasses = (severity) => {
  switch (String(severity || "").toUpperCase()) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 border-red-200";

    case "WARNING":
      return "bg-amber-100 text-amber-700 border-amber-200";

    case "INFO":
    default:
      return "bg-blue-100 text-blue-700 border-blue-200";
  }
};

const getSeverityIcon = (severity) => {
  switch (String(severity || "").toUpperCase()) {
    case "CRITICAL":
      return <ShieldAlert size={14} />;

    case "WARNING":
      return <AlertCircle size={14} />;

    case "INFO":
    default:
      return <Info size={14} />;
  }
};

const getEntityClasses = (entity) => {
  switch (String(entity || "").toUpperCase()) {
    case "USER":
      return "bg-purple-100 text-purple-700";

    case "SALE":
      return "bg-emerald-100 text-emerald-700";

    case "RETURN":
      return "bg-orange-100 text-orange-700";

    case "PRODUCT":
      return "bg-blue-100 text-blue-700";

    case "INVENTORY":
      return "bg-cyan-100 text-cyan-700";

    case "EXPENSE":
      return "bg-rose-100 text-rose-700";

    case "PURCHASE":
      return "bg-indigo-100 text-indigo-700";

    case "PAYMENT":
      return "bg-green-100 text-green-700";

    case "BUSINESS":
    case "BRANCH":
      return "bg-slate-100 text-slate-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getApiErrorMessage = (
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

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);

  const [branches, setBranches] = useState([]);

  const [search, setSearch] = useState("");

  const [entity, setEntity] = useState("ALL");

  const [severity, setSeverity] = useState("ALL");

  const [branchId, setBranchId] = useState("");

  const [page, setPage] = useState(1);

  const [totalPages, setTotalPages] = useState(1);

  const [totalLogs, setTotalLogs] = useState(0);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [selectedLog, setSelectedLog] = useState(null);

  const [showFilters, setShowFilters] = useState(false);

  const [stats, setStats] = useState({
    total: 0,
    info: 0,
    warning: 0,
    critical: 0,
  });

  /*
   * Load branches.
   */
  const loadBranches = useCallback(async () => {
    try {
      const response = await api.get("/branches");

      const data = response?.data;

      const branchList =
        data?.branches ||
        data?.data ||
        (Array.isArray(data) ? data : []);

      setBranches(
        Array.isArray(branchList)
          ? branchList
          : []
      );
    } catch (error) {
      /*
       * Branch loading should not prevent
       * the audit log page from working.
       */
      console.warn(
        "Could not load branches:",
        error
      );
    }
  }, []);

  /*
   * Load audit logs.
   */
  const loadAuditLogs = useCallback(
    async ({
      showLoading = true,
      showRefreshing = false,
    } = {}) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        if (showRefreshing) {
          setRefreshing(true);
        }

        setError("");

        const params = {
          page,
          limit: PAGE_SIZE,
        };

        const trimmedSearch = search.trim();

        if (trimmedSearch) {
          params.search = trimmedSearch;
        }

        if (entity !== "ALL") {
          params.entity = entity;
        }

        if (severity !== "ALL") {
          params.severity = severity;
        }

        if (branchId) {
          params.branchId = branchId;
        }

        const response = await api.get(
          "/audit-logs",
          {
            params,
          }
        );

        const data = response?.data || {};

        const returnedLogs =
          data.logs ||
          data.auditLogs ||
          data.data ||
          [];

        setLogs(
          Array.isArray(returnedLogs)
            ? returnedLogs
            : []
        );

        const pagination =
          data.pagination || {};

        const returnedTotalPages =
          Number(
            pagination.totalPages ||
              data.totalPages ||
              1
          );

        const returnedTotal =
          Number(
            pagination.total ||
              data.total ||
              data.count ||
              returnedLogs.length
          );

        setTotalPages(
          Math.max(
            returnedTotalPages || 1,
            1
          )
        );

        setTotalLogs(
          returnedTotal || 0
        );

        /*
         * Calculate statistics from the
         * returned logs when the API does not
         * provide statistics.
         */
        const returnedStats =
          data.stats || data.statistics;

        if (returnedStats) {
          setStats({
            total:
              Number(
                returnedStats.total ??
                  returnedTotal ??
                  0
              ),
            info:
              Number(
                returnedStats.info ??
                  returnedStats.INFO ??
                  0
              ),
            warning:
              Number(
                returnedStats.warning ??
                  returnedStats.WARNING ??
                  0
              ),
            critical:
              Number(
                returnedStats.critical ??
                  returnedStats.CRITICAL ??
                  0
              ),
          });
        } else {
          setStats({
            total: returnedTotal || returnedLogs.length,
            info: returnedLogs.filter(
              (log) =>
                String(
                  log.severity || ""
                ).toUpperCase() === "INFO"
            ).length,
            warning: returnedLogs.filter(
              (log) =>
                String(
                  log.severity || ""
                ).toUpperCase() === "WARNING"
            ).length,
            critical: returnedLogs.filter(
              (log) =>
                String(
                  log.severity || ""
                ).toUpperCase() === "CRITICAL"
            ).length,
          });
        }
      } catch (error) {
        console.error(
          "Load audit logs error:",
          error
        );

        setError(
          getApiErrorMessage(
            error,
            "Unable to load audit logs."
          )
        );

        setLogs([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      search,
      entity,
      severity,
      branchId,
    ]
  );

  /*
   * Initial branch load.
   */
  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  /*
   * Load logs whenever a real filter/page changes.
   *
   * Search is debounced separately below.
   */
  useEffect(() => {
    loadAuditLogs();
  }, [
    page,
    entity,
    severity,
    branchId,
  ]);

  /*
   * Debounced search.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (page !== 1) {
        setPage(1);
        return;
      }

      loadAuditLogs();
    }, 450);

    return () => {
      window.clearTimeout(timer);
    };
  }, [search]);

  /*
   * Reset page whenever filters change.
   */
  useEffect(() => {
    setPage(1);
  }, [
    entity,
    severity,
    branchId,
  ]);

  const hasActiveFilters = useMemo(() => {
    return (
      search.trim() !== "" ||
      entity !== "ALL" ||
      severity !== "ALL" ||
      branchId !== ""
    );
  }, [
    search,
    entity,
    severity,
    branchId,
  ]);

  const clearFilters = () => {
    setSearch("");
    setEntity("ALL");
    setSeverity("ALL");
    setBranchId("");
    setPage(1);
  };

  const handleRefresh = async () => {
    await loadAuditLogs({
      showLoading: false,
      showRefreshing: true,
    });
  };

  const goToPreviousPage = () => {
    if (page <= 1) {
      return;
    }

    setPage((current) =>
      Math.max(current - 1, 1)
    );
  };

  const goToNextPage = () => {
    if (page >= totalPages) {
      return;
    }

    setPage((current) =>
      Math.min(
        current + 1,
        totalPages
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                <Activity size={22} />
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Audit Logs
                </h1>

                <p className="text-sm text-slate-500">
                  Track important activities performed
                  in your MOVA business.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setShowFilters(
                  (current) => !current
                )
              }
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                showFilters
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Filter size={16} />
              Filters
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<Activity size={19} />}
            label="Total Events"
            value={stats.total}
            description="Audit activity"
          />

          <StatCard
            icon={<Info size={19} />}
            label="Information"
            value={stats.info}
            description="Normal activity"
          />

          <StatCard
            icon={<AlertCircle size={19} />}
            label="Warnings"
            value={stats.warning}
            description="Requires attention"
          />

          <StatCard
            icon={<ShieldAlert size={19} />}
            label="Critical"
            value={stats.critical}
            description="High-risk activity"
          />
        </div>

        {/* Search / Filters */}
        <div
          className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
            showFilters
              ? "block"
              : "block"
          }`}
        >
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_200px_auto]">
            {/* Search */}
            <div className="relative">
              <Search
                size={17}
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
                placeholder="Search audit activity..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            {/* Entity */}
            <select
              value={entity}
              onChange={(event) =>
                setEntity(
                  event.target.value
                )
              }
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              {ENTITY_OPTIONS.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option === "ALL"
                      ? "All entities"
                      : option}
                  </option>
                )
              )}
            </select>

            {/* Severity */}
            <select
              value={severity}
              onChange={(event) =>
                setSeverity(
                  event.target.value
                )
              }
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              {SEVERITY_OPTIONS.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option === "ALL"
                      ? "All severity"
                      : option}
                  </option>
                )
              )}
            </select>

            {/* Branch */}
            <select
              value={branchId}
              onChange={(event) =>
                setBranchId(
                  event.target.value
                )
              }
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="">
                All branches
              </option>

              {branches.map(
                (branch) => (
                  <option
                    key={branch._id}
                    value={branch._id}
                  >
                    {branch.name ||
                      branch.code ||
                      "Branch"}
                  </option>
                )
              )}
            </select>

            {/* Clear */}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <X size={16} />
                Clear
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="flex-1">
              <p className="font-semibold">
                Audit logs could not be loaded
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                loadAuditLogs()
              }
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Activity
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    User
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Entity
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Severity
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <TableLoading />
                ) : logs.length === 0 ? (
                  <EmptyTable
                    hasFilters={
                      hasActiveFilters
                    }
                  />
                ) : (
                  logs.map((log) => (
                    <AuditTableRow
                      key={
                        log._id ||
                        `${log.action}-${log.createdAt}`
                      }
                      log={log}
                      onView={() =>
                        setSelectedLog(log)
                      }
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading &&
            logs.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                totalLogs={totalLogs}
                pageSize={PAGE_SIZE}
                onPrevious={
                  goToPreviousPage
                }
                onNext={
                  goToNextPage
                }
              />
            )}
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 md:hidden">
          {loading ? (
            <MobileLoading />
          ) : logs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <Activity
                size={30}
                className="mx-auto text-slate-300"
              />

              <h3 className="mt-3 font-semibold text-slate-800">
                No audit activity
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {hasActiveFilters
                  ? "Try changing or clearing your filters."
                  : "MOVA will show important activities here."}
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <AuditMobileCard
                key={
                  log._id ||
                  `${log.action}-${log.createdAt}`
                }
                log={log}
                onView={() =>
                  setSelectedLog(log)
                }
              />
            ))
          )}

          {!loading &&
            logs.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  totalLogs={totalLogs}
                  pageSize={PAGE_SIZE}
                  onPrevious={
                    goToPreviousPage
                  }
                  onNext={goToNextPage}
                  mobile
                />
              </div>
            )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <AuditDetailsModal
          log={selectedLog}
          onClose={() =>
            setSelectedLog(null)
          }
        />
      )}
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Statistics Card
|--------------------------------------------------------------------------
*/

function StatCard({
  icon,
  label,
  value,
  description,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {Number(value || 0).toLocaleString(
              "en-UG"
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {description}
          </p>
        </div>

        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Desktop Row
|--------------------------------------------------------------------------
*/

function AuditTableRow({
  log,
  onView,
}) {
  const severity = String(
    log.severity || "INFO"
  ).toUpperCase();

  const entity = String(
    log.entity || "SYSTEM"
  ).toUpperCase();

  const actorName =
    log.actorName ||
    log.actor?.name ||
    "System";

  return (
    <tr className="border-b border-slate-100 transition hover:bg-slate-50">
      <td className="px-4 py-4">
        <div>
          <p className="font-semibold text-slate-800">
            {log.action ||
              "Activity"}
          </p>

          <p className="mt-1 max-w-md truncate text-sm text-slate-500">
            {log.description ||
              "No description available."}
          </p>
        </div>
      </td>

      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <User size={15} />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700">
              {actorName}
            </p>

            {log.actorRole && (
              <p className="text-xs text-slate-400">
                {log.actorRole}
              </p>
            )}
          </div>
        </div>
      </td>

      <td className="px-4 py-4">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEntityClasses(
            entity
          )}`}
        >
          {entity}
        </span>
      </td>

      <td className="px-4 py-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getSeverityClasses(
            severity
          )}`}
        >
          {getSeverityIcon(
            severity
          )}
          {severity}
        </span>
      </td>

      <td className="px-4 py-4">
        <div>
          <p className="text-sm font-medium text-slate-700">
            {formatRelativeTime(
              log.createdAt
            )}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {formatDateTime(
              log.createdAt
            )}
          </p>
        </div>
      </td>

      <td className="px-4 py-4 text-right">
        <button
          type="button"
          onClick={onView}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <Eye size={14} />
          View
        </button>
      </td>
    </tr>
  );
}

/*
|--------------------------------------------------------------------------
| Mobile Card
|--------------------------------------------------------------------------
*/

function AuditMobileCard({
  log,
  onView,
}) {
  const severity = String(
    log.severity || "INFO"
  ).toUpperCase();

  const entity = String(
    log.entity || "SYSTEM"
  ).toUpperCase();

  const actorName =
    log.actorName ||
    log.actor?.name ||
    "System";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800">
            {log.action ||
              "Activity"}
          </p>

          <p className="mt-1 text-sm text-slate-500">
            {log.description ||
              "No description available."}
          </p>
        </div>

        <button
          type="button"
          onClick={onView}
          className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          aria-label="View audit details"
        >
          <Eye size={16} />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEntityClasses(
            entity
          )}`}
        >
          {entity}
        </span>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getSeverityClasses(
            severity
          )}`}
        >
          {getSeverityIcon(
            severity
          )}
          {severity}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
        <div>
          <p className="text-xs text-slate-400">
            User
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            {actorName}
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">
            Time
          </p>

          <p className="mt-1 text-sm font-medium text-slate-700">
            {formatRelativeTime(
              log.createdAt
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Pagination
|--------------------------------------------------------------------------
*/

function Pagination({
  page,
  totalPages,
  totalLogs,
  pageSize,
  onPrevious,
  onNext,
  mobile = false,
}) {
  const start =
    totalLogs === 0
      ? 0
      : (page - 1) * pageSize + 1;

  const end =
    totalLogs === 0
      ? 0
      : Math.min(
          page * pageSize,
          totalLogs
        );

  return (
    <div
      className={`flex items-center justify-between gap-3 ${
        mobile
          ? "flex-col sm:flex-row"
          : "border-t border-slate-200 px-4 py-3"
      }`}
    >
      <p className="text-xs text-slate-500">
        Showing{" "}
        <span className="font-semibold text-slate-700">
          {start}
        </span>{" "}
        to{" "}
        <span className="font-semibold text-slate-700">
          {end}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-700">
          {totalLogs}
        </span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={15} />
          Previous
        </button>

        <span className="min-w-[70px] text-center text-xs font-medium text-slate-500">
          {page} /{" "}
          {Math.max(
            totalPages,
            1
          )}
        </span>

        <button
          type="button"
          onClick={onNext}
          disabled={
            page >= totalPages
          }
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Desktop Loading
|--------------------------------------------------------------------------
*/

function TableLoading() {
  return (
    <>
      {Array.from({
        length: 6,
      }).map((_, index) => (
        <tr
          key={index}
          className="border-b border-slate-100"
        >
          {Array.from({
            length: 6,
          }).map(
            (
              __,
              columnIndex
            ) => (
              <td
                key={columnIndex}
                className="px-4 py-5"
              >
                <div className="h-4 animate-pulse rounded bg-slate-100" />
              </td>
            )
          )}
        </tr>
      ))}
    </>
  );
}

/*
|--------------------------------------------------------------------------
| Mobile Loading
|--------------------------------------------------------------------------
*/

function MobileLoading() {
  return (
    <>
      {Array.from({
        length: 4,
      }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />

          <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100" />

          <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-slate-100" />

          <div className="mt-4 flex gap-2">
            <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />

            <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </>
  );
}

/*
|--------------------------------------------------------------------------
| Empty Desktop Table
|--------------------------------------------------------------------------
*/

function EmptyTable({
  hasFilters,
}) {
  return (
    <tr>
      <td
        colSpan={6}
        className="px-6 py-14 text-center"
      >
        <Activity
          size={34}
          className="mx-auto text-slate-300"
        />

        <h3 className="mt-3 font-semibold text-slate-800">
          No audit activity found
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          {hasFilters
            ? "Try changing or clearing your filters."
            : "MOVA will display important system activities here."}
        </p>
      </td>
    </tr>
  );
}

/*
|--------------------------------------------------------------------------
| Details Modal
|--------------------------------------------------------------------------
*/

function AuditDetailsModal({
  log,
  onClose,
}) {
  const severity = String(
    log.severity || "INFO"
  ).toUpperCase();

  const entity = String(
    log.entity || "SYSTEM"
  ).toUpperCase();

  const actorName =
    log.actorName ||
    log.actor?.name ||
    "System";

  const actorEmail =
    log.actor?.email ||
    "";

  const branchName =
    log.branch?.name ||
    log.branchName ||
    "All branches";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-200 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">
                Audit Details
              </h2>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEntityClasses(
                  entity
                )}`}
              >
                {entity}
              </span>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${getSeverityClasses(
                  severity
                )}`}
              >
                {getSeverityIcon(
                  severity
                )}
                {severity}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {formatDateTime(
                log.createdAt
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[70vh] overflow-y-auto p-5">
          <div className="space-y-5">
            {/* Description */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Activity
              </p>

              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-800">
                  {log.action ||
                    "Activity"}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {log.description ||
                    "No description available."}
                </p>
              </div>
            </section>

            {/* Actor */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Performed By
              </p>

              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="Name"
                  value={actorName}
                />

                <DetailItem
                  label="Role"
                  value={
                    log.actorRole ||
                    "—"
                  }
                />

                {actorEmail && (
                  <DetailItem
                    label="Email"
                    value={actorEmail}
                  />
                )}

                <DetailItem
                  label="Branch"
                  value={branchName}
                />
              </div>
            </section>

            {/* Entity */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Entity
              </p>

              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="Entity"
                  value={entity}
                />

                <DetailItem
                  label="Entity ID"
                  value={
                    log.entityId
                      ? String(
                          log.entityId
                        )
                      : "—"
                  }
                />
              </div>
            </section>

            {/* Technical information */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Technical Information
              </p>

              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="IP Address"
                  value={
                    log.ipAddress ||
                    "—"
                  }
                />

                <DetailItem
                  label="Date"
                  value={formatDateTime(
                    log.createdAt
                  )}
                />
              </div>

              {log.userAgent && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-400">
                    User Agent
                  </p>

                  <p className="mt-1 break-all text-xs leading-5 text-slate-600">
                    {log.userAgent}
                  </p>
                </div>
              )}
            </section>

            {/* Metadata */}
            {log.metadata &&
              typeof log.metadata ===
                "object" &&
              Object.keys(
                log.metadata
              ).length > 0 && (
                <section>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Additional Data
                  </p>

                  <pre className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-5 text-slate-100">
                    {JSON.stringify(
                      log.metadata,
                      null,
                      2
                    )}
                  </pre>
                </section>
              )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200 bg-slate-50 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| Detail Item
|--------------------------------------------------------------------------
*/

function DetailItem({
  label,
  value,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-700">
        {value || "—"}
      </p>
    </div>
  );
}
