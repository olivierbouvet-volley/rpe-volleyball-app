import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useMatchStore } from '../store/matchStore';
import { useFilterStore } from '../store/filterStore';
import { useVideoStore } from '../store/videoStore';
import { useCumulativeStatsStore } from '../store/cumulativeStatsStore';
import { SetSelector } from '../components/SetSelector';
import { PlayerSelector } from '../components/PlayerSelector';
import { StatsTable } from '../components/StatsTable';
import PlayerPage from './PlayerPage';
import { VideoPlayer } from '../components/VideoPlayer';
import { OffsetCalibrator } from '../components/OffsetCalibrator';
import { ActionTimeline } from '../components/ActionTimeline';
import { AdvancedFilters } from '../components/AdvancedFilters';
import { PlaylistPlayer } from '../components/PlaylistPlayer';
import { RotationView } from '../components/RotationView';
import { PlayByPlayChart } from '../components/PlayByPlayChart';
import { SetterDistribution } from '../components/SetterDistribution';
import { GamePlanPanel } from '../components/GamePlanPanel';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import { useLayoutStore } from '../store/layoutStore';
import { filterStats } from '../utils/statsFilter';
import { applyFilters } from '../utils/filterEngine';

/**
 * Scroll container that preserves its scroll position across React re-renders.
 * Prevents the player panel from jumping to top when filterStore updates.
 */
function PlayerPanelScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const savedScroll = useRef(0);

  // Save scroll before any update
  const onScroll = useCallback(() => {
    if (ref.current) savedScroll.current = ref.current.scrollTop;
  }, []);

  // Restore scroll after every render
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = savedScroll.current;
  });

  return (
    <div ref={ref} className="flex-1 overflow-auto" onScroll={onScroll}>
      {children}
    </div>
  );
}

/**
 * Page for analyzing match statistics with modular dashboard layout
 */
