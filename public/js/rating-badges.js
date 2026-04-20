/**
 * Rating Badges - Pastilles de notation avec code couleur
 * Remplace les sliders par des pastilles cliquables 1-10
 * 
 * Code couleur RPE :
 * - 1-3 : Vert (facile)
 * - 4-6 : Orange (modéré)
 * - 7-8 : Rouge (difficile)
 * - 9-10 : Rouge foncé (très difficile)
 * 
 * Code couleur Check-in :
 * - Sommeil/Humeur : 1-4 rouge, 5-6 orange, 7-10 vert (plus = mieux)
 * - Stress/Courbatures : 1-4 vert, 5-6 orange, 7-10 rouge (plus = pire)
 */

// ============================================================================
// EVENT DELEGATION POUR LES PASTILLES
// ============================================================================
document.addEventListener('click', (e) => {
    // Vérifier si le clic est sur une pastille (bouton avec data-value)
    const badge = e.target.closest('button[data-value]');
    if (!badge) return; // Si ce n'est pas une pastille, ne rien faire et laisser l'event se propager
    
    // Vérifier si c'est une pastille de rating (container doit avoir id finissant par "Badges")
    const badgesContainer = badge.closest('div');
    
    if (!badgesContainer?.id?.endsWith('Badges')) {
        return; // Pas un container de badges rating, laisser l'event se propager
    }
    
    console.log(`✅ Clic pastille via delegation: ${badgesContainer.id}`);
    
    // Marquer que l'utilisateur est en interaction
    userInteracting = true;
    
    // Extraire l'ID du slider et la valeur
    const sliderId = badgesContainer.id.replace('Badges', '');
    const value = parseInt(badge.dataset.value);
    const config = RATING_CONFIG[sliderId];
    
    if (config) {
        console.log(`🎯 Delegation: ${sliderId} = ${value}`);
        selectBadge(sliderId, value, config.type);
    }
    
    // Libérer le flag après 1 seconde
    setTimeout(() => {
        userInteracting = false;
    }, 1000);
    
    e.stopPropagation();
}); // Mode bubble par défaut, pas capture

// Configuration des couleurs
const RATING_COLORS = {
    // RPE (effort) - Plus c'est haut, plus c'est difficile
    rpe: {
        1: '#22c55e', 2: '#22c55e', 3: '#22c55e',     // Vert
        4: '#f59e0b', 5: '#f59e0b', 6: '#f59e0b',     // Orange
        7: '#ef4444', 8: '#ef4444',                     // Rouge
        9: '#dc2626', 10: '#dc2626'                     // Rouge foncé
    },
    // Positif (sommeil, humeur) - Plus c'est haut, mieux c'est
    positive: {
        1: '#dc2626', 2: '#dc2626', 3: '#ef4444', 4: '#ef4444',  // Rouge
        5: '#f59e0b', 6: '#f59e0b',                               // Orange
        7: '#22c55e', 8: '#22c55e', 9: '#16a34a', 10: '#16a34a'  // Vert
    },
    // Négatif (stress, courbatures) - Plus c'est haut, pire c'est
    negative: {
        1: '#16a34a', 2: '#16a34a', 3: '#22c55e', 4: '#22c55e',  // Vert
        5: '#f59e0b', 6: '#f59e0b',                               // Orange
        7: '#ef4444', 8: '#ef4444', 9: '#dc2626', 10: '#dc2626'  // Rouge
    }
};

