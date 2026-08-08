/* ==========================================================================
   DevFusion — Interactions UI (transversales à tout le site)
   Header au scroll, menu mobile, dropdowns, modales, drawer, toasts,
   effet de pression (ripple), bascule de thème.
   API globale : DFToast, DFModal, DFDrawer.
   ========================================================================== */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Header : compact au défilement (section 2) ------------- */
  function initHeader() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var last = 0, ticking = false;
    function update() {
      var y = window.scrollY || window.pageYOffset;
      header.classList.toggle("scrolled", y > 8);
      last = y; ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
  }

  /* ---------------- Menu mobile (section 2) -------------------------------- */
  function initMobileMenu() {
    var burger = document.querySelector(".burger");
    var menu = document.querySelector(".mobile-menu");
    if (!burger || !menu) return;
    function toggle(force) {
      var open = force !== undefined ? force : !menu.classList.contains("open");
      menu.classList.toggle("open", open);
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", open);
      document.body.style.overflow = open ? "hidden" : "";
    }
    burger.addEventListener("click", function () { toggle(); });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { toggle(false); });
    });
    window.addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });
  }

  /* ---------------- Dropdowns (section 16) --------------------------------- */
  function initDropdowns() {
    document.querySelectorAll("[data-dropdown]").forEach(function (dd) {
      var trigger = dd.querySelector("[data-dropdown-trigger]");
      if (!trigger) return;
      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = dd.classList.toggle("open");
        trigger.setAttribute("aria-expanded", open);
        // ferme les autres
        document.querySelectorAll("[data-dropdown].open").forEach(function (o) {
          if (o !== dd) o.classList.remove("open");
        });
      });
    });
    document.addEventListener("click", function () {
      document.querySelectorAll("[data-dropdown].open").forEach(function (o) { o.classList.remove("open"); });
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") document.querySelectorAll("[data-dropdown].open").forEach(function (o) { o.classList.remove("open"); });
    });
  }

  /* ---------------- Effet de pression / ripple (section 17) ---------------- */
  function initRipple() {
    if (reduceMotion) return;
    document.addEventListener("pointerdown", function (e) {
      var btn = e.target.closest(".btn");
      if (!btn || btn.classList.contains("is-loading")) return;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var span = document.createElement("span");
      span.className = "ripple";
      span.style.width = span.style.height = size + "px";
      span.style.left = (e.clientX - rect.left - size / 2) + "px";
      span.style.top = (e.clientY - rect.top - size / 2) + "px";
      btn.appendChild(span);
      setTimeout(function () { span.remove(); }, 620);
    });
  }

  /* ---------------- Modales (section 15) ----------------------------------- */
  var DFModal = {
    open: function (id) {
      var m = document.getElementById(id);
      if (!m) return;
      m.classList.add("open");
      document.body.style.overflow = "hidden";
      var f = m.querySelector("input, button, [tabindex]");
      if (f) setTimeout(function () { f.focus(); }, 60);
    },
    close: function (el) {
      var backdrop = typeof el === "string" ? document.getElementById(el) : el.closest(".modal-backdrop");
      if (!backdrop) return;
      var modal = backdrop.querySelector(".modal");
      if (modal) modal.classList.add("closing");
      setTimeout(function () {
        backdrop.classList.remove("open");
        if (modal) modal.classList.remove("closing");
        document.body.style.overflow = "";
      }, reduceMotion ? 0 : 200);
    }
  };
  function initModals() {
    document.querySelectorAll("[data-modal-open]").forEach(function (t) {
      t.addEventListener("click", function () { DFModal.open(t.getAttribute("data-modal-open")); });
    });
    document.querySelectorAll(".modal-backdrop").forEach(function (b) {
      b.addEventListener("click", function (e) { if (e.target === b) DFModal.close(b); });
    });
    document.querySelectorAll("[data-modal-close]").forEach(function (c) {
      c.addEventListener("click", function () { DFModal.close(c); });
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        var open = document.querySelector(".modal-backdrop.open");
        if (open) DFModal.close(open);
      }
    });
  }

  /* ---------------- Drawer panier (section 6) ------------------------------ */
  var DFDrawer = {
    open: function (id) {
      var d = document.getElementById(id || "cart-drawer");
      if (!d) return;
      d.classList.add("open");
      var bd = document.getElementById((id || "cart-drawer") + "-bd");
      if (bd) bd.classList.add("open");
      document.body.style.overflow = "hidden";
    },
    close: function (id) {
      var d = document.getElementById(id || "cart-drawer");
      if (d) d.classList.remove("open");
      var bd = document.getElementById((id || "cart-drawer") + "-bd");
      if (bd) bd.classList.remove("open");
      document.body.style.overflow = "";
    }
  };
  function initDrawer() {
    document.querySelectorAll("[data-drawer-open]").forEach(function (t) {
      t.addEventListener("click", function () { DFDrawer.open(t.getAttribute("data-drawer-open")); });
    });
    document.querySelectorAll("[data-drawer-close]").forEach(function (t) {
      t.addEventListener("click", function () { DFDrawer.close(t.getAttribute("data-drawer-close") || undefined); });
    });
    document.querySelectorAll(".drawer-backdrop").forEach(function (bd) {
      bd.addEventListener("click", function () {
        var id = bd.id.replace(/-bd$/, "");
        DFDrawer.close(id);
      });
    });
  }

  /* ---------------- Toasts / notifications (section 14) -------------------- */
  var ICONS = {
    success: '<path d="M20 6 9 17l-5-5"/>',
    error:   '<path d="M18 6 6 18M6 6l12 12"/>',
    warning: '<path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    info:    '<path d="M12 16v-4m0-4h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"/>'
  };
  function ensureStack() {
    var s = document.querySelector(".toast-stack");
    if (!s) { s = document.createElement("div"); s.className = "toast-stack"; s.setAttribute("aria-live", "polite"); document.body.appendChild(s); }
    return s;
  }
  var DFToast = function (opts) {
    opts = opts || {};
    var type = opts.type || "info";
    var stack = ensureStack();
    var el = document.createElement("div");
    el.className = "toast " + type;
    el.setAttribute("role", "status");
    el.innerHTML =
      '<svg class="t-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[type] || ICONS.info) + '</svg>' +
      '<div class="t-body"><div class="t-title">' + (opts.title || "") + '</div>' +
      (opts.text ? '<div class="t-text">' + opts.text + '</div>' : '') + '</div>' +
      '<button class="t-close" aria-label="Fermer">' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>';
    stack.appendChild(el);

    var duration = opts.duration || 3600;
    var timer;
    function dismiss() {
      clearTimeout(timer);
      el.classList.add("hide");
      el.addEventListener("animationend", function () { el.remove(); });
    }
    el.querySelector(".t-close").addEventListener("click", dismiss);
    if (duration > 0) timer = setTimeout(dismiss, duration);
    return { dismiss: dismiss };
  };
  // Raccourcis
  DFToast.success = function (title, text, d) { return DFToast({ type: "success", title: title, text: text, duration: d }); };
  DFToast.error   = function (title, text, d) { return DFToast({ type: "error",   title: title, text: text, duration: d }); };
  DFToast.warning = function (title, text, d) { return DFToast({ type: "warning", title: title, text: text, duration: d }); };
  DFToast.info    = function (title, text, d) { return DFToast({ type: "info",    title: title, text: text, duration: d }); };

  /* ---------------- Bascule de thème clair/sombre -------------------------- */
  function initTheme() {
    var stored = localStorage.getItem("df-theme");
    if (stored) document.documentElement.setAttribute("data-theme", stored);
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
        var next = cur === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("df-theme", next);
      });
    });
  }

  /* ---------------- Boutons de démonstration « loading » ------------------- */
  function initLoadingDemo() {
    document.querySelectorAll("[data-loading]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.classList.contains("is-loading")) return;
        btn.classList.add("is-loading");
        setTimeout(function () {
          btn.classList.remove("is-loading");
          var ok = btn.getAttribute("data-loading");
          if (ok) DFToast.success(ok);
        }, 1400);
      });
    });
  }

  /* ---------------- Init --------------------------------------------------- */
  function init() {
    initHeader();
    initMobileMenu();
    initDropdowns();
    initRipple();
    initModals();
    initDrawer();
    initTheme();
    initLoadingDemo();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.DFToast = DFToast;
  window.DFModal = DFModal;
  window.DFDrawer = DFDrawer;
})();
