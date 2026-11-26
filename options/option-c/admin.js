/* Studio admin - PROTOTYPE. Edits a copy of the portal data saved in this browser (localStorage).
   The live version will save to the private server instead, behind a real staff login. */
(() => {
  if (!window.portalData) return;
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rupees = n => '₹' + Math.round(n || 0).toLocaleString('en-IN');
  const now = new Date();
  const todayISO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const randomPass = () => { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; return Array.from({ length: 8 }, () => c[Math.floor(Math.random() * c.length)]).join(''); };
  const session = {
    get: () => { try { return sessionStorage.getItem('uas-admin') === '1'; } catch (e) { return false; } },
    set: v => { try { v ? sessionStorage.setItem('uas-admin', '1') : sessionStorage.removeItem('uas-admin'); } catch (e) { /* ignore */ } }
  };

  let data = window.portalData();
  let cur = null;        // project being edited (a working copy)
  let tab = 'details';
  let dirty = false;

  const toast = msg => {
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer); toast.timer = setTimeout(() => { t.hidden = true; }, 2600);
  };
  const setDirty = v => {
    dirty = v;
    const s = $('saveState');
    s.textContent = v ? 'Unsaved changes' : (cur && cur.project.updated ? `Saved · updated ${fmtDate(cur.project.updated)}` : '');
    s.classList.toggle('dirty', v);
  };
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  const totals = pr => {
    const contract = (pr.boq || []).reduce((s, g) => s + (g.items || []).reduce((t, i) => t + (+i[1] || 0) * (+i[3] || 0), 0), 0);
    const done = (pr.boq || []).reduce((s, g) => s + (g.items || []).reduce((t, i) => t + (+i[1] || 0) * (+i[3] || 0) * (+i[4] || 0) / 100, 0), 0);
    const today = new Date(todayISO + 'T00:00:00');
    const due = (pr.payments || []).filter(p => !p.paid && p.due && (new Date(p.due + 'T00:00:00') - today) / 86400000 <= 30)
      .reduce((s, p) => s + contract * (+p.pct || 0) / 100, 0);
    return { contract, progress: contract ? done / contract * 100 : 0, due };
  };

  /* ---------- Views ---------- */
  const views = ['loginView', 'listView', 'editView'];
  const showView = v => { views.forEach(id => { $(id).hidden = id !== v; }); window.scrollTo(0, 0); };

  function renderList() {
    $('projectList').innerHTML = data.projects.length ? data.projects.map(pr => {
      const t = totals(pr);
      return `
      <article class="ad-card">
        <div>
          <h3>${esc(pr.project.title || 'Untitled project')}${pr.sample ? ' <span class="chip idle"><i class="fa-solid fa-flask"></i>Sample</span>' : ''}</h3>
          <p>${esc([pr.project.client, pr.project.location].filter(Boolean).join(' · ') || 'No client details yet')}</p>
          <p>Client login: <code>${esc(pr.login.username)}</code>${pr.project.updated ? ` · Updated ${fmtDate(pr.project.updated)}` : ''}</p>
        </div>
        <div class="ad-num">Progress<b>${Math.round(t.progress)}%</b><div class="meter thin"><span style="width:${t.progress}%"></span></div></div>
        <div class="ad-num">Due in 30 days<b>${rupees(t.due)}</b></div>
        <div class="ad-actions">
          <button class="ad-btn ghost small" data-view="${esc(pr.id)}" type="button"><i class="fa-solid fa-eye"></i> View as client</button>
          <button class="ad-btn small" data-edit="${esc(pr.id)}" type="button"><i class="fa-solid fa-pen"></i> Edit</button>
        </div>
      </article>`;
    }).join('') : '<p class="pt-empty">No projects yet. Click “New project” to add one.</p>';
  }

  function openProject(id) {
    const pr = data.projects.find(p => p.id === id);
    if (!pr) return;
    cur = JSON.parse(JSON.stringify(pr));
    ['stages', 'boq', 'payments', 'updates'].forEach(k => { cur[k] = cur[k] || []; });
    tab = 'details';
    setDirty(false);
    showView('editView');
    renderEditor();
  }

  function renderEditor() {
    $('edTitle').textContent = cur.project.title || 'Untitled project';
    $('edEyebrow').textContent = cur.sample ? 'Project · sample data' : 'Project';
    document.querySelectorAll('#edTabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
    ({ details: tabDetails, timeline: tabTimeline, boq: tabBoq, payments: tabPayments, updates: tabUpdates })[tab]();
  }

  /* ---------- Details ---------- */
  function tabDetails() {
    const P = cur.project;
    $('edPanel').innerHTML = `
      <div class="ad-form">
        <label class="pt-field full"><span>Project title</span><input data-d="title" value="${esc(P.title)}" placeholder="e.g. 3BHK Residence Interiors"></label>
        <label class="pt-field"><span>Client name</span><input data-d="client" value="${esc(P.client)}"></label>
        <label class="pt-field"><span>Location</span><input data-d="location" value="${esc(P.location)}" placeholder="Area, City"></label>
        <label class="pt-field"><span>Handover date</span><input type="date" data-d="handover" value="${esc(P.handover)}"></label>
        <label class="pt-field"><span>Project lead</span><input data-d="architect" value="${esc(P.architect)}"></label>
        <h3>Client login</h3>
        <label class="pt-field"><span>Username</span><input data-l="username" value="${esc(cur.login.username)}" autocomplete="off"></label>
        <label class="pt-field"><span>Password</span>
          <span class="ad-inline"><input data-l="password" value="${esc(cur.login.password)}" autocomplete="off">
          <button class="ad-btn ghost small" id="genPass" type="button" title="Make a new random password"><i class="fa-solid fa-dice"></i> New</button></span>
        </label>
        <p class="ad-hint full">Share these with the client. In the live version the password is stored securely and the client can change it.</p>
        <h3>Remove project</h3>
        <div class="full"><button class="ad-btn danger" id="deleteProject" type="button"><i class="fa-solid fa-trash"></i> Delete this project</button></div>
      </div>`;
  }

  /* ---------- Timeline ---------- */
  const STAGE_TEMPLATE = ['Design & approvals', 'Demolition & civil', 'Electrical & plumbing', 'False ceiling', 'Flooring & tiling', 'Carpentry & furniture', 'Painting & polish', 'Lights, fixtures & handover'];
  function tabTimeline() {
    const rows = cur.stages.map((s, i) => {
      const bad = s.planned[0] && s.planned[1] && s.planned[1] < s.planned[0];
      return `
      <tr${bad ? ' class="bad"' : ''}>
        <td><input class="w-name" data-st="${i}:name" value="${esc(s.name)}" aria-label="Stage name"></td>
        <td><input type="date" data-st="${i}:ps" value="${esc(s.planned[0] || '')}" aria-label="Planned start"></td>
        <td><input type="date" data-st="${i}:pe" value="${esc(s.planned[1] || '')}" aria-label="Planned finish"></td>
        <td><input type="date" data-st="${i}:as" value="${esc((s.actual || [])[0] || '')}" aria-label="Actual start"></td>
        <td><input type="date" data-st="${i}:ae" value="${esc((s.actual || [])[1] || '')}" aria-label="Actual finish"></td>
        <td><input type="number" min="0" max="100" step="5" class="w-pct" data-st="${i}:progress" value="${+s.progress || 0}" aria-label="Percent done"></td>
        <td><div class="ad-row-btns">
          <button class="ad-icon" data-move="${i}:-1" type="button" aria-label="Move up"${i === 0 ? ' disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button>
          <button class="ad-icon" data-move="${i}:1" type="button" aria-label="Move down"${i === cur.stages.length - 1 ? ' disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button>
          <button class="ad-icon del" data-delstage="${i}" type="button" aria-label="Delete stage"><i class="fa-solid fa-trash"></i></button>
        </div></td>
      </tr>`;
    }).join('');
    const bad = cur.stages.some(s => s.planned[0] && s.planned[1] && s.planned[1] < s.planned[0]);
    $('edPanel').innerHTML = `
      <h2>Timeline</h2>
      <p class="ad-hint">Planned dates come from the schedule. Fill in actual dates as stages start and finish, and the % done as work moves. A stage at 100% counts as finished.</p>
      ${bad ? '<p class="ad-warn"><i class="fa-solid fa-circle-exclamation"></i>A stage finishes before it starts. Check its planned dates.</p>' : ''}
      ${cur.stages.length ? `<div class="ad-table-wrap"><table class="ad-table">
        <thead><tr><th>Stage</th><th>Planned start</th><th>Planned finish</th><th>Actual start</th><th>Actual finish</th><th class="n">% done</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>` : '<p class="pt-empty">No stages yet.</p>'}
      <div class="ad-actions ad-add">
        <button class="ad-btn ghost small" id="addStage" type="button"><i class="fa-solid fa-plus"></i> Add stage</button>
        ${cur.stages.length ? '' : '<button class="ad-btn ghost small" id="stageTemplate" type="button"><i class="fa-solid fa-list"></i> Start from the usual interior stages</button>'}
      </div>`;
  }

  /* ---------- BOQ ---------- */
  function tabBoq() {
    const t = totals(cur);
    $('edPanel').innerHTML = `
      <h2>Bill of quantities</h2>
      <p class="ad-hint">Group items by trade. Amounts work out from quantity × rate. “% done” drives the client's overall progress.</p>
      ${cur.boq.map((g, gi) => `
        <div class="ad-group">
          <div class="ad-group-head">
            <input class="ad-in" data-bg="${gi}" value="${esc(g.group)}" aria-label="Group name" placeholder="Group, e.g. Carpentry">
            <span class="ad-sub" data-calc="g${gi}">${rupees((g.items || []).reduce((s, i) => s + (+i[1] || 0) * (+i[3] || 0), 0))}</span>
            <button class="ad-icon del" data-delgroup="${gi}" type="button" aria-label="Delete group"><i class="fa-solid fa-trash"></i></button>
          </div>
          <div class="ad-table-wrap"><table class="ad-table">
            <thead><tr><th>Item</th><th class="n">Qty</th><th>Unit</th><th class="n">Rate (₹)</th><th class="n">Amount</th><th class="n">% done</th><th></th></tr></thead>
            <tbody>${(g.items || []).map((it, ii) => `
              <tr>
                <td><input class="w-name" data-bi="${gi}:${ii}:0" value="${esc(it[0])}" aria-label="Item"></td>
                <td><input type="number" min="0" step="any" class="w-num" data-bi="${gi}:${ii}:1" value="${esc(it[1])}" aria-label="Quantity"></td>
                <td><input class="w-unit" data-bi="${gi}:${ii}:2" value="${esc(it[2])}" aria-label="Unit" list="units"></td>
                <td><input type="number" min="0" step="any" class="w-num" data-bi="${gi}:${ii}:3" value="${esc(it[3])}" aria-label="Rate"></td>
                <td class="calc" data-calc="i${gi}-${ii}">${rupees((+it[1] || 0) * (+it[3] || 0))}</td>
                <td><input type="number" min="0" max="100" step="5" class="w-pct" data-bi="${gi}:${ii}:4" value="${+it[4] || 0}" aria-label="Percent done"></td>
                <td><div class="ad-row-btns"><button class="ad-icon del" data-delitem="${gi}:${ii}" type="button" aria-label="Delete item"><i class="fa-solid fa-trash"></i></button></div></td>
              </tr>`).join('')}
            </tbody></table></div>
          <button class="ad-btn ghost small ad-add" data-additem="${gi}" type="button"><i class="fa-solid fa-plus"></i> Add item</button>
        </div>`).join('')}
      <datalist id="units"><option value="sq ft"><option value="rft"><option value="nos"><option value="LS"><option value="points"><option value="sets"><option value="cu m"></datalist>
      <button class="ad-btn ghost small" id="addGroup" type="button"><i class="fa-solid fa-plus"></i> Add group</button>
      <div class="ad-sum"><span>Total contract value</span><b data-calc="total">${rupees(t.contract)}</b></div>`;
  }

  /* ---------- Payments ---------- */
  function tabPayments() {
    const t = totals(cur);
    const sum = cur.payments.reduce((s, p) => s + (+p.pct || 0), 0);
    $('edPanel').innerHTML = `
      <h2>Payments</h2>
      <p class="ad-hint">Each instalment is a share of the contract value (${rupees(t.contract)}, from the BOQ). Enter the date when a payment is received.</p>
      <p class="ad-warn" id="pctWarn"${Math.round(sum) === 100 || !cur.payments.length ? ' hidden' : ''}><i class="fa-solid fa-circle-exclamation"></i><span>The shares add up to <b data-calc="pct">${sum}%</b>; they should add up to 100%.</span></p>
      ${cur.payments.length ? `<div class="ad-table-wrap"><table class="ad-table">
        <thead><tr><th>Milestone</th><th class="n">Share %</th><th class="n">Amount</th><th>Due date</th><th>Received on</th><th></th></tr></thead>
        <tbody>${cur.payments.map((p, i) => `
          <tr>
            <td><input class="w-name" data-py="${i}:milestone" value="${esc(p.milestone)}" aria-label="Milestone"></td>
            <td><input type="number" min="0" max="100" step="any" class="w-pct" data-py="${i}:pct" value="${esc(p.pct)}" aria-label="Share percent"></td>
            <td class="calc" data-calc="p${i}">${rupees(t.contract * (+p.pct || 0) / 100)}</td>
            <td><input type="date" data-py="${i}:due" value="${esc(p.due || '')}" aria-label="Due date"></td>
            <td><input type="date" data-py="${i}:paid" value="${esc(p.paid || '')}" aria-label="Date received"></td>
            <td><div class="ad-row-btns">
              <button class="ad-btn ghost small" data-paidtoday="${i}" type="button"${p.paid ? ' hidden' : ''}>Received today</button>
              <button class="ad-icon del" data-delpay="${i}" type="button" aria-label="Delete instalment"><i class="fa-solid fa-trash"></i></button>
            </div></td>
          </tr>`).join('')}
        </tbody></table></div>` : '<p class="pt-empty">No instalments yet.</p>'}
      <button class="ad-btn ghost small ad-add" id="addPay" type="button"><i class="fa-solid fa-plus"></i> Add instalment</button>`;
  }

  /* ---------- Site updates ---------- */
  let draftPhotos = [];
  function tabUpdates() {
    const stages = cur.stages.map(s => s.name).filter(Boolean);
    const list = [...cur.updates].map((u, i) => ({ u, i })).sort((a, b) => (b.u.date || '').localeCompare(a.u.date || ''));
    $('edPanel').innerHTML = `
      <h2>Site updates</h2>
      <p class="ad-hint">Post what happened on site, with photos. The client sees the newest first.</p>
      <form class="ad-upd-form" id="updForm">
        <div class="ad-form">
          <label class="pt-field"><span>Date</span><input type="date" name="date" value="${todayISO}" required></label>
          <label class="pt-field"><span>Stage</span><select name="stage">${stages.map(s => `<option>${esc(s)}</option>`).join('')}<option value="">General</option></select></label>
          <label class="pt-field full"><span>What happened</span><textarea name="note" required placeholder="e.g. Living room tiles laid; kitchen platform fixed tomorrow."></textarea></label>
          <div class="full">
            <label class="ad-btn ghost small ad-file"><i class="fa-solid fa-camera"></i> Add photos<input type="file" id="updPhotos" accept="image/*" multiple></label>
            <div class="ad-thumbs" id="draftThumbs" style="margin-top:10px"></div>
          </div>
          <div class="full"><button class="ad-btn" type="submit"><i class="fa-solid fa-paper-plane"></i> Post update</button></div>
        </div>
      </form>
      ${list.length ? list.map(({ u, i }) => `
        <article class="ad-upd">
          <div class="up-date">${fmtDate(u.date)}</div>
          <div>
            <p class="up-stage">${esc(u.stage || 'General')}</p>
            <p class="up-note">${esc(u.note)}</p>
            ${(u.photos || []).length ? `<div class="up-photos">${u.photos.map(src => `<a href="${esc(src)}" target="_blank" rel="noopener"><img src="${esc(src)}" alt="" loading="lazy"></a>`).join('')}</div>` : ''}
          </div>
          <div><button class="ad-icon del" data-delupd="${i}" type="button" aria-label="Delete update"><i class="fa-solid fa-trash"></i></button></div>
        </article>`).join('') : '<p class="pt-empty">No updates yet.</p>'}`;
    drawDraft();
  }
  const drawDraft = () => {
    const box = $('draftThumbs');
    if (box) box.innerHTML = draftPhotos.map((src, k) => `<figure><img src="${src}" alt=""><button type="button" data-undraft="${k}" aria-label="Remove photo">✕</button></figure>`).join('');
  };
  // Shrink photos before storing them (browser storage is small; the live version uploads them to the server)
  const shrink = file => new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('not an image')); };
    img.src = url;
  });

  /* ---------- Editing: typed changes update the working copy ---------- */
  $('edPanel').addEventListener('input', e => {
    const el = e.target, v = el.value;
    if (el.dataset.d !== undefined) { cur.project[el.dataset.d] = v; if (el.dataset.d === 'title') $('edTitle').textContent = v || 'Untitled project'; }
    else if (el.dataset.l !== undefined) cur.login[el.dataset.l] = v.trim();
    else if (el.dataset.st) {
      const [i, f] = el.dataset.st.split(':'), s = cur.stages[+i];
      s.actual = s.actual || [null, null];
      if (f === 'name') s.name = v;
      else if (f === 'progress') s.progress = Math.max(0, Math.min(100, +v || 0));
      else if (f === 'ps') s.planned[0] = v || null; else if (f === 'pe') s.planned[1] = v || null;
      else if (f === 'as') s.actual[0] = v || null; else if (f === 'ae') s.actual[1] = v || null;
    }
    else if (el.dataset.bg !== undefined) cur.boq[+el.dataset.bg].group = v;
    else if (el.dataset.bi) {
      const [g, i, c] = el.dataset.bi.split(':').map(Number);
      cur.boq[g].items[i][c] = c === 0 || c === 2 ? v : (c === 4 ? Math.max(0, Math.min(100, +v || 0)) : (v === '' ? 0 : +v));
      const it = cur.boq[g].items[i];
      document.querySelector(`[data-calc="i${g}-${i}"]`).textContent = rupees((+it[1] || 0) * (+it[3] || 0));
      document.querySelector(`[data-calc="g${g}"]`).textContent = rupees(cur.boq[g].items.reduce((s, x) => s + (+x[1] || 0) * (+x[3] || 0), 0));
      document.querySelector('[data-calc="total"]').textContent = rupees(totals(cur).contract);
    }
    else if (el.dataset.py) {
      const [i, f] = el.dataset.py.split(':'), p = cur.payments[+i];
      p[f] = f === 'pct' ? (v === '' ? 0 : +v) : (v || (f === 'milestone' ? '' : null));
      if (f === 'pct') {
        const c = totals(cur).contract, sum = cur.payments.reduce((s, x) => s + (+x.pct || 0), 0);
        document.querySelector(`[data-calc="p${i}"]`).textContent = rupees(c * (+p.pct || 0) / 100);
        document.querySelector('[data-calc="pct"]').textContent = `${sum}%`;
        $('pctWarn').hidden = Math.round(sum) === 100;
      }
      if (f === 'paid') { const b = document.querySelector(`[data-paidtoday="${i}"]`); if (b) b.hidden = !!p.paid; }
    }
    else return;
    setDirty(true);
  });
  // date fields: re-check the "finishes before it starts" warning when they change
  $('edPanel').addEventListener('change', e => { if (e.target.dataset.st && /:p[se]$/.test(e.target.dataset.st)) tabTimeline(); });

  /* ---------- Editing: buttons ---------- */
  const restructure = fn => { fn(); setDirty(true); renderEditor(); };
  $('edPanel').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;
    if (b.id === 'genPass') { cur.login.password = randomPass(); setDirty(true); renderEditor(); }
    else if (b.id === 'deleteProject') {
      if (!confirm(`Delete “${cur.project.title || 'this project'}”? The client will no longer be able to log in.`)) return;
      data.projects = data.projects.filter(p => p.id !== cur.id);
      if (persist()) { setDirty(false); cur = null; toast('Project deleted'); renderList(); showView('listView'); }
    }
    else if (b.id === 'addStage') restructure(() => cur.stages.push({ name: '', planned: [null, null], actual: [null, null], progress: 0 }));
    else if (b.id === 'stageTemplate') restructure(() => { cur.stages = STAGE_TEMPLATE.map(name => ({ name, planned: [null, null], actual: [null, null], progress: 0 })); });
    else if (d.move) restructure(() => { const [i, s] = d.move.split(':').map(Number); const a = cur.stages; [a[i], a[i + s]] = [a[i + s], a[i]]; });
    else if (d.delstage) { if (confirm('Delete this stage?')) restructure(() => cur.stages.splice(+d.delstage, 1)); }
    else if (b.id === 'addGroup') restructure(() => cur.boq.push({ group: '', items: [['', 1, 'nos', 0, 0]] }));
    else if (d.additem) restructure(() => cur.boq[+d.additem].items.push(['', 1, 'nos', 0, 0]));
    else if (d.delitem) restructure(() => { const [g, i] = d.delitem.split(':').map(Number); cur.boq[g].items.splice(i, 1); });
    else if (d.delgroup) { if (confirm('Delete this group and all its items?')) restructure(() => cur.boq.splice(+d.delgroup, 1)); }
    else if (b.id === 'addPay') restructure(() => cur.payments.push({ milestone: '', pct: 0, due: null, paid: null }));
    else if (d.paidtoday) restructure(() => { cur.payments[+d.paidtoday].paid = todayISO; });
    else if (d.delpay) { if (confirm('Delete this instalment?')) restructure(() => cur.payments.splice(+d.delpay, 1)); }
    else if (d.delupd) { if (confirm('Delete this site update?')) restructure(() => cur.updates.splice(+d.delupd, 1)); }
    else if (d.undraft) { draftPhotos.splice(+d.undraft, 1); drawDraft(); }
  });
  $('edPanel').addEventListener('change', async e => {
    if (e.target.id !== 'updPhotos') return;
    for (const f of e.target.files) {
      try { draftPhotos.push(await shrink(f)); } catch (err) { toast(`${f.name} isn't a photo the browser can read`); }
    }
    e.target.value = '';
    drawDraft();
  });
  $('edPanel').addEventListener('submit', e => {
    if (e.target.id !== 'updForm') return;
    e.preventDefault();
    const f = e.target;
    if (!f.note.value.trim()) { f.note.focus(); return; }
    cur.updates.push({ date: f.date.value || todayISO, stage: f.stage.value, note: f.note.value.trim(), photos: draftPhotos });
    draftPhotos = [];
    setDirty(true);
    renderEditor();
    toast('Update added. Click Save to publish it to the client.');
  });

  /* ---------- Save ---------- */
  function persist() {
    try { window.savePortalData(data); return true; }
    catch (err) {
      toast('This browser has no room left to save. Remove some photos; the live version stores photos on the server.');
      data = window.portalData();
      return false;
    }
  }
  function save() {
    const u = cur.login.username.trim().toLowerCase();
    if (!u || !cur.login.password) { tab = 'details'; renderEditor(); toast('The client needs a username and password.'); return false; }
    if (data.projects.some(p => p.id !== cur.id && p.login.username.toLowerCase() === u)) {
      tab = 'details'; renderEditor(); toast(`Another project already uses the username “${u}”.`); return false;
    }
    cur.project.updated = todayISO;
    const copy = JSON.parse(JSON.stringify(cur));
    const at = data.projects.findIndex(p => p.id === cur.id);
    const before = JSON.stringify(data.projects);
    if (at < 0) data.projects.push(copy); else data.projects[at] = copy;
    if (!persist()) { data.projects = JSON.parse(before); return false; }
    setDirty(false);
    toast('Saved. The client portal shows the changes.');
    return true;
  }
  $('saveBtn').addEventListener('click', save);
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 's' && !$('editView').hidden) { e.preventDefault(); save(); } });

  const viewAsClient = id => {
    try { sessionStorage.setItem('uas-portal-client', id); } catch (e) { /* ignore */ }
    window.open('portal.html', '_blank');
  };
  $('viewClient').addEventListener('click', () => {
    if (dirty && !confirm('Save your changes first, so the client view shows them?')) return;
    if (dirty && !save()) return;
    viewAsClient(cur.id);
  });
  $('edTabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { tab = b.dataset.tab; renderEditor(); } });
  $('backToList').addEventListener('click', () => {
    if (dirty && !confirm('Leave without saving? Your changes to this project will be lost.')) return;
    setDirty(false); cur = null; data = window.portalData(); renderList(); showView('listView');
  });

  /* ---------- Project list actions ---------- */
  $('projectList').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) openProject(b.dataset.edit);
    if (b.dataset.view) viewAsClient(b.dataset.view);
  });
  $('newProject').addEventListener('click', () => {
    const id = `p-${Date.now().toString(36)}`;
    cur = {
      id, login: { username: `client${Math.floor(100 + Math.random() * 900)}`, password: randomPass() },
      project: { title: '', location: '', client: '', architect: '', handover: null, updated: null },
      stages: [], boq: [], updates: [],
      payments: [
        { milestone: 'Booking advance', pct: 10, due: null, paid: null },
        { milestone: 'Design sign-off', pct: 15, due: null, paid: null },
        { milestone: 'Civil & services complete', pct: 25, due: null, paid: null },
        { milestone: 'Flooring & ceiling complete', pct: 20, due: null, paid: null },
        { milestone: 'Carpentry complete', pct: 20, due: null, paid: null },
        { milestone: 'Handover', pct: 10, due: null, paid: null }
      ]
    };
    tab = 'details';
    setDirty(true);
    showView('editView');
    renderEditor();
    document.querySelector('[data-d="title"]').focus();
  });
  $('resetData').addEventListener('click', () => {
    if (!confirm('Put back the original sample project and remove everything added in this browser?')) return;
    try { localStorage.removeItem(window.PORTAL_KEY); } catch (e) { /* ignore */ }
    data = window.portalData(); renderList(); toast('Sample data restored');
  });
  // keep the username tidy when a title is typed for a new project
  $('edPanel').addEventListener('focusout', e => {
    if (e.target.dataset.d === 'title' && /^client\d{3}$/.test(cur.login.username) && cur.project.title) {
      cur.login.username = slug(cur.project.title).slice(0, 20) || cur.login.username;
      if (tab === 'details') { const u = document.querySelector('[data-l="username"]'); if (u) u.value = cur.login.username; }
    }
  });

  /* ---------- Staff log in ---------- */
  $('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, err = $('loginError');
    if (f.username.value.trim().toLowerCase() !== data.admin.username || f.password.value !== data.admin.password) {
      err.textContent = 'That username and password don\'t match.'; err.hidden = false; return;
    }
    err.hidden = true; session.set(true); renderList(); showView('listView');
  });
  $('fillDemo').addEventListener('click', () => { const f = $('loginForm'); f.username.value = 'admin'; f.password.value = 'admin123'; f.querySelector('.pt-submit').focus(); });
  document.querySelector('.pt-show').addEventListener('click', e => {
    const inp = $('loginForm').password, b = e.currentTarget, on = inp.type === 'password';
    inp.type = on ? 'text' : 'password';
    b.innerHTML = `<i class="fa-regular ${on ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
  });
  $('logout').addEventListener('click', () => { session.set(false); $('loginForm').reset(); showView('loginView'); });

  if (session.get()) { renderList(); showView('listView'); } else showView('loginView');
})();
