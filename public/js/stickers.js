/**
 * Système de Stickers (Achievements) - RPE Volleyball
 * Gestion de la gamification avec stickers à débloquer
 */

console.log('🎖️ Chargement stickers.js');

// Définitions des stickers (sync avec Firestore /stickers)
const STICKER_DEFINITIONS = {
    // ========== STICKERS COMMUNS (27) - Séries Check-ins ==========
    checkin_7_1: {
        id: 'checkin_7_1',
        name: 'Première Semaine',
        description: '7 check-ins consécutifs',
        emoji: '🌟',
        rarity: 'common',
        image: '/img/stickers/common/01_Paola_Egonu_Volleyball.webp',
        criteria: { type: 'checkin_streak', days: 7 }
    },
    checkin_7_2: {
        id: 'checkin_7_2',
        name: 'Régularité Installée',
        description: '7 check-ins d\'affilée',
        emoji: '⭐',
        rarity: 'common',
        image: '/img/stickers/common/02_Jordan_Larson_Volleyball.webp',
        criteria: { type: 'checkin_streak', days: 7 }
    },
    checkin_7_3: {
        id: 'checkin_7_3',
        name: 'Semaine Parfaite',
        description: '7 jours consécutifs',
        emoji: '✨',
        rarity: 'common',
        image: '/img/stickers/common/03_Tijana_Boskovic_Volleyball.webp',
        criteria: { type: 'checkin_streak', days: 7 }
    },
    checkin_14_1: {
        id: 'checkin_14_1',
        name: 'Deux Semaines',
        description: '14 check-ins consécutifs',
        emoji: '🔥',
        rarity: 'common',
        image: '/img/stickers/common/04_Melissa_Vargas_Volleyball.webp',
        criteria: { type: 'checkin_streak', days: 14 }
    },
    checkin_14_2: {
        id: 'checkin_14_2',
        name: 'Engagement Fort',
        description: '14 jours d\'affilée',
        emoji: '💪',
        rarity: 'common',
        image: '/img/stickers/common/05_Kim_Yeon_Koung_Volleyball.webp',
        criteria: { type: 'checkin_streak', days: 14 }
    },
    checkin_14_3: {
        id: 'checkin_14_3',
        name: 'Motivation Solide',
        description: '14 check-ins sans pause',
        emoji: '🌟',
        rarity: 'common',
        image: '/img/stickers/common/06_Simone_Biles_Gymnastique.webp',
        criteria: { type: 'checkin_streak', days: 14 }
    },
    checkin_21_1: {
        id: 'checkin_21_1',
        name: 'Trois Semaines',
        description: '21 check-ins consécutifs',
        emoji: '🏆',
        rarity: 'common',
        image: '/img/stickers/common/07_Serena_Williams_Tennis.webp',
        criteria: { type: 'checkin_streak', days: 21 }
    },
    checkin_21_2: {
        id: 'checkin_21_2',
        name: 'Discipline Exemplaire',
        description: '21 jours d\'affilée',
        emoji: '⚡',
        rarity: 'common',
        image: '/img/stickers/common/08_Allyson_Felix_Athletisme.webp',
        criteria: { type: 'checkin_streak', days: 21 }
    },
    checkin_21_3: {
        id: 'checkin_21_3',
        name: 'Constance Totale',
        description: '21 check-ins sans interruption',
        emoji: '💎',
        rarity: 'common',
        image: '/img/stickers/common/09_Fernanda_Garay_Volleyball.webp',
        criteria: { type: 'checkin_streak', days: 21 }
    },
    checkin_28_1: {
        id: 'checkin_28_1',
        name: 'Quatre Semaines',
        description: '28 check-ins consécutifs',
        emoji: '🌠',
        rarity: 'common',
        image: '/img/stickers/common/10_Kerri_Walsh_Jennings_Volleyball.webp',
        criteria: { type: 'checkin_streak', days: 28 }
    },
    checkin_28_2: {
        id: 'checkin_28_2',
        name: 'Mois Complet',
        description: '28 jours d\'affilée',
        emoji: '📅',
        rarity: 'common',
        image: '/img/stickers/common/11_Ekaterina_Gamova_Volleyball.webp',
        criteria: { type: 'checkin_streak', days: 28 }
    },
    checkin_28_3: {
        id: 'checkin_28_3',
        name: 'Persévérance',
        description: '28 check-ins sans faille',
        emoji: '🎯',
        rarity: 'common',
        image: '/img/stickers/common/12_Zhu_Ting_Volleyball.webp',
        criteria: { type: 'checkin_streak', days: 28 }
    },
    checkin_35_1: {
        id: 'checkin_35_1',
        name: 'Cinq Semaines',
        description: '35 check-ins consécutifs',
        emoji: '🚀',
        rarity: 'common',
        image: '/img/stickers/common/13_Earvin_Ngapeth_Volleyball_France.webp',
        criteria: { type: 'checkin_streak', days: 35 }
    },
    checkin_35_2: {
        id: 'checkin_35_2',
        name: 'Engagement Exceptionnel',
        description: '35 jours d\'affilée',
        emoji: '🌈',
        rarity: 'common',
        image: '/img/stickers/common/14_Melanie_De_Jesus_Dos_Santos_Gymnastique_France.webp',
        criteria: { type: 'checkin_streak', days: 35 }
    },
    checkin_35_3: {
        id: 'checkin_35_3',
        name: 'Dévouement Total',
        description: '35 check-ins implacables',
        emoji: '💫',
        rarity: 'common',
        image: '/img/stickers/common/15_Clarisse_Agbegnenou_Judo_France.webp',
        criteria: { type: 'checkin_streak', days: 35 }
    },
    checkin_42_1: {
        id: 'checkin_42_1',
        name: 'Six Semaines',
        description: '42 check-ins consécutifs',
        emoji: '🏅',
        rarity: 'common',
        image: '/img/stickers/common/16_Lea_Tissier_Handball_France.webp',
        criteria: { type: 'checkin_streak', days: 42 }
    },
    checkin_42_2: {
        id: 'checkin_42_2',
        name: 'Volonté Inébranlable',
        description: '42 jours d\'affilée',
        emoji: '🔷',
        rarity: 'common',
        image: '/img/stickers/common/17_Marie_Eve_Gahie_Judo_France.webp',
        criteria: { type: 'checkin_streak', days: 42 }
    },
    checkin_42_3: {
        id: 'checkin_42_3',
        name: 'Ténacité Absolue',
        description: '42 check-ins parfaits',
        emoji: '⭐',
        rarity: 'common',
        image: '/img/stickers/common/18_Roger_Federer_Tennis.webp',
        criteria: { type: 'checkin_streak', days: 42 }
    },
    checkin_49_1: {
        id: 'checkin_49_1',
        name: 'Sept Semaines',
        description: '49 check-ins consécutifs',
        emoji: '👑',
        rarity: 'common',
        image: '/img/stickers/common/19_Nikola_Karabatic_Handball.webp',
        criteria: { type: 'checkin_streak', days: 49 }
    },
    checkin_49_2: {
        id: 'checkin_49_2',
        name: 'Légende Vivante',
        description: '49 jours d\'affilée',
        emoji: '🌟',
        rarity: 'common',
        image: '/img/stickers/common/20_Cristiano_Ronaldo_Football.webp',
        criteria: { type: 'checkin_streak', days: 49 }
    },
    checkin_49_3: {
        id: 'checkin_49_3',
        name: 'Élite Absolue',
        description: '49 check-ins magistraux',
        emoji: '💎',
        rarity: 'common',
        image: '/img/stickers/common/21_Florent_Manaudou_Natation.webp',
        criteria: { type: 'checkin_streak', days: 49 }
    },
    checkin_56_1: {
        id: 'checkin_56_1',
        name: 'Huit Semaines',
        description: '56 check-ins consécutifs',
        emoji: '🏆',
        rarity: 'common',
        image: '/img/stickers/common/22_Leon_Marchand_Natation.webp',
        criteria: { type: 'checkin_streak', days: 56 }
    },
    checkin_56_2: {
        id: 'checkin_56_2',
        name: 'Maîtrise Parfaite',
        description: '56 jours d\'affilée',
        emoji: '🔥',
        rarity: 'common',
        image: '/img/stickers/common/23_Teddy_Riner_Judo.webp',
        criteria: { type: 'checkin_streak', days: 56 }
    },
    checkin_56_3: {
        id: 'checkin_56_3',
        name: 'Icône Intemporelle',
        description: '56 check-ins légendaires',
        emoji: '✨',
        rarity: 'common',
        image: '/img/stickers/common/24_Giba_Volleyball.webp',
        criteria: { type: 'checkin_streak', days: 56 }
    },
    checkin_56_4: {
        id: 'checkin_56_4',
        name: 'Perfection Ultime',
        description: '56 jours sans pause',
        emoji: '🌠',
        rarity: 'common',
        image: '/img/stickers/common/25_Rafael_Nadal_Tennis.webp',
        criteria: { type: 'checkin_streak', days: 56 }
    },
    checkin_56_5: {
        id: 'checkin_56_5',
        name: 'Champion Éternel',
        description: '56 check-ins divins',
        emoji: '⚡',
        rarity: 'common',
        image: '/img/stickers/common/26_Usain_Bolt_Athletisme.webp',
        criteria: { type: 'checkin_streak', days: 56 }
    },
    checkin_56_6: {
        id: 'checkin_56_6',
        name: 'Déesse du Check-in',
        description: '56 jours de gloire',
        emoji: '👑',
        rarity: 'common',
        image: '/img/stickers/common/27_Lionel_Messi_Football.webp',
        criteria: { type: 'checkin_streak', days: 56 }
    },

    // ========== STICKERS RARES (8) ==========
    consistent_player: {
        id: 'consistent_player',
        name: 'Joueuse Assidue',
        description: '5 jours consécutifs de RPE',
        emoji: '💪',
        rarity: 'rare',
        image: '/img/stickers/rare/01_Muhammad_Ali_Boxe_GOLD.webp',
        criteria: { type: 'streak', days: 5 }
    },
    week_complete: {
        id: 'week_complete',
        name: 'Semaine Complète',
        description: '9/9 RPE obligatoires de la semaine',
        emoji: '✅',
        rarity: 'rare',
        image: '/img/stickers/rare/05_Jesse_Owens_Athletisme_GOLD.webp',
        criteria: { type: 'weekly_rpe', required: 9 }
    },
    super_invested: {
        id: 'super_invested',
        name: 'Super Investie',
        description: '2+ séances supplémentaires dans la semaine',
        emoji: '⭐',
        rarity: 'rare',
        image: '/img/stickers/rare/03_Michael_Jordan_Basketball_GOLD.webp',
        criteria: { type: 'bonus_sessions', required: 2 }
    },
    streak_7: {
        id: 'streak_7',
        name: 'Semaine Parfaite',
        description: '7 jours consécutifs de RPE',
        emoji: '🔥',
        rarity: 'rare',
        image: '/img/stickers/rare/01_Muhammad_Ali_Boxe_GOLD.webp',
        criteria: { type: 'streak', days: 7 }
    },
    streak_14: {
        id: 'streak_14',
        name: 'Deux Semaines Implacable',
        description: '14 jours consécutifs',
        emoji: '🔥🔥',
        rarity: 'rare',
        image: '/img/stickers/rare/02_Pele_Football_GOLD.webp',
        criteria: { type: 'streak', days: 14 }
    },
    month_100: {
        id: 'month_100',
        name: 'Mois Complet',
        description: 'Tous les RPE obligatoires du mois',
        emoji: '📅',
        rarity: 'rare',
        image: '/img/stickers/rare/03_Michael_Jordan_Basketball_GOLD.webp',
        criteria: { type: 'monthly_rpe', completion: 100 }
    },
    week_perfect: {
        id: 'week_perfect',
        name: 'Perfection Absolue',
        description: '13/13 RPE (obligatoires + supplémentaires)',
        emoji: '💎',
        rarity: 'rare',
        image: '/img/stickers/rare/04_Diego_Maradona_Football_GOLD.webp',
        criteria: { type: 'weekly_rpe', required: 13 }
    },
    rpe_regular: {
        id: 'rpe_regular',
        name: 'RPE Régulier',
        description: '50 RPE soumis au total',
        emoji: '📈',
        rarity: 'rare',
        image: '/img/stickers/rare/01_Muhammad_Ali_Boxe_GOLD.webp',
        criteria: { type: 'total_rpe', required: 50 }
    },
    checkin_master: {
        id: 'checkin_master',
        name: 'Check-in Master',
        description: '100 check-ins au total',
        emoji: '✅',
        rarity: 'rare',
        image: '/img/stickers/rare/02_Pele_Football_GOLD.webp',
        criteria: { type: 'total_checkins', required: 100 }
    },
    rpe_expert: {
        id: 'rpe_expert',
        name: 'Expert RPE',
        description: '200 RPE soumis au total',
        emoji: '🏆',
        rarity: 'rare',
        image: '/img/stickers/rare/05_Jesse_Owens_Athletisme_GOLD.webp',
        criteria: { type: 'total_rpe', required: 200 }
    },

    // ========== STICKERS LÉGENDAIRES (16 - Équipe Sablé) ==========
    // Joueurs individuels (critères progressifs)
    player_charlotte: {
        id: 'player_charlotte',
        name: 'Charlotte',
        description: 'Débloqué après 2 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/charlotte.webp',
        criteria: { type: 'weeks_complete', required: 2 }
    },
    player_chloe: {
        id: 'player_chloe',
        name: 'Chloé',
        description: 'Débloqué après 3 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/chloe.webp',
        criteria: { type: 'weeks_complete', required: 3 }
    },
    player_cyrielle: {
        id: 'player_cyrielle',
        name: 'Cyrielle',
        description: 'Débloqué après 4 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/cyrielle.webp',
        criteria: { type: 'weeks_complete', required: 4 }
    },
    player_eline: {
        id: 'player_eline',
        name: 'Eline',
        description: 'Débloqué après 14 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/eline_chevrollier.webp', // TEMP: En attente SVG
        criteria: { type: 'weeks_complete', required: 14 }
    },
    player_julia: {
        id: 'player_julia',
        name: 'Julia',
        description: 'Débloqué après 5 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/julia.webp',
        criteria: { type: 'weeks_complete', required: 5 }
    },
    player_lea: {
        id: 'player_lea',
        name: 'Léa',
        description: 'Débloqué après 6 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/lea.webp',
        criteria: { type: 'weeks_complete', required: 6 }
    },
    player_lilou: {
        id: 'player_lilou',
        name: 'Lilou',
        description: 'Débloqué après 7 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/lilou.webp',
        criteria: { type: 'weeks_complete', required: 7 }
    },
    player_lise: {
        id: 'player_lise',
        name: 'Lise',
        description: 'Débloqué après 8 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/lise.webp',
        criteria: { type: 'weeks_complete', required: 8 }
    },
    player_lovely: {
        id: 'player_lovely',
        name: 'Lovely',
        description: 'Débloqué après 9 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/lovely.webp',
        criteria: { type: 'weeks_complete', required: 9 }
    },

    player_melina: {
        id: 'player_melina',
        name: 'Mélina',
        description: 'Débloqué après 10 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/melina.webp',
        criteria: { type: 'weeks_complete', required: 10 }
    },
    player_nelia: {
        id: 'player_nelia',
        name: 'Nélia',
        description: 'Débloqué après 11 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/nelia.webp',
        criteria: { type: 'weeks_complete', required: 11 }
    },
    player_nine: {
        id: 'player_nine',
        name: 'Nine',
        description: 'Débloqué après 15 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/nine_wester.webp', // TEMP: En attente PNG
        criteria: { type: 'weeks_complete', required: 15 }
    },
    player_rose: {
        id: 'player_rose',
        name: 'Rose',
        description: 'Débloqué après 12 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/rose.webp',
        criteria: { type: 'weeks_complete', required: 12 }
    },
    player_zoe: {
        id: 'player_zoe',
        name: 'Zoé',
        description: 'Débloqué après 13 semaines complètes',
        emoji: '🏐',
        rarity: 'legendary',
        image: '/img/stickers/legendary/zoe.webp',
        criteria: { type: 'weeks_complete', required: 13 }
    },
    
    // Coachs (critères plus exigeants)
    coach_olivier: {
        id: 'coach_olivier',
        name: 'Coach Olivier',
        description: 'Débloqué après 2 semaines parfaites',
        emoji: '🎖️',
        rarity: 'legendary',
        image: '/img/stickers/legendary/olivier_bouvet.webp', // TEMP: En attente SVG
        criteria: { type: 'weeks_perfect', required: 2 }
    },
    coach_alexis: {
        id: 'coach_alexis',
        name: 'Coach Alexis',
        description: 'Débloqué après 3 semaines parfaites',
        emoji: '🎖️',
        rarity: 'legendary',
        image: '/img/stickers/legendary/alexis_mustiere.webp', // TEMP: En attente SVG
        criteria: { type: 'weeks_perfect', required: 3 }
    },
    
    // Équipe complète (ultime achievement)
    team_collectif: {
        id: 'team_collectif',
        name: 'Collectif Sablé',
        description: 'Débloqué après avoir obtenu tous les stickers individuels',
        emoji: '👑',
        rarity: 'legendary',
        image: '/img/stickers/legendary/team_collectif.webp', // TEMP: En attente PNG - remplacer par image équipe
        criteria: { type: 'all_players', required: 14 }
    }
};

