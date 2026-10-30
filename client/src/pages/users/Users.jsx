
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Camera,
  Edit3,
  Eye,
  EyeOff,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Shield,
  UserCheck,
  UserPlus,
  UserX,
  Users as UsersIcon,
  X,
} from "lucide-react";

import api from "../../services/api";

/* =========================================================
   ROLES
========================================================= */

const ROLES = [
  {
    value: "ADMIN",
    label: "Administrator",
    description: "Manages most business operations and users.",
  },
  {
    value: "MANAGER",
    label: "Manager",
    description: "Manages daily operations, products and reports.",
  },
  {
    value: "CASHIER",
    label: "Cashier",
    description: "Handles POS sales, customers and receipts.",
  },
  {
    value: "INVENTORY_MANAGER",
    label: "Inventory Manager",
    description: "Manages products, stock, purchases and suppliers.",
  },
  {
    value: "ACCOUNTANT",
    label: "Accountant",
    description: "Handles expenses, payments and financial reports.",
  },
];

const ROLE_LIMITS = [
  { role: "OWNER", title: "Business Owner", limits: "Full access across the business, every branch, users, reports, and backups. The owner account cannot be assigned to another user." },
  { role: "ADMIN", title: "Administrator", limits: "Broad operational access, staff management, branch administration, and reports. Cannot manage or replace the owner account; backup and restore remain owner-only." },
  { role: "MANAGER", title: "Manager", limits: "Runs daily operations and reports for the assigned active branch. Cannot manage user accounts, remove branches, access backups, or view another branch unless assigned." },
  { role: "CASHIER", title: "Cashier", limits: "Creates sales, handles receipts, returns and customers, and manages own shift. Access is limited to assigned branch and own sales; no financial reports, expenses, or user administration." },
  { role: "INVENTORY_MANAGER", title: "Inventory Manager", limits: "Manages products, stock, transfers, suppliers, and purchases in assigned branches. Cannot manage users or access financial reports and business backups." },
  { role: "ACCOUNTANT", title: "Accountant", limits: "Views sales and financial reports, records expenses and payments, and works with assigned branches. Cannot create POS sales, manage stock, users, or backups." },
];

/* =========================================================
   HELPERS
========================================================= */

const getErrorMessage = (error, fallback) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
};

const getRoleLabel = (role) => {
  const found = ROLES.find(
    (item) => item.value === role
  );

  return found?.label || role || "User";
};

const getRoleClasses = (role) => {
  switch (role) {
    case "ADMIN":
      return "bg-purple-50 text-purple-700 border-purple-200";

    case "MANAGER":
      return "bg-blue-50 text-blue-700 border-blue-200";

    case "CASHIER":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "INVENTORY_MANAGER":
      return "bg-orange-50 text-orange-700 border-orange-200";

    case "ACCOUNTANT":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";

    case "OWNER":
      return "bg-slate-900 text-white border-slate-900";

    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

/* =========================================================
   DEFAULT FORM
========================================================= */

const DEFAULT_FORM = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "CASHIER",
  branchIds: [],
  profileImage: "",
};

const resizeProfileImage = (file) => new Promise((resolve, reject) => {
  const imageUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    const maxDimension = 480;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Unable to prepare this image."));
      return;
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/webp", 0.82);
    URL.revokeObjectURL(imageUrl);
    resolve(imageData.startsWith("data:image/webp") ? imageData : canvas.toDataURL("image/jpeg", 0.82));
  };
  image.onerror = () => {
    URL.revokeObjectURL(imageUrl);
    reject(new Error("Unable to read this image. Choose a JPG, PNG, or WebP photo."));
  };
  image.src = imageUrl;
});

/* =========================================================
   USERS COMPONENT
========================================================= */

