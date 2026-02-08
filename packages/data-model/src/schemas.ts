import { z } from 'zod';

// ========== ENUMS & PRIMITIVES ==========

export const SkillSchema = z.enum([
  'serve', 'receive', 'set', 'attack', 'block', 'dig', 'freeball',
]);

export const BallTypeSchema = z.enum(['H', 'M', 'Q', 'T', 'O', 'U']);

export const QualityProSchema = z.enum(['#', '+', '!', '-', '/', '=']);

export const QualitySimpleSchema = z.enum(['perfect', 'good', 'error']);

export const QualityLabelSchema = z.enum([
  'kill', 'positive', 'neutral', 'negative', 'poor', 'error',
]);

export const ReceiveEffectSchema = z.enum(['M', 'W', 'L', 'R', 'O']);

export const TeamSideSchema = z.enum(['home', 'away']);

export const SourceTypeSchema = z.enum([
  'dvw', 'firebase-live', 'parent-stat', 'manual',
]);

// ========== DVW SCOUT LINE ==========

export const DVWLineTypeSchema = z.enum([
  'action', 'point', 'rotation', 'substitution', 'timeout',
  'lineup', 'rotation-init', 'set-end', 'player-entry',
]);

export const DVWActionSchema = z.object({
  playerNumber: z.number().int().min(0).max(99),
  isTeamError: z.boolean(),
  isOpponentError: z.boolean(),
  skill: SkillSchema,
  ballType: BallTypeSchema,
  quality: QualityProSchema,
  attackCombo: z.string().length(2).optional(),
  setterCall: z.string().length(2).optional(),
  startZone: z.number().int().min(0).max(9).optional(),
  endZone: z.number().int().min(0).max(9).optional(),
  endSubZone: z.enum(['A', 'B', 'C', 'D']).optional(),
  endEffect: z.string().max(1).optional(),
  numBlockers: z.number().int().min(0).max(3).optional(),
  receiveEffect: ReceiveEffectSchema.optional(),
  inNet: z.boolean().optional(),
  modifiers: z.object({
    skillFocus: z.boolean().optional(),
    pointScored: z.boolean().optional(),
    rallyContinuation: z.boolean().optional(),
  }),
});

export const DVWScoutLineSchema = z.object({
  type: DVWLineTypeSchema,
  rawLine: z.string(),
  lineNumber: z.number().int().positive(),
  team: TeamSideSchema,
  timestamp: z.string().regex(/^\d{2}\.\d{2}\.\d{2}$/).optional(),
  setNumber: z.number().int().min(1).max(5).optional(),
  homeRotation: z.number().int().min(1).max(6).optional(),
  awayRotation: z.number().int().min(1).max(6).optional(),
  videoSeconds: z.number().int().nonnegative().optional(),
  homePositions: z.array(z.number().int()).length(6).optional(),
  awayPositions: z.array(z.number().int()).length(6).optional(),
  // Type-specific
  action: DVWActionSchema.optional(),
  point: z.object({
    homeScore: z.number().int().nonnegative(),
    awayScore: z.number().int().nonnegative(),
  }).optional(),
  rotation: z.number().int().min(1).max(6).optional(),
  substitution: z.object({
    playerOut: z.number().int(),
    playerIn: z.number().int(),
  }).optional(),
  setEnd: z.number().int().min(1).max(5).optional(),
  lineup: z.object({ player: z.number().int() }).optional(),
});

// ========== PLAYER ==========

export const PlayerSchema = z.object({
  id: z.string(),
  number: z.number().int().min(0).max(99),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  position: z.enum(['OH', 'OPP', 'MB', 'SET', 'LIB', 'unknown']).optional(),
  isLibero: z.boolean().optional(),
  birthDate: z.string().optional(),
  rpePlayerId: z.string().optional(),
});

// ========== TEAM ==========

export const TeamSchema = z.object({
  name: z.string().min(1),
  code: z.string().length(3).optional(),
  players: z.array(PlayerSchema),
  coach: z.string().optional(),
  assistantCoach: z.string().optional(),
});

