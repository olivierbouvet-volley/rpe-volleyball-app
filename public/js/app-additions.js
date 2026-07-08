// === FONCTIONS ADDITIONNELLES POUR RPE GEN2 (SANS STORAGE) ===

// Variable globale pour stocker l'ID de la joueuse sélectionnée
let selectedPlayerId = null;

// État des filtres pour le cycle
let cycleFilterState = {
    phase: 'all',      // 'all', 'Menstruelle', 'Folliculaire', 'Ovulatoire', 'Lutéale'
    iconType: 'all'    // 'all', 'Intensité', 'Volume', 'Repos', 'Attention'
};

/**
 * Crée les boutons de filtre pour le cycle menstruel
 */
function createCycleFilters() {
    const filterContainer = document.querySelector('.filter-buttons');
    if (!filterContainer) return;
    
    // Vérifier si les filtres cycle existent déjà
    if (document.getElementById('cycleFilterContainer')) return;
    
    // Créer le conteneur des filtres cycle
    const cycleFilterHTML = `
        <div id="cycleFilterContainer" style="margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-border);">
            <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px; text-transform: uppercase;">🌸 Filtres Cycle</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
                <button class="cycle-phase-filter active" data-phase="all" style="padding: 6px 12px; border-radius: 6px; border: 1px solid var(--color-border); background: var(--color-background); cursor: pointer; font-size: 12px;">Toutes</button>
                <button class="cycle-phase-filter" data-phase="Menstruelle" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #ef4444; background: var(--color-surface); cursor: pointer; font-size: 12px;">🩸 Menstruelle</button>
                <button class="cycle-phase-filter" data-phase="Folliculaire" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #10b981; background: var(--color-surface); cursor: pointer; font-size: 12px;">🌱 Folliculaire</button>
                <button class="cycle-phase-filter" data-phase="Ovulatoire" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #8b5cf6; background: var(--color-surface); cursor: pointer; font-size: 12px;">🌸 Ovulatoire</button>
                <button class="cycle-phase-filter" data-phase="Lutéale" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #f59e0b; background: var(--color-surface); cursor: pointer; font-size: 12px;">🍂 Lutéale</button>
            </div>
            <div style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px; text-transform: uppercase;">💡 Recommandation</div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                <button class="cycle-icon-filter active" data-icon="all" style="padding: 6px 12px; border-radius: 6px; border: 1px solid var(--color-border); background: var(--color-background); cursor: pointer; font-size: 12px;">Toutes</button>
                <button class="cycle-icon-filter" data-icon="Intensité" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #10b981; background: var(--color-surface); cursor: pointer; font-size: 12px;">⚡ Intensité</button>
                <button class="cycle-icon-filter" data-icon="Volume" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #3b82f6; background: var(--color-surface); cursor: pointer; font-size: 12px;">📊 Volume</button>
                <button class="cycle-icon-filter" data-icon="Repos" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #ef4444; background: var(--color-surface); cursor: pointer; font-size: 12px;">🛌 Repos</button>
                <button class="cycle-icon-filter" data-icon="Attention" style="padding: 6px 12px; border-radius: 6px; border: 1px solid #f59e0b; background: var(--color-surface); cursor: pointer; font-size: 12px;">⚠️ Attention</button>
            </div>
        </div>
    `;
    
    filterContainer.insertAdjacentHTML('beforeend', cycleFilterHTML);
    
    // Ajouter les event listeners pour les filtres de phase
    document.querySelectorAll('.cycle-phase-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.cycle-phase-filter').forEach(b => {
                b.classList.remove('active');
                b.style.background = 'var(--color-surface)';
            });
            e.target.classList.add('active');
            e.target.style.background = 'var(--color-background)';
            cycleFilterState.phase = e.target.dataset.phase;
            
            // Recharger le dashboard avec le filtre
            if (typeof loadCoachDashboard === 'function') {
                loadCoachDashboard();
            }
        });
    });
    
    // Ajouter les event listeners pour les filtres d'icône
    document.querySelectorAll('.cycle-icon-filter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.cycle-icon-filter').forEach(b => {
                b.classList.remove('active');
                b.style.background = 'var(--color-surface)';
            });
            e.target.classList.add('active');
            e.target.style.background = 'var(--color-background)';
            cycleFilterState.iconType = e.target.dataset.icon;
            
            // Recharger le dashboard avec le filtre
            if (typeof loadCoachDashboard === 'function') {
                loadCoachDashboard();
            }
        });
    });
}

