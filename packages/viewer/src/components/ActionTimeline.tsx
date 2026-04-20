/**
 * @file ActionTimeline.tsx
 * @description Interactive timeline of match actions with video synchronization
 */

import { useState, useRef, useEffect, useMemo, memo, useCallback } from 'react';
import type { Match, Rally, Action, Skill } from '@volleyvision/data-model';
import { useVideoStore } from '../store/videoStore';
import { useTeamColorStore } from '../store/teamColorStore';
import {
  SKILL_FILTERS,
  getSkillIcon,
  getSkillLabel,
  getQualityColorClass,
  isActionInTimeRange,
  isRallyInTimeRange,
  getRalliesForSet,
} from '../utils/timelineHelpers';
import { formatVideoTime, dvwToYouTubeTime } from '../utils/videoHelpers';

interface ActionTimelineProps {
  match: Match;
  selectedSet?: number | null;
  onActionClick?: (action: Action, rally: Rally) => void;
  className?: string;
}

interface RallyRowProps {
  rally: Rally;
  isActive: boolean;
  onActionClick?: (action: Action, rally: Rally) => void;
  activeSkills: Set<Skill>;
  offset: number;
  currentTime: number;
  onSeekToRally: (rally: Rally) => void;
  homeTeamName: string;
  awayTeamName: string;
  homeTeamCode: string;
  awayTeamCode: string;
  homeColor: string;
  awayColor: string;
}

interface ActionChipProps {
  action: Action;
  isCurrentAction: boolean;
  onClick: () => void;
}

/**
 * ActionChip - Clickable chip representing a single action
 */
const ActionChip = memo(({ action, isCurrentAction, onClick }: ActionChipProps) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium
        transition-all cursor-pointer
        ${getQualityColorClass(action.quality)}
        ${isCurrentAction ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100 hover:scale-105'}
      `}
      title={`${getSkillLabel(action.skill)} — #${action.player.number} — ${action.quality}`}
    >
      <span>{getSkillIcon(action.skill)}</span>
      <span>#{action.player.number}</span>
    </button>
  );
});

ActionChip.displayName = 'ActionChip';

/**
 * RallyRow - Row displaying a single rally with its actions
 */
