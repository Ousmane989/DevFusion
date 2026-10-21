# Fusion Studio — page vitrine

Page d'accueil d'un studio vidéo IA, servie par Karat à l'adresse `/studio/`
(fichier statique dans `public/`, aucune dépendance).

## Ce qui fonctionne déjà
- Console de génération : idée, modèle, format, durée, fichiers de référence.
  Le bouton « Générer » dessine un storyboard de démonstration dans le
  navigateur (canvas). Aucune vraie vidéo n'est produite.
- Galerie de styles (bouton « Refaire » qui recharge le style dans la console),
  méthode, fonctions, comparatif, tarifs, FAQ.

## Pour en faire un vrai service
1. Choisir une API de génération vidéo et ajouter une route serveur
   (ex. `POST /api/studio/generate`) qui garde la clé API côté serveur.
2. Dans le `submit` du formulaire `#gen`, appeler cette route et afficher la
   vidéo renvoyée dans `.screen` à la place du canvas.
3. Relier les tarifs aux abonnements et paiements existants de Karat.

Le nom « Fusion Studio », les textes et les prix sont provisoires : remplacez-les.
