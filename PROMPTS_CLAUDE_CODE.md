# PROMPTS CLAUDE CODE — VolleyVision

> Guide d'implémentation pas à pas pour Claude Code.
> Chaque prompt est autonome : coller dans Claude Code dans l'ordre.
> Pré-requis : CLAUDE_v3.md + DVW-FORMAT-SPEC.md + ARCHITECTURE_FINALE.md + sample.dvw dans le dossier.

---

## 🔧 PROMPT 0 — Initialisation du monorepo

```
Tu es dans un projet VolleyVision. Initialise le monorepo pnpm avec la structure suivante.

CONTEXTE : Lis CLAUDE_v3.md (contexte complet du projet), ARCHITECTURE_FINALE.md (architecture technique),
et DVW-FORMAT-SPEC.md (format du fichier DVW qu'on va parser).

TÂCHES :
1. Crée pnpm-workspace.yaml avec `packages: ['packages/*']`

2. Crée package.json racine :
   - name: "volleyvision", private: true
   - scripts: dev, build, test, test:run, lint
   - devDependencies: typescript ^5.4, vitest ^2.0, eslint ^9, prettier ^3

3. Crée tsconfig.base.json :
   - target ES2022, module ESNext, moduleResolution bundler
   - strict: true, noImplicitAny: true
   - paths: @volleyvision/data-model, @volleyvision/dvw-parser

4. Crée vitest.config.ts à la racine avec :
   - test.globals: true
   - test.include: ['packages/*/src/**/*.test.ts', 'packages/*/tests/**/*.test.ts']

5. Crée packages/data-model/package.json :
   - name: "@volleyvision/data-model"
   - main: "src/index.ts"
   - dependencies: zod ^3.23

6. Crée packages/data-model/tsconfig.json qui extends ../../tsconfig.base.json

7. Crée packages/dvw-parser/package.json :
   - name: "@volleyvision/dvw-parser"
   - main: "src/index.ts"
   - dependencies: "@volleyvision/data-model": "workspace:*"
   - devDependencies: vitest

8. Crée packages/dvw-parser/tsconfig.json

9. Copie le fichier sample.dvw dans fixtures/boulouris-sable.dvw

10. Exécute `pnpm install`

NE CRÉE PAS encore les fichiers sources .ts — on le fera dans les prompts suivants.
Assure-toi que `pnpm test` fonctionne (même sans tests pour l'instant).
```

---

## 📦 PROMPT 1A — Data Model (types + schemas + mappers)

```
Implémente le package @volleyvision/data-model.

CONTEXTE : Lis ARCHITECTURE_FINALE.md section 4 "Data Model — Schémas Zod" pour les schemas complets,
et CLAUDE_v3.md section "Modèle de données TypeScript" pour les interfaces.

FICHIERS À CRÉER :

1. packages/data-model/src/types.ts
   Toutes les interfaces TypeScript de CLAUDE_v3.md :
   - Skill, BallType, QualityPro, QualitySimple, QualityLabel, ReceiveEffect
   - DVWLineType, DVWScoutLine, DVWAction
   - Match, Team, Player, SetData, Rally, Action, PlayerRotation
   - AttackCombination, SetterCall
   - TimeoutEvent, SubstitutionEvent
   - VideoSource, MatchPlayerContext, PhysicalTest
   - PlayerMatchStats, SkillStats, QualityDistribution

2. packages/data-model/src/schemas.ts
   Schémas Zod correspondants — copie l'intégralité depuis ARCHITECTURE_FINALE.md section 4.

3. packages/data-model/src/quality-mapper.ts
   Les mappings de qualité — copie depuis ARCHITECTURE_FINALE.md.
   Ajoute :
   - SKILL_CODE_MAP : { S: 'serve', R: 'receive', E: 'set', A: 'attack', B: 'block', D: 'dig', F: 'freeball' }
   - BALL_TYPE_LABELS : { H: 'High ball', M: 'Medium', ... }
   - Fonctions utilitaires :
     - toSimple(q: QualityPro): QualitySimple
     - toLabel(q: QualityPro): QualityLabel
     - skillFromCode(code: string): Skill | undefined
     - isPositive(q: QualityPro): boolean  → true si # ou +
     - isNegative(q: QualityPro): boolean  → true si -, / ou =

4. packages/data-model/src/constants.ts
   Les constantes — copie depuis ARCHITECTURE_FINALE.md.
   ZONE_COORDINATES et VOLLEYBALL_RULES.

5. packages/data-model/src/index.ts
   Re-exporte tout : export * from './types', './schemas', './quality-mapper', './constants'

VALIDATION :
- `pnpm tsc --noEmit -p packages/data-model` doit passer sans erreur
- Pas de `any` nulle part
```

---

## 🔪 PROMPT 1B — Section Splitter

```
Implémente le Section Splitter du DVW parser.

CONTEXTE :
- Lis DVW-FORMAT-SPEC.md pour la structure du fichier DVW
- Lis fixtures/boulouris-sable.dvw pour voir le vrai format
- Le fichier DVW est en texte brut, avec des sections [3NOM_SECTION]

FICHIER À CRÉER : packages/dvw-parser/src/section-splitter.ts

SPÉCIFICATION :

export interface DVWSections {
  dataVolleyScout: string[];     // Lignes après [3DATAVOLLEYSCOUT]
  match: string[];               // Lignes après [3MATCH]
  more: string[];                // Lignes après [3MORE] (si existe)
  teams: string[];               // Lignes après [3TEAMS]
  playersHome: string[];         // Lignes après [3PLAYERS-H]
  playersAway: string[];         // Lignes après [3PLAYERS-V]
  sets: string[];                // Lignes après [3SET]
  attackCombinations: string[];  // Lignes après [3ATTACKCOMBINATION]
  setterCalls: string[];         // Lignes après [3SETTERCALL]
  winningSymbols: string[];      // Lignes après [3WINNINGSYMBOLS]
  reserve: string[];             // Lignes après [3RESERVE]
  video: string[];               // Lignes après [3VIDEO]
  scout: string[];               // Lignes après [3SCOUT]
}

export function splitSections(content: string): DVWSections;

ALGORITHME :
1. Séparer le contenu par lignes (gérer \r\n et \n)
2. Parcourir les lignes séquentiellement
3. Quand une ligne commence par [3 → nouvelle section
4. Ajouter les lignes suivantes à cette section
5. Ignorer les lignes vides dans chaque section
6. La section [3SCOUT] est la plus grande (600+ lignes)

TESTS À CRÉER : packages/dvw-parser/tests/section-splitter.test.ts

import { readFileSync } from 'fs';
import { splitSections } from '../src/section-splitter';

const dvwContent = readFileSync('fixtures/boulouris-sable.dvw', 'utf-8');

Tests :
1. "doit retourner toutes les sections attendues"
   - Vérifier que chaque propriété de DVWSections est un tableau non-vide
   - SAUF reserve et more qui peuvent être vides

2. "section dataVolleyScout contient FILEFORMAT"
   - Vérifier qu'une ligne contient "FILEFORMAT: 2.0"

3. "section teams contient 2 lignes"
   - teams.length === 2

4. "section playersHome contient 12 joueurs"
   - playersHome.length === 12

5. "section playersAway contient 14 joueurs"
   - playersAway.length === 14

6. "section sets contient 5 lignes" (toujours 5, même si 3 sets joués)
   - sets.length === 5

7. "section scout est la plus grande"
   - scout.length > 600

8. "section video contient le chemin"
   - video[0] doit contenir "Camera0="

Exécute les tests avec `pnpm vitest run` et vérifie qu'ils passent tous.
```

---

## 👥 PROMPT 1C — Header + Teams + Sets Parsers

```
Implémente les parsers de sections header du DVW.

CONTEXTE :
- Lis DVW-FORMAT-SPEC.md sections 2 à 6 pour les formats réels
- Utilise splitSections() du prompt précédent comme entrée
- Les types sont dans @volleyvision/data-model

FICHIERS À CRÉER :

1. packages/dvw-parser/src/sections/header.ts

   export interface DVWHeader {
     fileFormat: string;           // "2.0"
     software: string;             // "Data Volley Professional Release 4.03.17"
     editor: string;               // "FEDERATION FRANCAISE DE VOLLEYBALL"
     createdAt: string;            // "27/01/2026 18.13.18"
     modifiedAt: string;           // "28/01/2026 19.10.39"
   }

   export interface DVWMatchInfo {
     date: string;                 // ISO: "2026-01-27"
     season: string;               // "2015/2016"
     competition: string;          // "INTERPOLE SUD"
   }

   export function parseHeader(lines: string[]): DVWHeader;
   export function parseMatchInfo(lines: string[]): DVWMatchInfo;

   Pour parseHeader : les lignes sont au format "KEY: VALUE"
   Pour parseMatchInfo : la ligne est séparée par ; — voir DVW-FORMAT-SPEC section 3
   La date est en DD/MM/YYYY → convertir en ISO YYYY-MM-DD

2. packages/dvw-parser/src/sections/teams.ts

   import { Team, Player } from '@volleyvision/data-model';

   export function parseTeams(teamLines: string[]): { home: Pick<Team,'name'|'code'|'coach'|'assistantCoach'>, away: Pick<Team,'name'|'code'|'coach'|'assistantCoach'> };
   export function parsePlayers(playerLines: string[], side: 'home' | 'away'): Player[];

   Format réel [3TEAMS] : CODE;NOM;?;COACH;ASSISTANT;FEDERATION_ID;hex...
   Format réel [3PLAYERS] : TEAM_IDX;JERSEY;ROSTER_IDX;ROT_SET1;ROT_SET2;ROT_SET3;;;ABBR;LAST;FIRST;;POSITION;ROLE_CODE;STARTER;...

   Pour parsePlayers :
   - Champ 0 = team index (0=home, 1=away) → ignorer (on reçoit déjà la side)
   - Champ 1 = numéro de maillot → player.number
   - Champ 9 = nom → player.lastName
   - Champ 10 = prénom → player.firstName
   - Champ 12 = "L" si libéro, vide sinon → player.isLibero
   - Champ 8 = abréviation → utiliser pour générer l'id : "TEAM-JERSEY" (ex: "home-7")
   - Champs 3-5 = rotations par set : 1-6 = titulaire en position N, * = remplaçant, vide = absent
   - L'id du joueur sera : `${side}-${jerseyNumber}` (ex: "away-7")

3. packages/dvw-parser/src/sections/sets.ts

   import { SetData } from '@volleyvision/data-model';

   export function parseSets(setLines: string[]): SetData[];

   Format réel [3SET] : True; 8- 5;13-16;21-19;25-20;25;
   - "True" = set joué (si les champs scores sont vides, set non joué → filtrer)
   - Scores avec espaces possibles (" 8- 5") → trim
   - Score final = champ 4 (ex: "25-20")
   - Si champ 4 vide, le set n'a pas été joué → ne pas inclure
   - Rallies sera rempli plus tard par le rally builder, initialiser à []

4. packages/dvw-parser/src/sections/attack-combos.ts

   import { AttackCombination } from '@volleyvision/data-model';

   export function parseAttackCombinations(lines: string[]): AttackCombination[];

   Format réel : CODE;ZONE;SIDE;TEMPO;DESCRIPTION;;COLOR;COORDS;POSITION_CAT;;
   - code = champ 0
   - startZone = parseInt(champ 1) (peut être vide)
   - side = champ 2 (L/R/C)
   - tempo = champ 3 (Q/H/T/O/U)
   - description = champ 4
   - positionCategory = champ 8 (F/B/C/P/-)

5. packages/dvw-parser/src/sections/setter-calls.ts

   import { SetterCall } from '@volleyvision/data-model';

   export function parseSetterCalls(lines: string[]): SetterCall[];

   Format : CODE;;DESCRIPTION;;...
   - code = champ 0
   - description = champ 2

6. packages/dvw-parser/src/sections/video.ts

   export function parseVideoPath(lines: string[]): string | undefined;
   → Extraire le chemin après "Camera0=" (ou CameraN=)

TESTS : packages/dvw-parser/tests/sections.test.ts

Charge fixtures/boulouris-sable.dvw, split les sections, puis :

1. "parseHeader retourne la version 2.0"
2. "parseMatchInfo retourne la date 2026-01-27 et INTERPOLE SUD"
3. "parseTeams retourne POLE BOULOURIS et POLE SABLE"
4. "parseTeams retourne les coachs VIAL FABRICE et BOUVET OLIVIER"
5. "parsePlayers home retourne 12 joueurs"
6. "parsePlayers away retourne 14 joueurs"
7. "joueur #30 Vial Lycia est libéro" (isLibero === true)
8. "joueur #2 Zimaglia Mélina (away) est libéro"
9. "joueur #7 (away) est Prou Julia"
10. "parseSets retourne 3 sets joués"
11. "set 1 score final 25-20"
12. "set 3 score final 15-7"
13. "parseAttackCombinations retourne 20+ codes"
14. "combo CA a startZone=3, side=L, tempo=Q"
15. "combo Z1 a positionCategory=P (pipe)"
16. "parseVideoPath retourne le chemin mp4"

Exécute les tests et corrige jusqu'à ce qu'ils passent tous.
```

---

## 🔬 PROMPT 1D — Scout Line Parser (le cœur du parser)

```
Implémente le parser de lignes scout DVW — c'est la partie la plus complexe.

CONTEXTE :
- Lis DVW-FORMAT-SPEC.md sections 10 à 17 pour le format détaillé
- Lis les 30 premières lignes de [3SCOUT] dans fixtures/boulouris-sable.dvw
- Les types DVWScoutLine et DVWAction sont dans @volleyvision/data-model

FICHIERS À CRÉER :

1. packages/dvw-parser/src/scout/line-classifier.ts

   export function classifyLine(line: string): DVWLineType | null;

   Règles de classification (dans cet ordre) :
   - Commence par "**" et finit par "set" → 'set-end'  (ex: "**1set")
   - Contient ">LUp" → si commence par xP (où x = a ou *) → 'lineup'
                       → si commence par xz → 'rotation-init'
   - Commence par [a*]P\d{2} (sans >LUp) → 'player-entry'
   - Pattern [a*]p\d{2}:\d{2} → 'point'  (ex: "*p25:20")
   - Pattern [a*]z\d → 'rotation'  (ex: "*z4")
   - Pattern [a*]c\d{2}:\d{2} → 'substitution'  (ex: "*c08:06")
   - Pattern [a*]T → 'timeout'
   - Pattern [a*]\d{2} ou [a*]\$\$ → 'action'
   - Sinon → null (ligne non reconnue)

2. packages/dvw-parser/src/scout/action-parser.ts

   import { DVWAction, Skill, BallType, QualityPro } from '@volleyvision/data-model';
   import { SKILL_CODE_MAP } from '@volleyvision/data-model';

   export function parseAction(actionCode: string): DVWAction;

   L'actionCode est la PREMIÈRE partie de la ligne (avant le premier ;)
   Exemples :
     "a07AH#V5~47CH2"     → attack, player 7, quality #, combo V5, zones 4→7, subzone C, 2 blockers
     "*13SM-~~~16C"        → serve, player 13, quality -, zones ?→1→6, subzone C
     "a$$&H#"             → team error, opponent error flag
     "*09AU#XC~25AH2;s;r"  → NE PAS parser au-delà du ;, le ; est le séparateur

   ALGORITHME :
   a. Extraire team prefix : actionCode[0] → 'a' = away, '*' = home
   b. Extraire player : actionCode[1..2]
      - Si "$$" → playerNumber: 0, isTeamError: true
      - Sinon → parseInt
   c. Position 3 : vérifier si "&" (opponent error) → isOpponentError: true, décaler les indices
   d. Skill : caractère après player (ou après &)
      - Mapper via SKILL_CODE_MAP : S→serve, R→receive, etc.
   e. BallType : caractère suivant (H/M/Q/T/O/U)
   f. Quality : caractère suivant (#/+/!/−/=/−)
   g. Attack combo : 2 caractères suivants SI ce n'est pas ~ ou fin de string
      - Les combos commencent par une lettre majuscule : C1, V5, XC, Z1, PP, etc.
      - Le setter call commence par K : K0, K1, KA, etc. → setterCall
   h. Séparateur ~ : marque le début des zones
   i. Zones après ~ :
      - "~~~" ou "~~~~" → pas de zone
      - "XX" → premier chiffre = startZone, second = endZone
      - Un seul chiffre possible pour des cas edge
   j. Après les zones :
      - Lettre A-D → endSubZone
      - "~~N" → inNet: true
      - Caractère H/T/P/N/W après la subzone → endEffect
      - Chiffre 0-3 → numBlockers
   k. Modifiers : vides pour cette fonction (seront parsés séparément)

   ATTENTION : la regex doit être robuste car les lignes sont très variées.
   Approche recommandée : parser caractère par caractère plutôt qu'une seule regex.

3. packages/dvw-parser/src/scout/meta-parser.ts

   export interface DVWLineMeta {
     timestamp?: string;          // HH.MM.SS
     setNumber?: number;
     homeRotation?: number;
     awayRotation?: number;
     videoSeconds?: number;
     homePositions?: number[];
     awayPositions?: number[];
     modifiers: {
       skillFocus?: boolean;
       pointScored?: boolean;
       rallyContinuation?: boolean;
     };
   }

   export function parseMeta(fields: string[]): DVWLineMeta;

   La ligne complète est séparée par ; en 20+ champs :
   [ACTION];[mod1];[mod2];[mod3];[mod4];[mod5];[mod6];TIMESTAMP;SET;HOME_ROT;AWAY_ROT;?;VIDEO_FRAME;;P1;P2;P3;P4;P5;P6;P7;P8;P9;P10;P11;P12;

   - fields[0] = action code (déjà parsé)
   - fields[1..6] = modifiers (s, r, p, ou vide)
   - fields[7] = timestamp HH.MM.SS (peut être vide pour lineup/rotation)
   - fields[8] = set number
   - fields[9] = home rotation (1-6)
   - fields[10] = away rotation (1-6)
   - fields[11] = ? (toujours 1)
   - fields[12] = video seconds/frame
   - fields[13] = vide
   - fields[14..19] = home positions P1-P6 (numéros joueurs)
   - fields[20..25] = away positions P1-P6

   Modifiers :
   - "s" dans les champs 1-6 → skillFocus: true
   - "p" dans les champs 1-6 → pointScored: true
   - "r" dans les champs 1-6 → rallyContinuation: true

4. packages/dvw-parser/src/scout/line-parser.ts

   import { DVWScoutLine } from '@volleyvision/data-model';

   export function parseScoutLine(rawLine: string, lineNumber: number): DVWScoutLine | null;

   Orchestre :
   1. classifyLine(rawLine) → type
   2. Si null → return null
   3. Si type === 'action' → parseAction(premier champ) + parseMeta(tous les champs)
   4. Si type === 'point' → extraire scores (regex: /[a*]p(\d+):(\d+)/) + parseMeta
   5. Si type === 'rotation' → extraire rotation number + parseMeta
   6. Si type === 'substitution' → extraire playerOut:playerIn + parseMeta
   7. Si type === 'set-end' → extraire set number (ex: "**2set" → 2)
   8. Si type === 'lineup' → extraire player number
   9. Si type === 'rotation-init' → extraire rotation number
   10. Si type === 'timeout' → extraire team

   export function parseAllScoutLines(lines: string[]): DVWScoutLine[];
   → Appelle parseScoutLine sur chaque ligne, filtre les null

TESTS : packages/dvw-parser/tests/scout-parser.test.ts

Tests unitaires pour classifyLine :
1. 'classifie "*13SM-~~~16C" comme action'
2. 'classifie "*p25:20" comme point'
3. 'classifie "*z4" comme rotation'
4. 'classifie "*c08:06" comme substitution'
5. 'classifie "*P13>LUp" comme lineup'
6. 'classifie "*z1>LUp" comme rotation-init'
7. 'classifie "**1set" comme set-end'
8. 'classifie "*T" comme timeout'

Tests unitaires pour parseAction :
9. 'parse "*13SM-~~~16C" : serve, player 13, quality -, endZone 6'
10. 'parse "a07AH#V5~47CH2" : attack, player 7, quality #, combo V5, zones 4→7, subzone C, 2 blockers'
11. 'parse "a$$&H#" : isTeamError true, isOpponentError true'
12. 'parse "*02SM=~~~51C~~N" : inNet true' (si ce pattern existe dans le fichier)
13. 'parse "*13EH+K0F~3B" : set skill, setterCall K0, endZone 3, subzone B'
14. 'parse "a09AH/V5~46~H2" : attack, combo V5, zones 4→6, 2 blockers'

Tests d'intégration sur le fichier réel :
15. 'parse toutes les lignes scout sans exception'
    - Charger le fichier, split sections, parseAllScoutLines
    - Aucune exception levée
    - Nombre de lignes parsées > 600
16. 'nombre d'actions de type point cohérent avec les scores'
    - Compter les DVWScoutLine de type 'point'
    - Doit être = 25+20 + 25+23 + 15+7 = 115
17. 'nombre de set-end = 3'
18. 'le premier service est bien un serve avec le bon joueur'

IMPORTANT : Quand une ligne pose problème au parsing, NE PAS crasher.
Logger un warning et retourner null. Le parser doit être robuste.

Exécute les tests et itère jusqu'à ce qu'ils passent tous.
```

---

## 🏐 PROMPT 1E — Rally Builder

