// ============================================================================
// ARENA ALBUM — Collection de stickers (gamification)
// S'appuie sur STICKER_DEFINITIONS de stickers.js
// ============================================================================

const albumState = {
  filter: 'all',        // 'all' | 'obtained' | 'missing'
  unlocked: new Set(),  // Set des sticker IDs débloqués
  selectedSticker: null,
  loading: true,
};

const RARITY_COLORS = {
  common: { color: 'var(--arena-neon)', label: 'COMMUN', glow: 'var(--arena-glow-neon)' },
  rare: { color: 'var(--arena-blue)', label: 'RARE', glow: 'var(--arena-glow-blue)' },
  legendary: { color: 'var(--arena-pink)', label: 'LÉGEND.', glow: 'var(--arena-glow-pink)' },
};

async function loadAlbumData() {
  try {
    const playerId = appState?.currentUser?.id;
    if (!playerId) return;

    const snapshot = await db.collection('players').doc(playerId).collection('stickers').get();
    albumState.unlocked = new Set();
    snapshot.forEach(doc => {
      if (doc.exists) albumState.unlocked.add(doc.id);
    });
    albumState.loading = false;
  } catch (err) {
    console.error('Erreur chargement album:', err);
    albumState.loading = false;
  }
}

function renderAlbum() {
  const container = document.getElementById('albumTab');
  if (!container) return;

  const stickers = Object.values(window.STICKER_DEFINITIONS || {});
  const total = stickers.length;
  const obtained = albumState.unlocked.size;

  let filtered = stickers;
  if (albumState.filter === 'obtained') filtered = stickers.filter(s => albumState.unlocked.has(s.id));
  if (albumState.filter === 'missing') filtered = stickers.filter(s => !albumState.unlocked.has(s.id));

  container.innerHTML = `
    ${arenaHeader({
      section: 'COLLECTION_STATUS',
      title: 'Album',
      right: `<span style="font-family:var(--arena-mono);font-size:10px;color:var(--arena-neon);padding:4px 8px;border:1px solid var(--arena-neon);border-radius:4px;">${obtained}/${total}</span>`,
    })}

    <div style="padding: 14px 16px 110px; overflow-y: auto; height: calc(100vh - 200px);">
      ${renderProgressBar(stickers, total, obtained)}
      ${renderFilters()}
      ${renderStickerGrid(filtered)}
    </div>

    ${arenaTabBar({ activeTab: 'album' })}
    ${albumState.selectedSticker ? renderStickerModal(albumState.selectedSticker) : ''}
  `;

  bindAlbumEvents();
}

function renderProgressBar(stickers, total, obtained) {
  // Grouper les segments par rareté
  const byRarity = { common: [], rare: [], legendary: [] };
  stickers.forEach(s => byRarity[s.rarity]?.push(s));

  let segs = '';
  for (const [rarity, list] of Object.entries(byRarity)) {
    const colorClass = rarity === 'common' ? 'neon' : rarity === 'rare' ? 'blue' : 'pink';
    list.forEach(s => {
      const filled = albumState.unlocked.has(s.id);
      segs += `<div class="arena-progress__seg ${filled ? 'arena-progress__seg--' + colorClass : ''}"></div>`;
    });
  }

  return `
    <div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        ${monoLabel({ text: 'PROGRESSION' })}
        <span style="font-family:var(--arena-mono);font-size:10px;color:var(--arena-text-muted);">${obtained}/${total} · ${Math.round(obtained / total * 100)}%</span>
      </div>
      <div class="arena-progress">${segs}</div>
      <div style="display:flex;gap:12px;margin-top:6px;font-family:var(--arena-mono);font-size:8px;letter-spacing:1px;">
        <span style="color:var(--arena-neon);">■ COMMUN</span>
        <span style="color:var(--arena-blue);">■ RARE</span>
        <span style="color:var(--arena-pink);">■ LÉGENDAIRE</span>
      </div>
    </div>`;
}

function renderFilters() {
  const f = albumState.filter;
  return `
    <div style="display:flex;gap:6px;margin-bottom:14px;">
      ${['all', 'obtained', 'missing'].map(v => {
        const active = f === v;
        const labels = { all: 'TOUS', obtained: 'OBTENUS', missing: 'MANQUANTS' };
        return `
          <button data-action="setFilter" data-filter="${v}"
            style="flex:1;padding:8px 0;background:${active ? 'var(--arena-surface-2)' : 'transparent'};border:1px solid ${active ? 'var(--arena-neon)' : 'var(--arena-border)'};color:${active ? 'var(--arena-neon)' : 'var(--arena-text-muted)'};border-radius:4px;font-family:var(--arena-mono);font-size:10px;font-weight:700;cursor:pointer;letter-spacing:1px;">
            ${labels[v]}
          </button>`;
      }).join('')}
    </div>`;
}

