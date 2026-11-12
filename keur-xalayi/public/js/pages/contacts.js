// Contacts des parents : pour chaque élève, sa classe, le père, la mère, le tuteur
// et les numéros de téléphone (appel ou WhatsApp en un clic), à imprimer ou exporter.
import { get, e, qs, options, tableau, boutonsExport, activerExports, erreur, kpi } from '../ui.js';

let minuteur;

/** +221771234567 -> « +221 77 123 45 67 » (autres pays : affiché tel quel). */
const lisible = (t) => (/^\+221\d{9}$/.test(t || '') ? t.replace(/^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/, '+221 $1 $2 $3 $4') : t || '');

export async function afficher(el, params) {
  const classes = await get('/classes');
  el.innerHTML = `
    <div class="entete-page"><h1>Contacts des parents</h1></div>
    <p class="muted" style="margin-top:-.4rem">Tous les élèves avec les noms et les numéros de leurs parents. Touchez un numéro pour appeler,
      ou 💬 pour écrire sur WhatsApp. Les numéros se modifient sur la fiche de l'élève.</p>
    <div class="filtres">
      <input class="recherche" type="search" id="q" placeholder="🔍 Nom de l'élève, du parent ou numéro" value="${e(params.q || '')}">
      <select id="classe">${options(classes.map((c) => [c.id, c.nom]), params.classe_id || '', { vide: 'Toutes les classes' })}</select>
      <select id="numero">${options([['', 'Tous les élèves'], ['sans', 'Seulement ceux sans numéro']], '')}</select>
    </div>
    <div id="kpis"></div>
    <div class="ligne" style="margin-bottom:.6rem"><b id="compte"></b><span class="espace"></span><span id="exports"></span></div>
    <div id="liste"></div>`;

  const lire = () => ({ q: el.querySelector('#q').value, classe_id: el.querySelector('#classe').value, sans_numero: el.querySelector('#numero').value === 'sans' ? '1' : '' });
  const exp = el.querySelector('#exports');
  exp.innerHTML = boutonsExport('contacts');
  activerExports(exp, lire);

  const tel = (numero, wa) => (numero ? `<a href="tel:${e(numero)}" style="white-space:nowrap">${e(lisible(numero))}</a>
    ${wa ? `<a href="https://wa.me/${e(numero.replace(/\D/g, ''))}" target="_blank" rel="noopener" title="Écrire sur WhatsApp">💬</a>` : ''}` : '');

  const charger = async () => {
    try {
      const f = lire();
      let lignes = await get('/eleves' + qs({ q: f.q, classe_id: f.classe_id }));
      const sans = lignes.filter((l) => !l.whatsapp).length;
      if (f.sans_numero) lignes = lignes.filter((l) => !l.whatsapp);
      lignes.forEach((l, i) => { l._n = i + 1; });
      el.querySelector('#kpis').innerHTML = `<div class="kpis" style="margin-bottom:1rem">
        ${kpi('Élèves', lignes.length, f.classe_id ? el.querySelector('#classe').selectedOptions[0].textContent : 'toute l\'école', 'var(--primaire)')}
        ${kpi('Sans numéro WhatsApp', sans, sans ? 'à compléter sur leur fiche' : 'tous les numéros sont là', sans ? 'var(--danger)' : 'var(--succes)')}</div>`;
      el.querySelector('#compte').textContent = `${lignes.length} élève(s)`;
      el.querySelector('#liste').innerHTML = tableau([
        { titre: 'N°', rendu: (l) => l._n },
        { titre: 'Élève', rendu: (l) => `<a href="#/eleves/${l.id}"><b>${e(l.prenom)} ${e(l.nom)}</b></a>` },
        { titre: 'Classe', rendu: (l) => e(l.classe || '—') },
        { titre: 'Parents', rendu: (l) => [['Père', l.pere_nom], ['Mère', l.mere_nom], ['Tuteur', l.tuteur_nom]].filter(([, n]) => n)
          .map(([k, n]) => `<div><span class="petit muted">${k} :</span> ${e(n)}</div>`).join('') || '<span class="muted">—</span>' },
        { titre: 'WhatsApp', rendu: (l) => tel(l.whatsapp, true) || '<span class="badge attention">À compléter</span>' },
        { titre: 'Autre numéro', rendu: (l) => tel(l.telephone2, false) || '<span class="muted">—</span>' },
      ], lignes, { vide: 'Aucun élève ne correspond.' });
    } catch (err) { erreur(err); }
  };
  el.querySelector('#q').oninput = () => { clearTimeout(minuteur); minuteur = setTimeout(charger, 250); };
  el.querySelector('#classe').onchange = charger;
  el.querySelector('#numero').onchange = charger;
  await charger();
}
