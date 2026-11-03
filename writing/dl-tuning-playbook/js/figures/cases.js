/*
 * cases.js: the drawn cases of the self-checks (TP.cases).
 *
 * Work order: notes/revamp/implementation-plan.md §6.23 (WO-F.cases). Design:
 * notes/revamp/design-system.md §3.5, §4 and §13.5. A case is a static drawing inside a self-check,
 * with no controls, no readout and no URL key. Its panels are named groups whose SVG is aria-hidden,
 * and the page writer writes a p.sr-only description beside the case that states what the plot
 * shows without stating the answer.
 *
 *   TP.cases['SC3.8'] = function (el, frames) {}   draws into div.case[data-case="SC3.8"]
 *   TP.cases['SC3.8'].frame = function (el) {}      optional: builds the panels' frames, returned
 *                                                   as frames
 *
 * On tp:ready this script finds every div.case[data-case] whose task it registers, builds its frames
 * at once, so that the case holds its final height from the start and its later draw moves nothing
 * on the page, and draws its marks once, when it comes within one viewport of the screen, through
 * TP.whenNear (the observer the figures and recaps share). A drawn case carries data-drawn="true". A div.case whose task no function draws is
 * left alone, because another builder may register it later.
 *
 * SC3.8 (page 6 #density). Two axis plots side by side, (a) and (b), of validation error against
 * learning rate from Toy S at the settings tests/calibration/cases-c2.calibrate.js fixes (C2). (a) is
 * a study with few trials in its good region, (b) a study with a large infeasible fraction. The good
 * region is the site's: the feasible trials whose error lies within 0.02 (SC3.8:model:good-margin)
 * of the best trial's error in the same study, which a reader can count on an axis plot. The
 * cut-offs are the exercise's, since the playbook gives no count or threshold for either check
 * (L890-L897): at most 2 trials in the good region count as too few (SC3.8:model:few-cutoff), at
 * least a third of the trials infeasible counts as a large fraction (SC3.8:model:large-cutoff), and
 * at least 5 trials in the good region count as enough (SC3.8:model:enough-cutoff). Every feasible
 * trial of (a) lies below Toy S's ceiling of 0.8, the value a diverged trial reports. The good region
 * of each plot is drawn as a model-blue band from the best trial's error to 0.02 above it, named "good
 * region" (SC38.good), so that the trials in it can be counted (Batch 7, the in-order reader's finding
 * 11). (a)'s y axis ends at 0.65 and (b)'s at the ceiling, 0.8, and the seed keeps every other trial
 * of (a) at least 0.015 from the band's edge and every two of its markers at least 12 px apart. Each
 * trial is a filled model-blue marker, and an infeasible trial is a model-blue cross at the top edge
 * of its frame (DS §4.5). Each header names its count as "k of n diverged". The x axis of each plot
 * runs over its study's own search range. The block SC38 below is copied from
 * tests/calibration/out/cases-c2.json (tables.a, tables.b, the seed) and the calibration script's
 * domains, and tests/browser/figures/fig-baseline.check.js fails when it differs from them.
 *
 * SC5.1 (page 8 #regimes). Two frames side by side, (a) and (b), each a training loss (third gold,
 * open circles) and a validation error (model blue, filled circles) against step, drawn by
 * TP.gallery.curve from the specs of tests/calibration/cases-c3.calibrate.js (C3): (a) still
 * improving at the end (tau 0.1, then a linear fall to the last step), (b) saturated long before it
 * (tau 0.07, level at higher errors than the recap's panel), each with light noise
 * from a fixed seed. The direct labels stand in (a) alone, and no annotation marks either curve's
 * feature, because the reader classifies them. The page loads prng.js, curves.js and gallery.js.
 * The block SC51 below is copied from tests/calibration/out/cases-c3.json (the domains, tables.specs).
 *
 * SC5.5 (page 8 #extend). One frame of a new linear Round 1, constant for its first half and
 * decaying linearly over its second, in context grey as F8.3 draws Round 1, with brackets on the
 * step axis naming "constant phase" and "decay", on a step axis that runs to Round 2's length, twice
 * Round 1's. No Round 2 is drawn. The block CASES_C7 below is copied from
 * tests/calibration/out/cases-c7.json (tables.SC4.2 and tables.SC5.5), and SC5.5 reads Round 2's
 * length and Round 1's constant fraction from the pitfall's steps below half the base rate in
 * tables.SC5.5.below (sc55Shape). tests/browser/figures/fig-extend.check.js fails when either block
 * differs from its out file. SC5.5 draws its marks with its frame, at tp:ready, because a bracket's
 * name that moves to the panel's header on a phone would otherwise change the case's height when it
 * comes into view (fillSchedule).
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};
  TP.cases = TP.cases || {};

  /* BEGIN COPIED cases-c2 */
  // From tests/calibration/out/cases-c2.json (the seed, the domains, tables.a, tables.b,
  // tables.good) by npm run generate (tests/lib/write-generated.js). Not edited by hand.
  var SC38 = {
    "seed": 145,
    "domains": {"a": {"x": [-5, -1.5], "y": [0.2, 0.65]}, "b": {"x": [-4, 0], "y": [0.2, 0.8]}},
    "a": [
      {"u": -3.6401, "v": -4.7539, "y": 0.31316, "feasible": true},
      {"u": -4.5151, "v": -4.0872, "y": 0.46231, "feasible": true},
      {"u": -2.7651, "v": -4.3095, "y": 0.23521, "feasible": true},
      {"u": -4.9526, "v": -4.6428, "y": 0.59673, "feasible": true},
      {"u": -3.2026, "v": -4.9761, "y": 0.27043, "feasible": true},
      {"u": -4.0776, "v": -4.1984, "y": 0.37515, "feasible": true},
      {"u": -2.3276, "v": -4.5317, "y": 0.23256, "feasible": true},
      {"u": -1.6714, "v": -4.865, "y": 0.27065, "feasible": true}
    ],
    "b": [
      {"u": -2.4459, "v": -4.7539, "y": 0.22988, "feasible": true},
      {"u": -3.4459, "v": -4.0872, "y": 0.28029, "feasible": true},
      {"u": -1.4459, "v": -4.3095, "y": 0.8, "feasible": false},
      {"u": -3.9459, "v": -4.6428, "y": 0.35865, "feasible": true},
      {"u": -1.9459, "v": -4.9761, "y": 0.24846, "feasible": true},
      {"u": -2.9459, "v": -4.1984, "y": 0.24389, "feasible": true},
      {"u": -0.9459, "v": -4.5317, "y": 0.8, "feasible": false},
      {"u": -0.1959, "v": -4.865, "y": 0.8, "feasible": false},
      {"u": -2.1959, "v": -4.3835, "y": 0.23761, "feasible": true},
      {"u": -3.1959, "v": -4.7169, "y": 0.26167, "feasible": true},
      {"u": -1.1959, "v": -4.0502, "y": 0.8, "feasible": false},
      {"u": -3.6959, "v": -4.2724, "y": 0.31258, "feasible": true},
      {"u": -1.6959, "v": -4.6058, "y": 0.26625, "feasible": true},
      {"u": -2.6959, "v": -4.9391, "y": 0.23803, "feasible": true},
      {"u": -0.6959, "v": -4.1613, "y": 0.8, "feasible": false},
      {"u": -0.3209, "v": -4.4947, "y": 0.8, "feasible": false},
      {"u": -2.3209, "v": -4.828, "y": 0.23176, "feasible": true},
      {"u": -3.3209, "v": -4.3465, "y": 0.26866, "feasible": true},
      {"u": -1.3209, "v": -4.6798, "y": 0.8, "feasible": false},
      {"u": -3.8209, "v": -4.0132, "y": 0.32701, "feasible": true},
      {"u": -1.8209, "v": -4.2354, "y": 0.26351, "feasible": true},
      {"u": -2.8209, "v": -4.5687, "y": 0.23545, "feasible": true},
      {"u": -0.8209, "v": -4.9021, "y": 0.8, "feasible": false},
      {"u": -0.0709, "v": -4.1243, "y": 0.8, "feasible": false}
    ],
    "good": {"a": [0.23256, 0.25256], "b": [0.22988, 0.24988]}
  };
  /* END COPIED cases-c2 */

  /* BEGIN COPIED cases-c3 */
  // From tests/calibration/out/cases-c3.json (the domains, tables.specs) by npm run generate
  // (tests/lib/write-generated.js). Not edited by hand.
  var SC51 = {
    "domains": {"a": {"x": [0, 10000], "y": [0, 0.75]}, "b": {"x": [0, 10000], "y": [0, 0.75]}},
    "specs": {
      "a": {
        "tau": 0.1,
        "train": 0.13,
        "val": 0.23,
        "rise": {"from": 0.2, "slope": -0.14},
        "noise": {"train": 0.001, "val": 0.003, "seed": 21}
      },
      "b": {
        "tau": 0.07,
        "train": 0.28,
        "val": 0.45,
        "noise": {"train": 0.001, "val": 0.003, "seed": 22}
      }
    }
  };
  /* END COPIED cases-c3 */

  /* BEGIN COPIED cases-c7 */
  // From tests/calibration/out/cases-c7.json (tables.SC4.2, tables.SC5.5) by npm run generate
  // (tests/lib/write-generated.js). Not edited by hand.
  var CASES_C7 = {
    "SC4.2": {
      "inside": {
        "seed": 1,
        "incumbent": {
          "runs": [23.054764792023196, 23.108026780282074, 22.900137432873215, 23.059449235600212, 22.981713304783426],
          "mean": 23.020818309112425,
          "sd": 0.08115279551662467
        },
        "candidate": {
          "runs": [22.92942606460742, 23.09317815841785, 22.85990702000867, 22.943944049147284, 22.984708562163213],
          "mean": 22.962232770868887,
          "sd": 0.08592609080172094
        },
        "gain": 0.05858553824353763,
        "seDiff": 0.052856540372273116
      },
      "outside": {
        "seed": 2,
        "incumbent": {
          "runs": [23.005286615941422, 23.07803404370523, 23.00371680905137, 23.001363649138483, 22.98799394212412],
          "mean": 23.015279011992124,
          "sd": 0.0357415685237892
        },
        "candidate": {
          "runs": [22.50652901542028, 22.739745314952227, 22.511074791178277, 22.66324677751178, 22.77235192089252],
          "mean": 22.638589563991015,
          "sd": 0.12493281997688625
        },
        "gain": 0.37668944800110893,
        "seDiff": 0.05811311250985923
      }
    },
    "SC5.5": {
      "schedules": [
        {"t": 0, "round1": 1, "pitfall": 1, "extension": 1},
        {"t": 0.04081632653061224, "round1": 1, "pitfall": 1, "extension": 1},
        {"t": 0.08163265306122448, "round1": 1, "pitfall": 1, "extension": 1},
        {"t": 0.12244897959183673, "round1": 1, "pitfall": 1, "extension": 1},
        {"t": 0.16326530612244897, "round1": 1, "pitfall": 1, "extension": 1},
        {"t": 0.20408163265306123, "round1": 1, "pitfall": 1, "extension": 1},
        {"t": 0.24489795918367346, "round1": 1, "pitfall": 1, "extension": 1},
        {"t": 0.2857142857142857, "round1": 1, "pitfall": 1, "extension": 1},
        {"t": 0.32653061224489793, "round1": 1, "pitfall": 1, "extension": 1},
        {"t": 0.3673469387755102, "round1": 1, "pitfall": 1, "extension": 1},
        {"t": 0.40816326530612246, "round1": 1, "pitfall": 1, "extension": 1},
        {"t": 0.4489795918367347, "round1": 1, "pitfall": 1, "extension": 1},
        {"t": 0.4897959183673469, "round1": 1, "pitfall": 1, "extension": 1},
        {
          "t": 0.5306122448979592,
          "round1": 0.9387755102040816,
          "pitfall": 0.9387755102040816,
          "extension": 1
        },
        {
          "t": 0.5714285714285714,
          "round1": 0.8571428571428572,
          "pitfall": 0.8571428571428572,
          "extension": 1
        },
        {
          "t": 0.6122448979591837,
          "round1": 0.7755102040816326,
          "pitfall": 0.7755102040816326,
          "extension": 1
        },
        {
          "t": 0.6530612244897959,
          "round1": 0.6938775510204083,
          "pitfall": 0.6938775510204083,
          "extension": 1
        },
        {
          "t": 0.6938775510204082,
          "round1": 0.6122448979591837,
          "pitfall": 0.6122448979591837,
          "extension": 1
        },
        {
          "t": 0.7346938775510204,
          "round1": 0.5306122448979591,
          "pitfall": 0.5306122448979591,
          "extension": 1
        },
        {
          "t": 0.7755102040816326,
          "round1": 0.44897959183673475,
          "pitfall": 0.44897959183673475,
          "extension": 1
        },
        {
          "t": 0.8163265306122449,
          "round1": 0.36734693877551017,
          "pitfall": 0.36734693877551017,
          "extension": 1
        },
        {
          "t": 0.8571428571428571,
          "round1": 0.2857142857142858,
          "pitfall": 0.2857142857142858,
          "extension": 1
        },
        {
          "t": 0.8979591836734694,
          "round1": 0.20408163265306123,
          "pitfall": 0.20408163265306123,
          "extension": 1
        },
        {
          "t": 0.9387755102040817,
          "round1": 0.12244897959183665,
          "pitfall": 0.12244897959183665,
          "extension": 1
        },
        {
          "t": 0.9795918367346939,
          "round1": 0.04081632653061229,
          "pitfall": 0.04081632653061229,
          "extension": 1
        },
        {"t": 1.0204081632653061, "round1": null, "pitfall": 0, "extension": 1},
        {"t": 1.0612244897959184, "round1": null, "pitfall": 0, "extension": 1},
        {"t": 1.1020408163265305, "round1": null, "pitfall": 0, "extension": 1},
        {"t": 1.1428571428571428, "round1": null, "pitfall": 0, "extension": 1},
        {"t": 1.183673469387755, "round1": null, "pitfall": 0, "extension": 1},
        {"t": 1.2244897959183674, "round1": null, "pitfall": 0, "extension": 1},
        {"t": 1.2653061224489797, "round1": null, "pitfall": 0, "extension": 1},
        {"t": 1.3061224489795917, "round1": null, "pitfall": 0, "extension": 1},
        {"t": 1.346938775510204, "round1": null, "pitfall": 0, "extension": 1},
        {"t": 1.3877551020408163, "round1": null, "pitfall": 0, "extension": 1},
        {"t": 1.4285714285714286, "round1": null, "pitfall": 0, "extension": 1},
        {"t": 1.469387755102041, "round1": null, "pitfall": 0, "extension": 1},
        {"t": 1.510204081632653, "round1": null, "pitfall": 0, "extension": 0.9795918367346941},
        {"t": 1.5510204081632653, "round1": null, "pitfall": 0, "extension": 0.8979591836734695},
        {"t": 1.5918367346938775, "round1": null, "pitfall": 0, "extension": 0.8163265306122449},
        {"t": 1.6326530612244898, "round1": null, "pitfall": 0, "extension": 0.7346938775510203},
        {"t": 1.6734693877551021, "round1": null, "pitfall": 0, "extension": 0.6530612244897958},
        {"t": 1.7142857142857142, "round1": null, "pitfall": 0, "extension": 0.5714285714285716},
        {"t": 1.7551020408163265, "round1": null, "pitfall": 0, "extension": 0.48979591836734704},
        {"t": 1.7959183673469388, "round1": null, "pitfall": 0, "extension": 0.40816326530612246},
        {"t": 1.836734693877551, "round1": null, "pitfall": 0, "extension": 0.3265306122448979},
        {"t": 1.8775510204081634, "round1": null, "pitfall": 0, "extension": 0.2448979591836733},
        {"t": 1.9183673469387754, "round1": null, "pitfall": 0, "extension": 0.16326530612244916},
        {"t": 1.9591836734693877, "round1": null, "pitfall": 0, "extension": 0.08163265306122458},
        {"t": 2, "round1": null, "pitfall": 0, "extension": 0}
      ],
      "below": {"pitfall": [[0.75, 2]], "extension": [[1.75, 2]]}
    }
  };
  /* END COPIED cases-c7 */

  function pow10(u) { return Math.pow(10, u); }
  function decade(v) { return TP.fmt.exp10(Math.round(Math.log(v) / Math.LN10)); }

  /* one axis plot of SC3.8: trials over the study's range, crosses at the top edge */
  function axisPlot(el, letter) {
    var C = TP.chart, rows = SC38[letter], dom = SC38.domains[letter];
    var n = rows.length, k = rows.filter(function (r) { return !r.feasible; }).length;
    var p = C.panel(el, {
      letter: '(' + letter + ')',
      describe: 'validation error against learning rate',
      note: TP.fmt.int(k) + ' of ' + TP.fmt.int(n) + ' diverged',
      xLog: 10, xDomain: [pow10(dom.x[0]), pow10(dom.x[1])], yDomain: dom.y.slice(),
      xLabel: 'learning rate', yLabel: 'validation error',
      xTicks: function (d, px) {
        var lo = Math.ceil(dom.x[0] - 1e-9), hi = Math.floor(dom.x[1] + 1e-9), step = px < 170 ? 2 : 1, out = [];
        for (var e = lo; e <= hi; e += step) out.push(pow10(e));
        return out;
      },
      xFormat: decade,
      yTicks: dom.y[1] < 0.8 ? [0.2, 0.3, 0.4, 0.5, 0.6] : [0.2, 0.4, 0.6, 0.8],
      yFormat: function (v) { return TP.fmt.byName('fixed1')(v); },
      aspect: function (w, phone) { return phone ? 0.72 : 0.7; },
      maxHeight: function (w, phone) { return phone ? 200 : 230; },
      margin: function (w, phone) { return phone ? { t: 8, r: 10, b: 36, l: 46 } : { t: 10, r: 12, b: 42, l: 54 }; }
    });
    p.el.setAttribute('data-trials', String(n));
    p.el.setAttribute('data-diverged', String(k));
    return p;
  }
  /* its marks, drawn when the case comes near */
  function fillPlot(p, letter) {
    var C = TP.chart, rows = SC38[letter];
    p.update(function (q) {
      var X = function (r) { return pow10(r.u); }, key = function (r, i) { return letter + i; };
      /* the site's good region: the best trial's error to the margin above it */
      var g = SC38.good[letter];
      C.band(q, g[0], g[1], { axis: 'y', role: 'model', id: 'good-' + letter, key: 'good-' + letter, name: 'good region', phone: { header: true }, captionNames: true });
      C.markers(q, rows.filter(function (r) { return r.feasible; }), X, function (r) { return r.y; },
        { role: 'model', series: 'trials', shape: 'circle', fill: 'filled', key: key });
      /* an infeasible trial's result is undefined, so its cross stands at the top edge (DS §4.5) */
      C.cross(q, rows.filter(function (r) { return !r.feasible; }), X, function () { return null; },
        { role: 'model', series: 'trials', edge: 'top', key: function (r, i) { return letter + 'x' + i; } });
      C.place(q, []);
    });
    return p;
  }

  TP.cases['SC3.8'] = function (el, frames) {
    fillPlot(frames[0], 'a');
    fillPlot(frames[1], 'b');
  };
  TP.cases['SC3.8'].frame = function (el) { return [axisPlot(el, 'a'), axisPlot(el, 'b')]; };

  /* ---------- SC5.1 (page 8 #regimes) ---------- */

  function stepFmt(v) { return v === 0 ? '0' : TP.fmt.int(v / 1000) + 'k'; }
  /* one frame of SC5.1: the training loss and the validation error of one spec against step */
  function curvePlot(el, letter) {
    var dom = SC51.domains[letter];
    return TP.chart.panel(el, {
      letter: '(' + letter + ')',
      describe: 'training loss and validation error against step',
      xDomain: dom.x.slice(), yDomain: dom.y.slice(),
      xLabel: 'step', yLabel: 'error',
      xTicks: [0, 5000, 10000], xFormat: stepFmt, xMinGap: 20,
      yTicks: [0, 0.25, 0.5, 0.75], yFormat: function (v) { return String(+v.toFixed(2)); },
      aspect: function (w, phone) { return phone ? 0.5 : 0.62; },
      maxHeight: function (w, phone) { return phone ? 170 : 230; },
      margin: function (w, phone) { return phone ? { t: 8, r: 12, b: 34, l: 46 } : { t: 10, r: 14, b: 38, l: 54 }; }
    });
  }
  /* its marks: the curve family's curves at the spec's settings (TP.gallery.curve), with noise from
     the spec's fixed seeds, in the gallery's tokens (DS §2.3 rule 2). The direct labels stand in (a)
     alone, since both frames draw the same two series in the same tokens, and no annotation marks a
     feature, because the reader classifies the curves. */
  function fillCurves(p, letter) {
    var C = TP.chart, c = TP.gallery.curve(SC51.specs[letter]);
    var S = function (q) { return q.step; };
    p.el.setAttribute('data-spec', letter);
    p.update(function (q) {
      C.line(q, c.points, S, function (r) { return r.train; }, { role: 'third', series: 'train', key: 'train' });
      C.line(q, c.points, S, function (r) { return r.val; }, { role: 'model', series: 'val', key: 'val' });
      C.markers(q, c.points, S, function (r) { return r.train; }, { role: 'third', series: 'train', key: 'train', fill: 'open', thin: 44 });
      C.markers(q, c.points, S, function (r) { return r.val; }, { role: 'model', series: 'val', key: 'val', fill: 'filled', thin: 44 });
      C.place(q, letter !== 'a' ? [] : [
        { id: 'val', text: 'validation error', role: 'model', series: 'val', feature: { type: 'line', of: 'val' }, phone: { text: 'validation' } },
        { id: 'train', text: 'training loss', role: 'third', series: 'train', feature: { type: 'line', of: 'train' }, phone: { text: 'training' } }
      ]);
    });
    return p;
  }
  TP.cases['SC5.1'] = function (el, frames) {
    fillCurves(frames[0], 'a');
    fillCurves(frames[1], 'b');
  };
  TP.cases['SC5.1'].frame = function (el) { return [curvePlot(el, 'a'), curvePlot(el, 'b')]; };

  /* ---------- SC5.5 (page 8 #extend) ---------- */

  /* SC5.5's Round 1 and Round 2 from the block cases-c7. Round 2's length k is where the pitfall's
     steps below half the base rate end, and Round 1's constant fraction c follows from where they
     start, 1 - (1 - c) / 2 (TP.schedules.belowHalf), so the drawing reads both from the calibration. */
  function sc55Shape() {
    var T = CASES_C7['SC5.5'], iv = T.below.pitfall[0];
    var k = iv[1], c = 2 * iv[0] - 1;
    return { k: k, c: c, rows: T.schedules };
  }
  function schedulePlot(el) {
    var s = sc55Shape(), ticks = [];
    for (var i = 0; i <= 2 * s.k; i++) ticks.push(i / 2);
    return TP.chart.panel(el, {
      describe: 'learning rate against step, a new linear Round 1',
      xDomain: [0, s.k], yDomain: [0, 1],
      xLabel: 'step / Round 1’s length',
      yLabel: function (p) { return p.phone ? 'rate / base rate' : 'learning rate / base rate'; },
      xTicks: ticks, xFormat: function (v) { return String(v); },
      yTicks: [0, 0.5, 1], yFormat: function (v) { return String(v); },
      aspect: function (w, phone) { return phone ? 0.55 : 0.46; },
      maxHeight: function (w, phone) { return phone ? 190 : 240; },
      margin: function (w, phone) { return phone ? { t: 10, r: 14, b: 36, l: 50 } : { t: 12, r: 16, b: 40, l: 58 }; }
    });
  }
  /* Round 1 in context grey, as F8.3 draws it, with its constant phase and its decay marked by
     brackets on the step axis (DS §5.10). No Round 2 schedule is drawn, since the reader chooses it.
     On a phone the two spans are about 65 px wide, and one bracket's name stands in the panel's
     header (DS §5.6). A header that filled when the marks are drawn would move the page below the
     case, so this case draws its marks with its frame at tp:ready: one line and two brackets, which
     cost little. */
  function fillSchedule(p) {
    var C = TP.chart, s = sc55Shape();
    var pts = [[0, 1], [s.c, 1], [1, 0]];
    p.el.setAttribute('data-shape', JSON.stringify({ k: s.k, c: s.c }));
    p.update(function (q) {
      C.line(q, pts, function (r) { return r[0]; }, function (r) { return r[1]; }, { role: 'context', series: 'round1', key: 'round1' });
      C.annotation(q, { kind: 'bracket', id: 'constant', text: 'constant phase', side: 'above', anchor: { x0: 0, x1: s.c } });
      C.annotation(q, { kind: 'bracket', id: 'decay', text: 'decay', side: 'above', anchor: { x0: s.c, x1: 1 } });
      C.place(q, [{ id: 'round1', text: 'Round 1', role: 'context', series: 'round1', tone: 'ink', feature: { type: 'line', of: 'round1' } }]);
    });
    return p;
  }
  TP.cases['SC5.5'] = function () { /* drawn with its frame, below */ };
  TP.cases['SC5.5'].frame = function (el) { return [fillSchedule(schedulePlot(el))]; };

  document.addEventListener('tp:ready', function () {
    Array.prototype.forEach.call(document.querySelectorAll('div.case[data-case]'), function (el) {
      var fn = TP.cases[el.getAttribute('data-case')];
      if (typeof fn !== 'function') return;
      /* the frames at once, so that the case has its height before its marks are drawn and a
         case drawn near the screen moves nothing below it */
      var frames = typeof fn.frame === 'function' ? fn.frame(el) : null;
      TP.whenNear(el, function () {
        if (el.getAttribute('data-drawn') === 'true') return;
        fn(el, frames);
        el.setAttribute('data-drawn', 'true');
      });
    });
  });
})();
