import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  useEffect,
  useState,
} from "react";

import api from "../services/api";

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

          const response =
            await api.get(
              `/business/setup-status?check=${Date.now()}`
            );

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

          setSetupComplete(
            false
          );

          /*
           * If setup status cannot be verified,
           * safely return the user to business setup.
           */
          setNextStep(
            "business"
          );
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    checkSetupStatus();

    return () => {
      mounted = false;
    };
  }, []);

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
            Checking your business setup...
          </p>
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
