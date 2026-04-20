# 🎯 HANDOFF CLAUDE CODE — Projet VolleyAnalytics + Sécurisation RPE Gen2

> **À LIRE EN PREMIER PAR CLAUDE CODE.**
> Ce document résume une session de conseil stratégique avec Claude Opus 4.7 (avril 2026).
> Il contient le contexte produit, l'état technique actuel, et les actions immédiates à exécuter.

---

## 1. CONTEXTE FONDATEUR

**Olivier Bouvet** — Coach au Pôle Espoir Volleyball de Sablé-sur-Sarthe (France).
- Travaille avec des athlètes féminines de 15-19 ans
- Contrat coach actuel jusqu'en juin 2026 (transition à anticiper)
- Développeur "non-pro" qui maîtrise les outils IA et délègue l'implémentation
- IDE : VS Code + Claude Code (mode opusplan) + Cursor
- Stack favorite : React 19 + TS + Vite + Firebase + Tailwind 4

**Important** : Olivier est à privilégier sur la **clarté méthodologique** et la **discipline d'exécution** plutôt que sur la quantité de code produit. Il a tendance à ouvrir trop de chantiers en parallèle.

---

## 2. STRATÉGIE PRODUIT VALIDÉE — VolleyAnalytics

### Positionnement
> **"L'analyse volley que tous les entraîneurs peuvent se payer."**
> Le Datavolley accessible pour les clubs Nationale 2, Nationale 3, Pré-national et clubs régionaux français.

### Marché cible
- ~1200-1500 clubs français mal servis (entre Excel gratuit et Datavolley à 650€)
- Concurrents : Datavolley (cher, vieillot), Hudl/Balltime (USD, NCAA-focus), AthleteMonitoring (générique non-FR)
- Aucun acteur français crédible sur ce créneau

### Roadmap produit en 3 phases

**Phase 1 (Mois 1-6)** — MVP "DVW Cloud"
- Import fichiers DVW + parsing
- Visualisations (rotations, zones, attaques par poste)
- Export PDF post-match
- Tarif Starter : **19€/mois/club**

**Phase 2 (Mois 6-12)** — "Scouting Live"
- Saisie temps réel sur tablette/mobile (multi-rôles : Animator, Parent, Expert, Adjoint)
- Génération automatique fichier DVW
- Tarif Pro : **29€/mois/club**

**Phase 3 (Mois 12-18)** — "Module Performance"
- Suivi RPE / cycle menstruel / wellness (porté de RPE Gen2)
- Tableau bord coach avec ATL/CTL/TSB
- Alertes RED-S
- Tarif Performance : **49€/mois/club**

### Objectif business
- 18 mois → 40-60 clubs payants → CA 1500-3000€/mois
- SASU à créer avant le 1er client payant (pas micro-entreprise)

---

## 3. ARCHITECTURE DE L'ÉCOSYSTÈME

5 repos audités, voici leur rôle dans VolleyAnalytics :

| Repo | Rôle | Action |
|---|---|---|
| **Volley Pulse** (React 19 + TS) | ✅ **Cœur produit VolleyAnalytics** | À renommer + enrichir |
| **RPE Gen2** (JS vanilla, prod 14 athlètes) | ⚠️ À sécuriser puis migrer en Module Performance | Sécurité urgente, refonte progressive |
| **Interface Pôle** (HTML/JS) | ⚠️ À fusionner avec Volley Pulse (mêmes données Firebase) | Migrer features utiles puis archiver |
| **Volleyball Tracking** (Python YOLO) | ❌ **Ne PAS intégrer** (GPL-v3 + AGPL Ultralytics) | Outil perso uniquement |
| **Mirwald** (React FFVolley) | ℹ️ Hors scope commercial | Garder isolé, clarifier PI avec FFVolley |

### Pattern d'architecture de Volley Pulse à préserver
- Architecture **multi-rôles** : Animator / Parent / Expert / Adjoint
- **Offline-first** avec queue Zustand
- Export DVW natif (`utils/dvwExporter.ts` — 417 lignes)
- Stores Zustand séparés (matchStore, scoutStore, rotationStore, offlineQueue)

---

## 4. ÉTAT ACTUEL — RPE GEN2 (PROD)

