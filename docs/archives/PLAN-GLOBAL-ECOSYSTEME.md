# Plan Global — Écosystème Volleyball Pôle Sablé
*Fusion : Roadmap existante + VolleyVision Scout Proposal*
*Dernière mise à jour : Février 2026*

---

## Vision générale

Un écosystème complet pour le Pôle Espoir de Sablé-sur-Sarthe :

```
PENDANT LE MATCH           APRÈS LE MATCH            EN CONTINU
────────────────           ──────────────            ──────────
VolleyVision Scout         VolleyVision Analyse       RPE Gen2
  2 clics/rallye      →      Playlist rallyes    ←→    Check-ins
  Enrichissement opt.        Stats avancées            Cycle menstruel
  Synchro vidéo             IA Coach (Claude)          ATL/CTL/TSB
       │                          │                        │
       └──────────────────────────┴────────────────────────┘
                        Firebase (clé : joueuse + match)
```

---

## État actuel (TERMINÉ ✅)

| Projet | Statut | Fichiers |
|--------|--------|----------|
| **RPE Gen2** — Fix Rattrapage (pastilles) | ✅ Fait | `public/js/rating-badges.js` |
| **RPE Gen2** — Déploiement prod | ⚠️ En attente | `firebase login --reauth` requis |
| **VolleyVision** — attackByCombo + attackByTempo | ✅ Fait | `packages/dvw-parser/src/stats/calculator.ts` |
| **VolleyVision** — byRotation P1-P6 | ✅ Fait | `packages/dvw-parser/src/stats/calculator.ts` |
| **interface-chaine-pole** — Score live + timestamps | ✅ Existant | `scoring-system.js`, `db-service.js` |

---

## PHASE 1 — VolleyVision Scout MVP "Mode Chrono"
**Durée estimée : 2-3 semaines | Valeur : 80% de la valeur totale**

### Principe : 2 clics par rallye minimum

```
RALLYE :
  ① Clic SERVICE (qui sert ?)  →  timestamp_serve
  ② Clic POINT (qui marque ?)  →  timestamp_point

Généré automatiquement :
  - Score mis à jour
  - Rotation calculée
  - Sideout ou Breakpoint
  - Durée du rallye
  - Lien vidéo du rallye (timestamp_serve - 3s → timestamp_point + 2s)
```

### Décision d'architecture
VolleyVision Scout = **nouvelle page dans interface-chaine-pole** (`scout.html`).
Le score Scout peut alimenter l'overlay OBS de `interface-chaine-pole` → **une seule tablette** pour tout.

### Structure Firebase (nouvelle collection)

```javascript
// volleyvision-scout/matches/{matchId}/rallyes/{rallyeId}
{
  index: 42,                          // Numéro séquentiel
  set: 2,
  servingTeam: "home",                // "home" | "away"
  pointTeam: "home",                  // "home" | "away"
  phase: "sideout",                   // calculé automatiquement
  scoreAfter: { home: 19, away: 14 },
  homeRotation: 2,                    // P1-P6 calculé automatiquement
  awayRotation: 5,
  timestampService: 1708005892.345,   // Unix timestamp au clic service
  timestampPoint: 1708005899.123,     // Unix timestamp au clic point
  videoTimeService: 847.345,          // Secondes depuis T0 vidéo
  videoTimePoint: 854.123,
  duration: 6.778,                    // durée du rallye en secondes
}
```

### Tâches Phase 1

**1.1 — Création match + composition de départ** (`formulaire-scout.html`)
- Équipes (noms, couleurs)
- Roster domicile : numéro + nom + poste + libéro
- Lineup de départ : P1 à P6 pour chaque équipe
- Source vidéo : URL YouTube ou "local"
- Synchro T0 : bouton "Synchro !" au 1er sifflet

**1.2 — Interface de scouting** (`scout.html`)
- Score en-tête (comme interface-parent.html)
- État "EN ATTENTE SERVICE" → 2 gros boutons "Service Domicile" / "Service Adverse"
- Après clic service → état "RALLYE EN COURS" → 2 gros boutons "Point Domicile" / "Point Adverse"
- UNDO (annuler le dernier service ou le dernier point)
- Calcul automatique rotations + sideout/breakpoint
- Bas d'écran : dernier rallye résumé + rotation courante + run de service

