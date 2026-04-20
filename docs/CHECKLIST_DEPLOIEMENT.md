# ✅ Checklist de Déploiement - RPE Gen2

Cochez chaque étape au fur et à mesure de votre progression.

---

## 📦 Phase 1 : Préparation

- [ ] Archive `rpe-gen2.tar.gz` téléchargée
- [ ] Sauvegarde de l'ancien projet (si existant)
- [ ] Archive extraite dans le bon dossier
- [ ] Firebase CLI installé (`firebase --version`)
- [ ] Connexion à Firebase réussie (`firebase login`)

---

## 🔥 Phase 2 : Configuration Firebase Console

### Firestore Database
- [ ] Accès à https://console.firebase.google.com/project/rpe-gen2
- [ ] Firestore Database créé (mode natif)
- [ ] Région sélectionnée : `europe-west1`
- [ ] Règles de sécurité : Mode test activé

### Storage
- [ ] Firebase Storage activé
- [ ] Emplacement sans frais sélectionné
- [ ] Région sélectionnée : `US-CENTRAL1` (ou proche)

### Cloud Messaging
- [ ] Cloud Messaging activé
- [ ] Clé VAPID générée
- [ ] Clé VAPID copiée et sauvegardée

### Configuration API
- [ ] Configuration Firebase vérifiée dans "Paramètres du projet"
- [ ] `apiKey`, `projectId`, etc. notés

---

## 💻 Phase 3 : Configuration Locale

- [ ] Fichier `.firebaserc` vérifié (projet = `rpe-gen2`)
- [ ] Clé VAPID ajoutée dans `public/js/app.js` (ligne ~75)
- [ ] Configuration Firebase vérifiée dans `public/js/app.js` (lignes 1-9)
- [ ] Dépendances installées : `cd functions && npm install && cd ..`

---

## 🧪 Phase 4 : Tests Locaux (optionnel)

- [ ] Serveur local lancé : `firebase serve`
- [ ] Page accessible sur http://localhost:5000
- [ ] Formulaire de connexion visible
- [ ] Images (icônes) affichées correctement
- [ ] Serveur local arrêté (Ctrl+C)

---

## 🚀 Phase 5 : Déploiement

### Règles Firestore
- [ ] Commande exécutée : `firebase deploy --only firestore:rules`
- [ ] Message "Deploy complete!" affiché

### Application Web (Hosting)
- [ ] Commande exécutée : `firebase deploy --only hosting`
- [ ] Message "Deploy complete!" affiché
- [ ] URL affichée : https://rpe-gen2.web.app

### Cloud Functions
- [ ] Commande exécutée : `firebase deploy --only functions`
- [ ] 4 fonctions déployées avec succès :
  - [ ] `sendRPEReminderNotifications`
  - [ ] `updatePlayerStatuses`
  - [ ] `onCheckinCreated`
  - [ ] `sendTestNotification`

---

## ✅ Phase 6 : Vérification

### Application Web
- [ ] Site accessible : https://rpe-gen2.web.app
- [ ] Page de connexion s'affiche correctement
- [ ] Icônes et images visibles

### Test Connexion Joueuse
- [ ] Connexion réussie avec `Julia` / `pole`
- [ ] Dashboard joueuse affiché
- [ ] Onglets "Dashboard", "Check-in", "Log RPE" visibles

### Test Connexion Coach
- [ ] Déconnexion réussie
- [ ] Connexion réussie avec `coach` / `pole`
- [ ] Dashboard coach affiché
- [ ] Filtres "Toutes", "Optimal", "Attention", "Critique" visibles
- [ ] Bouton "+ Ajouter une joueuse" visible

### Firestore Database
- [ ] Collection `players` créée automatiquement
- [ ] 14 joueuses présentes dans la collection

### Cloud Functions
- [ ] 4 fonctions visibles dans Firebase Console > Functions
- [ ] Statut "Healthy" pour toutes les fonctions

### Test Check-in
- [ ] Check-in rempli en tant que joueuse
- [ ] Message de confirmation affiché
- [ ] Nouvelle entrée visible dans Firestore > `checkins`
- [ ] Score calculé automatiquement

---

## 🔔 Phase 7 : Notifications (optionnel)

### Test sur Mobile
- [ ] Site ouvert sur mobile (Safari/Chrome)
- [ ] Connexion en tant que joueuse
- [ ] Permission de notification demandée
- [ ] Permission accordée
- [ ] Token FCM sauvegardé dans Firestore > `fcmTokens`

### Test d'Envoi
- [ ] Notification de test envoyée depuis Firebase Console
- [ ] Notification reçue sur le mobile

---

## 📱 Phase 8 : Installation PWA (optionnel)

### iPhone
- [ ] Safari ouvert sur https://rpe-gen2.web.app
- [ ] Bouton "Partager" > "Sur l'écran d'accueil"
- [ ] Icône ajoutée à l'écran d'accueil
- [ ] App ouverte depuis l'icône
- [ ] Fonctionne comme une app native

### Android
- [ ] Chrome ouvert sur https://rpe-gen2.web.app
- [ ] Popup "Ajouter à l'écran d'accueil" affiché
- [ ] Icône ajoutée à l'écran d'accueil
- [ ] App ouverte depuis l'icône
- [ ] Fonctionne comme une app native

---

## 📊 Phase 9 : Monitoring

- [ ] Logs consultés : `firebase functions:log`
- [ ] Aucune erreur critique dans les logs
- [ ] Dashboard Firebase Analytics consulté
- [ ] Dashboard Hosting consulté

---

## 🎯 Résultat Final

**Si toutes les cases sont cochées, félicitations ! 🎉**

Votre application RPE Monitor Gen2 est :
- ✅ Déployée
- ✅ Fonctionnelle
- ✅ Accessible en ligne
- ✅ Prête à être utilisée par l'équipe

---

## 📝 Notes et Observations

Notez ici tout problème rencontré ou observation importante :

```
Date du déploiement : _______________

Problèmes rencontrés :
- 
- 
- 

Solutions appliquées :
- 
- 
- 

Temps total de déploiement : _______________

```

---

## 🔗 Liens Importants

- **Application** : https://rpe-gen2.web.app
- **Firebase Console** : https://console.firebase.google.com/project/rpe-gen2
- **Documentation** : Voir `README.md`
- **Guide complet** : Voir `GUIDE_COMPLET_DEPLOIEMENT.md`

---

**Mot de passe de l'application** : `pole`

**Bonne chance ! 🚀**

