/**
 * Streaks System - Système de séries et gamification
 * Gère les streaks de check-in matinaux et les messages motivationnels
 */

console.log('🔥 Chargement streaks.js');

/**
 * Calcule le streak réel depuis l'historique des check-ins
 * Prend en compte les périodes de repos et les gels automatiques
 */
async function calculateActualCheckInStreak(playerId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];
        
        // Récupérer les périodes de repos (essayer les deux formats de collection)
        let restPeriodsDoc = await db.collection('rest_periods').doc('current').get();
        
        // Si pas trouvé, essayer l'ancien format
        if (!restPeriodsDoc.exists) {
            restPeriodsDoc = await db.collection('restPeriods').doc('current').get();
        }
        
        let restPeriods = [];
        
        if (restPeriodsDoc.exists) {
            restPeriods = restPeriodsDoc.data().periods || [];
        } else {
            // Si pas de document 'current', charger toutes les périodes depuis rest_periods
            console.log('📊 Chargement de toutes les périodes depuis rest_periods...');
            const restPeriodsSnapshot = await db.collection('rest_periods').get();
            
            if (!restPeriodsSnapshot.empty) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                restPeriodsSnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.startDate && data.endDate) {
                        // Vérifier si la période est encore pertinente (pas trop ancienne)
                        const endDate = new Date(data.endDate);
                        endDate.setHours(0, 0, 0, 0);
                        
                        // Garder les périodes qui se terminent dans les 120 derniers jours minimum
                        const daysSinceEnd = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));
                        
                        if (daysSinceEnd <= 120) {
                            restPeriods.push({
                                startDate: data.startDate,
                                endDate: data.endDate,
                                reason: data.message || data.type || 'Période de repos'
                            });
                            console.log(`   → Période chargée: ${data.startDate} → ${data.endDate} (${data.type})`);
                        }
                    }
                });
            }
        }
        
        console.log(`📊 ${restPeriods.length} période(s) de repos trouvée(s)`);
        
        // Afficher les détails des périodes de repos
        if (restPeriods.length > 0) {
            restPeriods.forEach((period, idx) => {
                console.log(`   Période ${idx + 1}: ${period.startDate} → ${period.endDate} (${period.reason || 'Non spécifié'})`);
            });
        } else {
            console.warn('⚠️ Aucune période de repos trouvée dans Firestore');
        }        
        // Récupérer tous les check-ins récents (120 derniers jours pour couvrir depuis octobre)
        const maxDaysAgo = new Date(today);
        maxDaysAgo.setDate(maxDaysAgo.getDate() - 120);
        const maxDaysAgoStr = maxDaysAgo.toISOString().split('T')[0];
        
        const checkinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .where('date', '>=', maxDaysAgoStr)
            .orderBy('date', 'desc')
            .get();
        
        if (checkinsSnapshot.empty) {
            console.log('📊 Aucun check-in trouvé');
            return 0;
        }
        
        // Créer un Set des dates de check-in
        const checkinDates = new Set();
        let lastCheckinDate = null;
        
        console.log('📊 Détail des check-ins récupérés :');
        checkinsSnapshot.forEach(doc => {
            const data = doc.data();
            let dateStr = data.date;
            
            // Gérer les différents formats de date
            if (typeof dateStr === 'object' && dateStr.toDate) {
                // Firestore Timestamp
                dateStr = dateStr.toDate().toISOString().split('T')[0];
            } else if (dateStr instanceof Date) {
                // Objet Date JavaScript
                dateStr = dateStr.toISOString().split('T')[0];
            } else if (typeof dateStr === 'string') {
                // Déjà une string, vérifier le format
                if (dateStr.includes('T')) {
                    // Format ISO complet, extraire juste la date
                    dateStr = dateStr.split('T')[0];
                }
            }
            
            checkinDates.add(dateStr);
            
            // Log des 10 premiers check-ins pour debug
            if (checkinDates.size <= 10) {
                console.log(`   ${dateStr} (type original: ${typeof data.date})`);
            }
            
            if (!lastCheckinDate || dateStr > lastCheckinDate) {
                lastCheckinDate = dateStr;
            }
        });
        
        console.log(`📊 ${checkinDates.size} jours de check-in trouvés dans les 120 derniers jours`);
        console.log(`📊 Dernier check-in: ${lastCheckinDate}`);
        
        // Vérifier si le dernier check-in est aujourd'hui ou hier
        const lastDate = new Date(lastCheckinDate);
        lastDate.setHours(0, 0, 0, 0);
        const daysSinceLastCheckin = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
        
        console.log(`📊 Jours depuis dernier check-in: ${daysSinceLastCheckin}`);
        
        // Si le dernier check-in date de plus d'un jour, vérifier si on est en période de repos
        if (daysSinceLastCheckin > 1) {
            const isInRestPeriod = isDateInRestPeriods(todayStr, restPeriods);
            if (!isInRestPeriod) {
                console.log('📊 Streak cassé (dernier check-in trop ancien et pas en période de repos)');
                return 0;
            }
        }
        
        // Fonction helper pour vérifier si une date est en période de repos
        function isDateInRestPeriods(dateStr, periods) {
            if (periods.length === 0) return false;
            
            const checkDate = new Date(dateStr);
            checkDate.setHours(0, 0, 0, 0);
            
            for (const period of periods) {
                // Gérer différents formats de dates dans les périodes
                let startStr = period.startDate;
                let endStr = period.endDate;
                
                // Si ce sont des Timestamps Firestore
                if (typeof startStr === 'object' && startStr.toDate) {
                    startStr = startStr.toDate().toISOString().split('T')[0];
                }
                if (typeof endStr === 'object' && endStr.toDate) {
                    endStr = endStr.toDate().toISOString().split('T')[0];
                }
                
                const start = new Date(startStr);
                const end = new Date(endStr);
                start.setHours(0, 0, 0, 0);
                end.setHours(0, 0, 0, 0);
                
                if (checkDate >= start && checkDate <= end) {
                    console.log(`   🏖️ ${dateStr} est en période de repos (${startStr} → ${endStr})`);
                    return true;
                }
            }
            return false;
        }
        
        // Compter les jours consécutifs en remontant depuis le dernier check-in
        let streak = 0;
        let currentDate = new Date(lastDate);
        let consecutiveMissing = 0; // Compteur de jours manqués consécutifs
        let freezesUsedThisMonth = 0;
        let currentMonth = -1;
        
        while (true) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const month = currentDate.getMonth();
            
            // Réinitialiser les gels en début de mois
            if (month !== currentMonth) {
                currentMonth = month;
                freezesUsedThisMonth = 0;
            }
            
            if (checkinDates.has(dateStr)) {
                // Check-in présent
                streak++;
                consecutiveMissing = 0;
                console.log(`📊 Jour ${streak}: ${dateStr} ✓`);
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                // Check-in manquant
                const isRestDay = isDateInRestPeriods(dateStr, restPeriods);
                
                if (isRestDay) {
                    // Période de repos : on continue sans casser le streak
                    streak++;
                    consecutiveMissing = 0;
                    console.log(`📊 Jour ${streak}: ${dateStr} 🏖️ (Période de repos - ne compte pas comme jour manqué)`);
                    currentDate.setDate(currentDate.getDate() - 1);
                } else {
                    consecutiveMissing++;
                    
                    // Vérifier si on peut utiliser un gel (max 1 par mois, max 2 jours consécutifs)
                    if (consecutiveMissing <= 2 && freezesUsedThisMonth < 1) {
                        // Utiliser un gel
                        streak++;
                        freezesUsedThisMonth++;
                        console.log(`📊 Jour ${streak}: ${dateStr} 🛡️ (Gel ${freezesUsedThisMonth}/1 - Jour manqué ${consecutiveMissing}/2)`);
                        currentDate.setDate(currentDate.getDate() - 1);
                    } else {
                        // Plus de gels disponibles ou trop de jours consécutifs manqués
                        console.log(`📊 Série cassée à: ${dateStr} ✗ (${consecutiveMissing} jours manqués, ${freezesUsedThisMonth} gels utilisés ce mois)`);
                        break;
                    }
                }
            }
            
            // Limiter à 120 jours pour éviter les boucles infinies
            if (streak >= 120) {
                console.log(`📊 Limite de 120 jours atteinte`);
                break;
            }
        }
        
        console.log(`📊 Streak final calculé: ${streak} jours consécutifs`);
        return streak;
        
    } catch (error) {
        console.error('Erreur calculateActualCheckInStreak:', error);
        return 0;
    }
}

