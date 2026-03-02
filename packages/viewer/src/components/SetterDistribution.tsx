/**
 * @file SetterDistribution.tsx
 * @description Analyse visuelle de la distribution du setter (passeuse)
 *
 * Affiche un terrain SVG avec flèches de distribution + table récapitulative
 * Filtrable par set, rotation, qualité de réception
 */

import { useMemo, useState } from 'react';
import { useMatchStore } from '../store/matchStore';
import type { Match, TeamSide } from '@volleyvision/data-model';
import {
  analyzeSetterDistribution,
  getSetterCallLabel,
  getZoneLabel,
  getZoneShortLabel,
  getEfficiencyColor,
  getArrowThickness,
  type SetterDistributionData,
  type ZoneDistribution,
} from '../utils/setterAnalysis';

interface SetterDistributionProps {
  className?: string;
}

/**
 * Zone coordinates for the SVG court diagram (viewBox: 360×260)
 */
const ZONE_POSITIONS: Record<number, { cx: number; cy: number }> = {
  4: { cx: 66, cy: 70 },
  3: { cx: 180, cy: 70 },
  2: { cx: 294, cy: 70 },
  5: { cx: 66, cy: 190 },
  6: { cx: 180, cy: 190 },
  1: { cx: 294, cy: 190 },
  8: { cx: 180, cy: 210 },  // Pipe — overlapping Z6 lower
};

/**
 * SetterDistribution — Vue distribution passeuse avec terrain SVG + table
 */
