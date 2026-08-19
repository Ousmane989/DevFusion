/* ==================================================================
   Karat — interactions de la page d'accueil
   ================================================================== */
(function () {
  'use strict';

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- En-tete : ombre/flou au scroll -----------------------------
  const header = document.querySelector('.site-header');
  const onScroll = () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---- Apparition au scroll (fondu + glissement) ------------------
  const revealEls = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  // ---- Compteurs animes -------------------------------------------
  const counters = document.querySelectorAll('[data-count]');
  const animateCount = (el) => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (reduce) {
      el.textContent = target.toLocaleString('fr-FR') + suffix;
      return;
    }
    const dur = 1800;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.floor(eased * target).toLocaleString('fr-FR') + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window) {
    const cio = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            animateCount(e.target);
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((el) => cio.observe(el));
  } else {
    counters.forEach(animateCount);
  }

  // ---- Menu mobile -------------------------------------------------
  const toggle = document.querySelector('.nav-toggle');
  const mobile = document.querySelector('.mobile-menu');
  const closeBtn = document.querySelector('.mobile-close');
  const openMenu = () => {
    if (mobile) { mobile.classList.add('open'); document.body.style.overflow = 'hidden'; }
  };
  const closeMenu = () => {
    if (mobile) { mobile.classList.remove('open'); document.body.style.overflow = ''; }
  };
  toggle && toggle.addEventListener('click', openMenu);
  closeBtn && closeBtn.addEventListener('click', closeMenu);
  mobile && mobile.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));

  // ---- FAQ (accordeon) --------------------------------------------
  document.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((o) => {
        o.classList.remove('open');
        o.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  // ---- Modale d'apercu des modeles --------------------------------
  const modal = document.querySelector('#template-modal');
  if (modal) {
    const mPreview = modal.querySelector('.modal-preview');
    const mCat = modal.querySelector('[data-m-cat]');
    const mName = modal.querySelector('[data-m-name]');
    const mDesc = modal.querySelector('[data-m-desc]');

    const openModal = (card) => {
      mPreview.innerHTML = card.querySelector('.template-thumb').innerHTML;
      mCat.textContent = card.dataset.cat || '';
      mName.textContent = card.dataset.name || '';
      mDesc.textContent = card.dataset.desc || '';
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    const closeModal = () => {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    };

    document.querySelectorAll('[data-preview]').forEach((btn) => {
      btn.addEventListener('click', () => openModal(btn.closest('.template')));
    });
    modal.querySelector('.modal-close').addEventListener('click', closeModal);
    modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  }

  // ---- Annee du pied de page --------------------------------------
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
