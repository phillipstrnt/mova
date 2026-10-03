import { useRef, useState } from "react";
import {
  Building2,
  Camera,
  Check,
  Globe2,
  Mail,
  MapPin,
  Phone,
  Upload,
  X,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const BusinessSetup = () => {
  const { business, setBusiness } = useAuth();

  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: business?.name || "",
    businessType: business?.businessType || "",
    phone: business?.phone || "",
    email: business?.email || "",
    address: business?.address || "",
    country: business?.country || "Uganda",
    currency: business?.currency || "UGX",
    timezone: business?.timezone || "Africa/Kampala",
  });

  const [logoPreview, setLogoPreview] = useState(
    business?.logo || ""
  );

  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Logo must be smaller than 5MB.");
      return;
    }

    setError("");
    setLogoFile(file);

    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(business?.logo || "");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      setError("Business name is required.");
      return;
    }

    if (!formData.businessType) {
      setError("Please select your business type.");
      return;
    }

    setSaving(true);

    try {
      let logoUrl = business?.logo || "";

      /*
       * Logo upload will be connected to Cloudinary.
       * For now, the business information is saved first.
       */
      if (logoFile) {
        const uploadData = new FormData();

        uploadData.append("image", logoFile);

        try {
          const uploadResponse = await api.post(
            "/upload/image",
            uploadData,
            {
              headers: {
                "Content-Type": "multipart/form-data",
              },
            }
          );

          logoUrl =
            uploadResponse.data?.url ||
            uploadResponse.data?.imageUrl ||
            uploadResponse.data?.data?.url ||
            "";
        } catch (uploadError) {
          console.warn(
            "Logo upload failed:",
            uploadError?.response?.data || uploadError.message
          );

          setError(
            "Business details can be saved, but the logo could not be uploaded yet."
          );
        }
      }

      const response = await api.put(
        "/business/profile",
        {
          ...formData,
          logo: logoUrl,
        }
      );

      const updatedBusiness =
        response.data?.business ||
        response.data?.data ||
        response.data;

      if (updatedBusiness) {
        localStorage.setItem(
          "mova_business",
          JSON.stringify(updatedBusiness)
        );

        /*
         * AuthContext currently exposes the business value.
         * If setBusiness is available, update it immediately.
         */
        if (typeof setBusiness === "function") {
          setBusiness(updatedBusiness);
        }
      }

      if (logoUrl) {
        setLogoPreview(logoUrl);
      }

      setSuccess("Business profile saved successfully.");
    } catch (err) {
      console.error(
        "Business profile update failed:",
        err
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to save your business profile."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Building2 size={24} />
          </div>

          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Business Setup
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome to MOVA 👋
          </h1>

          <p className="mt-2 max-w-2xl text-slate-600">
            Let's set up your business profile. You can update
            these details later from Settings.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              1
            </div>

            <div className="h-px flex-1 bg-slate-200" />

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-400">
              2
            </div>

            <div className="h-px flex-1 bg-slate-200" />

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-400">
              3
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 text-center text-xs font-medium">
            <span className="text-slate-900">
              Business
            </span>
            <span className="text-slate-400">
              Branch
            </span>
            <span className="text-slate-400">
              Receipt
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Logo */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Business Logo
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your logo will appear throughout MOVA.
              </p>

              <div className="mt-6 flex flex-col items-center">
                <div className="relative">
                  <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Business logo preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <Building2
                        size={48}
                        className="text-slate-300"
                      />
                    )}
                  </div>

                  {logoPreview && (
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-600 shadow-md hover:bg-slate-100"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleLogoChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="mt-5 flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {logoPreview ? (
                    <>
                      <Camera size={17} />
                      Change Logo
                    </>
                  ) : (
                    <>
                      <Upload size={17} />
                      Upload Logo
                    </>
                  )}
                </button>

                <p className="mt-3 text-center text-xs text-slate-400">
                  PNG, JPG or WebP
                  <br />
                  Maximum 5MB
                </p>
              </div>
            </div>

            {/* Business details */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Business Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Tell us about the business you're managing.
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">

                {/* Business name */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Business Name *
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
                      className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                {/* Business type */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Business Type *
                  </label>

                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option value="">
                      Select business type
                    </option>
                    <option value="Retail">
                      Retail
                    </option>
                    <option value="Wholesale">
                      Wholesale
                    </option>
                    <option value="Restaurant">
                      Restaurant
                    </option>
                    <option value="Pharmacy">
                      Pharmacy
                    </option>
                    <option value="Hardware">
                      Hardware
                    </option>
                    <option value="Services">
                      Services
                    </option>
                    <option value="Other">
                      Other
                    </option>
                  </select>
                </div>

                {/* Country */}
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
                      className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Phone
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
                      placeholder="0700 000 000"
                      className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Business Email
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
                      className="w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Business Address
                  </label>

                  <div className="relative">
                    <MapPin
                      size={18}
                      className="absolute left-3 top-3 text-slate-400"
                    />

                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      rows={3}
                      placeholder="e.g. Mukono Town, Uganda"
                      className="w-full resize-none rounded-lg border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>

                {/* Currency */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Currency
                  </label>

                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option value="UGX">
                      UGX — Ugandan Shilling
                    </option>
                    <option value="KES">
                      KES — Kenyan Shilling
                    </option>
                    <option value="TZS">
                      TZS — Tanzanian Shilling
                    </option>
                    <option value="USD">
                      USD — US Dollar
                    </option>
                  </select>
                </div>

                {/* Timezone */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Timezone
                  </label>

                  <select
                    name="timezone"
                    value={formData.timezone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option value="Africa/Kampala">
                      Africa/Kampala
                    </option>
                    <option value="Africa/Nairobi">
                      Africa/Nairobi
                    </option>
                    <option value="Africa/Dar_es_Salaam">
                      Africa/Dar es Salaam
                    </option>
                    <option value="UTC">
                      UTC
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <Check size={18} />
              {success}
            </div>
          )}

          {/* Bottom actions */}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              className="rounded-lg px-5 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-100"
            >
              Set up later
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : "Save & Continue →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BusinessSetup;