// Script à exécuter dans la console du navigateur (F12) pour corriger les dates de cycle
// Copier-coller tout ce code dans la console

(async function fixCycleDates() {
    console.log('=== CORRECTION DES DATES DE CYCLE ===\n');
    console.log('Date actuelle:', new Date().toISOString().split('T')[0]);
    console.log('-------------------------------------------\n');

    const playersSnapshot = await db.collection('players').orderBy('name').get();
    let correctionCount = 0;
    
    for (const playerDoc of playersSnapshot.docs) {
        const player = playerDoc.data();
        const playerId = playerDoc.id;
        
        // Récupérer les données de cycle
        const cycleDoc = await db.collection('menstrualCycle').doc(playerId).get();
        
        if (!cycleDoc.exists) {
            console.log(`❌ ${player.name}: Pas de données de cycle`);
            continue;
        }
        
        const cycleData = cycleDoc.data();
        const storedCycleStartDate = cycleData.cycleStartDate;
        const cycleLength = cycleData.cycleLength || 28;
        
        // Chercher le dernier check-in où hasPeriod = true (J1 déclaré)
        const j1CheckinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .where('hasPeriod', '==', true)
            .orderBy('date', 'desc')
            .limit(1)
            .get();
        
        // 🔍 DEBUG: Si pas de J1, chercher tous les check-ins récents pour voir ce qui est stocké
        if (j1CheckinsSnapshot.empty) {
            const recentCheckins = await db.collection('checkins')
                .where('playerId', '==', playerId)
                .orderBy('date', 'desc')
                .limit(3)
                .get();
            
            console.log(`⚠️  ${player.name.padEnd(20)} | Aucun J1 déclaré | cycleStartDate: ${storedCycleStartDate}`);
            if (!recentCheckins.empty) {
                console.log(`   🔍 Derniers check-ins:`);
                recentCheckins.docs.forEach(doc => {
                    const data = doc.data();
                    console.log(`      ${data.date} - hasPeriod: ${data.hasPeriod}, periodProximity: ${data.periodProximity}`);
                });
            }
            continue;
        }
        
        const lastJ1Checkin = j1CheckinsSnapshot.docs[0].data();
        const lastJ1Date = lastJ1Checkin.date;
        
        // Comparer avec le cycleStartDate stocké
        if (lastJ1Date !== storedCycleStartDate) {
            console.log(`🔧 ${player.name.padEnd(20)} | CORRECTION NÉCESSAIRE`);
            console.log(`   Stocké: ${storedCycleStartDate} → Dernier J1 déclaré: ${lastJ1Date}`);
            
            // CORRECTION: Mettre à jour le cycleStartDate
            await db.collection('menstrualCycle').doc(playerId).update({
                cycleStartDate: lastJ1Date,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`   ✅ Corrigé vers ${lastJ1Date}`);
            correctionCount++;
        } else {
            // Calculer le jour actuel avec cette date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const lastJ1 = new Date(lastJ1Date);
            lastJ1.setHours(0, 0, 0, 0);
            
            const daysDiff = Math.floor((today - lastJ1) / (1000 * 60 * 60 * 24));
            const currentDay = daysDiff + 1;
            
            console.log(`✅ ${player.name.padEnd(20)} | J${currentDay} | Dernier J1: ${lastJ1Date} (OK)`);
        }
    }
    
    console.log('\n-------------------------------------------');
    console.log(`✅ ${correctionCount} correction(s) effectuée(s)`);
    console.log('Rafraîchissez la page pour voir les changements');
})();
