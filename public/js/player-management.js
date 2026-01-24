/**
 * Player Management - Gestion des profils joueuses
 * Permet de modifier les informations des joueuses (nom, date de naissance, mesures physiques, tests)
 */

console.log('🔵 Chargement player-management.js');

// Variable pour stocker la vue actuelle (cards ou table)
let currentManagementView = 'cards';

/**
 * Calcule le 1RM avec la formule d'Epley
 */
function calculateMax(rep, charge) {
    if (!rep || !charge || rep === 0 || charge === 0) return '-';
    const max = Math.round(charge * (1 + rep / 30));
    return max;
}

/**
 * Bascule entre la vue cartes et la vue tableau
 */
function switchManagementView(viewType) {
    currentManagementView = viewType;
    
    const cardsView = document.getElementById('playersManagementList');
    const tableView = document.getElementById('playersTableView');
    const cardsBtn = document.getElementById('viewCardsBtn');
    const tableBtn = document.getElementById('viewTableBtn');
    
    if (viewType === 'cards') {
        // Afficher les cartes
        cardsView.style.display = 'block';
        tableView.style.display = 'none';
        cardsBtn.classList.add('active');
        tableBtn.classList.remove('active');
        cardsBtn.style.background = 'white';
        cardsBtn.style.color = 'var(--color-text)';
        tableBtn.style.background = 'transparent';
        tableBtn.style.color = 'var(--color-text-secondary)';
    } else {
        // Afficher le tableau
        cardsView.style.display = 'none';
        tableView.style.display = 'block';
        tableBtn.classList.add('active');
        cardsBtn.classList.remove('active');
        tableBtn.style.background = 'white';
        tableBtn.style.color = 'var(--color-text)';
        cardsBtn.style.background = 'transparent';
        cardsBtn.style.color = 'var(--color-text-secondary)';
        
        // Charger le tableau si pas déjà fait
        loadPlayersTable();
    }
}

/**
 * Charge et affiche le tableau Excel des joueuses
 */
