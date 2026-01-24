/**
 * Module Planificateur Semaine
 * Vue calendrier des phases du cycle de l'équipe sur 7 jours
 * 
 * Fonctionnalités :
 * - Vue hebdomadaire de toutes les joueuses
 * - Phase du cycle pour chaque jour
 * - Recommandations d'entraînement par jour
 * - Export possible
 */

// ============================================
// CONFIGURATION
// ============================================

const WEEK_PLANNER_CONFIG = {
    daysToShow: 7,
    phases: {
        menstrual: {
            name: 'Menstruelle',
            shortName: 'Mens.',
            icon: '🩸',
            color: '#e91e63',
            bgColor: 'rgba(233, 30, 99, 0.15)',
            recommendation: 'Récupération',
            intensity: 'Légère'
        },
        follicular: {
            name: 'Folliculaire',
            shortName: 'Foll.',
            icon: '🌱',
            color: '#4caf50',
            bgColor: 'rgba(76, 175, 80, 0.15)',
            recommendation: 'Force & Puissance',
            intensity: 'Élevée'
        },
        ovulatory: {
            name: 'Ovulatoire',
            shortName: 'Ovul.',
            icon: '⚡',
            color: '#ff9800',
            bgColor: 'rgba(255, 152, 0, 0.15)',
            recommendation: 'Performance Max',
            intensity: 'Maximale'
        },
        luteal: {
            name: 'Lutéale',
            shortName: 'Lut.',
            icon: '🍂',
            color: '#9c27b0',
            bgColor: 'rgba(156, 39, 176, 0.15)',
            recommendation: 'Endurance',
            intensity: 'Modérée'
        },
        unknown: {
            name: 'Non configuré',
            shortName: 'N/C',
            icon: '❓',
            color: '#9e9e9e',
            bgColor: 'rgba(158, 158, 158, 0.15)',
            recommendation: '-',
            intensity: '-'
        }
    }
};

// ============================================
// FONCTIONS PRINCIPALES
// ============================================

/**
 * Initialiser le planificateur semaine
 */
async function initWeekPlanner() {
    console.log('📅 Planificateur Semaine: Initialisation...');
    
    const container = document.getElementById('weekPlannerContainer');
    if (!container) {
        console.warn('Conteneur weekPlannerContainer non trouvé');
        return;
    }
    
    // Afficher le loader
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div class="spinner"></div>
            <p style="margin-top: 16px; color: var(--color-text-secondary);">Chargement du planificateur...</p>
        </div>
    `;
    
    try {
        // Récupérer les joueuses
        const players = await getPlayersWithCycleData();
        
        // Générer la vue calendrier
        renderWeekPlanner(container, players);
        
        console.log('📅 Planificateur Semaine: Chargé avec', players.length, 'joueuses');
        
    } catch (error) {
        console.error('Erreur chargement planificateur:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--danger-color);">
                <p>❌ Erreur lors du chargement du planificateur</p>
                <button onclick="initWeekPlanner()" style="margin-top: 16px; padding: 8px 16px; cursor: pointer;">
                    🔄 Réessayer
                </button>
            </div>
        `;
    }
}

/**
 * Récupérer les joueuses avec leurs données de cycle
 */
async function getPlayersWithCycleData() {
    const playersSnapshot = await db.collection('players').get();
    const players = [];
    
    for (const doc of playersSnapshot.docs) {
        const playerData = doc.data();
        
        // Récupérer la config du cycle depuis menstrualCycle
        let cycleConfig = null;
        try {
            const configDoc = await db.collection('menstrualCycle').doc(doc.id).get();
            if (configDoc.exists) {
                cycleConfig = configDoc.data();
            }
        } catch (e) {
            console.warn('Erreur récupération config cycle pour', doc.id);
        }
        
        players.push({
            id: doc.id,
            name: playerData.name || doc.id,
            photo: playerData.photoURL || null,
            cycleConfig: cycleConfig
        });
    }
    
    // Trier par nom
    players.sort((a, b) => a.name.localeCompare(b.name));
    
    return players;
}

