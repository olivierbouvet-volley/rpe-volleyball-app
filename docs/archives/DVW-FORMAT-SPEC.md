# Spécification du format DVW — Analyse du fichier réel

> Basé sur l'analyse du fichier `&2026-01-27 BOULOURIS - SABLE.dvw`
> Data Volley Professional Release 4.03.17, FFVB edition
> Format version 2.0 — 946 lignes, 3 sets, ~400 actions scout

---

## 1. Structure générale du fichier

Le fichier DVW est un fichier texte avec des sections délimitées par des headers entre crochets :

```
[3DATAVOLLEYSCOUT]   → Métadonnées format
[3MATCH]             → Informations du match
[3TEAMS]             → Noms des équipes + coachs
[3MORE]              → Infos compétition
[3COMMENTS]          → Commentaires libres
[3SET]               → Résultats par set (scores partiels)
[3PLAYERS-H]         → Joueurs équipe Home (14 champs par joueur)
[3PLAYERS-V]         → Joueurs équipe Visitor (14 champs par joueur)
[3ATTACKCOMBINATION] → Codes d'attaque (CA, CB, X1, V5, etc.)
[3SETTERCALL]        → Codes de distribution passeuse
[3WINNINGSYMBOLS]    → Symboles de résultat
[3RESERVE]           → Section réservée
[3VIDEO]             → Chemin(s) vidéo associé(s)
[3SCOUT]             → DONNÉES PRINCIPALES — les actions du match
```

---

## 2. Section [3DATAVOLLEYSCOUT]

```
[3DATAVOLLEYSCOUT]
FILEFORMAT: 2.0
GENERATOR-DAY: 27/01/2026 18.13.18
GENERATOR-IDP: DVW
GENERATOR-PRG: Data Volley
GENERATOR-REL: Release 4.03.17
GENERATOR-VER: Professional
GENERATOR-NAM: FEDERATION FRANCAISE DE VOLLEYBALL
LASTCHANGE-DAY: 28/01/2026 19.10.39
LASTCHANGE-IDP: DVW
LASTCHANGE-PRG: Data Volley
LASTCHANGE-REL: Release 4.03.17
LASTCHANGE-VER: Professional
LASTCHANGE-NAM: FEDERATION FRANCAISE DE VOLLEYBALL
```

Format clé-valeur `KEY: VALUE` :
- `FILEFORMAT` : Version du format (2.0)
- `GENERATOR-DAY` : Date/heure de création (DD/MM/YYYY HH.MM.SS)
- `GENERATOR-PRG` : Logiciel générateur
- `GENERATOR-REL` : Version du logiciel
- `GENERATOR-VER` : Édition (Professional)
- `GENERATOR-NAM` : Licence/organisation (FFVB)
- `LASTCHANGE-*` : Mêmes champs pour la dernière modification

---

## 3. Section [3MATCH]

```
[3MATCH]
27/01/2026;;2015/2016;INTERPOLE SUD;;;;;1252;1;Z;0;2494E544552504F4C4520535544;2;;  ← Ligne 1
;;46049;;;;R;R;;52515;                                                         ← Ligne 2
```

Ligne 1 séparée par `;` :
- Date au format `DD/MM/YYYY`
- (vide)
- Saison (2015/2016)
- Nom de la compétition (INTERPOLE SUD)
- Champs 5-8 : vides ou optionnels
- Code numérique (1252)
- Nombre de sets gagnés par le vainqueur (1=3 sets)
- Code résultat (Z)
- Sets perdus (0)
- Nom compétition en hex
- Score code (2)

Ligne 2 : informations additionnelles (lieu, codes lieu, arbitres)

> **Note parser** : les champs hex (ex: `2494E544552504F4C4520535544`) encodent des chaînes en hexadécimal. Pour le MVP, on peut les ignorer — le nom en clair est déjà dans la ligne 1.

---

## 4. Section [3TEAMS]

```
[3TEAMS]
BOU;POLE BOULOURIS;2;VIAL FABRICE;LAVAL LAURENT;16016139;hex;hex;hex;
SAB;POLE SABLE;0;BOUVET OLIVIER;;15728880;hex;hex;hex;
```

