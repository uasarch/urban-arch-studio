/* Client portal - PROTOTYPE. Logins and data are fake (data/portal-demo.js, or the admin page's copy
   saved in this browser); nothing here is private. The live version checks the login on a server and
   sends the page only the logged-in client's project. */
(() => {
  if (!window.portalData) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const day = s => (s ? new Date(s + 'T00:00:00') : null);
  const now = new Date();
  const TODAY = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); // local date, not UTC
  const fmtDate = (s, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => s ? day(s).toLocaleDateString('en-IN', opts) : '';
  const shortDate = s => fmtDate(s, { day: 'numeric', month: 'short' });
  const rupees = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const lakh = n => n >= 100000 ? `₹${(n / 100000).toFixed(n >= 1000000 ? 1 : 2)} lakh` : rupees(n);
  const daysBetween = (a, b) => Math.round((b - a) / 86400000);
  // who is logged in, and which of their projects is open: { user, project }
  const session = {
    get: () => {
      try {
        const v = sessionStorage.getItem('uas-portal-client');
        if (!v) return null;
        if (v[0] === '{') return JSON.parse(v);
        return { project: v }; // older format: just a project id
      } catch (e) { return null; }
    },
    set: v => { try { v ? sessionStorage.setItem('uas-portal-client', JSON.stringify(v)) : sessionStorage.removeItem('uas-portal-client'); } catch (e) { /* ignore */ } }
  };
  const DATA = window.portalData();
  const TYPES = { architecture: 'Architecture', interior: 'Interior Design', landscape: 'Landscape Design' };
  const projectsOf = user => DATA.projects.filter(x => x.login && String(x.login.username).toLowerCase() === String(user).toLowerCase());
  let USER = null; // username of the logged-in client

  /* ---------- Numbers worked out from one project's data ---------- */
  let M = null; // the logged-in project, with everything derived from it
  function compute(pr) {
    const groups = (pr.boq || []).map(g => {
      const items = (g.items || []).map(([name, qty, unit, rate, done]) => ({ name, qty: +qty || 0, unit, rate: +rate || 0, done: +done || 0, amount: (+qty || 0) * (+rate || 0) }));
      const amount = items.reduce((s, i) => s + i.amount, 0);
      const doneAmt = items.reduce((s, i) => s + i.amount * i.done / 100, 0);
      return { group: g.group, items, amount, done: amount ? doneAmt / amount * 100 : 0 };
    });
    const contract = groups.reduce((s, g) => s + g.amount, 0);
    const overall = contract ? groups.reduce((s, g) => s + g.amount * g.done / 100, 0) / contract * 100 : 0;
    const pays = (pr.payments || []).map(p => {
      const amount = contract * (+p.pct || 0) / 100;
      const status = p.paid ? 'paid' : p.due && day(p.due) < TODAY ? 'overdue' : p.due && daysBetween(TODAY, day(p.due)) <= 30 ? 'due' : 'upcoming';
      return { ...p, amount, status };
    });
    const paid = pays.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
    const dueNow = pays.filter(p => p.status === 'overdue' || p.status === 'due');
    const dueAmt = dueNow.reduce((s, p) => s + p.amount, 0);
    const stages = (pr.stages || []).filter(s => s.planned && s.planned[0] && s.planned[1]).map(s => {
      const [ps, pe] = s.planned.map(day), [as, ae] = (s.actual || []).map(day);
      const progress = +s.progress || 0;
      let status, late = 0;
      if (progress >= 100) { status = 'done'; late = ae ? daysBetween(pe, ae) : 0; }
      else if (as) { status = 'active'; late = Math.max(0, daysBetween(ps, as)); }
      else { status = TODAY > ps ? 'late' : 'upcoming'; late = TODAY > ps ? daysBetween(ps, TODAY) : 0; }
      return { ...s, progress, ps, pe, as, ae, status, late };
    });
    const active = stages.filter(s => s.status === 'active');
    const lastDone = stages.filter(s => s.status === 'done').pop();
    const behind = lastDone ? Math.max(0, lastDone.late) : 0;
    const updates = [...(pr.updates || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return { pr, P: pr.project || {}, groups, contract, overall, pays, paid, dueNow, dueAmt, stages, active, behind, updates };
  }

  const chip = (kind, icon, text) => `<span class="chip ${kind}"><i class="fa-solid ${icon}"></i>${esc(text)}</span>`;
  const stageChip = s => ({
    done: s.late > 0 ? chip('good', 'fa-circle-check', `Done, ${s.late} days late`) : chip('good', 'fa-circle-check', 'Done'),
    active: chip('warn', 'fa-circle-half-stroke', `In progress · ${s.progress}%`),
    late: chip('bad', 'fa-circle-exclamation', 'Not started, late'),
    upcoming: chip('idle', 'fa-circle', 'Upcoming')
  }[s.status]);
  const payChip = p => ({
    paid: chip('good', 'fa-circle-check', `Paid ${shortDate(p.paid)}`),
    overdue: chip('bad', 'fa-circle-exclamation', `Overdue ${daysBetween(day(p.due), TODAY)} days`),
    due: chip('warn', 'fa-clock', 'Due soon'),
    upcoming: chip('idle', 'fa-circle', 'Upcoming')
  }[p.status]);
  const empty = text => `<p class="pt-empty">${esc(text)}</p>`;

  /* ---------- Render ---------- */
  function render() {
    const { P, groups, contract, overall, pays, paid, dueNow, dueAmt, active, behind, updates } = M;
    $('ptTitle').textContent = P.title || 'Your project';
    $('ptMeta').textContent = [TYPES[P.type], P.location, P.client, P.updated && `Updated ${fmtDate(P.updated)}`].filter(Boolean).join(' · ');
    $('ptSample').hidden = !M.pr.sample;
    $('allProjects').hidden = projectsOf(USER).length < 2;

    const nextPay = dueNow[0];
    $('ptKpis').innerHTML = `
      <div class="kpi">
        <span class="kpi-label">Overall progress</span>
        <span class="kpi-value">${Math.round(overall)}%</span>
        <div class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(overall)}" aria-label="Overall progress"><span style="width:${overall}%"></span></div>
        <span class="kpi-sub">of the work by value</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Now on site</span>
        <span class="kpi-value small">${active.map(s => esc(s.name)).join('<br>') || 'Between stages'}</span>
        <span class="kpi-sub">${active.map(s => `${s.progress}%`).join(' · ')}</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">Handover</span>
        <span class="kpi-value small">${P.handover ? fmtDate(P.handover) : 'To be confirmed'}</span>
        ${behind > 0 ? chip('warn', 'fa-triangle-exclamation', `${behind} days behind plan`) : chip('good', 'fa-circle-check', 'On track')}
      </div>
      <div class="kpi">
        <span class="kpi-label">Amount due</span>
        <span class="kpi-value">${rupees(dueAmt)}</span>
        ${nextPay ? payChip(nextPay) : chip('good', 'fa-circle-check', 'Nothing due')}
        ${nextPay ? `<span class="kpi-sub">${dueNow.length > 1 ? `${dueNow.length} instalments: ${dueNow.map(p => esc(p.milestone)).join(', ')}` : esc(nextPay.milestone)}</span>` : ''}
      </div>`;

    renderGantt();

    $('feed').innerHTML = updates.length ? updates.map(u => `
      <article class="up">
        <div class="up-date">${shortDate(u.date)}<small>${fmtDate(u.date, { year: 'numeric' })}</small></div>
        <div>
          <p class="up-stage">${esc(u.stage)}</p>
          <p class="up-note">${esc(u.note)}</p>
          ${(u.photos || []).length ? `<div class="up-photos">${u.photos.map(src => `<a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="Site photo: ${esc(u.stage)}" loading="lazy"></a>`).join('')}</div>` : ''}
        </div>
      </article>`).join('') : empty('No site updates yet.');

    $('boqNote').textContent = groups.length ? `${groups.reduce((s, g) => s + g.items.length, 0)} items · ${Math.round(overall)}% done by value` : '';
    $('boqList').innerHTML = groups.length ? groups.map((g, k) => `
      <details class="boq-g" id="bg-${k}"${k === 0 ? ' open' : ''}>
        <summary>
          <b>${esc(g.group)}</b>
          <span class="done">${Math.round(g.done)}% done<div class="meter thin"><span style="width:${g.done}%"></span></div></span>
          <span class="amt">${rupees(g.amount)}</span>
          <i class="fa-solid fa-chevron-down"></i>
        </summary>
        <div class="pt-table-wrap">
          <table class="pt-table">
            <thead><tr><th>Item</th><th class="n">Qty</th><th>Unit</th><th class="n">Rate</th><th class="n">Amount</th><th class="n">Done</th></tr></thead>
            <tbody>${g.items.map(i => `
              <tr><td class="strong">${esc(i.name)}</td><td class="n">${i.qty.toLocaleString('en-IN')}</td><td>${esc(i.unit)}</td>
              <td class="n">${rupees(i.rate)}</td><td class="n strong">${rupees(i.amount)}</td>
              <td class="n"><span class="pct"><span>${i.done}%</span><span class="meter thin"><span style="width:${i.done}%"></span></span></span></td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </details>`).join('') +
      `<div class="boq-total"><span>Total contract value</span><span>${rupees(contract)}</span></div>` : empty('The bill of quantities will appear here once it is ready.');

    if (!pays.length || !contract) {
      $('paySum').innerHTML = empty('The payment schedule will appear here once it is ready.');
      $('payTable').innerHTML = '';
      return;
    }
    const up = Math.max(0, contract - paid - dueAmt);
    const w = n => `${(n / contract * 100).toFixed(2)}%`;
    $('paySum').innerHTML = `
      <div class="kpi"><span class="kpi-label">Contract value</span><span class="kpi-value small">${rupees(contract)}</span></div>
      <div class="kpi"><span class="kpi-label">Paid so far</span><span class="kpi-value small">${rupees(paid)}</span></div>
      <div class="kpi"><span class="kpi-label">Balance</span><span class="kpi-value small">${rupees(contract - paid)}</span></div>
      <div class="pay-bar">
        <div class="seg" role="img" aria-label="Paid ${rupees(paid)}, due now ${rupees(dueAmt)}, later ${rupees(up)}">
          ${paid ? `<span class="s-paid" style="width:${w(paid)}"></span>` : ''}${dueAmt ? `<span class="s-due" style="width:${w(dueAmt)}"></span>` : ''}${up ? `<span class="s-up" style="width:${w(up)}"></span>` : ''}
        </div>
        <div class="seg-legend">
          <span><i style="background:var(--ink)"></i>Paid ${lakh(paid)}</span>
          <span><i style="background:var(--bad)"></i>Due now ${lakh(dueAmt)}</span>
          <span><i style="background:var(--plan)"></i>Later ${lakh(up)}</span>
        </div>
      </div>`;
    $('payTable').innerHTML = `
      <thead><tr><th>Milestone</th><th class="n">Share</th><th class="n">Amount</th><th>Due date</th><th>Status</th></tr></thead>
      <tbody>${pays.map((p, k) => `
        <tr id="py-${k}"><td class="strong">${esc(p.milestone)}</td><td class="n">${+p.pct || 0}%</td><td class="n strong">${rupees(p.amount)}</td>
        <td>${fmtDate(p.due)}</td><td>${payChip(p)}</td></tr>`).join('')}
      </tbody>`;
  }

  function renderGantt() {
    const { stages } = M;
    if (!stages.length) { $('gantt').innerHTML = empty('The project timeline will appear here once it is planned.'); return; }
    const first = new Date(Math.min(...stages.map(s => s.ps)));
    const last = new Date(Math.max(...stages.map(s => s.pe), ...stages.filter(s => s.ae).map(s => s.ae)));
    const start = new Date(first.getFullYear(), first.getMonth(), 1);
    const end = new Date(last.getFullYear(), last.getMonth() + 1, 1);
    const span = end - start;
    const x = d => `${((d - start) / span * 100).toFixed(3)}%`;
    const wd = (a, b) => `${(Math.max(b - a, 86400000) / span * 100).toFixed(3)}%`;
    const months = [];
    for (let m = new Date(start); m < end; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) months.push(new Date(m));
    const grid = months.map(m => `<i class="g-grid" style="left:${x(m)}"></i>`).join('');
    const today = TODAY >= start && TODAY <= end ? `<i class="g-today" style="left:${x(TODAY)}"></i>` : '';
    const dates = (a, b) => `${a ? shortDate(iso(a)) : '–'} → ${b ? shortDate(iso(b)) : 'ongoing'}`;
    const tipDates = (a, b) => `${a ? fmtDate(iso(a)) : '–'} to ${b ? fmtDate(iso(b)) : 'ongoing'}`;

    $('gantt').innerHTML = `
      <div class="g-scale"><div></div><div class="g-months">${months.map(m =>
        `<span style="left:${x(m)}">${m.toLocaleDateString('en-IN', { month: 'short' })}${m.getMonth() === 0 || +m === +start ? ` ${String(m.getFullYear()).slice(2)}` : ''}</span>`).join('')}${today}</div></div>
      ${stages.map((s, k) => {
        const actEnd = s.ae || (s.as ? (TODAY > s.as ? TODAY : s.as) : null);
        return `
        <div class="g-row" id="st-${k}">
          <div class="g-name"><b>${esc(s.name)}</b><small>Planned ${dates(s.ps, s.pe)}</small>${stageChip(s)}</div>
          <div class="g-track">
            ${grid}
            <span class="g-bar plan" tabindex="0" style="left:${x(s.ps)};width:${wd(s.ps, s.pe)}"
              data-tip="<b>${esc(s.name)}</b><br>Planned: ${tipDates(s.ps, s.pe)}"></span>
            ${s.as ? `<span class="g-bar act${s.ae ? '' : ' open'}" tabindex="0" style="left:${x(s.as)};width:${wd(s.as, actEnd)}"
              data-tip="<b>${esc(s.name)}</b><br>Actual: ${tipDates(s.as, s.ae)}${s.ae ? '' : `<br>${s.progress}% done`}"></span>` : ''}
            ${today}
          </div>
        </div>`;
      }).join('')}`;
  }

  /* Tooltip for timeline bars (mouse and keyboard) */
  const tip = $('ptTip');
  const showTip = (el, cx, cy) => {
    tip.innerHTML = el.dataset.tip;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = `${Math.min(window.innerWidth - r.width - 8, Math.max(8, cx - r.width / 2))}px`;
    tip.style.top = `${Math.max(8, cy - r.height - 12)}px`;
  };
  document.addEventListener('pointermove', e => {
    const b = e.target.closest && e.target.closest('.g-bar');
    if (b) showTip(b, e.clientX, e.clientY); else if (!tip.hidden && !document.activeElement.closest?.('.g-bar')) tip.hidden = true;
  });
  document.addEventListener('focusin', e => {
    const b = e.target.closest('.g-bar');
    if (b) { const r = b.getBoundingClientRect(); showTip(b, r.left + r.width / 2, r.top); }
  });
  document.addEventListener('focusout', () => { tip.hidden = true; });
  window.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

  /* ---------- Log in / out ---------- */
  // view: 'login', 'pick' (a client with several projects chooses one) or a project to open
  const show = pr => {
    const pick = pr === 'pick';
    if (pick) pr = null;
    M = pr ? compute(pr) : null;
    $('loginView').hidden = !!pr || pick;
    $('pickView').hidden = !pick;
    $('dashView').hidden = !pr;
    if (pick) renderPick();
    $('askOpen').hidden = !pr;
    closeAsk();
    log.innerHTML = ''; greeted = false; setChips(START);
    if (pr) render();
    window.scrollTo(0, 0);
  };
  $('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, u = f.username.value.trim().toLowerCase(), p = f.password.value;
    const err = $('loginError');
    if (!u || !p) { err.textContent = 'Please enter your username and password.'; err.hidden = false; return; }
    const client = (DATA.clients || []).find(c => c.username.toLowerCase() === u && c.password === p);
    if (!client) {
      err.textContent = 'That username and password don\'t match. Check them, or call the studio to reset your login.';
      err.hidden = false; return;
    }
    const mine = projectsOf(client.username);
    if (!mine.length) {
      err.textContent = 'Your login works, but no project has been added to it yet. Please call the studio.';
      err.hidden = false; return;
    }
    err.hidden = true;
    USER = client.username;
    open(mine.length === 1 ? mine[0] : 'pick');
  });
  $('fillDemo').addEventListener('click', () => {
    const f = $('loginForm');
    f.username.value = 'demo'; f.password.value = 'demo123';
    f.querySelector('.pt-submit').focus();
  });
  document.querySelector('.pt-show').addEventListener('click', e => {
    const inp = $('loginForm').password, b = e.currentTarget, on = inp.type === 'password';
    inp.type = on ? 'text' : 'password';
    b.setAttribute('aria-label', on ? 'Hide password' : 'Show password');
    b.innerHTML = `<i class="fa-regular ${on ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
  });
  const logout = () => { USER = null; session.set(null); $('loginForm').reset(); show(null); };
  $('logout').addEventListener('click', logout);
  $('logoutPick').addEventListener('click', logout);
  $('allProjects').addEventListener('click', () => open('pick'));
  // open a project (or the project list) for the logged-in client and remember it for this tab
  function open(pr) {
    session.set({ user: USER, project: pr === 'pick' ? null : pr.id });
    show(pr);
  }

  /* ---------- A client with several projects: choose one ---------- */
  function renderPick() {
    const mine = projectsOf(USER);
    const c = (DATA.clients || []).find(x => x.username.toLowerCase() === String(USER).toLowerCase());
    $('pickMeta').textContent = [c && c.name, `${mine.length} projects`].filter(Boolean).join(' · ');
    $('pickList').innerHTML = mine.map(pr => {
      const m = compute(pr), P = m.P, next = m.dueNow[0];
      return `
      <button class="pick" type="button" data-pick="${esc(pr.id)}">
        <span class="pick-type">${esc(TYPES[P.type] || 'Project')}${pr.sample ? ' · <span class="pt-sample">Sample</span>' : ''}</span>
        <span class="pick-title">${esc(P.title || 'Your project')}</span>
        <span class="pick-meta">${esc([P.location, P.handover && `Handover ${fmtDate(P.handover)}`].filter(Boolean).join(' · '))}</span>
        <span class="pick-bar"><span class="meter thin"><span style="width:${m.overall}%"></span></span><span>${Math.round(m.overall)}% done</span></span>
        <span class="pick-foot">${next ? payChip(next) + ` <b>${rupees(m.dueAmt)}</b> due` : chip('good', 'fa-circle-check', 'Nothing due')}<i class="fa-solid fa-arrow-right"></i></span>
      </button>`;
    }).join('');
  }
  $('pickList').addEventListener('click', e => {
    const b = e.target.closest('[data-pick]');
    if (b) open(DATA.projects.find(x => x.id === b.dataset.pick));
  });

  /* Section tabs: underline the one in view */
  const tabs = [...document.querySelectorAll('.pt-tabs a')];
  const secObs = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) tabs.forEach(t => t.classList.toggle('on', t.hash === `#${en.target.id}`)); });
  }, { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('.pt-sec').forEach(s => secObs.observe(s));

  /* ---------- Assistant (free: rules over this project's own records; nothing typed leaves the page) ---------- */
  const ask = $('ask'), log = $('askLog');
  let greeted = false;
  const STUDIO = { phone: '919869825589', phoneShow: '+91 98698 25589', email: 'utkarsh@urbanarchstudio.co.in' };
  const say = (html, who = 'bot') => {
    const m = document.createElement('div');
    m.className = `msg ${who}`;
    m.innerHTML = html;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  };
  const START = ['How much do I owe?', 'What is happening on site?', 'What is next?', 'When is handover?', 'Is anything delayed?', 'Show me site photos', 'Talk to the studio'];
  const setChips = list => { $('askChips').innerHTML = list.map(q => `<button type="button">${esc(q)}</button>`).join(''); };

  function openAsk() {
    ask.classList.add('open'); ask.setAttribute('aria-hidden', 'false'); $('askOpen').hidden = true;
    if (!greeted) {
      greeted = true;
      const a = M.active[0];
      const now = a ? `${esc(a.name)} is ${a.progress}% done` : `the work is ${Math.round(M.overall)}% done overall`;
      say(`<p>Hello! I answer from your project's records: dates, costs, site progress and payments. English or Hinglish both work.</p>
        <p class="ask-sub">Right now ${now}${M.dueAmt ? `, and ${rupees(M.dueAmt)} is due` : ''}.</p>`);
      setChips(START);
    }
    setTimeout(() => $('askInput').focus(), 150);
  }
  function closeAsk() {
    ask.classList.remove('open'); ask.setAttribute('aria-hidden', 'true');
    if (M) $('askOpen').hidden = false;
  }
  $('askOpen').addEventListener('click', openAsk);
  $('askClose').addEventListener('click', closeAsk);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && ask.classList.contains('open')) closeAsk(); });

  $('askChips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) send(b.textContent); });
  $('askForm').addEventListener('submit', e => { e.preventDefault(); const v = $('askInput').value.trim(); if (v) { $('askInput').value = ''; send(v); } });

  // "Show me" buttons: scroll to that part of the dashboard and light it up for a moment
  log.addEventListener('click', e => {
    const b = e.target.closest('.ask-jump');
    if (!b) return;
    const el = document.querySelector(b.dataset.jump);
    if (!el) return;
    if (window.innerWidth <= 760) closeAsk();
    if (el.tagName === 'DETAILS') el.open = true;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: el.classList.contains('pt-sec') ? 'start' : 'center' });
    el.classList.remove('pt-flash'); void el.offsetWidth; el.classList.add('pt-flash');
    setTimeout(() => el.classList.remove('pt-flash'), 2200);
  });

  function send(q) {
    say(esc(q), 'me');
    const t = say('<span>•</span><span>•</span><span>•</span>');
    t.classList.add('typing');
    setTimeout(() => {
      t.remove();
      const r = answer(q);
      say(r.html);
      setChips(r.chips || START);
    }, 500 + Math.random() * 300);
  }

  /* Understanding the question: keywords per topic (English, Hinglish, a little Hindi) */
  const TOPICS = {
    change: ['change', 'changes', 'modify', 'replace', 'different', 'alter', 'badal', 'badalna', 'badlna', 'add', 'remove', 'upgrade', 'colour', 'color', 'instead'],
    paid: ['paid', 'diya', 'diye', 'receipt', 'receipts', 'history', 'jama', 'so far', 'already'],
    pay: ['owe', 'due', 'pay', 'pays', 'payment', 'payments', 'balance', 'outstanding', 'pending', 'instalment', 'installment', 'invoice', 'money', 'paisa', 'paise', 'baaki', 'baki', 'bakaya', 'dena', 'dene', 'bhugtan', 'rupees', 'rupaye', 'पैसा', 'बाकी', 'भुगतान'],
    delay: ['delay', 'late', 'behind', 'on track', 'on time', 'slow', 'der', 'deri', 'atka', 'ruka', 'देर'],
    handover: ['handover', 'hand over', 'finish', 'completion', 'move in', 'shift', 'ready', 'deadline', 'end date', 'possession', 'khatam', 'kab tak', 'poora', 'pura', 'din', 'lagenge', 'chabi', 'keys'],
    next: ['next', 'this week', 'upcoming', 'coming', 'aage', 'agla', 'agle', 'after this', 'future', 'आगे'],
    photos: ['photo', 'photos', 'picture', 'pictures', 'pics', 'pic', 'image', 'images', 'tasveer', 'dikhao', 'look like', 'फोटो'],
    site: ['site', 'progress', 'happening', 'status', 'update', 'updates', 'kaam', 'chal', 'going on', 'currently', 'right now', 'काम'],
    cost: ['boq', 'cost', 'costs', 'budget', 'total', 'price', 'quotation', 'quote', 'estimate', 'value', 'kharcha', 'kharch', 'lagat', 'rate', 'kitne', 'खर्चा'],
    contact: ['contact', 'call', 'phone', 'talk', 'speak', 'architect', 'whatsapp', 'number', 'email', 'baat', 'meet', 'meeting', 'visit', 'milna', 'complaint', 'problem', 'issue', 'studio'],
    help: ['help', 'what can you', 'kya puch', 'options', 'madad'],
    thanks: ['thank', 'thanks', 'dhanyavad', 'dhanyawad', 'shukriya', 'ok thanks'],
    hello: ['hello', 'hi', 'hey', 'namaste', 'namaskar', 'good morning', 'good evening', 'नमस्ते']
  };
  const ORDER = Object.keys(TOPICS); // earlier wins a tie
  const WHEN = ['when', 'kab', 'date', 'start', 'begin', 'shuru', 'finish', 'end', 'कब'];
  const STOP = new Set(['what', 'when', 'where', 'which', 'much', 'many', 'does', 'will', 'have', 'about', 'tell', 'status', 'cost', 'costs', 'price', 'start', 'finish', 'stage', 'work', 'works', 'done', 'complete', 'progress', 'there', 'that', 'this', 'with', 'from', 'into', 'kitna', 'kitne', 'hoga', 'total', 'payment', 'amount', 'show', 'photo', 'photos', 'update', 'please', 'your', 'project', 'site', 'going', 'happening', 'paid', 'next', 'handover', 'change', 'colour', 'color', 'different', 'replace', 'instead']);

  function readQuestion(q) {
    const s = ' ' + q.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9ऀ-ॿ]+/g, ' ').trim() + ' ';
    const tokens = s.trim().split(' ');
    const match = k => k.includes(' ') ? s.includes(` ${k} `) : tokens.some(t => t === k || (k.length >= 4 && t.startsWith(k)));
    const score = {};
    ORDER.forEach(k => { score[k] = TOPICS[k].filter(match).length; });
    const top = ORDER.reduce((a, k) => (score[k] > (score[a] || 0) ? k : a), null);
    const words = tokens.filter(w => w.length > 3 && !STOP.has(w));
    const hits = name => {
      const n = String(name).toLowerCase();
      return words.filter(w => n.includes(w) || (w.endsWith('s') && n.includes(w.slice(0, -1)))).length;
    };
    const best = (list, nameOf) => {
      let b = null, n = 0;
      list.forEach((x, k) => { const h = hits(nameOf(x)); if (h > n) { b = { x, k }; n = h; } });
      return b && { ...b, n };
    };
    return { score, top, when: WHEN.some(match), hits, best };
  }

  /* Pieces answers are built from */
  const waLink = q => `https://wa.me/${STUDIO.phone}?text=${encodeURIComponent(`Hello, this is about my project "${M.P.title || ''}"${M.P.location ? ` (${M.P.location})` : ''}.${q ? `\n\n${q}` : ''}`)}`;
  const waBtn = (q, label = 'Ask the studio on WhatsApp') => `<a class="ask-wa" href="${esc(waLink(q))}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i>${esc(label)}</a>`;
  const jumpBtn = (sel, label) => `<button type="button" class="ask-jump" data-jump="${esc(sel)}">${esc(label)} <i class="fa-solid fa-arrow-right"></i></button>`;
  const bar = (pct, label = '') => `<span class="ask-meter">${label ? `<span class="ask-meter-name">${esc(label)}</span>` : ''}<span class="meter thin"><span style="width:${Math.round(pct)}%"></span></span><span>${Math.round(pct)}%</span></span>`;
  const photosOf = ups => ups.flatMap(u => (u.photos || []).map(src => ({ src, stage: u.stage })));
  const thumbs = list => list.length ? `<div class="ask-photos">${list.slice(0, 4).map(p =>
    `<a href="${esc(p.src)}" target="_blank" rel="noopener"><img src="${esc(p.src)}" alt="Site photo: ${esc(p.stage)}" loading="lazy"></a>`).join('')}</div>` : '';
  const inDays = n => n === 0 ? 'today' : n > 0 ? `in ${n} day${n === 1 ? '' : 's'}` : `${-n} day${n === -1 ? '' : 's'} ago`;
  const notYet = what => ({ html: `<p>Your ${what} hasn't been added yet. The studio will put it up soon.</p>${waBtn(`Could you share the ${what} for my project?`)}` });

  function stageAnswer(st, wantPhotos) {
    const k = M.stages.indexOf(st);
    let p;
    if (st.status === 'done') p = `Finished${st.ae ? ` on ${fmtDate(iso(st.ae))}` : ''}${st.late > 0 ? `, ${st.late} days after the plan` : ', on time'}.`;
    else if (st.status === 'active') p = `Started ${fmtDate(iso(st.as))}. Planned to finish ${fmtDate(iso(st.pe))} (${inDays(daysBetween(TODAY, st.pe))}).`;
    else if (st.status === 'late') p = `It was planned to start ${fmtDate(iso(st.ps))} but hasn't started yet, so it is ${st.late} days late.`;
    else p = `Planned to start ${fmtDate(iso(st.ps))} (${inDays(daysBetween(TODAY, st.ps))}) and finish ${fmtDate(iso(st.pe))}.`;
    const ups = M.updates.filter(u => u.stage === st.name);
    const u = ups[0];
    const pics = photosOf(ups);
    return {
      html: `<p><b>${esc(st.name)}</b> ${stageChip(st)}</p>
        ${st.status === 'active' ? bar(st.progress) : ''}
        <p>${p}</p>
        ${u ? `<p class="ask-sub">Latest update, ${shortDate(u.date)}: ${esc(u.note)}</p>` : ''}
        ${wantPhotos && !pics.length ? '<p class="ask-sub">No photos of this stage yet.</p>' : thumbs(pics)}
        ${jumpBtn(`#st-${k}`, 'Show on the timeline')}`,
      chips: ['What is next?', 'Is anything delayed?', `What does ${st.name.toLowerCase()} cost?`]
    };
  }

  function answer(q) {
    const { P, groups, contract, overall, pays, paid, dueNow, dueAmt, stages, active, behind, updates } = M;
    const Q = readQuestion(q);
    const t = Q.top, sc = Q.score;
    const handover = P.handover ? `<b>${fmtDate(P.handover)}</b>` : 'not fixed yet';
    const items = groups.flatMap((g, gk) => g.items.map(i => ({ ...i, group: g.group, gk })));
    const stage = Q.best(stages, s => s.name);
    const item = Q.best(items, i => i.name);
    const group = Q.best(groups, g => g.group);
    const mile = Q.best(pays, p => p.milestone);
    const moneyQ = sc.pay || sc.paid;

    // Changes to design or materials: the studio decides, so hand over with the request filled in
    if (sc.change) {
      const th = item ? { name: item.x.name, done: item.x.done } : group ? { name: group.x.group, done: group.x.done } : stage ? { name: stage.x.name, done: stage.x.progress } : null;
      return {
        html: `<p>Changes to the design, materials or finishes need the studio's go-ahead first, so the cost and dates can be checked.</p>
          ${th ? `<p class="ask-sub">${esc(th.name)} is ${Math.round(th.done)}% done${th.done >= 100 ? ', so it is already finished.' : th.done > 0 ? ', so part of it is already in place.' : ', so there is still time.'}</p>` : ''}
          ${waBtn(q, 'Send this request to the studio')}`,
        chips: ['What is next?', 'Talk to the studio', 'How much do I owe?']
      };
    }

    // Something specific named in the question
    if (mile && moneyQ && (!stage || mile.n >= stage.n)) {
      const p = mile.x;
      const st = { paid: `Paid on ${fmtDate(p.paid)}.`, overdue: `Due ${fmtDate(p.due)}, now ${daysBetween(day(p.due), TODAY)} days overdue.`, due: `Due ${fmtDate(p.due)} (${inDays(daysBetween(TODAY, day(p.due)))}).`, upcoming: p.due ? `Expected around ${fmtDate(p.due)}.` : 'Date to be confirmed.' }[p.status];
      return {
        html: `<p><b>${esc(p.milestone)}</b> ${payChip(p)}</p><p>${+p.pct || 0}% of the contract: <b>${rupees(p.amount)}</b>. ${st}</p>${jumpBtn(`#py-${mile.k}`, 'Show in payments')}`,
        chips: ['How much do I owe?', 'What have I paid so far?', 'What is next?']
      };
    }
    if (stage && !sc.cost && !moneyQ && (!item || stage.n >= item.n)) return stageAnswer(stage.x, sc.photos > 0);
    if (item && item.n > 0 && (!group || item.n >= group.n) && !moneyQ) {
      const i = item.x;
      const st = stages.find(s => s.name === i.group);
      return {
        html: `<p><b>${esc(i.name)}</b> <span class="ask-sub">· ${esc(i.group)}</span></p>
          <p>${i.qty.toLocaleString('en-IN')} ${esc(i.unit)} × ${rupees(i.rate)} = <b>${rupees(i.amount)}</b></p>
          ${bar(i.done, 'Done')}
          ${st && st.status !== 'done' ? `<p class="ask-sub">It's part of ${esc(st.name)}, planned to finish ${fmtDate(iso(st.pe))}.</p>` : ''}
          ${jumpBtn(`#bg-${i.gk}`, 'Show in the BOQ')}`,
        chips: ['What is the total cost?', 'What is next?', 'How much do I owe?']
      };
    }
    if (group && !moneyQ) {
      const g = group.x;
      return {
        html: `<p><b>${esc(g.group)}</b> comes to <b>${rupees(g.amount)}</b> across ${g.items.length} item${g.items.length === 1 ? '' : 's'}.</p>${bar(g.done, 'Done')}${jumpBtn(`#bg-${group.k}`, 'Show in the BOQ')}`,
        chips: ['What is the total cost?', 'Is anything delayed?', 'How much do I owe?']
      };
    }

    // General topics
    if (t === 'paid') {
      if (!pays.length) return notYet('payment schedule');
      const done = pays.filter(p => p.status === 'paid');
      return {
        html: `<p>You have paid <b>${rupees(paid)}</b> of ${rupees(contract)} (${contract ? Math.round(paid / contract * 100) : 0}%).</p>
          ${done.length ? `<ul class="ask-list">${done.map(p => `<li><span>${esc(p.milestone)}<small>${fmtDate(p.paid)}</small></span><b>${rupees(p.amount)}</b></li>`).join('')}</ul>` : ''}
          ${dueAmt ? `<p class="ask-sub">${rupees(dueAmt)} is due now.</p>` : ''}
          ${jumpBtn('#payments', 'Show payments')}`,
        chips: ['How much do I owe?', 'When is the next payment?', 'What is the total cost?']
      };
    }
    if (t === 'pay') {
      if (!pays.length) return notYet('payment schedule');
      const next = pays.find(p => p.status === 'upcoming');
      return {
        html: dueNow.length
          ? `<p>You have <b>${rupees(dueAmt)}</b> due now:</p>
            <ul class="ask-list">${dueNow.map(p => `<li><span>${esc(p.milestone)}<small>${p.status === 'overdue' ? `Overdue by ${daysBetween(day(p.due), TODAY)} days` : `Due ${fmtDate(p.due)}`}</small></span><b>${rupees(p.amount)}</b></li>`).join('')}</ul>
            <p class="ask-sub">Paid so far: ${rupees(paid)} of ${rupees(contract)}.${next ? ` After that: ${rupees(next.amount)} at “${esc(next.milestone)}”${next.due ? `, around ${fmtDate(next.due)}` : ''}.` : ''}</p>
            ${jumpBtn('#payments', 'Show payments')}
            ${waBtn(`I'd like to talk about the payment for "${dueNow[0].milestone}".`, 'Message the studio about this payment')}`
          : `<p>Nothing is due right now.</p><p class="ask-sub">Paid so far: ${rupees(paid)} of ${rupees(contract)}.${next ? ` Next: ${rupees(next.amount)} at “${esc(next.milestone)}”${next.due ? `, around ${fmtDate(next.due)}` : ''}.` : ''}</p>${jumpBtn('#payments', 'Show payments')}`,
        chips: ['What have I paid so far?', 'What is the total cost?', 'What is next?']
      };
    }
    if (t === 'delay') {
      if (!stages.length) return notYet('project timeline');
      const lateDone = stages.filter(x => x.status === 'done' && x.late > 0);
      const lateNow = stages.filter(x => x.status === 'late' || (x.status === 'active' && TODAY > x.pe));
      return {
        html: `<p>${behind > 0 ? `The project is running about <b>${behind} days behind</b> the original plan.` : 'The project is <b>on track</b>.'}</p>
          ${lateNow.length ? `<p>Needs attention: ${lateNow.map(x => esc(x.name)).join(', ')}.</p>` : ''}
          ${lateDone.length ? `<p class="ask-sub">Finished late: ${lateDone.map(x => `${esc(x.name)} (${x.late} days)`).join(', ')}.</p>` : ''}
          <p>Handover is planned for ${handover}.</p>
          ${jumpBtn('#timeline', 'Show the timeline')}
          ${behind > 0 ? waBtn('Could you tell me more about the delay and the plan to catch up?', 'Ask the studio about the delay') : ''}`,
        chips: ['When is handover?', 'What is next?', 'What is happening on site?']
      };
    }
    if (t === 'handover') {
      const left = stages.filter(x => x.status !== 'done');
      return {
        html: `<p>Handover is planned for ${handover}${P.handover ? `, ${inDays(daysBetween(TODAY, day(P.handover)))}` : ''}.</p>
          ${bar(overall, 'Work done')}
          ${left.length ? `<p class="ask-sub">Still to come: ${left.map(x => `${esc(x.name)} (to finish ${shortDate(iso(x.pe))})`).join('; ')}.</p>` : ''}
          ${jumpBtn('#timeline', 'Show the timeline')}`,
        chips: ['Is anything delayed?', 'What is next?', 'How much do I owe?']
      };
    }
    if (t === 'next') {
      if (!stages.length) return notYet('project timeline');
      const soon = stages.filter(x => (x.status === 'upcoming' || x.status === 'late') && daysBetween(TODAY, x.ps) <= 45);
      const pay = dueNow[0] || pays.find(p => p.status === 'upcoming');
      return {
        html: `${active.length ? `<p><b>Now on site</b></p>${active.map(x => `${bar(x.progress, x.name)}<p class="ask-sub">Planned to finish ${fmtDate(iso(x.pe))}.</p>`).join('')}` : '<p>No stage is under way right now.</p>'}
          ${soon.length ? `<p><b>Coming up</b></p><p>${soon.map(x => `${esc(x.name)}, ${x.status === 'late' ? 'due to have started' : 'starting'} ${fmtDate(iso(x.ps))}`).join('<br>')}</p>` : ''}
          ${pay ? `<p><b>Next payment</b></p><p>${rupees(pay.amount)} for “${esc(pay.milestone)}”${pay.due ? `, ${pay.status === 'overdue' ? 'overdue since' : 'due'} ${fmtDate(pay.due)}` : ''}.</p>` : ''}
          ${jumpBtn('#timeline', 'Show the timeline')}`,
        chips: ['Is anything delayed?', 'Show me site photos', 'When is handover?']
      };
    }
    if (t === 'photos') {
      const pics = photosOf(updates);
      if (!pics.length) return { html: '<p>No site photos have been added yet.</p>', chips: START };
      const u = updates.find(x => (x.photos || []).length);
      return {
        html: `<p>Latest site photos, from ${shortDate(u.date)} onwards:</p>${thumbs(pics)}<p class="ask-sub">Tap a photo to open it full size.</p>${jumpBtn('#progress', 'Show all site updates')}`,
        chips: ['What is happening on site?', 'What is next?', 'Is anything delayed?']
      };
    }
    if (t === 'site') {
      const u = updates[0];
      return {
        html: `${bar(overall, 'Overall')}
          ${active.map(x => bar(x.progress, x.name)).join('')}
          ${u ? `<p class="ask-sub">Latest update (${shortDate(u.date)}): ${esc(u.note)}</p>${thumbs(photosOf([u]))}` : ''}
          ${jumpBtn('#progress', 'Show site progress')}`,
        chips: ['What is next?', 'Show me site photos', 'Is anything delayed?']
      };
    }
    if (t === 'cost') {
      if (!groups.length) return notYet('bill of quantities');
      const top = [...groups].sort((a, b) => b.amount - a.amount).slice(0, 3);
      return {
        html: `<p>The total contract value is <b>${rupees(contract)}</b>.</p>
          <ul class="ask-list">${top.map(g => `<li><span>${esc(g.group)}</span><b>${lakh(g.amount)}</b></li>`).join('')}</ul>
          <p class="ask-sub">Ask about any item, for example “cost of wardrobes”.</p>
          ${jumpBtn('#boq', 'Show the BOQ')}`,
        chips: ['Cost of the modular kitchen?', 'What have I paid so far?', 'How much do I owe?']
      };
    }
    if (t === 'contact') {
      return {
        html: `<p>${P.architect ? `Your architect is <b>${esc(P.architect)}</b>.` : 'You can reach the studio here:'}</p>
          <p><a href="tel:+${STUDIO.phone}">${STUDIO.phoneShow}</a><br><a href="mailto:${STUDIO.email}">${STUDIO.email}</a></p>
          ${waBtn('', 'Message on WhatsApp')}`,
        chips: START
      };
    }
    if (t === 'help') {
      return {
        html: `<p>You can ask me things like:</p>
          <ul class="ask-list plain"><li>How much is due, and what have I paid?</li><li>When does painting start?</li><li>What does the wardrobe cost?</li><li>Is anything delayed? When is handover?</li><li>Show me the latest site photos</li></ul>
          <p class="ask-sub">Hinglish works too: “kitna baaki hai?”, “painting kab shuru hogi?”</p>`,
        chips: START
      };
    }
    if (t === 'thanks') return { html: '<p>You\'re welcome! Anything else about your project?</p>', chips: START };
    if (t === 'hello') return { html: '<p>Hello! Ask me about dates, costs, site progress or payments.</p>', chips: START };
    return {
      html: `<p>I couldn't find an answer to that in your project's records.</p>
        <p class="ask-sub">The studio can help. Your question will be filled in for you:</p>
        ${waBtn(q)}
        <p class="ask-sub">Or call <a href="tel:+${STUDIO.phone}">${STUDIO.phoneShow}</a>.</p>`,
      chips: ['What can you answer?', ...START.slice(0, 4)]
    };
  }

  // come back to where this tab was (also used by the staff page's "View as client")
  const saved = session.get();
  if (saved) {
    const pr = saved.project && DATA.projects.find(x => x.id === saved.project);
    USER = saved.user || (pr && pr.login && pr.login.username) || null;
    if (USER && !projectsOf(USER).length) USER = null;
    show(pr && USER ? pr : USER ? (projectsOf(USER).length === 1 ? projectsOf(USER)[0] : 'pick') : null);
  } else show(null);
})();
