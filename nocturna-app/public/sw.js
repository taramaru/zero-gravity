/** NOCTURNA Service Worker
 *
 * オフラインキャッシュ戦略:
 * - 静的アセット（JS/CSS/画像）→ Cache First
 * - API/ページ → Network First + フォールバック
 */

const SW_VERSION = "nocturna-v1";
const STATIC_CACHE = SW_VERSION + "-static";
const DYNAMIC_CACHE = SW_VERSION + "-dynamic";

const STATIC_ASSETS = [
    "/login",
    "/dashboard",
    "/manifest.json",
];

// インストール時に静的アセットをプリキャッシュ
self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(function (cache) {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// アクティベート時に古いキャッシュを削除
self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(
                keys
                    .filter(function (key) { return key !== STATIC_CACHE && key !== DYNAMIC_CACHE; })
                    .map(function (key) { return caches.delete(key); })
            );
        })
    );
    self.clients.claim();
});

// フェッチ時のキャッシュ戦略
self.addEventListener("fetch", function (event) {
    var url = new URL(event.request.url);

    // APIリクエスト（Supabase）はNetwork First
    if (url.hostname.includes("supabase")) {
        event.respondWith(networkFirst(event.request));
        return;
    }

    // 静的アセットはCache First
    if (
        event.request.destination === "script" ||
        event.request.destination === "style" ||
        event.request.destination === "image" ||
        event.request.destination === "font"
    ) {
        event.respondWith(cacheFirst(event.request));
        return;
    }

    // その他はNetwork First
    event.respondWith(networkFirst(event.request));
});

/** Cache First — キャッシュにあればそちらを返す */
function cacheFirst(request) {
    return caches.match(request).then(function (cached) {
        if (cached) return cached;
        return fetch(request).then(function (response) {
            if (response.ok) {
                var cacheClone = response.clone();
                caches.open(STATIC_CACHE).then(function (cache) {
                    cache.put(request, cacheClone);
                });
            }
            return response;
        }).catch(function () {
            return new Response("Offline", { status: 503 });
        });
    });
}

/** Network First — ネットワーク優先、失敗時キャッシュ */
function networkFirst(request) {
    return fetch(request).then(function (response) {
        if (response.ok) {
            var cacheClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(function (cache) {
                cache.put(request, cacheClone);
            });
        }
        return response;
    }).catch(function () {
        return caches.match(request).then(function (cached) {
            if (cached) return cached;
            return new Response("Offline", { status: 503 });
        });
    });
}
