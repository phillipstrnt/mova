import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Printer,
  Receipt,
  Store,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const STEPS = [
  {
    id: "business",
    label: "Business",
    path: "/setup/business",
  },
  {
    id: "branch",
    label: "Branch",
    path: "/setup/branch",
  },
  {
    id: "receipt",
    label: "Receipt",
    path: "/setup/receipt",
  },
];

const ReceiptSetup = () => {
  const navigate = useNavigate();

  const {
    business,
    branch,
  } = useAuth();

  const [form, setForm] = useState({
    prefix: "MOVA",
    footer:
      "Thank you for shopping with us.",
    showLogo: true,
    showPhone: true,
    showAddress: true,
    showCashier: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  useEffect(() => {
    let mounted = true;

    const loadReceiptSettings = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          "/receipt-settings"
        );

        if (!mounted) return;

        const settings =
          response?.data?.settings ||
          response?.data?.receiptSettings ||
          response?.data;

        if (settings) {
          setForm({
            prefix:
              settings.prefix ||
              "MOVA",

            footer:
              settings.footer ||
              "Thank you for shopping with us.",

            showLogo:
              settings.showLogo !== false,

            showPhone:
              settings.showPhone !== false,

            showAddress:
              settings.showAddress !== false,

            showCashier:
              settings.showCashier !== false,
          });
        }
      } catch (requestError) {
        /*
         * A missing receipt-settings document should not
         * prevent the setup page from opening.
         */
        console.warn(
          "Receipt settings could not be loaded:",
          requestError
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadReceiptSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const prefix = form.prefix.trim();

    if (!prefix) {
      setError(
        "Please enter a receipt prefix."
      );
      return;
    }

    try {
      setSaving(true);

      await api.put(
        "/receipt-settings",
        {
          prefix,
          footer: form.footer.trim(),
          showLogo: form.showLogo,
          showPhone: form.showPhone,
          showAddress: form.showAddress,
          showCashier: form.showCashier,
        }
      );

      setSuccess(
        "Receipt settings saved successfully."
      );

      /*
       * Do NOT call setup-status here before navigating.
       *
       * SetupGuard on /app is responsible for checking
       * the final setup status. This prevents the user from
       * getting stuck on this page because of a temporary
       * setup-status response.
       */
      setTimeout(() => {
        navigate("/app", {
          replace: true,
        });
      }, 800);
    } catch (requestError) {
      console.error(
        "Saving receipt settings failed:",
        requestError
      );

      setError(
        requestError?.response?.data?.message ||
          "Unable to save receipt settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    navigate("/setup/branch");
  };

  const handleSkip = () => {
    navigate("/app", {
      replace: true,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Loader2
              size={24}
              className="animate-spin"
            />
          </div>

          <h1 className="text-xl font-bold text-slate-900">
            Preparing receipt settings
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Loading your receipt configuration...
          </p>
        </div>
      </div>
    );
  }

  const businessName =
    business?.name ||
    "Your Business";

  const branchName =
    branch?.name ||
    "Main Branch";

  const phone =
    business?.phone ||
    branch?.phone ||
    "+256 700 000000";

  const address =
    business?.address ||
    branch?.address ||
    "Business address";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                <Receipt size={19} />
              </div>

              <span className="text-lg font-bold tracking-tight text-slate-900">
                MOVA
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Set up your receipts
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Configure how sales receipts will appear
              for your customers.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            Skip for now
          </button>
        </div>

        {/* Progress */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const active =
                step.id === "receipt";

              const completed =
                index <
                STEPS.findIndex(
                  (item) =>
                    item.id === "receipt"
                );

              return (
                <div
                  key={step.id}
                  className="flex flex-1 items-center"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : completed
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : "border-slate-200 bg-white text-slate-400"
                      }`}
                    >
                      {completed ? (
                        <Check size={17} />
                      ) : (
                        index + 1
                      )}
                    </div>

                    <span
                      className={`hidden text-sm font-medium sm:block ${
                        active
                          ? "text-slate-900"
                          : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>

                  {index <
                    STEPS.length - 1 && (
                    <div className="mx-3 h-px flex-1 bg-slate-200 sm:mx-5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Settings */}
          <form
            onSubmit={handleSubmit}
            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-200 px-5 py-6 sm:px-8">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <Printer size={23} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Receipt configuration
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Choose what information should
                    appear on printed receipts.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-7 px-5 py-7 sm:px-8">
              {/* Prefix */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Receipt prefix
                </label>

                <input
                  type="text"
                  value={form.prefix}
                  onChange={(event) =>
                    updateField(
                      "prefix",
                      event.target.value.toUpperCase()
                    )
                  }
                  maxLength={20}
                  placeholder="MOVA"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />

                <p className="mt-1.5 text-xs text-slate-400">
                  Example: MOVA-000001
                </p>
              </div>

              {/* Footer */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Receipt footer
                </label>

                <textarea
                  value={form.footer}
                  onChange={(event) =>
                    updateField(
                      "footer",
                      event.target.value
                    )
                  }
                  rows={3}
                  placeholder="Thank you for shopping with us."
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              {/* Visibility */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Receipt information
                </h3>

                <div className="space-y-3">
                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300">
                    <div className="flex items-center gap-3">
                      <Store
                        size={18}
                        className="text-slate-500"
                      />

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Business logo
                        </p>

                        <p className="text-xs text-slate-400">
                          Show your business logo.
                        </p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={form.showLogo}
                      onChange={(event) =>
                        updateField(
                          "showLogo",
                          event.target.checked
                        )
                      }
                      className="h-5 w-5 accent-slate-900"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300">
                    <div className="flex items-center gap-3">
                      <Phone
                        size={18}
                        className="text-slate-500"
                      />

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Phone number
                        </p>

                        <p className="text-xs text-slate-400">
                          Show your business phone.
                        </p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={form.showPhone}
                      onChange={(event) =>
                        updateField(
                          "showPhone",
                          event.target.checked
                        )
                      }
                      className="h-5 w-5 accent-slate-900"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300">
                    <div className="flex items-center gap-3">
                      <MapPin
                        size={18}
                        className="text-slate-500"
                      />

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Address
                        </p>

                        <p className="text-xs text-slate-400">
                          Show the business address.
                        </p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={form.showAddress}
                      onChange={(event) =>
                        updateField(
                          "showAddress",
                          event.target.checked
                        )
                      }
                      className="h-5 w-5 accent-slate-900"
                    />
                  </label>

                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300">
                    <div className="flex items-center gap-3">
                      <UserRound
                        size={18}
                        className="text-slate-500"
                      />

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Cashier
                        </p>

                        <p className="text-xs text-slate-400">
                          Show the cashier name.
                        </p>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={form.showCashier}
                      onChange={(event) =>
                        updateField(
                          "showCashier",
                          event.target.checked
                        )
                      }
                      className="h-5 w-5 accent-slate-900"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <button
                type="button"
                onClick={handleBack}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowLeft size={17} />
                Back
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Setup
                    <Check size={17} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Receipt Preview */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Live preview
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  This is how a receipt will look.
                </p>
              </div>

              <Receipt
                size={20}
                className="text-slate-400"
              />
            </div>

            <div className="mx-auto max-w-sm rounded-xl border border-dashed border-slate-300 bg-white p-5 font-mono text-xs text-slate-700 shadow-sm">
              {/* Logo */}
              {form.showLogo && (
                <div className="mb-3 text-center">
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Store size={18} />
                  </div>

                  <div className="text-sm font-bold">
                    {businessName}
                  </div>
                </div>
              )}

              {!form.showLogo && (
                <div className="mb-3 text-center text-sm font-bold">
                  {businessName}
                </div>
              )}

              <div className="border-b border-dashed border-slate-300 pb-3 text-center">
                <div>
                  {branchName}
                </div>

                {form.showPhone && (
                  <div className="mt-1">
                    {phone}
                  </div>
                )}

                {form.showAddress && (
                  <div className="mt-1 leading-4">
                    {address}
                  </div>
                )}
              </div>

              <div className="border-b border-dashed border-slate-300 py-3">
                <div className="flex justify-between">
                  <span>Receipt</span>
                  <span>
                    {form.prefix}-000001
                  </span>
                </div>

                <div className="mt-1 flex justify-between">
                  <span>Date</span>
                  <span>Today</span>
                </div>

                {form.showCashier && (
                  <div className="mt-1 flex justify-between">
                    <span>Cashier</span>
                    <span>
                      Current User
                    </span>
                  </div>
                )}
              </div>

              <div className="border-b border-dashed border-slate-300 py-3">
                <div className="flex justify-between">
                  <span>Sample Product</span>
                  <span>10,000</span>
                </div>

                <div className="mt-2 flex justify-between">
                  <span>Another Product</span>
                  <span>15,000</span>
                </div>

                <div className="mt-3 flex justify-between font-bold">
                  <span>TOTAL</span>
                  <span>25,000 UGX</span>
                </div>
              </div>

              <div className="pt-3 text-center">
                <p className="leading-5">
                  {form.footer ||
                    "Thank you for shopping with us."}
                </p>

                <p className="mt-3 font-semibold">
                  Powered by MOVA
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4">
              <FileText
                size={18}
                className="mt-0.5 shrink-0 text-slate-500"
              />

              <p className="text-xs leading-5 text-slate-500">
                You can change these receipt settings
                later from MOVA Settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptSetup;