/**
 * Push Notifications Manager
 * TEMPORAIREMENT DÉSACTIVÉ - Les notifications push ne fonctionnent pas bien sur iOS
 */

const VAPID_KEY = 'BMXhWKLGZhiqYfsJOw6PbpnHk7Ky_kknyO3NYVbHVp570Cfb61Yo2fnzmlANdVkKDWg8WZWNhKa3mum0fkIGqG8';

async function initPushNotifications(playerId) {
    console.log('Push Notifications: Initialisation pour', playerId);
    
    if (!('Notification' in window)) {
        return { success: false, reason: 'not_supported' };
    }
    
    if (!('serviceWorker' in navigator)) {
        return { success: false, reason: 'no_service_worker' };
    }
    
    try {
        const permission = await Notification.requestPermission();
        
        if (permission !== 'granted') {
            return { success: false, reason: 'permission_denied' };
        }
        
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await navigator.serviceWorker.ready;
        
        const messaging = firebase.messaging();
        
        let token;
        try {
            token = await messaging.getToken({
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration
            });
        } catch (vapidError) {
            token = await messaging.getToken({
                serviceWorkerRegistration: registration
            });
        }
        
        if (!token) {
            return { success: false, reason: 'no_token' };
        }
        
        await db.collection('fcmTokens').doc(playerId).set({
            token: token,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            platform: 'web',
            userAgent: navigator.userAgent
        });
        
        return { success: true, token: token };
        
    } catch (error) {
        console.error('Push Notifications: Erreur', error);
        return { success: false, reason: 'error', error: error.message };
    }
}

async function checkNotificationStatus(playerId) {
    if (!('Notification' in window)) {
        return { enabled: false, reason: 'not_supported' };
    }
    
    if (Notification.permission === 'denied') {
        return { enabled: false, reason: 'denied' };
    }
    
    if (Notification.permission === 'default') {
        return { enabled: false, reason: 'not_asked' };
    }
    
    try {
        const tokenDoc = await db.collection('fcmTokens').doc(playerId).get();
        if (tokenDoc.exists) {
            return { enabled: true, token: tokenDoc.data().token };
        } else {
            return { enabled: false, reason: 'no_token' };
        }
    } catch (error) {
        return { enabled: false, reason: 'error' };
    }
}

/**
 * Affiche le prompt pour activer les notifications push
 */
async function showNotificationPrompt(playerId) {
    var container = document.getElementById('notificationPromptContainer');
    if (!container) return;

    // Si déjà refusé par le navigateur, on n'affiche rien
    if (Notification.permission === 'denied') {
        container.innerHTML = '';
        return;
    }

    // Si déjà accordé, on s'assure juste que le token est bien enregistré
    if (Notification.permission === 'granted') {
        var status = await checkNotificationStatus(playerId);
        if (!status.enabled) {
            // Permission OK mais pas de token → on l'enregistre silencieusement
            await initPushNotifications(playerId);
        }
        container.innerHTML = '';
        return;
    }

    // Permission pas encore demandée → afficher le prompt
    container.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 1px solid rgba(255,165,0,0.3);
            border-radius: 12px;
            padding: 16px;
            margin: 12px 0;
            display: flex;
            align-items: center;
            gap: 12px;
        ">
            <span style="font-size: 28px;">🔔</span>
            <div style="flex: 1;">
                <div style="color: #fff; font-weight: 600; font-size: 14px; margin-bottom: 4px;">
                    Activer les rappels ?
                </div>
                <div style="color: rgba(255,255,255,0.65); font-size: 12px;">
                    Reçois un rappel à 12h pour le check-in et à 20h pour ton RPE.
                </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
                <button onclick="enableNotifications('${playerId}')" style="
                    background: #f97316;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 8px 14px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    white-space: nowrap;
                ">Oui, activer</button>
                <button onclick="document.getElementById('notificationPromptContainer').innerHTML=''" style="
                    background: transparent;
                    color: rgba(255,255,255,0.5);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 8px;
                    padding: 6px 14px;
                    font-size: 12px;
                    cursor: pointer;
                ">Plus tard</button>
            </div>
        </div>
    `;
}

async function enableNotifications(playerId) {
    var container = document.getElementById('notificationPromptContainer');
    
    if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 16px;">Activation en cours...</div>';
    }
    
    var result = await initPushNotifications(playerId);
    
    if (result.success) {
        if (container) {
            container.innerHTML = '<div style="background: #d4edda; padding: 12px; border-radius: 8px;">Notifications activees !</div>';
        }
    } else {
        if (container) {
            container.innerHTML = '<div style="background: #f8d7da; padding: 12px; border-radius: 8px;">Impossible d activer les notifications.</div>';
        }
    }
}

window.initPushNotifications = initPushNotifications;
window.showNotificationPrompt = showNotificationPrompt;
window.enableNotifications = enableNotifications;
window.checkNotificationStatus = checkNotificationStatus;

console.log('Push Notifications Manager chargé');
