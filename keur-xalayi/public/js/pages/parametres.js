// Paramètres : école, logo, devise, tarifs par niveau, notes, messages,
// WhatsApp et sauvegardes.
import { get, post, put, del, e, options, champ, champTel, activerTels, lireForm, tableau, dateHeure, toast, erreur, reduireImage, formulaire, confirmer, resultatEnvoi } from '../ui.js';
import { rafraichirContexte } from '../app.js';

const NIVEAUX_CODES = ['CP', 'CE1', 'CE2', 'CM1', 'CM2'];

export async function afficher(el, params) {
  el.innerHTML = `<div class="entete-page"><h1>Paramètres</h1></div>
    <div class="onglets">
      <button data-o="ecole">🏫 École</button><button data-o="tarifs">💰 Tarifs</button><button data-o="notes">📝 Notes</button>
      <button data-o="messages">💬 Messages</button><button data-o="sauvegardes">💾 Sauvegardes</button>
    </div><div id="zone"></div>`;
  const zone = el.querySelector('#zone');

  const enregistrer = (form, apres) => async (ev) => {
    ev.preventDefault();
    try { await put('/parametres', { ...lireForm(form), ...(apres ? apres() : {}) }); await rafraichirContexte(); toast('Paramètres enregistrés.', 'succes'); } catch (err) { erreur(err); }
  };

  const vues = {
    async ecole() {
      const p = await get('/parametres');
      let logo = p.logo;
      zone.innerHTML = `<form class="carte" id="f">
        <div class="grille g2">
          <div>${champ('Logo de l\'école', `<div class="ligne"><div id="apercu"></div><div>
            <label class="btn clair petit" style="margin:0">🖼️ Choisir une image<input type="file" id="logo" accept="image/png,image/jpeg" class="cache"></label><br>
            <button type="button" class="btn lien petit" id="sans-logo">Revenir au logo officiel</button></div></div>`, { aide: 'Image carrée de préférence (PNG ou JPEG). Il apparaît sur les reçus, bulletins et cartes.' })}</div>
          <div>
            ${champ('Nom de l\'école', `<input name="nom_ecole" required value="${e(p.nom_ecole)}">`, { requis: true })}
            ${champ('Slogan / sous-titre', `<input name="slogan" value="${e(p.slogan)}">`)}
          </div>
          ${champ('Adresse', `<input name="adresse" value="${e(p.adresse)}" placeholder="Quartier, ville">`)}
          ${champ('Téléphone', `<input name="telephone" value="${e(p.telephone)}" placeholder="+222 …">`)}
          ${champ('E-mail', `<input type="email" name="email" value="${e(p.email)}">`)}
          ${champ('Devise', `<select name="devise">${options([['MRU', 'Ouguiya (MRU) — Mauritanie'], ['FCFA', 'Franc CFA (FCFA) — Sénégal']], p.devise)}</select>`)}
          ${champ('Indicatif téléphonique par défaut', `<select name="indicatif_defaut">${options([['+222', '+222 (Mauritanie)'], ['+221', '+221 (Sénégal)']], p.indicatif_defaut)}</select>`)}
        </div>
        <div class="ligne fin"><button class="btn">💾 Enregistrer</button></div></form>`;
      const apercu = () => { zone.querySelector('#apercu').innerHTML = logo ? `<img src="${e(logo)}" alt="" style="width:90px;height:90px;object-fit:contain;border-radius:12px;border:1px solid var(--bord);background:#fff">` : '<img src="/img/logo.png" alt="" style="width:90px;height:90px;object-fit:contain;border-radius:12px;border:1px solid var(--bord);background:#fff">'; };
      apercu();
      zone.querySelector('#logo').onchange = async (ev) => { try { logo = await reduireImage(ev.target.files[0], { max: 400, type: 'image/png' }); apercu(); } catch (err) { erreur(err); } };
      zone.querySelector('#sans-logo').onclick = () => { logo = null; apercu(); };
      const f = zone.querySelector('#f');
      f.onsubmit = enregistrer(f, () => ({ logo }));
    },

    async tarifs() {
      const niveaux = await get('/parametres/niveaux');
      zone.innerHTML = `<div class="alerte info">Tarifs par défaut de chaque niveau. Une classe peut avoir son propre tarif (page Classes) et chaque élève une réduction (fiche élève).</div>
        ${tableau([
    { titre: 'Niveau', rendu: (n) => `<b>${e(n.nom)}</b> <span class="petit muted">${n.cycle === 'maternelle' ? 'maternelle' : 'primaire'}</span>` },
    { titre: 'Frais d\'inscription', rendu: (n) => `<input type="number" min="0" step="any" data-frais="${n.id}" value="${n.frais_inscription}" style="max-width:160px">` },
    { titre: 'Mensualité', rendu: (n) => `<input type="number" min="0" step="any" data-mens="${n.id}" value="${n.mensualite}" style="max-width:160px">` },
  ], niveaux)}
        <label class="case" style="margin-top:.8rem"><input type="checkbox" id="appliquer"> Appliquer aussi les nouvelles mensualités aux élèves déjà inscrits cette année</label>
        <div class="ligne fin"><button class="btn" id="enreg">💾 Enregistrer les tarifs</button></div>`;
      zone.querySelector('#enreg').onclick = async () => {
        try {
          for (const n of niveaux) {
            const frais = Number(zone.querySelector(`[data-frais="${n.id}"]`).value || 0);
            const mens = Number(zone.querySelector(`[data-mens="${n.id}"]`).value || 0);
            const appliquer = zone.querySelector('#appliquer').checked;
            if (frais !== n.frais_inscription || mens !== n.mensualite || appliquer) {
              await put(`/parametres/niveaux/${n.id}`, { frais_inscription: frais, mensualite: mens, appliquer_inscriptions: appliquer });
            }
          }
          toast('Tarifs enregistrés.', 'succes');
          vues.tarifs();
        } catch (err) { erreur(err); }
      };
    },

    async notes() {
      const [p, matieres, competences] = await Promise.all([get('/parametres'), get('/parametres/matieres'), get('/parametres/competences')]);
      zone.innerHTML = `<form class="carte" id="f"><h2>Périodes d'évaluation</h2><div class="grille g2">
          ${champ('Nom de la période', `<select name="libelle_periode">${options([['Trimestre', 'Trimestre'], ['Composition', 'Composition'], ['Semestre', 'Semestre']], p.libelle_periode)}</select>`)}
          ${champ('Nombre de périodes par an', `<input type="number" name="nb_periodes" min="1" max="6" value="${p.nb_periodes}">`)}</div>
          <div class="ligne fin"><button class="btn">💾 Enregistrer</button></div></form>
        <div class="carte"><div class="ligne"><h2 style="flex:1">Matières (primaire)</h2><button class="btn petit" id="aj-mat">＋ Matière</button></div>
          ${tableau([
    { titre: 'Matière', rendu: (m) => `<b>${e(m.nom)}</b>` },
    { titre: 'Coef.', classe: 'num', rendu: (m) => m.coefficient },
    { titre: 'Barème', rendu: (m) => `/${m.bareme}` },
    { titre: 'Niveaux', rendu: (m) => e(m.niveaux.join(', ')) },
    { titre: '', rendu: (m) => `<button class="btn petit clair" data-mat="${m.id}">✏️</button> <button class="btn petit clair" data-supmat="${m.id}">🗑️</button>` },
  ], matieres)}</div>
        <div class="carte"><div class="ligne"><h2 style="flex:1">Compétences (maternelle)</h2><button class="btn petit" id="aj-comp">＋ Compétence</button></div>
          ${tableau([
    { titre: 'Domaine', rendu: (c) => `<b>${e(c.domaine)}</b>` },
    { titre: 'Compétence', rendu: (c) => e(c.libelle) },
    { titre: '', rendu: (c) => `<button class="btn petit clair" data-supcomp="${c.id}">🗑️</button>` },
  ], competences)}</div>`;
      const f = zone.querySelector('#f');
      f.onsubmit = async (ev) => {
        ev.preventDefault();
        try { await put('/parametres', { libelle_periode: f.libelle_periode.value, nb_periodes: Number(f.nb_periodes.value) }); await rafraichirContexte(); toast('Enregistré.', 'succes'); } catch (err) { erreur(err); }
      };
      const ficheMat = (m = {}) => `${champ('Nom', `<input name="nom" required value="${e(m.nom)}">`, { requis: true })}
        <div class="grille g2">${champ('Coefficient', `<input type="number" name="coefficient" min="0.5" step="0.5" value="${m.coefficient || 1}">`)}
        ${champ('Barème', `<select name="bareme">${options([[10, 'Sur 10'], [20, 'Sur 20']], m.bareme || 10)}</select>`)}</div>
        ${champ('Niveaux concernés', `<div class="ligne">${NIVEAUX_CODES.map((n) => `<label class="case"><input type="checkbox" name="niveaux" data-multiple value="${n}" ${!m.niveaux || m.niveaux.includes(n) ? 'checked' : ''}> ${n}</label>`).join('')}</div>`)}`;
      const normal = (d) => ({ ...d, coefficient: Number(d.coefficient), bareme: Number(d.bareme) });
      zone.querySelector('#aj-mat').onclick = () => formulaire('Nouvelle matière', ficheMat(), async (d) => { await post('/parametres/matieres', normal(d)); vues.notes(); });
      zone.querySelectorAll('[data-mat]').forEach((b) => {
        const m = matieres.find((x) => String(x.id) === b.dataset.mat);
        b.onclick = () => formulaire(m.nom, ficheMat(m), async (d) => { await put(`/parametres/matieres/${m.id}`, normal(d)); vues.notes(); });
      });
      zone.querySelectorAll('[data-supmat]').forEach((b) => {
        b.onclick = async () => { if (await confirmer('Supprimer cette matière et toutes ses notes ?', { danger: true, ok: 'Supprimer' })) { await del(`/parametres/matieres/${b.dataset.supmat}`); vues.notes(); } };
      });
      zone.querySelector('#aj-comp').onclick = () => formulaire('Nouvelle compétence',
        champ('Domaine', `<input name="domaine" required list="domaines"><datalist id="domaines">${[...new Set(competences.map((c) => c.domaine))].map((d) => `<option value="${e(d)}">`).join('')}</datalist>`, { requis: true })
        + champ('Compétence', '<input name="libelle" required>', { requis: true }),
        async (d) => { await post('/parametres/competences', d); vues.notes(); });
      zone.querySelectorAll('[data-supcomp]').forEach((b) => {
        b.onclick = async () => { if (await confirmer('Supprimer cette compétence ?', { danger: true, ok: 'Supprimer' })) { await del(`/parametres/competences/${b.dataset.supcomp}`); vues.notes(); } };
      });
    },

    async messages() {
      const p = await get('/parametres');
      const modes = { manuel: 'Manuel — liens wa.me (aucun compte API)', meta: 'WhatsApp Business Cloud API (Meta)', twilio: 'Twilio' };
      zone.innerHTML = `<div class="carte"><h2>📡 Connexion WhatsApp</h2>
          <p>Mode actuel : <b>${e(modes[p.whatsapp.mode] || p.whatsapp.mode)}</b> ${p.whatsapp.configure ? '<span class="badge ok">Prêt</span>' : '<span class="badge ko">Identifiants manquants</span>'}</p>
          <p class="petit muted">Le mode et les identifiants de l'API se règlent dans le fichier <code>.env</code> du serveur (variables <code>WHATSAPP_MODE</code>, <code>META_WA_*</code> ou <code>TWILIO_*</code>), pour qu'ils ne soient jamais visibles dans le navigateur.</p>
          <div class="ligne"><div style="flex:1;min-width:240px">${champTel('tel_test', '')}</div><button class="btn sec" id="test">Envoyer un message de test</button></div></div>
        <form class="carte" id="f"><h2>✉️ Autres modèles de messages</h2>
          ${champ('Absence / retard', `<textarea name="modele_absence" rows="3">${e(p.modele_absence)}</textarea>`, { aide: 'Variables : {nom_parent} {nom_eleve} {classe} {statut} {date}' })}
          <label class="case"><input type="checkbox" name="notif_absence_auto" ${p.notif_absence_auto ? 'checked' : ''}> Prévenir automatiquement les parents dès que l'appel est enregistré</label>
          ${champ('Confirmation de paiement (reçu)', `<textarea name="modele_recu" rows="3">${e(p.modele_recu)}</textarea>`, { aide: 'Variables : {nom_parent} {nom_eleve} {classe} {montant} {objet} {numero}' })}
          ${champ('Résultats / bulletin', `<textarea name="modele_bulletin" rows="3">${e(p.modele_bulletin)}</textarea>`, { aide: 'Variables : {nom_parent} {nom_eleve} {classe} {periode} {moyenne} {rang} {effectif}' })}
          <p class="petit muted">Les modèles de rappel de paiement se trouvent dans la page « Rappels WhatsApp ».</p>
          <div class="ligne fin"><button class="btn">💾 Enregistrer</button></div></form>`;
      activerTels(zone);
      const f = zone.querySelector('#f');
      f.onsubmit = enregistrer(f);
      zone.querySelector('#test').onclick = async () => {
        try { resultatEnvoi([await post('/whatsapp/test', { telephone: zone.querySelector('[name=tel_test]').value })], 'Message de test'); } catch (err) { erreur(err); }
      };
    },

    async sauvegardes() {
      const liste = await get('/parametres/sauvegardes');
      zone.innerHTML = `<div class="alerte info">Une sauvegarde complète est faite automatiquement chaque nuit (les 30 dernières sont conservées).
          Téléchargez-en une régulièrement et gardez-la sur une clé USB ou un autre ordinateur.</div>
        <div class="ligne" style="margin-bottom:.8rem"><button class="btn" id="maintenant">💾 Sauvegarder maintenant</button></div>
        ${tableau([
    { titre: 'Date', rendu: (s) => dateHeure(s.created_at) },
    { titre: 'Type', rendu: (s) => (s.auto ? 'Automatique' : 'Manuelle') },
    { titre: 'Taille', classe: 'num', rendu: (s) => `${Math.round(s.taille / 1024)} Ko` },
    { titre: '', rendu: (s) => `<a class="btn petit clair" href="/api/parametres/sauvegardes/${s.id}/telecharger">⬇ Télécharger</a>` },
  ], liste, { vide: 'Aucune sauvegarde pour le moment.' })}`;
      zone.querySelector('#maintenant').onclick = async (ev) => {
        ev.target.disabled = true;
        try { await post('/parametres/sauvegardes'); toast('Sauvegarde effectuée.', 'succes'); vues.sauvegardes(); } catch (err) { erreur(err); ev.target.disabled = false; }
      };
    },
  };

  const montrer = (nom) => {
    el.querySelectorAll('[data-o]').forEach((b) => b.classList.toggle('actif', b.dataset.o === nom));
    vues[nom]().catch(erreur);
  };
  el.querySelectorAll('[data-o]').forEach((b) => { b.onclick = () => montrer(b.dataset.o); });
  montrer(vues[params.onglet] ? params.onglet : 'ecole');
}
