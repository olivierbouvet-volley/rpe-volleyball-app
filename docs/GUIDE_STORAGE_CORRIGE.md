# 📦 Configuration Firebase Storage - Guide Corrigé

## ⚠️ Correction Importante

Firebase Storage **n'a plus de "mode test"** comme Firestore. La configuration est différente.

---

## 🔧 Configuration sur Firebase Console

### Étape 1 : Activer Firebase Storage

1. Aller sur **Firebase Console** : https://console.firebase.google.com/project/rpe-gen2
2. Dans le menu de gauche, cliquer sur **"Storage"**
3. Cliquer sur **"Commencer"**

### Étape 2 : Choisir l'emplacement

Vous verrez deux options :

#### Option 1 : Emplacement sans frais (RECOMMANDÉ pour commencer)
- **Référence du bucket** : `gs://rpe-gen2.firebasestorage.app`
- **Classe de stockage** : Regional
- **Emplacement** : Sélectionner **US-CENTRAL1** (ou la région la plus proche)
- **Fréquence d'accès** : Standard

#### Option 2 : Tous les emplacements
- Plus d'options de régions
- Coûts potentiellement plus élevés

**Pour ce projet, choisir "Emplacement sans frais"**

### Étape 3 : Valider

1. Cliquer sur **"Continuer"**
2. Storage est maintenant activé !

---

## 🔐 Configuration des Règles de Sécurité

### Étape 1 : Aller dans les règles

1. Dans Storage, cliquer sur l'onglet **"Règles"**
2. Vous verrez les règles par défaut (très restrictives)

### Étape 2 : Modifier les règles

Les règles par défaut ressemblent à :
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**⚠️ Ces règles bloquent TOUT accès !**

### Étape 3 : Utiliser nos règles personnalisées

Nous avons créé un fichier `storage.rules` dans le projet qui permet :
- ✅ Lecture publique des photos des joueuses
- ✅ Écriture pour uploader les photos
- ⏰ Règles temporaires (à sécuriser plus tard)

**Les règles seront déployées automatiquement** avec la commande :
```bash
firebase deploy --only storage
```

---

## 📝 Règles de Sécurité Incluses

Le fichier `storage.rules` contient :

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    
    // Photos des joueuses
    match /players/{playerId}/{allPaths=**} {
      allow read: if true;  // Tout le monde peut voir
      allow write: if true; // Tout le monde peut uploader (à sécuriser)
    }
    
    // Règle temporaire générale
    match /{allPaths=**} {
      allow read, write: if request.time < timestamp.date(2025, 11, 12);
    }
  }
}
```

---

## 🚀 Déploiement des Règles Storage

### Méthode 1 : Déploiement automatique (RECOMMANDÉ)

Lors du déploiement complet :
```bash
firebase deploy
```

Les règles Storage seront déployées automatiquement.

### Méthode 2 : Déploiement séparé

Pour déployer uniquement les règles Storage :
```bash
firebase deploy --only storage
```

---

## ✅ Vérification

### Sur Firebase Console

1. Aller dans **Storage** > **Règles**
2. Vérifier que les règles ont bien été mises à jour
3. Vous devriez voir nos règles personnalisées

### Test d'Upload

1. Se connecter en tant que coach sur l'application
2. Cliquer sur **"+ Ajouter une joueuse"**
3. Uploader une photo
4. Vérifier que la photo apparaît dans Storage > Files

---

## 📊 Structure des Fichiers dans Storage

Après upload, vous verrez dans Storage :

```
players/
  ├── Julia/
  │   └── photo.jpg
  ├── Léa/
  │   └── photo.jpg
  └── ...
```

---

## 🔐 Sécurisation Future (Production)

Pour la production, il faudra sécuriser davantage :

### Option 1 : Avec Firebase Authentication

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /players/{playerId}/{allPaths=**} {
      // Lecture publique
      allow read: if true;
      
      // Écriture uniquement pour les utilisateurs authentifiés
      allow write: if request.auth != null;
    }
  }
}
```

### Option 2 : Restriction par rôle

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /players/{playerId}/{allPaths=**} {
      // Lecture publique
      allow read: if true;
      
      // Écriture uniquement pour les coaches
      allow write: if request.auth != null 
                   && request.auth.token.role == 'coach';
    }
  }
}
```

---

## 🆘 Dépannage

### Problème : "Permission denied" lors de l'upload

**Cause** : Les règles Storage sont trop restrictives

**Solution 1** : Déployer nos règles
```bash
firebase deploy --only storage
```

**Solution 2** : Modifier manuellement sur Firebase Console
1. Storage > Règles
2. Remplacer par nos règles (voir ci-dessus)
3. Cliquer sur "Publier"

### Problème : Les photos ne s'affichent pas

**Cause** : URL de Storage incorrecte

**Vérification** :
1. Firebase Console > Storage > Files
2. Cliquer sur une photo
3. Copier l'URL publique
4. Vérifier qu'elle commence par `https://firebasestorage.googleapis.com/...`

---

## 📋 Récapitulatif des Commandes

```bash
# Déployer tout (incluant Storage)
firebase deploy

# Déployer uniquement Storage
firebase deploy --only storage

# Déployer Firestore + Storage
firebase deploy --only firestore,storage
```

---

## ✅ Checklist Storage

- [ ] Storage activé sur Firebase Console
- [ ] Emplacement sélectionné (US-CENTRAL1 recommandé)
- [ ] Fichier `storage.rules` présent dans le projet
- [ ] `firebase.json` contient la section `storage`
- [ ] Règles déployées : `firebase deploy --only storage`
- [ ] Test d'upload réussi
- [ ] Photos visibles dans Storage > Files

---

## 🎯 Résumé

**Différences clés avec Firestore** :

| Aspect | Firestore | Storage |
|--------|-----------|---------|
| **Mode test** | ✅ Existe | ❌ N'existe pas |
| **Configuration initiale** | Mode test ou production | Emplacement uniquement |
| **Règles par défaut** | Accès temporaire | Accès bloqué |
| **Déploiement des règles** | `firebase deploy --only firestore` | `firebase deploy --only storage` |

**Pour ce projet** :
1. ✅ Activer Storage avec "Emplacement sans frais"
2. ✅ Déployer nos règles personnalisées
3. ✅ Tester l'upload de photos

Tout est prêt ! 🚀

