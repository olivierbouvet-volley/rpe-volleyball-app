# 🗄️ Configuration Firestore Database - Guide Moderne

## ⚠️ Mise à Jour Importante

Firebase a modernisé l'interface de création de Firestore. Il n'y a plus de simple "mode test" vs "mode production", mais une configuration plus détaillée.

---

## 🔧 Configuration sur Firebase Console

### Étape 1 : Accéder à Firestore

1. Aller sur **Firebase Console** : https://console.firebase.google.com/project/rpe-gen2
2. Dans le menu de gauche, cliquer sur **"Firestore Database"**
3. Cliquer sur **"Créer une base de données"**

### Étape 2 : Choisir le Mode de Base de Données

Vous verrez deux options :

#### Option 1 : Firestore en mode natif (RECOMMANDÉ)
- Mode moderne et performant
- Toutes les fonctionnalités disponibles
- **C'est celui qu'il faut choisir**

#### Option 2 : Datastore en mode Firestore
- Mode de compatibilité avec l'ancien Datastore
- Ne PAS choisir cette option

**➡️ Sélectionner "Firestore en mode natif"**

### Étape 3 : Sélectionner l'Emplacement

**Emplacement de la base de données** : 

Choisir la région la plus proche de vos utilisateurs :
- **europe-west1** (Belgique) - RECOMMANDÉ pour l'Europe
- **europe-west3** (Francfort, Allemagne)
- **europe-west9** (Paris, France)
- **us-central1** (Iowa, USA)

⚠️ **IMPORTANT** : L'emplacement ne peut **PAS être changé** après création !

**Pour ce projet** : Choisir **europe-west1**

### Étape 4 : Configurer les Règles de Sécurité

Vous verrez deux options :

#### Option 1 : Démarrer en mode test (RECOMMANDÉ pour commencer)
- Accès en lecture/écriture temporaire (30 jours)
- Parfait pour le développement
- **Choisir cette option**

Les règles ressembleront à :
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 11, 19);
    }
  }
}
```

#### Option 2 : Démarrer en mode verrouillé
- Accès complètement bloqué
- Plus sécurisé mais nécessite de configurer les règles immédiatement
- Ne PAS choisir pour commencer

**➡️ Sélectionner "Démarrer en mode test"**

### Étape 5 : Créer la Base de Données

1. Vérifier que tout est correct :
   - Mode : **Firestore en mode natif**
   - Emplacement : **europe-west1**
   - Règles : **Mode test**

2. Cliquer sur **"Créer"**

3. Attendre quelques secondes (création en cours)

4. ✅ Firestore est maintenant activé !

---

## 📋 Résumé de la Configuration

| Paramètre | Valeur Recommandée |
|-----------|-------------------|
| **Mode de base de données** | Firestore en mode natif |
| **Emplacement** | europe-west1 (Belgique) |
| **Règles de sécurité initiales** | Mode test (30 jours) |

---

## 🔐 Règles de Sécurité

### Règles Initiales (Mode Test)

Après création, les règles par défaut sont :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 11, 19);
    }
  }
}
```

**Signification** :
- ✅ Lecture et écriture autorisées pour tout le monde
- ⏰ Expire automatiquement après 30 jours
- ⚠️ À sécuriser avant l'expiration

### Nos Règles Personnalisées

