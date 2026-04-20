# Spécification complète du format DVW — Référence pour VolleyVision

## 1. Vue d'ensemble

Le fichier `.dvw` est un **fichier texte structuré** (pas binaire) produit par DataVolley 4 (Data Project, Italie). Il est organisé en **sections délimitées par des balises `[3SECTION_NAME]`**, avec des champs séparés par des points-virgules (`;`).

### Logiciels compatibles
- **DataVolley 4** (Data Project) — propriétaire, référence du format
- **VolleyStation** (exports `.dvw` et `.vsm`)
- **Click & Scout** — compatible DVW
- **VolleyMetrics / Hudl** — utilise le DVW avec des conventions légèrement différentes
- **ovscout2** (openvolley) — open source, génère des .dvw standard

### Ressources open source clés
| Projet | Langage | GitHub | Usage |
|--------|---------|--------|-------|
| `openvolley/datavolley` | R | github.com/openvolley/datavolley | Parser de référence, le plus complet |
| `openvolley/pydatavolley` | Python | github.com/openvolley/pydatavolley | Parser Python (pip: `pydatavolley` ou `openvolley-pydatavolley`) |
| `openvolley/ovscout2` | R/Shiny | github.com/openvolley/ovscout2 | Scouting web avec export DVW |
| `openvolley/ovml` | R | github.com/openvolley/ovml | Machine learning pour le volley |
| `openvolley/ovva` | R/Shiny | github.com/openvolley/ovva | Analyse vidéo |

---

## 2. Structure complète d'un fichier .dvw

Un fichier DVW contient les sections suivantes, dans cet ordre :

```
[3DATAVOLLEYSCOUT]    → Header / métadonnées du fichier
[3MATCH]              → Informations du match
[3TEAMS]              → Équipes (domicile + extérieur)
[3MORE]               → Infos complémentaires (salle, arbitres, etc.)
[3COMMENTS]           → Commentaires libres
[3SET]                → Résultats par set
[3PLAYERS-H]          → Joueurs de l'équipe domicile
[3PLAYERS-V]          → Joueurs de l'équipe extérieure
[3ATTACKCOMBINATION]  → Table des combinaisons d'attaque
[3SETTERCALL]         → Appels du passeur
[3WINNINGSYMBOLS]     → Symboles de gain de point
[3RESERVE]            → (réservé)
[3VIDEO]              → Fichier(s) vidéo associé(s)
[3SCOUT]              → ⭐ Données de scouting (play-by-play) — section principale
```

---

## 3. Détail de chaque section

### 3.1 `[3DATAVOLLEYSCOUT]` — Header

```
[3DATAVOLLEYSCOUT]
FILEFORMAT: 2.0
GENERATOR-DAY: 25/01/2015 10.30.00
GENERATOR-IDP: 
GENERATOR-PRG: Data Volley
GENERATOR-REL: 4.50.2020
GENERATOR-VER: 
GENERATOR-NAM: 
LASTCHANGE-DAY: 25/01/2015 12.45.00
LASTCHANGE-IDP: datavolley
LASTCHANGE-PRG: datavolley-R
LASTCHANGE-REL: 1.9.2
LASTCHANGE-VER: 
LASTCHANGE-NAM: 
```

| Champ | Description |
|-------|-------------|
| `FILEFORMAT` | Version du format (typiquement "2.0") |
| `GENERATOR-*` | Logiciel qui a créé le fichier |
| `LASTCHANGE-*` | Dernier logiciel à avoir modifié |

### 3.2 `[3MATCH]` — Infos du match

Ligne unique de champs séparés par `;` :

```
date;heure;saison;ligue;phase;domicile/ext;jour_de_match;set_du_match;regulation;...
```

