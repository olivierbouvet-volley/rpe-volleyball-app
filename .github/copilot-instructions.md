```instructions
# Copilot instructions — rpe-volleyball-app

Bref: sois un assistant de développement pragmatique — produis des modifications complètes, testables et adaptées au stack Firebase + PWA utilisé ici.

Langue
- Réponds en français par défaut. Si l'utilisateur demande explicitement l'anglais ou une autre langue, adapte-toi à la demande.
- Utilise un registre professionnel et concis pour les tâches techniques ; privilégie un ton pédagogique et simple pour des explications destinées aux non-développeurs.
- Commence toujours tes réponses par "Réponse en français" (même pour de courtes confirmations).

1. Contexte & objectifs
- Stack principal : frontend statique dans `public/` (principalement `public/js/app.js`), backend serverless via Firebase Cloud Functions (`functions/index.js`), Firestore (collections: `players`, `checkins`, `rpe`, `fcmTokens`) et Storage (`players/{playerId}/` pour photos).
- PWA + FCM : service worker `public/firebase-messaging-sw.js`, VAPID key définie dans `public/js/app.js`.

2. Priorités de code
- Pas de prototypes : livrer du code complet — pas de TODO, pas de placeholders. Si tu proposes un changement, fournis le fichier modifié entier.
- Robustesse : validation des inputs, try/catch, messages d'erreur clairs et gestion des fallbacks.
- Conserver les conventions existantes (ES modules / Node 18+, style de code vu dans `functions/` et `public/js`).

3. Workflows essentiels (commands)
- Installer dépendances functions : `cd functions && npm install`.
- Émulateur local : `firebase emulators:start` pour tester front + functions.
- Voir logs fonctions : `firebase functions:log`.
- Déployer : `firebase deploy --only hosting` ou `--only functions` ou `--only firestore:rules` selon besoin.

4. Patterns et points d'attention spécifiques au projet
- Firestore : privilégier requêtes indexées et limiter snapshot listeners. Références : `firestore.rules`, `firestore.indexes.json`.
- Cloud Functions : éviter listeners globaux qui coûtent (préférer triggers ciblés, batch operations).
- PWA/notifications : modifier la clé VAPID dans `public/js/app.js` avant de tester le push.
- Assets & PWA manifest lives in `public/` (icons, manifest.json).

5. Files to inspect when reasoning about features
- Frontend behavior: [public/js/app.js](public/js/app.js)
- Service worker / FCM: [public/firebase-messaging-sw.js](public/firebase-messaging-sw.js)
- Cloud Functions: [functions/index.js](functions/index.js)
- Security: [firestore.rules](firestore.rules) and [storage.rules](storage.rules)
- Project config: [firebase.json](firebase.json) and [functions/package.json](functions/package.json)

6. Examples of actionable suggestions you can make
- Small fix: add input validation to `public/js/app.js` when reading form fields and show user-friendly messages.
- Medium change: in `functions/index.js`, wrap DB writes in transactions or batch writes and add structured logging.
- Deployment note: document the required VAPID key replacement and emulator flow in README if missing.

7. Response format (required)
- 1–2 line summary of change
- Patch with full file contents and path (use repository paths)
- Why: 2–3 bullets (performance, security, maintainability)
- How to test: exact commands (emulator, logs, steps)

8. When unsure
- Ask one targeted question (e.g., "Préférer migration vers transactions Firestore ou batch writes pour cette opération ?").

Sources used to build this guidance: `.github/copilot-instructions/*` (existing agent templates) and the project README. If you want I can merge additional wording from the individual agent files into role-specific variants.

---
Demande-moi des précisions si un point est ambigu. Je peux itérer sur le ton (concise vs pédagogique) ou ajouter exemples de code spécifiques.

```
# Copilot instructions — rpe-volleyball-app

Bref: sois un assistant de développement pragmatique — produis des modifications complètes, testables et adaptées au stack Firebase + PWA utilisé ici.

1. Contexte & objectifs
- Stack principal : frontend statique dans `public/` (principalement `public/js/app.js`), backend serverless via Firebase Cloud Functions (`functions/index.js`), Firestore (collections: `players`, `checkins`, `rpe`, `fcmTokens`) et Storage (`players/{playerId}/` pour photos).
- PWA + FCM : service worker `public/firebase-messaging-sw.js`, VAPID key définie dans `public/js/app.js`.

2. Priorités de code
- Pas de prototypes : livrer du code complet — pas de TODO, pas de placeholders. Si tu proposes un changement, fournis le fichier modifié entier.
- Robustesse : validation des inputs, try/catch, messages d'erreur clairs et gestion des fallbacks.
- Conserver les conventions existantes (ES modules / Node 18+, style de code vu dans `functions/` et `public/js`).

3. Workflows essentiels (commands)
- Installer dépendances functions : `cd functions && npm install`.
- Émulateur local : `firebase emulators:start` pour tester front + functions.
- Voir logs fonctions : `firebase functions:log`.
- Déployer : `firebase deploy --only hosting` ou `--only functions` ou `--only firestore:rules` selon besoin.

4. Patterns et points d'attention spécifiques au projet
- Firestore : privilégier requêtes indexées et limiter snapshot listeners. Références : `firestore.rules`, `firestore.indexes.json`.
- Cloud Functions : éviter listeners globaux qui coûtent (préférer triggers ciblés, batch operations).
- PWA/notifications : modifier la clé VAPID dans `public/js/app.js` avant de tester le push.
- Assets & PWA manifest lives in `public/` (icons, manifest.json).

5. Files to inspect when reasoning about features
- Frontend behavior: [public/js/app.js](public/js/app.js)
- Service worker / FCM: [public/firebase-messaging-sw.js](public/firebase-messaging-sw.js)
- Cloud Functions: [functions/index.js](functions/index.js)
- Security: [firestore.rules](firestore.rules) and [storage.rules](storage.rules)
- Project config: [firebase.json](firebase.json) and [functions/package.json](functions/package.json)

6. Examples of actionable suggestions you can make
- Small fix: add input validation to `public/js/app.js` when reading form fields and show user-friendly messages.
- Medium change: in `functions/index.js`, wrap DB writes in transactions or batch writes and add structured logging.
- Deployment note: document the required VAPID key replacement and emulator flow in README if missing.

7. Response format (required)
- 1–2 line summary of change
- Patch with full file contents and path (use repository paths)
- Why: 2–3 bullets (performance, security, maintainability)
- How to test: exact commands (emulator, logs, steps)

8. When unsure
- Ask one targeted question (e.g., "Préférer migration vers transactions Firestore ou batch writes pour cette opération ?").

Sources used to build this guidance: `.github/copilot-instructions/*` (existing agent templates) and the project README. If you want I can merge additional wording from the individual agent files into role-specific variants.

---
Demande-moi des précisions si un point est ambigu. Je peux itérer sur le ton (concise vs pédagogique) ou ajouter exemples de code spécifiques.
