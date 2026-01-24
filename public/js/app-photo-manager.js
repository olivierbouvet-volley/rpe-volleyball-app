
// ============================================
// GESTION DES PHOTOS AVEC FIREBASE STORAGE
// ============================================

console.log('Module Photo Manager chargé');

// Prévisualiser la photo avant upload (modal Ajouter)
function previewAddPhoto(input) {
    const preview = document.getElementById('addPhotoPreview');
    const placeholder = document.querySelector('.image-upload-container');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            placeholder.style.border = '2px solid var(--color-success)';
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

// Prévisualiser la photo avant upload (modal Modifier)
function previewEditPhoto(input) {
    const preview = document.getElementById('editPhotoPreview');
    
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            preview.src = e.target.result;
        };
        
        reader.readAsDataURL(input.files[0]);
    }
}

// Upload de photo vers Firebase Storage
async function uploadPhoto(file, playerId) {
    if (!file) return null;
    
    try {
        // Créer une référence unique pour la photo
        const timestamp = Date.now();
        const fileName = `${playerId}_${timestamp}.${file.name.split('.').pop()}`;
        const storageRef = firebase.storage().ref(`players/${playerId}/${fileName}`);
        
        // Afficher le loader
        showLoader('Upload de la photo en cours...');
        
        // Upload du fichier
        const snapshot = await storageRef.put(file);
        
        // Récupérer l'URL de téléchargement
        const downloadURL = await snapshot.ref.getDownloadURL();
        
        hideLoader();
        return downloadURL;
        
    } catch (error) {
        hideLoader();
        console.error('Erreur lors de l\'upload:', error);
        showMessage('Erreur lors de l\'upload de la photo', 'error');
        return null;
    }
}

// Supprimer une photo de Firebase Storage
async function deletePhoto(photoUrl) {
    if (!photoUrl || photoUrl.includes('default-avatar.png')) return;
    
    try {
        const storageRef = firebase.storage().refFromURL(photoUrl);
        await storageRef.delete();
        console.log('Photo supprimée avec succès');
    } catch (error) {
        console.error('Erreur lors de la suppression de la photo:', error);
    }
}

// Redimensionner l'image avant upload (optionnel - pour économiser l'espace)
function resizeImage(file, maxWidth = 400, maxHeight = 400, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Calculer les nouvelles dimensions
            let { width, height } = img;
            
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
            
            // Redimensionner
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convertir en blob
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// Modifier la fonction addPlayer pour gérer les photos
window.originalAddPlayer = window.addPlayer;
window.addPlayer = async function() {
    const form = document.getElementById('addPlayerForm');
    const photoInput = document.getElementById('addPhotoInput');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    const playerId = Date.now().toString();
    
    let photoUrl = '/img/default-avatar.png'; // Photo par défaut
    
    // Upload de la photo si une photo est sélectionnée
    if (photoInput.files && photoInput.files[0]) {
        const file = photoInput.files[0];
        
        // Vérifier la taille du fichier (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showMessage('La photo ne peut pas dépasser 5MB', 'error');
            return;
        }
        
        // Redimensionner et uploader
        const resizedFile = await resizeImage(file);
        photoUrl = await uploadPhoto(resizedFile, playerId);
        
        if (!photoUrl) return; // Erreur lors de l'upload
    }
    
    // Créer l'objet joueur
    const player = {
        id: playerId,
        name: formData.get('playerName'),
        position: formData.get('playerPosition'),
        number: parseInt(formData.get('playerNumber')),
        photo: photoUrl,
        createdAt: new Date().toISOString()
    };
    
    try {
        showLoader('Ajout de la joueuse...');
        
        // Ajouter à Firebase
        await db.collection('players').doc(playerId).set(player);
        
        hideLoader();
        showMessage('Joueuse ajoutée avec succès !', 'success');
        
        // Fermer le modal et recharger
        closeModal('addPlayerModal');
        loadPlayers();
        
    } catch (error) {
        hideLoader();
        console.error('Erreur:', error);
        showMessage('Erreur lors de l\'ajout de la joueuse', 'error');
        
        // Supprimer la photo uploadée en cas d'erreur
        if (photoUrl !== '/img/default-avatar.png') {
            deletePhoto(photoUrl);
        }
    }
};

