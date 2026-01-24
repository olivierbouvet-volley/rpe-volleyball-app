/**
 * Coach Dashboard Charts - Graphiques pour le Dashboard Coach
 * - Charge d'entraînement hebdomadaire (toutes les joueuses)
 * - Charge d'entraînement mensuelle (depuis octobre)
 * - Cumul annuel par joueuse
 * - Bouton mise à jour manuelle
 */

// Instances des graphiques
let coachWeeklyChartInstance = null;
let coachMonthlyChartInstance = null;
let coachAnnualChartInstance = null;

// Couleurs par type de session (tous les types)
const SESSION_COLORS_COACH = {
    'Entraînement': '#667eea',      // Bleu
    'Entrainement': '#667eea',      // Bleu (sans accent)
    'Entrainement Technique': '#667eea', // Bleu (ancien type)
    'Match': '#ef4444',             // Rouge
    'Préparation Physique': '#10b981', // Vert
    'Preparation Physique': '#10b981', // Vert (sans accent)
    'Récupération Active': '#8b5cf6',  // Violet
    'Recuperation Active': '#8b5cf6',  // Violet (sans accent)
    'Activité Annexe': '#f59e0b',   // Orange
    'Activite Annexe': '#f59e0b',   // Orange (sans accent)
    'Autre': '#6b7280'              // Gris
};

// Types de sessions principaux pour les graphiques (dans l'ordre d'affichage)
const SESSION_TYPES_ORDER = [
    'Entraînement',
    'Match', 
    'Préparation Physique',
    'Récupération Active',
    'Activité Annexe'
];

// Couleurs pour les joueuses (dégradé)
const PLAYER_COLORS = [
    '#667eea', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6',
    '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
    '#14b8a6', '#a855f7', '#f43f5e', '#22c55e'
];

/**
 * Normalise un type de session vers les types principaux
 */
function normalizeSessionType(sessionType) {
    if (!sessionType) return 'Entraînement';
    
    const type = sessionType.toLowerCase();
    
    // IMPORTANT: Vérifier "annexe" AVANT "physique" pour éviter que "Activite Physique Annexe" soit classé en Prépa Physique
    if (type.includes('annexe')) return 'Activité Annexe';
    if (type.includes('match')) return 'Match';
    if (type.includes('préparation') || type.includes('preparation') || type.includes('physique')) return 'Préparation Physique';
    if (type.includes('récupération') || type.includes('recuperation')) return 'Récupération Active';
    if (type.includes('activité') || type.includes('activite')) return 'Activité Annexe';
    
    return 'Entraînement';
}

/**
 * Initialise tous les graphiques coach
 */
async function initCoachCharts() {
    console.log('Coach Charts: Initialisation...');
    
    try {
        await Promise.all([
            loadCoachWeeklyChart(),
            loadCoachMonthlyChart(),
            loadCoachAnnualChart()
        ]);
        console.log('Coach Charts: Tous les graphiques chargés');
    } catch (error) {
        console.error('Coach Charts: Erreur initialisation:', error);
    }
}

/**
 * Calcule le numéro de semaine ISO
 */
