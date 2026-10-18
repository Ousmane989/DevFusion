// Fiche élève : identité, parents, paiements mois par mois, présences, historique.
import { get, post, e, avatar, dateFr, argent, nomMois, badge, estRole, tableau, champ, options, formulaire, confirmer, toast, erreur, ouvrir, MODES, modale, aujourdhui, resultatEnvoi } from '../ui.js';
import { encaisser, envoyerRecu } from './_paiement.js';

export async function afficher(el, { id, nouveau }) {
  const d = await get(`/eleves/${id}`);
  const v = d.eleve;
  const insc = d.inscription;
  const gestion = estRole('directeur', 'secretaire');
  const age = v.date_naissance ? Math.floor((Date.now() - new Date(v.date_naissance)) / 31557600000) : null;
  const info = (lib, val) => (val ? `<div><div class="petit muted">${e(lib)}</div><div class="gras">${val}</div></div>` : '');

  el.innerHTML = `
    ${nouveau ? `<div class="alerte succes">✔ Inscription enregistrée. ${gestion && insc ? '<button class="btn petit vert" id="payer-insc">Encaisser les frais d\'inscription</button>' : ''}</div>` : ''}
    ${v.statut === 'archive' ? `<div class="alerte attention">🗄️ Élève archivé le ${dateFr(v.date_sortie)} — ${e(v.motif_sortie || '')}</div>` : ''}
    ${v.remarques ? `<div class="alerte danger">⚠️ <div><b>À savoir :</b> ${e(v.remarques)}</div></div>` : ''}
    <div class="carte">
      <div class="ligne" style="align-items:flex-start;gap:1.2rem">
        ${avatar({ ...v, a_photo: !!v.photo }, true)}
        <div style="flex:1;min-width:220px">
          <h1 style="margin-bottom:.2rem">${e(v.prenom)} ${e(v.nom)}</h1>
          <div class="ligne"><span class="badge info">${e(v.matricule)}</span>${insc ? `<span class="badge neutre">${e(insc.classe)}</span>` : ''}
            <span class="muted">${v.sexe === 'M' ? 'Garçon' : 'Fille'}${age !== null ? ` · ${age} ans` : ''}</span></div>
          <div class="grille g3" style="margin-top:.9rem;gap:.7rem">
            ${info('Né(e) le', [dateFr(v.date_naissance), v.lieu_naissance && 'à ' + e(v.lieu_naissance)].filter(Boolean).join(' '))}
            ${info('Père', e(v.pere_nom))}${info('Mère', e(v.mere_nom))}${info('Tuteur', e(v.tuteur_nom))}
            ${info('WhatsApp', `<a href="https://wa.me/${e(v.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">${e(v.whatsapp)}</a>`)}
            ${info('Téléphone 2', v.telephone2 ? `<a href="tel:${e(v.telephone2)}">${e(v.telephone2)}</a>` : '')}
            ${info('Adresse', e(v.adresse))}
            ${insc ? info('Inscrit le', dateFr(insc.date_inscription)) : ''}
          </div>
        </div>
      </div>
      <div class="ligne" style="margin-top:1rem">
        ${gestion && insc && v.statut === 'actif' ? '<button class="btn" id="payer">💰 Encaisser un paiement</button>' : ''}
        ${gestion ? `<a class="btn clair" href="#/eleves/${v.id}/modifier">✏️ Modifier</a>` : ''}
        ${gestion ? '<button class="btn clair" id="message">💬 Message au parent</button>' : ''}
        ${insc ? `<button class="btn clair" id="carte">🪪 Carte d'élève</button>` : ''}
        <span class="espace"></span>
        ${gestion && v.statut === 'actif' ? '<button class="btn clair" id="archiver">🗄️ Archiver (départ)</button>' : ''}
        ${gestion && (v.statut === 'archive' || !insc) ? '<button class="btn sec" id="reinscrire">↩️ Réinscrire</button>' : ''}
      </div>
    </div>

    <div class="onglets" style="margin-top:1rem">
      ${d.solde ? '<button data-o="paiements" class="actif">Paiements</button>' : ''}
      <button data-o="presences" ${!d.solde ? 'class="actif"' : ''}>Présences</button>
      <button data-o="historique">Historique</button>
    </div>
    <div id="onglet"></div>`;

  const onglets = {
    paiements: () => {
      const s = d.solde;
      return `
        <div class="grille g3" style="margin-bottom:1rem">
          <div class="kpi" style="--couleur:var(--danger)"><div class="lib">Reste dû à ce jour</div><div class="val">${argent(s.totalReste)}</div></div>
          <div class="kpi" style="--couleur:var(--secondaire)"><div class="lib">Mensualité</div><div class="val">${argent(insc.mensualite - insc.reduction)}</div>
            <div class="det">${insc.reduction > 0 ? `Réduction de ${argent(insc.reduction)} — ${e(insc.reduction_motif)}` : 'Sans réduction'}</div></div>
          <div class="kpi" style="--couleur:var(--accent)"><div class="lib">Frais d'inscription</div><div class="val">${argent(s.inscriptionFrais.verse)} / ${argent(s.inscriptionFrais.du)}</div>
            <div class="det">${s.inscriptionFrais.reste > 0 ? `Reste ${argent(s.inscriptionFrais.reste)}` : 'Réglés ✔'}</div></div>
        </div>
        <div class="carte"><h2>Mois par mois</h2>
          ${tableau([
    { titre: 'Mois', rendu: (m) => e(nomMois(m.mois)) },
    { titre: 'Dû', classe: 'num', rendu: (m) => (m.exigible ? argent(m.du) : '—') },
    { titre: 'Versé', classe: 'num', rendu: (m) => argent(m.verse) },
    { titre: 'Reste', classe: 'num', rendu: (m) => (m.reste ? `<b>${argent(m.reste)}</b>` : '—') },
    { titre: 'Statut', rendu: (m) => (!m.exigible ? badge('non_concerne', 'Avant inscription') : !m.echu && m.statut !== 'paye' ? badge('neutre', 'À venir') : badge(m.statut)) },
    { titre: '', rendu: (m) => (gestion && m.reste > 0 && v.statut === 'actif' ? `<button class="btn petit" data-payer="${m.mois}">Payer</button>` : '') },
  ], s.mois)}
        </div>
        <div class="carte"><h2>Paiements reçus</h2>
          ${tableau([
    { titre: 'Date', rendu: (p) => dateFr(p.date_paiement) },
    { titre: 'Objet', rendu: (p) => (p.type === 'mensualite' ? e(nomMois(p.mois)) : p.type === 'inscription' ? 'Inscription' : e(p.remarque || 'Autre')) + (p.annule ? ' ' + badge('ko', 'Annulé') : '') },
    { titre: 'Montant', classe: 'num', rendu: (p) => argent(p.montant) },
    { titre: 'Mode', rendu: (p) => e(MODES[p.mode]) + (p.reference ? `<div class="petit muted">${e(p.reference)}</div>` : '') },
    { titre: 'Reçu', rendu: (p) => `<button class="btn lien" data-recu="${e(p.numero_recu)}">${e(p.numero_recu)}</button>` },
    { titre: '', rendu: (p) => (!p.annule ? `<button class="btn petit vert" data-wa="${e(p.numero_recu)}" title="Envoyer le reçu">📲</button>` : '') },
  ], d.paiements, { vide: 'Aucun paiement enregistré.' })}
        </div>`;
    },
    presences: () => {
      const p = d.presences || { total: 0 };
      const taux = p.total ? Math.round(((p.presents + p.retards) / p.total) * 100) : null;
      return `<div class="grille g4" style="margin-bottom:1rem">
          <div class="kpi" style="--couleur:var(--succes)"><div class="lib">Assiduité</div><div class="val">${taux === null ? '—' : taux + ' %'}</div><div class="det">${p.total} jour(s) d'appel</div></div>
          <div class="kpi" style="--couleur:var(--succes)"><div class="lib">Présent</div><div class="val">${p.presents || 0}</div></div>
          <div class="kpi" style="--couleur:var(--danger)"><div class="lib">Absences</div><div class="val">${p.absents || 0}</div></div>
          <div class="kpi" style="--couleur:var(--accent)"><div class="lib">Retards</div><div class="val">${p.retards || 0}</div></div></div>
        <div class="carte"><h2>Dernières absences et retards</h2>${tableau([
    { titre: 'Date', rendu: (a) => dateFr(a.date) }, { titre: 'Statut', rendu: (a) => badge(a.statut) }, { titre: 'Remarque', rendu: (a) => e(a.remarque || '') },
  ], d.dernieresAbsences || [], { vide: 'Aucune absence. Bravo !' })}</div>`;
    },
    historique: () => `<div class="carte"><h2>Scolarité à Keur Xalayi</h2>${tableau([
      { titre: 'Année', rendu: (i) => e(i.annee) + (i.active ? ' ' + badge('ok', 'En cours') : '') },
      { titre: 'Classe', rendu: (i) => e(i.classe) },
      { titre: 'Mensualité', classe: 'num', rendu: (i) => argent(i.mensualite - i.reduction) },
      { titre: 'Décision', rendu: (i) => ({ en_cours: 'En cours', admis: 'Admis(e)', redouble: 'Redouble', parti: 'Parti(e)' }[i.decision]) },
    ], d.inscriptions, { vide: 'Aucune inscription.' })}</div>`,
  };

  const zone = el.querySelector('#onglet');
  const montrer = (nom) => {
    el.querySelectorAll('[data-o]').forEach((b) => b.classList.toggle('actif', b.dataset.o === nom));
    zone.innerHTML = onglets[nom]();
    zone.querySelectorAll('[data-payer]').forEach((b) => { b.onclick = () => encaisser(v.id, recharger, [b.dataset.payer]); });
    zone.querySelectorAll('[data-recu]').forEach((b) => { b.onclick = () => ouvrir(`/paiements/recu/${encodeURIComponent(b.dataset.recu)}.pdf`); });
    zone.querySelectorAll('[data-wa]').forEach((b) => { b.onclick = () => envoyerRecu(b.dataset.wa); });
  };
  el.querySelectorAll('[data-o]').forEach((b) => { b.onclick = () => montrer(b.dataset.o); });
  montrer(d.solde ? 'paiements' : 'presences');

  const recharger = () => afficher(el, { id });
  const $ = (s) => el.querySelector(s);
  if ($('#payer')) $('#payer').onclick = () => encaisser(v.id, recharger);
  if ($('#payer-insc')) $('#payer-insc').onclick = () => encaisser(v.id, recharger).then(() => { const t = document.querySelector('.modale #type'); if (t) { t.value = 'inscription'; t.dispatchEvent(new Event('change')); } });
  if ($('#carte')) $('#carte').onclick = () => ouvrir(`/exports/cartes.pdf?eleve_ids=${v.id}`);
  if ($('#message')) {
    $('#message').onclick = () => formulaire(`Message au parent de ${v.prenom}`,
      champ('Message', `<textarea name="texte" required rows="5">Bonjour {nom_parent}, </textarea>`, { aide: 'Variables possibles : {nom_parent}, {nom_eleve}, {classe}' })
      + '<label class="case"><input type="checkbox" name="manuel"> Envoyer moi-même depuis mon WhatsApp (lien)</label>',
      async (f) => { resultatEnvoi(await post('/whatsapp/annonce', { cible: 'parent', eleve_id: v.id, texte: f.texte, manuel: f.manuel })); }, { ok: 'Envoyer' });
  }
  if ($('#archiver')) {
    $('#archiver').onclick = () => formulaire('Archiver l\'élève',
      `<div class="alerte attention">L'élève n'apparaîtra plus dans les listes, les rappels ni les impayés. Son historique est conservé et il pourra être réinscrit.</div>
      ${champ('Date de départ', `<input type="date" name="date_sortie" value="${aujourdhui()}">`)}
      ${champ('Motif', `<select name="motif">${options([['Déménagement', 'Déménagement'], ['Changement d\'école', 'Changement d\'école'], ['Fin de cycle', 'Fin de cycle'], ['Impayés', 'Impayés'], ['Autre', 'Autre']], '')}</select>`)}`,
      async (f) => { await post(`/eleves/${v.id}/archiver`, f); toast('Élève archivé.'); recharger(); }, { ok: 'Archiver' });
  }
  if ($('#reinscrire')) {
    $('#reinscrire').onclick = async () => {
      const classes = await get('/classes');
      formulaire('Réinscrire l\'élève',
        champ('Classe', `<select name="classe_id" required>${options(classes.map((c) => [c.id, `${c.nom} — ${argent(c.mensualite_effective)}/mois`]), '', { vide: '— Choisir —' })}</select>`, { requis: true, aide: 'Les tarifs de la classe sont appliqués (modifiables ensuite).' })
        + champ('Date', `<input type="date" name="date_inscription" value="${aujourdhui()}">`),
        async (f) => { await post(`/eleves/${v.id}/reinscrire`, f); toast('Élève réinscrit.', 'succes'); recharger(); }, { ok: 'Réinscrire' });
    };
  }
}
