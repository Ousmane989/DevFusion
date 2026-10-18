// Résultats : moyennes, classement, bulletins PDF et envoi aux parents.
import { get, post, e, options, ctx, tableau, ouvrir, estRole, resultatEnvoi, erreur, kpi, qs } from '../ui.js';

export async function afficher(el, params) {
  const classes = await get('/classes');
  if (!classes.length) { el.innerHTML = '<div class="carte vide">Aucune classe.</div>'; return; }
  const nb = ctx.ecole.nb_periodes; const lib = ctx.ecole.libelle_periode;
  const etat = { classe_id: params.classe_id || classes[0].id, periode: params.periode || 1 };
  el.innerHTML = `
    <div class="filtres">
      <select id="classe">${options(classes.map((c) => [c.id, c.nom]), etat.classe_id)}</select>
      <select id="periode">${options([...Array.from({ length: nb }, (_, i) => [i + 1, `${lib} ${i + 1}`]), [0, 'Bilan annuel']], etat.periode)}</select>
    </div>
    <div class="ligne" style="margin-bottom:1rem">
      <button class="btn" id="pdf">🖨️ Bulletins de toute la classe (PDF)</button>
      ${estRole('directeur', 'secretaire') ? '<button class="btn vert" id="envoyer">📲 Envoyer les résultats aux parents</button>' : ''}
      ${estRole('directeur', 'enseignant') ? '<a class="btn clair" id="saisie">📝 Saisir les notes</a>' : ''}
    </div>
    <div id="zone"></div>`;

  const charger = async () => {
    const r = await get(`/notes/resultats?classe_id=${etat.classe_id}&periode=${etat.periode}`);
    const s = el.querySelector('#saisie');
    if (s) s.href = `#/notes?classe_id=${etat.classe_id}&periode=${etat.periode || 1}`;
    const zone = el.querySelector('#zone');
    const lienPdf = (l) => `<button class="btn petit clair" data-pdf="${l.inscription_id}">📄 Bulletin</button>`;
    if (r.cycle === 'maternelle') {
      zone.innerHTML = `<div class="alerte info">Maternelle : le bulletin présente les appréciations par compétence (pas de moyenne ni de classement).</div>
        ${tableau([
    { titre: 'Élève', rendu: (l) => `<b>${e(l.prenom)} ${e(l.nom)}</b>` },
    { titre: 'Acquis', classe: 'num', rendu: (l) => l.appreciations.filter((a) => a.niveau === 'A').length },
    { titre: 'En cours', classe: 'num', rendu: (l) => l.appreciations.filter((a) => a.niveau === 'EC').length },
    { titre: 'Non acquis', classe: 'num', rendu: (l) => l.appreciations.filter((a) => a.niveau === 'NA').length },
    { titre: 'Non évalué', classe: 'num', rendu: (l) => l.appreciations.filter((a) => !a.niveau).length },
    { titre: '', rendu: lienPdf },
  ], r.lignes)}`;
    } else {
      const st = r.stats;
      const tri = [...r.lignes].sort((a, b) => (a.rang ?? 999) - (b.rang ?? 999));
      zone.innerHTML = `<div class="grille g4" style="margin-bottom:1rem">
          ${kpi('Moyenne de la classe', st.moyenne_classe ?? '—', '/ 10', 'var(--secondaire)')}
          ${kpi('Plus forte moyenne', st.plus_forte ?? '—', '', 'var(--succes)')}
          ${kpi('Plus faible moyenne', st.plus_faible ?? '—', '', 'var(--danger)')}
          ${kpi('Moyenne ≥ 5', `${st.admis} / ${st.evalues}`, st.evalues ? `${Math.round((st.admis / st.evalues) * 100)} % des élèves` : '', 'var(--primaire)')}
        </div>
        ${tableau([
    { titre: 'Rang', rendu: (l) => (l.rang ? `<b style="font-size:1.1rem">${l.rang}${l.rang === 1 ? 'er' : 'e'}</b>` : '—') },
    { titre: 'Élève', rendu: (l) => `<b>${e(l.prenom)} ${e(l.nom)}</b><div class="petit muted">${e(l.matricule)}</div>` },
    ...(Number(etat.periode) === 0
    ? Array.from({ length: nb }, (_, i) => ({ titre: `${lib.slice(0, 4)}. ${i + 1}`, classe: 'num', rendu: (l) => l.moyennes_periodes[i] ?? '—' }))
    : [{ titre: 'Notes saisies', classe: 'num', rendu: (l) => `${l.notes.filter((n) => n.note !== null).length} / ${l.notes.length}` }]),
    { titre: 'Moyenne /10', classe: 'num', rendu: (l) => (l.moyenne === null ? '—' : `<b>${l.moyenne.toFixed(2)}</b>`) },
    { titre: 'Appréciation', rendu: (l) => (l.appreciation ? `<span class="badge ${l.moyenne >= 7 ? 'ok' : l.moyenne >= 5 ? 'info' : 'ko'}">${e(l.appreciation)}</span>` : '') },
    { titre: '', rendu: lienPdf },
  ], tri)}`;
    }
    zone.querySelectorAll('[data-pdf]').forEach((b) => { b.onclick = () => ouvrir('/notes/bulletins.pdf' + qs({ ...etat, inscription_id: b.dataset.pdf })); });
  };
  el.querySelector('#classe').onchange = (ev) => { etat.classe_id = ev.target.value; charger(); };
  el.querySelector('#periode').onchange = (ev) => { etat.periode = ev.target.value; charger(); };
  el.querySelector('#pdf').onclick = () => ouvrir('/notes/bulletins.pdf' + qs(etat));
  const env = el.querySelector('#envoyer');
  if (env) {
    env.onclick = async () => {
      if (!confirm('Envoyer à chaque parent la moyenne, le rang et le lien vers le bulletin ?')) return;
      try { resultatEnvoi(await post('/notes/bulletins/envoyer', etat), 'Envoi des résultats'); } catch (err) { erreur(err); }
    };
  }
  await charger();
}