**URL prod** : https://rpe-volleyball-sable.web.app
**Projet Firebase prod** : `rpe-volleyball-sable`
**Utilisatrices actives** : 14 athlètes mineures (15-19 ans)
**Data sensible** : RPE, cycle menstruel, wellness, alertes santé → **données de santé RGPD article 9**

### Sécurité — Ce qui a déjà été fait ✅
- [x] Clé API Gemini exposée révoquée et régénérée (stockée hors repo)
- [x] Backup Firestore réalisé (bucket Cloud Storage)
- [x] Firebase Auth anonyme **activée** dans la console
- [x] Fichier `firebase-auth-helper.js` **créé** dans `public/js/config/`
- [x] Règles Firestore strictes **rédigées** dans `firestore.rules` (pas encore déployées)

### Sécurité — Ce qui reste à faire ❌

**ÉTAPE 1 — Inclure le helper dans `index.html`**

Ouvrir `public/index.html`, trouver la ligne :
```html
<script src="/js/config/firebase-loader.js"></script>
```

Ajouter **juste après** :
```html
<script src="/js/config/firebase-auth-helper.js"></script>
```

**ÉTAPE 2 — Adapter `app.js` pour attendre l'auth avant Firestore**

Trouver la fonction d'initialisation principale dans `public/js/app.js` (probablement `initApp()` ou équivalent).
Englober les premiers appels Firestore dans `await window.waitForAuth()`.

Pattern attendu :
```javascript
async function initApp() {
  try {
    await window.waitForAuth();
    console.log('✅ Auth prête, chargement des données');
    loadPlayers();
    loadRecentCheckins();
    // ... reste de l'init
  } catch (error) {
    console.error('❌ Impossible d\'initialiser l\'app:', error);
  }
}
```

**ÉTAPE 3 — Tester en local**
```bash
firebase serve --project rpe-volleyball-sable
```
Vérifier dans la console navigateur l'apparition de :
```
[Auth] Connexion anonyme en cours...
[Auth] Connexion anonyme reussie: <UID>
```

**ÉTAPE 4 — Déployer**
```bash
firebase deploy --only hosting --project rpe-volleyball-sable
```

**ÉTAPE 5 — SEULEMENT APRÈS confirmation que l'app fonctionne en prod, déployer les règles strictes**
```bash
firebase deploy --only firestore:rules --project rpe-volleyball-sable
```

⚠️ **Ordre impératif. Si les règles strictes sont déployées avant l'auth, l'app casse pour les 14 athlètes.**

### Bug préexistant à signaler (NON bloquant)
Le module `cycle-detection-module.js` cherche `checkInForm` qui n'existe que sur la vue **joueuse**, pas sur la vue **coach**. Génère 20 logs de retry à chaque chargement de la vue coach. À corriger dans une session ultérieure.

### Particularité de structure
Le ZIP audité contient **deux dossiers** :
- `/` (racine) avec un monorepo nouveau (packages dvw-parser, viewer, data-model)
- `/rpe-volleyball-app/` avec l'application prod actuelle

**L'application prod actuelle = celle dans `rpe-volleyball-app/`**. Le dossier racine semble être un nouveau monorepo pour VolleyAnalytics. À clarifier avec Olivier avant toute modification de la racine.

---

## 5. ALERTES SÉCURITÉ — TOUS PROJETS

### Pattern récurrent à corriger
**4 projets sur 5** ont des règles Firestore `allow read, write: if true`.
**Règle d'or** : aucun nouveau projet ne démarre avec `if true`. Par défaut `if false`, puis ouvrir explicitement.

### Authentification factice à remplacer (RPE Gen2)
Mots de passe hardcodés dans `app.js` :
```javascript
'olivier': 'pole', 'alexis': 'pole', 'coach': 'pole'
```
Toute joueuse peut les voir via DevTools. À remplacer par Firebase Auth email/password en V2.

---

## 6. WORKFLOW DE TRAVAIL RECOMMANDÉ

### Discipline workspace VS Code
**Un seul projet ouvert à la fois**. Les hallucinations de Claude Code viennent de workspaces multi-projets.

Action : créer un workspace dédié `volleyanalytics` ne contenant QUE Volley Pulse.

### Discipline fichiers .md
**Maximum 2 fichiers .md à la racine** :
- `README.md` (court, GitHub)
- `CLAUDE.md` (précis, pour Claude Code)

Tout le reste (plans, prompts, archives) → `docs/archives/`.

