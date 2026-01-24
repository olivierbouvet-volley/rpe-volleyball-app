/**
 * Cycle Check-in Module
 * Gère l'interface utilisateur et la logique de saisie du cycle menstruel
 * dans le formulaire de check-in des joueuses
 * 
 * Fonctionnalités :
 * - Question "En règles aujourd'hui ?" (J1)
 * - Détection SPM et proximité des règles
 * - Saisie des 7 symptômes (0-10)
 * - Calcul automatique de la phase du cycle
 * - Intégration avec saveCheckin
 */

console.log('Module Cycle Check-in chargé');

// ============================================================================
// ÉTAT ET CONFIGURATION
// ============================================================================

// État local du cycle pour le formulaire (exporté globalement)
window.cycleFormState = {
    hasPeriod: null,           // true/false/null
    periodProximity: null,     // 'notyet', 'j5-j3', 'j2-j1'
    spmSymptoms: [],           // ['cramps', 'irritability', etc.]
    symptoms: {
        cramps: 0,
        headache: 0,
        fatigue: 0,
        moodSwings: 0,
        bloating: 0,
        backPain: 0,
        breastTenderness: 0
    },
    currentPhase: null,
    dayOfCycle: null
};
let cycleFormState = window.cycleFormState; // Alias local

// Configuration des couleurs selon la valeur du symptôme
const SYMPTOM_COLORS = {
    0: '#10b981',   // Vert - Aucun
    1: '#10b981',
    2: '#10b981',
    3: '#22c55e',
    4: '#84cc16',
    5: '#eab308',   // Jaune - Modéré
    6: '#f59e0b',
    7: '#f97316',   // Orange - Élevé
    8: '#ef4444',   // Rouge - Sévère
    9: '#dc2626',
    10: '#b91c1c'   // Rouge foncé - Insupportable
};

// ============================================================================
// EVENT LISTENERS POUR LES PASTILLES DE SYMPTÔMES
// ============================================================================

// Gérer les clics sur les pastilles de symptômes
document.addEventListener('click', (e) => {
    const badge = e.target.closest('.symptom-badge');
    if (!badge) return;
    
    const symptomId = badge.dataset.symptom;
    const value = parseInt(badge.dataset.value);
    
    if (symptomId && !isNaN(value)) {
        // Mettre à jour l'état
        cycleFormState.symptoms[symptomId] = value;
        
        // Mettre à jour l'affichage de la valeur
        const valueEl = document.getElementById(symptomId + 'Value');
        if (valueEl) {
            valueEl.textContent = value;
            valueEl.style.color = SYMPTOM_COLORS[value] || '#10b981';
        }
        
        // Mettre à jour le style des pastilles du même symptôme
        document.querySelectorAll(`.symptom-badge[data-symptom="${symptomId}"]`).forEach(btn => {
            const btnValue = parseInt(btn.dataset.value);
            if (btnValue === value) {
                btn.style.background = SYMPTOM_COLORS[value] || '#10b981';
                btn.style.color = 'white';
                btn.style.borderColor = SYMPTOM_COLORS[value] || '#10b981';
            } else {
                btn.style.background = 'white';
                btn.style.color = '#374151';
                btn.style.borderColor = '#e5e7eb';
            }
        });
        
        console.log(`Symptôme ${symptomId} mis à jour: ${value}`);
    }
});

// ============================================================================
// FONCTIONS DE GESTION DE L'UI
// ============================================================================

/**
 * Définit le statut "En règles aujourd'hui"
 * @param {boolean} hasPeriod - true si en règles, false sinon
 */
