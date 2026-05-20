// Module de gestion des blessures et douleurs

// Référence aux collections Firestore
const injuriesCollection = db.collection('injuries');
const painsCollection = db.collection('pains'); // Nouvelle collection pour les douleurs

// Variables globales
let allInjuries = [];
let allPains = []; // Nouvelle variable pour les douleurs
let currentFilter = 'active'; // 'active', 'all'
let weekOffset = 0; // 0 = semaine courante, -1 = semaine précédente
window.medicalSettings = {}; // Contacts staff médical (kiné, groupe)

// Labels complets des zones corporelles (inclut les zones du formulaire douleur joueuse)
const PAIN_ZONE_LABELS = {
  head: 'Tête', neck: 'Cou', shoulder: 'Épaule', elbow: 'Coude',
  wrist: 'Poignet', hand: 'Main/Doigts', back: 'Dos', lower_back: 'Bas du dos',
  hip: 'Hanche', thigh: 'Cuisse', knee: 'Genou', calf: 'Mollet',
  ankle: 'Cheville', foot: 'Pied', finger: 'Doigt', other: 'Autre'
};

function getPainZoneLabel(zoneId) {
  return PAIN_ZONE_LABELS[zoneId] || getBodyZoneLabel(zoneId);
}

/**
 * Initialiser le module de suivi des blessures et douleurs
 */
async function initInjuryTracking() {
  console.log('Initialisation du module de suivi des blessures et douleurs...');

  // Réinitialiser la navigation semaine à chaque ouverture de l'onglet
  weekOffset = 0;

  // Charger les contacts staff médical
  await loadMedicalSettings();

  // Charger les blessures
  await loadInjuries();

  // Charger les douleurs
  await loadPains();

  // Afficher les tableaux
  displayInjuriesTable();
  displayPainsTable();

  // Afficher les statistiques
  displayInjuryStatistics();
  displayPainStatistics();

  // Vue hebdomadaire et graphique timeline
  displayWeeklyPainGrid();
  displayPainTimeline();

  // Configurer les event listeners
  setupInjuryEventListeners();
}

/**
 * Charger toutes les blessures de l'équipe
 */
async function loadInjuries() {
  try {
    const teamCode = appState.currentUser;
    const snapshot = await injuriesCollection.get();

    allInjuries = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // Inclure : même teamCode, teamCode 'pole' (entrées joueuses), ou pas de teamCode (legacy)
      if (!data.teamCode || data.teamCode === teamCode || data.teamCode === 'pole') {
        allInjuries.push({ id: doc.id, ...data });
      }
    });

    // Trier côté client par date décroissante
    allInjuries.sort((a, b) => {
      const dateA = a.injuryDate?.toDate?.() || new Date(a.injuryDate);
      const dateB = b.injuryDate?.toDate?.() || new Date(b.injuryDate);
      return dateB - dateA;
    });

    console.log(`${allInjuries.length} blessures chargées`);
  } catch (error) {
    console.error('Erreur lors du chargement des blessures:', error);
    showNotification('Erreur lors du chargement des blessures', 'error');
  }
}

/**
 * Afficher le tableau des blessures
 */
