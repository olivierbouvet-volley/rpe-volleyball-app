# 🧪 Guide de Test - Système de Stickers

## 🎯 Objectif
Tester le système de gamification avec les 48 stickers après upload des fichiers SVG.

---

## 📋 Tests par Catégorie

### 1. Tests Stickers COMMON (27) ✅

#### Test A : Semaine Complète
```javascript
// Console Firebase (ou script admin)
const playerId = 'Julia'; // Remplacer par ID joueuse
await db.collection('players').doc(playerId).collection('stats').doc('training').update({
  currentWeekSessions: 9
});
// Trigger: await checkAndAwardStickers(playerId, 'weekly');
// Résultat attendu: Sticker "week_complete" débloqué
```

#### Test B : Early Bird
```javascript
// Faire un check-in avant 8h du matin
// Date système: modifier temporairement l'heure
// Résultat attendu: Sticker "early_bird" débloqué
```

#### Test C : Streak 5 jours
```javascript
// Simuler 5 RPE consécutifs
const dates = ['2026-01-15', '2026-01-16', '2026-01-17', '2026-01-18', '2026-01-19'];
for (const date of dates) {
  await db.collection('rpe').add({
    playerId: 'Julia',
    date: date,
    rpe: 7,
    duration: 90
  });
}
// Trigger: await checkAndAwardStickers('Julia', 'rpe');
// Résultat attendu: Sticker "consistent_player" débloqué
```

---

### 2. Tests Stickers RARE (5) 🔵

#### Test D : Streak 7 jours
```javascript
await db.collection('players').doc('Julia').collection('stats').doc('training').update({
  weeklyStreak: 7
});
// Trigger: await checkAndAwardStickers('Julia', 'rpe');
// Résultat attendu: Sticker "streak_7" débloqué + confettis bleus
```

#### Test E : Semaine Parfaite (13/13)
```javascript
await db.collection('players').doc('Julia').collection('stats').doc('training').update({
  currentWeekSessions: 13
});
// Trigger: await checkAndAwardStickers('Julia', 'weekly');
// Résultat attendu: Sticker "week_perfect" débloqué
```

---

### 3. Tests Stickers LEGENDARY (16) 🟡

#### Test F : Joueuse (4 semaines complètes)
```javascript
await db.collection('players').doc('Julia').update({
  name: 'JULIA PROU' // Important: nom exact
});
await db.collection('players').doc('Julia').collection('stats').doc('training').update({
  weeksCompleteCount: 4
});
// Trigger: await checkAndAwardStickers('Julia', 'weekly');
// Résultat attendu: Sticker "player_julia" débloqué + confettis dorés
```

#### Test G : Coach Olivier (6 semaines parfaites)
```javascript
await db.collection('players').doc('Julia').collection('stats').doc('training').update({
  weeksPerfectCount: 6
});
// Trigger: await checkAndAwardStickers('Julia', 'weekly');
// Résultat attendu: Sticker "coach_olivier" débloqué
```

#### Test H : Coach Alexis (30 jours streak)
```javascript
await db.collection('players').doc('Julia').collection('stats').doc('training').update({
  weeklyStreak: 30
});
// Trigger: await checkAndAwardStickers('Julia', 'rpe');
// Résultat attendu: Sticker "coach_alexis" débloqué
```

#### Test I : Collectif Sablé (Ultimate)
```javascript
// Attribuer les 13 stickers joueurs
const playerStickers = [
  'player_charlotte', 'player_chloe', 'player_cyrielle', 'player_eline',
  'player_julia', 'player_lea', 'player_lilou', 'player_lise',
  'player_lovely', 'player_marina', 'player_melina', 'player_nelia', 'player_nine'
];
await db.collection('players').doc('Julia').update({
  stickers: firebase.firestore.FieldValue.arrayUnion(...playerStickers)
});
// Trigger: await checkAndAwardStickers('Julia', 'weekly');
// Résultat attendu: Sticker "team_collectif" débloqué 👑
```

---

## 🎨 Tests Visuels

### Widget Dashboard
1. Ouvrir le dashboard joueuse
2. Vérifier présence widget stickers
3. Contrôler barre de progression (X/48)
4. Vérifier stats par rareté (Common/Rare/Legendary)
5. Observer les 3 derniers stickers

**Commandes console :**
```javascript
// Afficher le widget manuellement
await displayStickerWidget('Julia');

// Vérifier les stickers actuels
const doc = await db.collection('players').doc('Julia').get();
console.log('Stickers:', doc.data().stickers);
```

### Animation Révélation
1. Soumettre un RPE pour déclencher
2. Vérifier modal apparition
3. Observer animation flip 3D
4. Vérifier confettis (couleur selon rareté)
5. Contrôler auto-close après 10s

**Test manuel :**
```javascript
// Dans la console navigateur
const testSticker = window.STICKER_DEFINITIONS.player_julia;
showStickerAnimation(testSticker);
```

---

## 🔍 Vérification Firestore

### Structure attendue après attribution