Le fichier `firestore.rules` dans le projet contient des règles similaires mais adaptées :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 11, 12);
    }
  }
}
```

Ces règles seront déployées automatiquement avec :
```bash
firebase deploy --only firestore:rules
```

---

## 🚀 Déploiement des Règles

### Méthode 1 : Déploiement automatique (RECOMMANDÉ)

Lors du déploiement complet :
```bash
firebase deploy
```

Les règles Firestore seront déployées automatiquement.

### Méthode 2 : Déploiement séparé

Pour déployer uniquement les règles Firestore :
```bash
firebase deploy --only firestore:rules
```

---

## ✅ Vérification

### Sur Firebase Console

1. Aller dans **Firestore Database**
2. Vous devriez voir :
   - Une interface vide (c'est normal)
   - Onglet "Données" (vide)
   - Onglet "Règles" (avec vos règles)
   - Onglet "Index" (vide pour l'instant)

### Après Premier Check-in

Après qu'une joueuse ait rempli son premier check-in, vous verrez :

**Collections créées automatiquement** :
- `players` - Liste des joueuses
- `checkins` - Check-ins quotidiens
- `rpe` - Enregistrements RPE

---

## 🔐 Sécurisation Future (Production)

### Avant l'Expiration des Règles Test

⚠️ **IMPORTANT** : Les règles "mode test" expirent après 30 jours !

Firebase vous enverra des emails de rappel avant l'expiration.

### Option 1 : Prolonger les Règles Temporaires

Modifier `firestore.rules` :
```javascript
match /{document=**} {
  allow read, write: if request.time < timestamp.date(2026, 1, 1);
}
```

Puis déployer :
```bash
firebase deploy --only firestore:rules
```

### Option 2 : Sécuriser avec Authentication (RECOMMANDÉ)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Collection players : lecture publique, écriture coach uniquement
    match /players/{playerId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.role == 'coach';
    }
    
    // Collection checkins : lecture/écriture pour la joueuse concernée
    match /checkins/{checkinId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Collection rpe : lecture/écriture pour la joueuse concernée
    match /rpe/{rpeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 🆘 Dépannage

### Problème : "Permission denied" lors de l'écriture

**Cause** : Les règles Firestore sont trop restrictives ou ont expiré

**Solution 1** : Vérifier les règles sur Firebase Console
1. Firestore Database > Règles
2. Vérifier la date d'expiration
3. Si expirée, prolonger la date

**Solution 2** : Redéployer les règles
```bash
firebase deploy --only firestore:rules
```

### Problème : "Database not found"

**Cause** : Firestore n'a pas été créé

**Solution** : Suivre les étapes 1-5 ci-dessus pour créer la base de données

### Problème : Mauvaise région sélectionnée

**⚠️ ATTENTION** : L'emplacement ne peut PAS être changé !

**Solution** : Il faut supprimer et recréer la base de données
1. Firebase Console > Firestore Database
2. Paramètres (engrenage)
3. Supprimer la base de données
4. Recréer avec la bonne région

---

## 📊 Structure des Collections

Après utilisation, Firestore contiendra :

```
rpe-gen2 (Database)
├── players/
│   ├── Julia
│   │   ├── name: "JULIA PROU"
│   │   ├── birthday: "16/01/10"
│   │   ├── photoURL: "https://..."
│   │   └── currentStatus: "optimal"
│   ├── Léa
│   └── ...
├── checkins/
│   ├── Julia_2025-10-19
│   │   ├── playerId: "Julia"
│   │   ├── date: "2025-10-19"
│   │   ├── sleep: 8
│   │   ├── soreness: 3
│   │   ├── stress: 4
│   │   ├── mood: 7
│   │   └── score: 7.5
│   └── ...
├── rpe/
│   ├── [auto-generated-id]
│   │   ├── playerId: "Julia"
│   │   ├── sessionType: "Entraînement Technique"
│   │   ├── rpe: 7
│   │   ├── duration: 90
│   │   └── load: 630
│   └── ...
└── fcmTokens/
    ├── Julia
    │   ├── token: "fcm_token_..."
    │   └── updatedAt: Timestamp
    └── ...
```

---

## 📋 Checklist Firestore

- [ ] Firestore Database créé sur Firebase Console
- [ ] Mode sélectionné : **Firestore en mode natif**
- [ ] Emplacement sélectionné : **europe-west1**
- [ ] Règles de sécurité : **Mode test** activé
- [ ] Fichier `firestore.rules` présent dans le projet
- [ ] Règles déployées : `firebase deploy --only firestore:rules`
- [ ] Test d'écriture réussi (check-in)
- [ ] Collections visibles dans Firestore Database

---

## 🎯 Résumé

**Configuration Moderne de Firestore** :

| Étape | Action | Choix |
|-------|--------|-------|
| 1 | Mode de base de données | **Firestore en mode natif** |
| 2 | Emplacement | **europe-west1** (Belgique) |
| 3 | Règles de sécurité | **Mode test** (30 jours) |
| 4 | Déploiement | `firebase deploy --only firestore:rules` |

**Différences avec l'ancienne interface** :
- ❌ Plus de simple "mode test" vs "mode production"
- ✅ Configuration plus détaillée et explicite
- ✅ Choix du mode de base de données (natif vs Datastore)
- ✅ Sélection de région plus claire

Tout est prêt pour stocker vos données ! 🚀

