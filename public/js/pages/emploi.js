// Emploi du temps par classe (du lundi au samedi).
import { get, post, del, e, options, champ, formulaire, JOURS, estRole, toast, confirmer } from '../ui.js';

export async function afficher(el, params) {
  const classes = await get('/classes');
  if (!classes.length) { el.innerHTML = '<div class="carte vide">Aucune classe.</div>'; return; }
  const modif = estRole('directeur');
  let classeId = params.classe_id || classes[0].id;
  el.innerHTML = `<div class="filtres"><select id="classe">${options(classes.map((c) => [c.id, c.nom]), classeId)}</select></div>
    <div class="ligne" style="margin-bottom:1rem">${modif ? '<button class="btn" id="ajout">＋ Ajouter un cours</button>' : ''}<button class="btn clair" onclick="window.print()">🖨️ Imprimer</button></div>
    <div id="zone"></div>`;

  const charger = async () => {
    const creneaux = await get(`/classes/${classeId}/emploi`);
    const zone = el.querySelector('#zone');
    zone.innerHTML = `<h2 class="seul-impression">${e(classes.find((c) => String(c.id) === String(classeId)).nom)}</h2><div class="edt">${JOURS.map((j, i) => {
      const du = creneaux.filter((c) => c.jour === i + 1);
      return `<div class="jour"><h3>${j}</h3>${du.map((c) => `<div class="creneau"><b>${e(c.heure_debut.slice(0, 5))} – ${e(c.heure_fin.slice(0, 5))}</b>${e(c.matiere)}
        ${c.intervenant ? `<div class="petit muted">${e(c.intervenant)}</div>` : ''}${modif ? `<button class="suppr" data-suppr="${c.id}" title="Supprimer">×</button>` : ''}</div>`).join('') || '<p class="petit muted">—</p>'}</div>`;
    }).join('')}</div>`;
    zone.querySelectorAll('[data-suppr]').forEach((b) => {
      b.onclick = async () => { if (await confirmer('Supprimer ce cours ?', { ok: 'Supprimer', danger: true })) { await del(`/classes/${classeId}/emploi/${b.dataset.suppr}`); charger(); } };
    });
  };
  el.querySelector('#classe').onchange = (ev) => { classeId = ev.target.value; charger(); };
  const aj = el.querySelector('#ajout');
  if (aj) {
    aj.onclick = () => formulaire('Ajouter un cours', `
      ${champ('Jour(s)', `<div class="grille g3" style="gap:.2rem">${JOURS.map((j, i) => `<label class="case"><input type="checkbox" name="jours" data-multiple value="${i + 1}"> ${j}</label>`).join('')}</div>`, { requis: true, aide: 'Cochez plusieurs jours pour répéter le cours.' })}
      <div class="grille g2">${champ('Début', '<input type="time" name="heure_debut" required value="08:00">', { requis: true })}${champ('Fin', '<input type="time" name="heure_fin" required value="09:00">', { requis: true })}</div>
      ${champ('Matière / activité', '<input name="matiere" required list="matieres" placeholder="Ex. Français, Récréation…">', { requis: true })}
      <datalist id="matieres">${['Français', 'Mathématiques', 'Arabe', 'Éducation islamique', 'Sciences', 'Histoire-Géographie', 'Anglais', 'Dessin', 'Sport', 'Récréation', 'Lecture', 'Écriture', 'Chant', 'Jeux éducatifs'].map((m) => `<option value="${m}">`).join('')}</datalist>
      ${champ('Intervenant', '<input name="intervenant" placeholder="Facultatif">')}`,
    async (f) => {
      if (!f.jours.length) throw new Error('Choisissez au moins un jour.');
      if (f.heure_fin <= f.heure_debut) throw new Error('L\'heure de fin doit être après l\'heure de début.');
      for (const jour of f.jours) await post(`/classes/${classeId}/emploi`, { ...f, jour: Number(jour) });
      toast('Cours ajouté.', 'succes'); charger();
    });
  }
  await charger();
}
