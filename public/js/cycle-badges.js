/**
 * Cycle Badges Module
 * Gère l'affichage des jours du cycle (J1-J8) et les pastilles de symptômes (0-10)
 */

// Store cycle day and symptoms
let selectedCycleDay = 0;
let selectedSymptoms = {};

/**
 * Handle cycle day button click (J1-J8 or Non)
 */
async function selectCycleDay(day) {
    console.log('🎯 selectCycleDay called with day:', day);
    selectedCycleDay = day;
    document.getElementById('cycleDay').value = day;
    
    // Update button styles
    document.querySelectorAll('.cycle-day-btn').forEach(btn => {
        btn.style.background = 'white';
        btn.style.borderColor = '#e5e7eb';
        btn.style.color = '#374151';
    });
    
    const selectedBtn = document.querySelector(`.cycle-day-btn[data-day="${day}"]`);
    if (selectedBtn) {
        if (day === 0) {
            // "Non" button - light gray
            selectedBtn.style.background = '#f3f4f6';
            selectedBtn.style.borderColor = '#d1d5db';
        } else {
            // J1-J8 buttons - pink/red
            selectedBtn.style.background = '#fce7f3';
            selectedBtn.style.borderColor = '#ec4899';
            selectedBtn.style.color = '#be123c';
        }
    }
    
    // 🆕 METTRE À JOUR cycleFormState pour l'enregistrement (sera envoyé lors de la soumission)
    console.log('🔍 Debug: window.cycleFormState existe?', typeof window.cycleFormState !== 'undefined');
    console.log('🔍 Debug: window.cycleFormState =', window.cycleFormState);
    if (typeof window.cycleFormState !== 'undefined') {
        if (day === 0) {
            window.cycleFormState.hasPeriod = false;
            window.cycleFormState.dayOfCycle = null;
            window.cycleFormState.currentPhase = null;
            console.log('❌ Pas de règles aujourd\'hui');
        } else if (day >= 1 && day <= 8) {
            window.cycleFormState.hasPeriod = true;
            window.cycleFormState.dayOfCycle = day;
            window.cycleFormState.currentPhase = 'Menstruelle';
            console.log(`🩸 En règles J${day} - Phase Menstruelle`);
            // Note: La config cycle sera mise à jour lors de la soumission du formulaire
        }
    } else {
        console.error('❌ window.cycleFormState est undefined - cycle-checkin.js non chargé?');
    }
    
    // Show/hide symptoms section based on selection
    const symptomsSection = document.getElementById('symptomsSection');
    const spmSection = document.getElementById('spmSection');
    
    if (day > 0) {
        // Show symptoms section automatically when cycle day is selected
        symptomsSection.style.display = 'block';
        const symptomsGrid = document.getElementById('symptomsGrid');
        if (symptomsGrid) {
            symptomsGrid.style.display = 'block';
        }
        // Hide SPM section if visible
        if (spmSection) {
            spmSection.style.display = 'none';
        }
        console.log('✅ Symptoms section shown, SPM hidden');
    } else {
        // When "Non" is selected, call auto-detection to check for SPM
        // SPM will only show if symptoms indicate menstruation between J-5 and J-1
        if (typeof window.autoShowMenstrualSymptoms === 'function') {
            window.autoShowMenstrualSymptoms();
            console.log('✅ Auto-detection called for SPM');
        }
    }
}

/**
 * Handle symptom badge click (0-10)
 */
function selectSymptomValue(symptom, value) {
    selectedSymptoms[symptom] = value;
    
    // Update button styles for this symptom
    document.querySelectorAll(`.symptom-badge[data-symptom="${symptom}"]`).forEach(btn => {
        btn.style.background = 'white';
        btn.style.borderColor = '#e5e7eb';
        btn.style.color = '#374151';
    });
    
    const selectedBtn = document.querySelector(`.symptom-badge[data-symptom="${symptom}"][data-value="${value}"]`);
    if (selectedBtn) {
        selectedBtn.style.background = '#fce7f3';
        selectedBtn.style.borderColor = '#ec4899';
        selectedBtn.style.color = '#be123c';
        selectedBtn.style.fontWeight = '700';
    }
    
    // Update the display value
    const valueDisplay = document.getElementById(`${symptom}Value`);
    if (valueDisplay) {
        valueDisplay.textContent = value;
    }
    
    console.log(`Symptôme ${symptom} sélectionné: ${value}`);
}

/**
 * Handle SPM badge click (0-10)
 */
function selectSpmValue(symptom, value) {
    // Update button styles for this symptom
    document.querySelectorAll(`.spm-badge[data-symptom="${symptom}"]`).forEach(btn => {
        btn.style.background = 'white';
        btn.style.borderColor = '#e5e7eb';
        btn.style.color = '#374151';
    });
    
    const selectedBtn = document.querySelector(`.spm-badge[data-symptom="${symptom}"][data-value="${value}"]`);
    if (selectedBtn) {
        selectedBtn.style.background = '#fce7f3';
        selectedBtn.style.borderColor = '#ec4899';
        selectedBtn.style.color = '#be123c';
        selectedBtn.style.fontWeight = '700';
    }
    
    console.log(`SPM ${symptom} sélectionné: ${value}`);
}

/**
 * Initialize cycle badges event listeners
 */
function initCycleBadges() {
    // Cycle day buttons
    const cycleDayBtns = document.querySelectorAll('.cycle-day-btn');
    console.log('🔄 Cycle Badges: Found', cycleDayBtns.length, 'cycle day buttons');
    
    cycleDayBtns.forEach((btn, index) => {
        console.log('🔄 Attaching listener to button', index, 'day=', btn.getAttribute('data-day'));
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('✅ Cycle day button clicked!', btn.getAttribute('data-day'));
            const day = parseInt(btn.getAttribute('data-day'));
            selectCycleDay(day);
        });
    });
    
    // Symptom badges
    const symptomBadges = document.querySelectorAll('.symptom-badge');
    console.log('🔄 Cycle Badges: Found', symptomBadges.length, 'symptom badges');
    
    symptomBadges.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const symptom = btn.getAttribute('data-symptom');
            const value = parseInt(btn.getAttribute('data-value'));
            selectSymptomValue(symptom, value);
        });
    });
    
    // SPM badges
    const spmBadges = document.querySelectorAll('.spm-badge');
    console.log('🔄 Cycle Badges: Found', spmBadges.length, 'SPM badges');
    
    spmBadges.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const symptom = btn.getAttribute('data-symptom');
            const value = parseInt(btn.getAttribute('data-value'));
            selectSpmValue(symptom, value);
        });
    });
    
    console.log('✅ Cycle Badges initialisé');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCycleBadges);
} else {
    initCycleBadges();
}
