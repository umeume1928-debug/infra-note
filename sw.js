/* キャッシュ名を変えるとアプリ更新として扱われる（ファイルを更新したら番号を上げる） */
const CACHE = "infra-note-v2.0.0";
const FILES = ["./", "./index.html", "./style.css", "./data.js", "./diagrams.js", "./app.js", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });

/* ネットワーク優先（最新を取りに行き、オフライン時はキャッシュ） */
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(hit => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error())))
  );
});
