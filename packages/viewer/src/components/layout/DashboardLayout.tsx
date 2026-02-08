/**
 * @file DashboardLayout.tsx
 * @description Main dashboard layout orchestrator using react-grid-layout
 */

import { ReactNode, useRef, useState, useEffect } from 'react';
import { ResponsiveGridLayout, Layout as RGLLayout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import { useLayoutStore } from '../../store/layoutStore';
import { PanelWrapper } from './PanelWrapper';

interface DashboardLayoutProps {
  renderPanelContent: (panelId: string) => ReactNode;
  onVideoPopOut?: () => void;
}

/**
 * DashboardLayout - Responsive grid layout for dashboard panels
 *
 * Features:
 * - Drag & drop panels by their title bar
 * - Resize panels from bottom-right corner
 * - Responsive breakpoints (lg, md, sm)
 * - Persistent layout in localStorage
 * - Panel visibility toggle
 * - Panel collapse/expand
 *
 * The layout automatically compacts vertically to prevent gaps
 */
export function DashboardLayout({
  renderPanelContent,
  onVideoPopOut,
}: DashboardLayoutProps) {
  const {
    layouts,
    panels,
    setLayouts,
    togglePanelVisibility,
    togglePanelCollapsed,
    resetToDefault,
  } = useLayoutStore();

  // Mesurer la largeur du conteneur pour ResponsiveGridLayout
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(1200);

  useEffect(() => {
    const measureWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };

    measureWidth();
    window.addEventListener('resize', measureWidth);
    return () => window.removeEventListener('resize', measureWidth);
  }, []);

  const handleLayoutChange = (_currentLayout: RGLLayout[], allLayouts: any) => {
    setLayouts(allLayouts);
  };

  return (
    <div className="relative">
      {/* Barre d'outils layout */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle visibilité des panneaux */}
          {panels.map((panel) => (
            <button
              key={panel.id}
              onClick={() => togglePanelVisibility(panel.id)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                panel.visible
                  ? 'bg-slate-700 text-white hover:bg-slate-600'
                  : 'bg-slate-800 text-slate-500 line-through hover:bg-slate-700'
              }`}
              title={`${panel.visible ? 'Masquer' : 'Afficher'} ${panel.title}`}
              type="button"
            >
              {panel.icon} {panel.title}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetToDefault}
            className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Réinitialiser la disposition"
            type="button"
          >
            🔄 Reset layout
          </button>
        </div>
      </div>

      {/* Grid Layout Container */}
      <div ref={containerRef}>
        <ResponsiveGridLayout
          width={width}
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 0 }}
          cols={{ lg: 12, md: 10, sm: 6 }}
          rowHeight={40}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".panel-drag-handle"
          compactType={null}
          isResizable={true}
          isDraggable={true}
          margin={[8, 8]}
          containerPadding={[0, 0]}
        >
          {panels
            .filter((p) => p.visible)
            .map((panel) => (
              <div key={panel.id}>
                <PanelWrapper
                  panelId={panel.id}
                  title={panel.title}
                  icon={panel.icon}
                  collapsed={panel.collapsed}
                  onToggleCollapse={() => togglePanelCollapsed(panel.id)}
                  onPopOut={panel.id === 'video' ? onVideoPopOut : undefined}
                  showPopOut={panel.id === 'video'}
                >
                  {renderPanelContent(panel.id)}
                </PanelWrapper>
              </div>
            ))}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
