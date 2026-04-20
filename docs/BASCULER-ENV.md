# 🔄 Basculer entre Développement et Production

## 📘 Environnement de DÉVELOPPEMENT

```bash
# 1. Basculer vers dev
firebase use dev

# 2. Modifier firebase.json
# Changer: "site": "rpe-gen2-eeaee"

# 3. Redémarrer le serveur
firebase serve --only hosting -p 8081
```

**Projet:** rpe-gen2-eeaee  
**URL de test:** http://localhost:8081  
**Base de données:** Firestore dev (rpe-gen2-eeaee)  
**Configuration JS:** firebase-config-dev.js (chargée automatiquement en local)

---

## 🚀 Environnement de PRODUCTION

```bash
# 1. Basculer vers prod
firebase use prod

# 2. Modifier firebase.json
# Changer: "site": "rpe-volleyball-sable"

# 3. Déployer
firebase deploy --only hosting
```

**Projet:** rpe-volleyball-sable  
**URL live:** https://rpe-volleyball-sable.web.app/  
**Base de données:** Firestore prod (rpe-volleyball-sable)  
**Configuration JS:** firebase-config-prod.js (chargée en production)

---

## ⚠️ IMPORTANT

### Fichier `firebase.json`
```json
{
  "hosting": {
    "site": "rpe-gen2-eeaee"  // ← DEV
    // ou
    "site": "rpe-volleyball-sable"  // ← PROD
  }
}
```

### État actuel
- **Projet actif:** `firebase use` pour voir
- **Configuration actuelle:** Vérifier `firebase.json` ligne 4

### Commandes utiles
```bash
# Voir le projet actif
firebase use

# Lister tous les projets
firebase projects:list

# Déployer les règles Firestore
firebase deploy --only firestore:rules

# Déployer tout
firebase deploy
```

---

## 📊 Base de données

Les deux projets ont des bases Firestore **séparées** :
- **DEV** = pour tester sans risque
- **PROD** = données réelles des joueuses

**Ne jamais tester en production !**
