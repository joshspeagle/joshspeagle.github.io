/*
 * p09-input-timeline.js: a cartoon profiler trace of an input-bound pipeline (fig-input-timeline,
 * Post 9, section "Where the accelerator waits").
 *
 * One idea: the accelerator waits whenever the next batch is not ready when a step ends.
 * Prefetching overlaps input work with compute, which removes the wait only while the host
 * produces batches faster than the accelerator consumes them. A slow source, or a per-step
 * synchronization barrier, brings the wait back. The Playbook's common causes and tips
 * (README "Optimizing the input pipeline") map onto the four controls.
 *
 * The model (arbitrary round constants, stated in the page's "How this toy works"):
 *   step time on the accelerator: 100 ms
 *   batch production on one input worker: read + preprocess
 *     local disk 15 + 35 ms, network storage 120 + 35 ms, heavy online preprocessing 15 + 125 ms
 *   no prefetch: the worker starts batch i when step i - 1 ends (production on demand)
 *   prefetch: each worker starts its next batch as soon as it is free, while at most DEPTH
 *     finished batches per worker wait (batch i waits for step i - DEPTH * workers to start)
 *   workers: batches alternate between the workers (i mod workers)
 *   sync barrier: no worker starts batch i before step i - 1 ends
 *   step i starts at max(end of step i - 1, end of batch i)
 * The readout's share of busy time and steps per second are over the first N_STEPS steps.
 *
 * Drawing: an SVG drawn at the container's pixel width (fonts at fixed px sizes), redrawn on
 * resize. Lanes: input worker 1, input worker 2, accelerator. Worker 2's lane stays in place
 * (marked "not in use") with one worker, so the figure's height does not change.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};
  var ID = 'fig-input-timeline';

  var STEP = 100, DEPTH = 2, N_STEPS = 40, WINDOW = 1200;
  var SOURCES = {
    local: { read: 15, prep: 35, label: 'Local disk' },
    network: { read: 120, prep: 35, label: 'Network storage' },
    cpu: { read: 15, prep: 125, label: 'Heavy preprocessing' }
  };
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ============================== the model ============================== */

  function simulate(v) {
    var src = SOURCES[v.source] || SOURCES.local;
    var W = +v.workers || 1, prefetch = !!v.prefetch, sync = !!v.sync;
    var free = [], batches = [], steps = [], i;
    for (i = 0; i < W; i++) free.push(0);
    for (i = 0; i < N_STEPS; i++) {
      var w = i % W, prevEnd = i > 0 ? steps[i - 1].end : 0, gate = 0;
      if (!prefetch) gate = prevEnd;
      else if (i - DEPTH * W >= 0) gate = steps[i - DEPTH * W].start;
      if (sync) gate = Math.max(gate, prevEnd);
      var start = Math.max(free[w], gate);
      var b = { key: 'b' + i, i: i, worker: w, start: start, readEnd: start + src.read, end: start + src.read + src.prep };
      free[w] = b.end;
      batches.push(b);
      var s0 = Math.max(prevEnd, b.end);
      steps.push({ key: 's' + i, i: i, start: s0, end: s0 + STEP, wait: s0 - prevEnd });
    }
    var total = steps[N_STEPS - 1].end;
    var tail = steps.slice(10);
    var meanWait = tail.reduce(function (a, s) { return a + s.wait; }, 0) / tail.length;
    return {
      source: v.source, prefetch: prefetch, workers: W, sync: sync, src: src,
      batches: batches, steps: steps,
      busy: N_STEPS * STEP / total, rate: N_STEPS / total * 1000, meanWait: meanWait,
      perBatch: src.read + src.prep
    };
  }

  /* ============================== drawing ============================== */

  function svgEl(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, str, cls, anchor) {
    var t = svgEl('text', { x: x, y: y, 'class': cls || '', 'text-anchor': anchor || 'start' }, parent);
    t.textContent = str;
    return t;
  }

  var host = null, svgHost = null, cur = null, lastW = 0;

  function build(panels) {
    host = document.createElement('div');
    host.className = 'p09-tl';
    var legend = document.createElement('div');
    legend.className = 'p09-tl-legend';
    legend.setAttribute('aria-hidden', 'true');
    legend.innerHTML =
      '<span><i class="k-read"></i>read</span>' +
      '<span><i class="k-prep"></i>preprocess</span>' +
      '<span><i class="k-step"></i>training step</span>' +
      '<span><i class="k-wait"></i>accelerator waiting</span>';
    host.appendChild(legend);
    svgHost = document.createElement('div');
    svgHost.className = 'p09-tl-plot';
    host.appendChild(svgHost);
    panels.appendChild(host);
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        var w = Math.round(svgHost.clientWidth);
        if (w && w !== lastW && cur) render(cur);
      }).observe(svgHost);
    }
  }

  function render(s) {
    var Wpx = Math.max(280, Math.round(svgHost.clientWidth || 600));
    lastW = Wpx;
    var phone = Wpx < 560;
    var labelW = phone ? 0 : 118, padR = 8;
    var laneH = phone ? 26 : 30, laneGap = phone ? 22 : 12, top = phone ? 18 : 6;
    var plotW = Wpx - labelW - padR;
    var x = function (ms) { return labelW + ms / WINDOW * plotW; };
    var lanes = [
      { id: 'w0', name: 'Input worker 1' },
      { id: 'w1', name: s.workers > 1 ? 'Input worker 2' : 'Input worker 2 (not in use)', off: s.workers < 2 },
      { id: 'acc', name: 'Accelerator' }
    ];
    var laneY = lanes.map(function (l, i) { return top + i * (laneH + laneGap) + (i === 2 ? (phone ? 6 : 8) : 0); });
    var axisY = laneY[2] + laneH + 6;
    var meterY = axisY + (phone ? 44 : 34);
    var H = meterY + 26;

    svgHost.textContent = '';
    var svg = svgEl('svg', { width: Wpx, height: H, viewBox: '0 0 ' + Wpx + ' ' + H, 'class': 'p09-tl-svg', role: 'img',
      'aria-label': 'Timeline of the first ' + WINDOW + ' ms: input workers and accelerator' }, svgHost);
    var defs = svgEl('defs', {}, svg);
    var pat = svgEl('pattern', { id: 'p09-hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
    svgEl('rect', { width: 6, height: 6, 'class': 'p09-tl-hatch-bg' }, pat);
    svgEl('line', { x1: 0, y1: 0, x2: 0, y2: 6, 'class': 'p09-tl-hatch-line' }, pat);
    var clip = svgEl('clipPath', { id: 'p09-tl-clip' }, defs);
    svgEl('rect', { x: labelW, y: 0, width: plotW, height: H }, clip);

    /* gridlines every 200 ms and the time axis */
    var g = svgEl('g', { 'class': 'p09-tl-grid' }, svg);
    for (var t = 0; t <= WINDOW; t += 200) {
      svgEl('line', { x1: x(t), x2: x(t), y1: top - 2, y2: axisY, 'class': 'p09-tl-gridline' }, g);
      var tickStep = phone ? 400 : 200;
      if (t % tickStep === 0) text(g, x(t), axisY + 15, t === 0 ? '0' : TP.fmt.byName('int')(t) + (t === WINDOW ? ' ms' : ''), 'p09-tl-tick', t === 0 ? 'start' : t === WINDOW ? 'end' : 'middle');
    }

    /* lane backgrounds and names */
    lanes.forEach(function (l, i) {
      svgEl('rect', { x: labelW, y: laneY[i], width: plotW, height: laneH, rx: 3, 'class': 'p09-tl-lane' + (l.off ? ' is-off' : '') }, svg);
      if (phone) text(svg, labelW + 2, laneY[i] - 5, l.name, 'p09-tl-lanename' + (l.off ? ' is-off' : ''));
      else {
        var lines = l.off ? ['Input worker 2', '(not in use)'] : [l.name];
        lines.forEach(function (ln, j) {
          text(svg, labelW - 10, laneY[i] + laneH / 2 + 4 + (j - (lines.length - 1) / 2) * 14, ln, 'p09-tl-lanename' + (l.off ? ' is-off' : ''), 'end');
        });
      }
    });

    var marks = svgEl('g', { 'clip-path': 'url(#p09-tl-clip)' }, svg);
    /* batches: read and preprocess segments, numbered */
    s.batches.forEach(function (b) {
      if (b.start >= WINDOW) return;
      var y = laneY[b.worker] + 3, h = laneH - 6;
      svgEl('rect', { x: x(b.start), y: y, width: Math.max(0.5, x(b.readEnd) - x(b.start)), height: h, 'class': 'p09-tl-read' }, marks);
      svgEl('rect', { x: x(b.readEnd), y: y, width: Math.max(0.5, x(b.end) - x(b.readEnd)), height: h, 'class': 'p09-tl-prep' }, marks);
      var wpx = x(b.end) - x(b.start);
      if (wpx >= 20 && x(b.end) <= labelW + plotW + 1) text(marks, (x(b.start) + x(b.end)) / 2, y + h / 2 + 4, String(b.i + 1), 'p09-tl-num p09-tl-num-in', 'middle');
    });
    /* accelerator: waits (hatched) and steps */
    var accY = laneY[2] + 3, accH = laneH - 6, labelled = false;
    s.steps.forEach(function (st, i) {
      var prevEnd = i > 0 ? s.steps[i - 1].end : 0;
      if (st.start > prevEnd + 0.01 && prevEnd < WINDOW) {
        svgEl('rect', { x: x(prevEnd), y: accY, width: x(st.start) - x(prevEnd), height: accH, 'class': 'p09-tl-wait' }, marks);
        var gw = x(Math.min(st.start, WINDOW)) - x(prevEnd);
        if (!labelled && gw >= 62 && i > 0) {
          labelled = true;
          var cx = (x(prevEnd) + x(Math.min(st.start, WINDOW))) / 2;
          svgEl('rect', { x: cx - 26, y: accY + accH / 2 - 8, width: 52, height: 16, rx: 3, 'class': 'p09-tl-waitlabel-bg' }, marks);
          text(marks, cx, accY + accH / 2 + 4, 'waiting', 'p09-tl-waitlabel', 'middle');
        }
      }
      if (st.start >= WINDOW) return;
      svgEl('rect', { x: x(st.start), y: accY, width: x(st.end) - x(st.start) - 1, height: accH, 'class': 'p09-tl-step' }, marks);
      if (x(st.end) - x(st.start) >= 18 && x(st.end) <= labelW + plotW + 1) text(marks, (x(st.start) + x(st.end)) / 2, accY + accH / 2 + 4, String(i + 1), 'p09-tl-num p09-tl-num-step', 'middle');
    });

    /* the meter: share of time the accelerator computes */
    var mx = labelW, mw = plotW, pct = Math.round(s.busy * 100);
    text(svg, phone ? mx : labelW - 10, meterY + (phone ? -6 : 12), 'Accelerator busy', 'p09-tl-meter-name', phone ? 'start' : 'end');
    var barY = phone ? meterY : meterY;
    svgEl('rect', { x: mx, y: barY, width: mw, height: 16, rx: 3, 'class': 'p09-tl-meter-track' }, svg);
    svgEl('rect', { x: mx, y: barY, width: Math.max(2, mw * s.busy), height: 16, rx: 3, 'class': 'p09-tl-meter-fill' }, svg);
    var inside = mw * s.busy > 150;
    text(svg, inside ? mx + mw * s.busy - 6 : mx + mw * s.busy + 6, barY + 12.5,
      pct + '%  ·  ' + s.rate.toFixed(1) + ' steps/s', 'p09-tl-meter-val' + (inside ? ' is-in' : ''), inside ? 'end' : 'start');
    if (phone) {
      svg.setAttribute('height', H + 8);
      svg.setAttribute('viewBox', '0 0 ' + Wpx + ' ' + (H + 8));
    }
  }

  function draw(state, ctx) {
    if (!host) build(ctx.fig.panels);
    cur = state;
    if (state) render(state);
  }

  function readout(s) {
    if (!s) return '';
    var waitTxt = s.meanWait < 0.5 ? 'After the first batch, no step waits for input.'
      : 'Each step waits about ' + Math.round(s.meanWait) + ' ms for its batch.';
    return 'The accelerator is busy ' + Math.round(s.busy * 100) + '% of the time, at ' + s.rate.toFixed(1) + ' steps per second. ' + waitTxt;
  }

  function table(s) {
    var rows = s.steps.slice(0, 12).map(function (st, i) {
      var b = s.batches[i];
      return { key: st.key, step: i + 1, worker: b.worker + 1, ready: Math.round(b.end), start: Math.round(st.start), wait: Math.round(st.wait) };
    });
    return {
      columns: [
        { key: 'step', label: 'Step' },
        { key: 'worker', label: 'Input worker' },
        { key: 'ready', label: 'Batch ready (ms)' },
        { key: 'start', label: 'Step starts (ms)' },
        { key: 'wait', label: 'Accelerator waited (ms)' }
      ],
      rows: rows,
      caption: 'The first 12 steps for the current settings. A step starts when the previous step has ended and its batch is ready.'
    };
  }

  function quantities(s) {
    return { busy: Math.round(s.busy * 100), rate: Math.round(s.rate * 10) / 10, 'mean-wait': Math.round(s.meanWait), 'per-batch': s.perBatch, step: STEP };
  }

  function init(element) {
    TP.fig(element, {
      kind: 'fixed',
      params: {
        source: {
          type: 'choice', domain: ['local', 'network', 'cpu'], default: 'local',
          labels: { local: 'Local disk', network: 'Network storage', cpu: 'Heavy preprocessing' },
          label: 'Data source', control: 'segment', change: 'cut', ghost: false
        },
        prefetch: { type: 'bool', default: false, label: 'Prefetch', control: 'check', change: 'cut', ghost: false },
        workers: {
          type: 'choice', domain: ['1', '2'], default: '1', labels: { '1': 'One', '2': 'Two' },
          label: 'Input workers', control: 'segment', change: 'cut', ghost: false
        },
        sync: { type: 'bool', default: false, label: 'Sync barrier every step', control: 'check', change: 'cut', ghost: false }
      },
      apply: simulate,
      draw: draw,
      readout: readout,
      table: table,
      quantities: quantities
    });
  }

  TP.p09InputTimeline = { simulate: simulate, SOURCES: SOURCES };

  document.addEventListener('tp:ready', function () {
    var el = document.getElementById(ID);
    if (el && TP.fig) init(el);
  });
})();
