console.log('🚀🚀🚀 DEBUT CHARGEMENT training-recommendations.js 🚀🚀🚀');

/**
 * ============================================================================
 * MODULE RECOMMANDATIONS D'ENTRAÎNEMENT PAR PHASE DU CYCLE
 * ============================================================================
 * 
 * Ce module fournit des recommandations d'entraînement personnalisées
 * basées sur la phase du cycle menstruel de chaque joueuse.
 * 
 * Phases du cycle :
 * - Menstruelle (J1-J5) : Récupération, technique légère
 * - Folliculaire (J6-J13) : Force, puissance, intensité haute
 * - Ovulatoire (J14-J16) : Pic de performance, compétition
 * - Lutéale Précoce (J17-J21) : Endurance, volume modéré
 * - Lutéale Tardive/SPM (J22-J28) : Technique, récupération active
 * 
 * @author Manus AI
 * @version 1.0
 * @date 15/12/2025
 */

// ============================================================================
// CONSTANTES - DÉFINITION DES PHASES ET RECOMMANDATIONS
// ============================================================================

const CYCLE_PHASES = {
    menstrual: {
        name: 'Menstruelle',
        shortName: 'Règles',
        days: [1, 2, 3, 4, 5],
        icon: '🔴',
        color: '#ef4444',
        bgColor: '#fef2f2',
        borderColor: '#fecaca',
        hormones: {
            estrogen: 'Bas',
            progesterone: 'Bas',
            energy: 'Variable'
        },
        recommendations: {
            global: 'Privilégier la récupération et les exercices légers. Écouter son corps.',
            intensity: '⬇️ Faible à Modérée',
            volume: '⬇️ Réduit',
            focus: ['Technique', 'Mobilité', 'Récupération active'],
            avoid: ['Charges lourdes', 'Haute intensité prolongée'],
            ppg: {
                title: 'PPG - Phase Menstruelle',
                exercises: [
                    '🧘 Yoga / Stretching (20-30 min)',
                    '🚶 Marche active ou vélo léger',
                    '💪 Renforcement léger (poids corps)',
                    '🌊 Natation légère (si confortable)'
                ],
                sets: '2-3 séries',
                reps: '12-15 répétitions',
                rest: '60-90 secondes',
                rpe_target: '4-5/10'
            },
            terrain: {
                title: 'Terrain - Phase Menstruelle',
                exercises: [
                    '🏐 Technique de passe (sans déplacement)',
                    '🎯 Précision au service (volume réduit)',
                    '👀 Travail visuel et lecture de jeu',
                    '🤝 Exercices de cohésion d\'équipe'
                ],
                duration: '45-60 min',
                intensity: 'Basse',
                note: 'Éviter les sauts répétés et les sprints'
            }
        }
    },
    
    follicular: {
        name: 'Folliculaire',
        shortName: 'Folliculaire',
        days: [6, 7, 8, 9, 10, 11, 12, 13],
        icon: '🟢',
        color: '#22c55e',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        hormones: {
            estrogen: 'En hausse ↑',
            progesterone: 'Bas',
            energy: 'Haute ↑'
        },
        recommendations: {
            global: 'Phase optimale pour le développement de la force et de la puissance. Profiter de l\'énergie élevée !',
            intensity: '⬆️ Haute',
            volume: '⬆️ Élevé',
            focus: ['Force maximale', 'Puissance', 'Explosivité', 'Nouveaux apprentissages'],
            avoid: [],
            ppg: {
                title: 'PPG - Phase Folliculaire',
                exercises: [
                    '🏋️ Squats / Deadlifts (charges progressives)',
                    '💥 Pliométrie (box jumps, depth jumps)',
                    '🔥 HIIT / Circuit training',
                    '💪 Renforcement haut du corps (développé, tirage)'
                ],
                sets: '4-5 séries',
                reps: '6-10 répétitions',
                rest: '90-120 secondes',
                rpe_target: '7-8/10'
            },
            terrain: {
                title: 'Terrain - Phase Folliculaire',
                exercises: [
                    '🏐 Attaque puissante (travail de frappe)',
                    '🦘 Travail de détente verticale',
                    '⚡ Sprints et changements de direction',
                    '🎯 Nouveaux systèmes tactiques'
                ],
                duration: '90-120 min',
                intensity: 'Haute',
                note: 'Moment idéal pour les tests physiques et les PR'
            }
        }
    },
    
    ovulatory: {
        name: 'Ovulatoire',
        shortName: 'Ovulation',
        days: [14, 15, 16],
        icon: '⭐',
        color: '#eab308',
        bgColor: '#fefce8',
        borderColor: '#fef08a',
        hormones: {
            estrogen: 'Pic maximal ⬆️',
            progesterone: 'En hausse',
            energy: 'Maximale ⬆️⬆️'
        },
        recommendations: {
            global: 'PIC DE PERFORMANCE ! Idéal pour les compétitions et les records personnels. Attention au risque de blessure ligamentaire.',
            intensity: '⬆️⬆️ Très Haute',
            volume: '⬆️ Élevé',
            focus: ['Performance maximale', 'Compétition', 'Records personnels'],
            avoid: ['Négliger l\'échauffement', 'Ignorer les signaux de fatigue'],
            ppg: {
                title: 'PPG - Phase Ovulatoire',
                exercises: [
                    '🏆 Tests de performance (VMA, détente)',
                    '💥 Pliométrie avancée',
                    '🔥 Complexes force-vitesse',
                    '⚡ Travail de vitesse maximale'
                ],
                sets: '4-6 séries',
                reps: '3-6 répétitions',
                rest: '2-3 minutes',
                rpe_target: '8-9/10'
            },
            terrain: {
                title: 'Terrain - Phase Ovulatoire',
                exercises: [
                    '🏆 Matchs d\'entraînement',
                    '🏐 Situations de jeu à haute intensité',
                    '⚡ Enchaînements attaque-défense',
                    '🎯 Travail sous pression'
                ],
                duration: '90-120 min',
                intensity: 'Très haute',
                note: '⚠️ Échauffement prolongé recommandé (risque ligamentaire)'
            }
        }
    },
    
    luteal_early: {
        name: 'Lutéale Précoce',
        shortName: 'Lutéale',
        days: [17, 18, 19, 20, 21],
        icon: '🟡',
        color: '#f59e0b',
        bgColor: '#fffbeb',
        borderColor: '#fde68a',
        hormones: {
            estrogen: 'Modéré',
            progesterone: 'En hausse ↑',
            energy: 'Stable'
        },
        recommendations: {
            global: 'Phase de transition. Maintenir l\'entraînement avec un focus sur l\'endurance et la technique.',
            intensity: '➡️ Modérée',
            volume: '➡️ Modéré',
            focus: ['Endurance', 'Technique', 'Automatismes', 'Volume modéré'],
            avoid: ['Charges maximales', 'Tests de performance'],
            ppg: {
                title: 'PPG - Phase Lutéale Précoce',
                exercises: [
                    '🏃 Endurance aérobie (course, vélo)',
                    '💪 Renforcement en circuit',
                    '🎯 Travail de gainage et stabilité',
                    '🧘 Mobilité et prévention'
                ],
                sets: '3-4 séries',
                reps: '10-12 répétitions',
                rest: '60-90 secondes',
                rpe_target: '6-7/10'
            },
            terrain: {
                title: 'Terrain - Phase Lutéale Précoce',
                exercises: [
                    '🏐 Répétition des automatismes',
                    '🎯 Travail de précision',
                    '🔄 Enchaînements techniques',
                    '👥 Jeu collectif et communication'
                ],
                duration: '75-90 min',
                intensity: 'Modérée',
                note: 'Focus sur la qualité technique plutôt que l\'intensité'
            }
        }
    },
    
    luteal_late: {
        name: 'Lutéale Tardive (SPM)',
        shortName: 'SPM',
        days: [22, 23, 24, 25, 26, 27, 28],
        icon: '🟠',
        color: '#f97316',
        bgColor: '#fff7ed',
        borderColor: '#fed7aa',
        hormones: {
            estrogen: 'En baisse ↓',
            progesterone: 'En baisse ↓',
            energy: 'Variable ↓'
        },
        recommendations: {
            global: 'Phase de récupération active. Adapter l\'intensité selon les symptômes SPM. Privilégier le bien-être.',
            intensity: '⬇️ Faible à Modérée',
            volume: '⬇️ Réduit',
            focus: ['Récupération active', 'Technique légère', 'Bien-être mental'],
            avoid: ['Haute intensité', 'Stress supplémentaire', 'Charges lourdes'],
            ppg: {
                title: 'PPG - Phase Lutéale Tardive (SPM)',
                exercises: [
                    '🧘 Yoga et stretching',
                    '🚶 Marche ou vélo léger',
                    '💆 Auto-massage et foam rolling',
                    '🌊 Natation ou aquagym'
                ],
                sets: '2-3 séries',
                reps: '12-15 répétitions',
                rest: '60-90 secondes',
                rpe_target: '4-6/10'
            },
            terrain: {
                title: 'Terrain - Phase Lutéale Tardive (SPM)',
                exercises: [
                    '🏐 Technique de passe et manchette',
                    '🎯 Service précision (volume réduit)',
                    '👀 Analyse vidéo et tactique',
                    '🤝 Cohésion d\'équipe'
                ],
                duration: '45-60 min',
                intensity: 'Basse',
                note: 'Écouter son corps, adapter selon les symptômes'
            }
        }
    }
};

