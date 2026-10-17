/* Espace livreur : tournée du jour, preuve de livraison, caisse. */
(async function () {
  'use strict';
  const { api, esc, money, badge, date, toast, modal, closeModal, icon } = LV;
  const SECTIONS = [
    { id: 'tournee', label: 'Ma tournée', icon: 'route' },
    { id: 'caisse', label: 'Ma caisse', icon: 'cash' },
  ];
  const shell = await LV.appShell('coursier', 'Espace livreur', SECTIONS, (id) => VIEWS[id]());
  if (!shell) return;

  const NEXT = {
    assignee: [['recuperee', 'Colis récupéré', 'btn-primary']],
    reportee: [['recuperee', 'Colis récupéré', 'btn-primary'], ['en_cours', 'Reprendre la livraison', 'btn-ghost']],
    recuperee: [['en_cours', 'En route vers le client', 'btn-primary']],
    en_cours: [['livree', 'Livré', 'btn-success'], ['echec', 'Échec', 'btn-danger'], ['reportee', 'Reporter', 'btn-ghost']],
  };

  function card(o, done) {
    const maps = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(o.address + ', ' + o.zone_name + ', Mauritanie');
    const tel = 'tel:+' + o.recipient_phone;
    const wa = 'https://wa.me/' + o.recipient_phone;
    return '<div class="order-card"><div class="top"><span class="code">' + esc(o.code) + '</span>' + badge(o.status, o.status_label) + '</div>' +
      '<div class="meta"><span><b>' + esc(o.recipient_name) + '</b> · ' + esc(LV.phoneFmt(o.recipient_phone)) + '</span>' +
      '<span>' + esc(o.zone_name) + ' — ' + esc(o.address) + '</span>' +
      (o.pickup_address && !done ? '<span class="muted">Enlèvement : ' + esc(o.pickup_address) + (o.partner_name ? ' (' + esc(o.partner_name) + ')' : '') + '</span>' : '') +
      (o.description ? '<span class="muted">Colis : ' + esc(o.description) + '</span>' : '') +
      (o.note ? '<span class="muted">Note : ' + esc(o.note) + '</span>' : '') + '</div>' +
      '<div class="amount">' + (o.collected ? (done ? 'Encaissé : ' : 'À encaisser : ') + '<span class="gold">' + money(o.collected) + '</span>' : '<span class="dim" style="font-size:16px">Rien à encaisser</span>') + '</div>' +
      (done ? '' : '<div class="btns"><a class="btn btn-dark btn-sm" href="' + tel + '">' + icon('phone', 'ico') + ' Appeler</a><a class="btn btn-dark btn-sm" target="_blank" rel="noopener" href="' + wa + '">WhatsApp</a><a class="btn btn-dark btn-sm" target="_blank" rel="noopener" href="' + maps + '">' + icon('pin', 'ico') + ' Itinéraire</a></div>' +
        '<div class="btns">' + (NEXT[o.status] || []).map(([st, l, cls]) => '<button class="btn ' + cls + '" data-act="' + st + '" data-id="' + o.id + '">' + l + '</button>').join('') + '</div>') +
      '</div>';
  }

  async function act(id, status) {
    if (status === 'livree' || status === 'echec' || status === 'reportee') {
      const livree = status === 'livree';
      const body = modal(livree ? 'Confirmer la livraison' : (status === 'echec' ? 'Signaler un échec' : 'Reporter la livraison'),
        '<form id="c-proof"><div class="form-msg"></div>' +
        (livree ? '<div class="field"><label>Nom de la personne qui a reçu le colis</label><input name="received_by" required /></div><div class="field"><label>Remarque (facultatif)</label><input name="note" /></div>'
          : '<div class="field"><label>Motif</label><select name="reason"><option>Client injoignable</option><option>Client absent</option><option>Client a refusé le colis</option><option>Adresse introuvable</option><option>Client demande un autre jour</option><option>Autre</option></select></div><div class="field"><label>Détails</label><input name="detail" /></div>') +
        '<button class="btn ' + (livree ? 'btn-success' : 'btn-primary') + ' btn-block" type="submit">Valider</button></form>');
      const f = body.querySelector('form');
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = LV.formData(f);
        const payload = livree ? { status, received_by: d.received_by, note: d.note } : { status, note: d.reason + (d.detail ? ' — ' + d.detail : '') };
        const r = await api('/courier/orders/' + id + '/status', payload);
        if (!r.ok) return LV.msg(f.querySelector('.form-msg'), 'error', r.data.error);
        closeModal(); toast(livree ? 'Livraison confirmée ✓' : 'Enregistré'); VIEWS.tournee();
      });
      return;
    }
    const r = await api('/courier/orders/' + id + '/status', { status });
    if (!r.ok) return toast(r.data.error, true);
    toast('Statut mis à jour'); VIEWS.tournee();
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b) act(b.dataset.id, b.dataset.act);
  });
  document.getElementById('c-refresh').addEventListener('click', () => shell.show(location.hash.slice(1)));

  function kpi(label, value, sub, accent) {
    return '<div class="kpi' + (accent ? ' accent' : '') + '"><span>' + label + '</span><strong>' + value + '</strong><small>' + (sub || '') + '</small></div>';
  }

  const VIEWS = {
    async tournee() {
      const [t, c] = await Promise.all([api('/courier/tour'), api('/courier/cash')]);
      const active = t.data.active || [];
      const done = t.data.done || [];
      const toCollect = active.reduce((s, o) => s + o.collected, 0);
      document.getElementById('c-kpis').innerHTML =
        kpi('À livrer', active.length, 'courses en cours') +
        kpi('Livrées aujourd\'hui', done.filter((o) => o.status === 'livree').length, done.filter((o) => o.status === 'echec').length + ' échec(s)') +
        kpi('Reste à encaisser', money(toCollect), 'sur la tournée') +
        kpi('Caisse à remettre', money(c.data.held || 0), 'à déposer à l\'agence', true);
      LV.setCount('tournee', active.length);
      document.getElementById('c-active').innerHTML = active.length ? active.map((o) => card(o)).join('') : '<div class="empty">Aucune course assignée pour le moment. Actualisez plus tard.</div>';
      document.getElementById('c-done').innerHTML = done.length ? done.map((o) => card(o, true)).join('') : '<div class="empty">Rien pour l\'instant.</div>';
    },
    async caisse() {
      const r = await api('/courier/cash');
      const d = r.data;
      document.getElementById('c-cash-kpis').innerHTML =
        kpi('Caisse à remettre', money(d.held), (d.orders || []).length + ' livraisons', true) +
        kpi('Dernière remise', d.remits && d.remits[0] ? money(d.remits[0].amount) : '—', d.remits && d.remits[0] ? date(d.remits[0].created_at, true) : '');
      document.getElementById('c-cash-list').innerHTML = (d.orders || []).length
        ? '<table><thead><tr><th>Code</th><th>Client</th><th>Livré le</th><th class="num">Encaissé</th></tr></thead><tbody>' +
          d.orders.map((o) => '<tr><td class="code">' + esc(o.code) + '</td><td>' + esc(o.recipient_name) + '</td><td class="muted">' + date(o.delivered_at, true) + '</td><td class="num">' + money(o.collected) + '</td></tr>').join('') + '</tbody></table>'
        : '<div class="empty">Aucun encaissement en attente. 👍</div>';
      document.getElementById('c-remits').innerHTML = (d.remits || []).length
        ? '<table><thead><tr><th>Date</th><th class="num">Livraisons</th><th class="num">Montant</th><th>Reçu par</th></tr></thead><tbody>' +
          d.remits.map((x) => '<tr><td>' + date(x.created_at, true) + '</td><td class="num">' + x.orders_count + '</td><td class="num">' + money(x.amount) + '</td><td class="muted">' + esc(x.received_by) + '</td></tr>').join('') + '</tbody></table>'
        : '<div class="empty">Aucune remise pour le moment.</div>';
    },
  };
  shell.start();
})();
