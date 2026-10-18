// Impayés par classe et par mois, avec rappel WhatsApp en un clic.
import { get, post, e, qs, options, argent, nomMois, badge, tableau, boutonsExport, activerExports, resultatEnvoi, erreur, kpi } from '../ui.js';
import { encaisser } from './_paiement.js';

export async function afficher(el, params) {
  const [classes, moisInfo] = await Promise.all([get('/classes'), get('/paiements/mois')]);
  el.innerHTML = `
    <div class="entete-page"><h1>Impayés</h1></div>
    <div class="filtres">
      <select id="mois">${options(moisInfo.echus.map((m) => [m, nomMois(m)]).reverse(), params.mois || '', { vide: 'Tous les mois échus' })}</select>
      <select id="classe">${options(classes.map((c) => [c.id, c.nom]), params.classe_id || '', { vide: 'Toutes les classes' })}</select>
      <select id="vue">${options([['detail', 'Détail (une ligne par mois)'], ['eleve', 'Regroupé par élève']], 'eleve')}</select>
    </div>
    <div id="resume"></div>
    <div class="ligne" style="margin-bottom:.6rem"><span class="espace"></span><span id="exp"></span><button class="btn vert petit" id="rappel">📲 Rappel WhatsApp à ces parents</button></div>
    <div id="tab"></div>`;
  const lire = () => ({ mois: el.querySelector('#mois').value, classe_id: el.querySelector('#classe').value });
  const exp = el.querySelector('#exp');
  exp.innerHTML = boutonsExport('impayes');
  activerExports(exp, lire);

  const charger = async () => {
    const d = await get('/paiements/impayes' + qs(lire()));
    const parEleve = new Map();
    for (const x of d.liste) {
      const g = parEleve.get(x.eleve_id) || { ...x, mois_liste: [], reste: 0 };
      g.mois_liste.push(x.mois); g.reste += x.reste;
      parEleve.set(x.eleve_id, g);
    }
    const parClasse = {};
    for (const x of d.liste) parClasse[x.classe] = (parClasse[x.classe] || 0) + x.reste;
    el.querySelector('#resume').innerHTML = `<div class="grille g3" style="margin-bottom:1rem">
      ${kpi('Total restant dû', argent(d.total), lire().mois ? nomMois(lire().mois) : 'tous les mois échus', 'var(--danger)')}
      ${kpi('Élèves concernés', parEleve.size, `${d.liste.length} mensualité(s) non soldée(s)`, 'var(--primaire)')}
      ${kpi('Classe la plus concernée', e(Object.entries(parClasse).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'), Object.keys(parClasse).length ? argent(Math.max(...Object.values(parClasse))) : '', 'var(--secondaire)')}</div>`;
    const vue = el.querySelector('#vue').value;
    const cols = vue === 'eleve'
      ? [
        { titre: 'Élève', rendu: (x) => `<a href="#/eleves/${x.eleve_id}"><b>${e(x.prenom)} ${e(x.nom)}</b></a><div class="petit muted">${e(x.classe)}</div>` },
        { titre: 'Parent', rendu: (x) => `${e(x.parent)}<div class="petit"><a href="https://wa.me/${e(x.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">${e(x.whatsapp)}</a></div>` },
        { titre: 'Mois impayés', rendu: (x) => x.mois_liste.map((m) => `<span class="badge impaye">${e(nomMois(m, true))}</span>`).join(' ') },
        { titre: 'Reste dû', classe: 'num', rendu: (x) => `<b>${argent(x.reste)}</b>` },
        { titre: '', rendu: (x) => `<button class="btn petit" data-payer="${x.eleve_id}" data-mois="${x.mois_liste.join(',')}">Encaisser</button>` },
      ]
      : [
        { titre: 'Élève', rendu: (x) => `<a href="#/eleves/${x.eleve_id}">${e(x.prenom)} ${e(x.nom)}</a>` },
        { titre: 'Classe', rendu: (x) => e(x.classe) },
        { titre: 'Mois', rendu: (x) => e(nomMois(x.mois)) },
        { titre: 'Dû', classe: 'num', rendu: (x) => argent(x.du) },
        { titre: 'Versé', classe: 'num', rendu: (x) => argent(x.verse) },
        { titre: 'Reste', classe: 'num', rendu: (x) => `<b>${argent(x.reste)}</b>` },
        { titre: 'Statut', rendu: (x) => badge(x.statut) },
        { titre: '', rendu: (x) => `<button class="btn petit" data-payer="${x.eleve_id}" data-mois="${x.mois}">Encaisser</button>` },
      ];
    el.querySelector('#tab').innerHTML = tableau(cols, vue === 'eleve' ? [...parEleve.values()] : d.liste, { vide: '🎉 Aucun impayé !' });
    el.querySelectorAll('[data-payer]').forEach((b) => { b.onclick = () => encaisser(Number(b.dataset.payer), charger, b.dataset.mois.split(',')); });
  };
  el.querySelectorAll('select').forEach((s) => { s.onchange = charger; });
  el.querySelector('#rappel').onclick = async () => {
    const { mois, classe_id } = lire();
    if (!mois) { erreur(new Error('Choisissez d\'abord un mois précis pour envoyer le rappel.')); return; }
    try {
      resultatEnvoi(await post('/whatsapp/rappels/envoyer', { mois, classe_id, impayes_seulement: true }), 'Rappels de paiement');
    } catch (err) { erreur(err); }
  };
  await charger();
}
