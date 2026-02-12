/**
 * Player Dashboard Charts - Graphiques pour le Dashboard Joueuse
 * - Tendance Forme (15 derniers jours)
 * - Charge d'Entraînement Hebdomadaire (8 semaines + moyenne équipe)
 * - Charge d'Entraînement Mensuelle (depuis octobre + max + moyenne équipe)
 * - Objectif Annuel (barre de progression)
 */

// Instances des graphiques (pour éviter les doublons)
let formTrendChartInstance = null;
let weeklyChartInstance = null;
let monthlyChartInstance = null;
let cycleChartInstance = null;
let isInitializing = false;

/**
 * Initialise les graphiques du Dashboard joueuse
 */
async function initPlayerDashboardCharts() {
    if (!window.currentPlayer) {
        console.log('Dashboard Charts: Pas de joueuse connectée');
        return;
    }
    
    // Éviter les doubles initialisations
    if (isInitializing) {
        console.log('Dashboard Charts: Initialisation déjà en cours, ignoré');
        return;
    }
    
    isInitializing = true;
    console.log('Dashboard Charts: Initialisation pour', window.currentPlayer.name);
    
    try {
        // Détruire tous les graphiques existants d'abord
        if (formTrendChartInstance) {
            formTrendChartInstance.destroy();
            formTrendChartInstance = null;
        }
        if (weeklyChartInstance) {
            weeklyChartInstance.destroy();
            weeklyChartInstance = null;
        }
        if (monthlyChartInstance) {
            monthlyChartInstance.destroy();
            monthlyChartInstance = null;
        }
        if (cycleChartInstance) {
            cycleChartInstance.destroy();
            cycleChartInstance = null;
        }
        
        await Promise.all([
            loadFormTrendChart(),
            loadWeeklyTrainingChart(),
            loadMonthlyTrainingChart(),
            loadCycleChart(),
            updateAnnualProgress()
        ]);
        console.log('Dashboard Charts: Tous les graphiques chargés');
    } catch (error) {
        console.error('Dashboard Charts: Erreur initialisation:', error);
    } finally {
        isInitializing = false;
    }
}

/**
 * Charge le graphique de tendance forme (15 derniers jours)
 */
async function loadFormTrendChart() {
    const canvas = document.getElementById('formTrendChart');
    if (!canvas) {
        console.log('Dashboard Charts: Canvas formTrendChart non trouvé');
        return;
    }
    
    // Détruire l'ancien graphique s'il existe
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();
    if (formTrendChartInstance) {
        formTrendChartInstance.destroy();
        formTrendChartInstance = null;
    }
    
    try {
        const today = new Date();
        const fifteenDaysAgo = new Date(today);
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 14);
        const startDate = fifteenDaysAgo.toISOString().split('T')[0];
        
        const checkinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', window.currentPlayer.id)
            .where('date', '>=', startDate)
            .get();
        
        const checkinsMap = {};
        checkinsSnapshot.forEach(doc => {
            const data = doc.data();
            checkinsMap[data.date] = data;
        });
        
        const labels = [];
        const scores = [];
        
        for (let i = 14; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayLabel = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
            
            labels.push(dayLabel);
            
            if (checkinsMap[dateStr]) {
                const c = checkinsMap[dateStr];
                const sleep = c.sleepQuality || c.sleep || 5;
                const soreness = c.soreness || 5;
                const stress = c.stress || 5;
                const mood = c.mood || 5;
                const score = Math.round((sleep + (11 - soreness) + (11 - stress) + mood) / 4 * 10);
                scores.push(score);
            } else {
                scores.push(null);
            }
        }
        
        const ctx = canvas.getContext('2d');
        formTrendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Score Forme',
                    data: scores,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#667eea',
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ctx.raw === null ? 'Pas de check-in' : `Forme: ${ctx.raw}%`
                        }
                    }
                },
                scales: {
                    y: {
                        min: 0,
                        max: 100,
                        ticks: { callback: (v) => v + '%' },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
        
        console.log('Dashboard Charts: Graphique tendance forme créé');
    } catch (error) {
        console.error('Dashboard Charts: Erreur tendance forme:', error);
    }
}

/**
 * Calcule le numéro de semaine ISO
 */
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Génère une clé semaine (ex: "2025-W47")
 */
function getWeekKey(date) {
    const year = date.getFullYear();
    const week = getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
}

// Couleurs par type de session (tous les types)
const SESSION_COLORS = {
    'Entraînement': '#667eea',      // Bleu
    'Entrainement': '#667eea',      // Bleu (sans accent)
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
const SESSION_TYPES_ORDER_PLAYER = [
    'Entraînement',
    'Match', 
    'Préparation Physique',
    'Récupération Active',
    'Activité Annexe'
];

/**
 * Normalise un type de session vers les types principaux
 */
function normalizeSessionTypePlayer(sessionType) {
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
 * Charge le graphique hebdomadaire (8 dernières semaines avec couleurs par type + moyenne équipe)
 */
async function loadWeeklyTrainingChart() {
    const canvas = document.getElementById('weeklyTrainingChart');
    if (!canvas) {
        console.log('Dashboard Charts: Canvas weeklyTrainingChart non trouvé');
        return;
    }
    
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();
    if (weeklyChartInstance) {
        weeklyChartInstance.destroy();
        weeklyChartInstance = null;
    }
    
    try {
        // Calculer les 8 dernières semaines
        const today = new Date();
        const weeks = [];
        for (let i = 7; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - (i * 7));
            weeks.push(getWeekKey(d));
        }
        
        // Date de début (8 semaines en arrière)
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 56);
        const startDateStr = startDate.toISOString().split('T')[0];
        
        // Récupérer les RPE de la joueuse
        const playerRpeSnapshot = await db.collection('rpe')
            .where('playerId', '==', window.currentPlayer.id)
            .where('date', '>=', startDateStr)
            .get();
        
        // Récupérer tous les RPE de l'équipe (pour moyenne)
        const allRpeSnapshot = await db.collection('rpe')
            .where('date', '>=', startDateStr)
            .get();
        
        // Récupérer la liste des joueuses
        const playersSnapshot = await db.collection('players').get();
        const playerIds = new Set();
        playersSnapshot.forEach(doc => playerIds.add(doc.id));
        
        // Organiser les données par semaine ET par type de session (pour la joueuse)
        const playerDataByWeekAndType = {};
        weeks.forEach(w => {
            playerDataByWeekAndType[w] = {};
            SESSION_TYPES_ORDER_PLAYER.forEach(type => {
                playerDataByWeekAndType[w][type] = 0;
            });
        });
        
        playerRpeSnapshot.forEach(doc => {
            const data = doc.data();
            const weekKey = getWeekKey(new Date(data.date));
            const sessionType = normalizeSessionTypePlayer(data.sessionType);
            
            if (playerDataByWeekAndType.hasOwnProperty(weekKey)) {
                playerDataByWeekAndType[weekKey][sessionType] += (data.duration || 0) / 60;
            }
        });
        
        // Calculer les heures par semaine par joueuse (pour moyenne équipe)
        const allPlayersWeeklyHours = {};
        weeks.forEach(w => allPlayersWeeklyHours[w] = {});
        
        allRpeSnapshot.forEach(doc => {
            const data = doc.data();
            const weekKey = getWeekKey(new Date(data.date));
            const playerId = data.playerId;
            
            if (allPlayersWeeklyHours.hasOwnProperty(weekKey) && playerIds.has(playerId)) {
                if (!allPlayersWeeklyHours[weekKey][playerId]) {
                    allPlayersWeeklyHours[weekKey][playerId] = 0;
                }
                allPlayersWeeklyHours[weekKey][playerId] += (data.duration || 0) / 60;
            }
        });
        
        // Calculer la moyenne équipe par semaine
        const teamAvgHours = weeks.map(week => {
            const playersHours = Object.values(allPlayersWeeklyHours[week]);
            if (playersHours.length === 0) return 0;
            const sum = playersHours.reduce((a, b) => a + b, 0);
            return Math.round(sum / playersHours.length * 10) / 10;
        });
        
        // Labels des semaines
        const labels = weeks.map(w => `S${w.split('-W')[1]}`);
        
        // Créer les datasets par type de session (barres empilées)
        const datasets = SESSION_TYPES_ORDER_PLAYER.map(sessionType => {
            const data = weeks.map(w => {
                const hours = playerDataByWeekAndType[w][sessionType] || 0;
                return Math.round(hours * 10) / 10;
            });
            
            return {
                label: sessionType,
                data: data,
                backgroundColor: SESSION_COLORS[sessionType] || '#6b7280',
                borderRadius: 4,
                stack: 'player',
                yAxisID: 'y'
            };
        });
        
        // Ajouter la ligne moyenne équipe (NON empilée)
        datasets.push({
            label: 'Moyenne équipe',
            data: teamAvgHours,
            type: 'line',
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#f59e0b',
            tension: 0.3,
            order: 0,
            stack: false,
            yAxisID: 'y'
        });
        
        const ctx = canvas.getContext('2d');
        weeklyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
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
                    x: { 
                        stacked: true,
                        grid: { display: false } 
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: { display: true, text: 'Heures' },
                        ticks: { callback: (v) => v + 'h' },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    }
                }
            }
        });
        
        console.log('Dashboard Charts: Graphique hebdomadaire créé');
    } catch (error) {
        console.error('Dashboard Charts: Erreur graphique hebdomadaire:', error);
    }
}

