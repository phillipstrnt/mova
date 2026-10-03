import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Eye,
  FileText,
  Loader2,
  Save,
  Store,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const DEFAULT_SETTINGS = {
  prefix: "MOVA",
  footerMessage: "Thank you for shopping with us.",
  showLogo: true,
  showPhone: true,
  showAddress: true,
  showCashier: true,
};

const ReceiptSetup = () => {
  const navigate = useNavigate();

  const {
    business,
    branch,
  } = useAuth();

  const [formData, setFormData] = useState(
    DEFAULT_SETTINGS
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadReceiptSettings();
  }, []);

  const loadReceiptSettings = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        "/receipt-settings"
      );

      const settings = response?.data?.settings;

      if (settings) {
        setFormData({
          prefix:
            settings.prefix ||
            DEFAULT_SETTINGS.prefix,

          footerMessage:
            settings.footerMessage ??
            DEFAULT_SETTINGS.footerMessage,

          showLogo:
            settings.showLogo ??
            DEFAULT_SETTINGS.showLogo,

          showPhone:
            settings.showPhone ??
            DEFAULT_SETTINGS.showPhone,

          showAddress:
            settings.showAddress ??
            DEFAULT_SETTINGS.showAddress,

          showCashier:
            settings.showCashier ??
            DEFAULT_SETTINGS.showCashier,
        });
      }
    } catch (error) {
      console.error(
        "Failed to load receipt settings:",
        error
      );

      setError(
        error?.response?.data?.message ||
          "Failed to load receipt settings."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    setSuccess("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const prefix = formData.prefix.trim();

    if (!prefix) {
      setError(
        "Please enter a receipt prefix."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await api.put(
        "/receipt-settings",
        {
          prefix,
          footerMessage:
            formData.footerMessage.trim(),

          showLogo: formData.showLogo,
          showPhone: formData.showPhone,
          showAddress: formData.showAddress,
          showCashier: formData.showCashier,
        }
      );

      const settings =
        response?.data?.settings;

      if (settings) {
        setFormData({
          prefix:
            settings.prefix ||
            DEFAULT_SETTINGS.prefix,

          footerMessage:
            settings.footerMessage ??
            DEFAULT_SETTINGS.footerMessage,

          showLogo:
            settings.showLogo ??
            DEFAULT_SETTINGS.showLogo,

          showPhone:
            settings.showPhone ??
            DEFAULT_SETTINGS.showPhone,

          showAddress:
            settings.showAddress ??
            DEFAULT_SETTINGS.showAddress,

          showCashier:
            settings.showCashier ??
            DEFAULT_SETTINGS.showCashier,
        });
      }

      setSuccess(
        "Receipt settings saved successfully."
      );
    } catch (error) {
      console.error(
        "Failed to save receipt settings:",
        error
      );

      setError(
        error?.response?.data?.message ||
          "Failed to save receipt settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const finishSetup = () => {
    navigate("/app", {
      replace: true,
    });
  };

  const currency = useMemo(() => {
    return business?.currency || "UGX";
  }, [business]);

  const businessName =
    business?.name || "Your Business";

  const branchName =
    branch?.name || "Main Branch";

  const businessPhone =
    business?.phone || "+256 700 000 000";

  const businessAddress =
    business?.address ||
    "Kampala, Uganda";

  const receiptNumber =
    `${formData.prefix || "MOVA"}-000124`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-700" />

            <p className="mt-4 text-sm text-slate-500">
              Loading receipt settings...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Store size={20} />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">
                MOVA
              </h1>

              <p className="text-xs text-slate-500">
                Receipt Setup
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-2 text-sm text-slate-500 sm:flex">
            <span>Setup</span>
            <span>/</span>
            <span className="font-medium text-slate-900">
              Receipt
            </span>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-3">
            {/* Business */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check size={18} />
              </div>

              <div className="hidden sm:block">
                <p className="text-xs font-medium text-slate-400">
                  Step 1
                </p>

                <p className="text-sm font-semibold text-slate-700">
                  Business
                </p>
              </div>
            </div>

            {/* Branch */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check size={18} />
              </div>

              <div className="hidden sm:block">
                <p className="text-xs font-medium text-slate-400">
                  Step 2
                </p>

                <p className="text-sm font-semibold text-slate-700">
                  Branch
                </p>
              </div>
            </div>

            {/* Receipt */}
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white">
                3
              </div>

              <div className="hidden sm:block">
                <p className="text-xs font-medium text-slate-400">
                  Step 3
                </p>

                <p className="text-sm font-semibold text-slate-900">
                  Receipt
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold text-slate-500">
            FINAL SETUP STEP
          </p>

          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Configure your receipts
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Choose what customers should see on receipts
            generated by MOVA.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <Check size={17} />
            {success}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Settings */}
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
                  <FileText
                    size={20}
                    className="text-slate-700"
                  />
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900">
                    Receipt information
                  </h3>

                  <p className="text-sm text-slate-500">
                    Configure the basic receipt format.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Receipt Prefix
                  </label>

                  <input
                    type="text"
                    value={formData.prefix}
                    onChange={(event) =>
                      updateField(
                        "prefix",
                        event.target.value
                      )
                    }
                    placeholder="MOVA"
                    maxLength={15}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Example: MOVA-000124
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Footer Message
                  </label>

                  <textarea
                    value={formData.footerMessage}
                    onChange={(event) =>
                      updateField(
                        "footerMessage",
                        event.target.value
                      )
                    }
                    rows={3}
                    maxLength={200}
                    placeholder="Thank you for shopping with us."
                    className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    This message appears at the bottom
                    of the receipt.
                  </p>
                </div>
              </div>
            </div>

            {/* Display options */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">
                Display options
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Choose the information printed on receipts.
              </p>

              <div className="mt-5 space-y-3">
                <ToggleOption
                  label="Show business logo"
                  description="Display your business logo at the top."
                  checked={formData.showLogo}
                  onChange={(value) =>
                    updateField(
                      "showLogo",
                      value
                    )
                  }
                />

                <ToggleOption
                  label="Show phone number"
                  description="Display the business phone number."
                  checked={formData.showPhone}
                  onChange={(value) =>
                    updateField(
                      "showPhone",
                      value
                    )
                  }
                />

                <ToggleOption
                  label="Show address"
                  description="Display the business address."
                  checked={formData.showAddress}
                  onChange={(value) =>
                    updateField(
                      "showAddress",
                      value
                    )
                  }
                />

                <ToggleOption
                  label="Show cashier"
                  description="Display the employee who processed the sale."
                  checked={formData.showCashier}
                  onChange={(value) =>
                    updateField(
                      "showCashier",
                      value
                    )
                  }
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() =>
                  navigate("/setup/branch")
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ArrowLeft size={17} />
                Back
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                    <Save size={17} />
                    Save Receipt Settings
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={finishSetup}
              className="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-900"
            >
              Finish setup and go to dashboard
            </button>
          </form>

          {/* Preview */}
          <div>
            <div className="sticky top-6">
              <div className="mb-3 flex items-center gap-2">
                <Eye
                  size={17}
                  className="text-slate-500"
                />

                <h3 className="text-sm font-semibold text-slate-700">
                  Live Receipt Preview
                </h3>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 shadow-sm">
                <div className="mx-auto max-w-[330px] bg-white px-6 py-7 shadow-md">
                  <div className="text-center">
                    {formData.showLogo && (
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 text-lg font-bold text-white">
                        M
                      </div>
                    )}

                    <h4 className="text-base font-bold uppercase text-slate-900">
                      {businessName}
                    </h4>

                    <p className="mt-1 text-xs text-slate-500">
                      {branchName}
                    </p>

                    {formData.showPhone && (
                      <p className="mt-1 text-xs text-slate-500">
                        {businessPhone}
                      </p>
                    )}

                    {formData.showAddress && (
                      <p className="mt-1 text-xs text-slate-500">
                        {businessAddress}
                      </p>
                    )}
                  </div>

                  <div className="my-5 border-t border-dashed border-slate-300" />

                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Receipt
                      </span>

                      <span className="font-medium text-slate-800">
                        {receiptNumber}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Date
                      </span>

                      <span className="text-slate-700">
                        03/10/2026
                      </span>
                    </div>

                    {formData.showCashier && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Cashier
                        </span>

                        <span className="text-slate-700">
                          Current User
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="my-5 border-t border-dashed border-slate-300" />

                  <div className="space-y-3 text-xs">
                    <ReceiptItem
                      name="Milk"
                      quantity="2"
                      amount="10,000"
                    />

                    <ReceiptItem
                      name="Bread"
                      quantity="1"
                      amount="4,000"
                    />

                    <ReceiptItem
                      name="Sugar"
                      quantity="1"
                      amount="8,000"
                    />
                  </div>

                  <div className="my-5 border-t border-slate-300" />

                  <div className="flex justify-between text-sm font-bold">
                    <span>TOTAL</span>
                    <span>
                      22,000 {currency}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>Payment</span>
                    <span>CASH</span>
                  </div>

                  <div className="my-5 border-t border-dashed border-slate-300" />

                  <p className="text-center text-xs leading-5 text-slate-500">
                    {formData.footerMessage ||
                      "Thank you for shopping with us."}
                  </p>

                  <p className="mt-4 text-center text-[10px] text-slate-400">
                    Powered by MOVA
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const ToggleOption = ({
  label,
  description,
  checked,
  onChange,
}) => {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50">
      <div>
        <p className="text-sm font-medium text-slate-800">
          {label}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked
            ? "bg-slate-900"
            : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
            checked
              ? "left-6"
              : "left-1"
          }`}
        />
      </button>
    </label>
  );
};

const ReceiptItem = ({
  name,
  quantity,
  amount,
}) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-700">
          {name}
        </p>

        <p className="text-[10px] text-slate-400">
          {quantity} × item
        </p>
      </div>

      <span className="font-medium text-slate-700">
        {amount}
      </span>
    </div>
  );
};

export default ReceiptSetup;