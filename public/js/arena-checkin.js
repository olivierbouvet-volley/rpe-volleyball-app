// ============================================================================
// ARENA CHECK-IN — Module complet (UI + logique Firestore)
// Remplace l'ancien formulaire de check-in dans #checkinTab
// ============================================================================

// État local du check-in
let checkinState = {
  day: 'today',
  // Vitals
  sleep: 5,
  aches: 3,
  stress: 3,
  mood: 7,
  energy: 7,
  // Douleurs
  noPain: true,
  activePains: [],
  showNewPain: false,
  newPain: { zone: '', intensity: 0, daysSince: '1', desc: '' },
  // Cycle
  cycleOpen: true,
  cycleDay: null,
  periodProximity: '',
  showSymptoms: false,
  showSpm: false,
  symptoms: { cramps: 0, headache: 0, fatigue: 0, moodSwings: 0, bloating: 0, backPain: 0, breastTenderness: 0 },
  // Commentaire
  comment: '',
  submitted: false,
  alreadyDoneToday: false,
};

// Zones de douleur
const PAIN_ZONES = [
  'Tête', 'Cou / Cervicales', 'Épaule G.', 'Épaule D.',
  'Coude', 'Poignet', 'Dos haut', 'Dos bas / Lombaires',
  'Hanche', 'Cuisse / Quadri.', 'Ischio', 'Genou G.', 'Genou D.',
  'Mollet', 'Cheville G.', 'Cheville D.', 'Pied',
];

const PAIN_DURATIONS = [
  { v: '1', l: "Aujourd'hui" },
  { v: '2', l: '2 jours' },
  { v: '3', l: '3 jours' },
  { v: '7', l: '1 semaine' },
  { v: '14', l: '2 semaines' },
  { v: '30', l: '+1 mois' },
];

const SYMPTOM_LABELS = [
  { k: 'cramps', l: 'Crampes abdominales' },
  { k: 'headache', l: 'Maux de tête' },
  { k: 'fatigue', l: 'Fatigue excessive' },
  { k: 'moodSwings', l: "Variations d'humeur" },
  { k: 'bloating', l: 'Ballonnements' },
  { k: 'backPain', l: 'Douleurs dorsales' },
  { k: 'breastTenderness', l: 'Sensibilité mammaire' },
];

// ============================================================================
// RENDU PRINCIPAL
// ============================================================================

