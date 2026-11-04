'use strict';

// Bobine — studio vidéo IA (usage personnel).
// Sert la page (public/index.html) et la génération d'images (/api/studio).
const path = require('path');
const express = require('express');

try { require('fs').readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n').forEach((l) => { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }); } catch (_) {}

const app = express();
app.use('/api/studio', require('./src/studio.routes'));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => console.log('Bobine en ligne : http://localhost:' + PORT));
