// STATISTIQUES DE VOLUME D'ENTRAÎNEMENT

// ========================================
// GESTION DES PÉRIODES DE REPOS
// ========================================

// Compter les jours de repos dans une période
async function countRestDaysInPeriod(startDate, endDate) {
    try {
        let restDaysCount = 0;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Parcourir chaque jour de la période
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            if (typeof isRestDay === 'function') {
                const restInfo = await isRestDay(dateStr);
                if (restInfo.isRest) {
                    restDaysCount++;
                }
            }
        }
        
        return restDaysCount;
    } catch (error) {
        console.error('Erreur lors du comptage des jours de repos:', error);
        return 0;
    }
}

// Calculer le nombre de jours actifs (hors repos)
function getActiveDays(totalDays, restDays) {
    return Math.max(1, totalDays - restDays); // Minimum 1 pour éviter division par 0
}

// ========================================
// FONCTIONS DE CALCUL DES PÉRIODES
// ========================================

// Fonction pour obtenir le début et la fin de la semaine en cours
function getWeekRange() {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = dimanche, 1 = lundi, etc.
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
    };
}

// Fonction pour obtenir le début et la fin du mois en cours
function getMonthRange() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
    };
}

// Fonction pour obtenir le début et la fin de la saison sportive (septembre-août)
function getYearRange() {
    const now = new Date();
    const currentMonth = now.getMonth(); // 0 = janvier, 8 = septembre
    const currentYear = now.getFullYear();
    
    let seasonStartYear;
    
    // Si on est entre septembre et décembre, la saison a commencé cette année
    // Si on est entre janvier et août, la saison a commencé l'année dernière
    if (currentMonth >= 8) { // Septembre à Décembre (mois 8-11)
        seasonStartYear = currentYear;
    } else { // Janvier à Août (mois 0-7)
        seasonStartYear = currentYear - 1;
    }
    
    const firstDay = new Date(seasonStartYear, 8, 1); // 1er septembre
    const lastDay = new Date(seasonStartYear + 1, 7, 31); // 31 août
    
    return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
    };
}

// Calculer les heures d'entraînement pour une période donnée
async function calculateTrainingHours(playerId, startDate, endDate) {
    try {
        const rpeSnapshot = await db.collection('rpe')
            .where('playerId', '==', playerId)
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .get();
        
        let totalMinutes = 0;
        rpeSnapshot.forEach(doc => {
            const data = doc.data();
            totalMinutes += data.duration || 0;
        });
        
        return totalMinutes / 60; // Convertir en heures
    } catch (error) {
        console.error('Erreur lors du calcul des heures:', error);
        return 0;
    }
}

