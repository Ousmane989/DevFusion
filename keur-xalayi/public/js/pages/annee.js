// Années scolaires : création, activation, passage en classe supérieure.
import { get, post, put, e, champ, formulaire, tableau, dateFr, badge, toast, erreur, modale, confirmer } from '../ui.js';
import { rafraichirContexte } from '../app.js';

const ACTIONS = { passe: ['ok', 'Passe en'], redouble: ['attention', 'Redouble en'], fin_cycle: ['info', 'Fin de cycle (sortie)'], sortie: ['ko', 'Quitte l\'école'], deja_inscrit: ['neutre', 'Déjà inscrit'] };

export async function afficher(el) {
  const annees = await get('/annees');
  const active = annees.find((a) => a.active);
  const suivante = active && annees.find((a) => a.date_debut > active.date_debut);
  const proposition = active ? (() => {
    const a = Number(active.libelle.slice(0, 4)) + 1;
    return { libelle: `${a}-${a + 1}`, date_debut: `${a}${active.date_debut.slice(4)}`, date_fin: `${a + 1}${active.date_fin.slice(4)}` };
  })() : null;

  el.innerHTML = `
    <div class="entete-page"><h1>Année scolaire</h1><button class="btn clair" id="nouvelle">＋ Nouvelle année</button></div>
    <div class="carte">${tableau([
    { titre: 'Année', rendu: (a) => `<b>${e(a.libelle)}</b> ${a.active ? badge('ok', 'Active') : a.cloturee ? badge('neutre', 'Clôturée') : ''}` },
    { titre: 'Début', rendu: (a) => dateFr(a.date_debut) },
    { titre: 'Fin', rendu: (a) => dateFr(a.date_fin) },
    { titre: 'Inscrits', classe: 'num', rendu: (a) => a.nb_inscrits },
    { titre: '', rendu: (a) => `<button class="btn petit clair" data-modif="${a.id}">✏️ Dates</button>${!a.active ? ` <button class="btn petit clair" data-activer="${a.id}">Rendre active</button>` : ''}` },
  ], annees)}
    <p class="petit muted">L'année va par défaut d'octobre à juillet ; les dates sont modifiables. Les mensualités sont dues pour chaque mois compris entre ces dates.</p></div>

    <div class="carte"><h2>🎓 Fin d'année : passage en classe supérieure</h2>
      <ol>
        <li>Dans chaque classe, indiquez les décisions (admis, redouble, quitte l'école). Par défaut, tous les élèves sont admis.</li>
        <li>Créez l'année suivante (${proposition ? e(proposition.libelle) : '—'}) si ce n'est pas fait.</li>
        <li>Lancez le passage : les classes sont recopiées, chaque élève est réinscrit dans le niveau supérieur (même groupe), les CM2 admis sortent du cycle, et la nouvelle année devient active.</li>
      </ol>
      ${suivante ? `<button class="btn" id="apercu">👁 Préparer le passage vers ${e(suivante.libelle)}</button>`
    : '<div class="alerte attention">Créez d\'abord l\'année suivante.</div>'}
    </div>`;

  const fiche = (a = {}) => champ('Libellé', `<input name="libelle" required value="${e(a.libelle)}" placeholder="2027-2028">`, { requis: true })
    + `<div class="grille g2">${champ('Début', `<input type="date" name="date_debut" required value="${e(a.date_debut)}">`, { requis: true })}
    ${champ('Fin', `<input type="date" name="date_fin" required value="${e(a.date_fin)}">`, { requis: true })}</div>`;
  el.querySelector('#nouvelle').onclick = () => formulaire('Nouvelle année scolaire', fiche(proposition || {}),
    async (d) => { await post('/annees', d); toast('Année créée.', 'succes'); afficher(el); });
  el.querySelectorAll('[data-modif]').forEach((b) => {
    const a = annees.find((x) => String(x.id) === b.dataset.modif);
    b.onclick = () => formulaire(`Année ${a.libelle}`, fiche(a), async (d) => { await put(`/annees/${a.id}`, d); toast('Enregistré.', 'succes'); afficher(el); });
  });
  el.querySelectorAll('[data-activer]').forEach((b) => {
    b.onclick = async () => {
      if (!(await confirmer('Changer l\'année active ? Toutes les listes (classes, paiements, présences) basculeront sur cette année.'))) return;
      await post(`/annees/${b.dataset.activer}/activer`); await rafraichirContexte(); toast('Année activée.'); afficher(el);
    };
  });

  const ap = el.querySelector('#apercu');
  if (ap) {
    ap.onclick = async () => {
      try {
        const r = await post(`/annees/${suivante.id}/passage/apercu`);
        const compte = (k) => r.plan.filter((p) => p.action === k).length;
        const md = modale(`Passage ${r.source.libelle} → ${suivante.libelle}`, `
          <div class="grille g4" style="margin-bottom:1rem">
            <div class="kpi"><div class="lib">Passent</div><div class="val">${compte('passe')}</div></div>
            <div class="kpi"><div class="lib">Redoublent</div><div class="val">${compte('redouble')}</div></div>
            <div class="kpi"><div class="lib">Fin de cycle</div><div class="val">${compte('fin_cycle')}</div></div>
            <div class="kpi"><div class="lib">Quittent</div><div class="val">${compte('sortie')}</div></div>
          </div>
          ${tableau([
    { titre: 'Élève', rendu: (p) => `${e(p.prenom)} ${e(p.nom)}` },
    { titre: 'Classe actuelle', rendu: (p) => e(p.classe) },
    { titre: 'Résultat', rendu: (p) => `${badge(ACTIONS[p.action][0], ACTIONS[p.action][1])} ${p.classe_cible ? `<b>${e(p.classe_cible)}</b>` : ''}` },
  ], r.plan)}
          <label class="case" style="margin-top:1rem"><input type="checkbox" id="activer" checked> Rendre l'année ${e(suivante.libelle)} active immédiatement</label>`, {
          large: true, actions: '<button class="btn clair" data-f>Annuler</button><button class="btn" data-go>🎓 Lancer le passage</button>',
        });
        md.el.querySelector('[data-f]').onclick = md.fermer;
        md.el.querySelector('[data-go]').onclick = async (ev) => {
          ev.target.disabled = true;
          try {
            const res = await post(`/annees/${suivante.id}/passage`, { activer: md.el.querySelector('#activer').checked });
            md.fermer();
            await rafraichirContexte();
            toast(`Passage effectué : ${res.stats.passe} passent, ${res.stats.redouble} redoublent, ${res.stats.fin_cycle + res.stats.sortie} sortent.`, 'succes');
            afficher(el);
          } catch (err) { erreur(err); ev.target.disabled = false; }
        };
      } catch (err) { erreur(err); }
    };
  }
}
