// Inscriptions : nouveaux inscrits, et élèves « en attente d'inscription » (ils ont déjà
// payé, par exemple une mensualité, mais leur inscription n'est pas encore faite).
import { get, e, qs, options, argent, dateFr, tableau, imprimer, supprimerEleves, erreur, kpi } from '../ui.js';
import { encaisser } from './_paiement.js';
import { envoyerFactureInscription } from '../facture-edition.js';

export async function afficher(el, params) {
  el.innerHTML = `
    <div class="entete-page"><h1>Inscriptions</h1>
      <div class="ligne" style="gap:.5rem;flex-wrap:wrap">
        <a class="btn" href="#/eleves/nouveau">＋ Nouvelle inscription</a>
        <a class="btn clair" href="#/eleves/nouveau?attente=1">💰 Paiement avant inscription</a>
      </div></div>
    <p class="muted" style="margin-top:-.4rem">Un parent paie (une mensualité, une avance…) mais l'élève n'est pas encore inscrit ?
      Utilisez « <b>Paiement avant inscription</b> » : le paiement est enregistré tout de suite, et vous finalisez l'inscription quand le parent revient.</p>
    <div id="kpis"></div>
    <div class="carte" style="margin-bottom:1rem"><h2>⏳ En attente d'inscription</h2>
      <p class="petit muted" style="margin-top:-.3rem">Ces élèves ont un paiement enregistré mais n'apparaissent pas encore dans leur classe ni dans les listes.</p>
      <div id="attente"></div></div>
    <div class="carte">
      <div class="ligne" style="justify-content:space-between;flex-wrap:wrap;gap:.6rem;margin-bottom:.6rem"><h2 style="margin:0">🆕 Nouveaux inscrits</h2>
        <select id="jours" style="max-width:220px">${options([['7', '7 derniers jours'], ['30', '30 derniers jours'], ['90', '3 derniers mois'], ['366', 'Toute l\'année']], params.jours || '30')}</select></div>
      <div id="nouveaux"></div></div>`;

  const charger = async () => {
    try {
      const d = await get('/eleves/inscriptions/resume' + qs({ jours: el.querySelector('#jours').value }));
      el.querySelector('#kpis').innerHTML = `<div class="kpis" style="margin-bottom:1rem">
        ${kpi('En attente d\'inscription', d.attente.length, `${argent(d.attente.reduce((t, x) => t + x.verse, 0))} déjà payés`, 'var(--alerte)')}
        ${kpi('Nouveaux inscrits', d.nouveaux.length, el.querySelector('#jours').selectedOptions[0].textContent.toLowerCase(), 'var(--primaire)')}</div>`;

      const zA = el.querySelector('#attente');
      zA.innerHTML = tableau([
        { titre: 'Élève', rendu: (x) => `<a href="#/eleves/${x.id}"><b>${e(x.prenom)} ${e(x.nom)}</b></a><div class="petit muted">${e(x.matricule)} · enregistré le ${dateFr(String(x.created_at).slice(0, 10))}</div>` },
        { titre: 'Classe prévue', rendu: (x) => e(x.classe) },
        { titre: 'Parents', rendu: (x) => `${e(x.parents)}<div class="petit muted">${x.whatsapp ? e(x.whatsapp) : 'N° à compléter'}</div>` },
        { titre: 'Déjà payé', classe: 'num', rendu: (x) => `<b>${argent(x.verse)}</b><div class="petit muted">${x.nb_paiements} paiement(s)</div>` },
        { titre: '', rendu: (x) => `<div class="ligne" style="flex-wrap:nowrap;gap:.3rem">
            <button class="btn petit clair" data-payer="${x.id}" title="Encaisser un autre paiement">💰</button>
            <a class="btn petit" href="#/eleves/${x.id}/modifier?finaliser=1">✅ Finaliser l'inscription</a>
            <button class="btn petit clair" data-suppr="${x.id}" title="Supprimer" style="color:var(--danger)">🗑️</button></div>` },
      ], d.attente, { vide: 'Aucun élève en attente d\'inscription.' });
      zA.querySelectorAll('[data-payer]').forEach((b) => { b.onclick = () => encaisser(Number(b.dataset.payer), charger); });
      zA.querySelectorAll('[data-suppr]').forEach((b) => {
        b.onclick = async () => {
          const x = d.attente.find((y) => String(y.id) === b.dataset.suppr);
          try { if (await supprimerEleves([x.id], `${x.prenom} ${x.nom}`)) charger(); } catch (err) { erreur(err); }
        };
      });

      const zN = el.querySelector('#nouveaux');
      zN.innerHTML = tableau([
        { titre: 'Élève', rendu: (x) => `<a href="#/eleves/${x.id}"><b>${e(x.prenom)} ${e(x.nom)}</b></a><div class="petit muted">${e(x.matricule)}</div>` },
        { titre: 'Classe', rendu: (x) => e(x.classe) },
        { titre: 'Inscrit le', rendu: (x) => dateFr(x.date_inscription) },
        { titre: 'Frais d\'inscription', classe: 'num', rendu: (x) => {
          const reste = Math.max(0, x.frais_inscription - x.verse_inscription);
          return `${argent(x.frais_inscription)}<div class="petit ${reste ? '' : 'muted'}">${reste ? `<span style="color:var(--danger)">reste ${argent(reste)}</span>` : 'réglés ✔'}</div>`;
        } },
        { titre: '', rendu: (x) => `<div class="ligne" style="flex-wrap:nowrap;gap:.3rem">
            <button class="btn petit clair" data-fact="${x.id}" title="Imprimer la facture d'inscription">🧾</button>
            <button class="btn petit vert" data-wa="${x.id}" title="Envoyer la facture d'inscription par WhatsApp">📲</button>
            ${x.frais_inscription - x.verse_inscription > 0 ? `<button class="btn petit" data-payer="${x.id}" style="white-space:nowrap">💰 Encaisser</button>` : ''}</div>` },
      ], d.nouveaux, { vide: 'Aucune nouvelle inscription sur cette période.' });
      zN.querySelectorAll('[data-fact]').forEach((b) => { b.onclick = () => imprimer(`/eleves/${b.dataset.fact}/facture-inscription.pdf`); });
      zN.querySelectorAll('[data-wa]').forEach((b) => { b.onclick = () => envoyerFactureInscription(b.dataset.wa); });
      zN.querySelectorAll('[data-payer]').forEach((b) => { b.onclick = () => encaisser(Number(b.dataset.payer), charger); });
    } catch (err) { erreur(err); }
  };
  el.querySelector('#jours').onchange = charger;
  await charger();
}
