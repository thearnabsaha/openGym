/* openGym service worker — runtime caching for Next.js PWA */
const CACHE = 'opengym-pwa-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      const c = clients.find(c => 'focus' in c)
      return c ? c.focus() : self.clients.openWindow('/')
    })
  )
})

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return

  // Cache-first for images/gifs/fonts/_next/static
  const isStatic = url.pathname.includes('/img/') || 
                   url.pathname.includes('/gif/') || 
                   url.pathname.includes('/_next/static/') ||
                   url.pathname.endsWith('.png') ||
                   url.pathname.endsWith('.jpg') ||
                   url.pathname.endsWith('.gif') ||
                   url.pathname.endsWith('.svg') ||
                   url.pathname.endsWith('.woff2')

  if (isStatic) {
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(e.request).then(hit =>
          hit || fetch(e.request).then(res => {
            if (res.ok) c.put(e.request, res.clone())
            return res
          }).catch(() => hit)
        )
      )
    )
  } else {
    // Network first, fallback to cache
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok && url.origin === location.origin) {
            const clone = res.clone()
            caches.open(CACHE).then(c => c.put(e.request, clone))
          }
          return res
        })
        .catch(() => caches.match(e.request).then(hit => hit || caches.match('/')))
    )
  }
})
