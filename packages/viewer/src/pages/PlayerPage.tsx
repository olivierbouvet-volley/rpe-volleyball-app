import { useState, useMemo } from 'react';
import type { Skill } from '@volleyvision/data-model';
import { useMatchStore } from '../store/matchStore';
import { useVideoStore } from '../store/videoStore';
import { useFilterStore, DEFAULT_CRITERIA } from '../store/filterStore';
import { useTeamColorStore } from '../store/teamColorStore';
import { getPlayer, formatDate } from '../utils/formatters';
import { applyFilters } from '../utils/filterEngine';
import { buildPlaylistExport, exportAsJSON, sanitizeFilename } from '../utils/exportPlaylist';
import { captureElementAsImage, generatePlayerShareURL, getPositionLabel, getEfficiencyColor } from '../utils/shareHelpers';
import { MetricCard } from '../components/player/MetricCard';
import { SkillCard } from '../components/player/SkillCard';
import { PlayerRadarChart } from '../components/player/PlayerRadarChart';
import { BySetTable } from '../components/player/BySetTable';
import { AttackComboTable } from '../components/player/AttackComboTable';
import { HighlightRow } from '../components/player/HighlightRow';

interface PlayerPageProps {
  playerId: string;
  onBack: () => void;
}

/**
 * Main player page component showing detailed stats and highlights
 */
