# 🚀 RPE Gen2 - Système de Périodes de Repos

## ✅ Modifications Appliquées

Ce package contient **toutes les modifications nécessaires** pour le système de gestion des périodes de repos. Vous n'avez plus qu'à déployer !

### Fichiers Modifiés

✅ **index.html** - Ajout de l'onglet et du modal Périodes de Repos  
✅ **app.js** - Blocage du Check-in uniquement pendant les périodes de repos  
✅ **app-reports.js** - Gestion de l'onglet Périodes de Repos  
✅ **app-rattrapage.js** - Blocage du rattrapage Check-in (J-1, J-2)  
✅ **app-volume-stats.js** - Ajustement des statistiques (exclusion des jours de repos)  
✅ **firestore.rules** - Règles de sécurité pour la collection rest_periods  

### Fichiers Ajoutés

✅ **public/js/rest-periods-manager.js** - Module complet de gestion des périodes de repos

## 🎯 Fonctionnalités

### Pour le Coach
- ⏸️ Nouvel onglet "Périodes de Repos" dans le dashboard
- ➕ Créer des périodes de vacances, week-ends, jours fériés
- ✏️ Modifier et supprimer les périodes
- 🔄 Option : Bloquer automatiquement tous les week-ends
- 💬 Messages personnalisés pour les joueuses

### Pour les Joueuses
- 🚫 **Check-in bloqué** pendant les périodes de repos (pas de suivi quotidien)
- ✅ **RPE toujours accessible** pour enregistrer les activités sportives
- 📊 Flexibilité : Remplir quotidiennement OU cumuler à la fin
- 💡 Bannière d'information claire avec le message du coach

### Statistiques Ajustées
- 📉 Objectifs proportionnels aux jours actifs
- 📊 Moyennes correctes (jours de repos exclus)
- 🎯 Jauges de progression justes
- ℹ️ Indicateurs visuels : "X jour(s) de repos exclus"

## 🚀 Déploiement

### Étape 1 : Vérifier les Fichiers

Tous les fichiers sont déjà modifiés dans ce dossier. Vérifiez que vous avez bien :

```bash
cd rpe-Gen2
ls -la public/js/rest-periods-manager.js  # Doit exister
```

### Étape 2 : Déployer les Règles Firestore

```bash
firebase deploy --only firestore:rules
```

✅ Vérifiez dans la console Firebase que les règles sont bien déployées.

### Étape 3 : Déployer l'Application

```bash
firebase deploy --only hosting
```

✅ Attendez la fin du déploiement (environ 1-2 minutes).

### Étape 4 : Tester en Production

