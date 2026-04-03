// ============================================================================
// RPE MANAGEMENT SIMPLE - 8 dernières séances + supprimer dernier
// ============================================================================

// ============================================================================
// AFFICHER/MASQUER LES SOUS-ONGLETS RPE
// ============================================================================

function showRpeSubTab(subTab) {
    // Masquer tous les sous-onglets
    document.getElementById('rpeTodayCard').style.display = 'none';
    document.getElementById('rpeYesterdayCard').style.display = 'none';
    document.getElementById('rpeDayBeforeCard').style.display = 'none';
    document.getElementById('rpeDeleteCard').style.display = 'none';
    
    // Désactiver les boutons
    if (document.getElementById('rpeTodayBtn')) document.getElementById('rpeTodayBtn').style.background = '';
    if (document.getElementById('rpeYesterdayBtn')) document.getElementById('rpeYesterdayBtn').style.background = '';
    if (document.getElementById('rpeDayBeforeBtn')) document.getElementById('rpeDayBeforeBtn').style.background = '';
    if (document.getElementById('rpeDeleteBtn')) document.getElementById('rpeDeleteBtn').style.background = '';
    
    // Afficher le sous-onglet sélectionné
    if (subTab === 'today') {
        document.getElementById('rpeTodayCard').style.display = 'block';
        if (document.getElementById('rpeTodayBtn')) document.getElementById('rpeTodayBtn').style.background = 'var(--color-primary)';
    } else if (subTab === 'yesterday') {
        document.getElementById('rpeYesterdayCard').style.display = 'block';
        if (document.getElementById('rpeYesterdayBtn')) document.getElementById('rpeYesterdayBtn').style.background = 'var(--color-primary)';
    } else if (subTab === 'daybefore') {
        document.getElementById('rpeDayBeforeCard').style.display = 'block';
        if (document.getElementById('rpeDayBeforeBtn')) document.getElementById('rpeDayBeforeBtn').style.background = 'var(--color-primary)';
    } else if (subTab === 'history') {
        document.getElementById('rpeDeleteCard').style.display = 'block';
        if (document.getElementById('rpeDeleteBtn')) document.getElementById('rpeDeleteBtn').style.background = 'var(--color-primary)';
        loadRpeHistory();
    }
}

// ============================================================================
// CHARGER LES 8 DERNIERS RPE
// ============================================================================

async function loadRpeHistory() {
    try {
        const userId = appState.currentUser;
        if (!userId) return;
        
        const doc = await db.collection('players').doc(userId).get();
        if (!doc.exists) return;
        
        const playerData = doc.data();
        const rpeList = playerData.rpe || [];
        
        const historyContainer = document.getElementById('rpeHistoryList');
        
        if (rpeList.length === 0) {
            historyContainer.innerHTML = '<p style="color: var(--color-text-secondary); text-align: center;">Aucun RPE enregistré</p>';
            return;
        }
        
        // Trier par date décroissante et prendre les 8 derniers
        const sortedRpe = rpeList
            .sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB - dateA;
            })
            .slice(0, 8); // Les 8 derniers
        
        // Générer les éléments de la liste
        let html = '';
        sortedRpe.forEach((rpe, index) => {
            const date = new Date(rpe.date);
            const dateStr = date.toLocaleDateString('fr-FR', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
            });
            
            const hours = Math.floor(rpe.duration / 60);
            const minutes = rpe.duration % 60;
            const durationStr = hours > 0 ? `${hours}h${minutes}min` : `${minutes}min`;
            
            const sessionType = rpe.sessionType || 'Non spécifié';
            const rpeValue = rpe.rpe || '?';
            const comment = rpe.comment ? ` - ${rpe.comment}` : '';
            
            const isLastRpe = index === 0; // Le premier (le plus récent) est le dernier
            
            html += `
                <div style="padding: var(--space-12); margin-bottom: var(--space-8); background: var(--color-surface, white); border: 1px solid var(--color-border); border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: var(--space-8);">
                        <div style="flex: 1;">
                            <strong style="font-size: 14px; color: var(--color-primary);">${dateStr}</strong>
                            <p style="margin: var(--space-4) 0; font-size: 14px;">
                                <span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${sessionType}</span>
                                <span style="margin-left: 8px; color: var(--color-text-secondary);">${durationStr}</span>
                                <span style="margin-left: 8px; font-weight: bold; color: #e74c3c;">RPE ${rpeValue}/10</span>
                            </p>
                            ${comment ? `<p style="margin: 4px 0; font-size: 13px; color: var(--color-text-secondary);">💬 ${comment}</p>` : ''}
                        </div>
                        ${isLastRpe ? `<button type="button" class="btn btn-delete" onclick="deleteLastRpe()" style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
                            🗑️ Supprimer
                        </button>` : ''}
                    </div>
                </div>
            `;
        });
        
        historyContainer.innerHTML = html;
        
        console.log('RPE History: Historique chargé (' + rpeList.length + ' total, 8 affichés)');
        
    } catch (error) {
        console.error('RPE History: Erreur chargement historique:', error);
        document.getElementById('rpeHistoryList').innerHTML = '<p style="color: red; text-align: center;">Erreur lors du chargement</p>';
    }
}

// ============================================================================
// SUPPRIMER LE DERNIER RPE
// ============================================================================

async function deleteLastRpe() {
    if (!confirm('Êtes-vous sûr? Cette action ne peut pas être annulée.')) {
        return;
    }
    
    try {
        const userId = appState.currentUser;
        if (!userId) return;
        
        const doc = await db.collection('players').doc(userId).get();
        if (!doc.exists) return;
        
        const playerData = doc.data();
        const rpeList = playerData.rpe || [];
        
        if (rpeList.length === 0) {
            alert('Aucun RPE à supprimer');
            return;
        }
        
        // Trouver le dernier RPE (plus récent)
        let lastIndex = 0;
        let lastDate = new Date(rpeList[0].date);
        
        rpeList.forEach((rpe, index) => {
            const rpeDate = new Date(rpe.date);
            if (rpeDate > lastDate) {
                lastDate = rpeDate;
                lastIndex = index;
            }
        });
        
        // Supprimer le dernier RPE
        rpeList.splice(lastIndex, 1);
        
        // Mettre à jour Firestore
        await db.collection('players').doc(userId).update({
            rpe: rpeList
        });
        
        console.log('RPE Delete: Dernier RPE supprimé');
        
        // Montrer la confirmation
        alert('✅ Dernier RPE supprimé!');
        
        // Recharger l'historique
        loadRpeHistory();
        
        // Invalider le cache des graphiques
        if (typeof invalidateChartsCache === 'function') {
            invalidateChartsCache();
        }
        
    } catch (error) {
        console.error('RPE Delete: Erreur suppression:', error);
        alert('❌ Erreur lors de la suppression du RPE');
    }
}

console.log('Module RPE Simple Management chargé');
