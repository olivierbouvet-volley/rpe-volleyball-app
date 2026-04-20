/**
 * @file PlayByPlayChart.tsx
 * @description Play-by-Play chart showing score difference curve over time
 *
 * Visualizes the score gap between teams point by point,
 * highlighting runs and allowing click-to-seek on the video.
 */

import { useMemo, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Dot,
} from 'recharts';
import type { Match, Rally } from '@volleyvision/data-model';
import {
  buildPlayByPlayData,
  findLongestRuns,
  calculateLeadStats,
  getSetSeparators,
  formatRallyTooltip,
  type PlayByPlayPoint,
} from '../utils/playByPlayHelpers';
import { formatVideoTime, dvwToYouTubeTime } from '../utils/videoHelpers';
import { useVideoStore } from '../store/videoStore';
import { useTeamColorStore } from '../store/teamColorStore';

interface PlayByPlayChartProps {
  match: Match;
  selectedSet?: number | null;
  onRallyClick?: (rally: Rally) => void;
  className?: string;
}

/**
 * Custom dot renderer for the chart.
 * Shows larger dots for runs and colored by point winner.
 */
function CustomDot(props: any) {
  const { cx, cy, payload, homeColor, awayColor } = props;
  if (!payload) return null;

  const point = payload as PlayByPlayPoint;
  const color = point.pointWinner === 'home' ? homeColor : awayColor;
  const radius = point.isRun ? 5 : 3;
  const strokeWidth = point.isRun ? 2 : 0;
  const stroke = point.isRun ? '#fbbf24' : 'none';

  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={color}
      stroke={stroke}
      strokeWidth={strokeWidth}
      style={{ cursor: 'pointer' }}
    />
  );
}

/**
 * Custom tooltip for hover info
 */
function CustomTooltip({ active, payload, homeTeamName, awayTeamName, homeColor, awayColor }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload as PlayByPlayPoint;
  const offset = useVideoStore.getState().offset;
  const hasVideo = point.rally.videoTimestamp != null;

  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
      <div className="font-semibold text-slate-200 mb-1">
        Set {point.setNumber} — Rally #{point.rally.rallyNumber}
      </div>
      <div className="text-slate-300">
        <span style={{ color: homeColor }}>{homeTeamName}</span>{' '}
        <span className="font-bold">{point.homeScore}</span>
        {' - '}
        <span className="font-bold">{point.awayScore}</span>{' '}
        <span style={{ color: awayColor }}>{awayTeamName}</span>
      </div>
      <div className="text-slate-400 mt-1">
        Service: {point.servingTeam === 'home' ? homeTeamName : awayTeamName}
      </div>
      {point.isRun && (
        <div className="text-amber-400 mt-1 font-semibold">
          🔥 Run de {point.runLength} points
        </div>
      )}
      <div className="text-slate-500 mt-1">
        Écart: {point.scoreDiff > 0 ? '+' : ''}{point.scoreDiff}
      </div>
      {hasVideo && (
        <div className="text-blue-400 mt-1">
          🎬 {formatVideoTime(dvwToYouTubeTime(point.rally.videoTimestamp!, offset))} — Cliquer pour lire
        </div>
      )}
    </div>
  );
}

/**
 * PlayByPlayChart — Score difference curve point by point
 */
