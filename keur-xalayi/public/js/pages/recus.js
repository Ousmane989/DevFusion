// Reçus : faire un reçu (même pour un mois déjà passé), retrouver, réimprimer ou envoyer
// les reçus, un par un ou plusieurs à la fois.
import { get, e, qs, options, argent, nomMois, dateFr, tableau, imprimer, ouvrir, moisCourant, avatar, modale, erreur, objetPaiement } from '../ui.js';
import { encaisser, envoyerRecu } from './_paiement.js';

let minuteur;

export async function afficher(el, params) {
  const [classes, moisInfo] = await Promise.all([get('/classes'), get('/paiements/mois')]);
  el.innerHTML = `
    <div class="entete-page"><h1>Reçus</h1><button class="btn" id="nouveau">＋ Faire un reçu</button></div>
    <p class="muted" style="margin-top:-.4rem">Faites un reçu pour n'importe quel mois, même déjà passé : cherchez l'élève, cochez le ou les mois payés
      (et changez la date du paiement si besoin). Retrouvez ensuite tous les reçus ici pour les réimprimer ou les envoyer au parent.</p>
    <div class="filtres">
      <input class="recherche" type="search" id="q" placeholder="🔍 Élève, parent, matricule ou n° de reçu" value="${e(params.q || '')}">
      <select id="mois">${options(moisInfo.mois.map((m) => [m, `${nomMois(m)}${m < moisCourant() ? ' — passé' : m === moisCourant() ? ' — ce mois-ci' : ''}`]), params.mois || '', { vide: 'Tous les mois payés' })}</select>
      <select id="classe">${options(classes.map((c) => [c.id, c.nom]), params.classe_id || '', { vide: 'Toutes les classes' })}</select>
    </div>
    <div class="ligne" style="margin-bottom:.6rem"><b id="total"></b><span class="espace"></span>
      <label class="case petit"><input type="checkbox" id="tout"> Tout sélectionner</label></div>
    <div id="barre-sel" class="alerte attention cache" style="align-items:center;flex-wrap:wrap;gap:.5rem">
      <div style="flex:1;min-width:160px"><b id="nb-sel">0</b> reçu(s) sélectionné(s)</div>
      <button class="btn petit" id="impr-sel">🖨️ Imprimer la sélection</button>
      <button class="btn petit clair" id="pdf-sel">📄 PDF</button>
      <button class="btn petit clair" id="desel">Tout désélectionner</button>
    </div>
    <div id="liste"></div>`;

  const selection = new Set();
  const majSelection = () => {
    el.querySelector('#nb-sel').textContent = selection.size;
    el.querySelector('#barre-sel').classList.toggle('cache', !selection.size);
  };
  const cheminSelection = () => '/paiements/recus.pdf?numeros=' + encodeURIComponent([...selection].join(','));
  const lire = () => ({ q: el.querySelector('#q').value, mois: el.querySelector('#mois').value, classe_id: el.querySelector('#classe').value });

  const charger = async () => {
    try {
      const d = await get('/paiements/recus' + qs(lire()));
      el.querySelector('#total').textContent = `${d.recus.length} reçu(s) — Total : ${argent(d.total)}`;
      const zone = el.querySelector('#liste');
      zone.innerHTML = tableau([
        { titre: 'Sélection', entete: '', rendu: (r) => `<input type="checkbox" data-sel="${e(r.numero_recu)}" ${selection.has(r.numero_recu) ? 'checked' : ''} aria-label="Sélectionner le reçu ${e(r.numero_recu)}">` },
        { titre: 'Reçu', rendu: (r) => `<b style="white-space:nowrap">${e(r.numero_recu)}</b><div class="petit muted">${dateFr(r.date_paiement)}</div>` },
        { titre: 'Élève', rendu: (r) => `<a href="#/eleves/${r.eleve_id}">${e(r.prenom)} ${e(r.nom)}</a><div class="petit muted">${e(r.classe)}</div>` },
        { titre: 'Payé pour', rendu: (r) => e(r.lignes.map((l) => objetPaiement(l)).join(', ')) },
        { titre: 'Montant', classe: 'num', rendu: (r) => (r.annule ? `<s>${argent(r.lignes.reduce((t, l) => t + l.montant, 0))}</s> <span class="badge ko">Annulé</span>` : `<b>${argent(r.total)}</b>`) },
        { titre: '', rendu: (r) => `<div class="ligne" style="flex-wrap:nowrap;gap:.3rem">
            <button class="btn petit clair" data-impr="${e(r.numero_recu)}" title="Imprimer ce reçu">🖨️</button>
            ${r.annule ? '' : `<button class="btn petit vert" data-wa="${e(r.numero_recu)}" title="Envoyer au parent par WhatsApp">📲</button>`}</div>` },
      ], d.recus, { vide: 'Aucun reçu pour ces critères.' });
      zone.querySelectorAll('[data-impr]').forEach((b) => { b.onclick = () => imprimer(`/paiements/recu/${encodeURIComponent(b.dataset.impr)}.pdf`); });
      zone.querySelectorAll('[data-wa]').forEach((b) => { b.onclick = () => envoyerRecu(b.dataset.wa); });
      const cases = [...zone.querySelectorAll('[data-sel]')];
      const tout = el.querySelector('#tout');
      const majTout = () => { tout.checked = cases.length > 0 && cases.every((c) => c.checked); tout.indeterminate = !tout.checked && cases.some((c) => c.checked); };
      cases.forEach((c) => {
        c.onchange = () => { if (c.checked) selection.add(c.dataset.sel); else selection.delete(c.dataset.sel); majSelection(); majTout(); };
      });
      tout.onchange = () => { cases.forEach((c) => { c.checked = tout.checked; if (tout.checked) selection.add(c.dataset.sel); else selection.delete(c.dataset.sel); }); majSelection(); };
      majTout(); majSelection();
    } catch (err) { erreur(err); }
  };

  // Faire un reçu : choisir l'élève, puis encaisser (tous les mois de l'année sont proposés, y compris les mois passés)
  el.querySelector('#nouveau').onclick = () => {
    const md = modale('Faire un reçu — quel élève ?', `
      <input type="search" id="q-eleve" placeholder="🔍 Nom, prénom, matricule ou téléphone du parent" style="font-size:1.05rem">
      <div id="res" style="margin-top:.8rem"><p class="muted">Tapez au moins 2 lettres.</p></div>`);
    const res = md.el.querySelector('#res');
    let t;
    md.el.querySelector('#q-eleve').oninput = (ev) => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const q = ev.target.value.trim();
        if (q.length < 2) { res.innerHTML = '<p class="muted">Tapez au moins 2 lettres.</p>'; return; }
        const l = (await get('/eleves' + qs({ q, statut: 'tous' }))).filter((x) => x.inscription_id);
        res.innerHTML = l.length ? `<ul class="liste">${l.slice(0, 15).map((x) => `<li>${avatar(x)}
            <div class="principal"><b>${e(x.prenom)} ${e(x.nom)}</b><span class="petit muted">${e(x.classe || '—')} · ${e(x.matricule)}${x.statut === 'en_attente' ? ' · en attente d\'inscription' : x.statut === 'archive' ? ' · archivé' : ''}</span></div>
            <button class="btn" data-id="${x.id}">Choisir</button></li>`).join('')}</ul>` : '<p class="muted">Aucun élève trouvé.</p>';
        res.querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => { md.fermer(); encaisser(Number(b.dataset.id), charger); }; });
      }, 250);
    };
  };

  el.querySelector('#impr-sel').onclick = () => imprimer(cheminSelection());
  el.querySelector('#pdf-sel').onclick = () => ouvrir(cheminSelection());
  el.querySelector('#desel').onclick = () => { selection.clear(); charger(); };
  el.querySelector('#q').oninput = () => { clearTimeout(minuteur); minuteur = setTimeout(charger, 300); };
  el.querySelector('#mois').onchange = charger;
  el.querySelector('#classe').onchange = charger;
  await charger();
}
