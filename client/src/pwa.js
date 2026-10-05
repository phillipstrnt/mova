/*
|--------------------------------------------------------------------------
| MOVA PWA REGISTRATION
|--------------------------------------------------------------------------
*/

export function registerMovaServiceWorker() {
  if (!import.meta.env.PROD) {
    console.log(
      "MOVA PWA: Service worker registration is disabled in development."
    );

    return;
  }

  if (!("serviceWorker" in navigator)) {
    console.warn(
      "MOVA PWA: Service workers are not supported by this browser."
    );

    return;
  }

  window.addEventListener("load", async () => {
    try {
      const registration =
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/"
        });

      console.log(
        "MOVA PWA: Service worker registered.",
        registration.scope
      );

      /*
      |--------------------------------------------------------------------------
      | Detect a new service worker
      |--------------------------------------------------------------------------
      */

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;

        if (!newWorker) {
          return;
        }

        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            console.log(
              "MOVA PWA: A new version is available."
            );

            window.dispatchEvent(
              new CustomEvent("mova:pwa-update")
            );
          }
        });
      });
    } catch (error) {
      console.error(
        "MOVA PWA: Service worker registration failed.",
        error
      );
    }
  });
}

/*
|--------------------------------------------------------------------------
| ONLINE / OFFLINE EVENTS
|--------------------------------------------------------------------------
*/

export function initializeMovaNetworkStatus() {
  const dispatchStatus = () => {
    window.dispatchEvent(
      new CustomEvent("mova:network-status", {
        detail: {
          online: navigator.onLine
        }
      })
    );
  };

  window.addEventListener("online", dispatchStatus);
  window.addEventListener("offline", dispatchStatus);

  dispatchStatus();
}