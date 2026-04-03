/**
 * Cycle Detection Module - Menstrual Detection & Irregular Cycles
 * 
 * Fonctionnalités :
 * - Gestion des cycles irréguliers (26-38 jours)
 * - Onglets J1-J5 pour détection rétroactive menstruation
 * - Détection automatique des symptômes menstruels (J1-J5)
 * - Calcul du jour du cycle basé sur les symptômes
 */

console.log('✅ Cycle Detection Module (J1-J5) chargé');

// ============================================================================
// CONFIGURATION CYCLES IRRÉGULIERS
// ============================================================================

/**
 * Récupère la configuration du cycle pour une joueuse
 * Prend en compte les cycles irréguliers (minDuration → maxDuration)
 */
async function getCycleConfig(playerId) {
    try {
        const doc = await db.collection('cycleProfiles').doc(playerId).get();
        
        if (!doc.exists) {
            return {
                minDuration: 25,      // Default
                maxDuration: 35,      // Default
                isRegular: true,
                lastPeriodDate: null
            };
        }
        
        const data = doc.data();
        
        // Gestion des cycles irréguliers
        const cycleDuration = data.cycleDuration || 28;
        const isRegular = data.isRegular !== false;
        
        // Si irrégulier : élargir la plage de 5 jours de chaque côté
        const minDuration = isRegular ? cycleDuration - 2 : Math.max(21, cycleDuration - 6);
        const maxDuration = isRegular ? cycleDuration + 2 : Math.min(40, cycleDuration + 6);
        
        return {
            minDuration,
            maxDuration,
            isRegular,
            lastPeriodDate: data.lastPeriodDate || null,
            cycleDuration
        };
        
    } catch (error) {
        console.error('❌ Erreur récupération config cycle:', error);
        return {
            minDuration: 25,
            maxDuration: 35,
            isRegular: true,
            lastPeriodDate: null
        };
    }
}

// ============================================================================
// DÉTECTION RÉTROACTIVE (J1-J5)
// ============================================================================

/**
 * Crée les onglets J1-J5 pour détection rétroactive menstruation
 * Permet de remplir les jours précédents en cas d'oubli
 */
window.initializeDateTabs = function() {
    const checkInForm = document.getElementById('checkInForm');
    if (!checkInForm) return;
    
    // Chercher ou créer le conteneur des onglets
    let tabContainer = document.getElementById('dateTabs');
    if (!tabContainer) {
        tabContainer = document.createElement('div');
        tabContainer.id = 'dateTabs';
        tabContainer.style.cssText = `
            display: flex;
            gap: 8px;
            margin-bottom: 20px;
            flex-wrap: wrap;
            background: #f9fafb;
            padding: 12px;
            border-radius: 8px;
        `;
        checkInForm.insertBefore(tabContainer, checkInForm.firstChild);
    }
    
    // Créer les 5 onglets (Aujourd'hui, J-1, J-2, J-3, J-4)
    const today = new Date();
    const tabs = [];
    
    for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        const dateStr = date.toISOString().split('T')[0];
        const dayName = ['Aujourd\'hui', 'Hier (J-1)', 'Avant-hier (J-2)', '(J-3)', '(J-4)'][i];
        
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.id = `tab-${dateStr}`;
        tab.className = 'date-tab';
        tab.dataset.date = dateStr;
        
        const dayShort = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'][date.getDay()];
        const dayNum = date.getDate();
        
        tab.innerHTML = `
            <div style="font-size: 11px; font-weight: 600; color: #6b7280;">${dayShort} ${dayNum}</div>
            <div style="font-size: 12px; color: #374151; margin-top: 2px;">${dayName}</div>
        `;
        
        tab.style.cssText = `
            padding: 8px 12px;
            border: 2px solid #e5e7eb;
            background: var(--color-surface, white);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            flex: 1;
            min-width: 70px;
            font-size: 12px;
            text-align: center;
        `;
        
        tab.onmouseover = () => {
            if (!tab.classList.contains('active')) {
                tab.style.borderColor = '#667eea';
                tab.style.background = '#f3f4f6';
            }
        };
        
        tab.onmouseout = () => {
            if (!tab.classList.contains('active')) {
                tab.style.borderColor = '#e5e7eb';
                tab.style.background = 'white';
            }
        };
        
        tab.onclick = (e) => {
            e.preventDefault();
            selectDateTab(dateStr, tab);
        };
        
        tabContainer.appendChild(tab);
        
        if (i === 0) {
            tab.classList.add('active');
            tab.style.borderColor = '#667eea';
            tab.style.background = '#667eea';
            tab.style.color = 'white';
            tab.querySelector('div:first-child').style.color = 'white';
            tab.querySelector('div:last-child').style.color = 'white';
        }
        
        tabs.push({ dateStr, tab });
    }
    
    // Stocker les onglets dans l'état global
    window.currentSelectedDate = tabs[0].dateStr;
};

/**
 * Sélectionne un onglet de date et met à jour le formulaire
 */
