/**
 * Training Streaks - Système de gamification pour les entraînements RPE
 * Basé sur un système de "semaines complètes" plutôt que jours consécutifs
 * 
 * Logique : Lundi-Jeudi = 2 séances min attendues, Vendredi = 1 séance
 * Une semaine "parfaite" = toutes les séances attendues remplies
 */

console.log('💪 Chargement training-streaks.js');

/**
 * Structure de la semaine d'entraînement
 * Lundi-Jeudi : 2 séances attendues (matin/soir)
 * Vendredi : 1 séance attendue
 * Samedi-Dimanche : repos (0 attendu mais bonus si rempli)
 */
const TRAINING_WEEK_TEMPLATE = {
    1: { name: 'Lundi', expected: 2 },
    2: { name: 'Mardi', expected: 2 },
    3: { name: 'Mercredi', expected: 2 },
    4: { name: 'Jeudi', expected: 2 },
    5: { name: 'Vendredi', expected: 1 },
    6: { name: 'Samedi', expected: 0 },
    0: { name: 'Dimanche', expected: 0 }
};

// Total séances attendues par semaine
const WEEKLY_EXPECTED_SESSIONS = 9; // 2+2+2+2+1

/**
 * Vérifie et réinitialise les stats si une nouvelle semaine a commencé
 * À appeler au chargement du dashboard
 */
async function checkAndResetWeeklyStats(playerId) {
    try {
        const today = new Date();
        const currentWeekStart = getWeekStartDate();
        
        const stats = await getTrainingStats(playerId);
        if (!stats) return;
        
        console.log(`🔍 Vérification semaine - Actuelle: ${currentWeekStart}, Enregistrée: ${stats.weekStartDate}`);
        
        // Compter TOUJOURS les RPEs de la semaine en cours pour avoir le compte exact
        const currentWeekRPEs = await db.collection('rpe')
            .where('playerId', '==', playerId)
            .where('date', '>=', currentWeekStart)
            .get();
        const actualWeekSessionsCount = currentWeekRPEs.size;
        
        console.log(`📊 RPEs trouvés pour cette semaine (${currentWeekStart}): ${actualWeekSessionsCount}`);
        
        // Si on est dans une nouvelle semaine, réinitialiser
        if (stats.weekStartDate && stats.weekStartDate !== currentWeekStart) {
            console.log('🔄 Nouvelle semaine détectée - Réinitialisation des stats hebdomadaires');
            
            const wasWeekComplete = stats.currentWeekSessions >= 9; // 9/9 obligatoires
            const wasWeekPerfect = stats.currentWeekSessions >= WEEKLY_EXPECTED_SESSIONS; // 13/13
            let newWeeklyStreak = wasWeekPerfect ? (stats.weeklyStreak || 0) + 1 : 0;
            let isNewRecord = newWeeklyStreak > (stats.longestWeeklyStreak || 0);
            
            await db.collection('players').doc(playerId).collection('stats').doc('training').update({
                weeklyStreak: newWeeklyStreak,
                longestWeeklyStreak: isNewRecord ? newWeeklyStreak : stats.longestWeeklyStreak,
                currentWeekSessions: actualWeekSessionsCount, // Utiliser le compte réel
                currentWeekBonus: 0,
                perfectWeeks: wasWeekPerfect ? (stats.perfectWeeks || 0) + 1 : stats.perfectWeeks,
                weeksCompleteCount: wasWeekComplete ? (stats.weeksCompleteCount || 0) + 1 : (stats.weeksCompleteCount || 0),
                weeksPerfectCount: wasWeekPerfect ? (stats.weeksPerfectCount || 0) + 1 : (stats.weeksPerfectCount || 0),
                weekStartDate: currentWeekStart
            });
            
            console.log(`✅ Stats réinitialisées pour la semaine du ${currentWeekStart} - Séances: ${actualWeekSessionsCount}/9`);
        } else if (stats.currentWeekSessions !== actualWeekSessionsCount) {
            // Même semaine mais le compteur est désynchronisé - le mettre à jour
            console.log(`🔄 Mise à jour du compteur: ${stats.currentWeekSessions} → ${actualWeekSessionsCount}`);
            await db.collection('players').doc(playerId).collection('stats').doc('training').update({
                currentWeekSessions: actualWeekSessionsCount
            });
            console.log(`✅ Compteur mis à jour: ${actualWeekSessionsCount}/9 séances`);
        } else {
            console.log(`✅ Même semaine - Compteur à jour (${stats.currentWeekSessions}/9 séances)`);
        }
    } catch (error) {
        console.error('Erreur checkAndResetWeeklyStats:', error);
    }
}