| Position | Champ | Exemple |
|----------|-------|---------|
| 1 | Date | `25/01/2015` |
| 2 | Heure | `19.30.00` |
| 3 | Saison | `2014/2015` |
| 4 | Ligue | `Finale mladinke` |
| 5 | Phase | `Final` |
| 6 | Home/Away | (identifiant) |
| 7 | Numéro de journée | `1` |
| 8 | Numéro du set dans le match | |
| ... | Regulation type | `1` = indoor rally point, `0` = indoor sideout, `2` = beach rally point |

### 3.3 `[3TEAMS]` — Équipes

Deux lignes (domicile puis extérieur), champs `;` :

```
team_id;nom_equipe;sets_gagnés;head_coach;assistant_coach;...
```

### 3.4 `[3PLAYERS-H]` et `[3PLAYERS-V]` — Joueurs

Une ligne par joueur, champs `;` :

```
numero;nom;prenom;surnom;...;role;...;player_id;...
```

**Rôles (codage numérique)** :
| Code | Rôle |
|------|------|
| 1 | Libéro |
| 2 | Réceptionneur-attaquant (outside) |
| 3 | Opposé (opposite) |
| 4 | Central (middle) |
| 5 | Passeur (setter) |
| 6 | Inconnu |

### 3.5 `[3SET]` — Résultats par set

Infos de score, durée, et détails de chaque set.

### 3.6 `[3ATTACKCOMBINATION]` — Combinaisons d'attaque

Table complète des codes d'attaque à 2 caractères. Codes standard DataVolley :

| Code | Description FR | Description EN |
|------|---------------|----------------|
| **Premières temps (X)** | | |
| X1 | Première temps courte devant | Quick in front of setter |
| X2 | Première temps courte derrière | Quick behind setter |
| X5 | Tip poste 4 | Tip to position 4 |
| X6 | Tip poste 2 | Tip to position 2 |
| X7 | Première temps à mi-distance | Quick, 1m from setter |
| XP | Pipe (poste 6) | Pipe |
| XB | Pipe entre 6 et 1 | Pipe between 6 and 1 |
| XR | Pipe entre 6 et 5 | Pipe between 6 and 5 |
| XD | Première temps à mi-distance centre-droite | Half speed middle-right |
| XG | Glissée (slide) | Slide |
| XQ | Half derrière C.D. | Half behind C.D. |
| **Combinaisons rapides (C)** | | |
| CD | Rapide proche du passeur | Fast close to setter |
| CB | Rapide décalée | Fast shifted from setter |
| CF | Rapide loin du passeur | Fast away from setter |
| C5 | Super en poste 4 | Super to position 4 |
| C0 | Super en poste 5 | Super to position 5 |
| C6 | Super en poste 2 | Super to position 2 |
| C8 | Super en poste 1 | Super to position 1 |
| **Hautes (V)** | | |
| V5 | Haute en poste 4 | High to position 4 |
| V0 | Haute en poste 5 | High to position 5 |
| V6 | Haute en poste 2 | High to position 2 |
| V8 | Haute en poste 1 | High to position 1 |
| VB | Haute pipe entre 6 et 1 | High pipe between 6 and 1 |
| VP | Haute pipe | High pipe |
| VR | Haute pipe entre 6 et 5 | High pipe between 6 and 5 |
| V3 | Haute en poste 3 | High to position 3 |
| **Autres** | | |
| P2 | 2ème touche de libéro | Setter second touch (libero) |
| PR | Pénalité (rigore) | Penalty |

### 3.7 `[3SETTERCALL]` — Appels du passeur

Codes d'appel du passeur pour les combinaisons prévues.

### 3.8 `[3VIDEO]` — Fichiers vidéo

Chemin(s) vers le(s) fichier(s) vidéo liés au match.

---

## 4. ⭐ Section `[3SCOUT]` — Le cœur des données

C'est la section la plus importante : le **play-by-play** de chaque action du match.

### 4.1 Format d'une ligne de scout

Chaque ligne représente une action et suit ce format :

```
code_scout;time;set;home_rotation;away_rotation;video_file;video_time;...
```

### 4.2 Structure du code scout (20+ caractères)

Le **code scout** est une chaîne compacte qui encode toute l'action :

