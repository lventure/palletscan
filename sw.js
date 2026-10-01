/*
 * Palletscan – service worker.
 * Bewaart de app zelf op het toestel, zodat ze ook zonder wifi start.
 *
 * Werking: de app start altijd meteen vanaf het toestel. Bij elke start met
 * netwerk worden alle bestanden van de app samen opnieuw opgehaald; alleen als
 * ze ALLEMAAL binnen zijn, vervangen ze de oude. Een nieuwe versie is dus
 * zichtbaar vanaf de tweede start na de update, en nooit half.
 * Verzendingen naar Google gaan nooit via deze cache.
 */
var CACHE = 'palletscan-v1';
var SHELL = ['./', './index.html', './scanlogic.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

function fetchShell() {
  return Promise.all(SHELL.map(function (u) {
    return fetch(u, { cache: 'no-cache' }).then(function (res) {
      if (!res.ok || res.redirected) throw new Error('niet opgehaald: ' + u);
      return [u, res];
    });
  }));
}
function storeShell(pairs) {
  return caches.open(CACHE).then(function (cache) {
    return Promise.all(pairs.map(function (p) { return cache.put(p[0], p[1]); }));
  });
}

self.addEventListener('install', function (event) {
  event.waitUntil(fetchShell().then(storeShell).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  // Bij het openen van de app: op de achtergrond de nieuwste versie ophalen.
  if (req.mode === 'navigate') event.waitUntil(fetchShell().then(storeShell).catch(function () {}));

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true });
    }).then(function (hit) { return hit || fetch(req); })
  );
});
