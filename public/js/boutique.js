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

  function isNew(p) {
    if (!p.createdAt) return false;
    const t = new Date(String(p.createdAt).replace(' ', 'T') + 'Z').getTime();
    return Date.now() - t < 14 * 86400000;
  }
  const hasPromo = (p) => p.compareAt && p.compareAt > p.price;
  const discountPct = (p) => Math.round((1 - p.price / p.compareAt) * 100);
  // Icône illustrative selon la catégorie (rend la vitrine plus jolie même
  // sans photo). Renvoie un tracé SVG.
  function catIcon(cat) {
    const c = String(cat || '').toLowerCase();
    if (/mode|vêtement|habill|textile/.test(c)) return '<path d="M8 4l4 2 4-2 4 3.2-3 2.8v9.5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V10L4 7.2 8 4z"/>';
    if (/cosm|beaut|soin|parfum/.test(c)) return '<path d="M10 3h4v3h-4zM9 6h6l1 3v10a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V9l1-3z"/><path d="M8.5 13h7"/>';
    if (/élect|electro|tech|téléph|phone|informa/.test(c)) return '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M10.5 18h3"/>';
    if (/alim|nourri|food|boisson|thé|the|café|cafe/.test(c)) return '<path d="M6 8h11v6a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V8z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2"/><path d="M9 3v2M12 3v2"/>';
    if (/artis|maroqu|cuir|sac|panier/.test(c)) return '<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8a3 3 0 0 1 6 0"/>';
    if (/access|bijou|montre|horlog/.test(c)) return '<circle cx="12" cy="12" r="5"/><path d="M12 9v3l2 1M9 4h6M9 20h6"/>';
    return '<path d="M6 4h12l3 5-9 11L3 9l3-5z"/><path d="M3 9h18M9 4l3 16 3-16"/>'; // gemme (défaut)
  }
  function emblemArt(p) {
    return `<span class="sf-emblem2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${catIcon(p.category)}</svg><span class="sf-emblem2-i">${esc(initial(p.name))}</span></span>`;
  }
  function visual(p, extra) {
    const badge = isNew(p) ? '<span class="sf-new">Nouveau</span>' : '';
    const promo = hasPromo(p) ? `<span class="sf-promo">-${discountPct(p)}%</span>` : '';
    const media = p.image
      ? `<img class="sf-photo" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" />`
      : emblemArt(p);
    return `<div class="sf-img ${extra || ''}">${badge}${promo}${media}<span class="sf-view">Voir le produit →</span></div>`;
  }
  function price(p) {
    const old = hasPromo(p) ? `<span class="sf-old">${sMain(p.compareAt)}</span>` : '';
    return `<div class="sf-price"><div class="sf-price-row"><span class="sf-mru">${sMain(p.price)}</span>${old}</div><span class="sf-fcfa">${sAlt(p.price)}</span></div>`;
  }
  function stars(r) {
    const pct = Math.max(0, Math.min(100, (Number(r) / 5) * 100));
    return `<span class="sf-stars"><span class="sf-stars-bg">★★★★★</span><span class="sf-stars-fg" style="width:${pct}%">★★★★★</span></span>`;
  }
  function addBtn(p, label) { return `<button class="sf-add" data-add="${p.id}">${label || 'Ajouter au panier'}</button>`; }

  function footer(d) {
    const c = d.contact || {};
    const items = [];
    if (c.phone) items.push(`<a href="tel:${esc(c.phone)}">📞 ${esc(c.phone)}</a>`);
    if (c.whatsapp) items.push(`<a href="https://wa.me/${esc(String(c.whatsapp).replace(/[^0-9]/g, ''))}" target="_blank" rel="noopener">💬 ${esc(c.whatsapp)}</a>`);
    if (c.email) items.push(`<a href="mailto:${esc(c.email)}">✉️ ${esc(c.email)}</a>`);
    if (c.address) items.push(`<span>📍 ${esc(c.address)}</span>`);
    if (c.facebook) items.push(`<a href="${esc(c.facebook)}" target="_blank" rel="noopener">📘 Facebook</a>`);
    if (c.instagram) items.push(`<a href="${esc(c.instagram)}" target="_blank" rel="noopener">📸 Instagram</a>`);
    const contact = items.length ? `<div class="sf-contact">${items.join('')}</div>` : '';
    const about = d.about ? `<p class="sf-about">${esc(d.about)}</p>` : '';
    const pay = d.payment || {};
    const payItems = [];
    payItems.push('<span class="sf-pay-chip">💵 Paiement à la livraison</span>');
    if (pay.wave) payItems.push(`<span class="sf-pay-chip">🌊 Wave ${esc(pay.wave)}</span>`);
    if (pay.om) payItems.push(`<span class="sf-pay-chip">🟠 Orange Money ${esc(pay.om)}</span>`);
    const payment = `<div class="sf-pay">${payItems.join('')}</div>`;
    return `<footer class="sf-footer" id="sf-contact"><div class="sf-foot-in">
      <div class="sf-foot-brand">${esc(d.shopName)}</div>
      <p class="sf-foot-tag">${esc(d.tagline)}</p>
      ${about}
      ${contact}
      ${payment}
      <div class="sf-foot-meta"><span>© ${new Date().getFullYear()} ${esc(d.shopName)}</span><span class="sf-powered">Propulsé par <strong>Karat</strong> 💎</span></div>
    </div></footer>`;
  }
  function empty() { return `<div class="sf-empty"><p>La boutique n'a pas encore de produits.</p><p class="sf-muted">Revenez très bientôt !</p></div>`; }
  const cartBtn = (n) => `<button class="sf-cart" aria-label="Panier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg><span class="sf-cart-count">0</span></button>`;

  // ============================================================
  // Layouts
  // ============================================================
  // Logo : image téléversée, sinon monogramme dérivé du nom.
  function logoMark(d) {
    return d.logo
      ? `<img class="sf-logo-img" src="${esc(d.logo)}" alt="${esc(d.shopName)}" />`
      : `<span class="sf-logo-mark">${esc(initial(d.shopName))}</span>`;
  }
  function header(d) {
    return `<header class="sf-header" id="sf-top"><div class="sf-header-in">
      <a class="sf-brand-row" href="#sf-top">${logoMark(d)}<span class="sf-brand-name">${esc(d.shopName)}</span></a>
      <nav class="sf-nav"><a class="sf-nav-l" href="#sf-top">Accueil</a><a class="sf-nav-l" href="#produits">Produits</a><a class="sf-nav-l" href="#sf-contact">Contact</a></nav>
      ${cartBtn()}
    </div></header>`;
  }
  function hero(d) {
    const hasBanner = !!d.banner;
    const style = hasBanner ? ` style="background-image:linear-gradient(105deg, rgba(0,0,0,.78) 20%, rgba(0,0,0,.35)), url('${esc(d.banner)}')"` : '';
    const wa = d.contact && d.contact.whatsapp ? String(d.contact.whatsapp).replace(/[^0-9]/g, '') : '';
    return `<section class="sf-hero2 ${hasBanner ? 'has-banner' : ''}"${style}><div class="sf-hero2-in">
      <span class="sf-eyebrow">${esc(d.shopName)}</span>
      <h1>${esc(d.tagline)}</h1>
      ${d.description ? `<p class="sf-lead">${esc(d.description)}</p>` : ''}
      <div class="sf-hero2-cta"><a class="sf-btn" href="#produits">Découvrir la boutique</a>${wa ? `<a class="sf-btn ghost" href="https://wa.me/${esc(wa)}" target="_blank" rel="noopener">Nous écrire</a>` : ''}</div>
    </div></section>`;
  }
  function trustBand() {
    return `<div class="sf-trust"><span>🚚 Livraison à domicile</span><span>💵 Paiement à la livraison</span><span>🔒 Achat en toute confiance</span></div>`;
  }
  function filters(cats) {
    const pills = ['Tout'].concat(cats || []).map((c, i) => `<button type="button" class="sf-pill2 ${i === 0 ? 'on' : ''}" data-cat="${i === 0 ? '' : esc(c)}">${esc(c)}</button>`).join('');
    return `<div class="sf-filters">${pills}</div>`;
  }
  // Carte produit — SANS description (elle n'apparaît que dans la fiche détail).
  function card(p) {
    return `<article class="sf-card2" data-detail="${p.id}">${visual(p, 'tall')}
      <div class="sf-card2-b">
        <span class="sf-cat">${esc(p.category)}</span>
        <h3>${esc(p.name)}</h3>
        ${price(p)}
        <div class="sf-card2-actions"><button type="button" class="sf-add" data-add="${p.id}">Ajouter au panier</button><button type="button" class="sf-see" data-detail-open="${p.id}">Voir</button></div>
      </div></article>`;
  }
  function productsSection(d) {
    return `<section class="sf-shop" id="produits"><div class="sf-shop-head"><h2 class="sf-sec-title">Nos produits</h2><span class="sf-count">${d.products.length} article${d.products.length > 1 ? 's' : ''}</span></div>
      ${(d.categories && d.categories.length > 1) ? filters(d.categories) : ''}
      <div class="sf-grid2" id="sf-grid">${d.products.length ? d.products.map(card).join('') : empty()}</div></section>`;
  }
  // Vitrine unifiée, professionnelle, adaptée aux couleurs du thème choisi.
  function shopMarkup(d) {
    return header(d) + hero(d) + trustBand() + productsSection(d) + footer(d);
  }

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
  function addToCart(id, qty, variant) {
    qty = Math.max(1, qty || 1);
    const p = byId[id]; if (!p) return;
    variant = variant || '';
    const line = cart.find((i) => i.id === p.id && (i.variant || '') === variant);
    if (line) line.qty += qty; else { cart.push({ id: p.id, name: p.name, price: p.price, qty, variant }); track('add_cart'); }
    pixel('AddToCart', { content_ids: ['KRT-' + p.id], content_name: p.name, content_type: 'product', value: p.price * qty, currency: pixCurrency() });
    updateBadges(); toast('« ' + p.name + (variant ? ' (' + variant + ')' : '') + ' » ajouté au panier'); renderCart();
  }

  // -------- Fiche produit (detail + commande) --------
  let detailQty = 1;
  let detailVariant = '';
  function accItem(title, content, open) {
    return `<div class="sf-acc-item${open ? ' open' : ''}"><button type="button" class="sf-acc-h">${esc(title)}<svg class="sf-acc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button><div class="sf-acc-c">${content}</div></div>`;
  }
  function shippingText(d) {
    const sh = (d && d.shipping) || { zones: [], freeOver: 0 };
    const lines = [];
    (sh.zones || []).forEach((z) => lines.push(`${esc(z.zone)} — ${z.fee ? sMain(z.fee) : 'Gratuite'}`));
    if (sh.freeOver) lines.push(`Livraison offerte dès ${sMain(sh.freeOver)} d'achat.`);
    lines.push('Paiement à la livraison, en espèces à la réception.');
    return lines.map((l) => `<p>${l}</p>`).join('');
  }
  function returnsText(d) {
    return `<p>${esc((d && d.returnsPolicy) || 'Retours acceptés sous 7 jours pour tout article non utilisé, dans son emballage d\'origine. Contactez-nous pour organiser le retour.')}</p>`;
  }
  function openDetail(id) {
    const p = byId[id]; if (!p) return;
    detailQty = 1;
    detailVariant = (p.variants && p.variants[0]) || '';
    const modal = root.querySelector('.sf-detail'); if (!modal) return;
    const box = modal.querySelector('.sf-detail-box'); if (box) box.classList.add('pd');
    const old = hasPromo(p) ? `<span class="sf-pd-old">${sMain(p.compareAt)}</span>` : '';
    const promo = hasPromo(p) ? `<span class="sf-pd-save">-${discountPct(p)}%</span>` : '';
    const rating = p.rating > 0 ? `<div class="sf-pd-rating">${stars(p.rating)}<span class="sf-pd-reviews">(${p.reviewsCount} avis)</span></div>` : '';
    const variants = (p.variants && p.variants.length)
      ? `<div class="sf-pd-field"><span class="sf-pd-label">Variante</span><div class="sf-var-row">${p.variants.map((v, i) => `<button type="button" class="sf-var${i === 0 ? ' on' : ''}" data-variant="${esc(v)}">${esc(v)}</button>`).join('')}</div></div>`
      : '';
    const stock = p.stock > 0 ? `<div class="sf-pd-stock ok">${p.stock} en stock</div>` : '<div class="sf-pd-stock oos">Rupture de stock</div>';
    modal.querySelector('.sf-detail-body').innerHTML = `<div class="sf-pd">
      <div class="sf-pd-media">${visual(p, 'cover')}</div>
      <div class="sf-pd-info">
        <span class="sf-cat">${esc(p.category)}</span>
        <h3 class="sf-pd-name">${esc(p.name)}</h3>
        ${rating}
        <div class="sf-pd-price"><span class="sf-pd-now">${sMain(p.price)}</span>${old}${promo}</div>
        <div class="sf-pd-alt">${sAlt(p.price)}</div>
        ${p.subtitle ? `<p class="sf-pd-sub">${esc(p.subtitle)}</p>` : ''}
        ${variants}
        <div class="sf-pd-buy">
          <div class="sf-qty2"><button type="button" data-dq="-">−</button><span class="sf-dqv">1</span><button type="button" data-dq="+">+</button></div>
          <button type="button" class="sf-btn sf-pd-add" data-pd-add="${p.id}" ${p.stock > 0 ? '' : 'disabled'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg> Ajouter au panier</button>
        </div>
        ${stock}
        <div class="sf-acc">
          ${accItem('Description', p.description ? `<p>${esc(p.description)}</p>` : '<p class="sf-muted">Aucune description pour ce produit.</p>', true)}
          ${accItem('Livraison', shippingText(data))}
          ${accItem('Retours', returnsText(data))}
        </div>
      </div></div>`;
    modal.querySelectorAll('[data-dq]').forEach((b) => b.addEventListener('click', () => {
      detailQty = Math.max(1, detailQty + (b.dataset.dq === '+' ? 1 : -1));
      modal.querySelector('.sf-dqv').textContent = detailQty;
    }));
    modal.querySelectorAll('.sf-var').forEach((b) => b.addEventListener('click', () => {
      modal.querySelectorAll('.sf-var').forEach((x) => x.classList.toggle('on', x === b));
      detailVariant = b.dataset.variant;
    }));
    modal.querySelectorAll('.sf-acc-h').forEach((h) => h.addEventListener('click', () => h.closest('.sf-acc-item').classList.toggle('open')));
    const addBtn2 = modal.querySelector('[data-pd-add]');
    if (addBtn2) addBtn2.addEventListener('click', () => { addToCart(p.id, detailQty, detailVariant); closeDetail(); openCart(); });
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    pixel('ViewContent', { content_ids: ['KRT-' + p.id], content_name: p.name, content_type: 'product', value: p.price, currency: pixCurrency() });
  }
  function closeDetail() { const m = root.querySelector('.sf-detail'); if (m) m.classList.remove('open'); document.body.style.overflow = ''; }

  // Analytics réels : visite (avec source) et ajout au panier.
  // Détecte la source d'une visite, en priorité depuis les paramètres de
  // campagne (utm_source, fbclid…) pour attribuer le trafic Facebook/Instagram.
  function detectSource() {
    const params = new URLSearchParams(location.search);
    const known = ['direct', 'social', 'search', 'whatsapp', 'referral', 'facebook', 'instagram', 'ads'];
    const q = params.get('src');
    if (q) return known.includes(q) ? q : 'referral';
    // Paramètres de campagne (liens publicitaires / posts).
    const utm = (params.get('utm_source') || '').toLowerCase();
    if (/facebook|fb/.test(utm) || params.has('fbclid')) return 'facebook';
    if (/instagram|ig/.test(utm) || params.has('igshid')) return 'instagram';
    if (utm) return known.includes(utm) ? utm : 'ads';
    // Sinon, on déduit depuis le référent.
    const ref = document.referrer || '';
    if (!ref) return 'direct';
    if (/facebook|fb\.com|fb\.me/i.test(ref)) return 'facebook';
    if (/instagram/i.test(ref)) return 'instagram';
    if (/tiktok|t\.co|twitter|x\.com|snapchat/i.test(ref)) return 'social';
    if (/whatsapp|wa\.me/i.test(ref)) return 'whatsapp';
    if (/google|bing|yahoo|duckduck|search/i.test(ref)) return 'search';
    return 'referral';
  }

  // -------- Pixel Meta (Facebook / Instagram) --------
  // Chargé uniquement si le commerçant a renseigné un identifiant de Pixel,
  // et jamais dans la démo « un seul lien » (pas de réseau externe).
  let pixelReady = false;
  const pixCurrency = () => (SCUR === 'FCFA' ? 'XOF' : 'MRU'); // codes ISO attendus par Meta
  function initPixel(id) {
    if (!id || pixelReady || window.__KARAT_SPA__) return;
    pixelReady = true;
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    try { window.fbq('init', id); window.fbq('track', 'PageView'); } catch (_) { /* silencieux */ }
  }
  function pixel(event, params) {
    if (!pixelReady || !window.fbq) return;
    try { window.fbq('track', event, params || {}); } catch (_) { /* silencieux */ }
  }
  function track(type, source) {
    if (window.__KARAT_TRACK__) { window.__KARAT_TRACK__(type, source || 'direct'); return; }
    if (!data || !data.slug) return;
    const url = '/api/public/store/' + encodeURIComponent(data.slug) + (type === 'visit' ? '/visit' : '/event');
    const body = type === 'visit' ? { source: source || 'direct' } : { type };
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
  }
  function setQty(idx, delta) { const line = cart[idx]; if (!line) return; line.qty += delta; if (line.qty <= 0) cart.splice(idx, 1); updateBadges(); renderCart(); }

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
      <div class="sf-lines">${cart.map((i, idx) => `<div class="sf-line"><div class="sf-line-i">${esc(initial(i.name))}</div><div class="sf-line-b"><div class="sf-line-n">${esc(i.name)}${i.variant ? ` <span class="sf-line-var">${esc(i.variant)}</span>` : ''}</div><div class="sf-line-p">${sMain(i.price)}</div></div><div class="sf-qty"><button data-q="-" data-idx="${idx}">−</button><span>${i.qty}</span><button data-q="+" data-idx="${idx}">+</button></div></div>`).join('')}</div>
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
    panel.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => setQty(Number(b.dataset.idx), b.dataset.q === '+' ? 1 : -1)));
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
    const payload = { name, phone, city, address: root.querySelector('#sf-address').value.trim(), note: root.querySelector('#sf-note').value.trim(), items: cart.map((i) => ({ id: i.id, qty: i.qty, variant: i.variant || '' })) };
    const btn = root.querySelector('.sf-confirm'); if (btn) { btn.disabled = true; btn.textContent = 'Envoi…'; }
    const r = await placeOrder(payload);
    if (btn) { btn.disabled = false; btn.textContent = 'Confirmer la commande'; }
    if (!r.ok) { if (msg) { msg.textContent = (r.data && (r.data.error || (r.data.errors && Object.values(r.data.errors)[0]))) || 'Commande impossible.'; msg.className = 'sf-msg err'; } return; }
    const d = r.data;
    pixel('Purchase', { value: d.total, currency: pixCurrency(), num_items: cartCount(), content_type: 'product' });
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

  function openCart() { const dr = root.querySelector('.sf-drawer'); if (dr) { renderCart(); dr.classList.add('open'); if (cart.length) pixel('InitiateCheckout', { value: cartSubtotal(), currency: pixCurrency(), num_items: cartCount() }); } }
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
    root.querySelectorAll('[data-detail-open]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); openDetail(Number(b.dataset.detailOpen)); }));
    // Clic sur une carte produit -> fiche detail (sauf sur les boutons d'action)
    root.querySelectorAll('[data-detail]').forEach((el) => el.addEventListener('click', (e) => {
      if (e.target.closest('[data-add]') || e.target.closest('[data-detail-open]')) return;
      openDetail(Number(el.dataset.detail));
    }));

    // Filtres par catégorie (fonctionnels).
    const grid = root.querySelector('#sf-grid');
    root.querySelectorAll('.sf-pill2').forEach((b) => b.addEventListener('click', () => {
      root.querySelectorAll('.sf-pill2').forEach((x) => x.classList.toggle('on', x === b));
      const cat = b.dataset.cat;
      if (grid) grid.querySelectorAll('.sf-card2').forEach((cardEl) => {
        const p = byId[Number(cardEl.dataset.detail)];
        cardEl.style.display = (!cat || (p && p.category === cat)) ? '' : 'none';
      });
    }));

    // Navigation interne : défilement doux vers les sections.
    root.querySelectorAll('.sf-nav-l, .sf-hero2-cta a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || !href.startsWith('#') || href.startsWith('#/')) return;
      const target = root.querySelector(href);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }));
  }

  function render(d) {
    const t = d.themeData;
    SCUR = d.currency || 'MRU';
    if (d.heroTitle) d.tagline = d.heroTitle; // le titre principal prime sur le slogan
    data = d; cart = []; byId = {};
    (d.products || []).forEach((p) => (byId[p.id] = p));
    applyTheme(t);
    root.className = 'storefront pro';
    root.innerHTML = shopMarkup(d);
    mountChrome();
    updateBadges();
    document.title = d.shopName + ' — Boutique Karat';
    initPixel(d.marketing && d.marketing.metaPixelId);
    track('visit', detectSource());
    // Lien profond depuis le catalogue Meta / une publicité (?produit=ID).
    const pid = Number(new URLSearchParams(location.search).get('produit'));
    if (pid && byId[pid]) setTimeout(() => openDetail(pid), 350);
  }

  async function load() {
    if (window.__KARAT_STORE__) { render(window.__KARAT_STORE__); return; }
    const m = location.pathname.match(/\/boutique\/([^/]+)/);
    let slug = m ? decodeURIComponent(m[1]) : '';
    // Sous-domaine <slug>.domaine.tld -> premier label comme slug.
    if (!slug) {
      const labels = location.hostname.split('.');
      if (labels.length >= 3 && labels[0] !== 'www') slug = labels[0];
    }
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