export default function AnalysisPage() {
  const { match, stats, clear } = useMatchStore();
  const { criteria, playlistIndex, setPlaylistIndex, playlistTabRequest } = useFilterStore();
  const { seekTo, currentTime, isPlaying, setIsPlaying } = useVideoStore();
  const cumul = useCumulativeStatsStore();
  const [selectedSet, setSelectedSet] = useState<number | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'playlist'>('timeline');

  // Switch to playlist tab when a component requests it (AttackComboTable, GamePlanPanel)
  useEffect(() => {
    if (playlistTabRequest > 0) {
      setActiveTab('playlist');
      useLayoutStore.getState().requestSelectTab('tab-timeline');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistTabRequest]);
  const [rightTab, setRightTab] = useState<'stats' | 'rotation' | 'playbyplay' | 'distribution'>('stats');
  const [playerView, setPlayerView] = useState<string | null>(null);

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

  // Handler pour ouvrir la fiche joueur
  const handlePlayerClick = (playerId: string) => {
    setPlayerView(playerId);
    // Sélectionner l'onglet Fiche Joueur dans FlexLayout
    useLayoutStore.getState().requestSelectTab('tab-player');
  };

  // Render content for each panel
  const renderPanelContent = (panelId: string) => {
    switch (panelId) {
      case 'video':
        return <VideoPlayer />;

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
              >
                🏐 Passeuse
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-auto p-4">
              {rightTab === 'stats' && (() => {
                // ── Mode multi-matchs ──
                if (cumul.isActive) {
                  const teamIds = cumul.selectedTeamForStats
                    ? new Set(cumul.teamPlayerIds[cumul.selectedTeamForStats] ?? [])
                    : null;
                  const cumulStats = teamIds
                    ? cumul.aggregatedStats.filter((s) => teamIds.has(s.playerId))
                    : cumul.aggregatedStats;

                  return (
                    <>
                      {/* Bannière multi-matchs */}
                      <div className="mb-3 px-3 py-2 rounded-lg flex flex-col gap-2"
                        style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--brand-blue)' }}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold" style={{ color: 'var(--brand-blue)' }}>
                            📊 Analyse cumulée — {cumul.matchCount} matchs
                          </span>
                        </div>
                        {/* Sélecteur d'équipe */}
                        <div>
                          <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Équipe à étudier :</p>
                          <div className="flex flex-wrap gap-1.5">
                            {cumul.teamNames.map((name) => (
                              <button
                                key={name}
                                onClick={() => cumul.setSelectedTeamForStats(name)}
                                className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                                style={{
                                  backgroundColor: cumul.selectedTeamForStats === name
                                    ? 'var(--brand-green)' : 'var(--surface-3)',
                                  color: cumul.selectedTeamForStats === name
                                    ? '#fff' : 'var(--text-secondary)',
                                  border: cumul.selectedTeamForStats === name
                                    ? '1px solid var(--brand-green)' : '1px solid var(--border-strong)',
                                }}
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <StatsTable
                        stats={cumulStats}
                        match={match!}
                        playerNameMap={cumul.playerNameMap}
                        playerNumberMap={cumul.playerNumberMap}
                        // Pas de click-through en multi-matchs : les IDs canoniques
                        // ("TeamName|7") ne sont pas résolvables dans PlayerPage
                      />
                    </>
                  );
                }

                // ── Mode match unique ──
                return (
                  <>
                    <h2 className="text-lg font-semibold mb-3">Statistiques des joueurs</h2>
                    <StatsTable stats={filteredStats} match={match!} onPlayerClick={handlePlayerClick} />
                  </>
                );
              })()}
              {rightTab === 'rotation' && <RotationView />}
              {rightTab === 'playbyplay' && (
                <PlayByPlayChart
                  match={match}
                  selectedSet={selectedSet}
                  onRallyClick={(rally) => {
                    if (rally.videoTimestamp != null) {
                      const { offset } = useVideoStore.getState();
                      const ytTime = Math.max(0, rally.videoTimestamp + offset - 2);
                      seekTo(ytTime);
                    }
                  }}
                />
              )}
              {rightTab === 'distribution' && (
                <SetterDistribution />
              )}
            </div>
          </div>
        );

      case 'player':
        return (
          <div className="flex flex-col h-full">
            <div className="p-3 border-b border-slate-700 bg-slate-800 flex-shrink-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold">Fiche Joueur</h2>
                {playerView && (
                  <button
                    onClick={() => setPlayerView(null)}
                    className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition-colors"
                    type="button"
                  >
                    ✕ Fermer
                  </button>
                )}
              </div>
              {/* Sélecteur de joueur */}
              <PlayerSelector
                homePlayers={match.homeTeam.players}
                awayPlayers={match.awayTeam.players}
                selected={playerView}
                onChange={(id) => {
                  setPlayerView(id);
                  if (id) {
                    useLayoutStore.getState().requestSelectTab('tab-player');
                  }
                }}
              />
            </div>
            <PlayerPanelScroll>
              {playerView ? (
                <PlayerPage playerId={playerView} onBack={() => setPlayerView(null)} />
              ) : (
                <div className="p-4 text-slate-400 text-center">
                  Sélectionnez un joueur ci-dessus pour voir sa fiche détaillée
                </div>
              )}
            </PlayerPanelScroll>
          </div>
        );

      case 'gameplan':
        return <GamePlanPanel />;

      default:
        return <div className="p-4 text-slate-400">Panneau inconnu: {panelId}</div>;
    }
  };

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100dvh',
        backgroundColor: 'var(--surface-root)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-2 shrink-0 gap-4"
        style={{
          backgroundColor: 'var(--surface-1)',
          borderBottom: '1px solid var(--surface-border)',
        }}
      >
        {/* Logo */}
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 shrink-0 text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
          title="Retour à la bibliothèque"
        >
          ←
          <span className="hidden md:inline">
            <span style={{ color: 'var(--brand-green)' }}>Volley</span>
            <span style={{ color: 'var(--brand-blue)' }}>Vision</span>
          </span>
        </button>

        {/* Bannière match compacte */}
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {/* Compétition + date */}
          <span className="hidden sm:block text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
            {match.competition && <span className="font-medium" style={{ color: 'var(--brand-green)' }}>{match.competition}</span>}
            {match.date && <span className="ml-1">{new Date(match.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>}
          </span>

          <span className="text-slate-600 hidden sm:block">·</span>

          {/* Score inline */}
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <span className="truncate max-w-[120px]" title={match.homeTeam.name}>{match.homeTeam.name}</span>
            <span className="text-base font-bold tabular-nums" style={{ color: 'var(--brand-green)' }}>{match.result.homeWins}</span>
            <span style={{ color: 'var(--text-secondary)' }}>–</span>
            <span className="text-base font-bold tabular-nums" style={{ color: 'var(--brand-blue)' }}>{match.result.awayWins}</span>
            <span className="truncate max-w-[120px]" title={match.awayTeam.name}>{match.awayTeam.name}</span>
          </div>

          {/* Scores par set */}
          <div className="hidden lg:flex items-center gap-1 ml-1">
            {match.sets.map((s) => (
              <span
                key={s.number}
                className="text-[11px] px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text-secondary)' }}
              >
                {s.homeScore}–{s.awayScore}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Dashboard FlexLayout ── */}
      <div className="flex-1 min-h-0">
        <DashboardLayout renderPanelContent={renderPanelContent} />
      </div>
    </div>
  );
}