#### `/players/Julia`
```json
{
  "name": "JULIA PROU",
  "stickers": [
    "week_complete",
    "early_bird",
    "consistent_player",
    "streak_7",
    "player_julia"
  ]
}
```

#### `/players/Julia/stats/training`
```json
{
  "weeklyStreak": 7,
  "longestWeeklyStreak": 14,
  "currentWeekSessions": 9,
  "weeksCompleteCount": 4,
  "weeksPerfectCount": 2,
  "perfectWeeks": 2,
  "weekStartDate": "2026-01-13"
}
```

---

## 🐛 Debugging

### Logs à surveiller

```javascript
// Activation logs
console.log('🎖️ Chargement stickers.js'); // Au chargement
console.log('🎖️ Vérification stickers pour Julia (trigger: rpe)');
console.log('✅ Nouveau sticker débloqué:', sticker.name);
console.log('🎨 Animation sticker:', sticker.id);
```

### Erreurs communes

| Erreur | Cause | Solution |
|--------|-------|----------|
| Widget ne s'affiche pas | `displayStickerWidget` non appelé | Vérifier app.js ligne 500 |
| Animation ne se lance pas | `showStickerAnimation` manquant | Vérifier script sticker-animation.js chargé |
| Sticker non attribué | Critère non rempli | Vérifier compteurs Firestore |
| Image 404 | Fichier SVG manquant | Uploader dans `/legendary/` |
| Prénom non détecté | Faute dans nom Firestore | Normaliser en lowercase |

---

## 📊 Scénario de Test Complet

### Semaine 1-4 : Déblocage Joueuse
```javascript
// Julia effectue 9 RPE par semaine pendant 4 semaines
for (let week = 1; week <= 4; week++) {
  // Simuler 9 séances
  await db.collection('players').doc('Julia').collection('stats').doc('training').update({
    currentWeekSessions: 9,
    weeksCompleteCount: firebase.firestore.FieldValue.increment(1)
  });
  
  // Fin de semaine: trigger weekly
  await checkAndAwardStickers('Julia', 'weekly');
  
  // Reset hebdomadaire
  await checkAndResetWeeklyStats('Julia');
}

// Résultat attendu après semaine 4:
// ✅ week_complete (semaine 1)
// ✅ player_julia (semaine 4)
```

### Semaine 5-10 : Déblocage Coaches
```javascript
// Semaines 5-10: 13/13 RPE (semaines parfaites)
for (let week = 5; week <= 10; week++) {
  await db.collection('players').doc('Julia').collection('stats').doc('training').update({
    currentWeekSessions: 13,
    weeksPerfectCount: firebase.firestore.FieldValue.increment(1)
  });
  
  await checkAndAwardStickers('Julia', 'weekly');
  await checkAndResetWeeklyStats('Julia');
}

// Résultat attendu après semaine 10:
// ✅ week_perfect (semaine 5)
// ✅ coach_olivier (semaine 10, car 6 parfaites)
```

### Streak 30 jours : Coach Alexis
```javascript
// RPE quotidiens pendant 30 jours consécutifs
await db.collection('players').doc('Julia').collection('stats').doc('training').update({
  weeklyStreak: 30
});

await checkAndAwardStickers('Julia', 'rpe');

// Résultat attendu:
// ✅ coach_alexis
```

---

## ✅ Checklist Validation

Après upload des SVG et tests :

- [ ] 27 stickers common détectés correctement
- [ ] 5 stickers rare avec confettis bleus
- [ ] 16 stickers legendary avec confettis dorés
- [ ] Widget dashboard affiche progression
- [ ] Animation 3D flip fonctionne
- [ ] Images SVG chargent sans 404
- [ ] Compteurs Firestore incrémentent
- [ ] Pas de doublons dans `stickers` array
- [ ] Performance acceptable (<500ms par check)
- [ ] Mobile responsive

---

## 🚀 Commandes Utiles

### Reset complet d'une joueuse
```javascript
await db.collection('players').doc('Julia').update({
  stickers: []
});
await db.collection('players').doc('Julia').collection('stats').doc('training').update({
  weeksCompleteCount: 0,
  weeksPerfectCount: 0,
  weeklyStreak: 0,
  currentWeekSessions: 0
});
```

### Attribuer tous les stickers (test ultimate)
```javascript
const allStickers = Object.keys(window.STICKER_DEFINITIONS);
await db.collection('players').doc('Julia').update({
  stickers: allStickers
});
await displayStickerWidget('Julia'); // Devrait afficher 48/48
```

### Voir la définition d'un sticker
```javascript
console.log(window.STICKER_DEFINITIONS.player_julia);
// Output: { id, name, description, emoji, rarity, image, criteria }
```

---

## 📞 Support

En cas de problème :
1. Vérifier console navigateur (F12)
2. Vérifier console Firebase (erreurs Firestore)
3. Consulter `STICKERS_IMPLEMENTATION_STATUS.md`
4. Examiner logs système dans app.js

---

**Tests à effectuer dès réception des 16 SVG !** 🧪
