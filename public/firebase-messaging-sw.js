// Service Worker pour Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCWqVPOyOvvfRjzJFNqUbLFJsXdVxJPZhw",
    authDomain: "rpe-gen2.firebaseapp.com",
    projectId: "rpe-gen2",
    storageBucket: "rpe-gen2.firebasestorage.app",
    messagingSenderId: "1016698267942",
    appId: "1:1016698267942:web:e4a8c0d0e0e4a8c0e0e4a8"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Gestion des messages en arrière-plan
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Message reçu en arrière-plan:', payload);
    
    const notificationTitle = payload.notification.title || 'RPE Monitor';
    const notificationOptions = {
        body: payload.notification.body || 'N\'oubliez pas de remplir votre RPE !',
        icon: '/img/icon-192.png',
        badge: '/img/badge-72.png',
        tag: 'rpe-reminder',
        requireInteraction: true,
        actions: [
            {
                action: 'open',
                title: 'Remplir maintenant'
            },
            {
                action: 'close',
                title: 'Plus tard'
            }
        ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification cliquée:', event);
    event.notification.close();

    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