```
Position : 1    2     3-4    5       6-7     8-9      10-13        14-17        18-20
           |    |      |     |        |       |         |            |            |
          Team  Num   Skill Eval   Type    Subzone  Start_coord  End_coord   Add_info
           *   12      A     #      H       1C      5234         4712        ~~~

Exemple : *12A#H1C52344712~~~
```

| Position(s) | Nom | Valeurs |
|-------------|-----|---------|
| 1 | **Team** | `*` = domicile, `a` = extérieur |
| 2-3 | **Numéro du joueur** | `01`-`99` |
| 4 | **Skill (compétence)** | Voir table ci-dessous |
| 5 | **Evaluation (qualité)** | `#`, `+`, `!`, `-`, `/`, `=` |
| 6 | **Type** (sous-type du skill) | Dépend du skill |
| 7-8 | **Zone de départ** | Zone (1-9) + sous-zone (A-D) |
| 9-10 | **Zone d'arrivée** | Zone (1-9) + sous-zone (A-D) |
| 11-14 | **Coordonnées de départ** | x,y sur le terrain (grille) |
| 15-18 | **Coordonnées d'arrivée** | x,y sur le terrain (grille) |
| 19+ | **Infos additionnelles** | `~` = non utilisé |

### 4.3 Skills (Compétences)

| Code | Skill | Description |
|------|-------|-------------|
| `S` | **Serve** | Service |
| `R` | **Reception** | Réception |
| `A` | **Attack** | Attaque |
| `B` | **Block** | Contre (block) |
| `D` | **Dig** | Défense |
| `E` | **Set** | Passe (distribution) |
| `F` | **Freeball** | Balle gratuite (renvoi) |

### 4.4 ⭐ Codes d'évaluation — La grille complète

C'est le système de notation le plus important. Les codes signifient des choses **différentes selon le skill** :

#### Service (S)

| Code | Évaluation | Description FR |
|------|-----------|----------------|
| `#` | **Ace** | Point direct au service |
| `+` | Positif, attaque partielle adverse | Le receveur ne peut pas construire librement |
| `!` | OK, pas de 1ère tempo possible | Service correct, mais pas de pression |
| `-` | Négatif, attaque libre adverse | Mauvais service, l'adversaire construit |
| `/` | Positif, pas d'attaque | Service long, pas d'attaque construite |
| `=` | **Erreur** | Faute au service (filet, dehors) |

#### Réception (R)

| Code | Évaluation | Description FR |
|------|-----------|----------------|
| `#` | **Passe parfaite** | Le passeur a toutes les options |
| `+` | Positive, attaque possible | Bonne réception, attaque construite |
| `!` | OK, pas de 1ère tempo possible | Acceptable mais options limitées |
| `-` | Négative, attaque limitée | Mauvaise réception, attaque limitée |
| `/` | Pauvre, pas d'attaque | Très mauvaise, impossible d'attaquer |
| `=` | **Erreur** | Réception directement faute |

#### Attaque (A)

| Code | Évaluation | Description FR |
|------|-----------|----------------|
| `#` | **Attaque gagnante (kill)** | Point direct |
| `+` | Positive, bonne attaque | Adversaire en difficulté |
| `!` | Contrée pour re-attaque | Touche de block, on rejoue |
| `-` | Pauvre, défense facile | Attaque facilement relevée |
| `/` | **Contrée (blocked)** | Kill block adverse |
| `=` | **Erreur** | Attaque faute (filet, dehors) |

#### Contre / Block (B)

| Code | Évaluation | Description FR |
|------|-----------|----------------|
| `#` | **Block gagnant (stuff)** | Point direct au block |
| `+` | Positive, touche de block | L'attaque est déviée/ralentie |
| `!` | Pauvre, adversaire rejoue | Faible, l'adversaire construit |
| `-` | Pauvre, adversaire à rejouer | Block peu efficace |
| `/` | **Invasion** | Faute de filet / pénétration |
| `=` | **Erreur** | Faute de block |