function renderCheckin(scrollTarget) {
  const s = checkinState;
  const container = document.getElementById('checkinTab');
  if (!container) return;

  // Vue verrouillée si check-in déjà fait aujourd'hui
  if (s.alreadyDoneToday) {
    container.innerHTML = `
      ${arenaHeader({ section: 'DAILY_CHECKIN', title: 'Check-in', right: liveDot('FAIT') })}
      <div style="padding: 48px 24px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px;">
        <div style="width: 72px; height: 72px; border-radius: 50%; background: rgba(0,255,136,0.1); border: 2px solid var(--arena-ok); display: flex; align-items: center; justify-content: center; font-size: 32px;">&#10003;</div>
        <div style="font-family: var(--arena-mono); font-size: 11px; color: var(--arena-ok); letter-spacing: 2px;">CHECK-IN DU JOUR VALIDÉ</div>
        <div style="color: var(--arena-text-dim); font-size: 13px; line-height: 1.6; max-width: 260px;">Tu as déjà complété ton check-in aujourd'hui.<br>Reviens demain pour le suivant.</div>
        <button data-action="goRpe"
          style="margin-top: 16px; width: 100%; max-width: 280px; padding: 14px; background: var(--arena-neon); color: #0A0E14; border: none; border-radius: 8px; font-family: var(--arena-mono); font-size: 12px; font-weight: 800; letter-spacing: 2px; cursor: pointer; box-shadow: 0 0 24px var(--arena-neon-40);">
          &#9658; REMPLIR MON RPE
        </button>
      </div>
    `;
    bindCheckinEvents();
    return;
  }

  // Sauvegarder la position de scroll avant le re-rendu
  const oldScrollDiv = container.querySelector('[style*="overflow-y"]');
  const prevScroll = oldScrollDiv ? oldScrollDiv.scrollTop : 0;

  const phase = calcPhase(s.cycleDay);
  const totalSymp = Object.values(s.symptoms).reduce((a, b) => a + b, 0);

  container.innerHTML = `
    ${arenaHeader({ section: 'DAILY_CHECKIN', title: 'Check-in', right: liveDot('12d STREAK') })}

    <div style="padding: 10px 16px 0; display: flex; gap: 6px;">
      ${renderDayButton('today', 'AUJD')}
      ${renderDayButton('yesterday', 'J-1')}
      ${renderDayButton('daybefore', 'J-2')}
    </div>

    <div style="padding: 14px 16px 110px; overflow-y: auto; height: calc(100vh - 200px);">
      ${arenaDateLabel(getDateLabel())}

      ${renderVitalsCard()}
      ${renderPainCard()}
      ${renderCycleCard(phase, totalSymp)}
      ${renderCommentCard()}
      ${renderSubmitButton()}
    </div>

  `;

  bindCheckinEvents();

  // Gestion du scroll après re-rendu — scroll manuel dans le conteneur overflow
  const newScrollDiv = container.querySelector('[style*="overflow-y"]');
  if (newScrollDiv) {
    if (scrollTarget === 'cycle') {
      requestAnimationFrame(() => {
        const cycleEl = newScrollDiv.querySelector('[data-action="toggleCycle"]');
        if (cycleEl) {
          const containerRect = newScrollDiv.getBoundingClientRect();
          const elemRect = cycleEl.getBoundingClientRect();
          newScrollDiv.scrollTop += elemRect.top - containerRect.top - 10;
        }
      });
    } else if (scrollTarget === 'symptoms') {
      requestAnimationFrame(() => {
        // Cibler le premier segment de symptôme si le grid est ouvert, sinon le bouton DÉTAILLER
        const target = newScrollDiv.querySelector('[data-action="setSymptom"]')
          || newScrollDiv.querySelector('[data-action="toggleSymptoms"]');
        if (target) {
          const containerRect = newScrollDiv.getBoundingClientRect();
          const elemRect = target.getBoundingClientRect();
          newScrollDiv.scrollTop += elemRect.top - containerRect.top - 20;
        }
      });
    } else {
      // Restaurer la position de scroll précédente
      newScrollDiv.scrollTop = prevScroll;
    }
  }
}

// ============================================================================
// COMPOSANTS
// ============================================================================

function renderDayButton(key, label) {
  const s = checkinState;
  const active = s.day === key;
  return `
    <button data-action="setDay" data-day="${key}"
      style="flex:1;padding:7px 0;background:${active ? 'var(--arena-neon)' : 'transparent'};color:${active ? '#0A0E14' : 'var(--arena-text-dim)'};border:${active ? 'none' : '1px solid var(--arena-border)'};border-radius:6px;font-family:var(--arena-mono);font-size:10px;font-weight:800;letter-spacing:1.5px;cursor:pointer;">
      ${label}
    </button>`;
}

function renderVitalsCard() {
  const s = checkinState;
  return arenaCard({
    children: `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        ${monoLabel({ text: 'VITALS', color: 'neon' })}
        <span style="font-family:var(--arena-mono);font-size:9px;color:var(--arena-text-muted);letter-spacing:1px;">5 INDICATEURS</span>
      </div>
      ${renderSliderRow({ label: 'Sommeil', sub: 'Qualité', value: s.sleep, name: 'sleep', color: 'var(--arena-blue)' })}
      ${renderSliderRow({ label: 'Courbatures', sub: 'Niveau', value: s.aches, name: 'aches', color: 'var(--arena-amber)', invert: true })}
      ${renderSliderRow({ label: 'Stress', sub: 'Mental', value: s.stress, name: 'stress', color: 'var(--arena-pink)', invert: true })}
      ${renderSliderRow({ label: 'Humeur', sub: 'Générale', value: s.mood, name: 'mood', color: 'var(--arena-neon)' })}
      ${renderSliderRow({ label: 'Énergie', sub: 'Globale', value: s.energy, name: 'energy', color: 'var(--arena-neon)', last: true })}
    `,
  });
}