// ========== PLAYER ROTATION ==========

export const PlayerRotationSchema = z.object({
  P1: z.number().int(),
  P2: z.number().int(),
  P3: z.number().int(),
  P4: z.number().int(),
  P5: z.number().int(),
  P6: z.number().int(),
});

// ========== ACTION ==========

export const ActionSchema = z.object({
  id: z.string(),
  rallyId: z.string(),
  sequenceOrder: z.number().int().nonnegative(),
  player: z.object({
    id: z.string(),
    number: z.number().int(),
    team: TeamSideSchema,
    isTeamAction: z.boolean().optional(),
  }),
  skill: SkillSchema,
  quality: z.union([QualitySimpleSchema, QualityProSchema]),
  ballType: BallTypeSchema.optional(),
  subtype: z.string().optional(),
  setterCall: z.string().optional(),
  startZone: z.number().int().min(0).max(9).optional(),
  endZone: z.number().int().min(0).max(9).optional(),
  endSubZone: z.string().optional(),
  numBlockers: z.number().int().min(0).max(3).optional(),
  receiveEffect: ReceiveEffectSchema.optional(),
  inNet: z.boolean().optional(),
  isOpponentError: z.boolean().optional(),
  videoTimestamp: z.number().nonnegative().optional(),
  coordinates: z.object({
    start: z.object({ x: z.number(), y: z.number() }),
    end: z.object({ x: z.number(), y: z.number() }),
  }).optional(),
  source: z.enum(['dvw', 'parent', 'coach']),
  modifiers: z.object({
    skillFocus: z.boolean().optional(),
    pointScored: z.boolean().optional(),
    rallyContinuation: z.boolean().optional(),
  }).optional(),
});

// ========== RALLY ==========

export const RallySchema = z.object({
  id: z.string(),
  setNumber: z.number().int().min(1).max(5),
  rallyNumber: z.number().int().positive(),
  homeScoreBefore: z.number().int().nonnegative(),
  awayScoreBefore: z.number().int().nonnegative(),
  homeScoreAfter: z.number().int().nonnegative(),
  awayScoreAfter: z.number().int().nonnegative(),
  servingTeam: TeamSideSchema,
  rotation: z.object({
    home: z.number().int().min(1).max(6),
    away: z.number().int().min(1).max(6),
  }).optional(),
  positions: z.object({
    home: PlayerRotationSchema,
    away: PlayerRotationSchema,
  }).optional(),
  pointWinner: TeamSideSchema,
  actions: z.array(ActionSchema),
  videoTimestamp: z.number().nonnegative().optional(),
  endVideoTimestamp: z.number().nonnegative().optional(),
  duration: z.number().nonnegative().optional(),
});

// ========== SET ==========

export const SetDataSchema = z.object({
  number: z.number().int().min(1).max(5),
  homeScore: z.number().int().nonnegative(),
  awayScore: z.number().int().nonnegative(),
  winner: TeamSideSchema,
  partialScores: z.object({
    at8: z.string().optional(),
    at16: z.string().optional(),
    at21: z.string().optional(),
  }).optional(),
  startLineup: z.object({
    home: PlayerRotationSchema,
    away: PlayerRotationSchema,
  }).optional(),
  startRotation: z.object({
    home: z.number().int().min(1).max(6),
    away: z.number().int().min(1).max(6),
  }).optional(),
  rallies: z.array(RallySchema),
  duration: z.number().nonnegative().optional(),
});

// ========== ATTACK COMBINATION ==========

export const AttackCombinationSchema = z.object({
  code: z.string().min(2).max(2),
  description: z.string(),
  startZone: z.number().int().min(1).max(9).optional(),
  side: z.enum(['L', 'R', 'C']).optional(),
  tempo: z.enum(['Q', 'H', 'T', 'O', 'U']).optional(),
  positionCategory: z.enum(['F', 'B', 'C', 'P', 'S', '-']).optional(),
});

