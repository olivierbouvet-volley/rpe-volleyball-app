# 🎯 Fonctionnalités RPE Gen2 - Guide Complet

## 📱 Fonctionnalités pour les Joueuses

### 1. Connexion Simplifiée ✅
**Avant (V1)** :
- Nom
- Code équipe
- **Sélection du rôle** (Joueuse/Coach)

**Maintenant (V2)** :
- Nom
- Mot de passe : `pole`
- ~~Sélection du rôle~~ (détection automatique)

**Avantages** :
- Plus rapide
- Moins d'erreurs
- Support de l'auto-remplissage iPhone
- Détection automatique du rôle (joueuse ou coach)

### 2. Auto-remplissage iPhone 📲
**Comment ça marche** :
1. Ajouter l'app à l'écran d'accueil (voir instructions ci-dessous)
2. Lors de la première connexion, iPhone propose de sauvegarder le mot de passe
3. Aux connexions suivantes, le nom et mot de passe sont remplis automatiquement

**Attributs HTML utilisés** :
```html
<input autocomplete="username">    <!-- Pour le nom -->
<input autocomplete="current-password">  <!-- Pour le mot de passe -->
```

### 3. Notifications Push 🔔
**Fonctionnement** :
- **Quand** : Tous les jours à 11h45 (heure de Paris)
- **Condition** : Si le check-in quotidien n'a pas été rempli
- **Message** : "Bonjour [Prénom], n'oubliez pas de remplir votre check-in quotidien avant midi !"

**Activation** :
1. Lors de la première connexion, l'app demande la permission
2. Accepter les notifications
3. Le token est sauvegardé automatiquement

**Gestion** :
- Les notifications fonctionnent même si l'app est fermée
- Possibilité de désactiver dans les paramètres du téléphone
- Cliquer sur la notification ouvre directement l'app

### 4. Application PWA (Progressive Web App) 📱
**Avantages** :
- Icône personnalisée sur l'écran d'accueil
- Fonctionne comme une app native
- Pas besoin de l'App Store
- Mises à jour automatiques

**Installation sur iPhone** :
1. Ouvrir Safari
2. Aller sur https://rpe-gen2.web.app
3. Appuyer sur le bouton "Partager" (carré avec flèche vers le haut)
4. Sélectionner "Sur l'écran d'accueil"
5. Confirmer

**Installation sur Android** :
1. Ouvrir Chrome
2. Aller sur https://rpe-gen2.web.app
3. Appuyer sur "Ajouter à l'écran d'accueil" (popup automatique)
4. Confirmer

### 5. Dashboard Joueuse 📊
**Métriques affichées** :
- Score de préparation (moyenne sur 7 jours)
- État actuel (Optimal/Attention/Critique)
- Jauge de couleur visuelle

**Onglets** :
1. **Dashboard** : Vue d'ensemble de la forme
2. **Check-in** : Remplir le check-in quotidien
3. **Log RPE** : Enregistrer un RPE après l'entraînement

---

## 👨‍💼 Fonctionnalités pour le Coach

### 1. Vue d'Ensemble de l'Équipe 👥
**Affichage** :
- Grille avec toutes les joueuses
- Photo de profil de chaque joueuse
- Nom complet
- Score actuel (sur 10)
- Jauge de couleur (vert/orange/rouge)

### 2. Jauges de Couleur 🎨
**Système de couleurs** :
- 🟢 **Vert (Optimal)** : Score ≥ 7 → Joueuse en pleine forme
- 🟠 **Orange (Attention)** : 5 ≤ Score < 7 → Surveiller
- 🔴 **Rouge (Critique)** : Score < 5 → Intervention nécessaire

**Calcul du score** :
```
Score = (Sommeil + Humeur + (10 - Courbatures) + (10 - Stress)) / 4
```

**Exemple** :
- Sommeil : 8/10
- Humeur : 7/10
- Courbatures : 3/10 → (10 - 3) = 7
- Stress : 4/10 → (10 - 4) = 6
- **Score final** : (8 + 7 + 7 + 6) / 4 = **7.0** → 🟢 **Optimal**

### 3. Filtres Intelligents 🔍
**Boutons de filtre** :
- **👥 Toutes** : Affiche toutes les joueuses
- **✅ Optimal** : Uniquement les joueuses en forme (vert)
- **⚠️ Attention** : Uniquement les joueuses à surveiller (orange)
- **🚨 Critique** : Uniquement les joueuses en état critique (rouge)

**Compteurs en temps réel** :
Chaque bouton affiche le nombre de joueuses dans la catégorie.

**Exemple d'utilisation** :
1. Cliquer sur "🚨 Critique" pour voir rapidement qui a besoin d'attention
2. Contacter ces joueuses pour adapter l'entraînement
3. Cliquer sur "✅ Optimal" pour voir qui peut être poussé davantage

### 4. Gestion des Joueuses ➕
**Ajouter une nouvelle joueuse** :
1. Cliquer sur "+ Ajouter une joueuse"
2. Remplir le formulaire :
   - **Photo** : Cliquer pour uploader (optionnel)
   - **Nom complet** : Ex: "JULIA PROU"
   - **ID** : Identifiant unique, ex: "Julia"
   - **Date de naissance** : Format JJ/MM/AA, ex: "16/01/10"
3. Cliquer sur "Enregistrer"

**Upload de photos** :
- Formats acceptés : JPG, PNG
- Taille recommandée : 500x500px minimum
- Stockage : Firebase Storage
- Affichage : Automatique dans la grille

**Modification** :
- Les photos sont stockées dans Firebase Storage
- Possibilité de modifier via la console Firebase
- URL générée automatiquement et sécurisée

### 5. Suivi Historique 📈
**Données disponibles** :
- Historique des check-ins (7 derniers jours)
- Évolution du score dans le temps
- Tendances de forme

