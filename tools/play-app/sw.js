// D380: play.html's service worker, a template: the build (tools/play-app/sw-plugin.ts) fills in the
// version (VERSION of src/bench/version.ts and a hash of the build) and the files, and writes it beside
// play.html as play-sw.js. Registered from play.html with the scope "./play", so it controls play.html only.
//
// - The app shell (play.html's scripts, styles, fonts, Book I's data, which rides in its scripts, the
//   manifest and icons) is cached at install in a cache named by the version; a new deploy is a new
//   worker, which takes over at once and deletes every older "wtg-play-" cache.
// - The page itself: from the network first (so a deploy is seen on the next launch online), the cached
//   copy only when the network fails or is slower than NAV_TIMEOUT_MS.
// - Any other file of the build (assets/: hashed names, never changed in place), fetched on demand (Book
//   II, MORE BACH, the chorales, once unlocked): kept in the same versioned cache when first loaded, at
//   most RUNTIME_MAX files, so it plays offline afterwards.
// - The recordings (samples/) go to the network untouched: sampled.ts keeps every one actually played
//   in its own Cache Storage ("wtg-samples-v1", keyed by each file's length), and reads it from there
//   first, offline too.
const VERSION = "__PLAY_VERSION__";
const FILES = self.__PLAY_PRECACHE__;
const PREFIX = "wtg-play-";
const CACHE = PREFIX + VERSION;
const PAGE = new URL("play.html", self.location).href;
const ASSETS = new URL("assets/", self.location).href;
const OURS = new Set(FILES.map((f) => new URL(f, self.location).href));
const NAV_TIMEOUT_MS = 3500;
const RUNTIME_MAX = 60;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(FILES.map((f) => new Request(new URL(f, self.location).href, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** The page from the network (kept for offline), or the cached one if the network fails or stalls. */
function page(req) {
  return caches.open(CACHE).then((cache) => {
    // (A navigation Request cannot be re-made with options: its URL, revalidated past the HTTP cache.)
    const net = fetch(req.url, { cache: "no-cache", credentials: "same-origin" }).then((res) => {
      if (res && res.ok && res.type === "basic") cache.put(PAGE, res.clone()).catch(() => {});
      return res;
    });
    const late = new Promise((resolve) => setTimeout(resolve, NAV_TIMEOUT_MS)).then(() => cache.match(PAGE));
    return Promise.race([net.catch(() => cache.match(PAGE)), late.then((hit) => hit || net)]).then((res) => res || net);
  });
}

/** A build file fetched on demand, kept (at most RUNTIME_MAX besides the shell). */
function onDemand(req, key) {
  return caches.open(CACHE).then((cache) =>
    cache.match(key).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res && res.ok && res.type === "basic") {
            const copy = res.clone();
            cache
              .keys()
              .then((keys) => {
                const extra = keys.filter((k) => !OURS.has(k.url) && k.url !== PAGE);
                return Promise.all(extra.slice(0, Math.max(0, extra.length - RUNTIME_MAX + 1)).map((k) => cache.delete(k)));
              })
              .then(() => cache.put(key, copy))
              .catch(() => {});
          }
          return res;
        }),
    ),
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  url.hash = "";
  // The page itself, whatever its query.
  if (req.mode === "navigate" && url.origin + url.pathname === PAGE) {
    event.respondWith(page(req));
    return;
  }
  const key = url.href;
  if (OURS.has(key)) {
    event.respondWith(
      caches
        .open(CACHE)
        .then((cache) => cache.match(key))
        .then((hit) => hit || fetch(req)),
    );
    return;
  }
  if (key.startsWith(ASSETS)) event.respondWith(onDemand(req, key));
});

// The page asks which version is in charge (shown nowhere; for checking).
self.addEventListener("message", (event) => {
  if (event.data === "version" && event.ports && event.ports[0]) event.ports[0].postMessage(VERSION);
});
