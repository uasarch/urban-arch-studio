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

  const SLIDE_MS = hero.classList.contains('hx') ? 6000 : 5000;
  const pad2 = n => String(n).padStart(2, '0');
  const render = () => {
    const s = slides();
    const was = s.find(img => img.classList.contains('active'));
    s.forEach((img, i) => img.classList.toggle('active', i === index));
    if (was && was !== s[index] && hero.classList.contains('hx')) {
      // keep the old photo fully visible underneath while the new one fades in over it
      s.forEach(img => img.classList.remove('leaving'));
      was.classList.add('leaving');
      clearTimeout(was._leave);
      was._leave = setTimeout(() => was.classList.remove('leaving'), 1900);
    }
    loadImg(s[index]);
    loadImg(s[(index + 1) % s.length]); // preload next
    loadImg(s[(index - 1 + s.length) % s.length]); // and previous, for the back arrow
    if (hero.classList.contains('hx')) {
      // home hero: slide counter + a progress line that fills until the next slide
      hero.querySelector('.hx-now').textContent = pad2(index + 1);
      hero.querySelector('.hx-total').textContent = pad2(s.length);
      dots.style.setProperty('--slide', `${SLIDE_MS}ms`);
      dots.classList.remove('run'); void dots.offsetWidth; dots.classList.add('run');
    } else {
      dots.innerHTML = s.map((_, i) => `<span class="${i === index ? 'active' : ''}"></span>`).join('');
    }
  };
  const go = step => { const n = slides().length; index = (index + step + n) % n; render(); restart(); };
  const restart = () => { clearInterval(timer); timer = setInterval(() => go(1), SLIDE_MS); };

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

  // pinned hero: dim the photo as the next section slides up over it
  if (hero.classList.contains('hx')) {
    let ticking = false;
    const cover = () => {
      ticking = false;
      const p = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight || 1)));
      hero.style.setProperty('--hx-cover', p.toFixed(3));
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(cover); } }, { passive: true });
    cover();
  }

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

  // Pinned projects first ("Pin: 1" to "Pin: 9" in info.txt), then the rest newest first
  // (by start year, then ongoing / later finish first)
  const pin = p => +p.pin > 0 ? +p.pin : Infinity;
  const order = PROJECTS.map((_, i) => i).sort((a, b) =>
    (pin(PROJECTS[a]) - pin(PROJECTS[b]) || 0) ||
    (startYear(PROJECTS[b]) - startYear(PROJECTS[a])) || (endYear(PROJECTS[b]) - endYear(PROJECTS[a])) || a - b);

  grid.innerHTML = order.map(i => {
    const p = PROJECTS[i];
    return `
    <a class="pj reveal" href="#p=${p.id}" data-index="${i}">
      <div class="pj-media" style="--src:url('${esc(p.images[0])}')"><img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="lazy"></div>
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
    // the photo sits whole inside the fixed frame, so start from the photo's own box
    const box = src.getBoundingClientRect();
    const ratio = src.naturalWidth / src.naturalHeight;
    const fw = Math.min(box.width, box.height * ratio), fh = fw / ratio;
    const from = { left: box.left + (box.width - fw) / 2, top: box.top + (box.height - fh) / 2, width: fw, height: fh };
    const ghost = new Image();
    ghost.src = src.currentSrc || src.src;
    ghost.className = 'pj-fly';
    ghost.alt = '';
    // the ghost keeps the thumbnail's size and only moves / scales (smooth on phones)
    ghost.style.width = `${from.width}px`;
    ghost.style.height = `${from.height}px`;
    ghost.style.transform = `translate3d(${from.left}px, ${from.top}px, 0)`;
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
      const sx = lerp(1, w / from.width, e), sy = lerp(1, h / from.height, e);
      ghost.style.transform = `translate3d(${lerp(from.left, r.left, e)}px, ${lerp(from.top, r.top, e)}px, 0) scale(${sx}, ${sy})`;
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
  // Put the panel after the last card of the open project's row. It is only moved when its spot
  // really changes: moving it restarts its opening animation and resets the photo strip.
  const place = () => {
    const card = cards.find(c => +c.dataset.index === openIndex);
    const end = rowEnd(card);
    if (panel.isConnected && panel.previousElementSibling === end) return;
    end.after(panel);
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
    // Switching projects can take the panel out from above the tapped card; keep that card
    // where it is on screen instead of letting the page jump up under the finger.
    const cardTop = card.getBoundingClientRect().top;
    panel.remove(); // re-inserted below, which replays the opening animation for the new project
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
    const shift = card.getBoundingClientRect().top - cardTop;
    if (Math.abs(shift) > 1) window.scrollBy({ top: shift, behavior: 'instant' });
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
  // On phones the address bar showing / hiding while scrolling fires "resize" with only the
  // height changed; the rows don't change then, so leave the open panel alone.
  let resizeTimer, lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
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

/* ---------- Home page motion ---------- */
const home = document.querySelector('main.home');
if (home) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const P = window.PROJECTS || [];

  /* Text lines and image wipes play once as they come into view */
  // Image wipes wait until their photo has loaded, so they never reveal an empty box
  const reveal = el => {
    const img = el.classList.contains('rv-clip') && el.querySelector('img');
    if (img && !img.complete) {
      const go = () => el.classList.add('in');
      img.addEventListener('load', go, { once: true });
      img.addEventListener('error', go, { once: true });
    } else el.classList.add('in');
  };
  // A wiped photo starts fully clipped, and browsers then treat it as invisible, so we watch the
  // block that holds it (always visible) and reveal the photo when that block comes into view.
  const watchFor = new Map();
  const inObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      (watchFor.get(e.target) || []).forEach(reveal);
      inObserver.unobserve(e.target);
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
  home.querySelectorAll('.lines, .rv-clip').forEach(el => {
    if (el.closest('.hx')) return;
    const target = el.classList.contains('rv-clip') ? (el.closest('.person, .firm-grid') || el.parentElement) : el;
    if (!watchFor.has(target)) { watchFor.set(target, []); inObserver.observe(target); }
    watchFor.get(target).push(el);
  });
  // hero text slides in as soon as the page is ready
  requestAnimationFrame(() => setTimeout(() => home.querySelectorAll('.hx .lines').forEach(el => el.classList.add('in')), 150));

  /* Statement: split into words that light up with scrolling */
  const words = home.querySelector('[data-words]');
  let wordEls = [];
  if (words) {
    words.innerHTML = words.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
    wordEls = [...words.querySelectorAll('.w')];
  }

  /* Selected work: the 6 pinned projects ("Pin: 1" to "Pin: 6" in info.txt), topped up with the newest if fewer are pinned */
  const work = home.querySelector('.work');
  const track = document.getElementById('workTrack');
  const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const startYear = p => +((String(p.year).match(/\d{4}/) || ['0'])[0]);
  const endYear = p => /ongoing/i.test(p.year) ? 9999 : +(String(p.year).match(/\d{4}/g) || ['0']).pop();
  const seen = {};
  P.forEach(p => { let id = slug(p.title); if (seen[id]) id += '-' + p.category; seen[id] = 1; p._id = id; });
  if (track && P.length) {
    const byNew = P.map((p, i) => [p, i]).sort((a, b) =>
      (startYear(b[0]) - startYear(a[0])) || (endYear(b[0]) - endYear(a[0])) || a[1] - b[1]).map(x => x[0]);
    const SHOW = 6;
    const pinned = P.filter(p => +p.pin > 0).sort((a, b) => +a.pin - +b.pin);
    const rest = [...byNew.filter(p => p.images.length > 1), ...byNew.filter(p => p.images.length <= 1)].filter(p => !pinned.includes(p));
    const pick = [...pinned, ...rest].slice(0, SHOW);
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    track.innerHTML = pick.map((p, k) => `
      <a class="wk" href="projects.html#p=${p._id}">
        <div class="wk-media"><img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="${k < 3 ? 'eager' : 'lazy'}"></div>
        <div class="wk-meta"><span class="wk-n">${String(k + 1).padStart(2, '0')}</span><h3>${esc(p.title)}</h3></div>
        <p>${esc(p.location)} · ${esc(p.year)}</p>
      </a>`).join('') + `
      <a class="wk-all" href="projects.html">All ${P.length} projects <i class="fa-solid fa-arrow-right"></i></a>`;
  }
  // Pin and slide sideways on larger screens; plain swipe on phones / reduced motion
  const pinMQ = window.matchMedia('(max-width: 760px), (hover: none)');
  const meter = home.querySelector('.work-meter span');
  let travel = 0;
  const layoutWork = () => {
    if (!work) return;
    const free = reduce || pinMQ.matches;
    work.classList.toggle('free', free);
    if (free) { work.style.height = ''; travel = 0; return; }
    travel = Math.max(0, track.scrollWidth - window.innerWidth);
    work.style.height = `${work.querySelector('.work-sticky').offsetHeight + travel}px`;
  };
  if (track) {
    track.querySelectorAll('img').forEach(img => img.complete || img.addEventListener('load', layoutWork));
    pinMQ.addEventListener('change', layoutWork);
  }

  /* Discipline rows: project counts, and a photo that follows the mouse */
  home.querySelectorAll('[data-count]').forEach(el => {
    const n = P.filter(p => p.category === el.dataset.count).length;
    if (n) el.textContent = `${n} projects`;
  });
  // Photos for each discipline come from our own projects (newest first)
  const catPhotos = {};
  if (P.length) {
    const newest = [...P].sort((x, y) => (startYear(y) - startYear(x)) || (endYear(y) - endYear(x)));
    newest.forEach(p => { if (p.images && p.images[0]) (catPhotos[p.category] ||= []).push({ src: p.images[0], title: p.title }); });
  }
  home.querySelectorAll('.disc-list a').forEach(a => {
    const cat = a.querySelector('[data-count]')?.dataset.count;
    const list = catPhotos[cat] || [];
    a.dataset.cat = cat || '';
    const thumb = a.querySelector('.disc-thumb');
    if (thumb && list[0]) { thumb.src = list[0].src; thumb.alt = list[0].title; }
  });
  const floatBox = home.querySelector('.disc-float');
  const floatImg = floatBox && floatBox.querySelector('img');
  const floatCap = floatBox && floatBox.querySelector('.disc-cap');
  let fx = 0, fy = 0, ftx = 0, fty = 0, fOn = false, fCat = null, fAt = 0, fTimer = null;
  const showPhoto = () => {
    const list = catPhotos[fCat] || [];
    if (!list.length) return;
    const ph = list[fAt % list.length];
    floatImg.src = ph.src;
    if (floatCap) floatCap.textContent = ph.title;
    new Image().src = list[(fAt + 1) % list.length].src; // preload the next one
  };
  const stopCycle = () => { clearInterval(fTimer); fTimer = null; };
  if (floatBox && finePointer && !reduce) {
    const list = home.querySelector('.disc-list');
    list.addEventListener('pointermove', e => {
      const a = e.target.closest('a[data-cat]');
      if (!a) return;
      if (!fOn) { fx = e.clientX; fy = e.clientY; }
      if (a.dataset.cat !== fCat) {
        fCat = a.dataset.cat; fAt = 0; showPhoto();
        stopCycle();
        fTimer = setInterval(() => { fAt++; showPhoto(); }, 1100);
      }
      ftx = e.clientX; fty = e.clientY; fOn = true;
      floatBox.classList.add('on');
    });
    list.addEventListener('pointerleave', () => { fOn = false; fCat = null; stopCycle(); floatBox.classList.remove('on'); });
  }

  /* Numbers count up when they come into view */
  const statVal = {
    projects: P.length,
    completed: P.filter(p => p.status === 'Completed').length,
    ongoing: P.filter(p => p.status === 'Ongoing').length
  };
  const statObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      statObserver.unobserve(e.target);
      const el = e.target, to = +(el.dataset.to || statVal[el.dataset.stat] || 0);
      if (reduce) { el.textContent = to; return; }
      const t0 = performance.now(), dur = 1600;
      const tick = now => {
        const t = clamp01((now - t0) / dur);
        el.textContent = Math.round(to * (1 - Math.pow(1 - t, 4)));
        if (t < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  home.querySelectorAll('[data-stat], [data-to]').forEach(el => statObserver.observe(el));

  /* "Get in touch" button leans towards the mouse */
  if (finePointer && !reduce) {
    home.querySelectorAll('.magnetic').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        btn.style.transition = 'transform .2s ease-out, background .3s, color .3s';
        btn.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.3}px, ${(e.clientY - r.top - r.height / 2) * 0.4}px)`;
      });
      btn.addEventListener('pointerleave', () => {
        btn.style.transition = 'transform .7s cubic-bezier(.16, 1, .3, 1), background .3s, color .3s';
        btn.style.transform = '';
      });
    });
  }

  /* One animation loop for everything tied to scrolling */
  const bar = document.querySelector('.scroll-progress');
  const ticker = home.querySelector('.ticker-track');
  const parallax = [...home.querySelectorAll('[data-parallax]')];
  const people = [...home.querySelectorAll('.person')];
  if (ticker) ticker.innerHTML += ticker.innerHTML; // two copies, so it can loop without a gap
  let tickX = 0, lastY = window.scrollY, vel = 0, dir = 1;
  const frame = () => {
    const y = window.scrollY, vh = window.innerHeight;
    const dy = y - lastY; lastY = y;
    vel += (dy - vel) * 0.1;
    if (Math.abs(dy) > 0.5) dir = dy > 0 ? 1 : -1;

    if (bar) bar.style.transform = `scaleX(${clamp01(y / (document.documentElement.scrollHeight - vh))})`;

    if (wordEls.length && !reduce) {
      const r = words.getBoundingClientRect();
      const p = clamp01((vh * 0.85 - r.top) / (r.height + vh * 0.25));
      const on = Math.round(p * wordEls.length);
      wordEls.forEach((w, i) => w.classList.toggle('on', i < on));
    }

    if (ticker && !reduce) {
      const half = ticker.scrollWidth / 2;
      tickX -= (0.7 + Math.min(Math.abs(vel) * 0.35, 14)) * dir;
      if (tickX <= -half) tickX += half;
      if (tickX > 0) tickX -= half;
      ticker.style.transform = `translate3d(${tickX}px, 0, 0)`;
    }

    if (work && travel > 0) {
      const r = work.getBoundingClientRect();
      const p = clamp01(-r.top / (r.height - work.querySelector('.work-sticky').offsetHeight || 1));
      track.style.transform = `translate3d(${-p * travel}px, 0, 0)`;
      if (meter) meter.style.transform = `scaleX(${p})`;
    }

    if (!reduce) parallax.forEach(el => {
      const r = el.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      el.style.transform = `translate3d(0, ${((r.top + r.height / 2) - vh / 2) * -(+el.dataset.parallax)}px, 0)`;
    });

    if (!reduce) people.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      // colour fills in as the photo travels from the bottom of the screen towards the middle
      const img = el.querySelector('figure');
      const ir = img.getBoundingClientRect();
      el.style.setProperty('--gray', (1 - clamp01((vh - ir.top) / (vh * 0.6))).toFixed(3));
    });

    if (fOn || (floatBox && floatBox.classList.contains('on'))) {
      const dx = ftx - fx;
      fx += dx * 0.16; fy += (fty - fy) * 0.16;
      floatBox.style.transform = `translate3d(${fx + 24}px, ${fy - 120}px, 0) rotate(${Math.max(-8, Math.min(8, dx * 0.08))}deg)`;
    }
    requestAnimationFrame(frame);
  };
  let resizeT;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(layoutWork, 150); });
  window.addEventListener('load', layoutWork);
  layoutWork();
  requestAnimationFrame(frame);
}

/* ---------- Copy email button ---------- */
document.querySelectorAll('.ct-copy').forEach(btn => {
  const label = btn.querySelector('span');
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy;
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      const t = document.createElement('textarea');
      t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { ok = document.execCommand('copy'); } catch (err) { /* ignore */ }
      t.remove();
    }
    if (!ok) { location.href = `mailto:${text}`; return; }
    btn.classList.add('done'); label.textContent = 'Copied';
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.classList.remove('done'); label.textContent = 'Copy email'; }, 2000);
  });
});

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
    const interests = new FormData(contactForm).getAll('interest').join(', ');
    location.href = mailto(`Website enquiry from ${d['first-name']} ${d['last-name']}`, [
      `Name: ${d['first-name']} ${d['last-name']}`,
      `Email: ${d.email}`,
      d.phone && `Phone: ${d.phone}`,
      interests && `Interested in: ${interests}`,
      d.location && `Project location: ${d.location}`,
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
