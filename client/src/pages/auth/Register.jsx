
import { useCallback, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import GoogleSignInButton from "../../components/auth/GoogleSignInButton";
import InstallMovaButton from "../../components/InstallMovaButton";

const Register = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, googleSignIn } = useAuth();
  const pendingGoogle = location.state?.googleRegistration || null;

  const [form, setForm] = useState({
    businessName: "",
    businessType: "",
    ownerName: pendingGoogle?.profile?.name || "",
    email: pendingGoogle?.profile?.email || "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleCredential, setGoogleCredential] = useState(
    pendingGoogle?.credential || sessionStorage.getItem("mova_google_registration") || ""
  );
  const [googleReady, setGoogleReady] = useState(Boolean(pendingGoogle?.credential));

  const businessTypes = [
    "Retail",
    "Wholesale",
    "Restaurant",
    "Pharmacy",
    "Hardware",
    "Services",
    "Other",
  ];

  const handleGoogleCredential = useCallback((credential, profile = {}) => {
    setGoogleCredential(credential);
    setGoogleReady(true);
    setForm((previous) => ({
      ...previous,
      email: profile.email || previous.email,
      ownerName: profile.name || previous.ownerName,
    }));
    setError("");
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Remove the previous error once the user starts correcting the form.
    if (error) {
      setError("");
    }
  };

  const getRegistrationError = (err) => {
    const backendMessage = err?.response?.data?.message;

    if (backendMessage) {
      return backendMessage;
    }

    if (err?.response?.data?.error) {
      return err.response.data.error;
    }

    if (err?.message) {
      return err.message;
    }

    return "Registration failed. Please try again.";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const businessName = form.businessName.trim();
    const businessType = form.businessType.trim();
    const ownerName = form.ownerName.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    // ---------------------------------------------------------
    // Required fields
    // ---------------------------------------------------------

    if (!businessName || !businessType || (!googleCredential && (!ownerName || !email || !password || !confirmPassword))) {
      setError(googleCredential
        ? "Please add your business name and type to finish Google sign-up."
        : "Please complete all required fields.");
      return;
    }

    // ---------------------------------------------------------
    // Basic email validation
    // ---------------------------------------------------------

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!googleCredential && !emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    // ---------------------------------------------------------
    // Password validation
    // ---------------------------------------------------------

    if (!googleCredential && password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (!googleCredential && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // ---------------------------------------------------------
    // Registration
    // ---------------------------------------------------------

    try {
      setLoading(true);

      if (googleCredential) {
        await googleSignIn(googleCredential, {
          businessName,
          businessType,
          ownerName,
          phone,
        });
        sessionStorage.removeItem("mova_google_registration");
        navigate("/app", { replace: true });
        return;
      }

      const registration = await register({
        businessName,
        businessType,
        ownerName,
        email,
        phone,
        password,
      });

      /*
       * Registration creates:
       *
       * 1. Business
       * 2. Main Branch
       * 3. OWNER account
       * 4. Authentication session
       *
       * The user then continues through MOVA onboarding.
       */
      navigate(registration?.existingAccount ? "/app" : "/setup/business", {
        replace: true,
      });
    } catch (err) {
      setError(getRegistrationError(err));
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

            {/* Brand */}

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

            {/* Marketing content */}

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

                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}

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
            <div className="mb-5"><InstallMovaButton /></div>

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

            <div className="mb-6">
              <GoogleSignInButton
                onCredential={handleGoogleCredential}
                disabled={loading}
              />
              {googleReady && (
                <p className="mt-2 text-center text-xs font-medium text-emerald-700">
                  Google verified. Add your business details below to finish.
                </p>
              )}
              <div className="mt-5 flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or create an account with email
                <span className="h-px flex-1 bg-slate-200" />
              </div>
            </div>

            {/* Error */}

            {error && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* Form */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* Business name */}

              <div>
                <label
                  htmlFor="businessName"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Business name
                </label>

                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="businessName"
                    type="text"
                    name="businessName"
                    value={form.businessName}
                    onChange={handleChange}
                    placeholder="e.g. Green Star Supermarket"
                    autoComplete="organization"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Business type */}

              <div>
                <label
                  htmlFor="businessType"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Business type
                </label>

                <select
                  id="businessType"
                  name="businessType"
                  value={form.businessType}
                  onChange={handleChange}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
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
                <label
                  htmlFor="ownerName"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Your name
                </label>

                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="ownerName"
                    type="text"
                    name="ownerName"
                    value={form.ownerName}
                    onChange={handleChange}
                    placeholder="Your full name"
                    autoComplete="name"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Email + phone */}

              <div className="grid gap-5 sm:grid-cols-2">

                {/* Email */}

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={loading}
                      readOnly={Boolean(googleCredential)}
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {/* Phone */}

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Phone
                  </label>

                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                    <input
                      id="phone"
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="07XX XXX XXX"
                      autoComplete="tel"
                      disabled={loading}
                      className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {!googleCredential && (
              <>
              {/* Password */}

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                  placeholder="At least 8 characters"
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    onClick={() =>
                      setShowPassword((previous) => !previous)
                    }
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed"
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
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Confirm password
                </label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) => !previous
                      )
                    }
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              </>
              )}

              {/* Submit */}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating account...
                  </>
                ) : (
                  <>
                    {googleCredential ? "Create account with Google" : "Create account"}
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