function getWeekNumberCoach(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getWeekKeyCoach(date) {
    const year = date.getFullYear();
    const week = getWeekNumberCoach(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Graphique hebdomadaire Coach - Volume individuel par joueuse avec barres empilées par type
 */
async function loadCoachWeeklyChart(selectedWeek = null) {
    const canvas = document.getElementById('coachWeeklyChart');
    if (!canvas) {
        console.log('Coach Charts: Canvas coachWeeklyChart non trouvé');
        return;
    }
    
    // Détruire l'ancien graphique (double sécurité)
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    if (coachWeeklyChartInstance) {
        coachWeeklyChartInstance.destroy();
    }
    coachWeeklyChartInstance = null;
    
    try {
        // Générer les 6 dernières semaines
        const today = new Date();
        const weeksOptions = [];
        
        for (let i = 0; i < 6; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - (i * 7));
            const weekNum = getWeekNumberCoach(d);
            const year = d.getFullYear();
            const weekKey = `${year}-W${weekNum.toString().padStart(2, '0')}`;
            
            // Calculer le lundi de cette semaine
            const monday = new Date(d);
            const dayOfWeek = monday.getDay();
            const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            monday.setDate(diff);
            
            const sunday = new Date(monday);
            sunday.setDate(sunday.getDate() + 6);
            
            weeksOptions.push({
                key: weekKey,
                weekNum: weekNum,
                label: `Semaine ${weekNum}`,
                startDate: monday.toISOString().split('T')[0],
                endDate: sunday.toISOString().split('T')[0],
                dateRange: `${monday.toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})} - ${sunday.toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})}`
            });
        }
        
        // Créer ou mettre à jour le sélecteur
        let selector = document.getElementById('weekSelector');
        if (!selector) {
            const container = canvas.parentElement.parentElement;
            const titleEl = container.querySelector('h3');
            
            const selectorDiv = document.createElement('div');
            selectorDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 15px;';
            selectorDiv.innerHTML = `
                <label for="weekSelector" style="font-weight: 500; color: #374151;">Sélectionner :</label>
                <select id="weekSelector" style="
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    background: white;
                    cursor: pointer;
                    min-width: 200px;
                ">
                </select>
            `;
            titleEl.insertAdjacentElement('afterend', selectorDiv);
            selector = document.getElementById('weekSelector');
            
            selector.addEventListener('change', (e) => {
                const weekData = weeksOptions.find(w => w.key === e.target.value);
                if (weekData) {
                    loadCoachWeeklyChart(weekData);
                }
            });
        }
        
        // Remplir le sélecteur
        selector.innerHTML = weeksOptions.map((w, i) => 
            `<option value="${w.key}" ${i === 0 ? 'selected' : ''}>${w.label} (${w.dateRange})</option>`
        ).join('');
        
        // Utiliser la semaine sélectionnée ou la première
        const weekData = selectedWeek || weeksOptions[0];
        selector.value = weekData.key;
        
        // Récupérer les joueuses
        const playersSnapshot = await db.collection('players').get();
        const players = {};
        playersSnapshot.forEach(doc => {
            const data = doc.data();
            players[doc.id] = data.name ? data.name.split(' ')[0] : doc.id;
        });
        
        // Récupérer les RPE de la semaine sélectionnée
        const rpeSnapshot = await db.collection('rpe')
            .where('date', '>=', weekData.startDate)
            .where('date', '<=', weekData.endDate)
            .get();
        
        // Calculer les heures par joueuse ET par type (tous les types)
        const hoursByPlayerAndType = {};
        Object.keys(players).forEach(id => {
            hoursByPlayerAndType[id] = {};
            SESSION_TYPES_ORDER.forEach(type => {
                hoursByPlayerAndType[id][type] = 0;
            });
        });
        
        rpeSnapshot.forEach(doc => {
            const data = doc.data();
            if (hoursByPlayerAndType.hasOwnProperty(data.playerId)) {
                const sessionType = normalizeSessionType(data.sessionType);
                const hours = (data.duration || 0) / 60;
                hoursByPlayerAndType[data.playerId][sessionType] += hours;
            }
        });
        
        // Trier par nom
        const sortedPlayers = Object.keys(players)
            .map(id => {
                const playerData = { id, name: players[id], total: 0 };
                SESSION_TYPES_ORDER.forEach(type => {
                    playerData[type] = Math.round(hoursByPlayerAndType[id][type] * 10) / 10;
                    playerData.total += hoursByPlayerAndType[id][type];
                });
                playerData.total = Math.round(playerData.total * 10) / 10;
                return playerData;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
        
        // Calculer la moyenne
        const totalHours = sortedPlayers.reduce((sum, p) => sum + p.total, 0);
        const avgHours = sortedPlayers.length > 0 
            ? Math.round((totalHours / sortedPlayers.length) * 10) / 10 
            : 0;
        
        const labels = sortedPlayers.map(p => p.name);
        
        // Créer les datasets pour chaque type de session
        const datasets = SESSION_TYPES_ORDER.map(type => ({
            label: type,
            data: sortedPlayers.map(p => p[type]),
            backgroundColor: SESSION_COLORS_COACH[type],
            borderRadius: 4,
            stack: 'stack1'
        }));
        
        // Ajouter la ligne moyenne
        datasets.push({
            label: `Moyenne équipe (${avgHours}h)`,
            data: labels.map(() => avgHours),
            type: 'line',
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 3,
            borderDash: [5, 5],
            pointRadius: 0,
            order: 0
        });
        
        const ctx = canvas.getContext('2d');
        coachWeeklyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Volume - ${weekData.label} (${weekData.dateRange})`,
                        font: { size: 14, weight: 'bold' }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12, padding: 10 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}h`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        title: { display: true, text: 'Heures' },
                        ticks: { callback: (v) => v + 'h' }
                    },
                    x: { 
                        stacked: true,
                        grid: { display: false } 
                    }
                }
            }
        });
        
        console.log('Coach Charts: Graphique hebdomadaire créé -', weekData.label);
    } catch (error) {
        console.error('Coach Charts: Erreur graphique hebdomadaire:', error);
    }
}

