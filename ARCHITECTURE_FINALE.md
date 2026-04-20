# ARCHITECTURE FINALE — VolleyVision

> Ce document est la référence architecturale définitive pour l'implémentation.
> Il complète `CLAUDE_v3.md` (contexte projet) et `DVW-FORMAT-SPEC.md` (format fichier).
> Version : 1.0 — Janvier 2026

---

## 1. Vue d'ensemble du monorepo

```
volleyvision/
├── package.json                    # pnpm workspaces
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vitest.config.ts                # Config Vitest partagée
├── .eslintrc.cjs
├── .prettierrc
├── CLAUDE.md                       # Contexte IA (= CLAUDE_v4.md)
├── DVW-FORMAT-SPEC.md
│
├── packages/
│   ├── data-model/                 #  Package 1 : Types + Validation
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts            # Re-exports
│   │       ├── types.ts            # Interfaces TypeScript
│   │       ├── schemas.ts          # Schemas Zod (runtime validation)
│   │       ├── quality-mapper.ts   # QualitySimple ↔ QualityPro ↔ QualityLabel
│   │       └── constants.ts        # Skill codes, zone maps, etc.
│   │
│   ├── dvw-parser/                 #  Package 2 : Parser DVW
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts            # parseDVW(content: string): ParsedMatch
│   │       ├── section-splitter.ts
│   │       ├── sections/
│   │       │   ├── header.ts       # [3DATAVOLLEYSCOUT] + [3MATCH]
│   │       │   ├── teams.ts        # [3TEAMS] + [3PLAYERS-H/V]
│   │       │   ├── sets.ts         # [3SET]
│   │       │   ├── attack-combos.ts
│   │       │   ├── setter-calls.ts
│   │       │   └── video.ts        # [3VIDEO]
│   │       ├── scout/
│   │       │   ├── line-classifier.ts   # Identifie le type de ligne
│   │       │   ├── action-parser.ts     # Parse action code → DVWAction
│   │       │   ├── meta-parser.ts       # Parse timestamp + rotations + positions
│   │       │   ├── line-parser.ts       # Orchestre classifier + action + meta → DVWScoutLine
│   │       │   └── rally-builder.ts     # DVWScoutLine[] → Rally[]
│   │       ├── stats/
│   │       │   └── calculator.ts        # Match → PlayerMatchStats[]
│   │       └── utils/
│   │           ├── hex-decoder.ts       # Décodage hex → string (noms)
│   │           └── score-parser.ts      # Parse scores avec espaces
│   │
│   ├── firebase-bridge/            #  Package 3 : Pont Firebase (Phase 4)
│   │   └── src/
│   │       ├── realtime-importer.ts
│   │       ├── firestore-rpe.ts
│   │       ├── player-matcher.ts   # Matching DVW ↔ RPE par nom/prénom
│   │       └── config.ts
│   │
│   └── viewer/                     #  Package 4 : App React
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── index.html
│       └── src/
│           ├── App.tsx
│           ├── main.tsx
│           ├── store/              # Zustand stores
│           │   ├── matchStore.ts
│           │   ├── filterStore.ts
│           │   └── videoStore.ts
│           ├── pages/
│           │   ├── ImportPage.tsx
│           │   ├── AnalysisPage.tsx
│           │   ├── VideoPage.tsx
│           │   └── ParentStatPage.tsx
│           ├── components/
│           │   ├── FileDropZone.tsx
│           │   ├── StatsTable.tsx
│           │   ├── ScoreBoard.tsx
│           │   ├── SkillFilter.tsx
│           │   ├── PlayerSelector.tsx
│           │   ├── SetSelector.tsx
│           │   └── QualityBadge.tsx
│           └── hooks/
│               ├── useParseDVW.ts
│               └── useStats.ts
│
├── fixtures/
│   └── boulouris-sable.dvw         # Fichier réel de test (sample.dvw renommé)
│
└── docs/
    ├── ARCHITECTURE_FINALE.md      # CE FICHIER
    ├── DVW-FORMAT-SPEC.md
    └── PROMPTS_CLAUDE_CODE.md
```

---

## 2. Configuration Monorepo

### pnpm-workspace.yaml
```yaml
packages:
  - 'packages/*'
```

### package.json (racine)
```json
{
  "name": "volleyvision",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @volleyvision/viewer dev",
    "build": "pnpm -r build",
    "test": "vitest",
    "test:run": "vitest run",
    "lint": "eslint packages/*/src/**/*.ts"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "vitest": "^2.0",
    "eslint": "^9",
    "@typescript-eslint/eslint-plugin": "^8",
    "prettier": "^3"
  }
}
```

