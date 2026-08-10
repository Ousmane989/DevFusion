/* ==================================================================
   Karat — espace d'administration (tableau de bord multi-sections).
   Sections : vue d'ensemble, produits, commandes, livraison, boutique.
   Fonctionne sur le vrai back-end (Karat.api) ou en mode démo
   (window.__KARAT_MOCK__). Graphiques SVG « maison ».
   ================================================================== */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const money = (n) => Number(Math.round(n)).toLocaleString('fr-FR');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slugify = (s) => String(s || 'ma-boutique').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'ma-boutique';

  // Racine : la page complète, ou l'écran démo #screen-dashboard.
  const root = document.getElementById('screen-dashboard') || document.querySelector('.dash') || document;
  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => Array.from(root.querySelectorAll(sel));

  // Appel API unifié : mock en démo, fetch réel sinon.
  async function api(path, method, body) {
    if (window.__KARAT_MOCK__) return window.__KARAT_MOCK__(path, method || 'GET', body);
    return Karat.api(path, body, method || (body ? 'POST' : 'GET'));
  }

  // ---------- petites briques graphiques ----------
  function gold(t) { t = Math.max(0, Math.min(1, t)); const a = [122, 95, 31], b = [245, 215, 126]; const c = a.map((v, i) => Math.round(v + (b[i] - v) * t)); return `rgb(${c[0]},${c[1]},${c[2]})`; }
  function countTo(el, target, opts) { opts = opts || {}; const fmt = opts.fmt || money; if (reduce) { el.textContent = fmt(target); return; } const start = performance.now(); (function tick(now) { const p = Math.min(1, (now - start) / 900); const e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(target * e); if (p < 1) requestAnimationFrame(tick); })(performance.now()); }
  function sparkline(values) {
    const w = 120, h = 34, pad = 3, max = Math.max.apply(null, values), min = Math.min.apply(null, values), span = max - min || 1;
    const pts = values.map((v, i) => [pad + (i / (values.length - 1 || 1)) * (w - pad * 2), h - pad - ((v - min) / span) * (h - pad * 2)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = line + ` L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
    const up = values[values.length - 1] >= values[0], stroke = up ? '#D4AF37' : '#c98a80', uid = 'k' + Math.random().toString(36).slice(2, 7);
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${stroke}" stop-opacity=".28"/><stop offset="1" stop-color="${stroke}" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#${uid})"/><path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function deltaChip(d) { const up = d >= 0; const arrow = up ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17 17 7M9 7h8v8"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 7 7 17M15 17H7V9"/></svg>'; return `<span class="delta ${up ? 'up' : 'down'}">${arrow}${Math.abs(d)}%</span>`; }

  function renderArea(container, series) {
    const W = 760, H = 260, padL = 8, padR = 8, padT = 18, padB = 28;
    const values = series.map((d) => d.value), max = Math.max.apply(null, values) * 1.12, avg = values.reduce((a, b) => a + b, 0) / values.length, n = series.length;
    const x = (i) => padL + (i / (n - 1 || 1)) * (W - padL - padR), y = (v) => padT + (1 - v / (max || 1)) * (H - padT - padB);
    const pts = series.map((d, i) => [x(i), y(d.value)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = line + ` L${x(n - 1).toFixed(1)} ${H - padB} L${x(0).toFixed(1)} ${H - padB} Z`;
    let grid = '';
    for (let g = 0; g <= 4; g++) { const gy = y((max / 4) * g); grid += `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - padR}" y2="${gy.toFixed(1)}" class="grid"/><text x="${padL}" y="${(gy - 4).toFixed(1)}" class="ytick">${money((max / 4) * g)}</text>`; }
    const avgY = y(avg), step = Math.ceil(n / 7); let xl = '';
    series.forEach((d, i) => { if (i % step === 0 || i === n - 1) xl += `<text x="${x(i).toFixed(1)}" y="${H - 8}" class="xtick">${d.label}</text>`; });
    container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="area-chart" preserveAspectRatio="none" role="img" aria-label="Chiffre d'affaires"><defs><linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F5D77E" stop-opacity=".38"/><stop offset="1" stop-color="#D4AF37" stop-opacity="0"/></linearGradient></defs>${grid}<line x1="${padL}" y1="${avgY.toFixed(1)}" x2="${W - padR}" y2="${avgY.toFixed(1)}" class="avg-line"/><text x="${W - padR}" y="${(avgY - 5).toFixed(1)}" class="avg-label" text-anchor="end">Moyenne ${money(avg)}</text><path d="${area}" fill="url(#area-grad)"/><path d="${line}" fill="none" stroke="#F5D77E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>${xl}<g class="hover-layer" style="opacity:0"><line class="crosshair" y1="${padT}" y2="${H - padB}"/><circle class="hover-dot" r="4.5"/></g></svg><div class="chart-tip" style="opacity:0"></div>`;
    if (!reduce) { const path = container.querySelector('path[stroke]'); const len = path.getTotalLength(); path.style.strokeDasharray = len; path.style.strokeDashoffset = len; path.getBoundingClientRect(); path.style.transition = 'stroke-dashoffset 1.1s ease'; path.style.strokeDashoffset = '0'; }
    const svg = container.querySelector('svg'), layer = container.querySelector('.hover-layer'), cross = container.querySelector('.crosshair'), dot = container.querySelector('.hover-dot'), tip = container.querySelector('.chart-tip');
    function move(ev) { const rect = svg.getBoundingClientRect(); const px = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left) / rect.width; const i = Math.max(0, Math.min(n - 1, Math.round(px * (n - 1)))); const cx = x(i), cy = y(series[i].value); layer.style.opacity = 1; cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); tip.style.opacity = 1; tip.innerHTML = `<span class="t-label">${series[i].label}</span><span class="t-val">${money(series[i].value)} MRU</span>`; tip.style.left = (cx / W) * 100 + '%'; tip.style.top = (cy / H) * 100 + '%'; }
    function leave() { layer.style.opacity = 0; tip.style.opacity = 0; }
    svg.addEventListener('mousemove', move); svg.addEventListener('mouseleave', leave); svg.addEventListener('touchmove', move, { passive: true }); svg.addEventListener('touchend', leave);
  }
  function renderFunnel(container, stages) {
    const top = stages[0].value || 1;
    container.innerHTML = stages.map((st, i) => { const pctTop = (st.value / top) * 100; const step = i === 0 ? null : Math.round((st.value / (stages[i - 1].value || 1)) * 100); const col = gold(1 - i / Math.max(1, stages.length - 1)); return `<div class="funnel-row"><div class="funnel-head"><span class="funnel-name">${esc(st.stage)}</span><span class="funnel-val">${money(st.value)}${step !== null ? ` <span class="funnel-step">${step}%</span>` : ''}</span></div><div class="funnel-track"><div class="funnel-bar" data-w="${pctTop.toFixed(1)}" style="width:0;background:${col}"></div></div></div>`; }).join('');
    requestAnimationFrame(() => container.querySelectorAll('.funnel-bar').forEach((b, i) => setTimeout(() => { b.style.width = b.dataset.w + '%'; }, reduce ? 0 : 110 * i)));
  }
  function renderDonut(container, legendEl, sources) {
    const total = sources.reduce((t, x) => t + x.value, 0) || 1, R = 60, C = 80, cir = 2 * Math.PI * R, gap = 3; let acc = -90, segs = '';
    sources.forEach((sc, i) => { const frac = sc.value / total; const sweep = frac * 360 - gap; const col = gold(1 - i / Math.max(1, sources.length - 1)); const dash = (Math.max(0, sweep) / 360) * cir; const off = (-(acc + 90) / 360) * cir; segs += `<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="${col}" stroke-width="20" stroke-dasharray="${dash.toFixed(2)} ${(cir - dash).toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}" transform="rotate(-90 ${C} ${C})" class="donut-seg" style="opacity:0"/>`; acc += frac * 360; });
    container.innerHTML = `<svg viewBox="0 0 160 160" class="donut" role="img" aria-label="Sources de trafic">${segs}<text x="${C}" y="${C - 4}" class="donut-total" text-anchor="middle">${money(total)}</text><text x="${C}" y="${C + 14}" class="donut-cap" text-anchor="middle">visiteurs</text></svg>`;
    legendEl.innerHTML = sources.map((sc, i) => `<li><span class="dot" style="background:${gold(1 - i / Math.max(1, sources.length - 1))}"></span><span class="lg-name">${esc(sc.name)}</span><span class="lg-val">${sc.share}%</span></li>`).join('');
    requestAnimationFrame(() => container.querySelectorAll('.donut-seg').forEach((s, i) => setTimeout(() => { s.style.opacity = 1; }, reduce ? 0 : 90 * i)));
  }

  // ================================================================
  // État & navigation
  // ================================================================
  let currentUser = null;
  let overviewStats = null;
  let booted = false;
  const loaded = {};

  function msg(el, type, text) { if (el) { el.className = 'form-msg show ' + type; el.textContent = text; } }
  function clearMsg(el) { if (el) el.className = 'form-msg'; }

  function switchSection(name) {
    qa('.dash-section').forEach((s) => s.classList.toggle('active', s.id === 'sec-' + name));
    qa('.side-link').forEach((l) => l.classList.toggle('active', l.dataset.section === name));
    const side = q('#dash-side'); if (side) side.classList.remove('open');
    window.scrollTo(0, 0);
    if (name === 'products' && !loaded.products) loadProducts();
    if (name === 'orders' && !loaded.orders) loadOrders();
    if (name === 'shipping' && !loaded.store2) loadShipping();
    if (name === 'store' && !loaded.store) loadStore();
  }

  // ================================================================
  // Vue d'ensemble
  // ================================================================
  function renderOverview(user, st) {
    const initials = (user.name || 'K').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    q('#avatar').textContent = initials;
    q('#user-name').textContent = user.name;
    q('#shop-name').textContent = user.shopName;
    q('#hello-name').textContent = (user.name || '').split(' ')[0];
    if (q('#side-plan')) q('#side-plan').textContent = user.planName || 'Pro';

    const vs = q('#visit-shop');
    if (vs) {
      if (window.__KARAT_SPA__) { vs.href = '#/boutique'; vs.removeAttribute('target'); }
      else vs.href = '/boutique/' + slugify(user.shopName);
    }

    const bar = q('#trial-bar'), txt = q('#trial-text');
    if (user.status === 'trial') { const end = user.trialEndsAt ? new Date(user.trialEndsAt) : null; const days = end ? Math.max(0, Math.ceil((end - Date.now()) / 86400000)) : 0; txt.textContent = '✦ Essai gratuit : ' + days + ' jour' + (days > 1 ? 's' : '') + ' restant' + (days > 1 ? 's' : '') + '. Activez votre abonnement pour continuer.'; bar.style.display = 'block'; }
    else if (user.status === 'active') { const end = user.subscriptionEndsAt ? new Date(user.subscriptionEndsAt).toLocaleDateString('fr-FR') : ''; txt.textContent = '✓ Abonnement ' + (user.planName || '') + ' actif' + (end ? ' jusqu\'au ' + end : '') + '.'; const cta = bar.querySelector('.btn'); if (cta) cta.style.display = 'none'; bar.style.display = 'block'; }

    applyPeriod(st.defaultPeriod || '30j');
    renderFunnel(q('#funnel'), st.funnel);
    renderDonut(q('#donut'), q('#donut-legend'), st.sources);
  }

  function applyPeriod(key) {
    const st = overviewStats; const P = st.periods[key], k = P.kpis;
    q('#dash-sub').textContent = 'Voici les performances de votre boutique sur les ' + P.rangeLabel + '.';
    qa('.k-period').forEach((e) => (e.textContent = P.subLabel));
    countTo(q('#kpi-rev'), k.revenue.value); q('#kpi-rev-fcfa').textContent = '≈ ' + money(k.revenue.fcfa) + ' FCFA'; q('#kpi-rev-delta').innerHTML = deltaChip(k.revenue.delta); q('#kpi-rev-spark').innerHTML = sparkline(k.revenue.spark);
    countTo(q('#kpi-orders'), k.orders.value); q('#kpi-orders-delta').innerHTML = deltaChip(k.orders.delta); q('#kpi-orders-spark').innerHTML = sparkline(k.orders.spark);
    countTo(q('#kpi-visitors'), k.visitors.value); q('#kpi-visitors-delta').innerHTML = deltaChip(k.visitors.delta); q('#kpi-visitors-spark').innerHTML = sparkline(k.visitors.spark);
    countTo(q('#kpi-conv'), k.conversion.value, { fmt: (v) => v.toFixed(1) }); q('#kpi-conv-delta').innerHTML = deltaChip(k.conversion.delta);
    countTo(q('#kpi-basket'), k.basket.value); q('#kpi-basket-fcfa').textContent = '≈ ' + money(k.basket.fcfa) + ' FCFA'; q('#kpi-basket-delta').innerHTML = deltaChip(k.basket.delta);
    renderArea(q('#revenue-chart'), P.series);
  }

  // ================================================================
  // Produits
  // ================================================================
  let categories = [];
  function statusPill(active) { return active ? '<span class="pill good">En ligne</span>' : '<span class="pill muted-pill">Brouillon</span>'; }

  function renderProducts(products) {
    const body = q('#products-body'), empty = q('#products-empty');
    q('#badge-products').textContent = products.length || '';
    if (!products.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = products.map((p) => `<tr>
      <td class="cell-prod"><strong>${esc(p.name)}</strong>${p.description ? `<div class="muted small">${esc(p.description)}</div>` : ''}</td>
      <td class="muted">${esc(p.category)}</td>
      <td class="mono num">${money(p.priceMru)} MRU<div class="muted small">≈ ${money(p.priceFcfa)} FCFA</div></td>
      <td class="mono num">${p.stock}</td>
      <td>${statusPill(p.active)}</td>
      <td class="num row-actions">
        <button class="icon-btn" data-edit="${p.id}" title="Modifier"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>
        <button class="icon-btn danger" data-del="${p.id}" title="Supprimer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg></button>
      </td></tr>`).join('');
    body.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openProductForm(products.find((p) => String(p.id) === b.dataset.edit))));
    body.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => deleteProduct(b.dataset.del)));
  }

  async function loadProducts() {
    const r = await api('/api/products', 'GET');
    if (!r.ok) return;
    categories = r.data.categories || [];
    const sel = q('#pf-category');
    if (sel && !sel.children.length) sel.innerHTML = categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    renderProducts(r.data.products || []);
    loaded.products = true;
  }

  function openProductForm(prod) {
    const form = q('#product-form');
    form.style.display = 'block';
    clearMsg(q('#pf-msg'));
    qa('#prod-form .field').forEach((f) => f.classList.remove('invalid'));
    q('#pf-title').textContent = prod ? 'Modifier le produit' : 'Nouveau produit';
    q('#pf-id').value = prod ? prod.id : '';
    q('#pf-name').value = prod ? prod.name : '';
    q('#pf-category').value = prod ? prod.category : (categories[0] || 'Autre');
    q('#pf-price').value = prod ? prod.priceMru : '';
    q('#pf-stock').value = prod ? prod.stock : '';
    q('#pf-desc').value = prod ? prod.description : '';
    q('#pf-active').checked = prod ? prod.active : true;
    q('#pf-fcfa').textContent = '≈ ' + money((prod ? prod.priceMru : 0) * 6) + ' FCFA';
    form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }
  function closeProductForm() { q('#product-form').style.display = 'none'; }

  async function submitProduct(e) {
    e.preventDefault();
    const m = q('#pf-msg'); clearMsg(m);
    qa('#prod-form .field').forEach((f) => f.classList.remove('invalid'));
    const id = q('#pf-id').value;
    const payload = { name: q('#pf-name').value.trim(), category: q('#pf-category').value, priceMru: Number(q('#pf-price').value), stock: Number(q('#pf-stock').value), description: q('#pf-desc').value.trim(), active: q('#pf-active').checked };
    const r = await api('/api/products' + (id ? '/' + id : ''), id ? 'PUT' : 'POST', payload);
    if (!r.ok) {
      if (r.data && r.data.errors) { Object.keys(r.data.errors).forEach((f) => { const el = q('[data-field="' + f + '"]'); if (el) el.classList.add('invalid'); }); msg(m, 'error', 'Veuillez corriger les champs indiqués.'); }
      else msg(m, 'error', (r.data && r.data.error) || 'Erreur.');
      return;
    }
    closeProductForm();
    await loadProducts();
  }
  async function deleteProduct(id) {
    if (!window.confirm('Supprimer ce produit ? Cette action est définitive.')) return;
    const r = await api('/api/products/' + id, 'DELETE');
    if (r.ok) await loadProducts();
  }

  // ================================================================
  // Commandes
  // ================================================================
  function orderPill(tone, label) { const map = { good: 'good', warning: 'warning', critical: 'critical', info: 'info' }; return `<span class="pill ${map[tone] || 'info'}">${esc(label)}</span>`; }
  async function loadOrders() {
    const r = await api('/api/orders', 'GET');
    if (!r.ok) return;
    const { orders, summary } = r.data;
    q('#badge-orders').textContent = summary.total || '';
    countTo(q('#ord-total'), summary.total); countTo(q('#ord-paid'), summary.paid); countTo(q('#ord-pending'), summary.pending); countTo(q('#ord-rev'), summary.revenue);
    q('#orders-full-body').innerHTML = orders.map((o) => `<tr>
      <td class="mono">${esc(o.ref)}</td><td>${esc(o.client)}</td><td class="muted">${esc(o.city)}</td>
      <td class="cell-prod">${esc(o.product)}</td><td class="mono num">${o.items}</td><td class="mono num">${money(o.amount)} MRU</td>
      <td>${orderPill(o.tone, o.status)}</td><td class="muted">${esc(o.date)}</td></tr>`).join('');
    loaded.orders = true;
  }

  // ================================================================
  // Livraison
  // ================================================================
  let shipping = { freeOver: 0, zones: [] };
  function renderZones() {
    const wrap = q('#ship-zones');
    wrap.innerHTML = shipping.zones.map((z, i) => `<div class="ship-row">
      <input class="zone-name" data-i="${i}" type="text" value="${esc(z.zone)}" placeholder="Zone (ex. Nouakchott)" />
      <div class="zone-fee"><input class="zone-fee-in" data-i="${i}" type="number" min="0" value="${z.fee}" /> <span>MRU</span></div>
      <button class="icon-btn danger" data-rm="${i}" title="Retirer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
    </div>`).join('');
    wrap.querySelectorAll('.zone-name').forEach((el) => el.addEventListener('input', () => { shipping.zones[el.dataset.i].zone = el.value; }));
    wrap.querySelectorAll('.zone-fee-in').forEach((el) => el.addEventListener('input', () => { shipping.zones[el.dataset.i].fee = Number(el.value) || 0; }));
    wrap.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { shipping.zones.splice(Number(b.dataset.rm), 1); renderZones(); }));
  }
  async function loadShipping() {
    const r = await api('/api/store', 'GET');
    if (!r.ok) return;
    shipping = r.data.store.shipping || { freeOver: 0, zones: [] };
    q('#ship-free').value = shipping.freeOver || 0;
    renderZones();
    loaded.store2 = true;
  }
  async function saveShipping() {
    shipping.freeOver = Number(q('#ship-free').value) || 0;
    const r = await api('/api/store/shipping', 'PUT', shipping);
    msg(q('#ship-msg'), r.ok ? 'success' : 'error', r.ok ? 'Livraison enregistrée.' : 'Erreur lors de l\'enregistrement.');
  }

  // ================================================================
  // Ma boutique (thèmes)
  // ================================================================
  let themes = [], store = null, selectedTheme = 'or-noir';
  function themeCard(t) {
    return `<button type="button" class="theme-card ${t.id === selectedTheme ? 'selected' : ''}" data-theme="${t.id}">
      <span class="theme-swatch" style="background:${t.bg}"><span class="sw-accent" style="background:linear-gradient(120deg,${t.accent},${t.accent2})"></span><span class="sw-dot" style="background:${t.surface};border-color:${t.accent}"></span></span>
      <span class="theme-info"><span class="theme-name">${esc(t.name)}</span><span class="theme-desc">${esc(t.desc)}</span></span>
      <span class="theme-check">✓</span>
    </button>`;
  }
  function renderThemePreview() {
    const t = themes.find((x) => x.id === selectedTheme) || themes[0];
    const tagline = q('#store-tagline').value || store.tagline || 'Bienvenue dans notre boutique';
    const name = (currentUser && currentUser.shopName) || 'Ma boutique';
    const prev = q('#store-preview');
    const card = (i) => `<div class="sp-card" style="background:${t.surface}"><div class="sp-img" style="background:linear-gradient(135deg,${t.accent}33,${t.surface})"></div><div class="sp-line" style="background:${t.accent}"></div><div class="sp-line short" style="background:${t.text}40"></div></div>`;
    prev.style.background = t.bg; prev.style.color = t.text;
    prev.innerHTML = `<div class="sp-head"><span class="sp-logo" style="background:linear-gradient(120deg,${t.accent},${t.accent2})"></span><span class="sp-name" style="color:${t.text}">${esc(name)}</span><span class="sp-cart" style="border-color:${t.accent};color:${t.accent}">Panier</span></div>
      <div class="sp-hero"><div class="sp-tag" style="color:${t.text}">${esc(tagline)}</div><div class="sp-btn" style="background:linear-gradient(120deg,${t.accent},${t.accent2})">Découvrir</div></div>
      <div class="sp-grid">${card() + card() + card()}</div>`;
  }
  function selectTheme(id) { selectedTheme = id; qa('.theme-card').forEach((c) => c.classList.toggle('selected', c.dataset.theme === id)); renderThemePreview(); }

  async function loadStore() {
    const r = await api('/api/store', 'GET');
    if (!r.ok) return;
    themes = r.data.themes; store = r.data.store; selectedTheme = store.theme;
    q('#theme-grid').innerHTML = themes.map(themeCard).join('');
    qa('.theme-card').forEach((c) => c.addEventListener('click', () => selectTheme(c.dataset.theme)));
    q('#store-tagline').value = store.tagline || '';
    q('#store-domain').value = store.domain || store.defaultDomain || '';
    q('#store-desc').value = store.description || '';
    q('#store-tagline').addEventListener('input', renderThemePreview);
    updateVisitLink(store.slug);
    renderThemePreview();
    loaded.store = true;
  }
  async function saveStore() {
    const payload = { theme: selectedTheme, tagline: q('#store-tagline').value.trim(), domain: q('#store-domain').value.trim(), description: q('#store-desc').value.trim() };
    const r = await api('/api/store', 'PUT', payload);
    if (r.ok) { store = r.data.store; updateVisitLink(store.slug); msg(q('#store-msg'), 'success', 'Boutique mise à jour. Thème « ' + (themes.find((t) => t.id === selectedTheme) || {}).name + ' » appliqué.'); }
    else msg(q('#store-msg'), 'error', 'Erreur lors de l\'enregistrement.');
  }
  function updateVisitLink(slug) { if (window.__KARAT_SPA__) return; const a = q('#visit-shop'); if (a && slug) a.href = '/boutique/' + slug; }

  // ================================================================
  // Init
  // ================================================================
  function wireChrome() {
    qa('.side-link').forEach((l) => l.addEventListener('click', () => switchSection(l.dataset.section)));
    const stog = q('#side-toggle'); if (stog) stog.addEventListener('click', () => q('#dash-side').classList.toggle('open'));
    qa('.period-btn').forEach((btn) => btn.addEventListener('click', () => { qa('.period-btn').forEach((b) => b.classList.remove('active')); btn.classList.add('active'); applyPeriod(btn.dataset.period); }));

    q('#add-product-btn') && q('#add-product-btn').addEventListener('click', () => openProductForm(null));
    q('#pf-cancel') && q('#pf-cancel').addEventListener('click', closeProductForm);
    q('#prod-form') && q('#prod-form').addEventListener('submit', submitProduct);
    q('#pf-price') && q('#pf-price').addEventListener('input', () => { q('#pf-fcfa').textContent = '≈ ' + money((Number(q('#pf-price').value) || 0) * 6) + ' FCFA'; });
    q('#ship-add') && q('#ship-add').addEventListener('click', () => { shipping.zones.push({ zone: '', fee: 0 }); renderZones(); });
    q('#ship-save') && q('#ship-save').addEventListener('click', saveShipping);
    q('#store-save') && q('#store-save').addEventListener('click', saveStore);

    const lo = q('#logout'); if (lo) lo.addEventListener('click', async () => { await api('/api/auth/logout', 'POST', {}); window.location.href = window.__KARAT_SPA__ ? '#/' : '/'; });
  }

  async function init() {
    const r = await api('/api/dashboard', 'GET');
    if (!r.ok) { if (r.status === 401 && !window.__KARAT_SPA__) window.location.href = '/connexion?suite=/tableau-de-bord'; return; }
    currentUser = r.data.user; overviewStats = r.data.stats;
    renderOverview(currentUser, overviewStats);
    if (!booted) { wireChrome(); booted = true; }
  }

  window.KaratDashboard = { init };
  if (!window.__KARAT_SPA__) document.addEventListener('DOMContentLoaded', init);
})();
