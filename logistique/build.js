'use strict';

// Prépare le projet Netlify autonome : copie dans logistique/app le code
// serveur (src/) et les fichiers de l'agence (public/livreur) depuis la racine
// du dépôt. Netlify n'embarque dans la fonction que ce qui se trouve dans le
// dossier de base (logistique/) : la copie rend le projet indépendant.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'app');

fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'src'), path.join(OUT, 'src'), { recursive: true });
fs.cpSync(path.join(ROOT, 'public', 'livreur'), path.join(OUT, 'public', 'livreur'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'public', 'favicon.svg'), path.join(OUT, 'public', 'favicon.svg'));
console.log('Karat Logistique : fichiers copiés dans', path.relative(ROOT, OUT));
