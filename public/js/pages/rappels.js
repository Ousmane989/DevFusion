// Rappels de paiement WhatsApp : réglages, calendrier, envoi manuel avec aperçu.
import { get, put, post, e, options, champ, nomMois, dateFr, badge, estRole, toast, erreur, resultatEnvoi, tableau, modale, lireForm, argent, moisCourant } from '../ui.js';

const VARIABLES = ['{nom_parent}', '{nom_eleve}', '{classe}', '{mois}', '{montant}', '{date_limite}', '{ecole}'];

export async function afficher(el) {
  const directeur = estRole('directeur');
  const [p, cal, classes] = await Promise.all([get('/parametres'), get('/whatsapp/rappels/calendrier'), get('/classes')]);
  const modes = { manuel: 'Manuel (liens wa.me : vous cliquez pour envoyer)', meta: 'API WhatsApp Business (Meta)', twilio: 'Twilio' };
  const moisDefaut = cal.find((c) => c.mois === moisCourant()) ? moisCourant() : (cal[0] && cal[0].mois);

  el.innerHTML = `
    <div class="entete-page"><h1>Rappels WhatsApp</h1></div>
    <div class="alerte ${p.whatsapp.configure ? 'info' : 'danger'}">📡 <div>Mode d'envoi : <b>${e(modes[p.whatsapp.mode] || p.whatsapp.mode)}</b>.
      ${p.whatsapp.mode === 'manuel' ? 'Les rappels automatiques sont préparés à la date prévue ; vous les envoyez ensuite en un clic depuis « Annonces & historique ».' : ''}
      ${!p.whatsapp.configure ? 'Identifiants API manquants : voir le fichier .env.' : ''}</div></div>

    <div class="grille g2">
      <div class="carte"><h2>⚙️ Rappels automatiques</h2>
        <form id="reglages">
          <label class="case"><input type="checkbox" name="rappel_auto" ${p.rappel_auto ? 'checked' : ''} ${directeur ? '' : 'disabled'}> Envoyer automatiquement les rappels</label>
          <div class="grille g2" style="margin-top:.6rem">
            ${champ('Jour du rappel', `<input type="number" name="rappel_jour" min="1" max="28" value="${p.rappel_jour}" ${directeur ? '' : 'disabled'}>`, { aide: 'Chaque mois, ex. le 25.' })}
            ${champ('Heure d\'envoi', `<input type="number" name="rappel_heure" min="0" max="23" value="${p.rappel_heure}" ${directeur ? '' : 'disabled'}>`, { aide: 'Ex. 9 = 9 h du matin.' })}
            ${champ('Date limite de paiement', `<input type="number" name="date_limite_jour" min="1" max="28" value="${p.date_limite_jour}" ${directeur ? '' : 'disabled'}>`, { aide: 'Chaque mensualité est à payer avant ce jour du mois concerné (ex. avant le 5 novembre pour novembre).' })}
            ${champ('Second rappel après', `<input type="number" name="second_rappel_delai" min="1" max="20" value="${p.second_rappel_delai}" ${directeur ? '' : 'disabled'}>`, { aide: 'jours après la date limite.' })}
          </div>
          <label class="case"><input type="checkbox" name="rappel_impayes_seulement" ${p.rappel_impayes_seulement ? 'checked' : ''} ${directeur ? '' : 'disabled'}> Seulement aux parents qui n'ont pas encore payé</label>
          <label class="case"><input type="checkbox" name="second_rappel_actif" ${p.second_rappel_actif ? 'checked' : ''} ${directeur ? '' : 'disabled'}> Envoyer un second rappel si toujours impayé</label>
          ${directeur ? '<div class="ligne fin" style="margin-top:.8rem"><button class="btn">💾 Enregistrer</button></div>' : ''}
        </form>
      </div>
      <div class="carte"><h2>✉️ Modèles de messages</h2>
        <p class="petit muted" style="margin-top:-.3rem">« Bonjour » au début d'un message devient automatiquement « Bonsoir » s'il part à partir de 14 h.</p>
        <form id="modeles">
          ${champ('Premier rappel', `<textarea name="modele_rappel" rows="5" ${directeur ? '' : 'disabled'}>${e(p.modele_rappel)}</textarea>`)}
          ${champ('Second rappel', `<textarea name="modele_second_rappel" rows="4" ${directeur ? '' : 'disabled'}>${e(p.modele_second_rappel)}</textarea>`)}
          <p class="petit muted">Variables : ${VARIABLES.map((v) => `<code>${v}</code>`).join(' ')}</p>
          ${directeur ? '<div class="ligne fin"><button class="btn">💾 Enregistrer les modèles</button></div>' : ''}
        </form>
      </div>
    </div>

    <div class="carte" style="margin-top:1rem"><h2>📲 Envoyer un rappel maintenant</h2>
      <div class="filtres">
        <select id="m-mois">${options(cal.map((c) => [c.mois, nomMois(c.mois)]), moisDefaut)}</select>
        <select id="m-type">${options([['rappel', 'Premier rappel'], ['second_rappel', 'Second rappel (impayés)']], 'rappel')}</select>
        <select id="m-classe">${options(classes.map((c) => [c.id, c.nom]), '', { vide: 'Toutes les classes' })}</select>
        <select id="m-cible">${options([['1', 'Uniquement les impayés'], ['0', 'Tous les parents']], p.rappel_impayes_seulement ? '1' : '0')}</select>
      </div>
      <div class="ligne"><button class="btn sec" id="apercu">👁 Voir l'aperçu</button>
        <label class="case"><input type="checkbox" id="m-manuel" ${p.whatsapp.mode === 'manuel' ? 'checked disabled' : ''}> Envoyer moi-même (liens wa.me)</label></div>
    </div>

    <div class="carte" style="margin-top:1rem"><h2>🗓️ Calendrier des rappels de l'année</h2>
      ${tableau([
    { titre: 'Mensualité', rendu: (c) => `<b>${e(nomMois(c.mois))}</b>` },
    { titre: 'Rappel', rendu: (c) => `${dateFr(c.rappel)} ${c.rappel_fait ? (c.rappel_fait.termine ? badge('ok', `✔ ${c.rappel_fait.nb_messages} envoyé(s)`) : badge('attention', `⏳ ${c.rappel_fait.nb_messages} envoyé(s), suite au prochain passage`)) : ''}` },
    { titre: 'Date limite', rendu: (c) => dateFr(c.date_limite) },
    { titre: 'Second rappel', rendu: (c) => (c.second_rappel ? `${dateFr(c.second_rappel)} ${c.second_fait ? badge(c.second_fait.termine ? 'ok' : 'attention', `${c.second_fait.termine ? '✔' : '⏳'} ${c.second_fait.nb_messages}`) : ''}` : '—') },
  ], cal)}
    </div>`;

  const enregistrer = (form) => async (ev) => {
    ev.preventDefault();
    const d = lireForm(form);
    ['rappel_jour', 'rappel_heure', 'date_limite_jour', 'second_rappel_delai'].forEach((k) => { if (k in d) d[k] = Number(d[k]); });
    try { await put('/parametres', d); toast('Enregistré.', 'succes'); afficher(el); } catch (err) { erreur(err); }
  };
  el.querySelector('#reglages').onsubmit = enregistrer(el.querySelector('#reglages'));
  el.querySelector('#modeles').onsubmit = enregistrer(el.querySelector('#modeles'));

  el.querySelector('#apercu').onclick = async () => {
    const corps = {
      mois: el.querySelector('#m-mois').value, type: el.querySelector('#m-type').value,
      classe_id: el.querySelector('#m-classe').value, impayes_seulement: el.querySelector('#m-cible').value === '1',
    };
    try {
      const liste = await post('/whatsapp/rappels/apercu', corps);
      const md = modale(`Aperçu : ${liste.length} message(s)`, liste.length ? `
        <div class="alerte info">Exemple de message :<br><i>${e(liste[0].texte)}</i></div>
        ${tableau([
    { titre: 'Parent', rendu: (x) => `${e(x.destinataire)}<div class="petit muted">${e(x.telephone)}</div>` },
    { titre: 'Élève', rendu: (x) => `${e(x.eleve)}<div class="petit muted">${e(x.classe)}</div>` },
    { titre: 'Montant', classe: 'num', rendu: (x) => argent(x.montant) },
    { titre: 'Statut', rendu: (x) => badge(x.statut) },
  ], liste)}` : '<div class="vide">🎉 Aucun parent à relancer pour ce mois.</div>', {
        large: true,
        actions: `<button class="btn clair" data-f>Fermer</button>${liste.length ? `<button class="btn vert" data-go>📲 Envoyer ${liste.length} message(s)</button>` : ''}`,
      });
      md.el.querySelector('[data-f]').onclick = md.fermer;
      const go = md.el.querySelector('[data-go]');
      if (go) {
        go.onclick = async () => {
          go.disabled = true;
          try {
            const msgs = await post('/whatsapp/rappels/envoyer', { ...corps, manuel: el.querySelector('#m-manuel').checked });
            md.fermer();
            resultatEnvoi(msgs, 'Rappels de paiement');
          } catch (err) { erreur(err); go.disabled = false; }
        };
      }
    } catch (err) { erreur(err); }
  };
}
