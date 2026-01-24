# 🎖️ Système de Stickers - État d'Implémentation

**Date** : 19 janvier 2026  
**Status** : ✅ Code complet - En attente des fichiers SVG

---

## 📊 Inventaire des Stickers

### Total : 48 stickers

| Rareté | Nombre | Couleur Badge | Status Fichiers |
|--------|--------|---------------|-----------------|
| **Common** | 27 | 🟢 Vert | ✅ PNG fournis |
| **Rare** | 5 | 🔵 Bleu | ✅ PNG GOLD fournis |
| **Legendary** | 16 | 🟡 Or | ⏸️ SVG à fournir demain |

---

## 🏆 Stickers Légendaires (16)

### 👥 Joueuses (13)
*Critère : 4 semaines complètes (9/9 RPE obligatoires)*

1. ✅ `charlotte.svg` - Charlotte
2. ✅ `chloe.svg` - Chloé  
3. ✅ `cyrielle.svg` - Cyrielle
4. ✅ `eline.svg` - Eline
5. ✅ `julia.svg` - Julia
6. ✅ `lea.svg` - Léa
7. ✅ `lilou.svg` - Lilou
8. ✅ `lise.svg` - Lise
9. ✅ `lovely.svg` - Lovely
10. ✅ `marina.svg` - Marina
11. ✅ `melina.svg` - Mélina
12. ✅ `nelia.svg` - Nélia
13. ✅ `nine.svg` - Nine

### 🎖️ Staff (2)
14. ✅ `coach-olivier.svg` - **6 semaines parfaites** (13/13)
15. ✅ `coachadjoint-alexis.svg` - **Streak 30 jours consécutifs**

### 👑 Ultimate (1)
16. ✅ `collectif.svg` - Équipe Sablé - **Tous les stickers joueurs débloqués**

---

## 💻 Fichiers Modifiés

### 1. **stickers.js** (566 lignes)
Emplacement : `/public/js/stickers.js`

**Ajouts :**
- Lignes 104-243 : 16 définitions `STICKER_DEFINITIONS` légendaires
- Lignes 347-395 : Logique détection dans `checkWeeklyStickers()`
- Lignes 537-652 : Fonction `displayStickerWidget()` pour dashboard

**Fonctions clés :**
```javascript
checkAndAwardStickers(playerId, triggerType)
checkRPEStickers() 
checkCheckinStickers()
checkWeeklyStickers() // ← Ajout détection legendary
displayStickerWidget(playerId) // ← Nouveau widget
```

### 2. **training-streaks.js** (397 lignes)
Emplacement : `/public/js/training-streaks.js`

**Modifications :**
- Lignes 47-48 : Ajout compteurs `weeksCompleteCount` et `weeksPerfectCount`
- Ligne 88 : Init défaults avec nouveaux compteurs

**Nouveaux champs Firestore :**
```javascript
{
  weeksCompleteCount: 0,  // 9/9 RPE obligatoires
  weeksPerfectCount: 0    // 13/13 RPE total
}
```

### 3. **app.js** (2068 lignes)
Emplacement : `/public/js/app.js`

**Intégrations :**
- Ligne 735 : Trigger après check-in
- Ligne 887 : Trigger après RPE
- Ligne 500 : Chargement widget au dashboard

```javascript
// Après check-in
if (typeof checkAndAwardStickers === 'function') {
    await checkAndAwardStickers(appState.currentUser, 'checkin');
}

// Après RPE
if (typeof checkAndAwardStickers === 'function') {
    await checkAndAwardStickers(appState.currentUser, 'rpe');
}

// Dashboard load
if (typeof displayStickerWidget === 'function') {
    setTimeout(() => displayStickerWidget(appState.currentUser), 400);
}
```

### 4. **index.html** (3767 lignes)
Emplacement : `/public/index.html`

**Modifications :**
- Lignes 20-22 : CSS link `<link rel="stylesheet" href="/css/stickers.css">`
- Ligne 1051 : Widget container `<div id="stickerWidget">`
- Lignes 3710-3711 : Scripts `stickers.js` et `sticker-animation.js`

### 5. **sticker-animation.js** (200+ lignes) ✅
Emplacement : `/public/js/sticker-animation.js`

**Animations :**
- 3D flip card avec perspective
- Confettis dorés pour legendary
- Spotlight effect
- Auto-close après 10s

### 6. **stickers.css** (400+ lignes) ✅
Emplacement : `/public/css/stickers.css`

**Styles :**
- Modal fullscreen
- Volleyball court background
- Rarity-specific borders (vert/bleu/or)
- Responsive breakpoints

---

## 🎯 Logique de Détection

### Déclencheurs

| Action | Trigger Type | Vérifications |
|--------|--------------|---------------|
| RPE soumis | `'rpe'` | Streaks (5/7/14/30j) + Coach Alexis |
| Check-in | `'checkin'` | Early bird + 7/7 matinaux |
| Fin de semaine | `'weekly'` | Semaine complète/parfaite + Joueuses + Coach Olivier + Collectif |
| Fin de mois | `'monthly'` | Mois 100% complété |

### Critères Legendary

