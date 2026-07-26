const CACHE_NAME = "iban-devtools-v3";
const GEO_CACHE_NAME = "iban-devtools-geo-v3.2-export.6";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key !== CACHE_NAME && key !== GEO_CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/data/world/")) {
    let geoCacheWrite = Promise.resolve();
    const geoResponse = caches.open(GEO_CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) {
        geoCacheWrite = cache
          .put(event.request, response.clone())
          .catch(() => undefined);
      }
      return response;
    });
    event.respondWith(geoResponse);
    event.waitUntil(
      geoResponse
        .then(() => geoCacheWrite)
        .catch(() => undefined),
    );
    return;
  }

  let appCacheWrite = Promise.resolve();
  const networkResponse = fetch(event.request).then((response) => {
    if (response.ok) {
      appCacheWrite = caches
        .open(CACHE_NAME)
        .then((cache) => cache.put(event.request, response.clone()))
        .catch(() => undefined);
    }
    return response;
  });
  const appResponse = networkResponse.catch(async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    if (event.request.mode === "navigate") {
      return (await caches.match("/")) ?? Response.error();
    }
    return Response.error();
  });
  event.respondWith(appResponse);
  event.waitUntil(
    networkResponse
      .then(() => appCacheWrite)
      .catch(() => undefined),
  );
});