/**
 * Graphique mensuel Coach - Volume individuel par joueuse avec barres empilées par type
 */
async function loadCoachMonthlyChart(selectedMonth = null) {
    const canvas = document.getElementById('coachMonthlyChart');
    if (!canvas) {
        console.log('Coach Charts: Canvas coachMonthlyChart non trouvé');
        return;
    }
    
    // Détruire l'ancien graphique (double sécurité)
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    if (coachMonthlyChartInstance) {
        coachMonthlyChartInstance.destroy();
    }
    coachMonthlyChartInstance = null;
    
    try {
        // Générer les mois depuis octobre (ou les 6 derniers mois)
        const today = new Date();
        const monthsOptions = [];
        const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                           'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        
        // Commencer par le mois actuel et remonter
        for (let i = 0; i < 6; i++) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const year = d.getFullYear();
            const month = d.getMonth();
            
            // Dernier jour du mois
            const lastDay = new Date(year, month + 1, 0);
            
            monthsOptions.push({
                key: `${year}-${(month + 1).toString().padStart(2, '0')}`,
                label: `${monthNames[month]} ${year}`,
                shortLabel: monthNames[month],
                startDate: `${year}-${(month + 1).toString().padStart(2, '0')}-01`,
                endDate: lastDay.toISOString().split('T')[0]
            });
        }
        
        // Créer ou mettre à jour le sélecteur
        let selector = document.getElementById('monthSelector');
        if (!selector) {
            const container = canvas.parentElement.parentElement;
            const titleEl = container.querySelector('h3');
            
            const selectorDiv = document.createElement('div');
            selectorDiv.style.cssText = 'display: flex; align-items: center; gap: 10px; margin-bottom: 15px;';
            selectorDiv.innerHTML = `
                <label for="monthSelector" style="font-weight: 500; color: #374151;">Sélectionner :</label>
                <select id="monthSelector" style="
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    background: white;
                    cursor: pointer;
                    min-width: 200px;
                ">
                </select>
            `;
            titleEl.insertAdjacentElement('afterend', selectorDiv);
            selector = document.getElementById('monthSelector');
            
            selector.addEventListener('change', (e) => {
                const monthData = monthsOptions.find(m => m.key === e.target.value);
                if (monthData) {
                    loadCoachMonthlyChart(monthData);
                }
            });
        }
        
        // Remplir le sélecteur
        selector.innerHTML = monthsOptions.map((m, i) => 
            `<option value="${m.key}" ${i === 0 ? 'selected' : ''}>${m.label}</option>`
        ).join('');
        
        // Utiliser le mois sélectionné ou le premier (mois actuel)
        const monthData = selectedMonth || monthsOptions[0];
        selector.value = monthData.key;
        
        // Récupérer les joueuses
        const playersSnapshot = await db.collection('players').get();
        const players = {};
        playersSnapshot.forEach(doc => {
            const data = doc.data();
            players[doc.id] = data.name ? data.name.split(' ')[0] : doc.id;
        });
        
        // Récupérer les RPE du mois sélectionné
        const rpeSnapshot = await db.collection('rpe')
            .where('date', '>=', monthData.startDate)
            .where('date', '<=', monthData.endDate)
            .get();
        
        // Calculer les heures par joueuse ET par type (tous les types)
        const hoursByPlayerAndType = {};
        Object.keys(players).forEach(id => {
            hoursByPlayerAndType[id] = {};
            SESSION_TYPES_ORDER.forEach(type => {
                hoursByPlayerAndType[id][type] = 0;
            });
        });
        
        rpeSnapshot.forEach(doc => {
            const data = doc.data();
            if (hoursByPlayerAndType.hasOwnProperty(data.playerId)) {
                const sessionType = normalizeSessionType(data.sessionType);
                const hours = (data.duration || 0) / 60;
                hoursByPlayerAndType[data.playerId][sessionType] += hours;
            }
        });
        
        // Trier par nom
        const sortedPlayers = Object.keys(players)
            .map(id => {
                const playerData = { id, name: players[id], total: 0 };
                SESSION_TYPES_ORDER.forEach(type => {
                    playerData[type] = Math.round(hoursByPlayerAndType[id][type] * 10) / 10;
                    playerData.total += hoursByPlayerAndType[id][type];
                });
                playerData.total = Math.round(playerData.total * 10) / 10;
                return playerData;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
        
        // Calculer la moyenne mensuelle
        const totalHours = sortedPlayers.reduce((sum, p) => sum + p.total, 0);
        const avgMonthlyHours = sortedPlayers.length > 0 
            ? Math.round((totalHours / sortedPlayers.length) * 10) / 10 
            : 0;
        
        const labels = sortedPlayers.map(p => p.name);
        
        // Créer les datasets pour chaque type de session
        const datasets = SESSION_TYPES_ORDER.map(type => ({
            label: type,
            data: sortedPlayers.map(p => p[type]),
            backgroundColor: SESSION_COLORS_COACH[type],
            borderRadius: 4,
            stack: 'stack1'
        }));
        
        // Ajouter la ligne moyenne
        datasets.push({
            label: `Moyenne équipe (${avgMonthlyHours}h)`,
            data: labels.map(() => avgMonthlyHours),
            type: 'line',
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 3,
            borderDash: [5, 5],
            pointRadius: 0,
            order: 0
        });
        
        const ctx = canvas.getContext('2d');
        coachMonthlyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Volume - ${monthData.label}`,
                        font: { size: 14, weight: 'bold' }
                    },
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12, padding: 10 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}h`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        stacked: true,
                        title: { display: true, text: 'Heures' },
                        ticks: { callback: (v) => v + 'h' }
                    },
                    x: { 
                        stacked: true,
                        grid: { display: false } 
                    }
                }
            }
        });
        
        console.log('Coach Charts: Graphique mensuel créé -', monthData.label);
    } catch (error) {
        console.error('Coach Charts: Erreur graphique mensuel:', error);
    }
}

