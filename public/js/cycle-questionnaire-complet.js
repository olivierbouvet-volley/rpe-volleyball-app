/**
 * Cycle Profile Questionnaire - VERSION CORRIGÉE
 * Questionnaire de début de saison : 12 questions
 * 
 * CORRECTIONS :
 * - Boutons avec event listeners (plus fiable que onclick)
 * - Z-index 99999 (visible)
 * - Validation et feedback visuel immédiat
 */

console.log('✅ Cycle Profile Questionnaire (CORRIGÉ) chargé');

const motivationalQuotes = [
    "Chaque effort compte. Continuez à pousser !",
    "La persévérance est la clé du succès.",
    "Croyez en vous, tout est possible !",
    "Vos efforts d'aujourd'hui sont vos résultats de demain.",
    "Ne regardez jamais en arrière, sauf pour voir le chemin parcouru.",
    "Le succès n'est pas final, l'échec n'est pas fatal : c'est le courage de continuer qui compte.",
    "La seule limite à notre épanouissement de demain sera nos doutes d'aujourd'hui.",
    "Transformez vos défis en opportunités.",
    "La force ne vient pas de la capacité physique, elle vient d'une volonté indomptable.",
    "Faites de chaque jour un chef-d'œuvre.",
    "Votre potentiel est infini.",
    "Petit à petit, l'oiseau fait son nid. Chaque petit pas compte."
];

function getRandomQuote() {
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    return motivationalQuotes[randomIndex];
}

