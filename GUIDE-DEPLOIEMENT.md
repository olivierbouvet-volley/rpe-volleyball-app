# 🚀 Guide de Déploiement - RPE Volleyball Sablé

## Configuration

**Projet Firebase** : `rpe-volleyball-sable`  
**URL de déploiement** : https://rpe-volleyball-sable.web.app/  
**Statut** : ✅ Prêt à déployer

---

## 📋 Prérequis

Assurez-vous d'avoir Firebase CLI installé et d'être connecté :

```bash
# Installer Firebase CLI (si nécessaire)
npm install -g firebase-tools

# Se connecter à Firebase
firebase login
```

---

## 🚀 Déploiement en 3 Étapes

### Étape 1 : Naviguer vers le Projet

```bash
cd rpe-Gen2
```

### Étape 2 : Vérifier la Configuration

```bash
# Vérifier que le projet est bien configuré
firebase use

# Doit afficher : rpe-volleyball-sable
```

Si ce n'est pas le cas :
```bash
firebase use rpe-volleyball-sable
```

### Étape 3 : Déployer

```bash
# Déployer les règles Firestore
firebase deploy --only firestore:rules

# Déployer l'application
firebase deploy --only hosting
```

✅ **Attendez les messages** : "✔  Deploy complete!"

---

## 🌐 Accéder à l'Application

Une fois le déploiement terminé, ouvrez votre navigateur :

**https://rpe-volleyball-sable.web.app/**

---

## 🔍 Vérifications

### 1. Vérifier le Projet Firebase

```bash
cat .firebaserc
```

Doit afficher :
```json
{
  "projects": {
    "default": "rpe-volleyball-sable"
  }
}
```

### 2. Vérifier les Fichiers

```bash
# Vérifier que les fichiers essentiels existent
ls -l public/index.html
ls -l firestore.rules
ls -l firebase.json
```

### 3. Tester Localement (Optionnel)

```bash
# Démarrer le serveur local
firebase serve

# Ouvrir dans le navigateur : http://localhost:5000
```

---

## 🐛 Dépannage

### Erreur : "Project not found"

**Solution** : Vérifiez que vous utilisez le bon projet
```bash
firebase use rpe-volleyball-sable
```

### Erreur : "Permission denied"

**Solution** : Reconnectez-vous à Firebase
```bash
firebase login --reauth
```

### Erreur : "Not authorized"

**Solution** : Assurez-vous d'être connecté avec le compte propriétaire du projet Firebase

### Le déploiement échoue

**Solution** : Vérifiez les logs détaillés
```bash
firebase deploy --debug
```

---

## 📊 Après le Déploiement

### Tests Recommandés

1. **Test de Connexion**
   - Ouvrir https://rpe-volleyball-sable.web.app/
   - Se connecter en tant que coach
   - Se connecter en tant que joueuse

2. **Test des Fonctionnalités**
   - Check-in quotidien
   - Saisie RPE
   - Consultation des rapports
   - Gestion des joueuses (coach)

3. **Test sur Mobile**
   - Ouvrir sur smartphone
   - Vérifier la responsivité
   - Tester les notifications (si activées)

---

## 📝 Commandes Utiles

### Voir l'Historique des Déploiements

```bash
firebase hosting:channel:list
```

### Voir les Logs en Temps Réel

```bash
firebase functions:log
```

### Annuler un Déploiement (Rollback)

```bash
# Voir les versions précédentes
firebase hosting:channel:list

# Revenir à une version précédente (via la console Firebase)
# https://console.firebase.google.com/project/rpe-volleyball-sable/hosting
```

---

## 🎯 Informations du Projet

**Configuration Firebase** :
```javascript
{
  apiKey: "AIzaSyA9pes7glGzmRGAARY2QO_bm-NB9E2TT5w",
  authDomain: "rpe-volleyball-sable.firebaseapp.com",
  projectId: "rpe-volleyball-sable",
  storageBucket: "rpe-volleyball-sable.firebasestorage.app",
  messagingSenderId: "691799022795",
  appId: "1:691799022795:web:81c3d7158cc49be4de8f4e",
  measurementId: "G-SDZFVRQ7JE"
}
```

---

## ✅ Checklist de Déploiement

- [ ] Firebase CLI installé
- [ ] Connecté à Firebase (`firebase login`)
- [ ] Projet configuré (`rpe-volleyball-sable`)
- [ ] Règles Firestore déployées
- [ ] Application déployée
- [ ] URL testée : https://rpe-volleyball-sable.web.app/
- [ ] Connexion coach testée
- [ ] Connexion joueuse testée
- [ ] Pas d'erreurs dans la console navigateur (F12)

---

## 🎉 Félicitations !

Votre application RPE Volleyball Sablé est maintenant en ligne !

**URL** : https://rpe-volleyball-sable.web.app/

---

**Date de préparation** : Décembre 2024  
**Statut** : ✅ Prêt à déployer

