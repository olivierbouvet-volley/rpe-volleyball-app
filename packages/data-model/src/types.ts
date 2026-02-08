// ========== CORE TYPES ==========

export type Skill = 'serve' | 'receive' | 'set' | 'attack' | 'block' | 'dig' | 'freeball';

/** Ball type — extracted from DVW real files */
export type BallType = 'H' | 'M' | 'Q' | 'T' | 'O' | 'U';
// H=High, M=Medium, Q=Quick, T=Tempo, O=Overpass, U=Unknown

/** Simplified quality for parent view */
export type QualitySimple = 'perfect' | 'good' | 'error';

/** DVW quality codes */
export type QualityPro = '#' | '+' | '!' | '-' | '/' | '=';

/** Union type for any quality value */
export type Quality = QualitySimple | QualityPro;

/** Fine-grained quality labels for coach view */
export type QualityLabel = 'kill' | 'positive' | 'neutral' | 'negative' | 'poor' | 'error';

/** Receive effect suffix from DVW */
export type ReceiveEffect = 'M' | 'W' | 'L' | 'R' | 'O';
// M=Medium, W=Weak, L=Libéro, R=Regular, O=Overpass

export type TeamSide = 'home' | 'away';

export type SourceType = 'dvw' | 'firebase-live' | 'parent-stat' | 'manual';

// ========== DVW RAW PARSED LINE ==========

/** Types of scout lines found in [3SCOUT] */
export type DVWLineType =
  | 'action'
  | 'point'
  | 'rotation'
  | 'substitution'
  | 'timeout'
  | 'lineup'
  | 'rotation-init'
  | 'set-end'
  | 'player-entry';

/** A single parsed line from the [3SCOUT] section, before rally grouping */
export interface DVWScoutLine {
  type: DVWLineType;
  rawLine: string;
  lineNumber: number;

  // Common to all types
  team: TeamSide;
  timestamp?: string;           // HH.MM.SS (wall clock)
  setNumber?: number;
  homeRotation?: number;        // 1-6
  awayRotation?: number;        // 1-6
  videoSeconds?: number;        // Frame ≈ video second
  homePositions?: number[];     // [P1, P2, P3, P4, P5, P6] player numbers
  awayPositions?: number[];     // [P1, P2, P3, P4, P5, P6] player numbers

  // Type-specific data
  action?: DVWAction;
  point?: { homeScore: number; awayScore: number };
  rotation?: number;
  substitution?: { playerOut: number; playerIn: number };
  setEnd?: number;
  lineup?: { player: number };
}

/** A single parsed action from a DVW scout line */
export interface DVWAction {
  playerNumber: number;         // 2 digits (or 0 if $$)
  isTeamError: boolean;         // true if player === $$ (team error)
  isOpponentError: boolean;     // true if code contains & (opponent fault)
  skill: Skill;
  ballType: BallType;
  quality: QualityPro;
  attackCombo?: string;         // Attack code (V5, XC, C1, PP...)
  setterCall?: string;          // Setter call code (K1, K8, KC...)
  startZone?: number;           // Zone 1-9 start
  endZone?: number;             // Zone 1-9 end
  endSubZone?: string;          // A, B, C, D (sub-zone)
  endEffect?: string;           // Additional effect (H, T, P, N...)
  numBlockers?: number;         // 0-3 opponent blockers
  receiveEffect?: ReceiveEffect;
  inNet?: boolean;              // true if ~~N (ball in the net)
  modifiers: {
    skillFocus?: boolean;       // ;s; in modifiers
    pointScored?: boolean;      // ;p; in modifiers
    rallyContinuation?: boolean; // ;r; in modifiers
  };
}

// ========== MATCH ==========

export interface Match {
  id: string;
  date: string;                 // ISO date
  competition: string;
  category?: string;            // N2F, N3F, RF, Interpole, etc.
  venue?: string;
  phase?: string;
  homeTeam: Team;
  awayTeam: Team;
  sets: SetData[];
  result: {
    homeWins: number;
    awayWins: number;
    winner: TeamSide;
  };
  videoSources: VideoSource[];
  timeouts: TimeoutEvent[];
  substitutions: SubstitutionEvent[];
  source: MatchSource;
  dvwMetadata?: DVWMetadata;
}

export interface MatchSource {
  type: SourceType;
  importedAt: string;
  originalId?: string;
  dvwVersion?: string;
  dvwSoftware?: string;
  dvwEditor?: string;
  dataCompleteness: 'full' | 'points-only' | 'simple-stats';
}

export interface DVWMetadata {
  attackCombinations: AttackCombination[];
  setterCalls: SetterCall[];
  videoPath?: string;
}

export interface AttackCombination {
  code: string;                 // V5, XC, C1...
  description: string;
  startZone?: number;
  side?: 'L' | 'R' | 'C';
  tempo?: 'Q' | 'H' | 'T' | 'O' | 'U';
  positionCategory?: 'F' | 'B' | 'C' | 'P' | '-';
}

export interface SetterCall {
  code: string;                 // K1, K8, KC...
  description: string;
}

export interface TimeoutEvent {
  team: TeamSide;
  setNumber: number;
  homeScore: number;
  awayScore: number;
  timestamp?: string;
  videoSeconds?: number;
}

export interface SubstitutionEvent {
  team: TeamSide;
  playerOut: number;
  playerIn: number;
  setNumber: number;
  homeScore?: number;
  awayScore?: number;
  timestamp?: string;
  videoSeconds?: number;
}

