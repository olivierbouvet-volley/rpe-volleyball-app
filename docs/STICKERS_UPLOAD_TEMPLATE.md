# 📝 Template Upload - 16 Stickers Légendaires

**Date de livraison prévue** : 20 janvier 2026

---

## 📦 Fichiers à Fournir

### Checklist (16 fichiers SVG)

#### Joueuses (13)
- [ ] `charlotte.svg`
- [ ] `chloe.svg`
- [ ] `cyrielle.svg`
- [ ] `eline.svg`
- [ ] `julia.svg`
- [ ] `lea.svg`
- [ ] `lilou.svg`
- [ ] `lise.svg`
- [ ] `lovely.svg`
- [ ] `marina.svg`
- [ ] `melina.svg`
- [ ] `nelia.svg`
- [ ] `nine.svg`

#### Staff (2)
- [ ] `coach-olivier.svg`
- [ ] `coachadjoint-alexis.svg`

#### Collectif (1)
- [ ] `collectif.svg`

---

## 🎨 Spécifications Techniques

### Format
- **Extension** : `.svg` uniquement
- **Dimensions** : 256x256px ou 512x512px recommandé
- **Fond** : Transparent (alpha channel)
- **Poids** : < 200KB par fichier

### Style Recommandé
- Portrait façon "carte à collectionner"
- Style cartoon/illustration
- Couleurs vives et identifiables
- Fond uni ou dégradé simple
- Badge/numéro optionnel

### Exemples de Design
```
┌─────────────────┐
│                 │
│   [Portrait]    │  ← Visage/buste de la joueuse
│                 │
│   JULIA PROU    │  ← Nom (optionnel, sera affiché dans l'app)
│      #7         │  ← Numéro maillot (optionnel)
│                 │
└─────────────────┘
```

---

## 📁 Destination des Fichiers

### Emplacement Serveur
```
/public/img/stickers/legendary/
├── charlotte.svg
├── chloe.svg
├── cyrielle.svg
├── eline.svg
├── julia.svg
├── lea.svg
├── lilou.svg
├── lise.svg
├── lovely.svg
├── marina.svg
├── melina.svg
├── nelia.svg
├── nine.svg
├── coach-olivier.svg
├── coachadjoint-alexis.svg
└── collectif.svg
```

### Méthode d'Upload

#### Option A : Upload Direct (Firebase Console)
1. Aller sur Firebase Console → Storage
2. Créer dossier `public/img/stickers/legendary/`
3. Upload les 16 fichiers SVG
4. Vérifier URLs publiques

#### Option B : Upload Local puis Deploy
```powershell
# 1. Placer les fichiers dans
c:\Projets\rpe-volleyball-app\public\img\stickers\legendary\

# 2. Déployer
firebase deploy --only hosting
```

#### Option C : FTP/Git Push
```powershell
git add public/img/stickers/legendary/*.svg
git commit -m "Add 16 legendary stickers (team portraits)"
git push
```

---

## ✅ Validation Post-Upload

### Tests Rapides

#### 1. Vérifier accessibilité fichiers
```javascript
// Console navigateur
const img = new Image();
img.src = '/img/stickers/legendary/julia.svg';
img.onload = () => console.log('✅ Julia SVG OK');
img.onerror = () => console.error('❌ Julia SVG 404');
```

#### 2. Tester widget
```javascript
// Attribuer un sticker pour test
await db.collection('players').doc('Julia').update({
  stickers: firebase.firestore.FieldValue.arrayUnion('player_julia')
});

// Recharger dashboard
await displayStickerWidget('Julia');
```

#### 3. Tester animation
```javascript
// Console navigateur
const sticker = window.STICKER_DEFINITIONS.player_julia;
showStickerAnimation(sticker);
// Vérifier: image apparaît + confettis dorés
```

---

## 🐛 Troubleshooting

### Problème : Image ne charge pas (404)
**Solutions :**
- Vérifier nommage exact (lowercase, sans espaces)
- Vérifier extension `.svg` (pas `.SVG`)
- Vérifier permissions Firebase Storage
- Purger cache navigateur (Ctrl+F5)

### Problème : Image apparaît pixelisée
**Solutions :**
- Augmenter résolution SVG (512x512px)
- Vérifier viewBox dans le SVG
- Utiliser `preserveAspectRatio="xMidYMid meet"`

### Problème : Fond noir au lieu de transparent
**Solutions :**
- Retirer balise `<rect fill="#000000">`
- Sauvegarder avec alpha channel
- Utiliser Inkscape/Illustrator pour conversion

---

## 🎨 Outils Recommandés

### Création SVG
- **Inkscape** (gratuit) : https://inkscape.org
- **Adobe Illustrator** (payant)
- **Figma** (en ligne, gratuit)

### Optimisation SVG
- **SVGOMG** : https://jakearchibald.github.io/svgomg/
- **SVG Cleaner** : https://github.com/RazrFalcon/svgcleaner

### Conversion PNG → SVG
- **Vectorizer.io** : https://www.vectorizer.io/
- **Trace** dans Inkscape (menu Path → Trace Bitmap)

---

## 📊 Correspondance Sticker → Critère

Pour référence lors de la création :

| Sticker | Critère Déblocage | Rareté |
|---------|-------------------|--------|
| `charlotte.svg` | 4 semaines complètes | 🟡 Legendary |
| `chloe.svg` | 4 semaines complètes | 🟡 Legendary |
| `cyrielle.svg` | 4 semaines complètes | 🟡 Legendary |
| `eline.svg` | 4 semaines complètes | 🟡 Legendary |
| `julia.svg` | 4 semaines complètes | 🟡 Legendary |
| `lea.svg` | 4 semaines complètes | 🟡 Legendary |
| `lilou.svg` | 4 semaines complètes | 🟡 Legendary |
| `lise.svg` | 4 semaines complètes | 🟡 Legendary |
| `lovely.svg` | 4 semaines complètes | 🟡 Legendary |
| `marina.svg` | 4 semaines complètes | 🟡 Legendary |
| `melina.svg` | 4 semaines complètes | 🟡 Legendary |
| `nelia.svg` | 4 semaines complètes | 🟡 Legendary |
| `nine.svg` | 4 semaines complètes | 🟡 Legendary |
| `coach-olivier.svg` | 6 semaines parfaites | 🟡 Legendary |
| `coachadjoint-alexis.svg` | Streak 30 jours | 🟡 Legendary |
| `collectif.svg` | Tous les stickers joueurs | 👑 Ultimate |

---

## 🚀 Après Upload

### Tests à Effectuer (ordre)

1. ✅ Vérifier tous les fichiers accessibles (pas de 404)
2. ✅ Tester animation avec 1 sticker legendary
3. ✅ Vérifier widget dashboard affiche images
4. ✅ Simuler déblocage avec vraie joueuse
5. ✅ Vérifier responsive mobile (images adaptées)
6. ✅ Test performance (temps chargement widget)

### Déploiement Final
```powershell
# 1. Test local
firebase serve
# Ouvrir http://localhost:5000

# 2. Deploy production
firebase deploy --only hosting

# 3. Vérifier en prod
# Ouvrir https://rpe-volleyball-app.web.app
```

---

## 📞 Contact

Si besoin d'aide avec les SVG ou l'upload :
- Consulter `STICKERS_TESTING_GUIDE.md` pour tests
- Vérifier `STICKERS_IMPLEMENTATION_STATUS.md` pour status
- Logs Firebase Console pour erreurs

---

**Prêt à recevoir les 16 SVG demain !** 🎨✨