> ⚠️ **Convention VolleyMetrics** : `B/` = block pauvre (adversaire rejoue), `B!` = block tool. Différent du standard !
> ⚠️ **Convention allemande** : `B/` et `B=` sont inversés par rapport au standard.

#### Défense / Dig (D)

| Code | Évaluation | Description FR |
|------|-----------|----------------|
| `#` | **Défense parfaite** | Ballon idéal pour le passeur |
| `+` | Bonne défense | Bonne récupération, jeu possible |
| `!` | OK, pas de 1ère tempo possible | Défense correcte |
| `-` | Pas d'attaque construite possible | Mauvaise défense |
| `/` | Ballon directement renvoyé | Freeball pour l'adversaire |
| `=` | **Erreur** | Défense faute / ballon tombé |

#### Passe / Set (E)

| Code | Évaluation | Description FR |
|------|-----------|----------------|
| `#` | **Parfaite** | Passe idéale, toutes options |
| `+` | Positive | Bonne passe |
| `!` | OK | Acceptable |
| `-` | Pauvre | Mauvaise passe |
| `/` | Pauvre | Très mauvaise passe |
| `=` | **Erreur** | Passe faute |

#### Freeball (F)

| Code | Évaluation | Description FR |
|------|-----------|----------------|
| `#` | **Parfaite** | Renvoi idéal |
| `+` | Bon | Bon renvoi |
| `!` | OK, pas de 1ère tempo possible | Acceptable |
| `-` | OK, seulement balle haute possible | Limité |
| `/` | Pauvre | Mauvais renvoi |
| `=` | **Erreur** | Faute |

### 4.5 Types de service (sous-type du skill S)

| Code | Type |
|------|------|
| `Q` | Service smashé (jump serve) |
| `M` | Service flottant sauté (jump float) |
| `H` | Service flottant (standing float) |
| `T` | Service cuillère (underhand) |

### 4.6 Zones du terrain

Le terrain est divisé en **9 zones** standard FIVB :

```
┌─────────────────────────────┐
│     Filet (Net)             │
├─────┬─────┬─────┬─────┬────┤
│  2  │  9  │  3  │  8  │ 4  │  (Avant)
├─────┴─────┼─────┼─────┴────┤
│     7     │  6  │    5     │  (Arrière)
├───────────┼─────┼──────────┤
│           │  1  │          │  (Service)
└───────────┴─────┴──────────┘
```

- **Zones 2, 3, 4** : Avant (attaquantes)
- **Zone 9** : Entre 2 et 3 (avant centre-gauche)
- **Zone 8** : Entre 3 et 4 (avant centre-droite)
- **Zone 7** : Arrière gauche (derrière 2)
- **Zone 6** : Arrière centre
- **Zone 5** : Arrière droite (derrière 4)
- **Zone 1** : Position de service / arrière droite

**Sous-zones** (A, B, C, D) : divisent chaque zone en 4 quadrants pour plus de précision.

### 4.7 Coordonnées de terrain

Le package openvolley utilise un système de coordonnées pour le plotting :
- Intersection ligne latérale gauche / baseline bas : **(0.5, 0.5)**
- Intersection ligne latérale droite / baseline haut : **(3.5, 6.5)**
- Le filet intersecte les lignes latérales à **(0.5, 3.5)** et **(3.5, 3.5)**

### 4.8 Données additionnelles dans chaque ligne de scout

En plus du code scout, chaque ligne contient des métadonnées séparées par `;` :

| Champ | Description |
|-------|-------------|
| `video_file_number` | Index du fichier vidéo |
| `video_time` | Timestamp vidéo (secondes) |
| `set_number` | Numéro du set |
| `home_team_score` | Score équipe domicile |
| `visiting_team_score` | Score équipe extérieure |
| `home_setter_position` | Position du passeur domicile (1-6) |
| `visiting_setter_position` | Position du passeur visiteur (1-6) |
| `home_p1` à `home_p6` | Numéros des 6 joueurs domicile par position |
| `visiting_p1` à `visiting_p6` | Numéros des 6 joueurs visiteurs par position |