export default function PlayerPage({ playerId, onBack }: PlayerPageProps) {
  const { match, stats } = useMatchStore();
  const { videoId, offset, seekTo } = useVideoStore();
  const { preRollSeconds, postRollSeconds } = useFilterStore();
  const { homeColor, awayColor } = useTeamColorStore();

  const [highlightSkill, setHighlightSkill] = useState<Skill | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Get player data
  const playerStats = stats.find(s => s.playerId === playerId);
  const player = getPlayer(playerId, match!);
  const teamSide = playerId.startsWith('home') ? 'home' : 'away';
  const teamColor = teamSide === 'home' ? homeColor : awayColor;
  const team = teamSide === 'home' ? match!.homeTeam : match!.awayTeam;

  // Error handling
  if (!playerStats || !player) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 text-center">
          <p className="text-red-400 font-medium">Joueur introuvable</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // Compute highlights
  const highlights = useMemo(() => {
    const criteria = {
      ...DEFAULT_CRITERIA,
      playerIds: [playerId],
      skills: highlightSkill ? [highlightSkill] : [],
      hasVideoTimestamp: videoId !== null,
    };
    return applyFilters(match!, criteria);
  }, [match, playerId, highlightSkill, videoId]);

  // Handlers
  const handlePlayHighlight = (item: typeof highlights[0]) => {
    if (!videoId) return;

    const timestamp = item.action.videoTimestamp ?? item.estimatedTimestamp;
    if (!timestamp) return;

    const startTime = item.sequenceStart
      ? Math.max(0, item.sequenceStart + offset)
      : Math.max(0, timestamp + offset - preRollSeconds);

    seekTo(startTime);
  };

  const handleShareImage = async () => {
    try {
      const filename = sanitizeFilename(`${player.firstName}_${player.lastName}_stats`);
      await captureElementAsImage('player-card', filename);
    } catch (error) {
      alert('Erreur lors de l\'export de l\'image');
      console.error(error);
    }
  };

  const handleShareLink = () => {
    const url = generatePlayerShareURL(playerId);
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {
      alert('Erreur lors de la copie du lien');
    });
  };

  const handleExportHighlights = () => {
    if (!videoId || highlights.length === 0) return;

    const playlist = buildPlaylistExport(
      match!,
      highlights,
      videoId,
      offset,
      preRollSeconds,
      postRollSeconds,
      `Highlights ${player.firstName} ${player.lastName}`
    );

    exportAsJSON(playlist);
  };

  // Get skills with data
  const skillsWithData = Object.entries(playerStats.bySkill)
    .filter(([_, dist]) => Object.values(dist).reduce((sum, count) => sum + count, 0) > 0)
    .map(([skill]) => skill as Skill);

  // Handler pour filtrer la playlist par compétence
  const handleSkillClick = (skill: Skill) => {
    if (!videoId) return;

    const { criteria, setCriteria, togglePlaylistMode, isPlaylistMode } = useFilterStore.getState();

    // Si on clique sur la même compétence, on désactive le filtre
    const isAlreadyFiltered = criteria.skills.length === 1 && criteria.skills[0] === skill
                              && criteria.playerIds.length === 1 && criteria.playerIds[0] === playerId;

    if (isAlreadyFiltered) {
      // Réinitialiser aux critères par défaut
      setCriteria({ ...DEFAULT_CRITERIA, hasVideoTimestamp: true });
      setHighlightSkill(null);
    } else {
      // Activer le filtre pour cette compétence + ce joueur
      setCriteria({
        ...DEFAULT_CRITERIA,
        skills: [skill],
        playerIds: [playerId],
        hasVideoTimestamp: true,
      });
      setHighlightSkill(skill);

      // Activer le mode playlist si pas déjà actif
      if (!isPlaylistMode) {
        togglePlaylistMode();
      }
    }
  };

  // Handler pour filtrer toutes les actions du joueur
  const handleShowAllActions = () => {
    if (!videoId) return;

    const { setCriteria, togglePlaylistMode, isPlaylistMode } = useFilterStore.getState();

    // Réinitialiser tous les critères et filtrer seulement ce joueur
    setCriteria({
      ...DEFAULT_CRITERIA,
      playerIds: [playerId],
      hasVideoTimestamp: true,
    });

    // Activer le mode playlist si pas déjà actif
    if (!isPlaylistMode) {
      togglePlaylistMode();
    }
  };

  // Handler pour filtrer seulement les kills du joueur
  const handleShowKills = () => {
    if (!videoId) return;

    const { setCriteria, togglePlaylistMode, isPlaylistMode } = useFilterStore.getState();

    // Réinitialiser tous les critères et filtrer kills de ce joueur
    setCriteria({
      ...DEFAULT_CRITERIA,
      playerIds: [playerId],
      qualities: ['#'],
      hasVideoTimestamp: true,
    });

    // Activer le mode playlist si pas déjà actif
    if (!isPlaylistMode) {
      togglePlaylistMode();
    }
  };

  // Handler pour filtrer les actions par set
  const handleSetClick = (setNumber: number) => {
    if (!videoId) return;

    const { setCriteria, togglePlaylistMode, isPlaylistMode } = useFilterStore.getState();

    // Réinitialiser tous les critères et filtrer ce joueur + ce set
    setCriteria({
      ...DEFAULT_CRITERIA,
      playerIds: [playerId],
      setNumbers: [setNumber],
      hasVideoTimestamp: true,
    });

    // Activer le mode playlist si pas déjà actif
    if (!isPlaylistMode) {
      togglePlaylistMode();
    }
  };

  return (
    <div className="px-3 py-3 space-y-3">
      {/* Player card */}
      <div id="player-card" className="bg-slate-800 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: teamColor }}>
            #{player.number}
          </span>
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-100 leading-tight">
              {player.firstName} {player.lastName} - {team.name}
            </h1>
            <p className="text-xs text-slate-400 leading-tight">
              {match!.homeTeam.name} vs {match!.awayTeam.name} - {formatDate(match!.date)}
            </p>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-2">
        <MetricCard
          label="Actions"
          value={playerStats.overall.totalActions}
          icon="📊"
          onClick={videoId ? handleShowAllActions : undefined}
        />
        <MetricCard
          label="Efficacité"
          value={(playerStats.overall.efficiency * 100).toFixed(0) + '%'}
          icon="⚡"
          color={getEfficiencyColor(playerStats.overall.efficiency)}
        />
        <MetricCard
          label="Kills"
          value={playerStats.overall.kills}
          icon="🔥"
          onClick={videoId ? handleShowKills : undefined}
        />
      </div>

      {/* Stats by skill */}
      <div className="space-y-1.5">
        <h2 className="text-base font-bold text-slate-200">Statistiques par compétence</h2>
        {skillsWithData.map(skill => {
          const skillStats = playerStats.bySkill[skill];
          if (!skillStats) return null;

          const total = skillStats.total;
          const kills = skillStats['#'] || 0;
          const errors = skillStats['='] || 0;
          const efficiency = total > 0 ? (kills - errors) / total : 0;

          return (
            <SkillCard
              key={skill}
              skill={skill}
              distribution={skillStats}
              efficiency={efficiency}
              onClick={() => handleSkillClick(skill)}
            />
          );
        })}
      </div>

      {/* Radar chart */}
      <PlayerRadarChart stats={playerStats} teamColor={teamColor} />

      {/* Performance by set */}
      <BySetTable
        stats={playerStats}
        sets={match!.sets}
        onActionsClick={videoId ? handleSetClick : undefined}
      />

      {/* Attack combos */}
      {playerStats.attackByCombo && Object.keys(playerStats.attackByCombo).length > 0 && (
        <AttackComboTable
          combos={playerStats.attackByCombo}
          attackCombinations={match!.dvwMetadata?.attackCombinations as Record<string, string> | undefined}
        />
      )}

      {/* Highlights section (only if video is associated) */}
      {videoId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-200">
              Highlights vidéo
              {highlightSkill && (
                <span className="ml-2 text-sm text-slate-400">
                  (filtrés)
                </span>
              )}
            </h2>
            {highlightSkill && (
              <button
                onClick={() => setHighlightSkill(null)}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Voir tout
              </button>
            )}
          </div>

          {highlights.length > 0 ? (
            <div className="bg-slate-800 rounded-lg p-3 space-y-1 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
              {highlights.map((item, i) => (
                <HighlightRow
                  key={item.action.id}
                  index={i}
                  item={item}
                  onClick={() => handlePlayHighlight(item)}
                />
              ))}
            </div>
          ) : (
            <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
              Aucun highlight disponible
              {highlightSkill && ' pour cette compétence'}
            </div>
          )}

          {highlights.length > 0 && (
            <button
              onClick={handleExportHighlights}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium transition-colors"
            >
              🎬 Exporter les highlights ({highlights.length})
            </button>
          )}
        </div>
      )}

      {/* Share buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleShareImage}
          className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-500 rounded font-medium transition-colors"
        >
          📸 Exporter image
        </button>
        <button
          onClick={handleShareLink}
          className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded font-medium transition-colors relative"
        >
          {linkCopied ? '✓ Copié !' : '🔗 Partager lien'}
        </button>
      </div>
    </div>
  );
}
