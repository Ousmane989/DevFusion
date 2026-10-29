// Factures de mensualité : la directrice choisit un mois et une classe (ou toute
// l'école) et imprime toutes les factures d'un coup (2 par feuille A4, à couper en deux).
// Chaque facture : mensualité du mois, réduction, déjà versé, mois précédents
// impayés et total à payer.
import { get, e, qs, options, argent, nomMois, tableau, ouvrir, imprimer, moisCourant, kpi, erreur, confirmer } from '../ui.js';
import { modifierFacture } from '../facture-edition.js';

export async function afficher(el, params) {
  const [classes, moisInfo] = await Promise.all([get('/classes'), get('/paiements/mois')]);
  const moisDefaut = moisInfo.mois.includes(params.mois) ? params.mois
    : moisInfo.mois.includes(moisCourant()) ? moisCourant() : moisInfo.mois[0];

  el.innerHTML = `
    <div class="entete-page"><h1>Factures du mois</h1></div>
    <p class="muted" style="margin-top:-.4rem">Préparez en une fois les factures de mensualité à remettre aux parents :
      2 factures par feuille A4, à couper en deux. Chaque facture reprend aussi les mois précédents non réglés (vous cochez lesquels), le reliquat, les fournitures, l'uniforme et le blouson, avec les avances déjà versées et le reste à payer.
      Le bouton <b>✏️ Modifier</b> permet d'ajuster la facture d'un élève ; cochez plusieurs élèves pour les modifier l'un après l'autre et n'imprimer que ceux-là.
      Les élèves marqués « 🤝 cas social » n'ont pas de facture du mois.</p>
    <div class="filtres">
      <select id="mois" aria-label="Mois">${options(moisInfo.mois.map((m) => [m, `${nomMois(m)}${m < moisCourant() ? ' — mois passé' : m === moisCourant() ? ' — ce mois-ci' : ''}`]), moisDefaut)}</select>
      <select id="classe">${options(classes.map((c) => [c.id, `${c.nom} (${c.effectif})`]), params.classe_id || '', { vide: 'Toute l\'école' })}</select>
      <select id="qui">${options([['tous', 'Tous les élèves'], ['1', 'Seulement ceux qui doivent']], 'tous')}</select>
    </div>
    <div class="carte" id="zone-retard" style="margin-bottom:1rem"></div>
    <div id="passe"></div>
    <div id="alerte"></div>
    <div id="resume"></div>
    <div class="barre-action" style="margin-bottom:1rem">
      <button class="btn" id="imprimer">🖨️ Imprimer les factures</button>
      <button class="btn clair" id="pdf">📄 Voir / télécharger le PDF</button>
    </div>
    <div class="carte">
      <div class="ligne" style="justify-content:space-between;flex-wrap:wrap;gap:.6rem;margin-bottom:.8rem"><h2 style="margin:0">Aperçu</h2>
        <span class="muted gras" id="compte-q"></span></div>
      <input class="recherche" type="search" id="q" placeholder="🔍 Rechercher un élève : nom, prénom, matricule, parent ou classe…" style="width:100%;margin-bottom:.8rem">
      <label class="case petit" style="margin-bottom:.6rem"><input type="checkbox" id="tout"> Tout sélectionner (élèves affichés)</label>
      <div id="barre-sel" class="alerte attention cache" style="align-items:center;flex-wrap:wrap;gap:.5rem">
        <div style="flex:1;min-width:160px"><b id="nb-sel">0</b> élève(s) sélectionné(s)</div>
        <button class="btn petit" id="modif-sel">✏️ Modifier leurs factures (une par une)</button>
        <button class="btn petit clair" id="impr-sel">🖨️ Imprimer la sélection</button>
        <button class="btn petit clair" id="desel">Tout désélectionner</button>
      </div>
      <div id="liste"></div>
    </div>`;

  const lire = () => {
    const f = { mois: el.querySelector('#mois').value, classe_id: el.querySelector('#classe').value };
    if (el.querySelector('#qui').value === '1') f.impayes = '1';
    // Mois en retard : seulement ceux qui sont cochés
    const cases = [...el.querySelectorAll('[data-retard]')];
    if (cases.some((c) => !c.checked)) f.retard = cases.filter((c) => c.checked).map((c) => c.value).join(',') || 'aucun';
    return f;
  };
  const chemin = () => '/paiements/factures.pdf' + qs(lire());

  // Cases des mois précédant le mois choisi : cochées d'office
  const casesRetard = () => {
    const m = el.querySelector('#mois').value;
    const avant = moisInfo.mois.filter((x) => x < m);
    el.querySelector('#zone-retard').innerHTML = avant.length
      ? `<b>Mois en retard à reprendre sur les factures</b>
         <p class="petit muted" style="margin:.2rem 0 .5rem">Cochez les mois précédents à réclamer (seuls ceux qui restent impayés apparaissent sur la facture de chaque élève).</p>
         <div class="ligne" style="flex-wrap:wrap;gap:.4rem 1rem">${avant.map((x) => `<label class="case"><input type="checkbox" data-retard value="${x}" checked> ${e(nomMois(x))}</label>`).join('')}</div>
         <div class="ligne petit" style="margin-top:.5rem;gap:1rem"><button type="button" class="btn lien petit" id="tout-retard">Tout cocher</button>
           <button type="button" class="btn lien petit" id="aucun-retard">Tout décocher</button></div>`
      : '<span class="petit muted">Pas de mois précédent : c\'est le premier mois de l\'année scolaire.</span>';
    el.querySelectorAll('[data-retard]').forEach((c) => { c.onchange = charger; });
    const coche = (v) => () => { el.querySelectorAll('[data-retard]').forEach((c) => { c.checked = v; }); charger(); };
    if (el.querySelector('#tout-retard')) { el.querySelector('#tout-retard').onclick = coche(true); el.querySelector('#aucun-retard').onclick = coche(false); }
  };

  // Élèves cochés (gardés quand la liste est filtrée ou rechargée)
  const selection = new Set();
  const majSelection = () => {
    el.querySelector('#nb-sel').textContent = selection.size;
    el.querySelector('#barre-sel').classList.toggle('cache', !selection.size);
  };
  const cheminSelection = () => '/paiements/factures.pdf' + qs({ ...lire(), classe_id: '', impayes: '', eleve_ids: [...selection].join(',') });

  // Aperçu, filtré par la recherche (sans recharger)
  let derniere = null;
  const sansAccent = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const rendreListe = () => {
    if (!derniere) return;
    const d = derniere;
    const q = sansAccent(el.querySelector('#q').value.trim());
    const lignes = q ? d.liste.filter((x) => [`${x.prenom} ${x.nom}`, `${x.nom} ${x.prenom}`, x.matricule, x.parent, x.classe].some((t) => sansAccent(t).includes(q))) : d.liste;
    el.querySelector('#compte-q').textContent = q ? `${lignes.length} élève(s) trouvé(s) sur ${d.liste.length}` : `${d.liste.length} élève(s)`;
    const zone = el.querySelector('#liste');
    zone.innerHTML = tableau([
      { titre: 'Sélection', entete: '', rendu: (x) => `<input type="checkbox" data-sel="${x.eleve_id}" ${selection.has(x.eleve_id) ? 'checked' : ''} aria-label="Sélectionner ${e(x.prenom)} ${e(x.nom)}">` },
      { titre: 'Élève', rendu: (x) => `<a href="#/eleves/${x.eleve_id}">${e(x.prenom)} ${e(x.nom)}</a>` },
      { titre: 'Classe', rendu: (x) => e(x.classe) },
      { titre: `Mensualité ${e(nomMois(d.mois).split(' ')[0])}`, classe: 'num', rendu: (x) => argent(Math.max(0, x.du - x.verse)) },
      { titre: 'Mois précédents', classe: 'num', rendu: (x) => (x.total_arrieres ? argent(x.total_arrieres) : '—') },
      { titre: 'Reliquat, fournitures, uniforme, blouson', classe: 'num', rendu: (x) => (x.total_autres ? argent(x.total_autres) : '—') },
      { titre: 'Total à payer', classe: 'num', rendu: (x) => `<b>${argent(x.total)}</b>${x.modifiee ? '<div><span class="badge info">✏️ modifiée</span></div>' : ''}` },
      { titre: '', rendu: (x) => `<div class="ligne" style="flex-wrap:nowrap;gap:.3rem">
          <button class="btn petit clair" data-modif="${x.eleve_id}" title="Modifier la facture de cet élève">✏️ Modifier</button>
          <button class="btn petit clair" data-impr="${x.eleve_id}" title="Imprimer la facture de cet élève">🖨️</button></div>` },
    ], lignes, { vide: q ? 'Aucun élève ne correspond à la recherche.' : 'Aucune facture pour ces critères.' });
    const mois = lire().mois;
    zone.querySelectorAll('[data-modif]').forEach((b) => { b.onclick = () => modifierFacture({ eleveId: b.dataset.modif, mois, apres: charger }); });
    zone.querySelectorAll('[data-impr]').forEach((b) => { b.onclick = () => imprimer('/paiements/factures.pdf' + qs({ ...lire(), classe_id: '', impayes: '', eleve_id: b.dataset.impr })); });
    // Cases à cocher
    const cases = [...zone.querySelectorAll('[data-sel]')];
    const tout = el.querySelector('#tout');
    const majTout = () => { tout.checked = cases.length > 0 && cases.every((c) => c.checked); tout.indeterminate = !tout.checked && cases.some((c) => c.checked); };
    cases.forEach((c) => {
      c.onchange = () => { const id = Number(c.dataset.sel); if (c.checked) selection.add(id); else selection.delete(id); majSelection(); majTout(); };
    });
    tout.onchange = () => { cases.forEach((c) => { c.checked = tout.checked; const id = Number(c.dataset.sel); if (tout.checked) selection.add(id); else selection.delete(id); }); majSelection(); };
    majTout(); majSelection();
  };

  // Modifier les factures cochées l'une après l'autre, puis proposer de les imprimer
  const modifierSelection = () => {
    const ids = derniere.liste.map((x) => x.eleve_id).filter((id) => selection.has(id)); // ordre de la liste
    if (!ids.length) { erreur(new Error('Les élèves sélectionnés ne sont pas dans la liste affichée (changez le mois ou la classe).')); return; }
    const mois = lire().mois;
    const suivant = async (i) => {
      if (i >= ids.length) {
        if (await confirmer(`Imprimer maintenant les ${ids.length} facture(s) sélectionnée(s) ?`, { titre: 'Factures modifiées', ok: '🖨️ Imprimer' })) imprimer(cheminSelection());
        return;
      }
      modifierFacture({ eleveId: ids[i], mois, apres: charger, serie: { rang: i + 1, total: ids.length }, auFermer: () => suivant(i + 1) });
    };
    suivant(0);
  };

  const charger = async () => {
    const m = el.querySelector('#mois').value;
    el.querySelector('#passe').innerHTML = m < moisCourant()
      ? `<div class="alerte info">⏰ <div><b>Mois passé (${e(nomMois(m))})</b> : pour les élèves en retard. Les factures portent la mention
          « <b>EN RETARD</b> » avec la prochaine date limite. Les mois suivants encore impayés ne sont pas repris :
          pour tout réclamer en une seule facture, choisissez plutôt le mois en cours (il reprend les mois précédents impayés).</div></div>` : '';
    try {
      const d = await get('/paiements/factures' + qs(lire()));
      el.querySelector('#alerte').innerHTML = d.sans_mensualite
        ? `<div class="alerte attention">⚠️ <div><b>${d.sans_mensualite} élève(s)</b> ont une mensualité à 0 : leurs factures afficheraient 0 FCFA.
            Réglez d'abord les mensualités dans <a href="#/parametres">Paramètres → Tarifs</a> (ou dans chaque classe, avec
            « appliquer aux élèves déjà inscrits »).</div></div>` : '';
      el.querySelector('#resume').innerHTML = `<div class="kpis" style="margin-bottom:1rem">
          ${kpi('Factures', d.nb, `${Math.ceil(d.nb / 2)} feuille(s) A4`, 'var(--secondaire)')}
          ${kpi('Total à encaisser', argent(d.total), `mensualité ${e(nomMois(d.mois))}, mois précédents et autres frais`, 'var(--primaire)')}</div>`;
      el.querySelector('#imprimer').disabled = el.querySelector('#pdf').disabled = !d.nb;
      derniere = d;
      rendreListe();
    } catch (err) { erreur(err); }
  };

  el.querySelector('#q').oninput = rendreListe;
  el.querySelector('#modif-sel').onclick = modifierSelection;
  el.querySelector('#impr-sel').onclick = () => imprimer(cheminSelection());
  el.querySelector('#desel').onclick = () => { selection.clear(); rendreListe(); };
  el.querySelector('#imprimer').onclick = () => imprimer(chemin());
  el.querySelector('#pdf').onclick = () => ouvrir(chemin());
  ['#classe', '#qui'].forEach((s) => { el.querySelector(s).onchange = charger; });
  // Mois passé : on ne garde d'office que les élèves qui doivent encore ce mois
  el.querySelector('#mois').onchange = () => {
    el.querySelector('#qui').value = el.querySelector('#mois').value < moisCourant() ? '1' : 'tous';
    casesRetard();
    charger();
  };
  casesRetard();
  await charger();
}
