import { precacheAndRoute } from 'workbox-precaching'
import { clientsClaim } from 'workbox-core'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { createHandlerBoundToURL } from 'workbox-precaching'

precacheAndRoute(self.__WB_MANIFEST)
clientsClaim()

const navigationRoute = new NavigationRoute(createHandlerBoundToURL('index.html'))
registerRoute(navigationRoute)

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const title = data.title || 'Lkwan'
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.png',
    badge: data.badge || '/favicon.png',
    tag: data.tag || 'default',
    data: {
      url: data.url || '/',
      notificationId: data.notificationId || null
    },
    vibrate: [100, 50, 100],
    silent: false
  }

  event.waitUntil(
    self.registration.showNotification(title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        const existingClient = windowClients.find(
          (client) => client.url === urlToOpen && 'focus' in client
        )
        if (existingClient) {
          return existingClient.focus()
        }
        return clients.openWindow(urlToOpen)
      })
  )
})