// Modifier la fonction updatePlayer pour gérer les photos
window.originalUpdatePlayer = window.updatePlayer;
window.updatePlayer = async function() {
    const form = document.getElementById('editPlayerForm');
    const photoInput = document.getElementById('editPhotoInput');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    const playerId = document.getElementById('editPlayerId').value;
    
    try {
        showLoader('Modification en cours...');
        
        // Récupérer les données actuelles du joueur
        const playerDoc = await db.collection('players').doc(playerId).get();
        const currentPlayer = playerDoc.data();
        let photoUrl = currentPlayer.photo;
        
        // Upload nouvelle photo si sélectionnée
        if (photoInput.files && photoInput.files[0]) {
            const file = photoInput.files[0];
            
            // Vérifier la taille
            if (file.size > 5 * 1024 * 1024) {
                showMessage('La photo ne peut pas dépasser 5MB', 'error');
                hideLoader();
                return;
            }
            
            // Redimensionner et uploader la nouvelle photo
            const resizedFile = await resizeImage(file);
            const newPhotoUrl = await uploadPhoto(resizedFile, playerId);
            
            if (newPhotoUrl) {
                // Supprimer l'ancienne photo
                if (currentPlayer.photo && !currentPlayer.photo.includes('default-avatar.png')) {
                    await deletePhoto(currentPlayer.photo);
                }
                photoUrl = newPhotoUrl;
            }
        }
        
        // Mettre à jour les données
        const updatedPlayer = {
            name: formData.get('editPlayerName'),
            position: formData.get('editPlayerPosition'),
            number: parseInt(formData.get('editPlayerNumber')),
            photo: photoUrl,
            updatedAt: new Date().toISOString()
        };
        
        await db.collection('players').doc(playerId).update(updatedPlayer);
        
        hideLoader();
        showMessage('Joueuse modifiée avec succès !', 'success');
        
        closeModal('editPlayerModal');
        loadPlayers();
        
    } catch (error) {
        hideLoader();
        console.error('Erreur:', error);
        showMessage('Erreur lors de la modification', 'error');
    }
};

// Modifier la fonction deletePlayer pour supprimer aussi les photos
window.originalDeletePlayer = window.deletePlayer;
window.deletePlayer = async function(playerId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette joueuse ?')) {
        return;
    }
    
    try {
        showLoader('Suppression en cours...');
        
        // Récupérer les données du joueur pour obtenir l'URL de la photo
        const playerDoc = await db.collection('players').doc(playerId).get();
        const playerData = playerDoc.data();
        
        // Supprimer la photo si elle existe
        if (playerData.photo && !playerData.photo.includes('default-avatar.png')) {
            await deletePhoto(playerData.photo);
        }
        
        // Supprimer le document
        await db.collection('players').doc(playerId).delete();
        
        hideLoader();
        showMessage('Joueuse supprimée avec succès !', 'success');
        loadPlayers();
        
    } catch (error) {
        hideLoader();
        console.error('Erreur:', error);
        showMessage('Erreur lors de la suppression', 'error');
    }
};

// Modifier la fonction displayPlayers pour afficher les photos
window.originalDisplayPlayers = window.displayPlayers;
window.displayPlayers = function(players) {
    const container = document.getElementById('playersContainer');
    
    if (players.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Aucune joueuse enregistrée</p>
                <button class="btn-primary" onclick="openModal('addPlayerModal')">
                    Ajouter la première joueuse
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = players.map(player => `
        <div class="player-card">
            <div class="player-header">
                <img src="${player.photo || '/img/default-avatar.png'}" 
                     alt="${player.name}" 
                     class="player-avatar"
                     onerror="this.src='/img/default-avatar.png'">
                <div class="player-info">
                    <h3>${player.name}</h3>
                    <span class="position">${player.position}</span>
                </div>
                <div class="player-number">#${player.number}</div>
            </div>
            
            <div class="player-actions">
                <button class="btn-secondary" onclick="editPlayer('${player.id}')">
                    Modifier
                </button>
                <button class="btn-danger" onclick="deletePlayer('${player.id}')">
                    Supprimer
                </button>
            </div>
        </div>
    `).join('');
};

console.log('Gestionnaire de photos initialisé');