/**
 * Calculer la phase du cycle pour une date donnée
 */
function getPhaseForDate(cycleConfig, date) {
    if (!cycleConfig || (!cycleConfig.cycleStartDate && !cycleConfig.lastPeriodDate)) {
        return { phase: 'unknown', day: 0 };
    }
    
    // Utiliser cycleStartDate en priorité, fallback sur lastPeriodDate
    const periodDateField = cycleConfig.cycleStartDate || cycleConfig.lastPeriodDate;
    let lastJ1 = periodDateField.toDate 
        ? periodDateField.toDate() 
        : new Date(periodDateField);
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    lastJ1.setHours(0, 0, 0, 0);
    
    const cycleLength = cycleConfig.cycleLength || 28;
    
    // Calculer combien de cycles se sont écoulés depuis lastJ1
    if (lastJ1 <= targetDate) {
        const daysDiff = Math.floor((targetDate - lastJ1) / (1000 * 60 * 60 * 24));
        const cyclesElapsed = Math.floor(daysDiff / cycleLength);
        // Avancer lastJ1 au début du cycle actuel
        lastJ1 = new Date(periodDateField.toDate ? periodDateField.toDate() : periodDateField);
        lastJ1.setHours(0, 0, 0, 0);
        lastJ1.setDate(lastJ1.getDate() + (cyclesElapsed * cycleLength));
    }
    
    const daysSinceJ1 = Math.floor((targetDate - lastJ1) / (1000 * 60 * 60 * 24));
    let cycleDay = daysSinceJ1 + 1;
    if (cycleDay <= 0) cycleDay = 1;
    if (cycleDay > cycleLength) cycleDay = cycleLength;
    
    // Déterminer la phase
    let phase;
    if (cycleDay <= 5) {
        phase = 'menstrual';
    } else if (cycleDay <= 13) {
        phase = 'follicular';
    } else if (cycleDay <= 16) {
        phase = 'ovulatory';
    } else {
        phase = 'luteal';
    }
    
    return { phase, day: cycleDay };
}

/**
 * Générer les 7 prochains jours
 */
function getNextDays(count = 7) {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < count; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        
        days.push({
            date: date,
            dayName: dayNames[date.getDay()],
            dayNumber: date.getDate(),
            monthName: monthNames[date.getMonth()],
            isToday: i === 0,
            isWeekend: date.getDay() === 0 || date.getDay() === 6
        });
    }
    
    return days;
}

/**
 * Calculer les statistiques par jour
 */
function calculateDayStats(players, date) {
    const stats = {
        menstrual: 0,
        follicular: 0,
        ovulatory: 0,
        luteal: 0,
        unknown: 0,
        total: players.length
    };
    
    players.forEach(player => {
        const phaseInfo = getPhaseForDate(player.cycleConfig, date);
        stats[phaseInfo.phase]++;
    });
    
    return stats;
}

/**
 * Générer la recommandation d'entraînement pour un jour
 */
function getDayRecommendation(stats) {
    const total = stats.total - stats.unknown;
    if (total === 0) return { text: 'Données insuffisantes', color: '#9e9e9e' };
    
    // Calculer le pourcentage de joueuses en phase haute intensité
    const highIntensity = stats.follicular + stats.ovulatory;
    const lowIntensity = stats.menstrual + stats.luteal;
    
    const highPercent = (highIntensity / total) * 100;
    
    if (highPercent >= 60) {
        return { 
            text: '💪 Séance Intensive OK', 
            color: '#4caf50',
            detail: `${highIntensity}/${total} joueuses en phase optimale`
        };
    } else if (highPercent >= 40) {
        return { 
            text: '⚖️ Séance Mixte', 
            color: '#ff9800',
            detail: 'Prévoir des adaptations individuelles'
        };
    } else {
        return { 
            text: '🧘 Privilégier Récupération', 
            color: '#e91e63',
            detail: `${lowIntensity}/${total} joueuses en phase de récupération`
        };
    }
}

/**
 * Rendre le planificateur semaine
 */
