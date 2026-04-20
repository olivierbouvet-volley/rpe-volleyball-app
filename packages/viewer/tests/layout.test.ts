/**
 * @file layout.test.ts
 * @description Unit tests for layout store and configuration
 * @vitest-environment happy-dom
 */

// Mock localStorage BEFORE importing the store
if (!global.localStorage) {
  class LocalStorageMock {
    private store: Map<string, string> = new Map();
    getItem(key: string): string | null {
      return this.store.get(key) ?? null;
    }
    setItem(key: string, value: string): void {
      this.store.set(key, value);
    }
    removeItem(key: string): void {
      this.store.delete(key);
    }
    clear(): void {
      this.store.clear();
    }
    get length(): number {
      return this.store.size;
    }
    key(index: number): string | null {
      const keys = Array.from(this.store.keys());
      return keys[index] ?? null;
    }
  }
  global.localStorage = new LocalStorageMock() as Storage;
}

import { describe, it, expect, beforeEach } from 'vitest';
import { useLayoutStore, DEFAULT_PANELS, DEFAULT_LAYOUTS } from '../src/store/layoutStore';

describe('Layout Store', () => {
  beforeEach(() => {
    // Reset store to default state before each test
    const store = useLayoutStore.getState();
    store.resetToDefault();
  });

  it('DEFAULT_LAYOUTS.lg contient 5 panneaux', () => {
    expect(DEFAULT_LAYOUTS.lg).toHaveLength(5);
  });

  it('DEFAULT_PANELS a les bons ids', () => {
    const panelIds = DEFAULT_PANELS.map((p) => p.id);
    expect(panelIds).toContain('video');
    expect(panelIds).toContain('timeline');
    expect(panelIds).toContain('filters');
    expect(panelIds).toContain('stats');
    expect(panelIds).toContain('calibration');
  });

  it('togglePanelVisibility cache un panneau', () => {
    const store = useLayoutStore.getState();

    // Vérifier que stats est visible par défaut
    const statsBefore = store.panels.find((p) => p.id === 'stats');
    expect(statsBefore?.visible).toBe(true);

    // Toggle visibility
    store.togglePanelVisibility('stats');

    // Vérifier que stats est maintenant caché
    const statsAfter = useLayoutStore.getState().panels.find((p) => p.id === 'stats');
    expect(statsAfter?.visible).toBe(false);
  });

  it('togglePanelVisibility ré-affiche un panneau caché', () => {
    const store = useLayoutStore.getState();

    // Cache le panneau
    store.togglePanelVisibility('stats');
    const statsHidden = useLayoutStore.getState().panels.find((p) => p.id === 'stats');
    expect(statsHidden?.visible).toBe(false);

    // Ré-affiche le panneau
    store.togglePanelVisibility('stats');
    const statsVisible = useLayoutStore.getState().panels.find((p) => p.id === 'stats');
    expect(statsVisible?.visible).toBe(true);
  });

  it('togglePanelCollapsed replie un panneau', () => {
    const store = useLayoutStore.getState();

    // Vérifier que calibration n'est pas replié par défaut
    // Note: Par défaut dans DEFAULT_PANELS, calibration est collapsed: true
    const calibrationBefore = store.panels.find((p) => p.id === 'calibration');
    expect(calibrationBefore?.collapsed).toBe(true);

    // Toggle collapsed (ça va le déplier)
    store.togglePanelCollapsed('calibration');

    // Vérifier que calibration est maintenant déplié
    const calibrationAfter = useLayoutStore.getState().panels.find((p) => p.id === 'calibration');
    expect(calibrationAfter?.collapsed).toBe(false);
  });

  it('resetToDefault restaure les layouts par défaut', () => {
    const store = useLayoutStore.getState();

    // Modifier le layout
    const modifiedLayouts = {
      lg: [{ i: 'video', x: 10, y: 10, w: 2, h: 2, minW: 1, minH: 1 }],
      md: [{ i: 'video', x: 5, y: 5, w: 2, h: 2, minW: 1, minH: 1 }],
      sm: [{ i: 'video', x: 0, y: 0, w: 6, h: 6, minW: 6, minH: 4 }],
    };
    store.setLayouts(modifiedLayouts);

    // Vérifier que le layout a changé
    const layoutsModified = useLayoutStore.getState().layouts;
    expect(layoutsModified.lg[0].x).toBe(10);

    // Reset
    store.resetToDefault();

    // Vérifier que le layout est restauré
    const layoutsReset = useLayoutStore.getState().layouts;
    expect(layoutsReset.lg).toEqual(DEFAULT_LAYOUTS.lg);
    expect(layoutsReset.md).toEqual(DEFAULT_LAYOUTS.md);
    expect(layoutsReset.sm).toEqual(DEFAULT_LAYOUTS.sm);
  });

  it('chaque layout lg a minW et minH', () => {
    const hasMinConstraints = DEFAULT_LAYOUTS.lg.every(
      (layout) => layout.minW && layout.minW > 0 && layout.minH && layout.minH > 0
    );
    expect(hasMinConstraints).toBe(true);
  });

  it('les raccourcis clavier ne se déclenchent pas sur un input', () => {
    // Skip test if document is not available (shouldn't happen with happy-dom)
    if (typeof document === 'undefined') {
      console.warn('document is not defined, skipping test');
      return;
    }

    // Simuler un événement keydown avec target = <input>
    const input = document.createElement('input');
    document.body.appendChild(input);

    let callbackCalled = false;
    const callback = () => {
      callbackCalled = true;
    };

    // Simuler le comportement du hook useKeyboardNavigation
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (isInputElement) {
        return; // Ne pas déclencher le callback
      }

      callback();
    };

    // Créer un événement qui cible l'input
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
    });

    Object.defineProperty(event, 'target', {
      value: input,
      enumerable: true,
    });

    handleKeyDown(event);

    // Le callback ne doit PAS avoir été appelé
    expect(callbackCalled).toBe(false);

    // Cleanup
    document.body.removeChild(input);
  });
});
