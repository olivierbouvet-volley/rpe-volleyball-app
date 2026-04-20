# Corrections et Améliorations - Planning Avancé

## Date : 16 Janvier 2026

### 1. ✅ PROBLÈME RÉSOLU : Décalage de -2 jours dans les cycles

**Symptôme :**
- Le Planning Avancé affichait systématiquement les cycles avec 2 jours de retard
- Exemple : Anne-Laure à J15 au lieu de J17, Eline à J1 au lieu de J3

**Cause identifiée :**
Le calcul du décalage de jours (`dayOffset`) ne normalisait pas les heures des dates à minuit. Lorsqu'on comparait :
- `date` (jour sélectionné à 00:00:00)
- `new Date()` (heure actuelle, ex: 14:30:00)

Cela créait un décalage négatif d'environ -0.6 jour qui, avec `Math.floor()`, donnait -1 jour. Avec d'autres facteurs, cela pouvait atteindre -2 jours.

**Solution appliquée :**
Normalisation systématique des dates à minuit avant le calcul :
```typescript
const dateNormalized = new Date(date);
dateNormalized.setHours(0, 0, 0, 0);
const today = new Date();
today.setHours(0, 0, 0, 0);

const dayOffset = Math.floor((dateNormalized.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
```

Formule de projection améliorée pour gérer les nombres négatifs :
```typescript
let projectedCycleDay = player.cycleDay + dayOffset;
while (projectedCycleDay <= 0) projectedCycleDay += 28;
while (projectedCycleDay > 28) projectedCycleDay -= 28;
```

**Fichiers modifiés :**
- `projet Manus/src/components/WeekCalendar.tsx` (lignes 48-65, 139-154)
- `projet Manus/src/components/DayDetailsModal.tsx` (lignes 214-232, 904-920)

---

### 2. ✅ NOUVELLE FONCTIONNALITÉ : Sauvegarde de l'agenda dans Firebase

**Problème :**
L'agenda était perdu à chaque rechargement de l'application (pas de persistance).

**Solution implémentée :**

#### A. Nouveau service Firebase Calendar
Créé : `projet Manus/src/services/FirebaseCalendarService.ts`

Fonctions disponibles :
- `saveScheduleForDate()` : Sauvegarde les événements et séquences d'un jour
- `loadScheduleForDate()` : Charge les données d'un jour spécifique
- `loadSchedulesForRange()` : Charge tous les événements d'une plage de dates
- `deleteScheduleForDate()` : Supprime les données d'un jour
- `subscribeToSchedule()` : Écoute les changements en temps réel

#### B. Structure de données Firestore
```
Collection: schedules
  ├─ Document: {userId} (ID du coach)
      └─ Collection: days
          ├─ Document: "2026-01-16" (format YYYY-MM-DD)
          │   ├─ date: "2026-01-16"
          │   ├─ events: [...]  // Événements du jour
          │   ├─ sequences: [...] // Séquences d'entraînement
          │   └─ lastModified: Timestamp
          ├─ Document: "2026-01-17"
          └─ ...
```

#### C. Intégration dans l'application

**Chargement automatique :**
- Au démarrage : chargement des événements de la semaine courante ±7 jours
- À l'ouverture d'une modal : chargement des séquences du jour sélectionné

**Sauvegarde automatique :**
- Fermeture de la modal d'agenda : sauvegarde des séquences
- Copier/coller d'événement : sauvegarde immédiate
- Import de calendrier : sauvegarde des nouveaux événements

**Fichiers modifiés :**
- `projet Manus/src/App.tsx` : 
  - Ajout état `sequencesByDate` pour cacher localement
  - Ajout état `userId` pour identifier le coach
  - Ajout `useEffect` pour charger événements au changement de semaine
  - Modification `handleDayClick` et `handleEventClick` pour charger séquences
  - Passage callback `onSave` à DayDetailsModal
  - Réception `USER_ID` via postMessage

- `public/js/team-planner.js` :
  - Envoi de l'`userId` au React app via postMessage après envoi des joueurs

#### D. Authentification utilisateur
L'application récupère l'ID utilisateur de deux façons :
1. **Mode iframe** : Via postMessage depuis l'application parent (message `USER_ID`)
2. **Mode standalone** : Via Firebase Auth (`auth.currentUser.uid`)

Fallback : `'coach'` si aucune authentification disponible

---

### 3. Points techniques importants

#### Normalisation des dates
Toujours utiliser `.setHours(0, 0, 0, 0)` avant de comparer des dates pour éviter les décalages horaires.

#### Gestion du modulo négatif
JavaScript ne gère pas correctement les modulos négatifs :
```typescript
// ❌ Incorrect
-1 % 28 = -1  // au lieu de 27

// ✅ Correct
let day = cycleDay + offset;
while (day <= 0) day += 28;
while (day > 28) day -= 28;
```

#### Sérialisation des dates pour Firestore
Les objets Date doivent être convertis en ISO string pour Firestore :
```typescript
// Sauvegarde
events.map(e => ({ ...e, start: e.start.toISOString(), end: e.end.toISOString() }))

// Chargement
events.map(e => ({ ...e, start: new Date(e.start), end: new Date(e.end) }))
```

---

### 4. Tests à effectuer

✅ **Cycles :**
1. Ouvrir le Planning Avancé
2. Vérifier que les J# affichés correspondent au Dashboard principal
3. Naviguer sur différents jours et vérifier les projections

✅ **Sauvegarde agenda :**
1. Créer une séance avec des séquences
2. Fermer la modal (sauvegarde automatique)
3. Rafraîchir la page (F5)
4. Rouvrir le même jour → les séquences doivent être présentes

✅ **Import calendrier :**
1. Importer un fichier ICS
2. Rafraîchir la page
3. Les événements importés doivent être chargés automatiquement

---

### 5. Améliorations futures possibles

#### Court terme :
- [ ] Message de confirmation visuel lors de la sauvegarde (toast)
- [ ] Indicateur de chargement pendant la lecture Firebase
- [ ] Gestion des conflits si plusieurs coachs modifient le même jour

#### Moyen terme :
- [ ] Synchronisation temps réel entre plusieurs onglets/appareils
- [ ] Historique des modifications avec possibilité d'annulation
- [ ] Export PDF des plannings sauvegardés

#### Long terme :
- [ ] Partage de planning entre coachs
- [ ] Templates de séances réutilisables
- [ ] Analyse statistique des plannings (volume, intensité)

---

### 6. Déploiement

**Commande :** `.\deploy-all.ps1`

**Processus :**
1. Build React (TypeScript + Vite)
2. Copie dans `public/manus/`
3. Deploy Firebase Hosting

**URL :** https://rpe-volleyball-sable.web.app

**Fichiers déployés :** 81 fichiers (build principal + React app)

---

### Notes importantes

- Les séquences sont stockées par jour, pas par événement
- L'userId est nécessaire pour isoler les données de chaque coach
- Les dates sont en UTC dans Firestore mais converties en local pour l'affichage
- La clé de date utilise le format ISO (YYYY-MM-DD) pour la cohérence

---

**Développeur :** GitHub Copilot  
**Date de déploiement :** 16 janvier 2026  
**Version :** 1.2.0
