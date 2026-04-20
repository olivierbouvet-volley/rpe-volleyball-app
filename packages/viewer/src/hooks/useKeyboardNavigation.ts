/**
 * @file useKeyboardNavigation.ts
 * @description Hook for keyboard navigation in playlist mode
 */

import { useEffect } from 'react';

interface UseKeyboardNavigationOptions {
  enabled: boolean; // Actif seulement en mode playlist
  onPrev: () => void; // Flèche gauche ←
  onNext: () => void; // Flèche droite →
  onPlayPause: () => void; // Espace
  onSeekBack: () => void; // Shift + ← (recul 5s)
  onSeekForward: () => void; // Shift + → (avance 5s)
}

/**
 * useKeyboardNavigation - Adds keyboard shortcuts for playlist navigation
 *
 * Shortcuts:
 * - Arrow Left: Previous item
 * - Arrow Right: Next item
 * - Space: Play/Pause
 * - Shift + Arrow Left: Seek back 5s
 * - Shift + Arrow Right: Seek forward 5s
 *
 * Automatically disabled when focus is on text input elements
 * Works even when video is detached to a separate window
 */
export function useKeyboardNavigation({
  enabled,
  onPrev,
  onNext,
  onPlayPause,
  onSeekBack,
  onSeekForward,
}: UseKeyboardNavigationOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore events when focus is on text inputs
      const target = e.target as HTMLElement;
      const isInputElement =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      if (isInputElement) return;

      // Handle keyboard shortcuts
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            onSeekBack();
          } else {
            onPrev();
          }
          break;

        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            onSeekForward();
          } else {
            onNext();
          }
          break;

        case ' ': // Space
          e.preventDefault(); // Prevent page scroll
          onPlayPause();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onPrev, onNext, onPlayPause, onSeekBack, onSeekForward]);
}
