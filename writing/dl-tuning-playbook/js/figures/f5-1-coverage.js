/*
 * f5-1-coverage.js: figure F5.1, coverage as points arrive (#fig-coverage), on page 5 #quasi-random.
 *
 * Design: notes/revamp/figure-plan.md (FP) F5.1 and notes/revamp/implementation-plan.md WO-F5.1
 * (§6.9), on the figure contract of site.js (TP.fig) and the runtime of runtime.js (TP.run).
 *
 * The model is TP.coverage (site/js/lib/coverage.js): grid, uniform random and quasi-random
 * (scrambled, shifted Halton) trials in d hyperparameters on the unit cube, coordinate 0 standing
 * for the learning rate and coordinate 1 for the weight decay. The random and quasi-random sets of
 * n trials are the first n of the 100-trial sets, so a step adds one trial to each method and never
 * moves the trials already drawn. The grid is the largest full grid within n trials, k^d <= n, and
 * it is laid out afresh, as a cut, when k changes. The projection statistics (distinct values and
 * the largest gap, the gaps from 0 and to 1 included) are TP.coverage.project's, the computation of
 * tests/calibration/fig-coverage.calibrate.js, so the figure's quantities equal the ledger's rows.
 * The model draws no number from the runtime's generators: the seed acts through TP.coverage.
 *
 * One runtime step adds one trial to each method, so step t shows t + 1 trials (R7). The run stops
 * at step CAL.defaults.t (16 trials) and computes up to the end of panel (d)'s axis (100 trials).
 *
 * The panels (WO-F5.1). (a) grid, (b) random, (c) quasi-random: weight decay against learning rate
 * on unit axes, small multiples with one y axis on (a). Beside each frame a strip projects the
 * trials onto the weight decay (drawn in the frame's right margin), and under it a panel of its own
 * (a-lr, b-lr, c-lr) projects them onto the learning rate. Every trial's tick in both strips carries
 * the trial's key, so pointing at a trial highlights its ticks (C.link). (d) is the record: the
 * largest learning-rate gap against the number of trials, one trace per method and the cursor. Its x
 * axis is in step units (0 to 99) and its tick labels print trials (step + 1), so the runtime's
 * record handlers and the conformance harness map a position on the axis to the cursor directly.
 *
 * The layout is a CSS grid (site/css/figures/fig-coverage.css). From 640 px the three strategy
 * columns sit side by side with their learning-rate strips under them and (d) under the row. Below
 * 640 px the scatters stay one row of small multiples with 4-px dots, the three learning-rate strips
 * become full-width rows named in their left margins, and (d) follows (DS §3.5 item 8).
 *
 * Tokens (WO-F5.1): quasi-random search model blue, grid search third gold, uniform random search
 * fourth indigo, in all four panels.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

/* BEGIN GENERATED table-cal */
// From tests/calibration/out/fig-coverage.json by npm run generate (tests/lib/write-generated.js).
var CAL = {
  "defaults": {"dims": 4, "t": 15},
  "presets": {
    "trials-30": {"dims": 4, "t": 29},
    "two": {"dims": 2, "t": 15},
    "two-trials-30": {"dims": 2, "t": 29}
  },
  "states": {"three": {"dims": 3}},
  "seed": 1,
  "domains": {
    "a": {"x": [0, 1], "y": [0, 1]},
    "b": {"x": [0, 1], "y": [0, 1]},
    "c": {"x": [0, 1], "y": [0, 1]},
    "d": {"x": [1, 100], "y": [0, 1]}
  },
  "tables": {},
  "quantities": {
    "default": {
      "grid-placed-16": 16,
      "grid-remainder-16": 0,
      "grid-distinct-16": 2,
      "random-distinct-16": 16,
      "quasi-distinct-16": 16,
      "grid-gap-16": 0.5,
      "random-gap-16": 0.1899780877865851,
      "quasi-gap-16": 0.09375,
      "grid-placed-30": 16,
      "grid-remainder-30": 14,
      "grid-distinct-30": 2,
      "random-distinct-30": 30,
      "quasi-distinct-30": 30,
      "grid-gap-30": 0.5,
      "random-gap-30": 0.17366685741581023,
      "quasi-gap-30": 0.09375
    },
    "three": {
      "grid-placed-16": 8,
      "grid-remainder-16": 8,
      "grid-distinct-16": 2,
      "random-distinct-16": 16,
      "quasi-distinct-16": 16,
      "grid-gap-16": 0.5,
      "random-gap-16": 0.1899780877865851,
      "quasi-gap-16": 0.09375,
      "grid-placed-30": 27,
      "grid-remainder-30": 3,
      "grid-distinct-30": 3,
      "random-distinct-30": 30,
      "quasi-distinct-30": 30,
      "grid-gap-30": 0.33333333333333337,
      "random-gap-30": 0.17366685741581023,
      "quasi-gap-30": 0.09375
    },
    "two": {
      "grid-placed-16": 16,
      "grid-remainder-16": 0,
      "grid-distinct-16": 4,
      "random-distinct-16": 16,
      "quasi-distinct-16": 16,
      "grid-gap-16": 0.25,
      "random-gap-16": 0.1899780877865851,
      "quasi-gap-16": 0.09375,
      "grid-placed-30": 25,
      "grid-remainder-30": 5,
      "grid-distinct-30": 5,
      "random-distinct-30": 30,
      "quasi-distinct-30": 30,
      "grid-gap-30": 0.20000000000000007,
      "random-gap-30": 0.17366685741581023,
      "quasi-gap-30": 0.09375
    },
    "seed": {
      "chosen": 1,
      "statistic": "uniform random search's largest learning-rate gap at 16 trials (four hyperparameters)",
      "n": 1000,
      "admitted": 1000,
      "median": 0.1899011208442971
    }
  }
};
/* END GENERATED table-cal */

  var METHODS = ['grid', 'random', 'quasi'];
  var ROLE = { grid: 'third', random: 'fourth', quasi: 'model' };
  var NAME = { grid: 'grid', random: 'random', quasi: 'quasi-random' };
  var LETTER = { grid: 'a', random: 'b', quasi: 'c' };
  var PREFIX = { grid: 'g', random: 'r', quasi: 'q' };
  var MAX_TRIALS = CAL.domains.d.x[1];            // 100: the end of panel (d)'s axis
  var LIMIT = MAX_TRIALS - 1;                      // the runtime's last step
  var COUNTS = [16, 30];                           // the trial counts the ledger records

  /* ---------- the model, without the DOM ---------- */

  function cov() { return TP.coverage; }
  function sig2(v) { return TP.fmt.byName('sig2')(v); }

  var cache = [];
  /** The trials of a (dims, seed): the 100 random and quasi-random points, the grid by k, and each
      method's projection onto the learning rate at every count from 1 to 100. Kept for 6 pairs. */
  function modelOf(dims, seed) {
    for (var i = 0; i < cache.length; i++) if (cache[i].dims === dims && cache[i].seed === seed) return cache[i];
    var C = cov();
    var m = { dims: dims, seed: seed, random: C.points('random', dims, MAX_TRIALS, seed), quasi: C.points('quasi', dims, MAX_TRIALS, seed), grids: {}, stats: [null] };
    for (var n = 1; n <= MAX_TRIALS; n++) {
      var g = C.grid(n, dims), gp = gridOf(m, g.k);
      var pg = C.project(gp, 0), pr = C.project(m.random.slice(0, n), 0), pq = C.project(m.quasi.slice(0, n), 0);
      m.stats.push({
        trials: n, k: g.k, placed: g.count, remainder: n - g.count,
        grid: { distinct: pg.distinct, gap: pg.gap }, random: { distinct: pr.distinct, gap: pr.gap }, quasi: { distinct: pq.distinct, gap: pq.gap }
      });
    }
    cache.push(m);
    if (cache.length > 6) cache.shift();
    return m;
  }
  /** The full grid of k points per axis in the model's dims. */
  function gridOf(m, k) {
    if (!m.grids[k]) m.grids[k] = cov().points('grid', m.dims, Math.pow(k, m.dims));
    return m.grids[k];
  }
  /** The trials a method has placed at n trials: the grid's k^d, or the first n of the others. */
  function pointsOf(m, method, n) {
    if (method === 'grid') return gridOf(m, m.stats[n].k);
    return m[method].slice(0, n);
  }
  /** The record row of n trials: plain numbers. */
  function rowOf(m, n) {
    var s = m.stats[n];
    return {
      trials: n, gridK: s.k, gridPlaced: s.placed, gridRemainder: s.remainder,
      gridDistinct: s.grid.distinct, randomDistinct: s.random.distinct, quasiDistinct: s.quasi.distinct,
      gridGap: s.grid.gap, randomGap: s.random.gap, quasiGap: s.quasi.gap
    };
  }

  /** The readout (FP F5.1): the grid's placed trials, the distinct learning rates of all three
      strips, and the three largest gaps (the lead's ruling on the page 5 reads, Batch 4). */
  function readoutText(m, n, phone) {
    var s = m.stats[n];
    if (phone) return 'At ' + n + ' trial' + (n === 1 ? '' : 's') + ' the grid tests ' + s.grid.distinct + ' learning rates, random search ' +
      s.random.distinct + ' and quasi-random ' + s.quasi.distinct + ' (largest gaps ' + sig2(s.grid.gap) + ', ' + sig2(s.random.gap) + ', ' + sig2(s.quasi.gap) + ').';
    return 'At ' + n + ' trial' + (n === 1 ? '' : 's') + ' the grid places ' + s.placed + ' and tests ' + s.grid.distinct +
      ' learning rates, random search ' + s.random.distinct + ' and quasi-random ' + s.quasi.distinct + ', with largest gaps ' +
      sig2(s.grid.gap) + ', ' + sig2(s.random.gap) + ' and ' + sig2(s.quasi.gap) + '.';
  }

  /** The named quantities (plan WO-I5.1): the ledger's at 16 and 30 trials for the current dims and
      seed, whatever the cursor; the cursor's own; and the seed sweep's, from CAL. */
  function quantitiesOf(m, n) {
    var q = {};
    COUNTS.forEach(function (c) {
      var s = m.stats[c];
      q['grid-placed-' + c] = s.placed;
      q['grid-remainder-' + c] = s.remainder;
      q['grid-distinct-' + c] = s.grid.distinct;
      q['random-distinct-' + c] = s.random.distinct;
      q['quasi-distinct-' + c] = s.quasi.distinct;
      q['grid-gap-' + c] = s.grid.gap;
      q['random-gap-' + c] = s.random.gap;
      q['quasi-gap-' + c] = s.quasi.gap;
    });
    var s = m.stats[n];
    q.dims = m.dims;
    q.trials = n;
    q['grid-k'] = s.k;
    q['grid-placed'] = s.placed;
    q['grid-remainder'] = s.remainder;
    METHODS.forEach(function (k) {
      q[k + '-distinct'] = s[k].distinct;
      q[k + '-gap'] = s[k].gap;
    });
    var sq = (CAL.quantities && CAL.quantities.seed) || {};
    Object.keys(sq).forEach(function (name) { if (q[name] === undefined) q[name] = sq[name]; });
    return q;
  }

  TP.models = TP.models || {};
  TP.models.coverageRun = { modelOf: modelOf, pointsOf: pointsOf, rowOf: rowOf, readout: readoutText, quantities: quantitiesOf, MAX_TRIALS: MAX_TRIALS };

  /* ---------- drawing ---------- */

  var doc = global.document;
  if (!doc) return;
  function C() { return TP.chart; }
  /** The phone layout, below 640 px (DS §3.5), as chart.js reads it. */
  var phoneQuery = null;
  function phone() {
    if (!phoneQuery && global.matchMedia) phoneQuery = global.matchMedia('(max-width: 639px)');
    return !!(phoneQuery && phoneQuery.matches);
  }
  var f3 = function (v) { return TP.fmt.byName('fixed3')(v); };
  var trialsText = function (n) { return TP.fmt.int(n) + ' trial' + (n === 1 ? '' : 's'); };

  /* The grid's first column holds (a)'s y axis, and (a) spans it and the first strategy column, so
     that the three frames have one width (fig-coverage.css sets --cov-yaxis and --cov-gap). */
  var gridCache = { phone: null, v: null };
  function gridVars(fig) {
    var ph = phone();
    if (gridCache.phone !== ph || !gridCache.v) {
      var cs = global.getComputedStyle(fig.panels);
      gridCache = { phone: ph, v: { y: parseFloat(cs.getPropertyValue('--cov-yaxis')) || 0, gap: parseFloat(cs.getPropertyValue('--cov-gap')) || 0 } };
    }
    return gridCache.v;
  }
  /* The weight-decay strip in the frame's right margin: its gap from the frame and its width. */
  function wdStrip(phone) { return phone ? { gap: 3, w: 7, pad: 2 } : { gap: 6, w: 10, pad: 4 }; }
  function innerLeft(phone) { return phone ? 3 : 6; }
  /* The strip names of the phone layout stand in the strips' left margin. */
  var NAME_MARGIN = 88;

  function scatterOpts(fig, method) {
    var first = method === 'grid';
    return {
      letter: '(' + LETTER[method] + ')', key: LETTER[method], describe: 'weight decay against learning rate',
      xDomain: CAL.domains[LETTER[method]].x, yDomain: CAL.domains[LETTER[method]].y,
      xTicks: [0, 0.5, 1], xFormat: function () { return ''; },
      yTicks: [0, 1], yFormat: function (v) { return String(v); },
      yLabel: first ? 'weight decay' : '', inner: !first, grid: 'none',
      plotAspect: function (w, phone) { return phone ? 1 : 0.46; },
      margin: function (w, phone) {
        var s = wdStrip(phone), g = gridVars(fig);
        return { t: phone ? 8 : 8, b: phone ? 3 : 4, r: s.gap + s.w + s.pad, l: (first ? g.y + g.gap : 0) + innerLeft(phone) };
      }
    };
  }
  function stripOpts(fig, method) {
    var first = method === 'grid', last = method === 'quasi';
    return {
      key: LETTER[method] + '-lr', describe: '(' + LETTER[method] + ') ' + NAME[method] + ' trials projected onto the learning rate',
      xDomain: CAL.domains[LETTER[method]].x, yDomain: [0, 1],
      xTicks: [0, 0.5, 1], xFormat: function (v) { return (phone() && !last) || v === 0.5 ? '' : String(v); },
      yTicks: 'none', grid: 'none',
      xLabel: function (p) { return !p.phone || last ? 'learning rate' : ''; },
      aspect: function (w, phone) {
        var plot = phone ? 14 : 18, m = this.margin(w, phone);
        return (plot + m.t + m.b) / Math.max(w, 1);
      },
      margin: function (w, phone) {
        if (phone) return { t: 2, b: last ? 36 : 3, r: 8, l: NAME_MARGIN };
        var s = wdStrip(false), g = gridVars(fig);
        return { t: 4, b: 36, r: s.gap + s.w + s.pad, l: (first ? g.y + g.gap : 0) + innerLeft(false) };
      }
    };
  }
  function recordOpts(fig) {
    var d = CAL.domains.d;
    return {
      letter: '(d)', key: 'd', describe: 'largest learning-rate gap against the number of trials',
      xDomain: [d.x[0] - 1, d.x[1] - 1], yDomain: d.y,
      xTicks: [0, 19, 39, 59, 79, 99], xFormat: function (v) { return TP.fmt.int(v + 1); },
      yTicks: [0, 0.5, 1], yFormat: function (v) { return String(v); },
      xLabel: 'trials', yLabel: function (p) { return p.phone ? 'gap' : 'largest gap'; },
      aspect: function (w, phone) { return (phone ? 100 : 128) / Math.max(w, 1); },
      margin: function (w, phone) {
        var g = gridVars(fig), s = wdStrip(phone);
        return { t: 10, b: 40, r: s.gap + s.w + s.pad, l: phone ? 44 : g.y + g.gap + innerLeft(phone) };
      }
    };
  }

  /** Draw a strategy's frame: its trials, and the weight-decay strip in the right margin. While the
      run plays (o.fast) each strip is one path; at rest every tick is its own keyed line, which
      C.link highlights with the trial. */
  function drawScatter(p, method, pts, o) {
    var role = ROLE[method], pre = PREFIX[method];
    var key = function (q, i) { return pre + (i + 1); };
    var mk = p.phone ? { role: role, series: method, key: key, fill: 'filled', shape: 'circle', size: 4 } : { role: role, series: method, key: key };
    C().markers(p, pts, function (q) { return q[0]; }, function (q) { return q[1]; }, mk);
    var s = wdStrip(p.phone), X0 = p.width + s.gap, X1 = X0 + s.w;
    /* the strip's axis: a structure line along its inner edge */
    p.layers.marks.append('path').attr('class', 'structure').attr('d', 'M' + X0.toFixed(2) + ',0V' + p.height.toFixed(2));
    ticks(p, pts.map(function (q) { return p.y(q[1]); }), 'y', X0, X1, role, method + '-wd', o.fast ? null : function (i) { return key(pts[i], i); });
  }
  function noteOf(method, n, s, phone) {
    if (phone) return NAME[method];
    /* the grid prints the trials it cannot use (FP F5.1 "Running") */
    if (method === 'grid') return 'grid, ' + TP.fmt.int(s.placed) + ' of ' + TP.fmt.int(n) + ' placed' + (s.remainder ? ', ' + TP.fmt.int(s.remainder) + ' unused' : '');
    return NAME[method] + ', ' + trialsText(n);
  }
  /** Draw a strategy's learning-rate strip: one tick per trial, keyed as in its frame. */
  function drawStrip(p, method, pts, o) {
    var role = ROLE[method], pre = PREFIX[method];
    ticks(p, pts.map(function (q) { return p.x(q[0]); }), 'x', 0, p.height, role, method + '-lr', o.fast ? null : function (i) { return pre + (i + 1); });
    if (p.phone) {
      /* the strip's name, in its left margin (the row is full width, away from its frame) */
      p.layers.marks.append('text').attr('class', 'strip-name').attr('x', -8).attr('y', p.height / 2)
        .attr('text-anchor', 'end').attr('dominant-baseline', 'central').text(NAME[method]);
    }
  }
  /** A strip's ticks at plot px positions `at`, across [a, b] of the other axis: 1.5 px in the
      role's token (DS §4.1, stems). With keyOf, each tick is a keyed C.line; without it, one path. */
  function ticks(p, at, axis, a, b, role, series, keyOf) {
    var px = function (v, w) { return axis === 'x' ? [v, w] : [w, v]; };
    if (!keyOf) {
      var d = '';
      at.forEach(function (v) { var u = px(v, a), w = px(v, b); d += 'M' + u[0].toFixed(2) + ',' + u[1].toFixed(2) + 'L' + w[0].toFixed(2) + ',' + w[1].toFixed(2); });
      p.layers.marks.append('path').attr('class', 'stem r-' + role).attr('d', d || 'M0,0');
      return;
    }
    at.forEach(function (v, i) {
      var u = px(v, a), w = px(v, b);
      C().line(p, [[p.x.invert(u[0]), p.y.invert(u[1])], [p.x.invert(w[0]), p.y.invert(w[1])]], function (r) { return r[0]; }, function (r) { return r[1]; },
        { role: role, series: series, key: keyOf(i), weight: 1.5, layer: p.layers.marks, obstacle: false });
    });
  }

  /** Draw the record: each method's largest gap up to the cursor, the rest ahead in the trail tone,
      the cursor, and the traces' labels. */
  function drawRecord(p, rows, t, ctx) {
    var up = rows.filter(function (r) { return r && r.t <= t; }), ahead = rows.filter(function (r) { return r && r.t >= t; });
    var items = [];
    var xOf = function (r) { return r.t; };
    METHODS.forEach(function (k) {
      var yOf = function (r) { return r[k + 'Gap']; };
      if (ahead.length > 1) C().line(p, ahead, xOf, yOf, { role: ROLE[k], series: k + '-ahead', dash: 'trail' });
      if (up.length > 1) C().line(p, up, xOf, yOf, { role: ROLE[k], series: k });
      if (up.length) C().markers(p, up, xOf, yOf, { role: ROLE[k], series: k, thin: 24 });
      var last = up[up.length - 1];
      var feature = up.length > 1 ? { type: 'line', of: k } : last ? { type: 'point', x: last.t, y: last[k + 'Gap'], r: 5 } : null;
      if (feature) items.push({ id: k, text: NAME[k], role: ROLE[k], series: k, feature: feature, phone: { header: true }, captionNames: true, keySentence: k !== 'random' });
    });
    C().level(p, 'x', t, { role: 'reader', text: TP.fmt.int(t + 1), line: true, series: 'cursor' });
    C().place(p, items, { hold: !!(ctx && ctx.hold) });
  }

  /* ---------- the figure ---------- */

  function init(element) {
    var P = null, shown = {}, drawn = {}, linked = false;
    function build(fig) {
      P = {};
      METHODS.forEach(function (k) {
        P[k] = C().panel(fig.panels, scatterOpts(fig, k));
        P[k + 'Lr'] = C().panel(fig.panels, stripOpts(fig, k));
      });
      P.d = C().panel(fig.panels, recordOpts(fig));
    }
    var fig = TP.fig(element, {
      kind: 'running',
      seed: CAL.seed,
      params: {
        dims: {
          type: 'number', default: CAL.defaults.dims, domain: [2, 4], snap: [2, 3, 4],
          change: 'restart', ghost: false, control: 'segment', dock: true,
          label: 'Hyperparameters', labels: { 2: '2', 3: '3', 4: '4' }
        }
      },
      /* Page 4 (2026-11 revision): no preset buttons. The guided tour sets dims and the cursor
         through data-params and data-t, and the ledger settings the prose names ("two", "three")
         are named states, which add no control. */
      states: { three: { dims: CAL.states.three.dims }, two: { dims: CAL.presets.two.dims } },
      docked: ['draw', 'reset'],
      draw: function (state, ctx) {
        if (!P) build(ctx.fig);
        var run = ctx.run || null;
        if (!state) {
          METHODS.forEach(function (k) { P[k].update(function () {}); P[k + 'Lr'].update(function () {}); });
          P.d.update(function () {});
          return;
        }
        var m = modelOf(state.dims, state.seed), n = state.trials, st = m.stats[n];
        /* A strategy's frame and strip are drawn again when its trials change, and at rest when
           they were last drawn in the fast mode of play; the grid's often stay the same from one
           step to the next, and only its header changes. A frame drawn at rest keeps its keyed
           ticks through play, which look the same as the fast mode's one path. */
        var fast = !!(ctx.playing || ctx.transient);
        METHODS.forEach(function (k) {
          var pts = pointsOf(m, k, n), sig = [state.dims, state.seed, pts.length].join('|');
          shown[k] = pts;
          var was = drawn[k];
          if (!was || was.sig !== sig || (was.fast && !fast)) {
            drawn[k] = { sig: sig, fast: fast };
            P[k].update(function (p) { drawScatter(p, k, pts, { fast: fast }); });
            P[k + 'Lr'].update(function (p) { drawStrip(p, k, pts, { fast: fast }); });
          }
          P[k].setNote(noteOf(k, n, st, phone()));
        });
        P.d.update(function (p) { drawRecord(p, ctx.rows || [], state.t, ctx); });
        if (run && !linked) {
          linked = true;
          METHODS.forEach(function (k) {
            C().pointHover(P[k], {
              by: 'trial', label: 'Reading of (' + LETTER[k] + ') by trial',
              points: function () {
                return (shown[k] || []).map(function (q, i) {
                  return {
                    x: q[0], y: q[1], key: PREFIX[k] + (i + 1),
                    head: NAME[k] + ', trial ' + (i + 1) + ' of ' + (shown[k] || []).length,
                    rows: [{ value: f3(q[0]), label: 'learning rate', role: ROLE[k] }, { value: f3(q[1]), label: 'weight decay', role: ROLE[k] }]
                  };
                });
              }
            });
            C().link([P[k], P[k + 'Lr']], { key: function (value, point) { return point ? point.key : null; } });
          });
          var h = run.recordHandlers();
          C().hover(P.d, {
            xValues: function () { var v = []; for (var i = 0; i <= run.frontier(); i++) v.push(i); return v; },
            by: 'trials', format: function (v) { return trialsText(v + 1); }, tick: function (v) { return TP.fmt.int(v + 1); },
            series: METHODS.map(function (k) {
              return { label: NAME[k] + ' gap', role: ROLE[k], fmt: sig2, y: function (v) { var r = run.rows()[v]; return r ? r[k + 'Gap'] : null; } };
            }),
            press: h.press, onRead: h.onRead
          });
        }
      },
      readout: function (state, ctx) { return readoutText(modelOf(state.dims, state.seed), state.trials, !!(ctx && ctx.phone)); },
      table: function (state) {
        var m = modelOf(state.dims, state.seed), n = state.trials, st = m.stats[n], rows = [];
        var g = pointsOf(m, 'grid', n), r = pointsOf(m, 'random', n), q = pointsOf(m, 'quasi', n);
        for (var i = 0; i < n; i++) {
          rows.push({
            trial: i + 1,
            gridLr: g[i] ? g[i][0] : null, gridWd: g[i] ? g[i][1] : null,
            randomLr: r[i][0], randomWd: r[i][1], quasiLr: q[i][0], quasiWd: q[i][1]
          });
        }
        var fmtOr = function (v) { return v == null ? 'not placed' : f3(v); };
        return {
          columns: [
            { key: 'trial', label: 'Trial', format: TP.fmt.int },
            { key: 'gridLr', label: 'Grid, learning rate', format: fmtOr },
            { key: 'gridWd', label: 'Grid, weight decay', format: fmtOr },
            { key: 'randomLr', label: 'Random, learning rate', format: f3 },
            { key: 'randomWd', label: 'Random, weight decay', format: f3 },
            { key: 'quasiLr', label: 'Quasi-random, learning rate', format: f3 },
            { key: 'quasiWd', label: 'Quasi-random, weight decay', format: f3 }
          ],
          rows: rows,
          caption: 'The ' + trialsText(n) + ' of each method on the unit axes, with ' + state.dims + ' hyperparameters and seed ' + state.seed +
            '. The grid places ' + st.placed + ' (k = ' + st.k + ' values per hyperparameter) and cannot use the other ' + st.remainder +
            '. Distinct learning rates: grid ' + st.grid.distinct + ', random ' + st.random.distinct + ', quasi-random ' + st.quasi.distinct +
            '. Largest learning-rate gaps: grid ' + sig2(st.grid.gap) + ', random ' + sig2(st.random.gap) + ', quasi-random ' + sig2(st.quasi.gap) + '.'
        };
      },
      quantities: function (state) { return quantitiesOf(modelOf(state.dims, state.seed), state.trials); }
    });
    TP.run(fig, {
      init: function (params) { return { t: 0, trials: 1, dims: params.dims, seed: params.seed }; },
      advance: function (s) { s.t += 1; s.trials += 1; return s; },
      record: function (s) { return rowOf(modelOf(s.dims, s.seed), s.trials); },
      steps: CAL.defaults.t, limit: LIMIT, pace: 'linear', duration: 6000,
      unit: 'trial', recordPanel: 'd', reset: 'show',
      counter: function (t) { return trialsText(t + 1) + ' of ' + TP.fmt.int(LIMIT + 1); }
    });
  }

  doc.addEventListener('tp:ready', function () {
    var el = doc.getElementById('fig-coverage');
    if (el && TP.fig && TP.run && TP.chart && TP.coverage && TP.halton && TP.prng) init(el);
  });
})(typeof window !== 'undefined' ? window : globalThis);
