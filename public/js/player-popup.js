/**
 * Player Popup - Gestion du popup détail joueuse
 * Structure complète avec tous les graphiques et historiques
 * + Intégration Cycle Menstruel (Module 4)
 */

console.log('🔵 Début chargement player-popup.js');

// Instances des graphiques du popup
let popupTrendChartInstance = null;
let popupPrepChartInstance = null;
let popupAtlCtlChartInstance = null;

// Joueuse actuellement affichée (exposée globalement pour deletePlayer)
window.currentPopupPlayerId = null;

// Données de cycle de la joueuse courante
let currentPlayerCycleData = null;

/**
 * Ouvre le popup détail d'une joueuse
 */
async function showPlayerDetail(playerId) {
    window.currentPopupPlayerId = playerId;
    
    const modal = document.getElementById('playerDetailModal');
    if (!modal) return;
    
    // S'assurer que le popup s'affiche au premier plan
    modal.style.zIndex = '1100';
    modal.classList.add('active');
    
    try {
        // Récupérer les données de la joueuse
        const playerDoc = await db.collection('players').doc(playerId).get();
        if (!playerDoc.exists) {
            alert('Joueuse non trouvée');
            closePlayerDetailModal();
            return;
        }
        
        const playerData = playerDoc.data();
        
        // En-tête
        updatePopupHeader(playerId, playerData);
        
        // Score actuel
        await updatePopupScore(playerId);
        
        // === NOUVEAU : Charger et afficher les données cycle ===
        await loadAndDisplayCycleData(playerId);
        
        // Volume d'entraînement
        await updatePopupVolume(playerId);
        
        // Tendance 6 semaines (Charge)
        await loadPopupTrendChart(playerId);
        
        // Dernier check-in
        await updatePopupLastCheckin(playerId);
        
        // Graphique Cycle Menstruel
        await loadPopupCycleChart(playerId);
        
        // Historique check-ins
        await updatePopupCheckinsHistory(playerId);
        
        // Historique RPE
        await updatePopupRpeHistory(playerId);
        
        // Graphiques
        await loadPopupPrepChart(playerId);
        await loadPopupAtlCtlChart(playerId);
        
    } catch (error) {
        console.error('Erreur chargement popup:', error);
    }
}

/**
 * Charge et affiche les données de cycle menstruel dans le popup
 * Implémente l'exigence UX/UI de la Page 8 des spécifications
 */
async function loadAndDisplayCycleData(playerId) {
    const today = new Date().toISOString().split('T')[0];
    
    // Initialiser les données cycle
    currentPlayerCycleData = {
        phase: 'Données manquantes',
        dayOfCycle: 0,
        iconType: 'Attention',
        recommendation: null,
        symptoms: null,
        cycleConfig: null
    };
    
    try {
        // 1. Récupérer la configuration du cycle
        const cycleDoc = await db.collection('menstrualCycle').doc(playerId).get();
        if (cycleDoc.exists) {
            currentPlayerCycleData.cycleConfig = cycleDoc.data();
            
            if (currentPlayerCycleData.cycleConfig.cycleStartDate) {
                // UTILISER LA NOUVELLE FONCTION AVEC DONNÉES RÉELLES
                const cycleInfo = await calculateCyclePhaseWithRealData(
                    currentPlayerCycleData.cycleConfig.cycleStartDate,
                    currentPlayerCycleData.cycleConfig.cycleLength || 28,
                    playerId
                );
                currentPlayerCycleData.phase = cycleInfo.phase;
                currentPlayerCycleData.dayOfCycle = cycleInfo.dayOfCycle;
                currentPlayerCycleData.isExtended = cycleInfo.isExtended;
            }
        }
        
        // 2. Récupérer le check-in du jour pour les symptômes
        const checkinSnapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .where('date', '==', today)
            .limit(1)
            .get();
        
        let baseScore = 5;
        
        if (!checkinSnapshot.empty) {
            const checkin = checkinSnapshot.docs[0].data();
            
            // Utiliser les données de cycle du check-in si disponibles
            if (checkin.cyclePhase) {
                currentPlayerCycleData.phase = checkin.cyclePhase;
                currentPlayerCycleData.dayOfCycle = checkin.cycleDay || checkin.dayOfCycle || currentPlayerCycleData.dayOfCycle;
            }
            
            // Récupérer les symptômes
            if (checkin.symptoms) {
                currentPlayerCycleData.symptoms = checkin.symptoms;
            }
            
            // Calculer le score de base
            const sleep = checkin.sleepQuality || checkin.sleep || 5;
            const soreness = checkin.soreness || 5;
            const stress = checkin.stress || 5;
            const mood = checkin.mood || 5;
            const energy = checkin.energy !== undefined ? checkin.energy : null;
            
            if (energy !== null) {
                baseScore = Math.round((sleep + (10 - soreness) + (10 - stress) + mood + energy) / 5);
            } else {
                baseScore = Math.round((sleep + (10 - soreness) + (10 - stress) + mood) / 4);
            }
        }
        
        // 3. Récupérer les symptômes depuis dailySymptoms si pas dans le check-in
        if (!currentPlayerCycleData.symptoms) {
            const symptomsSnapshot = await db.collection('dailySymptoms')
                .where('playerId', '==', playerId)
                .where('date', '==', today)
                .limit(1)
                .get();
            
            if (!symptomsSnapshot.empty) {
                const symptomsData = symptomsSnapshot.docs[0].data();
                currentPlayerCycleData.symptoms = symptomsData.symptoms;
                
                // Mettre à jour la phase si disponible
                if (symptomsData.currentPhase) {
                    currentPlayerCycleData.phase = symptomsData.currentPhase;
                }
                if (symptomsData.dayOfCycle) {
                    currentPlayerCycleData.dayOfCycle = symptomsData.dayOfCycle;
                }
            }
        }
        
        // 4. Calculer le score ajusté
        const { adjustedScore } = applyCycleAdjustments(baseScore, currentPlayerCycleData.phase);
        
        // 5. Générer les alertes
        let cycleAlerts = [];
        if (currentPlayerCycleData.symptoms) {
            cycleAlerts = generateCycleAlerts(currentPlayerCycleData.symptoms);
        }
        
        // 6. Obtenir la recommandation détaillée
        currentPlayerCycleData.recommendation = getDetailedCycleRecommendation(
            currentPlayerCycleData.phase,
            cycleAlerts,
            adjustedScore
        );
        currentPlayerCycleData.iconType = currentPlayerCycleData.recommendation.iconType;
        currentPlayerCycleData.adjustedScore = adjustedScore;
        currentPlayerCycleData.baseScore = baseScore;
        
        // 7. Afficher dans le popup
        displayCycleSection(currentPlayerCycleData);
        
    } catch (error) {
        console.error('Erreur chargement données cycle:', error);
        displayCycleSection(currentPlayerCycleData); // Afficher quand même avec données par défaut
    }
}