```
Implémente le Rally Builder qui regroupe les DVWScoutLine[] en Rally[].

CONTEXTE :
- Lis ARCHITECTURE_FINALE.md section 5.2 pour l'algorithme
- Un rally = séquence d'actions entre deux points marqués
- Le rally commence au service et finit au point

FICHIER À CRÉER : packages/dvw-parser/src/scout/rally-builder.ts

import { DVWScoutLine, Rally, Action, SetData, TimeoutEvent, SubstitutionEvent } from '@volleyvision/data-model';

export interface BuildResult {
  ralliesBySet: Map<number, Rally[]>;
  timeouts: TimeoutEvent[];
  substitutions: SubstitutionEvent[];
}

export function buildRallies(lines: DVWScoutLine[]): BuildResult;

ALGORITHME DÉTAILLÉ :

1. Variables d'état :
   - currentSet = 1
   - currentActions: DVWAction-based Action[] = []
   - currentScoreHome = 0, currentScoreAway = 0
   - rallyCounter = 0 (par set)
   - pendingLineup: { home: PlayerRotation, away: PlayerRotation } = null
   - pendingRotation: { home: number, away: number } = { home: 1, away: 1 }
   - allTimeouts: TimeoutEvent[] = []
   - allSubstitutions: SubstitutionEvent[] = []
   - ralliesBySet: Map<number, Rally[]> = new Map()

2. Pour chaque DVWScoutLine en séquence :

   a. Si type === 'set-end' :
      - currentSet++
      - Reset : rallyCounter = 0, currentScoreHome = 0, currentScoreAway = 0
      - Continuer

   b. Si type === 'lineup' :
      - Stocker le joueur dans le pending lineup pour ce set
      - Continuer

   c. Si type === 'rotation-init' :
      - Stocker la rotation de départ
      - Continuer

   d. Si type === 'timeout' :
      - Ajouter à allTimeouts { team, setNumber: currentSet, homeScore: currentScoreHome, awayScore: currentScoreAway, timestamp, videoSeconds }
      - Continuer

   e. Si type === 'substitution' :
      - Ajouter à allSubstitutions
      - Continuer

   f. Si type === 'rotation' :
      - Mettre à jour pendingRotation[team]
      - Continuer (la rotation arrive APRÈS le point, donc c'est pour le PROCHAIN rally)

   g. Si type === 'action' :
      - Convertir DVWAction → Action :
        - id: crypto.randomUUID() (ou `rally-${rallyCounter}-action-${i}`)
        - rallyId: sera rempli après
        - sequenceOrder: currentActions.length
        - player: { id: `${team}-${playerNumber}`, number: playerNumber, team }
        - skill, quality, ballType, etc. depuis DVWAction
        - videoTimestamp: line.videoSeconds
        - source: 'dvw'
      - Ajouter à currentActions

   h. Si type === 'point' :
      - FERMER le rally :
        - rallyCounter++
        - servingTeam = déduit de la première action dont le skill === 'serve'
        - pointWinner = team du point marker
        - scoresBefore = { currentScoreHome, currentScoreAway }
        - Mettre à jour les scores : si pointWinner === 'home' → currentScoreHome++, sinon currentScoreAway++
        - scoresAfter = { currentScoreHome, currentScoreAway }
        - Créer Rally :
          - id: `set${currentSet}-rally${rallyCounter}`
          - setNumber: currentSet
          - rallyNumber: rallyCounter
          - homeScoreBefore, awayScoreBefore, homeScoreAfter, awayScoreAfter
          - servingTeam
          - pointWinner
          - actions: [...currentActions]
          - videoTimestamp: première action.videoTimestamp
          - endVideoTimestamp: dernière action.videoTimestamp
          - rotation: snapshot de pendingRotation au moment du rally
        - Ajouter le rally à ralliesBySet.get(currentSet) || []
        - Reset currentActions = []

3. Retourner { ralliesBySet, timeouts, substitutions }

TESTS : packages/dvw-parser/tests/rally-builder.test.ts

Charge le fichier réel, split, parseAllScoutLines, puis buildRallies :

1. "set 1 contient 45 rallies" (25 + 20 = 45)
2. "set 2 contient 48 rallies" (25 + 23 = 48)
3. "set 3 contient 22 rallies" (15 + 7 = 22)
4. "total rallies = 115"
5. "chaque rally a au moins 1 action"
6. "le premier rally du set 1 a un service comme première action"
7. "servingTeam alterne correctement (après le point, l'autre équipe sert si rotation)"
8. "les scores sont cohérents : le dernier rally du set 1 a scoreAfter 25-20 (ou 20-25)"
9. "les timeouts sont capturés"
10. "les substitutions sont capturées"
11. "les positions P1-P6 sont présentes dans les rallies"

ATTENTION : Si le nombre de rallies ne correspond pas exactement, c'est OK à ±1.
Le set marker ("**1set") arrive APRÈS le dernier point du set.
Le premier point de chaque set n'a pas de point marker avant lui — gérer ce cas.

Exécute les tests et itère.
```

---

## 📊 PROMPT 1F — Stats Calculator + Assemblage final parseDVW()

```
Implémente le calculateur de stats et la fonction principale parseDVW().

CONTEXTE :
- Les types PlayerMatchStats, SkillStats, QualityDistribution sont dans @volleyvision/data-model
- parseDVW() orchestre tous les parsers et retourne un Match complet

FICHIERS À CRÉER :

1. packages/dvw-parser/src/stats/calculator.ts

   import { Match, Rally, Action, PlayerMatchStats, SkillStats, QualityDistribution, Skill, QualityPro } from '@volleyvision/data-model';
   import { QUALITY_PRO_TO_SIMPLE } from '@volleyvision/data-model';

   export function calculatePlayerStats(match: Match): PlayerMatchStats[];

   ALGORITHME :
   1. Pour chaque joueur unique dans toutes les actions de tous les rallies :
   2. Collecter TOUTES ses actions
   3. Calculer :
      a. overall: SkillStats
         - totalActions = nombre total
         - kills = actions avec quality '#'
         - errors = actions avec quality '/' ou '='
         - efficiency = (kills - errors) / totalActions (ou 0 si totalActions === 0)
         - positiveRate = (# + +) / totalActions
      b. bySet: pour chaque set, même calcul
      c. bySkill: pour chaque Skill, distribution des qualités (#, +, !, -, /, =, perfect, good, error)
      d. bySetAndSkill: clé = "set1-serve", même distribution

   Fonction helper :
   export function createEmptyDistribution(): QualityDistribution {
     return { total: 0, '#': 0, '+': 0, '!': 0, '-': 0, '/': 0, '=': 0, perfect: 0, good: 0, error: 0 };
   }

   export function addToDistribution(dist: QualityDistribution, quality: QualityPro): void {
     dist.total++;
     dist[quality]++;
     const simple = QUALITY_PRO_TO_SIMPLE[quality];
     dist[simple]++;
   }

2. packages/dvw-parser/src/index.ts — LA FONCTION PRINCIPALE

   import { Match } from '@volleyvision/data-model';

   export function parseDVW(content: string): Match;

   Orchestre :
   1. const sections = splitSections(content);
   2. const header = parseHeader(sections.dataVolleyScout);
   3. const matchInfo = parseMatchInfo(sections.match);
   4. const { home: homeTeamInfo, away: awayTeamInfo } = parseTeams(sections.teams);
   5. const homePlayers = parsePlayers(sections.playersHome, 'home');
   6. const awayPlayers = parsePlayers(sections.playersAway, 'away');
   7. const setsData = parseSets(sections.sets);
   8. const attackCombos = parseAttackCombinations(sections.attackCombinations);
   9. const setterCallsList = parseSetterCalls(sections.setterCalls);
   10. const videoPath = parseVideoPath(sections.video);
   11. const scoutLines = parseAllScoutLines(sections.scout);
   12. const { ralliesBySet, timeouts, substitutions } = buildRallies(scoutLines);
   13. Injecter les rallies dans les SetData correspondants
   14. Déterminer le winner global
   15. Assembler et retourner le Match complet

   L'id du match sera généré par :
   `${matchInfo.date}-${homeTeamInfo.code}-${awayTeamInfo.code}` (ex: "2026-01-27-BOU-SAB")

3. Réexporter depuis packages/dvw-parser/src/index.ts :
   export { parseDVW } from './index';
   export { splitSections } from './section-splitter';
   export { calculatePlayerStats } from './stats/calculator';

TESTS : packages/dvw-parser/tests/full-parse.test.ts

1. "parseDVW retourne un Match valide"
   - Pas d'exception
   - match.id contient "BOU" et "SAB"

2. "match a la bonne date"
   - match.date === "2026-01-27"

3. "match a les bonnes équipes"
   - match.homeTeam.name === "POLE BOULOURIS"
   - match.awayTeam.name === "POLE SABLE"

4. "match a 3 sets"
   - match.sets.length === 3

5. "set 1 a les bons scores"
   - match.sets[0].homeScore + match.sets[0].awayScore === 45

6. "résultat 3-0 pour Boulouris"
   - match.result.homeWins === 3
   - match.result.awayWins === 0

7. "chaque set a des rallies"
   - match.sets.forEach(s => expect(s.rallies.length).toBeGreaterThan(0))

8. "14 joueurs Sablé parsés"
   - match.awayTeam.players.length === 14

9. "attack combinations parsées"
   - match.dvwMetadata.attackCombinations.length > 15

10. "calculatePlayerStats retourne des stats pour chaque joueur"
    - const stats = calculatePlayerStats(match);
    - stats.length > 20 (tous les joueurs ayant au moins 1 action)

11. "stats de Julia Prou (#7 away) cohérentes"
    - Trouver ses stats
    - Elle a des attaques (skill === 'attack')
    - Son nombre total d'actions > 10

12. "validation Zod du Match"
    - import { MatchSchema } from '@volleyvision/data-model';
    - MatchSchema.parse(match) ne throw pas

Exécute tous les tests de tout le package avec `pnpm vitest run`.
Corrige les erreurs jusqu'à 100% de tests passés.
```

---

## 🖥️ PROMPT 1G — Viewer React (dashboard basique)

```
Implémente l'app React minimale pour visualiser les stats d'un fichier DVW importé.

CONTEXTE :
- @volleyvision/dvw-parser fonctionne et produit un Match
- @volleyvision/data-model contient les types et schémas
- Stack : React 18 + TypeScript + Vite + Tailwind CSS + Zustand

TÂCHES :

1. Initialise packages/viewer/ :
   - package.json avec react, react-dom, vite, @vitejs/plugin-react, tailwindcss, zustand
   - Dépendances workspace : @volleyvision/data-model, @volleyvision/dvw-parser
   - vite.config.ts
   - tailwind.config.js + postcss.config.js
   - index.html avec <div id="root">
   - src/main.tsx, src/App.tsx

2. Store Zustand : src/store/matchStore.ts
   interface MatchState {
     match: Match | null;
     stats: PlayerMatchStats[];
     setMatch: (match: Match) => void;
     clear: () => void;
   }
   - Quand setMatch() est appelé, calculer automatiquement les stats via calculatePlayerStats()

3. Page Import : src/pages/ImportPage.tsx
   - Zone de drag & drop (bordure dashed, icône upload)
   - Texte "Glissez un fichier .dvw ici"
   - Accepte aussi le clic pour sélectionner un fichier
   - Au drop : FileReader → parseDVW(content) → matchStore.setMatch()
   - Redirection automatique vers /analysis après import
   - Gestion d'erreur : si parseDVW échoue, afficher un message d'erreur

4. Page Analysis : src/pages/AnalysisPage.tsx

   LAYOUT :
   ┌────────────────────────────────────────────────┐
   │  POLE BOULOURIS 3-0 POLE SABLE                 │
   │  27/01/2026 • INTERPOLE SUD                     │
   │  Set 1: 25-20 | Set 2: 25-23 | Set 3: 15-7    │
   ├────────────────────────────────────────────────┤
   │  Filtres: [Tous les sets ▼] [Toutes joueuses ▼]│
   ├────────────────────────────────────────────────┤
   │  TABLEAU DE STATS                               │
   │  ┌──────┬─────┬─────┬─────┬─────┬─────┬─────┐ │
   │  │Joueur│ Srv │ Réc │Passe│ Att │ Blk │ Dig │ │
   │  ├──────┼─────┼─────┼─────┼─────┼─────┼─────┤ │
   │  │Prou  │2/8  │12/15│ ... │5/10 │ 1/2 │ 3/5 │ │
   │  │ #7   │25%  │ 80% │     │ 50% │ 50% │ 60% │ │
   │  └──────┴─────┴─────┴─────┴─────┴─────┴─────┘ │
   └────────────────────────────────────────────────┘

   Pour chaque joueur × skill :
   - Afficher total actions
   - Efficacité en % avec code couleur (vert > 50%, orange 30-50%, rouge < 30%)
   - Distribution quality : mini-barre #/+/!/−/=/= en 6 couleurs

5. Composants :
   - src/components/FileDropZone.tsx : zone de drag & drop réutilisable
   - src/components/StatsTable.tsx : tableau principal
   - src/components/ScoreBoard.tsx : bandeau de score en haut
   - src/components/QualityBadge.tsx : badge coloré pour une qualité
   - src/components/SetSelector.tsx : dropdown set 1/2/3/tous
   - src/components/PlayerSelector.tsx : dropdown joueurs

6. Routing : utilise le state (pas de router) — si match === null → ImportPage, sinon → AnalysisPage
   Bouton "Importer un autre fichier" pour revenir

STYLE :
- Fond sombre (slate-900), texte clair
- Accents : vert volleyball (#22c55e), bleu (#3b82f6)
- Police : Inter ou system-ui
- Responsive : mobile-first
- Pas d'animations complexes pour le MVP

LANCER :
- `pnpm --filter @volleyvision/viewer dev` doit ouvrir le serveur de dev
- Drag & drop du fichier DVW → afficher les stats en < 3 secondes
```

---

## 📋 Résumé des prompts Phase 1

| Prompt | Contenu | Dépend de | Temps estimé |
|--------|---------|-----------|-------------|
| 0 | Monorepo setup | — | 15 min |
| 1A | Data model (types + Zod + mappers) | 0 | 30 min |
| 1B | Section Splitter | 0, 1A | 20 min |
| 1C | Header + Teams + Sets parsers | 1B | 45 min |
| 1D | Scout Line Parser (action, meta, classifier) | 1A, 1B | 90 min |
| 1E | Rally Builder | 1D | 60 min |
| 1F | Stats Calculator + parseDVW() assemblage | 1C, 1D, 1E | 45 min |
| 1G | Viewer React (import + dashboard) | 1F | 60 min |

**Total estimé : ~6h de prompts Claude Code**

---

---

# PROMPTS PHASES 2-5 (Grandes lignes)

> Ces prompts seront détaillés au fur et à mesure. Voici la structure pour anticiper.

---

## Phase 2 — Vidéo + Timeline

### PROMPT 2A — Video Player Component (grandes lignes)
- Intégrer YouTube IFrame API (code existant dans Interface-Chaine-Pole)
- Composant VideoPlayer avec seek, play/pause, vitesse
- Input URL YouTube pour associer au match DVW importé
- Calcul offset : premier timestamp DVW ↔ début vidéo

### PROMPT 2B — Action Timeline *(détaillé ci-dessous)*
### PROMPT 2-LAYOUT — Dashboard Modulaire *(détaillé ci-dessous)*
### PROMPT 2C — Filtres avancés + Playlist *(détaillé ci-dessous)*
### PROMPT 2D — Vue Rotation *(détaillé ci-dessous)*

### PROMPT 2E — Play-by-Play graphique *(détaillé ci-dessous)*
### PROMPT 2F — Distribution Passeuse *(détaillé ci-dessous)*
### PROMPT 2G — Export Montage Vidéo *(détaillé ci-dessous)*
### PROMPT 2H — Vue Joueur / Player App *(détaillé ci-dessous)*

---

## 🎬 PROMPT 2A — Video Player Component (DÉTAILLÉ)

