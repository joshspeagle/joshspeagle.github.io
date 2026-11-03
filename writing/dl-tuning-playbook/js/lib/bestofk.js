/*
 * bestofk.js: the best of K trials drawn from a pool (TP.bestOfK), for F5.2.
 *
 * Ported from version 1's p5-trials.js (TP.models.trials): the pool of 100 Toy S trials, a study's
 * best, and the type-7 quantiles and boxes are version 1's, with the same numbers. Version 1
 * resampled 1,000 studies per K at once; version 2 draws one study for each K per step of the
 * runtime (R8, R12).
 *
 *   pool(seed)          POOL_SIZE trials of TP.toyS.sampleStudy({n: 100, seed, uRange: U_RANGE,
 *                       vRange: V_RANGE}), each with its 1-based index i. Batch 1 (C2) calibrated
 *                       U_RANGE = [-5, -1.25] and V_RANGE = [-5, -3] so that the interquartile ranges
 *                       of the best of 6 and of 20 match Playbook Figure 3's read values, 0.020 and
 *                       0.0039, within 25% (tests/calibration/fig-best-of-k.calibrate.js). At Toy S's
 *                       default ranges, [-5, -0.5] and [-7, -1], the pool was version 1's.
 *   drawStep(pool, rng) one study for each K of KS, drawn in that order: K pool indices uniformly
 *                       with replacement (rng.int), the playbook's bootstrap (L1782-L1784). A
 *                       study's best is the lowest error among its feasible trials, and 0.8 when
 *                       none is feasible (version 1's rule).
 *   bests(pool, seed, steps)
 *                       the bests of the first `steps` draws of a run. For step t the runtime hands
 *                       advance a generator for TP.prng.deriveSeed(seed, t) (design-system.md §7.5),
 *                       and this function uses the same generators, so a calibration script gets
 *                       the draws the figure shows.
 *
 * BRACKET is the retrain spread, the playbook's +/-0.1% (L1795-L1796) read as +/-0.001 on the toy's
 * error axis, which is also Toy S's trial noise. "Inside the retrain bracket" means an
 * interquartile range of at most 2 BRACKET (implementation plan §5.7, C2). Needs prng.js,
 * halton.js and toyS.js, looked up when called.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var KS = Object.freeze([6, 10, 20, 50]);
  var POOL_SIZE = 100;
  var BRACKET = 0.001;
  var U_RANGE = Object.freeze([-5, -1.25]);  // log10 learning rate of the pool, calibrated by C2 to Playbook Figure 3
  var V_RANGE = Object.freeze([-5, -3]);     // log10 weight decay of the pool, calibrated by C2 to Playbook Figure 3

  function toyS() {
    if (!TP.toyS) throw new Error('TP.bestOfK: load prng.js, halton.js and toyS.js first');
    return TP.toyS;
  }

  /** The pool of POOL_SIZE Toy S trials {i, u, v, y, feasible} for a seed. */
  function pool(seed) {
    var trials = toyS().sampleStudy({ n: POOL_SIZE, seed: seed === undefined ? 1 : seed, uRange: U_RANGE, vRange: V_RANGE });
    trials.forEach(function (t, k) { t.i = k + 1; });
    return trials;
  }

  /** The lowest y among feasible trials, or 0.8 when none is feasible. Version 1's rule. */
  function best(trials) {
    var b = toyS().yInfeasible;
    for (var i = 0; i < trials.length; i++) if (trials[i].feasible && trials[i].y < b) b = trials[i].y;
    return b;
  }

  /**
   * drawStep(pool, rng) -> [{K, indices, best, bestIndex}], one study for each K of KS. indices are
   * 0-based positions in the pool, in the order drawn. bestIndex is the position of the study's
   * best trial (its first draw on a tie), or -1 when none of its trials is feasible.
   */
  function drawStep(list, rng) {
    var cap = toyS().yInfeasible, n = list.length;
    return KS.map(function (K) {
      var indices = new Array(K), b = cap, bi = -1;
      for (var j = 0; j < K; j++) {
        var idx = rng.int(n), t = list[idx];
        indices[j] = idx;
        if (t.feasible && t.y < b) { b = t.y; bi = idx; }
      }
      return { K: K, indices: indices, best: b, bestIndex: bi };
    });
  }

  /**
   * bests(pool, seed, steps) -> {6: Float64Array, 10: ..., 20: ..., 50: ...}: the best of each K's
   * study at steps 1 to `steps`, drawn with the runtime's generator for each step.
   */
  function bests(list, seed, steps) {
    if (!TP.prng) throw new Error('TP.bestOfK: load prng.js first');
    var out = {};
    KS.forEach(function (K) { out[K] = new Float64Array(steps); });
    for (var t = 0; t < steps; t++) {
      drawStep(list, TP.prng.create(TP.prng.deriveSeed(seed, t))).forEach(function (s) { out[s.K][t] = s.best; });
    }
    return out;
  }

  /** Quantile p of an ascending array, linear between order statistics (type 7). Version 1's. */
  function quantile(sortedValues, p) {
    var h = (sortedValues.length - 1) * p, lo = Math.floor(h);
    return lo + 1 < sortedValues.length ? sortedValues[lo] + (h - lo) * (sortedValues[lo + 1] - sortedValues[lo]) : sortedValues[lo];
  }

  /** {min, p05, q25, median, q75, p95, max} of a list of numbers. Version 1's. */
  function box(values) {
    var s = Float64Array.from(values).sort();
    return { min: s[0], p05: quantile(s, 0.05), q25: quantile(s, 0.25), median: quantile(s, 0.5), q75: quantile(s, 0.75), p95: quantile(s, 0.95), max: s[s.length - 1] };
  }

  /** The interquartile range of a list of numbers, with type-7 quantiles. */
  function iqr(values) {
    var s = Float64Array.from(values).sort();
    return quantile(s, 0.75) - quantile(s, 0.25);
  }

  TP.bestOfK = {
    KS: KS,
    POOL_SIZE: POOL_SIZE,
    BRACKET: BRACKET,
    U_RANGE: U_RANGE,
    V_RANGE: V_RANGE,
    pool: pool,
    best: best,
    drawStep: drawStep,
    bests: bests,
    quantile: quantile,
    box: box,
    iqr: iqr
  };
})(typeof window !== 'undefined' ? window : globalThis);