Format par ligne : `CODE;NOM_EQUIPE;?;COACH1;COACH2;CODE_FED;HEX_NOM;HEX_COACH1;HEX_COACH2;`
- Code 3 lettres en PREMIER
- Nom de l'équipe en 2ème position
- Coach principal en 4ème position
- Coach adjoint en 5ème position (optionnel)
- Code fédération (numérique)
- Champs hex : noms encodés en hexadécimal (ignorables)

---

## 5. Section [3SET]

```
[3SET]
True; 8- 5;13-16;21-19;25-20;25;
True; 2- 8;16-15;21-15;25-20;23;
True; 8- 3;;;15- 7;;
True;;;;;;
True;;;;;;
```

Chaque ligne = 1 set potentiel (toujours 5 lignes, même si match en 3 sets).

Format : `Played;Score8pts;Score16pts;Score21pts;ScoreFinal;LostTeamScore;`
- `True` = set joué, `True` avec champs vides = set non joué
- Scores aux jalons : 8, 16, 21 points (format `X-YY` ou `XX-YY`, espaces possibles)
- Score final du set (ex: `25-20`)
- Score de l'équipe perdante seul (ex: `25` ou `23` ou vide)

> **Attention** : les espaces dans les scores (`8- 5`, `15- 7`) doivent être trimmés.
> Le score `13-16` montre que parfois le score au jalon n'est pas dans l'ordre home-away attendu — c'est le score au moment où une équipe atteint le jalon.

---

## 6. Sections [3PLAYERS-H] et [3PLAYERS-V]

```
[3PLAYERS-H]
0;2;1;3;4;;;;LEM-CHL;LEMAIRE;CHLOE;;;2;False;;;hex;hex;;;;
0;30;12;*;*;*;;;VIA-LYC;VIAL;LYCIA;;L;1;False;;;hex;hex;;;;
[3PLAYERS-V]
1;7;19;6;5;6;;;PRO-JUL;PROU;JULIA;;;2;False;;;hex;hex;;;;
1;2;14;;*;*;;;ZIM-MEL;ZIMAGLIA;MELINA;;L;1;False;;;hex;hex;;;;
```

Format (21+ champs séparés par `;`) :
```
TEAM;NUMERO;INDEX;ROT_SET1;ROT_SET2;ROT_SET3;;;ABBR;NOM;PRENOM;;POSITION;ROLE_CODE;STARTER;...;HEX_NOM;HEX_PRENOM;...
```

| Champ | Position | Description | Exemples |
|-------|----------|-------------|----------|
| TEAM | 0 | 0=Home, 1=Visitor | `0`, `1` |
| NUMERO | 1 | Numéro de maillot | `2`, `7`, `30` |
| INDEX | 2 | Index global joueur | `1`-`26` |
| ROT_SET1 | 3 | Position rotation set 1 | `1`-`6`, `*`=remplaçant, vide=absent |
| ROT_SET2 | 4 | Position rotation set 2 | idem |
| ROT_SET3 | 5 | Position rotation set 3 | idem |
| (réservé) | 6-7 | Toujours vides | |
| ABBR | 8 | Abréviation joueur | `PRO-JUL` |
| NOM | 9 | Nom de famille | `PROU` |
| PRENOM | 10 | Prénom | `JULIA` |
| (réservé) | 11 | Toujours vide | |
| POSITION | 12 | `L`=libéro, vide sinon | `L`, `` |
| ROLE_CODE | 13 | Code numérique de rôle | `1`=L, `2`-`5`=autres |
| STARTER | 14 | `False` (booléen) | `False` |

> **H** = Home team, **V** = Visitor team
> Les joueurs avec `*` dans les colonnes ROT_SETx sont remplaçants pour ce set
> Position `L` dans le champ 12 = libéro (confirmé par role_code=1)

### Joueurs identifiés dans le fichier

**Home (Boulouris) — 12 joueurs :**
| # | Nom | Prénom | Position |
|---|-----|--------|----------|
| 2 | Lemaire | Chloé | - |
| 3 | Halbwachs | Telma | - |
| 5 | Meli | Chanelle | - |
| 6 | Ngninnanjouena | Candice | - |
| 8 | Brignon | Kyara | - |
| 9 | Iva | Ilaisaane | - |
| 10 | Santos | Leelou | - |
| 13 | Roussel | Kiara | - |
| 18 | Noizet | Elwenn | - |
| 20 | Coustenoble | Rose | - |
| 30 | Vial | Lycia | L |
| 33 | Assogba | Lissandra | - |