// REMPLACER la fonction displayTeamGrid existante
window.displayTeamGrid = async function(players) {
    const grid = document.getElementById('teamGrid');
    grid.innerHTML = '';
    
    // Créer les filtres cycle si pas encore fait
    createCycleFilters();
    
    // Filtrer par statut (existant)
    let filteredPlayers = appState.currentFilter === 'all' 
        ? players 
        : players.filter(p => p.status === appState.currentFilter);
    
    const today = new Date().toISOString().split('T')[0];
    
    // Préparer les données de cycle pour chaque joueuse
    const playersWithCycleData = [];
    
    for (const player of filteredPlayers) {
        let cycleData = {
            phase: 'Données manquantes',
            dayOfCycle: 0,
            iconType: 'Attention',
            recommendation: null,
            checkin: null,
            symptoms: null
        };
        
        try {
            // Récupérer le check-in du jour
            const checkinSnapshot = await db.collection('checkins')
                .where('playerId', '==', player.id)
                .where('date', '==', today)
                .limit(1)
                .get();
            
            if (!checkinSnapshot.empty) {
                cycleData.checkin = checkinSnapshot.docs[0].data();
                
                // Utiliser les données de cycle du check-in si disponibles
                if (cycleData.checkin.cyclePhase) {
                    cycleData.phase = cycleData.checkin.cyclePhase;
                    cycleData.dayOfCycle = cycleData.checkin.cycleDay || cycleData.checkin.dayOfCycle || 0;
                }
                
                // Récupérer les symptômes du check-in si disponibles
                if (cycleData.checkin.symptoms) {
                    cycleData.symptoms = cycleData.checkin.symptoms;
                }
            }
            
            // Si pas de données dans le check-in, essayer de récupérer depuis menstrualCycle
            if (cycleData.phase === 'Données manquantes') {
                const cycleDoc = await db.collection('menstrualCycle').doc(player.id).get();
                if (cycleDoc.exists) {
                    const cycleConfig = cycleDoc.data();
                    if (cycleConfig.cycleStartDate) {
                        // UTILISER LA NOUVELLE FONCTION AVEC DONNÉES RÉELLES
                        const cycleInfo = await calculateCyclePhaseWithRealData(
                            cycleConfig.cycleStartDate, 
                            cycleConfig.cycleLength || 28,
                            player.id
                        );
                        cycleData.phase = cycleInfo.phase;
                        cycleData.dayOfCycle = cycleInfo.dayOfCycle;
                        cycleData.isExtended = cycleInfo.isExtended;
                    }
                }
            }
            
            // Calculer le score ajusté
            const baseScore = player.score || 5;
            const { adjustedScore } = applyCycleAdjustments(baseScore, cycleData.phase);
            
            // Générer les alertes de symptômes si disponibles
            let cycleAlerts = [];
            if (cycleData.symptoms) {
                cycleAlerts = generateCycleAlerts(cycleData.symptoms);
            }
            
            // Obtenir la recommandation détaillée
            cycleData.recommendation = getDetailedCycleRecommendation(
                cycleData.phase,
                cycleAlerts,
                adjustedScore,
                cycleData.checkin
            );
            cycleData.iconType = cycleData.recommendation.iconType;
            cycleData.adjustedScore = adjustedScore;
            
        } catch (error) {
            console.error(`Erreur récupération cycle pour ${player.id}:`, error);
        }
        
        playersWithCycleData.push({ ...player, cycleData });
    }
    
    // Appliquer les filtres de cycle
    let finalPlayers = playersWithCycleData;
    
    if (cycleFilterState.phase !== 'all') {
        finalPlayers = finalPlayers.filter(p => p.cycleData.phase === cycleFilterState.phase);
    }
    
    if (cycleFilterState.iconType !== 'all') {
        finalPlayers = finalPlayers.filter(p => p.cycleData.iconType === cycleFilterState.iconType);
    }
    
    // Afficher les statistiques de distribution des phases
    displayCycleStats(playersWithCycleData);
    
    // Afficher chaque joueuse
    for (const player of finalPlayers) {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.style.cursor = 'pointer';
        card.onclick = () => openPlayerDetail(player.id);
        
        // Récupérer les commentaires et RPE du jour
        let commentHTML = '';
        let rpeHTML = '';
        
        try {
            // Commentaire check-in
            if (player.cycleData.checkin?.comment) {
                commentHTML = `
                    <div style="margin-top: var(--space-8); padding: var(--space-8); background: var(--color-background); border-radius: var(--radius-sm); border-left: 2px solid var(--color-info);">
                        <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: var(--space-4);">💬 Check-in</div>
                        <div style="font-size: 12px; color: var(--color-text); font-style: italic;">${player.cycleData.checkin.comment}</div>
                    </div>
                `;
            }
            
            // Commentaire RPE et valeur
            const rpeSnapshot = await db.collection('rpe')
                .where('playerId', '==', player.id)
                .where('date', '==', today)
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();
            
            if (!rpeSnapshot.empty) {
                const rpeData = rpeSnapshot.docs[0].data();
                const rpeValue = rpeData.rpe || '--';
                const rpeComment = rpeData.comment || '';
                
                rpeHTML = `
                    <div style="margin-top: var(--space-8); padding: var(--space-8); background: var(--color-background); border-radius: var(--radius-sm); border-left: 2px solid var(--color-warning);">
                        <div style="font-size: 11px; color: var(--color-text-secondary); margin-bottom: var(--space-4);">🏋️ RPE: ${rpeValue}/10</div>
                        ${rpeComment ? `<div style="font-size: 12px; color: var(--color-text); font-style: italic;">${rpeComment}</div>` : ''}
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erreur lors de la récupération des commentaires:', error);
        }
        
        // Badge cycle avec phase et recommandation
        const cycleBadgeHTML = generateCycleBadgeHTML(
            player.cycleData.phase, 
            player.cycleData.dayOfCycle, 
            player.cycleData.iconType
        );
        
        card.innerHTML = `
            <img src="${player.photoURL || '/img/default-avatar.png'}" 
                 alt="${player.name}" 
                 class="player-avatar player-avatar-large"
                 onerror="this.src='/img/default-avatar.png'"
                 style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
            <div class="player-card-info">
                <div class="player-card-name">${player.name}</div>
                <div class="player-card-status">Score: ${player.score}/10</div>
                <div class="status-gauge" style="margin-top: var(--space-8);">
                    <div class="status-gauge-fill ${player.status}" style="width: ${player.score * 10}%"></div>
                </div>
                ${cycleBadgeHTML}
                ${commentHTML}
                ${rpeHTML}
            </div>
        `;
        
        // Stocker les données cycle pour le popup
        card.dataset.cyclePhase = player.cycleData.phase;
        card.dataset.cycleDay = player.cycleData.dayOfCycle;
        card.dataset.cycleIcon = player.cycleData.iconType;
        
        grid.appendChild(card);
    }
    
    if (finalPlayers.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-48);">Aucune joueuse dans cette catégorie</p>';
    }
}

/**
 * Affiche les statistiques de distribution des phases
 */
function displayCycleStats(players) {
    // Compter les joueuses par phase
    const phaseCounts = {
        'Menstruelle': 0,
        'Folliculaire': 0,
        'Ovulatoire': 0,
        'Lutéale': 0,
        'Données manquantes': 0
    };
    
    const iconCounts = {
        'Intensité': 0,
        'Volume': 0,
        'Repos': 0,
        'Attention': 0
    };
    
    players.forEach(p => {
        if (phaseCounts.hasOwnProperty(p.cycleData.phase)) {
            phaseCounts[p.cycleData.phase]++;
        } else {
            phaseCounts['Données manquantes']++;
        }
        
        if (iconCounts.hasOwnProperty(p.cycleData.iconType)) {
            iconCounts[p.cycleData.iconType]++;
        }
    });
    
    // Mettre à jour les badges des boutons de filtre avec les compteurs
    document.querySelectorAll('.cycle-phase-filter').forEach(btn => {
        const phase = btn.dataset.phase;
        if (phase !== 'all' && phaseCounts[phase] !== undefined) {
            const count = phaseCounts[phase];
            btn.innerHTML = btn.innerHTML.replace(/\(\d+\)/, '').trim() + ` (${count})`;
        }
    });
    
    document.querySelectorAll('.cycle-icon-filter').forEach(btn => {
        const icon = btn.dataset.icon;
        if (icon !== 'all' && iconCounts[icon] !== undefined) {
            const count = iconCounts[icon];
            btn.innerHTML = btn.innerHTML.replace(/\(\d+\)/, '').trim() + ` (${count})`;
        }
    });
}

// Ouvrir le modal de détails d'une joueuse
window.openPlayerDetail = function(playerId) {
    // Attendre que player-popup.js soit chargé si nécessaire
    if (window.showPlayerDetail) {
        window.showPlayerDetail(playerId);
    } else {
        // Réessayer après un court délai si le module n'est pas encore chargé
        setTimeout(() => {
            if (window.showPlayerDetail) {
                window.showPlayerDetail(playerId);
            } else {
                console.error('Module player-popup non chargé');
            }
        }, 100);
    }
}

// Fermer le modal de détails
window.closePlayerDetailModal = function() {
    document.getElementById('playerDetailModal').classList.remove('active');
    selectedPlayerId = null;
}

// Obtenir le label du statut
function getStatusLabel(status) {
    switch (status) {
        case 'optimal':
            return '✅ Optimal';
        case 'attention':
            return '⚠️ Attention';
        case 'critical':
            return '🚨 Critique';
        default:
            return '-- Pas de données';
    }
}

// Charger les données détaillées d'une joueuse
async function loadPlayerDetailData(playerId) {
    try {
        // Charger les check-ins des 7 derniers jours
        const checkins = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .orderBy('date', 'desc')
            .limit(7)
            .get();
        
        let sleepTotal = 0, sorenessTotal = 0, stressTotal = 0, moodTotal = 0;
        let count = 0;
        
        checkins.forEach(doc => {
            const data = doc.data();
            sleepTotal += data.sleep;
            sorenessTotal += data.soreness;
            stressTotal += data.stress;
            moodTotal += data.mood;
            count++;
        });
        
        if (count > 0) {
            document.getElementById('detailSleep').textContent = (sleepTotal / count).toFixed(1);
            document.getElementById('detailSoreness').textContent = (sorenessTotal / count).toFixed(1);
            document.getElementById('detailStress').textContent = (stressTotal / count).toFixed(1);
            document.getElementById('detailMood').textContent = (moodTotal / count).toFixed(1);
        } else {
            document.getElementById('detailSleep').textContent = '--';
            document.getElementById('detailSoreness').textContent = '--';
            document.getElementById('detailStress').textContent = '--';
            document.getElementById('detailMood').textContent = '--';
        }
        
        // Afficher le commentaire du jour dans Vue d'ensemble
        const today = new Date().toISOString().split('T')[0];
        const todayCheckin = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .where('date', '==', today)
            .limit(1)
            .get();
        
        const overviewCommentBox = document.getElementById('overviewCommentBox');
        const overviewComment = document.getElementById('overviewComment');
        
        if (!todayCheckin.empty && todayCheckin.docs[0].data().comment) {
            overviewComment.textContent = todayCheckin.docs[0].data().comment;
            overviewCommentBox.style.display = 'block';
        } else {
            overviewCommentBox.style.display = 'none';
        }
        
        // Charger les statistiques de volume
        if (typeof calculateTrainingHours === 'function') {
            const weekRange = getWeekRange();
            const monthRange = getMonthRange();
            const yearRange = getYearRange();
            
            const weeklyHours = await calculateTrainingHours(playerId, weekRange.start, weekRange.end);
            const monthlyHours = await calculateTrainingHours(playerId, monthRange.start, monthRange.end);
            const yearlyHours = await calculateTrainingHours(playerId, yearRange.start, yearRange.end);
            
            document.getElementById('detailWeeklyHours').textContent = `${weeklyHours.toFixed(1)}h`;
            document.getElementById('detailMonthlyHours').textContent = `${monthlyHours.toFixed(1)}h`;
            document.getElementById('detailYearlyHours').textContent = `${yearlyHours.toFixed(1)}h`;
            
            // Générer le graphique de tendance sur 4 semaines
            if (typeof generateVolumeTrendChart === 'function') {
                await generateVolumeTrendChart(playerId);
            }
        }
        
        // Charger les données ATL/CTL
        await loadATLCTLData(playerId);
        
        // Charger les alertes
        await loadPlayerAlerts(playerId);
        
        // Charger l'historique
        await loadPlayerHistory(playerId);
        
    } catch (error) {
        console.error('Erreur lors du chargement des données détaillées:', error);
    }
}

// Charger les données ATL/CTL
async function loadATLCTLData(playerId) {
    try {
        // Charger les RPE des 28 derniers jours
        const rpeData = await db.collection('rpe')
            .where('playerId', '==', playerId)
            .orderBy('date', 'desc')
            .limit(28)
            .get();
        
        let atl = 0, ctl = 0;
        let atlCount = 0, ctlCount = 0;
        
        rpeData.forEach((doc, index) => {
            const data = doc.data();
            const load = data.rpe * data.duration / 10;
            
            // ATL = moyenne sur 7 jours
            if (index < 7) {
                atl += load;
                atlCount++;
            }
            
            // CTL = moyenne sur 28 jours
            ctl += load;
            ctlCount++;
        });
        
        atl = atlCount > 0 ? (atl / atlCount).toFixed(0) : 0;
        ctl = ctlCount > 0 ? (ctl / ctlCount).toFixed(0) : 0;
        const tsb = ctl - atl;
        
        document.getElementById('atlValue').textContent = atl;
        document.getElementById('ctlValue').textContent = ctl;
        document.getElementById('tsbValue').textContent = tsb;
        
        // Interprétation du TSB
        let tsbInterpretation = '';
        let tsbClass = '';
        
        if (tsb > 10) {
            tsbInterpretation = '✅ Bien reposée, prête pour un entraînement intense';
            tsbClass = 'optimal';
        } else if (tsb >= -10 && tsb <= 10) {
            tsbInterpretation = '⚠️ Équilibre correct, charge d\'entraînement adaptée';
            tsbClass = 'attention';
        } else {
            tsbInterpretation = '🚨 Fatigue accumulée, risque de surmenage. Repos recommandé.';
            tsbClass = 'critical';
        }
        
        document.getElementById('tsbInterpretation').innerHTML = `
            <div class="status-gauge">
                <div class="status-gauge-fill ${tsbClass}" style="width: ${Math.min(100, Math.max(0, (tsb + 50)))}%"></div>
            </div>
            <p style="margin-top: var(--space-12); color: var(--color-text-secondary);">${tsbInterpretation}</p>
        `;
        
    } catch (error) {
        console.error('Erreur lors du chargement ATL/CTL:', error);
        document.getElementById('atlValue').textContent = '--';
        document.getElementById('ctlValue').textContent = '--';
        document.getElementById('tsbValue').textContent = '--';
    }
}

// Charger les alertes d'une joueuse
async function loadPlayerAlerts(playerId) {
    try {
        const alerts = [];
        
        // Vérifier le dernier check-in
        const lastCheckin = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .orderBy('date', 'desc')
            .limit(1)
            .get();
        
        if (lastCheckin.empty) {
            alerts.push({
                type: 'warning',
                message: 'Aucun check-in enregistré récemment'
            });
        } else {
            const lastData = lastCheckin.docs[0].data();
            const lastDate = new Date(lastData.date);
            const today = new Date();
            const daysDiff = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff > 2) {
                alerts.push({
                    type: 'warning',
                    message: `Dernier check-in il y a ${daysDiff} jours`
                });
            }
            
            // Vérifier les valeurs critiques
            if (lastData.sleep < 5) {
                alerts.push({
                    type: 'critical',
                    message: `Sommeil insuffisant: ${lastData.sleep}/10`
                });
            }
            
            if (lastData.soreness > 7) {
                alerts.push({
                    type: 'critical',
                    message: `Courbatures élevées: ${lastData.soreness}/10`
                });
            }
            
            if (lastData.stress > 7) {
                alerts.push({
                    type: 'warning',
                    message: `Stress élevé: ${lastData.stress}/10`
                });
            }
            
            if (lastData.mood < 5) {
                alerts.push({
                    type: 'warning',
                    message: `Humeur basse: ${lastData.mood}/10`
                });
            }
        }
        
        // Afficher les alertes
        const alertsList = document.getElementById('alertsList');
        if (alerts.length === 0) {
            alertsList.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-24);">✅ Aucune alerte</p>';
        } else {
            alertsList.innerHTML = alerts.map(alert => `
                <div class="card" style="border-left: 4px solid ${alert.type === 'critical' ? 'var(--color-critical)' : 'var(--color-attention)'}; margin-bottom: var(--space-12);">
                    <p style="margin: 0; color: var(--color-text-primary);">
                        ${alert.type === 'critical' ? '🚨' : '⚠️'} ${alert.message}
                    </p>
                </div>
            `).join('');
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement des alertes:', error);
    }
}

// Charger l'historique d'une joueuse
async function loadPlayerHistory(playerId) {
    try {
        const checkins = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .orderBy('date', 'desc')
            .limit(14)
            .get();
        
        const historyList = document.getElementById('historyList');
        
        if (checkins.empty) {
            historyList.innerHTML = '<p style="text-align: center; color: var(--color-text-secondary); padding: var(--space-24);">Aucun historique disponible</p>';
        } else {
            historyList.innerHTML = '';
            
            checkins.forEach(doc => {
                const data = doc.data();
                const score = (data.sleep + data.mood + (10 - data.soreness) + (10 - data.stress)) / 4;
                const status = score >= 7 ? 'optimal' : score >= 5 ? 'attention' : 'critical';
                
                const item = document.createElement('div');
                item.className = 'card';
                item.style.marginBottom = 'var(--space-12)';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${new Date(data.date).toLocaleDateString('fr-FR')}</strong>
                            <p style="margin: var(--space-8) 0 0 0; font-size: 14px; color: var(--color-text-secondary);">
                                Sommeil: ${data.sleep}/10 | Courbatures: ${data.soreness}/10 | 
                                Stress: ${data.stress}/10 | Humeur: ${data.mood}/10
                            </p>
                        </div>
                        <div>
                            <div class="status-badge ${status}">${score.toFixed(1)}/10</div>
                        </div>
                    </div>
                `;
                historyList.appendChild(item);
            });
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement de l\'historique:', error);
    }
}

