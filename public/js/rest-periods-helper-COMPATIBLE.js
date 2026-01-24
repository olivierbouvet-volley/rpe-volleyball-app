// ============================================================================
// REST PERIODS HELPER - VERSION ULTRA-ROBUSTE
// ============================================================================

function openNewRestPeriodModal() {
    const modal = document.getElementById('restPeriodModal');
    if (modal) modal.style.display = 'flex';
}

window.restPeriodsData = [];

document.addEventListener('DOMContentLoaded', function() {
    console.log('Helper: Initialisation');
    loadRestPeriodsForPlayer();
    
    setInterval(function() {
        checkAndBlockCheckin();
    }, 5000);
    
    setTimeout(function() {
        checkAndBlockCheckin();
    }, 500);
});

async function loadRestPeriodsForPlayer() {
    try {
        const snapshot = await db.collection('rest_periods').get();
        window.restPeriodsData = [];
        
        snapshot.forEach(doc => {
            window.restPeriodsData.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        console.log('Helper: Periodes chargees:', window.restPeriodsData.length);
        window.restPeriodsData.forEach(p => {
            console.log('Helper: Periode -', 'Type:', p.type, 'Start:', p.startDate, 'End:', p.endDate, 'Weekend:', p.restPeriodWeekendsEnabled);
        });
        checkAndBlockCheckin();
        
    } catch (error) {
        console.error('Helper: Erreur chargement:', error);
    }
}

// Normaliser le type pour comparaison
function normalizeType(type) {
    if (!type) return '';
    return type.toLowerCase().trim().replace(/[\s\-_]/g, '');
}

function isDateInRestPeriod(dateString) {
    if (!window.restPeriodsData || window.restPeriodsData.length === 0) {
        console.log('Helper: Pas de periodes');
        return false;
    }
    
    // Parser la date en tant que date locale (sans timezone)
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setHours(0, 0, 0, 0);
    const dayOfWeek = date.getDay();
    
    // Log désactivé: Check date
    
    for (const period of window.restPeriodsData) {
        const normalizedType = normalizeType(period.type);
        
        // Log désactivé: Testing period
        
        // Tous les types avec dates (Vacances, Conge, Jours feries, Autre, etc)
        if ((normalizedType.includes('vacanc') || 
             normalizedType.includes('cong') || 
             normalizedType.includes('jour') || 
             normalizedType === 'autre' ||
             normalizedType !== '') && 
            period.startDate && period.endDate) {
            
            // Parser les dates en tant que dates locales (sans timezone)
            const [sYear, sMonth, sDay] = period.startDate.split('-').map(Number);
            const startDate = new Date(sYear, sMonth - 1, sDay);
            startDate.setHours(0, 0, 0, 0);
            
            const [eYear, eMonth, eDay] = period.endDate.split('-').map(Number);
            const endDate = new Date(eYear, eMonth - 1, eDay);
            endDate.setHours(23, 59, 59, 999);
            
            // Logs désactivés: Checking + Comparison
            
            if (date >= startDate && date <= endDate) {
                // Log désactivé: Match trouvé
                window.currentRestPeriodMessage = period.message || 'Période de repos active';
                return true;
            }
        }
        
        // Week-ends
        if ((normalizedType.includes('week') || normalizedType.includes('weekend')) && 
            period.restPeriodWeekendsEnabled === true) {
            
            // Log désactivé: Checking weekend
            
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                // Log désactivé: Weekend bloqué
                window.currentRestPeriodMessage = period.message || 'Week-end - Période de repos';
                return true;
            }
        }
    }
    
    // Pas de match (log désactivé pour réduire la pollution console)
    window.currentRestPeriodMessage = null;
    return false;
}

let lastCheckAndBlockExecution = null;
let checkAndBlockThrottled = false;

function checkAndBlockCheckin() {
    const today = new Date().toISOString().split('T')[0];
    
    // Throttle : max une exécution par seconde
    const now = Date.now();
    if (checkAndBlockThrottled && lastCheckAndBlockExecution && (now - lastCheckAndBlockExecution) < 1000) {
        return;
    }
    
    lastCheckAndBlockExecution = now;
    checkAndBlockThrottled = true;
    
    const isBlocked = isDateInRestPeriod(today);
    
    console.log('Helper: Verification Check-in - Bloque:', isBlocked, 'Date:', today);
    
    let checkinButton = null;
    
    // Methode 1: ID direct
    checkinButton = document.getElementById('checkinButton');
    if (checkinButton) console.log('Helper: Bouton trouve par ID');
    
    // Methode 2: Chercher par texte
    if (!checkinButton) {
        const buttons = document.querySelectorAll('button');
        for (let btn of buttons) {
            const text = (btn.textContent || '').toLowerCase();
            if (text.includes('check-in') || text.includes('check in')) {
                checkinButton = btn;
                console.log('Helper: Bouton trouve par texte');
                break;
            }
        }
    }
    
    // Methode 3: Chercher par onclick
    if (!checkinButton) {
        const buttons = document.querySelectorAll('button[onclick*="Checkin"], button[onclick*="checkin"]');
        if (buttons.length > 0) {
            checkinButton = buttons[0];
            console.log('Helper: Bouton trouve par onclick');
        }
    }
    
    // Methode 4: Chercher par class
    if (!checkinButton) {
        checkinButton = document.querySelector('.checkin-btn, .checkin-button, [class*="checkin"]');
        if (checkinButton) console.log('Helper: Bouton trouve par class');
    }
    
    if (checkinButton) {
        if (isBlocked) {
            checkinButton.disabled = true;
            checkinButton.style.opacity = '0.5';
            checkinButton.style.cursor = 'not-allowed';
            checkinButton.style.backgroundColor = '#ccc';
            checkinButton.title = 'Check-in bloque pendant periode de repos';
            console.log('Helper: Check-in BLOQUE - style applique');
        } else {
            checkinButton.disabled = false;
            checkinButton.style.opacity = '1';
            checkinButton.style.cursor = 'pointer';
            checkinButton.style.backgroundColor = '';
            checkinButton.title = '';
            console.log('Helper: Check-in DEVERROUILLE');
        }
    } else {
        console.log('Helper: ATTENTION - Bouton check-in non trouve');
    }
    
    // Réinitialiser le throttle après 2 secondes
    setTimeout(() => {
        checkAndBlockThrottled = false;
    }, 2000);
    
    // Afficher le message de repos avec le message personnalisé
    const bannerDiv = document.getElementById('restPeriodBanner');
    if (bannerDiv) {
        if (isBlocked && window.currentRestPeriodMessage) {
            bannerDiv.innerHTML = `
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                    <div style="font-size: 18px; font-weight: 600; margin-bottom: 10px;">⏸️ Période de repos</div>
                    <div style="font-size: 15px; line-height: 1.5; margin-bottom: 10px;">${window.currentRestPeriodMessage}</div>
                    <div style="font-size: 13px; opacity: 0.9; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.3);">
                        ℹ️ Le formulaire RPE reste accessible pour enregistrer vos activités sportives
                    </div>
                </div>
            `;
            bannerDiv.style.display = 'block';
        } else {
            bannerDiv.style.display = 'none';
        }
    }
}

window.isRestDay = function(dateString) {
    const isBlocked = isDateInRestPeriod(dateString);
    
    if (isBlocked && window.currentRestPeriodMessage) {
        return {
            isRest: true,
            message: window.currentRestPeriodMessage
        };
    }
    
    return {
        isRest: isBlocked,
        message: isBlocked ? 'Période de repos active' : ''
    };
};

function openRestPeriodModal() {
    openNewRestPeriodModal();
}

window.updateRestPeriodsInHelper = function(periods) {
    window.restPeriodsData = periods || [];
    console.log('Helper: Periodes mises a jour:', window.restPeriodsData.length);
    checkAndBlockCheckin();
};

console.log('Module Rest Periods Helper (ultra-robuste) charge');
