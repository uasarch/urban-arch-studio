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

/* ---------- Projects page: newest first; a project opens in place below its row ---------- */
const grid = document.getElementById('projectGrid');
if (grid && window.PROJECTS) {
  const LABELS = { architecture: 'Architecture', interior: 'Interior Design', landscape: 'Landscape' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const startYear = p => (String(p.year).match(/\d{4}/) || [''])[0];
  const endYear = p => /ongoing/i.test(p.year) ? 9999 : +(String(p.year).match(/\d{4}/g) || ['0']).pop();
  const pad = n => String(n).padStart(2, '0');

  // Each project gets a link of its own: projects.html#p=<project-name>
  const seen = {};
  PROJECTS.forEach(p => { let id = slug(p.title); if (seen[id]) id += '-' + p.category; seen[id] = 1; p.id = id; });

  // Newest first (by start year, then ongoing / later finish first)
  const order = PROJECTS.map((_, i) => i).sort((a, b) =>
    (startYear(PROJECTS[b]) - startYear(PROJECTS[a])) || (endYear(PROJECTS[b]) - endYear(PROJECTS[a])) || a - b);

  grid.innerHTML = order.map(i => {
    const p = PROJECTS[i];
    return `
    <a class="pj reveal" href="#p=${p.id}" data-index="${i}">
      <div class="pj-media"><img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy"></div>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.location)} · ${startYear(p)}</p>
    </a>`;
  }).join('');
  observeReveals(grid);
  const cards = [...grid.querySelectorAll('.pj')];

  /* Lightbox */
  const lb = document.getElementById('lightbox');
  const lbImg = lb.querySelector('img'), lbCap = lb.querySelector('figcaption');
  let lbList = [], lbTitle = '', lbAt = 0;
  const lbDraw = () => { lbImg.src = lbList[lbAt]; lbImg.alt = lbTitle; lbCap.textContent = `${lbTitle} — ${pad(lbAt + 1)} / ${pad(lbList.length)}`; };
  const lbStep = s => { lbAt = (lbAt + s + lbList.length) % lbList.length; lbDraw(); };
  const lbClose = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; };
  const lbOpen = (images, t, i) => { lbList = images; lbTitle = t; lbAt = i; lbDraw(); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; };
  lb.querySelector('.prev').addEventListener('click', () => lbStep(-1));
  lb.querySelector('.next').addEventListener('click', () => lbStep(1));
  lb.querySelector('.lb-close').addEventListener('click', lbClose);
  lb.addEventListener('click', e => { if (e.target === lb) lbClose(); });

  /* Open project panel */
  const FACTS = [['Client', 'client'], ['Typology', 'type'], ['Sector', 'sector'], ['Size', 'area'], ['Status', 'status'], ['Scope', 'scope']];
  const panel = document.createElement('section');
  panel.className = 'pd';
  let openIndex = null;

  const rowEnd = card => {
    // last visible card on the same row as `card`
    let last = card;
    cards.forEach(c => { if (!c.classList.contains('hidden') && c.offsetTop === card.offsetTop) last = c; });
    return last;
  };
  const place = () => {
    const card = cards.find(c => +c.dataset.index === openIndex);
    panel.remove();
    rowEnd(card).after(panel);
  };
  const strip = () => panel.querySelector('.pd-strip');
  const photos = () => [...panel.querySelectorAll('.pd-strip img')];
  const current = () => {
    const s = strip(), imgs = photos();
    if (s.scrollLeft + s.clientWidth >= s.scrollWidth - 4) return imgs.length - 1;
    let best = 0;
    imgs.forEach((img, k) => { if (Math.abs(img.offsetLeft - s.scrollLeft) < Math.abs(imgs[best].offsetLeft - s.scrollLeft)) best = k; });
    return best;
  };
  const updateCount = () => { panel.querySelector('.pd-count').textContent = `${pad(current() + 1)} / ${pad(photos().length)}`; };
  const goPhoto = step => {
    const imgs = photos(), j = Math.max(0, Math.min(imgs.length - 1, current() + step));
    strip().scrollTo({ left: imgs[j].offsetLeft, behavior: 'smooth' });
  };

  const open = (i, scroll = true) => {
    const card = cards.find(c => +c.dataset.index === i);
    if (!card || card.classList.contains('hidden')) return;
    const p = PROJECTS[i];
    cards.forEach(c => c.classList.toggle('active', c === card));
    openIndex = i;
    panel.innerHTML = `
      <div class="pd-info">
        <button class="pd-close" aria-label="Close project"><i class="fa-solid fa-xmark"></i></button>
        <p class="eyebrow">${LABELS[p.category]}</p>
        <h2>${esc(p.title)}</h2>
        <p class="pd-sub">${esc(p.location)}<br>${esc(p.year)}</p>
        <dl class="pd-facts">
          ${FACTS.filter(([, k]) => p[k]).map(([l, k]) => `<div><dt>${l}</dt><dd>${esc(p[k])}</dd></div>`).join('')}
        </dl>
        ${p.images.length > 1 ? `
        <div class="pd-nav">
          <button class="pd-arrow prev" aria-label="Previous photo"><i class="fa-solid fa-arrow-left"></i></button>
          <span class="pd-count">01 / ${pad(p.images.length)}</span>
          <button class="pd-arrow next" aria-label="Next photo"><i class="fa-solid fa-arrow-right"></i></button>
        </div>` : ''}
      </div>
      <div class="pd-strip" tabindex="0" aria-label="Photos of ${esc(p.title)}">
        ${p.images.map((src, k) => `<img src="${esc(src)}" alt="${esc(p.title)} — photo ${k + 1}" data-i="${k}">`).join('')}
      </div>`;
    place();
    if (p.images.length > 1) strip().addEventListener('scroll', updateCount, { passive: true });
    history.replaceState(null, '', `#p=${p.id}`);
    if (scroll) requestAnimationFrame(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const close = (keepHash = false) => {
    if (openIndex === null) return;
    const card = cards.find(c => +c.dataset.index === openIndex);
    panel.remove();
    cards.forEach(c => c.classList.remove('active'));
    openIndex = null;
    if (!keepHash) { setHash(); card.focus({ preventScroll: true }); }
  };

  grid.addEventListener('click', e => {
    const card = e.target.closest('.pj');
    if (card) {
      e.preventDefault();
      const i = +card.dataset.index;
      if (i === openIndex) close(); else open(i);
      return;
    }
    if (e.target.closest('.pd-close')) return close();
    if (e.target.closest('.pd-arrow')) return goPhoto(e.target.closest('.prev') ? -1 : 1);
    const img = e.target.closest('.pd-strip img');
    if (img) lbOpen(PROJECTS[openIndex].images, PROJECTS[openIndex].title, +img.dataset.i);
  });
  panel.addEventListener('keydown', e => {
    if (!e.target.closest('.pd-strip')) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); goPhoto(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); goPhoto(-1); }
  });
  document.addEventListener('keydown', e => {
    if (lb.classList.contains('open')) {
      if (e.key === 'Escape') lbClose();
      if (e.key === 'ArrowLeft') lbStep(-1);
      if (e.key === 'ArrowRight') lbStep(1);
    } else if (e.key === 'Escape') close();
  });
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (openIndex !== null) place(); }, 150);
  });

  /* "Browse by" switch.
     Links: #architecture (home page tiles), #status=completed, #location=mumbai, #year=2023, #p=<project> */
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
  let dim = DIMS[0], value = 'all';
  dimsEl.innerHTML = DIMS.map(d => `<button class="dim" role="tab" data-dim="${d.key}">${esc(d.label)}</button>`).join('');

  const render = () => {
    close(true);
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
  function setHash() {
    history.replaceState(null, '', value === 'all'
      ? location.pathname + (dim === DIMS[0] ? '' : `#${dim.key}`)
      : `#${dim.key}=${value}`);
  }

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
    if (k === 'p') {
      const i = PROJECTS.findIndex(p => p.id === v);
      if (i < 0) return render();
      if (cards[0] && cards.find(c => +c.dataset.index === i).classList.contains('hidden')) { dim = DIMS[0]; value = 'all'; render(); }
      return open(i);
    }
    if (LABELS[k]) { dim = DIMS[0]; value = slug(LABELS[k]); }
    else if (DIMS.some(d => d.key === k)) { dim = DIMS.find(d => d.key === k); value = v || 'all'; }
    render();
  };
  window.addEventListener('hashchange', fromHash);
  render();
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
