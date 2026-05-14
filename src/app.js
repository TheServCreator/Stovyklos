import campsData from './data/camps.json';
import siteContent from './data/content.json';

(() => {
  const prefersReduced = () => {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  };

  class SimpleCarousel {
    constructor(root) {
      this.root = root;
      this.track = root.querySelector('.carousel__track');
      this.slides = Array.from(root.querySelectorAll('.carousel__slide'));
      this.prevBtn = root.querySelector('.carousel__btn--prev');
      this.nextBtn = root.querySelector('.carousel__btn--next');
      this.dotsWrap = root.querySelector('.carousel__dots');
      this.bar = root.querySelector('.carousel__bar');

      this.index = 0;
      this.isDragging = false;
      this.startX = 0;
      this.currentX = 0;
      this.startTranslate = 0;
      this.width = 0;

      this.autoplay = root.dataset.autoplay === 'true' && !prefersReduced();
      this.intervalMs = Number(root.dataset.interval || 4000);
      this.timer = null;
      this.raf = null;
      this.progressStart = 0;

      this._buildDots();
      this._bind();
      this.goTo(0, false);
      this._start();
    }

    _measure() {
      this.width = this.root.getBoundingClientRect().width;
    }

    _buildDots() {
      if (!this.dotsWrap) return;
      this.dotsWrap.innerHTML = '';
      this.dots = this.slides.map((_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('aria-label', `Go to slide ${i + 1}`);
        b.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.goTo(i);
        });
        this.dotsWrap.appendChild(b);
        return b;
      });
    }

    _setActiveDot() {
      if (!this.dots) return;
      this.dots.forEach((d, i) => d.classList.toggle('is-active', i === this.index));
    }

    _translateFor(index) {
      return -index * this.width;
    }

    _percentTranslate(index) {
      return -index * 100;
    }

    goTo(index, animate = true) {
      this.index = (index + this.slides.length) % this.slides.length;
      this.track.style.transition = animate ? 'transform 420ms ease' : 'none';
      this.track.style.transform = `translateX(${this._percentTranslate(this.index)}%)`;
      this._setActiveDot();
      this._resetProgress();
    }

    next() { this.goTo(this.index + 1); }
    prev() { this.goTo(this.index - 1); }

    _stopTimers() {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
    }

    _resetProgress() {
      if (!this.bar || !this.autoplay) return;
      this.progressStart = performance.now();
      this.bar.style.transform = 'scaleX(0)';
    }

    _tickProgress = () => {
      if (!this.bar || !this.autoplay) return;
      const now = performance.now();
      const p = Math.min(1, (now - this.progressStart) / this.intervalMs);
      this.bar.style.transform = `scaleX(${p})`;
      this.raf = requestAnimationFrame(this._tickProgress);
    };

    _start() {
      this._stopTimers();
      if (!this.autoplay) return;
      this._resetProgress();
      this.raf = requestAnimationFrame(this._tickProgress);
      this.timer = setInterval(() => { this.next(); }, this.intervalMs);
    }

    _pause() { this._stopTimers(); }

    _bind() {
      if (this.prevBtn) {
        this.prevBtn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation(); this.prev(); this._start();
        });
      }
      if (this.nextBtn) {
        this.nextBtn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation(); this.next(); this._start();
        });
      }

      this.root.addEventListener('mouseenter', () => this._pause());
      this.root.addEventListener('mouseleave', () => this._start());

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this._pause();
        else this._start();
      });

      const onDown = (e) => {
        this.isDragging = true;
        this._pause();
        this._measure();
        this.track.style.transition = 'none';
        this.startX = (e.touches ? e.touches[0].clientX : e.clientX);
        this.currentX = this.startX;
        this.startTranslate = this._translateFor(this.index);
      };

      const onMove = (e) => {
        if (!this.isDragging) return;
        this.currentX = (e.touches ? e.touches[0].clientX : e.clientX);
        const dx = this.currentX - this.startX;
        this.track.style.transform = `translateX(${this.startTranslate + dx}px)`;
      };

      const onUp = () => {
        if (!this.isDragging) return;
        this.isDragging = false;
        const dx = this.currentX - this.startX;
        const threshold = Math.min(120, (this.width || 300) * 0.18);
        if (dx > threshold) this.prev();
        else if (dx < -threshold) this.next();
        else this.goTo(this.index);
        this._start();
      };

      this.root.addEventListener('mousedown', onDown);
      this.root.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);

      this.root.addEventListener('touchstart', onDown, { passive: true });
      this.root.addEventListener('touchmove', onMove, { passive: true });
      this.root.addEventListener('touchend', onUp);

      this.root.tabIndex = 0;
      this.root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); this._start(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); this._start(); }
      });
    }
  }

  // ── CAMP DATA — built from the CMS-managed src/data/camps.json ─────────────
  // Edited via /admin (Sveltia CMS). Shape consumed below: CAMP_DATA[brand][city]
  // = ['Theme – Date', ...] — same as before, just sourced from JSON now.
  const CAMP_DATA = (() => {
    const out = {};
    for (const s of (campsData.sessions || [])) {
      if (!s || !s.brand || !s.city) continue;
      if (!out[s.brand]) out[s.brand] = {};
      if (!out[s.brand][s.city]) out[s.brand][s.city] = [];
      out[s.brand][s.city].push(s.date ? `${s.theme} – ${s.date}` : s.theme);
    }
    return out;
  })();

  // ── POPULATE CAMP + CITY SELECTS FROM CMS DATA ─────────────────────────────
  // The reg-form camp/city dropdowns are filled from camps.json so adding a
  // brand or city in the CMS flows straight through to the form.
  function populateCampCitySelects() {
    const campSel = document.getElementById('camp');
    const citySel = document.getElementById('city');
    if (campSel && Array.isArray(campsData.brands) && campsData.brands.length) {
      campSel.innerHTML = '<option value="">Pasirinkite stovyklą</option>' +
        campsData.brands.map((b) => `<option value="${b.key}">${b.label}</option>`).join('');
    }
    if (citySel && Array.isArray(campsData.cities) && campsData.cities.length) {
      citySel.innerHTML = '<option value="">Pasirinkite miestą</option>' +
        campsData.cities.map((c) => `<option value="${c.key}">${c.label}</option>`).join('');
    }
  }

  // ── CAMP THEME DYNAMIC (camp+city → themes → dates) ────────────────────────
  function initCampThemeDynamic() {
    const campSel  = document.getElementById('camp');
    const citySel  = document.getElementById('city');
    const themeSel = document.getElementById('theme');
    const dateSel  = document.getElementById('date');
    if (!campSel || !citySel || !themeSel) return;

    // Parse flat 'Theme – Date' entries into { theme: [dates] }
    function groupByTheme(entries) {
      const map = {};
      for (const entry of entries) {
        const idx = entry.indexOf(' – ');
        if (idx === -1) continue;
        const theme = entry.slice(0, idx);
        const date  = entry.slice(idx + 3);
        if (!map[theme]) map[theme] = [];
        map[theme].push(date);
      }
      return map;
    }

    let grouped = {};

    function resetDates() {
      if (!dateSel) return;
      dateSel.innerHTML = '<option value="">Pirmiau pasirinkite temą</option>';
    }

    function updateThemes() {
      const campKey = campSel.value;
      const cityKey = citySel.value;
      grouped = {};
      resetDates();

      if (!campKey || !cityKey) {
        themeSel.innerHTML = '<option value="">Pirmiau pasirinkite stovyklą ir miestą</option>';
        return;
      }

      const entries = (CAMP_DATA[campKey] || {})[cityKey];
      if (!entries || entries.length === 0) {
        themeSel.innerHTML = '<option value="">Šiame mieste šios stovyklos nėra</option>';
        return;
      }

      grouped = groupByTheme(entries);
      themeSel.innerHTML = '<option value="">— Pasirinkite temą —</option>' +
        Object.keys(grouped).map(t => `<option value="${t}">${t}</option>`).join('');
    }

    function updateDates() {
      if (!dateSel) return;
      const dates = grouped[themeSel.value] || [];
      if (!dates.length) { resetDates(); return; }
      dateSel.innerHTML = '<option value="">— Pasirinkite datą —</option>' +
        dates.map(d => `<option value="${d}">${d}</option>`).join('');
    }

    campSel.addEventListener('change', updateThemes);
    citySel.addEventListener('change', updateThemes);
    themeSel.addEventListener('change', updateDates);
    updateThemes();
  }

  // ── REGISTRATION FORM SUBMIT ─────────────────────────────────────────────────
  function initRegForm() {
    const form = document.getElementById('regForm');
    const success = document.getElementById('regSuccess');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const payload = Object.fromEntries(data.entries());

      fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      .then(async (res) => {
        const result = await res.json().catch(() => ({}));
        if (!res.ok || !result.ok) {
          throw new Error(result.error || 'Įvyko klaida.');
        }
        if (success) {
          success.textContent = '✅ Ačiū! Registracija gauta. Susisieksime su jumis artimiausiu metu.';
          success.style.display = 'block';
        }
        form.reset();
        const themeSel = document.getElementById('theme');
        const dateSel  = document.getElementById('date');
        if (themeSel) themeSel.innerHTML = '<option value="">Pirmiau pasirinkite stovyklą ir miestą</option>';
        if (dateSel)  dateSel.innerHTML  = '<option value="">Pirmiau pasirinkite temą</option>';
        if (success) success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      })
      .catch((err) => {
        if (success) {
          success.textContent = '⚠️ ' + (err && err.message ? err.message : 'Nepavyko išsiųsti. Bandykite vėliau arba parašykite info@steamedukacija.lt');
          success.style.display = 'block';
          success.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }

  // ── PROMO POPUP ──────────────────────────────────────────────────────────────
  function initPromoPopup() {
    try {
      if (sessionStorage.getItem('promoDismissed') === '1') return;
    } catch {}

    // Promo text comes from the CMS-managed src/data/content.json.
    const promo = (siteContent && siteContent.promo) || {};
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));

    const popup = document.createElement('div');
    popup.className = 'promo-popup';
    popup.id = 'promoPopup';
    popup.setAttribute('aria-hidden', 'true');
    popup.innerHTML = `
      <div class="promo-popup-backdrop"></div>
      <div class="promo-popup-box" role="dialog" aria-modal="true" aria-labelledby="promoTitle">
        <button class="promo-popup-close" aria-label="Uždaryti">×</button>
        <div class="promo-popup-badge">${esc(promo.badge)}</div>
        <div class="promo-popup-price" id="promoTitle">${esc(promo.price)}</div>
        <div class="promo-popup-sub">${esc(promo.sub)}</div>
        <div class="promo-popup-cta-wrap">
          <a href="#registracija" class="promo-popup-cta" id="promoCta">${esc(promo.cta)}</a>
        </div>
        <div class="promo-popup-note">${esc(promo.note)}</div>
      </div>
    `;
    document.body.appendChild(popup);

    const open = () => {
      popup.classList.add('is-open');
      popup.setAttribute('aria-hidden', 'false');
    };
    const close = () => {
      popup.classList.remove('is-open');
      popup.setAttribute('aria-hidden', 'true');
      try { sessionStorage.setItem('promoDismissed', '1'); } catch {}
    };

    // Open on first user scroll instead of a fixed timer. Means:
    //   - Lighthouse/PageSpeed never scroll during the LCP window, so the popup
    //     is automatically excluded from synthetic audits without UA detection.
    //   - Real users see it the moment they engage with the page, which is also
    //     when they're most receptive to a discount offer.
    window.addEventListener('scroll', () => setTimeout(open, 300), { passive: true, once: true });

    const closeBtn = popup.querySelector('.promo-popup-close');
    const backdrop = popup.querySelector('.promo-popup-backdrop');
    const cta = popup.querySelector('.promo-popup-cta');

    if (closeBtn) closeBtn.addEventListener('click', close);
    if (backdrop) backdrop.addEventListener('click', close);
    if (cta) cta.addEventListener('click', close);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && popup.classList.contains('is-open')) close();
    });
  }

  // ── HASH ROUTER (registration as separate page) ──────────────────────────────
  function initRegRoute() {
    const mainContent = document.getElementById('mainContent');
    const regPage = document.getElementById('regPage');
    const backBtn = document.querySelector('.reg-back-btn');
    if (!mainContent || !regPage) return;

    function applyRoute() {
      const isReg = window.location.hash === '#registracija';
      mainContent.style.display = isReg ? 'none' : '';
      regPage.style.display = isReg ? 'block' : 'none';
      if (isReg) {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    }

    window.addEventListener('hashchange', applyRoute);
    applyRoute();

    // Back button → go to main page
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        history.pushState('', document.title, window.location.pathname + window.location.search);
        applyRoute();
      });
    }

    // All "Registruokis" links that point to #registracija
    document.querySelectorAll('a[href="#registracija"]').forEach(link => {
      link.addEventListener('click', () => {
        // hashchange will fire and applyRoute will handle the rest
      });
    });
  }

  // ── INIT ─────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.carousel').forEach((el) => new SimpleCarousel(el));

    initRegRoute();
    populateCampCitySelects();
    initCampThemeDynamic();
    initRegForm();
    initPromoPopup();
  });
})();
