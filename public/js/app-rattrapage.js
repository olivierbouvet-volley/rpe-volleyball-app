// Gestion des onglets de rattrapage pour Check-in
function showCheckinSubTab(tab) {
    // Masquer toutes les cartes
    document.getElementById('checkinTodayCard').style.display = 'none';
    document.getElementById('checkinYesterdayCard').style.display = 'none';
    document.getElementById('checkinDayBeforeCard').style.display = 'none';
    
    // Réinitialiser les styles des boutons
    document.getElementById('checkinTodayBtn').style.background = '';
    document.getElementById('checkinTodayBtn').style.color = '';
    document.getElementById('checkinYesterdayBtn').style.background = '';
    document.getElementById('checkinYesterdayBtn').style.color = '';
    document.getElementById('checkinDayBeforeBtn').style.background = '';
    document.getElementById('checkinDayBeforeBtn').style.color = '';
    
    // Afficher la carte sélectionnée et mettre en surbrillance le bouton
    if (tab === 'today') {
        document.getElementById('checkinTodayCard').style.display = 'block';
        document.getElementById('checkinTodayBtn').style.background = 'var(--color-primary)';
        document.getElementById('checkinTodayBtn').style.color = 'white';
    } else if (tab === 'yesterday') {
        document.getElementById('checkinYesterdayCard').style.display = 'block';
        document.getElementById('checkinYesterdayBtn').style.background = 'var(--color-primary)';
        document.getElementById('checkinYesterdayBtn').style.color = 'white';
    } else if (tab === 'daybefore') {
        document.getElementById('checkinDayBeforeCard').style.display = 'block';
        document.getElementById('checkinDayBeforeBtn').style.background = 'var(--color-primary)';
        document.getElementById('checkinDayBeforeBtn').style.color = 'white';
    }
}

// Gestion des onglets de rattrapage pour RPE
function showRpeSubTab(tab) {
    // Masquer toutes les cartes
    document.getElementById('rpeTodayCard').style.display = 'none';
    document.getElementById('rpeYesterdayCard').style.display = 'none';
    document.getElementById('rpeDayBeforeCard').style.display = 'none';
    
    // Réinitialiser les styles des boutons
    document.getElementById('rpeTodayBtn').style.background = '';
    document.getElementById('rpeTodayBtn').style.color = '';
    document.getElementById('rpeYesterdayBtn').style.background = '';
    document.getElementById('rpeYesterdayBtn').style.color = '';
    document.getElementById('rpeDayBeforeBtn').style.background = '';
    document.getElementById('rpeDayBeforeBtn').style.color = '';
    
    // Afficher la carte sélectionnée et mettre en surbrillance le bouton
    if (tab === 'today') {
        document.getElementById('rpeTodayCard').style.display = 'block';
        document.getElementById('rpeTodayBtn').style.background = 'var(--color-primary)';
        document.getElementById('rpeTodayBtn').style.color = 'white';
    } else if (tab === 'yesterday') {
        document.getElementById('rpeYesterdayCard').style.display = 'block';
        document.getElementById('rpeYesterdayBtn').style.background = 'var(--color-primary)';
        document.getElementById('rpeYesterdayBtn').style.color = 'white';
    } else if (tab === 'daybefore') {
        document.getElementById('rpeDayBeforeCard').style.display = 'block';
        document.getElementById('rpeDayBeforeBtn').style.background = 'var(--color-primary)';
        document.getElementById('rpeDayBeforeBtn').style.color = 'white';
    }
}

// Fonction pour obtenir la date de J-1 ou J-2
function getDateOffset(daysAgo) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
}