/**
 * Vérifie et attribue les stickers mérités après une action
 * @param {string} playerId - ID de la joueuse
 * @param {string} triggerType - Type d'action : 'rpe', 'checkin', 'weekly', 'monthly'
 * @returns {Promise<Array>} - Liste des nouveaux stickers gagnés
 */
async function checkAndAwardStickers(playerId, triggerType = 'rpe') {
    try {
        console.log(`🎖️ Vérification stickers pour ${playerId} (trigger: ${triggerType})`);

        // 1. Récupérer le profil de la joueuse
        const playerDoc = await db.collection('players').doc(playerId).get();
        if (!playerDoc.exists) {
            console.warn('Joueuse non trouvée');
            return [];
        }

        const playerData = playerDoc.data();
        const currentStickers = playerData.stickers || [];
        const newStickers = [];

        // 2. Récupérer les stats de training
        const trainingStatsDoc = await db.collection('players').doc(playerId).collection('stats').doc('training').get();
        const trainingStats = trainingStatsDoc.exists ? trainingStatsDoc.data() : {};

        // 3. Vérifier chaque critère selon le trigger
        switch (triggerType) {
            case 'rpe':
                await checkRPEStickers(playerId, playerData, trainingStats, currentStickers, newStickers);
                // IMPORTANT : Vérifier aussi les weekly après un RPE (semaines complètes)
                await checkWeeklyStickers(playerId, playerData, trainingStats, currentStickers, newStickers);
                break;
            case 'checkin':
                await checkCheckinStickers(playerId, playerData, currentStickers, newStickers);
                break;
            case 'weekly':
                await checkWeeklyStickers(playerId, playerData, trainingStats, currentStickers, newStickers);
                break;
            case 'monthly':
                await checkMonthlyStickers(playerId, playerData, currentStickers, newStickers);
                break;
        }

        // 4. Attribuer les nouveaux stickers
        if (newStickers.length > 0) {
            const updatedStickers = [...currentStickers, ...newStickers.map(s => s.id)];
            
            await db.collection('players').doc(playerId).update({
                stickers: updatedStickers,
                stickerStats: {
                    total: updatedStickers.length,
                    lastEarned: new Date(),
                    byRarity: countByRarity(updatedStickers)
                }
            });

            console.log(`✅ ${newStickers.length} nouveau(x) sticker(s) attribué(s)!`);
            
            // Déclencher l'animation pour chaque sticker
            for (const sticker of newStickers) {
                showStickerReveal(sticker);
            }
        }

        return newStickers;

    } catch (error) {
        console.error('❌ Erreur checkAndAwardStickers:', error);
        return [];
    }
}

