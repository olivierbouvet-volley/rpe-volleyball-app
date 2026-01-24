# 🚀 Guide Complet de Déploiement - RPE Gen2

## ✅ Contenu de l'Archive

L'archive `rpe-gen2.tar.gz` contient **TOUS** les fichiers nécessaires :

```
rpe-gen2/
├── .firebaserc                      # Configuration du projet Firebase
├── .gitignore                       # Fichiers à ignorer
├── firebase.json                    # Configuration Firebase
├── firestore.rules                  # Règles de sécurité Firestore
├── firestore.indexes.json           # Index Firestore
├── README.md                        # Documentation technique
├── DEPLOIEMENT_RAPIDE.md           # Guide de déploiement rapide
├── FONCTIONNALITES_V2.md           # Guide des fonctionnalités
├── public/                          # Dossier de l'application web
│   ├── index.html                  # Page principale
│   ├── firebase-messaging-sw.js    # Service Worker pour notifications
│   ├── css/                        # Dossier CSS (vide pour l'instant)
│   ├── js/
│   │   └── app.js                  # Code JavaScript principal
│   ├── img/
│   │   ├── icon-192.png           # Icône PWA 192x192
│   │   ├── icon-512.png           # Icône PWA 512x512
│   │   ├── badge-72.png           # Badge notifications
│   │   └── default-avatar.png     # Avatar par défaut
│   └── manifest/
│       └── manifest.json          # Manifest PWA
└── functions/                      # Cloud Functions
    ├── index.js                   # Code des fonctions
    └── package.json               # Dépendances

```

**✅ OUI, vous pouvez extraire et tout remplacer dans votre projet !**

---

## 📋 PARTIE 1 : Préparation Locale

### Étape 1.1 : Sauvegarder votre ancien projet (optionnel mais recommandé)

```bash
# Si vous avez déjà un projet rpe-gen2
mv rpe-gen2 rpe-gen2-backup-$(date +%Y%m%d)
```

### Étape 1.2 : Extraire l'archive

```bash
# Aller dans le dossier où vous voulez installer le projet
cd /chemin/vers/votre/dossier

# Extraire l'archive
tar -xzf rpe-gen2.tar.gz

# Vérifier que tout est bien extrait
cd rpe-gen2
ls -la
```

Vous devriez voir tous les fichiers listés ci-dessus.

### Étape 1.3 : Installer Firebase CLI (si pas déjà fait)

```bash
# Installer Firebase CLI globalement
npm install -g firebase-tools

# Vérifier l'installation
firebase --version
```

### Étape 1.4 : Se connecter à Firebase

```bash
firebase login
```

Une page web s'ouvrira pour vous connecter avec votre compte Google.

---

## 🔥 PARTIE 2 : Configuration sur Firebase Console

### Étape 2.1 : Accéder à Firebase Console

1. Ouvrir votre navigateur
2. Aller sur : **https://console.firebase.google.com/project/rpe-gen2/overview**
3. Vous devriez voir le tableau de bord de votre projet `rpe-gen2`

### Étape 2.2 : Vérifier la configuration du projet

#### A. Vérifier Firestore Database

1. Dans le menu de gauche, cliquer sur **"Firestore Database"**
2. Si la base de données n'existe pas encore :
   - Cliquer sur **"Créer une base de données"**
   - Choisir **"Démarrer en mode test"** (pour commencer)
   - Sélectionner la région : **europe-west1** (ou la plus proche)
   - Cliquer sur **"Activer"**

3. Une fois créée, vous verrez l'interface Firestore vide (c'est normal)

#### B. Vérifier Firebase Storage

1. Dans le menu de gauche, cliquer sur **"Storage"**
2. Si Storage n'est pas activé :
   - Cliquer sur **"Commencer"**
   - ⚠️ **IMPORTANT** : Il n'y a PAS de "mode test" pour Storage
   - Choisir **"Emplacement sans frais"** (recommandé)
   - **Référence du bucket** : `gs://rpe-gen2.firebasestorage.app`
   - **Emplacement** : Sélectionner **US-CENTRAL1** (ou votre région)
   - **Fréquence d'accès** : Standard
   - Cliquer sur **"Continuer"**

3. Storage est maintenant prêt pour stocker les photos des joueuses
4. Les règles de sécurité seront déployées automatiquement via `firebase deploy`

#### C. Vérifier Firebase Hosting

1. Dans le menu de gauche, cliquer sur **"Hosting"**
2. Si Hosting n'est pas configuré :
   - Cliquer sur **"Commencer"**
   - Suivre les instructions (nous le ferons en ligne de commande plus tard)

#### D. Activer Cloud Messaging (pour les notifications)

1. Dans le menu de gauche, cliquer sur **"Cloud Messaging"**
2. Si ce n'est pas activé, cliquer sur **"Activer"**

### Étape 2.3 : Obtenir la clé VAPID (IMPORTANT pour les notifications)