export const SetterCallSchema = z.object({
  code: z.string().min(2).max(2),
  description: z.string(),
});

// ========== MATCH SOURCE ==========

export const MatchSourceSchema = z.object({
  type: SourceTypeSchema,
  importedAt: z.string(),
  originalId: z.string().optional(),
  dvwVersion: z.string().optional(),
  dvwSoftware: z.string().optional(),
  dvwEditor: z.string().optional(),
  dataCompleteness: z.enum(['full', 'points-only', 'simple-stats']),
});

// ========== VIDEO SOURCE ==========

export const VideoSourceSchema = z.object({
  type: z.enum(['youtube', 'local', 'cloud']),
  url: z.string(),
  videoId: z.string().optional(),
  offsetSeconds: z.number().optional(),
  dvwLocalPath: z.string().optional(),
});

// ========== TIMEOUT & SUBSTITUTION ==========

export const TimeoutEventSchema = z.object({
  team: TeamSideSchema,
  setNumber: z.number().int(),
  homeScore: z.number().int().nonnegative(),
  awayScore: z.number().int().nonnegative(),
  timestamp: z.string().optional(),
  videoSeconds: z.number().nonnegative().optional(),
});

export const SubstitutionEventSchema = z.object({
  team: TeamSideSchema,
  playerOut: z.number().int(),
  playerIn: z.number().int(),
  setNumber: z.number().int(),
  homeScore: z.number().int().nonnegative().optional(),
  awayScore: z.number().int().nonnegative().optional(),
  timestamp: z.string().optional(),
  videoSeconds: z.number().nonnegative().optional(),
});

// ========== DVW METADATA ==========

export const DVWMetadataSchema = z.object({
  attackCombinations: z.array(AttackCombinationSchema),
  setterCalls: z.array(SetterCallSchema),
  videoPath: z.string().optional(),
});

// ========== MATCH ==========

export const MatchSchema = z.object({
  id: z.string(),
  date: z.string(),
  competition: z.string(),
  category: z.string().optional(),
  venue: z.string().optional(),
  phase: z.string().optional(),
  homeTeam: TeamSchema,
  awayTeam: TeamSchema,
  sets: z.array(SetDataSchema),
  result: z.object({
    homeWins: z.number().int().nonnegative(),
    awayWins: z.number().int().nonnegative(),
    winner: TeamSideSchema,
  }),
  videoSources: z.array(VideoSourceSchema),
  timeouts: z.array(TimeoutEventSchema),
  substitutions: z.array(SubstitutionEventSchema),
  source: MatchSourceSchema,
  dvwMetadata: DVWMetadataSchema.optional(),
});

// ========== STATS ==========

export const QualityDistributionSchema = z.object({
  total: z.number().int().nonnegative(),
  '#': z.number().int().nonnegative(),
  '+': z.number().int().nonnegative(),
  '!': z.number().int().nonnegative(),
  '-': z.number().int().nonnegative(),
  '/': z.number().int().nonnegative(),
  '=': z.number().int().nonnegative(),
  perfect: z.number().int().nonnegative(),
  good: z.number().int().nonnegative(),
  error: z.number().int().nonnegative(),
});

export const SkillStatsSchema = z.object({
  totalActions: z.number().int().nonnegative(),
  kills: z.number().int().nonnegative(),
  errors: z.number().int().nonnegative(),
  efficiency: z.number(),
  positiveRate: z.number(),
});

export const PlayerMatchStatsSchema = z.object({
  matchId: z.string(),
  playerId: z.string(),
  date: z.string(),
  overall: SkillStatsSchema,
  bySet: z.record(z.coerce.number(), SkillStatsSchema),
  bySkill: z.record(z.string(), QualityDistributionSchema),
  bySetAndSkill: z.record(z.string(), QualityDistributionSchema),
  byRotation: z.record(z.coerce.number(), SkillStatsSchema).optional(),
  attackByCombo: z.record(z.string(), QualityDistributionSchema).optional(),
  serveByZone: z.record(z.coerce.number(), QualityDistributionSchema).optional(),
});
