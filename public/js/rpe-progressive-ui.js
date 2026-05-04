/**
 * RPE Progressive UI - Interface progressive pour le formulaire RPE
 * Étape 1: Sélection du type d'activité (boutons colorés)
 * Étape 2: Effort ressenti (pastilles)
 * Étape 3: Durée (boutons ronds)
 * Étape 4: Performance (pastilles)
 * Étape 5: Commentaire et soumission
 */

// Configuration des couleurs par type d'activité
const ACTIVITY_COLORS = {
    'Entrainement': { bg: '#3b82f6', text: 'Entraînement', emoji: '🏐' },
    'Match': { bg: '#ef4444', text: 'Match', emoji: '🏆' },
    'Preparation Physique': { bg: '#10b981', text: 'Prépa Physique', emoji: '💪' },
    'Muscu+Volley': { bg: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)', text: 'Muscu + Volley', emoji: '💪🏐' },
    'Recuperation Active': { bg: '#8b5cf6', text: 'Récupération', emoji: '🧘' },
    'Activite Physique Annexe': { bg: '#f59e0b', text: 'Activité Annexe', emoji: '🚴' }
};

// ========================================
// FORMULAIRE RPE AUJOURD'HUI
// ========================================

function initRpeProgressiveUI() {
    console.log('RPE Progressive UI: Initialisation...');
    
    // Boutons d'activité - Aujourd'hui
    document.querySelectorAll('.activity-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = this.dataset.value;
            document.getElementById('sessionType').value = value;
            
            // Afficher/masquer les questions spécifiques au match
            if (typeof renderMatchQuestions === 'function') {
                renderMatchQuestions(value);
            }
            
            // Masquer étape 1, afficher étape 2
            document.getElementById('rpeStep1').style.display = 'none';
            document.getElementById('rpeStep2').style.display = 'block';
            
            // Afficher le badge de l'activité sélectionnée
            const config = ACTIVITY_COLORS[value];
            const badge = document.getElementById('selectedActivityBadge');
            badge.textContent = `${config.emoji} ${config.text}`;
            badge.style.background = config.bg;
            badge.style.color = 'white';
            // Pastilles déjà initialisées au chargement, pas besoin de réinitialiser
        });
    });
    
    // Boutons de durée - Aujourd'hui
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const minutes = this.dataset.minutes;
            document.getElementById('duration').value = minutes;
            
            // Désélectionner tous les boutons
            document.querySelectorAll('.duration-btn').forEach(b => {
                b.style.border = '3px solid #e5e7eb';
                b.style.background = 'white';
                b.style.color = '#374151';
            });
            
            // Sélectionner ce bouton
            this.style.border = '3px solid #3b82f6';
            this.style.background = '#3b82f6';
            this.style.color = 'white';
            
            // Masquer étape 3, afficher étape 4
            document.getElementById('rpeStep3').style.display = 'none';
            document.getElementById('rpeStep4').style.display = 'block';
            // Pastilles déjà initialisées au chargement, pas besoin de réinitialiser
        });
    });
    
    // Observer les changements de valeur pour l'effort ressenti
    const rpeValueSlider = document.getElementById('rpeValue');
    if (rpeValueSlider) {
        // Observer via MutationObserver car la valeur est changée par les pastilles
        const observer = new MutationObserver(() => {
            const value = parseInt(rpeValueSlider.value);
            if (value > 0) {
                // Afficher étape 3 après sélection de l'effort
                document.getElementById('rpeStep3').style.display = 'block';
            }
        });
        observer.observe(rpeValueSlider, { attributes: true, attributeFilter: ['value'] });
        
        // Aussi écouter l'événement change
        rpeValueSlider.addEventListener('change', function() {
            if (parseInt(this.value) > 0) {
                document.getElementById('rpeStep3').style.display = 'block';
            }
        });
    }
    
    // Observer les changements de valeur pour la performance
    const performanceSlider = document.getElementById('performance');
    if (performanceSlider) {
        const observer = new MutationObserver(() => {
            const value = parseInt(performanceSlider.value);
            if (value > 0) {
                // Afficher étape 5 après sélection de la performance
                document.getElementById('rpeStep5').style.display = 'block';
            }
        });
        observer.observe(performanceSlider, { attributes: true, attributeFilter: ['value'] });
        
        performanceSlider.addEventListener('change', function() {
            if (parseInt(this.value) > 0) {
                document.getElementById('rpeStep5').style.display = 'block';
            }
        });
    }
    
    // Initialiser pour Rattrapage
    initRpeProgressiveUIRattrapage();
}

