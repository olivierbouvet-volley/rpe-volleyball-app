/**
 * medical-module.js
 * Gestion onglet Médical : sous-onglets, calendrier médecin, calendrier kiné, RDV, notifications
 */

// ─── Chargement des settings médicaux depuis Firestore ───────────────────────

async function initMedicalSettings() {
    try {
        const doc = await db.collection('teamSettings').doc('pole').get();
        if (doc.exists) {
            window.medicalSettings = doc.data();
        } else {
            window.medicalSettings = {};
        }
    } catch(e) {
        console.warn('initMedicalSettings:', e);
        window.medicalSettings = {};
    }
}
window.initMedicalSettings = initMedicalSettings;

// ─── Sous-onglets Médical ────────────────────────────────────────────────────

function switchMedTab(tabName) {
    document.querySelectorAll('.med-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.med-tab-btn').forEach(btn => {
        const active = btn.dataset.medtab === tabName;
        btn.style.borderBottom = active ? '3px solid var(--color-primary)' : '3px solid transparent';
        btn.style.color = active ? 'var(--color-primary)' : 'var(--color-text-secondary)';
        btn.classList.toggle('active', active);
    });
    const el = document.getElementById(`medTab_${tabName}`);
    if (el) el.style.display = 'block';

    // Initialiser selon l'onglet
    if (tabName === 'kine') {
        loadTodayKineRequests();
        kineCalInit(window.medicalSettings?.kineDates || []);
    } else if (tabName === 'medecin') {
        docCalInit(window.medicalSettings?.doctorDates || []);
        loadUpcomingDoctorRdv();
        checkDoctorVisitAlert();
    } else if (tabName === 'contacts') {
        prefillContactsForm();
    }
}
window.switchMedTab = switchMedTab;

// ─── Pré-remplir le formulaire contacts ─────────────────────────────────────

function prefillContactsForm() {
    const s = window.medicalSettings || {};
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('kineNameInput',         s.kineName);
    set('kinePhoneInput',        s.kinePhone);
    set('doctorNameInput',       s.doctorName);
    set('doctorPhoneInput',      s.doctorPhone);
    set('medicalGroupNameInput', s.medicalGroupName);
    set('medicalGroupPhoneInput',s.medicalGroupPhone);
    displayMedicalContactsStatus();
}
window.prefillContactsForm = prefillContactsForm;

// ─── Sauvegarder les dates kiné + rafraîchir la liste ───────────────────────

