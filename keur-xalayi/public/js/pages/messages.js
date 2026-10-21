// Annonces groupées WhatsApp (école, classe, parent, numéro) et historique.
import { get, post, e, qs, options, champ, dateHeure, badge, tableau, erreur, resultatEnvoi, modale, lireForm } from '../ui.js';

const MODELES = {
  reunion: 'Bonjour {nom_parent}, l\'école {ecole} vous invite à une réunion des parents le [DATE] à [HEURE]. Votre présence est importante. Merci.',
  fete: 'Bonjour {nom_parent}, l\'école {ecole} organise sa fête de fin d\'année le [DATE]. {nom_eleve} et toute l\'équipe vous y attendent avec plaisir !',
  vacances: 'Bonjour {nom_parent}, nous vous informons que les vacances commencent le [DATE]. Reprise des cours le [DATE]. Bonnes vacances à {nom_eleve} !',
  fermeture: 'Bonjour {nom_parent}, l\'école {ecole} sera exceptionnellement fermée le [DATE] en raison de [MOTIF]. Merci de votre compréhension.',
  libre: 'Bonjour {nom_parent}, ',
};
const TYPES = { rappel: 'Rappel', second_rappel: '2ᵉ rappel', annonce: 'Annonce', absence: 'Absence', bulletin: 'Bulletin', recu: 'Reçu', test: 'Test' };
const STATUTS = { envoye: 'Envoyé', echec: 'Échec', a_envoyer: 'À envoyer', ouvert: 'Ouvert dans WhatsApp' };