```
Implémente le composant VideoPlayer YouTube et le système de synchronisation vidéo/DVW.

CONTEXTE :
- Lis packages/viewer/src/store/matchStore.ts pour comprendre le state Zustand actuel
- Lis packages/viewer/src/pages/AnalysisPage.tsx pour voir la page stats existante
- Le code YouTube IFrame API existe déjà dans Interface-Chaine-Pole/youtube-player.js — on va le porter en React/TypeScript
- Les types VideoSource, Match, Rally, Action sont dans @volleyvision/data-model
- Chaque Rally a videoTimestamp (début) et endVideoTimestamp (fin) en secondes
- Chaque Action a videoTimestamp en secondes
- Le viewer utilise React 18 + Zustand + Tailwind CSS (thème sombre slate-900)

IMPORTANT : On ne copie PAS le code vanilla — on le réécrit proprement en React hooks + TypeScript.

═══════════════════════════════════════════════
FICHIER 1 : packages/viewer/src/hooks/useYouTubePlayer.ts
═══════════════════════════════════════════════

Hook custom qui encapsule toute l'interaction avec YouTube IFrame API.

import { useRef, useState, useCallback, useEffect } from 'react';

interface UseYouTubePlayerOptions {
  onReady?: () => void;
  onStateChange?: (state: YTPlayerState) => void;
  onTimeUpdate?: (currentTime: number) => void;
}

type YTPlayerState = 'unstarted' | 'ended' | 'playing' | 'paused' | 'buffering' | 'cued';

interface UseYouTubePlayerReturn {
  // Refs
  containerRef: React.RefObject<HTMLDivElement>;

  // State
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  playerState: YTPlayerState;

  // Actions
  loadVideo: (videoId: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  seekRelative: (delta: number) => void;
  setPlaybackRate: (rate: number) => void;
  getCurrentTime: () => number;
  destroy: () => void;
}

ALGORITHME :

1. loadYouTubeAPI() :
   - Vérifier si window.YT existe déjà
   - Sinon, injecter <script src="https://www.youtube.com/iframe_api">
   - Retourner une Promise qui resolve quand onYouTubeIframeAPIReady() est appelé
   - Utiliser un singleton : si le script est déjà en cours de chargement, retourner la même Promise
   - Stocker dans un module-level : let apiLoadPromise: Promise<void> | null = null;

2. useYouTubePlayer(options) :
   - containerRef = useRef<HTMLDivElement>(null)
   - playerRef = useRef<YT.Player | null>(null) (ref interne, pas exposé)
   - isReady, isPlaying, currentTime, duration, playbackRate, playerState via useState
   - timerRef = useRef<number>(null) pour le polling currentTime

3. loadVideo(videoId) :
   - await loadYouTubeAPI()
   - Si playerRef.current existe : playerRef.current.destroy()
   - Créer un <div id="yt-player-{random}"> dans containerRef
   - new YT.Player(divId, { videoId, width: '100%', height: '100%', playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1, playsinline: 1, enablejsapi: 1, origin: window.location.origin }, events: { onReady, onStateChange, onError } })
   - IMPORTANT : controls: 0 car on fait nos propres contrôles custom
   - onReady → setIsReady(true), setDuration(player.getDuration()), options.onReady?.()
   - onStateChange → mapper data vers YTPlayerState, setIsPlaying(state === 'playing'), setPlayerState(state)
   - Démarrer le polling timer (setInterval 250ms) quand playing, l'arrêter quand paused/ended

4. Polling currentTime :
   - Quand isPlaying = true : setInterval(() => { setCurrentTime(player.getCurrentTime()); options.onTimeUpdate?.(player.getCurrentTime()); }, 250)
   - Quand isPlaying = false : clearInterval
   - cleanup dans useEffect return

5. play/pause/togglePlay/seekTo/seekRelative/setPlaybackRate :
   - Toujours vérifier playerRef.current avant d'appeler
   - seekTo → player.seekTo(seconds, allowSeekAhead), puis setCurrentTime(seconds)
   - seekRelative(delta) → seekTo(getCurrentTime() + delta)
   - setPlaybackRate → player.setPlaybackRate(rate), setPlaybackRate state

6. destroy : appelé dans useEffect cleanup (unmount du composant)

7. Types YouTube : Ajouter un fichier de déclarations pour window.YT

═══════════════════════════════════════════════
FICHIER 2 : packages/viewer/src/types/youtube.d.ts
═══════════════════════════════════════════════

Déclarations TypeScript minimales pour YouTube IFrame API :

declare namespace YT {
  class Player {
    constructor(elementId: string | HTMLElement, options: PlayerOptions);
    playVideo(): void;
    pauseVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    setPlaybackRate(rate: number): void;
    getAvailablePlaybackRates(): number[];
    destroy(): void;
    getVideoUrl(): string;
  }

  interface PlayerOptions {
    videoId?: string;
    width?: string | number;
    height?: string | number;
    playerVars?: PlayerVars;
    events?: Events;
  }

  interface PlayerVars {
    autoplay?: 0 | 1;
    controls?: 0 | 1;
    rel?: 0 | 1;
    modestbranding?: 0 | 1;
    playsinline?: 0 | 1;
    enablejsapi?: 0 | 1;
    origin?: string;
    start?: number;
  }

  interface Events {
    onReady?: (event: { target: Player }) => void;
    onStateChange?: (event: { data: number }) => void;
    onError?: (event: { data: number }) => void;
  }

  enum PlayerState {
    UNSTARTED = -1,
    ENDED = 0,
    PLAYING = 1,
    PAUSED = 2,
    BUFFERING = 3,
    CUED = 5,
  }
}

declare function onYouTubeIframeAPIReady(): void;

═══════════════════════════════════════════════
FICHIER 3 : packages/viewer/src/components/VideoPlayer.tsx
═══════════════════════════════════════════════

Composant React qui combine le player YouTube + contrôles custom + input URL.

Props :
interface VideoPlayerProps {
  videoSource?: VideoSource;            // Source existante (depuis parseDVW)
  onVideoLoaded?: (videoId: string) => void;
  onTimeUpdate?: (currentTime: number) => void;
  seekToTime?: number | null;           // Contrôle externe : quand ça change → seekTo
  className?: string;
}

STRUCTURE JSX :

<div className="bg-slate-800 rounded-lg overflow-hidden">
  {/* URL Input Bar — affiché si pas de vidéo chargée ou pour changer */}
  {!isReady && (
    <div className="p-4 flex gap-2">
      <input
        type="text"
        placeholder="Coller l'URL YouTube du match..."
        className="flex-1 bg-slate-700 rounded px-3 py-2 text-sm"
        value={urlInput}
        onChange={e => setUrlInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleLoadVideo()}
      />
      <button onClick={handleLoadVideo} className="px-4 py-2 bg-primary-blue rounded font-medium text-sm">
        Charger
      </button>
    </div>
  )}

  {/* Error message */}
  {error && <div className="px-4 py-2 bg-red-900/50 text-red-300 text-sm">{error}</div>}

  {/* Player container — ratio 16:9 */}
  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
    <div ref={containerRef} className="absolute inset-0" />

    {/* Loading overlay */}
    {!isReady && !error && urlInput && (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
        <div className="animate-spin w-8 h-8 border-2 border-primary-blue border-t-transparent rounded-full" />
      </div>
    )}

    {/* Placeholder si pas de vidéo */}
    {!isReady && !urlInput && (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500">
        <svg>...</svg> {/* Icône vidéo */}
        <p className="text-sm mt-2">Coller une URL YouTube pour synchroniser la vidéo</p>
      </div>
    )}
  </div>

  {/* Custom Controls Bar — affiché uniquement si vidéo chargée */}
  {isReady && (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-900">
      {/* Play/Pause */}
      <button onClick={togglePlay} className="p-1.5 hover:bg-slate-700 rounded">
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      {/* Rewind 5s */}
      <button onClick={() => seekRelative(-5)} className="p-1.5 hover:bg-slate-700 rounded text-xs">
        -5s
      </button>

      {/* Forward 5s */}
      <button onClick={() => seekRelative(5)} className="p-1.5 hover:bg-slate-700 rounded text-xs">
        +5s
      </button>

      {/* Seek bar (range input) */}
      <input
        type="range"
        min={0}
        max={duration}
        value={currentTime}
        onChange={e => seekTo(Number(e.target.value))}
        className="flex-1 h-1 accent-primary-blue cursor-pointer"
      />

      {/* Time display */}
      <span className="text-xs text-slate-400 tabular-nums min-w-[80px] text-right">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {/* Playback rate selector */}
      <select
        value={playbackRate}
        onChange={e => setPlaybackRate(Number(e.target.value))}
        className="bg-slate-700 text-xs rounded px-1 py-0.5"
      >
        <option value={0.25}>0.25×</option>
        <option value={0.5}>0.5×</option>
        <option value={0.75}>0.75×</option>
        <option value={1}>1×</option>
        <option value={1.25}>1.25×</option>
        <option value={1.5}>1.5×</option>
        <option value={2}>2×</option>
      </select>

      {/* Change video button */}
      <button onClick={() => { destroy(); setUrlInput(''); }} className="p-1.5 hover:bg-slate-700 rounded text-xs text-slate-400">
        ✕
      </button>
    </div>
  )}
</div>

LOGIQUE INTERNE :

- handleLoadVideo() :
  - Extraire videoId avec extractVideoId(urlInput)
  - Si null → setError('URL YouTube invalide')
  - Sinon → loadVideo(videoId), onVideoLoaded?.(videoId)

- extractVideoId(url) : même regex que youtube-player.js — supporter:
  /watch?v=ID, /embed/ID, /v/ID, /live/ID, youtu.be/ID

- useEffect sur seekToTime :
  - Si seekToTime !== null && isReady → seekTo(seekToTime), play()
  - Permet au parent (AnalysisPage) de piloter le player

- formatTime(seconds) :
  - Math.floor(seconds / 60) + ':' + pad(Math.floor(seconds % 60))
  - Si seconds >= 3600 → HH:MM:SS

═══════════════════════════════════════════════
FICHIER 4 : packages/viewer/src/store/videoStore.ts
═══════════════════════════════════════════════

Store Zustand séparé pour l'état vidéo (ne pas surcharger matchStore).

import { create } from 'zustand';

interface VideoState {
  // State
  videoId: string | null;
  videoUrl: string | null;
  isReady: boolean;
  currentTime: number;
  offsetSeconds: number;        // Décalage DVW ↔ vidéo

  // Actions
  setVideoId: (id: string, url: string) => void;
  setReady: (ready: boolean) => void;
  setCurrentTime: (time: number) => void;
  setOffset: (offset: number) => void;
  seekRequest: number | null;   // Quand non-null → le player doit seekTo cette valeur
  requestSeek: (seconds: number) => void;
  clearSeekRequest: () => void;
  clear: () => void;
}

EXPLICATION offset :
- DVW videoSeconds = secondes depuis le début de l'enregistrement DataVolley
- YouTube currentTime = secondes depuis le début de la vidéo YouTube
- Si la vidéo YouTube commence 30s avant le premier service DVW :
  offsetSeconds = -30 → videoYT = dvwSeconds + offsetSeconds
- Le coach règle l'offset manuellement : "caler sur le premier service"

ALGO seekToAction(dvwVideoSeconds) :
  const ytSeconds = dvwVideoSeconds + offsetSeconds;
  requestSeek(Math.max(0, ytSeconds));

═══════════════════════════════════════════════
FICHIER 5 : packages/viewer/src/components/OffsetCalibrator.tsx
═══════════════════════════════════════════════

Petit widget pour caler l'offset vidéo/DVW.

Affiché sous le player vidéo quand isReady === true.

STRUCTURE :

<div className="flex items-center gap-3 px-3 py-2 bg-slate-800 rounded-b-lg border-t border-slate-700 text-sm">
  <span className="text-slate-400">Offset DVW ↔ Vidéo :</span>

  {/* Boutons d'ajustement fin */}
  <button onClick={() => adjustOffset(-1)}>-1s</button>
  <button onClick={() => adjustOffset(-0.5)}>-0.5</button>

  {/* Affichage offset */}
  <span className="tabular-nums font-mono text-primary-green min-w-[60px] text-center">
    {offset >= 0 ? '+' : ''}{offset.toFixed(1)}s
  </span>

  <button onClick={() => adjustOffset(+0.5)}>+0.5</button>
  <button onClick={() => adjustOffset(+1)}>+1s</button>

  {/* Bouton calibration auto */}
  <button onClick={handleAutoCalibrate} className="ml-2 text-primary-blue text-xs underline">
    Caler sur 1er service
  </button>
</div>

LOGIQUE :

- adjustOffset(delta) → videoStore.setOffset(offset + delta)

- handleAutoCalibrate() :
  - Trouver le premier rally du match : match.sets[0].rallies[0]
  - firstDvwSeconds = rally.videoTimestamp
  - currentYTTime = videoStore.currentTime (position actuelle du player)
  - newOffset = currentYTTime - firstDvwSeconds
  - videoStore.setOffset(newOffset)
  - Afficher un toast "Offset calé : +X.Xs"
  - USAGE : le coach joue la vidéo, met en pause sur le premier service,
    clique "Caler sur 1er service" → l'offset est calculé automatiquement

═══════════════════════════════════════════════
FICHIER 6 : Mise à jour de AnalysisPage.tsx
═══════════════════════════════════════════════

Modifier AnalysisPage pour intégrer le VideoPlayer :

NOUVEAU LAYOUT :

<div className="container mx-auto px-4 py-8">
  {/* Header (existant) */}

  {/* 2 colonnes : Vidéo à gauche, Stats à droite */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

    {/* Colonne gauche : Vidéo + Calibration */}
    <div className="space-y-0">
      <VideoPlayer
        videoSource={match.videoSources[0]}
        onVideoLoaded={(id) => videoStore.setVideoId(id, urlInput)}
        onTimeUpdate={(t) => videoStore.setCurrentTime(t)}
        seekToTime={videoStore.seekRequest}
      />
      {videoStore.isReady && (
        <OffsetCalibrator match={match} />
      )}
    </div>

    {/* Colonne droite : ScoreBoard + Filtres + Stats */}
    <div className="space-y-4">
      <ScoreBoard match={match} />
      {/* filtres existants */}
      {/* StatsTable existante */}
    </div>
  </div>
</div>

Sur écran < lg (mobile) : les 2 colonnes s'empilent (vidéo en haut, stats en bas).

═══════════════════════════════════════════════
FICHIER 7 (optionnel) : packages/viewer/src/utils/videoHelpers.ts
═══════════════════════════════════════════════

Fonctions utilitaires vidéo :

export function extractVideoId(url: string): string | null {
  // Mêmes patterns que Interface-Chaine-Pole/youtube-player.js
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/live\/([^&\n?#]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function formatVideoTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function dvwToYouTubeTime(dvwSeconds: number, offset: number): number {
  return Math.max(0, dvwSeconds + offset);
}

═══════════════════════════════════════════════
TESTS : packages/viewer/tests/video.test.ts
═══════════════════════════════════════════════

Tests unitaires (pas besoin de YouTube API réelle — on teste la logique) :

1. extractVideoId tests (6 tests) :
   - "https://www.youtube.com/watch?v=abc123" → "abc123"
   - "https://youtu.be/abc123" → "abc123"
   - "https://www.youtube.com/embed/abc123" → "abc123"
   - "https://www.youtube.com/live/abc123" → "abc123"
   - "https://www.youtube.com/watch?v=abc123&t=30" → "abc123"
   - "invalid url" → null
   - "" → null

2. formatVideoTime tests (5 tests) :
   - 0 → "0:00"
   - 65 → "1:05"
   - 3661 → "1:01:01"
   - NaN → "0:00"
   - 0.5 → "0:00"

3. dvwToYouTubeTime tests (4 tests) :
   - (72, 0) → 72 (pas d'offset)
   - (72, -30) → 42 (vidéo commence avant le DVW)
   - (72, +10) → 82 (vidéo commence après le DVW)
   - (10, -20) → 0 (clampé à 0, pas de temps négatif)

4. offset calibration logic (3 tests) :
   - firstDvwSeconds=72, currentYTTime=42 → offset = -30
   - firstDvwSeconds=72, currentYTTime=72 → offset = 0
   - firstDvwSeconds=72, currentYTTime=102 → offset = +30

Total : 18 tests

═══════════════════════════════════════════════

RÉSUMÉ DES FICHIERS :

| Fichier | Type | ~Lignes |
|---------|------|---------|
| packages/viewer/src/hooks/useYouTubePlayer.ts | Hook React | ~180 |
| packages/viewer/src/types/youtube.d.ts | Déclarations TS | ~55 |
| packages/viewer/src/components/VideoPlayer.tsx | Composant React | ~200 |
| packages/viewer/src/store/videoStore.ts | Store Zustand | ~50 |
| packages/viewer/src/components/OffsetCalibrator.tsx | Composant React | ~80 |
| packages/viewer/src/utils/videoHelpers.ts | Utils pures | ~40 |
| packages/viewer/src/pages/AnalysisPage.tsx | MODIFIÉ | ~180 |
| packages/viewer/tests/video.test.ts | Tests Vitest | ~120 |

Total : ~905 lignes, 18 tests

ATTENTION :
- controls: 0 dans playerVars — on masque les contrôles YouTube natifs pour utiliser les nôtres
- Le hook useYouTubePlayer gère le cycle de vie : cleanup player sur unmount
- Le polling currentTime à 250ms est un compromis perf/précision (YouTube n'a pas d'event onTimeUpdate)
- L'offset est en secondes AVEC décimales (0.5s de précision pour le calage)
- Sur mobile, le layout passe en 1 colonne (vidéo au-dessus des stats)
- Ne PAS stocker la vidéo dans matchStore — utiliser videoStore séparé
- Le seekToTime prop utilise un pattern "request" : le parent set la valeur, le player la consomme puis clear

Exécute les tests et vérifie que le viewer compile (pnpm dev dans packages/viewer).
```

---

## 📈 PROMPT 2E — Play-by-Play graphique (DÉTAILLÉ)

```
Implémente le graphe Play-by-Play : courbe d'écart au score point par point.

CONTEXTE :
- Lis packages/viewer/src/store/matchStore.ts — le match contient sets[].rallies[] avec scoreAfter
- Lis packages/viewer/src/pages/AnalysisPage.tsx — la page d'analyse existante
- Chaque Rally a : setNumber, scoreAfter: { home, away }, videoTimestamp
- Inspiré de DataVolley 4 "Play by Play" — graphe au centre montrant l'écart au score
- Stack : React 18 + Zustand + Tailwind CSS + Recharts (à ajouter)

FICHIERS À CRÉER :

1. packages/viewer/src/components/PlayByPlayChart.tsx

   Props :
   interface PlayByPlayChartProps {
     match: Match;
     selectedSet?: number | null;     // null = tous les sets combinés
     onRallyClick?: (rally: Rally) => void;  // Clic → seekTo vidéo
     className?: string;
   }

   DONNÉES À PRÉPARER :

   Pour chaque rally dans l'ordre chronologique :
   - rallyIndex (numéro séquentiel global ou par set)
   - scoreDiff = rally.scoreAfter.home - rally.scoreAfter.away
     → Positif = home mène, négatif = away mène
   - pointWinner: 'home' | 'away' (déduit du score qui augmente)
   - isRun: boolean (3+ points consécutifs même équipe → coloré différemment)
   - setNumber
   - label: "25-20" (score affiché au hover)

   GRAPHE (Recharts AreaChart ou LineChart) :

   ┌─────────────────────────────────────────────────────┐
   │  +5 ┤                    ╱╲                          │
   │  +4 ┤                   ╱  ╲    ╱╲                   │
   │  +3 ┤              ╱╲  ╱    ╲  ╱  ╲                  │
   │  +2 ┤         ╱╲  ╱  ╲╱      ╲╱    ╲                 │
   │  +1 ┤    ╱╲  ╱  ╲╱                  ╲                │
   │   0 ┤───╱──╲╱─────────────────────────╲──────────── │
   │  -1 ┤  ╱                               ╲  ╱╲        │
   │  -2 ┤ ╱                                 ╲╱  ╲       │
   │  -3 ┤╱                                       ╲      │
   │     └──────────────────────────────────────────┘     │
   │      Set 1          │  Set 2        │  Set 3         │
   └─────────────────────────────────────────────────────┘

   CARACTÉRISTIQUES VISUELLES :
   - Axe Y = écart au score (scoreDiff), centré sur 0
   - Axe X = numéro de rally séquentiel
   - Ligne 0 en pointillé (zone de parité)
   - Zone au-dessus de 0 : remplie en vert (home mène) avec opacité 0.3
   - Zone en dessous de 0 : remplie en rouge (away mène) avec opacité 0.3
   - Points sur la courbe : cercles colorés (vert home, rouge away)
   - Runs (3+ points consécutifs) : points plus gros + bordure dorée
   - Séparateurs verticaux entre sets (ligne pointillée + label "Set 1", "Set 2"...)
   - Tooltip au hover : "Rally #23 — Set 1 — 15:12 — Service BOULOURIS"
   - Clic sur un point → onRallyClick(rally) → seekTo vidéo

   FILTRES INTÉGRÉS :
   - Boutons "Set 1" / "Set 2" / "Set 3" / "Tous" en haut du graphe
   - Si un set est sélectionné → zoom sur ce set uniquement
   - Synchronisé avec le SetSelector existant

   STATS RÉSUMÉ (sous le graphe) :
   - Plus long run home : "BOULOURIS : 6 points (12-8 → 18-8, Set 1)"
   - Plus long run away : "SABLE : 4 points (20-18 → 20-22, Set 2)"
   - Points joués en tête : "BOULOURIS 78% du temps en tête"

2. packages/viewer/src/utils/playByPlayHelpers.ts

   export interface PlayByPlayPoint {
     rallyIndex: number;           // Index global
     setRallyIndex: number;        // Index dans le set
     setNumber: number;
     scoreDiff: number;            // home - away
     homeScore: number;
     awayScore: number;
     pointWinner: 'home' | 'away';
     isRun: boolean;               // Fait partie d'un run de 3+
     runLength: number;            // Longueur du run en cours
     rally: Rally;                 // Référence au rally original
   }

   export interface RunInfo {
     team: 'home' | 'away';
     length: number;
     startScore: { home: number; away: number };
     endScore: { home: number; away: number };
     setNumber: number;
   }

   export function buildPlayByPlayData(match: Match): PlayByPlayPoint[];
   - Itérer sur tous les sets → tous les rallies
   - Calculer scoreDiff pour chaque point
   - Détecter les runs (3+ points consécutifs même équipe)
   - Marquer isRun = true et runLength pour chaque point dans un run

   export function findLongestRuns(data: PlayByPlayPoint[]): { home: RunInfo; away: RunInfo };
   - Trouver le plus long run pour chaque équipe

   export function calculateLeadStats(data: PlayByPlayPoint[]): {
     homeLeadPoints: number;
     awayLeadPoints: number;
     tiedPoints: number;
     homeLeadPercent: number;
   };

3. Mise à jour de AnalysisPage.tsx :
   - Ajouter PlayByPlayChart sous le VideoPlayer (colonne gauche)
   - Ou en pleine largeur sous les 2 colonnes
   - onRallyClick → videoStore.requestSeek(rally.videoTimestamp + offset)

DÉPENDANCE À INSTALLER :
   pnpm --filter @volleyvision/viewer add recharts

TESTS : packages/viewer/tests/play-by-play.test.ts

1. "buildPlayByPlayData retourne 115 points pour 3 sets"
   - Charger le match via parseDVW
   - data.length === totalRallies

2. "scoreDiff du dernier point du set 1 est ±5"
   - |25 - 20| = 5

3. "scoreDiff du premier point est ±1"
   - Soit +1 soit -1

4. "détecte au moins un run de 3+ points"
   - data.filter(p => p.isRun).length > 0

5. "findLongestRuns retourne des runs de longueur >= 3"
   - home.length >= 3 || away.length >= 3

6. "calculateLeadStats somme = 100%"
   - homeLeadPercent + awayLeadPercent + tiedPercent ≈ 100

7. "les set separators sont aux bons indices"
   - Points avec setNumber différent du précédent

8. "clic sur un point fournit le bon rally"
   - data[0].rally.setNumber === 1

Total : 8 tests

Exécute les tests et vérifie que le graphe s'affiche correctement dans le viewer.
```

---

## 🏐 PROMPT 2F — Distribution Passeuse (DÉTAILLÉ)

```
Implémente l'analyse de distribution du palleggiatore/passeuse basée sur les setter calls.

CONTEXTE :
- Les setter calls (K0, K1, K2, KA, KB, KC, KF, KK) sont DÉJÀ parsés par le PROMPT 1D
  → Chaque DVWAction avec skill === 'set' ou skill === 'attack' peut avoir un champ setterCall
- Les attack combinations sont parsées : combo.startZone, combo.tempo, combo.description
- Chaque Action a : skill, attackCombo, setterCall, startZone, endZone, quality, playerNumber
- Le setter call définit la "situation de jeu" : K0 = perfect pass, K1 = good, K2 = poor, etc.
- Inspiré de DataVolley "Distribution séquentielle" et du plugin SeTTEX

FICHIERS À CRÉER :

1. packages/viewer/src/components/SetterDistribution.tsx

   Props :
   interface SetterDistributionProps {
     match: Match;
     stats: PlayerMatchStats[];
     selectedSet?: number | null;    // null = tous les sets
     selectedRotation?: number | null; // null = toutes les rotations
     className?: string;
   }

   VISUALISATION PRINCIPALE — Terrain 2D avec flèches :

   ┌─────────────────────────────────────────┐
   │         DISTRIBUTION PASSEUSE           │
   │                                         │
   │  ┌─────────────────────────────────┐    │
   │  │  Zone 4      Zone 3    Zone 2   │    │
   │  │  ┌─────┐   ┌─────┐   ┌─────┐   │    │
   │  │  │Prou │←──│ SET │──→│Vial │   │    │
   │  │  │ 35% │   │     │   │ 25% │   │    │
   │  │  │12/34│   │     │   │8/34 │   │    │
   │  │  └─────┘   └──┬──┘   └─────┘   │    │
   │  │               │                │    │
   │  │  Zone 5    PIPE↓     Zone 1    │    │
   │  │  ┌─────┐  ┌─────┐   ┌─────┐   │    │
   │  │  │Back │  │Pipe │   │Back │   │    │
   │  │  │ 10% │  │ 15% │   │ 5%  │   │    │
   │  │  └─────┘  └─────┘   └─────┘   │    │
   │  └─────────────────────────────────┘    │
   │                                         │
   │  Filtre réception: [Toutes▼] [#▼] [+▼]  │
   └─────────────────────────────────────────┘

   ALGORITHME :
   1. Collecter toutes les actions de type 'attack' dans les rallies filtrés
   2. Pour chaque attaque, regarder :
      - attackCombo → combo.startZone (zone de départ de l'attaque)
      - quality de l'attaque (#, +, !, -, /, =)
      - setterCall de l'action de type 'set' qui PRÉCÈDE cette attaque dans le même rally
      - La qualité de la réception qui précède la passe (si disponible)
   3. Grouper par zone d'attaque → calculer fréquence + efficacité

   DONNÉES À CALCULER :

   export interface SetterDistributionData {
     totalSets: number;                    // Nombre total de passes
     byZone: Map<number, ZoneDistribution>;  // Zone 1-6 + Pipe
     byReceptionQuality: Map<QualityPro, ZoneDistribution[]>;  // K# → distribution
     byRotation: Map<number, ZoneDistribution[]>;  // R1-R6 → distribution
   }

   export interface ZoneDistribution {
     zone: number;                // Zone de destination (1-6, 8=pipe)
     count: number;               // Nombre de passes vers cette zone
     percentage: number;           // % du total
     attackEfficiency: number;     // Efficacité des attaques (#-errors)/total
     attackKills: number;          // Nombre de kills
     attackErrors: number;         // Nombre d'erreurs
     attackTotal: number;          // Total attaques
     comboBreakdown: Map<string, number>;  // PP→5, V5→8, C1→3, etc.
     playerBreakdown: Map<string, { count: number; kills: number; errors: number }>;
   }

2. packages/viewer/src/utils/setterAnalysis.ts

   export function analyzeSetterDistribution(
     match: Match,
     options?: {
       setFilter?: number;
       rotationFilter?: number;
       receptionQualityFilter?: QualityPro;
       teamSide?: 'home' | 'away';
     }
   ): SetterDistributionData;

   ALGORITHME DÉTAILLÉ :

   Pour chaque rally dans les sets filtrés :
   1. Trouver l'action de réception (skill === 'receive') → noter sa qualité
   2. Trouver l'action de passe (skill === 'set') → noter le setterCall
   3. Trouver l'action d'attaque (skill === 'attack') → noter attackCombo, startZone, quality
   4. Lier : réception.quality → set.setterCall → attack.zone + attack.quality

   Cas spéciaux :
   - Transition (contre-attaque) : pas de réception, la passe vient après un dig
   - Free ball : réception quality spéciale
   - Si plusieurs attaques dans le même rally (transition) → compter chaque séquence

   export function getSetterCallLabel(call: string): string {
     const labels: Record<string, string> = {
       'K0': 'Passe parfaite (#)',
       'K1': 'Bonne passe (+)',
       'K2': 'Passe moyenne (!)',
       'K7': 'Passe difficile (-)',
       'KA': 'Transition après attaque adverse',
       'KB': 'Free ball',
       'KC': 'Transition après service',
       'KF': 'Transition après faute',
       'KK': 'Contre-attaque après block',
     };
     return labels[call] || call;
   }

   export function getZoneLabel(zone: number): string {
     const labels: Record<number, string> = {
       1: 'Poste 1 (arrière droite)',
       2: 'Poste 2 (avant droite)',
       3: 'Poste 3 (centre)',
       4: 'Poste 4 (avant gauche)',
       5: 'Poste 5 (arrière gauche)',
       6: 'Poste 6 (arrière centre)',
       8: 'Pipe (centre arrière)',
     };
     return labels[zone] || `Zone ${zone}`;
   }

3. packages/viewer/src/components/CourtDiagram.tsx

   Composant réutilisable : terrain de volley en SVG.

   Props :
   interface CourtDiagramProps {
     zones: ZoneDistribution[];
     highlightedZone?: number;
     setterPosition?: number;      // Zone de la passeuse (déduit de la rotation)
     onZoneClick?: (zone: number) => void;
     showArrows?: boolean;         // Flèches passeuse → zone d'attaque
     width?: number;
     height?: number;
   }

   Le terrain est un rectangle SVG divisé en 6 zones (3 avant + 3 arrière).
   - Chaque zone est un rectangle coloré selon la fréquence (vert fort → beaucoup de passes)
   - Opacité proportionnelle au pourcentage
   - Texte dans chaque zone : "35%" + "12/34" + "eff: 48%"
   - Flèche SVG depuis la position de la passeuse vers chaque zone d'attaque
     → Épaisseur proportionnelle à la fréquence
     → Couleur selon l'efficacité (vert > 40%, orange 20-40%, rouge < 20%)

   ZONES SVG (dimensions relatives) :
   ┌──────┬──────┬──────┐
   │  Z4  │  Z3  │  Z2  │  Avant (filet en haut)
   ├──────┼──────┼──────┤
   │  Z5  │  Z6  │  Z1  │  Arrière
   └──────┴──────┴──────┘

   Le pipe (Z8) est au centre de la ligne arrière, chevauchant Z6.

4. Mise à jour AnalysisPage.tsx :
   - Ajouter un onglet/tab "Distribution Passeuse" à côté de "Stats" et "Play-by-Play"
   - Ou l'afficher en dessous du tableau de stats
   - Filtres : set, rotation, qualité de réception (indépendants des filtres stats)

5. Table complémentaire : Distribution tabulaire

   ┌──────────┬───────┬──────┬──────┬──────┬──────┬──────┐
   │ Réception│ Total │ Z4   │ Z3   │ Z2   │ Pipe │ Arr. │
   ├──────────┼───────┼──────┼──────┼──────┼──────┼──────┤
   │ # (K0)   │  22   │ 40%  │ 25%  │ 20%  │ 15%  │  0%  │
   │ + (K1)   │  18   │ 45%  │ 20%  │ 25%  │ 10%  │  0%  │
   │ ! (K2)   │  12   │ 50%  │ 30%  │ 15%  │  5%  │  0%  │
   │ - (K7)   │   8   │ 60%  │ 25%  │ 15%  │  0%  │  0%  │
   │ Trans.   │  15   │ 35%  │ 30%  │ 20%  │ 10%  │  5%  │
   └──────────┴───────┴──────┴──────┴──────┴──────┴──────┘

   INTERPRÉTATION POUR LE COACH :
   - "Quand la réception est parfaite (#), la passeuse distribue à 40% en Z4 (tempo rapide)"
   - "Quand la réception est mauvaise (-), la passeuse se recentre sur Z4 à 60% (ball haute)"
   - "En R1, la passeuse privilégie l'attaquante Prou (Z4) à 45%"
   - Identifier les tendances exploitables par l'adversaire

TESTS : packages/viewer/tests/setter-distribution.test.ts

1. "analyzeSetterDistribution retourne des données pour les attaques du match"
   - Charger le match via parseDVW
   - data.totalSets > 0

2. "la distribution par zone couvre les zones principales (2, 3, 4)"
   - byZone.has(2) && byZone.has(3) && byZone.has(4)

3. "les pourcentages par zone totalisent ~100%"
   - Somme des percentages ≈ 100 (±1% pour arrondis)

4. "l'efficacité d'attaque est entre -1 et 1"
   - Chaque zone.attackEfficiency >= -1 && <= 1

5. "le filtre par set réduit le nombre total"
   - analyzeSetterDistribution(match, { setFilter: 1 }).totalSets < data.totalSets

6. "le filtre par qualité de réception fonctionne"
   - analyzeSetterDistribution(match, { receptionQualityFilter: '#' })
   - Résultat contient uniquement des rallies avec réception #

7. "getSetterCallLabel retourne le bon label"
   - getSetterCallLabel('K0') === 'Passe parfaite (#)'
   - getSetterCallLabel('KA') === 'Transition après attaque adverse'

8. "byRotation contient 6 rotations maximum"
   - byRotation.size <= 6

9. "la zone avec le plus haut pourcentage a le plus de count"
   - Cohérence entre count et percentage

10. "playerBreakdown contient les bons numéros de joueurs"
    - Au moins un joueur identifié dans la zone principale

Total : 10 tests

ATTENTION :
- Le setter call n'est pas toujours présent → gérer les cas où setterCall est undefined
- En transition, il n'y a pas de réception → catégoriser séparément
- Le terrain SVG doit être responsive (viewBox, pas de dimensions fixes)
- Les flèches SVG utilisent des <marker> pour les pointes
- La passeuse n'est pas toujours en position 2/3 → déduire de la rotation courante
- Ce composant réutilise le CourtDiagram qui sera aussi utilisé par le PROMPT 2D (Vue Rotation)

Exécute les tests et vérifie l'affichage dans le viewer.
```