async function saveKineDates() {
    const kineDates = Array.from(_kineDates).sort();
    try {
        await db.collection('teamSettings').doc('pole').set({ kineDates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        if (!window.medicalSettings) window.medicalSettings = {};
        window.medicalSettings.kineDates = kineDates;
        showNotification('Dates kiné enregistrées', 'success');
        renderUpcomingKineVisits();
    } catch(e) {
        console.error('Erreur saveKineDates:', e);
        showNotification('Erreur lors de la sauvegarde', 'error');
    }
}

// ─── Liste des prochaines visites kiné ───────────────────────────────────────

function renderUpcomingKineVisits() {
    const container = document.getElementById('upcomingKineVisits');
    if (!container) return;
    const today = new Date().toISOString().split('T')[0];
    const dates = (window.medicalSettings?.kineDates || []).filter(d => d >= today).sort();
    if (dates.length === 0) {
        container.innerHTML = '<p style="color:var(--color-text-secondary);font-size:13px;font-style:italic;">Aucune date programmée</p>';
        return;
    }
    container.innerHTML = dates.slice(0, 5).map(d => {
        const label = new Date(d).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--color-background);border-radius:8px;margin-bottom:6px;">
            <span style="font-size:13px;flex:1;">📅 ${label}</span>
            <button onclick="setKineDateFilter('${d}')" style="padding:4px 12px;background:#10b981;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">
                Voir les demandes
            </button>
        </div>`;
    }).join('');
}
window.renderUpcomingKineVisits = renderUpcomingKineVisits;

function setKineDateFilter(dateStr) {
    const input = document.getElementById('kineRequestDateFilter');
    if (input) { input.value = dateStr; loadKineRequests(); }
}
window.setKineDateFilter = setKineDateFilter;
window.saveKineDates = saveKineDates;

// ─── Calendrier Médecin ───────────────────────────────────────────────────────

let _docDates = new Set();
let _docCalYear, _docCalMonth;

function docCalInit(existingDates) {
    _docDates = new Set(existingDates || []);
    const now = new Date();
    _docCalYear  = now.getFullYear();
    _docCalMonth = now.getMonth();
    docCalRender();
}

function docCalRender() {
    const label = document.getElementById('docCalMonthLabel');
    const grid  = document.getElementById('docCalendar');
    if (!label || !grid) return;

    const mois = ['Janvier','Février','Mars','Avril','Mai','Juin',
                  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    label.textContent = `${mois[_docCalMonth]} ${_docCalYear}`;

    const firstDay = new Date(_docCalYear, _docCalMonth, 1).getDay();
    const offset   = (firstDay === 0) ? 6 : firstDay - 1;
    const daysInMonth = new Date(_docCalYear, _docCalMonth + 1, 0).getDate();
    const today = new Date().toISOString().split('T')[0];

    let html = ['L','M','M','J','V','S','D']
        .map(d => `<div style="font-weight:700;color:var(--color-text-secondary);padding:2px 0;">${d}</div>`)
        .join('');

    for (let i = 0; i < offset; i++) html += '<div></div>';

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${_docCalYear}-${String(_docCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isSelected = _docDates.has(dateStr);
        const isToday    = dateStr === today;
        const isPast     = dateStr < today;

        // Calculer J-2 pour mise en évidence
        const d2 = new Date(); d2.setDate(d2.getDate() + 2);
        const in2Days = d2.toISOString().split('T')[0] === dateStr;

        html += `<div onclick="docCalToggle('${dateStr}')" style="
            padding:5px 2px; border-radius:6px; cursor:pointer; font-size:12px;
            font-weight:${isSelected ? '700' : '400'};
            background:${isSelected ? '#3b82f6' : in2Days && !isPast ? 'rgba(59,130,246,0.12)' : 'transparent'};
            color:${isSelected ? 'white' : isPast ? '#9ca3af' : 'var(--color-text)'};
            border:${isToday ? '2px solid #3b82f6' : in2Days && !isPast ? '2px dashed #93c5fd' : '2px solid transparent'};
            transition: background 0.15s;
        " title="${in2Days && !isPast ? 'Dans 2 jours' : ''}">${d}</div>`;
    }

    grid.innerHTML = html;
}

function docCalToggle(dateStr) {
    if (_docDates.has(dateStr)) {
        _docDates.delete(dateStr);
    } else {
        _docDates.add(dateStr);
    }
    docCalRender();
}

function docCalPrevMonth() {
    _docCalMonth--;
    if (_docCalMonth < 0) { _docCalMonth = 11; _docCalYear--; }
    docCalRender();
}
function docCalNextMonth() {
    _docCalMonth++;
    if (_docCalMonth > 11) { _docCalMonth = 0; _docCalYear++; }
    docCalRender();
}
window.docCalPrevMonth = docCalPrevMonth;
window.docCalNextMonth = docCalNextMonth;
window.docCalToggle    = docCalToggle;

async function saveDocDates() {
    const doctorDates = Array.from(_docDates).sort();
    try {
        await db.collection('teamSettings').doc('pole').set({ doctorDates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        if (!window.medicalSettings) window.medicalSettings = {};
        window.medicalSettings.doctorDates = doctorDates;
        showNotification('Dates médecin enregistrées', 'success');
        checkDoctorVisitAlert();
        renderDoctorVisitDatesList();
    } catch(e) {
        console.error('Erreur saveDocDates:', e);
        showNotification('Erreur lors de la sauvegarde', 'error');
    }
}

// ─── Liste des visites médecin avec bouton "Planifier les créneaux" ──────────

function renderDoctorVisitDatesList() {
    const container = document.getElementById('doctorVisitDatesList');
    if (!container) return;
    const today = new Date().toISOString().split('T')[0];
    const dates = (window.medicalSettings?.doctorDates || []).filter(d => d >= today).sort();
    if (dates.length === 0) {
        container.innerHTML = '<p style="color:var(--color-text-secondary);font-size:13px;font-style:italic;margin-bottom:8px;">Aucune visite à venir — sélectionnez des dates dans le calendrier.</p>';
        return;
    }
    container.innerHTML = '<div style="font-weight:600;font-size:13px;margin-bottom:8px;color:var(--color-text-secondary);">Visites à venir :</div>' +
        dates.map(d => {
            const label = new Date(d).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
            return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:8px;">
                <span style="font-size:13px;flex:1;font-weight:500;">🩺 ${label}</span>
                <button onclick="openDoctorScheduler('${d}')"
                    style="padding:6px 14px;background:#3b82f6;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">
                    📋 Planifier les créneaux
                </button>
            </div>`;
        }).join('');
}
window.renderDoctorVisitDatesList = renderDoctorVisitDatesList;
window.saveDocDates = saveDocDates;

// ─── Alerte J-2 ─────────────────────────────────────────────────────────────

function checkDoctorVisitAlert() {
    const dates = window.medicalSettings?.doctorDates || [];
    const d2 = new Date(); d2.setDate(d2.getDate() + 2);
    const in2Days = d2.toISOString().split('T')[0];
    const block = document.getElementById('doctorVisitAlert');
    const msg   = document.getElementById('doctorVisitAlertMsg');
    if (!block) return;
    if (dates.includes(in2Days)) {
        const label = new Date(in2Days).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
        block.style.display = 'block';
        if (msg) msg.textContent = `Le médecin est prévu le ${label}. Planifie les rendez-vous dès maintenant.`;
        // Stocker la date pour le planificateur
        block.dataset.visitDate = in2Days;
    } else {
        block.style.display = 'none';
    }
}

// ─── Planificateur RDV ───────────────────────────────────────────────────────

let _schedulerDate = null;
let _slots = []; // [{ time, playerId, playerName }]

function openDoctorScheduler(dateStr) {
    const block = document.getElementById('doctorSchedulerBlock');
    if (!block) return;
    _schedulerDate = dateStr || document.getElementById('doctorVisitAlert')?.dataset.visitDate;
    if (!_schedulerDate) return;
    const label = new Date(_schedulerDate).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
    const lbl = document.getElementById('schedulerDateLabel');
    if (lbl) lbl.textContent = label;
    block.style.display = 'block';
    block.scrollIntoView({ behavior: 'smooth', block: 'start' });
    generateSlots();
}
window.openDoctorScheduler = openDoctorScheduler;

function closeDoctorScheduler() {
    const block = document.getElementById('doctorSchedulerBlock');
    if (block) block.style.display = 'none';
}
window.closeDoctorScheduler = closeDoctorScheduler;

function generateSlots() {
    const startVal = document.getElementById('schedStartTime')?.value || '14:00';
    const endVal   = document.getElementById('schedEndTime')?.value || '17:00';
    const duration = parseInt(document.getElementById('schedSlotDuration')?.value || '30');
    const grid     = document.getElementById('slotsGrid');
    const btnValid = document.getElementById('btnValidateRdv');
    if (!grid) return;

    // Générer les créneaux
    _slots = [];
    const [sh, sm] = startVal.split(':').map(Number);
    const [eh, em] = endVal.split(':').map(Number);
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur + duration <= end) {
        const h = String(Math.floor(cur / 60)).padStart(2, '0');
        const m = String(cur % 60).padStart(2, '0');
        _slots.push({ time: `${h}:${m}`, playerId: null, playerName: null });
        cur += duration;
    }

    // Charger les joueuses
    loadPlayersForScheduler().then(players => {
        renderSlotsGrid(players);
        if (btnValid) btnValid.style.display = 'block';
    });
}
window.generateSlots = generateSlots;

async function loadPlayersForScheduler() {
    try {
        const snap = await db.collection('players').orderBy('name').get();
        return snap.docs.map(d => ({ id: d.id, name: d.data().name || d.id }));
    } catch(e) { return []; }
}

function renderSlotsGrid(players) {
    const grid = document.getElementById('slotsGrid');
    if (!grid) return;

    const playerOptions = `<option value="">— Libre —</option>` +
        players.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    let html = `<div style="display:grid;grid-template-columns:auto 1fr;gap:8px;align-items:center;">`;
    _slots.forEach((slot, i) => {
        html += `
        <div style="font-weight:700;font-size:14px;color:var(--color-primary);white-space:nowrap;">⏰ ${slot.time}</div>
        <select id="slot_${i}" onchange="assignSlot(${i}, this.value, this.options[this.selectedIndex].text)"
            style="padding:8px;border:1px solid var(--color-border);border-radius:8px;font-size:13px;background:var(--color-background);color:var(--color-text);">
            ${playerOptions}
        </select>`;
    });
    html += `</div>`;
    grid.innerHTML = html;
}

function assignSlot(index, playerId, playerName) {
    if (_slots[index]) {
        _slots[index].playerId   = playerId || null;
        _slots[index].playerName = playerId ? playerName : null;
    }
}
window.assignSlot = assignSlot;

async function validateAndNotifyAppointments() {
    if (!_schedulerDate) return;
    const assigned = _slots.filter(s => s.playerId);
    if (assigned.length === 0) {
        showNotification('Assigne au moins un créneau avant de valider', 'error');
        return;
    }

    const btn = document.getElementById('btnValidateRdv');
    if (btn) { btn.disabled = true; btn.textContent = 'Enregistrement...'; }

    try {
        const batch = db.batch();
        for (const slot of assigned) {
            const ref = db.collection('doctorAppointments').doc(`${_schedulerDate}_${slot.playerId}`);
            batch.set(ref, {
                date: _schedulerDate,
                time: slot.time,
                playerId: slot.playerId,
                playerName: slot.playerName,
                notified: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        await batch.commit();

        // Envoyer les notifications via Cloud Function (non bloquant)
        let notified = false;
        try {
            if (typeof firebase !== 'undefined' && firebase.functions) {
                const sendRdv = firebase.functions().httpsCallable('sendDoctorAppointmentNotifications');
                await sendRdv({ date: _schedulerDate });
                notified = true;
            }
        } catch(notifError) {
            console.warn('Notifications non envoyées (function manquante ou erreur):', notifError.message);
        }

        showNotification(
            notified
                ? `${assigned.length} RDV enregistrés et notifications envoyées`
                : `${assigned.length} RDV enregistrés (notifications à configurer)`,
            'success'
        );
        closeDoctorScheduler();
        loadUpcomingDoctorRdv();
        renderDoctorVisitDatesList();
    } catch(e) {
        console.error('Erreur validateAndNotifyAppointments:', e);
        showNotification('Erreur lors de la sauvegarde des RDV', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = '✅ Valider et notifier les joueuses'; }
    }
}
window.validateAndNotifyAppointments = validateAndNotifyAppointments;

// ─── RDV à venir ────────────────────────────────────────────────────────────

async function loadUpcomingDoctorRdv() {
    const container = document.getElementById('upcomingDoctorRdv');
    if (!container) return;
    const today = new Date().toISOString().split('T')[0];
    try {
        const snap = await db.collection('doctorAppointments')
            .where('date', '>=', today)
            .orderBy('date').orderBy('time')
            .limit(20)
            .get();

        if (snap.empty) {
            container.innerHTML = '<span style="color:var(--color-text-secondary);font-size:13px;">Aucun RDV à venir</span>';
            return;
        }

        let html = '';
        let lastDate = '';
        snap.forEach(doc => {
            const d = doc.data();
            if (d.date !== lastDate) {
                const label = new Date(d.date).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
                html += `<div style="font-weight:700;font-size:13px;color:var(--color-primary);margin:${lastDate ? '12px' : '0'} 0 6px;">${label}</div>`;
                lastDate = d.date;
            }
            html += `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--color-background);border-radius:8px;margin-bottom:4px;">
                <span style="font-weight:700;color:var(--color-primary);font-size:14px;min-width:44px;">⏰ ${d.time}</span>
                <span style="font-size:13px;">${d.playerName || d.playerId}</span>
                <span style="margin-left:auto;font-size:11px;padding:2px 8px;border-radius:12px;background:${d.notified ? '#d1fae5' : '#fef3c7'};color:${d.notified ? '#065f46' : '#92400e'};">
                    ${d.notified ? '✅ Notifiée' : '⏳ En attente'}
                </span>
                <button onclick="deleteDocRdv('${doc.id}')" style="padding:2px 8px;border:1px solid #fca5a5;background:#fee2e2;color:#dc2626;border-radius:6px;cursor:pointer;font-size:11px;">✕</button>
            </div>`;
        });
        container.innerHTML = html;
    } catch(e) {
        console.warn('Erreur loadUpcomingDoctorRdv:', e);
    }
}
window.loadUpcomingDoctorRdv = loadUpcomingDoctorRdv;

async function deleteDocRdv(docId) {
    if (!confirm('Supprimer ce RDV ?')) return;
    await db.collection('doctorAppointments').doc(docId).delete();
    loadUpcomingDoctorRdv();
}
window.deleteDocRdv = deleteDocRdv;

// ─── Calendrier Kiné ─────────────────────────────────────────────────────────

let _kineDates = new Set();
let _kineCalYear, _kineCalMonth;

function kineCalInit(existingDates) {
    _kineDates = new Set(existingDates || []);
    const now = new Date();
    _kineCalYear  = now.getFullYear();
    _kineCalMonth = now.getMonth();
    kineCalRender();
}
window.kineCalInit = kineCalInit;

function kineCalRender() {
    const label = document.getElementById('kineCalMonthLabel');
    const grid  = document.getElementById('kineCalendar');
    if (!label || !grid) return;

    const mois = ['Janvier','Février','Mars','Avril','Mai','Juin',
                  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    label.textContent = `${mois[_kineCalMonth]} ${_kineCalYear}`;

    const firstDay = new Date(_kineCalYear, _kineCalMonth, 1).getDay();
    const offset   = (firstDay === 0) ? 6 : firstDay - 1;
    const daysInMonth = new Date(_kineCalYear, _kineCalMonth + 1, 0).getDate();
    const today = new Date().toISOString().split('T')[0];

    let html = ['L','M','M','J','V','S','D']
        .map(d => `<div style="font-weight:700;color:var(--color-text-secondary);padding:2px 0;">${d}</div>`)
        .join('');

    for (let i = 0; i < offset; i++) html += '<div></div>';

    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${_kineCalYear}-${String(_kineCalMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isSelected = _kineDates.has(dateStr);
        const isToday    = dateStr === today;
        const isPast     = dateStr < today;

        html += `<div onclick="kineCalToggle('${dateStr}')" style="
            padding:5px 2px; border-radius:6px; cursor:pointer; font-size:12px;
            font-weight:${isSelected ? '700' : '400'};
            background:${isSelected ? '#10b981' : 'transparent'};
            color:${isSelected ? 'white' : isPast ? '#9ca3af' : 'var(--color-text)'};
            border:${isToday ? '2px solid #10b981' : '2px solid transparent'};
            transition: background 0.15s;
        ">${d}</div>`;
    }

    grid.innerHTML = html;
}

function kineCalToggle(dateStr) {
    if (_kineDates.has(dateStr)) {
        _kineDates.delete(dateStr);
    } else {
        _kineDates.add(dateStr);
    }
    kineCalRender();
}

function kineCalPrevMonth() {
    _kineCalMonth--;
    if (_kineCalMonth < 0) { _kineCalMonth = 11; _kineCalYear--; }
    kineCalRender();
}
function kineCalNextMonth() {
    _kineCalMonth++;
    if (_kineCalMonth > 11) { _kineCalMonth = 0; _kineCalYear++; }
    kineCalRender();
}
window.kineCalToggle    = kineCalToggle;
window.kineCalPrevMonth = kineCalPrevMonth;
window.kineCalNextMonth = kineCalNextMonth;

// ─── SYSTÈME DEMANDES KINÉ ───────────────────────────────────────────────────

// Widget joueuse : demander à voir le kiné
async function loadKineRequestWidget(playerId) {
    const container = document.getElementById('kineRequestWidget');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];

    try {
        // Vérifier si la joueuse a déjà une demande aujourd'hui
        const snap = await db.collection('kineRequests')
            .where('playerId', '==', playerId)
            .where('requestDate', '==', today)
            .where('status', '==', 'pending')
            .limit(1).get();

        const hasRequest = !snap.empty;
        const requestId = hasRequest ? snap.docs[0].id : null;
        const reason = hasRequest ? (snap.docs[0].data().reason || '') : '';

        container.style.display = 'block';
        container.innerHTML = `
            <div style="background: linear-gradient(135deg, #e0f2fe, #bae6fd); border: 1px solid #7dd3fc; border-radius: 12px; padding: 14px 16px;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:${hasRequest ? '0' : '12px'};">
                    <div style="font-size:24px;">💆</div>
                    <div style="flex:1;">
                        <div style="font-weight:700; font-size:15px; color:#0c4a6e;">Voir le kiné</div>
                        ${hasRequest
                            ? `<div style="font-size:13px;color:#0369a1;">✅ Demande envoyée pour aujourd'hui${reason ? ' · ' + reason : ''}</div>`
                            : `<div style="font-size:12px;color:#0369a1;">Inscris-toi si tu as besoin de voir le kiné</div>`
                        }
                    </div>
                    ${hasRequest
                        ? `<button onclick="cancelKineRequest('${requestId}', '${playerId}')"
                               style="padding:6px 12px;background:white;border:1px solid #7dd3fc;color:#0369a1;border-radius:8px;cursor:pointer;font-size:12px;">
                               Annuler
                           </button>`
                        : ''
                    }
                </div>
                ${!hasRequest ? `
                    <div style="display:flex; gap:8px;">
                        <input type="text" id="kineReasonInput" placeholder="Motif (optionnel)" maxlength="80"
                            style="flex:1;padding:8px 12px;border:1px solid #7dd3fc;border-radius:8px;font-size:13px;background:white;">
                        <button onclick="submitKineRequest('${playerId}')"
                            style="padding:8px 16px;background:#0ea5e9;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:13px;white-space:nowrap;">
                            M'inscrire
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    } catch(e) {
        console.warn('loadKineRequestWidget:', e);
    }
}
window.loadKineRequestWidget = loadKineRequestWidget;

async function submitKineRequest(playerId) {
    const today = new Date().toISOString().split('T')[0];
    const reason = document.getElementById('kineReasonInput')?.value?.trim() || '';

    try {
        // Récupérer le nom de la joueuse
        const playerDoc = await db.collection('players').doc(playerId).get();
        const playerName = playerDoc.exists ? (playerDoc.data().name || playerId) : playerId;

        // Compter les demandes existantes pour déterminer l'ordre
        const existingSnap = await db.collection('kineRequests')
            .where('requestDate', '==', today)
            .where('status', '==', 'pending')
            .get();

        await db.collection('kineRequests').add({
            playerId,
            playerName,
            requestDate: today,
            reason,
            order: existingSnap.size + 1,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (typeof showNotification === 'function') showNotification('Demande envoyée au kiné !', 'success');
        loadKineRequestWidget(playerId);
    } catch(e) {
        console.error('submitKineRequest:', e);
        if (typeof showNotification === 'function') showNotification('Erreur lors de l\'inscription', 'error');
    }
}
window.submitKineRequest = submitKineRequest;

async function cancelKineRequest(requestId, playerId) {
    try {
        await db.collection('kineRequests').doc(requestId).delete();
        loadKineRequestWidget(playerId);
    } catch(e) {
        console.error('cancelKineRequest:', e);
    }
}
window.cancelKineRequest = cancelKineRequest;

// Coach : liste des demandes pour une date avec réorganisation
async function loadKineRequests() {
    const container = document.getElementById('kineRequestsList');
    if (!container) return;

    const dateInput = document.getElementById('kineRequestDateFilter');
    const date = dateInput?.value || new Date().toISOString().split('T')[0];

    container.innerHTML = '<p style="color:var(--color-text-secondary);font-style:italic;padding:16px;text-align:center;">Chargement...</p>';

    try {
        const snap = await db.collection('kineRequests')
            .where('requestDate', '==', date)
            .orderBy('order', 'asc')
            .get();

        if (snap.empty) {
            container.innerHTML = '<p style="color:var(--color-text-secondary);font-style:italic;text-align:center;padding:24px;">Aucune demande pour cette date.</p>';
            return;
        }

        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const pending = docs.filter(d => d.status === 'pending');
        const done    = docs.filter(d => d.status === 'done');

        let html = '';

        if (pending.length > 0) {
            html += `<div style="font-weight:600;font-size:13px;color:var(--color-text-secondary);margin-bottom:8px;">En attente (${pending.length})</div>`;
            pending.forEach((req, idx) => {
                const isFirst = idx === 0;
                const isLast  = idx === pending.length - 1;
                html += `
                <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--color-background);border:1px solid var(--color-border);border-radius:10px;margin-bottom:8px;">
                    <div style="font-size:20px;font-weight:800;color:var(--color-primary);min-width:28px;text-align:center;">${idx + 1}</div>
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:15px;">${req.playerName}</div>
                        ${req.reason ? `<div style="font-size:12px;color:var(--color-text-secondary);">${req.reason}</div>` : ''}
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
                        <button onclick="moveKineRequest('${req.id}', 'up')" ${isFirst ? 'disabled' : ''}
                            style="padding:3px 10px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-background);cursor:pointer;font-size:13px;${isFirst ? 'opacity:0.3;' : ''}">▲</button>
                        <button onclick="moveKineRequest('${req.id}', 'down')" ${isLast ? 'disabled' : ''}
                            style="padding:3px 10px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-background);cursor:pointer;font-size:13px;${isLast ? 'opacity:0.3;' : ''}">▼</button>
                    </div>
                    <button onclick="markKineDone('${req.id}')"
                        style="padding:6px 14px;background:#10b981;color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap;">
                        ✓ Passé
                    </button>
                    <button onclick="deleteKineRequest('${req.id}')"
                        style="padding:6px 10px;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:8px;cursor:pointer;font-size:12px;">
                        ✕
                    </button>
                </div>`;
            });
        }

        if (done.length > 0) {
            html += `<div style="font-weight:600;font-size:13px;color:#6b7280;margin:16px 0 8px;">Passés (${done.length})</div>`;
            done.forEach(req => {
                html += `
                <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:6px;opacity:0.75;">
                    <span style="font-size:16px;">✅</span>
                    <div style="flex:1;">
                        <div style="font-weight:500;font-size:14px;color:#6b7280;text-decoration:line-through;">${req.playerName}</div>
                        ${req.reason ? `<div style="font-size:12px;color:#9ca3af;">${req.reason}</div>` : ''}
                    </div>
                    <button onclick="deleteKineRequest('${req.id}')"
                        style="padding:4px 8px;background:#fee2e2;color:#dc2626;border:1px solid #fca5a5;border-radius:6px;cursor:pointer;font-size:11px;">✕</button>
                </div>`;
            });
        }

        container.innerHTML = html;
    } catch(e) {
        console.error('loadKineRequests:', e);
        container.innerHTML = '<p style="color:#ef4444;text-align:center;padding:16px;">Erreur de chargement</p>';
    }
}
window.loadKineRequests = loadKineRequests;

async function moveKineRequest(requestId, direction) {
    try {
        const dateInput = document.getElementById('kineRequestDateFilter');
        const date = dateInput?.value || new Date().toISOString().split('T')[0];

        const snap = await db.collection('kineRequests')
            .where('requestDate', '==', date)
            .where('status', '==', 'pending')
            .orderBy('order', 'asc')
            .get();

        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const idx = docs.findIndex(d => d.id === requestId);
        if (idx === -1) return;

        const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= docs.length) return;

        const batch = db.batch();
        batch.update(db.collection('kineRequests').doc(docs[idx].id),   { order: docs[swapIdx].order });
        batch.update(db.collection('kineRequests').doc(docs[swapIdx].id), { order: docs[idx].order });
        await batch.commit();

        loadKineRequests();
    } catch(e) {
        console.error('moveKineRequest:', e);
    }
}
window.moveKineRequest = moveKineRequest;

async function markKineDone(requestId) {
    try {
        await db.collection('kineRequests').doc(requestId).update({ status: 'done' });
        loadKineRequests();
    } catch(e) {
        console.error('markKineDone:', e);
    }
}
window.markKineDone = markKineDone;

async function deleteKineRequest(requestId) {
    if (!confirm('Supprimer cette demande ?')) return;
    await db.collection('kineRequests').doc(requestId).delete();
    loadKineRequests();
}
window.deleteKineRequest = deleteKineRequest;

// loadTodayKineRequests conservé pour compatibilité (alias)
async function loadTodayKineRequests() { await loadKineRequests(); }
window.loadTodayKineRequests = loadTodayKineRequests;

// ─── Widget RDV Médecin côté joueuse ─────────────────────────────────────────

async function loadPlayerDoctorAppointments(playerId) {
    const container = document.getElementById('doctorRdvWidget');
    if (!container) return;

    const today = new Date().toISOString().split('T')[0];

    try {
        const snap = await db.collection('doctorAppointments')
            .where('playerId', '==', playerId)
            .where('date', '>=', today)
            .get();

        if (snap.empty) {
            container.style.display = 'none';
            return;
        }

        // Trier par date + heure
        const rdvs = snap.docs
            .map(d => d.data())
            .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

        const prochain = rdvs[0];
        const dateLabel = new Date(prochain.date).toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long'
        });

        const isToday = prochain.date === today;

        container.style.display = 'block';
        container.innerHTML = `
            <div style="background: linear-gradient(135deg, #eff6ff, #dbeafe); border: 2px solid ${isToday ? '#3b82f6' : '#bfdbfe'}; border-radius: 12px; padding: 14px 16px; display: flex; align-items: center; gap: 14px;">
                <div style="font-size: 32px;">🩺</div>
                <div style="flex: 1;">
                    <div style="font-weight: 700; font-size: 15px; color: #1e40af;">
                        ${isToday ? '⚡ Aujourd\'hui !' : 'Prochain RDV médecin'}
                    </div>
                    <div style="font-size: 14px; color: #1d4ed8; margin-top: 2px;">
                        ${isToday ? '' : dateLabel + ' — '}⏰ ${prochain.time}
                    </div>
                    ${rdvs.length > 1 ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${rdvs.length} RDV programmés</div>` : ''}
                </div>
                ${isToday ? '<div style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 8px; font-size: 12px; font-weight: 700; white-space: nowrap;">Aujourd\'hui</div>' : ''}
            </div>
        `;
    } catch(e) {
        console.warn('loadPlayerDoctorAppointments:', e);
        container.style.display = 'none';
    }
}
window.loadPlayerDoctorAppointments = loadPlayerDoctorAppointments;

console.log('✅ medical-module.js chargé');
