/**
 * Coach Notifications Simple
 * Permet au coach d'envoyer des notifications aux joueuses
 */

// ============================================================================
// INITIALISATION
// ============================================================================

function initCoachNotificationSystem() {
    console.log('Coach Notifications: Initialisation...');
    
    // Vérifier qu'on est sur le dashboard coach
    const coachScreen = document.getElementById('coachScreen');
    if (!coachScreen) {
        console.log('Coach Notifications: Pas sur le dashboard coach');
        return;
    }
    
    // Ajouter le bouton de notification dans le header coach
    addNotificationButton();
    
    // Créer le modal
    createNotificationModal();
    
    console.log('Coach Notifications: Initialisé ✓');
}

// ============================================================================
// BOUTON DE NOTIFICATION
// ============================================================================

function addNotificationButton() {
    // Chercher le header du coach
    const coachHeader = document.querySelector('#coachScreen .header');
    if (!coachHeader) {
        console.log('Coach Notifications: Header non trouvé');
        return;
    }
    
    // Vérifier si le bouton existe déjà
    if (document.getElementById('coachNotifBtn')) {
        return;
    }
    
    // Créer le bouton
    const notifBtn = document.createElement('button');
    notifBtn.id = 'coachNotifBtn';
    notifBtn.innerHTML = '📢';
    notifBtn.title = 'Envoyer une notification';
    notifBtn.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        font-size: 24px;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
        z-index: 1000;
        transition: transform 0.2s, box-shadow 0.2s;
    `;
    
    notifBtn.addEventListener('mouseenter', () => {
        notifBtn.style.transform = 'scale(1.1)';
        notifBtn.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
    });
    
    notifBtn.addEventListener('mouseleave', () => {
        notifBtn.style.transform = 'scale(1)';
        notifBtn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    });
    
    notifBtn.addEventListener('click', openNotificationModal);
    
    document.body.appendChild(notifBtn);
}

// ============================================================================
// MODAL DE NOTIFICATION
// ============================================================================

function createNotificationModal() {
    // Vérifier si le modal existe déjà
    if (document.getElementById('coachNotifModal')) {
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'coachNotifModal';
    modal.style.cssText = `
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 2000;
        justify-content: center;
        align-items: center;
        padding: 20px;
        box-sizing: border-box;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 16px;
            max-width: 500px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        ">
            <div style="
                padding: 20px;
                border-bottom: 1px solid #e5e7eb;
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <h3 style="margin: 0; font-size: 18px; color: #1f2937;">📢 Envoyer une notification</h3>
                <button onclick="closeNotificationModal()" style="
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #6b7280;
                ">×</button>
            </div>
            
            <div style="padding: 20px;">
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #374151;">
                        Destinataires
                    </label>
                    <select id="notifRecipients" style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 14px;
                    ">
                        <option value="all">📣 Toutes les joueuses</option>
                        <option value="select">👤 Sélectionner...</option>
                    </select>
                    <div id="playerSelectContainer" style="display: none; margin-top: 10px;">
                        <div id="playerCheckboxes" style="
                            max-height: 150px;
                            overflow-y: auto;
                            border: 1px solid #e5e7eb;
                            border-radius: 8px;
                            padding: 10px;
                        "></div>
                    </div>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #374151;">
                        Type de message
                    </label>
                    <select id="notifType" style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 14px;
                    ">
                        <option value="info">ℹ️ Information</option>
                        <option value="reminder">⏰ Rappel</option>
                        <option value="urgent">🚨 Urgent</option>
                        <option value="motivation">💪 Motivation</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #374151;">
                        Titre
                    </label>
                    <input type="text" id="notifTitle" placeholder="Ex: Rappel entraînement demain" style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 14px;
                        box-sizing: border-box;
                    ">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-weight: 600; margin-bottom: 8px; color: #374151;">
                        Message
                    </label>
                    <textarea id="notifMessage" rows="4" placeholder="Écrivez votre message ici..." style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 8px;
                        font-size: 14px;
                        resize: vertical;
                        box-sizing: border-box;
                    "></textarea>
                    <div style="text-align: right; font-size: 12px; color: #6b7280; margin-top: 4px;">
                        <span id="notifMessageCount">0</span>/500
                    </div>
                </div>
                
                <div style="display: flex; gap: 12px;">
                    <button onclick="closeNotificationModal()" style="
                        flex: 1;
                        padding: 14px;
                        border: 1px solid #d1d5db;
                        background: white;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                        color: #374151;
                    ">Annuler</button>
                    <button onclick="sendCoachNotification()" style="
                        flex: 1;
                        padding: 14px;
                        border: none;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                    ">📤 Envoyer</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    document.getElementById('notifRecipients').addEventListener('change', togglePlayerSelect);
    document.getElementById('notifMessage').addEventListener('input', updateMessageCount);
    
    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeNotificationModal();
        }
    });
}

