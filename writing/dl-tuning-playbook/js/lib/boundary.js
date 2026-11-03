/*
 * boundary.js: a Toy S study inside a learning-rate window and the site's edge zones (TP.boundary),
 * for F6.1 and the worked case's edge count.
 *
 * Ported from version 1's p6-boundary.js (TP.models.boundaryRules and boundaryCheck, here RULES and
 * check), with its numbers unchanged. Version 2 reads the study through the parts R9 names:
 *
 *   study({lo, hi, n, seed})  n Toy S trials with u = log10 learning rate in the window [lo, hi]
 *                             and v = log10 weight decay over Toy S's range (TP.toyS.sampleStudy).
 *                             Trial k sits at Halton point k, whose base-2 coordinate h_k maps to
 *                             u_k = lo + h_k (hi - lo), and its noise is normal k of the seed's
 *                             noise stream, so a move of either bound moves every trial
 *                             continuously and changes no trial's weight decay or noise (R9).
 *   best3(trials)             the three lowest feasible trials, best first, marked as a set.
 *   edgeCounts(best3, lo, hi) how many of them lie in the upper and the lower edge zone. Each zone
 *                             is the outer EDGE = 10% of the window, the site's: u > hi - 0.1 w or
 *                             u < lo + 0.1 w with w = hi - lo (version 1's near-edge zone).
 *   envelope(u)               the lowest noise-free error over weight decay at learning rate u,
 *                             drawn by F6.1's "show the whole curve" preset.
 *
 * check(trials, lo, hi) is version 1's full rule: the near-edge verdict, its caveats, and the
 * instability rule of README L873-L879 in the site's operational reading. F6.1's readout reports
 * the edge counts alone (R9), and check stays for the worked case and the tests. Needs prng.js,
 * halton.js and toyS.js, looked up when called.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var EDGE = 0.10;
  var RULES = Object.freeze({ edge: EDGE, caution: 0.2, instability: 0.3, minInfeasible: 4, highest: 2, need: 2, top: 3, fewFeasible: 25 });

  function toyS() {
    if (!TP.toyS) throw new Error('TP.boundary: load prng.js, halton.js and toyS.js first');
    return TP.toyS;
  }

  /**
   * check(trials, lo, hi): version 1's near-edge and instability rules. trials: [{u, v, y,
   * feasible}]. Returns {kind: 'upper' | 'lower' | 'interior' | 'instability' | 'none', stars (the
   * top 3, best first), nUpper, nLower, upperEdge, lowerEdge, nUpperCaution, nLowerCaution (top-3
   * trials in the outer 20% of the range), upperCaution, lowerCaution, caveat, uF (smallest
   * infeasible u or null), gap (uF - u of the best trial, or null), wall (every trial above uF is
   * infeasible), highest (the best trial is one of the 2 feasible trials with the largest u),
   * nFeasible, nInfeasible}. caveat is null except on an interior verdict that is uncertain: 'few'
   * (fewer than 25 feasible trials), else 'upper', 'lower' or 'both' (the sides whose outer 20%
   * holds a top-3 trial).
   */
  function check(trials, lo, hi) {
    var feasible = trials.filter(function (t) { return t.feasible; }).sort(function (a, b) { return a.y - b.y; });
    var infeasible = trials.filter(function (t) { return !t.feasible; });
    var stars = feasible.slice(0, RULES.top);
    var w = hi - lo, upperEdge = hi - RULES.edge * w, lowerEdge = lo + RULES.edge * w;
    var upperCaution = hi - RULES.caution * w, lowerCaution = lo + RULES.caution * w;
    var nUpper = stars.filter(function (t) { return t.u > upperEdge; }).length;
    var nLower = stars.filter(function (t) { return t.u < lowerEdge; }).length;
    var nUpperCaution = stars.filter(function (t) { return t.u > upperCaution; }).length;
    var nLowerCaution = stars.filter(function (t) { return t.u < lowerCaution; }).length;
    var need = Math.min(RULES.need, stars.length);
    /* the best trial alone in an edge zone is enough; otherwise 2 of the top 3 in the same zone */
    var bestZone = !stars.length ? null : stars[0].u > upperEdge ? 'upper' : stars[0].u < lowerEdge ? 'lower' : null;
    var kind = !stars.length ? 'none' : bestZone ? bestZone : nUpper >= need ? 'upper' : nLower >= need ? 'lower' : 'interior';
    var uF = null, wall = false, gap = null, highest = false;
    if (infeasible.length) {
      uF = Math.min.apply(null, infeasible.map(function (t) { return t.u; }));
      wall = trials.every(function (t) { return t.u <= uF || !t.feasible; });
      if (stars.length) {
        gap = uF - stars[0].u;
        /* fewer than 2 feasible trials sit at a larger learning rate than the best one */
        highest = feasible.filter(function (t) { return t.u > stars[0].u; }).length < RULES.highest;
      }
    }
    if (stars.length && wall && infeasible.length >= RULES.minInfeasible && (gap < RULES.instability || highest)) kind = 'instability';
    /* an interior verdict is uncertain with few feasible trials, or with a top-3 trial in the outer 20% */
    var caveat = null;
    if (kind === 'interior') {
      caveat = feasible.length < RULES.fewFeasible ? 'few'
        : nUpperCaution && nLowerCaution ? 'both' : nUpperCaution ? 'upper' : nLowerCaution ? 'lower' : null;
    }
    return {
      kind: kind, stars: stars, nUpper: nUpper, nLower: nLower, upperEdge: upperEdge, lowerEdge: lowerEdge,
      nUpperCaution: nUpperCaution, nLowerCaution: nLowerCaution, upperCaution: upperCaution, lowerCaution: lowerCaution,
      caveat: caveat, uF: uF, gap: gap, wall: wall, highest: highest, nFeasible: feasible.length, nInfeasible: infeasible.length
    };
  }

  /**
   * study({lo, hi, n, seed = 1, uDiv, sigma, vRange}) -> [{i, u, v, y, feasible}]: n Toy S trials
   * in the learning-rate window [lo, hi] (log10 units), i the 1-based Halton index. The unset
   * options are Toy S's defaults.
   */
  function study(o) {
    var trials = toyS().sampleStudy({
      n: o.n, seed: o.seed === undefined ? 1 : o.seed, uRange: [o.lo, o.hi],
      vRange: o.vRange, uDiv: o.uDiv, sigma: o.sigma
    });
    trials.forEach(function (t, k) { t.i = k + 1; });
    return trials;
  }

  /** The three lowest feasible trials, best first (fewer when fewer are feasible). */
  function best3(trials) {
    return trials.filter(function (t) { return t.feasible; })
      .sort(function (a, b) { return a.y - b.y; })
      .slice(0, RULES.top);
  }

  /**
   * edgeCounts(best3, lo, hi) -> {upper, lower, upperEdge, lowerEdge}: how many of the trials lie
   * above upperEdge = hi - EDGE (hi - lo) and below lowerEdge = lo + EDGE (hi - lo).
   */
  function edgeCounts(stars, lo, hi) {
    var w = hi - lo, upperEdge = hi - EDGE * w, lowerEdge = lo + EDGE * w;
    return {
      upper: stars.filter(function (t) { return t.u > upperEdge; }).length,
      lower: stars.filter(function (t) { return t.u < lowerEdge; }).length,
      upperEdge: upperEdge,
      lowerEdge: lowerEdge
    };
  }

  /**
   * envelope(u, vRange = Toy S's) -> {y, v}: the lowest noise-free error min over v of E(u, v), and
   * the weight decay where it occurs. A grid of steps of 0.01 in v is refined by golden-section
   * search around its best point, because pen(v) below v* is not convex. The value ignores the
   * divergence threshold, and a figure stops the curve at uDiv.
   */
  function envelope(u, vRange) {
    var S = toyS(), r = vRange || S.defaults.vRange, steps = Math.max(1, Math.ceil((r[1] - r[0]) / 0.01));
    var bv = r[0], by = S.error(u, r[0]);
    for (var i = 1; i <= steps; i++) {
      var v = r[0] + (r[1] - r[0]) * i / steps, y = S.error(u, v);
      if (y < by) { by = y; bv = v; }
    }
    var h = (r[1] - r[0]) / steps, a = Math.max(r[0], bv - h), b = Math.min(r[1], bv + h);
    var g = (Math.sqrt(5) - 1) / 2, c = b - g * (b - a), d = a + g * (b - a), fc = S.error(u, c), fd = S.error(u, d);
    for (var k = 0; k < 60; k++) {
      if (fc <= fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = S.error(u, c); }
      else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = S.error(u, d); }
    }
    var vm = fc <= fd ? c : d, ym = Math.min(fc, fd);
    return ym < by ? { y: ym, v: vm } : { y: by, v: bv };
  }

  TP.boundary = {
    EDGE: EDGE,
    RULES: RULES,
    check: check,
    study: study,
    best3: best3,
    edgeCounts: edgeCounts,
    envelope: envelope
  };
})(typeof window !== 'undefined' ? window : globalThis);
