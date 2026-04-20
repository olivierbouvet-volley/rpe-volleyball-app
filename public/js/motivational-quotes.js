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
            background: rgba(19, 52, 59, 0.55);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s ease-in-out;
        `;

        const quoteContainer = document.createElement('div');
        quoteContainer.style.cssText = `
            background: linear-gradient(150deg, #2180ac 0%, #145470 100%);
            border-radius: 16px;
            padding: 44px 36px 36px;
            max-width: 480px;
            width: 90%;
            box-shadow: 0 24px 64px rgba(19, 52, 59, 0.4), 0 2px 8px rgba(19, 52, 59, 0.2);
            text-align: center;
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
            overflow: hidden;
        `;

        // Guillemet décoratif en arrière-plan
        const decorQuote = document.createElement('div');
        decorQuote.style.cssText = `
            position: absolute;
            top: -10px;
            left: 20px;
            font-size: 120px;
            font-family: Georgia, 'Times New Roman', serif;
            color: rgba(255, 255, 255, 0.08);
            line-height: 1;
            pointer-events: none;
            user-select: none;
        `;
        decorQuote.textContent = '\u201C';

        // Ligne décorative
        const topLine = document.createElement('div');
        topLine.style.cssText = `
            width: 40px;
            height: 3px;
            background: rgba(255, 255, 255, 0.5);
            border-radius: 2px;
            margin: 0 auto 28px;
        `;

        // Texte de la phrase
        const quoteText = document.createElement('p');
        quoteText.id = 'motivationalQuoteText';
        quoteText.style.cssText = `
            font-size: 18px;
            font-weight: 500;
            color: white;
            margin: 0 0 36px 0;
            line-height: 1.65;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            letter-spacing: 0.1px;
            position: relative;
            z-index: 1;
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
        closeBtn.textContent = 'Commençons';
        closeBtn.style.cssText = `
            padding: 11px 28px;
            border: none;
            border-radius: 8px;
            background: white;
            color: #2180ac;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            font-family: 'Inter', -apple-system, sans-serif;
            letter-spacing: 0.1px;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        `;
        closeBtn.addEventListener('click', () => {
            quoteModal.style.animation = 'fadeOut 0.25s ease-out';
            setTimeout(() => {
                quoteModal.style.display = 'none';
            }, 250);
        });
        closeBtn.addEventListener('mouseover', () => {
            closeBtn.style.transform = 'translateY(-1px)';
            closeBtn.style.boxShadow = '0 4px 14px rgba(0,0,0,0.2)';
        });
        closeBtn.addEventListener('mouseout', () => {
            closeBtn.style.transform = 'translateY(0)';
            closeBtn.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        });

        const newQuoteBtn = document.createElement('button');
        newQuoteBtn.textContent = 'Nouvelle citation';
        newQuoteBtn.style.cssText = `
            padding: 11px 28px;
            border: 1.5px solid rgba(255, 255, 255, 0.5);
            border-radius: 8px;
            background: transparent;
            color: white;
            font-weight: 500;
            cursor: pointer;
            font-size: 14px;
            font-family: 'Inter', -apple-system, sans-serif;
            letter-spacing: 0.1px;
            transition: all 0.2s ease;
        `;
        newQuoteBtn.addEventListener('click', () => {
            quoteText.style.opacity = '0';
            quoteText.style.transform = 'translateY(6px)';
            setTimeout(() => {
                quoteText.textContent = getRandomQuote();
                quoteText.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
                quoteText.style.opacity = '1';
                quoteText.style.transform = 'translateY(0)';
            }, 200);
        });
        newQuoteBtn.addEventListener('mouseover', () => {
            newQuoteBtn.style.background = 'rgba(255, 255, 255, 0.12)';
            newQuoteBtn.style.borderColor = 'rgba(255, 255, 255, 0.75)';
        });
        newQuoteBtn.addEventListener('mouseout', () => {
            newQuoteBtn.style.background = 'transparent';
            newQuoteBtn.style.borderColor = 'rgba(255, 255, 255, 0.5)';
        });

        buttonContainer.appendChild(closeBtn);
        buttonContainer.appendChild(newQuoteBtn);

        quoteContainer.appendChild(decorQuote);
        quoteContainer.appendChild(topLine);
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
        background: #2180ac;
        border: none;
        color: white;
        padding: 7px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        font-family: 'Inter', -apple-system, sans-serif;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(33, 128, 172, 0.3);
    `;
    btn.textContent = 'Citation du jour';
    btn.addEventListener('click', displayMotivationalQuote);
    btn.addEventListener('mouseover', () => {
        btn.style.background = '#1a6a8e';
        btn.style.boxShadow = '0 4px 12px rgba(33, 128, 172, 0.4)';
    });
    btn.addEventListener('mouseout', () => {
        btn.style.background = '#2180ac';
        btn.style.boxShadow = '0 2px 8px rgba(33, 128, 172, 0.3)';
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
