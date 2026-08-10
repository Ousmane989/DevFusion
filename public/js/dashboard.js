/* ==================================================================
   Karat — tableau de bord : rendu des statistiques et des graphiques.
   Graphiques en SVG « maison » (aucune librairie externe).
   ================================================================== */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const money = (n) => Number(Math.round(n)).toLocaleString('fr-FR');

  // Interpolation sur la rampe doree (fonce -> clair) selon la valeur.
  function gold(t) {
    t = Math.max(0, Math.min(1, t));
    const a = [122, 95, 31], b = [245, 215, 126];
    const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  // Compteur anime generique.
  function countTo(el, target, opts) {
    opts = opts || {};
    const fmt = opts.fmt || money;
    if (reduce) { el.textContent = fmt(target); return; }
    const dur = 900, start = performance.now();
    (function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * e);
      if (p < 1) requestAnimationFrame(tick);
    })(performance.now());
  }

  // -------- Sparkline (mini courbe dans les KPI) --------------------
  function sparkline(values) {
    const w = 120, h = 34, pad = 3;
    const max = Math.max.apply(null, values), min = Math.min.apply(null, values);
    const span = max - min || 1;
    const pts = values.map((v, i) => {
      const x = pad + (i / (values.length - 1 || 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return [x, y];
    });
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = line + ` L${pts[pts.length - 1][0].toFixed(1)} ${h} L${pts[0][0].toFixed(1)} ${h} Z`;
    const up = values[values.length - 1] >= values[0];
    const stroke = up ? '#D4AF37' : '#c98a80';
    const uid = 'spk' + Math.random().toString(36).slice(2, 7);
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${stroke}" stop-opacity=".28"/><stop offset="1" stop-color="${stroke}" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${area}" fill="url(#${uid})"/>
      <path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function deltaChip(delta) {
    const up = delta >= 0;
    const arrow = up
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17 17 7M9 7h8v8"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 7 7 17M15 17H7V9"/></svg>';
    return `<span class="delta ${up ? 'up' : 'down'}">${arrow}${Math.abs(delta)}%</span>`;
  }

  // -------- Graphique d'aire (CA dans le temps) ---------------------
  function renderArea(container, series) {
    const W = 760, H = 260, padL = 8, padR = 8, padT = 18, padB = 28;
    const values = series.map((d) => d.value);
    const max = Math.max.apply(null, values) * 1.12;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const n = series.length;
    const x = (i) => padL + (i / (n - 1 || 1)) * (W - padL - padR);
    const y = (v) => padT + (1 - v / (max || 1)) * (H - padT - padB);

    const pts = series.map((d, i) => [x(i), y(d.value)]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const area = line + ` L${x(n - 1).toFixed(1)} ${H - padB} L${x(0).toFixed(1)} ${H - padB} Z`;

    let grid = '';
    for (let g = 0; g <= 4; g++) {
      const gy = y((max / 4) * g);
      grid += `<line x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - padR}" y2="${gy.toFixed(1)}" class="grid"/>`;
      grid += `<text x="${padL}" y="${(gy - 4).toFixed(1)}" class="ytick">${money((max / 4) * g)}</text>`;
    }
    const avgY = y(avg);
    const step = Math.ceil(n / 7);
    let xlabels = '';
    series.forEach((d, i) => {
      if (i % step === 0 || i === n - 1) xlabels += `<text x="${x(i).toFixed(1)}" y="${H - 8}" class="xtick">${d.label}</text>`;
    });

    container.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" class="area-chart" preserveAspectRatio="none" role="img" aria-label="Evolution du chiffre d'affaires">
        <defs><linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#F5D77E" stop-opacity=".38"/><stop offset="1" stop-color="#D4AF37" stop-opacity="0"/>
        </linearGradient></defs>
        ${grid}
        <line x1="${padL}" y1="${avgY.toFixed(1)}" x2="${W - padR}" y2="${avgY.toFixed(1)}" class="avg-line"/>
        <text x="${W - padR}" y="${(avgY - 5).toFixed(1)}" class="avg-label" text-anchor="end">Moyenne ${money(avg)}</text>
        <path d="${area}" fill="url(#area-grad)"/>
        <path d="${line}" fill="none" stroke="#F5D77E" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        ${xlabels}
        <g class="hover-layer" style="opacity:0"><line class="crosshair" y1="${padT}" y2="${H - padB}"/><circle class="hover-dot" r="4.5"/></g>
      </svg>
      <div class="chart-tip" style="opacity:0"></div>`;

    if (!reduce) {
      const path = container.querySelector('path[stroke]');
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.getBoundingClientRect();
      path.style.transition = 'stroke-dashoffset 1.1s ease';
      path.style.strokeDashoffset = '0';
    }

    const svg = container.querySelector('svg');
    const layer = container.querySelector('.hover-layer');
    const cross = container.querySelector('.crosshair');
    const dot = container.querySelector('.hover-dot');
    const tip = container.querySelector('.chart-tip');
    function move(ev) {
      const rect = svg.getBoundingClientRect();
      const px = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left) / rect.width;
      let i = Math.max(0, Math.min(n - 1, Math.round(px * (n - 1))));
      const cx = x(i), cy = y(series[i].value);
      layer.style.opacity = 1;
      cross.setAttribute('x1', cx); cross.setAttribute('x2', cx);
      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
      tip.style.opacity = 1;
      tip.innerHTML = `<span class="t-label">${series[i].label}</span><span class="t-val">${money(series[i].value)} MRU</span>`;
      tip.style.left = (cx / W) * 100 + '%';
      tip.style.top = (cy / H) * 100 + '%';
    }
    function leave() { layer.style.opacity = 0; tip.style.opacity = 0; }
    svg.addEventListener('mousemove', move);
    svg.addEventListener('mouseleave', leave);
    svg.addEventListener('touchmove', move, { passive: true });
    svg.addEventListener('touchend', leave);
  }

  // -------- Barres horizontales (categories) -----------------------
  function renderBars(container, rows, unit) {
    const max = Math.max.apply(null, rows.map((c) => c.value));
    container.innerHTML = rows.map((c, i) => {
      const pct = (c.value / max) * 100;
      const col = gold(1 - i / Math.max(1, rows.length - 1));
      return `<div class="cat-row">
        <div class="cat-head"><span class="cat-name">${c.name}</span><span class="cat-val">${money(c.value)}${unit} · ${c.share}%</span></div>
        <div class="cat-track"><div class="cat-bar" data-w="${pct.toFixed(1)}" style="width:0;background:${col}"></div></div>
      </div>`;
    }).join('');
    requestAnimationFrame(() => container.querySelectorAll('.cat-bar').forEach((b, i) => setTimeout(() => { b.style.width = b.dataset.w + '%'; }, reduce ? 0 : 80 * i)));
  }

  // -------- Meilleures ventes --------------------------------------
  function renderTop(list, products) {
    const max = Math.max.apply(null, products.map((p) => p.revenue));
    list.innerHTML = products.map((p) => `<li>
        <div class="t-main"><span class="t-name">${p.name}</span><span class="t-rev">${money(p.revenue)} MRU</span></div>
        <div class="t-track"><div class="t-bar" data-w="${((p.revenue / max) * 100).toFixed(1)}" style="width:0"></div></div>
        <div class="t-sales">${p.sales} ventes</div>
      </li>`).join('');
    requestAnimationFrame(() => list.querySelectorAll('.t-bar').forEach((b, i) => setTimeout(() => { b.style.width = b.dataset.w + '%'; }, reduce ? 0 : 90 * i)));
  }

  // -------- Tunnel de conversion -----------------------------------
  function renderFunnel(container, stages) {
    const top = stages[0].value || 1;
    container.innerHTML = stages.map((st, i) => {
      const pctOfTop = (st.value / top) * 100;
      const stepConv = i === 0 ? null : Math.round((st.value / (stages[i - 1].value || 1)) * 100);
      const col = gold(1 - i / Math.max(1, stages.length - 1));
      return `<div class="funnel-row">
        <div class="funnel-head">
          <span class="funnel-name">${st.stage}</span>
          <span class="funnel-val">${money(st.value)}${stepConv !== null ? ` <span class="funnel-step">${stepConv}%</span>` : ''}</span>
        </div>
        <div class="funnel-track"><div class="funnel-bar" data-w="${pctOfTop.toFixed(1)}" style="width:0;background:${col}"></div></div>
      </div>`;
    }).join('');
    requestAnimationFrame(() => container.querySelectorAll('.funnel-bar').forEach((b, i) => setTimeout(() => { b.style.width = b.dataset.w + '%'; }, reduce ? 0 : 110 * i)));
  }

  // -------- Donut « Sources de trafic » (rampe doree) --------------
  function renderDonut(container, legendEl, sources) {
    const total = sources.reduce((t, x) => t + x.value, 0) || 1;
    const R = 60, r = 40, C = 80, cir = 2 * Math.PI * R;
    const gapDeg = 3;
    let acc = -90; // depart en haut
    let segs = '';
    sources.forEach((sc, i) => {
      const frac = sc.value / total;
      const sweep = frac * 360 - gapDeg;
      const col = gold(1 - i / Math.max(1, sources.length - 1));
      const dash = (Math.max(0, sweep) / 360) * cir;
      const offset = (-(acc + 90) / 360) * cir;
      segs += `<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="${col}" stroke-width="${R - r}"
        stroke-dasharray="${dash.toFixed(2)} ${(cir - dash).toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}"
        transform="rotate(-90 ${C} ${C})" class="donut-seg" style="opacity:0"/>`;
      acc += frac * 360;
    });
    container.innerHTML = `<svg viewBox="0 0 160 160" class="donut" role="img" aria-label="Repartition des sources de trafic">
        ${segs}
        <text x="${C}" y="${C - 4}" class="donut-total" text-anchor="middle">${money(total)}</text>
        <text x="${C}" y="${C + 14}" class="donut-cap" text-anchor="middle">visiteurs</text>
      </svg>`;
    legendEl.innerHTML = sources.map((sc, i) => `<li>
        <span class="dot" style="background:${gold(1 - i / Math.max(1, sources.length - 1))}"></span>
        <span class="lg-name">${sc.name}</span><span class="lg-val">${sc.share}%</span>
      </li>`).join('');
    requestAnimationFrame(() => container.querySelectorAll('.donut-seg').forEach((s, i) => setTimeout(() => { s.style.opacity = 1; }, reduce ? 0 : 90 * i)));
  }

  // -------- Commandes recentes -------------------------------------
  function renderOrders(tbody, orders) {
    tbody.innerHTML = orders.map((o) => `<tr>
      <td class="mono">${o.ref}</td><td>${o.client}</td><td class="cell-prod">${o.product}</td>
      <td class="mono num">${money(o.amount)} MRU</td><td><span class="pill ${o.tone}">${o.status}</span></td><td class="muted">${o.date}</td>
    </tr>`).join('');
  }

  // ==================================================================
  // Initialisation
  // ==================================================================
  async function init() {
    let data;
    if (window.__KARAT_DEMO__) {
      data = window.__KARAT_DEMO__;
    } else {
      const r = await Karat.api('/api/dashboard');
      if (!r.ok) { if (r.status === 401) window.location.href = '/connexion?suite=/tableau-de-bord'; return; }
      data = r.data;
    }
    const u = data.user, st = data.stats;

    // Identite
    const initials = (u.name || 'K').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    $('#avatar').textContent = initials;
    $('#user-name').textContent = u.name;
    $('#shop-name').textContent = u.shopName;
    $('#hello-name').textContent = (u.name || '').split(' ')[0];

    // Bandeau statut
    const bar = $('#trial-bar'), txt = $('#trial-text');
    if (u.status === 'trial') {
      const end = u.trialEndsAt ? new Date(u.trialEndsAt) : null;
      const days = end ? Math.max(0, Math.ceil((end - Date.now()) / 86400000)) : 0;
      txt.textContent = '✦ Essai gratuit : ' + days + ' jour' + (days > 1 ? 's' : '') + ' restant' + (days > 1 ? 's' : '') + '. Activez votre abonnement pour continuer sans interruption.';
      bar.style.display = 'block';
    } else if (u.status === 'active') {
      const end = u.subscriptionEndsAt ? new Date(u.subscriptionEndsAt).toLocaleDateString('fr-FR') : '';
      txt.textContent = '✓ Abonnement ' + (u.planName || '') + ' actif' + (end ? ' jusqu\'au ' + end : '') + '.';
      const cta = bar.querySelector('.btn'); if (cta) cta.style.display = 'none';
      bar.style.display = 'block';
    }

    // ---- KPIs + courbe pilotes par la periode ----
    function applyPeriod(key) {
      const P = st.periods[key], k = P.kpis;
      $('#dash-sub').textContent = 'Voici les performances de votre boutique sur les ' + P.rangeLabel + '.';
      document.querySelectorAll('.k-period').forEach((e) => (e.textContent = P.subLabel));

      countTo($('#kpi-rev'), k.revenue.value);
      $('#kpi-rev-fcfa').textContent = '≈ ' + money(k.revenue.fcfa) + ' FCFA';
      $('#kpi-rev-delta').innerHTML = deltaChip(k.revenue.delta);
      $('#kpi-rev-spark').innerHTML = sparkline(k.revenue.spark);

      countTo($('#kpi-orders'), k.orders.value);
      $('#kpi-orders-delta').innerHTML = deltaChip(k.orders.delta);
      $('#kpi-orders-spark').innerHTML = sparkline(k.orders.spark);

      countTo($('#kpi-visitors'), k.visitors.value);
      $('#kpi-visitors-delta').innerHTML = deltaChip(k.visitors.delta);
      $('#kpi-visitors-spark').innerHTML = sparkline(k.visitors.spark);

      countTo($('#kpi-conv'), k.conversion.value, { fmt: (v) => v.toFixed(1) });
      $('#kpi-conv-delta').innerHTML = deltaChip(k.conversion.delta);

      countTo($('#kpi-basket'), k.basket.value);
      $('#kpi-basket-fcfa').textContent = '≈ ' + money(k.basket.fcfa) + ' FCFA';
      $('#kpi-basket-delta').innerHTML = deltaChip(k.basket.delta);

      renderArea($('#revenue-chart'), P.series);
    }
    applyPeriod(st.defaultPeriod || '30j');
    document.querySelectorAll('.period-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        applyPeriod(btn.dataset.period);
      });
    });

    // ---- Sections fixes ----
    renderBars($('#cat-list'), st.categories, ' MRU');
    renderTop($('#top-list'), st.topProducts);
    renderFunnel($('#funnel'), st.funnel);
    renderDonut($('#donut'), $('#donut-legend'), st.sources);
    renderOrders($('#orders-body'), st.recentOrders);
  }

  document.addEventListener('DOMContentLoaded', () => {
    init();
    const lo = $('#logout');
    lo && lo.addEventListener('click', async () => { await Karat.api('/api/auth/logout', {}); window.location.href = '/'; });
  });
})();
