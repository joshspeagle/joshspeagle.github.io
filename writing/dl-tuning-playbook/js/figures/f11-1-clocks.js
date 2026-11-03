/*
 * f11-1-clocks.js: one training run evaluated on a timer and on a step schedule (fig-clocks).
 *
 * Revised 2026-11 (post09 review). The figure is now a fixed figure with one control, the
 * evaluation schedule ("every 25 s" or "every 250 steps"), and a hidden focus parameter that the
 * guided tour sets. It makes the Playbook's claim (README "Setting up periodic evaluations":
 * evaluate at regular step intervals, not time intervals) visible as three linked panels:
 *   (a) training step against wall-clock time: the clock as a model-blue line, the slowdown and
 *       job-down windows, and a rug of the selected schedule's evaluations on each axis (steps
 *       trained again after the restart in a second, third-gold lane).
 *   (b) validation error against step from step 4,000 on: the noise-free curve in context grey,
 *       every evaluation as a marker joined in the order the evaluations ran (so the restart's
 *       repeat doubles back), the slowdown's steps as a highlight window, and the best checkpoint
 *       (the lowest evaluation) ringed and named.
 *   (c) evaluations per 1,000 steps, as bars on the same step axis: flat on the step schedule
 *       except where the restart repeats steps, a spike in the slowdown on the timer.
 *
 * The model is TP.clock.stepClock (site/js/lib/clock.js) with the periodic component off (b = 0),
 * computed live. The seed is 8 (CAL.defaults.seed), chosen because the two schedules select
 * different best checkpoints in it. CAL.quantities.seed records the share of seeds 1..1,000 in
 * which each schedule's best checkpoint falls inside the slowdown's steps (17% on the timer, 6%
 * on the step schedule). TP.clockSeedShares(1000) recomputes those shares in the browser.
 *
 * The CAL block keeps the generated-block markers so tests/verify_v4.py can read the ledger keys.
 * It was edited by hand in this revision (the evaluation and curve tables were removed because
 * the figure computes them from the model).
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};

  /* BEGIN GENERATED table-cal */
  var CAL = {
    "defaults": {"schedule": "time", "focus": "none", "evalSeconds": 25, "evalSteps": 250, "preempt": true, "slowRate": 3, "seed": 8, "b": 0},
    "presets": {},
    "states": {"step": {"schedule": "step"}},
    "seed": 8,
    "domains": {"a": {"x": [0, 2800], "y": [0, 20000]}, "b": {"x": [4000, 20000], "y": [0.21, 0.24]}, "c": {"x": [4000, 20000], "y": [0, 15]}},
    "quantities": {
      "default": {
        "evals-slowdown": 24,
        "down-seconds": 300,
        "evals-repeated": 3,
        "end-time": 2800,
        "evals-total": 101,
        "evals-missed-down": 12,
        "slow-step-spacing": 75,
        "normal-step-spacing": 250,
        "preempt-time": 2200,
        "restore-step": 17000,
        "slow-seconds": 600,
        "best-step": 10075,
        "best-value": 0.2175
      },
      "step": {
        "evals-slowdown": 8,
        "evals-total": 84,
        "evals-repeated": 3,
        "best-step": 6500,
        "best-value": 0.2180
      },
      "model": {
        "eval-seconds": 25,
        "eval-steps": 250,
        "rate": 10,
        "slow-rate": 3,
        "slow-from": 1000,
        "slow-to": 1600,
        "preempt-step": 17800,
        "end-step": 20000,
        "checkpoint-every": 1000,
        "noise-sigma": 0.003,
        "v-star": 0.2,
        "tau": 1000,
        "beta": 0.01,
        "min-step": 6640
      },
      "seed": {
        "chosen": 8,
        "timer-in-slow": "17%",
        "step-in-slow": "6%",
        "statistic": "share of seeds 1 to 1,000 whose best checkpoint lies in steps 10,000 to 11,800 (the slowdown), per schedule"
      }
    }
  };
  /* END GENERATED table-cal */

  var ID = 'fig-clocks';
  var RUG = 9, LANE_GAP = 3;
  var BIN = 1000;
  var MARGIN = { desktop: { t: 8, r: 26, b: 44, l: 76 }, phone: { t: 6, r: 18, b: 40, l: 62 } };
  /* (b) shares its step axis with (c) below it, so (c) carries the shared step tick labels */
  var MARGIN_B = { desktop: { t: 8, r: 26, b: 12, l: 76 }, phone: { t: 6, r: 18, b: 10, l: 62 } };
  /* plot-area heights in px: (a), (b), (c), desktop and phone */
  var PLOT_H = { a: [94, 90], b: [142, 132], c: [42, 42] };

  function by(name) { return TP.fmt.byName(name); }
  function int(v) { return by('int')(v); }
  function f4(v) { return v.toFixed(4); }

  /* ============================== the model ============================== */

  var clockCache = null;
  function clock() {
    if (!clockCache) {
      var D = CAL.defaults;
      clockCache = TP.clock.stepClock({ evalSeconds: D.evalSeconds, evalSteps: D.evalSteps, preempt: D.preempt, slowRate: D.slowRate, seed: D.seed });
    }
    return clockCache;
  }

  /** the noise-free curve's minimum, on a 10-step grid */
  function noiseFreeMin(clk) {
    var best = Infinity, at = 0;
    for (var s = 0; s <= clk.clock.endStep; s += 10) { var v = clk.noiseFree(s, 0); if (v < best) { best = v; at = s; } }
    return { step: at, value: best };
  }

  /** The share of seeds 1..n in which each schedule's best checkpoint lies in the slowdown's steps. */
  TP.clockSeedShares = function (n) {
    var D = CAL.defaults, inT = 0, inS = 0;
    function best(a) { return a.reduce(function (m, e) { return e.loss < m.loss ? e : m; }); }
    for (var seed = 1; seed <= n; seed++) {
      var c = TP.clock.stepClock({ evalSeconds: D.evalSeconds, evalSteps: D.evalSteps, preempt: D.preempt, slowRate: D.slowRate, seed: seed });
      var lo = c.derived.atSlowFrom, hi = c.derived.atSlowTo;
      var bt = best(c.timeEvals(0)), bs = best(c.stepEvals(0));
      if (bt.step >= lo && bt.step <= hi) inT++;
      if (bs.step >= lo && bs.step <= hi) inS++;
    }
    return { timer: inT / n, step: inS / n };
  };

  /** The derived state for the values. Every array's rows carry a key (DS §9). */
  function apply(values) {
    var clk = clock(), d = clk.derived, c = clk.clock;
    var schedule = values.schedule || 'time';
    var raw = schedule === 'step' ? clk.stepEvals(0) : clk.timeEvals(0);
    var evals = raw.map(function (e, i) {
      return {
        key: schedule + i, time: e.time, step: e.step, pass: e.pass, value: e.loss,
        again: e.pass === 1 && e.step > d.restore && e.step <= d.atPreempt
      };
    });
    var best = evals.reduce(function (m, e) { return e.value < m.value ? e : m; });
    var inSlow = evals.filter(function (e) { return e.time >= c.slowFrom && e.time < c.slowTo; });
    var T = clk.constants.evalSeconds;
    var normal = evals.filter(function (e) { return e.time + T < c.slowFrom; });
    var bins = [];
    for (var b0 = 0; b0 < c.endStep; b0 += BIN) bins.push({ key: 'bin' + b0, x0: b0, x1: b0 + BIN, y: 0 });
    evals.forEach(function (e) { var k = Math.min(bins.length - 1, Math.floor(e.step / BIN)); bins[k].y += 1; });
    var curve = [];
    for (var s = 0; s <= c.endStep; s += 100) curve.push({ key: 'v' + s, step: s, value: clk.noiseFree(s, 0) });
    var nf = noiseFreeMin(clk);
    return {
      schedule: schedule, focus: values.focus || 'none',
      T: T, E: clk.constants.evalSteps, rate: c.rate, slowRate: d.slowRate, slowFrom: c.slowFrom, slowTo: c.slowTo,
      checkpointEvery: c.checkpointEvery, sigma: clk.constants.sigma,
      vStar: TP.curves.defaults.vStar, tau: TP.curves.defaults.tau, beta: TP.curves.defaults.beta,
      atSlowFrom: d.atSlowFrom, atSlowTo: d.atSlowTo, atPreempt: d.atPreempt, preemptAt: d.preemptAt,
      restore: d.restore, restart: d.restart, end: d.end, endStep: c.endStep, down: d.restart - d.preemptAt,
      clock: [
        { key: 'c0', t: 0, s: 0 },
        { key: 'c1', t: c.slowFrom, s: d.atSlowFrom },
        { key: 'c2', t: c.slowTo, s: d.atSlowTo },
        { key: 'c3', t: d.preemptAt, s: d.atPreempt },
        { key: 'c4', t: d.preemptAt, s: d.restore },
        { key: 'c5', t: d.restart, s: d.restore },
        { key: 'c6', t: d.end, s: c.endStep }
      ],
      curve: curve, evals: evals, bins: bins, best: best, nfMin: nf,
      inSlow: inSlow.length,
      slowSpacing: inSlow.length > 1 ? inSlow[1].step - inSlow[0].step : null,
      normalSpacing: normal.length > 1 ? normal[1].step - normal[0].step : null,
      missed: schedule === 'time' ? Math.floor(d.end / T + 1e-9) + 1 - evals.length : 0,
      repeated: evals.filter(function (e) { return e.again; }).length,
      maxBin: Math.max.apply(null, bins.map(function (b) { return b.y; }))
    };
  }

  /* ============================== the figure ============================== */

  var pa = null, pb = null, pc = null, cur = null, curCtx = null;

  function marginOf(letter, phone) { var M = letter === 'b' ? MARGIN_B : MARGIN; return phone ? M.phone : M.desktop; }
  function heightOf(letter, phone) {
    var m = marginOf(letter, phone);
    return PLOT_H[letter][phone ? 1 : 0] + m.t + m.b;
  }
  function commonOpts(letter) {
    var dom = CAL.domains[letter];
    return {
      letter: '(' + letter + ')', key: letter,
      xDomain: dom.x.slice(), yDomain: dom.y.slice(),
      margin: function (w, phone) { return marginOf(letter, phone); },
      aspect: function (w, phone) { return heightOf(letter, phone) / Math.max(w, 1); }
    };
  }
  function stepTicks(d, px) { return px < 420 ? [4000, 12000, 20000] : [4000, 8000, 12000, 16000, 20000]; }

  function optsA() {
    var o = commonOpts('a');
    o.describe = 'step against wall-clock time';
    o.xLabel = 'wall-clock time (s)';
    o.yLabel = 'step';
    o.xTicks = function (d, px) { return px < 420 ? [0, 1000, 2000] : [0, 500, 1000, 1500, 2000, 2500]; };
    o.xFormat = int;
    o.yTicks = function (d, px) { return px < 140 ? [0, 10000, 20000] : [0, 5000, 10000, 15000, 20000]; };
    o.yFormat = int;
    return o;
  }
  function optsB() {
    var o = commonOpts('b');
    o.describe = 'validation error against step, in the order the evaluations ran';
    o.xLabel = '';
    o.yLabel = 'validation error';
    o.xTicks = stepTicks;
    o.xFormat = function () { return ''; };
    o.yTicks = function (d, px) { return px < 170 ? [0.21, 0.225, 0.24] : [0.21, 0.22, 0.23, 0.24]; };
    o.yFormat = function (v) { return v.toFixed(v * 1000 % 10 === 0 ? 2 : 3); };
    return o;
  }
  function optsC() {
    var o = commonOpts('c');
    o.describe = 'evaluations per 1,000 steps';
    o.xLabel = 'step';
    o.yLabel = function (p) { return p.phone ? 'evals' : 'evals / 1k'; };
    o.xTicks = stepTicks;
    o.xFormat = int;
    o.yTicks = function () { return [5, 10]; };
    o.yFormat = int;
    return o;
  }

  /** Ticks inward from the y axis (axis 'y') or the x axis (axis 'x') at the given values. */
  function laneRug(p, axis, vals, o) {
    var d = '', flat = [];
    vals.forEach(function (v) {
      if (axis === 'y') {
        var Y = p.y(v);
        if (!(Y >= -0.5 && Y <= p.height + 0.5)) return;
        d += 'M' + o.x0.toFixed(2) + ',' + Y.toFixed(2) + 'H' + o.x1.toFixed(2);
        flat.push(o.x0, Y, o.x1, Y, NaN, NaN);
      } else {
        var X = p.x(v);
        if (!(X >= -0.5 && X <= p.width + 0.5)) return;
        d += 'M' + X.toFixed(2) + ',' + o.y0.toFixed(2) + 'V' + o.y1.toFixed(2);
        flat.push(X, o.y0, X, o.y1, NaN, NaN);
      }
    });
    var path = p.layers.marks.append('path').attr('class', o.role ? 'stem r-' + o.role : 'structure').attr('d', d || 'M0,0');
    if (o.key != null) path.attr('data-key', o.key);
    if (o.rug) path.attr('data-rug', o.rug);
    if (flat.length) {
      TP.chart.obstacle(p, flat, o.role ? { kind: 'rival', type: 'polyline', width: 1.5, series: o.series }
        : { kind: 'structure', type: 'polyline', width: 1 });
    }
    return path;
  }

  function drawA(p) {
    var C = TP.chart, s = cur;
    if (!s) return;
    C.window(p, s.slowFrom, s.slowTo, { kind: 'highlight', id: 'slowdown', name: 'slowdown', phone: { text: 'slow' } });
    C.window(p, s.preemptAt, s.restart, { kind: 'highlight', id: 'down', name: p.phone ? 'down' : 'job down' });
    /* the time rug: every evaluation of the selected schedule, inward from the time axis */
    C.rug(p, s.evals.map(function (e) { return e.time; }), { y0: p.y.invert(p.height), y1: p.y.invert(p.height - RUG), key: 'rug-time' });
    p.layers.marks.select('path[data-key="rug-time"]').attr('data-rug', 'time');
    /* the step rug: steps trained once in the first lane, steps trained again in the second */
    laneRug(p, 'y', s.evals.filter(function (e) { return !e.again; }).map(function (e) { return e.step; }), { x0: 0, x1: RUG, key: 'rug-step', rug: 'step' });
    var again = s.evals.filter(function (e) { return e.again; });
    var L0 = RUG + LANE_GAP, L1 = L0 + RUG;
    laneRug(p, 'y', again.map(function (e) { return e.step; }), { x0: L0, x1: L1, role: 'third', series: 'again', key: 'rug-again', rug: 'again' });
    C.line(p, s.clock, function (q) { return q.t; }, function (q) { return q.s; }, { role: 'model', series: 'clock', key: 'clock' });
    var items = [];
    if (!p.phone) {
      items.push({ id: 'clock-name', text: s.schedule === 'step' ? 'evaluations every 250 steps' : 'evaluations every 25 s', role: 'model', series: 'clock', tone: 'role',
        feature: { type: 'point', x: 400, y: 4000, r: 4 } });
    }
    C.place(p, items, curCtx || {});
  }

  function drawB(p) {
    var C = TP.chart, s = cur;
    if (!s) return;
    var X = function (e) { return e.step; }, Y = function (e) { return e.value; }, K = function (e) { return e.key; };
    var lo = CAL.domains.b.x[0];
    var shown = s.evals.filter(function (e) { return e.step >= lo; });
    var once = shown.filter(function (e) { return !e.again; }), again = shown.filter(function (e) { return e.again; });
    C.window(p, s.atSlowFrom, s.atSlowTo, { kind: 'highlight', id: 'slow-steps', name: p.phone ? 'slow' : "slowdown's steps" });
    C.line(p, s.curve.filter(function (q) { return q.step >= lo; }), X, Y, { role: 'context', series: 'nf', key: 'noise-free' });
    C.line(p, shown, X, Y, { role: 'model', series: 'evals', key: 'path', weight: 1.25 });
    C.markers(p, once, X, Y, { role: 'model', series: 'evals', shape: 'circle', fill: 'filled', size: 6, key: K });
    C.markers(p, again, X, Y, { role: 'third', series: 'again', shape: 'circle', fill: 'open', size: 8, key: K });
    var f = s.focus, items = [];
    if (f === 'none' || f === 'best') {
      C.ring(p, s.best.step, s.best.value, { role: 'data', key: 'best', series: 'best' });
      items.push({ id: 'best', text: p.phone ? ['best:', 'step ' + int(s.best.step)] : 'best checkpoint, step ' + int(s.best.step), role: 'data', series: 'best', tone: 'role',
        feature: { type: 'point', x: s.best.step, y: s.best.value, r: 11 } });
    }
    if (f === 'none' || f === 'repeat') {
      var top = Math.max.apply(null, s.evals.filter(function (e) { return e.step >= again[0].step - 300 && e.step <= again[again.length - 1].step + 300; }).map(Y));
      C.annotation(p, { kind: 'bracket', id: 'again', text: p.phone ? 'trained again' : 'trained again after the restart', side: 'above', gap: 8,
        anchor: { x0: again[0].step, x1: again[again.length - 1].step, y: top } });
    }
    if (!p.phone) {
      items.push({ id: 'nf', text: 'noise-free curve', role: 'context', series: 'nf', tone: 'role', feature: { type: 'line', of: 'nf' } });
    }
    C.place(p, items, curCtx || {});
  }

  function drawC(p) {
    var C = TP.chart, s = cur;
    if (!s) return;
    var lo = CAL.domains.c.x[0];
    C.window(p, s.atSlowFrom, s.atSlowTo, { kind: 'highlight', id: 'slow-steps-c' });
    var rows = s.bins.filter(function (b) { return b.x0 >= lo; });
    C.bars(p, rows, { role: 'model', series: 'bins', key: function (b) { return b.key; }, gap: 2 });
    /* name the tallest bar's count once, above it */
    var top = rows.reduce(function (m, b) { return b.y > m.y ? b : m; });
    var items = [{ id: 'peak', text: int(top.y) + (p.phone ? '' : ' evaluations'), role: 'model', series: 'bins', tone: 'role',
      feature: { type: 'point', x: (top.x0 + top.x1) / 2, y: top.y, r: 2 } }];
    if (s.focus === 'slow' && !p.phone) {
      items.push({ id: 'level', text: '4 per 1,000 steps at full speed', role: 'context', series: 'lvl', tone: 'ink',
        feature: { type: 'point', x: 6500, y: 4, r: 2 } });
    }
    C.place(p, items, curCtx || {});
  }

  function draw(state, ctx) {
    if (!pa) {
      pa = TP.chart.panel(ctx.fig.panels, optsA());
      pb = TP.chart.panel(ctx.fig.panels, optsB());
      pc = TP.chart.panel(ctx.fig.panels, optsC());
      pa.update(drawA);
      pb.update(drawB);
      pc.update(drawC);
    }
    cur = state;
    curCtx = ctx ? { hold: !!ctx.hold } : {};
    var el = ctx && ctx.fig && ctx.fig.el;
    if (el) {
      el.setAttribute('data-schedule', state ? state.schedule : 'time');
      el.setAttribute('data-focus', state ? state.focus : 'none');
    }
    pa.update();
    pb.update();
    pc.update();
  }

  function readout(state) {
    if (!state) return '';
    var where = state.best.step >= state.atSlowFrom && state.best.step <= state.atSlowTo ? 'inside the slowdown' : 'outside the slowdown';
    if (state.schedule === 'step') {
      return 'Every ' + int(state.E) + ' steps: ' + int(state.evals.length) + ' evaluations, ' + int(state.inSlow) +
        ' of them during the slowdown. Best checkpoint: step ' + int(state.best.step) + ' (validation error ' + state.best.value.toFixed(4) + '), ' + where + '.';
    }
    return 'Every ' + int(state.T) + ' s: ' + int(state.evals.length) + ' evaluations, ' + int(state.inSlow) +
      ' of them during the slowdown. Best checkpoint: step ' + int(state.best.step) + ' (validation error ' + state.best.value.toFixed(4) + '), ' + where + '.';
  }

  function table(state) {
    return {
      columns: [
        { key: 'time', label: 'Wall-clock time (s)', format: int },
        { key: 'step', label: 'Step', format: int },
        { key: 'pass', label: 'Pass' },
        { key: 'value', label: 'Validation error', format: f4 }
      ],
      rows: state.evals.map(function (e) {
        return { key: e.key, time: e.time, step: e.step, value: e.value,
          pass: e.pass === 0 ? 'first' : e.again ? 'after the restart, step trained again' : 'after the restart' };
      }),
      caption: (state.schedule === 'step' ? 'Every evaluation on the step schedule, one every ' + int(state.E) + ' steps. '
        : 'Every evaluation on the timer, one every ' + int(state.T) + ' s while the job runs. ') +
        'The job is down from ' + int(state.preemptAt) + ' s to ' + int(state.restart) + ' s and restarts from the checkpoint at step ' + int(state.restore) + '.'
    };
  }

  function quantities(state) {
    var q = {
      'evals-slowdown': state.inSlow,
      'evals-total': state.evals.length,
      'evals-repeated': state.repeated,
      'best-step': state.best.step,
      'best-value': Math.round(state.best.value * 1e4) / 1e4,
      /* the model's settings (fig-clocks:model:*) */
      'eval-seconds': state.T,
      'eval-steps': state.E,
      rate: state.rate,
      'slow-rate': state.slowRate,
      'slow-from': state.slowFrom,
      'slow-to': state.slowTo,
      'preempt-step': state.atPreempt,
      'end-step': state.endStep,
      'checkpoint-every': state.checkpointEvery,
      'noise-sigma': state.sigma,
      'v-star': state.vStar,
      tau: state.tau,
      beta: state.beta,
      'min-step': state.nfMin.step,
      chosen: CAL.defaults.seed
    };
    if (state.schedule === 'time') {
      q['down-seconds'] = state.down;
      q['end-time'] = state.end;
      q['evals-missed-down'] = state.missed;
      q['slow-step-spacing'] = state.slowSpacing;
      q['normal-step-spacing'] = state.normalSpacing;
      q['preempt-time'] = state.preemptAt;
      q['restore-step'] = state.restore;
      q['slow-seconds'] = state.slowTo - state.slowFrom;
    }
    return q;
  }

  function init(element) {
    TP.fig(element, {
      kind: 'fixed',
      params: {
        schedule: {
          type: 'choice', domain: ['time', 'step'], default: CAL.defaults.schedule,
          labels: { time: 'Every 25 s (timer)', step: 'Every 250 steps' },
          label: 'Evaluate', control: 'segment', change: 'cut', ghost: false
        },
        focus: {
          type: 'choice', domain: ['none', 'slow', 'repeat', 'best'], default: CAL.defaults.focus,
          label: 'Highlight', control: 'none', change: 'cut', ghost: false
        }
      },
      presets: CAL.presets,
      states: CAL.states,
      apply: apply,
      draw: draw,
      readout: readout,
      table: table,
      quantities: quantities
    });
  }

  document.addEventListener('tp:ready', function () {
    var el = document.getElementById(ID);
    if (el && TP.clock && TP.chart) init(el);
  });
})();