**Visitor (Sablé) — 14 joueurs :**
| # | Nom | Prénom | Position | Profil RPE |
|---|-----|--------|----------|------------|
| 1 | Marionneau | Charlotte | - |  Charlotte |
| 2 | Zimaglia | Mélina | L |  Mélina |
| 3 | Le Falher | Chloé | - |  Chloé |
| 4 | Wester | Nine | - |  Nine |
| 5 | Lecrivain | Rose | - |  Rose |
| 6 | Durimel Gato | Lovely | - |  Lovely |
| 7 | Prou | Julia | - |  Julia |
| 9 | Gueguen | Léa | - |  Léa |
| 10 | Pouget | Lilou | - |  Lilou |
| 11 | Chevrollier | Eline | - |  Eline |
| 12 | Lefevre | Zoé | - |  Zoé |
| 16 | Vincent | Lise | - |  Lise |
| 17 | Koffi | Cyrielle | - |  Cyrielle |
| 44 | Ameza | Nélia | - |  Nélia |

> **CRITIQUE :** Les 14 joueuses de Sablé dans le DVW correspondent EXACTEMENT aux profils de l'app RPE.
> Le mapping automatique `DVW Player → RPE Player` est possible par nom/prénom.

---

## 7. Section [3ATTACKCOMBINATION]

```
[3ATTACKCOMBINATION]
CA;3;L;Q;Fix back / tete;;8388608;4857;C;;
CB;3;L;H;Tempo 2 back / tete;;8388608;4855;C;;
CC;3;L;H;Hight ball 3;;8388608;4858;C;;
C1;3;C;Q;Fix front;;8388608;4846;F;;
C2;3;C;Q;Devi / Slide;;8388608;4852;F;;
C3;3;C;H;Tempo 2 front / tete;;8388608;4832;F;;
X5;4;R;Q;Fix from 4;;32896;4833;F;;
X4;4;R;Q;Move from 4;;32896;4832;F;;
V4;4;R;H;Hight set inside 4;;32896;4833;F;;
X1;3;R;Q;Cross with 4;;32896;4847;F;;
XA;3;L;Q;Cross with 2;;16711935;4659;B;;
V5;3;R;H;Hight ball 4 in;;32896;4847;F;;
Z1;8;C;T;Pipe;;8421504;3650;P;1;
Z2;8;C;T;Pipe +;;8421504;3341;P;1;
ZP;8;C;H;Hight pipe;;255;3651;P;1;
PR;3;C;O;Unclassifable;;8421376;4850;-;;
Y1;3;C;O;Spike 1st touch in 3;;8421376;4747;-;;
```

Format : `CODE;ZONE_DEPART;SIDE;TEMPO;DESCRIPTION;;COLOR;COORDS;POSITION_CAT;?;`

| Champ | Description | Valeurs |
|-------|-------------|---------|
| CODE | Code 2 chars | `CA`, `X5`, `Z1`, etc. |
| ZONE_DEPART | Zone de frappe (1-9) | `2`, `3`, `4`, `7`, `8`, `9` |
| SIDE | Côté du terrain | `L`=Left, `R`=Right, `C`=Center |
| TEMPO | Tempo de l'attaque | `Q`=Quick, `H`=High, `T`=Tempo, `O`=Other, `U`=Unknown |
| DESCRIPTION | Nom anglais | `Fix front`, `Pipe`, etc. |
| (vide) | Toujours vide | |
| COLOR | Couleur UI (entier) | `8388608`=rouge, `32896`=vert, `255`=bleu... |
| COORDS | Coordonnées visuelles | `4857`, `3650`, etc. |
| POSITION_CAT | Catégorie de position | `F`=Front, `B`=Back, `C`=Center, `P`=Pipe, `-`=Other |
| ? | Flag optionnel | `1` pour pipe, vide sinon |

### Familles d'attaque :

