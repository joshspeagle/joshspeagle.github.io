/*
 * isolation.js: an isolation plot built from a Toy S study (TP.isolation), for F6.3, its recap and
 * the worked case.
 *
 * Ported from version 1's p6-isolation.js (TP.models.isolationStudy and isolationDesign), with its
 * numbers unchanged, and split into the parts the figure and the worked case use:
 *
 *   study({n, seed})      n Toy S trials at scrambled, shifted Halton points over u = log10 learning
 *                         rate in U_RANGE = [-5, -0.5] and v = log10 weight decay in V_RANGE =
 *                         [-7, -1], with sigma = 0.001 and infeasible trials above U_DIV = -1.5.
 *   buckets(trials, B)    B equal-width buckets of weight decay over V_RANGE. A trial at v falls in
 *                         bucket floor((v + 7) / w), w = 6 / B, clamped to 0..B-1 (bucketIndex).
 *   winner(bucket)        the bucket's feasible trial with the lowest error, or null. An empty
 *                         bucket breaks the isolation curve.
 *   baseline({n, seed})   a study without weight decay over the full learning-rate range: n
 *                         learning rates from a scrambled, shifted van der Corput sequence over
 *                         U_RANGE on Toy S's E_none, with the same noise and divergence. Its
 *                         streams are version 1's: the sequence is seeded with
 *                         bs = TP.prng.deriveSeed(seed, 'isolation:baseline') and the noise is
 *                         TP.prng.create(TP.prng.deriveSeed(bs, 'noise')). Version 1's equally
 *                         tuned baseline had round(N / B) trials, BASELINE_N = 13 at 100 trials and
 *                         8 buckets, the default here until the worked case fixes it (§5.8).
 *
 * Version 1's "Playbook Fig. 2 design" (five fixed weight decays) and its include-or-exclude
 * verdict are not ported, because F6.3 draws neither (R2). Needs prng.js, halton.js and toyS.js,
 * looked up when called.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var U_RANGE = Object.freeze([-5, -0.5]);
  var V_RANGE = Object.freeze([-7, -1]);
  var U_DIV = -1.5;
  var N = 100;           // trials in F6.3's study (FP F6.3)
  var BUCKETS = 8;       // F6.3's default number of buckets
  var BASELINE_N = 13;   // version 1's round(N / B) at the defaults (the worked case, §5.8)

  function toyS() {
    if (!TP.toyS) throw new Error('TP.isolation: load prng.js, halton.js and toyS.js first');
    return TP.toyS;
  }

  function clipY(y) { return Math.max(0, Math.min(toyS().yInfeasible, y)); }

  /** study({n = 100, seed = 1}) -> [{i, u, v, y, feasible}], i the 1-based index. */
  function study(o) {
    o = o || {};
    var S = toyS();
    var trials = S.sampleStudy({
      n: o.n === undefined ? N : o.n, seed: o.seed === undefined ? 1 : o.seed,
      uRange: U_RANGE, vRange: V_RANGE, uDiv: U_DIV, sigma: S.defaults.sigma
    });
    trials.forEach(function (t, k) { t.i = k + 1; });
    return trials;
  }

  /** The bucket of weight decay v among B equal-width buckets over V_RANGE, clamped to 0..B-1. */
  function bucketIndex(v, B) {
    var w = (V_RANGE[1] - V_RANGE[0]) / B;
    return Math.max(0, Math.min(B - 1, Math.floor((v - V_RANGE[0]) / w)));
  }

  /** The lowest feasible trial of a bucket (or of any list of trials), or null. */
  function winner(bucket) {
    var list = Array.isArray(bucket) ? bucket : bucket.trials, b = null;
    list.forEach(function (t) { if (t.feasible && (!b || t.y < b.y)) b = t; });
    return b;
  }

  /**
   * buckets(trials, B = 8) -> [{k, v0, v1, trials, n, nFeasible, best}], one per bucket in order of
   * weight decay, with best = winner(bucket). The trials keep their order within a bucket.
   */
  function buckets(trials, B) {
    B = B === undefined ? BUCKETS : B;
    var w = (V_RANGE[1] - V_RANGE[0]) / B, out = [];
    for (var k = 0; k < B; k++) out.push({ k: k, v0: V_RANGE[0] + k * w, v1: V_RANGE[0] + (k + 1) * w, trials: [] });
    trials.forEach(function (t) { out[bucketIndex(t.v, B)].trials.push(t); });
    out.forEach(function (b) {
      b.n = b.trials.length;
      b.nFeasible = b.trials.filter(function (t) { return t.feasible; }).length;
      b.best = winner(b);
    });
    return out;
  }

  /**
   * baseline({n = BASELINE_N, seed = 1}) -> [{i, u, y, feasible}]: a study without weight decay over
   * U_RANGE, the first n trials of version 1's equally tuned baseline with this seed.
   */
  function baseline(o) {
    o = o || {};
    var S = toyS(), n = o.n === undefined ? BASELINE_N : o.n, seed = o.seed === undefined ? 1 : o.seed;
    var bs = TP.prng.deriveSeed(seed, 'isolation:baseline');
    var g = TP.prng.create(TP.prng.deriveSeed(bs, 'noise'));
    return TP.halton.vanDerCorput({ n: n, seed: bs }).map(function (f, i) {
      var u = TP.halton.map(f, U_RANGE[0], U_RANGE[1]), eps = g.normal(), feasible = u <= U_DIV;
      return { i: i + 1, u: u, y: feasible ? clipY(S.errorNoWD(u) + S.defaults.sigma * eps) : S.yInfeasible, feasible: feasible };
    });
  }

  TP.isolation = {
    U_RANGE: U_RANGE,
    V_RANGE: V_RANGE,
    U_DIV: U_DIV,
    N: N,
    BUCKETS: BUCKETS,
    BASELINE_N: BASELINE_N,
    study: study,
    bucketIndex: bucketIndex,
    buckets: buckets,
    winner: winner,
    baseline: baseline
  };
})(typeof window !== 'undefined' ? window : globalThis);
