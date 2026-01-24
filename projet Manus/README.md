# RPE Team Planner (Full Stack)

Application de gestion d'équipe de Volley-ball avec planification intelligente basée sur le cycle menstruel et gestion de documents.

## 🚀 Installation et Démarrage

1.  **Prérequis** : Avoir Node.js installé sur votre machine.
2.  **Installation** :
    ```bash
    # À la racine du projet
    npm install
    
    # Installer les dépendances du serveur
    cd server
    npm install
    cd ..
    ```
3.  **Démarrage** (Frontend + Backend) :
    ```bash
    npm run dev
    ```
    L'application sera accessible sur `http://localhost:5173`.

## 📂 Structure du Projet

*   `src/` : Code source du Frontend (React)
    *   `components/` : Composants graphiques (Calendrier, Liste Joueuses, Documents...)
    *   `utils/` : Algorithme de prédiction des groupes
*   `server/` : Code source du Backend (Node.js)
    *   `uploads/` : Dossier où sont stockés les fichiers des joueuses
    *   `index.js` : Serveur API

## ✨ Fonctionnalités

*   **Planning Hebdomadaire** : Vue agenda avec répartition automatique des groupes.
*   **Algorithme Saisons du Cycle** : Calcul automatique (Wonder Woman / Bad Girl / Récupération).
*   **Gestion Documents** : Upload et stockage de fichiers par joueuse.
