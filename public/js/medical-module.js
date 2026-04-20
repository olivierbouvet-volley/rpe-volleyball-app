/**
 * medical-module.js
 * Gestion onglet Médical : sous-onglets, calendrier médecin, RDV, notifications
 */

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

// ─── Sauvegarder uniquement les dates kiné (bouton dans sous-onglet Kiné) ───

async function saveKineDates() {
    const kineDates = Array.from(_kineDates).sort();
    try {
        await db.collection('teamSettings').doc('pole').set({ kineDates,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        if (!window.medicalSettings) window.medicalSettings = {};
        window.medicalSettings.kineDates = kineDates;
        showNotification('Dates kiné enregistrées', 'success');
    } catch(e) {
        console.error('Erreur saveKineDates:', e);
        showNotification('Erreur lors de la sauvegarde', 'error');
    }
}
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
    } catch(e) {
        console.error('Erreur saveDocDates:', e);
        showNotification('Erreur lors de la sauvegarde', 'error');
    }
}
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

        // Envoyer les notifications via Cloud Function
        if (typeof firebase !== 'undefined' && firebase.functions) {
            const sendRdv = firebase.functions().httpsCallable('sendDoctorAppointmentNotifications');
            await sendRdv({ date: _schedulerDate });
        }

        showNotification(`${assigned.length} RDV enregistrés et notifications envoyées`, 'success');
        closeDoctorScheduler();
        loadUpcomingDoctorRdv();
    } catch(e) {
        console.error('Erreur validateAndNotifyAppointments:', e);
        showNotification('Erreur lors de la validation', 'error');
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

console.log('✅ medical-module.js chargé');