window.setPeriodStatus = function(hasPeriod) {
    cycleFormState.hasPeriod = hasPeriod;
    
    const yesBtn = document.getElementById('hasPeriodYes');
    const noBtn = document.getElementById('hasPeriodNo');
    const hiddenInput = document.getElementById('hasPeriod');
    const spmSection = document.getElementById('spmSection');
    
    // Reset les styles
    yesBtn.style.background = 'white';
    yesBtn.style.color = '#374151';
    noBtn.style.background = 'white';
    noBtn.style.color = '#374151';
    
    if (hasPeriod) {
        // Oui sélectionné
        yesBtn.style.background = '#ec4899';
        yesBtn.style.color = 'white';
        yesBtn.style.borderColor = '#ec4899';
        hiddenInput.value = 'true';
        
        // Masquer la section SPM
        spmSection.style.display = 'none';
        
        // Si c'est J1, on peut proposer de mettre à jour la date de début du cycle
        showCycleUpdatePrompt();
        
    } else {
        // Non sélectionné
        noBtn.style.background = '#f3f4f6';
        noBtn.style.borderColor = '#e5e7eb';
        hiddenInput.value = 'false';
        
        // Afficher la section SPM
        spmSection.style.display = 'block';
    }
    
    // Mettre à jour l'affichage de la phase
    updateCyclePhaseDisplay();
};

/**
 * Met à jour la date de début du cycle en calculant J1 à partir du jour sélectionné
 * @param {number} dayClicked - Le jour cliqué (1-8)
 */