async function loadPlayersTable() {
    const tbody = document.getElementById('playersTableBody');
    if (!tbody) return;

    try {
        // Afficher un message de chargement
        tbody.innerHTML = `
            <tr>
                <td colspan="57" style="padding: 40px; text-align: center; color: var(--color-text-secondary);">
                    <p style="font-size: var(--font-size-lg);">🔄 Chargement des données...</p>
                </td>
            </tr>
        `;
        
        const playersSnapshot = await db.collection('players').orderBy('name').get();
        
        if (playersSnapshot.empty) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="57" style="padding: 40px; text-align: center; color: var(--color-text-secondary);">
                        <p style="font-size: var(--font-size-lg); margin-bottom: var(--space-8);">👥 Aucune joueuse trouvée</p>
                        <p style="margin-bottom: var(--space-16);">Commencez par ajouter des joueuses à l'équipe.</p>
                        <button onclick="openAddPlayerModal()" style="padding: 12px 24px; background: var(--color-primary); color: white; border: none; border-radius: var(--radius-base); cursor: pointer; font-size: var(--font-size-base);">
                            + Ajouter une joueuse
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        // Helper function pour créer une cellule éditable
        const makeCell = (field, value, playerId, type = 'text') => {
            return `<div class="editable-cell" data-field="${field}" data-player-id="${playerId}" data-type="${type}" onclick="makeEditable(this)">${value || '-'}</div>`;
        };

        let html = '';
        
        playersSnapshot.forEach(doc => {
            const player = doc.data();
            const playerId = doc.id;
            
            html += `<tr data-player-id="${playerId}">
                <!-- INFOS PERSONNELLES -->
                <td style="font-weight: 600; position: sticky; left: 0; background: white; z-index: 9; border: 1px solid #333;">${player.name || playerId}</td>
                <td style="border: 1px solid #333;">${makeCell('seniority', player.seniority, playerId, 'number')}</td>
                <td style="border: 1px solid #333;">${makeCell('muscuPriority', player.muscuPriority, playerId)}</td>
                <td style="border: 1px solid #333;">${makeCell('birthday', player.birthday, playerId)}</td>
                <td style="border: 1px solid #333;"><div class="editable-cell" data-field="handedness" data-player-id="${playerId}" onclick="makeEditableHandedness(this)">${player.handedness || '-'}</div></td>
                <td style="border: 1px solid #333;"><div class="editable-cell" data-field="position" data-player-id="${playerId}" onclick="makeEditableSelect(this)">${player.position || '-'}</div></td>
                
                <!-- ANTHROPO -->
                <td style="border: 1px solid #333; background: #dbeafe;">${makeCell('height', player.height, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #dbeafe;">${makeCell('weight', player.weight, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #dbeafe;">${makeCell('legLength', player.legLength, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #dbeafe;">${makeCell('sittingHeight', player.sittingHeight, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #dbeafe;">${makeCell('wingspan', player.wingspan, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #dbeafe;">${makeCell('bodyFat', player.bodyFat, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #dbeafe;">${makeCell('height1B', player.height1B, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #dbeafe;">${makeCell('height2B', player.height2B, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #dbeafe;">${makeCell('gripLeft', player.gripLeft, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #dbeafe;">${makeCell('gripRight', player.gripRight, playerId, 'number')}</td>
                
                <!-- TEST VOLLEY -->
                <td style="border: 1px solid #333; background: #fef3c7;">${makeCell('jumpWithRun', player.jumpWithRun, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fef3c7;">${makeCell('jumpStanding', player.jumpStanding, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fef3c7;">${makeCell('broadJump', player.broadJump, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fef3c7;">${makeCell('mbCAV', player.mbCAV, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fef3c7;">${makeCell('mbLeftFront', player.mbLeftFront, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fef3c7;">${makeCell('mbChest', player.mbChest, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fef3c7;">${makeCell('mbRightFront', player.mbRightFront, playerId, 'number')}</td>
                
                <!-- TEST MUSCU -->
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('speedChrono', player.speedChrono, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('chrono5m', player.chrono5m, playerId, 'number')}</td>
                
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('dcRep', player.dcRep, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('dcCharge', player.dcCharge, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2; color: #059669; font-weight: 600;">${calculateMax(player.dcRep, player.dcCharge)}</td>
                
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('tractionRep', player.tractionRep, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('tractionCharge', player.tractionCharge, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2; color: #059669; font-weight: 600;">${calculateMax(player.tractionRep, player.tractionCharge)}</td>
                
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('tirageRep', player.tirageRep, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('tirageCharge', player.tirageCharge, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2; color: #059669; font-weight: 600;">${calculateMax(player.tirageRep, player.tirageCharge)}</td>
                
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('pullOverRep', player.pullOverRep, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('pullOverCharge', player.pullOverCharge, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2; color: #059669; font-weight: 600;">${calculateMax(player.pullOverRep, player.pullOverCharge)}</td>
                
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('hipThrustRep', player.hipThrustRep, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('hipThrustCharge', player.hipThrustCharge, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2; color: #059669; font-weight: 600;">${calculateMax(player.hipThrustRep, player.hipThrustCharge)}</td>
                
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('sdtRep', player.sdtRep, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('sdtCharge', player.sdtCharge, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2; color: #059669; font-weight: 600;">${calculateMax(player.sdtRep, player.sdtCharge)}</td>
                
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('backSquatRep', player.backSquatRep, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('backSquatCharge', player.backSquatCharge, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2; color: #059669; font-weight: 600;">${calculateMax(player.backSquatRep, player.backSquatCharge)}</td>
                
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('epauleRep', player.epauleRep, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2;">${makeCell('epauleCharge', player.epauleCharge, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #fee2e2; color: #059669; font-weight: 600;">${calculateMax(player.epauleRep, player.epauleCharge)}</td>
                
                <!-- TEST PHYSIO -->
                <td style="border: 1px solid #333; background: #dcfce7;">${makeCell('vmaTime', player.vmaTime, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #dcfce7;">${makeCell('vmaPalier', player.vmaPalier, playerId, 'number')}</td>
                <td style="border: 1px solid #333; background: #dcfce7;">${makeCell('vmaDate', player.vmaDate, playerId, 'date')}</td>
                
                <!-- ACTIONS -->
                <td style="border: 1px solid #333; text-align: center; position: sticky; right: 0; background: white; z-index: 9;">
                    <button onclick="showPlayerDetail('${playerId}')" style="padding: 3px 8px; background: #f3f4f6; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; font-size: 10px;">👁️</button>
                </td>
            </tr>`;
        });
        
        tbody.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur chargement tableau:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="57" style="padding: 40px; text-align: center;">
                    <p style="font-size: var(--font-size-lg); color: #ef4444; margin-bottom: var(--space-12);">❌ Erreur de connexion</p>
                    <p style="color: var(--color-text-secondary); margin-bottom: var(--space-8);">${error.message}</p>
                    <p style="color: var(--color-text-secondary); margin-bottom: var(--space-16); font-size: var(--font-size-sm);">
                        💡 Assurez-vous d'être connecté à Internet et que Firebase est configuré correctement.
                    </p>
                    <button onclick="loadPlayersTable()" style="padding: 12px 24px; background: var(--color-primary); color: white; border: none; border-radius: var(--radius-base); cursor: pointer; font-size: var(--font-size-base);">
                        🔄 Réessayer
                    </button>
                </td>
            </tr>
        `;
    }
}

/**
 * Rend une cellule éditable (input texte/nombre)
 */
function makeEditable(cell) {
    if (cell.classList.contains('editing')) return;
    
    const currentValue = cell.textContent.trim() === '-' ? '' : cell.textContent.trim();
    const field = cell.dataset.field;
    const playerId = cell.dataset.playerId;
    const dataType = cell.dataset.type || 'text';
    
    cell.classList.add('editing');
    
    const input = document.createElement('input');
    input.type = dataType === 'date' ? 'date' : (dataType === 'number' ? 'number' : 'text');
    input.value = currentValue;
    input.style.width = '100%';
    
    if (dataType === 'number') {
        input.step = field === 'sprint10m' ? '0.01' : '1';
    }
    
    cell.innerHTML = '';
    cell.appendChild(input);
    input.focus();
    input.select();
    
    // Sauvegarder au blur
    input.onblur = async function() {
        await saveCellValue(cell, input.value, field, playerId);
    };
    
    // Sauvegarder à l'appui sur Entrée
    input.onkeydown = function(e) {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            cell.classList.remove('editing');
            cell.textContent = currentValue || '-';
        }
    };
}

/**
 * Rend une cellule éditable avec select (Poste)
 */
function makeEditableSelect(cell) {
    if (cell.classList.contains('editing')) return;
    
    const currentValue = cell.textContent.trim() === '-' ? '' : cell.textContent.trim();
    const field = cell.dataset.field;
    const playerId = cell.dataset.playerId;
    
    cell.classList.add('editing');
    
    const select = document.createElement('select');
    select.style.width = '100%';
    select.innerHTML = `
        <option value="">-- Sélectionner --</option>
        <option value="Libéro">Libéro</option>
        <option value="Centrale">Centrale</option>
        <option value="Passeuse">Passeuse</option>
        <option value="Pointue">Pointue</option>
        <option value="Réceptionneuse-Attaquante">Réceptionneuse-Attaquante</option>
        <option value="Universelle">Universelle</option>
    `;
    select.value = currentValue;
    
    cell.innerHTML = '';
    cell.appendChild(select);
    select.focus();
    
    // Sauvegarder au changement
    select.onchange = async function() {
        await saveCellValue(cell, select.value, field, playerId);
    };
    
    // Annuler à l'appui sur Escape
    select.onkeydown = function(e) {
        if (e.key === 'Escape') {
            cell.classList.remove('editing');
            cell.textContent = currentValue || '-';
        }
    };
}

/**
 * Rend une cellule éditable avec select (Latéralité)
 */
function makeEditableHandedness(cell) {
    if (cell.classList.contains('editing')) return;
    
    const currentValue = cell.textContent.trim() === '-' ? '' : cell.textContent.trim();
    const field = cell.dataset.field;
    const playerId = cell.dataset.playerId;
    
    cell.classList.add('editing');
    
    const select = document.createElement('select');
    select.style.width = '100%';
    select.innerHTML = `
        <option value="">-- Sélectionner --</option>
        <option value="Droitier">Droitier</option>
        <option value="Gaucher">Gaucher</option>
        <option value="Ambidextre">Ambidextre</option>
    `;
    select.value = currentValue;
    
    cell.innerHTML = '';
    cell.appendChild(select);
    select.focus();
    
    // Sauvegarder au changement
    select.onchange = async function() {
        await saveCellValue(cell, select.value, field, playerId);
    };
    
    // Annuler à l'appui sur Escape
    select.onkeydown = function(e) {
        if (e.key === 'Escape') {
            cell.classList.remove('editing');
            cell.textContent = currentValue || '-';
        }
    };
}

/**
 * Sauvegarde la valeur d'une cellule dans Firestore
 */
async function saveCellValue(cell, value, field, playerId) {
    const displayValue = value || '-';
    
    // Indicateur de sauvegarde
    cell.innerHTML = `${displayValue} <span class="save-indicator saving"></span>`;
    cell.classList.remove('editing');
    
    try {
        // Préparer la valeur selon le type
        let saveValue = value;
        if (value) {
            const dataType = cell.dataset.type;
            if (dataType === 'number') {
                saveValue = parseFloat(value);
            }
        }
        
        // Mettre à jour dans Firestore
        const updateData = {
            [field]: saveValue || null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await db.collection('players').doc(playerId).update(updateData);
        
        // Indicateur de succès
        cell.innerHTML = `${displayValue} <span class="save-indicator saved"></span>`;
        
        // Si on a modifié un REP ou CHARGE, recalculer et recharger la ligne pour mettre à jour l'extrapolation
        if (field.endsWith('Rep') || field.endsWith('Charge')) {
            setTimeout(() => {
                loadPlayersTable(); // Recharger pour mettre à jour les calculs
            }, 1000);
        } else {
            // Retirer l'indicateur après 2 secondes pour les autres champs
            setTimeout(() => {
                cell.textContent = displayValue;
            }, 2000);
        }
        
        console.log(`✅ ${field} sauvegardé pour ${playerId}: ${saveValue}`);
        
    } catch (error) {
        console.error('Erreur sauvegarde:', error);
        cell.innerHTML = displayValue;
        alert('Erreur lors de la sauvegarde : ' + error.message);
    }
}

/**
 * Charge et affiche la liste des joueuses dans l'onglet Gestion
 */
async function loadPlayersManagementList() {
    const container = document.getElementById('playersManagementList');
    if (!container) return;

    try {
        // Afficher un message de chargement
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
                <p style="font-size: var(--font-size-lg);">🔄 Chargement des joueuses...</p>
            </div>
        `;
        
        const playersSnapshot = await db.collection('players').orderBy('name').get();
        
        if (playersSnapshot.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--color-text-secondary);">
                    <p style="font-size: var(--font-size-lg);">👥 Aucune joueuse trouvée</p>
                    <p style="margin-top: var(--space-8);">Commencez par ajouter des joueuses à l'équipe.</p>
                    <button onclick="openAddPlayerModal()" style="margin-top: var(--space-16); padding: 12px 24px; background: var(--color-primary); color: white; border: none; border-radius: var(--radius-base); cursor: pointer; font-size: var(--font-size-base);">
                        + Ajouter une joueuse
                    </button>
                </div>
            `;
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: var(--space-12);">';
        
        playersSnapshot.forEach(doc => {
            const player = doc.data();
            const playerId = doc.id;
            
            // Formater la date de naissance
            let birthDisplay = player.birthday || 'Non renseignée';
            if (player.birthday && player.birthday.includes('/')) {
                const parts = player.birthday.split('/');
                if (parts.length === 3) {
                    const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                    birthDisplay = `${parts[0]}/${parts[1]}/${year}`;
                }
            }
            
            // Informations physiques
            const height = player.height ? `${player.height} cm` : '-';
            const weight = player.weight ? `${player.weight} kg` : '-';
            const position = player.position || '-';
            
            // Initiales pour avatar
            const initials = player.name ? player.name.split(' ').map(n => n[0]).join('').substring(0, 2) : '??';
            
            html += `
                <div class="player-management-card" data-player-name="${player.name ? player.name.toLowerCase() : ''}" style="background: white; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-16); display: flex; align-items: center; gap: var(--space-16); transition: all var(--duration-fast) var(--ease-standard);">
                    <!-- Avatar -->
                    <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; font-weight: bold; flex-shrink: 0; overflow: hidden;">
                        ${player.photoURL ? 
                            `<img src="${player.photoURL}" style="width: 100%; height: 100%; object-fit: cover;" alt="${player.name}">` : 
                            `<span>${initials}</span>`
                        }
                    </div>
                    
                    <!-- Informations -->
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-size: var(--font-size-lg); font-weight: var(--font-weight-semibold); color: var(--color-text); margin-bottom: var(--space-4);">${player.name || playerId}</div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-8); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                            <div>🎂 ${birthDisplay}</div>
                            <div>📏 ${height}</div>
                            <div>⚖️ ${weight}</div>
                            <div>🏐 ${position}</div>
                        </div>
                    </div>
                    
                    <!-- Actions -->
                    <div style="display: flex; gap: var(--space-8); flex-shrink: 0;">
                        <button onclick="openEditPlayerModal('${playerId}')" class="btn" style="padding: 8px 16px; background: var(--color-primary); color: white; border: none; border-radius: var(--radius-base); cursor: pointer; font-size: var(--font-size-sm); display: flex; align-items: center; gap: 6px; transition: all var(--duration-fast) var(--ease-standard);">
                            <span>✏️</span>
                            <span>Modifier</span>
                        </button>
                        <button onclick="showPlayerDetail('${playerId}')" class="btn" style="padding: 8px 16px; background: #f3f4f6; color: var(--color-text); border: 1px solid var(--color-border); border-radius: var(--radius-base); cursor: pointer; font-size: var(--font-size-sm); transition: all var(--duration-fast) var(--ease-standard);">
                            👁️ Voir
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Erreur chargement liste joueuses:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <p style="font-size: var(--font-size-lg); color: #ef4444; margin-bottom: var(--space-12);">❌ Erreur de connexion</p>
                <p style="color: var(--color-text-secondary); margin-bottom: var(--space-8);">${error.message}</p>
                <p style="color: var(--color-text-secondary); margin-bottom: var(--space-16); font-size: var(--font-size-sm);">
                    💡 Assurez-vous d'être connecté à Internet et que Firebase est configuré correctement.
                </p>
                <button onclick="loadPlayersList()" style="padding: 12px 24px; background: var(--color-primary); color: white; border: none; border-radius: var(--radius-base); cursor: pointer; font-size: var(--font-size-base);">
                    🔄 Réessayer
                </button>
            </div>
        `;
    }
}

/**
 * Filtre les joueuses selon la recherche
 */
function filterPlayersManagement() {
    const searchInput = document.getElementById('searchPlayerInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    const playerCards = document.querySelectorAll('.player-management-card');
    
    playerCards.forEach(card => {
        const playerName = card.dataset.playerName || '';
        if (playerName.includes(searchTerm)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * Ouvre le modal d'édition d'une joueuse
 */
async function openEditPlayerModal(playerId) {
    const modal = document.getElementById('editPlayerModal');
    if (!modal) return;
    
    try {
        // Récupérer les données actuelles
        const playerDoc = await db.collection('players').doc(playerId).get();
        if (!playerDoc.exists) {
            alert('Joueuse non trouvée');
            return;
        }
        
        const player = playerDoc.data();
        
        // Convertir la date de JJ/MM/AA vers YYYY-MM-DD pour l'input type="date"
        let birthdayISO = '';
        if (player.birthday) {
            const [day, month, year] = player.birthday.split('/');
            if (day && month && year) {
                const fullYear = year.length === 2 ? '20' + year : year;
                birthdayISO = `${fullYear}-${month}-${day}`;
            }
        }
        
        // Remplir le formulaire - Infos de base
        document.getElementById('editPlayerId').value = playerId;
        document.getElementById('editPlayerName').value = player.name || '';
        document.getElementById('editPlayerBirthday').value = birthdayISO;
        document.getElementById('editPlayerClub').value = player.club || '';
        document.getElementById('editPlayerSeniority').value = player.seniority || '';
        document.getElementById('editPlayerMuscuPriority').value = player.muscuPriority || '';
        
        // Anthropo + Poste/Latéralité
        document.getElementById('editPlayerHeight').value = player.height || '';
        document.getElementById('editPlayerWeight').value = player.weight || '';
        document.getElementById('editPlayerLegLength').value = player.legLength || '';
        document.getElementById('editPlayerSittingHeight').value = player.sittingHeight || '';
        document.getElementById('editPlayerWingspan').value = player.wingspan || '';
        document.getElementById('editPlayerBodyFat').value = player.bodyFat || '';
        document.getElementById('editPlayerHeight1B').value = player.height1B || '';
        document.getElementById('editPlayerHeight2B').value = player.height2B || '';
        document.getElementById('editPlayerGripLeft').value = player.gripLeft || '';
        document.getElementById('editPlayerGripRight').value = player.gripRight || '';
        document.getElementById('editPlayerPosition').value = player.position || '';
        document.getElementById('editPlayerHandedness').value = player.handedness || '';
        
        // Test Volley
        document.getElementById('editPlayerJumpWithRun').value = player.jumpWithRun || '';
        document.getElementById('editPlayerJumpStanding').value = player.jumpStanding || '';
        document.getElementById('editPlayerBroadJump').value = player.broadJump || '';
        document.getElementById('editPlayerMbCAV').value = player.mbCAV || '';
        document.getElementById('editPlayerMbLeftFront').value = player.mbLeftFront || '';
        document.getElementById('editPlayerMbChest').value = player.mbChest || '';
        document.getElementById('editPlayerMbRightFront').value = player.mbRightFront || '';
        
        // Test Muscu
        document.getElementById('editPlayerSpeedChrono').value = player.speedChrono || '';
        document.getElementById('editPlayerChrono5m').value = player.chrono5m || '';
        
        // DC
        document.getElementById('editPlayerDcRep').value = player.dcRep || '';
        document.getElementById('editPlayerDcCharge').value = player.dcCharge || '';
        updateModalMaxField('Dc', player.dcRep, player.dcCharge);
        
        // TRACTION
        document.getElementById('editPlayerTractionRep').value = player.tractionRep || '';
        document.getElementById('editPlayerTractionCharge').value = player.tractionCharge || '';
        updateModalMaxField('Traction', player.tractionRep, player.tractionCharge);
        
        // TIRAGE BANC
        document.getElementById('editPlayerTirageRep').value = player.tirageRep || '';
        document.getElementById('editPlayerTirageCharge').value = player.tirageCharge || '';
        updateModalMaxField('Tirage', player.tirageRep, player.tirageCharge);
        
        // PULL OVER
        document.getElementById('editPlayerPullOverRep').value = player.pullOverRep || '';
        document.getElementById('editPlayerPullOverCharge').value = player.pullOverCharge || '';
        updateModalMaxField('PullOver', player.pullOverRep, player.pullOverCharge);
        
        // HIP THRUST
        document.getElementById('editPlayerHipThrustRep').value = player.hipThrustRep || '';
        document.getElementById('editPlayerHipThrustCharge').value = player.hipThrustCharge || '';
        updateModalMaxField('HipThrust', player.hipThrustRep, player.hipThrustCharge);
        
        // SDT
        document.getElementById('editPlayerSdtRep').value = player.sdtRep || '';
        document.getElementById('editPlayerSdtCharge').value = player.sdtCharge || '';
        updateModalMaxField('Sdt', player.sdtRep, player.sdtCharge);
        
        // BACK SQUAT
        document.getElementById('editPlayerBackSquatRep').value = player.backSquatRep || '';
        document.getElementById('editPlayerBackSquatCharge').value = player.backSquatCharge || '';
        updateModalMaxField('BackSquat', player.backSquatRep, player.backSquatCharge);
        
        // ÉPAULE
        document.getElementById('editPlayerEpauleRep').value = player.epauleRep || '';
        document.getElementById('editPlayerEpauleCharge').value = player.epauleCharge || '';
        updateModalMaxField('Epaule', player.epauleRep, player.epauleCharge);
        
        // Test Physio
        document.getElementById('editPlayerVmaTime').value = player.vmaTime || '';
        document.getElementById('editPlayerVmaPalier').value = player.vmaPalier || '';
        document.getElementById('editPlayerVmaDate').value = player.vmaDate || '';
        
        // Listeners pour recalculer les MAX en temps réel dans le modal
        setupModalMaxListeners();
        
        // Afficher le modal
        modal.classList.add('active');
        
    } catch (error) {
        console.error('Erreur ouverture modal édition:', error);
        alert('Erreur lors de l\'ouverture du formulaire d\'édition');
    }
}

/**
 * Met à jour un champ MAX dans le modal
 */
function updateModalMaxField(exerciseName, rep, charge) {
    const maxField = document.getElementById(`editPlayer${exerciseName}Max`);
    if (!maxField) return;
    
    if (rep && charge && rep > 0 && charge > 0) {
        const max = calculateMax(parseFloat(rep), parseFloat(charge));
        maxField.value = `${max} kg`;
    } else {
        maxField.value = '';
    }
}

/**
 * Configure les listeners pour recalculer les MAX en temps réel dans le modal
 */
function setupModalMaxListeners() {
    const exercises = ['Dc', 'Traction', 'Tirage', 'PullOver', 'HipThrust', 'Sdt', 'BackSquat', 'Epaule'];
    
    exercises.forEach(ex => {
        const repField = document.getElementById(`editPlayer${ex}Rep`);
        const chargeField = document.getElementById(`editPlayer${ex}Charge`);
        
        if (repField && chargeField) {
            const updateMax = () => {
                const rep = repField.value;
                const charge = chargeField.value;
                updateModalMaxField(ex, rep, charge);
            };
            
            repField.removeEventListener('input', updateMax);
            chargeField.removeEventListener('input', updateMax);
            repField.addEventListener('input', updateMax);
            chargeField.addEventListener('input', updateMax);
        }
    });
}

/**
 * Ferme le modal d'édition
 */
function closeEditPlayerModal() {
    const modal = document.getElementById('editPlayerModal');
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('editPlayerForm').reset();
    }
}

/**
 * Sauvegarde les modifications du profil
 */
async function savePlayerEdit() {
    const playerId = document.getElementById('editPlayerId').value;
    const name = document.getElementById('editPlayerName').value.trim();
    const birthdayInput = document.getElementById('editPlayerBirthday').value.trim();
    
    // Validation
    if (!name || !birthdayInput) {
        alert('Le nom et la date de naissance sont obligatoires');
        return;
    }
    
    // Convertir la date vers le format JJ/MM/AA
    let birthday;
    if (birthdayInput.includes('-')) {
        // Format YYYY-MM-DD (du sélecteur de date)
        const [year, month, day] = birthdayInput.split('-');
        birthday = `${day}/${month}/${year.slice(2)}`;
    } else if (birthdayInput.includes('/')) {
        // Déjà au format JJ/MM/AA
        birthday = birthdayInput;
    } else {
        alert('Format de date invalide');
        return;
    }
    
    try {
        // Préparer les données à mettre à jour
        const updateData = {
            name: name,
            birthday: birthday,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        // Helper pour ajouter un champ optionnel
        const addField = (fieldName, inputId, parser = parseFloat) => {
            const value = document.getElementById(inputId)?.value.trim();
            if (value) updateData[fieldName] = parser(value);
        };
        
        // Infos de base
        addField('club', 'editPlayerClub', String);
        addField('seniority', 'editPlayerSeniority', String);
        addField('muscuPriority', 'editPlayerMuscuPriority', String);
        
        // Anthropo
        addField('height', 'editPlayerHeight');
        addField('weight', 'editPlayerWeight');
        addField('legLength', 'editPlayerLegLength');
        addField('sittingHeight', 'editPlayerSittingHeight');
        addField('wingspan', 'editPlayerWingspan');
        addField('bodyFat', 'editPlayerBodyFat');
        addField('height1B', 'editPlayerHeight1B');
        addField('height2B', 'editPlayerHeight2B');
        addField('gripLeft', 'editPlayerGripLeft');
        addField('gripRight', 'editPlayerGripRight');
        
        const position = document.getElementById('editPlayerPosition')?.value;
        if (position) updateData.position = position;
        
        const handedness = document.getElementById('editPlayerHandedness')?.value;
        if (handedness) updateData.handedness = handedness;
        
        // Test Volley
        addField('jumpWithRun', 'editPlayerJumpWithRun');
        addField('jumpStanding', 'editPlayerJumpStanding');
        addField('broadJump', 'editPlayerBroadJump');
        addField('mbCAV', 'editPlayerMbCAV');
        addField('mbLeftFront', 'editPlayerMbLeftFront');
        addField('mbChest', 'editPlayerMbChest');
        addField('mbRightFront', 'editPlayerMbRightFront');
        
        // Test Muscu
        addField('speedChrono', 'editPlayerSpeedChrono');
        addField('chrono5m', 'editPlayerChrono5m');
        
        // DC
        addField('dcRep', 'editPlayerDcRep');
        addField('dcCharge', 'editPlayerDcCharge');
        const dcRep = document.getElementById('editPlayerDcRep')?.value;
        const dcCharge = document.getElementById('editPlayerDcCharge')?.value;
        if (dcRep && dcCharge) updateData.dcMax = calculateMax(parseFloat(dcRep), parseFloat(dcCharge));
        
        // TRACTION
        addField('tractionRep', 'editPlayerTractionRep');
        addField('tractionCharge', 'editPlayerTractionCharge');
        const tractionRep = document.getElementById('editPlayerTractionRep')?.value;
        const tractionCharge = document.getElementById('editPlayerTractionCharge')?.value;
        if (tractionRep && tractionCharge) updateData.tractionMax = calculateMax(parseFloat(tractionRep), parseFloat(tractionCharge));
        
        // TIRAGE
        addField('tirageRep', 'editPlayerTirageRep');
        addField('tirageCharge', 'editPlayerTirageCharge');
        const tirageRep = document.getElementById('editPlayerTirageRep')?.value;
        const tirageCharge = document.getElementById('editPlayerTirageCharge')?.value;
        if (tirageRep && tirageCharge) updateData.tirageMax = calculateMax(parseFloat(tirageRep), parseFloat(tirageCharge));
        
        // PULL OVER
        addField('pullOverRep', 'editPlayerPullOverRep');
        addField('pullOverCharge', 'editPlayerPullOverCharge');
        const pullOverRep = document.getElementById('editPlayerPullOverRep')?.value;
        const pullOverCharge = document.getElementById('editPlayerPullOverCharge')?.value;
        if (pullOverRep && pullOverCharge) updateData.pullOverMax = calculateMax(parseFloat(pullOverRep), parseFloat(pullOverCharge));
        
        // HIP THRUST
        addField('hipThrustRep', 'editPlayerHipThrustRep');
        addField('hipThrustCharge', 'editPlayerHipThrustCharge');
        const hipThrustRep = document.getElementById('editPlayerHipThrustRep')?.value;
        const hipThrustCharge = document.getElementById('editPlayerHipThrustCharge')?.value;
        if (hipThrustRep && hipThrustCharge) updateData.hipThrustMax = calculateMax(parseFloat(hipThrustRep), parseFloat(hipThrustCharge));
        
        // SDT
        addField('sdtRep', 'editPlayerSdtRep');
        addField('sdtCharge', 'editPlayerSdtCharge');
        const sdtRep = document.getElementById('editPlayerSdtRep')?.value;
        const sdtCharge = document.getElementById('editPlayerSdtCharge')?.value;
        if (sdtRep && sdtCharge) updateData.sdtMax = calculateMax(parseFloat(sdtRep), parseFloat(sdtCharge));
        
        // BACK SQUAT
        addField('backSquatRep', 'editPlayerBackSquatRep');
        addField('backSquatCharge', 'editPlayerBackSquatCharge');
        const backSquatRep = document.getElementById('editPlayerBackSquatRep')?.value;
        const backSquatCharge = document.getElementById('editPlayerBackSquatCharge')?.value;
        if (backSquatRep && backSquatCharge) updateData.backSquatMax = calculateMax(parseFloat(backSquatRep), parseFloat(backSquatCharge));
        
        // ÉPAULE
        addField('epauleRep', 'editPlayerEpauleRep');
        addField('epauleCharge', 'editPlayerEpauleCharge');
        const epauleRep = document.getElementById('editPlayerEpauleRep')?.value;
        const epauleCharge = document.getElementById('editPlayerEpauleCharge')?.value;
        if (epauleRep && epauleCharge) updateData.epauleMax = calculateMax(parseFloat(epauleRep), parseFloat(epauleCharge));
        
        // Test Physio
        addField('vmaTime', 'editPlayerVmaTime');
        addField('vmaPalier', 'editPlayerVmaPalier');
        const vmaDate = document.getElementById('editPlayerVmaDate')?.value;
        if (vmaDate) updateData.vmaDate = vmaDate;
        
        // Mettre à jour dans Firestore
        await db.collection('players').doc(playerId).update(updateData);
        
        console.log(`✅ Profil de ${name} mis à jour avec succès`);
        
        // Fermer le modal
        closeEditPlayerModal();
        
        // Recharger la liste
        await loadPlayersTable();
        
        alert('✅ Profil mis à jour avec succès');
        
    } catch (error) {
        console.error('Erreur sauvegarde profil:', error);
        alert('❌ Erreur lors de la sauvegarde: ' + error.message);
    }
}

/**
 * Affiche un message de succès temporaire
 */
function showSuccessMessage(message) {
    // Créer l'élément de message
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10B981;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-weight: 500;
        animation: slideInRight 0.3s ease-out;
    `;
    messageDiv.textContent = message;
    
    // Ajouter au DOM
    document.body.appendChild(messageDiv);
    
    // Retirer après 3 secondes
    setTimeout(() => {
        messageDiv.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 300);
    }, 3000);
}

