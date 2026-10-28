// Tableau de bord de la direction (vue simplifiée pour les enseignants).
import { get, e, argent, kpi, nomMois, nomCourt, dateFr, dateLongue, badge, ctx, estRole, graphiqueBarres, videHtml, MODES, objetPaiement } from '../ui.js';

const TYPES_EV = { vacances: 'Vacances', examen: 'Examen', evenement: 'Événement', ferie: 'Férié', reunion: 'Réunion' };

export async function afficher(el) {
  const d = await get('/tableau-de-bord');
  const f = d.finances;
  const eff = d.effectifs;
  const pctF = eff.total ? Math.round((eff.filles / eff.total) * 100) : 0;

  el.innerHTML = `
    <div class="entete-page">
      <h1>Bonjour ${e(ctx.utilisateur.nom_complet.split(' ')[0])} 👋</h1>
      <span class="muted">${e(dateLongue(d.jour))}</span>
    </div>

    ${d.demandes_comptes ? `<div class="alerte info">👩‍🏫 <div><b>${d.demandes_comptes} enseignant(s)</b> ont créé leur compte et attendent votre validation.
      <a href="#/utilisateurs">Voir les demandes</a></div></div>` : ''}
    ${d.messages_a_envoyer ? `<div class="alerte attention">🔔 <div><b>${d.messages_a_envoyer} message(s) WhatsApp</b> préparé(s) attendent d'être envoyés.
      <a href="#/messages?statut=a_envoyer">Les envoyer maintenant</a></div></div>` : ''}
    ${d.appels.total && d.appels.faits < d.appels.total && new Date().getHours() >= 9 ? `<div class="alerte info">📋 Appel non fait aujourd'hui : ${e(d.appels.classes_sans_appel.join(', '))}</div>` : ''}

    <div class="kpis">
      ${kpi('Élèves inscrits', eff.total, `${eff.garcons} garçons · ${eff.filles} filles (${pctF} %)`, 'var(--secondaire)')}
      ${f ? kpi(`Encaissé en ${nomMois(f.mois)}`, argent(f.encaisse_mois), `dont inscriptions : ${argent(f.inscriptions.encaisse_mois)}<br>Mensualités attendues : ${argent(f.attendu_mois)}`, 'var(--succes)') : ''}
      ${f ? kpi('Frais d\'inscription encaissés', argent(f.inscriptions.encaisse), `sur ${argent(f.inscriptions.attendu)} attendus${f.inscriptions.reste > 0
    ? ` · reste <b>${argent(f.inscriptions.reste)}</b> (${f.inscriptions.nb_a_regler} élève(s))` : f.inscriptions.attendu > 0 ? ' · tout est réglé ✔' : ''}`, 'var(--accent)') : ''}
      ${f ? kpi('Taux de recouvrement', f.taux_recouvrement === null ? '—' : `${f.taux_recouvrement} %`, `<div class="barre-progres" style="margin-top:.4rem"><div style="width:${Math.min(100, f.taux_recouvrement)}%"></div></div>
        ${f.statuts.payes} payés · ${f.statuts.partiels} partiels · ${f.statuts.impayes} impayés`, 'var(--primaire)') : ''}
      ${f ? kpi('Total des impayés', argent(f.total_impayes), `${f.nb_eleves_impayes} élève(s) concerné(s) · <a href="#/impayes">voir</a>`, 'var(--danger)') : ''}
      ${kpi('Absences du jour', d.absences.absents, `${d.absences.retards} retard(s) · appel fait dans ${d.appels.faits}/${d.appels.total} classe(s)`, 'var(--primaire)')}
    </div>

    <div class="grille g2" style="margin-top:1rem">
      <div class="carte">
        <h2>🏫 Répartition par classe</h2>
        ${eff.par_classe.length ? graphiqueBarres(eff.par_classe.map((c) => nomCourt(c.nom)), [
    { nom: 'Garçons', couleur: '#2e3192', valeurs: eff.par_classe.map((c) => c.garcons) },
    { nom: 'Filles', couleur: '#9294dc', valeurs: eff.par_classe.map((c) => c.filles) },
  ], { hauteur: 200 }) : videHtml('Aucune classe.')}
      </div>
      ${f && f.evolution.length ? `<div class="carte">
        <h2>📈 Recouvrement des mensualités</h2>
        ${graphiqueBarres(f.evolution.map((m) => nomMois(m.mois, true)), [
    { nom: 'Attendu', couleur: '#dde0f0', valeurs: f.evolution.map((m) => m.attendu) },
    { nom: 'Encaissé', couleur: '#2e3192', valeurs: f.evolution.map((m) => m.encaisse) },
  ], { hauteur: 200, format: argent })}
      </div>` : `<div class="carte"><h2>🚸 Absents aujourd'hui</h2>${listeAbsents(d)}</div>`}
    </div>

    <div class="grille ${f ? 'g3' : 'g2'}" style="margin-top:1rem">
      ${f ? `<div class="carte"><h2>💰 Derniers paiements</h2>
        ${d.derniers_paiements.length ? `<ul class="liste">${d.derniers_paiements.map((p) => `<li>
          <div class="principal"><b><a href="#/eleves/${p.eleve_id}">${e(p.prenom)} ${e(p.nom)}</a></b>
          <span class="petit muted">${e(p.classe)} · ${e(objetPaiement(p))} · ${e(MODES[p.mode])} · ${dateFr(p.date_paiement)}</span></div>
          <b class="nowrap">${argent(p.montant)}</b></li>`).join('')}</ul>` : videHtml('Aucun paiement.')}</div>` : ''}
      ${f ? `<div class="carte"><h2>🆕 Dernières inscriptions</h2>
        ${d.dernieres_inscriptions.length ? `<ul class="liste">${d.dernieres_inscriptions.map((i) => `<li>
          <span class="avatar">${e((i.prenom[0] || '') + (i.nom[0] || ''))}</span>
          <div class="principal"><b><a href="#/eleves/${i.id}">${e(i.prenom)} ${e(i.nom)}</a></b><span class="petit muted">${e(i.classe)} · ${e(i.matricule)} · ${dateFr(i.date_inscription)}</span></div></li>`).join('')}</ul>` : videHtml('Aucune inscription.')}</div>` : ''}
      ${f ? `<div class="carte"><h2>🚸 Absents aujourd'hui</h2>${listeAbsents(d)}</div>` : ''}
      <div class="carte"><h2>📅 À venir</h2>
        ${d.evenements.length ? `<ul class="liste">${d.evenements.map((v) => `<li><span class="badge info">${e(TYPES_EV[v.type])}</span>
          <div class="principal"><b>${e(v.titre)}</b><span class="petit muted">${dateFr(v.date_debut)}${v.date_fin !== v.date_debut ? ' → ' + dateFr(v.date_fin) : ''}</span></div></li>`).join('')}</ul>` : videHtml('Aucun événement prévu.', '🗓️')}
        <a href="#/calendrier" class="petit">Voir le calendrier</a>
      </div>
      ${!f ? `<div class="carte"><h2>⚡ Raccourcis</h2><div class="ligne">
        ${estRole('enseignant', 'directeur') ? '<a class="btn" href="#/presences">✅ Faire l\'appel</a><a class="btn sec" href="#/notes">📝 Saisir des notes</a>' : ''}
        <a class="btn clair" href="#/emploi-du-temps">🗓️ Emploi du temps</a></div></div>` : ''}
    </div>`;
}

function listeAbsents(d) {
  if (!d.absences.liste.length) return videHtml(d.appels.faits ? 'Tout le monde est là !' : 'L\'appel n\'a pas encore été fait.', d.appels.faits ? '🎉' : '📋');
  return `<ul class="liste">${d.absences.liste.map((a) => `<li><div class="principal"><b><a href="#/eleves/${a.eleve_id}">${e(a.prenom)} ${e(a.nom)}</a></b>
    <span class="petit muted">${e(a.classe)}</span></div>${badge(a.statut)}</li>`).join('')}</ul>`;
}