**Mise à jour automatique** :
- Toutes les 6 heures via Cloud Functions
- Calcul automatique lors de chaque nouveau check-in
- Synchronisation en temps réel

---

## ⚙️ Fonctionnalités Techniques

### 1. Cloud Functions ☁️
**Fonctions automatisées** :

#### `sendRPEReminderNotifications`
- **Quand** : Tous les jours à 11h45
- **Action** : Envoie une notification aux joueuses qui n'ont pas rempli leur check-in
- **Timezone** : Europe/Paris

#### `updatePlayerStatuses`
- **Quand** : Toutes les 6 heures
- **Action** : Recalcule et met à jour les statuts de toutes les joueuses

#### `onCheckinCreated`
- **Quand** : À chaque nouveau check-in
- **Action** : Calcule automatiquement le score et le statut

#### `sendTestNotification`
- **Quand** : Sur demande (fonction callable)
- **Action** : Envoie une notification de test

### 2. Base de Données Firestore 🗄️
**Collections** :

#### `players`
```javascript
{
  id: "Julia",
  name: "JULIA PROU",
  birthday: "16/01/10",
  photoURL: "https://...",
  currentStatus: "optimal",
  currentScore: 7.5,
  lastStatusUpdate: Timestamp
}
```

#### `checkins`
```javascript
{
  playerId: "Julia",
  date: "2025-10-17",
  sleep: 8,
  soreness: 3,
  stress: 4,
  mood: 7,
  score: 7.0,
  status: "optimal",
  timestamp: Timestamp
}
```

#### `rpe`
```javascript
{
  playerId: "Julia",
  date: "2025-10-17",
  sessionType: "Entraînement Technique",
  rpe: 7,
  duration: 90,
  load: 630,
  timestamp: Timestamp
}
```

#### `fcmTokens`
```javascript
{
  playerId: "Julia",
  token: "fcm_token_here",
  updatedAt: Timestamp
}
```

### 3. Storage Firebase 📦
**Structure** :
```
players/
  ├── Julia/
  │   └── photo.jpg
  ├── Léa/
  │   └── photo.jpg
  └── ...
```

### 4. Service Worker 🔧
**Fichier** : `firebase-messaging-sw.js`

**Fonctions** :
- Réception des notifications en arrière-plan
- Affichage des notifications même si l'app est fermée
- Gestion des clics sur les notifications

---

## 🔐 Sécurité

### Authentification
- Pas d'authentification Firebase Auth (pour simplifier)
- Vérification par mot de passe unique : `pole`
- Détection automatique du rôle basée sur le nom

### Règles Firestore
**À mettre à jour pour la production** :
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règles à personnaliser selon vos besoins
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 11, 12);
    }
  }
}
```

**Recommandations pour la production** :
1. Implémenter Firebase Authentication
2. Restreindre l'accès en lecture/écriture par utilisateur
3. Valider les données côté serveur

---

## 📊 Métriques et Analytics

### Données collectées
- Nombre de check-ins par jour
- Taux de remplissage
- Distribution des scores
- Évolution dans le temps

### Tableaux de bord disponibles
- Firebase Console > Analytics
- Firebase Console > Cloud Functions (logs)
- Firebase Console > Firestore (données brutes)

---

## 🎯 Cas d'Usage

### Scénario 1 : Joueuse se connecte le matin
1. Ouvre l'app depuis l'écran d'accueil
2. Nom et mot de passe remplis automatiquement
3. Appuie sur "Se connecter"
4. Va dans l'onglet "Check-in"
5. Remplit les 4 sliders
6. Enregistre
7. Voit son score mis à jour dans le Dashboard

### Scénario 2 : Joueuse oublie le check-in
1. 11h45 : Notification reçue
2. Clique sur la notification
3. App s'ouvre directement
4. Remplit le check-in
5. Notification ne sera plus envoyée aujourd'hui

### Scénario 3 : Coach vérifie l'équipe
1. Se connecte avec "coach" / "pole"
2. Voit la grille avec toutes les joueuses
3. Clique sur "🚨 Critique" pour voir qui va mal
4. Identifie 2 joueuses en rouge
5. Adapte l'entraînement en conséquence

### Scénario 4 : Nouvelle joueuse arrive
1. Coach clique sur "+ Ajouter une joueuse"
2. Upload la photo
3. Remplit nom, ID, date de naissance
4. Enregistre
5. La joueuse apparaît immédiatement dans la grille
6. Elle peut se connecter dès maintenant

---

## 🚀 Évolutions Futures Possibles

### Court terme
- [ ] Graphiques d'évolution pour chaque joueuse
- [ ] Export des données en CSV
- [ ] Commentaires du coach sur les check-ins
- [ ] Notifications personnalisées par joueuse

### Moyen terme
- [ ] Authentification Firebase complète
- [ ] Rôles et permissions granulaires
- [ ] Historique complet (plus de 7 jours)
- [ ] Statistiques d'équipe avancées

### Long terme
- [ ] Intelligence artificielle pour prédire les blessures
- [ ] Intégration avec des capteurs (montres connectées)
- [ ] Application mobile native (iOS/Android)
- [ ] Comparaison avec d'autres équipes

---

## 📞 Support et Contact

**En cas de problème** :
1. Consulter le fichier `README.md`
2. Consulter le fichier `DEPLOIEMENT_RAPIDE.md`
3. Vérifier les logs : `firebase functions:log`
4. Contacter : olivier.bouvet@thebridgevb.com

**Ressources** :
- Firebase Console : https://console.firebase.google.com/project/rpe-gen2
- Documentation Firebase : https://firebase.google.com/docs
- Application en ligne : https://rpe-gen2.web.app

