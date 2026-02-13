/**
 * Health Alerts Module - Alertes de Santé Critiques
 * 
 * Fonctionnalités :
 * - Alerte Aménorrhée : Absence de règles > 35 jours
 * - Alerte RED-S : Déficit énergétique relatif dans le sport
 * - Alerte Baisse de Performance : Tendance négative détectée
 * 
 * Basé sur les spécifications RPE Gen2 et les recommandations médicales
 */

console.log('✅ Module Health Alerts chargé');

// ============================================================================
// CONFIGURATION DES ALERTES
// ============================================================================

const HEALTH_ALERT_CONFIG = {
    amenorrhea: {
        threshold: 35,              // Jours sans règles
        severity: 'critical',
        icon: '🚨',
        color: '#dc2626',
        title: 'Alerte Aménorrhée',
        coachNotification: true,
        emailNotification: true
    },
    reds: {
        energyThreshold: 4,         // Score énergie < 4/10
        daysRequired: 7,            // Pendant 7 jours consécutifs
        severity: 'critical',
        icon: '⚠️',
        color: '#dc2626',
        title: 'Risque RED-S',
        coachNotification: true,
        emailNotification: true
    },
    performanceDrop: {
        dropThreshold: 1.5,         // Baisse de 1.5 points
        severity: 'warning',
        icon: '📉',
        color: '#f59e0b',
        title: 'Baisse de Performance',
        coachNotification: true,
        emailNotification: false
    }
};

// ============================================================================
// DÉTECTION AMÉNORRHÉE
// ============================================================================

/**
 * Vérifie si une joueuse présente une aménorrhée
 * Règle : Si dernier J1 > 35 jours → ALERTE CRITIQUE
 * 
 * @param {string} playerId - ID de la joueuse
 * @returns {Object|null} - Alerte si détectée, null sinon
 */
