const STUDIO_EMAIL = 'utkarsh@urbanarchstudio.co.in';

// Footer year
document.querySelectorAll('.year').forEach(el => (el.textContent = new Date().getFullYear()));

// Nav shadow on scroll
const nav = document.querySelector('.nav');
const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Mobile menu
const toggle = document.querySelector('.nav-toggle');
const links = document.querySelector('.nav-links');
toggle.addEventListener('click', () => {
  const open = links.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});

// Reveal on scroll
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
  });
}, { threshold: 0.12 });
const observeReveals = root => root.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
observeReveals(document);

const loadImg = img => { if (img && img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); } };

/* ---------- Home hero slider ---------- */
const hero = document.querySelector('.hero');
if (hero) {
  const mq = window.matchMedia('(max-width: 760px)');
  const dots = hero.querySelector('.hero-dots');
  let timer, index = 0;
  const slider = () => hero.querySelector(`.hero-slider[data-set="${mq.matches ? 'mobile' : 'desktop'}"]`);
  const slides = () => [...slider().querySelectorAll('img')];

  const render = () => {
    const s = slides();
    s.forEach((img, i) => img.classList.toggle('active', i === index));
    loadImg(s[index]);
    loadImg(s[(index + 1) % s.length]); // preload next
    dots.innerHTML = s.map((_, i) => `<span class="${i === index ? 'active' : ''}"></span>`).join('');
  };
  const go = step => { const n = slides().length; index = (index + step + n) % n; render(); restart(); };
  const restart = () => { clearInterval(timer); timer = setInterval(() => go(1), 5000); };

  hero.querySelector('.prev').addEventListener('click', () => go(-1));
  hero.querySelector('.next').addEventListener('click', () => go(1));
  mq.addEventListener('change', () => { index = 0; render(); });

  // swipe
  let x0 = null;
  hero.addEventListener('touchstart', e => (x0 = e.touches[0].clientX), { passive: true });
  hero.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    x0 = null;
  });

  render();
  restart();
}

