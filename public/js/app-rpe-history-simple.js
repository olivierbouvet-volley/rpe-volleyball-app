// ============================================================================
// RPE HISTORY SIMPLE - Afficher 8 dernières séances + supprimer dernier
// ============================================================================

console.log('App RPE History Simple: Chargement...');

// Fonction pour afficher les sous-onglets RPE
function showRpeSubTab(tabName) {
    // Masquer tous les sous-onglets
    const cards = document.querySelectorAll('[id$="Card"]');
    cards.forEach(card => {
        if (card.id.startsWith('rpe')) {
            card.style.display = 'none';
        }
    });
    
    // Afficher le bon onglet
    if (tabName === 'today') {
        const el = document.getElementById('rpeTodayCard');
        if (el) el.style.display = 'block';
    } else if (tabName === 'yesterday') {
        const el = document.getElementById('rpeYesterdayCard');
        if (el) el.style.display = 'block';
    } else if (tabName === 'daybefore') {
        const el = document.getElementById('rpeDayBeforeCard');
        if (el) el.style.display = 'block';
    } else if (tabName === 'history') {
        const el = document.getElementById('rpeHistoryCard');
        if (el) {
            el.style.display = 'block';
            loadLast8Rpe();
        }
    }
    
    // Mettre à jour les boutons
    updateRpeButtons(tabName);
}

// Mettre à jour l'apparence des boutons
function updateRpeButtons(activeTab) {
    const buttons = document.querySelectorAll('[id$="Btn"]');
    buttons.forEach(btn => {
        if (btn.id.startsWith('rpe')) {
            btn.style.background = '';
            btn.style.color = '';
        }
    });
    
    if (activeTab === 'today' && document.getElementById('rpeTodayBtn')) {
        document.getElementById('rpeTodayBtn').style.background = 'var(--color-primary)';
        document.getElementById('rpeTodayBtn').style.color = 'white';
    } else if (activeTab === 'yesterday' && document.getElementById('rpeYesterdayBtn')) {
        document.getElementById('rpeYesterdayBtn').style.background = 'var(--color-primary)';
        document.getElementById('rpeYesterdayBtn').style.color = 'white';
    } else if (activeTab === 'daybefore' && document.getElementById('rpeDayBeforeBtn')) {
        document.getElementById('rpeDayBeforeBtn').style.background = 'var(--color-primary)';
        document.getElementById('rpeDayBeforeBtn').style.color = 'white';
    } else if (activeTab === 'history' && document.getElementById('rpeHistoryBtn')) {
        document.getElementById('rpeHistoryBtn').style.background = '#667eea';
        document.getElementById('rpeHistoryBtn').style.color = 'white';
    }
}

// Charger les 8 dernières séances RPE
async function loadLast8Rpe() {
    try {
        const userId = appState?.currentUser;
        if (!userId) {
            console.log('RPE History: Pas d\'utilisateur connecté');
            return;
        }
        
        const doc = await db.collection('players').doc(userId).get();
        if (!doc.exists) {
            console.log('RPE History: Joueur non trouvé');
            return;
        }
        
        const playerData = doc.data();
        const rpeList = playerData.rpe || [];
        
        const container = document.getElementById('rpeHistoryList');
        if (!container) {
            console.log('RPE History: Conteneur non trouvé');
            return;
        }
        
        if (rpeList.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Aucune séance enregistrée</p>';
            return;
        }
        
        // Trier par date décroissante (plus récents d'abord)
        const sorted = rpeList.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
        
        // Prendre les 8 derniers
        const last8 = sorted.slice(0, 8);
        
        let html = '';
        last8.forEach((rpe, idx) => {
            const date = new Date(rpe.date);
            const dateStr = date.toLocaleDateString('fr-FR', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: '2-digit'
            });
            
            const hours = Math.floor((rpe.duration || 0) / 60);
            const mins = (rpe.duration || 0) % 60;
            const durationStr = hours > 0 ? `${hours}h${mins}` : `${mins}min`;
            
            const isFirst = idx === 0;
            
            html += `
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: white;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <strong style="color: #667eea;">${dateStr}</strong>
                            <p style="margin: 8px 0 0 0; font-size: 14px;">
                                <span style="background: #667eea; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${rpe.sessionType || '?'}</span>
                                <span style="margin-left: 8px; color: #666;">${durationStr}</span>
                                <span style="margin-left: 8px; font-weight: bold; color: #e74c3c;">RPE ${rpe.rpe || '?'}/10</span>
                            </p>
                            ${rpe.comment ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #666; font-style: italic;">💬 ${rpe.comment}</p>` : ''}
                        </div>
                        ${isFirst ? `<button onclick="deleteLastRpeSimple()" style="background: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">🗑️ Supprimer</button>` : ''}
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        console.log('RPE History: ' + rpeList.length + ' séances chargées (8 affichées)');
        
    } catch (error) {
        console.error('RPE History: Erreur', error);
        const container = document.getElementById('rpeHistoryList');
        if (container) {
            container.innerHTML = '<p style="color: red; text-align: center;">Erreur de chargement</p>';
        }
    }
}

// Supprimer le dernier RPE
async function deleteLastRpeSimple() {
    if (!confirm('Supprimer le dernier RPE?')) return;
    
    try {
        const userId = appState?.currentUser;
        if (!userId) return;
        
        const doc = await db.collection('players').doc(userId).get();
        if (!doc.exists) return;
        
        const rpeList = doc.data().rpe || [];
        if (rpeList.length === 0) {
            alert('Aucun RPE à supprimer');
            return;
        }
        
        // Trouver l'index du RPE le plus récent
        let maxIdx = 0;
        let maxDate = new Date(rpeList[0].date);
        
        rpeList.forEach((rpe, idx) => {
            const rpeDate = new Date(rpe.date);
            if (rpeDate > maxDate) {
                maxDate = rpeDate;
                maxIdx = idx;
            }
        });
        
        // Supprimer
        rpeList.splice(maxIdx, 1);
        
        // Sauvegarder
        await db.collection('players').doc(userId).update({ rpe: rpeList });
        
        alert('✅ Séance supprimée!');
        loadLast8Rpe();
        
        // Invalider graphiques si la fonction existe
        if (typeof invalidateChartsCache === 'function') {
            invalidateChartsCache();
        }
        
        console.log('RPE History: Dernier RPE supprimé');
        
    } catch (error) {
        console.error('RPE History Delete:', error);
        alert('❌ Erreur lors de la suppression');
    }
}

console.log('App RPE History Simple: Chargé ✅');