1. Aller dans **"Paramètres du projet"** (icône engrenage en haut à gauche)
2. Cliquer sur l'onglet **"Cloud Messaging"**
3. Descendre jusqu'à **"Certificats push Web"**
4. Cliquer sur **"Générer une nouvelle paire de clés"**
5. **COPIER** la clé qui apparaît (elle ressemble à : `BKxxx...xxx`)

**⚠️ IMPORTANT** : Gardez cette clé, nous allons l'utiliser à l'étape 3.2

### Étape 2.4 : Vérifier la configuration de l'API

1. Toujours dans **"Paramètres du projet"**
2. Onglet **"Général"**
3. Descendre jusqu'à **"Vos applications"**
4. Vous devriez voir une application Web
5. Vérifier que la configuration correspond à celle dans `public/js/app.js` :
   - `apiKey`
   - `authDomain`
   - `projectId`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

**Si les valeurs sont différentes**, il faudra les mettre à jour dans le fichier `public/js/app.js`

---

## 💻 PARTIE 3 : Configuration Locale du Projet

### Étape 3.1 : Vérifier la configuration Firebase

```bash
cd rpe-gen2

# Vérifier que le projet est bien configuré
cat .firebaserc
```

Vous devriez voir :
```json
{
  "projects": {
    "default": "rpe-gen2"
  }
}
```

Si ce n'est pas le cas, modifier le fichier :
```bash
nano .firebaserc
```

### Étape 3.2 : Ajouter la clé VAPID dans le code

**⚠️ ÉTAPE CRUCIALE pour les notifications**

1. Ouvrir le fichier `public/js/app.js` :
```bash
nano public/js/app.js
```

2. Chercher la ligne (environ ligne 75) :
```javascript
vapidKey: 'VOTRE_VAPID_KEY'
```

3. Remplacer `VOTRE_VAPID_KEY` par la clé copiée à l'étape 2.3

4. Sauvegarder (Ctrl+O, Enter, Ctrl+X)

### Étape 3.3 : Vérifier la configuration Firebase dans app.js

1. Ouvrir `public/js/app.js`
2. Vérifier les lignes 1-9 :
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyCWqVPOyOvvfRjzJFNqUbLFJsXdVxJPZhw",
    authDomain: "rpe-gen2.firebaseapp.com",
    projectId: "rpe-gen2",
    storageBucket: "rpe-gen2.firebasestorage.app",
    messagingSenderId: "1016698267942",
    appId: "1:1016698267942:web:e4a8c0d0e0e4a8c0e0e4a8"
};
```

3. **Si différent** de votre configuration Firebase Console (étape 2.4), remplacer par les bonnes valeurs

### Étape 3.4 : Installer les dépendances des Cloud Functions

```bash
cd functions
npm install
cd ..
```

Cela va installer :
- `firebase-admin`
- `firebase-functions`

---

## 🚀 PARTIE 4 : Déploiement

### Étape 4.1 : Tester localement (optionnel mais recommandé)

```bash
# Lancer le serveur local
firebase serve
```

Ouvrir votre navigateur sur : **http://localhost:5000**

Vérifier que :
- La page se charge correctement
- Le formulaire de connexion s'affiche
- Les images (icônes) sont visibles

**Appuyer sur Ctrl+C** pour arrêter le serveur local

### Étape 4.2 : Déployer les règles Firestore et Storage

```bash
firebase deploy --only firestore:rules,storage
```

Vous devriez voir :
```
✔  Deploy complete!
```

Cela déploie :
- Les règles Firestore (`firestore.rules`)
- Les règles Storage (`storage.rules`)

### Étape 4.3 : Déployer l'application web (Hosting)

```bash
firebase deploy --only hosting
```

Attendre environ 30 secondes. Vous devriez voir :
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/rpe-gen2/overview
Hosting URL: https://rpe-gen2.web.app
```

**🎉 Votre site est maintenant en ligne !**

### Étape 4.4 : Déployer les Cloud Functions

```bash
firebase deploy --only functions
```

**⚠️ Attention** : Cette étape peut prendre 2-5 minutes.

Vous devriez voir :
```
✔  functions[sendRPEReminderNotifications] Successful create operation.
✔  functions[updatePlayerStatuses] Successful create operation.
✔  functions[onCheckinCreated] Successful create operation.
✔  functions[sendTestNotification] Successful create operation.
```

---

## ✅ PARTIE 5 : Vérification du Déploiement

### Étape 5.1 : Tester l'application web

1. Ouvrir votre navigateur
2. Aller sur : **https://rpe-gen2.web.app**
3. Vous devriez voir la page de connexion

### Étape 5.2 : Tester la connexion

**Test 1 : Connexion Joueuse**
- Nom : `Julia`
- Mot de passe : `pole`
- Cliquer sur "Se connecter"
- Vous devriez arriver sur le dashboard de Julia

**Test 2 : Connexion Coach**
- Se déconnecter
- Nom : `coach`
- Mot de passe : `pole`
- Cliquer sur "Se connecter"
- Vous devriez arriver sur le dashboard coach

### Étape 5.3 : Vérifier Firestore

