/*
 * schedules.js: closed-form learning-rate schedules for extending a round (TP.schedules), the model of
 * figure F8.3 and of self-check SC5.5 (notes/revamp/figure-plan.md F8.3; notes/revamp/
 * implementation-plan.md WO-I8, WO-F8.3 and §6.23).
 *
 * Ported from version 1's p7-schedule.js (notes/revamp/v1-archive/site/js/figures/), figure
 * `round-schedule-extension` of notes/specs/pages-7-9.md, with every number unchanged. The base rate is
 * 1, Round 1 has length N = 1 and Round 2 length k:
 *   inverse square root  eta(t) = sqrt(t0 / (t0 + t)), t0 = 0.1 N in both rounds;
 *   linear               constant 1 until L - D, then linear to 0 at L; Round 1 has D = (1 - c) N;
 *                        Round 2 keeps D = (1 - c) N ("fixed steps", README L1348-L1349) or uses
 *                        D = 0.2 k N ("20% of the run", Hägele et al. 2024);
 *   cosine               eta(t) = (1 + cos(pi t / L)) / 2 with L = N and L = k N (README L1350-L1352);
 *                        plus Round 1's cosine continued at its final rate, 0, from N to k N
 *                        (the pitfall of README L1287-L1288).
 * scheduleStats gives the share of steps at or above half the base rate and the mean rate over the run
 * divided by the base rate, in closed form (the 1/2 threshold is ours):
 *   inverse square root  share min(1, 3 t0 / L), mean 2 sqrt(t0) (sqrt(t0 + L) - sqrt(t0)) / L;
 *   linear               share = mean = 1 - D / (2 L);
 *   cosine               share = mean = 1/2;  continued: share = mean = 1 / (2 k).
 *
 * The additions of version 2 (WO-I8): the linear pitfall beside the cosine one, and the fraction of a
 * schedule below half the base rate, for the linear and cosine families of F8.3. For a family, the
 * kinds are 'round1' (length 1), 'extension' (the playbook's Round 2, length k: the linear decay keeps
 * its length, L1348-L1349; the cosine stretches to k, L1350-L1352) and 'pitfall' (Round 1 continued at
 * its final rate, 0, to k, L1287-L1288). Below half the base rate, over each schedule's length L:
 *   linear   round1 (1 - D/2, 1], fraction D/2;  extension (k - D/2, k], D/(2k);
 *            pitfall (1 - D/2, k], (k - 1 + D/2)/k;  with D = 1 - c
 *   cosine   round1 (1/2, 1], 1/2;  extension (k/2, k], 1/2;  pitfall (1/2, k], (k - 1/2)/k
 * FACTOR (k) and CONSTANT_FRACTION (c) hold F8.3's settings, version 1's defaults of 4 and 0.8, which
 * Batch 1 calibrates.
 *
 * API (no DOM):
 *   T0, COOLDOWN, invSqrt(t), linear(t, L, D), cosine(t, L), continued(t)
 *   linearDecay(round, {k, c, decay}), scheduleStats({k, c, decay}), scheduleNumeric(fn, L, n)
 *   FACTOR, CONSTANT_FRACTION, FAMILIES, KINDS
 *   schedule(family, kind, {k, c}) -> {family, kind, length, rate(t)}
 *   belowHalf(family, kind, {k, c}) -> {fraction, intervals: [[from, to]], length}
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var T0 = 0.1, COOLDOWN = 0.2;

  /* ---------- version 1's model, unchanged ---------- */

  function invSqrt(t) { return Math.sqrt(T0 / (T0 + t)); }
  function linear(t, L, D) { return t <= L - D ? 1 : Math.max(0, (L - t) / D); }
  function cosine(t, L) { return 0.5 * (1 + Math.cos(Math.PI * Math.min(t, L) / L)); }
  function continued(t) { return t <= 1 ? cosine(t, 1) : 0; }

  /** The decay length of the linear schedule in round 1 or 2. */
  function linearDecay(round, o) {
    return round === 1 || o.decay !== 'fraction' ? 1 - o.c : COOLDOWN * o.k;
  }

  /**
   * scheduleStats({k, c, decay: 'steps' | 'fraction'}) returns [{key, round, L, share, mean}] for
   * the inverse square root, linear and cosine schedules (rounds 1 and 2) and the continued Round 1
   * cosine (round 'continued').
   */
  function scheduleStats(o) {
    function inv(L) { return { share: Math.min(1, 3 * T0 / L), mean: 2 * Math.sqrt(T0) * (Math.sqrt(T0 + L) - Math.sqrt(T0)) / L }; }
    function lin(L, D) { var v = 1 - D / (2 * L); return { share: v, mean: v }; }
    function row(key, round, L, v) { return { key: key, round: round, L: L, share: v.share, mean: v.mean }; }
    return [
      row('invSqrt', 1, 1, inv(1)), row('invSqrt', 2, o.k, inv(o.k)),
      row('linear', 1, 1, lin(1, linearDecay(1, o))), row('linear', 2, o.k, lin(o.k, linearDecay(2, o))),
      row('cosine', 1, 1, { share: 0.5, mean: 0.5 }), row('cosine', 2, o.k, { share: 0.5, mean: 0.5 }),
      row('cosine', 'continued', o.k, { share: 0.5 / o.k, mean: 0.5 / o.k })
    ];
  }

  /** The share of steps at or above half the base rate and the mean rate of fn over [0, L], by
      summing fn at the midpoints of n equal steps. */
  function scheduleNumeric(fn, L, n) {
    n = n || 1000;
    var above = 0, sum = 0;
    for (var i = 0; i < n; i++) {
      var v = fn((i + 0.5) * L / n);
      if (v >= 0.5) above++;
      sum += v;
    }
    return { share: above / n, mean: sum / n };
  }

  /* ---------- version 2: F8.3's six schedules and their steps below half the base rate ---------- */

  /** F8.3's extension factor k and Round 1's constant fraction c (version 1's defaults). */
  var FACTOR = 4;
  var CONSTANT_FRACTION = 0.8;
  var FAMILIES = Object.freeze(['linear', 'cosine']);
  var KINDS = Object.freeze(['round1', 'extension', 'pitfall']);

  function settings(o) {
    o = o || {};
    return { k: o.k != null ? o.k : FACTOR, c: o.c != null ? o.c : CONSTANT_FRACTION };
  }
  function check(family, kind) {
    if (FAMILIES.indexOf(family) < 0) throw new TypeError('TP.schedules: unknown family ' + family);
    if (KINDS.indexOf(kind) < 0) throw new TypeError('TP.schedules: unknown kind ' + kind);
  }

  /**
   * schedule(family, kind, {k = FACTOR, c = CONSTANT_FRACTION}): one of F8.3's schedules, the learning
   * rate as a fraction of the base rate against the step as a multiple of Round 1's length. Returns
   * {family, kind, length (1 for Round 1, k otherwise), rate(t)}.
   */
  function schedule(family, kind, o) {
    check(family, kind);
    var s = settings(o), k = s.k, D = 1 - s.c, rate;
    if (family === 'linear') {
      rate = kind === 'round1' ? function (t) { return linear(t, 1, D); }
        : kind === 'extension' ? function (t) { return linear(t, k, D); }
          : function (t) { return t <= 1 ? linear(t, 1, D) : 0; };
    } else {
      rate = kind === 'round1' ? function (t) { return cosine(t, 1); }
        : kind === 'extension' ? function (t) { return cosine(t, k); }
          : continued;
    }
    return { family: family, kind: kind, length: kind === 'round1' ? 1 : k, rate: rate };
  }

  /**
   * belowHalf(family, kind, {k, c}): where the schedule runs below half the base rate, in closed form
   * (the header lists the intervals). Returns {fraction, intervals: [[from, to]], length}, the fraction
   * being the intervals' total length over the schedule's length.
   */
  function belowHalf(family, kind, o) {
    check(family, kind);
    var s = settings(o), k = s.k, D = 1 - s.c, L = kind === 'round1' ? 1 : k, from;
    if (family === 'linear') from = kind === 'extension' ? k - D / 2 : 1 - D / 2;
    else from = kind === 'extension' ? k / 2 : 1 / 2;
    var intervals = L - from > 0 ? [[from, L]] : [];
    return { fraction: (L - from) / L, intervals: intervals, length: L };
  }

  TP.schedules = {
    T0: T0,
    COOLDOWN: COOLDOWN,
    invSqrt: invSqrt,
    linear: linear,
    cosine: cosine,
    continued: continued,
    linearDecay: linearDecay,
    scheduleStats: scheduleStats,
    scheduleNumeric: scheduleNumeric,
    FACTOR: FACTOR,
    CONSTANT_FRACTION: CONSTANT_FRACTION,
    FAMILIES: FAMILIES,
    KINDS: KINDS,
    schedule: schedule,
    belowHalf: belowHalf
  };
})(typeof window !== 'undefined' ? window : globalThis);