/**
 * Vérifie et synchronise le streak avec l'historique réel
 * À appeler au chargement du dashboard
 */
async function syncCheckInStreak(playerId) {
    try {
        const stats = await getEngagementStats(playerId);
        if (!stats) return;
        
        const actualStreak = await calculateActualCheckInStreak(playerId);
        
        console.log(`🔍 Sync streak - Document: ${stats.currentStreak}, Réel: ${actualStreak}`);
        
        // Si différent, mettre à jour
        if (stats.currentStreak !== actualStreak) {
            console.log(`🔄 Mise à jour streak: ${stats.currentStreak} → ${actualStreak}`);
            
            const updateData = {
                currentStreak: actualStreak
            };
            
            // Si le nouveau streak est un record, mettre à jour aussi longestStreak
            if (actualStreak > (stats.longestStreak || 0)) {
                updateData.longestStreak = actualStreak;
                console.log(`🏆 Nouveau record: ${actualStreak} jours`);
            }
            
            await db.collection('players').doc(playerId).collection('stats').doc('engagement').update(updateData);
            console.log(`✅ Streak synchronisé: ${actualStreak} jours`);
        } else {
            console.log(`✅ Streak déjà à jour: ${actualStreak} jours`);
        }
    } catch (error) {
        console.error('Erreur syncCheckInStreak:', error);
    }
}

