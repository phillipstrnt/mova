import { useEffect, useMemo, useState } from "react";
import api from "../../api";

const emptyForm = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  taxNumber: "",
  notes: "",
};

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editingSupplier, setEditingSupplier] =
    useState(null);

  const [form, setForm] =
    useState(emptyForm);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get("/suppliers");

      setSuppliers(
        response.data.suppliers || []
      );
    } catch (err) {
      console.error(
        "Fetch suppliers error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load suppliers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers =
    useMemo(() => {
      const value =
        search.trim().toLowerCase();

      if (!value) {
        return suppliers;
      }

      return suppliers.filter(
        (supplier) =>
          supplier.name
            ?.toLowerCase()
            .includes(value) ||
          supplier.contactPerson
            ?.toLowerCase()
            .includes(value) ||
          supplier.phone
            ?.toLowerCase()
            .includes(value) ||
          supplier.email
            ?.toLowerCase()
            .includes(value)
      );
    },
    [suppliers, search]);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEditModal = (supplier) => {
    setEditingSupplier(supplier);

    setForm({
      name: supplier.name || "",
      contactPerson:
        supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      taxNumber:
        supplier.taxNumber || "",
      notes: supplier.notes || "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingSupplier(null);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError(
        "Supplier name is required."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingSupplier) {
        await api.put(
          `/suppliers/${editingSupplier._id}`,
          form
        );

        setSuccess(
          "Supplier updated successfully."
        );
      } else {
        await api.post(
          "/suppliers",
          form
        );

        setSuccess(
          "Supplier created successfully."
        );
      }

      await fetchSuppliers();

      setTimeout(() => {
        setShowModal(false);
        setEditingSupplier(null);
        setForm(emptyForm);
        setSuccess("");
      }, 700);
    } catch (err) {
      console.error(
        "Save supplier error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to save supplier."
      );
    } finally {
      setSaving(false);
    }
  };

  const deactivateSupplier =
    async (supplier) => {
      const confirmed =
        window.confirm(
          `Deactivate ${supplier.name}?`
        );

      if (!confirmed) return;

      try {
        setError("");
        setSuccess("");

        await api.delete(
          `/suppliers/${supplier._id}`
        );

        setSuccess(
          "Supplier deactivated successfully."
        );

        await fetchSuppliers();
      } catch (err) {
        console.error(
          "Deactivate supplier error:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Failed to deactivate supplier."
        );
      }
    };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Suppliers
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage the businesses and people
            that supply your products.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white transition hover:bg-slate-800"
        >
          + Add Supplier
        </button>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {success}
        </div>
      )}

      {/* SEARCH */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search suppliers by name, contact, phone or email..."
          className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-400"
        />
      </div>

      {/* SUPPLIER TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-500">
            Loading suppliers...
          </div>
        ) : filteredSuppliers.length ===
          0 ? (
          <div className="p-10 text-center">
            <div className="text-4xl">
              📦
            </div>

            <h3 className="mt-3 font-bold text-slate-900">
              No suppliers found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add your first supplier to
              start receiving purchases.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Supplier
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Contact
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Phone
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Email
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map(
                  (supplier) => (
                    <tr
                      key={supplier._id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {supplier.name}
                        </div>

                        {supplier.address && (
                          <div className="text-xs text-slate-500">
                            {supplier.address}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {supplier.contactPerson ||
                          "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {supplier.phone ||
                          "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {supplier.email ||
                          "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            supplier.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {supplier.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() =>
                              openEditModal(
                                supplier
                              )
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100"
                          >
                            Edit
                          </button>

                          {supplier.isActive && (
                            <button
                              onClick={() =>
                                deactivateSupplier(
                                  supplier
                                )
                              }
                              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                            >
                              Deactivate
                            </button>
                          )}
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

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingSupplier
                    ? "Edit Supplier"
                    : "Add Supplier"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter supplier information
                  below.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="text-2xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Supplier Name *
                  </label>

                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="ABC Distributors"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Contact Person
                  </label>

                  <input
                    name="contactPerson"
                    value={
                      form.contactPerson
                    }
                    onChange={handleChange}
                    placeholder="John Doe"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Phone
                  </label>

                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="0700000000"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="supplier@example.com"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Address
                  </label>

                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Kampala"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Tax Number
                  </label>

                  <input
                    name="taxNumber"
                    value={form.taxNumber}
                    onChange={handleChange}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Notes
                </label>

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Additional supplier information..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-5 py-3 font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingSupplier
                    ? "Update Supplier"
                    : "Create Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;