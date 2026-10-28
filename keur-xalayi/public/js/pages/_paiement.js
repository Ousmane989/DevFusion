// Fenêtre d'encaissement d'un paiement (partagée par la fiche élève,
// la page Paiements et la page Impayés), puis reçu PDF / WhatsApp.
import { get, post, e, champ, options, formulaire, modale, argent, nomMois, aujourdhui, MODES, modesDuPays, toast, erreur, ouvrir, imprimer, resultatEnvoi } from '../ui.js';

/**
 * @param {number} eleveId
 * @param {Function} apres  rappelé après l'enregistrement
 * @param {string[]} moisPreselection
 */
export async function encaisser(eleveId, apres, moisPreselection = []) {
  const fiche = await get(`/eleves/${eleveId}`);
  if (!fiche.inscription) { erreur(new Error('Cet élève n\'est pas inscrit cette année.')); return; }
  const { solde } = fiche;
  const moisDispo = solde.mois.filter((m) => m.exigible);
  const premierDu = moisDispo.find((m) => m.reste > 0);
  const presel = moisPreselection.length ? moisPreselection : (premierDu ? [premierDu.mois] : []);

  const contenu = `
    <div class="alerte info"><div><b>${e(fiche.eleve.prenom)} ${e(fiche.eleve.nom)}</b> — ${e(fiche.inscription.classe)}<br>
      Mensualité : ${argent(fiche.inscription.mensualite - fiche.inscription.reduction)}${fiche.inscription.reduction > 0 ? ` (réduction ${argent(fiche.inscription.reduction)} : ${e(fiche.inscription.reduction_motif)})` : ''}
      · Reste dû à ce jour : <b>${argent(solde.totalReste)}</b></div></div>
    ${champ('Type de paiement', `<select name="type" id="type">${options([
    ['mensualite', 'Mensualité'],
    ['inscription', `Frais d'inscription (reste ${argent(solde.inscriptionFrais.reste)})`],
    // Reliquat, fournitures, uniforme : proposés seulement s'il reste quelque chose à payer
    ...Object.entries(solde.annexes || {}).filter(([, a]) => a.reste > 0).map(([t, a]) => [t, `${a.libelle} (reste ${argent(a.reste)})`]),
    ['autre', 'Autre (cantine, sortie…)'],
  ], 'mensualite')}</select>`)}
    <div id="zone-mois">${champ('Mois payé(s)', `<div class="grille g3" style="gap:.2rem .8rem">${moisDispo.map((m) => `
      <label class="case petit"><input type="checkbox" name="mois" data-multiple value="${m.mois}" data-reste="${m.reste}" ${presel.includes(m.mois) ? 'checked' : ''} ${m.reste <= 0 ? 'disabled' : ''}>
      ${e(nomMois(m.mois))} ${m.reste <= 0 ? '✔' : m.verse > 0 ? `<span class="muted">(reste ${argent(m.reste)})</span>` : ''}</label>`).join('')}</div>`, { aide: 'Cochez un ou plusieurs mois : le montant est réparti automatiquement.' })}</div>
    <div id="zone-objet" class="cache">${champ('Objet', '<input name="remarque" placeholder="Ex. tenue scolaire">')}</div>
    <div class="grille g2">
      ${champ('Montant', '<input type="number" name="montant" id="montant" min="1" step="any" required inputmode="decimal">', { requis: true })}
      ${champ('Date', `<input type="date" name="date_paiement" value="${aujourdhui()}" max="${aujourdhui()}">`)}
      ${champ('Mode de paiement', `<select name="mode" id="mode">${options(modesDuPays(), 'especes')}</select>`, { requis: true })}
      ${champ('Référence de transaction', '<input name="reference" id="ref" placeholder="N° de l\'opération (paiement mobile)">')}
    </div>`;

  const m = formulaire('Encaisser un paiement', contenu, async (d) => {
    const corps = { ...d, inscription_id: fiche.inscription.id };
    if (d.type !== 'mensualite') delete corps.mois;
    const r = await post('/paiements', corps);
    toast(`Paiement enregistré — reçu ${r.numero_recu}`, 'succes');
    apresPaiement(r.numero_recu, { montant: Number(d.montant), eleveId: d.type === 'inscription' ? eleveId : null });
    if (apres) apres();
  }, { ok: '💾 Enregistrer le paiement', large: true });

  const f = m.el.querySelector('form');
  const calc = () => {
    const type = f.querySelector('#type').value;
    m.el.querySelector('#zone-mois').classList.toggle('cache', type !== 'mensualite');
    m.el.querySelector('#zone-objet').classList.toggle('cache', type !== 'autre');
    if (type === 'mensualite') {
      const total = [...f.querySelectorAll('input[name=mois]:checked')].reduce((s, c) => s + Number(c.dataset.reste), 0);
      f.querySelector('#montant').value = total || '';
    } else if (type === 'inscription') f.querySelector('#montant').value = solde.inscriptionFrais.reste || '';
    else if (solde.annexes && solde.annexes[type]) f.querySelector('#montant').value = solde.annexes[type].reste || '';
    else f.querySelector('#montant').value = '';
  };
  f.querySelector('#type').onchange = calc;
  f.querySelectorAll('input[name=mois]').forEach((c) => { c.onchange = calc; });
  calc();
}

/**
 * Fenêtre affichée après chaque paiement : le reçu s'imprime en un clic
 * (ou s'envoie par WhatsApp). Après les frais d'inscription, la facture
 * d'inscription acquittée est aussi proposée.
 */
export function apresPaiement(numero, { montant, eleveId } = {}) {
  const chemin = `/paiements/recu/${encodeURIComponent(numero)}.pdf`;
  const md = modale('✔ Paiement enregistré', `
    <p class="centre" style="font-size:1.05rem;margin-top:0">Reçu n° <b>${e(numero)}</b>${montant ? ` — <b>${argent(montant)}</b>` : ''}</p>
    <button class="btn bloc" data-imprimer style="font-size:1.1rem;padding:.9rem">🖨️ Imprimer le reçu</button>
    <div class="grille g2" style="margin-top:.6rem">
      <button class="btn clair" data-pdf>📄 Voir / télécharger le PDF</button>
      <button class="btn vert" data-wa>📲 Envoyer par WhatsApp</button>
    </div>
    ${eleveId ? '<button class="btn sec bloc" data-facture style="margin-top:.6rem">🧾 Imprimer la facture d\'inscription (acquittée)</button>' : ''}`,
  { actions: '<button class="btn clair" data-f>Fermer</button>' });
  md.el.querySelector('[data-f]').onclick = md.fermer;
  md.el.querySelector('[data-imprimer]').onclick = () => imprimer(chemin);
  md.el.querySelector('[data-pdf]').onclick = () => ouvrir(chemin);
  md.el.querySelector('[data-wa]').onclick = () => envoyerRecu(numero);
  if (eleveId) md.el.querySelector('[data-facture]').onclick = () => imprimer(`/eleves/${eleveId}/facture-inscription.pdf`);
  md.el.querySelector('[data-imprimer]').focus();
}

export async function envoyerRecu(numero) {
  try {
    const msg = await post(`/paiements/recu/${encodeURIComponent(numero)}/whatsapp`);
    resultatEnvoi([msg], 'Envoyer le reçu');
  } catch (err) { erreur(err); }
}