### tsconfig.base.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "paths": {
      "@volleyvision/data-model": ["../data-model/src"],
      "@volleyvision/dvw-parser": ["../dvw-parser/src"]
    }
  }
}
```

---

## 3. Graphe de dépendances entre packages

```
data-model  ←── dvw-parser
    ↑               ↑
    └───── viewer ───┘
               ↑
        firebase-bridge
```

- `data-model` : AUCUNE dépendance (zod uniquement)
- `dvw-parser` : dépend de `data-model`
- `viewer` : dépend de `data-model` + `dvw-parser`
- `firebase-bridge` : dépend de `data-model` + Firebase SDK

---

## 4. Data Model — Schémas Zod (validation runtime)

> Les interfaces TypeScript sont dans CLAUDE_v3.md.
> Ci-dessous : les schémas Zod correspondants pour la validation runtime du parser.

### packages/data-model/src/schemas.ts

```typescript
import { z } from 'zod';

// ========== ENUMS & PRIMITIVES ==========

export const SkillSchema = z.enum([
  'serve', 'receive', 'set', 'attack', 'block', 'dig', 'freeball'
]);

export const BallTypeSchema = z.enum(['H', 'M', 'Q', 'T', 'O', 'U']);

export const QualityProSchema = z.enum(['#', '+', '!', '-', '/', '=']);

export const QualitySimpleSchema = z.enum(['perfect', 'good', 'error']);

export const QualityLabelSchema = z.enum([
  'kill', 'positive', 'neutral', 'negative', 'poor', 'error'
]);

export const ReceiveEffectSchema = z.enum(['M', 'W', 'L', 'R', 'O']);

export const TeamSideSchema = z.enum(['home', 'away']);

export const SourceTypeSchema = z.enum([
  'dvw', 'firebase-live', 'parent-stat', 'manual'
]);

// ========== DVW SCOUT LINE ==========

export const DVWLineTypeSchema = z.enum([
  'action', 'point', 'rotation', 'substitution', 'timeout',
  'lineup', 'rotation-init', 'set-end', 'player-entry'
]);

export const DVWActionSchema = z.object({
  playerNumber: z.number().int().min(0).max(99),
  isTeamError: z.boolean(),
  isOpponentError: z.boolean(),
  skill: SkillSchema,
  ballType: BallTypeSchema,
  quality: QualityProSchema,
  attackCombo: z.string().length(2).optional(),
  setterCall: z.string().min(2).max(2).optional(),
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
  source: SourceTypeSchema,
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
  positionCategory: z.enum(['F', 'B', 'C', 'P', '-']).optional(),
});

export const SetterCallSchema = z.object({
  code: z.string().min(2).max(2),
  description: z.string(),
});

// ========== MATCH ==========

export const MatchSchema = z.object({
  id: z.string(),
  date: z.string(),  // ISO date
  competition: z.string(),
  category: z.string().optional(),
  venue: z.string().optional(),
  homeTeam: TeamSchema,
  awayTeam: TeamSchema,
  sets: z.array(SetDataSchema),
  result: z.object({
    homeWins: z.number().int().nonnegative(),
    awayWins: z.number().int().nonnegative(),
    winner: TeamSideSchema,
  }),
  videoSources: z.array(z.object({
    type: z.enum(['youtube', 'local', 'cloud']),
    url: z.string(),
    videoId: z.string().optional(),
    offsetSeconds: z.number().optional(),
    dvwLocalPath: z.string().optional(),
  })),
  timeouts: z.array(z.object({
    team: TeamSideSchema,
    setNumber: z.number().int(),
    homeScore: z.number().int().nonnegative(),
    awayScore: z.number().int().nonnegative(),
    timestamp: z.string().optional(),
    videoSeconds: z.number().nonnegative().optional(),
  })),
  substitutions: z.array(z.object({
    team: TeamSideSchema,
    playerOut: z.number().int(),
    playerIn: z.number().int(),
    setNumber: z.number().int(),
    homeScore: z.number().int().nonnegative().optional(),
    awayScore: z.number().int().nonnegative().optional(),
    timestamp: z.string().optional(),
    videoSeconds: z.number().nonnegative().optional(),
  })),
  source: z.object({
    type: SourceTypeSchema,
    importedAt: z.string(),
    dvwVersion: z.string().optional(),
    dvwSoftware: z.string().optional(),
    dvwEditor: z.string().optional(),
    dataCompleteness: z.enum(['full', 'points-only', 'simple-stats']),
  }),
  dvwMetadata: z.object({
    attackCombinations: z.array(AttackCombinationSchema),
    setterCalls: z.array(SetterCallSchema),
    videoPath: z.string().optional(),
  }).optional(),
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
  efficiency: z.number(), // (kills - errors) / total
  positiveRate: z.number(), // (kills + good) / total
});