export default function Users() {
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [showModal, setShowModal] = useState(false);
  const [showRoleGuide, setShowRoleGuide] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState(DEFAULT_FORM);

  /* =======================================================
     CURRENT USER
  ======================================================= */

  const currentUser = useMemo(() => {
    try {
      const stored = localStorage.getItem("mova_user");

      return stored
        ? JSON.parse(stored)
        : null;
    } catch {
      return null;
    }
  }, []);

  /* =======================================================
     LOAD USERS
  ======================================================= */

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};

      if (search.trim()) {
        params.search = search.trim();
      }

      if (roleFilter !== "ALL") {
        params.role = roleFilter;
      }

      if (statusFilter !== "ALL") {
        params.active =
          statusFilter === "ACTIVE";
      }

      const response = await api.get(
        "/users",
        {
          params,
        }
      );

      const data = response.data;

      const userData =
        data?.users ||
        data?.data ||
        [];

      setUsers(
        Array.isArray(userData)
          ? userData
          : []
      );
    } catch (requestError) {
      console.error(
        "MOVA users loading error:",
        requestError
      );

      setError(
        getErrorMessage(
          requestError,
          "Unable to load users."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     LOAD BRANCHES
  ======================================================= */

  const loadBranches = async () => {
    try {
      /*
       * Your existing MOVA session already stores
       * the user's available branches.
       *
       * Use those first so this page continues
       * working with the existing branch architecture.
       */

      const storedBranches =
        localStorage.getItem(
          "mova_branches"
        );

      if (storedBranches) {
        try {
          const parsed =
            JSON.parse(
              storedBranches
            );

          if (
            Array.isArray(parsed) &&
            parsed.length > 0
          ) {
            setBranches(parsed);
            return;
          }
        } catch {
          // Continue to API fallback.
        }
      }

      /*
       * Fallback API.
       *
       * If your branches endpoint is available,
       * MOVA will retrieve the latest branch list.
       */

      try {
        const response =
          await api.get(
            "/branches"
          );

        const data =
          response.data;

        const branchData =
          data?.branches ||
          data?.data ||
          [];

        if (
          Array.isArray(
            branchData
          )
        ) {
          setBranches(
            branchData
          );
        }
      } catch (branchError) {
        console.warn(
          "Could not load branches:",
          branchError
        );
      }
    } catch (branchError) {
      console.warn(
        "Branch loading failed:",
        branchError
      );
    }
  };

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadBranches();
  }, []);

  useEffect(() => {
    const timer =
      setTimeout(() => {
        loadUsers();
      }, 250);

    return () =>
      clearTimeout(timer);
  }, [
    search,
    roleFilter,
    statusFilter,
  ]);

  /* =======================================================
     FORM HANDLING
  ======================================================= */

  const updateForm = (
    field,
    value
  ) => {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      })
    );
  };

  const resetForm = () => {
    setForm(
      DEFAULT_FORM
    );

    setEditingUser(
      null
    );

    setShowPassword(
      false
    );
  };

  /* =======================================================
     OPEN CREATE
  ======================================================= */

  const openCreateModal = () => {
    setError("");
    setSuccess("");

    resetForm();

    /*
     * Automatically select the current
     * active branch where possible.
     */

    const currentBranch =
      localStorage.getItem(
        "mova_branch"
      );

    if (currentBranch) {
      try {
        const branch =
          JSON.parse(
            currentBranch
          );

        if (branch?._id) {
          setForm(
            (current) => ({
              ...current,
              branchIds: [
                String(
                  branch._id
                ),
              ],
            })
          );
        }
      } catch {
        // Ignore invalid local branch.
      }
    }

    setShowModal(true);
  };

  /* =======================================================
     OPEN EDIT
  ======================================================= */

  const openEditModal = (
    user
  ) => {
    setError("");
    setSuccess("");

    setEditingUser(
      user
    );

    setForm({
      name:
        user?.name ||
        "",
      email:
        user?.email ||
        "",
      phone:
        user?.phone ||
        "",
      password: "",
      role:
        user?.role ||
        "CASHIER",
      branchIds:
        Array.isArray(
          user?.branchIds
        )
          ? user.branchIds.map(
              (branch) =>
                String(
                  branch?._id ||
                    branch
                )
            )
          : user?.branchId
          ? [
              String(
                user.branchId
              ),
            ]
          : [],
      profileImage: user?.profileImage || "",
    });

    setShowPassword(
      false
    );

    setShowModal(true);
  };

  /* =======================================================
     CLOSE MODAL
  ======================================================= */

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    resetForm();
  };

  /* =======================================================
     TOGGLE BRANCH
  ======================================================= */

  const toggleBranch = (
    branchId
  ) => {
    const id =
      String(branchId);

    setForm(
      (current) => {
        const exists =
          current.branchIds.includes(
            id
          );

        return {
          ...current,
          branchIds:
            exists
              ? current.branchIds.filter(
                  (item) =>
                    item !== id
                )
              : [
                  ...current.branchIds,
                  id,
                ],
        };
      }
    );
  };

  /* =======================================================
     SUBMIT USER
  ======================================================= */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name =
      form.name.trim();

    const email =
      form.email
        .trim()
        .toLowerCase();

    const phone =
      form.phone.trim();

    if (!name) {
      setError(
        "Please enter the user's name."
      );
      return;
    }

    if (!email) {
      setError(
        "Please enter the user's email."
      );
      return;
    }

    if (!form.role) {
      setError(
        "Please select a role."
      );
      return;
    }

    if (
      !editingUser &&
      form.password.length < 6
    ) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    if (
      !form.branchIds.length
    ) {
      setError(
        "Assign the user to at least one branch."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name,
        email,
        phone,
        role: form.role,
        branchIds:
          form.branchIds,
        profileImage: form.profileImage,
      };

      if (
        form.password.trim()
      ) {
        payload.password =
          form.password;
      }

      if (editingUser) {
        await api.patch(
          `/users/${editingUser._id}`,
          payload
        );

        setSuccess(
          "User updated successfully."
        );
      } else {
        await api.post(
          "/users",
          {
            ...payload,
            password:
              form.password,
          }
        );

        setSuccess(
          "User created successfully."
        );
      }

      window.dispatchEvent(
        new Event(
          "mova:user-changed"
        )
      );

      window.dispatchEvent(
        new Event(
          "mova:data-changed"
        )
      );

      setShowModal(false);
      resetForm();

      await loadUsers();
    } catch (requestError) {
      console.error(
        "MOVA user save error:",
        requestError
      );

      setError(
        getErrorMessage(
          requestError,
          editingUser
            ? "Unable to update user."
            : "Unable to create user."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  const handleProfileImageChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }
    try {
      setError("");
      const profileImage = await resizeProfileImage(file);
      if (profileImage.length > 700000) {
        setError("This photo is still too large. Choose a smaller image.");
        return;
      }
      updateForm("profileImage", profileImage);
    } catch (imageError) {
      setError(imageError.message || "Unable to prepare this image.");
    }
  };

  /* =======================================================
     DISABLE USER
  ======================================================= */

  const disableUser = async (
    user
  ) => {
    if (
      !user?._id
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Disable ${user.name}? They will no longer be able to sign in to MOVA.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.patch(
        `/users/${user._id}/disable`
      );

      setSuccess(
        `${user.name} has been disabled.`
      );

      window.dispatchEvent(
        new Event(
          "mova:user-changed"
        )
      );

      await loadUsers();
    } catch (requestError) {
      console.error(
        "Disable user error:",
        requestError
      );

      setError(
        getErrorMessage(
          requestError,
          "Unable to disable user."
        )
      );
    }
  };

  /* =======================================================
     ENABLE USER
  ======================================================= */

  const enableUser = async (
    user
  ) => {
    if (
      !user?._id
    ) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.patch(
        `/users/${user._id}/enable`
      );

      setSuccess(
        `${user.name} has been enabled.`
      );

      window.dispatchEvent(
        new Event(
          "mova:user-changed"
        )
      );

      await loadUsers();
    } catch (requestError) {
      console.error(
        "Enable user error:",
        requestError
      );

      setError(
        getErrorMessage(
          requestError,
          "Unable to enable user."
        )
      );
    }
  };

  /* =======================================================
     DISPLAY BRANCHES
  ======================================================= */

  const getUserBranches = (
    user
  ) => {
    if (
      Array.isArray(
        user?.branchIds
      ) &&
      user.branchIds.length
    ) {
      return user.branchIds;
    }

    if (
      user?.branchId
    ) {
      return [
        user.branchId,
      ];
    }

    return [];
  };

  /* =======================================================
     COUNTS
  ======================================================= */

  const counts =
    useMemo(() => {
      return {
        total:
          users.length,

        active:
          users.filter(
            (user) =>
              user.active !==
              false
          ).length,

        disabled:
          users.filter(
            (user) =>
              user.active ===
              false
          ).length,

        cashiers:
          users.filter(
            (user) =>
              user.role ===
              "CASHIER"
          ).length,
      };
    }, [users]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
              <UsersIcon
                size={24}
                className="text-blue-600"
              />
            </div>

            <div>
              <h1 className="text-3xl font-black text-slate-900">
                Users
              </h1>

              <p className="mt-1 text-slate-500">
                Manage your MOVA team members,
                roles and branch access.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={
            openCreateModal
          }
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white shadow-sm transition hover:bg-blue-700"
        >
          <UserPlus
            size={19}
          />
          Add User
        </button>
      </div>

      {/* MESSAGES */}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1">
            <p className="font-bold">
              Something went wrong
            </p>

            <p className="mt-1 text-sm">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
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

          <p className="font-bold">
            {success}
          </p>
        </div>
      )}

      {/* SUMMARY CARDS */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Total Users"
          value={counts.total}
          icon={UsersIcon}
        />

        <SummaryCard
          title="Active Users"
          value={counts.active}
          icon={UserCheck}
        />

        <SummaryCard
          title="Cashiers"
          value={counts.cashiers}
          icon={Shield}
        />

        <SummaryCard
          title="Disabled"
          value={counts.disabled}
          icon={UserX}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button type="button" onClick={() => setShowRoleGuide((value) => !value)} aria-expanded={showRoleGuide} className="flex w-full items-center justify-between gap-3 p-4 text-left">
          <span className="flex items-center gap-2 font-bold text-slate-800"><Info size={18} className="text-blue-600" />Role access limits</span>
          <span className="text-sm font-semibold text-blue-700">{showRoleGuide ? "Hide" : "View roles"}</span>
        </button>
        {showRoleGuide && <div className="grid gap-3 border-t border-slate-100 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3">
          {ROLE_LIMITS.map((item) => <article key={item.role} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="font-bold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.limits}</p>
          </article>)}
        </div>}
      </section>

      {/* FILTERS */}

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_200px_180px_auto]">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search users by name or email..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="ALL">
              All roles
            </option>

            {ROLES.map(
              (role) => (
                <option
                  key={
                    role.value
                  }
                  value={
                    role.value
                  }
                >
                  {role.label}
                </option>
              )
            )}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="ALL">
              All statuses
            </option>

            <option value="ACTIVE">
              Active
            </option>

            <option value="DISABLED">
              Disabled
            </option>
          </select>

          <button
            type="button"
            onClick={
              loadUsers
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw
              size={18}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </div>
      </section>

      {/* USERS TABLE */}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Team members
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Users belonging to your MOVA
                business.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-black text-slate-600">
              {users.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2
                size={22}
                className="animate-spin"
              />

              <span className="font-bold">
                Loading users...
              </span>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <UsersIcon
                size={28}
                className="text-slate-400"
              />
            </div>

            <h3 className="mt-4 text-lg font-black text-slate-900">
              No users found
            </h3>

            <p className="mt-2 max-w-md text-sm text-slate-500">
              Try changing your filters or
              create a new team member.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                  <th className="px-6 py-4">
                    User
                  </th>

                  <th className="px-6 py-4">
                    Role
                  </th>

                  <th className="px-6 py-4">
                    Branches
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>

                  <th className="px-6 py-4 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {users.map(
                  (user) => {
                    const isOwner =
                      user.role ===
                      "OWNER";

                    const isCurrentUser =
                      currentUser?._id &&
                      String(
                        currentUser._id
                      ) ===
                        String(
                          user._id
                        );

                    const userBranches =
                      getUserBranches(
                        user
                      );

                    return (
                      <tr
                        key={
                          user._id
                        }
                        className="transition hover:bg-slate-50"
                      >
                        {/* USER */}

                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            {user.profileImage ? (
                              <img src={user.profileImage} alt={`${user.name || "User"} profile`} className="h-11 w-11 shrink-0 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700">
                                {(user.name || "U").charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-slate-900">
                                  {
                                    user.name
                                  }
                                </p>

                                {isCurrentUser && (
                                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-600">
                                    You
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-sm text-slate-500">
                                {
                                  user.email
                                }
                              </p>

                              {user.phone && (
                                <p className="mt-0.5 text-xs text-slate-400">
                                  {
                                    user.phone
                                  }
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* ROLE */}

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${getRoleClasses(
                              user.role
                            )}`}
                          >
                            {getRoleLabel(
                              user.role
                            )}
                          </span>
                        </td>

                        {/* BRANCHES */}

                        <td className="px-6 py-5">
                          <div className="flex max-w-xs flex-wrap gap-1.5">
                            {isOwner ? (
                              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                                All branches
                              </span>
                            ) : userBranches.length >
                              0 ? (
                              userBranches
                                .slice(
                                  0,
                                  3
                                )
                                .map(
                                  (
                                    branch,
                                    index
                                  ) => (
                                    <span
                                      key={
                                        branch?._id ||
                                        branch ||
                                        index
                                      }
                                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600"
                                    >
                                      {branch?.name ||
                                        branch?.code ||
                                        "Branch"}
                                    </span>
                                  )
                                )
                            ) : (
                              <span className="text-sm text-red-500">
                                No branch
                              </span>
                            )}

                            {userBranches.length >
                              3 && (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                                +
                                {userBranches.length -
                                  3}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* STATUS */}

                        <td className="px-6 py-5">
                          {user.active !==
                          false ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              Disabled
                            </span>
                          )}
                        </td>

                        {/* ACTIONS */}

                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(
                                  user
                                )
                              }
                              disabled={
                                isOwner
                              }
                              title={
                                isOwner
                                  ? "Owner cannot be edited here"
                                  : "Edit user"
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Edit3
                                size={16}
                              />
                            </button>

                            {user.active !==
                            false ? (
                              <button
                                type="button"
                                onClick={() =>
                                  disableUser(
                                    user
                                  )
                                }
                                disabled={
                                  isOwner ||
                                  isCurrentUser
                                }
                                title={
                                  isOwner
                                    ? "The owner cannot be disabled"
                                    : isCurrentUser
                                    ? "You cannot disable your own account"
                                    : "Disable user"
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-200 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <UserX
                                  size={16}
                                />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  enableUser(
                                    user
                                  )
                                }
                                disabled={
                                  isOwner
                                }
                                title="Enable user"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 text-emerald-600 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <UserCheck
                                  size={16}
                                />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CREATE / EDIT MODAL */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingUser
                    ? "Edit User"
                    : "Create User"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingUser
                    ? "Update this user's MOVA access."
                    : "Create a team member and assign their role."}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={saving}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* MODAL BODY */}

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-6 p-6"
            >
              {/* ERROR */}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  {error}
                </div>
              )}

              {/* PROFILE PHOTO */}
              <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
                {form.profileImage ? (
                  <img src={form.profileImage} alt="Profile preview" className="h-20 w-20 rounded-full object-cover ring-4 ring-white" />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 ring-4 ring-white">
                    <span className="text-2xl font-black">{(form.name || "U").charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-800">{form.role === "CASHIER" ? "Cashier profile photo" : "Profile photo"}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Upload a clear face photo. It will appear in this team member’s account icon and team list.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100">
                      <Camera size={16} /> Choose photo
                      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleProfileImageChange} className="sr-only" />
                    </label>
                    {form.profileImage && (
                      <button type="button" onClick={() => updateForm("profileImage", "")} className="rounded-xl px-3 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50">Remove photo</button>
                    )}
                  </div>
                </div>
              </div>

              {/* NAME / PHONE */}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Full name
                  </label>

                  <input
                    type="text"
                    value={
                      form.name
                    }
                    onChange={(
                      event
                    ) =>
                      updateForm(
                        "name",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="e.g. Sarah Namukasa"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-slate-700">
                    Phone
                  </label>

                  <input
                    type="tel"
                    value={
                      form.phone
                    }
                    onChange={(
                      event
                    ) =>
                      updateForm(
                        "phone",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="e.g. 0772 000 000"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* EMAIL */}

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Email address
                </label>

                <input
                  type="email"
                  value={
                    form.email
                  }
                  onChange={(
                    event
                  ) =>
                    updateForm(
                      "email",
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="user@example.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                />

                {editingUser && (
                  <p className="mt-2 text-xs text-slate-400">
                    Email is used as the user's
                    MOVA login identity.
                  </p>
                )}
              </div>

              {/* ROLE */}

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Role
                </label>

                <select
                  value={
                    form.role
                  }
                  onChange={(
                    event
                  ) =>
                    updateForm(
                      "role",
                      event
                        .target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500"
                >
                  {ROLES.map(
                    (role) => (
                      <option
                        key={
                          role.value
                        }
                        value={
                          role.value
                        }
                      >
                        {
                          role.label
                        }
                      </option>
                    )
                  )}
                </select>

                <p className="mt-2 text-xs text-slate-500">
                  {
                    ROLES.find(
                      (role) =>
                        role.value ===
                        form.role
                    )?.description
                  }
                </p>
              </div>

              {/* PASSWORD */}

              <div>
                <label className="mb-2 block text-sm font-black text-slate-700">
                  {editingUser
                    ? "New password"
                    : "Password"}
                </label>

                <div className="relative">
                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      form.password
                    }
                    onChange={(
                      event
                    ) =>
                      updateForm(
                        "password",
                        event
                          .target
                          .value
                      )
                    }
                    placeholder={
                      editingUser
                        ? "Leave empty to keep current password"
                        : "Minimum 6 characters"
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 pr-12 outline-none focus:border-blue-500"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff
                        size={19}
                      />
                    ) : (
                      <Eye
                        size={19}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* BRANCHES */}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-sm font-black text-slate-700">
                    Branch access
                  </label>

                  <span className="text-xs font-bold text-slate-400">
                    {form.branchIds.length}{" "}
                    selected
                  </span>
                </div>

                {branches.length ===
                0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    No branches were loaded.
                    The user cannot be created
                    until at least one branch is
                    assigned.
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {branches.map(
                      (branch) => {
                        const branchId =
                          String(
                            branch?._id
                          );

                        const selected =
                          form.branchIds.includes(
                            branchId
                          );

                        return (
                          <button
                            type="button"
                            key={
                              branchId
                            }
                            onClick={() =>
                              toggleBranch(
                                branchId
                              )
                            }
                            className={`rounded-2xl border p-4 text-left transition ${
                              selected
                                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                                : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-black text-slate-900">
                                  {
                                    branch.name
                                  }
                                </p>

                                <p className="mt-1 text-xs font-bold text-slate-400">
                                  {
                                    branch.code
                                  }
                                </p>
                              </div>

                              <div
                                className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                                  selected
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-300"
                                }`}
                              >
                                {selected && (
                                  <CheckCircle2
                                    size={
                                      15
                                    }
                                  />
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>

              {/* ROLE WARNING */}

              {form.role ===
                "CASHIER" && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-black text-emerald-800">
                    Cashier access
                  </p>

                  <p className="mt-1 text-sm leading-6 text-emerald-700">
                    This user will be able to use
                    the POS, process sales, view
                    receipts and work with customers.
                    They will not be able to create
                    users or change business
                    settings.
                  </p>
                </div>
              )}

              {form.role ===
                "MANAGER" && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="font-black text-blue-800">
                    Manager access
                  </p>

                  <p className="mt-1 text-sm leading-6 text-blue-700">
                    Managers can supervise daily
                    operations, manage products and
                    inventory-related activities,
                    and view operational reports.
                  </p>
                </div>
              )}

              {form.role ===
                "INVENTORY_MANAGER" && (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <p className="font-black text-orange-800">
                    Inventory access
                  </p>

                  <p className="mt-1 text-sm leading-6 text-orange-700">
                    This user focuses on products,
                    stock, purchases and suppliers.
                  </p>
                </div>
              )}

              {form.role ===
                "ACCOUNTANT" && (
                <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                  <p className="font-black text-cyan-800">
                    Accountant access
                  </p>

                  <p className="mt-1 text-sm leading-6 text-cyan-700">
                    This user handles expenses,
                    payment records and financial
                    reports.
                  </p>
                </div>
              )}

              {/* BUTTONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    saving
                  }
                  className="rounded-xl border border-slate-200 px-5 py-3 font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-black text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={18}
                      />

                      {editingUser
                        ? "Save Changes"
                        : "Create User"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  title,
  value,
  icon: Icon,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-3xl font-black text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
          <Icon
            size={21}
            className="text-blue-600"
          />
        </div>
      </div>
    </div>
  );
}
