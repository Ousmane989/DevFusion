// =====================================================================
// Outils partagés de l'interface : appels à l'API, formatage, fenêtres,
// notifications, tableaux et graphiques.
// =====================================================================

/** Contexte global (utilisateur, école, année) rempli au démarrage. */
export const ctx = { utilisateur: null, ecole: null, annee: null };

// ---------- API ----------
export async function api(chemin, { methode = 'GET', corps, brut = false } = {}) {
  const r = await fetch('/api' + chemin, {
    method: methode,
    headers: corps !== undefined ? { 'Content-Type': 'application/json' } : {},
    body: corps !== undefined ? JSON.stringify(corps) : undefined,
    credentials: 'same-origin',
  });
  if (r.status === 401) { location.replace('/'); throw new Error('Session expirée.'); }
  if (brut) return r;
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erreur || `Erreur ${r.status}`);
  return d;
}
export const get = (c) => api(c);
export const post = (c, corps = {}) => api(c, { methode: 'POST', corps });
export const put = (c, corps = {}) => api(c, { methode: 'PUT', corps });
export const del = (c) => api(c, { methode: 'DELETE' });

/** Construit une chaîne de requête en ignorant les valeurs vides. */
export function qs(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null && v !== '') p.set(k, v);
  const s = p.toString();
  return s ? '?' + s : '';
}

