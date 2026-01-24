/**
 * Module de gestion du mode fullscreen pour le graphique du cycle menstruel
 * Permet d'afficher le graphique en plein écran pour meilleure lisibilité sur mobile
 */

let fullscreenChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    setupCycleChartFullscreen();
});

function setupCycleChartFullscreen() {
    const fullscreenBtn = document.getElementById('cycleChartFullscreenBtn');
    const modal = document.getElementById('cycleChartFullscreenModal');
    const closeBtn = document.getElementById('cycleChartCloseFullscreenBtn');
    
    if (!fullscreenBtn || !modal || !closeBtn) return;
    
    // Ouvrir le modal fullscreen
    fullscreenBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCycleChartFullscreen();
    });
    
    // Fermer le modal
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeCycleChartFullscreen();
    });
    
    // Fermer en cliquant en dehors
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCycleChartFullscreen();
        }
    });
    
    // Fermer avec la touche Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display !== 'none') {
            closeCycleChartFullscreen();
        }
    });
}

function openCycleChartFullscreen() {
    const modal = document.getElementById('cycleChartFullscreenModal');
    const container = document.getElementById('cycleChartFullscreenContainer');
    
    if (!modal || !container) return;
    
    // Vérifier si le chart existe et a des données
    if (typeof cycleChartInstance === 'undefined' || !cycleChartInstance) {
        console.log('Cycle chart non disponible - affichage message');
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--color-text-secondary);"><div style="font-size: 32px; margin-bottom: 8px;">📊</div><p>Commencez à enregistrer vos données pour voir votre cycle</p></div>';
        modal.style.display = 'block';
        return;
    }
    
    // Vider le conteneur
    container.innerHTML = '';
    
    // Créer une nouvelle canvas pour le fullscreen
    const canvas = document.createElement('canvas');
    canvas.id = 'cycleChartFullscreen';
    container.appendChild(canvas);
    
    // Récupérer la config du chart original de manière sécurisée
    let config;
    try {
        // Récupérer directement de cycleChartInstance qui est un objet Chart.js
        const originalChart = cycleChartInstance;
        
        // Créer une copie profonde de la config (structuredClone plus performant que JSON)
        config = {
            type: originalChart.config.type,
            data: {
                labels: originalChart.data.labels ? [...originalChart.data.labels] : [],
                datasets: originalChart.data.datasets ? originalChart.data.datasets.map(ds => ({
                    label: ds.label,
                    data: ds.data ? [...ds.data] : [],
                    borderColor: ds.borderColor,
                    backgroundColor: ds.backgroundColor,
                    fill: ds.fill,
                    tension: ds.tension,
                    borderDash: ds.borderDash ? [...ds.borderDash] : undefined,
                    pointRadius: ds.pointRadius,
                    pointBackgroundColor: ds.pointBackgroundColor,
                    yAxisID: ds.yAxisID
                })) : []
            },
            options: JSON.parse(JSON.stringify(originalChart.config.options || {}, (key, value) => {
                // Exclure les fonctions lors de la sérialisation
                if (typeof value === 'function') {
                    return undefined;
                }
                return value;
            }))
        };
        
        // Adapter les options pour le fullscreen
        config.options.responsive = true;
        config.options.maintainAspectRatio = false;
    } catch (e) {
        console.error('Erreur lors de la copie de la config du chart:', e);
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--color-text-secondary);"><div style="font-size: 32px; margin-bottom: 8px;">⚠️</div><p>Impossible de charger le graphique. Rechargez la page.</p></div>';
        modal.style.display = 'block';
        return;
    }
    
    // Créer le nouveau chart
    try {
        const ctx = canvas.getContext('2d');
        fullscreenChartInstance = new Chart(ctx, config);
    } catch (e) {
        console.error('Erreur lors de la création du chart fullscreen:', e);
        container.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--color-text-secondary);"><div style="font-size: 32px; margin-bottom: 8px;">⚠️</div><p>Erreur lors de l\'affichage du graphique</p></div>';
    }
    
    // Afficher le modal
    modal.style.display = 'block';
    
    // Forcer le redimensionnement du chart avec requestAnimationFrame (plus optimal)
    requestAnimationFrame(() => {
        if (fullscreenChartInstance) {
            fullscreenChartInstance.resize();
        }
    });
}

function closeCycleChartFullscreen() {
    const modal = document.getElementById('cycleChartFullscreenModal');
    const container = document.getElementById('cycleChartFullscreenContainer');
    
    if (!modal) return;
    
    // Détruire le chart fullscreen
    if (fullscreenChartInstance) {
        fullscreenChartInstance.destroy();
        fullscreenChartInstance = null;
    }
    
    // Vider le conteneur
    if (container) {
        container.innerHTML = '';
    }
    
    // Masquer le modal
    modal.style.display = 'none';
}

// Redessiner le chart fullscreen si le window se redimensionne (avec debouncing)
let orientationTimeout;
window.addEventListener('orientationchange', () => {
    const modal = document.getElementById('cycleChartFullscreenModal');
    if (fullscreenChartInstance && modal && modal.style.display !== 'none') {
        // Debounce pour éviter les appels multiples
        clearTimeout(orientationTimeout);
        orientationTimeout = setTimeout(() => {
            requestAnimationFrame(() => {
                if (fullscreenChartInstance) {
                    fullscreenChartInstance.resize();
                }
            });
        }, 300);
    }
});
