const VERSION = 'v1'
const SHELL = `shell-${VERSION}`
const ASSETS = `assets-${VERSION}`
const TILES = `tiles-${VERSION}`
const MAX_TILES = 400

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      // Zapisz stronę główną i pliki, do których ona się odwołuje
      const res = await fetch('/', { cache: 'reload' })
      const html = await res.clone().text()
      const urls = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
      const shell = await caches.open(SHELL)
      await shell.put('/', res)
      const assets = await caches.open(ASSETS)
      await Promise.all(urls.map((u) => assets.add(u).catch(() => {})))
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL, ASSETS, TILES]
      for (const name of await caches.keys()) {
        if (!keep.includes(name)) await caches.delete(name)
      }
      await self.clients.claim()
    })()
  )
})

async function trimCache(name, max) {
  const cache = await caches.open(name)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Nawigacja: najpierw sieć, w razie braku internetu zapisana strona
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req)
          if (res.ok) {
            const copy = res.clone()
            caches.open(SHELL).then((c) => c.put('/', copy))
          }
          return res
        } catch {
          const cached = await caches.match('/')
          return cached || new Response('Brak połączenia z internetem.', { status: 503 })
        }
      })()
    )
    return
  }

  // Pliki aplikacji (mają hash w nazwie, więc można je trzymać bez końca)
  if (url.origin === self.location.origin && url.pathname.startsWith('/assets/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req)
        if (cached) return cached
        const res = await fetch(req)
        if (res.ok) {
          const copy = res.clone()
          caches.open(ASSETS).then((c) => c.put(req, copy))
        }
        return res
      })()
    )
    return
  }

  // Kafelki mapy OpenStreetMap: zapamiętujemy te, które użytkownik już widział
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req)
        if (cached) return cached
        const res = await fetch(req)
        if (res.ok) {
          const copy = res.clone()
          caches
            .open(TILES)
            .then((c) => c.put(req, copy))
            .then(() => trimCache(TILES, MAX_TILES))
        }
        return res
      })()
    )
  }
})