### 4.9 Codes spéciaux

| Code | Signification |
|------|--------------|
| `*P` ou `aP` | Rotation / lineup |
| `*z` ou `az` | Substitution |
| `*T` ou `aT` | Timeout |
| `*c` ou `ac` | Code personnalisé |
| `**` | Fin de set |

---

## 5. Colonnes extraites par les parsers (plays DataFrame)

Quand tu utilises `pydatavolley` ou le parser R, tu obtiens un DataFrame avec ces colonnes :

| Colonne | Type | Description |
|---------|------|-------------|
| `match_id` | string | ID unique du match |
| `video_file_number` | int | Numéro du fichier vidéo |
| `video_time` | float | Temps vidéo en secondes |
| `code` | string | Code scout brut complet |
| `team` | string | Nom de l'équipe |
| `player_number` | int | Numéro du joueur |
| `player_name` | string | Nom du joueur |
| `player_id` | string | ID unique du joueur |
| `skill` | string | Serve/Reception/Attack/Block/Dig/Set/Freeball |
| `evaluation_code` | char | #, +, !, -, /, = |
| `evaluation` | string | Description (Ace, Error, Perfect pass, etc.) |
| `setter_position` | int | Position du passeur (1-6) |
| `attack_code` | string | Code combinaison d'attaque (2 car.) |
| `set_code` | string | Code de passe |
| `set_type` | string | Type de passe |
| `start_zone` | int | Zone de départ (1-9) |
| `end_zone` | int | Zone d'arrivée (1-9) |
| `end_subzone` | char | Sous-zone d'arrivée (A-D) |
| `start_coordinate_x` | float | Coordonnée X de départ |
| `start_coordinate_y` | float | Coordonnée Y de départ |
| `end_coordinate_x` | float | Coordonnée X d'arrivée |
| `end_coordinate_y` | float | Coordonnée Y d'arrivée |
| `mid_coordinate_x` | float | Coordonnée X intermédiaire |
| `mid_coordinate_y` | float | Coordonnée Y intermédiaire |
| `num_players_numeric` | int | Nombre de joueurs au block |
| `home_team_score` | int | Score domicile |
| `visiting_team_score` | int | Score visiteur |
| `home_setter_position` | int | Position passeur domicile |
| `visiting_setter_position` | int | Position passeur visiteur |
| `custom_code` | string | Code personnalisé |
| `home_p1` à `home_p6` | int | Joueurs domicile par position |
| `visiting_p1` à `visiting_p6` | int | Joueurs visiteurs par position |
| `point_phase` | string | "Sideout" ou "Breakpoint" |
| `set_number` | int | Numéro du set |

---

## 6. Données dérivables (calculables)

À partir des données brutes, les parsers calculent des métriques avancées :

### Phases de jeu
- **Sideout** : L'équipe en réception marque le point
- **Breakpoint** : L'équipe au service marque le point
- **Sideout rate** = points gagnés en réception / total de rallyes en réception

### Séries de service (runs)
- Longueur des séries de service consécutives
- `find_serves()` et `find_runs()` dans le package R

### Rotations
- Score par rotation (passeur en P1, P2, P3, P4, P5, P6)
- Performance en sideout par rotation
- Performance en breakpoint par rotation

### Enchaînements de skills
- Réception → Passe → Attaque (chaîne côté réception)
- Serve → Block/Dig → Counter-attack (chaîne côté service)
- Qui a fait la passe avant chaque attaque

### Synchronisation vidéo
- Temps de contact estimés pour chaque skill
- Offsets entre le temps scouté et le contact réel

---

## 7. Ce que VolleyVision pourrait exploiter de plus

### 7.1 Données que tu parses probablement déjà
- Metadata du match (équipes, joueurs, score)
- Actions de base (service, réception, attaque)
- Résultats par set