/**
 * Récupère ou crée les statistiques d'engagement d'une joueuse
 */
async function getEngagementStats(playerId) {
    try {
        const statsRef = db.collection('players').doc(playerId).collection('stats').doc('engagement');
        const statsDoc = await statsRef.get();
        
        if (statsDoc.exists) {
            return statsDoc.data();
        } else {
            // Créer les stats par défaut
            const defaultStats = {
                currentStreak: 0,
                longestStreak: 0,
                lastCheckInDate: null,
                totalCheckIns: 0,
                streakFrozen: false,
                frozenReason: null
            };
            await statsRef.set(defaultStats);
            return defaultStats;
        }
    } catch (error) {
        console.error('Erreur getEngagementStats:', error);
        return null;
    }
}

/**
 * Met à jour le streak après un check-in matinal
 * @param {string} playerId - ID de la joueuse
 * @returns {object} - { newStreak, isNewRecord, milestone, message }
 */
async function updateCheckInStreak(playerId) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const stats = await getEngagementStats(playerId);
        
        if (!stats) {
            console.error('Impossible de récupérer les stats');
            return null;
        }
        
        // Vérifier si on est en période de repos
        const isRestPeriod = await checkIfRestPeriod(playerId, today);
        if (isRestPeriod) {
            console.log('Streaks: Période de repos, streak gelé');
            await db.collection('players').doc(playerId).collection('stats').doc('engagement').update({
                streakFrozen: true,
                frozenReason: 'rest_period',
                frozenDate: today
            });
            return {
                newStreak: stats.currentStreak,
                isNewRecord: false,
                milestone: null,
                message: '❄️ Série en pause pendant les vacances',
                frozen: true
            };
        }
        
        // Si on n'est plus en période de repos mais que le streak était gelé, dégeler
        if (stats.streakFrozen && stats.frozenReason === 'rest_period') {
            console.log('✅ Streaks: Fin de période de repos, reprise de la série');
            // Le streak sera dégelé automatiquement dans updateData plus bas
        }
        
        // Calculer la différence de jours
        let newStreak = 1;
        let isNewRecord = false;
        let milestone = null;
        let freezeUsed = false;
        
        if (stats.lastCheckInDate) {
            const lastDate = new Date(stats.lastCheckInDate);
            const todayDate = new Date(today);
            const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) {
                // Même jour, ne rien faire
                console.log('Streaks: Déjà rempli aujourd\'hui');
                return {
                    newStreak: stats.currentStreak,
                    isNewRecord: false,
                    milestone: null,
                    message: null,
                    alreadyDone: true
                };
            } else if (diffDays === 1 || (stats.streakFrozen && diffDays <= 30)) {
                // Jour consécutif OU reprise après gel (jusqu'à 30 jours max pour périodes de repos)
                newStreak = stats.currentStreak + 1;
                if (stats.streakFrozen) {
                    console.log(`✅ Reprise après gel de ${diffDays} jours`);
                }
            } else if (diffDays === 2 || diffDays === 3) {
                // Rattrapage possible avec gel (-1 ou -2 jours)
                const monthlyFreezes = stats.monthlyFreezes || 0;
                const currentMonth = new Date().getMonth();
                const lastFreezeMonth = stats.lastFreezeMonth || -1;
                
                // Réinitialiser les gel en début de mois
                const actualFreezes = (lastFreezeMonth === currentMonth) ? monthlyFreezes : 0;
                
                if (actualFreezes < 1) {
                    // Utiliser un gel
                    newStreak = stats.currentStreak + 1;
                    freezeUsed = true;
                    console.log(`✅ Gel utilisé (${actualFreezes + 1}/1 ce mois)`);
                } else {
                    // Plus de gel disponibles
                    console.log('❌ Plus de gel disponibles ce mois');
                    newStreak = 1;
                }
            } else {
                // Série cassée
                console.log('Streaks: Série cassée après', diffDays, 'jours');
                newStreak = 1;
            }
        }
        
        // Vérifier si record personnel
        if (newStreak > stats.longestStreak) {
            isNewRecord = true;
        }
        
        // Vérifier les milestones
        milestone = getStreakMilestone(newStreak);
        
        // Préparer l'update
        const updateData = {
            currentStreak: newStreak,
            longestStreak: isNewRecord ? newStreak : stats.longestStreak,
            lastCheckInDate: today,
            totalCheckIns: (stats.totalCheckIns || 0) + 1,
            streakFrozen: false,
            frozenReason: null
        };
        
        // Si un gel a été utilisé, mettre à jour les compteurs
        if (freezeUsed) {
            const currentMonth = new Date().getMonth();
            const lastFreezeMonth = stats.lastFreezeMonth || -1;
            const actualFreezes = (lastFreezeMonth === currentMonth) ? (stats.monthlyFreezes || 0) : 0;
            
            updateData.monthlyFreezes = actualFreezes + 1;
            updateData.lastFreezeMonth = currentMonth;
        }
        
        // Mettre à jour Firestore
        await db.collection('players').doc(playerId).collection('stats').doc('engagement').update(updateData);
        
        // Générer le message
        let message = generateStreakMessage(playerId, newStreak, isNewRecord, milestone);
        
        // Ajouter info gel si utilisé
        if (freezeUsed) {
            const actualFreezes = updateData.monthlyFreezes || 0;
            message += ` 🛡️ Gel utilisé (${actualFreezes}/1 ce mois)`;
        }
        
        console.log('Streaks: Mise à jour réussie -', newStreak, 'jours');
        
        return {
            newStreak,
            isNewRecord,
            milestone,
            message,
            freezeUsed
        };
        
    } catch (error) {
        console.error('Erreur updateCheckInStreak:', error);
        return null;
    }
}