// Mettre à jour les statistiques de volume pour un joueur
async function updatePlayerVolumeStats(playerId) {
    try {
        // Calculer les statistiques hebdomadaires
        const weekRange = getWeekRange();
        const weeklyHours = await calculateTrainingHours(playerId, weekRange.start, weekRange.end);
        
        // Compter les jours de repos dans la semaine
        const totalDaysInWeek = 7;
        const restDaysInWeek = await countRestDaysInPeriod(weekRange.start, weekRange.end);
        const activeDaysInWeek = getActiveDays(totalDaysInWeek, restDaysInWeek);
        
        // Objectif hebdomadaire ajusté
        const weeklyTarget = (20 / 7) * activeDaysInWeek;
        const weeklyProgress = weeklyTarget > 0 ? Math.min((weeklyHours / weeklyTarget) * 100, 100) : 0;
        
        // Calculer les statistiques mensuelles
        const monthRange = getMonthRange();
        const monthlyHours = await calculateTrainingHours(playerId, monthRange.start, monthRange.end);
        
        // Compter les jours de repos dans le mois
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const restDaysInMonth = await countRestDaysInPeriod(monthRange.start, monthRange.end);
        const activeDaysInMonth = getActiveDays(daysInMonth, restDaysInMonth);
        
        // Objectif mensuel ajusté (environ 86.4h par mois = 20h * 52 semaines / 12 mois)
        const monthlyTarget = (86.4 / daysInMonth) * activeDaysInMonth;
        const monthlyProgress = monthlyTarget > 0 ? Math.min((monthlyHours / monthlyTarget) * 100, 100) : 0;
        
        // Calculer les statistiques annuelles
        const yearRange = getYearRange();
        const annualHours = await calculateTrainingHours(playerId, yearRange.start, yearRange.end);
        
        // Compter les jours de repos dans l'année
        const restDaysInYear = await countRestDaysInPeriod(yearRange.start, yearRange.end);
        const activeDaysInYear = getActiveDays(365, restDaysInYear);
        
        // Objectif annuel ajusté (720h par an proportionnel aux jours actifs)
        const annualTarget = (720 / 365) * activeDaysInYear;
        const annualProgress = annualTarget > 0 ? Math.min((annualHours / annualTarget) * 100, 100) : 0;
        
        // Mettre à jour l'affichage (avec vérifications null)
        const weeklyHoursEl = document.getElementById('weeklyHours');
        const weeklyGaugeEl = document.getElementById('weeklyGauge');
        
        if (weeklyHoursEl) weeklyHoursEl.textContent = weeklyHours.toFixed(1) + 'h';
        if (weeklyGaugeEl) weeklyGaugeEl.style.width = `${weeklyProgress}%`;
        
        // Ajouter une note sur les jours de repos si applicable
        if (restDaysInWeek > 0 && weeklyHoursEl) {
            const weeklyNote = document.getElementById('weeklyRestNote');
            if (!weeklyNote) {
                const note = document.createElement('p');
                note.id = 'weeklyRestNote';
                note.style.cssText = 'color: #666; font-size: 12px; margin-top: 5px; font-style: italic;';
                note.textContent = `⏸️ ${restDaysInWeek} jour(s) de repos exclus des calculs`;
                weeklyHoursEl.parentElement.appendChild(note);
            } else {
                weeklyNote.textContent = `⏸️ ${restDaysInWeek} jour(s) de repos exclus des calculs`;
            }
        }
        
        const monthlyHoursEl = document.getElementById('monthlyHours');
        if (monthlyHoursEl) monthlyHoursEl.textContent = monthlyHours.toFixed(1) + 'h';
        
        if (restDaysInMonth > 0 && monthlyHoursEl) {
            const monthlyNote = document.getElementById('monthlyRestNote');
            if (!monthlyNote) {
                const note = document.createElement('p');
                note.id = 'monthlyRestNote';
                note.style.cssText = 'color: #666; font-size: 12px; margin-top: 5px; font-style: italic;';
                note.textContent = `⏸️ ${restDaysInMonth} jour(s) de repos exclus des calculs`;
                monthlyHoursEl.parentElement.appendChild(note);
            } else {
                monthlyNote.textContent = `⏸️ ${restDaysInMonth} jour(s) de repos exclus des calculs`;
            }
        }
        
        const yearlyHoursEl = document.getElementById('yearlyHours');
        const yearlyGaugeEl = document.getElementById('yearlyGauge');
        
        if (yearlyHoursEl) yearlyHoursEl.textContent = annualHours.toFixed(1) + 'h';
        if (yearlyGaugeEl) yearlyGaugeEl.style.width = `${annualProgress}%`;
        
        if (restDaysInYear > 0 && yearlyHoursEl) {
            const annualNote = document.getElementById('annualRestNote');
            if (!annualNote) {
                const note = document.createElement('p');
                note.id = 'annualRestNote';
                note.style.cssText = 'color: #666; font-size: 12px; margin-top: 5px; font-style: italic;';
                note.textContent = `⏸️ ${restDaysInYear} jour(s) de repos exclus des calculs`;
                yearlyHoursEl.parentElement.appendChild(note);
            } else {
                annualNote.textContent = `⏸️ ${restDaysInYear} jour(s) de repos exclus des calculs`;
            }
        }
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour des statistiques:', error);
    }
}