async function updateCycleStartFromDay(dayClicked) {
    if (!appState.currentUser || dayClicked < 1 || dayClicked > 8) return;
    
    const playerId = appState.currentUser;
    const today = new Date();
    
    // Calculer la date de J1 : aujourd'hui - (jour cliqué - 1)
    const daysToSubtract = dayClicked - 1;
    const j1Date = new Date(today);
    j1Date.setDate(j1Date.getDate() - daysToSubtract);
    const j1DateString = j1Date.toISOString().split('T')[0];
    
    try {
        // Vérifier s'il existe déjà une config cycle
        const cycleDoc = await db.collection('menstrualCycle').doc(playerId).get();
        
        if (cycleDoc.exists) {
            // Mettre à jour la date de début
            await db.collection('menstrualCycle').doc(playerId).update({
                cycleStartDate: j1DateString,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Cycle mis à jour: J1 = ${j1DateString} (à partir de J${dayClicked} aujourd'hui)`);
        } else {
            // Créer une nouvelle config avec valeurs par défaut
            await db.collection('menstrualCycle').doc(playerId).set({
                cycleStartDate: j1DateString,
                cycleLength: 28,
                periodLength: 5,
                trackingMethod: 'calendar',
                contraception: { type: 'none', name: null },
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Configuration cycle créée: J1 = ${j1DateString}`);
        }
        
        // Afficher un feedback visuel
        showToast(`🩸 Cycle mis à jour ! J1 = ${j1DateString}`, 'success');
        
    } catch (error) {
        console.error('Erreur mise à jour cycle:', error);
    }
}

/**
 * Affiche un prompt pour mettre à jour la date de début du cycle (J1)
 * Utilise la date du check-in en cours, pas forcément aujourd'hui
 */
async function showCycleUpdatePrompt() {
    if (!appState.currentUser) return;
    
    const playerId = appState.currentUser;
    // Utiliser la date du formulaire de check-in au lieu de today
    const checkinDate = document.getElementById('checkinForm') ? 
        new Date().toISOString().split('T')[0] : 
        new Date().toISOString().split('T')[0];
    
    try {
        // Vérifier s'il existe déjà une config cycle
        const cycleDoc = await db.collection('menstrualCycle').doc(playerId).get();
        
        if (cycleDoc.exists) {
            // Mettre à jour la date de début
            await db.collection('menstrualCycle').doc(playerId).update({
                cycleStartDate: checkinDate,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Date de début du cycle mise à jour:', checkinDate);
        } else {
            // Créer une nouvelle config avec valeurs par défaut
            await db.collection('menstrualCycle').doc(playerId).set({
                cycleStartDate: checkinDate,
                cycleLength: 28,
                periodLength: 5,
                trackingMethod: 'calendar',
                contraception: { type: 'none', name: null },
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Configuration cycle créée avec date:', checkinDate);
        }
        
        // Afficher un feedback visuel
        showToast('🩸 J1 enregistré ! Ton cycle est mis à jour.', 'success');
        
    } catch (error) {
        console.error('Erreur mise à jour cycle:', error);
    }
}

/**
 * Affiche un toast notification
 */
function showToast(message, type = 'info') {
    // Créer le toast s'il n'existe pas
    let toast = document.getElementById('cycleToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'cycleToast';
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            z-index: 10000;
            transition: opacity 0.3s, transform 0.3s;
            opacity: 0;
        `;
        document.body.appendChild(toast);
    }
    
    // Style selon le type
    if (type === 'success') {
        toast.style.background = '#10b981';
        toast.style.color = 'white';
    } else if (type === 'warning') {
        toast.style.background = '#f59e0b';
        toast.style.color = 'white';
    } else {
        toast.style.background = '#3b82f6';
        toast.style.color = 'white';
    }
    
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    
    // Masquer après 3 secondes
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3000);
}

/**
 * Bascule la visibilité de la section des symptômes
 */
window.toggleSymptomsVisibility = function() {
    const grid = document.getElementById('symptomsGrid');
    const btn = document.getElementById('toggleSymptomsBtn');
    
    if (grid.style.display === 'none') {
        grid.style.display = 'block';
        btn.textContent = '▲ Réduire';
    } else {
        grid.style.display = 'none';
        btn.textContent = '▼ Détailler';
    }
};

/**
 * Met à jour la valeur affichée d'un symptôme et la couleur
 * @param {string} symptomId - ID du symptôme (sans 'Score')
 * @param {number|string} value - Valeur du symptôme (0-10)
 */
window.updateSymptomValue = function(symptomId, value) {
    const numValue = parseInt(value) || 0;
    cycleFormState.symptoms[symptomId] = numValue;
    
    // Mettre à jour l'affichage
    const valueEl = document.getElementById(symptomId + 'Value');
    if (valueEl) {
        valueEl.textContent = numValue;
        valueEl.style.color = SYMPTOM_COLORS[numValue] || '#10b981';
    }
    
    // Mettre à jour le résumé
    updateSymptomsSummary();
};

/**
 * Met à jour le résumé des symptômes (score total)
 */
function updateSymptomsSummary() {
    const symptoms = cycleFormState.symptoms;
    const total = Object.values(symptoms).reduce((sum, val) => sum + val, 0);
    
    const summaryEl = document.getElementById('symptomsSummary');
    const totalEl = document.getElementById('totalSymptomsScore');
    
    if (total > 0) {
        summaryEl.style.display = 'block';
        totalEl.textContent = `${total}/70`;
        
        // Changer la couleur selon le seuil
        if (total > 20) {
            summaryEl.style.background = '#fef2f2';
            totalEl.style.color = '#dc2626';
        } else if (total > 10) {
            summaryEl.style.background = '#fffbeb';
            totalEl.style.color = '#f59e0b';
        } else {
            summaryEl.style.background = '#f0fdf4';
            totalEl.style.color = '#166534';
        }
    } else {
        summaryEl.style.display = 'none';
    }
}

/**
 * Met à jour l'affichage de la phase du cycle
 */
async function updateCyclePhaseDisplay() {
    if (!appState.currentUser) return;
    
    const displayEl = document.getElementById('cyclePhaseDisplay');
    const iconEl = document.getElementById('cyclePhaseIcon');
    const textEl = document.getElementById('cyclePhaseText');
    
    try {
        // Récupérer la config du cycle
        const cycleDoc = await db.collection('menstrualCycle').doc(appState.currentUser).get();
        
        if (!cycleDoc.exists || !cycleDoc.data().cycleStartDate) {
            displayEl.style.display = 'none';
            return;
        }
        
        const cycleData = cycleDoc.data();
        
        // Calculer la phase (utiliser la fonction avec données réelles)
        let phase, dayOfCycle, isExtended;
        
        if (typeof calculateCyclePhaseWithRealData === 'function' && window.currentPlayer && window.currentPlayer.id) {
            const result = await calculateCyclePhaseWithRealData(
                cycleData.cycleStartDate, 
                cycleData.cycleLength || 28,
                window.currentPlayer.id
            );
            phase = result.phase;
            dayOfCycle = result.dayOfCycle;
            isExtended = result.isExtended;
        } else if (typeof calculateCyclePhase === 'function') {
            const result = calculateCyclePhase(cycleData.cycleStartDate, cycleData.cycleLength || 28);
            phase = result.phase;
            dayOfCycle = result.dayOfCycle;
            isExtended = false;
        } else {
            // Fallback : calcul simple
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startDate = new Date(cycleData.cycleStartDate);
            startDate.setHours(0, 0, 0, 0);
            
            const diffTime = today - startDate;
            const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            dayOfCycle = (daysSinceStart % (cycleData.cycleLength || 28)) + 1;
            
            if (dayOfCycle <= 5) phase = 'Menstruelle';
            else if (dayOfCycle <= 14) phase = 'Folliculaire';
            else if (dayOfCycle <= 16) phase = 'Ovulatoire';
            else phase = 'Lutéale';
        }
        
        // Afficher la phase
        displayEl.style.display = 'block';
        
        // Icône et couleur selon la phase
        const phaseConfig = {
            'Menstruelle': { icon: '🩸', color: '#ef4444', bg: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' },
            'Folliculaire': { icon: '🌱', color: '#10b981', bg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' },
            'Ovulatoire': { icon: '🌸', color: '#8b5cf6', bg: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)' },
            'Lutéale': { icon: '🍂', color: '#f59e0b', bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }
        };
        
        const config = phaseConfig[phase] || phaseConfig['Folliculaire'];
        
        iconEl.textContent = config.icon;
        textEl.textContent = `J${dayOfCycle} - ${phase}`;
        textEl.style.color = config.color;
        displayEl.style.background = config.bg;
        
        // Stocker pour utilisation dans saveCheckin
        cycleFormState.currentPhase = phase;
        cycleFormState.dayOfCycle = dayOfCycle;
        
    } catch (error) {
        console.error('Erreur affichage phase:', error);
        displayEl.style.display = 'none';
    }
}

// ============================================================================
// GESTION DES ÉVÉNEMENTS SPM
// ============================================================================

/**
 * Initialise les event listeners pour les boutons J1-J8
 */
function initCycleDayListeners() {
    document.querySelectorAll('.cycle-day-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const day = parseInt(e.target.dataset.day);
            
            // Reset tous les boutons
            document.querySelectorAll('.cycle-day-btn').forEach(b => {
                b.style.background = 'white';
                b.style.borderColor = '#e5e7eb';
                b.style.color = '#374151';
            });
            
            // Activer le bouton cliqué
            e.target.style.background = '#fce7f3';
            e.target.style.borderColor = '#ec4899';
            e.target.style.color = '#831843';
            
            if (day === 0) {
                // Bouton "Non" cliqué
                cycleFormState.hasPeriod = false;
                cycleFormState.dayOfCycle = null;
                cycleFormState.currentPhase = null;
                console.log('❌ Pas de règles aujourd\'hui');
            } else if (day >= 1 && day <= 5) {
                // J1 à J5 = en règles
                cycleFormState.hasPeriod = true;
                cycleFormState.dayOfCycle = day;
                cycleFormState.currentPhase = 'Menstruelle';
                console.log(`🩸 En règles J${day} - Phase Menstruelle`);
                
                // Mettre à jour la configuration du cycle en calculant J1
                await updateCycleStartFromDay(day);
            } else if (day >= 6 && day <= 8) {
                // J6 à J8 = spotting/fin de règles (considéré comme encore en période)
                cycleFormState.hasPeriod = true;
                cycleFormState.dayOfCycle = day;
                cycleFormState.currentPhase = 'Menstruelle'; // Encore dans la phase menstruelle
                console.log(`🩸 Spotting/Fin de règles J${day}`);
                
                // Mettre à jour la configuration du cycle en calculant J1
                await updateCycleStartFromDay(day);
            }
            
            // Afficher la section symptômes si en règles
            const symptomsSection = document.getElementById('symptomsSection');
            if (symptomsSection && cycleFormState.hasPeriod) {
                symptomsSection.style.display = 'block';
            } else if (symptomsSection) {
                symptomsSection.style.display = 'none';
            }
            
            // Mettre à jour l'affichage de la phase
            updateCyclePhaseDisplay();
        });
    });
}

/**
 * Initialise les event listeners pour les checkboxes SPM
 */
function initSpmListeners() {
    const spmCheckboxes = ['spmCramps', 'spmIrritability', 'spmBloating', 'spmHeadache', 'spmFatigue', 'spmNone'];
    
    spmCheckboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (checkbox) {
            checkbox.addEventListener('change', handleSpmChange);
        }
    });
    
    // Listeners pour les boutons de proximité
    document.querySelectorAll('.period-proximity-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Reset tous les boutons
            document.querySelectorAll('.period-proximity-btn').forEach(b => {
                b.style.background = 'white';
                b.style.borderColor = '#e5e7eb';
                b.style.color = '#374151';
            });
            
            // Activer le bouton cliqué
            e.target.style.background = '#fef3c7';
            e.target.style.borderColor = '#f59e0b';
            e.target.style.color = '#92400e';
            
            // Stocker la valeur
            cycleFormState.periodProximity = e.target.dataset.value;
            document.getElementById('periodProximity').value = e.target.dataset.value;
        });
    });
}

