// Service Worker for Push Notifications and PWA caching
/* eslint-disable */

// Workbox will inject the manifest here
self.__WB_MANIFEST;

self.addEventListener('push', function(event) {
  console.log('Push notification received:', event);
  
  if (!event.data) {
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: event.data.text(),
      body: ''
    };
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/favicon.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'amphy-notification',
    requireInteraction: false,
    data: {
      url: data.url || '/',
      notificationId: data.data?.notificationId,
      ...data
    },
    actions: data.data?.actions?.map(action => ({
      action: action.url || action.action,
      title: action.title
    })) || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Amphy AI', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notification clicked:', event);
  
  event.notification.close();

  const notificationId = event.notification.data?.notificationId;
  const action = event.action || 'open';
  const urlToOpen = event.action ? event.action : (event.notification.data?.url || '/');

  // Track the click
  if (notificationId) {
    fetch('/api/track-notification-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId,
        action
      })
    }).catch(err => console.error('Failed to track click:', err));
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event);
});