| Préfixe | Famille | Side typique | Tempo typique |
|---------|---------|-------------|---------------|
| C | Centre (quick tempo 1, slide) | L/C | Q/H |
| X | Aile droite (poste 4) | R | Q |
| V | Haute aile (variante) | R/L | H |
| Z | Pipe / Arrière | C | T/H |
| PR | Inclassable | C | O |
| Y | Spike sur 1er contact | C | O |

---

## 8. Section [3SETTERCALL]

```
[3SETTERCALL]
K1;;Fixe Avant;;0;3949;4349;4952;;255;
K2;;Fixe flott;;0;4149;4343;4841;;255;
K3;;Decalé;;255;3949;4037;4837;;255;
KA;;Fixe Arr/ bask tete;;16711680;3952;4067;4867;;255;
KB;;basket flott;;16711680;4056;4274;4777;;255;
KC;;Basket Mire;;32768;4159;4185;4986;;255;
K9;;Close to 2;;65535;0000;0000;0000;polygonCoords;12632256;
K7;;Close to 4;;65535;0000;0000;0000;polygonCoords;12632256;
K0;;No first tempo;;16777215;0000;0000;0000;polygonCoords;12632256;
```

Format : `CODE;;DESCRIPTION;;COLOR;COORD1;COORD2;COORD3;[POLYGON_COORDS;]COLOR2;`
- Codes K0 à KC, K7, K8, K9, KE
- Décrivent le choix de distribution de la passeuse
- Les coordonnées définissent la position de la passe sur la visualisation du terrain
- Certaines entrées incluent des coordonnées polygonales (zones de réception)

---

## 9. Section [3VIDEO]

```
[3VIDEO]
Camera0=C:\Users\maxim\Videos\INTERPOLE\XXX00 POLE B vs POLE SABLE.mp4
```

- Chemin LOCAL vers le fichier vidéo (sur le PC du scouteur)
- Le nom de caméra est `Camera0`
- **Important :** Ce chemin n'est PAS directement utilisable. Il faut mapper vers la vidéo YouTube.

---

## 10. Section [3SCOUT] — Format des lignes d'actions

### 10.1 Types de lignes

Le fichier scout contient plusieurs types de lignes :

| Type | Pattern | Exemple | Description |
|------|---------|---------|-------------|
| **Action** | `{team}{player}{Skill}{Quality}{SubType}~{zones}~{extras}` | `a07AH#V5~47CH2` | Action de jeu |
| **Point** | `{team}p{score1}:{score2}` | `*p25:20` | Point marqué |
| **Rotation** | `{team}z{rotation}` | `*z4` | Changement de rotation |
| **Substitution** | `{team}c{out}:{in}` | `*c08:06` | Remplacement |
| **Lineup** | `{team}P{player}>LUp` | `*P13>LUp` | Composition initiale du set |
| **Rotation init** | `{team}z{rot}>LUp` | `*z5>LUp` | Rotation de départ du set |
| **Set end** | `**{N}set` | `**1set` | Fin du set N |
| **Timeout** | `{team}T` | `*T` / `aT` | Temps mort |
| **Player entry** | `{team}P{number}` | `*P08` | Entrée en jeu (sans substitution) |

### 10.2 Préfixe d'équipe

| Préfixe | Signification |
|---------|--------------|
| `*` | Home team (ici Boulouris) |
| `a` | Away team (ici Sablé) |

### 10.3 Format complet d'une ligne d'action

```
a07AH#V5~47CH2;s;r;;;;;18.35.43;1;1;5;1;1195;;8;5;3;13;9;2;17;16;7;3;5;9;
└──────────────┘ └───┘     └──────┘ └─────────┘  └──────────────────────────┘
    ACTION       MODS      TIMESTAMP    META        ROTATION POSITIONS
```

#### ACTION : `a07AH#V5~47CH2`