---

## ⏱️ PROMPT 2B — Action Timeline (DÉTAILLÉ)

```
Implémente la timeline d'actions interactive sous le player vidéo.

CONTEXTE :
- Lis packages/viewer/src/store/videoStore.ts — contient currentTime, offset, setCurrentTime
- Lis packages/viewer/src/store/matchStore.ts — contient match avec sets[].rallies[].actions[]
- Lis packages/viewer/src/components/VideoPlayer.tsx — le player YouTube existant
- Lis packages/viewer/src/pages/AnalysisPage.tsx — layout 2 colonnes existant
- Chaque Action a : videoTimestamp, skill, quality, player.number, player.team
- Chaque Rally a : videoTimestamp (début), endVideoTimestamp (fin), actions[], scoreAfter
- Le videoStore a : currentTime (mis à jour toutes les 250ms), offset
- Stack : React 18 + Zustand + Tailwind CSS (thème sombre slate-900)

IMPORTANT : La timeline est le composant qui rend la vidéo VRAIMENT utile — c'est le lien
entre les stats et la vidéo. Chaque action du match est cliquable et saute à ce moment.

═══════════════════════════════════════════════
FICHIER 1 : packages/viewer/src/components/ActionTimeline.tsx
═══════════════════════════════════════════════

Props :
interface ActionTimelineProps {
  match: Match;
  selectedSet?: number | null;     // Filtre par set (null = tous)
  onActionClick?: (action: Action, rally: Rally) => void;
  className?: string;
}

STRUCTURE JSX :

<div className="bg-slate-800 rounded-lg overflow-hidden">
  {/* Header avec filtres rapides */}
  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
    <h3 className="text-sm font-semibold text-slate-300">Timeline des actions</h3>
    <div className="flex gap-1">
      {/* Boutons filtre skill */}
      {SKILL_FILTERS.map(sf => (
        <button
          key={sf.skill}
          onClick={() => toggleSkillFilter(sf.skill)}
          className={`px-2 py-1 rounded text-xs ${activeSkills.has(sf.skill) ? 'bg-primary-blue text-white' : 'bg-slate-700 text-slate-400'}`}
          title={sf.label}
        >
          {sf.icon}
        </button>
      ))}
    </div>
  </div>

  {/* Timeline scrollable — hauteur fixe avec overflow-y */}
  <div ref={timelineRef} className="max-h-[400px] overflow-y-auto px-2 py-2 space-y-1">
    {rallies.map(rally => (
      <RallyRow
        key={rally.id}
        rally={rally}
        isActive={isRallyActive(rally)}
        onActionClick={onActionClick}
        activeSkills={activeSkills}
      />
    ))}
  </div>
</div>

COMPOSANT INTERNE : RallyRow

interface RallyRowProps {
  rally: Rally;
  isActive: boolean;           // true si le currentTime vidéo est dans ce rally
  onActionClick?: (action: Action, rally: Rally) => void;
  activeSkills: Set<Skill>;
}

<div className={`rounded px-2 py-1.5 transition-colors ${isActive ? 'bg-slate-700/80 ring-1 ring-primary-blue' : 'hover:bg-slate-700/40'}`}>
  {/* Ligne header du rally */}
  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
    <span className="font-mono tabular-nums">{rally.scoreAfter.home}-{rally.scoreAfter.away}</span>
    <span className="text-slate-600">•</span>
    <span>Set {rally.setNumber}</span>
    <span className="text-slate-600">•</span>
    <span>Rally #{rally.rallyNumber}</span>
    {rally.videoTimestamp && (
      <>
        <span className="text-slate-600">•</span>
        <span className="text-primary-blue cursor-pointer hover:underline"
              onClick={() => seekToRally(rally)}>
          {formatVideoTime(dvwToYouTubeTime(rally.videoTimestamp, offset))}
        </span>
      </>
    )}
  </div>

  {/* Actions du rally — en ligne horizontale */}
  <div className="flex flex-wrap gap-1">
    {rally.actions
      .filter(a => activeSkills.has(a.skill))
      .map(action => (
        <ActionChip
          key={action.id}
          action={action}
          isCurrentAction={isActionCurrent(action)}
          onClick={() => handleActionClick(action, rally)}
        />
    ))}
  </div>
</div>

COMPOSANT INTERNE : ActionChip

interface ActionChipProps {
  action: Action;
  isCurrentAction: boolean;    // true si le currentTime correspond à cette action
  onClick: () => void;
}

<button
  onClick={onClick}
  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium
    transition-all cursor-pointer
    ${getQualityColorClass(action.quality)}
    ${isCurrentAction ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'}
  `}
  title={`${getSkillLabel(action.skill)} — ${action.player.number} — ${action.quality}`}
>
  <span>{getSkillIcon(action.skill)}</span>
  <span>#{action.player.number}</span>
</button>

═══════════════════════════════════════════════
FICHIER 2 : packages/viewer/src/utils/timelineHelpers.ts
═══════════════════════════════════════════════

Types et constantes pour la timeline :

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

export const SKILL_FILTERS: { skill: Skill; icon: string; label: string }[] = [
  { skill: 'serve', icon: '🎯', label: 'Services' },
  { skill: 'receive', icon: '🛡️', label: 'Réceptions' },
  { skill: 'attack', icon: '💥', label: 'Attaques' },
  { skill: 'block', icon: '🧱', label: 'Blocks' },
  { skill: 'dig', icon: '⬇️', label: 'Défenses' },
  { skill: 'set', icon: '🙌', label: 'Passes' },
];

export function getSkillIcon(skill: Skill): string {
  return SKILL_ICONS[skill] || '🏐';
}

export function getSkillLabel(skill: Skill): string {
  return SKILL_LABELS[skill] || skill;
}

export function getQualityColorClass(quality: Quality): string {
  switch (quality) {
    case '#': return 'bg-quality-kill text-white';
    case '+': return 'bg-quality-positive text-white';
    case '!': return 'bg-quality-neutral text-slate-900';
    case '-': return 'bg-quality-negative text-white';
    case '/': return 'bg-quality-poor text-white';
    case '=': return 'bg-quality-error text-white';
    default: return 'bg-slate-600 text-white';
  }
}

export function isActionInTimeRange(
  action: Action,
  currentTime: number,
  offset: number,
  toleranceSeconds: number = 2
): boolean {
  if (!action.videoTimestamp) return false;
  const actionYTTime = action.videoTimestamp + offset;
  return Math.abs(currentTime - actionYTTime) <= toleranceSeconds;
}

export function isRallyInTimeRange(
  rally: Rally,
  currentTime: number,
  offset: number
): boolean {
  if (!rally.videoTimestamp) return false;
  const rallyStart = rally.videoTimestamp + offset;
  const rallyEnd = (rally.endVideoTimestamp || rally.videoTimestamp + 15) + offset;
  return currentTime >= rallyStart && currentTime <= rallyEnd;
}

export function getRalliesForSet(match: Match, setNumber: number | null): Rally[] {
  if (setNumber === null) {
    return match.sets.flatMap(s => s.rallies);
  }
  const set = match.sets.find(s => s.number === setNumber);
  return set?.rallies ?? [];
}

═══════════════════════════════════════════════
FICHIER 3 : Mise à jour de AnalysisPage.tsx
═══════════════════════════════════════════════

Ajouter ActionTimeline dans la colonne gauche, SOUS le VideoPlayer + OffsetCalibrator :

{/* Colonne gauche : Vidéo + Calibration + Timeline */}
<div className="flex flex-col gap-4">
  <VideoPlayer />
  {/* Info synchro existant */}
  <OffsetCalibrator />
  <ActionTimeline
    match={match}
    selectedSet={selectedSet}
    onActionClick={(action, rally) => {
      if (action.videoTimestamp != null) {
        const ytTime = action.videoTimestamp + videoStore.offset;
        // Sauter 2 secondes avant l'action pour voir le contexte
        videoStore.seekTo(Math.max(0, ytTime - 2));
      }
    }}
  />
</div>

LOGIQUE SCROLL AUTO :
- Quand un rally devient actif (isRallyActive), auto-scroll la timeline pour le centrer
- Utiliser timelineRef.current.scrollTo({ top: rallyElement.offsetTop - 100, behavior: 'smooth' })
- Ne PAS auto-scroll si l'utilisateur est en train de scroller manuellement (détecter avec onScroll)

LOGIQUE FILTRES SKILLS :
- Par défaut, TOUS les skills sont actifs (toutes les actions visibles)
- Cliquer sur un filtre toggle ce skill ON/OFF
- Si tous sont OFF → réactiver tous
- Stocker les filtres dans un useState<Set<Skill>> local

═══════════════════════════════════════════════
TESTS : packages/viewer/tests/timeline.test.ts
═══════════════════════════════════════════════

Tests unitaires (pas de rendering React — on teste la logique) :

1. "getSkillIcon retourne un emoji pour chaque skill"
   - Tester les 7 skills

2. "getQualityColorClass retourne la bonne classe pour chaque qualité"
   - '#' → contient 'bg-quality-kill'
   - '=' → contient 'bg-quality-error'

3. "isRallyInTimeRange détecte un rally actif"
   - rally.videoTimestamp=100, endVideoTimestamp=115, currentTime=110, offset=0 → true
   - rally.videoTimestamp=100, endVideoTimestamp=115, currentTime=50, offset=0 → false

4. "isRallyInTimeRange gère l'offset"
   - rally.videoTimestamp=100, currentTime=130, offset=30 → true (100+30=130)
   - rally.videoTimestamp=100, currentTime=130, offset=0 → false

5. "isActionInTimeRange avec tolérance"
   - action.videoTimestamp=100, currentTime=101, offset=0, tolerance=2 → true
   - action.videoTimestamp=100, currentTime=105, offset=0, tolerance=2 → false

6. "getRalliesForSet retourne tous les rallies quand setNumber=null"
   - Charger le match via parseDVW
   - getRalliesForSet(match, null).length === total rallies

7. "getRalliesForSet filtre par set"
   - getRalliesForSet(match, 1).length > 0
   - getRalliesForSet(match, 1).every(r => r.setNumber === 1)

8. "SKILL_FILTERS contient 6 filtres"
   - SKILL_FILTERS.length === 6

9. "getSkillLabel retourne le label français"
   - getSkillLabel('serve') === 'Service'
   - getSkillLabel('attack') === 'Attaque'

10. "isActionInTimeRange retourne false si pas de videoTimestamp"
    - action sans videoTimestamp → false

Total : 10 tests

═══════════════════════════════════════════════

RÉSUMÉ DES FICHIERS :

| Fichier | Type | ~Lignes |
|---------|------|---------|
| packages/viewer/src/components/ActionTimeline.tsx | Composant React | ~220 |
| packages/viewer/src/utils/timelineHelpers.ts | Utils + constantes | ~120 |
| packages/viewer/src/pages/AnalysisPage.tsx | MODIFIÉ | +15 |
| packages/viewer/tests/timeline.test.ts | Tests Vitest | ~100 |

Total : ~455 lignes, 10 tests

ATTENTION :
- L'auto-scroll ne doit PAS être déclenché quand l'utilisateur scrolle manuellement
- Les ActionChip doivent être petits (compacts) pour afficher beaucoup d'actions par rally
- La timeline filtre aussi par selectedSet (synchronisé avec le SetSelector existant)
- Les couleurs des quality chips doivent utiliser les classes Tailwind existantes (quality-kill, etc.)
- Sur mobile, la timeline est sous le player (pas à côté)
- Si la vidéo n'est pas chargée, la timeline reste fonctionnelle mais sans les timestamps
- Limiter le re-render : utiliser useMemo pour filtrer les rallies, memo pour RallyRow

Exécute les tests et vérifie que la timeline s'affiche et interagit avec le player.
```

---

## 📌 PROMPT 2-LAYOUT — Dashboard Modulaire Drag & Resize (DÉTAILLÉ)

```
Refactorise AnalysisPage en dashboard modulaire avec panneaux redimensionnables, déplaçables et détachables.

CONTEXTE :
- Lis packages/viewer/src/pages/AnalysisPage.tsx — layout actuel 3 colonnes grid fixes
- Lis packages/viewer/src/store/videoStore.ts — le store vidéo (seekTo, currentTime, offset)
- Lis packages/viewer/src/store/matchStore.ts — le store match
- Les modules actuels : VideoPlayer, OffsetCalibrator, ActionTimeline, PlaylistPlayer, AdvancedFilters, SetSelector, PlayerSelector, StatsTable
- Les modules futurs (2D-2H) : PlayByPlayChart, SetterDistribution, RotationView, PlayerPage
- Stack : React 18 + Zustand + Tailwind CSS (thème sombre slate-900)

OBJECTIF : L'entraîneur veut :
- Agrandir la vidéo pour voir le jeu en détail pendant qu'il clique dans la playlist
- Réduire les filtres quand il n'en a plus besoin
- Détacher la vidéo sur un second écran (vidéoprojecteur/TV) et garder la timeline sur le laptop
- Naviguer dans la playlist avec les flèches clavier ← → même quand la vidéo est détachée
- Retrouver son layout préféré à chaque session

DÉPENDANCE À INSTALLER :
   pnpm --filter @volleyvision/viewer add react-grid-layout
   pnpm --filter @volleyvision/viewer add -D @types/react-grid-layout

═══════════════════════════════════════════════
FICHIER 1 : packages/viewer/src/store/layoutStore.ts
═══════════════════════════════════════════════

Store Zustand pour persister les positions/tailles des panneaux.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Layout } from 'react-grid-layout';

interface PanelConfig {
  id: string;
  title: string;
  icon: string;
  visible: boolean;
  collapsed: boolean;        // true = panneau réduit à sa barre de titre
}

interface LayoutState {
  // Layouts par breakpoint (lg, md, sm)
  layouts: { lg: Layout[]; md: Layout[]; sm: Layout[] };
  panels: PanelConfig[];
  isVideoDetached: boolean;     // true = vidéo dans fenêtre séparée

  // Actions
  setLayouts: (layouts: { lg: Layout[]; md: Layout[] ; sm: Layout[] }) => void;
  togglePanelVisibility: (panelId: string) => void;
  togglePanelCollapsed: (panelId: string) => void;
  setVideoDetached: (detached: boolean) => void;
  resetToDefault: () => void;
}

DEFAULT PANELS :

const DEFAULT_PANELS: PanelConfig[] = [
  { id: 'video',       title: 'Vidéo',             icon: '🎥', visible: true,  collapsed: false },
  { id: 'calibration', title: 'Calibration',        icon: '⚙️', visible: true,  collapsed: true  },
  { id: 'timeline',    title: 'Timeline / Playlist', icon: '⏱',  visible: true,  collapsed: false },
  { id: 'filters',     title: 'Filtres avancés',    icon: '🔍', visible: true,  collapsed: false },
  { id: 'stats',       title: 'Statistiques',       icon: '📊', visible: true,  collapsed: false },
  // Futurs panneaux (ajoutés par 2D-2H) :
  // { id: 'playbyplay',  title: 'Play-by-Play',     icon: '📈', visible: false, collapsed: false },
  // { id: 'distribution',title: 'Passeuse',          icon: '🏐', visible: false, collapsed: false },
  // { id: 'rotation',    title: 'Rotation',          icon: '🏟️', visible: false, collapsed: false },
];

DEFAULT LAYOUTS :

const DEFAULT_LAYOUTS = {
  lg: [  // 12 colonnes, écran ≥ 1200px
    { i: 'video',       x: 0, y: 0, w: 5, h: 8,  minW: 3, minH: 4 },
    { i: 'calibration', x: 0, y: 8, w: 5, h: 2,  minW: 3, minH: 1 },
    { i: 'timeline',    x: 5, y: 0, w: 4, h: 10, minW: 3, minH: 4 },
    { i: 'filters',     x: 9, y: 0, w: 3, h: 5,  minW: 2, minH: 3 },
    { i: 'stats',       x: 0, y: 10, w: 12, h: 6, minW: 6, minH: 3 },
  ],
  md: [  // 10 colonnes, écran 996-1199px
    { i: 'video',       x: 0, y: 0, w: 5, h: 7,  minW: 3, minH: 4 },
    { i: 'calibration', x: 0, y: 7, w: 5, h: 2,  minW: 3, minH: 1 },
    { i: 'timeline',    x: 5, y: 0, w: 5, h: 9,  minW: 3, minH: 4 },
    { i: 'filters',     x: 0, y: 9, w: 10, h: 4, minW: 4, minH: 3 },
    { i: 'stats',       x: 0, y: 13, w: 10, h: 6, minW: 6, minH: 3 },
  ],
  sm: [  // 6 colonnes, écran < 996px (mobile/tablette)
    { i: 'video',       x: 0, y: 0, w: 6, h: 6,  minW: 6, minH: 4 },
    { i: 'calibration', x: 0, y: 6, w: 6, h: 2,  minW: 6, minH: 1 },
    { i: 'timeline',    x: 0, y: 8, w: 6, h: 8,  minW: 6, minH: 4 },
    { i: 'filters',     x: 0, y: 16, w: 6, h: 5, minW: 6, minH: 3 },
    { i: 'stats',       x: 0, y: 21, w: 6, h: 6, minW: 6, minH: 3 },
  ],
};

Persister dans localStorage avec la clé 'volleyvision-layout'.

═══════════════════════════════════════════════
FICHIER 2 : packages/viewer/src/components/layout/PanelWrapper.tsx
═══════════════════════════════════════════════

Conteneur universel pour chaque panneau du dashboard.

Props :
interface PanelWrapperProps {
  panelId: string;
  title: string;
  icon: string;
  children: React.ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onPopOut?: () => void;         // Seulement pour le panneau vidéo
  showPopOut?: boolean;
  className?: string;
}

STRUCTURE JSX :

