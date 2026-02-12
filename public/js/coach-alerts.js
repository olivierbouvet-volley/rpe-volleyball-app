/**
 * Coach Alerts - Système d'alertes pour le dashboard coach
 * Affiche un popup avec les joueuses nécessitant une attention particulière
 * 
 * Critères d'alerte :
 * - Courbatures >= 5
 * - Humeur < 5
 * - Sommeil < 5
 * - Stress > 5
 */

// État des alertes
let coachAlertsData = [];
let alertsPopupDismissedToday = false;

// Seuils d'alerte - Check-in standard
const ALERT_THRESHOLDS = {
    soreness: { value: 5, condition: '>=', label: 'Courbatures', icon: '💪', color: '#ef4444' },
    mood: { value: 5, condition: '<', label: 'Humeur', icon: '😔', color: '#8b5cf6' },
    sleep: { value: 5, condition: '<', label: 'Sommeil', icon: '😴', color: '#3b82f6' },
    stress: { value: 5, condition: '>', label: 'Stress', icon: '😰', color: '#f59e0b' }
};

// Seuils d'alerte - Symptômes menstruels (0-10) avec recommandations
const MENSTRUAL_SYMPTOM_THRESHOLDS = {
    fatigue: { 
        value: 5, 
        condition: '>=', 
        label: 'Fatigue Excessive', 
        icon: '😴', 
        color: '#f59e0b',
        recommendation: 'Réduire la charge d\'entraînement globale (volume et intensité). Planifier un jour de récupération active ou repos complet.'
    },
    cramps: { 
        value: 5, 
        condition: '>=', 
        label: 'Crampes Abdominales', 
        icon: '🩸', 
        color: '#ef4444',
        recommendation: 'Réduire l\'intensité des exercices de force et de puissance. Privilégier la récupération ou la mobilité.'
    },
    headache: { 
        value: 5, 
        condition: '>=', 
        label: 'Maux de Tête', 
        icon: '🤕', 
        color: '#f59e0b',
        recommendation: 'Éviter les exercices complexes, les séances de stratégie ou ceux nécessitant une prise de décision rapide. Privilégier des entraînements simples et répétitifs.'
    },
    backPain: { 
        value: 5, 
        condition: '>=', 
        label: 'Douleurs Dorsales', 
        icon: '🔙', 
        color: '#ef4444',
        recommendation: 'Surveiller la technique d\'exécution. Réduire la charge sur les exercices impliquant le bas du dos. Éviter les exercices de force lourds.'
    },
    breastTenderness: { 
        value: 5, 
        condition: '>=', 
        label: 'Sensibilité Mammaire', 
        icon: '⚠️', 
        color: '#f97316',
        recommendation: 'Limiter les exercices pliométriques et les mouvements à fort impact (sauts, changements de direction). Focus sur la force statique ou faible impact.'
    },
    bloating: { 
        value: 5, 
        condition: '>=', 
        label: 'Ballonnements', 
        icon: '🎈', 
        color: '#f59e0b',
        recommendation: 'Adapter les exercices qui exercent une pression sur l\'abdomen (ex: certains exercices de gainage, sauts avec regroupement).'
    },
    moodSwings: { 
        value: 5, 
        condition: '>=', 
        label: 'Variations d\'Humeur', 
        icon: '😢', 
        color: '#8b5cf6',
        recommendation: 'Nécessite une approche de coaching plus positive et encourageante. Éviter les critiques dures. Privilégier les séances ludiques/en équipe.'
    }
};

// Seuil critique pour symptômes totaux
const TOTAL_SYMPTOMS_CRITICAL_THRESHOLD = 20;

/**
 * Vérifie si une valeur déclenche une alerte
 */
function checkAlert(type, value) {
    const threshold = ALERT_THRESHOLDS[type];
    if (!threshold) return false;
    
    switch (threshold.condition) {
        case '>=': return value >= threshold.value;
        case '>': return value > threshold.value;
        case '<': return value < threshold.value;
        case '<=': return value <= threshold.value;
        default: return false;
    }
}

/**
 * Calcule le score de priorité (plus c'est haut, plus c'est urgent)
 */
function calculatePriority(alerts) {
    let priority = 0;
    
    alerts.forEach(alert => {
        // Symptômes menstruels
        if (alert.category === 'menstrual') {
            // Alerte critique (symptômes totaux >= 20) : priorité maximale
            if (alert.type === 'menstrual_critical') {
                priority += 100;
            } else {
                // Symptôme individuel >= 5 : priorité basée sur la valeur
                priority += (alert.value - 5) + 5;
            }
        } 
        // Alertes standard
        else {
            const threshold = ALERT_THRESHOLDS[alert.type];
            if (!threshold) return;
            
            // Calculer l'écart par rapport au seuil
            let severity = 0;
            switch (threshold.condition) {
                case '>=':
                case '>':
                    severity = alert.value - threshold.value;
                    break;
                case '<':
                case '<=':
                    severity = threshold.value - alert.value;
                    break;
            }
            
            // Plus l'écart est grand, plus c'est prioritaire
            priority += Math.max(0, severity) + 1;
        }
    });
    
    return priority;
}

/**
 * Charge les alertes du jour pour toutes les joueuses
 */
