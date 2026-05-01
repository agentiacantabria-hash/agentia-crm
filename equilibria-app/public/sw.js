// Equilibria service worker — cache shell con stale-while-revalidate.
// Cambia CACHE_NAME para invalidar todo el caché en una nueva versión.
const CACHE_NAME = 'equilibria-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE_NAME))
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // No cachear API ni Supabase ni terceros: siempre red, son dinámicos
  if (url.pathname.startsWith('/api/')) return
  if (url.hostname.endsWith('supabase.co')) return
  if (url.hostname !== self.location.hostname) return

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(req)
    const network = fetch(req).then((res) => {
      // Solo cacheamos respuestas válidas básicas (200, mismo origen)
      if (res && res.status === 200 && res.type === 'basic') {
        cache.put(req, res.clone())
      }
      return res
    }).catch(() => cached)
    return cached || network
  })())
})