/**
 * Vérifie si on est en période de repos
 */
async function checkIfRestPeriod(playerId, dateStr) {
    try {
        const restDoc = await db.collection('restPeriods').doc('current').get();
        if (!restDoc.exists) return false;
        
        const restPeriods = restDoc.data().periods || [];
        const checkDate = new Date(dateStr);
        
        for (const period of restPeriods) {
            const start = new Date(period.startDate);
            const end = new Date(period.endDate);
            if (checkDate >= start && checkDate <= end) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Erreur checkIfRestPeriod:', error);
        return false;
    }
}

/**
 * Retourne le milestone atteint (si applicable)
 */
function getStreakMilestone(streak) {
    const milestones = {
        7: { icon: '🔥', text: '1 semaine !', level: 1 },
        14: { icon: '🔥🔥', text: '2 semaines !', level: 2 },
        21: { icon: '🔥🔥🔥', text: '3 semaines !', level: 3 },
        30: { icon: '🏆', text: '1 mois champion !', level: 4 },
        60: { icon: '👑', text: '2 mois légendaire !', level: 5 },
        100: { icon: '💎', text: '100 jours diamant !', level: 6 }
    };
    
    return milestones[streak] || null;
}

/**
 * Génère le message de félicitation
 */
function generateStreakMessage(playerId, streak, isNewRecord, milestone) {
    // Messages aléatoires pour encourager
    const encouragements = [
        'Continue comme ça !',
        'Tu gères !',
        'Belle constance !',
        'Impressionnant !',
        'Keep going !',
        'On lâche rien !'
    ];
    
    if (isNewRecord && streak > 3) {
        return `🎉 NOUVEAU RECORD PERSONNEL ! ${streak} jours d'affilée !`;
    }
    
    if (milestone) {
        return `${milestone.icon} ${milestone.text} ${streak} jours consécutifs !`;
    }
    
    if (streak >= 3) {
        const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
        return `🔥 ${streak} jours ! ${encouragement}`;
    }
    
    return null;
}

/**
 * Affiche le widget flammes dans le dashboard joueuse
 */
async function displayStreakWidget(playerId) {
    const container = document.getElementById('streakWidget');
    if (!container) {
        console.log('Streaks: Widget container non trouvé');
        return;
    }
    
    try {
        const stats = await getEngagementStats(playerId);
        console.log('Streaks: Stats récupérées:', stats);
        
        // Afficher le widget même avec streak = 0
        const streak = stats?.currentStreak || 0;
        
        // Déterminer l'icône selon le niveau
        let flameIcon = '🔥';
        let flameColor = '#9ca3af'; // Gris si 0
        let bgColor = 'rgba(156, 163, 175, 0.1)';
        let message = 'Faites votre premier check-in !';
        
        if (streak >= 30) {
            flameIcon = '🏆';
            flameColor = '#eab308';
            bgColor = 'rgba(234, 179, 8, 0.1)';
            message = `${streak} jours consécutifs !`;
        } else if (streak >= 21) {
            flameIcon = '🔥🔥🔥';
            flameColor = '#dc2626';
            bgColor = 'rgba(220, 38, 38, 0.1)';
            message = `${streak} jours consécutifs !`;
        } else if (streak >= 14) {
            flameIcon = '🔥🔥';
            flameColor = '#ea580c';
            bgColor = 'rgba(234, 88, 12, 0.1)';
            message = `${streak} jours consécutifs !`;
        } else if (streak >= 7) {
            flameIcon = '🔥';
            flameColor = '#f97316';
            bgColor = 'rgba(249, 115, 22, 0.1)';
            message = `${streak} jours consécutifs !`;
        } else if (streak >= 1) {
            flameColor = '#f97316';
            bgColor = 'rgba(249, 115, 22, 0.1)';
            message = `${streak} jour${streak > 1 ? 's' : ''} consécutif${streak > 1 ? 's' : ''} !`;
        }
        
        // Message frozen si applicable
        let frozenBadge = '';
        if (stats?.streakFrozen) {
            frozenBadge = `<span style="font-size: 11px; color: #60a5fa; margin-left: 8px;">❄️ En pause</span>`;
        }
        
        // Afficher le widget
        container.innerHTML = `
            <div style="background: ${bgColor}; border: 1px solid ${flameColor}20; border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 28px;">${flameIcon}</div>
                <div style="flex: 1;">
                    <div style="font-size: 16px; font-weight: 600; color: ${flameColor};">${message}</div>
                    <div style="font-size: 12px; color: #6b7280;">Série check-in matinal ${frozenBadge}</div>
                </div>
                ${streak > 0 && streak === (stats?.longestStreak || 0) && streak > 3 ? 
                    '<div style="font-size: 10px; background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px;">Record perso !</div>' : 
                    ''}
            </div>
        `;
        container.style.display = 'block';
        
    } catch (error) {
        console.error('Erreur displayStreakWidget:', error);
        container.style.display = 'none';
    }
}

/**
 * Affiche le message de félicitation après un check-in
 */
function showStreakCelebration(result) {
    if (!result || !result.message) return;
    
    // Créer un overlay de célébration
    const overlay = document.createElement('div');
    overlay.id = 'streakCelebration';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.3s ease;
    `;
    
    // Contenu
    let bgGradient = 'linear-gradient(135deg, #f97316, #ea580c)';
    if (result.isNewRecord) {
        bgGradient = 'linear-gradient(135deg, #eab308, #ca8a04)';
    } else if (result.milestone && result.milestone.level >= 4) {
        bgGradient = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
    }
    
    overlay.innerHTML = `
        <div style="background: ${bgGradient}; color: white; padding: 32px 48px; border-radius: 20px; text-align: center; animation: bounceIn 0.5s ease; max-width: 90%; box-shadow: 0 20px 60px rgba(0,0,0,0.4);">
            <div style="font-size: 48px; margin-bottom: 16px;">${result.milestone ? result.milestone.icon : '🔥'}</div>
            <div style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">${result.message}</div>
            ${result.isNewRecord ? '<div style="font-size: 14px; opacity: 0.9;">🎊 Tu bats ton record !</div>' : ''}
            <button onclick="document.getElementById('streakCelebration').remove()" 
                    style="margin-top: 24px; background: rgba(255,255,255,0.2); border: 2px solid white; color: white; padding: 12px 32px; border-radius: 25px; font-size: 16px; font-weight: 600; cursor: pointer;">
                Super !
            </button>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Fermer automatiquement après 4 secondes
    setTimeout(() => {
        const el = document.getElementById('streakCelebration');
        if (el) el.remove();
    }, 4000);
}

/**
 * Génère un message matinal contextuel
 */
async function getMorningMessage(playerId) {
    const hour = new Date().getHours();
    const today = new Date().toISOString().split('T')[0];
    
    try {
        // Compter combien ont rempli aujourd'hui
        const checkinsSnapshot = await db.collection('checkins')
            .where('date', '==', today)
            .get();
        
        const totalPlayers = await db.collection('players').get();
        const activeCount = totalPlayers.docs.filter(d => !d.data().status || d.data().status === 'active').length;
        const filledCount = new Set(checkinsSnapshot.docs.map(d => d.data().playerId)).size;
        
        // Déterminer le rang de la joueuse
        const playerFilled = checkinsSnapshot.docs.some(d => d.data().playerId === playerId);
        const rank = filledCount;
        
        if (hour < 8 && rank <= 1 && playerFilled) {
            return { icon: '🌅', text: 'Tu es la première ce matin !', type: 'first' };
        } else if (hour < 9 && rank <= 3 && playerFilled) {
            return { icon: '⚡', text: `Top ${rank} du matin !`, type: 'top3' };
        } else if (hour < 12 && playerFilled) {
            return { icon: '✅', text: 'Check-in matinal validé !', type: 'morning' };
        } else if (playerFilled) {
            return { icon: '👍', text: "C'est fait pour aujourd'hui !", type: 'done' };
        }
        
        return null;
        
    } catch (error) {
        console.error('Erreur getMorningMessage:', error);
        return null;
    }
}

/**
 * Recalcule l'historique des streaks depuis le début des check-ins
 * @param {string} playerId - ID de la joueuse
 */
async function recalculateStreaksFromHistory(playerId) {
    try {
        console.log('🔄 Recalcul des streaks pour', playerId);
        
        // Récupérer tous les check-ins de la joueuse triés par date
        const checkinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .orderBy('date', 'asc')
            .get();
        
        if (checkinsSnapshot.empty) {
            console.log('Aucun check-in trouvé pour', playerId);
            return;
        }
        
        let currentStreak = 0;
        let longestStreak = 0;
        let totalCheckIns = checkinsSnapshot.size;
        let lastCheckInDate = null;
        let previousDate = null;
        
        // Parcourir tous les check-ins dans l'ordre chronologique
        checkinsSnapshot.forEach(doc => {
            const data = doc.data();
            const checkInDate = new Date(data.date);
            
            if (!previousDate) {
                // Premier check-in
                currentStreak = 1;
                longestStreak = 1;
            } else {
                // Calculer la différence en jours
                const diffTime = checkInDate - previousDate;
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) {
                    // Même jour, ne rien faire
                } else if (diffDays === 1) {
                    // Jour consécutif
                    currentStreak++;
                    if (currentStreak > longestStreak) {
                        longestStreak = currentStreak;
                    }
                } else {
                    // Série cassée
                    currentStreak = 1;
                }
            }
            
            previousDate = checkInDate;
            lastCheckInDate = data.date;
        });
        
        // Vérifier si le streak actuel est toujours valide (dernier check-in récent)
        const today = new Date();
        const lastDate = new Date(lastCheckInDate);
        const daysSinceLastCheckIn = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLastCheckIn > 1) {
            // Streak cassé car pas de check-in hier ou aujourd'hui
            currentStreak = 0;
        }
        
        // Mettre à jour Firestore
        const statsRef = db.collection('players').doc(playerId).collection('stats').doc('engagement');
        await statsRef.set({
            currentStreak: currentStreak,
            longestStreak: longestStreak,
            lastCheckInDate: lastCheckInDate,
            totalCheckIns: totalCheckIns,
            streakFrozen: false,
            frozenReason: null,
            lastRecalculation: new Date().toISOString()
        }, { merge: true });
        
        console.log('✅ Streaks recalculés:', {
            currentStreak,
            longestStreak,
            totalCheckIns,
            lastCheckInDate
        });
        
        return {
            currentStreak,
            longestStreak,
            totalCheckIns,
            lastCheckInDate
        };
        
    } catch (error) {
        console.error('Erreur recalculateStreaksFromHistory:', error);
        return null;
    }
}

