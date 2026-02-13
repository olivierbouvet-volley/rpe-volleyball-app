// ============================================================================
// REST PERIODS MANAGER - TOUS TYPES AVEC DATES
// ============================================================================

function openNewRestPeriodModal() {
    const modal = document.getElementById('restPeriodModal');
    if (modal) {
        const form = document.getElementById('restPeriodForm');
        if (form) form.reset();
        
        const idField = document.getElementById('restPeriodId');
        if (idField) idField.value = '';
        
        const titleField = document.getElementById('restPeriodModalTitle');
        if (titleField) titleField.textContent = 'Nouvelle Periode de Repos';
        
        const typeSelect = document.getElementById('restPeriodType');
        if (typeSelect) {
            typeSelect.value = '';
            showAllDateFields();
        }
        
        modal.style.display = 'flex';
        modal.style.pointerEvents = 'auto'; // Fix: permettre les clics
        console.log('Manager: Modal ouvert');
    }
}

// Afficher tous les champs de date (pour Vacances, Jours feries, etc)
function showAllDateFields() {
    const startDateInput = document.getElementById('restPeriodStartDate');
    const endDateInput = document.getElementById('restPeriodEndDate');
    const weekendCheckbox = document.getElementById('restPeriodWeekendsEnabled');
    
    // Afficher les champs dates
    if (startDateInput && startDateInput.parentElement) {
        startDateInput.parentElement.parentElement.style.display = 'block';
    }
    if (endDateInput && endDateInput.parentElement) {
        endDateInput.parentElement.parentElement.style.display = 'block';
    }
    // Cacher le checkbox week-end
    if (weekendCheckbox && weekendCheckbox.parentElement) {
        weekendCheckbox.parentElement.parentElement.style.display = 'none';
    }
}

// Afficher uniquement le checkbox week-end
function showWeekendField() {
    const startDateInput = document.getElementById('restPeriodStartDate');
    const endDateInput = document.getElementById('restPeriodEndDate');
    const weekendCheckbox = document.getElementById('restPeriodWeekendsEnabled');
    
    if (startDateInput && startDateInput.parentElement) {
        startDateInput.parentElement.parentElement.style.display = 'none';
    }
    if (endDateInput && endDateInput.parentElement) {
        endDateInput.parentElement.parentElement.style.display = 'none';
    }
    if (weekendCheckbox && weekendCheckbox.parentElement) {
        weekendCheckbox.parentElement.parentElement.style.display = 'block';
    }
}

// Gerer le changement de type
document.addEventListener('DOMContentLoaded', function() {
    console.log('Manager: Initialisation');
    
    const typeSelect = document.getElementById('restPeriodType');
    if (typeSelect) {
        typeSelect.addEventListener('change', function() {
            console.log('Manager: Type change:', this.value);
            
            if (this.value === 'Week-ends' || this.value === 'Week-end') {
                showWeekendField();
            } else {
                showAllDateFields();
            }
        });
    }
    
    loadRestPeriods();
});

