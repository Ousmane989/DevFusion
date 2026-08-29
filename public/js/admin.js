/* Karat — espace administrateur : inscrits, réactivation, paramètres. */
(function () {
  'use strict';

  const { api } = window.Karat;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => Number(n || 0).toLocaleString('fr-FR');
  const q = (s) => document.querySelector(s);
  const qa = (s) => Array.from(document.querySelectorAll(s));

  const FLAG = { SN: '🇸🇳 Sénégal', MR: '🇲🇷 Mauritanie' };
  let ALL = [];

  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function badge(u) {
    if (u.billingState === 'trial') return `<span class="badge trial">${esc(u.billingLabel)}</span>`;
    return u.upToDate ? `<span class="badge ok">${esc(u.billingLabel)}</span>` : `<span class="badge no">${esc(u.billingLabel)}</span>`;
  }

  // ---------- Menu ----------
  function switchSection(name) {
    qa('.adm-sec').forEach((s) => s.classList.toggle('active', s.id === 'asec-' + name));
    qa('.adm-link').forEach((l) => l.classList.toggle('active', l.dataset.asec === name));
    setSide(false);
    window.scrollTo(0, 0);
  }
  function setSide(open) {
    const s = q('#adm-side'), sc = q('#adm-scrim');
    if (s) s.classList.toggle('open', open);
    if (sc) sc.classList.toggle('open', open);
  }

  // ---------- Inscrits ----------
  function renderCards(sum) {
    q('#adm-cards').innerHTML = `
      <div class="adm-card"><div class="clab">Comptes inscrits</div><div class="cval">${money(sum.accounts)}</div></div>
      <div class="adm-card"><div class="clab">Boutiques</div><div class="cval">${money(sum.shops)}</div></div>
      <div class="adm-card"><div class="clab">À jour</div><div class="cval gold">${money(sum.upToDate)}</div></div>
      <div class="adm-card"><div class="clab">Pas à jour</div><div class="cval ${sum.overdue ? 'warn' : ''}">${money(sum.overdue)}</div></div>`;
  }

  function renderRows(list) {
    const tb = q('#adm-rows');
    if (!list.length) { tb.innerHTML = '<tr><td colspan="8" class="adm-empty">Aucun inscrit ne correspond.</td></tr>'; return; }
    tb.innerHTML = list.map((u) => `
      <tr data-id="${u.id}">
        <td><div class="adm-name">${esc(u.name)}</div><div class="adm-shop">${esc(u.shopName)}</div></td>
        <td class="adm-mono">${esc(u.phone || '—')}</td>
        <td>${esc(u.email)}</td>
        <td class="flag">${FLAG[u.country] || esc(u.country)}</td>
        <td class="adm-num">${money(u.shopsCount)}</td>
        <td class="adm-num">${money(u.orders)}</td>
        <td>${fmtDate(u.createdAt)}</td>
        <td>${badge(u)}</td>
      </tr>`).join('');
    tb.querySelectorAll('tr[data-id]').forEach((tr) => tr.addEventListener('click', () => openDetail(Number(tr.dataset.id))));
  }

  function applyFilters() {
    const term = q('#adm-search').value.trim().toLowerCase();
    const country = q('#adm-country').value;
    const bill = q('#adm-billing').value;
    let list = ALL.slice();
    if (country) list = list.filter((u) => u.country === country);
    if (bill === 'ok') list = list.filter((u) => u.upToDate);
    if (bill === 'no') list = list.filter((u) => !u.upToDate);
    if (term) list = list.filter((u) => [u.name, u.shopName, u.email, u.phone].some((v) => String(v || '').toLowerCase().includes(term)));
    renderRows(list);
  }

  function openDetail(id) {
    const u = ALL.find((x) => x.id === id);
    if (!u) return;
    const shops = u.shops && u.shops.length
      ? `<div class="adm-shoplist">${u.shops.map((s) => `<span>${esc(s.shopName)}</span>`).join('')}</div>` : '—';
    q('#adm-box').innerHTML = `
      <button class="adm-close" id="adm-x" aria-label="Fermer">×</button>
      <h3>${esc(u.name)}</h3>
      <div class="adm-shop">${esc(u.shopName)}</div>
      <div class="adm-row"><span class="k">État abonnement</span><span class="v">${badge(u)}</span></div>
      <div class="adm-row"><span class="k">Téléphone</span><span class="v"><a href="tel:${esc(u.phone)}">${esc(u.phone || '—')}</a></span></div>
      <div class="adm-row"><span class="k">E-mail</span><span class="v"><a href="mailto:${esc(u.email)}">${esc(u.email)}</a></span></div>
      <div class="adm-row"><span class="k">E-mail vérifié</span><span class="v">${u.emailVerified ? 'Oui' : 'Non'}</span></div>
      <div class="adm-row"><span class="k">Pays</span><span class="v">${FLAG[u.country] || esc(u.country)}</span></div>
      <div class="adm-row"><span class="k">Devise</span><span class="v">${esc(u.currency)}</span></div>
      <div class="adm-row"><span class="k">Formule</span><span class="v">${esc(u.planName)}</span></div>
      <div class="adm-row"><span class="k">Statut compte</span><span class="v">${esc(u.status)}</span></div>
      <div class="adm-row"><span class="k">Abonnement jusqu'au</span><span class="v">${fmtDate(u.subscriptionEndsAt)}</span></div>
      <div class="adm-row"><span class="k">Inscrit le</span><span class="v">${fmtDate(u.createdAt)}</span></div>
      <div class="adm-row"><span class="k">Produits</span><span class="v">${money(u.products)}</span></div>
      <div class="adm-row"><span class="k">Commandes</span><span class="v">${money(u.orders)}</span></div>
      <div class="adm-row"><span class="k">Boutiques (${u.shopsCount})</span><span class="v">${shops}</span></div>
      <div class="adm-actions">
        <div class="adm-act-msg" id="adm-act-msg"></div>
        <div class="adm-act-row">
          <button class="btn-adm gold" data-act="activate" data-days="30">Activer 30 jours</button>
          <button class="btn-adm gold" data-act="activate" data-days="90">Activer 90 jours</button>
          <button class="btn-adm gold" data-act="activate" data-days="365">Activer 1 an</button>
        </div>
        <div class="adm-act-row">
          <button class="btn-adm ghost" data-act="trial" data-days="3">Remettre en essai (3 j)</button>
          <button class="btn-adm danger" data-act="lock">Bloquer maintenant</button>
        </div>
        <div class="adm-act-row">
          <button class="btn-adm danger" data-act="delete" style="flex:1 0 100%">🗑 Supprimer définitivement le compte</button>
        </div>
      </div>`;
    q('#adm-modal').classList.add('open');
    q('#adm-x').addEventListener('click', closeDetail);
    q('#adm-box').querySelectorAll('.btn-adm').forEach((b) => b.addEventListener('click', () => doAction(u.id, b.dataset.act, Number(b.dataset.days) || 0)));
  }
  function closeDetail() { q('#adm-modal').classList.remove('open'); }

  async function doAction(id, act, days) {
    const m = q('#adm-act-msg');
    if (act === 'delete') return deleteAccount(id);
    if (act === 'lock' && !window.confirm('Bloquer ce compte maintenant ? Le commerçant ne pourra plus accéder à son tableau de bord.')) return;
    if (m) { m.textContent = 'Traitement…'; m.className = 'adm-act-msg'; }
    const r = await api(`/api/admin/users/${id}/${act}`, days ? { days } : {});
    if (!r.ok) { if (m) { m.textContent = (r.data && r.data.error) || 'Erreur.'; m.className = 'adm-act-msg err'; } return; }
    await load();
    openDetail(id);
    const m2 = q('#adm-act-msg');
    if (m2) {
      m2.className = 'adm-act-msg ok';
      m2.textContent = act === 'lock' ? 'Compte bloqué.' : act === 'trial' ? `Essai remis à ${days} jour(s).` : `Abonnement activé pour ${days} jours.`;
    }
  }

  async function deleteAccount(id) {
    const u = ALL.find((x) => x.id === id);
    const label = u ? `${u.name} — ${u.shopName}` : 'ce compte';
    if (!window.confirm(`Supprimer DÉFINITIVEMENT ${label} ?\n\nToutes ses boutiques, produits et commandes seront effacés. Cette action est irréversible.`)) return;
    const m = q('#adm-act-msg');
    if (m) { m.textContent = 'Suppression…'; m.className = 'adm-act-msg'; }
    const r = await api(`/api/admin/users/${id}`, null, 'DELETE');
    if (!r.ok) { if (m) { m.textContent = (r.data && r.data.error) || 'Suppression impossible.'; m.className = 'adm-act-msg err'; } return; }
    closeDetail();
    await load();
  }

  async function load() {
    const r = await api('/api/admin/users');
    if (!r.ok) {
      q('#adm-rows').innerHTML = `<tr><td colspan="8" class="adm-empty">${r.status === 403 ? 'Accès réservé à l\'administrateur.' : 'Erreur de chargement.'}</td></tr>`;
      return;
    }
    ALL = r.data.users || [];
    renderCards(r.data.summary || { accounts: 0, shops: 0, upToDate: 0, overdue: 0 });
    applyFilters();
  }

  // ---------- Paramètres ----------
  function setMsg(el, ok, text) { if (el) { el.className = 'adm-act-msg ' + (ok ? 'ok' : 'err'); el.textContent = text; } }

  async function loadSettings() {
    const r = await api('/api/admin/settings');
    if (r.ok && r.data) q('#st-wa').value = r.data.whatsapp || '';
  }

  function wireSettings() {
    const fw = q('#form-wa');
    if (fw) fw.addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = q('#wa-msg'); setMsg(m, true, 'Enregistrement…');
      const r = await api('/api/admin/settings', { whatsapp: q('#st-wa').value.trim() }, 'PUT');
      if (!r.ok) { const er = (r.data && r.data.errors) || {}; setMsg(m, false, er.whatsapp || 'Erreur.'); return; }
      q('#st-wa').value = r.data.whatsapp; setMsg(m, true, 'Numéro WhatsApp enregistré ✓');
    });
    const fe = q('#form-email');
    if (fe) fe.addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = q('#se-msg'); setMsg(m, true, 'Traitement…');
      const r = await api('/api/account/email', { email: q('#se-email').value.trim(), password: q('#se-pass').value });
      if (!r.ok) { const er = (r.data && r.data.errors) || {}; setMsg(m, false, er.email || er.password || 'Erreur.'); return; }
      setMsg(m, true, 'E-mail de connexion mis à jour ✓'); q('#se-pass').value = '';
    });
    const fp = q('#form-pass');
    if (fp) fp.addEventListener('submit', async (e) => {
      e.preventDefault();
      const m = q('#sp-msg'); setMsg(m, true, 'Traitement…');
      const r = await api('/api/account/password', { current: q('#sp-current').value, next: q('#sp-next').value });
      if (!r.ok) { const er = (r.data && r.data.errors) || {}; setMsg(m, false, er.current ? 'Mot de passe actuel incorrect.' : (er.next || 'Erreur.')); return; }
      setMsg(m, true, 'Mot de passe mis à jour ✓'); q('#sp-current').value = ''; q('#sp-next').value = '';
    });
  }

  async function logout() {
    await api('/api/auth/logout', {});
    window.location.href = '/admin/connexion';
  }

  function init() {
    qa('.adm-link').forEach((l) => l.addEventListener('click', () => switchSection(l.dataset.asec)));
    q('#adm-burger') && q('#adm-burger').addEventListener('click', () => setSide(!q('#adm-side').classList.contains('open')));
    q('#adm-scrim') && q('#adm-scrim').addEventListener('click', () => setSide(false));
    q('#adm-logout') && q('#adm-logout').addEventListener('click', logout);
    q('#adm-search').addEventListener('input', applyFilters);
    q('#adm-country').addEventListener('change', applyFilters);
    q('#adm-billing').addEventListener('change', applyFilters);
    q('#adm-modal').addEventListener('click', (e) => { if (e.target.id === 'adm-modal') closeDetail(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDetail(); });
    wireSettings();
    load();
    loadSettings();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
