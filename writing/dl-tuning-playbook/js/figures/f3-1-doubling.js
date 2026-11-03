/*
 * f3-1-doubling.js: figure F3.1, the doubling procedure (#fig-doubling), on page 3 #feasible.
 *
 * Design: notes/revamp/figure-plan.md (FP) F3.1 and notes/revamp/implementation-plan.md WO-F3.1
 * (§6.4), with the rulings R10, R12 and R57 of notes/revamp/review/synthesis.md, on the figure
 * contract of site.js (TP.fig) and the runtime of runtime.js (TP.run).
 *
 * The model is TP.throughput (site/js/lib/throughput.js): TP.throughput.runs(accel, seed) gives
 * one run at each power of two from 8 through the first batch size above the memory limit, which
 * fails for memory, and TP.throughput.mark(runs) is the rule's mark (every doubling up to it
 * raised the measured throughput by at least the site's 10%). The noise comes from the seed
 * inside TP.throughput, so the runtime's per-step generators are never drawn from.
 *
 * One runtime step is one run (R10), so step k shows the first k runs. `steps` and `limit` are the
 * number of runs to and including the failure. Autoplay performs the procedure once, 600 ms per
 * run, and stops at the failure, the default state. Reset replays it (reset: 'replay', R57).
 *
 * The one panel is the running view and the record. Its x axis is in step units, t = log2(B / 8)
 * + 1, so run k stands at x = k; the tick labels print batch sizes. A linear axis in t is a log
 * axis in B, and the runtime's record handlers and the conformance harness map a position on the
 * axis to the cursor directly (the same exception as F1.1's axis in checkpoint units). The
 * domain is CAL.domains.a.x mapped into t (4 to 16,384 is t = 0 to 12), and the y domain,
 * CAL.domains.a.y (10 to 40,960 examples per second), spans the same twelve doublings. The plot
 * area is square, so the doubling line prints at 45 degrees (DS §3.5 item 2).
 *
 * The figure draws no cursor line. The last run drawn is the cursor's run, and the reader's
 * vertical line is the mark alone (DS §4.10), so that two reader-token verticals never share the
 * frame (work-order exception, recorded in notes/revamp/reports/fig-doubling.md).
 *
 * v4 review (post03, 2026-11): the mark now defaults to 1,024 (the rule's result) instead of 8, so
 * the loaded figure shows the procedure's answer; the plot is no longer forced square (aspect 0.5);
 * presets, Draw again and Reset share the dock row; the readout says "chosen batch size".
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

/* BEGIN GENERATED table-cal */
// From tests/calibration/out/fig-doubling.json by npm run generate (tests/lib/write-generated.js).
var CAL = {
  "defaults": {"accel": "saturating", "mark": 1024},
  "presets": {"saturating": {"accel": "saturating"}, "input-limited": {"accel": "input"}},
  "states": {},
  "seed": 120,
  "domains": {"a": {"x": [4, 16384], "y": [10, 40960]}},
  "tables": {
    "runs": {
      "saturating": [
        [8, 78.67764864516819],
        [16, 161.8658087220888],
        [32, 324.5354299342653],
        [64, 638.0537798138474],
        [128, 1263.1321340885825],
        [256, 2597.715629091286],
        [512, 4436.685712127871],
        [1024, 5040.132854149597],
        [2048, 5094.257345042471],
        [4096, 5000.08941878056],
        [8192, null]
      ],
      "input": [
        [8, 78.67764864516819],
        [16, 161.8658087220888],
        [32, 324.5354299342653],
        [64, 638.0537798138474],
        [128, 1263.1321340885825],
        [256, 2060.4585026870377],
        [512, 2060.9914905833507],
        [1024, 1998.868636294425],
        [2048, 1991.884740194659],
        [4096, 1953.2791297200395],
        [8192, null]
      ]
    }
  },
  "quantities": {
    "model": {
      "peak-throughput": 5120,
      "saturation-batch": 512,
      "input-limit": 2000,
      "memory-limit": 4096,
      "threshold": 0.1,
      "noise-sd": 0.02,
      "t0": 0.1,
      "sharpness": 4,
      "first-batch": 8
    },
    "default": {
      "runs": 11,
      "failed-batch": 8192,
      "mark": 1024,
      "gain-to-mark": 0.13601304694001137,
      "gain-next": 0.010738703216585321,
      "noise-free-mark": 1024,
      "mark-agreement": 0.9933333333333333
    },
    "input-limited": {
      "runs": 11,
      "mark": 256,
      "plateau": 2000,
      "gain-to-mark": 0.6312295816729965,
      "gain-next": 0.00025867441427140925,
      "noise-free-mark": 256,
      "mark-agreement": 1
    },
    "seed": {
      "chosen": 120,
      "statistic": "measured throughput ratio of the doubling after the mark, saturating preset; admitted when the mark equals the noise-free mark under both presets",
      "n": 300,
      "admitted": 298,
      "median": 1.0105886375280742
    }
  }
};
/* END GENERATED table-cal */

  var T = TP.throughput;
  if (!T) return;
  var B_MIN = T.B_MIN, LIMIT = T.MEMORY_LIMIT;

  /* ---------- the model, without the DOM ---------- */

  /** The step of a batch size (run k stands at step k) and back. */
  function tOf(B) { return Math.log(B / B_MIN) / Math.LN2 + 1; }
  function bOf(t) { return B_MIN * Math.pow(2, t - 1); }
  /** The runs of the procedure, to and including the failure: 11 at the calibrated memory limit. */
  var N = Math.round(tOf(2 * LIMIT));
  /** The batch sizes the mark can take: the powers of two from 8 to the memory limit. */
  var MARKS = [];
  for (var b0 = B_MIN; b0 <= LIMIT; b0 *= 2) MARKS.push(b0);

  var cache = [];
  /** The runs of a preset and seed, kept for the 8 settings used last. */
  function runsOf(accel, seed) {
    for (var i = 0; i < cache.length; i++) if (cache[i].accel === accel && cache[i].seed === seed) return cache[i].runs;
    var r = T.runs(accel, seed);
    cache.push({ accel: accel, seed: seed, runs: r });
    if (cache.length > 8) cache.shift();
    return r;
  }
  /** The record row of step k (k runs measured): the k-th run's batch size and throughput. */
  function rowOf(accel, seed, k) {
    if (k <= 0) return { B: null, throughput: null, failed: 0 };
    var r = runsOf(accel, seed)[k - 1];
    return { B: r.B, throughput: r.failed ? null : r.throughput, failed: r.failed ? 1 : 0 };
  }

  /** The gain of each doubling among the first k runs: gains[i] is run i+1 over run i, minus 1. */
  function gainsOf(list) {
    var out = [];
    for (var i = 1; i < list.length; i++) {
      out.push(list[i].failed || list[i - 1].failed ? null : list[i].throughput / list[i - 1].throughput - 1);
    }
    return out;
  }

  /**
   * The rule's mark over the completed procedure, and the gains the readout and the ledger name:
   * {mark, gainToMark (the smallest gain of the doublings up to the mark, null at the first run),
   *  gainNext (the gain of the doubling after it, null when the next run failed)}.
   */
  function ruleOf(accel, seed) {
    var runs = runsOf(accel, seed), mark = T.mark(runs), m = runs.findIndex(function (r) { return r.B === mark; });
    var g = gainsOf(runs), up = g.slice(0, m);
    return {
      mark: mark,
      gainToMark: up.length ? Math.min.apply(null, up) : null,
      gainNext: m + 1 < runs.length && g[m] != null ? g[m] : null
    };
  }

  /**
   * The reader's mark at step k: {mark, index (the mark's run, 0-based), measured (k), gainToMark,
   * gainNext, next: 'none' | 'measured' | 'failed' | 'pending', reached (the mark's run is drawn)}.
   */
  function readerOf(accel, seed, k, mark) {
    var runs = runsOf(accel, seed), shown = runs.slice(0, k), m = Math.round(tOf(mark)) - 1;
    var g = gainsOf(shown), out = { mark: mark, index: m, measured: k, gainToMark: null, gainNext: null, next: 'pending', reached: m < k };
    if (!out.reached) return out;
    var up = g.slice(0, m);
    out.gainToMark = up.length ? Math.min.apply(null, up) : null;
    if (m + 1 < k) {
      if (shown[m + 1].failed) out.next = 'failed';
      else { out.next = 'measured'; out.gainNext = g[m]; }
    }
    return out;
  }

  var fmt = TP.fmt || { int: function (v) { return String(Math.round(v)); } };
  function pct(v) { return TP.fmt.byName('pct0')(v); }
  /** The sign of a gain as printed: a gain that rounds to a fall "lowered" throughput. */
  function falls(v) { return Math.round(v * 100) < 0; }

  /**
   * The readout (FP F3.1, and WO-F3.1's form for a mark on the first run). Cases the entry leaves
   * open: no run measured yet, the mark beyond the runs measured so far, the next doubling not yet
   * measured, the next run out of memory, and a doubling that lowered throughput.
   */
  function readoutText(accel, seed, k, mark) {
    var B = fmt.int(mark), thr = pct(T.THRESHOLD);
    if (k <= 0) return 'The chosen batch size is ' + B + ', and no run has been measured yet.';
    /* From the first run the readout names the run, so that Back, Forward and the scrubber change
       what the live twin speaks (accessibility finding L1). The clause costs five words, and each
       form stays within the readout's 30. */
    var R = readerOf(accel, seed, k, mark), at = 'After run ' + fmt.int(k) + ' of ' + fmt.int(N) + ', ';
    if (!R.reached) {
      return at + 'the chosen batch size is ' + B + ', and the runs so far reach batch size ' + fmt.int(runsOf(accel, seed)[k - 1].B) + '.';
    }
    if (R.index === 0) {
      if (R.next === 'measured') {
        return at + 'the chosen batch size is the first run, ' + B + ', and the next doubling ' +
          (falls(R.gainNext) ? 'lowered throughput by ' + pct(-R.gainNext) : 'raised throughput by ' + pct(R.gainNext)) + ', against the ' + thr + ' threshold.';
      }
      return at + 'the chosen batch size is the first run, ' + B + ', and the next is not measured yet.';
    }
    var head = at + (falls(R.gainToMark)
      ? 'one doubling up to the chosen batch size, ' + B + ', lowered throughput by ' + pct(-R.gainToMark)
      : 'every doubling up to the chosen batch size, ' + B + ', raised throughput by at least ' + pct(R.gainToMark));
    if (R.next === 'measured') {
      return head + ' and the next ' + (falls(R.gainNext) ? 'lowered it by ' + pct(-R.gainNext) : 'raised it by ' + pct(R.gainNext)) + ', against the ' + thr + ' threshold.';
    }
    if (R.next === 'failed') return head + ', against the ' + thr + ' threshold, and the next ran out of memory.';
    return head + ', against the ' + thr + ' threshold, and the next is not measured yet.';
  }

  /** The named quantities of a state (plan WO-I5.1): the procedure's, the reader's and the model's. */
  function quantitiesOf(accel, seed, k, mark) {
    var runs = runsOf(accel, seed), rule = ruleOf(accel, seed), R = readerOf(accel, seed, k, mark), q = {};
    q.runs = runs.length;
    q.mark = rule.mark;
    q['gain-to-mark'] = rule.gainToMark;
    q['gain-next'] = rule.gainNext;
    q.plateau = T.plateau(accel);
    q['noise-free-mark'] = T.worthConsidering(accel);
    q['failed-batch'] = runs[runs.length - 1].B;
    q['reader-mark'] = mark;
    q['reader-gain-to-mark'] = R.gainToMark;
    q['reader-gain-next'] = R.gainNext;
    q['reader-next'] = R.next;
    q.measured = k;
    q.throughputs = runs.slice(0, k).map(function (r) { return r.failed ? null : r.throughput; });
    q['peak-throughput'] = T.peak('saturating');
    q['saturation-batch'] = T.PRESETS.saturating.bSat;
    q['input-limit'] = T.PRESETS.input.rIo;
    q['memory-limit'] = LIMIT;
    q.threshold = T.THRESHOLD;
    q['noise-sd'] = T.NOISE_SD;
    q.t0 = T.T0;
    q.sharpness = T.SHARPNESS;
    q['first-batch'] = B_MIN;
    /* the seed sweep's numbers come from CAL, because recomputing them takes the 300-seed sweep */
    var cq = (typeof CAL !== 'undefined' && CAL.quantities) || {};
    var setting = accel === 'input' ? 'input-limited' : 'default';
    if (cq[setting] && cq[setting]['mark-agreement'] != null) q['mark-agreement'] = cq[setting]['mark-agreement'];
    Object.keys(cq.seed || {}).forEach(function (name) { if (q[name] === undefined) q[name] = cq.seed[name]; });
    return q;
  }

  TP.models = TP.models || {};
  TP.models.doubling = {
    N: N, MARKS: MARKS, tOf: tOf, bOf: bOf, runsOf: runsOf, rowOf: rowOf, gainsOf: gainsOf,
    ruleOf: ruleOf, readerOf: readerOf, readout: readoutText, quantities: quantitiesOf
  };

  /* ---------- drawing ---------- */

  var doc = global.document;
  if (!doc) return;
  function C() { return TP.chart; }

  var X_DOMAIN = CAL.domains.a.x.map(tOf), Y_DOMAIN = CAL.domains.a.y;
  function xTicks() { var v = []; for (var t = 1; t <= N; t++) v.push(t); return v; }
  /** A run's key, by its step. */
  function keyOf(t) { return 'r' + t; }

  /** The name of the accelerator's peak on the y axis: two lines from 640 px, "peak" below. */
  function peakName(phone) { return phone ? 'peak' : ['accelerator’s', 'peak']; }

  function panelOpts() {
    return {
      key: 'a', describe: 'throughput against batch size', note: 'run 0 of ' + N,
      xDomain: X_DOMAIN, yDomain: Y_DOMAIN, yLog: 10,
      xTicks: xTicks(), xFormat: function (t) { return fmt.int(bOf(t)); },
      yTicks: [10, 100, 1000, 10000], yFormat: function (v) { return fmt.int(v); },
      xLabel: 'batch size', yLabel: 'throughput, examples per second',
      grid: 'both',
      aspect: function (w, phone) { return phone ? 0.9 : 0.5; },
      margin: function (w, phone) { return phone ? { t: 10, r: 12, b: 40, l: 72 } : { t: 12, r: 16, b: 42, l: 118 }; },
      maxHeight: function (w, phone) { return phone ? 300 : 300; }
    };
  }

  /**
   * Draw the panel for state {k, accel, seed} with the reader's mark at batch size `mark`.
   * o.hold keeps label positions; o.onMark(t, transient) is the handle's change.
   */
  function drawPanel(p, st, mark, o) {
    o = o || {};
    var runs = runsOf(st.accel, st.seed), k = st.k;
    var shown = [], failed = [];
    for (var t = 1; t <= k; t++) {
      var r = runs[t - 1];
      if (r.failed) failed.push({ t: t, B: r.B });
      else shown.push({ t: t, B: r.B, y: r.throughput });
    }
    var items = [];
    /* the accelerator's peak, a level of the toy named on the throughput axis (DS §4.7) */
    C().level(p, 'y', T.peak('saturating'), { role: 'model', text: peakName(p.phone), line: true, series: 'peak' });
    /* perfect doubling through the first run, a dotted reference over the markers (DS §4.7) */
    if (k >= 1) {
      var x1 = runs[0].throughput, lo = Math.max(X_DOMAIN[0], 1 + Math.log(Y_DOMAIN[0] / x1) / Math.LN2);
      var hi = Math.min(X_DOMAIN[1], 1 + Math.log(Y_DOMAIN[1] / x1) / Math.LN2);
      var ref = [[lo, x1 * Math.pow(2, lo - 1)], [hi, x1 * Math.pow(2, hi - 1)]].map(function (q) {
        /* keep the ends inside the frame against rounding at its edges */
        return [q[0], Math.min(Y_DOMAIN[1], Math.max(Y_DOMAIN[0], q[1]))];
      });
      C().ref(p, ref, { kind: 'truth', series: 'doubling' });
      items.push({ id: 'doubling', text: 'perfect doubling', role: 'ref', series: 'doubling',
        feature: { type: 'line', of: 'doubling' }, phone: { text: 'doubling' }, captionNames: true, keySentence: true });
    }
    if (shown.length) {
      C().markers(p, shown, function (d) { return d.t; }, function (d) { return d.y; },
        { role: 'model', series: 'runs', key: function (d) { return keyOf(d.t); } });
    }
    if (failed.length) {
      C().cross(p, failed, function (d) { return d.t; }, function () { return NaN; },
        { role: 'model', series: 'oom', edge: 'bottom', key: function (d) { return keyOf(d.t); } });
      items.push({ id: 'oom', text: 'out of memory', role: 'model', series: 'oom',
        feature: { type: 'point', x: failed[0].t, y: Y_DOMAIN[0], r: 5 }, phone: { text: 'OOM' }, captionNames: true });
    }
    /* the reader's mark: a reader line with its value on the x axis, and its handle (DS §4.10) */
    var tm = tOf(mark);
    C().level(p, 'x', tm, { role: 'reader', text: (p.phone ? '' : 'chosen: ') + fmt.int(mark), line: true, series: 'mark' });
    if (o.onMark) {
      C().handle(p, {
        id: 'mark', axis: 'x', value: tm, snap: MARKS.map(tOf), min: 1, max: tOf(LIMIT), scale: 'linear',
        label: 'The mark, a batch size', onLine: true,
        format: function (v) { return 'batch size ' + fmt.int(bOf(Math.round(v))); },
        onChange: function (v) { o.onMark(v, true); },
        onSettle: function (v) { o.onMark(v, false); }
      });
    }
    C().place(p, items, { hold: !!o.hold });
  }

  /* ---------- the figure ---------- */

  function init(element) {
    var pa = null, hovered = false, fig;
    function markOf(ctx) { return (ctx && ctx.values && ctx.values.mark) || fig.values().mark; }
    fig = TP.fig(element, {
      kind: 'running',
      seed: CAL.seed,
      params: {
        accel: {
          type: 'choice', domain: ['saturating', 'input'], default: CAL.defaults.accel,
          change: 'restart', ghost: false, control: 'none', label: 'Accelerator'
        },
        mark: {
          type: 'number', domain: [MARKS[0], MARKS[MARKS.length - 1]], snap: MARKS, scale: 'log',
          default: CAL.defaults.mark, change: 'redraw', ghost: false, control: 'handle', handle: 'a',
          label: 'The mark, a batch size', format: function (v) { return 'batch size ' + fmt.int(v); }
        }
      },
      presets: {
        'saturating accelerator': { key: 'saturating', accel: CAL.presets.saturating.accel },
        'input pipeline limited': { key: 'input-limited', accel: CAL.presets['input-limited'].accel }
      },
      docked: ['presets', 'draw', 'reset'],
      draw: function (state, ctx) {
        if (!pa) pa = C().panel(ctx.fig.panels, panelOpts());
        var run = ctx.run || null;
        pa.update(function (p) {
          if (!state) return;
          drawPanel(p, state, markOf(ctx), {
            hold: ctx.hold,
            onMark: function (v, transient) {
              var B = bOf(Math.round(v));
              if (transient) fig.set({ mark: B }, { transient: true });
              else fig.set({ mark: B });
            }
          });
        });
        if (run && !hovered) {
          hovered = true;
          var h = run.recordHandlers();
          C().hover(pa, {
            xValues: function () { var v = []; for (var i = 1; i <= N; i++) v.push(i); return v; },
            by: 'batch size', label: 'Reading of the runs by batch size',
            format: function (t) { return 'Batch size ' + fmt.int(bOf(t)); },
            series: [{
              label: 'examples per second', role: 'model', fmt: fmt.int,
              y: function (t) { var r = run.rows()[t]; return r && t <= run.t() ? r.throughput : null; }
            }],
            extra: function (t) {
              var r = run.rows()[t], prev = run.rows()[t - 1];
              if (!r || t > run.t()) return ['not run yet'];
              if (r.failed) return ['out of memory'];
              var out = ['time per step ' + TP.fmt.sig(r.B / r.throughput, 3) + ' s'];
              if (prev && prev.throughput) {
                var g = r.throughput / prev.throughput - 1;
                out.push('the doubling ' + (falls(g) ? 'lowered throughput by ' + pct(-g) : 'raised throughput by ' + pct(g)));
              }
              return out;
            },
            press: h.press, onRead: h.onRead
          });
        }
      },
      readout: function (state, ctx) { return readoutText(state.accel, state.seed, state.k, markOf(ctx)); },
      table: function (state, ctx) {
        var runs = runsOf(state.accel, state.seed), g = gainsOf(runs), mark = markOf(ctx), rows = [];
        for (var i = 0; i < state.k; i++) {
          var r = runs[i], note = [];
          if (r.B === mark) note.push('chosen');
          if (r.failed) note.push('out of memory');
          rows.push({
            B: r.B, throughput: r.failed ? null : r.throughput, noiseFree: r.noiseFree,
            timePerStep: r.failed ? null : r.B / r.throughput, gain: i > 0 ? g[i - 1] : null, note: note.join(', ')
          });
        }
        var dash = function (f) { return function (v) { return v == null ? '–' : f(v); }; };
        return {
          columns: [
            { key: 'B', label: 'Batch size', format: fmt.int },
            { key: 'throughput', label: 'Throughput, examples per second', format: dash(fmt.int) },
            { key: 'noiseFree', label: 'Noise-free throughput', format: dash(fmt.int) },
            { key: 'timePerStep', label: 'Time per step, s', format: dash(function (v) { return TP.fmt.sig(v, 3); }) },
            { key: 'gain', label: 'Gain over the run before', format: dash(function (v) { return TP.fmt.byName('pct1')(v); }) },
            { key: 'note', label: 'Run' }
          ],
          rows: rows,
          caption: 'The ' + state.k + ' runs measured so far, ' + (state.accel === 'input' ? 'input pipeline limited' : 'saturating accelerator') + ', at seed ' + state.seed + '.'
        };
      },
      quantities: function (state, ctx) { return quantitiesOf(state.accel, state.seed, state.k, markOf(ctx)); }
    });
    TP.run(fig, {
      init: function (params) { return { k: 0, accel: params.accel, seed: params.seed }; },
      advance: function (s) { s.k += 1; return s; },
      record: function (s) { return rowOf(s.accel, s.seed, s.k); },
      steps: function () { return N; },
      limit: function () { return N; },
      pace: 'linear', duration: function () { return 600 * N; },
      unit: 'run', recordPanel: 'a', reset: 'replay'
    });
  }

  doc.addEventListener('tp:ready', function () {
    var el = doc.getElementById('fig-doubling');
    if (el && TP.fig && TP.run && TP.chart && TP.throughput) init(el);
  });
})(typeof window !== 'undefined' ? window : globalThis);
