import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Printer,
  ReceiptText,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
} from "lucide-react";

const RECEIPT_SETTINGS_KEY = "mova_receipt_settings";

const DEFAULT_SETTINGS = {
  afterSaleAction: "SHOW",
  returnToPOS: false,
  showAmountPaid: true,
  showChange: true,
  showCashier: true,
  showCustomer: true,
  showLogo: true,
};

const loadSettings = () => {
  try {
    const stored = localStorage.getItem(RECEIPT_SETTINGS_KEY);

    if (!stored) {
      return DEFAULT_SETTINGS;
    }

    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(stored),
    };
  } catch (error) {
    console.error("Failed to load MOVA receipt settings:", error);
    return DEFAULT_SETTINGS;
  }
};

const Settings = () => {
  const [settings, setSettings] = useState(() => loadSettings());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSetting = (name, value) => {
    setSettings((current) => ({
      ...current,
      [name]: value,
    }));
    setSaved(false);
  };

  const saveSettings = () => {
    localStorage.setItem(
      RECEIPT_SETTINGS_KEY,
      JSON.stringify(settings)
    );

    window.dispatchEvent(
      new Event("mova:receipt-settings-changed")
    );

    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  const resetSettings = () => {
    const confirmed = window.confirm(
      "Reset receipt settings to MOVA's default settings?"
    );

    if (!confirmed) {
      return;
    }

    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem(
      RECEIPT_SETTINGS_KEY,
      JSON.stringify(DEFAULT_SETTINGS)
    );

    window.dispatchEvent(
      new Event("mova:receipt-settings-changed")
    );

    setSaved(true);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50">
            <SettingsIcon size={23} className="text-blue-600" />
          </div>

          <div>
            <h1 className="text-3xl font-black text-slate-900">
              Settings
            </h1>
            <p className="mt-1 text-slate-500">
              Configure how MOVA handles receipts after a completed sale.
            </p>
          </div>
        </div>
      </div>

      {saved && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <CheckCircle2 size={20} />
          <p className="font-bold">Receipt settings saved successfully.</p>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
            <ReceiptText size={21} className="text-blue-600" />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900">
              Receipt after sale
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose what MOVA should do immediately after a successful sale.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[
            {
              value: "SHOW",
              title: "Open receipt",
              description: "Go directly to the receipt so the cashier can view it, print it or share it.",
            },
            {
              value: "PRINT",
              title: "Print automatically",
              description: "Open the receipt and immediately send it to the browser's print dialog.",
            },
            {
              value: "SHOW_AND_PRINT",
              title: "Open + print automatically",
              description: "Show the receipt in MOVA and automatically start printing it.",
            },
            {
              value: "NONE",
              title: "Do nothing",
              description: "Keep the normal sale-completed screen without automatically opening the receipt.",
            },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateSetting("afterSaleAction", option.value)}
              className={`rounded-2xl border p-5 text-left transition ${
                settings.afterSaleAction === option.value
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-900">{option.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {option.description}
                  </p>
                </div>

                <span
                  className={`mt-1 h-5 w-5 shrink-0 rounded-full border-2 ${
                    settings.afterSaleAction === option.value
                      ? "border-blue-600 bg-blue-600"
                      : "border-slate-300"
                  }`}
                />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <Printer size={21} className="text-emerald-600" />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900">
              Receipt information
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Control which information appears on the receipt.
            </p>
          </div>
        </div>

        <div className="mt-6 divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {[
            ["showAmountPaid", "Show amount paid", "Display the cash amount received from the customer."],
            ["showChange", "Show change", "Display the change returned to the customer."],
            ["showCashier", "Show cashier", "Display the cashier responsible for the sale."],
            ["showCustomer", "Show customer", "Display the selected customer and phone number when available."],
            ["showLogo", "Show business logo", "Display the business logo at the top of the receipt."],
          ].map(([name, title, description]) => (
            <label
              key={name}
              className="flex cursor-pointer items-center justify-between gap-5 p-5"
            >
              <span>
                <span className="block font-black text-slate-800">{title}</span>
                <span className="mt-1 block text-sm text-slate-500">{description}</span>
              </span>

              <input
                type="checkbox"
                checked={Boolean(settings[name])}
                onChange={(event) =>
                  updateSetting(name, event.target.checked)
                }
                className="h-5 w-5 shrink-0 accent-blue-600"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-4">
          <RotateCcw size={21} className="mt-1 shrink-0 text-amber-700" />
          <div>
            <h2 className="font-black text-amber-900">About automatic printing</h2>
            <p className="mt-1 text-sm leading-6 text-amber-800">
              Automatic printing uses the browser's print dialog. If the browser blocks the print window, allow pop-ups for the MOVA site and use the Print Receipt button on the receipt.
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={resetSettings}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-black text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw size={18} />
          Reset Defaults
        </button>

        <button
          type="button"
          onClick={saveSettings}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-black text-white hover:bg-blue-700"
        >
          <Save size={18} />
          Save Receipt Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;
