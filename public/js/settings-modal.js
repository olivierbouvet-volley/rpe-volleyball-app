/**
 * Settings Modal Module
 * Gère l'onglet Paramètres avec accès au questionnaire cycle
 */

console.log('✅ Settings Modal Module chargé');

/**
 * Ouvre le modal Paramètres
 */
window.openSettingsModal = function() {
    let modal = document.getElementById('settingsModal');
    
    // Créer le modal s'il n'existe pas
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'settingsModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            overflow-y: auto;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: white;
            border-radius: 16px;
            padding: 30px;
            width: 95%;
            max-width: 700px;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            margin: 20px auto;
        `;
        
        const currentPhotoUrl = window.currentPlayerPhoto || '/img/default-avatar.png';
        
        content.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                <h2 style="margin: 0; font-size: 28px; color: #1f2937;">⚙️ Paramètres</h2>
            </div>
            
            <!-- Section Photo de Profil -->
            <div style="border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 18px;">📸 Photo de Profil</h3>
                <div style="display: flex; gap: 20px; align-items: flex-start;">
                    <img id="settingsModalPhoto" src="${currentPhotoUrl}" alt="Photo" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #667eea;">
                    <div style="flex: 1;">
                        <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 14px;">
                            Téléchargez ou changez votre photo de profil
                        </p>
                        <input type="file" id="settingsPhotoInput" accept="image/*" style="
                            display: block;
                            margin-bottom: 12px;
                            padding: 8px;
                            border: 1px solid #d1d5db;
                            border-radius: 6px;
                            cursor: pointer;
                            width: 100%;
                        ">
                        <button onclick="window.uploadSettingsPhoto()" style="
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            padding: 10px 16px;
                            border: none;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                            font-size: 13px;
                            margin-right: 8px;
                            transition: all 0.2s;
                        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 12px rgba(102, 126, 234, 0.3)'" 
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                            ✅ Envoyer la photo
                        </button>
                        <span id="uploadPhotoStatus" style="font-size: 12px; color: #6b7280; margin-left: 8px;"></span>
                    </div>
                </div>
            </div>
            
            <!-- Section Cycle Menstruel -->
            <div style="border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px 0; color: #374151; font-size: 18px;">🌸 Cycle Menstruel</h3>
                <p style="margin: 0 0 16px 0; color: #6b7280; font-size: 14px;">
                    Remplissez le questionnaire complet pour personnaliser vos recommandations d'entraînement en fonction de votre cycle.
                </p>
                <button onclick="openCycleQuestionnaireModal()" style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.2s;
                " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 16px rgba(102, 126, 234, 0.4)'" 
                   onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                    📋 Questionnaire Cycle Complet (13 questions)
                </button>
            </div>
            
            <!-- Bouton Fermer -->
            <div style="display: flex; justify-content: flex-end;">
                <button onclick="closeSettingsModal()" style="
                    background: #e5e7eb;
                    color: #374151;
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.2s;
                " onmouseover="this.style.background='#d1d5db'" 
                   onmouseout="this.style.background='#e5e7eb'">
                    ✕ Fermer
                </button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        // Fermer en cliquant en dehors
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeSettingsModal();
            }
        });
    }
    
    modal.style.display = 'flex';
};

/**
 * Ferme le modal Paramètres
 */
window.closeSettingsModal = function() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

/**
 * Upload de la photo depuis le modal Paramètres
 */
window.uploadSettingsPhoto = async function() {
    const photoInput = document.getElementById('settingsPhotoInput');
    const statusSpan = document.getElementById('uploadPhotoStatus');
    
    if (!photoInput || !photoInput.files || photoInput.files.length === 0) {
        if (statusSpan) statusSpan.textContent = '❌ Veuillez sélectionner une image';
        return;
    }
    
    try {
        if (statusSpan) statusSpan.textContent = '⏳ Upload en cours...';
        
        const file = photoInput.files[0];
        // Récupérer le playerId depuis currentPlayer
        const playerId = window.currentPlayer?.id;
        
        if (!playerId) {
            if (statusSpan) statusSpan.textContent = '❌ Erreur: Utilisateur non identifié';
            console.error('currentPlayer not found:', window.currentPlayer);
            return;
        }
        
        // Utiliser la fonction uploadPlayerPhoto existante
        const photoURL = await uploadPlayerPhoto(file, playerId);
        
        if (photoURL) {
            // Mettre à jour la photo dans Firestore
            await db.collection('players').doc(playerId).update({
                photoURL: photoURL
            });
            
            // Mettre à jour les affichages
            window.currentPlayerPhoto = photoURL;
            document.getElementById('playerHeaderPhoto').src = photoURL;
            document.getElementById('settingsModalPhoto').src = photoURL;
            
            if (statusSpan) statusSpan.textContent = '✅ Photo mise à jour!';
            
            // Attendre 2 secondes puis fermer le modal
            setTimeout(() => {
                closeSettingsModal();
            }, 2000);
        } else {
            if (statusSpan) statusSpan.textContent = '❌ Erreur lors de l\'upload';
        }
    } catch (error) {
        console.error('Erreur upload photo:', error);
        if (statusSpan) statusSpan.textContent = '❌ Erreur: ' + error.message;
    }
};

console.log('✅ Settings Modal Module actif - Photo Management enabled');
