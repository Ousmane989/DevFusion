// Statistiques d'assiduité par classe et par élève.
import { get, e, qs, options, tableau, aujourdhui, graphiqueBarres, nomCourt, boutonsExport, activerExports, kpi } from '../ui.js';

export async function afficher(el) {
  const [classes, jour] = await Promise.all([get('/classes'), get('/presences/jour')]);
  el.innerHTML = `
    <div class="entete-page"><h1>Assiduité</h1></div>
    <div class="carte" style="margin-bottom:1rem"><h2>Aujourd'hui</h2>
      ${tableau([
    { titre: 'Classe', rendu: (c) => `<b>${e(c.nom)}</b>` },
    { titre: 'Appel', rendu: (c) => (c.saisis ? '<span class="badge ok">Fait</span>' : '<span class="badge attention">Non fait</span>') },
    { titre: 'Effectif', classe: 'num', rendu: (c) => c.effectif },
    { titre: 'Absents', classe: 'num', rendu: (c) => c.absents },
    { titre: 'Retards', classe: 'num', rendu: (c) => c.retards },
  ], jour.classes)}
    </div>
    <div class="filtres">
      <select id="classe">${options(classes.map((c) => [c.id, c.nom]), '', { vide: 'Toutes les classes' })}</select>
      <input type="date" id="du" title="Du"><input type="date" id="au" value="${aujourdhui()}" title="Au">
    </div>
    <div id="zone"></div>`;
  const lire = () => ({ classe_id: el.querySelector('#classe').value, du: el.querySelector('#du').value, au: el.querySelector('#au').value });
  const charger = async () => {
    const d = await get('/presences/stats' + qs(lire()));
    if (!el.querySelector('#du').value) el.querySelector('#du').value = d.du;
    const tot = d.classes.reduce((s, c) => ({ j: s.j + c.jours, p: s.p + c.presents + c.retards, a: s.a + c.absents, r: s.r + c.retards }), { j: 0, p: 0, a: 0, r: 0 });
    const zone = el.querySelector('#zone');
    zone.innerHTML = `
      <div class="grille g3" style="margin-bottom:1rem">
        ${kpi('Taux d\'assiduité', tot.j ? `${Math.round((tot.p / tot.j) * 1000) / 10} %` : '—', `${tot.j} présences relevées`, 'var(--succes)')}
        ${kpi('Absences', tot.a, 'sur la période', 'var(--danger)')}
        ${kpi('Retards', tot.r, 'sur la période', 'var(--accent)')}
      </div>
      ${d.classes.length > 1 ? `<div class="carte" style="margin-bottom:1rem"><h2>Par classe</h2>${graphiqueBarres(d.classes.map((c) => nomCourt(c.classe)), [
    { nom: 'Absences', couleur: '#c0392b', valeurs: d.classes.map((c) => c.absents) },
    { nom: 'Retards', couleur: '#f2b134', valeurs: d.classes.map((c) => c.retards) },
  ], { hauteur: 190 })}</div>` : ''}
      <div class="ligne fin" style="margin-bottom:.6rem" id="exp">${boutonsExport('presences')}</div>
      ${tableau([
    { titre: 'Élève', rendu: (x) => `<a href="#/eleves/${x.eleve_id}">${e(x.prenom)} ${e(x.nom)}</a>` },
    { titre: 'Classe', rendu: (x) => e(x.classe) },
    { titre: 'Jours', classe: 'num', rendu: (x) => x.jours },
    { titre: 'Absences', classe: 'num', rendu: (x) => (x.absents ? `<b style="color:var(--danger)">${x.absents}</b>` : 0) },
    { titre: 'Retards', classe: 'num', rendu: (x) => x.retards },
    { titre: 'Assiduité', rendu: (x) => (x.taux === null ? '—' : `<div class="ligne" style="flex-wrap:nowrap"><div class="barre-progres" style="width:80px"><div style="width:${x.taux}%;background:${x.taux < 80 ? 'var(--danger)' : x.taux < 92 ? 'var(--accent)' : 'var(--succes)'}"></div></div>${x.taux} %</div>`) },
  ], d.eleves.sort((a, b) => b.absents - a.absents), { vide: 'Aucune donnée.' })}`;
    activerExports(zone.querySelector('#exp'), () => ({ classe_id: lire().classe_id }));
  };
  el.querySelectorAll('select, input').forEach((s) => { s.onchange = charger; });
  await charger();
}