1. Retourner sur Firebase Console
2. Aller dans **"Firestore Database"**
3. Vous devriez voir la collection `players` avec les 14 joueuses créées automatiquement

### Étape 5.4 : Vérifier les Cloud Functions

1. Dans Firebase Console, aller dans **"Functions"**
2. Vous devriez voir 4 fonctions déployées :
   - `sendRPEReminderNotifications`
   - `updatePlayerStatuses`
   - `onCheckinCreated`
   - `sendTestNotification`

### Étape 5.5 : Tester un check-in

1. Sur l'application, connectez-vous en tant que joueuse
2. Aller dans l'onglet **"Check-in"**
3. Remplir les 4 sliders
4. Cliquer sur **"Enregistrer le check-in"**
5. Retourner sur Firebase Console > Firestore
6. Vous devriez voir une nouvelle entrée dans la collection `checkins`

---

## 🔔 PARTIE 6 : Activer les Notifications (optionnel)

### Étape 6.1 : Tester sur mobile

1. Ouvrir Safari (iPhone) ou Chrome (Android)
2. Aller sur https://rpe-gen2.web.app
3. Se connecter en tant que joueuse
4. Accepter les notifications quand demandé
5. Le token FCM sera sauvegardé automatiquement

### Étape 6.2 : Vérifier les tokens

1. Firebase Console > Firestore
2. Vérifier la collection `fcmTokens`
3. Vous devriez voir un document avec votre token

### Étape 6.3 : Tester l'envoi de notification

Les notifications seront envoyées automatiquement tous les jours à 11h45.

Pour tester immédiatement, vous pouvez :
1. Aller dans Firebase Console > Cloud Messaging
2. Cliquer sur "Envoyer votre premier message"
3. Remplir le formulaire et envoyer

---

## 📱 PARTIE 7 : Installation PWA sur Mobile

### Sur iPhone (Safari)

1. Ouvrir Safari
2. Aller sur https://rpe-gen2.web.app
3. Appuyer sur le bouton **"Partager"** (carré avec flèche vers le haut)
4. Faire défiler et sélectionner **"Sur l'écran d'accueil"**
5. Modifier le nom si souhaité
6. Appuyer sur **"Ajouter"**

L'icône de l'app apparaît sur l'écran d'accueil !

### Sur Android (Chrome)

1. Ouvrir Chrome
2. Aller sur https://rpe-gen2.web.app
3. Un popup apparaît : **"Ajouter RPE Monitor à l'écran d'accueil"**
4. Appuyer sur **"Ajouter"**
5. Confirmer

---

## 🔧 PARTIE 8 : Dépannage

### Problème 1 : "Error: No project active"

**Solution** :
```bash
firebase use rpe-gen2
```

### Problème 2 : "Permission denied"

**Solution** :
```bash
firebase login --reauth
```

### Problème 3 : "Functions deployment failed"

**Solution** :
```bash
cd functions
rm -rf node_modules package-lock.json
npm install
cd ..
firebase deploy --only functions
```

### Problème 4 : Les images ne s'affichent pas

**Vérifier** :
```bash
ls -la public/img/
```

Vous devriez voir :
- icon-192.png
- icon-512.png
- badge-72.png
- default-avatar.png

Si manquant, les images sont dans l'archive.

### Problème 5 : Les notifications ne fonctionnent pas

**Vérifier** :
1. La clé VAPID est bien configurée dans `public/js/app.js`
2. Cloud Messaging est activé dans Firebase Console
3. Les permissions sont accordées sur le téléphone

---

## 📊 PARTIE 9 : Suivi et Monitoring

### Voir les logs des Cloud Functions

```bash
firebase functions:log
```

### Voir les logs en temps réel

```bash
firebase functions:log --only sendRPEReminderNotifications
```

### Consulter les statistiques

1. Firebase Console > Analytics
2. Firebase Console > Hosting > Dashboard
3. Firebase Console > Functions > Dashboard

---

## 🎯 Récapitulatif des Commandes

```bash
# 1. Extraction
tar -xzf rpe-gen2.tar.gz
cd rpe-gen2

# 2. Connexion Firebase
firebase login
firebase use rpe-gen2

# 3. Installation des dépendances
cd functions && npm install && cd ..

# 4. Déploiement complet
firebase deploy

# OU déploiement séparé
firebase deploy --only firestore:rules
firebase deploy --only hosting
firebase deploy --only functions

# 5. Vérification
firebase functions:log
```

---

## 🎉 Félicitations !

Votre application **RPE Monitor Gen2** est maintenant déployée et opérationnelle !

**URLs importantes** :
- Application : https://rpe-gen2.web.app
- Console Firebase : https://console.firebase.google.com/project/rpe-gen2

**Identifiants de test** :
- Mot de passe : `pole`
- Joueuses : Julia, Léa, Eline, etc.
- Coach : coach, olivier, test

---

## 📞 Besoin d'aide ?

Si vous rencontrez un problème :
1. Consulter la section **"Dépannage"** ci-dessus
2. Vérifier les logs : `firebase functions:log`
3. Consulter la documentation : `README.md`

Bon déploiement ! 🚀

