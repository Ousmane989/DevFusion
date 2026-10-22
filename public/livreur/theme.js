/* Karat Logistique — mode jour / nuit.
   Chargé dans <head> (avant la feuille de style) pour appliquer le thème avant
   le premier affichage, sans clignotement.
   - Choix enregistré par le visiteur (bouton soleil / lune) : il est conservé.
   - Sinon, automatique selon l'heure de l'appareil : nuit de 19 h à 7 h.
   Le changement se fait avec un cercle qui s'ouvre depuis le bouton (View
   Transitions), ou un fondu des couleurs sur les navigateurs plus anciens. */
(function () {
  'use strict';
  var KEY = 'lv-theme';
  var root = document.documentElement;

  function saved() {
    try { return localStorage.getItem(KEY); } catch (_) { return null; }
  }
  function byHour() {
    var h = new Date().getHours();
    return h >= 19 || h < 7 ? 'dark' : 'light';
  }
  function current() {
    return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function apply(t) {
    root.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'dark' ? '#0a120e' : '#ffffff');
    var label = t === 'dark' ? 'Passer en mode jour' : 'Passer en mode nuit';
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
      btns[i].setAttribute('title', label);
    }
  }

  // x, y : point de départ du cercle (centre du bouton cliqué).
  function set(t, x, y) {
    if (t === current()) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce || x == null) {
      if (!reduce) root.classList.add('theme-anim');
      apply(t);
      setTimeout(function () { root.classList.remove('theme-anim'); }, 700);
      return;
    }
    var r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    var vt = document.startViewTransition(function () { apply(t); });
    vt.ready.then(function () {
      root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 750, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }
      );
    }).catch(function () { /* transition interrompue : le thème est déjà appliqué */ });
  }

  function toggle(x, y) {
    var t = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, t); } catch (_) { /* stockage indisponible */ }
    set(t, x, y);
  }

  apply(saved() || byHour());

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (!b) return;
    var r = b.getBoundingClientRect();
    toggle(r.left + r.width / 2, r.top + r.height / 2);
  });

  // Mode automatique : bascule d'elle-même au lever / coucher (vérifié chaque minute).
  setInterval(function () {
    if (!saved()) set(byHour());
  }, 60000);

  // Le bouton est créé plus tard (en-tête, barre des espaces) : on met à jour son état.
  document.addEventListener('DOMContentLoaded', function () { apply(current()); });

  window.LVTheme = { set: set, toggle: toggle, current: current, refresh: function () { apply(current()); } };
})();
