/**
 * @file PanelWrapper.tsx
 * @description Universal container for dashboard panels with collapse/expand and pop-out capabilities
 */

import { ReactNode } from 'react';

interface PanelWrapperProps {
  panelId: string;
  title: string;
  icon: string;
  children: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onPopOut?: () => void; // Seulement pour le panneau vidéo
  showPopOut?: boolean;
  className?: string;
}

/**
 * PanelWrapper - Wraps each dashboard panel with a draggable title bar and controls
 *
 * Features:
 * - Draggable via title bar (handled by react-grid-layout)
 * - Collapse/expand to show/hide content
 * - Pop-out to separate window (video panel only)
 * - Consistent styling and behavior across all panels
 */
export function PanelWrapper({
  panelId,
  title,
  icon,
  children,
  collapsed = false,
  onToggleCollapse,
  onPopOut,
  showPopOut = false,
  className = '',
}: PanelWrapperProps) {
  return (
    <div className={`bg-slate-800 rounded-lg overflow-hidden h-full flex flex-col ${className}`}>
      {/* Barre de titre toujours visible, sert de poignée de drag */}
      <div
        className="panel-drag-handle flex items-center justify-between px-3 py-2
                   bg-slate-700/50 border-b border-slate-600 cursor-grab active:cursor-grabbing
                   select-none"
      >
        <div className="flex items-center gap-2 text-sm">
          <span>{icon}</span>
          <span className="font-semibold text-slate-300">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Bouton pop-out (vidéo seulement) */}
          {showPopOut && (
            <button
              onClick={onPopOut}
              className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
              title="Détacher dans une fenêtre séparée"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          )}
          {/* Bouton collapse/expand */}
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white transition-colors"
            title={collapsed ? 'Déplier' : 'Replier'}
            type="button"
          >
            {collapsed ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Contenu masqué si collapsed */}
      {!collapsed && (
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      )}
    </div>
  );
}