// Fermer le modal
function closeRestPeriodModal() {
    const modal = document.getElementById('restPeriodModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Charger les periodes
async function loadRestPeriods() {
    try {
        const periodsSnapshot = await db.collection('rest_periods')
            .orderBy('createdAt', 'desc')
            .get();
        
        const periods = [];
        periodsSnapshot.forEach(doc => {
            periods.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        displayRestPeriodsTable(periods);
        
        if (window.updateRestPeriodsInHelper) {
            window.updateRestPeriodsInHelper(periods);
        }
        
        console.log('Manager: Periodes chargees:', periods.length);
        return periods;
    } catch (error) {
        console.error('Manager: Erreur chargement:', error);
        return [];
    }
}

// Afficher le tableau
function displayRestPeriodsTable(periods) {
    const tbody = document.getElementById('restPeriodsTableBody');
    if (!tbody) return;
    
    if (periods.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 24px; color: #7f8c8d;">Aucune periode configuree</td></tr>';
        return;
    }
    
    tbody.innerHTML = periods.map(period => {
        let typeLabel = period.type || 'Autre';
        let dateRange = '';
        
        if (period.type === 'Vacances' && period.startDate && period.endDate) {
            dateRange = period.startDate + ' - ' + period.endDate;
        } else if (period.type === 'Week-ends' || period.type === 'Week-end') {
            dateRange = 'Tous les samedis et dimanches';
        } else if ((period.type === 'Jours feries' || period.type === 'Jours féries' || period.type === 'Conge' || period.type === 'Congé') && period.startDate && period.endDate) {
            dateRange = period.startDate + ' - ' + period.endDate;
        } else if (period.startDate && period.endDate) {
            dateRange = period.startDate + ' - ' + period.endDate;
        } else {
            dateRange = '-';
        }
        
        return '<tr style="border-bottom: 1px solid #e0e0e0;">' +
            '<td style="padding: 15px;">' + typeLabel + '</td>' +
            '<td style="padding: 15px;">' + dateRange + '</td>' +
            '<td style="padding: 15px;">' + (period.restPeriodWeekendsEnabled ? 'Oui' : 'Non') + '</td>' +
            '<td style="padding: 15px;">' + (period.message || '-') + '</td>' +
            '<td style="padding: 15px; text-align: center;">' +
                '<button onclick="editRestPeriod(\'' + period.id + '\')" style="background: none; border: none; color: #3498db; cursor: pointer; margin-right: 10px;">Modifier</button>' +
                '<button onclick="deleteRestPeriod(\'' + period.id + '\')" style="background: none; border: none; color: #e74c3c; cursor: pointer;">Supprimer</button>' +
            '</td>' +
            '</tr>';
    }).join('');
}

// Modifier une periode
async function editRestPeriod(periodId) {
    try {
        const doc = await db.collection('rest_periods').doc(periodId).get();
        if (!doc.exists) {
            alert('Periode non trouvee');
            return;
        }
        
        const period = doc.data();
        
        const idField = document.getElementById('restPeriodId');
        if (idField) idField.value = periodId;
        
        const typeField = document.getElementById('restPeriodType');
        if (typeField) typeField.value = period.type || '';
        
        const messageField = document.getElementById('restPeriodMessage');
        if (messageField) messageField.value = period.message || '';
        
        const startDateField = document.getElementById('restPeriodStartDate');
        if (startDateField && period.startDate) {
            startDateField.value = period.startDate;
        }
        
        const endDateField = document.getElementById('restPeriodEndDate');
        if (endDateField && period.endDate) {
            endDateField.value = period.endDate;
        }
        
        const weekendField = document.getElementById('restPeriodWeekendsEnabled');
        if (weekendField) {
            weekendField.checked = period.restPeriodWeekendsEnabled || false;
        }
        
        // Afficher le bon type de champs
        if (period.type === 'Week-ends' || period.type === 'Week-end') {
            showWeekendField();
        } else {
            showAllDateFields();
        }
        
        const titleField = document.getElementById('restPeriodModalTitle');
        if (titleField) titleField.textContent = 'Modifier la Periode de Repos';
        
        const modal = document.getElementById('restPeriodModal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.pointerEvents = 'auto'; // Fix: permettre les clics
        }

        console.log('Manager: Periode chargee:', period.type);
        
    } catch (error) {
        console.error('Manager: Erreur modification:', error);
        alert('Erreur lors du chargement');
    }
}

// Supprimer une periode
async function deleteRestPeriod(periodId) {
    if (!confirm('Supprimer cette periode?')) return;
    
    try {
        await db.collection('rest_periods').doc(periodId).delete();
        await loadRestPeriods();
        showSuccessMessage('Periode supprimee!');
    } catch (error) {
        console.error('Manager: Erreur suppression:', error);
        showErrorMessage('Erreur suppression');
    }
}

// Enregistrer une periode
async function saveRestPeriod(event) {
    event.preventDefault();
    
    try {
        const typeField = document.getElementById('restPeriodType');
        const messageField = document.getElementById('restPeriodMessage');
        const idField = document.getElementById('restPeriodId');
        
        if (!typeField || !typeField.value) {
            alert('Veuillez selectionner un type');
            return;
        }
        
        const type = typeField.value;
        const message = messageField ? messageField.value : '';
        const periodId = idField ? idField.value : '';
        
        let periodData = {
            type: type,
            message: message,
            createdBy: appState.currentUser || 'coach',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Ajouter les champs selon le type
        if (type === 'Week-ends' || type === 'Week-end') {
            const weekendField = document.getElementById('restPeriodWeekendsEnabled');
            periodData.restPeriodWeekendsEnabled = weekendField ? weekendField.checked : false;
            console.log('Manager: Sauvegarde Week-ends, enabled:', periodData.restPeriodWeekendsEnabled);
        } else {
            // Pour TOUS les autres types: sauvegarder les dates
            const startField = document.getElementById('restPeriodStartDate');
            const endField = document.getElementById('restPeriodEndDate');
            
            if (!startField || !startField.value || !endField || !endField.value) {
                alert('Veuillez remplir les dates de debut et fin');
                return;
            }
            
            periodData.startDate = startField.value;
            periodData.endDate = endField.value;
            console.log('Manager: Sauvegarde dates -', periodData.type, periodData.startDate, 'à', periodData.endDate);
        }
        
        // Sauvegarder
        if (periodId) {
            await db.collection('rest_periods').doc(periodId).update(periodData);
            showSuccessMessage('Periode modifiee!');
        } else {
            periodData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('rest_periods').add(periodData);
            showSuccessMessage('Periode creee!');
        }
        
        closeRestPeriodModal();
        await loadRestPeriods();
        
    } catch (error) {
        console.error('Manager: Erreur sauvegarde:', error);
        showErrorMessage('Erreur lors de l\'enregistrement');
    }
}

// Messages de succes
function showSuccessMessage(message) {
    const notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #667eea; color: white; padding: 20px 30px; border-radius: 10px; z-index: 10001;';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3000);
}

// Messages d'erreur
function showErrorMessage(message) {
    const notification = document.createElement('div');
    notification.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #e74c3c; color: white; padding: 20px 30px; border-radius: 10px; z-index: 10001;';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 4000);
}

console.log('Manager Rest Periods (tous types avec dates) charge');
