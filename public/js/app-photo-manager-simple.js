// ============================================
// GESTION DES PHOTOS AVEC FIREBASE STORAGE (VERSION SIMPLIFIÉE)
// ============================================

console.log('Module Photo Manager (simplifié) chargé');

// Upload de photo vers Firebase Storage
async function uploadPlayerPhoto(file, playerId) {
    if (!file) return null;
    
    try {
        // Vérifier la taille du fichier (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('La photo ne peut pas dépasser 5MB');
            return null;
        }
        
        // Créer une référence unique pour la photo
        const timestamp = Date.now();
        const extension = file.name.split('.').pop();
        const fileName = `${playerId}_${timestamp}.${extension}`;
        const storageRef = firebase.storage().ref(`players/${fileName}`);
        
        console.log('Upload de la photo en cours...');
        
        // Upload du fichier
        const snapshot = await storageRef.put(file);
        
        // Récupérer l'URL de téléchargement
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        console.log('Photo uploadée avec succès:', downloadURL);
        return downloadURL;
        
    } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
        alert('Erreur lors de l\'upload de la photo: ' + error.message);
        return null;
    }
}

// Supprimer une photo de Firebase Storage
async function deletePlayerPhoto(photoUrl) {
    if (!photoUrl || photoUrl.includes('default-avatar.png')) return;
    
    try {
        const storageRef = firebase.storage().refFromURL(photoUrl);
        await storageRef.delete();
        console.log('Photo supprimée avec succès');
    } catch (error) {
        console.error('Erreur lors de la suppression de la photo:', error);
    }
}

// Modifier la fonction saveNewPlayer pour gérer les photos
const originalSaveNewPlayer = window.saveNewPlayer;
if (originalSaveNewPlayer) {
    window.saveNewPlayer = async function() {
        const fullName = document.getElementById('playerFullName').value.trim();
        const playerId = document.getElementById('playerId').value.trim();
        const birthdayInput = document.getElementById('playerBirthday').value.trim();
        const laterality = document.getElementById('playerLaterality').value.trim();
        const position = document.getElementById('playerPosition').value.trim();
        const photoInput = document.getElementById('playerPhoto');
        
        if (!fullName || !playerId || !birthdayInput || !laterality || !position) {
            alert('Veuillez remplir tous les champs obligatoires.');
            return;
        }
        
        // Convertir la date vers le format JJ/MM/AA
        let birthday;
        if (birthdayInput.includes('-')) {
            // Format YYYY-MM-DD (du sélecteur de date)
            const [year, month, day] = birthdayInput.split('-');
            birthday = `${day}/${month}/${year.slice(2)}`;
        } else if (birthdayInput.includes('/')) {
            // Déjà au format JJ/MM/AA
            birthday = birthdayInput;
        } else {
            alert('Format de date invalide');
            return;
        }
        
        try {
            // Vérifier si la joueuse existe déjà 
            const existingPlayer = await db.collection('players').doc(playerId).get();
            if (existingPlayer.exists) {
                alert('Une joueuse avec cet ID existe déjà . Veuillez choisir un autre ID.');
                return;
            }
            
            let photoURL = null;
            
            // Upload de la photo si une photo est sélectionnée
            if (photoInput && photoInput.files && photoInput.files[0]) {
                photoURL = await uploadPlayerPhoto(photoInput.files[0], playerId);
                if (!photoURL) {
                    // L'upload a échoué, mais on continue sans photo
                    console.warn('Ajout de la joueuse sans photo');
                }
            }
            
            // Créer la nouvelle joueuse
            await db.collection('players').doc(playerId).set({
                name: fullName,
                birthday: birthday,
                handedness: laterality,
                position: position,
                photoURL: photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            alert('Joueuse ajoutée avec succès !');
            
            // NOUVEAU: Invalider le cache des graphiques
            if (typeof invalidateChartsCache === 'function') {
                invalidateChartsCache();
                console.log('Cache graphiques invalidé après ajout joueuse');
            }
            
            // Fermer le modal
            if (typeof closeAddPlayerModal === 'function') {
                closeAddPlayerModal();
            }
            
            // Recharger le dashboard
            if (typeof loadCoachDashboard === 'function') {
                loadCoachDashboard();
            }
        } catch (error) {
            console.error('Erreur lors de l\'ajout de la joueuse:', error);
            alert('Erreur lors de l\'ajout de la joueuse: ' + error.message);
        }
    }
}

// NOUVEAU: Modifier la fonction deletePlayer pour invalider le cache et gérer les photos
const originalDeletePlayer = window.deletePlayer;
window.deletePlayer = async function(playerId) {
    // Utiliser currentPopupPlayerId si playerId n'est pas passé
    const actualPlayerId = playerId || window.currentPopupPlayerId;
    
    if (!actualPlayerId) {
        alert('Aucune joueuse sélectionnée');
        return;
    }
    
    try {
        // Récupérer les données du joueur pour obtenir l'URL de la photo et le nom
        const playerDoc = await db.collection('players').doc(actualPlayerId).get();
        
        if (!playerDoc.exists) {
            alert('Joueuse non trouvée');
            return;
        }
        
        const playerData = playerDoc.data();
        const playerName = playerData.name || actualPlayerId;
        
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${playerName} ?\n\nCette action est irréversible.`)) {
            return;
        }
        
        // Supprimer la photo si elle existe
        if (playerData.photo && !playerData.photo.includes('default-avatar.png')) {
            try {
                await deletePlayerPhoto(playerData.photo);
            } catch (photoError) {
                console.warn('Erreur suppression photo:', photoError);
            }
        }
        if (playerData.photoURL && !playerData.photoURL.includes('default-avatar.png')) {
            try {
                await deletePlayerPhoto(playerData.photoURL);
            } catch (photoError) {
                console.warn('Erreur suppression photoURL:', photoError);
            }
        }
        
        // Supprimer les check-ins associés
        const checkinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', actualPlayerId)
            .get();
        
        const batch = db.batch();
        checkinsSnapshot.forEach(doc => batch.delete(doc.ref));
        
        // Supprimer les RPE associés
        const rpeSnapshot = await db.collection('rpe')
            .where('playerId', '==', actualPlayerId)
            .get();
        
        rpeSnapshot.forEach(doc => batch.delete(doc.ref));
        
        // Supprimer le document joueuse
        batch.delete(db.collection('players').doc(actualPlayerId));
        
        await batch.commit();
        
        console.log('Joueuse et données associées supprimées:', actualPlayerId);
        
        // Invalider le cache des graphiques
        if (typeof invalidateChartsCache === 'function') {
            invalidateChartsCache();
            console.log('Cache graphiques invalidé après suppression joueuse');
        }
        
        // Fermer le popup
        if (typeof closePlayerDetailModal === 'function') {
            closePlayerDetailModal();
        }
        
        // Recharger les joueuses
        if (typeof loadPlayers === 'function') {
            await loadPlayers();
        }
        
        // Recharger le dashboard coach
        if (typeof loadCoachDashboard === 'function') {
            await loadCoachDashboard();
        }
        
        alert(`${playerName} a été supprimée avec succès.`);
        
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression: ' + error.message);
    }
}

// Fonction pour prévisualiser la photo
window.previewPlayerPhoto = function(event) {
    const input = event.target;
    const preview = document.getElementById('photoPreview');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

console.log('Gestionnaire de photos initialisé (version simplifiée avec cache invalidation)');
