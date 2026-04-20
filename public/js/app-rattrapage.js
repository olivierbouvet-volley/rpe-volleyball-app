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
    const rattrapageCard = document.getElementById('rpeRattrapageCard');
    if (rattrapageCard) rattrapageCard.style.display = 'none';
    const deleteCard = document.getElementById('rpeDeleteCard');
    if (deleteCard) deleteCard.style.display = 'none';

    // Réinitialiser les styles des boutons
    document.getElementById('rpeTodayBtn').style.background = '';
    document.getElementById('rpeTodayBtn').style.color = '';
    const rattrapageBtn = document.getElementById('rpeRattrapageBtn');
    if (rattrapageBtn) {
        rattrapageBtn.style.background = '';
        rattrapageBtn.style.color = '';
    }
    const deleteBtn = document.getElementById('rpeDeleteBtn');
    if (deleteBtn) {
        deleteBtn.style.background = '#e74c3c';
        deleteBtn.style.color = 'white';
    }

    // Afficher la carte sélectionnée et mettre en surbrillance le bouton
    if (tab === 'today') {
        document.getElementById('rpeTodayCard').style.display = 'block';
        document.getElementById('rpeTodayBtn').style.background = 'var(--color-primary)';
        document.getElementById('rpeTodayBtn').style.color = 'white';
    } else if (tab === 'rattrapage') {
        if (rattrapageCard) {
            rattrapageCard.style.display = 'block';
            // Initialiser le calendrier avec la date d'hier par défaut
            initRattrapageCalendar();
        }
        if (rattrapageBtn) {
            rattrapageBtn.style.background = 'var(--color-primary)';
            rattrapageBtn.style.color = 'white';
        }
    } else if (tab === 'delete') {
        if (deleteCard) {
            deleteCard.style.display = 'block';
            // Charger l'historique si la fonction existe
            if (typeof loadRpeHistoryForDelete === 'function') {
                loadRpeHistoryForDelete();
            }
        }
        if (deleteBtn) {
            deleteBtn.style.background = '#c0392b';
        }
    }
}

// Initialiser le calendrier de rattrapage
function initRattrapageCalendar() {
    const dateInput = document.getElementById('rattrapageDate');
    if (!dateInput) return;

    // Définir la date max (hier) et min (30 jours avant)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() - 30);

    dateInput.max = yesterday.toISOString().split('T')[0];
    dateInput.min = minDate.toISOString().split('T')[0];
    dateInput.value = yesterday.toISOString().split('T')[0];

    // Afficher le label de la date
    updateRattrapageDateLabel(yesterday);

    // Afficher l'étape 1 (type de session)
    document.getElementById('rpeRattrapageStep1').style.display = 'block';
}
window.initRattrapageCalendar = initRattrapageCalendar;

// Mettre à jour le label de la date sélectionnée
function updateRattrapageDateLabel(date) {
    const label = document.getElementById('rattrapageDateLabel');
    if (!label) return;

    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('fr-FR', options);
    label.textContent = '📅 ' + formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    label.style.display = 'block';
}