async function loadCoachAlerts() {
    const today = new Date().toISOString().split('T')[0];
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const tenDaysAgoStr = tenDaysAgo.toISOString().split('T')[0];
    
    coachAlertsData = [];
    
    try {
        // Récupérer toutes les joueuses
        const playersSnapshot = await db.collection('players').get();
        const players = {};
        playersSnapshot.forEach(doc => {
            players[doc.id] = doc.data();
        });
        
        // Récupérer les check-ins du jour
        const todayCheckinsSnapshot = await db.collection('checkins')
            .where('date', '==', today)
            .get();
        
        // Récupérer les check-ins des 10 derniers jours pour les moyennes
        const historyCheckinsSnapshot = await db.collection('checkins')
            .where('date', '>=', tenDaysAgoStr)
            .where('date', '<', today)
            .get();
        
        // Calculer les moyennes par joueuse
        const playerAverages = {};
        historyCheckinsSnapshot.forEach(doc => {
            const data = doc.data();
            if (!playerAverages[data.playerId]) {
                playerAverages[data.playerId] = {
                    sleep: [], soreness: [], stress: [], mood: []
                };
            }
            
            const sleep = data.sleepQuality || data.sleep;
            if (sleep !== undefined) playerAverages[data.playerId].sleep.push(sleep);
            if (data.soreness !== undefined) playerAverages[data.playerId].soreness.push(data.soreness);
            if (data.stress !== undefined) playerAverages[data.playerId].stress.push(data.stress);
            if (data.mood !== undefined) playerAverages[data.playerId].mood.push(data.mood);
        });
        
        // Calculer les moyennes
        Object.keys(playerAverages).forEach(playerId => {
            const avg = playerAverages[playerId];
            playerAverages[playerId] = {
                sleep: avg.sleep.length > 0 ? avg.sleep.reduce((a, b) => a + b, 0) / avg.sleep.length : null,
                soreness: avg.soreness.length > 0 ? avg.soreness.reduce((a, b) => a + b, 0) / avg.soreness.length : null,
                stress: avg.stress.length > 0 ? avg.stress.reduce((a, b) => a + b, 0) / avg.stress.length : null,
                mood: avg.mood.length > 0 ? avg.mood.reduce((a, b) => a + b, 0) / avg.mood.length : null
            };
        });
        
        // Grouper les check-ins par playerId (privilégier celui avec symptômes menstruels)
        const playerCheckins = {};
        todayCheckinsSnapshot.forEach(doc => {
            const data = doc.data();
            const playerId = data.playerId;
            const timestamp = data.timestamp || { seconds: 0 };
            
            const hasSymptoms = data.symptoms && typeof data.symptoms === 'object' && 
                                Object.values(data.symptoms).some(v => typeof v === 'number' && v > 0);
            
            const currentHasSymptoms = playerCheckins[playerId]?.symptoms && 
                                      typeof playerCheckins[playerId].symptoms === 'object' &&
                                      Object.values(playerCheckins[playerId].symptoms).some(v => typeof v === 'number' && v > 0);
            
            // Garder le check-in avec symptômes en priorité, sinon le plus récent
            if (!playerCheckins[playerId]) {
                playerCheckins[playerId] = data;
            } else if (hasSymptoms && !currentHasSymptoms) {
                // Priorité aux symptômes : remplacer si le nouveau a des symptômes et pas l'ancien
                playerCheckins[playerId] = data;
            } else if (hasSymptoms === currentHasSymptoms && timestamp.seconds > playerCheckins[playerId].timestamp.seconds) {
                // Si même statut symptômes, garder le plus récent
                playerCheckins[playerId] = data;
            }
        });
        
        // Analyser les check-ins (un seul par joueuse)
        Object.entries(playerCheckins).forEach(([playerId, data]) => {
            const player = players[playerId];
            
            if (!player) return;
            
            const sleep = data.sleepQuality || data.sleep || 5;
            const soreness = data.soreness || 5;
            const stress = data.stress || 5;
            const mood = data.mood || 5;
            
            const alerts = [];
            let menstrualSymptoms = {};
            let totalSymptomsScore = 0;
            
            // Vérifier les critères standard
            if (checkAlert('soreness', soreness)) {
                alerts.push({
                    type: 'soreness',
                    value: soreness,
                    average: playerAverages[playerId]?.soreness
                });
            }
            if (checkAlert('mood', mood)) {
                alerts.push({
                    type: 'mood',
                    value: mood,
                    average: playerAverages[playerId]?.mood
                });
            }
            if (checkAlert('sleep', sleep)) {
                alerts.push({
                    type: 'sleep',
                    value: sleep,
                    average: playerAverages[playerId]?.sleep
                });
            }
            if (checkAlert('stress', stress)) {
                alerts.push({
                    type: 'stress',
                    value: stress,
                    average: playerAverages[playerId]?.stress
                });
            }
            
            // Analyser les symptômes menstruels si présents
            if (data.symptoms && typeof data.symptoms === 'object') {
                menstrualSymptoms = data.symptoms;
                
                // Calculer le score total des symptômes
                totalSymptomsScore = Object.values(menstrualSymptoms)
                    .filter(v => typeof v === 'number' && v > 0)
                    .reduce((sum, val) => sum + val, 0);
                
                // Vérifier chaque symptôme menstruel
                Object.entries(MENSTRUAL_SYMPTOM_THRESHOLDS).forEach(([symptomKey, threshold]) => {
                    const value = menstrualSymptoms[symptomKey] || 0;
                    
                    if (value >= threshold.value) {
                        alerts.push({
                            type: `menstrual_${symptomKey}`,
                            category: 'menstrual',
                            symptomKey: symptomKey,
                            value: value,
                            label: threshold.label,
                            icon: threshold.icon,
                            color: threshold.color,
                            recommendation: threshold.recommendation
                        });
                    }
                });
                
                // ALERTE CRITIQUE : Symptômes Totaux >= 20
                if (totalSymptomsScore >= TOTAL_SYMPTOMS_CRITICAL_THRESHOLD) {
                    alerts.push({
                        type: 'menstrual_critical',
                        category: 'menstrual',
                        value: totalSymptomsScore,
                        label: 'Symptômes Importants',
                        icon: '🚨',
                        color: '#dc2626',
                        recommendation: 'FORCER L\'INTENSITÉ À FAIBLE (Minimum) et envoyer une alerte "Symptômes importants". Séance allégée recommandée.'
                    });
                }
            }
            
            if (alerts.length > 0) {
                coachAlertsData.push({
                    playerId,
                    playerName: player.name || playerId,
                    photoURL: player.photoURL,
                    alerts,
                    comment: data.comment || null,
                    priority: calculatePriority(alerts),
                    checkinData: { sleep, soreness, stress, mood },
                    menstrualSymptoms: menstrualSymptoms,
                    totalSymptomsScore: totalSymptomsScore
                });
            }
        });
        
        // Trier par priorité décroissante
        coachAlertsData.sort((a, b) => b.priority - a.priority);
        
        // Mettre à jour le badge
        updateAlertsBadge();
        
        return coachAlertsData;
        
    } catch (error) {
        console.error('Erreur chargement alertes:', error);
        return [];
    }
}

/**
 * Met à jour le badge de notification
 */
function updateAlertsBadge() {
    let badge = document.getElementById('alertsBadge');
    const btn = document.getElementById('alertsButton');
    
    if (coachAlertsData.length > 0) {
        if (!badge && btn) {
            badge = document.createElement('span');
            badge.id = 'alertsBadge';
            badge.style.cssText = `
                position: absolute;
                top: -8px;
                right: -8px;
                background: #ef4444;
                color: white;
                font-size: 12px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 10px;
                min-width: 18px;
                text-align: center;
            `;
            btn.style.position = 'relative';
            btn.appendChild(badge);
        }
        if (badge) {
            badge.textContent = coachAlertsData.length;
            badge.style.display = 'block';
        }
    } else if (badge) {
        badge.style.display = 'none';
    }
}

/**
 * Génère le HTML du popup d'alertes
 */