```javascript
// Joueuses individuelles
if (weeksCompleteCount >= 4 && playerName.includes('julia')) {
  award(player_julia);
}

// Coach Olivier
if (weeksPerfectCount >= 6) {
  award(coach_olivier);
}

// Coach Alexis
if (currentStreak >= 30) {
  award(coach_alexis);
}

// Collectif Sablé (Ultimate)
if (playerStickersOwned >= 13) {
  award(team_collectif);
}
```

---

## 📁 Structure Firestore

### `/players/{playerId}`
```javascript
{
  name: "Julia",
  stickers: ['early_bird', 'week_complete', 'player_julia'], // IDs
  // ... autres champs
}
```

### `/players/{playerId}/stats/training`
```javascript
{
  weeklyStreak: 5,              // Jours consécutifs actuels
  longestWeeklyStreak: 14,      // Record personnel
  currentWeekSessions: 7,        // Séances cette semaine
  weeksCompleteCount: 12,        // ← Nouveau : Total 9/9
  weeksPerfectCount: 8,          // ← Nouveau : Total 13/13
  perfectWeeks: 8,               // Semaines parfaites
  weekStartDate: "2026-01-13"
}
```

---

## 🎨 Widget Dashboard

### Affichage

- **Barre de progression** : X/48 stickers débloqués
- **Stats par rareté** : Common / Rare / Legendary
- **3 derniers débloqués** : Aperçu avec images
- **Bouton "Voir collection"** : Phase 2 (page dédiée)

### Design

- Fond gradient violet-violet (cohérent avec app)
- Cartes stickers avec bordures colorées selon rareté
- Badges emoji dans le coin supérieur droit
- Responsive sur mobile

---

## ✅ Checklist Implémentation

### Phase 1 - Core System ✅
- [x] Définitions 48 stickers (27+5+16)
- [x] Logique détection automatique
- [x] Animation 3D flip + confettis
- [x] Widget dashboard
- [x] Intégration triggers (RPE + check-in)
- [x] Compteurs Firestore (weeksCompleteCount, weeksPerfectCount)
- [x] CSS complet responsive

### Phase 1.5 - Upload Fichiers ⏸️
- [ ] Recevoir 16 fichiers SVG legendary
- [ ] Upload dans `/public/img/stickers/legendary/`
- [ ] Vérifier nommage correct
- [ ] Tester affichage dans widget

### Phase 2 - Collection Page (Future)
- [ ] Page `/collection.html` dédiée
- [ ] Grille complète 48 stickers
- [ ] Filtres par rareté
- [ ] Hover tooltips avec critères
- [ ] Stickers verrouillés en silhouette

### Phase 3 - Enhancements (Future)
- [ ] Sons (applaudissements, ovation)
- [ ] Stickers avancés (month_champion)
- [ ] Stickers saisonniers
- [ ] Système de trading/partage

---

## 🚀 Prochaines Étapes

### Aujourd'hui (19 janvier 2026)
1. ✅ Code complet implémenté
2. ⏸️ Attente des 16 SVG legendary

### Demain (20 janvier 2026)
1. Recevoir les fichiers SVG
2. Upload dans `/public/img/stickers/legendary/`
3. Test complet du système
4. Déploiement sur Firebase

### Commandes de déploiement
```powershell
# 1. Tester localement
firebase serve

# 2. Déployer hosting + firestore rules
firebase deploy --only hosting,firestore:rules

# 3. Vérifier dans l'app
# - Soumettre un RPE → animation sticker ?
# - Voir le widget sur dashboard
# - Compter les stickers dans profil
```

---

## 📝 Notes Techniques

### Nommage des fichiers SVG
- **Format attendu** : Minuscules, sans espaces
- **Exemples valides** : `julia.svg`, `coach-olivier.svg`, `collectif.svg`
- **Exemples invalides** : `Julia.svg`, `Coach Olivier.svg`, `collectif.png`

### Détection du prénom
```javascript
const playerName = playerData.name.toLowerCase(); // "julia prou"
if (playerName.includes('julia')) {
  // ✅ Matche avec 'player_julia'
}
```

### Animation selon rareté
- **Common** : Flip simple, confettis verts
- **Rare** : Flip + spotlight, confettis bleus
- **Legendary** : Flip + spotlight intense, confettis dorés ⭐

---

## 🐛 Points d'Attention

1. **Noms avec accents** : `Léa` → chercher `lea` (sans accent)
2. **Doublons prénoms** : Vérifier unicité des prénoms dans l'équipe
3. **Permissions Firestore** : Vérifier accès `/players/{id}/stats/training`
4. **Images 404** : Prévoir fallback si SVG manquant

---

## 📊 Statistiques Attendues

Après 1 mois d'utilisation :
- 27 stickers common : 100% des joueuses
- 5 stickers rare : 40-60% des joueuses
- 13 stickers legendary joueurs : 20-30% (4 semaines nécessaires)
- 1 coach Olivier : 5-10% (6 semaines parfaites)
- 1 coach Alexis : 2-5% (30 jours streak)
- 1 collectif : <1% (ultra rare, toutes les joueuses)

**Sticker le plus rare** : `team_collectif` 👑

---

**Prêt pour le déploiement dès réception des SVG !** 🚀
