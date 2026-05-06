// ============================================================================
// ARENA COMPONENTS — Vanilla JS design system
// Utilise les classes CSS de arenatheme.css
// ============================================================================

/**
 * Header ARENA — section label + titre + zone droite optionnelle
 * @param {Object} opts
 * @param {string} opts.section - Label mono uppercase (ex: "DAILY_CHECKIN")
 * @param {string} opts.title - Titre Inter 800 (ex: "Check-in")
 * @param {string} [opts.right] - HTML string optionnel a droite
 * @returns {string} HTML
 */
function arenaHeader({ section, title, right = '' }) {
  return `
    <div class="arena-header">
      <div>
        <div class="arena-header__section">// ${section}</div>
        <div class="arena-header__title">${title}</div>
      </div>
      ${right}
    </div>`;
}

/**
 * Onglet de la tab bar
 * @param {Object} opts
 * @param {string} opts.key
 * @param {string} opts.label
 * @param {string} opts.icon
 * @param {boolean} opts.active
 * @returns {string} HTML
 */
function arenaTab({ key, label, icon, active }) {
  const activeClass = active ? ' arena-tabbar__tab--active' : '';
  return `
    <button class="arena-tabbar__tab${activeClass}" data-tab="${key}">
      <span class="arena-tabbar__icon">${icon}</span>
      ${label}
    </button>`;
}

/**
 * Barre d'onglets complete (6 onglets)
 * @param {Object} opts
 * @param {string} opts.activeTab - cle de l'onglet actif
 * @param {Array<{key:string, label:string, icon:string}>} [opts.tabs] - onglets personnalises
 * @returns {string} HTML
 */
function arenaTabBar({ activeTab, tabs }) {
  const t = tabs || [
    { key: 'checkin', label: 'CHECK', icon: '✓' },
    { key: 'rpe',     label: 'RPE',   icon: '↯' },
    { key: 'stats',   label: 'STATS', icon: '▦' },
    { key: 'pphys',   label: 'PPHYS', icon: '≡' },
    { key: 'match',   label: 'MATCH', icon: '◆' },
    { key: 'album',   label: 'ALBUM', icon: '★' },
  ];
  return `
    <nav class="arena-tabbar">
      ${t.map(tab => arenaTab({ ...tab, active: tab.key === activeTab })).join('')}
    </nav>`;
}

/**
 * Carte ARENA
 * @param {Object} opts
 * @param {string} opts.children - HTML contenu
 * @param {string} [opts.accent] - 'neon'|'pink'|'blue'|'amber'|'bad'
 * @param {string} [opts.className] - classes additionnelles
 * @returns {string} HTML
 */
function arenaCard({ children, accent, className = '' }) {
  const accentClass = accent ? ` arena-card--${accent}` : '';
  return `
    <div class="arena-card${accentClass} ${className}" style="margin-bottom: 10px;">
      ${children}
    </div>`;
}

/**
 * Label monospace
 * @param {Object} opts
 * @param {string} opts.text
 * @param {string} [opts.color] - 'neon'|'pink'|'blue' ou hex
 * @returns {string} HTML
 */
function monoLabel({ text, color }) {
  const colorClass = color === 'neon' ? 'arena-label--neon'
    : color === 'pink' ? 'arena-label--pink'
    : color === 'blue' ? 'arena-label--blue'
    : '';
  const colorStyle = !colorClass && color ? `color:${color}` : '';
  return `<div class="arena-label ${colorClass}" style="${colorStyle}">// ${text}</div>`;
}

/**
 * Échelle segmentée 0-10 (slider visuel)
 * @param {Object} opts
 * @param {number} opts.value - valeur actuelle (0 = aucun segment rempli)
 * @param {number} [opts.max=10]
 * @param {string} [opts.color] - couleur hex des segments remplis
 * @param {string} [opts.name] - data attribute pour l'event delegation
 * @returns {string} HTML
 */
function segScale({ value, max = 10, color = 'var(--arena-neon)', name = '' }) {
  const segments = [];
  for (let i = 0; i < max; i++) {
    const filled = i < value;
    const segStyle = filled
      ? `background:${color};border:none;color:#0A0E14`
      : '';
    segments.push(`
      <button class="arena-scale__seg${filled ? ' arena-scale__seg--filled' : ''}"
              data-value="${i + 1}"
              data-name="${name}"
              style="${segStyle}">
        ${i + 1}
      </button>`);
  }
  return `<div class="arena-scale">${segments.join('')}</div>`;
}

/**
 * Badge / tag
 * @param {Object} opts
 * @param {string} opts.text
 * @param {string} [opts.color] - 'neon'|'pink'|'blue'|'amber'|'ok'|'bad'
 * @returns {string} HTML
 */
function arenaTag({ text, color = '' }) {
  const c = color ? ` arena-tag--${color}` : '';
  return `<span class="arena-tag${c}">${text}</span>`;
}

/**
 * Bouton
 * @param {Object} opts
 * @param {string} opts.text
 * @param {string} [opts.variant] - 'primary'|'ghost'|'full'
 * @param {string} [opts.className]
 * @returns {string} HTML
 */
function arenaBtn({ text, variant = '', className = '' }) {
  const v = variant ? ` arena-btn--${variant}` : '';
  return `<button class="arena-btn${v} ${className}">${text}</button>`;
}

/**
 * Badge LIVE / streak pulse
 * @param {string} text
 * @returns {string} HTML
 */
function liveDot(text) {
  return `<span style="font-family:var(--arena-mono);font-size:10px;color:var(--arena-neon);padding:4px 8px;border:1px solid var(--arena-neon);border-radius:4px;display:inline-flex;align-items:center;gap:6px;"><span class="arena-live-dot"></span>${text}</span>`;
}

/**
 * Section mono avec date
 * @param {string} text - ex: "LUN 27.OCT.2025 · CURRENT"
 * @returns {string} HTML
 */
function arenaDateLabel(text) {
  return `<div class="arena-label" style="margin-bottom:10px;">// ${text}</div>`;
}

// Flag global pour désactiver les anciens modules
window.ARENA_ACTIVE = true;

// Met à jour l'onglet actif de la tabbar ARENA statique (dans index.html)
// arenaKey = null → aucun onglet actif (ex: Dashboard)
window.setArenaActiveTab = function(arenaKey) {
  document.querySelectorAll('#arena-global-tabbar [data-arena-tab]').forEach(btn => {
    const active = arenaKey && btn.dataset.arenaTab === arenaKey;
    btn.classList.toggle('arena-tabbar__tab--active', active);
  });
};

// Exporter dans le scope global (compatible script tags)
window.arenaHeader = arenaHeader;
window.arenaTabBar = arenaTabBar;
window.arenaTab = arenaTab;
window.arenaCard = arenaCard;
window.monoLabel = monoLabel;
window.segScale = segScale;
window.arenaTag = arenaTag;
window.arenaBtn = arenaBtn;
window.liveDot = liveDot;
window.arenaDateLabel = arenaDateLabel;
