/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Surfaces (tokens CSS → classes Tailwind sémantiques) ──
        surface: {
          root:    'var(--surface-root)',
          1:       'var(--surface-1)',
          2:       'var(--surface-2)',
          3:       'var(--surface-3)',
          4:       'var(--surface-4)',
          border:  'var(--surface-border)',
          divider: 'var(--surface-divider)',
        },
        // ── Brand ──
        brand: {
          green:       'var(--brand-green)',
          'green-dim': 'var(--brand-green-dim)',
          blue:        'var(--brand-blue)',
          'blue-dim':  'var(--brand-blue-dim)',
        },
        // ── Aliases rétrocompatibles (existant → brand tokens) ──
        'primary-green': 'var(--brand-green)',
        'primary-blue':  'var(--brand-blue)',
        // ── Texte ──
        content: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          disabled:  'var(--text-disabled)',
          link:      'var(--text-link)',
        },
        // ── Qualité volleyball ──
        // CORRECTION: positive était lime-500 (#84cc16), unifié sur blue-400 (#60A5FA)
        quality: {
          kill:     'var(--q-kill)',      // # — Excellent / Ace
          positive: 'var(--q-positive)', // + — Positif (blue-400, non lime)
          neutral:  'var(--q-neutral)',  // ! — Neutre
          negative: 'var(--q-negative)', // - — Négatif
          poor:     'var(--q-poor)',     // / — Mauvais
          error:    'var(--q-error)',    // = — Erreur
        },
        // ── États sémantiques ──
        state: {
          success: 'var(--state-success)',
          warning: 'var(--state-warning)',
          error:   'var(--state-error)',
          info:    'var(--state-info)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontVariantNumeric: {
        tabular: 'tabular-nums',
      },
      boxShadow: {
        sm:          'var(--shadow-sm)',
        md:          'var(--shadow-md)',
        lg:          'var(--shadow-lg)',
        xl:          'var(--shadow-xl)',
        'glow-green': 'var(--shadow-glow-green)',
        'glow-blue':  'var(--shadow-glow-blue)',
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },
    },
  },
  plugins: [],
}
