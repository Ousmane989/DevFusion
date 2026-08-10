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

  function visual(p, extra) { return `<div class="sf-img ${extra || ''}"><span class="sf-mono">${esc(initial(p.name))}</span></div>`; }
  function price(p) { return `<div class="sf-price"><span class="sf-mru">${money(p.priceMru)} MRU</span><span class="sf-fcfa">≈ ${money(p.priceFcfa)} FCFA</span></div>`; }
  function addBtn(p, label) { return `<button class="sf-add" data-add="${esc(p.name)}">${label || 'Ajouter au panier'}</button>`; }

  function footer(d) {
    return `<footer class="sf-footer"><div class="sf-foot-in">
      <div class="sf-foot-brand">${esc(d.shopName)}</div>
      <p class="sf-foot-tag">${esc(d.tagline)}</p>
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
      const cards = d.products.map((p) => `<article class="sf-card">${visual(p, 'tall')}<div class="sf-card-b"><span class="sf-cat">${esc(p.category)}</span><h3>${esc(p.name)}</h3>${p.description ? `<p class="sf-desc">${esc(p.description)}</p>` : ''}${price(p)}${addBtn(p)}</div></article>`).join('');
      return `<header class="sf-head center"><div class="sf-logo-dot"></div><div class="sf-brand">${esc(d.shopName)}</div><nav class="sf-nav"><a>Accueil</a><a>Boutique</a><a>Contact</a></nav></header>
        <section class="sf-hero center"><span class="sf-eyebrow">Maison ${esc(d.shopName)}</span><h1>${esc(d.tagline)}</h1>${d.description ? `<p class="sf-lead">${esc(d.description)}</p>` : ''}<a class="sf-btn" href="#produits">Découvrir la collection</a><div class="sf-divider"></div></section>
        <section class="sf-products" id="produits"><h2 class="sf-sec-title">Notre sélection</h2>${d.products.length ? `<div class="sf-grid cols3">${cards}</div>` : empty()}</section>${footer(d)}`;
    },
    // 2) Warm — hero deux colonnes, band de promesses, grandes cartes rondes
    warm(d) {
      const cards = d.products.map((p) => `<article class="sf-card round">${visual(p)}<div class="sf-card-b"><h3>${esc(p.name)}</h3><span class="sf-cat">${esc(p.category)}</span>${price(p)}${addBtn(p, 'Commander')}</div></article>`).join('');
      const collage = d.products.slice(0, 4).map((p) => `<span class="sf-chip">${esc(initial(p.name))}</span>`).join('');
      return `<header class="sf-head split"><div class="sf-brand">${esc(d.shopName)}</div>${cartBtn()}</header>
        <section class="sf-hero two"><div class="sf-hero-txt"><span class="sf-eyebrow">Bienvenue</span><h1>${esc(d.tagline)}</h1><p class="sf-lead">${esc(d.description || 'Des produits choisis avec soin, livrés près de chez vous.')}</p><a class="sf-btn" href="#produits">Voir les produits</a></div><div class="sf-hero-art"><div class="sf-halo"></div><div class="sf-collage">${collage}</div></div></section>
        <div class="sf-band"><span>🚚 Livraison locale</span><span>📱 Paiement mobile</span><span>✋ Sélection soignée</span></div>
        <section class="sf-products" id="produits"><h2 class="sf-sec-title">Nos produits</h2>${d.products.length ? `<div class="sf-grid cols2">${cards}</div>` : empty()}</section>${footer(d)}`;
    },
    // 3) Fresh — bannière pleine largeur, pills catégories, grille dense 4 col
    fresh(d) {
      const cards = d.products.map((p) => `<article class="sf-card compact">${visual(p)}<div class="sf-card-b"><span class="sf-tag">${esc(p.category)}</span><h3>${esc(p.name)}</h3><div class="sf-row">${price(p)}<button class="sf-plus" data-add="${esc(p.name)}">+</button></div></div></article>`).join('');
      const pills = ['Tout'].concat(d.categories || []).map((c, i) => `<button class="sf-pill ${i === 0 ? 'on' : ''}">${esc(c)}</button>`).join('');
      return `<header class="sf-head bar"><div class="sf-brand">${esc(d.shopName)}</div><nav class="sf-nav pills"><a class="on">Accueil</a><a>Produits</a><a>Contact</a></nav>${cartBtn()}</header>
        <section class="sf-banner"><div class="sf-banner-in"><h1>${esc(d.tagline)}</h1><p>${esc(d.description || 'Découvrez notre catalogue, frais et de saison.')}</p></div></section>
        <div class="sf-pills">${pills}</div>
        <section class="sf-products"><div class="sf-grid cols4">${d.products.length ? cards : empty()}</div></section>${footer(d)}`;
    },
    // 4) Tech — hero scindé, cartes à survol marqué
    tech(d) {
      const cards = d.products.map((p) => `<article class="sf-card hoverlift">${visual(p)}<div class="sf-card-b"><h3>${esc(p.name)}</h3><span class="sf-cat">${esc(p.category)}</span>${price(p)}<a class="sf-link" data-add="${esc(p.name)}">Ajouter au panier →</a></div></article>`).join('');
      const feats = d.products.slice(0, 2).map((p) => `<div class="sf-feat">${visual(p)}<div><h4>${esc(p.name)}</h4>${price(p)}</div></div>`).join('');
      return `<header class="sf-head sticky"><div class="sf-brand">${esc(d.shopName)}</div><nav class="sf-nav"><a>Accueil</a><a>Catalogue</a><a>À propos</a></nav>${cartBtn()}</header>
        <section class="sf-hero grid"><div class="sf-hero-txt"><span class="sf-eyebrow">Nouvelle collection</span><h1>${esc(d.tagline)}</h1><p class="sf-lead">${esc(d.description || 'Le meilleur, livré rapidement et payé simplement.')}</p><div class="sf-cta-row"><a class="sf-btn" href="#produits">Acheter</a><a class="sf-btn ghost" href="#produits">Explorer</a></div></div><div class="sf-hero-cards">${feats || '<div class="sf-halo"></div>'}</div></section>
        <section class="sf-products" id="produits"><div class="sf-sec-row"><h2 class="sf-sec-title">Catalogue</h2><span class="sf-count">${d.products.length} article(s)</span></div>${d.products.length ? `<div class="sf-grid cols3">${cards}</div>` : empty()}</section>${footer(d)}`;
    },
    // 5) Magazine — immense titre, produit vedette, tailles mixtes
    magazine(d) {
      const feat = d.products[0];
      const rest = d.products.slice(1).map((p) => `<article class="sf-card overlay">${visual(p, 'cover')}<div class="sf-ov"><h3>${esc(p.name)}</h3>${price(p)}</div></article>`).join('');
      return `<header class="sf-head mag"><div class="sf-brand up">${esc(d.shopName)}</div><nav class="sf-nav"><a>Boutique</a><a>Éditos</a><a>Contact</a></nav></header>
        <section class="sf-hero mag"><div class="sf-mag-title"><span class="sf-eyebrow">La sélection</span><h1>${esc(d.tagline)}</h1><a class="sf-btn" href="#produits">Explorer</a></div>${feat ? `<div class="sf-mag-feat">${visual(feat, 'cover')}<div class="sf-ov big"><span class="sf-cat">${esc(feat.category)}</span><h3>${esc(feat.name)}</h3>${price(feat)}${addBtn(feat)}</div></div>` : ''}</section>
        <section class="sf-products" id="produits"><h2 class="sf-sec-title">Toute la boutique</h2>${d.products.length ? `<div class="sf-grid cols3 mag">${rest || ''}</div>` : empty()}</section>${footer(d)}`;
    },
    // 6) Minimal — clair, épuré, beaucoup de vide
    minimal(d) {
      const cards = d.products.map((p) => `<article class="sf-card bare">${visual(p, 'tall')}<h3>${esc(p.name)}</h3><span class="sf-cat">${esc(p.category)}</span>${price(p)}<button class="sf-add ghost" data-add="${esc(p.name)}">Ajouter</button></article>`).join('');
      return `<header class="sf-head mini"><div class="sf-brand">${esc(d.shopName)}</div></header>
        <section class="sf-hero mini"><span class="sf-eyebrow">${esc(d.description || 'Boutique en ligne')}</span><h1>${esc(d.tagline)}</h1><a class="sf-underline" href="#produits">Voir les produits</a></section>
        <section class="sf-products" id="produits">${d.products.length ? `<div class="sf-grid cols3 airy">${cards}</div>` : empty()}</section>${footer(d)}`;
    },
  };

  // ============================================================
  // Rendu + interactions
  // ============================================================
  let cart = 0;
  function toast(text) {
    let t = root.querySelector('.sf-toast');
    if (!t) { t = document.createElement('div'); t.className = 'sf-toast'; root.appendChild(t); }
    t.textContent = text; t.classList.add('show');
    clearTimeout(t._to); t._to = setTimeout(() => t.classList.remove('show'), 1600);
  }
  function wireCart() {
    root.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault(); cart++;
      root.querySelectorAll('.sf-cart-count').forEach((c) => (c.textContent = cart));
      toast('« ' + b.dataset.add +' » ajouté au panier');
    }));
  }

  function render(d) {
    const t = d.themeData;
    applyTheme(t);
    root.className = 'storefront lay-' + (t.layout || 'luxe');
    root.innerHTML = (layouts[t.layout] || layouts.luxe)(d);
    wireCart();
    document.title = d.shopName + ' — Boutique Karat';
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