// Configuration des sliders à transformer
const RATING_CONFIG = {
    // Check-in aujourd'hui
    'sleepQuality': { type: 'positive', label: 'Sommeil', showLabel: true },
    'soreness': { type: 'negative', label: 'Courbatures', showLabel: true },
    'stress': { type: 'negative', label: 'Stress', showLabel: true },
    'mood': { type: 'positive', label: 'Humeur', showLabel: true },
    'energy': { type: 'positive', label: 'Énergie', showLabel: true },
    
    // Check-in hier
    'sleepQualityYesterday': { type: 'positive', label: 'Sommeil', showLabel: true },
    'sorenessYesterday': { type: 'negative', label: 'Courbatures', showLabel: true },
    'stressYesterday': { type: 'negative', label: 'Stress', showLabel: true },
    'moodYesterday': { type: 'positive', label: 'Humeur', showLabel: true },
    'energyYesterday': { type: 'positive', label: 'Énergie', showLabel: true },
    
    // Check-in avant-hier
    'sleepQualityDayBefore': { type: 'positive', label: 'Sommeil', showLabel: true },
    'sorenessDayBefore': { type: 'negative', label: 'Courbatures', showLabel: true },
    'stressDayBefore': { type: 'negative', label: 'Stress', showLabel: true },
    'moodDayBefore': { type: 'positive', label: 'Humeur', showLabel: true },
    'energyDayBefore': { type: 'positive', label: 'Énergie', showLabel: true },
    
    // RPE (Effort ressenti)
    'rpeValue': { type: 'rpe', label: 'Effort ressenti', showLabel: true },
    'rpeValueYesterday': { type: 'rpe', label: 'Effort ressenti', showLabel: true },
    'rpeValueDayBefore': { type: 'rpe', label: 'Effort ressenti', showLabel: true },
    
    // Performance (note positive)
    'performance': { type: 'positive', label: 'Performance', showLabel: true },
    'performanceYesterday': { type: 'positive', label: 'Performance', showLabel: true },
    'performanceDayBefore': { type: 'positive', label: 'Performance', showLabel: true },

    // RPE Rattrapage
    'rpeValueRattrapage': { type: 'rpe', label: 'Effort ressenti', showLabel: true },
    'performanceRattrapage': { type: 'positive', label: 'Performance', showLabel: true }
};

/**
 * Crée une ligne de pastilles pour remplacer un slider
 */
function createRatingBadges(sliderId, config) {
    const slider = document.getElementById(sliderId);
    if (!slider) {
        console.log('Rating Badges: Slider non trouvé -', sliderId);
        return;
    }
    
    // Ne pas pré-sélectionner de valeur - l'utilisateur doit cliquer
    // On met le slider à 0 pour indiquer "non rempli"
    slider.value = 0;
    
    const container = slider.parentElement;
    
    // Cacher le slider original
    slider.style.display = 'none';
    
    // Cacher l'affichage de valeur X/10 s'il existe
    const valueDisplays = container.querySelectorAll('div[style*="text-align"], div[style*="display:none"]');
    valueDisplays.forEach(el => el.style.display = 'none');
    
    // Créer le conteneur des pastilles
    const badgesContainer = document.createElement('div');
    badgesContainer.id = `${sliderId}Badges`;
    badgesContainer.style.cssText = `
        display: flex;
        justify-content: space-between;
        gap: 4px;
        margin: 10px 0;
        width: 100%;
    `;
    
    // Créer les 10 pastilles (taille 32px) - AUCUNE sélectionnée par défaut
    for (let i = 1; i <= 10; i++) {
        const badge = document.createElement('button');
        badge.type = 'button';
        badge.textContent = i;
        badge.dataset.value = i;
        
        const color = RATING_COLORS[config.type][i];
        
        // Toutes les pastilles sont NON sélectionnées au départ
        badge.style.cssText = `
            width: 32px;
            height: 32px;
            min-width: 32px;
            border-radius: 50%;
            border: 2px solid ${color};
            background-color: white;
            color: ${color};
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.15s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
        `;
        
        // Effet hover
        badge.addEventListener('mouseenter', () => {
            if (!badge.classList.contains('selected')) {
                badge.style.backgroundColor = color + '33';
            }
        });
        
        badge.addEventListener('mouseleave', () => {
            if (!badge.classList.contains('selected')) {
                badge.style.backgroundColor = 'white';
            }
        });
        
        // Événement de clic géré par event delegation au niveau document
        badgesContainer.appendChild(badge);
    }
    
    // Insérer après le slider
    slider.insertAdjacentElement('afterend', badgesContainer);
    
    return badgesContainer;
}