// Réinitialiser le formulaire Rattrapage
function resetRpeFormRattrapage() {
    document.getElementById('sessionTypeRattrapage').value = '';
    document.getElementById('rpeRattrapageStep1').style.display = 'block';
    document.getElementById('rpeRattrapageStep2').style.display = 'none';
    document.getElementById('rpeRattrapageStep3').style.display = 'none';
    document.getElementById('rpeRattrapageStep4').style.display = 'none';
    document.getElementById('rpeRattrapageStep5').style.display = 'none';

    // Réinitialiser les boutons d'activité
    document.querySelectorAll('.activity-btn-rattrapage').forEach(btn => {
        btn.style.opacity = '1';
        btn.style.transform = 'scale(1)';
    });
}
window.resetRpeFormRattrapage = resetRpeFormRattrapage;

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
    
    // RPE Rattrapage - Date change listener
    const rattrapageDate = document.getElementById('rattrapageDate');
    if (rattrapageDate) {
        rattrapageDate.addEventListener('change', (e) => {
            const selectedDate = new Date(e.target.value + 'T12:00:00');
            updateRattrapageDateLabel(selectedDate);
        });
    }

    // RPE Rattrapage - Activity buttons
    document.querySelectorAll('.activity-btn-rattrapage').forEach(btn => {
        btn.addEventListener('click', function() {
            const value = this.dataset.value;
            document.getElementById('sessionTypeRattrapage').value = value;

            // Animation de sélection
            document.querySelectorAll('.activity-btn-rattrapage').forEach(b => {
                b.style.opacity = '0.5';
                b.style.transform = 'scale(0.95)';
            });
            this.style.opacity = '1';
            this.style.transform = 'scale(1.05)';

            // Afficher l'étape 2
            document.getElementById('rpeRattrapageStep2').style.display = 'block';

            // Mettre à jour le badge
            const badge = document.getElementById('selectedActivityBadgeRattrapage');
            const colors = {
                'Entrainement': '#3b82f6',
                'Match': '#ef4444',
                'Preparation Physique': '#10b981',
                'Muscu+Volley': '#10b981',
                'Recuperation Active': '#8b5cf6',
                'Activite Physique Annexe': '#f59e0b'
            };
            const labels = {
                'Entrainement': '🏐 Entraînement',
                'Match': '🏆 Match',
                'Preparation Physique': '💪 Prépa Physique',
                'Muscu+Volley': '💪🏐 Muscu + Volley',
                'Recuperation Active': '🧘 Récupération',
                'Activite Physique Annexe': '🚴 Activité Annexe'
            };
            badge.textContent = labels[value] || value;
            badge.style.background = colors[value] || '#666';
            badge.style.color = 'white';

            // Initialiser les pastilles RPE pour rattrapage
            if (typeof initRatingBadgesForForm === 'function') {
                initRatingBadgesForForm('rpeRattrapageStep2', 'rpeValueRattrapage', 'rpeRattrapageStep3');
            }
        });
    });

    // RPE Rattrapage - Duration buttons
    document.querySelectorAll('.duration-btn-rattrapage').forEach(btn => {
        btn.addEventListener('click', function() {
            const minutes = this.dataset.minutes;
            document.getElementById('durationRattrapage').value = minutes;

            // Animation de sélection
            document.querySelectorAll('.duration-btn-rattrapage').forEach(b => {
                b.style.border = '3px solid #e5e7eb';
                b.style.background = 'white';
                b.style.color = 'inherit';
            });
            this.style.border = '3px solid var(--color-primary)';
            this.style.background = 'var(--color-primary)';
            this.style.color = 'white';

            // Afficher l'étape 4
            document.getElementById('rpeRattrapageStep4').style.display = 'block';

            // Initialiser les pastilles performance pour rattrapage
            if (typeof initRatingBadgesForForm === 'function') {
                initRatingBadgesForForm('rpeRattrapageStep4', 'performanceRattrapage', 'rpeRattrapageStep5');
            }
        });
    });

    // RPE Rattrapage - Comment counter
    const rpeCommentRattrapage = document.getElementById('rpeCommentRattrapage');
    if (rpeCommentRattrapage) {
        rpeCommentRattrapage.addEventListener('input', (e) => {
            document.getElementById('rpeCommentCountRattrapage').textContent = e.target.value.length;
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

    // === Gestion du formulaire RPE Rattrapage ===
    const rpeRattrapageForm = document.getElementById('rpeRattrapageForm');
    if (rpeRattrapageForm) {
        rpeRattrapageForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const selectedDate = document.getElementById('rattrapageDate').value;
            const sessionType = document.getElementById('sessionTypeRattrapage').value;
            const rpe = parseInt(document.getElementById('rpeValueRattrapage').value);
            const duration = parseInt(document.getElementById('durationRattrapage').value);
            const performance = parseInt(document.getElementById('performanceRattrapage').value);
            const comment = document.getElementById('rpeCommentRattrapage').value.trim();

            // Validations
            if (!selectedDate) {
                alert('Veuillez sélectionner une date.');
                return;
            }
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

            // Formater la date pour l'affichage
            const dateObj = new Date(selectedDate + 'T12:00:00');
            const dateFormatted = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

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
                        date: selectedDate,
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
                        date: selectedDate,
                        sessionType: 'Entrainement',
                        rpe: rpe,
                        duration: volleyDuration,
                        load: rpe * volleyDuration,
                        performance: performance,
                        comment: comment ? `[Muscu+Volley] ${comment}` : '[Muscu+Volley]',
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    console.log('✅ RPE Muscu+Volley enregistré pour', selectedDate);
                    alert(`RPE Muscu + Volley enregistré pour ${dateFormatted} !\n• Prépa Physique: 45 min\n• Entraînement: ${volleyDuration} min`);

                } else {
                    // CAS NORMAL
                    const rpeData = {
                        playerId: appState.currentUser,
                        date: selectedDate,
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
                    console.log('✅ RPE enregistré pour', selectedDate, ':', rpeData);
                    alert(`RPE enregistré avec succès pour ${dateFormatted} !`);
                }

                // Réinitialiser le formulaire
                document.getElementById('rpeRattrapageForm').reset();
                resetRpeFormRattrapage();
                if (typeof refreshRatingBadges === 'function') {
                    refreshRatingBadges();
                }
                document.getElementById('rpeCommentCountRattrapage').textContent = '0';

                // Réinitialiser le calendrier
                initRattrapageCalendar();

            } catch (error) {
                console.error('Erreur lors de l\'enregistrement du RPE:', error);
                alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
            }
        });
    }
});

console.log('Module Rattrapage chargé');