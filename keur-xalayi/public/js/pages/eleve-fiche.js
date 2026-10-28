// Fiche élève : identité, parents, paiements mois par mois, présences, historique.
import { get, post, e, avatar, dateFr, argent, nomMois, badge, estRole, tableau, champ, options, formulaire, confirmer, toast, erreur, ouvrir, imprimer, moisCourant, MODES, modale, aujourdhui, resultatEnvoi, ctx, objetPaiement, supprimerEleves } from '../ui.js';
import { encaisser, envoyerRecu } from './_paiement.js';

export async function afficher(el, { id, nouveau }) {
  const d = await get(`/eleves/${id}`);
  const v = d.eleve;
  const insc = d.inscription;
  const gestion = estRole('directeur');
  const age = v.date_naissance ? Math.floor((Date.now() - new Date(v.date_naissance)) / 31557600000) : null;
  const info = (lib, val) => (val ? `<div><div class="petit muted">${e(lib)}</div><div class="gras">${val}</div></div>` : '');

  el.innerHTML = `
    ${nouveau ? `<div class="alerte succes">✔ Inscription enregistrée. ${gestion && insc ? `<button class="btn petit" id="facture-nouveau">🖨️ Facture d'inscription</button>
      ${d.solde && d.solde.inscriptionFrais.reste > 0 ? '<button class="btn petit vert" id="payer-insc">Encaisser les frais d\'inscription</button>' : ''}` : ''}</div>` : ''}
    ${v.statut === 'archive' ? `<div class="alerte attention">🗄️ Élève archivé le ${dateFr(v.date_sortie)} — ${e(v.motif_sortie || '')}</div>` : ''}
    ${v.remarques ? `<div class="alerte danger">⚠️ <div><b>À savoir :</b> ${e(v.remarques)}</div></div>` : ''}
    <div class="carte">
      <div class="ligne" style="align-items:flex-start;gap:1.2rem">
        ${avatar({ ...v, a_photo: !!v.photo }, true)}
        <div style="flex:1;min-width:220px">
          <h1 style="margin-bottom:.2rem">${e(v.prenom)} ${e(v.nom)}</h1>
          <div class="ligne"><span class="badge info">${e(v.matricule)}</span>${insc ? `<span class="badge neutre">${e(insc.classe)}</span>` : ''}
            <span class="muted">${v.sexe === 'M' ? 'Garçon' : 'Fille'}${age !== null ? ` · ${age} ans` : ''}</span>
            ${v.cas_social ? '<span class="badge attention">🤝 Cas social</span>' : ''}</div>
          ${v.cas_social && v.cas_social_note ? `<div class="petit muted" style="margin-top:.3rem">🤝 ${e(v.cas_social_note)}</div>` : ''}
          <div class="grille g3" style="margin-top:.9rem;gap:.7rem">
            ${info('Né(e) le', [dateFr(v.date_naissance), v.lieu_naissance && 'à ' + e(v.lieu_naissance)].filter(Boolean).join(' '))}
            ${info('Père', e(v.pere_nom))}${info('Mère', e(v.mere_nom))}${info('Tuteur', e(v.tuteur_nom))}
            ${info('WhatsApp', v.whatsapp ? `<a href="https://wa.me/${e(v.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">${e(v.whatsapp)}</a>` : '<span class="badge attention">À compléter</span>')}
            ${info('Téléphone 2', v.telephone2 ? `<a href="tel:${e(v.telephone2)}">${e(v.telephone2)}</a>` : '')}
            ${info('Adresse', e(v.adresse))}
            ${insc ? info('Inscrit le', dateFr(insc.date_inscription)) : ''}
          </div>
        </div>
      </div>
      <div class="ligne" style="margin-top:1rem">
        ${gestion && insc && v.statut === 'actif' ? '<button class="btn" id="payer">💰 Encaisser un paiement</button>' : ''}
        ${gestion && insc ? '<button class="btn clair" id="facture">🧾 Facture d\'inscription</button>' : ''}
        ${gestion && insc && v.statut === 'actif' ? '<button class="btn clair" id="facture-mois">🧾 Facture du mois</button>' : ''}
        ${gestion ? `<a class="btn clair" href="#/eleves/${v.id}/modifier">✏️ Modifier</a>` : ''}
        ${gestion ? '<button class="btn clair" id="message">💬 Message au parent</button>' : ''}
        ${insc ? `<button class="btn clair" id="carte">🪪 Carte d'élève</button>` : ''}
        ${insc && gestion && v.statut === 'actif' ? `<a class="btn clair" href="#/certificats?eleve_id=${v.id}">📜 Certificat de scolarité</a>` : ''}
        <span class="espace"></span>
        ${gestion && v.statut === 'actif' ? '<button class="btn clair" id="archiver">🗄️ Archiver (départ)</button>' : ''}
        ${gestion ? '<button class="btn clair" id="supprimer" style="color:var(--danger)">🗑️ Supprimer</button>' : ''}
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
          <div class="kpi" style="--couleur:var(--primaire)"><div class="lib">Frais d'inscription</div><div class="val">${argent(s.inscriptionFrais.verse)} / ${argent(s.inscriptionFrais.du)}</div>
            <div class="det">${s.inscriptionFrais.reste > 0 ? `Reste ${argent(s.inscriptionFrais.reste)}` : 'Réglés ✔'}</div></div>
          ${Object.values(s.annexes || {}).filter((a) => a.du > 0).map((a) => `<div class="kpi" style="--couleur:var(--accent)"><div class="lib">${e(a.libelle)}</div>
            <div class="val">${argent(a.verse)} / ${argent(a.du)}</div><div class="det">${a.reste > 0 ? `Reste ${argent(a.reste)}` : 'Réglé ✔'}</div></div>`).join('')}
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
    { titre: 'Objet', rendu: (p) => e(objetPaiement(p)) + (p.annule ? ' ' + badge('ko', 'Annulé') : '') },
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
    historique: () => `<div class="carte"><h2>Scolarité à ${e(ctx.ecole.nom_ecole)}</h2>${tableau([
      { titre: 'Année', rendu: (i) => e(i.annee) + (i.active ? ' ' + badge('ok', 'En cours') : '') },
      { titre: 'Classe', rendu: (i) => e(i.classe) },
      ...(gestion ? [{ titre: 'Mensualité', classe: 'num', rendu: (i) => argent(i.mensualite - i.reduction) }] : []),
      { titre: 'Décision', rendu: (i) => ({ en_cours: 'En cours', admis: 'Admis(e)', redouble: 'Redouble', parti: 'Parti(e)' }[i.decision]) },
    ], d.inscriptions, { vide: 'Aucune inscription.' })}</div>
      ${gestion ? '<div class="carte"><h2>✏️ Modifications de la fiche</h2><div id="modifs" class="muted">Chargement…</div></div>' : ''}`,
  };
  // Historique des modifications (date, qui, avant → après, motif)
  const afficherModifs = async () => {
    const z = el.querySelector('#modifs');
    if (!z) return;
    try {
      const modifs = await get(`/eleves/${v.id}/modifications`);
      const val = (x) => (x === null || x === undefined || x === '' ? '—' : /^\d{4}-\d{2}-\d{2}$/.test(String(x)) ? dateFr(x) : String(x));
      z.classList.remove('muted');
      z.innerHTML = modifs.length ? modifs.map((m) => `<div style="padding:.6rem 0;border-bottom:1px solid var(--bord)">
          <div class="ligne" style="gap:.5rem"><b>${e(dateFr(m.created_at))}</b><span class="petit muted">par ${e(m.par || '—')}</span>
            ${m.motif ? `<span class="badge info">Motif : ${e(m.motif)}</span>` : '<span class="badge neutre">Sans motif</span>'}</div>
          <ul class="petit" style="margin:.3rem 0 0 1.1rem;padding:0">${m.changements.map((c) => `<li>${e(c.champ)} : <s class="muted">${e(val(c.avant))}</s> → <b>${e(val(c.apres))}</b></li>`).join('')}</ul>
        </div>`).join('') : '<span class="muted">Aucune modification depuis l\'inscription.</span>';
    } catch (err) { z.textContent = err.message; }
  };

  const zone = el.querySelector('#onglet');
  const montrer = (nom) => {
    el.querySelectorAll('[data-o]').forEach((b) => b.classList.toggle('actif', b.dataset.o === nom));
    zone.innerHTML = onglets[nom]();
    zone.querySelectorAll('[data-payer]').forEach((b) => { b.onclick = () => encaisser(v.id, recharger, [b.dataset.payer]); });
    zone.querySelectorAll('[data-recu]').forEach((b) => { b.onclick = () => ouvrir(`/paiements/recu/${encodeURIComponent(b.dataset.recu)}.pdf`); });
    zone.querySelectorAll('[data-wa]').forEach((b) => { b.onclick = () => envoyerRecu(b.dataset.wa); });
    if (nom === 'historique') afficherModifs();
  };
  el.querySelectorAll('[data-o]').forEach((b) => { b.onclick = () => montrer(b.dataset.o); });
  montrer(d.solde ? 'paiements' : 'presences');

  const recharger = () => afficher(el, { id });
  const $ = (s) => el.querySelector(s);
  if ($('#payer')) $('#payer').onclick = () => encaisser(v.id, recharger);
  const payerInscription = () => encaisser(v.id, recharger).then(() => { const t = document.querySelector('.modale #type'); if (t) { t.value = 'inscription'; t.dispatchEvent(new Event('change')); } });
  const facture = () => imprimer(`/eleves/${v.id}/facture-inscription.pdf`);
  if ($('#payer-insc')) $('#payer-insc').onclick = payerInscription;
  if ($('#facture')) $('#facture').onclick = facture;
  if ($('#facture-mois')) $('#facture-mois').onclick = () => imprimer(`/paiements/factures.pdf?mois=${moisCourant()}&eleve_id=${v.id}`);
  if ($('#facture-nouveau')) $('#facture-nouveau').onclick = facture;

  // Juste après une inscription : la facture est proposée tout de suite (une seule fois).
  if (nouveau && gestion && insc) {
    history.replaceState(null, '', `#/eleves/${v.id}`);
    const fi = d.solde ? d.solde.inscriptionFrais : { du: insc.frais_inscription, reste: insc.frais_inscription };
    const md = modale('✔ Inscription enregistrée', `
      <p class="centre" style="margin-top:0"><b>${e(v.prenom)} ${e(v.nom)}</b> — ${e(insc.classe)}<br>
        <span class="muted">Matricule ${e(v.matricule)}</span></p>
      <div class="grille g2" style="margin-bottom:.8rem">
        <div class="kpi" style="--couleur:var(--primaire)"><div class="lib">Frais d'inscription</div><div class="val">${argent(fi.du)}</div></div>
        <div class="kpi" style="--couleur:var(--secondaire)"><div class="lib">Mensualité</div><div class="val">${argent(insc.mensualite - insc.reduction)}</div></div>
      </div>
      <button class="btn bloc" data-facture style="font-size:1.1rem;padding:.9rem">🖨️ Imprimer la facture d'inscription</button>
      <div class="grille g2" style="margin-top:.6rem">
        <button class="btn clair" data-pdf>📄 Voir / télécharger le PDF</button>
        ${fi.reste > 0 ? '<button class="btn vert" data-payer>💰 Encaisser les frais maintenant</button>' : ''}
      </div>`, { actions: '<button class="btn clair" data-f>Plus tard</button>' });
    md.el.querySelector('[data-f]').onclick = md.fermer;
    md.el.querySelector('[data-facture]').onclick = facture;
    md.el.querySelector('[data-pdf]').onclick = () => ouvrir(`/eleves/${v.id}/facture-inscription.pdf`);
    const p = md.el.querySelector('[data-payer]');
    if (p) p.onclick = () => { md.fermer(); payerInscription(); };
  }
  if ($('#carte')) $('#carte').onclick = () => ouvrir(`/exports/cartes.pdf?eleve_ids=${v.id}`);
  if ($('#message')) {
    $('#message').onclick = () => formulaire(`Message au parent de ${v.prenom}`,
      champ('Message', `<textarea name="texte" required rows="5">Bonjour {nom_parent}, </textarea>`, { aide: 'Variables possibles : {nom_parent}, {nom_eleve}, {classe}' })
      + '<label class="case"><input type="checkbox" name="manuel"> Envoyer moi-même depuis mon WhatsApp (lien)</label>',
      async (f) => { resultatEnvoi(await post('/whatsapp/annonce', { cible: 'parent', eleve_id: v.id, texte: f.texte, manuel: f.manuel })); }, { ok: 'Envoyer' });
  }
  if ($('#supprimer')) {
    $('#supprimer').onclick = async () => {
      try { if (await supprimerEleves([v.id], `${v.prenom} ${v.nom}`)) location.hash = '#/eleves'; } catch (err) { erreur(err); }
    };
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
