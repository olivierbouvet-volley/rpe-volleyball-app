/**
 * Motivational Quotes Module
 * Affiche une phrase de motivation aléatoire à chaque ouverture de l'app
 */

(function() {
const motivationalQuotes = [
    // Aboutissement & Objectifs
    "Chaque goutte d'eau compte pour former l'océan.",
    "Les petits pas d'aujourd'hui sont les grands bonds de demain.",
    "Ton engagement d'aujourd'hui sera ta force de demain.",
    "Tout ce que tu fais compte, même si tu le penses petit.",
    "Persévérance rime avec excellence.",
    
    // Santé & Corps
    "Un corps écouté est un athlète avisé.",
    "Écoute ton corps, il te parle.",
    "Ta récupération est aussi importante que ton entraînement.",
    "Prendre soin de soi n'est pas de l'égoïsme, c'est de la sagesse.",
    "Bien dormir, c'est bien performer.",
    
    // Mentalité & Motivation
    "Les champions sont faits de discipline et de passion.",
    "La douleur est temporaire, la fierté est éternelle.",
    "Tu es plus forte que tu ne le crois.",
    "Crois en toi comme tes coachs croient en toi.",
    "L'impossible n'existe que pour ceux qui n'essaient pas.",
    
    // Cycle Hormonal (spécifique au projet)
    "Comprendre ton cycle, c'est te comprendre.",
    "Ton cycle n'est pas une faiblesse, c'est ta force cachée.",
    "Adapter ton entraînement à ton cycle, c'est être intelligente.",
    "Chaque jour du cycle a son pouvoir.",
    "Tes données aujourd'hui feront ta prochaine victoire.",
    
    // Équipe & Collectif
    "Seule tu es rapide, ensemble vous êtes invincible.",
    "L'équipe gagne quand chacun donne le meilleur de soi.",
    "Ta meilleure version rend ton équipe meilleure.",
    "Partager ses données aide tout le monde.",
    "L'union fait la force, le partage fait la victoire.",
    
    // Positivité & Approche
    "Transforme tes défis en opportunités.",
    "Chaque jour est une nouvelle chance.",
    "Vise haut, mais apprécie chaque progression.",
    "Les meilleures athlètes sont celles qui apprennent de chaque session.",
    "La perfection n'existe pas, l'excellence oui.",
    
    // Routine & Habitudes
    "La constance est le secret des champions.",
    "5 minutes par jour, c'est 35 heures par an.",
    "Ton log de ce soir sera ta tendance de demain.",
    "Les routines créent les légendes.",
    "Un jour sans log, c'est un jour sans données.",
    
    // Feminin & Empowerment
    "Les athlètes femmes sont des guerrières intelligentes.",
    "Tu n'as pas besoin de permission pour être excellente.",
    "Les filles qui tracent le chemin sont les plus courageuses.",
    "Ton potentiel n'a pas de limites.",
    "Sois l'athlète que tu admires.",
];

/**
 * Obtient une phrase de motivation aléatoire
 */
function getRandomQuote() {
    return motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
}

/**
 * Affiche une phrase de motivation dans le DOM
 * Le modal s'affiche une fois au chargement, puis peut être réaffiché via le bouton
 */
function displayMotivationalQuote() {
    // Créer ou récupérer le modal
    let quoteModal = document.getElementById('motivationalQuoteModal');
    
    if (!quoteModal) {
        quoteModal = document.createElement('div');
        quoteModal.id = 'motivationalQuoteModal';
        quoteModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-in-out;
        `;
        
        const quoteContainer = document.createElement('div');
        quoteContainer.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            padding: 40px 30px;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
            animation: slideUp 0.4s ease-out;
        `;
        
        // Icône/emoji inspirant
        const icon = document.createElement('div');
        icon.style.cssText = `
            font-size: 48px;
            margin-bottom: 15px;
        `;
        const icons = ['🔥', '💪', '⚡', '🌟', '🎯', '✨', '🚀'];
        icon.textContent = icons[Math.floor(Math.random() * icons.length)];
        
        // Texte de la phrase
        const quoteText = document.createElement('p');
        quoteText.id = 'motivationalQuoteText';
        quoteText.style.cssText = `
            font-size: 20px;
            font-weight: 600;
            color: white;
            margin: 0 0 30px 0;
            line-height: 1.6;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            letter-spacing: 0.5px;
        `;
        quoteText.textContent = getRandomQuote();
        
        // Boutons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
        `;
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Commençons ! 💪';
        closeBtn.style.cssText = `
            padding: 12px 25px;
            border: none;
            border-radius: 10px;
            background: var(--color-surface, white);
            color: #667eea;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        `;
        closeBtn.addEventListener('click', () => {
            quoteModal.style.animation = 'fadeOut 0.3s ease-out';
            setTimeout(() => {
                quoteModal.style.display = 'none';
            }, 300);
        });
        closeBtn.addEventListener('mouseover', () => {
            closeBtn.style.transform = 'scale(1.05)';
            closeBtn.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
        });
        closeBtn.addEventListener('mouseout', () => {
            closeBtn.style.transform = 'scale(1)';
            closeBtn.style.boxShadow = 'none';
        });
        
        const newQuoteBtn = document.createElement('button');
        newQuoteBtn.textContent = '🔄 Nouvelle';
        newQuoteBtn.style.cssText = `
            padding: 12px 25px;
            border: 2px solid white;
            border-radius: 10px;
            background: transparent;
            color: white;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
        `;
        newQuoteBtn.addEventListener('click', () => {
            quoteText.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => {
                quoteText.textContent = getRandomQuote();
                icon.textContent = icons[Math.floor(Math.random() * icons.length)];
                quoteText.style.animation = 'fadeIn 0.2s ease-in-out';
            }, 200);
        });
        newQuoteBtn.addEventListener('mouseover', () => {
            newQuoteBtn.style.background = 'rgba(255, 255, 255, 0.2)';
            newQuoteBtn.style.transform = 'scale(1.05)';
        });
        newQuoteBtn.addEventListener('mouseout', () => {
            newQuoteBtn.style.background = 'transparent';
            newQuoteBtn.style.transform = 'scale(1)';
        });
        
        buttonContainer.appendChild(closeBtn);
        buttonContainer.appendChild(newQuoteBtn);
        
        quoteContainer.appendChild(icon);
        quoteContainer.appendChild(quoteText);
        quoteContainer.appendChild(buttonContainer);
        quoteModal.appendChild(quoteContainer);
        document.body.appendChild(quoteModal);
        
        // Fermer avec Échap
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && quoteModal.style.display !== 'none') {
                quoteModal.style.display = 'none';
            }
        });
    } else {
        // Si le modal existe déjà, mettre à jour le texte et l'afficher
        document.getElementById('motivationalQuoteText').textContent = getRandomQuote();
        quoteModal.style.display = 'flex';
        quoteModal.style.animation = 'fadeIn 0.3s ease-in-out';
    }
}

