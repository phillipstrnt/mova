
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  MapPin,
  Phone,
  User,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const ReceiptSetup = () => {
  const navigate = useNavigate();

  const {
    business,
    branch,
    setBusiness,
    setBranch,
  } = useAuth();

  const [form, setForm] = useState({
    prefix: "MOVA",
    footerMessage: "Thank you for shopping with us.",
    showLogo: true,
    showPhone: true,
    showAddress: true,
    showCashier: true,
  });

  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [error, setError] = useState("");

  /*
   * Receipt settings are kept separately from the core
   * Business document so that receipt configuration can
   * grow later without making Business.js unnecessarily large.
   */

  useEffect(() => {
    const loadReceiptSettings = async () => {
      try {
        setLoadingSettings(true);

        /*
         * This endpoint is optional at this stage.
         *
         * If it does not exist yet, we simply use the
         * default receipt settings below.
         */
        try {
          const response = await api.get("/business/receipt-settings");

          const settings =
            response?.data?.settings ||
            response?.data?.receiptSettings;

          if (settings) {
            setForm((previous) => ({
              ...previous,
              ...settings,
            }));
          }
        } catch (requestError) {
          /*
           * A missing endpoint should not prevent onboarding.
           * The settings will be saved when the backend endpoint
           * is added.
           */

          console.log(
            "Receipt settings endpoint not available yet. Using defaults."
          );
        }
      } finally {
        setLoadingSettings(false);
      }
    };

    loadReceiptSettings();
  }, []);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!form.prefix.trim()) {
      setError("Receipt prefix is required.");
      return;
    }

    try {
      setLoading(true);

      /*
       * We attempt to save receipt settings.
       *
       * If the backend endpoint has not been created yet,
       * onboarding will still continue. This allows us to
       * build the frontend flow before the final receipt
       * configuration API is implemented.
       */

      try {
        await api.put("/business/receipt-settings", {
          prefix: form.prefix.trim().toUpperCase(),
          footerMessage: form.footerMessage.trim(),
          showLogo: form.showLogo,
          showPhone: form.showPhone,
          showAddress: form.showAddress,
          showCashier: form.showCashier,
        });
      } catch (requestError) {
        console.log(
          "Receipt settings could not be saved yet:",
          requestError?.response?.data?.message ||
            requestError?.message
        );
      }

      /*
       * Refresh the business/branch session from localStorage
       * if they already exist. This keeps the onboarding state
       * intact.
       */

      if (business) {
        setBusiness(business);
      }

      if (branch) {
        setBranch(branch);
      }

      navigate("/app", {
        replace: true,
      });
    } catch (err) {
      console.error("Receipt setup error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to complete receipt setup."
      );
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    navigate("/setup/branch");
  };

  const skipSetup = () => {
    navigate("/app", {
      replace: true,
    });
  };

  if (loadingSettings) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

          <p className="mt-4 text-sm text-slate-500">
            Loading receipt settings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">

          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 font-black text-white">
              M
            </div>

            <div>
              <p className="font-bold text-slate-900">
                MOVA
              </p>

              <p className="text-xs text-slate-500">
                Business setup
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={skipSetup}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Set up later
          </button>

        </div>
      </header>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8">

        {/* Progress */}

        <div className="mb-10">

          <div className="flex items-center justify-center gap-2 sm:gap-4">

            {/* Step 1 */}

            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-4 w-4" />
              </div>

              <span className="hidden text-sm font-medium text-slate-700 sm:block">
                Business
              </span>
            </div>

            <div className="h-px w-8 bg-emerald-300 sm:w-16" />

            {/* Step 2 */}

            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Check className="h-4 w-4" />
              </div>

              <span className="hidden text-sm font-medium text-slate-700 sm:block">
                Branch
              </span>
            </div>

            <div className="h-px w-8 bg-slate-300 sm:w-16" />

            {/* Step 3 */}

            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                3
              </div>

              <span className="hidden text-sm font-semibold text-slate-900 sm:block">
                Receipt
              </span>
            </div>

          </div>

          <div className="mt-5 text-center">
            <p className="text-sm font-semibold text-blue-600">
              Step 3 of 3
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Configure your receipts
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Choose what customers should see on printed or digital
              receipts generated by MOVA.
            </p>
          </div>

        </div>

        {/* Error */}

        {error && (
          <div className="mx-auto mb-6 max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

          {/* =================================================
              SETTINGS FORM
          ================================================= */}

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
          >

            <div className="mb-7 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Receipt preferences
                </h2>

                <p className="text-sm text-slate-500">
                  Customize your customer receipts.
                </p>
              </div>
            </div>

            {/* Prefix */}

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Receipt prefix
              </label>

              <input
                type="text"
                name="prefix"
                value={form.prefix}
                onChange={handleChange}
                placeholder="MOVA"
                maxLength={10}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                Example: MOVA-000001
              </p>
            </div>

            {/* Footer */}

            <div className="mt-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Footer message
              </label>

              <textarea
                name="footerMessage"
                value={form.footerMessage}
                onChange={handleChange}
                rows={3}
                placeholder="Thank you for shopping with us."
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-500">
                This message appears at the bottom of the receipt.
              </p>
            </div>

            {/* Display options */}

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-slate-900">
                Receipt information
              </h3>

              <div className="mt-4 space-y-3">

                {/* Logo */}

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">

                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Show business logo
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Display your business logo at the top.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    name="showLogo"
                    checked={form.showLogo}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-slate-300"
                  />

                </label>

                {/* Phone */}

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">

                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Show phone number
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Display the business contact number.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    name="showPhone"
                    checked={form.showPhone}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-slate-300"
                  />

                </label>

                {/* Address */}

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">

                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Show address
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Display the branch address.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    name="showAddress"
                    checked={form.showAddress}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-slate-300"
                  />

                </label>

                {/* Cashier */}

                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">

                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Show cashier
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Display the cashier who processed the sale.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    name="showCashier"
                    checked={form.showCashier}
                    onChange={handleChange}
                    className="h-5 w-5 rounded border-slate-300"
                  />

                </label>

              </div>
            </div>

            {/* Navigation */}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">

              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  "Finishing setup..."
                ) : (
                  <>
                    Finish setup
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

            </div>

          </form>

          {/* =================================================
              RECEIPT PREVIEW
          ================================================= */}

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Receipt preview
              </h2>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                Preview
              </span>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="mx-auto max-w-xs">

                {/* Logo */}

                {form.showLogo && (
                  <div className="mb-4 flex justify-center">
                    {business?.logo ? (
                      <img
                        src={business.logo}
                        alt={business.name || "Business logo"}
                        className="h-16 w-16 rounded-xl object-contain"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-900 text-xl font-black text-white">
                        M
                      </div>
                    )}
                  </div>
                )}

                {/* Business */}

                <div className="text-center">

                  <h3 className="font-bold text-slate-900">
                    {business?.name || "Your Business"}
                  </h3>

                  {form.showPhone && business?.phone && (
                    <div className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-500">
                      <Phone className="h-3 w-3" />
                      {business.phone}
                    </div>
                  )}

                  {form.showAddress && (
                    <div className="mt-1 flex items-center justify-center gap-1 text-center text-xs text-slate-500">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>
                        {branch?.address ||
                          business?.address ||
                          "Business address"}
                      </span>
                    </div>
                  )}

                </div>

                <div className="my-5 border-t border-dashed border-slate-300" />

                {/* Receipt number */}

                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">
                    Receipt
                  </span>

                  <span className="font-semibold text-slate-800">
                    {form.prefix.toUpperCase() || "MOVA"}-000001
                  </span>
                </div>

                <div className="mt-2 flex justify-between text-xs">
                  <span className="text-slate-500">
                    Date
                  </span>

                  <span className="text-slate-700">
                    Today
                  </span>
                </div>

                {form.showCashier && (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      Cashier
                    </span>

                    <span className="flex items-center gap-1 text-slate-700">
                      <User className="h-3 w-3" />
                      Cashier
                    </span>
                  </div>
                )}

                <div className="my-5 border-t border-slate-200" />

                {/* Items */}

                <div className="space-y-3 text-xs">

                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      Sample Product × 2
                    </span>

                    <span className="font-medium text-slate-800">
                      UGX 20,000
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-600">
                      Another Product × 1
                    </span>

                    <span className="font-medium text-slate-800">
                      UGX 10,000
                    </span>
                  </div>

                </div>

                <div className="my-5 border-t border-dashed border-slate-300" />

                <div className="flex justify-between text-sm font-bold text-slate-900">
                  <span>
                    TOTAL
                  </span>

                  <span>
                    UGX 30,000
                  </span>
                </div>

                <div className="mt-5 border-t border-dashed border-slate-300 pt-4 text-center text-xs leading-5 text-slate-500">
                  {form.footerMessage ||
                    "Thank you for shopping with us."}
                </div>

              </div>

            </div>

          </div>

        </div>

      </main>
    </div>
  );
};

export default ReceiptSetup;