/**
 * Recalcule les streaks pour toutes les joueuses
 */
async function recalculateAllStreaks() {
    try {
        console.log('🔄 Recalcul des streaks pour toutes les joueuses...');
        
        const playersSnapshot = await db.collection('players').get();
        const results = [];
        
        for (const playerDoc of playersSnapshot.docs) {
            const playerId = playerDoc.id;
            const result = await recalculateStreaksFromHistory(playerId);
            if (result) {
                results.push({
                    playerId,
                    playerName: playerDoc.data().name,
                    ...result
                });
            }
        }
        
        console.log('✅ Recalcul terminé pour', results.length, 'joueuses');
        console.table(results);
        
        return results;
        
    } catch (error) {
        console.error('Erreur recalculateAllStreaks:', error);
        return null;
    }
}

// Exposer les fonctions globalement
window.getEngagementStats = getEngagementStats;
window.updateCheckInStreak = updateCheckInStreak;
window.syncCheckInStreak = syncCheckInStreak;
window.calculateActualCheckInStreak = calculateActualCheckInStreak;
window.displayStreakWidget = displayStreakWidget;
window.showStreakCelebration = showStreakCelebration;
window.getMorningMessage = getMorningMessage;
window.recalculateStreaksFromHistory = recalculateStreaksFromHistory;
window.recalculateAllStreaks = recalculateAllStreaks;

console.log('✅ Streaks chargé');
