/**
 * Physical Tests Manager - Gestion des tests physiques (export/import Excel)
 */

console.log('📊 Chargement physical-tests-manager.js');

/**
 * Export template Excel avec les noms des joueuses (avec ExcelJS pour styling complet)
 */
async function exportTestsTemplate() {
    try {
        // Récupérer toutes les joueuses
        const playersSnapshot = await db.collection('players').get();
        
        const players = [];
        playersSnapshot.forEach(doc => {
            const data = doc.data();
            if (!data.status || data.status === 'active') {
                players.push({
                    id: doc.id,
                    name: data.name,
                    birthday: data.birthday || '',
                    handedness: data.handedness || '',
                    position: data.position || ''
                });
            }
        });
        
        players.sort((a, b) => a.name.localeCompare(b.name));
        
        if (players.length === 0) {
            alert('⚠️ Aucune joueuse trouvée');
            return;
        }
        
        // Créer un workbook ExcelJS
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Tests Physiques');
        
        // Couleurs pour les sections
        const colors = {
            infos: 'B6D7A8',      // Vert clair
            anthropo: 'A4C2F4',   // Bleu clair
            tests: 'FFF2CC',      // Jaune clair
            muscu: 'FCE5CD',      // Orange clair
            neuro: 'D5A6BD',      // Rose
            vma: 'B4A7D6',        // Violet clair
            gray: 'D9D9D9',       // Gris clair
            separator: '000000',   // Noir pour séparateurs
            playerName: 'D0E0F0'  // Bleu très clair
        };
        
        // Définir les largeurs de colonnes
        const colWidths = [
            20, 12, 20, 16, 12, 10, // INFOS (6 cols)
            3,  // Séparateur
            8, 8, 12, 12, 12, 12, 14, 14, // ANTHROPO (8 cols)
            3,  // Séparateur
            8, 8, 14, 14, 12, 16, 18, 18, 18, 16, // TESTS VOLLEY (10 cols)
            3,  // Séparateur
            6, 10, 12, // DC
            3,  // Séparateur
            6, 10, 12, // TRACTION
            3,  // Séparateur
            6, 10, 12, // TIRAGE
            3,  // Séparateur
            6, 10, 12, // PULL OVER
            3,  // Séparateur
            6, 10, 12, // HIP THRUST
            3,  // Séparateur
            6, 10, 12, // SDT
            3,  // Séparateur
            6, 10, 12, // BACK SQUAT
            3,  // Séparateur
            6, 10, 12, // EPAULE
            3,  // Séparateur
            12, 12, 20, // TEST NEURO
            3,  // Séparateur
            10, 10 // VMA
        ];
        
        colWidths.forEach((width, i) => {
            worksheet.getColumn(i + 1).width = width;
        });
        
        // Ligne 1 : En-têtes de groupes
        const row1 = worksheet.getRow(1);
        row1.height = 30;
        
        const headers1 = [
            'INFOS GENERALES', '', '', '', '', '',
            '',
            'ANTHROPOMETRIE', '', '', '', '', '', '', '',
            '',
            'TESTS VOLLEY', '', '', '', '', '', '', '', '', '',
            '',
            'DC (barré)', '', '',
            '',
            'TRACTION', '', '',
            '',
            'TIRAGE BANC', '', '',
            '',
            'PULL OVER', '', '',
            '',
            'HIP THRUST', '', '',
            '',
            'SDT', '', '',
            '',
            'BACK SQUAT', '', '',
            '',
            'EPAULE', '', '',
            '',
            'TEST NEURO', '', '',
            '',
            'VMA', ''
        ];
        
        headers1.forEach((header, i) => {
            const cell = row1.getCell(i + 1);
            cell.value = header;
        });
        
        // Ligne 2 : En-têtes détaillés
        const row2 = worksheet.getRow(2);
        row2.height = 40;
        
        const headers2 = [
            'JOUEUSES', 'CLASSE/ANNEE', 'AXE DEVELOPPEMENT PHYSIQUE', 'DATE DE NAISSANCE', 'LATERALITE', 'POSTE',
            '',
            'TAILLE', 'POIDS', 'EMPAN DE MAIN', 'TAILLE ASSISE', 'ENVERGURE', '% MASSE GRASSE', 'HAUTEUR MAIN 1B', 'HAUTEUR MAIN 2B',
            '',
            'GRISP D', 'GRISP G', 'SAUT SANS ELAN', 'SAUT AVEC ELAN', 'BROAD JUMP', 'LANCER MB DEVANT', 'LANCER MB CAV GAUCHE', 'LANCER MB CAV DROITE', 'VITESSE DEPART ARRETE (4,35 → 4\'\'35)', 'VITESSE LANCEE (5m) (4,35 → 4\'\'35)',
            '',
            'Rép', 'CHARGE', 'MAX EXTRAPOLE',
            '',
            'Rép', 'CHARGE', 'MAX EXTRAPOLE',
            '',
            'Rép', 'CHARGE', 'MAX EXTRAPOLE',
            '',
            'Rép', 'CHARGE', 'MAX EXTRAPOLE',
            '',
            'Rép', 'CHARGE', 'MAX EXTRAPOLE',
            '',
            'Rép', 'CHARGE', 'MAX EXTRAPOLE',
            '',
            'Rép', 'CHARGE', 'MAX EXTRAPOLE',
            '',
            'Rép', 'CHARGE', 'MAX EXTRAPOLE',
            '',
            'Ios Droit (sec)', 'Ios Gauche (sec)', 'PORTERIE 30sec (Nbessais)',
            '',
            'Temps (12,45 → 12 min 45)', 'Palier'
        ];
        
        headers2.forEach((header, i) => {
            const cell = row2.getCell(i + 1);
            cell.value = header;
        });
        
        // Ajouter les lignes de joueuses
        players.forEach((player, index) => {
            const row = worksheet.getRow(index + 3);
            row.getCell(1).value = player.name;          // Colonne A: JOUEUSES
            // Colonne B: CLASSE/ANNEE reste vide pour saisie manuelle
            // Colonne C: AXE DEVELOPPEMENT PHYSIQUE reste vide pour saisie manuelle
            row.getCell(4).value = player.birthday;       // Colonne D: DATE DE NAISSANCE
            row.getCell(5).value = player.handedness;     // Colonne E: LATERALITE
            row.getCell(6).value = player.position;       // Colonne F: POSTE
            
            // Appliquer formats personnalisés pour les cellules de temps
            // VITESSE DEPART ARRETE (colonne 25): format "#\"''\"00" pour afficher 4,35 → 4''35
            const speedCell1 = row.getCell(25);
            speedCell1.numFmt = '#"\'\'"00';
            
            // VITESSE LANCEE 5m (colonne 26): format "#\"''\"00" pour afficher 4,35 → 4''35
            const speedCell2 = row.getCell(26);
            speedCell2.numFmt = '#"\'\'"00';
            
            // VMA TEMPS (colonne 64): format "# \"min\" 00" pour afficher 12,45 → 12 min 45
            const vmaCell = row.getCell(64);
            vmaCell.numFmt = '# "min" 00';
            
            // Les autres cellules restent vides pour saisie
        });
        
        // Fusionner les cellules pour les en-têtes de groupes (ligne 1)
        worksheet.mergeCells('A1:F1');  // INFOS GENERALES
        worksheet.mergeCells('H1:O1');  // ANTHROPOMETRIE
        worksheet.mergeCells('Q1:Z1');  // TESTS VOLLEY
        worksheet.mergeCells('AB1:AD1'); // DC
        worksheet.mergeCells('AF1:AH1'); // TRACTION
        worksheet.mergeCells('AJ1:AL1'); // TIRAGE
        worksheet.mergeCells('AN1:AP1'); // PULL OVER
        worksheet.mergeCells('AR1:AT1'); // HIP THRUST
        worksheet.mergeCells('AV1:AX1'); // SDT
        worksheet.mergeCells('AZ1:BB1'); // BACK SQUAT
        worksheet.mergeCells('BD1:BF1'); // EPAULE
        worksheet.mergeCells('BH1:BJ1'); // TEST NEURO
        worksheet.mergeCells('BL1:BM1'); // VMA
        
        // Style des colonnes séparatrices (noir)
        const separatorCols = [7, 16, 27, 31, 35, 39, 43, 47, 51, 55, 59, 63];
        
        // Appliquer les styles
        for (let rowNum = 1; rowNum <= worksheet.rowCount; rowNum++) {
            const row = worksheet.getRow(rowNum);
            
            for (let colNum = 1; colNum <= 65; colNum++) {
                const cell = row.getCell(colNum);
                
                // Bordures de base
                cell.border = {
                    top: {style: 'thin', color: {argb: 'FF000000'}},
                    left: {style: 'thin', color: {argb: 'FF000000'}},
                    bottom: {style: 'thin', color: {argb: 'FF000000'}},
                    right: {style: 'thin', color: {argb: 'FF000000'}}
                };
                
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: 'center',
                    wrapText: true
                };
                
                // Ligne 1 : En-têtes de groupes
                if (rowNum === 1) {
                    cell.font = {bold: true, size: 12, color: {argb: 'FFFFFFFF'}};
                    cell.border.top = {style: 'thick', color: {argb: 'FF000000'}};
                    cell.border.bottom = {style: 'thick', color: {argb: 'FF000000'}};
                    
                    // Couleurs par section
                    if (colNum >= 1 && colNum <= 6) {
                        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF' + colors.infos}};
                    } else if (colNum >= 8 && colNum <= 15) {
                        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF' + colors.anthropo}};
                    } else if (colNum >= 17 && colNum <= 26) {
                        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF' + colors.tests}};
                    } else if (colNum >= 28 && colNum <= 58) {
                        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF' + colors.muscu}};
                    } else if (colNum >= 60 && colNum <= 62) {
                        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF' + colors.neuro}};
                    } else if (colNum >= 64 && colNum <= 65) {
                        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF' + colors.vma}};
                    }
                }
                
                // Ligne 2 : Sous-en-têtes
                if (rowNum === 2) {
                    cell.font = {bold: true, size: 9};
                    cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF' + colors.gray}};
                    cell.border.bottom = {style: 'medium', color: {argb: 'FF000000'}};
                }
                
                // Colonnes séparatrices (fond noir)
                if (separatorCols.includes(colNum)) {
                    cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF' + colors.separator}};
                }
                
                // Colonne JOUEUSES (fond bleu clair)
                if (colNum === 1 && rowNum >= 3) {
                    cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: 'FF' + colors.playerName}};
                    cell.font = {bold: true, size: 10};
                    cell.alignment = {vertical: 'middle', horizontal: 'left'};
                }
            }
        }
        
        // Télécharger le fichier
        const today = new Date().toISOString().split('T')[0];
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tests-physiques-${today}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        console.log(`✅ Template Excel exporté avec ${players.length} joueuses`);
        alert(`✅ Fichier Excel téléchargé avec ${players.length} joueuses`);
        
    } catch (error) {
        console.error('Erreur export template:', error);
        alert('❌ Erreur lors de l\'export : ' + error.message);
    }
}