// Réinitialiser le formulaire RPE Aujourd'hui
window.resetRpeForm = function() {
    // Si l'UI ARENA a remplacé l'ancien formulaire, on ignore
    if (!document.getElementById('sessionType')) return;
    document.getElementById('sessionType').value = '';
    document.getElementById('rpeValue').value = '0';
    document.getElementById('duration').value = '';
    document.getElementById('performance').value = '0';
    
    document.getElementById('rpeStep1').style.display = 'block';
    document.getElementById('rpeStep2').style.display = 'none';
    document.getElementById('rpeStep3').style.display = 'none';
    document.getElementById('rpeStep4').style.display = 'none';
    document.getElementById('rpeStep5').style.display = 'none';
    
    // Masquer les questions de match
    const matchQuestionsContainer = document.getElementById('matchQuestions');
    if (matchQuestionsContainer) {
        matchQuestionsContainer.style.display = 'none';
        if (document.getElementById('matchWon')) document.getElementById('matchWon').value = '';
        if (document.getElementById('matchScore')) document.getElementById('matchScore').value = '';
        if (document.getElementById('timePlayed')) document.getElementById('timePlayed').value = '';
        if (document.getElementById('matchScoreGroup')) document.getElementById('matchScoreGroup').style.display = 'none';
        
        // Désélectionner les boutons
        document.querySelectorAll('.match-result-btn').forEach(btn => btn.classList.remove('selected'));
        document.querySelectorAll('.time-played-btn').forEach(btn => btn.classList.remove('selected'));
    }
    
    // Réinitialiser les boutons de durée
    document.querySelectorAll('.duration-btn').forEach(b => {
        b.style.border = '3px solid #e5e7eb';
        b.style.background = 'white';
        b.style.color = '#374151';
    });
    
    // Réinitialiser les pastilles
    if (typeof refreshRatingBadges === 'function') {
        refreshRatingBadges();
    }
};

// ========================================
// FORMULAIRE RPE RATTRAPAGE (avec calendrier)
// ========================================

function initRpeProgressiveUIRattrapage() {
    // Boutons d'activité - Rattrapage
    document.querySelectorAll('.activity-btn-rattrapage').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = this.dataset.value;
            document.getElementById('sessionTypeRattrapage').value = value;

            document.getElementById('rpeRattrapageStep1').style.display = 'none';
            document.getElementById('rpeRattrapageStep2').style.display = 'block';

            const config = ACTIVITY_COLORS[value];
            const badge = document.getElementById('selectedActivityBadgeRattrapage');
            badge.textContent = `${config.emoji} ${config.text}`;
            badge.style.background = config.bg;
            badge.style.color = 'white';

            if (typeof initRatingBadges === 'function') {
                setTimeout(initRatingBadges, 50);
            }
        });
    });

    // Boutons de durée - Rattrapage
    document.querySelectorAll('.duration-btn-rattrapage').forEach(btn => {
        btn.addEventListener('click', function() {
            const minutes = this.dataset.minutes;
            document.getElementById('durationRattrapage').value = minutes;

            document.querySelectorAll('.duration-btn-rattrapage').forEach(b => {
                b.style.border = '3px solid #e5e7eb';
                b.style.background = 'white';
                b.style.color = '#374151';
            });

            this.style.border = '3px solid #3b82f6';
            this.style.background = '#3b82f6';
            this.style.color = 'white';

            document.getElementById('rpeRattrapageStep3').style.display = 'none';
            document.getElementById('rpeRattrapageStep4').style.display = 'block';

            if (typeof initRatingBadges === 'function') {
                setTimeout(initRatingBadges, 50);
            }
        });
    });

    // Observer effort ressenti Rattrapage
    const rpeValueRattrapage = document.getElementById('rpeValueRattrapage');
    if (rpeValueRattrapage) {
        const observer = new MutationObserver(() => {
            if (parseInt(rpeValueRattrapage.value) > 0) {
                document.getElementById('rpeRattrapageStep3').style.display = 'block';
            }
        });
        observer.observe(rpeValueRattrapage, { attributes: true, attributeFilter: ['value'] });

        rpeValueRattrapage.addEventListener('change', function() {
            if (parseInt(this.value) > 0) {
                document.getElementById('rpeRattrapageStep3').style.display = 'block';
            }
        });
    }

    // Observer performance Rattrapage
    const performanceRattrapage = document.getElementById('performanceRattrapage');
    if (performanceRattrapage) {
        const observer = new MutationObserver(() => {
            if (parseInt(performanceRattrapage.value) > 0) {
                document.getElementById('rpeRattrapageStep5').style.display = 'block';
            }
        });
        observer.observe(performanceRattrapage, { attributes: true, attributeFilter: ['value'] });

        performanceRattrapage.addEventListener('change', function() {
            if (parseInt(this.value) > 0) {
                document.getElementById('rpeRattrapageStep5').style.display = 'block';
            }
        });
    }
}

// ========================================
// INITIALISATION
// ========================================

// Initialiser quand le DOM est prêt
document.addEventListener('DOMContentLoaded', function() {
    // Petit délai pour s'assurer que tout est chargé
    setTimeout(initRpeProgressiveUI, 100);
});

// Réinitialiser quand on change d'onglet RPE
window.addEventListener('load', function() {
    // Observer les changements de visibilité des cards RPE
    const rpeTodayCard = document.getElementById('rpeTodayCard');
    const rpeRattrapageCard = document.getElementById('rpeRattrapageCard');

    if (rpeTodayCard) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' && rpeTodayCard.style.display !== 'none') {
                    resetRpeForm();
                }
            });
        });
        observer.observe(rpeTodayCard, { attributes: true });
    }

    if (rpeRattrapageCard) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' && rpeRattrapageCard.style.display !== 'none') {
                    if (typeof resetRpeFormRattrapage === 'function') {
                        resetRpeFormRattrapage();
                    }
                    if (typeof initRattrapageCalendar === 'function') {
                        initRattrapageCalendar();
                    }
                }
            });
        });
        observer.observe(rpeRattrapageCard, { attributes: true });
    }
});

console.log('RPE Progressive UI chargé');