/**
 * Graphique cumul annuel Coach - Par joueuse avec barres empilées par type
 */
async function loadCoachAnnualChart() {
    const canvas = document.getElementById('coachAnnualChart');
    if (!canvas) {
        console.log('Coach Charts: Canvas coachAnnualChart non trouvé');
        return;
    }
    
    // Détruire l'ancien graphique (double sécurité)
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
        existingChart.destroy();
    }
    if (coachAnnualChartInstance) {
        coachAnnualChartInstance.destroy();
    }
    coachAnnualChartInstance = null;
    
    try {
        // Calculer la saison sportive : 15 août année précédente → 30 juin année en cours
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0 = janvier, 7 = août
        
        // Si on est entre janvier et juillet, la saison a commencé l'année précédente
        // Si on est entre août et décembre, la saison a commencé cette année
        const seasonStartYear = currentMonth >= 7 ? currentYear : currentYear - 1;
        const seasonStart = `${seasonStartYear}-08-15`;
        const seasonEnd = `${seasonStartYear + 1}-06-30`;
        
        // Récupérer les joueuses
        const playersSnapshot = await db.collection('players').get();
        const players = {};
        playersSnapshot.forEach(doc => {
            players[doc.id] = doc.data().name || doc.id;
        });
        
        // Récupérer tous les RPE de la saison sportive (15 août → 30 juin)
        const rpeSnapshot = await db.collection('rpe')
            .where('date', '>=', seasonStart)
            .where('date', '<=', seasonEnd)
            .get();
        
        // Calculer les heures par joueuse ET par type (tous les types)
        const hoursByPlayerAndType = {};
        Object.keys(players).forEach(id => {
            hoursByPlayerAndType[id] = {};
            SESSION_TYPES_ORDER.forEach(type => {
                hoursByPlayerAndType[id][type] = 0;
            });
        });
        
        rpeSnapshot.forEach(doc => {
            const data = doc.data();
            if (hoursByPlayerAndType.hasOwnProperty(data.playerId)) {
                const sessionType = normalizeSessionType(data.sessionType);
                const hours = (data.duration || 0) / 60;
                hoursByPlayerAndType[data.playerId][sessionType] += hours;
            }
        });
        
        // Trier par heures totales décroissantes
        const sortedPlayers = Object.keys(players)
            .map(id => {
                const playerData = { id, name: players[id], total: 0 };
                SESSION_TYPES_ORDER.forEach(type => {
                    playerData[type] = Math.round(hoursByPlayerAndType[id][type] * 10) / 10;
                    playerData.total += hoursByPlayerAndType[id][type];
                });
                playerData.total = Math.round(playerData.total * 10) / 10;
                return playerData;
            })
            .sort((a, b) => b.total - a.total);
        
        const labels = sortedPlayers.map(p => p.name.split(' ')[0]); // Prénom seulement
        
        // Créer les datasets pour chaque type de session
        const datasets = SESSION_TYPES_ORDER.map(type => ({
            label: type,
            data: sortedPlayers.map(p => p[type]),
            backgroundColor: SESSION_COLORS_COACH[type],
            borderRadius: 4,
            stack: 'stack1'
        }));
        
        const ctx = canvas.getContext('2d');
        coachAnnualChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y', // Barres horizontales
                plugins: {
                    title: {
                        display: true,
                        text: `Cumul annuel ${currentYear} par joueuse (objectif 720h)`,
                        font: { size: 14, weight: 'bold' }
                    },
                    legend: { 
                        position: 'bottom',
                        labels: { boxWidth: 12, padding: 10 }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                return `${ctx.dataset.label}: ${ctx.raw}h`;
                            },
                            afterBody: (ctx) => {
                                const idx = ctx[0].dataIndex;
                                const total = sortedPlayers[idx].total;
                                const pct = Math.round(total / 720 * 100);
                                return `Total: ${total}h (${pct}% de l'objectif)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        stacked: true,
                        max: 720,
                        title: { display: true, text: 'Heures' },
                        ticks: { callback: (v) => v + 'h' }
                    },
                    y: { 
                        stacked: true,
                        grid: { display: false } 
                    }
                }
            }
        });
        
        console.log('Coach Charts: Graphique cumul annuel créé');
    } catch (error) {
        console.error('Coach Charts: Erreur graphique cumul annuel:', error);
    }
}

/**
 * Calcule la tendance sur 4 semaines pour une joueuse (pour popup)
 */
async function getPlayerTrend4Weeks(playerId) {
    try {
        const today = new Date();
        const fourWeeksAgo = new Date(today);
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        const startDate = fourWeeksAgo.toISOString().split('T')[0];
        
        const checkinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .where('date', '>=', startDate)
            .get();
        
        if (checkinsSnapshot.empty) {
            return { trend: 'stable', scores: [], avg: 0 };
        }
        
        const scores = [];
        checkinsSnapshot.forEach(doc => {
            const c = doc.data();
            const sleep = c.sleepQuality || c.sleep || 5;
            const soreness = c.soreness || 5;
            const stress = c.stress || 5;
            const mood = c.mood || 5;
            const score = Math.round((sleep + (11 - soreness) + (11 - stress) + mood) / 4 * 10);
            scores.push({ date: c.date, score });
        });
        
        scores.sort((a, b) => a.date.localeCompare(b.date));
        
        const avg = scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
        
        // Calculer tendance (première moitié vs deuxième moitié)
        const mid = Math.floor(scores.length / 2);
        if (mid > 0) {
            const firstHalfAvg = scores.slice(0, mid).reduce((sum, s) => sum + s.score, 0) / mid;
            const secondHalfAvg = scores.slice(mid).reduce((sum, s) => sum + s.score, 0) / (scores.length - mid);
            const diff = secondHalfAvg - firstHalfAvg;
            
            if (diff > 5) return { trend: 'up', scores, avg: Math.round(avg) };
            if (diff < -5) return { trend: 'down', scores, avg: Math.round(avg) };
        }
        
        return { trend: 'stable', scores, avg: Math.round(avg) };
    } catch (error) {
        console.error('Erreur calcul tendance:', error);
        return { trend: 'stable', scores: [], avg: 0 };
    }
}

/**
 * Rafraîchit tous les graphiques coach
 */
async function refreshCoachCharts() {
    console.log('Coach Charts: Rafraîchissement manuel...');
    
    // Afficher indicateur de chargement
    const btn = document.getElementById('refreshChartsBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Mise à jour...';
    }
    
    try {
        await initCoachCharts();
        
        // Rafraîchir aussi le dashboard
        if (typeof loadCoachDashboard === 'function') {
            await loadCoachDashboard();
        }
        
        if (btn) {
            btn.innerHTML = '✅ Mis à jour !';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = '🔄 Mettre à jour';
            }, 2000);
        }
    } catch (error) {
        console.error('Erreur rafraîchissement:', error);
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '❌ Erreur - Réessayer';
        }
    }
}

// Ajouter le bouton de mise à jour au chargement
document.addEventListener('DOMContentLoaded', function() {
    // Chercher un endroit pour le bouton
    setTimeout(() => {
        const coachHeader = document.querySelector('#coachScreen .card-title');
        if (coachHeader && !document.getElementById('refreshChartsBtn')) {
            const btn = document.createElement('button');
            btn.id = 'refreshChartsBtn';
            btn.innerHTML = '🔄 Mettre à jour';
            btn.style.cssText = `
                background: #667eea;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                margin-left: 16px;
                transition: all 0.2s;
            `;
            btn.onclick = refreshCoachCharts;
            btn.onmouseover = () => btn.style.background = '#5a67d8';
            btn.onmouseout = () => btn.style.background = '#667eea';
            
            coachHeader.parentElement.style.display = 'flex';
            coachHeader.parentElement.style.justifyContent = 'space-between';
            coachHeader.parentElement.style.alignItems = 'center';
            coachHeader.parentElement.appendChild(btn);
        }
    }, 500);
});

// Exports globaux
window.initCoachCharts = initCoachCharts;
window.loadCoachWeeklyChart = loadCoachWeeklyChart;
window.loadCoachMonthlyChart = loadCoachMonthlyChart;
window.loadCoachAnnualChart = loadCoachAnnualChart;
window.getPlayerTrend4Weeks = getPlayerTrend4Weeks;
window.refreshCoachCharts = refreshCoachCharts;

console.log('Module Coach Dashboard Charts chargé');
