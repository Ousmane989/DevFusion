// Bouton « Installer l'application » : ajoute Keur Xaleyi sur l'écran d'accueil
// du téléphone ou sur l'ordinateur (bureau, menu Démarrer, Dock), avec le logo
// de l'école. Utilisé par la page de connexion et par l'application.
// Tout élément [data-installer] devient un bouton d'installation, caché si
// l'application est déjà installée. Sa valeur choisit le libellé :
//   data-installer="long"  -> « Installer l'application sur mon téléphone / cet ordinateur »
//   data-installer="court" -> icône + « Installer » (barre du haut)
//   data-installer="menu"  -> « Installer l'application » (menu)
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }

  let invite = null; // évènement « beforeinstallprompt » (Chrome, Edge, Android)
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const mobile = ios || /android|mobile/i.test(ua);
  const navigateur = /edg\//i.test(ua) ? 'edge'
    : /firefox|fxios/i.test(ua) ? 'firefox'
      : /chrome|crios|chromium/i.test(ua) ? 'chrome'
        : /safari/i.test(ua) ? 'safari' : 'autre';
  const installee = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  const icone = mobile ? '📲' : '💻';
  const LIBELLES = {
    long: `${icone} Installer l'application ${mobile ? 'sur mon téléphone' : 'sur cet ordinateur'}`,
    court: `${icone}<span class="si-large"> Installer</span>`,
    menu: `${icone} Installer l'application`,
  };

  const boutons = () => document.querySelectorAll('[data-installer]');
  const maj = () => boutons().forEach((b) => b.classList.toggle('cache', installee()));

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); invite = e; maj(); });
  window.addEventListener('appinstalled', () => { invite = null; boutons().forEach((b) => b.classList.add('cache')); });

  /** Mode d'emploi selon l'appareil et le navigateur. */
  function etapes() {
    if (ios) {
      return `<ol><li>Ouvrez ce site dans <b>Safari</b>.</li>
        <li>Touchez le bouton <b>Partager</b> <span class="kx-touche">⬆️</span> en bas de l'écran.</li>
        <li>Choisissez <b>« Sur l'écran d'accueil »</b>, puis <b>Ajouter</b>.</li></ol>`;
    }
    if (mobile) {
      return `<ol><li>Touchez le menu du navigateur <span class="kx-touche">⋮</span> (en haut à droite).</li>
        <li>Choisissez <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.</li>
        <li>Confirmez avec <b>Installer</b>.</li></ol>`;
    }
    if (navigateur === 'chrome') {
      return `<ol><li>Cliquez sur l'icône d'installation <span class="kx-touche">⊕</span> tout à droite de la barre d'adresse,
        <br><span class="petit muted">ou ouvrez le menu <b>⋮</b> → <b>« Caster, enregistrer et partager »</b> → <b>« Installer la page en tant qu'application »</b>.</span></li>
        <li>Cliquez sur <b>Installer</b>.</li>
        <li>Keur Xaleyi s'ouvre dans sa propre fenêtre, et son icône est ajoutée au bureau et au menu Démarrer (ou au Launchpad sur Mac).</li></ol>`;
    }
    if (navigateur === 'edge') {
      return `<ol><li>Cliquez sur l'icône <span class="kx-touche">⊕</span> « Application disponible » dans la barre d'adresse,
        <br><span class="petit muted">ou ouvrez le menu <b>…</b> → <b>Applications</b> → <b>« Installer ce site en tant qu'application »</b>.</span></li>
        <li>Cliquez sur <b>Installer</b>.</li>
        <li>Vous pouvez ensuite l'épingler à la barre des tâches et au menu Démarrer.</li></ol>`;
    }
    if (navigateur === 'safari') {
      return `<ol><li>Dans la barre de menus de Safari, cliquez sur <b>Fichier</b> → <b>« Ajouter au Dock… »</b>
        <br><span class="petit muted">(ou bouton Partager <b>⬆️</b> → « Ajouter au Dock » ; macOS Sonoma ou plus récent).</span></li>
        <li>Cliquez sur <b>Ajouter</b> : l'icône de l'école apparaît dans le Dock.</li></ol>`;
    }
    return `<p><b>${navigateur === 'firefox' ? 'Firefox' : 'Ce navigateur'}</b> ne permet pas d'installer une application sur ordinateur.</p>
      <ol><li>Ouvrez <b>keur-xalayi.vercel.app</b> avec <b>Google Chrome</b> ou <b>Microsoft Edge</b> (déjà présent sur Windows).</li>
      <li>Cliquez à nouveau sur <b>« Installer l'application »</b>.</li></ol>
      <p class="petit muted">En attendant, vous pouvez ajouter le site à vos favoris (Ctrl + D).</p>`;
  }

  function aide() {
    const fond = document.createElement('div');
    fond.className = 'modale-fond';
    fond.innerHTML = `<div class="modale" role="dialog" aria-modal="true">
      <header><h2>${icone} Installer Keur Xaleyi</h2><button class="fermer" aria-label="Fermer">×</button></header>
      <div class="corps kx-aide"><div class="ligne" style="margin-bottom:.8rem;flex-wrap:nowrap">
        <img src="/img/icone-192.png" alt="" width="64" height="64" style="border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.15)">
        <p style="margin:0">${mobile
    ? 'L\'icône de l\'école apparaîtra sur votre écran d\'accueil : l\'application s\'ouvrira en plein écran, comme une application normale.'
    : ['chrome', 'edge', 'safari'].includes(navigateur)
      ? 'L\'application s\'ouvrira dans sa propre fenêtre, avec l\'icône de l\'école sur le bureau et dans la barre des tâches, sans barre d\'adresse.'
      : 'Sur ordinateur, l\'installation se fait avec Google Chrome ou Microsoft Edge.'}</p></div>
        ${etapes()}</div>
      <footer><button class="btn" data-ok>J'ai compris</button></footer></div>`;
    const fermer = () => fond.remove();
    fond.querySelector('.fermer').onclick = fermer;
    fond.querySelector('[data-ok]').onclick = fermer;
    fond.addEventListener('mousedown', (ev) => { if (ev.target === fond) fermer(); });
    document.body.appendChild(fond);
  }

  async function installer() {
    if (invite) {
      invite.prompt();
      const choix = await invite.userChoice.catch(() => null);
      invite = null;
      if (choix && choix.outcome === 'accepted') boutons().forEach((b) => b.classList.add('cache'));
      return;
    }
    aide(); // iPhone, Safari, Firefox, ou installation automatique pas encore proposée
  }

  // Branche les boutons présents maintenant et ceux ajoutés plus tard.
  const brancher = () => boutons().forEach((b) => {
    if (b.dataset.installerPret) return;
    b.dataset.installerPret = '1';
    if (LIBELLES[b.dataset.installer]) b.innerHTML = LIBELLES[b.dataset.installer];
    b.addEventListener('click', installer);
  });
  document.addEventListener('DOMContentLoaded', () => { brancher(); maj(); });
  new MutationObserver(() => { brancher(); maj(); }).observe(document.documentElement, { childList: true, subtree: true });
  window.kxInstaller = installer;
})();
