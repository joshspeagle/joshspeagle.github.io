/*
 * toyS.js: Toy S, the shared made-up validation error surface (TP.toyS).
 *
 * Implements "Shared toy response T" in notes/specs/pages-4-6.md (renamed Toy S in
 * notes/specs/addenda-literature.md), used by boundary-explorer, how-many-trials and
 * isolation-builder. Not fitted to any data. Variables: u = log10(learning rate),
 * v = log10(weight decay).
 *
 *   x*(v)  = -2.5 - 0.15 (clip(v, -7, -1) + 4.5)           best u; -2.125 at v = -7, -3.025 at v = -1
 *   pen(v) = 0.05 (1 - exp(-(v - v*)^2 / 2))  for v < v*    v* = -4.5
 *          = 0.02 (v - v*)^2                  for v >= v*
 *   E(u,v) = min(0.8, 0.23 + 0.06 (u - x*(v))^2 + pen(v))
 *   E_none(u) = min(0.8, 0.28 + 0.06 (u + 2.125)^2)        no weight decay (the v -> -infinity limit)
 *   P(v)   = min over u of E(u, v) = min(0.8, 0.23 + pen(v))
 *
 * A trial is infeasible (diverged) if u > uDiv and then reports 0.8. A feasible trial reports
 * y = E(u, v) + sigma * eps with eps a seeded standard normal. sampleStudy needs prng.js and
 * halton.js, looked up when called, so the order of the script tags does not matter.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var V_STAR = -4.5;
  var CAP = 0.8;

  var defaults = Object.freeze({
    uDiv: -1.5,
    sigma: 0.001,
    uRange: Object.freeze([-5, -0.5]),
    vRange: Object.freeze([-7, -1])
  });

  function clip(x, lo, hi) {
    return x < lo ? lo : x > hi ? hi : x;
  }

  /** Best log10 learning rate at log10 weight decay v. */
  function xStar(v) {
    return -2.5 - 0.15 * (clip(v, -7, -1) + 4.5);
  }

  /** Weight-decay penalty: 0 at v* = -4.5, saturating at 0.05 as v falls, quadratic above v*. */
  function pen(v) {
    var d = v - V_STAR;
    return v < V_STAR ? 0.05 * (1 - Math.exp(-d * d / 2)) : 0.02 * d * d;
  }

  /** Noise-free validation error E(u, v), capped at 0.8. */
  function error(u, v) {
    var du = u - xStar(v);
    return Math.min(CAP, 0.23 + 0.06 * du * du + pen(v));
  }

  /** Noise-free error with no weight decay, E_none(u). */
  function errorNoWD(u) {
    var du = u + 2.125;
    return Math.min(CAP, 0.28 + 0.06 * du * du);
  }

  /**
   * P(v) = min over all u of E(u, v). It equals the best error an isolation plot can find at v
   * only when x*(v) lies inside the searched learning-rate range and below uDiv, which holds
   * for the defaults (x*(v) is in [-3.025, -2.125]).
   */
  function profile(v) {
    return Math.min(CAP, 0.23 + pen(v));
  }

  /**
   * sampleStudy({n, seed = 1, uRange, vRange, uDiv, sigma}) -> array of n trials {u, v, y, feasible},
   * with the unset options taken from TP.toyS.defaults.
   *
   * Trial k sits at point k of TP.halton.sequence({n, dims: 2, seed}): the base-2 coordinate
   * maps to u (the learning rate, the more important hyperparameter, per Bousquet et al.
   * Remark 2) and the base-3 coordinate maps to v. The noise eps_k is normal number k from
   * TP.prng.create(TP.prng.deriveSeed(seed, 'toyS:noise')), drawn for every trial, feasible
   * or not. So with the same seed, changing uDiv, sigma or the ranges never reshuffles the
   * noise, and a study of n trials is the first n trials of any larger one.
   *
   * Feasible trials report y = E(u, v) + sigma * eps clipped to [0, 0.8]; the clip binds only
   * where E is within a few sigma of the 0.8 cap (possible in a wide learning-rate range), and
   * keeps feasible trials from plotting above the infeasible marker line. Infeasible trials
   * (u > uDiv) report y = 0.8.
   */
  function sampleStudy(opts) {
    opts = opts || {};
    var n = opts.n;
    var seed = opts.seed === undefined ? 1 : opts.seed;
    var uRange = opts.uRange || defaults.uRange;
    var vRange = opts.vRange || defaults.vRange;
    var uDiv = opts.uDiv === undefined ? defaults.uDiv : opts.uDiv;
    var sigma = opts.sigma === undefined ? defaults.sigma : opts.sigma;
    if (!TP.prng || !TP.halton) throw new Error('TP.toyS: load prng.js and halton.js before sampleStudy');

    var points = TP.halton.sequence({ n: n, dims: 2, seed: seed });
    var noise = TP.prng.create(TP.prng.deriveSeed(seed, 'toyS:noise'));
    var trials = new Array(n);
    for (var k = 0; k < n; k++) {
      var u = TP.halton.map(points[k][0], uRange[0], uRange[1]);
      var v = TP.halton.map(points[k][1], vRange[0], vRange[1]);
      var eps = noise.normal();
      var feasible = u <= uDiv;
      var y = feasible ? clip(error(u, v) + sigma * eps, 0, CAP) : CAP;
      trials[k] = { u: u, v: v, y: y, feasible: feasible };
    }
    return trials;
  }

  TP.toyS = {
    vStar: V_STAR,
    yInfeasible: CAP,
    defaults: defaults,
    xStar: xStar,
    pen: pen,
    error: error,
    errorNoWD: errorNoWD,
    profile: profile,
    sampleStudy: sampleStudy
  };
})(typeof window !== 'undefined' ? window : globalThis);
