/**
 * @file timelineHelpers.ts
 * @description Helpers and constants for the Action Timeline component
 */

import type { Skill, Quality, Match, Rally, Action } from '@volleyvision/data-model';

export const SKILL_ICONS: Record<Skill, string> = {
  serve: '🎯',
  receive: '🛡️',
  set: '🙌',
  attack: '💥',
  block: '🧱',
  dig: '⬇️',
  freeball: '🏐',
};

export const SKILL_LABELS: Record<Skill, string> = {
  serve: 'Service',
  receive: 'Réception',
  set: 'Passe',
  attack: 'Attaque',
  block: 'Block',
  dig: 'Défense',
  freeball: 'Free ball',
};

export const SKILL_FILTERS: { skill: Skill; icon: string; shortcut: string; label: string }[] = [
  { skill: 'serve', icon: '🎯', shortcut: 'S', label: 'Services' },
  { skill: 'receive', icon: '🛡️', shortcut: 'R', label: 'Réceptions' },
  { skill: 'attack', icon: '💥', shortcut: 'A', label: 'Attaques' },
  { skill: 'block', icon: '🧱', shortcut: 'B', label: 'Blocks' },
  { skill: 'dig', icon: '⬇️', shortcut: 'D', label: 'Défenses' },
  { skill: 'set', icon: '🙌', shortcut: 'P', label: 'Passes' },
];

/**
 * Get emoji icon for a skill
 */
export function getSkillIcon(skill: Skill): string {
  return SKILL_ICONS[skill] || '🏐';
}

/**
 * Get French label for a skill
 */
export function getSkillLabel(skill: Skill): string {
  return SKILL_LABELS[skill] || skill;
}

/**
 * Get Tailwind CSS class for quality badge background
 */
export function getQualityColorClass(quality: Quality): string {
  switch (quality) {
    case '#':
      return 'bg-quality-kill text-white';
    case '+':
      return 'bg-quality-positive text-white';
    case '!':
      return 'bg-quality-neutral text-slate-900';
    case '-':
      return 'bg-quality-negative text-white';
    case '/':
      return 'bg-quality-poor text-white';
    case '=':
      return 'bg-quality-error text-white';
    default:
      return 'bg-slate-600 text-white';
  }
}

/**
 * Check if an action is currently playing (within tolerance)
 */
export function isActionInTimeRange(
  action: Action,
  currentTime: number,
  offset: number,
  toleranceSeconds: number = 2
): boolean {
  if (action.videoTimestamp == null) return false;
  const actionYTTime = action.videoTimestamp + offset;
  return Math.abs(currentTime - actionYTTime) <= toleranceSeconds;
}

/**
 * Check if a rally is currently playing
 */
export function isRallyInTimeRange(
  rally: Rally,
  currentTime: number,
  offset: number
): boolean {
  if (rally.videoTimestamp == null) return false;
  const rallyStart = rally.videoTimestamp + offset;
  const rallyEnd = (rally.endVideoTimestamp ?? rally.videoTimestamp + 15) + offset;
  return currentTime >= rallyStart && currentTime <= rallyEnd;
}

/**
 * Get all rallies for a specific set (or all sets if null)
 */
export function getRalliesForSet(match: Match, setNumber: number | null): Rally[] {
  if (setNumber === null) {
    return match.sets.flatMap((s) => s.rallies);
  }
  const set = match.sets.find((s) => s.number === setNumber);
  return set?.rallies ?? [];
}