/**
 * Import fichier de tests Excel
 */
async function importTestsFile() {
    const fileInput = document.getElementById('testFileInput');
    const dateInput = document.getElementById('testDateInput');
    
    if (!fileInput.files || fileInput.files.length === 0) {
        alert('⚠️ Veuillez sélectionner un fichier');
        return;
    }
    
    if (!dateInput.value) {
        alert('⚠️ Veuillez sélectionner une date de tests');
        return;
    }
    
    const file = fileInput.files[0];
    const testDate = dateInput.value; // Format YYYY-MM-DD
    
    try {
        console.log('📥 Lecture du fichier Excel...');
        
        // Lire le fichier Excel avec ExcelJS
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        
        const worksheet = workbook.getWorksheet(1); // Première feuille
        
        if (!worksheet) {
            alert('❌ Aucune feuille trouvée dans le fichier Excel');
            return;
        }
        
        console.log(`📊 ${worksheet.rowCount} lignes dans le fichier`);
        
        // Convertir en format CSV/TSV pour importTestDataWithHistory
        const lines = [];
        worksheet.eachRow((row, rowNumber) => {
            const values = [];
            // Lire les cellules de 1 à 65 (colonnes A à BM)
            for (let i = 1; i <= 65; i++) {
                const cell = row.getCell(i);
                let cellValue = '';
                
                // Essayer différentes méthodes pour extraire la valeur
                if (cell.value === null || cell.value === undefined) {
                    cellValue = '';
                } else if (typeof cell.value === 'string' || typeof cell.value === 'number') {
                    cellValue = cell.value;
                } else if (typeof cell.value === 'object') {
                    // Objets spéciaux Excel
                    if (cell.value.richText) {
                        cellValue = cell.value.richText.map(t => t.text).join('');
                    } else if (cell.value.result !== undefined) {
                        // Formule
                        cellValue = cell.value.result;
                    } else if (cell.value.text !== undefined) {
                        cellValue = cell.value.text;
                    } else {
                        // Dernier recours : convertir en string
                        cellValue = String(cell.value);
                    }
                }
                
                // Convertir en string si nécessaire
                cellValue = cellValue === null || cellValue === undefined ? '' : String(cellValue);
                values.push(cellValue);
            }
            lines.push(values.join('\t'));
            
            // Log première ligne de données pour debug
            if (rowNumber === 3) {
                console.log('🔍 TOUTES les valeurs row 3 (première joueuse):', values);
                console.log('📊 Résumé row 3:', {
                    nom: values[0],
                    classe: values[1],
                    axe: values[2],
                    birthday: values[3],
                    lateralite: values[4],
                    poste: values[5],
                    separateur1: values[6],
                    taille: values[7],
                    poids: values[8],
                    empan: values[9],
                    tailleAssise: values[10],
                    envergure: values[11],
                    masseGrasse: values[12],
                    hauteur1B: values[13],
                    hauteur2B: values[14],
                    separateur2: values[15],
                    grispD: values[16],
                    grispG: values[17]
                });
            }
        });
        
        const csvData = lines.join('\n');
        console.log(`✅ ${lines.length} lignes converties en CSV`);
        
        // Réutiliser la fonction existante importTestDataWithHistory
        if (typeof importTestDataWithHistory === 'function') {
            await importTestDataWithHistory(csvData, testDate);
            
            // Rafraîchir l'affichage
            await loadTestSessions();
            
            // Réinitialiser le formulaire
            fileInput.value = '';
            dateInput.value = '';
            
            alert('✅ Tests importés avec succès !');
        } else {
            alert('❌ Fonction d\'import non disponible');
        }
        
    } catch (error) {
        console.error('Erreur import tests:', error);
        alert('❌ Erreur lors de l\'import : ' + error.message);
    }
}

