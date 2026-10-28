// Factures de mensualité : la directrice choisit un mois et une classe (ou toute
// l'école) et imprime toutes les factures d'un coup (3 par feuille A4, à découper).
// Chaque facture : mensualité du mois, réduction, déjà versé, mois précédents
// impayés et total à payer.
import { get, e, qs, options, argent, nomMois, tableau, ouvrir, imprimer, moisCourant, kpi, erreur } from '../ui.js';

export async function afficher(el, params) {
  const [classes, moisInfo] = await Promise.all([get('/classes'), get('/paiements/mois')]);
  const moisDefaut = moisInfo.mois.includes(params.mois) ? params.mois
    : moisInfo.mois.includes(moisCourant()) ? moisCourant() : moisInfo.mois[0];

  el.innerHTML = `
    <div class="entete-page"><h1>Factures du mois</h1></div>
    <p class="muted" style="margin-top:-.4rem">Préparez en une fois les factures de mensualité à remettre aux parents :
      3 factures par feuille A4, à découper. Chaque facture reprend aussi les mois précédents non réglés.</p>
    <div class="filtres">
      <select id="mois">${options(moisInfo.mois.map((m) => [m, nomMois(m)]), moisDefaut)}</select>
      <select id="classe">${options(classes.map((c) => [c.id, `${c.nom} (${c.effectif})`]), params.classe_id || '', { vide: 'Toute l\'école' })}</select>
      <select id="qui">${options([['tous', 'Tous les élèves'], ['1', 'Seulement ceux qui doivent']], 'tous')}</select>
    </div>
    <div id="alerte"></div>
    <div id="resume"></div>
    <div class="barre-action" style="margin-bottom:1rem">
      <button class="btn" id="imprimer">🖨️ Imprimer les factures</button>
      <button class="btn clair" id="pdf">📄 Voir / télécharger le PDF</button>
    </div>
    <div id="liste"></div>`;

  const lire = () => {
    const f = { mois: el.querySelector('#mois').value, classe_id: el.querySelector('#classe').value };
    if (el.querySelector('#qui').value === '1') f.impayes = '1';
    return f;
  };
  const chemin = () => '/paiements/factures.pdf' + qs(lire());

  const charger = async () => {
    try {
      const d = await get('/paiements/factures' + qs(lire()));
      el.querySelector('#alerte').innerHTML = d.sans_mensualite
        ? `<div class="alerte attention">⚠️ <div><b>${d.sans_mensualite} élève(s)</b> ont une mensualité à 0 : leurs factures afficheraient 0 FCFA.
            Réglez d'abord les mensualités dans <a href="#/parametres">Paramètres → Tarifs</a> (ou dans chaque classe, avec
            « appliquer aux élèves déjà inscrits »).</div></div>` : '';
      el.querySelector('#resume').innerHTML = `<div class="kpis" style="margin-bottom:1rem">
          ${kpi('Factures', d.nb, `${Math.ceil(d.nb / 3)} feuille(s) A4`, 'var(--secondaire)')}
          ${kpi('Total à encaisser', argent(d.total), `mensualité ${e(nomMois(d.mois))} + mois précédents impayés`, 'var(--primaire)')}</div>`;
      el.querySelector('#imprimer').disabled = el.querySelector('#pdf').disabled = !d.nb;
      el.querySelector('#liste').innerHTML = `<div class="carte"><h2>Aperçu</h2>${tableau([
        { titre: 'Élève', rendu: (x) => `<a href="#/eleves/${x.eleve_id}">${e(x.prenom)} ${e(x.nom)}</a>` },
        { titre: 'Classe', rendu: (x) => e(x.classe) },
        { titre: `Mensualité ${e(nomMois(d.mois).split(' ')[0])}`, classe: 'num', rendu: (x) => argent(Math.max(0, x.du - x.verse)) },
        { titre: 'Mois précédents', classe: 'num', rendu: (x) => (x.total_arrieres ? argent(x.total_arrieres) : '—') },
        { titre: 'Total à payer', classe: 'num', rendu: (x) => `<b>${argent(x.total)}</b>` },
      ], d.liste, { vide: 'Aucune facture pour ces critères.' })}</div>`;
    } catch (err) { erreur(err); }
  };

  el.querySelector('#imprimer').onclick = () => imprimer(chemin());
  el.querySelector('#pdf').onclick = () => ouvrir(chemin());
  ['#mois', '#classe', '#qui'].forEach((s) => { el.querySelector(s).onchange = charger; });
  await charger();
}
