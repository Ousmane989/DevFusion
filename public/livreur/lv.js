/* Karat Livreur — utilitaires partagés (pages publiques et espaces). */
window.LV = (function () {
  'use strict';

  const ICONS = {
    truck: '<path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    cart: '<path d="M3 4h2l2.4 11h10.2L20 7H6.2"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/>',
    route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
    box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    phone: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    headset: '<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/><path d="M19 20a4 4 0 0 1-4 2h-2"/>',
    warehouse: '<path d="M3 21V9l9-5 9 5v12"/><path d="M7 21v-8h10v8M7 17h10"/>',
    cash: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.8"/><path d="M6 9.5v5M18 9.5v5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.5a5 5 0 0 1 6 5.5"/>',
    store: '<path d="M4 9.5 5.5 4h13L20 9.5M4 9.5V20h16V9.5M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M10 20v-5h4v5"/>',
    bike: '<circle cx="5.5" cy="17" r="3.5"/><circle cx="18.5" cy="17" r="3.5"/><path d="M5.5 17 9 9h5l4.5 8M9 9 7.5 6H5M14 9l1.5-3H18"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
    chat: '<path d="M4 5h16v11H8l-4 4z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    star: '<path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4l-5.5 2.9 1-6.2L3 9.7l6.2-.9z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>',
    logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }
  const WA_SVG = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3z"/></svg>';

  function brand(sub) {
    return '<a href="/livreur" class="brand"><span class="brand-mark">' + icon('truck') + '</span><span>Karat <span class="gold">Livreur</span><small>' + (sub || 'Livraison · Mauritanie') + '</small></span></a>';
  }

  async function api(path, body, method) {
    const res = await fetch('/api/livreur' + path, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch (_) { /* réponse vide */ }
    return { ok: res.ok, status: res.status, data };
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function money(n) { return Math.round(Number(n) || 0).toLocaleString('fr-FR') + ' MRU'; }
  function phoneFmt(p) {
    const d = String(p || '').replace(/\D/g, '');
    if (d.length === 11 && d.startsWith('222')) return '+222 ' + d.slice(3).replace(/(\d{2})(?=\d)/g, '$1 ');
    return p || '';
  }
  function date(s, withTime) {
    if (!s) return '';
    const d = new Date(String(s).replace(' ', 'T') + 'Z');
    if (isNaN(d)) return s;
    const opt = withTime ? { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' } : { day: '2-digit', month: 'short', year: 'numeric' };
    return d.toLocaleString('fr-FR', opt);
  }
  function badge(status, label) {
    return '<span class="badge st-' + esc(status) + '">' + esc(label || status) + '</span>';
  }
  const USER_STATUS = { pending: 'En attente', active: 'Actif', suspended: 'Suspendu' };

  function msg(el, type, text) {
    if (!el) return;
    el.className = 'form-msg show ' + type;
    el.textContent = text;
  }
  function clearMsg(el) { if (el) el.className = 'form-msg'; }

  let toastTimer;
  function toast(text, isError) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = text;
    t.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.className = 'toast' + (isError ? ' error' : ''); }, 3200);
  }

  // Modale générique : LV.modal(titre, html, {wide}) -> élément du contenu.
  function modal(title, html, opts) {
    let m = document.getElementById('lv-modal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'lv-modal';
      m.className = 'modal';
      m.innerHTML = '<div class="modal-box"><button class="modal-close" aria-label="Fermer">×</button><h2></h2><div class="modal-body"></div></div>';
      document.body.appendChild(m);
      m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('.modal-close')) closeModal(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    }
    m.querySelector('.modal-box').classList.toggle('wide', !!(opts && opts.wide));
    m.querySelector('h2').textContent = title;
    const body = m.querySelector('.modal-body');
    body.innerHTML = html;
    m.classList.add('open');
    return body;
  }
  function closeModal() { const m = document.getElementById('lv-modal'); if (m) m.classList.remove('open'); }

  function formData(form) {
    const o = {};
    new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
    return o;
  }

  // Envoi de formulaire avec bouton désactivé + message d'erreur.
  async function submit(form, path, extra, method) {
    const btn = form.querySelector('[type=submit]');
    const box = form.querySelector('.form-msg');
    clearMsg(box);
    if (btn) btn.disabled = true;
    try {
      const r = await api(path, Object.assign(formData(form), extra || {}), method);
      if (!r.ok) msg(box, 'error', r.data.error || 'Une erreur est survenue.');
      return r;
    } catch (_) {
      msg(box, 'error', 'Connexion impossible. Vérifiez votre réseau.');
      return { ok: false, data: {} };
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  let infoCache;
  function info() {
    if (!infoCache) infoCache = api('/info').then((r) => r.data);
    return infoCache;
  }

  function zoneOptions(zones, selected) {
    const groups = {};
    zones.forEach((z) => { (groups[z.region] = groups[z.region] || []).push(z); });
    return '<option value="">Choisir la zone…</option>' + Object.keys(groups).map((g) =>
      '<optgroup label="' + esc(g) + '">' + groups[g].map((z) =>
        '<option value="' + z.id + '"' + (String(selected) === String(z.id) ? ' selected' : '') + '>' + esc(z.name) + ' — ' + money(z.price) + '</option>').join('') + '</optgroup>').join('');
  }

  // ----- En-tête / pied de page publics -----
  function publicChrome() {
    const h = document.getElementById('lv-header');
    if (h) {
      h.outerHTML = '<header class="site-header"><div class="container nav">' + brand() +
        '<ul class="nav-links">' +
        '<li><a href="/livreur#services">Services</a></li><li><a href="/livreur#fonctionnement">Fonctionnement</a></li>' +
        '<li><a href="/livreur#tarifs">Tarifs</a></li><li><a href="/livreur#couverture">Couverture</a></li>' +
        '<li><a href="/livreur/suivi">Suivi</a></li><li><a href="/livreur#contact">Contact</a></li></ul>' +
        '<div class="nav-cta"><a href="/livreur/connexion" class="btn btn-ghost btn-sm">Connexion</a>' +
        '<a href="/livreur/inscription" class="btn btn-primary btn-sm">Devenir partenaire</a></div>' +
        '<button class="nav-toggle" aria-label="Menu"><span></span><span></span><span></span></button></div></header>';
      const header = document.querySelector('.site-header');
      header.querySelector('.nav-toggle').addEventListener('click', () => header.classList.toggle('open'));
      header.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => header.classList.remove('open')));
    }
    const f = document.getElementById('lv-footer');
    if (f) {
      f.outerHTML = '<footer class="site-footer"><div class="container"><div class="footer-grid">' +
        '<div>' + brand() + '<p class="dim" style="margin-top:14px;max-width:320px;font-size:14.5px">Livraison express, e-commerce et colis à Nouakchott et dans toutes les wilayas de Mauritanie. Paiement à la livraison, suivi en temps réel.</p></div>' +
        '<div><h4>Services</h4><ul><li><a href="/livreur#services">Livraison express</a></li><li><a href="/livreur#services">Livraison e-commerce</a></li><li><a href="/livreur#services">Course à la demande</a></li><li><a href="/livreur#services">Colis & interurbain</a></li></ul></div>' +
        '<div><h4>Liens utiles</h4><ul><li><a href="/livreur/suivi">Suivre un colis</a></li><li><a href="/livreur/commander">Commander une course</a></li><li><a href="/livreur/inscription">Devenir partenaire</a></li><li><a href="/livreur/inscription-coursier">Devenir livreur</a></li></ul></div>' +
        '<div><h4>Espaces</h4><ul><li><a href="/livreur/partenaire">Espace partenaire</a></li><li><a href="/livreur/coursier">Espace livreur</a></li><li><a href="/livreur/agence">Espace agence</a></li><li><a href="/livreur/connexion">Connexion</a></li></ul></div>' +
        '</div><div class="footer-bottom"><span>© ' + new Date().getFullYear() + ' Karat Livreur — Nouakchott, Mauritanie</span><span data-contact="phone-text"></span></div></div></footer>' +
        '<a class="wa-float" data-contact="wa" href="#" target="_blank" rel="noopener" aria-label="WhatsApp">' + WA_SVG + '</a>';
    }
    fillContacts();
    reveal();
  }

  async function fillContacts() {
    const d = await info();
    if (!d || !d.contact) return;
    const c = d.contact;
    const tel = 'tel:' + String(c.phone).replace(/[^+\d]/g, '');
    document.querySelectorAll('[data-contact]').forEach((el) => {
      const k = el.getAttribute('data-contact');
      if (k === 'wa') el.href = 'https://wa.me/' + c.whatsapp;
      else if (k === 'phone') { el.href = tel; const s = el.querySelector('span'); if (s) s.textContent = c.phone; }
      else if (k === 'phone-text') el.textContent = c.phone + ' · ' + c.email;
      else if (k === 'email') { el.href = 'mailto:' + c.email; const s = el.querySelector('span'); if (s) s.textContent = c.email; }
      else if (k === 'address') { const s = el.querySelector('span') || el; s.textContent = c.address; }
    });
  }

  function reveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach((e) => io.observe(e));
  }

  // ----- Coque des espaces (barre latérale + onglets) -----
  // sections : [{ id, label, icon }] ; chaque section a un <div data-view="id">.
  async function appShell(role, sub, sections, onShow) {
    const me = await api('/me');
    if (!me.ok || me.data.user.role !== role) {
      location.href = '/livreur/connexion?suite=' + encodeURIComponent(location.pathname);
      return null;
    }
    const user = me.data.user;
    const app = document.querySelector('.app');
    const side = app.querySelector('.sidebar');
    side.innerHTML = brand(sub) + '<nav class="side-nav">' + sections.map((s) =>
      '<button data-go="' + s.id + '">' + icon(s.icon) + '<span>' + esc(s.label) + '</span><em class="count hidden" data-count="' + s.id + '"></em></button>').join('') +
      '</nav><div class="side-foot"><strong>' + esc(user.business_name || user.name) + '</strong><span class="muted">' + esc(phoneFmt(user.phone)) + '</span>' +
      '<button class="btn btn-ghost btn-sm btn-block" data-logout>' + icon('logout', 'ico') + ' Déconnexion</button></div>';
    const title = app.querySelector('.topbar h1');
    function show(id) {
      const s = sections.find((x) => x.id === id) || sections[0];
      side.querySelectorAll('[data-go]').forEach((b) => b.classList.toggle('active', b.dataset.go === s.id));
      document.querySelectorAll('[data-view]').forEach((v) => v.classList.toggle('hidden', v.dataset.view !== s.id));
      title.textContent = s.label;
      app.classList.remove('nav-open');
      if (location.hash.slice(1) !== s.id) history.replaceState(null, '', '#' + s.id);
      onShow(s.id);
      window.scrollTo(0, 0);
    }
    side.addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (b) show(b.dataset.go);
      if (e.target.closest('[data-logout]')) logout();
    });
    document.addEventListener('click', (e) => {
      const g = e.target.closest('[data-goto]');
      if (g) { e.preventDefault(); show(g.dataset.goto); }
    });
    app.querySelector('.menu-btn').addEventListener('click', (e) => { e.stopPropagation(); app.classList.toggle('nav-open'); });
    app.querySelector('.main').addEventListener('click', () => app.classList.remove('nav-open'));
    // La page appelle start() une fois ses vues prêtes.
    return { user, show, start: () => show(location.hash.slice(1)) };
  }

  function setCount(id, n) {
    const el = document.querySelector('[data-count="' + id + '"]');
    if (!el) return;
    el.textContent = n;
    el.classList.toggle('hidden', !n);
  }

  async function logout() {
    await api('/logout', {});
    location.href = '/livreur/connexion';
  }

  return {
    icon, brand, api, esc, money, phoneFmt, date, badge, USER_STATUS, msg, clearMsg, toast, modal, closeModal,
    formData, submit, info, zoneOptions, publicChrome, fillContacts, appShell, setCount, logout, WA_SVG,
  };
})();
