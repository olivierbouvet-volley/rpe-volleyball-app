/**
 * Player Tests Visualization - Affichage graphique des tests physiques
 * Affiche les tests avec icônes et graphiques d'évolution sur 3 sessions annuelles
 */

console.log('📊 Chargement player-tests-visualization.js');

/**
 * Affiche l'onglet Tests dans le popup d'une joueuse
 */
async function showPlayerTests(playerId) {
    const container = document.getElementById('playerTestsContent');
    if (!container) {
        console.error('Conteneur playerTestsContent non trouvé');
        return;
    }

    // Toggle affichage
    if (container.style.display === 'block') {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';

    try {
        // Charger toutes les sessions de tests depuis la sous-collection
        const sessionsSnapshot = await db.collection('players').doc(playerId)
            .collection('testSessions')
            .get();
        
        const sessions = [];
        sessionsSnapshot.forEach(doc => {
            sessions.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Trier par ID (qui contient la date au format YYYY-MM-DD)
        sessions.sort((a, b) => a.id.localeCompare(b.id));
        
        console.log(`🔍 Recherche testSessions pour ${playerId}`);
        console.log(`📊 Sessions trouvées : ${sessions.length}`, sessions.map(s => ({ id: s.id, date: s.testDate || s.date || s.id })));
        
        if (sessions.length === 0) {
            // Si pas de sous-collection, essayer charger les données du document principal
            const playerDoc = await db.collection('players').doc(playerId).get();
            if (playerDoc.exists) {
                const player = playerDoc.data();
                console.log('📄 Données du document principal :', { height: player.height, weight: player.weight, dcMax: player.dcMax });
                
                // Créer une session fictive avec les données du document principal
                if (player.height || player.weight || player.dcMax) {
                    console.log('✅ Utilisation des données du document principal comme session unique');
                    const sessions = [{
                        id: 'main',
                        testDate: 'Données actuelles',
                        ...player
                    }];
                    showTestsWithSessions(container, sessions);
                    return;
                }
            }
            
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; background: rgba(255, 107, 107, 0.1); border-radius: 12px; border: 2px dashed #FF6B6B;">
                    <div style="font-size: 48px; margin-bottom: 15px;">📋</div>
                    <h3 style="color: #FF6B6B; margin-bottom: 10px;">Aucun test enregistré</h3>
                    <p style="color: #999;">Utilisez importTestDataWithHistory() pour ajouter les données de tests</p>
                </div>
            `;
            return;
        }
        
        console.log(`📊 ${sessions.length} sessions trouvées :`, sessions.map(s => ({ id: s.id, date: s.testDate || s.date })));
        
        // Stocker les sessions pour affichage des dates dans les cartes
        window.currentTestSessions = sessions;
        
        showTestsWithSessions(container, sessions);

    } catch (error) {
        console.error('Erreur chargement tests:', error);
        container.innerHTML = `<p style="color: #ff6b6b;">❌ Erreur : ${error.message}</p>`;
    }
}

/**
 * Affiche les tests avec les sessions
 */
function showTestsWithSessions(container, sessions) {
    try {
        // Structure HTML avec les tests organisés par catégorie
        const html = `
            <div style="padding: 15px; max-height: 600px; overflow-y: auto;">
                
                <!-- En-tête compact avec dates des sessions -->
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(78, 205, 196, 0.1); border-radius: 8px; border: 1px solid #4ECDC4; width: 48%; display: inline-block;">
                    <div style="font-size: 12px; color: #4ECDC4; font-weight: 600;">📊 ${sessions.length} session${sessions.length > 1 ? 's' : ''}</div>
                    ${sessions.map((s, i) => `
                        <div style="color: #999; font-size: 11px; margin-top: 3px;">
                            <strong style="color: #4ECDC4;">S${i+1}:</strong> ${s.testDate || s.date || s.id}
                        </div>
                    `).join('')}
                </div>
                
                <!-- ANTHROPOMÉTRIE -->
                <div class="test-category" style="margin-bottom: 30px;">
                    <h3 style="color: #4ECDC4; margin-bottom: 15px; border-bottom: 2px solid #4ECDC4; padding-bottom: 10px;">
                        📏 ANTHROPOMÉTRIE
                    </h3>
                    ${createEvolutionCard('👤 Taille', sessions.map(s => s.height), 'cm', '📏')}
                    ${createEvolutionCard('⚖️ Poids', sessions.map(s => s.weight), 'kg', '⚖️')}
                    ${createEvolutionCard('🪑 Taille Assise', sessions.map(s => s.sittingHeight), 'cm', '🪑')}
                    ${createEvolutionCard('🦅 Envergure', sessions.map(s => s.wingspan), 'cm', '🦅')}
                    ${createEvolutionCard('📊 Masse Grasse', sessions.map(s => s.bodyFat), '%', '📊')}
                    ${createEvolutionCard('🏐 Hauteur 1B', sessions.map(s => s.height1B), 'cm', '🏐')}
                    ${createEvolutionCard('🏐 Hauteur 2B', sessions.map(s => s.height2B), 'cm', '🏐')}
                </div>

                <!-- TESTS VOLLEY -->
                <div class="test-category" style="margin-bottom: 30px;">
                    <h3 style="color: #FF6B6B; margin-bottom: 15px; border-bottom: 2px solid #FF6B6B; padding-bottom: 10px;">
                        🏐 TESTS VOLLEY
                    </h3>
                    ${createEvolutionCard('⬆️ Saut Élan', sessions.map(s => s.jumpWithRun), 'cm', '⬆️')}
                    ${createEvolutionCard('⏫ Saut Sans Élan', sessions.map(s => s.jumpStanding), 'cm', '⏫')}
                    ${createEvolutionCard('↔️ Broad Jump', sessions.map(s => s.broadJump), 'cm', '↔️')}
                    ${createEvolutionCard('⬅️ MB CAV Gauche', sessions.map(s => s.mbCAV), 'cm', '⬅️')}
                    ${createEvolutionCard('➡️ MB CAV Droite', sessions.map(s => s.mbLeftFront), 'cm', '➡️')}
                    ${createEvolutionCard('🎯 MB Poitrine', sessions.map(s => s.mbChest), 'cm', '🎯')}
                    ${createEvolutionCard('⚡ Vitesse 3x6m', sessions.map(s => s.speedChrono), 'sec', '⚡')}
                    ${createEvolutionCard('⚡ Vitesse 5m', sessions.map(s => s.chrono5m), 'sec', '⚡')}
                </div>

                <!-- TESTS MUSCULATION -->
                <div class="test-category" style="margin-bottom: 30px;">
                    <h3 style="color: #FFE66D; margin-bottom: 15px; border-bottom: 2px solid #FFE66D; padding-bottom: 10px;">
                        💪 TESTS MUSCULATION (1RM)
                    </h3>
                    ${createEvolutionCard('🏋️ Développé Couché', sessions.map(s => s.dcMax), 'kg', '🏋️')}
                    ${createEvolutionCard('🤸 Traction', sessions.map(s => s.tractionMax), 'kg', '🤸')}
                    ${createEvolutionCard('💪 Tirage Banc', sessions.map(s => s.tirageMax), 'kg', '💪')}
                    ${createEvolutionCard('🦾 Pull Over', sessions.map(s => s.pullOverMax), 'kg', '🦾')}
                    ${createEvolutionCard('🍑 Hip Thrust', sessions.map(s => s.hipThrustMax), 'kg', '🍑')}
                    ${createEvolutionCard('🏋️ SDT', sessions.map(s => s.sdtMax), 'kg', '🏋️')}
                    ${createEvolutionCard('🦵 Back Squat', sessions.map(s => s.backSquatMax), 'kg', '🦵')}
                    ${createEvolutionCard('💪 Épaule', sessions.map(s => s.epauleMax), 'kg', '💪')}
                </div>

                <!-- TEST PHYSIO -->
                <div class="test-category" style="margin-bottom: 30px;">
                    <h3 style="color: #A8DADC; margin-bottom: 15px; border-bottom: 2px solid #A8DADC; padding-bottom: 10px;">
                        🏃 TEST PHYSIO
                    </h3>
                    ${createEvolutionCard('⏱️ VMA Temps', sessions.map(s => s.vmaTime), 'min', '⏱️')}
                    ${createEvolutionCard('📊 VMA Palier', sessions.map(s => s.vmaPalier), '', '📊')}
                </div>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('Erreur lors de la génération des tests:', error);
        container.innerHTML = `<p style="color: #ff6b6b;">❌ Erreur : ${error.message}</p>`;
    }
}

/**
 * Crée une carte d'évolution pour un test sur plusieurs sessions
 */
function createEvolutionCard(label, values, unit, icon) {
    // Filtrer les valeurs définies
    const definedValues = values.filter(v => v !== undefined && v !== null && v !== '' && v !== 0);
    const hasData = definedValues.length > 0;
    
    // Calculer l'évolution (dernière valeur vs première valeur)
    let evolution = 0;
    let evolutionText = '';
    let evolutionColor = '#999';
    
    if (definedValues.length >= 2) {
        const first = parseFloat(definedValues[0]);
        const last = parseFloat(definedValues[definedValues.length - 1]);
        evolution = last - first;
        
        if (evolution > 0) {
            evolutionText = `+${evolution.toFixed(1)} ${unit}`;
            evolutionColor = '#4ECDC4'; // Vert pour progression
        } else if (evolution < 0) {
            evolutionText = `${evolution.toFixed(1)} ${unit}`;
            evolutionColor = '#FF6B6B'; // Rouge pour régression
        } else {
            evolutionText = '=';
            evolutionColor = '#FFE66D'; // Jaune pour stable
        }
    }
    
    return `
        <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); 
                    padding: 15px; 
                    border-radius: 12px; 
                    margin-bottom: 15px;
                    border: 2px solid ${hasData ? '#4ECDC4' : '#333'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 24px;">${icon}</span>
                    <span style="font-size: 14px; color: #fff; font-weight: 600;">${label}</span>
                </div>
                ${definedValues.length >= 2 ? `
                    <div style="background: rgba(78, 205, 196, 0.1); padding: 5px 12px; border-radius: 8px; border: 1px solid ${evolutionColor};">
                        <span style="color: ${evolutionColor}; font-size: 12px; font-weight: bold;">${evolutionText}</span>
                    </div>
                ` : ''}
            </div>
            <div style="display: flex; gap: 10px; justify-content: space-around;">
                ${values.map((val, index) => {
                    const hasValue = val !== undefined && val !== null && val !== '' && val !== 0;
                    const displayValue = hasValue ? val : '-';
                    const displayUnit = hasValue ? unit : '';
                    
                    return `
                        <div style="flex: 1; text-align: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; ${hasValue ? 'border: 1px solid #4ECDC4;' : ''}">
                            <div style="font-size: 9px; color: #4ECDC4; margin-bottom: 2px; font-weight: 600;">S${index + 1}</div>
                            <div style="font-size: 8px; color: #999; margin-bottom: 5px;">${window.currentTestSessions && window.currentTestSessions[index] ? (window.currentTestSessions[index].testDate || window.currentTestSessions[index].date || '') : ''}</div>
                            <div style="font-size: 20px; font-weight: bold; color: ${hasValue ? '#4ECDC4' : '#666'};">
                                ${displayValue}${displayUnit ? ' ' + displayUnit : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

// Export global
window.showPlayerTests = showPlayerTests;

console.log('✅ Player Tests Visualization chargé');