/**
 * Affiche la section cycle menstruel dans le popup
 */
function displayCycleSection(cycleData) {
    const cycleSection = document.getElementById('popupCycleSection');
    if (!cycleSection) {
        console.warn('Conteneur popupCycleSection non trouvé');
        return;
    }
    
    // Générer le HTML de la recommandation
    if (cycleData.phase === 'Données manquantes' || cycleData.dayOfCycle === 0) {
        cycleSection.innerHTML = `
            <div style="background: #f8fafc; border-radius: 12px; padding: 16px; text-align: center;">
                <div style="font-size: 32px; margin-bottom: 8px;">❓</div>
                <div style="font-weight: 600; color: #6b7280; margin-bottom: 8px;">Cycle non configuré</div>
                <div style="font-size: 13px; color: #9ca3af;">
                    La joueuse n'a pas encore configuré son suivi de cycle menstruel.
                </div>
                <button onclick="promptConfigureCycle('${window.currentPopupPlayerId}')" 
                        style="margin-top: 12px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 13px;">
                    Configurer le cycle
                </button>
            </div>
        `;
        cycleSection.style.display = 'block';
    } else {
        // Afficher la recommandation complète
        cycleSection.innerHTML = generateRecommendationHTML(cycleData.recommendation, cycleData.dayOfCycle);
        
        // Ajouter le score ajusté si différent du score de base
        if (cycleData.baseScore !== undefined && cycleData.adjustedScore !== undefined) {
            const adjustmentDiff = cycleData.adjustedScore - cycleData.baseScore;
            if (adjustmentDiff !== 0) {
                const adjustmentHTML = `
                    <div style="margin-top: 12px; padding: 8px 12px; background: #f0f9ff; border-radius: 8px; display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-size: 12px; color: #1e40af;">📊 Score ajusté selon la phase</span>
                        <span style="font-size: 13px; font-weight: 600; color: #1e40af;">
                            ${cycleData.baseScore}/10 ${adjustmentDiff >= 0 ? '+' : ''}${adjustmentDiff.toFixed(1)} = <strong>${cycleData.adjustedScore.toFixed(1)}/10</strong>
                        </span>
                    </div>
                `;
                cycleSection.insertAdjacentHTML('beforeend', adjustmentHTML);
            }
        }
        cycleSection.style.display = 'block';
    }
}

/**
 * Ouvre le formulaire de configuration du cycle pour une joueuse
 * (à implémenter selon les besoins)
 */
window.promptConfigureCycle = function(playerId) {
    // TODO: Implémenter le modal de configuration du cycle
    alert(`Configuration du cycle pour ${playerId}\n\nCette fonctionnalité sera disponible dans une prochaine mise à jour.\n\nLa joueuse peut configurer son cycle depuis son interface personnelle.`);
}

/**
 * Ferme le popup
 */
function closePlayerDetailModal() {
    const modal = document.getElementById('playerDetailModal');
    if (modal) modal.classList.remove('active');
    
    // Détruire les graphiques
    if (popupTrendChartInstance) { popupTrendChartInstance.destroy(); popupTrendChartInstance = null; }
    if (popupPrepChartInstance) { popupPrepChartInstance.destroy(); popupPrepChartInstance = null; }
    if (popupAtlCtlChartInstance) { popupAtlCtlChartInstance.destroy(); popupAtlCtlChartInstance = null; }
    
    window.currentPopupPlayerId = null;
}

/**
 * Met à jour l'en-tête du popup
 */
function updatePopupHeader(playerId, playerData) {
    // Initiales
    const initials = playerData.name ? playerData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '--';
    document.getElementById('playerDetailInitials').textContent = initials;
    
    // Photo
    const photoEl = document.getElementById('playerDetailPhoto');
    const initialsEl = document.getElementById('playerDetailInitials');
    
    if (playerData.photoURL) {
        photoEl.src = playerData.photoURL;
        photoEl.style.display = 'block';
        initialsEl.style.display = 'none';
        
        // Gérer l'erreur si l'image ne charge pas
        photoEl.onerror = function() {
            this.style.display = 'none';
            initialsEl.style.display = 'flex';
        };
    } else {
        photoEl.style.display = 'none';
        initialsEl.style.display = 'flex';
    }
    
    // Nom et date de naissance
    document.getElementById('playerDetailFullName').textContent = playerData.name || playerId;
    
    let birthText = '';
    if (playerData.birthday) {
        // Le format stocké est JJ/MM/AA (ex: "16/01/10")
        // On le convertit en format lisible : "Née le 16/01/2010"
        const parts = playerData.birthday.split('/');
        if (parts.length === 3) {
            const day = parts[0];
            const month = parts[1];
            let year = parts[2];
            // Convertir l'année 2 chiffres en 4 chiffres (09 -> 2009, 10 -> 2010)
            year = year.length === 2 ? '20' + year : year;
            birthText = `Née le ${day}/${month}/${year}`;
        } else {
            birthText = `Née le ${playerData.birthday}`;
        }
    }
    document.getElementById('playerDetailBirthday').textContent = birthText;
}

