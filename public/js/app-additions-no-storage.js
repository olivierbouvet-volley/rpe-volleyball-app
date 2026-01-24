// === FONCTIONS ADDITIONNELLES POUR RPE GEN2 (SANS STORAGE) ===

// Variable globale pour stocker l'ID de la joueuse sélectionnée
let selectedPlayerId = null;

// REMPLACER la fonction displayTeamGrid existante
window.displayTeamGrid = function(players) {
    const grid = document.getElementById('teamGrid');
    grid.innerHTML = '';
    
    const filteredPlayers = appState.currentFilter === 'all' 
        ? players 
        : players.filter(p => p.status === appState.currentFilter);
    
    filteredPlayers.forEach(player => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.style.cursor = 'pointer';
        card.onclick = () => openPlayerDetail(player.id);
        
        card.innerHTML = `
            <img src="${player.photoURL || '/img/default-avatar.png'}" 
                 alt="${player.name}" 
                 class="player-avatar player-avatar-large"
                 onerror="this.src='/img/default-avatar.png'"
                 style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
            <div class="player-card-info">
                <div class="player-card-name">${player.name}</div>
                <div class="player-card-status">Score: ${player.score}/10</div>
                <div class="status-gauge" style="margin-top: var(--space-8);">
                    <div class="status-gauge-fill ${player.status}" style="width: ${player.score * 10}%"></div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    
    if (filteredPlayers.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-48);">Aucune joueuse dans cette catégorie</p>';
    }
}

// Ouvrir le modal de détails d'une joueuse
async function openPlayerDetail(playerId) {
    selectedPlayerId = playerId;
    
    try {
        // Charger les données de la joueuse
        const playerDoc = await db.collection('players').doc(playerId).get();
        
        if (!playerDoc.exists) {
            alert('Joueuse non trouvée');
            return;
        }
        
        const playerData = playerDoc.data();
        
        // Remplir les informations de base
        document.getElementById('playerDetailName').textContent = playerData.name;
        document.getElementById('playerDetailFullName').textContent = playerData.name;
        document.getElementById('playerDetailId').textContent = playerId;
        document.getElementById('playerDetailBirthday').textContent = playerData.birthday || '--';
        document.getElementById('playerDetailPhoto').src = playerData.photoURL || '/img/default-avatar.png';
        
        // Charger le statut actuel
        const status = await getPlayerStatus(playerId);
        document.getElementById('playerDetailScore').textContent = `${status.score}/10`;
        document.getElementById('playerDetailStatus').textContent = getStatusLabel(status.status);
        document.getElementById('playerDetailGauge').className = `status-gauge-fill ${status.status}`;
        document.getElementById('playerDetailGauge').style.width = `${status.score * 10}%`;
        
        // Charger les données détaillées
        await loadPlayerDetailData(playerId);
        
        // Afficher le modal
        document.getElementById('playerDetailModal').classList.add('active');
        
    } catch (error) {
        console.error('Erreur lors du chargement des détails:', error);
        alert('Erreur lors du chargement des détails de la joueuse.');
    }
}

// Fermer le modal de détails
function closePlayerDetailModal() {
    document.getElementById('playerDetailModal').classList.remove('active');
    selectedPlayerId = null;
}

// Obtenir le label du statut
function getStatusLabel(status) {
    switch (status) {
        case 'optimal':
            return '✅ Optimal';
        case 'attention':
            return '⚠️ Attention';
        case 'critical':
            return '🚨 Critique';
        default:
            return '-- Pas de données';
    }
}

// Charger les données détaillées d'une joueuse
async function loadPlayerDetailData(playerId) {
    try {
        // Charger les check-ins des 7 derniers jours
        const checkins = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .orderBy('date', 'desc')
            .limit(7)
            .get();
        
        let sleepTotal = 0, sorenessTotal = 0, stressTotal = 0, moodTotal = 0;
        let count = 0;
        
        checkins.forEach(doc => {
            const data = doc.data();
            sleepTotal += data.sleep;
            sorenessTotal += data.soreness;
            stressTotal += data.stress;
            moodTotal += data.mood;
            count++;
        });
        
        if (count > 0) {
            document.getElementById('detailSleep').textContent = (sleepTotal / count).toFixed(1);
            document.getElementById('detailSoreness').textContent = (sorenessTotal / count).toFixed(1);
            document.getElementById('detailStress').textContent = (stressTotal / count).toFixed(1);
            document.getElementById('detailMood').textContent = (moodTotal / count).toFixed(1);
        } else {
            document.getElementById('detailSleep').textContent = '--';
            document.getElementById('detailSoreness').textContent = '--';
            document.getElementById('detailStress').textContent = '--';
            document.getElementById('detailMood').textContent = '--';
        }
        
        // Charger les données ATL/CTL
        await loadATLCTLData(playerId);
        
        // Charger les alertes
        await loadPlayerAlerts(playerId);
        
        // Charger l'historique
        await loadPlayerHistory(playerId);
        
    } catch (error) {
        console.error('Erreur lors du chargement des données détaillées:', error);
    }
}

// Charger les données ATL/CTL
async function loadATLCTLData(playerId) {
    try {
        // Charger les RPE des 28 derniers jours
        const rpeData = await db.collection('rpe')
            .where('playerId', '==', playerId)
            .orderBy('date', 'desc')
            .limit(28)
            .get();
        
        let atl = 0, ctl = 0;
        let atlCount = 0, ctlCount = 0;
        
        rpeData.forEach((doc, index) => {
            const data = doc.data();
            const load = data.rpe * data.duration;
            
            // ATL = moyenne sur 7 jours
            if (index < 7) {
                atl += load;
                atlCount++;
            }
            
            // CTL = moyenne sur 28 jours
            ctl += load;
            ctlCount++;
        });
        
        atl = atlCount > 0 ? (atl / atlCount).toFixed(0) : 0;
        ctl = ctlCount > 0 ? (ctl / ctlCount).toFixed(0) : 0;
        const tsb = ctl - atl;
        
        document.getElementById('atlValue').textContent = atl;
        document.getElementById('ctlValue').textContent = ctl;
        document.getElementById('tsbValue').textContent = tsb;
        
        // Interprétation du TSB
        let tsbInterpretation = '';
        let tsbClass = '';
        
        if (tsb > 10) {
            tsbInterpretation = '✅ Bien reposée, prête pour un entraînement intense';
            tsbClass = 'optimal';
        } else if (tsb >= -10 && tsb <= 10) {
            tsbInterpretation = '⚠️ Équilibre correct, charge d\'entraînement adaptée';
            tsbClass = 'attention';
        } else {
            tsbInterpretation = '🚨 Fatigue accumulée, risque de surmenage. Repos recommandé.';
            tsbClass = 'critical';
        }
        
        document.getElementById('tsbInterpretation').innerHTML = `
            <div class="status-gauge">
                <div class="status-gauge-fill ${tsbClass}" style="width: ${Math.min(100, Math.max(0, (tsb + 50)))}%"></div>
            </div>
            <p style="margin-top: var(--space-12); color: var(--color-text-secondary);">${tsbInterpretation}</p>
        `;
        
    } catch (error) {
        console.error('Erreur lors du chargement ATL/CTL:', error);
        document.getElementById('atlValue').textContent = '--';
        document.getElementById('ctlValue').textContent = '--';
        document.getElementById('tsbValue').textContent = '--';
    }
}

// Charger les alertes d'une joueuse
async function loadPlayerAlerts(playerId) {
    try {
        const alerts = [];
        
        // Vérifier le dernier check-in
        const lastCheckin = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .orderBy('date', 'desc')
            .limit(1)
            .get();
        
        if (lastCheckin.empty) {
            alerts.push({
                type: 'warning',
                message: 'Aucun check-in enregistré récemment'
            });
        } else {
            const lastData = lastCheckin.docs[0].data();
            const lastDate = new Date(lastData.date);
            const today = new Date();
            const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 2) {
                alerts.push({
                    type: 'warning',
                    message: `Dernier check-in il y a ${daysDiff} jours`
                });
            }
            
            // Vérifier les valeurs critiques
            if (lastData.sleep < 5) {
                alerts.push({
                    type: 'critical',
                    message: `Sommeil insuffisant: ${lastData.sleep}/10`
                });
            }
            
            if (lastData.soreness > 7) {
                alerts.push({
                    type: 'critical',
                    message: `Courbatures élevées: ${lastData.soreness}/10`
                });
            }
            
            if (lastData.stress > 7) {
                alerts.push({
                    type: 'warning',
                    message: `Stress élevé: ${lastData.stress}/10`
                });
            }
            
            if (lastData.mood < 5) {
                alerts.push({
                    type: 'warning',
                    message: `Humeur basse: ${lastData.mood}/10`
                });
            }
        }
        
        // Afficher les alertes
        const alertsList = document.getElementById('alertsList');
        if (alerts.length === 0) {
            alertsList.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-24);">✅ Aucune alerte</p>';
        } else {
            alertsList.innerHTML = alerts.map(alert => `
                <div class="card" style="border-left: 4px solid ${alert.type === 'critical' ? 'var(--color-critical)' : 'var(--color-attention)'}; margin-bottom: var(--space-12);">
                    <p style="margin: 0; color: var(--color-text-primary);">
                        ${alert.type === 'critical' ? '🚨' : '⚠️'} ${alert.message}
                    </p>
                </div>
            `).join('');
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement des alertes:', error);
    }
}

// Charger l'historique d'une joueuse
async function loadPlayerHistory(playerId) {
    try {
        const checkins = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .orderBy('date', 'desc')
            .limit(14)
            .get();
        
        const historyList = document.getElementById('historyList');
        
        if (checkins.empty) {
            historyList.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-24);">Aucun historique disponible</p>';
        } else {
            historyList.innerHTML = '';
            
            checkins.forEach(doc => {
                const data = doc.data();
                const score = (data.sleep + data.mood + (10 - data.soreness) + (10 - data.stress)) / 4;
                const status = score >= 7 ? 'optimal' : score >= 5 ? 'attention' : 'critical';
                
                const item = document.createElement('div');
                item.className = 'card';
                item.style.marginBottom = 'var(--space-12)';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${new Date(data.date).toLocaleDateString('fr-FR')}</strong>
                            <p style="margin: var(--space-8) 0 0 0; font-size: 14px; color: var(--color-text-secondary);">
                                Sommeil: ${data.sleep}/10 | Courbatures: ${data.soreness}/10 | 
                                Stress: ${data.stress}/10 | Humeur: ${data.mood}/10
                            </p>
                        </div>
                        <div>
                            <div class="status-badge ${status}">${score.toFixed(1)}/10</div>
                        </div>
                    </div>
                `;
                historyList.appendChild(item);
            });
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
    }
}

