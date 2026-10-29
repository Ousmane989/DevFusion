// Informations aux parents : fête, réunion, vacances, sortie… La directrice les
// écrit une fois, puis les imprime (1 ou 2 par feuille A4) ou les envoie par WhatsApp.
import { get, post, put, del, e, options, champ, formulaire, confirmer, toast, erreur, imprimer, ouvrir, dateFr, videHtml } from '../ui.js';

export const TYPES = {
  fete: ['🎉', 'Fête'], reunion: ['👥', 'Réunion des parents'], vacances: ['🏖️', 'Vacances'], fermeture: ['🚪', 'Fermeture de l\'école'],
  sortie: ['🚌', 'Sortie / excursion'], examen: ['📝', 'Examens / compositions'], autre: ['📌', 'Autre information'],
};

// Modèles proposés selon le type (titre et texte modifiables)
const MODELES = {
  fete: ['Fête de fin d\'année', 'Chers parents,\n\nNous avons le plaisir de vous informer que l\'école organise une fête pour les élèves. Spectacles, chants et danses préparés par les enfants sont au programme.\n\nVotre présence nous fera très plaisir. Les enfants viendront habillés en tenue de fête.\n\nComptant sur votre présence.'],
  reunion: ['Réunion des parents d\'élèves', 'Chers parents,\n\nVous êtes invités à une réunion des parents d\'élèves.\n\nOrdre du jour : bilan du trimestre, résultats des élèves et questions diverses.\n\nVotre présence est très importante.'],
  vacances: ['Vacances scolaires', 'Chers parents,\n\nNous vous informons que les cours s\'arrêteront pour les vacances aux dates indiquées ci-dessus.\n\nLa reprise des cours se fera le [DATE DE REPRISE] à l\'heure habituelle.\n\nBonnes vacances à tous les élèves !'],
  fermeture: ['Fermeture exceptionnelle de l\'école', 'Chers parents,\n\nNous vous informons que l\'école sera exceptionnellement fermée à la date indiquée ci-dessus, en raison de [MOTIF].\n\nLes cours reprendront normalement le lendemain.\n\nMerci de votre compréhension.'],
  sortie: ['Sortie pédagogique', 'Chers parents,\n\nUne sortie pédagogique est organisée pour les élèves.\n\nParticipation : [MONTANT] FCFA, à remettre avant le [DATE].\nLes enfants doivent apporter un goûter et une bouteille d\'eau.\n\nMerci de nous retourner le coupon ci-dessous signé.'],
  examen: ['Compositions du trimestre', 'Chers parents,\n\nNous vous informons que les compositions du trimestre auront lieu aux dates indiquées ci-dessus.\n\nMerci de veiller à ce que votre enfant révise ses leçons et arrive à l\'heure avec tout son matériel.'],
  autre: ['', 'Chers parents,\n\n'],
};

/** Texte WhatsApp tiré d'une information (pour la page Annonces). */
export function texteWhatsApp(c) {
  const date = c.date_evenement ? (c.date_fin && c.date_fin !== c.date_evenement ? `du ${dateFr(c.date_evenement)} au ${dateFr(c.date_fin)}` : `le ${dateFr(c.date_evenement)}`) : '';
  const quand = [date && `📅 ${date}`, c.heure && `🕘 ${c.heure}`, c.lieu && `📍 ${c.lieu}`].filter(Boolean).join('\n');
  const corps = c.texte.replace(/^chers parents,?\s*/i, '');
  return `Bonjour {nom_parent},\n\n*${c.titre}*\n${quand ? quand + '\n' : ''}\n${corps}\n\nLa Direction — {ecole}`;
}

