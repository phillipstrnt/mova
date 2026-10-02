import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CalendarDays,
  Edit3,
  Plus,
  Search,
  X,
  XCircle,
} from "lucide-react";

import api from "../../api";

const expenseCategories = [
  "Rent",
  "Electricity",
  "Water",
  "Transport",
  "Salaries",
  "Internet",
  "Airtime",
  "Repairs",
  "Marketing",
  "Office Supplies",
  "Other",
];

const paymentMethods = [
  "CASH",
  "MOBILE_MONEY",
  "CARD",
  "BANK",
];

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

const createInitialForm = () => ({
  category: "",
  description: "",
  amount: "",
  paymentMethod: "CASH",
  expenseDate: getToday(),
  reference: "",
  notes: "",
});

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [showModal, setShowModal] = useState(false);

  const [editingExpense, setEditingExpense] =
    useState(null);

  const [form, setForm] = useState(
    createInitialForm()
  );

  /*
  |--------------------------------------------------------------------------
  | Load expenses
  |--------------------------------------------------------------------------
  */

  const loadExpenses = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/expenses",
        {
          params: {
            search,
            category: categoryFilter,
            status: "ACTIVE",
          },
        }
      );

      setExpenses(
        response.data?.expenses || []
      );
    } catch (error) {
      console.error(
        "Failed to load expenses:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to load expenses"
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Load when filters change
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadExpenses();
  }, [search, categoryFilter]);

  /*
  |--------------------------------------------------------------------------
  | Total expenses
  |--------------------------------------------------------------------------
  */

  const totalExpenses = useMemo(() => {
    return expenses.reduce(
      (total, expense) =>
        total + Number(expense.amount || 0),
      0
    );
  }, [expenses]);

  /*
  |--------------------------------------------------------------------------
  | Open create modal
  |--------------------------------------------------------------------------
  */

  const openCreateModal = () => {
    setEditingExpense(null);

    setForm(createInitialForm());

    setShowModal(true);
  };

  /*
  |--------------------------------------------------------------------------
  | Open edit modal
  |--------------------------------------------------------------------------
  */

  const openEditModal = (expense) => {
    setEditingExpense(expense);

    setForm({
      category: expense.category || "",

      description:
        expense.description || "",

      amount:
        expense.amount ?? "",

      paymentMethod:
        expense.paymentMethod || "CASH",

      expenseDate: expense.expenseDate
        ? new Date(expense.expenseDate)
            .toISOString()
            .split("T")[0]
        : getToday(),

      reference:
        expense.reference || "",

      notes:
        expense.notes || "",
    });

    setShowModal(true);
  };

  /*
  |--------------------------------------------------------------------------
  | Close modal
  |--------------------------------------------------------------------------
  */

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);

    setEditingExpense(null);

    setForm(createInitialForm());
  };

  /*
  |--------------------------------------------------------------------------
  | Handle form changes
  |--------------------------------------------------------------------------
  */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | Submit form
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.category) {
      alert("Please select an expense category.");
      return;
    }

    if (!form.description.trim()) {
      alert("Please enter an expense description.");
      return;
    }

    if (
      !form.amount ||
      Number(form.amount) <= 0
    ) {
      alert(
        "Please enter a valid expense amount."
      );
      return;
    }

    if (!form.paymentMethod) {
      alert("Please select a payment method.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        category: form.category,
        description: form.description.trim(),
        amount: Number(form.amount),
        paymentMethod: form.paymentMethod,
        expenseDate: form.expenseDate,
        reference: form.reference.trim(),
        notes: form.notes.trim(),
      };

      if (editingExpense) {
        await api.put(
          `/expenses/${editingExpense._id}`,
          payload
        );
      } else {
        await api.post(
          "/expenses",
          payload
        );
      }

      setShowModal(false);

      setEditingExpense(null);

      setForm(createInitialForm());

      await loadExpenses();
    } catch (error) {
      console.error(
        "Failed to save expense:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to save expense"
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Cancel expense
  |--------------------------------------------------------------------------
  */

  const handleCancelExpense = async (
    expense
  ) => {
    const confirmed = window.confirm(
      `Cancel expense "${expense.description}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.post(
        `/expenses/${expense._id}/cancel`
      );

      await loadExpenses();
    } catch (error) {
      console.error(
        "Failed to cancel expense:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Failed to cancel expense"
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Currency formatter
  |--------------------------------------------------------------------------
  */

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(
      "en-UG",
      {
        style: "currency",
        currency: "UGX",
        maximumFractionDigits: 0,
      }
    ).format(Number(amount || 0));
  };

  /*
  |--------------------------------------------------------------------------
  | Date formatter
  |--------------------------------------------------------------------------
  */

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString(
      "en-GB"
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Payment method display
  |--------------------------------------------------------------------------
  */

  const formatPaymentMethod = (method) => {
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

  return (
    <div className="space-y-6">
      {/* ================================================================
          HEADER
      ================================================================= */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Banknote size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-950">
                Expenses
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Track and manage your business
                expenses.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
        >
          <Plus size={18} />

          Add Expense
        </button>
      </div>

      {/* ================================================================
          SUMMARY CARDS
      ================================================================= */}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Total */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                Total Expenses
              </p>

              <p className="mt-2 text-2xl font-black text-slate-950">
                {formatCurrency(
                  totalExpenses
                )}
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Banknote size={22} />
            </div>
          </div>
        </div>

        {/* Count */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Active Expenses
          </p>

          <p className="mt-2 text-2xl font-black text-slate-950">
            {expenses.length}
          </p>
        </div>
      </div>

      {/* ================================================================
          FILTERS
      ================================================================= */}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_240px]">
          {/* Search */}
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search expenses..."
              className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">
              All Categories
            </option>

            {expenseCategories.map(
              (category) => (
                <option
                  key={category}
                  value={category}
                >
                  {category}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* ================================================================
          EXPENSE TABLE
      ================================================================= */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Date
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Category
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Description
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Payment
                </th>

                <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-400">
                  Amount
                </th>

                <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* Loading */}
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-12 text-center text-sm text-slate-400"
                  >
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                /* Empty */
                <tr>
                  <td
                    colSpan="6"
                    className="px-5 py-14 text-center"
                  >
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Banknote size={24} />
                    </div>

                    <p className="mt-4 font-bold text-slate-700">
                      No expenses found
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      Add your first business
                      expense.
                    </p>

                    <button
                      type="button"
                      onClick={
                        openCreateModal
                      }
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
                    >
                      <Plus size={16} />

                      Add Expense
                    </button>
                  </td>
                </tr>
              ) : (
                /* Rows */
                expenses.map((expense) => (
                  <tr
                    key={expense._id}
                    className="transition hover:bg-slate-50"
                  >
                    {/* Date */}
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <CalendarDays
                          size={15}
                          className="text-slate-400"
                        />

                        {formatDate(
                          expense.expenseDate
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {expense.category}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800">
                        {expense.description}
                      </p>

                      {expense.reference && (
                        <p className="mt-1 text-xs text-slate-400">
                          Ref:{" "}
                          {expense.reference}
                        </p>
                      )}
                    </td>

                    {/* Payment */}
                    <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                      {formatPaymentMethod(
                        expense.paymentMethod
                      )}
                    </td>

                    {/* Amount */}
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-black text-slate-900">
                      {formatCurrency(
                        expense.amount
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(
                              expense
                            )
                          }
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
                          title="Edit expense"
                        >
                          <Edit3 size={17} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleCancelExpense(
                              expense
                            )
                          }
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          title="Cancel expense"
                        >
                          <XCircle size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================
          MODAL
      ================================================================= */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  {editingExpense
                    ? "Edit Expense"
                    : "Add Expense"}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Record a business expense.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              {/* Category + Amount */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Category *
                  </label>

                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      Select category
                    </option>

                    {expenseCategories.map(
                      (category) => (
                        <option
                          key={category}
                          value={category}
                        >
                          {category}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Amount (UGX) *
                  </label>

                  <input
                    type="number"
                    name="amount"
                    value={form.amount}
                    onChange={handleChange}
                    min="1"
                    step="1"
                    required
                    placeholder="0"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Description *
                </label>

                <input
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Monthly shop rent"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Payment + Date */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Payment Method *
                  </label>

                  <select
                    name="paymentMethod"
                    value={
                      form.paymentMethod
                    }
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
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
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Expense Date *
                  </label>

                  <input
                    type="date"
                    name="expenseDate"
                    value={
                      form.expenseDate
                    }
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Reference
                </label>

                <input
                  type="text"
                  name="reference"
                  value={form.reference}
                  onChange={handleChange}
                  placeholder="Receipt, invoice or transaction number"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Additional notes..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingExpense
                    ? "Update Expense"
                    : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;