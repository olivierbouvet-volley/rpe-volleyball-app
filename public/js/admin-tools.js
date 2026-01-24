/**
 * Admin Tools - Outils d'administration pour corriger les données
 * 
 * Fonctions disponibles dans la console :
 * - normalizeAllPlayerNames() : Normalise tous les noms (Prénom NOM)
 * - diagnosePlayerVolumes() : Diagnostique les problèmes de volume
 * - fixPlayerName(playerId, newName) : Corrige un nom spécifique
 */

/**
 * Normalise un nom : Prénom NOM (avec accents)
 * Exemple : "MARIE DUPONT" -> "Marie DUPONT"
 * Exemple : "marie dupont" -> "Marie DUPONT"
 * Exemple : "CHLOÉ LE FALHER" -> "Chloé LE FALHER"
 */
function normalizeName(fullName) {
    if (!fullName) return fullName;
    
    const parts = fullName.trim().split(/\s+/);
    
    if (parts.length === 1) {
        // Un seul mot : on le met en majuscule (probablement un nom)
        return parts[0].toUpperCase();
    }
    
    // Premier mot = prénom (première lettre majuscule, reste minuscule)
    const firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    
    // Reste = nom de famille (tout en majuscule)
    const lastName = parts.slice(1).map(p => p.toUpperCase()).join(' ');
    
    return `${firstName} ${lastName}`;
}

/**
 * Normalise tous les noms des joueuses dans Firestore
 */
