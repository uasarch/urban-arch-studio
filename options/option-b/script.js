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

/* ---------- Projects: index (projects.html) and single project (project.html?p=...) ---------- */
if (window.PROJECTS) {
  const LABELS = { architecture: 'Architecture', interior: 'Interior Design', landscape: 'Landscape' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const startYear = p => (String(p.year).match(/\d{4}/) || [''])[0];
  const pad = n => String(n).padStart(2, '0');

  // Each project gets a stable web address from its title
  const seen = {};
  PROJECTS.forEach(p => { let id = slug(p.title); if (seen[id]) id += '-' + p.category; seen[id] = 1; p.id = id; });
  const href = p => `project.html?p=${p.id}`;
  const card = p => `
    <a class="pj reveal" href="${href(p)}">
      <div class="pj-media"><img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy"></div>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.location)}</p>
    </a>`;

  // Lightbox (project page)
  const lb = document.getElementById('lightbox');
  let lbOpen = () => {};
  if (lb) {
    const lbImg = lb.querySelector('img'), lbCap = lb.querySelector('figcaption');
    let list = [], title = '', at = 0;
    const draw = () => { lbImg.src = list[at]; lbImg.alt = title; lbCap.textContent = `${title} — ${pad(at + 1)} / ${pad(list.length)}`; };
    const step = s => { at = (at + s + list.length) % list.length; draw(); };
    const close = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
    lbOpen = (images, t, i) => { list = images; title = t; at = i; draw(); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; };
    lb.querySelector('.prev').addEventListener('click', () => step(-1));
    lb.querySelector('.next').addEventListener('click', () => step(1));
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
  }

  /* Index: grid + "Browse by" switch.
     Links: projects.html#architecture (home page tiles), #status=completed, #location=mumbai, #year=2023 ... */
  const grid = document.getElementById('projectGrid');
  if (grid) {
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

    grid.innerHTML = PROJECTS.map(card).join('');
    observeReveals(grid);
    const cards = [...grid.querySelectorAll('.pj')];
    const dimsEl = document.getElementById('dims');
    const filtersEl = document.getElementById('filters');
    const noResults = document.getElementById('noResults');
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
      cards.forEach((c, i) => {
        const hide = value !== 'all' && slug(dim.get(PROJECTS[i]) || '') !== value;
        c.classList.toggle('hidden', hide);
        if (!hide) { c.classList.add('visible'); shown++; }
      });
      noResults.hidden = shown > 0;
    };
    const setHash = () => history.replaceState(null, '', value === 'all'
      ? location.pathname + (dim === DIMS[0] ? '' : `#${dim.key}`)
      : `#${dim.key}=${value}`);

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

  /* Single project page */
  const view = document.getElementById('projectView');
  if (view) {
    const i = PROJECTS.findIndex(p => p.id === new URLSearchParams(location.search).get('p'));
    if (i < 0) {
      view.innerHTML = `<section class="container pv-missing"><h1>Project not found</h1><a class="btn" href="projects.html">See all projects</a></section>`;
    } else {
      const p = PROJECTS[i], N = PROJECTS.length, n = p.images.length;
      const prev = PROJECTS[(i - 1 + N) % N], next = PROJECTS[(i + 1) % N];
      const typeLink = `projects.html#type=${slug(LABELS[p.category])}`;
      const related = [];
      for (let k = 1; k < N && related.length < 3; k++) {
        const q = PROJECTS[(i + k) % N];
        if (q.category === p.category) related.push(q);
      }
      const FACTS = [['Client', 'client'], ['Typology', 'type'], ['Sector', 'sector'], ['Size', 'area'], ['Location', 'location'], ['Year', 'year'], ['Status', 'status'], ['Scope', 'scope']];
      document.title = `${p.title} — Urban Arch Studio`;

      view.innerHTML = `
        <p class="container crumbs pv-crumbs"><a href="projects.html">Projects</a> / <a href="${typeLink}">${LABELS[p.category]}</a></p>
        <figure class="pv-hero"><img src="${esc(p.images[0])}" alt="${esc(p.title)}" data-i="0"></figure>
        <section class="container pv-intro">
          <div class="pv-title">
            <p class="eyebrow">${LABELS[p.category]}</p>
            <h1>${esc(p.title)}</h1>
            <p class="pv-sub">${esc(p.location)}<br>${esc(p.year)}</p>
          </div>
          <dl class="pv-facts">
            ${FACTS.filter(([, k]) => p[k]).map(([l, k]) => `<div><dt>${l}</dt><dd>${esc(p[k])}</dd></div>`).join('')}
          </dl>
        </section>
        ${n > 1 ? `<section class="container pv-gallery">
          ${p.images.slice(1).map((src, k) => `
            <figure class="reveal"><img src="${esc(src)}" alt="${esc(p.title)} — image ${k + 2}" loading="lazy" data-i="${k + 1}">
              <figcaption>${pad(k + 2)} / ${pad(n)}</figcaption></figure>`).join('')}
        </section>` : ''}
        <nav class="container pv-pager" aria-label="More projects">
          <a class="prev" href="${href(prev)}"><span>Previous project</span><strong>${esc(prev.title)}</strong></a>
          <a class="all" href="projects.html">All projects</a>
          <a class="next" href="${href(next)}"><span>Next project</span><strong>${esc(next.title)}</strong></a>
        </nav>
        ${related.length ? `<section class="container pv-related">
          <h2>More ${LABELS[p.category]}</h2>
          <div class="project-grid">${related.map(card).join('')}</div>
        </section>` : ''}`;

      observeReveals(view);
      view.addEventListener('click', e => {
        const img = e.target.closest('img[data-i]');
        if (img) lbOpen(p.images, p.title, +img.dataset.i);
      });
    }
  }
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