/**
 * Gère le changement des checkboxes SPM
 */
function handleSpmChange(e) {
    const checkbox = e.target;
    const symptomId = checkbox.id.replace('spm', '').toLowerCase();
    
    // Si "Aucun" est coché, décocher les autres
    if (checkbox.id === 'spmNone' && checkbox.checked) {
        ['spmCramps', 'spmIrritability', 'spmBloating', 'spmHeadache', 'spmFatigue'].forEach(id => {
            const cb = document.getElementById(id);
            if (cb) cb.checked = false;
        });
        cycleFormState.spmSymptoms = [];
    } else if (checkbox.checked) {
        // Si un symptôme est coché, décocher "Aucun"
        const noneCheckbox = document.getElementById('spmNone');
        if (noneCheckbox) noneCheckbox.checked = false;
        
        // Ajouter au tableau
        if (!cycleFormState.spmSymptoms.includes(symptomId)) {
            cycleFormState.spmSymptoms.push(symptomId);
        }
    } else {
        // Retirer du tableau
        cycleFormState.spmSymptoms = cycleFormState.spmSymptoms.filter(s => s !== symptomId);
    }
    
    // Afficher/masquer la section de proximité
    const proximitySection = document.getElementById('periodProximitySection');
    if (cycleFormState.spmSymptoms.length > 0) {
        proximitySection.style.display = 'block';
    } else {
        proximitySection.style.display = 'none';
    }
}

