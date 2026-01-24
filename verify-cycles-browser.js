// Script à exécuter dans la console du navigateur (F12) quand vous êtes connecté à l'app
// Copier-coller tout ce code dans la console

(async function verifyCycles() {
    console.log('=== VÉRIFICATION DES CYCLES MENSTRUELS ===\n');
    console.log('Date actuelle:', new Date().toISOString().split('T')[0]);
    console.log('-------------------------------------------\n');

    // Récupérer toutes les joueuses
    const playersSnapshot = await db.collection('players').orderBy('name').get();
    
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
        
        if (!cycleData.cycleStartDate) {
            console.log(`❌ ${player.name}: cycleStartDate manquant`);
            continue;
        }
        
        const cycleLength = cycleData.cycleLength || 28;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Calculer le J1 actuel (même logique que le code déployé)
        let lastJ1 = new Date(cycleData.cycleStartDate);
        lastJ1.setHours(0, 0, 0, 0);
        
        // Si le J1 initial est dans le futur, reculer
        if (lastJ1 > today) {
            while (lastJ1 > today) {
                lastJ1.setDate(lastJ1.getDate() - cycleLength);
            }
        } else {
            // Avancer pour trouver le cycle actuel - NOUVELLE LOGIQUE
            while (true) {
                const nextCycleStart = new Date(lastJ1);
                nextCycleStart.setDate(nextCycleStart.getDate() + cycleLength);
                
                // Si le prochain cycle commence APRÈS aujourd'hui, on reste sur le cycle actuel
                if (nextCycleStart > today) {
                    break;
                }
                
                // Sinon on avance au cycle suivant
                lastJ1 = nextCycleStart;
            }
        }
        
        // Calculer le jour actuel du cycle
        const daysDiff = Math.floor((today - lastJ1) / (1000 * 60 * 60 * 24));
        const currentDay = daysDiff + 1;
        
        // Déterminer la phase
        let phase = '';
        const menstrualEnd = Math.round(cycleLength * 0.18);
        const ovulationStart = Math.round(cycleLength * 0.42);
        const ovulationEnd = Math.round(cycleLength * 0.58);
        
        if (currentDay <= menstrualEnd) {
            phase = 'Menstruelle';
        } else if (currentDay >= ovulationStart && currentDay <= ovulationEnd) {
            phase = 'Ovulation';
        } else if (currentDay > ovulationEnd) {
            phase = 'Lutéale';
        } else {
            phase = 'Folliculaire';
        }
        
        const isExtended = currentDay > cycleLength;
        const warning = isExtended ? ' ⚠️ CYCLE PROLONGÉ' : '';
        
        // Vérifier si la joueuse a un check-in à la date du dernier J1 calculé
        const j1DateStr = lastJ1.toISOString().split('T')[0];
        const j1CheckinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', playerId)
            .where('date', '==', j1DateStr)
            .get();
        
        // Vérifier aussi le cycleStartDate stocké
        const storedCycleStartDate = cycleData.cycleStartDate;
        const calculatedMatchesStored = j1DateStr === storedCycleStartDate;
        
        let status = '';
        if (j1CheckinsSnapshot.docs.length > 0) {
            status = `✓ Check-in le ${j1DateStr}`;
        } else {
            status = `✗ Pas de check-in le ${j1DateStr}`;
        }
        
        if (!calculatedMatchesStored) {
            status += ` | ⚠️ cycleStartDate stocké: ${storedCycleStartDate}`;
        }
        
        console.log(`${player.name.padEnd(20)} | J${currentDay} (${phase}) | Cycle ${cycleLength}j | ${status}${warning}`);
    }
    
    console.log('\n-------------------------------------------');
    console.log('Vérification terminée');
})();