function togglePlayerSelect() {
    const select = document.getElementById('notifRecipients');
    const container = document.getElementById('playerSelectContainer');
    
    if (select.value === 'select') {
        container.style.display = 'block';
        loadPlayerCheckboxes();
    } else {
        container.style.display = 'none';
    }
}

async function loadPlayerCheckboxes() {
    const container = document.getElementById('playerCheckboxes');
    container.innerHTML = '<div style="text-align: center; padding: 10px;">Chargement...</div>';
    
    try {
        const playersSnapshot = await db.collection('players').orderBy('name').get();
        
        let html = '';
        playersSnapshot.forEach(doc => {
            const player = doc.data();
            html += `
                <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 6px; transition: background 0.2s;">
                    <input type="checkbox" name="selectedPlayers" value="${doc.id}" style="margin-right: 10px;">
                    <span>${player.name}</span>
                </label>
            `;
        });
        
        container.innerHTML = html || '<div style="text-align: center; color: #6b7280;">Aucune joueuse trouvée</div>';
        
    } catch (error) {
        console.error('Erreur chargement joueuses:', error);
        container.innerHTML = '<div style="text-align: center; color: #ef4444;">Erreur de chargement</div>';
    }
}

function updateMessageCount() {
    const message = document.getElementById('notifMessage').value;
    document.getElementById('notifMessageCount').textContent = message.length;
}

// ============================================================================
// ACTIONS
// ============================================================================

function openNotificationModal() {
    const modal = document.getElementById('coachNotifModal');
    if (modal) {
        modal.style.display = 'flex';
        // Reset form
        document.getElementById('notifTitle').value = '';
        document.getElementById('notifMessage').value = '';
        document.getElementById('notifRecipients').value = 'all';
        document.getElementById('notifType').value = 'info';
        document.getElementById('playerSelectContainer').style.display = 'none';
        document.getElementById('notifMessageCount').textContent = '0';
    }
}

