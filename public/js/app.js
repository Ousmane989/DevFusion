// =====================================================================
// Point d'entrée de l'application : session, menu selon le rôle, routeur.
// Chaque page est un module dans /js/pages qui exporte `afficher(el, params)`.
// =====================================================================
import { ctx, get, post, e, toast, erreur, formulaire, champ, ESPACES, navigation, chargerPays } from './ui.js';

const D = 'directeur'; const T = 'enseignant'; // deux espaces : directrice et enseignants

// Menu : [route, icône, libellé, rôles, groupe]
const MENU = [
  ['', '🏠', 'Tableau de bord', [D, T], 'Accueil'],
  ['eleves', '👧', 'Élèves', [D, T], 'Élèves'],
  ['classes', '🏫', 'Classes', [D, T], 'Élèves'],
  ['certificats', '📜', 'Certificats de scolarité', [D], 'Élèves'],
  ['presences', '✅', 'Faire l\'appel', [D, T], 'Élèves'],
  ['presences/stats', '📊', 'Assiduité', [D, T], 'Élèves'],
  ['notes', '📝', 'Notes', [D, T], 'Élèves'],
  ['bulletins', '📄', 'Bulletins', [D, T], 'Élèves'],
  ['paiements', '💰', 'Paiements', [D], 'Argent'],
  ['impayes', '⏰', 'Impayés', [D], 'Argent'],
  ['finances', '📈', 'Finances', [D], 'Argent'],
  ['rappels', '🔔', 'Rappels WhatsApp', [D], 'Communication'],
  ['messages', '💬', 'Annonces & historique', [D], 'Communication'],
  ['emploi-du-temps', '🗓️', 'Emploi du temps', [D, T], 'Organisation'],
  ['calendrier', '📅', 'Calendrier scolaire', [D, T], 'Organisation'],
  ['personnel', '👩‍🏫', 'Personnel & salaires', [D], 'Organisation'],
  ['annee', '🎓', 'Année scolaire', [D], 'Administration'],
  ['utilisateurs', '🔑', 'Utilisateurs', [D], 'Administration'],
  ['parametres', '⚙️', 'Paramètres', [D], 'Administration'],
];

// Routes : motif -> [module, titre, rôles]
const ROUTES = [
  [/^$/, 'tableau-de-bord', 'Tableau de bord', [D, T]],
  [/^eleves$/, 'eleves', 'Élèves', [D, T]],
  [/^eleves\/nouveau$/, 'eleve-form', 'Nouvelle inscription', [D]],
  [/^eleves\/(\d+)\/modifier$/, 'eleve-form', 'Modifier l\'élève', [D]],
  [/^eleves\/(\d+)$/, 'eleve-fiche', 'Fiche élève', [D, T]],
  [/^certificats$/, 'certificats', 'Certificats de scolarité', [D]],
  [/^classes$/, 'classes', 'Classes', [D, T]],
  [/^classes\/(\d+)$/, 'classe', 'Classe', [D, T]],
  [/^paiements$/, 'paiements', 'Paiements', [D]],
  [/^impayes$/, 'impayes', 'Impayés', [D]],
  [/^rappels$/, 'rappels', 'Rappels WhatsApp', [D]],
  [/^messages$/, 'messages', 'Annonces & historique', [D]],
  [/^presences$/, 'presences', 'Faire l\'appel', [D, T]],
  [/^presences\/stats$/, 'presences-stats', 'Assiduité', [D, T]],
  [/^notes$/, 'notes', 'Saisie des notes', [D, T]],
  [/^bulletins$/, 'bulletins', 'Résultats & bulletins', [D, T]],
  [/^personnel$/, 'personnel', 'Personnel & salaires', [D]],
  [/^finances$/, 'finances', 'Finances', [D]],
  [/^emploi-du-temps$/, 'emploi', 'Emploi du temps', [D, T]],
  [/^calendrier$/, 'calendrier', 'Calendrier scolaire', [D, T]],
  [/^annee$/, 'annee', 'Année scolaire', [D]],
  [/^utilisateurs$/, 'utilisateurs', 'Utilisateurs', [D]],
  [/^parametres$/, 'parametres', 'Paramètres', [D]],
];

// Raccourcis de la barre du bas (téléphone) selon le rôle.
const RACCOURCIS = {
  directeur: ['', 'eleves', 'paiements', 'impayes'],
  enseignant: ['', 'presences', 'notes', 'eleves'],
};

const $ = (id) => document.getElementById(id);

function construireMenu() {
  const role = ctx.utilisateur.role;
  let groupe = null;
  let html = '';
  for (const [route, ico, lib, roles, g] of MENU) {
    if (!roles.includes(role)) continue;
    if (g !== groupe) { html += `<div class="groupe">${e(g)}</div>`; groupe = g; }
    html += `<a href="#/${route}" data-route="${route}"><span class="ico">${ico}</span>${e(lib)}</a>`;
  }
  $('nav').innerHTML = html;
  const bas = RACCOURCIS[role].map((r) => MENU.find((m) => m[0] === r))
    .map(([route, ico, lib]) => `<a href="#/${route}" data-route="${route}"><span class="ico">${ico}</span>${e(lib.split(' ')[0])}</a>`).join('');
  $('nav-bas').innerHTML = bas + '<button id="plus"><span class="ico">☰</span>Plus</button>';
  $('plus').onclick = ouvrirMenu;
}