/**
 * Affiche la phrase de motivation une seule fois par jour (stockée en localStorage)
 */
function showDailyMotivation() {
    const today = new Date().toDateString();
    const lastMotivationDate = localStorage.getItem('lastMotivationDate');
    
    if (lastMotivationDate !== today) {
        // Attendre que le DOM soit prêt
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => displayMotivationalQuote(), 500);
            });
        } else {
            setTimeout(() => displayMotivationalQuote(), 500);
        }
        
        localStorage.setItem('lastMotivationDate', today);
    }
}

/**
 * Crée un bouton pour afficher la phrase de motivation
 * À intégrer dans le header ou la navbar
 */
function createMotivationButton() {
    const btn = document.createElement('button');
    btn.id = 'dailyMotivationBtn';
    btn.title = 'Afficher une phrase de motivation';
    btn.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    `;
    btn.textContent = '✨ Motivation';
    btn.addEventListener('click', displayMotivationalQuote);
    btn.addEventListener('mouseover', () => {
        btn.style.transform = 'scale(1.08)';
        btn.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
    });
    btn.addEventListener('mouseout', () => {
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    });
    
    return btn;
}

// Ajouter les animations CSS
const motivationStyle = document.createElement('style');
motivationStyle.textContent = `
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    
    @keyframes fadeOut {
        from {
            opacity: 1;
        }
        to {
            opacity: 0;
        }
    }
    
    @keyframes slideUp {
        from {
            transform: translateY(30px);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(motivationStyle);

// Exports
window.showDailyMotivation = showDailyMotivation;
window.displayMotivationalQuote = displayMotivationalQuote;
window.createMotivationButton = createMotivationButton;

console.log('✅ Motivational Quotes Module chargé');
})();
