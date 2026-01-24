# 🚀 Déploiement Rapide - RPE Gen2

## Commandes essentielles

### 1. Connexion à Firebase
```bash
firebase login
```

### 2. Vérifier le projet
```bash
cd /home/ubuntu/rpe-gen2
firebase use rpe-gen2
```

### 3. Déployer TOUT en une commande
```bash
firebase deploy
```

**OU** déployer séparément :

### 4a. Déployer uniquement le site web
```bash
firebase deploy --only hosting
```

### 4b. Déployer uniquement les Cloud Functions
```bash
cd functions && npm install && cd ..
firebase deploy --only functions
```

### 4c. Déployer uniquement les règles Firestore
```bash
firebase deploy --only firestore:rules
```

## ⚡ Déploiement ultra-rapide (site web uniquement)

Si vous avez juste modifié le HTML/CSS/JS :

```bash
firebase deploy --only hosting
```

Temps de déploiement : ~30 secondes

## 🔍 Vérifier le déploiement

Après le déploiement, ouvrir :
- **Site web** : https://rpe-gen2.web.app
- **Console Firebase** : https://console.firebase.google.com/project/rpe-gen2

## 🐛 En cas d'erreur

### Erreur : "No project active"
```bash
firebase use rpe-gen2
```

### Erreur : "Permission denied"
```bash
firebase login --reauth
```

### Erreur : "Functions deployment failed"
```bash
cd functions
rm -rf node_modules package-lock.json
npm install
cd ..
firebase deploy --only functions
```

### Erreur : "Hosting deployment failed"
Vérifier que le dossier `public/` existe et contient `index.html`

## 📝 Checklist avant déploiement

- [ ] Vérifier que `firebase.json` pointe vers le bon dossier `public`
- [ ] Vérifier que `.firebaserc` contient le bon projet `rpe-gen2`
- [ ] Tester localement avec `firebase serve`
- [ ] Vérifier que toutes les images sont présentes dans `public/img/`
- [ ] Vérifier que le fichier `manifest.json` est correct

## 🧪 Tester localement avant déploiement

```bash
firebase serve
```

Puis ouvrir : http://localhost:5000

## 📊 Voir les logs après déploiement

```bash
firebase functions:log
```

## 🎯 URL finale

Après déploiement réussi, l'application sera accessible à :
**https://rpe-gen2.web.app**

## ⏱️ Temps de déploiement estimé

- **Hosting seul** : 30 secondes
- **Functions seules** : 2-3 minutes
- **Tout ensemble** : 3-4 minutes

## 🔄 Mise à jour rapide

Pour mettre à jour uniquement le code frontend (HTML/CSS/JS) :

```bash
firebase deploy --only hosting
```

C'est tout ! 🎉