function renderStickerGrid(stickers) {
  if (!stickers.length) {
    return `<div style="text-align:center;padding:40px;color:var(--arena-text-muted);font-family:var(--arena-mono);font-size:11px;">Aucun sticker trouvé</div>`;
  }

  return `
    <div class="arena-grid-3">
      ${stickers.map(s => renderStickerCard(s)).join('')}
    </div>`;
}

function renderStickerCard(s) {
  const unlocked = albumState.unlocked.has(s.id);
  const rc = RARITY_COLORS[s.rarity] || RARITY_COLORS.common;
  const cardAccent = unlocked ? rc.color : 'var(--arena-border)';
  const number = s.id.replace(/\D/g, '').slice(0, 3).padStart(3, '0') || '???';

  return `
    <div data-action="openSticker" data-id="${s.id}"
      style="background:var(--arena-surface);border:1px solid ${cardAccent};border-radius:8px;overflow:hidden;cursor:${unlocked ? 'pointer' : 'default'};position:relative;aspect-ratio:0.7;display:flex;flex-direction:column;${unlocked ? '' : 'opacity:0.6;'}">
      <!-- Coin haut-gauche: numéro -->
      <div style="font-family:var(--arena-mono);font-size:8px;color:var(--arena-text-muted);padding:6px 8px 0;letter-spacing:1px;">№${number}/${Object.keys(window.STICKER_DEFINITIONS || {}).length.toString().padStart(3, '0')}</div>
      <!-- Coin haut-droit: rareté -->
      <div style="position:absolute;top:6px;right:6px;padding:2px 5px;border:1px solid ${rc.color};border-radius:2px;font-family:var(--arena-mono);font-size:7px;color:${rc.color};font-weight:700;letter-spacing:0.5px;">${rc.label}</div>

      <!-- Fenêtre centrale -->
      <div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;margin:4px 8px;">
        ${unlocked ? `
          <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center, ${rc.color}15, transparent 60%);"></div>
          <div class="arena-scanlines" style="opacity:0.3;"></div>
          <span style="font-size:38px;position:relative;z-index:1;filter:drop-shadow(0 0 8px ${rc.color}60);">${s.emoji || '★'}</span>
          ${unlocked ? `<div style="position:absolute;top:0;left:0;width:12px;height:12px;border-top:2px solid ${rc.color};border-left:2px solid ${rc.color};border-radius:2px 0 0 0;"></div>` : ''}
          ${unlocked ? `<div style="position:absolute;bottom:0;right:0;width:12px;height:12px;border-bottom:2px solid ${rc.color};border-right:2px solid ${rc.color};border-radius:0 0 2px 0;"></div>` : ''}
        ` : `
          <span style="font-size:28px;color:var(--arena-text-faint);font-family:var(--arena-mono);">?</span>
        `}
      </div>

      <!-- Bandeau bas -->
      <div style="padding:6px 8px;background:linear-gradient(0deg, var(--arena-bg) 0%, transparent 100%);">
        <div style="font-size:9px;color:${unlocked ? 'var(--arena-text)' : 'var(--arena-text-faint)'};font-weight:700;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${s.name}</div>
        <div style="font-family:var(--arena-mono);font-size:7px;color:var(--arena-text-muted);margin-top:2px;">${unlocked ? 'OBTENU' : 'VERROUILLÉ'}</div>
      </div>
    </div>`;
}