async function normalizeAllPlayerNames() {
    console.log('=== Normalisation des noms ===');
    
    try {
        const playersSnapshot = await db.collection('players').get();
        let updated = 0;
        let errors = [];
        
        for (const doc of playersSnapshot.docs) {
            const data = doc.data();
            const oldName = data.name;
            const newName = normalizeName(oldName);
            
            if (oldName !== newName) {
                console.log(`${oldName} → ${newName}`);
                
                try {
                    await db.collection('players').doc(doc.id).update({
                        name: newName
                    });
                    updated++;
                } catch (err) {
                    errors.push({ id: doc.id, name: oldName, error: err.message });
                }
            } else {
                console.log(`✓ ${oldName} (déjà correct)`);
            }
        }
        
        console.log(`\n=== Résultat ===`);
        console.log(`${updated} noms mis à jour`);
        
        if (errors.length > 0) {
            console.log(`${errors.length} erreurs :`);
            errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`));
        }
        
        console.log('\nRafraîchis la page pour voir les changements.');
        
        return { updated, errors };
        
    } catch (error) {
        console.error('Erreur lors de la normalisation:', error);
        return { error: error.message };
    }
}

/**
 * Diagnostique les problèmes de volume pour les joueuses
 */
async function diagnosePlayerVolumes() {
    console.log('=== Diagnostic des volumes ===\n');
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Lundi
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
    
    console.log(`Semaine depuis: ${startOfWeekStr}`);
    console.log(`Mois depuis: ${startOfMonthStr}\n`);
    
    try {
        // Récupérer toutes les joueuses
        const playersSnapshot = await db.collection('players').get();
        const players = {};
        playersSnapshot.forEach(doc => {
            players[doc.id] = doc.data().name;
        });
        
        console.log(`${Object.keys(players).length} joueuses trouvées\n`);
        
        // Récupérer tous les RPE
        const rpeSnapshot = await db.collection('rpe').get();
        
        console.log(`${rpeSnapshot.size} entrées RPE au total\n`);
        
        // Analyser par joueuse
        const playerRPE = {};
        const issues = [];
        
        rpeSnapshot.forEach(doc => {
            const data = doc.data();
            const playerId = data.playerId;
            
            if (!playerRPE[playerId]) {
                playerRPE[playerId] = {
                    total: 0,
                    thisWeek: 0,
                    thisMonth: 0,
                    samples: []
                };
            }
            
            playerRPE[playerId].total++;
            
            // Vérifier la date
            const date = data.date;
            if (date >= startOfWeekStr) {
                playerRPE[playerId].thisWeek++;
            }
            if (date >= startOfMonthStr) {
                playerRPE[playerId].thisMonth++;
            }
            
            // Garder quelques samples
            if (playerRPE[playerId].samples.length < 3) {
                playerRPE[playerId].samples.push({
                    date: data.date,
                    duration: data.duration,
                    rpe: data.rpe,
                    type: data.type
                });
            }
        });
        
        // Afficher le diagnostic
        console.log('=== Détail par joueuse ===\n');
        
        Object.keys(players).forEach(playerId => {
            const name = players[playerId];
            const rpe = playerRPE[playerId];
            
            if (!rpe) {
                console.log(`❌ ${name} (${playerId})`);
                console.log(`   Aucune donnée RPE trouvée !`);
                issues.push({ name, playerId, issue: 'Aucune donnée RPE' });
            } else {
                const status = rpe.thisWeek > 0 ? '✓' : '⚠️';
                console.log(`${status} ${name} (${playerId})`);
                console.log(`   Total: ${rpe.total} | Cette semaine: ${rpe.thisWeek} | Ce mois: ${rpe.thisMonth}`);
                
                if (rpe.samples.length > 0) {
                    console.log(`   Exemples:`, rpe.samples);
                }
                
                if (rpe.thisWeek === 0) {
                    issues.push({ name, playerId, issue: 'Pas de RPE cette semaine' });
                }
            }
            console.log('');
        });
        
        // Vérifier les RPE orphelins (playerId qui n'existe pas)
        const orphanPlayerIds = Object.keys(playerRPE).filter(id => !players[id]);
        if (orphanPlayerIds.length > 0) {
            console.log('=== RPE orphelins (playerId inexistant) ===');
            orphanPlayerIds.forEach(id => {
                console.log(`   ${id}: ${playerRPE[id].total} entrées`);
            });
        }
        
        console.log('\n=== Résumé des problèmes ===');
        if (issues.length === 0) {
            console.log('Aucun problème détecté !');
        } else {
            issues.forEach(i => console.log(`- ${i.name}: ${i.issue}`));
        }
        
        return { players: Object.keys(players).length, issues };
        
    } catch (error) {
        console.error('Erreur diagnostic:', error);
        return { error: error.message };
    }
}

/**
 * Corrige le nom d'une joueuse spécifique
 */
async function fixPlayerName(playerId, newName) {
    try {
        const doc = await db.collection('players').doc(playerId).get();
        if (!doc.exists) {
            console.log('Joueuse non trouvée:', playerId);
            return false;
        }
        
        const oldName = doc.data().name;
        await db.collection('players').doc(playerId).update({ name: newName });
        console.log(`${oldName} → ${newName}`);
        return true;
        
    } catch (error) {
        console.error('Erreur:', error);
        return false;
    }
}

/**
 * Liste toutes les joueuses avec leurs IDs
 */
async function listAllPlayers() {
    console.log('=== Liste des joueuses ===\n');
    
    const snapshot = await db.collection('players').get();
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`${data.name}`);
        console.log(`   ID: ${doc.id}`);
        console.log(`   Birthday: ${data.birthday || 'N/A'}`);
        console.log('');
    });
    
    console.log(`Total: ${snapshot.size} joueuses`);
}

/**
 * Vérifie les IDs utilisés dans les RPE vs les joueuses
 */
async function checkPlayerIdMismatch() {
    console.log('=== Vérification des IDs ===\n');
    
    // IDs des joueuses
    const playersSnapshot = await db.collection('players').get();
    const playerIds = new Set();
    const playerNames = {};
    
    playersSnapshot.forEach(doc => {
        playerIds.add(doc.id);
        playerNames[doc.id] = doc.data().name;
    });
    
    console.log('IDs des joueuses:');
    playerIds.forEach(id => console.log(`  ${id} → ${playerNames[id]}`));
    
    // IDs utilisés dans les RPE
    const rpeSnapshot = await db.collection('rpe').get();
    const rpePlayerIds = new Set();
    
    rpeSnapshot.forEach(doc => {
        rpePlayerIds.add(doc.data().playerId);
    });
    
    console.log('\nIDs dans les RPE:');
    rpePlayerIds.forEach(id => {
        const exists = playerIds.has(id) ? '✓' : '❌ INEXISTANT';
        console.log(`  ${id} ${exists}`);
    });
    
    // Joueuses sans RPE
    console.log('\nJoueuses sans aucun RPE:');
    playerIds.forEach(id => {
        if (!rpePlayerIds.has(id)) {
            console.log(`  ❌ ${playerNames[id]} (${id})`);
        }
    });
}

/**
 * Enlève les accents d'une chaîne
 */
function removeAccents(str) {
    if (!str) return str;
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Corrige les playerId dans la collection RPE pour correspondre aux IDs des players
 * (enlève les accents et supprime les données invalides)
 */
async function fixRpePlayerIds() {
    console.log('=== Correction des playerId dans RPE ===\n');
    
    // Récupérer les IDs des players
    const playersSnapshot = await db.collection('players').get();
    const playerIds = new Set();
    playersSnapshot.forEach(doc => playerIds.add(doc.id));
    
    console.log('IDs des players:', Array.from(playerIds));
    
    // Récupérer tous les RPE
    const rpeSnapshot = await db.collection('rpe').get();
    
    let fixed = 0;
    let deleted = 0;
    let errors = [];
    let alreadyOk = 0;
    
    for (const doc of rpeSnapshot.docs) {
        const data = doc.data();
        const oldPlayerId = data.playerId;
        
        // Supprimer les RPE avec playerId invalide
        if (!oldPlayerId || oldPlayerId === 'Test' || oldPlayerId === 'undefined') {
            console.log(`🗑️ Suppression RPE invalide: ${oldPlayerId || 'undefined'}`);
            try {
                await db.collection('rpe').doc(doc.id).delete();
                deleted++;
            } catch (err) {
                errors.push({ docId: doc.id, oldPlayerId, error: err.message });
            }
            continue;
        }
        
        const newPlayerId = removeAccents(oldPlayerId);
        
        if (oldPlayerId !== newPlayerId) {
            // Vérifier si le nouveau playerId existe dans players
            if (playerIds.has(newPlayerId)) {
                console.log(`✏️ ${oldPlayerId} → ${newPlayerId}`);
                
                try {
                    await db.collection('rpe').doc(doc.id).update({
                        playerId: newPlayerId
                    });
                    fixed++;
                } catch (err) {
                    errors.push({ docId: doc.id, oldPlayerId, error: err.message });
                }
            } else {
                console.log(`⚠️ ${oldPlayerId} → ${newPlayerId} (player inexistant)`);
                errors.push({ docId: doc.id, oldPlayerId, newPlayerId, error: 'Player inexistant' });
            }
        } else {
            alreadyOk++;
        }
    }
    
    console.log(`\n=== Résultat ===`);
    console.log(`✅ ${fixed} RPE corrigés`);
    console.log(`🗑️ ${deleted} RPE supprimés`);
    console.log(`✓ ${alreadyOk} RPE déjà corrects`);
    
    if (errors.length > 0) {
        console.log(`❌ ${errors.length} erreurs:`, errors);
    }
    
    console.log('\nRafraîchis la page pour voir les changements.');
    return { fixed, deleted, alreadyOk, errors };
}

/**
 * Corrige aussi les playerId dans la collection checkins
 */
async function fixCheckinsPlayerIds() {
    console.log('=== Correction des playerId dans Checkins ===\n');
    
    // Récupérer les IDs des players
    const playersSnapshot = await db.collection('players').get();
    const playerIds = new Set();
    playersSnapshot.forEach(doc => playerIds.add(doc.id));
    
    // Récupérer tous les checkins
    const checkinsSnapshot = await db.collection('checkins').get();
    
    let fixed = 0;
    let deleted = 0;
    let errors = [];
    let alreadyOk = 0;
    
    for (const doc of checkinsSnapshot.docs) {
        const data = doc.data();
        const oldPlayerId = data.playerId;
        
        // Supprimer les checkins avec playerId invalide
        if (!oldPlayerId || oldPlayerId === 'Test' || oldPlayerId === 'undefined') {
            console.log(`🗑️ Suppression checkin invalide: ${oldPlayerId || 'undefined'}`);
            try {
                await db.collection('checkins').doc(doc.id).delete();
                deleted++;
            } catch (err) {
                errors.push({ docId: doc.id, oldPlayerId, error: err.message });
            }
            continue;
        }
        
        const newPlayerId = removeAccents(oldPlayerId);
        
        if (oldPlayerId !== newPlayerId) {
            if (playerIds.has(newPlayerId)) {
                console.log(`✏️ ${oldPlayerId} → ${newPlayerId}`);
                
                try {
                    await db.collection('checkins').doc(doc.id).update({
                        playerId: newPlayerId
                    });
                    fixed++;
                } catch (err) {
                    errors.push({ docId: doc.id, oldPlayerId, error: err.message });
                }
            } else {
                errors.push({ docId: doc.id, oldPlayerId, newPlayerId, error: 'Player inexistant' });
            }
        } else {
            alreadyOk++;
        }
    }
    
    console.log(`\n=== Résultat ===`);
    console.log(`✅ ${fixed} checkins corrigés`);
    console.log(`🗑️ ${deleted} checkins supprimés`);
    console.log(`✓ ${alreadyOk} checkins déjà corrects`);
    
    if (errors.length > 0) {
        console.log(`❌ ${errors.length} erreurs:`, errors);
    }
    
    return { fixed, deleted, alreadyOk, errors };
}

/**
 * Corrige tout : RPE et Checkins
 */
async function fixAllPlayerIds() {
    console.log('========================================');
    console.log('   CORRECTION DE TOUS LES PLAYER IDS   ');
    console.log('========================================\n');
    
    const rpeResult = await fixRpePlayerIds();
    console.log('\n');
    const checkinsResult = await fixCheckinsPlayerIds();
    
    console.log('\n========================================');
    console.log('   RÉSUMÉ FINAL   ');
    console.log('========================================');
    console.log(`RPE: ${rpeResult.fixed} corrigés, ${rpeResult.alreadyOk} déjà OK`);
    console.log(`Checkins: ${checkinsResult.fixed} corrigés, ${checkinsResult.alreadyOk} déjà OK`);
    console.log('\n🔄 Rafraîchis la page (Ctrl+Shift+R) pour voir les changements !');
    
    return { rpe: rpeResult, checkins: checkinsResult };
}

// Exports globaux
window.normalizeAllPlayerNames = normalizeAllPlayerNames;
window.diagnosePlayerVolumes = diagnosePlayerVolumes;
window.fixPlayerName = fixPlayerName;
window.listAllPlayers = listAllPlayers;
window.checkPlayerIdMismatch = checkPlayerIdMismatch;
window.normalizeName = normalizeName;
window.fixRpePlayerIds = fixRpePlayerIds;
window.fixCheckinsPlayerIds = fixCheckinsPlayerIds;
window.fixAllPlayerIds = fixAllPlayerIds;
window.removeAccents = removeAccents;

console.log('Admin Tools chargé. Commandes disponibles:');
console.log('  - normalizeAllPlayerNames() : Normalise tous les noms');
console.log('  - diagnosePlayerVolumes() : Diagnostique les volumes');
console.log('  - listAllPlayers() : Liste toutes les joueuses');
console.log('  - checkPlayerIdMismatch() : Vérifie les IDs RPE vs joueuses');
console.log('  - fixAllPlayerIds() : ⭐ CORRIGE les accents dans RPE et Checkins');
console.log('  - mergeSessionTypes() : ⭐ FUSIONNE les types de sessions');
console.log('  - analyzeRpeData() : Analyse les données RPE');

/**
 * Fusionne les types de sessions :
 * - Match Amical + Match Championnat → Match
 * - Entraînement Technique + Entraînement Complet → Entraînement
 */
async function mergeSessionTypes() {
    console.log('=== Fusion des types de sessions ===\n');
    
    // Mapping des types à fusionner
    const typeMapping = {
        'Match Amical': 'Match',
        'Match Championnat': 'Match',
        'match amical': 'Match',
        'match championnat': 'Match',
        'Entraînement Technique': 'Entraînement',
        'Entraînement Complet': 'Entraînement',
        'Entrainement Technique': 'Entraînement',
        'Entrainement Complet': 'Entraînement',
        'entraînement technique': 'Entraînement',
        'entraînement complet': 'Entraînement',
        'entrainement technique': 'Entraînement',
        'entrainement complet': 'Entraînement'
    };
    
    const rpeSnapshot = await db.collection('rpe').get();
    
    let fixed = 0;
    let alreadyOk = 0;
    const typesFound = {};
    
    for (const doc of rpeSnapshot.docs) {
        const data = doc.data();
        const oldType = data.sessionType;
        
        // Compter les types
        typesFound[oldType] = (typesFound[oldType] || 0) + 1;
        
        // Vérifier si on doit fusionner
        const newType = typeMapping[oldType];
        
        if (newType && oldType !== newType) {
            console.log(`✏️ ${oldType} → ${newType}`);
            await db.collection('rpe').doc(doc.id).update({ sessionType: newType });
            fixed++;
        } else {
            alreadyOk++;
        }
    }
    
    console.log('\n📊 Types trouvés avant correction:');
    Object.entries(typesFound).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
    });
    
    console.log(`\n=== Résultat ===`);
    console.log(`✅ ${fixed} RPE modifiés`);
    console.log(`✓ ${alreadyOk} RPE déjà corrects`);
    console.log('\n🔄 Rafraîchis la page (Ctrl+Shift+R)');
    
    return { fixed, alreadyOk, typesFound };
}

/**
 * Analyse les données RPE (types de sessions et champs)
 */
async function analyzeRpeData() {
    console.log('=== Analyse des RPE ===\n');
    
    const rpeSnapshot = await db.collection('rpe').get();
    
    const sessionTypes = {};
    const fields = {};
    let samples = [];
    
    rpeSnapshot.forEach(doc => {
        const data = doc.data();
        
        // Compter les types de sessions
        const type = data.sessionType || data.type || data.trainingType || 'INCONNU';
        sessionTypes[type] = (sessionTypes[type] || 0) + 1;
        
        // Analyser les champs présents
        Object.keys(data).forEach(key => {
            fields[key] = (fields[key] || 0) + 1;
        });
        
        // Garder quelques exemples
        if (samples.length < 5) {
            samples.push({ id: doc.id, ...data });
        }
    });
    
    console.log('📊 Types de sessions trouvés:');
    Object.entries(sessionTypes).sort((a,b) => b[1] - a[1]).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
    });
    
    console.log('\n📋 Champs présents dans les RPE:');
    Object.entries(fields).sort((a,b) => b[1] - a[1]).forEach(([field, count]) => {
        console.log(`  ${field}: ${count} documents`);
    });
    
    console.log('\n📝 Exemples de documents:');
    samples.forEach((s, i) => {
        console.log(`\nExemple ${i+1}:`, s);
    });
    
    return { sessionTypes, fields, total: rpeSnapshot.size };
}

/**
 * Corrige les accents dans les playerId des collections checkins et rpe
 * Remplace les IDs avec accents par les IDs sans accents
 */
async function fixAccentedPlayerIds() {
    console.log('=== Correction des accents dans les playerId ===\n');
    
    // Mapping des IDs avec accents vers IDs sans accents
    const accentMapping = {
        'Léa': 'Lea',
        'Nélia': 'Nelia', 
        'Chloé': 'Chloe',
        'Mélina': 'Melina'
    };
    
    let totalFixed = 0;
    
    for (const [accentedId, correctId] of Object.entries(accentMapping)) {
        console.log(`\n🔍 Recherche: ${accentedId} → ${correctId}`);
        
        // Corriger dans checkins
        const checkinsSnapshot = await db.collection('checkins')
            .where('playerId', '==', accentedId)
            .get();
        
        if (checkinsSnapshot.size > 0) {
            console.log(`  📋 Checkins à corriger: ${checkinsSnapshot.size}`);
            for (const doc of checkinsSnapshot.docs) {
                await db.collection('checkins').doc(doc.id).update({ playerId: correctId });
            }
            console.log(`  ✅ Checkins corrigés`);
            totalFixed += checkinsSnapshot.size;
        } else {
            console.log(`  ✓ Aucun checkin avec accent`);
        }
        
        // Corriger dans rpe
        const rpeSnapshot = await db.collection('rpe')
            .where('playerId', '==', accentedId)
            .get();
        
        if (rpeSnapshot.size > 0) {
            console.log(`  📊 RPE à corriger: ${rpeSnapshot.size}`);
            for (const doc of rpeSnapshot.docs) {
                await db.collection('rpe').doc(doc.id).update({ playerId: correctId });
            }
            console.log(`  ✅ RPE corrigés`);
            totalFixed += rpeSnapshot.size;
        } else {
            console.log(`  ✓ Aucun RPE avec accent`);
        }
    }
    
    console.log(`\n🎉 Total corrigé: ${totalFixed} documents`);
    return totalFixed;
}

/**
 * Diagnostique les problèmes d'accents dans les playerId
 * Sans modifier les données
 */
async function diagnoseAccentedPlayerIds() {
    console.log('=== Diagnostic des accents dans les playerId ===\n');
    
    const accentMapping = {
        'Léa': 'Lea',
        'Nélia': 'Nelia', 
        'Chloé': 'Chloe',
        'Mélina': 'Melina'
    };
    
    let totalProblems = 0;
    
    for (const [accentedId, correctId] of Object.entries(accentMapping)) {
        const checkinsCount = (await db.collection('checkins').where('playerId', '==', accentedId).get()).size;
        const rpeCount = (await db.collection('rpe').where('playerId', '==', accentedId).get()).size;
        
        if (checkinsCount > 0 || rpeCount > 0) {
            console.log(`⚠️ ${accentedId}: ${checkinsCount} checkins, ${rpeCount} RPE`);
            totalProblems += checkinsCount + rpeCount;
        } else {
            console.log(`✓ ${accentedId}: OK (aucun document avec accent)`);
        }
    }
    
    if (totalProblems > 0) {
        console.log(`\n⚠️ Total: ${totalProblems} documents à corriger`);
        console.log('👉 Exécutez fixAccentedPlayerIds() pour corriger');
    } else {
        console.log('\n✅ Aucun problème d\'accent détecté!');
    }
    
    return totalProblems;
}

// Exports globaux supplémentaires
window.mergeSessionTypes = mergeSessionTypes;
window.analyzeRpeData = analyzeRpeData;
window.fixAccentedPlayerIds = fixAccentedPlayerIds;
window.diagnoseAccentedPlayerIds = diagnoseAccentedPlayerIds;
/**
 * Importe les données de tests physiques depuis un tableau Excel
 * Format attendu : données copiées depuis Excel (séparées par tabulations)
 * Date des tests : 25/09/2025
 */
async function importTestData(csvData, testDate = '25/09/25') {
    console.log('📥 Import des données de tests...');
    console.log(`📅 Date des tests : ${testDate}`);
    
    try {
        // Parser les données CSV (copier-coller depuis Excel)
        const lines = csvData.trim().split('\n');
        const headers = lines[0].split('\t');
        
        console.log(`📊 ${lines.length - 1} lignes à importer`);
        console.log(`📋 Colonnes détectées : ${headers.length}`);
        
        let imported = 0;
        let errors = [];
        let notFound = [];
        
        // Charger toutes les joueuses
        const playersSnapshot = await db.collection('players').get();
        const playersMap = new Map();
        
        // Helper pour normaliser les noms (sans accents)
        const normalize = (str) => {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
        };
        
        playersSnapshot.forEach(doc => {
            const name = doc.data().name;
            if (!name) return;
            
            const normalizedName = normalize(name);
            playersMap.set(normalizedName, doc.id);
            
            // Ajouter aussi le format inversé (NOM PRENOM)
            const parts = normalizedName.split(' ');
            if (parts.length >= 2) {
                // Pour "Prénom NOM" -> "NOM PRENOM"
                const reversed = parts[parts.length - 1] + ' ' + parts.slice(0, -1).join(' ');
                playersMap.set(reversed, doc.id);
                
                // Pour les noms composés comme "DURIMEL GATO Lovely" -> "DURIMEL GATO LOVELY"
                if (parts.length >= 3) {
                    const lastFirst = parts.slice(1).join(' ') + ' ' + parts[0];
                    playersMap.set(lastFirst, doc.id);
                }
            }
        });
        
        console.log(`👥 ${playersMap.size} variations de noms en base`);
        console.log('📝 Noms disponibles:', Array.from(new Set(playersSnapshot.docs.map(d => d.data().name))).sort());
        
        // Traiter chaque ligne
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t');
            const playerNameRaw = values[0]?.trim();
            
            if (!playerNameRaw) continue;
            
            const playerName = normalize(playerNameRaw);
            
            // Ignorer les lignes d'en-tête parasites
            if (playerName.includes('JOUEUSES') || playerName.includes('CHRONO') || playerName.includes('NAVETTE')) {
                continue;
            }
            
            // Trouver la joueuse
            const playerId = playersMap.get(playerName);
            
            if (!playerId) {
                notFound.push(playerNameRaw);
                console.warn(`⚠️ Joueuse non trouvée : ${playerNameRaw}`);
                continue;
            }
            
            try {
                // Préparer les données à importer
                const updateData = {
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Helper pour ajouter une valeur si elle existe
                const addValue = (field, index, parser = parseFloat) => {
                    const val = values[index]?.trim();
                    if (val && val !== '' && val !== '-' && val !== '#N/A') {
                        if (parser === parseFloat) {
                            const parsedVal = parseFloat(val.replace(',', '.')); // Gérer la virgule comme séparateur décimal
                            if (!isNaN(parsedVal)) {
                                updateData[field] = parsedVal;
                            } // else { console.warn(`Valeur non numérique pour ${field}: ${val}`); }
                        } else {
                            updateData[field] = val; // Pour les chaînes (comme legLength)
                        }
                    }
                };
                
                // INFOS PERSONNELLES
                if (values[1]) updateData.seniority = values[1].trim(); // Ancienneté
                if (values[2]) updateData.muscuPriority = values[2].trim(); // Axe muscu
                if (values[3]) updateData.birthday = values[3].trim(); // Date naissance
                if (values[4]) updateData.handedness = values[4].trim(); // Latéralité
                if (values[5]) updateData.position = values[5].trim(); // Poste
                
                // ANTHROPO
                addValue('height', 7); // Taille
                addValue('weight', 8); // Poids
                // legLength est en texte "116 D 116 G" - on skip
                addValue('sittingHeight', 10); // Taille assise
                addValue('wingspan', 11); // Envergure
                addValue('bodyFat', 12); // % Masse grasse
                addValue('height1B', 13); // Hauteur 1B
                addValue('height2B', 14); // Hauteur 2B
                // Grip G/D manquants dans vos données (cols 15-16-17 vides)
                
                // TEST VOLLEY
                addValue('jumpWithRun', 18); // Saut avec élan
                addValue('jumpStanding', 19); // Saut sans élan
                addValue('broadJump', 20); // Broad jump
                addValue('mbCAV', 21); // Lancer MB CAV gauche
                addValue('mbLeftFront', 22); // Lancer MB CAV droite
                addValue('mbChest', 23); // Lancer MB poitrine
                addValue('speedChrono', 24); // Vitesse chrono 3x6m
                addValue('chrono5m', 25); // Vitesse chrono 5m
                
                // DC (Développé couché)
                addValue('dcRep', 27);
                addValue('dcCharge', 28);
                if (values[27] && values[28]) {
                    const dcMax = calculateMax(parseFloat(values[27]), parseFloat(values[28]));
                    if (dcMax !== '-') updateData.dcMax = dcMax;
                }
                
                // TRACTION (colonnes 30-32 semblent vides/invalides)
                addValue('tractionRep', 30);
                addValue('tractionCharge', 31);
                if (values[30] && values[31]) {
                    const tractionMax = calculateMax(parseFloat(values[30]), parseFloat(values[31]));
                    if (tractionMax !== '-') updateData.tractionMax = tractionMax;
                }
                
                // TIRAGE BANC
                addValue('tirageRep', 33);
                addValue('tirageCharge', 34);
                if (values[33] && values[34]) {
                    const tirageMax = calculateMax(parseFloat(values[33]), parseFloat(values[34]));
                    if (tirageMax !== '-') updateData.tirageMax = tirageMax;
                }
                
                // PULL OVER
                addValue('pullOverRep', 36);
                addValue('pullOverCharge', 37);
                if (values[36] && values[37]) {
                    const pullOverMax = calculateMax(parseFloat(values[36]), parseFloat(values[37]));
                    if (pullOverMax !== '-') updateData.pullOverMax = pullOverMax;
                }
                
                // HIP THRUST
                addValue('hipThrustRep', 39);
                addValue('hipThrustCharge', 40);
                if (values[39] && values[40]) {
                    const hipThrustMax = calculateMax(parseFloat(values[39]), parseFloat(values[40]));
                    if (hipThrustMax !== '-') updateData.hipThrustMax = hipThrustMax;
                }
                
                // SDT
                addValue('sdtRep', 42);
                addValue('sdtCharge', 43);
                if (values[42] && values[43]) {
                    const sdtMax = calculateMax(parseFloat(values[42]), parseFloat(values[43]));
                    if (sdtMax !== '-') updateData.sdtMax = sdtMax;
                }
                
                // BACK SQUAT
                addValue('backSquatRep', 45);
                addValue('backSquatCharge', 46);
                if (values[45] && values[46]) {
                    const backSquatMax = calculateMax(parseFloat(values[45]), parseFloat(values[46]));
                    if (backSquatMax !== '-') updateData.backSquatMax = backSquatMax;
                }
                
                // EPAULE
                addValue('epauleRep', 48);
                addValue('epauleCharge', 49);
                if (values[48] && values[49]) {
                    const epauleMax = calculateMax(parseFloat(values[48]), parseFloat(values[49]));
                    if (epauleMax !== '-') updateData.epauleMax = epauleMax;
                }
                
                // VMA
                addValue('vmaTime', 51);
                addValue('vmaPalier', 52);
                if (testDate) updateData.vmaDate = testDate;
                
                // Mettre à jour dans Firestore
                await db.collection('players').doc(playerId).update(updateData);
                
                imported++;
                console.log(`✅ ${playerName} : ${Object.keys(updateData).length - 1} champs importés`);
                
            } catch (error) {
                errors.push({ player: playerName, error: error.message });
                console.error(`❌ Erreur pour ${playerName}:`, error.message);
            }
        }
        
        // Résumé
        console.log('\n=== RÉSUMÉ DE L\'IMPORT ===');
        console.log(`✅ ${imported} joueuses mises à jour`);
        
        if (notFound.length > 0) {
            console.log(`\n⚠️ ${notFound.length} joueuses non trouvées :`);
            notFound.forEach(name => console.log(`   - ${name}`));
        }
        
        if (errors.length > 0) {
            console.log(`\n❌ ${errors.length} erreurs :`);
            errors.forEach(e => console.log(`   - ${e.player}: ${e.error}`));
        }
        
        return { imported, notFound, errors };
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'import :', error);
        throw error;
    }
}

/**
 * Fonction pour calculer le 1RM (Formule d'Epley)
 */
function calculateMax(rep, charge) {
    if (!rep || !charge || rep === 0 || charge === 0) return '-';
    const max = Math.round(charge * (1 + rep / 30));
    return max;
}

// Export de la fonction d'import
window.importTestData = importTestData;

/**
 * Importe les données de tests dans une sous-collection avec historique
 * Permet de garder plusieurs sessions de tests avec leurs dates
 * Usage: importTestDataWithHistory(csvData, "2026-01-15")
 */
async function importTestDataWithHistory(csvData, testDate) {
    console.log('📥 Import des données de tests AVEC HISTORIQUE...');
    console.log(`📅 Date de la session : ${testDate}`);
    
    if (!testDate) {
        console.error('❌ La date est obligatoire (format: YYYY-MM-DD ou DD/MM/YY)');
        return;
    }
    
    // Convertir la date au format YYYY-MM-DD pour l'ID
    let sessionId = testDate;
    if (testDate.includes('/')) {
        const parts = testDate.split('/');
        if (parts[2].length === 2) {
            sessionId = `20${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
    }
    
    try {
        const lines = csvData.trim().split('\n');
        const headers = lines[0].split('\t');
        
        console.log(`📊 ${lines.length - 1} lignes à importer`);
        console.log(`🗂️ Session ID : ${sessionId}`);
        
        let imported = 0;
        let errors = [];
        let notFound = [];
        
        // Charger toutes les joueuses
        const playersSnapshot = await db.collection('players').get();
        console.log(`📊 Total documents players: ${playersSnapshot.size}`);
        
        const playersMap = new Map();
        
        // Helper pour normaliser les noms (sans accents)
        const normalize = (str) => {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
        };
        
        playersSnapshot.forEach(doc => {
            const data = doc.data();
            const name = data.name;
            
            console.log(`🔍 Player trouvée: ${name} (status: ${data.status || 'undefined'})`);
            
            if (!name) {
                console.warn(`⚠️ Document ${doc.id} sans nom`);
                return;
            }
            
            // Inclure toutes les joueuses (actives ou sans status défini)
            if (data.status && data.status !== 'active') {
                console.log(`⏭️ Joueuse ${name} ignorée (status: ${data.status})`);
                return;
            }
            
            const normalizedName = normalize(name);
            playersMap.set(normalizedName, doc.id);
            
            // Ajouter aussi le format inversé
            const parts = normalizedName.split(' ');
            if (parts.length >= 2) {
                const reversed = parts[parts.length - 1] + ' ' + parts.slice(0, -1).join(' ');
                playersMap.set(reversed, doc.id);
                
                if (parts.length >= 3) {
                    const lastFirst = parts.slice(1).join(' ') + ' ' + parts[0];
                    playersMap.set(lastFirst, doc.id);
                }
            }
        });
        
        console.log(`👥 ${playersMap.size} variations de noms en base`);
        
        // Traiter chaque ligne
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split('\t');
            const playerNameRaw = values[0]?.trim();
            
            // Ignorer les lignes vides ou avec seulement des espaces
            if (!playerNameRaw || playerNameRaw.length === 0) {
                console.log(`⏭️ Ligne ${i + 1} ignorée (vide)`);
                continue;
            }
            
            const playerName = normalize(playerNameRaw);
            
            // Ignorer les lignes d'en-tête parasites ou noms invalides
            if (!playerName || playerName.length < 3 || 
                playerName.includes('JOUEUSES') || 
                playerName.includes('CHRONO') || 
                playerName.includes('NAVETTE') ||
                playerName.includes('VITESSE')) {
                console.log(`⏭️ Ligne ${i + 1} ignorée (en-tête ou invalide): "${playerNameRaw}"`);
                continue;
            }
            
            const playerId = playersMap.get(playerName);
            
            if (!playerId) {
                notFound.push(playerNameRaw);
                console.warn(`⚠️ Joueuse non trouvée : "${playerNameRaw}" (normalisé: "${playerName}")`);
                continue;
            }
            
            try {
                // Préparer les données de test
                const testData = {
                    testDate: testDate, // Correction ici: utiliser testDate
                    sessionId: sessionId,
                    importedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Helper pour ajouter une valeur
                const addValue = (field, index, parser = parseFloat) => {
                    const val = values[index]?.trim();
                    if (val && val !== '' && val !== '-' && val !== '#N/A') {
                        if (parser === parseFloat) {
                            const parsedVal = parseFloat(val.replace(',', '.'));
                            if (!isNaN(parsedVal)) {
                                testData[field] = parsedVal;
                            }
                        } else {
                            testData[field] = val;
                        }
                    }
                };
                
                // INFOS PERSONNELLES
                if (values[1]) testData.seniority = values[1].trim();
                if (values[2]) testData.muscuPriority = values[2].trim();
                if (values[3]) testData.birthday = values[3].trim();
                if (values[4]) testData.handedness = values[4].trim();
                if (values[5]) testData.position = values[5].trim();
                
                // ANTHROPO
                addValue('height', 7);
                addValue('weight', 8);
                // colonne 9: empan de main (non mappé)
                addValue('sittingHeight', 10);
                addValue('wingspan', 11);
                addValue('bodyFat', 12);
                addValue('height1B', 13);
                addValue('height2B', 14);
                // colonne 15: séparateur
                
                // TEST VOLLEY
                addValue('grispD', 16);
                addValue('grispG', 17);
                addValue('jumpStanding', 18);
                addValue('jumpWithRun', 19);
                addValue('broadJump', 20);
                addValue('mbChest', 21);        // LANCER MB DEVANT
                addValue('mbCAV', 22);          // MB CAV GAUCHE
                addValue('mbLeftFront', 23);    // MB CAV DROITE
                addValue('speedChrono', 24);
                addValue('chrono5m', 25);
                // colonne 26: séparateur
                
                // DC (colonnes 27-29)
                addValue('dcRep', 27);
                addValue('dcCharge', 28);
                // colonne 29: MAX EXTRAPOLE calculé
                if (values[27] && values[28]) {
                    const dcMax = calculateMax(parseFloat(values[27]), parseFloat(values[28]));
                    if (dcMax !== '-') testData.dcMax = dcMax;
                }
                // colonne 30: séparateur
                
                // TRACTION (colonnes 31-33)
                addValue('tractionRep', 31);
                addValue('tractionCharge', 32);
                // colonne 33: MAX EXTRAPOLE calculé
                if (values[31] && values[32]) {
                    const tractionMax = calculateMax(parseFloat(values[31]), parseFloat(values[32]));
                    if (tractionMax !== '-') testData.tractionMax = tractionMax;
                }
                // colonne 34: séparateur
                
                // TIRAGE BANC (colonnes 35-37)
                addValue('tirageRep', 35);
                addValue('tirageCharge', 36);
                // colonne 37: MAX EXTRAPOLE calculé
                if (values[35] && values[36]) {
                    const tirageMax = calculateMax(parseFloat(values[35]), parseFloat(values[36]));
                    if (tirageMax !== '-') testData.tirageMax = tirageMax;
                }
                // colonne 38: séparateur
                
                // PULL OVER (colonnes 39-41)
                addValue('pullOverRep', 39);
                addValue('pullOverCharge', 40);
                // colonne 41: MAX EXTRAPOLE calculé
                if (values[39] && values[40]) {
                    const pullOverMax = calculateMax(parseFloat(values[39]), parseFloat(values[40]));
                    if (pullOverMax !== '-') testData.pullOverMax = pullOverMax;
                }
                // colonne 42: séparateur
                
                // HIP THRUST (colonnes 43-45)
                addValue('hipThrustRep', 43);
                addValue('hipThrustCharge', 44);
                // colonne 45: MAX EXTRAPOLE calculé
                if (values[43] && values[44]) {
                    const hipThrustMax = calculateMax(parseFloat(values[43]), parseFloat(values[44]));
                    if (hipThrustMax !== '-') testData.hipThrustMax = hipThrustMax;
                }
                // colonne 46: séparateur
                
                // SDT (colonnes 47-49)
                addValue('sdtRep', 47);
                addValue('sdtCharge', 48);
                // colonne 49: MAX EXTRAPOLE calculé
                if (values[47] && values[48]) {
                    const sdtMax = calculateMax(parseFloat(values[47]), parseFloat(values[48]));
                    if (sdtMax !== '-') testData.sdtMax = sdtMax;
                }
                // colonne 50: séparateur
                
                // BACK SQUAT (colonnes 51-53)
                addValue('backSquatRep', 51);
                addValue('backSquatCharge', 52);
                // colonne 53: MAX EXTRAPOLE calculé
                if (values[51] && values[52]) {
                    const backSquatMax = calculateMax(parseFloat(values[51]), parseFloat(values[52]));
                    if (backSquatMax !== '-') testData.backSquatMax = backSquatMax;
                }
                // colonne 54: séparateur
                
                // EPAULE (colonnes 55-57)
                addValue('epauleRep', 55);
                addValue('epauleCharge', 56);
                // colonne 57: MAX EXTRAPOLE calculé
                if (values[55] && values[56]) {
                    const epauleMax = calculateMax(parseFloat(values[55]), parseFloat(values[56]));
                    if (epauleMax !== '-') testData.epauleMax = epauleMax;
                }
                // colonnes 58-62: TEST NEURO (Ios Droit, Ios Gauche, PORTERIE) - non mappés
                
                // VMA (colonnes 63-64)
                addValue('vmaTime', 63);
                addValue('vmaPalier', 64);
                if (testDate) testData.vmaDate = testDate;
                
                // Stocker dans la sous-collection testSessions
                await db.collection('players').doc(playerId)
                    .collection('testSessions').doc(sessionId).set(testData);
                
                // AUSSI mettre à jour le document principal avec les dernières valeurs
                const mainUpdate = { ...testData };
                delete mainUpdate.importedAt;
                mainUpdate.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                await db.collection('players').doc(playerId).update(mainUpdate);
                
                imported++;
                console.log(`✅ ${playerNameRaw} : Session ${sessionId} enregistrée`);
                
            } catch (error) {
                errors.push({ player: playerNameRaw, error: error.message });
                console.error(`❌ Erreur pour ${playerNameRaw}:`, error.message);
            }
        }
        
        // Résumé
        console.log('\n=== RÉSUMÉ DE L\'IMPORT ===');
        console.log(`✅ ${imported} sessions enregistrées`);
        console.log(`📅 Date : ${testDate}`);
        console.log(`🗂️ ID Session : ${sessionId}`);
        
        if (notFound.length > 0) {
            console.log(`\n⚠️ ${notFound.length} joueuses non trouvées :`);
            notFound.forEach(name => console.log(`   - ${name}`));
        }
        
        if (errors.length > 0) {
            console.log(`\n❌ ${errors.length} erreurs :`);
            errors.forEach(e => console.log(`   - ${e.player}: ${e.error}`));
        }
        
        return { imported, notFound, errors, sessionId };
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'import :', error);
        throw error;
    }
}

window.importTestDataWithHistory = importTestDataWithHistory;

/**
 * Debug : affiche toutes les colonnes de la première joueuse
 */
function debugExcelColumns(csvData) {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split('\t');
    const firstPlayer = lines[1].split('\t');
    
    console.log('=== DEBUG COLONNES EXCEL ===');
    console.log(`Total colonnes : ${headers.length}`);
    console.log('\nIndex | En-tête | Valeur première joueuse');
    console.log('------|---------|------------------------');
    
    for (let i = 0; i < Math.max(headers.length, firstPlayer.length); i++) {
        const header = headers[i] || '(vide)';
        const value = firstPlayer[i] || '(vide)';
        console.log(`${i.toString().padStart(3)} | ${header.substring(0, 30).padEnd(30)} | ${value}`);
    }
    
    return { headers, firstPlayer };
}

window.debugExcelColumns = debugExcelColumns;

console.log('📥 Fonction importTestData() disponible');
console.log('   Usage: importTestData(csvData, "25/09/25")');
console.log('   1. Copiez les données depuis Excel (Ctrl+C)');
console.log('   2. Dans la console : importTestData(`collez ici`, "25/09/25")');