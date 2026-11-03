/*
 * f6-3-isolation.js: figure F6.3, the isolation plot built from a cloud (fig-isolation), on page 6
 * #isolation, and its recap TP.recaps['F6.3:round'] (R6, page 10 #round).
 *
 * Work order: notes/revamp/implementation-plan.md §6.13 (WO-F6.3), with §6.0 and §6.24. Entry:
 * notes/revamp/figure-plan.md F6.3, with review/synthesis.md R2 and R22. Design:
 * notes/revamp/design-system.md §3.4, §3.5, §4, §5, §6, §8 and §9. A fixed-frame figure with linked
 * views and a slice handle.
 *
 * The model is TP.isolation (site/js/lib/isolation.js) on Toy S: TP.isolation.study({seed}) gives
 * the 100 trials, TP.isolation.buckets(trials, B) the B equal-width buckets of log10 weight decay
 * over [-7, -1] with each bucket's best feasible trial, and an empty bucket (or one with no
 * feasible trial) breaks the isolation curve. This is the computation of
 * tests/calibration/fig-isolation.calibrate.js, so the quantities equal the ledger's rows at the
 * default.
 *
 * The panels, linked by C.link with the trial's key ("t1" to "t100"):
 *   (a) learning rate against weight decay, log axes: the feasible trials as filled model-blue
 *       markers and the diverged ones as model-blue crosses at their hyperparameters. The header
 *       note gives "k of 100 diverged" (DS §4.5).
 *   (b) validation error against weight decay: every trial in context grey, the diverged ones as
 *       grey crosses at the frame's top edge (their error is Toy S's cap, 0.8, the top of the
 *       domain), and the isolation curve in model blue through the best trial of each bucket,
 *       with markers on those trials, broken at a bucket that has no feasible trial. A change of
 *       `buckets` leaves the previous curve dashed (DS §4.8).
 *   The slice is a reader window over the weight-decay axis of both panels, with one handle at
 *   its centre on each panel's axis, and on (a)'s alone in the phone layout, where (a) stands
 *   directly above (b) (work-order exceptions to DS §4.10's two edge handles and, on a phone, to
 *   "either panel"). The
 *   slice's best trial is ringed in both panels. The axis titles name the roles: "weight decay, the
 *   scientific hyperparameter" and "learning rate, the nuisance hyperparameter" (the phone form of
 *   the second is "learning rate", because a 120-px plot cannot hold the full title, and the first
 *   takes the phone form "weight decay (scientific)" where its measured width exceeds the room
 *   under (b)'s frame, below about 375 px). (b) names the
 *   curve "isolation curve", as a direct label on the curve where the placer admits one and
 *   otherwise as a callout to one of its markers, and in the phone layout in (b)'s header; it names
 *   the ring "best trial in the slice" (phone "best in slice") as a callout. Panel (b)'s error axis
 *   starts one 0.05 step below the lowest error (CAL), so that the names have room under the curve.
 *
 * The parameters: buckets (4, 8, 16; transition, ghost; segment "Buckets" in more) and slice (the
 * bucket index, 0 to buckets - 1; transition, no ghost; the handles), with the seed ("Draw again",
 * cut). `buckets` precedes `slice` so that the slice's domain is a function of it. When the reader
 * changes `buckets`, constrain moves `slice` to the bucket that holds the previous slice's centre.
 *
 * The ghost is ctx.ghost, the state before the reader's last change of `buckets`. TP.fig decides
 * it from the names the reader set, so the move of `slice` that constrain makes keeps it, and a
 * change of the slice, a new seed or Reset clears it. The figure draws its curve when the state
 * differs from it in the number of buckets alone.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};
  TP.recaps = TP.recaps || {};

  /* BEGIN GENERATED table-cal */
  // From tests/calibration/out/fig-isolation.json by npm run generate (tests/lib/write-generated.js).
  var CAL = {
    "defaults": {"slice": 3, "buckets": 8},
    "presets": {},
    "states": {},
    "seed": 46,
    "domains": {
      "a": {"x": [-7, -1], "y": [-5, -0.5]},
      "b": {"x": [-7, -1], "y": [0.15, 0.8], "yFeasibleMax": 0.7732}
    },
    "tables": {
      "winners4": [
        {
          "k": 0,
          "v0": -7,
          "v1": -5.5,
          "n": 25,
          "nFeasible": 18,
          "winner": 77,
          "u": -2.2506,
          "y": 0.25527
        },
        {
          "k": 1,
          "v0": -5.5,
          "v1": -4,
          "n": 26,
          "nFeasible": 20,
          "winner": 25,
          "u": -2.7076,
          "y": 0.23178
        },
        {
          "k": 2,
          "v0": -4,
          "v1": -2.5,
          "n": 25,
          "nFeasible": 19,
          "winner": 13,
          "u": -2.2857,
          "y": 0.24064
        },
        {
          "k": 3,
          "v0": -2.5,
          "v1": -1,
          "n": 24,
          "nFeasible": 22,
          "winner": 78,
          "u": -3.3756,
          "y": 0.34322
        }
      ],
      "winners8": [
        {
          "k": 0,
          "v0": -7,
          "v1": -6.25,
          "n": 12,
          "nFeasible": 8,
          "winner": 35,
          "u": -1.9342,
          "y": 0.27791
        },
        {
          "k": 1,
          "v0": -6.25,
          "v1": -5.5,
          "n": 13,
          "nFeasible": 10,
          "winner": 77,
          "u": -2.2506,
          "y": 0.25527
        },
        {
          "k": 2,
          "v0": -5.5,
          "v1": -4.75,
          "n": 14,
          "nFeasible": 11,
          "winner": 37,
          "u": -2.4967,
          "y": 0.24
        },
        {
          "k": 3,
          "v0": -4.75,
          "v1": -4,
          "n": 12,
          "nFeasible": 9,
          "winner": 25,
          "u": -2.7076,
          "y": 0.23178
        },
        {
          "k": 4,
          "v0": -4,
          "v1": -3.25,
          "n": 11,
          "nFeasible": 10,
          "winner": 13,
          "u": -2.2857,
          "y": 0.24064
        },
        {
          "k": 5,
          "v0": -3.25,
          "v1": -2.5,
          "n": 14,
          "nFeasible": 9,
          "winner": 45,
          "u": -2.2154,
          "y": 0.29783
        },
        {
          "k": 6,
          "v0": -2.5,
          "v1": -1.75,
          "n": 12,
          "nFeasible": 11,
          "winner": 78,
          "u": -3.3756,
          "y": 0.34322
        },
        {
          "k": 7,
          "v0": -1.75,
          "v1": -1,
          "n": 12,
          "nFeasible": 11,
          "winner": 21,
          "u": -2.4264,
          "y": 0.39636
        }
      ],
      "winners16": [
        {
          "k": 0,
          "v0": -7,
          "v1": -6.625,
          "n": 6,
          "nFeasible": 4,
          "winner": 35,
          "u": -1.9342,
          "y": 0.27791
        },
        {
          "k": 1,
          "v0": -6.625,
          "v1": -6.25,
          "n": 6,
          "nFeasible": 4,
          "winner": 17,
          "u": -2.9889,
          "y": 0.31407
        },
        {
          "k": 2,
          "v0": -6.25,
          "v1": -5.875,
          "n": 8,
          "nFeasible": 6,
          "winner": 53,
          "u": -2.3561,
          "y": 0.26952
        },
        {
          "k": 3,
          "v0": -5.875,
          "v1": -5.5,
          "n": 5,
          "nFeasible": 4,
          "winner": 77,
          "u": -2.2506,
          "y": 0.25527
        },
        {
          "k": 4,
          "v0": -5.5,
          "v1": -5.125,
          "n": 7,
          "nFeasible": 5,
          "winner": 37,
          "u": -2.4967,
          "y": 0.24
        },
        {
          "k": 5,
          "v0": -5.125,
          "v1": -4.75,
          "n": 7,
          "nFeasible": 6,
          "winner": 61,
          "u": -2.0748,
          "y": 0.24164
        },
        {
          "k": 6,
          "v0": -4.75,
          "v1": -4.375,
          "n": 6,
          "nFeasible": 5,
          "winner": 25,
          "u": -2.7076,
          "y": 0.23178
        },
        {
          "k": 7,
          "v0": -4.375,
          "v1": -4,
          "n": 6,
          "nFeasible": 4,
          "winner": 85,
          "u": -2.3912,
          "y": 0.23536
        },
        {
          "k": 8,
          "v0": -4,
          "v1": -3.625,
          "n": 6,
          "nFeasible": 5,
          "winner": 13,
          "u": -2.2857,
          "y": 0.24064
        },
        {
          "k": 9,
          "v0": -3.625,
          "v1": -3.25,
          "n": 5,
          "nFeasible": 5,
          "winner": 49,
          "u": -2.9186,
          "y": 0.25091
        },
        {
          "k": 10,
          "v0": -3.25,
          "v1": -2.875,
          "n": 7,
          "nFeasible": 5,
          "winner": 45,
          "u": -2.2154,
          "y": 0.29783
        },
        {
          "k": 11,
          "v0": -2.875,
          "v1": -2.5,
          "n": 7,
          "nFeasible": 4,
          "winner": 33,
          "u": -3.0592,
          "y": 0.30114
        },
        {
          "k": 12,
          "v0": -2.5,
          "v1": -2.125,
          "n": 5,
          "nFeasible": 5,
          "winner": 78,
          "u": -3.3756,
          "y": 0.34322
        },
        {
          "k": 13,
          "v0": -2.125,
          "v1": -1.75,
          "n": 7,
          "nFeasible": 6,
          "winner": 57,
          "u": -2.6373,
          "y": 0.34615
        },
        {
          "k": 14,
          "v0": -1.75,
          "v1": -1.375,
          "n": 6,
          "nFeasible": 5,
          "winner": 21,
          "u": -2.4264,
          "y": 0.39636
        },
        {
          "k": 15,
          "v0": -1.375,
          "v1": -1,
          "n": 6,
          "nFeasible": 6,
          "winner": 65,
          "u": -3.0943,
          "y": 0.4476
        }
      ]
    },
    "quantities": {
      "model": {
        "trials": 100,
        "lr-lo": 0.00001,
        "lr-hi": 0.31622776601683794,
        "wd-lo": 1e-7,
        "wd-hi": 0.1,
        "sigma": 0.001,
        "u-div": 0.03162277660168379,
        "bucket-counts": "4, 8 and 16"
      },
      "default": {
        "slice-low": 0.00001778279410038923,
        "slice-high": 0.0001,
        "slice-trials": 12,
        "winner-lr": 0.001960553931357281,
        "winner-wd": 0.000040201736697635895,
        "winner-error": 0.23178367865137856,
        "best-bucket-error": 0.23178367865137856,
        "best-bucket": 3,
        "infeasible-count": 21
      },
      "seed": {
        "chosen": 46,
        "statistic": "the error of the best bucket at 8 buckets; admitted: every bucket holds a feasible trial at 16 buckets",
        "n": 300,
        "admitted": 300,
        "median": 0.23179103311952995
      }
    }
  };
  /* END GENERATED table-cal */

  var ID = 'fig-isolation';
  var BUCKET_CHOICES = [4, 8, 16];

  function pow10(e) { return Number.isInteger(e) ? Number('1e' + e) : Math.pow(10, e); }
  function log10(x) { return Math.log(x) / Math.LN10; }
  var fmt = {
    exp: function (v) { return TP.fmt.byName('exp10')(v); },
    err: function (v) { return TP.fmt.byName('fixed3')(v); },
    int: function (v) { return TP.fmt.byName('int')(v); },
    decade: function (v) { return TP.fmt.exp10(Math.round(log10(v))); },
    fixed1: function (v) { return TP.fmt.byName('fixed1')(v); }
  };

  /* ============================== the model ============================== */

  /* Panel (b)'s error axis, CAL.domains.b.y. The calibration sets its lower bound one 0.05 step
     below the lowest error, so that the names have room under the curve (work-order exception 4). */
  function errorDomain() { return CAL.domains.b.y; }

  function I() { return TP.isolation; }
  function V() { return CAL.domains.a.x; }
  function width(B) { return (V()[1] - V()[0]) / B; }
  /** The centre, in log10 weight decay, of bucket k of B. */
  function centreOf(k, B) { return V()[0] + (k + 0.5) * width(B); }
  /** The bucket of B that holds log10 weight decay v; a centre on a boundary goes to the upper
      bucket, as TP.isolation.bucketIndex's floor does. */
  function bucketAt(v, B) { return I().bucketIndex(+v.toFixed(9), B); }

  var studyCache = {};
  function study(seed) {
    var key = String(seed);
    if (studyCache[key]) return studyCache[key];
    var trials = I().study({ seed: seed });
    var keys = Object.keys(studyCache);
    if (keys.length > 12) delete studyCache[keys[0]];
    studyCache[key] = trials;
    return trials;
  }

  /** Everything the figure reads at a setting: the trials, the buckets, the slice and the curve. */
  function model(seed, B, k) {
    var trials = study(seed), bs = I().buckets(trials, B);
    k = Math.max(0, Math.min(B - 1, k));
    var lowest = null;
    bs.forEach(function (b) { if (b.best && (!lowest || b.best.y < lowest.best.y)) lowest = b; });
    return {
      seed: seed, B: B, k: k, trials: trials, buckets: bs, slice: bs[k], lowest: lowest,
      infeasible: trials.filter(function (t) { return !t.feasible; }).length
    };
  }

  /** The isolation curve's rows: one per bucket with a feasible trial, keyed by that trial, with
      the segment it belongs to (a bucket without one breaks the curve). */
  function curveRows(M) {
    var rows = [], seg = 0, open = false;
    M.buckets.forEach(function (b) {
      if (!b.best) { if (open) seg++; open = false; return; }
      open = true;
      rows.push({ key: 't' + b.best.i, i: b.best.i, u: b.best.u, v: b.best.v, y: b.best.y, seg: 's' + seg, bk: 'k' + b.k });
    });
    return rows;
  }

  /** The derived state for the values. Every array of rows carries a key (DS §9); the integers
      that must not be interpolated are strings. */
  function apply(values) {
    var M = model(values.seed, values.buckets, values.slice), s = M.slice, b = s.best;
    return {
      seedS: String(values.seed), bS: String(values.buckets), kS: String(M.k),
      rows: M.trials.map(function (t) { return { key: 't' + t.i, i: t.i, u: t.u, v: t.v, y: t.y, f: t.feasible ? 'y' : 'n' }; }),
      curve: curveRows(M),
      v0: s.v0, v1: s.v1,
      ring: b ? { u: b.u, v: b.v, y: b.y, iS: 't' + b.i } : null
    };
  }

  /* ============================== the figure ============================== */

  var fig = null, pa = null, pb = null, link = null;
  var cur = null, curCtx = { hold: false };
  var choice = {};                /* the candidate of "isolation curve" drawn now, by layout key */
  var settled = {};               /* the candidate a settle chose, by layout key */

  function trialsOf(s, feasible) { return s.rows.filter(function (r) { return (r.f === 'y') === feasible; }); }

  function reading(p, xOf, yOf) {
    TP.chart.pointHover(p, {
      by: 'trial',
      points: function () {
        if (!cur) return [];
        return cur.rows.slice().sort(function (r, q) { return r.v - q.v || r.i - q.i; }).map(function (r) {
          var ok = r.f === 'y';
          return {
            x: xOf(r), y: yOf(r), key: r.key, head: 'Trial ' + r.i,
            rows: [
              { value: ok ? fmt.err(r.y) : 'diverged', label: 'validation error', role: 'model' },
              { value: fmt.exp(pow10(r.u)), label: 'learning rate' },
              { value: fmt.exp(pow10(r.v)), label: 'weight decay' }
            ]
          };
        });
      },
      startIndex: function () { return 0; }
    });
  }

  function xTicks(dom, px) {
    var out = [], X = V();
    for (var e = X[0]; e <= X[1]; e++) if (px >= 240 || (e - X[0]) % 2 === 0) out.push(pow10(e));
    return out;
  }
  var X_TITLE = 'weight decay, the scientific hyperparameter';
  var X_TITLE_PHONE = 'weight decay (scientific)';
  var Y_TITLE = 'learning rate, the nuisance hyperparameter';
  /* (b)'s x title is centred under the frame, so it fits while its width is at most the frame's
     plus twice the narrower side margin. In the phone layout below about 375 px, or under the
     text-spacing overrides at 390 px, the full title does not, and its phone form stands
     (accessibility finding Z4). The width is measured at the rendered size. */
  function xTitle(p) {
    if (!p.phone) return X_TITLE;
    var room = p.width + 2 * Math.min(p.margin.l, p.margin.r);
    return TP.chart.measureText([X_TITLE], 'label', p).w <= room ? X_TITLE : X_TITLE_PHONE;
  }

  function build(f) {
    var dA = CAL.domains.a, dB = CAL.domains.b;
    pa = TP.chart.panel(f.panels, {
      letter: '(a)', describe: 'learning rate against weight decay',
      xLog: 10, yLog: 10, xDomain: [pow10(dA.x[0]), pow10(dA.x[1])], yDomain: [pow10(dA.y[0]), pow10(dA.y[1])],
      xLabel: function (p) { return p.phone ? '' : X_TITLE; },
      yLabel: function (p) { return p.phone ? 'learning rate' : Y_TITLE; },
      xFormat: fmt.decade, yFormat: fmt.decade, xTicks: xTicks,
      yTicks: function () { var out = []; for (var e = Math.ceil(dA.y[0]) + 1; e <= Math.floor(dA.y[1]); e++) out.push(pow10(e)); return out; },
      grid: 'none',
      aspect: function (w, phone) { return phone ? 150 / Math.max(w, 1) : 0.84; },
      maxHeight: function (w, phone) { return phone ? 150 : 400; },
      margin: function (w, phone) { return phone ? { t: 8, r: 12, b: 22, l: 54 } : { t: 12, r: 16, b: 44, l: 58 }; }
    });
    pb = TP.chart.panel(f.panels, {
      letter: '(b)', describe: 'validation error against weight decay',
      xLog: 10, xDomain: [pow10(dB.x[0]), pow10(dB.x[1])], yDomain: errorDomain(),
      xLabel: xTitle, yLabel: 'validation error',
      xFormat: fmt.decade, yFormat: fmt.fixed1, xTicks: xTicks,
      yTicks: function (dom, px) { return px < 150 ? [0.2, 0.4, 0.6, 0.8] : [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]; },
      aspect: function (w, phone) { return phone ? 154 / Math.max(w, 1) : 0.84; },
      maxHeight: function (w, phone) { return phone ? 154 : 400; },
      margin: function (w, phone) { return phone ? { t: 6, r: 12, b: 42, l: 54 } : { t: 12, r: 16, b: 44, l: 58 }; }
    });
    link = TP.chart.link([pa, pb], { key: function (v, pt) { return pt ? pt.key : null; } });
    reading(pa, function (r) { return pow10(r.v); }, function (r) { return pow10(r.u); });
    reading(pb, function (r) { return pow10(r.v); }, function (r) { return r.f === 'y' ? r.y : CAL.domains.b.y[1]; });
    pa.update(drawA);
    pb.update(drawB);
  }

  /* ---------- the slice: the reader window and its handle, the same on both panels ---------- */

  function sliceMarks(p, s, withHandle) {
    var B = +s.bS, centres = [];
    for (var k = 0; k < B; k++) centres.push(pow10(centreOf(k, B)));
    var lo = pow10(s.v0), hi = pow10(s.v1);
    TP.chart.window(p, lo, hi, { kind: 'reader', id: 'slice', handles: false });
    if (!withHandle) return;
    var ctx = curCtx;
    /* a transition's frames move the handle with the window; a settled state gives the centre */
    var value = ctx.transition ? Math.sqrt(lo * hi) : centres[+s.kS];
    TP.chart.handle(p, {
      id: 'slice', axis: 'x', value: value, snap: centres, min: centres[0], max: centres[B - 1], scale: 'log',
      label: 'Weight-decay slice', format: function (c) { return rangeText(bucketAt(log10(c), B), B); },
      onChange: function (c) { fig.set({ slice: bucketAt(log10(c), B) }, { transient: true }); },
      onSettle: function (c) { fig.set({ slice: bucketAt(log10(c), B) }); }
    });
  }
  function rangeText(k, B) {
    var v0 = V()[0] + k * width(B), v1 = v0 + width(B);
    return fmt.exp(pow10(v0)) + ' to ' + fmt.exp(pow10(v1));
  }

  /* ---------- (a) the search space ---------- */

  function drawA(p) {
    var s = cur;
    if (!s) { p.setNote(''); return; }
    var C = TP.chart, xOf = function (r) { return pow10(r.v); }, yOf = function (r) { return pow10(r.u); };
    sliceMarks(p, s, true);
    var feas = trialsOf(s, true), inf = trialsOf(s, false);
    C.markers(p, feas, xOf, yOf, { role: 'model', series: 'trials', key: function (r) { return r.key; } });
    C.cross(p, inf, xOf, yOf, { role: 'model', series: 'trials', key: function (r) { return r.key; } });
    if (s.ring) C.ring(p, pow10(s.ring.v), pow10(s.ring.u), { role: 'model', series: 'trials' });
    p.setNote(fmt.int(inf.length) + ' of ' + fmt.int(s.rows.length) + ' diverged');
    C.place(p, [], curCtx);
  }

  /* ---------- (b) the isolation curve over the cloud ---------- */

  function segments(rows) {
    var out = [], cur2 = null;
    rows.forEach(function (r) {
      if (!cur2 || cur2.seg !== r.seg) { cur2 = { seg: r.seg, rows: [] }; out.push(cur2); }
      cur2.rows.push(r);
    });
    return out;
  }

  /* The name "isolation curve" is a direct label on the curve's longest segment, or, where the placer
     admits no position there, on a stretch of it between neighbouring best trials. Where no stretch
     holds it, it becomes a callout with a leader to one of the curve's markers, the markers farthest
     from the slice first (DS §5.10, §5.4). settleLabels tries the candidates in this order. */
  function curveCandidates(s) {
    var segs = segments(s.curve), longest = null;
    segs.forEach(function (g) { if (!longest || g.rows.length > longest.rows.length) longest = g; });
    if (!longest) return [];
    var pt = function (r) { return [pow10(r.v), r.y]; };
    var out = [{ label: { type: 'line', points: longest.rows.map(pt) } }];
    var rows = longest.rows;
    /* stretches of three best trials from the middle outward, then of two */
    [3, 2].forEach(function (n) {
      var list = [];
      for (var a = 0; a + n <= rows.length; a++) list.push(a);
      var mid = (rows.length - n) / 2;
      list.sort(function (x, y) { return Math.abs(x - mid) - Math.abs(y - mid) || x - y; });
      list.slice(0, 4).forEach(function (a) { out.push({ label: { type: 'line', points: rows.slice(a, a + n).map(pt) } }); });
    });
    var c = (s.v0 + s.v1) / 2, ringKey = s.ring ? s.ring.iS : null;
    s.curve.filter(function (r) { return r.key !== ringKey; })
      .sort(function (a, b) { return Math.abs(b.v - c) - Math.abs(a.v - c) || a.v - b.v; })
      .slice(0, 10).forEach(function (r) { out.push({ callout: { x: pow10(r.v), y: r.y, r: 5.5, series: 'curve' } }); });
    return out;
  }
  /* ctx.ghost when it is the same study at another number of buckets, else null */
  function ghostOf(s) {
    var g = curCtx && curCtx.ghost;
    return g && g.curve && g.seedS === s.seedS && g.bS !== s.bS ? g : null;
  }
  /* The settled layout depends on the state, the frame and whether a ghost is drawn. */
  function layoutKey(p, s) {
    var gs = ghostOf(s), g = gs ? gs.bS : '';
    return [s.seedS, s.bS, s.kS, g, Math.round(p.width), Math.round(p.height), p.phone ? 1 : 0].join('|');
  }

  function drawB(p) {
    var s = cur;
    if (!s) return;
    var C = TP.chart, xOf = function (r) { return pow10(r.v); }, top = CAL.domains.b.y[1];
    /* the ghost: the curve before the reader's last change of the number of buckets */
    var ghost = ghostOf(s);
    if (ghost) {
      segments(ghost.curve).forEach(function (g, j) {
        C.line(p, g.rows, xOf, function (r) { return r.y; }, { role: 'model', series: 'ghost', dash: 'ghost', ghost: false, key: 'ghost-' + j });
      });
    }
    /* In the phone layout (a) stands directly above (b), and (b)'s best trial near the foot of its
       108-px frame would sit under a handle on (b)'s axis, so (b) takes no handle there. */
    sliceMarks(p, s, !p.phone);
    var feas = trialsOf(s, true), inf = trialsOf(s, false);
    C.dots(p, feas, xOf, function (r) { return r.y; }, { role: 'context', series: 'cloud', r: 2, key: function (r) { return r.key; } });
    C.cross(p, inf, xOf, function () { return top; }, { role: 'context', series: 'cloud', key: function (r) { return r.key; } });
    segments(s.curve).forEach(function (g, j) {
      C.line(p, g.rows, xOf, function (r) { return r.y; }, { role: 'model', series: 'curve', key: 'curve-' + j });
    });
    C.markers(p, s.curve, xOf, function (r) { return r.y; }, { role: 'model', series: 'curve', key: function (r) { return r.key; } });
    var items = [];
    var cands = curveCandidates(s), key = layoutKey(p, s), pick = choice[key] != null ? choice[key] : 0;
    var cand = cands[Math.min(pick, cands.length - 1)];
    if (cand && cand.label) {
      items.push({
        id: 'isolation-curve', text: 'isolation curve', role: 'model', series: 'curve', captionNames: true, keySentence: true,
        phone: p.phone ? { header: true } : undefined, feature: cand.label
      });
    } else if (cand) {
      C.annotation(p, { kind: 'callout', id: 'isolation-curve', text: 'isolation curve', captionNames: true, keySentence: true, anchor: cand.callout });
    }
    if (s.ring) {
      C.ring(p, pow10(s.ring.v), s.ring.y, { role: 'model', series: 'curve' });
      C.annotation(p, {
        kind: 'callout', id: 'best-in-slice', text: 'best trial in the slice', phone: { text: 'best in slice' },
        names: 'slice', captionNames: true, keySentence: true,
        anchor: { x: pow10(s.ring.v), y: s.ring.y, r: 11, series: 'curve' }
      });
    }
    C.place(p, items, curCtx);
  }

  function formOf(p, id) {
    var e = TP.chart.labelReport(p).filter(function (x) { return x.id === id || x.id === 'annotation:' + id; })[0];
    return e && !e.fault ? e.form : 'dropped';
  }
  /* After a draw placed from scratch, "isolation curve" tries its candidates in order until the
     placer sets it in its full form (or its phone form in the phone layout), searched from the
     start at every settle, so that its position depends on the settled state alone (DS §5.2). Where
     none succeeds it keeps the first candidate. A held draw reuses the choice. */
  function settleLabels() {
    if (!cur || curCtx.hold) return;
    var key = layoutKey(pb, cur), n = curveCandidates(cur).length;
    var good = function (f) { return f === 'full' || (pb.phone && (f === 'phone' || f === 'header')); };
    var both = function () { return good(formOf(pb, 'isolation-curve')) && (!cur.ring || formOf(pb, 'best-in-slice') !== 'dropped'); };
    /* a layout already settled for this key is taken again, which the search would reach anyway */
    if (settled[key] != null) { choice[key] = settled[key]; pb.update(); return; }
    var first = null;
    for (var i = 0; i < n; i++) {
      choice[key] = i;
      pb.update();
      if (both()) { settled[key] = i; return; }
      if (first == null && good(formOf(pb, 'isolation-curve'))) first = i;
    }
    choice[key] = settled[key] = first == null ? 0 : first;
    pb.update();
  }

  function draw(state, ctx) {
    if (!pa) build(ctx.fig);
    cur = state;
    curCtx = ctx || { hold: false };
    pa.update();
    pb.update();
    settleLabels();
  }

  /* ---------- readout, table, quantities ---------- */

  function valuesOf(state, ctx) {
    if (ctx && ctx.values) return ctx.values;
    return { seed: +state.seedS, buckets: +state.bS, slice: +state.kS };
  }
  function measure(v) {
    var M = model(v.seed, v.buckets, v.slice), s = M.slice;
    return { M: M, lo: pow10(s.v0), hi: pow10(s.v1), n: s.n, nFeasible: s.nFeasible, best: s.best };
  }

  function readout(state, ctx) {
    var q = measure(valuesOf(state, ctx));
    var head = 'The slice from weight decay ' + fmt.exp(q.lo) + ' to ' + fmt.exp(q.hi) + ' holds ' + fmt.int(q.n) + (q.n === 1 ? ' trial' : ' trials');
    if (!q.best) return head + ', none of them feasible, so the isolation curve breaks there.';
    return head + ', and its best, at learning rate ' + fmt.exp(pow10(q.best.u)) + ', has error ' + fmt.err(q.best.y) + '.';
  }

  function table(state, ctx) {
    var v = valuesOf(state, ctx), M = measure(v).M, bestOf = {};
    M.buckets.forEach(function (b) { if (b.best) bestOf[b.best.i] = true; });
    var rows = M.trials.slice().sort(function (a, b) { return a.v - b.v || a.i - b.i; }).map(function (t) {
      var k = I().bucketIndex(t.v, M.B), notes = [];
      if (bestOf[t.i]) notes.push('best in its bucket, on the isolation curve');
      if (k === M.k) notes.push('in the slice');
      if (M.slice.best && M.slice.best.i === t.i) notes.push('ringed');
      return { i: t.i, lr: pow10(t.u), wd: pow10(t.v), y: t.feasible ? fmt.err(t.y) : 'diverged', k: k + 1, note: notes.join('; ') };
    });
    return {
      columns: [
        { key: 'i', label: 'Trial', format: fmt.int },
        { key: 'lr', label: 'Learning rate', format: fmt.exp },
        { key: 'wd', label: 'Weight decay', format: fmt.exp },
        { key: 'y', label: 'Validation error' },
        { key: 'k', label: 'Bucket', format: fmt.int },
        { key: 'note', label: 'Marked' }
      ],
      rows: rows,
      caption: 'The ' + fmt.int(M.trials.length) + ' trials of the study at seed ' + M.seed + ', in order of weight decay, each with its bucket of ' +
        M.B + ' (the slice is bucket ' + (M.k + 1) + ', from ' + rangeText(M.k, M.B) + ')'
    };
  }

  function quantities(state, ctx) {
    var v = valuesOf(state, ctx), q = measure(v), M = q.M;
    var out = {
      buckets: M.B, slice: M.k,
      'slice-low': q.lo, 'slice-high': q.hi, 'slice-trials': q.n, 'slice-feasible': q.nFeasible,
      'winner-lr': q.best ? pow10(q.best.u) : null, 'winner-wd': q.best ? pow10(q.best.v) : null,
      'winner-error': q.best ? q.best.y : null, 'winner-trial': q.best ? q.best.i : null,
      'best-bucket-error': M.lowest ? M.lowest.best.y : null, 'best-bucket': M.lowest ? M.lowest.k : null,
      'infeasible-count': M.infeasible, 'curve-points': M.buckets.filter(function (b) { return b.best; }).length
    };
    var fixed = CAL.quantities || {};
    ['model', 'seed'].forEach(function (setting) {
      var m = fixed[setting] || {};
      Object.keys(m).forEach(function (name) { if (!(name in out)) out[name] = m[name]; });
    });
    return out;
  }

  /* When the reader changes the number of buckets, the slice moves to the bucket that holds the
     previous slice's centre. */
  function constrain(next, prev, changed) {
    var bChanged = changed.indexOf('buckets') >= 0 && next.buckets !== prev.buckets;
    if (bChanged && changed.indexOf('slice') < 0) next.slice = bucketAt(centreOf(prev.slice, prev.buckets), next.buckets);
    return next;
  }

  function init(element) {
    fig = TP.fig(element, {
      kind: 'fixed',
      params: {
        buckets: {
          type: 'number', default: CAL.defaults.buckets, domain: [BUCKET_CHOICES[0], BUCKET_CHOICES[BUCKET_CHOICES.length - 1]],
          snap: BUCKET_CHOICES.slice(), change: 'transition', ghost: true, label: 'Buckets', control: 'segment',
          format: function (b) { return String(b); }
        },
        slice: {
          type: 'number', default: CAL.defaults.slice, snap: 1,
          domain: function (vals) { return [0, (vals.buckets || CAL.defaults.buckets) - 1]; },
          change: 'transition', ghost: false, label: 'Weight-decay slice', control: 'handle', handle: 'a',
          format: function (k) { return rangeText(k, fig ? fig.values().buckets : CAL.defaults.buckets); }
        }
      },
      seed: CAL.seed,
      presets: CAL.presets,
      states: CAL.states,
      apply: apply,
      draw: draw,
      readout: readout,
      table: table,
      quantities: quantities,
      constrain: constrain
    });
  }

  /* ============================== the recap (§6.24, R6) ============================== */

  /* TP.recaps['F6.3:round']: both panels at the worked case's study (F6.3's default study), with no
     slice: (a) the trials and crosses, (b) the cloud and the isolation curve at setting.buckets
     (default 8), the curve's lowest point ringed in both. setting.seed may name another study. */
  TP.recaps['F6.3:round'] = function (el, setting) {
    setting = setting || {};
    var B = BUCKET_CHOICES.indexOf(+setting.buckets) >= 0 ? +setting.buckets : CAL.defaults.buckets;
    var seed = setting.seed ? +setting.seed : CAL.seed;
    var M = model(seed, B, 0), C = TP.chart, dA = CAL.domains.a, dB = CAL.domains.b;
    var rows = M.trials, feas = rows.filter(function (t) { return t.feasible; }), inf = rows.filter(function (t) { return !t.feasible; });
    var curve = curveRows(M), best = M.lowest ? M.lowest.best : null;
    var key = function (t) { return 't' + t.i; };
    var xOf = function (t) { return pow10(t.v); };
    var ticks = function (dom, px) { var out = []; for (var e = dA.x[0]; e <= dA.x[1]; e++) if ((e - dA.x[0]) % 2 === 0 || px >= 300) out.push(pow10(e)); return out; };
    var common = {
      xLog: 10, xDomain: [pow10(dA.x[0]), pow10(dA.x[1])], xLabel: 'weight decay', xFormat: fmt.decade, xTicks: ticks,
      aspect: function (w, phone) { return (phone ? 150 : 200) / Math.max(w, 1); },
      /* the phone margins leave a clear gap between the superscript tick labels and the axis titles,
         inside the worked round's list indent on page 10 (build log, Batch 6) */
      margin: function (w, phone) { return phone ? { t: 6, r: 8, b: 42, l: 58 } : { t: 8, r: 10, b: 40, l: 54 }; }
    };
    function opts(extra) { var o = {}, k; for (k in common) o[k] = common[k]; for (k in extra) o[k] = extra[k]; return o; }
    var qa = C.panel(el, opts({
      letter: '(a)', describe: 'learning rate against weight decay', yLog: 10, yDomain: [pow10(dA.y[0]), pow10(dA.y[1])],
      yLabel: 'learning rate', yFormat: fmt.decade, grid: 'none',
      yTicks: function () { var out = []; for (var e = Math.ceil(dA.y[0]); e <= Math.floor(dA.y[1]); e += 2) out.push(pow10(e)); return out; }
    }));
    var qb = C.panel(el, opts({
      letter: '(b)', describe: 'validation error against weight decay', yDomain: errorDomain(),
      yLabel: 'validation error', yFormat: fmt.fixed1, yTicks: [0.2, 0.4, 0.6, 0.8]
    }));
    /* the two panels stand in a row from 640 px and stack below it (site.css, .recap-stack), where
       side by side each was 138 px wide and panel (b)'s axis kept two tick labels (page 10's
       reader finding 16) */
    el.classList.add('recap-stack');
    qa.update(function (q) {
      C.markers(q, feas, xOf, function (t) { return pow10(t.u); }, { role: 'model', series: 'trials', key: key });
      C.cross(q, inf, xOf, function (t) { return pow10(t.u); }, { role: 'model', series: 'trials', key: key });
      if (best) C.ring(q, xOf(best), pow10(best.u), { role: 'model', series: 'trials' });
      C.place(q, []);
    });
    qb.update(function (q) {
      C.dots(q, feas, xOf, function (t) { return t.y; }, { role: 'context', series: 'cloud', r: 2, key: key });
      C.cross(q, inf, xOf, function () { return dB.y[1]; }, { role: 'context', series: 'cloud', key: key });
      segments(curve).forEach(function (g, j) {
        C.line(q, g.rows, xOf, function (r) { return r.y; }, { role: 'model', series: 'curve', key: 'curve-' + j });
      });
      C.markers(q, curve, xOf, function (r) { return r.y; }, { role: 'model', series: 'curve', key: function (r) { return r.key; } });
      if (best) C.ring(q, xOf(best), best.y, { role: 'model', series: 'curve' });
      C.place(q, []);
    });
  };

  document.addEventListener('tp:ready', function () {
    var el = document.getElementById(ID);
    if (el) init(el);
  });
})();
