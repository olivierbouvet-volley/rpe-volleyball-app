# CLAUDE.md — RPE Gen2

## Périmètre

Ce dépôt contient uniquement l’application RPE Gen2. VolleyVision vit dans un dépôt sibling séparé à côté de ce dossier, et ne doit pas être mélangé ici.

## Contexte projet

- Frontend statique dans `public/`
- Cloud Functions dans `functions/`
- Firestore pour `players`, `checkins`, `rpe`, `fcmTokens`
- Storage pour `players/{playerId}/`
- PWA + notifications via `public/firebase-messaging-sw.js`

## Règles de travail

- Répondre en français.
- Préférer des changements ciblés et testables.
- Ne pas réintroduire de références à VolleyVision dans ce dépôt.
- Lorsqu’une fonctionnalité touche les notifications, vérifier `public/js/app.js` et `functions/index.js`.
- Lorsqu’une fonctionnalité touche la sécurité, vérifier `firestore.rules` et `storage.rules`.

## Commandes utiles

- `firebase emulators:start`
- `firebase deploy --only hosting`
- `firebase deploy --only functions`
- `firebase functions:log`
