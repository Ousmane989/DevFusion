// Détail d'une classe : liste des élèves, impressions, décisions de fin d'année.
import { get, put, e, avatar, dateFr, tableau, lignesCliquables, ouvrir, estRole, options, toast, erreur } from '../ui.js';

const DECISIONS = [['en_cours', 'En cours'], ['admis', 'Admis(e)'], ['redouble', 'Redouble'], ['parti', 'Quitte l\'école']];

export async function afficher(el, { id }) {
  const c = await get(`/classes/${id}`);
  const decisions = estRole('directeur', 'enseignant');
  el.innerHTML = `
    <div class="entete-page"><h1>${e(c.nom)}</h1>
      <span class="muted">${c.effectif} élève(s) · ${c.garcons} G / ${c.filles} F · 👩‍🏫 ${e(c.enseignant || 'sans titulaire')}</span></div>
    <div class="ligne" style="margin-bottom:1rem">
      <button class="btn clair" id="liste-pdf">🖨️ Liste de classe (PDF)</button>
      <button class="btn clair" id="liste-xlsx">⬇ Excel</button>
      <button class="btn clair" id="cartes">🪪 Cartes d'élève</button>
      ${estRole('directeur', 'enseignant') ? `<a class="btn sec" href="#/presences?classe_id=${c.id}">✅ Faire l'appel</a>` : ''}
      <a class="btn clair" href="#/emploi-du-temps?classe_id=${c.id}">🗓️ Emploi du temps</a>
      ${estRole('directeur', 'secretaire') ? `<a class="btn clair" href="#/impayes?classe_id=${c.id}">⏰ Impayés</a>` : ''}
    </div>
    <div id="liste"></div>
    ${decisions && c.eleves.length ? `<div class="carte" style="margin-top:1rem"><h2>🎓 Décisions de fin d'année</h2>
      <p class="muted petit">Indiquez pour chaque élève s'il passe en classe supérieure ou redouble. Le passage se fait ensuite depuis « Année scolaire ».</p>
      <div class="ligne" style="margin-bottom:.6rem"><button class="btn petit clair" id="tous-admis">Tous admis</button></div>
      ${tableau([
    { titre: 'Élève', rendu: (l) => `${e(l.prenom)} ${e(l.nom)}` },
    { titre: 'Décision', rendu: (l) => `<select data-dec="${l.inscription_id}" style="min-width:150px">${options(DECISIONS, l.decision)}</select>` },
  ], c.eleves)}
      <div class="ligne fin" style="margin-top:.8rem"><button class="btn" id="enreg-dec">💾 Enregistrer les décisions</button></div></div>` : ''}`;

  const zone = el.querySelector('#liste');
  zone.innerHTML = tableau([
    { titre: 'N°', rendu: (l) => c.eleves.indexOf(l) + 1 },
    { titre: 'Élève', rendu: (l) => `<div class="qui">${avatar({ ...l, eleve_id: l.id })}<div><b>${e(l.prenom)} ${e(l.nom)}</b><div class="petit muted">${e(l.matricule)}</div></div></div>` },
    { titre: 'Sexe', rendu: (l) => (l.sexe === 'M' ? 'G' : 'F') },
    { titre: 'Naissance', rendu: (l) => dateFr(l.date_naissance) || '—' },
    { titre: 'Parent', rendu: (l) => `${e(l.parent || '—')}<div class="petit"><a href="https://wa.me/${e(l.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">${e(l.whatsapp)}</a></div>` },
    { titre: 'Remarques', rendu: (l) => (l.remarques ? `<span class="badge attention">⚠ ${e(l.remarques.slice(0, 40))}</span>` : '') },
  ], c.eleves, { clic: true, vide: 'Aucun élève dans cette classe.' });
  lignesCliquables(zone, c.eleves, (l) => { location.hash = `#/eleves/${l.id}`; });

  el.querySelector('#liste-pdf').onclick = () => ouvrir(`/exports/classe.pdf?classe_id=${c.id}`);
  el.querySelector('#liste-xlsx').onclick = () => ouvrir(`/exports/classe.xlsx?classe_id=${c.id}`);
  el.querySelector('#cartes').onclick = () => ouvrir(`/exports/cartes.pdf?classe_id=${c.id}`);
  const ta = el.querySelector('#tous-admis');
  if (ta) ta.onclick = () => el.querySelectorAll('[data-dec]').forEach((s) => { if (s.value === 'en_cours') s.value = 'admis'; });
  const ed = el.querySelector('#enreg-dec');
  if (ed) {
    ed.onclick = async () => {
      try {
        await put('/annees/decisions', { decisions: [...el.querySelectorAll('[data-dec]')].map((s) => ({ inscription_id: Number(s.dataset.dec), decision: s.value })) });
        toast('Décisions enregistrées.', 'succes');
      } catch (err) { erreur(err); }
    };
  }
}
