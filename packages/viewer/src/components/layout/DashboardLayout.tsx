/**
 * @file DashboardLayout.tsx
 * @description Layout FlexLayout-React avec drag & drop, resize, tabs et presets
 * Remplace react-grid-layout (v3)
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Layout, Model, Actions } from 'flexlayout-react';
import type { TabNode, IJsonModel } from 'flexlayout-react';
import 'flexlayout-react/style/dark.css';
import '../../styles/flexlayout-theme.css';

import { useLayoutStore } from '../../store/layoutStore';
import { LayoutPresetBar } from './LayoutPresetBar';
import { SaveLayoutModal } from './SaveLayoutModal';

interface DashboardLayoutProps {
  renderPanelContent: (panelId: string) => ReactNode;
  /** Prop conservé pour compatibilité — pop-out géré dans VideoPlayer (étape 9) */
  onVideoPopOut?: () => void;
}

/**
 * DashboardLayout — layout dockable VS Code-style
 *
 * Fonctionnalités :
 * - Drag & drop des panneaux (header de l'onglet)
 * - Resize des panneaux (séparateur)
 * - Tabs multiples dans chaque zone
 * - 4 presets intégrés + presets utilisateur nommés
 * - Persisté en localStorage via layoutStore
 * - requestSelectTab : permet à l'extérieur de sélectionner un panneau
 */
export function DashboardLayout({ renderPanelContent }: DashboardLayoutProps) {
  const {
    modelJson,
    modelVersion,
    setModelJson,
    pendingTabSelect,
    clearPendingTabSelect,
  } = useLayoutStore();

  // Modèle FlexLayout en state local — recréé à chaque changement de preset
  const [model, setModel] = useState<Model>(() => Model.fromJson(modelJson));
  const prevVersionRef = useRef(modelVersion);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [currentModelJson, setCurrentModelJson] = useState<IJsonModel>(modelJson);

  // ── Recréer le model quand un preset est appliqué ──
  useEffect(() => {
    if (modelVersion !== prevVersionRef.current) {
      prevVersionRef.current = modelVersion;
      const newModel = Model.fromJson(modelJson);
      setModel(newModel);
      setCurrentModelJson(modelJson);
    }
  }, [modelVersion, modelJson]);

  // ── Sélectionner un onglet demandé depuis l'extérieur ──
  useEffect(() => {
    if (pendingTabSelect) {
      try {
        model.doAction(Actions.selectTab(pendingTabSelect));
        setModel(Model.fromJson(model.toJson() as IJsonModel));
      } catch {
        // Tab introuvable dans le layout courant
      }
      clearPendingTabSelect();
    }
  }, [pendingTabSelect, model, clearPendingTabSelect]);

  // ── Factory : rendu du contenu de chaque onglet ──
  const factory = (node: TabNode): ReactNode => {
    const component = node.getComponent() ?? '';
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        {renderPanelContent(component)}
      </div>
    );
  };

  // ── Callback FlexLayout : sauvegarde le modèle après chaque interaction ──
  const handleModelChange = (updatedModel: Model) => {
    const json = updatedModel.toJson() as IJsonModel;
    setCurrentModelJson(json);
    setModelJson(json);
    // Forcer le re-render en cas de mutation (FlexLayout mutate en place)
    setModel(updatedModel);
  };

  return (
    <div
      className="flex flex-col"
      style={{ height: '100%', backgroundColor: 'var(--surface-root)' }}
    >
      {/* Barre de presets */}
      <LayoutPresetBar onSave={() => setSaveModalOpen(true)} />

      {/* Zone FlexLayout */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <Layout
          model={model}
          factory={factory}
          onModelChange={handleModelChange}
          realtimeResize
        />
      </div>

      {/* Modal sauvegarder preset */}
      {saveModalOpen && (
        <SaveLayoutModal
          modelJson={currentModelJson}
          onClose={() => setSaveModalOpen(false)}
        />
      )}
    </div>
  );
}


