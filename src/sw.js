// Keeps Pick My Fit working offline. New versions load on the next open.
const CACHE = "pickmyfit-v1";
const FILES = ["./", "index.html", "config.js", "native-shim.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) { // fonts: cache as they load
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(cc => cc.put(req, c)); return r; }).catch(() => hit)));
    return;
  }
  // app files: try the network first so updates arrive, fall back to the saved copy offline
  e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(cc => cc.put(req, c)); return r; }).catch(() => caches.match(req).then(h => h || caches.match("index.html"))));
});
