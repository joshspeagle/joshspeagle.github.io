/*
 * f1-2-study.js: figure F1.2, the study and its axis plot (fig-study), and its recap
 * TP.recaps['F1.2:per-value'].
 *
 * Work order: notes/revamp/implementation-plan.md §6.2 (WO-F1.2), with §6.0 and §6.24 (recap R1).
 * Entry: notes/revamp/figure-plan.md F1.2. Design: notes/revamp/design-system.md §3.4, §3.5, §4,
 * §5, §6, §8 and §9. A fixed-frame figure with linked views.
 *
 * The model. TP.toyS.sampleStudy({n: 20, seed, uRange: CAL.uRange, vRange: CAL.vRange}) places the
 * trials and gives each its validation error, and TP.curves.trialCurve({value, seed, index}) gives
 * each trial's training curve, shifted so that its selected checkpoint equals the trial's value.
 * This is the computation of tests/calibration/fig-study.calibrate.js, so the figure's quantities
 * equal the ledger's rows at every setting the ledger records.
 *
 * The panels.
 *   (a) learning rate against weight decay, log axes: the 20 trials as filled markers on the
 *       model-blue ramp by best validation error, with the colour bar right of the frame, the best
 *       trial's ring, the direct labels "trial" and "search space" and the callout "study: 20
 *       trials" (phone form "study").
 *   (b) validation error against the chosen hyperparameter: the axis plot. Its x axis is drawn in
 *       fractions of the chosen range, so that a change of `axis` moves each point by key along one
 *       fixed axis (DS §9). The label "one point per trial, its best validation error" becomes the
 *       header note "one point per trial" in the phone layout.
 *   (c) validation error against step: the curve of the pointed trial, or of the committed trial,
 *       with its selected checkpoint ringed ("selected") and its last checkpoint open ("last"). Its y
 *       domain is fixed by the calibration over every curve from its third checkpoint on (Batch 2
 *       ruling), so a curve's first checkpoints may stand above the frame. Each of those is drawn as
 *       an arrowhead at the top edge (DS §9 rule 3), and the data table gives its value.
 *   The range ends are named on the axes (Batch 2 ruling): (b)'s x axis names both ends of the chosen
 *   range and carries the bracket "range" along the top of the frame, and on a desktop (a)'s y axis
 *   names the ends of the learning-rate range (its x axis already ticks both ends of the
 *   weight-decay range). In the phone layout (a)'s y axis keeps its decade ticks alone, for lack of
 *   margin, and (b) names the learning-rate range's ends.
 *   (a) and (b) are linked by C.link with the trial's key ("t1" to "t20"). Pointing at a trial in
 *   either sets (c) until the pointer leaves, and a press or Enter commits it as `trial`.
 *
 * The parameters: axis ('lr' | 'wd', transition, a segment in (b)'s header), trial (-1 for the
 * best trial, or 0 to 19, cut, no control: set by a press or Enter on a trial), seed (cut, "Draw
 * again"). No preset. The figure has no dock.
 *
 * 2026-11 review (post01): the four preset buttons were removed (the guided tour sets the same
 * values through data-params), and the three panels share one row from 900 px
 * (site/css/figures/fig-study.css), each at most 250 px tall.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};
  TP.recaps = TP.recaps || {};

  /* BEGIN GENERATED table-cal */
  // From tests/calibration/out/fig-study.json by npm run generate (tests/lib/write-generated.js).
  var CAL = {
    "defaults": {"axis": "lr", "trial": -1},
    "presets": {
      "axis-lr": {"axis": "lr", "trial": -1},
      "axis-wd": {"axis": "wd", "trial": -1},
      "trial-best": {"axis": "lr", "trial": 9},
      "trial-edge": {"axis": "lr", "trial": 4}
    },
    "states": {},
    "seed": 102,
    "uRange": [-4.5, -1.5],
    "vRange": [-7, -1],
    "domains": {
      "a": {"x": [-7, -1], "y": [-4.5, -1.5]},
      "b": {"xLr": [-4.5, -1.5], "xWd": [-7, -1], "y": [0.2, 0.65]},
      "c": {"x": [0, 20000], "y": [0.15, 0.7]},
      "colour": [0.2, 0.65]
    },
    "tables": {
      "defaultTrials": [
        {"i": 1, "u": -1.9495, "v": -5.1678, "y": 0.25073, "shift": 0.02983, "selectedStep": 8000},
        {"i": 2, "u": -2.6995, "v": -3.1678, "y": 0.26488, "shift": 0.04339, "selectedStep": 14000},
        {"i": 3, "u": -4.1995, "v": -5.8344, "y": 0.47582, "shift": 0.25836, "selectedStep": 7000},
        {"i": 4, "u": -3.0745, "v": -3.8344, "y": 0.25385, "shift": 0.04176, "selectedStep": 6000},
        {"i": 5, "u": -1.5745, "v": -1.8344, "y": 0.47636, "shift": 0.26097, "selectedStep": 8000},
        {"i": 6, "u": -2.3245, "v": -6.5011, "y": 0.27456, "shift": 0.0622, "selectedStep": 7000},
        {"i": 7, "u": -3.8245, "v": -4.5011, "y": 0.33514, "shift": 0.11626, "selectedStep": 9000},
        {"i": 8, "u": -3.262, "v": -2.5011, "y": 0.32253, "shift": 0.10951, "selectedStep": 6000},
        {"i": 9, "u": -1.762, "v": -6.7233, "y": 0.28519, "shift": 0.07071, "selectedStep": 8000},
        {"i": 10, "u": -2.512, "v": -4.7233, "y": 0.23221, "shift": 0.01452, "selectedStep": 11000},
        {"i": 11, "u": -4.012, "v": -2.7233, "y": 0.38669, "shift": 0.17214, "selectedStep": 8000},
        {"i": 12, "u": -2.887, "v": -5.39, "y": 0.26177, "shift": 0.0419, "selectedStep": 5000},
        {"i": 13, "u": -4.387, "v": -3.39, "y": 0.43234, "shift": 0.21419, "selectedStep": 11000},
        {"i": 14, "u": -2.137, "v": -1.39, "y": 0.46371, "shift": 0.24573, "selectedStep": 7000},
        {"i": 15, "u": -3.637, "v": -6.0566, "y": 0.37766, "shift": 0.1596, "selectedStep": 7000},
        {"i": 16, "u": -3.3558, "v": -4.0566, "y": 0.27332, "shift": 0.05468, "selectedStep": 7000},
        {"i": 17, "u": -1.8558, "v": -2.0566, "y": 0.41226, "shift": 0.19597, "selectedStep": 5000},
        {"i": 18, "u": -2.6058, "v": -6.9455, "y": 0.29184, "shift": 0.07352, "selectedStep": 5000},
        {"i": 19, "u": -4.1058, "v": -4.9455, "y": 0.40342, "shift": 0.18756, "selectedStep": 8000},
        {"i": 20, "u": -2.9808, "v": -2.9455, "y": 0.28281, "shift": 0.06571, "selectedStep": 8000}
      ]
    },
    "quantities": {
      "model": {
        "lr-lo": 0.000031622776601683795,
        "lr-hi": 0.03162277660168379,
        "wd-lo": 1e-7,
        "wd-hi": 0.1,
        "trials": 20,
        "sigma": 0.001,
        "cap": 0.8,
        "floor": 0.23,
        "curvature": 0.060000000000000026,
        "wd-star": 0.000031622776601683795,
        "edge-fraction": 0.1,
        "curve-tau": 1000,
        "curve-sigma": 0.005,
        "interval": 1000,
        "steps": 20000
      },
      "default": {
        "best-trial": 10,
        "best-value": 0.2322080457590508,
        "best-lr": 0.00307579449650304,
        "best-wd": 0.000018910091872859574,
        "best-step": 11000,
        "best-position": 0.662652438506484,
        "best-last-value": 0.24215790403331772,
        "best-gap": 0.00994985827426692
      },
      "seed": {
        "chosen": 102,
        "statistic": "the best trial's position within the learning-rate range, as a fraction of the range; admitted: outside the outer 10% at each end",
        "n": 300,
        "admitted": 300,
        "median": 0.6628830896224827
      }
    }
  };
  /* END GENERATED table-cal */

  var N = 20;
  var STEPS = 20000;
  var ID = 'fig-study';

  function pow10(e) { return Number.isInteger(e) ? Number('1e' + e) : Math.pow(10, e); }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  var fmt = {
    exp: function (v) { return TP.fmt.byName('exp10')(v); },
    err: function (v) { return TP.fmt.byName('fixed3')(v); },
    int: function (v) { return TP.fmt.byName('int')(v); },
    pct: function (v) { return TP.fmt.byName('pct0')(v); },
    decade: function (v) { return TP.fmt.exp10(Math.round(Math.log(v) / Math.LN10)); },
    step: function (v) { return v === 0 ? '0' : TP.fmt.int(v / 1000) + 'k'; }
  };

  /* ============================== the model ============================== */

  var studyCache = {};
  /** The study at a seed: the trials, the best trial and every trial's curve. Pure in the seed. */
  function study(seed) {
    var key = String(seed);
    if (studyCache[key]) return studyCache[key];
    var U = CAL.uRange, V = CAL.vRange;
    var raw = TP.toyS.sampleStudy({ n: N, seed: seed, uRange: U, vRange: V });
    var best = -1;
    var trials = raw.map(function (t, k) {
      if (t.feasible && (best < 0 || t.y < raw[best].y)) best = k;
      var c = TP.curves.trialCurve({ value: t.y, seed: seed, index: k });
      return {
        k: k, n: k + 1, u: t.u, v: t.v, y: t.y, feasible: t.feasible,
        fl: (t.u - U[0]) / (U[1] - U[0]), fw: (t.v - V[0]) / (V[1] - V[0]),
        curve: c
      };
    });
    var s = { seed: seed, trials: trials, best: best };
    var keys = Object.keys(studyCache);
    if (keys.length > 12) delete studyCache[keys[0]];
    studyCache[key] = s;
    return s;
  }

  /** The derived state for the values. Every array of rows carries a key (DS §9). */
  function apply(values) {
    var S = study(values.seed);
    var shown = values.trial >= 0 ? values.trial : S.best;
    return {
      seed: values.seed,
      axis: values.axis,
      axisNum: values.axis === 'wd' ? 1 : 0,
      trial: values.trial,
      best: S.best,
      shown: shown,
      rows: S.trials.map(function (t) {
        return { key: 't' + t.n, k: t.k, u: t.u, v: t.v, y: t.y, bx: values.axis === 'wd' ? t.fw : t.fl };
      })
    };
  }
  function trialOf(state, k) { return study(state.seed).trials[k]; }
  function selectedOf(t) { return t.curve.evals[t.curve.selectedIndex]; }
  function lastOf(t) { return t.curve.evals[t.curve.lastIndex]; }

  /* ============================== the figure ============================== */

  var fig = null, pa = null, pb = null, pc = null, link = null;
  var cur = null, curCtx = { hold: false }, settledAxis = null;
  var pointed = null;                     /* the trial index the reader points at, or null */
  var choice = { a: {}, b: {} };          /* the label anchors chosen for a layout, by key */

  /* the axis (b) draws: during a transition the target axis, from its first frame */
  function axisOf(state) {
    if (!state) return 'lr';
    if (state.axisNum > 0 && state.axisNum < 1) return settledAxis === 'wd' ? 'lr' : 'wd';
    return state.axis;
  }
  function rangeOf(axis) { return axis === 'wd' ? CAL.vRange : CAL.uRange; }

  function build(f) {
    var box = f.panels;
    var dA = CAL.domains.a, dB = CAL.domains.b, dC = CAL.domains.c;

    pa = TP.chart.panel(box, {
      letter: '(a)', describe: 'learning rate against weight decay',
      xLog: 10, yLog: 10, xDomain: [pow10(dA.x[0]), pow10(dA.x[1])], yDomain: [pow10(dA.y[0]), pow10(dA.y[1])],
      xLabel: 'weight decay', yLabel: 'learning rate', xFormat: fmt.decade, yFormat: fmt.decade,
      xTicks: function (dom, px) {
        var out = [];
        for (var e = dA.x[0]; e <= dA.x[1]; e++) if (px >= 200 || (e - dA.x[0]) % 3 === 0) out.push(pow10(e));
        return out;
      },
      yTicks: function () {
        var out = [];
        for (var e = Math.ceil(dA.y[0]); e <= Math.floor(dA.y[1]); e++) out.push(pow10(e));
        return out;
      },
      grid: 'none',
      aspect: function (w, phone) { return phone ? 0.78 : 0.8; },
      maxHeight: function (w, phone) { return phone ? 150 : 250; },
      margin: function (w, phone) { return phone ? { t: 8, r: 44, b: 42, l: 54 } : { t: 12, r: 84, b: 42, l: 76 }; }
    });
    pb = TP.chart.panel(box, {
      letter: '(b)', describe: 'validation error against the chosen hyperparameter',
      xDomain: [0, 1], yDomain: [0.16, dB.y[1]],
      xLabel: function (p) { return p.phone ? '' : axisOf(cur) === 'wd' ? 'weight decay' : 'learning rate'; },
      yLabel: 'validation error',
      xTicks: function () {
        var r = rangeOf(axisOf(cur)), out = [];
        for (var e = Math.ceil(r[0]); e <= Math.floor(r[1]); e++) out.push((e - r[0]) / (r[1] - r[0]));
        return out;
      },
      xFormat: function (f) {
        var r = rangeOf(axisOf(cur));
        return TP.fmt.exp10(Math.round(r[0] + f * (r[1] - r[0])));
      },
      yTicks: [0.2, 0.3, 0.4, 0.5, 0.6], yFormat: function (v) { return TP.fmt.byName('fixed1')(v); },
      aspect: function (w, phone) { return phone ? 108 / Math.max(w, 1) : 0.8; },
      maxHeight: function (w, phone) { return phone ? 108 : 250; },
      margin: function (w, phone) { return phone ? { t: 6, r: 12, b: 22, l: 54 } : { t: 12, r: 16, b: 42, l: 58 }; }
    });
    pc = TP.chart.panel(box, {
      letter: '(c)', describe: 'validation error against step',
      xDomain: dC.x.slice(), yDomain: dC.y.slice(),
      xLabel: 'step', yLabel: 'validation error', xFormat: fmt.step,
      xTicks: function (dom, px) { return px < 200 ? [0, 10000, 20000] : [0, 5000, 10000, 15000, 20000]; },
      yTicks: function (dom, px) { return px < 150 ? [0.2, 0.4, 0.6] : [0.2, 0.3, 0.4, 0.5, 0.6, 0.7]; },
      yFormat: function (v) { return TP.fmt.byName('fixed1')(v); },
      aspect: function (w, phone) { return phone ? 1.08 : 0.8; },
      maxHeight: function (w, phone) { return phone ? 150 : 250; },
      nameMargin: 40,
      margin: function (w, phone) { return phone ? { t: 8, r: 12, b: 42, l: 46 } : { t: 12, r: 16, b: 42, l: 58 }; }
    });
    pc.el.setAttribute('data-trial', '');

    link = TP.chart.link([pa, pb], { key: function (v, pt) { return pt ? pt.key : null; } });

    function points(xOf, yOf, sortBy) {
      return function () {
        if (!cur) return [];
        return cur.rows.slice().sort(function (r, s) { return sortBy(r) - sortBy(s) || r.k - s.k; }).map(function (r) {
          return {
            x: xOf(r), y: yOf(r), key: r.key, k: r.k, head: 'Trial ' + (r.k + 1),
            rows: [
              { value: fmt.err(r.y), label: 'best validation error', role: 'model' },
              { value: fmt.exp(pow10(r.u)), label: 'learning rate' },
              { value: fmt.exp(pow10(r.v)), label: 'weight decay' }
            ]
          };
        });
      };
    }
    function reading(p, pts) {
      var list = pts;
      TP.chart.pointHover(p, {
        points: list, by: 'trial',
        startIndex: function () {
          var all = list(), k = cur ? cur.shown : -1;
          for (var i = 0; i < all.length; i++) if (all[i].k === k) return i;
          return 0;
        },
        select: function (i, pt) { if (pt && cur) fig.set({ trial: pt.k === cur.best ? -1 : pt.k }); },
        onRead: function (pt) {
          var k = pt ? pt.k : null;
          if (k === pointed) return;
          pointed = k;
          pc.update();
        }
      });
    }
    reading(pa, points(function (r) { return pow10(r.v); }, function (r) { return pow10(r.u); }, function (r) { return r.v; }));
    reading(pb, points(function (r) { return r.bx; }, function (r) { return r.y; }, function (r) { return r.bx; }));

    pa.update(drawA);
    pb.update(drawB);
    pc.update(drawC);
  }

  /* ---------- label anchors: the first candidate the placer admits (WO-F1.2 labels) ---------- */

  /* (a)'s labels depend on the seed and the frame, (b)'s on the axis as well */
  function layoutKey(p, state) {
    return [state.seed, p === pb ? state.axis : '', Math.round(p.width), Math.round(p.height), p.phone ? 1 : 0].join('|');
  }
  function pick(panel, name, key) {
    var c = choice[panel][key];
    return c && c[name] != null ? c[name] : 0;
  }
  /* After a draw placed from scratch, each named label tries its anchors in order until the placer
     sets it in the frame in its full form (or its phone form in the phone layout). Where none
     succeeds it keeps the first anchor at which it was drawn at all. The
     choice then depends on the settled state alone, and a held draw reuses it. */
  function formOf(p, id) {
    var e = TP.chart.labelReport(p).filter(function (x) { return x.id === id; })[0];
    return e && !e.fault ? e.form : 'dropped';
  }
  function settleLabels(p, panel, names, candidates) {
    if (!cur || curCtx.hold) return;
    var key = layoutKey(p, cur);
    var ch = choice[panel][key] = choice[panel][key] || {};
    names.forEach(function (n) {
      var list = candidates(n.name), good = function (f) { return f === 'full' || (p.phone && f === 'phone'); };
      var start = ch[n.name] || 0, fallback = null;
      for (var i = start; i < list.length; i++) {
        if (ch[n.name] !== i) { ch[n.name] = i; p.update(); }
        var f = formOf(p, n.id);
        if (good(f)) return;
        if (fallback == null && (f === 'full' || f === 'phone' || f === 'header')) fallback = i;
      }
      var back = fallback == null ? start : fallback;
      if (ch[n.name] !== back) { ch[n.name] = back; p.update(); }
    });
  }

  function centreOrder(p, rows, xOf, yOf, fx, fy) {
    var cx = p.width * fx, cy = p.height * fy;
    return rows.slice().sort(function (r, s) {
      var dr = Math.pow(p.x(xOf(r)) - cx, 2) + Math.pow(p.y(yOf(r)) - cy, 2);
      var ds = Math.pow(p.x(xOf(s)) - cx, 2) + Math.pow(p.y(yOf(s)) - cy, 2);
      return dr - ds || r.k - s.k;
    }).map(function (r) { return r.k; });
  }

  /* ---------- (a) the search space ---------- */

  /* The region "search space" names the whole frame, and its name stands inside the frame's top
     edge where it can. The anchor is a box around the first position of the name, scanning rows
     from the top edge down, then from the bottom edge up, then the rest of the frame, at which
     every trial's marker (and the best trial's ring) stays 1 h clear of the name, as the placer
     requires of a region's name (DS §5.2). It is computed from the drawn trials, so it holds at
     every state, and the placer's first candidate, "top left inside", lands on that position. It
     returns up to eight such boxes at least 3 h apart, in scan order, so that settleLabels can move
     the name when another label already stands at the first. */
  function regionAnchors(p, s, xOf, yOf) {
    var h = p.h, m = TP.chart.measureText(['search space'], 'annotation', p), w = m.w + 1, bh = m.h + 1;
    var pad = 0.25 * h + 0.5, stepPx = 4;
    var pts = s.rows.map(function (r) { return { X: p.x(xOf(r)), Y: p.y(yOf(r)), c: h + (r.k === s.best ? 11 : 5) + 1 }; });
    function clearAt(x0, y0) {
      for (var i = 0; i < pts.length; i++) {
        var q = pts[i], dx = Math.max(x0 - q.X, 0, q.X - (x0 + w)), dy = Math.max(y0 - q.Y, 0, q.Y - (y0 + bh));
        if (dx * dx + dy * dy < q.c * q.c) return false;
      }
      return true;
    }
    var rows = [], y;
    for (y = pad; y <= p.height / 3; y += stepPx) rows.push(y);
    for (y = p.height - pad - bh; y >= p.height * 2 / 3 - bh; y -= stepPx) rows.push(y);
    for (y = pad; y <= p.height - pad - bh; y += stepPx) if (rows.indexOf(y) < 0) rows.push(y);
    var found = [];
    for (var j = 0; j < rows.length && found.length < 8; j++) {
      for (var x = pad; x <= p.width - pad - w && found.length < 8; x += stepPx) {
        if (!clearAt(x, rows[j])) continue;
        var far = found.every(function (f) { return Math.abs(f.X - x) >= 3 * h || Math.abs(f.Y - rows[j]) >= 3 * h; });
        if (far) found.push({ X: x, Y: rows[j] });
      }
    }
    var out = found.map(function (f) {
      return { x0: p.x.invert(f.X - pad), x1: p.x.invert(f.X + w + pad), y0: p.y.invert(f.Y + bh + pad), y1: p.y.invert(f.Y - pad) };
    });
    return out.length ? out : [{ x0: p.x.invert(0), x1: p.x.invert(p.width), y0: p.y.invert(bh + 2 * pad), y1: p.y.invert(0) }];
  }

  function candidatesA(name) {
    if (!cur) return [];
    var xOf = function (r) { return pow10(r.v); }, yOf = function (r) { return pow10(r.u); };
    if (name === 'search') return regionAnchors(pa, cur, xOf, yOf);
    var rows = cur.rows.filter(function (r) { return r.k !== cur.best; });
    if (name === 'trial') return centreOrder(pa, rows, xOf, yOf, 0.5, 0.5);
    return centreOrder(pa, rows, xOf, yOf, 0.5, 0.5).reverse();
  }
  function drawA(p) {
    var s = cur;
    if (!s) return;
    var dom = CAL.domains.colour, xOf = function (r) { return pow10(r.v); }, yOf = function (r) { return pow10(r.u); };
    var key = layoutKey(p, s);
    var candT = candidatesA('trial'), candS = candidatesA('study');
    var kT = candT[Math.min(pick('a', 'trial', key), candT.length - 1)];
    var sList = candS.filter(function (k) { return k !== kT; });
    var kS = sList[Math.min(pick('a', 'study', key), sList.length - 1)];
    var bar = TP.chart.colorbar(p, {
      role: 'model', domain: dom, label: p.phone ? '' : 'best validation error',
      ticks: p.phone ? [0.2, 0.4, 0.6] : [0.2, 0.3, 0.4, 0.5, 0.6], format: function (v) { return TP.fmt.byName('fixed1')(v); },
      thickness: p.phone ? 8 : 10, gap: p.phone ? 8 : 14
    });
    var colour = function (r) { return TP.chart.ramp('model', bar.t(r.y)); };
    var series = function (r) { return r.k === kT ? 'trial-named' : r.k === kS ? 'study-named' : 'trials'; };
    ['trials', 'trial-named', 'study-named'].forEach(function (name) {
      TP.chart.markers(p, s.rows.filter(function (r) { return series(r) === name; }), xOf, yOf,
        { role: 'model', series: name, key: function (r) { return r.key; }, color: colour });
    });
    var b = s.rows[s.best];
    TP.chart.ring(p, xOf(b), yOf(b), { role: 'model', series: 'trials' });
    if (s.trial >= 0 && s.trial !== s.best) {
      var c = s.rows[s.trial];
      TP.chart.ring(p, xOf(c), yOf(c), { role: 'reader', series: 'committed' });
    }
    if (!p.phone) {
      /* the learning-rate range's ends, named on the y axis (Batch 2 ruling) */
      CAL.uRange.forEach(function (e) { TP.chart.level(p, 'y', pow10(e), { role: 'context', text: fmt.exp(pow10(e)) }); });
    }
    var regions = candidatesA('search');
    TP.chart.annotation(p, {
      kind: 'region', id: 'search-space', text: 'search space', phone: { header: true },
      anchor: regions[Math.min(pick('a', 'search', key), regions.length - 1)]
    });
    var tS = s.rows[kS];
    TP.chart.annotation(p, {
      kind: 'callout', id: 'study', text: 'study: ' + N + ' trials', phone: { text: 'study' }, captionNames: true,
      anchor: { x: xOf(tS), y: yOf(tS), r: 5.5, series: 'study-named' }
    });
    var tT = s.rows[kT];
    TP.chart.place(p, [{
      id: 'trial', text: 'trial', role: 'model', series: 'trial-named', captionNames: true,
      feature: { type: 'point', x: xOf(tT), y: yOf(tT), r: 5.5 }
    }], curCtx);
  }

  /* ---------- (b) the axis plot ---------- */

  function candidatesB() {
    if (!cur) return [];
    var rows = cur.rows.filter(function (r) { return r.k !== cur.best; });
    return centreOrder(pb, rows, function (r) { return r.bx; }, function (r) { return r.y; }, 0.5, 0.55);
  }
  function drawB(p) {
    var s = cur;
    if (!s) return;
    var xOf = function (r) { return r.bx; }, yOf = function (r) { return r.y; };
    var key = layoutKey(p, s), cand = candidatesB();
    var kP = p.phone ? -1 : cand[Math.min(pick('b', 'per-trial', key), cand.length - 1)];
    var series = function (r) { return r.k === kP ? 'point-named' : 'trials'; };
    ['trials', 'point-named'].forEach(function (name) {
      TP.chart.markers(p, s.rows.filter(function (r) { return series(r) === name; }), xOf, yOf,
        { role: 'model', series: name, key: function (r) { return r.key; } });
    });
    var b = s.rows[s.best];
    TP.chart.ring(p, xOf(b), yOf(b), { role: 'model', series: 'trials' });
    if (s.trial >= 0 && s.trial !== s.best) {
      var c = s.rows[s.trial];
      TP.chart.ring(p, xOf(c), yOf(c), { role: 'reader', series: 'committed' });
    }
    /* the chosen range's ends, named on the x axis, and the bracket "range" along the top of the
       frame, which spans the range (Batch 2 ruling) */
    var r = rangeOf(axisOf(s));
    [0, 1].forEach(function (f) { TP.chart.level(p, 'x', f, { role: 'context', text: fmt.exp(pow10(r[f])) }); });
    TP.chart.annotation(p, { kind: 'bracket', id: 'range', text: 'range', side: 'below', anchor: { x0: 0, x1: 1, y: CAL.domains.b.y[1] } });
    p.setNote(p.phone ? 'one point per trial' : '');
    var items = [];
    if (!p.phone) {
      var t = s.rows[kP];
      items.push({
        id: 'per-trial', text: ['one point per trial,', 'its best validation error'], role: 'model', series: 'point-named',
        feature: { type: 'point', x: xOf(t), y: yOf(t), r: 5.5 }, captionNames: true
      });
    }
    TP.chart.place(p, items, curCtx);
  }

  /* ---------- (c) the training curve ---------- */

  function drawC(p) {
    var s = cur;
    if (!s) { p.setNote(''); return; }
    var k = pointed != null ? pointed : s.shown;
    var t = trialOf(s, k), ev = t.curve.evals, sel = t.curve.selectedIndex, last = t.curve.lastIndex;
    p.setNote('trial ' + (k + 1));
    p.el.setAttribute('data-trial', String(k));
    var rows = ev.map(function (e, j) { return { key: 'c' + e.step, j: j, step: e.step, value: e.value }; });
    var xOf = function (r) { return r.step; }, yOf = function (r) { return r.value; };
    var top = CAL.domains.c.y[1], inside = function (r) { return r.value <= top; };
    TP.chart.line(p, rows, xOf, yOf, { role: 'model', series: 'curve', key: 'curve' });
    /* a checkpoint above the frame: an arrowhead at the top edge, pointing up (DS §9 rule 3) */
    rows.filter(function (r) { return !inside(r); }).forEach(function (r) {
      var X = p.x(r.step);
      p.layers.marks.append('path').attr('class', 'arrowhead r-model').attr('data-key', r.key).attr('data-above', r.value.toFixed(3))
        .attr('d', 'M' + (X - 3.5) + ',6L' + X + ',0L' + (X + 3.5) + ',6Z');
      TP.chart.obstacle(p, [X, 3], { type: 'points', r: 4, series: 'curve' });
    });
    TP.chart.markers(p, rows.filter(function (r) { return r.j !== last && inside(r); }), xOf, yOf,
      { role: 'model', series: 'curve', key: function (r) { return r.key; }, thin: 24, keep: function (r) { return r.j === sel; } });
    TP.chart.markers(p, [rows[last]], xOf, yOf, { role: 'model', series: 'curve', fill: 'open', key: function (r) { return r.key; } });
    TP.chart.ring(p, ev[sel].step, ev[sel].value, { role: 'model', series: 'curve' });
    /* where the selected checkpoint is the last, one label names both */
    var items = [{ id: 'selected', text: sel === last ? 'selected, last' : 'selected', role: 'model', series: 'curve', captionNames: true,
      keySentence: true, feature: { type: 'point', x: ev[sel].step, y: ev[sel].value, r: 11 } }];
    if (sel !== last) {
      /* "last" names the end of the curve, its last segment, so that where the frame leaves no
         position beside the open marker the name may stand in the right margin at the height the
         curve leaves by (DS §5.6) */
      items.push({ id: 'last', text: 'last', role: 'model', series: 'curve', captionNames: true,
        feature: { type: 'line', points: [[ev[last - 1].step, ev[last - 1].value], [ev[last].step, ev[last].value]] } });
    }
    TP.chart.place(p, items, pointed != null ? { hold: false } : curCtx);
  }

  function draw(state, ctx) {
    if (!pa) build(ctx.fig);
    cur = state;
    curCtx = ctx || { hold: false };
    if (state && !ctx.transition) settledAxis = state.axis;
    if (state && pointed != null && !(pointed >= 0 && pointed < N)) pointed = null;
    pa.update();
    pb.update();
    pc.update();
    if (state && !curCtx.hold) {
      settleLabels(pa, 'a', [{ id: 'trial', name: 'trial' }, { id: 'annotation:study', name: 'study' },
        { id: 'annotation:search-space', name: 'search' }], candidatesA);
      if (!pa.phone) settleLabels(pb, 'b', [{ id: 'per-trial', name: 'per-trial' }], candidatesB);
    }
  }

  function describe(state) {
    var t = trialOf(state, state.shown), sel = selectedOf(t);
    return { n: t.k + 1, lr: pow10(t.u), wd: pow10(t.v), y: t.y, step: sel.step, last: lastOf(t).value };
  }

  function readout(state) {
    var d = describe(state);
    return 'Trial ' + fmt.int(d.n) + ' has learning rate ' + fmt.exp(d.lr) + ' and weight decay ' + fmt.exp(d.wd) +
      ', and its best validation error, ' + fmt.err(d.y) + ', came at step ' + fmt.int(d.step) + ' of ' + fmt.int(STEPS) + '.';
  }

  function table(state) {
    var S = study(state.seed);
    return {
      columns: [
        { key: 'n', label: 'Trial', format: fmt.int },
        { key: 'lr', label: 'Learning rate', format: fmt.exp },
        { key: 'wd', label: 'Weight decay', format: fmt.exp },
        { key: 'y', label: 'Best validation error', format: fmt.err },
        { key: 'step', label: 'Step of the selected checkpoint', format: fmt.int },
        { key: 'last', label: 'Validation error at the last checkpoint', format: fmt.err },
        { key: 'note', label: 'Marked' }
      ],
      rows: S.trials.map(function (t) {
        var notes = [];
        if (t.k === S.best) notes.push('best trial, ringed');
        if (t.k === state.shown) notes.push('curve in (c)');
        return { n: t.n, lr: pow10(t.u), wd: pow10(t.v), y: t.y, step: selectedOf(t).step, last: lastOf(t).value, note: notes.join('; ') };
      }),
      caption: 'The ' + N + ' trials of the study at seed ' + state.seed + ', each with its best validation error and the step of its selected checkpoint out of ' + fmt.int(STEPS)
    };
  }

  function quantities(state) {
    var S = study(state.seed), b = S.trials[S.best], d = describe(state), U = CAL.uRange;
    var q = {
      'best-trial': b.n, 'best-value': b.y, 'best-lr': pow10(b.u), 'best-wd': pow10(b.v),
      'best-step': selectedOf(b).step, 'best-position': (b.u - U[0]) / (U[1] - U[0]),
      'best-last-value': lastOf(b).value, 'best-gap': lastOf(b).value - b.y,
      'shown-trial': d.n, 'shown-value': d.y, 'shown-lr': d.lr, 'shown-wd': d.wd, 'shown-step': d.step, 'shown-last-value': d.last,
      infeasible: S.trials.filter(function (t) { return !t.feasible; }).length
    };
    var fixed = CAL.quantities || {};
    ['model', 'seed'].forEach(function (setting) {
      var m = fixed[setting] || {};
      Object.keys(m).forEach(function (name) { if (!(name in q)) q[name] = m[name]; });
    });
    return q;
  }

  function init(element) {
    fig = TP.fig(element, {
      kind: 'fixed',
      params: {
        axis: {
          type: 'choice', default: CAL.defaults.axis, domain: ['lr', 'wd'],
          labels: { lr: 'learning rate', wd: 'weight decay' },
          change: 'transition', ghost: false, label: 'Plot against', control: 'segment', panel: 'b'
        },
        trial: {
          type: 'number', default: CAL.defaults.trial, domain: [-1, N - 1], snap: 1,
          change: 'cut', ghost: false, label: 'Trial shown in (c)', control: 'none'
        }
      },
      seed: CAL.seed,
      states: CAL.states,
      apply: apply,
      draw: draw,
      readout: readout,
      table: table,
      quantities: quantities
    });
    fig.on('settle', function () { pointed = null; });
  }

  /* ============================== the recap (§6.24, R1) ============================== */

  /* TP.recaps['F1.2:per-value']: three axis plots side by side, one study per weight decay of
     10^-6, 10^-4.5 and 10^-3, each of 12 trials at van der Corput learning rates over CAL.uRange,
     their noise drawn as sampleStudy draws it from the default seed, each best ringed. setting.wd
     may list other exponents joined by "+", and setting.n another count. */
  function recapStudy(v, n, seed) {
    var U = CAL.uRange, noise = TP.prng.create(TP.prng.deriveSeed(seed, 'toyS:noise'));
    var sigma = TP.toyS.defaults.sigma, rows = [], best = -1;
    var xs = TP.halton.vanDerCorput({ n: n, seed: seed });
    for (var k = 0; k < n; k++) {
      var u = TP.halton.map(xs[k], U[0], U[1]);
      var y = clamp(TP.toyS.error(u, v) + sigma * noise.normal(), 0, TP.toyS.yInfeasible);
      rows.push({ key: 'r' + k, k: k, u: u, y: y });
      if (u <= TP.toyS.defaults.uDiv && (best < 0 || y < rows[best].y)) best = k;
    }
    return { v: v, rows: rows, best: best };
  }
  TP.recaps['F1.2:per-value'] = function (el, setting) {
    setting = setting || {};
    var exps = setting.wd ? String(setting.wd).split('+').map(Number) : [-6, -4.5, -3];
    var n = setting.n ? Math.max(2, Math.round(+setting.n)) : 12;
    var seed = setting.seed ? +setting.seed : CAL.seed;
    var U = CAL.uRange, C = TP.chart;
    exps.forEach(function (v, i) {
      var S = recapStudy(v, n, seed), first = i === 0;
      var wdText = fmt.exp(pow10(v));
      var p = C.panel(el, {
        letter: '(' + 'abcdefgh'.charAt(i) + ')', describe: 'validation error against learning rate, weight decay ' + wdText,
        xLog: 10, xDomain: [pow10(U[0]), pow10(U[1])], yDomain: CAL.domains.b.y.slice(),
        xLabel: 'learning rate', yLabel: 'validation error',
        /* a row of small multiples, and in the phone layout a column of full frames (below) */
        inner: function (phone) { return !first && !phone; },
        xFormat: fmt.decade, yFormat: function (y) { return TP.fmt.byName('fixed1')(y); },
        xTicks: function () { var out = []; for (var e = Math.ceil(U[0]); e <= Math.floor(U[1]); e++) out.push(pow10(e)); return out; },
        yTicks: [0.2, 0.4, 0.6],
        /* one height for every frame, so that the frames share the y axis's pixel range */
        aspect: function (w, phone) { return (phone ? 124 : 186) / Math.max(w, 1); },
        margin: function (w, phone) { return { t: 8, r: 8, b: phone ? 36 : 40, l: phone ? 46 : first ? 54 : 8 }; }
      });
      /* In a row the first frame carries the y axis, so it takes the width of its margin in
         addition, and the frames stand on one baseline whatever their headers' heights. Below
         640 px a frame of the row would be 93 px wide at 390, too narrow for a header that names
         the condition, so the frames stack in one column, each with its own axes and an 80-px
         plot area (site.css, .recap-column). */
      el.classList.add('recap-column');
      p.update(function (q) {
        /* the header names the condition and its value */
        q.setNote('weight decay ' + wdText);
        var xOf = function (r) { return pow10(r.u); }, yOf = function (r) { return r.y; };
        C.markers(q, S.rows, xOf, yOf, { role: 'model', series: 'trials', key: function (r) { return r.key; } });
        var b = S.rows[S.best];
        if (b) C.ring(q, xOf(b), yOf(b), { role: 'model', series: 'trials' });
        C.place(q, []);
      });
    });
  };

  document.addEventListener('tp:ready', function () {
    var el = document.getElementById(ID);
    if (el) init(el);
  });
})();
