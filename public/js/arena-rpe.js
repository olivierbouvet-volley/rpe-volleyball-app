// ============================================================================
// ARENA RPE — Module complet (UI + logique Firestore)
// Remplace l'ancien formulaire RPE dans #rpeTab
// ============================================================================

const rpeState = {
  step: 1,
  type: '',
  duration: 90,
  rpe: 0,
  performance: 0,
  comment: '',
  submitted: false,
  // Champs spécifiques match
  matchWon: null,    // true | false | null
  timePlayed: null,  // 0 | 25 | 50 | 75 | 100
  matchScore: '',    // ex: "3-1"
};

const RPE_TYPES = [
  { v: 'Volley', l: 'VOLLEY', em: '🏐', c: 'var(--arena-neon)' },
  { v: 'Muscu', l: 'MUSCU', em: '💪', c: 'var(--arena-blue)' },
  { v: 'Cardio', l: 'CARDIO', em: '↯', c: 'var(--arena-amber)' },
  { v: 'Muscu+Volley', l: 'M+V', em: '💪🏐', c: '#A855F7' },
  { v: 'Match', l: 'MATCH', em: '🏆', c: 'var(--arena-bad)' },
];

const DURATION_CHIPS = [30, 60, 90, 120, 150];

function renderRpe() {
  const s = rpeState;
  const container = document.getElementById('logrpeTab');
  if (!container) return;

  // Sauvegarder la position de scroll avant le re-rendu
  const scrollDiv = container.querySelector('[style*="overflow-y"]');
  const prevScroll = scrollDiv ? scrollDiv.scrollTop : 0;
  const prevStep = s._prevStep || 0;
  s._prevStep = s.step;

  const charge = s.rpe * s.duration;
  const rpeColor = s.rpe <= 3 ? 'var(--arena-ok)'
    : s.rpe <= 6 ? 'var(--arena-amber)'
    : s.rpe <= 8 ? '#FF8A3D'
    : 'var(--arena-bad)';
  const rpeLabel = s.rpe === 0 ? '—'
    : s.rpe <= 2 ? 'Très facile'
    : s.rpe <= 4 ? 'Facile'
    : s.rpe <= 6 ? 'Modéré'
    : s.rpe <= 8 ? 'Dur'
    : 'Maximal';

  container.innerHTML = `
    ${arenaHeader({
      section: 'POST_SESSION',
      title: 'Log RPE',
      right: `<span style="font-family:var(--arena-mono);font-size:10px;color:var(--arena-text-muted);padding:4px 8px;border:1px solid var(--arena-border);border-radius:4px;">STEP ${s.step}/5</span>`,
    })}

    <div style="padding: 14px 16px 110px; overflow-y: auto; height: calc(100vh - 200px);">
      ${renderTypeCard()}
      ${renderRpeCard(rpeColor, rpeLabel)}
      ${renderDurationCard()}
      ${s.step >= 4 ? renderPerformanceCard() : ''}
      ${s.step >= 2 && s.type === 'Match' ? renderMatchCard() : ''}
      ${s.step >= 4 && s.rpe > 0 ? renderChargeBlock(charge) : ''}
      ${s.step >= 5 ? renderRpeComment() : ''}
      ${s.step >= 4 && s.rpe > 0 ? renderRpeSubmit() : ''}
    </div>

  `;

  bindRpeEvents();

  // Gestion du scroll après re-rendu
  const newScrollDiv = container.querySelector('[style*="overflow-y"]');
  if (newScrollDiv) {
    const submitBtn = container.querySelector('[data-action="submitRpe"]');
    if (submitBtn && s.step >= 4 && s.step > prevStep) {
      // Nouveau contenu révélé → défiler vers le bouton Valider
      requestAnimationFrame(() => {
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    } else {
      // Même étape → restaurer la position
      newScrollDiv.scrollTop = prevScroll;
    }
  }
}

function renderTypeCard() {
  const s = rpeState;
  return arenaCard({
    accent: s.step === 1 ? 'neon' : null,
    children: `
      ${monoLabel({ text: '01 · TYPE DE SÉANCE', color: s.step === 1 ? 'neon' : '' })}
      <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-top:12px;">
        ${RPE_TYPES.map(t => {
          const active = s.type === t.v;
          return `
            <button data-action="setType" data-type="${t.v}"
              style="aspect-ratio:0.85;background:${active ? t.c : 'transparent'};border:${active ? 'none' : '1px solid var(--arena-border)'};border-radius:6px;cursor:pointer;color:${active ? '#0A0E14' : 'var(--arena-text-dim)'};font-family:var(--arena-mono);font-size:9px;font-weight:800;letter-spacing:0.5px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;">
              <span style="font-size:18px;">${t.em}</span>
              <span>${t.l}</span>
            </button>`;
        }).join('')}
      </div>
    `,
  });
}

function renderRpeCard(rpeColor, rpeLabel) {
  const s = rpeState;
  return arenaCard({
    accent: s.step >= 2 ? 'neon' : null,
    className: s.step < 2 ? 'arena-opacity-low' : '',
    children: `
      ${monoLabel({ text: '02 · INTENSITÉ PERÇUE', color: s.step >= 2 ? 'neon' : '' })}
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin:8px 0 12px;">
        <div>
          <div style="font-size:56px;font-weight:900;font-family:var(--arena-mono);color:${rpeColor};line-height:1;letter-spacing:-2px;">${s.rpe || '—'}</div>
          <div style="font-size:11px;color:${rpeColor};font-family:var(--arena-mono);font-weight:700;letter-spacing:1px;margin-top:4px;">▸ ${rpeLabel}</div>
        </div>
        <div style="font-family:var(--arena-mono);font-size:9px;color:var(--arena-text-muted);text-align:right;line-height:1.6;">
          0 · Repos<br>5 · Modéré<br>10 · Maximal
        </div>
      </div>
      ${segScale({ value: s.rpe, name: 'rpe', color: 'var(--arena-neon)' })}
    `,
  });
}

function renderDurationCard() {
  const s = rpeState;
  return arenaCard({
    accent: s.step >= 3 ? 'neon' : null,
    className: s.step < 3 ? 'arena-opacity-low' : '',
    children: `
      ${monoLabel({ text: '03 · DURÉE (MINUTES)', color: s.step >= 3 ? 'neon' : '' })}
      <div style="display:flex;gap:6px;margin:10px 0;">
        ${DURATION_CHIPS.map(d => {
          const active = s.duration === d;
          return `
            <button data-action="setDuration" data-dur="${d}"
              style="flex:1;padding:10px 0;background:${active ? 'var(--arena-neon)' : 'transparent'};border:${active ? 'none' : '1px solid var(--arena-border)'};color:${active ? '#0A0E14' : 'var(--arena-text-dim)'};border-radius:6px;font-family:var(--arena-mono);font-size:11px;font-weight:800;cursor:pointer;">
              ${d}'
            </button>`;
        }).join('')}
      </div>
      <input data-action="setDurationCustom" type="number" value="${s.duration}"
        placeholder="Durée personnalisée…" min="1" max="600"
        style="width:100%;padding:8px 10px;background:var(--arena-bg);border:1px solid var(--arena-border);color:var(--arena-text);border-radius:4px;font-family:var(--arena-mono);font-size:13px;box-sizing:border-box;">
    `,
  });
}

function renderMatchCard() {
  const s = rpeState;
  const TIME_CHIPS = [
    { v: 0,   l: 'Chauffe' },
    { v: 25,  l: '1/4 set' },
    { v: 50,  l: '1/2' },
    { v: 75,  l: '3/4' },
    { v: 100, l: 'Tous' },
  ];
  return arenaCard({
    accent: 'neon',
    children: `
      ${monoLabel({ text: '04b · RÉSULTAT MATCH', color: 'neon' })}
      <div style="display:flex;gap:8px;margin:10px 0 14px;">
        <button data-action="setMatchWon" data-won="true"
          style="flex:1;padding:12px 0;background:${s.matchWon === true ? 'var(--arena-ok)' : 'transparent'};border:${s.matchWon === true ? 'none' : '1px solid var(--arena-border)'};color:${s.matchWon === true ? '#0A0E14' : 'var(--arena-text-dim)'};border-radius:6px;font-family:var(--arena-mono);font-size:12px;font-weight:800;letter-spacing:1px;cursor:pointer;">
          ✅ VICTOIRE
        </button>
        <button data-action="setMatchWon" data-won="false"
          style="flex:1;padding:12px 0;background:${s.matchWon === false ? 'var(--arena-bad)' : 'transparent'};border:${s.matchWon === false ? 'none' : '1px solid var(--arena-border)'};color:${s.matchWon === false ? '#0A0E14' : 'var(--arena-text-dim)'};border-radius:6px;font-family:var(--arena-mono);font-size:12px;font-weight:800;letter-spacing:1px;cursor:pointer;">
          ❌ DÉFAITE
        </button>
      </div>

      ${monoLabel({ text: 'TEMPS DE JEU', color: 'neon' })}
      <div style="display:flex;gap:5px;margin:8px 0 12px;">
        ${TIME_CHIPS.map(chip => {
          const active = s.timePlayed === chip.v;
          return `
            <button data-action="setTimePlayed" data-time="${chip.v}"
              style="flex:1;padding:8px 0;background:${active ? 'var(--arena-neon)' : 'transparent'};border:${active ? 'none' : '1px solid var(--arena-border)'};color:${active ? '#0A0E14' : 'var(--arena-text-dim)'};border-radius:6px;font-family:var(--arena-mono);font-size:9px;font-weight:800;cursor:pointer;">
              ${chip.l}
            </button>`;
        }).join('')}
      </div>

      ${monoLabel({ text: 'SCORE (optionnel)', color: 'neon' })}
      <input data-action="setMatchScore" type="text" value="${s.matchScore}"
        placeholder="ex: 3-1" maxlength="10"
        style="width:100%;padding:8px 10px;background:var(--arena-bg);border:1px solid var(--arena-border);color:var(--arena-text);border-radius:4px;font-family:var(--arena-mono);font-size:13px;box-sizing:border-box;">
    `,
  });
}

function renderPerformanceCard() {
  const s = rpeState;
  const perfColor = s.performance === 0 ? 'var(--arena-text-faint)'
    : s.performance <= 3 ? 'var(--arena-bad)'
    : s.performance <= 6 ? 'var(--arena-amber)'
    : 'var(--arena-neon)';
  const perfLabel = s.performance === 0 ? '—'
    : s.performance <= 3 ? 'Difficile'
    : s.performance <= 6 ? 'Correct'
    : s.performance <= 8 ? 'Bon'
    : 'Excellent';

  return arenaCard({
    accent: s.step >= 4 ? 'neon' : null,
    children: `
      ${monoLabel({ text: '04 · NOTE DE PERFORMANCE', color: 'neon' })}
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin:8px 0 12px;">
        <div>
          <div style="font-size:48px;font-weight:900;font-family:var(--arena-mono);color:${perfColor};line-height:1;letter-spacing:-2px;">${s.performance || '—'}</div>
          <div style="font-size:11px;color:${perfColor};font-family:var(--arena-mono);font-weight:700;letter-spacing:1px;margin-top:4px;">▸ ${perfLabel}</div>
        </div>
        <div style="font-family:var(--arena-mono);font-size:9px;color:var(--arena-text-muted);text-align:right;line-height:1.6;">
          Comment as-tu<br>performé ?
        </div>
      </div>
      ${segScale({ value: s.performance, name: 'performance', color: 'var(--arena-neon)' })}
    `,
  });
}

function renderChargeBlock(charge) {
  const s = rpeState;
  return `
    <div style="background:linear-gradient(135deg,var(--arena-neon-15),transparent);border:1px solid var(--arena-neon-60);border-radius:10px;padding:14px 16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        ${monoLabel({ text: "CHARGE D'ENTRAÎNEMENT", color: 'neon' })}
        <div style="font-size:11px;color:var(--arena-text-dim);margin-top:4px;font-family:var(--arena-mono);">RPE × Durée = ${s.rpe} × ${s.duration}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:36px;font-weight:900;font-family:var(--arena-mono);color:var(--arena-neon);line-height:1;letter-spacing:-1px;">${charge}</div>
        <div style="font-size:10px;color:var(--arena-text-muted);font-family:var(--arena-mono);">UA</div>
      </div>
    </div>`;
}

function renderRpeComment() {
  const s = rpeState;
  return arenaCard({
    accent: 'neon',
    children: `
      ${monoLabel({ text: '04 · COMMENTAIRE', color: 'neon' })}
      <textarea data-action="setComment" placeholder="Comment s'est passée la séance ?" rows="2" maxlength="150"
        style="width:100%;margin-top:8px;background:var(--arena-bg);border:1px solid var(--arena-border);color:var(--arena-text);border-radius:4px;padding:8px 10px;font-family:var(--arena-font);font-size:12px;resize:none;box-sizing:border-box;">${s.comment}</textarea>
      <div style="text-align:right;font-family:var(--arena-mono);font-size:9px;color:var(--arena-text-muted);margin-top:4px;">${s.comment.length}/150</div>
    `,
  });
}

function renderRpeSubmit() {
  const s = rpeState;
  return `
    <button data-action="submitRpe" style="width:100%;padding:16px;background:${s.submitted ? 'transparent' : 'var(--arena-neon)'};color:${s.submitted ? 'var(--arena-ok)' : '#0A0E14'};border:${s.submitted ? '1px solid var(--arena-ok)' : 'none'};border-radius:8px;font-family:var(--arena-mono);font-size:12px;font-weight:800;letter-spacing:2px;cursor:pointer;margin-top:8px;box-shadow:${s.submitted ? 'none' : '0 0 24px var(--arena-neon-40)'};">
      ${s.submitted ? '✓ RPE ENREGISTRÉ' : '▸ VALIDER LE RPE'}
    </button>`;
}

// ============================================================================
// EVENTS
// ============================================================================

function bindRpeEvents() {
  const container = document.getElementById('logrpeTab');
  if (!container) return;

  // Guard : n'ajouter le listener de délégation qu'une seule fois
  if (!container._rpeDelegationBound) {
    container._rpeDelegationBound = true;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    if (!action) return;

    e.preventDefault();

    switch (action) {
      case 'setType':
        rpeState.type = btn.dataset.type;
        rpeState.step = Math.max(rpeState.step, 2);
        renderRpe();
        break;
      case 'setDuration':
        rpeState.duration = parseInt(btn.dataset.dur);
        rpeState.step = Math.max(rpeState.step, 4);
        renderRpe();
        break;
      case 'setMatchWon':
        rpeState.matchWon = btn.dataset.won === 'true';
        renderRpe();
        break;
      case 'setTimePlayed':
        rpeState.timePlayed = parseInt(btn.dataset.time);
        renderRpe();
        break;
      case 'setComment':
        break;
      case 'submitRpe':
        submitRpe();
        break;
    }
  });

  } // fin guard _rpeDelegationBound

  // SegScale RPE
  container.querySelectorAll('.arena-scale').forEach(scale => {
    scale.addEventListener('click', (e) => {
      const seg = e.target.closest('.arena-scale__seg');
      if (!seg) return;
      const val = parseInt(seg.dataset.value);
      if (seg.dataset.name === 'rpe') {
        rpeState.rpe = val;
        rpeState.step = Math.max(rpeState.step, 3);
        renderRpe();
      } else if (seg.dataset.name === 'performance') {
        rpeState.performance = val;
        rpeState.step = Math.max(rpeState.step, 5);
        renderRpe();
      }
    });
  });

  // Custom duration input
  const durInput = container.querySelector('[data-action="setDurationCustom"]');
  if (durInput) {
    durInput.addEventListener('input', () => {
      const val = parseInt(durInput.value);
      if (val > 0) {
        rpeState.duration = val;
        rpeState.step = Math.max(rpeState.step, 4);
        renderRpe();
      }
    });
  }

  // Score match input
  const matchScoreEl = container.querySelector('[data-action="setMatchScore"]');
  if (matchScoreEl) {
    matchScoreEl.addEventListener('input', () => {
      rpeState.matchScore = matchScoreEl.value.slice(0, 10);
    });
  }

  // Comment textarea
  const commentEl = container.querySelector('[data-action="setComment"]');
  if (commentEl) {
    commentEl.addEventListener('input', () => {
      rpeState.comment = commentEl.value.slice(0, 150);
      renderRpe();
    });
  }
}