// ---------- Sécurité : échappement HTML ----------
export function e(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Formatage ----------
export const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const MODES = { especes: 'Espèces', bankily: 'Bankily', masrvi: 'Masrvi', sedad: 'Sedad', wave: 'Wave', orange_money: 'Orange Money' };
export const STATUTS = { paye: 'Payé', partiel: 'Partiel', impaye: 'Impayé', non_concerne: '—', present: 'Présent', absent: 'Absent', retard: 'Retard' };
export const ROLES = { directeur: 'Directeur', secretaire: 'Secrétaire / Comptable', enseignant: 'Enseignant' };

export function argent(n) {
  const v = Math.round(Number(n || 0) * 100) / 100;
  return `${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 }).replace(/ | /g, ' ')} ${ctx.ecole ? ctx.ecole.devise : ''}`.trim();
}
export function dateFr(iso) {
  if (!iso) return '';
  const [a, m, j] = String(iso).slice(0, 10).split('-');
  return `${j}/${m}/${a}`;
}
export function dateLongue(iso) {
  const d = new Date(String(iso).slice(0, 10) + 'T12:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
export function dateHeure(ts) {
  return new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
export function nomMois(iso, court = false) {
  const [a, m] = String(iso).split('-').map(Number);
  return court ? `${MOIS_COURTS[m - 1]} ${String(a).slice(2)}` : `${MOIS[m - 1]} ${a}`;
}
export function aujourdhui() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const moisCourant = () => aujourdhui().slice(0, 7) + '-01';
export const badge = (statut, texte) => `<span class="badge ${e(statut)}">${e(texte ?? STATUTS[statut] ?? statut)}</span>`;
export const initiales = (p, n) => e(((p || '')[0] || '') + ((n || '')[0] || '')).toUpperCase();
export function avatar(el, grand = false) {
  return el.a_photo || el.photo
    ? `<img class="avatar ${grand ? 'grand' : ''}" src="/api/eleves/${el.eleve_id || el.id}/photo" alt="" loading="lazy">`
    : `<span class="avatar ${grand ? 'grand' : ''}">${initiales(el.prenom, el.nom)}</span>`;
}

// ---------- Rôles ----------
/** Nom court d'une classe pour les graphiques : « Petite Section A » -> « PS A ». */
export const nomCourt = (nom) => String(nom).replace('Petite Section', 'PS').replace('Moyenne Section', 'MS').replace('Grande Section', 'GS');

export const estRole = (...roles) => roles.includes(ctx.utilisateur.role);

// ---------- Notifications ----------
export function toast(message, type = '') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = message;
  document.getElementById('toasts').appendChild(t);
  setTimeout(() => t.remove(), type === 'erreur' ? 6000 : 3500);
}
export const erreur = (err) => toast(err.message || String(err), 'erreur');

// ---------- Fenêtres modales ----------
/**
 * Ouvre une fenêtre. `contenu` : HTML du corps ; `actions` : HTML des boutons.
 * Renvoie { el, fermer }.
 */
export function modale(titre, contenu, { actions = '', large = false, auFermer } = {}) {
  const fond = document.createElement('div');
  fond.className = 'modale-fond';
  fond.innerHTML = `<div class="modale ${large ? 'large' : ''}" role="dialog" aria-modal="true">
    <header><h2>${e(titre)}</h2><button class="fermer" aria-label="Fermer">×</button></header>
    <div class="corps">${contenu}</div>${actions ? `<footer>${actions}</footer>` : ''}</div>`;
  const fermer = () => { fond.remove(); document.removeEventListener('keydown', echap); if (auFermer) auFermer(); };
  const echap = (ev) => { if (ev.key === 'Escape') fermer(); };
  fond.querySelector('.fermer').onclick = fermer;
  fond.addEventListener('mousedown', (ev) => { if (ev.target === fond) fermer(); });
  document.addEventListener('keydown', echap);
  document.body.appendChild(fond);
  const premier = fond.querySelector('input:not([type=hidden]), select, textarea');
  if (premier && window.innerWidth > 640) premier.focus();
  return { el: fond, fermer };
}

/** Demande de confirmation (renvoie une promesse booléenne). */
export function confirmer(message, { titre = 'Confirmation', ok = 'Confirmer', danger = false } = {}) {
  return new Promise((resolve) => {
    let reponse = false;
    const m = modale(titre, `<p>${e(message)}</p>`, {
      actions: `<button class="btn clair" data-non>Annuler</button><button class="btn ${danger ? 'danger' : ''}" data-oui>${e(ok)}</button>`,
      auFermer: () => resolve(reponse),
    });
    m.el.querySelector('[data-non]').onclick = () => m.fermer();
    m.el.querySelector('[data-oui]').onclick = () => { reponse = true; m.fermer(); };
  });
}

/**
 * Formulaire dans une modale. `champs` : HTML du formulaire.
 * `soumettre(donnees, form)` est appelé à la validation ; s'il réussit, la modale se ferme.
 */
export function formulaire(titre, champs, soumettre, { ok = 'Enregistrer', large = false } = {}) {
  const m = modale(titre, `<form id="fm" novalidate>${champs}<button type="submit" class="cache"></button></form>`, {
    large, actions: `<button class="btn clair" data-annuler>Annuler</button><button class="btn" data-ok>${e(ok)}</button>`,
  });
  const form = m.el.querySelector('form');
  const envoyer = async (ev) => {
    if (ev) ev.preventDefault();
    if (!form.reportValidity()) return;
    const btn = m.el.querySelector('[data-ok]');
    btn.disabled = true;
    try {
      await soumettre(lireForm(form), form);
      m.fermer();
    } catch (err) { erreur(err); } finally { btn.disabled = false; }
  };
  form.onsubmit = envoyer;
  m.el.querySelector('[data-ok]').onclick = envoyer;
  m.el.querySelector('[data-annuler]').onclick = m.fermer;
  return m;
}

/** Lit un formulaire en objet (cases à cocher -> booléens, multiples -> tableaux). */
export function lireForm(form) {
  const d = {};
  for (const el of form.elements) {
    if (!el.name || el.disabled) continue;
    if (el.type === 'checkbox') {
      if (el.dataset.multiple !== undefined) { d[el.name] = d[el.name] || []; if (el.checked) d[el.name].push(el.value); } else d[el.name] = el.checked;
    } else if (el.type === 'radio') { if (el.checked) d[el.name] = el.value; }
    else if (el.multiple) d[el.name] = [...el.selectedOptions].map((o) => o.value);
    else d[el.name] = el.value;
  }
  return d;
}

// ---------- Construction de HTML ----------
export const options = (liste, valeur, { vide } = {}) =>
  (vide !== undefined ? `<option value="">${e(vide)}</option>` : '')
  + liste.map(([v, t]) => `<option value="${e(v)}" ${String(v) === String(valeur ?? '') ? 'selected' : ''}>${e(t)}</option>`).join('');

export function champ(lib, html, { requis = false, aide = '' } = {}) {
  return `<div class="champ"><label class="${requis ? 'requis' : ''}">${e(lib)}</label>${html}${aide ? `<div class="aide">${aide}</div>` : ''}</div>`;
}

/**
 * Tableau responsive. colonnes : [{ titre, rendu(ligne) -> HTML, classe }]
 * Sur téléphone, chaque ligne devient une carte (libellés via data-label).
 */
export function tableau(colonnes, lignes, { vide = 'Aucun élément.', clic, pied } = {}) {
  if (!lignes.length) return `<div class="carte vide"><span class="ico">📭</span>${e(vide)}</div>`;
  return `<div class="table-wrap"><table class="empile"><thead><tr>${colonnes.map((c) => `<th class="${c.classe || ''}">${e(c.titre)}</th>`).join('')}</tr></thead>
    <tbody>${lignes.map((l, i) => `<tr ${clic ? `class="cliquable" data-i="${i}"` : ''}>${colonnes.map((c) => `<td class="${c.classe || ''}" data-label="${e(c.titre)}">${c.rendu(l)}</td>`).join('')}</tr>`).join('')}</tbody>
    ${pied ? `<tfoot><tr>${pied}</tr></tfoot>` : ''}</table></div>`;
}
/** Active le clic sur les lignes d'un tableau rendu avec l'option `clic`. */
export function lignesCliquables(conteneur, lignes, action) {
  conteneur.querySelectorAll('tr.cliquable').forEach((tr) => {
    tr.addEventListener('click', (ev) => { if (!ev.target.closest('a,button,input,select')) action(lignes[tr.dataset.i]); });
  });
}

export const kpi = (lib, val, det = '', couleur = 'var(--primaire)') =>
  `<div class="kpi" style="--couleur:${couleur}"><div class="lib">${e(lib)}</div><div class="val">${val}</div><div class="det">${det}</div></div>`;

export const videHtml = (texte, ico = '📭') => `<div class="vide"><span class="ico">${ico}</span>${e(texte)}</div>`;

// ---------- Graphique en barres (SVG, sans bibliothèque) ----------
/**
 * series : [{ nom, couleur, valeurs: [] }], etiquettes : []
 */
export function graphiqueBarres(etiquettes, series, { hauteur = 220, format = (v) => v } = {}) {
  const W = Math.max(320, etiquettes.length * 60); const H = hauteur; const m = { h: 14, b: 34, g: 52, d: 8 };
  const max = Math.max(1, ...series.flatMap((s) => s.valeurs)) * 1.1;
  const pas = (W - m.g - m.d) / Math.max(1, etiquettes.length);
  const lb = Math.min(26, (pas * 0.7) / series.length);
  const y = (v) => H - m.b - (v / max) * (H - m.b - m.h);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img">`;
  for (let k = 0; k <= 4; k++) {
    const v = (max / 4) * k; const yy = y(v);
    svg += `<line x1="${m.g}" x2="${W - m.d}" y1="${yy}" y2="${yy}" stroke="#eee5da"/><text x="${m.g - 6}" y="${yy + 4}" font-size="10" text-anchor="end" fill="#8a8077">${e(abrege(v))}</text>`;
  }
  etiquettes.forEach((et, i) => {
    const x0 = m.g + i * pas + (pas - lb * series.length) / 2;
    series.forEach((s, j) => {
      const v = s.valeurs[i] || 0;
      svg += `<rect x="${x0 + j * lb}" y="${y(v)}" width="${lb - 2}" height="${Math.max(0, H - m.b - y(v))}" rx="3" fill="${s.couleur}"><title>${e(s.nom)} — ${e(et)} : ${e(format(v))}</title></rect>`;
    });
    svg += `<text x="${m.g + i * pas + pas / 2}" y="${H - m.b + 16}" font-size="11" text-anchor="middle" fill="#5f574f">${e(et)}</text>`;
  });
  svg += '</svg>';
  return `<div class="graphique">${svg}</div><div class="legende">${series.map((s) => `<span><i style="background:${s.couleur}"></i>${e(s.nom)}</span>`).join('')}</div>`;
}
function abrege(v) {
  if (v >= 1e6) return (v / 1e6).toFixed(1).replace('.0', '') + ' M';
  if (v >= 1e3) return Math.round(v / 1e3) + ' k';
  return Math.round(v);
}

// ---------- Photos : réduction côté navigateur ----------
/** Lit un fichier image et le réduit (JPEG) pour l'enregistrer en base. */
export function reduireImage(fichier, { max = 360, qualite = 0.82, type = 'image/jpeg' } = {}) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image non reconnue.'));
      img.onload = () => {
        const r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        const g = c.getContext('2d');
        if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
        g.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL(type, qualite));
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

// ---------- Téléchargements ----------
/** Ouvre un PDF/Excel servi par l'API dans un nouvel onglet. */
export function ouvrir(chemin) { window.open('/api' + chemin, '_blank', 'noopener'); }

/** Boutons d'export Excel + PDF pour une liste. */
export function boutonsExport(liste, params = {}) {
  return `<button class="btn clair petit" data-export="${e(liste)}.xlsx" data-params='${e(JSON.stringify(params))}'>⬇ Excel</button>
    <button class="btn clair petit" data-export="${e(liste)}.pdf" data-params='${e(JSON.stringify(params))}'>⬇ PDF</button>`;
}
export function activerExports(conteneur, lireParams) {
  conteneur.querySelectorAll('[data-export]').forEach((b) => {
    b.onclick = () => ouvrir(`/exports/${b.dataset.export}${qs(lireParams ? lireParams() : JSON.parse(b.dataset.params || '{}'))}`);
  });
}

// ---------- WhatsApp : liste des messages à envoyer en un clic ----------
/**
 * Affiche le résultat d'un envoi : en mode API, bilan envoyés/échecs ;
 * en mode manuel, une liste de boutons « Envoyer » (liens wa.me).
 */
export function resultatEnvoi(messages, titre = 'Messages WhatsApp') {
  if (!messages.length) { toast('Aucun destinataire.'); return; }
  const manuels = messages.filter((m) => m.statut === 'a_envoyer' || m.statut === 'echec');
  const envoyes = messages.filter((m) => m.statut === 'envoye').length;
  const echecs = messages.filter((m) => m.statut === 'echec').length;
  if (!manuels.length) { toast(`${envoyes} message(s) envoyé(s).`, 'succes'); return; }
  const corps = `
    ${envoyes ? `<div class="alerte succes">✔ ${envoyes} message(s) envoyé(s) automatiquement.</div>` : ''}
    ${echecs ? `<div class="alerte danger">✖ ${echecs} échec(s) : vous pouvez les envoyer manuellement ci-dessous.</div>` : ''}
    <div class="alerte info">Cliquez sur « Envoyer » : WhatsApp s'ouvre avec le message déjà écrit, il suffit d'appuyer sur la flèche d'envoi.</div>
    <ul class="liste">${manuels.map((m) => `<li data-id="${m.id}">
      <div class="principal"><b>${e(m.destinataire || m.telephone)}</b><span class="petit muted">${e(m.telephone)} — ${e(m.contenu.slice(0, 90))}…</span></div>
      <a class="btn vert petit" href="${e(m.lien)}" target="_blank" rel="noopener" data-msg="${m.id}">Envoyer</a></li>`).join('')}</ul>`;
  const md = modale(titre, corps, { large: true, actions: '<button class="btn clair" data-f>Terminé</button>' });
  md.el.querySelector('[data-f]').onclick = md.fermer;
  md.el.querySelectorAll('[data-msg]').forEach((a) => a.addEventListener('click', () => {
    post(`/whatsapp/messages/${a.dataset.msg}/ouvert`).catch(() => {});
    a.textContent = '✔ Ouvert'; a.classList.replace('vert', 'clair');
  }));
}

/** Champ numéro de téléphone avec choix de l'indicatif (+222 / +221). */
export function champTel(nom, valeur, { requis = false } = {}) {
  const v = String(valeur || '');
  const ind = v.startsWith('+221') ? '+221' : v.startsWith('+222') ? '+222' : (ctx.ecole ? ctx.ecole.indicatif_defaut : '+222');
  const num = v.replace(/^\+22[12]/, '');
  return `<div class="tel" data-tel="${e(nom)}"><select aria-label="Indicatif">${options([['+222', '🇲🇷 +222'], ['+221', '🇸🇳 +221']], ind)}</select>
    <input inputmode="tel" placeholder="${ind === '+221' ? '77 123 45 67' : '22 12 34 56'}" value="${e(num)}" ${requis ? 'required' : ''}>
    <input type="hidden" name="${e(nom)}" value="${e(v)}"></div>`;
}
/** Synchronise les champs téléphone (indicatif + numéro) vers le champ caché. */
export function activerTels(conteneur) {
  conteneur.querySelectorAll('[data-tel]').forEach((w) => {
    const [sel, inp, cache] = [w.querySelector('select'), w.querySelector('input:not([type=hidden])'), w.querySelector('input[type=hidden]')];
    const maj = () => { const n = inp.value.replace(/\D/g, ''); cache.value = n ? sel.value + n : ''; };
    sel.onchange = maj; inp.oninput = maj; maj();
  });
}