/* ---------- Projects page ---------- */
const grid = document.getElementById('projectGrid');
if (grid && window.PROJECTS) {
  const LABELS = { architecture: 'Architecture', interior: 'Interior Design', landscape: 'Landscape' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const FIELDS = [['Client', 'client'], ['Type', 'type'], ['Year', 'year'], ['Area', 'area'], ['Location', 'location'], ['Status', 'status'], ['Scope', 'scope']];

  grid.innerHTML = PROJECTS.map((p, i) => `
    <article class="project-card reveal" data-cat="${p.category}" data-index="${i}">
      <div class="pc-media">
        <img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy">
        ${p.images.length > 1 ? `
          <button class="pc-btn prev" aria-label="Previous image"><i class="fa-solid fa-chevron-left"></i></button>
          <button class="pc-btn next" aria-label="Next image"><i class="fa-solid fa-chevron-right"></i></button>
          <span class="pc-count">1 / ${p.images.length}</span>` : ''}
      </div>
      <div class="pc-body">
        <h3>${esc(p.title)}</h3>
        <span class="pc-tag">${LABELS[p.category] || ''}</span>
        <dl class="pc-meta">
          ${FIELDS.filter(([, k]) => p[k]).map(([l, k]) => `<dt>${l}</dt><dd>${esc(p[k])}</dd>`).join('')}
        </dl>
      </div>
    </article>`).join('');
  observeReveals(grid);

  // Per-card slider
  const pos = new Map();
  const show = (card, step) => {
    const p = PROJECTS[card.dataset.index];
    const n = p.images.length;
    const i = ((pos.get(card) || 0) + step + n) % n;
    pos.set(card, i);
    card.querySelector('.pc-media img').src = p.images[i];
    const c = card.querySelector('.pc-count');
    if (c) c.textContent = `${i + 1} / ${n}`;
  };

  // Lightbox
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('img');
  const lbCap = lb.querySelector('figcaption');
  let lbProject = null, lbIndex = 0;
  const lbRender = () => {
    const p = PROJECTS[lbProject];
    lbImg.src = p.images[lbIndex];
    lbImg.alt = p.title;
    lbCap.textContent = `${p.title} — ${lbIndex + 1} / ${p.images.length}`;
  };
  const lbOpen = (pi, ii) => { lbProject = pi; lbIndex = ii; lbRender(); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; };
  const lbClose = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
  const lbStep = s => { const n = PROJECTS[lbProject].images.length; lbIndex = (lbIndex + s + n) % n; lbRender(); };
  lb.querySelector('.prev').addEventListener('click', () => lbStep(-1));
  lb.querySelector('.next').addEventListener('click', () => lbStep(1));
  lb.querySelector('.lb-close').addEventListener('click', lbClose);
  lb.addEventListener('click', e => { if (e.target === lb) lbClose(); });
  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') lbClose();
    if (e.key === 'ArrowLeft') lbStep(-1);
    if (e.key === 'ArrowRight') lbStep(1);
  });

  grid.addEventListener('click', e => {
    const card = e.target.closest('.project-card');
    if (!card) return;
    if (e.target.closest('.pc-btn')) { show(card, e.target.closest('.prev') ? -1 : 1); return; }
    if (e.target.closest('.pc-media')) lbOpen(+card.dataset.index, pos.get(card) || 0);
  });

  // Browse by: switch between groupings, then pick one option in that grouping.
  // Supports links like projects.html#architecture (from the home page) and #status=completed.
  const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const startYear = p => (String(p.year).match(/\d{4}/) || [''])[0];
  const DIMS = [
    { key: 'type', label: 'Type', get: p => LABELS[p.category], order: Object.values(LABELS) },
    { key: 'sector', label: 'Residential / Commercial', get: p => p.sector, order: ['Residential', 'Commercial', 'Public & Institutional'] },
    { key: 'status', label: 'Status', get: p => p.status, order: ['Completed', 'Ongoing', 'Proposed', 'Architecture Competition'] },
    { key: 'location', label: 'Location', get: p => p.region, order: ['Ranchi', 'Mumbai', 'Rest of Jharkhand', 'Rest of India', 'International'] },
    { key: 'year', label: 'Year', get: startYear, sort: (a, b) => b.localeCompare(a) }
  ];
  DIMS.forEach(d => {
    const vals = [...new Set(PROJECTS.map(d.get).filter(Boolean))];
    d.values = d.sort ? vals.sort(d.sort)
      : [...d.order.filter(v => vals.includes(v)), ...vals.filter(v => !d.order.includes(v))];
  });

  const dimsEl = document.getElementById('dims');
  const filtersEl = document.getElementById('filters');
  const noResults = document.getElementById('noResults');
  const cards = [...grid.querySelectorAll('.project-card')];
  let dim = DIMS[0], value = 'all';

  dimsEl.innerHTML = DIMS.map(d => `<button class="dim" role="tab" data-dim="${d.key}">${esc(d.label)}</button>`).join('');

  const render = () => {
    dimsEl.querySelectorAll('.dim').forEach(b => {
      const on = b.dataset.dim === dim.key;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    filtersEl.innerHTML = [['all', 'All'], ...dim.values.map(v => [slug(v), v])]
      .map(([v, l]) => `<button class="filter${v === value ? ' active' : ''}" data-filter="${v}">${esc(l)}</button>`).join('');
    let shown = 0;
    cards.forEach(c => {
      const hide = value !== 'all' && slug(dim.get(PROJECTS[c.dataset.index]) || '') !== value;
      c.classList.toggle('hidden', hide);
      if (!hide) { c.classList.add('visible'); shown++; }
    });
    noResults.hidden = shown > 0;
  };
  const setHash = () => history.replaceState(null, '', value === 'all' ? location.pathname + (dim === DIMS[0] ? '' : `#${dim.key}`) : `#${dim.key}=${value}`);

  dimsEl.addEventListener('click', e => {
    const b = e.target.closest('.dim');
    if (!b) return;
    dim = DIMS.find(d => d.key === b.dataset.dim); value = 'all';
    render(); setHash();
  });
  filtersEl.addEventListener('click', e => {
    const b = e.target.closest('.filter');
    if (!b) return;
    value = b.dataset.filter;
    render(); setHash();
  });
  const fromHash = () => {
    const [k, v] = decodeURIComponent(location.hash.slice(1)).toLowerCase().split('=');
    if (LABELS[k]) { dim = DIMS[0]; value = slug(LABELS[k]); }
    else if (DIMS.some(d => d.key === k)) { dim = DIMS.find(d => d.key === k); value = v || 'all'; }
    render();
  };
  window.addEventListener('hashchange', fromHash);
  fromHash();
}

/* ---------- Contact forms (open email app with the message filled in) ---------- */
const mailto = (subject, lines) =>
  `mailto:${STUDIO_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.filter(Boolean).join('\n'))}`;

const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(contactForm));
    const note = contactForm.querySelector('.form-note');
    const endpoint = contactForm.dataset.endpoint;
    if (endpoint) {
      try {
        const r = await fetch(endpoint, { method: 'POST', body: new FormData(contactForm), headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error();
        contactForm.reset();
        note.textContent = 'Thank you — your message has been sent.';
      } catch { note.textContent = `Sorry, something went wrong. Please email us at ${STUDIO_EMAIL}.`; }
      return;
    }
    location.href = mailto(`Website enquiry from ${d['first-name']} ${d['last-name']}`, [
      `Name: ${d['first-name']} ${d['last-name']}`,
      `Email: ${d.email}`,
      d.phone && `Phone: ${d.phone}`,
      '',
      d.message
    ]);
    note.textContent = 'Your email app should open with your message ready to send.';
  });
}

const careerForm = document.getElementById('careerForm');
if (careerForm) {
  careerForm.addEventListener('submit', e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(careerForm));
    location.href = mailto(`Job application: ${d.subject || d['job-type']} — ${d.name}`, [
      `Name: ${d.name}`,
      `Email: ${d.email}`,
      d.phone && `Phone: ${d.phone}`,
      d.experience && `Experience: ${d.experience}`,
      `Job type: ${d['job-type']}`,
      '',
      '(Please attach your CV and portfolio.)'
    ]);
  });
}