/**
 * Met à jour le score actuel et le badge
 */
async function updatePopupScore(playerId) {
    const today = new Date().toISOString().split('T')[0];
    
    const checkinSnapshot = await db.collection('checkins')
        .where('playerId', '==', playerId)
        .where('date', '==', today)
        .limit(1)
        .get();
    
    let score = 0;
    let status = 'Critique';
    let statusColor = '#fee2e2';
    let textColor = '#991b1b';
    
    if (!checkinSnapshot.empty) {
        const checkin = checkinSnapshot.docs[0].data();
        const sleep = checkin.sleepQuality || checkin.sleep || 5;
        const soreness = checkin.soreness || 5;
        const stress = checkin.stress || 5;
        const mood = checkin.mood || 5;
        const energy = checkin.energy !== undefined ? checkin.energy : null;
        
        // Calcul avec énergie si disponible
        if (energy !== null) {
            score = Math.round((sleep + (10 - soreness) + (10 - stress) + mood + energy) / 5);
        } else {
            score = Math.round((sleep + (10 - soreness) + (10 - stress) + mood) / 4);
        }
        
        if (score >= 7) {
            status = 'Optimal';
            statusColor = '#d1fae5';
            textColor = '#065f46';
        } else if (score >= 5) {
            status = 'Attention';
            statusColor = '#fef3c7';
            textColor = '#92400e';
        }
    }
    
    // Score big
    const scoreEl = document.getElementById('playerDetailScoreBig');
    scoreEl.textContent = `${score}/10`;
    scoreEl.style.color = score >= 7 ? '#10b981' : (score >= 5 ? '#f59e0b' : '#ef4444');
    
    // Badge
    const badgeEl = document.getElementById('playerDetailBadge');
    badgeEl.textContent = status;
    badgeEl.style.background = statusColor;
    badgeEl.style.color = textColor;
}

/**
 * Met à jour le volume d'entraînement
 */
async function updatePopupVolume(playerId) {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Début de la semaine (lundi)
    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    const weekStart = startOfWeek.toISOString().split('T')[0];
    
    // Début du mois
    const monthStart = `${currentYear}-${(today.getMonth() + 1).toString().padStart(2, '0')}-01`;
    
    // Début de l'année
    const yearStart = `${currentYear}-01-01`;
    
    // Récupérer tous les RPE de l'année
    const rpeSnapshot = await db.collection('rpe')
        .where('playerId', '==', playerId)
        .where('date', '>=', yearStart)
        .get();
    
    let weeklyMinutes = 0;
    let monthlyMinutes = 0;
    let yearlyMinutes = 0;
    
    rpeSnapshot.forEach(doc => {
        const data = doc.data();
        const duration = data.duration || 0;
        
        yearlyMinutes += duration;
        
        if (data.date >= monthStart) {
            monthlyMinutes += duration;
        }
        if (data.date >= weekStart) {
            weeklyMinutes += duration;
        }
    });
    
    document.getElementById('detailWeeklyHours').textContent = (weeklyMinutes / 60).toFixed(1) + 'h';
    document.getElementById('detailMonthlyHours').textContent = (monthlyMinutes / 60).toFixed(1) + 'h';
    document.getElementById('detailYearlyHours').textContent = (yearlyMinutes / 60).toFixed(1) + 'h';
}

/**
 * Charge le graphique de tendance (Charge sur 6 semaines)
 */
async function loadPopupTrendChart(playerId) {
    const canvas = document.getElementById('popupTrendChart');
    if (!canvas) return;
    
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();
    if (popupTrendChartInstance) { popupTrendChartInstance.destroy(); popupTrendChartInstance = null; }
    
    try {
        const today = new Date();
        const weeks = [];
        
        // Générer les 6 dernières semaines
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - (i * 7));
            
            // Trouver le lundi de cette semaine
            const monday = new Date(d);
            const dayOfWeek = monday.getDay();
            const diff = monday.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            monday.setDate(diff);
            
            const sunday = new Date(monday);
            sunday.setDate(sunday.getDate() + 6);
            
            const weekNum = getWeekNumberPopup(monday);
            
            weeks.push({
                label: `S${weekNum}`,
                start: monday.toISOString().split('T')[0],
                end: sunday.toISOString().split('T')[0]
            });
        }
        
        // Récupérer les RPE
        const startDate = weeks[0].start;
        const rpeSnapshot = await db.collection('rpe')
            .where('playerId', '==', playerId)
            .where('date', '>=', startDate)
            .get();
        
        // Calculer la charge par semaine
        const chargeByWeek = {};
        weeks.forEach(w => chargeByWeek[w.label] = 0);
        
        rpeSnapshot.forEach(doc => {
            const data = doc.data();
            const rpeVal = data.rpe || data.rpeValue || 5;
            const charge = rpeVal * (data.duration || 0);
            
            // Trouver la semaine correspondante
            weeks.forEach(w => {
                if (data.date >= w.start && data.date <= w.end) {
                    chargeByWeek[w.label] += charge;
                }
            });
        });
        
        const labels = weeks.map(w => w.label);
        const data = labels.map(l => Math.round(chargeByWeek[l]));
        const avgCharge = data.reduce((a, b) => a + b, 0) / data.length;
        
        const ctx = canvas.getContext('2d');
        popupTrendChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Charge hebdo',
                        data: data,
                        backgroundColor: '#667eea',
                        borderRadius: 6
                    },
                    {
                        label: `Moyenne (${Math.round(avgCharge)})`,
                        data: labels.map(() => avgCharge),
                        type: 'line',
                        borderColor: '#f59e0b',
                        borderWidth: 3,
                        borderDash: [5, 5],
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Charge (UA)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    } catch (error) {
        console.error('Erreur graphique tendance:', error);
    }
}

