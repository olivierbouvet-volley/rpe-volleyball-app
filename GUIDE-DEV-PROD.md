# 🔄 Guide Système DEV / PROD

## 🎯 Principe

Votre application utilise **automatiquement** la bonne configuration Firebase selon l'URL :

| Environnement | URL | Projet Firebase | Usage |
|---------------|-----|-----------------|-------|
| **TEST (DEV)** | https://rpe-volleyball-sable.web.app/ | `rpe-volleyball-sable` | Tester les nouvelles fonctionnalités |
| **PRODUCTION** | https://rpe-gen2-eeaee.web.app/ | `rpe-gen2-eeaee` | Application utilisée par les joueuses |

## ✅ Configuration Actuelle

### Fichiers de Configuration

```
public/js/config/
├── firebase-config-dev.js   → rpe-volleyball-sable (TEST)
├── firebase-config-prod.js  → rpe-gen2-eeaee (PRODUCTION)
└── firebase-loader.js       → Sélection automatique
```

### Sélection Automatique

Le fichier `firebase-loader.js` détecte automatiquement l'environnement :

**Mode TEST** si l'URL est :
- `localhost`
- `127.0.0.1`
- `rpe-volleyball-sable.web.app`
- `rpe-volleyball-sable.firebaseapp.com`

**Mode PRODUCTION** si l'URL est :
- `rpe-gen2-eeaee.web.app`
- `rpe-gen2-eeaee.firebaseapp.com`

## 🚀 Workflow de Développement

### 1. Développer et Tester

```bash
# Déployer sur TEST
firebase deploy --only hosting --project rpe-volleyball-sable
firebase deploy --only firestore:rules --project rpe-volleyball-sable
firebase deploy --only firestore:indexes --project rpe-volleyball-sable
```

**Tester sur** : https://rpe-volleyball-sable.web.app/

### 2. Valider

- ✅ Tester toutes les fonctionnalités
- ✅ Vérifier la console (F12) : pas d'erreurs
- ✅ Tester en tant que coach
- ✅ Tester en tant que joueuse

### 3. Déployer en Production

**⚠️ UNIQUEMENT quand tout fonctionne sur TEST !**

```bash
# Déployer sur PRODUCTION
firebase deploy --only hosting --project rpe-gen2-eeaee
firebase deploy --only firestore:rules --project rpe-gen2-eeaee
firebase deploy --only firestore:indexes --project rpe-gen2-eeaee
```

**En ligne sur** : https://rpe-gen2-eeaee.web.app/

## 🔍 Vérifier l'Environnement

### Dans la Console du Navigateur (F12)

Quand vous ouvrez l'application, vous verrez :

**Sur TEST** :
```
🔧 Firebase: Mode DÉVELOPPEMENT
📦 Projet Firebase: rpe-volleyball-sable
```

**Sur PRODUCTION** :
```
🚀 Firebase: Mode PRODUCTION
📦 Projet Firebase: rpe-gen2-eeaee
```

### Dans le Code JavaScript

Vous pouvez vérifier l'environnement :

```javascript
if (window.isDevEnvironment()) {
    console.log('Mode TEST');
}

if (window.isProdEnvironment()) {
    console.log('Mode PRODUCTION');
}

// Ou directement
console.log(window.FIREBASE_ENV); // 'development' ou 'production'
console.log(window.FIREBASE_CONFIG.projectId); // 'rpe-volleyball-sable' ou 'rpe-gen2-eeaee'
```

## 📋 Commandes Utiles

### Déployer sur TEST

```bash
# Tout déployer
firebase deploy --project rpe-volleyball-sable

# Seulement l'application
firebase deploy --only hosting --project rpe-volleyball-sable

# Seulement les règles
firebase deploy --only firestore:rules --project rpe-volleyball-sable

# Seulement les index
firebase deploy --only firestore:indexes --project rpe-volleyball-sable
```

### Déployer sur PRODUCTION

