/**
 * Engagement Dashboard - Tableau de bord engagement pour le coach
 * Affiche les streaks, la progression et les alertes
 */

console.log('📊 Chargement engagement-dashboard.js');

/**
 * Charge et affiche le dashboard d'engagement
 */
async function loadEngagementDashboard() {
    const container = document.getElementById('engagementContent');
    if (!container) {
        console.log('Engagement: Container non trouvé');
        return;
    }
    
    container.innerHTML = '<p style="text-align: center; color: #666;">Chargement...</p>';
    
    try {
        // Récupérer toutes les joueuses actives
        const playersSnapshot = await db.collection('players').get();
        const players = [];
        
        for (const doc of playersSnapshot.docs) {
            const data = doc.data();
            if (data.status && data.status !== 'active') continue;
            if (data.role === 'coach') continue; // Exclure les coachs
            
            // Récupérer les stats d'engagement (peut ne pas exister)
            let engagementData = null;
            let trainingData = null;
            
            try {
                const engagementDoc = await db.collection('players').doc(doc.id)
                    .collection('stats').doc('engagement').get();
                engagementData = engagementDoc.exists ? engagementDoc.data() : {
                    currentStreak: 0,
                    longestStreak: 0,
                    totalCheckIns: 0,
                    lastCheckInDate: null
                };
            } catch (err) {
                console.warn('Stats engagement non accessibles pour', doc.id, err);
                engagementData = { currentStreak: 0, longestStreak: 0, totalCheckIns: 0, lastCheckInDate: null };
            }
            
            try {
                const trainingDoc = await db.collection('players').doc(doc.id)
                    .collection('stats').doc('training').get();
                trainingData = trainingDoc.exists ? trainingDoc.data() : {
                    currentWeekSessions: 0,
                    weeklyStreak: 0
                };
            } catch (err) {
                console.warn('Stats training non accessibles pour', doc.id, err);
                trainingData = { currentWeekSessions: 0, weeklyStreak: 0 };
            }
            
            players.push({
                id: doc.id,
                name: data.name,
                photoURL: data.photoURL,
                engagement: engagementData,
                training: trainingData
            });
        }
        
        // Calculer les métriques globales
        const today = new Date().toISOString().split('T')[0];
        const checkinsToday = await db.collection('checkins')
            .where('date', '==', today)
            .get();
        
        const filledToday = new Set(checkinsToday.docs.map(d => d.data().playerId)).size;
        const totalActive = players.length;
        const fillRate = totalActive > 0 ? Math.round((filledToday / totalActive) * 100) : 0;
        
        // Trier par streak
        players.sort((a, b) => {
            const streakA = a.engagement?.currentStreak || 0;
            const streakB = b.engagement?.currentStreak || 0;
            return streakB - streakA;
        });
        
        // Identifier les joueuses à risque (pas rempli depuis 2+ jours)
        const atRiskPlayers = players.filter(p => {
            if (!p.engagement?.lastCheckInDate) return true;
            const lastDate = new Date(p.engagement.lastCheckInDate);
            const diffDays = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
            return diffDays >= 2;
        });
        
        // Construire le HTML
        let html = `
            <!-- Résumé du jour -->
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
                <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700;">${filledToday}/${totalActive}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Check-ins aujourd'hui</div>
                    <div style="font-size: 11px; margin-top: 4px; opacity: 0.7;">${fillRate}%</div>
                </div>
                <div style="background: linear-gradient(135deg, #f97316, #ea580c); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700;">${players.filter(p => (p.engagement?.currentStreak || 0) >= 7).length}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Streaks 7+ jours</div>
                </div>
                <div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 20px; border-radius: 12px; text-align: center;">
                    <div style="font-size: 32px; font-weight: 700;">${atRiskPlayers.length}</div>
                    <div style="font-size: 12px; opacity: 0.9;">Joueuses à risque</div>
                    <div style="font-size: 11px; margin-top: 4px; opacity: 0.7;">2+ jours sans check-in</div>
                </div>
            </div>
            
            <!-- Alertes joueuses à risque -->
            ${atRiskPlayers.length > 0 ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                    <h4 style="color: #dc2626; margin-bottom: 12px; font-size: 14px;">⚠️ Joueuses à risque</h4>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                        ${atRiskPlayers.slice(0, 5).map(p => `
                            <span style="background: white; border: 1px solid #fecaca; padding: 6px 12px; border-radius: 20px; font-size: 13px;">
                                ${p.name}
                            </span>
                        `).join('')}
                        ${atRiskPlayers.length > 5 ? `<span style="color: #dc2626; font-size: 13px;">+${atRiskPlayers.length - 5} autres</span>` : ''}
                    </div>
                </div>
            ` : ''}
            
            <!-- Classement des streaks -->
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                <div style="background: #f8fafc; padding: 16px; border-bottom: 1px solid #e5e7eb;">
                    <h4 style="margin: 0; font-size: 16px; color: #1f2937;">🔥 Classement Streaks Check-in</h4>
                </div>
                <div style="max-height: 400px; overflow-y: auto;">
        `;
        
        players.forEach((player, index) => {
            const streak = player.engagement?.currentStreak || 0;
            const longestStreak = player.engagement?.longestStreak || 0;
            const totalCheckIns = player.engagement?.totalCheckIns || 0;
            const isFrozen = player.engagement?.streakFrozen || false;
            
            // Déterminer l'icône de flamme
            let flameIcon = '';
            if (streak >= 30) flameIcon = '🏆';
            else if (streak >= 21) flameIcon = '🔥🔥🔥';
            else if (streak >= 14) flameIcon = '🔥🔥';
            else if (streak >= 7) flameIcon = '🔥';
            else if (streak >= 3) flameIcon = '✨';
            
            // Badge de position
            let positionBadge = '';
            if (index === 0 && streak > 0) positionBadge = '🥇';
            else if (index === 1 && streak > 0) positionBadge = '🥈';
            else if (index === 2 && streak > 0) positionBadge = '🥉';
            
            html += `
                <div style="display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f3f4f6; ${streak === 0 ? 'opacity: 0.6;' : ''}">
                    <div style="width: 30px; text-align: center; font-size: 14px; color: #6b7280;">${positionBadge || (index + 1)}</div>
                    <img src="${player.photoURL || '/img/default-avatar.png'}" 
                         style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; margin-right: 12px; border: 2px solid ${streak >= 7 ? '#f97316' : '#e5e7eb'};">
                    <div style="flex: 1;">
                        <div style="font-weight: 500; color: #1f2937;">${player.name}</div>
                        <div style="font-size: 11px; color: #9ca3af;">
                            ${totalCheckIns} check-ins total • Record: ${longestStreak}j
                            ${isFrozen ? ' • ❄️ En pause' : ''}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 18px; font-weight: 700; color: ${streak >= 7 ? '#f97316' : streak > 0 ? '#1f2937' : '#9ca3af'};">
                            ${flameIcon} ${streak}
                        </div>
                        <div style="font-size: 10px; color: #9ca3af;">jour${streak !== 1 ? 's' : ''}</div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
            
            <!-- Progression hebdomadaire entraînement -->
            <div style="background: white; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-top: 24px;">
                <div style="background: #f8fafc; padding: 16px; border-bottom: 1px solid #e5e7eb;">
                    <h4 style="margin: 0; font-size: 16px; color: #1f2937;">💪 Progression Entraînement (Semaine)</h4>
                </div>
                <div style="padding: 16px;">
        `;
        
        // Trier par sessions cette semaine
        const trainingRanking = [...players].sort((a, b) => {
            const sessionsA = a.training?.currentWeekSessions || 0;
            const sessionsB = b.training?.currentWeekSessions || 0;
            return sessionsB - sessionsA;
        });
        
        trainingRanking.slice(0, 8).forEach(player => {
            const sessions = player.training?.currentWeekSessions || 0;
            const weeklyStreak = player.training?.weeklyStreak || 0;
            const progress = Math.min(100, Math.round((sessions / 9) * 100));
            
            html += `
                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                    <div style="width: 100px; font-size: 13px; font-weight: 500; color: #1f2937;">${player.name.split(' ')[0]}</div>
                    <div style="flex: 1; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin: 0 12px;">
                        <div style="height: 100%; width: ${progress}%; background: ${progress >= 100 ? '#10b981' : '#3b82f6'}; border-radius: 4px;"></div>
                    </div>
                    <div style="width: 50px; text-align: right; font-size: 12px; color: #6b7280;">${sessions}/9</div>
                    ${weeklyStreak > 0 ? `<div style="margin-left: 8px; font-size: 11px; color: #10b981;">🏆${weeklyStreak}sem</div>` : ''}
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur loadEngagementDashboard:', error);
        container.innerHTML = '<p style="color: #ef4444; text-align: center;">❌ Erreur de chargement</p>';
    }
}

