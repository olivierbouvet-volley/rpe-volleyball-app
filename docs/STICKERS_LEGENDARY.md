# 🏆 Stickers Légendaires - Équipe Sablé

## 📋 Liste complète des 16 stickers légendaires

### 👥 Joueuses (13 stickers)
Critère d'obtention : **4 semaines complètes** (9/9 RPE obligatoires)

1. `charlotte.svg` - Charlotte
2. `chloe.svg` - Chloé
3. `cyrielle.svg` - Cyrielle
4. `eline.svg` - Eline
5. `julia.svg` - Julia
6. `lea.svg` - Léa
7. `lilou.svg` - Lilou
8. `lise.svg` - Lise
9. `lovely.svg` - Lovely
10. `marina.svg` - Marina
11. `melina.svg` - Mélina
12. `nelia.svg` - Nélia
13. `nine.svg` - Nine

### 🎖️ Staff (2 stickers)
Critères plus exigeants pour les coachs :

14. `coach-olivier.svg` - Coach Olivier  
    **Critère** : 6 semaines parfaites (13/13 RPE)
    
15. `coachadjoint-alexis.svg` - Coach Adjoint Alexis  
    **Critère** : Streak de 30 jours consécutifs

### 👑 Ultimate Achievement (1 sticker)

16. `collectif.svg` - Collectif Sablé (équipe entière)  
    **Critère** : Avoir débloqué tous les 13 stickers individuels des joueuses

---

## 🎯 Système de progression

### Ordre de déblocage recommandé :

1. **Phase 1** : Stickers Common (27) → Streaks, check-ins réguliers
2. **Phase 2** : Stickers Rare (5) → Streaks longs, semaines parfaites
3. **Phase 3** : Sticker Joueuse Légendaire → 4 semaines complètes
4. **Phase 4** : Sticker Coach Olivier → 6 semaines parfaites
5. **Phase 5** : Sticker Coach Alexis → 30 jours de streak
6. **Phase Finale** : Collectif Sablé → Tous les stickers joueurs débloqués

---

## 📊 Statistiques suivies dans Firestore

Dans `/players/{playerId}/stats/training` :

```javascript
{
  weeksCompleteCount: 0,    // Nombre de semaines à 9/9
  weeksPerfectCount: 0,      // Nombre de semaines à 13/13
  weeklyStreak: 0,           // Jours consécutifs actuels
  longestWeeklyStreak: 0,    // Record de jours consécutifs
  currentWeekSessions: 0,    // Séances cette semaine
  perfectWeeks: 0            // Total semaines parfaites
}
```

---

## 🎨 Format des fichiers

- **Format** : SVG (Scalable Vector Graphics)
- **Emplacement** : `/public/img/stickers/legendary/`
- **Naming convention** : lowercase, tirets pour espaces
  - Joueurs : `prenom.svg`
  - Coachs : `coach-prenom.svg`, `coachadjoint-prenom.svg`
  - Collectif : `collectif.svg`

---

## 🚀 Intégration dans le code

### Fichiers modifiés :

1. **stickers.js** (lignes 104-243)
   - Ajout des 16 définitions dans `STICKER_DEFINITIONS`
   - Logique de détection dans `checkWeeklyStickers()`

2. **training-streaks.js** (lignes 47-48)
   - Ajout compteurs `weeksCompleteCount` et `weeksPerfectCount`
   - Incrémentation automatique chaque lundi

3. **app.js** (lignes 735, 887, 500)
   - Déclencheurs après RPE et check-in
   - Chargement widget au dashboard

---

## ✅ Status

- ✅ Code implémenté et intégré
- ⏸️ Fichiers SVG à fournir demain
- ⏸️ Tests avec joueuses après upload SVG

---

## 📝 Notes techniques

### Détection du sticker joueuse
Le système compare le nom de la joueuse (de Firestore) avec l'ID du sticker :
```javascript
const playerName = playerData.name.toLowerCase(); // "julia prou"
if (playerName.includes('julia')) {
  // Débloquer player_julia
}
```

### Animation
- **Rareté legendary** : Confettis dorés + effet spotlight
- **Durée animation** : 3 secondes (flip + confettis)
- **Son** : À implémenter en Phase 2 (optionnel)

### Widget Dashboard
Affiche les 3 derniers stickers débloqués avec badges rareté

---

**Dernière mise à jour** : 19 janvier 2026