| Position | Valeur | Signification |
|----------|--------|---------------|
| [0] | `a` | Équipe (away) |
| [1-2] | `07` | Numéro du joueur (Julia Prou) |
| [3] | `A` | Skill : S=Serve, R=Receive, E=Set, A=Attack, B=Block, D=Dig, F=Freeball |
| [4] | `H` | Ball type : H=High, M=Medium, Q=Quick, T=Tempo, O=Overpass, U=Unknown |
| [5] | `#` | Qualité : `#`=parfait/kill, `+`=bon, `!`=ok, `-`=négatif, `/`=pauvre, `=`=erreur |
| [6-7] | `V5` | Code d'attaque (référence [3ATTACKCOMBINATION]) |
| [8] | `~` | Séparateur |
| [9-10] | `47` | Zones : premier chiffre=départ(4), second=arrivée(7) |
| [11] | `C` | Zone d'effet : A-D (sous-zone d'arrivée) |
| [12] | `H` | ? Effet additionnel (H, T, P, N...) |
| [13] | `2` | Nombre de bloqueurs adverses (0, 1, 2, 3) |

#### Cas spéciaux dans l'ACTION

```
a$$&H#      → Erreur adverse (joueur=$$ = "l'équipe", &=faute adverse)
*$$&H=      → Erreur adverse qui finit le rally
~~~66C      → Pas de code d'attaque (service, réception, dig)
~~N         → Balle dans le filet (Net)
~0N         → Balle dans le filet, 0 bloqueurs
```

#### MODIFIERS (séparés par `;`)

Position dans les 7 champs entre ACTION et TIMESTAMP :

| Position | Valeur | Signification probable |
|----------|--------|----------------------|
| 1 | `s` | Skill focus / point technique |
| 1 | `p` | Point marqué sur cette action |
| 2 | `r` | Rally continuation |
| 2 | `s` | Idem skill |
| 2 | `p` | Idem point |

> Les modifiers semblent indiquer : est-ce que cette action a contribué à marquer un point (`;p;`) ou est une action de continuation (`;r;`).

#### TIMESTAMP

Format : `HH.MM.SS` (heure réelle, PAS timestamp vidéo)
- Exemple : `18.35.43` = 18h35m43s
- C'est l'heure de l'horloge du scouteur
- Le match commence vers 18h16-18h17 et finit vers 19h22

#### META (après le timestamp, séparés par `;`)

```
;1;1;5;1;1195;
 │ │ │ │ │
 │ │ │ │ └── Video frame (index de la frame vidéo)
 │ │ │ └──── ? (toujours 1 dans ce fichier)
 │ │ └────── Rotation de l'équipe away (1-6)
 │ └──────── Rotation de l'équipe home (1-6)
 └────────── Numéro du set (1, 2, 3...)
```

#### ROTATION POSITIONS (12 champs finaux)

```
;;8;5;3;13;9;2;17;16;7;3;5;9;
  └──────────┘ └──────────────┘
  Home P1→P6   Away P1→P6
```

- 6 numéros de joueur pour l'équipe Home (positions P1 à P6)
- 6 numéros de joueur pour l'équipe Away (positions P1 à P6)
- Changent à chaque rotation et substitution

---

## 11. Flux d'un rally typique

Exemple de rally complet (set 1, score avant: 17-17) :

```
a17SM/~~~16C          ← Sablé #17 (Koffi) Service Medium, / (mauvais), zone 1→6
*09RM/~~~16CW         ← Boulouris #09 (Iva) Réception Medium, / (mauvaise), zone 1→6, W=weak
a05FH+                ← Sablé #05 (Lecrivain) Freeball High, + (positive)
a09EH+K0F~3A          ← Sablé #09 (Gueguen) Set(E) High, + (bonne), K0=distrib, zone 3A
a07AH-V5~47~P1        ← Sablé #07 (Prou) Attack High, - (négatif), V5=pipe, z4→z7, 1 bloqueur
*05DH+~~~47           ← Boulouris #05 (Meli) Dig High, + (bonne), zone 4→7
*13EH+K0B~8B          ← Boulouris #13 (Roussel) Set High, +, K0=distrib, zone 8B
*08AH#VC~22DT2;s;s;   ← Boulouris #08 (Brignon) Attack High, # (KILL), VC=centre, z2→2, 2 bloqueurs
a16DH=~~~22D;s;       ← Sablé #16 (Vincent) Dig High, = (ERREUR), zone 2→2
*p18:17               ← Point pour Home, score 18-17
*z4                   ← Boulouris passe en rotation 4
```

---

## 12. Transitions entre sets