export function PlayByPlayChart({
  match,
  selectedSet,
  onRallyClick,
  className = '',
}: PlayByPlayChartProps) {
  const [hoveredSet, setHoveredSet] = useState<number | null>(null);
  const { homeColor, awayColor } = useTeamColorStore();

  // Build all play-by-play data
  const allData = useMemo(() => buildPlayByPlayData(match), [match]);

  // Filter by selected set
  const data = useMemo(() => {
    if (selectedSet === null || selectedSet === undefined) return allData;
    return allData.filter(p => p.setNumber === selectedSet);
  }, [allData, selectedSet]);

  // Set separators (vertical lines between sets)
  const separators = useMemo(() => getSetSeparators(data), [data]);

  // Timeouts with their chart positions
  const timeoutMarkers = useMemo(() => {
    const allTimeouts = match.sets.flatMap(s =>
      ((s as any).timeouts || []).map((t: any) => ({ ...t, setNumber: s.number }))
    );
    
    // Filter by selected set if applicable
    const filteredTimeouts = selectedSet !== null && selectedSet !== undefined
      ? allTimeouts.filter(t => t.setNumber === selectedSet)
      : allTimeouts;

    // Find the index in data for each timeout
    const markers = filteredTimeouts.map(timeout => {
      const index = data.findIndex(p => 
        p.setNumber === timeout.setNumber &&
        p.homeScore === timeout.homeScore &&
        p.awayScore === timeout.awayScore
      );
      return { ...timeout, index };
    }).filter(t => t.index >= 0); // Only keep timeouts found in data

    return markers;
  }, [match.sets, data, selectedSet]);

  // Longest runs
  const longestRuns = useMemo(() => findLongestRuns(allData), [allData]);

  // Lead stats
  const leadStats = useMemo(() => calculateLeadStats(allData), [allData]);

  // Set filter buttons
  const availableSets = useMemo(
    () => [...new Set(allData.map(p => p.setNumber))].sort(),
    [allData]
  );

  // Y-axis bounds (symmetric around 0)
  const yMax = useMemo(() => {
    const maxDiff = Math.max(...data.map(p => Math.abs(p.scoreDiff)), 1);
    return maxDiff + 1;
  }, [data]);

  // Handle chart click
  const handleClick = useCallback(
    (e: any) => {
      // Recharts doesn't always provide activePayload, but provides activeIndex
      if (e?.activeIndex !== undefined && onRallyClick) {
        const index = typeof e.activeIndex === 'string' ? parseInt(e.activeIndex, 10) : e.activeIndex;
        const point = data[index];
        if (point) {
          onRallyClick(point.rally);
        }
      }
    },
    [onRallyClick, data]
  );

  if (data.length === 0) {
    return (
      <div className={`bg-slate-800 rounded-lg p-6 text-center text-slate-400 ${className}`}>
        Aucune donnée de score disponible
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Set filter buttons */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 font-medium">Set :</span>
        <div className="flex gap-1">
          <button
            onClick={() => setHoveredSet(null)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              (selectedSet === null || selectedSet === undefined)
                ? 'bg-primary-blue text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            type="button"
          >
            Tous
          </button>
          {availableSets.map(s => (
            <button
              key={s}
              onClick={() => setHoveredSet(s)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                selectedSet === s
                  ? 'bg-primary-blue text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
              type="button"
            >
              Set {s}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-slate-800 rounded-lg p-3">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart
            data={data}
            onClick={handleClick}
            margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
            style={{ cursor: 'pointer' }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              vertical={false}
            />

            <XAxis
              dataKey="rallyIndex"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              label={{
                value: 'Points',
                position: 'insideBottom',
                offset: -5,
                style: { fontSize: 11, fill: '#94a3b8' },
              }}
            />

            <YAxis
              domain={[-yMax, yMax]}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              label={{
                value: 'Écart',
                angle: -90,
                position: 'insideLeft',
                style: { fontSize: 11, fill: '#94a3b8' },
              }}
            />

            {/* Zero line */}
            <ReferenceLine
              y={0}
              stroke="#94a3b8"
              strokeWidth={1}
              strokeDasharray="6 3"
            />

            {/* Set separators */}
            {separators.slice(1).map(sep => (
              <ReferenceLine
                key={`sep-${sep.setNumber}`}
                x={sep.index}
                stroke="#64748b"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `Set ${sep.setNumber}`,
                  position: 'top',
                  style: { fontSize: 10, fill: '#94a3b8' },
                }}
              />
            ))}

            {/* Timeout markers */}
            {timeoutMarkers.map((timeout, i) => (
              <ReferenceLine
                key={`timeout-${i}`}
                x={timeout.index}
                stroke="#f59e0b"
                strokeWidth={3}
                strokeDasharray="none"
                label={{
                  value: 'TO',
                  position: 'top',
                  offset: 10,
                  style: { 
                    fontSize: 11, 
                    fontWeight: 'bold',
                    fill: '#f59e0b',
                    backgroundColor: '#1e293b',
                    padding: '2px 4px',
                  },
                }}
              />
            ))}

            <Tooltip
              content={
                <CustomTooltip
                  homeTeamName={match.homeTeam.name}
                  awayTeamName={match.awayTeam.name}
                  homeColor={homeColor}
                  awayColor={awayColor}
                />
              }
            />

            {/* Positive area (home leads) */}
            <Area
              type="monotone"
              dataKey={(d: PlayByPlayPoint) => (d.scoreDiff > 0 ? d.scoreDiff : 0)}
              stroke="none"
              fill={`${homeColor}20`}
              isAnimationActive={false}
            />

            {/* Negative area (away leads) */}
            <Area
              type="monotone"
              dataKey={(d: PlayByPlayPoint) => (d.scoreDiff < 0 ? d.scoreDiff : 0)}
              stroke="none"
              fill={`${awayColor}20`}
              isAnimationActive={false}
            />

            {/* Main line */}
            <Area
              type="monotone"
              dataKey="scoreDiff"
              stroke="#60a5fa"
              strokeWidth={2}
              fill="none"
              dot={<CustomDot homeColor={homeColor} awayColor={awayColor} />}
              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {/* Longest run home */}
        <div className="bg-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Plus long run {match.homeTeam.name}</div>
          {longestRuns.home ? (
            <div className="text-sm">
              <span className="font-bold" style={{ color: homeColor }}>{longestRuns.home.length} points</span>
              <span className="text-slate-400 text-xs ml-2">
                ({longestRuns.home.startScore.home}-{longestRuns.home.startScore.away} →{' '}
                {longestRuns.home.endScore.home}-{longestRuns.home.endScore.away}, Set{' '}
                {longestRuns.home.setNumber})
              </span>
            </div>
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </div>

        {/* Longest run away */}
        <div className="bg-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Plus long run {match.awayTeam.name}</div>
          {longestRuns.away ? (
            <div className="text-sm">
              <span className="font-bold" style={{ color: awayColor }}>{longestRuns.away.length} points</span>
              <span className="text-slate-400 text-xs ml-2">
                ({longestRuns.away.startScore.home}-{longestRuns.away.startScore.away} →{' '}
                {longestRuns.away.endScore.home}-{longestRuns.away.endScore.away}, Set{' '}
                {longestRuns.away.setNumber})
              </span>
            </div>
          ) : (
            <div className="text-sm text-slate-500">—</div>
          )}
        </div>

        {/* Lead stats */}
        <div className="bg-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Temps en tête</div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-bold" style={{ color: homeColor }}>{leadStats.homeLeadPercent}%</span>
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="flex h-full">
                <div
                  className="h-full"
                  style={{ width: `${leadStats.homeLeadPercent}%`, backgroundColor: homeColor }}
                />
                <div
                  className="bg-slate-500 h-full"
                  style={{ width: `${leadStats.tiedPercent}%` }}
                />
                <div
                  className="h-full"
                  style={{ width: `${leadStats.awayLeadPercent}%`, backgroundColor: awayColor }}
                />
              </div>
            </div>
            <span className="font-bold" style={{ color: awayColor }}>{leadStats.awayLeadPercent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
