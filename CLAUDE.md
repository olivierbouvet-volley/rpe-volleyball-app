# CLAUDE.md — rpe-volleyball-app

## Description

Ce repo contient **deux applications** :

### 1. RPE Gen2 — Suivi condition physique + cycle menstruel
Application de suivi de la condition physique et de la charge d'entraînement pour 14 joueuses de volleyball du Pôle Espoir de Sablé-sur-Sarthe. Combine le suivi RPE (Rate of Perceived Exertion) avec le suivi du cycle menstruel et la détection des risques RED-S.

### 2. VolleyVision — Parseur DVW & Stats Viewer
Outil de parsing de fichiers DVW (format DataVolley) et visualisation de statistiques volleyball avec interface modulaire et vidéo synchronisée.

---

## RPE Gen2

### Stack technique
- HTML/CSS/JavaScript vanilla (pas de framework)
- Firebase Firestore + Storage (plan Blaze)
- Chart.js pour les graphiques
- PWA installable sur les smartphones des joueuses
- Environnements : prod (`rpe-gen2-eeaee`) + dev (`rpe-volleyball-sable`)

### Architecture
```
public/
├── index.html          # Point d'entrée principal
├── js/
│   ├── app.js          # Logique principale
│   ├── app-additions.js
│   ├── app-reports.js  # Rapports et graphiques coach
│   └── config/         # Configuration Firebase prod/dev
├── css/
└── manifest/           # PWA manifest
functions/              # Cloud Functions (notifications)
firebase.json
firestore.rules
.firebaserc
```

### Fonctionnalités RPE Gen2

**Interface Joueuse :**
- Check-in quotidien (sommeil, courbatures, stress, humeur)
- Enregistrement RPE après chaque séance
- Score de préparation personnel
- Suivi du cycle menstruel (questionnaire complet)
- Streaks et stickers de gamification
- Profils hormonaux : Cyclique / Stable / Atypique

**Interface Coach :**
- Dashboard équipe avec filtres (optimal/attention/critique)
- Détails individuels par joueuse (modale avec onglets)
- Rapports et graphiques (évolution équipe, distribution charge)
- Calculs ATL / CTL / TSB (gestion fatigue)
- Alertes RED-S
- Gestion des joueuses (ajout/suppression)
- Notifications push programmées (12h check-in, 20h RPE)

**Types d'activités :** Volley, Musculation, Muscu+Volley (45min prépa + volley), Match, Autre

### Points d'attention RPE
- Authentification simplifiée (mot de passe unique "pole")
- Photos nécessitent le plan Firebase Blaze
- Gestion des périodes de repos (congés vs vacances)
- Encodage UTF-8 parfois problématique

### Prochaines évolutions RPE
- Contenu éducatif sur les phases du cycle menstruel
- Conseils personnalisés quotidiens selon la phase
- Recommandations nutritionnelles par phase
- Visualisations avancées (corrélations RPE/cycle)

---

## VolleyVision

### Stack technique
- React 18 + TypeScript + Vite
- Zustand (state management avec persist)
- Tailwind CSS (thème sombre)
- Vitest + happy-dom (90+ tests)
- react-grid-layout (drag & drop panneaux)
- pnpm workspace monorepo (3 packages)
- YouTube IFrame API

### Architecture monorepo
```
packages/
├── data-model/          # Types TypeScript + validation
├── dvw-parser/          # Parsing DVW (section-splitter, rally-builder, line-parser)
└── viewer/              # App React (VideoPlayer, Timeline, Filtres, Stats)
```

### Fonctionnalités VolleyVision
- Import drag & drop de fichiers DVW
- 5 panneaux modulaires : Vidéo, Calibration, Timeline, Filtres, Stats
- Filtres avancés multi-critères (joueur, action, qualité, équipe)
- Navigation vidéo synchronisée avec les actions
- Stats : efficacité attaque/service/réception, individuelles et équipe
- 90+ tests unitaires

### Problème connu VolleyVision
- ⚠️ CSS import error : `react-grid-layout/css/resizable.css`
