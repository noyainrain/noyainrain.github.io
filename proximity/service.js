/** TODO */

// v42

addEventListener("install", event => {
    skipWaiting();
    event.waitUntil((async () => {
        const cache = await caches.open("proximity");
        const keys = await cache.keys();
        for (let key of keys) {
            cache.delete(key);
        }
        await cache.addAll([
            "index.html",
            "proximity.js",
            "bluetooth.js",
            "icon.svg",
            "icon-small.png",
            "icon-large.png",
            "manifest.webmanifest"
        ]);
    })());
});

addEventListener("fetch", event => event.respondWith((async () => {
    const response = await caches.match(event.request.url);
    return response || new Response(null, {status: 404, statusText: "Not Found"});
})()));
