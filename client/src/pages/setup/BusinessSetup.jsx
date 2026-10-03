import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Building2,
  Check,
  Globe2,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  Save,
  Store,
  Upload,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const BUSINESS_TYPES = [
  "Retail",
  "Wholesale",
  "Restaurant",
  "Pharmacy",
  "Hardware",
  "Services",
  "Supermarket",
  "Boutique",
  "Electronics",
  "Other",
];

const CURRENCIES = [
  {
    value: "UGX",
    label: "Ugandan Shilling (UGX)",
  },
  {
    value: "KES",
    label: "Kenyan Shilling (KES)",
  },
  {
    value: "TZS",
    label: "Tanzanian Shilling (TZS)",
  },
  {
    value: "USD",
    label: "US Dollar (USD)",
  },
];

const TIMEZONES = [
  {
    value: "Africa/Kampala",
    label: "Africa/Kampala (Uganda)",
  },
  {
    value: "Africa/Nairobi",
    label: "Africa/Nairobi (Kenya)",
  },
  {
    value: "Africa/Dar_es_Salaam",
    label: "Africa/Dar_es_Salaam (Tanzania)",
  },
  {
    value: "UTC",
    label: "UTC",
  },
];

const STEPS = [
  {
    number: 1,
    title: "Business",
  },
  {
    number: 2,
    title: "Branch",
  },
  {
    number: 3,
    title: "Receipt",
  },
];

const BusinessSetup = () => {
  const navigate = useNavigate();

  const {
    business,
    setBusiness,
  } = useAuth();

  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    businessType: "",
    phone: "",
    email: "",
    address: "",
    country: "Uganda",
    currency: "UGX",
    timezone: "Africa/Kampala",
    logo: "",
  });

  const [logoPreview, setLogoPreview] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!business) {
      return;
    }

    setFormData({
      name: business.name || "",
      businessType: business.businessType || "",
      phone: business.phone || "",
      email: business.email || "",
      address: business.address || "",
      country: business.country || "Uganda",
      currency: business.currency || "UGX",
      timezone:
        business.timezone || "Africa/Kampala",
      logo: business.logo || "",
    });

    setLogoPreview(business.logo || "");
  }, [business]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Business logo must be smaller than 5MB."
      );
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    setLogoPreview(previewUrl);

    /*
     * We keep the selected file in the browser for now.
     * Cloudinary upload will be added in the next step.
     */
    setFormData((current) => ({
      ...current,
      logo: "",
    }));

    setError("");
    setSuccess("");
  };

  const removeLogo = () => {
    setLogoPreview("");

    setFormData((current) => ({
      ...current,
      logo: "",
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const validate = () => {
    if (!formData.name.trim()) {
      return "Please enter your business name.";
    }

    if (!formData.businessType.trim()) {
      return "Please select your business type.";
    }

    if (!formData.phone.trim()) {
      return "Please enter your business phone number.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api.put(
        "/business/profile",
        {
          name: formData.name.trim(),
          businessType:
            formData.businessType.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          address: formData.address.trim(),
          country: formData.country.trim(),
          currency: formData.currency,
          timezone: formData.timezone,
          logo: formData.logo,
        }
      );

      const updatedBusiness =
        response?.data?.business;

      if (updatedBusiness) {
        setBusiness(updatedBusiness);

        localStorage.setItem(
          "mova_business",
          JSON.stringify(updatedBusiness)
        );
      }

      setSuccess(
        "Business information saved successfully."
      );

      setTimeout(() => {
        navigate("/setup/branch");
      }, 700);
    } catch (requestError) {
      console.error(
        "Business setup error:",
        requestError
      );

      setError(
        requestError?.response?.data?.message ||
          "Failed to save business information. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    navigate("/app");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
              <Store size={22} />
            </div>

            <div>
              <p className="text-lg font-bold text-slate-900">
                MOVA
              </p>
              <p className="text-xs text-slate-500">
                Business setup
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            Set up later
          </button>
        </div>

        {/* Progress */}
        <div className="mx-auto mb-8 max-w-3xl">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div
                key={step.number}
                className="flex flex-1 items-center"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                      step.number === 1
                        ? "bg-slate-900 text-white"
                        : "bg-white text-slate-400 ring-1 ring-slate-200"
                    }`}
                  >
                    {step.number}
                  </div>

                  <span
                    className={`mt-2 text-xs font-medium ${
                      step.number === 1
                        ? "text-slate-900"
                        : "text-slate-400"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                {index < STEPS.length - 1 && (
                  <div className="mx-3 mt-[-18px] h-px flex-1 bg-slate-200" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Main card */}
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-slate-100 p-3">
                <Building2
                  size={24}
                  className="text-slate-700"
                />
              </div>

              <div>
                <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Set up your business
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Tell MOVA about your business. This
                  information will appear throughout your
                  POS, receipts, reports and dashboard.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 sm:p-8"
          >
            {/* Alerts */}
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <Check size={17} />
                {success}
              </div>
            )}

            {/* Logo */}
            <section className="mb-10">
              <div className="mb-4">
                <h2 className="font-semibold text-slate-900">
                  Business logo
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Your logo can appear on receipts,
                  reports and the MOVA business interface.
                </p>
              </div>

              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Business logo preview"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImagePlus
                      size={32}
                      className="text-slate-400"
                    />
                  )}
                </div>

                <div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      <Upload size={16} />
                      Upload logo
                    </button>

                    {logoPreview && (
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <X size={16} />
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoChange}
                    className="hidden"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    PNG, JPG, WEBP or SVG. Maximum 5MB.
                  </p>
                </div>
              </div>
            </section>

            {/* Business identity */}
            <section className="mb-10">
              <div className="mb-5">
                <h2 className="font-semibold text-slate-900">
                  Business information
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Basic information about the business.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Business name *
                  </label>

                  <div className="relative">
                    <Building2
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Green Star Supermarket"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Business type *
                  </label>

                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >
                    <option value="">
                      Select business type
                    </option>

                    {BUSINESS_TYPES.map((type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Phone number *
                  </label>

                  <div className="relative">
                    <Phone
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+256 7XX XXX XXX"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Business email
                  </label>

                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="business@example.com"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Business address
                  </label>

                  <div className="relative">
                    <MapPin
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Street, town, district"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Regional settings */}
            <section className="mb-10">
              <div className="mb-5">
                <h2 className="font-semibold text-slate-900">
                  Regional settings
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  These settings control how prices,
                  receipts and dates are displayed.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Country
                  </label>

                  <div className="relative">
                    <Globe2
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="text"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Currency
                  </label>

                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >
                    {CURRENCIES.map(
                      (currency) => (
                        <option
                          key={currency.value}
                          value={currency.value}
                        >
                          {currency.label}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Timezone
                  </label>

                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
                  >
                    {TIMEZONES.map(
                      (timezone) => (
                        <option
                          key={timezone.value}
                          value={timezone.value}
                        >
                          {timezone.label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            </section>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">
                You can change these settings later from
                Business Settings.
              </p>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={17} />

                {saving
                  ? "Saving..."
                  : "Save & Continue"}

                {!saving && (
                  <ArrowRight size={17} />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BusinessSetup;