function displayInjuriesTable() {
  const tableBody = document.getElementById('injuriesTableBody');
  if (!tableBody) return;
  
  // Filtrer selon le filtre actif
  let filteredInjuries = allInjuries;
  if (currentFilter === 'active') {
    filteredInjuries = allInjuries.filter(inj => inj.status !== 'recovered');
  }
  
  if (filteredInjuries.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
          ${currentFilter === 'active' ? 'Aucune blessure active' : 'Aucune blessure enregistrée'}
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  filteredInjuries.forEach(injury => {
    const statusInfo = getStatusInfo(injury.status);
    const severityInfo = getSeverityInfo(injury.severity);
    const daysOut = calculateDaysOut(injury.injuryDate, injury.recoveryDate);
    
    html += `
      <tr>
        <td style="font-weight: 600;">${injury.playerName}</td>
        <td>${formatDateFR(injury.injuryDate)}</td>
        <td>${getInjuryTypeLabel(injury.injuryType)}</td>
        <td>${getBodyZoneLabel(injury.bodyZone)}</td>
        <td>
          <span style="display: inline-block; padding: 4px 12px; background: ${severityInfo.color}; color: white; border-radius: 4px; font-size: 13px; font-weight: 600;">
            ${severityInfo.label}
          </span>
        </td>
        <td>
          <span style="display: inline-block; padding: 4px 12px; background: ${statusInfo.color}; color: white; border-radius: 4px; font-size: 13px; font-weight: 600;">
            ${statusInfo.label}
          </span>
        </td>
        <td style="font-weight: 600;">${daysOut} jours</td>
        <td>
          <button onclick="editInjuryStatus('${injury.id}')" class="btn-edit-injury" title="Modifier le statut">
            <i class="fas fa-edit"></i>
          </button>
          ${injury.status !== 'recovered' ? `
            <button onclick="markAsRecovered('${injury.id}')" class="btn-recover-injury" title="Marquer comme rétablie">
              <i class="fas fa-check-circle"></i>
            </button>
          ` : ''}
        </td>
      </tr>
    `;
  });
  
  tableBody.innerHTML = html;
}

/**
 * Afficher les statistiques des blessures
 */
function displayInjuryStatistics() {
  const activeInjuries = allInjuries.filter(inj => inj.status !== 'recovered');
  const recoveredInjuries = allInjuries.filter(inj => inj.status === 'recovered');
  
  // Nombre de blessures actives
  const activeCountEl = document.getElementById('activeInjuriesCount');
  if (activeCountEl) {
    activeCountEl.textContent = activeInjuries.length;
  }
  
  // Nombre total de blessures
  const totalCountEl = document.getElementById('totalInjuriesCount');
  if (totalCountEl) {
    totalCountEl.textContent = allInjuries.length;
  }
  
  // Durée moyenne d'indisponibilité (seulement pour les blessures rétablies)
  if (recoveredInjuries.length > 0) {
    const totalDays = recoveredInjuries.reduce((sum, inj) => {
      return sum + calculateDaysOut(inj.injuryDate, inj.recoveryDate);
    }, 0);
    const avgDays = Math.round(totalDays / recoveredInjuries.length);
    
    const avgDaysEl = document.getElementById('avgRecoveryDays');
    if (avgDaysEl) {
      avgDaysEl.textContent = `${avgDays} jours`;
    }
  }
  
  // Liste des blessures actives
  displayActiveInjuriesList(activeInjuries);
  
  // Répartition par type
  displayInjuryTypeDistribution();
}

/**
 * Afficher la liste des blessures actives
 */
function displayActiveInjuriesList(activeInjuries) {
  const listEl = document.getElementById('activeInjuriesList');
  if (!listEl) return;
  
  if (activeInjuries.length === 0) {
    listEl.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic;">Aucune blessure active</p>';
    return;
  }
  
  let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
  activeInjuries.forEach(injury => {
    const daysOut = calculateDaysOut(injury.injuryDate, null);
    const statusInfo = getStatusInfo(injury.status);
    
    html += `
      <li style="padding: 10px 0; border-bottom: 1px solid var(--color-border);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${injury.playerName}</strong><br>
            <span style="font-size: 13px; color: var(--color-text-secondary);">${getInjuryTypeLabel(injury.injuryType)} - ${daysOut} jours</span>
          </div>
          <span style="padding: 4px 10px; background: ${statusInfo.color}; color: white; border-radius: 4px; font-size: 12px; font-weight: 600;">
            ${statusInfo.label}
          </span>
        </div>
      </li>
    `;
  });
  html += '</ul>';
  
  listEl.innerHTML = html;
}

/**
 * Afficher la répartition par type de blessure
 */
function displayInjuryTypeDistribution() {
  const distributionEl = document.getElementById('injuryTypeDistribution');
  if (!distributionEl) return;
  
  // Compter les blessures par type
  const typeCounts = {};
  allInjuries.forEach(injury => {
    const typeLabel = getInjuryTypeLabel(injury.injuryType);
    typeCounts[typeLabel] = (typeCounts[typeLabel] || 0) + 1;
  });
  
  // Trier par nombre décroissant
  const sortedTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Top 5
  
  if (sortedTypes.length === 0) {
    distributionEl.innerHTML = '<p style="color: var(--color-text-secondary); font-style: italic;">Aucune donnée disponible</p>';
    return;
  }
  
  let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
  sortedTypes.forEach(([type, count]) => {
    const percentage = Math.round((count / allInjuries.length) * 100);
    html += `
      <li style="padding: 8px 0; display: flex; justify-content: space-between; align-items: center;">
        <span>${type}</span>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 100px; height: 8px; background: var(--color-border); border-radius: 4px; overflow: hidden;">
            <div style="width: ${percentage}%; height: 100%; background: var(--color-error);"></div>
          </div>
          <span style="font-weight: 600; min-width: 50px; text-align: right;">${count} (${percentage}%)</span>
        </div>
      </li>
    `;
  });
  html += '</ul>';
  
  distributionEl.innerHTML = html;
}

/**
 * Ouvrir le modal de déclaration de blessure
 */
async function openNewInjuryModal() {
  const modal = document.getElementById('newInjuryModal');
  if (!modal) return;

  // Réinitialiser le formulaire
  document.getElementById('newInjuryForm').reset();

  // Remplir la liste des joueuses
  await populatePlayerSelect();

  // Afficher le modal avec la classe active (pour pointer-events)
  modal.classList.add('active');
}

/**
 * Fermer le modal de déclaration de blessure
 */
function closeNewInjuryModal() {
  const modal = document.getElementById('newInjuryModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

/**
 * Remplir le select des joueuses
 */
async function populatePlayerSelect() {
  const injurySelect = document.getElementById('injuryPlayerId');
  const painSelect = document.getElementById('painPlayerSelect');
  
  try {
    // Charger les joueuses depuis Firestore
    const playersSnapshot = await db.collection('players').get();
    
    if (playersSnapshot.empty) {
      if (injurySelect) injurySelect.innerHTML = '<option value="">Aucune joueuse disponible</option>';
      if (painSelect) painSelect.innerHTML = '<option value="">Aucune joueuse disponible</option>';
      return;
    }
    
    // Pour le select des blessures (garde l'ancien format)
    if (injurySelect) {
      let injuryHtml = '<option value="">Sélectionner une joueuse</option>';
      playersSnapshot.forEach(doc => {
        const player = doc.data();
        injuryHtml += `<option value="${doc.id}" data-name="${player.name}">${player.name}</option>`;
      });
      injurySelect.innerHTML = injuryHtml;
    }
    
    // Pour le select des douleurs (nouveau format)
    if (painSelect) {
      let painHtml = '<option value="">Sélectionner...</option>';
      playersSnapshot.forEach(doc => {
        const player = doc.data();
        painHtml += `<option value="${player.name}" data-player-id="${doc.id}">${player.name}</option>`;
      });
      painSelect.innerHTML = painHtml;
    }
  } catch (error) {
    console.error('Erreur lors du chargement des joueuses:', error);
    if (injurySelect) injurySelect.innerHTML = '<option value="">Erreur de chargement</option>';
    if (painSelect) painSelect.innerHTML = '<option value="">Erreur de chargement</option>';
  }
}

/**
 * Enregistrer une nouvelle blessure
 */
async function saveNewInjury(event) {
  event.preventDefault();
  
  try {
    // Récupérer les données du formulaire
    const form = document.getElementById('newInjuryForm');
    const formData = new FormData(form);
    
    const playerId = formData.get('playerId');
    const playerSelect = document.getElementById('injuryPlayerId');
    const playerName = playerSelect.options[playerSelect.selectedIndex].getAttribute('data-name');
    
    const injuryData = {
      playerId: playerId,
      playerName: playerName,
      teamCode: appState.currentUser,
      injuryDate: firebase.firestore.Timestamp.fromDate(new Date(formData.get('injuryDate'))),
      injuryType: formData.get('injuryType'),
      bodyZone: formData.get('bodyZone'),
      severity: parseInt(formData.get('severity')),
      circumstance: formData.get('circumstance'),
      status: 'active',
      recoveryDate: null,
      daysOut: 0,
      comments: formData.get('comments') || '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Enregistrer dans Firestore
    await injuriesCollection.add(injuryData);
    
    showNotification('Blessure enregistrée avec succès', 'success');
    
    // Fermer le modal
    closeNewInjuryModal();
    
    // Recharger les données
    await loadInjuries();
    displayInjuriesTable();
    displayInjuryStatistics();
    
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la blessure:', error);
    showNotification('Erreur lors de l\'enregistrement de la blessure', 'error');
  }
}

/**
 * Marquer une blessure comme rétablie
 */
async function markAsRecovered(injuryId) {
  if (!confirm('Marquer cette blessure comme rétablie ?')) {
    return;
  }
  
  try {
    const recoveryDate = new Date();
    await injuriesCollection.doc(injuryId).update({
      status: 'recovered',
      recoveryDate: firebase.firestore.Timestamp.fromDate(recoveryDate),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showNotification('Blessure marquée comme rétablie', 'success');
    
    // Recharger les données
    await loadInjuries();
    displayInjuriesTable();
    displayInjuryStatistics();
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    showNotification('Erreur lors de la mise à jour', 'error');
  }
}

/**
 * Modifier le statut d'une blessure
 */
async function editInjuryStatus(injuryId) {
  const injury = allInjuries.find(inj => inj.id === injuryId);
  if (!injury) return;
  
  // Créer la modal HTML avec un select
  const modalHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;" id="statusModal">
      <div style="background: var(--color-surface); padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
        <h3 style="margin: 0 0 20px 0; color: var(--color-text); font-size: 20px;">Modifier le statut de la blessure de ${injury.playerName}</h3>

        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; color: var(--color-text); font-weight: 600;">Statut actuel:</label>
          <div style="padding: 10px; background: var(--color-background); border-radius: 6px; color: var(--color-text);">
            ${getStatusInfo(injury.status).label}
          </div>
        </div>

        <div style="margin-bottom: 25px;">
          <label for="newStatusSelect" style="display: block; margin-bottom: 8px; color: var(--color-text); font-weight: 600;">Nouveau statut:</label>
          <select id="newStatusSelect" style="width: 100%; padding: 12px; border: 2px solid var(--color-border); border-radius: 8px; font-size: 15px; color: var(--color-text); background: var(--color-surface); cursor: pointer;">
            <option value="active" ${injury.status === 'active' ? 'selected' : ''}>Blessée</option>
            <option value="rehabilitation" ${injury.status === 'rehabilitation' ? 'selected' : ''}>En réathlétisation</option>
            <option value="progressive_return" ${injury.status === 'progressive_return' ? 'selected' : ''}>Retour progressif</option>
            <option value="recovered" ${injury.status === 'recovered' ? 'selected' : ''}>Rétablie</option>
          </select>
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="cancelStatusBtn" style="padding: 10px 20px; background: var(--color-background); color: var(--color-text); border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">Annuler</button>
          <button id="confirmStatusBtn" style="padding: 10px 20px; background: #1d7480; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">OK</button>
        </div>
      </div>
    </div>
  `;
  
  // Injecter la modal dans le body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Gérer les événements
  const modal = document.getElementById('statusModal');
  const selectElement = document.getElementById('newStatusSelect');
  const cancelBtn = document.getElementById('cancelStatusBtn');
  const confirmBtn = document.getElementById('confirmStatusBtn');
  
  // Fermer la modal
  const closeModal = () => {
    modal.remove();
  };
  
  // Annuler
  cancelBtn.onclick = closeModal;
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
  
  // Confirmer
  confirmBtn.onclick = async () => {
    const newStatus = selectElement.value;
    
    if (!newStatus || newStatus === injury.status) {
      closeModal();
      return;
    }
    
    try {
      const updateData = {
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      // Si le statut est "recovered", ajouter la date de rétablissement
      if (newStatus === 'recovered' && !injury.recoveryDate) {
        updateData.recoveryDate = firebase.firestore.Timestamp.fromDate(new Date());
      }
      
      await injuriesCollection.doc(injuryId).update(updateData);
      
      closeModal();
      showNotification('Statut mis à jour avec succès', 'success');
      
      // Recharger les données
      await loadInjuries();
      displayInjuriesTable();
      displayInjuryStatistics();
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      showNotification('Erreur lors de la mise à jour', 'error');
    }
  };
}

/**
 * Configurer les event listeners
 */
function setupInjuryEventListeners() {
  // Bouton nouvelle blessure
  const newInjuryBtn = document.getElementById('btnNewInjury');
  if (newInjuryBtn) {
    newInjuryBtn.addEventListener('click', openNewInjuryModal);
  }
  
  // Bouton fermer modal
  const closeModalBtn = document.getElementById('closeInjuryModal');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', closeNewInjuryModal);
  }
  
  // Formulaire de nouvelle blessure
  const form = document.getElementById('newInjuryForm');
  if (form) {
    form.addEventListener('submit', saveNewInjury);
  }
  
  // Filtres
  const filterBtns = document.querySelectorAll('.injury-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      currentFilter = this.getAttribute('data-filter');
      
      // Mettre à jour les classes actives
      filterBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      // Réafficher le tableau
      displayInjuriesTable();
    });
  });
  
  // Fermer le modal en cliquant en dehors
  const modal = document.getElementById('newInjuryModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeNewInjuryModal();
      }
    });
  }
}

/**
 * Fonction helper pour afficher une notification
 */
function showNotification(message, type = 'info') {
  // Réutiliser la fonction existante ou créer une simple alerte
  if (typeof showToast === 'function') {
    showToast(message, type);
  } else {
    alert(message);
  }
}

// ===================================================
// GESTION DES DOULEURS (PAINS)
// ===================================================

/**
 * Charger toutes les douleurs de l'équipe
 * Filtre par teamCode avec fallback pour les données existantes sans teamCode
 */
async function loadPains() {
  try {
    const teamCode = appState.currentUser;
    const snapshot = await painsCollection.get();
    allPains = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      // Inclure : même teamCode, teamCode 'pole' (entrées joueuses via check-in), ou pas de teamCode (legacy)
      if (!data.teamCode || data.teamCode === teamCode || data.teamCode === 'pole') {
        allPains.push({ id: doc.id, ...data });
      }
    });

    // Trier côté client par date décroissante
    allPains.sort((a, b) => {
      const dateA = a.painDate?.toDate?.() || new Date(a.painDate);
      const dateB = b.painDate?.toDate?.() || new Date(b.painDate);
      return dateB - dateA;
    });

    console.log(`${allPains.length} douleurs chargées`);
  } catch (error) {
    console.error('Erreur lors du chargement des douleurs:', error);
    showNotification('Erreur lors du chargement des douleurs', 'error');
  }
}

/**
 * Afficher le tableau des douleurs
 */
function displayPainsTable() {
  const tableBody = document.getElementById('painsTableBody');
  if (!tableBody) return;

  // Filtrer les douleurs actives
  const filteredPains = allPains.filter(pain => pain.status === 'active');

  if (filteredPains.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
          Aucune douleur signalée
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  filteredPains.forEach(pain => {
    const daysOut = calculateDaysOut(pain.painDate, pain.recoveryDate);
    const intensity = pain.intensity || null;
    const source = pain.source || 'coach';
    const sourceIcon = source === 'checkin' ? '👩' : '🏋️';
    const sourceTitle = source === 'checkin' ? 'Déclarée par la joueuse' : 'Déclarée par le coach';

    // Couleur de l'intensité
    const intensityColor = !intensity ? '#9ca3af'
      : intensity >= 8 ? '#dc2626'
      : intensity >= 5 ? '#f59e0b'
      : '#10b981';

    const intensityHTML = intensity
      ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:${intensityColor};color:white;font-weight:700;font-size:13px;">${intensity}</span>`
      : '<span style="color:#9ca3af;font-size:12px;">—</span>';

    // Boutons WhatsApp
    const settings = window.medicalSettings || {};
    const playerName = pain.playerName || '';
    const zone = getPainZoneLabel(pain.bodyZone);
    const intensityTxt = intensity ? `${intensity}/10` : 'inconnue';
    const durationTxt = `${daysOut}j`;

    let whatsappHTML = '';
    if (settings.kinePhone) {
      const msg = encodeURIComponent(`Bonjour ${settings.kineName || 'Kiné'}, ${playerName} a signalé une douleur au ${zone} (intensité ${intensityTxt}, depuis ${durationTxt}). Merci pour le suivi.`);
      whatsappHTML += `<a href="https://wa.me/${settings.kinePhone}?text=${msg}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:#25d366;color:white;border-radius:6px;text-decoration:none;font-size:11px;margin-right:4px;" title="Envoyer au kiné">📱 Kiné</a>`;
    } else {
      whatsappHTML += `<span style="color:#9ca3af;font-size:11px;" title="Configurer le numéro kiné dans les paramètres">📱 —</span> `;
    }
    if (settings.medicalGroupPhone) {
      const msg2 = encodeURIComponent(`[DOULEUR] ${playerName} — ${zone} — ${intensityTxt} — ${durationTxt}`);
      whatsappHTML += `<a href="https://wa.me/${settings.medicalGroupPhone}?text=${msg2}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:#128c7e;color:white;border-radius:6px;text-decoration:none;font-size:11px;" title="Envoyer au groupe staff">👥 Staff</a>`;
    }

    html += `
      <tr>
        <td style="font-weight: 600;">${pain.playerName}</td>
        <td>${formatDateFR(pain.painDate)}</td>
        <td>${getPainZoneLabel(pain.bodyZone)}</td>
        <td>${pain.description || '-'}</td>
        <td style="text-align:center;">${intensityHTML}</td>
        <td style="text-align:center;" title="${sourceTitle}">${sourceIcon}</td>
        <td style="font-weight: 600;">${daysOut} j</td>
        <td style="white-space:nowrap;">
          ${whatsappHTML}
          <button onclick="markPainAsRecovered('${pain.id}')" class="btn-recover-injury" title="Marquer comme rétablie" style="margin-left:4px;">
            <i class="fas fa-check-circle"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

/**
 * Afficher les statistiques des douleurs
 */
function displayPainStatistics() {
  const activePains = allPains.filter(pain => pain.status === 'active');
  
  const activePainsCountEl = document.getElementById('activePainsCount');
  if (activePainsCountEl) {
    activePainsCountEl.textContent = activePains.length;
  }
}

/**
 * Déclarer une nouvelle douleur (depuis le dashboard coach)
 */
async function declarePain() {
  const playerSelect = document.getElementById('painPlayerSelect');
  const bodyZoneSelect = document.getElementById('painBodyZone');
  const descriptionInput = document.getElementById('painDescription');
  const intensityInput = document.getElementById('painIntensityCoach');

  const playerName = playerSelect.value;
  const playerId = playerSelect.options[playerSelect.selectedIndex].dataset.playerId;
  const bodyZone = bodyZoneSelect.value;
  const description = descriptionInput.value.trim();
  const intensity = intensityInput ? parseInt(intensityInput.value) || null : null;

  if (!playerName || !bodyZone) {
    alert('Veuillez remplir tous les champs obligatoires');
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    await painsCollection.add({
      playerName,
      playerId,
      bodyZone,
      description,
      intensity,
      daysSince: 1,
      source: 'coach',
      teamCode: appState.currentUser,
      lastConfirmedDate: today,
      confirmationHistory: [{ date: today, intensity }],
      painDate: firebase.firestore.Timestamp.fromDate(new Date()),
      status: 'active',
      recoveryDate: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    showNotification('Douleur déclarée avec succès', 'success');
    document.getElementById('declarePainForm').reset();

    await loadPains();
    displayPainsTable();
    displayPainStatistics();
    displayWeeklyPainGrid();

  } catch (error) {
    console.error('Erreur lors de la déclaration:', error);
    showNotification('Erreur lors de la déclaration de la douleur', 'error');
  }
}

/**
 * Marquer une douleur comme rétablie (depuis le dashboard coach)
 */
async function markPainAsRecovered(painId) {
  if (!confirm('Marquer cette douleur comme rétablie ?')) return;

  try {
    await painsCollection.doc(painId).update({
      status: 'recovered',
      recoveryDate: firebase.firestore.Timestamp.fromDate(new Date()),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    showNotification('Douleur marquée comme rétablie', 'success');
    await loadPains();
    displayPainsTable();
    displayPainStatistics();
    displayWeeklyPainGrid();

  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    showNotification('Erreur lors de la mise à jour', 'error');
  }
}

// ===================================================
// FONCTIONS CÔTÉ JOUEUSE — Gestion multi-jours
// ===================================================

/**
 * Récupérer les douleurs actives d'une joueuse spécifique
 */
async function getActivePainsForPlayer(playerId) {
  try {
    const snapshot = await painsCollection
      .where('playerId', '==', playerId)
      .where('status', '==', 'active')
      .get();

    const today = new Date();
    const activePains = [];

    for (const doc of snapshot.docs) {
      const pain = { id: doc.id, ...doc.data() };
      const referenceDate = pain.lastConfirmedDate || pain.painDate;
      const painDate = referenceDate?.toDate?.() || (referenceDate ? new Date(referenceDate) : null);

      if (painDate) {
        const daysSinceLastUpdate = Math.floor((today - painDate) / (1000 * 60 * 60 * 24));

        if (daysSinceLastUpdate >= 7) {
          await painsCollection.doc(doc.id).update({
            status: 'recovered',
            recoveryDate: firebase.firestore.Timestamp.fromDate(new Date()),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            autoRecovered: true,
            autoRecoveredReason: 'no_update_7_days'
          });
          continue;
        }
      }

      activePains.push(pain);
    }

    return activePains;
  } catch (error) {
    console.error('Erreur getActivePainsForPlayer:', error);
    return [];
  }
}

/**
 * Confirmer qu'une douleur continue (depuis le check-in joueuse)
 */
async function confirmPainContinues(painId, newIntensity) {
  const today = new Date().toISOString().split('T')[0];
  try {
    await painsCollection.doc(painId).update({
      lastConfirmedDate: today,
      intensity: newIntensity || null,
      confirmationHistory: firebase.firestore.FieldValue.arrayUnion({
        date: today,
        intensity: newIntensity || null
      }),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Erreur confirmPainContinues:', error);
  }
}

/**
 * Marquer une douleur comme terminée (depuis le check-in joueuse)
 */
async function markPainResolvedFromCheckin(painId) {
  try {
    await painsCollection.doc(painId).update({
      status: 'recovered',
      recoveryDate: firebase.firestore.Timestamp.fromDate(new Date()),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.error('Erreur markPainResolvedFromCheckin:', error);
  }
}

// ===================================================
// CONTACTS STAFF MÉDICAL
// ===================================================

/**
 * Charger les paramètres médicaux (numéros WhatsApp kiné et groupe)
 */
async function loadMedicalSettings() {
  try {
    const doc = await db.collection('teamSettings').doc('pole').get();
    if (doc.exists) {
      window.medicalSettings = doc.data();
    }
  } catch (error) {
    console.warn('Paramètres médicaux non configurés:', error.message);
    window.medicalSettings = {};
  }
  displayMedicalContactsStatus();
}

/**
 * Afficher le statut des contacts médicaux configurés
 */
function displayMedicalContactsStatus() {
  const displayEl = document.getElementById('medicalContactsDisplay');
  if (!displayEl) return;
  const s = window.medicalSettings || {};
  if (!s.kinePhone && !s.medicalGroupPhone) {
    displayEl.textContent = '⚠️ Aucun contact configuré — cliquez sur "Configurer" pour ajouter les numéros WhatsApp';
  } else {
    let parts = [];
    if (s.kinePhone) parts.push(`📱 Kiné : ${s.kineName || ''} (+${s.kinePhone})`);
    if (s.medicalGroupPhone) parts.push(`👥 Groupe : ${s.medicalGroupName || ''} (+${s.medicalGroupPhone})`);
    displayEl.textContent = parts.join(' · ');
  }
}

/**
 * Afficher/masquer le formulaire de configuration des contacts
 */
function toggleMedicalContactsForm() {
  const form = document.getElementById('medicalContactsForm');
  if (!form) return;
  const isVisible = form.style.display !== 'none';
  form.style.display = isVisible ? 'none' : 'block';

  // Pré-remplir avec les valeurs existantes
  if (!isVisible) {
    const s = window.medicalSettings || {};
    const kineNameEl = document.getElementById('kineNameInput');
    const kinePhoneEl = document.getElementById('kinePhoneInput');
    const groupNameEl = document.getElementById('medicalGroupNameInput');
    const groupPhoneEl = document.getElementById('medicalGroupPhoneInput');
    if (kineNameEl) kineNameEl.value = s.kineName || '';
    if (kinePhoneEl) kinePhoneEl.value = s.kinePhone || '';
    if (groupNameEl) groupNameEl.value = s.medicalGroupName || '';
    if (groupPhoneEl) groupPhoneEl.value = s.medicalGroupPhone || '';
  }
}

/**
 * Sauvegarder les contacts médicaux (depuis les paramètres coach)
 */
async function saveMedicalContacts() {
  const kinePhone = (document.getElementById('kinePhoneInput')?.value || '').trim();
  const kineName = (document.getElementById('kineNameInput')?.value || '').trim();
  const groupPhone = (document.getElementById('medicalGroupPhoneInput')?.value || '').trim();
  const groupName = (document.getElementById('medicalGroupNameInput')?.value || '').trim();

  try {
    await db.collection('teamSettings').doc('pole').set({
      kinePhone, kineName,
      medicalGroupPhone: groupPhone,
      medicalGroupName: groupName,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    window.medicalSettings = { kinePhone, kineName, medicalGroupPhone: groupPhone, medicalGroupName: groupName };
    showNotification('Contacts médicaux enregistrés', 'success');
    displayPainsTable(); // Rafraîchir les boutons WhatsApp
  } catch (error) {
    console.error('Erreur saveMedicalContacts:', error);
    showNotification('Erreur lors de la sauvegarde', 'error');
  }
}

// ===================================================
// VUE HEBDOMADAIRE DES DOULEURS
// ===================================================

/**
 * Convertir un objet Date en "YYYY-MM-DD" en heure LOCALE (pas UTC).
 * Évite le décalage d'un jour quand on est en UTC+1/+2.
 */
function toLocalDateStr(date) {
  const d = (date instanceof Date) ? date : (date?.toDate?.() || new Date(date));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Calculer les bornes lundi/dimanche d'une semaine (offset par rapport à la semaine courante)
 */
function getWeekBounds(offset) {
  const today = new Date();
  const dow = today.getDay() || 7; // getDay(): 0=dim, 1=lun... → on veut Lun=1..Dim=7
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow + 1 + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

/**
 * Afficher la grille hebdomadaire des douleurs
 */
function displayWeeklyPainGrid() {
  const gridEl = document.getElementById('weeklyPainGrid');
  const labelEl = document.getElementById('weekViewLabel');
  if (!gridEl) return;

  const { monday, sunday } = getWeekBounds(weekOffset);
  const todayStr = toLocalDateStr(new Date());

  if (labelEl) {
    labelEl.textContent = `${monday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} — ${sunday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  }

  // Douleurs visibles cette semaine (comparaison en heure locale)
  const mondayStr = toLocalDateStr(monday);
  const sundayStr = toLocalDateStr(sunday);
  const weekPains = allPains.filter(pain => {
    const pdStr = toLocalDateStr(pain.painDate?.toDate?.() || new Date(pain.painDate));
    return (pdStr >= mondayStr && pdStr <= sundayStr) ||
           (pain.status === 'active' && pdStr < mondayStr);
  });

  if (weekPains.length === 0) {
    gridEl.innerHTML = '<p style="color:#9ca3af;font-style:italic;text-align:center;padding:16px;">Aucune douleur cette semaine</p>';
    return;
  }

  // Construire la grille : joueuses uniques × 7 jours
  const joueusesMap = {};
  weekPains.forEach(p => {
    if (!joueusesMap[p.playerId]) joueusesMap[p.playerId] = { name: p.playerName, pains: [] };
    joueusesMap[p.playerId].pains.push(p);
  });

  const joursFR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  let html = `<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">
    <thead><tr>
      <th style="padding:8px;text-align:left;border-bottom:2px solid #e5e7eb;">Joueuse</th>
      ${joursFR.map((j, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dStr = toLocalDateStr(d);
        const isToday = dStr === todayStr;
        return `<th style="padding:8px;text-align:center;border-bottom:2px solid #e5e7eb;${isToday ? 'background:#fef3c7;' : ''}">${j}<br><span style="font-size:10px;color:#9ca3af;">${d.getDate()}/${d.getMonth()+1}</span></th>`;
      }).join('')}
    </tr></thead>
    <tbody>`;

  Object.values(joueusesMap).forEach(({ name, pains }) => {
    html += `<tr><td style="padding:8px;font-weight:600;">${name}</td>`;
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      const dayStr = toLocalDateStr(dayDate); // ← heure locale, pas UTC
      const isToday = dayStr === todayStr;
      const isFuture = dayStr > todayStr; // Pas de pastille dans le futur

      // Douleur active ce jour ? (toutes les comparaisons en heure locale)
      const activePain = isFuture ? null : pains.find(p => {
        const pdStr = toLocalDateStr(p.painDate?.toDate?.() || new Date(p.painDate));
        if (pdStr > dayStr) return false; // pas encore déclarée ce jour
        if (p.status === 'recovered') {
          const rdStr = toLocalDateStr(p.recoveryDate?.toDate?.() || new Date(p.recoveryDate));
          return rdStr >= dayStr;
        }
        return true;
      });

      if (activePain) {
        const intensity = activePain.intensity;
        const color = !intensity ? '#f59e0b' : intensity >= 8 ? '#dc2626' : intensity >= 5 ? '#f59e0b' : '#10b981';
        const label = intensity ? `${intensity}` : '?';
        html += `<td style="padding:8px;text-align:center;${isToday ? 'background:#fef9ed;' : ''}">
          <span title="${getPainZoneLabel(activePain.bodyZone)}" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:${color};color:white;font-weight:700;font-size:12px;">${label}</span>
        </td>`;
      } else if (isFuture) {
        html += `<td style="padding:8px;text-align:center;background:#fafafa;"></td>`;
      } else {
        html += `<td style="padding:8px;text-align:center;${isToday ? 'background:#fef9ed;' : ''}">—</td>`;
      }
    }
    html += '</tr>';
  });

  html += '</tbody></table></div>';
  gridEl.innerHTML = html;
}

/**
 * Changer la semaine affichée (navigation ◀/▶)
 */
function changeWeekView(delta) {
  weekOffset += delta;
  displayWeeklyPainGrid();
}

/**
 * Afficher le graphique timeline des douleurs (4 dernières semaines)
 */
function displayPainTimeline() {
  const canvas = document.getElementById('painTimelineChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const data = [];
  const labels = [];
  for (let i = -3; i <= 0; i++) {
    const { monday, sunday } = getWeekBounds(i);
    const count = allPains.filter(p => {
      const pd = p.painDate?.toDate?.() || new Date(p.painDate);
      return pd >= monday && pd <= sunday;
    }).length;
    const label = `S${i + 4} (${monday.getDate()}/${monday.getMonth()+1})`;
    labels.push(label);
    data.push(count);
  }

  // Détruire le graphique précédent s'il existe
  if (window._painTimelineChart) {
    window._painTimelineChart.destroy();
  }

  window._painTimelineChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Douleurs déclarées',
        data,
        backgroundColor: '#f59e0b',
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f3f4f6' } }
      }
    }
  });
}

// Exposer les fonctions globales utiles
window.changeWeekView = changeWeekView;
window.saveMedicalContacts = saveMedicalContacts;
window.toggleMedicalContactsForm = toggleMedicalContactsForm;
window.getActivePainsForPlayer = getActivePainsForPlayer;
window.confirmPainContinues = confirmPainContinues;
window.markPainResolvedFromCheckin = markPainResolvedFromCheckin;
window.getPainZoneLabel = getPainZoneLabel; // Utilisée aussi par coach-alerts.js