/**
 * Récupère le compteur de remplissage du jour pour affichage temps réel
 */
async function getTodayFillCount() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Total joueuses actives
        const playersSnapshot = await db.collection('players').get();
        const activeCount = playersSnapshot.docs.filter(d => {
            const data = d.data();
            return !data.status || data.status === 'active';
        }).length;
        
        // Check-ins du jour
        const checkinsSnapshot = await db.collection('checkins')
            .where('date', '==', today)
            .get();
        
        const filledCount = new Set(checkinsSnapshot.docs.map(d => d.data().playerId)).size;
        
        return {
            filled: filledCount,
            total: activeCount,
            percentage: activeCount > 0 ? Math.round((filledCount / activeCount) * 100) : 0,
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        };
    } catch (error) {
        console.error('Erreur getTodayFillCount:', error);
        return null;
    }
}

/**
 * Met à jour l'indicateur de remplissage dans le header coach
 */
async function updateFillIndicator() {
    const indicator = document.getElementById('fillIndicator');
    if (!indicator) return;
    
    const count = await getTodayFillCount();
    if (!count) return;
    
    const colorClass = count.percentage >= 80 ? '#10b981' : 
                       count.percentage >= 50 ? '#f59e0b' : '#ef4444';
    
    indicator.innerHTML = `
        <span style="color: ${colorClass}; font-weight: 600;">${count.filled}/${count.total}</span>
        <span style="font-size: 11px; color: #6b7280; margin-left: 4px;">(${count.percentage}%)</span>
    `;
}

// Exposer les fonctions globalement
window.loadEngagementDashboard = loadEngagementDashboard;
window.getTodayFillCount = getTodayFillCount;
window.updateFillIndicator = updateFillIndicator;

console.log('✅ Engagement Dashboard chargé');
