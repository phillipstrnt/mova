import { useEffect, useMemo, useState } from "react";

import {
  Banknote,
  CreditCard,
  Download,
  Landmark,
  Search,
  Smartphone,
} from "lucide-react";

import api from "../../api";

const paymentMethods = [
  "CASH",
  "MOBILE_MONEY",
  "CARD",
  "BANK",
];

const paymentStatuses = [
  "PAID",
  "PENDING",
  "REFUNDED",
];

const Payments = () => {
  const [sales, setSales] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [paymentMethod, setPaymentMethod] =
    useState("");

  const [paymentStatus, setPaymentStatus] =
    useState("");

  const [error, setError] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    });

  /*
  |--------------------------------------------------------------------------
  | LOAD PAYMENTS
  |--------------------------------------------------------------------------
  */

  const loadPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/sales",
          {
            params: {
              search,
              paymentMethod,
              paymentStatus,
              page,
              limit: 20,
            },
          }
        );

      setSales(
        response.data?.sales ||
          []
      );

      setPagination(
        response.data?.pagination ||
          {
            page: 1,
            limit: 20,
            total: 0,
            pages: 0,
          }
      );
    } catch (error) {
      console.error(
        "Failed to load payments:",
        error
      );

      setError(
        error.response?.data
          ?.message ||
          "Failed to load payment records."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | LOAD WHEN FILTERS CHANGE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadPayments();
  }, [
    search,
    paymentMethod,
    paymentStatus,
    page,
  ]);

  /*
  |--------------------------------------------------------------------------
  | RESET PAGE WHEN FILTERS CHANGE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setPage(1);
  }, [
    search,
    paymentMethod,
    paymentStatus,
  ]);

  /*
  |--------------------------------------------------------------------------
  | TOTAL
  |--------------------------------------------------------------------------
  */

  const totalAmount = useMemo(() => {
    return sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        Number(
          sale.total || 0
        ),
      0
    );
  }, [sales]);

  /*
  |--------------------------------------------------------------------------
  | CASH
  |--------------------------------------------------------------------------
  */

  const cashAmount = useMemo(() => {
    return sales
      .filter(
        (sale) =>
          sale.paymentMethod ===
          "CASH"
      )
      .reduce(
        (
          total,
          sale
        ) =>
          total +
          Number(
            sale.total || 0
          ),
        0
      );
  }, [sales]);

  /*
  |--------------------------------------------------------------------------
  | MOBILE MONEY
  |--------------------------------------------------------------------------
  */

  const mobileMoneyAmount =
    useMemo(() => {
      return sales
        .filter(
          (sale) =>
            sale.paymentMethod ===
            "MOBILE_MONEY"
        )
        .reduce(
          (
            total,
            sale
          ) =>
            total +
            Number(
              sale.total || 0
            ),
          0
        );
    }, [sales]);

  /*
  |--------------------------------------------------------------------------
  | CARD
  |--------------------------------------------------------------------------
  */

  const cardAmount = useMemo(() => {
    return sales
      .filter(
        (sale) =>
          sale.paymentMethod ===
          "CARD"
      )
      .reduce(
        (
          total,
          sale
        ) =>
          total +
          Number(
            sale.total || 0
          ),
        0
      );
  }, [sales]);

  /*
  |--------------------------------------------------------------------------
  | BANK
  |--------------------------------------------------------------------------
  */

  const bankAmount = useMemo(() => {
    return sales
      .filter(
        (sale) =>
          sale.paymentMethod ===
          "BANK"
      )
      .reduce(
        (
          total,
          sale
        ) =>
          total +
          Number(
            sale.total || 0
          ),
        0
      );
  }, [sales]);

  /*
  |--------------------------------------------------------------------------
  | FORMAT CURRENCY
  |--------------------------------------------------------------------------
  */

  const formatCurrency = (
    amount
  ) => {
    return new Intl.NumberFormat(
      "en-UG",
      {
        style: "currency",
        currency: "UGX",
        maximumFractionDigits: 0,
      }
    ).format(
      Number(amount || 0)
    );
  };

  /*
  |--------------------------------------------------------------------------
  | FORMAT DATE
  |--------------------------------------------------------------------------
  */

  const formatDate = (
    date
  ) => {
    if (!date) {
      return "-";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "-";
    }

    return parsedDate.toLocaleDateString(
      "en-GB"
    );
  };

  /*
  |--------------------------------------------------------------------------
  | FORMAT TIME
  |--------------------------------------------------------------------------
  */

  const formatTime = (
    date
  ) => {
    if (!date) {
      return "-";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "-";
    }

    return parsedDate.toLocaleTimeString(
      "en-UG",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | FORMAT PAYMENT METHOD
  |--------------------------------------------------------------------------
  */

  const formatPaymentMethod = (
    method
  ) => {
    if (!method) {
      return "-";
    }

    return method
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (character) =>
          character.toUpperCase()
      );
  };

  /*
  |--------------------------------------------------------------------------
  | PAYMENT ICON
  |--------------------------------------------------------------------------
  */

  const getPaymentIcon = (
    method
  ) => {
    switch (method) {
      case "CASH":
        return (
          <Banknote size={18} />
        );

      case "MOBILE_MONEY":
        return (
          <Smartphone size={18} />
        );

      case "CARD":
        return (
          <CreditCard size={18} />
        );

      case "BANK":
        return (
          <Landmark size={18} />
        );

      default:
        return (
          <Banknote size={18} />
        );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | STATUS STYLE
  |--------------------------------------------------------------------------
  */

  const getStatusClass = (
    status
  ) => {
    switch (status) {
      case "PAID":
        return "bg-emerald-50 text-emerald-700";

      case "PENDING":
        return "bg-amber-50 text-amber-700";

      case "REFUNDED":
        return "bg-red-50 text-red-700";

      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  /*
  |--------------------------------------------------------------------------
  | EXPORT CSV
  |--------------------------------------------------------------------------
  */

  const exportPayments = () => {
    if (!sales.length) {
      alert(
        "There are no payments to export."
      );

      return;
    }

    const headers = [
      "Receipt Number",
      "Date",
      "Customer",
      "Payment Method",
      "Payment Status",
      "Amount",
    ];

    const rows = sales.map(
      (sale) => [
        sale.receiptNumber ||
          "",

        sale.createdAt
          ? new Date(
              sale.createdAt
            ).toLocaleDateString(
              "en-GB"
            )
          : "",

        sale.customerId
          ?.name ||
          "Walk-in Customer",

        sale.paymentMethod ||
          "",

        sale.paymentStatus ||
          "",

        Number(
          sale.total || 0
        ),
      ]
    );

    const csv = [
      headers,
      ...rows,
    ]
      .map(
        (row) =>
          row
            .map((value) => {
              const stringValue =
                String(value);

              return `"${stringValue.replaceAll(
                '"',
                '""'
              )}"`;
            })
            .join(",")
      )
      .join("\n");

    const blob =
      new Blob(
        [csv],
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
      `mova-payments-${new Date()
        .toISOString()
        .split("T")[0]}.csv`;

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
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Banknote size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-950">
                Payments
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Monitor and manage customer
                payment transactions.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={
            exportPayments
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Download size={18} />

          Export CSV
        </button>
      </div>

      {/* SUMMARY */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Total Payments
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950">
            {formatCurrency(
              totalAmount
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Cash
              </p>

              <p className="mt-2 text-xl font-black text-slate-950">
                {formatCurrency(
                  cashAmount
                )}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Banknote size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Mobile Money
              </p>

              <p className="mt-2 text-xl font-black text-slate-950">
                {formatCurrency(
                  mobileMoneyAmount
                )}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Smartphone size={20} />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Card & Bank
              </p>

              <p className="mt-2 text-xl font-black text-slate-950">
                {formatCurrency(
                  cardAmount +
                    bankAmount
                )}
              </p>
            </div>

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <CreditCard size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* FILTERS */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="Search receipt number..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <select
            value={
              paymentMethod
            }
            onChange={(
              event
            ) =>
              setPaymentMethod(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">
              All Payment Methods
            </option>

            {paymentMethods.map(
              (method) => (
                <option
                  key={method}
                  value={method}
                >
                  {formatPaymentMethod(
                    method
                  )}
                </option>
              )
            )}
          </select>

          <select
            value={
              paymentStatus
            }
            onChange={(
              event
            ) =>
              setPaymentStatus(
                event.target
                  .value
              )
            }
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">
              All Statuses
            </option>

            {paymentStatuses.map(
              (status) => (
                <option
                  key={status}
                  value={status}
                >
                  {status}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* TABLE */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Receipt
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Date
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Customer
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Method
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Status
                </th>

                <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-400">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-12 text-center text-sm text-slate-400"
                  >
                    Loading payments...
                  </td>
                </tr>
              ) : sales.length ===
                0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-14 text-center"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Banknote
                        size={24}
                      />
                    </div>

                    <p className="mt-4 font-bold text-slate-700">
                      No payments found
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Completed sales will
                      appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                sales.map(
                  (sale) => (
                    <tr
                      key={
                        sale._id
                      }
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-800">
                          {
                            sale.receiptNumber
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-700">
                          {formatDate(
                            sale.createdAt
                          )}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatTime(
                            sale.createdAt
                          )}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-800">
                          {sale
                            .customerId
                            ?.name ||
                            "Walk-in Customer"}
                        </p>

                        {sale
                          .customerId
                          ?.phone && (
                          <p className="mt-1 text-xs text-slate-400">
                            {
                              sale
                                .customerId
                                .phone
                            }
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                          <span className="text-blue-600">
                            {getPaymentIcon(
                              sale.paymentMethod
                            )}
                          </span>

                          {formatPaymentMethod(
                            sale.paymentMethod
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusClass(
                            sale.paymentStatus
                          )}`}
                        >
                          {
                            sale.paymentStatus
                          }
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-black text-slate-900">
                        {formatCurrency(
                          sale.total
                        )}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        {!loading &&
          pagination.pages >
            1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4">
              <p className="text-sm text-slate-500">
                Page{" "}
                <span className="font-bold text-slate-800">
                  {
                    pagination.page
                  }
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-800">
                  {
                    pagination.pages
                  }
                </span>
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={
                    page <= 1
                  }
                  onClick={() =>
                    setPage(
                      (
                        current
                      ) =>
                        Math.max(
                          current -
                            1,
                          1
                        )
                    )
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={
                    page >=
                    pagination.pages
                  }
                  onClick={() =>
                    setPage(
                      (
                        current
                      ) =>
                        Math.min(
                          current +
                            1,
                          pagination.pages
                        )
                    )
                  }
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default Payments;