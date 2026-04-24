self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch (e) {
  }

  const title = data.title ?? 'Hisaab';
  const options = {
    body: data.body ?? '',
    icon: '/logo-192x192.png',
    badge: '/logo-192x192.png',
    data: { url: data.url ?? '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});