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

  // set by the grid panel code further down
  let closeInline = () => {}, inlineId = () => null, openGrid = () => false;

  /* ---------- Views ---------- */
  const VIEWS = { grid: gridEl, list: listEl, gallery: galEl };
  // projects.html?view=list opens a view directly; otherwise the visitor's last choice
  const asked = new URLSearchParams(location.search).get('view');
  let view = VIEWS[asked] ? asked : VIEWS[store.get('uas-work-view')] ? store.get('uas-work-view') : 'grid';
  const switchBtns = [...document.querySelectorAll('.wk-switch button')];

  const meta = p => [p.location, startYear(p)].filter(Boolean).map(esc).join(' · ');

  // Grid: Option B's cards (photo whole on a blurred copy of itself, title, place · year)
  const renderGrid = list => list.map((p, k) => `
    <a class="pj" href="#p=${p.id}" data-id="${p.id}" style="--d:${(k % 3) * 90}ms">
      <div class="pj-media" style="--src:url('${esc(p.images[0])}')"><img src="${esc(p.images[0])}" alt="${esc(p.title)}" loading="${k < 6 ? 'eager' : 'lazy'}"></div>
      <h3><span>${esc(p.title)}</span></h3>
      <p>${meta(p)}</p>
    </a>`).join('');

  const renderList = list => list.map((p, k) => `
    <a class="l-row" href="#p=${p.id}" data-id="${p.id}">
      <span class="l-n">${pad(k + 1)}</span>
      <div class="l-title"><h2>${esc(p.title)}</h2><p>${meta(p)}${p.type ? ' · ' + esc(p.type) : ''}</p></div>
      <div class="l-strip">${p.images.filter((src, n) => !(p.text || []).includes(n + 1)).slice(0, 8).map(src =>
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
          margin = Math.ceil(a * rings * 0.8);
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
    // Fill every gap left that is big enough for a small photo (including along the bottom,
    // where the tile meets its own top). Each gap gets a photo from a project placed as far away
    // as possible, and no photo is used twice, so a repeat never shows near its original.
    const TH = bottom * cell;
    const wrap = (d, n) => { d = Math.abs(d) % n; return Math.min(d, n - d); };
    const where = new Map();                 // photo -> centres (px) of every place it shows
    tiles.forEach(t => { if (!where.has(t.src)) where.set(t.src, []); where.get(t.src).push([t.x + t.w / 2, t.y + t.h / 2]); });
    const spare = base.filter(el => { const r = +el.dataset.r || 1.5; return r > 1.15 && r < 2; });
    const pool = spare.length >= 12 ? spare : base;
    const boxSide = S.small[0] * W;
    const box = { wc: Math.round((boxSide * Math.sqrt(1.5) + gap) / cell), hc: Math.round((boxSide / Math.sqrt(1.5) + gap) / cell) };
    const filled = new Set();
    for (let y = 0; y + box.hc <= bottom; y++) {
      for (let x = 0; x < cols; x++) {
        if (!isFree(x, y, box.wc, box.hc)) continue;
        const px = (x + box.wc / 2) * cell, py = (y + box.hc / 2) * cell;
        let pick = null, far = -1;
        for (const el of pool) {
          if (filled.has(el) && filled.size < pool.length) continue;
          const d = Math.min(...(where.get(el) || [[Infinity, Infinity]]).map(([cx, cy]) => Math.hypot(wrap(cx - px, TW), wrap(cy - py, TH))));
          if (d > far) { far = d; pick = el; }
        }
        if (!pick) continue;
        // fit the chosen photo inside the gap, keeping its shape
        const r = +pick.dataset.r || 1.5;
        let wc = box.wc, hc = Math.max(2, Math.round(((box.wc * cell - gap) / r + gap) / cell));
        if (hc > box.hc) { hc = box.hc; wc = Math.max(2, Math.round(((box.hc * cell - gap) * r + gap) / cell)); }
        put(pick, x, y, wc, hc);
        filled.add(pick);
        where.get(pick).push([(x + wc / 2) * cell, (y + hc / 2) * cell]);
        x += wc - 1;
      }
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
    root.querySelectorAll('.pj, .l-row, .ga-item').forEach(el => io.observe(el));
  };
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -6% 0px' });

  const render = () => {
    closeInline(true);
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
    setURL(inlineId() ? `${location.pathname}${location.search}#p=${inlineId()}` : filterHash());
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

  /* ---------- Grid view: Option B's grid, a project opens in place below its row ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const FACTS = [['Client', 'client'], ['Typology', 'type'], ['Sector', 'sector'], ['Size', 'area'], ['Status', 'status'], ['Scope', 'scope']];
  const panel = document.createElement('section');
  panel.className = 'pd';
  let openId = null;
  const cards = () => [...gridEl.querySelectorAll('.pj')];
  const cardOf = id => gridEl.querySelector(`.pj[data-id="${CSS.escape(id)}"]`);
  const byId = id => ORDER.find(p => p.id === id);

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
    const box = src.getBoundingClientRect();
    const ratio = src.naturalWidth / src.naturalHeight;
    const fw = Math.min(box.width, box.height * ratio), fh = fw / ratio;
    const from = { left: box.left + (box.width - fw) / 2, top: box.top + (box.height - fh) / 2, width: fw, height: fh };
    const ghost = new Image();
    ghost.src = src.currentSrc || src.src;
    ghost.className = 'pj-fly';
    ghost.alt = '';
    ghost.style.width = `${from.width}px`;
    ghost.style.height = `${from.height}px`;
    ghost.style.transform = `translate3d(${from.left}px, ${from.top}px, 0)`;
    document.body.appendChild(ghost);
    target.classList.add('pd-flown', 'pd-landing');
    const dur = 900, t0 = performance.now();
    const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const lerp = (a, b, e) => a + (b - a) * e;
    flight = { ghost, target, raf: 0 };
    const stepFly = now => {
      const t = Math.min(1, (now - t0) / dur), e = ease(t);
      const r = target.getBoundingClientRect(); // follows the page while it scrolls to the panel
      const w = r.width || from.width, h = r.height || from.width / ratio;
      ghost.style.transform = `translate3d(${lerp(from.left, r.left, e)}px, ${lerp(from.top, r.top, e)}px, 0) scale(${lerp(1, w / from.width, e)}, ${lerp(1, h / from.height, e)})`;
      if (t < 1) { flight.raf = requestAnimationFrame(stepFly); return; }
      target.classList.remove('pd-landing');
      flight = null;
      ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220 }).onfinish = () => ghost.remove();
    };
    stepFly(t0);
  };

  // the panel goes after the last card on the open card's row; only moved when that spot changes
  const place = () => {
    const card = cardOf(openId);
    if (!card) return;
    let end = card;
    cards().forEach(c => { if (c.offsetTop === card.offsetTop) end = c; });
    if (panel.isConnected && panel.previousElementSibling === end) return;
    end.after(panel);
  };
  const strip = () => panel.querySelector('.pd-strip');
  const photos = () => [...panel.querySelectorAll('.pd-strip img')];
  const shownPhoto = () => {
    const s = strip(), imgs = photos();
    if (s.scrollLeft + s.clientWidth >= s.scrollWidth - 4) return imgs.length - 1;
    let best = 0;
    imgs.forEach((img, k) => { if (Math.abs(img.offsetLeft - s.scrollLeft) < Math.abs(imgs[best].offsetLeft - s.scrollLeft)) best = k; });
    return best;
  };
  const syncHeight = () => {
    const img = photos()[shownPhoto()];
    if (img && img.offsetHeight) panel.style.setProperty('--ph', `${img.offsetHeight}px`);
  };
  const updateCount = () => { const c = panel.querySelector('.pd-count'); if (c) c.textContent = `${pad(shownPhoto() + 1)} / ${pad(photos().length)}`; };
  const goPhoto = d => {
    strip().classList.remove('settling');
    const imgs = photos(), j = Math.max(0, Math.min(imgs.length - 1, shownPhoto() + d));
    strip().scrollTo({ left: imgs[j].offsetLeft, behavior: 'smooth' });
  };

  const openInline = (id, scroll = true) => {
    const card = cardOf(id), p = byId(id);
    if (!card || !p) return false;
    cards().forEach(c => c.classList.toggle('active', c === card));
    openId = id;
    const th = card.querySelector('.pj-media img');
    const firstSize = th && th.naturalWidth ? ` width="${th.naturalWidth}" height="${th.naturalHeight}"` : '';
    // switching projects can take the panel out from above the tapped card: keep that card still on screen
    const cardTop = card.getBoundingClientRect().top;
    panel.remove();
    panel.innerHTML = `
      <div class="pd-info">
        <button class="pd-close" aria-label="Close project" style="--d:4"><i class="fa-solid fa-xmark"></i></button>
        <p class="eyebrow" style="--d:0">${esc(LABELS[p.category] || '')}</p>
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
    const s = strip(), imgs = photos();
    if (imgs.length > 1) s.addEventListener('scroll', updateCount, { passive: true });
    // hold the strip at the first photo while photos are still loading (no width yet)
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
    setURL(`${location.pathname}${location.search}#p=${id}`);
    if (scroll) {
      fly(card);
      requestAnimationFrame(() => panel.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' }));
    }
    return true;
  };
  // closing folds the panel shut (a copy collapses while the real one is removed straight away)
  const collapse = () => {
    if (reduceMotion.matches || !panel.isConnected) return panel.remove();
    const h = panel.offsetHeight;
    const gap = parseFloat(getComputedStyle(gridEl).rowGap) || 0;
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
  closeInline = (quiet = false) => {
    if (openId === null) return;
    const card = cardOf(openId);
    endFlight();
    if (quiet) panel.remove(); else collapse();
    cards().forEach(c => c.classList.remove('active'));
    openId = null;
    if (!quiet) { setURL(filterHash()); if (card) card.focus({ preventScroll: true }); }
  };
  inlineId = () => openId;

  gridEl.addEventListener('click', e => {
    const card = e.target.closest('.pj');
    if (card) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault(); e.stopPropagation();
      if (card.dataset.id === openId) closeInline(); else openInline(card.dataset.id);
      return;
    }
    if (!e.target.closest('.pd')) return;
    e.stopPropagation();
    if (e.target.closest('.pd-close')) return closeInline();
    if (e.target.closest('.pd-arrow')) return goPhoto(e.target.closest('.prev') ? -1 : 1);
    const img = e.target.closest('.pd-strip img');
    if (img) openProject(openId, +img.dataset.i); // a photo opens the full project view at that photo
  });
  // mouse wheel over the photos moves one photo per scroll; at either end it scrolls the page again
  let wheelLock = 0;
  panel.addEventListener('wheel', e => {
    if (!e.target.closest('.pd-strip') || e.ctrlKey) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    const dir = Math.sign(e.deltaY);
    if (!dir) return;
    const now = performance.now();
    if (now < wheelLock) { e.preventDefault(); return; }
    const i = shownPhoto(), last = photos().length - 1;
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
    if (e.key === 'Escape' && openId !== null && !pv.classList.contains('open')) closeInline();
  });
  // phones fire "resize" when the address bar shows or hides; only a width change moves the panel
  let lastWidth = window.innerWidth, gridTimer;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(gridTimer);
    gridTimer = setTimeout(() => { if (openId !== null) { place(); syncHeight(); } }, 150);
  });
  openGrid = openInline;

  /* ---------- Links ---------- */
  const fromHash = () => {
    const [k, v] = decodeURIComponent(location.hash.slice(1)).toLowerCase().split('=');
    if (k === 'p') {
      if (view === 'grid' && ORDER.some(p => p.id === v)) {
        closeProject();
        if (!gridEl.querySelector(`.pj[data-id="${CSS.escape(v)}"]`)) { dim = DIMS[0]; value = 'all'; render(); }
        if (openGrid(v)) return;
      }
      if (!openProject(v)) closeProject();
      return;
    }
    closeProject();
    if (LABELS[k]) { dim = DIMS[0]; value = slug(LABELS[k]); }
    else if (DIMS.some(d => d.key === k)) { dim = DIMS.find(d => d.key === k); value = v || 'all'; }
    render();
  };
  window.addEventListener('hashchange', fromHash);
  render();
  fromHash();
})();
