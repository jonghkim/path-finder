/* Pathfinder app — vanilla JS, Firebase compat v8, Quill for notes. */
(function () {
  'use strict';

  // ---------------------------------------------------------------- utils
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const pad = n => String(n).padStart(2, '0');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseDay = s => new Date(s + 'T12:00:00');
  const todayKey = () => dateKey(new Date());
  const daysUntil = s => Math.round((parseDay(s) - parseDay(todayKey())) / 86400000);
  const addDays = (s, n) => { const d = parseDay(s); d.setDate(d.getDate() + n); return dateKey(d); };
  const fmtShort = s => { const d = parseDay(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
  const fmtLong = s => parseDay(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fmtDow = s => parseDay(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dLabel = n => n === 0 ? 'D-Day' : n > 0 ? `D-${n}` : `D+${-n}`;
  const minsToHM = m => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  const hmToMins = s => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const CATS = {
    research: { label: 'Research', v: 'var(--cat-research)' },
    jobmarket: { label: 'Job market', v: 'var(--cat-jobmarket)' },
    math: { label: 'Math', v: 'var(--cat-math)' },
    application: { label: 'Application', v: 'var(--cat-application)' },
    other: { label: 'Other', v: 'var(--cat-other)' }
  };
  const catVar = c => (CATS[c] || CATS.other).v;
  const STATUS = { 'on-track': 'On track', 'at-risk': 'At risk', blocked: 'Blocked', done: 'Done' };

  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), 1800);
  }

  // ---------------------------------------------------------------- crypto + store
  const SECRET = window.PF_SECRET;
  const encrypt = s => CryptoJS.AES.encrypt(s, SECRET).toString();
  const decrypt = s => { try { const t = CryptoJS.AES.decrypt(s, SECRET).toString(CryptoJS.enc.Utf8); return t || s; } catch (e) { return s; } };

  firebase.initializeApp(window.PF_FIREBASE_CONFIG);
  const auth = firebase.auth();
  const db = firebase.firestore();

  const Store = {
    user: null,
    col() { return db.collection('users').doc(this.user).collection('goals'); },
    cacheKey(doc) { return `pf:${this.user}:${doc}`; },
    // Raw string value (legacy Quill HTML or JSON). Cache-first, then network.
    async getRaw(doc) {
      try {
        const snap = await this.col().doc(doc).get();
        const v = snap.exists ? decrypt(snap.data().value || '') : null;
        try { if (v != null) localStorage.setItem(this.cacheKey(doc), v); else localStorage.removeItem(this.cacheKey(doc)); } catch (e) {}
        return v;
      } catch (e) {
        console.warn('offline read', doc, e);
        try { return localStorage.getItem(this.cacheKey(doc)); } catch (e2) { return null; }
      }
    },
    cached(doc) { try { return localStorage.getItem(this.cacheKey(doc)); } catch (e) { return null; } },
    async getJSON(doc) { const raw = await this.getRaw(doc); if (!raw) return null; try { return JSON.parse(raw); } catch (e) { return null; } },
    cachedJSON(doc) { const raw = this.cached(doc); if (!raw) return null; try { return JSON.parse(raw); } catch (e) { return null; } },
    _pending: {},
    setRaw(doc, value) {
      try { localStorage.setItem(this.cacheKey(doc), value); } catch (e) {}
      clearTimeout(this._pending[doc]);
      this._pending[doc] = setTimeout(() => {
        this.col().doc(doc).set({ value: encrypt(value) }).catch(err => { console.error('save failed', doc, err); toast('Save failed — will retry on next change'); });
      }, 500);
    },
    setJSON(doc, obj) { this.setRaw(doc, JSON.stringify(obj)); },
    flush() { Object.keys(this._pending).forEach(k => clearTimeout(this._pending[k])); }
  };

  // ---------------------------------------------------------------- state
  const DEFAULT_SETTINGS = {
    theme: 'auto', work: 25, brk: 5, longBrk: 15, autoCycle: true, sound: true, dayStart: 7, dayEnd: 24,
    mottos: ['끝날 때까지는 끝난 게 아니다.', '길고 짧은 건 대봐야 안다.', 'Try again from a different angle.']
  };
  const S = {
    view: 'today',
    goals: [],
    settings: { ...DEFAULT_SETTINGS },
    dayKey: todayKey(),
    day: null,          // { musts:[{id,text,done,goalId,minutes,start?}], sessions:[] }
    loaded: false,
    notesTab: 'daily',
    notesDate: todayKey(),
    zen: false
  };
  const emptyDay = () => ({ musts: [], sessions: [] });
  const dayDoc = key => `pf-day-${key}`;

  function saveGoals() { Store.setJSON('pf-goals', { goals: S.goals, updated: Date.now() }); }
  function saveDay() { Store.setJSON(dayDoc(S.dayKey), S.day); }
  function saveSettings() { Store.setJSON('pf-settings', S.settings); applyTheme(); }
  function applyTheme() {
    const t = S.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
    try { localStorage.setItem('pf-theme', t); } catch (e) {}
  }

  // Template: Jongho's Fall 2026 plan. Only loaded on request (not hard-coded into the UI).
  function templateGoals() {
    const ms = (t, date, done) => ({ id: uid(), title: t, date: date || '', done: !!done });
    return [
      { id: uid(), title: 'Rent control paper — submit', category: 'research', horizon: 'short', start: '2026-09-01', deadline: '2026-11-01', progress: 40, status: 'on-track', bottleneck: '', next: '', link: '',
        milestones: [ms('Full draft complete', '2026-10-10'), ms('Polish + robustness', '2026-10-24'), ms('Submit', '2026-11-01')] },
      { id: uid(), title: 'Bayesian-LLM paper — submit', category: 'research', horizon: 'short', start: '2026-09-01', deadline: '2026-11-01', progress: 30, status: 'on-track', bottleneck: '', next: '', link: '',
        milestones: [ms('Full draft complete', '2026-10-15'), ms('Polish', '2026-10-27'), ms('Submit', '2026-11-01')] },
      { id: uid(), title: 'Apply to Anthropic', category: 'application', horizon: 'short', start: '2026-09-19', deadline: '2026-11-01', progress: 0, status: 'on-track', bottleneck: '', next: 'Draft CV + research statement', link: '',
        milestones: [ms('CV + statement ready', '2026-10-20'), ms('Application submitted', '2026-11-01')] },
      { id: uid(), title: 'Job market practice talk', category: 'jobmarket', horizon: 'short', start: '2026-09-19', deadline: '2026-10-07', progress: 10, status: 'on-track', bottleneck: '', next: 'Outline slide deck', link: '',
        milestones: [ms('Slides complete', '2026-09-30'), ms('Practice run 1', '2026-10-02'), ms('Practice run 2', '2026-10-04'), ms('Practice run 3', '2026-10-06'), ms('Talk', '2026-10-07')] },
      { id: uid(), title: 'Real Analysis', category: 'math', horizon: 'long', start: '2026-09-19', deadline: '2026-12-31', progress: 0, status: 'on-track', bottleneck: '', next: '', link: '', milestones: [] },
      { id: uid(), title: 'Measure-Theoretic Probability', category: 'math', horizon: 'long', start: '2026-09-19', deadline: '2027-02-28', progress: 0, status: 'on-track', bottleneck: '', next: '', link: '', milestones: [] },
      { id: uid(), title: 'Functional Analysis', category: 'math', horizon: 'long', start: '2026-09-19', deadline: '2027-04-30', progress: 0, status: 'on-track', bottleneck: '', next: '', link: '', milestones: [] },
      { id: uid(), title: 'Master modern causal inference', category: 'math', horizon: 'long', start: '2026-09-19', deadline: '2027-01-31', progress: 0, status: 'on-track', bottleneck: '', next: 'Read intro chapter', link: 'https://alejandroschuler.github.io/mci/introduction-to-modern-causal-inference.html', milestones: [] },
      { id: uid(), title: 'Polish my own papers', category: 'research', horizon: 'long', start: '2026-09-19', deadline: '', progress: 0, status: 'on-track', bottleneck: '', next: '', link: '', milestones: [] }
    ];
  }

  window.PF = { templateGoals, emptyDay };

  // ---------------------------------------------------------------- boot
  auth.onAuthStateChanged(async user => {
    if (!user) { window.location.replace('index.html'); return; }
    Store.user = (user.email || '').split('@')[0];
    $('#navUser').textContent = Store.user;
    // Cache-first paint
    const cg = Store.cachedJSON('pf-goals'); if (cg && cg.goals) S.goals = cg.goals;
    const cs = Store.cachedJSON('pf-settings'); if (cs) S.settings = { ...DEFAULT_SETTINGS, ...cs };
    S.day = Store.cachedJSON(dayDoc(S.dayKey)) || emptyDay();
    applyTheme();
    Timer.load();
    $('#app').hidden = false;
    route(location.hash.replace('#', '') || 'today');
    if (Timer.st.running) Timer.loop();
    // Network refresh
    const [g, s, d] = await Promise.all([Store.getJSON('pf-goals'), Store.getJSON('pf-settings'), Store.getJSON(dayDoc(S.dayKey))]);
    if (g && g.goals) S.goals = g.goals;
    if (s) S.settings = { ...DEFAULT_SETTINGS, ...s };
    if (d) S.day = { ...emptyDay(), ...d };
    S.loaded = true;
    applyTheme();
    render();
  });

  // ---------------------------------------------------------------- routing
  const VIEWS = { today: renderToday, timeline: renderTimeline, goals: renderGoals, focus: renderFocus, notes: renderNotes, settings: renderSettings };
  function route(v) {
    if (!VIEWS[v]) v = 'today';
    S.view = v;
    if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    render();
  }
  window.addEventListener('hashchange', () => route(location.hash.replace('#', '')));
  $$('.nav-item').forEach(b => b.addEventListener('click', () => route(b.dataset.view)));
  document.addEventListener('keydown', e => {
    if (e.target.matches('input, textarea, select, button, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
    const map = { '1': 'today', '2': 'timeline', '3': 'goals', '4': 'focus', '5': 'notes' };
    if (map[e.key]) route(map[e.key]);
    if (e.key === ' ' && S.view === 'focus') { e.preventDefault(); Timer.toggle(); }
    if (e.key === 'Escape') closeModal();
  });

  function render() {
    // Keep midnight rollover honest
    if (S.dayKey !== todayKey() && S.view !== 'notes') switchDay(todayKey());
    const main = $('#main');
    if (S.view !== 'notes') destroyQuill();
    VIEWS[S.view](main);
    renderNavTimer();
  }
  async function switchDay(key) {
    S.dayKey = key;
    S.day = Store.cachedJSON(dayDoc(key)) || emptyDay();
    const d = await Store.getJSON(dayDoc(key));
    if (d) { S.day = { ...emptyDay(), ...d }; if (S.view === 'today') render(); }
  }

  // ---------------------------------------------------------------- derived
  function isBottleneck(g) { return g.status === 'blocked' || g.status === 'at-risk'; }
  function elapsedFrac(g) {
    if (!g.deadline) return 0;
    const start = g.start || addDays(g.deadline, -30);
    const total = Math.max(1, daysUntil(g.deadline) - daysUntil(start));
    return clamp(-daysUntil(start) / total, 0, 1);
  }
  function activeGoals() { return S.goals.filter(g => g.status !== 'done'); }
  function goalById(id) { return S.goals.find(g => g.id === id); }
  function focusUsedMins() { return (S.day.sessions || []).reduce((a, s) => a + (s.minutes || 0), 0); }
  function dChipClass(n) { return n < 0 ? 'over' : n <= 7 ? 'soon' : ''; }

  // ---------------------------------------------------------------- TODAY
  function renderToday(main) {
    const now = new Date();
    const deadlines = activeGoals().filter(g => g.deadline && g.horizon !== 'long').sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 5);
    const musts = S.day.musts || [];
    const doneCnt = musts.filter(m => m.done).length;
    const totalMins = musts.filter(m => !m.done).reduce((a, m) => a + (m.minutes || 0), 0);
    const bns = activeGoals().filter(isBottleneck);
    const shortG = activeGoals().filter(g => g.horizon !== 'long').sort(byOrder);
    const longG = activeGoals().filter(g => g.horizon === 'long').sort(byOrder);
    const sched = scheduleMusts(); const slotOf = id => sched.find(x => x.m.id === id);
    const DUR = [15, 25, 30, 45, 60, 90, 120, 180];

    main.innerHTML = `
      <header class="today-head">
        <div class="today-date">${WEEKDAYS[now.getDay()]} · ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
        <div class="today-title">Today</div>
        <div class="countdowns">
          ${deadlines.map(g => { const n = daysUntil(g.deadline); return `
            <div class="cd" data-action="open-goal" data-id="${g.id}" style="--cat:${catVar(g.category)}">
              <span class="cat"></span><span class="d ${dChipClass(n)}">${dLabel(n)}</span><span class="t">${esc(g.title)}</span>
            </div>`; }).join('')}
          ${deadlines.length ? '' : '<span class="muted small">No deadlines yet — add goals to see countdowns.</span>'}
        </div>
      </header>

      <div class="grid grid-2">
        <div class="stack">
          ${mottoBlock()}
          <section class="card">
            <div class="card-head"><h3>Must do today</h3><span class="muted small mono">${doneCnt}/${musts.length} · ${fmtDur(totalMins)} left</span></div>
            <div class="list must-list">
              ${musts.map((m, i) => { const g = m.goalId && goalById(m.goalId); const sl = slotOf(m.id); return `
                <div class="item must ${m.done ? 'done' : ''}" draggable="true" data-id="${m.id}">
                  <span class="grip" title="Drag to reorder">⋮⋮</span>
                  <input type="checkbox" data-action="must-toggle" data-id="${m.id}" ${m.done ? 'checked' : ''}>
                  <span class="txt">${esc(m.text)}${g ? `<span class="tag" style="--cat:${catVar(g.category)}"><span class="dot"></span>${esc(g.title)}</span>` : ''}</span>
                  <span class="when mono">${sl ? `${minsToHM(sl.start)}–${minsToHM(sl.end)}` : ''}${m.start != null ? ' <span class="pin" title="Pinned to this time">📌</span>' : ''}</span>
                  <span class="dur mono">${fmtDur(m.minutes || 0)}</span>
                  <span class="actions">
                    ${m.start != null ? `<button class="btn-icon" data-action="must-unpin" data-id="${m.id}" title="Back to auto placement">↺</button>` : ''}
                    <button class="btn-icon" data-action="must-focus" data-id="${m.id}" title="Focus on this">▶</button>
                    <button class="btn-icon" data-action="must-del" data-id="${m.id}" title="Remove">✕</button>
                  </span>
                </div>`; }).join('')}
              
            </div>
            <form class="inline-add must-add" data-form="must-add">
              <input type="text" name="text" placeholder="Add a must-do…" required maxlength="140">
              <select name="minutes" title="How long will it take?">${DUR.map(d => `<option value="${d}" ${d === 45 ? 'selected' : ''}>${fmtDur(d)}</option>`).join('')}</select>
              <select name="goalId"><option value=""></option>${activeGoals().map(g => `<option value="${g.id}">${esc(g.title)}</option>`).join('')}</select>
              <button class="btn btn-sm" type="submit">Add</button>
            </form>
          </section>

          <section class="card">
            <div class="card-head"><h3>Today's timeline</h3><span class="muted small">Auto-placed from must-dos · drag a block to pin its time</span></div>
            ${renderDayline(sched)}
            <div class="row small muted" style="margin-top:6px">${sched.length ? `Ends ${minsToHM(Math.max(...sched.map(x => x.end)))}` : 'Nothing scheduled yet.'} · ${(S.day.sessions || []).length} focus session${(S.day.sessions || []).length === 1 ? '' : 's'} logged (${fmtDur(focusUsedMins())})
              <button class="btn btn-xs" data-action="go-focus" style="margin-left:auto">Open Focus</button></div>
          </section>
        </div>

        <div class="stack">
          <section class="card">
            <div class="card-head"><h3>Bottleneck</h3><span class="muted small">${bns.length ? `${bns.length} flagged` : 'clear'}</span></div>
            <div class="bn">
              ${bns.map(g => `
                <div class="bn-item ${g.status === 'blocked' ? 'blocked' : ''}">
                  <div class="h"><span data-action="open-goal" data-id="${g.id}" style="cursor:pointer">${esc(g.title)}</span>
                    <select class="status status-${g.status}" data-action="goal-status" data-id="${g.id}"><option value="at-risk" ${g.status === 'at-risk' ? 'selected' : ''}>At risk</option><option value="blocked" ${g.status === 'blocked' ? 'selected' : ''}>Blocked</option><option value="on-track">Resolved</option></select></div>
                  ${g.deadline ? `<div class="pace">${dLabel(daysUntil(g.deadline))} · ${fmtDow(g.deadline)}</div>` : ''}
                  <textarea class="bn-edit" data-action="goal-field" data-id="${g.id}" data-k="bottleneck" placeholder="What is blocking this?" rows="2">${esc(g.bottleneck || '')}</textarea>
                  <input class="bn-edit" data-action="goal-field" data-id="${g.id}" data-k="next" value="${esc(g.next || '')}" placeholder="Next action to unblock it">
                </div>`).join('')}
              ${bns.length ? '' : '<div class="empty">Nothing is blocked.</div>'}
              ${activeGoals().some(g => !isBottleneck(g)) ? `<select class="bn-flag" data-action="bn-flag"><option value="">Flag a goal as at risk…</option>${activeGoals().filter(g => !isBottleneck(g)).map(g => `<option value="${g.id}">${esc(g.title)}</option>`).join('')}</select>` : ''}
            </div>
          </section>

          <section class="card">
            <div class="card-head"><h3>Short-term</h3><button class="btn btn-xs btn-ghost" data-action="go-goals">All goals →</button></div>
            ${shortG.map(goalRow).join('') || '<div class="empty">No short-term goals.</div>'}
          </section>
          <section class="card">
            <div class="card-head"><h3>Long-term</h3></div>
            ${longG.map(goalRow).join('') || '<div class="empty">No long-term goals.</div>'}
          </section>
        </div>
      </div>`;
    wireMustDrag(main); wireDayline(main); scrollCalToNow();
  }
  function mottoBlock() {
    const list = (S.settings.mottos || []).filter(m => m && m.trim());
    if (!list.length) return '';
    return `<div class="mottos-block">${list.map(m => `<div>${esc(m)}</div>`).join('')}</div>`;
  }
  function fmtDur(m) { if (!m) return '0m'; const h = Math.floor(m / 60), r = m % 60; return h ? (r ? `${h}h ${r}m` : `${h}h`) : `${r}m`; }
  function goalRow(g) {
    const n = g.deadline ? daysUntil(g.deadline) : null;
    return `<div class="goal-row" data-action="open-goal" data-id="${g.id}" style="--cat:${catVar(g.category)}">
      <span class="t"><span class="dot"></span><span class="name">${esc(g.title)}</span>${g.status !== 'on-track' ? `<span class="status status-${g.status}"></span>` : ''}</span>
      ${n != null ? `<span class="r"><span class="dd ${dChipClass(n)}">${dLabel(n)}</span><span class="date">${fmtLong(g.deadline)}</span></span>` : '<span class="r"><span class="date">no date</span></span>'}
    </div>`;
  }

  // Place must-dos on the day: pinned ones keep their start; the rest flow in list order from now, around pinned slots.
  function scheduleMusts() {
    const s = S.settings.dayStart * 60, e = S.settings.dayEnd * 60;
    const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes();
    const musts = S.day.musts || [];
    const pinned = musts.filter(m => m.start != null && m.start !== '').map(m => ({ m, start: hmToMins(m.start), end: hmToMins(m.start) + (m.minutes || 30), pinned: true }));
    let cursor = S.dayKey === todayKey() ? Math.max(s, Math.ceil(nowM / 15) * 15) : s;
    const out = pinned.slice();
    musts.filter(m => (m.start == null || m.start === '') && !m.done).forEach(m => {
      const dur = m.minutes || 30; let st = cursor, moved = true, guard = 0;
      while (moved && guard++ < 50) { moved = false; for (const p of pinned) { if (st < p.end && st + dur > p.start) { st = p.end; moved = true; } } }
      out.push({ m, start: st, end: st + dur, pinned: false }); cursor = st + dur;
    });
    return out.sort((a, b) => a.start - b.start);
  }
  const HH = 56; // px per hour in the day calendar
  function renderDayline(sched) {
    const s = S.settings.dayStart * 60, e = S.settings.dayEnd * 60;
    const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes();
    const y = m => (m - s) / 60 * HH;
    const hours = []; for (let h = S.settings.dayStart; h < S.settings.dayEnd; h++) hours.push(h);
    // lanes for overlapping blocks
    const items = sched.filter(x => x.end > s && x.start < e).sort((a, b) => a.start - b.start || b.end - a.end);
    const lanesEnd = []; items.forEach(it => { let l = lanesEnd.findIndex(en => en <= it.start); if (l < 0) { l = lanesEnd.length; lanesEnd.push(0); } lanesEnd[l] = it.end; it.lane = l; });
    // group width: number of lanes that overlap each item
    items.forEach(it => { it.cols = 1 + Math.max(0, ...items.filter(o => o !== it && o.start < it.end && o.end > it.start).map(o => o.lane), it.lane); });
    return `<div class="cal" id="cal"><div class="cal-body" style="height:${y(e)}px">
      ${hours.map(h => `<div class="cal-hour" style="top:${y(h * 60)}px"><span>${pad(h)}:00</span></div>`).join('')}
      <div class="cal-blocks">
      ${items.map(({ m, start, end, pinned, lane, cols }) => { const g = m.goalId && goalById(m.goalId); const dur = end - start;
        return `<div class="cal-blk ${m.done ? 'past' : ''} ${pinned ? 'pinned' : ''} ${dur <= 20 ? 'tiny' : dur <= 40 ? 'short' : ''}" style="top:${y(Math.max(start, s))}px;height:${Math.max(10, y(Math.min(end, e)) - y(Math.max(start, s)) - 2)}px;left:calc(${lane / cols * 100}% + 2px);width:calc(${100 / cols}% - 4px);--cat:${g ? catVar(g.category) : 'var(--accent)'}" title="${esc(m.text)} · ${minsToHM(start)}–${minsToHM(end)}${pinned ? ' (pinned)' : ''}" data-id="${m.id}" data-start="${start}" data-dur="${dur}">
          <span class="cb-t">${esc(m.text)}</span><small>${minsToHM(start)}–${minsToHM(end)}${g ? ' · ' + esc(g.title) : ''}${pinned ? ' 📌' : ''}</small><i class="cal-rs" title="Drag to change duration"></i></div>`; }).join('')}
      </div>
      ${S.dayKey === todayKey() && nowM >= s && nowM <= e ? `<div class="cal-now" style="top:${y(nowM)}px"><span>${minsToHM(nowM)}</span></div>` : ''}
    </div></div>`;
  }
  function scrollCalToNow() {
    const cal = $('#cal'); if (!cal) return;
    const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes(); const s = S.settings.dayStart * 60;
    const first = (S.day.musts || []).length ? Math.min(nowM, ...scheduleMusts().map(x => x.start)) : nowM;
    cal.scrollTop = Math.max(0, (Math.min(first, nowM) - s) / 60 * HH - 40);
  }
  // Drag a block vertically to pin it to a time (15-minute snap). Pointer events so touch works too.
  function wireDayline(root) {
    const cal = $('#cal', root); if (!cal) return;
    cal.addEventListener('pointerdown', e => {
      const blk = e.target.closest('.cal-blk'); if (!blk || e.button) return;
      e.preventDefault(); blk.setPointerCapture(e.pointerId);
      const resizing = e.target.classList.contains('cal-rs');
      const s = S.settings.dayStart * 60, dur0 = +blk.dataset.dur, start0 = +blk.dataset.start, y0 = e.clientY; let st = null, dur = dur0;
      const sm = blk.querySelector('small');
      const onMove = ev => {
        if (st == null && Math.abs(ev.clientY - y0) < 4) return;
        blk.classList.add('drag');
        if (resizing) {
          st = start0; dur = clamp(Math.round((dur0 + (ev.clientY - y0) / HH * 60) / 15) * 15, 15, S.settings.dayEnd * 60 - start0);
          blk.style.height = (dur / 60 * HH - 2) + 'px'; blk.classList.toggle('short', dur <= 40 && dur > 20); blk.classList.toggle('tiny', dur <= 20);
        } else {
          st = clamp(Math.round((start0 + (ev.clientY - y0) / HH * 60) / 15) * 15, s, S.settings.dayEnd * 60 - dur);
          blk.style.top = ((st - s) / 60 * HH) + 'px'; blk.style.left = '2px'; blk.style.width = 'calc(100% - 4px)';
        }
        if (sm) sm.textContent = `${minsToHM(st)}–${minsToHM(st + dur)}${resizing ? ' · ' + fmtDur(dur) : ''}`;
      };
      const onUp = () => {
        blk.removeEventListener('pointermove', onMove); blk.removeEventListener('pointerup', onUp); blk.removeEventListener('pointercancel', onUp);
        if (st == null) return;
        const m = (S.day.musts || []).find(x => x.id === blk.dataset.id);
        if (m) { if (resizing) m.minutes = dur; else m.start = minsToHM(st); saveDay(); }
        render();
      };
      blk.addEventListener('pointermove', onMove); blk.addEventListener('pointerup', onUp); blk.addEventListener('pointercancel', onUp);
    });
  }
  // Reorder must-dos by dragging list rows; auto-placed blocks follow the list order.
  function wireMustDrag(root) {
    const list = $('.must-list', root); if (!list) return; let dragging = null;
    list.addEventListener('dragstart', e => { const it = e.target.closest('.item[draggable]'); if (!it) return; dragging = it; it.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', it.dataset.id); } catch (x) {} });
    list.addEventListener('dragover', e => { if (!dragging) return; e.preventDefault(); const over = e.target.closest('.item'); if (!over || over === dragging) return; const r = over.getBoundingClientRect(); list.insertBefore(dragging, e.clientY > r.top + r.height / 2 ? over.nextSibling : over); });
    list.addEventListener('drop', e => { if (dragging) e.preventDefault(); });
    list.addEventListener('dragend', () => {
      if (!dragging) return; dragging.classList.remove('dragging'); dragging = null;
      const ids = $$('.item', list).map(el => el.dataset.id); const byId = {}; (S.day.musts || []).forEach(m => { byId[m.id] = m; });
      const next = ids.map(id => byId[id]).filter(Boolean); if (next.length === (S.day.musts || []).length) { S.day.musts = next; saveDay(); }
      render();
    });
  }

  // ---------------------------------------------------------------- TIMELINE
  function renderTimeline(main) {
    const goals = S.goals.filter(g => g.deadline || (g.milestones || []).some(m => m.date)).sort((a, b) => (a.deadline || '9').localeCompare(b.deadline || '9'));
    const today = todayKey();
    const items = [];
    S.goals.forEach(g => {
      if (g.deadline && g.status !== 'done') items.push({ date: g.deadline, title: g.title, sub: 'deadline', type: 'deadline', cat: g.category, id: g.id, done: false });
      (g.milestones || []).forEach(m => { if (m.date) items.push({ date: m.date, title: m.title, sub: g.title, type: 'milestone', cat: g.category, id: g.id, done: m.done }); });
    });
    items.sort((a, b) => a.date.localeCompare(b.date));
    const col = (title, f) => { const list = items.filter(f); return `<div class="up-col"><h3>${title}</h3>${list.map(it => { const n = daysUntil(it.date); return `
      <div class="up-item ${it.type} ${it.done ? 'done' : ''}" data-action="open-goal" data-id="${it.id}" style="cursor:pointer">
        <span class="d"><b>${fmtShort(it.date)}</b>${dLabel(n)}</span>
        <span class="t">${esc(it.title)}<div class="sub">${esc(it.sub)}</div></span>
      </div>`; }).join('') || '<div class="empty">Nothing here.</div>'}</div>`; };
    const wk = daysUntil; // helper
    main.innerHTML = `
      <div class="view-head"><div><h1>Timeline</h1><div class="sub">Where each goal sits against the calendar. Bars fill as time passes; the red line is today.</div></div>
        <div class="row"><span class="seg"><button data-action="tl-range" data-r="60" class="${S.tlRange === 60 || !S.tlRange ? 'active' : ''}">10 weeks</button><button data-action="tl-range" data-r="120" class="${S.tlRange === 120 ? 'active' : ''}">4 months</button><button data-action="tl-range" data-r="240" class="${S.tlRange === 240 ? 'active' : ''}">8 months</button></span></div>
      </div>
      <section class="card" style="position:relative">
        <div class="tl-wrap" id="tlWrap">${goals.length ? '' : '<div class="empty">Add goals with deadlines to draw the timeline.</div>'}</div>
        <div class="tl-legend">${Object.keys(CATS).filter(c => goals.some(g => (g.category || 'other') === c)).map(c => `<span style="--cat:${catVar(c)}"><i></i>${CATS[c].label}</span>`).join('')}
          <span><i style="background:var(--surface);border:2px solid var(--ink-3);width:8px;height:8px;border-radius:50%"></i>milestone</span><span><i style="background:var(--ink-3);clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)"></i>deadline</span></div>
      </section>
      <div style="height:18px"></div>
      <section class="card"><div class="upcoming">
        ${col('This week', it => wk(it.date) >= 0 && wk(it.date) <= 7)}
        ${col('Next 30 days', it => wk(it.date) > 7 && wk(it.date) <= 30)}
        ${col('Later', it => wk(it.date) > 30)}
      </div>${items.some(it => wk(it.date) < 0 && !it.done && it.type === 'milestone') ? `<div class="muted small" style="margin-top:12px">Overdue milestones: ${items.filter(it => wk(it.date) < 0 && !it.done && it.type === 'milestone').map(it => esc(it.title)).join(', ')}</div>` : ''}</section>`;
    if (goals.length) drawGantt($('#tlWrap'), goals, S.tlRange || 60);
  }

  function truncW(str, units) { let w = 0, out = ''; for (const ch of str) { w += /[\u1100-\u11ff\u3000-\u9fff\uac00-\ud7af]/.test(ch) ? 1.8 : 1; if (w > units) return out + '…'; out += ch; } return out; }
  function drawGantt(wrap, goals, rangeDays) {
    const today = todayKey();
    const from = addDays(today, -7), to = addDays(today, rangeDays);
    const W = Math.max(wrap.clientWidth || 800, 640), LBL = 210, PAD_R = 24, ROW = 44, TOP = 46;
    const H = TOP + goals.length * ROW + 12;
    const dayW = (W - LBL - PAD_R) / (daysUntil(to) - daysUntil(from));
    const xOf = s => LBL + (daysUntil(s) - daysUntil(from)) * dayW;
    let svg = `<svg class="tl" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    // weekends + week ticks + month labels
    let cur = from; let lastMonth = -1;
    while (cur <= to) {
      const d = parseDay(cur); const x = xOf(cur);
      if (d.getDay() === 6) svg += `<rect class="weekend" x="${x}" y="${TOP - 6}" width="${dayW * 2}" height="${H - TOP}"/>`;
      if (d.getDay() === 1) { svg += `<line class="week-line" x1="${x}" x2="${x}" y1="${TOP - 6}" y2="${H}"/>`; if (rangeDays <= 120 || d.getDate() <= 7) svg += `<text class="tick" x="${x + 3}" y="${TOP - 10}">${d.getMonth() + 1}/${d.getDate()}</text>`; }
      if (d.getMonth() !== lastMonth) { lastMonth = d.getMonth(); if (d.getDate() === 1 || cur === from) { svg += `<line class="month-line" x1="${x}" x2="${x}" y1="8" y2="${H}"/><text class="month" x="${x + 4}" y="18">${d.toLocaleDateString('en-US', { month: 'short' })}</text>`; } }
      cur = addDays(cur, 1);
    }
    goals.forEach((g, i) => {
      const y = TOP + i * ROW; const cat = catVar(g.category);
      const start = g.start || addDays(g.deadline || today, -30);
      const end = g.deadline || to;
      const x1 = clamp(xOf(start), LBL, W - PAD_R), x2 = clamp(xOf(end), LBL, W - PAD_R);
      const n = g.deadline ? daysUntil(g.deadline) : null;
      svg += `<g class="row-hit" style="--cat:${cat}" data-action="open-goal" data-id="${g.id}">`;
      svg += `<text class="row-lbl" x="0" y="${y + 17}">${esc(truncW(g.title, 30))}</text>`;
      svg += `<text class="row-sub" x="0" y="${y + 31}">${n != null ? dLabel(n) + ' · ' + fmtLong(g.deadline) : 'no deadline'}${g.status === 'done' ? ' · done' : g.status !== 'on-track' ? ' · ' + STATUS[g.status].toLowerCase() : ''}</text>`;
      if (x2 > x1) {
        svg += `<rect class="bar-bg" x="${x1}" y="${y + 10}" width="${x2 - x1}" height="14" rx="4"/>`;
        svg += `<rect class="bar-fg" x="${x1}" y="${y + 10}" width="${Math.max(0, (x2 - x1) * (g.status === 'done' ? 1 : elapsedFrac(g)))}" height="14" rx="4"/>`;
      }
      (g.milestones || []).forEach(m => { if (!m.date) return; const mx = xOf(m.date); if (mx < LBL || mx > W - PAD_R) return;
        svg += `<circle class="ms ${m.done ? 'done' : ''}" cx="${mx}" cy="${y + 17}" r="4.5" data-tip="${esc(m.title)}|${fmtLong(m.date)} · ${dLabel(daysUntil(m.date))}${m.done ? ' · done' : ''}"/>`; });
      if (g.deadline) { const dx = xOf(g.deadline); if (dx >= LBL && dx <= W - PAD_R) { svg += `<path class="dl" d="M${dx} ${y + 10} l6 7 l-6 7 l-6 -7 z"/>`; if (dx + 40 < W) svg += `<text class="dl-lbl" x="${dx + 10}" y="${y + 21}">${fmtShort(g.deadline)}</text>`; } }
      svg += `<rect class="bar-hit" x="${LBL}" y="${y}" width="${W - LBL}" height="${ROW}" data-tip="${esc(g.title)}|${g.start ? fmtLong(g.start) + ' → ' : ''}${g.deadline ? fmtLong(g.deadline) + ' (' + dLabel(n) + ')' : 'no deadline'}${g.bottleneck ? ' · ' + esc(g.bottleneck) : ''}"/>`;
      svg += `</g>`;
    });
    const tx = xOf(today);
    svg += `<line class="today-line" x1="${tx}" x2="${tx}" y1="${TOP - 6}" y2="${H}"/><text class="today-lbl" x="${tx + 4}" y="${H - 2}">today</text>`;
    svg += `</svg>`;
    wrap.innerHTML = svg;
    // tooltip
    const card = wrap.parentElement; let tip = $('.tl-tip', card); if (!tip) { tip = document.createElement('div'); tip.className = 'tl-tip'; tip.hidden = true; card.appendChild(tip); }
    wrap.onmousemove = e => { const t = e.target.closest('[data-tip]'); if (!t) { tip.hidden = true; return; } const [b, rest] = t.dataset.tip.split('|'); tip.innerHTML = `<b>${esc(b)}</b>${esc(rest || '')}`; tip.hidden = false; const r = card.getBoundingClientRect(); tip.style.left = Math.min(e.clientX - r.left + 12, r.width - 290) + 'px'; tip.style.top = (e.clientY - r.top + 12) + 'px'; };
    wrap.onmouseleave = () => { tip.hidden = true; };
  }
  window.addEventListener('resize', debounce(() => { if (S.view === 'timeline') render(); }, 200));

  // ---------------------------------------------------------------- GOALS
  const byOrder = (a, b) => ((a.order ?? 1e9) - (b.order ?? 1e9)) || (a.deadline || '9').localeCompare(b.deadline || '9');
  function renderGoals(main) {
    if (!S.goals.length) {
      main.innerHTML = `<div class="view-head"><div><h1>Goals</h1><div class="sub">Short-term deadlines and long-term mastery, in one place.</div></div></div>
        <section class="card template-box"><h2>Start with a plan</h2><p>Load the Fall 2026 template (two paper submissions, the Anthropic application, the practice talk, and the math track) and edit from there, or begin empty.</p>
        <div class="row" style="justify-content:center"><button class="btn btn-primary" data-action="load-template">Load template</button><button class="btn" data-action="goal-new">Start empty</button></div></section>`;
      return;
    }
    const section = (title, list, h) => `<div class="goals-section"><h3>${title} <span class="cnt">${list.length}</span></h3><div class="goal-cards" data-horizon="${h}">${list.map(goalCard).join('') || '<div class="drop-hint">Drop a goal here</div>'}</div></div>`;
    const active = activeGoals();
    const short = active.filter(g => g.horizon !== 'long').sort(byOrder);
    const long = active.filter(g => g.horizon === 'long').sort(byOrder);
    const done = S.goals.filter(g => g.status === 'done');
    main.innerHTML = `<div class="view-head"><div><h1>Goals</h1><div class="sub">Short-term deadlines and long-term mastery, in one place.</div></div>
      <button class="btn btn-primary" data-action="goal-new">+ New goal</button></div>
      ${section('Short-term', short, 'short')}${section('Long-term', long, 'long')}${done.length ? section('Done', done, 'done') : ''}
      <p class="muted small" style="margin-top:6px">Drag cards to reorder or to move between Short-term and Long-term.</p>`;
    wireDrag(main);
  }
  function wireDrag(root) {
    let dragging = null;
    root.addEventListener('dragstart', e => {
      const card = e.target.closest('.gc[draggable]'); if (!card) return;
      dragging = card; card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', card.dataset.id); } catch (x) {}
    });
    root.addEventListener('dragover', e => {
      if (!dragging) return;
      const zone = e.target.closest('.goal-cards'); if (!zone || zone.dataset.horizon === 'done') return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      const hint = zone.querySelector('.drop-hint'); if (hint) hint.remove();
      const over = e.target.closest('.gc'); 
      if (!over || over === dragging) { if (!over) zone.appendChild(dragging); return; }
      const r = over.getBoundingClientRect();
      const after = (e.clientX - r.left) / r.width + (e.clientY - r.top) / r.height > 1;
      zone.insertBefore(dragging, after ? over.nextSibling : over);
    });
    root.addEventListener('drop', e => { if (dragging) e.preventDefault(); });
    root.addEventListener('dragend', () => {
      if (!dragging) return;
      dragging.classList.remove('dragging'); dragging = null;
      let changed = false;
      $$('.goal-cards', root).forEach(zone => {
        if (zone.dataset.horizon === 'done') return;
        $$('.gc', zone).forEach((card, i) => { const g = goalById(card.dataset.id); if (!g) return; if (g.order !== i || g.horizon !== zone.dataset.horizon) changed = true; g.order = i; g.horizon = zone.dataset.horizon; });
      });
      if (changed) { saveGoals(); toast('Order saved'); }
      render();
    });
  }
  function goalCard(g) {
    const n = g.deadline ? daysUntil(g.deadline) : null;
    const ms = (g.milestones || []).slice().sort((a, b) => (a.date || '9').localeCompare(b.date || '9'));
    return `<section class="card gc ${g.status === 'done' ? 'done' : ''}" style="--cat:${catVar(g.category)}" draggable="${g.status === 'done' ? 'false' : 'true'}" data-id="${g.id}">
      <div class="gc-top">
        <div class="gc-left">
          <div class="gc-title">${esc(g.title)}</div>
          <div class="gc-meta"><span class="chip chip-cat"><span class="dot"></span>${CATS[g.category] ? CATS[g.category].label : 'Other'}</span>
            ${g.status !== 'on-track' ? `<span class="status status-${g.status}">${STATUS[g.status]}</span>` : ''}
            ${g.link ? `<a class="chip" href="${esc(g.link)}" target="_blank" rel="noopener">link ↗</a>` : ''}</div>
        </div>
        <div class="gc-dday ${n != null ? dChipClass(n) : ''}">
          ${n != null ? `<div class="d">${dLabel(n)}</div><div class="date">${fmtDow(g.deadline)}</div>` : '<div class="date">no deadline</div>'}
        </div>
      </div>
      ${g.bottleneck && g.status !== 'done' ? `<div class="gc-sec gc-bn ${g.status === 'blocked' ? 'blocked' : ''}"><b>Bottleneck</b>${esc(g.bottleneck)}</div>` : ''}
      ${g.next ? `<div class="gc-sec"><b>Next action</b>${esc(g.next)}</div>` : ''}
      ${ms.length ? `<div class="gc-sec"><b>Milestones</b><div class="ms">${ms.map(m => { const mn = m.date ? daysUntil(m.date) : null; return `
        <label class="${m.done ? 'done' : ''}">
          <span class="md ${mn != null && !m.done ? dChipClass(mn) : ''}">${m.date ? fmtShort(m.date) : '—'}</span>
          <span class="mdd">${mn != null && !m.done ? dLabel(mn) : ''}</span>
          <input type="checkbox" data-action="ms-toggle" data-id="${g.id}" data-ms="${m.id}" ${m.done ? 'checked' : ''}>
          <span class="mt">${esc(m.title)}</span>
        </label>`; }).join('')}</div></div>` : ''}
      <div class="gc-foot"><select data-action="goal-status" data-id="${g.id}" class="status status-${g.status}">${Object.keys(STATUS).map(s => `<option value="${s}" ${g.status === s ? 'selected' : ''}>${STATUS[s]}</option>`).join('')}</select>
        <span class="row"><span class="muted small">${g.horizon === 'long' ? 'Long-term' : 'Short-term'}</span><button class="btn btn-xs" data-action="open-goal" data-id="${g.id}">Edit</button></span></div>
    </section>`;
  }

  // Goal modal
  function openGoalModal(id) {
    const g = id ? goalById(id) : { id: '', title: '', category: 'research', horizon: 'short', start: todayKey(), deadline: '', progress: 0, status: 'on-track', bottleneck: '', next: '', link: '', milestones: [] };
    if (!g) return;
    const ms = (g.milestones || []).map(m => ({ ...m }));
    const root = $('#modalRoot');
    const draw = () => {
      root.innerHTML = `<div class="modal-bg" data-action="modal-bg"><div class="modal" role="dialog" aria-modal="true">
        <h2>${g.id ? 'Edit goal' : 'New goal'}</h2>
        <form class="form" data-form="goal-save">
          <label class="field"><span>Title</span><input name="title" value="${esc(g.title)}" required maxlength="120" autofocus></label>
          <div class="form-row">
            <label class="field"><span>Category</span><select name="category">${Object.keys(CATS).map(c => `<option value="${c}" ${g.category === c ? 'selected' : ''}>${CATS[c].label}</option>`).join('')}</select></label>
            <label class="field"><span>Horizon</span><select name="horizon"><option value="short" ${g.horizon !== 'long' ? 'selected' : ''}>Short-term</option><option value="long" ${g.horizon === 'long' ? 'selected' : ''}>Long-term</option></select></label>
          </div>
          <div class="form-row">
            <label class="field"><span>Start</span><input type="date" name="start" value="${esc(g.start || '')}"></label>
            <label class="field"><span>Deadline</span><input type="date" name="deadline" value="${esc(g.deadline || '')}"></label>
          </div>
          <label class="field"><span>Status</span><select name="status">${Object.keys(STATUS).map(s => `<option value="${s}" ${g.status === s ? 'selected' : ''}>${STATUS[s]}</option>`).join('')}</select></label>
          <label class="field"><span>What is the bottleneck right now?</span><textarea name="bottleneck" placeholder="e.g. Waiting on referee data; unclear identification strategy">${esc(g.bottleneck)}</textarea></label>
          <label class="field"><span>Next action</span><input name="next" value="${esc(g.next || '')}" placeholder="The very next concrete step" maxlength="160"></label>
          <label class="field"><span>Link</span><input name="link" value="${esc(g.link || '')}" placeholder="https://…"></label>
          <div class="field"><span>Milestones</span>
            <div class="ms-list" id="msList">${ms.map((m, i) => `<div class="ms-row"><input type="checkbox" data-ms-done="${i}" ${m.done ? 'checked' : ''}><input type="text" data-ms-title="${i}" value="${esc(m.title)}" placeholder="Milestone"><input type="date" data-ms-date="${i}" value="${esc(m.date || '')}"><button type="button" class="btn-icon" data-ms-del="${i}">✕</button></div>`).join('')}</div>
            <div><button type="button" class="btn btn-xs" data-ms-add>+ Milestone</button></div>
          </div>
          <div class="modal-foot">
            ${g.id ? `<button type="button" class="btn btn-ghost btn-danger" data-action="goal-del" data-id="${g.id}">Delete</button>` : ''}
            <span class="right"><button type="button" class="btn" data-action="modal-close">Cancel</button><button type="submit" class="btn btn-primary">Save</button></span>
          </div>
        </form></div></div>`;
      const form = $('form', root);
      // milestone editing keeps local array in sync
      form.addEventListener('input', e => { const t = e.target; if (t.dataset.msTitle != null) ms[+t.dataset.msTitle].title = t.value; if (t.dataset.msDate != null) ms[+t.dataset.msDate].date = t.value; });
      form.addEventListener('change', e => { const t = e.target; if (t.dataset.msDone != null) ms[+t.dataset.msDone].done = t.checked; });
      form.addEventListener('click', e => {
        const t = e.target.closest('[data-ms-add],[data-ms-del]'); if (!t) return;
        if (t.hasAttribute('data-ms-add')) { syncForm(form, g); ms.push({ id: uid(), title: '', date: '', done: false }); draw(); $('[data-ms-title="' + (ms.length - 1) + '"]', root).focus(); }
        else { syncForm(form, g); ms.splice(+t.dataset.msDel, 1); draw(); }
      });
      form.addEventListener('submit', e => {
        e.preventDefault(); syncForm(form, g);
        if (!g.title.trim()) return;
        g.milestones = ms.filter(m => m.title.trim()).map(m => ({ id: m.id || uid(), title: m.title.trim(), date: m.date || '', done: !!m.done }));
        if (!g.id) { g.id = uid(); S.goals.push(g); }
        saveGoals(); closeModal(); render(); toast('Saved');
      });
      setTimeout(() => { const f = $('input[name=title]', root); if (f && !g.id) f.focus(); }, 0);
    };
    draw();
  }
  function syncForm(form, g) {
    const fd = new FormData(form);
    g.title = fd.get('title') || ''; g.category = fd.get('category'); g.horizon = fd.get('horizon'); g.start = fd.get('start') || ''; g.deadline = fd.get('deadline') || '';
    g.status = fd.get('status'); g.bottleneck = fd.get('bottleneck') || ''; g.next = fd.get('next') || ''; g.link = fd.get('link') || '';
  }
  function closeModal() { $('#modalRoot').innerHTML = ''; }

  // ---------------------------------------------------------------- FOCUS (pomodoro)
  const Timer = {
    st: null, // { mode:'work'|'break', total(sec), endAt(ms) | null, remaining(sec), running, taskId, label }
    load() { try { const s = JSON.parse(localStorage.getItem('pf-timer') || 'null'); if (s) this.st = s; } catch (e) {} if (!this.st) this.reset('work', S.settings.work); },
    save() { try { localStorage.setItem('pf-timer', JSON.stringify(this.st)); } catch (e) {} },
    reset(mode, mins, keepTask) { const t = this.st || {}; this.st = { mode: mode || 'work', total: mins * 60, remaining: mins * 60, endAt: null, running: false, taskId: keepTask ? t.taskId : (t.taskId || ''), label: keepTask ? t.label : (t.label || ''), cycles: t.cycles || 0 }; this.save(); this.tick(); },
    start() { const s = this.st; if (s.running) return; ensureAudio(); s.endAt = Date.now() + s.remaining * 1000; s.running = true; this.save(); this.loop(); },
    pause() { const s = this.st; if (!s.running) return; s.remaining = Math.max(0, Math.round((s.endAt - Date.now()) / 1000)); s.running = false; s.endAt = null; this.save(); this.tick(); },
    toggle() { this.st.running ? this.pause() : this.start(); },
    loop() { clearInterval(this._iv); this._iv = setInterval(() => this.tick(), 250); this.tick(); },
    remaining() { const s = this.st; return s.running ? Math.max(0, Math.round((s.endAt - Date.now()) / 1000)) : s.remaining; },
    tick() {
      const s = this.st; const r = this.remaining();
      if (s.running && r <= 0) { this.complete(); return; }
      this.paint(r);
    },
    complete() {
      clearInterval(this._iv);
      const s = this.st; s.running = false; s.endAt = null; s.remaining = 0;
      if (s.mode === 'work') {
        const mins = Math.round(s.total / 60);
        S.day.sessions = S.day.sessions || []; S.day.sessions.push({ at: Date.now(), minutes: mins, label: s.label || '', taskId: s.taskId || '' });
        s.cycles = (s.cycles || 0) + 1; saveDay(); beep(2); toast(`Focus session done · +${mins} min`);
        const long = s.cycles % 4 === 0;
        this.reset('break', long ? S.settings.longBrk : S.settings.brk, true);
        if (S.settings.autoCycle) this.start();
      } else {
        beep(1); toast('Break over — back to it');
        this.reset('work', S.settings.work, true);
        if (S.settings.autoCycle) this.start();
      }
      this.save(); this.paint(this.remaining());
      if (S.view === 'focus') renderFocus($('#main')); else if (S.view === 'today') render();
    },
    paint(r) {
      const s = this.st; const mm = pad(Math.floor(r / 60)), ss = pad(r % 60);
      document.title = s.running ? `${mm}:${ss} · ${s.mode === 'work' ? 'Focus' : 'Break'} — Pathfinder` : 'Pathfinder';
      const t = $('#fxTime'); if (t) t.textContent = `${mm}:${ss}`;
      const c = $('#fxFill'); if (c) { const C = 2 * Math.PI * 46; c.style.strokeDashoffset = C * (1 - (s.total ? r / s.total : 0)); }
      const b = $('#fxToggle'); if (b) b.textContent = s.running ? 'Pause' : (r === s.total ? 'Start' : 'Resume');
      renderNavTimer();
    }
  };
  function renderNavTimer() {
    const el = $('#navTimer'); if (!el || !Timer.st) return;
    const s = Timer.st; const r = Timer.remaining();
    el.hidden = !(s.running || r !== s.total);
    el.innerHTML = `<span>${s.mode === 'work' ? '● Focus' : '○ Break'}</span><span>${pad(Math.floor(r / 60))}:${pad(r % 60)}</span>`;
    el.onclick = () => route('focus');
  }
  let audioCtx;
  function ensureAudio() { if (!S.settings.sound) return; try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) {} }
  function beep(n) {
    if (!S.settings.sound) return;
    try {
      ensureAudio(); if (!audioCtx) return;
      for (let i = 0; i < n; i++) { const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = 'sine'; o.frequency.value = 660; o.connect(g); g.connect(audioCtx.destination); const t0 = audioCtx.currentTime + i * 0.35; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3); o.start(t0); o.stop(t0 + 0.32); }
    } catch (e) {}
  }
  function renderFocus(main) {
    const s = Timer.st; const r = Timer.remaining(); const C = 2 * Math.PI * 46;
    const musts = (S.day.musts || []).filter(m => !m.done);
    const used = focusUsedMins();
    const preset = (m, mode) => `<button class="preset ${mode === 'break' ? 'brk' : ''} ${s.mode === mode && s.total === m * 60 ? 'active' : ''}" data-action="preset" data-m="${m}" data-mode="${mode}">${m}</button>`;
    main.innerHTML = `<div class="focus-view ${S.zen ? 'zen' : ''}"><div class="focus-inner">
      <div class="focus-presets">${[25, 15, 10].map(m => preset(m, 'work')).join('')}<span style="width:10px"></span>${[5, 15].map(m => preset(m, 'break')).join('')}<input class="preset" type="number" min="1" max="240" placeholder="min" data-action="preset-input" style="width:72px;text-align:center"></div>
      <div class="focus-dial ${s.mode === 'break' ? 'break' : ''}">
        <svg viewBox="0 0 100 100"><circle class="track" cx="50" cy="50" r="46"/><circle id="fxFill" class="fill" cx="50" cy="50" r="46" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - (s.total ? r / s.total : 0))}"/></svg>
        <div class="center"><div class="mode">${s.mode === 'work' ? 'Focus' : 'Break'}</div><div class="time" id="fxTime">${pad(Math.floor(r / 60))}:${pad(r % 60)}</div><div class="task">${esc(s.label || '')}</div></div>
      </div>
      <div class="focus-controls"><button class="btn btn-primary" id="fxToggle" data-action="fx-toggle">${s.running ? 'Pause' : (r === s.total ? 'Start' : 'Resume')}</button><button class="btn" data-action="fx-reset">Reset</button><button class="btn btn-ghost" data-action="fx-skip" title="Skip to next phase">Skip</button></div>
      <div class="focus-opts">
        <select data-action="fx-task"><option value="">No task</option>${musts.map(m => `<option value="${m.id}" ${s.taskId === m.id ? 'selected' : ''}>${esc(m.text)}</option>`).join('')}</select>
        <label><input type="checkbox" data-action="fx-auto" ${S.settings.autoCycle ? 'checked' : ''}> auto work ↔ break</label>
        <label><input type="checkbox" data-action="fx-sound" ${S.settings.sound ? 'checked' : ''}> sound</label>
        <label><input type="checkbox" data-action="fx-zen" ${S.zen ? 'checked' : ''}> quiet mode</label>
      </div>
      <div class="focus-stats"><span>today <b>${(used / 60).toFixed(1)}h</b></span><span>sessions <b>${(S.day.sessions || []).length}</b></span><span>cycle <b>${(s.cycles || 0) % 4 + 1}/4</b></span></div>
      ${mottoBlock()}
    </div></div>`;
    if (s.running) Timer.loop();
  }

  // ---------------------------------------------------------------- NOTES (legacy Quill docs)
  let quill = null;
  const NOTE_TABS = [
    { id: 'daily', label: 'Daily', doc: () => { const [y, m, d] = S.notesDate.split('-'); return `day-${y}-${m}-${d}-milestones`; }, dated: true, ph: 'Daily notes, plans, scratch…' },
    { id: 'progress', label: 'Progress report', doc: () => 'deadlineInput', ph: 'Running progress report across projects.' },
    { id: 'yearly', label: 'Yearly goals', doc: () => `year-${S.notesDate.slice(0, 4)}-milestones`, ph: 'What this year is for.' },
    { id: 'achievement', label: 'Achievements', doc: () => `year-${S.notesDate.slice(0, 4)}-achievement`, ph: 'Wins and reflections.' },
    { id: 'vision', label: 'Vision', doc: () => 'visionInput', ph: 'The long view.' },
    { id: 'question', label: 'Question', doc: () => `question-${S.qIdx == null ? 'none' : S.qIdx}`, ph: 'Your answer…' }
  ];
  function destroyQuill() { quill = null; }
  function renderNotes(main) {
    const tab = NOTE_TABS.find(t => t.id === S.notesTab) || NOTE_TABS[0];
    main.innerHTML = `<div class="view-head"><div><h1>Notes</h1></div></div>
      <div class="notes-tabs">${NOTE_TABS.map(t => `<button class="notes-tab ${t.id === tab.id ? 'active' : ''}" data-action="notes-tab" data-tab="${t.id}">${t.label}</button>`).join('')}</div>
      <div class="notes-bar">
        ${tab.dated || tab.id === 'yearly' || tab.id === 'achievement' ? `<input type="date" value="${S.notesDate}" data-action="notes-date"><button class="btn btn-sm" data-action="notes-today">Today</button>` : ''}
        ${tab.id === 'question' ? `<button class="btn btn-sm" data-action="q-new">New question</button>` : ''}
        <span class="muted small" id="noteStatus"></span>
      </div>
      ${tab.id === 'question' ? `<div class="q-box"><div class="q" id="qText">${S.qIdx == null ? '<span class="muted">Press "New question" for a reflection prompt.</span>' : (window.questions || [])[S.qIdx]}</div></div>` : ''}
      <div class="note-editor"><div id="noteEditor"></div></div>
      ${tab.id === 'question' ? `<div class="q-answered" id="qAnswered"></div>` : ''}`;
    mountQuill(tab);
    if (tab.id === 'question') loadAnswered();
  }
  function mountQuill(tab) {
    quill = new Quill('#noteEditor', {
      theme: 'snow', placeholder: tab.ph,
      modules: { clipboard: { matchVisual: false }, toolbar: [['bold', 'italic', 'underline', 'strike'], [{ list: 'check' }, { list: 'bullet' }], [{ indent: '-1' }, { indent: '+1' }], [{ header: [1, 2, 3, false] }], ['link'], ['clean']] },
      formats: ['bold', 'italic', 'underline', 'strike', 'list', 'indent', 'header', 'link', 'color', 'background', 'code-block', 'blockquote', 'image', 'video', 'code', 'script', 'align', 'size', 'font']
    });
    quill.root.spellcheck = false;
    const docName = tab.doc();
    if (tab.id === 'question' && S.qIdx == null) { quill.disable(); return; }
    const status = $('#noteStatus'); status.textContent = 'loading…';
    const mine = quill;
    const cached = Store.cached(docName); if (cached) mine.clipboard.dangerouslyPasteHTML(cached);
    Store.getRaw(docName).then(html => {
      if (quill !== mine) return;
      mine.off('text-change'); mine.disable(); mine.clipboard.dangerouslyPasteHTML(html || ''); mine.enable(); mine.history.clear();
      status.textContent = '';
      mine.on('text-change', debounce(() => { const v = mine.getText().trim() === '' ? '' : mine.root.innerHTML; Store.setRaw(docName, v); status.textContent = 'saved'; setTimeout(() => { if (status.textContent === 'saved') status.textContent = ''; }, 1200); }, 400));
    });
  }
  async function loadAnswered() {
    const box = $('#qAnswered'); if (!box) return;
    try {
      const snap = await Store.col().get(); const idx = [];
      snap.forEach(d => { if (d.id.startsWith('question-')) { const i = parseInt(d.id.split('-')[1]); if (!isNaN(i) && (window.questions || [])[i]) idx.push(i); } });
      if (!$('#qAnswered')) return;
      box.innerHTML = idx.length ? `<h3 style="margin:6px 0">Answered</h3>` + idx.map(i => { const q = window.questions[i]; const m = q.match(/<b>(.*?)<\/b>/); return `<div class="item"><span class="txt">${m ? m[1] : q}</span><span class="actions"><button class="btn-xs btn" data-action="q-open" data-i="${i}">Open</button><button class="btn-xs btn btn-danger" data-action="q-del" data-i="${i}">Delete</button></span></div>`; }).join('') : '';
    } catch (e) { console.warn(e); }
  }

  // ---------------------------------------------------------------- SETTINGS
  function renderSettings(main) {
    const s = S.settings;
    main.innerHTML = `<div class="view-head"><div><h1>Settings</h1><div class="sub">Signed in as <b>${esc(Store.user)}</b></div></div><button class="btn" data-action="signout">Sign out</button></div>
      <div class="settings">
        <section class="card"><div class="card-head"><h3>Appearance</h3></div>
          <span class="seg">${['auto', 'light', 'dark'].map(t => `<button data-action="theme" data-t="${t}" class="${s.theme === t ? 'active' : ''}">${t}</button>`).join('')}</span></section>
        <section class="card"><div class="card-head"><h3>Mottos</h3><span class="muted small">shown on Today and Focus</span></div>
          <div class="mottos">${s.mottos.map((m, i) => `<div class="row"><input value="${esc(m)}" data-action="motto-edit" data-i="${i}" maxlength="120"><button class="btn-icon" data-action="motto-del" data-i="${i}">✕</button></div>`).join('')}</div>
          <div style="margin-top:8px"><button class="btn btn-xs" data-action="motto-add">+ Add</button></div></section>
        <section class="card"><div class="card-head"><h3>Focus timer</h3></div>
          <div class="form-row">
            <label class="field"><span>Work (min)</span><input type="number" min="1" max="180" value="${s.work}" data-action="set-num" data-k="work"></label>
            <label class="field"><span>Short break (min)</span><input type="number" min="1" max="60" value="${s.brk}" data-action="set-num" data-k="brk"></label>
            <label class="field"><span>Long break (min)</span><input type="number" min="1" max="90" value="${s.longBrk}" data-action="set-num" data-k="longBrk"></label>
          </div></section>
        <section class="card"><div class="card-head"><h3>Day timeline</h3></div>
          <div class="form-row">
            <label class="field"><span>Day starts (hour)</span><input type="number" min="0" max="12" value="${s.dayStart}" data-action="set-num" data-k="dayStart"></label>
            <label class="field"><span>Day ends (hour)</span><input type="number" min="13" max="24" value="${s.dayEnd}" data-action="set-num" data-k="dayEnd"></label>
          </div></section>
        <section class="card"><div class="card-head"><h3>Data</h3></div>
          <div class="row"><button class="btn btn-sm" data-action="export">Export goals + today (JSON)</button><button class="btn btn-sm" data-action="load-template">Append template goals</button></div>
          <p class="muted small" style="margin-top:8px">Everything is stored under your account in Firestore, encrypted client-side. Notes from the previous version are read from the same documents.</p></section>
      </div>`;
  }

  // ---------------------------------------------------------------- events (delegated)
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-action]'); if (!t) return;
    if (t.tagName === 'INPUT' || t.tagName === 'SELECT') return; // handled by change
    const a = t.dataset.action, id = t.dataset.id;
    switch (a) {
      case 'open-goal': openGoalModal(id); break;
      case 'goal-new': openGoalModal(''); break;
      case 'goal-del': { const g = goalById(id); if (!g) break; if (t.dataset.confirm) { S.goals = S.goals.filter(x => x.id !== id); saveGoals(); closeModal(); render(); toast('Deleted'); } else { t.dataset.confirm = '1'; t.textContent = 'Really delete?'; } break; }
      case 'modal-bg': if (e.target === t) closeModal(); break;
      case 'modal-close': closeModal(); break;
      case 'load-template': S.goals = S.goals.concat(templateGoals()); saveGoals(); render(); toast('Template loaded'); break;
      case 'go-focus': route('focus'); break;
      case 'go-goals': route('goals'); break;
      case 'must-del': S.day.musts = S.day.musts.filter(m => m.id !== id); saveDay(); render(); break;
      case 'must-focus': { const m = S.day.musts.find(x => x.id === id); if (m) { Timer.st.taskId = m.id; Timer.st.label = m.text; Timer.save(); route('focus'); } break; }
      case 'must-unpin': { const m = S.day.musts.find(x => x.id === id); if (m) { delete m.start; saveDay(); render(); } break; }
      case 'tl-range': S.tlRange = +t.dataset.r; render(); break;
      case 'preset': Timer.reset(t.dataset.mode, +t.dataset.m, true); renderFocus($('#main')); break;
      case 'fx-toggle': Timer.toggle(); break;
      case 'fx-reset': Timer.reset(Timer.st.mode, Timer.st.total / 60, true); break;
      case 'fx-skip': { const s = Timer.st; clearInterval(Timer._iv); s.running = false; if (s.mode === 'work') Timer.reset('break', S.settings.brk, true); else Timer.reset('work', S.settings.work, true); renderFocus($('#main')); break; }
      case 'notes-tab': S.notesTab = t.dataset.tab; render(); break;
      case 'notes-today': S.notesDate = todayKey(); render(); break;
      case 'q-new': S.qIdx = Math.floor(Math.random() * (window.questions || []).length); render(); break;
      case 'q-open': S.qIdx = +t.dataset.i; render(); break;
      case 'q-del': Store.col().doc(`question-${t.dataset.i}`).delete().then(() => { try { localStorage.removeItem(Store.cacheKey(`question-${t.dataset.i}`)); } catch (x) {} if (S.qIdx === +t.dataset.i) S.qIdx = null; render(); }); break;
      case 'theme': S.settings.theme = t.dataset.t; saveSettings(); render(); break;
      case 'motto-add': S.settings.mottos.push(''); saveSettings(); render(); $$('[data-action=motto-edit]').pop().focus(); break;
      case 'motto-del': S.settings.mottos.splice(+t.dataset.i, 1); saveSettings(); render(); break;
      case 'export': { const blob = new Blob([JSON.stringify({ goals: S.goals, day: S.day, dayKey: S.dayKey, settings: S.settings }, null, 2)], { type: 'application/json' }); const a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob); a2.download = `pathfinder-${todayKey()}.json`; a2.click(); break; }
      case 'signout': Store.flush(); auth.signOut(); break;
    }
  });

  document.addEventListener('change', e => {
    const t = e.target.closest('[data-action]'); if (!t) return;
    const a = t.dataset.action, id = t.dataset.id;
    switch (a) {
      case 'must-toggle': { const m = S.day.musts.find(x => x.id === id); if (m) { m.done = t.checked; saveDay(); render(); } break; }
      case 'goal-status': { const g = goalById(id); if (g) { g.status = t.value; saveGoals(); render(); } break; }
      case 'goal-field': { const g = goalById(id); if (g) { g[t.dataset.k] = t.value.trim(); saveGoals(); } break; }
      case 'bn-flag': { const g = goalById(t.value); if (g) { g.status = 'at-risk'; saveGoals(); render(); const ta = $(`.bn-edit[data-id="${g.id}"]`); if (ta) ta.focus(); } break; }
      case 'ms-toggle': { const g = goalById(id); const m = g && (g.milestones || []).find(x => x.id === t.dataset.ms); if (m) { m.done = t.checked; saveGoals(); render(); } break; }
      case 'fx-task': { const m = (S.day.musts || []).find(x => x.id === t.value); Timer.st.taskId = t.value; Timer.st.label = m ? m.text : ''; Timer.save(); $('.focus-dial .task').textContent = Timer.st.label; break; }
      case 'preset-input': { const n = parseInt(t.value); if (n > 0 && n <= 240) { Timer.reset('work', n, true); renderFocus($('#main')); } break; }
      case 'fx-auto': S.settings.autoCycle = t.checked; saveSettings(); break;
      case 'fx-sound': S.settings.sound = t.checked; saveSettings(); break;
      case 'fx-zen': S.zen = t.checked; $('.focus-view').classList.toggle('zen', S.zen); break;
      case 'notes-date': S.notesDate = t.value || todayKey(); render(); break;
      case 'motto-edit': S.settings.mottos[+t.dataset.i] = t.value; saveSettings(); break;
      case 'set-num': { const n = +t.value; if (n > 0 || t.dataset.k === 'dayStart') { S.settings[t.dataset.k] = n; saveSettings(); } break; }
    }
  });

  document.addEventListener('submit', e => {
    const f = e.target.closest('[data-form]'); if (!f) return;
    e.preventDefault(); const fd = new FormData(f);
    switch (f.dataset.form) {
      case 'must-add': { const text = (fd.get('text') || '').trim(); if (!text) return; S.day.musts = S.day.musts || []; S.day.musts.push({ id: uid(), text, done: false, goalId: fd.get('goalId') || '', minutes: +fd.get('minutes') || 30 }); saveDay(); render(); break; }
    }
  });

  // minute tick for "now" marker on Today
  setInterval(() => { if (S.view === 'today' && !$('#modalRoot').firstChild && document.activeElement.tagName !== 'INPUT') { const nl = $('.cal-now'); if (nl) { const now = new Date(); const nowM = now.getHours() * 60 + now.getMinutes(); nl.style.top = ((nowM - S.settings.dayStart * 60) / 60 * HH) + 'px'; nl.querySelector('span').textContent = minsToHM(nowM); } } }, 60000);

})();
