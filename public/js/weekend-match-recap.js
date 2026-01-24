/**
 * WEEKEND MATCH RECAP - Dashboard Coach
 * Récapitulatif des matchs du week-end avec résultats et temps de jeu
 */

console.log('🏐 Chargement weekend-match-recap.js');

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
        
        if (weekendMatches.length === 0) {
            container.innerHTML = `
                <div class="no-matches">
                    <div class="no-matches-icon">🏐</div>
                    <p>Aucun match ce week-end</p>
                </div>
            `;
            return;
        }

        // Grouper par date
        const matchesByDate = groupMatchesByDate(weekendMatches);
        
        // Calculer les statistiques globales
        const globalStats = calculateGlobalStats(weekendMatches);
        
        // Générer le HTML
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
        
        const saturdayStr = lastSaturday.toISOString().split('T')[0];
        const sundayStr = lastSunday.toISOString().split('T')[0];
        
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
        </div>
        
        <div class="weekend-tab-content active" id="matches-tab">
            ${generateMatchesTabHTML(matchesByDate)}
        </div>
        
        <div class="weekend-tab-content" id="stats-tab">
            ${generateStatsTabHTML(globalStats)}
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
    let html = '';
    
    const dates = Object.keys(matchesByDate).sort();
    
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
}

/**
 * Bouton refresh
 */
function refreshWeekendRecap() {
    loadWeekendMatchRecap();
}

// Exposer les fonctions globalement
window.loadWeekendMatchRecap = loadWeekendMatchRecap;
window.refreshWeekendRecap = refreshWeekendRecap;

console.log('✅ Weekend match recap loaded');