```bash
# Tout déployer
firebase deploy --project rpe-gen2-eeaee

# Seulement l'application
firebase deploy --only hosting --project rpe-gen2-eeaee

# Seulement les règles
firebase deploy --only firestore:rules --project rpe-gen2-eeaee

# Seulement les index
firebase deploy --only firestore:indexes --project rpe-gen2-eeaee
```

### Tester Localement

```bash
# Démarrer le serveur local (utilise automatiquement la config DEV)
firebase serve

# Ouvrir dans le navigateur
# http://localhost:5000
```

## ⚠️ Points d'Attention

### 1. Données Séparées

TEST et PRODUCTION ont des **bases de données séparées** :
- Les joueuses créées sur TEST n'existent pas sur PROD
- Les données RPE sont indépendantes
- Les règles Firestore doivent être déployées sur les deux projets

### 2. Index Firestore

Les index doivent être créés sur **les deux projets** :
```bash
# Sur TEST
firebase deploy --only firestore:indexes --project rpe-volleyball-sable

# Sur PRODUCTION
firebase deploy --only firestore:indexes --project rpe-gen2-eeaee
```

### 3. Règles Firestore

Les règles doivent être déployées sur **les deux projets** :
```bash
# Sur TEST
firebase deploy --only firestore:rules --project rpe-volleyball-sable

# Sur PRODUCTION
firebase deploy --only firestore:rules --project rpe-gen2-eeaee
```

## 🎯 Bonnes Pratiques

### ✅ À Faire

1. **Toujours tester sur TEST avant de déployer sur PROD**
2. **Vérifier la console (F12) pour les erreurs**
3. **Tester les deux rôles (coach et joueuse)**
4. **Attendre que les index soient créés (5-10 min)**
5. **Vider le cache après chaque déploiement** (`Ctrl+Shift+R`)

### ❌ À Éviter

1. **Ne jamais déployer directement sur PROD sans tester**
2. **Ne pas modifier les données de PROD pour tester**
3. **Ne pas oublier de déployer les règles et index**
4. **Ne pas confondre les projets dans les commandes**

## 🐛 Dépannage

### Erreur : "Missing or insufficient permissions"

**Cause** : Les règles Firestore ne sont pas déployées

**Solution** :
```bash
firebase deploy --only firestore:rules --project rpe-volleyball-sable
```

### Erreur : "The query requires an index"

**Cause** : Les index Firestore ne sont pas créés

**Solution** :
```bash
firebase deploy --only firestore:indexes --project rpe-volleyball-sable
```

Attendre 5-10 minutes que l'index soit créé.

### L'application utilise le mauvais projet

**Cause** : Cache du navigateur

**Solution** :
1. Vider le cache (`Ctrl+Shift+R`)
2. Ouvrir en navigation privée
3. Vérifier la console : doit afficher le bon projet

### Je ne sais pas sur quel environnement je suis

**Solution** : Ouvrir la console (F12) et chercher :
```
🔧 Firebase: Mode DÉVELOPPEMENT  → TEST
🚀 Firebase: Mode PRODUCTION     → PRODUCTION
```

## 📊 Résumé Visuel

```
┌─────────────────────────────────────────────────────────┐
│                   WORKFLOW DEV/PROD                      │
└─────────────────────────────────────────────────────────┘

1. DÉVELOPPER
   ↓
2. DÉPLOYER SUR TEST (rpe-volleyball-sable)
   ↓
3. TESTER SUR https://rpe-volleyball-sable.web.app/
   ↓
4. CORRIGER SI NÉCESSAIRE
   ↓
5. VALIDER ✅
   ↓
6. DÉPLOYER SUR PROD (rpe-gen2-eeaee)
   ↓
7. EN LIGNE SUR https://rpe-gen2-eeaee.web.app/
```

---

**Date de création** : Décembre 2024  
**Version** : 1.0  
**Statut** : ✅ Système opérationnel

