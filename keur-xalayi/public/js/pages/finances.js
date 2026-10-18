// Finances : bilan mensuel (recettes, dépenses, solde), graphiques et dépenses.
import { get, post, del, e, qs, options, champ, formulaire, tableau, argent, nomMois, dateFr, aujourdhui, MODES, modesDuPays, toast, confirmer, estRole, graphiqueBarres, kpi, boutonsExport, activerExports, erreur } from '../ui.js';

export async function afficher(el) {
  const directeur = estRole('directeur');
  el.innerHTML = `<div class="entete-page"><h1>Finances</h1></div>
    <div class="onglets">${directeur ? '<button data-o="bilan">📊 Bilan</button>' : ''}<button data-o="depenses">🧾 Dépenses</button></div><div id="zone"></div>`;
  const zone = el.querySelector('#zone');
  const categories = await get('/finances/categories');

  const vues = {
    async bilan() {
      const b = await get('/finances/bilan');
      zone.innerHTML = `
        <div class="grille g3" style="margin-bottom:1rem">
          ${kpi('Recettes de l\'année', argent(b.totaux.recettes), `du ${dateFr(b.du)} au ${dateFr(b.au)}`, 'var(--succes)')}
          ${kpi('Dépenses de l\'année', argent(b.totaux.depenses), 'salaires compris', 'var(--danger)')}
          ${kpi('Solde', argent(b.totaux.solde), b.totaux.solde >= 0 ? 'Excédent' : 'Déficit', b.totaux.solde >= 0 ? 'var(--secondaire)' : 'var(--danger)')}
        </div>
        <div class="grille g2">
          <div class="carte"><h2>Évolution mensuelle</h2>${graphiqueBarres(b.lignes.map((l) => nomMois(l.mois, true)), [
    { nom: 'Recettes', couleur: '#2e3192', valeurs: b.lignes.map((l) => l.recettes) },
    { nom: 'Dépenses', couleur: '#c0392b', valeurs: b.lignes.map((l) => l.depenses) },
  ], { format: argent })}</div>
          <div class="carte"><h2>Dépenses par catégorie</h2>${b.par_categorie.length ? `<ul class="liste">${b.par_categorie.map((c) => {
    const pct = b.totaux.depenses ? Math.round((c.total / b.totaux.depenses) * 100) : 0;
    return `<li><div class="principal"><b>${e(c.categorie)}</b><div class="barre-progres" style="margin-top:.3rem"><div style="width:${pct}%;background:var(--primaire)"></div></div></div><span class="nowrap">${argent(c.total)} <span class="muted petit">${pct} %</span></span></li>`;
  }).join('')}</ul>` : '<div class="vide">Aucune dépense.</div>'}</div>
        </div>
        <div class="carte" style="margin-top:1rem"><h2>Bilan mois par mois</h2>${tableau([
    { titre: 'Mois', rendu: (l) => `<b>${e(nomMois(l.mois))}</b>` },
    { titre: 'Mensualités', classe: 'num', rendu: (l) => argent(l.mensualites) },
    { titre: 'Inscriptions', classe: 'num', rendu: (l) => argent(l.inscriptions) },
    { titre: 'Autres', classe: 'num', rendu: (l) => argent(l.autres) },
    { titre: 'Total recettes', classe: 'num', rendu: (l) => `<b>${argent(l.recettes)}</b>` },
    { titre: 'Salaires', classe: 'num', rendu: (l) => argent(l.salaires) },
    { titre: 'Total dépenses', classe: 'num', rendu: (l) => `<b>${argent(l.depenses)}</b>` },
    { titre: 'Solde', classe: 'num', rendu: (l) => `<b style="color:${l.solde >= 0 ? 'var(--succes)' : 'var(--danger)'}">${argent(l.solde)}</b>` },
  ], b.lignes)}</div>`;
    },

    async depenses() {
      zone.innerHTML = `<div class="filtres">
          <input type="date" id="du" value="${aujourdhui().slice(0, 8)}01" title="Du"><input type="date" id="au" value="${aujourdhui()}" title="Au">
          <select id="cat">${options(categories.map((c) => [c, c]), '', { vide: 'Toutes les catégories' })}</select>
        </div>
        <div class="ligne" style="margin-bottom:.8rem"><button class="btn" id="ajout">＋ Nouvelle dépense</button><b id="total"></b><span class="espace"></span><span id="exp">${boutonsExport('depenses')}</span></div>
        <div id="tab"></div>`;
      const lire = () => ({ du: zone.querySelector('#du').value, au: zone.querySelector('#au').value, categorie: zone.querySelector('#cat').value });
      activerExports(zone.querySelector('#exp'), lire);
      const charger = async () => {
        const d = await get('/finances/depenses' + qs(lire()));
        zone.querySelector('#total').textContent = `Total : ${argent(d.total)}`;
        zone.querySelector('#tab').innerHTML = tableau([
          { titre: 'Date', rendu: (x) => dateFr(x.date) },
          { titre: 'Catégorie', rendu: (x) => `<span class="badge info">${e(x.categorie)}</span>` },
          { titre: 'Libellé', rendu: (x) => e(x.libelle) },
          { titre: 'Montant', classe: 'num', rendu: (x) => `<b>${argent(x.montant)}</b>` },
          { titre: 'Mode', rendu: (x) => e(MODES[x.mode] || x.mode) },
          { titre: 'Saisi par', rendu: (x) => `<span class="petit muted">${e(x.saisi_par_nom || '')}</span>` },
          { titre: '', rendu: (x) => (directeur ? `<button class="btn petit clair" data-suppr="${x.id}">🗑️</button>` : '') },
        ], d.depenses, { vide: 'Aucune dépense sur cette période.' });
        zone.querySelectorAll('[data-suppr]').forEach((b) => {
          b.onclick = async () => { if (await confirmer('Supprimer cette dépense ?', { danger: true, ok: 'Supprimer' })) { await del(`/finances/depenses/${b.dataset.suppr}`); charger(); } };
        });
      };
      zone.querySelector('#ajout').onclick = () => formulaire('Nouvelle dépense', `<div class="grille g2">
          ${champ('Date', `<input type="date" name="date" value="${aujourdhui()}" max="${aujourdhui()}">`)}
          ${champ('Catégorie', `<select name="categorie" required>${options(categories.map((c) => [c, c]), '', { vide: '— Choisir —' })}</select>`, { requis: true })}</div>
          ${champ('Libellé', '<input name="libelle" required placeholder="Ex. Facture SENELEC d\'octobre">', { requis: true })}
          <div class="grille g2">${champ('Montant', '<input type="number" name="montant" min="1" step="any" required>', { requis: true })}
          ${champ('Mode de paiement', `<select name="mode">${options(modesDuPays(), 'especes')}</select>`)}</div>
          <p class="petit muted">Les salaires s'enregistrent dans « Personnel & salaires ».</p>`,
      async (f) => { await post('/finances/depenses', f); toast('Dépense enregistrée.', 'succes'); charger(); });
      zone.querySelectorAll('select, input').forEach((s) => { s.onchange = charger; });
      await charger();
    },
  };
  const montrer = (nom) => {
    el.querySelectorAll('[data-o]').forEach((b) => b.classList.toggle('actif', b.dataset.o === nom));
    vues[nom]().catch(erreur);
  };
  el.querySelectorAll('[data-o]').forEach((b) => { b.onclick = () => montrer(b.dataset.o); });
  montrer(directeur ? 'bilan' : 'depenses');
}
