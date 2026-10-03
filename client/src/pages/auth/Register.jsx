
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  User,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const businessTypes = [
    "Retail",
    "Wholesale",
    "Restaurant",
    "Pharmacy",
    "Hardware",
    "Services",
    "Other",
  ];

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const businessName = form.businessName.trim();
    const ownerName = form.ownerName.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (
      !businessName ||
      !form.businessType ||
      !ownerName ||
      !email ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await register({
        businessName,
        businessType: form.businessType,
        ownerName,
        email,
        phone,
        password: form.password,
      });

      /*
       * Registration creates the initial business/account.
       *
       * The user must now complete the MOVA onboarding process
       * before entering the main application.
       */
      navigate("/setup/business", {
        replace: true,
      });
    } catch (err) {
      console.error("Registration error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="grid min-h-screen lg:grid-cols-2">

        {/* =====================================================
            LEFT BRAND PANEL
        ===================================================== */}

        <div className="relative hidden overflow-hidden bg-slate-900 lg:flex">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.20),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.16),transparent_35%)]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-12 xl:p-16">

            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-black text-slate-900">
                  M
                </div>

                <div>
                  <p className="text-xl font-bold text-white">
                    MOVA
                  </p>

                  <p className="text-xs text-slate-400">
                    Business Management Platform
                  </p>
                </div>
              </div>
            </div>

            <div className="max-w-xl">
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
                Start with MOVA
              </p>

              <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
                One platform for managing your entire business.
              </h1>

              <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
                Manage sales, inventory, customers, suppliers, expenses,
                branches and business performance from one intelligent
                platform.
              </p>

              <div className="mt-10 space-y-4">

                {[
                  "Point of Sale and digital receipts",
                  "Inventory and stock management",
                  "Multi-branch business management",
                  "Reports and business intelligence",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-slate-300"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    {item}
                  </div>
                ))}

              </div>
            </div>

            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} MOVA. Business management made
              simpler.
            </p>
          </div>
        </div>

        {/* =====================================================
            RIGHT FORM
        ===================================================== */}

        <div className="flex items-center justify-center bg-white px-5 py-10 sm:px-8">
          <div className="w-full max-w-xl">

            {/* Mobile brand */}

            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-lg font-black text-white">
                M
              </div>

              <div>
                <p className="text-xl font-bold text-slate-900">
                  MOVA
                </p>

                <p className="text-xs text-slate-500">
                  Business Management Platform
                </p>
              </div>
            </div>

            {/* Header */}

            <div className="mb-8">
              <p className="mb-2 text-sm font-semibold text-blue-600">
                Create your account
              </p>

              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Start your business journey
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Create your MOVA account. You will configure your business,
                branch and receipt settings next.
              </p>
            </div>

            {/* Error */}

            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* Business name */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Business name
                </label>

                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    name="businessName"
                    value={form.businessName}
                    onChange={handleChange}
                    placeholder="e.g. Green Star Supermarket"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Business type */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Business type
                </label>

                <select
                  name="businessType"
                  value={form.businessType}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Select business type
                  </option>

                  {businessTypes.map((type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Owner */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Your name
                </label>

                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type="text"
                    name="ownerName"
                    value={form.ownerName}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Email + phone */}

              <div className="grid gap-5 sm:grid-cols-2">

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Phone
                  </label>

                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="07XX XXX XXX"
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

              </div>

              {/* Password */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm password */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Confirm password
                </label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat your password"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) => !previous
                      )
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  "Creating account..."
                ) : (
                  <>
                    Create account
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

            </form>

            {/* Login */}

            <p className="mt-7 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-blue-600 hover:text-blue-700"
              >
                Sign in
              </Link>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Register;
