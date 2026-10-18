// Saisie des notes (primaire) ou des appréciations par compétence (maternelle).
import { get, post, e, options, ctx, toast, erreur } from '../ui.js';

export async function afficher(el, params) {
  const classes = await get('/classes');
  if (!classes.length) { el.innerHTML = '<div class="carte vide">Aucune classe ne vous est attribuée.</div>'; return; }
  const nb = ctx.ecole.nb_periodes; const lib = ctx.ecole.libelle_periode;
  const etat = { classe_id: params.classe_id || classes[0].id, periode: params.periode || 1 };
  el.innerHTML = `
    <div class="filtres">
      <select id="classe">${options(classes.map((c) => [c.id, c.nom]), etat.classe_id)}</select>
      <select id="periode">${options(Array.from({ length: nb }, (_, i) => [i + 1, `${lib} ${i + 1}`]), etat.periode)}</select>
    </div>
    <div id="zone"></div>`;

  let modifie = false;
  const charger = async () => {
    const d = await get(`/notes/saisie?classe_id=${etat.classe_id}&periode=${etat.periode}`);
    const zone = el.querySelector('#zone');
    modifie = false;
    if (!d.eleves.length) { zone.innerHTML = '<div class="carte vide">Aucun élève dans cette classe.</div>'; return; }

    if (d.cycle === 'primaire') {
      const val = {};
      d.valeurs.forEach((v) => { val[`${v.inscription_id}:${v.matiere_id}`] = v.note; });
      zone.innerHTML = `
        <div class="alerte info">Saisissez les notes puis cliquez sur « Enregistrer ». Laissez vide si l'élève n'a pas été évalué. Les moyennes et le classement sont calculés automatiquement.</div>
        <div class="table-wrap notes-grille"><table><thead><tr><th>Élève</th>${d.matieres.map((m) => `<th class="centre" title="Coefficient ${m.coefficient}">${e(m.nom)}<br><span class="petit">/${m.bareme} · coef ${m.coefficient}</span></th>`).join('')}<th>Observation</th></tr></thead>
        <tbody>${d.eleves.map((x) => `<tr><td class="nowrap"><b>${e(x.nom)}</b> ${e(x.prenom)}</td>
          ${d.matieres.map((m) => `<td class="centre"><input inputmode="decimal" data-i="${x.inscription_id}" data-m="${m.id}" data-max="${m.bareme}" value="${val[`${x.inscription_id}:${m.id}`] ?? ''}"></td>`).join('')}
          <td><input data-obs="${x.inscription_id}" value="${e(d.observations[x.inscription_id] || '')}" style="min-width:180px" placeholder="Ex. Bon travail"></td></tr>`).join('')}</tbody></table></div>
        <div class="barre-action"><button class="btn" id="enreg">💾 Enregistrer les notes</button><a class="btn clair" href="#/bulletins?classe_id=${etat.classe_id}&periode=${etat.periode}">📄 Voir les résultats</a></div>`;
      zone.querySelectorAll('input[data-m]').forEach((inp) => {
        inp.oninput = () => {
          modifie = true;
          const v = Number(inp.value.replace(',', '.'));
          inp.style.borderColor = inp.value && (Number.isNaN(v) || v < 0 || v > Number(inp.dataset.max)) ? 'var(--danger)' : '';
        };
        // Passage rapide à l'élève suivant avec Entrée.
        inp.onkeydown = (ev) => {
          if (ev.key !== 'Enter') return;
          ev.preventDefault();
          const col = [...zone.querySelectorAll(`input[data-m="${inp.dataset.m}"]`)];
          const n = col[col.indexOf(inp) + 1];
          if (n) n.focus();
        };
      });
      zone.querySelector('#enreg').onclick = async () => {
        try {
          await post('/notes/saisie', {
            classe_id: etat.classe_id, periode: etat.periode,
            notes: [...zone.querySelectorAll('input[data-m]')].map((i) => ({ inscription_id: Number(i.dataset.i), matiere_id: Number(i.dataset.m), note: i.value.trim() })),
            observations: [...zone.querySelectorAll('input[data-obs]')].map((i) => ({ inscription_id: Number(i.dataset.obs), texte: i.value.trim() })),
          });
          modifie = false;
          toast('Notes enregistrées ✔', 'succes');
        } catch (err) { erreur(err); }
      };
    } else {
      // Maternelle : une carte par élève, compétences regroupées par domaine.
      const val = {};
      d.valeurs.forEach((v) => { val[`${v.inscription_id}:${v.competence_id}`] = v.niveau; });
      const domaines = [...new Set(d.competences.map((c) => c.domaine))];
      zone.innerHTML = `
        <div class="alerte info">Maternelle : pour chaque compétence, choisissez <b>A</b> (acquis), <b>EC</b> (en cours d'acquisition) ou <b>NA</b> (non acquis).</div>
        ${d.eleves.map((x) => `<div class="carte" data-eleve="${x.inscription_id}"><h3>${e(x.prenom)} ${e(x.nom)}</h3>
          ${domaines.map((dom) => `<div class="petit gras" style="color:var(--secondaire);margin-top:.5rem">${e(dom)}</div>
            ${d.competences.filter((c) => c.domaine === dom).map((c) => `<div class="ligne" style="justify-content:space-between;padding:.25rem 0;border-bottom:1px dashed var(--bord)">
              <span>${e(c.libelle)}</span><span class="app-choix" data-c="${c.id}" data-v-cur="${val[`${x.inscription_id}:${c.id}`] || ''}">
              ${['A', 'EC', 'NA'].map((n) => `<button type="button" data-v="${n}" class="${val[`${x.inscription_id}:${c.id}`] === n ? 'on' : ''}">${n}</button>`).join('')}</span></div>`).join('')}`).join('')}
          ${`<input data-obs="${x.inscription_id}" value="${e(d.observations[x.inscription_id] || '')}" placeholder="Observation de l'enseignant(e)" style="margin-top:.6rem">`}
        </div>`).join('')}
        <div class="barre-action"><button class="btn" id="enreg">💾 Enregistrer</button></div>`;
      zone.querySelectorAll('.app-choix').forEach((g) => {
        g.querySelectorAll('button').forEach((b) => {
          b.onclick = () => {
            modifie = true;
            const nouveau = g.dataset.vCur === b.dataset.v ? '' : b.dataset.v;
            g.dataset.vCur = nouveau;
            g.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.v === nouveau));
          };
        });
      });
      zone.querySelector('#enreg').onclick = async () => {
        const appreciations = [];
        zone.querySelectorAll('[data-eleve]').forEach((carte) => carte.querySelectorAll('.app-choix').forEach((g) => {
          appreciations.push({ inscription_id: Number(carte.dataset.eleve), competence_id: Number(g.dataset.c), niveau: g.dataset.vCur || null });
        }));
        try {
          await post('/notes/saisie', {
            classe_id: etat.classe_id, periode: etat.periode, appreciations,
            observations: [...zone.querySelectorAll('input[data-obs]')].map((i) => ({ inscription_id: Number(i.dataset.obs), texte: i.value.trim() })),
          });
          modifie = false;
          toast('Appréciations enregistrées ✔', 'succes');
        } catch (err) { erreur(err); }
      };
    }
    zone.querySelectorAll('input[data-obs]').forEach((i) => { i.addEventListener('input', () => { modifie = true; }); });
  };
  const changer = (cle) => (ev) => {
    if (modifie && !confirm('Des modifications ne sont pas enregistrées. Continuer quand même ?')) { ev.target.value = etat[cle]; return; }
    etat[cle] = ev.target.value; charger();
  };
  el.querySelector('#classe').onchange = changer('classe_id');
  el.querySelector('#periode').onchange = changer('periode');
  await charger();
}