/**
 * Ouvre l'édition depuis le popup de détails
 */
function editPlayerFromPopup() {
    const playerId = window.currentPopupPlayerId;
    if (!playerId) {
        alert('Erreur: ID de joueuse non trouvé');
        return;
    }
    
    // Fermer le popup de détails
    closePlayerDetailModal();
    
    // Ouvrir le modal d'édition
    setTimeout(() => {
        openEditPlayerModal(playerId);
    }, 300);
}

/**
 * Gestion du changement d'onglet coach
 * (Extension de la fonction existante dans app.js)
 */
const originalSwitchCoachTab = window.switchCoachTab;
window.switchCoachTab = function(tabName) {
    // Appeler la fonction originale si elle existe
    if (originalSwitchCoachTab && tabName !== 'management') {
        originalSwitchCoachTab(tabName);
    }
    
    // Gérer l'onglet Gestion Équipe
    if (tabName === 'management') {
        // Cacher tous les onglets
        const allTabs = document.querySelectorAll('.coach-tab-content');
        allTabs.forEach(tab => {
            tab.style.display = 'none';
        });
        
        // Retirer la classe active de tous les boutons
        const allBtns = document.querySelectorAll('.tab-btn');
        allBtns.forEach(btn => {
            btn.classList.remove('active');
            btn.style.borderBottomColor = 'transparent';
            btn.style.color = 'var(--color-text-secondary)';
        });
        
        // Afficher l'onglet Management
        const managementTab = document.getElementById('managementTab');
        if (managementTab) {
            managementTab.style.display = 'block';
        }
        
        // Activer le bouton
        const managementBtn = document.querySelector('[data-tab="management"]');
        if (managementBtn) {
            managementBtn.classList.add('active');
            managementBtn.style.borderBottomColor = 'var(--color-primary)';
            managementBtn.style.color = 'var(--color-text)';
        }
        
        // Charger la liste des joueuses
        loadPlayersManagementList();
    }
};

