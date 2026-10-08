const CACHE_NAME = "mova-cache-v5";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  console.log("MOVA PWA: Installing", CACHE_NAME);

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        await cache.addAll(APP_SHELL);
        console.log("MOVA PWA: App shell cached.");
      } catch (error) {
        console.error(
          "MOVA PWA: Failed to cache app shell.",
          error
        );
      }
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("MOVA PWA: Activating", CACHE_NAME);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith("mova-cache-") &&
                cacheName !== CACHE_NAME
            )
            .map((cacheName) => {
              console.log(
                "MOVA PWA: Deleting old cache:",
                cacheName
              );

              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  /*
   * Never cache API requests.
   */
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  /*
   * Never intercept external resources.
   */
  if (url.origin !== self.location.origin) {
    return;
  }

  /*
   * React Router navigation.
   *
   * If the user opens:
   * /app
   * /app/pos
   * /app/products
   *
   * return the React application shell.
   */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              cache.put("/index.html", clone);
            });
          }

          return response;
        })
        .catch(async () => {
          const cached = await caches.match("/index.html");

          if (cached) {
            return cached;
          }

          return new Response(
            "MOVA is currently offline.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain",
              },
            }
          );
        })
    );

    return;
  }

  /*
   * Static assets:
   * network first, cache fallback.
   */
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (
          response &&
          response.status === 200 &&
          response.type === "basic"
        ) {
          const clone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) {
          return cached;
        }

        return new Response(
          "MOVA resource unavailable while offline.",
          {
            status: 503,
            headers: {
              "Content-Type": "text/plain",
            },
          }
        );
      })
  );
});

self.addEventListener("message", (event) => {
  if (!event.data) {
    return;
  }

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});