function renderStickerModal(s) {
  const rc = RARITY_COLORS[s.rarity] || RARITY_COLORS.common;
  const number = s.id.replace(/\D/g, '').slice(0, 3).padStart(3, '0') || '???';

  return `
    <div id="stickerModal" data-action="closeModal"
      style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);">
      <div data-action="closeModal" style="position:absolute;inset:0;"></div>

      <!-- Carte holographique -->
      <div id="holoCard"
        style="position:relative;width:280px;height:380px;background:var(--arena-surface);border:2px solid ${rc.color};border-radius:12px;overflow:hidden;box-shadow:${rc.glow}, 0 30px 60px rgba(0,0,0,0.6);transform-style:preserve-3d;transition:transform 120ms ease-out;">

        <!-- Couche iridescente -->
        <div style="position:absolute;inset:0;background:conic-gradient(from 0deg, ${rc.color}20, var(--arena-blue)20, var(--arena-pink)20, ${rc.color}20);opacity:0.5;pointer-events:none;"></div>

        <!-- Scanlines -->
        <div class="arena-scanlines" style="opacity:0.15;"></div>

        <!-- Glyphe central -->
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
          <span style="font-size:110px;filter:drop-shadow(0 0 20px ${rc.color}60) hue-rotate(${s.rarity === 'legendary' ? '30deg' : '0deg'});position:relative;z-index:1;">${s.emoji || '★'}</span>
        </div>

        <!-- Bandeau nom -->
        <div style="position:absolute;bottom:0;left:0;right:0;padding:16px 14px;background:linear-gradient(0deg, var(--arena-bg) 40%, transparent);">
          <div style="font-family:var(--arena-mono);font-size:9px;color:${rc.color};letter-spacing:1.5px;margin-bottom:4px;">№${number} · ${rc.label}</div>
          <div style="font-size:16px;font-weight:800;color:var(--arena-text);text-transform:uppercase;">${s.name}</div>
          <div style="font-size:11px;color:var(--arena-text-dim);margin-top:2px;">${s.description}</div>
        </div>

        <!-- Liserés coins -->
        <div style="position:absolute;top:0;left:0;width:20px;height:20px;border-top:3px solid ${rc.color};border-left:3px solid ${rc.color};border-radius:4px 0 0 0;"></div>
        <div style="position:absolute;bottom:0;right:0;width:20px;height:20px;border-bottom:3px solid ${rc.color};border-right:3px solid ${rc.color};border-radius:0 0 4px 0;"></div>

        <!-- Fermer -->
        <button data-action="closeModal"
          style="position:absolute;top:10px;right:10px;z-index:10;background:rgba(0,0,0,0.6);border:1px solid var(--arena-border);color:var(--arena-text);width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">✕</button>
      </div>
    </div>`;
}

// ============================================================================
// EVENTS
// ============================================================================

function bindAlbumEvents() {
  const container = document.getElementById('albumTab');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === 'setFilter') {
      albumState.filter = btn.dataset.filter;
      renderAlbum();
    }
    if (action === 'openSticker') {
      const id = btn.dataset.id;
      if (!albumState.unlocked.has(id)) return;
      const sticker = (window.STICKER_DEFINITIONS || {})[id];
      if (sticker) {
        albumState.selectedSticker = sticker;
        renderAlbum();
      }
    }
    if (action === 'closeModal') {
      albumState.selectedSticker = null;
      renderAlbum();
    }
  });

  // Tilt 3D sur la carte holo
  const holoCard = container.querySelector('#holoCard');
  if (holoCard) {
    const moveHandler = (ex, ey) => {
      const rect = holoCard.getBoundingClientRect();
      const x = ex - rect.left;
      const y = ey - rect.top;
      const rotateX = ((y / rect.height) - 0.5) * -20;
      const rotateY = ((x / rect.width) - 0.5) * 20;
      holoCard.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };

    holoCard.addEventListener('mousemove', (e) => moveHandler(e.clientX, e.clientY));
    holoCard.addEventListener('touchmove', (e) => {
      e.preventDefault();
      moveHandler(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });

    const resetTilt = () => {
      holoCard.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg)';
    };
    holoCard.addEventListener('mouseleave', resetTilt);
    holoCard.addEventListener('touchend', resetTilt);
  }

  // Fermer modale avec Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      albumState.selectedSticker = null;
      renderAlbum();
      document.removeEventListener('keydown', escHandler);
    }
  };
  if (albumState.selectedSticker) {
    document.addEventListener('keydown', escHandler);
  }
}

// ============================================================================
// INIT
// ============================================================================

async function initArenaAlbum() {
  await loadAlbumData();
  renderAlbum();
  console.log('🏟️ ARENA Album initialisé');
}

window.albumState = albumState;
window.renderAlbum = renderAlbum;
window.initArenaAlbum = initArenaAlbum;

// Auto-init (avec délai pour laisser stickers.js charger)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initArenaAlbum, 1000));
} else {
  setTimeout(initArenaAlbum, 1000);
}