// Changer l'onglet dans le modal de détails
function switchPlayerTab(tabName) {
    // Mettre à jour les onglets
    document.querySelectorAll('#playerDetailModal .nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`#playerDetailModal [data-tab="${tabName}"]`).classList.add('active');
    
    // Mettre à jour le contenu
    document.querySelectorAll('#playerDetailModal .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Supprimer une joueuse
async function deletePlayer() {
    if (!selectedPlayerId) return;
    
    const confirmation = confirm(`Êtes-vous sûr de vouloir supprimer cette joueuse ?\n\nCette action est irréversible et supprimera également toutes ses données (check-ins, RPE, etc.).`);
    
    if (!confirmation) return;
    
    try {
        // Supprimer la joueuse
        await db.collection('players').doc(selectedPlayerId).delete();
        
        // Supprimer ses check-ins
        const checkins = await db.collection('checkins')
            .where('playerId', '==', selectedPlayerId)
            .get();
        
        const batch1 = db.batch();
        checkins.forEach(doc => {
            batch1.delete(doc.ref);
        });
        await batch1.commit();
        
        // Supprimer ses RPE
        const rpeData = await db.collection('rpe')
            .where('playerId', '==', selectedPlayerId)
            .get();
        
        const batch2 = db.batch();
        rpeData.forEach(doc => {
            batch2.delete(doc.ref);
        });
        await batch2.commit();
        
        alert('Joueuse supprimée avec succès !');
        closePlayerDetailModal();
        await loadCoachDashboard();
        
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression. Veuillez réessayer.');
    }
}

// REMPLACER la fonction saveNewPlayer pour ne PAS utiliser Storage
window.saveNewPlayer = async function() {
    const fullName = document.getElementById('playerFullName').value.trim();
    const playerId = document.getElementById('playerId').value.trim();
    const birthdayInput = document.getElementById('playerBirthday').value.trim();
    const laterality = document.getElementById('playerLaterality').value.trim();
    const position = document.getElementById('playerPosition').value.trim();
    
    if (!fullName || !playerId || !birthdayInput || !laterality || !position) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    // Convertir la date vers le format JJ/MM/AA
    let birthday;
    if (birthdayInput.includes('-')) {
        // Format YYYY-MM-DD (du sélecteur de date)
        const [year, month, day] = birthdayInput.split('-');
        birthday = `${day}/${month}/${year.slice(2)}`;
    } else if (birthdayInput.includes('/')) {
        // Déjà au format JJ/MM/AA
        birthday = birthdayInput;
    } else {
        alert('Format de date invalide');
        return;
    }
    
    try {
        // Sauvegarder la joueuse dans Firestore SANS photo
        await db.collection('players').doc(playerId).set({
            name: fullName,
            birthday: birthday,
            handedness: laterality,
            position: position,
            photoURL: null,  // Pas de photo
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Joueuse ajoutée avec succès !');
        closeAddPlayerModal();
        await loadCoachDashboard();
        
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la joueuse:', error);
        alert('Erreur lors de l\'ajout. Veuillez réessayer.');
    }
}

// Masquer le bouton de changement de photo dans le modal
document.addEventListener('DOMContentLoaded', () => {
    // Masquer le bouton de photo dans le modal de détails
    const photoButton = document.querySelector('#playerDetailModal button[onclick*="changePhotoInput"]');
    if (photoButton) {
        photoButton.style.display = 'none';
    }
    
    // Masquer l'upload de photo dans le modal d'ajout
    const photoUploadContainer = document.querySelector('.image-upload-container');
    if (photoUploadContainer) {
        photoUploadContainer.style.display = 'none';
    }
});

// Ajouter les styles CSS manquants
const additionalStyles = `
<style>
.status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-weight: bold;
    font-size: 14px;
}

.status-badge.optimal {
    background-color: var(--color-optimal);
    color: white;
}

.status-badge.attention {
    background-color: var(--color-attention);
    color: white;
}

.status-badge.critical {
    background-color: var(--color-critical);
    color: white;
}

.btn-danger {
    background-color: var(--color-critical);
    color: white;
    border: none;
}

.btn-danger:hover {
    background-color: #c0392b;
}
</style>
`;

// Injecter les styles
document.head.insertAdjacentHTML('beforeend', additionalStyles);

console.log('Fonctions additionnelles chargées (SANS Storage)');

