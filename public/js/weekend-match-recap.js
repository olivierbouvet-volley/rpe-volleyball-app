/**
 * WEEKEND MATCH RECAP - Dashboard Coach
 * Récapitulatif des matchs du week-end avec résultats et temps de jeu
 * + Historique des 8 derniers week-ends avec graphique
 */

console.log('🏐 Chargement weekend-match-recap.js');

// Instance du graphique historique (pour éviter les fuites mémoire)
let weekendHistoryChartInstance = null;

/**
 * Charge et affiche le récap des matchs du week-end
 */
async function loadWeekendMatchRecap() {
    try {
        const container = document.getElementById('weekendMatchRecap');
        if (!container) return;

        container.innerHTML = '<div class="loading-spinner">Chargement des matchs...</div>';

        // Récupérer les matchs du dernier week-end
        const weekendMatches = await getLastWeekendMatches();

        // Grouper par date (même si vide)
        const matchesByDate = groupMatchesByDate(weekendMatches);

        // Calculer les statistiques globales (même si vide)
        const globalStats = weekendMatches.length > 0
            ? calculateGlobalStats(weekendMatches)
            : { totalMatches: 0, totalVictories: 0, totalDefeats: 0, playerStats: [] };

        // Générer le HTML avec les onglets (toujours, même sans matchs ce WE)
        container.innerHTML = generateWeekendRecapHTML(matchesByDate, globalStats, weekendMatches);
        
    } catch (error) {
        console.error('Erreur loadWeekendMatchRecap:', error);
        document.getElementById('weekendMatchRecap').innerHTML = `
            <div class="error-message">Erreur de chargement des matchs</div>
        `;
    }
}

/**
 * Récupère les matchs du dernier week-end (samedi + dimanche)
 */
async function getLastWeekendMatches() {
    try {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = dimanche, 6 = samedi
        
        // Calculer le dernier samedi et dimanche
        let lastSaturday, lastSunday;
        
        if (dayOfWeek === 0) {
            // Aujourd'hui = dimanche → hier = samedi
            lastSunday = new Date(now);
            lastSunday.setHours(0, 0, 0, 0);
            lastSaturday = new Date(lastSunday);
            lastSaturday.setDate(lastSaturday.getDate() - 1);
        } else if (dayOfWeek === 6) {
            // Aujourd'hui = samedi
            lastSaturday = new Date(now);
            lastSaturday.setHours(0, 0, 0, 0);
            lastSunday = new Date(lastSaturday);
            lastSunday.setDate(lastSunday.getDate() + 1);
        } else {
            // Lundi à vendredi → week-end précédent
            const daysToLastSunday = dayOfWeek === 1 ? 1 : (dayOfWeek + 6) % 7;
            lastSunday = new Date(now);
            lastSunday.setDate(lastSunday.getDate() - daysToLastSunday);
            lastSunday.setHours(0, 0, 0, 0);
            lastSaturday = new Date(lastSunday);
            lastSaturday.setDate(lastSaturday.getDate() - 1);
        }
        
        // Formater en local (pas UTC) pour éviter décalage de fuseau horaire
        const formatDateLocal = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        const saturdayStr = formatDateLocal(lastSaturday);
        const sundayStr = formatDateLocal(lastSunday);
        
        console.log('Recherche matchs:', saturdayStr, 'et', sundayStr);
        
        // Récupérer tous les matchs du week-end
        const matchesSnapshot = await db.collection('rpe')
            .where('sessionType', '==', 'Match')
            .where('date', 'in', [saturdayStr, sundayStr])
            .get();
        
        const matches = [];
        const playerIds = new Set();
        
        matchesSnapshot.forEach(doc => {
            const data = doc.data();
            matches.push({
                id: doc.id,
                ...data
            });
            playerIds.add(data.playerId);
        });
        
        // Récupérer les infos des joueuses
        const playerNames = {};
        for (const playerId of playerIds) {
            const playerDoc = await db.collection('players').doc(playerId).get();
            if (playerDoc.exists) {
                playerNames[playerId] = playerDoc.data().name || 'Joueuse inconnue';
            }
        }
        
        // Ajouter les noms aux matchs
        matches.forEach(match => {
            match.playerName = playerNames[match.playerId] || 'Joueuse inconnue';
        });
        
        // Trier par date puis par nom
        matches.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.playerName.localeCompare(b.playerName);
        });
        
        return matches;
        
    } catch (error) {
        console.error('Erreur getLastWeekendMatches:', error);
        return [];
    }
}