// ============================================================================
// INTÉGRATION AVEC SAVE CHECKIN
// ============================================================================

/**
 * Récupère les données du cycle pour le check-in
 * @returns {Object} Données du cycle à inclure dans le check-in
 */
window.getCycleDataForCheckin = function() {
    return {
        // Données de base
        hasPeriod: cycleFormState.hasPeriod,
        periodProximity: cycleFormState.periodProximity,
        spmSymptoms: cycleFormState.spmSymptoms,
        
        // 7 Symptômes (0-10)
        symptoms: { ...cycleFormState.symptoms },
        
        // Phase et jour du cycle
        cyclePhase: cycleFormState.currentPhase || null,
        cycleDay: cycleFormState.dayOfCycle || null,
        dayOfCycle: cycleFormState.dayOfCycle || null // Même valeur que cycleDay pour compatibilité
    };
};

/**
 * Réinitialise le formulaire du cycle
 */
window.resetCycleForm = function() {
    console.log('Réinitialisation du formulaire cycle...');
    
    cycleFormState = {
        hasPeriod: null,
        periodProximity: null,
        spmSymptoms: [],
        symptoms: {
            cramps: 0,
            headache: 0,
            fatigue: 0,
            moodSwings: 0,
            bloating: 0,
            backPain: 0,
            breastTenderness: 0
        },
        currentPhase: null,
        dayOfCycle: null
    };
    
    // Reset UI - avec vérifications null-safe
    const yesBtn = document.getElementById('hasPeriodYes');
    const noBtn = document.getElementById('hasPeriodNo');
    if (yesBtn) {
        yesBtn.style.background = 'white';
        yesBtn.style.color = '#374151';
    }
    if (noBtn) {
        noBtn.style.background = 'white';
        noBtn.style.color = '#374151';
    }
    
    // Reset hasPeriod hidden input si existe
    const hasPeriodInput = document.getElementById('hasPeriod');
    if (hasPeriodInput) {
        hasPeriodInput.value = '';
    }
    
    // Cacher les sections
    const spmSection = document.getElementById('spmSection');
    if (spmSection) spmSection.style.display = 'none';
    
    const periodProximitySection = document.getElementById('periodProximitySection');
    if (periodProximitySection) periodProximitySection.style.display = 'none';
    
    // Reset des bouttons cycle day (pastilles J1-J8, Non)
    document.querySelectorAll('.cycle-day-btn').forEach(btn => {
        btn.style.background = 'white';
        btn.style.borderColor = '#e5e7eb';
        btn.style.color = '#374151';
    });
    
    // Reset les value displays des symptômes menstruels
    ['cramps', 'headache', 'fatigue', 'moodSwings', 'bloating', 'backPain', 'breastTenderness'].forEach(id => {
        const valueDisplay = document.getElementById(id + 'Value');
        if (valueDisplay) {
            valueDisplay.textContent = '0';
            valueDisplay.style.color = '#10b981';
        }
    });
    
    const symptomsSummary = document.getElementById('symptomsSummary');
    if (symptomsSummary) symptomsSummary.style.display = 'none';
    
    console.log('✅ Formulaire cycle réinitialisé');
};