// Changer l'onglet dans le modal de détails
function switchPlayerTab(tabName) {
    // Mettre à jour les onglets
    document.querySelectorAll('#playerDetailModal .nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`#playerDetailModal [data-tab="${tabName}"]`).classList.add('active');
    
    // Mettre à jour le contenu
    document.querySelectorAll('#playerDetailModal .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Supprimer une joueuse
async function deletePlayer() {
    if (!selectedPlayerId) return;
    
    const confirmation = confirm(`Êtes-vous sûr de vouloir supprimer cette joueuse ?\n\nCette action est irréversible et supprimera également toutes ses données (check-ins, RPE, etc.).`);
    
    if (!confirmation) return;
    
    try {
        // Supprimer la joueuse
        await db.collection('players').doc(selectedPlayerId).delete();
        
        // Supprimer ses check-ins
        const checkins = await db.collection('checkins')
            .where('playerId', '==', selectedPlayerId)
            .get();
        
        const batch1 = db.batch();
        checkins.forEach(doc => {
            batch1.delete(doc.ref);
        });
        await batch1.commit();
        
        // Supprimer ses RPE
        const rpeData = await db.collection('rpe')
            .where('playerId', '==', selectedPlayerId)
            .get();
        
        const batch2 = db.batch();
        rpeData.forEach(doc => {
            batch2.delete(doc.ref);
        });
        await batch2.commit();
        
        alert('Joueuse supprimée avec succès !');
        closePlayerDetailModal();
        await loadCoachDashboard();
        
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression. Veuillez réessayer.');
    }
}

// REMPLACER la fonction saveNewPlayer pour ne PAS utiliser Storage
window.saveNewPlayer = async function() {
    const fullName = document.getElementById('playerFullName').value.trim();
    const playerId = document.getElementById('playerId').value.trim();
    const birthdayInput = document.getElementById('playerBirthday').value.trim();
    const club = document.getElementById('playerClub').value.trim();
    const laterality = document.getElementById('playerLaterality').value.trim();
    const position = document.getElementById('playerPosition').value.trim();
    
    if (!fullName || !playerId || !birthdayInput || !laterality || !position) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    // Convertir la date vers le format JJ/MM/AA
    let birthday;
    if (birthdayInput.includes('-')) {
        // Format YYYY-MM-DD (du sélecteur de date)
        const [year, month, day] = birthdayInput.split('-');
        birthday = `${day}/${month}/${year.slice(2)}`;
    } else if (birthdayInput.includes('/')) {
        // Déjà au format JJ/MM/AA
        birthday = birthdayInput;
    } else {
        alert('Format de date invalide');
        return;
    }
    
    try {
        // Vérifier si une joueuse avec cet ID existe déjà pour éviter d'écraser ses données
        const existingPlayer = await db.collection('players').doc(playerId).get();
        if (existingPlayer.exists) {
            alert('Une joueuse avec cet ID existe déjà. Veuillez choisir un autre ID.');
            return;
        }

        // Sauvegarder la joueuse dans Firestore SANS photo
        await db.collection('players').doc(playerId).set({
            name: fullName,
            birthday: birthday,
            club: club || 'SCO Volley Sablé', // Valeur par défaut si vide
            handedness: laterality,
            position: position,
            photoURL: null,  // Pas de photo
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('Joueuse ajoutée avec succès !');
        closeAddPlayerModal();
        await loadCoachDashboard();
        
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la joueuse:', error);
        alert('Erreur lors de l\'ajout. Veuillez réessayer.');
    }
}

// Masquer le bouton de changement de photo dans le modal
document.addEventListener('DOMContentLoaded', () => {
    // Masquer le bouton de photo dans le modal de détails
    const photoButton = document.querySelector('#playerDetailModal button[onclick*="changePhotoInput"]');
    if (photoButton) {
        photoButton.style.display = 'none';
    }
    
    // Masquer l'upload de photo dans le modal d'ajout
    const photoUploadContainer = document.querySelector('.image-upload-container');
    if (photoUploadContainer) {
        photoUploadContainer.style.display = 'none';
    }
});

// Ajouter les styles CSS manquants
const additionalStyles = `
<style>
.status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-weight: bold;
    font-size: 14px;
}

.status-badge.optimal {
    background-color: var(--color-optimal);
    color: white;
}

.status-badge.attention {
    background-color: var(--color-attention);
    color: white;
}

.status-badge.critical {
    background-color: var(--color-critical);
    color: white;
}

.btn-danger {
    background-color: var(--color-critical);
    color: white;
    border: none;
}

.btn-danger:hover {
    background-color: #c0392b;
}
</style>
`;

// Injecter les styles
document.head.insertAdjacentHTML('beforeend', additionalStyles);

console.log('Fonctions additionnelles chargées (SANS Storage)');



// ========================================
// GESTION DU MODAL D'AJOUT DE JOUEUSE
// ========================================

window.openAddPlayerModal = function() {
    document.getElementById('addPlayerModal').classList.add('active');
    document.getElementById('addPlayerForm').reset();
}

window.closeAddPlayerModal = function() {
    document.getElementById('addPlayerModal').classList.remove('active');
}

window.saveNewPlayer = async function() {
    const fullName = document.getElementById('playerFullName').value.trim();
    const playerId = document.getElementById('playerId').value.trim();
    const birthdayInput = document.getElementById('playerBirthday').value.trim();
    const laterality = document.getElementById('playerLaterality').value.trim();
    const position = document.getElementById('playerPosition').value.trim();
    
    if (!fullName || !playerId || !birthdayInput || !laterality || !position) {
        alert('Veuillez remplir tous les champs obligatoires.');
        return;
    }
    
    // Convertir la date vers le format JJ/MM/AA
    let birthday;
    if (birthdayInput.includes('-')) {
        // Format YYYY-MM-DD (du sélecteur de date)
        const [year, month, day] = birthdayInput.split('-');
        birthday = `${day}/${month}/${year.slice(2)}`;
    } else if (birthdayInput.includes('/')) {
        // Déjà au format JJ/MM/AA
        birthday = birthdayInput;
    } else {
        alert('Format de date invalide');
        return;
    }
    
    try {
        // Vérifier si la joueuse existe déjà
        const existingPlayer = await db.collection('players').doc(playerId).get();
        if (existingPlayer.exists) {
            alert('Une joueuse avec cet ID existe déjà. Veuillez choisir un autre ID.');
            return;
        }
        
        // Créer la nouvelle joueuse
        await db.collection('players').doc(playerId).set({
            name: fullName,
            birthday: birthday,
            handedness: laterality,
            position: position,
            photoURL: null,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert('Joueuse ajoutée avec succès !');
        closeAddPlayerModal();
        
        // Recharger le dashboard
        if (typeof loadCoachDashboard === 'function') {
            loadCoachDashboard();
        }
    } catch (error) {
        console.error('Erreur lors de l\'ajout de la joueuse:', error);
        alert('Erreur lors de l\'ajout de la joueuse. Veuillez réessayer.');
    }
}

// Fermer le modal en cliquant en dehors
document.addEventListener('click', (e) => {
    const addPlayerModal = document.getElementById('addPlayerModal');
    if (e.target === addPlayerModal) {
        closeAddPlayerModal();
    }
});

console.log('Fonctions de gestion du modal d\'ajout de joueuse chargées');

