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

const BranchSetup = () => {
  const navigate = useNavigate();

  const {
    business,
    branch,
    setBranch,
    branches,
    setBranches,
  } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    phone: "",
    address: "",
    managerId: "",
  });

  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadSetupData();
  }, []);

  const loadSetupData = async () => {
    try {
      setLoading(true);
      setError("");

      const [branchesResponse, usersResponse] =
        await Promise.all([
          api.get("/branches"),
          api.get("/branches/users"),
        ]);

      const loadedBranches =
        branchesResponse?.data?.branches || [];

      const loadedUsers =
        usersResponse?.data?.users || [];

      setBranches(loadedBranches);
      setUsers(loadedUsers);

      /*
       * If the business already has a branch,
       * load its details into the form.
       *
       * This makes onboarding resumable.
       */
      const existingBranch =
        branch ||
        loadedBranches[0];

      if (existingBranch) {
        setFormData({
          name: existingBranch.name || "",
          code: existingBranch.code || "",
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
      } else {
        /*
         * Default first branch.
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
          "Failed to load branch setup information."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const validate = () => {
    if (!formData.name.trim()) {
      return "Branch name is required.";
    }

    if (!formData.code.trim()) {
      return "Branch code is required.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      let response;

      /*
       * If a branch already exists, update it.
       * Otherwise create the first branch.
       */
      if (branch?._id) {
        response = await api.put(
          `/branches/${branch._id}`,
          {
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
            managerId:
              formData.managerId || null,
          }
        );
      } else if (branches?.length > 0) {
        /*
         * Existing branch but AuthContext didn't have it.
         */
        const firstBranch = branches[0];

        response = await api.put(
          `/branches/${firstBranch._id}`,
          {
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
            managerId:
              formData.managerId || null,
          }
        );
      } else {
        response = await api.post(
          "/branches",
          {
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            phone: formData.phone.trim(),
            address: formData.address.trim(),
            managerId:
              formData.managerId || null,
          }
        );
      }

      const savedBranch =
        response?.data?.branch;

      if (savedBranch) {
        setBranch(savedBranch);

        const branchList =
          branches || [];

        const exists = branchList.some(
          (item) =>
            item._id === savedBranch._id
        );

        const updatedBranches = exists
          ? branchList.map((item) =>
              item._id === savedBranch._id
                ? savedBranch
                : item
            )
          : [...branchList, savedBranch];

        setBranches(updatedBranches);

        localStorage.setItem(
          "mova_branch",
          JSON.stringify(savedBranch)
        );

        localStorage.setItem(
          "mova_branches",
          JSON.stringify(updatedBranches)
        );
      }

      setSuccess(
        "Branch information saved successfully."
      );

      setTimeout(() => {
        navigate("/setup/receipt");
      }, 700);
    } catch (requestError) {
      console.error(
        "Branch setup error:",
        requestError
      );

      setError(
        requestError?.response?.data?.message ||
          "Failed to save branch information."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate("/setup/business");
  };

  const handleSkip = () => {
    navigate("/app");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="text-sm text-slate-500">
            Loading branch setup...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
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
                {business?.name || "Business"} setup
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Set up later
          </button>
        </div>

        {/* Progress */}
        <div className="mx-auto mb-8 max-w-3xl">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
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
                    {step.number < 2 ? (
                      <Check size={17} />
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

                {index < STEPS.length - 1 && (
                  <div
                    className={`mx-3 mt-[-18px] h-px flex-1 ${
                      step.number < 2
                        ? "bg-slate-900"
                        : "bg-slate-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
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
                  Your first branch is usually your main
                  business location. You can add more
                  branches later.
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
              {/* Branch name */}
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
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Mukono Branch"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              {/* Code */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Branch code *
                </label>

                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g. MUK"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                />

                <p className="mt-1 text-xs text-slate-400">
                  Short unique identifier for this branch.
                </p>
              </div>

              {/* Phone */}
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
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+256 7XX XXX XXX"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>

              {/* Manager */}
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
                    value={formData.managerId}
                    onChange={handleChange}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">
                      No manager assigned
                    </option>

                    {users.map((user) => (
                      <option
                        key={user._id}
                        value={user._id}
                      >
                        {user.name} — {user.role}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Address */}
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
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="e.g. Mukono Town, Main Street"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Multi branch explanation */}
            <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">
                More branches later?
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Yes. After completing setup, an OWNER or
                ADMIN will be able to create additional
                branches such as Kampala, Mukono, Jinja,
                or any other location. Stock, sales,
                employees and reports can then be managed
                by branch.
              </p>
            </div>

            {/* Footer */}
            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft size={17} />
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
                  <ArrowRight size={17} />
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