export async function afficher(el, params) {
  const classes = await get('/classes');
  el.innerHTML = `
    <div class="entete-page"><h1>Annonces & historique</h1></div>
    <div class="onglets"><button data-o="annonce">📢 Nouvelle annonce</button><button data-o="historique">📜 Historique des envois</button></div>
    <div id="zone"></div>`;
  const zone = el.querySelector('#zone');

  const vues = {
    annonce() {
      zone.innerHTML = `<div class="carte"><form id="f">
        <div class="grille g2">
          ${champ('Destinataires', `<select name="cible" id="cible">${options([['ecole', 'Tous les parents de l\'école'], ['classe', 'Les parents d\'une classe'], ['parent', 'Un parent précis'], ['numero', 'Un autre numéro']], 'ecole')}</select>`, { aide: 'Un seul message par famille, même avec plusieurs enfants.' })}
          <div id="z-classe" class="cache">${champ('Classe', `<select name="classe_id">${options(classes.map((c) => [c.id, c.nom]), '', { vide: '— Choisir —' })}</select>`)}</div>
          <div id="z-parent" class="cache">${champ('Élève', '<input id="q-eleve" placeholder="Tapez le nom de l\'élève…" autocomplete="off"><input type="hidden" name="eleve_id"><div id="sugg"></div>')}</div>
          <div id="z-numero" class="cache">${champ('Numéro WhatsApp', '<input name="telephone" placeholder="+221 77 123 45 67">')}</div>
        </div>
        ${champ('Modèle', `<select id="modele">${options([['libre', 'Message libre'], ['reunion', 'Réunion des parents'], ['fete', 'Fête de l\'école'], ['vacances', 'Vacances'], ['fermeture', 'Fermeture exceptionnelle']], 'libre')}</select>`)}
        ${champ('Message', `<textarea name="texte" id="texte" rows="6" required>${e(MODELES.libre)}</textarea>`, { aide: 'Variables : {nom_parent}, {nom_eleve}, {classe}, {ecole}. Remplacez les [CROCHETS].' })}
        <label class="case"><input type="checkbox" name="manuel"> Envoyer moi-même depuis mon WhatsApp (liens wa.me)</label>
        <div class="ligne fin" style="margin-top:.8rem"><button class="btn vert">📲 Préparer l'envoi</button></div>
      </form></div>`;
      const f = zone.querySelector('#f');
      const cible = f.querySelector('#cible');
      const majCible = () => ['classe', 'parent', 'numero'].forEach((c) => f.querySelector('#z-' + c).classList.toggle('cache', cible.value !== c));
      cible.onchange = majCible; majCible();
      f.querySelector('#modele').onchange = (ev) => { f.querySelector('#texte').value = MODELES[ev.target.value]; };
      let t;
      f.querySelector('#q-eleve').oninput = (ev) => {
        clearTimeout(t);
        t = setTimeout(async () => {
          const l = ev.target.value.length >= 2 ? await get('/eleves' + qs({ q: ev.target.value })) : [];
          const s = f.querySelector('#sugg');
          s.innerHTML = l.slice(0, 6).map((x) => `<button type="button" class="btn clair petit" style="margin:.2rem" data-id="${x.id}" data-n="${e(x.prenom + ' ' + x.nom)}">${e(x.prenom)} ${e(x.nom)} (${e(x.classe || '')})</button>`).join('');
          s.querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => { f.eleve_id.value = b.dataset.id; f.querySelector('#q-eleve').value = b.dataset.n; s.innerHTML = ''; }; });
        }, 250);
      };
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        const d = lireForm(f);
        if (d.cible === 'classe' && !d.classe_id) { erreur(new Error('Choisissez la classe.')); return; }
        if (d.cible === 'parent' && !d.eleve_id) { erreur(new Error('Choisissez l\'élève dans la liste des suggestions.')); return; }
        if (/\[[A-Z]+\]/.test(d.texte) && !confirm('Le message contient encore des [CROCHETS] à remplacer. Envoyer quand même ?')) return;
        try {
          const apercu = await post('/whatsapp/annonce', { ...d, apercu: true });
          const md = modale('Confirmer l\'envoi', `<p><b>${apercu.length}</b> famille(s) vont recevoir ce message :</p>
            <div class="alerte info"><i>${e(apercu[0].texte)}</i></div>`, {
            actions: `<button class="btn clair" data-f>Annuler</button><button class="btn vert" data-go>📲 Envoyer à ${apercu.length} famille(s)</button>`,
          });
          md.el.querySelector('[data-f]').onclick = md.fermer;
          md.el.querySelector('[data-go]').onclick = async (b) => {
            b.target.disabled = true;
            try { const r = await post('/whatsapp/annonce', d); md.fermer(); resultatEnvoi(r, 'Annonce'); } catch (err) { erreur(err); b.target.disabled = false; }
          };
        } catch (err) { erreur(err); }
      };
    },

    async historique() {
      zone.innerHTML = `<div class="filtres">
          <input type="search" id="q" class="recherche" placeholder="🔍 Parent, numéro ou contenu">
          <select id="type">${options(Object.entries(TYPES), '', { vide: 'Tous les types' })}</select>
          <select id="statut">${options(Object.entries(STATUTS), params.statut || '', { vide: 'Tous les statuts' })}</select>
          <input type="date" id="du" title="Du">
        </div><div id="tab"></div>`;
      const charger = async () => {
        const l = await get('/whatsapp/historique' + qs({ q: zone.querySelector('#q').value, type: zone.querySelector('#type').value, statut: zone.querySelector('#statut').value, du: zone.querySelector('#du').value }));
        zone.querySelector('#tab').innerHTML = tableau([
          { titre: 'Date', rendu: (m) => `<span class="nowrap">${dateHeure(m.created_at)}</span><div class="petit muted">${e(m.envoye_par_nom || 'Automatique')}</div>` },
          { titre: 'Type', rendu: (m) => e(TYPES[m.type]) },
          { titre: 'Destinataire', rendu: (m) => `${e(m.destinataire || '')}<div class="petit muted">${e(m.telephone)}</div>` },
          { titre: 'Message', rendu: (m) => `<span class="petit" title="${e(m.contenu)}">${e(m.contenu.slice(0, 110))}${m.contenu.length > 110 ? '…' : ''}</span>` },
          { titre: 'Statut', rendu: (m) => badge(m.statut, STATUTS[m.statut]) + (m.erreur ? `<div class="petit" style="color:var(--danger)">${e(m.erreur)}</div>` : '') },
          { titre: '', rendu: (m) => (m.statut !== 'envoye' ? `<a class="btn petit vert" href="${e(m.lien)}" target="_blank" rel="noopener" data-msg="${m.id}">Envoyer</a>` : '') },
        ], l, { vide: 'Aucun message.' });
        zone.querySelectorAll('[data-msg]').forEach((a) => a.addEventListener('click', () => {
          post(`/whatsapp/messages/${a.dataset.msg}/ouvert`).catch(() => {});
          a.textContent = '✔'; a.classList.replace('vert', 'clair');
        }));
      };
      zone.querySelectorAll('select, input[type=date]').forEach((s) => { s.onchange = charger; });
      let t;
      zone.querySelector('#q').oninput = () => { clearTimeout(t); t = setTimeout(charger, 300); };
      await charger();
    },
  };
  const montrer = (nom) => {
    el.querySelectorAll('[data-o]').forEach((b) => b.classList.toggle('actif', b.dataset.o === nom));
    Promise.resolve(vues[nom]()).catch(erreur);
  };
  el.querySelectorAll('[data-o]').forEach((b) => { b.onclick = () => montrer(b.dataset.o); });
  montrer(params.statut ? 'historique' : 'annonce');
}
