/* ==========================================================================
   DevFusion — Moteur d'animation
   - Reveal au défilement via IntersectionObserver (performant, section 21)
   - Stagger automatique des enfants d'un conteneur .stagger
   - Compteurs animés (dashboards, sections 10/9)
   - Transition douce entre les pages (sections 18/19)
   Respecte prefers-reduced-motion (section 22).
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------------------
     1. REVEAL AU SCROLL
     ---------------------------------------------------------------------- */
  function initReveal() {
    var els = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

    // Stagger : indexe les enfants .reveal d'un conteneur .stagger
    document.querySelectorAll(".stagger").forEach(function (group) {
      var kids = group.querySelectorAll(":scope > .reveal");
      kids.forEach(function (kid, i) { kid.style.setProperty("--i", i); });
    });

    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add("is-visible");
        // libère la couche GPU une fois terminé
        el.addEventListener("transitionend", function onEnd() {
          el.classList.add("rv-done");
          el.removeEventListener("transitionend", onEnd);
        });
        obs.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    els.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
     2. COMPTEURS ANIMÉS
     <span class="count" data-to="1240" data-suffix=" €"></span>
     ---------------------------------------------------------------------- */
  function animateCount(el) {
    var to = parseFloat(el.getAttribute("data-to")) || 0;
    var dur = parseInt(el.getAttribute("data-dur"), 10) || 1400;
    var dec = parseInt(el.getAttribute("data-decimals"), 10) || 0;
    var prefix = el.getAttribute("data-prefix") || "";
    var suffix = el.getAttribute("data-suffix") || "";

    if (reduceMotion) {
      el.textContent = prefix + to.toFixed(dec) + suffix;
      return;
    }
    var start = null;
    function fmt(n) { return prefix + n.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suffix; }
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = fmt(to * eased);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmt(to);
    }
    requestAnimationFrame(step);
  }

  function initCounters() {
    var counters = document.querySelectorAll(".count[data-to]");
    if (!counters.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      counters.forEach(animateCount);
      return;
    }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); obs.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* ----------------------------------------------------------------------
     3. BARRES DE GRAPHIQUE (dashboard) — grandit à l'entrée
     ---------------------------------------------------------------------- */
  function initBars() {
    var bars = document.querySelectorAll(".bar[data-h]");
    if (!bars.length) return;
    var apply = function (bar) {
      bar.style.height = bar.getAttribute("data-h") + "%";
    };
    if (reduceMotion || !("IntersectionObserver" in window)) {
      bars.forEach(apply); return;
    }
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (e, idx) {
        if (!e.isIntersecting) return;
        var bar = e.target;
        setTimeout(function () { apply(bar); }, (Array.prototype.indexOf.call(bars, bar) % 12) * 60);
        obs.unobserve(bar);
      });
    }, { threshold: 0.4 });
    bars.forEach(function (b) { io.observe(b); });
  }

  /* ----------------------------------------------------------------------
     4. TRANSITION DE PAGE (fade out avant navigation interne)
     ---------------------------------------------------------------------- */
  function initPageTransitions() {
    if (reduceMotion) return;
    document.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a) return;
      var href = a.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      if (a.target === "_blank" || a.hasAttribute("download")) return;
      if (a.hostname && a.hostname !== window.location.hostname) return;
      if (a.hasAttribute("data-no-transition")) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

      e.preventDefault();
      document.body.classList.add("is-leaving");
      setTimeout(function () { window.location.href = href; }, 180);
    });

    // au retour (bfcache), on retire l'état de sortie
    window.addEventListener("pageshow", function () {
      document.body.classList.remove("is-leaving");
    });
  }

  /* ----------------------------------------------------------------------
     Init
     ---------------------------------------------------------------------- */
  function init() {
    initReveal();
    initCounters();
    initBars();
    initPageTransitions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Exposé pour les pages qui injectent du contenu dynamiquement
  window.DFReveal = initReveal;
  window.DFCount = animateCount;
})();
