# 🎬 Planning Avancé Manus - Mode Hybride

Le Planning Avancé est maintenant **intégré directement dans Firebase** avec un système hybride intelligent !

## 🚀 Comment ça marche

### En Production (https://rpe-volleyball-sable.web.app)
✅ **Tout fonctionne automatiquement**
- Le Planning Avancé charge les fichiers buildés depuis `/manus/`
- Aucun serveur séparé nécessaire
- Prêt à copier pour d'autres projets

### En Local (http://localhost:5000)
🔥 **Mode développement automatique**
- Si le serveur React est lancé (`npm run dev`) → hot-reload activé
- Sinon → utilise les fichiers buildés (comme en prod)

## 📝 Modifier le Planning Avancé

### Option 1 : Développement avec hot-reload (RECOMMANDÉ)
```powershell
# Terminal 1 : Lancer le serveur React
cd "projet Manus"
npm run dev

# Terminal 2 : Lancer Firebase
firebase serve --only hosting --port 5000
```
→ Les modifications dans `projet Manus/src/` sont instantanées !

### Option 2 : Build et intégration
```powershell
# Après avoir modifié les fichiers dans projet Manus/src/
.\update-manus.ps1

# Pour déployer en production
firebase deploy --only hosting
```

## 🎯 Workflow Complet

1. **Développement actif** :
   - Lance `npm run dev` dans Manus
   - Modifie les fichiers → rechargement instantané

2. **Tests avant déploiement** :
   - Arrête le serveur dev
   - Lance `.\update-manus.ps1`
   - Teste avec les fichiers buildés

3. **Déploiement en production** :
   - `firebase deploy --only hosting`
   - Tout est intégré et fonctionnel

## 📁 Structure
```
rpe-volleyball-app/
├── projet Manus/          # Code source React
│   ├── src/               # Fichiers modifiables
│   └── dist/              # Build généré
├── public/
│   ├── manus/             # Build copié (déployé dans Firebase)
│   └── js/
│       └── team-planner.js  # Détection auto dev/prod
└── update-manus.ps1       # Script de mise à jour rapide
```

## 🔄 Détection Automatique

Le système détecte automatiquement :
- **En local** : Cherche le serveur dev sur `localhost:5175`
  - Trouvé → Mode DEV (hot-reload)
  - Pas trouvé → Mode PROD (fichiers buildés)
- **En production** : Toujours Mode PROD

## ✨ Avantages

✅ **Un seul projet** : Tout au même endroit
✅ **Facile à modifier** : `npm run dev` = hot-reload
✅ **Facile à déployer** : Un seul `firebase deploy`
✅ **Portable** : Copie le projet = tout fonctionne
✅ **Intelligent** : Bascule auto entre dev/prod

---

**Note** : Le Planning Avancé fonctionne maintenant partout sans configuration supplémentaire ! 🎉
