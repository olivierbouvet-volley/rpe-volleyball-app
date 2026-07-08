# Comment fonctionne le Bilan individuel d'une joueuse

Explication pour un novice découvrant le Bilan de Saison : d'où viennent les chiffres, comment ils sont calculés, et à quoi ils servent.

## Avant tout : ce que le système regarde

Trois sources de données brutes, remplies par les joueuses au quotidien :
- **Les check-ins** : sommeil, courbatures, stress, humeur, énergie (chacun noté 1 à 10), plus les symptômes de cycle (crampes, maux de tête, fatigue...) et la phase du cycle du jour.
- **Les RPE** : à chaque séance, la joueuse note son ressenti d'effort (1 à 10) et parfois sa performance ressentie. On calcule la **charge** = RPE × durée de la séance.
- **Le cycle menstruel** : dates de règles, régularité, symptômes.

Tout ce qui suit est calculé automatiquement à partir de ces trois sources — rien n'est saisi manuellement, sauf les notes médicales et les axes d'amélioration (éditables).

## 1. Les indicateurs clés (en haut du bilan)

- **Score moyen** = moyenne de `(sommeil + (10-courbatures) + (10-stress) + humeur) / 4` sur tous ses check-ins de la période. C'est un indicateur global de forme sur 10.
- **Charge moyenne** = moyenne de sa charge (RPE × durée) par séance.
- Les deux sont comparés à la **moyenne de l'équipe** sur la même période (le "+/- vs équipe").

**Pourquoi** : avoir en un coup d'œil si elle est plutôt en forme ou en difficulté, et si sa charge d'entraînement est dans la norme du groupe.

## 2. Répartition de la charge

Un tableau qui découpe sa charge totale par type de séance (Entraînement, Match, Prépa Physique...), plus le nombre moyen de séances par semaine, et si la part des matchs a augmenté ou diminué entre la première et la deuxième moitié de la période.

**Pourquoi** : voir si sa charge vient surtout de l'entraînement ou de la compétition, et détecter un déséquilibre (ex: trop de matchs d'un coup).

## 3. Alertes santé (bandeau rouge, seulement si nécessaire)

Trois signaux automatiques :
- **Aménorrhée** : si elle a déclaré ne pas avoir de règles, ou si aucune règle n'apparaît dans ses check-ins depuis 45 jours ou plus.
- **Risque de RED-S** (déficit énergétique) : si son énergie moyenne est sous 4/10 **et** que son cycle est irrégulier ou en aménorrhée.
- **Symptômes sévères récurrents** : si un symptôme a été noté 9/10 ou plus au moins 3 fois sur la période.

**Pourquoi** : ce sont des signaux qui justifient un avis médical, pas juste un ajustement d'entraînement — d'où le style visuel différent.

## 4. Profil Cycle — sur la période choisie dans le bilan

- **Régularité** : compare la durée entre ses cycles successifs ; si ça varie de plus de 7 jours d'un cycle à l'autre, c'est signalé comme irrégulier.
- **Impact cumulé** : compte les jours où elle a noté au moins un symptôme modéré à sévère (≥5/10), divisé par le nombre de mois de la période → "X jours/mois d'entraînement potentiellement sous-qualitatif".
- **Meilleure / pire phase** : regroupe sa performance (ou son score de forme) par phase de cycle, et ressort la phase où elle est le plus et le moins performante — seulement si on a au moins 5 points de données dans chaque phase comparée, sinon ce n'est pas fiable.
- **Inflation du RPE** : compare son ressenti d'effort (RPE) les jours de symptôme sévère vs les jours normaux, pour un même type de séance — affiché seulement si l'écart dépasse 10%.
- **Recommandation de périodisation** : une phrase de conseil d'entraînement liée à sa meilleure/pire phase (ex: privilégier la force en phase folliculaire).

**Pourquoi** : c'est propre à **elle**, pas une moyenne d'équipe — ça sert à individualiser vraiment l'entraînement plutôt que d'appliquer la même règle à tout le monde.

## 5. Profil personnalisé — historique complet

Même logique que le point 4, mais sur **tout son historique** (pas juste la période du bilan), pour avoir plus de recul statistique. En plus, on compare sa réalité à un **modèle générique** (celui utilisé par défaut dans l'app pour toutes les joueuses : +0,5 en ovulation, +0,3 en folliculaire, -0,2 en lutéale, -0,7 en menstruation) et on dit si elle suit ce modèle, ou si elle fait exception ("moins affectée" ou "plus affectée que la moyenne attendue").

**Pourquoi** : ça permet de savoir si les hypothèses générales sur le cycle s'appliquent vraiment à cette joueuse précise, ou si elle a un profil différent qu'il faut prendre en compte à part.

## 6. Synthèse individuelle

Une liste de points générée automatiquement qui résume : nombre de séances et charge (vs équipe), tendance du score de forme entre le début et la fin de la période, et mention du cycle si pertinent.

**Pourquoi** : une lecture rapide, point par point, plutôt que des chiffres épars.

## 7. Axes d'amélioration (pré-remplis, mais modifiables)

Six règles automatiques vérifient si :
1. Sa forme a baissé en fin de période.
2. Elle a eu un pic de charge sans récupération derrière.
3. Elle remplit ses check-ins moins d'une fois sur deux.
4. Elle a eu un symptôme sévère sans séance de récupération autour.
5. Son stress ou ses courbatures sont élevés en fin de période.
6. Son score est en dessous de la moyenne d'équipe.

Chaque règle déclenchée ajoute une phrase dans le texte, que tu peux ensuite modifier ou compléter toi-même — le texte est sauvegardé et ne se régénère pas si tu l'as déjà modifié.

**Pourquoi** : un point de départ automatique pour ne rien oublier, sans t'enfermer dedans.

## 8. Notes médicales

Zone de texte libre par joueuse (et une globale pour l'équipe), où tu as importé les comptes-rendus du médecin/kiné. Rien n'est calculé ici, c'est purement informatif — mais présenté avec la même structure que ton fichier Excel (sections, chronologie) à l'impression.

## 9. Impression

Le bouton "Imprimer" produit une version propre du bilan (sans les boutons/menus), avec le texte complet des notes qui s'affiche entièrement (pas juste ce qui rentre dans la petite zone de texte à l'écran).

## Fichiers concernés

- `public/js/season-report.js` — logique principale du Bilan de Saison (KPI, charge, profil cycle période sélectionnée, synthèse, axes d'amélioration, notes).
- `public/js/cycle-profile-engine.js` — profil personnalisé sur l'historique complet + conseil du jour.
- `public/js/player-popup.js` — affichage du "Conseil du jour" dans la fiche joueuse côté coach.
- `public/css/season-report.css` — mise en page et styles d'impression.
