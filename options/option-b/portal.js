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
  const session = {
    get: () => { try { return sessionStorage.getItem('uas-portal-client'); } catch (e) { return null; } },
    set: v => { try { v ? sessionStorage.setItem('uas-portal-client', v) : sessionStorage.removeItem('uas-portal-client'); } catch (e) { /* ignore */ } }
  };
  const DATA = window.portalData();

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
    $('ptMeta').textContent = [P.location, P.client, P.updated && `Updated ${fmtDate(P.updated)}`].filter(Boolean).join(' · ');
    $('ptSample').hidden = !M.pr.sample;

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
      <details class="boq-g"${k === 0 ? ' open' : ''}>
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
      <tbody>${pays.map(p => `
        <tr><td class="strong">${esc(p.milestone)}</td><td class="n">${+p.pct || 0}%</td><td class="n strong">${rupees(p.amount)}</td>
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
      ${stages.map(s => {
        const actEnd = s.ae || (s.as ? (TODAY > s.as ? TODAY : s.as) : null);
        return `
        <div class="g-row">
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
  const show = pr => {
    M = pr ? compute(pr) : null;
    $('loginView').hidden = !!pr;
    $('dashView').hidden = !pr;
    $('askOpen').hidden = !pr;
    closeAsk();
    log.innerHTML = ''; greeted = false;
    if (pr) render();
    window.scrollTo(0, 0);
  };
  $('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, u = f.username.value.trim().toLowerCase(), p = f.password.value;
    const err = $('loginError');
    if (!u || !p) { err.textContent = 'Please enter your username and password.'; err.hidden = false; return; }
    const pr = DATA.projects.find(x => x.login && x.login.username.toLowerCase() === u && x.login.password === p);
    if (!pr) {
      err.textContent = 'That username and password don\'t match. Check them, or call the studio to reset your login.';
      err.hidden = false; return;
    }
    err.hidden = true;
    session.set(pr.id);
    show(pr);
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
  $('logout').addEventListener('click', () => { session.set(null); $('loginForm').reset(); show(null); });

  /* Section tabs: underline the one in view */
  const tabs = [...document.querySelectorAll('.pt-tabs a')];
  const secObs = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) tabs.forEach(t => t.classList.toggle('on', t.hash === `#${en.target.id}`)); });
  }, { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('.pt-sec').forEach(s => secObs.observe(s));

  /* ---------- Assistant (prototype: rules over the project data) ---------- */
  const ask = $('ask'), log = $('askLog');
  let greeted = false;
  const say = (html, who = 'bot') => {
    const m = document.createElement('div');
    m.className = `msg ${who}`;
    m.innerHTML = html;
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  };
  function openAsk() {
    ask.classList.add('open'); ask.setAttribute('aria-hidden', 'false'); $('askOpen').hidden = true;
    if (!greeted) {
      greeted = true;
      say(`<p>Hello! I can tell you about your project's timeline, costs, site progress and payments.</p><p>What would you like to know?</p>`);
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

  const SUGGEST = ['How much do I owe?', 'When is handover?', 'What is happening on site?', 'Is anything delayed?', 'What is the total cost?'];
  $('askChips').innerHTML = SUGGEST.map(q => `<button type="button">${esc(q)}</button>`).join('');
  $('askChips').addEventListener('click', e => { const b = e.target.closest('button'); if (b) send(b.textContent); });
  $('askForm').addEventListener('submit', e => { e.preventDefault(); const v = $('askInput').value.trim(); if (v) { $('askInput').value = ''; send(v); } });

  function send(q) {
    say(esc(q), 'me');
    const t = say('<span>•</span><span>•</span><span>•</span>');
    t.classList.add('typing');
    setTimeout(() => { t.remove(); say(answer(q)); }, 650);
  }

  function answer(q) {
    const { P, groups, contract, overall, pays, paid, dueNow, stages, active, behind, updates } = M;
    const s = q.toLowerCase();
    const has = (...w) => w.some(x => s.includes(x));
    // a specific BOQ item or group named in the question
    const words = s.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !['cost', 'much', 'what', 'price', 'does', 'will', 'when', 'have', 'the', 'total'].includes(w));
    const hit = name => { const n = String(name).toLowerCase(); return words.filter(w => n.includes(w)).length; };
    const items = groups.flatMap(g => g.items.map(i => ({ ...i, group: g.group })));
    const bestItem = items.map(i => ({ i, n: hit(i.name) })).sort((a, b) => b.n - a.n)[0];
    const bestGroup = groups.map(g => ({ g, n: hit(g.group) })).sort((a, b) => b.n - a.n)[0];
    const handover = P.handover ? `<b>${fmtDate(P.handover)}</b>` : 'not fixed yet';

    if (has('owe', 'due', 'pay', 'balance', 'outstanding', 'pending', 'installment', 'instalment', 'invoice')) {
      if (!pays.length) return '<p>Your payment schedule hasn\'t been added yet. The studio will share it soon.</p>';
      const lines = dueNow.map(p => `<b>${rupees(p.amount)}</b> for “${esc(p.milestone)}”, due ${fmtDate(p.due)}${p.status === 'overdue' ? ` (overdue by ${daysBetween(day(p.due), TODAY)} days)` : ''}`);
      const next = pays.find(p => p.status === 'upcoming');
      return `<p>${dueNow.length ? `You have ${lines.join(' and ')}.` : 'Nothing is due right now.'}</p>
        <p>Paid so far: ${rupees(paid)} of ${rupees(contract)}.${next ? ` The next instalment after that is ${rupees(next.amount)} at “${esc(next.milestone)}”${next.due ? `, around ${fmtDate(next.due)}` : ''}.` : ''}</p>`;
    }
    if (has('delay', 'late', 'behind', 'on track', 'on time', 'slow')) {
      const lateDone = stages.filter(x => x.status === 'done' && x.late > 0);
      return `<p>${behind > 0 ? `The project is running about <b>${behind} days behind</b> the original plan.` : 'The project is on track.'}</p>
        ${lateDone.length ? `<p>Stages that finished late: ${lateDone.map(x => `${esc(x.name)} (${x.late} days)`).join(', ')}.</p>` : ''}
        <p>Handover is planned for ${handover}. ${active.length ? `${esc(active[0].name)} is ${active[0].progress}% done.` : ''}</p>`;
    }
    if (has('handover', 'finish', 'complete', 'move in', 'ready', 'deadline', 'end date')) {
      const left = stages.filter(x => x.status !== 'done');
      return `<p>Handover is planned for ${handover}.</p>
        ${left.length ? `<p>Still to come: ${left.map(x => `${esc(x.name)} (planned to finish ${shortDate(iso(x.pe))})`).join('; ')}.</p>` : ''}`;
    }
    if (bestItem && bestItem.n > 0 && (!bestGroup || bestItem.n >= bestGroup.n)) {
      const i = bestItem.i;
      return `<p><b>${esc(i.name)}</b> (${esc(i.group)}): ${i.qty.toLocaleString('en-IN')} ${esc(i.unit)} at ${rupees(i.rate)} = <b>${rupees(i.amount)}</b>.</p><p>${i.done}% of it is done.</p>`;
    }
    if (bestGroup && bestGroup.n > 0) {
      const g = bestGroup.g;
      return `<p><b>${esc(g.group)}</b> comes to <b>${rupees(g.amount)}</b> across ${g.items.length} items, and is ${Math.round(g.done)}% done.</p>`;
    }
    if (has('boq', 'cost', 'budget', 'total', 'price', 'quotation', 'estimate', 'value')) {
      if (!groups.length) return '<p>Your bill of quantities hasn\'t been added yet.</p>';
      const top = [...groups].sort((a, b) => b.amount - a.amount).slice(0, 3);
      return `<p>The total contract value is <b>${rupees(contract)}</b>. The largest parts are ${top.map(g => `${esc(g.group)} (${lakh(g.amount)})`).join(', ')}.</p><p>Ask me about any item, for example “cost of wardrobes”.</p>`;
    }
    if (has('site', 'progress', 'happening', 'status', 'now', 'update', 'photo', 'work')) {
      const u = updates[0];
      return `<p>Overall the work is <b>${Math.round(overall)}% done</b> by value.</p>
        ${active.length ? `<p>${active.map(x => `${esc(x.name)}: ${x.progress}%`).join('; ')}.</p>` : ''}
        ${u ? `<p>Latest update (${shortDate(u.date)}): ${esc(u.note)}</p>` : ''}`;
    }
    if (has('hello', 'hi ', 'hey', 'namaste', 'thank')) return `<p>${has('thank') ? 'You\'re welcome!' : 'Hello!'} Ask me about dates, costs, site progress or payments.</p>`;
    return `<p>In this prototype I can answer about the timeline, handover, delays, BOQ items, site progress and payments.</p><p>For anything else, call the studio on <a href="tel:+919869825589">+91 98698 25589</a>.</p>`;
  }

  const id = session.get();
  show(id ? DATA.projects.find(x => x.id === id) || null : null);
})();
