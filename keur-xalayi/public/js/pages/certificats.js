// Certificats de scolarité : la directrice choisit les élèves, vérifie ou
// complète les informations, puis imprime (2 certificats par page A4 : celui de
// l'élève en haut et un vierge en bas, ou deux élèves par feuille).
import { get, e, qs, options, toast, erreur, ouvrirPdfPost, videHtml } from '../ui.js';

let minuteur;

export async function afficher(el, params) {
  const [p, classes] = await Promise.all([get('/parametres'), get('/classes')]);
  const liste = []; // certificats en préparation

  el.innerHTML = `
    <div class="entete-page"><h1>Certificats de scolarité</h1>
      <button class="btn clair" id="vierges">🖨️ Certificats vierges (à remplir à la main)</button></div>
    ${!p.directrice_nom || !p.ville ? `<div class="alerte attention">⚠️ <div>Indiquez le nom de la directrice et la ville dans
      <a href="#/parametres">Paramètres → École</a> (rubrique « Certificat de scolarité ») : ils apparaissent sur chaque certificat.</div></div>` : ''}
    <div class="carte">
      <h2>1. Choisir les élèves</h2>
      <div class="filtres">
        <input class="recherche" type="search" id="q" placeholder="🔍 Nom, prénom ou matricule de l'élève" autocomplete="off">
        <select id="classe">${options(classes.map((c) => [c.id, `${c.nom} (${c.effectif})`]), '', { vide: '— Ou toute une classe —' })}</select>
      </div>
      <div id="suggestions" class="ligne"></div>
    </div>
    <div class="carte">
      <h2>2. Vérifier et compléter <span class="muted petit" id="compte"></span></h2>
      <p class="muted petit">Les informations viennent de la fiche de l'élève. Vous pouvez tout modifier avant l'impression ; la fiche n'est pas changée.</p>
      <div id="liste"></div>
    </div>
    <div class="barre-action">
      <label class="champ" style="margin:0">Sur chaque feuille A4
        <select id="mise">${options([['vierge', 'En haut l\'élève — en bas un certificat vierge à remplir à la main'], ['suite', '2 élèves différents par feuille']], 'vierge')}</select></label>
      <span class="espace"></span>
      <button class="btn" id="pdf">🖨️ Imprimer les certificats</button>
    </div>`;

  const zone = el.querySelector('#liste');
  const majCompte = () => {
    const n = liste.length;
    const feuilles = el.querySelector('#mise').value === 'vierge' ? n : Math.ceil(n / 2);
    el.querySelector('#compte').textContent = n ? `— ${n} élève(s), ${feuilles} feuille(s) A4` : '';
    el.querySelector('#pdf').disabled = !n;
  };

  const champ = (i, cle, lib, attrs = '') => `<div class="champ"><label>${lib}</label>
    <input data-i="${i}" data-c="${cle}" value="${e(liste[i][cle])}" ${attrs}></div>`;
  const dessiner = () => {
    zone.innerHTML = liste.length ? liste.map((c, i) => `
      <fieldset><legend>📜 ${e(c.eleve || 'Élève')} <button type="button" class="btn lien petit" data-retirer="${i}">Retirer</button></legend>
        <div class="grille g2">
          ${champ(i, 'eleve', 'Certifie que l\'élève')}
          ${champ(i, 'naissance', 'Date et lieu de naissance')}
        </div>
        <div class="champ"><label>Filiation</label><div class="tel">
          <select data-i="${i}" data-c="sexe" style="width:7.5rem">${options([['M', 'Fils de'], ['F', 'Fille de']], c.sexe)}</select>
          <input data-i="${i}" data-c="filiation" value="${e(c.filiation)}"></div></div>
        <div class="grille g3">
          ${champ(i, 'classe', 'Fréquente')}
          ${champ(i, 'annee', 'Année scolaire')}
          ${champ(i, 'date', `Fait à ${e(p.ville || '…')} le`)}
        </div>
      </fieldset>`).join('') : videHtml('Aucun élève choisi. Cherchez un élève ou choisissez une classe ci-dessus.', '📜');
    zone.querySelectorAll('[data-c]').forEach((inp) => {
      inp.oninput = inp.onchange = () => { liste[inp.dataset.i][inp.dataset.c] = inp.value; };
    });
    zone.querySelectorAll('[data-retirer]').forEach((b) => { b.onclick = () => { liste.splice(Number(b.dataset.retirer), 1); dessiner(); }; });
    majCompte();
  };

  const ajouter = async (requete) => {
    try {
      const nouveaux = await get('/certificats/donnees' + qs(requete));
      let ajoutes = 0;
      for (const c of nouveaux) {
        if (liste.some((x) => x.eleve_id === c.eleve_id)) continue;
        liste.push(c); ajoutes++;
      }
      dessiner();
      if (ajoutes > 1) toast(`${ajoutes} élèves ajoutés.`, 'succes');
    } catch (err) { erreur(err); }
  };

  // Recherche d'un élève
  el.querySelector('#q').oninput = (ev) => {
    clearTimeout(minuteur);
    minuteur = setTimeout(async () => {
      const q = ev.target.value.trim();
      const s = el.querySelector('#suggestions');
      if (q.length < 2) { s.innerHTML = ''; return; }
      const trouves = await get('/eleves' + qs({ q }));
      s.innerHTML = trouves.slice(0, 8).map((x) => `<button type="button" class="btn clair petit" data-id="${x.id}">＋ ${e(x.prenom)} ${e(x.nom)} <span class="muted">(${e(x.classe || '')})</span></button>`).join('')
        || '<span class="muted petit">Aucun élève trouvé.</span>';
      s.querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => { ajouter({ eleve_ids: b.dataset.id }); el.querySelector('#q').value = ''; s.innerHTML = ''; }; });
    }, 250);
  };
  el.querySelector('#classe').onchange = (ev) => { if (ev.target.value) { ajouter({ classe_id: ev.target.value }); ev.target.value = ''; } };
  el.querySelector('#mise').onchange = majCompte;

  el.querySelector('#pdf').onclick = async () => {
    try {
      await ouvrirPdfPost('/certificats/pdf', { certificats: liste, mise_en_page: el.querySelector('#mise').value });
    } catch (err) { erreur(err); }
  };
  el.querySelector('#vierges').onclick = async () => {
    try { await ouvrirPdfPost('/certificats/pdf', { certificats: [] }); } catch (err) { erreur(err); }
  };

  dessiner();
  if (params.eleve_id) await ajouter({ eleve_ids: params.eleve_id });
}
