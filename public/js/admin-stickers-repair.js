/**
 * Admin - Réparation et recalcul des stickers
 * Principe : Les stickers gagnés ne disparaissent JAMAIS
 */

console.log('🔧 Chargement admin-stickers-repair.js');

/**
 * Recalcule tous les stickers pour une joueuse
 * Ne supprime JAMAIS les stickers existants, ne fait qu'en ajouter
 */
async function repairPlayerStickers(playerId, playerName = '') {
    console.log(`\n🔧 === Réparation stickers pour ${playerName || playerId} ===`);

    try {
        // 1. Récupérer les stickers actuels (à préserver)
        const playerDoc = await db.collection('players').doc(playerId).get();
        if (!playerDoc.exists) {
            console.error('Joueuse non trouvée:', playerId);
            return null;
        }

        const playerData = playerDoc.data();
        const existingStickers = playerData.stickers || [];
        console.log(`📊 Stickers actuels: ${existingStickers.length}`, existingStickers);

        // 2. Recalculer le streak check-in depuis l'historique
        console.log('\n📅 Recalcul du streak check-in...');
        const checkinStreak = await calculateActualCheckInStreak(playerId);
        console.log(`   Streak check-in calculé: ${checkinStreak} jours`);

        // 3. Mettre à jour les stats d'engagement
        await db.collection('players').doc(playerId).collection('stats').doc('engagement').set({
            currentStreak: checkinStreak,
            lastRecalculation: new Date().toISOString()
        }, { merge: true });

        // 4. Calculer les stats de training
        console.log('\n💪 Calcul des stats RPE...');
        const trainingStats = await calculateTrainingStats(playerId);
        console.log('   Stats training:', trainingStats);

        // 5. Mettre à jour les stats de training
        await db.collection('players').doc(playerId).collection('stats').doc('training').set({
            ...trainingStats,
            lastRecalculation: new Date().toISOString()
        }, { merge: true });

        // 6. Calculer tous les stickers mérités
        console.log('\n🎖️ Vérification des stickers mérités...');
        const earnedStickers = [];

        // Stickers check-in (basés sur currentStreak)
        const checkinPaliers = [
            { days: 7, stickers: ['checkin_7_1', 'checkin_7_2', 'checkin_7_3'] },
            { days: 14, stickers: ['checkin_14_1', 'checkin_14_2', 'checkin_14_3'] },
            { days: 21, stickers: ['checkin_21_1', 'checkin_21_2', 'checkin_21_3'] },
            { days: 28, stickers: ['checkin_28_1', 'checkin_28_2', 'checkin_28_3'] },
            { days: 35, stickers: ['checkin_35_1', 'checkin_35_2', 'checkin_35_3'] },
            { days: 42, stickers: ['checkin_42_1', 'checkin_42_2', 'checkin_42_3'] },
            { days: 49, stickers: ['checkin_49_1', 'checkin_49_2', 'checkin_49_3'] },
            { days: 56, stickers: ['checkin_56_1', 'checkin_56_2', 'checkin_56_3', 'checkin_56_4', 'checkin_56_5', 'checkin_56_6'] }
        ];

        // Vérifier le streak maximum atteint (pas juste le courant)
        const maxCheckinStreak = await getMaxCheckinStreakEver(playerId);
        console.log(`   Streak check-in max historique: ${maxCheckinStreak} jours`);

        for (const palier of checkinPaliers) {
            if (maxCheckinStreak >= palier.days) {
                earnedStickers.push(...palier.stickers);
            }
        }

        // Stickers RPE streak
        if (trainingStats.maxStreak >= 5) earnedStickers.push('consistent_player');
        if (trainingStats.maxStreak >= 7) earnedStickers.push('streak_7');
        if (trainingStats.maxStreak >= 14) earnedStickers.push('streak_14');

        // Stickers semaines complètes
        if (trainingStats.weeksCompleteCount >= 1) earnedStickers.push('week_complete');

        // Stickers total RPE
        if (trainingStats.totalRpe >= 50) earnedStickers.push('rpe_regular');
        if (trainingStats.totalRpe >= 200) earnedStickers.push('rpe_expert');

        // Stickers total check-ins
        const totalCheckins = await getTotalCheckins(playerId);
        if (totalCheckins >= 100) earnedStickers.push('checkin_master');

        // Stickers légendaires (joueuses) basés sur weeksCompleteCount
        const name = (playerData.name || '').toLowerCase();
        const legendaryPlayers = {
            'charlotte': { required: 2, stickerId: 'player_charlotte' },
            'chloe': { required: 3, stickerId: 'player_chloe' },
            'cyrielle': { required: 4, stickerId: 'player_cyrielle' },
            'julia': { required: 5, stickerId: 'player_julia' },
            'lea': { required: 6, stickerId: 'player_lea' },
            'lilou': { required: 7, stickerId: 'player_lilou' },
            'lise': { required: 8, stickerId: 'player_lise' },
            'lovely': { required: 9, stickerId: 'player_lovely' },
            'melina': { required: 10, stickerId: 'player_melina' },
            'nelia': { required: 11, stickerId: 'player_nelia' },
            'rose': { required: 12, stickerId: 'player_rose' },
            'zoe': { required: 13, stickerId: 'player_zoe' },
            'eline': { required: 14, stickerId: 'player_eline' },
            'nine': { required: 15, stickerId: 'player_nine' }
        };

        for (const [playerKey, config] of Object.entries(legendaryPlayers)) {
            if (name.includes(playerKey) && trainingStats.weeksCompleteCount >= config.required) {
                earnedStickers.push(config.stickerId);
            }
        }

        // 7. Fusionner : garder TOUS les stickers existants + ajouter les nouveaux
        const allStickers = [...new Set([...existingStickers, ...earnedStickers])];

        // Compter les nouveaux
        const newStickers = allStickers.filter(s => !existingStickers.includes(s));
        const restoredStickers = earnedStickers.filter(s => !existingStickers.includes(s));

        console.log(`\n📊 Résultat:`);
        console.log(`   Stickers existants préservés: ${existingStickers.length}`);
        console.log(`   Stickers mérités calculés: ${earnedStickers.length}`);
        console.log(`   Nouveaux/restaurés: ${newStickers.length}`, newStickers);
        console.log(`   Total final: ${allStickers.length}`);

        // 8. Sauvegarder (seulement si changement)
        if (newStickers.length > 0) {
            await db.collection('players').doc(playerId).update({
                stickers: allStickers,
                stickerStats: {
                    total: allStickers.length,
                    lastRepair: new Date().toISOString(),
                    byRarity: countByRarity(allStickers)
                }
            });
            console.log(`✅ ${newStickers.length} sticker(s) restauré(s) pour ${playerName || playerId}`);
        } else {
            console.log(`✅ Aucun sticker manquant pour ${playerName || playerId}`);
        }

        return {
            playerId,
            playerName: playerData.name,
            existingCount: existingStickers.length,
            finalCount: allStickers.length,
            restored: newStickers,
            stats: {
                checkinStreak,
                maxCheckinStreak,
                totalCheckins,
                ...trainingStats
            }
        };

    } catch (error) {
        console.error(`❌ Erreur réparation pour ${playerId}:`, error);
        return null;
    }
}

