# CLAUDE.md — RPE Gen2

## Périmètre

Ce dépôt contient uniquement l’application RPE Gen2.
VolleyVision vit dans un dépôt sibling séparé à côté de ce dossier, et ne doit jamais être mélangé ici.

## Contexte projet

- Frontend statique dans `public/`
- Cloud Functions dans `functions/`
- Firestore pour `players`, `checkins`, `rpe`, `fcmTokens`
- Storage pour `players/{playerId}/`
- PWA + notifications via `public/firebase-messaging-sw.js`

## Règles de travail

- Répondre en français.
- Préférer des changements ciblés, testables et réversibles.
- Ne pas réintroduire de références à VolleyVision dans ce dépôt.
- Lorsqu’une fonctionnalité touche les notifications, vérifier `public/js/app.js` et `functions/index.js`.
- Lorsqu’une fonctionnalité touche la sécurité, vérifier `firestore.rules` et `storage.rules`.
- Toujours privilégier la sécurité avant l’ajout de fonctionnalités.
- Ne jamais faire de déploiement sans validation explicite.

## Workflow LLM

Ce dépôt peut être utilisé avec deux modes de session Claude Code :

- `cc-rpe-claude` → session avec compte Claude Pro
- `cc-rpe-deepseek` → session avec DeepSeek via API compatible Anthropic

Règles d’usage :
- Utiliser Claude Pro pour :
  - sécurité Firebase,
  - règles Firestore / Storage,
  - données sensibles,
  - logique wellness / santé,
  - décisions d’architecture,
  - validation finale avant changement important.
- Utiliser DeepSeek pour :
  - refactors localisés,
  - nettoyage de code,
  - génération de boilerplate,
  - tâches répétitives ou exploratoires à faible risque.

Règle importante :
- Les alias de modèle (`sonnet`, `opus`, `haiku`) dépendent du backend actif.
- En session DeepSeek, `sonnet` peut être remappé vers un modèle DeepSeek.
- Ne pas supposer que `model: sonnet` signifie toujours “Claude Sonnet natif”.

## Commandes utiles

- `firebase emulators:start`
- `firebase deploy --only hosting`
- `firebase deploy --only functions`
- `firebase functions:log`