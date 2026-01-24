# RPE Monitor Gen2 - Pôle Espoir Volleyball Sablé

## 🎯 Nouvelles fonctionnalités V2

### Pour les joueuses
- ✅ **Connexion simplifiée** : Plus besoin de sélectionner le rôle, juste nom + mot de passe
- ✅ **Auto-remplissage** : Support du remplissage automatique sur iPhone (autocomplete)
- ✅ **Nouveau mot de passe** : `pole` (au lieu du code équipe)
- ✅ **Notifications push** : Rappel automatique avant midi si le check-in n'est pas rempli
- ✅ **Support PWA** : Ajout à l'écran d'accueil avec icône personnalisée

### Pour le coach
- ✅ **Gestion des joueuses** : Ajouter de nouvelles joueuses directement depuis le dashboard
- ✅ **Photos de profil** : Upload et affichage des photos de chaque joueuse
- ✅ **Jauges de couleur** : Visualisation de l'état avec des jauges (vert/orange/rouge)
- ✅ **Filtres intelligents** : Raccourcis pour voir uniquement les joueuses en état Optimal, Attention ou Critique
- ✅ **Compteurs en temps réel** : Nombre de joueuses par catégorie

## 🚀 Déploiement

### Prérequis
- Node.js 18+ installé
- Firebase CLI installé : `npm install -g firebase-tools`
- Compte Firebase avec le projet `rpe-gen2` créé

### Étape 1 : Connexion à Firebase
```bash
firebase login
```

### Étape 2 : Vérifier la configuration
```bash
cd /home/ubuntu/rpe-gen2
firebase projects:list
```

### Étape 3 : Déployer l'application web
```bash
firebase deploy --only hosting
```

### Étape 4 : Installer les dépendances des Cloud Functions
```bash
cd functions
npm install
cd ..
```

### Étape 5 : Déployer les Cloud Functions
```bash
firebase deploy --only functions
```

### Étape 6 : Configurer les règles Firestore
```bash
firebase deploy --only firestore:rules
```

## 📱 Configuration des notifications push

### 1. Obtenir la clé VAPID
1. Aller dans Firebase Console > Project Settings > Cloud Messaging
2. Sous "Web Push certificates", générer une nouvelle paire de clés
3. Copier la clé publique (VAPID key)

### 2. Mettre à jour le code
Dans `public/js/app.js`, ligne ~75, remplacer :
```javascript
vapidKey: 'VOTRE_VAPID_KEY'
```
par votre clé VAPID.

### 3. Activer Cloud Messaging
Dans Firebase Console :
- Aller dans Cloud Messaging
- Activer l'API Cloud Messaging (si ce n'est pas déjà fait)

## 🔐 Configuration de Firebase

### Firestore Database
Collections créées automatiquement :
- `players` : Informations des joueuses
- `checkins` : Check-ins quotidiens
- `rpe` : Enregistrements RPE
- `fcmTokens` : Tokens pour les notifications push

### Storage
Dossier créé automatiquement :
- `players/{playerId}/` : Photos de profil des joueuses

### Cloud Functions
Fonctions déployées :
- `sendRPEReminderNotifications` : Envoi quotidien à 11h45
- `updatePlayerStatuses` : Mise à jour des statuts toutes les 6h
- `onCheckinCreated` : Calcul automatique du score lors d'un check-in
- `sendTestNotification` : Fonction de test pour les notifications

## 🎨 Structure du projet

```
rpe-gen2/
├── public/
│   ├── index.html              # Page principale
│   ├── js/
│   │   └── app.js              # Logique de l'application
│   ├── img/
│   │   ├── icon-192.png        # Icône PWA 192x192
│   │   ├── icon-512.png        # Icône PWA 512x512
│   │   ├── badge-72.png        # Badge pour notifications
│   │   └── default-avatar.png  # Avatar par défaut
│   ├── manifest/
│   │   └── manifest.json       # Manifest PWA
│   └── firebase-messaging-sw.js # Service Worker
├── functions/
│   ├── index.js                # Cloud Functions
│   └── package.json            # Dépendances
├── firebase.json               # Configuration Firebase
├── firestore.rules             # Règles de sécurité Firestore
└── .firebaserc                 # Projet Firebase

```

## 📊 Système de scoring

### Calcul du score de préparation
```
Score = (Sommeil + Humeur + (10 - Courbatures) + (10 - Stress)) / 4
```

### Catégories de statut
- **Optimal** (vert) : Score ≥ 7
- **Attention** (orange) : 5 ≤ Score < 7
- **Critique** (rouge) : Score < 5

## 🔧 Maintenance

### Voir les logs des Cloud Functions
```bash
firebase functions:log
```

### Tester localement
```bash
firebase emulators:start
```

### Mettre à jour les règles Firestore
Modifier `firestore.rules` puis :
```bash
firebase deploy --only firestore:rules
```

## 📱 Installation sur iPhone

1. Ouvrir Safari et aller sur https://rpe-gen2.web.app
2. Appuyer sur le bouton "Partager" (icône carré avec flèche)
3. Sélectionner "Sur l'écran d'accueil"
4. Confirmer

L'application apparaîtra comme une app native avec l'icône personnalisée !

## 🔑 Identifiants par défaut

**Mot de passe** : `pole`

**Joueuses** (utiliser le prénom ou le nom complet) :
- Julia, Léa, Eline, Chloé, Nine, Cyrielle, Rose, Lovely, Lilou, Mélina, Lise, Zoe, Nélia, Charlotte

**Coach** : 
- Nom : `coach`, `olivier` ou `test`

## 📞 Support

Pour toute question ou problème :
- Email : olivier.bouvet@thebridgevb.com
- Firebase Console : https://console.firebase.google.com/project/rpe-gen2

## 📝 Notes de version

### Version 2.0.0 (Octobre 2025)
- ✨ Connexion simplifiée sans sélection de rôle
- 🔔 Notifications push avant midi
- 📸 Gestion des photos de profil
- 🎨 Jauges de couleur pour visualiser l'état
- 🔍 Filtres intelligents pour le coach
- 📱 Support PWA complet
- ☁️ Cloud Functions pour automatisation

### Version 1.0.0
- Version initiale avec check-in et RPE

