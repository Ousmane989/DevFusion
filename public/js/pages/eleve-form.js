// Formulaire d'inscription / modification d'un élève.
import { get, post, put, e, champ, options, champTel, activerTels, lireForm, toast, erreur, reduireImage, aujourdhui, argent } from '../ui.js';

export async function afficher(el, { id }) {
  const [classes, fiche] = await Promise.all([get('/classes'), id ? get(`/eleves/${id}`) : null]);
  const v = fiche ? fiche.eleve : {};
  const insc = fiche ? fiche.inscription : null;
  let photo = v.photo || null;

  el.innerHTML = `
    <div class="entete-page"><h1>${id ? `Modifier : ${e(v.prenom)} ${e(v.nom)}` : 'Nouvelle inscription'}</h1>
      ${id ? `<span class="badge info">${e(v.matricule)}</span>` : '<span class="muted petit">Le matricule sera généré automatiquement.</span>'}</div>
    <form id="f" novalidate>
      <fieldset><legend>👧 L'élève</legend>
        <div class="grille g3">
          <div style="grid-row: span 2">
            <label>Photo</label>
            <div class="ligne"><div id="apercu"></div>
              <div><label class="btn clair petit" style="margin:0">📷 Choisir / prendre une photo<input type="file" id="photo" accept="image/*" capture="environment" class="cache"></label>
              <br><button type="button" class="btn lien petit" id="sans-photo">Retirer la photo</button></div></div>
          </div>
          ${champ('Nom', `<input name="nom" required value="${e(v.nom)}" autocomplete="off" style="text-transform:uppercase">`, { requis: true })}
          ${champ('Prénom', `<input name="prenom" required value="${e(v.prenom)}" autocomplete="off">`, { requis: true })}
          ${champ('Sexe', `<div class="ligne" style="min-height:44px">
            <label class="case"><input type="radio" name="sexe" value="M" required ${v.sexe === 'M' ? 'checked' : ''}> Garçon</label>
            <label class="case"><input type="radio" name="sexe" value="F" ${v.sexe === 'F' ? 'checked' : ''}> Fille</label></div>`, { requis: true })}
          ${champ('Date de naissance', `<input type="date" name="date_naissance" value="${e(v.date_naissance)}" max="${aujourdhui()}">`)}
          ${champ('Lieu de naissance', `<input name="lieu_naissance" value="${e(v.lieu_naissance)}">`)}
        </div>
        ${champ('Remarques importantes', `<textarea name="remarques" placeholder="Allergies, maladie, traitement, personne autorisée à récupérer l'enfant…">${e(v.remarques)}</textarea>`)}
      </fieldset>

      <fieldset><legend>👨‍👩‍👧 Les parents</legend>
        <div class="grille g3">
          ${champ('Nom du père', `<input name="pere_nom" value="${e(v.pere_nom)}">`)}
          ${champ('Nom de la mère', `<input name="mere_nom" value="${e(v.mere_nom)}">`)}
          ${champ('Tuteur (si différent)', `<input name="tuteur_nom" value="${e(v.tuteur_nom)}">`)}
          ${champ('Numéro WhatsApp du parent', champTel('whatsapp', v.whatsapp, { requis: true }), { requis: true, aide: 'Utilisé pour les rappels et les annonces.' })}
          ${champ('Second numéro', champTel('telephone2', v.telephone2))}
          ${champ('Adresse / quartier', `<input name="adresse" value="${e(v.adresse)}">`)}
        </div>
      </fieldset>

      <fieldset><legend>🏫 Inscription ${insc ? `(${e(insc.annee)})` : ''}</legend>
        ${!id || insc ? `<div class="grille g3">
          ${champ('Classe', `<select name="classe_id" id="classe" required>${options(classes.map((c) => [c.id, c.nom]), insc ? insc.classe_id : '', { vide: '— Choisir —' })}</select>`, { requis: true })}
          ${champ('Date d\'inscription', `<input type="date" name="date_inscription" value="${e(insc ? insc.date_inscription : aujourdhui())}">`)}
          <div></div>
          ${champ('Frais d\'inscription', `<input type="number" min="0" step="any" name="frais_inscription" id="frais" value="${insc ? insc.frais_inscription : ''}">`, { aide: 'Rempli automatiquement selon la classe, modifiable.' })}
          ${champ('Mensualité', `<input type="number" min="0" step="any" name="mensualite" id="mens" value="${insc ? insc.mensualite : ''}">`, { aide: 'Montant mensuel normal.' })}
          ${champ('Réduction mensuelle', `<input type="number" min="0" step="any" name="reduction" id="red" value="${insc ? insc.reduction : 0}">`, { aide: '<span id="net"></span>' })}
        </div>
        <div id="zone-motif">${champ('Motif de la réduction', `<select name="reduction_motif_choix" id="motif-choix">${options([['Fratrie', 'Fratrie (plusieurs enfants)'], ['Cas social', 'Cas social'], ['Enfant du personnel', 'Enfant du personnel'], ['autre', 'Autre…']], ['Fratrie', 'Cas social', 'Enfant du personnel'].includes(insc && insc.reduction_motif) ? insc.reduction_motif : (insc && insc.reduction_motif ? 'autre' : ''), { vide: '— Choisir —' })}</select>
          <input name="reduction_motif_autre" id="motif-autre" placeholder="Précisez le motif" style="margin-top:.4rem" value="${e(insc && !['Fratrie', 'Cas social', 'Enfant du personnel'].includes(insc.reduction_motif) ? insc.reduction_motif || '' : '')}">`, { requis: true })}</div>`
    : '<div class="alerte info">Cet élève n\'est pas inscrit cette année. Utilisez « Réinscrire » depuis sa fiche.</div>'}
      </fieldset>

      <div class="barre-action">
        <button class="btn" id="ok">💾 ${id ? 'Enregistrer les modifications' : 'Inscrire l\'élève'}</button>
        <a class="btn clair" href="${id ? `#/eleves/${id}` : '#/eleves'}">Annuler</a>
      </div>
    </form>`;

  const f = el.querySelector('#f');
  activerTels(f);
  const apercu = () => {
    el.querySelector('#apercu').innerHTML = photo
      ? `<img class="avatar grand" src="${e(photo)}" alt="">`
      : '<span class="avatar grand">📷</span>';
  };
  apercu();
  el.querySelector('#photo').onchange = async (ev) => {
    const fichier = ev.target.files[0];
    if (!fichier) return;
    try { photo = await reduireImage(fichier); apercu(); } catch (err) { erreur(err); }
  };
  el.querySelector('#sans-photo').onclick = () => { photo = null; apercu(); };

  // Tarifs proposés selon la classe choisie.
  const selClasse = el.querySelector('#classe');
  const maj = () => {
    const mens = Number(el.querySelector('#mens')?.value || 0);
    const red = Number(el.querySelector('#red')?.value || 0);
    const net = el.querySelector('#net');
    if (net) net.textContent = red > 0 ? `À payer chaque mois : ${argent(Math.max(0, mens - red))}` : 'Laisser 0 s\'il n\'y a pas de réduction.';
    const zm = el.querySelector('#zone-motif');
    if (zm) zm.classList.toggle('cache', !(red > 0));
    const mc = el.querySelector('#motif-choix'); const ma = el.querySelector('#motif-autre');
    if (mc && ma) ma.classList.toggle('cache', mc.value !== 'autre');
  };
  if (selClasse) {
    selClasse.onchange = () => {
      const c = classes.find((x) => String(x.id) === selClasse.value);
      if (c && (!insc || String(insc.classe_id) !== selClasse.value)) {
        el.querySelector('#frais').value = c.frais_effectif;
        el.querySelector('#mens').value = c.mensualite_effective;
      }
      maj();
    };
    ['#mens', '#red', '#motif-choix'].forEach((s) => { const x = el.querySelector(s); if (x) x.addEventListener('input', maj); });
  }
  maj();

  f.onsubmit = async (ev) => {
    ev.preventDefault();
    if (!f.reportValidity()) return;
    const d = lireForm(f);
    if (!d.whatsapp) return erreur(new Error('Le numéro WhatsApp du parent est obligatoire.'));
    d.photo = photo;
    d.reduction_motif = d.reduction_motif_choix === 'autre' ? d.reduction_motif_autre : d.reduction_motif_choix;
    delete d.reduction_motif_choix; delete d.reduction_motif_autre;
    if (!(Number(d.reduction) > 0)) { d.reduction = 0; d.reduction_motif = null; }
    const btn = el.querySelector('#ok');
    btn.disabled = true;
    try {
      if (id) {
        await put(`/eleves/${id}`, d);
        toast('Fiche enregistrée.', 'succes');
        location.hash = `#/eleves/${id}`;
      } else {
        const r = await post('/eleves', d);
        toast(`Élève inscrit — matricule ${r.matricule}`, 'succes');
        location.hash = `#/eleves/${r.id}?nouveau=1`;
      }
    } catch (err) { erreur(err); } finally { btn.disabled = false; }
  };
}
