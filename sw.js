const CACHE = 'timepulse-v1';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).catch(() => caches.match('/index.html')))
  );
});

// Background notification scheduling
let timers = [];

self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'SCHEDULE') return;
  timers.forEach(t => clearTimeout(t));
  timers = [];
  const events = e.data.events || [];
  const now = Date.now();
  events.forEach(ev => {
    const et = new Date(ev.datetime).getTime();
    if (ev.alarm && et > now) {
      const delay = et - now;
      if (delay < 604800000) {
        timers.push(setTimeout(() => {
          self.registration.showNotification('Alarm: ' + ev.name, {
            body: 'Your event is starting NOW!',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [300, 100, 300, 100, 300],
            tag: 'alarm-' + ev.id,
            requireInteraction: true
          });
        }, delay));
      }
    }
    (ev.reminders || []).forEach(mins => {
      const rt = et - mins * 60000;
      if (rt > now) {
        const delay = rt - now;
        const label = mins < 60 ? mins + ' min' : mins < 1440 ? (mins / 60) + 'h' : (mins / 1440) + 'd';
        if (delay < 604800000) {
          timers.push(setTimeout(() => {
            self.registration.showNotification('Reminder: ' + ev.name, {
              body: label + ' until your event',
              icon: '/icon-192.png',
              vibrate: [200, 100, 200],
              tag: 'reminder-' + ev.id + '-' + mins
            });
          }, delay));
        }
      }
    });
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(cs => {
      if (cs.length) return cs[0].focus();
      return clients.openWindow('/');
    })
  );
});