/**
 * Calcule les dates d'un week-end (samedi + dimanche) pour N semaines en arrière
 * @param {number} weeksAgo - Nombre de semaines en arrière (0 = ce week-end/dernier WE)
 * @returns {Object} { saturday, sunday, label }
 */
function getWeekendDates(weeksAgo = 0) {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = dimanche, 6 = samedi

    // Trouver le dernier dimanche
    let lastSunday;
    if (dayOfWeek === 0) {
        lastSunday = new Date(now);
    } else {
        lastSunday = new Date(now);
        lastSunday.setDate(lastSunday.getDate() - dayOfWeek);
    }
    lastSunday.setHours(12, 0, 0, 0);

    // Reculer de weeksAgo semaines
    const targetSunday = new Date(lastSunday);
    targetSunday.setDate(targetSunday.getDate() - (weeksAgo * 7));

    const targetSaturday = new Date(targetSunday);
    targetSaturday.setDate(targetSaturday.getDate() - 1);

    // Créer le label "WE 8-9 fév"
    const satDay = targetSaturday.getDate();
    const sunDay = targetSunday.getDate();
    const monthNames = ['jan', 'fév', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
    const month = monthNames[targetSaturday.getMonth()];
    const label = `${satDay}-${sunDay} ${month}`;

    // Formater en local (pas UTC) pour éviter décalage de fuseau horaire
    const formatDateLocal = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    return {
        saturday: formatDateLocal(targetSaturday),
        sunday: formatDateLocal(targetSunday),
        label: label
    };
}

/**
 * Récupère l'historique des matchs des N derniers week-ends
 * @param {number} weeksBack - Nombre de week-ends à récupérer (défaut: 8)
 * @returns {Array} Tableau de données par week-end
 */
async function getWeekendHistoryData(weeksBack = 8) {
    console.log(`📊 Chargement historique ${weeksBack} week-ends...`);

    try {
        const weekendsData = [];

        // Collecter toutes les dates de tous les week-ends
        const allDates = [];
        const weekendDateMap = {}; // Pour retrouver quel week-end correspond à quelle date

        for (let i = 0; i < weeksBack; i++) {
            const weekend = getWeekendDates(i);
            allDates.push(weekend.saturday, weekend.sunday);
            weekendDateMap[weekend.saturday] = i;
            weekendDateMap[weekend.sunday] = i;
            weekendsData.push({
                index: i,
                label: weekend.label,
                dates: weekend,
                matches: [],
                stats: {
                    playerCount: 0,
                    victories: 0,
                    defeats: 0,
                    winRate: 0,
                    avgPlayingTime: 0,
                    totalMatches: 0
                }
            });
        }

        // Query Firestore pour tous les matchs de ces dates
        // Note: Firestore 'in' query supporte max 30 valeurs, on est bon avec 16 dates
        const matchesSnapshot = await db.collection('rpe')
            .where('sessionType', '==', 'Match')
            .where('date', 'in', allDates)
            .get();

        // Distribuer les matchs dans les bons week-ends
        matchesSnapshot.forEach(doc => {
            const data = doc.data();
            const weekendIndex = weekendDateMap[data.date];
            if (weekendIndex !== undefined) {
                weekendsData[weekendIndex].matches.push(data);
            }
        });

        // Calculer les stats pour chaque week-end
        weekendsData.forEach(weekend => {
            const matches = weekend.matches;
            const playerIds = new Set();
            let totalTime = 0;
            let timeCount = 0;

            matches.forEach(match => {
                playerIds.add(match.playerId);

                if (match.matchWon === true) {
                    weekend.stats.victories++;
                } else if (match.matchWon === false) {
                    weekend.stats.defeats++;
                }

                if (match.timePlayed) {
                    totalTime += parseInt(match.timePlayed) || 0;
                    timeCount++;
                }
            });

            weekend.stats.playerCount = playerIds.size;
            weekend.stats.totalMatches = matches.length;
            weekend.stats.avgPlayingTime = timeCount > 0 ? Math.round(totalTime / timeCount) : 0;
            weekend.stats.winRate = matches.length > 0
                ? Math.round((weekend.stats.victories / matches.length) * 100)
                : 0;
        });

        console.log('📊 Historique chargé:', weekendsData);
        return weekendsData;

    } catch (error) {
        console.error('Erreur getWeekendHistoryData:', error);
        return [];
    }
}

/**
 * Groupe les matchs par date
 */
function groupMatchesByDate(matches) {
    const grouped = {};
    
    matches.forEach(match => {
        if (!grouped[match.date]) {
            grouped[match.date] = [];
        }
        grouped[match.date].push(match);
    });
    
    return grouped;
}

/**
 * Calcule les statistiques globales
 */
function calculateGlobalStats(matches) {
    const playerStats = {};
    let totalVictories = 0;
    let totalDefeats = 0;
    
    matches.forEach(match => {
        const playerId = match.playerId;
        const playerName = match.playerName;
        
        if (!playerStats[playerId]) {
            playerStats[playerId] = {
                name: playerName,
                victories: 0,
                defeats: 0,
                totalTime: 0,
                matches: 0
            };
        }
        
        playerStats[playerId].matches++;
        
        if (match.matchWon === true) {
            playerStats[playerId].victories++;
            totalVictories++;
        } else if (match.matchWon === false) {
            playerStats[playerId].defeats++;
            totalDefeats++;
        }
        
        if (match.timePlayed) {
            const time = parseInt(match.timePlayed) || 0;
            playerStats[playerId].totalTime += time;
        }
    });
    
    // Convertir en tableau et trier par victoires puis temps de jeu
    const sortedPlayers = Object.values(playerStats).sort((a, b) => {
        if (b.victories !== a.victories) return b.victories - a.victories;
        return b.totalTime - a.totalTime;
    });
    
    return {
        totalMatches: matches.length,
        totalVictories,
        totalDefeats,
        playerStats: sortedPlayers
    };
}

/**
 * Génère le HTML du récap
 */
function generateWeekendRecapHTML(matchesByDate, globalStats, allMatches) {
    const winRate = globalStats.totalMatches > 0 
        ? Math.round((globalStats.totalVictories / globalStats.totalMatches) * 100) 
        : 0;
    
    let html = `
        <div class="weekend-recap-header">
            <h3>🏐 Récap Week-end</h3>
            <div class="weekend-stats-pills">
                <div class="stat-pill victories">
                    <span class="pill-value">${globalStats.totalVictories}</span>
                    <span class="pill-label">Victoires</span>
                </div>
                <div class="stat-pill defeats">
                    <span class="pill-value">${globalStats.totalDefeats}</span>
                    <span class="pill-label">Défaites</span>
                </div>
                <div class="stat-pill winrate ${winRate >= 50 ? 'positive' : ''}">
                    <span class="pill-value">${winRate}%</span>
                    <span class="pill-label">Taux victoire</span>
                </div>
            </div>
        </div>
        
        <div class="weekend-tabs">
            <button class="weekend-tab active" data-tab="matches">Matchs</button>
            <button class="weekend-tab" data-tab="stats">Statistiques</button>
            <button class="weekend-tab" data-tab="history">Historique</button>
        </div>

        <div class="weekend-tab-content active" id="matches-tab">
            ${generateMatchesTabHTML(matchesByDate)}
        </div>

        <div class="weekend-tab-content" id="stats-tab">
            ${generateStatsTabHTML(globalStats)}
        </div>

        <div class="weekend-tab-content" id="history-tab">
            ${generateHistoryTabHTML()}
        </div>
    `;

    // Ajouter les event listeners après insertion
    setTimeout(() => {
        const tabs = document.querySelectorAll('.weekend-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => switchWeekendTab(tab.dataset.tab));
        });
    }, 100);
    
    return html;
}

