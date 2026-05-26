import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_PATH = resolve(__dirname, 'src/data/content.json');

// ─── HTML escaping ──────────────────────────────────────────────────────────
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Lookup tables ──────────────────────────────────────────────────────────
const CARD_CLASS = {
  bricks4kidz: 'card-bricks4kidz',
  lms: 'card-medical',
  businesskids: 'card-business',
};
const CARD_LABEL = {
  bricks4kidz: 'Bricks4Kidz',
  lms: 'LMS',
  businesskids: 'Business Kids',
};
const SOCIAL = {
  facebook: {
    label: 'Facebook',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  instagram: {
    label: 'Instagram',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
  },
  tiktok: {
    label: 'TikTok',
    path: 'M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z',
  },
};

// ─── Section renderers ──────────────────────────────────────────────────────
function renderHeader(h = {}) {
  const isSteamLogo = String(h.logo || '').endsWith('/STEAM.webp');
  const logoClass = isSteamLogo ? ' header-logo-img--steam' : '';

  return `<header class="header" data-reveal style="--d:0ms">
    <div class="header-inner">
      <a class="header-logo" href="/" aria-label="Top Stovyklos">
        <img src="${esc(h.logo)}" alt="${esc(h.logoAlt)}" class="header-logo-img${logoClass}" width="80" height="80">
      </a>
      <div class="header-tagline">
        <span class="header-tagline-text">${esc(h.tagline)}</span>
        <div class="header-tagline-sub">${esc(h.taglineSub)}</div>
      </div>
      <div class="header-right">
        <a href="tel:${esc(h.phoneHref)}" class="header-phone">${esc(h.phone)}</a>
        <a href="#registracija" class="nav-register">${esc(h.registerLabel)}</a>
      </div>
    </div>
  </header>`;
}

function renderHeroSlide(slide, i) {
  const variant = slide.variant || '';
  const overlayClass = variant ? ` slide-overlay--${esc(variant)}` : '';
  const overlay = `<div class="slide-overlay${overlayClass}"><div class="slide-title">${esc(slide.title)}</div><div class="slide-sub">${esc(slide.subtitle)}</div></div>`;

  if (slide.type === 'collage') {
    const imgs = (slide.images || [])
      .map((im) => `<img src="${esc(im.image)}" alt="${esc(im.alt)}" width="600" height="600" loading="lazy">`)
      .join('');
    return `<a href="${esc(slide.link)}" target="_blank" rel="noreferrer" class="carousel__slide carousel__slide--link">
              <div class="slide-collage-grid slide-collage-grid--3">${imgs}</div>
              ${overlay}
            </a>`;
  }

  const imgClass = `slide-img${variant === 'lms' ? ' slide-img--lms' : ''}`;
  const loadAttr = i === 0 ? 'fetchpriority="high"' : 'loading="lazy"';
  const badges = (slide.badges && slide.badges.length)
    ? `<div class="slide-steam-badges">${slide.badges
        .map((b) => `<img src="${esc(b.image)}" alt="${esc(b.alt)}" width="120" height="120" loading="lazy">`)
        .join('')}</div>`
    : '';
  return `<a href="${esc(slide.link)}" target="_blank" rel="noreferrer" class="carousel__slide carousel__slide--link">
            <img src="${esc(slide.image)}" alt="${esc(slide.alt)}" class="${imgClass}" width="1200" height="800" ${loadAttr}>
            ${overlay}${badges}
          </a>`;
}

function renderHero(slides = []) {
  return slides.map(renderHeroSlide).join('\n            ');
}

function renderCampCard(card, cardIdx) {
  const cardClass = CARD_CLASS[card.brand] || 'card-bricks4kidz';
  const label = CARD_LABEL[card.brand] || card.brand || 'camp';
  const interval = Number(card.interval) || 3000;
  const logoWideClass = card.logoWide ? ' card-logo-overlay--wide' : '';
  const logoW = card.logoWide ? 240 : 160;
  const logoH = card.logoWide ? 80 : 160;

  const slides = (card.images || [])
    .map((im, imgIdx) => {
      const isFirst = cardIdx === 0 && imgIdx === 0;
      const slideClass = im.bg ? ` carousel__slide--${esc(im.bg)}` : '';
      const imgFit = im.fit === 'contain' ? ' slide-img--contain' : '';
      const imgLoad = isFirst ? 'fetchpriority="high"' : 'loading="lazy"';
      const logoLoad = isFirst ? '' : ' loading="lazy"';
      return `<div class="carousel__slide${slideClass}"><img src="${esc(im.src)}" alt="${esc(im.alt)}" class="slide-img${imgFit}" width="600" height="600" ${imgLoad}><img src="${esc(card.logo)}" alt="${esc(card.logoAlt)}" class="card-logo-overlay${logoWideClass}" width="${logoW}" height="${logoH}"${logoLoad}></div>`;
    })
    .join('\n                  ');

  return `<a class="card ${cardClass}" href="${esc(card.link)}" target="_blank" rel="noreferrer">
            <div class="card-title">${esc(card.title)}</div>
            <div class="card-carousel-wrap">
              <div class="carousel carousel--card" data-autoplay="true" data-interval="${interval}" aria-label="${esc(label)} carousel">
                <button class="carousel__btn carousel__btn--prev" aria-label="Previous slide">&#8249;</button>
                <button class="carousel__btn carousel__btn--next" aria-label="Next slide">&#8250;</button>
                <div class="carousel__viewport"><div class="carousel__track">
                  ${slides}
                </div></div>
                <div class="carousel__dots" aria-label="Carousel pagination"></div>
              </div>
            </div>
            <div class="card-hint">${esc(card.hint)}</div>
          </a>`;
}

function renderCampCards(cards = []) {
  return cards.map(renderCampCard).join('\n\n          ');
}

function renderBenefits(b = {}) {
  const pills = (b.pills || [])
    .map((p) => `<span class="bpill bpill-${esc(p.color)}">${esc(p.text)}</span>`)
    .join('\n              ');
  return `<div class="benefits-pills-wrap">
            <div class="benefits-pills-title">${esc(b.title)}</div>
            <div class="benefits-pills">
              ${pills}
            </div>
          </div>`;
}

function renderTestimonialSlide(t, hidden) {
  const hiddenAttr = hidden ? ' aria-hidden="true"' : '';
  return `<div class="testimonial-slide"${hiddenAttr}><div class="testimonial-card"><div class="testimonial-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p class="testimonial-text">"${esc(t.text)}"</p><div class="testimonial-author">— ${esc(t.author)}</div></div></div>`;
}

function renderTestimonials(list = []) {
  const primary = list.map((t) => renderTestimonialSlide(t, false)).join('\n        ');
  // Duplicate set drives the seamless marquee loop (matches original markup).
  const loop = list.map((t) => renderTestimonialSlide(t, true)).join('\n        ');
  return `${primary}\n        ${loop}`;
}

function renderContact(c = {}) {
  return `<div class="contact-horizontal">
        <div class="contact-label">${esc(c.label)}</div>
        <div class="contact-sep"></div>
        <div class="contact-item"><strong>Tel.:</strong> <a href="tel:${esc(c.phoneHref)}">${esc(c.phone)}</a></div>
        <div class="contact-sep"></div>
        <div class="contact-item"><strong>El. paštas:</strong> <a href="mailto:${esc(c.email)}">${esc(c.email)}</a></div>
        <a href="#registracija" class="reg-btn">${esc(c.registerLabel)}</a>
      </div>`;
}

function renderSocialLink(s) {
  const def = SOCIAL[s.platform];
  if (!def) return '';
  return `<a href="${esc(s.url)}" target="_blank" rel="noreferrer" class="brand-social-link"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="${def.path}"/></svg>${def.label}</a>`;
}

function renderBrandsFooter(brands = []) {
  return brands
    .map((b) => {
      const socials = (b.socials || []).map(renderSocialLink).join('\n            ');
      return `<div class="brand-col">
          <a href="${esc(b.link)}" target="_blank" rel="noreferrer" class="brand-logo-link"><img src="${esc(b.logo)}" alt="${esc(b.logoAlt)}" class="brand-logo-img" width="200" height="200" loading="lazy"></a>
          <div class="brand-social-links">
            ${socials}
          </div>
        </div>`;
    })
    .join('\n        ');
}

// ─── Marker injection ───────────────────────────────────────────────────────
function injectContent(html, content) {
  const sections = {
    heroPreload: () =>
      `<link rel="preload" as="image" href="${esc(content.hero?.[0]?.image || '')}" fetchpriority="high">`,
    header: () => renderHeader(content.header),
    heroSlides: () => renderHero(content.hero),
    campCards: () => renderCampCards(content.campCards),
    benefits: () => renderBenefits(content.benefits),
    testimonials: () => renderTestimonials(content.testimonials),
    contact: () => renderContact(content.contact),
    brandsFooter: () => renderBrandsFooter(content.brandsFooter),
  };
  for (const [key, render] of Object.entries(sections)) {
    // Function replacement avoids `$`-pattern interpretation in rendered HTML.
    html = html.replace(`<!--INJECT:${key}-->`, () => render());
  }
  return html;
}

// ─── Vite plugin: render src/data/content.json into index.html ──────────────
// Runs in dev (per request) and build (once), so the served/built HTML stays
// fully static — no client-side rendering, no SEO/LCP regression.
function contentInjectionPlugin() {
  return {
    name: 'topstovyklos-content-injection',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const content = JSON.parse(readFileSync(CONTENT_PATH, 'utf8'));
        return injectContent(html, content);
      },
    },
    handleHotUpdate(ctx) {
      // Editing content.json (e.g. via Sveltia CMS locally) → reload the page.
      if (ctx.file === CONTENT_PATH) {
        ctx.server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  };
}

export default defineConfig({
  build: {
    outDir: 'dist',
  },
  plugins: [contentInjectionPlugin()],
});