export async function afficher(el) {
  const classes = await get('/classes');
  el.innerHTML = `
    <div class="entete-page"><h1>Informations aux parents</h1><button class="btn" id="nouveau">＋ Nouvelle information</button></div>
    <p class="muted" style="margin-top:-.4rem">Fête, réunion, vacances, sortie… Écrivez l'information une fois, puis
      <b>imprimez-la</b> (une par feuille, ou deux par feuille à couper) ou <b>envoyez-la aux parents par WhatsApp</b>.</p>
    <div id="liste"></div>`;

  const charger = async () => {
    const l = await get('/communiques');
    const zone = el.querySelector('#liste');
    if (!l.length) { zone.innerHTML = `<div class="carte">${videHtml('Aucune information pour le moment. Cliquez sur « Nouvelle information ».', '📌')}</div>`; return; }
    zone.innerHTML = l.map((c) => {
      const [ico, lib] = TYPES[c.type] || TYPES.autre;
      const quand = c.date_evenement ? (c.date_fin && c.date_fin !== c.date_evenement ? `du ${dateFr(c.date_evenement)} au ${dateFr(c.date_fin)}` : dateFr(c.date_evenement)) : '';
      return `<div class="carte" style="margin-bottom:.8rem">
        <div class="ligne" style="align-items:flex-start;gap:.8rem">
          <div style="font-size:2rem;line-height:1">${ico}</div>
          <div style="flex:1;min-width:200px">
            <h2 style="margin:0 0 .2rem">${e(c.titre)}</h2>
            <div class="petit muted">${e(lib)}${quand ? ` · 📅 ${e(quand)}` : ''}${c.heure ? ` · 🕘 ${e(c.heure)}` : ''}${c.lieu ? ` · 📍 ${e(c.lieu)}` : ''}
              · ${c.classe ? `Classe ${e(c.classe)}` : 'Toute l\'école'}${c.coupon ? ' · avec coupon-réponse' : ''}</div>
            <p style="white-space:pre-line;margin:.6rem 0 0">${e(c.texte.length > 260 ? c.texte.slice(0, 260) + '…' : c.texte)}</p>
          </div>
        </div>
        <div class="ligne" style="margin-top:.8rem;gap:.4rem;flex-wrap:wrap">
          <button class="btn petit" data-impr="${c.id}" data-n="1">🖨️ Imprimer (1 par feuille)</button>
          <button class="btn petit clair" data-impr="${c.id}" data-n="2">🖨️ 2 par feuille (à couper)</button>
          <button class="btn petit clair" data-pdf="${c.id}">📄 PDF</button>
          <a class="btn petit vert" href="#/messages?communique=${c.id}">📲 Envoyer par WhatsApp</a>
          <span class="espace"></span>
          <button class="btn petit clair" data-modif="${c.id}">✏️ Modifier</button>
          <button class="btn petit clair" data-suppr="${c.id}" style="color:var(--danger)">🗑️</button>
        </div></div>`;
    }).join('');
    zone.querySelectorAll('[data-impr]').forEach((b) => { b.onclick = () => imprimer(`/communiques/${b.dataset.impr}/pdf?par_page=${b.dataset.n}`); });
    zone.querySelectorAll('[data-pdf]').forEach((b) => { b.onclick = () => ouvrir(`/communiques/${b.dataset.pdf}/pdf`); });
    zone.querySelectorAll('[data-modif]').forEach((b) => { b.onclick = () => editer(l.find((c) => String(c.id) === b.dataset.modif)); });
    zone.querySelectorAll('[data-suppr]').forEach((b) => {
      b.onclick = async () => {
        if (!await confirmer('Supprimer cette information ?', { ok: 'Supprimer', danger: true })) return;
        try { await del(`/communiques/${b.dataset.suppr}`); toast('Information supprimée.', 'succes'); charger(); } catch (err) { erreur(err); }
      };
    });
  };

  const editer = (c = null) => {
    const v = c || { type: 'fete', titre: MODELES.fete[0], texte: MODELES.fete[1] };
    const m = formulaire(c ? 'Modifier l\'information' : 'Nouvelle information aux parents', `
      <div class="grille g2">
        ${champ('Type', `<select name="type" id="ci-type">${options(Object.entries(TYPES).map(([k, [i, t]]) => [k, `${i} ${t}`]), v.type)}</select>`, { aide: c ? '' : 'Un modèle de texte est proposé, à adapter.' })}
        ${champ('Pour', `<select name="classe_id">${options(classes.map((x) => [x.id, `Classe ${x.nom}`]), v.classe_id || '', { vide: 'Toute l\'école' })}</select>`)}
      </div>
      ${champ('Titre', `<input name="titre" id="ci-titre" required maxlength="120" value="${e(v.titre)}" placeholder="Ex. Fête de fin d'année">`, { requis: true })}
      <div class="grille g2">
        ${champ('Date', `<input type="date" name="date_evenement" value="${e(v.date_evenement || '')}">`)}
        ${champ('Jusqu\'au (facultatif)', `<input type="date" name="date_fin" value="${e(v.date_fin || '')}">`, { aide: 'Pour des vacances ou plusieurs jours.' })}
        ${champ('Heure', `<input name="heure" maxlength="40" value="${e(v.heure || '')}" placeholder="Ex. 9 h 00">`)}
        ${champ('Lieu', `<input name="lieu" maxlength="120" value="${e(v.lieu || '')}" placeholder="Ex. Cour de l'école">`)}
      </div>
      ${champ('Texte', `<textarea name="texte" id="ci-texte" rows="9" required maxlength="3000">${e(v.texte)}</textarea>`, { requis: true, aide: 'Remplacez les [CROCHETS] avant d\'imprimer.' })}
      <label class="case"><input type="checkbox" name="coupon" ${v.coupon ? 'checked' : ''}> Ajouter un coupon-réponse à découper, que le parent signe et retourne</label>`,
    async (d) => {
      if (/\[[A-ZÉÈ ]+\]/.test(d.texte) && !await confirmer('Le texte contient encore des [CROCHETS] à remplacer. Enregistrer quand même ?', { ok: 'Enregistrer' })) throw new Error('Remplacez les [CROCHETS] dans le texte.');
      if (c) await put(`/communiques/${c.id}`, d); else await post('/communiques', d);
      toast('Information enregistrée.', 'succes');
      charger();
    }, { large: true });
    // Nouveau : changer de type remplace le modèle tant qu'il n'a pas été retouché
    if (!c) {
      const type = m.el.querySelector('#ci-type'); const titre = m.el.querySelector('#ci-titre'); const texte = m.el.querySelector('#ci-texte');
      type.onchange = () => {
        const estModele = Object.values(MODELES).some(([t, x]) => titre.value === t && texte.value === x);
        if (estModele || (!titre.value.trim() && texte.value.trim().length < 20)) { [titre.value, texte.value] = MODELES[type.value]; }
      };
    }
  };

  el.querySelector('#nouveau').onclick = () => editer();
  await charger();
}
