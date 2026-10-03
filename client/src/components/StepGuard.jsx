
import { useEffect, useState } from "react";
import {
  Check,
  Loader2,
} from "lucide-react";
import { Navigate } from "react-router-dom";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const SetupGuard = ({ children }) => {
  const { loading: authLoading } =
    useAuth();

  const [loading, setLoading] =
    useState(true);

  const [setupComplete, setSetupComplete] =
    useState(false);

  const [steps, setSteps] = useState({
    business: false,
    branch: false,
    receipt: false,
  });

  useEffect(() => {
    if (authLoading) {
      return;
    }

    checkSetupStatus();
  }, [authLoading]);

  const checkSetupStatus = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/business/setup-status"
      );

      const data = response?.data;

      setSetupComplete(
        Boolean(data?.setupComplete)
      );

      setSteps({
        business: Boolean(
          data?.steps?.business
        ),
        branch: Boolean(
          data?.steps?.branch
        ),
        receipt: Boolean(
          data?.steps?.receipt
        ),
      });
    } catch (error) {
      console.error(
        "Failed to check setup status:",
        error
      );

      setSetupComplete(false);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Loader2
              size={24}
              className="animate-spin"
            />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-slate-900">
            Preparing MOVA
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Checking your business setup...
          </p>

          <div className="mt-6 space-y-2 text-left">
            <SetupCheck
              label="Business"
              complete={steps.business}
            />

            <SetupCheck
              label="Branch"
              complete={steps.branch}
            />

            <SetupCheck
              label="Receipt"
              complete={steps.receipt}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!setupComplete) {
    if (!steps.business) {
      return (
        <Navigate
          to="/setup/business"
          replace
        />
      );
    }

    if (!steps.branch) {
      return (
        <Navigate
          to="/setup/branch"
          replace
        />
      );
    }

    if (!steps.receipt) {
      return (
        <Navigate
          to="/setup/receipt"
          replace
        />
      );
    }
  }

  return children;
};

const SetupCheck = ({
  label,
  complete,
}) => {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <div
        className={`flex h-7 w-7 items-center justify-center rounded-full ${
          complete
            ? "bg-emerald-100 text-emerald-600"
            : "bg-slate-200 text-slate-400"
        }`}
      >
        {complete && <Check size={15} />}
      </div>

      <span className="text-sm font-medium text-slate-700">
        {label}
      </span>
    </div>
  );
};

export default SetupGuard;