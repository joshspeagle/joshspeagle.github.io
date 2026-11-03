/*
 * f5-2-best-of-k.js: figure F5.2, the best of K trials (#fig-best-of-k), on page 5 #trials.
 *
 * Design: notes/revamp/figure-plan.md (FP) F5.2 and notes/revamp/implementation-plan.md WO-F5.2
 * (§6.10), with review/synthesis.md R8 and R12, on the figure contract of site.js (TP.fig) and the
 * runtime of runtime.js (TP.run).
 *
 * The model is TP.bestOfK (site/js/lib/bestofk.js): the pool of 100 Toy S trials over the ranges
 * that calibration C2 fitted to Playbook Figure 3, and drawStep(pool, rng), which draws one study
 * of K trials with replacement for each K of 6, 10, 20 and 50 and returns each study's best. One
 * runtime step is one draw of the four studies (R12), with the runtime's generator for
 * TP.prng.deriveSeed(seed, t), which TP.bestOfK.bests uses too, so the calibration script
 * (tests/calibration/fig-best-of-k.calibrate.js) measures the draws this figure shows. `shown`
 * chooses which of the four distributions are drawn and changes nothing in the run (change
 * 'redraw', DS §7.6). The K = 50 distribution is computed from the first draw and shows when its
 * toggle is pressed, the reveal of the task's prediction.
 *
 * The state at step t holds the seed, t draws (n), the best of every study so far for each K
 * (b[k], in draw order) and the last draw's studies (last). The record row of step t holds the
 * four bests of draw t and the pool index of each best trial.
 *
 * Panel (a), "validation error against learning rate", is the pool as an axis plot: trials as 4-px
 * dots in context grey, the study of the smallest shown K at the cursor as a set in model blue with its
 * best ringed, and the infeasible trials as crosses at the top edge (blue when the study drew them,
 * grey otherwise, DS §8.1). Panel (b), "best validation error against K", has one column for each
 * K. A shown K draws a stack of 4-px dots, one per draw, binned on 4-px rows of y and placed side
 * by side from the column's centre, with the cased, unfilled quartile box over it (DS §4.6), and
 * beside it the retrain spread as a data-red error bar of +/-0.001 around the median (WO-F5.2).
 * Where a bin holds more dots than the column holds at 4.5-px spacing, the column's spacing shrinks
 * so that its widest bin fits, and the dots overlap (work-order exception 2 in the report).
 *
 * Work-order exceptions (notes/revamp/reports/fig-best-of-k.md):
 *   1. Panel (b)'s y axis is CAL.domains.b.y, whose top B_TOP the calibration sets below the
 *      largest best (tests/calibration/fig-best-of-k.calibrate.js). On the full range the box at
 *      K = 20 is 3 px tall and the bracket 1.4 px at 1440 x 790. B_TOP holds the upper quartile
 *      at K = 6 of every seed from 1 to 1,000 (the calibration's check). Bests above it stand on
 *      the top edge under an arrowhead, with the largest named, DS §9 rule 3.
 *   2. The stack's spacing shrinks where a bin overflows its column (above).
 *   3. The spec gives no recordPanel. The runtime's record press maps the record panel's x axis to
 *      steps, and (b)'s x axis is K. The counter stands in (b)'s header, written from ctx.counter,
 *      and a press or Enter on a dot of (b) sets the cursor to that draw; hovering a dot shows its
 *      study in (a) while the run is paused.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

/* BEGIN GENERATED table-cal */
// From tests/calibration/out/fig-best-of-k.json by npm run generate (tests/lib/write-generated.js).
var CAL = {
  "defaults": {"shown": [6, 20]},
  "presets": {"fifty": {"shown": [6, 20, 50]}},
  "states": {},
  "seed": 104,
  "uRange": [-5, -1.25],
  "vRange": [-5, -3],
  "bracket": 0.001,
  "domains": {
    "a": {"x": [-5, -1.25], "y": [0.22, 0.8], "yFeasibleMax": 0.634},
    "b": {"y": [0.225, 0.29], "yMax": 0.5387, "allBestsFeasible": true}
  },
  "tables": {},
  "quantities": {
    "model": {
      "bracket": 0.001,
      "pool-size": 100,
      "ks": "6, 10, 20 and 50",
      "limit": 1000,
      "inside-width": 0.002,
      "pool-lr-lo": 0.00001,
      "pool-lr-hi": 0.056234132519034905,
      "pool-wd-lo": 0.00001,
      "pool-wd-hi": 0.001,
      "mean-iqr-6": 0.017460863239658574,
      "mean-iqr-10": 0.009864686851531657,
      "mean-iqr-20": 0.004606643649771525,
      "mean-iqr-50": 0.0020424565040125468,
      "inside-50-share": 0.522,
      "reversal-200": 0.076,
      "reversal-1000": 0.066,
      "p-lowest-50": 0.39499393286246365,
      "reversal-pool": 0.073,
      "b-top": 0.29
    },
    "default": {
      "draws": 200,
      "iqr-6": 0.022299219599438258,
      "iqr-10": 0.009180184312543666,
      "iqr-20": 0.004436798757650295,
      "iqr-50": 0.0018580807486509865,
      "pool-infeasible": 6,
      "pool-best": 0.2304951080095776
    },
    "seed": {
      "chosen": 104,
      "statistic": "IQR of the best of 50 over 2,000 draws; admitted: IQRs of the best of 6 and of 20 after 200 draws within 25% of Figure 3's 0.0200 and 0.0039",
      "n": 300,
      "admitted": 113,
      "median": 0.0018580807486509865
    }
  }
};
/* END GENERATED table-cal */

  var BK = TP.bestOfK;
  var KS = BK ? Array.from(BK.KS) : [6, 10, 20, 50];
  var KEYS = KS.map(String);                          // the members of `shown`
  var STEPS = CAL.quantities['default'].draws;        // autoplay's draws (200)
  var LIMIT = 1000;                                   // WO-F5.2 "limit: 1000"
  var BRACKET = CAL.bracket;                          // +/-0.001
  var Y_B = CAL.domains.b.y;                          // exception 1: the calibration's top
  var B_TOP = Y_B[1];
  var TOY_CAP = TP.toyS ? TP.toyS.yInfeasible : 0.8;
  /* Page 4 (2026-11 revision): the default shows the Playbook figure's range, 6 to 20 trials, with
     10 between; 50 is a toggle. The ledger quantities cover every K whatever is shown. */
  var DEFAULT_SHOWN = ['6', '10', '20'];

  /* ---------- the model, without the DOM ---------- */

  var poolCache = [];
  /** The pool of 100 trials for a seed, kept for the 8 seeds used last. */
  function poolOf(seed) {
    for (var i = 0; i < poolCache.length; i++) if (poolCache[i].seed === seed) return poolCache[i].pool;
    var pool = BK.pool(seed);
    poolCache.push({ seed: seed, pool: pool });
    if (poolCache.length > 8) poolCache.shift();
    return pool;
  }
  function kIndex(K) { return KS.indexOf(+K); }

  function initState(seed) { return { n: 0, seed: seed, b: KS.map(function () { return []; }), last: null }; }
  /** One step: one study for each K, drawn with the step's generator. Changes s in place. */
  function advanceState(s, rng) {
    var d = BK.drawStep(poolOf(s.seed), rng);
    s.n += 1;
    d.forEach(function (st, k) { s.b[k].push(st.best); });
    s.last = d.map(function (st) { return { K: st.K, indices: st.indices, best: st.best, bestIndex: st.bestIndex }; });
    return s;
  }
  /** The record row of step t: the four bests of draw t and each best trial's pool index. */
  function recordOf(s) {
    var row = {};
    KS.forEach(function (K, k) {
      var st = s.last ? s.last[k] : null;
      row['b' + K] = st ? st.best : null;
      row['i' + K] = st ? st.bestIndex : null;
    });
    return row;
  }
  /** The quartile box and interquartile range of the bests of K after the state's draws. */
  /* The box of the last list and length asked for each K is kept: a frame of play asks for it in
     (b), the readout and the reading points, and a list only grows by push while the run plays. */
  var boxMemo = {};
  function boxOf(s, K) {
    var v = s.b[kIndex(K)];
    if (!v || !v.length) return null;
    var m = boxMemo[K];
    if (m && m.v === v && m.n === v.length && m.first === v[0] && m.last === v[v.length - 1]) return m.bx;
    var bx = BK.box(v);
    bx.iqr = bx.q75 - bx.q25;
    boxMemo[K] = { v: v, n: v.length, first: v[0], last: v[v.length - 1], bx: bx };
    return bx;
  }

  var fmt = TP.fmt || { int: String, byName: function () { return String; } };
  function by(name) { return function (v) { return TP.fmt.byName(name)(v); }; }
  var sig2 = by('sig2'), f4 = by('fixed4'), f3 = by('fixed3');
  function lrText(u) { return TP.fmt.exp10(u); }
  /** "a", "a and b", "a, b and c" */
  function series(list) {
    if (list.length < 2) return list.join('');
    return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  }
  function shownKs(values) {
    var set = (values && values.shown) || KEYS;
    return KS.filter(function (K) { return set.indexOf(String(K)) >= 0; });
  }

  /** The readout (FP F5.2), for the K values shown. */
  /* Each shown K's interquartile range beside the retrain bracket's width, 2 BRACKET (0.002). The
     readout gives no inside-or-outside verdict (the lead's ruling on the page 5 reads, Batch 4). */
  function readoutText(s, shown) {
    var br = 'the retrain bracket\'s width of ' + sig2(2 * BRACKET);
    if (!s || !s.n) return 'No study has been simulated yet. The interquartile ranges will stand beside ' + br + '.';
    var n = fmt.int(s.n) + (s.n === 1 ? ' study' : ' studies');
    var iq = shown.map(function (K) { return sig2(boxOf(s, K).iqr); });
    if (shown.length === 1) return 'After ' + n + ' the best of ' + shown[0] + ' trials spans an interquartile range of ' + iq[0] + ', beside ' + br + '.';
    if (shown.length === 2) return 'After ' + n + ' the best of ' + shown[0] + ' trials spans an interquartile range of ' + iq[0] + ' and the best of ' + shown[1] + ' spans ' + iq[1] + ', beside ' + br + '.';
    return 'After ' + n + ' the interquartile ranges of the best of ' + series(shown.map(String)) + ' trials are ' + series(iq) + ', beside ' + br + '.';
  }

  /** The named quantities of a state (plan WO-I5.1): the draws', the pool's and the model's. */
  function quantitiesOf(s) {
    var q = {}, pool = poolOf(s.seed);
    q.draws = s.n;
    KS.forEach(function (K) {
      var bx = boxOf(s, K);
      q['iqr-' + K] = bx ? bx.iqr : null;
      q['median-' + K] = bx ? bx.median : null;
      q['q25-' + K] = bx ? bx.q25 : null;
      q['q75-' + K] = bx ? bx.q75 : null;
    });
    q['pool-infeasible'] = pool.filter(function (t) { return !t.feasible; }).length;
    q['pool-best'] = BK.best(pool);
    q['b-top'] = B_TOP;                  // (b)'s y-axis top, CAL.domains.b.y
    var cq = CAL.quantities || {};
    ['model', 'seed'].forEach(function (setting) {
      var m = cq[setting] || {};
      Object.keys(m).forEach(function (name) { if (q[name] === undefined) q[name] = m[name]; });
    });
    return q;
  }

  TP.models = TP.models || {};
  TP.models.bestOfKFigure = {
    KS: KS, STEPS: STEPS, LIMIT: LIMIT, B_TOP: B_TOP, poolOf: poolOf, init: initState, advance: advanceState,
    record: recordOf, box: boxOf, readout: readoutText, quantities: quantitiesOf
  };

  /* ---------- drawing ---------- */

  var doc = global.document;
  if (!doc) return;
  var SVGNS = 'http://www.w3.org/2000/svg';
  function C() { return TP.chart; }
  function svg(tag, cls, attrs) {
    var n = doc.createElementNS(SVGNS, tag);
    if (cls) n.setAttribute('class', cls);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function r1(v) { return Math.round(v * 10) / 10; }
  function trialKey(i) { return 'p' + (i + 1); }

  /* ---------- panel (a), the pool ---------- */

  var U = CAL.domains.a.x;                       // log10 learning rate of the pool
  function panelAOpts() {
    return {
      letter: '(a)', describe: 'validation error against learning rate',
      xLog: 10, xDomain: [Math.pow(10, U[0]), Math.pow(10, U[1])], xTicks: 'pow10',
      xFormat: function (v) { return lrText(Math.round(Math.log10(v))); },
      yDomain: CAL.domains.a.y, yTicks: [0.3, 0.4, 0.5, 0.6, 0.7, 0.8], yFormat: function (v) { return v.toFixed(1); },
      xLabel: 'learning rate', yLabel: 'validation error',
      margin: { t: 14, r: 16, b: 42, l: 54 },
      aspect: function (w, phone) { return phone ? 0.5 : 0.56; }
    };
  }
  function lrOf(t) { return Math.pow(10, t.u); }

  /**
   * Draw the pool with the study of K from state s (none at step 0): the rest of the pool in
   * context grey, the study's trials in model blue as a set, its best ringed, and the crosses.
   * Returns the study's distinct pool indices.
   */
  function drawA(p, s, K) {
    var pool = poolOf(s.seed), st = s.last && K ? s.last[kIndex(K)] : null, drawn = {};
    if (st) st.indices.forEach(function (i) { drawn[i] = true; });
    var rest = [], restBad = [], set = [], setBad = [];
    pool.forEach(function (t, i) {
      var row = { i: i, t: t };
      if (drawn[i]) (t.feasible ? set : setBad).push(row);
      else (t.feasible ? rest : restBad).push(row);
    });
    var x = function (d) { return lrOf(d.t); }, y = function (d) { return d.t.y; };
    /* the rest of the pool as 4-px dots and the study as 8-px markers, so that the set differs
       from the pool by size as well as hue (DS §2.3 rule 4) */
    C().dots(p, rest, x, y, { role: 'context', series: 'pool', r: 2 });
    C().cross(p, restBad, x, function () { return null; }, { role: 'context', series: 'pool', edge: 'top' });
    if (set.length) C().markers(p, set, x, y, { role: 'model', series: 'study', key: function (d) { return trialKey(d.i); } });
    if (setBad.length) C().cross(p, setBad, x, function () { return null; }, { role: 'model', series: 'study', edge: 'top', key: function (d) { return trialKey(d.i); } });
    if (st && st.bestIndex >= 0) {
      var b = pool[st.bestIndex];
      C().ring(p, lrOf(b), b.y, { role: 'model', series: 'study', key: trialKey(st.bestIndex) });
    }
    return Object.keys(drawn).map(Number);
  }

  /* ---------- panel (b), the distributions ---------- */

  function panelBOpts() {
    return {
      letter: '(b)', describe: 'best validation error against K',
      xDomain: [-0.5, KS.length - 0.5], xTicks: KS.map(function (K, k) { return k; }),
      xFormat: function (k) { return String(KS[k]); },
      yDomain: Y_B, yTicks: [0.23, 0.24, 0.25, 0.26, 0.27, 0.28, 0.29], yFormat: function (v) { return v.toFixed(2); },
      xLabel: 'trials per study, K', yLabel: 'best validation error',
      margin: { t: 14, r: 12, b: 42, l: 60 },
      aspect: function (w, phone) { return phone ? 0.5 : 0.56; }
    };
  }

  /** The column geometry of K's slot in plot px: the stack's centre (on the tick) and half width,
      the box's width and the error bar's x, to the right of the stack. */
  function slotOf(p, k) {
    var W = p.x(1) - p.x(0), c = p.x(k);
    return { W: W, cx: c, H: Math.max(6, 0.3 * W - 2), bw: Math.min(40, 0.44 * W), ex: c + 0.4 * W };
  }

  /**
   * The stack of one column: each best on a 4-px row of y (a best above the top on the top edge),
   * placed alternately left and right of the centre in draw order, at a spacing of 4.5 px or less
   * so that the widest row fits the half width H. Returns {pts: [{X, Y, t, v}], s, above, max,
   * d (the dots' path), rows ({Y: [leftmost X, rightmost X]})}.
   *
   * The layout of each K is kept and extended: a frame of play adds one best to each list, and a
   * dot's row and place depend only on the bests before it and on the spacing. The whole column is
   * laid out again when the geometry, the list or the spacing changes, or the list is shorter.
   */
  var stacks = {};
  function stackOf(p, vals, n, cx, H, K) {
    var lo = Y_B[0], hi = Y_B[1];
    var geo = [p.width, p.height, cx, H].join('|'), c = stacks[K];
    var same = c && c.geo === geo && c.vals === vals && n >= c.n &&
      (c.n === 0 || (vals[0] === c.pts[0].v && vals[c.n - 1] === c.pts[c.n - 1].v));
    if (!same) c = stacks[K] = { geo: geo, vals: vals, n: 0, bins: [], counts: {}, maxN: 0, above: 0, max: -Infinity, s: null, seen: {}, pts: [], d: '', rows: {} };
    for (var i = c.n; i < n; i++) {
      var v = vals[i];
      if (v > hi) { c.above++; if (v > c.max) c.max = v; }
      var bin = Math.round(p.y(Math.min(Math.max(v, lo), hi)) / 4);
      c.bins[i] = bin;
      c.counts[bin] = (c.counts[bin] || 0) + 1;
      if (c.counts[bin] > c.maxN) c.maxN = c.counts[bin];
    }
    var half = Math.ceil((c.maxN - 1) / 2), sp = half > 0 ? Math.min(4.5, H / half) : 4.5;
    var from = c.n;
    if (sp !== c.s) { c.s = sp; c.seen = {}; c.pts = []; c.d = ''; c.rows = {}; from = 0; }
    var parts = [];
    for (var j = from; j < n; j++) {
      var b = c.bins[j], m = c.seen[b] = (c.seen[b] || 0) + 1, jj = m - 1;
      var off = (jj % 2 ? 1 : -1) * Math.ceil(jj / 2) * sp;
      var q = { X: cx + off, Y: Math.min(p.height, b * 4), t: j + 1, v: vals[j] };
      c.pts[j] = q;
      parts.push('M' + r1(q.X - 2) + ',' + r1(q.Y) + 'a2,2 0 1,0 4,0a2,2 0 1,0 -4,0');
      var rw = c.rows[q.Y] || (c.rows[q.Y] = [q.X, q.X]);
      if (q.X < rw[0]) rw[0] = q.X;
      if (q.X > rw[1]) rw[1] = q.X;
    }
    c.d += parts.join('');
    c.n = n;
    return { pts: c.pts, s: sp, above: c.above, max: c.max, d: c.d, rows: c.rows };
  }

  /* The nodes of each column, made once and put back into the cleared marks layer on every
     render, with an attribute written only when its value changes. */
  var colNodes = {};
  function put(node, attrs) {
    var a = node.__tp || (node.__tp = {});
    for (var k in attrs) {
      var v = String(attrs[k]);
      if (a[k] !== v) { node.setAttribute(k, v); a[k] = v; }
    }
    return node;
  }
  function nodesOf(K) {
    if (colNodes[K]) return colNodes[K];
    var n = colNodes[K] = {
      grp: svg('g', 'bestofk-col r-model', { 'data-k': K }),
      stack: svg('path', 'cloud stack'),
      box: svg('g', 'bestofk-box', { 'data-key': 'box-' + K }),
      casing: svg('rect', 'casing box'), over: svg('rect', 'box over'),
      casingMedian: svg('line', 'casing median'), median: svg('line', 'median'),
      bar: svg('g', 'bestofk-bar r-data', { 'data-key': 'bar-' + K, 'data-half': BRACKET }),
      stem: svg('line', 'stem'), capTop: svg('line', 'stem'), capBot: svg('line', 'stem'),
      arrow: svg('path', 'arrowhead')
    };
    return n;
  }

  /**
   * Draw (b) for the draws of state s: for each shown K the stack, the box over it, the error bar
   * of the retrain spread, and an arrowhead with the largest best where bests leave the top.
   * mark = {K, t}: the draw whose dot takes the ring, the study (a) shows. Returns the reading
   * points and the label items. While the run plays, the reading points are the boxes alone, so
   * that a frame of play allocates no point per dot; the settle that ends play adds the dots.
   */
  function drawB(p, s, shown, mark, playing) {
    var layer = p.layers.marks.node(), items = [], points = [], lastBar = null;
    /* the bar the label names: the first whose right-hand slot is empty, else the last */
    var named = shown.filter(function (K) { return shown.indexOf(KS[kIndex(K) + 1]) < 0; })[0];
    var n = s ? s.n : 0;
    shown.forEach(function (K) {
      var k = kIndex(K), g = slotOf(p, k), vals = s.b[k];
      if (!n) return;
      var st = stackOf(p, vals, n, g.cx, g.H, K), bx = boxOf(s, K), N = nodesOf(K);
      var grp = N.grp;
      layer.appendChild(grp);
      /* the dots, one path; each 4-px row of the stack is one obstacle for the placer, a segment
         from its leftmost to its rightmost dot, 4 px wide, which keeps the placer's index small */
      grp.appendChild(put(N.stack, { d: st.d, 'data-n': st.pts.length, 'data-spacing': st.s.toFixed(2) }));
      Object.keys(st.rows).forEach(function (Yk) {
        var rw = st.rows[Yk], Yv = +Yk;
        C().obstacle(p, [[rw[0] - 2, Yv], [rw[1] + 2, Yv]], { kind: 'rival', type: 'segment', width: 4, series: 'K' + K });
      });
      /* the quartile box over the stack, with its casing (DS §4.1, §4.6) */
      var Y = function (v) { return p.y(Math.min(Math.max(v, Y_B[0]), Y_B[1])); };
      var y3 = Y(bx.q75), y1 = Y(bx.q25), ym = Y(bx.median), bh = Math.max(1, y1 - y3), x0 = g.cx - g.bw / 2;
      var box = put(N.box, { 'data-q25': bx.q25, 'data-median': bx.median, 'data-q75': bx.q75 });
      var rect = { x: r1(x0), y: r1(y3), width: r1(g.bw), height: r1(bh) };
      var mid = { x1: r1(x0), x2: r1(x0 + g.bw), y1: r1(ym), y2: r1(ym) };
      box.appendChild(put(N.casing, rect));
      box.appendChild(put(N.over, rect));
      box.appendChild(put(N.casingMedian, mid));
      box.appendChild(put(N.median, mid));
      grp.appendChild(box);
      C().obstacle(p, { x0: x0, y0: y3, x1: x0 + g.bw, y1: y3 + bh }, { kind: 'rival', type: 'rect', width: 1.5, series: 'K' + K });
      /* the retrain spread: a data-red error bar of +/-BRACKET around the median */
      var eTop = Y(bx.median + BRACKET), eBot = Y(bx.median - BRACKET);
      var bar = put(N.bar, { 'data-center': bx.median });
      bar.appendChild(put(N.stem, { x1: r1(g.ex), x2: r1(g.ex), y1: r1(eTop), y2: r1(eBot) }));
      bar.appendChild(put(N.capTop, { x1: r1(g.ex - 3), x2: r1(g.ex + 3), y1: r1(eTop), y2: r1(eTop) }));
      bar.appendChild(put(N.capBot, { x1: r1(g.ex - 3), x2: r1(g.ex + 3), y1: r1(eBot), y2: r1(eBot) }));
      layer.appendChild(bar);
      C().obstacle(p, { x0: g.ex - 3, y0: eTop, x1: g.ex + 3, y1: eBot }, { kind: 'rival', type: 'rect', width: 1.5, series: 'retrain' });
      if (K === named) lastBar = { x: p.x.invert(g.ex), y: bx.median, r: Math.max(3, (eBot - eTop) / 2) + 0.75 };
      /* bests above the top: an arrowhead over the column and the largest named */
      if (st.above) {
        grp.appendChild(put(N.arrow, { d: 'M' + r1(g.cx - 3.5) + ',-2L' + r1(g.cx) + ',-8L' + r1(g.cx + 3.5) + ',-2Z', 'data-above': st.above }));
        items.push({ id: 'above-' + K, text: 'to ' + f3(st.max), role: 'model', series: 'K' + K, tone: 'role',
          feature: { type: 'point', x: p.x.invert(g.cx), y: Y_B[1], r: 8 }, phone: p.phone ? { text: 'to ' + f3(st.max) } : { header: true }, captionNames: true });
      }
      /* the ring on the dot of the draw (a) shows */
      if (mark && mark.K === K && mark.t >= 1 && mark.t <= n) {
        var q = st.pts[mark.t - 1];
        C().ring(p, p.x.invert(q.X), p.y.invert(q.Y), { role: 'model', series: 'K' + K, key: 'd' + mark.t + '-' + K });
      }
      /* reading points: the box first, then each draw's dot */
      points.push({ x: p.x.invert(g.cx), y: bx.median, key: 'box-' + K, K: K,
        head: 'Best of ' + K + ' trials, ' + fmt.int(n) + (n === 1 ? ' study' : ' studies'),
        rows: [
          { value: f4(bx.q75), label: '75th percentile', role: 'model' },
          { value: f4(bx.median), label: 'median', role: 'model' },
          { value: f4(bx.q25), label: '25th percentile', role: 'model' },
          { value: sig2(bx.iqr), label: 'interquartile range', role: 'model' },
          { value: '±' + sig2(BRACKET), label: 'retrain spread', role: 'data' }
        ] });
      /* one point per dot; plain toFixed and String, since the reader counts the points on every
         frame of play (fixed4 of a value below 1 and int of a count below 1,000 print the same) */
      var head = ' of ' + K + ' trials';
      if (!playing) st.pts.forEach(function (q2) {
        points.push({ x: p.x.invert(q2.X), y: p.y.invert(q2.Y), key: 'd' + q2.t + '-' + K, K: K, t: q2.t,
          head: 'Study ' + (q2.t < 1000 ? String(q2.t) : fmt.int(q2.t)) + head,
          rows: [{ value: q2.v.toFixed(4), label: 'best validation error', role: 'model' }] });
      });
    });
    /* DS §5.6: where the full form finds no position, the phone layout tries "retrain spread" and
       may drop the label, which the caption names; from 640 px the label moves to (b)'s header */
    if (lastBar) {
      items.push({ id: 'retrain', text: ['retrain spread,', '±0.1%', '(the Playbook\'s estimate)'], role: 'data', series: 'retrain', tone: 'role',
        feature: { type: 'point', x: lastBar.x, y: lastBar.y, r: lastBar.r },
        phone: p.phone ? { text: 'retrain spread' } : { header: true }, captionNames: true, keySentence: true });
    }
    return { points: points, items: items };
  }

  /* ---------- the figure ---------- */

  function init(element) {
    var pa = null, pb = null, hoverSet = false, bPoints = [], hoverK = null, aPoints = { seed: null, list: [] };
    /* what panel (a) draws, read by its draw function, so that a render chart.js starts itself (a
       width change) draws the current study */
    var aNow = { state: null, K: null, hold: false, playing: false }, aFullSeed = null;
    function drawAFull(p) {
      if (!aNow.state) return;
      drawA(p, aNow.state, aNow.K);
      C().place(p, [], { hold: aNow.hold });
    }
    /* for the browser check: the reading points of (b), in the order its reader steps through */
    TP.models.bestOfKFigure.readingPoints = function () { return bPoints; };
    var fig = TP.fig(element, {
      kind: 'running',
      seed: CAL.seed,
      params: {
        shown: {
          type: 'set', default: DEFAULT_SHOWN, domain: KEYS.slice(), min: 1, max: KEYS.length,
          change: 'redraw', ghost: false, control: 'toggles', dock: true, label: 'Studies of K trials shown'
        },
        seed: { label: 'New pool' }
      },
      /* Page 4 (2026-11 revision): no preset button. The tour's last step shows K = 50 through
         data-params; "fifty" stays as a named state for the ledger. */
      states: { fifty: { shown: CAL.presets.fifty.shown.map(String) } },
      docked: ['draw', 'reset'],
      draw: function (state, ctx) {
        if (!pa) {
          pa = C().panel(ctx.fig.panels, panelAOpts());
          pb = C().panel(ctx.fig.panels, panelBOpts());
        }
        var run = ctx.run || null;
        var shown = shownKs(ctx.values);
        /* while a hover on (b) previews a draw, (b) keeps the cursor's draws and rings the
           previewed dot, and (a) shows that draw's study for the K hovered */
        var preview = ctx.preview != null && run;
        var cur = preview ? run.state() : state;
        var aK = preview && hoverK != null && shown.indexOf(hoverK) >= 0 ? hoverK : shown[0];
        var playing = !!ctx.playing;
        if (state) pa.setNote(poolOf(state.seed).filter(function (t) { return !t.feasible; }).length + ' of ' + BK.POOL_SIZE + ' diverged');
        if (ctx.counter) pb.setNote(ctx.counter);
        /* (a): a frame of play changes only the study's marks, so it redraws them alone
           (p.redrawMarks) without the axes, the label placement (a holds no labels) and the
           reading refresh of a full render; the pool, the axes and the reading stay as the last
           full render left them. Every other draw, and the first frame of play after a new pool,
           renders in full. */
        aNow.state = state; aNow.K = aK; aNow.hold = ctx.hold; aNow.playing = playing;
        if (playing && state && aFullSeed === state.seed) {
          pa.redrawMarks(function (p) { drawA(p, state, aK); });
        } else {
          pa.update(drawAFull);
          aFullSeed = state ? state.seed : null;
        }
        pb.update(function (p) {
          if (!cur) return;
          var r = drawB(p, cur, shown, state && state.n ? { K: aK, t: state.n } : null, playing);
          bPoints = r.points;
          C().place(p, r.items, { hold: ctx.hold });
        });
        if (run && !hoverSet) {
          hoverSet = true;
          C().pointHover(pa, {
            by: 'trial', label: 'Reading of (a) by trial',
            points: function () {
              var st = run.state();
              if (!st) return [];
              if (aPoints.seed === st.seed) return aPoints.list;
              aPoints.seed = st.seed;
              return (aPoints.list = poolOf(st.seed).map(function (t, i) {
                return {
                  x: lrOf(t), y: t.feasible ? t.y : CAL.domains.a.y[1], key: trialKey(i), head: 'Trial ' + (i + 1) + ' of ' + BK.POOL_SIZE,
                  rows: [
                    { value: lrText(t.u), label: 'learning rate', role: 'context' },
                    { value: lrText(t.v), label: 'weight decay', role: 'context' },
                    t.feasible ? { value: f4(t.y), label: 'validation error', role: 'context' } : { value: 'diverged', label: 'drawn at the top edge', role: 'context' }
                  ]
                };
              }));
            }
          });
          C().pointHover(pb, {
            by: 'study', label: 'Reading of (b) by study',
            points: function () { return bPoints; },
            onRead: function (pt, i, info) {
              if (info && info.source === 'program') return;
              if (run.playing()) return;
              if (pt && pt.t != null) { hoverK = pt.K; run.preview(pt.t); }
              else { hoverK = pt ? pt.K : null; run.preview(null); }
            },
            select: function (i, pt) { if (pt && pt.t != null) { hoverK = pt.K; run.scrub(pt.t); } }
          });
        }
      },
      readout: function (state, ctx) {
        var s = ctx && ctx.preview != null && ctx.run ? ctx.run.state() : state;
        return readoutText(s, shownKs(ctx && ctx.values));
      },
      table: function (state, ctx) {
        var shown = shownKs(ctx && ctx.values), rows = [], pool = poolOf(state.seed);
        var boxes = {};
        KS.forEach(function (K) { boxes[K] = boxOf(state, K); });
        [['q25', '25th percentile'], ['median', 'Median'], ['q75', '75th percentile'], ['iqr', 'Interquartile range']].forEach(function (d) {
          var row = { what: d[1] };
          KS.forEach(function (K) { row['k' + K] = boxes[K] ? boxes[K][d[0]] : null; });
          rows.push(row);
        });
        for (var t = 1; t <= state.n; t++) {
          var row2 = { what: 'Study ' + t };
          KS.forEach(function (K, k) { row2['k' + K] = state.b[k][t - 1]; });
          rows.push(row2);
        }
        pool.forEach(function (tr, i) {
          rows.push({ what: 'Pool trial ' + (i + 1), lr: tr.u, wd: tr.v, err: tr.feasible ? tr.y : null });
        });
        var num = function (v) { return v == null ? '' : f4(v); };
        var cols = [{ key: 'what', label: 'Row' }];
        KS.forEach(function (K) {
          cols.push({ key: 'k' + K, label: 'Best of ' + K + (shown.indexOf(K) >= 0 ? '' : ' (hidden)'), format: function (v, r) { return r.what === 'Interquartile range' && v != null ? sig2(v) : num(v); } });
        });
        cols.push({ key: 'lr', label: 'Learning rate', format: function (v) { return v == null ? '' : lrText(v); } });
        cols.push({ key: 'wd', label: 'Weight decay', format: function (v) { return v == null ? '' : lrText(v); } });
        cols.push({ key: 'err', label: 'Validation error', format: function (v, r) { return r.lr == null ? '' : v == null ? 'diverged' : f4(v); } });
        return {
          columns: cols, rows: rows,
          caption: 'The quartiles of the best of each K after ' + fmt.int(state.n) + ' simulated studies, the best of each study, and the pool of ' +
            BK.POOL_SIZE + ' trials at seed ' + state.seed + '. The retrain spread is ±' + sig2(BRACKET) + ' around each median.'
        };
      },
      quantities: function (state) { return quantitiesOf(state); }
    });
    TP.run(fig, {
      init: function (params) { return initState(params.seed); },
      advance: function (s, params, rng) { return advanceState(s, rng); },
      record: function (s) { return recordOf(s); },
      steps: STEPS, limit: LIMIT, pace: 'ease', easeSteps: 3, duration: 6000,
      unit: 'study', reset: 'show'
    });
  }

  doc.addEventListener('tp:ready', function () {
    var el = doc.getElementById('fig-best-of-k');
    if (el && TP.fig && TP.run && TP.chart && TP.bestOfK && TP.toyS) init(el);
  });
})(typeof window !== 'undefined' ? window : globalThis);
