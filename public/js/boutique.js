/* ==================================================================
   Karat — vitrine publique d'une boutique.
   Chaque thème a une MISE EN PAGE différente (layout), pas seulement
   une couleur : luxe, warm, fresh, tech, magazine, minimal.
   Données : window.__KARAT_STORE__ (démo) ou /api/public/store/:slug.
   ================================================================== */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => Number(Math.round(n)).toLocaleString('fr-FR');
  const initial = (n) => (String(n || '?').trim()[0] || '?').toUpperCase();
  const root = document.getElementById('store');
  let SCUR = 'MRU';
  const sMain = (n) => money(n) + ' ' + SCUR;
  const sAlt = (n) => { const r = 6; const a = SCUR === 'FCFA' ? { v: Math.round(n / r), c: 'MRU' } : { v: Math.round(n * r), c: 'FCFA' }; return '≈ ' + money(a.v) + ' ' + a.c; };

  function hexToRgb(hex) { const h = hex.replace('#', ''); const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h; return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]; }
  function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

  function applyTheme(t) {
    const s = root.style;
    s.setProperty('--bg', t.bg); s.setProperty('--surface', t.surface); s.setProperty('--accent', t.accent);
    s.setProperty('--accent2', t.accent2); s.setProperty('--text', t.text);
    s.setProperty('--muted', rgba(t.text, 0.62)); s.setProperty('--line', rgba(t.text, 0.14));
    s.setProperty('--soft', rgba(t.text, 0.05)); s.setProperty('--onaccent', '#1a1400');
    const serif = "'Cormorant Garamond','Playfair Display',Georgia,serif";
    const sans = "'Jost','Segoe UI',system-ui,sans-serif";
    s.setProperty('--head', t.font === 'sans' ? sans : serif);
    s.setProperty('--body', sans);
  }

  function visual(p, extra) {
    return `<div class="sf-img ${extra || ''}"><span class="sf-emblem">${esc(initial(p.name))}</span><span class="sf-view">Voir le produit →</span></div>`;
  }
  function price(p) { return `<div class="sf-price"><span class="sf-mru">${sMain(p.price)}</span><span class="sf-fcfa">${sAlt(p.price)}</span></div>`; }
  function addBtn(p, label) { return `<button class="sf-add" data-add="${p.id}">${label || 'Ajouter au panier'}</button>`; }

  function footer(d) {
    const c = d.contact || {};
    const items = [];
    if (c.phone) items.push(`<a href="tel:${esc(c.phone)}">📞 ${esc(c.phone)}</a>`);
    if (c.whatsapp) items.push(`<a href="https://wa.me/${esc(String(c.whatsapp).replace(/[^0-9]/g, ''))}" target="_blank" rel="noopener">💬 ${esc(c.whatsapp)}</a>`);
    if (c.email) items.push(`<a href="mailto:${esc(c.email)}">✉️ ${esc(c.email)}</a>`);
    if (c.address) items.push(`<span>📍 ${esc(c.address)}</span>`);
    const contact = items.length ? `<div class="sf-contact">${items.join('')}</div>` : '';
    const about = d.about ? `<p class="sf-about">${esc(d.about)}</p>` : '';
    return `<footer class="sf-footer"><div class="sf-foot-in">
      <div class="sf-foot-brand">${esc(d.shopName)}</div>
      <p class="sf-foot-tag">${esc(d.tagline)}</p>
      ${about}
      ${contact}
      <div class="sf-foot-meta"><span>© ${new Date().getFullYear()} ${esc(d.shopName)}</span><span class="sf-powered">Propulsé par <strong>Karat</strong> 💎</span></div>
    </div></footer>`;
  }
  function empty() { return `<div class="sf-empty"><p>La boutique n'a pas encore de produits.</p><p class="sf-muted">Revenez très bientôt !</p></div>`; }
  const cartBtn = (n) => `<button class="sf-cart" aria-label="Panier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg><span class="sf-cart-count">0</span></button>`;

  // ============================================================
  // Layouts
  // ============================================================
  const layouts = {
    // 1) Luxe — hero centré, cartes bordées élégantes
    luxe(d) {
      const cards = d.products.map((p) => `<article class="sf-card" data-detail="${p.id}">${visual(p, 'tall')}<div class="sf-card-b"><span class="sf-cat">${esc(p.category)}</span><h3>${esc(p.name)}</h3>${p.description ? `<p class="sf-desc">${esc(p.description)}</p>` : ''}${price(p)}${addBtn(p)}</div></article>`).join('');
      return `<header class="sf-head center"><div class="sf-logo-dot"></div><div class="sf-brand">${esc(d.shopName)}</div><nav class="sf-nav"><a>Accueil</a><a>Boutique</a><a>Contact</a></nav></header>
        <section class="sf-hero center"><span class="sf-eyebrow">Maison ${esc(d.shopName)}</span><h1>${esc(d.tagline)}</h1>${d.description ? `<p class="sf-lead">${esc(d.description)}</p>` : ''}<a class="sf-btn" href="#produits">Découvrir la collection</a><div class="sf-divider"></div></section>
        <section class="sf-products" id="produits"><h2 class="sf-sec-title">Notre sélection</h2>${d.products.length ? `<div class="sf-grid cols3">${cards}</div>` : empty()}</section>${footer(d)}`;
    },
    // 2) Warm — hero deux colonnes, band de promesses, grandes cartes rondes
    warm(d) {
      const cards = d.products.map((p) => `<article class="sf-card round" data-detail="${p.id}">${visual(p)}<div class="sf-card-b"><h3>${esc(p.name)}</h3><span class="sf-cat">${esc(p.category)}</span>${price(p)}${addBtn(p, 'Commander')}</div></article>`).join('');
      const collage = d.products.slice(0, 4).map((p) => `<span class="sf-chip">${esc(initial(p.name))}</span>`).join('');
      return `<header class="sf-head split"><div class="sf-brand">${esc(d.shopName)}</div>${cartBtn()}</header>
        <section class="sf-hero two"><div class="sf-hero-txt"><span class="sf-eyebrow">Bienvenue</span><h1>${esc(d.tagline)}</h1><p class="sf-lead">${esc(d.description || 'Des produits choisis avec soin, livrés près de chez vous.')}</p><a class="sf-btn" href="#produits">Voir les produits</a></div><div class="sf-hero-art"><div class="sf-halo"></div><div class="sf-collage">${collage}</div></div></section>
        <div class="sf-band"><span>🚚 Livraison locale</span><span>📱 Paiement mobile</span><span>✋ Sélection soignée</span></div>
        <section class="sf-products" id="produits"><h2 class="sf-sec-title">Nos produits</h2>${d.products.length ? `<div class="sf-grid cols2">${cards}</div>` : empty()}</section>${footer(d)}`;
    },
    // 3) Fresh — bannière pleine largeur, pills catégories, grille dense 4 col
    fresh(d) {
      const cards = d.products.map((p) => `<article class="sf-card compact" data-detail="${p.id}">${visual(p)}<div class="sf-card-b"><span class="sf-tag">${esc(p.category)}</span><h3>${esc(p.name)}</h3><div class="sf-row">${price(p)}<button class="sf-plus" data-add="${p.id}">+</button></div></div></article>`).join('');
      const pills = ['Tout'].concat(d.categories || []).map((c, i) => `<button class="sf-pill ${i === 0 ? 'on' : ''}">${esc(c)}</button>`).join('');
      return `<header class="sf-head bar"><div class="sf-brand">${esc(d.shopName)}</div><nav class="sf-nav pills"><a class="on">Accueil</a><a>Produits</a><a>Contact</a></nav>${cartBtn()}</header>
        <section class="sf-banner"><div class="sf-banner-in"><h1>${esc(d.tagline)}</h1><p>${esc(d.description || 'Découvrez notre catalogue, frais et de saison.')}</p></div></section>
        <div class="sf-pills">${pills}</div>
        <section class="sf-products"><div class="sf-grid cols4">${d.products.length ? cards : empty()}</div></section>${footer(d)}`;
    },
    // 4) Tech — hero scindé, cartes à survol marqué
    tech(d) {
      const cards = d.products.map((p) => `<article class="sf-card hoverlift" data-detail="${p.id}">${visual(p)}<div class="sf-card-b"><h3>${esc(p.name)}</h3><span class="sf-cat">${esc(p.category)}</span>${price(p)}<a class="sf-link" data-add="${p.id}">Ajouter au panier →</a></div></article>`).join('');
      const feats = d.products.slice(0, 2).map((p) => `<div class="sf-feat">${visual(p)}<div><h4>${esc(p.name)}</h4>${price(p)}</div></div>`).join('');
      return `<header class="sf-head sticky"><div class="sf-brand">${esc(d.shopName)}</div><nav class="sf-nav"><a>Accueil</a><a>Catalogue</a><a>À propos</a></nav>${cartBtn()}</header>
        <section class="sf-hero grid"><div class="sf-hero-txt"><span class="sf-eyebrow">Nouvelle collection</span><h1>${esc(d.tagline)}</h1><p class="sf-lead">${esc(d.description || 'Le meilleur, livré rapidement et payé simplement.')}</p><div class="sf-cta-row"><a class="sf-btn" href="#produits">Acheter</a><a class="sf-btn ghost" href="#produits">Explorer</a></div></div><div class="sf-hero-cards">${feats || '<div class="sf-halo"></div>'}</div></section>
        <section class="sf-products" id="produits"><div class="sf-sec-row"><h2 class="sf-sec-title">Catalogue</h2><span class="sf-count">${d.products.length} article(s)</span></div>${d.products.length ? `<div class="sf-grid cols3">${cards}</div>` : empty()}</section>${footer(d)}`;
    },
    // 5) Magazine — immense titre, produit vedette, tailles mixtes
    magazine(d) {
      const feat = d.products[0];
      const rest = d.products.slice(1).map((p) => `<article class="sf-card overlay" data-detail="${p.id}">${visual(p, 'cover')}<div class="sf-ov"><h3>${esc(p.name)}</h3>${price(p)}</div></article>`).join('');
      return `<header class="sf-head mag"><div class="sf-brand up">${esc(d.shopName)}</div><nav class="sf-nav"><a>Boutique</a><a>Éditos</a><a>Contact</a></nav></header>
        <section class="sf-hero mag"><div class="sf-mag-title"><span class="sf-eyebrow">La sélection</span><h1>${esc(d.tagline)}</h1><a class="sf-btn" href="#produits">Explorer</a></div>${feat ? `<div class="sf-mag-feat" data-detail="${feat.id}">${visual(feat, 'cover')}<div class="sf-ov big"><span class="sf-cat">${esc(feat.category)}</span><h3>${esc(feat.name)}</h3>${price(feat)}${addBtn(feat)}</div></div>` : ''}</section>
        <section class="sf-products" id="produits"><h2 class="sf-sec-title">Toute la boutique</h2>${d.products.length ? `<div class="sf-grid cols3 mag">${rest || ''}</div>` : empty()}</section>${footer(d)}`;
    },
    // 6) Minimal — clair, épuré, beaucoup de vide
    minimal(d) {
      const cards = d.products.map((p) => `<article class="sf-card bare" data-detail="${p.id}">${visual(p, 'tall')}<h3>${esc(p.name)}</h3><span class="sf-cat">${esc(p.category)}</span>${price(p)}<button class="sf-add ghost" data-add="${p.id}">Ajouter</button></article>`).join('');
      return `<header class="sf-head mini"><div class="sf-brand">${esc(d.shopName)}</div></header>
        <section class="sf-hero mini"><span class="sf-eyebrow">${esc(d.description || 'Boutique en ligne')}</span><h1>${esc(d.tagline)}</h1><a class="sf-underline" href="#produits">Voir les produits</a></section>
        <section class="sf-products" id="produits">${d.products.length ? `<div class="sf-grid cols3 airy">${cards}</div>` : empty()}</section>${footer(d)}`;
    },
  };

  // ============================================================
  // Rendu + interactions
  // ============================================================
  // ============================================================
  // Panier + commande (paiement à la livraison)
  // ============================================================
  let cart = [];        // [{ id, name, priceMru, qty }]
  let data = null;      // données boutique courantes
  let byId = {};        // produits indexés par id

  function toast(text) {
    let t = root.querySelector('.sf-toast');
    if (!t) { t = document.createElement('div'); t.className = 'sf-toast'; root.appendChild(t); }
    t.textContent = text; t.classList.add('show');
    clearTimeout(t._to); t._to = setTimeout(() => t.classList.remove('show'), 1700);
  }
  const cartCount = () => cart.reduce((n, i) => n + i.qty, 0);
  const cartSubtotal = () => cart.reduce((s, i) => s + i.price * i.qty, 0);
  function updateBadges() { const n = cartCount(); root.querySelectorAll('.sf-cart-count, .sf-fab-count').forEach((e) => (e.textContent = n)); const fab = root.querySelector('.sf-fab'); if (fab) fab.classList.toggle('has', n > 0); }
  function addToCart(id, qty) {
    qty = Math.max(1, qty || 1);
    const p = byId[id]; if (!p) return;
    const line = cart.find((i) => i.id === p.id);
    if (line) line.qty += qty; else { cart.push({ id: p.id, name: p.name, price: p.price, qty }); track('add_cart'); }
    updateBadges(); toast('« ' + p.name + ' » ajouté au panier'); renderCart();
  }

  // -------- Fiche produit (detail + commande) --------
  let detailQty = 1;
  function openDetail(id) {
    const p = byId[id]; if (!p) return;
    detailQty = 1;
    const modal = root.querySelector('.sf-detail'); if (!modal) return;
    const stock = p.stock > 0
      ? `<span class="sf-instock">● En stock${p.stock <= 5 ? ' — plus que ' + p.stock : ''}</span>`
      : '<span class="sf-oos">● Rupture de stock</span>';
    modal.querySelector('.sf-detail-body').innerHTML = `
      <div class="sf-detail-grid">
        <div class="sf-detail-visual">${visual(p, 'cover')}</div>
        <div class="sf-detail-info">
          <span class="sf-cat">${esc(p.category)}</span>
          <h3>${esc(p.name)}</h3>
          <div class="sf-detail-price">${sMain(p.price)} <span class="sf-detail-alt">${sAlt(p.price)}</span></div>
          <p class="sf-detail-desc${p.description ? '' : ' sf-muted'}">${esc(p.description || 'Aucune description pour ce produit.')}</p>
          <div class="sf-detail-stock">${stock}</div>
          <div class="sf-detail-qty"><span>Quantité</span><div class="sf-qty"><button data-dq="-">−</button><span class="sf-dqv">1</span><button data-dq="+">+</button></div></div>
          <div class="sf-detail-actions">
            <button class="sf-btn ghost" data-detail-add="${p.id}">Ajouter au panier</button>
            <button class="sf-btn" data-detail-order="${p.id}">Commander maintenant</button>
          </div>
          <p class="sf-detail-note">💵 Paiement à la livraison</p>
        </div>
      </div>`;
    modal.querySelectorAll('[data-dq]').forEach((b) => b.addEventListener('click', () => {
      detailQty = Math.max(1, detailQty + (b.dataset.dq === '+' ? 1 : -1));
      modal.querySelector('.sf-dqv').textContent = detailQty;
    }));
    modal.querySelector('[data-detail-add]').addEventListener('click', () => { addToCart(p.id, detailQty); closeDetail(); });
    modal.querySelector('[data-detail-order]').addEventListener('click', () => { addToCart(p.id, detailQty); closeDetail(); openCart(); });
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDetail() { const m = root.querySelector('.sf-detail'); if (m) m.classList.remove('open'); document.body.style.overflow = ''; }

  // Analytics réels : visite (avec source) et ajout au panier.
  function detectSource() {
    const q = new URLSearchParams(location.search).get('src');
    if (q) return ['direct', 'social', 'search', 'whatsapp', 'referral'].includes(q) ? q : 'referral';
    const ref = document.referrer || '';
    if (!ref) return 'direct';
    if (/facebook|instagram|tiktok|t\.co|twitter|x\.com|snapchat/i.test(ref)) return 'social';
    if (/whatsapp|wa\.me/i.test(ref)) return 'whatsapp';
    if (/google|bing|yahoo|duckduck|search/i.test(ref)) return 'search';
    return 'referral';
  }
  function track(type, source) {
    if (window.__KARAT_TRACK__) { window.__KARAT_TRACK__(type, source || 'direct'); return; }
    if (!data || !data.slug) return;
    const url = '/api/public/store/' + encodeURIComponent(data.slug) + (type === 'visit' ? '/visit' : '/event');
    const body = type === 'visit' ? { source: source || 'direct' } : { type };
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
  }
  function setQty(id, delta) { const line = cart.find((i) => i.id === id); if (!line) return; line.qty += delta; if (line.qty <= 0) cart = cart.filter((i) => i.id !== id); updateBadges(); renderCart(); }

  function shippingFee(city) {
    const sh = (data && data.shipping) || { zones: [], freeOver: 0 };
    const zone = (sh.zones || []).find((z) => z.zone.toLowerCase() === String(city || '').toLowerCase());
    let fee = zone ? zone.fee : 0;
    if (sh.freeOver && cartSubtotal() >= sh.freeOver) fee = 0;
    return { fee, known: !!zone };
  }

  function grabFields() {
    const g = (id) => { const el = root.querySelector(id); return el ? el.value : ''; };
    return { name: g('#sf-name'), phone: g('#sf-phone'), city: g('#sf-city'), address: g('#sf-address'), note: g('#sf-note') };
  }
  function setFields(v) {
    const s = (id, val) => { const el = root.querySelector(id); if (el) el.value = val; };
    s('#sf-name', v.name); s('#sf-phone', v.phone); s('#sf-address', v.address); s('#sf-note', v.note);
  }
  function renderCart() {
    const panel = root.querySelector('.sf-drawer-body'); if (!panel) return;
    if (!cart.length) { panel.innerHTML = `<div class="sf-cart-empty"><p>Votre panier est vide.</p><p class="sf-muted">Ajoutez des produits pour commander.</p></div>`; return; }
    const prev = grabFields();
    const zones = (data.shipping && data.shipping.zones) || [];
    const city = prev.city || '';
    const sub = cartSubtotal();
    const ship = shippingFee(city);
    const total = sub + (city ? ship.fee : 0);
    panel.innerHTML = `
      <div class="sf-lines">${cart.map((i) => `<div class="sf-line"><div class="sf-line-i">${esc(initial(i.name))}</div><div class="sf-line-b"><div class="sf-line-n">${esc(i.name)}</div><div class="sf-line-p">${sMain(i.price)}</div></div><div class="sf-qty"><button data-q="-" data-id="${i.id}">−</button><span>${i.qty}</span><button data-q="+" data-id="${i.id}">+</button></div></div>`).join('')}</div>
      <form class="sf-checkout" id="sf-checkout">
        <h4>Vos coordonnées</h4>
        <input id="sf-name" placeholder="Nom complet" required />
        <input id="sf-phone" placeholder="Téléphone" required />
        <select id="sf-city" required><option value="">Ville de livraison…</option>${zones.map((z) => `<option value="${esc(z.zone)}" ${z.zone === city ? 'selected' : ''}>${esc(z.zone)} — ${money(z.fee)} MRU</option>`).join('')}</select>
        <input id="sf-address" placeholder="Adresse / quartier (facultatif)" />
        <textarea id="sf-note" rows="2" placeholder="Note pour le livreur (facultatif)"></textarea>
        <div class="sf-cod">💵 <div><strong>Paiement à la livraison</strong><span>Vous réglez ${sMain(total)} en espèces à la réception.</span></div></div>
        <div class="sf-totals"><div><span>Sous-total</span><span>${sMain(sub)}</span></div><div><span>Livraison</span><span>${city ? (ship.fee ? sMain(ship.fee) : 'Offerte') : '—'}</span></div><div class="sf-grand"><span>Total</span><span>${sMain(total)}</span></div></div>
        <button type="submit" class="sf-btn sf-confirm">Confirmer la commande</button>
        <p class="sf-msg" id="sf-msg"></p>
      </form>`;
    setFields(prev);
    panel.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => setQty(Number(b.dataset.id), b.dataset.q === '+' ? 1 : -1)));
    const sel = panel.querySelector('#sf-city'); if (sel) sel.addEventListener('change', renderCart);
    panel.querySelector('#sf-checkout').addEventListener('submit', submitOrder);
  }

  async function submitOrder(e) {
    e.preventDefault();
    const msg = root.querySelector('#sf-msg');
    const name = root.querySelector('#sf-name').value.trim();
    const phone = root.querySelector('#sf-phone').value.trim();
    const city = root.querySelector('#sf-city').value;
    if (name.length < 2 || phone.length < 6 || !city) { if (msg) { msg.textContent = 'Renseignez votre nom, téléphone et ville.'; msg.className = 'sf-msg err'; } return; }
    const payload = { name, phone, city, address: root.querySelector('#sf-address').value.trim(), note: root.querySelector('#sf-note').value.trim(), items: cart.map((i) => ({ id: i.id, qty: i.qty })) };
    const btn = root.querySelector('.sf-confirm'); if (btn) { btn.disabled = true; btn.textContent = 'Envoi…'; }
    const r = await placeOrder(payload);
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmer la commande'; }
    if (!r.ok) { if (msg) { msg.textContent = (r.data && (r.data.error || (r.data.errors && Object.values(r.data.errors)[0]))) || 'Commande impossible.'; msg.className = 'sf-msg err'; } return; }
    const d = r.data;
    cart = []; updateBadges();
    root.querySelector('.sf-drawer-body').innerHTML = `<div class="sf-done"><div class="sf-check">✓</div><h4>Commande confirmée !</h4><p class="sf-ref">Référence ${esc(d.ref)}</p><p>Total à payer <strong>à la livraison</strong> : ${sMain(d.total)}<br/><span class="sf-muted">(dont ${sMain(d.shipping)} de livraison)</span></p><p class="sf-muted">Le commerçant vous contactera pour organiser la livraison.</p><button class="sf-btn ghost" data-close>Continuer mes achats</button></div>`;
    root.querySelector('[data-close]').addEventListener('click', closeCart);
  }

  async function placeOrder(payload) {
    if (window.__KARAT_PLACE_ORDER__) return window.__KARAT_PLACE_ORDER__(payload);
    try {
      const res = await fetch('/api/public/store/' + encodeURIComponent(data.slug) + '/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      let d = {}; try { d = await res.json(); } catch (_) {}
      return { ok: res.ok, data: d };
    } catch (e) { return { ok: false, data: {} }; }
  }

  function openCart() { const dr = root.querySelector('.sf-drawer'); if (dr) { renderCart(); dr.classList.add('open'); } }
  function closeCart() { const dr = root.querySelector('.sf-drawer'); if (dr) dr.classList.remove('open'); }

  function mountChrome() {
    const fab = document.createElement('button');
    fab.className = 'sf-fab'; fab.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg> Panier <span class="sf-fab-count">0</span>`;
    fab.addEventListener('click', openCart); root.appendChild(fab);
    const dr = document.createElement('div');
    dr.className = 'sf-drawer';
    dr.innerHTML = `<div class="sf-drawer-ov"></div><aside class="sf-drawer-p"><div class="sf-drawer-h"><h3>Votre panier</h3><button class="sf-x" aria-label="Fermer">✕</button></div><div class="sf-drawer-body"></div></aside>`;
    root.appendChild(dr);
    dr.querySelector('.sf-drawer-ov').addEventListener('click', closeCart);
    dr.querySelector('.sf-x').addEventListener('click', closeCart);

    // Fiche produit (modale)
    const det = document.createElement('div');
    det.className = 'sf-detail';
    det.innerHTML = `<div class="sf-detail-ov"></div><div class="sf-detail-box"><button class="sf-detail-x" aria-label="Fermer">✕</button><div class="sf-detail-body"></div></div>`;
    root.appendChild(det);
    det.querySelector('.sf-detail-ov').addEventListener('click', closeDetail);
    det.querySelector('.sf-detail-x').addEventListener('click', closeDetail);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDetail(); closeCart(); } });

    root.querySelectorAll('.sf-cart').forEach((b) => b.addEventListener('click', openCart));
    root.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); addToCart(Number(b.dataset.add)); }));
    // Clic sur une carte produit -> fiche detail (sauf sur le bouton d'ajout)
    root.querySelectorAll('[data-detail]').forEach((el) => el.addEventListener('click', (e) => {
      if (e.target.closest('[data-add]')) return;
      openDetail(Number(el.dataset.detail));
    }));
  }

  function render(d) {
    const t = d.themeData;
    SCUR = d.currency || 'MRU';
    if (d.heroTitle) d.tagline = d.heroTitle; // le titre principal prime sur le slogan
    data = d; cart = []; byId = {};
    (d.products || []).forEach((p) => (byId[p.id] = p));
    applyTheme(t);
    root.className = 'storefront lay-' + (t.layout || 'luxe');
    root.innerHTML = (layouts[t.layout] || layouts.luxe)(d);
    mountChrome();
    updateBadges();
    document.title = d.shopName + ' — Boutique Karat';
    track('visit', detectSource());
  }

  async function load() {
    if (window.__KARAT_STORE__) { render(window.__KARAT_STORE__); return; }
    const m = location.pathname.match(/\/boutique\/([^/]+)/);
    const slug = m ? decodeURIComponent(m[1]) : '';
    try {
      const res = await fetch('/api/public/store/' + encodeURIComponent(slug), { credentials: 'same-origin' });
      if (!res.ok) throw new Error('404');
      render(await res.json());
    } catch (e) {
      root.className = 'storefront lay-luxe';
      root.innerHTML = '<div class="sf-empty" style="min-height:80vh;display:grid;place-content:center;text-align:center"><p>Boutique introuvable.</p><p class="sf-muted"><a href="/" style="color:inherit">Retour à Karat</a></p></div>';
    }
  }

  window.KaratStore = { render };
  if (!window.__KARAT_SPA__) document.addEventListener('DOMContentLoaded', load);
})();