<div className="bg-slate-800 rounded-lg overflow-hidden h-full flex flex-col">
  {/* Barre de titre — toujours visible, sert de poignée de drag */}
  <div
    className="panel-drag-handle flex items-center justify-between px-3 py-2
               bg-slate-700/50 border-b border-slate-600 cursor-grab active:cursor-grabbing
               select-none"
  >
    <div className="flex items-center gap-2 text-sm">
      <span>{icon}</span>
      <span className="font-semibold text-slate-300">{title}</span>
    </div>
    <div className="flex items-center gap-1">
      {/* Bouton pop-out (vidéo seulement) */}
      {showPopOut && (
        <button
          onClick={onPopOut}
          className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white"
          title="Détacher dans une fenêtre séparée"
        >
          ⧉
        </button>
      )}
      {/* Bouton collapse/expand */}
      <button
        onClick={onToggleCollapse}
        className="p-1 rounded hover:bg-slate-600 text-slate-400 hover:text-white"
        title={collapsed ? 'Déplier' : 'Replier'}
      >
        {collapsed ? '▼' : '▲'}
      </button>
    </div>
  </div>

  {/* Contenu — masqué si collapsed */}
  {!collapsed && (
    <div className="flex-1 overflow-auto">
      {children}
    </div>
  )}
</div>

ATTENTION :
- La classe "panel-drag-handle" est utilisée par react-grid-layout comme draggableHandle
- Quand collapsed=true, le panneau garde sa place dans la grille mais n'affiche que la barre de titre
- Le contenu utilise overflow-auto pour s'adapter à la taille du panneau

═══════════════════════════════════════════════
FICHIER 3 : packages/viewer/src/components/layout/DashboardLayout.tsx
═══════════════════════════════════════════════

Wrapper react-grid-layout qui orchestre tous les panneaux.

import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-grid-layout/css/resizing.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

Props :
interface DashboardLayoutProps {
  children: React.ReactNode;    // Les panneaux en tant qu'enfants
}

STRUCTURE JSX :

<div className="relative">
  {/* Barre d'outils layout */}
  <div className="flex items-center justify-between mb-3 px-2">
    <div className="flex items-center gap-2">
      {/* Toggle visibilité des panneaux */}
      {panels.map(panel => (
        <button
          key={panel.id}
          onClick={() => togglePanelVisibility(panel.id)}
          className={`px-2 py-1 rounded text-xs transition-colors
            ${panel.visible
              ? 'bg-slate-700 text-white'
              : 'bg-slate-800 text-slate-500 line-through'}`}
          title={`${panel.visible ? 'Masquer' : 'Afficher'} ${panel.title}`}
        >
          {panel.icon} {panel.title}
        </button>
      ))}
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={resetToDefault}
        className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-400 hover:text-white"
        title="Réinitialiser la disposition"
      >
        ↺ Reset layout
      </button>
    </div>
  </div>

  <ResponsiveGridLayout
    layouts={layouts}
    breakpoints={{ lg: 1200, md: 996, sm: 0 }}
    cols={{ lg: 12, md: 10, sm: 6 }}
    rowHeight={40}
    onLayoutChange={(currentLayout, allLayouts) => setLayouts(allLayouts)}
    draggableHandle=".panel-drag-handle"
    compactType="vertical"
    isResizable={true}
    isDraggable={true}
    margin={[8, 8]}
  >
    {panels.filter(p => p.visible).map(panel => (
      <div key={panel.id}>
        <PanelWrapper
          panelId={panel.id}
          title={panel.title}
          icon={panel.icon}
          collapsed={panel.collapsed}
          onToggleCollapse={() => togglePanelCollapsed(panel.id)}
          onPopOut={panel.id === 'video' ? () => handleVideoPopOut() : undefined}
          showPopOut={panel.id === 'video'}
        >
          {renderPanelContent(panel.id)}
        </PanelWrapper>
      </div>
    ))}
  </ResponsiveGridLayout>
</div>

FONCTION renderPanelContent(panelId) :
  switch (panelId) {
    case 'video':       return <VideoPlayer />;
    case 'calibration': return <OffsetCalibrator />;
    case 'timeline':    return activeTab === 'timeline'
                          ? <ActionTimeline match={match} selectedSet={selectedSet} />
                          : <PlaylistPlayer items={filteredActions} ... />;
    case 'filters':     return <AdvancedFilters match={match} resultCount={filteredActions.length} />;
    case 'stats':       return <StatsTable stats={filteredStats} match={match} />;
    // Futurs :
    // case 'playbyplay':   return <PlayByPlayChart ... />;
    // case 'distribution': return <SetterDistribution ... />;
    // case 'rotation':     return <RotationView ... />;
  }

═══════════════════════════════════════════════
FICHIER 4 : packages/viewer/src/hooks/usePopOutWindow.ts
═══════════════════════════════════════════════

Hook pour détacher la vidéo dans une fenêtre séparée (second écran/vidéoprojecteur).

import { useRef, useCallback, useEffect } from 'react';

interface UsePopOutWindowOptions {
  title?: string;
  width?: number;
  height?: number;
  onClose?: () => void;
}

interface UsePopOutWindowReturn {
  popOutRef: React.RefObject<HTMLDivElement>;  // Ref du contenu à déplacer
  isPopOut: boolean;
  popOut: () => void;
  popIn: () => void;
}

ALGORITHME :

1. popOut() :
   - Ouvrir une nouvelle fenêtre : window.open('', title, `width=${width},height=${height}`)
   - Copier les styles CSS du document parent dans la fenêtre enfant :
     → Itérer sur document.styleSheets, créer des <link> ou <style> dans la nouvelle fenêtre
     → Inclure le Tailwind CSS compilé pour que les classes fonctionnent
   - Déplacer le DOM node (popOutRef.current) dans la nouvelle fenêtre :
     → newWindow.document.body.appendChild(node)
   - Écouter newWindow.onbeforeunload → popIn() automatiquement
   - Stocker la référence newWindow dans un ref

2. popIn() :
   - Récupérer le node depuis la fenêtre enfant
   - Le remettre dans le DOM parent (à sa position originale)
   - Fermer la fenêtre enfant
   - layoutStore.setVideoDetached(false)

3. Cleanup (unmount) :
   - Si la fenêtre enfant est ouverte → popIn() + fermer

ATTENTION :
- Le player YouTube doit CONTINUER à fonctionner après le déplacement DOM
  → YouTube IFrame API supporte le déplacement si on ne détruit pas l'iframe
- La communication entre les 2 fenêtres se fait via le store Zustand (même instance JS)
  → Les clics dans la playlist (fenêtre principale) déclenchent seekTo dans le videoStore
  → Le player vidéo (fenêtre détachée) écoute les seekRequests du store
- Si la fenêtre enfant est fermée par l'utilisateur → auto popIn()

ALTERNATIVE SIMPLIFIÉE (si le déplacement DOM pose problème) :
- Utiliser l'API Picture-in-Picture (PiP) du navigateur :
  → videoElement.requestPictureInPicture()
- LIMITATION : PiP ne fonctionne qu'avec des <video> natifs, pas des iframes YouTube
- WORKAROUND : Ouvrir un window.open() avec SEULEMENT le player YouTube (URL embed)
  → La fenêtre principale envoie les commandes seek via BroadcastChannel

═══════════════════════════════════════════════
FICHIER 5 : packages/viewer/src/hooks/useKeyboardNavigation.ts
═══════════════════════════════════════════════

Hook pour naviguer au clavier dans la playlist, même quand la vidéo est détachée.

import { useEffect } from 'react';

interface UseKeyboardNavigationOptions {
  enabled: boolean;              // Actif seulement en mode playlist
  onPrev: () => void;            // Flèche gauche ←
  onNext: () => void;            // Flèche droite →
  onPlayPause: () => void;       // Espace
  onSeekBack: () => void;        // Shift + ← (recul 5s)
  onSeekForward: () => void;     // Shift + → (avance 5s)
}

ALGORITHME :

1. useEffect qui ajoute un event listener 'keydown' sur window :
   - ArrowLeft → onPrev()
   - ArrowRight → onNext()
   - Space → onPlayPause() + e.preventDefault() (empêcher le scroll)
   - Shift+ArrowLeft → onSeekBack()
   - Shift+ArrowRight → onSeekForward()