window.selectDateTab = function(dateStr, tabElement) {
    // Désélectionner tous les onglets
    document.querySelectorAll('.date-tab').forEach(tab => {
        tab.classList.remove('active');
        tab.style.borderColor = '#e5e7eb';
        tab.style.background = 'white';
        tab.querySelector('div:first-child').style.color = '#6b7280';
        tab.querySelector('div:last-child').style.color = '#374151';
    });
    
    // Sélectionner le nouvel onglet
    tabElement.classList.add('active');
    tabElement.style.borderColor = '#667eea';
    tabElement.style.background = '#667eea';
    tabElement.querySelector('div:first-child').style.color = 'white';
    tabElement.querySelector('div:last-child').style.color = 'white';
    
    // Mettre à jour la date sélectionnée
    window.currentSelectedDate = dateStr;
    
    console.log(`✅ Date sélectionnée: ${dateStr}`);
};

// ============================================================================
// DÉTECTION AUTOMATIQUE MENSTRUATION (J1-J5)
// ============================================================================

/**
 * Détecte automatiquement si la joueuse est en J1-J5 (menstruation)
 * basé sur les symptômes menstruels
 */
window.detectMenstruationPhase = function(symptoms) {
    // Symptômes typiques de menstruation (J1-J5)
    const menstrualSymptoms = {
        cramps: 0.3,        // Crampes utérines
        fatigue: 0.2,       // Fatigue
        backPain: 0.2,      // Douleurs dorsales
        headache: 0.15,     // Maux de tête
        bloating: 0.15      // Ballonnements
    };
    
    let menstrualScore = 0;
    let totalWeight = 0;
    
    for (const [symptom, weight] of Object.entries(menstrualSymptoms)) {
        if (symptoms[symptom] !== undefined) {
            const value = parseInt(symptoms[symptom]) || 0;
            // Score : symptôme élevé (>5) = plus probable menstruation
            menstrualScore += (value > 5 ? 1 : value / 10) * weight;
            totalWeight += weight;
        }
    }
    
    const probability = totalWeight > 0 ? (menstrualScore / totalWeight) : 0;
    
    return {
        isProbablyMenstruating: probability > 0.4,  // Seuil: 40%
        probability: (probability * 100).toFixed(0),
        score: menstrualScore.toFixed(2)
    };
};

/**
 * Affiche/masque automatiquement la section symptômes si J1-J5 détecté
 */
window.autoShowMenstrualSymptoms = function() {
    const hasPeriodYes = document.getElementById('hasPeriodYes');
    const spmSection = document.getElementById('spmSection');
    
    if (!hasPeriodYes || !spmSection) return;
    
    // Récupérer les symptômes actuels
    const symptoms = {
        cramps: document.getElementById('symptom_cramps')?.value || 0,
        fatigue: document.getElementById('symptom_fatigue')?.value || 0,
        backPain: document.getElementById('symptom_backPain')?.value || 0,
        headache: document.getElementById('symptom_headache')?.value || 0,
        bloating: document.getElementById('symptom_bloating')?.value || 0
    };
    
    const detection = window.detectMenstruationPhase(symptoms);
    
    // SPM devrait seulement s'afficher si :
    // 1. La joueuse répond "Non" (pas de menstruation certaine)
    // 2. Elle a des symptômes menstruels suggérant une menstruation
    // 3. Elle est entre J-5 et J-1 du cycle (5 jours avant à 1 jour avant les règles)
    
    // Pour vérifier J-5 à J-1, on vérifie si la phase détectée indique une menstruation imminente
    const isSPMPeriod = detection.isProbablyMenstruating && detection.probability > 40;
    
    if (isSPMPeriod) {
        spmSection.style.display = 'block';
        
        // Afficher une notification
        const alert = document.createElement('div');
        alert.style.cssText = `
            background: #fef2f2;
            border: 2px solid #fecaca;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            font-size: 13px;
            color: #991b1b;
        `;
        alert.innerHTML = `
            🔍 <strong>Détection menstruation (J-5 à J-1)</strong><br>
            Probabilité: ${detection.probability}% - Section symptômes ouverte automatiquement
        `;
        
        spmSection.insertBefore(alert, spmSection.firstChild);
        
        console.log(`✅ Menstruation probable détectée (${detection.probability}%) - SPM visible`);
    } else {
        // Cacher SPM si la détection ne montre pas de menstruation imminente
        spmSection.style.display = 'none';
        console.log(`❌ Pas de SPM détecté ou hors période J-5 à J-1`);
    }
};

// ============================================================================
// CALCUL JOUR DU CYCLE (basé sur lastPeriodDate)
// ============================================================================

/**
 * Calcule le jour du cycle actuel basé sur la date de début des règles
 */
window.calculateCycleDay = function(lastPeriodDate) {
    if (!lastPeriodDate) return null;
    
    const today = new Date();
    const startDate = new Date(lastPeriodDate);
    
    // Nombre de jours depuis le début des règles
    const diffTime = today - startDate;
    const dayOfCycle = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return dayOfCycle;
};

/**
 * Détermine la phase du cycle (Menstruation/Folliculaire/Ovulation/Lutéale)
 */
