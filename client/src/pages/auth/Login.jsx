import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  Store,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import GoogleSignInButton from "../../components/auth/GoogleSignInButton";
import InstallMovaButton from "../../components/InstallMovaButton";
import api from "../../api";

const Login = () => {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    login,
    googleSignIn,
    isAuthenticated,
    user,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [errorType, setErrorType] =
    useState("auth");

  const [loading, setLoading] =
    useState(false);

  const [slowConnection, setSlowConnection] =
    useState(false);

  const handleGoogleCredential = useCallback(async (credential) => {
    setError("");
    setErrorType("auth");
    try {
      const session = await googleSignIn(credential);
      const destination =
        String(session?.user?.role || "").toUpperCase() === "CASHIER"
          ? "/app/pos"
          : "/app";
      navigate(destination, { replace: true });
    } catch (googleError) {
      if (googleError.code === "GOOGLE_REGISTRATION_REQUIRED") {
        sessionStorage.setItem("mova_google_registration", credential);
        navigate("/register", {
          state: {
            googleRegistration: {
              profile: googleError.profile || {},
            },
          },
        });
        return;
      }
      setError(googleError.message || "Google sign-in could not be completed.");
      setErrorType(googleError.code === "ERR_NETWORK" || googleError.message === "Network Error" ? "network" : "auth");
    }
  }, [googleSignIn, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      const defaultPath =
        String(user?.role || "").toUpperCase() === "CASHIER"
          ? "/app/pos"
          : "/app";

      navigate(
        location.state?.from?.pathname || defaultPath,
        { replace: true }
      );
    }
  }, [
    isAuthenticated,
    location.state,
    navigate,
    user?.role,
  ]);

  // Wake the hosted API while the user enters their credentials. Render's
  // free backend sleeps when idle, so this moves its cold start off the
  // critical path of the sign-in button.
  useEffect(() => {
    api.get("/health", { timeout: 90_000 }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) {
      setSlowConnection(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setSlowConnection(true), 5000);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");
    setErrorType("auth");

    const cleanEmail =
      email.trim();

    if (!cleanEmail) {
      setError(
        "Please enter your email address."
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );
      return;
    }

    try {
      setLoading(true);

      const session = await login(
        cleanEmail,
        password
      );

      const from =
        location.state?.from
          ?.pathname ||
        (String(session?.user?.role || "").toUpperCase() === "CASHIER"
          ? "/app/pos"
          : "/app");

      navigate(from, {
        replace: true,
      });
    } catch (loginError) {
      console.error(
        "Login failed:",
        loginError
      );

      const networkIssue = loginError.code === "ERR_NETWORK" || loginError.message === "Network Error" || /server is taking longer|could not be reached/i.test(loginError.message || "");
      setErrorType(networkIssue ? "network" : "auth");
      setError(networkIssue ? "The sign-in service is waking up or your connection is interrupted. Please try again shortly." : loginError.response?.status === 401 ? "The email or password is incorrect. Check your details and try again." : loginError.message || "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">

      <div className="grid min-h-screen lg:grid-cols-2">

        {/* LEFT SIDE */}

        <div className="hidden bg-slate-950 lg:flex lg:flex-col lg:justify-between lg:p-12">

          <div>

            <div className="flex items-center gap-3 text-white">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
                <Store size={22} />
              </div>

              <div>
                <p className="text-xl font-black">
                  MOVA
                </p>

                <p className="text-xs text-slate-400">
                  Business Management
                </p>
              </div>

            </div>

          </div>

          <div className="max-w-lg">

            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-blue-400">
              Sell Smart. Know More. Grow Faster.
            </p>

            <h1 className="text-5xl font-black leading-tight text-white">
              Run your business from one powerful platform.
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-400">
              Manage sales, inventory, customers and business performance from one simple workspace.
            </p>

          </div>

          <p className="text-sm text-slate-500">
            MOVA Business Management Platform
          </p>

        </div>

        {/* RIGHT SIDE */}

        <div className="flex items-center justify-center px-5 py-10 sm:px-8">

          <div className="w-full max-w-md">

            {/* MOBILE BRAND */}

            <div className="mb-8 flex items-center gap-3 lg:hidden">

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Store size={22} />
              </div>

              <div>
                <p className="text-xl font-black text-slate-900">
                  MOVA
                </p>

                <p className="text-xs text-slate-500">
                  Business Management
                </p>
              </div>

            </div>

            <div className="mb-5"><InstallMovaButton /></div>

            {/* HEADER */}

            <div className="mb-8">

              <h2 className="text-3xl font-black tracking-tight text-slate-900">
                Welcome back
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Sign in to continue to your MOVA dashboard.
              </p>

            </div>

            {/* ERROR */}

            {error && (
              <div role="alert" className={`mb-5 flex items-start gap-3 rounded-xl border p-4 ${errorType === "network" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-700"}`}>

                <AlertCircle
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="text-sm font-bold">
                    {errorType === "network" ? "Connection interrupted" : error.includes("incorrect") ? "Check your sign-in details" : "Unable to sign in"}
                  </p>

                  <p className="mt-1 text-sm">
                    {error}
                  </p>
                </div>

              </div>
            )}

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* EMAIL */}

              <div>

                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Email address
                </label>

                <div className="relative">

                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target
                          .value
                      )
                    }
                    placeholder="you@example.com"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label
                    htmlFor="password"
                    className="text-sm font-bold text-slate-700"
                  >
                    Password
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-sm font-bold text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </Link>

                </div>

                <div className="relative">

                  <LockKeyhole
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target
                          .value
                      )
                    }
                    placeholder="Enter your password"
                    disabled={loading}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3.5 pl-10 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>

                </div>

              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {loading ? (
                  <>
                    <Loader2
                      size={19}
                      className="animate-spin"
                    />

                    {slowConnection ? "Connecting to MOVA..." : "Signing in..."}
                  </>
                ) : (
                  <>
                    <LogIn size={19} />

                    Sign in
                  </>
                )}

              </button>

              {loading && slowConnection && (
                <p role="status" className="text-center text-xs leading-5 text-slate-500">
                  MOVA is waking its server. The first connection can take about a minute; please keep this page open.
                </p>
              )}

            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              or
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <GoogleSignInButton
              onCredential={handleGoogleCredential}
              disabled={loading}
            />

            {/* REGISTER */}

            <div className="mt-7 text-center text-sm text-slate-500">

              Don't have a MOVA account?

              <Link
                to="/register"
                className="ml-1 font-bold text-blue-600 hover:text-blue-700"
              >
                Create one
              </Link>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default Login;