/**
 * Vérifie les stickers liés aux RPE
 */
async function checkRPEStickers(playerId, playerData, trainingStats, currentStickers, newStickers) {
    // Streak 5 jours
    if (!currentStickers.includes('consistent_player') && trainingStats.weeklyStreak >= 1) {
        const currentStreak = await getCurrentStreak(playerId);
        if (currentStreak >= 5) {
            newStickers.push(STICKER_DEFINITIONS.consistent_player);
        }
    }

    // Streak 7 jours
    if (!currentStickers.includes('streak_7')) {
        const currentStreak = await getCurrentStreak(playerId);
        if (currentStreak >= 7) {
            newStickers.push(STICKER_DEFINITIONS.streak_7);
        }
    }

    // Streak 14 jours
    if (!currentStickers.includes('streak_14')) {
        const currentStreak = await getCurrentStreak(playerId);
        if (currentStreak >= 14) {
            newStickers.push(STICKER_DEFINITIONS.streak_14);
        }
    }

    // Coach Alexis (Streak 30 jours)
    if (!currentStickers.includes('coach_alexis')) {
        const currentStreak = await getCurrentStreak(playerId);
        if (currentStreak >= 30) {
            newStickers.push(STICKER_DEFINITIONS.coach_alexis);
        }
    }
}

