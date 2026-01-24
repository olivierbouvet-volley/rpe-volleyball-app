/**
 * RPE History & Delete - Historique des 8 dernières séances + Suppression
 * Pour l'onglet Log RPE
 */

// Variable pour stocker le dernier RPE sélectionné pour suppression
let selectedRpeToDelete = null;

/**
 * Charge l'historique des 8 dernières séances RPE
 */
async function loadRpeHistoryList() {
    const container = document.getElementById('rpeHistoryListContainer');
    if (!container) {
        console.log('RPE History: Container non trouvé');
        return;
    }
    
    if (!window.currentPlayer) {
        container.innerHTML = '<p style="color: #999; text-align: center;">Connectez-vous pour voir l\'historique</p>';
        return;
    }
    
    try {
        container.innerHTML = '<p style="color: #999; text-align: center;">Chargement...</p>';
        
        // Récupérer les 8 derniers RPE
        const rpeSnapshot = await db.collection('rpe')
            .where('playerId', '==', window.currentPlayer.id)
            .orderBy('timestamp', 'desc')
            .limit(8)
            .get();
        
        if (rpeSnapshot.empty) {
            container.innerHTML = '<p style="color: #999; text-align: center;">Aucun RPE enregistré</p>';
            return;
        }
        
        // Construire la liste
        let html = '';
        let index = 0;
        rpeSnapshot.forEach((doc) => {
            const data = doc.data();
            const date = new Date(data.date);
            const dateStr = date.toLocaleDateString('fr-FR', { 
                weekday: 'short', 
                day: 'numeric', 
                month: 'short' 
            });
            
            const rpeVal = data.rpe || data.rpeValue || 5;
            const load = Math.round(rpeVal * data.duration / 10 * 10) / 10;
            const isFirst = index === 0;
            
            html += `
                <div class="rpe-history-item" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    background: ${isFirst ? '#f0f9ff' : '#fff'};
                    border: 1px solid ${isFirst ? '#667eea' : '#e5e7eb'};
                    border-radius: 8px;
                    margin-bottom: 8px;
                    ${isFirst ? 'box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);' : ''}
                ">
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">
                            ${dateStr} - ${data.sessionType}
                        </div>
                        <div style="font-size: 13px; color: #6b7280;">
                            RPE: ${rpeVal}/10 • Durée: ${data.duration}min • Charge: ${load} UA
                        </div>
                        ${data.comment ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px; font-style: italic;">"${data.comment}"</div>` : ''}
                    </div>
                    ${isFirst ? `
                        <button onclick="prepareDeleteLastRpe('${doc.id}')" style="
                            background: #fee2e2;
                            color: #dc2626;
                            border: 1px solid #fecaca;
                            padding: 6px 12px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-size: 13px;
                            font-weight: 500;
                            margin-left: 12px;
                            transition: all 0.2s;
                        " onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                            🗑️ Supprimer
                        </button>
                    ` : ''}
                </div>
            `;
            index++;
        });
        
        container.innerHTML = html;
        console.log('RPE History: Liste chargée -', rpeSnapshot.size, 'entrées');
        
    } catch (error) {
        console.error('RPE History: Erreur chargement:', error);
        container.innerHTML = '<p style="color: #ef4444; text-align: center;">Erreur de chargement</p>';
    }
}

/**
 * Prépare la suppression du dernier RPE
 */
async function prepareDeleteLastRpe(rpeId) {
    console.log('RPE Delete: Préparation suppression pour ID:', rpeId);
    
    const confirmZone = document.getElementById('rpeDeleteConfirmZone');
    if (!confirmZone) {
        console.error('RPE Delete: Zone de confirmation non trouvée!');
        alert('❌ Erreur: Zone de confirmation non trouvée');
        return;
    }
    
    try {
        // Récupérer les détails du RPE
        const rpeDoc = await db.collection('rpe').doc(rpeId).get();
        if (!rpeDoc.exists) {
            alert('❌ RPE non trouvé');
            return;
        }
        
        const data = rpeDoc.data();
        console.log('RPE Delete: Données récupérées:', data);
        
        const date = new Date(data.date);
        const dateStr = date.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        });
        
        selectedRpeToDelete = {
            id: rpeId,
            data: data
        };
        
        const rpeVal = data.rpe || data.rpeValue || 5;
        
        // Afficher la zone de confirmation
        confirmZone.innerHTML = `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-top: 16px;">
                <p style="margin: 0 0 12px 0; font-weight: 600; color: #92400e;">⚠️ Confirmer la suppression ?</p>
                <p style="margin: 0 0 8px 0; color: #78350f;">
                    <strong>${dateStr}</strong><br>
                    ${data.sessionType} - RPE: ${rpeVal}/10 - ${data.duration}min
                </p>
                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    <button onclick="confirmDeleteLastRpe()" style="
                        background: #dc2626;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                    ">✓ Confirmer la suppression</button>
                    <button onclick="cancelDeleteLastRpe()" style="
                        background: #6b7280;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 500;
                    ">✗ Annuler</button>
                </div>
            </div>
        `;
        confirmZone.style.display = 'block';
        console.log('RPE Delete: Zone de confirmation affichée');
        
    } catch (error) {
        console.error('RPE History: Erreur préparation suppression:', error);
        alert('❌ Erreur lors de la préparation de la suppression');
    }
}

/**
 * Confirme et exécute la suppression
 */
async function confirmDeleteLastRpe() {
    if (!selectedRpeToDelete) {
        alert('❌ Aucun RPE sélectionné');
        return;
    }
    
    try {
        await db.collection('rpe').doc(selectedRpeToDelete.id).delete();
        
        console.log('RPE History: RPE supprimé -', selectedRpeToDelete.id);
        
        // Masquer la zone de confirmation
        cancelDeleteLastRpe();
        
        // Rafraîchir la liste
        await loadRpeHistoryList();
        
        // Rafraîchir les graphiques si la fonction existe
        if (typeof refreshPlayerDashboardCharts === 'function') {
            refreshPlayerDashboardCharts();
        }
        
        // Rafraîchir les stats de volume si disponible
        if (typeof loadVolumeStats === 'function') {
            loadVolumeStats();
        }
        
        alert('✅ RPE supprimé avec succès');
        
    } catch (error) {
        console.error('RPE History: Erreur suppression:', error);
        alert('❌ Erreur lors de la suppression');
    }
}

/**
 * Annule la suppression
 */
function cancelDeleteLastRpe() {
    const confirmZone = document.getElementById('rpeDeleteConfirmZone');
    if (confirmZone) {
        confirmZone.innerHTML = '';
        confirmZone.style.display = 'none';
    }
    selectedRpeToDelete = null;
}

/**
 * Initialise le module historique RPE
 */
function initRpeHistory() {
    console.log('RPE History: Initialisation...');
    
    // Charger l'historique si on est sur l'onglet Log RPE
    const logrpeTab = document.getElementById('logrpeTab');
    if (logrpeTab && logrpeTab.classList.contains('active')) {
        loadRpeHistoryList();
    }
}

// Observer les changements d'onglet
document.addEventListener('DOMContentLoaded', function() {
    const logrpeTab = document.getElementById('logrpeTab');
    if (logrpeTab) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (logrpeTab.classList.contains('active') && window.currentPlayer) {
                        setTimeout(loadRpeHistoryList, 100);
                    }
                }
            });
        });
        
        observer.observe(logrpeTab, { attributes: true });
    }
});

// Exporter pour utilisation globale
window.loadRpeHistoryList = loadRpeHistoryList;
window.prepareDeleteLastRpe = prepareDeleteLastRpe;
window.confirmDeleteLastRpe = confirmDeleteLastRpe;
window.cancelDeleteLastRpe = cancelDeleteLastRpe;

console.log('Module RPE History & Delete chargé');