export function SetterDistribution({ className = '' }: SetterDistributionProps) {
  const { match } = useMatchStore();
  const [teamSide, setTeamSide] = useState<TeamSide>('home');
  const [setFilter, setSetFilter] = useState<number | undefined>(undefined);
  const [rotationFilter, setRotationFilter] = useState<number | undefined>(undefined);
  const [recQualityFilter, setRecQualityFilter] = useState<string | undefined>(undefined);
  const [recZoneFilter, setRecZoneFilter] = useState<number | undefined>(undefined);

  // Compute distribution data
  const data = useMemo(() => {
    if (!match) return null;
    return analyzeSetterDistribution(match, {
      teamSide,
      setFilter,
      rotationFilter,
      receptionQualityFilter: recQualityFilter,
      receptionZoneFilter: recZoneFilter,
    });
  }, [match, teamSide, setFilter, rotationFilter, recQualityFilter, recZoneFilter]);

  if (!match) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        Aucun match chargé
      </div>
    );
  }

  const availableSets = match.sets.map(s => s.number);
  const hasData = data && data.totalSets > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Filtres */}
      <div className="bg-slate-800 rounded-lg p-3">
        <div className="flex flex-wrap gap-3">
          {/* Team selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Équipe</label>
            <select
              value={teamSide}
              onChange={e => setTeamSide(e.target.value as TeamSide)}
              className="bg-slate-700 text-slate-200 rounded px-2 py-1 text-xs border border-slate-600"
            >
              <option value="home">{match.homeTeam.name}</option>
              <option value="away">{match.awayTeam.name}</option>
            </select>
          </div>

          {/* Set filter */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Set</label>
            <select
              value={setFilter ?? ''}
              onChange={e => setSetFilter(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-slate-700 text-slate-200 rounded px-2 py-1 text-xs border border-slate-600"
            >
              <option value="">Tous</option>
              {availableSets.map(s => (
                <option key={s} value={s}>Set {s}</option>
              ))}
            </select>
          </div>

          {/* Rotation filter */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Rotation</label>
            <select
              value={rotationFilter ?? ''}
              onChange={e => setRotationFilter(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-slate-700 text-slate-200 rounded px-2 py-1 text-xs border border-slate-600"
            >
              <option value="">Toutes</option>
              {[1, 2, 3, 4, 5, 6].map(r => (
                <option key={r} value={r}>R{r}</option>
              ))}
            </select>
          </div>

          {/* Reception quality filter */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Réception</label>
            <select
              value={recQualityFilter ?? ''}
              onChange={e => setRecQualityFilter(e.target.value || undefined)}
              className="bg-slate-700 text-slate-200 rounded px-2 py-1 text-xs border border-slate-600"
            >
              <option value="">Toutes</option>
              <option value="#"># Parfaite</option>
              <option value="+">+ Bonne</option>
              <option value="!">! Moyenne</option>
              <option value="-">- Mauvaise</option>
            </select>
          </div>

          {/* Reception zone filter */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Zone réception</label>
            <select
              value={recZoneFilter ?? ''}
              onChange={e => setRecZoneFilter(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-slate-700 text-slate-200 rounded px-2 py-1 text-xs border border-slate-600"
            >
              <option value="">Toutes</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(z => (
                <option key={z} value={z}>Zone {z}</option>
              ))}
            </select>
          </div>

          {/* Total count badge */}
          <div className="flex items-end">
            <span className={`text-xs font-bold px-3 py-1 rounded ${
              hasData ? 'bg-primary-blue text-white' : 'bg-slate-700 text-slate-400'
            }`}>
              {data?.totalSets ?? 0} attaques
            </span>
          </div>
        </div>
      </div>

      {/* Court diagram with distribution arrows */}
      <div className="bg-slate-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-3">
          Distribution {teamSide === 'home' ? match.homeTeam.name : match.awayTeam.name}
        </h3>
        {hasData ? (
          <CourtDistributionDiagram data={data} />
        ) : (
          <div className="flex items-center justify-center h-64 text-slate-400">
            <div className="text-center">
              <p>Aucune donnée de distribution disponible</p>
              <p className="text-xs mt-1">Vérifiez les filtres ou les données du match</p>
            </div>
          </div>
        )}
      </div>

      {/* Distribution table */}
      {hasData && (
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Détail par zone
          </h3>
          <DistributionTable data={data} />
        </div>
      )}

      {/* Distribution by reception quality */}
      {hasData && data.byReceptionQuality.size > 0 && (
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">
            Distribution par qualité de réception
          </h3>
          <ReceptionQualityTable data={data} />
        </div>
      )}
    </div>
  );
}

/**
 * SVG Court diagram with distribution arrows
 */
function CourtDistributionDiagram({ data }: { data: SetterDistributionData }) {
  const zones = Array.from(data.byZone.values()).sort((a, b) => b.percentage - a.percentage);

  // Setter position in top-right corner of zone 3
  const setterPos = { cx: 225, cy: 50 };

  console.log('[SetterDistribution] Zones found:', zones.map(z => ({ zone: z.zone, count: z.count, percentage: z.percentage })));

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 360 260" className="w-full max-w-md">
        {/* Court background */}
        <rect x="5" y="5" width="350" height="250" fill="#1e293b" rx="8" stroke="#475569" strokeWidth="1" />

        {/* Net line */}
        <line x1="10" y1="130" x2="350" y2="130" stroke="#94a3b8" strokeWidth="3" strokeDasharray="8 4" />
        <text x="180" y="126" textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">
          FILET
        </text>

        {/* Zone rectangles (front) */}
        <rect x="10" y="15" width="113" height="110" fill="#1e293b" stroke="#334155" strokeWidth="1" rx="4" />
        <rect x="123" y="15" width="114" height="110" fill="#1e293b" stroke="#334155" strokeWidth="1" rx="4" />
        <rect x="237" y="15" width="113" height="110" fill="#1e293b" stroke="#334155" strokeWidth="1" rx="4" />
        {/* Zone rectangles (back) */}
        <rect x="10" y="135" width="113" height="115" fill="#1e293b" stroke="#334155" strokeWidth="1" rx="4" />
        <rect x="123" y="135" width="114" height="115" fill="#1e293b" stroke="#334155" strokeWidth="1" rx="4" />
        <rect x="237" y="135" width="113" height="115" fill="#1e293b" stroke="#334155" strokeWidth="1" rx="4" />

        {/* Zone labels in background */}
        {[1, 2, 3, 4, 5, 6].map(zone => {
          const pos = ZONE_POSITIONS[zone];
          return (
            <text
              key={`label-${zone}`}
              x={pos.cx}
              y={zone <= 4 && zone >= 2 ? pos.cy - 35 : pos.cy - 35}
              textAnchor="middle"
              fill="#334155"
              fontSize="24"
              fontWeight="bold"
            >
              {zone}
            </text>
          );
        })}

        {/* Arrows from setter (Z3) to each zone */}
        <defs>
          <marker id="dist-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#60a5fa" />
          </marker>
        </defs>

        {zones.map(zone => {
          const toPos = ZONE_POSITIONS[zone.zone];
          if (!toPos || zone.zone === 3) return null; // Don't draw arrow to self (setter)

          const thickness = getArrowThickness(zone.percentage);
          const color = getEfficiencyColor(zone.attackEfficiency);

          // Shorten arrow to not overlap with zone circle
          const dx = toPos.cx - setterPos.cx;
          const dy = toPos.cy - setterPos.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const offset = 30;
          const x1 = setterPos.cx + (dx / dist) * 25;
          const y1 = setterPos.cy + (dy / dist) * 25;
          const x2 = toPos.cx - (dx / dist) * offset;
          const y2 = toPos.cy - (dy / dist) * offset;

          return (
            <line
              key={`arrow-${zone.zone}`}
              x1={x1} y1={y1}
              x2={x2} y2={y2}
              stroke={color}
              strokeWidth={thickness}
              markerEnd="url(#dist-arrow)"
              opacity={0.8}
            />
          );
        })}

        {/* Zone data circles */}
        {zones.map(zone => {
          const pos = ZONE_POSITIONS[zone.zone];
          if (!pos) return null;
          const color = getEfficiencyColor(zone.attackEfficiency);

          return (
            <g key={`zone-${zone.zone}`}>
              {/* Background circle */}
              <circle
                cx={pos.cx}
                cy={pos.cy}
                r={24}
                fill="#0f172a"
                stroke={color}
                strokeWidth="2"
                opacity={0.9}
              />
              {/* Percentage */}
              <text
                x={pos.cx}
                y={pos.cy - 5}
                textAnchor="middle"
                fill="white"
                fontSize="13"
                fontWeight="bold"
              >
                {zone.percentage}%
              </text>
              {/* Count */}
              <text
                x={pos.cx}
                y={pos.cy + 10}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="9"
              >
                {zone.attackKills}/{zone.attackTotal}
              </text>
            </g>
          );
        })}

        {/* Setter marker at Z3 */}
        <circle cx={setterPos.cx} cy={setterPos.cy} r={20} fill="#8b5cf6" stroke="#c4b5fd" strokeWidth="2" />
        <text x={setterPos.cx} y={setterPos.cy - 3} textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">
          SET
        </text>
        <text x={setterPos.cx} y={setterPos.cy + 10} textAnchor="middle" fill="#e2e8f0" fontSize="8">
          {data.totalSets}
        </text>
      </svg>
    </div>
  );
}

/**
 * Distribution table — detailed breakdown by zone
 */
function DistributionTable({ data }: { data: SetterDistributionData }) {
  const zones = Array.from(data.byZone.values()).sort((a, b) => b.count - a.count);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700 text-slate-400">
            <th className="text-left py-2 px-2">Zone</th>
            <th className="text-center py-2 px-2">Total</th>
            <th className="text-center py-2 px-2">%</th>
            <th className="text-center py-2 px-2">Kills</th>
            <th className="text-center py-2 px-2">Erreurs</th>
            <th className="text-center py-2 px-2">Eff%</th>
            <th className="text-left py-2 px-2">Combos</th>
            <th className="text-left py-2 px-2">Joueuses</th>
          </tr>
        </thead>
        <tbody>
          {zones.map(zone => (
            <tr key={zone.zone} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="py-2 px-2 font-medium text-slate-200">
                {getZoneShortLabel(zone.zone)}
              </td>
              <td className="text-center py-2 px-2 text-slate-300">{zone.count}</td>
              <td className="text-center py-2 px-2 font-bold" style={{ color: getEfficiencyColor(zone.percentage / 100) }}>
                {zone.percentage}%
              </td>
              <td className="text-center py-2 px-2 text-green-400">{zone.attackKills}</td>
              <td className="text-center py-2 px-2 text-red-400">{zone.attackErrors}</td>
              <td className="text-center py-2 px-2 font-bold" style={{ color: getEfficiencyColor(zone.attackEfficiency) }}>
                {(zone.attackEfficiency * 100).toFixed(0)}%
              </td>
              <td className="py-2 px-2 text-slate-400">
                {Object.entries(zone.comboBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([combo, count]) => `${combo}(${count})`)
                  .join(', ')}
              </td>
              <td className="py-2 px-2 text-slate-400">
                {Object.entries(zone.playerBreakdown)
                  .sort(([, a], [, b]) => b.count - a.count)
                  .slice(0, 2)
                  .map(([name, stats]) => `${name}: ${stats.kills}/${stats.count}`)
                  .join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-600 font-semibold text-slate-200">
            <td className="py-2 px-2">Total</td>
            <td className="text-center py-2 px-2">{data.totalSets}</td>
            <td className="text-center py-2 px-2">100%</td>
            <td className="text-center py-2 px-2 text-green-400">
              {Array.from(data.byZone.values()).reduce((sum, z) => sum + z.attackKills, 0)}
            </td>
            <td className="text-center py-2 px-2 text-red-400">
              {Array.from(data.byZone.values()).reduce((sum, z) => sum + z.attackErrors, 0)}
            </td>
            <td className="text-center py-2 px-2">
              {(() => {
                const totalKills = Array.from(data.byZone.values()).reduce((s, z) => s + z.attackKills, 0);
                const totalErrors = Array.from(data.byZone.values()).reduce((s, z) => s + z.attackErrors, 0);
                const eff = data.totalSets > 0 ? ((totalKills - totalErrors) / data.totalSets * 100) : 0;
                return `${eff.toFixed(0)}%`;
              })()}
            </td>
            <td colSpan={2}></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Distribution breakdown by reception quality
 */
function ReceptionQualityTable({ data }: { data: SetterDistributionData }) {
  const mainZones = [4, 3, 2, 8, 1, 5];
  const qualityOrder = ['#', '+', '!', '-', 'unknown'];

  const rows = qualityOrder
    .filter(q => data.byReceptionQuality.has(q))
    .map(quality => {
      const zones = data.byReceptionQuality.get(quality) ?? [];
      const totalCount = zones.reduce((sum, z) => sum + z.count, 0);
      const zoneMap = new Map(zones.map(z => [z.zone, z]));

      return {
        quality,
        label: quality === 'unknown' ? 'Trans.' : getSetterCallLabel(`K${quality === '#' ? '0' : quality === '+' ? '1' : quality === '!' ? '2' : '7'}`),
        totalCount,
        zones: mainZones.map(zone => zoneMap.get(zone) ?? null),
      };
    });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-700 text-slate-400">
            <th className="text-left py-2 px-2">Réception</th>
            <th className="text-center py-2 px-2">Total</th>
            {mainZones.map(z => (
              <th key={z} className="text-center py-2 px-2">{getZoneShortLabel(z)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.quality} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="py-2 px-2 font-medium text-slate-200">{row.quality === 'unknown' ? 'Trans.' : `${row.quality}`}</td>
              <td className="text-center py-2 px-2 text-slate-300">{row.totalCount}</td>
              {row.zones.map((zone, i) => (
                <td key={mainZones[i]} className="text-center py-2 px-2">
                  {zone ? (
                    <span style={{ color: getEfficiencyColor(zone.attackEfficiency) }}>
                      {zone.percentage}%
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
