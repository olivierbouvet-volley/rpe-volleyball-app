/**
 * Load Calculator - Calculateur de Charge pour l'entraînement
 * Affiche les 1RM et permet de calculer les charges selon % ou répétitions
 */

console.log('🔵 Chargement load-calculator.js');

// État du calculateur
let currentCalcMode = 'percentage'; // 'percentage' ou 'reps'
let selectedExerciseMax = 0;

/**
 * Charger et afficher les maximums de la joueuse
 */
async function loadPlayerMaximums() {
    console.log('Load Calculator: loadPlayerMaximums appelé');
    console.log('Load Calculator: window.currentPlayer =', window.currentPlayer);
    
    if (!window.currentPlayer || !window.currentPlayer.id) {
        console.error('Load Calculator: ❌ Pas de joueuse connectée');
        const maxList = document.getElementById('playerMaxList');
        if (maxList) {
            maxList.innerHTML = '<p style="color: #ff6b6b; text-align: center; grid-column: 1/-1;">⚠️ Erreur : Aucune joueuse connectée</p>';
        }
        return;
    }

    console.log('Load Calculator: Chargement des sessions de tests pour', window.currentPlayer.id);

    try {
        // Charger la dernière session de tests depuis la sous-collection
        const sessionsSnapshot = await db.collection('players').doc(window.currentPlayer.id)
            .collection('testSessions')
            .get();
        
        const sessions = [];
        sessionsSnapshot.forEach(doc => {
            sessions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Load Calculator: Sessions trouvées:', sessions.length);
        
        let playerData = null;
        
        if (sessions.length > 0) {
            // Trier par ID (format YYYY-MM-DD) et prendre la dernière
            sessions.sort((a, b) => b.id.localeCompare(a.id));
            playerData = sessions[0];
            console.log('Load Calculator: Utilisation de la session', sessions[0].id, playerData);
        } else {
            // Fallback : essayer les données du document principal
            console.log('Load Calculator: Aucune session, fallback sur document principal');
            const playerDoc = await db.collection('players').doc(window.currentPlayer.id).get();
            if (!playerDoc.exists) {
                console.error('Load Calculator: ❌ Document joueur introuvable');
                return;
            }
            playerData = playerDoc.data();
            console.log('Load Calculator: playerData (document principal) =', playerData);
        }
        
        const maxList = document.getElementById('playerMaxList');
        if (!maxList) {
            console.error('Load Calculator: ❌ Element playerMaxList introuvable');
            return;
        }

        // Liste des exercices avec leurs données
        const exercises = [
            { key: 'dc', label: 'Développé Couché', rep: playerData.dcRep, charge: playerData.dcCharge },
            { key: 'traction', label: 'Traction', rep: playerData.tractionRep, charge: playerData.tractionCharge },
            { key: 'tirage', label: 'Tirage Banc', rep: playerData.tirageRep, charge: playerData.tirageCharge },
            { key: 'pullOver', label: 'Pull Over', rep: playerData.pullOverRep, charge: playerData.pullOverCharge },
            { key: 'hipThrust', label: 'Hip Thrust', rep: playerData.hipThrustRep, charge: playerData.hipThrustCharge },
            { key: 'sdt', label: 'SDT', rep: playerData.sdtRep, charge: playerData.sdtCharge },
            { key: 'backSquat', label: 'Back Squat', rep: playerData.backSquatRep, charge: playerData.backSquatCharge },
            { key: 'epaule', label: 'Épaule', rep: playerData.epauleRep, charge: playerData.epauleCharge }
        ];

        let html = '';
        exercises.forEach(ex => {
            const max = calculateMax(ex.rep, ex.charge);
            console.log(`Load Calculator: ${ex.label} - rep=${ex.rep}, charge=${ex.charge}, max=${max}`);
            if (max && max !== '--') {
                html += `
                    <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">${ex.label}</div>
                        <div style="font-size: 24px; font-weight: 700; color: #2180ac;">${max}</div>
                        <div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">1RM extrapolé</div>
                    </div>
                `;
            }
        });

        console.log('Load Calculator: Nombre de max trouvés:', html === '' ? 0 : exercises.filter(ex => calculateMax(ex.rep, ex.charge) !== '--').length);

        if (html === '') {
            html = '<p style="color: #999; text-align: center; grid-column: 1/-1;">Aucune donnée de test disponible. Complétez vos tests physiques d\'abord.</p>';
        }

        maxList.innerHTML = html;
        console.log('Load Calculator: ✅ Affichage des maximums terminé');

    } catch (error) {
        console.error('Erreur chargement max:', error);
    }
}

/**
 * Calculer le 1RM avec la formule d'Epley
 */
function calculateMax(rep, charge) {
    if (!rep || !charge || rep <= 0 || charge <= 0) return '--';
    const max = charge * (1 + rep / 30);
    return Math.round(max) + ' kg';
}

/**
 * Changer de mode de calcul
 */
function switchCalcMode(mode) {
    currentCalcMode = mode;

    const percentageMode = document.getElementById('percentageMode');
    const repsMode = document.getElementById('repsMode');
    const percentageBtn = document.getElementById('percentageModeBtn');
    const repsBtn = document.getElementById('repsModeBtn');

    if (mode === 'percentage') {
        percentageMode.style.display = 'block';
        repsMode.style.display = 'none';
        percentageBtn.style.background = '#3b82f6';
        percentageBtn.style.color = 'white';
        percentageBtn.style.borderColor = '#3b82f6';
        repsBtn.style.background = 'white';
        repsBtn.style.color = '#6b7280';
        repsBtn.style.borderColor = '#d1d5db';
        
        // Masquer le résultat reps
        document.getElementById('repsResult').style.display = 'none';
        
        // Recalculer percentage si un exercice est sélectionné
        if (selectedExerciseMax > 0) {
            updatePercentageCalc();
        }
    } else {
        percentageMode.style.display = 'none';
        repsMode.style.display = 'block';
        repsBtn.style.background = '#3b82f6';
        repsBtn.style.color = 'white';
        repsBtn.style.borderColor = '#3b82f6';
        percentageBtn.style.background = 'white';
        percentageBtn.style.color = '#6b7280';
        percentageBtn.style.borderColor = '#d1d5db';
        
        // Masquer le résultat percentage
        document.getElementById('percentageResult').style.display = 'none';
    }
}

/**
 * Gérer la sélection d'exercice
 */
async function onExerciseChange() {
    const select = document.getElementById('calcExercise');
    const exerciseKey = select.value;
    
    if (!exerciseKey) {
        document.getElementById('selectedMaxDisplay').style.display = 'none';
        document.getElementById('percentageResult').style.display = 'none';
        document.getElementById('repsResult').style.display = 'none';
        selectedExerciseMax = 0;
        return;
    }

    // Charger le max de cet exercice
    try {
        // Charger la dernière session de tests
        const sessionsSnapshot = await db.collection('players').doc(window.currentPlayer.id)
            .collection('testSessions')
            .get();
        
        const sessions = [];
        sessionsSnapshot.forEach(doc => {
            sessions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        let playerData = null;
        
        if (sessions.length > 0) {
            // Trier par ID (format YYYY-MM-DD) et prendre la dernière
            sessions.sort((a, b) => b.id.localeCompare(a.id));
            playerData = sessions[0];
        } else {
            // Fallback : document principal
            const playerDoc = await db.collection('players').doc(window.currentPlayer.id).get();
            if (!playerDoc.exists) return;
            playerData = playerDoc.data();
        }
        
        const repKey = exerciseKey + 'Rep';
        const chargeKey = exerciseKey + 'Charge';
        
        const rep = playerData[repKey];
        const charge = playerData[chargeKey];
        
        const maxStr = calculateMax(rep, charge);
        const maxValue = maxStr === '--' ? 0 : parseFloat(maxStr);
        
        selectedExerciseMax = maxValue;
        
        if (maxValue > 0) {
            document.getElementById('selectedMaxDisplay').style.display = 'block';
            document.getElementById('selectedMaxValue').textContent = maxStr;
            
            // Recalculer selon le mode actuel
            if (currentCalcMode === 'percentage') {
                updatePercentageCalc();
            }
        } else {
            document.getElementById('selectedMaxDisplay').style.display = 'none';
            document.getElementById('selectedMaxValue').textContent = '--';
            alert('Aucune donnée de test disponible pour cet exercice. Complétez vos tests physiques d\'abord.');
        }

    } catch (error) {
        console.error('Erreur chargement exercice:', error);
    }
}

/**
 * Mettre à jour le calcul par pourcentage
 */
function updatePercentageCalc() {
    const slider = document.getElementById('percentageSlider');
    const input = document.getElementById('percentageInput');
    
    // Synchroniser slider et input
    if (document.activeElement === slider) {
        input.value = slider.value;
    } else if (document.activeElement === input) {
        slider.value = input.value;
    }
    
    const percentage = parseFloat(input.value);
    
    if (selectedExerciseMax === 0) {
        document.getElementById('percentageResult').style.display = 'none';
        return;
    }
    
    // Calcul : charge = max × pourcentage / 100
    const charge = (selectedExerciseMax * percentage) / 100;
    
    document.getElementById('percentageResult').style.display = 'block';
    document.getElementById('percentageResultValue').textContent = Math.round(charge) + ' kg';
    document.getElementById('percentageFormula').textContent = 
        `${selectedExerciseMax} kg × ${percentage}% = ${Math.round(charge)} kg`;
}

/**
 * Sélectionner un nombre de répétitions
 */
function selectReps(reps) {
    const repsValue = parseInt(reps);
    if (!repsValue || repsValue <= 0) {
        document.getElementById('repsResult').style.display = 'none';
        return;
    }
    
    if (selectedExerciseMax === 0) {
        document.getElementById('repsResult').style.display = 'none';
        alert('Sélectionnez d\'abord un exercice');
        return;
    }
    
    // Désactiver tous les boutons
    document.querySelectorAll('.reps-btn').forEach(btn => {
        btn.style.background = 'white';
        btn.style.color = '#374151';
        btn.style.borderColor = '#d1d5db';
    });
    
    // Activer le bouton cliqué (si ce n'est pas l'input custom)
    if (typeof reps === 'number') {
        const btn = Array.from(document.querySelectorAll('.reps-btn'))
            .find(b => b.textContent.trim() === reps.toString());
        if (btn) {
            btn.style.background = '#f59e0b';
            btn.style.color = 'white';
            btn.style.borderColor = '#f59e0b';
        }
    }
    
    // Formule d'Epley inversée : Charge = 1RM / (1 + reps/30)
    const charge = selectedExerciseMax / (1 + repsValue / 30);
    const percentage = Math.round((charge / selectedExerciseMax) * 100);
    
    document.getElementById('repsResult').style.display = 'block';
    document.getElementById('repsResultValue').textContent = Math.round(charge) + ' kg';
    document.getElementById('repsFormula').textContent = 
        `Pour ${repsValue} répétition${repsValue > 1 ? 's' : ''} : ${Math.round(charge)} kg`;
    document.getElementById('repsPercentage').textContent = 
        `≈ ${percentage}% de votre max (${selectedExerciseMax} kg)`;
}

/**
 * Initialiser le calculateur quand l'onglet est ouvert
 */
function initLoadCalculator() {
    console.log('Load Calculator: Initialisation');
    loadPlayerMaximums();
    
    // Attacher l'événement de changement d'exercice
    const select = document.getElementById('calcExercise');
    if (select) {
        select.addEventListener('change', onExerciseChange);
    }
}

// Exposer les fonctions globalement
window.switchCalcMode = switchCalcMode;
window.updatePercentageCalc = updatePercentageCalc;
window.selectReps = selectReps;
window.initLoadCalculator = initLoadCalculator;

console.log('✅ Load Calculator chargé');
