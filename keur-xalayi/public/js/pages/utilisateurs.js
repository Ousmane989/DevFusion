// Comptes utilisateurs et rôles (réservé au directeur).
import { get, post, put, e, options, champ, formulaire, tableau, dateHeure, badge, ROLES, toast } from '../ui.js';

export async function afficher(el) {
  const [users, personnel] = await Promise.all([get('/utilisateurs'), get('/personnel')]);
  const optPers = personnel.map((p) => [p.id, `${p.prenom} ${p.nom} — ${p.poste}`]);
  el.innerHTML = `<div class="entete-page"><h1>Utilisateurs</h1><button class="btn" id="ajout">＋ Nouveau compte</button></div>
    <div class="alerte info"><div><b>Directeur</b> : accès total · <b>Secrétaire / Comptable</b> : inscriptions, paiements, messages ·
      <b>Enseignant</b> : uniquement sa classe (appel et notes). Un enseignant doit être lié à sa fiche du personnel, et désigné titulaire de la classe.</div></div>
    ${tableau([
    { titre: 'Nom', rendu: (u) => `<b>${e(u.nom_complet)}</b>${u.personnel ? `<div class="petit muted">${e(u.personnel)}</div>` : ''}` },
    { titre: 'Identifiant', rendu: (u) => `<code>${e(u.identifiant)}</code>` },
    { titre: 'Rôle', rendu: (u) => badge(u.role === 'directeur' ? 'ko' : u.role === 'secretaire' ? 'info' : 'ok', ROLES[u.role]) },
    { titre: 'État', rendu: (u) => (u.actif ? badge('ok', 'Actif') : badge('neutre', 'Désactivé')) },
    { titre: 'Dernière connexion', rendu: (u) => (u.derniere_connexion ? dateHeure(u.derniere_connexion) : '—') },
    { titre: '', rendu: (u) => `<button class="btn petit clair" data-modif="${u.id}">✏️ Modifier</button>` },
  ], users)}`;

  const champsCommuns = (u = {}) => `
    ${champ('Nom complet', `<input name="nom_complet" required value="${e(u.nom_complet)}">`, { requis: true })}
    ${champ('Rôle', `<select name="role" id="role">${options(Object.entries(ROLES), u.role || 'enseignant')}</select>`)}
    <div id="z-pers">${champ('Fiche du personnel', `<select name="personnel_id">${options(optPers, u.personnel_id, { vide: '— Aucune —' })}</select>`, { aide: 'Obligatoire pour un enseignant.' })}</div>`;
  const lierRole = (m) => {
    const r = m.el.querySelector('#role'); const z = m.el.querySelector('#z-pers');
    const maj = () => z.classList.toggle('cache', r.value === 'directeur'); r.onchange = maj; maj();
  };

  el.querySelector('#ajout').onclick = () => lierRole(formulaire('Nouveau compte', `
    ${champ('Identifiant de connexion', '<input name="identifiant" required autocapitalize="none" placeholder="ex. fatou.diallo">', { requis: true })}
    ${champ('Mot de passe', '<input name="mot_de_passe" required minlength="6" autocomplete="new-password">', { requis: true, aide: '6 caractères minimum. Communiquez-le à la personne.' })}
    ${champsCommuns()}`, async (d) => { await post('/utilisateurs', d); toast('Compte créé.', 'succes'); afficher(el); }));

  el.querySelectorAll('[data-modif]').forEach((b) => {
    const u = users.find((x) => String(x.id) === b.dataset.modif);
    b.onclick = () => lierRole(formulaire(`Compte « ${u.identifiant} »`, `${champsCommuns(u)}
      <label class="case"><input type="checkbox" name="actif" ${u.actif ? 'checked' : ''}> Compte actif (peut se connecter)</label>
      ${champ('Nouveau mot de passe', '<input name="mot_de_passe" minlength="6" autocomplete="new-password" placeholder="Laisser vide pour ne pas changer">')}`,
    async (d) => { if (!d.mot_de_passe) delete d.mot_de_passe; await put(`/utilisateurs/${u.id}`, d); toast('Compte modifié.', 'succes'); afficher(el); }));
  });
}
