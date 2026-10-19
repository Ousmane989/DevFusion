// Faire l'appel : pensé pour le téléphone de l'enseignant (gros boutons P / A / R).
import { get, post, e, options, avatar, aujourdhui, dateLongue, toast, erreur, resultatEnvoi, ctx } from '../ui.js';

export async function afficher(el, params) {
  const classes = await get('/classes');
  if (!classes.length) {
    el.innerHTML = `<div class="carte vide"><span class="ico">🏫</span>${ctx.utilisateur.role === 'enseignant' ? 'Aucune classe ne vous est attribuée. Contactez la direction.' : 'Aucune classe.'}</div>`;
    return;
  }
  const etat = { classe_id: params.classe_id || classes[0].id, date: params.date || aujourdhui() };
  el.innerHTML = `
    <div class="filtres">
      <select id="classe">${options(classes.map((c) => [c.id, `${c.nom} (${c.effectif})`]), etat.classe_id)}</select>
      <input type="date" id="date" value="${etat.date}" max="${aujourdhui()}">
    </div>
    <div id="zone"></div>`;

  const charger = async () => {
    const d = await get(`/presences/appel?classe_id=${etat.classe_id}&date=${etat.date}`);
    const statuts = Object.fromEntries(d.eleves.map((x) => [x.inscription_id, x.statut || 'present']));
    const zone = el.querySelector('#zone');
    zone.innerHTML = `
      <div class="ligne" style="margin-bottom:.7rem"><h2 style="margin:0;flex:1">${e(dateLongue(d.date))}</h2>
        ${d.deja_fait ? '<span class="badge ok">Appel déjà fait — vous pouvez le corriger</span>' : '<span class="badge attention">Appel à faire</span>'}</div>
      <div class="ligne petit muted" style="margin-bottom:.6rem">Touchez <b>P</b> (présent), <b>A</b> (absent) ou <b>R</b> (retard). Tous les élèves sont présents par défaut.</div>
      <div class="appel-liste">${d.eleves.map((x) => `
        <div class="appel-eleve" data-i="${x.inscription_id}">
          ${avatar(x)}
          <div class="nom">${e(x.prenom)} ${e(x.nom)}${x.remarques ? `<small>⚠ ${e(x.remarques.slice(0, 50))}</small>` : ''}</div>
          <div class="choix-statut">
            <button type="button" data-s="present" class="present" aria-label="Présent">P</button>
            <button type="button" data-s="absent" class="absent" aria-label="Absent">A</button>
            <button type="button" data-s="retard" class="retard" aria-label="Retard">R</button>
          </div>
        </div>`).join('') || '<div class="carte vide">Aucun élève dans cette classe.</div>'}</div>
      <div class="barre-action">
        <div class="gras" id="compte" style="flex-basis:100%"></div>
        <button class="btn" id="enreg">💾 Enregistrer l'appel</button>
        <button class="btn vert" id="enreg-notif">💾 Enregistrer et prévenir les parents</button>
      </div>`;

    const maj = () => {
      zone.querySelectorAll('.appel-eleve').forEach((ligne) => {
        const s = statuts[ligne.dataset.i];
        ligne.querySelectorAll('[data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === s));
      });
      const v = Object.values(statuts);
      zone.querySelector('#compte').textContent = `${v.filter((s) => s === 'present').length} présent(s) · ${v.filter((s) => s === 'absent').length} absent(s) · ${v.filter((s) => s === 'retard').length} retard(s)`;
    };
    zone.querySelectorAll('.appel-eleve').forEach((ligne) => {
      ligne.querySelectorAll('[data-s]').forEach((b) => { b.onclick = () => { statuts[ligne.dataset.i] = b.dataset.s; maj(); }; });
    });
    maj();

    const enregistrer = async (notifier) => {
      try {
        const r = await post('/presences/appel', {
          classe_id: etat.classe_id, date: etat.date, notifier,
          presences: Object.entries(statuts).map(([inscription_id, statut]) => ({ inscription_id: Number(inscription_id), statut })),
        });
        toast('Appel enregistré ✔', 'succes');
        if (r.messages && r.messages.length) resultatEnvoi(r.messages, 'Prévenir les parents');
        else if (notifier) toast('Aucun nouveau parent à prévenir.');
        charger();
      } catch (err) { erreur(err); }
    };
    zone.querySelector('#enreg').onclick = () => enregistrer(false);
    const n = zone.querySelector('#enreg-notif');
    if (n) n.onclick = () => enregistrer(true);
  };
  el.querySelector('#classe').onchange = (ev) => { etat.classe_id = ev.target.value; charger(); };
  el.querySelector('#date').onchange = (ev) => { etat.date = ev.target.value; charger(); };
  await charger();
}