// ============================================================================
// FONCTIONS PRINCIPALES
// ============================================================================

/**
 * Calcule le jour du cycle actuel pour une joueuse
 * @param {string} playerId - ID de la joueuse
 * @returns {Promise<Object>} - Informations sur le jour du cycle
 */
async function calculateCycleDayInfo(playerId) {
    console.log(`🚨🚨🚨 ENTREE calculateCycleDayInfo avec playerId: ${playerId}`);
    try {
        console.log(`🔍 calculateCycleDayInfo pour ${playerId}`);
        console.log(`🔍 window.db existe?`, !!window.db);
        console.log(`🔍 firebase.firestore existe?`, typeof firebase !== 'undefined' && typeof firebase.firestore === 'function');
        
        // Récupérer le profil de cycle de la joueuse
        const db = window.db || firebase.firestore();
        console.log(`🔍 db récupéré:`, !!db);
        const cycleDoc = await db.collection('menstrualCycle').doc(playerId).get();
        console.log(`🔍 cycleDoc récupéré`);

        
        console.log(`🔍 cycleDoc.exists: ${cycleDoc.exists}`);
        
        if (!cycleDoc.exists) {
            console.log(`📅 Pas de profil de cycle pour ${playerId}`);
            return null;
        }
        
        const cycleData = cycleDoc.data();
        console.log(`🔍 cycleData:`, cycleData);
        
        // Support pour cycleStartDate (nouveau format) et lastPeriodDate (ancien format)
        const lastPeriodDate = cycleData.cycleStartDate || cycleData.lastPeriodDate;
        const cycleLength = cycleData.cycleLength || 28;
        
        console.log(`🔍 lastPeriodDate: ${lastPeriodDate}, cycleLength: ${cycleLength}`);
        
        if (!lastPeriodDate) {
            console.log(`📅 Pas de date de début de cycle pour ${playerId}`);
            return null;
        }
        
        // Convertir la date
        let lastPeriod;
        if (lastPeriodDate.toDate) {
            lastPeriod = lastPeriodDate.toDate();
        } else if (typeof lastPeriodDate === 'string') {
            lastPeriod = new Date(lastPeriodDate);
        } else {
            lastPeriod = new Date(lastPeriodDate);
        }
        
        // Calculer le jour du cycle SANS modulo - pas de reset automatique
        const today = new Date();
        const diffTime = today - lastPeriod;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Pas de modulo - on continue à compter (J34, J45, etc.)
        let cycleDay = diffDays + 1;
        if (cycleDay <= 0) cycleDay = 1;

        const isExtended = cycleDay > cycleLength;

        return {
            playerId,
            cycleDay,
            cycleLength,
            lastPeriodDate: lastPeriod,
            daysInCurrentCycle: diffDays,
            isIrregular: cycleData.isIrregular || false,
            isExtended
        };
        
    } catch (error) {
        console.error(`❌❌❌ ERREUR CATCH dans calculateCycleDay pour ${playerId}:`, error);
        console.error(`❌ Error stack:`, error.stack);
        return null;
    }
    console.log(`🚨🚨🚨 FIN calculateCycleDay - ne devrait jamais arriver ici`);
}

