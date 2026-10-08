
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Filter,
  Info,
  RefreshCw,
  Search,
  ShieldAlert,
  User,
  X,
} from "lucide-react";

import { api } from "../../services/api";

const ENTITY_OPTIONS = [
  "All entities",
  "User",
  "Sale",
  "Return",
  "Product",
  "Purchase",
  "Expense",
  "Business",
];

const SEVERITY_OPTIONS = [
  "All severity",
  "INFO",
  "WARNING",
  "CRITICAL",
];

const ACTION_LABELS = {
  USER_CREATED: "User Created",
  USER_UPDATED: "User Updated",
  USER_DISABLED: "User Disabled",
  USER_ENABLED: "User Enabled",
  SALE_COMPLETED: "Sale Completed",
  RETURN_CREATED: "Return Created",
  STOCK_ADJUSTED: "Stock Adjusted",
  PURCHASE_CREATED: "Purchase Created",
  EXPENSE_CREATED: "Expense Created",
  BUSINESS_SETTINGS_UPDATED:
    "Business Settings Updated",
};

const formatAction = (action = "") => {
  if (ACTION_LABELS[action]) {
    return ACTION_LABELS[action];
  }

  return action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const formatDateTime = (value) => {
  if (!value) {
    return "Unknown date";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleString("en-UG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatRelativeTime = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const difference =
    Date.now() - date.getTime();

  const seconds = Math.floor(
    difference / 1000
  );

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(
    seconds / 60
  );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(
    hours / 24
  );

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString("en-UG");
};

const getSeverityClasses = (severity) => {
  switch (severity) {
    case "CRITICAL":
      return {
        badge:
          "bg-red-100 text-red-700 border-red-200",
        icon:
          "bg-red-100 text-red-600",
      };

    case "WARNING":
      return {
        badge:
          "bg-amber-100 text-amber-700 border-amber-200",
        icon:
          "bg-amber-100 text-amber-600",
      };

    default:
      return {
        badge:
          "bg-blue-100 text-blue-700 border-blue-200",
        icon:
          "bg-blue-100 text-blue-600",
      };
  }
};

const getEntityIcon = (entity) => {
  switch (entity) {
    case "User":
      return User;

    case "Business":
      return Building2;

    case "Product":
      return Activity;

    default:
      return Activity;
  }
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [entity, setEntity] =
    useState("");

  const [severity, setSeverity] =
    useState("");

  const [branchId, setBranchId] =
    useState("");

  const [branches, setBranches] =
    useState([]);

  const [page, setPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 30,
      total: 0,
      pages: 1,
    });

  const [selectedLog, setSelectedLog] =
    useState(null);

  const [showFilters, setShowFilters] =
    useState(false);

  const loadBranches = async () => {
    try {
      const response =
        await api.get("/branches");

      const data =
        response.data?.branches ||
        response.data?.data ||
        response.data ||
        [];

      if (Array.isArray(data)) {
        setBranches(data);
      }
    } catch (branchError) {
      console.warn(
        "Unable to load branches:",
        branchError
      );
    }
  };

  const loadAuditLogs = async (
    showRefresh = false
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const params = new URLSearchParams();

      params.set("page", String(page));
      params.set("limit", "30");

      if (search.trim()) {
        params.set(
          "search",
          search.trim()
        );
      }

      if (entity) {
        params.set("entity", entity);
      }

      if (severity) {
        params.set(
          "severity",
          severity
        );
      }

      if (branchId) {
        params.set(
          "branchId",
          branchId
        );
      }

      const response =
        await api.get(
          `/audit-logs?${params.toString()}`
        );

      const data =
        response.data || {};

      setLogs(
        Array.isArray(data.logs)
          ? data.logs
          : []
      );

      setPagination(
        data.pagination || {
          page,
          limit: 30,
          total: 0,
          pages: 1,
        }
      );
    } catch (requestError) {
      console.error(
        "Unable to load audit logs:",
        requestError
      );

      setError(
        requestError.response?.data
          ?.message ||
          requestError.message ||
          "Unable to load audit logs."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    loadAuditLogs();
  }, [
    page,
    entity,
    severity,
    branchId,
  ]);

  /*
   * Search with a small delay so we don't
   * request the server on every keystroke.
   */

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        setPage(1);
        loadAuditLogs();
      }, 450);

    return () =>
      window.clearTimeout(timer);
  }, [search]);

  const clearFilters = () => {
    setSearch("");
    setEntity("");
    setSeverity("");
    setBranchId("");
    setPage(1);
  };

  const hasFilters = useMemo(() => {
    return Boolean(
      search ||
        entity ||
        severity ||
        branchId
    );
  }, [
    search,
    entity,
    severity,
    branchId,
  ]);

  const statistics = useMemo(() => {
    const total =
      pagination.total || 0;

    const critical = logs.filter(
      (log) =>
        log.severity === "CRITICAL"
    ).length;

    const warnings = logs.filter(
      (log) =>
        log.severity === "WARNING"
    ).length;

    return {
      total,
      critical,
      warnings,
      currentPage: logs.length,
    };
  }, [logs, pagination]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <ShieldAlert size={23} />
            </div>

            <div>
              <h1 className="text-3xl font-black text-slate-900">
                Audit Logs
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Track important activity across
                your MOVA business.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            loadAuditLogs(true)
          }
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {/* STATISTICS */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Total Activities
              </p>

              <p className="mt-2 text-2xl font-black text-slate-900">
                {statistics.total.toLocaleString()}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Activity size={21} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Current Page
              </p>

              <p className="mt-2 text-2xl font-black text-slate-900">
                {statistics.currentPage}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Clock3 size={21} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Warnings
              </p>

              <p className="mt-2 text-2xl font-black text-amber-600">
                {statistics.warnings}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle size={21} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Critical
              </p>

              <p className="mt-2 text-2xl font-black text-red-600">
                {statistics.critical}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <ShieldAlert size={21} />
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search activity, user or action..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            type="button"
            onClick={() =>
              setShowFilters(
                (current) => !current
              )
            }
            className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition ${
              showFilters ||
              hasFilters
                ? "border-blue-200 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Filter size={17} />

            Filters

            {hasFilters && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                Active
              </span>
            )}
          </button>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Entity
              </label>

              <select
                value={entity}
                onChange={(event) => {
                  setEntity(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {ENTITY_OPTIONS.map(
                  (option) => (
                    <option
                      key={option}
                      value={
                        option ===
                        "All entities"
                          ? ""
                          : option
                      }
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Severity
              </label>

              <select
                value={severity}
                onChange={(event) => {
                  setSeverity(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {SEVERITY_OPTIONS.map(
                  (option) => (
                    <option
                      key={option}
                      value={
                        option ===
                        "All severity"
                          ? ""
                          : option
                      }
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                Branch
              </label>

              <select
                value={branchId}
                onChange={(event) => {
                  setBranchId(
                    event.target.value
                  );
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">
                  All accessible branches
                </option>

                {branches.map(
                  (branch) => (
                    <option
                      key={branch._id}
                      value={branch._id}
                    >
                      {branch.name}
                      {branch.code
                        ? ` (${branch.code})`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertTriangle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-bold">
              Audit logs could not be loaded
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* AUDIT TABLE */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-slate-900">
                Activity History
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Important actions performed in
                your MOVA system.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              Page {pagination.page} of{" "}
              {pagination.pages || 1}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3, 4, 5].map(
              (item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-xl bg-slate-100"
                />
              )
            )}
          </div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Info size={25} />
            </div>

            <h3 className="mt-4 font-black text-slate-900">
              No audit activity found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              MOVA has not found any activity
              matching your current filters.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4 font-bold">
                      Activity
                    </th>

                    <th className="px-5 py-4 font-bold">
                      User
                    </th>

                    <th className="px-5 py-4 font-bold">
                      Branch
                    </th>

                    <th className="px-5 py-4 font-bold">
                      Severity
                    </th>

                    <th className="px-5 py-4 font-bold">
                      Time
                    </th>

                    <th className="px-5 py-4 text-right font-bold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {logs.map((log) => {
                    const styles =
                      getSeverityClasses(
                        log.severity
                      );

                    return (
                      <tr
                        key={log._id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
                            >
                              {(() => {
                                const Icon =
                                  getEntityIcon(
                                    log.entity
                                  );

                                return (
                                  <Icon
                                    size={18}
                                  />
                                );
                              })()}
                            </div>

                            <div className="min-w-0">
                              <p className="font-bold text-slate-900">
                                {formatAction(
                                  log.action
                                )}
                              </p>

                              <p className="mt-1 max-w-md truncate text-sm text-slate-500">
                                {log.description}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            <p className="font-semibold text-slate-800">
                              {log.actorName ||
                                log.actorId?.name ||
                                "System"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {log.actorRole ||
                                log.actorId?.role ||
                                "SYSTEM"}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Building2
                              size={15}
                            />

                            {log.branchId?.name ||
                              "All branches"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${styles.badge}`}
                          >
                            {log.severity ||
                              "INFO"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-700">
                            {formatRelativeTime(
                              log.createdAt
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {formatDateTime(
                              log.createdAt
                            )}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedLog(
                                log
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-white"
                          >
                            <Eye size={15} />
                            Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}

            <div className="divide-y divide-slate-100 lg:hidden">
              {logs.map((log) => {
                const styles =
                  getSeverityClasses(
                    log.severity
                  );

                const Icon =
                  getEntityIcon(
                    log.entity
                  );

                return (
                  <div
                    key={log._id}
                    className="p-4"
                  >
                    <div className="flex gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
                      >
                        <Icon size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bold text-slate-900">
                              {formatAction(
                                log.action
                              )}
                            </p>

                            <p className="mt-1 text-sm text-slate-500">
                              {log.description}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${styles.badge}`}
                          >
                            {log.severity ||
                              "INFO"}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <User size={13} />

                            {log.actorName ||
                              "System"}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <Building2
                              size={13}
                            />

                            {log.branchId?.name ||
                              "All branches"}
                          </span>

                          <span className="inline-flex items-center gap-1">
                            <Clock3
                              size={13}
                            />

                            {formatRelativeTime(
                              log.createdAt
                            )}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedLog(
                              log
                            )
                          }
                          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                        >
                          <Eye size={14} />
                          View details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* PAGINATION */}

        {!loading &&
          logs.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-700">
                  {logs.length}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-700">
                  {pagination.total}
                </span>{" "}
                activities
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    pagination.page <= 1
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          current - 1,
                          1
                        )
                    )
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                </button>

                <span className="px-3 text-sm font-bold text-slate-700">
                  {pagination.page} /{" "}
                  {pagination.pages ||
                    1}
                </span>

                <button
                  type="button"
                  disabled={
                    pagination.page >=
                    pagination.pages
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        current + 1
                    )
                  }
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
      </section>

      {/* DETAILS MODAL */}

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Audit activity
                </p>

                <h2 className="mt-1 text-xl font-black text-slate-900">
                  {formatAction(
                    selectedLog.action
                  )}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedLog(null)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Description
                </p>

                <p className="mt-2 leading-7 text-slate-700">
                  {selectedLog.description}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    User
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {selectedLog.actorName ||
                      selectedLog.actorId?.name ||
                      "System"}
                  </p>

                  <p className="text-sm text-slate-500">
                    {selectedLog.actorRole ||
                      selectedLog.actorId?.role ||
                      "SYSTEM"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Branch
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {selectedLog.branchId?.name ||
                      "All branches"}
                  </p>

                  {selectedLog.branchId
                    ?.code && (
                    <p className="text-sm text-slate-500">
                      {
                        selectedLog
                          .branchId
                          .code
                      }
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Entity
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {selectedLog.entity}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Severity
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {selectedLog.severity ||
                      "INFO"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Date & Time
                  </p>

                  <p className="mt-1 font-bold text-slate-800">
                    {formatDateTime(
                      selectedLog.createdAt
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Entity ID
                  </p>

                  <p className="mt-1 break-all font-mono text-xs text-slate-600">
                    {selectedLog.entityId ||
                      "N/A"}
                  </p>
                </div>
              </div>

              {selectedLog.metadata &&
                Object.keys(
                  selectedLog.metadata
                ).length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      Additional information
                    </p>

                    <pre className="mt-2 overflow-x-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-200">
                      {JSON.stringify(
                        selectedLog.metadata,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )}

              {(selectedLog.ipAddress ||
                selectedLog.userAgent) && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Request information
                  </p>

                  {selectedLog.ipAddress && (
                    <p className="mt-2 text-sm text-slate-600">
                      IP:{" "}
                      <span className="font-mono">
                        {
                          selectedLog.ipAddress
                        }
                      </span>
                    </p>
                  )}

                  {selectedLog.userAgent && (
                    <p className="mt-2 break-all text-xs text-slate-500">
                      {
                        selectedLog.userAgent
                      }
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 px-6 py-4 text-right">
              <button
                type="button"
                onClick={() =>
                  setSelectedLog(null)
                }
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