/**
 * Calcule le streak maximum de check-in jamais atteint
 */
async function getMaxCheckinStreakEver(playerId) {
    try {
        // Récupérer tous les check-ins
        const checkinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .orderBy('date', 'asc')
            .get();

        if (checkinsSnapshot.empty) return 0;

        // Récupérer les périodes de repos
        let restPeriods = [];
        const restDoc = await db.collection('rest_periods').doc('current').get();
        if (restDoc.exists) {
            restPeriods = restDoc.data().periods || [];
        }

        // Calculer le streak max en parcourant l'historique
        let currentStreak = 0;
        let maxStreak = 0;
        let previousDate = null;

        const checkinDates = new Set();
        checkinsSnapshot.forEach(doc => {
            let dateStr = doc.data().date;
            if (typeof dateStr === 'object' && dateStr.toDate) {
                dateStr = dateStr.toDate().toISOString().split('T')[0];
            }
            checkinDates.add(dateStr);
        });

        // Trier les dates
        const sortedDates = Array.from(checkinDates).sort();

        for (const dateStr of sortedDates) {
            const currentDate = new Date(dateStr);

            if (!previousDate) {
                currentStreak = 1;
            } else {
                const diffDays = Math.floor((currentDate - previousDate) / (1000 * 60 * 60 * 24));

                if (diffDays === 1) {
                    currentStreak++;
                } else if (diffDays > 1) {
                    // Vérifier si les jours manquants sont en période de repos
                    let allRest = true;
                    for (let i = 1; i < diffDays; i++) {
                        const checkDate = new Date(previousDate);
                        checkDate.setDate(checkDate.getDate() + i);
                        const checkDateStr = checkDate.toISOString().split('T')[0];

                        if (!isDateInRestPeriod(checkDateStr, restPeriods)) {
                            allRest = false;
                            break;
                        }
                    }

                    if (allRest) {
                        currentStreak += diffDays; // Compte les jours de repos
                    } else {
                        currentStreak = 1; // Streak cassé
                    }
                }
            }

            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
            }

            previousDate = currentDate;
        }

        return maxStreak;

    } catch (error) {
        console.error('Erreur getMaxCheckinStreakEver:', error);
        return 0;
    }
}

/**
 * Vérifie si une date est en période de repos
 */