/**
 * Détermine la phase du cycle basée sur le jour
 * @param {number} cycleDay - Jour du cycle (1-28+)
 * @param {number} cycleLength - Durée du cycle
 * @returns {Object} - Phase du cycle avec toutes les informations
 */
function determinePhase(cycleDay, cycleLength = 28) {
    // Ajuster les phases pour les cycles de longueur différente
    const ratio = cycleLength / 28;
    
    // Calculer les limites ajustées
    const menstrualEnd = Math.round(5 * ratio);
    const follicularEnd = Math.round(13 * ratio);
    const ovulatoryEnd = Math.round(16 * ratio);
    const lutealEarlyEnd = Math.round(21 * ratio);
    
    if (cycleDay <= menstrualEnd) {
        return { ...CYCLE_PHASES.menstrual, phaseKey: 'menstrual' };
    } else if (cycleDay <= follicularEnd) {
        return { ...CYCLE_PHASES.follicular, phaseKey: 'follicular' };
    } else if (cycleDay <= ovulatoryEnd) {
        return { ...CYCLE_PHASES.ovulatory, phaseKey: 'ovulatory' };
    } else if (cycleDay <= lutealEarlyEnd) {
        return { ...CYCLE_PHASES.luteal_early, phaseKey: 'luteal_early' };
    } else {
        return { ...CYCLE_PHASES.luteal_late, phaseKey: 'luteal_late' };
    }
}

