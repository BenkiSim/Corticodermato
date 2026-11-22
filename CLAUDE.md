# Consignes pour Claude

Projet : micro application statique (HTML, CSS, JavaScript sans dépendance) d'aide à la prescription des corticoïdes systémiques, déployée sur Vercel depuis la branche `main` et intégrée dans Notion par un bloc embed.

## Règles

- Interface et textes en français. Ne jamais utiliser le tiret long (U+2014). Pas d'émojis.
- Pas de framework, pas d'étape de build : le site doit fonctionner en ouvrant `index.html`.
- Les données médicales vivent dans `data.js`. Toute donnée ajoutée ou modifiée (dose, équivalence, spécialité) doit être signalée à l'utilisateur pour vérification, avec la source si possible.
- La logique de calcul va dans `logic.js` (exportable pour Node) et doit être couverte par `tests/test.js`.
- Ne jamais stocker ni transmettre de données patient. `localStorage` est réservé aux préférences d'interface.
- Ne pas ajouter d'en-tête `X-Frame-Options` ou de `frame-ancestors` restrictif : l'application doit rester intégrable dans Notion.

## À chaque modification

1. `node tests/test.js` doit passer.
2. Incrémenter `APP_VERSION` (semver) et mettre `APP_DATE` à la date du jour dans `data.js`.
3. Commit avec un message en français, puis push sur `main` (déploiement automatique Vercel).