/**
 * Met à jour le dernier check-in
 */
async function updatePopupLastCheckin(playerId) {
    const checkinsSnapshot = await db.collection('checkins')
        .where('playerId', '==', playerId)
        .orderBy('date', 'desc')
        .limit(1)
        .get();
    
    if (checkinsSnapshot.empty) {
        document.getElementById('lastCheckinDate').textContent = 'Aucun check-in';
        document.getElementById('lastCheckinSleep').textContent = '--/10';
        document.getElementById('lastCheckinSoreness').textContent = '--/10';
        document.getElementById('lastCheckinStress').textContent = '--/10';
        document.getElementById('lastCheckinMood').textContent = '--/10';
        document.getElementById('lastCheckinScore').textContent = '--%';
        return;
    }
    
    const checkin = checkinsSnapshot.docs[0].data();
    const date = new Date(checkin.date);
    
    document.getElementById('lastCheckinDate').textContent = date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    const sleep = checkin.sleepQuality || checkin.sleep || 5;
    const soreness = checkin.soreness || 5;
    const stress = checkin.stress || 5;
    const mood = checkin.mood || 5;
    const energy = checkin.energy !== undefined ? checkin.energy : null;
    
    document.getElementById('lastCheckinSleep').textContent = `${sleep}/10`;
    document.getElementById('lastCheckinSoreness').textContent = `${soreness}/10`;
    document.getElementById('lastCheckinStress').textContent = `${stress}/10`;
    document.getElementById('lastCheckinMood').textContent = `${mood}/10`;
    
    // Afficher l'énergie si disponible
    const energyEl = document.getElementById('lastCheckinEnergy');
    if (energyEl) {
        if (energy !== null) {
            energyEl.textContent = `${energy}/10`;
            energyEl.parentElement.style.display = '';
        } else {
            energyEl.parentElement.style.display = 'none';
        }
    }
    
    // Score de préparation (avec énergie si disponible)
    let score;
    if (energy !== null) {
        score = Math.round((sleep + (11 - soreness) + (11 - stress) + mood + energy) / 5 * 10);
    } else {
        score = Math.round((sleep + (11 - soreness) + (11 - stress) + mood) / 4 * 10);
    }
    document.getElementById('lastCheckinScore').textContent = `${score}%`;
    
    // Commentaire
    const commentEl = document.getElementById('lastCheckinComment');
    if (checkin.comment) {
        commentEl.textContent = `💬 "${checkin.comment}"`;
        commentEl.style.display = 'block';
    } else {
        commentEl.style.display = 'none';
    }
}

/**
 * Charge le graphique du cycle menstruel dans le popup
 * Code complet copié depuis player-dashboard-charts.js
 * @param {string} playerId - ID de la joueuse
 * @param {number} cycleOffset - Décalage du cycle (0 = actuel, -1 = précédent, etc.)
 */
let popupCycleChartInstance = null;
let currentPopupCycleOffset = 0;

