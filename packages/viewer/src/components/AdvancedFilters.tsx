import { useState, useMemo } from 'react';
import type { Match, Skill, Quality } from '@volleyvision/data-model';
import { useFilterStore } from '../store/filterStore';
import { buildPreset } from '../utils/filterEngine';
import { SKILL_FILTERS } from '../utils/timelineHelpers';
import { getQualityColorClass } from '../utils/timelineHelpers';

interface AdvancedFiltersProps {
  match: Match;
  resultCount: number;
  className?: string;
}

// ============================================================================
// FilterGroup - Wrapper pour une section de filtre
// ============================================================================

interface FilterGroupProps {
  label: string;
  children: React.ReactNode;
}

function FilterGroup({ label, children }: FilterGroupProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-400">{label}</label>
      {children}
    </div>
  );
}

// ============================================================================
// TeamToggle - Sélection d'équipe (Home / Both / Away)
// ============================================================================

interface TeamToggleProps {
  homeTeam: string;
  awayTeam: string;
  value: 'home' | 'away' | null;
  onChange: (side: 'home' | 'away' | null) => void;
}

function TeamToggle({ homeTeam, awayTeam, value, onChange }: TeamToggleProps) {
  return (
    <div className="flex gap-0.5">
      <button
        onClick={() => onChange(value === 'home' ? null : 'home')}
        className={`flex-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors truncate ${
          value === 'home'
            ? 'bg-primary-green text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
        title={homeTeam}
      >
        {homeTeam}
      </button>
      <button
        onClick={() => onChange(null)}
        className={`flex-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
          value === null
            ? 'bg-primary-green text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
      >
        Les 2
      </button>
      <button
        onClick={() => onChange(value === 'away' ? null : 'away')}
        className={`flex-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors truncate ${
          value === 'away'
            ? 'bg-primary-green text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
        }`}
        title={awayTeam}
      >
        {awayTeam}
      </button>
    </div>
  );
}

// ============================================================================
// SkillToggleGroup - Sélection de skills
// ============================================================================

interface SkillToggleGroupProps {
  selected: string[];
  onChange: (skills: string[]) => void;
}

function SkillToggleGroup({ selected, onChange }: SkillToggleGroupProps) {
  const toggleSkill = (skill: string) => {
    if (selected.includes(skill)) {
      const newSkills = selected.filter(s => s !== skill);
      onChange(newSkills.length > 0 ? newSkills : []);
    } else {
      onChange([...selected, skill]);
    }
  };

  return (
    <div className="flex flex-wrap gap-0.5">
      {SKILL_FILTERS.map(({ skill, icon, label }) => (
        <button
          key={skill}
          onClick={() => toggleSkill(skill)}
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
            selected.length === 0 || selected.includes(skill)
              ? 'bg-primary-blue text-white'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// QualityToggleGroup - Sélection de qualités
// ============================================================================

interface QualityToggleGroupProps {
  selected: string[];
  onChange: (qualities: string[]) => void;
}

function QualityToggleGroup({ selected, onChange }: QualityToggleGroupProps) {
  const qualities = ['#', '+', '!', '-', '/', '='];

  const toggleQuality = (quality: string) => {
    if (selected.includes(quality)) {
      const newQualities = selected.filter(q => q !== quality);
      onChange(newQualities);
    } else {
      onChange([...selected, quality]);
    }
  };

  return (
    <div className="flex flex-wrap gap-0.5">
      {qualities.map(quality => (
        <button
          key={quality}
          onClick={() => toggleQuality(quality)}
          className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
            getQualityColorClass(quality as Quality)
          } ${
            selected.length === 0 || selected.includes(quality)
              ? 'opacity-100'
              : 'opacity-40 hover:opacity-60'
          }`}
        >
          {quality}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// SetToggleGroup - Sélection de sets
// ============================================================================

interface SetToggleGroupProps {
  sets: { number: number }[];
  selected: number[];
  onChange: (setNumbers: number[]) => void;
}

function SetToggleGroup({ sets, selected, onChange }: SetToggleGroupProps) {
  const toggleSet = (setNum: number) => {
    if (selected.includes(setNum)) {
      onChange(selected.filter(s => s !== setNum));
    } else {
      onChange([...selected, setNum]);
    }
  };

  return (
    <div className="flex flex-wrap gap-0.5">
      {sets.map(set => (
        <button
          key={set.number}
          onClick={() => toggleSet(set.number)}
          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
            selected.length === 0 || selected.includes(set.number)
              ? 'bg-primary-green text-white'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          S{set.number}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// RotationToggleGroup - Sélection de rotations (1-6)
// ============================================================================

interface RotationToggleGroupProps {
  selected: number[];
  onChange: (rotations: number[]) => void;
}

function RotationToggleGroup({ selected, onChange }: RotationToggleGroupProps) {
  const rotations = [1, 2, 3, 4, 5, 6];

  const toggleRotation = (rot: number) => {
    if (selected.includes(rot)) {
      onChange(selected.filter(r => r !== rot));
    } else {
      onChange([...selected, rot]);
    }
  };

  return (
    <div className="flex flex-wrap gap-0.5">
      {rotations.map(rot => (
        <button
          key={rot}
          onClick={() => toggleRotation(rot)}
          className={`w-7 h-7 rounded text-xs font-mono font-bold transition-colors ${
            selected.length === 0 || selected.includes(rot)
              ? 'bg-primary-blue text-white'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          {rot}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// ZoneSelector - Grille 3x2 pour les zones du terrain
// ============================================================================

interface ZoneSelectorProps {
  selected: number[];
  onChange: (zones: number[]) => void;
}

function ZoneSelector({ selected, onChange }: ZoneSelectorProps) {
  // Layout du terrain de volley: [4,3,2] au-dessus du filet, [5,6,1] derrière
  const zones = [4, 3, 2, 5, 6, 1];

  const toggleZone = (zone: number) => {
    if (selected.includes(zone)) {
      onChange(selected.filter(z => z !== zone));
    } else {
      onChange([...selected, zone]);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-0.5">
      {zones.map(zone => (
        <button
          key={zone}
          onClick={() => toggleZone(zone)}
          className={`h-7 rounded font-mono text-xs font-bold transition-colors ${
            selected.length === 0 || selected.includes(zone)
              ? 'bg-primary-green text-white'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          {zone}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// AdvancedFilters - Composant principal
// ============================================================================

export function AdvancedFilters({ match, resultCount, className = '' }: AdvancedFiltersProps) {
  const { criteria, setCriteria, resetCriteria } = useFilterStore();
  const [isExpanded, setIsExpanded] = useState(false);

  // Compter les filtres actifs
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (criteria.setNumbers.length > 0) count++;
    if (criteria.playerIds.length > 0) count++;
    if (criteria.teamSide !== null) count++;
    if (criteria.skills.length > 0) count++;
    if (criteria.qualities.length > 0) count++;
    if (criteria.attackCombos.length > 0) count++;
    if (criteria.startZones.length > 0) count++;
    if (criteria.endZones.length > 0) count++;
    if (criteria.rotations.length > 0) count++;
    if (criteria.servingTeam !== null) count++;
    if (criteria.minBlockers !== null) count++;
    if (criteria.maxBlockers !== null) count++;
    return count;
  }, [criteria]);

  const applyPreset = (presetType: string) => {
    const preset = buildPreset(presetType, match);
    setCriteria(preset);
  };

  const resetAll = () => {
    resetCriteria();
  };

  return (
    <div className={`bg-slate-800 rounded-lg overflow-hidden ${className}`}>
      {/* Header pliable */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">🔍 Filtres avancés</span>
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-primary-blue rounded-full text-xs">
              {activeFilterCount} actif(s)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{resultCount} résultat(s)</span>
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700">
          {/* Presets rapides */}
          <div className="flex flex-wrap gap-2 pt-3">
            <button
              onClick={() => applyPreset('all-attacks')}
              className="px-3 py-1 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              Attaques
            </button>
            <button
              onClick={() => applyPreset('all-serves')}
              className="px-3 py-1 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              Services
            </button>
            <button
              onClick={() => applyPreset('kills-only')}
              className="px-3 py-1 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              Kills
            </button>
            <button
              onClick={() => applyPreset('reception')}
              className="px-3 py-1 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              Réceptions
            </button>
            <button
              onClick={() => applyPreset('errors-only')}
              className="px-3 py-1 rounded text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
            >
              Erreurs
            </button>
            <button
              onClick={resetAll}
              className="px-3 py-1 rounded text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Réinitialiser
            </button>
          </div>

          {/* Grille de filtres 2 colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Équipe */}
            <FilterGroup label="Équipe">
              <TeamToggle
                homeTeam={match.homeTeam.name}
                awayTeam={match.awayTeam.name}
                value={criteria.teamSide}
                onChange={side => setCriteria({ teamSide: side })}
              />
            </FilterGroup>

            {/* Skill */}
            <FilterGroup label="Skill">
              <SkillToggleGroup
                selected={criteria.skills}
                onChange={skills => setCriteria({ skills: skills as Skill[] })}
              />
            </FilterGroup>

            {/* Qualité */}
            <FilterGroup label="Qualité">
              <QualityToggleGroup
                selected={criteria.qualities}
                onChange={qualities => setCriteria({ qualities: qualities as Quality[] })}
              />
            </FilterGroup>

            {/* Set */}
            <FilterGroup label="Set">
              <SetToggleGroup
                sets={match.sets}
                selected={criteria.setNumbers}
                onChange={setNumbers => setCriteria({ setNumbers })}
              />
            </FilterGroup>

            {/* Rotation (1-6) */}
            <FilterGroup label="Rotation">
              <RotationToggleGroup
                selected={criteria.rotations}
                onChange={rotations => setCriteria({ rotations })}
              />
            </FilterGroup>

            {/* Zone de départ */}
            <FilterGroup label="Zone départ">
              <ZoneSelector
                selected={criteria.startZones}
                onChange={zones => setCriteria({ startZones: zones })}
              />
            </FilterGroup>
          </div>
        </div>
      )}
    </div>
  );
}
