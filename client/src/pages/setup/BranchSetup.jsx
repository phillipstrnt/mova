import { useEffect, useState } from "react";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  MapPin,
  Phone,
  Save,
  Store,
  UserRound,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const STEPS = [
  {
    number: 1,
    title: "Business",
  },
  {
    number: 2,
    title: "Branch",
  },
  {
    number: 3,
    title: "Receipt",
  },
];

const EMPTY_FORM = {
  name: "",
  code: "",
  phone: "",
  address: "",
  managerId: "",
};

const BranchSetup = () => {
  const navigate = useNavigate();

  const {
    business,
    branch,
    setBranch,
    branches,
    setBranches,
  } = useAuth();

  const [formData, setFormData] =
    useState(EMPTY_FORM);

  const [users, setUsers] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    loadSetupData();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD BRANCH DATA
  |--------------------------------------------------------------------------
  */

  const loadSetupData = async () => {
    try {
      setLoading(true);
      setError("");

      const branchesResponse =
        await api.get("/branches");

      const loadedBranches =
        Array.isArray(
          branchesResponse?.data?.branches
        )
          ? branchesResponse.data.branches
          : [];

      setBranches(loadedBranches);

      /*
       * Registration already creates Main Branch.
       *
       * Prefer the branch stored in AuthContext.
       * Otherwise use the first branch returned
       * by the backend.
       */

      const existingBranch =
        branch ||
        loadedBranches[0] ||
        null;

      /*
       * Users are useful for assigning a manager,
       * but failure to load them should NOT prevent
       * the branch setup page from opening.
       */

      try {
        const usersResponse =
          await api.get("/branches/users");

        const loadedUsers =
          Array.isArray(
            usersResponse?.data?.users
          )
            ? usersResponse.data.users
            : [];

        setUsers(loadedUsers);
      } catch (userError) {
        console.warn(
          "Could not load branch users:",
          userError
        );

        setUsers([]);
      }

      if (existingBranch) {
        setFormData({
          name:
            existingBranch.name ||
            "Main Branch",

          code:
            existingBranch.code ||
            "MAIN",

          phone:
            existingBranch.phone ||
            business?.phone ||
            "",

          address:
            existingBranch.address ||
            business?.address ||
            "",

          managerId:
            existingBranch.managerId?._id ||
            existingBranch.managerId ||
            "",
        });

        /*
         * Make sure AuthContext knows about
         * the existing branch.
         */

        setBranch(existingBranch);

        localStorage.setItem(
          "mova_branch",
          JSON.stringify(existingBranch)
        );
      } else {
        /*
         * This is only used if somehow the
         * registration did not create a branch.
         */

        setFormData({
          name: "Main Branch",
          code: "MAIN",
          phone: business?.phone || "",
          address: business?.address || "",
          managerId: "",
        });
      }
    } catch (requestError) {
      console.error(
        "Branch setup loading error:",
        requestError
      );

      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to load branch setup information."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | INPUT
  |--------------------------------------------------------------------------
  */

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  /*
  |--------------------------------------------------------------------------
  | VALIDATION
  |--------------------------------------------------------------------------
  */

  const validate = () => {
    if (!formData.name.trim()) {
      return "Branch name is required.";
    }

    if (!formData.code.trim()) {
      return "Branch code is required.";
    }

    if (
      formData.code.trim().length >
      15
    ) {
      return "Branch code must be 15 characters or fewer.";
    }

    return "";
  };

  /*
  |--------------------------------------------------------------------------
  | SAVE
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError =
      validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: formData.name.trim(),

        code: formData.code
          .trim()
          .toUpperCase(),

        phone: formData.phone.trim(),

        address:
          formData.address.trim(),

        managerId:
          formData.managerId || null,
      };

      let response;

      /*
       * IMPORTANT:
       *
       * Registration already creates the first
       * branch, so normally we UPDATE it.
       */

      const branchToUpdate =
        branch ||
        branches?.[0] ||
        null;

      if (branchToUpdate?._id) {
        response = await api.put(
          `/branches/${branchToUpdate._id}`,
          payload
        );
      } else {
        /*
         * Fallback in case the branch does not exist.
         */

        response = await api.post(
          "/branches",
          payload
        );
      }

      const savedBranch =
        response?.data?.branch;

      if (!savedBranch) {
        throw new Error(
          "Branch was saved but the server did not return the branch."
        );
      }

      /*
       * Update AuthContext.
       */

      setBranch(savedBranch);

      /*
       * Update branch list.
       */

      const currentBranches =
        Array.isArray(branches)
          ? branches
          : [];

      const exists =
        currentBranches.some(
          (item) =>
            item?._id ===
            savedBranch?._id
        );

      const updatedBranches =
        exists
          ? currentBranches.map(
              (item) =>
                item?._id ===
                savedBranch?._id
                  ? savedBranch
                  : item
            )
          : [
              ...currentBranches,
              savedBranch,
            ];

      setBranches(
        updatedBranches
      );

      /*
       * Persist locally.
       */

      localStorage.setItem(
        "mova_branch",
        JSON.stringify(savedBranch)
      );

      localStorage.setItem(
        "mova_branches",
        JSON.stringify(
          updatedBranches
        )
      );

      setSuccess(
        "Branch information saved successfully."
      );

      /*
       * Continue to Receipt Setup.
       */

      window.setTimeout(() => {
        navigate(
          "/setup/receipt",
          {
            replace: true,
          }
        );
      }, 700);
    } catch (requestError) {
      console.error(
        "Branch setup error:",
        requestError
      );

      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to save branch information."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | NAVIGATION
  |--------------------------------------------------------------------------
  */

  const handleBack = () => {
    navigate(
      "/setup/business"
    );
  };

  /*
   * Do not send an incomplete user to /app.
   *
   * SetupGuard would simply redirect them back
   * into setup.
   */

  const handleSkip = () => {
    navigate(
      "/setup/receipt"
    );
  };

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">

          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Loading branch setup...
          </p>

        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-slate-50">

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* HEADER */}

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Store size={22} />
            </div>

            <div>

              <p className="text-lg font-bold text-slate-900">
                MOVA
              </p>

              <p className="text-xs text-slate-500">
                {business?.name ||
                  "Business"}{" "}
                setup
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Continue to receipt setup
          </button>

        </div>

        {/* PROGRESS */}

        <div className="mx-auto mb-8 max-w-3xl">

          <div className="flex items-center justify-between">

            {STEPS.map(
              (step, index) => (
                <div
                  key={step.number}
                  className="flex flex-1 items-center"
                >

                  <div className="flex flex-col items-center">

                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                        step.number <= 2
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-400 ring-1 ring-slate-200"
                      }`}
                    >
                      {step.number <
                      2 ? (
                        <Check
                          size={17}
                        />
                      ) : (
                        step.number
                      )}
                    </div>

                    <span
                      className={`mt-2 text-xs font-medium ${
                        step.number <= 2
                          ? "text-slate-900"
                          : "text-slate-400"
                      }`}
                    >
                      {step.title}
                    </span>

                  </div>

                  {index <
                    STEPS.length -
                      1 && (
                    <div
                      className={`mx-3 mt-[-18px] h-px flex-1 ${
                        step.number <
                        2
                          ? "bg-slate-900"
                          : "bg-slate-200"
                      }`}
                    />
                  )}

                </div>
              )
            )}

          </div>

        </div>

        {/* CARD */}

        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">

          <div className="border-b border-slate-200 px-6 py-6 sm:px-8">

            <div className="flex items-start gap-4">

              <div className="rounded-xl bg-slate-100 p-3">

                <Building2
                  size={24}
                  className="text-slate-700"
                />

              </div>

              <div>

                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Set up your branch
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Configure the location where
                  your business operates.
                </p>

              </div>

            </div>

          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8"
          >

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <Check size={17} />

                {success}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">

              {/* NAME */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Branch name *
                </label>

                <div className="relative">

                  <Building2
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    name="name"
                    value={
                      formData.name
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Mukono Branch"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />

                </div>

              </div>

              {/* CODE */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Branch code *
                </label>

                <input
                  type="text"
                  name="code"
                  value={
                    formData.code
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="e.g. MUK"
                  maxLength={15}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Short unique identifier
                  for this branch.
                </p>

              </div>

              {/* PHONE */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Branch phone
                </label>

                <div className="relative">

                  <Phone
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="tel"
                    name="phone"
                    value={
                      formData.phone
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="+256 7XX XXX XXX"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />

                </div>

              </div>

              {/* MANAGER */}

              <div>

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Branch manager
                </label>

                <div className="relative">

                  <UserRound
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    name="managerId"
                    value={
                      formData.managerId
                    }
                    onChange={
                      handleChange
                    }
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >

                    <option value="">
                      No manager assigned
                    </option>

                    {users.map(
                      (user) => (
                        <option
                          key={
                            user._id
                          }
                          value={
                            user._id
                          }
                        >
                          {user.name} —{" "}
                          {user.role}
                        </option>
                      )
                    )}

                  </select>

                </div>

              </div>

              {/* ADDRESS */}

              <div className="md:col-span-2">

                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Branch address
                </label>

                <div className="relative">

                  <MapPin
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    name="address"
                    value={
                      formData.address
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Mukono Town, Main Street"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />

                </div>

              </div>

            </div>

            {/* INFO */}

            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">

              <h3 className="font-semibold text-slate-900">
                Multiple branches?
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                You can add additional branches
                after completing onboarding.
                Each branch can have its own
                stock, sales, employees and
                reports.
              </p>

            </div>

            {/* FOOTER */}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">

              <button
                type="button"
                onClick={
                  handleBack
                }
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <ArrowLeft
                  size={17}
                />

                Back
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >

                <Save size={17} />

                {saving
                  ? "Saving..."
                  : "Save & Continue"}

                {!saving && (
                  <ArrowRight
                    size={17}
                  />
                )}

              </button>

            </div>

          </form>

        </div>

      </div>

    </div>
  );
};

export default BranchSetup;