'use strict';

const nodemailer = require('nodemailer');
const db = require('./db');

const hasSmtp = Boolean(process.env.SMTP_HOST);

let transporter = null;
if (hasSmtp) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE) === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
}

const BRAND = {
  bg: '#0D0D0D',
  gold: '#D4AF37',
  goldLight: '#F5D77E',
  text: '#F4F1EA',
};

// Lit la configuration e-mail depuis app_config (modifiable dans l'espace
// admin), avec repli sur les variables d'environnement.
async function emailConfig() {
  const get = async (k, def) => {
    try { const r = await db.prepare('SELECT value FROM app_config WHERE key = ?').get(k); return (r && r.value) || def; }
    catch (_) { return def; }
  };
  return {
    apiKey: await get('email_api_key', process.env.BREVO_API_KEY || ''),
    fromEmail: await get('email_from', process.env.MAIL_FROM_EMAIL || 'no-reply@karat.shop'),
    fromName: await get('email_from_name', process.env.MAIL_FROM_NAME || 'Karat'),
  };
}
async function emailConfigured() {
  const c = await emailConfig();
  return Boolean(c.apiKey) || Boolean(transporter);
}

function codeEmailHtml(name, code, intro) {
  return `
  <div style="background:${BRAND.bg};padding:32px;font-family:Arial,Helvetica,sans-serif;color:${BRAND.text}">
    <div style="max-width:520px;margin:0 auto;background:#141414;border:1px solid #2a2a2a;border-radius:16px;overflow:hidden">
      <div style="padding:28px 32px;border-bottom:1px solid #2a2a2a">
        <span style="font-size:24px;font-weight:700;letter-spacing:1px;
          background:linear-gradient(90deg,${BRAND.gold},${BRAND.goldLight});
          -webkit-background-clip:text;background-clip:text;color:${BRAND.gold}">KARAT</span>
      </div>
      <div style="padding:32px">
        <p style="margin:0 0 12px;font-size:16px">Bonjour ${name},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#c9c4b8;line-height:1.6">${intro}</p>
        <div style="text-align:center;margin:28px 0">
          <span style="display:inline-block;font-size:34px;letter-spacing:10px;font-weight:700;
            padding:16px 28px;border-radius:12px;border:1px solid ${BRAND.gold};
            color:${BRAND.goldLight};background:#0f0f0f">${code}</span>
        </div>
        <p style="margin:0;font-size:13px;color:#8a8577;line-height:1.6">
          Ce code expire dans 15 minutes. Si vous n'etes pas a l'origine de cette demande,
          ignorez simplement cet e-mail.
        </p>
      </div>
      <div style="padding:20px 32px;border-top:1px solid #2a2a2a;font-size:12px;color:#6f6a5e">
        Karat — la boutique en ligne a la mesure de vos ambitions.
      </div>
    </div>
  </div>`;
}

// Envoi via l'API HTTP de Brevo (compatible serverless / Netlify).
async function sendViaBrevo(cfg, { to, name, subject, html }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': cfg.apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: cfg.fromName, email: cfg.fromEmail },
      to: [{ email: to, name: name || to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    let detail = ''; try { detail = JSON.stringify(await res.json()); } catch (_) {}
    throw new Error('Brevo ' + res.status + ' ' + detail);
  }
}

/**
 * Envoie un e-mail générique (utilisé pour le test d'envoi admin).
 */
async function sendEmail({ to, name, subject, html }) {
  const cfg = await emailConfig();
  if (cfg.apiKey) { await sendViaBrevo(cfg, { to, name, subject, html }); return { delivered: true }; }
  if (transporter) { await transporter.sendMail({ from: `${cfg.fromName} <${cfg.fromEmail}>`, to, subject, html }); return { delivered: true }; }
  throw new Error('Aucun service e-mail configuré.');
}

/**
 * Envoie un code (verification e-mail ou reinitialisation).
 * Sans service e-mail configuré, le code est journalisé et renvoyé à
 * l'appelant (devCode) pour permettre la saisie à l'écran en attendant.
 */
async function sendCode({ to, name, code, purpose }) {
  const subject =
    purpose === 'reset'
      ? 'Karat — reinitialisation de votre mot de passe'
      : 'Karat — code de verification de votre compte';
  const intro =
    purpose === 'reset'
      ? 'Voici le code pour reinitialiser le mot de passe de votre compte Karat.'
      : 'Bienvenue sur Karat ! Voici le code pour verifier votre adresse e-mail et activer votre compte.';
  const html = codeEmailHtml(name, code, intro);

  const cfg = await emailConfig();
  if (!cfg.apiKey && !transporter) {
    console.log(`\n  [KARAT] Code ${purpose} pour ${to} : ${code} (aucun service e-mail configuré)\n`);
    return { delivered: false, devCode: code };
  }
  try {
    if (cfg.apiKey) await sendViaBrevo(cfg, { to, name, subject, html });
    else await transporter.sendMail({ from: `${cfg.fromName} <${cfg.fromEmail}>`, to, subject, html });
    return { delivered: true };
  } catch (err) {
    console.error(`  ✖ Echec d'envoi de l'e-mail (${purpose}) a ${to} :`, err && err.message ? err.message : err);
    // Échec d'envoi : on renvoie le code pour ne pas bloquer l'utilisateur.
    return { delivered: false, devCode: code, error: true };
  }
}

module.exports = { sendCode, sendEmail, hasSmtp, emailConfig, emailConfigured };
