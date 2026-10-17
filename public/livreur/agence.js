/* Espace agence : centre d'appel, dispatch, commandes, comptes, stock, caisse, reversements, tarifs. */
(async function () {
  'use strict';
  const { api, esc, money, badge, date, toast, modal, closeModal, phoneFmt } = LV;
  const SECTIONS = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'chart' },
    { id: 'appel', label: 'Centre d\'appel', icon: 'headset' },
    { id: 'dispatch', label: 'Dispatch', icon: 'route' },
    { id: 'commandes', label: 'Commandes', icon: 'list' },
    { id: 'livreurs', label: 'Livreurs', icon: 'bike' },
    { id: 'partenaires', label: 'Partenaires', icon: 'store' },
    { id: 'stock', label: 'Stock', icon: 'warehouse' },
    { id: 'caisse', label: 'Caisse', icon: 'cash' },
    { id: 'reversements', label: 'Reversements', icon: 'shield' },
    { id: 'tarifs', label: 'Zones & délais', icon: 'tag' },
    { id: 'messages', label: 'Messages', icon: 'chat' },
    { id: 'equipe', label: 'Équipe', icon: 'users' },
  ];
  const shell = await LV.appShell('agence', 'Espace agence', SECTIONS, (id) => VIEWS[id]());
  if (!shell) return;
  const info = await LV.info();
  const perItem = Number(info.fee_per_item) || 0;
  let couriers = [];
  let partners = [];
  let callTab = 'nouvelle';

  async function loadPeople() {
    const [c, p] = await Promise.all([api('/agency/users?role=coursier'), api('/agency/users?role=partenaire')]);
    couriers = c.data.users || [];
    partners = p.data.users || [];
  }
  await loadPeople();

  const kpi = (label, value, sub, accent, go) =>
    '<div class="kpi' + (accent ? ' accent' : '') + '"' + (go ? ' data-goto="' + go + '" style="cursor:pointer"' : '') + '><span>' + label + '</span><strong>' + value + '</strong><small>' + (sub || '') + '</small></div>';
  const courierOptions = (sel) => '<option value="">— Choisir un livreur —</option>' +
    couriers.filter((c) => c.status === 'active').map((c) => '<option value="' + c.id + '"' + (String(sel) === String(c.id) ? ' selected' : '') + '>' + esc(c.name) + (c.vehicle ? ' (' + esc(c.vehicle) + ')' : '') + '</option>').join('');
  const partnerOptions = (sel, empty) => '<option value="">' + (empty || '— Client direct (sans partenaire) —') + '</option>' +
    partners.filter((p) => p.status === 'active').map((p) => '<option value="' + p.id + '"' + (String(sel) === String(p.id) ? ' selected' : '') + '>' + esc(p.business_name || p.name) + '</option>').join('');
  const statusOptions = (sel) => Object.entries(info.statuses).map(([k, l]) => '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + esc(l) + '</option>').join('');

  function miniOrders(rows) {
    if (!rows.length) return '<div class="empty">Rien en attente 👍</div>';
    return '<table><tbody>' + rows.slice(0, 8).map((o) => '<tr class="clickable" data-order="' + o.id + '"><td class="code">' + esc(o.code) + '</td><td>' + esc(o.recipient_name) +
      '<span class="cell-sub">' + esc(o.zone_name) + '</span></td><td class="num">' + money(o.collected) + '</td></tr>').join('') + '</tbody></table>';
  }

  function ordersTable(rows) {
    if (!rows.length) return '<div class="empty">Aucune commande.</div>';
    return '<table><thead><tr><th>Code</th><th>Expéditeur</th><th>Destinataire</th><th>Zone</th><th>Livreur</th><th>Statut</th><th class="num">Encaisser</th><th class="num">Frais</th><th>Date</th></tr></thead><tbody>' +
      rows.map((o) => '<tr class="clickable" data-order="' + o.id + '"><td class="code">' + esc(o.code) + '</td><td>' + esc(o.partner_name || o.sender_name || '—') +
        '<span class="cell-sub">' + (o.source === 'public' ? 'Client web' : o.source === 'agence' ? 'Saisie agence' : 'Partenaire') + '</span></td><td>' + esc(o.recipient_name) +
        '<span class="cell-sub">' + esc(phoneFmt(o.recipient_phone)) + '</span></td><td>' + esc(o.zone_name) + '</td><td>' + esc(o.courier_name || '—') + '</td><td>' + badge(o.status, o.status_label) +
        '</td><td class="num">' + money(o.collected) + '</td><td class="num">' + money(o.fee) + '</td><td class="muted">' + date(o.created_at, true) + '</td></tr>').join('') + '</tbody></table>';
  }

  // --------- Fiche commande (détail + édition) ---------
  async function openOrder(id) {
    const r = await api('/agency/orders/' + id);
    if (!r.ok) return toast(r.data.error, true);
    const o = r.data.order;
    const body = modal('Commande ' + o.code,
      '<p style="margin-bottom:14px">' + badge(o.status, o.status_label) + ' <span class="muted" style="margin-left:8px">' + date(o.created_at, true) + '</span></p>' +
      '<form id="a-edit"><div class="form-msg"></div>' +
      '<div class="row"><div class="field"><label>Livreur</label><select name="courier_id">' + courierOptions(o.courier_id) + '</select></div>' +
      '<div class="field"><label>Statut</label><select name="status">' + statusOptions(o.status) + '</select></div></div>' +
      '<div class="field"><label>Commentaire (ajouté à l\'historique)</label><input name="status_note" placeholder="Ex. client confirmé pour 15 h" /></div>' +
      '<div class="fieldset-title">Destinataire</div>' +
      '<div class="row"><div class="field"><label>Nom</label><input name="recipient_name" value="' + esc(o.recipient_name) + '" /></div>' +
      '<div class="field"><label>Téléphone</label><input name="recipient_phone" value="' + esc(o.recipient_phone) + '" /></div></div>' +
      '<div class="row"><div class="field"><label>Zone</label><select name="zone_id">' + LV.zoneOptions(info.zones, o.zone_id) + '</select></div>' +
      '<div class="field"><label>Date prévue</label><input type="date" name="scheduled_for" value="' + esc(o.scheduled_for) + '" /></div></div>' +
      '<div class="field"><label>Adresse</label><input name="address" value="' + esc(o.address) + '" /></div>' +
      '<div class="fieldset-title">Montants</div>' +
      '<div class="row"><div class="field"><label>Nombre de produits</label><input type="number" min="1" name="items_count" value="' + o.items_count + '" /><small>' + money(perItem) + ' par produit</small></div>' +
      '<div class="field"><label>Prix articles</label><input type="number" min="0" name="cod_amount" value="' + o.cod_amount + '" /></div></div>' +
      '<div class="row"><div class="field"><label>Frais livraison</label><input type="number" min="0" name="fee" value="' + o.fee + '" /></div>' +
      '<div class="field"><label>Frais payés par</label><select name="fee_payer"><option value="destinataire"' + (o.fee_payer === 'destinataire' ? ' selected' : '') + '>Destinataire</option><option value="partenaire"' + (o.fee_payer === 'partenaire' ? ' selected' : '') + '>Expéditeur</option></select></div></div>' +
      '<div class="field"><label>Note interne</label><input name="note" value="' + esc(o.note) + '" /></div>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" type="submit">Enregistrer</button>' +
      '<a class="btn btn-ghost" href="tel:+' + esc(o.recipient_phone) + '">Appeler</a><a class="btn btn-ghost" target="_blank" rel="noopener" href="https://wa.me/' + esc(o.recipient_phone) + '">WhatsApp</a>' +
      '<a class="btn btn-ghost" target="_blank" href="/livreur/suivi?code=' + encodeURIComponent(o.code) + '">Page de suivi</a></div></form>' +
      '<dl class="kv" style="margin-top:22px"><dt>Expéditeur</dt><dd>' + esc(o.partner_name || o.sender_name || '—') + (o.sender_phone ? ' · ' + esc(phoneFmt(o.sender_phone)) : '') + '</dd>' +
      '<dt>Enlèvement</dt><dd>' + esc(o.pickup_address || '—') + '</dd><dt>Colis</dt><dd>' + esc(o.description || '—') + (o.stock_id ? ' (stock × ' + o.stock_qty + ')' : '') + '</dd>' +
      '<dt>Le livreur encaisse</dt><dd><b>' + money(o.collected) + '</b></dd><dt>Net partenaire</dt><dd>' + money(o.net) + '</dd>' +
      (o.received_by ? '<dt>Reçu par</dt><dd>' + esc(o.received_by) + '</dd>' : '') +
      '<dt>Caisse</dt><dd>' + (o.cash_remit_id ? 'Remise à l\'agence ✓' : (o.status === 'livree' ? 'Chez le livreur' : '—')) + '</dd>' +
      '<dt>Reversement</dt><dd>' + (o.payout_id ? 'Reversé ✓' : '—') + '</dd></dl>' +
      '<h3 style="margin:22px 0 4px;font-size:16px">Historique</h3><ul class="timeline">' +
      r.data.events.slice().reverse().map((e, i) => '<li class="' + (i ? '' : 'last') + '"><strong>' + esc(e.label) + '</strong><span>' + date(e.created_at, true) + ' · ' + esc(e.actor) + (e.note ? ' — ' + esc(e.note) : '') + '</span></li>').join('') + '</ul>',
      { wide: true });
    const f = body.querySelector('form');
    f.items_count.addEventListener('input', () => { f.fee.value = perItem * Math.max(1, Math.round(Number(f.items_count.value) || 1)); });
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = LV.formData(f);
      if (d.status === o.status) delete d.status;
      if (d.status === 'livree' && !o.received_by) d.received_by = prompt('Nom de la personne qui a reçu le colis :') || '';
      const x = await api('/agency/orders/' + o.id, d, 'PUT');
      if (!x.ok) return LV.msg(f.querySelector('.form-msg'), 'error', x.data.error);
      closeModal(); toast('Commande mise à jour'); refresh();
    });
  }

  // --------- Nouvelle commande (saisie agence) ---------
  function newOrder() {
    const body = modal('Nouvelle commande',
      '<form><div class="form-msg"></div>' +
      '<div class="field"><label>Partenaire</label><select name="partner_id">' + partnerOptions() + '</select></div>' +
      '<div class="row" data-direct><div class="field"><label>Nom expéditeur</label><input name="sender_name" /></div><div class="field"><label>Téléphone expéditeur</label><input name="sender_phone" /></div></div>' +
      '<div class="field"><label>Adresse d\'enlèvement</label><input name="pickup_address" /></div>' +
      '<div class="row"><div class="field"><label>Destinataire</label><input name="recipient_name" required /></div><div class="field"><label>Téléphone</label><input name="recipient_phone" required /></div></div>' +
      '<div class="row"><div class="field"><label>Zone</label><select name="zone_id" required>' + LV.zoneOptions(info.zones) + '</select></div>' +
      '<div class="field"><label>Nombre de produits</label><input type="number" min="1" name="items_count" value="1" required /></div></div>' +
      '<div class="field"><label>Adresse de livraison</label><input name="address" required /></div>' +
      '<div class="field"><label>Description du colis</label><input name="description" /></div>' +
      '<div class="row-3"><div class="field"><label>Prix articles</label><input type="number" min="0" name="cod_amount" value="0" /></div>' +
      '<div class="field"><label>Frais (vide = ' + money(perItem) + ' × produits)</label><input type="number" min="0" name="fee" /></div>' +
      '<div class="field"><label>Frais payés par</label><select name="fee_payer"><option value="destinataire">Destinataire</option><option value="partenaire">Expéditeur</option></select></div></div>' +
      '<div class="field"><label>Note</label><input name="note" /></div>' +
      '<button class="btn btn-primary btn-block" type="submit">Créer la commande</button></form>', { wide: true });
    const f = body.querySelector('form');
    f.partner_id.addEventListener('change', () => body.querySelector('[data-direct]').classList.toggle('hidden', !!f.partner_id.value));
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const r = await LV.submit(f, '/agency/orders');
      if (!r.ok) return;
      closeModal(); toast('Commande ' + r.data.order.code + ' créée'); refresh();
    });
  }

  // --------- Comptes ---------
  function usersTable(rows, role) {
    if (!rows.length) return '<div class="empty">Aucun compte.</div>';
    const extra = role === 'coursier' ? '<th>Véhicule</th><th>Quartier</th>' : role === 'partenaire' ? '<th>Activité</th><th>Reversement</th>' : '';
    return '<table><thead><tr><th>Nom</th><th>Téléphone</th>' + extra + '<th>Statut</th><th>Inscrit le</th><th></th></tr></thead><tbody>' +
      rows.map((u) => '<tr><td>' + esc(role === 'partenaire' ? (u.business_name || u.name) : u.name) + (role === 'partenaire' ? '<span class="cell-sub">' + esc(u.name) + '</span>' : '') + '</td>' +
        '<td><a href="tel:+' + esc(u.phone) + '">' + esc(phoneFmt(u.phone)) + '</a></td>' +
        (role === 'coursier' ? '<td>' + esc(u.vehicle || '—') + '</td><td class="muted">' + esc(u.address || '—') + '</td>' : '') +
        (role === 'partenaire' ? '<td class="muted">' + esc(u.activity || '—') + '</td><td class="muted">' + esc((u.payout_method || '—') + ' ' + (u.payout_number || '')) + '</td>' : '') +
        '<td>' + badge(u.status, LV.USER_STATUS[u.status]) + '</td><td class="muted">' + date(u.created_at) + '</td><td class="num">' +
        (u.status !== 'active' ? '<button class="btn btn-success btn-sm" data-user="' + u.id + '" data-set="active">' + (u.status === 'pending' ? 'Valider' : 'Réactiver') + '</button> ' : '<button class="btn btn-ghost btn-sm" data-user="' + u.id + '" data-set="suspended">Suspendre</button> ') +
        '<button class="btn btn-ghost btn-sm" data-user="' + u.id + '" data-pw>Mot de passe</button>' +
        (role === 'partenaire' ? ' <button class="btn btn-ghost btn-sm" data-orders-of="' + u.id + '">Commandes</button>' : '') +
        '</td></tr>').join('') + '</tbody></table>';
  }

  function newUser(role) {
    const titles = { coursier: 'Ajouter un livreur', partenaire: 'Ajouter un partenaire', agence: 'Ajouter un agent' };
    const body = modal(titles[role],
      '<form><div class="form-msg"></div>' +
      (role === 'partenaire' ? '<div class="field"><label>Nom de l\'activité</label><input name="business_name" required /></div>' : '') +
      '<div class="row"><div class="field"><label>Nom complet</label><input name="name" required /></div><div class="field"><label>Téléphone (identifiant)</label><input name="phone" required /></div></div>' +
      (role === 'coursier' ? '<div class="row"><div class="field"><label>Véhicule</label><select name="vehicle"><option>Moto</option><option>Voiture</option><option>Tricycle</option><option>Camionnette</option></select></div><div class="field"><label>Quartier</label><input name="address" /></div></div>' : '') +
      (role === 'partenaire' ? '<div class="field"><label>Adresse d\'enlèvement</label><input name="address" /></div>' : '') +
      '<div class="field"><label>Mot de passe provisoire</label><input name="password" minlength="6" required /><small>À communiquer à la personne.</small></div>' +
      '<button class="btn btn-primary btn-block" type="submit">Créer le compte</button></form>');
    const f = body.querySelector('form');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const r = await LV.submit(f, '/agency/users', { role });
      if (!r.ok) return;
      closeModal(); toast('Compte créé'); await loadPeople(); refresh();
    });
  }

  // --------- Stock ---------
  function newStock() {
    const body = modal('Enregistrer un dépôt de stock',
      '<form><div class="form-msg"></div><div class="field"><label>Partenaire</label><select name="partner_id" required>' + partnerOptions('', '— Choisir —') + '</select></div>' +
      '<div class="row"><div class="field"><label>Article</label><input name="name" required /></div><div class="field"><label>Référence</label><input name="sku" /></div></div>' +
      '<div class="row"><div class="field"><label>Quantité déposée</label><input type="number" name="qty" value="1" required /></div><div class="field"><label>Emplacement</label><input name="location" placeholder="Ex. Étagère A3" /></div></div>' +
      '<button class="btn btn-primary btn-block" type="submit">Enregistrer</button></form>');
    const f = body.querySelector('form');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const r = await LV.submit(f, '/agency/stock');
      if (!r.ok) return;
      closeModal(); toast('Stock enregistré'); VIEWS.stock();
    });
  }

  // --------- Vues ---------
  const VIEWS = {
    async dashboard() {
      const [s, n, c] = await Promise.all([api('/agency/summary'), api('/agency/orders?status=nouvelle'), api('/agency/orders?status=confirmee')]);
      const d = s.data;
      const inProgress = (d.by.assignee || 0) + (d.by.recuperee || 0) + (d.by.en_cours || 0);
      const pend = (d.pending_users.partenaire || 0) + (d.pending_users.coursier || 0);
      document.getElementById('a-kpis').innerHTML =
        kpi('À confirmer', d.to_confirm, 'Centre d\'appel', d.to_confirm > 0, 'appel') +
        kpi('À assigner', d.unassigned, 'Commandes confirmées', d.unassigned > 0, 'dispatch') +
        kpi('En livraison', inProgress, (d.by.reportee || 0) + ' reportée(s)', false, 'commandes') +
        kpi('Livrées aujourd\'hui', d.today_delivered, d.today_new + ' nouvelles aujourd\'hui') +
        kpi('Caisse chez les livreurs', money(d.cash_out), 'À récupérer', d.cash_out > 0, 'caisse') +
        kpi('À reverser', money(d.payout_due), 'Aux partenaires', false, 'reversements') +
        kpi('Frais de livraison (mois)', money(d.fees_month), 'Chiffre d\'affaires agence', true) +
        kpi('Inscriptions à valider', pend, d.couriers + ' livreurs · ' + d.partners + ' partenaires', pend > 0, (d.pending_users.coursier ? 'livreurs' : 'partenaires'));
      document.getElementById('a-dash-confirm').innerHTML = miniOrders(n.data.orders || []);
      document.getElementById('a-dash-dispatch').innerHTML = miniOrders((c.data.orders || []).filter((o) => !o.courier_id));
      LV.setCount('appel', d.to_confirm);
      LV.setCount('dispatch', d.unassigned);
      LV.setCount('messages', d.messages);
      LV.setCount('livreurs', d.pending_users.coursier || 0);
      LV.setCount('partenaires', d.pending_users.partenaire || 0);
    },

    async appel() {
      const tabs = [['nouvelle', 'À confirmer'], ['reportee', 'Reportées'], ['echec', 'Échecs']];
      document.getElementById('a-call-tabs').innerHTML = tabs.map(([k, l]) => '<button class="tab' + (k === callTab ? ' active' : '') + '" data-calltab="' + k + '">' + l + '</button>').join('');
      const r = await api('/agency/orders?status=' + callTab);
      const rows = r.data.orders || [];
      if (callTab === 'nouvelle') LV.setCount('appel', rows.length);
      document.getElementById('a-call').innerHTML = rows.length ? rows.map((o) =>
        '<div class="order-card"><div class="top"><span class="code">' + esc(o.code) + '</span>' + badge(o.status, o.status_label) + '</div>' +
        '<div class="meta"><span><b>' + esc(o.recipient_name) + '</b> · <a href="tel:+' + esc(o.recipient_phone) + '" class="gold">' + esc(phoneFmt(o.recipient_phone)) + '</a></span>' +
        '<span>' + esc(o.zone_name) + ' — ' + esc(o.address) + '</span><span class="muted">De : ' + esc(o.partner_name || o.sender_name || '—') + (o.description ? ' · ' + esc(o.description) : '') + '</span>' +
        (o.scheduled_for ? '<span class="muted">Souhaitée le ' + esc(o.scheduled_for) + '</span>' : '') + (o.attempts ? '<span class="muted">' + o.attempts + ' tentative(s)</span>' : '') + '</div>' +
        '<div class="amount">À encaisser : <span class="gold">' + money(o.collected) + '</span></div>' +
        '<div class="btns"><a class="btn btn-dark btn-sm" href="tel:+' + esc(o.recipient_phone) + '">Appeler</a><a class="btn btn-dark btn-sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(o.recipient_phone) + '">WhatsApp</a><button class="btn btn-dark btn-sm" data-order="' + o.id + '">Détails</button></div>' +
        '<div class="btns"><button class="btn btn-success btn-sm" data-call="confirmee" data-id="' + o.id + '">Confirmée</button>' +
        '<button class="btn btn-ghost btn-sm" data-call="reportee" data-id="' + o.id + '">Reporter</button>' +
        (o.status === 'echec' ? '<button class="btn btn-ghost btn-sm" data-call="retournee" data-id="' + o.id + '">Retour expéditeur</button>' : '') +
        '<button class="btn btn-danger btn-sm" data-call="annulee" data-id="' + o.id + '">Annuler</button></div></div>').join('')
        : '<div class="empty">Aucune commande dans cette liste.</div>';
    },

    async dispatch() {
      const r = await api('/agency/orders?status=confirmee');
      const rows = (r.data.orders || []).filter((o) => !o.courier_id);
      LV.setCount('dispatch', rows.length);
      const groups = {};
      rows.forEach((o) => { (groups[o.zone_name] = groups[o.zone_name] || []).push(o); });
      const el = document.getElementById('a-dispatch');
      el.innerHTML = rows.length ? Object.keys(groups).sort().map((z) =>
        '<div class="panel flush"><div class="panel-head"><h2>' + esc(z) + ' <span class="muted" style="font-size:14px">(' + groups[z].length + ')</span></h2>' +
        '<div class="actions"><select data-bulk-sel style="width:auto;padding:7px 34px 7px 12px;font-size:13.5px">' + courierOptions() + '</select><button class="btn btn-primary btn-sm" data-bulk="' + esc(z) + '">Tout assigner</button></div></div>' +
        '<div class="table-wrap"><table><tbody>' + groups[z].map((o) =>
          '<tr><td class="code clickable" data-order="' + o.id + '">' + esc(o.code) + '</td><td>' + esc(o.recipient_name) + '<span class="cell-sub">' + esc(o.address) + '</span></td><td class="muted">' + esc(o.partner_name || o.sender_name || '') + '</td>' +
          '<td class="num">' + money(o.collected) + '</td><td class="num" style="min-width:250px"><select data-assign-sel="' + o.id + '" style="width:auto;display:inline-block;padding:7px 34px 7px 12px;font-size:13.5px">' + courierOptions() + '</select> <button class="btn btn-ghost btn-sm" data-assign="' + o.id + '">OK</button></td></tr>').join('') +
        '</tbody></table></div></div>').join('') : '<div class="empty">Toutes les commandes confirmées ont un livreur. 👍</div>';
      el.dataset.groups = JSON.stringify(Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.map((o) => o.id)])));
    },

    async commandes() {
      const st = document.getElementById('a-f-status');
      if (!st.options.length) {
        st.innerHTML = '<option value="actives">Commandes actives</option><option value="">Tous les statuts</option>' + statusOptions('');
        st.value = 'actives';
      }
      const fp = document.getElementById('a-f-partner');
      const pv = fp.value;
      fp.innerHTML = partnerOptions(pv, 'Tous les partenaires');
      const fc = document.getElementById('a-f-courier');
      const cv = fc.value;
      fc.innerHTML = '<option value="">Tous les livreurs</option>' + couriers.map((c) => '<option value="' + c.id + '"' + (String(cv) === String(c.id) ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');
      const q = new URLSearchParams({ status: st.value, partner: fp.value, courier: fc.value, q: document.getElementById('a-q').value.trim() });
      const r = await api('/agency/orders?' + q);
      document.getElementById('a-orders').innerHTML = ordersTable(r.data.orders || []);
    },

    async livreurs() {
      await loadPeople();
      document.getElementById('a-couriers').innerHTML = usersTable(couriers, 'coursier');
    },
    async partenaires() {
      await loadPeople();
      document.getElementById('a-partners').innerHTML = usersTable(partners, 'partenaire');
    },
    async equipe() {
      const r = await api('/agency/users?role=agence');
      document.getElementById('a-team').innerHTML = usersTable(r.data.users || [], 'agence');
    },

    async stock() {
      const r = await api('/agency/stock');
      const rows = r.data.stock || [];
      document.getElementById('a-stock').innerHTML = rows.length
        ? '<table><thead><tr><th>Partenaire</th><th>Article</th><th>Réf.</th><th>Emplacement</th><th class="num">Qté</th><th>Mis à jour</th><th></th></tr></thead><tbody>' +
          rows.map((s) => '<tr><td>' + esc(s.partner_name || '—') + '</td><td>' + esc(s.name) + '</td><td class="muted">' + esc(s.sku || '') + '</td><td class="muted">' + esc(s.location || '') + '</td>' +
            '<td class="num"><b style="color:' + (s.qty <= 2 ? 'var(--danger)' : 'inherit') + '">' + s.qty + '</b></td><td class="muted">' + date(s.updated_at, true) + '</td>' +
            '<td class="num"><button class="btn btn-ghost btn-sm" data-stock-add="' + s.id + '">+ / −</button> <button class="btn btn-danger btn-sm" data-stock-del="' + s.id + '">Suppr.</button></td></tr>').join('') + '</tbody></table>'
        : '<div class="empty">Aucun stock enregistré.</div>';
    },

    async caisse() {
      const r = await api('/agency/cash');
      const list = r.data.couriers || [];
      const total = list.reduce((s, c) => s + c.amount, 0);
      const today = (r.data.remits || []).filter((x) => String(x.created_at).startsWith(new Date().toISOString().slice(0, 10))).reduce((s, x) => s + x.amount, 0);
      document.getElementById('a-cash-kpis').innerHTML = kpi('Chez les livreurs', money(total), list.filter((c) => c.amount).length + ' livreur(s)', true) + kpi('Reçu aujourd\'hui', money(today), 'Remises validées');
      document.getElementById('a-cash').innerHTML = list.length
        ? '<table><thead><tr><th>Livreur</th><th>Téléphone</th><th class="num">Livraisons</th><th class="num">Montant détenu</th><th></th></tr></thead><tbody>' +
          list.map((c) => '<tr><td>' + esc(c.name) + '</td><td class="muted">' + esc(phoneFmt(c.phone)) + '</td><td class="num">' + c.count + '</td><td class="num"><b>' + money(c.amount) + '</b></td>' +
            '<td class="num">' + (c.amount || c.count ? '<button class="btn btn-primary btn-sm" data-remit="' + c.id + '" data-amount="' + c.amount + '" data-name="' + esc(c.name) + '">Recevoir la caisse</button>' : '') + '</td></tr>').join('') + '</tbody></table>'
        : '<div class="empty">Aucun livreur.</div>';
      const rem = r.data.remits || [];
      document.getElementById('a-remits').innerHTML = rem.length
        ? '<table><thead><tr><th>Date</th><th>Livreur</th><th class="num">Livraisons</th><th class="num">Montant</th><th>Reçu par</th></tr></thead><tbody>' +
          rem.map((x) => '<tr><td>' + date(x.created_at, true) + '</td><td>' + esc(x.courier_name || '') + '</td><td class="num">' + x.orders_count + '</td><td class="num">' + money(x.amount) + '</td><td class="muted">' + esc(x.received_by) + '</td></tr>').join('') + '</tbody></table>'
        : '<div class="empty">Aucune remise.</div>';
    },

    async reversements() {
      const r = await api('/agency/payouts');
      const list = r.data.partners || [];
      const due = list.reduce((s, p) => s + p.amount, 0);
      document.getElementById('a-pay-kpis').innerHTML = kpi('Total à reverser', money(due), list.filter((p) => p.count).length + ' partenaire(s)', true) +
        kpi('Frais retenus (en attente)', money(list.reduce((s, p) => s + p.fees, 0)), 'Payés par les partenaires');
      document.getElementById('a-payouts').innerHTML = list.length
        ? '<table><thead><tr><th>Partenaire</th><th>Moyen</th><th class="num">Commandes</th><th class="num">Encaissé</th><th class="num">Frais</th><th class="num">À reverser</th><th></th></tr></thead><tbody>' +
          list.map((p) => '<tr><td>' + esc(p.business_name || p.name) + '<span class="cell-sub">' + esc(phoneFmt(p.phone)) + '</span></td><td class="muted">' + esc((p.payout_method || '—') + ' ' + (p.payout_number || '')) + '</td>' +
            '<td class="num">' + p.count + '</td><td class="num">' + money(p.collected) + '</td><td class="num">' + money(p.fees) + '</td><td class="num"><b>' + money(p.amount) + '</b></td>' +
            '<td class="num">' + (p.count ? '<button class="btn btn-primary btn-sm" data-pay="' + p.id + '" data-amount="' + p.amount + '" data-name="' + esc(p.business_name || p.name) + '" data-method="' + esc(p.payout_method || '') + '">Reverser</button>' : '') + '</td></tr>').join('') + '</tbody></table>'
        : '<div class="empty">Aucun partenaire.</div>';
      const h = r.data.history || [];
      document.getElementById('a-payhist').innerHTML = h.length
        ? '<table><thead><tr><th>Date</th><th>Partenaire</th><th class="num">Commandes</th><th class="num">Montant</th><th>Moyen</th><th>Référence</th></tr></thead><tbody>' +
          h.map((x) => '<tr><td>' + date(x.created_at, true) + '</td><td>' + esc(x.partner_name || '') + '</td><td class="num">' + x.orders_count + '</td><td class="num">' + money(x.amount) + '</td><td>' + esc(x.method) + '</td><td class="muted">' + esc(x.reference) + '</td></tr>').join('') + '</tbody></table>'
        : '<div class="empty">Aucun reversement.</div>';
    },

    async tarifs() {
      const r = await api('/agency/zones');
      const rows = r.data.zones || [];
      document.getElementById('a-zones').innerHTML = '<table><thead><tr><th>Zone</th><th>Région</th><th>Délai</th><th>Active</th><th></th></tr></thead><tbody>' +
        rows.map((z) => '<tr data-zone="' + z.id + '"><td><input name="name" value="' + esc(z.name) + '" style="min-width:140px" /></td><td><input name="region" value="' + esc(z.region) + '" style="min-width:140px" /></td>' +
          '<td><input name="delay" value="' + esc(z.delay) + '" style="min-width:110px" /></td>' +
          '<td><input name="active" type="checkbox"' + (z.active ? ' checked' : '') + ' style="width:auto" /></td><td><button class="btn btn-ghost btn-sm" data-save-zone="' + z.id + '">Enregistrer</button></td></tr>').join('') + '</tbody></table>' +
        '<p class="muted" style="padding:14px 22px;font-size:13.5px">Tarif unique : ' + money(perItem) + ' par produit, quelle que soit la zone (variable LIVREUR_FEE_PER_ITEM).</p>';
    },

    async messages() {
      const r = await api('/agency/messages');
      const rows = r.data.messages || [];
      LV.setCount('messages', rows.filter((m) => !m.handled).length);
      document.getElementById('a-messages').innerHTML = rows.length ? rows.map((m) =>
        '<div class="order-card" style="' + (m.handled ? 'opacity:.55' : '') + '"><div class="top"><b>' + esc(m.name) + ' · <a class="gold" href="tel:+' + esc(m.phone) + '">' + esc(phoneFmt(m.phone)) + '</a></b><span class="muted">' + date(m.created_at, true) + '</span></div>' +
        '<div class="meta"><span class="muted">' + esc(m.subject) + '</span><span>' + esc(m.message) + '</span></div>' +
        '<div class="btns"><a class="btn btn-dark btn-sm" target="_blank" rel="noopener" href="https://wa.me/' + esc(m.phone) + '">WhatsApp</a><button class="btn btn-ghost btn-sm" data-msg="' + m.id + '" data-handled="' + (m.handled ? 0 : 1) + '">' + (m.handled ? 'Marquer non traité' : 'Marquer traité') + '</button></div></div>').join('')
        : '<div class="empty">Aucun message.</div>';
    },
  };

  function refresh() {
    const id = location.hash.slice(1) || 'dashboard';
    (VIEWS[id] || VIEWS.dashboard)();
  }

  // --------- Actions (délégation) ---------
  document.addEventListener('click', async (e) => {
    const t = e.target;
    let b;
    if (t.closest('[data-new-order]')) return newOrder();
    if ((b = t.closest('[data-new-user]'))) return newUser(b.dataset.newUser);
    if (t.closest('#a-new-stock')) return newStock();
    if ((b = t.closest('[data-order]')) && !t.closest('a')) return openOrder(b.dataset.order);
    if ((b = t.closest('[data-calltab]'))) { callTab = b.dataset.calltab; return VIEWS.appel(); }

    if ((b = t.closest('[data-call]'))) {
      const status = b.dataset.call;
      const d = { status };
      if (status === 'reportee') {
        const when = prompt('Reporter à quelle date ? (AAAA-MM-JJ)', new Date(Date.now() + 864e5).toISOString().slice(0, 10));
        if (when === null) return;
        d.scheduled_for = when; d.status_note = 'Reportée au ' + when;
      } else if (status === 'annulee') {
        const why = prompt('Motif de l\'annulation :');
        if (why === null) return;
        d.status_note = why;
      } else if (status === 'confirmee') {
        d.status_note = 'Confirmée par téléphone';
      }
      const r = await api('/agency/orders/' + b.dataset.id, d, 'PUT');
      if (!r.ok) return toast(r.data.error, true);
      toast('Enregistré'); return VIEWS.appel();
    }

    if ((b = t.closest('[data-assign]'))) {
      const sel = document.querySelector('[data-assign-sel="' + b.dataset.assign + '"]');
      if (!sel.value) return toast('Choisissez un livreur', true);
      const r = await api('/agency/orders/' + b.dataset.assign, { courier_id: sel.value }, 'PUT');
      if (!r.ok) return toast(r.data.error, true);
      toast('Livreur assigné'); return VIEWS.dispatch();
    }
    if ((b = t.closest('[data-bulk]'))) {
      const sel = b.parentElement.querySelector('[data-bulk-sel]');
      if (!sel.value) return toast('Choisissez un livreur', true);
      const ids = JSON.parse(document.getElementById('a-dispatch').dataset.groups || '{}')[b.dataset.bulk] || [];
      for (const id of ids) await api('/agency/orders/' + id, { courier_id: sel.value }, 'PUT');
      toast(ids.length + ' commande(s) assignée(s)'); return VIEWS.dispatch();
    }

    if ((b = t.closest('[data-set]'))) {
      const r = await api('/agency/users/' + b.dataset.user, { status: b.dataset.set }, 'PUT');
      if (!r.ok) return toast(r.data.error, true);
      toast(b.dataset.set === 'active' ? 'Compte activé' : 'Compte suspendu'); await loadPeople(); return refresh();
    }
    if ((b = t.closest('[data-pw]'))) {
      const pw = prompt('Nouveau mot de passe (6 caractères minimum) :');
      if (!pw) return;
      const r = await api('/agency/users/' + b.dataset.user, { password: pw }, 'PUT');
      return r.ok ? toast('Mot de passe modifié') : toast(r.data.error, true);
    }
    if ((b = t.closest('[data-orders-of]'))) {
      document.getElementById('a-f-status').value = '';
      await VIEWS.commandes();
      document.getElementById('a-f-partner').value = b.dataset.ordersOf;
      shell.show('commandes');
      return;
    }

    if ((b = t.closest('[data-stock-add]'))) {
      const n = prompt('Quantité à ajouter (nombre négatif pour retirer) :', '1');
      if (n === null || !Number(n)) return;
      const r = await api('/agency/stock/' + b.dataset.stockAdd, { add: Number(n) }, 'PUT');
      if (!r.ok) return toast(r.data.error, true);
      toast('Stock mis à jour'); return VIEWS.stock();
    }
    if ((b = t.closest('[data-stock-del]'))) {
      if (!confirm('Supprimer cet article du stock ?')) return;
      await api('/agency/stock/' + b.dataset.stockDel, null, 'DELETE');
      toast('Article supprimé'); return VIEWS.stock();
    }

    if ((b = t.closest('[data-remit]'))) {
      if (!confirm('Confirmer la réception de ' + money(b.dataset.amount) + ' de ' + b.dataset.name + ' ?')) return;
      const r = await api('/agency/cash/' + b.dataset.remit, {});
      if (!r.ok) return toast(r.data.error, true);
      toast('Caisse reçue : ' + money(r.data.amount)); return VIEWS.caisse();
    }
    if ((b = t.closest('[data-pay]'))) {
      const body = modal('Reverser à ' + b.dataset.name,
        '<form><div class="form-msg"></div><p style="margin-bottom:16px">Montant : <b class="gold" style="font-size:22px">' + money(b.dataset.amount) + '</b></p>' +
        '<div class="row"><div class="field"><label>Moyen</label><select name="method"><option>Bankily</option><option>Masrvi</option><option>Sedad</option><option>Espèces</option><option>Virement bancaire</option></select></div>' +
        '<div class="field"><label>Référence de transaction</label><input name="reference" /></div></div>' +
        '<button class="btn btn-primary btn-block" type="submit">Confirmer le reversement</button></form>');
      const f = body.querySelector('form');
      if (b.dataset.method) f.method.value = b.dataset.method;
      const pid = b.dataset.pay;
      f.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const r = await LV.submit(f, '/agency/payouts/' + pid);
        if (!r.ok) return;
        closeModal(); toast('Reversement enregistré : ' + money(r.data.amount)); VIEWS.reversements();
      });
      return;
    }

    if ((b = t.closest('[data-save-zone]'))) {
      const tr = b.closest('tr');
      const v = (n) => tr.querySelector('[name="' + n + '"]');
      const r = await api('/agency/zones/' + b.dataset.saveZone, { name: v('name').value, region: v('region').value, delay: v('delay').value, active: v('active').checked }, 'PUT');
      return r.ok ? toast('Zone enregistrée') : toast(r.data.error, true);
    }
    if (t.closest('#a-new-zone')) {
      const body = modal('Ajouter une zone',
        '<form><div class="form-msg"></div><div class="row"><div class="field"><label>Nom</label><input name="name" required /></div><div class="field"><label>Région / wilaya</label><input name="region" required /></div></div>' +
        '<div class="row"><div class="field"><label>Type</label><select name="kind"><option value="commune">Quartier Nouakchott</option><option value="ville">Ville intérieur</option></select></div>' +
        '<div class="field"><label>Délai</label><input name="delay" placeholder="Ex. 24 h" /></div></div>' +
        '<button class="btn btn-primary btn-block" type="submit">Ajouter</button></form>');
      const f = body.querySelector('form');
      f.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const r = await LV.submit(f, '/agency/zones');
        if (!r.ok) return;
        closeModal(); toast('Zone ajoutée'); VIEWS.tarifs();
      });
      return;
    }

    if ((b = t.closest('[data-msg]'))) {
      await api('/agency/messages/' + b.dataset.msg, { handled: b.dataset.handled === '1' }, 'PUT');
      return VIEWS.messages();
    }
  });

  let qTimer;
  document.getElementById('a-q').addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(VIEWS.commandes, 300); });
  ['a-f-status', 'a-f-partner', 'a-f-courier'].forEach((id) => document.getElementById(id).addEventListener('change', VIEWS.commandes));

  shell.start();
  // Compteurs de la barre latérale chargés dès l'ouverture.
  if ((location.hash.slice(1) || 'dashboard') !== 'dashboard') {
    api('/agency/summary').then((s) => {
      const d = s.data;
      LV.setCount('appel', d.to_confirm); LV.setCount('dispatch', d.unassigned); LV.setCount('messages', d.messages);
      LV.setCount('livreurs', d.pending_users.coursier || 0); LV.setCount('partenaires', d.pending_users.partenaire || 0);
    });
  }
})();