/**
 * Vérifie les stickers liés aux check-ins
 */
async function checkCheckinStickers(playerId, playerData, currentStickers, newStickers) {
    try {
        // Récupérer les stats d'engagement
        const engagementDoc = await db.collection('players').doc(playerId).collection('stats').doc('engagement').get();
        if (!engagementDoc.exists) return;
        
        const engagement = engagementDoc.data();
        const currentStreak = engagement.currentStreak || 0;
        
        // Paliers : 7, 14, 21, 28, 35, 42, 49, 56
        const streakPaliers = [
            { days: 7, stickers: ['checkin_7_1', 'checkin_7_2', 'checkin_7_3'] },
            { days: 14, stickers: ['checkin_14_1', 'checkin_14_2', 'checkin_14_3'] },
            { days: 21, stickers: ['checkin_21_1', 'checkin_21_2', 'checkin_21_3'] },
            { days: 28, stickers: ['checkin_28_1', 'checkin_28_2', 'checkin_28_3'] },
            { days: 35, stickers: ['checkin_35_1', 'checkin_35_2', 'checkin_35_3'] },
            { days: 42, stickers: ['checkin_42_1', 'checkin_42_2', 'checkin_42_3'] },
            { days: 49, stickers: ['checkin_49_1', 'checkin_49_2', 'checkin_49_3'] },
            { days: 56, stickers: ['checkin_56_1', 'checkin_56_2', 'checkin_56_3', 'checkin_56_4', 'checkin_56_5', 'checkin_56_6'] }
        ];
        
        // Vérifier chaque palier atteint
        for (const palier of streakPaliers) {
            if (currentStreak >= palier.days) {
                for (const stickerId of palier.stickers) {
                    if (!currentStickers.includes(stickerId) && STICKER_DEFINITIONS[stickerId]) {
                        newStickers.push(STICKER_DEFINITIONS[stickerId]);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('Erreur checkCheckinStickers:', error);
    }
}

/**
 * Vérifie les stickers hebdomadaires (appelé le dimanche soir)
 */
async function checkWeeklyStickers(playerId, playerData, trainingStats, currentStickers, newStickers) {
    const weekSessions = trainingStats.currentWeekSessions || 0;
    const weeksCompleteCount = trainingStats.weeksCompleteCount || 0;
    const weeksPerfectCount = trainingStats.weeksPerfectCount || 0;

    console.log(`📊 Stats hebdo:`, {
        weekSessions,
        weeksCompleteCount,
        weeksPerfectCount,
        currentStickers: currentStickers.filter(s => s.includes('week')).join(', ') || 'aucun'
    });

    // Semaine complète (9/9)
    if (!currentStickers.includes('week_complete') && weekSessions >= 9) {
        console.log('🎯 Déblocage sticker week_complete !');
        newStickers.push(STICKER_DEFINITIONS.week_complete);
    } else if (weekSessions >= 9) {
        console.log('ℹ️ Sticker week_complete déjà obtenu');
    } else {
        console.log(`ℹ️ Semaine incomplète: ${weekSessions}/9 RPE`);
    }

    // Semaine parfaite (13/13)
    if (!currentStickers.includes('week_perfect') && weekSessions >= 13) {
        console.log('🎯 Déblocage sticker week_perfect !');
        newStickers.push(STICKER_DEFINITIONS.week_perfect);
    }

    // Super investie (2+ optionnels)
    if (!currentStickers.includes('super_invested')) {
        const optionalSessions = trainingStats.currentWeekBonus || 0;
        if (optionalSessions >= 2) {
            newStickers.push(STICKER_DEFINITIONS.super_invested);
        }
    }

    // === STICKERS LÉGENDAIRES - JOUEUSES (critères progressifs) ===
    const playerName = playerData.name ? playerData.name.toLowerCase() : '';
    
    // Vérifier chaque sticker de joueuse individuellement selon son critère
    Object.entries(STICKER_DEFINITIONS).forEach(([stickerId, sticker]) => {
        if (sticker.rarity === 'legendary' && stickerId.startsWith('player_')) {
            // Vérifier si déjà possédé
            if (currentStickers.includes(stickerId)) return;
            
            // Vérifier si c'est la bonne joueuse
            const stickerKey = stickerId.replace('player_', '');
            if (!playerName.includes(stickerKey)) return;
            
            // Vérifier si le critère est atteint
            const requiredWeeks = sticker.criteria.required;
            if (weeksCompleteCount >= requiredWeeks) {
                newStickers.push(sticker);
            }
        }
    });

    // Coach Olivier (6 semaines parfaites)
    if (!currentStickers.includes('coach_olivier') && weeksPerfectCount >= 6) {
        newStickers.push(STICKER_DEFINITIONS.coach_olivier);
    }

    // Collectif Sablé (tous les stickers joueurs débloqués)
    if (!currentStickers.includes('team_collectif')) {
        const playerStickersOwned = currentStickers.filter(id => id.startsWith('player_')).length;
        if (playerStickersOwned >= 14) {
            newStickers.push(STICKER_DEFINITIONS.team_collectif);
        }
    }
}

/**
 * Vérifie les stickers mensuels (appelé en fin de mois)
 */
async function checkMonthlyStickers(playerId, playerData, currentStickers, newStickers) {
    // Mois 100% (tous les RPE obligatoires)
    if (!currentStickers.includes('month_100')) {
        const monthCompletion = await getMonthCompletion(playerId);
        if (monthCompletion >= 100) {
            newStickers.push(STICKER_DEFINITIONS.month_100);
        }
    }
}

/**
 * Récupère le streak actuel de la joueuse
 */
async function getCurrentStreak(playerId) {
    try {
        const trainingDoc = await db.collection('players').doc(playerId).collection('stats').doc('training').get();
        if (trainingDoc.exists) {
            const data = trainingDoc.data();
            return data.weeklyStreak || 0;
        }
        return 0;
    } catch (error) {
        console.error('Erreur getCurrentStreak:', error);
        return 0;
    }
}

/**
 * Compte les check-ins de la semaine
 */
async function getWeekCheckins(playerId) {
    try {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lundi
        startOfWeek.setHours(0, 0, 0, 0);

        const snapshot = await db.collection('players')
            .doc(playerId)
            .collection('checkIns')
            .where('date', '>=', startOfWeek.toISOString().split('T')[0])
            .get();

        return snapshot.size;
    } catch (error) {
        console.error('Erreur getWeekCheckins:', error);
        return 0;
    }
}

/**
 * Calcule le taux de complétion du mois en cours
 */
async function getMonthCompletion(playerId) {
    try {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const snapshot = await db.collection('players')
            .doc(playerId)
            .collection('rpe')
            .where('date', '>=', firstDay.toISOString().split('T')[0])
            .where('date', '<=', lastDay.toISOString().split('T')[0])
            .get();

        // Calculer le nombre de jours ouvrés (lundi-vendredi)
        const workDays = countWorkDays(firstDay, lastDay);
        const expectedRPE = workDays * 2; // 2 RPE par jour ouvré

        return (snapshot.size / expectedRPE) * 100;
    } catch (error) {
        console.error('Erreur getMonthCompletion:', error);
        return 0;
    }
}

/**
 * Compte les jours ouvrés entre deux dates
 */
function countWorkDays(startDate, endDate) {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) { // Pas samedi ni dimanche
            count++;
        }
        current.setDate(current.getDate() + 1);
    }
    
    return count;
}

/**
 * Compte les stickers par rareté
 */
function countByRarity(stickerIds) {
    const counts = { common: 0, rare: 0, legendary: 0 };
    
    stickerIds.forEach(id => {
        const sticker = STICKER_DEFINITIONS[id];
        if (sticker) {
            counts[sticker.rarity]++;
        }
    });
    
    return counts;
}

/**
 * Affiche l'animation de révélation d'un sticker
 */
function showStickerReveal(sticker) {
    if (typeof showStickerAnimation === 'function') {
        showStickerAnimation(sticker);
    } else {
        console.log(`🎖️ Nouveau sticker: ${sticker.name}`);
    }
}

/**
 * Affiche le widget de collection de stickers sur le dashboard
 */
async function displayStickerWidget(playerId) {
    const widgetContainer = document.getElementById('stickerWidget');
    if (!widgetContainer) return;

    try {
        // Récupérer les stickers de la joueuse
        const playerDoc = await db.collection('players').doc(playerId).get();
        if (!playerDoc.exists) return;

        const playerData = playerDoc.data();
        const ownedStickers = playerData.stickers || [];
        
        // Compter par rareté
        const counts = countByRarity(ownedStickers);
        const totalStickers = Object.keys(STICKER_DEFINITIONS).length;
        const percentage = Math.round((ownedStickers.length / totalStickers) * 100);

        // Obtenir les 3 derniers stickers débloqués
        const recentStickers = ownedStickers.slice(-3).reverse().map(id => STICKER_DEFINITIONS[id]).filter(s => s);

        // Générer le HTML du widget
        const html = `
            <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; color: white;">
                        🏆 Collection de Stickers
                    </h3>
                    <div style="background: rgba(255,255,255,0.2); padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                        ${ownedStickers.length}/${totalStickers}
                    </div>
                </div>

                <!-- Barre de progression -->
                <div style="background: rgba(255,255,255,0.2); border-radius: 20px; height: 8px; margin-bottom: 16px; overflow: hidden;">
                    <div style="background: white; height: 100%; width: ${percentage}%; border-radius: 20px; transition: width 0.5s;"></div>
                </div>

                <!-- Stats par rareté -->
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
                    <div style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 12px; text-align: center;">
                        <div style="font-size: 24px; font-weight: 700;">${counts.common}</div>
                        <div style="font-size: 12px; opacity: 0.9;">Communs</div>
                    </div>
                    <div style="background: rgba(59, 130, 246, 0.3); padding: 12px; border-radius: 12px; text-align: center; border: 2px solid rgba(59, 130, 246, 0.5);">
                        <div style="font-size: 24px; font-weight: 700;">${counts.rare}</div>
                        <div style="font-size: 12px; opacity: 0.9;">Rares</div>
                    </div>
                    <div style="background: rgba(234, 179, 8, 0.3); padding: 12px; border-radius: 12px; text-align: center; border: 2px solid rgba(234, 179, 8, 0.5);">
                        <div style="font-size: 24px; font-weight: 700;">${counts.legendary}</div>
                        <div style="font-size: 12px; opacity: 0.9;">Légendaires</div>
                    </div>
                </div>

                ${recentStickers.length > 0 ? `
                    <!-- Derniers stickers débloqués -->
                    <div style="margin-top: 16px;">
                        <div style="font-size: 14px; margin-bottom: 12px; opacity: 0.9; font-weight: 600;">✨ Derniers débloqués</div>
                        <div style="display: flex; gap: 8px; justify-content: center;">
                            ${recentStickers.map(sticker => `
                                <div style="position: relative;">
                                    <img src="${sticker.image}" 
                                         alt="${sticker.name}" 
                                         style="width: 64px; height: 64px; border-radius: 12px; border: 3px solid ${sticker.rarity === 'legendary' ? '#fbbf24' : sticker.rarity === 'rare' ? '#3b82f6' : '#10b981'}; object-fit: cover; background: white;"
                                         title="${sticker.name}: ${sticker.description}">
                                    <div style="position: absolute; top: -6px; right: -6px; background: ${sticker.rarity === 'legendary' ? '#fbbf24' : sticker.rarity === 'rare' ? '#3b82f6' : '#10b981'}; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 2px solid white;">
                                        ${sticker.emoji}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : `
                    <div style="text-align: center; padding: 20px; opacity: 0.8; font-size: 14px;">
                        Complète des RPE pour débloquer des stickers ! 🎯
                    </div>
                `}

                <!-- Bouton voir collection (Phase 2) -->
                ${ownedStickers.length > 0 ? `
                    <button onclick="alert('Page Collection à venir en Phase 2 ! 🎨')" 
                            style="width: 100%; margin-top: 16px; padding: 12px; background: rgba(255,255,255,0.2); border: 2px solid rgba(255,255,255,0.5); color: white; border-radius: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
                            onmouseover="this.style.background='rgba(255,255,255,0.3)'"
                            onmouseout="this.style.background='rgba(255,255,255,0.2)'">
                        📖 Voir ma collection complète
                    </button>
                ` : ''}
            </div>
            <button class="sticker-collection-btn" onclick="openStickerCollection('${playerId}')" 
                    style="width: 100%; padding: 12px; margin-top: 15px; background: linear-gradient(135deg, #10b981, #3b82f6); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease;">
                📖 Voir ma collection complète
            </button>
            <button onclick="forceCheckStickers('${playerId}')" 
                    style="width: 100%; padding: 12px; margin-top: 10px; background: linear-gradient(135deg, #f59e0b, #ef4444); color: white; border: none; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);">
                🎯 Vérifier mes stickers maintenant
            </button>
        `;

        widgetContainer.innerHTML = html;
        widgetContainer.style.display = 'block';

    } catch (error) {
        console.error('Erreur displayStickerWidget:', error);
    }
}

/**
 * Force la vérification de TOUS les stickers (RPE + check-in + weekly)
 * Utile pour débloquer les stickers après une semaine complète
 */
async function forceCheckStickers(playerId) {
    try {
        console.log('🎯 Vérification manuelle des stickers...');
        
        // Rafraîchir les stats de training pour avoir les données à jour
        if (typeof displayTrainingWidget === 'function') {
            await displayTrainingWidget(playerId);
        }
        
        // Petite pause pour s'assurer que les stats sont à jour
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Vérifier RPE
        const rpeStickers = await checkAndAwardStickers(playerId, 'rpe');
        
        // Vérifier check-in
        const checkinStickers = await checkAndAwardStickers(playerId, 'checkin');
        
        // Vérifier hebdomadaire (semaines complètes)
        const weeklyStickers = await checkAndAwardStickers(playerId, 'weekly');
        
        // Vérifier mensuel
        const monthlyStickers = await checkAndAwardStickers(playerId, 'monthly');
        
        const totalNew = (rpeStickers?.length || 0) + (checkinStickers?.length || 0) + 
                         (weeklyStickers?.length || 0) + (monthlyStickers?.length || 0);
        
        if (totalNew > 0) {
            console.log(`✅ ${totalNew} nouveau(x) sticker(s) débloqué(s) !`);
        } else {
            alert('✨ Vérification terminée !\n\nAucun nouveau sticker pour le moment.\n\nContinue comme ça ! 💪');
        }
        
        // Rafraîchir le widget
        setTimeout(() => displayStickerWidget(playerId), 1000);
        
    } catch (error) {
        console.error('❌ Erreur forceCheckStickers:', error);
        alert('Erreur lors de la vérification. Veuillez réessayer.');
    }
}

// Exposer les fonctions globalement
window.checkAndAwardStickers = checkAndAwardStickers;
window.displayStickerWidget = displayStickerWidget;
window.forceCheckStickers = forceCheckStickers;
window.STICKER_DEFINITIONS = STICKER_DEFINITIONS;

console.log('✅ Stickers system loaded');