export const PlayerMatchStatsSchema = z.object({
  matchId: z.string(),
  playerId: z.string(),
  date: z.string(),
  overall: SkillStatsSchema,
  bySet: z.record(z.coerce.number(), SkillStatsSchema),
  bySkill: z.record(SkillSchema, QualityDistributionSchema),
  bySetAndSkill: z.record(z.string(), QualityDistributionSchema),
  byRotation: z.record(z.coerce.number(), SkillStatsSchema).optional(),
  attackByCombo: z.record(z.string(), QualityDistributionSchema).optional(),
  serveByZone: z.record(z.coerce.number(), QualityDistributionSchema).optional(),
});
```

### packages/data-model/src/quality-mapper.ts

```typescript
import type { QualityPro, QualitySimple, QualityLabel } from './types';

export const QUALITY_PRO_TO_SIMPLE: Record<QualityPro, QualitySimple> = {
  '#': 'perfect',
  '+': 'good',
  '!': 'good',     // Pour la vue parent, ! est regroupé avec +
  '-': 'error',
  '/': 'error',
  '=': 'error',
};

export const QUALITY_PRO_TO_LABEL: Record<QualityPro, QualityLabel> = {
  '#': 'kill',
  '+': 'positive',
  '!': 'neutral',   // Pour la vue coach, ! est un niveau distinct
  '-': 'negative',
  '/': 'poor',
  '=': 'error',
};

export const QUALITY_LABEL_COLORS: Record<QualityLabel, string> = {
  kill:     '#22c55e',  // green-500
  positive: '#84cc16',  // lime-500
  neutral:  '#eab308',  // yellow-500
  negative: '#f97316',  // orange-500
  poor:     '#ef4444',  // red-500
  error:    '#dc2626',  // red-600
};

export const SKILL_CODE_MAP: Record<string, string> = {
  S: 'serve',
  R: 'receive',
  E: 'set',
  A: 'attack',
  B: 'block',
  D: 'dig',
  F: 'freeball',
};

export const BALL_TYPE_LABELS: Record<string, string> = {
  H: 'High ball',
  M: 'Medium',
  Q: 'Quick',
  T: 'Tempo',
  O: 'Overpass',
  U: 'Unknown',
};
```

### packages/data-model/src/constants.ts

```typescript
// Zones de terrain (vue standard DataVolley)
//
//  ┌─────────────────────────────┐
//  │     5     │   6   │    1    │  ← Arrière
//  │           │       │         │
//  ├───────────┼───────┼─────────┤
//  │     4     │   3   │    2    │  ← Avant
//  │           │       │         │
//  └─────────────────────────────┘
//        ← Filet de ce côté →
//
// Zones 7, 8, 9 = extensions arrière (pipe, back attack)
//  ┌─────────────────────────────┐
//  │     7     │   8   │    9    │  ← Derrière la ligne arrière
//  └─────────────────────────────┘

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

// Nombre de rallies attendu par set = somme des scores
// Set 25-20 → 45 rallies, Set 25-23 → 48, Set 15-7 → 22
export const VOLLEYBALL_RULES = {
  POINTS_TO_WIN_SET: 25,
  POINTS_TO_WIN_TIEBREAK: 15,
  MIN_LEAD: 2,
  MAX_SETS: 5,
  TIEBREAK_SET: 5,
  MAX_TIMEOUTS_PER_SET: 2,
  MAX_SUBSTITUTIONS_PER_SET: 6,
  TECHNICAL_TIMEOUT_SCORES: [8, 16], // Jalons techniques
};
```

---

## 5. Algorithmes clés

### 5.1 Section Splitter

```
Entrée : contenu texte brut du fichier .dvw
Sortie : Map<string, string[]>

Algorithme :
1. Lire ligne par ligne
2. Si ligne commence par [3xxx] → nouvelle section, nom = contenu entre crochets
3. Lignes suivantes → ajoutées au tableau de la section courante
4. Ignorer les lignes vides
5. Section [3SCOUT] = tout après le marqueur, jusqu'à la fin du fichier
```

### 5.2 Rally Builder

```
Entrée : DVWScoutLine[] (lignes parsées de [3SCOUT])
Sortie : { rallies: Rally[], timeouts: Timeout[], substitutions: Substitution[] }

Algorithme :
1. Initialiser currentRallyActions = []
2. Pour chaque DVWScoutLine :
   a. Si type === 'set-end' → sauver le set précédent, reset
   b. Si type === 'lineup' ou 'rotation-init' → stocker pour le prochain rally
   c. Si type === 'timeout' → ajouter à la liste des timeouts
   d. Si type === 'substitution' → ajouter à la liste, ET mettre à jour les positions
   e. Si type === 'rotation' → mettre à jour la rotation courante
   f. Si type === 'point' → FERMER le rally :
      - Créer Rally avec currentRallyActions
      - Score before = score avant ce point
      - Score after = score du point
      - pointWinner = équipe qui marque
      - servingTeam = déduit de la 1ère action de type 'serve'
      - Reset currentRallyActions
   g. Si type === 'action' → ajouter à currentRallyActions

