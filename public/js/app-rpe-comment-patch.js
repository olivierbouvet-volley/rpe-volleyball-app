// ========================================
// PATCH POUR AJOUTER LE COMMENTAIRE AU RPE
// ========================================

console.log('Patch commentaire RPE chargé');

// Attendre que le DOM soit prêt
document.addEventListener('DOMContentLoaded', function() {
    // Remplacer le gestionnaire du formulaire RPE
    const rpeForm = document.getElementById('rpeForm');
    
    if (rpeForm) {
        // Supprimer l'ancien gestionnaire en clonant le formulaire
        const newRpeForm = rpeForm.cloneNode(true);
        rpeForm.parentNode.replaceChild(newRpeForm, rpeForm);
        
        // Ajouter le nouveau gestionnaire avec support du commentaire
        newRpeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const comment = document.getElementById('rpeComment').value.trim();
            
            const rpeData = {
                playerId: appState.currentUser,
                date: new Date().toISOString().split('T')[0],
                sessionType: document.getElementById('sessionType').value,
                rpe: parseInt(document.getElementById('rpeValue').value),
                duration: parseInt(document.getElementById('duration').value),
                load: parseInt(document.getElementById('rpeValue').value) * parseInt(document.getElementById('duration').value),
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                comment: comment || null
            };
            
            try {
                await db.collection('rpe').add(rpeData);
                alert('RPE enregistré avec succès !');
                document.getElementById('rpeForm').reset();
                document.getElementById('rpeCommentCount').textContent = '0';
                switchTab('dashboard');
            } catch (error) {
                console.error('Erreur lors de l\'enregistrement du RPE:', error);
                alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
            }
        });
        
        console.log('Gestionnaire RPE avec commentaire installé');
    }
});

