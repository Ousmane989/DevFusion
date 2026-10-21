'use strict';

// ------------------------------------------------------------------
// Bobine (studio vidéo IA, /studio/) : génération d'images par IA.
//   GET /api/studio/status            → la clé d'API est-elle configurée ?
//   GET /api/studio/image?prompt=...  → image JPEG générée (avatars, plans)
// La clé POLLINATIONS_KEY reste côté serveur ; sans clé, on passe par
// l'accès anonyme (limité à environ une image toutes les 45 secondes).
// ------------------------------------------------------------------
const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const KEY = process.env.POLLINATIONS_KEY || '';
const MODEL = process.env.POLLINATIONS_MODEL || 'flux';

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d\'images demandées. Réessayez dans quelques minutes.' },
});

const clampSize = (v, def) => Math.min(1280, Math.max(64, Number(v) || def));

router.get('/status', (_req, res) => {
  res.json({ ok: true, key: Boolean(KEY) });
});

router.get('/image', limiter, async (req, res, next) => {
  try {
    const prompt = String(req.query.prompt || '').trim().slice(0, 1500);
    if (!prompt) return res.status(400).json({ error: 'Description manquante.' });
    const params = new URLSearchParams({
      width: String(clampSize(req.query.width, 512)),
      height: String(clampSize(req.query.height, 512)),
      seed: String(Math.abs(parseInt(req.query.seed, 10) || 0) % 1e9),
      nologo: 'true',
      model: MODEL,
    });
    const url = KEY
      ? 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?' + params
      : 'https://image.pollinations.ai/prompt/' + encodeURIComponent(prompt) + '?' + params;

    const upstream = await fetch(url, {
      headers: KEY ? { Authorization: 'Bearer ' + KEY } : {},
      signal: AbortSignal.timeout(120000),
    });
    const type = upstream.headers.get('content-type') || '';
    if (upstream.status === 402 || upstream.status === 429) {
      return res.status(429).json({ error: KEY ? 'Crédit de la clé épuisé.' : 'Limite gratuite atteinte : ajoutez une clé POLLINATIONS_KEY.' });
    }
    if (!upstream.ok || !type.startsWith('image/')) {
      return res.status(502).json({ error: 'Le service d\'images n\'a pas répondu.' });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.set('Cache-Control', 'public, max-age=86400');
    res.type(type).send(buf);
  } catch (err) {
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      return res.status(504).json({ error: 'Le service d\'images a mis trop de temps.' });
    }
    next(err);
  }
});

module.exports = router;