Règle de dédoublonnage des points :
- Un point marker (*p ou ap) est TOUJOURS précédé de l'action qui le cause
- L'action causale a souvent le modifier ;p; ou ;s;
```

### 5.3 Action Regex

```
Pattern principal pour une action DVW :
^([a*])                         # Team : a=away, *=home
(\$\$|\d{2})                    # Player : $$ ou numéro 2 chiffres
([&]?)                          # Opponent error flag (optionnel)
([SREADBF])                     # Skill
([HMQTOU])                      # Ball type
([#\+!\-/=])                    # Quality
([A-Z][A-Z0-9])?                # Attack combo code (optionnel, 2 chars)
(~)                             # Séparateur zone
(~{3}|\d{2})?                   # Zones : ~~ = pas de zone, XY = start+end
([A-D])?                        # Sub-zone (optionnel)
(~~?[NHTPW]?)?                  # Effect / Net indicator
(\d)?                           # Num blockers (optionnel)

Les modifiers sont APRÈS le premier ; :
;(s|p)?;(r|s|p)?;...;HH.MM.SS;set;homeRot;awayRot;...
```

---

## 6. Flux de données Phase 1 complet

```
Utilisateur glisse fichier .dvw
          │
          ▼
   ImportPage.tsx
          │ FileReader.readAsText()
          ▼
   parseDVW(content)
          │
          ├──► sectionSplitter.split(content) → Map<section, lines>
          │
          ├──► headerParser.parse(sections) → { date, competition, dvwVersion, videoPath }
          │
          ├──► teamsParser.parse(sections) → { homeTeam, awayTeam } avec joueurs
          │
          ├──► setsParser.parse(sections) → SetData[] (scores seulement)
          │
          ├──► attackCombosParser.parse(sections) → AttackCombination[]
          │
          ├──► setterCallsParser.parse(sections) → SetterCall[]
          │
          ├──► scoutParser.parse(sections['[3SCOUT]']) → DVWScoutLine[]
          │         │
          │         ├── lineClassifier(line) → DVWLineType
          │         ├── actionParser(line) → DVWAction (si action)
          │         └── metaParser(line) → { timestamp, set, rotations, positions }
          │
          ├──► rallyBuilder.build(scoutLines) → Rally[]
          │
          └──► Assemble tout dans Match
                    │
                    ▼
             Zustand matchStore
                    │
                    ▼
          AnalysisPage.tsx
             ├── statsCalculator(match) → PlayerMatchStats[]
             ├── StatsTable (joueur × skill × qualité)
             ├── ScoreBoard (scores par set)
             └── Filtres (joueur, set, skill)
```

---

## 7. Décisions architecturales

| Décision | Choix | Justification |
|----------|-------|---------------|
| Parser côté client |  | Pas de backend nécessaire pour Phase 1, parsing instantané |
| Zod validation |  | Attraper les erreurs de format DVW au runtime, messages clairs |
| Monorepo pnpm |  | Packages indépendants, imports typés, build incrémental |
| Zustand (pas Redux) |  | Moins de boilerplate, API simple, suffisant pour le scope |
| Vitest (pas Jest) |  | Natif Vite, plus rapide, même API |
| Tailwind (pas CSS modules) |  | Prototypage rapide, design system cohérent |
| IDs générés par `crypto.randomUUID()` |  | Standard navigateur, pas de lib externe |
| Pas de Firebase en Phase 1 |  | Tout en mémoire, zero config, zero coût |
| DVW fixture dans le repo |  | Tests reproductibles, CI possible |

---

## 8. Critères de succès Phase 1

| Critère | Mesure | Seuil |
|---------|--------|-------|
| Parsing sans erreur | 0 exceptions sur fichier réel | 100% |
| Lignes parsées | DVWScoutLine[] count | ~830 lignes |
| Rallies construits | Sum(scores) = rallies per set | 45 + 48 + 22 = 115 |
| Joueurs identifiés | Players parsés vs attendus | 12 + 14 = 26 |
| Libéros détectés | isLibero flag correct | 1 + 1 = 2 libéros |
| Temps de parsing | parseDVW() execution | < 100ms |
| Stats calculées | Efficacité par joueur cohérente | ±1% vs DataVolley |
| Tests unitaires | Coverage parser | > 90% |
| UI fonctionnelle | Import → stats en 2 clics | < 3s total |
