/* Marsa — interactions front : bascule langue FR/AR (RTL), thème, liste d'attente. */
(function () {
  'use strict';
  var root = document.documentElement;

  /* ---------- Langue FR / AR (RTL réel) ---------- */
  var nodes = document.querySelectorAll('[data-fr]');
  var langBtns = document.querySelectorAll('.lang button');

  function setLang(lang) {
    var rtl = lang === 'ar';
    root.setAttribute('lang', lang);
    root.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    nodes.forEach(function (n) {
      var v = n.getAttribute(rtl ? 'data-ar' : 'data-fr');
      if (v != null) { n.innerHTML = v; }
    });
    langBtns.forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === lang));
    });
    try { localStorage.setItem('marsa_lang', lang); } catch (e) {}
  }

  langBtns.forEach(function (b) {
    b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
  });

  /* ---------- Thème clair / sombre ---------- */
  var themeBtn = document.getElementById('theme');
  function isDark() {
    var attr = root.getAttribute('data-theme');
    if (attr) { return attr === 'dark'; }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      root.setAttribute('data-theme', isDark() ? 'light' : 'dark');
    });
  }

  /* ---------- Liste d'attente (POST vers api/subscribe.php) ---------- */
  var form = document.getElementById('wl-form');
  if (form) {
    var msg = document.getElementById('wl-msg');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = form.querySelector('input[name="phone"]');
      var lang = root.getAttribute('lang') || 'fr';
      msg.className = 'wl-msg';
      msg.textContent = '…';
      fetch('api/subscribe.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: input.value })
      })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.ok && res.d.ok) {
            msg.className = 'wl-msg ok';
            msg.textContent = msg.getAttribute(lang === 'ar' ? 'data-ar-ok' : 'data-fr-ok');
            input.value = '';
          } else {
            msg.className = 'wl-msg err';
            msg.textContent = msg.getAttribute(lang === 'ar' ? 'data-ar-err' : 'data-fr-err');
          }
        })
        .catch(function () {
          msg.className = 'wl-msg err';
          msg.textContent = msg.getAttribute(lang === 'ar' ? 'data-ar-err' : 'data-fr-err');
        });
    });
  }

  /* ---------- Langue initiale (préférence mémorisée) ---------- */
  var saved = null;
  try { saved = localStorage.getItem('marsa_lang'); } catch (e) {}
  if (saved && saved !== (root.getAttribute('lang') || 'fr')) {
    setLang(saved);
  }
})();
