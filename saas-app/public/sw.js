// Minimal service worker: exists so the app is installable, and keeps the
// shell reachable if the network drops mid-session.
//
// Deliberately network-first for navigations. The app ships as one large
// appback.js that changes constantly and is cache-busted by a ?v= query, so a
// cache-first worker would serve stale code and be very hard to flush from a
// phone. Anything not in the precache simply goes to the network.

const CACHE = "piar-shell-v1";
const SHELL = ["/", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .catch(() => undefined)   // never block install on a failed precache
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;   // never touch Supabase or CDNs

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy)).catch(() => undefined);
          return response;
        })
        .catch(() => caches.match("/").then((cached) => cached || Response.error())),
    );
    return;
  }

  event.respondWith(fetch(request).catch(() => caches.match(request).then((c) => c || Response.error())));
});
