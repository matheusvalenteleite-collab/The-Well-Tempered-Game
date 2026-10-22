// The bench's service worker (D195), a template: the build (tools/bench/sw-plugin.ts) fills in the
// version and the files and writes it beside bench.html as bench-sw.js. Registered from bench.html with
// the scope "bench", so it controls bench.html only.
// The page, its scripts, styles, font, manifest and icons are cached at install and served cache-first
// from a cache named by the build's version; a new build is a new worker, which fetches the new files
// and drops the old cache once it takes over. Everything else (the recordings in samples/, which
// sampled.ts keeps in its own Cache Storage, "wtg-samples-v1") goes to the network untouched.
const VERSION = "__BENCH_VERSION__";
const FILES = self.__BENCH_PRECACHE__;
const PREFIX = "wtg-bench-";
const CACHE = PREFIX + VERSION;
const PAGE = new URL("bench.html", self.location).href;
const OURS = new Set(FILES.map((f) => new URL(f, self.location).href));

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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  url.hash = "";
  // The page itself, whatever its query (?seed=… and the like); every other file exactly.
  const key = req.mode === "navigate" && url.origin + url.pathname === PAGE ? PAGE : url.href;
  if (!OURS.has(key)) return;
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(key))
      .then((hit) => hit || fetch(req)),
  );
});
