const HABITS_KEY = 'habits:list:v5', MAX_HABITS = 12, MIN_HABITS = 1;
const INITIAL_HABITS = [
  'Sport / renfo / repos',
  'Alimentation',
  'Douche froide',
  'Vitamine',
  'Lecture',
  'Méditation prière',
];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const SVG_SIZE = 640, CENTER = 320, OUTER_R = 290, INNER_R = 110;
const A_START = -Math.PI / 2 + 0.02, A_END = Math.PI;

const state = {
  habits: [...INITIAL_HABITS],
  editBuffer: [],
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  data: {}
};

let selectedDate = new Date();
let weekOffset = 0;
let weekSwipeStart = null, weekSwiped = false;
let reorderBuffer = [];

function getWeekMonday(offset) {
  const today = new Date();
  const dow = today.getDay();
  const m = new Date(today);
  m.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  m.setHours(0, 0, 0, 0);
  return m;
}

const DAY_NAMES_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MONTHS_SHORT_FR = ['jan.','fév.','mar.','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];

function updatePageTitleForSelectedDate() {
  const el = document.getElementById('pageTitle');
  if (!el) return;
  const today = new Date();
  el.textContent = selectedDate.toDateString() === today.toDateString()
    ? "Aujourd'hui"
    : `${DAY_NAMES_FR[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTHS_SHORT_FR[selectedDate.getMonth()]}`;
}

const app = document.getElementById('app');
const modalBackdrop = document.getElementById('modalBackdrop');
const editList = document.getElementById('editList');

function updateAllMonthLabels() {
  const lbl = `${MONTHS_FR[state.month]} ${state.year}`;
  const ml = document.getElementById('monthLabel');
  const mlf = document.getElementById('monthLabelFocus');
  if (ml) ml.textContent = lbl;
  if (mlf) mlf.textContent = lbl;
}

function dataKey(y, m) { return `habits:v4:${y}-${String(m+1).padStart(2,'0')}`; }
function daysInMonth(y, m) { return new Date(y, m+1, 0).getDate(); }
function escapeAttr(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

function arcPath(cx, cy, r0, r1, a0, a1) {
  const x0O=cx+r1*Math.cos(a0), y0O=cy+r1*Math.sin(a0);
  const x1O=cx+r1*Math.cos(a1), y1O=cy+r1*Math.sin(a1);
  const x0I=cx+r0*Math.cos(a1), y0I=cy+r0*Math.sin(a1);
  const x1I=cx+r0*Math.cos(a0), y1I=cy+r0*Math.sin(a0);
  const la = (a1-a0) > Math.PI ? 1 : 0;
  return `M ${x0O} ${y0O} A ${r1} ${r1} 0 ${la} 1 ${x1O} ${y1O} L ${x0I} ${y0I} A ${r0} ${r0} 0 ${la} 0 ${x1I} ${y1I} Z`;
}

async function loadHabits() {
  try {
    const r = await window.storage.get(HABITS_KEY);
    if (r && r.value) { const p = JSON.parse(r.value); if (Array.isArray(p) && p.length >= MIN_HABITS) state.habits = p; }
  } catch(e) {}
}
async function saveHabits() { try { await window.storage.set(HABITS_KEY, JSON.stringify(state.habits)); } catch(e) {} }
async function loadMonth() {
  try { const r = await window.storage.get(dataKey(state.year, state.month)); state.data = r && r.value ? JSON.parse(r.value) : {}; }
  catch(e) { state.data = {}; }
}
async function saveMonth() { try { await window.storage.set(dataKey(state.year, state.month), JSON.stringify(state.data)); } catch(e) {} }

function render() {
  updateAllMonthLabels();
  const days = daysInMonth(state.year, state.month);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === state.year && today.getMonth() === state.month;
  const isFutureMonth = (state.year > today.getFullYear()) || (state.year === today.getFullYear() && state.month > today.getMonth());
  const todayDay = isCurrentMonth ? today.getDate() : (isFutureMonth ? 0 : 32);
  const bandCount = state.habits.length;
  const bandW = (OUTER_R - INNER_R) / bandCount;
  const arcSpan = A_END - A_START;
  const anglePerDay = arcSpan / days;

  let svg = `<svg viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" xmlns="http://www.w3.org/2000/svg">`;

  for (let h = 0; h < bandCount; h++) {
    const bandIdx = bandCount - 1 - h;
    const bottomRadius = INNER_R + bandIdx * bandW;
    const yLineSvg = CENTER - bottomRadius;
    svg += `<line x1="0" y1="${yLineSvg}" x2="${CENTER}" y2="${yLineSvg}" stroke="#e5e5ea" stroke-width="1.2" />`;
  }

  for (let d = 1; d <= days; d++) {
    const a0 = A_START + (d-1) * anglePerDay, a1 = A_START + d * anglePerDay;
    const dayOfWeek = new Date(state.year, state.month, d).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    for (let h = 0; h < bandCount; h++) {
      const bandIdx = bandCount - 1 - h;
      const r0 = INNER_R + bandIdx * bandW, r1 = INNER_R + (bandIdx+1) * bandW;
      const path = arcPath(CENTER, CENTER, r0, r1, a0, a1);
      const val = (state.data[d] && state.data[d][h]) || 0;
      const isFuture = isFutureMonth || (isCurrentMonth && d > todayDay);
      let cls = 'cell ';
      if (isFuture) cls += isWeekend ? 'cell-future-weekend' : 'cell-future';
      else if (val === 1) cls += 'cell-done';
      else if (val === 2) cls += 'cell-fail';
      else cls += isWeekend ? 'cell-empty-weekend' : 'cell-empty';
      svg += `<path class="${cls}" d="${path}" data-cell="${d}-${h}" data-day="${d}" data-habit="${h}" />`;
    }
    const labelR = OUTER_R + 16, aMid = (a0+a1)/2;
    const lx = CENTER + labelR * Math.cos(aMid), ly = CENTER + labelR * Math.sin(aMid) + 3.5;
    svg += `<text class="day-num${isWeekend ? ' day-num-weekend' : ''}" x="${lx}" y="${ly}" text-anchor="middle">${d}</text>`;
  }
  svg += '</svg>';

  let doneCount = 0, totalPossible = 0;
  const maxDay = isCurrentMonth ? todayDay : (isFutureMonth ? 0 : days);
  for (let d = 1; d <= maxDay; d++) for (let h = 0; h < bandCount; h++) { totalPossible++; if (state.data[d] && state.data[d][h] === 1) doneCount++; }
  const pct = totalPossible > 0 ? Math.round(doneCount / totalPossible * 100) : 0;

  let habitsHtml = '<div class="habits-list">';
  for (let i = 0; i < bandCount; i++) {
    const bandIdx = bandCount - 1 - i;
    const bottomRadius = INNER_R + bandIdx * bandW;
    const topPct = ((CENTER - bottomRadius) / SVG_SIZE) * 100;
    habitsHtml += `<div class="habit-line" style="top:${topPct}%"><div class="habit-line-inner"><span class="habit-num">${i+1}.</span><input class="habit-name" data-habit="${i}" value="${escapeAttr(state.habits[i])}" placeholder="—" /></div></div>`;
  }
  habitsHtml += '</div>';

  const centerHtml = `<div class="center-month-label"><div class="lbl">MONTH / YEAR</div><div class="mo">${MONTHS_FR[state.month]}</div><div class="yr">${state.year}</div>${totalPossible > 0 ? `<div class="pct">${pct}%</div>` : ''}</div>`;

  app.innerHTML = `<div class="ring-container">${svg}${habitsHtml}${centerHtml}</div><div class="legend"><div class="legend-item"><span class="legend-swatch" style="background:#34c759"></span>Fait</div><div class="legend-item"><span class="legend-swatch" style="background:#ff3b30"></span>Raté</div><div class="legend-item"><span class="legend-swatch" style="background:#f9f9f9;border:1px solid #e5e5ea"></span>Vide</div></div>`;

  app.querySelectorAll('.cell').forEach(el => {
    if (el.classList.contains('cell-future') || el.classList.contains('cell-future-weekend')) return;
    el.addEventListener('click', () => cycleCell(parseInt(el.dataset.day,10), parseInt(el.dataset.habit,10)));
  });
  app.querySelectorAll('.habit-name').forEach(inp => {
    inp.addEventListener('change', e => { state.habits[parseInt(e.target.dataset.habit,10)] = e.target.value.trim(); saveHabits(); });
  });
}

function cycleCell(day, habit) {
  if (!state.data[day]) state.data[day] = {};
  const cur = state.data[day][habit] || 0;
  state.data[day][habit] = (cur + 1) % 3;
  if (state.data[day][habit] === 0) delete state.data[day][habit];
  if (Object.keys(state.data[day] || {}).length === 0) delete state.data[day];
  saveMonth(); render();
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-cell="${day}-${habit}"]`);
    if (el) { el.classList.add('popping'); setTimeout(() => el.classList.remove('popping'), 230); }
  });
}

function renderEditList() {
  editList.innerHTML = '';
  state.editBuffer.forEach((name, i) => {
    const row = document.createElement('div');
    row.className = 'edit-row';
    row.innerHTML = `<span class="n">${i+1}.</span><input type="text" value="${escapeAttr(name)}" placeholder="Nom de l'habitude" data-idx="${i}" /><button class="del" data-idx="${i}" ${state.editBuffer.length <= MIN_HABITS ? 'disabled' : ''}>×</button>`;
    editList.appendChild(row);
  });
  editList.querySelectorAll('input').forEach(inp => inp.addEventListener('input', e => { state.editBuffer[parseInt(e.target.dataset.idx,10)] = e.target.value; }));
  editList.querySelectorAll('.del').forEach(btn => btn.addEventListener('click', e => {
    const i = parseInt(e.currentTarget.dataset.idx,10);
    if (state.editBuffer.length > MIN_HABITS) { state.editBuffer.splice(i,1); renderEditList(); }
  }));
  document.getElementById('addHabit').disabled = state.editBuffer.length >= MAX_HABITS;
}

function openSettings() { state.editBuffer = [...state.habits]; renderEditList(); modalBackdrop.classList.add('open'); }
function closeSettings() { modalBackdrop.classList.remove('open'); }
async function saveSettings() {
  const newHabits = state.editBuffer.map(s => s.trim());
  if (newHabits.length < MIN_HABITS) return;
  if (newHabits.length < state.habits.length) {
    for (const d in state.data) {
      for (const h in state.data[d]) { if (parseInt(h,10) >= newHabits.length) delete state.data[d][h]; }
      if (Object.keys(state.data[d]).length === 0) delete state.data[d];
    }
    await saveMonth();
  }
  state.habits = newHabits; await saveHabits(); render(); renderCalendarGrid(); renderTodayHabits(); renderWeekStrip(); closeSettings();
}

document.getElementById('openSettings').addEventListener('click', openSettings);
document.getElementById('modalClose').addEventListener('click', closeSettings);
document.getElementById('cancelEdit').addEventListener('click', closeSettings);
document.getElementById('saveEdit').addEventListener('click', saveSettings);
document.getElementById('addHabit').addEventListener('click', () => { if (state.editBuffer.length < MAX_HABITS) { state.editBuffer.push(''); renderEditList(); } });
modalBackdrop.addEventListener('click', e => { if (e.target === modalBackdrop) closeSettings(); });

document.querySelector('.topbar-menu').addEventListener('click', openReorder);
document.getElementById('reorderClose').addEventListener('click', closeReorder);
document.getElementById('reorderCancel').addEventListener('click', closeReorder);
document.getElementById('reorderSave').addEventListener('click', saveReorder);
document.getElementById('reorderBackdrop').addEventListener('click', e => { if (e.target.id === 'reorderBackdrop') closeReorder(); });

document.getElementById('prevMonth').addEventListener('click', async () => { state.month--; if (state.month < 0) { state.month=11; state.year--; } await loadMonth(); renderCalendarGrid(); });
document.getElementById('nextMonth').addEventListener('click', async () => { state.month++; if (state.month > 11) { state.month=0; state.year++; } await loadMonth(); renderCalendarGrid(); });
document.getElementById('prevMonthFocus').addEventListener('click', async () => { state.month--; if (state.month < 0) { state.month=11; state.year--; } await loadMonth(); render(); });
document.getElementById('nextMonthFocus').addEventListener('click', async () => { state.month++; if (state.month > 11) { state.month=0; state.year++; } await loadMonth(); render(); });

document.getElementById('fabBtn').addEventListener('click', openSettings);

document.getElementById('piliersBtn').addEventListener('click', () => {
  document.getElementById('piliersOverlay').style.display = 'flex';
});
document.getElementById('piliersClose').addEventListener('click', () => {
  document.getElementById('piliersOverlay').style.display = 'none';
});

// ── Calendar grid ────────────────────────────────────────────────────────────

function renderCalendarGrid() {
  const gridEl = document.getElementById('calGrid');
  if (!gridEl) return;
  updateAllMonthLabels();

  const days = daysInMonth(state.year, state.month);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === state.year && today.getMonth() === state.month;
  const isFutureMonth = (state.year > today.getFullYear()) || (state.year === today.getFullYear() && state.month > today.getMonth());
  const todayDay = isCurrentMonth ? today.getDate() : -1;
  const activeCount = state.habits.filter(h => h.trim()).length;

  const firstDow = new Date(state.year, state.month, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const prevMonthDays = daysInMonth(
    state.month === 0 ? state.year - 1 : state.year,
    state.month === 0 ? 11 : state.month - 1
  );

  const R = 14, CIRC = +(2 * Math.PI * R).toFixed(2);
  const DAY_LABELS = ['L.','M.','M.','J.','V.','S.','D.'];

  function daySvg(num, opts = {}) {
    const { bgFill = 'none', ringColor = '#f2f2f7', ringW = 2, arcColor = '', arcOffset = CIRC, textColor = '#1c1c1e', bold = false } = opts;
    const textW = bold ? 'bold' : '600';
    const arc = arcColor
      ? `<circle cx="17" cy="17" r="${R}" fill="none" stroke="${arcColor}" stroke-width="2.5" stroke-dasharray="${CIRC}" stroke-dashoffset="${arcOffset}" stroke-linecap="round" transform="rotate(-90 17 17)"/>`
      : '';
    return `<svg width="34" height="34" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
      <circle cx="17" cy="17" r="${R}" fill="${bgFill}" stroke="${ringColor}" stroke-width="${ringW}"/>
      ${arc}
      <text x="17" y="21.5" text-anchor="middle" font-size="11.5" font-weight="${textW}" fill="${textColor}" font-family="-apple-system,sans-serif">${num}</text>
    </svg>`;
  }

  let html = '<div class="cal-ring-outer">';
  html += '<div class="cal-row-headers">';
  DAY_LABELS.forEach(l => { html += `<div class="cal-row-header">${l}</div>`; });
  html += '</div><div class="cal-ring-days">';

  for (let i = 0; i < startOffset; i++) {
    const dn = prevMonthDays - startOffset + 1 + i;
    html += `<div class="cal-ring-cell">${daySvg(dn, { textColor: '#d1d1d6' })}</div>`;
  }

  for (let d = 1; d <= days; d++) {
    const isToday = d === todayDay;
    const isFuture = isFutureMonth || (isCurrentMonth && d > todayDay);
    const dow = new Date(state.year, state.month, d).getDay();
    const isWeekend = dow === 0 || dow === 6;
    const bgRing = isWeekend ? '#dddaf5' : '#f2f2f7';

    let doneCount = 0;
    if (!isFuture && activeCount > 0) {
      doneCount = Object.values(state.data[d] || {}).filter(v => v === 1).length;
    }
    const pct = activeCount > 0 ? doneCount / activeCount : 0;
    const full = doneCount > 0 && pct >= 1;
    const dashOffset = +(CIRC * (1 - pct)).toFixed(2);

    let svgHtml;
    if (isToday) {
      const outerRing = full ? `<circle cx="17" cy="17" r="${R}" fill="none" stroke="#34c759" stroke-width="2.5"/>` : '';
      svgHtml = `<svg width="34" height="34" viewBox="0 0 34 34" xmlns="http://www.w3.org/2000/svg">
        <circle cx="17" cy="17" r="${R}" fill="#5856d6"/>
        ${outerRing}
        <text x="17" y="21.5" text-anchor="middle" font-size="11.5" font-weight="bold" fill="white" font-family="-apple-system,sans-serif">${d}</text>
      </svg>`;
    } else if (isFuture) {
      svgHtml = daySvg(d, { textColor: '#c7c7cc', ringColor: bgRing });
    } else {
      const arcColor = pct > 0 ? (full ? '#34c759' : '#5856d6') : '';
      svgHtml = daySvg(d, { arcColor, arcOffset: dashOffset, ringColor: bgRing });
    }

    html += `<div class="cal-ring-cell" data-day="${d}">${svgHtml}</div>`;
  }

  const totalCells = startOffset + days;
  const nextFill = Math.ceil(totalCells / 7) * 7 - totalCells;
  for (let i = 1; i <= nextFill; i++) {
    html += `<div class="cal-ring-cell">${daySvg(i, { textColor: '#d1d1d6' })}</div>`;
  }

  html += '</div></div>';
  gridEl.innerHTML = html;

  gridEl.querySelectorAll('.cal-ring-cell[data-day]').forEach(cell => {
    cell.addEventListener('pointerdown', e => {
      e.preventDefault();
      switchToTodayForDate(new Date(state.year, state.month, parseInt(cell.dataset.day, 10)));
    });
  });

  renderCalStats();
}

function renderCalStats() {
  const statsEl = document.getElementById('calStats');
  if (!statsEl) return;
  const activeCount = state.habits.filter(h => h.trim()).length;
  if (!activeCount) { statsEl.innerHTML = ''; return; }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === state.year && today.getMonth() === state.month;
  const isPastMonth = (state.year < today.getFullYear()) || (state.year === today.getFullYear() && state.month < today.getMonth());
  const days = daysInMonth(state.year, state.month);
  const maxDay = isCurrentMonth ? today.getDate() : (isPastMonth ? days : 0);

  let doneDays = 0, totalPossible = 0, doneHabits = 0;
  let run = 0, bestStreak = 0;
  for (let d = 1; d <= maxDay; d++) {
    const vals = Object.values(state.data[d] || {});
    const dn = vals.filter(v => v === 1).length;
    doneHabits += dn; totalPossible += activeCount;
    if (dn >= activeCount) doneDays++;
    if (vals.some(v => v === 1)) { run++; bestStreak = Math.max(bestStreak, run); }
    else run = 0;
  }

  const currentStreak = isCurrentMonth ? calcStreak() : 0;
  const rate = totalPossible > 0 ? Math.round((doneHabits / totalPossible) * 100) : 0;
  const periodLabel = isCurrentMonth ? 'Ce mois' : `${MONTHS_SHORT_FR[state.month]} ${state.year}`;

  statsEl.innerHTML = `<div class="stats-section">
    <div class="stats-header">
      <span class="stats-title">Records</span>
      <span class="stats-period-label">${periodLabel}</span>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-top"><span class="stat-card-num">${currentStreak}</span><span class="stat-card-icon">🔥</span></div>
        <div class="stat-card-label">Série en cours</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><span class="stat-card-num">${bestStreak}</span><span class="stat-card-icon">🏅</span></div>
        <div class="stat-card-label">Meilleure série</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><span class="stat-card-num">${doneDays}</span><span class="stat-card-icon">📋</span></div>
        <div class="stat-card-label">Terminé</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-top"><span class="stat-card-num">${rate} %</span><span class="stat-card-icon">🏁</span></div>
        <div class="stat-card-label">Taux de réussite</div>
      </div>
    </div>
  </div>`;
}

function switchToTodayForDate(date) {
  selectedDate = date;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const todayBtn = document.querySelector('.nav-btn[data-tab="today"]');
  if (todayBtn) todayBtn.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-today');
  if (panel) panel.classList.add('active');
  updatePageTitleForSelectedDate();
  renderTodayHabits();
  renderWeekStrip();
}

// ── Streak & week strip ───────────────────────────────────────────────────────

function calcStreak() {
  const today = new Date();
  if (!state.habits.filter(h => h.trim()).length) return 0;
  const todayDay = today.getDate();
  const todayDone = Object.values(state.data[todayDay] || {}).some(v => v === 1);
  let streak = 0;
  for (let d = todayDone ? todayDay : todayDay - 1; d >= 1; d--) {
    if (Object.values(state.data[d] || {}).some(v => v === 1)) streak++;
    else break;
  }
  return streak;
}

function renderWeekStrip() {
  const widgetEl = document.getElementById('streakWidget');
  if (!widgetEl) return;

  const today = new Date();
  const monday = getWeekMonday(weekOffset);
  const DAY_LABELS = ['L','M','M','J','V','S','D'];
  const activeCount = state.habits.filter(h => h.trim()).length;
  const R = 14, CIRC = +(2 * Math.PI * R).toFixed(2);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  let daysHtml = '';
  weekDates.forEach((d, i) => {
    const dayNum = d.getDate();
    const inLoadedMonth = d.getFullYear() === state.year && d.getMonth() === state.month;
    const isToday = d.toDateString() === today.toDateString();
    const isSelected = d.toDateString() === selectedDate.toDateString();

    let doneCount = 0;
    if (inLoadedMonth && activeCount > 0) {
      doneCount = Object.values(state.data[dayNum] || {}).filter(v => v === 1).length;
    }
    const pct = activeCount > 0 ? doneCount / activeCount : 0;
    const full = pct === 1;
    const offset = +(CIRC * (1 - pct)).toFixed(2);

    let ringColor, innerBg, textColor, content;
    if (isSelected) {
      const fillColor = full ? '#34c759' : '#5856d6';
      ringColor = fillColor; innerBg = fillColor; textColor = 'white'; content = full ? '✓' : dayNum;
    } else if (isToday) {
      ringColor = full ? '#34c759' : '#5856d6';
      innerBg = 'transparent'; textColor = '#1c1c1e'; content = dayNum;
    } else {
      const isPast = d < today;
      if (full) { ringColor = '#1c1c1e'; innerBg = 'transparent'; textColor = '#1c1c1e'; content = '✓'; }
      else if (pct > 0) { ringColor = '#5856d6'; innerBg = 'transparent'; textColor = '#1c1c1e'; content = dayNum; }
      else { ringColor = '#e5e5ea'; innerBg = 'transparent'; textColor = isPast ? '#8e8e93' : '#c7c7cc'; content = dayNum; }
    }

    const arcSvg = pct > 0 && !isSelected
      ? `<circle cx="17" cy="17" r="${R}" fill="none" stroke="${ringColor}" stroke-width="2.5" stroke-dasharray="${CIRC}" stroke-dashoffset="${offset}" stroke-linecap="round" transform="rotate(-90 17 17)"/>`
      : '';

    daysHtml += `<div class="s-day" data-week-idx="${i}">
      <span class="s-day-label">${DAY_LABELS[i]}</span>
      <div class="s-circle-wrap">
        <svg viewBox="0 0 34 34"><circle cx="17" cy="17" r="${R}" fill="none" stroke="#e5e5ea" stroke-width="2.5"/>${arcSvg}</svg>
        <div class="s-circle-inner" style="background:${innerBg};color:${textColor};font-weight:${(isSelected || isToday) ? 700 : 600}">${content}</div>
      </div>
    </div>`;
  });

  const streak = calcStreak();
  const label = streak === 1 ? 'Jour' : 'Jours';
  const flameColor = streak > 0 ? 'white' : '#c7c7cc';
  const labelColor = streak > 0 ? '#ff6b35' : '#c7c7cc';
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
  const weekRangeLabel = weekOffset !== 0
    ? `<div class="streak-week-range">${monday.getDate()} ${MONTHS_SHORT_FR[monday.getMonth()]} – ${sunday.getDate()} ${MONTHS_SHORT_FR[sunday.getMonth()]}</div>` : '';

  let streakSinceHtml = '';
  if (streak > 0 && state.year === today.getFullYear() && state.month === today.getMonth()) {
    const todayDone = Object.values(state.data[today.getDate()] || {}).some(v => v === 1);
    const startD = new Date(today);
    startD.setDate(today.getDate() - (todayDone ? streak - 1 : streak));
    streakSinceHtml = `<span class="s-streak-since">depuis le ${startD.getDate()} ${MONTHS_SHORT_FR[startD.getMonth()]}</span>`;
  }

  widgetEl.innerHTML = `<div class="streak-card">
    <div class="streak-left">
      <div class="s-flame-wrap"><span class="s-flame-bg">🔥</span><span class="s-flame-count" style="color:${flameColor}">${streak || 0}</span></div>
      <span class="s-streak-label" style="color:${labelColor}">${label}</span>
      ${streakSinceHtml}
    </div>
    <div class="streak-sep"></div>
    <div class="streak-week-col"><div class="streak-week" id="streakWeekDays"><div class="streak-week-track">${daysHtml}</div></div>${weekRangeLabel}</div>
  </div>`;

  const weekEl = widgetEl.querySelector('#streakWeekDays');

  // Day tap (pointerup to not conflict with swipe)
  weekEl.querySelectorAll('.s-day').forEach((el, i) => {
    el.addEventListener('pointerup', e => {
      if (weekSwiped) return;
      e.preventDefault();
      const d = weekDates[i];
      if (d.getFullYear() !== state.year || d.getMonth() !== state.month) {
        state.year = d.getFullYear(); state.month = d.getMonth();
        loadMonth().then(() => { selectedDate = d; updatePageTitleForSelectedDate(); renderWeekStrip(); renderTodayHabits(); });
      } else {
        selectedDate = d; updatePageTitleForSelectedDate(); renderWeekStrip(); renderTodayHabits();
      }
    });
  });

  // Swipe to navigate weeks — live drag + slide-in
  const getTrack = () => weekEl.querySelector('.streak-week-track');

  weekEl.addEventListener('touchstart', e => {
    weekSwipeStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    weekSwiped = false;
    const t = getTrack(); if (t) t.style.transition = 'none';
  }, { passive: true });

  weekEl.addEventListener('touchmove', e => {
    if (!weekSwipeStart) return;
    const dx = e.touches[0].clientX - weekSwipeStart.x;
    const dy = Math.abs(e.touches[0].clientY - weekSwipeStart.y);
    if (Math.abs(dx) > dy && Math.abs(dx) > 8) {
      weekSwiped = true;
      e.preventDefault();
      const t = getTrack(); if (t) t.style.transform = `translateX(${dx * 0.45}px)`;
    }
  }, { passive: false });

  weekEl.addEventListener('touchend', e => {
    if (!weekSwipeStart) return;
    const dx = e.changedTouches[0].clientX - weekSwipeStart.x;
    weekSwipeStart = null;

    if (weekSwiped && Math.abs(dx) > 40) {
      weekOffset += dx > 0 ? -1 : 1;
      const newMonday = getWeekMonday(weekOffset);
      const mid = new Date(newMonday); mid.setDate(newMonday.getDate() + 3);
      const needLoad = mid.getFullYear() !== state.year || mid.getMonth() !== state.month;
      const slideIn = () => {
        renderWeekStrip();
        const nt = document.querySelector('#streakWeekDays .streak-week-track');
        if (!nt) return;
        const from = dx > 0 ? '55%' : '-55%';
        nt.style.cssText = `transform:translateX(${from});transition:none`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          nt.style.cssText = `transform:translateX(0);transition:transform 0.28s cubic-bezier(0.25,0.46,0.45,0.94)`;
          nt.addEventListener('transitionend', () => { nt.style.cssText = ''; }, { once: true });
        }));
      };
      if (needLoad) { state.year = mid.getFullYear(); state.month = mid.getMonth(); loadMonth().then(slideIn); }
      else slideIn();
    } else {
      const t = getTrack();
      if (t) {
        t.style.transition = 'transform 0.22s ease';
        t.style.transform = 'translateX(0)';
        t.addEventListener('transitionend', () => { t.style.cssText = ''; }, { once: true });
      }
    }
  });
}

// ── Today view ────────────────────────────────────────────────────────────────

const PILLAR_COLORS = {
  body:   { bg: '#ffe5e5', color: '#d63030' },
  mind:   { bg: '#f0ecff', color: '#7c5af2' },
  spirit: { bg: '#fff9d0', color: '#b07800' },
};

function getHabitVisual(name, index) {
  const n = (name || '').toLowerCase();
  if (/douche|shower/.test(n))                   return { pillar: 'body',   emoji: '🚿' };
  if (/vitamine|vitamin|supplém/.test(n))        return { pillar: 'body',   emoji: '💊' };
  if (/prière|priere|prayer/.test(n))            return { pillar: 'spirit', emoji: '🙏' };
  if (/run|courir|jogg/.test(n))                  return { pillar: 'body',   emoji: '🏃' };
  if (/jolt/.test(n))                             return { pillar: 'body',   emoji: '⚡' };
  if (/étirement|etirement|stretch/.test(n))      return { pillar: 'body',   emoji: '🤸' };
  if (/respir|breath/.test(n))                    return { pillar: 'body',   emoji: '🌬️' };
  if (/sommeil|sleep|dorm|nuit/.test(n))          return { pillar: 'body',   emoji: '😴' };
  if (/alimentation|manger|nutrit|repas/.test(n)) return { pillar: 'body',   emoji: '🥗' };
  if (/fruit|légume/.test(n))                     return { pillar: 'body',   emoji: '🥗' };
  if (/sexe|sex/.test(n))                         return { pillar: 'body',   emoji: '🔥' };
  if (/exerc|sport|gym|muscl|fit/.test(n))        return { pillar: 'body',   emoji: '💪' };
  if (/march|walk/.test(n))                       return { pillar: 'body',   emoji: '🚶' };
  if (/eau|water|hydrat/.test(n))                 return { pillar: 'body',   emoji: '💧' };
  if (/amour|love|couple|relation/.test(n))       return { pillar: 'mind',   emoji: '❤️' };
  if (/travail|work|boulot|projet/.test(n))       return { pillar: 'mind',   emoji: '💼' };
  if (/loisir|hobby|jeu|game/.test(n))            return { pillar: 'mind',   emoji: '🎮' };
  if (/lire|lecture|read|livre|book/.test(n))     return { pillar: 'mind',   emoji: '📚' };
  if (/créat|creat|art/.test(n))                  return { pillar: 'mind',   emoji: '🎨' };
  if (/médit|meditat/.test(n))                    return { pillar: 'spirit', emoji: '🧘' };
  if (/yoga/.test(n))                             return { pillar: 'spirit', emoji: '🧘' };
  if (/bienveill|kindn/.test(n))                  return { pillar: 'spirit', emoji: '🌸' };
  if (/inspir/.test(n))                           return { pillar: 'spirit', emoji: '✨' };
  if (/famille|family/.test(n))                   return { pillar: 'spirit', emoji: '👨‍👩‍👧' };
  if (/ami|friend|proch/.test(n))                 return { pillar: 'spirit', emoji: '👥' };
  const defaults = [
    { pillar: 'body',   emoji: '🎯' },
    { pillar: 'mind',   emoji: '⭐' },
    { pillar: 'spirit', emoji: '☀️' },
    { pillar: 'body',   emoji: '🔥' },
    { pillar: 'mind',   emoji: '💡' },
    { pillar: 'spirit', emoji: '🌈' },
  ];
  return defaults[index % defaults.length];
}

function renderTodayHabits() {
  const pendingSection = document.getElementById('pendingSection');
  const doneSection = document.getElementById('doneSection');
  if (!pendingSection) return;

  const selDay = selectedDate.getDate();
  const dataAvailable = selectedDate.getFullYear() === state.year && selectedDate.getMonth() === state.month;

  const activeHabits = state.habits.map((name, i) => ({ name, i })).filter(h => h.name.trim());

  if (!activeHabits.length) {
    pendingSection.innerHTML = '<div class="habit-card" style="justify-content:center;color:#8e8e93;font-size:15px;text-align:center;">Aucune habitude.<br>Appuie sur + pour commencer.</div>';
    if (doneSection) doneSection.innerHTML = '';
    return;
  }

  let pendingHtml = '';
  let doneHtml = '';

  const todayNorm = new Date(); todayNorm.setHours(0,0,0,0);
  const selNorm = new Date(selectedDate); selNorm.setHours(0,0,0,0);
  const isPastDay = dataAvailable && selNorm < todayNorm;

  activeHabits.forEach(h => {
    const val = dataAvailable && state.data[selDay] ? (state.data[selDay][h.i] || 0) : 0;
    const isDone = val === 1;
    const isMissed = isPastDay && !isDone;
    const v = getHabitVisual(h.name, h.i);
    const c = PILLAR_COLORS[v.pillar];
    const pillLabel = v.pillar === 'body' ? 'Body' : v.pillar === 'mind' ? 'Mind' : 'Spirit';
    const iconBg = isMissed ? '#fff0f0' : c.bg;
    const card = `<div class="habit-card${isDone ? ' done-card' : ''}" data-habit="${h.i}" data-day="${selDay}">
      <div class="habit-card-icon" style="background:${iconBg}">${v.emoji}</div>
      <div class="habit-card-body">
        <div class="habit-card-name${isDone ? ' done-name' : isMissed ? ' missed-name' : ''}">${escapeAttr(h.name)}</div>
        <div class="habit-card-meta"><span class="pillar-tag pillar-${v.pillar}">${pillLabel}</span></div>
      </div>
      <button class="habit-card-btn${isDone ? ' done-btn' : isMissed ? ' missed-btn' : ''}" data-habit="${h.i}">${isDone ? '✓' : isMissed ? '✗' : ''}</button>
    </div>`;
    if (isDone) doneHtml += card;
    else pendingHtml += card;
  });

  pendingSection.innerHTML = pendingHtml;
  if (doneSection) doneSection.innerHTML = doneHtml;

  document.querySelectorAll('.habit-card-btn').forEach(btn => {
    btn.addEventListener('pointerdown', e => {
      if (!dataAvailable) return;
      e.preventDefault();
      e.stopPropagation();
      const card = btn.closest('.habit-card');
      const habitIdx = parseInt(btn.dataset.habit, 10);
      btn.classList.add('animating');
      setTimeout(() => {
        // FLIP: record current position before re-render
        const firstRect = card ? card.getBoundingClientRect() : null;
        if (!state.data[selDay]) state.data[selDay] = {};
        const cur = state.data[selDay][habitIdx] || 0;
        const next = cur === 1 ? 0 : 1;
        if (next === 0) delete state.data[selDay][habitIdx];
        else state.data[selDay][habitIdx] = next;
        if (Object.keys(state.data[selDay] || {}).length === 0) delete state.data[selDay];
        saveMonth();
        renderTodayHabits();
        renderWeekStrip();
        // FLIP: animate card from old position to new position
        if (firstRect) {
          requestAnimationFrame(() => {
            const newCard = document.querySelector(`.habit-card[data-habit="${habitIdx}"]`);
            if (!newCard) return;
            const lastRect = newCard.getBoundingClientRect();
            const dy = firstRect.top - lastRect.top;
            if (Math.abs(dy) < 5) return;
            newCard.style.cssText = `transform:translateY(${dy}px);opacity:0.4;transition:none`;
            requestAnimationFrame(() => {
              newCard.style.cssText = `transform:translateY(0);opacity:1;transition:transform 0.38s cubic-bezier(0.25,0.46,0.45,0.94),opacity 0.3s ease`;
              newCard.addEventListener('transitionend', () => { newCard.style.cssText = ''; }, { once: true });
            });
          });
        }
      }, 280);
    });
  });
}

// ── Reorder ───────────────────────────────────────────────────────────────────

function openReorder() {
  reorderBuffer = state.habits
    .map((name, i) => ({ name, origIdx: i }))
    .filter(h => h.name.trim());
  if (!reorderBuffer.length) return;
  renderReorderList();
  document.getElementById('reorderBackdrop').classList.add('open');
}

function closeReorder() {
  document.getElementById('reorderBackdrop').classList.remove('open');
}

function renderReorderList() {
  const container = document.getElementById('reorderList');
  container.innerHTML = reorderBuffer.map((h, i) => {
    const v = getHabitVisual(h.name, h.origIdx);
    const c = PILLAR_COLORS[v.pillar];
    return `<div class="reorder-item" data-ri="${i}">
      <span class="reorder-handle">⠿</span>
      <div class="reorder-emoji" style="background:${c.bg}">${v.emoji}</div>
      <span class="reorder-name">${escapeAttr(h.name)}</span>
    </div>`;
  }).join('');
  setupReorderDrag(container);
}

function setupReorderDrag(container) {
  container.querySelectorAll('.reorder-handle').forEach((handle, idx) => {
    handle.addEventListener('pointerdown', e => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      const item = handle.closest('.reorder-item');
      const itemH = item.offsetHeight + 8;
      let dy = 0;
      const startY = e.clientY;
      item.classList.add('is-dragging');

      function onMove(ev) {
        dy = ev.clientY - startY;
        item.style.transform = `translateY(${dy}px)`;
        const toIdx = Math.max(0, Math.min(reorderBuffer.length - 1, idx + Math.round(dy / itemH)));
        [...container.querySelectorAll('.reorder-item')].forEach((el, domIdx) => {
          if (el === item) return;
          let shift = 0;
          if (toIdx < idx && domIdx >= toIdx && domIdx < idx) shift = itemH;
          if (toIdx > idx && domIdx > idx && domIdx <= toIdx) shift = -itemH;
          el.style.transform = `translateY(${shift}px)`;
          el.style.transition = 'transform 0.16s ease';
        });
      }

      function onUp() {
        handle.removeEventListener('pointermove', onMove);
        const toIdx = Math.max(0, Math.min(reorderBuffer.length - 1, idx + Math.round(dy / itemH)));
        item.classList.remove('is-dragging');
        item.style.cssText = '';
        [...container.querySelectorAll('.reorder-item')].forEach(el => { el.style.cssText = ''; });
        if (toIdx !== idx) {
          const [moved] = reorderBuffer.splice(idx, 1);
          reorderBuffer.splice(toIdx, 0, moved);
          renderReorderList();
        }
      }

      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp, { once: true });
    });
  });
}

async function saveReorder() {
  const activeCount = reorderBuffer.length;
  const empties = state.habits.filter(h => !h.trim());
  const newHabits = [...reorderBuffer.map(h => h.name), ...empties];

  const oldToNew = {};
  reorderBuffer.forEach((h, newIdx) => { oldToNew[h.origIdx] = newIdx; });
  let ei = activeCount;
  state.habits.forEach((name, oldIdx) => { if (!name.trim()) oldToNew[oldIdx] = ei++; });

  for (const day in state.data) {
    const old = { ...state.data[day] };
    state.data[day] = {};
    for (const k in old) {
      const ni = oldToNew[parseInt(k, 10)];
      if (ni !== undefined) state.data[day][ni] = old[k];
    }
    if (!Object.keys(state.data[day]).length) delete state.data[day];
  }

  state.habits = newHabits;
  await saveHabits();
  await saveMonth();
  render(); renderCalendarGrid(); renderTodayHabits(); renderWeekStrip();
  closeReorder();
}

// ── Tab navigation ─────────────────────────────────────────────────────────────

const PAGE_TITLES = { today: "Aujourd'hui", calendar: 'Calendrier', fruits: 'Fruits & Légumes', focus: 'Focus', more: 'Paramètres' };

document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => btn.addEventListener('click', async () => {
  const id = btn.dataset.tab;

  if (id === 'more') { openSettings(); return; }

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.add('active');

  const pageTitleEl = document.getElementById('pageTitle');
  if (pageTitleEl) pageTitleEl.textContent = PAGE_TITLES[id] || '';

  if (id === 'fruits') { await loadFruits(); renderFruits(); }
  else if (id === 'today') {
    const t = new Date();
    selectedDate = t; weekOffset = 0;
    if (state.year !== t.getFullYear() || state.month !== t.getMonth()) {
      state.year = t.getFullYear(); state.month = t.getMonth(); await loadMonth();
    }
    updatePageTitleForSelectedDate();
    renderTodayHabits(); renderWeekStrip();
  }
  else if (id === 'calendar') { await loadMonth(); renderCalendarGrid(); }
  else if (id === 'focus') { render(); }
}));

// ── Fruits ─────────────────────────────────────────────────────────────────────

const FRUIT_GOAL = 30;
const EMOJI_MAP = {
  'pomme':{e:'🍎',t:'f',s:[1,2,3,4,9,10,11,12]},'poire':{e:'🍐',t:'f',s:[1,2,3,8,9,10,11,12]},'orange':{e:'🍊',t:'f',s:[1,2,3,4,11,12]},'citron':{e:'🍋',t:'f',s:[1,2,3,4,5,10,11,12]},'banane':{e:'🍌',t:'f',s:[1,2,3,4,5,6,7,8,9,10,11,12]},'pasteque':{e:'🍉',t:'f',s:[6,7,8,9]},'raisin':{e:'🍇',t:'f',s:[8,9,10,11]},'fraise':{e:'🍓',t:'f',s:[4,5,6,7]},'myrtille':{e:'🫐',t:'f',s:[7,8,9]},'melon':{e:'🍈',t:'f',s:[6,7,8,9]},'cerise':{e:'🍒',t:'f',s:[5,6,7]},'peche':{e:'🍑',t:'f',s:[6,7,8,9]},'mangue':{e:'🥭',t:'f',s:[1,2,3,4,5,12]},'ananas':{e:'🍍',t:'f',s:[1,2,3,4,5,6,7,8,9,10,11,12]},'kiwi':{e:'🥝',t:'f',s:[1,2,3,4,5,10,11,12]},'avocat':{e:'🥑',t:'f',s:[1,2,3,4,5,10,11,12]},'framboise':{e:'🫐',t:'f',s:[6,7,8,9]},'abricot':{e:'🍑',t:'f',s:[6,7,8]},'figue':{e:'🍇',t:'f',s:[7,8,9,10]},'prune':{e:'🍑',t:'f',s:[7,8,9,10]},'clementine':{e:'🍊',t:'f',s:[10,11,12,1,2]},'mandarine':{e:'🍊',t:'f',s:[11,12,1,2]},'nectarine':{e:'🍑',t:'f',s:[6,7,8,9]},'tomate':{e:'🍅',t:'v',s:[6,7,8,9,10]},'aubergine':{e:'🍆',t:'v',s:[6,7,8,9,10]},'carotte':{e:'🥕',t:'v',s:[1,2,3,4,5,6,7,8,9,10,11,12]},'mais':{e:'🌽',t:'v',s:[7,8,9,10]},'poivron':{e:'🫑',t:'v',s:[6,7,8,9,10]},'concombre':{e:'🥒',t:'v',s:[5,6,7,8,9]},'brocoli':{e:'🥦',t:'v',s:[6,7,8,9,10,11]},'salade':{e:'🥬',t:'v',s:[1,2,3,4,5,6,7,8,9,10,11,12]},'epinard':{e:'🥬',t:'v',s:[3,4,5,6,9,10,11]},'chou':{e:'🥬',t:'v',s:[1,2,3,9,10,11,12]},'ail':{e:'🧄',t:'v',s:[1,2,3,4,5,6,7,8,9,10,11,12]},'oignon':{e:'🧅',t:'v',s:[1,2,3,4,5,6,7,8,9,10,11,12]},'champignon':{e:'🍄',t:'v',s:[9,10,11,12,1]},'courgette':{e:'🥒',t:'v',s:[5,6,7,8,9,10]},'asperge':{e:'🌱',t:'v',s:[4,5,6]},'haricot vert':{e:'🫛',t:'v',s:[6,7,8,9]},'petit pois':{e:'🫛',t:'v',s:[5,6,7]},'betterave':{e:'🥕',t:'v',s:[1,2,3,6,7,8,9,10,11,12]},'radis':{e:'🥕',t:'v',s:[3,4,5,6,7,8,9]},'poireau':{e:'🥬',t:'v',s:[1,2,3,4,9,10,11,12]},'courge':{e:'🎃',t:'v',s:[9,10,11,12]},'potiron':{e:'🎃',t:'v',s:[9,10,11,12]},'patate douce':{e:'🍠',t:'v',s:[9,10,11,12,1]},'pomme de terre':{e:'🥔',t:'v',s:[1,2,3,4,5,6,7,8,9,10,11,12]},'endive':{e:'🥬',t:'v',s:[1,2,3,10,11,12]},'chou-fleur':{e:'🥦',t:'v',s:[1,2,3,4,9,10,11,12]},'fenouil':{e:'🥬',t:'v',s:[6,7,8,9,10]},'celeri':{e:'🥬',t:'v',s:[1,2,8,9,10,11,12]},'navet':{e:'🥔',t:'v',s:[1,2,3,4,9,10,11,12]},'artichaut':{e:'🌱',t:'v',s:[5,6,7,8,9]},'lentille':{e:'🫘',t:'v',s:[1,2,3,4,5,6,7,8,9,10,11,12]},'patate':{e:'🥔',t:'v',s:[1,2,3,4,5,6,7,8,9,10,11,12]}
};

const MONTH_NAMES_LOWER = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

function normalizeName(name) { return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim().replace(/s$/,''); }
function guessItem(name) { const n=normalizeName(name); if(EMOJI_MAP[n])return EMOJI_MAP[n]; for(const k in EMOJI_MAP){if(n.includes(k)||k.includes(n))return EMOJI_MAP[k];} return{e:'🌱',t:'f',s:[]}; }
function currentMonth() { return new Date().getMonth()+1; }

function getISOWeek(date) {
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  const dn=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-dn);
  const ys=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return{year:d.getUTCFullYear(),week:Math.ceil(((d-ys)/86400000+1)/7)};
}
function getMondayOfISOWeek(year,week) {
  const s=new Date(Date.UTC(year,0,1+(week-1)*7)); const dow=s.getUTCDay();
  const m=new Date(s); if(dow<=4)m.setUTCDate(s.getUTCDate()-s.getUTCDay()+1); else m.setUTCDate(s.getUTCDate()+8-s.getUTCDay()); return m;
}
function formatWeekDates(year,week) {
  const m=getMondayOfISOWeek(year,week),s=new Date(m); s.setUTCDate(m.getUTCDate()+6);
  const f=d=>`${String(d.getUTCDate()).padStart(2,'0')}/${String(d.getUTCMonth()+1).padStart(2,'0')}`;
  return`${f(m)} → ${f(s)}`;
}

const fruitState = { year:getISOWeek(new Date()).year, week:getISOWeek(new Date()).week, items:[] };
function fruitKey(y,w){return`fruits:v1:${y}-W${String(w).padStart(2,'0')}`;}
async function loadFruits(){try{const r=await window.storage.get(fruitKey(fruitState.year,fruitState.week));fruitState.items=r&&r.value?JSON.parse(r.value):[];}catch(e){fruitState.items=[];}}
async function saveFruits(){try{await window.storage.set(fruitKey(fruitState.year,fruitState.week),JSON.stringify(fruitState.items));}catch(e){}}

const DICT_ITEMS = Object.keys(EMOJI_MAP).map(k=>({name:k.charAt(0).toUpperCase()+k.slice(1),emoji:EMOJI_MAP[k].e,type:EMOJI_MAP[k].t,season:EMOJI_MAP[k].s||[],normalized:k})).sort((a,b)=>a.name.localeCompare(b.name,'fr'));

function getSuggestions(query) {
  const q=normalizeName(query); if(!q)return[];
  const mo=currentMonth();
  return DICT_ITEMS.filter(it=>it.normalized.includes(q)).sort((a,b)=>{
    const ap=a.normalized.startsWith(q)?0:1,bp=b.normalized.startsWith(q)?0:1;
    if(ap!==bp)return ap-bp;
    const as=a.season.includes(mo)?0:1,bs=b.season.includes(mo)?0:1;
    if(as!==bs)return as-bs;
    return a.name.localeCompare(b.name,'fr');
  }).slice(0,6);
}

let suggestionIndex=-1,currentSuggestions=[];

function renderSuggestions(query) {
  const box=document.getElementById('suggestions'); if(!box)return;
  currentSuggestions=getSuggestions(query);
  if(!currentSuggestions.length){box.classList.add('hidden');box.innerHTML='';suggestionIndex=-1;return;}
  const q=normalizeName(query);
  box.innerHTML=currentSuggestions.map((s,i)=>{
    const idx=s.normalized.indexOf(q);
    const html=idx===0?`<span class="match">${escapeAttr(s.name.slice(0,q.length))}</span>${escapeAttr(s.name.slice(q.length))}`:escapeAttr(s.name);
    const sb=s.season.includes(currentMonth())?'<span class="season-badge">🌱</span>':'';
    return`<div class="suggestion${i===suggestionIndex?' highlighted':''}" data-i="${i}"><span class="emoji">${s.emoji}</span><span class="sugg-name">${html}</span>${sb}</div>`;
  }).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('.suggestion').forEach(el=>{
    const h=e=>{e.preventDefault();e.stopPropagation();pickSuggestion(parseInt(el.dataset.i,10));};
    el.addEventListener('pointerdown',h); el.addEventListener('touchstart',h,{passive:false});
  });
}

function pickSuggestion(i){const s=currentSuggestions[i];if(!s)return;document.getElementById('fruitInput').value=s.name;document.getElementById('suggestions').classList.add('hidden');suggestionIndex=-1;currentSuggestions=[];addFruit();}

async function addFruit() {
  const input=document.getElementById('fruitInput'),raw=input.value.trim(); if(!raw)return;
  const norm=normalizeName(raw),existing=fruitState.items.find(it=>normalizeName(it.name)===norm);
  if(existing){existing.qty++;}else{const g=guessItem(raw);fruitState.items.push({name:raw,emoji:g.e,type:g.t,season:g.s||[],qty:1});}
  input.value='';document.getElementById('suggestions').classList.add('hidden');currentSuggestions=[];await saveFruits();renderFruits();
}

function renderSeasonStrip() {
  const strip=document.getElementById('seasonStrip'); if(!strip)return;
  const mo=currentMonth(),already=new Set(fruitState.items.map(it=>normalizeName(it.name)));
  const inSeason=DICT_ITEMS.filter(it=>it.season.includes(mo)&&!already.has(it.normalized));
  const picks=[...inSeason.filter(it=>it.type==='f').slice(0,6),...inSeason.filter(it=>it.type==='v').slice(0,6)];
  document.getElementById('seasonMonth').textContent=MONTH_NAMES_LOWER[mo-1];
  if(!picks.length){strip.innerHTML='<div class="season-empty">Tout est déjà ajouté 👏</div>';return;}
  strip.innerHTML=picks.map(it=>`<button class="season-chip" data-name="${escapeAttr(it.name)}"><span class="emoji">${it.emoji}</span><span>${escapeAttr(it.name)}</span></button>`).join('');
  strip.querySelectorAll('.season-chip').forEach(chip=>chip.addEventListener('click',async()=>{document.getElementById('fruitInput').value=chip.dataset.name;await addFruit();}));
}

function renderFruits() {
  document.getElementById('weekLabel').textContent=`S${fruitState.week}`;
  document.getElementById('weekDates').textContent=`${fruitState.year} · ${formatWeekDates(fruitState.year,fruitState.week)}`;
  fruitState.items.forEach(it=>{if(!it.type)it.type=guessItem(it.name).t;if(!it.season)it.season=guessItem(it.name).s||[];});
  renderSeasonStrip();
  const mo=currentMonth(),count=fruitState.items.length;
  const fruitsOnly=fruitState.items.filter(it=>it.type!=='v').length,veggiesOnly=fruitState.items.filter(it=>it.type==='v').length;
  document.getElementById('fruitsCount').textContent=count;
  document.getElementById('fruitsOnlyCount').textContent=fruitsOnly;
  document.getElementById('veggiesCount').textContent=veggiesOnly;
  const pct=Math.min(100,(count/FRUIT_GOAL)*100);
  document.getElementById('progressFill').style.width=pct+'%';
  document.getElementById('progressFill').style.background=count>=FRUIT_GOAL?'#34c759':'#5856d6';
  const list=document.getElementById('fruitsList');
  if(!fruitState.items.length){list.innerHTML='<div class="fruits-empty">Aucun fruit ou légume cette semaine.<br>Commence par en ajouter un ci-dessus.</div>';return;}
  const fruitsArr=[],veggiesArr=[];
  fruitState.items.forEach((item,i)=>{if(item.type==='v')veggiesArr.push({item,i});else fruitsArr.push({item,i});});
  const renderSection=(title,emoji,arr)=>{
    if(!arr.length)return'';
    return`<div class="section-header"><span class="section-title">${emoji} ${title}</span><span class="section-count">${arr.length}</span></div>${arr.map((entry,idx)=>{const inS=entry.item.season&&entry.item.season.includes(mo);return`<div class="fruit-item${inS?' in-season':''}"><span class="idx">${idx+1}.</span><div class="name-wrap"><span class="emoji">${entry.item.emoji}</span><span class="name">${escapeAttr(entry.item.name)}</span>${inS?'<span class="season-badge">🌱</span>':''}${entry.item.qty>1?`<span class="qty-badge">×${entry.item.qty}</span>`:''}</div><div class="qty-controls"><button class="qty-btn" data-act="dec" data-i="${entry.i}">−</button><span class="qty-num">${entry.item.qty}</span><button class="qty-btn" data-act="inc" data-i="${entry.i}">+</button></div><button class="type-toggle" data-act="toggle" data-i="${entry.i}">${entry.item.type==='f'?'🥕':'🍎'}</button><button class="del" data-act="del" data-i="${entry.i}">×</button></div>`;}).join('')}`;
  };
  list.innerHTML=renderSection('Fruits','🍎',fruitsArr)+renderSection('Légumes','🥕',veggiesArr);
  list.querySelectorAll('button[data-act]').forEach(btn=>btn.addEventListener('click',e=>{
    const i=parseInt(e.currentTarget.dataset.i,10),act=e.currentTarget.dataset.act;
    if(act==='inc')fruitState.items[i].qty++;
    else if(act==='dec')fruitState.items[i].qty=Math.max(1,fruitState.items[i].qty-1);
    else if(act==='del')fruitState.items.splice(i,1);
    else if(act==='toggle')fruitState.items[i].type=fruitState.items[i].type==='f'?'v':'f';
    saveFruits();renderFruits();
  }));
}

const fruitInput=document.getElementById('fruitInput');
document.getElementById('addFruitBtn').addEventListener('click',addFruit);
['input','keyup','change'].forEach(ev=>fruitInput.addEventListener(ev,()=>{suggestionIndex=-1;renderSuggestions(fruitInput.value);}));
fruitInput.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'&&currentSuggestions.length){e.preventDefault();suggestionIndex=(suggestionIndex+1)%currentSuggestions.length;renderSuggestions(fruitInput.value);}
  else if(e.key==='ArrowUp'&&currentSuggestions.length){e.preventDefault();suggestionIndex=suggestionIndex<=0?currentSuggestions.length-1:suggestionIndex-1;renderSuggestions(fruitInput.value);}
  else if(e.key==='Enter'){e.preventDefault();if(suggestionIndex>=0&&currentSuggestions[suggestionIndex])pickSuggestion(suggestionIndex);else addFruit();}
  else if(e.key==='Escape')document.getElementById('suggestions').classList.add('hidden');
});
fruitInput.addEventListener('blur',()=>setTimeout(()=>document.getElementById('suggestions').classList.add('hidden'),200));
fruitInput.addEventListener('focus',()=>{if(fruitInput.value.trim())renderSuggestions(fruitInput.value);});

document.getElementById('prevWeek').addEventListener('click',async()=>{
  fruitState.week--;if(fruitState.week<1){fruitState.year--;const ld=new Date(fruitState.year,11,28);fruitState.week=getISOWeek(ld).week;}
  await loadFruits();renderFruits();
});
document.getElementById('nextWeek').addEventListener('click',async()=>{
  fruitState.week++;const ld=new Date(fruitState.year,11,28);const max=getISOWeek(ld).week;if(fruitState.week>max){fruitState.year++;fruitState.week=1;}
  await loadFruits();renderFruits();
});

// ── Init ───────────────────────────────────────────────────────────────────────

(async function init() {
  const splashStart = Date.now();
  await loadHabits();
  await loadMonth();
  render();
  renderCalendarGrid();
  renderTodayHabits();
  renderWeekStrip();
  const wait = Math.max(0, 1100 - (Date.now() - splashStart));
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (!splash) return;
    splash.style.opacity = '0';
    setTimeout(() => splash.remove(), 460);
  }, wait);
})();
