/* ==========================================================================
   DevFusion — Panier (interactions VISUELLES uniquement)
   Aucune logique métier / paiement : uniquement les animations demandées
   à la section 6 (ajout, compteur, drawer, suppression fluide, total).
   L'état est gardé en mémoire + localStorage pour l'affichage du compteur.
   ========================================================================== */
(function () {
  "use strict";

  var KEY = "df-cart-count";
  function getCount() { return parseInt(localStorage.getItem(KEY), 10) || 0; }
  function setCount(n) { localStorage.setItem(KEY, String(n)); renderCount(n); }

  function renderCount(n) {
    document.querySelectorAll(".cart-count").forEach(function (el) {
      el.textContent = n;
      el.classList.toggle("show", n > 0);
    });
  }
  function bumpCount() {
    document.querySelectorAll(".cart-count").forEach(function (el) {
      el.classList.remove("bump");
      // reflow pour rejouer l'animation
      void el.offsetWidth;
      el.classList.add("bump");
    });
  }

  /* --------- Ajout au panier : anime le bouton + compteur + toast + drawer -- */
  function initAddButtons() {
    document.querySelectorAll("[data-add-to-cart]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        if (btn.classList.contains("is-loading")) return;

        var name = btn.getAttribute("data-name") || "Article";
        var openDrawer = btn.hasAttribute("data-open-drawer");

        // 1. bouton en chargement bref
        btn.classList.add("is-loading");
        setTimeout(function () {
          btn.classList.remove("is-loading");

          // 2. indication visuelle de succès sur le bouton
          var original = btn.getAttribute("data-label") || btn.innerHTML;
          if (!btn.getAttribute("data-label")) btn.setAttribute("data-label", original);
          btn.classList.add("btn-success");
          btn.innerHTML = checkSvg() + " Ajouté";

          // 3. compteur panier
          setCount(getCount() + 1);
          bumpCount();

          // 4. notification
          window.DFToast && DFToast.success("Ajouté au panier", name);

          // 5. drawer éventuel
          if (openDrawer && window.DFDrawer) DFDrawer.open("cart-drawer");

          // retour à l'état initial
          setTimeout(function () {
            btn.classList.remove("btn-success");
            btn.innerHTML = btn.getAttribute("data-label");
          }, 1500);
        }, 550);
      });
    });
  }

  /* --------- Suppression d'une ligne : disparition fluide + total ---------- */
  function initRemoveButtons(scope) {
    (scope || document).querySelectorAll("[data-remove-line]").forEach(function (btn) {
      if (btn._bound) return; btn._bound = true;
      btn.addEventListener("click", function () {
        var line = btn.closest(".cart-line");
        if (!line) return;
        line.style.maxHeight = line.offsetHeight + "px";
        void line.offsetWidth;
        line.classList.add("removing");
        line.addEventListener("transitionend", function () {
          line.remove();
          setCount(Math.max(0, getCount() - 1));
          recomputeTotal();
          window.DFToast && DFToast.info("Article retiré");
        }, { once: true });
      });
    });
  }

  /* --------- Quantité : +/- avec petit rebond + total --------------------- */
  function initQty(scope) {
    (scope || document).querySelectorAll(".qty").forEach(function (q) {
      if (q._bound) return; q._bound = true;
      var span = q.querySelector("span");
      q.querySelectorAll("button").forEach(function (b) {
        b.addEventListener("click", function () {
          var v = parseInt(span.textContent, 10) || 1;
          v += b.hasAttribute("data-inc") ? 1 : -1;
          if (v < 1) v = 1;
          span.textContent = v;
          span.classList.remove("pop"); void span.offsetWidth; span.classList.add("pop");
          recomputeTotal();
        });
      });
    });
  }

  /* --------- Recalcul visuel du total (met à jour joliment) --------------- */
  function recomputeTotal() {
    var totals = document.querySelectorAll("[data-cart-total]");
    if (!totals.length) return;
    var sum = 0;
    document.querySelectorAll(".cart-line").forEach(function (line) {
      if (line.classList.contains("removing")) return;
      var price = parseFloat(line.getAttribute("data-price")) || 0;
      var qEl = line.querySelector(".qty span");
      var qty = qEl ? (parseInt(qEl.textContent, 10) || 1) : 1;
      sum += price * qty;
    });
    var text = sum.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
    totals.forEach(function (totalEl) {
      totalEl.classList.remove("pop"); void totalEl.offsetWidth; totalEl.classList.add("pop");
      totalEl.textContent = text;
    });
  }

  function checkSvg() {
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  }

  function init() {
    renderCount(getCount());
    initAddButtons();
    initRemoveButtons();
    initQty();
    recomputeTotal();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.DFCart = { setCount: setCount, getCount: getCount, bindLines: function (s) { initRemoveButtons(s); initQty(s); } };
})();
