import { useMemo, useCallback, useState } from 'react';
import { useMatchStore } from '../store/matchStore';
import { useVideoStore } from '../store/videoStore';
import { useFilterStore, DEFAULT_CRITERIA } from '../store/filterStore';
import { useTeamColorStore } from '../store/teamColorStore';
import { VideoPlayer } from '../components/VideoPlayer';
import { SkillCard } from '../components/player/SkillCard';
import { getPlayer, getPlayerName, getPlayerNumber, formatDate } from '../utils/formatters';
import { getSkillIcon, getSkillLabel, getQualityColorClass } from '../utils/timelineHelpers';
import { applyFilters } from '../utils/filterEngine';
import { formatEfficiency } from '../utils/formatters';
import { getEfficiencyColor } from '../utils/shareHelpers';
import type { FilteredAction } from '../utils/filterEngine';
import type { Skill } from '@volleyvision/data-model';

interface SharePlayerViewProps {
  playerId: string;
}

/**
 * Shareable player view optimized for social media
 * Layout: Info on left, video on right (responsive)
 */
export default function SharePlayerView({ playerId }: SharePlayerViewProps) {
  const { match, stats } = useMatchStore();
  const { videoId, offset, seekTo } = useVideoStore();
  const { preRollSeconds, postRollSeconds, selectedActionIds, toggleActionSelection } = useFilterStore();
  const { homeColor, awayColor } = useTeamColorStore();

  // View mode: 'actions' or 'skills'
  const [viewMode, setViewMode] = useState<'actions' | 'skills'>('actions');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">
            <span className="text-primary-green">Volley</span>
            <span className="text-primary-blue">Vision</span>
          </h1>
          <p className="text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  const playerStats = stats.find(s => s.playerId === playerId);
  const player = getPlayer(playerId, match);
  const playerName = getPlayerName(playerId, match);
  const playerNumber = getPlayerNumber(playerId, match);

  if (!playerStats || !player) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">
            <span className="text-primary-green">Volley</span>
            <span className="text-primary-blue">Vision</span>
          </h1>
          <p className="text-slate-400">Joueur non trouvé</p>
        </div>
      </div>
    );
  }

  const teamSide = playerId.startsWith('home') ? 'home' : 'away';
  const teamName = teamSide === 'home' ? match.homeTeam.name : match.awayTeam.name;
  const teamColor = teamSide === 'home' ? homeColor : awayColor;

  // Get all player highlights
  const allHighlights = useMemo(() => {
    const criteria = {
      ...DEFAULT_CRITERIA,
      playerIds: [playerId],
      skills: selectedSkill ? [selectedSkill] : [],
      hasVideoTimestamp: true,
    };
    return applyFilters(match, criteria);
  }, [match, playerId, selectedSkill]);

  // Filter to only selected highlights (if any selected, otherwise show all)
  const selectedHighlights = useMemo(() => {
    if (selectedActionIds.size === 0) {
      return allHighlights;
    }
    return allHighlights.filter(item => selectedActionIds.has(item.action.id));
  }, [allHighlights, selectedActionIds]);

  // Get available skills with data
  const availableSkills = useMemo(() => {
    const skills: Skill[] = ['serve', 'receive', 'set', 'attack', 'block', 'dig', 'freeball'];
    return skills.filter(skill => {
      const skillStats = playerStats?.bySkill[skill];
      return skillStats && skillStats.total > 0;
    });
  }, [playerStats]);

  // Handle highlight click
  const handleHighlightClick = useCallback((item: FilteredAction) => {
    const timestamp = item.action.videoTimestamp ?? item.estimatedTimestamp;
    if (timestamp != null) {
      const startTime = item.sequenceStart
        ? Math.max(0, item.sequenceStart + offset)
        : Math.max(0, timestamp + offset - preRollSeconds);
      seekTo(startTime);
    }
  }, [offset, preRollSeconds, seekTo]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3">
        <h1 className="text-xl font-bold text-center">
          <span className="text-primary-green">Volley</span>
          <span className="text-primary-blue">Vision</span>
        </h1>
      </div>

      {/* Main content: 2-column layout on desktop, stacked on mobile */}
      <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)]">
        {/* LEFT COLUMN: Player Info & Highlights */}
        <div className="w-full lg:w-1/3 xl:w-1/4 flex flex-col border-r border-slate-700 overflow-hidden">
          {/* Player Card */}
          <div className="bg-slate-800 p-4 border-b border-slate-700 flex-shrink-0">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ backgroundColor: teamColor }}
              >
                #{playerNumber}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold">{playerName}</h2>
                <p className="text-sm text-slate-300">{teamName}</p>
              </div>
            </div>
            <div className="text-xs text-slate-400">
              {match.homeTeam.name} vs {match.awayTeam.name} • {formatDate(match.date)}
            </div>
          </div>

          {/* Key Stats */}
          <div className="bg-slate-800 p-4 border-b border-slate-700 flex-shrink-0">
            <div className="grid grid-cols-3 gap-3">
              {/* Actions */}
              <div className="bg-slate-900 rounded-lg p-2 text-center">
                <div className="text-xs text-slate-400 mb-1">Actions</div>
                <div className="text-xl font-bold text-white">
                  {playerStats.overall.totalActions}
                </div>
              </div>

              {/* Efficiency */}
              <div className="bg-slate-900 rounded-lg p-2 text-center">
                <div className="text-xs text-slate-400 mb-1">Efficacité</div>
                <div className={`text-xl font-bold ${getEfficiencyColor(playerStats.overall.efficiency)}`}>
                  {formatEfficiency(playerStats.overall.efficiency)}
                </div>
              </div>

              {/* Kills */}
              <div className="bg-slate-900 rounded-lg p-2 text-center">
                <div className="text-xs text-slate-400 mb-1">Kills</div>
                <div className="text-xl font-bold text-green-500">
                  {playerStats.overall.kills}
                </div>
              </div>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex gap-1 p-3 bg-slate-800 border-b border-slate-700 flex-shrink-0">
            <button
              onClick={() => {
                setViewMode('actions');
                setSelectedSkill(null);
              }}
              className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                viewMode === 'actions'
                  ? 'bg-primary-blue text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              📋 Actions
            </button>
            <button
              onClick={() => setViewMode('skills')}
              className={`flex-1 px-3 py-2 rounded text-xs font-medium transition-colors ${
                viewMode === 'skills'
                  ? 'bg-primary-blue text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              📊 Compétences
            </button>
          </div>

          {/* Content based on view mode */}
          <div className="flex-1 overflow-y-auto p-4">
            {viewMode === 'skills' ? (
              <>
                <h3 className="text-sm font-semibold mb-3 text-slate-300">
                  Statistiques par compétence
                </h3>
                <div className="space-y-2">
                  {availableSkills.map(skill => {
                    const skillStats = playerStats!.bySkill[skill];
                    if (!skillStats) return null;

                    const { total = 0, perfect = 0, error = 0 } = skillStats;
                    const kills = perfect;
                    const errors = error;
                    const efficiency = total > 0 ? (kills - errors) / total : 0;

                    return (
                      <SkillCard
                        key={skill}
                        skill={skill}
                        distribution={skillStats}
                        efficiency={efficiency}
                        onClick={() => {
                          setViewMode('actions');
                          setSelectedSkill(skill);
                        }}
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300">
                    Actions ({allHighlights.length})
                    {selectedSkill && (
                      <span className="ml-2 text-xs text-slate-400">
                        • {getSkillLabel(selectedSkill)}
                      </span>
                    )}
                  </h3>
                  {selectedSkill && (
                    <button
                      onClick={() => setSelectedSkill(null)}
                      className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      ✕ Tout
                    </button>
                  )}
                </div>

                {allHighlights.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">
                    Aucune action disponible
                  </p>
                )}

                <div className="space-y-1">
                  {allHighlights.map((item, i) => {
                    const isSelected = selectedActionIds.has(item.action.id);
                    return (
                      <div
                        key={item.action.id}
                        className="w-full bg-slate-800 rounded-lg p-2 flex items-center gap-2 hover:bg-slate-700 transition-colors"
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleActionSelection(item.action.id);
                          }}
                          className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-primary-blue focus:ring-1 focus:ring-primary-blue cursor-pointer"
                          title={isSelected ? "Désélectionner" : "Sélectionner"}
                        />

                        {/* Clickable action button */}
                        <button
                          onClick={() => handleHighlightClick(item)}
                          className="flex-1 flex items-center gap-2 text-left"
                        >
                          {/* Index */}
                          <span className="text-xs text-slate-500 font-mono w-6 text-center">
                            {i + 1}
                          </span>

                          {/* Quality badge */}
                          <span className={`${getQualityColorClass(item.action.quality)} px-1.5 py-0.5 rounded font-bold text-xs`}>
                            {item.action.quality}
                          </span>

                          {/* Skill */}
                          <span className="text-sm">{getSkillIcon(item.action.skill)}</span>
                          <span className="text-xs text-slate-300 flex-1">
                            {getSkillLabel(item.action.skill)}
                          </span>

                          {/* Time */}
                          <span className="text-xs text-slate-500">
                            {item.matchTime}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Video Player */}
        <div className="flex-1 bg-black flex items-center justify-center">
          {videoId ? (
            <div className="w-full h-full">
              <VideoPlayer />
            </div>
          ) : (
            <div className="text-center p-8">
              <p className="text-slate-400 mb-2">Aucune vidéo associée</p>
              <p className="text-sm text-slate-500">
                Associez une vidéo YouTube pour voir les actions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