function renderSliderRow({ label, sub, value, name, color, invert, last }) {
  const displayColor = invert
    ? (value <= 3 ? 'var(--arena-ok)' : value <= 6 ? 'var(--arena-amber)' : 'var(--arena-bad)')
    : (value <= 3 ? 'var(--arena-bad)' : value <= 6 ? 'var(--arena-amber)' : 'var(--arena-ok)');
  return `
    <div style="margin-bottom:${last ? '0' : '14px'};">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div>
          <span style="font-size:13px;color:var(--arena-text);font-weight:600;">${label}</span>
          <span style="font-size:10px;color:var(--arena-text-muted);margin-left:8px;font-family:var(--arena-mono);">· ${sub}</span>
        </div>
        <span style="font-family:var(--arena-mono);font-size:18px;font-weight:800;color:${displayColor};font-variant-numeric:tabular-nums;">${value}<span style="font-size:10px;color:var(--arena-text-muted);">/10</span></span>
      </div>
      ${segScale({ value, name, color })}
    </div>`;
}

function renderPainCard() {
  const s = checkinState;
  const hasActivePains = s.activePains.length > 0;
  const accent = !s.noPain ? 'bad' : null;

  return arenaCard({
    accent,
    children: `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        ${monoLabel({ text: 'DOULEURS / BLESSURES', color: s.noPain ? 'ok' : '' })}
        <button data-action="togglePain"
          style="padding:6px 12px;background:${s.noPain ? 'var(--arena-surface-2)' : 'transparent'};border:1px solid ${s.noPain ? 'var(--arena-ok)' : 'var(--arena-bad)'};color:${s.noPain ? 'var(--arena-ok)' : 'var(--arena-bad)'};border-radius:4px;font-family:var(--arena-mono);font-size:10px;font-weight:700;cursor:pointer;letter-spacing:1px;">
          ${s.noPain ? '✓ AUCUNE DOULEUR' : '⚠ DOULEUR PRÉSENTE'}
        </button>
      </div>

      ${hasActivePains ? renderActivePains() : ''}
      ${!s.showNewPain ? `
        <button data-action="showNewPain"
          style="width:100%;padding:10px 0;background:transparent;border:1px dashed var(--arena-border);color:var(--arena-text-dim);border-radius:6px;font-family:var(--arena-mono);font-size:10px;font-weight:700;cursor:pointer;letter-spacing:1.5px;margin-top:${hasActivePains ? '4px' : '0'};">
          + DÉCLARER UNE NOUVELLE DOULEUR
        </button>` : ''}
      ${s.showNewPain ? renderNewPainForm() : ''}
    `,
  });
}

function renderActivePains() {
  const s = checkinState;
  return `
    <div style="margin-bottom:${s.showNewPain ? '14px' : '0'};">
      <div style="font-family:var(--arena-mono);font-size:9px;color:var(--arena-text-muted);margin-bottom:6px;letter-spacing:1px;">▸ DOULEURS EN COURS · CONFIRME L'ÉTAT</div>
      ${s.activePains.map((p, idx) => `
        <div style="background:var(--arena-bg);border:1px solid var(--arena-border-soft);border-radius:6px;padding:10px 12px;margin-bottom:6px;">
          <div style="margin-bottom:8px;">
            <span style="font-size:13px;font-weight:700;color:var(--arena-text);">${p.zone}</span>
            <span style="font-family:var(--arena-mono);font-size:10px;color:var(--arena-text-muted);margin-left:8px;">· J${p.days} · dernier ${p.lastIntensity}/10</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">
            ${renderPainStatusBtn(idx, 'ok', '≈ STABLE', 'var(--arena-amber)')}
            ${renderPainStatusBtn(idx, 'worse', '▲ PIRE', 'var(--arena-bad)')}
            ${renderPainStatusBtn(idx, 'healed', '✓ GUÉRI', 'var(--arena-ok)')}
          </div>
        </div>`).join('')}
    </div>`;
}

function renderPainStatusBtn(idx, status, label, color) {
  const active = checkinState.activePains[idx].status === status;
  return `
    <button data-action="setPainStatus" data-idx="${idx}" data-status="${status}"
      style="padding:8px 0;background:${active ? color : 'transparent'};color:${active ? '#0A0E14' : color};border:1px solid ${color}${active ? '' : '60'};border-radius:4px;font-family:var(--arena-mono);font-size:9px;font-weight:800;letter-spacing:1px;cursor:pointer;">
      ${label}
    </button>`;
}

