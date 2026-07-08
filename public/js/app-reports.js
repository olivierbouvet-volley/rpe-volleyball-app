// ========================================
// FONCTIONS RAPPORTS ET COMMENTAIRES
// ========================================

console.log('Module Rapports chargé');

// Fonction utilitaire pour calculer le score d'une joueuse
function calculatePlayerScore(checkin) {
    if (!checkin) return 0;
    return Math.round((checkin.sleep + (10 - checkin.soreness) + (10 - checkin.stress) + checkin.mood) / 4);
}

// Variables globales pour les graphiques
let teamEvolutionChart = null;
let loadDistributionChart = null;

// ========================================
// GESTION DES ONGLETS COACH
// ========================================

function switchCoachTab(tabName) {
    // Masquer tous les onglets
    document.querySelectorAll('.coach-tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Désactiver tous les boutons — on efface les inline styles pour laisser le CSS gérer
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.borderBottom = '';
        btn.style.borderLeft = '';
        btn.style.color = '';
        btn.style.background = '';
        btn.style.fontWeight = '';
    });

    // Gérer la visibilité du header et des onglets selon l'onglet actif
    const coachHeader = document.querySelector('#coachScreen .header');
    const tabsContainer = document.querySelector('#coachScreen .tabs');
    const dashboardContainer = document.querySelector('#coachScreen .coach-layout');

    if (tabName === 'teamPlanner') {
        if (coachHeader) coachHeader.style.display = 'none';
        if (tabsContainer) tabsContainer.style.display = 'none';
        if (dashboardContainer) dashboardContainer.style.padding = '0';
    } else {
        if (coachHeader) coachHeader.style.display = '';
        if (tabsContainer) tabsContainer.style.display = '';
        if (dashboardContainer) dashboardContainer.style.padding = '';
    }

    // Activer l'onglet sélectionné — classe active seulement, le CSS fait le reste
    const tabMap = {
        'team':        { tabId: 'teamTab',        callback: null },
        'weekend':     { tabId: 'weekendTab',      callback: () => typeof loadWeekendMatchRecap === 'function' && loadWeekendMatchRecap() },
        'injuries':    { tabId: 'injuriesTab',     callback: () => {
            if (typeof initInjuryTracking === 'function') initInjuryTracking();
            if (typeof initMedicalSettings === 'function') {
                initMedicalSettings().then(() => {
                    if (typeof kineCalInit === 'function') kineCalInit(window.medicalSettings?.kineDates || []);
                    if (typeof docCalInit === 'function') docCalInit(window.medicalSettings?.doctorDates || []);
                    if (typeof prefillContactsForm === 'function') prefillContactsForm();
                    if (typeof checkDoctorVisitAlert === 'function') checkDoctorVisitAlert();
                    if (typeof loadUpcomingDoctorRdv === 'function') loadUpcomingDoctorRdv();
                    if (typeof renderDoctorVisitDatesList === 'function') renderDoctorVisitDatesList();
                    if (typeof renderUpcomingKineVisits === 'function') renderUpcomingKineVisits();
                    // Pré-remplir la date du filtre kiné avec aujourd'hui
                    const kineFilter = document.getElementById('kineRequestDateFilter');
                    if (kineFilter && !kineFilter.value) kineFilter.value = new Date().toISOString().split('T')[0];
                });
            }
        }},
        'messages':    { tabId: 'messagesTab',     callback: () => typeof loadScheduledMessages === 'function' && loadScheduledMessages() },
        'restPeriods': { tabId: 'restPeriodsTab',  callback: () => typeof loadRestPeriods === 'function' && loadRestPeriods() },
        'weekPlanner': { tabId: 'weekPlannerTab',  callback: () => typeof initWeekPlanner === 'function' && initWeekPlanner() },
        'teamPlanner': { tabId: 'teamPlannerTab',  callback: () => typeof TeamPlanner !== 'undefined' && typeof TeamPlanner.init === 'function' && TeamPlanner.init() },
        'physicalPrep':{ tabId: 'physicalPrepTab', callback: () => typeof initPhysicalPrepTab === 'function' && initPhysicalPrepTab() },
        'management':  { tabId: 'managementTab',   callback: () => typeof loadPlayersTable === 'function' && loadPlayersTable() },
        'engagement':  { tabId: 'engagementTab',   callback: () => { switchEngagementSubTab('stickers'); if (typeof updateFillIndicator === 'function') updateFillIndicator(); } },
        'seasonReport': { tabId: 'seasonReportTab', callback: () => typeof loadSeasonReport === 'function' && loadSeasonReport() },
    };

    const entry = tabMap[tabName];
    if (entry) {
        const tabEl = document.getElementById(entry.tabId);
        if (tabEl) tabEl.style.display = 'block';
        const btn = document.querySelector('[data-tab="' + tabName + '"]');
        if (btn) btn.classList.add('active');
        if (entry.callback) entry.callback();
    }
}

