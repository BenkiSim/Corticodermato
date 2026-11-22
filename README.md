# Corticodermato

Micro application web qui rédige des schémas de décroissance des corticoïdes systémiques, prêts à copier dans une ordonnance.

1. Renseigner le patient (adulte ou enfant), la molécule, la dose actuelle et la durée de la corticothérapie.
2. Les ordonnances se mettent à jour immédiatement, chacune avec son bouton « Copier » : traitement (pleine dose éventuelle, paliers datés, comprimés, quantité, relais hydrocortisone, consignes), hydrocortisone injectable d'urgence, bilan biologique avec adresse du secrétariat.
3. Modifier le texte si besoin, puis « Copier ».

Outil d'aide uniquement : il ne remplace pas le jugement clinique. Aucune donnée saisie n'est enregistrée ni transmise.

## Structure

| Fichier | Rôle |
| --- | --- |
| `data.js` | Règles de décroissance, doses, spécialités et textes de l'ordonnance. Fichier à modifier en priorité. |
| `logic.js` | Calcul du plan et composition en comprimés. |
| `app.js` | Formulaire et rédaction du texte. |
| `index.html`, `style.css` | Interface. |
| `tests/test.js` | Tests des calculs : `node tests/test.js`. |

Site statique sans compilation ni dépendance.

## Déploiement : GitHub Pages

Gratuit pour un dépôt public. Réglage (une seule fois) : Settings, Pages, « Deploy from a branch », branche `main`, dossier `/ (root)`.

Adresse : https://benkisim.github.io/Corticodermato/

Chaque push sur `main` republie le site en une à deux minutes.

## Mettre à jour

Demander la modification à Claude (session connectée à ce dépôt). Claude modifie le code, lance les tests, incrémente `APP_VERSION` et `APP_DATE` dans `data.js` et pousse sur `main`.
