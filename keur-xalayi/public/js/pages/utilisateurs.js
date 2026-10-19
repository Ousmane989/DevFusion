// Comptes utilisateurs (réservé à la directrice) et demandes de comptes des enseignants.
import { get, post, put, del, e, options, champ, formulaire, tableau, dateHeure, badge, ROLES, toast, confirmer, erreur, ctx } from '../ui.js';

export async function afficher(el) {
  const [tous, personnel, classes] = await Promise.all([get('/utilisateurs'), get('/personnel'), get('/classes')]);
  const demandes = tous.filter((u) => u.en_attente);
  const users = tous.filter((u) => !u.en_attente);
  const optPers = personnel.map((p) => [p.id, `${p.prenom} ${p.nom} — ${p.poste}`]);
  el.innerHTML = `<div class="entete-page"><h1>Utilisateurs</h1><button class="btn" id="ajout">＋ Nouveau compte</button></div>
    <div class="alerte info"><div>Deux espaces : <b>Espace Directrice</b> — accès complet (inscriptions, paiements, messages, finances, réglages) ·
      <b>Espace Enseignants</b> — uniquement sa classe (appel, notes, bulletins, emploi du temps). Les enseignants créent eux-mêmes leur compte depuis la page de connexion ; vous le validez ici.</div></div>
    ${demandes.length ? `<div class="carte" style="border-color:var(--primaire);margin-bottom:1rem"><h2>👩‍🏫 Demandes de comptes enseignants (${demandes.length})</h2>
      <ul class="liste">${demandes.map((u) => `<li data-demande="${u.id}">
        <span class="avatar">${e((u.nom_complet.split(' ')[0] || '')[0] || '')}${e((u.nom_complet.split(' ')[1] || '')[0] || '')}</span>
        <div class="principal"><b>${e(u.nom_complet)}</b>
          <span class="petit muted">Identifiant <code>${e(u.identifiant)}</code> · ${e(u.telephone || '')} · demandé le ${dateHeure(u.created_at)}</span>
          <span class="petit">Classe demandée : <b>${e(u.classe_demandee_nom || '—')}</b>${u.titulaire_actuel ? ` <span class="badge attention">remplacera ${e(u.titulaire_actuel)} comme titulaire</span>` : ''}</span></div>
        <div class="ligne"><button class="btn petit" data-valider="${u.id}">✔ Valider</button><button class="btn petit clair" data-refuser="${u.id}">✖ Refuser</button></div>
      </li>`).join('')}</ul></div>` : ''}
    ${tableau([
    { titre: 'Nom', rendu: (u) => `<b>${e(u.nom_complet)}</b>${u.classes ? `<div class="petit muted">Classe : ${e(u.classes)}</div>` : ''}` },
    { titre: 'Identifiant', rendu: (u) => `<code>${e(u.identifiant)}</code>` },
    { titre: 'Espace', rendu: (u) => badge(u.role === 'directeur' ? 'info' : 'ok', ROLES[u.role] || u.role) },
    { titre: 'État', rendu: (u) => (u.actif ? badge('ok', 'Actif') : badge('neutre', 'Désactivé')) },
    { titre: 'Dernière connexion', rendu: (u) => (u.derniere_connexion ? dateHeure(u.derniere_connexion) : '—') },
    { titre: '', rendu: (u) => `<button class="btn petit clair" data-modif="${u.id}">✏️ Modifier</button>
      ${u.id !== ctx.utilisateur.id ? `<button class="btn petit clair" data-suppr="${u.id}" title="Supprimer le compte">🗑️</button>` : ''}` },
  ], users)}`;

  const champsCommuns = (u = {}) => `
    ${champ('Nom complet', `<input name="nom_complet" required value="${e(u.nom_complet)}">`, { requis: true })}
    ${champ('Espace', `<select name="role" id="role">${options(Object.entries(ROLES), u.role || 'enseignant')}</select>`)}
    <div id="z-pers">${champ('Fiche du personnel', `<select name="personnel_id">${options(optPers, u.personnel_id, { vide: '— Aucune —' })}</select>`, { aide: 'Obligatoire pour un enseignant.' })}</div>`;
  const lierRole = (m) => {
    const r = m.el.querySelector('#role'); const z = m.el.querySelector('#z-pers');
    const maj = () => z.classList.toggle('cache', r.value === 'directeur'); r.onchange = maj; maj();
  };

  el.querySelector('#ajout').onclick = () => lierRole(formulaire('Nouveau compte', `
    ${champ('Identifiant de connexion', '<input name="identifiant" required autocapitalize="none" placeholder="ex. fatou.diallo">', { requis: true })}
    ${champ('Mot de passe', '<input name="mot_de_passe" required minlength="6" autocomplete="new-password">', { requis: true, aide: '6 caractères minimum. Communiquez-le à la personne.' })}
    ${champsCommuns()}`, async (d) => { await post('/utilisateurs', d); toast('Compte créé.', 'succes'); afficher(el); }));

  // Validation d'une demande : la classe demandée est proposée, modifiable.
  el.querySelectorAll('[data-valider]').forEach((b) => {
    const u = demandes.find((x) => String(x.id) === b.dataset.valider);
    b.onclick = () => formulaire(`Valider le compte de ${u.nom_complet}`,
      `<p>${e(u.nom_complet)} pourra se connecter dans l'<b>Espace Enseignants</b> et verra uniquement les élèves de sa classe.</p>
      ${champ('Classe', `<select name="classe_id">${options(classes.map((c) => [c.id, `${c.nom}${c.enseignant ? ` — titulaire actuel : ${c.enseignant}` : ''}`]), u.classe_demandee)}</select>`, { aide: 'Classe demandée par l\'enseignant ; vous pouvez la changer.' })}`,
      async (d) => { await post(`/utilisateurs/${u.id}/valider`, d); toast('Compte validé : l\'enseignant peut se connecter.', 'succes'); afficher(el); }, { ok: '✔ Valider le compte' });
  });
  el.querySelectorAll('[data-refuser]').forEach((b) => {
    const u = demandes.find((x) => String(x.id) === b.dataset.refuser);
    b.onclick = async () => {
      if (!(await confirmer(`Refuser la demande de ${u.nom_complet} ? Le compte ne sera pas créé.`, { titre: 'Refuser la demande', ok: 'Refuser', danger: true }))) return;
      try { await post(`/utilisateurs/${u.id}/refuser`); toast('Demande refusée.'); afficher(el); } catch (err) { erreur(err); }
    };
  });

  el.querySelectorAll('[data-suppr]').forEach((b) => {
    const u = users.find((x) => String(x.id) === b.dataset.suppr);
    b.onclick = async () => {
      if (!(await confirmer(`Supprimer définitivement le compte « ${u.identifiant} » (${u.nom_complet}) ? Les paiements et notes saisis restent enregistrés. Pour un départ temporaire, préférez « Modifier » puis décocher « Compte actif ».`, { titre: 'Supprimer le compte', ok: 'Supprimer', danger: true }))) return;
      try { await del(`/utilisateurs/${u.id}`); toast('Compte supprimé.', 'succes'); afficher(el); } catch (err) { erreur(err); }
    };
  });

  el.querySelectorAll('[data-modif]').forEach((b) => {
    const u = users.find((x) => String(x.id) === b.dataset.modif);
    b.onclick = () => lierRole(formulaire(`Compte « ${u.identifiant} »`, `${champsCommuns(u)}
      <label class="case"><input type="checkbox" name="actif" ${u.actif ? 'checked' : ''}> Compte actif (peut se connecter)</label>
      ${champ('Nouveau mot de passe', '<input name="mot_de_passe" minlength="6" autocomplete="new-password" placeholder="Laisser vide pour ne pas changer">')}`,
    async (d) => { if (!d.mot_de_passe) delete d.mot_de_passe; await put(`/utilisateurs/${u.id}`, d); toast('Compte modifié.', 'succes'); afficher(el); }));
  });
}