/**
 * Charge et affiche l'historique des sessions de tests
 */
async function loadTestSessions() {
    const container = document.getElementById('testSessionsList');
    
    try {
        // Récupérer toutes les joueuses
        const playersSnapshot = await db.collection('players').get();
        
        // Map pour compter les sessions par date
        const sessionsMap = new Map();
        
        // Pour chaque joueuse, récupérer ses sessions
        for (const playerDoc of playersSnapshot.docs) {
            const playerData = playerDoc.data();
            // Filtrer côté client : status active ou pas de status défini
            if (!playerData.status || playerData.status === 'active') {
                const sessionsSnapshot = await db.collection('players')
                    .doc(playerDoc.id)
                    .collection('testSessions')
                    .get();
                
                sessionsSnapshot.forEach(sessionDoc => {
                    const sessionId = sessionDoc.id; // Format YYYY-MM-DD
                    const sessionData = sessionDoc.data();
                    
                    if (!sessionsMap.has(sessionId)) {
                        sessionsMap.set(sessionId, {
                            id: sessionId,
                            date: sessionData.date || sessionData.testDate || sessionId,
                            playersCount: 0
                        });
                    }
                    
                    sessionsMap.get(sessionId).playersCount++;
                });
            }
        }
        
        // Convertir en array et trier par date décroissante
        const sessions = Array.from(sessionsMap.values())
            .sort((a, b) => b.id.localeCompare(a.id));
        
        if (sessions.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
                    <p>Aucune session de tests enregistrée</p>
                    <p style="font-size: var(--font-size-sm); margin-top: 8px;">Importez un fichier pour créer votre première session</p>
                </div>
            `;
            return;
        }
        
        // Afficher les sessions
        container.innerHTML = sessions.map(session => `
            <div style="background: white; border: 1px solid var(--color-border); border-radius: var(--radius-base); padding: var(--space-16); margin-bottom: var(--space-12); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: var(--font-weight-semibold); color: var(--color-text); margin-bottom: 4px;">
                        📊 Session du ${session.date}
                    </div>
                    <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                        ${session.playersCount} joueuse${session.playersCount > 1 ? 's' : ''} testée${session.playersCount > 1 ? 's' : ''}
                    </div>
                </div>
                <button class="btn" onclick="deleteTestSession('${session.id}')" style="background: #fee; color: #c00; border: 1px solid #fcc; padding: 8px 16px; border-radius: var(--radius-base); cursor: pointer; font-size: var(--font-size-sm);">
                    🗑️ Supprimer
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Erreur chargement sessions:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff6b6b;">
                ❌ Erreur : ${error.message}
            </div>
        `;
    }
}

/**
 * Supprime une session de tests
 */
async function deleteTestSession(sessionId) {
    if (!confirm(`⚠️ Voulez-vous vraiment supprimer la session du ${sessionId} ?\n\nCette action est irréversible.`)) {
        return;
    }
    
    try {
        // Récupérer toutes les joueuses
        const playersSnapshot = await db.collection('players').get();
        
        let deletedCount = 0;
        
        // Pour chaque joueuse, supprimer la session
        for (const playerDoc of playersSnapshot.docs) {
            const sessionRef = db.collection('players')
                .doc(playerDoc.id)
                .collection('testSessions')
                .doc(sessionId);
            
            const sessionDoc = await sessionRef.get();
            if (sessionDoc.exists) {
                await sessionRef.delete();
                deletedCount++;
            }
        }
        
        console.log(`🗑️ Session ${sessionId} supprimée pour ${deletedCount} joueuses`);
        alert(`✅ Session supprimée pour ${deletedCount} joueuse${deletedCount > 1 ? 's' : ''}`);
        
        // Rafraîchir l'affichage
        await loadTestSessions();
        
    } catch (error) {
        console.error('Erreur suppression session:', error);
        alert('❌ Erreur lors de la suppression : ' + error.message);
    }
}

/**
 * Initialisation de l'onglet
 */
function initPhysicalPrepTab() {
    // Charger le nombre de joueuses
    db.collection('players')
        .get()
        .then(snapshot => {
            const count = snapshot.docs.filter(doc => {
                const data = doc.data();
                return !data.status || data.status === 'active';
            }).length;
            const label = document.getElementById('playerCountLabel');
            if (label) {
                label.textContent = count;
            }
        });
    
    // Charger les sessions
    loadTestSessions();
    
    // Définir la date par défaut à aujourd'hui
    const dateInput = document.getElementById('testDateInput');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
}

// Export global
window.exportTestsTemplate = exportTestsTemplate;
window.importTestsFile = importTestsFile;
window.deleteTestSession = deleteTestSession;
window.loadTestSessions = loadTestSessions;
window.initPhysicalPrepTab = initPhysicalPrepTab;

console.log('✅ Physical Tests Manager chargé');