window.openCycleQuestionnaireModal = function() {
    const modal = document.createElement('div');
    modal.id = 'cycleQuestionnaireModal';
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
        z-index: 99999;
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

    content.innerHTML = `
        <style>
            .cycle-question { margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #e5e7eb; }
            .cycle-question:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
            .cycle-question-title { font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 8px; }
            .cycle-question-subtitle { font-size: 13px; color: #6b7280; margin-bottom: 12px; font-style: italic; }
            .cycle-pills-container { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
            .cycle-pill { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #e5e7eb; background: white; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
            .cycle-pill:hover { transform: scale(1.1); border-color: #667eea; }
            .cycle-pill.selected { background: #667eea; color: white; border-color: #667eea; }
            .cycle-binary-buttons { display: flex; gap: 12px; }
            .cycle-binary-btn { flex: 1; padding: 12px; border: 2px solid #e5e7eb; border-radius: 8px; background: white; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; }
            .cycle-binary-btn:hover { border-color: #667eea; background: #f3f4f6; }
            .cycle-binary-btn.selected { background: #667eea; color: white; border-color: #667eea; }
            .cycle-select { width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; background: white; cursor: pointer; }
            .cycle-section { margin-bottom: 30px; }
            .cycle-section-title { font-size: 18px; font-weight: 700; color: #1f2937; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
            .cycle-section-number { background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
            .cycle-modal-header { font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 30px; text-align: center; }
            .cycle-modal-buttons { display: flex; gap: 12px; margin-top: 30px; }
            .cycle-save-btn { flex: 1; padding: 12px; background: #10b981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; }
            .cycle-save-btn:hover { background: #059669; }
            .cycle-cancel-btn { flex: 1; padding: 12px; background: #f3f4f6; color: #374151; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px; }
            .cycle-alert { background: #fef2f2; border: 2px solid #fecaca; border-radius: 8px; padding: 12px; margin-top: 10px; font-size: 13px; color: #991b1b; display: none; }
            .cycle-alert.show { display: block; }
            input[type="number"] { width: 100%; padding: 10px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 14px; }
        </style>

        <div class="cycle-modal-header">📋 Profil Cycle Menstruel</div>

        <!-- SECTION 1 : SANTÉ DU CYCLE NATUREL -->
        <div class="cycle-section">
            <div class="cycle-section-title">
                <span class="cycle-section-number">1</span>
                Santé du Cycle Naturel
            </div>

            <div class="cycle-question">
                <div class="cycle-question-title">Q1. Date de tes dernières règles (J1)</div>
                <input type="date" id="q1_cycleStartDate" required>
                <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Indique le premier jour de tes dernières règles</div>
            </div>

            <div class="cycle-question">
                <div class="cycle-question-title">Q2. Durée moyenne du cycle (jours)</div>
                <input type="number" id="q2_cycleDuration" min="21" max="40" placeholder="Ex: 28">
                <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Normal : 25-35 jours</div>
            </div>

            <div class="cycle-question">
                <div class="cycle-question-title">Q3. Votre cycle est-il régulier ?</div>
                <div class="cycle-binary-buttons">
                    <button type="button" class="cycle-binary-btn q3-btn" data-value="true">✓ Oui, régulier</button>
                    <button type="button" class="cycle-binary-btn q3-btn" data-value="false">✗ Non, irrégulier</button>
                </div>
                <input type="hidden" id="q3_isRegular">
            </div>

            <div class="cycle-question">
                <div class="cycle-question-title">Q4. Aménorrhée (absence de règles) ?</div>
                <div class="cycle-binary-buttons">
                    <button type="button" class="cycle-binary-btn q4-btn" data-value="true">✓ Oui</button>
                    <button type="button" class="cycle-binary-btn q4-btn" data-value="false">✗ Non</button>
                </div>
                <input type="hidden" id="q4_hasAmenorrhea">
                <div id="q4_redSAlert" class="cycle-alert">
                    ⚠️ <strong>ALERTE RED-S DÉTECTÉE</strong><br>
                    L'aménorrhée peut indiquer un déficit énergétique chronique (RED-S). Recommandation : Consultation médicale.
                </div>
            </div>

            <div class="cycle-question">
                <div class="cycle-question-title">Q5. Fractures de fatigue ?</div>
                <div class="cycle-binary-buttons">
                    <button type="button" class="cycle-binary-btn q5-btn" data-value="true">✓ Oui</button>
                    <button type="button" class="cycle-binary-btn q5-btn" data-value="false">✗ Non</button>
                </div>
                <input type="hidden" id="q5_stressFractures">
            </div>

            <div class="cycle-question">
                <div class="cycle-question-title">Q6. SPM sévère ?</div>
                <div class="cycle-binary-buttons">
                    <button type="button" class="cycle-binary-btn q6-btn" data-value="true">✓ Oui, sévère</button>
                    <button type="button" class="cycle-binary-btn q6-btn" data-value="false">✗ Non ou modéré</button>
                </div>
                <input type="hidden" id="q6_severeSPM">
            </div>
        </div>

        <!-- SECTION 2 : CONTRACEPTION HORMONALE -->
        <div class="cycle-section">
            <div class="cycle-section-title">
                <span class="cycle-section-number">2</span>
                Contraception Hormonale
            </div>

            <div class="cycle-question">
                <div class="cycle-question-title">Q7. Contraception hormonale ?</div>
                <div class="cycle-binary-buttons">
                    <button type="button" class="cycle-binary-btn q7-btn" data-value="true">✓ Oui</button>
                    <button type="button" class="cycle-binary-btn q7-btn" data-value="false">✗ Non</button>
                </div>
                <input type="hidden" id="q7_usesContraception">
            </div>

            <div class="cycle-question" id="q8_container" style="display: none;">
                <div class="cycle-question-title">Q8. Type de contraception</div>
                <select id="q8_contraceptionType" class="cycle-select">
                    <option value="">-- Sélectionner --</option>
                    <option value="pilule_monophasique">Pilule monophasique</option>
                    <option value="pilule_biphasique">Pilule biphasique</option>
                    <option value="pilule_triphasique">Pilule triphasique</option>
                    <option value="pilule_continue">Pilule continue</option>
                    <option value="implant">Implant</option>
                    <option value="sterilet_hormonal">Stérilet hormonal</option>
                    <option value="anneau">Anneau vaginal</option>
                    <option value="patch">Patch</option>
                    <option value="injection">Injection</option>
                    <option value="autre">Autre</option>
                </select>
            </div>

            <div class="cycle-question" id="q9_container" style="display: none;">
                <div class="cycle-question-title">Q9. Impact sur bien-être (0-10)</div>
                <div class="cycle-pills-container" id="q9_pills">
                </div>
                <input type="hidden" id="q9_impactWellbeing">
            </div>

            <div class="cycle-question" id="q10_container" style="display: none;">
                <div class="cycle-question-title">Q10. Impact sur libido ?</div>
                <div class="cycle-binary-buttons">
                    <button type="button" class="cycle-binary-btn q10-btn" data-value="true">✓ Oui</button>
                    <button type="button" class="cycle-binary-btn q10-btn" data-value="false">✗ Non</button>
                </div>
                <input type="hidden" id="q10_libidoImpact">
            </div>
        </div>

        <!-- SECTION 3 : SYMPTÔMES & HISTORIQUE -->
        <div class="cycle-section">
            <div class="cycle-section-title">
                <span class="cycle-section-number">3</span>
                Symptômes & Historique
            </div>

            <div class="cycle-question">
                <div class="cycle-question-title">Q11. Règles abondantes ?</div>
                <div class="cycle-binary-buttons">
                    <button type="button" class="cycle-binary-btn q11-btn" data-value="true">✓ Oui</button>
                    <button type="button" class="cycle-binary-btn q11-btn" data-value="false">✗ Non</button>
                </div>
                <input type="hidden" id="q11_abundantPeriods">
                <div id="q11_alert" class="cycle-alert">⚠️ Risque de carence en fer.</div>
            </div>

            <div class="cycle-question">
                <div class="cycle-question-title">Q12. Durée des règles (jours)</div>
                <input type="number" id="q12_periodDuration" min="2" max="10" placeholder="Ex: 5">
                <div style="font-size: 12px; color: #6b7280; margin-top: 8px;">Normal : 3-7 jours</div>
            </div>

            <div class="cycle-question">
                <div class="cycle-question-title">Q13. Âge des premières règles</div>
                <input type="number" id="q13_menarche" min="8" max="18" placeholder="Ex: 13">
            </div>
        </div>

        <!-- BOUTONS -->
        <div class="cycle-modal-buttons">
            <button type="button" class="cycle-cancel-btn" id="cancelCycleBtn">✕ Fermer</button>
            <button type="button" class="cycle-save-btn" id="saveCycleBtn">✓ Enregistrer</button>
        </div>
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    // Créer les pills Q9
    const q9PillsContainer = document.getElementById('q9_pills');
    for (let i = 0; i <= 10; i++) {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'cycle-pill q9-pill';
        pill.textContent = i;
        pill.dataset.value = i;
        q9PillsContainer.appendChild(pill);
    }

    // Event listeners pour Q3 (cycle régulier)
    document.querySelectorAll('.q3-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const value = btn.dataset.value === 'true';
            document.querySelectorAll('.q3-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('q3_isRegular').value = value;
            console.log('✅ Q3 sélectionné:', value);
        });
    });

    // Event listeners pour Q4 (aménorrhée)
    document.querySelectorAll('.q4-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const value = btn.dataset.value === 'true';
            document.querySelectorAll('.q4-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('q4_hasAmenorrhea').value = value;
            document.getElementById('q4_redSAlert').classList.toggle('show', value);
            console.log('✅ Q4 sélectionné:', value);
        });
    });

    // Event listeners pour Q5 (fractures)
    document.querySelectorAll('.q5-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const value = btn.dataset.value === 'true';
            document.querySelectorAll('.q5-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('q5_stressFractures').value = value;
            console.log('✅ Q5 sélectionné:', value);
        });
    });

    // Event listeners pour Q6 (SPM)
    document.querySelectorAll('.q6-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const value = btn.dataset.value === 'true';
            document.querySelectorAll('.q6-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('q6_severeSPM').value = value;
            console.log('✅ Q6 sélectionné:', value);
        });
    });

    // Event listeners pour Q7 (contraception)
    document.querySelectorAll('.q7-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const value = btn.dataset.value === 'true';
            document.querySelectorAll('.q7-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('q7_usesContraception').value = value;
            document.getElementById('q8_container').style.display = value ? 'block' : 'none';
            document.getElementById('q9_container').style.display = value ? 'block' : 'none';
            console.log('✅ Q7 sélectionné:', value);
        });
    });

    // Event listeners pour Q9 (impact bien-être)
    document.querySelectorAll('.q9-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.q9-pill').forEach(p => p.classList.remove('selected'));
            pill.classList.add('selected');
            document.getElementById('q9_impactWellbeing').value = pill.dataset.value;
            console.log('✅ Q9 sélectionné:', pill.dataset.value);
        });
    });

    // Event listeners pour Q10 (impact libido)
    document.querySelectorAll('.q10-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const value = btn.dataset.value === 'true';
            document.querySelectorAll('.q10-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('q10_libidoImpact').value = value;
            console.log('✅ Q10 sélectionné:', value);
        });
    });

    // Event listeners pour Q11 (règles abondantes)
    document.querySelectorAll('.q11-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const value = btn.dataset.value === 'true';
            document.querySelectorAll('.q11-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('q11_abundantPeriods').value = value;
            document.getElementById('q11_alert').classList.toggle('show', value);
            console.log('✅ Q11 sélectionné:', value);
        });
    });

    // Bouton Enregistrer
    const saveCycleBtn = document.getElementById('saveCycleBtn');
    if (saveCycleBtn) {
        saveCycleBtn.addEventListener('click', saveCycleQuestionnaire);
        console.log('✅ Event listener attaché à saveCycleBtn');
    } else {
        console.error('❌ saveCycleBtn non trouvé!');
    }

    // Bouton Annuler
    document.getElementById('cancelCycleBtn').addEventListener('click', () => {
        closeCycleQuestionnaireModal();
    });

    // Fermer au clic extérieur
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeCycleQuestionnaireModal();
    });
};

// ============================================================================
// SAUVEGARDE
// ============================================================================

async function saveCycleQuestionnaire() {
    console.log('🔄 saveCycleQuestionnaire appelé');
    
    // Récupérer le playerId depuis window.currentPlayer
    const playerId = window.currentPlayer?.id;
    
    console.log('🔄 playerId:', playerId, 'currentPlayer:', window.currentPlayer);
    
    if (!playerId) {
        alert('❌ Erreur : Utilisateur non connecté');
        console.error('currentPlayer not found:', window.currentPlayer);
        return;
    }

    // Récupérer la date de début du cycle
    const cycleStartDate = document.getElementById('q1_cycleStartDate').value;
    const cycleDuration = parseInt(document.getElementById('q2_cycleDuration').value) || 28;

    if (!cycleStartDate) {
        alert('⚠️ Veuillez indiquer la date de début de tes dernières règles');
        return;
    }

    const cycleData = {
        playerId: playerId,
        cycleStartDate: cycleStartDate,
        cycleDuration: cycleDuration,
        isRegular: document.getElementById('q3_isRegular').value === 'true',
        hasAmenorrhea: document.getElementById('q4_hasAmenorrhea').value === 'true',
        stressFractures: document.getElementById('q5_stressFractures').value === 'true',
        severeSPM: document.getElementById('q6_severeSPM').value === 'true',
        usesContraception: document.getElementById('q7_usesContraception').value === 'true',
        contraceptionType: document.getElementById('q8_contraceptionType').value || null,
        impactWellbeing: parseInt(document.getElementById('q9_impactWellbeing').value) || null,
        libidoImpact: document.getElementById('q10_libidoImpact').value === 'true',
        abundantPeriods: document.getElementById('q11_abundantPeriods').value === 'true',
        periodDuration: parseInt(document.getElementById('q12_periodDuration').value) || null,
        menarche: parseInt(document.getElementById('q13_menarche').value) || null,
        savedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        // Sauvegarder dans cycleProfiles (profil détaillé)
        await db.collection('cycleProfiles').doc(playerId).set(cycleData);
        console.log('✅ Données sauvegardées dans cycleProfiles pour:', playerId);
        const quote = getRandomQuote();
        alert(`✅ Enregistrement réussi !\n\n✨ ${quote}`);

        closeCycleQuestionnaireModal();
    } catch (error) {
        console.error('❌ Erreur sauvegarde:', error);
        alert('❌ Erreur : ' + error.message);
    }
}

window.closeCycleQuestionnaireModal = function() {
    const modal = document.getElementById('cycleQuestionnaireModal');
    if (modal) {
        modal.remove();
        console.log('✅ Modal fermé et supprimé');
    } else {
        console.warn('❌ Modal non trouvé');
    }
};

// Observer les changements de playerId
const playerIdObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-player-id') {
            const newPlayerId = mutation.target.getAttribute('data-player-id');
            console.log('🔄 playerId changé:', newPlayerId);
            
            // Ici, vous pouvez recharger les données du cycle si nécessaire
            // loadCycleData(newPlayerId);
        }
    });
});

// Démarrer l'observation sur l'élément body
playerIdObserver.observe(document.body, {
    attributes: true,
    childList: false,
    subtree: false
});
