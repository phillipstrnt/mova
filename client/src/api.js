
import axios from "axios";

// VITE_API_URL is the preferred deployment setting, but keep a production
// fallback so a missing Vercel environment variable never points visitors at
// their own computer (localhost). Local development still uses the local API.
const DEFAULT_API_URL = import.meta.env.PROD
  ? "https://mova-syfn.onrender.com/api"
  : "http://localhost:5000/api";

const API_URL =
  import.meta.env.VITE_API_URL ||
  DEFAULT_API_URL;

const api = axios.create({
  baseURL: API_URL,
  // Render Free services can take roughly a minute to wake after idling.
  // Allow authentication requests to survive that cold start.
  timeout: 90_000,
  headers: {
    "Content-Type": "application/json",
  },
});

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

// Authentication POSTs are safe to retry: failed credentials are never
// retried, while connection failures and transient Render gateway responses
// often mean the sleeping API is still waking up.
export const postAuthWithRetry = async (url, data) => {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await api.post(url, data, { timeout: 90_000 });
    } catch (error) {
      const status = error?.response?.status;
      const retryable =
        !error?.response || [502, 503, 504].includes(status);

      if (!retryable || attempt === maxAttempts) {
        if (!error?.response) {
          throw Object.assign(
            new Error(
              "MOVA's server is taking longer than expected to respond. Please check your internet connection and try again."
            ),
            { cause: error, code: error?.code, config: error?.config }
          );
        }

        throw error;
      }

      await delay(attempt * 1200);
    }
  }
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("mova_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const method = String(response?.config?.method || "").toLowerCase();
    if (
      typeof window !== "undefined" &&
      ["post", "put", "patch", "delete"].includes(method)
    ) {
      window.dispatchEvent(
        new CustomEvent("mova:data-updated", {
          detail: { method, url: response?.config?.url || "" },
        })
      );
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || "";

    if (
      status === 401 &&
      !requestUrl.includes("/auth/login")
    ) {
      localStorage.removeItem("mova_token");
      localStorage.removeItem("mova_user");
      localStorage.removeItem("mova_business");
      localStorage.removeItem("mova_branch");
      window.dispatchEvent(new CustomEvent("mova:auth-expired"));
    }

    return Promise.reject(error);
  }
);

export default api;