function renderNewPainForm() {
  const np = checkinState.newPain;
  return `
    <div style="background:var(--arena-bg);border:1px solid var(--arena-pink-40);border-radius:6px;padding:12px;margin-top:4px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        ${monoLabel({ text: 'NOUVELLE DOULEUR' })}
        <button data-action="cancelNewPain"
          style="background:transparent;border:none;color:var(--arena-text-muted);font-family:var(--arena-mono);font-size:10px;cursor:pointer;">✕ ANNULER</button>
      </div>

      <div style="margin-bottom:10px;">
        ${monoLabel({ text: 'ZONE *' })}
        <select data-action="setPainZone" style="width:100%;padding:8px 10px;margin-top:6px;background:var(--arena-surface-2);border:1px solid var(--arena-border);color:var(--arena-text);border-radius:4px;font-family:var(--arena-mono);font-size:11px;">
          <option value="">— Sélectionner —</option>
          ${PAIN_ZONES.map(z => `<option value="${z}" ${np.zone === z ? 'selected' : ''}>${z}</option>`).join('')}
        </select>
      </div>

      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          ${monoLabel({ text: 'INTENSITÉ' })}
          <span style="font-family:var(--arena-mono);font-size:11px;color:${np.intensity ? 'var(--arena-bad)' : 'var(--arena-text-muted)'};font-weight:700;">${np.intensity || '—'}/10</span>
        </div>
        ${segScale({ value: np.intensity, name: 'painIntensity', color: 'var(--arena-bad)' })}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
        <div>
          ${monoLabel({ text: 'DEPUIS' })}
          <select data-action="setPainDays" style="width:100%;padding:8px 10px;margin-top:6px;background:var(--arena-surface-2);border:1px solid var(--arena-border);color:var(--arena-text);border-radius:4px;font-family:var(--arena-mono);font-size:11px;">
            ${PAIN_DURATIONS.map(d => `<option value="${d.v}" ${np.daysSince === d.v ? 'selected' : ''}>${d.l}</option>`).join('')}
          </select>
        </div>
        <div>
          ${monoLabel({ text: 'CONTEXTE' })}
          <input data-action="setPainDesc" type="text" value="${np.desc.replace(/"/g, '&quot;')}" placeholder="ex: en sautant" maxlength="100"
            style="width:100%;padding:8px 10px;margin-top:6px;background:var(--arena-surface-2);border:1px solid var(--arena-border);color:var(--arena-text);border-radius:4px;font-family:var(--arena-font);font-size:11px;box-sizing:border-box;">
        </div>
      </div>
    </div>`;
}

function renderCycleCard(phase, totalSymp) {
  const s = checkinState;
  const phaseColor = s.cycleDay === null ? 'var(--arena-text-muted)'
    : (s.cycleDay >= 1 && s.cycleDay <= 5) ? 'var(--arena-pink)'
    : s.cycleDay === 0 ? 'var(--arena-amber)'
    : 'var(--arena-pink)';
  const sympColor = totalSymp > 20 ? 'var(--arena-bad)' : totalSymp > 10 ? 'var(--arena-amber)' : 'var(--arena-ok)';

  return arenaCard({
    accent: 'pink',
    children: `
      <button data-action="toggleCycle" style="width:100%;background:transparent;border:none;padding:0;cursor:pointer;display:flex;justify-content:space-between;align-items:center;color:var(--arena-text);">
        <div style="text-align:left;">
          ${monoLabel({ text: 'CYCLE_MENSTRUEL', color: 'pink' })}
          <div style="font-size:13px;color:var(--arena-text);margin-top:4px;font-weight:600;">Suivi du cycle <span style="font-size:10px;color:var(--arena-text-muted);font-weight:400;">(optionnel)</span></div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span style="font-family:var(--arena-mono);font-size:10px;color:${phaseColor};padding:3px 7px;border:1px solid ${phaseColor}60;border-radius:3px;letter-spacing:1px;font-weight:700;">
            ${s.cycleDay === null ? '—' : s.cycleDay >= 1 && s.cycleDay <= 8 ? 'J' + s.cycleDay + ' · ' + phase : phase}
          </span>
          <span style="color:var(--arena-text-muted);font-size:14px;">${s.cycleOpen ? '▾' : '▸'}</span>
        </div>
      </button>
      ${s.cycleOpen ? renderCycleContent(sympColor, totalSymp) : ''}
    `,
  });
}