async function loadPopupCycleChart(playerId, cycleOffset = 0) {
    const canvas = document.getElementById('popupCycleChart');
    const emptyDiv = document.getElementById('popupCycleChartEmpty');

    if (!canvas) {
        console.log('Popup: Canvas popupCycleChart non trouvé');
        return;
    }

    // Stocker l'offset actuel
    currentPopupCycleOffset = cycleOffset;

    // Mettre à jour les boutons de navigation
    updatePopupCycleNavButtons(cycleOffset);

    try {
        // Récupérer les données du cycle
        const cycleDoc = await db.collection('menstrualCycle').doc(playerId).get();
        const cycleData = cycleDoc.data();

        if (!cycleData || !cycleData.cycleStartDate) {
            console.log('Popup: Pas de données de cycle disponibles');
            canvas.style.display = 'none';
            emptyDiv.style.display = 'block';
            return;
        }

        // Récupérer tous les checkins avec données de cycle (les 100 plus RÉCENTS, comme le dashboard)
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

        console.log(`Popup: ${checkinsSnapshot.docs.length} check-ins, ${rpeSnapshot.docs.length} RPE, cycleOffset=${cycleOffset}`);

        const cycleLength = cycleData.cycleLength || 28;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculer le J1 du cycle actuel
        let lastJ1 = new Date(cycleData.cycleStartDate);
        lastJ1.setHours(0, 0, 0, 0);

        // Appliquer l'offset du cycle (pour C-1, C-2, etc.)
        lastJ1.setDate(lastJ1.getDate() + (cycleOffset * cycleLength));

        // Calculer le jour actuel du cycle (peut dépasser cycleLength)
        const daysSinceJ1 = Math.floor((today - lastJ1) / (1000 * 60 * 60 * 24));
        const actualTodayDayOfCycle = daysSinceJ1 + 1;
        const isExtendedCycle = cycleOffset === 0 && actualTodayDayOfCycle > cycleLength;

        // Pour les cycles prolongés (cycle actuel uniquement), étendre la durée affichée
        // Pour les cycles passés, afficher le cycle complet théorique
        const displayLength = (cycleOffset < 0) ? cycleLength : (isExtendedCycle ? actualTodayDayOfCycle + 3 : cycleLength);

        // Dates clés
        const cycleEndDate = new Date(lastJ1);
        cycleEndDate.setDate(cycleEndDate.getDate() + cycleLength - 1);

        const ovulationDay = Math.round(cycleLength * 0.5);
        const ovulationDate = new Date(lastJ1);
        ovulationDate.setDate(ovulationDate.getDate() + ovulationDay - 1);

        console.log(`Popup: Cycle J1=${lastJ1.toISOString().split('T')[0]}, Aujourd'hui=J${actualTodayDayOfCycle}, Prolongé=${isExtendedCycle}`);

        // Créer les données pour le cycle complet (y compris prolongé)
        const data = [];
        const menstrualEnd = Math.round(cycleLength * 0.18);
        const ovulationStart = Math.round(cycleLength * 0.42);
        const ovulationEnd = Math.round(cycleLength * 0.58);

        // Pour les cycles passés, "aujourd'hui" n'est pas dans le cycle affiché
        // Pour le cycle actuel, montrer "today" seulement si on est dans le cycle
        let todayDayOfCycle = null;
        if (cycleOffset === 0 && actualTodayDayOfCycle > 0) {
            todayDayOfCycle = actualTodayDayOfCycle;
        }

        // Boucle sur TOUT le cycle (y compris les jours prolongés)
        for (let i = 0; i < displayLength; i++) {
            const date = new Date(lastJ1);
            date.setDate(date.getDate() + i);

            const dayOfCycle = i + 1;
            const dateStr = date.toISOString().split('T')[0];

            // Déterminer la phase
            let phase = 'follicular';
            if (dayOfCycle > cycleLength) {
                phase = 'extended'; // Cycle prolongé
            } else if (dayOfCycle <= menstrualEnd) {
                phase = 'menstrual';
            } else if (dayOfCycle >= ovulationStart && dayOfCycle <= ovulationEnd) {
                phase = 'ovulation';
            } else if (dayOfCycle > ovulationEnd) {
                phase = 'luteal';
            }
            
            // Récupérer les données du check-in pour ce jour
            const dayCheckins = checkinsSnapshot.docs.filter(doc => doc.data().date === dateStr);
            
            let symptomScore = null;
            let energyScore = null;
            let performanceScore = null;
            
            if (dayCheckins.length > 0) {
                const checkinData = dayCheckins[0].data();
                
                // Symptômes menstruels (0-10)
                const symptoms = checkinData.symptoms || {};
                const symptomValues = Object.values(symptoms).filter(v => typeof v === 'number' && v > 0);
                
                // SPM symptoms (chaque symptôme SPM compte pour 5/10)
                const spmSymptoms = checkinData.spmSymptoms || [];
                const spmCount = spmSymptoms.length;
                
                if (symptomValues.length > 0 || spmCount > 0) {
                    let totalSymptoms = symptomValues;
                    
                    if (spmCount > 0) {
                        const spmValues = Array(spmCount).fill(5);
                        totalSymptoms = [...symptomValues, ...spmValues];
                    }
                    
                    symptomScore = totalSymptoms.reduce((a, b) => a + b, 0) / totalSymptoms.length;
                }
                
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
            
            // Calcul des hormones
            let estrogen = 2;
            if (dayOfCycle <= menstrualEnd) {
                estrogen = 1 + (dayOfCycle / menstrualEnd) * 2;
            } else if (dayOfCycle < ovulationDay) {
                estrogen = 3 + ((dayOfCycle - menstrualEnd) / (ovulationDay - menstrualEnd)) * 5;
            } else if (dayOfCycle === ovulationDay) {
                estrogen = 8;
            } else if (dayOfCycle <= ovulationEnd) {
                estrogen = 8 - ((dayOfCycle - ovulationDay) / (ovulationEnd - ovulationDay)) * 2;
            } else {
                estrogen = 6 + ((dayOfCycle - ovulationEnd) / (cycleLength - ovulationEnd)) * 1;
            }
            
            let progesterone = 1;
            if (dayOfCycle <= ovulationEnd) {
                progesterone = 0.5 + (dayOfCycle / ovulationEnd) * 0.5;
            } else {
                const luteralDays = cycleLength - ovulationEnd;
                const luteralProgress = (dayOfCycle - ovulationEnd) / luteralDays;
                progesterone = 1 + luteralProgress * 6;
                if (dayOfCycle > cycleLength - 3) {
                    progesterone = Math.max(0.5, progesterone - ((dayOfCycle - (cycleLength - 3)) / 3) * 6);
                }
            }
            
            data.push({
                x: dayOfCycle,
                symptoms: symptomScore,
                energy: energyScore,
                performance: performanceScore,
                estrogen: estrogen,
                progesterone: progesterone,
                phase: phase,
                date: dateStr
            });
        }
        
        // Interpolation avancée pour les gaps (même logique que dashboard joueuse)
        function interpolateEnergyGaps(dataArray, maxDay) {
            // Trouver tous les jours avec énergie > 0, jusqu'à maxDay (aujourd'hui)
            const daysWithEnergy = dataArray.filter(d => d.energy > 0 && d.x <= maxDay);

            if (daysWithEnergy.length >= 2) {
                // Pour chaque gap de 1-2 jours, interpoler linéairement
                for (let i = 0; i < daysWithEnergy.length - 1; i++) {
                    const current = daysWithEnergy[i];
                    const next = daysWithEnergy[i + 1];
                    const dayGap = next.x - current.x;

                    // Si gap de 1-2 jours seulement, interpoler
                    if (dayGap > 1 && dayGap <= 3) {
                        const energyDiff = next.energy - current.energy;
                        const daysDiff = dayGap;

                        for (let d = current.x + 1; d < next.x; d++) {
                            if (d > maxDay) break;
                            const progress = (d - current.x) / daysDiff;
                            const interpolatedEnergy = current.energy + (energyDiff * progress);
                            const dayIndex = dataArray.findIndex(item => item.x === d);
                            if (dayIndex !== -1) {
                                dataArray[dayIndex].energy = Math.round(interpolatedEnergy * 10) / 10;
                            }
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

                    if (dayGap > 1 && dayGap <= 3) {
                        const performanceDiff = next.performance - current.performance;
                        const daysDiff = dayGap;

                        for (let d = current.x + 1; d < next.x; d++) {
                            if (d > maxDay) break;
                            const progress = (d - current.x) / daysDiff;
                            const interpolatedPerformance = current.performance + (performanceDiff * progress);
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

        const interpolatedData = interpolateEnergyGaps(data, todayDayOfCycle || displayLength);

        // Mettre à null les énergies après aujourd'hui (pour ne pas les afficher)
        if (todayDayOfCycle) {
            interpolatedData.forEach(d => {
                if (d.x > todayDayOfCycle) {
                    d.energy = null;
                    d.symptoms = null;
                    d.performance = null;
                }
            });
        }

        // Logs de debug (même que dashboard)
        const energyWithData = interpolatedData.filter(d => d.energy !== null && d.energy > 0);
        const performanceWithData = interpolatedData.filter(d => d.performance !== null && d.performance > 0);
        console.log(`Popup: ${energyWithData.length} jours avec énergie, ${performanceWithData.length} jours avec performance`);
        
        // Datasets
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
            // Énergie
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
            // Symptômes (même style que dashboard)
            {
                label: 'Symptômes (0-10)',
                data: interpolatedData.map(d => ({ x: d.x, y: d.symptoms })),
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
        if (popupCycleChartInstance) {
            popupCycleChartInstance.destroy();
        }
        
        // Enregistrer le plugin pour dessiner la ligne "Aujourd'hui"
        Chart.register({
            id: 'todayLinePopup',
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
        
        // Créer le graphique
        const ctx = canvas.getContext('2d');
        popupCycleChartInstance = new Chart(ctx, {
            type: 'line',
            data: { datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: {
                    todayLine: {
                        todayDayOfCycle: todayDayOfCycle
                    },
                    legend: { display: true, position: 'top' },
                    tooltip: {
                        callbacks: {
                            title: (context) => {
                                const dayIndex = Math.round(context[0].raw.x) - 1;
                                const dayData = interpolatedData[dayIndex];
                                return `J${context[0].raw.x} - ${dayData.date}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        min: 1,
                        max: displayLength,
                        ticks: {
                            stepSize: Math.max(1, Math.floor(displayLength / 10)),
                            callback: (value) => 'J' + Math.round(value)
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
        
        // Ajouter les annotations (avec support cycle prolongé)
        const annotationDiv = document.getElementById('popupCycleAnnotations');
        if (annotationDiv) {
            const cycleStatusHtml = isExtendedCycle
                ? `<div style="margin-top: 12px; padding: 10px 12px; background-color: rgba(249, 115, 22, 0.15); border-left: 4px solid #f97316; font-size: 13px;">
                    <strong>⚠️ Cycle prolongé</strong> - Jour ${todayDayOfCycle} sur ${cycleLength} théoriques<br>
                    <span style="font-size: 11px; color: #9a3412;">Pas de règles déclarées depuis ${todayDayOfCycle} jours</span>
                   </div>`
                : (todayDayOfCycle ? `<div style="margin-top: 12px; padding: 8px 12px; background-color: rgba(34, 197, 94, 0.1); border-left: 3px solid #22c55e; font-weight: 600; font-size: 13px;">📍 Aujourd'hui: Jour ${todayDayOfCycle} sur ${cycleLength}</div>` : '');

            annotationDiv.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; border-left: 4px solid ${isExtendedCycle ? '#f97316' : '#667eea'};">
                    <div><strong>📅 Début du cycle</strong><br>${lastJ1.toLocaleDateString('fr-FR')}</div>
                    <div><strong>🔴 Ovulation</strong><br>${ovulationDate.toLocaleDateString('fr-FR')}${isExtendedCycle ? ' (théo.)' : ''}</div>
                    <div><strong>📆 Fin théorique</strong><br>${cycleEndDate.toLocaleDateString('fr-FR')}</div>
                </div>
                ${cycleStatusHtml}
            `;
        }
        
        canvas.style.display = 'block';
        emptyDiv.style.display = 'none';
        console.log('Popup: Graphique du cycle créé');
        
    } catch (error) {
        console.error('Popup: Erreur graphique cycle:', error);
        canvas.style.display = 'none';
        emptyDiv.style.display = 'block';
    }
}

/**
 * Met à jour l'historique des check-ins (7 derniers jours)
 */
async function updatePopupCheckinsHistory(playerId) {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    
    const checkinsSnapshot = await db.collection('checkins')
        .where('playerId', '==', playerId)
        .where('date', '>=', startDate)
        .orderBy('date', 'desc')
        .get();
    
    const tbody = document.getElementById('checkinsHistoryTable');
    
    if (checkinsSnapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #9ca3af; padding: 20px;">Aucun check-in</td></tr>';
        return;
    }
    
    // Déduplication par date (garder le plus récent pour chaque date)
    const checkinsMap = new Map();
    checkinsSnapshot.forEach(doc => {
        const data = doc.data();
        const date = data.date;
        
        if (!checkinsMap.has(date)) {
            checkinsMap.set(date, data);
        } else {
            // Garder le plus récent (basé sur timestamp si disponible)
            const existing = checkinsMap.get(date);
            const existingTime = existing.timestamp?.seconds || 0;
            const currentTime = data.timestamp?.seconds || 0;
            if (currentTime > existingTime) {
                checkinsMap.set(date, data);
            }
        }
    });
    
    // Fonction pour obtenir la couleur du texte selon la valeur
    const getColorStyle = (value, inverse = false) => {
        if (value === null || value === undefined) return '';
        let color;
        if (inverse) {
            // Pour courbatures et stress (bas = bon)
            if (value <= 3) color = '#10b981'; // vert
            else if (value <= 6) color = '#f59e0b'; // orange
            else color = '#ef4444'; // rouge
        } else {
            // Pour sommeil, humeur, énergie (haut = bon)
            if (value >= 7) color = '#10b981'; // vert
            else if (value >= 4) color = '#f59e0b'; // orange
            else color = '#ef4444'; // rouge
        }
        return `color: ${color}; font-weight: 600;`;
    };
    
    let html = '';
    checkinsMap.forEach((data) => {
        const date = new Date(data.date);
        const dateStr = date.toLocaleDateString('fr-FR');
        
        const sleep = data.sleepQuality || data.sleep || 5;
        const soreness = data.soreness || 5;
        const stress = data.stress || 5;
        const mood = data.mood || 5;
        const energy = data.energy !== undefined ? data.energy : null;
        
        // Calcul du score avec énergie si disponible
        let score;
        if (energy !== null) {
            score = Math.round((sleep + (11 - soreness) + (11 - stress) + mood + energy) / 5 * 10);
        } else {
            score = Math.round((sleep + (11 - soreness) + (11 - stress) + mood) / 4 * 10);
        }
        
        let scoreClass = 'color: #ef4444;';
        if (score >= 80) scoreClass = 'color: #10b981;';
        else if (score >= 60) scoreClass = 'color: #f59e0b;';
        
        // Récupérer les symptômes menstruels > 4
        const symptoms = data.symptoms || {};
        console.log(`Popup ${dateStr}: symptoms brut =`, symptoms);
        
        const symptomLabels = {
            cramps: { label: 'Crampes', icon: '🩸' },
            headache: { label: 'Maux de tête', icon: '🤕' },
            fatigue: { label: 'Fatigue', icon: '😴' },
            moodSwings: { label: 'Humeur', icon: '😢' },
            bloating: { label: 'Ballonnements', icon: '🎈' },
            backPain: { label: 'Dos', icon: '🔙' },
            breastTenderness: { label: 'Sensibilité', icon: '⚠️' }
        };
        
        const highSymptoms = [];
        Object.entries(symptoms).forEach(([key, value]) => {
            if (value > 4 && symptomLabels[key]) {
                highSymptoms.push(`${symptomLabels[key].icon} ${symptomLabels[key].label}: ${value}/10`);
            }
        });
        
        // SPM (symptômes pré-menstruels)
        const spmSymptoms = data.spmSymptoms || [];
        const spmLabels = {
            spmCramps: 'Crampes SPM',
            spmIrritability: 'Irritabilité',
            spmBloating: 'Ballonnements SPM',
            spmHeadache: 'Maux de tête SPM',
            spmFatigue: 'Fatigue SPM'
        };
        
        const highSpmSymptoms = [];
        if (Array.isArray(spmSymptoms)) {
            spmSymptoms.forEach(spm => {
                if (spmLabels[spm]) {
                    highSpmSymptoms.push(`🔸 ${spmLabels[spm]}`);
                }
            });
        }
        
        // Log pour debug
        if (highSymptoms.length > 0 || highSpmSymptoms.length > 0) {
            console.log(`Popup: ${dateStr} - Symptômes: ${highSymptoms.length}, SPM: ${highSpmSymptoms.length}`);
        }
        
        const symptomsHtml = (highSymptoms.length > 0 || highSpmSymptoms.length > 0) ? `
            <tr>
                <td colspan="7" style="padding: 8px 16px; background: #fef2f2; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #991b1b;">
                    ${highSymptoms.length > 0 ? `<div style="margin-bottom: 4px;"><strong>Symptômes :</strong> ${highSymptoms.join(' • ')}</div>` : ''}
                    ${highSpmSymptoms.length > 0 ? `<div><strong>SPM :</strong> ${highSpmSymptoms.join(' • ')}</div>` : ''}
                </td>
            </tr>
        ` : '';
        
        html += `
            <tr>
                <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid #f3f4f6'};">${dateStr}</td>
                <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid #f3f4f6'}; ${getColorStyle(sleep)}">${sleep}/10</td>
                <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid #f3f4f6'}; ${getColorStyle(soreness, true)}">${soreness}/10</td>
                <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid #f3f4f6'}; ${getColorStyle(stress, true)}">${stress}/10</td>
                <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid #f3f4f6'}; ${getColorStyle(mood)}">${mood}/10</td>
                <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid #f3f4f6'}; ${energy !== null ? getColorStyle(energy) : ''}">${energy !== null ? energy + '/10' : '--'}</td>
                <td style="padding: 12px 8px; border-bottom: ${symptomsHtml ? '0' : '1px solid #f3f4f6'}; font-weight: 600; ${scoreClass}">${score}%</td>
            </tr>
            ${symptomsHtml}
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * Met à jour l'historique des sessions RPE (7 dernières)
 */
async function updatePopupRpeHistory(playerId) {
    const rpeSnapshot = await db.collection('rpe')
        .where('playerId', '==', playerId)
        .orderBy('date', 'desc')
        .limit(7)
        .get();
    
    const tbody = document.getElementById('rpeHistoryTable');
    
    if (rpeSnapshot.empty) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9ca3af; padding: 20px;">Aucune session RPE</td></tr>';
        return;
    }
    
    let html = '';
    rpeSnapshot.forEach(doc => {
        const data = doc.data();
        const date = new Date(data.date);
        const dateStr = date.toLocaleDateString('fr-FR');
        
        const rpeVal = data.rpe || data.rpeValue || 5;
        const duration = data.duration || 0;
        const charge = rpeVal * duration;
        
        html += `
            <tr>
                <td style="padding: 12px 8px; border-bottom: 1px solid #f3f4f6;">${dateStr}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #f3f4f6;">${data.sessionType || 'Non spécifié'}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #f3f4f6;">${rpeVal}/10</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #f3f4f6;">${duration}</td>
                <td style="padding: 12px 8px; border-bottom: 1px solid #f3f4f6; font-weight: 600;">${charge}</td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

/**
 * Charge le graphique d'évolution préparation (7 jours)
 */
async function loadPopupPrepChart(playerId) {
    const canvas = document.getElementById('popupPrepChart');
    if (!canvas) return;
    
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();
    if (popupPrepChartInstance) { popupPrepChartInstance.destroy(); popupPrepChartInstance = null; }
    
    try {
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const startDate = sevenDaysAgo.toISOString().split('T')[0];
        
        const checkinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .where('date', '>=', startDate)
            .get();
        
        const checkinsMap = {};
        checkinsSnapshot.forEach(doc => {
            const data = doc.data();
            checkinsMap[data.date] = data;
        });
        
        const labels = [];
        const scores = [];
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
            
            labels.push(label);
            
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
        popupPrepChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Préparation',
                    data: scores,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { min: 0, max: 100, ticks: { callback: v => v + '%' } },
                    x: { grid: { display: false } }
                }
            }
        });
    } catch (error) {
        console.error('Erreur graphique préparation:', error);
    }
}

/**
 * Charge le graphique ATL/CTL (28 jours)
 */
async function loadPopupAtlCtlChart(playerId) {
    const canvas = document.getElementById('popupAtlCtlChart');
    if (!canvas) return;
    
    const existingChart = Chart.getChart(canvas);
    if (existingChart) existingChart.destroy();
    if (popupAtlCtlChartInstance) { popupAtlCtlChartInstance.destroy(); popupAtlCtlChartInstance = null; }
    
    try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];
        
        const rpeSnapshot = await db.collection('rpe')
            .where('playerId', '==', playerId)
            .where('date', '>=', startDate)
            .get();
        
        // Calculer la charge par jour
        const chargeByDay = {};
        rpeSnapshot.forEach(doc => {
            const data = doc.data();
            const rpeVal = data.rpe || data.rpeValue || 5;
            const charge = rpeVal * (data.duration || 0);
            
            if (!chargeByDay[data.date]) chargeByDay[data.date] = 0;
            chargeByDay[data.date] += charge;
        });
        
        // Générer les données pour les 28 derniers jours
        const labels = [];
        const atlData = [];
        const ctlData = [];
        
        for (let i = 27; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            
            labels.push(d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
            
            // ATL (moyenne 7 jours)
            let atl7Sum = 0;
            for (let j = 0; j < 7; j++) {
                const d2 = new Date(d);
                d2.setDate(d2.getDate() - j);
                const ds = d2.toISOString().split('T')[0];
                atl7Sum += chargeByDay[ds] || 0;
            }
            atlData.push(Math.round(atl7Sum / 7));
            
            // CTL (moyenne 28 jours)
            let ctl28Sum = 0;
            for (let j = 0; j < 28; j++) {
                const d2 = new Date(d);
                d2.setDate(d2.getDate() - j);
                const ds = d2.toISOString().split('T')[0];
                ctl28Sum += chargeByDay[ds] || 0;
            }
            ctlData.push(Math.round(ctl28Sum / 28));
        }
        
        const ctx = canvas.getContext('2d');
        popupAtlCtlChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'ATL (7j)',
                        data: atlData,
                        borderColor: '#ef4444',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.3
                    },
                    {
                        label: 'CTL (28j)',
                        data: ctlData,
                        borderColor: '#3b82f6',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, padding: 10 } }
                },
                scales: {
                    y: { beginAtZero: true },
                    x: { 
                        grid: { display: false },
                        ticks: { maxTicksLimit: 7 }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erreur graphique ATL/CTL:', error);
    }
}

/**
 * Calcule le numéro de semaine ISO
 */
function getWeekNumberPopup(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// ============================================
// NAVIGATION CYCLES (flèches ◀ ▶)
// ============================================

/**
 * Met à jour le label et les boutons de navigation du cycle
 */
function updatePopupCycleNavButtons(activeOffset) {
    const label = document.getElementById('popupCycleLabel');
    const prevBtn = document.getElementById('popupCyclePrev');
    const nextBtn = document.getElementById('popupCycleNext');

    if (label) {
        if (activeOffset === 0) {
            label.textContent = 'Cycle Actuel';
        } else {
            label.textContent = `C${activeOffset}`; // C-1, C-2, etc.
        }
    }

    // Désactiver le bouton ▶ si on est au cycle actuel
    if (nextBtn) {
        if (activeOffset >= 0) {
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.3';
            nextBtn.style.cursor = 'not-allowed';
        } else {
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
        }
    }

    // Le bouton ◀ est toujours actif (on peut toujours remonter)
    if (prevBtn) {
        prevBtn.style.opacity = '1';
        prevBtn.style.cursor = 'pointer';
    }
}

/**
 * Navigue vers le cycle précédent (-1) ou suivant (+1)
 */
function navigatePopupCycle(direction) {
    const newOffset = currentPopupCycleOffset + direction;

    // Ne pas aller au-delà du cycle actuel (offset 0)
    if (newOffset > 0) return;

    if (window.currentPopupPlayerId) {
        loadPopupCycleChart(window.currentPopupPlayerId, newOffset);
    }
}

// Export global pour les onclick dans le HTML
window.navigatePopupCycle = navigatePopupCycle;

// Exports globaux
window.showPlayerDetail = showPlayerDetail;
window.closePlayerDetailModal = closePlayerDetailModal;
window.loadPopupCycleChart = loadPopupCycleChart;

console.log('✅ Module Player Popup chargé - showPlayerDetail exporté:', typeof window.showPlayerDetail);
