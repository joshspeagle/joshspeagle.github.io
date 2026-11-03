/*
 * f1-1-checkpoint.js: figure F1.1, the checkpoint run (#fig-checkpoint), on page 1 #trial-result.
 *
 * Design: notes/revamp/figure-plan.md (FP) F1.1 and notes/revamp/implementation-plan.md WO-F1.1
 * (§6.1), on the figure contract of site.js (TP.fig) and the runtime of runtime.js (TP.run).
 *
 * The model is TP.curves.checkpointRun({seed, interval, steps, beta: CAL.beta}) with the settings of
 * TP.curves.checkpointDefaults (20,000 steps, a checkpoint every 1,000, noise drawn on a 20-step
 * grid), and TP.curves.bufferAt(evals, k, 3), the three best checkpoints after the k-th evaluation.
 * The run takes beta 0 (Batch 2 ruling): the curve falls, levels off and fluctuates about a value, the
 * case of README L1518-L1520. The calibration script (tests/calibration/fig-checkpoint.calibrate.js)
 * calls the same TP.curves.checkpointRun with the same beta.
 * One runtime step is one evaluation interval, so step k shows the run after its k-th checkpoint
 * (plan's decision). The noise comes from the seed through TP.curves, and the runtime's per-step
 * generators are never drawn from.
 *
 * Panel (a) is the record panel. Its x axis is in checkpoint units, 0 to 20, and its tick labels
 * print training steps, 0 to 20,000, so the runtime's record handlers and scrubbing map a position
 * on the axis to the cursor directly. Evaluations up to the cursor are filled markers on the series
 * line, and the rest of the run is drawn ahead in the trail tone (DS §4.9). At the end the selected
 * checkpoint takes the 20-px ring and the last checkpoint an open marker, with their direct labels.
 * Panel (b) is the buffer: three slots, lowest first, each naming a checkpoint's step and value,
 * linked to the markers of (a) by the checkpoint's index (C.link).
 *
 * At the end the frame holds one series, the run. The ring, the open marker, the cursor and the two
 * labels "selected checkpoint" and "last checkpoint" take the run's series, so that the placer tests
 * the labels against the drawn ink and against each other, and no mark of the run is their rival.
 *
 * 2026-11 review (post01): panel (a) is shorter (aspect 0.44, at most 300 px on a desktop, 240 px on
 * a phone) so that the figure fits one laptop screen. The public parts (TP.models.checkpointRun,
 * TP.recaps['F1.1:default'], the runtime's 0..20 steps) are unchanged.
 *
 * TP.recaps['F1.1:default'] draws panel (a) finished at the default seed, with the ring, the open
 * marker and their labels, and no cursor (plan §6.24, R5).
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

/* BEGIN GENERATED table-cal */
// From tests/calibration/out/fig-checkpoint.json by npm run generate (tests/lib/write-generated.js).
var CAL = {
  "defaults": {"seed": 88},
  "presets": {},
  "states": {},
  "seed": 88,
  "beta": 0,
  "domains": {"a": {"x": [0, 20000], "y": [0.13, 0.6]}},
  "tables": {},
  "quantities": {
    "default": {
      "selected-step": 11000,
      "selected-value": 0.1898551830514495,
      "last-value": 0.1989028282659553,
      "difference": 0.009047645214505795,
      "buffer": "11,000, 6,000 and 7,000"
    },
    "model": {
      "steps": 20000,
      "interval": 1000,
      "evaluations": 20,
      "buffer-size": 3,
      "grid": 20,
      "v-star": 0.2,
      "amplitude": 1,
      "tau": 1000,
      "sigma": 0.005,
      "beta": 0,
      "level-step": 5298.317366548036,
      "median-difference-interval-250": 0.010970748839466651,
      "median-difference-interval-2500": 0.007022514740937139
    },
    "seed": {
      "chosen": 88,
      "statistic": "the observed difference between the last and the selected checkpoint at a 1,000-step interval; admitted: the selected checkpoint is not the last; ties broken by the smallest seed",
      "n": 300,
      "admitted": 283,
      "median": 0.009047645214505795
    }
  }
};
/* END GENERATED table-cal */

  var DEF = TP.curves ? TP.curves.checkpointDefaults : { steps: 20000, interval: 1000, buffer: 3 };
  var STEPS = DEF.steps, INTERVAL = DEF.interval, BUFFER = DEF.buffer;
  var N = STEPS / INTERVAL;                   // evaluations in the run, and the runtime's limit

  /* ---------- the model, without the DOM ---------- */

  /** The run of TP.curves.checkpointRun (kept as TP.models.checkpointRun.run). */
  function run(o) { return TP.curves.checkpointRun(o); }

  var cache = [];
  /** The run of a seed at the figure's settings, kept for the 8 seeds used last. */
  function runOf(seed) {
    for (var i = 0; i < cache.length; i++) if (cache[i].seed === seed) return cache[i].run;
    var run1 = run({ seed: seed, interval: INTERVAL, steps: STEPS, beta: CAL.beta });
    cache.push({ seed: seed, run: run1 });
    if (cache.length > 8) cache.shift();
    return run1;
  }
  /** The buffer after the k-th evaluation: the indices of the three lowest, lowest first. */
  function bufferOf(seed, k) { return TP.curves.bufferAt(runOf(seed).evals, k, BUFFER); }
  /** The record row of step k (k checkpoints saved): {step, value, inBuffer}. */
  function rowOf(seed, k) {
    if (k <= 0) return { step: 0, value: null, inBuffer: 0 };
    var e = runOf(seed).evals[k - 1];
    return { step: e.step, value: e.value, inBuffer: bufferOf(seed, k).indexOf(k - 1) >= 0 ? 1 : 0 };
  }
  /** The run's retrospective selection and the numbers the readout and the ledger name. */
  function summaryOf(seed) {
    var r = runOf(seed), sel = r.evals[r.selectedIndex], last = r.evals[r.lastIndex];
    return {
      selected: r.selectedIndex, last: r.lastIndex, same: r.selectedIndex === r.lastIndex,
      selectedStep: sel.step, selectedValue: sel.value, lastValue: last.value,
      difference: r.gainObserved, gainNoiseFree: r.gainNoiseFree,
      buffer: bufferOf(seed, N)
    };
  }

  var fmt = TP.fmt || { int: String };
  var f4 = function (v) { return TP.fmt.byName('fixed4')(v); };
  function stepText(i) { return fmt.int(r1(i) * INTERVAL); }      // an index 0..N as training steps
  function r1(v) { return Math.round(v); }
  /** "a", "a and b", "a, b and c" */
  function series(list) {
    if (list.length < 2) return list.join('');
    return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  }
  function bufferSteps(seed, k) {
    return bufferOf(seed, k).map(function (i) { return runOf(seed).evals[i].step; });
  }

  /** The readout (FP F1.1): the buffer during the run, the selection at its end. */
  function readoutText(seed, k) {
    if (k >= N) {
      var s = summaryOf(seed);
      if (s.same) return 'The run\'s result is the last checkpoint, at step ' + fmt.int(s.selectedStep) + ', at validation error ' + f4(s.selectedValue) + '.';
      return 'The run\'s result is the checkpoint at step ' + fmt.int(s.selectedStep) + ', at validation error ' + f4(s.selectedValue) +
        ', which is ' + f4(s.difference) + ' below the last checkpoint.';
    }
    var b = bufferSteps(seed, k).map(fmt.int);
    if (!b.length) return 'At step 0 the buffer holds no checkpoint.';
    return 'At step ' + stepText(k) + ' the buffer holds the checkpoint' + (b.length > 1 ? 's' : '') + ' at step' + (b.length > 1 ? 's ' : ' ') + series(b) + '.';
  }

  /** The named quantities of a state (plan WO-I5.1): the run's, the cursor's, and the model's. */
  function quantitiesOf(seed, k) {
    var s = summaryOf(seed), q = {};
    q['selected-step'] = s.selectedStep;
    q['selected-value'] = s.selectedValue;
    q['last-value'] = s.lastValue;
    q.difference = s.difference;
    q.buffer = series(s.buffer.map(function (i) { return fmt.int(runOf(seed).evals[i].step); }));
    q['gain-noise-free'] = s.gainNoiseFree;
    q['selected-is-last'] = s.same ? 1 : 0;
    q.step = k * INTERVAL;
    q.checkpoints = k;
    q['buffer-now'] = bufferSteps(seed, k);
    var cq = (typeof CAL !== 'undefined' && CAL.quantities) || {};
    ['model', 'seed'].forEach(function (setting) {
      var m = cq[setting] || {};
      Object.keys(m).forEach(function (name) { if (q[name] === undefined) q[name] = m[name]; });
    });
    return q;
  }

  TP.models = TP.models || {};
  TP.models.checkpointRun = { run: run, runOf: runOf, bufferOf: bufferOf, rowOf: rowOf, summaryOf: summaryOf, readout: readoutText, quantities: quantitiesOf, N: N };

  /* ---------- drawing ---------- */

  var doc = global.document;
  if (!doc) return;

  /** Ticks every 5,000 steps (WO-F1.1), in checkpoint units. */
  var TICK_STEPS = 5000;
  function xTicks() { var v = []; for (var s = 0; s <= STEPS; s += TICK_STEPS) v.push(s / INTERVAL); return v; }
  function xOf(r) { return r.t; }
  function yOf(r) { return r.value; }
  function keyOf(i) { return 'c' + i; }            // a checkpoint's key, by its index 1..N

  /** The options of panel (a), shared by the figure and the recap. */
  function panelA(o) {
    return Object.assign({
      letter: '(a)', describe: 'validation error against step',
      xDomain: CAL.domains.a.x.map(function (v) { return v / INTERVAL; }), yDomain: CAL.domains.a.y,
      xTicks: xTicks(),
      xFormat: function (v) { return fmt.int(v * INTERVAL); },
      yTicks: 5, yFormat: function (v) { return v.toFixed(1); },
      xLabel: 'step', yLabel: 'validation error',
      margin: { t: 12, r: 24, b: 42, l: 50 },
      aspect: function (w, phone) { return phone ? 0.62 : 0.44; },
      maxHeight: function (w, phone) { return phone ? 240 : 300; }
    }, o || {});
  }

  /**
   * Draw panel (a) for step `shown` of a run whose record is `rows` (rows[t] for t = 0..N).
   * o.cursor draws the cursor and its step on the axis; o.hold keeps label positions.
   */
  function drawA(p, rows, shown, seed, o) {
    o = o || {};
    var up = [], ahead = [];
    rows.forEach(function (r) {
      if (r.t < 1 || r.value == null) return;
      if (r.t <= shown) up.push(r);
      if (r.t >= Math.max(shown, 1)) ahead.push(r);
    });
    var end = shown >= N;
    if (ahead.length > 1 && !end) C().line(p, ahead, xOf, yOf, { role: 'model', series: 'ahead', dash: 'trail' });
    if (up.length > 1) C().line(p, up, xOf, yOf, { role: 'model', series: 'run', key: 'run' });
    var filled = end ? up.filter(function (r) { return r.t < N; }) : up;
    if (filled.length) C().markers(p, filled, xOf, yOf, { role: 'model', series: 'run', key: function (d) { return keyOf(d.t); } });
    var items = [];
    if (end) {
      var s = summaryOf(seed), lastRow = rows[N], selRow = rows[s.selected + 1];
      C().markers(p, [lastRow], xOf, yOf, { role: 'model', series: 'run', fill: 'open', key: function (d) { return keyOf(d.t); } });
      C().ring(p, selRow.t, selRow.value, { role: 'model', series: 'run', key: keyOf(selRow.t) });
      if (s.same) {
        items.push({ id: 'selected', text: 'selected and last checkpoint', role: 'model', series: 'run', tone: 'ink',
          feature: { type: 'point', x: selRow.t, y: selRow.value, r: 11 }, phone: { text: 'selected, last' }, captionNames: true, keySentence: true });
      } else {
        items.push({ id: 'selected', text: 'selected checkpoint', role: 'model', series: 'run', tone: 'ink',
          feature: { type: 'point', x: selRow.t, y: selRow.value, r: 11 }, phone: { text: 'selected' }, captionNames: true, keySentence: true });
        items.push({ id: 'last', text: 'last checkpoint', role: 'model', series: 'run', tone: 'ink',
          feature: { type: 'point', x: lastRow.t, y: lastRow.value, r: 5.5 }, phone: { text: 'last' }, captionNames: true, keySentence: true });
      }
    }
    /* At the end the cursor stands on the last checkpoint's step, the feature the label "last
       checkpoint" names, so it takes the run's series and is no rival of the run's labels. */
    if (o.cursor) C().level(p, 'x', shown, { role: 'reader', text: stepText(shown), line: true, series: end ? 'run' : 'cursor' });
    C().place(p, items, { hold: !!o.hold });
  }

  function C() { return TP.chart; }

  /* ---------- panel (b), the buffer ---------- */

  var SLOT_GAP = 6;
  /** The slots' boxes in plot px: a column of three from 640 px, a row of three below. */
  function slotBoxes(p) {
    var out = [];
    for (var i = 0; i < BUFFER; i++) {
      if (p.phone) {
        var w = (p.width - SLOT_GAP * (BUFFER - 1)) / BUFFER;
        out.push({ x: i * (w + SLOT_GAP), y: 0, w: w, h: p.height });
      } else {
        var h = (p.height - SLOT_GAP * (BUFFER - 1)) / BUFFER;
        out.push({ x: 0, y: i * (h + SLOT_GAP), w: p.width, h: h });
      }
    }
    return out;
  }
  /** Draw the buffer after k evaluations: each slot's marker, step and value, lowest first.
      Returns the reading positions, one per slot: {i, X, Y, e} for a filled slot and {slot, X, Y}
      for an empty one, so that the reader of (b) has its three positions from the first step. */
  function drawB(p, seed, k) {
    var boxes = slotBoxes(p), idx = bufferOf(seed, k), evals = runOf(seed).evals;
    var layer = p.layers.marks.node(), SVGNS = 'http://www.w3.org/2000/svg';
    var end = k >= N, sel = end ? summaryOf(seed).selected : -1;
    var pts = [], reads = [];
    boxes.forEach(function (b, i) {
      var rect = doc.createElementNS(SVGNS, 'rect');
      rect.setAttribute('class', 'structure slot');
      rect.setAttribute('x', b.x + 0.5); rect.setAttribute('y', b.y + 0.5);
      rect.setAttribute('width', Math.max(0, b.w - 1)); rect.setAttribute('height', Math.max(0, b.h - 1));
      rect.setAttribute('rx', 4);
      p.layers.bands.node().appendChild(rect);
      var mx = b.x + 14, my = b.y + b.h / 2, tx = b.x + 28;
      var lines;
      if (i < idx.length) {
        var e = evals[idx[i]];
        pts.push({ i: idx[i], X: mx, Y: my, e: e });
        reads.push(pts[pts.length - 1]);
        lines = [{ cls: 'slot-step', text: 'step ' + fmt.int(e.step) }, { cls: 'slot-value', text: f4(e.value) }];
      } else {
        reads.push({ slot: i, X: mx, Y: my });
        lines = [{ cls: 'slot-empty', text: 'empty' }];
      }
      var lh = p.h + 3, y0 = my - (lines.length - 1) * lh / 2;
      lines.forEach(function (l, j) {
        var t = doc.createElementNS(SVGNS, 'text');
        t.setAttribute('class', l.cls);
        t.setAttribute('x', tx); t.setAttribute('y', y0 + j * lh);
        t.setAttribute('dominant-baseline', 'central');
        t.textContent = l.text;
        layer.appendChild(t);
      });
    });
    /* the markers in data units of the panel's [0, 1] frame, keyed as in (a) */
    C().markers(p, pts, function (q) { return p.x.invert(q.X); }, function (q) { return p.y.invert(q.Y); },
      { role: 'model', series: 'buffer', key: function (q) { return keyOf(q.i + 1); } });
    pts.forEach(function (q) {
      if (q.i === sel) C().ring(p, p.x.invert(q.X), p.y.invert(q.Y), { role: 'model', series: 'buffer', key: keyOf(q.i + 1) });
    });
    return reads;
  }

  /* ---------- the figure ---------- */

  function init(element) {
    var pa = null, pb = null, linked = false, slotPts = [];
    var fig = TP.fig(element, {
      kind: 'running',
      seed: CAL.seed,
      params: {},
      draw: function (state, ctx) {
        if (!pa) {
          pa = C().panel(ctx.fig.panels, panelA({}));
          pb = C().panel(ctx.fig.panels, {
            letter: '(b)', describe: 'the buffer of the three best checkpoints', note: '3 best so far',
            xDomain: [0, 1], yDomain: [0, 1], xTicks: 'none', yTicks: 'none', grid: 'none',
            margin: { t: 12, r: 2, b: 2, l: 2 },
            aspect: function (w, phone) {
              /* on a phone the panel is 58 px tall, so that its plot, and the reading element
                 over it, is 44 px tall (DS §6.8; accessibility finding Z9) */
              if (phone) return 58 / w;
              return pa && pa.H ? pa.H / w : 1.9;
            }
          });
        }
        var run = ctx.run || null;
        pa.update(function (p) {
          if (!state) return;
          drawA(p, ctx.rows || [], state.k, state.seed, { cursor: true, hold: ctx.hold });
        });
        pb.update(function (p) {
          if (!state) return;
          slotPts = drawB(p, state.seed, state.k);
        });
        if (run && !linked) {
          linked = true;
          var h = run.recordHandlers();
          C().hover(pa, {
            xValues: function () { var v = []; for (var i = 0; i <= N; i++) v.push(i); return v; },
            by: 'step', format: function (v) { return 'Step ' + stepText(v); },
            tick: function (v) { return stepText(v); },
            series: [{ label: 'validation error', role: 'model', fmt: f4, y: function (v) { var r = run.rows()[v]; return r ? r.value : null; } }],
            extra: function (v) {
              var sd = run.params().seed, s = summaryOf(sd);
              if (v >= 1 && run.t() >= N && v - 1 === s.selected) return [s.same ? 'the selected and last checkpoint' : 'the selected checkpoint'];
              if (v === N && run.t() >= N) return ['the last checkpoint'];
              return [];
            },
            press: h.press, onRead: h.onRead
          });
          C().pointHover(pb, {
            by: 'checkpoint', label: 'Reading of (b) by checkpoint',
            points: function () {
              return slotPts.map(function (q) {
                if (!q.e) return { x: pb.x.invert(q.X), y: pb.y.invert(q.Y), key: null, head: 'Slot ' + (q.slot + 1) + ' of ' + BUFFER, rows: [], lines: ['empty'] };
                return { x: pb.x.invert(q.X), y: pb.y.invert(q.Y), key: keyOf(q.i + 1), head: 'Checkpoint at step ' + fmt.int(q.e.step),
                  rows: [{ value: f4(q.e.value), label: 'validation error', role: 'model' }] };
              });
            }
          });
          C().link([pa, pb], { key: function (value, point) { return point ? point.key : keyOf(r1(value)); } });
        }
      },
      readout: function (state) { return readoutText(state.seed, state.k); },
      table: function (state, ctx) {
        var k = state.k, buf = bufferOf(state.seed, k), s = summaryOf(state.seed), rows = [];
        for (var i = 1; i <= k; i++) {
          var e = runOf(state.seed).evals[i - 1], note = [];
          if (k >= N && i - 1 === s.selected) note.push('selected');
          if (k >= N && i === N) note.push('last');
          rows.push({ step: e.step, value: e.value, noiseFree: e.noiseFree, inBuffer: buf.indexOf(i - 1) >= 0 ? 'yes' : 'no', note: note.join(', ') });
        }
        return {
          columns: [
            { key: 'step', label: 'Checkpoint step', format: fmt.int },
            { key: 'value', label: 'Validation error', format: f4 },
            { key: 'noiseFree', label: 'Noise-free value', format: f4 },
            { key: 'inBuffer', label: 'In the buffer at step ' + stepText(k) },
            { key: 'note', label: 'Checkpoint' }
          ],
          rows: rows,
          caption: 'The ' + k + ' checkpoints saved up to step ' + stepText(k) + ' at seed ' + state.seed + '.'
        };
      },
      quantities: function (state) { return quantitiesOf(state.seed, state.k); }
    });
    TP.run(fig, {
      init: function (params) { return { k: 0, seed: params.seed }; },
      advance: function (s) { s.k += 1; return s; },
      record: function (s) { return rowOf(s.seed, s.k); },
      steps: N, limit: N, pace: 'linear', duration: 6000,
      ahead: true, unit: 'checkpoint', recordPanel: 'a', reset: 'show'
    });
  }

  /* ---------- the recap (plan §6.24, R5) ---------- */

  TP.recaps = TP.recaps || {};
  /** Panel (a) finished at the default seed, with the ring, the open marker and their labels. */
  TP.recaps['F1.1:default'] = function (el) {
    var seed = CAL.seed, rows = [];
    for (var t = 0; t <= N; t++) rows.push(Object.assign({ t: t }, rowOf(seed, t)));
    var p = C().panel(el, panelA({
      letter: '', describe: 'validation error against step, at the end of the run',
      maxHeight: function (w, phone) { return phone ? 180 : 240; },
      aspect: function (w, phone) { return phone ? 0.5 : 0.42; }
    }));
    p.update(function (q) { drawA(q, rows, N, seed, { cursor: false }); });
    return p;
  };

  doc.addEventListener('tp:ready', function () {
    var el = doc.getElementById('fig-checkpoint');
    if (el && TP.fig && TP.run && TP.chart && TP.curves) init(el);
  });
})(typeof window !== 'undefined' ? window : globalThis);