function isDateInRestPeriod(dateStr, restPeriods) {
    const checkDate = new Date(dateStr);
    checkDate.setHours(12, 0, 0, 0);

    for (const period of restPeriods) {
        const start = new Date(period.startDate);
        const end = new Date(period.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        if (checkDate >= start && checkDate <= end) {
            return true;
        }
    }
    return false;
}

/**
 * Calcule les stats de training (RPE)
 */
async function calculateTrainingStats(playerId) {
    try {
        const rpeSnapshot = await db.collection('rpe')
            .where('playerId', '==', playerId)
            .orderBy('date', 'asc')
            .get();

        const totalRpe = rpeSnapshot.size;

        // Calculer les semaines complètes (9+ RPE par semaine)
        const weeklyRpe = {};
        rpeSnapshot.forEach(doc => {
            const data = doc.data();
            let dateStr = data.date;
            if (typeof dateStr === 'object' && dateStr.toDate) {
                dateStr = dateStr.toDate().toISOString().split('T')[0];
            }

            // Calculer le numéro de semaine ISO
            const date = new Date(dateStr);
            const weekKey = getISOWeek(date);

            if (!weeklyRpe[weekKey]) {
                weeklyRpe[weekKey] = 0;
            }
            weeklyRpe[weekKey]++;
        });

        // Compter les semaines complètes (9+) et parfaites (13+)
        let weeksCompleteCount = 0;
        let weeksPerfectCount = 0;

        for (const [week, count] of Object.entries(weeklyRpe)) {
            if (count >= 9) weeksCompleteCount++;
            if (count >= 13) weeksPerfectCount++;
        }

        // Calculer le streak RPE max
        let maxStreak = 0;
        let currentStreak = 0;
        let previousDate = null;

        const rpeDates = new Set();
        rpeSnapshot.forEach(doc => {
            let dateStr = doc.data().date;
            if (typeof dateStr === 'object' && dateStr.toDate) {
                dateStr = dateStr.toDate().toISOString().split('T')[0];
            }
            rpeDates.add(dateStr);
        });

        const sortedDates = Array.from(rpeDates).sort();

        for (const dateStr of sortedDates) {
            const currentDate = new Date(dateStr);

            if (!previousDate) {
                currentStreak = 1;
            } else {
                const diffDays = Math.floor((currentDate - previousDate) / (1000 * 60 * 60 * 24));

                if (diffDays <= 1) {
                    currentStreak++;
                } else {
                    currentStreak = 1;
                }
            }

            if (currentStreak > maxStreak) {
                maxStreak = currentStreak;
            }

            previousDate = currentDate;
        }

        return {
            totalRpe,
            weeksCompleteCount,
            weeksPerfectCount,
            maxStreak,
            weeklyStreak: maxStreak
        };

    } catch (error) {
        console.error('Erreur calculateTrainingStats:', error);
        return { totalRpe: 0, weeksCompleteCount: 0, weeksPerfectCount: 0, maxStreak: 0 };
    }
}

/**
 * Retourne le numéro de semaine ISO
 */
function getISOWeek(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 4 - (d.getDay() || 7));
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Compte le total de check-ins
 */
async function getTotalCheckins(playerId) {
    try {
        const snapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .get();
        return snapshot.size;
    } catch (error) {
        return 0;
    }
}

/**
 * Répare les stickers pour TOUTES les joueuses
 */
async function repairAllPlayersStickers() {
    console.log('\n🔧 ========================================');
    console.log('🔧 RÉPARATION STICKERS - TOUTES LES JOUEUSES');
    console.log('🔧 ========================================\n');

    try {
        const playersSnapshot = await db.collection('players').get();
        const results = [];

        for (const playerDoc of playersSnapshot.docs) {
            const playerData = playerDoc.data();

            // Ignorer les coachs et comptes inactifs
            if (playerData.role === 'coach' || playerData.status === 'inactive') {
                continue;
            }

            const result = await repairPlayerStickers(playerDoc.id, playerData.name);
            if (result) {
                results.push(result);
            }

            // Petite pause entre chaque joueuse pour éviter de surcharger Firestore
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        console.log('\n🔧 ========================================');
        console.log('🔧 RÉSUMÉ DE LA RÉPARATION');
        console.log('🔧 ========================================');

        let totalRestored = 0;
        results.forEach(r => {
            const restored = r.restored.length;
            totalRestored += restored;
            console.log(`${r.playerName}: ${r.existingCount} → ${r.finalCount} stickers ${restored > 0 ? `(+${restored} restaurés)` : '(OK)'}`);
        });

        console.log(`\n✅ Réparation terminée: ${totalRestored} sticker(s) restauré(s) au total`);

        alert(`✅ Réparation terminée !\n\n${results.length} joueuses vérifiées\n${totalRestored} sticker(s) restauré(s)`);

        return results;

    } catch (error) {
        console.error('❌ Erreur repairAllPlayersStickers:', error);
        alert('Erreur lors de la réparation. Voir la console.');
        return null;
    }
}

// Exposer les fonctions globalement
window.repairPlayerStickers = repairPlayerStickers;
window.repairAllPlayersStickers = repairAllPlayersStickers;

console.log('✅ Admin stickers repair chargé');
console.log('   → repairAllPlayersStickers() : Répare toutes les joueuses');
