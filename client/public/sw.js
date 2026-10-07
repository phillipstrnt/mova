const CACHE_NAME = "mova-cache-v2";

const APP_SHELL = [
"/",
"/manifest.webmanifest",
];

| /*                                                                         |
| -------------------------------------------------------------------------- |
| INSTALL                                                                    |
| -------------------------------------------------------------------------- |
| */                                                                         |

self.addEventListener("install", (event) => {
console.log("[MOVA PWA] Installing service worker...");

event.waitUntil(
caches
.open(CACHE_NAME)
.then((cache) => cache.addAll(APP_SHELL))
.then(() => self.skipWaiting())
.catch((error) => {
console.error(
"[MOVA PWA] Service worker installation failed:",
error
);
})
);
});

| /*                                                                         |
| -------------------------------------------------------------------------- |
| ACTIVATE                                                                   |
| -------------------------------------------------------------------------- |
| */                                                                         |

self.addEventListener("activate", (event) => {
console.log("[MOVA PWA] Activating service worker...");

event.waitUntil(
caches
.keys()
.then((cacheNames) =>
Promise.all(
cacheNames
.filter(
(cacheName) =>
cacheName.startsWith("mova-cache-") &&
cacheName !== CACHE_NAME
)
.map((cacheName) => {
console.log(
"[MOVA PWA] Removing old cache:",
cacheName
);

          return caches.delete(cacheName);
        })
    )
  )
  .then(() => self.clients.claim())

);
});

| /*                                                                         |
| -------------------------------------------------------------------------- |
| FETCH                                                                      |
| -------------------------------------------------------------------------- |
| */                                                                         |

self.addEventListener("fetch", (event) => {
const request = event.request;

/*

* Only handle GET requests.
*
* POST, PUT, PATCH and DELETE requests are intentionally
* left to the browser/application.
  */
  if (request.method !== "GET") {
  return;
  }

const url = new URL(request.url);

/*

* Only handle requests belonging to MOVA's own origin.
  */
  if (url.origin !== self.location.origin) {
  return;
  }

| /*                                                                         |
| -------------------------------------------------------------------------- |
| API REQUESTS                                                               |
| -------------------------------------------------------------------------- |
|                                                                            |
| Do NOT cache API requests.                                                 |
|                                                                            |
| This is important because MOVA will eventually have its                    |
| own offline queue/synchronization system for:                              |
|                                                                            |
| - POS sales                                                                |
| - inventory changes                                                        |
| - payments                                                                 |
| - customers                                                                |
| - returns                                                                  |
|                                                                            |
| */                                                                         |

if (url.pathname.startsWith("/api/")) {
return;
}

| /*                                                                         |
| -------------------------------------------------------------------------- |
| NAVIGATION REQUESTS                                                        |
| -------------------------------------------------------------------------- |
|                                                                            |
| Example:                                                                   |
| /dashboard                                                                 |
| /pos                                                                       |
| /products                                                                  |
| /sales                                                                     |
|                                                                            |
| Network first allows users to receive the latest version.                  |
| If there is no internet connection, the cached MOVA shell                  |
| is returned.                                                               |
| */                                                                         |

if (request.mode === "navigate") {
event.respondWith(
fetch(request)
.then((response) => {
if (response && response.ok) {
const responseClone = response.clone();


        caches
          .open(CACHE_NAME)
          .then((cache) => {
            cache.put(request, responseClone);
          })
          .catch((error) => {
            console.warn(
              "[MOVA PWA] Could not cache navigation:",
              error
            );
          });
      }

      return response;
    })
    .catch(async () => {
      const cachedResponse = await caches.match(request);

      if (cachedResponse) {
        return cachedResponse;
      }

      const cachedAppShell =
        await caches.match("/");

      if (cachedAppShell) {
        return cachedAppShell;
      }

      /*
       * Final offline fallback.
       */
      return new Response(
        
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="UTF-8" />

              <meta
                name="viewport"
                content="width=device-width, initial-scale=1.0"
              />

              <meta
                name="theme-color"
                content="#0f172a"
              />

              <title>MOVA Offline</title>

              <style>
                * {
                  box-sizing: border-box;
                }

                body {
                  margin: 0;
                  min-height: 100vh;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  padding: 24px;
                  font-family:
                    Inter,
                    system-ui,
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    sans-serif;
                  background: #f8fafc;
                  color: #0f172a;
                }

                .container {
                  width: 100%;
                  max-width: 440px;
                  padding: 36px 28px;
                  text-align: center;
                  background: white;
                  border: 1px solid #e2e8f0;
                  border-radius: 24px;
                  box-shadow:
                    0 20px 50px
                    rgba(15, 23, 42, 0.08);
                }

                .logo {
                  width: 72px;
                  height: 72px;
                  margin: 0 auto 22px;
                  border-radius: 20px;
                  background: #0f172a;
                  color: white;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: 800;
                  font-size: 26px;
                }

                h1 {
                  margin: 0 0 10px;
                  font-size: 26px;
                }

                p {
                  margin: 0;
                  color: #64748b;
                  line-height: 1.7;
                }
              </style>
            </head>

            <body>
              <div class="container">
                <div class="logo">M</div>

                <h1>MOVA is offline</h1>

                <p>
                  Your internet connection is currently
                  unavailable. Reconnect to the internet
                  and try again.
                </p>
              </div>
            </body>
          </html>
        ,
        {
          status: 503,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
          },
        }
      );
    })
);

return;


}

| /*                                                                         |
| -------------------------------------------------------------------------- |
| STATIC FILES                                                               |
| -------------------------------------------------------------------------- |
|                                                                            |
| Strategy:                                                                  |
|                                                                            |
| 1. Return cached file immediately when available.                          |
| 2. Otherwise request it from the network.                                  |
| 3. Cache successful responses.                                             |
|                                                                            |
| This works well for Vite's generated JS/CSS assets.                        |
| */                                                                         |

event.respondWith(
caches.match(request).then((cachedResponse) => {
if (cachedResponse) {
return cachedResponse;
}
  return fetch(request)
    .then((response) => {
      if (!response || !response.ok) {
        return response;
      }

      const responseClone = response.clone();

      caches
        .open(CACHE_NAME)
        .then((cache) => {
          cache.put(request, responseClone);
        })
        .catch((error) => {
          console.warn(
            "[MOVA PWA] Could not cache asset:",
            error
          );
        });

      return response;
    })
    .catch(() => {
      /*
       * Nothing is cached and the network is unavailable.
       */
      return new Response("", {
        status: 503,
        statusText: "MOVA resource unavailable offline",
      });
    });
})

);
});

| /*                                                                         |
| -------------------------------------------------------------------------- |
| SERVICE WORKER MESSAGE HANDLING                                            |
| -------------------------------------------------------------------------- |
|                                                                            |
| Allows the React application to tell the service worker                    |
| to activate a waiting update immediately.                                  |
| -------------------------------------------------------------------------- |
| */                                                                         |

self.addEventListener("message", (event) => {
if (event.data?.type === "MOVA_SKIP_WAITING") {
self.skipWaiting();
}
});
