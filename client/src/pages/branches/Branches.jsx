
import {
  Building2,
  CheckCircle2,
  Edit3,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";


const emptyForm = {
  name: "",
  code: "",
  phone: "",
  address: "",
  managerId: "",
};


const formatDate = (value) => {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString(
      "en-UG",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return "—";
  }
};


const Branches = () => {
  const {
    user,
    branch: activeBranch,
    branches: authBranches,
    setBranches,
  } = useAuth();

  const [branches, setLocalBranches] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editingBranch, setEditingBranch] =
    useState(null);

  const [form, setForm] =
    useState(emptyForm);


  /*
  |--------------------------------------------------------------------------
  | LOAD BRANCHES
  |--------------------------------------------------------------------------
  */

  const loadBranches = async (
    showRefresh = false
  ) => {
    try {
      setError("");

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response =
        await api.get(
          "/branches"
        );

      const data =
        response?.data || {};

      const branchList =
        Array.isArray(
          data.branches
        )
          ? data.branches
          : [];

      setLocalBranches(
        branchList
      );

      /*
       * Keep AuthContext/local storage
       * synchronized with the latest branches.
       */

      setBranches?.(
        branchList
      );

      localStorage.setItem(
        "mova_branches",
        JSON.stringify(
          branchList
        )
      );
    } catch (err) {
      console.error(
        "Failed to load branches:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to load branches."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | LOAD USERS
  |--------------------------------------------------------------------------
  */

  const loadUsers = async () => {
    try {
      const response =
        await api.get(
          "/branches/users"
        );

      const data =
        response?.data || {};

      setUsers(
        Array.isArray(
          data.users
        )
          ? data.users
          : []
      );
    } catch (err) {
      /*
       * Loading users is optional.
       *
       * A Manager can still create a branch
       * and automatically become its manager.
       */

      console.warn(
        "Could not load branch managers:",
        err?.response?.data
          ?.message ||
          err?.message
      );

      setUsers([]);
    }
  };


  useEffect(() => {
    loadBranches();
    loadUsers();
  }, []);


  /*
  |--------------------------------------------------------------------------
  | FILTER
  |--------------------------------------------------------------------------
  */

  const filteredBranches =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return branches;
      }

      return branches.filter(
        (item) =>
          item?.name
            ?.toLowerCase()
            .includes(query) ||
          item?.code
            ?.toLowerCase()
            .includes(query) ||
          item?.phone
            ?.toLowerCase()
            .includes(query) ||
          item?.address
            ?.toLowerCase()
            .includes(query) ||
          item?.managerId?.name
            ?.toLowerCase()
            .includes(query)
      );
    }, [
      branches,
      search,
    ]);


  /*
  |--------------------------------------------------------------------------
  | OPEN CREATE
  |--------------------------------------------------------------------------
  */

  const openCreate = () => {
    setEditingBranch(null);

    setForm({
      ...emptyForm,
    });

    setError("");
    setSuccess("");

    setShowModal(true);
  };


  /*
  |--------------------------------------------------------------------------
  | OPEN EDIT
  |--------------------------------------------------------------------------
  */

  const openEdit = (item) => {
    setEditingBranch(
      item
    );

    setForm({
      name:
        item?.name || "",
      code:
        item?.code || "",
      phone:
        item?.phone || "",
      address:
        item?.address || "",
      managerId:
        item?.managerId?._id ||
        item?.managerId ||
        "",
    });

    setError("");
    setSuccess("");

    setShowModal(true);
  };


  /*
  |--------------------------------------------------------------------------
  | CLOSE MODAL
  |--------------------------------------------------------------------------
  */

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingBranch(null);

    setForm({
      ...emptyForm,
    });
  };


  /*
  |--------------------------------------------------------------------------
  | INPUT
  |--------------------------------------------------------------------------
  */

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


  /*
  |--------------------------------------------------------------------------
  | SAVE
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError(
        "Branch name is required."
      );
      return;
    }

    if (!form.code.trim()) {
      setError(
        "Branch code is required."
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name:
          form.name.trim(),
        code:
          form.code.trim(),
        phone:
          form.phone.trim(),
        address:
          form.address.trim(),
        managerId:
          form.managerId || undefined,
      };

      let response;

      if (editingBranch) {
        response =
          await api.put(
            `/branches/${editingBranch._id}`,
            payload
          );
      } else {
        response =
          await api.post(
            "/branches",
            payload
          );
      }

      const data =
        response?.data || {};

      const savedBranch =
        data?.branch;

      if (savedBranch) {
        setLocalBranches(
          (current) => {
            if (!editingBranch) {
              return [
                ...current,
                savedBranch,
              ];
            }

            return current.map(
              (item) =>
                item._id ===
                savedBranch._id
                  ? savedBranch
                  : item
            );
          }
        );
      }

      setSuccess(
        editingBranch
          ? "Branch updated successfully."
          : "Branch created successfully."
      );

      setShowModal(false);

      setEditingBranch(null);

      setForm({
        ...emptyForm,
      });

      /*
       * Reload from backend to guarantee
       * the list is authoritative.
       */

      await loadBranches(true);

      window.dispatchEvent(
        new CustomEvent(
          "mova:branch-changed"
        )
      );

      window.dispatchEvent(
        new CustomEvent(
          "mova:data-changed",
          {
            detail: {
              type: editingBranch
                ? "branch-updated"
                : "branch-created",
            },
          }
        )
      );
    } catch (err) {
      console.error(
        "Failed to save branch:",
        err
      );

      setError(
        err?.response?.data?.message ||
          "Unable to save branch."
      );
    } finally {
      setSaving(false);
    }
  };


  /*
  |--------------------------------------------------------------------------
  | TOGGLE ACTIVE
  |--------------------------------------------------------------------------
  */

  const toggleBranchStatus =
    async (item) => {
      try {
        setError("");

        await api.put(
          `/branches/${item._id}`,
          {
            isActive:
              !item.isActive,
          }
        );

        await loadBranches(true);

        window.dispatchEvent(
          new CustomEvent(
            "mova:branch-changed"
          )
        );
      } catch (err) {
        console.error(
          "Failed to update branch status:",
          err
        );

        setError(
          err?.response?.data?.message ||
            "Unable to update branch status."
        );
      }
    };


  /*
  |--------------------------------------------------------------------------
  | STATISTICS
  |--------------------------------------------------------------------------
  */

  const activeCount =
    branches.filter(
      (item) =>
        item.isActive
    ).length;

  const inactiveCount =
    branches.filter(
      (item) =>
        !item.isActive
    ).length;


  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">

      {/* HEADER */}

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
              <Building2 size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">
                Branches
              </h1>

              <p className="text-sm text-slate-500">
                Manage your business locations and branch access.
              </p>
            </div>
          </div>
        </div>


        <div className="flex flex-wrap gap-2">

          <button
            type="button"
            onClick={() =>
              loadBranches(true)
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
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


          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <Plus size={17} />

            New Branch
          </button>

        </div>
      </div>


      {/* ALERTS */}

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <X
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>
            {error}
          </span>
        </div>
      )}


      {success && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>
            {success}
          </span>
        </div>
      )}


      {/* STATISTICS */}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            Total Branches
          </p>

          <p className="mt-2 text-3xl font-black text-slate-950">
            {branches.length}
          </p>
        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            Active
          </p>

          <p className="mt-2 text-3xl font-black text-emerald-600">
            {activeCount}
          </p>
        </div>


        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            Inactive
          </p>

          <p className="mt-2 text-3xl font-black text-slate-500">
            {inactiveCount}
          </p>
        </div>

      </div>


      {/* SEARCH */}

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

        <div className="relative">

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
            placeholder="Search branches..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />

        </div>

      </div>


      {/* BRANCHES */}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <RefreshCw
              size={28}
              className="animate-spin text-blue-600"
            />
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">

            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Building2 size={26} />
            </div>

            <h3 className="text-base font-black text-slate-900">
              No branches found
            </h3>

            <p className="mt-1 max-w-md text-sm text-slate-500">
              Create your first branch to start managing multiple business locations.
            </p>

            <button
              type="button"
              onClick={openCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Create Branch
            </button>

          </div>
        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[850px]">

              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-400">
                    Branch
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-400">
                    Manager
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-400">
                    Contact
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-400">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wider text-slate-400">
                    Created
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-400">
                    Actions
                  </th>

                </tr>
              </thead>


              <tbody>

                {filteredBranches.map(
                  (item) => {

                    const isCurrent =
                      activeBranch?._id ===
                        item._id ||
                      activeBranch?.id ===
                        item._id;

                    return (
                      <tr
                        key={item._id}
                        className={`border-b border-slate-100 last:border-0 ${
                          isCurrent
                            ? "bg-blue-50/40"
                            : "hover:bg-slate-50"
                        }`}
                      >

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                              <Building2
                                size={18}
                              />
                            </div>

                            <div>
                              <p className="font-black text-slate-900">
                                {item.name}
                              </p>

                              <p className="text-xs font-bold text-slate-400">
                                {item.code}

                                {isCurrent && (
                                  <span className="ml-2 text-blue-600">
                                    • Current
                                  </span>
                                )}
                              </p>
                            </div>

                          </div>

                        </td>


                        <td className="px-5 py-4">

                          {item.managerId ? (
                            <div className="flex items-center gap-2">

                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                <UserRound
                                  size={15}
                                />
                              </div>

                              <div>
                                <p className="text-sm font-bold text-slate-800">
                                  {item.managerId.name}
                                </p>

                                <p className="text-xs text-slate-400">
                                  {item.managerId.email}
                                </p>
                              </div>

                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Not assigned
                            </span>
                          )}

                        </td>


                        <td className="px-5 py-4">

                          <div className="space-y-1">

                            {item.phone && (
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Phone
                                  size={13}
                                />
                                {item.phone}
                              </div>
                            )}

                            {item.address && (
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <MapPin
                                  size={13}
                                />
                                {item.address}
                              </div>
                            )}

                            {!item.phone &&
                              !item.address && (
                                <span className="text-sm text-slate-400">
                                  —
                                </span>
                              )}

                          </div>

                        </td>


                        <td className="px-5 py-4">

                          <button
                            type="button"
                            onClick={() =>
                              toggleBranchStatus(
                                item
                              )
                            }
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ${
                              item.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                item.isActive
                                  ? "bg-emerald-500"
                                  : "bg-slate-400"
                              }`}
                            />

                            {item.isActive
                              ? "Active"
                              : "Inactive"}
                          </button>

                        </td>


                        <td className="px-5 py-4 text-sm text-slate-500">
                          {formatDate(
                            item.createdAt
                          )}
                        </td>


                        <td className="px-5 py-4 text-right">

                          <button
                            type="button"
                            onClick={() =>
                              openEdit(
                                item
                              )
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            <Edit3
                              size={14}
                            />
                            Edit
                          </button>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>
        )}

      </div>


      {/* MODAL */}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">

          <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {editingBranch
                    ? "Edit Branch"
                    : "Create New Branch"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingBranch
                    ? "Update branch information."
                    : "Add another location to your business."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>

            </div>


            {/* FORM */}

            <form
              onSubmit={
                handleSubmit
              }
              className="max-h-[75vh] overflow-y-auto p-6"
            >

              <div className="grid gap-5 sm:grid-cols-2">

                {/* NAME */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Branch Name
                  </label>

                  <input
                    name="name"
                    value={form.name}
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Kampala Branch"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>


                {/* CODE */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Branch Code
                  </label>

                  <input
                    name="code"
                    value={form.code}
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. KLA01"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Must be unique within your business.
                  </p>
                </div>


                {/* PHONE */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Phone
                  </label>

                  <input
                    name="phone"
                    value={form.phone}
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. 0700 000 000"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>


                {/* MANAGER */}

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Branch Manager
                  </label>

                  <select
                    name="managerId"
                    value={
                      form.managerId
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  >
                    <option value="">
                      {user?.role ===
                      "MANAGER"
                        ? "Assign me automatically"
                        : "No manager assigned"}
                    </option>

                    {users
                      .filter(
                        (item) =>
                          [
                            "OWNER",
                            "ADMIN",
                            "MANAGER",
                          ].includes(
                            item.role
                          )
                      )
                      .map(
                        (item) => (
                          <option
                            key={
                              item._id
                            }
                            value={
                              item._id
                            }
                          >
                            {item.name} —{" "}
                            {item.role}
                          </option>
                        )
                      )}

                  </select>
                </div>


                {/* ADDRESS */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Address / Location
                  </label>

                  <textarea
                    name="address"
                    value={
                      form.address
                    }
                    onChange={
                      handleChange
                    }
                    rows={3}
                    placeholder="e.g. Kampala Road, Kampala"
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

              </div>


              {/* FORM ERROR */}

              {error && (
                <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}


              {/* ACTIONS */}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>


                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving && (
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />
                  )}

                  {editingBranch
                    ? "Save Changes"
                    : "Create Branch"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
};


export default Branches;