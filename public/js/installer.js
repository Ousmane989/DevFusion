// Bouton « Installer l'application » : ajoute Keur Xaleyi sur l'écran d'accueil
// avec le logo de l'école. Utilisé par la page de connexion et par l'application.
// Tout élément [data-installer] devient un bouton d'installation (caché si
// l'application est déjà installée).
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }

  let invite = null; // évènement « beforeinstallprompt » (Android, Chrome, Edge)
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const installee = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  const boutons = () => document.querySelectorAll('[data-installer]');
  const maj = () => boutons().forEach((b) => b.classList.toggle('cache', installee()));

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); invite = e; maj(); });
  window.addEventListener('appinstalled', () => { invite = null; boutons().forEach((b) => b.classList.add('cache')); });

  function aide() {
    const etapes = ios
      ? `<ol style="padding-left:1.2rem;line-height:1.9">
           <li>Ouvrez ce site dans <b>Safari</b>.</li>
           <li>Touchez le bouton <b>Partager</b> <span style="font-size:1.2rem">⬆️</span> en bas de l'écran.</li>
           <li>Choisissez <b>« Sur l'écran d'accueil »</b>, puis <b>Ajouter</b>.</li></ol>`
      : `<ol style="padding-left:1.2rem;line-height:1.9">
           <li>Touchez le menu du navigateur <b>⋮</b> (en haut à droite).</li>
           <li>Choisissez <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.</li>
           <li>Confirmez avec <b>Installer</b> (ou <b>Ajouter</b>).</li></ol>`;
    const fond = document.createElement('div');
    fond.className = 'modale-fond';
    fond.innerHTML = `<div class="modale" role="dialog" aria-modal="true">
      <header><h2>📲 Installer Keur Xaleyi</h2><button class="fermer" aria-label="Fermer">×</button></header>
      <div class="corps"><div class="ligne" style="margin-bottom:.8rem;flex-wrap:nowrap">
        <img src="/img/icone-192.png" alt="" width="64" height="64" style="border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.15)">
        <p style="margin:0">L'icône de l'école apparaîtra sur votre écran d'accueil : l'application s'ouvrira en plein écran, comme une application normale.</p></div>
        ${etapes}</div>
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
    aide(); // iPhone / iPad, ou navigateur sans installation automatique
  }

  // Branche les boutons présents maintenant et ceux ajoutés plus tard (menu de l'application).
  const brancher = () => boutons().forEach((b) => {
    if (b.dataset.installerPret) return;
    b.dataset.installerPret = '1';
    b.addEventListener('click', installer);
  });
  document.addEventListener('DOMContentLoaded', () => { brancher(); maj(); });
  new MutationObserver(() => { brancher(); maj(); }).observe(document.documentElement, { childList: true, subtree: true });
  window.kxInstaller = installer;
})();