function ouvrirMenu() { $('menu').classList.add('ouvert'); $('voile').classList.remove('cache'); }
function fermerMenu() { $('menu').classList.remove('ouvert'); $('voile').classList.add('cache'); }

let jeton = 0; // ignore les pages chargées en retard si l'utilisateur a déjà changé de page
let hashActuel = location.hash;
async function router() {
  // Saisie non enregistrée sur la page quittée : on demande confirmation, sinon on reste.
  if (navigation.garde && location.hash !== hashActuel && navigation.garde() === false) {
    history.replaceState(null, '', hashActuel || '#/');
    return;
  }
  navigation.garde = null;
  hashActuel = location.hash;
  fermerMenu();
  document.querySelectorAll('.modale-fond').forEach((m) => (m.fermer ? m.fermer() : m.remove())); // fenêtres de la page précédente
  const chemin = location.hash.replace(/^#\/?/, '').split('?')[0];
  const params = Object.fromEntries(new URLSearchParams(location.hash.split('?')[1] || ''));
  const route = ROUTES.find(([re]) => re.test(chemin));
  const page = $('page');
  document.querySelectorAll('[data-route]').forEach((a) => {
    const r = a.dataset.route;
    a.classList.toggle('actif', r === chemin || (r !== '' && chemin.startsWith(r + '/') && !MENU.some((m) => m[0] === chemin)));
  });
  if (!route || !route[3].includes(ctx.utilisateur.role)) {
    $('titre').textContent = 'Page introuvable';
    page.innerHTML = '<div class="carte vide"><span class="ico">🔒</span>Cette page n\'existe pas ou ne vous est pas accessible.</div>';
    return;
  }
  if (await nouvelleVersion()) { location.reload(); return; }
  const [re, module, titre] = route;
  $('titre').textContent = titre;
  document.title = `${titre} — ${ctx.ecole.nom_ecole}`;
  const n = ++jeton;
  page.innerHTML = '<div class="vide"><span class="ico">⏳</span>Chargement…</div>';
  try {
    const mod = await import(`./pages/${module}.js`);
    if (n !== jeton) return;
    const el = document.createElement('div');
    page.replaceChildren(el);
    window.scrollTo(0, 0);
    await mod.afficher(el, { id: (chemin.match(re) || [])[1], ...params });
  } catch (err) {
    if (n !== jeton) return;
    console.error(err);
    page.innerHTML = '<div class="alerte danger"></div>';
    page.firstChild.textContent = 'Impossible d\'afficher la page : ' + err.message;
  }
}

// ---- Mises à jour : une application restée ouverte garde les anciens fichiers en
// mémoire. On compare la version du serveur (au plus une fois par minute, et au
// retour sur l'application) et on recharge la page si elle a changé.
let versionChargee = null; let dernierControle = 0;
async function nouvelleVersion(force = false) {
  if (!force && Date.now() - dernierControle < 60000) return false;
  dernierControle = Date.now();
  try {
    const { version } = await (await fetch('/api/version', { cache: 'no-store' })).json();
    if (!versionChargee) { versionChargee = version; return false; }
    return version !== versionChargee;
  } catch { return false; } // hors connexion : on continue avec la version actuelle
}
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && !document.querySelector('.modale-fond') && await nouvelleVersion()) location.reload();
});

/** Recharge les informations de l'école (après modification des paramètres). */
export async function rafraichirContexte() {
  const moi = await get('/auth/moi');
  Object.assign(ctx, moi);
  $('nom-ecole').textContent = ctx.ecole.nom_ecole;
  $('role-user').textContent = ESPACES[ctx.utilisateur.role] || '';
  $('nom-user').textContent = ctx.utilisateur.nom_complet;
  $('annee').textContent = ctx.annee ? ctx.annee.libelle : 'Aucune année active';
  $('logo-menu').src = ctx.ecole.logo || '/img/embleme.png'; // logo personnalisé, sinon celui de l'école
}

async function demarrer() {
  try {
    await Promise.all([rafraichirContexte(), chargerPays()]);
  } catch (err) {
    if (/Session expirée/.test(err.message)) return; // redirection vers la connexion en cours
    $('page').innerHTML = `<div class="carte vide"><span class="ico">📡</span>Impossible de joindre le serveur. Vérifiez la connexion internet.
      <div style="margin-top:1rem"><button class="btn" onclick="location.reload()">↻ Réessayer</button></div></div>`;
    return;
  }
  construireMenu();
  $('btn-menu').onclick = ouvrirMenu;
  $('voile').onclick = fermerMenu;
  $('btn-deco').onclick = async () => { await post('/auth/deconnexion'); location.replace('/'); };
  $('btn-mdp').onclick = () => formulaire('Changer mon mot de passe',
    champ('Mot de passe actuel', '<input type="password" name="actuel" required autocomplete="current-password">', { requis: true })
    + champ('Nouveau mot de passe', '<input type="password" name="nouveau" required minlength="6" autocomplete="new-password">', { requis: true, aide: '6 caractères minimum.' }),
    async (d) => { await post('/auth/mot-de-passe', d); toast('Mot de passe modifié.', 'succes'); });
  window.addEventListener('hashchange', router);
  window.addEventListener('unhandledrejection', (ev) => erreur(ev.reason || 'Erreur'));
  router();
}

demarrer();