2. Ignorer les événements quand :
   - Le focus est sur un <input>, <textarea>, <select> (l'utilisateur tape du texte)
   - enabled === false

3. Cleanup : removeEventListener au unmount

ATTENTION :
- Les raccourcis clavier fonctionnent DANS la fenêtre principale
- Même si la vidéo est détachée, les commandes passent par le videoStore Zustand
- Space doit être preventDefault() sinon le navigateur scrolle la page

═══════════════════════════════════════════════
FICHIER 6 : Mise à jour de AnalysisPage.tsx
═══════════════════════════════════════════════

Refactoriser complètement AnalysisPage pour utiliser DashboardLayout :

AVANT (layout fixe) :
  <div className="grid grid-cols-3 gap-3">
    <VideoPlayer />
    <Timeline />
    <Filters />
  </div>
  <StatsTable />

APRÈS (dashboard modulaire) :
  <DashboardLayout>
    {/* Tous les panneaux sont rendus par DashboardLayout via renderPanelContent() */}
  </DashboardLayout>

L'AnalysisPage devient un orchestrateur léger :
- Garde le state (selectedSet, selectedPlayer, activeTab)
- Passe les props aux composants via le renderPanelContent
- Utilise useKeyboardNavigation pour les raccourcis clavier
- Le layout est entièrement géré par layoutStore + DashboardLayout

═══════════════════════════════════════════════
FICHIER 7 : packages/viewer/src/styles/grid-layout.css
═══════════════════════════════════════════════

CSS custom pour react-grid-layout adapté au thème sombre :

/* Handles de resize */
.react-grid-item > .react-resizable-handle {
  background: none;
  /* Petit triangle en bas à droite */
}
.react-grid-item > .react-resizable-handle::after {
  content: '';
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 8px;
  height: 8px;
  border-right: 2px solid rgba(148, 163, 184, 0.4);  /* slate-400 */
  border-bottom: 2px solid rgba(148, 163, 184, 0.4);
}

/* Placeholder pendant le drag */
.react-grid-item.react-grid-placeholder {
  background: rgba(59, 130, 246, 0.15) !important;  /* primary-blue */
  border: 2px dashed rgba(59, 130, 246, 0.5) !important;
  border-radius: 8px;
}

/* Animation de transition des panneaux */
.react-grid-item {
  transition: all 200ms ease;
}
.react-grid-item.cssTransforms {
  transition: transform 200ms ease;
}
.react-grid-item.react-draggable-dragging {
  transition: none;
  z-index: 100;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

Importer ce fichier dans main.tsx ou App.tsx.

═══════════════════════════════════════════════
TESTS : packages/viewer/tests/layout.test.ts
═══════════════════════════════════════════════

Tests unitaires (logique de layout, pas de rendering) :

1. "DEFAULT_LAYOUTS.lg contient 5 panneaux"
   - DEFAULT_LAYOUTS.lg.length === 5

2. "DEFAULT_PANELS a les bons ids"
   - panels.map(p => p.id) contient 'video', 'timeline', 'filters', 'stats', 'calibration'

3. "togglePanelVisibility cache un panneau"
   - Appeler togglePanelVisibility('stats')
   - panels.find(p => p.id === 'stats').visible === false

4. "togglePanelVisibility ré-affiche un panneau caché"
   - Double toggle → visible === true

5. "togglePanelCollapsed replie un panneau"
   - togglePanelCollapsed('calibration')
   - panels.find(p => p.id === 'calibration').collapsed === true

6. "resetToDefault restaure les layouts par défaut"
   - Modifier un layout, puis resetToDefault()
   - layouts.lg === DEFAULT_LAYOUTS.lg

7. "chaque layout lg a minW et minH"
   - DEFAULT_LAYOUTS.lg.every(l => l.minW > 0 && l.minH > 0)

8. "les raccourcis clavier ne se déclenchent pas sur un input"
   - Simuler un événement keydown avec target = <input>
   - Le callback ne doit PAS être appelé

Total : 8 tests

═══════════════════════════════════════════════

RÉSUMÉ DES FICHIERS :

| Fichier | Type | ~Lignes |
|---------|------|---------|
| packages/viewer/src/store/layoutStore.ts | Store Zustand | ~100 |
| packages/viewer/src/components/layout/PanelWrapper.tsx | Composant React | ~70 |
| packages/viewer/src/components/layout/DashboardLayout.tsx | Composant React | ~180 |
| packages/viewer/src/hooks/usePopOutWindow.ts | Hook React | ~100 |
| packages/viewer/src/hooks/useKeyboardNavigation.ts | Hook React | ~50 |
| packages/viewer/src/pages/AnalysisPage.tsx | REFACTORISÉ | ~120 |
| packages/viewer/src/styles/grid-layout.css | CSS custom | ~40 |
| packages/viewer/tests/layout.test.ts | Tests Vitest | ~80 |

Total : ~740 lignes, 8 tests

ATTENTION :
- react-grid-layout nécessite que chaque enfant direct ait une prop key=panelId
- Le draggableHandle=".panel-drag-handle" limite le drag à la barre de titre (pas tout le panneau)
- Les layouts sont persistés dans localStorage — si l'utilisateur ajoute un nouveau panneau
  (futur prompt 2E, 2F...) il faut merger avec les positions existantes (pas écraser)
- Le pop-out vidéo est la fonctionnalité la plus complexe — commencer par une version
  window.open() simple et itérer
- Sur mobile (sm), le layout est empilé verticalement en 1 colonne — pas de drag possible
- Importer 'react-grid-layout/css/styles.css' + le CSS custom dans main.tsx
- Le resize handle de react-grid-layout est en bas à droite de chaque panneau
- Le compactType="vertical" empêche les trous dans la grille
- Quand un panneau est caché (visible=false), il est retiré du layout mais sa position est gardée
- Les futurs panneaux (2D-2H) s'ajouteront en déclarant un nouveau PanelConfig dans DEFAULT_PANELS
  et un case dans renderPanelContent() — architecture plug-in

Exécute les tests et vérifie que le dashboard est fonctionnel avec drag, resize et pop-out.
```

---

## 🔍 PROMPT 2C — Filtres avancés + Playlist vidéo (DÉTAILLÉ)

```
Implémente le système de filtres multi-critères et le mode playlist vidéo.

CONTEXTE :
- Lis packages/viewer/src/store/matchStore.ts — match, stats, sets[].rallies[].actions[]
- Lis packages/viewer/src/store/videoStore.ts — seekTo, currentTime, offset
- Lis packages/viewer/src/components/ActionTimeline.tsx — timeline existante (PROMPT 2B)
- Lis packages/viewer/src/utils/timelineHelpers.ts — helpers existants
- Les filtres existants (SetSelector, PlayerSelector) sont basiques → on les enrichit
- L'attaque a : attackCombo, startZone, endZone, setterCall, numBlockers
- Le rally a : rotation.home, rotation.away, servingTeam
- Stack : React 18 + Zustand + Tailwind CSS (thème sombre slate-900)

OBJECTIF : Le coach veut dire "montre-moi toutes les attaques de Julia en zone 4 avec 2 bloqueurs
au set 2 quand on sert" — et les voir enchaînées en mode playlist vidéo.

═══════════════════════════════════════════════
FICHIER 1 : packages/viewer/src/store/filterStore.ts
═══════════════════════════════════════════════

Store Zustand pour les filtres avancés (séparé de matchStore).

import { create } from 'zustand';
import type { Skill, QualityPro, TeamSide } from '@volleyvision/data-model';

export interface FilterCriteria {
  // Filtres de base
  setNumbers: number[];             // [] = tous les sets
  playerIds: string[];              // [] = tous les joueurs
  teamSide: TeamSide | null;       // null = les deux équipes

  // Filtres par skill
  skills: Skill[];                  // [] = tous les skills
  qualities: QualityPro[];          // [] = toutes les qualités

  // Filtres spécifiques attaque
  attackCombos: string[];           // [] = tous les combos (V5, XC, C1...)
  startZones: number[];             // [] = toutes les zones de départ
  endZones: number[];               // [] = toutes les zones d'arrivée
  minBlockers: number | null;       // null = pas de filtre
  maxBlockers: number | null;

  // Filtres contextuels
  rotations: number[];              // [] = toutes les rotations (1-6)
  servingTeam: TeamSide | null;     // null = pas de filtre
  setterCalls: string[];            // [] = tous les setter calls

  // Filtres vidéo
  hasVideoTimestamp: boolean;       // true = seulement les actions avec timestamp
}

interface FilterState {
  criteria: FilterCriteria;
  isPlaylistMode: boolean;
  playlistIndex: number;            // Index courant dans la playlist

  // Actions
  setCriteria: (partial: Partial<FilterCriteria>) => void;
  resetCriteria: () => void;
  togglePlaylistMode: () => void;
  setPlaylistIndex: (index: number) => void;
  nextInPlaylist: () => void;
  prevInPlaylist: () => void;
}

const DEFAULT_CRITERIA: FilterCriteria = {
  setNumbers: [],
  playerIds: [],
  teamSide: null,
  skills: [],
  qualities: [],
  attackCombos: [],
  startZones: [],
  endZones: [],
  minBlockers: null,
  maxBlockers: null,
  rotations: [],
  servingTeam: null,
  setterCalls: [],
  hasVideoTimestamp: false,
};

═══════════════════════════════════════════════
FICHIER 2 : packages/viewer/src/utils/filterEngine.ts
═══════════════════════════════════════════════

Moteur de filtrage qui applique les FilterCriteria sur les actions du match.

import { Match, Rally, Action, FilterCriteria } from types;

export interface FilteredAction {
  action: Action;
  rally: Rally;
  setNumber: number;
  matchTime: string;           // "Set 1 — 15:12 — Rally #23"
}

export function applyFilters(match: Match, criteria: FilterCriteria): FilteredAction[] {
  const results: FilteredAction[] = [];

  for (const set of match.sets) {
    // Filtre set
    if (criteria.setNumbers.length > 0 && !criteria.setNumbers.includes(set.number)) continue;

    for (const rally of set.rallies) {
      // Filtre rotation
      if (criteria.rotations.length > 0) {
        const homeRot = rally.rotation?.home;
        const awayRot = rally.rotation?.away;
        if (criteria.teamSide === 'home' && homeRot && !criteria.rotations.includes(homeRot)) continue;
        if (criteria.teamSide === 'away' && awayRot && !criteria.rotations.includes(awayRot)) continue;
        if (criteria.teamSide === null && homeRot && !criteria.rotations.includes(homeRot)) continue;
      }

      // Filtre servingTeam
      if (criteria.servingTeam && rally.servingTeam !== criteria.servingTeam) continue;

      for (const action of rally.actions) {
        if (matchesActionCriteria(action, criteria)) {
          results.push({
            action,
            rally,
            setNumber: set.number,
            matchTime: formatMatchTime(set.number, rally),
          });
        }
      }
    }
  }

  return results;
}

function matchesActionCriteria(action: Action, criteria: FilterCriteria): boolean {
  // Filtre team
  if (criteria.teamSide && action.player.team !== criteria.teamSide) return false;

  // Filtre joueur
  if (criteria.playerIds.length > 0 && !criteria.playerIds.includes(action.player.id)) return false;

  // Filtre skill
  if (criteria.skills.length > 0 && !criteria.skills.includes(action.skill)) return false;

  // Filtre qualité
  if (criteria.qualities.length > 0 && !criteria.qualities.includes(action.quality as QualityPro)) return false;

  // Filtre combo d'attaque
  if (criteria.attackCombos.length > 0 && (!action.subtype || !criteria.attackCombos.includes(action.subtype))) return false;

  // Filtre zone départ
  if (criteria.startZones.length > 0 && (!action.startZone || !criteria.startZones.includes(action.startZone))) return false;

  // Filtre zone arrivée
  if (criteria.endZones.length > 0 && (!action.endZone || !criteria.endZones.includes(action.endZone))) return false;

  // Filtre bloqueurs
  if (criteria.minBlockers !== null && (action.numBlockers ?? 0) < criteria.minBlockers) return false;
  if (criteria.maxBlockers !== null && (action.numBlockers ?? 0) > criteria.maxBlockers) return false;

  // Filtre setter call
  if (criteria.setterCalls.length > 0 && (!action.setterCall || !criteria.setterCalls.includes(action.setterCall))) return false;

  // Filtre videoTimestamp
  if (criteria.hasVideoTimestamp && action.videoTimestamp == null) return false;

  return true;
}

function formatMatchTime(setNumber: number, rally: Rally): string {
  return `Set ${setNumber} — ${rally.scoreAfter.home}-${rally.scoreAfter.away} — Rally #${rally.rallyNumber}`;
}

// Helpers pour construire des presets de filtres courants
export function buildPreset(type: string, match: Match, playerId?: string): Partial<FilterCriteria> {
  switch (type) {
    case 'all-attacks':
      return { skills: ['attack'], playerIds: playerId ? [playerId] : [] };
    case 'all-serves':
      return { skills: ['serve'], playerIds: playerId ? [playerId] : [] };
    case 'kills-only':
      return { skills: ['attack'], qualities: ['#'], playerIds: playerId ? [playerId] : [] };
    case 'errors-only':
      return { qualities: ['=', '/'] };
    case 'reception':
      return { skills: ['receive'], playerIds: playerId ? [playerId] : [] };
    default:
      return {};
  }
}

═══════════════════════════════════════════════
FICHIER 3 : packages/viewer/src/components/AdvancedFilters.tsx
═══════════════════════════════════════════════

Panneau de filtres avancés avec interface compacte et pliable.

Props :
interface AdvancedFiltersProps {
  match: Match;
  resultCount: number;           // Nombre de résultats filtrés (affiché en badge)
  className?: string;
}

STRUCTURE JSX :

<div className="bg-slate-800 rounded-lg overflow-hidden">
  {/* Header pliable */}
  <button
    onClick={() => setIsExpanded(!isExpanded)}
    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/50"
  >
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold">🔍 Filtres avancés</span>
      {activeFilterCount > 0 && (
        <span className="px-2 py-0.5 bg-primary-blue rounded-full text-xs">{activeFilterCount} actif(s)</span>
      )}
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">{resultCount} résultat(s)</span>
      <ChevronIcon isExpanded={isExpanded} />
    </div>
  </button>

  {isExpanded && (
    <div className="px-4 pb-4 space-y-4 border-t border-slate-700">
      {/* Presets rapides */}
      <div className="flex flex-wrap gap-2 pt-3">
        <PresetButton label="Attaques" onClick={() => applyPreset('all-attacks')} />
        <PresetButton label="Services" onClick={() => applyPreset('all-serves')} />
        <PresetButton label="Kills" onClick={() => applyPreset('kills-only')} />
        <PresetButton label="Réceptions" onClick={() => applyPreset('reception')} />
        <PresetButton label="Erreurs" onClick={() => applyPreset('errors-only')} />
        <button onClick={resetAll} className="text-xs text-red-400 hover:text-red-300">
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

        {/* Joueuse */}
        <FilterGroup label="Joueuse">
          <MultiSelect
            options={getPlayersForTeam(match, criteria.teamSide)}
            selected={criteria.playerIds}
            onChange={ids => setCriteria({ playerIds: ids })}
            placeholder="Toutes"
          />
        </FilterGroup>

        {/* Skill */}
        <FilterGroup label="Skill">
          <SkillToggleGroup
            selected={criteria.skills}
            onChange={skills => setCriteria({ skills })}
          />
        </FilterGroup>

        {/* Qualité */}
        <FilterGroup label="Qualité">
          <QualityToggleGroup
            selected={criteria.qualities}
            onChange={qualities => setCriteria({ qualities })}
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

        {/* Combo d'attaque (seulement si skill=attack ou vide) */}
        {(criteria.skills.length === 0 || criteria.skills.includes('attack')) && (
          <FilterGroup label="Combo d'attaque">
            <MultiSelect
              options={match.dvwMetadata?.attackCombinations.map(c => ({
                value: c.code, label: `${c.code} — ${c.description}`
              })) ?? []}
              selected={criteria.attackCombos}
              onChange={combos => setCriteria({ attackCombos: combos })}
              placeholder="Tous"
            />
          </FilterGroup>
        )}

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

═══════════════════════════════════════════════
FICHIER 4 : packages/viewer/src/components/PlaylistPlayer.tsx
═══════════════════════════════════════════════

Mode playlist : enchaîne les clips filtrés automatiquement.

Props :
interface PlaylistPlayerProps {
  items: FilteredAction[];
  isActive: boolean;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  className?: string;
}

STRUCTURE JSX :

<div className="bg-slate-800 rounded-lg p-3">
  {/* Contrôles playlist */}
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <button onClick={onPrev} disabled={currentIndex <= 0} className="p-1 rounded hover:bg-slate-700 disabled:opacity-30">
        ⏮
      </button>
      <span className="text-sm font-mono tabular-nums">
        {currentIndex + 1} / {items.length}
      </span>
      <button onClick={onNext} disabled={currentIndex >= items.length - 1} className="p-1 rounded hover:bg-slate-700 disabled:opacity-30">
        ⏭
      </button>
    </div>

    <div className="flex items-center gap-2">
      {/* Marges avant/après le clip */}
      <label className="text-xs text-slate-400">Avant :</label>
      <select value={preRollSeconds} onChange={e => setPreRollSeconds(+e.target.value)}
              className="bg-slate-700 text-xs rounded px-1 py-0.5">
        <option value={1}>1s</option>
        <option value={2}>2s</option>
        <option value={3}>3s</option>
        <option value={5}>5s</option>
      </select>
      <label className="text-xs text-slate-400">Après :</label>
      <select value={postRollSeconds} onChange={e => setPostRollSeconds(+e.target.value)}
              className="bg-slate-700 text-xs rounded px-1 py-0.5">
        <option value={2}>2s</option>
        <option value={3}>3s</option>
        <option value={5}>5s</option>
      </select>

      {/* Toggle auto-advance */}
      <button
        onClick={toggleAutoAdvance}
        className={`px-2 py-1 rounded text-xs ${autoAdvance ? 'bg-primary-green text-white' : 'bg-slate-700 text-slate-400'}`}
      >
        Auto ▶
      </button>
    </div>
  </div>

  {/* Info clip courant */}
  <div className="text-xs text-slate-300 bg-slate-900 rounded p-2">
    <div className="flex items-center gap-2">
      <span className={getQualityColorClass(currentItem.action.quality) + ' px-1.5 py-0.5 rounded'}>
        {currentItem.action.quality}
      </span>
      <span>{getSkillLabel(currentItem.action.skill)}</span>
      <span>— #{currentItem.action.player.number}</span>
      <span className="text-slate-500">•</span>
      <span>{currentItem.matchTime}</span>
    </div>
  </div>

  {/* Mini-liste scrollable des clips */}
  <div className="mt-2 max-h-[150px] overflow-y-auto space-y-1">
    {items.map((item, i) => (
      <button
        key={item.action.id}
        onClick={() => onIndexChange(i)}
        className={`w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2
          ${i === currentIndex ? 'bg-primary-blue/20 text-white' : 'text-slate-400 hover:bg-slate-700'}`}
      >
        <span className="w-6 text-right font-mono">{i + 1}</span>
        <span className={getQualityColorClass(item.action.quality) + ' px-1 rounded'}>{item.action.quality}</span>
        <span>{getSkillIcon(item.action.skill)}</span>
        <span>#{item.action.player.number}</span>
        <span className="text-slate-500 ml-auto">{item.matchTime}</span>
      </button>
    ))}
  </div>
</div>

LOGIQUE PLAYLIST :

1. Quand un clip est sélectionné → seekTo(action.videoTimestamp + offset - preRollSeconds)
2. Quand autoAdvance est actif :
   - Surveiller currentTime via le videoStore
   - Si currentTime > action.videoTimestamp + offset + postRollSeconds → passer au clip suivant
   - Arrêter à la fin de la playlist
3. Quand on change de clip → play() automatiquement

═══════════════════════════════════════════════
FICHIER 5 : Mise à jour de AnalysisPage.tsx
═══════════════════════════════════════════════

Intégrer les filtres avancés et le mode playlist :

NOUVEAU LAYOUT (enrichi) :

{/* Colonne gauche : Vidéo + Calibration + Timeline / Playlist */}
<div className="flex flex-col gap-4">
  <VideoPlayer />
  <OffsetCalibrator />

  {/* Onglets : Timeline | Playlist */}
  <div className="flex gap-1 bg-slate-800 rounded-t-lg p-1">
    <TabButton active={tab === 'timeline'} onClick={() => setTab('timeline')}>
      ⏱ Timeline
    </TabButton>
    <TabButton active={tab === 'playlist'} onClick={() => setTab('playlist')}>
      🎬 Playlist ({filteredActions.length})
    </TabButton>
  </div>

  {tab === 'timeline' && <ActionTimeline match={match} selectedSet={selectedSet} />}
  {tab === 'playlist' && filteredActions.length > 0 && (
    <PlaylistPlayer items={filteredActions} isActive={isPlaylistMode} ... />
  )}
</div>

{/* Colonne droite : Filtres + Stats */}
<div className="flex flex-col gap-4">
  <AdvancedFilters match={match} resultCount={filteredActions.length} />
  <StatsTable stats={filteredStats} match={match} />
</div>

═══════════════════════════════════════════════
TESTS : packages/viewer/tests/filters.test.ts
═══════════════════════════════════════════════

Tests unitaires du moteur de filtrage :

1. "applyFilters sans critère retourne toutes les actions"
   - Charger le match via parseDVW
   - applyFilters(match, DEFAULT_CRITERIA).length > 500

2. "filtre par skill=attack retourne uniquement les attaques"
   - applyFilters(match, { ...DEFAULT_CRITERIA, skills: ['attack'] })
   - results.every(r => r.action.skill === 'attack')

3. "filtre par set réduit les résultats"
   - const all = applyFilters(match, DEFAULT_CRITERIA)
   - const set1 = applyFilters(match, { ...DEFAULT_CRITERIA, setNumbers: [1] })
   - set1.length < all.length

4. "filtre par joueur retourne ses actions uniquement"
   - applyFilters(match, { ...DEFAULT_CRITERIA, playerIds: ['away-7'] })
   - results.every(r => r.action.player.id === 'away-7')

5. "filtre combiné skill+quality"
   - applyFilters(match, { ...DEFAULT_CRITERIA, skills: ['attack'], qualities: ['#'] })
   - results.every(r => r.action.skill === 'attack' && r.action.quality === '#')

6. "filtre par zone de départ"
   - applyFilters(match, { ...DEFAULT_CRITERIA, startZones: [4] })
   - results.every(r => r.action.startZone === 4)

7. "buildPreset('kills-only') retourne les bons critères"
   - const preset = buildPreset('kills-only', match)
   - preset.skills → ['attack']
   - preset.qualities → ['#']

8. "buildPreset('all-attacks', match, 'away-7') filtre par joueur"
   - preset.playerIds → ['away-7']

9. "filtre par teamSide=home"
   - results.every(r => r.action.player.team === 'home')

10. "filtre hasVideoTimestamp=true filtre les actions sans timestamp"
    - results.every(r => r.action.videoTimestamp != null)

11. "filtre vide (arrays vides) ne filtre rien"
    - applyFilters avec tous les arrays à [] retourne tout

12. "formatMatchTime contient le set et le rally"
    - formatMatchTime(1, rally) contient "Set 1" et "Rally #"

Total : 12 tests

═══════════════════════════════════════════════

RÉSUMÉ DES FICHIERS :

| Fichier | Type | ~Lignes |
|---------|------|---------|
| packages/viewer/src/store/filterStore.ts | Store Zustand | ~80 |
| packages/viewer/src/utils/filterEngine.ts | Moteur filtrage | ~150 |
| packages/viewer/src/components/AdvancedFilters.tsx | Composant React | ~300 |
| packages/viewer/src/components/PlaylistPlayer.tsx | Composant React | ~200 |
| packages/viewer/src/pages/AnalysisPage.tsx | MODIFIÉ | +40 |
| packages/viewer/tests/filters.test.ts | Tests Vitest | ~140 |

Total : ~910 lignes, 12 tests

ATTENTION :
- Les filtres sont cumulatifs (AND) — chaque filtre réduit les résultats
- Les presets sont des raccourcis qui pré-remplissent les critères
- Le mode playlist auto-advance surveille le currentTime du videoStore
- Les preRoll/postRoll (marges avant/après clip) sont configurables (1-5 secondes)
- Le panneau de filtres est pliable pour ne pas surcharger l'écran
- Le compteur de résultats se met à jour en temps réel (useMemo sur match + criteria)
- Sur mobile, les filtres passent en pleine largeur (au-dessus des stats)
- Le filterStore n'est PAS persisté (reset à chaque chargement de match)

Exécute les tests et vérifie l'intégration avec le player vidéo.
```

---

## 🏟️ PROMPT 2D — Vue Rotation / Terrain 2D (DÉTAILLÉ)

```
Implémente la vue rotation avec le terrain de volley 2D montrant les positions.

CONTEXTE :
- Lis packages/viewer/src/components/CourtDiagram.tsx — le composant SVG terrain créé dans PROMPT 2F
  → Si ce composant n'existe pas encore, le créer ici (il sera réutilisé par 2F)
- Lis packages/viewer/src/store/videoStore.ts — currentTime, offset
- Lis @volleyvision/data-model — Rally.positions (PlayerRotation { P1..P6 }), Rally.rotation
- Chaque Rally a : rotation.home, rotation.away (numéro de rotation 1-6)
- Chaque Rally a : positions.home, positions.away (PlayerRotation avec numéros de joueurs)
- Le match a homeTeam.players et awayTeam.players (pour résoudre numéro → nom)
- Stack : React 18 + Zustand + Tailwind CSS + SVG

OBJECTIF : Voir en temps réel qui est en P1, P2... P6 sur le terrain, synchronisé avec la vidéo.
Quand la vidéo avance, les noms changent automatiquement quand la rotation change.

═══════════════════════════════════════════════
FICHIER 1 : packages/viewer/src/components/CourtDiagram.tsx
═══════════════════════════════════════════════

(Ce fichier est créé ici s'il n'existe pas encore — il sera enrichi par PROMPT 2F)

Composant SVG réutilisable : terrain de volley avec 6 zones.

Props :
interface CourtDiagramProps {
  // Données par zone
  zones?: ZoneData[];

  // Mode "rotation" : afficher les joueurs aux positions
  players?: CourtPlayer[];

  // Apparence
  width?: number;               // Largeur SVG (défaut: 360)
  height?: number;              // Hauteur SVG (défaut: 240)
  showNet?: boolean;            // Afficher le filet en haut (défaut: true)
  showZoneNumbers?: boolean;    // Afficher Z1..Z6 en fond (défaut: true)
  highlightedZone?: number;     // Zone surlignée
  orientation?: 'standard' | 'flipped';  // standard = filet en haut

  // Interactions
  onZoneClick?: (zone: number) => void;

  // Pour la distribution passeuse (2F)
  arrows?: ArrowData[];
  setterPosition?: number;

  className?: string;
}

interface CourtPlayer {
  position: number;             // 1-6 (position sur le terrain)
  number: number;               // Numéro de maillot
  name: string;                 // Nom affiché
  isLibero?: boolean;
  isSetter?: boolean;
  highlight?: 'active' | 'error' | 'kill' | null;
}

interface ZoneData {
  zone: number;
  label?: string;               // Texte principal (ex: "35%")
  sublabel?: string;            // Texte secondaire (ex: "12/34")
  color?: string;               // Couleur de fond
  opacity?: number;             // Opacité (0-1)
}

interface ArrowData {
  fromZone: number;
  toZone: number;
  thickness: number;            // Épaisseur de la flèche (1-8)
  color: string;
  label?: string;               // Texte sur la flèche
}

SVG STRUCTURE :

Le terrain est un rectangle 360×240 (ou responsive via viewBox) :

<svg viewBox="0 0 360 240" className={className}>
  {/* Fond du terrain */}
  <rect x="0" y="0" width="360" height="240" fill="#1e293b" rx="8" />

  {/* Filet (ligne horizontale en haut du terrain) */}
  {showNet && (
    <line x1="10" y1="5" x2="350" y2="5" stroke="#94a3b8" strokeWidth="3" strokeDasharray="8 4" />
  )}

  {/* 6 zones */}
  {/* Zone 4 (avant gauche) */}
  <rect x="10" y="10" width="113" height="110" fill="..." rx="4" />
  {/* Zone 3 (avant centre) */}
  <rect x="123" y="10" width="114" height="110" fill="..." rx="4" />
  {/* Zone 2 (avant droite) */}
  <rect x="237" y="10" width="113" height="110" fill="..." rx="4" />
  {/* Zone 5 (arrière gauche) */}
  <rect x="10" y="125" width="113" height="110" fill="..." rx="4" />
  {/* Zone 6 (arrière centre) */}
  <rect x="123" y="125" width="114" height="110" fill="..." rx="4" />
  {/* Zone 1 (arrière droite) */}
  <rect x="237" y="125" width="113" height="110" fill="..." rx="4" />

  {/* Numéros de zone en fond (gros, semi-transparent) */}
  {showZoneNumbers && ZONE_POSITIONS.map(({ zone, cx, cy }) => (
    <text key={zone} x={cx} y={cy} fontSize="28" fill="#334155" textAnchor="middle" dominantBaseline="central">
      {zone}
    </text>
  ))}

  {/* Joueurs (mode rotation) */}
  {players?.map(player => {
    const pos = ZONE_POSITIONS.find(z => z.zone === player.position);
    return (
      <g key={player.number}>
        {/* Cercle joueur */}
        <circle cx={pos.cx} cy={pos.cy} r="22"
          fill={player.isLibero ? '#eab308' : player.isSetter ? '#8b5cf6' : '#3b82f6'}
          stroke={player.highlight === 'active' ? '#22c55e' : 'none'}
          strokeWidth="3"
        />
        {/* Numéro */}
        <text x={pos.cx} y={pos.cy - 3} fontSize="14" fill="white" textAnchor="middle" fontWeight="bold">
          #{player.number}
        </text>
        {/* Nom (tronqué) */}
        <text x={pos.cx} y={pos.cy + 12} fontSize="9" fill="#e2e8f0" textAnchor="middle">
          {truncateName(player.name, 10)}
        </text>
      </g>
    );
  })}

  {/* Flèches (mode distribution passeuse) */}
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
    </marker>
  </defs>
  {arrows?.map((arrow, i) => {
    const from = ZONE_POSITIONS.find(z => z.zone === arrow.fromZone);
    const to = ZONE_POSITIONS.find(z => z.zone === arrow.toZone);
    return (
      <line key={i}
        x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy}
        stroke={arrow.color} strokeWidth={arrow.thickness}
        markerEnd="url(#arrowhead)"
      />
    );
  })}
</svg>

CONSTANTES :

const ZONE_POSITIONS = [
  { zone: 4, cx: 66,  cy: 65 },   // Avant gauche
  { zone: 3, cx: 180, cy: 65 },   // Avant centre
  { zone: 2, cx: 294, cy: 65 },   // Avant droite
  { zone: 5, cx: 66,  cy: 180 },  // Arrière gauche
  { zone: 6, cx: 180, cy: 180 },  // Arrière centre
  { zone: 1, cx: 294, cy: 180 },  // Arrière droite
];

═══════════════════════════════════════════════
FICHIER 2 : packages/viewer/src/components/RotationView.tsx
═══════════════════════════════════════════════

Composant qui affiche les deux terrains (home + away) avec les joueurs en rotation.

Props :
interface RotationViewProps {
  match: Match;
  currentRally?: Rally | null;    // Rally courant (basé sur le videoTimestamp)
  selectedSet?: number | null;
  className?: string;
}

STRUCTURE JSX :

<div className="bg-slate-800 rounded-lg p-4">
  <h3 className="text-sm font-semibold text-slate-300 mb-3">
    Rotation actuelle
    {currentRally && (
      <span className="ml-2 text-xs text-slate-400">
        Set {currentRally.setNumber} — R{currentRally.rotation?.home} / R{currentRally.rotation?.away}
        — {currentRally.scoreAfter.home}-{currentRally.scoreAfter.away}
      </span>
    )}
  </h3>

  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Terrain Home */}
    <div className="space-y-2">
      <div className="text-xs font-semibold text-center text-primary-green">
        {match.homeTeam.name} (R{currentRally?.rotation?.home || '?'})
      </div>
      <CourtDiagram
        players={getHomePlayers(match, currentRally)}
        showNet={true}
        orientation="standard"
        width={320}
        height={220}
      />
    </div>

    {/* Terrain Away (miroir) */}
    <div className="space-y-2">
      <div className="text-xs font-semibold text-center text-red-400">
        {match.awayTeam.name} (R{currentRally?.rotation?.away || '?'})
      </div>
      <CourtDiagram
        players={getAwayPlayers(match, currentRally)}
        showNet={true}
        orientation="flipped"
        width={320}
        height={220}
      />
    </div>
  </div>

  {/* Sélecteur de rally (si pas de vidéo) */}
  {!hasVideo && (
    <div className="mt-3 flex items-center gap-2">
      <label className="text-xs text-slate-400">Rally :</label>
      <input
        type="range"
        min={0}
        max={totalRallies - 1}
        value={rallyIndex}
        onChange={e => setRallyIndex(+e.target.value)}
        className="flex-1 accent-primary-blue"
      />
      <span className="text-xs font-mono tabular-nums">{rallyIndex + 1} / {totalRallies}</span>
    </div>
  )}

  {/* Stats de la rotation courante */}
  {currentRally && (
    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
      <div className="bg-slate-900 rounded p-2">
        <div className="text-slate-400">Points en R{currentRally.rotation?.home}</div>
        <div className="text-lg font-bold text-primary-green">
          {countPointsInRotation(match, 'home', currentRally.rotation?.home, currentRally.setNumber)}
        </div>
      </div>
      <div className="bg-slate-900 rounded p-2">
        <div className="text-slate-400">Side-out %</div>
        <div className="text-lg font-bold text-primary-blue">
          {calculateSideOutRate(match, 'home', currentRally.rotation?.home, currentRally.setNumber)}%
        </div>
      </div>
      <div className="bg-slate-900 rounded p-2">
        <div className="text-slate-400">Break pts</div>
        <div className="text-lg font-bold text-yellow-400">
          {countBreakPoints(match, 'home', currentRally.rotation?.home, currentRally.setNumber)}
        </div>
      </div>
    </div>
  )}
</div>

═══════════════════════════════════════════════
FICHIER 3 : packages/viewer/src/utils/rotationHelpers.ts
═══════════════════════════════════════════════

Helpers pour la rotation et le mapping joueurs → positions.

export function getPlayersForRotation(
  match: Match,
  side: TeamSide,
  rally: Rally | null
): CourtPlayer[] {
  if (!rally?.positions) return [];

  const rotation = side === 'home' ? rally.positions.home : rally.positions.away;
  const team = side === 'home' ? match.homeTeam : match.awayTeam;

  return [1, 2, 3, 4, 5, 6].map(pos => {
    const playerNumber = rotation[`P${pos}` as keyof PlayerRotation];
    const playerInfo = team.players.find(p => p.number === playerNumber);
    return {
      position: pos,
      number: playerNumber,
      name: playerInfo ? `${playerInfo.lastName}` : `#${playerNumber}`,
      isLibero: playerInfo?.isLibero ?? false,
      isSetter: playerInfo?.position === 'SET',
    };
  });
}

export function findCurrentRally(
  match: Match,
  currentTime: number,
  offset: number
): Rally | null {
  for (const set of match.sets) {
    for (const rally of set.rallies) {
      if (!rally.videoTimestamp) continue;
      const start = rally.videoTimestamp + offset;
      const end = (rally.endVideoTimestamp || rally.videoTimestamp + 15) + offset;
      if (currentTime >= start && currentTime <= end) {
        return rally;
      }
    }
  }
  return null;
}

export function countPointsInRotation(
  match: Match,
  side: TeamSide,
  rotation: number | undefined,
  setNumber: number | undefined
): number {
  if (!rotation || !setNumber) return 0;
  const set = match.sets.find(s => s.number === setNumber);
  if (!set) return 0;
  return set.rallies.filter(r => {
    const rot = side === 'home' ? r.rotation?.home : r.rotation?.away;
    return rot === rotation && r.pointWinner === side;
  }).length;
}

export function calculateSideOutRate(
  match: Match,
  side: TeamSide,
  rotation: number | undefined,
  setNumber: number | undefined
): number {
  if (!rotation || !setNumber) return 0;
  const set = match.sets.find(s => s.number === setNumber);
  if (!set) return 0;

  // Side-out = point marqué quand l'adversaire sert
  const ralliesInRotation = set.rallies.filter(r => {
    const rot = side === 'home' ? r.rotation?.home : r.rotation?.away;
    return rot === rotation && r.servingTeam !== side;
  });

  if (ralliesInRotation.length === 0) return 0;
  const sideOuts = ralliesInRotation.filter(r => r.pointWinner === side).length;
  return Math.round((sideOuts / ralliesInRotation.length) * 100);
}

export function countBreakPoints(
  match: Match,
  side: TeamSide,
  rotation: number | undefined,
  setNumber: number | undefined
): number {
  if (!rotation || !setNumber) return 0;
  const set = match.sets.find(s => s.number === setNumber);
  if (!set) return 0;

  // Break point = point marqué quand on sert
  return set.rallies.filter(r => {
    const rot = side === 'home' ? r.rotation?.home : r.rotation?.away;
    return rot === rotation && r.servingTeam === side && r.pointWinner === side;
  }).length;
}

export function truncateName(name: string, maxLength: number): string {
  return name.length > maxLength ? name.slice(0, maxLength - 1) + '…' : name;
}

═══════════════════════════════════════════════
FICHIER 4 : Mise à jour AnalysisPage.tsx
═══════════════════════════════════════════════

Ajouter un système d'onglets pour les vues de la colonne droite :

{/* Onglets colonne droite */}
<div className="flex gap-1 bg-slate-800 rounded-t-lg p-1">
  <TabButton active={rightTab === 'stats'} onClick={() => setRightTab('stats')}>
    📊 Stats
  </TabButton>
  <TabButton active={rightTab === 'rotation'} onClick={() => setRightTab('rotation')}>
    🏟️ Rotation
  </TabButton>
  <TabButton active={rightTab === 'playbyplay'} onClick={() => setRightTab('playbyplay')}>
    📈 Play-by-Play
  </TabButton>
  <TabButton active={rightTab === 'distribution'} onClick={() => setRightTab('distribution')}>
    🏐 Passeuse
  </TabButton>
</div>

{rightTab === 'stats' && <StatsTable ... />}
{rightTab === 'rotation' && <RotationView match={match} currentRally={currentRally} />}
{rightTab === 'playbyplay' && <PlayByPlayChart ... />}
{rightTab === 'distribution' && <SetterDistribution ... />}

La RotationView se synchronise automatiquement avec la vidéo via :
const currentRally = useMemo(
  () => findCurrentRally(match, videoStore.currentTime, videoStore.offset),
  [match, videoStore.currentTime, videoStore.offset]
);

═══════════════════════════════════════════════
TESTS : packages/viewer/tests/rotation.test.ts
═══════════════════════════════════════════════

1. "getPlayersForRotation retourne 6 joueurs"
   - Charger le match, prendre le premier rally
   - getPlayersForRotation(match, 'home', rally).length === 6

2. "chaque joueur a un numéro > 0"
   - players.every(p => p.number > 0)

3. "le libéro est marqué isLibero=true"
   - Trouver le joueur libéro connu (#30 Vial Lycia home)
   - players.some(p => p.number === 30 && p.isLibero)

4. "findCurrentRally retourne le bon rally pour un timestamp"
   - Prendre le rally 10 du set 1, noter son videoTimestamp
   - findCurrentRally(match, rally.videoTimestamp + offset + 5, offset) === rally

5. "findCurrentRally retourne null pour un timestamp hors match"
   - findCurrentRally(match, 999999, 0) === null

6. "countPointsInRotation retourne > 0 pour une rotation jouée"
   - Prendre la rotation du premier rally
   - countPointsInRotation(match, 'home', rotation, 1) > 0

7. "calculateSideOutRate est entre 0 et 100"
   - const rate = calculateSideOutRate(match, 'home', 1, 1)
   - rate >= 0 && rate <= 100

8. "countBreakPoints >= 0"
   - countBreakPoints(match, 'home', 1, 1) >= 0

9. "truncateName tronque les noms longs"
   - truncateName('BOULOURIS', 5) === 'BOUL…'
   - truncateName('Prou', 10) === 'Prou'

10. "getPlayersForRotation retourne [] si rally n'a pas de positions"
    - getPlayersForRotation(match, 'home', null) === []

Total : 10 tests

═══════════════════════════════════════════════

RÉSUMÉ DES FICHIERS :

| Fichier | Type | ~Lignes |
|---------|------|---------|
| packages/viewer/src/components/CourtDiagram.tsx | Composant SVG | ~200 |
| packages/viewer/src/components/RotationView.tsx | Composant React | ~180 |
| packages/viewer/src/utils/rotationHelpers.ts | Helpers | ~130 |
| packages/viewer/src/pages/AnalysisPage.tsx | MODIFIÉ | +30 |
| packages/viewer/tests/rotation.test.ts | Tests Vitest | ~100 |

Total : ~640 lignes, 10 tests

ATTENTION :
- Le CourtDiagram utilise un viewBox SVG pour être responsive (pas de tailles fixes en px)
- Le terrain away est "flipped" (orientation miroir) pour montrer les deux équipes face-à-face
- Les couleurs des cercles joueurs : bleu (normal), jaune (libéro), violet (passeuse)
- Le highlight "active" met un ring vert autour du joueur qui vient de jouer l'action
- Si la vidéo n'est pas chargée, un slider permet de naviguer manuellement entre les rallies
- Les stats rotation (side-out %, break points) sont calculées en temps réel par rally/set
- Le composant réutilise findCurrentRally qui est partagé avec la timeline
- Sur mobile, les deux terrains s'empilent verticalement
- Le CourtDiagram est réutilisé par PROMPT 2F (distribution passeuse) — ne pas dupliquer

Exécute les tests et vérifie l'affichage synchronisé avec le player vidéo.
```

---

## 🎬 PROMPT 2G — Export Montage Vidéo (DÉTAILLÉ)

```
Implémente l'export de montages vidéo à partir d'une playlist filtrée.

CONTEXTE :
- Lis packages/viewer/src/components/PlaylistPlayer.tsx — le composant playlist (PROMPT 2C)
- Lis packages/viewer/src/store/filterStore.ts — les filtres (PROMPT 2C)
- Lis packages/viewer/src/utils/filterEngine.ts — FilteredAction[] résultat des filtres
- Le VideoPlayer affiche une vidéo YouTube via IFrame API
- YouTube IFrame API ne permet PAS d'accéder au flux vidéo brut (limitation DRM/CORS)
- Stack : React 18 + Zustand + Tailwind CSS

LIMITATION IMPORTANTE :
YouTube ne permet pas d'extraire les frames ni d'enregistrer la vidéo côté client.
On propose donc DEUX approches alternatives :

APPROCHE 1 (principale) — Export playlist partageable :
- Générer un lien/fichier contenant les timestamps de la playlist
- Format : fichier JSON ou URL avec les clips encodés
- Le destinataire ouvre le lien → VolleyVision charge la playlist et la joue

APPROCHE 2 (avancée, optionnelle) — Screen capture :
- Utiliser navigator.mediaDevices.getDisplayMedia() pour capturer l'onglet
- Enregistrer via MediaRecorder pendant que la playlist défile
- Exporter en WebM/MP4
- ATTENTION : nécessite que l'utilisateur autorise le partage d'écran

═══════════════════════════════════════════════
FICHIER 1 : packages/viewer/src/utils/exportPlaylist.ts
═══════════════════════════════════════════════

Fonctions d'export de playlist en différents formats.

export interface ExportedClip {
  videoId: string;
  startTime: number;            // YouTube time en secondes
  endTime: number;              // YouTube time en secondes
  label: string;                // Description du clip
  skill: Skill;
  quality: QualityPro;
  playerNumber: number;
  playerName: string;
  setNumber: number;
  score: string;                // "15-12"
}

export interface PlaylistExport {
  version: '1.0';
  title: string;                // "Attaques de Julia — BOULOURIS vs SABLE"
  matchId: string;
  matchDate: string;
  videoId: string;
  clips: ExportedClip[];
  createdAt: string;
  exportedBy: string;           // "VolleyVision"
}

export function buildPlaylistExport(
  match: Match,
  items: FilteredAction[],
  videoId: string,
  offset: number,
  preRoll: number,
  postRoll: number,
  title?: string
): PlaylistExport {
  const clips: ExportedClip[] = items
    .filter(item => item.action.videoTimestamp != null)
    .map(item => {
      const startTime = Math.max(0, item.action.videoTimestamp! + offset - preRoll);
      const endTime = item.action.videoTimestamp! + offset + postRoll;
      const player = findPlayer(match, item.action.player.id);
      return {
        videoId,
        startTime,
        endTime,
        label: `${getSkillLabel(item.action.skill)} ${item.action.quality} — #${item.action.player.number}`,
        skill: item.action.skill,
        quality: item.action.quality as QualityPro,
        playerNumber: item.action.player.number,
        playerName: player ? `${player.firstName} ${player.lastName}` : `#${item.action.player.number}`,
        setNumber: item.setNumber,
        score: `${item.rally.scoreAfter.home}-${item.rally.scoreAfter.away}`,
      };
    });

  return {
    version: '1.0',
    title: title || generateTitle(match, items),
    matchId: match.id,
    matchDate: match.date,
    videoId,
    clips,
    createdAt: new Date().toISOString(),
    exportedBy: 'VolleyVision',
  };
}

export function exportAsJSON(playlist: PlaylistExport): void {
  const json = JSON.stringify(playlist, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `${sanitizeFilename(playlist.title)}.volleyvision.json`);
}

export function exportAsCSV(playlist: PlaylistExport): void {
  const header = 'Clip,Start,End,Skill,Quality,Player,Set,Score,YouTube URL\n';
  const rows = playlist.clips.map((clip, i) =>
    `${i + 1},${formatTime(clip.startTime)},${formatTime(clip.endTime)},${clip.skill},${clip.quality},#${clip.playerNumber} ${clip.playerName},Set ${clip.setNumber},${clip.score},https://youtu.be/${clip.videoId}?t=${Math.floor(clip.startTime)}`
  ).join('\n');
  const csv = header + rows;
  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `${sanitizeFilename(playlist.title)}.csv`);
}

export function exportAsShareURL(playlist: PlaylistExport): string {
  // Encoder la playlist compressée dans l'URL (base64)
  const compressed = btoa(JSON.stringify({
    v: playlist.videoId,
    c: playlist.clips.map(c => [c.startTime, c.endTime, c.label]),
  }));
  return `${window.location.origin}?playlist=${compressed}`;
}

export function generateYouTubeChapters(playlist: PlaylistExport): string {
  return playlist.clips
    .map((clip, i) => `${formatTime(clip.startTime)} — Clip ${i + 1}: ${clip.label}`)
    .join('\n');
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9àâéèêëîïôùûüçÀÂÉÈÊËÎÏÔÙÛÜÇ _-]/g, '').replace(/\s+/g, '_');
}