// ============================================================================
// MODIFICATION DE LA FONCTION saveCheckin EXISTANTE
// ============================================================================

/**
 * Surcharge la soumission du formulaire de check-in pour inclure les données cycle
 */
function enhanceCheckinFormSubmission() {
    const checkinForm = document.getElementById('checkinForm');
    if (!checkinForm) return;
    
    // Récupérer le handler existant
    const originalHandler = checkinForm.onsubmit;
    
    // Remplacer par notre handler amélioré
    checkinForm.removeEventListener('submit', originalHandler);
    
    checkinForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Récupérer les valeurs de base
        const sleepValue = parseInt(document.getElementById('sleepQuality').value);
        const sorenessValue = parseInt(document.getElementById('soreness').value);
        const stressValue = parseInt(document.getElementById('stress').value);
        const moodValue = parseInt(document.getElementById('mood').value);
        const energyValue = parseInt(document.getElementById('energy').value);
        
        // Vérifier que toutes les valeurs de base ont été sélectionnées
        if (sleepValue === 0 || sorenessValue === 0 || stressValue === 0 || moodValue === 0 || energyValue === 0) {
            alert('Veuillez sélectionner une valeur pour chaque critère (cliquez sur une pastille).');
            return;
        }
        
        const comment = document.getElementById('checkinComment') ? document.getElementById('checkinComment').value.trim() : '';
        
        // Calculer le score de base
        const baseScore = Math.round((sleepValue + (10 - sorenessValue) + (10 - stressValue) + moodValue + energyValue) / 5);
        
        // Récupérer les données du cycle
        const cycleData = getCycleDataForCheckin();
        
        // Calculer le score ajusté si la phase est connue
        let adjustedScore = baseScore;
        if (cycleData.cyclePhase && typeof applyCycleAdjustments === 'function') {
            const result = applyCycleAdjustments(baseScore, cycleData.cyclePhase);
            adjustedScore = result.adjustedScore;
        }
        
        // Construire l'objet checkinData complet
        const checkinData = {
            playerId: appState.currentUser,
            date: new Date().toISOString().split('T')[0],
            
            // Métriques de base
            sleep: sleepValue,
            soreness: sorenessValue,
            stress: stressValue,
            mood: moodValue,
            energy: energyValue,
            
            // Scores
            score: baseScore,
            adjustedScore: adjustedScore,
            
            // Données du cycle
            hasPeriod: cycleData.hasPeriod,
            periodProximity: cycleData.periodProximity,
            spmSymptoms: cycleData.spmSymptoms,
            symptoms: cycleData.symptoms,
            cyclePhase: cycleData.cyclePhase,
            cycleDay: cycleData.cycleDay,
            dayOfCycle: cycleData.dayOfCycle,
            
            // Commentaire et timestamp
            comment: comment || null,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        try {
            await db.collection('checkins').add(checkinData);
            
            // Sauvegarder aussi dans dailySymptoms si des symptômes sont renseignés
            const totalSymptoms = Object.values(cycleData.symptoms).reduce((sum, val) => sum + val, 0);
            if (totalSymptoms > 0 || cycleData.hasPeriod !== null) {
                await db.collection('dailySymptoms').add({
                    playerId: appState.currentUser,
                    date: new Date().toISOString().split('T')[0],
                    hasPeriod: cycleData.hasPeriod,
                    symptoms: cycleData.symptoms,
                    currentPhase: cycleData.cyclePhase,
                    dayOfCycle: cycleData.dayOfCycle,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            alert('Check-in enregistré avec succès !');
            
            // Réinitialiser le formulaire
            checkinForm.reset();
            resetCycleForm();
            
            // Réinitialiser les pastilles
            if (typeof refreshRatingBadges === 'function') {
                refreshRatingBadges();
            }
            
            if (document.getElementById('commentCount')) {
                document.getElementById('commentCount').textContent = '0';
            }
            
            // Recharger le dashboard
            if (typeof loadPlayerDashboard === 'function') {
                loadPlayerDashboard();
            }
            
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du check-in:', error);
            alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
        }
    });
}

// ============================================================================
// INITIALISATION
// ============================================================================

/**
 * Initialise le module de check-in cycle au chargement de la page
 */
function initCycleCheckin() {
    console.log('Initialisation du module Cycle Check-in...');
    
    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initCycleDayListeners();
            initSpmListeners();
            enhanceCheckinFormSubmission();
            
            // Mettre à jour l'affichage de la phase après connexion
            setTimeout(updateCyclePhaseDisplay, 1000);
        });
    } else {
        initCycleDayListeners();
        initSpmListeners();
        enhanceCheckinFormSubmission();
        
        // Mettre à jour l'affichage de la phase
        setTimeout(updateCyclePhaseDisplay, 1000);
    }
}

// Lancer l'initialisation
initCycleCheckin();

// Exports globaux
window.setPeriodStatus = setPeriodStatus;
window.toggleSymptomsVisibility = toggleSymptomsVisibility;
window.updateSymptomValue = updateSymptomValue;
window.getCycleDataForCheckin = getCycleDataForCheckin;
window.resetCycleForm = resetCycleForm;
window.updateCyclePhaseDisplay = updateCyclePhaseDisplay;
window.updateCycleStartFromDay = updateCycleStartFromDay; // Export pour cycle-badges.js

console.log('Module Cycle Check-in initialisé');