/**
 * Obtient les recommandations complètes pour une joueuse
 * @param {string} playerId - ID de la joueuse
 * @returns {Promise<Object>} - Recommandations complètes
 */
async function getPlayerRecommendations(playerId) {
    console.log('🚀🚀🚀 ENTREE getPlayerRecommendations avec playerId:', playerId);
    try {
        // Vérifier si le questionnaire a été rempli
        const db = window.db || firebase.firestore();
        const profileDoc = await db.collection('cycleProfiles').doc(playerId).get();
        const questionnaireFilled = profileDoc.exists;
        
        console.log('🔍 Vérification questionnaire pour', playerId, ':', questionnaireFilled ? '✅ REMPLI' : '❌ NON REMPLI');
        if (profileDoc.exists) {
            console.log('📋 Données cycleProfiles:', profileDoc.data());
        }
        
        console.log('🎯 AVANT appel calculateCycleDayInfo pour', playerId);
        const cycleInfo = await calculateCycleDayInfo(playerId);
        console.log('🎯 APRES appel calculateCycleDayInfo, résultat:', cycleInfo);
        console.log('🎯 Type de cycleInfo:', typeof cycleInfo);
        console.log('🎯 cycleInfo est NaN?', Number.isNaN(cycleInfo));
        console.log('🎯 cycleInfo est null/undefined?', cycleInfo == null);
        
        if (!cycleInfo || Number.isNaN(cycleInfo) || typeof cycleInfo !== 'object') {
            console.log('⚠️ cycleInfo invalide → Cycle non configuré');
            return {
                hasData: false,
                message: 'Profil de cycle non configuré',
                recommendation: 'Configurez votre cycle menstruel pour recevoir des recommandations personnalisées.',
                questionnaireFilled: questionnaireFilled
            };
        }
        
        const phase = determinePhase(cycleInfo.cycleDay, cycleInfo.cycleLength);
        
        return {
            hasData: true,
            playerId,
            cycleDay: cycleInfo.cycleDay,
            cycleLength: cycleInfo.cycleLength,
            phase: phase,
            phaseName: phase.name,
            phaseIcon: phase.icon,
            phaseColor: phase.color,
            recommendations: phase.recommendations,
            hormones: phase.hormones,
            isIrregular: cycleInfo.isIrregular,
            lastPeriodDate: cycleInfo.lastPeriodDate,
            questionnaireFilled: questionnaireFilled
        };
        
    } catch (error) {
        console.error(`❌ Erreur recommandations pour ${playerId}:`, error);
        return {
            hasData: false,
            error: true,
            message: 'Erreur lors du chargement des recommandations',
            questionnaireFilled: false
        };
    }
}

/**
 * Génère le HTML du widget de recommandations pour le dashboard joueuse
 * @param {Object} recommendations - Recommandations de la joueuse
 * @returns {string} - HTML du widget
 */
