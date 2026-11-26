/* Option C projects page: Grid, List and Gallery views, a project opens over the page.
   Links: #architecture, #status=completed, #location=mumbai, #year=2023, #p=<project> */
(() => {
  const P = window.PROJECTS;
  const gridEl = document.getElementById('viewGrid');
  if (!P || !gridEl) return;
  const listEl = document.getElementById('viewList');
  const galEl = document.getElementById('viewGallery');
  const noResults = document.getElementById('noResults');

  const LABELS = { architecture: 'Architecture', interior: 'Interior Design', landscape: 'Landscape' };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slug = s => String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const startYear = p => (String(p.year).match(/\d{4}/) || [''])[0];
  const endYear = p => /ongoing/i.test(p.year) ? 9999 : +(String(p.year).match(/\d{4}/g) || ['0']).pop();
  const pin = p => +p.pin > 0 ? +p.pin : Infinity;
  const pad = n => String(n).padStart(2, '0');
  const setURL = u => { try { history.replaceState(null, '', u); } catch (e) { /* ignore */ } };
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  const seen = {};
  P.forEach(p => { let id = slug(p.title); if (seen[id]) id += '-' + p.category; seen[id] = 1; p.id = id; });

  // Pinned projects first ("Pin: 1" to "Pin: 9" in info.txt), then newest first
  const ORDER = P.map((_, i) => i).sort((a, b) =>
    (pin(P[a]) - pin(P[b]) || 0) || (startYear(P[b]) - startYear(P[a])) || (endYear(P[b]) - endYear(P[a])) || a - b)
    .map(i => P[i]);

  /* ---------- "Browse by" ---------- */
  const DIMS = [
    { key: 'type', label: 'Type', get: p => LABELS[p.category], order: Object.values(LABELS) },
    { key: 'sector', label: 'Residential / Commercial', get: p => p.sector, order: ['Residential', 'Commercial', 'Public & Institutional'] },
    { key: 'status', label: 'Status', get: p => p.status, order: ['Completed', 'Ongoing', 'Proposed', 'Architecture Competition'] },
    { key: 'location', label: 'Location', get: p => p.region, order: ['Ranchi', 'Mumbai', 'Rest of Jharkhand', 'Rest of India', 'International'] },
    { key: 'year', label: 'Year', get: startYear, sort: (a, b) => b.localeCompare(a) }
  ];
  DIMS.forEach(d => {
    const vals = [...new Set(P.map(d.get).filter(Boolean))];
    d.values = d.sort ? vals.sort(d.sort)
      : [...d.order.filter(v => vals.includes(v)), ...vals.filter(v => !d.order.includes(v))];
  });
  const dimsEl = document.getElementById('dims');
  const filtersEl = document.getElementById('filters');
  let dim = DIMS[0], value = 'all';
  dimsEl.innerHTML = DIMS.map(d => `<button class="dim" role="tab" data-dim="${d.key}">${esc(d.label)}</button>`).join('');

  const shownProjects = () => value === 'all' ? ORDER : ORDER.filter(p => slug(dim.get(p) || '') === value);

  /* ---------- Views ---------- */
  const VIEWS = { grid: gridEl, list: listEl, gallery: galEl };
  // projects.html?view=list opens a view directly; otherwise the visitor's last choice
  const asked = new URLSearchParams(location.search).get('view');
  let view = VIEWS[asked] ? asked : VIEWS[store.get('uas-work-view')] ? store.get('uas-work-view') : 'grid';
  const switchBtns = [...document.querySelectorAll('.wk-switch button')];

  const meta = p => [p.location, startYear(p)].filter(Boolean).map(esc).join(' · ');

  const renderGrid = list => list.map((p, k) => `
    <a class="g-item s${k % 10}" href="#p=${p.id}" data-id="${p.id}" style="--d:${(k % 3) * 90}ms">
      <div class="g-media"><img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="${k < 4 ? 'eager' : 'lazy'}"></div>
      <div class="g-cap">
        <div class="g-text"><h2>${esc(p.title)}</h2><p>${esc(p.location)}</p></div>
        <div class="g-swap"><span class="g-yr">${esc(startYear(p))}</span><span class="g-go">View</span></div>
      </div>
    </a>`).join('');

  const renderList = list => list.map((p, k) => `
    <a class="l-row" href="#p=${p.id}" data-id="${p.id}">
      <span class="l-n">${pad(k + 1)}</span>
      <div class="l-title"><h2>${esc(p.title)}</h2><p>${meta(p)}${p.type ? ' · ' + esc(p.type) : ''}</p></div>
      <div class="l-strip">${p.images.slice(0, 8).map(src =>
        `<img src="${esc(src)}" alt="" loading="lazy">`).join('')}</div>
    </a>`).join('');

  // Gallery: every photo, scattered at different sizes with open space around them.
  // Each row holds 1 to 4 photos of different widths, set at different heights, on a
  // fine column grid. A fixed seed keeps the arrangement the same on every visit.
  const GAL = [
    { min: 1000, cols: 24, counts: [1, 2, 2, 3, 3, 3, 4], span: [4, 9], solo: [8, 12] },
    { min: 600, cols: 12, counts: [1, 2, 2, 2, 3], span: [3, 6], solo: [6, 8] },
    { min: 0, cols: 10, counts: [1, 1, 2, 2, 2], span: [3, 6], solo: [6, 9] }
  ];
  const galMode = () => GAL.find(m => window.innerWidth >= m.min);
  const rng = seed => () => { // mulberry32
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const renderGallery = list => {
    const photos = list.flatMap(p => p.images.map((src, n) => ({ p, src, n })));
    const m = galMode();
    const rand = rng(1931);
    const int = (lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));
    const pick = a => a[Math.floor(rand() * a.length)];
    const out = [];
    let i = 0, row = 1;
    while (i < photos.length) {
      const k = Math.min(pick(m.counts), photos.length - i);
      const spans = Array.from({ length: k }, () => k === 1 ? int(...m.solo) : int(...m.span));
      while (spans.reduce((x, y) => x + y, 0) + (k - 1) > m.cols) spans[spans.indexOf(Math.max(...spans))]--;
      // share the spare columns out as gaps: before, between and after the photos
      let spare = m.cols - spans.reduce((x, y) => x + y, 0) - (k - 1);
      const gaps = Array(k + 1).fill(0);
      while (spare-- > 0) gaps[int(0, k)]++;
      let col = 1 + gaps[0];
      spans.forEach((span, j) => {
        const { p, src, n } = photos[i++];
        const align = pick(['start', 'start', 'center', 'end']);
        const drop = align === 'start' ? int(0, 6) : 0;
        out.push(`
    <a class="ga-item" href="#p=${p.id}" data-id="${p.id}" data-photo="${n}"
       style="grid-column:${col} / span ${span};grid-row:${row};align-self:${align};margin-top:${drop}vw">
      <img src="${esc(src)}" alt="${esc(p.title)}${n ? ' — photo ' + (n + 1) : ''}" loading="lazy">
      <span class="ga-cap">${esc(p.title)}</span>
    </a>`);
        col += span + 1 + gaps[j + 1];
      });
      row++;
    }
    gridColsFor(m);
    return out.join('');
  };
  const gridColsFor = m => galEl.style.setProperty('--ga-cols', m.cols);
  let lastMode = galMode();
  window.addEventListener('resize', () => {
    if (view === 'gallery' && galMode() !== lastMode) { lastMode = galMode(); render(); }
  });

  const fadeIn = root => {
    // photos fade in once loaded; cards rise in as they come into view
    root.querySelectorAll('img').forEach(img => {
      const done = () => img.classList.add('ld');
      if (img.complete && img.naturalWidth) done(); else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
    });
    root.querySelectorAll('.g-item, .l-row, .ga-item').forEach(el => io.observe(el));
  };
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -6% 0px' });

  const render = () => {
    dimsEl.querySelectorAll('.dim').forEach(b => {
      const on = b.dataset.dim === dim.key;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on);
    });
    filtersEl.innerHTML = [['all', 'All'], ...dim.values.map(v => [slug(v), v])]
      .map(([v, l]) => `<button class="filter${v === value ? ' active' : ''}" data-filter="${v}">${esc(l)}</button>`).join('');
    const list = shownProjects();
    noResults.hidden = list.length > 0;
    const el = VIEWS[view];
    el.innerHTML = view === 'grid' ? renderGrid(list) : view === 'list' ? renderList(list) : renderGallery(list);
    Object.entries(VIEWS).forEach(([k, v]) => { v.hidden = k !== view; if (k !== view) v.innerHTML = ''; });
    switchBtns.forEach(b => { const on = b.dataset.view === view; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
    galHover = null; galEl.classList.remove('hovering');
    fadeIn(el);
  };

  const filterHash = () => value === 'all'
    ? location.pathname + location.search + (dim === DIMS[0] ? '' : `#${dim.key}`)
    : `${location.pathname}${location.search}#${dim.key}=${value}`;

  dimsEl.addEventListener('click', e => {
    const b = e.target.closest('.dim');
    if (!b) return;
    dim = DIMS.find(d => d.key === b.dataset.dim); value = 'all';
    render(); setURL(filterHash());
  });
  filtersEl.addEventListener('click', e => {
    const b = e.target.closest('.filter');
    if (!b) return;
    value = b.dataset.filter;
    render(); setURL(filterHash());
  });
  switchBtns.forEach(b => b.addEventListener('click', () => {
    if (b.dataset.view === view) return;
    view = b.dataset.view; store.set('uas-work-view', view);
    const top = document.getElementById('workViews').getBoundingClientRect().top;
    render();
    if (top < 0) document.getElementById('workViews').scrollIntoView({ behavior: 'smooth' });
  }));

  // List view: photo strip drifts with the mouse; other rows fade back
  listEl.addEventListener('mousemove', e => {
    const row = e.target.closest('.l-row');
    if (!row) return;
    const strip = row.querySelector('.l-strip');
    const r = strip.getBoundingClientRect();
    const extra = strip.scrollWidth - r.width;
    if (extra > 0) strip.scrollLeft = extra * Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  });

  // Gallery view: pointing at a photo lights up every photo of that project; the rest fade back
  let galHover = null;
  const galLight = id => {
    if (id === galHover) return;
    galHover = id;
    galEl.classList.toggle('hovering', !!id);
    galEl.querySelectorAll('.ga-item').forEach(a => a.classList.toggle('hl', !!id && a.dataset.id === id));
  };
  galEl.addEventListener('mouseover', e => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const a = e.target.closest('.ga-item');
    if (a) galLight(a.dataset.id); // gaps between photos keep the current project lit
  });
  galEl.addEventListener('mouseleave', () => galLight(null));

  /* ---------- One project, opened over the page ---------- */
  const pv = document.getElementById('projectView');
  const pvInfo = document.getElementById('pvInfo');
  const pvPhotos = document.getElementById('pvPhotos');
  const pvScroll = document.getElementById('pvScroll');
  const pvCount = document.getElementById('pvCount');
  let current = null, returnFocus = null;

  const DETAILS = [['Client', 'client'], ['Type', 'type'], ['Year', 'year'], ['Area', 'area'],
    ['Location', 'location'], ['Status', 'status'], ['Scope', 'scope']];

  const openProject = (id, photo) => {
    const list = shownProjects().some(p => p.id === id) ? shownProjects() : ORDER;
    const k = list.findIndex(p => p.id === id);
    if (k < 0) return false;
    const p = list[k];
    current = { id, list };
    pvCount.textContent = `${pad(k + 1)} / ${pad(list.length)}`;
    pvInfo.innerHTML = `
      <p class="pv-cat">${esc(LABELS[p.category] || '')}${p.sector ? ' · ' + esc(p.sector) : ''}</p>
      <h2 id="pvTitle">${esc(p.title)}</h2>
      <dl>${DETAILS.filter(([, k2]) => p[k2]).map(([l, k2]) => `<div><dt>${l}</dt><dd>${esc(p[k2])}</dd></div>`).join('')}</dl>`;
    pvPhotos.innerHTML = p.images.map((src, n) =>
      `<figure><img src="${esc(src)}" alt="${esc(p.title)} — photo ${n + 1}" loading="${n < 2 || n === photo ? 'eager' : 'lazy'}"></figure>`).join('');
    pvPhotos.querySelectorAll('img').forEach(img => {
      const done = () => img.classList.add('ld');
      if (img.complete && img.naturalWidth) done(); else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }); }
    });
    if (!pv.classList.contains('open')) {
      returnFocus = document.activeElement;
      pv.classList.add('open');
      pv.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('pv-lock');
      pv.querySelector('.pv-close').focus({ preventScroll: true });
    }
    pvScroll.scrollTop = 0;
    pv.classList.remove('swap'); void pv.offsetWidth; pv.classList.add('swap');
    if (photo > 0) {
      const fig = pvPhotos.children[photo];
      if (fig) requestAnimationFrame(() => fig.scrollIntoView({ block: 'start' }));
    }
    setURL(`${location.pathname}${location.search}#p=${id}`);
    return true;
  };
  const closeProject = () => {
    if (!pv.classList.contains('open')) return;
    pv.classList.remove('open');
    pv.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('pv-lock');
    current = null;
    setURL(filterHash());
    if (returnFocus) returnFocus.focus({ preventScroll: true });
  };
  const step = d => {
    if (!current) return;
    const { list, id } = current;
    const k = list.findIndex(p => p.id === id);
    openProject(list[(k + d + list.length) % list.length].id);
  };

  document.getElementById('workViews').addEventListener('click', e => {
    const a = e.target.closest('a[data-id]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    openProject(a.dataset.id, +(a.dataset.photo || 0));
  });
  pv.querySelector('.pv-close').addEventListener('click', closeProject);
  pv.querySelector('.pv-nav.prev').addEventListener('click', () => step(-1));
  pv.querySelector('.pv-nav.next').addEventListener('click', () => step(1));
  document.addEventListener('keydown', e => {
    if (!pv.classList.contains('open')) return;
    if (e.key === 'Escape') closeProject();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });

  /* ---------- Links ---------- */
  const fromHash = () => {
    const [k, v] = decodeURIComponent(location.hash.slice(1)).toLowerCase().split('=');
    if (k === 'p') { if (!openProject(v)) closeProject(); return; }
    closeProject();
    if (LABELS[k]) { dim = DIMS[0]; value = slug(LABELS[k]); }
    else if (DIMS.some(d => d.key === k)) { dim = DIMS.find(d => d.key === k); value = v || 'all'; }
    render();
  };
  window.addEventListener('hashchange', fromHash);
  render();
  fromHash();
})();
