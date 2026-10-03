import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

import api from "../services/api";

const SetupGuard = ({ children }) => {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const checkSetupStatus = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          "/business/setup-status"
        );

        if (!mounted) return;

        const data = response?.data;

        console.log(
          "MOVA setup status:",
          data
        );

        setSetupComplete(
          data?.setupComplete === true
        );
      } catch (error) {
        console.error(
          "Setup status check failed:",
          error
        );

        if (!mounted) return;

        setError(
          error?.response?.data?.message ||
            "Unable to verify business setup."
        );

        setSetupComplete(false);
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

  /*
   * Show loading screen while MOVA checks
   * whether the business setup is complete.
   */
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

  /*
   * If setup has not been completed,
   * send the user back to the correct setup step.
   */
  if (!setupComplete) {
    return (
      <Navigate
        to="/setup/business"
        replace
        state={{
          from: location.pathname,
          setupError: error,
        }}
      />
    );
  }

  /*
   * Setup is complete.
   * Render DashboardLayout and its children.
   */
  return children;
};

export default SetupGuard;