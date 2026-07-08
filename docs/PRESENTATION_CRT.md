# RPE Monitor — Pôle Espoir Volleyball Sablé-sur-Sarthe
### Présentation pour la Commission Régionale et Technique
*Mai 2026 — Olivier Bouvet, Entraîneur Pôle Espoir*

---

## 1. Contexte et problème résolu

Le suivi de la **charge d'entraînement et du bien-être** des jeunes athlètes est une obligation méthodologique pour tout staff de haut niveau. En pratique, les solutions existantes sont soit trop chères (outils pro > 500 €/mois), soit trop complexes pour des joueuses de 15-19 ans.

**L'enjeu :** collecter chaque jour, rapidement et sans friction, des données de bien-être auprès de 13 joueuses du Pôle Espoir, et les restituer au coach en temps réel pour adapter la séance.

**Notre réponse :** une application web progressive (PWA), gratuite, accessible depuis un simple téléphone, sans téléchargement, conçue spécifiquement pour le contexte du Pôle.

> 📌 **URL de production :** https://rpe-volleyball-sable.web.app

---

## 2. Pour qui ?

| Profil | Rôle dans l'app |
|---|---|
| **Joueuses (15-19 ans)** | Remplir le check-in quotidien, loguer le RPE post-séance |
| **Staff / Coach** | Consulter l'état de forme de l'équipe, identifier les joueuses à risque |

---

## 3. Fonctionnalités principales

### 3.1 Check-in quotidien bien-être

Chaque joueuse répond chaque matin à **4 indicateurs** notés de 1 à 10 :

| Indicateur | Ce qu'il mesure |
|---|---|
| 😴 **Sommeil** | Qualité perçue de la nuit |
| 😊 **Humeur** | État émotionnel général |
| 💪 **Courbatures** | Niveau de fatigue musculaire |
| 😰 **Stress** | Pression scolaire, personnelle, sportive |

Le **score de préparation** est calculé automatiquement :

$$\text{Score} = \frac{\text{Sommeil} + \text{Humeur} + (10 - \text{Courbatures}) + (10 - \text{Stress})}{4}$$

---

### 3.2 Log RPE post-entraînement

Après chaque séance, la joueuse renseigne son **RPE (Rate of Perceived Exertion)** sur l'échelle de Borg modifiée (1-10). L'application distingue les séances **obligatoires** des séances **supplémentaires**, ce qui permet de calculer la charge hebdomadaire totale.

---

### 3.3 Dashboard coach — Vue d'équipe

Le coach dispose d'une grille en temps réel avec l'état de chaque joueuse :

| Couleur | Statut | Score | Action recommandée |
|---|---|---|---|
| 🟢 **Vert** | Optimal | ≥ 7/10 | Séance normale, peut intensifier |
| 🟠 **Orange** | Attention | 5–7/10 | Surveiller, adapter la charge |
| 🔴 **Rouge** | Critique | < 5/10 | Intervention individuelle |

**Filtres intelligents** : le coach peut afficher en 1 clic uniquement les joueuses "Critiques" pour prioriser ses actions.

---

### 3.4 Application mobile sans téléchargement (PWA)

L'application fonctionne comme une **application native** installée sur l'écran d'accueil du téléphone :
- Pas d'App Store, pas de Google Play
- Icône personnalisée, mode plein écran
- Compatible iPhone (Safari) et Android (Chrome)
- Mises à jour automatiques et transparentes

---

### 3.5 Notifications push automatiques

Tous les jours à **11h45**, les joueuses qui n'ont pas encore rempli leur check-in reçoivent une notification sur leur téléphone :

> *"Bonjour Julia, n'oublie pas de remplir ton check-in avant midi ! 💪"*

Cela permet d'assurer un **taux de complétion élevé** sans intervention manuelle du coach.

---

### 3.6 Planning avancé avec suivi du cycle menstruel

