'use strict';

const nodemailer = require('nodemailer');

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

const MAIL_FROM = process.env.MAIL_FROM || 'Karat <no-reply@karat.mr>';

const BRAND = {
  bg: '#0D0D0D',
  gold: '#D4AF37',
  goldLight: '#F5D77E',
  text: '#F4F1EA',
};

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

/**
 * Envoie un code (verification e-mail ou reinitialisation).
 * En mode developpement sans SMTP, le code est affiche dans la console
 * et renvoye a l'appelant pour faciliter les tests.
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

  if (!transporter) {
    // Mode developpement : pas de serveur SMTP configure.
    console.log('\n──────────────────────────────────────────────');
    console.log(`  [KARAT] Code ${purpose} pour ${to} : ${code}`);
    console.log('──────────────────────────────────────────────\n');
    return { delivered: false, devCode: code };
  }

  await transporter.sendMail({
    from: MAIL_FROM,
    to,
    subject,
    html: codeEmailHtml(name, code, intro),
  });
  return { delivered: true };
}

module.exports = { sendCode, hasSmtp };
