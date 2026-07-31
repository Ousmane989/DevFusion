/* Marsa — interactions : langue FR/AR (RTL), thème, reveal au scroll,
   recherche animée, liste d'attente. Sans dépendance externe. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* ---------- Reveal au scroll (staggered) ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          var el = e.target;
          var i = Number(el.getAttribute('data-i') || 0);
          el.style.transitionDelay = (i * 80) + 'ms';
          el.classList.add('in');
          io.unobserve(el);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Recherche animée (effet de saisie) ---------- */
  var fake = document.getElementById('search-typed');
  if (fake && !reduce) {
    var words = (fake.getAttribute('data-words') || '').split('|').filter(Boolean);
    if (words.length) {
      var wi = 0, ci = 0, deleting = false;
      var textSpan = fake.querySelector('.txt');
      function tick() {
        var w = words[wi % words.length];
        ci += deleting ? -1 : 1;
        textSpan.textContent = w.slice(0, ci);
        var delay = deleting ? 45 : 95;
        if (!deleting && ci === w.length) { deleting = true; delay = 1300; }
        else if (deleting && ci === 0) { deleting = false; wi++; delay = 350; }
        setTimeout(tick, delay);
      }
      tick();
    }
  }

  /* ---------- Liste d'attente ---------- */
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

  /* ---------- Page Accès : identification locale ---------- */
  var accForm = document.getElementById('access-form');
  if (accForm) {
    var accMsg = document.getElementById('access-msg');
    accForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = accForm.querySelector('input[name="phone"]');
      var lang = root.getAttribute('lang') || 'fr';
      var digits = (input.value || '').replace(/\D+/g, '');
      if (digits.length >= 8 && digits.length <= 15) {
        accMsg.className = 'access-msg ok';
        accMsg.textContent = accMsg.getAttribute(lang === 'ar' ? 'data-ar-ok' : 'data-fr-ok');
      } else {
        accMsg.className = 'access-msg err';
        accMsg.textContent = accMsg.getAttribute(lang === 'ar' ? 'data-ar-err' : 'data-fr-err');
      }
    });
  }

  /* ---------- Langue mémorisée ---------- */
  var saved = null;
  try { saved = localStorage.getItem('marsa_lang'); } catch (e) {}
  if (saved && saved !== (root.getAttribute('lang') || 'fr')) { setLang(saved); }
})();
