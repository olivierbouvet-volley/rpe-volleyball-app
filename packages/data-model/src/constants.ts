// ========== ZONE COORDINATES ==========

/**
 * Volleyball court zones (standard DataVolley view)
 *
 *  ┌─────────────────────────────┐
 *  │     5     │   6   │    1    │  ← Back row
 *  │           │       │         │
 *  ├───────────┼───────┼─────────┤
 *  │     4     │   3   │    2    │  ← Front row
 *  │           │       │         │
 *  └─────────────────────────────┘
 *        ← Net on this side →
 *
 * Zones 7, 8, 9 = back extensions (pipe, back attack)
 *  ┌─────────────────────────────┐
 *  │     7     │   8   │    9    │  ← Behind the back line
 *  └─────────────────────────────┘
 */
export const ZONE_COORDINATES: Record<number, { x: number; y: number }> = {
  1: { x: 0.83, y: 0.75 },
  2: { x: 0.83, y: 0.25 },
  3: { x: 0.50, y: 0.25 },
  4: { x: 0.17, y: 0.25 },
  5: { x: 0.17, y: 0.75 },
  6: { x: 0.50, y: 0.75 },
  7: { x: 0.17, y: 0.95 },
  8: { x: 0.50, y: 0.95 },
  9: { x: 0.83, y: 0.95 },
};

// ========== VOLLEYBALL RULES ==========

export const VOLLEYBALL_RULES = {
  /** Points needed to win a regular set */
  POINTS_TO_WIN_SET: 25,
  /** Points needed to win a tiebreak set */
  POINTS_TO_WIN_TIEBREAK: 15,
  /** Minimum lead required to win a set */
  MIN_LEAD: 2,
  /** Maximum number of sets in a match */
  MAX_SETS: 5,
  /** Which set number is the tiebreak */
  TIEBREAK_SET: 5,
  /** Max timeouts per team per set */
  MAX_TIMEOUTS_PER_SET: 2,
  /** Max substitutions per team per set */
  MAX_SUBSTITUTIONS_PER_SET: 6,
  /** Technical timeout score thresholds */
  TECHNICAL_TIMEOUT_SCORES: [8, 16] as const,
} as const;
