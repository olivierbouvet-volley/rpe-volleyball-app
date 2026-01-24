// Module de gestion des notifications (anniversaires et messages urgents)

// Référence à la collection Firestore
const urgentMessagesCollection = db.collection('urgent_messages');

/**
 * Vérifier et afficher les notifications d'anniversaire
 * @param {string} currentPlayerId - ID de la joueuse connectée (ou 'coach')
 * @param {string} role - 'player' ou 'coach'
 */
async function checkAndDisplayBirthdayNotifications(currentPlayerId, role) {
  try {
    const today = new Date();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    
    console.log(`🎂 Notifications: Vérification anniversaires - Aujourd'hui: ${todayDay}/${todayMonth}`);
    
    // Charger toutes les joueuses
    const playersSnapshot = await db.collection('players').get();
    const birthdayPlayers = [];
    
    console.log(`🎂 Notifications: ${playersSnapshot.size} joueuses trouvées dans Firestore`);
    
    playersSnapshot.forEach(doc => {
      const player = doc.data();
      console.log(`🎂 Notifications: ${player.name} - birthday: ${player.birthday}`);
      
      if (player.birthday) {
        // Format attendu: DD/MM/YY ou DD/MM/YYYY
        const parts = player.birthday.split('/');
        if (parts.length >= 2) {
          const birthDay = parts[0];
          const birthMonth = parts[1];
          
          console.log(`  → Comparaison: ${birthDay}/${birthMonth} vs ${todayDay}/${todayMonth}`);
          
          if (birthDay === todayDay && birthMonth === todayMonth) {
            console.log(`  ✅ MATCH ANNIVERSAIRE: ${player.name}!`);
            birthdayPlayers.push({
              id: doc.id,
              name: player.name,
              birthday: player.birthday
            });
          }
        }
      }
    });
    
    console.log(`🎂 Notifications: ${birthdayPlayers.length} anniversaire(s) trouvé(s)`);
    if (birthdayPlayers.length > 0) {
      console.log(`🎂 Notifications: Liste:`, birthdayPlayers);
    }
    
    // Afficher les notifications selon le rôle
    if (role === 'player') {
      displayPlayerBirthdayNotifications(currentPlayerId, birthdayPlayers);
    } else if (role === 'coach') {
      displayCoachBirthdayNotifications(birthdayPlayers);
    }
    
  } catch (error) {
    console.error('Erreur lors de la vérification des anniversaires:', error);
  }
}

/**
 * Afficher les notifications d'anniversaire pour une joueuse
 */
function displayPlayerBirthdayNotifications(currentPlayerId, birthdayPlayers) {
  const container = document.getElementById('playerNotificationsContainer');
  if (!container) return;
  
  let html = '';
  
  birthdayPlayers.forEach(player => {
    if (player.id === currentPlayerId) {
      // C'est l'anniversaire de la joueuse connectée
      const age = calculateAge(player.birthday);
      html += `
        <div class="notification-banner birthday-self" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; margin-bottom: 15px; border-radius: 12px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3); animation: slideDown 0.5s ease-out;">
          <div style="display: flex; align-items: center; gap: 15px;">
            <span style="font-size: 48px;">🎂</span>
            <div>
              <h3 style="margin: 0 0 5px 0; font-size: 22px; font-weight: 700;">Joyeux anniversaire ${player.name.split(' ')[0]} !</h3>
              <p style="margin: 0; font-size: 16px; opacity: 0.95;">Toute l'équipe te souhaite une excellente journée pour tes ${age} ans ! 🎉</p>
            </div>
          </div>
        </div>
      `;
    } else {
      // C'est l'anniversaire d'une autre joueuse
      html += `
        <div class="notification-banner birthday-teammate" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 16px; margin-bottom: 15px; border-radius: 12px; box-shadow: 0 4px 15px rgba(240, 147, 251, 0.3); animation: slideDown 0.5s ease-out;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 32px;">🎉</span>
            <div>
              <p style="margin: 0; font-size: 16px; font-weight: 600;">C'est l'anniversaire de <strong>${player.name}</strong> aujourd'hui !</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">N'oublie pas de lui souhaiter ! 🎈</p>
            </div>
          </div>
        </div>
      `;
    }
  });
  
  container.innerHTML = html;
}

/**
 * Afficher les notifications d'anniversaire pour le coach
 */
