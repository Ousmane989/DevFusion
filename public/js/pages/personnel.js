// Personnel (enseignants, employés) et suivi des salaires versés.
import { get, post, put, del, e, options, champ, champTel, activerTels, formulaire, tableau, argent, nomMois, dateFr, aujourdhui, moisCourant, MODES, toast, confirmer, boutonsExport, activerExports, badge, erreur } from '../ui.js';

const POSTES = ['Enseignant', 'Enseignante maternelle', 'Directeur', 'Secrétaire', 'Comptable', 'Surveillant', 'Gardien', 'Agent d\'entretien', 'Cuisinier', 'Chauffeur', 'Autre'];

export async function afficher(el, params) {
  el.innerHTML = `<div class="entete-page"><h1>Personnel & salaires</h1></div>
    <div class="onglets"><button data-o="liste">👩‍🏫 Personnel</button><button data-o="salaires">💵 Salaires</button></div><div id="zone"></div>`;
  const zone = el.querySelector('#zone');

  const fiche = (p = {}) => `<div class="grille g2">
      ${champ('Nom', `<input name="nom" required value="${e(p.nom)}" style="text-transform:uppercase">`, { requis: true })}
      ${champ('Prénom', `<input name="prenom" required value="${e(p.prenom)}">`, { requis: true })}
      ${champ('Sexe', `<select name="sexe">${options([['F', 'Femme'], ['M', 'Homme']], p.sexe, { vide: '—' })}</select>`)}
      ${champ('Téléphone', champTel('telephone', p.telephone))}
      ${champ('Poste', `<select name="poste">${options(POSTES.map((x) => [x, x]), p.poste || 'Enseignant')}</select>`)}
      ${champ('Salaire mensuel', `<input type="number" min="0" step="any" name="salaire_base" value="${p.salaire_base ?? ''}">`)}
      ${champ('Date d\'embauche', `<input type="date" name="date_embauche" value="${e(p.date_embauche)}">`)}
    </div>${champ('Remarques', `<textarea name="remarques" rows="2">${e(p.remarques)}</textarea>`)}
    ${p.id ? `<label class="case"><input type="checkbox" name="actif" ${p.actif ? 'checked' : ''}> Toujours en poste</label>` : ''}`;

  const vues = {
    async liste() {
      const liste = await get('/personnel?tous=1');
      zone.innerHTML = `<div class="ligne" style="margin-bottom:.8rem"><button class="btn" id="ajout">＋ Ajouter une personne</button><span class="espace"></span><span id="exp">${boutonsExport('personnel')}</span></div>
        ${tableau([
    { titre: 'Nom', rendu: (p) => `<b>${e(p.prenom)} ${e(p.nom)}</b>${p.actif ? '' : ' ' + badge('neutre', 'Parti')}` },
    { titre: 'Poste', rendu: (p) => e(p.poste) },
    { titre: 'Téléphone', rendu: (p) => (p.telephone ? `<a href="tel:${e(p.telephone)}">${e(p.telephone)}</a>` : '—') },
    { titre: 'Classe(s)', rendu: (p) => e(p.classes || '—') },
    { titre: 'Salaire', classe: 'num', rendu: (p) => argent(p.salaire_base) },
    { titre: 'Compte', rendu: (p) => (p.compte ? badge('ok', p.compte) : '<a href="#/utilisateurs" class="petit">Créer un accès</a>') },
    { titre: '', rendu: (p) => `<button class="btn petit clair" data-modif="${p.id}">✏️</button>` },
  ], liste, { vide: 'Aucun membre du personnel.' })}`;
      activerExports(zone.querySelector('#exp'));
      const enreg = (id) => async (d) => {
        if (id) await put(`/personnel/${id}`, d); else await post('/personnel', d);
        toast('Enregistré.', 'succes'); vues.liste();
      };
      zone.querySelector('#ajout').onclick = () => { const m = formulaire('Nouvelle personne', fiche(), enreg()); activerTels(m.el); };
      zone.querySelectorAll('[data-modif]').forEach((b) => {
        const p = liste.find((x) => String(x.id) === b.dataset.modif);
        b.onclick = () => { const m = formulaire(`${p.prenom} ${p.nom}`, fiche(p), enreg(p.id)); activerTels(m.el); };
      });
    },

    async salaires() {
      const mois = zone.dataset.mois || moisCourant();
      const d = await get(`/personnel/salaires?mois=${mois}`);
      const optMois = Array.from({ length: 14 }, (_, i) => { const t = new Date(); t.setDate(1); t.setMonth(t.getMonth() - 11 + i); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`; });
      const totalDu = d.personnel.reduce((s, p) => s + p.salaire_base, 0);
      const totalVerse = d.personnel.reduce((s, p) => s + p.verse, 0);
      zone.innerHTML = `<div class="filtres"><select id="mois">${options(optMois.map((m) => [m, nomMois(m)]), mois)}</select></div>
        <div class="alerte info">Salaires de ${e(nomMois(mois))} : <b>${argent(totalVerse)}</b> versés sur ${argent(totalDu)} prévus.</div>
        ${tableau([
    { titre: 'Nom', rendu: (p) => `<b>${e(p.prenom)} ${e(p.nom)}</b><div class="petit muted">${e(p.poste)}</div>` },
    { titre: 'Salaire prévu', classe: 'num', rendu: (p) => argent(p.salaire_base) },
    { titre: 'Versé', classe: 'num', rendu: (p) => argent(p.verse) },
    { titre: 'Statut', rendu: (p) => badge(p.verse >= p.salaire_base && p.verse > 0 ? 'paye' : p.verse > 0 ? 'partiel' : 'impaye') },
    { titre: '', rendu: (p) => (p.verse < p.salaire_base || !p.salaire_base ? `<button class="btn petit" data-payer="${p.id}">Payer</button>` : '') },
  ], d.personnel, { vide: 'Aucun membre du personnel actif.' })}
        <div class="carte" style="margin-top:1rem"><h2>Historique des versements</h2>${tableau([
    { titre: 'Date', rendu: (s) => dateFr(s.date_paiement) },
    { titre: 'Nom', rendu: (s) => `${e(s.prenom)} ${e(s.nom)}` },
    { titre: 'Mois', rendu: (s) => e(nomMois(s.mois)) },
    { titre: 'Montant', classe: 'num', rendu: (s) => argent(s.montant) },
    { titre: 'Mode', rendu: (s) => e(MODES[s.mode] || s.mode) },
    { titre: '', rendu: (s) => `<button class="btn petit clair" data-suppr="${s.id}">🗑️</button>` },
  ], d.historique, { vide: 'Aucun salaire versé.' })}</div>`;
      zone.querySelector('#mois').onchange = (ev) => { zone.dataset.mois = ev.target.value; vues.salaires(); };
      zone.querySelectorAll('[data-payer]').forEach((b) => {
        const p = d.personnel.find((x) => String(x.id) === b.dataset.payer);
        b.onclick = () => formulaire(`Salaire de ${p.prenom} ${p.nom}`,
          `<div class="grille g2">${champ('Mois', `<select name="mois">${options(optMois.map((m) => [m, nomMois(m)]), mois)}</select>`)}
          ${champ('Montant', `<input type="number" name="montant" min="1" step="any" required value="${Math.max(0, p.salaire_base - p.verse) || ''}">`, { requis: true })}
          ${champ('Date', `<input type="date" name="date_paiement" value="${aujourdhui()}">`)}
          ${champ('Mode', `<select name="mode">${options(Object.entries(MODES), 'especes')}</select>`)}</div>
          ${champ('Remarque', '<input name="remarque" placeholder="Ex. avance, prime…">')}`,
          async (f) => { await post('/personnel/salaires', { ...f, personnel_id: p.id }); toast('Salaire enregistré.', 'succes'); vues.salaires(); });
      });
      zone.querySelectorAll('[data-suppr]').forEach((b) => {
        b.onclick = async () => { if (await confirmer('Supprimer ce versement ?', { danger: true, ok: 'Supprimer' })) { await del(`/personnel/salaires/${b.dataset.suppr}`); vues.salaires(); } };
      });
    },
  };
  const montrer = (nom) => {
    el.querySelectorAll('[data-o]').forEach((b) => b.classList.toggle('actif', b.dataset.o === nom));
    vues[nom]().catch(erreur);
  };
  el.querySelectorAll('[data-o]').forEach((b) => { b.onclick = () => montrer(b.dataset.o); });
  montrer(params.onglet === 'salaires' ? 'salaires' : 'liste');
}
