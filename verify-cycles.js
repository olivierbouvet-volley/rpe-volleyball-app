const admin = require('firebase-admin');

// Utiliser les credentials de l'application par défaut (Firebase CLI)
admin.initializeApp({
  projectId: 'rpe-volleyball-sable'
});

const db = admin.firestore();

async function verifyCycles() {
  console.log('=== VÉRIFICATION DES CYCLES MENSTRUELS ===\n');
  console.log('Date actuelle:', new Date().toISOString().split('T')[0]);
  console.log('-------------------------------------------\n');

  // Récupérer toutes les joueuses
  const playersSnapshot = await db.collection('players').get();
  
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
    
    // Calculer le J1 actuel
    let lastJ1 = new Date(cycleData.cycleStartDate);
    lastJ1.setHours(0, 0, 0, 0);
    
    // Si le J1 initial est dans le futur, reculer
    if (lastJ1 > today) {
      while (lastJ1 > today) {
        lastJ1.setDate(lastJ1.getDate() - cycleLength);
      }
    } else {
      // Avancer pour trouver le cycle actuel
      let tempLastJ1 = new Date(lastJ1);
      while (tempLastJ1.getTime() + (cycleLength * 24 * 60 * 60 * 1000) <= today.getTime()) {
        tempLastJ1.setDate(tempLastJ1.getDate() + cycleLength);
        lastJ1 = tempLastJ1;
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
    
    console.log(`✅ ${player.name.padEnd(20)} | J${currentDay} (${phase}) | Cycle ${cycleLength}j | Dernier J1: ${lastJ1.toISOString().split('T')[0]}${warning}`);
  }
  
  console.log('\n-------------------------------------------');
  console.log('Vérification terminée');
  process.exit(0);
}

verifyCycles().catch(error => {
  console.error('Erreur:', error);
  process.exit(1);
});