// ============================================================================
// SUBMISSION FIRESTORE
// ============================================================================

async function submitRpe() {
  if (rpeState.submitted) return;
  rpeState.submitted = true; // Verrou optimiste AVANT tout await — empêche les appels en parallèle

  try {
    if (typeof window.waitForAuth === 'function') {
      await window.waitForAuth();
    }

    const playerId = appState?.currentUser;
    if (!playerId) {
      alert('Connecte-toi d\'abord !');
      return;
    }

    const charge = rpeState.rpe * rpeState.duration;

    const rpeData = {
      playerId,
      date: firebase.firestore.Timestamp.now(),
      type: rpeState.type,
      durationMin: rpeState.duration,
      rpe: rpeState.rpe,
      performance: rpeState.performance || null,
      charge,
      comment: rpeState.comment || null,
    };

    // Champs spécifiques match
    if (rpeState.type === 'Match') {
      if (rpeState.matchWon !== null) rpeData.matchWon = rpeState.matchWon;
      if (rpeState.timePlayed !== null) rpeData.timePlayed = rpeState.timePlayed;
      if (rpeState.matchScore) rpeData.matchScore = rpeState.matchScore;
    }

    await db.collection('rpe').add(rpeData);

    renderRpe(); // Affiche l'état "enregistré"

    // Reset après 2s
    setTimeout(() => {
      rpeState.submitted = false;
      // Reset form
      rpeState.type = '';
      rpeState.rpe = 0;
      rpeState.performance = 0;
      rpeState.duration = 90;
      rpeState.comment = '';
      rpeState.matchWon = null;
      rpeState.timePlayed = null;
      rpeState.matchScore = '';
      rpeState.step = 1;
      renderRpe();
    }, 2000);

    // Trigger sticker check
    if (typeof checkAndAwardStickers === 'function') {
      await checkAndAwardStickers(appState.currentUser, 'rpe');
    }

    console.log('✓ RPE enregistré, charge:', charge);
  } catch (error) {
    rpeState.submitted = false; // Libérer le verrou en cas d'erreur
    renderRpe();
    console.error('Erreur RPE:', error);
    alert('Erreur lors de l\'enregistrement : ' + error.message);
  }
}

// ============================================================================
// INIT
// ============================================================================

function initArenaRpe() {
  renderRpe();
  if (typeof window.setArenaActiveTab === 'function') window.setArenaActiveTab('rpe');
  console.log('🏟️ ARENA RPE initialisé');
}

window.rpeState = rpeState;
window.renderRpe = renderRpe;
window.initArenaRpe = initArenaRpe;

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initArenaRpe, 600));
} else {
  setTimeout(initArenaRpe, 600);
}
