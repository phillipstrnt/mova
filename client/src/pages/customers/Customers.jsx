import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Mail,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  User,
  UserCheck,
  UserX,
  Wallet,
  X,
} from "lucide-react";

import api from "../../services/api";


// ======================================================
// CURRENCY
// ======================================================

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
};

const getLoyaltyTier = (points) => {
  const total = Number(points) || 0;
  if (total >= 1000) return "Platinum";
  if (total >= 500) return "Gold";
  if (total >= 100) return "Silver";
  return "Member";
};

const getNextLoyaltyTier = (points) => {
  const total = Number(points) || 0;
  if (total < 100) return { name: "Silver", remaining: 100 - total };
  if (total < 500) return { name: "Gold", remaining: 500 - total };
  if (total < 1000) return { name: "Platinum", remaining: 1000 - total };
  return null;
};


// ======================================================
// EMPTY FORM
// ======================================================

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  address: "",
  creditLimit: "0",
  notes: "",
};


// ======================================================
// CUSTOMERS PAGE
// ======================================================

const Customers = () => {
  const location = useLocation();
  // ====================================================
  // CUSTOMERS
  // ====================================================

  const [customers, setCustomers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("active");

  // ====================================================
  // PAGINATION
  // ====================================================

  const [page, setPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    });


  // ====================================================
  // FORM
  // ====================================================

  const [showForm, setShowForm] =
    useState(false);

  const [editingCustomer, setEditingCustomer] =
    useState(null);

  const [form, setForm] =
    useState(EMPTY_FORM);

  const [saving, setSaving] =
    useState(false);


  // ====================================================
  // CUSTOMER DETAILS
  // ====================================================

  const [selectedCustomer, setSelectedCustomer] =
    useState(null);

  const [customerSales, setCustomerSales] =
    useState([]);

  const [loadingSales, setLoadingSales] =
    useState(false);


  // ====================================================
  // FEEDBACK
  // ====================================================

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");


  // ====================================================
  // LOAD CUSTOMERS
  // ====================================================

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get(
          "/customers",
          {
            params: {
              search,
              status,
              page,
              limit: 20,
            },
          }
        );

      setCustomers(
        response.data.customers ||
          []
      );

      setPagination(
        response.data.pagination || {
          page,
          limit: 20,
          total: 0,
          pages: 0,
        }
      );
    } catch (error) {
      console.error(
        "Failed to load customers:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to load customers."
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const globalSearch = new URLSearchParams(location.search).get("search");
    if (globalSearch !== null) {
      setSearch(globalSearch);
      setPage(1);
    }
  }, [location.search]);

  useEffect(() => {
    const timer =
      setTimeout(
        fetchCustomers,
        300
      );

    return () =>
      clearTimeout(timer);
  }, [
    search,
    status,
    page,
  ]);


  // ====================================================
  // OPEN ADD FORM
  // ====================================================

  const openAddForm = () => {
    setEditingCustomer(null);

    setForm({
      ...EMPTY_FORM,
    });

    setError("");
    setSuccess("");

    setShowForm(true);
  };


  // ====================================================
  // OPEN EDIT FORM
  // ====================================================

  const openEditForm = (
    customer
  ) => {
    setEditingCustomer(
      customer
    );

    setForm({
      name:
        customer.name || "",

      phone:
        customer.phone || "",

      email:
        customer.email || "",

      address:
        customer.address || "",

      creditLimit:
        String(
          customer.creditLimit || 0
        ),

      notes:
        customer.notes || "",
    });

    setError("");
    setSuccess("");

    setShowForm(true);
  };


  // ====================================================
  // CLOSE FORM
  // ====================================================

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);

    setEditingCustomer(null);

    setForm({
      ...EMPTY_FORM,
    });
  };


  // ====================================================
  // FORM CHANGE
  // ====================================================

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };


  // ====================================================
  // SAVE CUSTOMER
  // ====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError(
        "Customer name is required."
      );

      return;
    }

    const creditLimit =
      Number(
        form.creditLimit
      );

    if (
      !Number.isFinite(
        creditLimit
      ) ||
      creditLimit < 0
    ) {
      setError(
        "Credit limit must be a valid amount."
      );

      return;
    }

    try {
      setSaving(true);

      const payload = {
        name:
          form.name.trim(),

        phone:
          form.phone.trim(),

        email:
          form.email
            .trim()
            .toLowerCase(),

        address:
          form.address.trim(),

        creditLimit,

        notes:
          form.notes.trim(),
      };


      if (editingCustomer) {
        await api.patch(
          `/customers/${editingCustomer._id}`,
          payload
        );

        setSuccess(
          "Customer updated successfully."
        );
      } else {
        await api.post(
          "/customers",
          payload
        );

        setSuccess(
          "Customer created successfully."
        );
      }

      setShowForm(false);

      setEditingCustomer(null);

      setForm({
        ...EMPTY_FORM,
      });

      await fetchCustomers();
    } catch (error) {
      console.error(
        "Saving customer failed:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to save customer."
      );
    } finally {
      setSaving(false);
    }
  };


  // ====================================================
  // ACTIVATE / DEACTIVATE
  // ====================================================

  const toggleCustomerStatus = async (
    customer
  ) => {
    const action =
      customer.isActive
        ? "deactivate"
        : "activate";

    const confirmed =
      window.confirm(
        customer.isActive
          ? `Deactivate ${customer.name}?`
          : `Activate ${customer.name}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.patch(
        `/customers/${customer._id}/${action}`
      );

      setSuccess(
        customer.isActive
          ? "Customer deactivated successfully."
          : "Customer activated successfully."
      );

      await fetchCustomers();
    } catch (error) {
      console.error(
        "Customer status update failed:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to update customer status."
      );
    }
  };


  // ====================================================
  // VIEW CUSTOMER DETAILS
  // ====================================================

  const viewCustomer = async (
    customer
  ) => {
    try {
      setError("");

      setSelectedCustomer(
        customer
      );

      setLoadingSales(true);

      const response =
        await api.get(
          `/customers/${customer._id}/sales`
        );

      setCustomerSales(
        response.data.sales ||
          []
      );
    } catch (error) {
      console.error(
        "Failed to load customer sales:",
        error
      );

      setError(
        error.response?.data?.message ||
          "Failed to load customer history."
      );
    } finally {
      setLoadingSales(false);
    }
  };


  // ====================================================
  // CLOSE DETAILS
  // ====================================================

  const closeDetails = () => {
    setSelectedCustomer(
      null
    );

    setCustomerSales([]);
  };


  // ====================================================
  // PAGINATION
  // ====================================================

  const goToPage = (
    nextPage
  ) => {
    if (
      nextPage < 1 ||
      nextPage >
        pagination.pages
    ) {
      return;
    }

    setPage(nextPage);
  };


  // ====================================================
  // SUMMARY
  // ====================================================

  const totalCustomers =
    pagination.total;

  const totalSpent =
    customers.reduce(
      (sum, customer) =>
        sum +
        Number(
          customer.totalSpent ||
            0
        ),
      0
    );

  const totalOutstanding =
    customers.reduce(
      (sum, customer) =>
        sum +
        Number(
          customer.outstandingBalance ||
            0
        ),
      0
    );


  // ====================================================
  // RENDER
  // ====================================================

  return (
    <div className="space-y-6">

      {/* ================================================
          HEADER
      ================================================ */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Customers
          </h1>

          <p className="mt-1 text-slate-500">
            Manage customer profiles,
            purchases, credit and MOVA loyalty rewards. Customers earn 1 point per UGX 1,000 spent.
          </p>
        </div>


        <button
          type="button"
          onClick={
            openAddForm
          }
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700"
        >
          <Plus size={19} />

          Add Customer
        </button>

      </div>


      {/* ================================================
          FEEDBACK
      ================================================ */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">

          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <p className="text-sm font-medium">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="ml-auto"
          >
            <X size={18} />
          </button>

        </div>
      )}


      {success && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">

          <CheckCircle2
            size={20}
          />

          <p className="text-sm font-medium">
            {success}
          </p>

        </div>
      )}


      {/* ================================================
          SUMMARY CARDS
      ================================================ */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
              <User
                size={21}
                className="text-blue-600"
              />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Customers
              </p>

              <p className="mt-1 text-2xl font-black text-slate-900">
                {totalCustomers}
              </p>
            </div>

          </div>
        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
              <ShoppingBag
                size={21}
                className="text-emerald-600"
              />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Sales
              </p>

              <p className="mt-1 text-xl font-black text-slate-900">
                {formatCurrency(
                  totalSpent
                )}
              </p>
            </div>

          </div>
        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50">
              <Wallet
                size={21}
                className="text-amber-600"
              />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Outstanding
              </p>

              <p className="mt-1 text-xl font-black text-slate-900">
                {formatCurrency(
                  totalOutstanding
                )}
              </p>
            </div>

          </div>
        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50">
              <UserCheck
                size={21}
                className="text-violet-600"
              />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Status
              </p>

              <p className="mt-1 text-sm font-black text-slate-900">
                {status === "active"
                  ? "Active customers"
                  : "Inactive customers"}
              </p>
            </div>

          </div>
        </div>

      </div>


      {/* ================================================
          FILTERS
      ================================================ */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="flex flex-col gap-3 lg:flex-row">

          <div className="relative flex-1">

            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(
                event
              ) => {
                setSearch(
                  event.target.value
                );

                setPage(1);
              }}
              placeholder="Search customers by name, phone or email..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

          </div>


          <select
            value={status}
            onChange={(
              event
            ) => {
              setStatus(
                event.target.value
              );

              setPage(1);
            }}
            className="rounded-xl border border-slate-200 px-4 py-3 font-medium text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>

            <option value="all">
              All Customers
            </option>
          </select>

        </div>

      </div>


      {/* ================================================
          CUSTOMER TABLE
      ================================================ */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {loading ? (
          <div className="flex min-h-80 items-center justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          </div>
        ) : customers.length ===
          0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">

            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <User
                size={30}
                className="text-slate-400"
              />
            </div>

            <h3 className="mt-4 font-bold text-slate-700">
              No customers found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Add your first customer
              or change your search
              filters.
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">

            <table className="min-w-[900px] w-full">

              <thead className="border-b border-slate-100 bg-slate-50">

                <tr>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                    Customer
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-400">
                    Contact
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                    Orders
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                    Total Spent
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                    Credit
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-400">
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-slate-100">

                {customers.map(
                  (customer) => (
                    <tr
                      key={
                        customer._id
                      }
                      className="transition hover:bg-slate-50"
                    >

                      {/* Customer */}

                      <td className="px-5 py-4">

                        <button
                          type="button"
                          onClick={() =>
                            viewCustomer(
                              customer
                            )
                          }
                          className="flex items-center gap-3 text-left"
                        >

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50">
                            <User
                              size={18}
                              className="text-blue-600"
                            />
                          </div>

                          <div>
                            <p className="font-bold text-slate-900">
                              {
                                customer.name
                              }
                            </p>

                            <p className="text-xs text-slate-400">
                              {getLoyaltyTier(customer.lifetimeLoyaltyPoints)} member · {Number(customer.loyaltyPoints || 0).toLocaleString("en-UG")} points
                            </p>
                          </div>

                        </button>

                      </td>


                      {/* Contact */}

                      <td className="px-5 py-4">

                        <div className="space-y-1">

                          {customer.phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                              <Phone
                                size={14}
                              />

                              {
                                customer.phone
                              }
                            </div>
                          )}

                          {customer.email && (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Mail
                                size={14}
                              />

                              {
                                customer.email
                              }
                            </div>
                          )}

                        </div>

                      </td>


                      {/* Orders */}

                      <td className="px-5 py-4 text-right font-bold text-slate-700">
                        {
                          customer.totalOrders
                        }
                      </td>


                      {/* Spent */}

                      <td className="px-5 py-4 text-right font-bold text-slate-900">
                        {formatCurrency(
                          customer.totalSpent
                        )}
                      </td>


                      {/* Credit */}

                      <td className="px-5 py-4 text-right">

                        <div>
                          <p
                            className={`font-bold ${
                              Number(
                                customer.outstandingBalance ||
                                  0
                              ) > 0
                                ? "text-amber-600"
                                : "text-slate-700"
                            }`}
                          >
                            {formatCurrency(
                              customer.outstandingBalance
                            )}
                          </p>

                          <p className="text-xs text-slate-400">
                            Limit{" "}
                            {formatCurrency(
                              customer.creditLimit
                            )}
                          </p>
                        </div>

                      </td>


                      {/* Status */}

                      <td className="px-5 py-4 text-right">

                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            customer.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {customer.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>

                      </td>


                      {/* Actions */}

                      <td className="px-5 py-4">

                        <div className="flex justify-end gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              viewCustomer(
                                customer
                              )
                            }
                            title="View customer"
                            className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <User
                              size={17}
                            />
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              openEditForm(
                                customer
                              )
                            }
                            title="Edit customer"
                            className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit3
                              size={17}
                            />
                          </button>


                          <button
                            type="button"
                            onClick={() =>
                              toggleCustomerStatus(
                                customer
                              )
                            }
                            title={
                              customer.isActive
                                ? "Deactivate"
                                : "Activate"
                            }
                            className={`rounded-lg p-2 ${
                              customer.isActive
                                ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
                                : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                            }`}
                          >
                            {customer.isActive ? (
                              <UserX
                                size={17}
                              />
                            ) : (
                              <UserCheck
                                size={17}
                              />
                            )}
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


      {/* ================================================
          PAGINATION
      ================================================ */}

      {pagination.pages >
        1 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">

          <p className="text-sm text-slate-500">
            Page{" "}
            <span className="font-bold text-slate-700">
              {pagination.page}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-700">
              {pagination.pages}
            </span>
          </p>


          <div className="flex gap-2">

            <button
              type="button"
              onClick={() =>
                goToPage(
                  page - 1
                )
              }
              disabled={
                page === 1
              }
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={() =>
                goToPage(
                  page + 1
                )
              }
              disabled={
                page ===
                pagination.pages
              }
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>

          </div>

        </div>
      )}


      {/* ================================================
          ADD / EDIT MODAL
      ================================================ */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">

              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingCustomer
                    ? "Edit Customer"
                    : "Add Customer"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingCustomer
                    ? "Update customer information."
                    : "Create a customer profile for your business."}
                </p>
              </div>


              <button
                type="button"
                onClick={
                  closeForm
                }
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>

            </div>


            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-5 p-6"
            >

              <div className="grid gap-5 sm:grid-cols-2">

                {/* Name */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Customer Name *
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={
                      form.name
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. John Doe"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />

                </div>


                {/* Phone */}

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Phone
                  </label>

                  <input
                    type="tel"
                    name="phone"
                    value={
                      form.phone
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="0700123456"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>


                {/* Email */}

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={
                      form.email
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="customer@example.com"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>


                {/* Address */}

                <div className="sm:col-span-2">

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Address
                  </label>

                  <input
                    type="text"
                    name="address"
                    value={
                      form.address
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Customer address"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>


                {/* Credit limit */}

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Credit Limit
                  </label>

                  <input
                    type="number"
                    min="0"
                    name="creditLimit"
                    value={
                      form.creditLimit
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Maximum amount the
                    customer may owe.
                  </p>

                </div>


                {/* Notes */}

                <div>

                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Notes
                  </label>

                  <input
                    type="text"
                    name="notes"
                    value={
                      form.notes
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Optional notes"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                </div>

              </div>


              {/* Form actions */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={
                    saving
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={18}
                      />

                      {editingCustomer
                        ? "Update Customer"
                        : "Create Customer"}
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}


      {/* ================================================
          CUSTOMER DETAILS MODAL
      ================================================ */}

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            {/* Header */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                  <User
                    size={22}
                    className="text-blue-600"
                  />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {
                      selectedCustomer.name
                    }
                  </h2>

                  <p className="text-sm text-slate-500">
                    Customer profile
                  </p>
                </div>

              </div>


              <button
                type="button"
                onClick={
                  closeDetails
                }
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>

            </div>


            <div className="space-y-6 p-6">

              {/* Customer statistics */}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">

                <div className="rounded-2xl bg-slate-50 p-4">

                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Orders
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {
                      selectedCustomer.totalOrders
                    }
                  </p>

                </div>


                <div className="rounded-2xl bg-slate-50 p-4">

                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Total Spent
                  </p>

                  <p className="mt-2 text-xl font-black text-blue-600">
                    {formatCurrency(
                      selectedCustomer.totalSpent
                    )}
                  </p>

                </div>


                <div className="rounded-2xl bg-slate-50 p-4">

                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Outstanding
                  </p>

                  <p className="mt-2 text-xl font-black text-amber-600">
                    {formatCurrency(
                      selectedCustomer.outstandingBalance
                    )}
                  </p>

                </div>


                <div className="rounded-2xl bg-slate-50 p-4">

                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Credit Limit
                  </p>

                  <p className="mt-2 text-xl font-black text-slate-900">
                    {formatCurrency(
                      selectedCustomer.creditLimit
                    )}
                  </p>

                </div>

                <div className="rounded-2xl bg-violet-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-500">
                    MOVA rewards
                  </p>
                  <p className="mt-2 text-xl font-black text-violet-800">
                    {Number(selectedCustomer.loyaltyPoints || 0).toLocaleString("en-UG")} points
                  </p>
                  <p className="mt-1 text-xs font-semibold text-violet-600">
                    {getLoyaltyTier(selectedCustomer.lifetimeLoyaltyPoints)} member · lifetime {Number(selectedCustomer.lifetimeLoyaltyPoints || 0).toLocaleString("en-UG")} points
                  </p>
                  {getNextLoyaltyTier(selectedCustomer.lifetimeLoyaltyPoints) && (
                    <p className="mt-1 text-xs text-violet-600">
                      {getNextLoyaltyTier(selectedCustomer.lifetimeLoyaltyPoints).remaining.toLocaleString("en-UG")} points to {getNextLoyaltyTier(selectedCustomer.lifetimeLoyaltyPoints).name}
                    </p>
                  )}
                </div>

              </div>


              {/* Contact information */}

              <div className="rounded-2xl border border-slate-200 p-5">

                <h3 className="font-black text-slate-900">
                  Customer Information
                </h3>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">

                  <div className="flex items-center gap-3">
                    <Phone
                      size={18}
                      className="text-slate-400"
                    />

                    <div>
                      <p className="text-xs text-slate-400">
                        Phone
                      </p>

                      <p className="font-medium text-slate-700">
                        {selectedCustomer.phone ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>


                  <div className="flex items-center gap-3">
                    <Mail
                      size={18}
                      className="text-slate-400"
                    />

                    <div>
                      <p className="text-xs text-slate-400">
                        Email
                      </p>

                      <p className="font-medium text-slate-700">
                        {selectedCustomer.email ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>

                </div>

              </div>


              {/* Purchase history */}

              <div>

                <div className="flex items-center justify-between">

                  <div>
                    <h3 className="font-black text-slate-900">
                      Purchase History
                    </h3>

                    <p className="text-sm text-slate-500">
                      Sales linked to this
                      customer.
                    </p>
                  </div>

                </div>


                {loadingSales ? (
                  <div className="flex min-h-40 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
                  </div>
                ) : customerSales.length ===
                  0 ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-8 text-center">

                    <ShoppingBag
                      size={35}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-3 font-bold text-slate-600">
                      No purchases yet
                    </p>

                  </div>
                ) : (
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">

                    <table className="min-w-[650px] w-full">

                      <thead className="bg-slate-50">

                        <tr>

                          <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                            Receipt
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                            Date
                          </th>

                          <th className="px-4 py-3 text-left text-xs font-black uppercase text-slate-400">
                            Payment
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-400">
                            Total
                          </th>

                          <th className="px-4 py-3 text-right text-xs font-black uppercase text-slate-400">
                            Status
                          </th>

                        </tr>

                      </thead>


                      <tbody className="divide-y divide-slate-100">

                        {customerSales.map(
                          (sale) => (
                            <tr
                              key={
                                sale._id
                              }
                            >

                              <td className="px-4 py-3 font-bold text-slate-800">
                                {
                                  sale.receiptNumber
                                }
                              </td>

                              <td className="px-4 py-3 text-sm text-slate-500">
                                {new Date(
                                  sale.createdAt
                                ).toLocaleDateString(
                                  "en-UG"
                                )}
                              </td>

                              <td className="px-4 py-3 text-sm font-medium text-slate-600">
                                {sale.paymentMethod?.replace(
                                  "_",
                                  " "
                                )}
                              </td>

                              <td className="px-4 py-3 text-right font-bold text-slate-900">
                                {formatCurrency(
                                  sale.total
                                )}
                              </td>

                              <td className="px-4 py-3 text-right">

                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                  {
                                    sale.status
                                  }
                                </span>

                              </td>

                            </tr>
                          )
                        )}

                      </tbody>

                    </table>

                  </div>
                )}

              </div>


              {/* Actions */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closeDetails
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    closeDetails();
                    openEditForm(
                      selectedCustomer
                    );
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700"
                >
                  <Edit3
                    size={17}
                  />

                  Edit Customer
                </button>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};


export default Customers;
