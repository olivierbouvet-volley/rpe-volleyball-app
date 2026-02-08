/**
 * @file usePopOutWindow.ts
 * @description Hook for detaching content into a separate window (e.g., second screen)
 */

import { useRef, useCallback, useEffect } from 'react';
import { useLayoutStore } from '../store/layoutStore';

interface UsePopOutWindowOptions {
  title?: string;
  width?: number;
  height?: number;
  onClose?: () => void;
}

interface UsePopOutWindowReturn {
  popOutRef: React.RefObject<HTMLDivElement>; // Ref du contenu à déplacer
  isPopOut: boolean;
  popOut: () => void;
  popIn: () => void;
}

/**
 * usePopOutWindow - Detach content into a separate browser window
 *
 * Use case: Display video on a second screen (projector/TV) while keeping
 * timeline and controls on the laptop screen.
 *
 * How it works:
 * 1. Opens a new browser window
 * 2. Copies CSS styles from parent window
 * 3. Moves the DOM node to the new window
 * 4. Automatically restores content when child window closes
 *
 * Communication between windows happens via Zustand stores (shared JS instance)
 * YouTube IFrame API continues to work after DOM move
 */
export function usePopOutWindow({
  title = 'VolleyVision - Video Player',
  width = 1280,
  height = 720,
  onClose,
}: UsePopOutWindowOptions = {}): UsePopOutWindowReturn {
  const popOutRef = useRef<HTMLDivElement>(null);
  const popOutWindowRef = useRef<Window | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const { isVideoDetached, setVideoDetached } = useLayoutStore();

  const popIn = useCallback(() => {
    if (!popOutWindowRef.current || !popOutRef.current) return;

    try {
      // Récupérer le node depuis la fenêtre enfant
      const node = popOutRef.current;

      // Le remettre dans le DOM parent (à sa position originale)
      if (containerRef.current) {
        containerRef.current.appendChild(node);
      }

      // Fermer la fenêtre enfant
      popOutWindowRef.current.close();
      popOutWindowRef.current = null;

      // Update store
      setVideoDetached(false);

      // Callback
      onClose?.();
    } catch (error) {
      console.error('[usePopOutWindow] Error during popIn:', error);
    }
  }, [setVideoDetached, onClose]);

  const popOut = useCallback(() => {
    if (!popOutRef.current) {
      console.warn('[usePopOutWindow] popOutRef.current is null');
      return;
    }

    try {
      // Stocker le conteneur parent pour pouvoir y remettre le node plus tard
      containerRef.current = popOutRef.current.parentElement;

      // Ouvrir une nouvelle fenêtre
      const newWindow = window.open(
        '',
        title,
        `width=${width},height=${height},menubar=no,toolbar=no,location=no,status=no`
      );

      if (!newWindow) {
        console.error('[usePopOutWindow] Failed to open new window (popup blocked?)');
        return;
      }

      popOutWindowRef.current = newWindow;

      // Copier les styles CSS du document parent dans la fenêtre enfant
      const parentDoc = document;
      const childDoc = newWindow.document;

      childDoc.title = title;

      // Copier les <link> et <style> tags
      Array.from(parentDoc.styleSheets).forEach((styleSheet) => {
        try {
          if (styleSheet.href) {
            // External stylesheet
            const link = childDoc.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            childDoc.head.appendChild(link);
          } else if (styleSheet.ownerNode) {
            // Inline <style>
            const style = styleSheet.ownerNode.cloneNode(true);
            childDoc.head.appendChild(style);
          }
        } catch (e) {
          // CORS errors pour certains stylesheets externes
          console.warn('[usePopOutWindow] Could not copy stylesheet:', e);
        }
      });

      // Créer un conteneur dans la nouvelle fenêtre
      childDoc.body.style.margin = '0';
      childDoc.body.style.padding = '0';
      childDoc.body.style.overflow = 'hidden';
      childDoc.body.style.backgroundColor = '#0f172a'; // slate-900

      // Déplacer le DOM node dans la nouvelle fenêtre
      childDoc.body.appendChild(popOutRef.current);

      // Écouter la fermeture de la fenêtre pour auto popIn
      newWindow.addEventListener('beforeunload', () => {
        popIn();
      });

      // Update store
      setVideoDetached(true);
    } catch (error) {
      console.error('[usePopOutWindow] Error during popOut:', error);
    }
  }, [title, width, height, popIn, setVideoDetached]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (popOutWindowRef.current) {
        popIn();
      }
    };
  }, [popIn]);

  return {
    popOutRef,
    isPopOut: isVideoDetached,
    popOut,
    popIn,
  };
}
