# Bobine — studio vidéo IA (usage personnel)

Page servie par Karat à l'adresse `/studio/` (`public/studio/index.html`).

## Fonctionnalités
- **Avatars** : description, tenue, style (photo, cinéma, 3D, animé,
  illustration) et décor → 4 variantes générées par IA. « Garder » les
  enregistre dans le navigateur (localStorage) ; « Utiliser dans une vidéo »
  en fait le personnage du storyboard.
- **Storyboard** : idée, modèle visuel, format et durée → 4 plans générés en
  image par IA (le personnage choisi y apparaît), animés dans l'aperçu. Si
  l'IA ne répond pas, le plan est dessiné par le navigateur.
- Galerie de styles (« Refaire »), méthode, fonctions, comparatif, FAQ.

Ce ne sont pas encore de vraies vidéos : ce sont des images animées.

## Génération d'images
Les images passent par `GET /api/studio/image` (`src/routes/studio.routes.js`),
qui appelle Pollinations côté serveur :
- **sans clé** : accès anonyme gratuit, environ une image toutes les 45 s ;
- **avec `POLLINATIONS_KEY`** (clé secrète `sk_…`, créée sur
  https://enter.pollinations.ai/keys) : beaucoup plus rapide. À ajouter dans
  `.env` en local ou dans les variables d'environnement de Render.

La route est limitée à 60 images par tranche de 10 minutes et par adresse IP.
