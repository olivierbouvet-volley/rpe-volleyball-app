import { useState, useMemo, useCallback } from 'react';
import { useMatchStore } from '../store/matchStore';
import { useFilterStore } from '../store/filterStore';
import { useVideoStore } from '../store/videoStore';
import { ScoreBoard } from '../components/ScoreBoard';
import { SetSelector } from '../components/SetSelector';
import { PlayerSelector } from '../components/PlayerSelector';
import { StatsTable } from '../components/StatsTable';
import { VideoPlayer } from '../components/VideoPlayer';
import { OffsetCalibrator } from '../components/OffsetCalibrator';
import { ActionTimeline } from '../components/ActionTimeline';
import { AdvancedFilters } from '../components/AdvancedFilters';
import { PlaylistPlayer } from '../components/PlaylistPlayer';
import { RotationView } from '../components/RotationView';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { usePopOutWindow } from '../hooks/usePopOutWindow';
import { filterStats } from '../utils/statsFilter';
import { applyFilters } from '../utils/filterEngine';
import '../styles/grid-layout.css';

/**
 * Page for analyzing match statistics with modular dashboard layout
 */
export default function AnalysisPage() {
  const { match, stats, clear } = useMatchStore();
  const { criteria, playlistIndex, setPlaylistIndex } = useFilterStore();
  const { seekTo, currentTime, isPlaying, setIsPlaying } = useVideoStore();
  const [selectedSet, setSelectedSet] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'playlist'>('timeline');
  const [rightTab, setRightTab] = useState<'stats' | 'rotation' | 'playbyplay' | 'distribution'>('stats');

  // Pop-out window for video
  const { popOutRef, popOut } = usePopOutWindow({
    title: 'VolleyVision - Video Player',
    width: 1280,
    height: 720,
  });

  // Filter stats based on selections
  const filteredStats = useMemo(
    () => filterStats(stats, selectedSet, selectedPlayer),
    [stats, selectedSet, selectedPlayer]
  );

  // Compute filtered actions for playlist mode
  const filteredActions = useMemo(() => {
    if (!match) return [];

    // Appliquer les filtres avancés
    let results = applyFilters(match, criteria);

    // Appliquer aussi les filtres Set/Joueur pour cohérence avec les stats
    if (selectedSet !== null) {
      results = results.filter((fa) => fa.setNumber === selectedSet);
    }
    if (selectedPlayer !== null) {
      results = results.filter((fa) => fa.action.player.id === selectedPlayer);
    }

    return results;
  }, [match, criteria, selectedSet, selectedPlayer]);

  // Keyboard navigation handlers
  const handlePrev = useCallback(() => {
    if (playlistIndex > 0) {
      setPlaylistIndex(playlistIndex - 1);
    }
  }, [playlistIndex, setPlaylistIndex]);

  const handleNext = useCallback(() => {
    if (playlistIndex < filteredActions.length - 1) {
      setPlaylistIndex(playlistIndex + 1);
    }
  }, [playlistIndex, filteredActions.length, setPlaylistIndex]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying, setIsPlaying]);

  const handleSeekBack = useCallback(() => {
    seekTo(Math.max(0, currentTime - 5));
  }, [currentTime, seekTo]);

  const handleSeekForward = useCallback(() => {
    seekTo(currentTime + 5);
  }, [currentTime, seekTo]);

  // Enable keyboard navigation only in playlist mode
  useKeyboardNavigation({
    enabled: activeTab === 'playlist' && filteredActions.length > 0,
    onPrev: handlePrev,
    onNext: handleNext,
    onPlayPause: handlePlayPause,
    onSeekBack: handleSeekBack,
    onSeekForward: handleSeekForward,
  });

  if (!match) {
    return null; // Shouldn't happen due to App.tsx routing, but TypeScript safety
  }

  const handleClear = () => {
    if (confirm('Clear current match and import a new file?')) {
      clear();
    }
  };

  // Render content for each panel
  const renderPanelContent = (panelId: string) => {
    switch (panelId) {
      case 'video':
        return (
          <div ref={popOutRef} className="h-full">
            <VideoPlayer />
          </div>
        );

      case 'calibration':
        return <OffsetCalibrator />;

      case 'timeline':
        return (
          <div className="flex flex-col h-full">
            {/* Tab selector */}
            <div className="flex gap-1 bg-slate-800 p-1 border-b border-slate-700">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 px-3 py-2 rounded text-sm transition-colors font-medium ${
                  activeTab === 'timeline'
                    ? 'bg-primary-blue text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                type="button"
              >
                ⏱ Timeline
              </button>
              <button
                onClick={() => setActiveTab('playlist')}
                className={`flex-1 px-3 py-2 rounded text-sm transition-colors font-medium ${
                  activeTab === 'playlist'
                    ? 'bg-primary-blue text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                type="button"
              >
                📋 Playlist ({filteredActions.length})
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto">
              {activeTab === 'timeline' && (
                <ActionTimeline match={match} selectedSet={selectedSet} />
              )}
              {activeTab === 'playlist' && filteredActions.length > 0 && (
                <PlaylistPlayer
                  items={filteredActions}
                  isActive={true}
                  currentIndex={playlistIndex}
                  onIndexChange={setPlaylistIndex}
                />
              )}
              {activeTab === 'playlist' && filteredActions.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">
                  Aucune action filtrée. Ajustez les filtres pour créer une playlist.
                </div>
              )}
            </div>
          </div>
        );

      case 'filters':
        return (
          <div className="flex flex-col gap-3 p-3">
            <AdvancedFilters match={match} resultCount={filteredActions.length} />

            {/* Filtres Set/Joueur */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
              <div className="flex flex-col gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Set</label>
                  <SetSelector
                    sets={match.sets}
                    selected={selectedSet}
                    onChange={setSelectedSet}
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Joueur</label>
                  <PlayerSelector
                    homePlayers={match.homeTeam.players}
                    awayPlayers={match.awayTeam.players}
                    selected={selectedPlayer}
                    onChange={setSelectedPlayer}
                  />
                </div>
                {(selectedSet !== null || selectedPlayer !== null) && (
                  <button
                    onClick={() => {
                      setSelectedSet(null);
                      setSelectedPlayer(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-xs font-medium transition-colors"
                    type="button"
                  >
                    🗑 Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>
        );

      case 'stats':
        return (
          <div className="flex flex-col h-full">
            {/* Tab selector for analysis views */}
            <div className="flex gap-1 bg-slate-800 p-1 border-b border-slate-700">
              <button
                onClick={() => setRightTab('stats')}
                className={`flex-1 px-3 py-2 rounded text-sm transition-colors font-medium ${
                  rightTab === 'stats'
                    ? 'bg-primary-blue text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                type="button"
              >
                📊 Stats
              </button>
              <button
                onClick={() => setRightTab('rotation')}
                className={`flex-1 px-3 py-2 rounded text-sm transition-colors font-medium ${
                  rightTab === 'rotation'
                    ? 'bg-primary-blue text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                type="button"
              >
                🏟️ Rotation
              </button>
              <button
                onClick={() => setRightTab('playbyplay')}
                className={`flex-1 px-3 py-2 rounded text-sm transition-colors font-medium ${
                  rightTab === 'playbyplay'
                    ? 'bg-primary-blue text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                type="button"
                disabled
                title="À venir dans PROMPT 2E"
              >
                📈 Play-by-Play
              </button>
              <button
                onClick={() => setRightTab('distribution')}
                className={`flex-1 px-3 py-2 rounded text-sm transition-colors font-medium ${
                  rightTab === 'distribution'
                    ? 'bg-primary-blue text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
                type="button"
                disabled
                title="À venir dans PROMPT 2F"
              >
                🏐 Passeuse
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-4">
              {rightTab === 'stats' && (
                <>
                  <h2 className="text-lg font-semibold mb-3">Statistiques des joueurs</h2>
                  <StatsTable stats={filteredStats} match={match} />
                </>
              )}
              {rightTab === 'rotation' && <RotationView />}
              {rightTab === 'playbyplay' && (
                <div className="text-center text-slate-400 py-8">
                  📈 Vue Play-by-Play — À venir dans PROMPT 2E
                </div>
              )}
              {rightTab === 'distribution' && (
                <div className="text-center text-slate-400 py-8">
                  🏐 Distribution passeuse — À venir dans PROMPT 2F
                </div>
              )}
            </div>
          </div>
        );

      default:
        return <div className="p-4 text-slate-400">Panneau inconnu: {panelId}</div>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with app name */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          <span className="text-primary-green">Volley</span>
          <span className="text-primary-blue">Vision</span>
        </h1>
        <button
          onClick={handleClear}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded font-medium transition-colors"
          type="button"
        >
          ← Import New File
        </button>
      </div>

      {/* ScoreBoard */}
      <ScoreBoard match={match} />

      {/* Dashboard modulaire */}
      <div className="mt-6">
        <DashboardLayout renderPanelContent={renderPanelContent} onVideoPopOut={popOut} />
      </div>
    </div>
  );
}
