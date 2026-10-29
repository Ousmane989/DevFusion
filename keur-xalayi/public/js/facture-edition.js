// Modifier la facture du mois d'un élève, une par une : montants, désignations,
// lignes ajoutées ou retirées, date limite et note. La modification est gardée :
// elle ressort aussi dans l'impression de toutes les factures du mois.
import { get, put, del, e, qs, argent, nomMois, modale, confirmer, toast, erreur, imprimer, options } from './ui.js';

/**
 * Ouvre l'éditeur. `moisListe` (facultatif) : mois proposés dans un sélecteur.
 * `apres()` est appelé après un enregistrement ou un rétablissement.
 * `serie` ({ rang, total }) : élèves sélectionnés modifiés l'un après l'autre ;
 * `auFermer()` est alors appelé à la fermeture, pour passer au suivant.
 */
export async function modifierFacture({ eleveId, mois, moisListe, apres, serie, auFermer }) {
  let d;
  try { d = await get('/paiements/factures/edition' + qs({ mois, eleve_id: eleveId })); } catch (err) { erreur(err); if (auFermer) auFermer(); return; }
  let changeDeMois = false; // la fenêtre est rouverte sur un autre mois : la série continue dans la nouvelle
  // Lignes de travail : celles déjà modifiées, sinon celles calculées
  let lignes = (d.modifiee ? d.modifiee.lignes : d.auto).map((l) => ({ ...l }));
  const auto = new Map(d.auto.map((l) => [l.cle, l]));

  const m = modale(`${serie ? `(${serie.rang}/${serie.total}) ` : ''}🧾 Facture ${nomMois(d.mois)} — ${d.prenom} ${d.nom}`, `
    ${moisListe ? `<div class="ligne" style="margin-bottom:.6rem"><label class="gras">Mois</label>
      <select id="fe-mois" style="max-width:220px">${options(moisListe.map((x) => [x, nomMois(x)]), d.mois)}</select></div>` : ''}
    ${d.modifiee ? `<div class="alerte info" style="margin-bottom:.6rem">✏️ <div>Facture déjà modifiée${d.modifiee.par ? ` par ${e(d.modifiee.par)}` : ''}${d.modifiee.motif ? ` — motif : <b>${e(d.modifiee.motif)}</b>` : ''}.</div></div>` : ''}
    <div class="table-wrap"><table id="fe-table">
      <thead><tr><th>Désignation</th><th class="num">Montant</th><th class="num">Avance versée</th><th class="num">Reste</th><th></th></tr></thead>
      <tbody></tbody>
      <tfoot><tr><td><b>TOTAL</b></td><td class="num" id="fe-tdu"></td><td class="num" id="fe-tv"></td><td class="num"><b id="fe-tr"></b></td><td></td></tr></tfoot>
    </table></div>
    <button type="button" class="btn clair petit" id="fe-ajout" style="margin:.5rem 0 1rem">＋ Ajouter une ligne</button>
    <p class="petit muted" style="margin-top:0">Les avances des lignes calculées viennent des paiements encaissés et se mettent à jour toutes seules.
      Pour une ligne ajoutée, saisissez l'avance vous-même.</p>
    <div class="grille g2">
      <label>À payer avant le<input type="date" id="fe-limite" value="${e((d.modifiee && d.modifiee.date_limite) || d.date_limite_defaut)}"></label>
      <label>Motif de la modification <span class="petit muted">(facultatif)</span><input id="fe-motif" maxlength="300" value="${e(d.modifiee ? d.modifiee.motif || '' : '')}" placeholder="Ex. arrangement avec le parent"></label>
    </div>
    <label style="margin-top:.6rem;display:block">Note imprimée sur la facture <span class="petit muted">(facultatif)</span>
      <input id="fe-note" maxlength="200" value="${e(d.modifiee ? d.modifiee.note || '' : '')}" placeholder="Ex. Le parent paiera en deux fois."></label>`, {
    large: true,
    auFermer: () => { if (!changeDeMois && auFermer) auFermer(); },
    actions: `${d.modifiee ? '<button class="btn clair" data-retablir style="margin-right:auto">↩️ Rétablir la facture d\'origine</button>' : ''}
      ${serie ? `<button class="btn clair" data-annuler>${serie.rang < serie.total ? '⏭️ Passer' : 'Fermer'}</button>
      <button class="btn" data-ok>💾 Enregistrer${serie.rang < serie.total ? ' et continuer' : ''}</button>`
    : `<button class="btn clair" data-annuler>Annuler</button>
      <button class="btn clair" data-ok>💾 Enregistrer</button>
      <button class="btn" data-imprimer>🖨️ Enregistrer et imprimer</button>`}`,
  });
  const $ = (s) => m.el.querySelector(s);
  const corps = $('#fe-table tbody');

  // Avance d'une ligne : calculée (paiements réels) ou saisie pour une ligne ajoutée
  const verseDe = (l) => {
    const mt = Number(l.montant) || 0;
    if (!l.cle) return Math.min(Number(l.verse) || 0, mt);
    const a = auto.get(l.cle);
    return a ? Math.min(a.verse, mt) : mt;
  };
  // Recalcule les avances, restes et totaux sans reconstruire le tableau (la saisie n'est pas interrompue)
  const recalculer = () => {
    corps.querySelectorAll('tr').forEach((tr, i) => {
      const l = lignes[i]; const v = verseDe(l);
      const av = tr.querySelector('[data-avance]'); if (av) av.textContent = argent(v);
      tr.querySelector('[data-reste]').textContent = argent(Math.max(0, (Number(l.montant) || 0) - v));
    });
    $('#fe-tdu').textContent = argent(lignes.reduce((t, l) => t + (Number(l.montant) || 0), 0));
    $('#fe-tv').textContent = argent(lignes.reduce((t, l) => t + verseDe(l), 0));
    $('#fe-tr').textContent = argent(lignes.reduce((t, l) => t + Math.max(0, (Number(l.montant) || 0) - verseDe(l)), 0));
    $('#fe-ajout').disabled = lignes.length >= 10;
  };
  const afficher = () => {
    corps.innerHTML = lignes.map((l, i) => `<tr>
        <td><input data-i="${i}" data-k="libelle" value="${e(l.libelle)}" maxlength="120" style="min-width:140px" placeholder="Désignation"></td>
        <td class="num"><input data-i="${i}" data-k="montant" type="number" min="0" step="any" value="${e(l.montant)}" style="width:95px;text-align:right"></td>
        <td class="num">${l.cle ? '<span data-avance title="Calculée à partir des paiements"></span>'
    : `<input data-i="${i}" data-k="verse" type="number" min="0" step="any" value="${e(l.verse || 0)}" style="width:95px;text-align:right">`}</td>
        <td class="num gras" data-reste></td>
        <td><button type="button" class="btn lien petit" data-retirer="${i}" title="Retirer cette ligne" aria-label="Retirer">🗑️</button></td></tr>`).join('');
    corps.querySelectorAll('input').forEach((x) => {
      x.oninput = () => { lignes[x.dataset.i][x.dataset.k] = x.dataset.k === 'libelle' ? x.value : Number(x.value); recalculer(); };
    });
    corps.querySelectorAll('[data-retirer]').forEach((b) => { b.onclick = () => { lignes.splice(Number(b.dataset.retirer), 1); afficher(); }; });
    recalculer();
  };
  afficher();

  $('#fe-ajout').onclick = () => { lignes.push({ cle: null, libelle: '', montant: 0, verse: 0 }); afficher(); corps.querySelector('tr:last-child input').focus(); };
  if ($('#fe-mois')) {
    $('#fe-mois').onchange = () => {
      changeDeMois = true; m.fermer();
      modifierFacture({ eleveId, mois: $('#fe-mois').value, moisListe, apres, serie, auFermer });
    };
  }
  $('[data-annuler]').onclick = m.fermer;

  const chemin = () => `/paiements/factures.pdf?mois=${d.mois}&eleve_id=${d.eleve_id}`;
  const enregistrer = async (puisImprimer) => {
    // Les valeurs encore en cours de saisie (sans avoir quitté le champ)
    corps.querySelectorAll('input').forEach((x) => { lignes[x.dataset.i][x.dataset.k] = x.dataset.k === 'libelle' ? x.value : Number(x.value); });
    const corpsReq = {
      mois: d.mois, inscription_id: d.inscription_id, date_limite: $('#fe-limite').value, motif: $('#fe-motif').value, note: $('#fe-note').value,
      lignes: lignes.map(({ cle, libelle, montant, verse }) => ({ cle, libelle, montant, verse })),
    };
    const btns = m.el.querySelectorAll('footer .btn');
    btns.forEach((b) => { b.disabled = true; });
    try {
      await put('/paiements/factures/edition', corpsReq);
      toast('Facture modifiée.', 'succes');
      m.fermer();
      if (apres) apres();
      if (puisImprimer) imprimer(chemin());
    } catch (err) { erreur(err); btns.forEach((b) => { b.disabled = false; }); }
  };
  $('[data-ok]').onclick = () => enregistrer(false);
  if ($('[data-imprimer]')) $('[data-imprimer]').onclick = () => enregistrer(true);
  if ($('[data-retablir]')) {
    $('[data-retablir]').onclick = async () => {
      if (!await confirmer('Revenir à la facture calculée automatiquement (vos modifications pour ce mois seront effacées) ?', { ok: 'Rétablir' })) return;
      try {
        await del('/paiements/factures/edition' + qs({ mois: d.mois, inscription_id: d.inscription_id }));
        toast('Facture d\'origine rétablie.', 'succes');
        m.fermer();
        if (apres) apres();
      } catch (err) { erreur(err); }
    };
  }
}
