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

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("mova_token");

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    const method = String(
      response?.config?.method || ""
    ).toLowerCase();

    if (
      typeof window !== "undefined" &&
      ["post", "put", "patch", "delete"].includes(method)
    ) {
      window.dispatchEvent(
        new CustomEvent("mova:data-updated", {
          detail: {
            method,
            url: response?.config?.url || "",
          },
        })
      );
    }

    return response;
  },

  (error) => {
    const status =
      error.response?.status;

    const requestUrl =
      error.config?.url || "";

    /*
      Do not clear the existing login session
      when the login request itself fails.
    */
    if (
      status === 401 &&
      !requestUrl.includes(
        "/auth/login"
      )
    ) {
      localStorage.removeItem(
        "mova_token"
      );

      localStorage.removeItem(
        "mova_user"
      );

      localStorage.removeItem(
        "mova_business"
      );

      localStorage.removeItem(
        "mova_branch"
      );
    }

    return Promise.reject(error);
  }
);

export default api;
