
const isBrowser = typeof window !== "undefined";

let deferredInstallPrompt = null;

const installListeners = new Set();
const networkListeners = new Set();

/* =========================================================
   PWA INSTALL STATE
========================================================= */

export const isPWAInstalled = () => {
  if (!isBrowser) {
    return false;
  }

  const standalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches === true;

  const fullscreen =
    window.matchMedia?.("(display-mode: fullscreen)")?.matches === true;

  const minimalUi =
    window.matchMedia?.("(display-mode: minimal-ui)")?.matches === true;

  const navigatorStandalone =
    window.navigator?.standalone === true;

  return Boolean(
    standalone ||
      fullscreen ||
      minimalUi ||
      navigatorStandalone
  );
};

export const canInstallPWA = () => {
  return Boolean(deferredInstallPrompt);
};

const getInstallState = () => {
  return {
    canInstall: canInstallPWA(),
    isInstalled: isPWAInstalled(),
  };
};

const notifyInstallListeners = () => {
  const state = getInstallState();

  installListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      console.error(
        "MOVA PWA listener error:",
        error
      );
    }
  });
};

/* =========================================================
   SUBSCRIBE TO INSTALL STATE
========================================================= */

export const subscribeToPWAInstallState = (
  listener
) => {
  if (typeof listener !== "function") {
    return () => {};
  }

  installListeners.add(listener);

  try {
    listener(getInstallState());
  } catch (error) {
    console.error(
      "MOVA PWA initial listener error:",
      error
    );
  }

  return () => {
    installListeners.delete(listener);
  };
};

/* =========================================================
   INSTALL PWA
========================================================= */

export const installPWA = async () => {
  if (!isBrowser) {
    return {
      success: false,
      outcome: "unavailable",
      reason: "browser_unavailable",
    };
  }

  /*
   * If the browser has supplied the native installation
   * prompt, use it.
   */
  if (deferredInstallPrompt) {
    try {
      const promptEvent = deferredInstallPrompt;

      /*
       * The beforeinstallprompt event can only be used
       * once in most browsers.
       */
      deferredInstallPrompt = null;

      notifyInstallListeners();

      await promptEvent.prompt();

      const result = await promptEvent.userChoice;

      const outcome =
        result?.outcome || "unknown";

      if (outcome === "accepted") {
        console.log(
          "MOVA PWA: Installation accepted."
        );
      } else {
        console.log(
          "MOVA PWA: Installation dismissed."
        );
      }

      notifyInstallListeners();

      return {
        success: outcome === "accepted",
        outcome,
      };
    } catch (error) {
      console.error(
        "MOVA PWA installation error:",
        error
      );

      notifyInstallListeners();

      return {
        success: false,
        outcome: "error",
        error,
      };
    }
  }

  /*
   * The browser did not provide beforeinstallprompt.
   *
   * We cannot force the browser's native installation
   * dialog. The dashboard will therefore display
   * manual installation instructions.
   */
  return {
    success: false,
    outcome: "manual",
    reason: "browser_install_prompt_unavailable",
  };
};

/* =========================================================
   SERVICE WORKER
========================================================= */

export const registerPWA = () => {
  if (!isBrowser) {
    return;
  }

  if (!("serviceWorker" in navigator)) {
    console.warn(
      "MOVA PWA: Service workers are not supported by this browser."
    );

    return;
  }

  /*
   * We only register the service worker in production.
   *
   * For local testing:
   * npm run build
   * npm run preview
   */
  if (!import.meta.env.PROD) {
    console.log(
      "MOVA PWA: Service worker registration is disabled in development."
    );

    return;
  }

  window.addEventListener(
    "load",
    async () => {
      try {
        const registration =
          await navigator.serviceWorker.register(
            "/sw.js",
            {
              scope: "/",
            }
          );

        console.log(
          "MOVA PWA: Service worker registered successfully.",
          registration.scope
        );

        registration.addEventListener(
          "updatefound",
          () => {
            const newWorker =
              registration.installing;

            if (!newWorker) {
              return;
            }

            newWorker.addEventListener(
              "statechange",
              () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  console.log(
                    "MOVA PWA: New application version available."
                  );

                  window.dispatchEvent(
                    new CustomEvent(
                      "mova:pwa-update-available"
                    )
                  );
                }
              }
            );
          }
        );
      } catch (error) {
        console.error(
          "MOVA PWA: Service worker registration failed.",
          error
        );
      }
    },
    {
      once: true,
    }
  );
};

