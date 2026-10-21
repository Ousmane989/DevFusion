// Calendrier scolaire : vacances, examens, événements, jours fériés, réunions.
import { get, post, put, del, e, options, champ, formulaire, dateFr, estRole, toast, confirmer, MOIS, aujourdhui, tableau } from '../ui.js';

const TYPES = { vacances: 'Vacances', examen: 'Examen / composition', evenement: 'Événement', ferie: 'Jour férié', reunion: 'Réunion' };

export async function afficher(el) {
  const modif = estRole('directeur');
  const d0 = new Date();
  let annee = d0.getFullYear(); let mois = d0.getMonth();
  el.innerHTML = `<div class="entete-page"><h1>Calendrier scolaire</h1>${modif ? '<button class="btn" id="ajout">＋ Ajouter</button>' : ''}</div>
    <div class="carte"><div class="ligne" style="margin-bottom:.8rem"><button class="btn clair petit" id="prec">◀</button>
      <h2 id="titre-mois" style="margin:0;flex:1;text-align:center"></h2><button class="btn clair petit" id="suiv">▶</button></div>
      <div id="cal"></div>
      <div class="legende">${Object.entries(TYPES).map(([k, v]) => `<span><i class="ev ${k}"></i>${v}</span>`).join('')}</div></div>
    <div class="carte"><h2>Tous les événements</h2><div id="liste"></div></div>`;

  let evenements = [];
  const fiche = (v = {}) => `${champ('Titre', `<input name="titre" required value="${e(v.titre)}" placeholder="Ex. Vacances de Noël">`, { requis: true })}
    ${champ('Type', `<select name="type">${options(Object.entries(TYPES), v.type || 'evenement')}</select>`)}
    <div class="grille g2">${champ('Du', `<input type="date" name="date_debut" required value="${e(v.date_debut || aujourdhui())}">`, { requis: true })}
    ${champ('Au', `<input type="date" name="date_fin" value="${e(v.date_fin || '')}">`, { aide: 'Laisser vide pour un seul jour.' })}</div>
    ${champ('Description', `<textarea name="description" rows="2">${e(v.description)}</textarea>`)}`;
  const enreg = (id) => async (f) => {
    if (f.date_fin && f.date_fin < f.date_debut) throw new Error('La date de fin est avant la date de début.');
    if (id) await put(`/calendrier/${id}`, f); else await post('/calendrier', f); toast('Enregistré.', 'succes'); charger(); };
  const ouvrir = (v) => {
    if (!modif) return;
    const m = formulaire(v.titre, fiche(v), enreg(v.id));
    const footer = m.el.querySelector('footer');
    const b = document.createElement('button');
    b.className = 'btn danger'; b.textContent = 'Supprimer'; b.style.marginRight = 'auto';
    b.onclick = async () => { if (await confirmer('Supprimer cet événement ?', { danger: true, ok: 'Supprimer' })) { await del(`/calendrier/${v.id}`); m.fermer(); charger(); } };
    footer.prepend(b);
  };

  const dessiner = () => {
    el.querySelector('#titre-mois').textContent = `${MOIS[mois][0].toUpperCase()}${MOIS[mois].slice(1)} ${annee}`;
    const premier = new Date(annee, mois, 1);
    const decalage = (premier.getDay() + 6) % 7; // lundi = 0
    const debut = new Date(annee, mois, 1 - decalage);
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let html = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((j) => `<div class="jn">${j}</div>`).join('');
    for (let i = 0; i < 42; i++) {
      const d = new Date(debut); d.setDate(debut.getDate() + i);
      const j = iso(d);
      const evs = evenements.filter((v) => v.date_debut <= j && v.date_fin >= j);
      html += `<div class="j ${d.getMonth() !== mois ? 'hors' : ''} ${j === aujourdhui() ? 'auj' : ''}"><div class="n">${d.getDate()}</div>
        ${evs.map((v) => `<span class="ev ${v.type}" title="${e(v.titre)}" data-ev="${v.id}">${e(v.titre)}</span>`).join('')}</div>`;
      if (i === 34 && d.getMonth() !== mois) break;
    }
    const cal = el.querySelector('#cal');
    cal.innerHTML = `<div class="cal">${html}</div>`;
    cal.querySelectorAll('[data-ev]').forEach((s) => { s.onclick = () => ouvrir(evenements.find((v) => String(v.id) === s.dataset.ev)); });
  };
  const charger = async () => {
    evenements = await get('/calendrier');
    dessiner();
    const liste = el.querySelector('#liste');
    liste.innerHTML = tableau([
      { titre: 'Dates', rendu: (v) => `${dateFr(v.date_debut)}${v.date_fin !== v.date_debut ? ' → ' + dateFr(v.date_fin) : ''}` },
      { titre: 'Événement', rendu: (v) => `<b>${e(v.titre)}</b>${v.description ? `<div class="petit muted">${e(v.description)}</div>` : ''}` },
      { titre: 'Type', rendu: (v) => `<span class="ev ${v.type}" style="display:inline-block;padding:.1rem .5rem;border-radius:6px">${e(TYPES[v.type])}</span>` },
    ], evenements, { vide: 'Aucun événement enregistré.', clic: modif });
    liste.querySelectorAll('tr.cliquable').forEach((tr) => { tr.onclick = () => ouvrir(evenements[tr.dataset.i]); });
  };
  el.querySelector('#prec').onclick = () => { mois--; if (mois < 0) { mois = 11; annee--; } dessiner(); };
  el.querySelector('#suiv').onclick = () => { mois++; if (mois > 11) { mois = 0; annee++; } dessiner(); };
  const aj = el.querySelector('#ajout');
  if (aj) aj.onclick = () => formulaire('Nouvel événement', fiche(), enreg());
  await charger();
}
