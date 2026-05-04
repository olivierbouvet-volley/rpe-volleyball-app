# Handoff: RPE Gen2 — Refonte ARENA (App Mobile Joueuses)

## Overview

Refonte visuelle complète de l'app mobile **RPE Gen2** (PWA Firebase) destinée aux joueuses de volley. Le but de ce handoff est de migrer l'app actuelle (HTML/CSS/JS vanilla servi via Firebase Hosting) vers la nouvelle direction artistique **ARENA** : esthétique sportive, terminal/neo-brutaliste, fond sombre + accent néon vert (#C8FF00), typographie monospace pour la data, Inter pour le contenu.

L'app couvre **6 modules** que la joueuse utilise quotidiennement :
1. **Check-in** quotidien (vitals, douleurs, cycle menstruel)
2. **Log RPE** (déclaration de séance avec effort 0-10)
3. **Mes Stats** (graphiques cycle × performance, charge ATL/CTL)
4. **PPhys** (préparation physique, 1RM, calculateur)
5. **Match** (récap weekend)
6. **Album** (stickers de réussites — cartes à collectionner)

## About the Design Files

> ⚠️ **Important** : les fichiers `.jsx` et `.html` de ce bundle sont des **maquettes de référence** réalisées en React/JSX inline (Babel-in-browser) pour itérer rapidement sur le visuel. **Ne les copie pas tels quels dans la prod.**
>
> La stack cible est **HTML/CSS/JS vanilla, sans bundler ni framework**, servie statiquement par Firebase Hosting (cf. `app.js`, fichiers dans `public/`). Ta tâche : **recréer le rendu de ces maquettes en utilisant les patterns existants du codebase** (DOM API, fetch, Firestore SDK web v9 modular). Si tu juges utile d'introduire un mini-runtime (template literals tagged, Web Components, `<template>` natifs), reste compatible avec le servi statique — pas de Vite/Webpack.

## Fidelity

**Hi-fi** — Les maquettes sont pixel-perfect : couleurs, typographies, espacements, et états sont finaux. Reproduis exactement les valeurs du fichier `02-tokens/arenatheme.css`, qui est **la source de vérité** pour le design system. Toutes les valeurs hex, tailles, et radius doivent matcher.

---

## Stack cible (rappel)

| Couche | Techno |
|---|---|
| Frontend | HTML/CSS/JS vanilla, PWA (manifest + SW) |
| Hosting | Firebase Hosting |
| DB | Firestore (`players`, `checkins`, `rpe`, `fcmTokens`) |
| Storage | Firebase Storage (`players/{playerId}/`) |
| Backend | Cloud Functions Gen 1, Node 20, `europe-west1` |
| Auth | Firebase Auth anonyme |
| Push | FCM via VAPID |
| Tests | Vitest |
| Sécurité | `firestore.rules` + `storage.rules` |

**Contraintes** :
- Pas de bundler. Tout doit fonctionner servi tel quel.
- TypeScript présent en config (`tsconfig.base.json`) mais pas activé en runtime → reste en JS.
- Mobile-first, viewport 390px de référence (iPhone 14).

---

## Design Tokens

**Source de vérité** : `02-tokens/arenatheme.css`. Importe-le tel quel dans `public/index.html` :

```html
<link rel="stylesheet" href="/arenatheme.css">
```

### Couleurs (hex)

| Token | Hex | Usage |
|---|---|---|
| `--arena-bg` | `#0A0E14` | Fond principal |
| `--arena-bg2` | `#0F141C` | Fond secondaire |
| `--arena-surface` | `#11161F` | Cartes |
| `--arena-surface2` | `#131923` | Inputs |
| `--arena-border` | `#1A1F2A` | Bordures par défaut |
| `--arena-border-soft` | `#222938` | Séparateurs |
| `--arena-text` | `#E8EAED` | Texte principal |
| `--arena-text-dim` | `#9CA3AF` | Texte secondaire |
| `--arena-text-muted` | `#6B7280` | Labels mono |
| `--arena-text-faint` | `#4B5563` | Désactivé |
| `--arena-neon` | `#C8FF00` | **Accent primaire** (vert néon) |
| `--arena-pink` | `#FF2E97` | Cycle menstruel, alertes |
| `--arena-blue` | `#00D9FF` | Stats secondaires, CTL |
| `--arena-amber` | `#FFB627` | Warnings, ATL |
| `--arena-ok` | `#10C57E` | Validation |
| `--arena-bad` | `#FF5252` | Douleurs, danger |

### Typographie

- **`Inter`** (400 / 500 / 600 / 700 / 800 / 900) — corps, titres
- **`JetBrains Mono`** (400 / 600 / 700 / 800) — labels, chiffres, data, mono

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700;800&display=swap" rel="stylesheet">
```

### Échelle d'espacement

Multiples de 4 : `4 / 6 / 8 / 10 / 12 / 14 / 16 / 20 / 24 / 32`. Padding cartes : `14px`. Gap entre cartes : `10px`. Padding écran : `16px`.

### Border-radius

- `2-4px` — petits éléments (badges, segments)
- `6px` — boutons standard, inputs
- `8-10px` — cartes
- `999px` — pills

### Shadows

- Cartes : pas d'ombre, juste bordure 1px
- Bouton primaire : `0 0 24px rgba(200, 255, 0, 0.25)` (glow néon)
- Modal sticker : `0 30px 60px rgba(0,0,0,0.6), 0 0 60px <accent>40`

---

## Composants partagés

Le fichier `01-prototype/arena-shared.jsx` définit les primitives. Voici la spec à reproduire en vanilla JS (functions qui retournent un `HTMLElement` ou template literal) :

### `StatusBar()`
Barre statut iOS factice. **À supprimer en prod** — la PWA utilise la vraie barre système.

### `ArenaHeader({ section, title, right })`
- Padding `8px 20px 14px`, `border-bottom: 1px solid var(--arena-border)`
- `section` : label mono, 10px, letter-spacing 2, `color: var(--arena-neon)`, préfixé `// `
- `title` : Inter, 24px, weight 800, letter-spacing -0.5
- `right` : zone optionnelle (badge LIVE, streak, etc.)

### `ArenaTabBar({ activeTab, onChange })`
- 6 onglets : `checkin`, `rpe`, `stats`, `pphys`, `match`, `album`
- Position fixe en bas, `background: rgba(10,14,20,0.95)`, `backdrop-filter: blur(12px)`
- Onglet actif : `color: var(--arena-neon)` + barre 28×2px néon au-dessus
- Padding `10px 8px 22px` (le 22 du bas = safe-area)

### `ArenaCard({ accent })`
- `background: var(--arena-surface)`, `border-radius: 10px`, `padding: 14px`
- Bordure : `1px solid <accent>40` si accent fourni, sinon `var(--arena-border)`
- Margin-bottom 10px

### `MonoLabel({ color })`
- `font-family: JetBrains Mono`, 10px, letter-spacing 1.5, uppercase
- `color: <color> || var(--arena-text-muted)`
- Préfixe convention : `// LABEL` ou `▸ LABEL`

### `SegScale({ value, onChange, max=10, color })`
- 10 segments cliquables, `flex: 1` chacun, hauteur 30px, gap 3px
- Rempli : `background: <color>`, texte `#0A0E14` weight 700
- Vide : `border: 1px solid var(--arena-border)`, texte `var(--arena-text-faint)`
- Utilisé pour : sommeil/courbatures/stress/humeur/énergie, intensité douleur, symptômes

---

## Écrans

### 1. Check-in (`screen-checkin.jsx`)

**Purpose** : déclaration quotidienne — vitals, douleurs, cycle.

**Layout** (de haut en bas) :
1. `StatusBar` + `ArenaHeader` (section "DAILY_CHECKIN", title "Check-in", right = badge streak `● 12d STREAK`)
2. **Day selector** : 3 boutons segmentés `AUJD` / `J-1` / `J-2` (sélectionne le jour cible)
3. **Carte VITALS** : 5 sliders `SegScale` 0-10
   - Sommeil (couleur blue, normal) — *qualité*
   - Courbatures (couleur amber, **inversé** : bas=ok, haut=bad) — *niveau*
   - Stress (couleur pink, **inversé**) — *mental*
   - Humeur (couleur neon) — *générale*
   - Énergie (couleur neon) — *globale*
   - Chaque ligne : label gauche + valeur mono `X/10` à droite (couleur dynamique selon valeur : <=3 ok, <=6 amber, sinon bad ; inversé si flag invert)
4. **Carte DOULEURS** :
   - Toggle pleine largeur en haut : `✓ AUCUNE DOULEUR` (vert) ↔ `⚠ DOULEUR PRÉSENTE` (rouge)
   - Si douleurs en cours (de Firestore) : pour chaque, carte avec zone + jour J + dernière intensité, et 3 boutons d'état : `≈ STABLE` / `▲ PIRE` / `✓ GUÉRI`
   - Bouton dashed `+ DÉCLARER UNE NOUVELLE DOULEUR`
   - Form (révélé) : zone (select 17 options), intensité (`SegScale` 0-10 rouge), depuis (select 6 options), contexte (text 100 char)
5. **Carte CYCLE_MENSTRUEL** (collapsible, accent pink) :
   - Header collapsible avec phase calculée affichée à droite (`J3 · MENSTRUELLE` / `LUTÉALE` / `—`)
   - Grid 8 colonnes `J1...J8` (en règles, jour courant)
   - Bouton `○ NON, PAS DE RÈGLES` qui devient `● PAS DE RÈGLES`
   - Si non en règles : 3 boutons proximité `PAS ENCORE` / `J-5/J-3` / `J-2/J-1`
   - Bouton `▼ DÉTAILLER` pour révéler 7 sliders symptômes : crampes, maux de tête, fatigue, humeur, ballonnements, dos, sensibilité mammaire (chacun 0-10)
   - Score total `X/70` affiché si > 0
6. **Carte COMMENTAIRE** : textarea 150 char max
7. **Bouton VALIDER** : pleine largeur, néon, `▸ VALIDER LE CHECK-IN` → `✓ ENREGISTRÉ · STREAK +1` après submit

**Données Firestore** :
```js
checkins/{playerId}_{YYYY-MM-DD} = {
  date: timestamp,
  vitals: { sleep, aches, stress, mood, energy }, // 0-10
  pain: { none: bool, active: [{ zone, lastIntensity, status: "ok"|"worse"|"healed" }], new: { zone, intensity, daysSince, desc } | null },
  cycle: { day: 1-8 | 0 | null, proximity: "notyet"|"j5-j3"|"j2-j1"|null, symptoms: { cramps, headache, fatigue, moodSwings, bloating, backPain, breastTenderness } },
  comment: string
}
```

### 2. Log RPE (`screen-rpe.jsx`)

**Purpose** : déclarer une séance avec effort perçu.

**Layout** :
1. Header section "TRAINING_LOG", title "Log RPE"
2. Carte **TYPE D'ACTIVITÉ** : grid 2×3 boutons (Match, Entraînement collectif, Muscu, Cardio, Mobilité, Autre)
3. Carte **DURÉE** : input numérique + chips rapides `30 / 60 / 90 / 120 min`
4. Carte **RPE** : `SegScale` 0-10 grand format, label dynamique sous le slider (Repos / Très facile / Facile / Modéré / Difficile / Max)
5. Carte **CHARGE** : calcul auto `RPE × durée` affiché en gros mono
6. Bouton VALIDER

**Firestore** :
```js
rpe/{auto-id} = { playerId, date, type, durationMin, rpe, charge, comment? }
```

### 3. Mes Stats (`screen-stats.jsx`) — **écran clé**

**Purpose** : visualiser sa charge et la corrélation cycle × performance.

**Layout** :
1. Selector `7J` / `28J` / `CYCLE`
2. Carte **CHARGE D'ENTRAÎNEMENT** :
   - Stats triplet : ATL (amber), CTL (blue), A:C (couleur dynamique)
   - Statut : `OPTIMAL` / `TENDU` / `RISQUE` / `DÉSENT.`
   - Mini chart SVG : 2 lignes (ATL amber, CTL blue) + aire dégradée
3. Carte **CYCLE × PERFORMANCE** (la headline) :
   - SVG 320×180 viewBox, 3 courbes superposées :
     - **Énergie** (amber, ligne pleine 2px, aire dégradée 28%)
     - **Performance** (neon, ligne 2.5px + drop-shadow glow, aire 32%)
     - **Symptômes** (pink, ligne 1.8px **dashed 4,3**)
   - 4 bandes de fond fillOpacity 0.06 : Menstruelle (J1-5 bad), Folliculaire (J6-13 blue), Ovulation (J14-16 neon), Lutéale (J17-28 pink)
   - Étiquettes phases en haut (mono 7px), axe Y avec grille pointillée à 0/2.5/5/7.5/10, axe X J1/J7/J14/J21/J28
   - Marker `★ PIC J15` sur la courbe perf
   - Bloc INSIGHTS en bas : "Performance +X% en folliculaire vs lutéale" + "Symptômes max en J1-J3 et SPM J24-J28"
4. Carte **SYMPTÔMES · 28J** : heatmap calendaire
5. Carte **CHARGE HEBDO** : barres par jour

**Calculs** :
- ATL = moyenne mobile sur 7 jours de `charge`
- CTL = moyenne mobile sur 28 jours
- A:C = ATL/CTL ; statut : <0.8 désent., >1.5 risque, >1.3 tendu, sinon optimal

### 4. PPhys (`screen-pphys.jsx`)

**Purpose** : suivi des charges max + calculateur 1RM.

**Layout** :
- Liste de **8 exercices** (Squat, Soulevé de terre, Développé couché, Tirage, Hip thrust, Front squat, Overhead press, Rowing) avec leur 1RM en gros mono
- Pour chaque : barre de progression vers objectif + dernière séance
- Carte **CALCULATEUR 1RM** : input poids + reps → affiche 1RM estimé (formule Epley : `1RM = poids × (1 + reps/30)`)

### 5. Match (`screen-match.jsx`)

**Purpose** : récap du weekend.

**Layout** :
- Grand bloc match : adversaire, score, lieu, date
- 3-4 stats clés : aces, blocks, kills, %réception
- RPE post-match
- Carte stickers débloqués pendant le match

### 6. Album (`screen-album.jsx`)

**Purpose** : collection de stickers (gamification).

**Layout** :
1. Header section "COLLECTION_STATUS", title "Album", right = `X/48`
2. **Barre de progression 48 segments** : segments verts pour les 6 premiers, blue pour les suivants, pink pour les légendaires
3. Filtres `ALL` / `OBTENUS` / `MANQUANTS`
4. **Grid 3 colonnes de cartes à jouer** (ratio 2.5/3.5) :
   - Coin haut-gauche : `№001/048` mono
   - Coin haut-droit : badge rareté `COMMUN` / `RARE` / `LÉGEND.`
   - Fenêtre centrale (cadre `inset 26px 8px 38px 8px`) avec halo radial + scanlines + glyph emoji 38px
   - Bandeau bas dégradé : nom uppercase + date d'obtention mono
   - Liserés néon dans coins haut-gauche et bas-droit (cards obtenues uniquement)
   - Locked = "?" mono, monochrome, sans liserés
5. **Modal holographique** au clic (carte obtenue uniquement) :
   - Carte 280×380 avec effet 3D tilt (rotateX/rotateY suivant souris/touch)
   - 5 couches superposées : conic-gradient iridescent, bandes holo, noise SVG turbulent, scanlines, lueur spéculaire suivant le curseur
   - Drop-shadow néon, glyph 110px avec hue-rotate filter
   - Couleurs par rareté : commune=neon, rare=blue, légendaire=pink

**Firestore** :
```js
players/{playerId}/stickers/{stickerId} = { unlockedAt: timestamp, viewedAt? }
```

---

## Interactions & Animations

- **Hover** : pas pertinent (mobile). États tactiles : `:active` léger scale-down `0.98` ou opacity 0.7
- **Transitions** :
  - Onglets tabbar : `transition: color 150ms`
  - Sliders : `transition: all 100ms`
  - Modal sticker : `animation: scaleIn 400ms cubic-bezier(.2,.8,.2,1)` + `fadeIn 200ms`
  - Carte holo tilt : `transition: transform 120ms ease-out`
- **Live dot** (badge streak/LIVE) : pulse infinite 1.5s

---

## State Management (vanilla)

Pas de framework → utilise un store léger en module :

```js
// public/state.js
const listeners = new Set();
let state = { user: null, day: 'today', activeTab: 'checkin' };

export function getState() { return state; }
export function setState(patch) { state = { ...state, ...patch }; listeners.forEach(l => l(state)); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
```

Chaque écran s'abonne, re-rend son root via innerHTML ou patch DOM.

---

## Migration Path

1. **Étape 1** — Tokens : importe `arenatheme.css`, supprime/écrase l'ancien CSS. Vérifie que les 6 écrans existants passent en sombre sans casser.
2. **Étape 2** — Composants partagés : implémente `arenaHeader()`, `arenaTabBar()`, `arenaCard()`, `monoLabel()`, `segScale()` en JS vanilla (functions qui retournent du HTML string ou DOM).
3. **Étape 3** — Refonte écran par écran, dans cet ordre de priorité :
   1. Check-in (entry point quotidien)
   2. Album (impact visuel maximal, motivation)
   3. Stats (graphe cycle × perf)
   4. RPE
   5. PPhys
   6. Match
4. **Étape 4** — Brancher Firestore. Toutes les valeurs en dur dans les `.jsx` doivent venir de la DB.
5. **Étape 5** — PWA : vérifie que le SW met bien en cache `arenatheme.css` + fonts Google.

---

## Files

- `01-prototype/RPE Gen2 - ARENA.html` — entry point du proto, charge tous les écrans
- `01-prototype/arena-shared.jsx` — design system primitives (tokens + composants)
- `01-prototype/screen-*.jsx` — 6 écrans (checkin, rpe, stats, pphys, match, album)
- `01-prototype/ios-frame.jsx` — frame iOS factice (à ignorer en prod)
- `02-tokens/arenatheme.css` — **CSS de production**, à importer tel quel

---

## Assets

- **Fonts** : Google Fonts (Inter + JetBrains Mono) — déjà importées dans `arenatheme.css`
- **Icons** : caractères ASCII / Unicode dans le proto (`✓`, `↯`, `▦`, `≡`, `◆`, `★`, `▸`, `//`, `◐`). En prod, soit garder ce style minimaliste, soit remplacer par une icon-font (Lucide, Phosphor) si déjà présente dans le codebase.
- **Emojis stickers** : utilisés comme placeholders dans l'album (`🛡 🎯 ⚔ 🔥 💎 👑 🏋 🦵 ↻ 💥 🧱 🎪`). À remplacer par les vrais artworks fournis par le designer.
- Pas d'images bitmap dans le design system.

---

## Questions ouvertes pour le dev

- L'app utilise-t-elle déjà un système de notifications push pour les rappels de check-in ? (sinon, prévoir un FCM topic `daily-checkin-{hour}`)
- Les données de cycle existent-elles déjà côté Firestore, ou faut-il créer la sous-collection ?
- Faut-il un mode coach (lecture seule sur les checkins de plusieurs joueuses) ? Ce handoff couvre **uniquement la vue joueuse**.
