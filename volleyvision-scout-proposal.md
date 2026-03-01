# VolleyVision Scout — Proposition d'architecture
## Scouting live minimaliste synchronisé vidéo

---

## 1. Le concept : "Minimum Click, Maximum Data"

### Le problème aujourd'hui
- La **FDME** gère l'administratif du match (obligatoire, pas modifiable)
- **DataVolley** est puissant mais complexe et cher (licence ~800€/an)
- **Tu n'as pas de donnée de scouting exploitable** entre les deux
- La vidéo est filmée mais **impossible de retrouver un rallye** sans se taper tout le replay

### La solution : VolleyVision Scout
Un outil **ultra-simple** où le scouter fait **2 clics par rallye** (service + point), et peut **optionnellement** enrichir chaque rallye avec des données supplémentaires. Le tout synchronisé avec le timestamp vidéo.

### La règle d'or
> **2 clics obligatoires par rallye = 1 clic service + 1 clic point**
> Tout le reste est optionnel et peut être ajouté en temps réel OU après le match en rejouant la vidéo.

---

## 2. Architecture du flux de scouting

### 2.1 Flux minimal (2 clics par rallye)

```
RALLYE N:
                                                          
  ① CLIC SERVICE                    ② CLIC POINT
  ┌──────────────┐                  ┌──────────────┐
  │  Qui sert ?  │    rallye en     │  Qui marque ? │
  │              │      cours       │              │
  │  [ÉQUIPE A]  │ ──────────────▶  │  [ÉQUIPE A]  │
  │  [ÉQUIPE B]  │                  │  [ÉQUIPE B]  │
  │              │                  │              │
  │  t=12:34.5   │                  │  t=12:41.2   │
  │  (timestamp) │                  │  (timestamp) │
  └──────────────┘                  └──────────────┘
                                           │
                                           ▼
                                    Score mis à jour
                                    Rallye enregistré
                                    Rotation calculée
                                    ───────────────
                                    Rallye N+1 prêt
```

### Ce que ces 2 clics génèrent automatiquement

| Donnée | Comment |
|--------|---------|
| **Timestamp début rallye** | Au clic "Service" |
| **Timestamp fin rallye** | Au clic "Point" |
| **Durée du rallye** | fin - début |
| **Équipe au service** | Clic service |
| **Équipe qui marque** | Clic point |
| **Sideout ou Breakpoint** | Calculé (service ≠ point = sideout) |
| **Score courant** | Incrémenté automatiquement |
| **N° du set** | Géré par les règles de scoring |
| **Rotation de chaque équipe** | Calculée via les changements de service |
| **Séries de service (runs)** | Calculées automatiquement |
| **Lien vidéo du rallye** | timestamp début - 3s → timestamp fin + 2s |

### 2.2 Flux enrichi (optionnel, entre les rallyes ou post-match)

