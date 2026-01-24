# 🏐 Intégration Formulaire Match - Pré-remplissage automatique

## 📋 Vue d'ensemble

Quand une joueuse clique sur "Déclarer mon match du Week-end" depuis l'application RPE, ses informations sont automatiquement envoyées au formulaire via l'URL.

## 🔗 Format de l'URL générée

```
https://interface-match-en-live.web.app/formulaire-match.html?prenom=Emma&nom=Durand&club=SCO%20Volley%20Sablé&playerId=Emma
```

### Paramètres envoyés :
- `prenom` : Prénom de la joueuse (ex: "Emma")
- `nom` : Nom de la joueuse (ex: "Durand")
- `club` : Toujours "SCO Volley Sablé"
- `playerId` : ID unique de la joueuse dans Firestore (ex: "Emma")

## 💻 Code JavaScript pour récupérer les paramètres

Ajoutez ce code dans votre fichier JavaScript du formulaire de déclaration de match :

```javascript
/**
 * Récupère les paramètres de l'URL et pré-remplit le formulaire
 */
function preFillFormFromURL() {
    // Créer un objet URLSearchParams avec les paramètres de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    
    // Récupérer les valeurs
    const prenom = urlParams.get('prenom');
    const nom = urlParams.get('nom');
    const club = urlParams.get('club');
    const playerId = urlParams.get('playerId');
    
    // Pré-remplir les champs si les valeurs existent
    if (prenom) {
        const prenomField = document.getElementById('prenom-joueuse');
        if (prenomField) {
            prenomField.value = prenom;
            prenomField.readOnly = true; // Empêcher la modification
            prenomField.style.background = '#f0f0f0'; // Indication visuelle
        }
    }
    
    if (nom) {
        const nomField = document.getElementById('nom-joueuse');
        if (nomField) {
            nomField.value = nom;
            nomField.readOnly = true;
            nomField.style.background = '#f0f0f0';
        }
    }
    
    if (club) {
        const clubField = document.getElementById('club-joueuse');
        if (clubField) {
            clubField.value = club;
            clubField.readOnly = true;
            clubField.style.background = '#f0f0f0';
        }
    }
    
    // Stocker le playerId dans un champ caché pour le soumettre avec le formulaire
    if (playerId) {
        let hiddenField = document.getElementById('player-id-hidden');
        if (!hiddenField) {
            // Créer le champ caché s'il n'existe pas
            hiddenField = document.createElement('input');
            hiddenField.type = 'hidden';
            hiddenField.id = 'player-id-hidden';
            hiddenField.name = 'playerId';
            document.querySelector('form').appendChild(hiddenField);
        }
        hiddenField.value = playerId;
    }
    
    console.log('✅ Formulaire pré-rempli avec:', { prenom, nom, club, playerId });
}

// Exécuter au chargement de la page
document.addEventListener('DOMContentLoaded', preFillFormFromURL);
```

## 🎯 Alternative : Masquer les champs si pré-remplis

Si vous préférez **masquer complètement** les champs prénom/nom/club quand ils sont pré-remplis :

```javascript
function preFillFormFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    
    const prenom = urlParams.get('prenom');
    const nom = urlParams.get('nom');
    const club = urlParams.get('club');
    const playerId = urlParams.get('playerId');
    
    // Si les infos sont présentes, masquer les champs et créer un récapitulatif
    if (prenom && nom && club) {
        // Masquer les champs originaux
        const prenomContainer = document.querySelector('[for="prenom-joueuse"]')?.parentElement;
        const nomContainer = document.querySelector('[for="nom-joueuse"]')?.parentElement;
        const clubContainer = document.querySelector('[for="club-joueuse"]')?.parentElement;
        
        if (prenomContainer) prenomContainer.style.display = 'none';
        if (nomContainer) nomContainer.style.display = 'none';
        if (clubContainer) clubContainer.style.display = 'none';
        
        // Créer un bandeau d'information
        const infoDiv = document.createElement('div');
        infoDiv.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px; border-radius: 8px; margin-bottom: 20px;';
        infoDiv.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">🏐</span>
                <div>
                    <div style="font-weight: 600; font-size: 16px;">${prenom} ${nom}</div>
                    <div style="font-size: 14px; opacity: 0.9;">${club}</div>
                </div>
            </div>
        `;
        
        // Insérer au début du formulaire
        const form = document.querySelector('form');
        if (form) {
            form.insertBefore(infoDiv, form.firstChild);
        }
        
        // Créer des champs cachés pour soumettre les données
        const addHiddenField = (name, value) => {
            const field = document.createElement('input');
            field.type = 'hidden';
            field.name = name;
            field.value = value;
            form.appendChild(field);
        };
        
        addHiddenField('prenom', prenom);
        addHiddenField('nom', nom);
        addHiddenField('club', club);
        if (playerId) addHiddenField('playerId', playerId);
    }
}

document.addEventListener('DOMContentLoaded', preFillFormFromURL);
```

## 📝 Adaptation selon vos IDs de champs

**Important** : Adaptez les IDs dans le code selon les IDs réels de votre formulaire :

```javascript
// Remplacez ces IDs par les vôtres :
'prenom-joueuse'  → Votre ID pour le champ prénom
'nom-joueuse'     → Votre ID pour le champ nom
'club-joueuse'    → Votre ID pour le champ club
```

Vous pouvez trouver vos IDs en inspectant votre formulaire HTML ou en ouvrant la console développeur.

## 🧪 Test

Pour tester, ajoutez manuellement les paramètres à votre URL :

```
http://localhost:5000/formulaire-match.html?prenom=Emma&nom=Durand&club=SCO%20Volley%20Sablé&playerId=Emma
```

Les champs devraient se remplir automatiquement !

## ✅ Résumé

1. ✅ L'application RPE envoie automatiquement : prénom, nom, club, playerId
2. ✅ Votre formulaire récupère ces paramètres avec `URLSearchParams`
3. ✅ Les champs sont pré-remplis et verrouillés
4. ✅ La joueuse n'a plus qu'à remplir les infos du match (adversaire, date, heure)

---

**Besoin d'aide ?** Contactez-moi si vous avez besoin d'adapter le code à votre formulaire spécifique !