async function checkAmenorrhea(playerId) {
    try {
        // Récupérer les données de cycle depuis menstrualCycle (prioritaire) ou cycleProfiles (fallback)
        let cycleStartDate = null;

        // Essayer d'abord menstrualCycle (données mises à jour par check-in)
        const menstrualCycleDoc = await db.collection('menstrualCycle').doc(playerId).get();
        if (menstrualCycleDoc.exists && menstrualCycleDoc.data().cycleStartDate) {
            cycleStartDate = menstrualCycleDoc.data().cycleStartDate;
        } else {
            // Fallback sur cycleProfiles
            const cycleProfileDoc = await db.collection('cycleProfiles').doc(playerId).get();
            if (cycleProfileDoc.exists) {
                cycleStartDate = cycleProfileDoc.data().cycleStartDate || cycleProfileDoc.data().lastPeriodDate;
            }
        }

        if (!cycleStartDate) {
            console.log(`ℹ️ Pas de date J1 enregistrée pour ${playerId}`);
            return null;
        }

        // Calculer le nombre de jours depuis le dernier J1
        const lastPeriod = new Date(cycleStartDate);
        const today = new Date();
        const daysSinceLastPeriod = Math.floor((today - lastPeriod) / (1000 * 60 * 60 * 24));
        
        console.log(`📅 ${playerId}: ${daysSinceLastPeriod} jours depuis dernier J1`);
        
        // Vérifier le seuil
        if (daysSinceLastPeriod > HEALTH_ALERT_CONFIG.amenorrhea.threshold) {
            return {
                type: 'amenorrhea',
                playerId: playerId,
                severity: HEALTH_ALERT_CONFIG.amenorrhea.severity,
                icon: HEALTH_ALERT_CONFIG.amenorrhea.icon,
                color: HEALTH_ALERT_CONFIG.amenorrhea.color,
                title: HEALTH_ALERT_CONFIG.amenorrhea.title,
                message: `Absence de règles depuis ${daysSinceLastPeriod} jours`,
                details: {
                    daysSinceLastPeriod,
                    lastPeriodDate,
                    threshold: HEALTH_ALERT_CONFIG.amenorrhea.threshold
                },
                recommendation: 'Consultation médicale recommandée. L\'aménorrhée peut être un signe de déficit énergétique ou d\'autres problèmes de santé.',
                notifyCoach: HEALTH_ALERT_CONFIG.amenorrhea.coachNotification,
                sendEmail: HEALTH_ALERT_CONFIG.amenorrhea.emailNotification,
                timestamp: new Date()
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Erreur vérification aménorrhée:', error);
        return null;
    }
}

// ============================================================================
// DÉTECTION RED-S (Déficit Énergétique Relatif)
// ============================================================================

/**
 * Vérifie si une joueuse présente des signes de RED-S
 * Règle : Si Aménorrhée OU Score Énergie < 4/10 pendant 7 jours → ALERTE CRITIQUE
 * 
 * @param {string} playerId - ID de la joueuse
 * @param {Object|null} amenorrheaAlert - Alerte aménorrhée si déjà détectée
 * @returns {Object|null} - Alerte si détectée, null sinon
 */
async function checkREDS(playerId, amenorrheaAlert = null) {
    try {
        // Si aménorrhée déjà détectée → RED-S automatique
        if (amenorrheaAlert) {
            return {
                type: 'reds',
                playerId: playerId,
                severity: HEALTH_ALERT_CONFIG.reds.severity,
                icon: HEALTH_ALERT_CONFIG.reds.icon,
                color: HEALTH_ALERT_CONFIG.reds.color,
                title: HEALTH_ALERT_CONFIG.reds.title,
                message: 'Risque de déficit énergétique relatif (RED-S) détecté - Aménorrhée présente',
                details: {
                    trigger: 'amenorrhea',
                    amenorrheaDetails: amenorrheaAlert.details
                },
                recommendation: 'Consultation urgente avec médecin du sport et nutritionniste recommandée. Le RED-S peut avoir des conséquences graves sur la santé et la performance.',
                notifyCoach: HEALTH_ALERT_CONFIG.reds.coachNotification,
                sendEmail: HEALTH_ALERT_CONFIG.reds.emailNotification,
                timestamp: new Date()
            };
        }
        
        // Vérifier les scores d'énergie des 7 derniers jours
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        
        const checkinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .where('date', '>=', sevenDaysAgoStr)
            .orderBy('date', 'desc')
            .get();
        
        if (checkinsSnapshot.empty || checkinsSnapshot.size < 5) {
            // Pas assez de données pour évaluer
            return null;
        }
        
        // Calculer la moyenne des scores d'énergie
        // Note: Si le champ 'energy' n'existe pas, on utilise une estimation basée sur le score global
        let energyScores = [];
        checkinsSnapshot.forEach(doc => {
            const data = doc.data();
            // Utiliser energy si disponible, sinon estimer à partir du score global
            const energy = data.energy || data.score || 5;
            energyScores.push(energy);
        });
        
        const avgEnergy = energyScores.reduce((a, b) => a + b, 0) / energyScores.length;
        const lowEnergyDays = energyScores.filter(e => e < HEALTH_ALERT_CONFIG.reds.energyThreshold).length;
        
        console.log(`⚡ ${playerId}: Énergie moyenne = ${avgEnergy.toFixed(1)}, Jours faibles = ${lowEnergyDays}`);
        
        // Alerte si énergie moyenne < 4 OU si plus de 5 jours avec énergie < 4
        if (avgEnergy < HEALTH_ALERT_CONFIG.reds.energyThreshold || lowEnergyDays >= 5) {
            return {
                type: 'reds',
                playerId: playerId,
                severity: HEALTH_ALERT_CONFIG.reds.severity,
                icon: HEALTH_ALERT_CONFIG.reds.icon,
                color: HEALTH_ALERT_CONFIG.reds.color,
                title: HEALTH_ALERT_CONFIG.reds.title,
                message: `Risque de déficit énergétique - Énergie faible depuis ${lowEnergyDays} jours`,
                details: {
                    trigger: 'low_energy',
                    avgEnergy: avgEnergy.toFixed(1),
                    lowEnergyDays,
                    energyScores,
                    threshold: HEALTH_ALERT_CONFIG.reds.energyThreshold
                },
                recommendation: 'Évaluer l\'apport nutritionnel et la charge d\'entraînement. Consultation nutritionniste recommandée.',
                notifyCoach: HEALTH_ALERT_CONFIG.reds.coachNotification,
                sendEmail: HEALTH_ALERT_CONFIG.reds.emailNotification,
                timestamp: new Date()
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Erreur vérification RED-S:', error);
        return null;
    }
}

// ============================================================================
// DÉTECTION BAISSE DE PERFORMANCE
// ============================================================================

/**
 * Vérifie si une joueuse présente une baisse de performance
 * Règle : Si Moyenne 3 jours < Moyenne 7 jours - 1.5 points → ALERTE WARNING
 * 
 * @param {string} playerId - ID de la joueuse
 * @returns {Object|null} - Alerte si détectée, null sinon
 */
async function checkPerformanceDrop(playerId) {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        
        const checkinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .where('date', '>=', sevenDaysAgoStr)
            .orderBy('date', 'desc')
            .get();
        
        if (checkinsSnapshot.empty || checkinsSnapshot.size < 5) {
            return null;
        }
        
        // Récupérer les scores
        let scores = [];
        checkinsSnapshot.forEach(doc => {
            const data = doc.data();
            scores.push({
                date: data.date,
                score: data.score || 5
            });
        });
        
        // Trier par date (plus récent en premier)
        scores.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Calculer les moyennes
        const last3Days = scores.slice(0, 3);
        const last7Days = scores;
        
        if (last3Days.length < 3) return null;
        
        const avg3Days = last3Days.reduce((sum, s) => sum + s.score, 0) / last3Days.length;
        const avg7Days = last7Days.reduce((sum, s) => sum + s.score, 0) / last7Days.length;
        
        const drop = avg7Days - avg3Days;
        
        console.log(`📊 ${playerId}: Moy 3j = ${avg3Days.toFixed(1)}, Moy 7j = ${avg7Days.toFixed(1)}, Baisse = ${drop.toFixed(1)}`);
        
        if (drop >= HEALTH_ALERT_CONFIG.performanceDrop.dropThreshold) {
            return {
                type: 'performance_drop',
                playerId: playerId,
                severity: HEALTH_ALERT_CONFIG.performanceDrop.severity,
                icon: HEALTH_ALERT_CONFIG.performanceDrop.icon,
                color: HEALTH_ALERT_CONFIG.performanceDrop.color,
                title: HEALTH_ALERT_CONFIG.performanceDrop.title,
                message: `Baisse de ${drop.toFixed(1)} points détectée sur les 3 derniers jours`,
                details: {
                    avg3Days: avg3Days.toFixed(1),
                    avg7Days: avg7Days.toFixed(1),
                    drop: drop.toFixed(1),
                    threshold: HEALTH_ALERT_CONFIG.performanceDrop.dropThreshold
                },
                recommendation: 'Surveiller la récupération et adapter la charge d\'entraînement si nécessaire.',
                notifyCoach: HEALTH_ALERT_CONFIG.performanceDrop.coachNotification,
                sendEmail: HEALTH_ALERT_CONFIG.performanceDrop.emailNotification,
                timestamp: new Date()
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Erreur vérification baisse performance:', error);
        return null;
    }
}

// ============================================================================
// FONCTION PRINCIPALE - VÉRIFIER TOUTES LES ALERTES SANTÉ
// ============================================================================

/**
 * Vérifie toutes les alertes de santé pour une joueuse
 * 
 * @param {string} playerId - ID de la joueuse
 * @returns {Array} - Liste des alertes détectées
 */
async function checkAllHealthAlerts(playerId) {
    const alerts = [];
    
    // 1. Vérifier l'aménorrhée
    const amenorrheaAlert = await checkAmenorrhea(playerId);
    if (amenorrheaAlert) {
        alerts.push(amenorrheaAlert);
    }
    
    // 2. Vérifier le RED-S (passe l'alerte aménorrhée si présente)
    const redsAlert = await checkREDS(playerId, amenorrheaAlert);
    if (redsAlert) {
        alerts.push(redsAlert);
    }
    
    // 3. Vérifier la baisse de performance
    const performanceAlert = await checkPerformanceDrop(playerId);
    if (performanceAlert) {
        alerts.push(performanceAlert);
    }
    
    return alerts;
}

/**
 * Vérifie les alertes de santé pour toutes les joueuses
 * 
 * @returns {Object} - Alertes groupées par joueuse
 */
async function checkAllPlayersHealthAlerts() {
    const allAlerts = {};
    
    try {
        // Récupérer toutes les joueuses
        const playersSnapshot = await db.collection('players').get();
        
        for (const playerDoc of playersSnapshot.docs) {
            const playerId = playerDoc.id;
            const playerData = playerDoc.data();
            
            const alerts = await checkAllHealthAlerts(playerId);
            
            if (alerts.length > 0) {
                allAlerts[playerId] = {
                    playerName: playerData.name || playerId,
                    alerts: alerts
                };
            }
        }
        
        console.log(`🏥 Alertes santé détectées pour ${Object.keys(allAlerts).length} joueuse(s)`);
        
        return allAlerts;
        
    } catch (error) {
        console.error('❌ Erreur vérification alertes santé globales:', error);
        return {};
    }
}

// ============================================================================
// SAUVEGARDE DES ALERTES EN BASE
// ============================================================================

/**
 * Sauvegarde une alerte en base de données
 * 
 * @param {Object} alert - L'alerte à sauvegarder
 */
async function saveHealthAlert(alert) {
    try {
        const alertId = `${alert.playerId}_${alert.type}_${new Date().toISOString().split('T')[0]}`;
        
        await db.collection('healthAlerts').doc(alertId).set({
            ...alert,
            acknowledged: false,
            acknowledgedBy: null,
            acknowledgedAt: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log(`💾 Alerte sauvegardée: ${alertId}`);
        
    } catch (error) {
        console.error('❌ Erreur sauvegarde alerte:', error);
    }
}

/**
 * Marque une alerte comme acquittée par le coach
 * 
 * @param {string} alertId - ID de l'alerte
 * @param {string} coachId - ID du coach
 */
async function acknowledgeHealthAlert(alertId, coachId) {
    try {
        await db.collection('healthAlerts').doc(alertId).update({
            acknowledged: true,
            acknowledgedBy: coachId,
            acknowledgedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`✅ Alerte acquittée: ${alertId}`);
        
    } catch (error) {
        console.error('❌ Erreur acquittement alerte:', error);
    }
}

// ============================================================================
// AFFICHAGE DES ALERTES
// ============================================================================

/**
 * Génère le HTML pour afficher une alerte de santé
 * 
 * @param {Object} alert - L'alerte à afficher
 * @returns {string} - HTML de l'alerte
 */
function renderHealthAlert(alert) {
    const severityClass = alert.severity === 'critical' ? 'health-alert-critical' : 'health-alert-warning';
    
    return `
        <div class="health-alert ${severityClass}" style="
            background: ${alert.severity === 'critical' ? '#fef2f2' : '#fffbeb'};
            border-left: 4px solid ${alert.color};
            padding: 16px;
            margin-bottom: 12px;
            border-radius: 8px;
        ">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <span style="font-size: 24px;">${alert.icon}</span>
                <div>
                    <strong style="color: ${alert.color}; font-size: 16px;">${alert.title}</strong>
                    <p style="margin: 4px 0 0 0; color: #374151;">${alert.message}</p>
                </div>
            </div>
            <div style="
                background: white;
                padding: 12px;
                border-radius: 6px;
                margin-top: 8px;
                font-size: 14px;
                color: #6b7280;
            ">
                <strong>💡 Recommandation :</strong><br>
                ${alert.recommendation}
            </div>
        </div>
    `;
}

/**
 * Affiche toutes les alertes de santé dans un conteneur
 * 
 * @param {string} containerId - ID du conteneur HTML
 * @param {Array} alerts - Liste des alertes
 */
function displayHealthAlerts(containerId, alerts) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (alerts.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #10b981;">
                <span style="font-size: 32px;">✅</span>
                <p>Aucune alerte de santé détectée</p>
            </div>
        `;
        return;
    }
    
    // Trier par sévérité (critical d'abord)
    alerts.sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (a.severity !== 'critical' && b.severity === 'critical') return 1;
        return 0;
    });
    
    container.innerHTML = alerts.map(alert => renderHealthAlert(alert)).join('');
}

// ============================================================================
// EXPORTS GLOBAUX
// ============================================================================

window.HealthAlerts = {
    checkAmenorrhea,
    checkREDS,
    checkPerformanceDrop,
    checkAllHealthAlerts,
    checkAllPlayersHealthAlerts,
    saveHealthAlert,
    acknowledgeHealthAlert,
    renderHealthAlert,
    displayHealthAlerts,
    config: HEALTH_ALERT_CONFIG
};

console.log('🏥 Module Health Alerts prêt');