function renderCycleContent(sympColor, totalSymp) {
  const s = checkinState;
  return `
    <div style="margin-top:16px;">
      ${monoLabel({ text: "EN RÈGLES ? CHOISIS LE JOUR" })}
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin:8px 0;">
        ${[...Array(8)].map((_, i) => {
          const d = i + 1;
          const active = s.cycleDay === d;
          return `<button data-action="setCycleDay" data-day="${d}"
            style="aspect-ratio:1;background:${active ? 'var(--arena-pink)' : 'transparent'};border:${active ? 'none' : '1px solid var(--arena-border)'};color:${active ? '#0A0E14' : 'var(--arena-text-dim)'};border-radius:6px;font-family:var(--arena-mono);font-weight:800;font-size:11px;cursor:pointer;">J${d}</button>`;
        }).join('')}
      </div>
      <!-- Boutons NON + SPM côte à côte -->
      <div style="display:flex;gap:6px;margin-bottom:14px;">
        <button data-action="setCycleNone"
          style="flex:1;padding:8px 0;background:${s.cycleDay === 0 ? 'var(--arena-surface-2)' : 'transparent'};color:${s.cycleDay === 0 ? 'var(--arena-amber)' : 'var(--arena-text-dim)'};border:1px solid ${s.cycleDay === 0 ? 'var(--arena-amber)' : 'var(--arena-border)'};border-radius:6px;font-family:var(--arena-mono);font-size:10px;font-weight:700;letter-spacing:1.5px;cursor:pointer;">
          ${s.cycleDay === 0 ? '● PAS DE RÈGLES' : '○ NON, PAS DE RÈGLES'}
        </button>
        <button data-action="toggleSpm"
          style="padding:8px 16px;background:${s.showSpm ? 'var(--arena-pink-15)' : 'transparent'};color:${s.showSpm ? 'var(--arena-pink)' : 'var(--arena-text-dim)'};border:1px solid ${s.showSpm ? 'var(--arena-pink)' : 'var(--arena-border)'};border-radius:6px;font-family:var(--arena-mono);font-size:10px;font-weight:700;letter-spacing:1px;cursor:pointer;">
          SPM
        </button>
      </div>



      ${s.showSpm ? `
        <div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            ${monoLabel({ text: 'SYMPTÔMES PRÉ-MENSTRUELS (SPM)', color: 'pink' })}
            ${totalSymp > 0 ? `<div style="font-family:var(--arena-mono);font-size:10px;color:${sympColor};font-weight:700;">SCORE: ${totalSymp}/70</div>` : ''}
          </div>
        </div>
        ${renderSymptomGrid()}
      ` : ''}

      ${s.cycleDay !== null && s.cycleDay > 0 && !s.showSpm ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${s.showSymptoms ? '12px' : '0'};">
          <div>
            ${monoLabel({ text: 'SYMPTÔMES MENSTRUELS', color: 'pink' })}
            ${totalSymp > 0 ? `<div style="font-family:var(--arena-mono);font-size:10px;color:${sympColor};margin-top:4px;font-weight:700;">SCORE: ${totalSymp}/70</div>` : ''}
          </div>
          <button data-action="toggleSymptoms"
            style="padding:6px 10px;background:transparent;border:1px solid var(--arena-border);color:var(--arena-text-muted);border-radius:4px;font-family:var(--arena-mono);font-size:9px;font-weight:700;cursor:pointer;letter-spacing:1px;">
            ${s.showSymptoms ? '▲ RÉDUIRE' : '▼ DÉTAILLER'}
          </button>
        </div>
        ${s.showSymptoms ? renderSymptomGrid() : ''}
      ` : ''}
    </div>`;
}

function renderSymptomGrid() {
  const s = checkinState;
  return `
    <div>
      <div style="font-size:10px;color:var(--arena-text-muted);font-family:var(--arena-mono);margin-bottom:10px;letter-spacing:0.5px;">0 (aucun) → 10 (insupportable). Laisse à 0 si rien.</div>
      ${SYMPTOM_LABELS.map((sym, i, arr) => {
        const value = s.symptoms[sym.k];
        const color = value === 0 ? 'var(--arena-text-faint)' : value <= 3 ? 'var(--arena-ok)' : value <= 6 ? 'var(--arena-amber)' : 'var(--arena-bad)';
        return `
          <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:${i === arr.length - 1 ? 'none' : '1px solid var(--arena-border-soft)'};">
            <span style="font-size:11px;color:var(--arena-text-dim);flex:0 0 130px;font-weight:500;">${sym.l}</span>
            <div style="flex:1;display:flex;gap:2px;">
              ${[...Array(10)].map((_, j) => {
                const filled = j < value;
                const segColor = j < 3 ? 'var(--arena-ok)' : j < 6 ? 'var(--arena-amber)' : 'var(--arena-bad)';
                return `<button data-action="setSymptom" data-sym="${sym.k}" data-val="${j + 1}"
                  style="flex:1;height:14px;background:${filled ? segColor : 'transparent'};border:${filled ? 'none' : '1px solid var(--arena-border)'};border-radius:2px;cursor:pointer;padding:0;"></button>`;
              }).join('')}
            </div>
            <span style="font-family:var(--arena-mono);font-size:11px;font-weight:700;color:${color};width:18px;text-align:right;">${value}</span>
          </div>`;
      }).join('')}
    </div>`;
}

function renderCommentCard() {
  const s = checkinState;
  return arenaCard({
    children: `
      ${monoLabel({ text: 'COMMENTAIRE (OPTIONNEL)' })}
      <textarea data-action="setComment" placeholder="Comment tu te sens aujourd'hui ?" rows="2" maxlength="150"
        style="width:100%;margin-top:8px;background:var(--arena-bg);border:1px solid var(--arena-border);color:var(--arena-text);border-radius:4px;padding:8px 10px;font-family:var(--arena-font);font-size:12px;resize:none;box-sizing:border-box;">${s.comment}</textarea>
      <div style="text-align:right;font-family:var(--arena-mono);font-size:9px;color:var(--arena-text-muted);margin-top:4px;">${s.comment.length}/150</div>
    `,
  });
}

function renderSubmitButton() {
  const s = checkinState;
  return `
    <button data-action="submit" style="width:100%;padding:16px;background:${s.submitted ? 'transparent' : 'var(--arena-neon)'};color:${s.submitted ? 'var(--arena-ok)' : '#0A0E14'};border:${s.submitted ? '1px solid var(--arena-ok)' : 'none'};border-radius:8px;font-family:var(--arena-mono);font-size:12px;font-weight:800;letter-spacing:2px;cursor:pointer;margin-top:8px;box-shadow:${s.submitted ? 'none' : '0 0 24px var(--arena-neon-40)'};">
      ${s.submitted ? '✓ ENREGISTRÉ · STREAK +1' : '▸ VALIDER LE CHECK-IN'}
    </button>`;
}

// ============================================================================
// HELPERS
// ============================================================================

function calcPhase(cycleDay) {
  if (cycleDay === null) return '—';
  if (cycleDay >= 1 && cycleDay <= 5) return 'MENSTRUELLE';
  if (cycleDay >= 6 && cycleDay <= 13) return 'FOLLICULAIRE';
  if (cycleDay >= 14 && cycleDay <= 16) return 'OVULATION';
  if (cycleDay >= 17 && cycleDay <= 28) return 'LUTÉALE';
  return 'MENSTRUELLE';
}

function getDateLabel() {
  const now = new Date();
  const days = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
  const months = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
  const dayMap = { today: 'CURRENT', yesterday: '−24H', daybefore: '−48H' };
  let d = now;
  if (checkinState.day === 'yesterday') d = new Date(now - 86400000);
  if (checkinState.day === 'daybefore') d = new Date(now - 172800000);
  return `${days[d.getDay()]} ${d.getDate()}.${months[d.getMonth()]}.${d.getFullYear()} · ${dayMap[checkinState.day]}`;
}

// ============================================================================
// EVENT HANDLING (delegation)
// ============================================================================

function bindCheckinEvents() {
  const container = document.getElementById('checkinTab');
  if (!container) return;

  // Guard : n'ajouter le listener de délégation qu'une seule fois
  if (!container._checkinDelegationBound) {
    container._checkinDelegationBound = true;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    if (!action) return;

    e.preventDefault();

    switch (action) {
      case 'togglePain': {
        checkinState.noPain = !checkinState.noPain;
        if (checkinState.noPain) checkinState.showNewPain = false;
        else checkinState.showNewPain = true;
        renderCheckin();
        break;
      }
      case 'showNewPain': {
        checkinState.showNewPain = true;
        checkinState.noPain = false;
        renderCheckin();
        break;
      }
      case 'cancelNewPain': {
        checkinState.showNewPain = false;
        checkinState.newPain = { zone: '', intensity: 0, daysSince: '1', desc: '' };
        renderCheckin();
        break;
      }
      case 'setPainStatus': {
        const idx = parseInt(btn.dataset.idx);
        const status = btn.dataset.status;
        checkinState.activePains[idx].status = status;
        renderCheckin();
        break;
      }
      case 'goRpe': {
        if (typeof switchTab === 'function') switchTab('logrpe');
        break;
      }
      case 'setDay': {
        checkinState.day = btn.dataset.day;
        renderCheckin();
        break;
      }
      case 'toggleCycle': {
        checkinState.cycleOpen = !checkinState.cycleOpen;
        renderCheckin(null);
        break;
      }
      case 'setCycleDay': {
        checkinState.cycleDay = parseInt(btn.dataset.day);
        checkinState.showSpm = false;
        checkinState.showSymptoms = true;
        renderCheckin('symptoms');
        break;
      }
      case 'setCycleNone': {
        checkinState.cycleDay = checkinState.cycleDay === 0 ? null : 0;
        if (checkinState.cycleDay !== 0) { checkinState.periodProximity = ''; checkinState.showSpm = false; }
        renderCheckin(null);
        break;
      }
      case 'setProximity': {
        checkinState.periodProximity = btn.dataset.val;
        renderCheckin(null);
        break;
      }
      case 'toggleSpm': {
        checkinState.showSpm = !checkinState.showSpm;
        if (checkinState.showSpm) {
          checkinState.cycleDay = 0;
          checkinState.showSymptoms = false;
        }
        renderCheckin(checkinState.showSpm ? 'symptoms' : null);
        break;
      }
      case 'toggleSymptoms': {
        checkinState.showSymptoms = !checkinState.showSymptoms;
        renderCheckin(checkinState.showSymptoms ? 'symptoms' : null);
        break;
      }
      case 'setSymptom': {
        const sym = btn.dataset.sym;
        const targetVal = parseInt(btn.dataset.val);
        const currentVal = checkinState.symptoms[sym];
        checkinState.symptoms[sym] = currentVal === targetVal ? 0 : targetVal;
        renderCheckin();
        break;
      }
      case 'submit': {
        submitCheckin();
        break;
      }
    }
  });

  } // fin guard _checkinDelegationBound

  // SegScale clicks
  container.querySelectorAll('.arena-scale').forEach(scale => {
    scale.addEventListener('click', (e) => {
      const seg = e.target.closest('.arena-scale__seg');
      if (!seg) return;
      const value = parseInt(seg.dataset.value);
      const name = seg.dataset.name;
      if (name === 'painIntensity') {
        checkinState.newPain.intensity = value;
      } else if (SYMPTOM_LABELS.some(s => s.k === name)) {
        // handled by setSymptom
        return;
      } else if (name in checkinState) {
        checkinState[name] = value;
      }
      renderCheckin();
    });
  });

  // Selects & inputs (change events)
  container.querySelectorAll('select[data-action]').forEach(sel => {
    sel.addEventListener('change', (e) => {
      const action = sel.dataset.action;
      if (action === 'setPainZone') checkinState.newPain.zone = sel.value;
      if (action === 'setPainDays') checkinState.newPain.daysSince = sel.value;
      renderCheckin();
    });
  });

  container.querySelectorAll('input[data-action], textarea[data-action]').forEach(inp => {
    inp.addEventListener('input', (e) => {
      const action = inp.dataset.action;
      if (action === 'setPainDesc') checkinState.newPain.desc = inp.value.slice(0, 100);
      if (action === 'setComment') checkinState.comment = inp.value.slice(0, 150);
      renderCheckin();
    });
  });
}

// ============================================================================
// SUBMISSION FIRESTORE
// ============================================================================

async function submitCheckin() {
  if (checkinState.submitted) return;

  try {
    if (typeof window.waitForAuth === 'function') {
      await window.waitForAuth();
    }

    const playerId = appState?.currentUser;
    if (!playerId) {
      alert('Connecte-toi d\'abord !');
      return;
    }

    // Déterminer la date cible
    let targetDate = new Date();
    if (checkinState.day === 'yesterday') targetDate = new Date(targetDate - 86400000);
    if (checkinState.day === 'daybefore') targetDate = new Date(targetDate - 172800000);
    const dateStr = targetDate.toISOString().split('T')[0];

    const checkinData = {
      date: firebase.firestore.Timestamp.fromDate(targetDate),
      vitals: {
        sleep: checkinState.sleep,
        aches: checkinState.aches,
        stress: checkinState.stress,
        mood: checkinState.mood,
        energy: checkinState.energy,
      },
      pain: {
        none: checkinState.noPain,
        active: checkinState.activePains.map(p => ({
          zone: p.zone,
          days: p.days,
          lastIntensity: p.lastIntensity,
          status: p.status,
        })),
        new: checkinState.showNewPain && checkinState.newPain.zone ? {
          zone: checkinState.newPain.zone,
          intensity: checkinState.newPain.intensity,
          daysSince: checkinState.newPain.daysSince,
          desc: checkinState.newPain.desc,
        } : null,
      },
      cycle: {
        day: checkinState.cycleDay,
        proximity: checkinState.cycleDay === 0 ? checkinState.periodProximity : null,
        symptoms: (checkinState.showSymptoms || checkinState.showSpm) ? checkinState.symptoms : null,
        spm: checkinState.showSpm,
      },
      comment: checkinState.comment,
      playerId: playerId,
    };

    const docId = `${playerId}_${dateStr}`;
    await db.collection('checkins').doc(docId).set(checkinData, { merge: true });

    checkinState.submitted = true;
    checkinState.alreadyDoneToday = true;
    renderCheckin(); // Affiche la vue "done"

    // Trigger sticker check
    if (typeof checkAndAwardStickers === 'function') {
      await checkAndAwardStickers(appState.currentUser, 'checkin');
    }

    console.log('✓ Check-in enregistré:', docId);

    // Rediriger vers RPE après 1.5s
    setTimeout(() => {
      if (typeof switchTab === 'function') switchTab('logrpe');
    }, 1500);

  } catch (error) {
    console.error('Erreur check-in:', error);
    alert('Erreur lors de l\'enregistrement : ' + error.message);
  }
}

// ============================================================================
// INIT
// ============================================================================

async function _checkTodayCheckin() {
  try {
    const playerId = appState?.currentUser;
    if (!playerId) return;
    const today = new Date().toISOString().split('T')[0];
    const doc = await db.collection('checkins').doc(`${playerId}_${today}`).get();
    checkinState.alreadyDoneToday = doc.exists;
  } catch (e) {
    // ignore silencieusement
  }
}

async function initArenaCheckin() {
  await _checkTodayCheckin();
  renderCheckin();
  if (typeof window.setArenaActiveTab === 'function') window.setArenaActiveTab('checkin');
  console.log('🏟️ ARENA Check-in initialisé');
}

// Appelé par app.js à chaque login de joueuse pour rafraîchir l'état du check-in
window.refreshCheckinForPlayer = async function () {
  checkinState.alreadyDoneToday = false;
  checkinState.submitted = false;
  await _checkTodayCheckin();
  renderCheckin();
};

// Exporter
window.checkinState = checkinState;
window.renderCheckin = renderCheckin;
window.initArenaCheckin = initArenaCheckin;

// Auto-init au chargement
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initArenaCheckin, 500));
} else {
  setTimeout(initArenaCheckin, 500);
}