**1.3 — Firebase + logique scoring**
- Nouvelle collection `volleyvision-scout/matches/{matchId}/rallyes`
- Calcul rotation automatique via changement de service (rotation d'une position à chaque récupération)
- Option : synchroniser score avec `matches/{matchId}/score` de interface-chaine-pole

**1.4 — PWA offline-first**
- Service Worker pour fonctionner sans WiFi en gymnase
- Synchronisation Firebase quand la connexion revient

---

## PHASE 2 — Enrichissement optionnel "Mode Coach"
**Durée estimée : 2 semaines**

### Principe : panneau slide-up après chaque point

```
Après clic "Point" → panneau remonte 4 secondes :

┌─────────────────────────────────────┐
│  Point DOMICILE ! Sideout → 19-14   │
│                                      │
│  Action finale ?                     │
│  [ATK] [BLK] [ACE] [FAUTE] [SKIP→]  │
│                                      │
│  Joueuse ?  [1][4][5][7][8][12][L3] │
│                                      │
│  Zone ? ┌──┬──┬──┐                  │
│         │4 │3 │2 │                  │
│         ├──┼──┼──┤                  │
│         │5 │6 │1 │                  │
│         └──┴──┴──┘                  │
└─────────────────────────────────────┘
SKIP ou le rallye suivant commence → panneau ferme
```

### Données optionnelles ajoutées au rallye

```javascript
// Niveau 1 — Action finale (optionnel)
finalAction: {
  skill: "attack",            // "attack"|"block"|"ace"|"fault"|"freeball"
  team: "home",
  player: 7,                  // Numéro de la joueuse
  startZone: 4,               // Zone 1-9
  endZone: 1,
}

// Niveau 2 — Réception (optionnel)
reception: {
  player: 8,
  quality: "+",               // "#"|"+"|"!"|"-"|"/"|"=" (codes DVW)
  zone: 5,
}

// Niveau 3 — Passe (optionnel, si vraiment motivé)
setting: {
  player: 1,
  attackCombo: "V5",         // Code combo DVW
}
```

---

## PHASE 3 — Synchro vidéo + Playlist de rallyes
**Durée estimée : 1-2 semaines**

### 3.1 Synchro T0

```
Le scouter appuie "Synchro !" quand il voit le 1er service.
  → T0 = timestamp Unix absolu au clic
  → syncVideoTime = temps vidéo YouTube au moment du clic

Pour chaque rallye :
  videoTimeService = (timestampService - T0) + syncVideoTime
  → url YouTube = videoUrl + "?t=" + floor(videoTimeService - 3)
```

### 3.2 Playlist de rallyes filtrables

```
Filtres disponibles :
  [Tous] [Sideout] [Break] [Ace] [Block] [Faute]
  [Joueuse: ▼] [Set: ▼] [Rotation: ▼] [Durée > Xs]

Chaque rallye = lien cliquable → YouTube au bon moment
Export : [📤 Exporter sélection pour séance vidéo lundi]
```

---

## PHASE 4 — Dashboard stats + Mode Analyse post-match
**Durée estimée : 2-3 semaines**

### 4.1 Dashboard stats post-match

```
SYNTHÈSE                   PÔLE      ADV
───────────────────────────────────────
Taux sideout               54%       42%
Points en break             31        22
Plus long run              8 pts     4 pts
Aces                        7         3

PAR ROTATION (Pôle)
P1: Sideout 60%  Break  -   Total 8 pts
P2: Sideout 50%  Break 33%  Total 12 pts
P3: Sideout 44%  Break 40%  Total 10 pts
...

TOP JOUEUSES (si enrichi)
#7  Chloé  12 kills, 2 errors, 55% efficacité
#4  Léa     8 kills, 1 error, 64% efficacité
```

### 4.2 Mode Analyse (enrichissement post-match)

Après le match, le coach ouvre le match en mode relecture :
- La vidéo YouTube se cale automatiquement sur chaque rallye (via timestamps)
- Pour chaque rallye non enrichi : affiche le panneau d'enrichissement
- Ajoute qualités de réception, combos d'attaque, zones
- Résultat : données quasi DataVolley, obtenues à son rythme

### 4.3 Intégration RPE Gen2 (avantage unique)

Liaison automatique stats match ↔ profil joueuse RPE Gen2 :

```
Joueuse : Chloé (#7)
─────────────────────────────────
📊 Perf match :    12 kills, 55% efficacité
💪 RPE post-match : 7/10 (charge élevée)
🔄 Phase cycle :   Lutéale (jour 22)
📈 CTL :           68 | TSB : -12

⚠️ INSIGHT : Bonne perf malgré fatigue accumulée.
   Recommandation : allégement J+1 et J+2.
```

---

## PHASE 5 — Export DVW + Import VolleyVision
**Durée estimée : 1-2 semaines**

### Export DVW

Convertisseur Firebase → fichier .dvw téléchargeable.

```javascript
// Chaque rallye enrichi → ligne scout DVW
function rallyeToDVW(rallye) {
  const teamCode = rallye.finalAction.team === 'home' ? '*' : 'a';
  const playerNum = String(rallye.finalAction.player).padStart(2, '0');
  const skillCode = SKILL_TO_DVW[rallye.finalAction.skill];
  const evalCode = rallye.pointTeam === rallye.finalAction.team ? '#' : '=';
  return `${teamCode}${playerNum}${skillCode}${evalCode}`;
}
```

Le .dvw généré est compatible avec :
- VolleyVision (analyse avancée, déjà prêt avec les nouvelles stats)
- openvolley, VolleyStation, tout outil DVW natif

### Import VolleyVision

Le coach importe le .dvw généré dans VolleyVision pour :
- Stats par tempo (attackByTempo — déjà implémenté ✅)
- Stats par rotation P1-P6 (byRotation — déjà implémenté ✅)
- Filtres avancés multi-critères

---

## PHASE 6 — IA Coach (Claude API)
**Durée estimée : 2-3 semaines**

Interface chat intégré à VolleyVision pour interroger les données en langage naturel.

### Exemples de questions

```
"Notre rotation P3 au service est-elle vraiment forte ?"
→ Claude calcule sideout%, break%, points en P3 sur N matchs
→ Compare avec les autres rotations
→ Affiche un schéma terrain avec la composition P3

"Kelly en attaque sur balle rapide (Q), quelle est son efficacité ?"
→ Filtre attackByTempo['Q'] pour Kelly (déjà disponible ✅)
→ Compare avec son efficacité sur balles hautes (H)
→ Recommande d'enrichir X matchs supplémentaires pour données significatives

"Quelle est notre meilleure rotation pour fermer un set ?"
→ Analyse byRotation sur tous les matchs importés
→ Identifie P4 comme rotation la plus efficace avec 67% sideout
```

### Architecture

```
VolleyVision UI (React)
     │
     ▼
Claude API (tool use)
  → analyserRotation(equipe, set, rotation)
  → analyserJoueuse(nom, skill, tempo)
  → comparerMatchs(matchIds[], rotation)
     │
     ▼
Fonctions de stats (calculator.ts)
  byRotation, attackByTempo, attackByCombo
     │
     ▼
Réponse texte + schéma SVG terrain
```

---

## Ordre de priorité recommandé

```
PHASE 1 (MVP Scout)          → Démarre maintenant
    ↓
PHASE 2 (Enrichissement)     → Dans la foulée de la Phase 1
    ↓
PHASE 3 (Synchro vidéo)      → Grosse valeur ajoutée
    ↓
PHASE 4 (Dashboard + Analyse) → Analyse complète
    ↓
PHASE 5 (Export DVW)          → Ferme la boucle VolleyVision
    ↓
PHASE 6 (IA Coach)            → Couche intelligente finale
```

---

## Stack technique

| Composant | Technologie | Pourquoi |
|-----------|-------------|----------|
| VolleyVision Scout | Vanilla JS + HTML/CSS | Cohérent avec RPE Gen2 et interface-chaine-pole |
| Base de données Scout | Firebase Realtime DB | Temps réel, déjà en place dans interface-chaine-pole |
| Dashboard stats | Chart.js | Déjà dans RPE Gen2 |
| Terrain / Heatmap | SVG custom | Zones 1-9, léger et flexible |
| Export DVW | JavaScript pur | Compatible parseur existant |
| VolleyVision App | React + TypeScript + Vite | Déjà en place |
| IA Coach | Claude API (Sonnet 4.6) | Tool use pour requêtes structurées |
| PWA | Service Worker | Offline-first pour gymnases sans WiFi |

---

## Questions encore ouvertes

1. **Firebase projet Scout** : nouvelle collection dans `interface-match-en-live` ou nouveau projet Firebase ?
   → Recommandation : même projet, nouvelle collection `volleyvision-scout/` (simplifie la liaison RPE)

2. **Scout alimente interface-chaine-pole ?** : le score Scout peut synchro vers `matches/{matchId}/score`
   → Recommandation : oui, option activable dans les paramètres du match Scout

3. **Composition adverse** : saisie manuelle des numéros ou observation pendant le match ?
   → Recommandation : saisie rapide des numéros observés (pas les noms)

4. **Multi-matchs VolleyVision** : agrégation de stats sur plusieurs matchs (saison)
   → Prérequis : Phase 5 (export DVW) doit être fait d'abord

---

*Projet Pôle Espoir Volleyball Sablé-sur-Sarthe*
*Olivier Bouvet — Coach + Développeur assisté IA*
