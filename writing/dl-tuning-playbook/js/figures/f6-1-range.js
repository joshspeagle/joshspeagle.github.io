/*
 * f6-1-range.js: figure F6.1, the range window (fig-range), on page 6 #boundaries.
 *
 * Work order: notes/revamp/implementation-plan.md §6.11 (WO-F6.1), with §6.0. Entry:
 * notes/revamp/figure-plan.md F6.1 and review/synthesis.md R9. Design: notes/revamp/design-system.md
 * §3.4, §3.5, §4, §5, §6, §8 and §9. A fixed-frame figure with a draggable window and no dock.
 *
 * The model is TP.boundary (site/js/lib/boundary.js) on Toy S: study({lo, hi, n, seed, uDiv}) places
 * the trials in the learning-rate window, best3 picks the three lowest feasible trials, edgeCounts
 * counts them in the site's edge zones (the outer CAL.edge of the window at each end), and check
 * gives the infeasible count and the gap from the best trial to the first cross. This is the
 * computation of tests/calibration/fig-range.calibrate.js, so the quantities equal the ledger's rows
 * at the default and at the preset "the instability variant". Trial k sits at Halton point k in
 * every window, with its noise tied to k, so a move of either bound moves every trial continuously
 * (R9, DS §9 rule 6).
 *
 * The panel: x log10 learning rate over CAL.domains.a.x, drawn as a linear axis in decades with
 * ticks named 10^k; y validation error over CAL.domains.a.y. The search range is a reader window
 * (two reader edges, the axis bar, no fill) with a handle on each edge and each bound named on the
 * x axis in the reader token. The three best trials are model-blue filled circles, marked as a set
 * by the bracket "3 best" on the x axis over their span; the other feasible trials are context grey;
 * infeasible trials are model-blue crosses at the top edge, counted in the panel header. The edge
 * zones are two context-grey ticks on the x axis, one labelled "edge zone, 10% (ours)" (phone "edge
 * zone"). With `landscape`, the lowest noise-free error at each learning rate (CAL.tables.envelope,
 * stopped at the divergence threshold) is a context-grey line labelled "lowest error, noise-free".
 *
 * The parameters: lo and hi (handles, transition), trials (segment in more, transition), landscape
 * (preset alone, cut), u-div (preset alone, cut) and the seed ("Draw again", cut). No parameter
 * leaves a ghost. Presets "show the whole curve" (key whole-curve) and "the instability variant"
 * (key instability) from CAL.presets.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};

  /* BEGIN GENERATED table-cal */
  // From tests/calibration/out/fig-range.json by npm run generate (tests/lib/write-generated.js).
  var CAL = {
    "defaults": {"lo": -5, "hi": -3.3, "trials": 50, "landscape": false},
    "presets": {"whole-curve": {"landscape": true}, "instability": {"lo": -5, "hi": -2, "uDiv": -3.25}},
    "states": {},
    "seed": 58,
    "edge": 0.1,
    "domains": {"a": {"x": [-5, -0.5], "y": [0.2, 0.8], "yFeasibleMax": 0.7703}},
    "tables": {
      "envelope": [
        {"u": -5, "y": 0.58129, "v": -3.446},
        {"u": -4.95, "y": 0.56738, "v": -3.467},
        {"u": -4.9, "y": 0.55375, "v": -3.488},
        {"u": -4.85, "y": 0.5404, "v": -3.509},
        {"u": -4.8, "y": 0.52733, "v": -3.53},
        {"u": -4.75, "y": 0.51454, "v": -3.552},
        {"u": -4.7, "y": 0.50204, "v": -3.573},
        {"u": -4.65, "y": 0.48981, "v": -3.594},
        {"u": -4.6, "y": 0.47787, "v": -3.615},
        {"u": -4.55, "y": 0.46621, "v": -3.636},
        {"u": -4.5, "y": 0.45482, "v": -3.657},
        {"u": -4.45, "y": 0.44372, "v": -3.678},
        {"u": -4.4, "y": 0.4329, "v": -3.699},
        {"u": -4.35, "y": 0.42237, "v": -3.72},
        {"u": -4.3, "y": 0.41211, "v": -3.741},
        {"u": -4.25, "y": 0.40213, "v": -3.762},
        {"u": -4.2, "y": 0.39244, "v": -3.783},
        {"u": -4.15, "y": 0.38302, "v": -3.804},
        {"u": -4.1, "y": 0.37389, "v": -3.826},
        {"u": -4.05, "y": 0.36504, "v": -3.847},
        {"u": -4, "y": 0.35646, "v": -3.868},
        {"u": -3.95, "y": 0.34817, "v": -3.889},
        {"u": -3.9, "y": 0.34016, "v": -3.91},
        {"u": -3.85, "y": 0.33244, "v": -3.931},
        {"u": -3.8, "y": 0.32499, "v": -3.952},
        {"u": -3.75, "y": 0.31782, "v": -3.973},
        {"u": -3.7, "y": 0.31094, "v": -3.994},
        {"u": -3.65, "y": 0.30433, "v": -4.015},
        {"u": -3.6, "y": 0.29801, "v": -4.036},
        {"u": -3.55, "y": 0.29197, "v": -4.057},
        {"u": -3.5, "y": 0.28621, "v": -4.078},
        {"u": -3.45, "y": 0.28073, "v": -4.1},
        {"u": -3.4, "y": 0.27553, "v": -4.121},
        {"u": -3.35, "y": 0.27061, "v": -4.142},
        {"u": -3.3, "y": 0.26597, "v": -4.163},
        {"u": -3.25, "y": 0.26162, "v": -4.184},
        {"u": -3.2, "y": 0.25754, "v": -4.205},
        {"u": -3.15, "y": 0.25375, "v": -4.226},
        {"u": -3.1, "y": 0.25023, "v": -4.247},
        {"u": -3.05, "y": 0.247, "v": -4.268},
        {"u": -3, "y": 0.24405, "v": -4.289},
        {"u": -2.95, "y": 0.24138, "v": -4.31},
        {"u": -2.9, "y": 0.23899, "v": -4.331},
        {"u": -2.85, "y": 0.23689, "v": -4.352},
        {"u": -2.8, "y": 0.23506, "v": -4.374},
        {"u": -2.75, "y": 0.23351, "v": -4.395},
        {"u": -2.7, "y": 0.23225, "v": -4.416},
        {"u": -2.65, "y": 0.23126, "v": -4.437},
        {"u": -2.6, "y": 0.23056, "v": -4.458},
        {"u": -2.55, "y": 0.23014, "v": -4.479},
        {"u": -2.5, "y": 0.23, "v": -4.5},
        {"u": -2.45, "y": 0.23014, "v": -4.517},
        {"u": -2.4, "y": 0.23057, "v": -4.534},
        {"u": -2.35, "y": 0.23128, "v": -4.551},
        {"u": -2.3, "y": 0.23228, "v": -4.568},
        {"u": -2.25, "y": 0.23356, "v": -4.586},
        {"u": -2.2, "y": 0.23512, "v": -4.603},
        {"u": -2.15, "y": 0.23697, "v": -4.62},
        {"u": -2.1, "y": 0.23911, "v": -4.638},
        {"u": -2.05, "y": 0.24152, "v": -4.655},
        {"u": -2, "y": 0.24423, "v": -4.673},
        {"u": -1.95, "y": 0.24721, "v": -4.691},
        {"u": -1.9, "y": 0.25048, "v": -4.709},
        {"u": -1.85, "y": 0.25404, "v": -4.728},
        {"u": -1.8, "y": 0.25787, "v": -4.746},
        {"u": -1.75, "y": 0.26199, "v": -4.765},
        {"u": -1.7, "y": 0.2664, "v": -4.784},
        {"u": -1.65, "y": 0.27108, "v": -4.803},
        {"u": -1.6, "y": 0.27605, "v": -4.823},
        {"u": -1.55, "y": 0.2813, "v": -4.843},
        {"u": -1.5, "y": 0.28683, "v": -4.864}
      ]
    },
    "quantities": {
      "model": {"edge": 0.1, "u-div": 0.03162277660168379},
      "default": {
        "lo": 0.00001,
        "hi": 0.0005011872336272725,
        "trials": 50,
        "upper-count": 3,
        "lower-count": 0,
        "extension": 1.45,
        "leave-hi": 0.01412537544622754,
        "leave-lower-count": 0,
        "near-best": 5,
        "best-error": 0.275,
        "best-lr": 0.00042
      },
      "widened": {
        "lo": 0.00001,
        "hi": 0.1,
        "trials": 50,
        "upper-count": 0,
        "lower-count": 0,
        "infeasible-count": 6,
        "first-cross": 0.037,
        "near-best": 8,
        "best-error": 0.238,
        "best-lr": 0.0076
      },
      "sparse": {
        "lo": 0.00001,
        "hi": 0.1,
        "trials": 10,
        "infeasible-count": 1,
        "near-best": 2,
        "best-error": 0.244
      },
      "instability": {
        "lo": 0.00001,
        "hi": 0.01,
        "u-div": 0.0005623413251903491,
        "upper-count": 0,
        "lower-count": 0,
        "infeasible-count": 21,
        "gap": 0.1875,
        "first-cross": 0.00061,
        "near-best": 3,
        "best-error": 0.282
      },
      "seed": {
        "chosen": 58,
        "statistic": "the extension of the upper bound, in decades on the 0.05 snap, at which the three best leave the upper edge zone; admitted: all three best in the upper edge zone at the default",
        "n": 300,
        "admitted": 56,
        "median": 1.45
      }
    }
  };
  /* END GENERATED table-cal */

  var ID = 'fig-range';
  var SNAP = 0.05;          /* the handles' snap, in decades (WO-F6.1) */
  var MIN_WIDTH = 0.5;      /* the narrowest window, in decades (WO-F6.1) */
  var TRIALS = [10, 25, 50];
  var TICK = 16;
  var BRACKET_GAP = 8;      /* px from the lowest best trial's centre to the bracket, clear of its marker */            /* the edge-zone ticks' length in px */

  function pow10(e) { return Number.isInteger(e) ? Number('1e' + e) : Math.pow(10, e); }
  function snapU(x) { return +(Math.round(x / SNAP) * SNAP).toFixed(2); }
  var fmt = {
    lr: function (u) { return TP.fmt.exp10(u); },
    err: function (v) { return TP.fmt.byName('fixed3')(v); },
    int: function (v) { return TP.fmt.byName('int')(v); },
    pct: function (v) { return TP.fmt.byName('pct0')(v); },
    dec: function (v) { return TP.fmt.byName('fixed2')(v); }
  };
  function uDivDefault() { return TP.toyS.defaults.uDiv; }

  /* ============================== the model ============================== */

  var cache = {};
  function keyOf(o) { return [o.lo, o.hi, o.trials, o.uDiv, o.seed].join('|'); }
  /** The study at a setting {lo, hi, trials, uDiv, seed}, with its three best, edge counts and check. */
  function studyOf(o) {
    var k = keyOf(o);
    if (cache[k]) return cache[k];
    var B = TP.boundary;
    var trials = B.study({ lo: o.lo, hi: o.hi, n: o.trials, seed: o.seed, uDiv: o.uDiv });
    var best = B.best3(trials), counts = B.edgeCounts(best, o.lo, o.hi), check = B.check(trials, o.lo, o.hi);
    var out = { trials: trials, best: best, counts: counts, check: check };
    var keys = Object.keys(cache);
    if (keys.length > 400) cache = {};
    cache[k] = out;
    return out;
  }
  /* The first upper bound at or above o.hi, on the handle's snap, at which none of the three best lies
     in the upper edge zone, as the calibration's leave() finds it; null when none up to the axis's end. */
  var leaveCache = {};
  function leave(o) {
    var k = keyOf(o);
    if (k in leaveCache) return leaveCache[k];
    var end = CAL.domains.a.x[1], res = null;
    for (var j = 0; ; j++) {
      var hi = snapU(o.hi + SNAP * j);
      if (hi > end + 1e-9) break;
      var s = studyOf({ lo: o.lo, hi: hi, trials: o.trials, uDiv: o.uDiv, seed: o.seed });
      if (s.counts.upper === 0) { res = { hi: hi, lower: s.counts.lower }; break; }
    }
    leaveCache[k] = res;
    return res;
  }
  function settingOf(values) {
    return { lo: values.lo, hi: values.hi, trials: values.trials, uDiv: values['u-div'], seed: values.seed };
  }

  /** The derived state for the values. Every array of rows carries a key (DS §9). */
  function apply(values) {
    var o = settingOf(values), S = studyOf(o);
    var rank = {};
    S.best.forEach(function (t, k) { rank[t.i] = k + 1; });
    var rows = S.trials.map(function (t) {
      return { key: 't' + t.i, u: t.u, v: t.v, y: t.y, mark: !t.feasible ? 'cross' : rank[t.i] ? 'best' : 'rest', rank: String(rank[t.i] || '') };
    });
    var span = S.best.map(function (t) { return t.u; });
    var env = [];
    if (values.landscape) {
      (CAL.tables.envelope || []).forEach(function (r, j) {
        if (r.u <= o.uDiv + 1e-9) env.push({ key: 'e' + j, u: r.u, y: r.y });
      });
    }
    return {
      lo: o.lo, hi: o.hi, uDiv: o.uDiv, trials: o.trials, seed: o.seed,
      landscape: values.landscape ? 'yes' : 'no',
      upperEdge: S.counts.upperEdge, lowerEdge: S.counts.lowerEdge,
      upper: S.counts.upper, lower: S.counts.lower, nBest: String(S.best.length),
      bx0: span.length ? Math.min.apply(null, span) : o.lo, bx1: span.length ? Math.max.apply(null, span) : o.lo,
      by: S.best.length ? Math.min.apply(null, S.best.map(function (t) { return t.y; })) : CAL.domains.a.y[0],
      byTop: S.best.length ? Math.max.apply(null, S.best.map(function (t) { return t.y; })) : CAL.domains.a.y[0],
      nCross: String(S.check.nInfeasible),
      rows: rows, env: env
    };
  }

  /* ============================== the figure ============================== */

  var fig = null, pa = null, cur = null, curCtx = { hold: false };
  var zoneTick = 'lower';   /* the edge-zone tick that carries the label, chosen on settle */
  var bracketStand = 'below';   /* where the bracket "3 best" stands: 'below', 'above' or 'axis' */
  var STANDS = ['below', 'above', 'axis'];

  function build(f) {
    var dA = CAL.domains.a;
    pa = TP.chart.panel(f.panels, {
      key: 'a',
      describe: 'validation error against learning rate',
      xDomain: dA.x.slice(), yDomain: dA.y.slice(),
      xLabel: 'learning rate', yLabel: 'validation error',
      xTicks: function () { var out = []; for (var e = Math.ceil(dA.x[0]); e <= Math.floor(dA.x[1]); e++) out.push(e); return out; },
      xFormat: fmt.lr,
      /* no tick label at the frame's floor, where the lower bound's handle stands at the default */
      yTicks: function (dom, px) { return px < 160 ? [0.4, 0.6, 0.8] : [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]; },
      yFormat: function (v) { return TP.fmt.byName('fixed1')(v); },
      grid: 'y',
      aspect: function (w, phone) { return phone ? 0.84 : 0.56; },
      maxHeight: function (w, phone) { return phone ? 300 : 380; },
      margin: function (w, phone) { return phone ? { t: 10, r: 16, b: 44, l: 46 } : { t: 12, r: 24, b: 48, l: 56 }; }
    });
    pa.update(drawA);
  }

  function drawA(p) {
    var s = cur;
    if (!s) return;
    var C = TP.chart, ctx = curCtx;
    var xOf = function (r) { return r.u; }, yOf = function (r) { return r.y; };
    var dA = CAL.domains.a;

    /* the landscape: the lowest noise-free error at each learning rate, context grey */
    if (s.env && s.env.length > 1) C.line(p, s.env, xOf, yOf, { role: 'context', series: 'envelope', key: 'envelope' });

    /* the search range: a reader window with no fill, its bounds named on the axis */
    C.window(p, s.lo, s.hi, { kind: 'reader', id: 'range', handles: false });
    C.level(p, 'x', s.lo, { role: 'reader', text: fmt.lr(s.lo), series: 'lo', key: 'lo' });
    C.level(p, 'x', s.hi, { role: 'reader', text: fmt.lr(s.hi), series: 'hi', key: 'hi' });

    /* the site's edge zones: a context-grey tick on the x axis at each zone's inner end */
    var y0 = p.y.invert(p.height), y1 = p.y.invert(p.height - TICK);
    C.rug(p, [s.lowerEdge, s.upperEdge], { role: 'context', y0: y0, y1: y1, key: 'edge-zones' });

    /* the trials: the rest context grey, the three best model blue as a set, crosses at the top */
    var rest = s.rows.filter(function (r) { return r.mark === 'rest'; });
    var best = s.rows.filter(function (r) { return r.mark === 'best'; });
    var cross = s.rows.filter(function (r) { return r.mark === 'cross'; });
    C.markers(p, rest, xOf, yOf, { role: 'context', series: 'trials', key: function (r) { return r.key; } });
    C.markers(p, best, xOf, yOf, { role: 'model', series: 'best', key: function (r) { return r.key; } });
    var nCross = C.cross(p, cross, xOf, function () { return undefined; }, { role: 'model', series: 'crosses', edge: 'top', key: function (r) { return r.key; } });
    p.setNote(nCross ? fmt.int(nCross) + ' of ' + fmt.int(s.rows.length) + ' diverged' : '');

    /* the bracket "3 best" over the three best trials' span along x (R9, DS §5.10), named by its
       text. It stands where the placer admits its text, chosen on settle (settleLabels): just below
       the lowest of the three with its ticks turned up toward them, just above the highest with its
       ticks turned down, or on the x axis. On the axis alone, every position for the text lies
       within 1 h of the three markers at the default, which sit about 2.5 h above the axis (the
       report's work-order exception). */
    if (s.nBest === '3') {
      var stand = bracketStand, anchor = { x0: s.bx0, x1: s.bx1 };
      if (stand === 'below') anchor.y = s.by;
      else if (stand === 'above') anchor.y = s.byTop;
      C.annotation(p, {
        kind: 'bracket', id: 'best', text: '3 best', side: stand === 'axis' ? 'below' : stand, gap: BRACKET_GAP,
        anchor: anchor, names: 'range', phone: { header: true }, captionNames: true, keySentence: true
      });
    }

    /* the handles, one on each bound; each keeps the other bound at least MIN_WIDTH away */
    var lo = s.lo, hi = s.hi;
    C.handle(p, {
      id: 'lo', axis: 'x', value: lo, snap: SNAP, min: dA.x[0], max: snapU(hi - MIN_WIDTH),
      label: 'Lower bound of the learning-rate range', format: fmt.lr,
      onChange: function (v) { fig.set({ lo: v }, { transient: true }); },
      onSettle: function (v) { fig.set({ lo: v }); }
    });
    C.handle(p, {
      id: 'hi', axis: 'x', value: hi, snap: SNAP, min: snapU(lo + MIN_WIDTH), max: dA.x[1],
      label: 'Upper bound of the learning-rate range', format: fmt.lr,
      onChange: function (v) { fig.set({ hi: v }, { transient: true }); },
      onSettle: function (v) { fig.set({ hi: v }); }
    });

    /* the labels: the edge zone at one tick, and the landscape's line when drawn */
    var items = [];
    var tx = zoneTick === 'upper' ? s.upperEdge : s.lowerEdge;
    items.push({
      id: 'edge-zone', text: 'edge zone, ' + fmt.pct(CAL.edge), tone: 'ink', role: 'context', series: 'edge-zone',
      feature: { type: 'point', x: tx, y: p.y.invert(p.height - TICK), r: 1 },
      names: 'range', phone: { text: 'edge zone' }, captionNames: true
    });
    if (s.env && s.env.length > 1) {
      items.push({
        id: 'envelope', text: 'lowest error, noise-free', tone: 'ink', role: 'context', series: 'envelope',
        feature: { type: 'line', of: 'envelope' }, phone: { text: 'noise-free' }, captionNames: true
      });
    }
    C.place(p, items, ctx);
  }

  /* Two choices are made from scratch at every settle, so that they depend on the settled state
     alone (DS §5.2); a held draw keeps them. The bracket takes the first stand of STANDS at which the
     placer sets "3 best" in its full form, then the edge-zone label the first tick, lower then upper,
     at which the placer sets it in its full form (or its phone form in the phone layout). Where no
     choice succeeds, the first at which the label is drawn at all is kept. */
  function formOf(p, id) {
    var e = TP.chart.labelReport(p).filter(function (x) { return x.id === id; })[0];
    return e && !e.fault ? e.form : 'dropped';
  }
  function choose(p, id, list, set, good) {
    var fallback = null;
    for (var i = 0; i < list.length; i++) {
      set(list[i]);
      p.update();
      var f = formOf(p, id);
      if (good(f)) return;
      if (fallback == null && f !== 'dropped') fallback = list[i];
    }
    set(fallback == null ? list[0] : fallback);
    p.update();
  }
  function settleLabels(p) {
    var good = function (f) { return f === 'full' || (p.phone && f === 'phone'); };
    zoneTick = 'lower';
    if (cur && cur.nBest === '3') choose(p, 'annotation:best', STANDS, function (v) { bracketStand = v; }, function (f) { return f === 'full'; });
    choose(p, 'edge-zone', ['lower', 'upper'], function (v) { zoneTick = v; }, good);
  }

  function draw(state, ctx) {
    if (!pa) build(ctx.fig);
    cur = state;
    curCtx = ctx || { hold: false };
    pa.update();
    if (state && !curCtx.hold) settleLabels(pa);
  }

  /* ---------- readout, table, quantities ---------- */

  var WORDS = ['No', 'One', 'Two', 'All three'];
  var NEAR = 0.03;   /* the site's yardstick for "near the best", used in the readout alone */
  function nearBest(state) {
    var S = studyOf({ lo: state.lo, hi: state.hi, trials: state.trials, uDiv: state.uDiv, seed: state.seed });
    var f = S.trials.filter(function (t) { return t.feasible; });
    if (!f.length) return 0;
    var b = Math.min.apply(null, f.map(function (t) { return t.y; }));
    return f.filter(function (t) { return t.y <= b + NEAR + 1e-12; }).length;
  }
  function readout(state) {
    var k = state.upper, m = state.lower, n = +state.nBest, out;
    var nx = +state.nCross;
    if (n === 0) return 'None of the ' + fmt.int(state.trials) + ' trials trained successfully.';
    function lead(c) { return c === 3 ? 'All three best trials sit' : WORDS[c] + ' of the three best trials ' + (c === 1 ? 'sits' : 'sit'); }
    if (k > 0) out = lead(k) + ' in the upper edge zone, so a better learning rate may lie above the range.';
    else if (m > 0) out = lead(m) + ' in the lower edge zone, so a better learning rate may lie below the range.';
    else out = 'None of the three best trials sits in an edge zone.';
    out += ' ' + nearBest(state) + ' of the ' + fmt.int(state.trials) + ' trials ' + (nearBest(state) === 1 ? 'comes' : 'come') + ' within ' + NEAR + ' of the best error.';
    if (nx > 0) {
      var S = studyOf({ lo: state.lo, hi: state.hi, trials: state.trials, uDiv: state.uDiv, seed: state.seed });
      var firstX = Math.min.apply(null, S.trials.filter(function (t) { return !t.feasible; }).map(function (t) { return t.u; }));
      out += ' ' + fmt.int(nx) + ' of ' + fmt.int(state.trials) + ' trials diverged, the lowest at a learning rate of ' + fmt.lr(firstX) + '.';
    }
    return out;
  }

  function table(state) {
    var S = studyOf({ lo: state.lo, hi: state.hi, trials: state.trials, uDiv: state.uDiv, seed: state.seed }), rank = {};
    S.best.forEach(function (t, k) { rank[t.i] = k + 1; });
    return {
      columns: [
        { key: 'i', label: 'Trial', format: fmt.int },
        { key: 'lr', label: 'Learning rate', format: fmt.lr },
        { key: 'wd', label: 'Weight decay', format: fmt.lr },
        { key: 'y', label: 'Validation error', format: function (v, r) { return r.feasible ? fmt.err(v) : 'diverged'; } },
        { key: 'note', label: 'Marked' }
      ],
      rows: S.trials.map(function (t) {
        var notes = [];
        if (rank[t.i]) notes.push('best ' + rank[t.i] + ' of 3');
        if (t.u > S.counts.upperEdge) notes.push('upper edge zone');
        else if (t.u < S.counts.lowerEdge) notes.push('lower edge zone');
        if (!t.feasible) notes.push('infeasible, a cross at the top edge');
        return { i: t.i, lr: t.u, wd: t.v, y: t.y, feasible: t.feasible, note: notes.join('; ') };
      }),
      caption: 'The ' + fmt.int(state.trials) + ' trials of the study at seed ' + state.seed + ' in the learning-rate range from ' + fmt.lr(state.lo) +
        ' to ' + fmt.lr(state.hi) + ', each with its learning rate, weight decay and validation error, and the edge zones below ' +
        fmt.lr(S.counts.lowerEdge) + ' and above ' + fmt.lr(S.counts.upperEdge)
    };
  }

  function quantities(state) {
    var o = { lo: state.lo, hi: state.hi, trials: state.trials, uDiv: state.uDiv, seed: state.seed };
    var S = studyOf(o), L = leave(o);
    var q = {
      'upper-count': S.counts.upper, 'lower-count': S.counts.lower, 'best-count': S.best.length,
      extension: L ? +(L.hi - o.hi).toFixed(2) : null, 'leave-hi': L ? pow10(L.hi) : null, 'leave-lower-count': L ? L.lower : null,
      lo: pow10(o.lo), hi: pow10(o.hi), 'u-div': pow10(o.uDiv), trials: o.trials,
      'infeasible-count': S.check.nInfeasible, gap: S.check.gap, 'near-best': nearBest(state), 'best-error': S.best.length ? S.best[0].y : null, 'best-lr': S.best.length ? pow10(S.best[0].u) : null,
      'upper-edge': pow10(S.counts.upperEdge), 'lower-edge': pow10(S.counts.lowerEdge)
    };
    var fixed = CAL.quantities || {};
    ['model', 'seed'].forEach(function (setting) {
      var m = fixed[setting] || {};
      Object.keys(m).forEach(function (name) { if (!(name in q)) q[name] = m[name]; });
    });
    return q;
  }

  function init(element) {
    var dA = CAL.domains.a, D = CAL.defaults, P = CAL.presets;
    var inst = { key: 'instability', lo: P.instability.lo, hi: P.instability.hi, trials: D.trials, 'u-div': P.instability.uDiv };
    var uDivs = [P.instability.uDiv, uDivDefault()].sort(function (a, b) { return a - b; });
    fig = TP.fig(element, {
      kind: 'fixed',
      params: {
        lo: {
          type: 'number', default: D.lo, domain: [dA.x[0], snapU(dA.x[1] - MIN_WIDTH)], snap: SNAP, snapOrigin: 0,
          change: 'transition', ghost: false, label: 'Lower bound of the learning-rate range', control: 'handle', handle: 'a', format: fmt.lr
        },
        hi: {
          type: 'number', default: D.hi, snap: SNAP, snapOrigin: 0,
          domain: function (v) { return [snapU(Math.max(dA.x[0] + MIN_WIDTH, v.lo + MIN_WIDTH)), dA.x[1]]; },
          change: 'transition', ghost: false, label: 'Upper bound of the learning-rate range', control: 'handle', handle: 'a', format: fmt.lr
        },
        trials: {
          type: 'number', default: D.trials, domain: [TRIALS[0], TRIALS[TRIALS.length - 1]], snap: TRIALS.slice(),
          change: 'transition', ghost: false, label: 'Number of trials', control: 'none', format: fmt.int
        },
        landscape: {
          type: 'bool', default: D.landscape, change: 'cut', ghost: false, label: 'Show the noise-free curve', control: 'check'
        },
        'u-div': {
          type: 'number', default: uDivDefault(), domain: [uDivs[0], uDivs[1]], snap: uDivs,
          change: 'cut', ghost: false, label: 'Divergence threshold of Toy S', control: 'none', format: fmt.lr
        }
      },
      seed: CAL.seed,
      presets: {
        'range too narrow': { key: 'narrow', lo: D.lo, hi: D.hi, trials: D.trials, 'u-div': uDivDefault() },
        'range widened': { key: 'widened', lo: -5, hi: -1, trials: D.trials, 'u-div': uDivDefault() },
        'a stability limit': inst,
        'too few trials': { key: 'sparse', lo: -5, hi: -1, trials: 10, 'u-div': uDivDefault() }
      },
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
    if (el) init(el);
  });
})();