### 7.2 Données potentiellement sous-exploitées

| Fonctionnalité | Données DVW | Valeur ajoutée |
|----------------|-------------|----------------|
| **Heatmaps d'attaque** | `start_zone`, `end_zone`, `start/end_coordinate_x/y` | Visualiser d'où et vers où chaque joueur attaque |
| **Analyse par rotation** | `setter_position` + scores | Identifier les rotations fortes/faibles |
| **Chaîne de sideout** | Enchaînement R→E→A | Taux de sideout par passe, par rotation |
| **Tendances de service** | Zone + type + évaluation | Prédire les zones de service adverses |
| **Performance au block** | Nombre de bloqueurs + évaluation | Efficacité du block par position |
| **Appels du passeur** | `set_code` + `attack_code` | Analyse de la distribution du passeur |
| **Sous-zones** | `end_subzone` (A-D) | Précision 4x plus fine que les zones seules |
| **Coordonnées brutes** | `start/mid/end_coordinate_x/y` | Trajectoires d'attaque, animations |
| **Synchronisation vidéo** | `video_time` | Liens directs vers les clips vidéo |
| **Codes personnalisés** | `custom_code` | Données spécifiques au scout (ex: qualité de couverture) |
| **Multi-match** | Parser plusieurs .dvw | Stats sur une saison entière |

### 7.3 Intégration unique RPE + DVW

**Ce que personne d'autre ne fait** : croiser les données de performance match (DVW) avec les données physiologiques (RPE Gen2) :

| Croisement | Insight |
|------------|---------|
| RPE du jour + performance match | Corrélation charge perçue / efficacité |
| Phase du cycle menstruel + stats d'attaque | Patterns de performance sur le cycle |
| ATL/CTL/TSB + taux de sideout | Impact de la fatigue sur l'efficacité collective |
| Streak RPE + erreurs au service | Fatigue accumulée et prise de risque |
| Score RED-S + temps de jeu | Alertes de santé liées à l'activité |

---

## 8. Exemple de code pour parser un .dvw en JavaScript

Pour ton application web VolleyVision, voici l'approche en JavaScript/Node.js :

