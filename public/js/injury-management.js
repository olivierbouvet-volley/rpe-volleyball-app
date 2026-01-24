// Module de gestion des blessures et douleurs

// Référence aux collections Firestore
const injuriesCollection = db.collection('injuries');
const painsCollection = db.collection('pains'); // Nouvelle collection pour les douleurs

// Variables globales
let allInjuries = [];
let allPains = []; // Nouvelle variable pour les douleurs
let currentFilter = 'active'; // 'active', 'all'

/**
 * Initialiser le module de suivi des blessures et douleurs
 */
async function initInjuryTracking() {
  console.log('Initialisation du module de suivi des blessures et douleurs...');
  
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
  
  // Configurer les event listeners
  setupInjuryEventListeners();
}

/**
 * Charger toutes les blessures de l'équipe
 */
async function loadInjuries() {
  try {
    const teamCode = appState.currentUser;
    const snapshot = await injuriesCollection
      .where('teamCode', '==', teamCode)
      .orderBy('injuryDate', 'desc')
      .get();
    
    allInjuries = [];
    snapshot.forEach(doc => {
      allInjuries.push({
        id: doc.id,
        ...doc.data()
      });
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
        <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
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
    listEl.innerHTML = '<p style="color: #666; font-style: italic;">Aucune blessure active</p>';
    return;
  }
  
  let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
  activeInjuries.forEach(injury => {
    const daysOut = calculateDaysOut(injury.injuryDate, null);
    const statusInfo = getStatusInfo(injury.status);
    
    html += `
      <li style="padding: 10px 0; border-bottom: 1px solid #eee;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>${injury.playerName}</strong><br>
            <span style="font-size: 13px; color: #666;">${getInjuryTypeLabel(injury.injuryType)} - ${daysOut} jours</span>
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
    distributionEl.innerHTML = '<p style="color: #666; font-style: italic;">Aucune donnée disponible</p>';
    return;
  }
  
  let html = '<ul style="list-style: none; padding: 0; margin: 0;">';
  sortedTypes.forEach(([type, count]) => {
    const percentage = Math.round((count / allInjuries.length) * 100);
    html += `
      <li style="padding: 8px 0; display: flex; justify-content: space-between; align-items: center;">
        <span>${type}</span>
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 100px; height: 8px; background: #eee; border-radius: 4px; overflow: hidden;">
            <div style="width: ${percentage}%; height: 100%; background: #E63946;"></div>
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
  
  // Afficher le modal
  modal.style.display = 'flex';
}

/**
 * Fermer le modal de déclaration de blessure
 */
function closeNewInjuryModal() {
  const modal = document.getElementById('newInjuryModal');
  if (modal) {
    modal.style.display = 'none';
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
      <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.3);">
        <h3 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">Modifier le statut de la blessure de ${injury.playerName}</h3>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 8px; color: #374151; font-weight: 600;">Statut actuel:</label>
          <div style="padding: 10px; background: #f3f4f6; border-radius: 6px; color: #1f2937;">
            ${getStatusInfo(injury.status).label}
          </div>
        </div>
        
        <div style="margin-bottom: 25px;">
          <label for="newStatusSelect" style="display: block; margin-bottom: 8px; color: #374151; font-weight: 600;">Nouveau statut:</label>
          <select id="newStatusSelect" style="width: 100%; padding: 12px; border: 2px solid #d1d5db; border-radius: 8px; font-size: 15px; color: #1f2937; background: white; cursor: pointer;">
            <option value="active" ${injury.status === 'active' ? 'selected' : ''}>Blessée</option>
            <option value="rehabilitation" ${injury.status === 'rehabilitation' ? 'selected' : ''}>En réathlétisation</option>
            <option value="progressive_return" ${injury.status === 'progressive_return' ? 'selected' : ''}>Retour progressif</option>
            <option value="recovered" ${injury.status === 'recovered' ? 'selected' : ''}>Rétablie</option>
          </select>
        </div>
        
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
          <button id="cancelStatusBtn" style="padding: 10px 20px; background: #e5e7eb; color: #374151; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">Annuler</button>
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
 */
async function loadPains() {
  try {
    const snapshot = await painsCollection.orderBy('painDate', 'desc').get();
    allPains = [];
    
    snapshot.forEach(doc => {
      allPains.push({
        id: doc.id,
        ...doc.data()
      });
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
  let filteredPains = allPains.filter(pain => pain.status === 'active');
  
  if (filteredPains.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: #666;">
          Aucune douleur signalée
        </td>
      </tr>
    `;
    return;
  }
  
  let html = '';
  filteredPains.forEach(pain => {
    const daysOut = calculateDaysOut(pain.painDate, pain.recoveryDate);
    
    html += `
      <tr>
        <td style="font-weight: 600;">${pain.playerName}</td>
        <td>${formatDateFR(pain.painDate)}</td>
        <td>${getBodyZoneLabel(pain.bodyZone)}</td>
        <td>${pain.description || '-'}</td>
        <td style="font-weight: 600;">${daysOut} jours</td>
        <td>
          <button onclick="markPainAsRecovered('${pain.id}')" class="btn-recover-injury" title="Marquer comme rétablie">
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
 * Déclarer une nouvelle douleur
 */
async function declarePain() {
  const playerSelect = document.getElementById('painPlayerSelect');
  const bodyZoneSelect = document.getElementById('painBodyZone');
  const descriptionInput = document.getElementById('painDescription');
  
  const playerName = playerSelect.value;
  const playerId = playerSelect.options[playerSelect.selectedIndex].dataset.playerId;
  const bodyZone = bodyZoneSelect.value;
  const description = descriptionInput.value.trim();
  
  if (!playerName || !bodyZone) {
    alert('Veuillez remplir tous les champs obligatoires');
    return;
  }
  
  try {
    await painsCollection.add({
      playerName,
      playerId,
      bodyZone,
      description,
      painDate: firebase.firestore.Timestamp.fromDate(new Date()),
      status: 'active', // active ou recovered
      recoveryDate: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    showNotification('Douleur déclarée avec succès', 'success');
    
    // Réinitialiser le formulaire
    document.getElementById('declarePainForm').reset();
    
    // Recharger les données
    await loadPains();
    displayPainsTable();
    displayPainStatistics();
    
  } catch (error) {
    console.error('Erreur lors de la déclaration:', error);
    showNotification('Erreur lors de la déclaration de la douleur', 'error');
  }
}

/**
 * Marquer une douleur comme rétablie
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
    
    // Recharger les données
    await loadPains();
    displayPainsTable();
    displayPainStatistics();
    
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    showNotification('Erreur lors de la mise à jour', 'error');
  }
}


