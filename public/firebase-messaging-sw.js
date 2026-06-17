// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// NOTA: Reemplaza estos valores con las credenciales de tu proyecto UNIFICADO de Firebase
firebase.initializeApp({
  apiKey: 'AIzaSyAQ7oQbl6aoYFejywxKMKXT6XuJ53zTKwI',
  authDomain: 'relevo-minimo2.firebaseapp.com',
  projectId: 'relevo-minimo2',
  storageBucket: 'relevo-minimo2.firebasestorage.app',
  messagingSenderId: '889003247844',
  appId: '1:889003247844:web:7d0fd703a04a77c36404f1'
});

const messaging = firebase.messaging();

// Escuchar notificaciones en segundo plano (Background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Mensaje recibido en segundo plano: ', payload);

  const title = payload.notification?.title || 'Relevo';
  const options = {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data
  };

  self.registration.showNotification(title, options);
});

// Manejar el clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const clickAction = event.notification.data?.click_action || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si la app ya está abierta en alguna pestaña, navegar y hacer focus
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(location.origin) && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', url: clickAction });
          return client.focus();
        }
      }
      // Si no, abrir una pestaña nueva
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
