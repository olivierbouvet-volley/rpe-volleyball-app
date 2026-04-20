import type { QualityPro, QualitySimple, QualityLabel, Skill } from './types';

// ========== QUALITY MAPPINGS ==========

/** Maps DVW quality codes to simplified parent-view quality */
export const QUALITY_PRO_TO_SIMPLE: Record<QualityPro, QualitySimple> = {
  '#': 'perfect',
  '+': 'good',
  '!': 'good',     // Grouped with good for parent simplification
  '-': 'error',
  '/': 'error',
  '=': 'error',
};

/** Maps DVW quality codes to fine-grained coach-view labels */
export const QUALITY_PRO_TO_LABEL: Record<QualityPro, QualityLabel> = {
  '#': 'kill',
  '+': 'positive',
  '!': 'neutral',
  '-': 'negative',
  '/': 'poor',
  '=': 'error',
};

/** Color palette for each quality label (Tailwind-aligned) */
export const QUALITY_LABEL_COLORS: Record<QualityLabel, string> = {
  kill:     '#22c55e',  // green-500
  positive: '#84cc16',  // lime-500
  neutral:  '#eab308',  // yellow-500
  negative: '#f97316',  // orange-500
  poor:     '#ef4444',  // red-500
  error:    '#dc2626',  // red-600
};

// ========== SKILL CODE MAP ==========

/** Maps DVW single-char skill codes to Skill type */
export const SKILL_CODE_MAP: Record<string, Skill> = {
  S: 'serve',
  R: 'receive',
  E: 'set',
  A: 'attack',
  B: 'block',
  D: 'dig',
  F: 'freeball',
};

/** Maps BallType codes to human-readable labels */
export const BALL_TYPE_LABELS: Record<string, string> = {
  H: 'High ball',
  M: 'Medium',
  Q: 'Quick',
  T: 'Tempo',
  O: 'Overpass',
  U: 'Unknown',
};

// ========== UTILITY FUNCTIONS ==========

/** Convert DVW quality to simplified parent-view quality */
export function toSimple(q: QualityPro): QualitySimple {
  return QUALITY_PRO_TO_SIMPLE[q];
}

/** Convert DVW quality to fine-grained coach label */
export function toLabel(q: QualityPro): QualityLabel {
  return QUALITY_PRO_TO_LABEL[q];
}

/** Convert single-char DVW skill code to Skill type */
export function skillFromCode(code: string): Skill | undefined {
  return SKILL_CODE_MAP[code];
}

/** Returns true if quality is positive (# or +) */
export function isPositive(q: QualityPro): boolean {
  return q === '#' || q === '+';
}

/** Returns true if quality is negative (-, / or =) */
export function isNegative(q: QualityPro): boolean {
  return q === '-' || q === '/' || q === '=';
}