/**
 * Charge le graphique mensuel (depuis octobre + max joueuse + moyenne équipe) avec barres empilées par type
 */
async function loadMonthlyTrainingChart() {
    const canvas = document.getElementById('monthlyTrainingChart');
    if (!canvas) {
        console.log('Dashboard Charts: Canvas monthlyTrainingChart non trouvé');
        return;
    }
    
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();
    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
        monthlyChartInstance = null;
    }
    
    try {
        // Mois depuis octobre de l'année en cours (ou précédente si on est avant octobre)
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth(); // 0-11
        
        // Déterminer l'année de début (octobre)
        let startYear = currentYear;
        if (currentMonth < 9) { // Avant octobre
            startYear = currentYear - 1;
        }
        
        // Générer les mois depuis octobre
        const months = [];
        // Labels indexés par numéro de mois (0-11)
        const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
        
        let year = startYear;
        let month = 9; // Octobre (0-indexed)
        
        while (year < currentYear || (year === currentYear && month <= currentMonth)) {
            months.push({ year, month, key: `${year}-${(month + 1).toString().padStart(2, '0')}` });
            month++;
            if (month > 11) {
                month = 0;
                year++;
            }
        }
        
        // Date de début (1er octobre)
        const startDate = `${startYear}-10-01`;
        
        // Récupérer les RPE de la joueuse
        const playerRpeSnapshot = await db.collection('rpe')
            .where('playerId', '==', window.currentPlayer.id)
            .where('date', '>=', startDate)
            .get();
        
        // Récupérer tous les RPE de l'équipe
        const allRpeSnapshot = await db.collection('rpe')
            .where('date', '>=', startDate)
            .get();
        
        // Récupérer la liste des joueuses
        const playersSnapshot = await db.collection('players').get();
        const playerIds = new Set();
        playersSnapshot.forEach(doc => playerIds.add(doc.id));
        
        // Calculer les heures par mois ET par type pour la joueuse (tous les types)
        const playerMonthlyHoursByType = {};
        months.forEach(m => {
            playerMonthlyHoursByType[m.key] = {};
            SESSION_TYPES_ORDER_PLAYER.forEach(type => {
                playerMonthlyHoursByType[m.key][type] = 0;
            });
        });
        
        playerRpeSnapshot.forEach(doc => {
            const data = doc.data();
            const date = new Date(data.date);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            if (playerMonthlyHoursByType.hasOwnProperty(monthKey)) {
                const sessionType = normalizeSessionTypePlayer(data.sessionType);
                const hours = (data.duration || 0) / 60;
                playerMonthlyHoursByType[monthKey][sessionType] += hours;
            }
        });
        
        // Calculer les heures par mois par joueuse (pour moyenne/max)
        const allPlayersMonthlyHours = {};
        months.forEach(m => allPlayersMonthlyHours[m.key] = {});
        
        // Créer un Set de playerIds normalisés (sans accents, lowercase)
        const normalizedPlayerIds = new Set();
        const playerIdMapping = {}; // Pour retrouver l'ID original
        playerIds.forEach(id => {
            const normalized = id.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            normalizedPlayerIds.add(normalized);
            playerIdMapping[normalized] = id;
        });
        
        allRpeSnapshot.forEach(doc => {
            const data = doc.data();
            const date = new Date(data.date);
            const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            const playerId = data.playerId;
            
            // Normaliser le playerId pour la comparaison
            const normalizedId = playerId ? playerId.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : '';
            
            if (allPlayersMonthlyHours.hasOwnProperty(monthKey) && normalizedPlayerIds.has(normalizedId)) {
                // Utiliser l'ID normalisé comme clé pour regrouper
                if (!allPlayersMonthlyHours[monthKey][normalizedId]) {
                    allPlayersMonthlyHours[monthKey][normalizedId] = 0;
                }
                allPlayersMonthlyHours[monthKey][normalizedId] += (data.duration || 0) / 60;
            }
        });
        
        // Calculer moyenne et max par mois
        const teamAvgHours = [];
        const teamMaxHours = [];
        
        months.forEach(m => {
            const playersHours = Object.values(allPlayersMonthlyHours[m.key]);
            console.log(`Mois ${m.key}: ${playersHours.length} joueuses, heures:`, playersHours);
            if (playersHours.length === 0) {
                teamAvgHours.push(0);
                teamMaxHours.push(0);
            } else {
                const sum = playersHours.reduce((a, b) => a + b, 0);
                const avg = sum / playersHours.length;
                const max = Math.max(...playersHours);
                console.log(`  → Sum: ${sum}, Avg: ${avg}, Max: ${max}`);
                teamAvgHours.push(Math.round(avg * 10) / 10);
                teamMaxHours.push(Math.round(max * 10) / 10);
            }
        });
        
        console.log('teamAvgHours:', teamAvgHours);
        console.log('teamMaxHours:', teamMaxHours);
        
        // Labels
        const labels = months.map(m => monthLabels[m.month]);
        
        // Calculer le total empilé par mois pour définir l'échelle Y
        const stackedTotals = months.map(m => {
            let total = 0;
            SESSION_TYPES_ORDER_PLAYER.forEach(type => {
                total += playerMonthlyHoursByType[m.key][type] || 0;
            });
            return total;
        });
        
        // Trouver le max entre les barres empilées et les courbes
        const maxStacked = Math.max(...stackedTotals);
        const maxLine = Math.max(...teamMaxHours, ...teamAvgHours);
        const overallMax = Math.max(maxStacked, maxLine);
        // Arrondir au multiple de 10 supérieur pour une échelle propre
        const yAxisMax = Math.ceil(overallMax / 10) * 10 + 10;
        
        console.log('Échelle Y - Max barres:', maxStacked, 'Max lignes:', maxLine, 'Axe max:', yAxisMax);
        
        // Créer les datasets pour chaque type de session
        const datasets = SESSION_TYPES_ORDER_PLAYER.map(type => ({
            label: type,
            data: months.map(m => Math.round(playerMonthlyHoursByType[m.key][type] * 10) / 10),
            backgroundColor: SESSION_COLORS[type],
            borderRadius: 4,
            stack: 'playerStack',
            order: 3,
            yAxisID: 'y'
        }));
        
        // Ajouter les lignes max et moyenne équipe sur axe Y2 (même échelle, non empilé)
        // Max équipe en orange (plus visible)
        datasets.push({
            label: 'Max équipe',
            data: teamMaxHours,
            type: 'line',
            borderColor: '#f59e0b',
            backgroundColor: 'transparent',
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#f59e0b',
            tension: 0.3,
            order: 1,
            yAxisID: 'y2'
        });
        
        // Moyenne équipe en vert pointillé
        datasets.push({
            label: 'Moyenne équipe',
            data: teamAvgHours,
            type: 'line',
            borderColor: '#10b981',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 3,
            pointBackgroundColor: '#10b981',
            tension: 0.3,
            order: 2,
            yAxisID: 'y2'
        });
        
        const ctx = canvas.getContext('2d');
        monthlyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12, padding: 15 }
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
                        position: 'left',
                        min: 0,
                        max: yAxisMax,
                        title: { display: true, text: 'Heures' },
                        ticks: { callback: (v) => v + 'h' },
                        grid: { color: 'rgba(0,0,0,0.05)' }
                    },
                    y2: {
                        beginAtZero: true,
                        stacked: false,
                        position: 'left',
                        min: 0,
                        max: yAxisMax,
                        display: false,
                        grid: { display: false }
                    },
                    x: { 
                        stacked: true,
                        grid: { display: false } 
                    }
                }
            }
        });
        
        console.log('Dashboard Charts: Graphique mensuel créé');
    } catch (error) {
        console.error('Dashboard Charts: Erreur graphique mensuel:', error);
    }
}