function displayCoachBirthdayNotifications(birthdayPlayers) {
  const container = document.getElementById('coachNotificationsContainer');
  if (!container) return;
  
  if (birthdayPlayers.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  let html = '';
  birthdayPlayers.forEach(player => {
    const age = calculateAge(player.birthday);
    html += `
      <div class="notification-banner birthday-coach" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; margin-bottom: 12px; border-radius: 10px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); animation: slideDown 0.5s ease-out;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 32px;">🎂</span>
          <div>
            <p style="margin: 0; font-size: 16px; font-weight: 600;">Anniversaire aujourd'hui : <strong>${player.name}</strong> (${age} ans)</p>
          </div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

/**
 * Calculer l'âge à partir de la date de naissance
 * @param {string} birthday - Format DD/MM/YY ou DD/MM/YYYY
 * @returns {number} - Âge en années
 */
function calculateAge(birthday) {
  const parts = birthday.split('/');
  if (parts.length < 3) return 0;
  
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // Les mois commencent à 0 en JavaScript
  let year = parseInt(parts[2]);
  
  // Si l'année est sur 2 chiffres, ajouter 2000 ou 1900
  if (year < 100) {
    year += year > 50 ? 1900 : 2000;
  }
  
  const birthDate = new Date(year, month, day);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Vérifier et afficher les messages urgents pour une joueuse
 * @param {string} currentPlayerId - ID de la joueuse connectée
 */
async function checkAndDisplayUrgentMessages(currentPlayerId) {
  try {
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
    
    // Récupérer les messages pour aujourd'hui
    const snapshot = await urgentMessagesCollection
      .where('displayDate', '==', today)
      .get();
    
    const messages = [];
    snapshot.forEach(doc => {
      const msg = doc.data();
      // Vérifier si le message est pour cette joueuse
      if (msg.targetPlayers.includes('all') || msg.targetPlayers.includes(currentPlayerId)) {
        messages.push({
          id: doc.id,
          ...msg
        });
      }
    });
    
    displayUrgentMessages(messages);
    
  } catch (error) {
    console.error('Erreur lors de la récupération des messages urgents:', error);
  }
}

/**
 * Afficher les messages urgents dans le dashboard joueur
 */
function displayUrgentMessages(messages) {
  const container = document.getElementById('playerNotificationsContainer');
  if (!container) return;
  
  messages.forEach(msg => {
    const bgColor = msg.priority === 'urgent' 
      ? 'linear-gradient(135deg, #E63946 0%, #C1121F 100%)' 
      : 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)';
    
    const icon = msg.priority === 'urgent' ? '⚠️' : '📢';
    
    const messageHtml = `
      <div class="notification-banner urgent-message" data-message-id="${msg.id}" style="background: ${bgColor}; color: white; padding: 18px; margin-bottom: 15px; border-radius: 12px; box-shadow: 0 4px 15px rgba(230, 57, 70, 0.3); animation: slideDown 0.5s ease-out; position: relative;">
        <button onclick="closeUrgentMessage('${msg.id}')" style="position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.2); border: none; color: white; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 18px; line-height: 1; transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">×</button>
        <div style="display: flex; align-items: flex-start; gap: 15px; padding-right: 30px;">
          <span style="font-size: 36px; flex-shrink: 0;">${icon}</span>
          <div>
            <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">Message du coach</h3>
            <p style="margin: 0; font-size: 16px; line-height: 1.5;">${msg.text}</p>
          </div>
        </div>
      </div>
    `;
    
    container.insertAdjacentHTML('beforeend', messageHtml);
  });
}

/**
 * Fermer temporairement un message urgent (réapparaîtra au prochain chargement)
 */
function closeUrgentMessage(messageId) {
  const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
  if (messageElement) {
    messageElement.style.animation = 'slideUp 0.3s ease-out';
    setTimeout(() => {
      messageElement.remove();
    }, 300);
  }
}

/**
 * Ouvrir le modal de création de message urgent (coach)
 */
function openUrgentMessageModal() {
  const modal = document.getElementById('urgentMessageModal');
  if (!modal) return;
  
  // Réinitialiser le formulaire
  document.getElementById('urgentMessageForm').reset();
  
  // Remplir la liste des joueuses
  populatePlayerCheckboxes();
  
  // Afficher le modal
  modal.style.display = 'flex';
}

/**
 * Fermer le modal de création de message urgent
 */
function closeUrgentMessageModal() {
  const modal = document.getElementById('urgentMessageModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Remplir les checkboxes des joueuses dans le formulaire
 */
async function populatePlayerCheckboxes() {
  const container = document.getElementById('targetPlayersCheckboxes');
  if (!container) return;
  
  try {
    const playersSnapshot = await db.collection('players').get();
    
    let html = `
      <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 6px; transition: background 0.2s;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='transparent'">
        <input type="checkbox" id="targetAll" value="all" onchange="toggleAllPlayers(this)" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
        <strong>Toutes les joueuses</strong>
      </label>
      <div style="height: 1px; background: #e0e0e0; margin: 10px 0;"></div>
    `;
    
    playersSnapshot.forEach(doc => {
      const player = doc.data();
      html += `
        <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 6px; transition: background 0.2s;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='transparent'">
          <input type="checkbox" class="player-checkbox" name="targetPlayers" value="${doc.id}" style="margin-right: 10px; width: 18px; height: 18px; cursor: pointer;">
          ${player.name}
        </label>
      `;
    });
    
    container.innerHTML = html;
  } catch (error) {
    console.error('Erreur lors du chargement des joueuses:', error);
  }
}

/**
 * Cocher/décocher toutes les joueuses
 */
function toggleAllPlayers(checkbox) {
  const playerCheckboxes = document.querySelectorAll('.player-checkbox');
  playerCheckboxes.forEach(cb => {
    cb.checked = checkbox.checked;
  });
}

/**
 * Enregistrer un nouveau message urgent
 */
async function saveUrgentMessage(event) {
  event.preventDefault();
  
  try {
    const form = document.getElementById('urgentMessageForm');
    const formData = new FormData(form);
    
    const text = formData.get('messageText').trim();
    const displayDate = formData.get('displayDate');
    const priority = formData.get('priority');
    
    // Récupérer les joueuses ciblées
    const targetAll = document.getElementById('targetAll').checked;
    let targetPlayers = [];
    
    if (targetAll) {
      targetPlayers = ['all'];
    } else {
      const checkedBoxes = document.querySelectorAll('.player-checkbox:checked');
      checkedBoxes.forEach(cb => {
        targetPlayers.push(cb.value);
      });
    }
    
    // Validation
    if (!text || text.length === 0) {
      alert('Veuillez entrer un message');
      return;
    }
    
    if (text.length > 200) {
      alert('Le message ne peut pas dépasser 200 caractères');
      return;
    }
    
    if (!displayDate) {
      alert('Veuillez sélectionner une date d\'affichage');
      return;
    }
    
    if (targetPlayers.length === 0) {
      alert('Veuillez sélectionner au moins une joueuse');
      return;
    }
    
    // Créer le message
    const messageData = {
      text: text,
      displayDate: displayDate,
      targetPlayers: targetPlayers,
      priority: priority,
      createdBy: 'coach',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await urgentMessagesCollection.add(messageData);
    
    alert('Message programmé avec succès !');
    closeUrgentMessageModal();
    
    // Recharger la liste des messages
    loadScheduledMessages();
    
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du message:', error);
    alert('Erreur lors de l\'enregistrement du message');
  }
}

/**
 * Charger et afficher la liste des messages programmés (coach)
 */
async function loadScheduledMessages() {
  try {
    const snapshot = await urgentMessagesCollection
      .orderBy('displayDate', 'desc')
      .get();
    
    const tbody = document.getElementById('scheduledMessagesTableBody');
    if (!tbody) return;
    
    if (snapshot.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 30px; color: #666;">
            Aucun message programmé
          </td>
        </tr>
      `;
      return;
    }
    
    let html = '';
    snapshot.forEach(doc => {
      const msg = doc.data();
      const targetText = msg.targetPlayers.includes('all') 
        ? 'Toutes' 
        : `${msg.targetPlayers.length} joueuse(s)`;
      
      const priorityBadge = msg.priority === 'urgent'
        ? '<span style="background: #E63946; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">URGENT</span>'
        : '<span style="background: #4ECDC4; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">Normal</span>';
      
      html += `
        <tr>
          <td>${formatDateFR(msg.displayDate)}</td>
          <td style="max-width: 300px;">${msg.text}</td>
          <td>${targetText}</td>
          <td>${priorityBadge}</td>
          <td>
            <button onclick="deleteUrgentMessage('${doc.id}')" class="action-btn delete-btn" style="background: #E63946; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: opacity 0.2s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">
              🗑️ Supprimer
            </button>
          </td>
        </tr>
      `;
    });
    
    tbody.innerHTML = html;
    
  } catch (error) {
    console.error('Erreur lors du chargement des messages programmés:', error);
  }
}

/**
 * Supprimer un message urgent
 */
async function deleteUrgentMessage(messageId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
    return;
  }
  
  try {
    await urgentMessagesCollection.doc(messageId).delete();
    alert('Message supprimé avec succès');
    loadScheduledMessages();
  } catch (error) {
    console.error('Erreur lors de la suppression du message:', error);
    alert('Erreur lors de la suppression du message');
  }
}

/**
 * Formater une date au format français
 */
function formatDateFR(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Ajouter les animations CSS
(function() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes slideUp {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(-20px);
      }
    }
  `;
  document.head.appendChild(style);
})();

console.log('Module Notifications chargé');