/**
 * Récupère les stats d'entraînement d'une joueuse
 */
async function getTrainingStats(playerId) {
    try {
        const statsRef = db.collection('players').doc(playerId).collection('stats').doc('training');
        const statsDoc = await statsRef.get();
        
        if (statsDoc.exists) {
            return statsDoc.data();
        } else {
            const defaultStats = {
                weeklyStreak: 0,        // Semaines parfaites consécutives
                longestWeeklyStreak: 0, // Record de semaines parfaites
                currentWeekSessions: 0, // Séances cette semaine
                currentWeekBonus: 0,    // Séances bonus (week-end)
                lastRpeDate: null,
                totalSessions: 0,
                perfectWeeks: 0,        // Total de semaines parfaites
                weeksCompleteCount: 0,  // Compteur de semaines complètes (9/9)
                weeksPerfectCount: 0,   // Compteur de semaines parfaites (13/13)
                weekStartDate: getWeekStartDate()
            };
            await statsRef.set(defaultStats);
            return defaultStats;
        }
    } catch (error) {
        console.error('Erreur getTrainingStats:', error);
        return null;
    }
}

/**
 * Retourne la date du lundi de la semaine en cours
 */
function getWeekStartDate() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    return monday.toISOString().split('T')[0];
}

/**
 * Met à jour les stats après un RPE
 * @returns {object} - Résultat avec message et niveau
 */
async function updateTrainingStreak(playerId) {
    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const dayOfWeek = today.getDay();
        const currentWeekStart = getWeekStartDate();
        
        const stats = await getTrainingStats(playerId);
        if (!stats) return null;
        
        // Vérifier si on a changé de semaine
        if (stats.weekStartDate !== currentWeekStart) {
            // Nouvelle semaine ! Évaluer la semaine précédente
            const wasWeekComplete = stats.currentWeekSessions >= 9; // 9/9 obligatoires
            const wasWeekPerfect = stats.currentWeekSessions >= WEEKLY_EXPECTED_SESSIONS;
            
            let newWeeklyStreak = wasWeekPerfect ? (stats.weeklyStreak || 0) + 1 : 0;
            let isNewRecord = newWeeklyStreak > (stats.longestWeeklyStreak || 0);
            
            // Reset pour la nouvelle semaine
            // Compter les RPE déjà faits pour la NOUVELLE semaine
            const newWeekRPEs = await db.collection('rpe')
                .where('playerId', '==', playerId)
                .where('date', '>=', currentWeekStart)
                .get();
            const newWeekSessionsCount = newWeekRPEs.size;

            await db.collection('players').doc(playerId).collection('stats').doc('training').update({
                weeklyStreak: newWeeklyStreak,
                longestWeeklyStreak: isNewRecord ? newWeeklyStreak : stats.longestWeeklyStreak,
                currentWeekSessions: newWeekSessionsCount + 1, // +1 pour l'actuel RPE
                currentWeekBonus: dayOfWeek === 0 || dayOfWeek === 6 ? (newWeekSessionsCount > 0 ? newWeekSessionsCount + 1 : 1) : 0,
                lastRpeDate: todayStr,
                totalSessions: (stats.totalSessions || 0) + 1,
                perfectWeeks: wasWeekPerfect ? (stats.perfectWeeks || 0) + 1 : stats.perfectWeeks,
                weeksCompleteCount: wasWeekComplete ? (stats.weeksCompleteCount || 0) + 1 : (stats.weeksCompleteCount || 0),
                weeksPerfectCount: wasWeekPerfect ? (stats.weeksPerfectCount || 0) + 1 : (stats.weeksPerfectCount || 0),
                weekStartDate: currentWeekStart
            });
            
            // Message de début de semaine
            if (wasWeekPerfect && newWeeklyStreak > 0) {
                return {
                    message: `🏆 Semaine parfaite ! ${newWeeklyStreak} semaine${newWeeklyStreak > 1 ? 's' : ''} d'affilée`,
                    level: 'perfect',
                    streak: newWeeklyStreak,
                    isNewRecord
                };
            }
            
            return {
                message: '🎯 Nouvelle semaine, nouveaux objectifs !',
                level: 'new_week',
                streak: newWeeklyStreak
            };
        }
        
        // Même semaine - vérifier si déjà rempli aujourd'hui
        if (stats.lastRpeDate === todayStr) {
            // Deuxième séance du jour
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const newBonus = isWeekend ? (stats.currentWeekBonus || 0) + 1 : stats.currentWeekBonus;
            const newSessions = stats.currentWeekSessions + 1;
            
            await db.collection('players').doc(playerId).collection('stats').doc('training').update({
                currentWeekSessions: newSessions,
                currentWeekBonus: newBonus,
                totalSessions: (stats.totalSessions || 0) + 1
            });
            
            return generateTrainingMessage(newSessions, isWeekend);
        }
        
        // Première séance du jour
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const newSessions = stats.currentWeekSessions + 1;
        const newBonus = isWeekend ? (stats.currentWeekBonus || 0) + 1 : stats.currentWeekBonus;
        
        await db.collection('players').doc(playerId).collection('stats').doc('training').update({
            currentWeekSessions: newSessions,
            currentWeekBonus: newBonus,
            lastRpeDate: todayStr,
            totalSessions: (stats.totalSessions || 0) + 1
        });
        
        return generateTrainingMessage(newSessions, isWeekend);
        
    } catch (error) {
        console.error('Erreur updateTrainingStreak:', error);
        return null;
    }
}