// Fonction pour gérer les sous-onglets d'Engagement
function switchEngagementSubTab(subTab) {
    // Vérifier que les éléments existent
    const stickersContent = document.getElementById('engagementStickersContent');
    const maintenanceContent = document.getElementById('engagementMaintenanceContent');

    if (!stickersContent) {
        console.warn('Sous-onglets Engagement non trouvés dans le DOM');
        return;
    }

    // Gérer les boutons
    document.querySelectorAll('.engagement-sub-tab').forEach(btn => {
        btn.classList.remove('active');
        btn.style.borderBottom = '3px solid transparent';
        btn.style.color = 'var(--color-text-secondary)';
    });

    const activeBtn = document.querySelector(`[data-subtab="${subTab}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.style.borderBottom = '3px solid #f97316';
        activeBtn.style.color = 'white';
    }

    // Gérer le contenu - masquer tous les onglets
    stickersContent.style.display = 'none';
    if (maintenanceContent) maintenanceContent.style.display = 'none';

    if (subTab === 'stickers') {
        stickersContent.style.display = 'block';
        // Forcer les styles avec !important pour permettre l'affichage complet
        stickersContent.style.setProperty('max-height', 'none', 'important');
        stickersContent.style.setProperty('overflow', 'visible', 'important');
        stickersContent.style.setProperty('height', 'auto', 'important');

        // Forcer aussi sur le parent .card
        const parentCard = stickersContent.closest('.card');
        if (parentCard) {
            parentCard.style.setProperty('max-height', 'none', 'important');
            parentCard.style.setProperty('overflow', 'visible', 'important');
            parentCard.style.setProperty('height', 'auto', 'important');
        }

        // Charger la grille de stickers
        loadCoachStickersVerification();
    } else if (subTab === 'maintenance') {
        if (maintenanceContent) {
            maintenanceContent.style.display = 'block';
        }
    }
}

// Charger la grille de vérification des stickers pour les coachs
async function loadCoachStickersVerification() {
    const container = document.getElementById('coachStickersVerification');
    if (!container) return;
    
    // Vérifier que STICKER_DEFINITIONS est disponible
    if (typeof STICKER_DEFINITIONS === 'undefined' || !STICKER_DEFINITIONS) {
        console.error('STICKER_DEFINITIONS non disponible');
        container.innerHTML = '<p style="text-align: center; color: var(--color-error);">Erreur : Définitions des stickers non chargées</p>';
        return;
    }
    
    const allStickers = Object.entries(STICKER_DEFINITIONS);
    console.log('📊 Stickers disponibles:', allStickers.length);
    console.log('📊 Détail:', allStickers.map(([id, s]) => `${id} (${s.rarity})`).join(', '));
    
    try {
        // Forcer le conteneur à être visible et sans limite de hauteur avec !important
        container.style.setProperty('max-height', 'none', 'important');
        container.style.setProperty('overflow', 'visible', 'important');
        container.style.setProperty('height', 'auto', 'important');
        
        let html = '<div style="width: 100%; height: auto !important; max-height: none !important; overflow: visible !important;">';
        html += '<div style="margin-bottom: 20px; text-align: center; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 12px;">';
        html += `<p style="color: white; font-size: 18px; font-weight: 600;">🔧 Vérification des Stickers - ${allStickers.length} au total</p>`;
        html += '<p style="color: rgba(255,255,255,0.7); font-size: 14px; margin-top: 8px;">Cliquez sur un sticker pour le voir en détail</p>';
        html += '</div>';

        // Stickers communs
        html += '<div style="margin-bottom: 40px;">';
        html += '<h3 style="color: white; font-size: 22px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid rgba(255,255,255,0.1);">⚪ Stickers Communs (Séries de Check-ins)</h3>';
        html += '<div id="commonStickersGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; height: auto; min-height: auto;">';
        
        let commonCount = 0;
        allStickers.forEach(([id, sticker]) => {
            if (sticker.rarity === 'common') {
                html += renderCoachStickerCard(id, sticker);
                commonCount++;
            }
        });
        html += '</div>';
        html += `<p style="color: #10b981; text-align: center; margin-top: 15px; font-size: 16px; font-weight: 600;">✅ ${commonCount} stickers communs affichés</p>`;
        html += '</div>';

        // Stickers rares
        html += '<div style="margin-bottom: 40px;">';
        html += '<h3 style="color: white; font-size: 22px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid rgba(255,255,255,0.1);">🔵 Stickers Rares (Régularité)</h3>';
        html += '<div id="rareStickersGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; height: auto; min-height: auto;">';
        
        let rareCount = 0;
        allStickers.forEach(([id, sticker]) => {
            if (sticker.rarity === 'rare') {
                html += renderCoachStickerCard(id, sticker);
                rareCount++;
            }
        });
        html += '</div>';
        html += `<p style="color: #3b82f6; text-align: center; margin-top: 15px; font-size: 16px; font-weight: 600;">✅ ${rareCount} stickers rares affichés</p>`;
        html += '</div>';

        // Stickers légendaires
        html += '<div style="margin-bottom: 40px;">';
        html += '<h3 style="color: white; font-size: 22px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid rgba(255,255,255,0.1);">🌟 Stickers Légendaires (Joueuses + Coachs + Collectif)</h3>';
        html += '<div id="legendaryStickersGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; height: auto; min-height: auto;">';
        
        let legendaryCount = 0;
        allStickers.forEach(([id, sticker]) => {
            if (sticker.rarity === 'legendary') {
                html += renderCoachStickerCard(id, sticker);
                legendaryCount++;
            }
        });
        html += '</div>';
        html += `<p style="color: #fbbf24; text-align: center; margin-top: 15px; font-size: 16px; font-weight: 600;">✅ ${legendaryCount} stickers légendaires affichés</p>`;
        html += '</div>';

        console.log(`✅ Stickers affichés: ${commonCount} communs, ${rareCount} rares, ${legendaryCount} légendaires (Total: ${commonCount + rareCount + legendaryCount})`);
        html += '</div>'; // Fermer le wrapper principal
        container.innerHTML = html;
        
        // Forcer aussi les parents à ne pas avoir de limite
        let parent = container.parentElement;
        while (parent) {
            parent.style.setProperty('max-height', 'none', 'important');
            parent.style.setProperty('overflow', 'visible', 'important');
            parent.style.setProperty('height', 'auto', 'important');
            if (parent.classList.contains('card') || parent.id === 'engagementTab') {
                break;
            }
            parent = parent.parentElement;
        }
        
    } catch (error) {
        console.error('Erreur chargement stickers:', error);
        container.innerHTML = '<p style="text-align: center; color: var(--color-error);">Erreur lors du chargement des stickers</p>';
    }
}

// Rendu d'une carte sticker pour le coach
function renderCoachStickerCard(id, sticker) {
    const rarityColor = sticker.rarity === 'legendary' ? '#fbbf24' : sticker.rarity === 'rare' ? '#3b82f6' : '#10b981';
    
    return `
        <div onclick="showStickerDetail('${id}')" style="background: rgba(255,255,255,0.05); border-radius: 15px; padding: 15px; transition: all 0.3s ease; border: 2px solid ${rarityColor}; cursor: pointer; position: relative;" 
             onmouseover="this.style.transform='translateY(-5px)'; this.style.borderColor='rgba(255,255,255,0.3)';"
             onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='${rarityColor}';" style="background: rgba(255,255,255,0.05); border-radius: 15px; padding: 15px; transition: all 0.3s ease; border: 2px solid ${rarityColor}; cursor: pointer; position: relative; height: auto !important; min-height: auto !important;">
            <div style="position: relative;">
                <img src="${sticker.image}" alt="${sticker.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 10px; background: var(--color-surface, white);">
                <div style="position: absolute; top: 10px; right: 10px; background: rgba(255,255,255,0.2); color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px;">
                    👁️
                </div>
            </div>
            <div style="margin-top: 12px;">
                <p style="color: white; font-size: 14px; font-weight: 600; margin: 0; text-align: center;">${sticker.name}</p>
                <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 5px 0 0 0; text-align: center;">${sticker.description}</p>
            </div>
        </div>
    `;
}

window.switchEngagementSubTab = switchEngagementSubTab;

// ========================================
// CHARGEMENT DES RAPPORTS
// ========================================

async function loadReports() {
    try {
        // Récupérer toutes les joueuses
        const playersSnapshot = await db.collection('players').get();
        const players = playersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        // Récupérer les check-ins des 7 derniers jours
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const checkinsSnapshot = await db.collection('checkins')
            .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(sevenDaysAgo))
            .get();
        
        const checkins = checkinsSnapshot.docs.map(doc => doc.data());
        
        // Récupérer les RPE des 7 derniers jours
        const rpeSnapshot = await db.collection('rpe')
            .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(sevenDaysAgo))
            .get();
        
        const rpeData = rpeSnapshot.docs.map(doc => doc.data());
        
        // Générer les graphiques et statistiques
        generateTeamEvolutionChart(players, checkins);
        generateLoadDistributionChart(rpeData);
        calculateTeamTSB(players, rpeData);
        generateTeamSummary(players, checkins, rpeData);
        
    } catch (error) {
        console.error('Erreur lors du chargement des rapports:', error);
    }
}

// ========================================
// GRAPHIQUE D'ÉVOLUTION DE L'ÉQUIPE
// ========================================

function generateTeamEvolutionChart(players, checkins) {
    const canvas = document.getElementById('teamEvolutionChart');
    if (!canvas) return;
    
    // Préparer les données pour les 7 derniers jours
    const days = [];
    const optimalData = [];
    const attentionData = [];
    const criticalData = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Formater la date pour l'affichage
        const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
        days.push(dayName);
        
        // Compter les joueuses par catégorie pour ce jour
        let optimal = 0, attention = 0, critical = 0;
        
        players.forEach(player => {
            const playerCheckins = checkins.filter(c => 
                c.playerId === player.id && 
                c.date === dateStr
            );
            
            if (playerCheckins.length > 0) {
                const latestCheckin = playerCheckins[playerCheckins.length - 1];
                const score = calculatePlayerScore(latestCheckin);
                
                if (score >= 7) optimal++;
                else if (score >= 5) attention++;
                else critical++;
            }
        });
        
        optimalData.push(optimal);
        attentionData.push(attention);
        criticalData.push(critical);
    }
    
    // Détruire le graphique existant
    if (teamEvolutionChart) {
        teamEvolutionChart.destroy();
    }
    
    // Créer le nouveau graphique
    teamEvolutionChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: days,
            datasets: [
                {
                    label: 'Optimal',
                    data: optimalData,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Attention',
                    data: attentionData,
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Critique',
                    data: criticalData,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// ========================================
// GRAPHIQUE DE DISTRIBUTION DE CHARGE
// ========================================

function generateLoadDistributionChart(rpeData) {
    const canvas = document.getElementById('loadDistributionChart');
    if (!canvas) return;
    
    // Calculer la distribution de charge
    const loadRanges = {
        'Très faible (0-100)': 0,
        'Faible (100-200)': 0,
        'Modérée (200-400)': 0,
        'Élevée (400-600)': 0,
        'Très élevée (600+)': 0
    };
    
    rpeData.forEach(rpe => {
        const load = (rpe.rpe || 0) * (rpe.duration || 0) / 10;
        
        if (load < 10) loadRanges['Très faible (0-100)']++;
        else if (load < 20) loadRanges['Faible (100-200)']++;
        else if (load < 40) loadRanges['Modérée (200-400)']++;
        else if (load < 60) loadRanges['Élevée (400-600)']++;
        else loadRanges['Très élevée (600+)']++;
    });
    
    // Détruire le graphique existant
    if (loadDistributionChart) {
        loadDistributionChart.destroy();
    }
    
    // Créer le nouveau graphique
    loadDistributionChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: Object.keys(loadRanges),
            datasets: [{
                label: 'Nombre de sessions',
                data: Object.values(loadRanges),
                backgroundColor: [
                    'rgba(16, 185, 129, 0.7)',
                    'rgba(52, 211, 153, 0.7)',
                    'rgba(245, 158, 11, 0.7)',
                    'rgba(239, 68, 68, 0.7)',
                    'rgba(220, 38, 38, 0.7)'
                ],
                borderColor: [
                    '#10B981',
                    '#34D399',
                    '#F59E0B',
                    '#EF4444',
                    '#DC2626'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// ========================================
// CALCUL DU TSB MOYEN DE L'ÉQUIPE
// ========================================

async function calculateTeamTSB(players, rpeData) {
    let totalTSB = 0;
    let playerCount = 0;
    
    for (const player of players) {
        const playerRPE = rpeData.filter(r => r.playerId === player.id);
        
        if (playerRPE.length > 0) {
            // Calculer ATL (7 jours)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const recentRPE = playerRPE.filter(r => 
                r.timestamp && r.timestamp.toDate() >= sevenDaysAgo
            );
            const atl = recentRPE.reduce((sum, r) => sum + (r.rpe || 0) * (r.duration || 0) / 10, 0) / 7;
            
            // Calculer CTL (28 jours)
            const twentyEightDaysAgo = new Date();
            twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
            const allRPE = playerRPE.filter(r => 
                r.timestamp && r.timestamp.toDate() >= twentyEightDaysAgo
            );
            const ctl = allRPE.reduce((sum, r) => sum + (r.rpe || 0) * (r.duration || 0) / 10, 0) / 28;
            
            // Calculer TSB
            const tsb = ctl - atl;
            totalTSB += tsb;
            playerCount++;
        }
    }
    
    const avgTSB = playerCount > 0 ? (totalTSB / playerCount).toFixed(1) : 0;
    
    // Afficher le TSB moyen
    document.getElementById('avgTSB').textContent = avgTSB;
    
    // Interpréter le TSB
    let interpretation = '';
    let color = '';
    
    if (avgTSB > 10) {
        interpretation = "L'équipe est bien reposée et prête pour un entraînement intense.";
        color = '#10B981';
    } else if (avgTSB >= -10) {
        interpretation = "L'équipe est dans un état d'équilibre correct. Entraînement normal possible.";
        color = '#F59E0B';
    } else {
        interpretation = "L'équipe accumule de la fatigue. Envisager une récupération ou un entraînement léger.";
        color = '#EF4444';
    }
    
    document.getElementById('tsbText').textContent = interpretation;
    document.getElementById('avgTSB').style.color = color;
}

// ========================================
// RÉSUMÉ DE L'ÉQUIPE
// ========================================

function generateTeamSummary(players, checkins, rpeData) {
    // Joueuses actives
    document.getElementById('activePlayers').textContent = players.length;
    
    // Check-ins aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const todayCheckins = checkins.filter(c => c.date === today);
    document.getElementById('todayCheckins').textContent = `${todayCheckins.length}/${players.length}`;
    
    // Score moyen de l'équipe
    if (todayCheckins.length > 0) {
        const avgScore = todayCheckins.reduce((sum, c) => sum + calculatePlayerScore(c), 0) / todayCheckins.length;
        document.getElementById('avgTeamScore').textContent = avgScore.toFixed(1);
    } else {
        document.getElementById('avgTeamScore').textContent = '--';
    }
    
    // Charge moyenne (7 jours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentRPE = rpeData.filter(r => 
        r.timestamp && r.timestamp.toDate() >= sevenDaysAgo
    );
    
    if (recentRPE.length > 0) {
        const avgLoad = recentRPE.reduce((sum, r) => sum + (r.rpe || 0) * (r.duration || 0) / 10, 0) / recentRPE.length;
        document.getElementById('avgLoad7days').textContent = avgLoad.toFixed(0);
    } else {
        document.getElementById('avgLoad7days').textContent = '--';
    }
}

// ========================================
// GESTION DU COMMENTAIRE
// ========================================

// Compteur de caractères pour les commentaires
document.addEventListener('DOMContentLoaded', function() {
    // Compteur pour le check-in
    const commentField = document.getElementById('checkinComment');
    const commentCount = document.getElementById('commentCount');
    
    if (commentField && commentCount) {
        commentField.addEventListener('input', function() {
            commentCount.textContent = this.value.length;
        });
    }
    
    // Compteur pour le RPE
    const rpeCommentField = document.getElementById('rpeComment');
    const rpeCommentCount = document.getElementById('rpeCommentCount');
    
    if (rpeCommentField && rpeCommentCount) {
        rpeCommentField.addEventListener('input', function() {
            rpeCommentCount.textContent = this.value.length;
        });
    }
});

// NOTE: L'enregistrement du check-in est géré par l'event listener dans app.js
// Il n'est pas nécessaire d'ajouter un deuxième handler ici pour éviter les doublons

console.log('Module Rapports et Commentaires initialisé');

