/* Espace partenaire (e-commerçant). */
(async function () {
  'use strict';
  const { api, esc, money, badge, date, toast, modal, closeModal } = LV;
  const SECTIONS = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'chart' },
    { id: 'nouvelle', label: 'Nouvelle commande', icon: 'plus' },
    { id: 'commandes', label: 'Mes commandes', icon: 'list' },
    { id: 'stock', label: 'Mon stock', icon: 'warehouse' },
    { id: 'reversements', label: 'Reversements', icon: 'cash' },
    { id: 'profil', label: 'Mon profil', icon: 'user' },
  ];
  let info = { zones: [], fee_per_item: 0, statuses: {} };
  let statusFilter = '';

  const shell = await LV.appShell('partenaire', 'Espace partenaire', SECTIONS, (id) => VIEWS[id] && VIEWS[id]());
  if (!shell) return;
  let me = shell.user;

  info = await LV.info();
  setupNewForm();
  setupProfile();

  function ordersTable(rows) {
    if (!rows.length) return '<div class="empty">Aucune commande pour le moment.</div>';
    return '<table><thead><tr><th>Code</th><th>Client</th><th>Zone</th><th>Statut</th><th class="num">À encaisser</th><th>Date</th></tr></thead><tbody>' +
      rows.map((o) => '<tr class="clickable" data-id="' + o.id + '"><td class="code">' + esc(o.code) + '</td><td>' + esc(o.recipient_name) +
        '<span class="cell-sub">' + esc(LV.phoneFmt(o.recipient_phone)) + '</span></td><td>' + esc(o.zone_name) + '</td><td>' + badge(o.status, o.status_label) +
        '</td><td class="num">' + money(o.collected) + '</td><td class="muted">' + date(o.created_at, true) + '</td></tr>').join('') + '</tbody></table>';
  }
  function bindRows(el) {
    el.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => openOrder(tr.dataset.id)));
  }

  async function openOrder(id) {
    const r = await api('/partner/orders/' + id);
    if (!r.ok) return toast(r.data.error, true);
    const o = r.data.order;
    const canCancel = ['nouvelle', 'confirmee', 'reportee'].includes(o.status);
    const body = modal('Commande ' + o.code,
      '<p style="margin-bottom:16px">' + badge(o.status, o.status_label) + '</p><dl class="kv">' +
      '<dt>Client</dt><dd>' + esc(o.recipient_name) + ' · ' + esc(LV.phoneFmt(o.recipient_phone)) + '</dd>' +
      '<dt>Adresse</dt><dd>' + esc(o.zone_name) + ' — ' + esc(o.address) + '</dd>' +
      '<dt>Colis</dt><dd>' + esc(o.description || '—') + ' · ' + o.items_count + ' produit(s)</dd>' +
      '<dt>Prix articles</dt><dd>' + money(o.cod_amount) + '</dd>' +
      '<dt>Frais livraison</dt><dd>' + money(o.fee) + ' (payés par ' + (o.fee_payer === 'partenaire' ? 'vous' : 'le client') + ')</dd>' +
      '<dt>Encaissé</dt><dd>' + money(o.collected) + '</dd>' +
      '<dt>Net pour vous</dt><dd><b>' + money(o.net) + '</b></dd>' +
      (o.courier_name ? '<dt>Livreur</dt><dd>' + esc(o.courier_name) + '</dd>' : '') +
      (o.received_by ? '<dt>Reçu par</dt><dd>' + esc(o.received_by) + '</dd>' : '') +
      '</dl><h3 style="margin:22px 0 4px;font-size:16px">Suivi</h3><ul class="timeline">' +
      r.data.events.slice().reverse().map((e, i) => '<li class="' + (i ? '' : 'last') + '"><strong>' + esc(e.label) + '</strong><span>' + date(e.created_at, true) + (e.note ? ' — ' + esc(e.note) : '') + '</span></li>').join('') +
      '</ul><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px"><a class="btn btn-ghost btn-sm" target="_blank" href="/livreur/suivi?code=' + encodeURIComponent(o.code) + '">Lien de suivi client</a>' +
      (canCancel ? '<button class="btn btn-danger btn-sm" data-cancel>Annuler la commande</button>' : '') + '</div>');
    const c = body.querySelector('[data-cancel]');
    if (c) c.addEventListener('click', async () => {
      if (!confirm('Annuler cette commande ?')) return;
      const x = await api('/partner/orders/' + o.id + '/cancel', {});
      if (!x.ok) return toast(x.data.error, true);
      closeModal(); toast('Commande annulée'); VIEWS.commandes();
    });
  }

  const VIEWS = {
    async dashboard() {
      const [s, o] = await Promise.all([api('/partner/summary'), api('/partner/orders')]);
      const d = s.data;
      document.getElementById('p-kpis').innerHTML =
        kpi('Commandes', d.total, d.today + ' aujourd\'hui') +
        kpi('En cours', d.in_progress, (d.by.livree || 0) + ' livrées') +
        kpi('Taux de livraison', d.rate == null ? '—' : d.rate + ' %', 'Sur les commandes clôturées') +
        kpi('Solde à reverser', money(d.pending_payout), money(d.paid) + ' déjà reversés', true);
      const el = document.getElementById('p-recent');
      el.innerHTML = ordersTable((o.data.orders || []).slice(0, 8));
      bindRows(el);
    },
    nouvelle() {},
    async commandes() {
      const tabs = document.getElementById('p-tabs');
      const list = [['', 'Toutes']].concat(Object.entries(info.statuses));
      tabs.innerHTML = list.map(([k, l]) => '<button class="tab' + (k === statusFilter ? ' active' : '') + '" data-st="' + k + '">' + esc(l) + '</button>').join('');
      tabs.onclick = (e) => { const b = e.target.closest('[data-st]'); if (b) { statusFilter = b.dataset.st; VIEWS.commandes(); } };
      const q = document.getElementById('p-q').value.trim();
      const r = await api('/partner/orders?status=' + statusFilter + '&q=' + encodeURIComponent(q));
      const el = document.getElementById('p-orders');
      el.innerHTML = ordersTable(r.data.orders || []);
      bindRows(el);
    },
    async stock() {
      const r = await api('/partner/stock');
      const rows = r.data.stock || [];
      document.getElementById('p-stock').innerHTML = rows.length
        ? '<table><thead><tr><th>Article</th><th>Référence</th><th>Emplacement</th><th class="num">Quantité</th><th>Mis à jour</th></tr></thead><tbody>' +
          rows.map((s) => '<tr><td>' + esc(s.name) + '</td><td class="muted">' + esc(s.sku || '—') + '</td><td class="muted">' + esc(s.location || '—') + '</td><td class="num"><b style="color:' + (s.qty <= 2 ? 'var(--danger)' : 'inherit') + '">' + s.qty + '</b></td><td class="muted">' + date(s.updated_at, true) + '</td></tr>').join('') + '</tbody></table>'
        : '<div class="empty">Aucun stock déposé. Contactez l\'agence pour déposer vos produits.</div>';
    },
    async reversements() {
      const [s, p] = await Promise.all([api('/partner/summary'), api('/partner/payouts')]);
      document.getElementById('p-pay-kpis').innerHTML =
        kpi('Solde en attente', money(s.data.pending_payout), 'Livré, en cours de reversement', true) +
        kpi('Total reversé', money(s.data.paid), (p.data.payouts || []).length + ' reversements') +
        kpi('Ventes livrées', money(s.data.sales), 'Prix articles encaissés') +
        kpi('Moyen de paiement', esc(me.payout_method || '—'), esc(me.payout_number || 'À renseigner dans le profil'));
      const rows = p.data.payouts || [];
      document.getElementById('p-payouts').innerHTML = rows.length
        ? '<table><thead><tr><th>Date</th><th class="num">Commandes</th><th class="num">Encaissé</th><th class="num">Frais déduits</th><th class="num">Reversé</th><th>Moyen</th><th>Référence</th></tr></thead><tbody>' +
          rows.map((x) => '<tr><td>' + date(x.created_at, true) + '</td><td class="num">' + x.orders_count + '</td><td class="num">' + money(x.collected) + '</td><td class="num">' + money(x.fees) + '</td><td class="num"><b>' + money(x.amount) + '</b></td><td>' + esc(x.method || '—') + '</td><td class="muted">' + esc(x.reference || '') + '</td></tr>').join('') + '</tbody></table>'
        : '<div class="empty">Aucun reversement pour le moment.</div>';
    },
    profil() {
      const f = document.getElementById('p-profile');
      ['business_name', 'name', 'email', 'city', 'address', 'payout_method', 'payout_number'].forEach((k) => { if (f[k]) f[k].value = me[k] || ''; });
    },
  };

  function kpi(label, value, sub, accent) {
    return '<div class="kpi' + (accent ? ' accent' : '') + '"><span>' + label + '</span><strong>' + value + '</strong><small>' + (sub || '') + '</small></div>';
  }

  let qTimer;
  document.getElementById('p-q').addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(VIEWS.commandes, 300); });

  async function setupNewForm() {
    const f = document.getElementById('p-new');
    f.zone_id.innerHTML = LV.zoneOptions(info.zones);
    const perItem = Number(info.fee_per_item) || 0;
    document.getElementById('p-fee-rule').textContent = money(perItem) + ' de livraison par produit.';
    const st = await api('/partner/stock');
    (st.data.stock || []).forEach((s) => { f.stock_id.insertAdjacentHTML('beforeend', '<option value="' + s.id + '">' + esc(s.name) + ' (' + s.qty + ' en stock)</option>'); });
    // Frais = tarif unique × nombre de produits.
    function calc() {
      const fee = perItem * Math.max(1, Math.round(Number(f.items_count.value) || 1));
      const cod = Math.max(0, Number(f.cod_amount.value) || 0);
      document.getElementById('p-fee').textContent = money(fee);
      document.getElementById('p-total').textContent = money(cod + (f.fee_payer.value === 'destinataire' ? fee : 0));
    }
    // Article du stock : le nombre de produits suit la quantité prélevée.
    f.stock_qty.addEventListener('input', () => { if (f.stock_id.value) f.items_count.value = f.stock_qty.value; });
    ['items_count', 'stock_qty', 'cod_amount', 'fee_payer'].forEach((k) => { f[k].addEventListener('input', calc); f[k].addEventListener('change', calc); });
    calc();
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const r = await LV.submit(f, '/partner/orders');
      if (!r.ok) return window.scrollTo({ top: 0, behavior: 'smooth' });
      f.reset(); calc();
      toast('Commande ' + r.data.order.code + ' enregistrée');
      shell.show('commandes');
    });
  }

  function setupProfile() {
    const f = document.getElementById('p-profile');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const r = await LV.submit(f, '/partner/profile', null, 'PUT');
      if (!r.ok) return;
      const m = await api('/me');
      if (m.ok) me = m.data.user;
      LV.msg(f.querySelector('.form-msg'), 'success', 'Profil enregistré.');
    });
  }
  shell.start();
})();
