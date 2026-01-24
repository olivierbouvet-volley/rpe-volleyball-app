# 🔍 Diagnostic - Problèmes Cycle et Graphiques

## 📋 Problèmes identifiés

### 1. **Cycle qui repart à J1 automatiquement** ❌

**Symptôme** : Zoé affiche J1 alors qu'elle n'a pas coché J1 dans son check-in ce matin.

**Cause** : Le code dans `cycle-detection-module.js` ligne 296-305 calcule automatiquement le jour de cycle :

```javascript
window.calculateCycleDay = function(lastPeriodDate) {
    if (!lastPeriodDate) return null;
    
    const today = new Date();
    const startDate = new Date(lastPeriodDate);
    
    // Nombre de jours depuis le début des règles
    const diffTime = today - startDate;
    const dayOfCycle = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return dayOfCycle;
};
```

Ce code **compte automatiquement** les jours depuis `lastPeriodDate` (cycleStartDate) et après 28 jours (ou la durée configurée), repart à J1, **sans vérifier** si la joueuse a confirmé un nouveau J1 dans son check-in.

**Règle métier attendue** :
- Le cycle ne doit JAMAIS repartir automatiquement à J1
- Seule la joueuse peut confirmer J1 en cochant "J1" dans son check-in
- Si elle ne coche rien, le cycle continue (J29, J30, J31, etc.)
- Le système doit juste **avertir** qu'elle a dépassé sa durée habituelle

### 2. **Graphiques qui ne s'affichent plus** ❌

**Symptôme** : Les graphiques dans le dashboard des joueuses n'apparaissent plus.

**Causes potentielles** :
- Erreur JavaScript silencieuse qui bloque l'exécution
- Chart.js non chargé ou version incompatible
- Conflit entre modules (cycle-detection-module.js vs player-dashboard-charts.js)
- Problème de timing (graphiques chargés avant Firebase)

---

## 🔧 Solutions à implémenter

### Solution 1 : Corriger le calcul du cycle

**Fichiers à modifier** :
- `public/js/cycle-detection-module.js`
- `public/js/training-recommendations.js`

**Changements** :
1. **Ne JAMAIS normaliser** le jour de cycle avec modulo 28
2. Supprimer cette ligne partout : `const day = ((dayOfCycle - 1) % cycleDuration) + 1;`
3. Garder le jour réel : `const day = dayOfCycle;`
4. Afficher un warning si `day > cycleDuration` au lieu de revenir à J1

### Solution 2 : Vérifier Chart.js

**Fichiers à vérifier** :
- `public/index.html` - Vérifier que Chart.js est bien chargé avant `player-dashboard-charts.js`
- Ordre de chargement des scripts dans `<script>` tags

---

## 🧪 Tests à effectuer

### Test Cycle :
1. Aller sur le profil de Zoé
2. Regarder le jour de cycle affiché
3. Vérifier dans Firestore : `menstrualCycle/Zoe` → `cycleStartDate`
4. Calculer manuellement : combien de jours depuis `cycleStartDate` ?
5. Si > 28, le système devrait afficher J29, J30, etc. (pas J1)

### Test Graphiques :
1. Ouvrir le dashboard d'une joueuse
2. Ouvrir la console navigateur (F12)
3. Chercher les erreurs JavaScript
4. Vérifier si Chart.js est défini : `console.log(Chart)`

---

## 📞 Prochaines étapes

1. Confirmez quel est le `cycleStartDate` actuel de Zoé dans Firestore
2. Ouvrez la console navigateur pour voir les erreurs exactes
3. Je corrigerai le code en conséquence
