// Push notification handlers that will be injected into the service worker
/* eslint-disable */

// Push event handler
self.addEventListener('push', function(event) {
  console.log('[SW] Push notification received:', event);
  
  if (!event.data) {
    console.log('[SW] Push event has no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
    console.log('[SW] Push data:', data);
  } catch (e) {
    console.log('[SW] Failed to parse push data as JSON:', e);
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
    }
  };

  if (data.data?.actions) {
    options.actions = data.data.actions.map(action => ({
      action: action.url || action.action,
      title: action.title
    }));
  }

  console.log('[SW] Showing notification with options:', options);

  event.waitUntil(
    self.registration.showNotification(data.title || 'Amphy AI', options)
      .then(() => console.log('[SW] Notification shown successfully'))
      .catch(err => console.error('[SW] Failed to show notification:', err))
  );
});

// Notification click handler
self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  const notificationId = event.notification.data?.notificationId;
  const action = event.action || 'open';
  const urlToOpen = event.action ? event.action : (event.notification.data?.url || '/');

  console.log('[SW] Opening URL:', urlToOpen);

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
    }).catch(err => console.error('[SW] Failed to track click:', err));
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      console.log('[SW] Found clients:', clientList.length);
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          console.log('[SW] Focusing existing window');
          return client.focus();
        }
      }
      if (clients.openWindow) {
        console.log('[SW] Opening new window');
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close handler
self.addEventListener('notificationclose', function(event) {
  console.log('[SW] Notification closed:', event);
});