/**
 * Ouvre le modal d'édition depuis le popup de détail
 */
function editPlayerFromPopup() {
    // Récupérer l'ID de la joueuse actuellement affichée dans le popup
    const playerId = window.currentPopupPlayerId;
    if (!playerId) {
        console.error('Aucune joueuse sélectionnée');
        return;
    }
    
    // Fermer le popup de détail
    if (typeof closePlayerDetailModal === 'function') {
        closePlayerDetailModal();
    }
    
    // Ouvrir le modal d'édition
    openEditPlayerModal(playerId);
}

// Exposer les fonctions globalement
window.openEditPlayerModal = openEditPlayerModal;
window.closeEditPlayerModal = closeEditPlayerModal;
window.savePlayerEdit = savePlayerEdit;
window.filterPlayersManagement = filterPlayersManagement;
window.loadPlayersManagementList = loadPlayersManagementList;
window.editPlayerFromPopup = editPlayerFromPopup;
window.switchManagementView = switchManagementView;
window.loadPlayersTable = loadPlayersTable;
window.makeEditable = makeEditable;
window.makeEditableSelect = makeEditableSelect;
window.makeEditableHandedness = makeEditableHandedness;

// Initialiser les event listeners pour les boutons de bascule de vue
document.addEventListener('DOMContentLoaded', () => {
    const viewCardsBtn = document.getElementById('viewCardsBtn');
    const viewTableBtn = document.getElementById('viewTableBtn');
    
    if (viewCardsBtn) {
        viewCardsBtn.addEventListener('click', () => switchManagementView('cards'));
    }
    
    if (viewTableBtn) {
        viewTableBtn.addEventListener('click', () => switchManagementView('table'));
    }
});

console.log('✅ player-management.js chargé');