Après le clic "Point", le scouter PEUT (mais n'est pas obligé) ajouter des infos avant le rallye suivant. L'interface affiche brièvement des boutons contextuels :

```
Point marqué par ÉQUIPE A ! (18-14, Set 2)
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Comment le point a été marqué ?     [SKIP →]       │
│                                                     │
│  [🏐 Attaque]  [🧱 Block]  [🎯 Ace]  [❌ Faute]    │
│                                                     │
│  Qui ? (optionnel)                                  │
│  [#1] [#2] [#5] [#7] [#8] [#12] [#14]             │
│                                                     │
│  Zone ? (optionnel)                                 │
│  ┌─────┬─────┬─────┐                               │
│  │  4  │  3  │  2  │                               │
│  ├─────┼─────┼─────┤                               │
│  │  5  │  6  │  1  │                               │
│  └─────┴─────┴─────┘                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Le SKIP est toujours disponible** — si le rallye suivant commence, les infos optionnelles sont abandonnées et on revient au mode minimal.

---

## 3. Interface de scouting — Écran principal

### 3.1 Layout tablette/téléphone (mode paysage)

```
┌─────────────────────────────────────────────────────────────────────┐
│  VolleyVision Scout          Set 2  |  12:34  |  📹 Synchro: ON    │
├──────────────────────┬──────────────┬───────────────────────────────┤
│                      │              │                               │
│    PÔLE ESPOIR       │    18 - 14   │      ADVERSAIRE              │
│                      │              │                               │
│   Sets: ██░░░        │    Set 2     │      Sets: █░░░░             │
│          2           │              │             1                 │
│                      │              │                               │
├──────────────────────┴──────────────┴───────────────────────────────┤
│                                                                     │
│                    ÉTAT: EN ATTENTE DU SERVICE                      │
│                                                                     │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐    │
│  │                         │    │                             │    │
│  │    🏐 SERVICE           │    │    🏐 SERVICE               │    │
│  │    PÔLE ESPOIR          │    │    ADVERSAIRE               │    │
│  │                         │    │                             │    │
│  │    (gros bouton)        │    │    (gros bouton)            │    │
│  │                         │    │                             │    │
│  └─────────────────────────┘    └─────────────────────────────┘    │
│                                                                     │
│  [↩ UNDO]                                      [⏸ Pause/Timeout]   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Dernier rallye: Sideout PÔLE ESPOIR - Attaque #7 Zone 4 (6.2s)   │
│  Série service adversaire: 3 | Rotation Pôle: P2                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Après clic "Service" → écran change

```
┌─────────────────────────────────────────────────────────────────────┐
│  VolleyVision Scout          Set 2  |  12:34  |  📹 Synchro: ON    │
├──────────────────────┬──────────────┬───────────────────────────────┤
│    PÔLE ESPOIR       │    18 - 14   │      ADVERSAIRE              │
│    Sets: 2           │    Set 2     │      Sets: 1                 │
├──────────────────────┴──────────────┴───────────────────────────────┤
│                                                                     │
│          ⏱ RALLYE EN COURS  (service: ADVERSAIRE)  3.2s            │
│                                                                     │
│  ┌─────────────────────────┐    ┌─────────────────────────────┐    │
│  │                         │    │                             │    │
│  │   ✅ POINT              │    │   ✅ POINT                  │    │
│  │   PÔLE ESPOIR           │    │   ADVERSAIRE                │    │
│  │                         │    │                             │    │
│  │   (gros bouton VERT)    │    │   (gros bouton ROUGE)       │    │
│  │                         │    │                             │    │
│  └─────────────────────────┘    └─────────────────────────────┘    │
│                                                                     │
│  [↩ ANNULER SERVICE]                           [⏸ Pause/Timeout]   │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Barre de contexte rapide (optionnel, post-rallye)                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 Le panneau d'enrichissement optionnel (slide-up après point)

Ce panneau remonte **pendant 4 secondes** après validation du point, puis se referme automatiquement si aucune action. Le scouter peut aussi le fermer manuellement.

```
┌─────────────────────────────────────────────────────────────────────┐
│  Point: PÔLE ESPOIR  (Sideout) → 19-14                            │
│                                                                     │
│  Action finale ?                                                    │
│  [🏐ATK] [🧱BLK] [🎯ACE] [❌FAUTE ADV] [📤FREE] [SKIP→]          │
│                                                                     │
│  Joueuse ? (numéros du 6 de départ + libéro)                      │
│  [1] [4] [5] [7] [8] [12] [L:3]                                   │
│                                                                     │
│  Zone de départ ?              Zone d'arrivée ?                    │
│  ┌────┬────┬────┐              ┌────┬────┬────┐                    │
│  │ 4  │ 3  │ 2  │              │ 4  │ 3  │ 2  │                    │
│  ├────┼────┼────┤              ├────┼────┼────┤                    │
│  │ 5  │ 6  │ 1  │              │ 5  │ 6  │ 1  │                    │
│  └────┴────┴────┘              └────┴────┴────┘                    │
│                                                                     │
│  Qualité réception ? (si sideout)                                  │
│  [# Parfaite] [+ Bonne] [! OK] [- Mauvaise] [= Erreur]           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Synchronisation vidéo

### 4.1 Le principe

Le scouter appuie sur **"Synchro"** au moment précis où il voit le 1er service du match. Cela établit un **T0 commun** entre la vidéo et le scouting.

```
Timeline vidéo :  00:00 ─── 02:45 ─── 02:52 ─── 03:18 ─── ...
                           │ 1er serv  │        │ point
                           │ 1er serv  │           │
                           │           │           │
                           T0          T0+7s       T0+33s

Timeline scout :           ⏱ Synchro!  ① Service   ② Point
                           t=0         t=7.0       t=33.2
```

### 4.2 Exploitation post-match

Avec chaque rallye timestampé, on peut générer automatiquement :

```javascript
// Pour chaque rallye
const rallyeClip = {
  videoStart: rallyeTimestamp_service - 3,  // 3s avant le service
  videoEnd: rallyeTimestamp_point + 2,      // 2s après le point
  duration: rallyeTimestamp_point - rallyeTimestamp_service,
  metadata: {
    set: 2,
    score: "18-14",
    servingTeam: "away",
    pointTeam: "home", 
    phase: "sideout",
    rotation: "P2",
    // données enrichies (si saisies)
    skill: "attack",
    player: 7,
    zone: 4,
    receptionQuality: "+"
  }
};
```

**Ce que ça permet** :
- Playlist automatique de TOUS les rallyes du match
- Filtrer : "Montre-moi tous les sideouts en rotation P2"
- Filtrer : "Tous les points de la joueuse #7"
- Filtrer : "Toutes les séries de service >3 points"
- Filtrer : "Tous les rallyes >10 secondes"
- Export pour la séance vidéo du lundi

### 4.3 Intégration avec le système de streaming existant

Tu as déjà `interface-chaine-pole` avec OBS/YouTube. Le scout peut tourner **en parallèle** :

```
Tablette 1 : Parent filme + FDME officielle (obligatoire)
Tablette 2 : Assistant/coach utilise VolleyVision Scout
PC :         OBS + overlay score (interface-chaine-pole)

Firebase relie tout :
├── interface-chaine-pole/matches/{matchId}/score  → overlay OBS
└── volleyvision-scout/matches/{matchId}/rallyes   → données scouting
```

**Option bonus** : Le score dans VolleyVision Scout peut ALIMENTER automatiquement le scoreboard de l'interface-chaine-pole. Un seul clic = score mis à jour sur le stream ET rallye enregistré.

---

## 5. Structure de données Firebase

### 5.1 Match

```javascript
// volleyvision-scout/matches/{matchId}
{
  // Métadonnées
  id: "match_2026-02-15_pole-vs-rennes",
  date: "2026-02-15T14:30:00",
  competition: "championnat",        // "championnat" | "coupe_france"
  category: "U18F",
  
  // Équipes
  homeTeam: {
    name: "Pôle Espoir Sablé",
    shortName: "PÔLE",
    color: "#1E3A8A",
    roster: [
      { number: 1, name: "Emma D.", role: "setter", isStarter: true },
      { number: 4, name: "Léa M.", role: "outside", isStarter: true },
      { number: 5, name: "Manon R.", role: "middle", isStarter: true },
      { number: 7, name: "Chloé B.", role: "opposite", isStarter: true },
      { number: 8, name: "Sarah L.", role: "outside", isStarter: true },
      { number: 12, name: "Julie K.", role: "middle", isStarter: true },
      { number: 3, name: "Inès P.", role: "libero", isLibero: true },
      // ... remplaçantes
    ],
    startingLineup: {
      P1: 1, P2: 4, P3: 5, P4: 7, P5: 8, P6: 12, L: 3
    }
  },
  awayTeam: {
    name: "Rennes VB",
    shortName: "RVB",
    color: "#DC2626",
    roster: [
      // Si connu, sinon juste les numéros observés pendant le match
    ]
  },
  
  // Synchro vidéo
  videoSync: {
    videoSource: "youtube",          // "youtube" | "local" | "obs"
    videoUrl: "https://youtube.com/live/abc123",
    syncTimestamp: 1708005045.000,   // Unix timestamp du T0 (1er sifflet)
    syncVideoTime: 165.0,           // Temps vidéo en secondes au moment du T0
  },
  
  // État du match
  status: "in_progress",            // "setup" | "in_progress" | "finished"
  currentSet: 2,
  score: {
    sets: { home: 2, away: 1 },
    currentSetPoints: { home: 18, away: 14 },
    setHistory: [
      { set: 1, home: 25, away: 19, winner: "home" },
      { set: 2, home: 22, away: 25, winner: "away" },
      { set: 3, home: 25, away: 17, winner: "home" },
    ]
  },
  
  // Stats calculées en temps réel
  liveStats: {
    sideoutRate: { home: 0.52, away: 0.44 },
    currentServeRun: { team: "home", length: 3 },
    longestRally: { duration: 18.4, rallyeId: "r_042" },
    rotationPoints: {
      home: { P1: 5, P2: 8, P3: 4, P4: 6, P5: 7, P6: 3 },
      away: { P1: 4, P2: 5, P3: 6, P4: 3, P5: 7, P6: 4 }
    }
  },
  
  createdAt: "2026-02-15T13:00:00Z",
  updatedAt: "2026-02-15T15:23:45Z",
  scoutedBy: "Olivier"
}
```

### 5.2 Rallyes (sous-collection)

```javascript
// volleyvision-scout/matches/{matchId}/rallyes/{rallyeId}
{
  id: "r_042",
  index: 42,                        // Numéro séquentiel du rallye
  
  // Temps
  timestampService: 1708005892.345, // Unix timestamp absolu
  timestampPoint: 1708005899.123,   // Unix timestamp absolu
  videoTimeService: 847.345,        // Temps vidéo (secondes depuis début)
  videoTimePoint: 854.123,          // Temps vidéo
  duration: 6.778,                  // Durée du rallye en secondes
  
  // Résultat (obligatoire - 2 clics)
  set: 2,
  servingTeam: "away",              // "home" | "away"
  pointTeam: "home",                // "home" | "away"
  phase: "sideout",                 // "sideout" | "breakpoint" (calculé)
  scoreAfter: { home: 19, away: 14 },
  
  // Rotations (calculées automatiquement)
  homeRotation: 2,                  // Position du passeur (P1-P6)
  awayRotation: 5,
  
  // Enrichissement optionnel (niveau 1 : action finale)
  finalAction: {
    skill: "attack",                // "attack"|"block"|"ace"|"fault"|"freeball"
    team: "home",                   // Qui a réalisé l'action
    player: 7,                      // Numéro du joueur
    startZone: 4,                   // Zone 1-9
    endZone: 1,                     // Zone 1-9 (où le ballon atterrit)
  },
  
  // Enrichissement optionnel (niveau 2 : qualité réception)
  reception: {
    player: 8,                      // Numéro du réceptionneur
    quality: "+",                   // "#"|"+"|"!"|"-"|"/"|"="
    zone: 5,                        // Où la réception a eu lieu
  },
  
  // Enrichissement optionnel (niveau 3 : détail passe)
  setting: {
    player: 1,                      // Passeur
    attackCombo: "V5",              // Code combo d'attaque (format DVW)
  },
  
  // Métadonnées
  enrichedLive: true,               // false = enrichi en post-match
  createdAt: "2026-02-15T15:18:12Z",
}
```

### 5.3 Événements hors-rallye

```javascript
// volleyvision-scout/matches/{matchId}/events/{eventId}
{
  id: "evt_003",
  timestamp: 1708005920.000,
  videoTime: 875.0,
  type: "timeout",                  // "timeout"|"substitution"|"challenge"
                                    // |"injury"|"setEnd"|"sanctions"|"note"
  team: "away",
  details: {
    // Pour substitution:
    playerIn: 15,
    playerOut: 8,
    // Pour note coach:
    text: "Adversaire change de stratégie service zone 1"
  }
}
```

---

## 6. Modes d'utilisation

### Mode 1 : "Chrono" — Minimum absolu (1 personne, smartphone)

**Quand** : Match mineur, personne disponible pour scouter en détail.

| Action | Clics | Données |
|--------|-------|---------|
| Service équipe A ou B | 1 clic | Timestamp + qui sert |
| Point équipe A ou B | 1 clic | Timestamp + score |
| **Total par rallye** | **2 clics** | Score, rotations, phases, durées, vidéo |

**Résultat** : Tu obtiens déjà le score, les rotations, le taux de sideout, les séries de service, et surtout les **clips vidéo de chaque rallye** parfaitement découpés.

### Mode 2 : "Coach" — Enrichi en temps réel (1 personne, tablette)

**Quand** : Match important, un assistant peut scouter.

| Action | Clics | Données |
|--------|-------|---------|
| Service | 1 clic | Idem mode 1 |
| Point | 1 clic | Idem mode 1 |
| Action finale (optionnel) | 1-3 clics | Skill + joueur + zone |
| **Total par rallye** | **2-5 clics** | Tout mode 1 + stats individuelles |

**Résultat** : Mode 1 + stats d'attaque/block/ace par joueuse, heatmaps de zones.

### Mode 3 : "Analyse" — Enrichissement post-match (après le match, devant la vidéo)

**Quand** : Match clé, tu veux une analyse complète.

Le coach ouvre VolleyVision Scout en mode relecture, la vidéo se cale automatiquement sur chaque rallye grâce aux timestamps. Il peut alors ajouter :

| Donnée | Description |
|--------|-------------|
| Qualité de réception | #, +, !, -, =  pour chaque rallye côté réception |
| Combinaison d'attaque | V5, X1, XP, etc. (codes DVW) |
| Zones précises | Départ et arrivée de chaque action |
| Notes | Commentaires texte sur les rallyes importants |

**Résultat** : Données quasi-équivalentes à un DataVolley, obtenues à ton rythme.

---

## 7. Fonctionnalités dérivées

### 7.1 Découpe vidéo automatique

```
┌─────────────────────────────────────────────────────────────────┐
│  📹 Playlist Match — Pôle vs Rennes (15/02/2026)               │
│                                                                 │
│  Filtres : [Tous] [Sideout] [Break] [Ace] [Block]             │
│            [Joueuse: ▼ Toutes] [Set: ▼ Tous] [Rotation: ▼]   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ▶ R#01  S1  0-0   Sideout PÔLE   ATK #7 Z4   4.2s     │   │
│  │ ▶ R#02  S1  1-0   Break PÔLE     ACE #1       2.1s     │   │
│  │ ▶ R#03  S1  2-0   Break PÔLE     ATK #4 Z2   8.7s     │   │
│  │ ▶ R#04  S1  2-1   Sideout ADV    Faute PÔLE   5.3s     │   │
│  │ ...                                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [📤 Exporter playlist sélection]  [📊 Stats de la sélection]  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Dashboard stats post-match

```
Match: Pôle 3-1 Rennes | 15/02/2026

SYNTHÈSE GLOBALE
────────────────────────────────────
                    PÔLE    RENNES
Taux sideout        54%      42%
Points en break     31       22
Plus long run       8 pts    4 pts
Rallye moyen        5.8s     5.8s
Aces                7        3
Blocks gagnants     5        2

PAR ROTATION (Pôle)
────────────────────────────────────
         Sideout%   Break%   Total pts
P1 (S)    60%        -         8
P2        50%       33%       12
P3        44%       40%       10
P4        67%       25%       11
P5        50%       50%       14
P6        40%       20%        7

TOP JOUEUSES (si enrichi)
────────────────────────────────────
#7  Chloé B.   12 kills, 2 errors, 55% eff
#4  Léa M.      8 kills, 1 error, 64% eff
#1  Emma D.     5 aces
```

### 7.3 🔥 Intégration RPE Gen2 (ton avantage unique)

Après le match, les données scout sont **automatiquement liées** au profil de chaque joueuse dans RPE Gen2 :

```
Joueuse: Chloé B. (#7) — Profil intégré
────────────────────────────────────────────────
📊 Performance match:  12 kills, 2 errors, 55% efficacité
💪 RPE post-match:     7/10 (charge élevée)
🔄 Phase cycle:        Phase lutéale (jour 22)
📈 CTL actuelle:       68 (charge chronique modérée)
📉 TSB:               -12 (fatigue accumulée)

⚠️  INSIGHT: Chloé performe à 55% malgré un TSB négatif 
    et une phase lutéale avancée. Performance remarquable 
    à surveiller pour éviter le surmenage.
    
    Recommandation: Allégement du volume d'entraînement 
    les 2 prochains jours.
```

---

## 8. Intégration avec l'écosystème existant

```
┌──────────────────────────────────────────────────────┐
│                    FIREBASE                          │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  RPE Gen2   │  │ VolleyVision │  │ Interface  │ │
│  │             │  │   Scout      │  │ Chaîne     │ │
│  │ • Check-ins │  │              │  │ Pôle       │ │
│  │ • RPE       │  │ • Rallyes    │  │            │ │
│  │ • Cycles    │  │ • Stats      │  │ • Score    │ │
│  │ • ATL/CTL   │  │ • Vidéo sync │  │ • Overlay  │ │
│  │ • Stickers  │  │ • Heatmaps   │  │ • Sponsors │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                │                 │        │
│         └────────────────┼─────────────────┘        │
│                          │                          │
│              ┌───────────▼──────────┐               │
│              │   Joueuse / Match    │               │
│              │   (clé de liaison)   │               │
│              └──────────────────────┘               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Flux concret le jour du match :**

1. **Avant** : Le match est créé dans VolleyVision Scout (équipes, roster, type compétition)
2. **Pendant** :
   - Tablette 1 : FDME officielle (marqueur)
   - Tablette 2 : VolleyVision Scout (assistant coach) → le score alimente aussi l'overlay OBS
   - Smartphone : Parent filme via YouTube Live
3. **Après** :
   - La joueuse remplit son RPE dans RPE Gen2
   - Le coach enrichit les rallyes en rejouant la vidéo
   - Le dashboard croise performance match + état physique + cycle

---

## 9. Export DVW

VolleyVision Scout peut **exporter en format .dvw** pour compatibilité avec l'écosystème existant :

```javascript
// Conversion rallye VolleyVision → ligne scout DVW
function rallyeToDVW(rallye, match) {
  // Le code scout minimal
  // Exemple: *07A#H4C  = Équipe domicile, joueuse 7, Attaque, Kill, High, Zone 4
  
  const teamCode = rallye.finalAction.team === 'home' ? '*' : 'a';
  const playerNum = String(rallye.finalAction.player).padStart(2, '0');
  const skillCode = SKILL_TO_DVW[rallye.finalAction.skill];  // attack→A, block→B, etc.
  const evalCode = rallye.pointTeam === rallye.finalAction.team ? '#' : '=';
  
  return `${teamCode}${playerNum}${skillCode}${evalCode}`;
}
```

Cela permet d'importer les données VolleyVision dans n'importe quel outil compatible DVW (openvolley, VolleyStation, etc.).

---

## 10. Stack technique recommandée

| Composant | Technologie | Pourquoi |
|-----------|-------------|----------|
| Frontend | Vanilla JS + HTML/CSS | Cohérent avec tes autres projets |
| Base de données | Firebase Realtime DB | Temps réel pour le score live |
| Hosting | Firebase Hosting | Déjà en place |
| Vidéo | YouTube Live API / fichier local | Pas de réinvention |
| Graphiques | Chart.js | Déjà utilisé dans RPE Gen2 |
| Terrain SVG | Custom SVG interactif | Pour les heatmaps et zones |
| Export DVW | JavaScript pur | Parser/writer maison |
| PWA | Service Worker | Offline-first pour les gymnases sans WiFi |

### Estimation de développement

| Phase | Effort | Livrable |
|-------|--------|----------|
| **MVP (Mode Chrono)** | 2-3 semaines | Service + Point + Score + Timestamps |
| **Mode Coach** | +2 semaines | Enrichissement optionnel en temps réel |
| **Synchro vidéo** | +1 semaine | Playlist de rallyes, lecteur intégré |
| **Dashboard stats** | +2 semaines | Stats post-match, graphiques |
| **Mode Analyse** | +1 semaine | Enrichissement post-match via vidéo |
| **Intégration RPE** | +1 semaine | Liaison avec RPE Gen2 |
| **Export DVW** | +1 semaine | Compatibilité format DataVolley |
| **TOTAL** | ~10-12 semaines | Application complète |

Le MVP (Mode Chrono) est jouable en 2-3 semaines et apporte déjà 80% de la valeur !

---

*Proposition pour Olivier — Pôle Espoir Volleyball Sablé-sur-Sarthe*
*VolleyVision Scout — Février 2026*