### Discipline Obsidian (cerveau fondateur, pas Claude Code)
Vault structuré :
```
00_Strategie/Decisions_journal.md
01_Produit/Roadmap_12mois.md
02_Clients/Interviews_coachs/
03_Tech_Journal/
04_Veille/
05_Business/Compliance_RGPD_notes.md
```

Les fichiers Obsidian **ne doivent PAS être lus par Claude Code**. Quand une décision stratégique est prise dans Obsidian, l'exporter manuellement vers `docs/` du projet.

---

## 7. PROCHAINES PRIORITÉS PAR ORDRE

### Cette semaine
1. **Finaliser sécurisation RPE Gen2** (étapes 1-5 ci-dessus)
2. **Créer vault Obsidian** avec structure proposée
3. **Renommer Volley Pulse → VolleyAnalytics** (local + GitHub)
4. **Archiver en read-only** sur GitHub : Volleyball Tracking, Interface Pôle, Mirwald

### Ce mois-ci (avril-mai 2026)
1. **Phase 0 Validation marché** : 15 interviews coachs N2/N3
2. **Sécurisation Volley Pulse** : Firebase Auth + règles Firestore strictes
3. **Refactoring composants >500 lignes** dans Volley Pulse
4. **Tests unitaires** sur les stores Zustand

### Avant le 1er client payant
1. **Création SASU** (~250-400€)
2. **Compliance RGPD** : CGU, consentement parental, politique de confidentialité
3. **Multi-tenancy** : modèle Club → Équipe → Athlète
4. **Intégration Stripe** abonnements

---

## 8. RÈGLES DE COMPORTEMENT POUR CLAUDE CODE

### À FAIRE
- ✅ Toujours sécuriser AVANT d'ajouter des fonctionnalités
- ✅ Tester en local AVANT de déployer
- ✅ Faire un backup AVANT toute modification critique
- ✅ Écrire des tests pour les stores et la logique métier
- ✅ Utiliser TypeScript strict pour tout nouveau code
- ✅ Respecter l'architecture multi-rôles existante (Animator/Parent/Expert/Adjoint)

### À NE PAS FAIRE
- ❌ NE PAS intégrer du code GPL/AGPL dans VolleyAnalytics (incompatibilité commerciale)
- ❌ NE PAS écrire de règles Firestore avec `if true`
- ❌ NE PAS exposer de clés API dans le code versionné
- ❌ NE PAS créer plus de 2 fichiers .md à la racine d'un repo
- ❌ NE PAS modifier la prod sans tester en dev d'abord
- ❌ NE PAS accumuler des fichiers "patch" / "compatible" / "fix-XXX" (signe de dette technique)
- ❌ NE PAS porter du code Mirwald dans VolleyAnalytics (risque PI FFVolley)

### EN CAS DE DOUTE
Demander à Olivier avant d'agir. Préférer une question à une décision unilatérale qui crée de la dette.

---

## 9. CONTEXTE DE COMPLIANCE — À INTÉGRER DÈS MAINTENANT

VolleyAnalytics traitera des **données de santé de mineures**. 4 cadres réglementaires s'appliquent :

1. **RGPD Article 9** — Consentement explicite renforcé pour données de santé
2. **Protection des mineures** — Consentement parental obligatoire (< 16 ans en France)
3. **AI Act européen** (août 2026) — Documentation, transparence, supervision humaine
4. **Responsabilité médicale/sportive** — L'IA est aide à la décision, jamais prescripteur

**À intégrer dans toute UX** :
- Bandeau "Cet outil est une aide à la décision, pas un avis médical"
- Workflow consentement parental traçable
- Procédure d'effacement à la demande
- Région Firebase europe-west obligatoire

Le Livrable 5 (Compliance RGPD pragmatique) reste à produire — Olivier y reviendra.

---

## 10. RÉFÉRENCES DOCUMENTAIRES

Documents produits dans la session de conseil (à demander à Olivier s'il les a sauvegardés) :
- **Livrable 1** — Audit technique des 5 repos
- **Livrable 4** — Business plan v1 (suivi athlète féminine, obsolète)
- **Livrable 4-bis** — Business plan VolleyAnalytics (validé)
- **Livrables 2, 3, 5** — À produire (architecture technique, plan de build, compliance)

---

*Document généré le 20 avril 2026 — À mettre à jour à chaque session significative.*