1. **Tester l'interface Coach** :
   - Connectez-vous en tant que coach
   - Cliquez sur l'onglet "⏸️ Périodes de Repos"
   - Créez une période de test (ex: aujourd'hui + 1 jour)
   - Vérifiez qu'elle apparaît dans le tableau

2. **Tester l'interface Joueuse** :
   - Connectez-vous en tant que joueuse
   - Vérifiez la bannière de repos
   - Vérifiez que le Check-in est bloqué
   - Vérifiez que le RPE est accessible

3. **Tester les Statistiques** :
   - Allez dans l'onglet "Rapports"
   - Vérifiez que les objectifs sont ajustés
   - Vérifiez la note "X jour(s) de repos exclus"

## 📋 Checklist de Validation

### Déploiement
- [ ] Règles Firestore déployées
- [ ] Application déployée
- [ ] Pas d'erreurs dans la console

### Interface Coach
- [ ] Onglet "Périodes de Repos" visible
- [ ] Bouton "Nouvelle Période" fonctionne
- [ ] Modal s'ouvre correctement
- [ ] Création de période OK
- [ ] Modification de période OK
- [ ] Suppression de période OK
- [ ] Tableau affiche toutes les périodes

### Interface Joueuse
- [ ] Bannière de repos visible pendant les périodes
- [ ] Check-in bloqué pendant les périodes
- [ ] RPE accessible pendant les périodes
- [ ] Rattrapage Check-in J-1/J-2 bloqué pour dates en repos
- [ ] Rattrapage RPE J-1/J-2 accessible pour dates en repos
- [ ] Week-ends : Check-in bloqué, RPE accessible (si option activée)

### Statistiques
- [ ] Objectifs hebdomadaires ajustés
- [ ] Objectifs mensuels ajustés
- [ ] Objectifs annuels ajustés
- [ ] Note "X jour(s) de repos exclus" affichée
- [ ] Jauges de progression correctes
- [ ] Volume RPE comptabilisé normalement

## 🎓 Exemples d'Utilisation

### Exemple 1 : Vacances d'Été (2 semaines)

**Coach** :
```
Type : Vacances
Du : 01/08/2025
Au : 14/08/2025
Message : "Bonnes vacances d'été ! Le RPE reste accessible pour vos activités sportives 🌞"
```

**Joueuse** :
- Check-in bloqué pendant 14 jours
- Peut remplir le RPE quotidiennement
- OU peut cumuler à la fin :
  - Entraînement : 6h (3 séances × 2h), RPE 6
  - Match : 3h (2 matchs × 1h30), RPE 7
  - Prépa Physique : 2h (2 séances × 1h), RPE 5

**Statistiques** :
- Objectif mensuel ajusté : 86.4h → 46.4h
- Volume RPE : 11h comptabilisé normalement
- Progression : Juste et motivante

### Exemple 2 : Week-ends Toute l'Année

**Coach** :
```
Type : Week-ends
Cocher : "Bloquer tous les week-ends"
Message : "Profitez de votre week-end ! Le RPE reste disponible si vous vous entraînez 🏐"
```

**Joueuse** :
- Check-in bloqué samedi et dimanche
- RPE accessible si elle s'entraîne le week-end
- Peut remplir en semaine normalement

**Statistiques** :
- ~104 jours exclus par an (52 week-ends)
- Objectif annuel ajusté : 720h → 504h
- Reflète la réalité de l'entraînement

## 🐛 Dépannage

### Erreur : "isRestDay is not defined"

**Cause** : rest-periods-manager.js n'est pas chargé

**Solution** : Vérifier que le fichier existe et est bien référencé dans index.html :
```html
<script src="/js/rest-periods-manager.js"></script>
```

### Le Check-in ne se bloque pas

**Cause** : La fonction checkAndBlockRestDay() n'est pas appelée

**Solution** : Vérifier dans app.js que l'appel est bien présent dans loadPlayerDashboard()

### Le RPE est bloqué (ne devrait pas !)

**Cause** : Erreur dans les modifications

**Solution** : Vérifier qu'il n'y a pas de fonction blockRPEForm() dans app.js

### Les statistiques ne sont pas ajustées

**Cause** : Les fonctions countRestDaysInPeriod() ne sont pas ajoutées

**Solution** : Vérifier que app-volume-stats.js contient bien les nouvelles fonctions

### Erreur Firestore "Permission denied"

**Cause** : Les règles Firestore ne sont pas déployées

**Solution** :
```bash
firebase deploy --only firestore:rules
```

## 📊 Structure de la Collection rest_periods

```javascript
{
  type: "Vacances",              // Type de période
  startDate: "2025-08-01",       // Date de début (YYYY-MM-DD)
  endDate: "2025-08-14",         // Date de fin (YYYY-MM-DD)
  weekendsEnabled: false,        // Bloquer tous les week-ends
  message: "Bonnes vacances !",  // Message pour les joueuses
  createdAt: Timestamp,          // Date de création
  createdBy: "coach_uid"         // UID du coach
}
```

## 🔐 Sécurité

Les règles Firestore garantissent que :
- ✅ Tous les utilisateurs authentifiés peuvent **lire** les périodes de repos
- ✅ Seul le **coach** peut créer, modifier ou supprimer des périodes
- ✅ La vérification du rôle est faite côté serveur (sécurisé)

## 📞 Support

En cas de problème :
1. Vérifier la console JavaScript (F12) pour les erreurs
2. Vérifier les logs Firebase dans la console
3. Comparer le code avec ce README
4. Vérifier que toutes les modifications sont appliquées

## 🎉 Félicitations !

Votre système de périodes de repos est maintenant opérationnel !

**Avantages** :
- ✅ Repos mental pour les joueuses (pas de Check-in pendant les congés)
- ✅ Flexibilité totale pour enregistrer le RPE
- ✅ Aucune perte de données d'entraînement
- ✅ Statistiques justes et motivantes
- ✅ Gestion centralisée par le coach

---

**Version** : 2.0 (Corrigée)  
**Date** : Novembre 2024  
**Statut** : ✅ Prêt à déployer

