/* =========================================================================
   TEXT TRANSFORMER — sw.js (offline memory)
   Stores this app's own files so it opens instantly, even with no network.
   The AI calls to OpenRouter are NEVER touched by this file — they always
   go straight to the network, exactly as before.
   ========================================================================= */

/* Version this cache. Bump the number whenever you update any app file,
   and returning visitors will quietly receive the fresh copy. */
const CACHE_NAME = "text-transformer-v1";

/* The files this app is made of. "./" is the page itself. */
const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./transformer.js",
  "./manifest.webmanifest"
];

/* ---------------------------- install ---------------------------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

/* ---------------------------- activate ---------------------------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

/* ----------------------------- fetch ----------------------------- */
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  /* Pass every AI / network call straight through.
     The app is offline-first; the API is online-only by design. */
  if (url.origin !== self.location.origin) {
    return; // do nothing — browser handles it normally
  }

  /* Only deal with plain page loads (GET). */
  if (event.request.method !== "GET") {
    return;
  }

  /* Serve our own files from the store where possible; if one is
     missing (or a new version exists), fetch it and stash it. */
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});