const RallyRow = memo(
  ({
    rally,
    isActive,
    onActionClick,
    activeSkills,
    offset,
    currentTime,
    onSeekToRally,
    homeTeamName,
    awayTeamName,
    homeTeamCode,
    awayTeamCode,
    homeColor,
    awayColor,
  }: RallyRowProps) => {
    const filteredActions = useMemo(
      () => rally.actions.filter((a) => activeSkills.has(a.skill)),
      [rally.actions, activeSkills]
    );

    const handleActionClick = useCallback(
      (action: Action) => {
        onActionClick?.(action, rally);
      },
      [onActionClick, rally]
    );

    const isActionCurrent = useCallback(
      (action: Action) => {
        return isActionInTimeRange(action, currentTime, offset, 2);
      },
      [currentTime, offset]
    );

    return (
      <div
        className={`rounded px-2 py-1.5 transition-colors ${
          isActive
            ? 'bg-slate-700/80 ring-1 ring-blue-500'
            : 'hover:bg-slate-700/40'
        }`}
      >
        {/* Rally header */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
          <span className="font-mono tabular-nums">
            {rally.homeScoreAfter}-{rally.awayScoreAfter}
          </span>
          <span className="text-slate-600">•</span>
          <span>S{rally.setNumber}</span>
          <span className="inline-flex items-center gap-1 font-bold" title={rally.pointWinner === 'home' ? homeTeamName : awayTeamName}>
            <span
              className="inline-block w-3 h-3 rounded-sm border border-slate-500"
              style={{ backgroundColor: rally.pointWinner === 'home' ? homeColor : awayColor }}
            />
            <span style={{ color: rally.pointWinner === 'home' ? homeColor : awayColor }}>
              {rally.pointWinner === 'home' ? homeTeamCode : awayTeamCode}
            </span>
          </span>
          <span className={`font-mono ${rally.servingTeam === 'home' ? 'text-yellow-400' : 'text-slate-400'}`} title={rally.servingTeam === 'home' ? 'Équipe domicile au service' : 'Équipe domicile en réception'}>
            *{rally.servingTeam === 'home' ? 'S' : 'R'}{rally.rotation?.home}
          </span>
          <span className="text-slate-600">/</span>
          <span className={`font-mono ${rally.servingTeam === 'away' ? 'text-yellow-400' : 'text-slate-400'}`} title={rally.servingTeam === 'away' ? 'Équipe adverse au service' : 'Équipe adverse en réception'}>
            a{rally.servingTeam === 'away' ? 'S' : 'R'}{rally.rotation?.away}
          </span>
          {rally.videoTimestamp != null && (
            <>
              <span className="text-slate-600">•</span>
              <button
                onClick={() => onSeekToRally(rally)}
                className="text-blue-400 hover:text-blue-300 hover:underline cursor-pointer transition-colors"
              >
                {formatVideoTime(dvwToYouTubeTime(rally.videoTimestamp, offset))}
              </button>
            </>
          )}
        </div>

        {/* Actions chips */}
        <div className="flex flex-wrap gap-1">
          {filteredActions.map((action) => (
            <ActionChip
              key={action.id}
              action={action}
              isCurrentAction={isActionCurrent(action)}
              onClick={() => handleActionClick(action)}
            />
          ))}
        </div>
      </div>
    );
  }
);

RallyRow.displayName = 'RallyRow';

/**
 * ActionTimeline - Main timeline component
 */
export function ActionTimeline({
  match,
  selectedSet = null,
  onActionClick,
  className = '',
}: ActionTimelineProps) {
  const { currentTime, offset, seekTo } = useVideoStore();
  const { homeColor, awayColor } = useTeamColorStore();
  const timelineRef = useRef<HTMLDivElement>(null);
  const [activeSkills, setActiveSkills] = useState<Set<Skill>>(
    new Set(SKILL_FILTERS.map((f) => f.skill))
  );
  const [userScrolling, setUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const lastActiveRallyRef = useRef<string | null>(null);

  // Get filtered rallies based on selected set
  const rallies = useMemo(
    () => getRalliesForSet(match, selectedSet),
    [match, selectedSet]
  );

  // Toggle skill filter
  const toggleSkillFilter = useCallback((skill: Skill) => {
    setActiveSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) {
        next.delete(skill);
        // If all are unchecked, reactivate all
        if (next.size === 0) {
          return new Set(SKILL_FILTERS.map((f) => f.skill));
        }
      } else {
        next.add(skill);
      }
      return next;
    });
  }, []);

  // Handle seeking to a rally
  const handleSeekToRally = useCallback(
    (rally: Rally) => {
      if (rally.videoTimestamp != null) {
        const ytTime = dvwToYouTubeTime(rally.videoTimestamp, offset);
        // Jump 2 seconds before the rally to see context
        seekTo(Math.max(0, ytTime - 2));

        // Disable auto-scroll for 5 seconds after manual seek
        setUserScrolling(true);
        if (scrollTimeoutRef.current !== null) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = window.setTimeout(() => {
          setUserScrolling(false);
        }, 5000);
      }
    },
    [offset, seekTo]
  );

  // Handle action click - jump to action with 2s lead time
  const handleActionClick = useCallback(
    (action: Action, rally: Rally) => {
      if (action.videoTimestamp != null) {
        const ytTime = dvwToYouTubeTime(action.videoTimestamp, offset);
        // Jump 2 seconds before the action to see context
        seekTo(Math.max(0, ytTime - 2));

        // Disable auto-scroll for 5 seconds after clicking an action
        setUserScrolling(true);
        if (scrollTimeoutRef.current !== null) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = window.setTimeout(() => {
          setUserScrolling(false);
        }, 5000);
      }
      onActionClick?.(action, rally);
    },
    [offset, seekTo, onActionClick]
  );

  // Detect user scrolling
  const handleScroll = useCallback(() => {
    setUserScrolling(true);
    if (scrollTimeoutRef.current !== null) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      setUserScrolling(false);
    }, 1500);
  }, []);

  // Auto-scroll to active rally (DISABLED - too intrusive)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useEffect(() => {
    // Disabled to prevent unwanted scrolling
    return;
  }, [rallies, currentTime, offset, userScrolling]);

  // Cleanup scroll timeout
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current !== null) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`bg-slate-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header with skill filters */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-slate-300">Timeline des actions</h3>
        <div className="flex gap-1">
          {SKILL_FILTERS.map((sf) => (
            <button
              key={sf.skill}
              onClick={() => toggleSkillFilter(sf.skill)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                activeSkills.has(sf.skill)
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
              title={sf.label}
            >
              {sf.icon}<span className="ml-0.5">{sf.shortcut}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline - scrollable list of rallies */}
      <div
        ref={timelineRef}
        onScroll={handleScroll}
        className="max-h-[400px] overflow-y-auto px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
      >
        {rallies.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            Aucun rally à afficher
          </div>
        ) : (
          rallies.map((rally) => (
            <div key={rally.id} data-rally-id={rally.id}>
              <RallyRow
                rally={rally}
                isActive={isRallyInTimeRange(rally, currentTime, offset)}
                onActionClick={handleActionClick}
                activeSkills={activeSkills}
                offset={offset}
                currentTime={currentTime}
                onSeekToRally={handleSeekToRally}
                homeTeamName={match.homeTeam.name}
                awayTeamName={match.awayTeam.name}
                homeTeamCode={match.homeTeam.code || match.homeTeam.name.substring(0, 3).toUpperCase()}
                awayTeamCode={match.awayTeam.code || match.awayTeam.name.substring(0, 3).toUpperCase()}
                homeColor={homeColor}
                awayColor={awayColor}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