// ========== TEAM & PLAYER ==========

export interface Team {
  name: string;
  code?: string;                // BOU, SAB (3-letter DVW code)
  players: Player[];
  coach?: string;
  assistantCoach?: string;
}

export interface Player {
  id: string;
  number: number;
  firstName: string;
  lastName: string;
  position?: 'OH' | 'OPP' | 'MB' | 'SET' | 'LIB' | 'unknown';
  isLibero?: boolean;
  birthDate?: string;
  rpePlayerId?: string;
}

// ========== SET ==========

export interface SetData {
  number: number;
  homeScore: number;
  awayScore: number;
  winner: TeamSide;
  partialScores?: {
    at8?: string;
    at16?: string;
    at21?: string;
  };
  startLineup?: {
    home: PlayerRotation;
    away: PlayerRotation;
  };
  startRotation?: {
    home: number;
    away: number;
  };
  rallies: Rally[];
  duration?: number;
}

/** Player numbers at positions P1-P6 */
export interface PlayerRotation {
  P1: number;
  P2: number;
  P3: number;
  P4: number;
  P5: number;
  P6: number;
}

// ========== RALLY & ACTION ==========

export interface Rally {
  id: string;
  setNumber: number;
  rallyNumber: number;
  homeScoreBefore: number;
  awayScoreBefore: number;
  homeScoreAfter: number;
  awayScoreAfter: number;
  servingTeam: TeamSide;
  rotation?: {
    home: number;
    away: number;
  };
  positions?: {
    home: PlayerRotation;
    away: PlayerRotation;
  };
  pointWinner: TeamSide;
  actions: Action[];
  videoTimestamp?: number;
  endVideoTimestamp?: number;
  duration?: number;
}

export interface Action {
  id: string;
  rallyId: string;
  sequenceOrder: number;
  player: {
    id: string;
    number: number;
    team: TeamSide;
    isTeamAction?: boolean;
  };
  skill: Skill;
  quality: Quality;
  ballType?: BallType;
  subtype?: string;             // DVW attack combo code (X1, V5...)
  setterCall?: string;
  startZone?: number;
  endZone?: number;
  endSubZone?: string;
  numBlockers?: number;
  receiveEffect?: ReceiveEffect;
  inNet?: boolean;
  isOpponentError?: boolean;
  videoTimestamp?: number;
  coordinates?: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
  source: 'dvw' | 'parent' | 'coach';
  modifiers?: {
    skillFocus?: boolean;
    pointScored?: boolean;
    rallyContinuation?: boolean;
  };
}

// ========== VIDEO ==========

export interface VideoSource {
  type: 'youtube' | 'local' | 'cloud';
  url: string;
  videoId?: string;
  offsetSeconds?: number;
  dvwLocalPath?: string;
}

// ========== PHYSICAL DATA ==========

export type PhysicalTestType =
  | 'vertec'
  | 'spike-height'
  | 'block-height'
  | 'sprint-5m'
  | 'sprint-10m'
  | 'agility-t-test'
  | 'vma'
  | 'custom';

export interface PhysicalTest {
  id: string;
  playerId: string;
  rpePlayerId?: string;
  date: string;
  type: PhysicalTestType;
  value: number;
  unit: string;
  context?: 'pre-match' | 'post-match' | 'training' | 'test-session';
  matchId?: string;
  setNumber?: number;
  notes?: string;
}

// ========== RPE SNAPSHOT ==========

export interface MatchPlayerContext {
  matchId: string;
  playerId: string;
  rpePlayerId: string;
  checkinScore?: number;
  checkinStatus?: 'optimal' | 'attention' | 'critical';
  sleepHours?: number;
  sorenessLevel?: number;
  stressLevel?: number;
  moodLevel?: number;
  energyLevel?: number;
  cyclePhase?: 'Menstruelle' | 'Folliculaire' | 'Ovulation' | 'Lutéale';
  cycleDay?: number;
  symptoms?: string[];
  weeklyRPEAvg?: number;
  weeklyRPELoad?: number;
  trainingDaysBeforeMatch?: number;
  rpePostMatch?: number;
  physicalTests?: PhysicalTest[];
}

// ========== AGGREGATED STATS ==========

export interface PlayerMatchStats {
  matchId: string;
  playerId: string;
  date: string;
  overall: SkillStats;
  bySet: Record<number, SkillStats>;
  bySkill: Partial<Record<Skill, QualityDistribution>>;
  bySetAndSkill: Record<string, QualityDistribution>;
  byRotation?: Record<number, SkillStats>;
  attackByCombo?: Record<string, QualityDistribution>;
  serveByZone?: Record<number, QualityDistribution>;
  receiveByEffect?: Partial<Record<ReceiveEffect, number>>;
}

export interface SkillStats {
  totalActions: number;
  kills: number;
  errors: number;
  efficiency: number;       // (kills - errors) / total
  positiveRate: number;     // (kills + good) / total
}

export interface QualityDistribution {
  total: number;
  '#': number;
  '+': number;
  '!': number;
  '-': number;
  '/': number;
  '=': number;
  perfect: number;
  good: number;
  error: number;
}

// ========== AI QUERY ==========

export interface AIAnalysisRequest {
  question: string;
  playerIds: string[];
  dateRange: { from: string; to: string };
  dataIncluded: {
    matchStats: PlayerMatchStats[];
    rpeSnapshots: MatchPlayerContext[];
    physicalTests: PhysicalTest[];
  };
}