```javascript
// Exemple simplifié de parser DVW pour VolleyVision
function parseDVW(fileContent) {
  const lines = fileContent.split('\n');
  const sections = {};
  let currentSection = null;
  let sectionLines = [];

  for (const line of lines) {
    const sectionMatch = line.match(/^\[3(\w+)\]/);
    if (sectionMatch) {
      if (currentSection) {
        sections[currentSection] = sectionLines;
      }
      currentSection = sectionMatch[1];
      sectionLines = [];
    } else {
      sectionLines.push(line);
    }
  }
  if (currentSection) sections[currentSection] = sectionLines;

  return {
    header: parseHeader(sections['DATAVOLLEYSCOUT']),
    match: parseMatch(sections['MATCH']),
    teams: parseTeams(sections['TEAMS']),
    playersHome: parsePlayers(sections['PLAYERS-H']),
    playersAway: parsePlayers(sections['PLAYERS-V']),
    sets: parseSets(sections['SET']),
    attackCombos: parseAttackCombos(sections['ATTACKCOMBINATION']),
    scout: parseScout(sections['SCOUT']),
  };
}

// Parser du code scout individuel
function parseScoutCode(code) {
  if (!code || code.length < 5) return null;
  
  const team = code[0]; // '*' ou 'a'
  const playerNum = code.substring(1, 3);
  const skill = code[3]; // S, R, A, B, D, E, F
  const evaluation = code[4]; // #, +, !, -, /, =
  const type = code.length > 5 ? code[5] : null;
  const startZone = code.length > 6 ? code.substring(6, 8) : null;
  const endZone = code.length > 8 ? code.substring(8, 10) : null;
  // Coordonnées en positions 10-17
  
  return {
    team: team === '*' ? 'home' : 'away',
    playerNumber: parseInt(playerNum),
    skill: SKILL_MAP[skill],
    evaluationCode: evaluation,
    evaluation: getEvaluation(skill, evaluation),
    type: type,
    startZone: startZone ? parseInt(startZone[0]) : null,
    startSubzone: startZone ? startZone[1] : null,
    endZone: endZone ? parseInt(endZone[0]) : null,
    endSubzone: endZone ? endZone[1] : null,
  };
}

const SKILL_MAP = {
  'S': 'Serve', 'R': 'Reception', 'A': 'Attack',
  'B': 'Block', 'D': 'Dig', 'E': 'Set', 'F': 'Freeball'
};

const EVALUATION_MAP = {
  'S': { '#': 'Ace', '+': 'Positive', '!': 'OK', '-': 'Negative', '/': 'Positive no attack', '=': 'Error' },
  'R': { '#': 'Perfect', '+': 'Positive', '!': 'OK', '-': 'Negative', '/': 'Poor', '=': 'Error' },
  'A': { '#': 'Kill', '+': 'Positive', '!': 'Blocked reattack', '-': 'Poor', '/': 'Blocked', '=': 'Error' },
  'B': { '#': 'Stuff block', '+': 'Touch', '!': 'Poor', '-': 'Poor', '/': 'Invasion', '=': 'Error' },
  'D': { '#': 'Perfect', '+': 'Good', '!': 'OK', '-': 'No attack', '/': 'Over net', '=': 'Error' },
  'E': { '#': 'Perfect', '+': 'Good', '!': 'OK', '-': 'Poor', '/': 'Poor', '=': 'Error' },
  'F': { '#': 'Perfect', '+': 'Good', '!': 'OK', '-': 'Limited', '/': 'Poor', '=': 'Error' },
};

function getEvaluation(skill, code) {
  return EVALUATION_MAP[skill]?.[code] || 'Unknown';
}
```

---

## 9. Différences VolleyMetrics vs DataVolley standard

| Élément | DataVolley standard | VolleyMetrics (Hudl) |
|---------|--------------------|-----------------------|
| `B/` | Block invasion (faute filet) | Block pauvre, adversaire rejoue |
| `B!` | Block pauvre | Block tool (attaque via block = point) |
| `B=` | Erreur de block | Erreur de block |
| Convention allemande | `B/` = invasion | `B/` = block tool, `B=` = invasion |
| Détection auto | — | `skill_evaluation_decode = "volleymetrics"` |

---

## 10. Roadmap suggérée pour VolleyVision

### Phase 1 — Parser DVW complet (JavaScript)
- [ ] Parser toutes les sections (pas juste SCOUT)
- [ ] Extraire les coordonnées x/y quand disponibles
- [ ] Gérer les conventions VolleyMetrics
- [ ] Support de l'encodage (windows-1252, UTF-8, etc.)

### Phase 2 — Visualisations interactives
- [ ] Heatmaps d'attaque par joueur (avec zones + sous-zones)
- [ ] Trajectoires de service sur le terrain
- [ ] Performance par rotation (radar chart)
- [ ] Distribution du passeur (diagramme circulaire par combo)

### Phase 3 — Analytics avancées
- [ ] Taux de sideout par rotation
- [ ] Chaîne R→E→A : taux de conversion par qualité de réception
- [ ] Prédiction de zone de service adverse
- [ ] Comparaison multi-match (stats saison)

### Phase 4 — Intégration RPE Gen2 ⭐ (ton avantage unique)
- [ ] Corrélation performance match ↔ RPE quotidien
- [ ] Impact du cycle menstruel sur les stats de match
- [ ] Dashboard unifié : charge d'entraînement + performance compétition
- [ ] Alertes automatiques quand fatigue + baisse de performance

---

*Document généré pour le projet VolleyVision — Olivier, Pôle Espoir Volleyball Sablé-sur-Sarthe*
*Sources : openvolley/datavolley (R), openvolley/pydatavolley, DataVolley 4 manual*