function renderWeekPlanner(container, players) {
    const days = getNextDays(7);
    
    // Calculer les stats pour chaque jour
    const dayStats = days.map(day => ({
        ...day,
        stats: calculateDayStats(players, day.date),
        recommendation: getDayRecommendation(calculateDayStats(players, day.date))
    }));
    
    // Générer le HTML
    let html = `
        <div class="week-planner">
            <!-- En-tête avec légende -->
            <div class="week-planner-header">
                <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
                    📅 Planificateur Semaine - Vue Équipe
                </h3>
                <div class="phase-legend">
                    ${Object.entries(WEEK_PLANNER_CONFIG.phases).map(([key, phase]) => `
                        <span class="legend-item" style="background: ${phase.bgColor}; border: 1px solid ${phase.color};">
                            ${phase.icon} ${phase.shortName}
                        </span>
                    `).join('')}
                </div>
            </div>
            
            <!-- Recommandations par jour -->
            <div class="day-recommendations" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 20px;">
                ${dayStats.map(day => `
                    <div class="day-recommendation" style="
                        padding: 12px 8px;
                        background: ${day.isToday ? 'var(--color-primary-light)' : 'var(--color-surface)'};
                        border: 2px solid ${day.isToday ? 'var(--color-primary)' : 'var(--color-border)'};
                        border-radius: 8px;
                        text-align: center;
                    ">
                        <div style="font-weight: 600; font-size: 12px; color: ${day.isToday ? 'var(--color-primary)' : 'var(--color-text)'};">
                            ${day.dayName} ${day.dayNumber}
                        </div>
                        <div style="font-size: 10px; color: var(--color-text-secondary); margin-top: 2px;">
                            ${day.monthName}
                        </div>
                        <div style="margin-top: 8px; font-size: 11px; color: ${day.recommendation.color}; font-weight: 500;">
                            ${day.recommendation.text}
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <!-- Tableau des joueuses -->
            <div class="week-planner-table-container" style="overflow-x: auto;">
                <table class="week-planner-table" style="width: 100%; border-collapse: collapse; min-width: 800px;">
                    <thead>
                        <tr style="background: var(--color-surface-elevated);">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid var(--color-border); min-width: 150px;">
                                Joueuse
                            </th>
                            ${days.map(day => `
                                <th style="
                                    padding: 12px 8px;
                                    text-align: center;
                                    border-bottom: 2px solid var(--color-border);
                                    ${day.isToday ? 'background: var(--color-primary-light);' : ''}
                                    ${day.isWeekend ? 'background: rgba(0,0,0,0.03);' : ''}
                                ">
                                    <div style="font-weight: 600;">${day.dayName}</div>
                                    <div style="font-size: 12px; color: var(--color-text-secondary);">${day.dayNumber} ${day.monthName}</div>
                                </th>
                            `).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${players.map(player => renderPlayerRow(player, days)).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Statistiques globales -->
            <div class="week-stats" style="margin-top: 20px; padding: 16px; background: var(--color-surface); border-radius: 8px;">
                <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">📊 Statistiques de la Semaine</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
                    ${renderWeekStats(players, days)}
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Rendre une ligne de joueuse
 */
function renderPlayerRow(player, days) {
    return `
        <tr style="border-bottom: 1px solid var(--color-border);">
            <td style="padding: 10px 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        background: ${player.photo ? `url(${player.photo}) center/cover` : 'var(--color-primary)'};
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-weight: 600;
                        font-size: 12px;
                    ">
                        ${!player.photo ? player.name.charAt(0).toUpperCase() : ''}
                    </div>
                    <span style="font-weight: 500;">${player.name}</span>
                </div>
            </td>
            ${days.map(day => {
                const phaseInfo = getPhaseForDate(player.cycleConfig, day.date);
                const phaseConfig = WEEK_PLANNER_CONFIG.phases[phaseInfo.phase];
                
                return `
                    <td style="
                        padding: 8px;
                        text-align: center;
                        background: ${phaseConfig.bgColor};
                        ${day.isToday ? 'border: 2px solid var(--color-primary);' : ''}
                    ">
                        <div style="font-size: 16px;">${phaseConfig.icon}</div>
                        <div style="font-size: 10px; color: ${phaseConfig.color}; font-weight: 500;">
                            J${phaseInfo.day}
                        </div>
                    </td>
                `;
            }).join('')}
        </tr>
    `;
}

/**
 * Rendre les statistiques de la semaine
 */
function renderWeekStats(players, days) {
    // Compter les jours optimaux pour chaque joueuse
    const playerOptimalDays = players.map(player => {
        let optimalDays = 0;
        days.forEach(day => {
            const phaseInfo = getPhaseForDate(player.cycleConfig, day.date);
            if (phaseInfo.phase === 'follicular' || phaseInfo.phase === 'ovulatory') {
                optimalDays++;
            }
        });
        return { name: player.name, optimalDays };
    });
    
    // Trouver le meilleur jour pour une séance intensive
    const bestDay = days.reduce((best, day) => {
        const stats = calculateDayStats(players, day.date);
        const score = stats.follicular + stats.ovulatory;
        if (score > best.score) {
            return { day, score };
        }
        return best;
    }, { day: null, score: -1 });
    
    // Compter les joueuses non configurées
    const unconfigured = players.filter(p => !p.cycleConfig || !p.cycleConfig.lastPeriodDate).length;
    
    return `
        <div style="padding: 12px; background: rgba(76, 175, 80, 0.1); border-radius: 8px;">
            <div style="font-weight: 600; color: #4caf50;">🎯 Meilleur jour intensif</div>
            <div style="font-size: 14px; margin-top: 4px;">
                ${bestDay.day ? `${bestDay.day.dayName} ${bestDay.day.dayNumber} ${bestDay.day.monthName}` : 'N/A'}
            </div>
            <div style="font-size: 12px; color: var(--color-text-secondary);">
                ${bestDay.score} joueuses en phase optimale
            </div>
        </div>
        
        <div style="padding: 12px; background: rgba(255, 152, 0, 0.1); border-radius: 8px;">
            <div style="font-weight: 600; color: #ff9800;">📈 Moyenne jours optimaux</div>
            <div style="font-size: 14px; margin-top: 4px;">
                ${(playerOptimalDays.reduce((sum, p) => sum + p.optimalDays, 0) / players.length).toFixed(1)} jours/joueuse
            </div>
            <div style="font-size: 12px; color: var(--color-text-secondary);">
                sur les 7 prochains jours
            </div>
        </div>
        
        <div style="padding: 12px; background: ${unconfigured > 0 ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)'}; border-radius: 8px;">
            <div style="font-weight: 600; color: ${unconfigured > 0 ? '#f44336' : '#4caf50'};">
                ${unconfigured > 0 ? '⚠️' : '✅'} Configuration cycle
            </div>
            <div style="font-size: 14px; margin-top: 4px;">
                ${players.length - unconfigured}/${players.length} joueuses
            </div>
            <div style="font-size: 12px; color: var(--color-text-secondary);">
                ${unconfigured > 0 ? `${unconfigured} non configurée(s)` : 'Toutes configurées'}
            </div>
        </div>
    `;
}

// ============================================
// STYLES CSS
// ============================================

const weekPlannerStyles = `
<style>
.week-planner {
    padding: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.week-planner-header {
    margin-bottom: 20px;
}

.phase-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.legend-item {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
}

.week-planner-table tbody tr:hover {
    background: rgba(0,0,0,0.02);
}

@media (max-width: 768px) {
    .day-recommendations {
        grid-template-columns: repeat(4, 1fr) !important;
    }
    
    .week-planner-table {
        font-size: 12px;
    }
}
</style>
`;

// Injecter les styles au chargement
document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('week-planner-styles')) {
        const styleElement = document.createElement('div');
        styleElement.id = 'week-planner-styles';
        styleElement.innerHTML = weekPlannerStyles;
        document.head.appendChild(styleElement.firstElementChild);
    }
});

// Exposer les fonctions globalement
window.initWeekPlanner = initWeekPlanner;

console.log('📅 Module Planificateur Semaine chargé');