// Initialiser les listeners pour les sliders de Check-in Yesterday
document.addEventListener('DOMContentLoaded', function() {
    // Check-in Yesterday sliders
    const sleepYesterday = document.getElementById('sleepQualityYesterday');
    const sorenessYesterday = document.getElementById('sorenessYesterday');
    const stressYesterday = document.getElementById('stressYesterday');
    const moodYesterday = document.getElementById('moodYesterday');
    const commentYesterday = document.getElementById('checkinCommentYesterday');
    
    if (sleepYesterday) {
        sleepYesterday.addEventListener('input', (e) => {
            document.getElementById('sleepValueYesterday').textContent = e.target.value;
        });
    }
    
    if (sorenessYesterday) {
        sorenessYesterday.addEventListener('input', (e) => {
            document.getElementById('sorenessValueYesterday').textContent = e.target.value;
        });
    }
    
    if (stressYesterday) {
        stressYesterday.addEventListener('input', (e) => {
            document.getElementById('stressValueYesterday').textContent = e.target.value;
        });
    }
    
    if (moodYesterday) {
        moodYesterday.addEventListener('input', (e) => {
            document.getElementById('moodValueYesterday').textContent = e.target.value;
        });
    }
    
    if (commentYesterday) {
        commentYesterday.addEventListener('input', (e) => {
            document.getElementById('commentCountYesterday').textContent = e.target.value.length;
        });
    }
    
    // Check-in Day Before sliders
    const sleepDayBefore = document.getElementById('sleepQualityDayBefore');
    const sorenessDayBefore = document.getElementById('sorenessDayBefore');
    const stressDayBefore = document.getElementById('stressDayBefore');
    const moodDayBefore = document.getElementById('moodDayBefore');
    const commentDayBefore = document.getElementById('checkinCommentDayBefore');
    
    if (sleepDayBefore) {
        sleepDayBefore.addEventListener('input', (e) => {
            document.getElementById('sleepValueDayBefore').textContent = e.target.value;
        });
    }
    
    if (sorenessDayBefore) {
        sorenessDayBefore.addEventListener('input', (e) => {
            document.getElementById('sorenessValueDayBefore').textContent = e.target.value;
        });
    }
    
    if (stressDayBefore) {
        stressDayBefore.addEventListener('input', (e) => {
            document.getElementById('stressValueDayBefore').textContent = e.target.value;
        });
    }
    
    if (moodDayBefore) {
        moodDayBefore.addEventListener('input', (e) => {
            document.getElementById('moodValueDayBefore').textContent = e.target.value;
        });
    }
    
    if (commentDayBefore) {
        commentDayBefore.addEventListener('input', (e) => {
            document.getElementById('commentCountDayBefore').textContent = e.target.value.length;
        });
    }
    
    // RPE Yesterday sliders
    const rpeYesterday = document.getElementById('rpeValueYesterday');
    const rpeCommentYesterday = document.getElementById('rpeCommentYesterday');
    
    if (rpeYesterday) {
        rpeYesterday.addEventListener('input', (e) => {
            document.getElementById('rpeValueDisplayYesterday').textContent = e.target.value;
        });
    }
    
    if (rpeCommentYesterday) {
        rpeCommentYesterday.addEventListener('input', (e) => {
            document.getElementById('rpeCommentCountYesterday').textContent = e.target.value.length;
        });
    }
    
    // RPE Day Before sliders
    const rpeDayBefore = document.getElementById('rpeValueDayBefore');
    const rpeCommentDayBefore = document.getElementById('rpeCommentDayBefore');
    
    if (rpeDayBefore) {
        rpeDayBefore.addEventListener('input', (e) => {
            document.getElementById('rpeValueDisplayDayBefore').textContent = e.target.value;
        });
    }
    
    if (rpeCommentDayBefore) {
        rpeCommentDayBefore.addEventListener('input', (e) => {
            document.getElementById('rpeCommentCountDayBefore').textContent = e.target.value.length;
        });
    }

    // === Gestion des formulaires Check-in ===
    
    // Gestion du formulaire Check-in Yesterday
    const checkinYesterdayForm = document.getElementById('checkinYesterdayForm');
    if (checkinYesterdayForm) {
        checkinYesterdayForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const sleep = parseInt(document.getElementById('sleepQualityYesterday').value);
            const soreness = parseInt(document.getElementById('sorenessYesterday').value);
            const stress = parseInt(document.getElementById('stressYesterday').value);
            const mood = parseInt(document.getElementById('moodYesterday').value);
            const energy = parseInt(document.getElementById('energyYesterday').value);
            const comment = document.getElementById('checkinCommentYesterday').value.trim();
            
            // Vérifier que toutes les valeurs ont été sélectionnées (pas 0)
            if (sleep === 0 || soreness === 0 || stress === 0 || mood === 0 || energy === 0) {
                alert('Veuillez sélectionner une valeur pour chaque critère (cliquez sur une pastille).');
                return;
            }
            
            const score = Math.round((sleep + (10 - soreness) + (10 - stress) + mood) / 4);
            const yesterday = getDateOffset(1);
            
            // Vérifier si la date est en période de repos
            if (typeof isRestDay === 'function') {
                const restInfo = await isRestDay(yesterday);
                if (restInfo.isRest) {
                    alert(`⏸️ Cette date est en période de repos : ${restInfo.message}\n\nLe Check-in n'est pas disponible, mais vous pouvez enregistrer vos activités sportives via le formulaire RPE.`);
                    return;
                }
            }
            
            try {
                const checkinData = {
                    playerId: appState.currentUser,
                    date: yesterday,
                    sleep: sleep,
                    soreness: soreness,
                    stress: stress,
                    mood: mood,
                    energy: energy,
                    score: score,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                if (comment) {
                    checkinData.comment = comment;
                }
                
                await db.collection('checkins').add(checkinData);
                
                console.log('✅ Check-in J-1 enregistré:', checkinData);
                alert('Check-in de la veille enregistré avec succès !');
                document.getElementById('checkinYesterdayForm').reset();
                // Réinitialiser les pastilles
                if (typeof refreshRatingBadges === 'function') {
                    refreshRatingBadges();
                }
                document.getElementById('commentCountYesterday').textContent = '0';
            } catch (error) {
                console.error('Erreur lors de l\'enregistrement du check-in:', error);
                alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
            }
        });
    }

    // Gestion du formulaire Check-in Day Before
    const checkinDayBeforeForm = document.getElementById('checkinDayBeforeForm');
    if (checkinDayBeforeForm) {
        checkinDayBeforeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const sleep = parseInt(document.getElementById('sleepQualityDayBefore').value);
            const soreness = parseInt(document.getElementById('sorenessDayBefore').value);
            const stress = parseInt(document.getElementById('stressDayBefore').value);
            const mood = parseInt(document.getElementById('moodDayBefore').value);
            const energy = parseInt(document.getElementById('energyDayBefore').value);
            const comment = document.getElementById('checkinCommentDayBefore').value.trim();
            
            // Vérifier que toutes les valeurs ont été sélectionnées (pas 0)
            if (sleep === 0 || soreness === 0 || stress === 0 || mood === 0 || energy === 0) {
                alert('Veuillez sélectionner une valeur pour chaque critère (cliquez sur une pastille).');
                return;
            }
            
            const score = Math.round((sleep + (10 - soreness) + (10 - stress) + mood) / 4);
            const dayBefore = getDateOffset(2);
            
            // Vérifier si la date est en période de repos
            if (typeof isRestDay === 'function') {
                const restInfo = await isRestDay(dayBefore);
                if (restInfo.isRest) {
                    alert(`⏸️ Cette date est en période de repos : ${restInfo.message}\n\nLe Check-in n'est pas disponible, mais vous pouvez enregistrer vos activités sportives via le formulaire RPE.`);
                    return;
                }
            }
            
            try {
                const checkinData = {
                    playerId: appState.currentUser,
                    date: dayBefore,
                    sleep: sleep,
                    soreness: soreness,
                    stress: stress,
                    mood: mood,
                    energy: energy,
                    score: score,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                if (comment) {
                    checkinData.comment = comment;
                }
                
                await db.collection('checkins').add(checkinData);
                
                console.log('✅ Check-in J-2 enregistré:', checkinData);
                alert('Check-in de l\'avant-veille enregistré avec succès !');
                document.getElementById('checkinDayBeforeForm').reset();
                // Réinitialiser les pastilles
                if (typeof refreshRatingBadges === 'function') {
                    refreshRatingBadges();
                }
                document.getElementById('commentCountDayBefore').textContent = '0';
            } catch (error) {
                console.error('Erreur lors de l\'enregistrement du check-in:', error);
                alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
            }
        });
    }

    // === Gestion des formulaires RPE ===
    
    // Gestion du formulaire RPE Yesterday
    const rpeYesterdayForm = document.getElementById('rpeYesterdayForm');
    if (rpeYesterdayForm) {
        rpeYesterdayForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const sessionType = document.getElementById('sessionTypeYesterday').value;
            const rpe = parseInt(document.getElementById('rpeValueYesterday').value);
            const duration = parseInt(document.getElementById('durationYesterday').value);
            const performance = parseInt(document.getElementById('performanceYesterday').value);
            const comment = document.getElementById('rpeCommentYesterday').value.trim();
            
            // Validations
            if (!sessionType) {
                alert('Veuillez sélectionner un type de session.');
                return;
            }
            if (rpe === 0 || isNaN(rpe)) {
                alert('Veuillez sélectionner une valeur pour l\'effort ressenti (cliquez sur une pastille).');
                return;
            }
            if (!duration || duration <= 0) {
                alert('Veuillez entrer une durée valide.');
                return;
            }
            if (performance === 0 || isNaN(performance)) {
                alert('Veuillez sélectionner une valeur pour votre performance (cliquez sur une pastille).');
                return;
            }
            
            const yesterday = getDateOffset(1);
            
            try {
                // CAS SPÉCIAL: Muscu+Volley → Créer 2 entrées RPE
                if (sessionType === 'Muscu+Volley') {
                    const muscuDuration = 45;
                    const volleyDuration = duration - muscuDuration;
                    
                    if (volleyDuration <= 0) {
                        alert('La durée totale doit être supérieure à 45 minutes pour Muscu + Volley.');
                        return;
                    }
                    
                    // 1. Entrée Prépa Physique (45 min)
                    await db.collection('rpe').add({
                        playerId: appState.currentUser,
                        date: yesterday,
                        sessionType: 'Preparation Physique',
                        rpe: rpe,
                        duration: muscuDuration,
                        load: rpe * muscuDuration,
                        performance: performance,
                        comment: comment ? `[Muscu+Volley] ${comment}` : '[Muscu+Volley]',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // 2. Entrée Entraînement Volley
                    await db.collection('rpe').add({
                        playerId: appState.currentUser,
                        date: yesterday,
                        sessionType: 'Entrainement',
                        rpe: rpe,
                        duration: volleyDuration,
                        load: rpe * volleyDuration,
                        performance: performance,
                        comment: comment ? `[Muscu+Volley] ${comment}` : '[Muscu+Volley]',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('✅ RPE Muscu+Volley J-1 enregistré');
                    alert(`RPE Muscu + Volley (J-1) enregistré !\n• Prépa Physique: 45 min\n• Entraînement: ${volleyDuration} min`);
                    
                } else {
                    // CAS NORMAL
                    const rpeData = {
                        playerId: appState.currentUser,
                        date: yesterday,
                        sessionType: sessionType,
                        rpe: rpe,
                        duration: duration,
                        load: rpe * duration,
                        performance: performance,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    if (comment) {
                        rpeData.comment = comment;
                    }
                    
                    await db.collection('rpe').add(rpeData);
                    console.log('✅ RPE J-1 enregistré:', rpeData);
                    alert('RPE de la veille enregistré avec succès !');
                }
                
                document.getElementById('rpeYesterdayForm').reset();
                if (typeof resetRpeFormYesterday === 'function') {
                    resetRpeFormYesterday();
                }
                if (typeof refreshRatingBadges === 'function') {
                    refreshRatingBadges();
                }
                document.getElementById('rpeCommentCountYesterday').textContent = '0';
            } catch (error) {
                console.error('Erreur lors de l\'enregistrement du RPE:', error);
                alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
            }
        });
    }

    // Gestion du formulaire RPE Day Before
    const rpeDayBeforeForm = document.getElementById('rpeDayBeforeForm');
    if (rpeDayBeforeForm) {
        rpeDayBeforeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const sessionType = document.getElementById('sessionTypeDayBefore').value;
            const rpe = parseInt(document.getElementById('rpeValueDayBefore').value);
            const duration = parseInt(document.getElementById('durationDayBefore').value);
            const performance = parseInt(document.getElementById('performanceDayBefore').value);
            const comment = document.getElementById('rpeCommentDayBefore').value.trim();
            
            // Validations
            if (!sessionType) {
                alert('Veuillez sélectionner un type de session.');
                return;
            }
            if (rpe === 0 || isNaN(rpe)) {
                alert('Veuillez sélectionner une valeur pour l\'effort ressenti (cliquez sur une pastille).');
                return;
            }
            if (!duration || duration <= 0) {
                alert('Veuillez entrer une durée valide.');
                return;
            }
            if (performance === 0 || isNaN(performance)) {
                alert('Veuillez sélectionner une valeur pour votre performance (cliquez sur une pastille).');
                return;
            }
            
            const dayBefore = getDateOffset(2);
            
            try {
                // CAS SPÉCIAL: Muscu+Volley → Créer 2 entrées RPE
                if (sessionType === 'Muscu+Volley') {
                    const muscuDuration = 45;
                    const volleyDuration = duration - muscuDuration;
                    
                    if (volleyDuration <= 0) {
                        alert('La durée totale doit être supérieure à 45 minutes pour Muscu + Volley.');
                        return;
                    }
                    
                    // 1. Entrée Prépa Physique (45 min)
                    await db.collection('rpe').add({
                        playerId: appState.currentUser,
                        date: dayBefore,
                        sessionType: 'Preparation Physique',
                        rpe: rpe,
                        duration: muscuDuration,
                        load: rpe * muscuDuration,
                        performance: performance,
                        comment: comment ? `[Muscu+Volley] ${comment}` : '[Muscu+Volley]',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    // 2. Entrée Entraînement Volley
                    await db.collection('rpe').add({
                        playerId: appState.currentUser,
                        date: dayBefore,
                        sessionType: 'Entrainement',
                        rpe: rpe,
                        duration: volleyDuration,
                        load: rpe * volleyDuration,
                        performance: performance,
                        comment: comment ? `[Muscu+Volley] ${comment}` : '[Muscu+Volley]',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    
                    console.log('✅ RPE Muscu+Volley J-2 enregistré');
                    alert(`RPE Muscu + Volley (J-2) enregistré !\n• Prépa Physique: 45 min\n• Entraînement: ${volleyDuration} min`);
                    
                } else {
                    // CAS NORMAL
                    const rpeData = {
                        playerId: appState.currentUser,
                        date: dayBefore,
                        sessionType: sessionType,
                        rpe: rpe,
                        duration: duration,
                        load: rpe * duration,
                        performance: performance,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    if (comment) {
                        rpeData.comment = comment;
                    }
                    
                    await db.collection('rpe').add(rpeData);
                    console.log('✅ RPE J-2 enregistré:', rpeData);
                    alert('RPE de l\'avant-veille enregistré avec succès !');
                }
                
                document.getElementById('rpeDayBeforeForm').reset();
                if (typeof resetRpeFormDayBefore === 'function') {
                    resetRpeFormDayBefore();
                }
                if (typeof refreshRatingBadges === 'function') {
                    refreshRatingBadges();
                }
                document.getElementById('rpeCommentCountDayBefore').textContent = '0';
            } catch (error) {
                console.error('Erreur lors de l\'enregistrement du RPE:', error);
                alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
            }
        });
    }
});

console.log('Module Rattrapage chargé');