function generateAlertsPopupHTML() {
    if (coachAlertsData.length === 0) {
        return `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                <div style="font-size: 18px; font-weight: 600; color: #10b981;">Aucune alerte aujourd'hui</div>
                <div style="font-size: 14px; color: #6b7280; margin-top: 8px;">Toutes les joueuses sont en forme !</div>
            </div>
        `;
    }
    
    let html = `
        <div style="padding: 0;">
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 16px 24px; border-radius: 12px 12px 0 0; border-left: 4px solid #f59e0b;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 28px;">⚠️</span>
                    <div>
                        <div style="font-size: 18px; font-weight: 600; color: #92400e;">${coachAlertsData.length} joueuse${coachAlertsData.length > 1 ? 's' : ''} à surveiller</div>
                        <div style="font-size: 13px; color: #a16207;">Un échange avant l'entraînement est recommandé</div>
                    </div>
                </div>
            </div>
            
            <div style="max-height: 60vh; overflow-y: auto; padding: 16px;">
    `;
    
    coachAlertsData.forEach((playerAlert, index) => {
        const initials = playerAlert.playerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        
        // Générer les badges d'alerte
        let alertBadges = '';
        playerAlert.alerts.forEach(alert => {
            // Symptômes menstruels (avec recommandations)
            if (alert.category === 'menstrual') {
                const isCritical = alert.type === 'menstrual_critical';
                
                alertBadges += `
                    <div style="padding: 12px; background: ${isCritical ? '#fef2f2' : '#fffbeb'}; border-radius: 8px; border-left: 4px solid ${alert.color}; margin-bottom: 8px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 18px;">${alert.icon}</span>
                                <span style="font-size: 14px; font-weight: 600; color: ${alert.color};">${alert.label}</span>
                            </div>
                            <span style="font-weight: 700; font-size: 14px; color: ${alert.color};">${alert.value}${isCritical ? '' : '/10'}</span>
                        </div>
                        ${alert.recommendation ? `
                            <div style="background: white; padding: 8px 10px; border-radius: 6px; border-left: 3px solid ${alert.color};">
                                <div style="font-size: 11px; font-weight: 600; color: ${alert.color}; text-transform: uppercase; margin-bottom: 4px;">📋 Recommandation</div>
                                <div style="font-size: 12px; color: #374151; line-height: 1.5;">${alert.recommendation}</div>
                            </div>
                        ` : ''}
                    </div>
                `;
            } 
            // Alertes standard (check-in)
            else {
                const threshold = ALERT_THRESHOLDS[alert.type];
                if (!threshold) return;
                
                const avg = alert.average !== null ? alert.average.toFixed(1) : '--';
                const diff = alert.average !== null ? (alert.value - alert.average).toFixed(1) : null;
                const diffStr = diff !== null ? (diff > 0 ? `+${diff}` : diff) : '';
                const diffColor = diff !== null ? (
                    (alert.type === 'soreness' || alert.type === 'stress') 
                        ? (diff > 0 ? '#ef4444' : '#10b981')
                        : (diff < 0 ? '#ef4444' : '#10b981')
                ) : '#6b7280';
                
                alertBadges += `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f9fafb; border-radius: 8px; border-left: 3px solid ${threshold.color};">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span>${threshold.icon}</span>
                            <span style="font-size: 13px; color: #374151;">${threshold.label}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-weight: 600; color: ${threshold.color};">${alert.value}/10</span>
                            <span style="font-size: 12px; color: #9ca3af;">moy: ${avg}</span>
                            ${diffStr ? `<span style="font-size: 12px; font-weight: 500; color: ${diffColor};">${diffStr}</span>` : ''}
                        </div>
                    </div>
                `;
            }
        });
        
        // Commentaire si présent
        const commentHTML = playerAlert.comment ? `
            <div style="margin-top: 12px; padding: 10px 12px; background: #f0f9ff; border-radius: 8px; border-left: 3px solid #3b82f6;">
                <div style="font-size: 12px; color: #1e40af; margin-bottom: 4px;">💬 Commentaire</div>
                <div style="font-size: 13px; color: #1e3a8a; font-style: italic;">"${playerAlert.comment}"</div>
            </div>
        ` : '';
        
        html += `
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 16px; ${index === 0 ? 'box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);' : ''}">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: bold; overflow: hidden; flex-shrink: 0;">
                        ${playerAlert.photoURL 
                            ? `<img src="${playerAlert.photoURL}" style="width: 100%; height: 100%; object-fit: cover;" alt="${playerAlert.playerName}">`
                            : initials
                        }
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 16px; font-weight: 600; color: #1f2937;">${playerAlert.playerName}</div>
                        <div style="font-size: 12px; color: #6b7280;">${playerAlert.alerts.length} alerte${playerAlert.alerts.length > 1 ? 's' : ''} • Priorité ${playerAlert.priority}</div>
                    </div>
                    <button onclick="closeAlertsPopup(); setTimeout(() => showPlayerDetail('${playerAlert.playerId}'), 100);" style="background: #667eea; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                        Voir détails
                    </button>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${alertBadges}
                </div>
                ${commentHTML}
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

/**
 * Affiche le popup d'alertes
 */
function showAlertsPopup(force = false) {
    // Vérifier si déjà fermé aujourd'hui (sauf si forcé)
    if (!force && alertsPopupDismissedToday) {
        return;
    }
    
    // Créer le modal s'il n'existe pas
    let modal = document.getElementById('coachAlertsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'coachAlertsModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px; max-height: 90vh; overflow: hidden; border-radius: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; border-bottom: 1px solid #e5e7eb;">
                    <h2 style="margin: 0; font-size: 18px; color: #1f2937;">🚨 Points de vigilance</h2>
                    <button onclick="closeAlertsPopup()" style="background: none; border: none; font-size: 24px; color: #9ca3af; cursor: pointer;">×</button>
                </div>
                <div id="alertsPopupContent">
                    <!-- Contenu généré dynamiquement -->
                </div>
                <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #6b7280; cursor: pointer;">
                        <input type="checkbox" id="dontShowTodayCheckbox" style="cursor: pointer;">
                        Ne plus afficher aujourd'hui
                    </label>
                    <button onclick="closeAlertsPopup()" style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 500; cursor: pointer;">
                        J'ai pris connaissance
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Mettre à jour le contenu
    document.getElementById('alertsPopupContent').innerHTML = generateAlertsPopupHTML();
    
    // Afficher le modal
    modal.classList.add('active');
}

/**
 * Ferme le popup d'alertes
 */
function closeAlertsPopup() {
    const modal = document.getElementById('coachAlertsModal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Vérifier si "Ne plus afficher aujourd'hui" est coché
    const checkbox = document.getElementById('dontShowTodayCheckbox');
    if (checkbox && checkbox.checked) {
        alertsPopupDismissedToday = true;
        // Stocker dans sessionStorage pour persister pendant la session
        sessionStorage.setItem('alertsDismissedDate', new Date().toISOString().split('T')[0]);
    }
}

/**
 * Crée le bouton d'alertes dans le dashboard coach
 */
function createAlertsButton() {
    // Vérifier si le bouton existe déjà
    if (document.getElementById('alertsButton')) return;
    
    // Chercher un endroit pour le bouton (près du bouton "Mettre à jour")
    const refreshBtn = document.getElementById('refreshChartsBtn');
    if (!refreshBtn) {
        // Attendre et réessayer
        setTimeout(createAlertsButton, 500);
        return;
    }
    
    const btn = document.createElement('button');
    btn.id = 'alertsButton';
    btn.innerHTML = '🚨 Alertes';
    btn.style.cssText = `
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fcd34d;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        margin-right: 12px;
        transition: all 0.2s;
        position: relative;
    `;
    btn.onmouseover = () => { btn.style.background = '#fde68a'; };
    btn.onmouseout = () => { btn.style.background = '#fef3c7'; };
    btn.onclick = () => showAlertsPopup(true);
    
    refreshBtn.parentElement.insertBefore(btn, refreshBtn);
    
    // Mettre à jour le badge
    updateAlertsBadge();
}

/**
 * Initialise le système d'alertes
 */
async function initCoachAlerts() {
    console.log('Coach Alerts: Initialisation...');
    
    // Vérifier si les alertes ont été fermées aujourd'hui
    const dismissedDate = sessionStorage.getItem('alertsDismissedDate');
    const today = new Date().toISOString().split('T')[0];
    if (dismissedDate === today) {
        alertsPopupDismissedToday = true;
    }
    
    // Charger les alertes
    await loadCoachAlerts();
    
    // Créer le bouton
    createAlertsButton();
    
    // Afficher le popup si des alertes existent et pas déjà fermé
    if (coachAlertsData.length > 0 && !alertsPopupDismissedToday) {
        // Petit délai pour laisser le dashboard se charger
        setTimeout(() => showAlertsPopup(), 800);
    }
    
    console.log('Coach Alerts: Initialisé avec', coachAlertsData.length, 'alertes');
}

// Exports globaux
window.initCoachAlerts = initCoachAlerts;
window.loadCoachAlerts = loadCoachAlerts;
window.showAlertsPopup = showAlertsPopup;
window.closeAlertsPopup = closeAlertsPopup;

// ============================================================================
// MODULE 3 - ALERTES CYCLE MENSTRUEL (Règles B)
// ============================================================================

/**
 * Seuils d'alerte pour les symptômes du cycle menstruel (Règle B)
 * Chaque symptôme déclenche une alerte si score > 5/10
 */
const CYCLE_SYMPTOM_THRESHOLDS = {
    cramps: {
        threshold: 5,
        label: 'Crampes Abdominales',
        icon: '🩸',
        color: '#dc2626',
        rule: 'B.2',
        message: 'Réduire l\'intensité des exercices de force. Éviter squats et soulevés de terre lourds.'
    },
    headache: {
        threshold: 5,
        label: 'Maux de Tête',
        icon: '🤕',
        color: '#9333ea',
        rule: 'B.3',
        message: 'Éviter les exercices complexes nécessitant concentration. Limiter les lectures de jeu rapides.'
    },
    fatigue: {
        threshold: 5,
        label: 'Fatigue Excessive',
        icon: '😴',
        color: '#2563eb',
        rule: 'B.1',
        message: 'Réduire la charge globale (volume ET intensité). Planifier récupération active ou repos.'
    },
    moodSwings: {
        threshold: 5,
        label: 'Variations d\'Humeur',
        icon: '😔',
        color: '#7c3aed',
        rule: 'B.4',
        message: 'Adapter l\'approche pédagogique. Privilégier exercices individuels et encouragements.'
    },
    bloating: {
        threshold: 5,
        label: 'Ballonnements',
        icon: '🫄',
        color: '#ca8a04',
        rule: 'B.5',
        message: 'Adapter les exercices abdominaux. Éviter gainage prolongé et sauts genoux-poitrine.'
    },
    backPain: {
        threshold: 5,
        label: 'Douleurs Dorsales',
        icon: '🔙',
        color: '#ea580c',
        rule: 'B.2',
        message: 'Réduire l\'intensité des exercices de force. Éviter squats et soulevés de terre lourds.'
    },
    breastTenderness: {
        threshold: 5,
        label: 'Sensibilité Mammaire',
        icon: '⚠️',
        color: '#db2777',
        rule: 'B.4',
        message: 'Limiter les exercices pliométriques et à fort impact. Réduire sauts répétés.'
    }
};

/**
 * Génère les alertes basées sur les scores de symptômes du cycle menstruel
 * Implémente les règles B.1 à B.6 des spécifications
 * 
 * @param {Object} symptomScores - Objet contenant les 7 scores de symptômes (0-10)
 *   - cramps: Crampes abdominales
 *   - headache: Maux de tête
 *   - fatigue: Fatigue excessive
 *   - moodSwings: Variations d'humeur
 *   - bloating: Ballonnements
 *   - backPain: Douleurs dorsales
 *   - breastTenderness: Sensibilité mammaire
 * 
 * @returns {Array} Tableau d'objets alertes [{type: 'critique'/'élevée'/'faible', message: '...', symptom: '...', value: number, rule: '...'}]
 */
function generateCycleAlerts(symptomScores) {
    const alerts = [];
    
    // Vérifier que symptomScores est valide
    if (!symptomScores || typeof symptomScores !== 'object') {
        console.warn('generateCycleAlerts: symptomScores invalide');
        return alerts;
    }
    
    // ========================================================================
    // RÈGLE B.6 : Vérifier d'abord la somme totale des symptômes
    // Si somme > 20 → Alerte CRITIQUE
    // ========================================================================
    const symptomKeys = ['cramps', 'headache', 'fatigue', 'moodSwings', 'bloating', 'backPain', 'breastTenderness'];
    let totalScore = 0;
    
    symptomKeys.forEach(key => {
        const value = symptomScores[key];
        if (typeof value === 'number' && !isNaN(value)) {
            totalScore += Math.max(0, Math.min(10, value)); // Clamp entre 0 et 10
        }
    });
    
    if (totalScore > 20) {
        alerts.push({
            type: 'critique',
            rule: 'B.6',
            symptom: 'total',
            value: totalScore,
            icon: '🚨',
            label: 'Score Total Symptômes',
            message: 'Symptômes importants. Forcer l\'Intensité à Faible (Minimum).',
            recommendation: 'Séance de récupération active ou repos complet recommandé.'
        });
    }
    
    // ========================================================================
    // RÈGLES B.1 à B.5 : Vérifier chaque symptôme individuellement
    // ========================================================================
    symptomKeys.forEach(key => {
        const value = symptomScores[key];
        const config = CYCLE_SYMPTOM_THRESHOLDS[key];
        
        if (!config) return;
        
        // Vérifier si la valeur est un nombre valide
        if (typeof value !== 'number' || isNaN(value)) return;
        
        // Clamp la valeur entre 0 et 10
        const clampedValue = Math.max(0, Math.min(10, value));
        
        // Vérifier si le seuil est dépassé (strictement supérieur à 5)
        if (clampedValue > config.threshold) {
            // Déterminer le niveau d'alerte selon la sévérité
            let alertType;
            if (clampedValue >= 8) {
                alertType = 'critique';
            } else if (clampedValue >= 6) {
                alertType = 'élevée';
            } else {
                alertType = 'faible';
            }
            
            alerts.push({
                type: alertType,
                rule: config.rule,
                symptom: key,
                value: clampedValue,
                icon: config.icon,
                label: config.label,
                color: config.color,
                message: config.message
            });
        }
    });
    
    // Trier les alertes par sévérité (critique > élevée > faible)
    const severityOrder = { 'critique': 0, 'élevée': 1, 'faible': 2 };
    alerts.sort((a, b) => {
        // D'abord par type de sévérité
        const severityDiff = severityOrder[a.type] - severityOrder[b.type];
        if (severityDiff !== 0) return severityDiff;
        // Ensuite par valeur décroissante
        return b.value - a.value;
    });
    
    return alerts;
}

/**
 * Génère le HTML pour afficher les alertes de symptômes du cycle
 * 
 * @param {Array} cycleAlerts - Tableau d'alertes généré par generateCycleAlerts()
 * @returns {string} HTML formaté pour l'affichage
 */
function generateCycleAlertsHTML(cycleAlerts) {
    if (!cycleAlerts || cycleAlerts.length === 0) {
        return '<div style="padding: 16px; text-align: center; color: #6b7280;">Aucune alerte de symptômes</div>';
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
    
    cycleAlerts.forEach(alert => {
        // Couleur de fond selon le type d'alerte
        let bgColor, borderColor, textColor;
        switch (alert.type) {
            case 'critique':
                bgColor = '#fef2f2';
                borderColor = '#dc2626';
                textColor = '#991b1b';
                break;
            case 'élevée':
                bgColor = '#fffbeb';
                borderColor = '#f59e0b';
                textColor = '#92400e';
                break;
            default: // faible
                bgColor = '#f0f9ff';
                borderColor = '#3b82f6';
                textColor = '#1e40af';
        }
        
        html += `
            <div style="display: flex; flex-direction: column; gap: 4px; padding: 12px; background: ${bgColor}; border-radius: 8px; border-left: 4px solid ${borderColor};">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 16px;">${alert.icon}</span>
                        <span style="font-weight: 600; color: ${textColor};">${alert.label}</span>
                        <span style="font-size: 11px; padding: 2px 6px; background: ${borderColor}; color: white; border-radius: 4px; text-transform: uppercase;">${alert.type}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; color: ${borderColor};">${alert.value}/10</span>
                        <span style="font-size: 11px; color: #6b7280;">(${alert.rule})</span>
                    </div>
                </div>
                <div style="font-size: 13px; color: ${textColor}; margin-top: 4px;">
                    💡 ${alert.message}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    return html;
}

/**
 * Calcule le niveau de recommandation global basé sur les alertes
 * 
 * @param {Array} cycleAlerts - Tableau d'alertes
 * @returns {Object} {level: 'repos'/'faible'/'modéré'/'normal', message: '...', color: '...'}
 */
function getCycleRecommendationLevel(cycleAlerts) {
    if (!cycleAlerts || cycleAlerts.length === 0) {
        return {
            level: 'normal',
            message: 'Aucune adaptation nécessaire',
            color: '#10b981',
            icon: '✅'
        };
    }
    
    // Vérifier s'il y a une alerte critique (notamment B.6)
    const hasCritique = cycleAlerts.some(a => a.type === 'critique');
    const hasElevee = cycleAlerts.some(a => a.type === 'élevée');
    const criticalCount = cycleAlerts.filter(a => a.type === 'critique').length;
    const eleveeCount = cycleAlerts.filter(a => a.type === 'élevée').length;
    
    if (hasCritique || criticalCount >= 1) {
        return {
            level: 'repos',
            message: 'Repos ou récupération active recommandé',
            color: '#dc2626',
            icon: '🛑'
        };
    }
    
    if (eleveeCount >= 2 || (hasElevee && cycleAlerts.length >= 3)) {
        return {
            level: 'faible',
            message: 'Intensité faible recommandée',
            color: '#f59e0b',
            icon: '⚠️'
        };
    }
    
    if (hasElevee || cycleAlerts.length >= 2) {
        return {
            level: 'modéré',
            message: 'Adapter l\'entraînement selon symptômes',
            color: '#3b82f6',
            icon: '📋'
        };
    }
    
    return {
        level: 'normal',
        message: 'Légères adaptations possibles',
        color: '#10b981',
        icon: '✅'
    };
}

// ============================================================================
// MODULE 3 & 4 - SYNTHÈSE DE RECOMMANDATION DÉTAILLÉE
// ============================================================================

/**
 * Configuration des phases du cycle avec recommandations
 * Basé sur les spécifications de l'analogie "super-héroïnes" (Wonder Woman / Bad Girl)
 */
const CYCLE_PHASE_CONFIG = {
    'Ovulatoire': {
        icon: '🌸',
        color: '#8b5cf6',
        heroIne: 'Wonder Woman (Pic)',
        objective: 'Surcharger - Fenêtre d\'Opportunité maximale',
        defaultRecommendation: 'Intensité',
        ppg: ['Force maximale', 'Puissance', 'Pliométrie', 'Séances exigeantes'],
        terrain: ['Sauts (attaques, contres)', 'Vitesse', 'Explosivité'],
        intensityModifier: +0.5
    },
    'Folliculaire': {
        icon: '🌱',
        color: '#10b981',
        heroIne: 'Wonder Woman (Œstrogènes)',
        objective: 'Surcharger - Fenêtre d\'Opportunité',
        defaultRecommendation: 'Intensité',
        ppg: ['Force maximale', 'Puissance', 'Pliométrie'],
        terrain: ['Sauts', 'Vitesse', 'Explosivité'],
        intensityModifier: +0.3
    },
    'Lutéale': {
        icon: '🍂',
        color: '#f59e0b',
        heroIne: 'Bad Girl (Progestérone)',
        objective: 'Affiner - Phase d\'Adaptation',
        defaultRecommendation: 'Volume',
        ppg: ['Endurance', 'Séries longues', 'Charges légères', 'Récupération active'],
        terrain: ['Volume', 'Répétition', 'Continuité', 'Technique/Tactique'],
        intensityModifier: -0.2
    },
    'Menstruelle': {
        icon: '🩸',
        color: '#ef4444',
        heroIne: 'Héroïnes au repos',
        objective: 'Récupérer et Maintenir',
        defaultRecommendation: 'Volume',
        ppg: ['Mobilité', 'Technique faible intensité', 'Étirements', 'Yoga'],
        terrain: ['Volume modéré', 'Préservation des acquis'],
        intensityModifier: -0.7
    },
    'Données manquantes': {
        icon: '❓',
        color: '#6b7280',
        heroIne: 'Non défini',
        objective: 'Configurer le suivi du cycle',
        defaultRecommendation: 'Attention',
        ppg: ['Adapter selon ressenti'],
        terrain: ['Adapter selon ressenti'],
        intensityModifier: 0
    }
};

/**
 * Configuration des icônes de recommandation pour le dashboard
 */
const RECOMMENDATION_ICONS = {
    'Intensité': { icon: '⚡', color: '#10b981', bgColor: '#d1fae5', label: 'Intensité haute' },
    'Volume': { icon: '📊', color: '#3b82f6', bgColor: '#dbeafe', label: 'Volume/Endurance' },
    'Repos': { icon: '🛌', color: '#ef4444', bgColor: '#fee2e2', label: 'Repos/Récupération' },
    'Attention': { icon: '⚠️', color: '#f59e0b', bgColor: '#fef3c7', label: 'Adapter' }
};

/**
 * Génère une recommandation détaillée basée sur la phase, les alertes et le score ajusté
 * Implémente la logique de priorités des spécifications
 * 
 * @param {string} phase - Phase actuelle du cycle ('Menstruelle', 'Folliculaire', 'Ovulatoire', 'Lutéale')
 * @param {Array} alerts - Alertes générées par generateCycleAlerts()
 * @param {number} scoreAjuste - Score de forme ajusté selon la phase (0-10)
 * @param {Object} [checkinData] - Données optionnelles du check-in (sommeil, stress, etc.)
 * @returns {Object} {iconType: string, justification: string, alertList: Array, phaseInfo: Object, detailedRecommendations: Object}
 */
function getDetailedCycleRecommendation(phase, alerts, scoreAjuste, checkinData = null) {
    const result = {
        iconType: 'Attention',
        justification: '',
        alertList: alerts || [],
        phaseInfo: CYCLE_PHASE_CONFIG[phase] || CYCLE_PHASE_CONFIG['Données manquantes'],
        detailedRecommendations: {
            ppg: [],
            terrain: [],
            alertes: []
        }
    };
    
    const phaseConfig = result.phaseInfo;
    const score = typeof scoreAjuste === 'number' ? scoreAjuste : 5;
    
    // ========================================================================
    // PRIORITÉ 1 (SÉCURITÉ) : Vérifier les alertes CRITIQUES (Règle B.6)
    // ========================================================================
    const criticalAlert = alerts?.find(a => a.type === 'critique' && a.rule === 'B.6');
    const hasCriticalSymptoms = alerts?.some(a => a.type === 'critique');
    
    if (criticalAlert || hasCriticalSymptoms) {
        result.iconType = 'Repos';
        
        if (criticalAlert) {
            result.justification = `🚨 CRITIQUE (${criticalAlert.rule}) : ${criticalAlert.message} `;
            result.justification += `Score total symptômes : ${criticalAlert.value}/70. `;
        } else {
            const critAlerts = alerts.filter(a => a.type === 'critique');
            result.justification = `🚨 CRITIQUE : ${critAlerts.length} symptôme(s) sévère(s) détecté(s). `;
            result.justification += critAlerts.map(a => `${a.label} (${a.value}/10)`).join(', ') + '. ';
        }
        
        result.justification += `Intensité forcée à FAIBLE (Minimum). Repos ou récupération active obligatoire.`;
        
        result.detailedRecommendations = {
            ppg: ['🛑 Repos complet', 'Récupération active légère', 'Mobilité douce'],
            terrain: ['🛑 Pas d\'entraînement intensif', 'Marche légère si nécessaire'],
            alertes: alerts.map(a => `${a.icon} ${a.label}: ${a.message}`)
        };
        
        return result;
    }
    
    // ========================================================================
    // PRIORITÉ 1 BIS : Vérifier les alertes ÉLEVÉES multiples
    // ========================================================================
    const elevatedAlerts = alerts?.filter(a => a.type === 'élevée') || [];
    if (elevatedAlerts.length >= 2) {
        result.iconType = 'Repos';
        result.justification = `⚠️ Symptômes élevés multiples (${elevatedAlerts.length}) : `;
        result.justification += elevatedAlerts.map(a => `${a.label} (${a.value}/10)`).join(', ') + '. ';
        result.justification += `Réduire l'intensité. Privilégier récupération.`;
        
        result.detailedRecommendations = {
            ppg: ['Récupération active', 'Mobilité', 'Étirements'],
            terrain: ['Volume très réduit', 'Technique légère uniquement'],
            alertes: alerts.map(a => `${a.icon} ${a.label}: ${a.message}`)
        };
        
        return result;
    }
    
    // ========================================================================
    // PRIORITÉ 2 (PERFORMANCE) : Recommandation basée sur phase + score
    // ========================================================================
    
    // Construire les recommandations détaillées basées sur la phase
    result.detailedRecommendations.ppg = [...phaseConfig.ppg];
    result.detailedRecommendations.terrain = [...phaseConfig.terrain];
    
    // Ajouter les alertes individuelles aux recommandations
    if (alerts && alerts.length > 0) {
        result.detailedRecommendations.alertes = alerts.map(a => `${a.icon} ${a.label}: ${a.message}`);
    }
    
    // Logique de décision basée sur phase et score
    if ((phase === 'Ovulatoire' || phase === 'Folliculaire') && score > 7.5) {
        // Phase haute énergie + bon score = INTENSITÉ
        result.iconType = 'Intensité';
        result.justification = `✅ Phase ${phase} (${phaseConfig.icon}) + Score excellent (${score.toFixed(1)}/10). `;
        result.justification += `${phaseConfig.objective}. `;
        result.justification += `C'est le moment idéal pour maximiser les gains en force et puissance !`;
        
    } else if ((phase === 'Ovulatoire' || phase === 'Folliculaire') && score > 6.0) {
        // Phase haute énergie + score correct = INTENSITÉ modérée
        result.iconType = 'Intensité';
        result.justification = `👍 Phase ${phase} (${phaseConfig.icon}) + Score correct (${score.toFixed(1)}/10). `;
        result.justification += `Opportunité pour l'intensité, avec vigilance. `;
        if (elevatedAlerts.length > 0) {
            result.justification += `Attention : ${elevatedAlerts.length} symptôme(s) à surveiller.`;
        }
        
    } else if ((phase === 'Lutéale' || phase === 'Menstruelle') && score > 6.0) {
        // Phase basse énergie + score acceptable = VOLUME
        result.iconType = 'Volume';
        result.justification = `📊 Phase ${phase} (${phaseConfig.icon}) + Score acceptable (${score.toFixed(1)}/10). `;
        result.justification += `${phaseConfig.objective}. `;
        result.justification += `Privilégier endurance, technique et tactique.`;
        
    } else if (phase === 'Menstruelle' && score <= 6.0) {
        // Phase menstruelle + score bas = REPOS
        result.iconType = 'Repos';
        result.justification = `🩸 Phase Menstruelle + Score bas (${score.toFixed(1)}/10). `;
        result.justification += `Priorité à la récupération. `;
        result.justification += `Focus mobilité, étirements, yoga si symptômes élevés.`;
        
        result.detailedRecommendations.ppg = ['🛌 Récupération prioritaire', 'Mobilité', 'Yoga', 'Étirements'];
        result.detailedRecommendations.terrain = ['Technique légère si besoin', 'Volume très modéré'];
        
    } else if (score <= 5.0) {
        // Score critique quelle que soit la phase
        result.iconType = 'Repos';
        result.justification = `⚠️ Score critique (${score.toFixed(1)}/10) en phase ${phase}. `;
        result.justification += `Repos recommandé. Vérifier récupération, sommeil et nutrition.`;
        
        result.detailedRecommendations.ppg = ['🛌 Repos', 'Récupération active légère'];
        result.detailedRecommendations.terrain = ['Pas d\'entraînement intensif'];
        
    } else {
        // Cas par défaut = VOLUME/Attention
        result.iconType = 'Volume';
        result.justification = `📋 Phase ${phase} (${phaseConfig.icon}) + Score moyen (${score.toFixed(1)}/10). `;
        result.justification += `Adapter l'entraînement selon le ressenti. `;
        result.justification += `Privilégier volume et technique.`;
    }
    
    // Ajouter les ajustements basés sur les alertes individuelles (non critiques)
    if (alerts && alerts.length > 0 && result.iconType !== 'Repos') {
        const alertAdjustments = [];
        
        alerts.forEach(alert => {
            if (alert.type === 'élevée' || alert.type === 'faible') {
                alertAdjustments.push(`${alert.icon} ${alert.label}`);
            }
        });
        
        if (alertAdjustments.length > 0) {
            result.justification += ` | Adaptations : ${alertAdjustments.join(', ')}.`;
        }
    }
    
    return result;
}

/**
 * Génère le HTML complet pour afficher la recommandation dans le popup coach
 * Répond à l'exigence UX/UI de la Page 8 des spécifications
 * 
 * @param {Object} recommendation - Objet retourné par getDetailedCycleRecommendation()
 * @param {number} dayOfCycle - Jour du cycle (JdC)
 * @returns {string} HTML formaté
 */
function generateRecommendationHTML(recommendation, dayOfCycle = 0) {
    const iconConfig = RECOMMENDATION_ICONS[recommendation.iconType] || RECOMMENDATION_ICONS['Attention'];
    const phaseInfo = recommendation.phaseInfo;
    
    let html = `
        <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
            <!-- En-tête Phase + Recommandation -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 24px;">${phaseInfo.icon}</span>
                    <div>
                        <div style="font-weight: 600; color: #1f2937;">J${dayOfCycle} - Phase ${phaseInfo.heroIne ? phaseInfo.heroIne.split('(')[0].trim() : ''}</div>
                        <div style="font-size: 12px; color: ${phaseInfo.color};">${phaseInfo.heroIne || ''}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: ${iconConfig.bgColor}; border-radius: 8px;">
                    <span style="font-size: 20px;">${iconConfig.icon}</span>
                    <span style="font-weight: 600; color: ${iconConfig.color};">${iconConfig.label}</span>
                </div>
            </div>
            
            <!-- Justification IA -->
            <div style="background: white; padding: 12px 16px; border-radius: 8px; border-left: 4px solid ${iconConfig.color}; margin-bottom: 16px;">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px; text-transform: uppercase;">💡 Recommandation IA</div>
                <div style="font-size: 14px; color: #1f2937; line-height: 1.5;">${recommendation.justification}</div>
            </div>
            
            <!-- Recommandations détaillées PPG et Terrain -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: white; padding: 12px; border-radius: 8px;">
                    <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase;">🏋️ PPG</div>
                    <ul style="margin: 0; padding-left: 16px; font-size: 13px; color: #374151;">
                        ${recommendation.detailedRecommendations.ppg.map(r => `<li style="margin-bottom: 4px;">${r}</li>`).join('')}
                    </ul>
                </div>
                <div style="background: white; padding: 12px; border-radius: 8px;">
                    <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase;">🏐 Terrain</div>
                    <ul style="margin: 0; padding-left: 16px; font-size: 13px; color: #374151;">
                        ${recommendation.detailedRecommendations.terrain.map(r => `<li style="margin-bottom: 4px;">${r}</li>`).join('')}
                    </ul>
                </div>
            </div>
    `;
    
    // Alertes si présentes
    if (recommendation.alertList && recommendation.alertList.length > 0) {
        html += `
            <div style="background: white; padding: 12px; border-radius: 8px;">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px; text-transform: uppercase;">⚠️ Alertes Symptômes (${recommendation.alertList.length})</div>
                ${generateCycleAlertsHTML(recommendation.alertList)}
            </div>
        `;
    }
    
    html += `</div>`;
    
    return html;
}

/**
 * Génère le badge de phase compact pour la carte joueuse dans le dashboard
 * 
 * @param {string} phase - Phase du cycle
 * @param {number} dayOfCycle - Jour du cycle
 * @param {string} iconType - Type d'icône de recommandation
 * @returns {string} HTML du badge compact
 */
function generateCycleBadgeHTML(phase, dayOfCycle, iconType) {
    const phaseConfig = CYCLE_PHASE_CONFIG[phase] || CYCLE_PHASE_CONFIG['Données manquantes'];
    const iconConfig = RECOMMENDATION_ICONS[iconType] || RECOMMENDATION_ICONS['Attention'];
    
    if (!phase || phase === 'Données manquantes' || dayOfCycle === 0) {
        return `
            <div style="display: flex; align-items: center; gap: 6px; padding: 4px 8px; background: #f3f4f6; border-radius: 6px; font-size: 11px; color: #6b7280;">
                <span>❓</span>
                <span>Cycle non configuré</span>
            </div>
        `;
    }
    
    return `
        <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
            <div style="display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: ${phaseConfig.color}20; border-radius: 6px; font-size: 11px; color: ${phaseConfig.color}; font-weight: 500;">
                <span>${phaseConfig.icon}</span>
                <span>J${dayOfCycle}</span>
                <span style="opacity: 0.7;">${phase.substring(0, 4)}.</span>
            </div>
            <div style="display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: ${iconConfig.bgColor}; border-radius: 6px; font-size: 11px; color: ${iconConfig.color}; font-weight: 500;">
                <span>${iconConfig.icon}</span>
                <span>${iconType}</span>
            </div>
        </div>
    `;
}

/**
 * Calcule la phase du cycle RÉELLE basée sur les check-ins
 * Si la joueuse répond "Non" aux règles au-delà de son cycle théorique,
 * on continue à compter (ex: J34 au lieu de revenir à J6)
 * 
 * @param {string} cycleStartDate - Date de début du cycle théorique
 * @param {number} [cycleLength=28] - Durée du cycle THÉORIQUE
 * @param {string} playerId - ID de la joueuse
 * @returns {Promise<{phase: string, dayOfCycle: number, isExtended: boolean}>}
 */
async function calculateCyclePhaseWithRealData(cycleStartDate, cycleLength = 28, playerId) {
    if (!cycleStartDate || !playerId) {
        return { phase: 'Données manquantes', dayOfCycle: 0, isExtended: false };
    }

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Utiliser cycleStartDate tel quel (mis à jour UNIQUEMENT par les boutons J1-J8)
        // PAS de recalcul automatique - seule la joueuse peut déclarer un nouveau J1
        let lastJ1 = new Date(cycleStartDate);
        lastJ1.setHours(0, 0, 0, 0);

        // Si le J1 est dans le futur (erreur de saisie), on le garde tel quel
        // La joueuse pourra corriger via "Corriger mon J1"
        if (lastJ1 > today) {
            return { phase: 'J1 futur', dayOfCycle: 0, isExtended: false };
        }

        // Calculer le jour dans le cycle depuis le dernier J1 déclaré
        // SANS créer automatiquement de nouveau cycle
        const diffTime = today - lastJ1;
        const daysSinceJ1 = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let dayOfCycle = daysSinceJ1 + 1;
        if (dayOfCycle <= 0) dayOfCycle = 1;

        // Cycle prolongé si on dépasse la durée théorique
        // On NE reset PAS à J1 automatiquement - on continue à compter (J34, J45, etc.)
        const isExtended = dayOfCycle > cycleLength;

        // Déterminer la phase
        let phase = 'Lutéale';
        if (dayOfCycle >= 1 && dayOfCycle <= 5) {
            phase = 'Menstruelle';
        } else if (dayOfCycle >= 6 && dayOfCycle <= 14) {
            phase = 'Folliculaire';
        } else if (dayOfCycle >= 15 && dayOfCycle <= 16) {
            phase = 'Ovulatoire';
        } else if (isExtended) {
            // Cycle prolongé - possible aménorrhée, on reste en phase "Prolongé"
            phase = 'Cycle prolongé';
        }

        return { phase, dayOfCycle, isExtended };

    } catch (error) {
        console.error('Erreur calcul phase cycle:', error);
        return calculateCyclePhase(cycleStartDate, cycleLength);
    }
}

/**
 * Calcule la phase du cycle à partir d'une date de début (VERSION THÉORIQUE)
 * Version JavaScript vanilla (sans export ES6)
 * 
 * @param {string} cycleStartDate - Date de début du cycle au format "YYYY-MM-DD"
 * @param {number} [cycleLength=28] - Durée du cycle en jours
 * @returns {{phase: string, dayOfCycle: number}}
 */
function calculateCyclePhase(cycleStartDate, cycleLength = 28) {
    if (!cycleStartDate) {
        return { phase: 'Données manquantes', dayOfCycle: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(cycleStartDate);
    startDate.setHours(0, 0, 0, 0);

    // Si J1 dans le futur, erreur de saisie
    if (startDate > today) {
        return { phase: 'J1 futur', dayOfCycle: 0 };
    }

    const diffTime = today - startDate;
    const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Calculer le jour depuis J1 SANS modulo - pas de reset automatique
    // Seule la joueuse peut déclarer un nouveau J1 via check-in
    let dayOfCycle = daysSinceStart + 1;
    if (dayOfCycle <= 0) dayOfCycle = 1;

    const isExtended = dayOfCycle > cycleLength;

    let phase = 'Lutéale';

    if (dayOfCycle >= 1 && dayOfCycle <= 5) {
        phase = 'Menstruelle';
    } else if (dayOfCycle >= 6 && dayOfCycle <= 14) {
        phase = 'Folliculaire';
    } else if (dayOfCycle >= 15 && dayOfCycle <= 16) {
        phase = 'Ovulatoire';
    } else if (isExtended) {
        phase = 'Cycle prolongé';
    }
    // Si JdC > 16 et pas extended, la phase reste 'Lutéale'
    
    return { phase, dayOfCycle };
}

/**
 * Applique les ajustements de score selon la phase du cycle
 * Version JavaScript vanilla (sans export ES6)
 * 
 * @param {number} baseScore - Score de base (0-10)
 * @param {string} phase - Phase du cycle
 * @returns {{adjustedScore: number, adjustment: number}}
 */
function applyCycleAdjustments(baseScore, phase) {
    const phaseConfig = CYCLE_PHASE_CONFIG[phase];
    const adjustment = phaseConfig ? phaseConfig.intensityModifier : 0;
    
    let adjustedScore = baseScore + adjustment;
    adjustedScore = Math.max(0, Math.min(10, adjustedScore)); // Clamp entre 0 et 10
    
    return { adjustedScore, adjustment };
}

// Exports globaux pour le module Cycle Alerts
window.generateCycleAlerts = generateCycleAlerts;
window.generateCycleAlertsHTML = generateCycleAlertsHTML;
window.getCycleRecommendationLevel = getCycleRecommendationLevel;
window.CYCLE_SYMPTOM_THRESHOLDS = CYCLE_SYMPTOM_THRESHOLDS;

// Exports globaux pour le module Synthèse de Recommandation (Module 3 & 4)
window.getDetailedCycleRecommendation = getDetailedCycleRecommendation;
window.generateRecommendationHTML = generateRecommendationHTML;
window.generateCycleBadgeHTML = generateCycleBadgeHTML;
window.calculateCyclePhase = calculateCyclePhase;
window.applyCycleAdjustments = applyCycleAdjustments;
window.CYCLE_PHASE_CONFIG = CYCLE_PHASE_CONFIG;
window.RECOMMENDATION_ICONS = RECOMMENDATION_ICONS;

console.log('Module Coach Alerts chargé');
console.log('Module Cycle Alerts (Règles B) chargé');
console.log('Module Synthèse Recommandation (Module 3 & 4) chargé');



// ============================================================================
// MODULE 5 - INTÉGRATION ALERTES SANTÉ (Aménorrhée, RED-S)
// ============================================================================

/**
 * Variable globale pour stocker les alertes santé
 */
let healthAlertsData = [];

/**
 * Charge les alertes santé pour toutes les joueuses
 * Utilise le module health-alerts.js
 */
async function loadHealthAlerts() {
    console.log('🏥 Chargement des alertes santé...');
    
    healthAlertsData = [];
    
    try {
        // Vérifier que le module HealthAlerts est chargé
        if (typeof window.HealthAlerts === 'undefined') {
            console.warn('⚠️ Module HealthAlerts non chargé');
            return [];
        }
        
        // Récupérer toutes les joueuses
        const playersSnapshot = await db.collection('players').get();
        
        for (const playerDoc of playersSnapshot.docs) {
            const playerId = playerDoc.id;
            const playerData = playerDoc.data();
            
            // Vérifier les alertes santé pour cette joueuse
            const alerts = await window.HealthAlerts.checkAllHealthAlerts(playerId);
            
            if (alerts.length > 0) {
                healthAlertsData.push({
                    playerId,
                    playerName: playerData.name || playerId,
                    photoURL: playerData.photoURL,
                    alerts: alerts
                });
                
                // Sauvegarder les alertes critiques en base
                for (const alert of alerts) {
                    if (alert.severity === 'critical') {
                        await window.HealthAlerts.saveHealthAlert(alert);
                    }
                }
            }
        }
        
        console.log(`🏥 ${healthAlertsData.length} joueuse(s) avec alertes santé`);
        
        // Mettre à jour le badge santé
        updateHealthAlertsBadge();
        
        return healthAlertsData;
        
    } catch (error) {
        console.error('❌ Erreur chargement alertes santé:', error);
        return [];
    }
}

/**
 * Met à jour le badge des alertes santé
 */
function updateHealthAlertsBadge() {
    const criticalCount = healthAlertsData.filter(p => 
        p.alerts.some(a => a.severity === 'critical')
    ).length;
    
    let badge = document.getElementById('healthAlertsBadge');
    const container = document.getElementById('healthAlertsContainer');
    
    if (criticalCount > 0) {
        if (!badge && container) {
            badge = document.createElement('span');
            badge.id = 'healthAlertsBadge';
            badge.style.cssText = `
                position: absolute;
                top: -8px;
                right: -8px;
                background: #dc2626;
                color: white;
                font-size: 12px;
                font-weight: bold;
                padding: 2px 6px;
                border-radius: 10px;
                min-width: 18px;
                text-align: center;
                animation: pulse 2s infinite;
            `;
            container.style.position = 'relative';
            container.appendChild(badge);
        }
        if (badge) {
            badge.textContent = criticalCount;
            badge.style.display = 'block';
        }
    } else if (badge) {
        badge.style.display = 'none';
    }
}

/**
 * Génère le HTML pour afficher les alertes santé dans le popup
 */
function generateHealthAlertsHTML() {
    if (healthAlertsData.length === 0) {
        return `
            <div style="text-align: center; padding: 20px; color: #10b981;">
                <span style="font-size: 32px;">✅</span>
                <p style="margin-top: 8px;">Aucune alerte santé détectée</p>
            </div>
        `;
    }
    
    let html = '<div class="health-alerts-list">';
    
    healthAlertsData.forEach(player => {
        const criticalAlerts = player.alerts.filter(a => a.severity === 'critical');
        const warningAlerts = player.alerts.filter(a => a.severity === 'warning');
        
        html += `
            <div style="
                background: ${criticalAlerts.length > 0 ? '#fef2f2' : '#fffbeb'};
                border-left: 4px solid ${criticalAlerts.length > 0 ? '#dc2626' : '#f59e0b'};
                padding: 16px;
                margin-bottom: 12px;
                border-radius: 8px;
            ">
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    ${player.photoURL ? 
                        `<img src="${player.photoURL}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover;">` :
                        `<div style="width: 40px; height: 40px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-weight: bold;">${player.playerName.charAt(0)}</div>`
                    }
                    <div>
                        <strong style="font-size: 16px;">${player.playerName}</strong>
                        <div style="font-size: 12px; color: #6b7280;">
                            ${criticalAlerts.length} alerte(s) critique(s), ${warningAlerts.length} avertissement(s)
                        </div>
                    </div>
                </div>
        `;
        
        player.alerts.forEach(alert => {
            html += `
                <div style="
                    background: white;
                    padding: 12px;
                    border-radius: 6px;
                    margin-top: 8px;
                    border: 1px solid ${alert.severity === 'critical' ? '#fecaca' : '#fde68a'};
                ">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 20px;">${alert.icon}</span>
                        <strong style="color: ${alert.color};">${alert.title}</strong>
                    </div>
                    <p style="margin: 0 0 8px 0; color: #374151;">${alert.message}</p>
                    <div style="
                        background: #f9fafb;
                        padding: 8px;
                        border-radius: 4px;
                        font-size: 13px;
                        color: #6b7280;
                    ">
                        <strong>💡 Recommandation :</strong><br>
                        ${alert.recommendation}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    html += '</div>';
    return html;
}

/**
 * Affiche le popup des alertes santé
 */
function showHealthAlertsPopup() {
    // Fermer les autres popups
    closeAlertsPopup();
    
    const overlay = document.createElement('div');
    overlay.id = 'healthAlertsOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fadeIn 0.2s ease-out;
    `;
    
    const popup = document.createElement('div');
    popup.style.cssText = `
        background: white;
        border-radius: 16px;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        animation: slideUp 0.3s ease-out;
    `;
    
    const criticalCount = healthAlertsData.filter(p => 
        p.alerts.some(a => a.severity === 'critical')
    ).length;
    
    popup.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
            color: white;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        ">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 28px;">🏥</span>
                <div>
                    <h2 style="margin: 0; font-size: 20px;">Alertes Santé</h2>
                    <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">
                        ${criticalCount > 0 ? `${criticalCount} alerte(s) critique(s) détectée(s)` : 'Surveillance de l\'équipe'}
                    </p>
                </div>
            </div>
            <button onclick="closeHealthAlertsPopup()" style="
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">×</button>
        </div>
        <div style="padding: 20px; max-height: 60vh; overflow-y: auto;">
            ${generateHealthAlertsHTML()}
        </div>
        <div style="padding: 16px; border-top: 1px solid #e5e7eb; text-align: center;">
            <button onclick="closeHealthAlertsPopup()" style="
                background: #dc2626;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
            ">Fermer</button>
        </div>
    `;
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeHealthAlertsPopup();
    });
}

/**
 * Ferme le popup des alertes santé
 */
function closeHealthAlertsPopup() {
    const overlay = document.getElementById('healthAlertsOverlay');
    if (overlay) overlay.remove();
}

/**
 * Crée le bouton des alertes santé dans le dashboard coach
 */
function createHealthAlertsButton() {
    // Chercher le conteneur des boutons d'action
    const actionsContainer = document.querySelector('.coach-actions') || 
                            document.querySelector('#coachDashboard .actions') ||
                            document.querySelector('#coachDashboard');
    
    if (!actionsContainer) {
        console.warn('⚠️ Conteneur pour bouton alertes santé non trouvé');
        return;
    }
    
    // Vérifier si le bouton existe déjà
    if (document.getElementById('healthAlertsButton')) return;
    
    const button = document.createElement('button');
    button.id = 'healthAlertsButton';
    button.innerHTML = '🏥 Alertes Santé';
    button.style.cssText = `
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        position: relative;
        margin-left: 8px;
    `;
    button.onclick = showHealthAlertsPopup;
    
    // Ajouter le conteneur pour le badge
    const container = document.createElement('div');
    container.id = 'healthAlertsContainer';
    container.style.cssText = 'position: relative; display: inline-block;';
    container.appendChild(button);
    
    // Insérer après le bouton d'alertes existant ou à la fin
    const alertsButton = document.getElementById('alertsButton');
    if (alertsButton && alertsButton.parentNode) {
        alertsButton.parentNode.insertBefore(container, alertsButton.nextSibling);
    } else {
        actionsContainer.appendChild(container);
    }
}

/**
 * Initialise le système d'alertes santé
 */
async function initHealthAlerts() {
    console.log('🏥 Initialisation des alertes santé...');
    
    // Charger les alertes
    await loadHealthAlerts();
    
    // Créer le bouton
    createHealthAlertsButton();
    
    // Afficher automatiquement si alertes critiques
    const hasCritical = healthAlertsData.some(p => 
        p.alerts.some(a => a.severity === 'critical')
    );
    
    if (hasCritical) {
        // Afficher après un délai pour laisser le dashboard se charger
        setTimeout(() => showHealthAlertsPopup(), 1200);
    }
    
    console.log('🏥 Alertes santé initialisées');
}

// Exports globaux pour les alertes santé
window.initHealthAlerts = initHealthAlerts;
window.loadHealthAlerts = loadHealthAlerts;
window.showHealthAlertsPopup = showHealthAlertsPopup;
window.closeHealthAlertsPopup = closeHealthAlertsPopup;
window.healthAlertsData = healthAlertsData;

console.log('✅ Module Coach Alerts avec Alertes Santé chargé');