function generateTitle(match: Match, items: FilteredAction[]): string {
  const skills = [...new Set(items.map(i => i.action.skill))];
  const players = [...new Set(items.map(i => i.action.player.number))];
  const skillText = skills.length === 1 ? getSkillLabel(skills[0]) : 'Actions';
  const playerText = players.length === 1 ? `#${players[0]}` : `${players.length} joueuses`;
  return `${skillText} ${playerText} — ${match.homeTeam.name} vs ${match.awayTeam.name}`;
}

═══════════════════════════════════════════════
FICHIER 2 : packages/viewer/src/components/ExportDialog.tsx
═══════════════════════════════════════════════

Modal de dialogue pour configurer et lancer l'export.

Props :
interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: PlaylistExport;
}

STRUCTURE JSX :

{isOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
    <div className="bg-slate-800 rounded-xl w-full max-w-lg mx-4 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <h2 className="text-lg font-semibold">🎬 Exporter le montage</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>

      {/* Corps */}
      <div className="px-6 py-4 space-y-4">
        {/* Titre éditable */}
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Titre du montage</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-slate-700 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Résumé */}
        <div className="bg-slate-900 rounded p-3 text-sm">
          <p className="text-slate-300">{playlist.clips.length} clips • Durée totale ≈ {totalDuration}</p>
          <p className="text-slate-400 text-xs mt-1">{playlist.matchDate} — {playlist.matchId}</p>
        </div>

        {/* Formats d'export */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300">Format d'export</h3>

          <ExportOption
            icon="📋"
            title="Playlist JSON"
            description="Fichier réimportable dans VolleyVision"
            onClick={() => exportAsJSON(playlist)}
          />

          <ExportOption
            icon="📊"
            title="Tableau CSV"
            description="Ouvrir dans Excel — clips avec timestamps et URLs"
            onClick={() => exportAsCSV(playlist)}
          />

          <ExportOption
            icon="🔗"
            title="Lien partageable"
            description="URL à partager — ouvre directement la playlist"
            onClick={() => {
              const url = exportAsShareURL(playlist);
              navigator.clipboard.writeText(url);
              setShareCopied(true);
            }}
          />

          <ExportOption
            icon="📝"
            title="Chapitres YouTube"
            description="Liste de timestamps à coller dans la description YouTube"
            onClick={() => {
              const chapters = generateYouTubeChapters(playlist);
              navigator.clipboard.writeText(chapters);
              setChaptersCopied(true);
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-slate-700 flex justify-end">
        <button onClick={onClose} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm">
          Fermer
        </button>
      </div>
    </div>
  </div>
)}

═══════════════════════════════════════════════
FICHIER 3 : Mise à jour de PlaylistPlayer.tsx
═══════════════════════════════════════════════

Ajouter un bouton "Exporter" dans le header du PlaylistPlayer :

<button
  onClick={() => setShowExportDialog(true)}
  className="px-3 py-1 bg-primary-blue hover:bg-blue-600 rounded text-xs font-medium"
  disabled={items.length === 0}
>
  🎬 Exporter ({items.length})
</button>

{showExportDialog && (
  <ExportDialog
    isOpen={showExportDialog}
    onClose={() => setShowExportDialog(false)}
    playlist={buildPlaylistExport(match, items, videoId, offset, preRoll, postRoll)}
  />
)}

═══════════════════════════════════════════════
FICHIER 4 : packages/viewer/src/utils/playlistImporter.ts
═══════════════════════════════════════════════

Fonction pour réimporter une playlist depuis un fichier JSON ou URL.

export function parsePlaylistFromJSON(json: string): PlaylistExport | null {
  try {
    const data = JSON.parse(json);
    if (data.version === '1.0' && Array.isArray(data.clips)) {
      return data as PlaylistExport;
    }
    return null;
  } catch {
    return null;
  }
}

export function parsePlaylistFromURL(url: string): { videoId: string; clips: [number, number, string][] } | null {
  try {
    const params = new URL(url).searchParams;
    const playlistParam = params.get('playlist');
    if (!playlistParam) return null;
    return JSON.parse(atob(playlistParam));
  } catch {
    return null;
  }
}

═══════════════════════════════════════════════
TESTS : packages/viewer/tests/export.test.ts
═══════════════════════════════════════════════

1. "buildPlaylistExport crée un export valide"
   - Charger le match, filtrer les attaques, builder l'export
   - export.version === '1.0'
   - export.clips.length > 0

2. "chaque clip a startTime < endTime"
   - clips.every(c => c.startTime < c.endTime)

3. "startTime inclut le preRoll"
   - Avec preRoll=3, le premier clip.startTime === action.videoTimestamp + offset - 3

4. "startTime est clampé à 0"
   - Si action.videoTimestamp + offset - preRoll < 0 → startTime === 0

5. "generateTitle produit un titre descriptif"
   - Filtrer par skill=attack, joueur #7
   - title contient "Attaque" et "#7"

6. "exportAsCSV produit un CSV valide"
   - Le CSV contient les headers
   - Chaque ligne a le bon nombre de colonnes (9)

7. "exportAsShareURL encode et parsePlaylistFromURL décode"
   - Encoder → URL avec ?playlist=...
   - parsePlaylistFromURL(url) retourne les bons clips

8. "parsePlaylistFromJSON valide un export correct"
   - parsePlaylistFromJSON(json) !== null

9. "parsePlaylistFromJSON rejette un JSON invalide"
   - parsePlaylistFromJSON('{}') === null
   - parsePlaylistFromJSON('invalid') === null

10. "generateYouTubeChapters formatte correctement"
    - Chaque ligne contient un timestamp "M:SS"
    - Contient "Clip 1:"

11. "sanitizeFilename nettoie les caractères spéciaux"
    - sanitizeFilename('BOULOURIS vs SABLE!!! #attaques') ne contient pas '!' ni '#'

12. "exportAsShareURL produit une URL valide"
    - URL commence par http
    - Contient '?playlist='

Total : 12 tests

═══════════════════════════════════════════════

RÉSUMÉ DES FICHIERS :

| Fichier | Type | ~Lignes |
|---------|------|---------|
| packages/viewer/src/utils/exportPlaylist.ts | Fonctions export | ~180 |
| packages/viewer/src/components/ExportDialog.tsx | Modal React | ~180 |
| packages/viewer/src/utils/playlistImporter.ts | Import playlist | ~40 |
| packages/viewer/src/components/PlaylistPlayer.tsx | MODIFIÉ | +15 |
| packages/viewer/tests/export.test.ts | Tests Vitest | ~130 |

Total : ~545 lignes, 12 tests

ATTENTION :
- YouTube interdit la capture directe du flux vidéo → pas de ffmpeg.wasm ni Canvas recording
- Les exports JSON et CSV fonctionnent SANS vidéo (juste les métadonnées + timestamps)
- Le lien partageable encode les clips en base64 dans l'URL (limité ~2000 chars)
- Pour les grosses playlists, l'URL sera trop longue → fallback sur JSON
- Le format .volleyvision.json est le format d'échange natif du projet
- L'import de playlist pourra être ajouté dans ImportPage plus tard
- Les chapitres YouTube sont utiles si le coach veut les coller dans la description d'une vidéo
- Les fonctions pures (buildPlaylistExport, sanitizeFilename...) sont faciles à tester

Exécute les tests et vérifie que l'export fonctionne depuis le PlaylistPlayer.
```

---

## 👤 PROMPT 2H — Vue Joueur / Player App (DÉTAILLÉ)

```
Implémente la vue joueur : page personnalisée par joueuse avec stats, highlights et partage.

CONTEXTE :
- Lis packages/viewer/src/store/matchStore.ts — match, stats (PlayerMatchStats[])
- Lis packages/viewer/src/store/videoStore.ts — videoId, offset
- Lis packages/viewer/src/utils/filterEngine.ts — applyFilters, FilteredAction[]
- Lis packages/viewer/src/components/PlaylistPlayer.tsx — playlist vidéo existante
- Lis packages/viewer/src/components/CourtDiagram.tsx — terrain SVG existant
- Les PlayerMatchStats contiennent bySkill, bySet, overall, attackByCombo
- Stack : React 18 + Zustand + Tailwind CSS + Recharts (déjà installé pour 2E)

OBJECTIF : La joueuse (ou son parent) reçoit un lien → elle voit SA page avec :
- Ses stats du match (réception, attaque, service...)
- Ses highlights vidéo (playlist de ses meilleures actions)
- Un résumé visuel exportable en image (story Instagram / partage)

═══════════════════════════════════════════════
FICHIER 1 : packages/viewer/src/pages/PlayerPage.tsx
═══════════════════════════════════════════════

Page dédiée à un joueur spécifique.

Props (ou via route/state) :
interface PlayerPageProps {
  playerId: string;             // "away-7" par exemple
}

STRUCTURE JSX :

<div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950">
  <div className="container mx-auto px-4 py-6 max-w-2xl">

    {/* Header joueur — design "carte" */}
    <div className="bg-slate-800 rounded-xl p-6 text-center mb-6 relative overflow-hidden">
      {/* Fond décoratif */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-blue/10 to-primary-green/10" />

      <div className="relative z-10">
        {/* Numéro en gros */}
        <div className="text-6xl font-black text-primary-blue/30 mb-1">#{player.number}</div>
        {/* Nom */}
        <h1 className="text-2xl font-bold">{player.firstName} {player.lastName}</h1>
        {/* Position + équipe */}
        <p className="text-sm text-slate-400 mt-1">
          {getPositionLabel(player.position)} — {teamName}
        </p>
        {/* Match context */}
        <p className="text-xs text-slate-500 mt-2">
          {match.homeTeam.name} {match.result.homeWins}-{match.result.awayWins} {match.awayTeam.name}
          <br />{formatDate(match.date)} • {match.competition}
        </p>
      </div>
    </div>

    {/* Score résumé — 3 métriques clés */}
    <div className="grid grid-cols-3 gap-3 mb-6">
      <MetricCard
        label="Actions"
        value={playerStats.overall.totalActions}
        icon="🏐"
      />
      <MetricCard
        label="Efficacité"
        value={`${Math.round(playerStats.overall.efficiency * 100)}%`}
        color={getEfficiencyColor(playerStats.overall.efficiency)}
        icon="📊"
      />
      <MetricCard
        label="Kills"
        value={playerStats.overall.kills}
        color="text-primary-green"
        icon="💥"
      />
    </div>

    {/* Stats par skill — cartes horizontales */}
    <div className="space-y-3 mb-6">
      <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Stats par skill</h2>

      {DISPLAY_SKILLS.map(skill => {
        const dist = playerStats.bySkill[skill];
        if (!dist || dist.total === 0) return null;
        return (
          <SkillCard
            key={skill}
            skill={skill}
            distribution={dist}
            onClick={() => setHighlightSkill(skill)}
          />
        );
      })}
    </div>

    {/* Radar chart — profil du joueur */}
    <div className="bg-slate-800 rounded-xl p-4 mb-6">
      <h2 className="text-sm font-semibold text-slate-400 mb-3">Profil de performance</h2>
      <PlayerRadarChart stats={playerStats} />
    </div>

    {/* Stats par set — mini tableau */}
    <div className="bg-slate-800 rounded-xl p-4 mb-6">
      <h2 className="text-sm font-semibold text-slate-400 mb-3">Performance par set</h2>
      <BySetTable stats={playerStats} sets={match.sets} />
    </div>

    {/* Highlights vidéo */}
    {videoId && (
      <div className="bg-slate-800 rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-400 mb-3">
          🎬 Highlights ({playerActions.length} actions)
        </h2>
        <div className="space-y-1 max-h-[300px] overflow-y-auto">
          {playerActions.map((item, i) => (
            <HighlightRow
              key={item.action.id}
              index={i}
              item={item}
              onClick={() => playHighlight(item)}
            />
          ))}
        </div>
      </div>
    )}

    {/* Bouton partage / export image */}
    <div className="flex gap-3 mb-6">
      <button
        onClick={handleShareImage}
        className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-semibold text-sm"
      >
        📸 Exporter en image (Story)
      </button>
      <button
        onClick={handleShareLink}
        className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold text-sm"
      >
        🔗 Copier le lien
      </button>
    </div>

    {/* Footer VolleyVision */}
    <div className="text-center text-xs text-slate-600 py-4">
      <span className="text-primary-green">Volley</span><span className="text-primary-blue">Vision</span>
      — Analyse de performance volleyball
    </div>
  </div>
</div>

═══════════════════════════════════════════════
FICHIER 2 : packages/viewer/src/components/player/SkillCard.tsx
═══════════════════════════════════════════════

Carte horizontale pour une stat skill.

interface SkillCardProps {
  skill: Skill;
  distribution: QualityDistribution;
  onClick?: () => void;
}

<button onClick={onClick}
  className="w-full bg-slate-900 rounded-lg p-3 flex items-center gap-3 hover:bg-slate-700/50 transition">
  {/* Icône skill */}
  <div className="text-2xl w-10 text-center">{getSkillIcon(skill)}</div>

  {/* Infos */}
  <div className="flex-1">
    <div className="flex justify-between items-baseline">
      <span className="font-semibold text-sm">{getSkillLabel(skill)}</span>
      <span className="text-xs text-slate-400">{distribution.total} actions</span>
    </div>

    {/* Barre de qualité empilée (stacked bar) */}
    <div className="flex h-2 rounded-full overflow-hidden mt-1.5 bg-slate-700">
      {(['#', '+', '!', '-', '/', '='] as const).map(q => {
        const pct = (distribution[q] / distribution.total) * 100;
        if (pct === 0) return null;
        return (
          <div
            key={q}
            className={getQualityBgClass(q)}
            style={{ width: `${pct}%` }}
            title={`${q}: ${distribution[q]} (${Math.round(pct)}%)`}
          />
        );
      })}
    </div>

    {/* Légende compacte */}
    <div className="flex gap-2 mt-1 text-xs text-slate-400">
      <span className="text-quality-kill">{distribution['#']}#</span>
      <span className="text-quality-positive">{distribution['+']}+</span>
      <span className="text-quality-error">{distribution['=']}=</span>
    </div>
  </div>

  {/* Efficacité en % */}
  <div className={`text-xl font-bold ${getEfficiencyColor((distribution['#'] - distribution['=']) / distribution.total)}`}>
    {Math.round(((distribution['#'] - distribution['=']) / distribution.total) * 100)}%
  </div>
</button>

═══════════════════════════════════════════════
FICHIER 3 : packages/viewer/src/components/player/PlayerRadarChart.tsx
═══════════════════════════════════════════════

Radar chart Recharts montrant le profil multi-skill du joueur.

import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';

interface PlayerRadarChartProps {
  stats: PlayerMatchStats;
}

DONNÉES :
- Pour chaque skill avec des actions > 0 :
  - score = efficacité normalisée 0-100
  - serve: ace% (kills/total * 100)
  - receive: positive% ((# + +) / total * 100)
  - attack: kill% (kills/total * 100)
  - block: kill% (kills/total * 100)
  - dig: positive% ((# + +) / total * 100)

<ResponsiveContainer width="100%" height={250}>
  <RadarChart data={radarData}>
    <PolarGrid stroke="#334155" />
    <PolarAngleAxis dataKey="skill" tick={{ fill: '#94a3b8', fontSize: 12 }} />
    <Radar
      dataKey="score"
      stroke="#3b82f6"
      fill="#3b82f6"
      fillOpacity={0.3}
      strokeWidth={2}
    />
  </RadarChart>
</ResponsiveContainer>

═══════════════════════════════════════════════
FICHIER 4 : packages/viewer/src/components/player/BySetTable.tsx
═══════════════════════════════════════════════

Petit tableau performance par set.

<table className="w-full text-sm">
  <thead>
    <tr className="text-xs text-slate-400">
      <th className="text-left py-1">Set</th>
      <th className="text-center">Actions</th>
      <th className="text-center">Kills</th>
      <th className="text-center">Errors</th>
      <th className="text-center">Eff %</th>
    </tr>
  </thead>
  <tbody>
    {Object.entries(stats.bySet).map(([setNum, setStats]) => (
      <tr key={setNum} className="border-t border-slate-700">
        <td className="py-1.5 font-medium">Set {setNum}</td>
        <td className="text-center">{setStats.totalActions}</td>
        <td className="text-center text-primary-green">{setStats.kills}</td>
        <td className="text-center text-red-400">{setStats.errors}</td>
        <td className={`text-center font-bold ${getEfficiencyColor(setStats.efficiency)}`}>
          {Math.round(setStats.efficiency * 100)}%
        </td>
      </tr>
    ))}
  </tbody>
</table>

═══════════════════════════════════════════════
FICHIER 5 : packages/viewer/src/components/player/MetricCard.tsx
═══════════════════════════════════════════════

Petite carte métrique (3 en ligne).

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}

<div className="bg-slate-800 rounded-xl p-4 text-center">
  <div className="text-2xl mb-1">{icon}</div>
  <div className={`text-2xl font-bold ${color || 'text-white'}`}>{value}</div>
  <div className="text-xs text-slate-400 mt-1">{label}</div>
</div>

═══════════════════════════════════════════════
FICHIER 6 : packages/viewer/src/utils/shareHelpers.ts
═══════════════════════════════════════════════

Fonctions de partage et d'export image.

export async function captureElementAsImage(
  elementId: string,
  filename: string
): Promise<void> {
  // Utiliser html2canvas (à installer)
  const { default: html2canvas } = await import('html2canvas');
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    backgroundColor: '#0f172a',    // slate-900
    scale: 2,                      // Retina quality
    useCORS: true,
  });

  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export function generatePlayerShareURL(matchId: string, playerId: string): string {
  return `${window.location.origin}?match=${matchId}&player=${playerId}`;
}

export function getPositionLabel(position?: string): string {
  const labels: Record<string, string> = {
    OH: 'Attaquante réceptrice',
    OPP: 'Opposée',
    MB: 'Centrale',
    SET: 'Passeuse',
    LIB: 'Libéro',
    unknown: 'Joueuse',
  };
  return labels[position ?? 'unknown'] || 'Joueuse';
}

export function getEfficiencyColor(eff: number): string {
  if (eff >= 0.4) return 'text-primary-green';
  if (eff >= 0.2) return 'text-yellow-400';
  if (eff >= 0) return 'text-orange-400';
  return 'text-red-400';
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

═══════════════════════════════════════════════
FICHIER 7 : Mise à jour de AnalysisPage.tsx
═══════════════════════════════════════════════

Ajouter l'accès à la vue joueur depuis le StatsTable :

- Dans StatsTable, chaque ligne joueur a un bouton "👤" qui ouvre la PlayerPage
- Clic → set un state playerView = playerId
- Si playerView !== null → afficher <PlayerPage playerId={playerView} /> à la place de AnalysisPage
- Bouton retour "← Retour à l'analyse" en haut de PlayerPage

Alternative : afficher en slide-over panel à droite (drawer)

═══════════════════════════════════════════════
FICHIER 8 : Mise à jour de App.tsx
═══════════════════════════════════════════════

Gérer le routing simplifié (sans react-router) :

- Si URL contient ?player=away-7 → afficher PlayerPage directement
- Si URL contient ?playlist=... → charger la playlist importée
- Sinon → routing normal (import / analysis)

const urlParams = new URLSearchParams(window.location.search);
const playerParam = urlParams.get('player');
const playlistParam = urlParams.get('playlist');

if (match && playerParam) return <PlayerPage playerId={playerParam} />;
if (match) return <AnalysisPage />;
return <ImportPage />;

═══════════════════════════════════════════════
DÉPENDANCE À INSTALLER :
   pnpm --filter @volleyvision/viewer add html2canvas

═══════════════════════════════════════════════
TESTS : packages/viewer/tests/player-page.test.ts
═══════════════════════════════════════════════

1. "getPositionLabel retourne le bon label"
   - getPositionLabel('OH') === 'Attaquante réceptrice'
   - getPositionLabel('SET') === 'Passeuse'
   - getPositionLabel(undefined) === 'Joueuse'

2. "getEfficiencyColor retourne vert pour > 40%"
   - getEfficiencyColor(0.5) contient 'green'
   - getEfficiencyColor(0.3) contient 'yellow'
   - getEfficiencyColor(-0.1) contient 'red'

3. "formatDate formatte en français"
   - formatDate('2026-01-27') contient '27' et 'janvier' et '2026'

4. "generatePlayerShareURL produit une URL valide"
   - URL contient 'player='
   - URL contient le matchId

5. "les stats du joueur away-7 sont trouvées"
   - Charger match, calculer stats
   - stats.find(s => s.playerId === 'away-7') !== undefined

6. "le joueur a des attaques"
   - playerStats.bySkill.attack.total > 0

7. "le radar chart data a les bonnes catégories"
   - buildRadarData(stats).some(d => d.skill === 'Attaque')

8. "le bySet contient les 3 sets"
   - Object.keys(playerStats.bySet).length === 3

9. "efficacité est entre -1 et 1"
   - playerStats.overall.efficiency >= -1 && <= 1

10. "sanitizeFilename pour l'export image"
    - Ne contient pas de caractères spéciaux interdits

Total : 10 tests

═══════════════════════════════════════════════

RÉSUMÉ DES FICHIERS :

| Fichier | Type | ~Lignes |
|---------|------|---------|
| packages/viewer/src/pages/PlayerPage.tsx | Page React | ~250 |
| packages/viewer/src/components/player/SkillCard.tsx | Composant | ~70 |
| packages/viewer/src/components/player/PlayerRadarChart.tsx | Composant Recharts | ~60 |
| packages/viewer/src/components/player/BySetTable.tsx | Composant | ~50 |
| packages/viewer/src/components/player/MetricCard.tsx | Composant | ~20 |
| packages/viewer/src/utils/shareHelpers.ts | Utils partage | ~60 |
| packages/viewer/src/pages/AnalysisPage.tsx | MODIFIÉ | +10 |
| packages/viewer/src/App.tsx | MODIFIÉ | +10 |
| packages/viewer/tests/player-page.test.ts | Tests Vitest | ~100 |

Total : ~630 lignes, 10 tests

ATTENTION :
- La PlayerPage est mobile-first (max-w-2xl, design vertical type app mobile)
- html2canvas est chargé dynamiquement (import()) pour ne pas alourdir le bundle initial
- L'export image capture le conteneur #player-card avec le fond sombre
- La story Instagram est au format 9:16 → ajouter un wrapper avec les bonnes proportions
- Le radar chart utilise Recharts déjà installé pour le Play-by-Play (2E)
- Les couleurs d'efficacité sont cohérentes partout : vert > 40%, jaune 20-40%, orange 0-20%, rouge < 0%
- Le lien joueur fonctionne sans auth (mode "lecture seule" du match en mémoire)
- Pour une vraie app joueur avec persistance, il faudra la Phase 3 (Firebase Auth)
- Le dossier player/ dans components/ regroupe les composants spécifiques à cette vue

Exécute les tests et vérifie que la PlayerPage s'affiche correctement pour un joueur du match.
```

---

## 🔮 Idées Supplémentaires (inspirées DataVolley × PerfBook × VolleyStation)

> Ces idées enrichissent la roadmap existante. Elles seront détaillées en prompts au moment de l'implémentation.

### Comparaison concurrentielle — Positionnement VolleyVision

| Feature | DataVolley 4 (799€/an) | PerfBook (gratuit) | VS Next (40$/match) | **VolleyVision** |
|---|---|---|---|---|
| Scouting live clavier | ✅ Standard mondial | ❌ | ❌ (IA auto) | ⬜ Import DVW |
| Analyse vidéo sync | ✅ Montage + export | ❌ | ✅ IA auto | ✅ Phase 2A |
| Recherche multi-critères vidéo | ✅ Libre/stats/rotation | ❌ | ✅ Auto | ⬜ Phase 2C |
| Montage vidéo export MP4 | ✅ Pro (texte + dessins) | ❌ | ✅ Highlights auto | ⬜ PROMPT 2G |
| Web Client panchina (live) | ✅ | ❌ | ❌ | ⬜ Phase future |
| Player App (vue joueur) | ✅ iOS/Android | ❌ | ✅ Share social | ⬜ PROMPT 2H |
| Stats publiques recherche | ❌ (fichiers fermés) | ✅ Club/joueur France | ❌ | ⬜ Phase 4C |
| Multi-match longitudinal | ✅ Worksheets custom | ✅ Historique | ❌ | ⬜ Phase 5D |
| Computer Vision / IA | ❌ | ❌ | ✅ Reconnaissance auto | ⬜ Phase 6C |
| Distribution passeuse | ✅ (setter calls/rotation) | ❌ | ✅ | ✅ PROMPT 2F |
| Plugin SeTTEX (IA setter) | ✅ Prédiction adverse | ❌ | ❌ | ⬜ Phase 6B |
| Play-by-Play graphique | ✅ Courbe d'écart | ❌ | ❌ | ✅ PROMPT 2E |
| Contexte RPE / charge | ❌ | ❌ | ❌ | ✅ **Avantage unique** |
| Corrélation RPE × perf | ❌ | ❌ | ❌ | ✅ **Avantage unique** |
| Gratuit + web | ❌ (Windows only) | ✅ | ❌ | ✅ |
| Multi-source (DVW+parent+live) | ❌ | ❌ | ❌ | ✅ **Avantage unique** |

### Avantages concurrentiels uniques de VolleyVision :
1. **DVW + RPE + Contexte physio** — Personne ne combine stats match + charge entraînement + état physiologique
2. **Gratuit et 100% web** — DataVolley = 799€/an + Windows only. VS Next = 40$/match. VolleyVision = navigateur
3. **Multi-source** — DVW + saisie parent + live scoring → fusionnés dans un même modèle
4. **Corrélation performance/charge** — "Julia perd 20% d'efficacité quand RPE > 7"
5. **Accessible Pôle Espoir** — Pensé pour le niveau formation, pas pro. UX adaptée aux jeunes coachs

### Idées futures à explorer :

- **Live Client simplifié** : pendant le match, rafraîchir le DVW en cours d'écriture (polling fichier ou WebSocket) → stats live sur tablette adjoint
- **Computer Vision light** : utiliser Claude Vision sur captures vidéo pour détecter le score incrusté, les temps morts, les changements de set
- **Worksheets personnalisables** : builder de requêtes visuelles pour créer ses propres analyses (inspiré DataVolley Pro formulas)
- **Prédiction adverse (style SeTTEX)** : analyser les tendances de la passeuse adverse via Claude AI sur les données DVW historiques

---

## 📋 Roadmap complète mise à jour

| Phase | Prompt | Contenu | Statut | Tests | Priorité |
|-------|--------|---------|--------|-------|----------|
| **1** | 0 | Monorepo setup | ✅ Fait | — | — |
| **1** | 1A | Data model (types + Zod) | ✅ Fait | — | — |
| **1** | 1B | Section Splitter | ✅ Fait | — | — |
| **1** | 1C | Header + Teams + Sets parsers | ✅ Fait | — | — |
| **1** | 1D | Scout Line Parser | ✅ Fait | — | — |
| **1** | 1E | Rally Builder | ✅ Fait | — | — |
| **1** | 1F | Stats Calculator + parseDVW() | ✅ Fait | — | — |
| **1** | 1G | Viewer React (import + dashboard) | ✅ Fait | — | — |
| **2** | 2A | Video Player YouTube | ✅ Fait | 18 | — |
| **2** | 2B | Action Timeline | ✅ Fait | 10 | — |
| **2** | **2-LAYOUT** | **Dashboard Modulaire Drag & Resize** | 📋 Détaillé | 8 | ⭐⭐⭐⭐ Critique |
| **2** | **2C** | **Filtres avancés + Playlist** | 📋 Détaillé | 12 | ⭐⭐⭐ |
| **2** | **2E** | **Play-by-Play graphique** | 📋 Détaillé | 8 | ⭐⭐⭐ Quick win |
| **2** | **2F** | **Distribution Passeuse** | 📋 Détaillé | 10 | ⭐⭐⭐ Quick win |
| **2** | **2D** | **Vue Rotation (terrain 2D)** | 📋 Détaillé | 10 | ⭐⭐ |
| **2** | **2G** | **Export Montage Vidéo** | 📋 Détaillé | 12 | ⭐⭐ |
| **2** | **2H** | **Vue Joueur / Player App** | 📋 Détaillé | 10 | ⭐⭐ |
| **3** | 3A | Firebase Auth + Profil Coach | ⬜ Grandes lignes | — | ⭐⭐⭐ Fondation |
| **3** | 3B | Persistance matchs (Firestore) | ⬜ Grandes lignes | — | ⭐⭐⭐ |
| **3** | 3C | Dashboard coach (matchs sauvegardés) | ⬜ Grandes lignes | — | ⭐⭐ |
| **4** | 4A | Interface Parent Stat (saisie) | ⬜ Grandes lignes | — | ⭐⭐ |
| **4** | 4B | Intégration parent-stat modèle | ⬜ Grandes lignes | — | ⭐⭐ |
| **4** | 4C | Multi-match + Recherche FFVB | ⬜ Grandes lignes | — | ⭐⭐ |
| **4** | 4D | Export PDF rapport enrichi | ⬜ Grandes lignes | — | ⭐ |
| **5** | 5A | Firebase Bridge (Realtime DB) | ⬜ Grandes lignes | — | ⭐⭐ |
| **5** | 5B | Enrichissement RPE | ⬜ Grandes lignes | — | ⭐⭐ |
| **5** | 5C | Player Matching DVW↔RPE | ⬜ Grandes lignes | — | ⭐⭐ |
| **5** | 5D | Données longitudinales | ⬜ Grandes lignes | — | ⭐⭐ |
| **5** | 5E | Corrélation RPE × Performance | ⬜ Grandes lignes | — | ⭐⭐ |
| **6** | 6A | AI Query Engine (Claude) | ⬜ Grandes lignes | — | ⭐ |
| **6** | 6B | Prédiction adverse (style SeTTEX) | ⬜ Grandes lignes | — | ⭐ |
| **6** | 6C | Computer Vision light | ⬜ Grandes lignes | — | ⭐ |
| **6** | 6D | Live Client (DVW en temps réel) | ⬜ Grandes lignes | — | ⭐ |
| **6** | 6E | Monétisation (Stripe) | ⬜ Grandes lignes | — | ⭐ |

**Phase 2 : 8 prompts détaillés, 80 tests prévus**
**Recommandation d'ordre : 2-LAYOUT → 2C → 2E → 2F → 2D → 2G → 2H → 3A → 3B**

> 2B ✅ fait. **2-LAYOUT en priorité** (dashboard modulaire avant d'ajouter plus de panneaux),
> puis filtres (2C enrichit la playlist existante),
> puis visualisations data (2E, 2F, 2D = nouveaux panneaux plug-in dans le dashboard),
> puis export/partage (2G, 2H rajoutent de la valeur),
> puis fondation auth (3A, 3B) pour la persistance.

---

## Phase 3 — Auth + Persistance

### PROMPT 3A — Firebase Auth + Profil Coach (grandes lignes)
- Firebase Auth (Google + email/password)
- Profil coach : nom, club, équipes
- Route protégée : /dashboard nécessite auth
- Zustand authStore synchronisé avec onAuthStateChanged

### PROMPT 3B — Persistance matchs Firestore (grandes lignes)
- Collection users/{userId}/matches/{matchId}
- Sauvegarder : dvwContent, matchData, videoUrl, videoOffset, lastOpenedAt, tags
- Charger un match déjà ouvert → retrouver le lien vidéo + offset calé
- Gestion lien rompu : message pour charger une autre vidéo

### PROMPT 3C — Dashboard coach (grandes lignes)
- Liste des matchs sauvegardés avec recherche/tri
- Favoris, tags, dernière ouverture
- Aperçu rapide des stats clés par match

---

## Phase 4 — Parent Stat + Multi-match

### PROMPT 4A — Interface Parent Stat (saisie simplifiée)
- Page mobile-first
- Sélection joueur (liste des joueuses de l'équipe)
- Boutons par skill : Réception ✅❌, Attaque 🏐💥❌, Service 🎯❌
- Enregistrement timestamp vidéo automatique

### PROMPT 4B — Intégration parent-stat modèle
- Les données parent-stat stockées comme Action (source: 'parent')
- Fusionner dans le même Match si même match
- Affichage stats : combiner DVW + parent-stat

### PROMPT 4C — Multi-match + Recherche FFVB (grandes lignes)
- Sélection de 2+ matchs pour comparer les stats d'un joueur
- Filtres par position, par adversaire
- Recherche d'équipes/joueurs (style PerfBook pour la France)

### PROMPT 4D — Export PDF rapport enrichi
- Rapport de match enrichi
- Stats DVW + contexte RPE + recommandations
- Utiliser jsPDF + html2canvas

---

## Phase 5 — Firebase Bridge + RPE

### PROMPT 5A — Import depuis Realtime DB
- Se connecter à interface-match-en-live
- Importer les matchs avec points + timestamps
- Convertir en Match (source: 'firebase-live', dataCompleteness: 'points-only')

### PROMPT 5B — Enrichissement RPE
- Se connecter à rpe-volleyball-sable (Firestore)
- Pour chaque joueuse, récupérer : check-in du jour, cycle phase, RPE post-match
- Créer MatchPlayerContext

### PROMPT 5C — Player Matching DVW↔RPE
- Matcher DVW Player ↔ RPE Player par nom/prénom
- Interface de validation manuelle si ambiguïté
- Stocker le mapping pour réutilisation

### PROMPT 5D — Données longitudinales
- Stocker les matchs parsés dans Firestore VolleyVision
- Vue multi-matchs : évolution d'un joueur sur N matchs
- Graphiques Recharts : efficacité par match, tendances

### PROMPT 5E — Corrélation RPE × Performance
- Scatter plot : RPE pré-match vs efficacité
- Alertes : "Julia < 50% efficacité quand RPE < 6"

---

## Phase 6 — Intelligence + Vision long terme

### PROMPT 6A — AI Query Engine (Claude)
- Input texte en langage naturel
- Préparer un contexte structuré (stats pré-calculées)
- Envoyer à Claude API avec le contexte
- Afficher la réponse formatée

### PROMPT 6B — Prédiction adverse (style SeTTEX)
- Analyser les tendances de la passeuse adverse sur les matchs historiques
- Utiliser Claude pour suggérer les tactiques optimales
- "En R3 avec bonne réception, la passeuse adverse donne 60% en Z4 → prévoir le block"

### PROMPT 6C — Computer Vision light
- Claude Vision sur captures vidéo du match
- Détection automatique du score incrusté
- Suggestion de timestamps de set/timeout

### PROMPT 6D — Live Client (DVW en temps réel)
- Rafraîchir le DVW en cours d'écriture pendant le match
- Polling fichier ou WebSocket
- Stats live sur tablette adjoint en panchina

### PROMPT 6E — Monétisation (Stripe)
- Système de paiement pour fonctionnalités premium
- Tier gratuit : import DVW + stats basiques
- Tier premium : vidéo sync, multi-match, IA, export PDF

---

## Rappels pour Claude Code

1. **Toujours lire les fichiers de contexte** avant de coder : CLAUDE_v3.md, DVW-FORMAT-SPEC.md, ARCHITECTURE_FINALE.md
2. **Tester sur le fichier réel** : fixtures/boulouris-sable.dvw
3. **Pas de `any`** — TypeScript strict
4. **Parser robuste** : ne jamais crasher sur une ligne mal formée, logger et continuer
5. **Les tests sont obligatoires** avant de passer au prompt suivant
6. **Commits atomiques** : un commit par prompt
7. **Si un test échoue**, lire la ligne du fichier DVW qui pose problème et adapter le parser