/**
 * Gère le clic sur les boutons de navigation de cycle
 */
async function handleCycleNavClick(event) {
    const offset = parseInt(event.target.dataset.cycleOffset);
    console.log(`Dashboard Charts: Navigation vers cycle avec offset: ${offset}`);
    await loadCycleChart(offset);
}

/**
 * Charge le graphique du cycle menstruel avec hormones et dates clés
 * @param {number} cycleOffset - Offset du cycle par rapport au cycle actuel (0 = actuel, -1 = précédent, etc.)
 */
async function loadCycleChart(cycleOffset = 0) {
    const canvas = document.getElementById('cycleChart');
    const emptyDiv = document.getElementById('cycleChartEmpty');
    
    if (!canvas) {
        console.log('Dashboard Charts: Canvas cycleChart non trouvé');
        return;
    }
    
    try {
        const playerId = window.currentPlayer.id;
        
        console.log(`Dashboard Charts: Recherche avec playerId="${playerId}" pour ${window.currentPlayer.name}`);
        
        // Récupérer les données du cycle
        const cycleDoc = await db.collection('menstrualCycle').doc(playerId).get();
        const cycleData = cycleDoc.data();
        
        console.log('Dashboard Charts: Données cycle récupérées:', cycleData);
        
        if (!cycleData || !cycleData.cycleStartDate) {
            console.log('Dashboard Charts: Pas de données de cycle disponibles');
            canvas.style.display = 'none';
            emptyDiv.style.display = 'block';
            return;
        }
        
        console.log(`Dashboard Charts: cycleStartDate = ${cycleData.cycleStartDate}, cycleLength = ${cycleData.cycleLength}`);
        
        // Récupérer tous les checkins avec données de cycle (les 100 plus RÉCENTS)
        const checkinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .orderBy('date', 'desc')
            .limit(100)
            .get();
        
        // Récupérer tous les RPE de la joueuse (les 100 plus RÉCENTS)
        const rpeSnapshot = await db.collection('rpe')
            .where('playerId', '==', playerId)
            .orderBy('date', 'desc')
            .limit(100)
            .get();
        
        console.log(`Dashboard Charts: ${checkinsSnapshot.docs.length} check-ins trouvés pour ${window.currentPlayer.name}`);
        console.log(`Dashboard Charts: ${rpeSnapshot.docs.length} RPE trouvés pour ${window.currentPlayer.name}`);
        
        // Afficher TOUTES les dates des check-ins avec leurs symptoms
        console.log('Dashboard Charts: 📅 Liste COMPLÈTE des check-ins:');
        checkinsSnapshot.docs.forEach((doc, idx) => {
            const data = doc.data();
            const symptomsCount = data.symptoms ? Object.keys(data.symptoms).length : 0;
            console.log(`  ${idx + 1}. ${data.date} | energy=${data.energy || 0} | symptoms: ${symptomsCount} champs`);
            if (symptomsCount > 0) {
                console.log(`     → symptoms:`, data.symptoms);
            }
        });
        
        // Vérifier s'il y a plusieurs playerIds
        const playerIds = new Set(checkinsSnapshot.docs.map(doc => doc.data().playerId));
        if (playerIds.size > 1) {
            console.warn(`Dashboard Charts: ⚠️ ATTENTION - ${playerIds.size} playerIds DIFFÉRENTS trouvés:`, Array.from(playerIds));
        }
        
        // Afficher les dates et valeurs d'énergie des check-ins
        checkinsSnapshot.docs.slice(0, 5).forEach(doc => {
            const data = doc.data();
            console.log(`  - ${data.date}: energy=${data.energy}, sleep=${data.sleep}, stress=${data.stress}`);
        });
        
        const cycleLength = cycleData.cycleLength || 28;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Calculer le J1 le plus proche d'aujourd'hui
        let lastJ1 = new Date(cycleData.cycleStartDate);
        lastJ1.setHours(0, 0, 0, 0);
        
        // PAS de recalcul automatique - on utilise le J1 déclaré par la joueuse tel quel
        // Si le J1 est dans le futur (erreur de saisie), on affiche quand même
        if (lastJ1 > today) {
            console.log(`Dashboard Charts: J1 dans le futur (${lastJ1.toISOString().split('T')[0]}), possible erreur de saisie`);
        }
        // Sinon on garde lastJ1 tel quel - pas d'avancement automatique au cycle suivant

        // Appliquer l'offset du cycle (pour C-1, C-2, etc.)
        lastJ1.setDate(lastJ1.getDate() + (cycleOffset * cycleLength));

        // Dates clés
        const cycleEndDate = new Date(lastJ1);
        cycleEndDate.setDate(cycleEndDate.getDate() + cycleLength - 1);
        
        // Ovulation environ à J14 (ou selon la durée du cycle)
        const ovulationDay = Math.round(cycleLength * 0.5);
        const ovulationDate = new Date(lastJ1);
        ovulationDate.setDate(ovulationDate.getDate() + ovulationDay - 1);
        
        console.log(`Dashboard Charts: Cycle ${cycleLength}j - J1: ${lastJ1.toISOString().split('T')[0]}, Ovulation: ${ovulationDate.toISOString().split('T')[0]}, Fin: ${cycleEndDate.toISOString().split('T')[0]}`);
        
        // Créer les données pour le cycle complet
        const data = [];
        const labels = [];
        const phaseColors = {
            'menstrual': '#ef4444',
            'follicular': '#3b82f6',
            'ovulation': '#fbbf24',
            'luteal': '#a855f7'
        };
        
        // Générer les jours du cycle - AVEC possibilité d'inclure le cycle précédent
        let todayDayOfCycle = null;
        
        // Première passe : trouver quel jour du cycle est aujourd'hui
        for (let i = 0; i < cycleLength; i++) {
            const date = new Date(lastJ1);
            date.setDate(date.getDate() + i);
            if (date.toDateString() === today.toDateString()) {
                todayDayOfCycle = i + 1;
                break;
            }
        }
        
        // Afficher une fenêtre autour de "Today" : 7 jours avant + today + 14 jours après
        const daysBeforeToday = 7;
        const daysAfterToday = 14;
        
        let startDayIndex = 0;  // Par défaut, commencer à J1
        let endDayIndex = cycleLength - 1;  // Par défaut, finir à la fin du cycle
        
        if (todayDayOfCycle) {
            // Calculer l'index de début (peut être négatif pour inclure le cycle précédent)
            startDayIndex = (todayDayOfCycle - 1) - daysBeforeToday;
            endDayIndex = (todayDayOfCycle - 1) + daysAfterToday;
            
            // Si on dépasse la fin du cycle, limiter
            if (endDayIndex >= cycleLength) {
                endDayIndex = cycleLength - 1;
            }
        }
        
        console.log(`Dashboard Charts: Today=J${todayDayOfCycle}, Affichage de index ${startDayIndex} à ${endDayIndex}`);
        
        // Générer les données pour la plage calculée
        let xValue = 1; // Valeur X continue pour le graphique
        let todayXValue = null; // Valeur X correspondant à aujourd'hui
        
        for (let i = startDayIndex; i <= endDayIndex; i++) {
            const date = new Date(lastJ1);
            date.setDate(date.getDate() + i);
            
            // Vérifier si c'est aujourd'hui et stocker la valeur X
            if (date.toDateString() === today.toDateString()) {
                todayXValue = xValue;
            }
            
            // Calculer le jour du cycle (peut être négatif pour le cycle précédent)
            let dayOfCycle = i + 1;
            let actualDayOfCycle = dayOfCycle;
            let isFromPreviousCycle = false;
            
            // Si jour négatif, c'est un jour du cycle précédent
            if (dayOfCycle <= 0) {
                actualDayOfCycle = cycleLength + dayOfCycle;
                isFromPreviousCycle = true;
            }
            
            const dateStr = date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
            const labelPrefix = isFromPreviousCycle ? `C-1 J${actualDayOfCycle}` : `J${actualDayOfCycle}`;
            labels.push(`${labelPrefix}`);
            
            // Déterminer la phase du cycle (utiliser actualDayOfCycle)
            const menstrualEnd = Math.round(cycleLength * 0.18); // ~5 jours sur 28
            const ovulationStart = Math.round(cycleLength * 0.42); // ~12 jours sur 28
            const ovulationEnd = Math.round(cycleLength * 0.58); // ~16 jours sur 28
            
            let phase = 'follicular';
            if (actualDayOfCycle <= menstrualEnd) {
                phase = 'menstrual';
            } else if (actualDayOfCycle >= ovulationStart && actualDayOfCycle <= ovulationEnd) {
                phase = 'ovulation';
            } else if (actualDayOfCycle > ovulationEnd) {
                phase = 'luteal';
            } else {
                phase = 'follicular';
            }
            
            // Symptômes et Énergie (données réelles - seulement jusqu'à aujourd'hui)
            // Initialiser à null pour que Chart.js n'affiche pas de ligne vers 0
            let symptomScore = null;
            let energyScore = null;
            let performanceScore = null;
            
            // Ne chercher les données que si on n'a pas dépassé aujourd'hui
            if (date <= today) {
                // Format de date pour comparaison
                const dateStrISO = date.toISOString().split('T')[0];
                
                // Récupérer les données du check-in pour ce jour (v2)
                const dayCheckins = checkinsSnapshot.docs.filter(doc => doc.data().date === dateStrISO);
                
                // 🔍 Log pour TOUS les jours pour déboguer
                console.log(`Dashboard Charts: J${actualDayOfCycle} (${dateStrISO}) - ${dayCheckins.length} check-in(s)`);
                
                if (dayCheckins.length > 0) {
                    // Prendre le DERNIER check-in de la journée (le plus récent)
                    const checkinData = dayCheckins[dayCheckins.length - 1].data();
                    
                    // Symptômes menstruels (0-10) : cramps, headache, fatigue, moodSwings, bloating, backPain, breastTenderness
                    const symptoms = checkinData.symptoms || {};
                    const symptomValues = Object.values(symptoms).filter(v => typeof v === 'number' && v > 0);
                    
                    // Symptômes pré-menstruels (SPM) - présence/absence comptée comme 5/10 si présent
                    const spmSymptoms = checkinData.spmSymptoms || [];
                    const spmCount = Array.isArray(spmSymptoms) ? spmSymptoms.length : 0;
                    
                    // Calculer le score : prendre le MAXIMUM des symptômes (pas la moyenne)
                    // Pour voir en un coup d'œil l'intensité la plus haute ressentie
                    if (symptomValues.length > 0 || spmCount > 0) {
                        const totalSymptoms = [...symptomValues];
                        // Chaque SPM présent compte comme 5/10 d'intensité
                        for (let j = 0; j < spmCount; j++) {
                            totalSymptoms.push(5);
                        }
                        // PRENDRE LE MAX au lieu de la moyenne
                        symptomScore = Math.max(...totalSymptoms);
                        console.log(`Dashboard Charts: J${actualDayOfCycle} (${dateStrISO}) - Symptômes détectés:`, symptoms, `→ MAX=${symptomScore}`);
                    }
                    
                    // Énergie (garder null si pas de valeur)
                    energyScore = checkinData.energy > 0 ? checkinData.energy : null;
                }
                
                // Récupérer le RPE de la journée
                const dayRpe = rpeSnapshot.docs.filter(doc => {
                    const rpeDate = new Date(doc.data().date);
                    return rpeDate.toDateString() === date.toDateString();
                });
                
                if (dayRpe.length > 0) {
                    const rpeData = dayRpe[0].data();
                    performanceScore = rpeData.rpe > 0 ? rpeData.rpe : null;
                }
            }
            
            // Calcul des hormones (courbes réalistes - affichées tout le cycle)
            // Utiliser actualDayOfCycle pour gérer correctement les jours du cycle précédent
            // Œstrogène : pic avant ovulation, puis baisse, puis 2e pic lutéal
            let estrogen = 2;
            if (actualDayOfCycle <= menstrualEnd) {
                estrogen = 1 + (actualDayOfCycle / menstrualEnd) * 2;
            } else if (actualDayOfCycle < ovulationDay) {
                estrogen = 3 + ((actualDayOfCycle - menstrualEnd) / (ovulationDay - menstrualEnd)) * 5;
            } else if (actualDayOfCycle === ovulationDay) {
                estrogen = 8;
            } else if (actualDayOfCycle <= ovulationEnd) {
                estrogen = 8 - ((actualDayOfCycle - ovulationDay) / (ovulationEnd - ovulationDay)) * 2;
            } else {
                estrogen = 6 + ((actualDayOfCycle - ovulationEnd) / (cycleLength - ovulationEnd)) * 1;
            }
            
            // Progestérone : très basse avant ovulation, puis augmente fortement
            // Utiliser actualDayOfCycle pour gérer correctement les jours du cycle précédent
            let progesterone = 1;
            if (actualDayOfCycle <= ovulationEnd) {
                progesterone = 0.5 + (actualDayOfCycle / ovulationEnd) * 0.5;
            } else {
                const luteralDays = cycleLength - ovulationEnd;
                const luteralProgress = (actualDayOfCycle - ovulationEnd) / luteralDays;
                progesterone = 1 + luteralProgress * 6;
                if (actualDayOfCycle > cycleLength - 3) {
                    progesterone = Math.max(0.5, progesterone - ((actualDayOfCycle - (cycleLength - 3)) / 3) * 6);
                }
            }
            
            // Utiliser xValue comme x pour l'affichage continu (pas actualDayOfCycle)
            data.push({
                x: xValue,
                actualDayOfCycle: actualDayOfCycle,  // Stocker pour référence
                symptoms: symptomScore,
                energy: energyScore,
                performance: performanceScore,
                estrogen: estrogen,
                progesterone: progesterone,
                phase: phase,
                date: dateStr,
                isFromPreviousCycle: isFromPreviousCycle  // Marquer pour debug
            });
            
            xValue++; // Incrémenter pour le prochain point
        }
        
        // Interpoler les données d'énergie et performance pour les gaps de 1-2 jours sans saisie
        function interpolateEnergyGaps(dataArray, maxDay) {
            // Trouver tous les jours avec énergie > 0, jusqu'à maxDay (aujourd'hui)
            const daysWithEnergy = dataArray.filter(d => d.energy > 0 && d.x <= maxDay);
            
            if (daysWithEnergy.length < 2) return dataArray; // Pas assez de points pour interpoler
            
            // Pour chaque gap de 1-2 jours, interpoler linéairement
            for (let i = 0; i < daysWithEnergy.length - 1; i++) {
                const current = daysWithEnergy[i];
                const next = daysWithEnergy[i + 1];
                const dayGap = next.x - current.x;
                
                // Si gap de 1-2 jours seulement, interpoler
                if (dayGap > 1 && dayGap <= 3) {
                    const energyDiff = next.energy - current.energy;
                    const daysDiff = dayGap;
                    
                    // Remplir les jours intermédiaires avec interpolation linéaire
                    for (let d = current.x + 1; d < next.x; d++) {
                        // Ne pas interpoler au-delà d'aujourd'hui
                        if (d > maxDay) break;
                        
                        const progress = (d - current.x) / daysDiff;
                        const interpolatedEnergy = current.energy + (energyDiff * progress);
                        
                        // Trouver l'index de ce jour dans le tableau original
                        const dayIndex = dataArray.findIndex(item => item.x === d);
                        if (dayIndex !== -1) {
                            dataArray[dayIndex].energy = Math.round(interpolatedEnergy * 10) / 10; // Arrondir à 1 décimale
                        }
                    }
                }
            }
            
            // Interpoler aussi la performance
            const daysWithPerformance = dataArray.filter(d => d.performance > 0 && d.x <= maxDay);
            
            if (daysWithPerformance.length >= 2) {
                for (let i = 0; i < daysWithPerformance.length - 1; i++) {
                    const current = daysWithPerformance[i];
                    const next = daysWithPerformance[i + 1];
                    const dayGap = next.x - current.x;
                    
                    // Si gap de 1-2 jours seulement, interpoler
                    if (dayGap > 1 && dayGap <= 3) {
                        const performanceDiff = next.performance - current.performance;
                        const daysDiff = dayGap;
                        
                        // Remplir les jours intermédiaires avec interpolation linéaire
                        for (let d = current.x + 1; d < next.x; d++) {
                            // Ne pas interpoler au-delà d'aujourd'hui
                            if (d > maxDay) break;
                            
                            const progress = (d - current.x) / daysDiff;
                            const interpolatedPerformance = current.performance + (performanceDiff * progress);
                            
                            // Trouver l'index de ce jour dans le tableau original
                            const dayIndex = dataArray.findIndex(item => item.x === d);
                            if (dayIndex !== -1) {
                                dataArray[dayIndex].performance = Math.round(interpolatedPerformance * 10) / 10;
                            }
                        }
                    }
                }
            }
            
            return dataArray;
        }
        
        // Appliquer l'interpolation (seulement jusqu'à aujourd'hui)
        // Utiliser todayXValue au lieu de todayDayOfCycle car x est maintenant un index continu
        const interpolatedData = interpolateEnergyGaps(data, todayXValue || data.length);
        
        // Mettre à null les énergies après aujourd'hui (pour ne pas les afficher)
        if (todayXValue) {
            interpolatedData.forEach(d => {
                if (d.x > todayXValue) {
                    d.energy = null;
                    d.symptoms = null;
                    d.performance = null;
                }
            });
        }
        
        // Créer le graphique
        const ctx = canvas.getContext('2d');
        
        console.log(`Dashboard Charts: Avant création graphique - ${interpolatedData.length} jours de données`);
        const energyWithData = interpolatedData.filter(d => d.energy !== null && d.energy > 0);
        const performanceWithData = interpolatedData.filter(d => d.performance !== null && d.performance > 0);
        console.log(`Dashboard Charts: ${energyWithData.length} jours avec énergie > 0`);
        if (energyWithData.length > 0) {
            console.log(`Dashboard Charts: Énergies - Min: ${Math.min(...energyWithData.map(d => d.energy))}, Max: ${Math.max(...energyWithData.map(d => d.energy))}, Moyenne: ${(energyWithData.reduce((a,b) => a + b.energy, 0) / energyWithData.length).toFixed(1)}`);
        }
        console.log(`Dashboard Charts: ${performanceWithData.length} jours avec performance > 0`);
        if (performanceWithData.length > 0) {
            console.log(`Dashboard Charts: Performance - Min: ${Math.min(...performanceWithData.map(d => d.performance))}, Max: ${Math.max(...performanceWithData.map(d => d.performance))}`);
        }
        
        // 🔍 NOUVEAU: Logs pour déboguer les symptômes
        const symptomsWithData = interpolatedData.filter(d => d.symptoms !== null && d.symptoms > 0);
        console.log(`Dashboard Charts: ${symptomsWithData.length} jours avec symptômes > 0`);
        if (symptomsWithData.length > 0) {
            console.log(`Dashboard Charts: Symptômes - Min: ${Math.min(...symptomsWithData.map(d => d.symptoms))}, Max: ${Math.max(...symptomsWithData.map(d => d.symptoms))}`);
            console.log(`Dashboard Charts: Jours avec symptômes:`, symptomsWithData.map(d => `J${d.x}=${d.symptoms.toFixed(1)}`).join(', '));
        }
        
        // 🔍 Log des données symptômes pour le dataset
        const symptomsDataset = interpolatedData.map(d => ({ x: d.x, y: d.symptoms }));
        console.log('Dashboard Charts: Dataset symptômes - Total points:', symptomsDataset.length);
        console.log('Dashboard Charts: Dataset symptômes - Points avec données:', symptomsDataset.filter(p => p.y !== null && p.y > 0));
        console.log('Dashboard Charts: Dataset symptômes - Points null:', symptomsDataset.filter(p => p.y === null).length);
        
        // Datasets : hormones + symptômes + énergie
        const datasets = [
            // Œstrogène
            {
                label: 'Œstrogène',
                data: interpolatedData.map(d => ({ x: d.x, y: d.estrogen })),
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.05)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                yAxisID: 'y'
            },
            // Progestérone
            {
                label: 'Progestérone',
                data: interpolatedData.map(d => ({ x: d.x, y: d.progesterone })),
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.05)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                yAxisID: 'y'
            },
            // Énergie (données réelles)
            {
                label: 'Énergie (0-10)',
                data: interpolatedData.map(d => ({ x: d.x, y: d.energy })),
                borderColor: '#10b981',
                backgroundColor: 'transparent',
                borderWidth: 2,
                fill: false,
                tension: 0.3,
                pointRadius: interpolatedData.some(d => d.energy > 0) ? 2 : 0,
                pointBackgroundColor: '#10b981',
                yAxisID: 'y1'
            },
            // Intensité des symptômes
            {
                label: 'Symptômes (0-10)',
                data: symptomsDataset,
                borderColor: '#f59e0b',
                backgroundColor: 'transparent',
                borderWidth: 3,
                fill: false,
                tension: 0.3,
                spanGaps: true,
                pointRadius: 5,
                pointBackgroundColor: '#f59e0b',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                yAxisID: 'y1'
            },
            // Performance
            {
                label: 'Performance (0-10)',
                data: interpolatedData.map(d => ({ x: d.x, y: d.performance })),
                borderColor: '#06b6d4',
                backgroundColor: 'transparent',
                borderWidth: 3,
                fill: false,
                tension: 0.3,
                pointRadius: interpolatedData.some(d => d.performance > 0) ? 3 : 0,
                pointHoverRadius: 5,
                pointBackgroundColor: '#06b6d4',
                yAxisID: 'y1'
            }
        ];
        
        // Détruire l'ancien graphique
        if (cycleChartInstance) {
            cycleChartInstance.destroy();
        }
        
        // Enregistrer le plugin pour dessiner la ligne "Aujourd'hui"
        Chart.register({
            id: 'todayLine',
            afterDatasetsDraw(chart) {
                const todayDayOfCycleValue = chart.options.plugins.todayLine?.todayDayOfCycle;
                if (!todayDayOfCycleValue) return;
                
                const ctx = chart.ctx;
                const xScale = chart.scales.x;
                const yScale = chart.scales.y;
                
                const xPixel = xScale.getPixelForValue(todayDayOfCycleValue);
                const yTop = yScale.getPixelForValue(yScale.max);
                const yBottom = yScale.getPixelForValue(yScale.min);
                
                // Dessiner une ligne verticale verte
                ctx.save();
                ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(xPixel, yTop);
                ctx.lineTo(xPixel, yBottom);
                ctx.stroke();
                
                // Label "Today"
                ctx.fillStyle = '#22c55e';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                const yLevel9 = yScale.getPixelForValue(9);
                ctx.fillText('Today', xPixel, yLevel9 - 8);
                ctx.restore();
            }
        });
        
        cycleChartInstance = new Chart(ctx, {
            type: 'line',
            data: { datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    // Plugin pour dessiner une ligne "Aujourd'hui"
                    todayLine: {
                        todayDayOfCycle: todayXValue  // Utiliser la valeur X continue
                    },
                    legend: {
                        display: false  // Masquée car légende HTML en dessous
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: { size: 14, weight: 'bold' },
                        bodyFont: { size: 12 },
                        callbacks: {
                            title: (context) => {
                                if (context.length > 0) {
                                    const dayX = Math.round(context[0].raw.x);
                                    // Trouver le point de données correspondant
                                    const dayData = interpolatedData.find(d => Math.round(d.x) === dayX);
                                    if (dayData) {
                                        const label = dayData.isFromPreviousCycle ? `C-1 J${dayData.actualDayOfCycle}` : `J${dayData.actualDayOfCycle}`;
                                        return label + ' - ' + dayData.date;
                                    }
                                    return 'J' + dayX;
                                }
                                return '';
                            },
                            afterLabel: (context) => {
                                const dayX = Math.round(context.raw.x);
                                const dayData = interpolatedData.find(d => Math.round(d.x) === dayX);
                                if (!dayData) return '';
                                
                                const lines = [];
                                
                                if (dayData.symptoms > 0) {
                                    lines.push(`Symptômes: ${dayData.symptoms.toFixed(1)}/10`);
                                }
                                if (dayData.energy > 0) {
                                    lines.push(`Énergie: ${dayData.energy.toFixed(1)}/10`);
                                }
                                
                                return lines.join('\n');
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        // Afficher la plage calculée (peut inclure jours du cycle précédent)
                        min: data.length > 0 ? Math.min(...data.map(d => d.x)) : 1,
                        max: data.length > 0 ? Math.max(...data.map(d => d.x)) : cycleLength,
                        ticks: {
                            stepSize: 2,
                            callback: (value) => {
                                // Trouver le point de données correspondant à cette valeur x
                                const pointData = interpolatedData.find(d => Math.round(d.x) === Math.round(value));
                                if (pointData) {
                                    const prefix = pointData.isFromPreviousCycle ? 'C-1 ' : '';
                                    return prefix + 'J' + pointData.actualDayOfCycle;
                                }
                                return 'J' + Math.round(value);
                            }
                        },
                        title: { display: true, text: 'Jour du Cycle' }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        min: 0,
                        max: 10,
                        title: { display: true, text: 'Hormones (pg/mL)' },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        min: 0,
                        max: 10,
                        title: { display: true, text: 'Symptômes (0-10)' },
                        grid: { drawOnChartArea: false }
                    }
                }
            }
        });
        
        // Ajouter les annotations pour les dates clés
        const chartContainer = canvas.parentElement;
        let annotationDiv = chartContainer.querySelector('#cycleAnnotations');
        if (!annotationDiv) {
            annotationDiv = document.createElement('div');
            annotationDiv.id = 'cycleAnnotations';
            annotationDiv.style.cssText = 'margin-top: 20px; padding: 16px; background: #f9fafb; border-radius: 8px; border-left: 4px solid #667eea; clear: both;';
            chartContainer.appendChild(annotationDiv);
        }
        
        annotationDiv.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 13px; margin-bottom: 12px;">
                <div><strong>📅 Début du cycle</strong><br>${lastJ1.toLocaleDateString('fr-FR')}</div>
                <div><strong>🔴 Ovulation</strong><br>${ovulationDate.toLocaleDateString('fr-FR')}</div>
                <div><strong>📆 Fin du cycle</strong><br>${cycleEndDate.toLocaleDateString('fr-FR')}</div>
            </div>
            ${todayDayOfCycle ? `<div style="margin-bottom: 12px; padding: 8px 12px; background-color: rgba(34, 197, 94, 0.1); border-left: 3px solid #22c55e; font-weight: 600; border-radius: 4px;">📍 Aujourd'hui: Jour ${todayDayOfCycle} (J${todayDayOfCycle})</div>` : ''}
            <div style="font-size: 12px; color: #6b7280; line-height: 1.6;">
                <strong>Cycle: ${cycleLength} jours</strong><br>
                💝 Œstrogène (rose) | 💜 Progestérone (violet) | 🟢 Énergie (vert) | 🟡 Symptômes (orange pointillé)
            </div>
        `;
        
        canvas.style.display = 'block';
        emptyDiv.style.display = 'none';
        console.log('Dashboard Charts: Graphique du cycle avec hormones créé');

        // Logique de navigation des cycles
        const cycleNavButtons = document.querySelectorAll('#cycleNavigation button');
        cycleNavButtons.forEach(button => {
            button.removeEventListener('click', handleCycleNavClick); // Empêcher les multiples listeners
            button.addEventListener('click', handleCycleNavClick);
        });

        // Mettre à jour l'état actif des boutons de navigation
        cycleNavButtons.forEach(button => {
            if (parseInt(button.dataset.cycleOffset) === cycleOffset) {
                button.style.backgroundColor = '#667eea'; // Couleur active
                button.style.color = 'white';
            } else {
                button.style.backgroundColor = ''; // Couleur inactive
                button.style.color = '';
            }
        });

    } catch (error) {
        console.error('Dashboard Charts: Erreur graphique cycle:', error);
        canvas.style.display = 'none';
        emptyDiv.style.display = 'block';
    }
}

/**
 * Met à jour la barre de progression de l'objectif annuel
 * Saison sportive : mi-août (15 août) à fin juin (30 juin)
 */
async function updateAnnualProgress() {
    const progressBar = document.getElementById('annualProgressBar');
    const progressText = document.getElementById('annualProgressText');
    const progressDetails = document.getElementById('annualProgressDetails');
    
    if (!progressBar) {
        console.log('Dashboard Charts: Barre progression non trouvée');
        return;
    }
    
    try {
        // Calculer les dates de la saison sportive
        // Saison : 15 août année N à 30 juin année N+1
        const today = new Date();
        const currentMonth = today.getMonth(); // 0 = janvier, 7 = août
        const currentYear = today.getFullYear();
        
        let seasonStartYear, seasonEndYear;
        
        // Si on est entre août et décembre, la saison a commencé cette année
        // Si on est entre janvier et juillet, la saison a commencé l'année dernière
        if (currentMonth >= 7) { // Août à Décembre (mois 7-11)
            seasonStartYear = currentYear;
            seasonEndYear = currentYear + 1;
        } else { // Janvier à Juillet (mois 0-6)
            seasonStartYear = currentYear - 1;
            seasonEndYear = currentYear;
        }
        
        const seasonStart = `${seasonStartYear}-08-15`; // 15 août
        const seasonEnd = `${seasonEndYear}-06-30`;     // 30 juin
        const seasonEndDate = new Date(seasonEndYear, 5, 30); // 30 juin
        
        const rpeSnapshot = await db.collection('rpe')
            .where('playerId', '==', window.currentPlayer.id)
            .where('date', '>=', seasonStart)
            .where('date', '<=', seasonEnd)
            .get();
        
        let totalMinutes = 0;
        rpeSnapshot.forEach(doc => {
            totalMinutes += doc.data().duration || 0;
        });
        
        const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
        const objectiveHours = 720;
        const percentage = Math.min(100, Math.round((totalHours / objectiveHours) * 100));
        
        progressBar.style.width = percentage + '%';
        
        if (percentage >= 75) {
            progressBar.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
        } else if (percentage >= 50) {
            progressBar.style.background = 'linear-gradient(90deg, #667eea, #818cf8)';
        } else if (percentage >= 25) {
            progressBar.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
        } else {
            progressBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
        }
        
        if (progressText) {
            progressText.textContent = `${totalHours}h / ${objectiveHours}h (${percentage}%)`;
        }
        
        if (progressDetails) {
            const remaining = objectiveHours - totalHours;
            
            // Calcul réaliste basé sur la saison volleyball
            // Fin de saison : 30 juin
            // Vacances Noël (6h/sem) : 21 déc - 2 jan = 2 semaines
            // Semaines légères (6h) : 1ère sem janvier + 2 sem février + 2 sem avril = 5 semaines
            // Semaines normales : 19h
            
            // Utiliser seasonEndYear déjà calculé (fin de saison = 30 juin)
            const endOfSeason = seasonEndDate;
            
            if (today >= endOfSeason) {
                progressDetails.textContent = remaining <= 0 
                    ? '🎉 Objectif atteint !' 
                    : `Reste ${Math.round(remaining)}h - Saison terminée`;
                return;
            }
            
            // Calculer les semaines restantes jusqu'au 30 juin
            const weeksLeft = Math.max(1, Math.ceil((endOfSeason - today) / (1000 * 60 * 60 * 24 * 7)));
            
            // Estimer les semaines spéciales restantes
            let lightWeeks = 0; // Semaines à 6h (vacances)
            
            // Vacances Noël (6h) : 21 déc - 2 jan = 2 semaines
            const noelEnd = new Date(seasonEndYear, 0, 2);
            if (today < noelEnd) {
                lightWeeks += 2;
            }
            
            // Semaines légères (6h) : 1ère sem janvier, 2 sem février, 2 sem avril
            const janEnd = new Date(seasonEndYear, 0, 10);
            const fevEnd = new Date(seasonEndYear, 2, 1);
            const avrEnd = new Date(seasonEndYear, 3, 26);
            
            if (today < janEnd) lightWeeks += 1;
            if (today < fevEnd) lightWeeks += 2;
            if (today < avrEnd) lightWeeks += 2;
            
            // Semaines normales
            const normalWeeks = Math.max(0, weeksLeft - lightWeeks);
            
            // Heures disponibles estimées
            const avgNormalHours = 19; // 19h/semaine normale
            const lightHours = 6;      // 6h/semaine vacances
            const availableHours = (normalWeeks * avgNormalHours) + (lightWeeks * lightHours);
            
            // Affichage
            let statusText = '';
            if (remaining <= 0) {
                statusText = '🎉 Objectif atteint !';
            } else if (remaining <= availableHours) {
                const monthsLeft = Math.max(1, Math.ceil(weeksLeft / 4.3));
                const avgPerMonth = Math.round(remaining / monthsLeft);
                statusText = `Reste ${Math.round(remaining)}h - ~${avgPerMonth}h/mois ✓`;
            } else {
                const deficit = Math.round(remaining - availableHours);
                statusText = `Reste ${Math.round(remaining)}h - Retard estimé: ${deficit}h`;
            }
            
            progressDetails.textContent = statusText;
        }
        
        console.log('Dashboard Charts: Progression annuelle -', totalHours, 'h');
    } catch (error) {
        console.error('Dashboard Charts: Erreur progression:', error);
    }
}

/**
 * Rafraîchit tous les graphiques
 */
function refreshPlayerDashboardCharts() {
    console.log('Dashboard Charts: Rafraîchissement...');
    initPlayerDashboardCharts();
}

/**
 * Gestion de la modal de correction de J1
 */
function initCorrectCycleModal() {
    const correctCycleBtn = document.getElementById('correctCycleBtn');
    const correctCycleModal = document.getElementById('correctCycleModal');
    const correctCycleDateInput = document.getElementById('correctCycleDateInput');
    const correctCyclePreview = document.getElementById('correctCyclePreview');
    const correctCycleDayPreview = document.getElementById('correctCycleDayPreview');
    const cancelCorrectCycleBtn = document.getElementById('cancelCorrectCycleBtn');
    const confirmCorrectCycleBtn = document.getElementById('confirmCorrectCycleBtn');

    if (!correctCycleBtn || !correctCycleModal) {
        console.log('Correction J1: Éléments non trouvés');
        return;
    }

    // Définir la date max à aujourd'hui
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    correctCycleDateInput.max = todayStr;

    // Ouvrir la modal
    correctCycleBtn.addEventListener('click', function() {
        console.log('Correction J1: Ouverture modal');
        correctCycleModal.style.display = 'flex';
        correctCycleDateInput.value = '';
        correctCyclePreview.style.display = 'none';
    });

    // Fermer la modal (annuler)
    cancelCorrectCycleBtn.addEventListener('click', function() {
        correctCycleModal.style.display = 'none';
    });

    // Fermer en cliquant sur le fond
    correctCycleModal.addEventListener('click', function(e) {
        if (e.target === correctCycleModal) {
            correctCycleModal.style.display = 'none';
        }
    });

    // Preview du jour calculé
    correctCycleDateInput.addEventListener('change', function() {
        const selectedDate = new Date(this.value + 'T12:00:00');
        if (!isNaN(selectedDate.getTime())) {
            // Calculer le jour du cycle avec cette nouvelle date
            const diffTime = today - selectedDate;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const cycleDay = diffDays + 1;
            
            correctCycleDayPreview.textContent = 'J' + cycleDay;
            correctCyclePreview.style.display = 'block';
        }
    });

    // Confirmer la correction
    confirmCorrectCycleBtn.addEventListener('click', async function() {
        if (!window.currentPlayer || !window.currentPlayer.id) {
            console.error('Correction J1: Pas de joueur actif');
            alert('Erreur: Aucune joueuse sélectionnée');
            return;
        }

        const selectedDate = correctCycleDateInput.value;
        if (!selectedDate) {
            alert('Veuillez sélectionner une date');
            return;
        }

        try {
            console.log('Correction J1: Mise à jour pour', window.currentPlayer.id, 'avec date', selectedDate);
            
            // Mettre à jour la date de début de cycle dans Firestore
            await db.collection('menstrualCycle').doc(window.currentPlayer.id).update({
                cycleStartDate: selectedDate,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });

            console.log('Correction J1: Mise à jour réussie');
            
            // Fermer la modal
            correctCycleModal.style.display = 'none';
            
            // Afficher un message de succès
            alert('✅ Date du J1 corrigée avec succès!');
            
            // Rafraîchir le graphique
            setTimeout(() => {
                refreshPlayerDashboardCharts();
            }, 300);
            
        } catch (error) {
            console.error('Correction J1: Erreur lors de la mise à jour:', error);
            alert('❌ Erreur lors de la correction: ' + error.message);
        }
    });

    console.log('Correction J1: Modal initialisée');
}

// Observer les changements d'onglet
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser la modal de correction de J1
    initCorrectCycleModal();
    
    const dashboardTab = document.getElementById('dashboardTab');
    if (dashboardTab) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.attributeName === 'class') {
                    if (dashboardTab.classList.contains('active') && window.currentPlayer) {
                        setTimeout(initPlayerDashboardCharts, 100);
                    }
                }
            });
        });
        observer.observe(dashboardTab, { attributes: true });
    }
});

// Exports globaux
window.initPlayerDashboardCharts = initPlayerDashboardCharts;
window.refreshPlayerDashboardCharts = refreshPlayerDashboardCharts;

console.log('Module Player Dashboard Charts chargé');
