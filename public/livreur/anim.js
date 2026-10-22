/* Karat Logistique — animations : révélations au défilement, compteurs, titres
   mot par mot, inclinaison 3D, onde des boutons, barre de progression, transitions
   de page. Le contenu chargé plus tard (listes, tableaux, carte) est pris en
   charge automatiquement. Tout est désactivé si l'utilisateur préfère moins
   d'animations. */
window.LVAnim = (function () {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const body = document.body;

  // Intro (camion) : une seule fois par session.
  if (body.classList.contains('lv-intro')) {
    let seen = false;
    try { seen = sessionStorage.getItem('lv-intro') === '1'; sessionStorage.setItem('lv-intro', '1'); } catch (_) { /* stockage indisponible */ }
    if (seen || reduce) body.classList.remove('lv-intro');
  }
  const introDelay = body.classList.contains('lv-intro') ? 1.25 : 0;

  // Animation attribuée automatiquement selon le type de bloc.
  const AUTO = [
    ['.section-head', () => 'up'],
    ['.grid > .card, .perks > .card', (i) => ['up', 'flip', 'zoom', 'up'][i % 4]],
    ['.bento > .card', (i) => (i === 0 ? 'left' : 'zoom')],
    ['.stats-grid > .stat', () => 'zoom'],
    ['.steps > .step', () => 'flip'],
    ['.faq > details', (i) => (i % 2 ? 'right' : 'left')],
    ['.cta-grid > .cta-band, .pricing-wrap > *, .contact-wrap > *, .map-wrap > *, .hero-grid > *', (i) => (i % 2 ? 'right' : 'left')],
    ['.hq-card, .map-legend', () => 'up'],
    ['.footer-grid > *', () => 'up'],
    ['.coverage > *', (i) => (i % 2 ? 'right' : 'left')],
  ];
  const WATCH = '.mr-map, .steps, .hl-under, [data-count]';
  const TILT = '.card.hover, .space-card, .stat, .kpi[data-goto], .bento > .card';
  const TWEEN = '.kpi strong, #sim-price, #quote-fee, #p-fee, #p-total';

  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      show(en.target);
      io.unobserve(en.target);
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' }) : null;

  function show(el) {
    el.classList.add('in');
    if (el.hasAttribute('data-count')) tween(el, true);
    // Une fois apparu : transitions courtes pour le survol et l'inclinaison.
    const d = parseFloat(getComputedStyle(el).getPropertyValue('--d')) || 0;
    setTimeout(() => el.classList.add('done'), (d + 1) * 1000);
  }

  function watch(el) {
    if (el._lvSeen) return;
    el._lvSeen = true;
    if (reduce || !io) { show(el); return; }
    io.observe(el);
  }

  // Prépare un sous-arbre : attribue les animations et l'observe.
  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    AUTO.forEach(([sel, pick]) => {
      const list = root.matches && root.matches(sel) ? [root] : Array.from(root.querySelectorAll(sel));
      list.forEach((el) => {
        if (el.hasAttribute('data-anim')) return;
        const sibs = Array.from(el.parentElement ? el.parentElement.children : [el]).filter((x) => x.matches(sel));
        const i = Math.max(0, sibs.indexOf(el));
        el.setAttribute('data-anim', pick(i));
        el.classList.remove('reveal');
        const inHero = el.closest('.hero');
        el.style.setProperty('--d', (Math.min(i * 0.09, 0.6) + (inHero ? introDelay + 0.3 : 0)).toFixed(2) + 's');
      });
    });
    const targets = [];
    if (root.matches && root.matches('[data-anim], .reveal, ' + WATCH)) targets.push(root);
    root.querySelectorAll('[data-anim], .reveal, ' + WATCH).forEach((el) => targets.push(el));
    targets.forEach(watch);
    root.querySelectorAll(TILT).forEach((el) => el.classList.add('tilt'));
    if (root.matches && root.matches(TILT)) root.classList.add('tilt');
    root.querySelectorAll('.split').forEach(split);
    root.querySelectorAll('.rotator').forEach(rotator);
  }

  // ----- Compteurs : 0 → valeur, en gardant le texte autour -----
  function tween(el, force) {
    if (reduce) return;
    const txt = el.textContent;
    // Texte écrit par l'animation elle-même : on l'ignore.
    if (el._tw && txt === el._frame) return;
    if (!el._tw && !force && txt === el._last) return;
    const m = txt.match(/^([^\d]*)(\d+(?:[\s\u202f\u00a0]\d{3})*)(.*)$/);
    if (!m) return;
    const target = Number(m[2].replace(/\D/g, ''));
    if (!target) return;
    // Nouvelle valeur (même en cours d'animation) : elle remplace la précédente.
    const gen = (el._gen || 0) + 1;
    el._gen = gen;
    el._last = txt;
    el._tw = true;
    const t0 = performance.now();
    const dur = 1100;
    const grouped = /[\s\u202f\u00a0]/.test(m[2]) || target >= 1000;
    const fmt = (n) => (grouped ? n.toLocaleString('fr-FR') : String(n));
    (function step(t) {
      if (el._gen !== gen) return;
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el._frame = k < 1 ? m[1] + fmt(Math.round(target * e)) + m[3] : txt;
      el.textContent = el._frame;
      if (k < 1) requestAnimationFrame(step);
      else el._tw = false;
    })(t0);
  }

  // ----- Titre révélé mot par mot -----
  function split(el) {
    if (el._split || reduce) return;
    el._split = true;
    let i = 0;
    const out = document.createDocumentFragment();
    Array.from(el.childNodes).forEach((n) => {
      const wrap = (node) => {
        const w = document.createElement('span');
        w.className = 'w';
        const inner = document.createElement('span');
        inner.style.setProperty('--i', i++);
        if (introDelay) inner.style.animationDelay = 'calc(' + (introDelay + 0.1) + 's + var(--i) * .07s)';
        inner.appendChild(node);
        w.appendChild(inner);
        out.appendChild(w);
      };
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) out.appendChild(document.createTextNode(' '));
          else wrap(document.createTextNode(part));
        });
      } else {
        wrap(n);
      }
    });
    el.textContent = '';
    el.appendChild(out);
  }

  // ----- Mot qui change (ex. villes) -----
  function rotator(el) {
    if (el._rot || reduce) return;
    el._rot = true;
    const words = (el.getAttribute('data-words') || '').split(',').map((w) => w.trim()).filter(Boolean);
    if (words.length < 2) return;
    let k = 0;
    setInterval(() => {
      el.classList.remove('in-w');
      el.classList.add('out');
      setTimeout(() => {
        k = (k + 1) % words.length;
        el.textContent = words[k];
        el.classList.remove('out');
        el.classList.add('in-w');
      }, 340);
    }, 2600);
  }

  // ----- Contenu ajouté plus tard -----
  let pending = [];
  const mo = new MutationObserver((muts) => {
    muts.forEach((mu) => {
      if (mu.target.nodeType === 1 && mu.target.matches(TWEEN)) tween(mu.target);
      mu.addedNodes.forEach((n) => { if (n.nodeType === 1 && !n.classList.contains('ripple')) pending.push(n); });
    });
    if (pending.length) requestAnimationFrame(flush);
  });
  function flush() {
    const list = pending;
    pending = [];
    list.forEach((n) => {
      if (!n.isConnected) return;
      scan(n);
      if (n.matches(TWEEN)) tween(n);
      n.querySelectorAll(TWEEN).forEach((x) => tween(x));
    });
  }

  // ----- Inclinaison 3D au survol -----
  let tiltEl = null;
  function resetTilt(el) { if (el) { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); el.style.removeProperty('--ty'); } }
  if (finePointer && !reduce) {
    document.addEventListener('pointermove', (e) => {
      const el = e.target.closest && e.target.closest('.tilt');
      if (el !== tiltEl) { resetTilt(tiltEl); tiltEl = el; }
      if (!el) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--rx', (-y * 7).toFixed(2) + 'deg');
      el.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
      el.style.setProperty('--ty', '-6px');
    }, { passive: true });
    document.addEventListener('pointerleave', () => { resetTilt(tiltEl); tiltEl = null; });
  }

  // ----- Onde au clic sur les boutons -----
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest && e.target.closest('.btn');
    if (!b || reduce) return;
    const r = b.getBoundingClientRect();
    const s = Math.max(r.width, r.height);
    const sp = document.createElement('span');
    sp.className = 'ripple';
    sp.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (e.clientX - r.left - s / 2) + 'px;top:' + (e.clientY - r.top - s / 2) + 'px';
    b.appendChild(sp);
    setTimeout(() => sp.remove(), 700);
  });

  // ----- Pages publiques : progression, retour en haut, parallaxe, transitions -----
  function publicExtras() {
    if (!document.querySelector('.site-header') || document.querySelector('.scroll-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'scroll-bar';
    const top = document.createElement('button');
    top.className = 'to-top';
    top.setAttribute('aria-label', 'Revenir en haut');
    top.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>';
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));
    body.append(bar, top);
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.setProperty('--p', h > 0 ? (window.scrollY / h).toFixed(4) : 0);
        top.classList.toggle('show', window.scrollY > 600);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const hero = document.querySelector('.hero');
    if (hero && finePointer && !reduce) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        hero.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      }, { passive: true });
    }
  }

  // Transition douce entre les pages du site (hors API, ancres et nouvel onglet).
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target || a.hasAttribute('download') || a.origin !== location.origin) return;
    if (a.pathname.indexOf('/livreur') !== 0 || a.pathname.indexOf('/api/') === 0) return;
    if (a.pathname === location.pathname) return;
    e.preventDefault();
    body.classList.add('leaving');
    setTimeout(() => { location.href = a.href; }, 260);
  });
  window.addEventListener('pageshow', () => body.classList.remove('leaving'));

  scan(body);
  mo.observe(body, { childList: true, subtree: true });
  publicExtras();

  return { scan, tween, publicExtras };
})();