/**
 * Sélectionne une pastille et met à jour le slider caché
 */
function selectBadge(sliderId, value, type) {
    console.log(`🎯 selectBadge appelé: ${sliderId} = ${value}`);
    
    const slider = document.getElementById(sliderId);
    const badgesContainer = document.getElementById(`${sliderId}Badges`);
    
    if (!slider || !badgesContainer) {
        console.warn(`❌ selectBadge: slider ou container non trouvé`, {slider: !!slider, badgesContainer: !!badgesContainer});
        return;
    }
    
    // Mettre à jour le slider caché
    slider.value = value;
    
    // Déclencher l'événement input pour les listeners existants
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    slider.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Mettre à jour l'apparence des pastilles
    const badges = badgesContainer.querySelectorAll('button');
    badges.forEach(badge => {
        const badgeValue = parseInt(badge.dataset.value);
        const color = RATING_COLORS[type][badgeValue];
        const isSelected = badgeValue === value;
        
        badge.style.backgroundColor = isSelected ? color : 'white';
        badge.style.color = isSelected ? 'white' : color;
        badge.classList.toggle('selected', isSelected);
    });
    
    console.log(`✅ selectBadge: Pastille ${value} sélectionnée pour ${sliderId}`);
    
    // Déclencher l'affichage de l'étape suivante pour le RPE progressif
    triggerRpeNextStep(sliderId);
}

/**
 * Déclenche l'affichage de l'étape suivante dans le formulaire RPE progressif
 */
function triggerRpeNextStep(sliderId) {
    // RPE Aujourd'hui
    if (sliderId === 'rpeValue') {
        const step3 = document.getElementById('rpeStep3');
        if (step3) step3.style.display = 'block';
    }
    if (sliderId === 'performance') {
        const step5 = document.getElementById('rpeStep5');
        if (step5) step5.style.display = 'block';
    }
    
    // RPE Yesterday
    if (sliderId === 'rpeValueYesterday') {
        const step3 = document.getElementById('rpeYesterdayStep3');
        if (step3) step3.style.display = 'block';
    }
    if (sliderId === 'performanceYesterday') {
        const step5 = document.getElementById('rpeYesterdayStep5');
        if (step5) step5.style.display = 'block';
    }
    
    // RPE DayBefore
    if (sliderId === 'rpeValueDayBefore') {
        const step3 = document.getElementById('rpeDayBeforeStep3');
        if (step3) step3.style.display = 'block';
    }
    if (sliderId === 'performanceDayBefore') {
        const step5 = document.getElementById('rpeDayBeforeStep5');
        if (step5) step5.style.display = 'block';
    }

    // RPE Rattrapage
    if (sliderId === 'rpeValueRattrapage') {
        const step3 = document.getElementById('rpeRattrapageStep3');
        if (step3) step3.style.display = 'block';
    }
    if (sliderId === 'performanceRattrapage') {
        const step5 = document.getElementById('rpeRattrapageStep5');
        if (step5) step5.style.display = 'block';
    }
}

/**
 * Met à jour une pastille depuis l'extérieur (si le slider est changé programmatiquement)
 */
function updateBadgeFromSlider(sliderId) {
    const slider = document.getElementById(sliderId);
    const config = RATING_CONFIG[sliderId];
    
    if (!slider || !config) return;
    
    const value = parseInt(slider.value);
    selectBadge(sliderId, value, config.type);
}

// Flag pour ignorer les réinitialisations pendant une interaction utilisateur
let userInteracting = false;

/**
 * Initialise toutes les pastilles
 */