window.determineCyclePhase = function(dayOfCycle, cycleDuration = 28) {
    if (!dayOfCycle) return null;
    
    // NE PLUS NORMALISER - Garder le vrai jour même au-delà de cycleDuration
    const day = dayOfCycle;
    
    // Si le cycle est prolongé (J > cycleDuration), afficher un warning mais continuer
    const isExtended = day > cycleDuration;
    
    // Phases typiques pour un cycle de 28 jours (ajuster proportionnellement)
    const follicularDays = Math.round(9 * (cycleDuration / 28));  // ~9 jours
    const ovulationDays = Math.round(2 * (cycleDuration / 28));   // ~2 jours
    const lutealStart = follicularDays + ovulationDays + 1;
    
    if (day <= 5) {
        return { phase: 'Menstruation', emoji: '🔴', color: '#ef4444', isExtended };
    } else if (day <= follicularDays) {
        return { phase: 'Folliculaire', emoji: '🟢', color: '#10b981', isExtended };
    } else if (day <= follicularDays + ovulationDays) {
        return { phase: 'Ovulation', emoji: '🟡', color: '#f59e0b', isExtended };
    } else {
        return { phase: 'Lutéale', emoji: '🟣', color: '#a78bfa', isExtended };
    }
};

/**
 * Affiche le jour du cycle sur le dashboard
 */
window.displayCycleDay = function(playerId) {
    getCycleConfig(playerId).then(config => {
        if (!config.lastPeriodDate) return;
        
        const dayOfCycle = window.calculateCycleDay(config.lastPeriodDate);
        const phaseInfo = window.determineCyclePhase(dayOfCycle, config.cycleDuration);
        
        // Trouver ou créer l'élément affichage
        let cycleDisplay = document.getElementById('cycleDayDisplay');
        if (!cycleDisplay) {
            cycleDisplay = document.createElement('div');
            cycleDisplay.id = 'cycleDayDisplay';
            
            const dashboard = document.getElementById('playerDashboard') || 
                            document.querySelector('[id*="dashboard"]');
            if (dashboard) {
                dashboard.insertBefore(cycleDisplay, dashboard.firstChild);
            }
        }
        
        // Ajouter un avertissement si cycle prolongé
        const warningText = phaseInfo.isExtended ? ` ⚠️ Cycle prolongé (>${config.cycleDuration}j)` : '';
        
        cycleDisplay.style.cssText = `
            background: linear-gradient(135deg, ${phaseInfo.color}15, ${phaseInfo.color}25);
            border-left: 4px solid ${phaseInfo.color};
            padding: 12px;
            margin-bottom: 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
        `;
        
        cycleDisplay.innerHTML = `
            ${phaseInfo.emoji} <strong>Jour ${dayOfCycle}/${config.cycleDuration}</strong> - ${phaseInfo.phase}
        `;
        
        console.log(`✅ Jour du cycle affiché: J${dayOfCycle} (${phaseInfo.phase})`);
    });
};

// ============================================================================
// INITIALISATION
// ============================================================================

// Initialiser les onglets au chargement
let cycleDetectionRetries = 0;
let cycleDetectionInitialized = false;
const MAX_RETRIES = 20; // Max 10 secondes (20 * 500ms)

function initCycleDetection() {
    if (cycleDetectionInitialized) {
        console.log('⚠️ Cycle Detection déjà initialisé, ignoré');
        return;
    }
    
    console.log('🔄 Initialisation Cycle Detection...');
    
    // Attendre que le formulaire soit chargé
    const checkInForm = document.getElementById('checkInForm');
    
    if (checkInForm) {
        console.log('✅ checkInForm trouvé, création onglets...');
        cycleDetectionRetries = 0; // Réinitialiser le compteur
        cycleDetectionInitialized = true; // Marquer comme initialisé
        window.initializeDateTabs();
        
        // Écouter les changements de symptômes pour détection automatique
        setTimeout(() => {
            ['cramps', 'fatigue', 'backPain', 'headache', 'bloating'].forEach(symptom => {
                const el = document.getElementById(`symptom_${symptom}`);
                if (el) {
                    el.addEventListener('change', window.autoShowMenstrualSymptoms);
                }
            });
        }, 500);
    } else if (cycleDetectionRetries < MAX_RETRIES) {
        cycleDetectionRetries++;
        console.log(`⏳ checkInForm pas trouvé, réessai (${cycleDetectionRetries}/${MAX_RETRIES})...`);
        setTimeout(initCycleDetection, 500);
    } else {
        console.log('❌ checkInForm non trouvé après ' + MAX_RETRIES + ' tentatives. Module cycle-detection arrêté.');
        cycleDetectionInitialized = true; // Arrêter les tentatives
    }
}

// Lancer l'initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCycleDetection);
} else {
    initCycleDetection();
}

console.log('✅ Cycle Detection Module initialisé');
console.log('   - Onglets J1-J5 en création...');
console.log('   - Détection menstruation automatique active');
console.log('   - Cycles irréguliers supportés');
