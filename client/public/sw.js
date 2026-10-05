const CACHE_NAME = "mova-app-v1";

const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/mova-192.svg",
  "/icons/mova-512.svg"
];

/*
|--------------------------------------------------------------------------
| INSTALL
|--------------------------------------------------------------------------
*/

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );

  self.skipWaiting();
});

/*
|--------------------------------------------------------------------------
| ACTIVATE
|--------------------------------------------------------------------------
*/

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );

  self.clients.claim();
});

/*
|--------------------------------------------------------------------------
| FETCH
|--------------------------------------------------------------------------
|
| IMPORTANT:
| We currently cache only the application shell.
|
| API requests are deliberately NOT cached yet.
| This prevents stale products, sales, payments and
| customer information from being used accidentally.
|
|--------------------------------------------------------------------------
*/

self.addEventListener("fetch", (event) => {
  const request = event.request;

  /*
  |--------------------------------------------------------------------------
  | Only handle GET requests
  |--------------------------------------------------------------------------
  */

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
  |--------------------------------------------------------------------------
  | Ignore API requests for now
  |--------------------------------------------------------------------------
  */

  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/api")
  ) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Ignore browser extensions and external requests
  |--------------------------------------------------------------------------
  */

  if (url.origin !== self.location.origin) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Navigation requests
  |--------------------------------------------------------------------------
  */

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);

          if (cachedResponse) {
            return cachedResponse;
          }

          return caches.match("/");
        })
    );

    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Static assets
  |--------------------------------------------------------------------------
  */

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          if (
            response &&
            response.status === 200 &&
            response.type === "basic"
          ) {
            const responseClone = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => {
          return new Response(
            "MOVA is currently offline.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain"
              }
            }
          );
        });
    })
  );
});

/*
|--------------------------------------------------------------------------
| MESSAGE HANDLING
|--------------------------------------------------------------------------
*/

self.addEventListener("message", (event) => {
  if (!event.data) {
    return;
  }

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});