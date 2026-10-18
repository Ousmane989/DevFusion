// Paiements : encaisser, journal, situation des mensualités (par mois et par classe).
import { get, post, e, qs, tableau, options, argent, nomMois, dateFr, badge, MODES, modesDuPays, estRole, ouvrir, formulaire, champ, toast, avatar, boutonsExport, activerExports, aujourdhui, kpi, erreur } from '../ui.js';
import { encaisser, envoyerRecu } from './_paiement.js';

let minuteur;

export async function afficher(el, params) {
  const [classes, moisInfo] = await Promise.all([get('/classes'), get('/paiements/mois')]);
  const onglet = params.onglet || 'encaisser';
  el.innerHTML = `
    <div class="entete-page"><h1>Paiements</h1></div>
    <div class="onglets">
      <button data-o="encaisser">💰 Encaisser</button>
      <button data-o="situation">📋 Situation par mois</button>
      <button data-o="grille">🗓️ Grille de la classe</button>
      <button data-o="journal">📒 Journal des paiements</button>
    </div>
    <div id="zone"></div>`;
  const zone = el.querySelector('#zone');
  const moisDefaut = moisInfo.echus.slice(-1)[0] || moisInfo.mois[0];
  const optMois = moisInfo.mois.map((m) => [m, nomMois(m)]);
  const optClasses = classes.map((c) => [c.id, c.nom]);

  const vues = {
    // ---- Recherche d'un élève puis encaissement ----
    async encaisser() {
      zone.innerHTML = `<div class="carte"><h2>Quel élève ?</h2>
        <input type="search" id="q" placeholder="🔍 Tapez le nom, le prénom, le matricule ou le téléphone du parent" autofocus style="font-size:1.1rem">
        <div id="res" style="margin-top:.8rem"></div></div>`;
      const res = zone.querySelector('#res');
      const chercher = async (q) => {
        if (q.trim().length < 2) { res.innerHTML = '<p class="muted">Tapez au moins 2 lettres.</p>'; return; }
        const l = await get('/eleves' + qs({ q }));
        res.innerHTML = l.length ? `<ul class="liste">${l.slice(0, 20).map((x) => `<li>${avatar(x)}
          <div class="principal"><b>${e(x.prenom)} ${e(x.nom)}</b><span class="petit muted">${e(x.classe || '—')} · ${e(x.matricule)} · ${e(x.parent || '')}</span></div>
          <button class="btn" data-id="${x.id}">Encaisser</button></li>`).join('')}</ul>` : '<p class="muted">Aucun élève trouvé.</p>';
        res.querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => encaisser(Number(b.dataset.id), () => {}); });
      };
      zone.querySelector('#q').oninput = (ev) => { clearTimeout(minuteur); minuteur = setTimeout(() => chercher(ev.target.value), 250); };
      chercher('');
    },

    // ---- Statut de chaque élève pour un mois ----
    async situation() {
      zone.innerHTML = `<div class="filtres">
          <select id="mois">${options(optMois, moisDefaut)}</select>
          <select id="classe">${options(optClasses, params.classe_id || '', { vide: 'Toutes les classes' })}</select>
          <select id="statut">${options([['paye', 'Payé'], ['partiel', 'Partiel'], ['impaye', 'Impayé']], '', { vide: 'Tous les statuts' })}</select>
        </div><div id="resume"></div><div class="ligne fin" style="margin-bottom:.6rem" id="exp"></div><div id="tab"></div>`;
      const lire = () => ({ mois: zone.querySelector('#mois').value, classe_id: zone.querySelector('#classe').value });
      const exp = zone.querySelector('#exp');
      exp.innerHTML = boutonsExport('statut');
      activerExports(exp, lire);
      const charger = async () => {
        const d = await get('/paiements/statut' + qs(lire()));
        const r = d.resume;
        zone.querySelector('#resume').innerHTML = `<div class="grille g4" style="margin-bottom:1rem">
          ${kpi('Attendu', argent(r.attendu), nomMois(d.mois), 'var(--secondaire)')}
          ${kpi('Encaissé', argent(r.encaisse), `${r.taux} % recouvré`, 'var(--succes)')}
          ${kpi('Reste à encaisser', argent(r.reste), '', 'var(--danger)')}
          ${kpi('Élèves', `${r.nbPayes} / ${r.nbPayes + r.nbPartiels + r.nbImpayes}`, `ont payé · ${r.nbPartiels} partiel(s)`, 'var(--primaire)')}</div>`;
        const st = zone.querySelector('#statut').value;
        const liste = st ? d.liste.filter((x) => x.statut === st) : d.liste;
        zone.querySelector('#tab').innerHTML = tableau([
          { titre: 'Élève', rendu: (x) => `<a href="#/eleves/${x.eleve_id}"><b>${e(x.prenom)} ${e(x.nom)}</b></a><div class="petit muted">${e(x.matricule)}</div>` },
          { titre: 'Classe', rendu: (x) => e(x.classe) },
          { titre: 'Dû', classe: 'num', rendu: (x) => argent(x.du) + (x.reduction > 0 ? `<div class="petit muted">réd. ${e(x.reduction_motif || '')}</div>` : '') },
          { titre: 'Versé', classe: 'num', rendu: (x) => argent(x.verse) },
          { titre: 'Statut', rendu: (x) => badge(x.statut) },
          { titre: '', rendu: (x) => (x.reste > 0 ? `<button class="btn petit" data-payer="${x.eleve_id}" data-mois="${x.mois}">Encaisser</button>` : '') },
        ], liste, { vide: 'Aucun élève.' });
        zone.querySelectorAll('[data-payer]').forEach((b) => { b.onclick = () => encaisser(Number(b.dataset.payer), charger, [b.dataset.mois]); });
      };
      zone.querySelectorAll('select').forEach((s) => { s.onchange = charger; });
      await charger();
    },

    // ---- Grille élèves × mois ----
    async grille() {
      zone.innerHTML = `<div class="filtres"><select id="classe">${options(optClasses, params.classe_id || (classes[0] && classes[0].id))}</select></div>
        <div class="legende" style="margin-bottom:.7rem"><span><i style="background:var(--succes)"></i>Payé</span><span><i style="background:var(--accent)"></i>Partiel</span>
        <span><i style="background:var(--danger)"></i>Impayé</span><span><i style="background:#e3e5f2"></i>À venir</span></div><div id="tab"></div>`;
      const charger = async () => {
        const cid = zone.querySelector('#classe').value;
        if (!cid) return;
        const g = await get('/paiements/grille' + qs({ classe_id: cid }));
        const lettre = { paye: '✓', partiel: '½', impaye: '✗' };
        zone.querySelector('#tab').innerHTML = g.eleves.length ? `<div class="table-wrap"><table class="mois-grille"><thead><tr><th>Élève</th>${g.mois.map((m) => `<th class="centre">${e(nomMois(m, true))}</th>`).join('')}</tr></thead>
          <tbody>${g.eleves.map((x) => `<tr><td class="nowrap"><a href="#/eleves/${x.eleve_id}">${e(x.prenom)} ${e(x.nom)}</a></td>${g.mois.map((m) => {
    const s = x.mois[m];
    if (!s) return '<td class="m"><span class="pastille non_concerne">·</span></td>';
    const futur = !g.echus.includes(m);
    const cls = futur && s.statut !== 'paye' ? 'avenir' : s.statut;
    return `<td class="m"><span class="pastille ${cls}" title="${e(nomMois(m))} : ${argent(s.verse)} / ${argent(s.du)}">${futur && s.statut !== 'paye' ? '' : lettre[s.statut]}</span></td>`;
  }).join('')}</tr>`).join('')}</tbody></table></div>` : '<div class="carte vide">Aucun élève.</div>';
      };
      zone.querySelector('#classe').onchange = charger;
      await charger();
    },

    // ---- Journal ----
    async journal() {
      const debutMois = aujourdhui().slice(0, 8) + '01';
      zone.innerHTML = `<div class="filtres">
          <input type="search" id="q" placeholder="🔍 Élève, matricule ou n° de reçu" class="recherche">
          <input type="date" id="du" value="${debutMois}" title="Du"><input type="date" id="au" value="${aujourdhui()}" title="Au">
          <select id="mode">${options(modesDuPays(), '', { vide: 'Tous les modes' })}</select>
          <select id="classe">${options(optClasses, '', { vide: 'Toutes les classes' })}</select>
        </div><div class="ligne" style="margin-bottom:.6rem"><b id="total"></b><span class="espace"></span><span id="exp"></span></div><div id="tab"></div>`;
      const lire = () => ({ q: zone.querySelector('#q').value, du: zone.querySelector('#du').value, au: zone.querySelector('#au').value, mode: zone.querySelector('#mode').value, classe_id: zone.querySelector('#classe').value });
      const exp = zone.querySelector('#exp');
      exp.innerHTML = boutonsExport('paiements');
      activerExports(exp, lire);
      const charger = async () => {
        const d = await get('/paiements' + qs(lire()));
        zone.querySelector('#total').textContent = `${d.paiements.filter((p) => !p.annule).length} paiement(s) — Total : ${argent(d.total)}`;
        zone.querySelector('#tab').innerHTML = tableau([
          { titre: 'Date', rendu: (p) => dateFr(p.date_paiement) },
          { titre: 'Élève', rendu: (p) => `<a href="#/eleves/${p.eleve_id}">${e(p.prenom)} ${e(p.nom)}</a><div class="petit muted">${e(p.classe)}</div>` },
          { titre: 'Objet', rendu: (p) => (p.type === 'mensualite' ? e(nomMois(p.mois)) : p.type === 'inscription' ? 'Inscription' : e(p.remarque || 'Autre')) },
          { titre: 'Montant', classe: 'num', rendu: (p) => (p.annule ? `<s>${argent(p.montant)}</s> ${badge('ko', 'Annulé')}` : `<b>${argent(p.montant)}</b>`) },
          { titre: 'Mode', rendu: (p) => e(MODES[p.mode]) + (p.reference ? `<div class="petit muted">${e(p.reference)}</div>` : '') },
          { titre: 'Reçu', rendu: (p) => `<button class="btn lien" data-recu="${e(p.numero_recu)}">${e(p.numero_recu)}</button><div class="petit muted">${e(p.encaisse_par_nom || '')}</div>` },
          { titre: '', rendu: (p) => (p.annule ? '' : `<button class="btn petit vert" data-wa="${e(p.numero_recu)}" title="Envoyer par WhatsApp">📲</button>
            ${estRole('directeur') ? `<button class="btn petit clair" data-annuler="${p.id}" title="Annuler">✖</button>` : ''}`) },
        ], d.paiements, { vide: 'Aucun paiement sur cette période.' });
        zone.querySelectorAll('[data-recu]').forEach((b) => { b.onclick = () => ouvrir(`/paiements/recu/${encodeURIComponent(b.dataset.recu)}.pdf`); });
        zone.querySelectorAll('[data-wa]').forEach((b) => { b.onclick = () => envoyerRecu(b.dataset.wa); });
        zone.querySelectorAll('[data-annuler]').forEach((b) => {
          b.onclick = () => formulaire('Annuler ce paiement', `<div class="alerte attention">Le paiement restera visible mais ne sera plus compté. Le reçu portera la mention « ANNULÉ ».</div>
            ${champ('Motif', '<input name="motif" required placeholder="Ex. erreur de saisie">', { requis: true })}`,
          async (f) => { await post(`/paiements/${b.dataset.annuler}/annuler`, f); toast('Paiement annulé.'); charger(); }, { ok: 'Annuler le paiement' });
        });
      };
      zone.querySelectorAll('select, input[type=date]').forEach((s) => { s.onchange = charger; });
      zone.querySelector('#q').oninput = () => { clearTimeout(minuteur); minuteur = setTimeout(charger, 300); };
      await charger();
    },
  };

  const montrer = (nom) => {
    el.querySelectorAll('[data-o]').forEach((b) => b.classList.toggle('actif', b.dataset.o === nom));
    vues[nom]().catch(erreur);
  };
  el.querySelectorAll('[data-o]').forEach((b) => { b.onclick = () => montrer(b.dataset.o); });
  montrer(vues[onglet] ? onglet : 'encaisser');
}