Un module dédié (développé en React, intégré à l'application principale) permet au staff de :
- Visualiser le **cycle menstruel de chaque joueuse** sur le calendrier de la semaine
- Anticiper les phases de moindre tolérance à l'effort (J22-J28)
- Planifier les séances les plus intenses en phases de performance (J1-J13)
- Sauvegarder le planning d'entraînement semaine par semaine dans Firebase

> 📌 Ce module est un **différenciateur fort** par rapport aux solutions génériques du marché.

---

### 3.7 Système de gamification — 48 Stickers

Pour maintenir l'engagement des joueuses dans la durée, un système de **récompenses visuelles** a été développé avec **48 achievements** à débloquer :

| Rareté | Nombre | Condition exemple |
|---|---|---|
| 🟢 **Common** | 27 | 5 jours consécutifs de RPE, check-in avant 8h |
| 🔵 **Rare** | 5 | 14 jours consécutifs, mois complet 100% |
| 🟡 **Legendary** | 16 | **Portraits personnalisés** des joueuses et du staff |

Quand un sticker est débloqué : animation 3D flip, confettis colorés, modal plein écran. Les stickers Legendary "portrait" sont débloqués après 4 semaines complètes — ce sont les photos des joueuses elles-mêmes, ce qui crée un attachement fort.

---

### 3.8 Phrases de motivation quotidiennes

Une phrase de motivation s'affiche automatiquement à l'ouverture de l'app, **une fois par jour**. La bibliothèque contient **45+ phrases** réparties en 7 catégories :
- Santé & écoute du corps
- Mentalité & confiance
- Cycle hormonal *(unique — normalise le cycle comme un atout)*
- Équipe & collectif
- Routine & habitudes

---

### 3.9 Intégration inter-applications

L'application RPE est connectée à l'**interface match en live** du Pôle : en un clic, une joueuse peut déclarer son match du week-end avec pré-remplissage automatique de ses informations (nom, club, identifiant Firestore).

---

## 4. Architecture technique

```
┌─────────────────────────────────────────────────────┐
│              APPLICATION WEB (PWA)                  │
│         public/index.html + public/js/app.js        │
│   Vanilla JS — Mobile-first — Offline partiel       │
└──────────────────┬──────────────────────────────────┘
                   │  Firebase SDK
┌──────────────────▼──────────────────────────────────┐
│                  FIREBASE (Google Cloud)             │
│                                                     │
│  Hosting        Firestore DB      Cloud Functions   │
│  (CDN global)   ┌──────────┐     ┌──────────────┐  │
│                 │ players  │     │ Rappels 11h45│  │
│  Storage        │ checkins │     │ Calcul statut│  │
│  (Photos)       │ rpe      │     │ Trigger      │  │
│                 │ fcmTokens│     │  check-in    │  │
│                 └──────────┘     └──────────────┘  │
│                                                     │
│  Firebase Cloud Messaging (FCM) → Notifications    │
└─────────────────────────────────────────────────────┘
```

**Hébergement :** Firebase Hosting (CDN mondial, HTTPS natif)
**Base de données :** Firestore (NoSQL temps réel, sécurisé par règles RGPD)
**Backend :** Cloud Functions Node.js 18 (serverless, coût quasi nul)
**Stockage :** Firebase Storage (photos de profil des joueuses)

**Coût d'exploitation :** < 5 €/mois (plan Spark Firebase gratuit pour ce volume d'usage)

---

## 5. Données et conformité RGPD

Les données collectées incluent des **indicateurs de santé** (art. 9 RGPD) :
- Bien-être quotidien, fatigue, stress
- Cycle menstruel (donnée de santé sensible)

Mesures en place :
- Accès par authentification (mot de passe dédié Pôle)
- Règles Firestore strictes (isolation par rôle coach/joueuse)
- Hébergement sur serveurs Google EU
- Aucune revente de données, aucun analytics tiers

---

## 6. Résultats observés (saison 2025-2026)

- **13 joueuses** actives sur la plateforme
- Taux de complétion des check-ins : **> 85%** les jours de séance
- Utilisation des notifications push : réduction des oublis de 60%
- Retours joueuses : appréciation du système de stickers (engagement gamifié)
- Retour staff : identification rapide des joueuses à risque avant la séance

---

## 7. Améliorations à apporter & features futures

### 7.1 Priorité haute — Court terme (été 2026)

| Feature | Description | Impact |
|---|---|---|
| **Tableau ATL/CTL/TSB** | Calcul de la charge aiguë/chronique (modèle Banister) et de la fraîcheur athlétique | Prévention blessures, périodisation fine |
| **Alertes RED-S** | Détection automatique des signaux de syndrome de déficit énergétique relatif au sport | Santé athlètes mineures |
| **Export PDF rapport hebdo** | Génération automatique d'un résumé coach chaque lundi | Faciliter le débrief staff |
| **Sécurisation RGPD complète** | Déploiement des règles Firestore strictes + auth Firebase renforcée | Conformité données de santé mineures |

### 7.2 Priorité moyenne — Moyen terme (automne 2026)

| Feature | Description | Impact |
|---|---|---|
| **Historique graphique joueuse** | Courbe d'évolution du score sur 4 semaines glissantes | Visualisation tendances longues |
| **Commentaires RPE enrichis** | Champ texte libre après chaque RPE + archivage | Compréhension qualitative des séances |
| **Mode "période de repos"** | Désactivation automatique des rappels hors saison / vacances | Réduire la fatigue numérique |
| **Intégration planning Manus améliorée** | Liaison automatique entre le planning hebdo et les données RPE du même jour | Corrélation charge prescrite / charge perçue |
| **Multi-équipes** | Étendre l'app à plusieurs groupes (ex: équipe U18 + U20) | Scalabilité institutionnelle |

### 7.3 Vision long terme — Transfert vers VolleyAnalytics (2026-2027)

Dans le cadre d'une valorisation commerciale, les modules RPE Gen2 sont destinés à alimenter le **Module Performance** d'une plateforme SaaS volley française :

- **Phase 3 — Module Performance (tarif 49€/mois/club)** :
  - Portage du suivi RPE/cycle/wellness vers l'écosystème VolleyAnalytics
  - Tableaux de bord ATL/CTL/TSB pour les clubs régionaux (N2, N3, Pré-national)
  - Connexion avec les données de scouting match (corrélation forme → performance compétition)
  - Application mobile native (React Native) en remplacement de la PWA

- **Objectif business :** combler le vide entre Excel gratuit et Datavolley (650€/an) pour les ~1500 clubs français sous-équipés en outils d'analyse de performance

---

## 8. Pour aller plus loin

| Ressource | Lien |
|---|---|
| Application en ligne | https://rpe-volleyball-sable.web.app |
| Code source | Dépôt privé GitHub `rpe-gen2` |
| Documentation technique | `/docs/` dans le dépôt |

---

*Présentation réalisée pour la Commission Régionale et Technique — Mai 2026*
*Olivier Bouvet — Pôle Espoir Volleyball Sablé-sur-Sarthe*
