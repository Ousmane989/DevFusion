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
  let CUR = 'MRU';
  const mMain = (n) => money(n) + ' ' + CUR;
  const mAlt = (n) => { const r = 6; const a = CUR === 'FCFA' ? { v: Math.round(n / r), c: 'MRU' } : { v: Math.round(n * r), c: 'FCFA' }; return '≈ ' + money(a.v) + ' ' + a.c; };
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
    if (!stages.some((s) => s.value > 0)) { container.innerHTML = '<p class="dash-empty">Aucune donnée pour l\'instant.<br/>Les visites et commandes apparaîtront ici.</p>'; return; }
    const top = stages[0].value || 1;
    container.innerHTML = stages.map((st, i) => { const pctTop = (st.value / top) * 100; const step = i === 0 ? null : Math.round((st.value / (stages[i - 1].value || 1)) * 100); const col = gold(1 - i / Math.max(1, stages.length - 1)); return `<div class="funnel-row"><div class="funnel-head"><span class="funnel-name">${esc(st.stage)}</span><span class="funnel-val">${money(st.value)}${step !== null ? ` <span class="funnel-step">${step}%</span>` : ''}</span></div><div class="funnel-track"><div class="funnel-bar" data-w="${pctTop.toFixed(1)}" style="width:0;background:${col}"></div></div></div>`; }).join('');
    requestAnimationFrame(() => container.querySelectorAll('.funnel-bar').forEach((b, i) => setTimeout(() => { b.style.width = b.dataset.w + '%'; }, reduce ? 0 : 110 * i)));
  }
  function renderDonut(container, legendEl, sources) {
    const realTotal = sources.reduce((t, x) => t + x.value, 0);
    if (!realTotal) { container.innerHTML = '<p class="dash-empty">Aucune visite pour l\'instant.</p>'; legendEl.innerHTML = ''; return; }
    const total = realTotal, R = 60, C = 80, cir = 2 * Math.PI * R, gap = 3; let acc = -90, segs = '';
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
  let notifiedPending = false;
  const loaded = {};

  function msg(el, type, text) { if (el) { el.className = 'form-msg show ' + type; el.textContent = text; } }
  function clearMsg(el) { if (el) el.className = 'form-msg'; }

  // Notification in-app (nouvelle commande / a traiter)
  function dashToast(text) {
    let t = document.querySelector('.dash-toast');
    if (!t) { t = document.createElement('div'); t.className = 'dash-toast'; document.body.appendChild(t); }
    t.textContent = text; t.classList.add('show');
    clearTimeout(t._to); t._to = setTimeout(() => t.classList.remove('show'), 4000);
  }
  function setOrdersBadge(n) { const el = q('#badge-orders'); if (!el) return; el.textContent = n || ''; el.classList.toggle('alert', n > 0); }

  function switchSection(name) {
    qa('.dash-section').forEach((s) => s.classList.toggle('active', s.id === 'sec-' + name));
    qa('.side-link').forEach((l) => l.classList.toggle('active', l.dataset.section === name));
    const side = q('#dash-side'); if (side) side.classList.remove('open');
    window.scrollTo(0, 0);
    if (name === 'products' && !loaded.products) loadProducts();
    if (name === 'orders') loadOrders(); // toujours rafraichir (nouvelles commandes clients)
    if (name === 'shipping' && !loaded.store2) loadShipping();
    if (name === 'store' && !loaded.store) loadStore();
    if (name === 'marketing' && !loaded.marketing) loadMarketing();
    if (name === 'analytics') loadAnalytics();       // toujours rafraichir
    if (name === 'payment') loadPayment();            // encaissements a jour
    if (name === 'finance' && !loaded.finance) loadFinance();
    if (name === 'developer' && !loaded.developer) loadDeveloper();
    if (name === 'settings' && !loaded.settings) loadSettings();
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
    if (q('#side-plan')) q('#side-plan').textContent = 'Libre';
    CUR = user.currency || 'MRU';
    qa('.k-cur').forEach((e) => (e.textContent = CUR));

    qa('#visit-shop, #store-visit-btn').forEach((vs) => {
      if (window.__KARAT_SPA__) { vs.href = '#/boutique'; vs.removeAttribute('target'); }
      else vs.href = '/boutique/' + slugify(user.shopName);
    });

    // Tarifs desactives (usage libre) : pas de bandeau d'essai/abonnement.
    const bar = q('#trial-bar'); if (bar) bar.style.display = 'none';

    if (st.today) {
      q('#kpi-today').textContent = money(st.today.sales != null ? st.today.sales : 0);
      const nCmd = st.today.orders;
      q('#kpi-today-sub').textContent =
        nCmd + ' commande' + (nCmd > 1 ? 's' : '') + ' · ' + st.today.pending + ' à traiter';
    }
    setOrdersBadge(st.pending || 0);
    if (!notifiedPending && st.pending > 0) {
      notifiedPending = true;
      dashToast('🔔 ' + st.pending + ' commande' + (st.pending > 1 ? 's' : '') + ' à traiter');
    }
    applyPeriod(st.defaultPeriod || '30j');
    renderFunnel(q('#funnel'), st.funnel);
    renderDonut(q('#donut'), q('#donut-legend'), st.sources);
  }

  function applyPeriod(key) {
    const st = overviewStats; const P = st.periods[key], k = P.kpis;
    q('#dash-sub').textContent = 'Voici les performances de votre boutique sur les ' + P.rangeLabel + '.';
    qa('.k-period').forEach((e) => (e.textContent = P.subLabel));
    countTo(q('#kpi-rev'), k.revenue.value); q('#kpi-rev-fcfa').textContent = mAlt(k.revenue.value); q('#kpi-rev-delta').innerHTML = deltaChip(k.revenue.delta); q('#kpi-rev-spark').innerHTML = sparkline(k.revenue.spark);
    countTo(q('#kpi-orders'), k.orders.value); q('#kpi-orders-delta').innerHTML = deltaChip(k.orders.delta); q('#kpi-orders-spark').innerHTML = sparkline(k.orders.spark);
    countTo(q('#kpi-visitors'), k.visitors.value); q('#kpi-visitors-delta').innerHTML = deltaChip(k.visitors.delta); q('#kpi-visitors-spark').innerHTML = sparkline(k.visitors.spark);
    countTo(q('#kpi-conv'), k.conversion.value, { fmt: (v) => v.toFixed(1) }); q('#kpi-conv-delta').innerHTML = deltaChip(k.conversion.delta);
    countTo(q('#kpi-basket'), k.basket.value); q('#kpi-basket-fcfa').textContent = mAlt(k.basket.value); q('#kpi-basket-delta').innerHTML = deltaChip(k.basket.delta);
    renderArea(q('#revenue-chart'), P.series);
  }

  // ================================================================
  // Produits
  // ================================================================
  let categories = [];
  let pfImage = ''; // photo du produit en cours d'edition (data URL)
  function statusPill(active) { return active ? '<span class="pill good">En ligne</span>' : '<span class="pill muted-pill">Brouillon</span>'; }
  function thumb(p) { return p.image ? `<img class="prod-thumb" src="${esc(p.image)}" alt="" />` : `<span class="prod-thumb emblem">${esc((p.name[0] || '?').toUpperCase())}</span>`; }

  // Redimensionne une image cote client (max 800px) en data URL JPEG.
  function resizeImage(file, cb, maxSize) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = maxSize || 800; let w = img.width, h = img.height;
        if (w > h && w > max) { h = Math.round(h * max / w); w = max; } else if (h >= w && h > max) { w = Math.round(w * max / h); h = max; }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  function renderPfImage() {
    const el = q('#pf-image-preview'); if (!el) return;
    el.innerHTML = pfImage ? `<img src="${esc(pfImage)}" alt="" />` : '<span>Aucune image</span>';
  }

  function renderProducts(products) {
    const body = q('#products-body'), empty = q('#products-empty');
    q('#badge-products').textContent = products.length || '';
    if (!products.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = products.map((p) => `<tr>
      <td class="cell-prod"><div class="prod-cell">${thumb(p)}<div><strong>${esc(p.name)}</strong>${p.description ? `<div class="muted small">${esc(p.description)}</div>` : ''}</div></div></td>
      <td class="muted">${esc(p.category)}</td>
      <td class="mono num">${mMain(p.price)}<div class="muted small">${mAlt(p.price)}</div></td>
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
    q('#pf-price').value = prod ? prod.price : '';
    q('#pf-stock').value = prod ? prod.stock : '';
    q('#pf-desc').value = prod ? prod.description : '';
    if (q('#pf-subtitle')) q('#pf-subtitle').value = prod ? (prod.subtitle || '') : '';
    if (q('#pf-compare')) q('#pf-compare').value = prod && prod.compareAt ? prod.compareAt : '';
    if (q('#pf-variants')) q('#pf-variants').value = prod && prod.variants ? prod.variants.join(', ') : '';
    if (q('#pf-rating')) q('#pf-rating').value = prod && prod.rating ? prod.rating : '';
    if (q('#pf-reviews')) q('#pf-reviews').value = prod && prod.reviewsCount ? prod.reviewsCount : '';
    q('#pf-active').checked = prod ? prod.active : true;
    if (q('#pf-price-label')) q('#pf-price-label').textContent = 'Prix (' + CUR + ')';
    if (q('#pf-compare-label')) q('#pf-compare-label').textContent = 'Prix barré / promo (' + CUR + ')';
    q('#pf-fcfa').textContent = mAlt(prod ? prod.price : 0);
    pfImage = prod ? (prod.image || '') : '';
    renderPfImage();
    const fileInput = q('#pf-image-file'); if (fileInput) fileInput.value = '';
    form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }
  function closeProductForm() { q('#product-form').style.display = 'none'; }

  async function submitProduct(e) {
    e.preventDefault();
    const m = q('#pf-msg'); clearMsg(m);
    qa('#prod-form .field').forEach((f) => f.classList.remove('invalid'));
    const id = q('#pf-id').value;
    const payload = {
      name: q('#pf-name').value.trim(), category: q('#pf-category').value,
      priceMru: Number(q('#pf-price').value), stock: Number(q('#pf-stock').value),
      description: q('#pf-desc').value.trim(), image: pfImage, active: q('#pf-active').checked,
      subtitle: q('#pf-subtitle') ? q('#pf-subtitle').value.trim() : '',
      compareAt: q('#pf-compare') ? Number(q('#pf-compare').value) || 0 : 0,
      variants: q('#pf-variants') ? q('#pf-variants').value : '',
      rating: q('#pf-rating') ? Number(q('#pf-rating').value) || 0 : 0,
      reviewsCount: q('#pf-reviews') ? Number(q('#pf-reviews').value) || 0 : 0,
    };
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
  let orderStatuses = [];
  function applySummary(sm) { countTo(q('#ord-total'), sm.total); countTo(q('#ord-toprocess'), sm.toProcess); countTo(q('#ord-delivered'), sm.delivered); countTo(q('#ord-rev'), sm.revenue); setOrdersBadge(sm.toProcess); }
  function statusSelect(o) {
    const opts = orderStatuses.map((s) => `<option value="${s.key}" ${s.key === o.status ? 'selected' : ''}>${esc(s.label)}</option>`).join('');
    return `<span class="stsel tone-${o.tone}"><select data-order="${o.id}">${opts}</select></span>`;
  }
  async function loadOrders() {
    const r = await api('/api/orders', 'GET');
    if (!r.ok) return;
    const { orders, summary, statuses } = r.data;
    orderStatuses = statuses || [];
    applySummary(summary);
    q('#orders-full-body').innerHTML = orders.map((o) => `<tr data-row="${o.id}">
      <td class="mono">${esc(o.ref)}</td>
      <td>${esc(o.customer)}${o.phone ? `<div class="small"><a class="tel-link" href="tel:${esc(o.phone)}">📞 ${esc(o.phone)}</a></div>` : ''}</td>
      <td class="muted">${esc(o.city)}</td>
      <td class="cell-prod">${esc(o.productsLabel)}</td><td class="mono num">${mMain(o.amount)}</td>
      <td><span class="cod">À la livraison</span></td>
      <td>${statusSelect(o)}</td><td class="muted">${esc(o.date)}</td></tr>`).join('');
    q('#orders-full-body').querySelectorAll('select[data-order]').forEach((sel) => sel.addEventListener('change', () => changeStatus(sel)));
    loaded.orders = true;
  }
  async function changeStatus(sel) {
    const id = sel.dataset.order, status = sel.value;
    const r = await api('/api/orders/' + id + '/status', 'PUT', { status });
    if (r.ok) {
      const meta = orderStatuses.find((s) => s.key === status);
      const wrap = sel.closest('.stsel'); if (wrap && meta) wrap.className = 'stsel tone-' + meta.tone;
      if (r.data.summary) applySummary(r.data.summary);
      // Le chiffre d'affaires depend des commandes livrees : on rafraichit la vue d'ensemble.
      const rd = await api('/api/dashboard', 'GET');
      if (rd.ok) { currentUser = rd.data.user; overviewStats = rd.data.stats; renderOverview(currentUser, overviewStats); }
    }
  }

  // ================================================================
  // Livraison
  // ================================================================
  let shipping = { freeOver: 0, zones: [] };
  function renderZones() {
    const wrap = q('#ship-zones');
    wrap.innerHTML = shipping.zones.map((z, i) => `<div class="ship-row">
      <input class="zone-name" data-i="${i}" type="text" value="${esc(z.zone)}" placeholder="Zone (ex. Nouakchott)" />
      <div class="zone-fee"><input class="zone-fee-in" data-i="${i}" type="number" min="0" value="${z.fee}" /> <span>${CUR}</span></div>
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
  let storeLogo = '', storeBanner = '';
  function renderBrand() {
    const lp = q('#logo-preview'); if (lp) lp.innerHTML = storeLogo ? `<img src="${esc(storeLogo)}" alt="" />` : '<span>Aucun</span>';
    const bp = q('#banner-preview'); if (bp) bp.innerHTML = storeBanner ? `<img src="${esc(storeBanner)}" alt="" />` : '<span>Aucune</span>';
  }
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
    if (q('#store-hero')) q('#store-hero').value = store.heroTitle || '';
    if (q('#store-about')) q('#store-about').value = store.about || '';
    if (q('#store-returns')) q('#store-returns').value = store.returnsPolicy || '';
    if (q('#store-slug')) q('#store-slug').value = store.slug || '';
    if (q('#slug-suffix')) q('#slug-suffix').textContent = '.' + (store.baseDomain || 'karat.shop');
    q('#store-desc').value = store.description || '';
    if (q('#store-phone')) q('#store-phone').value = store.phone || '';
    if (q('#store-whatsapp')) q('#store-whatsapp').value = store.whatsapp || '';
    if (q('#store-email')) q('#store-email').value = store.email || '';
    if (q('#store-address')) q('#store-address').value = store.address || '';
    storeLogo = store.logo || ''; storeBanner = store.banner || '';
    renderBrand();
    q('#store-tagline').addEventListener('input', renderThemePreview);
    updateVisitLink(store.slug);
    updateStoreLink(store);
    renderThemePreview();
    loaded.store = true;
  }
  async function saveStore() {
    const val = (id) => (q(id) ? q(id).value.trim() : '');
    const sf = q('[data-field="slug"]'); if (sf) sf.classList.remove('invalid');
    const payload = {
      theme: selectedTheme, tagline: val('#store-tagline'), heroTitle: val('#store-hero'), about: val('#store-about'),
      returnsPolicy: val('#store-returns'),
      slug: val('#store-slug'), description: val('#store-desc'),
      phone: val('#store-phone'), whatsapp: val('#store-whatsapp'), email: val('#store-email'), address: val('#store-address'),
      logo: storeLogo, banner: storeBanner,
    };
    const r = await api('/api/store', 'PUT', payload);
    if (r.ok) {
      store = r.data.store;
      if (q('#store-slug')) q('#store-slug').value = store.slug || '';
      updateVisitLink(store.slug); updateStoreLink(store);
      msg(q('#store-msg'), 'success', 'Boutique mise à jour. Thème « ' + (themes.find((t) => t.id === selectedTheme) || {}).name + ' » appliqué.');
    } else if (r.data && r.data.errors && r.data.errors.slug) {
      if (sf) sf.classList.add('invalid');
      msg(q('#store-msg'), 'error', 'Cette adresse de boutique est déjà prise. Choisissez-en une autre.');
    } else {
      msg(q('#store-msg'), 'error', 'Erreur lors de l\'enregistrement.');
    }
  }
  function updateVisitLink(slug) { if (window.__KARAT_SPA__ || !slug) return; qa('#visit-shop, #store-visit-btn').forEach((a) => { a.href = '/boutique/' + slug; }); }
  function updateStoreLink(st) {
    const a = q('#store-link'); if (!a || !st) return;
    a.textContent = st.domain || ((st.slug || '') + '.' + (st.baseDomain || 'karat.shop'));
    if (window.__KARAT_SPA__) { a.href = '#/boutique'; a.removeAttribute('target'); }
    else a.href = st.storeUrl || ('/boutique/' + (st.slug || ''));
  }

  // ================================================================
  // Marketing (Facebook / Instagram)
  // ================================================================
  let mktStore = null;
  // URL absolue de la boutique, base des liens de campagne.
  function storeBaseUrl(st) {
    if (!st) return '';
    if (!window.__KARAT_SPA__) {
      const p = st.storeUrl || ('/boutique/' + (st.slug || ''));
      return location.origin + p;
    }
    return 'https://' + (st.domain || ((st.slug || 'ma-boutique') + '.karat.shop'));
  }
  function copyFrom(sel) {
    const el = q(sel); if (!el) return;
    el.select && el.select();
    const done = () => dashToast('✓ Lien copié');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(el.value).then(done).catch(() => { try { document.execCommand('copy'); done(); } catch (_) {} });
    else { try { document.execCommand('copy'); done(); } catch (_) {} }
  }
  function updateUtm() {
    if (!mktStore) return;
    const base = storeBaseUrl(mktStore);
    const platform = (q('#utm-platform') && q('#utm-platform').value) || 'facebook';
    const camp = slugify((q('#utm-campaign') && q('#utm-campaign').value) || 'campagne');
    const medium = platform === 'whatsapp' ? 'social' : 'paid';
    const link = base + '?utm_source=' + platform + '&utm_medium=' + medium + '&utm_campaign=' + encodeURIComponent(camp);
    if (q('#utm-link')) q('#utm-link').value = link;
    const share = q('#utm-share'); if (!share) return;
    const enc = encodeURIComponent(link);
    const wtext = encodeURIComponent('Découvrez ma boutique 🛍️ ' + link);
    share.innerHTML = `<span class="mkt-share-l">Partager :</span>
      <a class="btn btn-ghost btn-sm" href="https://www.facebook.com/sharer/sharer.php?u=${enc}" target="_blank" rel="noopener">📘 Facebook</a>
      <a class="btn btn-ghost btn-sm" href="https://wa.me/?text=${wtext}" target="_blank" rel="noopener">💬 WhatsApp</a>`;
  }
  function fillMarketing(st) {
    mktStore = st;
    const mk = st.marketing || {};
    if (q('#mkt-pixel')) q('#mkt-pixel').value = mk.metaPixelId || '';
    if (q('#mkt-fb')) q('#mkt-fb').value = mk.fbPage || '';
    if (q('#mkt-ig')) q('#mkt-ig').value = mk.instagram || '';
    if (q('#mkt-domain')) q('#mkt-domain').value = mk.metaDomainVerification || '';
    const cat = window.__KARAT_SPA__ ? '' : (location.origin + '/api/public/store/' + (st.slug || '') + '/catalog.csv');
    if (q('#mkt-catalog')) q('#mkt-catalog').value = cat || (mk.catalogUrl || '');
    const cl = q('#mkt-catalog-link'); if (cl) { const href = q('#mkt-catalog').value; cl.href = href; if (window.__KARAT_SPA__) { cl.href = '#'; } }
    updateUtm();
  }
  async function loadMarketing() {
    const r = await api('/api/store', 'GET');
    if (!r.ok) return;
    fillMarketing(r.data.store);
    loaded.marketing = true;
  }
  async function saveMarketing() {
    const payload = {
      metaPixelId: (q('#mkt-pixel') && q('#mkt-pixel').value.trim()) || '',
      fbPage: (q('#mkt-fb') && q('#mkt-fb').value.trim()) || '',
      instagram: (q('#mkt-ig') && q('#mkt-ig').value.trim()) || '',
      metaDomainVerification: (q('#mkt-domain') && q('#mkt-domain').value.trim()) || '',
    };
    const r = await api('/api/store', 'PUT', payload);
    if (r.ok) { fillMarketing(r.data.store); msg(q('#mkt-msg'), 'success', 'Paramètres marketing enregistrés.'); }
    else msg(q('#mkt-msg'), 'error', 'Erreur lors de l\'enregistrement.');
  }

  // ================================================================
  // Utilitaires communs aux nouvelles sections
  // ================================================================
  function fval(sel) { const el = q(sel); return el ? el.value.trim() : ''; }
  function barList(el, items, fmt) {
    if (!el) return;
    if (!items.length) { el.innerHTML = '<p class="dash-empty">Aucune donnée pour l\'instant.</p>'; return; }
    const max = Math.max.apply(null, items.map((i) => i.value)) || 1;
    el.innerHTML = items.map((i, k) => `<div class="bar-row"><div class="bar-head"><span class="bar-name">${esc(i.name)}</span><span class="bar-val">${fmt ? fmt(i) : i.value}</span></div><div class="bar-track"><div class="bar-fill" data-w="${(i.value / max * 100).toFixed(1)}" style="width:0;background:${gold(1 - k / Math.max(1, items.length - 1))}"></div></div></div>`).join('');
    requestAnimationFrame(() => el.querySelectorAll('.bar-fill').forEach((b, i) => setTimeout(() => { b.style.width = b.dataset.w + '%'; }, reduce ? 0 : 60 * i)));
  }

  // ================================================================
  // Analyses
  // ================================================================
  async function loadAnalytics() {
    const r = await api('/api/analytics', 'GET'); if (!r.ok) return;
    const d = r.data, s = d.summary;
    q('#an-delivrate').textContent = s.deliveryRate; q('#an-delivered').textContent = s.delivered + ' livrées';
    q('#an-cancelrate').textContent = s.cancelRate; q('#an-cancelled').textContent = s.cancelled + ' annulées';
    q('#an-units').textContent = s.unitsTotal;
    q('#an-basket').textContent = money(s.avgBasket); q('#an-basket-alt').textContent = mAlt(s.avgBasket);
    barList(q('#an-products'), d.topProducts.map((p) => ({ name: p.name, value: p.qty })), (i) => i.value + ' vendu' + (i.value > 1 ? 's' : ''));
    barList(q('#an-cities'), d.byCity.map((c) => ({ name: c.city, value: c.orders })), (i) => i.value + ' cmd');
    const st = d.byStatus, tot = st.reduce((a, b) => a + b.value, 0) || 1;
    q('#an-status').innerHTML = st.map((x) => `<div class="sbar tone-${x.tone}"><div class="sbar-top"><span>${esc(x.label)}</span><span>${x.value}</span></div><div class="sbar-track"><div class="sbar-fill" style="width:${(x.value / tot * 100).toFixed(1)}%"></div></div></div>`).join('');
    loaded.analytics = true;
  }

  // ================================================================
  // Paiement
  // ================================================================
  async function loadPayment() {
    const r = await api('/api/store', 'GET'); if (!r.ok) return;
    const pay = r.data.store.payment || {};
    if (q('#pay-wave')) q('#pay-wave').value = pay.wave || '';
    if (q('#pay-om')) q('#pay-om').value = pay.om || '';
    const ro = await api('/api/orders', 'GET');
    if (ro.ok) {
      const delivered = (ro.data.orders || []).filter((o) => o.status === 'livree');
      const total = delivered.reduce((s, o) => s + o.amount, 0);
      q('#pay-collected').textContent = money(total);
      q('#pay-collected-count').textContent = delivered.length + ' commande' + (delivered.length > 1 ? 's' : '') + ' livrée' + (delivered.length > 1 ? 's' : '');
      q('#pay-recent').innerHTML = delivered.length
        ? delivered.slice(0, 8).map((o) => `<div class="pay-line"><div><strong>${esc(o.ref)}</strong><span class="muted small">${esc(o.customer)} · ${esc(o.city)}</span></div><span class="mono">${mMain(o.amount)}</span></div>`).join('')
        : '<p class="dash-empty">Aucun encaissement pour l\'instant.</p>';
    }
    loaded.payment = true;
  }
  async function savePayment() {
    const r = await api('/api/store', 'PUT', { wave: fval('#pay-wave'), om: fval('#pay-om') });
    msg(q('#pay-msg'), r.ok ? 'success' : 'error', r.ok ? 'Moyens de paiement enregistrés.' : 'Erreur lors de l\'enregistrement.');
  }

  // ================================================================
  // Comptabilité
  // ================================================================
  function renderDualChart(el, months) {
    if (!el) return;
    const max = Math.max(1, Math.max.apply(null, months.map((m) => Math.max(m.revenue, m.expense))));
    const cols = months.map((m) => `<div class="dc-col"><div class="dc-bars"><div class="dc-bar rev" style="height:${(m.revenue / max * 100).toFixed(1)}%"><span class="dc-tip">CA ${money(m.revenue)}</span></div><div class="dc-bar exp" style="height:${(m.expense / max * 100).toFixed(1)}%"><span class="dc-tip">Dép. ${money(m.expense)}</span></div></div><span class="dc-label">${esc(m.label)}</span></div>`).join('');
    el.innerHTML = `<div class="dc-cols">${cols}</div><div class="dc-legend"><span><i class="dc-dot rev"></i>Chiffre d'affaires</span><span><i class="dc-dot exp"></i>Dépenses</span></div>`;
  }
  function renderFinance(d) {
    const s = d.summary;
    q('#fin-rev').textContent = money(s.revenue); q('#fin-rev-count').textContent = s.ordersCount + ' commande' + (s.ordersCount > 1 ? 's' : '') + ' livrée' + (s.ordersCount > 1 ? 's' : '');
    q('#fin-exp').textContent = money(s.expenses);
    q('#fin-profit').textContent = money(s.profit); q('#fin-margin').textContent = 'Marge ' + s.margin + ' %';
    renderDualChart(q('#fin-chart'), d.monthly);
    const list = q('#exp-list');
    list.innerHTML = d.expenses.length
      ? d.expenses.map((e) => `<div class="exp-row"><div><strong>${esc(e.label)}</strong><span class="muted small">${esc(e.category)} · ${esc(e.spent_on)}</span></div><div class="exp-amt"><span class="mono">${mMain(e.amount_mru)}</span><button class="icon-btn danger" data-exp="${e.id}" title="Supprimer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div></div>`).join('')
      : '<p class="dash-empty">Aucune dépense enregistrée.</p>';
    list.querySelectorAll('[data-exp]').forEach((b) => b.addEventListener('click', () => deleteExpense(b.dataset.exp)));
  }
  async function loadFinance() {
    const r = await api('/api/finance', 'GET'); if (!r.ok) return;
    renderFinance(r.data);
    const sel = q('#exp-cat'); if (sel && !sel.children.length) sel.innerHTML = (r.data.categories || []).map((c) => `<option>${esc(c)}</option>`).join('');
    if (q('#exp-date') && !q('#exp-date').value) q('#exp-date').value = new Date().toISOString().slice(0, 10);
    if (q('#exp-amount-label')) q('#exp-amount-label').textContent = 'Montant (' + CUR + ')';
    const ex = q('#fin-export');
    if (ex) { if (window.__KARAT_SPA__) ex.style.display = 'none'; else ex.href = '/api/finance/export.csv'; }
    loaded.finance = true;
  }
  async function addExpense() {
    const m = q('#exp-msg'); clearMsg(m);
    const payload = { label: fval('#exp-label'), category: q('#exp-cat').value, amount: Number(q('#exp-amount').value), date: q('#exp-date').value };
    const r = await api('/api/finance/expense', 'POST', payload);
    if (!r.ok) { msg(m, 'error', 'Vérifiez le libellé et le montant.'); return; }
    q('#exp-label').value = ''; q('#exp-amount').value = '';
    renderFinance(r.data);
  }
  async function deleteExpense(id) { const r = await api('/api/finance/expense/' + id, 'DELETE'); if (r.ok) renderFinance(r.data); }

  // ================================================================
  // API & Webhooks
  // ================================================================
  function renderDeveloper(d) {
    q('#keys-list').innerHTML = d.keys.length
      ? d.keys.map((k) => `<div class="dev-item"><div><strong>${esc(k.label)}</strong><div class="muted small mono">${esc(k.prefix)}…${k.lastUsedAt ? ' · utilisée' : ''}</div></div><button class="icon-btn danger" data-key="${k.id}" title="Révoquer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>`).join('')
      : '<p class="dash-empty">Aucune clé pour l\'instant.</p>';
    q('#keys-list').querySelectorAll('[data-key]').forEach((b) => b.addEventListener('click', () => deleteKey(b.dataset.key)));
    q('#wh-list').innerHTML = d.webhooks.length
      ? d.webhooks.map((w) => `<div class="dev-item"><div class="dev-item-b"><strong class="mono small">${esc(w.url)}</strong><span class="muted small">${esc(w.events.join(', '))}</span></div><div class="dev-item-a"><button class="btn btn-ghost btn-sm" data-whtest="${w.id}">Tester</button><button class="icon-btn danger" data-wh="${w.id}" title="Supprimer"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div></div>`).join('')
      : '<p class="dash-empty">Aucun webhook.</p>';
    q('#wh-list').querySelectorAll('[data-wh]').forEach((b) => b.addEventListener('click', () => deleteWebhook(b.dataset.wh)));
    q('#wh-list').querySelectorAll('[data-whtest]').forEach((b) => b.addEventListener('click', () => testWebhook(b.dataset.whtest, b)));
  }
  async function loadDeveloper() {
    const r = await api('/api/dev', 'GET'); if (!r.ok) return;
    renderDeveloper(r.data);
    if (q('#endpoint-list')) q('#endpoint-list').innerHTML = (r.data.endpoints || []).map((e) => `<li><code>${esc(e)}</code></li>`).join('');
    loaded.developer = true;
  }
  async function newKey() {
    const r = await api('/api/dev/key', 'POST', { label: 'Clé du ' + new Date().toLocaleDateString('fr-FR') });
    if (!r.ok) return;
    q('#key-value').value = r.data.key; q('#key-reveal').style.display = 'block';
    await loadDeveloper();
  }
  async function deleteKey(id) { if (!window.confirm('Révoquer cette clé ? Les intégrations qui l\'utilisent cesseront de fonctionner.')) return; const r = await api('/api/dev/key/' + id, 'DELETE'); if (r.ok) loadDeveloper(); }
  async function addWebhook() {
    const m = q('#wh-msg'); clearMsg(m);
    const r = await api('/api/dev/webhook', 'POST', { url: fval('#wh-url') });
    if (!r.ok) { msg(m, 'error', 'URL invalide (elle doit commencer par http/https).'); return; }
    q('#wh-url').value = ''; loadDeveloper();
  }
  async function deleteWebhook(id) { const r = await api('/api/dev/webhook/' + id, 'DELETE'); if (r.ok) loadDeveloper(); }
  async function testWebhook(id, btn) {
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    const r = await api('/api/dev/webhook/' + id + '/test', 'POST', {});
    if (btn) { btn.disabled = false; btn.textContent = 'Tester'; }
    dashToast(r.ok && r.data && r.data.ok ? '✓ Webhook joignable' : '✖ Webhook injoignable (vérifiez l\'URL)');
  }

  // ================================================================
  // Paramètres
  // ================================================================
  async function loadSettings() {
    const r = await api('/api/account', 'GET'); if (!r.ok) return;
    const u = r.data.user;
    q('#set-name').value = u.name || ''; q('#set-email').value = u.email || '';
    q('#set-phone').value = u.phone || ''; q('#set-shop').value = u.shopName || '';
    loaded.settings = true;
  }
  async function saveSettings() {
    const m = q('#set-msg'); clearMsg(m);
    const r = await api('/api/account', 'PUT', { name: fval('#set-name'), phone: fval('#set-phone'), shopName: fval('#set-shop') });
    if (!r.ok) { msg(m, 'error', 'Veuillez corriger les champs.'); return; }
    currentUser = r.data.user;
    if (q('#user-name')) q('#user-name').textContent = currentUser.name;
    if (q('#shop-name')) q('#shop-name').textContent = currentUser.shopName;
    msg(m, 'success', 'Profil mis à jour.');
  }
  async function changePassword() {
    const m = q('#pw-msg'); clearMsg(m);
    const r = await api('/api/account/password', 'POST', { current: q('#pw-current').value, next: q('#pw-next').value });
    if (!r.ok) {
      const e = (r.data && r.data.errors) || {};
      msg(m, 'error', e.current ? 'Mot de passe actuel incorrect.' : (e.next ? 'Nouveau mot de passe : 8 caractères minimum.' : 'Erreur.'));
      return;
    }
    q('#pw-current').value = ''; q('#pw-next').value = '';
    msg(m, 'success', 'Mot de passe modifié.');
  }
  async function deleteAccount() {
    if (!window.confirm('Supprimer définitivement votre compte, votre boutique et toutes vos commandes ? Cette action est irréversible.')) return;
    const r = await api('/api/account', 'DELETE', { password: q('#del-pw').value });
    if (!r.ok) { msg(q('#pw-msg'), 'error', 'Mot de passe incorrect.'); return; }
    window.location.href = window.__KARAT_SPA__ ? '#/' : '/';
  }

  async function doLogout() {
    await api('/api/auth/logout', 'POST', {});
    window.location.href = window.__KARAT_SPA__ ? '#/' : '/';
  }

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
    q('#pf-price') && q('#pf-price').addEventListener('input', () => { q('#pf-fcfa').textContent = mAlt(Number(q('#pf-price').value) || 0); });
    q('#pf-image-file') && q('#pf-image-file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; resizeImage(f, (data) => { pfImage = data; renderPfImage(); }); });
    q('#pf-image-clear') && q('#pf-image-clear').addEventListener('click', () => { pfImage = ''; renderPfImage(); const fi = q('#pf-image-file'); if (fi) fi.value = ''; });
    q('#ship-add') && q('#ship-add').addEventListener('click', () => { shipping.zones.push({ zone: '', fee: 0 }); renderZones(); });
    q('#ship-save') && q('#ship-save').addEventListener('click', saveShipping);
    q('#store-save') && q('#store-save').addEventListener('click', saveStore);
    q('#logo-file') && q('#logo-file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; resizeImage(f, (data) => { storeLogo = data; renderBrand(); }, 400); });
    q('#logo-clear') && q('#logo-clear').addEventListener('click', () => { storeLogo = ''; renderBrand(); const fi = q('#logo-file'); if (fi) fi.value = ''; });
    q('#banner-file') && q('#banner-file').addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; if (!f) return; resizeImage(f, (data) => { storeBanner = data; renderBrand(); }, 1400); });
    q('#banner-clear') && q('#banner-clear').addEventListener('click', () => { storeBanner = ''; renderBrand(); const fi = q('#banner-file'); if (fi) fi.value = ''; });

    q('#mkt-save') && q('#mkt-save').addEventListener('click', saveMarketing);
    q('#utm-platform') && q('#utm-platform').addEventListener('change', updateUtm);
    q('#utm-campaign') && q('#utm-campaign').addEventListener('input', updateUtm);
    qa('[data-copy]').forEach((b) => b.addEventListener('click', () => copyFrom(b.dataset.copy)));

    // Paiement / Comptabilité / API / Paramètres
    q('#pay-save') && q('#pay-save').addEventListener('click', savePayment);
    q('#exp-add') && q('#exp-add').addEventListener('click', addExpense);
    q('#key-new') && q('#key-new').addEventListener('click', newKey);
    q('#wh-add') && q('#wh-add').addEventListener('click', addWebhook);
    q('#set-save') && q('#set-save').addEventListener('click', saveSettings);
    q('#pw-save') && q('#pw-save').addEventListener('click', changePassword);
    q('#account-delete') && q('#account-delete').addEventListener('click', deleteAccount);

    qa('#logout, #logout-side, #logout-settings').forEach((b) => b.addEventListener('click', doLogout));
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
