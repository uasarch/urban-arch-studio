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

  // Gallery: every project as a cluster (its first photo large, the rest smaller around it),
  // the clusters locked together into one collage. Photo shapes come from data/projects.js
  // ("sizes"); a fixed seed keeps the collage the same on every visit.
  const rng = seed => () => { // mulberry32
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const ratioOf = (p, n) => {
    const m = /^(\d+)x(\d+)$/.exec((p.sizes || [])[n] || '');
    return m ? +m[1] / +m[2] : 1.5;
  };
  // Photos only load once they first come on screen (data-src), as the canvas can be huge
  // photos that are only text ("Text photos" in info.txt) are left out of the gallery
  const renderGallery = list => list.flatMap(p => p.images.map((src, n) => (p.text || []).includes(n + 1) ? '' : `
    <a class="ga-item" href="#p=${p.id}" data-id="${p.id}" data-photo="${n}" data-r="${ratioOf(p, n).toFixed(4)}">
      <img data-src="${esc(src)}" alt="${esc(p.title)}${n ? ' — photo ' + (n + 1) : ''}" decoding="async">
      <span class="ga-cap">${esc(p.title)}</span>
    </a>`)).join('');

  /* The gallery is an endless canvas: it fills the screen, moves in any direction
     (mouse wheel / trackpad, dragging, touch, arrow keys) and repeats so it never runs out.
     One "tile" of photos is packed once and wraps around left-right and top-bottom. */
  const gal = { tiles: [], TW: 0, TH: 0, W: 0, H: 0, x: 0, y: 0, tx: 0, ty: 0, raf: 0, on: false };
  const mod = (a, n) => ((a % n) + n) % n;

  const packTile = () => {
    const W = galEl.clientWidth, H = galEl.clientHeight;
    if (!W || !H) return;
    const phone = W < 600;
    const gap = Math.round(Math.min(20, Math.max(8, W * 0.014)));
    // Every project is a cluster: its first photo large in the middle, the others smaller and
    // fitted round it. Sizes are the side of a square of the same area, as a share of screen width.
    const S = phone
      ? { cover: [0.46, 0.56], single: [0.34, 0.42], small: [0.18, 0.25] }
      : { cover: [0.17, 0.22], single: [0.12, 0.15], small: [0.062, 0.095] };
    const coverMax = S.cover[1] * W * 1.6;
    // Photos sit on a fine square grid ("cells"), so they lock together with even gaps.
    const cell = phone ? 8 : 12;
    const cols = Math.ceil(Math.max(W * 1.5, W + coverMax) / cell);
    const TW = cols * cell;                // wider than the screen, so a photo never shows twice side by side
    const base = [...galEl.querySelectorAll('.ga-item:not(.copy)')];
    if (!base.length) return;
    const groups = [];
    base.forEach(el => {
      const g = groups[groups.length - 1];
      if (g && g[0].dataset.id === el.dataset.id) g.push(el); else groups.push([el]);
    });
    const rand = rng(1931);
    const between = ([lo, hi]) => (lo + rand() * (hi - lo)) * W;

    // which cells are taken (rows are added as the tile grows; columns wrap round)
    let rows = 0, occ = new Uint8Array(0);
    const grow = need => {
      if (need <= rows) return;
      const n = Math.max(need, rows * 2, 512);
      const a = new Uint8Array(n * cols); a.set(occ); occ = a; rows = n;
    };
    const isFree = (x, y, wc, hc) => {
      if (y < 0) return false;
      grow(y + hc);
      for (let j = 0; j < hc; j++) {
        const row = (y + j) * cols;
        for (let i = 0; i < wc; i++) if (occ[row + mod(x + i, cols)]) return false;
      }
      return true;
    };
    const take = (x, y, wc, hc) => {
      for (let j = 0; j < hc; j++) {
        const row = (y + j) * cols;
        for (let i = 0; i < wc; i++) occ[row + mod(x + i, cols)] = 1;
      }
    };
    // a photo of a given size, rounded to whole cells (a few pixels may be trimmed off its edges)
    const sizeOf = (el, side) => {
      const r = +el.dataset.r || 1.5;
      const wc = Math.max(2, Math.round((side * Math.sqrt(r) + gap) / cell));
      const hc = Math.max(2, Math.round((side / Math.sqrt(r) + gap) / cell));
      return { wc, hc };
    };
    const tiles = [];
    let bottom = 0, firstOpen = 0;
    const put = (el, x, y, wc, hc) => {
      take(x, y, wc, hc);
      x = mod(x, cols);
      tiles.push({ src: el, x: x * cell, y: y * cell, w: wc * cell - gap, h: hc * cell - gap, cx: x + wc / 2, cy: y + hc / 2, wc, hc });
      bottom = Math.max(bottom, y + hc);
    };
    // first free spot from the top (used for each cluster's big photo, and to fill holes)
    const firstFit = (wc, hc, maxY) => {
      for (;;) { grow(firstOpen + 1); let full = true; for (let i = 0; i < cols; i++) if (!occ[firstOpen * cols + i]) { full = false; break; } if (!full) break; firstOpen++; }
      const shift = Math.floor(rand() * cols);
      for (let y = firstOpen; y < (maxY ?? firstOpen + 4000); y++) {
        if (maxY != null && y + hc > maxY) return null;
        for (let k = 0; k < cols; k++) { const x = (k + shift) % cols; if (isFree(x, y, wc, hc)) return { x, y }; }
      }
      return null;
    };
    // the free spot round the cluster's big photo: closest to its edges, or (with a target)
    // closest to a chosen point on a ring round it
    const around = (c, wc, hc, target) => {
      for (const reach of [1.7, 3, 5]) {
        const ex = (c.wc + wc) / 2, ey = (c.hc + hc) / 2;
        const rx = Math.ceil(Math.max(ex * reach, target ? Math.abs(target[0]) + wc * 2 : 0));
        const ry = Math.ceil(Math.max(ey * reach, target ? Math.abs(target[1]) + hc * 2 : 0));
        const cand = [];
        for (let dy = -ry; dy <= ry; dy++) {
          for (let dx = -rx; dx <= rx; dx++) {
            const nx = Math.abs(dx) / ex, ny = Math.abs(dy) / ey;
            const score = target
              ? Math.hypot((dx - target[0]) / ex, (dy - target[1]) / ey) + 0.1 * Math.max(nx, ny)
              : Math.max(nx, ny) + 0.25 * Math.hypot(nx, ny);
            cand.push([score + rand() * 0.02, dx, dy]);
          }
        }
        cand.sort((a, b) => a[0] - b[0]);
        for (const [, dx, dy] of cand) {
          const x = Math.round(c.cx + dx - wc / 2), y = Math.round(c.cy + dy - hc / 2);
          if (isFree(x, y, wc, hc)) return { x, y };
        }
      }
      return null;
    };
    // Projects with more than 7 photos: the small photos go evenly all round photo no. 1,
    // ring after ring. Returns a target point (offset from the big photo's centre) for each.
    const ringTargets = (c, sizes) => {
      const a = sizes.reduce((t, s) => t + (s.wc + s.hc) / 2, 0) / sizes.length;  // a small photo's typical size
      const out = [];
      for (let j = 0, i = 0; i < sizes.length; j++) {
        const ex = c.wc / 2 + a * (j + 0.5), ey = c.hc / 2 + a * (j + 0.5);
        const cap = Math.max(4, Math.floor(4 * (ex + ey) / (a * 0.9)));
        const count = Math.min(cap, sizes.length - i);           // the last ring spreads out evenly too
        for (let k = 0; k < count; k++, i++) {
          const th = -Math.PI / 2 + 2 * Math.PI * (k + (j % 2) * 0.5) / count;
          const t = 1 / Math.max(Math.abs(Math.cos(th)) / ex, Math.abs(Math.sin(th)) / ey);
          out.push([Math.cos(th) * t, Math.sin(th) * t]);
        }
      }
      return { targets: out };
    };

    // build clusters until the tile is well taller than the screen (repeating projects if few)
    const coverRows = Math.ceil(coverMax / cell);
    for (let round = 0; round < 40; round++) {
      for (const g of groups) {
        const big = sizeOf(g[0], between(g.length > 1 ? S.cover : S.single));
        const rest = g.slice(1).map(el => ({ el, ...sizeOf(el, between(S.small)) }));
        const ring = rest.length > 6;                       // more than 7 photos in all
        let margin = 0;
        if (ring) {
          // keep room free on every side of photo no. 1 for the rings of small photos
          const a = rest.reduce((t, s) => t + (s.wc + s.hc) / 2, 0) / rest.length;
          let n = rest.length, rings = 0;
          while (n > 0) {
            const ex = big.wc / 2 + a * (rings + 0.5), ey = big.hc / 2 + a * (rings + 0.5);
            n -= Math.max(4, Math.floor(4 * (ex + ey) / (a * 0.9))); rings++;
          }
          margin = Math.ceil(a * rings);
        }
        const spot = firstFit(big.wc + 2 * margin, big.hc + 2 * margin);
        if (!spot) continue;
        put(g[0], spot.x + margin, spot.y + margin, big.wc, big.hc);
        const c = tiles[tiles.length - 1];
        const targets = ring ? ringTargets(c, rest).targets : [];
        rest.forEach((s, i) => {
          const at = around(c, s.wc, s.hc, targets[i]) || firstFit(s.wc, s.hc);
          if (at) put(s.el, at.x, at.y, s.wc, s.hc);
        });
      }
      if (bottom * cell > H + coverMax * 2 && tiles.length >= 24) break;
    }
    // close up the band along the bottom with small photos, so the tile meets its own top
    // (where it repeats) without big holes
    const TH = bottom * cell;
    const band = Math.max(0, bottom - coverRows * 2);
    firstOpen = Math.max(firstOpen, band);
    for (let j = 0, misses = 0; j < 800 && misses < 6; j++) {
      const el = base[j % base.length];
      const s = sizeOf(el, between(S.small) * 0.85);
      const at = firstFit(s.wc, s.hc, bottom);
      if (at) { put(el, at.x, at.y, s.wc, s.hc); misses = 0; } else misses++;
    }
    // the first copy of each photo is the real link; repeats are clones
    galEl.querySelectorAll('.ga-item.copy').forEach(el => el.remove());
    const used = new Set();
    tiles.forEach(t => {
      let el = t.src;
      if (used.has(el)) {
        el = t.src.cloneNode(true);
        el.classList.add('copy');
        const img = el.querySelector('img'), orig = t.src.querySelector('img');
        img.classList.remove('ld');
        img.dataset.src = orig.dataset.src || orig.getAttribute('src');
        img.removeAttribute('src');
        galEl.appendChild(el);
      }
      used.add(t.src);
      t.el = el;
      el.style.width = t.w + 'px';
      el.style.height = t.h + 'px';
      el.classList.add('in');
    });
    Object.assign(gal, { tiles, TW, TH, W, H });
    drawGallery(true);
  };

  const drawGallery = force => {
    const { tiles, TW, TH, W, H } = gal;
    tiles.forEach(t => {
      const sx = mod(t.x - gal.x + t.w, TW) - t.w;
      const sy = mod(t.y - gal.y + t.h, TH) - t.h;
      const show = sx < W && sy < H;
      if (show) {
        t.el.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0)`;
        if (!t.shown || force) {
          t.el.style.visibility = 'visible';
          const img = t.el.querySelector('img');
          if (img.dataset.src) {
            img.addEventListener('load', () => img.classList.add('ld'), { once: true });
            img.addEventListener('error', () => img.classList.add('ld'), { once: true });
            img.src = img.dataset.src; img.removeAttribute('data-src');
          }
        }
      } else if (t.shown || force) t.el.style.visibility = 'hidden';
      t.shown = show;
    });
  };

  const tick = () => {
    gal.x += (gal.tx - gal.x) * 0.14;
    gal.y += (gal.ty - gal.y) * 0.14;
    if (Math.abs(gal.tx - gal.x) < 0.3 && Math.abs(gal.ty - gal.y) < 0.3) { gal.x = gal.tx; gal.y = gal.ty; gal.raf = 0; }
    else gal.raf = requestAnimationFrame(tick);
    drawGallery();
  };
  const moveBy = (dx, dy, now) => {
    gal.tx += dx; gal.ty += dy;
    if (now) { cancelAnimationFrame(gal.raf); gal.raf = 0; gal.x = gal.tx; gal.y = gal.ty; drawGallery(); return; }
    if (!gal.raf) gal.raf = requestAnimationFrame(tick);
  };

  galEl.addEventListener('wheel', e => {
    if (!gal.on) return;
    e.preventDefault();
    const k = e.deltaMode === 1 ? 32 : e.deltaMode === 2 ? galEl.clientHeight : 1;
    // shift + wheel moves sideways with a plain mouse
    if (e.shiftKey && !e.deltaX) moveBy(e.deltaY * k, 0); else moveBy(e.deltaX * k, e.deltaY * k);
  }, { passive: false });

  // drag with the mouse or a finger; a flick keeps it gliding for a moment
  let drag = null, dragged = false;
  galEl.addEventListener('pointerdown', e => {
    if (!gal.on || e.button > 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), vx: 0, vy: 0 };
    dragged = false;
  });
  window.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    const now = performance.now(), dt = Math.max(1, now - drag.t);
    drag.vx = dx / dt; drag.vy = dy / dt;
    drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
    if (!dragged && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) {
      dragged = true; galEl.classList.add('dragging');
      try { galEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    if (dragged) moveBy(-dx, -dy, true);
  });
  const endDrag = e => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    if (dragged && performance.now() - drag.t < 80) moveBy(-drag.vx * 260, -drag.vy * 260);
    drag = null; galEl.classList.remove('dragging');
  };
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  // a drag is not a click
  galEl.addEventListener('click', e => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
  galEl.addEventListener('dragstart', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (!gal.on || document.getElementById('projectView').classList.contains('open')) return;
    const st = e.shiftKey ? 600 : 220;
    const d = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
    if (d) { e.preventDefault(); moveBy(...d); }
  });

  const startGallery = () => {
    gal.on = true;
    document.documentElement.classList.add('ga-mode');
    window.scrollTo(0, 0);
    gal.x = gal.y = gal.tx = gal.ty = 0;
    packTile();
    // open centred on the first project's big photo
    const first = gal.tiles[0];
    if (first) { gal.x = gal.tx = first.x + first.w / 2 - gal.W / 2; drawGallery(true); }
  };
  const stopGallery = () => {
    gal.on = false;
    document.documentElement.classList.remove('ga-mode');
    cancelAnimationFrame(gal.raf); gal.raf = 0;
    gal.tiles = [];
  };
  let galSize = '', galTimer;
  window.addEventListener('resize', () => {
    if (!gal.on) return;
    clearTimeout(galTimer);
    galTimer = setTimeout(() => {
      const size = galEl.clientWidth + 'x' + galEl.clientHeight;
      if (size === galSize) return;
      galSize = size;
      // a phone's address bar showing or hiding only changes the height a little: keep the layout
      if (gal.W === galEl.clientWidth && Math.abs(gal.H - galEl.clientHeight) < 160) { gal.H = galEl.clientHeight; drawGallery(true); return; }
      packTile();
    }, 150);
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
    if (view === 'gallery') { startGallery(); galSize = galEl.clientWidth + 'x' + galEl.clientHeight; }
    else { stopGallery(); fadeIn(el); }
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
    if (top < 0 && view !== 'gallery') document.getElementById('workViews').scrollIntoView({ behavior: 'smooth' });
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
