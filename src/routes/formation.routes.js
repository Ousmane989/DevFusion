'use strict';

// ------------------------------------------------------------------
// GET /api/formation — liens des vidéos de formation, pour le commerçant
// connecté (lecture seule). L'administrateur les définit via /api/admin.
// ------------------------------------------------------------------
const express = require('express');
const { requireAuth } = require('../middleware');
const { readFormation } = require('../formation');

const router = express.Router();

router.get('/', requireAuth, async (_req, res, next) => {
  try {
    res.json({ ok: true, videos: await readFormation() });
  } catch (err) { next(err); }
});

module.exports = router;