function initRatingBadges() {
    // Ignorer si l'utilisateur est en train d'interagir avec une pastille
    if (userInteracting) {
        console.log('⏸️ initRatingBadges: Interaction utilisateur en cours, ignorée');
        return;
    }
    
    console.log('Rating Badges: Initialisation...');
    console.log('Rating Badges: RATING_CONFIG a', Object.keys(RATING_CONFIG).length, 'entrées');
    
    let count = 0;
    Object.entries(RATING_CONFIG).forEach(([sliderId, config]) => {
        const slider = document.getElementById(sliderId);
        if (slider) {
            // Toujours recréer les badges (même s'ils existent déjà)
            const existingBadges = document.getElementById(`${sliderId}Badges`);
            if (existingBadges) {
                existingBadges.remove();
            }
            createRatingBadges(sliderId, config);
            count++;
            if (sliderId.includes('rpe') || sliderId.includes('performance')) {
                console.log(`✅ Rating Badges: ${sliderId} trouvé et transformé`);
            }
        } else {
            if (sliderId.includes('rpe') || sliderId.includes('performance')) {
                console.warn(`⚠️ Rating Badges: ${sliderId} NON TROUVÉ`);
            }
        }
    });
    
    console.log(`Rating Badges: ${count} sliders transformés en pastilles`);
}

/**
 * Réinitialise les pastilles (utile après changement de vue)
 */
function refreshRatingBadges() {
    console.log('Rating Badges: Rafraîchissement...');
    
    // Supprimer les anciens badges
    Object.keys(RATING_CONFIG).forEach(sliderId => {
        const badges = document.getElementById(`${sliderId}Badges`);
        if (badges) {
            badges.remove();
        }
        
        // Remettre le slider à 0 mais le garder caché
        const slider = document.getElementById(sliderId);
        if (slider) {
            slider.value = 0;
            slider.style.display = 'none';
        }
    });
    
    // Recréer avec délai plus long
    setTimeout(initRatingBadges, 200);
}

// Observer DÉSACTIVÉ - cause des réinitialisations intempestives
// La détection se fait maintenant par les onglets uniquement
function setupBadgesObserver() {
    console.log('🔍 MutationObserver désactivé pour éviter les réinitialisations');
    // Ne rien faire - on désactive le MutationObserver
}

// Intercepter les clics sur les onglets et boutons de navigation
function setupTabClickHandlers() {
    document.addEventListener('click', (e) => {
        const target = e.target;
        
        // Ignorer les clics sur les pastilles de notation
        if (target.closest('[data-value]')) {
            console.log('📌 setupTabClickHandlers: Clic sur pastille détecté, ignore');
            return;
        }
        
        // Ignorer ALL clics tant qu'on est dans un formulaire (rpeForm ou checkinForm)
        if (target.closest('#rpeForm, #checkinForm')) {
            console.log('📌 setupTabClickHandlers: Clic dans un formulaire, TOUS les clics ignorés');
            return;
        }
        
        // Seulement réinitialiser pour les clics sur les vrais boutons de navigation de haut niveau
        const tabButton = target.closest('[data-tab], .nav-tabs button, .tab-buttons button');
        if (tabButton) {
            console.log('📌 setupTabClickHandlers: Clic sur onglet de navigation détecté');
            setTimeout(initRatingBadges, 150);
        }
    });
}

// Initialisation au chargement - une seule fois
let badgesInitialized = false;
document.addEventListener('DOMContentLoaded', () => {
    console.log('Rating Badges: DOMContentLoaded');
    if (!badgesInitialized) {
        badgesInitialized = true;
        setTimeout(initRatingBadges, 500);
        setupBadgesObserver();
        setupTabClickHandlers();
    }
});

// Réinitialiser quand on change de vue
window.addEventListener('hashchange', () => {
    console.log('Rating Badges: hashchange');
    setTimeout(initRatingBadges, 300);
});

// Exposer les fonctions globalement
window.initRatingBadges = initRatingBadges;
window.refreshRatingBadges = refreshRatingBadges;
window.updateBadgeFromSlider = updateBadgeFromSlider;

console.log('Rating Badges module chargé');
