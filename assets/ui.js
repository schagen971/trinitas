/* ====================================================================
   Trinitas Investment — UI helpers
   Vanilla JS only. Replaces the React layer of the original prototype.
==================================================================== */

(function () {
  /* Nav scroll state — rAF-throttled so we never run more than once per frame */
  const nav = document.getElementById('nav');
  if (nav) {
    let queued = false;
    const apply = () => {
      if (window.scrollY > 60) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
      queued = false;
    };
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(apply);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    apply();
  }

  /* Mobile menu toggle */
  const toggle = document.getElementById('mobile-toggle');
  const menu   = document.getElementById('mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        menu.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* Year stamp */
  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* Reveal-on-scroll */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('in'));
  }

  /* Touch devices have no :hover — fire the card hover state on
     pillar-card AND business-card when each crosses the viewport's
     centre 20% strip. rootMargin -40% top/bottom = inner 20% band. */
  const noHover = window.matchMedia && window.matchMedia('(hover: none)').matches;
  const cards = document.querySelectorAll('.pillar-card, .business-card');
  if (noHover && cards.length && 'IntersectionObserver' in window) {
    const centerObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        e.target.classList.toggle('in-view', e.isIntersecting);
      });
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
    cards.forEach(c => centerObs.observe(c));
  }
})();
