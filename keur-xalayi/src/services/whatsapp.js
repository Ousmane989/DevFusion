'use strict';

// Envoi de messages WhatsApp. Trois canaux :
//   • manuel : on prépare un lien wa.me pré-rempli ; la personne clique et
//              envoie depuis son propre WhatsApp (aucun compte API requis) ;
//   • meta   : WhatsApp Business Cloud API (graph.facebook.com) ;
//   • twilio : API Twilio pour WhatsApp.
// Chaque message est enregistré dans la table `messages` (historique).
const crypto = require('crypto');
const config = require('../config');
const { query } = require('../db');

/** Lien « clic pour envoyer » : https://wa.me/22212345678?text=... */
function lienWaMe(telephone, texte) {
  return `https://wa.me/${String(telephone).replace(/\D/g, '')}?text=${encodeURIComponent(texte)}`;
}

async function envoyerMeta(telephone, texte, document) {
  const m = config.whatsapp.meta;
  const url = `https://graph.facebook.com/${m.version}/${m.phoneNumberId}/messages`;
  const to = String(telephone).replace(/\D/g, '');
  let body;
  if (document) {
    body = { messaging_product: 'whatsapp', to, type: 'document', document: { link: document.link, filename: document.filename, caption: texte } };
  } else if (m.template) {
    // Hors fenêtre de conversation de 24 h, Meta impose un modèle approuvé.
    body = {
      messaging_product: 'whatsapp', to, type: 'template',
      template: { name: m.template, language: { code: m.templateLang }, components: [{ type: 'body', parameters: [{ type: 'text', text: texte }] }] },
    };
  } else {
    body = { messaging_product: 'whatsapp', to, type: 'text', text: { preview_url: true, body: texte } };
  }
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${m.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data.error && data.error.message) || `Erreur Meta ${r.status}`);
  return data.messages && data.messages[0] && data.messages[0].id;
}

async function envoyerTwilio(telephone, texte, document) {
  const t = config.whatsapp.twilio;
  const url = `https://api.twilio.com/2010-04-01/Accounts/${t.sid}/Messages.json`;
  const form = new URLSearchParams({ From: t.from, To: `whatsapp:${telephone}`, Body: texte });
  if (document) form.append('MediaUrl', document.link);
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${t.sid}:${t.token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
    signal: AbortSignal.timeout(15000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || `Erreur Twilio ${r.status}`);
  return data.sid;
}

/**
 * Envoie (ou prépare) une liste de messages et les enregistre.
 * @param {Array<{telephone, texte, destinataire, eleve_id, document?}>} liste
 * @param {{type, mois?, userId?, canal?}} opts  canal 'manuel' force les liens wa.me
 * @returns {Promise<Array>} messages enregistrés (+ lien wa.me)
 */
async function envoyerMessages(liste, opts) {
  const canal = opts.canal || config.whatsapp.mode;
  const lot = crypto.randomUUID();
  const resultats = [];
  for (const msg of liste) {
    let statut = 'a_envoyer';
    let erreur = null;
    let idExterne = null;
    try {
      if (canal === 'meta') { idExterne = await envoyerMeta(msg.telephone, msg.texte, msg.document); statut = 'envoye'; }
      else if (canal === 'twilio') { idExterne = await envoyerTwilio(msg.telephone, msg.texte, msg.document); statut = 'envoye'; }
    } catch (e) {
      statut = 'echec';
      erreur = String(e.message || e).slice(0, 500);
    }
    const texteFinal = canal === 'manuel' && msg.document ? `${msg.texte}\n${msg.document.link}` : msg.texte;
    const [row] = await query(
      `INSERT INTO messages (lot, type, eleve_id, destinataire, telephone, contenu, canal, statut, erreur, id_externe, mois, envoye_par)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [lot, opts.type, msg.eleve_id || null, msg.destinataire || null, msg.telephone, texteFinal,
        canal === 'meta' || canal === 'twilio' ? canal : 'manuel', statut, erreur, idExterne, opts.mois || null, opts.userId || null]);
    row.lien = lienWaMe(msg.telephone, texteFinal);
    resultats.push(row);
    // Petite pause entre deux appels d'API pour respecter les limites de débit.
    if (canal !== 'manuel') await new Promise((r) => setTimeout(r, 120));
  }
  return resultats;
}

module.exports = { envoyerMessages, lienWaMe };