```
*p25:20               ← Dernier point du set 1 (Boulouris gagne 25-20)
**1set                ← Marqueur de fin de set 1
*P08>LUp              ← Lineup Home set 2 : joueur #08 en P1
*z5>LUp               ← Rotation de départ Home : R5
aP05>LUp              ← Lineup Away set 2 : joueur #05 en P1
az1>LUp               ← Rotation de départ Away : R1
a05SM!~~~19D          ← Premier service du set 2
```

Le set 3 (tie-break) montre des changements de composition :
- Sablé fait entrer #12 Lefevre, #1 Marionneau(Charlotte), #17 Koffi à la place de certaines joueuses
- Boulouris fait entrer #10 Santos et #18 Noizet

---

## 13. Video Frame vs Timestamp

- **Video frame** : nombre entier croissant (ex: 72, 738, 1195, 3420)
  - Set 1 démarre vers frame ~72, finit vers ~1556
  - Set 2 démarre vers frame ~1727, finit vers ~3090
  - Set 3 démarre vers frame ~3254, finit vers ~4010
  
- Pour convertir en secondes vidéo : il faut connaître le FPS
  - Si 1 frame = 1 seconde → Set 1 dure ~25 min (1556-72=1484s ≈ 24.7min)  plausible
  - Set 1 en timestamps réels : 18h17 → 18h41 = 24 min  correspond !
  
- **Conclusion : 1 frame ≈ 1 seconde vidéo** (résolution à la seconde, pas à la frame)

---

## 14. Statistiques du fichier

| Métrique | Valeur |
|----------|--------|
| Total lignes | 946 |
| Lignes [3SCOUT] | ~830 |
| Sets joués | 3 (25-20, 25-23, 15-7) |
| Vainqueur | Boulouris 3-0 |
| Actions de jeu | ~400 |
| Points marqués | ~110 (25+20 + 25+23 + 15+7) |
| Timeouts | 4 (2 par équipe) |
| Substitutions | ~8 |
| Durée totale | ~65 min (18h17 → 19h22) |

---

## 15. Skills identifiés

| Code | Skill | Ball Types observés |
|------|-------|-------------------|
| S | Serve (Service) | M (Medium), Q (Quick) |
| R | Receive (Réception) | M, Q |
| E | Set (Passe) | H (High), Q (Quick), T (Tempo), O (Overpass), U (Unknown) |
| A | Attack (Attaque) | H, Q, T, O, U |
| B | Block (Bloc) | H, Q, U |
| D | Dig (Défense) | H, Q, T, O |
| F | Freeball (Balle gratuite) | H |

---

## 16. Receive Effect (suffixe après les zones sur les réceptions)

| Code | Signification |
|------|---------------|
| M | Medium quality (acceptable) |
| W | Weak (mauvaise qualité) |
| L | Réception du Libéro |
| R | Regular position |
| O | Overpass (balle renvoyée directement) |

---

## 17. Implications pour le parser VolleyVision

### Doit gérer :
1. **Encodage action** : regex complexe avec groupes optionnels
2. **Joueur spécial `$$`** : erreur d'équipe, pas un joueur spécifique
3. **`&` = faute adverse** : le `&` après `$$` indique une faute
4. **Transitions set** : `**Nset` + `>LUp` pour les lineups
5. **Substitutions** : format `c{out}:{in}`
6. **Rotations complètes** : 12 numéros en fin de ligne
7. **Video frame** : convertible en secondes (ratio ≈ 1:1)
8. **Qualité des réceptions** : suffixe M/W/L/R/O
9. **Ball type** : H/M/Q/T/O/U (affecte le type d'analyse)
10. **Nombre de bloqueurs** : 0-3 (crucial pour l'analyse d'attaque)
11. **Setter calls** : K0-KC (distribution de la passeuse)
12. **Modifiers** : `;s;`, `;r;`, `;p;` (contexte de l'action dans le rally)
13. **Net indicator** : `~~N` (balle dans le filet)

### Edge cases :
- Ligne d'action avec zones `~~~~` (pas de zone, ex: blocs, freeballs)
- Ligne d'action avec zones `~~~66C` (seule zone d'arrivée)
- Timestamps pas strictement croissants (corrections du scouteur)
- Lignes vides possibles entre sections
