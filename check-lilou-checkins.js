// Script pour afficher tous les check-ins de Lilou avec info cycle
// Copier-coller dans la console

(async function checkLilouCheckins() {
    console.log('=== CHECK-INS DE LILOU ===\n');
    
    // Trouver Lilou
    const playersSnapshot = await db.collection('players')
        .where('name', '>=', 'Lilou')
        .where('name', '<=', 'Lilou\uf8ff')
        .get();
    
    if (playersSnapshot.empty) {
        console.log('❌ Lilou non trouvée');
        return;
    }
    
    const lilou = playersSnapshot.docs[0];
    const playerId = lilou.id;
    console.log(`Joueuse: ${lilou.data().name} (ID: ${playerId})\n`);
    
    // Récupérer les données de cycle
    const cycleDoc = await db.collection('menstrualCycle').doc(playerId).get();
    if (cycleDoc.exists) {
        const cycleData = cycleDoc.data();
        console.log('📅 Données cycle stockées:');
        console.log(`   cycleStartDate: ${cycleData.cycleStartDate}`);
        console.log(`   cycleLength: ${cycleData.cycleLength}`);
        console.log(`   periodLength: ${cycleData.periodLength}\n`);
    }
    
    // Récupérer TOUS les check-ins depuis décembre
    const checkinsSnapshot = await db.collection('checkins')
        .where('playerId', '==', playerId)
        .where('date', '>=', '2025-12-01')
        .orderBy('date', 'asc')
        .get();
    
    console.log(`📋 ${checkinsSnapshot.docs.length} check-ins depuis décembre 2025:\n`);
    console.log('Date       | J? | Règles  | Proximité    | Énergie | Symptômes');
    console.log('-----------|----|---------|--------------|---------|-----------');
    
    checkinsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const date = data.date;
        const hasPeriod = data.hasPeriod ? 'OUI' : 'non';
        const proximity = data.periodProximity || 'aucune';
        const energy = data.energy || '-';
        const symptomsCount = data.symptoms ? Object.keys(data.symptoms).filter(k => data.symptoms[k] > 0).length : 0;
        
        // Essayer de déduire le jour du cycle
        let dayMarker = '?';
        if (data.hasPeriod === true) {
            dayMarker = 'J1';
        } else if (data.periodProximity === 'during') {
            // Pendant les règles mais pas J1, donc J2-J5
            dayMarker = 'J2-5';
        } else if (data.periodProximity === 'justAfter') {
            dayMarker = 'J6+';
        }
        
        console.log(`${date} | ${dayMarker.padEnd(3)} | ${hasPeriod.padEnd(7)} | ${proximity.padEnd(12)} | ${String(energy).padEnd(7)} | ${symptomsCount} symptôme(s)`);
    });
    
    console.log('\n-------------------------------------------');
    console.log('Si Lilou est à J23 le 23 janvier:');
    console.log('  → J1 devrait être le 2026-01-01 (ou 2025-12-31)');
    console.log('  → J6 serait le 2026-01-06 (ou 2026-01-05)');
})();
