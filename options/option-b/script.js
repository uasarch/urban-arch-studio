const STUDIO_EMAIL = 'utkarsh@urbanarchstudio.co.in';

// Footer year
document.querySelectorAll('.year').forEach(el => (el.textContent = new Date().getFullYear()));

// Light / dark switch (remembers the choice; otherwise follows the device setting)
const themeBtn = document.querySelector('.theme-toggle');
if (themeBtn) {
  const root = document.documentElement;
  const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.getAttribute('data-theme') || (mqDark.matches ? 'dark' : 'light')) === 'dark';
  const sync = () => {
    const d = isDark();
    themeBtn.setAttribute('aria-pressed', d);
    themeBtn.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode');
    themeBtn.innerHTML = `<i class="fa-solid fa-${d ? 'sun' : 'moon'}"></i>`;
  };
  themeBtn.addEventListener('click', () => {
    const t = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('uas-theme', t); } catch (e) { /* private mode */ }
    sync();
  });
  mqDark.addEventListener('change', sync);
  sync();
}

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
  const setURL = u => { try { history.replaceState(null, '', u); } catch (e) { /* ignore */ } };

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
      <h3><span>${esc(p.title)}</span></h3>
      <p>${esc(p.location)} · ${startYear(p)}</p>
    </a>`;
  }).join('');
  observeReveals(grid);
  const cards = [...grid.querySelectorAll('.pj')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Click: the thumbnail flies into place as the first big photo of the opened project */
  let flight = null;
  const endFlight = () => {
    if (!flight) return;
    cancelAnimationFrame(flight.raf);
    flight.ghost.remove();
    flight.target.classList.remove('pd-landing');
    flight = null;
  };
  const fly = card => {
    endFlight();
    const src = card.querySelector('.pj-media img');
    const target = panel.querySelector('.pd-strip img');
    if (reduceMotion.matches || !src || !target || !src.complete || !src.naturalWidth) return;
    const from = src.closest('.pj-media').getBoundingClientRect();
    const ratio = src.naturalWidth / src.naturalHeight;
    const ghost = new Image();
    ghost.src = src.currentSrc || src.src;
    ghost.className = 'pj-fly';
    ghost.alt = '';
    document.body.appendChild(ghost);
    target.classList.add('pd-flown', 'pd-landing');
    const dur = 900, t0 = performance.now();
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const lerp = (a, b, e) => a + (b - a) * e;
    flight = { ghost, target, raf: 0 };
    const step = now => {
      const t = Math.min(1, (now - t0) / dur), e = ease(t);
      const r = target.getBoundingClientRect(); // follows the page while it scrolls to the panel
      const w = r.width || from.width, h = r.height || from.width / ratio;
      ghost.style.left = `${lerp(from.left, r.left, e)}px`;
      ghost.style.top = `${lerp(from.top, r.top, e)}px`;
      ghost.style.width = `${lerp(from.width, w, e)}px`;
      ghost.style.height = `${lerp(from.height, h, e)}px`;
      if (t < 1) { flight.raf = requestAnimationFrame(step); return; }
      target.classList.remove('pd-landing');
      flight = null;
      ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220 }).onfinish = () => ghost.remove();
    };
    step(t0);
  };

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
  const syncHeight = () => {
    const img = photos()[current()];
    if (img && img.offsetHeight) panel.style.setProperty('--ph', `${img.offsetHeight}px`);
  };
  const updateCount = () => { panel.querySelector('.pd-count').textContent = `${pad(current() + 1)} / ${pad(photos().length)}`; };
  const goPhoto = step => {
    strip().classList.remove('settling');
    const imgs = photos(), j = Math.max(0, Math.min(imgs.length - 1, current() + step));
    strip().scrollTo({ left: imgs[j].offsetLeft, behavior: 'smooth' });
  };

  const open = (i, scroll = true) => {
    const card = cards.find(c => +c.dataset.index === i);
    if (!card || card.classList.contains('hidden')) return;
    const p = PROJECTS[i];
    cards.forEach(c => c.classList.toggle('active', c === card));
    openIndex = i;
    // size the first photo from the thumbnail straight away, so it lays out whole before it loads
    const th = card.querySelector('.pj-media img');
    const firstSize = th && th.naturalWidth ? ` width="${th.naturalWidth}" height="${th.naturalHeight}"` : '';
    panel.innerHTML = `
      <div class="pd-info">
        <button class="pd-close" aria-label="Close project" style="--d:4"><i class="fa-solid fa-xmark"></i></button>
        <p class="eyebrow" style="--d:0">${LABELS[p.category]}</p>
        <h2 style="--d:1">${esc(p.title)}</h2>
        <p class="pd-sub" style="--d:2">${esc(p.location)}<br>${esc(p.year)}</p>
        <dl class="pd-facts" style="--d:3">
          ${FACTS.filter(([, k]) => p[k]).map(([l, k], n) => `<div style="--d:${n + 3}"><dt>${l}</dt><dd>${esc(p[k])}</dd></div>`).join('')}
        </dl>
        ${p.images.length > 1 ? `
        <div class="pd-nav" style="--d:9">
          <button class="pd-arrow prev" aria-label="Previous photo"><i class="fa-solid fa-arrow-left"></i></button>
          <span class="pd-count">01 / ${pad(p.images.length)}</span>
          <button class="pd-arrow next" aria-label="Next photo"><i class="fa-solid fa-arrow-right"></i></button>
        </div>` : ''}
      </div>
      <div class="pd-strip" tabindex="0" aria-label="Photos of ${esc(p.title)}">
        ${p.images.map((src, k) => `<img src="${esc(src)}" alt="${esc(p.title)} — photo ${k + 1}" data-i="${k}"${k === 0 ? firstSize : ''} style="--d:${Math.min(k, 5)}">`).join('')}
      </div>`;
    place();
    if (p.images.length > 1) strip().addEventListener('scroll', updateCount, { passive: true });
    // While photos are still loading (and have no width yet), hold the strip at the first photo,
    // otherwise the browser can snap to the second photo and push the first one off to the side.
    const s = strip(), imgs = photos();
    s.classList.add('settling');
    const unsettle = () => s.classList.remove('settling');
    const settle = () => {
      if (!s.classList.contains('settling')) return;
      s.scrollLeft = 0;
      if (imgs.every(img => img.complete)) unsettle();
    };
    imgs.forEach(img => { if (!img.complete) { img.addEventListener('load', settle); img.addEventListener('error', settle); } });
    panel.style.removeProperty('--ph');
    imgs.forEach(img => img.addEventListener('load', syncHeight));
    s.addEventListener('scroll', syncHeight, { passive: true });
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(ev => s.addEventListener(ev, unsettle, { passive: true, once: true }));
    settle();
    syncHeight();
    setURL(`${location.pathname}#p=${p.id}`);
    if (scroll) {
      fly(card);
      requestAnimationFrame(() => panel.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' }));
    }
  };
  // Closing folds the panel shut (a copy collapses while the real one is removed straight away)
  const collapse = () => {
    if (reduceMotion.matches || !panel.isConnected) return panel.remove();
    const h = panel.offsetHeight;
    const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
    const g = panel.cloneNode(true);
    g.classList.add('pd-leaving');
    g.setAttribute('aria-hidden', 'true');
    g.inert = true;
    panel.replaceWith(g);
    g.animate(
      [{ height: `${h}px`, opacity: 1 }, { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px', marginBottom: `${-gap}px` }],
      { duration: 520, easing: 'cubic-bezier(.65, 0, .35, 1)' }
    ).onfinish = () => g.remove();
  };
  const close = (keepHash = false) => {
    if (openIndex === null) return;
    const card = cards.find(c => +c.dataset.index === openIndex);
    endFlight();
    if (keepHash) panel.remove(); else collapse();
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
  // Mouse wheel over the photos moves between photos (one per scroll); over the text it scrolls the page.
  // At the first / last photo the wheel goes back to scrolling the page.
  let wheelLock = 0;
  panel.addEventListener('wheel', e => {
    if (!e.target.closest('.pd-strip') || e.ctrlKey) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // sideways trackpad swipe: leave it to the browser
    const dir = Math.sign(e.deltaY);
    if (!dir) return;
    const now = performance.now();
    if (now < wheelLock) { e.preventDefault(); return; } // let the previous step finish
    const i = current(), last = photos().length - 1;
    if ((dir < 0 && i === 0) || (dir > 0 && i === last)) return;
    e.preventDefault();
    wheelLock = now + 550;
    goPhoto(dir);
  }, { passive: false });
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
    resizeTimer = setTimeout(() => { if (openIndex !== null) { place(); syncHeight(); } }, 150);
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
    setURL(value === 'all'
      ? location.pathname + (dim === DIMS[0] ? '' : `#${dim.key}`)
      : `${location.pathname}#${dim.key}=${value}`);
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
