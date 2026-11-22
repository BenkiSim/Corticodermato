# Corticodermato

Micro application web d'aide à la prescription des corticoïdes systémiques.

- **Classes et équivalences** : tableau par durée d'action, convertisseur de doses entre molécules.
- **Schéma de décroissance** : génération d'un plan daté avec composition en comprimés, texte copiable pour l'ordonnance et version imprimable.

Outil d'aide uniquement : il ne remplace ni le jugement clinique ni le RCP des spécialités. Aucune donnée saisie n'est enregistrée ni transmise.

## Structure

| Fichier | Rôle |
| --- | --- |
| `data.js` | Données de référence (molécules, équivalences, spécialités, version). Fichier à modifier en priorité. |
| `logic.js` | Calculs : conversion, composition en comprimés, génération du schéma. |
| `app.js` | Liaison entre les données, les calculs et la page. |
| `index.html`, `style.css` | Interface. |
| `tests/test.js` | Tests des calculs : `node tests/test.js`. |

Site statique sans compilation ni dépendance : Vercel sert les fichiers tels quels.

## Mise en ligne sur Vercel (une seule fois)

1. Se connecter sur vercel.com avec le compte GitHub.
2. « Add New » puis « Project », choisir le dépôt `BenkiSim/Corticodermato`, « Import ».
3. Framework Preset : « Other ». Ne rien changer d'autre, puis « Deploy ».
4. L'adresse obtenue ressemble à `https://corticodermato.vercel.app`.

Ensuite, chaque modification poussée sur la branche `main` redéploie automatiquement le site.

## Intégration dans Notion (une seule fois)

1. Dans la page Notion, taper `/embed` (ou `/intégrer`).
2. Coller l'adresse Vercel, valider.
3. Agrandir le bloc en hauteur avec la poignée du bas.

Le bloc affiche toujours la version en ligne : les mises à jour apparaissent dans Notion sans rien refaire (recharger la page si besoin). La version et la date sont visibles en bas de l'application.

## Mettre à jour

Demander la modification à Claude (session connectée à ce dépôt). Claude modifie le code, lance les tests, incrémente `APP_VERSION` et `APP_DATE` dans `data.js` et pousse sur `main`. Vercel redéploie en moins d'une minute.
