import {
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import api, { warmApi } from "../services/api";

const SetupGuard = ({
  children,
}) => {
  const location =
    useLocation();

  const [loading, setLoading] =
    useState(true);

  const [setupComplete, setSetupComplete] =
    useState(false);

  const [nextStep, setNextStep] =
    useState(null);

  const [error, setError] =
    useState("");

  const [retryKey, setRetryKey] = useState(0);
  const [slowConnection, setSlowConnection] = useState(false);

  // ============================================================
  // CHECK SETUP STATUS
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const checkSetupStatus =
      async () => {
        try {
          setLoading(true);
          setError("");
          setSlowConnection(false);

          await warmApi();

          let response;
          let lastError;

          // Retry temporary network/gateway failures while a free API instance
          // is waking. A failed check is not evidence that setup is incomplete.
          for (let attempt = 1; attempt <= 3; attempt += 1) {
            try {
              response = await api.get(
                `/business/setup-status?check=${Date.now()}`,
                { timeout: 30_000 }
              );
              lastError = null;
              break;
            } catch (requestError) {
              lastError = requestError;
              const status = requestError?.response?.status;
              const retryable =
                !requestError?.response || [502, 503, 504].includes(status);

              if (!retryable || attempt === 3) {
                throw requestError;
              }

              await new Promise((resolve) =>
                window.setTimeout(resolve, attempt * 1200)
              );
            }
          }

          if (lastError) throw lastError;

          if (!mounted) {
            return;
          }

          const data =
            response?.data || {};

          console.log(
            "MOVA setup status:",
            data
          );

          const complete =
            data?.setupComplete ===
            true;

          setSetupComplete(
            complete
          );

          setNextStep(
            data?.nextStep ||
              null
          );
        } catch (requestError) {
          console.error(
            "Setup status check failed:",
            requestError
          );

          if (!mounted) {
            return;
          }

          const message =
            requestError?.response
              ?.data?.message ||
            requestError?.message ||
            "Unable to verify business setup.";

          setError(message);

          // Keep the authenticated user on a recoverable screen instead of
          // sending them back through account creation/onboarding.
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    checkSetupStatus();

    const slowTimer = window.setTimeout(() => setSlowConnection(true), 5000);

    return () => {
      mounted = false;
      window.clearTimeout(slowTimer);
    };
  }, [retryKey]);

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <h2 className="text-lg font-semibold text-slate-900">
            Preparing MOVA
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            {slowConnection
              ? "The service is waking up. Keep this page open while we reconnect."
              : "Checking your business setup..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">MOVA could not verify your setup yet</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600" role="alert">
            Your account is still signed in. The server may be waking or your connection may have paused. Try again to continue without creating another account.
          </p>
          <button
            type="button"
            onClick={() => setRetryKey((value) => value + 1)}
            className="mt-6 w-full rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            Retry connection
          </button>
          <Link to="/login" className="mt-4 inline-block text-sm font-semibold text-blue-700 hover:text-blue-800">
            Return to sign in
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // SETUP COMPLETE
  // ============================================================

  if (setupComplete) {
    return children;
  }

  // ============================================================
  // DETERMINE NEXT SETUP PAGE
  // ============================================================

  let setupPath =
    "/setup/business";

  if (
    nextStep === "branch"
  ) {
    setupPath =
      "/setup/branch";
  }

  if (
    nextStep === "receipt"
  ) {
    setupPath =
      "/setup/receipt";
  }

  // ============================================================
  // REDIRECT TO REQUIRED SETUP
  // ============================================================

  if (
    location.pathname !==
    setupPath
  ) {
    return (
      <Navigate
        to={setupPath}
        replace
        state={{
          from:
            location.pathname,
          setupError: error,
        }}
      />
    );
  }

  /*
   * This normally won't be reached through the current
   * App routing because SetupGuard is only wrapped around
   * /app. It is kept as a safety mechanism against loops.
   */
  return null;
};

export default SetupGuard;