/**
 * Génère un message motivationnel basé sur la progression
 */
function generateTrainingMessage(sessionsThisWeek, isBonus = false) {
    const percentage = Math.round((sessionsThisWeek / WEEKLY_EXPECTED_SESSIONS) * 100);
    
    if (isBonus) {
        return {
            message: '⭐ Séance bonus ! Tu fais des extras !',
            level: 'bonus',
            progress: percentage
        };
    }
    
    // Messages progressifs selon l'avancement de la semaine
    if (sessionsThisWeek >= WEEKLY_EXPECTED_SESSIONS) {
        return {
            message: '🎯 SEMAINE PARFAITE ! Objectif atteint !',
            level: 'perfect',
            progress: 100
        };
    } else if (sessionsThisWeek >= 7) {
        return {
            message: `🔥 ${sessionsThisWeek}/${WEEKLY_EXPECTED_SESSIONS} - La fin est proche !`,
            level: 'high',
            progress: percentage
        };
    } else if (sessionsThisWeek >= 5) {
        return {
            message: `💪 ${sessionsThisWeek}/${WEEKLY_EXPECTED_SESSIONS} - Plus que la moitié !`,
            level: 'medium',
            progress: percentage
        };
    } else if (sessionsThisWeek >= 3) {
        return {
            message: `👊 ${sessionsThisWeek}/${WEEKLY_EXPECTED_SESSIONS} - Bon début de semaine !`,
            level: 'low',
            progress: percentage
        };
    } else {
        return {
            message: `✅ ${sessionsThisWeek}/${WEEKLY_EXPECTED_SESSIONS} - C'est parti !`,
            level: 'start',
            progress: percentage
        };
    }
}

/**
 * Affiche le widget de progression hebdomadaire
 */