function closeNotificationModal() {
    const modal = document.getElementById('coachNotifModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function sendCoachNotification() {
    const title = document.getElementById('notifTitle').value.trim();
    const message = document.getElementById('notifMessage').value.trim();
    const type = document.getElementById('notifType').value;
    const recipientsSelect = document.getElementById('notifRecipients').value;
    
    // Validations
    if (!title) {
        alert('Veuillez entrer un titre.');
        return;
    }
    
    if (!message) {
        alert('Veuillez entrer un message.');
        return;
    }
    
    // Déterminer les destinataires
    let recipients = [];
    
    if (recipientsSelect === 'all') {
        // Toutes les joueuses
        const playersSnapshot = await db.collection('players').get();
        playersSnapshot.forEach(doc => {
            recipients.push(doc.id);
        });
    } else {
        // Joueuses sélectionnées
        const checkboxes = document.querySelectorAll('input[name="selectedPlayers"]:checked');
        checkboxes.forEach(cb => {
            recipients.push(cb.value);
        });
        
        if (recipients.length === 0) {
            alert('Veuillez sélectionner au moins une joueuse.');
            return;
        }
    }
    
    try {
        // Créer la notification dans Firestore
        const notificationData = {
            title: title,
            message: message,
            type: type,
            recipients: recipients,
            sentBy: appState.coachName || 'Coach',
            sentAt: firebase.firestore.FieldValue.serverTimestamp(),
            readBy: []
        };
        
        await db.collection('notifications').add(notificationData);
        
        alert(`✅ Notification envoyée à ${recipients.length} joueuse(s) !`);
        closeNotificationModal();
        
    } catch (error) {
        console.error('Erreur envoi notification:', error);
        alert('Erreur lors de l\'envoi de la notification.');
    }
}

// ============================================================================
// AFFICHAGE DES NOTIFICATIONS POUR LES JOUEUSES
// ============================================================================

async function loadPlayerNotifications(playerId) {
    try {
        const notificationsSnapshot = await db.collection('notifications')
            .where('recipients', 'array-contains', playerId)
            .orderBy('sentAt', 'desc')
            .limit(10)
            .get();
        
        const container = document.getElementById('playerNotificationsContainer');
        if (!container) return;
        
        let html = '';
        
        notificationsSnapshot.forEach(doc => {
            const notif = doc.data();
            const isRead = notif.readBy && notif.readBy.includes(playerId);
            
            const typeEmoji = {
                'info': 'ℹ️',
                'reminder': '⏰',
                'urgent': '🚨',
                'motivation': '💪'
            }[notif.type] || '📢';
            
            const bgColor = isRead ? '#f9fafb' : '#eff6ff';
            const borderColor = notif.type === 'urgent' ? '#ef4444' : '#3b82f6';
            
            html += `
                <div style="
                    background: ${bgColor};
                    border-left: 4px solid ${borderColor};
                    padding: 12px 16px;
                    margin-bottom: 10px;
                    border-radius: 8px;
                    transition: background 0.2s;
                ">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                            <span>${typeEmoji}</span>
                            <strong style="color: #1f2937;">${notif.title}</strong>
                            ${!isRead ? '<span style="background: #ef4444; color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px;">Nouveau</span>' : ''}
                        </div>
                        <button onclick="deleteNotification('${doc.id}')" title="Supprimer" style="background: none; border: none; color: #9ca3af; cursor: pointer; font-size: 18px; padding: 0; margin: 0;">×</button>
                    </div>
                    <p style="margin: 0; color: #4b5563; font-size: 14px;">${notif.message}</p>
                    <div style="margin-top: 8px; font-size: 12px; color: #9ca3af;">
                        De ${notif.sentBy} • ${formatNotificationDate(notif.sentAt)}
                    </div>
                    <div style="margin-top: 8px;">
                        <button onclick="markNotificationAsRead('${doc.id}', '${playerId}')" style="background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; text-decoration: underline; padding: 0;">
                            ${isRead ? '✓ Marquée comme lue' : 'Marquer comme lue'}
                        </button>
                    </div>
                </div>
            `;
        });
        
        if (html) {
            container.innerHTML = html;
        }
        
    } catch (error) {
        console.error('Erreur chargement notifications:', error);
    }
}

async function markNotificationAsRead(notificationId, playerId) {
    try {
        await db.collection('notifications').doc(notificationId).update({
            readBy: firebase.firestore.FieldValue.arrayUnion(playerId)
        });
        
        // Recharger les notifications
        loadPlayerNotifications(playerId);
        
    } catch (error) {
        console.error('Erreur marquage notification:', error);
    }
}

/**
 * Supprime une notification
 */
async function deleteNotification(notificationId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette notification ?')) {
        return;
    }
    
    try {
        await db.collection('notifications').doc(notificationId).delete();
        
        // Recharger les notifications
        if (appState.currentRole === 'player') {
            loadPlayerNotifications(appState.currentUser);
        }
    } catch (error) {
        console.error('Erreur suppression notification:', error);
        alert('Erreur lors de la suppression de la notification');
    }
}

function formatNotificationDate(timestamp) {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'À l\'instant';
    if (diff < 3600000) return `Il y a ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)} h`;
    
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// ============================================================================
// EXPORTS
// ============================================================================

window.initCoachNotificationSystem = initCoachNotificationSystem;
window.openNotificationModal = openNotificationModal;
window.closeNotificationModal = closeNotificationModal;
window.sendCoachNotification = sendCoachNotification;
window.loadPlayerNotifications = loadPlayerNotifications;
window.markNotificationAsRead = markNotificationAsRead;
window.deleteNotification = deleteNotification;

console.log('Coach Notifications Simple chargé');
