// Interactive timeline for the measures graph-perf records. One lane per Nx
// process, one bar per measure, packed into rows so a measure nested inside
// another sits below it and concurrent work sits beside it.

(() => {
  const data = JSON.parse(document.getElementById('data').textContent);

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const KINDS = ['client', 'daemon', 'worker', 'other'];
  const KIND_LABELS = ['Client', 'Daemon', 'Plugin worker', 'Other'];
  const GUTTER = 250;
  const ROW_H = 15;
  const BAR_H = 11;
  const LANE_GAP = 9;
  const AXIS_H = 26;
  const MIN_SPAN = 2;

  const el = (id) => document.getElementById(id);
  const make = (name) => document.createElementNS(SVG_NS, name);

  // Lane labels are cut from the front, since the plugin and the pid at the
  // end are what tell two workers apart. The full text stays on the element.
  const LANE_CHARS = Math.floor((GUTTER - 16) / 6.1);
  const fitLabel = (text) => (text.length <= LANE_CHARS ? text : `…${text.slice(1 - LANE_CHARS)}`);

  const state = { run: 0, filter: '', table: false, view: null, hot: null };

  let lanes = [];
  let placed = [];
  let domain = 1;

  // -- formatting ----------------------------------------------------------

  const fmtDur = (v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${v.toFixed(1)} ms`);
  const fmtAt = (v) => (v >= 1000 ? `+${(v / 1000).toFixed(2)} s` : `+${Math.round(v)} ms`);

  function fmtTick(t, step) {
    if (step >= 1000) return `${t / 1000}s`;
    if (step >= 100) return `${(t / 1000).toFixed(1)}s`;
    return `${t}ms`;
  }

  function ticks(start, end) {
    const raw = (end - start) / 8 || 1;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = ([1, 2, 5, 10].find((m) => mag * m >= raw) ?? 10) * mag;
    const list = [];
    for (let t = Math.ceil(start / step) * step; t <= end; t += step) list.push(t);
    return { list, step };
  }

  // Text inside a fill takes white or black by whichever clears the fill.
  const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

  function inkOn(fill) {
    const m = /^#?([0-9a-f]{6})$/i.exec(fill.trim());
    if (!m) return '#ffffff';
    const n = parseInt(m[1], 16);
    const lum =
      0.2126 * channel(((n >> 16) & 255) / 255) +
      0.7152 * channel(((n >> 8) & 255) / 255) +
      0.0722 * channel((n & 255) / 255);
    return 1.05 / (lum + 0.05) >= (lum + 0.05) / 0.05 ? '#ffffff' : '#000000';
  }

  const fillOf = (kind) => getComputedStyle(document.documentElement).getPropertyValue(`--${KINDS[kind]}`);

  // -- layout --------------------------------------------------------------

  /** Bars of the selected run, packed into rows per process. */
  function buildLanes() {
    const q = state.filter.trim().toLowerCase();
    const out = [];
    for (const lane of data.lanes) {
      const bars = [];
      for (const [run, nameIndex, start, dur] of lane.b) {
        if (run !== state.run) continue;
        const name = data.names[nameIndex];
        if (q && !name.toLowerCase().includes(q)) continue;
        bars.push({ name, start, dur, row: 0 });
      }
      if (!bars.length) continue;
      bars.sort((a, b) => a.start - b.start || b.dur - a.dur);
      const rowEnds = [];
      for (const bar of bars) {
        let row = rowEnds.findIndex((end) => end <= bar.start);
        if (row < 0) row = rowEnds.length;
        rowEnds[row] = bar.start + bar.dur;
        bar.row = row;
      }
      const [label, kind] = data.roles[lane.r];
      out.push({ pid: lane.p, label, kind, bars, rows: rowEnds.length, start: bars[0].start });
    }
    out.sort((a, b) => a.start - b.start || a.label.localeCompare(b.label));
    return out;
  }

  const plotWidth = () => Math.max(240, el('lanes').clientWidth - GUTTER - 12);
  const scale = (t) => GUTTER + ((t - state.view.start) / (state.view.end - state.view.start)) * plotWidth();
  const unscale = (x) => state.view.start + ((x - GUTTER) / plotWidth()) * (state.view.end - state.view.start);

  // -- rendering -----------------------------------------------------------

  function renderAxis() {
    const width = GUTTER + plotWidth() + 12;
    const svg = make('svg');
    svg.setAttribute('height', AXIS_H);
    svg.setAttribute('viewBox', `0 0 ${width} ${AXIS_H}`);
    const { list, step } = ticks(state.view.start, state.view.end);
    for (const t of list) {
      const x = scale(t);
      const text = make('text');
      text.setAttribute('class', 'tick-text');
      text.setAttribute('x', x);
      text.setAttribute('y', AXIS_H - 8);
      text.setAttribute('text-anchor', 'middle');
      text.textContent = fmtTick(t, step);
      svg.append(text);
    }
    el('ticks').replaceChildren(svg);
  }

  function renderScrollbar() {
    const track = el('scrollbar');
    const thumb = el('thumb');
    const width = track.clientWidth;
    const span = state.view.end - state.view.start;
    const size = Math.max(24, (span / domain) * width);
    // The thumb travels `width - size`, not `width`, so its minimum size does
    // not push the right end past the track.
    const travel = width - size;
    const room = domain - span;
    thumb.style.width = `${size}px`;
    thumb.style.left = `${room > 0 ? (state.view.start / room) * travel : 0}px`;
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(Math.round(domain)));
    track.setAttribute('aria-valuenow', String(Math.round(state.view.start)));
    track.setAttribute('aria-valuetext', `${fmtAt(state.view.start)} to ${fmtAt(state.view.end)}`);
  }

  function renderLanes() {
    const host = el('lanes');
    placed = [];
    if (!lanes.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'No measures match this run and filter.';
      host.replaceChildren(empty);
      return;
    }

    const width = GUTTER + plotWidth() + 12;
    const height = lanes.reduce((sum, lane) => sum + lane.rows * ROW_H + LANE_GAP, 0) + 8;
    const svg = make('svg');
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const clipId = 'plot-clip';
    const defs = make('defs');
    const clip = make('clipPath');
    clip.setAttribute('id', clipId);
    const clipRect = make('rect');
    clipRect.setAttribute('x', GUTTER);
    clipRect.setAttribute('y', 0);
    clipRect.setAttribute('width', width - GUTTER);
    clipRect.setAttribute('height', height);
    clip.append(clipRect);
    defs.append(clip);
    svg.append(defs);

    const { list } = ticks(state.view.start, state.view.end);
    for (const t of list) {
      const line = make('line');
      line.setAttribute('class', 'tick-line');
      line.setAttribute('x1', scale(t));
      line.setAttribute('x2', scale(t));
      line.setAttribute('y1', 0);
      line.setAttribute('y2', height);
      svg.append(line);
    }

    const plot = make('g');
    plot.setAttribute('clip-path', `url(#${clipId})`);
    const ink = {};
    for (const kind of KINDS.keys()) ink[kind] = inkOn(fillOf(kind));

    let y = 4;
    for (const lane of lanes) {
      const laneHeight = lane.rows * ROW_H;

      const label = make('text');
      label.setAttribute('class', 'lane-label');
      label.setAttribute('x', GUTTER - 10);
      label.setAttribute('y', y + 11);
      label.setAttribute('text-anchor', 'end');
      const full = `${lane.label} · ${lane.pid}`;
      label.textContent = fitLabel(full);
      const title = make('title');
      title.textContent = full;
      label.append(title);
      svg.append(label);

      for (const bar of lane.bars) {
        const x = scale(bar.start);
        const w = Math.max(1.5, scale(bar.start + bar.dur) - x);
        const barY = y + bar.row * ROW_H + (ROW_H - BAR_H) / 2;
        if (x > width || x + w < GUTTER) continue;

        const group = make('g');
        group.setAttribute('class', `bar ${KINDS[lane.kind]}`);
        group.setAttribute('tabindex', '0');
        group.setAttribute('role', 'img');
        group.setAttribute(
          'aria-label',
          `${bar.name}, ${fmtDur(bar.dur)}, starting ${fmtAt(bar.start)} in ${lane.label}`,
        );

        const rect = make('rect');
        rect.setAttribute('x', x);
        rect.setAttribute('y', barY);
        rect.setAttribute('width', w);
        rect.setAttribute('height', BAR_H);
        group.append(rect);

        // A label only goes inside a bar that fits it; the rest is on hover
        // and in the table view, so no text is ever clipped.
        if (w > bar.name.length * 5.4 + 12) {
          const text = make('text');
          text.setAttribute('class', 'bar-label');
          text.setAttribute('x', x + 5);
          text.setAttribute('y', barY + BAR_H - 3);
          text.setAttribute('fill', ink[lane.kind]);
          text.textContent = bar.name;
          group.append(text);
        }

        plot.append(group);
        placed.push({ bar, lane, x, w, y: barY, node: group });
      }

      y += laneHeight + LANE_GAP;
      const rule = make('line');
      rule.setAttribute('class', 'lane-rule');
      rule.setAttribute('x1', 0);
      rule.setAttribute('x2', width);
      rule.setAttribute('y1', y - LANE_GAP / 2);
      rule.setAttribute('y2', y - LANE_GAP / 2);
      svg.append(rule);
    }

    svg.append(plot);
    host.replaceChildren(svg);
  }

  function renderStats() {
    const run = data.runs[state.run];
    const bars = lanes.flatMap((lane) => lane.bars);
    const longest = bars.reduce((best, bar) => (best && best.dur >= bar.dur ? best : bar), null);
    el('stat-wall').textContent = fmtDur(run.wallMs);
    el('stat-procs').textContent = String(lanes.length);
    el('stat-measures').textContent = String(bars.length);
    const cell = el('stat-longest');
    cell.replaceChildren();
    if (longest) {
      cell.append(document.createTextNode(fmtDur(longest.dur)));
      const note = document.createElement('small');
      note.textContent = ` ${longest.name}`;
      cell.append(note);
    } else {
      cell.textContent = '–';
    }

    const present = [...new Set(lanes.map((lane) => lane.kind))].sort();
    const legend = el('legend');
    legend.replaceChildren();
    for (const kind of present) {
      const item = document.createElement('span');
      const swatch = document.createElement('i');
      swatch.style.background = `var(--${KINDS[kind]})`;
      item.append(swatch, document.createTextNode(KIND_LABELS[kind]));
      legend.append(item);
    }
  }

  function renderTable() {
    const rows = lanes.flatMap((lane) => lane.bars.map((bar) => ({ lane, bar }))).sort((a, b) => b.bar.dur - a.bar.dur);
    const table = document.createElement('table');
    const caption = document.createElement('caption');
    caption.textContent = `Every measure of ${data.runs[state.run].label}, longest first.`;
    table.append(caption);

    const head = document.createElement('tr');
    for (const [text, cls] of [
      ['Process', ''],
      ['Pid', 'num'],
      ['Measure', ''],
      ['Starts at', 'num'],
      ['Duration', 'num'],
    ]) {
      const th = document.createElement('th');
      th.textContent = text;
      if (cls) th.className = cls;
      head.append(th);
    }
    const thead = document.createElement('thead');
    thead.append(head);
    table.append(thead);

    const body = document.createElement('tbody');
    for (const { lane, bar } of rows) {
      const tr = document.createElement('tr');
      for (const [text, cls] of [
        [lane.label, ''],
        [String(lane.pid), 'num'],
        [bar.name, ''],
        [fmtAt(bar.start), 'num'],
        [fmtDur(bar.dur), 'num'],
      ]) {
        const td = document.createElement('td');
        td.textContent = text;
        if (cls) td.className = cls;
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body);
    el('table').replaceChildren(table);
  }

  function render() {
    lanes = buildLanes();
    renderStats();
    if (state.table) renderTable();
    else renderPlot();
  }

  function renderPlot() {
    renderAxis();
    renderScrollbar();
    renderLanes();
  }

  /** Slides the visible window without changing its width. */
  function panBy(deltaMs) {
    clampView(state.view.start + deltaMs, state.view.end + deltaMs);
    renderPlot();
  }

  // -- trace handoff -------------------------------------------------------

  const PERFETTO = 'https://ui.perfetto.dev';

  /**
   * Perfetto's documented handoff. The tab it opens announces itself with a
   * PONG, and the trace goes over postMessage, so nothing leaves the browser.
   */
  function openInPerfetto() {
    const tab = window.open(PERFETTO);
    if (!tab) return 'Allow popups';

    const text = document.getElementById('trace-data').textContent;
    const buffer = new TextEncoder().encode(text).buffer;
    const ping = setInterval(() => tab.postMessage('PING', PERFETTO), 60);
    const stop = () => {
      clearInterval(ping);
      removeEventListener('message', give);
    };
    const give = (event) => {
      if (event.data !== 'PONG') return;
      stop();
      tab.postMessage({ perfetto: { buffer, title: data.title, fileName: 'graph-perf.trace.json' } }, PERFETTO);
    };
    addEventListener('message', give);
    setTimeout(stop, 30000);
    return 'Opened';
  }

  // -- tooltip -------------------------------------------------------------

  function showTip(entry, clientX, clientY) {
    if (state.hot === entry) return positionTip(clientX, clientY);
    if (state.hot) state.hot.node.classList.remove('hot');
    state.hot = entry;
    entry.node.classList.add('hot');
    el('lanes').classList.add('hovering');
    el('tip-value').textContent = fmtDur(entry.bar.dur);
    el('tip-name').textContent = entry.bar.name;
    el('tip-meta').textContent = `${entry.lane.label} · pid ${entry.lane.pid} · starts ${fmtAt(entry.bar.start)}`;
    el('tip').hidden = false;
    positionTip(clientX, clientY);
  }

  function positionTip(clientX, clientY) {
    const tip = el('tip');
    const box = tip.getBoundingClientRect();
    const x = Math.min(clientX + 14, window.innerWidth - box.width - 8);
    const y = clientY + box.height + 20 > window.innerHeight ? clientY - box.height - 12 : clientY + 18;
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, y)}px`;
  }

  function hideTip() {
    if (state.hot) state.hot.node.classList.remove('hot');
    state.hot = null;
    el('lanes').classList.remove('hovering');
    el('tip').hidden = true;
  }

  /** Nearest bar to the pointer, so a sub-pixel measure is still reachable. */
  function nearest(x, y) {
    let best = null;
    let bestGap = 14;
    for (const entry of placed) {
      if (y < entry.y - 3 || y > entry.y + BAR_H + 3) continue;
      const gap = x < entry.x ? entry.x - x : x > entry.x + entry.w ? x - entry.x - entry.w : 0;
      if (gap < bestGap) {
        best = entry;
        bestGap = gap;
      }
    }
    return best;
  }

  function svgPoint(event) {
    const svg = el('lanes').querySelector('svg');
    if (!svg) return null;
    const box = svg.getBoundingClientRect();
    const width = GUTTER + plotWidth() + 12;
    return { x: ((event.clientX - box.left) / box.width) * width, y: event.clientY - box.top };
  }

  // -- interaction ---------------------------------------------------------

  function resetView() {
    domain = Math.max(
      data.runs[state.run].wallMs,
      ...data.lanes.flatMap((lane) => lane.b.filter((b) => b[0] === state.run).map((b) => b[2] + b[3])),
      1,
    );
    state.view = { start: 0, end: domain };
  }

  function clampView(start, end) {
    const span = Math.min(Math.max(end - start, MIN_SPAN), domain);
    const from = Math.min(Math.max(start, 0), domain - span);
    state.view = { start: from, end: from + span };
  }

  /** Dragging the thumb, clicking the track and the arrow keys all pan. */
  function wireScrollbar() {
    const track = el('scrollbar');
    const thumb = el('thumb');
    track.style.marginLeft = `${GUTTER}px`;
    const left = (event) => event.clientX - track.getBoundingClientRect().left;

    /** Window start for a thumb position, undoing the minimum-width scaling. */
    const startAt = (x) => {
      const span = state.view.end - state.view.start;
      const travel = track.clientWidth - Math.max(24, (span / domain) * track.clientWidth);
      return travel > 0 ? (x / travel) * (domain - span) : 0;
    };

    const slideTo = (start) => {
      const span = state.view.end - state.view.start;
      clampView(start, start + span);
      renderPlot();
    };

    let grab = null;
    thumb.addEventListener('pointerdown', (event) => {
      grab = event.clientX - thumb.getBoundingClientRect().left;
      track.classList.add('dragging');
      thumb.setPointerCapture(event.pointerId);
      hideTip();
    });
    thumb.addEventListener('pointermove', (event) => {
      if (grab !== null) slideTo(startAt(left(event) - grab));
    });
    const drop = () => {
      grab = null;
      track.classList.remove('dragging');
    };
    thumb.addEventListener('pointerup', drop);
    thumb.addEventListener('pointercancel', drop);

    // Anywhere else on the track centres the window on that point.
    track.addEventListener('pointerdown', (event) => {
      if (event.target === thumb) return;
      const span = state.view.end - state.view.start;
      slideTo((left(event) / track.clientWidth) * domain - span / 2);
    });

    track.addEventListener('keydown', (event) => {
      const span = state.view.end - state.view.start;
      if (event.key === 'ArrowLeft') panBy(-span / 10);
      else if (event.key === 'ArrowRight') panBy(span / 10);
      else if (event.key === 'Home') slideTo(0);
      else if (event.key === 'End') slideTo(domain - span);
      else return;
      event.preventDefault();
    });
  }

  function wire() {
    const runSelect = /** @type {HTMLSelectElement} */ (el('run'));
    for (const [index, run] of data.runs.entries()) {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = run.label;
      runSelect.append(option);
    }
    runSelect.addEventListener('change', () => {
      state.run = Number(runSelect.value);
      hideTip();
      resetView();
      render();
    });

    const filter = /** @type {HTMLInputElement} */ (el('filter'));
    let pending = 0;
    filter.addEventListener('input', () => {
      state.filter = filter.value;
      clearTimeout(pending);
      pending = setTimeout(() => {
        hideTip();
        render();
      }, 120);
    });

    el('reset').addEventListener('click', () => {
      hideTip();
      resetView();
      render();
    });

    const tableButton = el('table-view');
    tableButton.addEventListener('click', () => {
      state.table = !state.table;
      tableButton.setAttribute('aria-pressed', String(state.table));
      el('chart').hidden = state.table;
      el('table').hidden = !state.table;
      el('reset').hidden = state.table;
      el('hint').hidden = state.table;
      hideTip();
      render();
    });

    const traceButton = /** @type {HTMLButtonElement} */ (el('trace'));
    traceButton.addEventListener('click', () => {
      traceButton.disabled = true;
      traceButton.textContent = openInPerfetto();
      setTimeout(() => {
        traceButton.textContent = 'Open in Perfetto';
        traceButton.disabled = false;
      }, 2600);
    });

    const themeButton = el('theme');
    const stored = localStorage.getItem('graph-perf-theme');
    if (stored) document.documentElement.dataset.theme = stored;
    const syncTheme = () => {
      const dark =
        document.documentElement.dataset.theme === 'dark' ||
        (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
      themeButton.textContent = dark ? 'Light' : 'Dark';
    };
    syncTheme();
    themeButton.addEventListener('click', () => {
      const dark = themeButton.textContent === 'Dark';
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      localStorage.setItem('graph-perf-theme', dark ? 'dark' : 'light');
      syncTheme();
      render();
    });

    const host = el('lanes');

    host.addEventListener('pointermove', (event) => {
      if (host.classList.contains('panning')) return;
      const point = svgPoint(event);
      if (!point) return;
      const entry = nearest(point.x, point.y);
      if (entry) showTip(entry, event.clientX, event.clientY);
      else hideTip();
    });
    host.addEventListener('pointerleave', hideTip);

    host.addEventListener('focusin', (event) => {
      const entry = placed.find((candidate) => candidate.node === event.target);
      if (!entry) return;
      const box = entry.node.getBoundingClientRect();
      showTip(entry, box.left + box.width / 2, box.bottom);
    });
    host.addEventListener('focusout', hideTip);

    // Zoom is held behind ctrl or meta so the page keeps its own scrolling.
    // A trackpad pinch arrives as a ctrl-wheel event, so it zooms too.
    host.addEventListener(
      'wheel',
      (event) => {
        // deltaMode 1 is lines, which a wheel mouse reports instead of pixels.
        const steps = event.deltaMode === 1 ? 16 : 1;
        const span = state.view.end - state.view.start;
        if (!event.ctrlKey && !event.metaKey) {
          // A sideways swipe pans. A vertical one is left to the page.
          if (span >= domain || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
          event.preventDefault();
          hideTip();
          panBy(event.deltaX * steps * (span / plotWidth()));
          return;
        }
        const point = svgPoint(event);
        if (!point || point.x < GUTTER) return;
        event.preventDefault();
        const at = unscale(point.x);
        const zoomed = span * (event.deltaY < 0 ? 0.8 : 1.25);
        const ratio = (at - state.view.start) / span;
        clampView(at - zoomed * ratio, at - zoomed * ratio + zoomed);
        hideTip();
        renderPlot();
      },
      { passive: false },
    );

    let anchor = null;
    host.addEventListener('pointerdown', (event) => {
      const point = svgPoint(event);
      if (!point || point.x < GUTTER) return;
      anchor = { x: point.x, start: state.view.start, end: state.view.end };
      host.classList.add('panning');
      host.setPointerCapture(event.pointerId);
      hideTip();
    });
    host.addEventListener('pointermove', (event) => {
      if (!anchor) return;
      const point = svgPoint(event);
      if (!point) return;
      const perPixel = (anchor.end - anchor.start) / plotWidth();
      const shift = (anchor.x - point.x) * perPixel;
      clampView(anchor.start + shift, anchor.end + shift);
      renderPlot();
    });
    const endPan = () => {
      anchor = null;
      host.classList.remove('panning');
    };
    host.addEventListener('pointerup', endPan);
    host.addEventListener('pointercancel', endPan);
    host.addEventListener('dblclick', () => {
      resetView();
      renderPlot();
    });

    wireScrollbar();

    let frame = 0;
    addEventListener('resize', () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(render);
    });
  }

  el('title').textContent = data.title;
  el('subtitle').textContent = data.subtitle;
  document.title = data.title;
  resetView();
  wire();
  render();
})();