function generateRecommendationsWidget(recommendations) {
    if (!recommendations.hasData) {
        // Afficher un message selon la situation
        return `
            <div style="
                background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
                border-radius: 16px;
                padding: 24px;
                margin: 16px 0;
                text-align: center;
            ">
                <span style="font-size: 48px;">📅</span>
                <h3 style="margin: 12px 0 8px 0; color: #374151;">Configuration du Cycle</h3>
                <p style="color: #6b7280; margin-bottom: 16px;">${recommendations.message || 'Configurez votre cycle menstruel pour recevoir des recommandations personnalisées.'}</p>
                ${!recommendations.questionnaireFilled ? `
                    <button onclick="openCycleQuestionnaireModal()" style="
                        background: #8b5cf6;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                    ">Remplir le questionnaire</button>
                ` : `
                    <button onclick="document.getElementById('cycleTab').click()" style="
                        background: #8b5cf6;
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                    ">Configurer mon cycle</button>
                `}
            </div>
        `;
    }
    
    const { phase, cycleDay, cycleLength, recommendations: recs } = recommendations;
    
    return `
        <div style="
            background: ${phase.bgColor};
            border: 2px solid ${phase.borderColor};
            border-radius: 16px;
            padding: 0;
            margin: 16px 0;
            overflow: hidden;
        ">
            <!-- Header -->
            <div style="
                background: linear-gradient(135deg, ${phase.color}22 0%, ${phase.color}44 100%);
                padding: 20px;
                border-bottom: 1px solid ${phase.borderColor};
            ">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 36px;">${phase.icon}</span>
                        <div>
                            <h3 style="margin: 0; color: ${phase.color}; font-size: 20px;">
                                Phase ${phase.name}
                            </h3>
                            <p style="margin: 4px 0 0 0; color: #6b7280; font-size: 14px;">
                                Jour ${cycleDay} sur ${cycleLength}
                            </p>
                        </div>
                    </div>
                    <div style="
                        background: ${phase.color};
                        color: white;
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-weight: 600;
                        font-size: 14px;
                    ">
                        ${recs.intensity}
                    </div>
                </div>
            </div>
            
            <!-- Recommandation Globale -->
            <div style="padding: 20px; border-bottom: 1px solid ${phase.borderColor};">
                <p style="margin: 0; color: #374151; font-size: 15px; line-height: 1.6;">
                    💡 ${recs.global}
                </p>
            </div>
            
            <!-- Hormones -->
            <div style="
                padding: 16px 20px;
                background: white;
                display: flex;
                gap: 24px;
                flex-wrap: wrap;
                border-bottom: 1px solid ${phase.borderColor};
            ">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">💊</span>
                    <span style="color: #6b7280; font-size: 13px;">Œstrogène: <strong>${phase.hormones.estrogen}</strong></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">💊</span>
                    <span style="color: #6b7280; font-size: 13px;">Progestérone: <strong>${phase.hormones.progesterone}</strong></span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 16px;">⚡</span>
                    <span style="color: #6b7280; font-size: 13px;">Énergie: <strong>${phase.hormones.energy}</strong></span>
                </div>
            </div>
            
            <!-- Tabs PPG / Terrain -->
            <div style="padding: 20px;">
                <div style="display: flex; gap: 8px; margin-bottom: 16px;">
                    <button onclick="showRecommendationTab('ppg')" id="tabPPG" style="
                        flex: 1;
                        padding: 10px;
                        border: 2px solid ${phase.color};
                        background: ${phase.color};
                        color: white;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                    ">🏋️ PPG</button>
                    <button onclick="showRecommendationTab('terrain')" id="tabTerrain" style="
                        flex: 1;
                        padding: 10px;
                        border: 2px solid ${phase.color};
                        background: white;
                        color: ${phase.color};
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                    ">🏐 Terrain</button>
                </div>
                
                <!-- Contenu PPG -->
                <div id="contentPPG" style="display: block;">
                    <h4 style="margin: 0 0 12px 0; color: ${phase.color};">${recs.ppg.title}</h4>
                    <ul style="margin: 0; padding-left: 0; list-style: none;">
                        ${recs.ppg.exercises.map(ex => `
                            <li style="
                                padding: 8px 12px;
                                background: white;
                                border-radius: 6px;
                                margin-bottom: 6px;
                                font-size: 14px;
                            ">${ex}</li>
                        `).join('')}
                    </ul>
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 8px;
                        margin-top: 12px;
                    ">
                        <div style="background: white; padding: 8px; border-radius: 6px; text-align: center;">
                            <div style="font-size: 12px; color: #6b7280;">Séries</div>
                            <div style="font-weight: 600; color: ${phase.color};">${recs.ppg.sets}</div>
                        </div>
                        <div style="background: white; padding: 8px; border-radius: 6px; text-align: center;">
                            <div style="font-size: 12px; color: #6b7280;">Répétitions</div>
                            <div style="font-weight: 600; color: ${phase.color};">${recs.ppg.reps}</div>
                        </div>
                        <div style="background: white; padding: 8px; border-radius: 6px; text-align: center;">
                            <div style="font-size: 12px; color: #6b7280;">Repos</div>
                            <div style="font-weight: 600; color: ${phase.color};">${recs.ppg.rest}</div>
                        </div>
                        <div style="background: white; padding: 8px; border-radius: 6px; text-align: center;">
                            <div style="font-size: 12px; color: #6b7280;">RPE Cible</div>
                            <div style="font-weight: 600; color: ${phase.color};">${recs.ppg.rpe_target}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Contenu Terrain -->
                <div id="contentTerrain" style="display: none;">
                    <h4 style="margin: 0 0 12px 0; color: ${phase.color};">${recs.terrain.title}</h4>
                    <ul style="margin: 0; padding-left: 0; list-style: none;">
                        ${recs.terrain.exercises.map(ex => `
                            <li style="
                                padding: 8px 12px;
                                background: white;
                                border-radius: 6px;
                                margin-bottom: 6px;
                                font-size: 14px;
                            ">${ex}</li>
                        `).join('')}
                    </ul>
                    <div style="
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 8px;
                        margin-top: 12px;
                    ">
                        <div style="background: white; padding: 8px; border-radius: 6px; text-align: center;">
                            <div style="font-size: 12px; color: #6b7280;">Durée</div>
                            <div style="font-weight: 600; color: ${phase.color};">${recs.terrain.duration}</div>
                        </div>
                        <div style="background: white; padding: 8px; border-radius: 6px; text-align: center;">
                            <div style="font-size: 12px; color: #6b7280;">Intensité</div>
                            <div style="font-weight: 600; color: ${phase.color};">${recs.terrain.intensity}</div>
                        </div>
                    </div>
                    ${recs.terrain.note ? `
                        <div style="
                            margin-top: 12px;
                            padding: 10px;
                            background: #fef3c7;
                            border-radius: 6px;
                            font-size: 13px;
                            color: #92400e;
                        ">
                            ⚠️ ${recs.terrain.note}
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- Focus / À éviter -->
            <div style="
                padding: 16px 20px;
                background: white;
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 16px;
            ">
                <div>
                    <h5 style="margin: 0 0 8px 0; color: #22c55e; font-size: 14px;">✅ Focus</h5>
                    <ul style="margin: 0; padding-left: 16px; font-size: 13px; color: #374151;">
                        ${recs.focus.map(f => `<li>${f}</li>`).join('')}
                    </ul>
                </div>
                ${recs.avoid.length > 0 ? `
                    <div>
                        <h5 style="margin: 0 0 8px 0; color: #ef4444; font-size: 14px;">❌ À éviter</h5>
                        <ul style="margin: 0; padding-left: 16px; font-size: 13px; color: #374151;">
                            ${recs.avoid.map(a => `<li>${a}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

/**
 * Affiche un onglet de recommandation (PPG ou Terrain)
 * @param {string} tab - 'ppg' ou 'terrain'
 */
function showRecommendationTab(tab) {
    const contentPPG = document.getElementById('contentPPG');
    const contentTerrain = document.getElementById('contentTerrain');
    const tabPPG = document.getElementById('tabPPG');
    const tabTerrain = document.getElementById('tabTerrain');
    
    if (!contentPPG || !contentTerrain) return;
    
    if (tab === 'ppg') {
        contentPPG.style.display = 'block';
        contentTerrain.style.display = 'none';
        if (tabPPG) {
            tabPPG.style.background = tabPPG.style.borderColor;
            tabPPG.style.color = 'white';
        }
        if (tabTerrain) {
            tabTerrain.style.background = 'white';
            tabTerrain.style.color = tabTerrain.style.borderColor;
        }
    } else {
        contentPPG.style.display = 'none';
        contentTerrain.style.display = 'block';
        if (tabTerrain) {
            tabTerrain.style.background = tabTerrain.style.borderColor;
            tabTerrain.style.color = 'white';
        }
        if (tabPPG) {
            tabPPG.style.background = 'white';
            tabPPG.style.color = tabPPG.style.borderColor;
        }
    }
}

/**
 * Génère un badge de phase compact pour le dashboard coach
 * @param {Object} phaseInfo - Informations de phase
 * @returns {string} - HTML du badge
 */
function generatePhaseBadge(phaseInfo) {
    if (!phaseInfo || !phaseInfo.hasData) {
        return `<span style="
            background: #f3f4f6;
            color: #9ca3af;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
        ">📅 Non configuré</span>`;
    }
    
    return `<span style="
        background: ${phaseInfo.phase.bgColor};
        color: ${phaseInfo.phase.color};
        border: 1px solid ${phaseInfo.phase.borderColor};
        padding: 4px 10px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        gap: 4px;
    ">${phaseInfo.phase.icon} J${phaseInfo.cycleDay} - ${phaseInfo.phase.shortName}</span>`;
}

/**
 * Charge et affiche les recommandations sur le dashboard joueuse
 * @param {string} playerId - ID de la joueuse
 */
async function loadAndDisplayRecommendations(playerId) {
    console.log('🎯🎯🎯 DEBUT loadAndDisplayRecommendations 🎯🎯🎯');
    console.log('🎯 playerId reçu:', playerId);
    
    const container = document.getElementById('recommendationsContainer') || 
                     document.getElementById('playerRecommendations');
    
    console.log('🎯 Recherche conteneur: recommendationsContainer ou playerRecommendations');
    console.log('🎯 Conteneur trouvé?', !!container);
    
    if (!container) {
        console.error('❌❌❌ CONTENEUR INTROUVABLE ❌❌❌');
        console.log('Elements avec ID disponibles:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
        return;
    }
    
    console.log('✅ Conteneur trouvé:', container.id);
    
    // Afficher un loader
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="
                width: 40px;
                height: 40px;
                border: 3px solid #e5e7eb;
                border-top-color: #8b5cf6;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 16px auto;
            "></div>
            <p style="color: #6b7280;">Chargement des recommandations...</p>
        </div>
    `;
    
    try {
        console.log('🎯 APPEL getPlayerRecommendations avec playerId:', playerId);
        const recommendations = await getPlayerRecommendations(playerId);
        console.log('📋 Recommandations reçues:', recommendations);
        
        if (!recommendations) {
            console.warn('⚠️ Aucune recommandation retournée');
            container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6b7280;">Aucune recommandation disponible</div>';
            return;
        }
        
        const html = generateRecommendationsWidget(recommendations);
        console.log('📋 HTML généré, longueur:', html.length);
        
        container.innerHTML = html;
        console.log('✅ Recommandations affichées');
    } catch (error) {
        console.error('❌ Erreur affichage recommandations:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ef4444;">
                <span style="font-size: 32px;">❌</span>
                <p>Erreur: ${error.message}</p>
            </div>
        `;
    }
}

/**
 * Initialise le module de recommandations
 */
function initTrainingRecommendations() {
    console.log('📋 Module Recommandations d\'Entraînement initialisé');
    
    // Ajouter le style pour l'animation de spin
    if (!document.getElementById('recommendationsStyles')) {
        const style = document.createElement('style');
        style.id = 'recommendationsStyles';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

// ============================================================================
// EXPORTS GLOBAUX
// ============================================================================

window.TrainingRecommendations = {
    calculateCycleDayInfo,
    determinePhase,
    getPlayerRecommendations,
    generateRecommendationsWidget,
    generatePhaseBadge,
    loadAndDisplayRecommendations,
    initTrainingRecommendations,
    CYCLE_PHASES
};

window.showRecommendationTab = showRecommendationTab;
window.loadAndDisplayRecommendations = loadAndDisplayRecommendations;
window.initTrainingRecommendations = initTrainingRecommendations;

console.log('✅✅✅ Module Training Recommendations COMPLETEMENT CHARGE ✅✅✅');
console.log('✅ window.loadAndDisplayRecommendations existe?', typeof window.loadAndDisplayRecommendations === 'function');

