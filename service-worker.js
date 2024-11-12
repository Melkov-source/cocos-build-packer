importScripts('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js');

self.addEventListener('install', event => {

    event.waitUntil((async () => {
        const cache = await caches.open('offline-cache');

        try {
            console.log('Service Worker: Install.Start');

            const response = await fetch('/assets.zip'); //Здесь можно установить путь до CDNки с билдом

            if (!response.ok) {
                throw new Error('Not found build from server');
            }

            const zip_blob = await response.blob();

            const zip = await JSZip.loadAsync(zip_blob);

            const files = Object.entries(zip.files);

            for (const [path, file] of files) {
                if(file.dir) {
                    continue;
                }

                const file_blob = await file.async('blob');

                const header_data = {
                    headers: { 'Content-Type': getMimeType(path) }
                }

                const response = new Response(file_blob, header_data);

                await cache.put(new Request('/' + path), response);

                console.log(`Service Worker: Cached ${path}`);
            }

            await self.skipWaiting();

            console.log('Service Worker: Install.End');
        } catch (error) {
            console.error('Service Worker:', error);
        }
    })());
});

self.addEventListener('activate', event => {
    console.log('Service Worker: Activate.Start');

    event.waitUntil(self.clients.claim());

    console.log('Service Worker: Activate.End');
});

self.addEventListener('fetch', event => {
    console.log('Service Worker: Fetch.Start');

    const request_url = new URL(event.request.url);

    console.log("Service Worker:", request_url);

    if (request_url.pathname === '/' || request_url.pathname === '/index.html') {
        event.respondWith(
            caches.match('/index.html').then(response => {
                if (response) {
                    console.log('Service Worker: index.html from cache');
                    return response;
                } else {
                    console.error('Service Worker: index.html not found in cache');
                    return fetch(event.request);
                }
            })
        );
    } else {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request);
            })
        );
    }

    console.log('Service Worker: Fetch.End');
});

function getMimeType(path) {
    if (path.endsWith('.js')) return 'application/javascript';
    if (path.endsWith('.css')) return 'text/css';
    if (path.endsWith('.html')) return 'text/html';
    if (path.endsWith('.png')) return 'image/png';
    if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';

    return 'application/octet-stream';
}