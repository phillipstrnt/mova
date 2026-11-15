
import axios from "axios";
import { useEffect, useState } from "react";

// VITE_API_URL is the preferred deployment setting, but keep a production
// fallback so a missing Vercel environment variable never points visitors at
// their own computer (localhost). Local development still uses the local API.
const DEFAULT_API_URL = import.meta.env.PROD
  ? "/api"
  : "http://localhost:5000/api";

const configuredApiUrl = import.meta.env.VITE_API_URL;
const recoveryApiUrl = "https://mova-api-7m8j.onrender.com/api";

const API_URL =
  configuredApiUrl && /mova-syfn\.onrender\.com/i.test(configuredApiUrl)
    ? recoveryApiUrl
    : configuredApiUrl || DEFAULT_API_URL;

const api = axios.create({
  baseURL: API_URL,
  // Allow authentication requests to survive a cold start.
  timeout: 90_000,
  headers: {
    "Content-Type": "application/json",
  },
});

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const API_WAKE_TIMEOUT_MS = 90_000;
const API_READY_CACHE_MS = 30_000;
const API_WAKE_STARTED_KEY = "mova_api_wake_started_at";
const API_WAKE_PROGRESS_MAX_AGE_MS = 15 * 60_000;
const wakeListeners = new Set();
let wakeSnapshot = {
  status: "idle",
  percentage: 0,
  elapsedMs: 0,
  message: "",
};
let readinessPromise = null;
let apiReadyUntil = 0;

const publishWakeState = (nextState) => {
  wakeSnapshot = nextState;
  wakeListeners.forEach((listener) => listener(wakeSnapshot));
};

export const useApiWakeProgress = () => {
  const [state, setState] = useState(wakeSnapshot);

  useEffect(() => {
    wakeListeners.add(setState);
    setState(wakeSnapshot);
    return () => wakeListeners.delete(setState);
  }, []);

  return state;
};

/**
 * Wait until both the hosted API and its database are ready before a user
 * request starts. The host exposes readiness, not boot percentage, so the
 * percentage shown by the UI is an elapsed-time estimate capped at 95%.
 */
export const warmApi = ({ force = false, timeoutMs = API_WAKE_TIMEOUT_MS } = {}) => {
  if (!force && Date.now() < apiReadyUntil) {
    return Promise.resolve(wakeSnapshot);
  }

  if (readinessPromise) return readinessPromise;

  const attemptStartedAt = Date.now();
  let progressStartedAt = attemptStartedAt;
  try {
    const savedStart = Number(window.localStorage.getItem(API_WAKE_STARTED_KEY));
    if (
      Number.isFinite(savedStart) &&
      savedStart > 0 &&
      attemptStartedAt - savedStart < API_WAKE_PROGRESS_MAX_AGE_MS
    ) {
      progressStartedAt = savedStart;
    } else {
      window.localStorage.setItem(API_WAKE_STARTED_KEY, String(attemptStartedAt));
    }
  } catch {
    // Storage may be unavailable in private browsing; progress still works in-page.
  }

  const initialElapsedMs = Date.now() - progressStartedAt;
  const initialPercentage = Math.min(
    95,
    Math.max(2, Math.round((initialElapsedMs / timeoutMs) * 95))
  );
  publishWakeState({
    status: "waking",
    percentage: initialPercentage,
    elapsedMs: initialElapsedMs,
    message:
      initialElapsedMs > 25_000
        ? "Still starting MOVA and reconnecting its database…"
        : "Connecting to MOVA…",
  });

  const progressTimer = window.setInterval(() => {
    const elapsedMs = Date.now() - progressStartedAt;
    const percentage = Math.min(
      95,
      Math.max(2, Math.round((elapsedMs / timeoutMs) * 95))
    );
    publishWakeState({
      status: "waking",
      percentage,
      elapsedMs,
      message:
        elapsedMs > 25_000
          ? "Still starting MOVA and reconnecting its database…"
          : "Waking the MOVA service…",
    });
  }, 500);

  readinessPromise = (async () => {
    try {
      while (Date.now() - attemptStartedAt < timeoutMs) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          throw new Error("You appear to be offline. Reconnect, then try again.");
        }

        try {
          const response = await api.get("/health", {
            timeout: 10_000,
            __skipApiWake: true,
          });
          if (response.data?.success && response.data?.status === "healthy") {
            apiReadyUntil = Date.now() + API_READY_CACHE_MS;
            try {
              window.localStorage.removeItem(API_WAKE_STARTED_KEY);
            } catch {
              // Ignore unavailable browser storage.
            }
            publishWakeState({
              status: "ready",
              percentage: 100,
              elapsedMs: Date.now() - progressStartedAt,
              message: "MOVA is ready.",
            });
            return wakeSnapshot;
          }
        } catch (error) {
          const status = error?.response?.status;
          if (status && ![502, 503, 504].includes(status)) throw error;
        }

        await delay(2_000);
      }

      throw new Error(
        "MOVA is taking longer than expected to start. Your data is safe; check your connection and retry."
      );
    } catch (error) {
      publishWakeState({
        status: "error",
        percentage: 0,
        elapsedMs: Date.now() - progressStartedAt,
        message: error.message || "MOVA could not connect. Please retry.",
      });
      throw error;
    } finally {
      window.clearInterval(progressTimer);
      readinessPromise = null;
    }
  })();

  return readinessPromise;
};

// Authentication POSTs are safe to retry: failed credentials are never
// retried, while connection failures and transient gateway responses may
// indicate that the API is still waking up.
export const postAuthWithRetry = async (url, data) => {
  await warmApi();
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await api.post(url, data, { timeout: 25_000 });
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

      await delay(attempt * 1000);
    }
  }
};

api.interceptors.request.use(
  async (config) => {
    const requestPath = String(config.url || "");
    const isHealthProbe = /(?:^|\/)health(?:\?|$)/i.test(requestPath);

    // An installed app can remain open until the hosted API goes idle. Wait
    // for API and database readiness before sending any real request so a
    // cold start never drops a user's save, sale, or other write request.
    if (!config.__skipApiWake && !isHealthProbe) {
      await warmApi();
    }

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
