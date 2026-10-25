
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
  headers: {
    "Content-Type": "application/json",
  },
});

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

// Only use retries for sign-in: registration and Google account creation are
// state-changing requests, so replaying them after a lost response can create
// duplicate businesses. Password login is safe to retry.
export const loginWithRetry = async (credentials) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await api.post("/auth/login", credentials);
    } catch (error) {
      const retryable =
        !error?.response ||
        [502, 503, 504].includes(error.response.status);

      if (!retryable || attempt === 3) {
        if (!error?.response) {
          throw Object.assign(
            new Error("MOVA could not be reached. Please check your connection and try again."),
            { cause: error, code: error?.code, config: error?.config }
          );
        }
        throw error;
      }

      await wait(attempt * 800);
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
