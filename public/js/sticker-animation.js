/**
 * Animation de révélation de stickers - RPE Volleyball
 * Effet "salle de volleyball" avec flip 3D
 */

console.log('🎬 Chargement sticker-animation.js');

/**
 * Affiche l'animation de révélation d'un sticker
 * @param {Object} sticker - Définition du sticker (from STICKER_DEFINITIONS)
 */
function showStickerAnimation(sticker) {
    console.log(`🎖️ Animation sticker: ${sticker.name}`);

    // Créer le modal s'il n'existe pas
    let modal = document.getElementById('stickerRevealModal');
    if (!modal) {
        modal = createStickerModal();
        document.body.appendChild(modal);
    }

    // Remplir le contenu
    populateStickerModal(modal, sticker);

    // Afficher le modal avec animation
    setTimeout(() => {
        modal.classList.add('active');
        animateStickerReveal(sticker);
    }, 100);

    // Auto-close après 10 secondes
    const autoCloseTimeout = setTimeout(() => {
        closeStickerModal();
    }, 10000);

    // Bouton fermer
    const closeBtn = modal.querySelector('.sticker-close-btn');
    closeBtn.onclick = () => {
        clearTimeout(autoCloseTimeout);
        closeStickerModal();
    };

    // Fermer avec Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            clearTimeout(autoCloseTimeout);
            closeStickerModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

/**
 * Crée la structure HTML du modal
 */
function createStickerModal() {
    const modal = document.createElement('div');
    modal.id = 'stickerRevealModal';
    modal.className = 'sticker-modal';
    
    modal.innerHTML = `
        <div class="sticker-overlay"></div>
        <div class="volleyball-court-bg">
            <div class="court-lines"></div>
            <div class="spotlight-effect"></div>
            
            <div class="sticker-card-container">
                <div class="sticker-card" data-rarity="common">
                    <div class="card-inner">
                        <div class="card-front">
                            <div class="card-glow"></div>
                            <div class="question-mark">?</div>
                        </div>
                        <div class="card-back">
                            <div class="sticker-image-container">
                                <img src="" alt="" class="sticker-image">
                            </div>
                            <h2 class="sticker-name"></h2>
                            <p class="sticker-description"></p>
                            <div class="rarity-badge"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <button class="sticker-close-btn">Continuer</button>
        </div>
    `;
    
    return modal;
}

/**
 * Remplit le modal avec les données du sticker
 */
function populateStickerModal(modal, sticker) {
    const card = modal.querySelector('.sticker-card');
    const image = modal.querySelector('.sticker-image');
    const name = modal.querySelector('.sticker-name');
    const description = modal.querySelector('.sticker-description');
    const badge = modal.querySelector('.rarity-badge');

    // Définir la rareté
    card.setAttribute('data-rarity', sticker.rarity);

    // Image
    image.src = sticker.image;
    image.alt = sticker.name;

    // Textes
    name.textContent = sticker.name;
    description.textContent = sticker.description;

    // Badge rareté
    const rarityLabels = {
        common: 'COMMUN',
        rare: 'RARE',
        legendary: 'LÉGENDAIRE'
    };
    badge.textContent = rarityLabels[sticker.rarity];
}

/**
 * Lance l'animation de révélation
 */
function animateStickerReveal(sticker) {
    const card = document.querySelector('.sticker-card');
    const spotlight = document.querySelector('.spotlight-effect');
    
    // Séquence d'animation
    setTimeout(() => {
        spotlight.classList.add('active');
    }, 300);

    setTimeout(() => {
        card.classList.add('flipped');
    }, 800);

    // Effet confetti pour rare/legendary
    if (sticker.rarity === 'rare' || sticker.rarity === 'legendary') {
        setTimeout(() => {
            triggerConfetti(sticker.rarity);
        }, 1500);
    }

    // Vibration mobile
    if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
    }
}

/**
 * Déclenche l'effet confetti
 */
function triggerConfetti(rarity) {
    // Créer des éléments confetti simples
    const confettiContainer = document.createElement('div');
    confettiContainer.className = 'confetti-container';
    document.getElementById('stickerRevealModal').appendChild(confettiContainer);

    const colors = rarity === 'legendary' 
        ? ['#FFD700', '#FFA500', '#FF8C00'] // Or
        : ['#4169E1', '#1E90FF', '#00BFFF']; // Bleu

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti-piece';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confettiContainer.appendChild(confetti);
    }

    // Nettoyer après 4 secondes
    setTimeout(() => {
        confettiContainer.remove();
    }, 4000);
}

/**
 * Ferme le modal avec animation
 */
function closeStickerModal() {
    const modal = document.getElementById('stickerRevealModal');
    if (modal) {
        modal.classList.remove('active');
        
        // Supprimer complètement le modal après l'animation
        setTimeout(() => {
            modal.remove();
        }, 500);
    }
}

// Exposer globalement
window.showStickerAnimation = showStickerAnimation;

console.log('✅ Sticker animation loaded');
