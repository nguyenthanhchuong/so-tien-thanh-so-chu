// Service worker: giữ toàn bộ công cụ trong máy để dùng được cả khi mất mạng.
//
// Chiến lược: ƯU TIÊN MẠNG (network-first), cache chỉ là phương án dự phòng.
// Không dùng cache-first — bài học từ app chi tiêu: máy đã lưu index.html thì
// vĩnh viễn chạy bản cũ, mọi bản sửa đẩy lên đều không tới được người dùng,
// và rất khó nhận ra vì trang vẫn chạy bình thường như không có gì sai.
const CACHE_VERSION = "so-tien-thanh-so-chu-v4";

// Cache trọn bộ: cả công cụ chỉ có vài file tĩnh nên tải hết một lần là dùng
// offline được đầy đủ, không phải chọn lọc.
const SHELL = [
  "./",
  "./index.html",
  "./style.css?v=5",
  "./logic.js?v=2",
  "./app.js?v=2",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || !req.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() =>
        caches.match(req).then(hit => hit || caches.match("./index.html"))
      )
  );
});
