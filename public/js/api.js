/* Petites fonctions utilitaires partagees par les pages Karat. */
window.Karat = (function () {
  'use strict';

  async function api(path, body, method) {
    const res = await fetch(path, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch (_) {}
    return { ok: res.ok, status: res.status, data };
  }

  function msg(el, type, text) {
    if (!el) return;
    el.className = 'form-msg show ' + type;
    el.textContent = text;
  }
  function clearMsg(el) { if (el) el.className = 'form-msg'; }

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function money(n) {
    return Number(n).toLocaleString('fr-FR');
  }

  // Formatage monetaire selon la devise de la boutique (MRU ou FCFA).
  const RATE = 6; // 1 MRU ≈ 6 FCFA
  function moneyMain(n, cur) { return money(Math.round(n)) + ' ' + (cur || 'MRU'); }
  function moneyAlt(n, cur) {
    cur = cur || 'MRU';
    const a = cur === 'FCFA' ? { v: Math.round(n / RATE), c: 'MRU' } : { v: Math.round(n * RATE), c: 'FCFA' };
    return '≈ ' + money(a.v) + ' ' + a.c;
  }

  // Affiche/masque un mot de passe.
  function bindPwToggles() {
    document.querySelectorAll('.pw-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        input.type = input.type === 'password' ? 'text' : 'password';
      });
    });
  }

  return { api, msg, clearMsg, qs, money, moneyMain, moneyAlt, bindPwToggles };
})();