async function displayTrainingWidget(playerId) {
    const container = document.getElementById('trainingProgressWidget');
    if (!container) return;
    
    try {
        const stats = await getTrainingStats(playerId);
        console.log('Training Streaks: Stats récupérées:', stats);
        
        const sessions = stats?.currentWeekSessions || 0;
        const weeklyStreak = stats?.weeklyStreak || 0;
        const progress = Math.min(100, Math.round((sessions / WEEKLY_EXPECTED_SESSIONS) * 100));
        const remaining = WEEKLY_EXPECTED_SESSIONS - sessions;
        
        // Couleur selon la progression
        let progressColor = '#3b82f6'; // Bleu
        if (progress >= 100) {
            progressColor = '#10b981'; // Vert
        } else if (progress >= 75) {
            progressColor = '#f59e0b'; // Orange
        }
        
        container.innerHTML = `
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="font-size: 14px; font-weight: 600; color: #1f2937;">📊 Objectif Semaine</div>
                    <div style="font-size: 12px; color: #6b7280;">${sessions}/${WEEKLY_EXPECTED_SESSIONS} séances</div>
                </div>
                
                <!-- Barre de progression -->
                <div style="height: 10px; background: #e5e7eb; border-radius: 5px; overflow: hidden; margin-bottom: 12px;">
                    <div style="height: 100%; width: ${progress}%; background: ${progressColor}; border-radius: 5px; transition: width 0.5s ease;"></div>
                </div>
                
                <!-- Message -->
                <div style="font-size: 13px; color: ${progressColor}; font-weight: 500;">
                    ${progress >= 100 ? 
                        '🎯 Semaine parfaite !' : 
                        sessions === 0 ? 
                            '💪 Logguez votre première séance !' :
                            `Plus que ${remaining} séance${remaining > 1 ? 's' : ''} !`
                    }
                </div>
                
                <!-- Streak de semaines si > 0 -->
                ${weeklyStreak > 0 ? `
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 20px;">🏆</span>
                        <span style="font-size: 12px; color: #6b7280;">${weeklyStreak} semaine${weeklyStreak > 1 ? 's' : ''} parfaite${weeklyStreak > 1 ? 's' : ''} d'affilée</span>
                    </div>
                ` : ''}
                
                <!-- Bonus week-end -->
                ${(stats?.currentWeekBonus || 0) > 0 ? `
                    <div style="margin-top: 8px; font-size: 11px; color: #8b5cf6;">
                        ⭐ +${stats.currentWeekBonus} séance${stats.currentWeekBonus > 1 ? 's' : ''} bonus cette semaine
                    </div>
                ` : ''}
            </div>
        `;
        container.style.display = 'block';
        
    } catch (error) {
        console.error('Erreur displayTrainingWidget:', error);
        container.style.display = 'none';
    }
}

/**
 * Affiche la célébration après un RPE
 */
function showTrainingCelebration(result) {
    if (!result || !result.message) return;
    if (result.level === 'start' || result.level === 'new_week') return; // Pas de célébration pour début
    
    const toast = document.createElement('div');
    toast.className = 'training-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #3b82f6, #1d4ed8);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 10px 40px rgba(59, 130, 246, 0.4);
        animation: slideUp 0.3s ease;
        max-width: 90%;
        text-align: center;
    `;
    
    // Couleur selon le niveau
    if (result.level === 'perfect') {
        toast.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    } else if (result.level === 'bonus') {
        toast.style.background = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
    }
    
    toast.innerHTML = `
        <div>${result.message}</div>
        ${result.progress ? `<div style="font-size: 12px; opacity: 0.8; margin-top: 4px;">${result.progress}% de l'objectif</div>` : ''}
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideDown 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Ajouter les animations CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { transform: translateX(-50%) translateY(100px); opacity: 0; }
        to { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes slideDown {
        from { transform: translateX(-50%) translateY(0); opacity: 1; }
        to { transform: translateX(-50%) translateY(100px); opacity: 0; }
    }
    @keyframes bounceIn {
        0% { transform: scale(0.5); opacity: 0; }
        70% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
    }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
document.head.appendChild(style);

// Exposer les fonctions globalement
window.getTrainingStats = getTrainingStats;
window.updateTrainingStreak = updateTrainingStreak;
window.displayTrainingWidget = displayTrainingWidget;
window.showTrainingCelebration = showTrainingCelebration;
window.checkAndResetWeeklyStats = checkAndResetWeeklyStats;

console.log('✅ Training Streaks chargé');
