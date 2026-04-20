import type { PlayerMatchStats, Skill } from '@volleyvision/data-model';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { getSkillLabel } from '../../utils/timelineHelpers';

interface PlayerRadarChartProps {
  stats: PlayerMatchStats;
  teamColor?: string;
}

/**
 * Build radar chart data from player stats
 * Calculate 0-100 scores per skill based on positive actions
 */
function buildRadarData(stats: PlayerMatchStats) {
  const data: Array<{ skill: string; score: number }> = [];

  // Helper to calculate score from distribution
  const calculateScore = (
    skillKey: Skill,
    type: 'ace' | 'positive' | 'kill'
  ): number | null => {
    const dist = stats.bySkill[skillKey];
    if (!dist) return null;

    const total = dist.total;
    if (total === 0) return null;

    const kills = dist['#'] || 0;
    const positive = dist['+'] || 0;

    switch (type) {
      case 'ace':
        // Serve: ace percentage
        return (kills / total) * 100;
      case 'positive':
        // Receive/Dig/Set: positive percentage (# + +)
        return ((kills + positive) / total) * 100;
      case 'kill':
        // Attack/Block: kill percentage
        return (kills / total) * 100;
    }
  };

  // Serve
  const serveScore = calculateScore('serve', 'ace');
  if (serveScore !== null) {
    data.push({ skill: getSkillLabel('serve'), score: serveScore });
  }

  // Receive
  const receiveScore = calculateScore('receive', 'positive');
  if (receiveScore !== null) {
    data.push({ skill: getSkillLabel('receive'), score: receiveScore });
  }

  // Attack
  const attackScore = calculateScore('attack', 'kill');
  if (attackScore !== null) {
    data.push({ skill: getSkillLabel('attack'), score: attackScore });
  }

  // Block
  const blockScore = calculateScore('block', 'kill');
  if (blockScore !== null) {
    data.push({ skill: getSkillLabel('block'), score: blockScore });
  }

  // Dig
  const digScore = calculateScore('dig', 'positive');
  if (digScore !== null) {
    data.push({ skill: getSkillLabel('dig'), score: digScore });
  }

  // Set
  const setScore = calculateScore('set', 'positive');
  if (setScore !== null) {
    data.push({ skill: getSkillLabel('set'), score: setScore });
  }

  return data;
}

/**
 * Recharts radar chart for multi-skill player profile
 */
export function PlayerRadarChart({ stats, teamColor = '#3b82f6' }: PlayerRadarChartProps) {
  const data = buildRadarData(stats);

  if (data.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-8 text-center text-slate-400">
        Pas assez de données pour afficher le profil radar
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-3 text-slate-200">Profil multi-compétence</h3>

      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data}>
          <PolarGrid stroke="#475569" />
          <PolarAngleAxis
            dataKey="skill"
            tick={{ fill: '#cbd5e1', fontSize: 12 }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke={teamColor}
            fill={teamColor}
            fillOpacity={0.6}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
