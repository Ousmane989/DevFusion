// Classes de l'année : effectifs, titulaires, tarifs, création de groupes.
import { get, post, put, del, e, argent, estRole, champ, options, formulaire, confirmer, toast, kpi } from '../ui.js';

export async function afficher(el) {
  const directeur = estRole('directeur');
  const [classes, niveaux, personnel] = await Promise.all([
    get('/classes'), get('/parametres/niveaux'), directeur ? get('/personnel') : [],
  ]);
  const total = classes.reduce((s, c) => s + c.effectif, 0);

  el.innerHTML = `
    <div class="entete-page"><h1>Classes</h1>
      ${directeur ? '<button class="btn" id="ajout">＋ Créer un groupe</button>' : ''}</div>
    <div class="grille g4" style="margin-bottom:1rem">
      ${kpi('Classes', classes.length, '', 'var(--secondaire)')}
      ${kpi('Élèves', total, `${classes.reduce((s, c) => s + c.garcons, 0)} garçons · ${classes.reduce((s, c) => s + c.filles, 0)} filles`)}
      ${kpi('Moyenne par classe', classes.length ? Math.round(total / classes.length) : 0, 'élèves', 'var(--primaire)')}
      ${kpi('Sans titulaire', classes.filter((c) => !c.enseignant_id).length, 'classe(s)', 'var(--danger)')}
    </div>
    <div class="grille g3">
      ${classes.map((c) => `
        <div class="carte">
          <div class="ligne"><h2 style="flex:1;margin:0"><a href="#/classes/${c.id}" style="text-decoration:none;color:inherit">${e(c.nom)}</a></h2>
            <span class="badge ${c.cycle === 'maternelle' ? 'attention' : 'info'}">${c.cycle === 'maternelle' ? 'Maternelle' : 'Primaire'}</span></div>
          <div style="font-size:2rem;font-weight:800;margin:.3rem 0">${c.effectif} <span class="petit muted" style="font-weight:600">élève(s)</span></div>
          <div class="petit muted">${c.garcons} garçons · ${c.filles} filles${c.salle ? ` · Salle ${e(c.salle)}` : ''}</div>
          <div style="margin:.5rem 0">👩‍🏫 ${c.enseignant ? e(c.enseignant) : '<span class="badge ko">Aucun titulaire</span>'}</div>
          ${estRole('directeur') ? `<div class="petit">Inscription : <b>${argent(c.frais_effectif)}</b> · Mensualité : <b>${argent(c.mensualite_effective)}</b>
            ${c.mensualite !== null || c.frais_inscription !== null ? ' <span class="badge neutre">tarif propre</span>' : ''}</div>` : ''}
          <div class="ligne" style="margin-top:.8rem">
            <a class="btn petit sec" href="#/classes/${c.id}">Ouvrir</a>
            ${directeur ? `<button class="btn petit clair" data-modif="${c.id}">✏️ Modifier</button>` : ''}
            ${directeur && !c.effectif ? `<button class="btn petit clair" data-suppr="${c.id}">🗑️</button>` : ''}
          </div>
        </div>`).join('')}
    </div>`;

  if (!directeur) return;
  const recharger = () => afficher(el);
  const optProfs = personnel.map((p) => [p.id, `${p.prenom} ${p.nom} (${p.poste})`]);

  el.querySelector('#ajout').onclick = () => formulaire('Créer un groupe',
    champ('Niveau', `<select name="niveau_id" required>${options(niveaux.map((n) => [n.id, n.nom]), '', { vide: '— Choisir —' })}</select>`, { requis: true })
    + champ('Groupe', '<input name="groupe" maxlength="3" placeholder="A, B, C…" style="text-transform:uppercase">', { aide: 'Ex. « B » crée la classe « CE1 B ». Pensez à renommer la classe existante en « A ».' })
    + champ('Enseignant titulaire', `<select name="enseignant_id">${options(optProfs, '', { vide: '— Aucun pour l\'instant —' })}</select>`)
    + champ('Salle', '<input name="salle">'),
    async (d) => { await post('/classes', d); toast('Classe créée.', 'succes'); recharger(); });

  el.querySelectorAll('[data-modif]').forEach((b) => {
    const c = classes.find((x) => String(x.id) === b.dataset.modif);
    b.onclick = () => formulaire(`Modifier ${c.nom}`,
      champ('Groupe', `<input name="groupe" maxlength="3" value="${e(c.groupe)}" style="text-transform:uppercase">`, { aide: 'Laisser vide s\'il n\'y a qu\'une classe pour ce niveau.' })
      + champ('Enseignant titulaire', `<select name="enseignant_id">${options(optProfs, c.enseignant_id, { vide: '— Aucun —' })}</select>`)
      + champ('Salle', `<input name="salle" value="${e(c.salle)}">`)
      + `<fieldset><legend>Tarifs propres à cette classe</legend><p class="petit muted">Laisser vide pour utiliser le tarif du niveau (${argent(c.frais_effectif)} / ${argent(c.mensualite_effective)}), réglable dans Paramètres.</p>
        <div class="grille g2">${champ('Frais d\'inscription', `<input type="number" min="0" step="any" name="frais_inscription" value="${c.frais_inscription ?? ''}">`)}
        ${champ('Mensualité', `<input type="number" min="0" step="any" name="mensualite" value="${c.mensualite ?? ''}">`)}</div>
        <label class="case"><input type="checkbox" name="appliquer_inscriptions"> Appliquer la nouvelle mensualité aux élèves déjà inscrits</label></fieldset>`,
      async (d) => { await put(`/classes/${c.id}`, d); toast('Classe modifiée.', 'succes'); recharger(); });
  });
  el.querySelectorAll('[data-suppr]').forEach((b) => {
    b.onclick = async () => { if (await confirmer('Supprimer cette classe vide ?', { danger: true, ok: 'Supprimer' })) { await del(`/classes/${b.dataset.suppr}`); recharger(); } };
  });
}
