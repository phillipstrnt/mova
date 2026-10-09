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

const Login = () => {
  const navigate =
    useNavigate();

  const location =
    useLocation();

  const {
    login,
    googleSignIn,
    isAuthenticated,
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleGoogleCredential = useCallback(async (credential) => {
    setError("");
    try {
      await googleSignIn(credential);
      navigate("/app", { replace: true });
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
    }
  }, [googleSignIn, navigate]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(
        "/app",
        { replace: true }
      );
    }
  }, [
    isAuthenticated,
    navigate,
  ]);

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

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

      await login(
        cleanEmail,
        password
      );

      const from =
        location.state?.from
          ?.pathname ||
        "/app";

      navigate(from, {
        replace: true,
      });
    } catch (loginError) {
      console.error(
        "Login failed:",
        loginError
      );

      setError(
        loginError.message ||
          "Unable to sign in."
      );
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
              <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">

                <AlertCircle
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="text-sm font-bold">
                    Sign in failed
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

                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn size={19} />

                    Sign in
                  </>
                )}

              </button>

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
