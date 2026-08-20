'use strict';

// Point d'entrée « serveur qui écoute » — utilisé en local et sur un hébergeur
// à processus long (Render, Docker). Sur Vercel, c'est api/index.js qui sert
// l'application sans écouter de port.
const app = require('./src/app');
const { config, validate } = require('./src/config');
const { hasSmtp } = require('./src/mailer');

const { warnings, errors } = validate();
errors.forEach((e) => console.error('  ✖ ' + e));
warnings.forEach((w) => console.warn('  ⚠ ' + w));
if (errors.length && config.isProd) {
  console.error('\n  Configuration invalide en production. Arret.\n');
  process.exit(1);
}

const server = app.listen(config.port, () => {
  console.log(`\n  ✦ Karat (${config.env}) en ligne : http://localhost:${config.port}`);
  console.log(hasSmtp ? '  ✉  SMTP configure — e-mails envoyes.\n' : '  ⚠  SMTP non configure — codes affiches ici (mode dev).\n');
});

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, () => { server.close(() => process.exit(0)); });
}