/**
 * Génère l'onglet Matchs
 */
function generateMatchesTabHTML(matchesByDate) {
    const dates = Object.keys(matchesByDate).sort();

    // Si aucun match ce week-end, afficher un message
    if (dates.length === 0) {
        return `
            <div class="no-matches">
                <div class="no-matches-icon">🏐</div>
                <p>Aucun match ce week-end</p>
                <p style="font-size: 14px; color: #94a3b8; margin-top: 10px;">
                    Consultez l'onglet <strong>Historique</strong> pour voir les week-ends précédents
                </p>
            </div>
        `;
    }

    let html = '';
    
    dates.forEach(date => {
        const matches = matchesByDate[date];
        const dateObj = new Date(date + 'T12:00:00');
        const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
        const dateFormatted = dateObj.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
        
        html += `
            <div class="match-day-group">
                <div class="match-day-header">
                    <span class="day-name">${dayName}</span>
                    <span class="day-date">${dateFormatted}</span>
                </div>
        `;
        
        matches.forEach(match => {
            const resultClass = match.matchWon === true ? 'victory' : match.matchWon === false ? 'defeat' : 'unknown';
            const resultIcon = match.matchWon === true ? '✅' : match.matchWon === false ? '❌' : '❓';
            const resultText = match.matchWon === true ? 'Victoire' : match.matchWon === false ? 'Défaite' : 'Non renseigné';
            
            const timePlayed = match.timePlayed ? parseInt(match.timePlayed) : 0;
            let timeText = 'Non renseigné';
            if (timePlayed > 0) {
                // Convertir le pourcentage en texte descriptif
                const timeLabels = {
                    0: '0 set',
                    20: '1/5 set',
                    25: '1/4 set',
                    33: '1/3 set',
                    40: '2/5 sets',
                    50: '2/4 sets',
                    60: '3/5 sets',
                    66: '2/3 sets',
                    75: '3/4 sets',
                    80: '4/5 sets',
                    100: 'Tous les sets'
                };
                timeText = `${timePlayed}% (${timeLabels[timePlayed] || `${timePlayed}%`})`;
            }
            
            html += `
                <div class="match-card ${resultClass}">
                    <div class="match-player">
                        <div class="player-avatar">${match.playerName.charAt(0).toUpperCase()}</div>
                        <div class="player-info">
                            <div class="player-name">${match.playerName}</div>
                            <div class="player-rpe">RPE: ${match.rpe}/10 • ${match.duration} min</div>
                        </div>
                    </div>
                    <div class="match-result">
                        <div class="result-badge ${resultClass}">
                            <span class="result-icon">${resultIcon}</span>
                            <span class="result-text">${resultText}</span>
                        </div>
                        ${match.matchScore ? `<div class="match-score">${match.matchScore}</div>` : ''}
                        <div class="match-time">⏱️ ${timeText}</div>
                    </div>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    return html;
}

/**
 * Génère l'onglet Statistiques
 */
function generateStatsTabHTML(globalStats) {
    let html = `
        <div class="stats-container">
            <div class="stats-header">
                <h4>📊 Statistiques individuelles</h4>
                <p class="stats-subtitle">${globalStats.playerStats.length} joueuses • ${globalStats.totalMatches} matchs</p>
            </div>
            <div class="player-stats-list">
    `;
    
    globalStats.playerStats.forEach((player, index) => {
        const winRate = player.matches > 0 ? Math.round((player.victories / player.matches) * 100) : 0;
        const avgTime = player.matches > 0 ? Math.round(player.totalTime / player.matches) : 0;
        
        html += `
            <div class="player-stat-card">
                <div class="player-stat-rank">${index + 1}</div>
                <div class="player-stat-info">
                    <div class="player-stat-name">${player.name}</div>
                    <div class="player-stat-details">
                        <span class="stat-detail victories-detail">
                            ✅ ${player.victories}V
                        </span>
                        <span class="stat-detail defeats-detail">
                            ❌ ${player.defeats}D
                        </span>
                        <span class="stat-detail winrate-detail ${winRate >= 50 ? 'positive' : ''}">
                            ${winRate}%
                        </span>
                    </div>
                </div>
                <div class="player-stat-time">
                    <div class="time-value">${avgTime}%</div>
                    <div class="time-label">Temps de jeu moyen</div>
                    <div class="time-avg">${player.matches} match${player.matches > 1 ? 's' : ''}</div>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

/**
 * Génère le HTML de l'onglet Historique
 */
function generateHistoryTabHTML() {
    return `
        <div class="history-container">
            <div class="history-header">
                <h4>📈 Historique des 8 derniers week-ends</h4>
                <p class="history-subtitle">Évolution des victoires, joueuses et temps de jeu</p>
            </div>
            <div class="history-chart-container">
                <canvas id="weekendHistoryChart"></canvas>
            </div>
            <div id="historyLoadingIndicator" class="history-loading">
                <span>Chargement des données...</span>
            </div>
            <div id="historySummary" class="history-summary"></div>
        </div>
    `;
}

/**
 * Charge et affiche le graphique d'historique
 */
async function loadHistoryChart() {
    const loadingEl = document.getElementById('historyLoadingIndicator');
    const summaryEl = document.getElementById('historySummary');
    const canvas = document.getElementById('weekendHistoryChart');

    if (!canvas) return;

    // Afficher le chargement
    if (loadingEl) loadingEl.style.display = 'block';

    try {
        // Récupérer les données
        const historyData = await getWeekendHistoryData(8);

        // Masquer le chargement
        if (loadingEl) loadingEl.style.display = 'none';

        if (historyData.length === 0) {
            if (summaryEl) {
                summaryEl.innerHTML = '<p class="no-history">Aucun historique disponible</p>';
            }
            return;
        }

        // Inverser pour avoir le plus ancien à gauche
        const reversedData = [...historyData].reverse();

        // Préparer les données pour Chart.js
        const labels = reversedData.map(w => w.label);
        const victoriesData = reversedData.map(w => w.stats.victories);
        const defeatsData = reversedData.map(w => w.stats.defeats);
        const playerCountData = reversedData.map(w => w.stats.playerCount);
        const avgTimeData = reversedData.map(w => w.stats.avgPlayingTime);

        // Détruire l'ancien graphique s'il existe
        if (weekendHistoryChartInstance) {
            weekendHistoryChartInstance.destroy();
            weekendHistoryChartInstance = null;
        }

        const ctx = canvas.getContext('2d');

        // Créer le graphique
        weekendHistoryChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Victoires',
                        data: victoriesData,
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderColor: 'rgb(16, 185, 129)',
                        borderWidth: 1,
                        stack: 'stack1',
                        order: 2
                    },
                    {
                        label: 'Défaites',
                        data: defeatsData,
                        backgroundColor: 'rgba(239, 68, 68, 0.8)',
                        borderColor: 'rgb(239, 68, 68)',
                        borderWidth: 1,
                        stack: 'stack1',
                        order: 2
                    },
                    {
                        label: 'Joueuses',
                        data: playerCountData,
                        type: 'line',
                        borderColor: 'rgb(139, 92, 246)',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 3,
                        pointRadius: 5,
                        pointBackgroundColor: 'rgb(139, 92, 246)',
                        fill: false,
                        yAxisID: 'y1',
                        order: 1
                    },
                    {
                        label: 'Temps de jeu moyen (%)',
                        data: avgTimeData,
                        type: 'line',
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        borderDash: [5, 5],
                        pointRadius: 5,
                        pointBackgroundColor: 'rgb(59, 130, 246)',
                        fill: false,
                        yAxisID: 'y2',
                        order: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            afterTitle: function(context) {
                                const idx = context[0].dataIndex;
                                const data = reversedData[idx];
                                return `${data.stats.totalMatches} matchs joués`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                    },
                    y: {
                        type: 'linear',
                        position: 'left',
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Matchs (V/D)',
                            font: { size: 11 }
                        },
                        ticks: { stepSize: 2 }
                    },
                    y1: {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        max: 14,
                        grid: { drawOnChartArea: false },
                        title: {
                            display: true,
                            text: 'Joueuses',
                            font: { size: 11 }
                        },
                        ticks: { stepSize: 2 }
                    },
                    y2: {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        max: 100,
                        display: false
                    }
                }
            }
        });

        // Générer le résumé
        generateHistorySummary(reversedData, summaryEl);

    } catch (error) {
        console.error('Erreur loadHistoryChart:', error);
        if (loadingEl) loadingEl.style.display = 'none';
        if (summaryEl) {
            summaryEl.innerHTML = '<p class="history-error">Erreur lors du chargement</p>';
        }
    }
}