export const registerMovaServiceWorker = () => {
  registerPWA();
};

/* =========================================================
   NETWORK STATUS
========================================================= */

const getNetworkState = () => {
  if (!isBrowser) {
    return {
      online: true,
      offline: false,
    };
  }

  return {
    online: navigator.onLine,
    offline: !navigator.onLine,
  };
};

const notifyNetworkListeners = () => {
  if (!isBrowser) {
    return;
  }

  const state = getNetworkState();

  networkListeners.forEach((listener) => {
    try {
      listener(state);
    } catch (error) {
      console.error(
        "MOVA network listener error:",
        error
      );
    }
  });

  window.dispatchEvent(
    new CustomEvent(
      "mova:network-status",
      {
        detail: state,
      }
    )
  );
};

export const initializeMovaNetworkStatus = () => {
  if (!isBrowser) {
    return;
  }

  if (window.__MOVA_NETWORK_INITIALIZED__) {
    return;
  }

  window.__MOVA_NETWORK_INITIALIZED__ = true;

  window.addEventListener(
    "online",
    () => {
      console.log(
        "MOVA Network: Internet connection restored."
      );

      notifyNetworkListeners();
    }
  );

  window.addEventListener(
    "offline",
    () => {
      console.log(
        "MOVA Network: Internet connection lost."
      );

      notifyNetworkListeners();
    }
  );

  notifyNetworkListeners();
};

export const subscribeToMovaNetworkStatus = (
  listener
) => {
  if (typeof listener !== "function") {
    return () => {};
  }

  networkListeners.add(listener);

  try {
    listener(getNetworkState());
  } catch (error) {
    console.error(
      "MOVA network listener error:",
      error
    );
  }

  return () => {
    networkListeners.delete(listener);
  };
};

/* =========================================================
   INSTALL PROMPT INITIALIZATION
========================================================= */

export const initializePWAInstallPrompt = () => {
  if (!isBrowser) {
    return;
  }

  if (window.__MOVA_PWA_INSTALL_INITIALIZED__) {
    return;
  }

  window.__MOVA_PWA_INSTALL_INITIALIZED__ = true;

  /*
   * Chrome / Edge / supported Chromium browsers
   */
  window.addEventListener(
    "beforeinstallprompt",
    (event) => {
      event.preventDefault();

      deferredInstallPrompt = event;

      console.log(
        "MOVA PWA: Installation is available."
      );

      notifyInstallListeners();
    }
  );

  /*
   * Fired after successful installation.
   */
  window.addEventListener(
    "appinstalled",
    () => {
      console.log(
        "MOVA PWA: Application installed."
      );

      deferredInstallPrompt = null;

      notifyInstallListeners();

      window.dispatchEvent(
        new CustomEvent(
          "mova:pwa-installed"
        )
      );
    }
  );

  /*
   * Detect standalone mode changes.
   */
  const mediaQuery =
    window.matchMedia?.(
      "(display-mode: standalone)"
    );

  mediaQuery?.addEventListener?.(
    "change",
    notifyInstallListeners
  );

  /*
   * Re-check whenever the page becomes visible.
   */
  window.addEventListener(
    "pageshow",
    notifyInstallListeners
  );

  /*
   * Initial state.
   */
  notifyInstallListeners();
};

/* =========================================================
   COMPLETE PWA SETUP
========================================================= */

export const setupPWA = () => {
  if (!isBrowser) {
    return;
  }

  initializePWAInstallPrompt();

  registerPWA();

  initializeMovaNetworkStatus();
};

export default setupPWA;