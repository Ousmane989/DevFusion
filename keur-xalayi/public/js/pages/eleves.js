// Liste des élèves : recherche, filtres, export, archivés.
import { get, e, tableau, lignesCliquables, options, avatar, dateFr, estRole, boutonsExport, activerExports, qs, ouvrir, imprimer } from '../ui.js';

let minuteur;

export async function afficher(el, params) {
  const classes = await get('/classes');
  const filtres = { q: params.q || '', classe_id: params.classe_id || '', statut: params.statut || 'actif', sexe: '' };
  el.innerHTML = `
    <div class="entete-page">
      <h1>Élèves</h1>
      ${estRole('directeur') ? '<a class="btn" href="#/eleves/nouveau">＋ Nouvelle inscription</a>' : ''}
    </div>
    <div class="filtres">
      <input class="recherche" type="search" id="q" placeholder="🔍 Nom, prénom, matricule, parent ou téléphone…" value="${e(filtres.q)}">
      <select id="classe">${options(classes.map((c) => [c.id, `${c.nom} (${c.effectif})`]), filtres.classe_id, { vide: 'Toutes les classes' })}</select>
      <select id="sexe">${options([['M', 'Garçons'], ['F', 'Filles']], '', { vide: 'Garçons et filles' })}</select>
      <select id="statut">${options([['actif', 'Élèves actifs'], ['archive', 'Élèves archivés (partis)']], filtres.statut)}</select>
    </div>
    <div class="ligne" style="margin-bottom:.8rem"><span id="compte" class="muted gras"></span><span class="espace"></span>
      <span id="exports"></span>
      <button class="btn clair petit" id="cartes">🪪 Cartes d'élève</button>
    </div>
    <div id="liste"></div>`;

  const charger = async () => {
    const lignes = await get('/eleves' + qs(filtres));
    el.querySelector('#compte').textContent = `${lignes.length} élève(s)`;
    const cols = [
      { titre: 'Élève', rendu: (l) => `<div class="qui">${avatar(l)}<div><b>${e(l.prenom)} ${e(l.nom)}</b><div class="petit muted">${e(l.matricule)}</div></div></div>` },
      { titre: 'Classe', rendu: (l) => e(l.classe || '—') },
      { titre: 'Sexe', rendu: (l) => (l.sexe === 'M' ? 'Garçon' : 'Fille') },
      { titre: 'Naissance', rendu: (l) => dateFr(l.date_naissance) || '—' },
      { titre: 'Parent', rendu: (l) => `${e(l.parent || '—')}<div class="petit muted">${l.whatsapp ? e(l.whatsapp) : 'N° WhatsApp à compléter'}</div>` },
    ];
    if (filtres.statut === 'archive') cols.push({ titre: 'Sortie', rendu: (l) => `${dateFr(l.date_sortie)}<div class="petit muted">${e(l.motif_sortie || '')}</div>` });
    else cols.push({ titre: 'Remarques', rendu: (l) => (l.remarques ? `<span class="badge attention" title="${e(l.remarques)}">⚠ ${e(l.remarques.slice(0, 28))}</span>` : '') });
    if (estRole('directeur') && filtres.statut === 'actif') {
      cols.push({ titre: '', rendu: (l) => (l.classe ? `<button class="btn petit clair" style="white-space:nowrap" data-facture="${l.id}" title="Imprimer la facture d'inscription">🧾 Facture</button>` : '') });
    }
    const zone = el.querySelector('#liste');
    zone.innerHTML = tableau(cols, lignes, { clic: true, vide: 'Aucun élève ne correspond à la recherche.' });
    zone.querySelectorAll('[data-facture]').forEach((b) => { b.onclick = () => imprimer(`/eleves/${b.dataset.facture}/facture-inscription.pdf`); });
    lignesCliquables(zone, lignes, (l) => { location.hash = `#/eleves/${l.id}`; });
  };

  const exp = el.querySelector('#exports');
  exp.innerHTML = boutonsExport('eleves');
  activerExports(exp, () => ({ ...filtres }));
  el.querySelector('#cartes').onclick = () => ouvrir('/exports/cartes.pdf' + qs({ classe_id: filtres.classe_id }));
  el.querySelector('#q').oninput = (ev) => { clearTimeout(minuteur); minuteur = setTimeout(() => { filtres.q = ev.target.value; charger(); }, 250); };
  el.querySelector('#classe').onchange = (ev) => { filtres.classe_id = ev.target.value; charger(); };
  el.querySelector('#sexe').onchange = (ev) => { filtres.sexe = ev.target.value; charger(); };
  el.querySelector('#statut').onchange = (ev) => { filtres.statut = ev.target.value; charger(); };
  await charger();
}