/**
 * Génère le résumé des statistiques historiques
 */
function generateHistorySummary(data, container) {
    if (!container || data.length === 0) return;

    // Calculer les totaux
    let totalVictories = 0;
    let totalDefeats = 0;
    let totalMatches = 0;
    let avgPlayers = 0;

    data.forEach(w => {
        totalVictories += w.stats.victories;
        totalDefeats += w.stats.defeats;
        totalMatches += w.stats.totalMatches;
        avgPlayers += w.stats.playerCount;
    });

    avgPlayers = Math.round(avgPlayers / data.length);
    const winRate = totalMatches > 0 ? Math.round((totalVictories / totalMatches) * 100) : 0;

    container.innerHTML = `
        <div class="history-summary-grid">
            <div class="summary-stat">
                <span class="summary-value">${totalVictories}</span>
                <span class="summary-label">Victoires totales</span>
            </div>
            <div class="summary-stat">
                <span class="summary-value">${totalDefeats}</span>
                <span class="summary-label">Défaites totales</span>
            </div>
            <div class="summary-stat">
                <span class="summary-value ${winRate >= 50 ? 'positive' : ''}">${winRate}%</span>
                <span class="summary-label">Taux de victoire</span>
            </div>
            <div class="summary-stat">
                <span class="summary-value">${avgPlayers}</span>
                <span class="summary-label">Joueuses/WE (moy.)</span>
            </div>
        </div>
    `;
}

/**
 * Change d'onglet
 */
function switchWeekendTab(tabName) {
    // Mettre à jour les boutons
    document.querySelectorAll('.weekend-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Mettre à jour le contenu
    document.querySelectorAll('.weekend-tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    // Charger le graphique historique si nécessaire
    if (tabName === 'history' && !weekendHistoryChartInstance) {
        loadHistoryChart();
    }
}

/**
 * Bouton refresh
 */
function refreshWeekendRecap() {
    // Réinitialiser le graphique historique
    if (weekendHistoryChartInstance) {
        weekendHistoryChartInstance.destroy();
        weekendHistoryChartInstance = null;
    }
    loadWeekendMatchRecap();
}

// Exposer les fonctions globalement
window.loadWeekendMatchRecap = loadWeekendMatchRecap;
window.refreshWeekendRecap = refreshWeekendRecap;
window.loadHistoryChart = loadHistoryChart;
window.getWeekendHistoryData = getWeekendHistoryData;

console.log('✅ Weekend match recap loaded (avec historique)');
