/*
 * scaling.js: steps, examples and training time against batch size (TP.scaling), for F3.2 and F3.3.
 *
 * Ported from version 1's p2-steps.js (TP.models.steps, stepSaving, examples, stepBudget,
 * namedPoints), with its numbers unchanged. The steps to a fixed goal, in units of S_min, are
 * McCandlish et al. (2018) Eq. 2.11 solved at a fixed batch size, with B_crit = E_min / S_min
 * (their Eq. 2.12):
 *
 *   S(B) = 1 + B_crit / B,      E(B) = B S(B) / B_crit = 1 + B / B_crit (units of S_min B_crit).
 *
 * The time per step is the toy accelerator's (throughput.js) with no input limit and its knee at
 * B_sat = knee, t(B) = T0 (1 + (B / knee)^P)^(1/P), and training time is T(B) = t(B) S(B).
 * Version 2 reports each curve relative to its value at B_REF = 8, so that on log axes the
 * training-time curve is the sum of the other two (WO-F3.2).
 *
 * The minimum of T over B is at B* = knee (B_crit / knee)^(1 / (P + 1)): setting d ln T / d ln B
 * to zero gives x^P / (1 + x^P) = r / (x + r) with x = B / knee and r = B_crit / knee, which
 * reduces to x^(P + 1) = r (our algebra; tests/lib/scaling.test.js checks it numerically).
 * d ln T / d ln B rises with B, so T falls to B* and rises after it, and the batch sizes within
 * WINDOW of the minimum form one interval, found by bisection on each side.
 *
 * The budgets of F3.3. Under a step budget of n S_min (STEP_BUDGET = 2) a batch size reaches the
 * goal when S(B) <= n, which is B >= B_crit / (n - 1). Under an epoch budget of m S_min B_crit
 * examples it reaches the goal when E(B) <= m, which is B <= (m - 1) B_crit.
 *
 * The playbook's critical batch size, the end of perfect scaling, is placed where S(B) is
 * PERFECT_TOLERANCE (20%, Zhang et al. 2024) above the perfect-scaling line S_min B_crit / B.
 * That ratio is 1 + B / B_crit, so the point is B = 0.2 B_crit = B_crit / 5 (version 1's algebra).
 *
 * B_CRIT is F3.3's B_crit, calibrated in Batch 1 (C4, notes/revamp/calibration/c4-batch.md): 320, the
 * B_crit of F3.2's preset "beyond" (critical batch size 64), so F3.3 draws a curve F3.2 draws. F3.2's
 * default B_crit, 20,480, would put the step budget's cut off the axis. EPOCH_MULTIPLE keeps version
 * 1's value, which C4 confirmed. The knee is F3.1's saturating preset, read from TP.throughput when
 * a function is called, so the order of the script tags does not matter.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var B_REF = 8;               // curves are reported relative to their value here (WO-F3.2)
  var B_MAX = 16384;           // the largest batch size F3.2 and F3.3 draw
  var B_CRIT = 320;            // F3.3's B_crit, that of F3.2's preset "beyond" (C4; version 1's was 512)
  var EPOCH_MULTIPLE = 2;      // the epoch budget m, in units of S_min B_crit (version 1's; C4)
  var STEP_BUDGET = 2;         // the step budget, in units of S_min (version 1's)
  var WINDOW = 0.05;           // the site's tolerance for "within 5% of the minimum"
  var PERFECT_TOLERANCE = 0.2; // Zhang et al.'s overhead over perfect scaling

  function accel() {
    if (!TP.throughput) throw new Error('TP.scaling: load throughput.js before scaling.js is used');
    return TP.throughput;
  }

  /** Steps to reach the goal, in units of S_min. Version 1's function. */
  function steps(B, bCrit) { return 1 + bCrit / B; }

  /** Fraction of the steps saved by doubling the batch size, 1 - S(2B) / S(B). Version 1's. */
  function stepSaving(B, bCrit) { return bCrit / (2 * (B + bCrit)); }

  /** Examples needed to reach the goal, in units of S_min B_crit (= E_min). Version 1's function. */
  function examples(B, bCrit) { return 1 + B / bCrit; }

  /** The three named points on the steps curve, as version 1 draws them. */
  function namedPoints(bCrit) {
    return [
      { key: 'perfect', b: bCrit / 5, steps: steps(bCrit / 5, bCrit) },
      { key: 'crit', b: bCrit, steps: steps(bCrit, bCrit) },
      { key: 'useful', b: 10 * bCrit, steps: steps(10 * bCrit, bCrit) }
    ];
  }

  /** The end of perfect scaling for a B_crit, PERFECT_TOLERANCE B_crit. */
  function perfectEnd(bCrit) { return PERFECT_TOLERANCE * bCrit; }

  /** The B_crit whose end of perfect scaling is b, the inverse of perfectEnd. */
  function criticalFromEnd(b) { return b / PERFECT_TOLERANCE; }

  /** F3.2's hardware knee: the saturation batch size of F3.1's saturating preset. */
  function knee() { return accel().PRESETS.saturating.bSat; }

  function kneeOr(k) { return k === undefined ? knee() : k; }

  /** Time per step in seconds on the toy accelerator with its knee at k, no input limit. */
  function timePerStep(B, k) { return accel().timePerStep(B, { bSat: kneeOr(k) }); }

  /** Training time t(B) S(B) relative to its value at B_REF. */
  function trainingTime(B, bCrit, k) {
    k = kneeOr(k);
    return timePerStep(B, k) * steps(B, bCrit) / (timePerStep(B_REF, k) * steps(B_REF, bCrit));
  }

  /**
   * normalized(B, bCrit, knee) -> {timePerStep, steps, trainingTime}, each relative to its value at
   * B_REF. The logarithm of trainingTime is the sum of the logarithms of the other two.
   */
  function normalized(B, bCrit, k) {
    k = kneeOr(k);
    return {
      timePerStep: timePerStep(B, k) / timePerStep(B_REF, k),
      steps: steps(B, bCrit) / steps(B_REF, bCrit),
      trainingTime: trainingTime(B, bCrit, k)
    };
  }

  /** minimum(bCrit, knee) -> {B, T}: the batch size where training time is lowest, and T there. */
  function minimum(bCrit, k) {
    k = kneeOr(k);
    var B = k * Math.pow(bCrit / k, 1 / (accel().SHARPNESS + 1));
    return { B: B, T: trainingTime(B, bCrit, k) };
  }

  /* The B on [a, b] (a on the side nearer the minimum) where trainingTime / T_min crosses target,
     by bisection in log B. */
  function crossing(a, b, bCrit, k, target) {
    var la = Math.log(a), lb = Math.log(b);
    for (var i = 0; i < 200 && Math.abs(lb - la) > 1e-13; i++) {
      var lm = 0.5 * (la + lb);
      if (trainingTime(Math.exp(lm), bCrit, k) <= target) la = lm;
      else lb = lm;
    }
    return Math.exp(0.5 * (la + lb));
  }

  /**
   * window(bCrit, knee, tol = WINDOW) -> {lo, hi, ratio}: the batch sizes whose training time is
   * within tol of the minimum form the interval [lo, hi], and ratio = hi / lo.
   */
  function within(bCrit, k, tol) {
    k = kneeOr(k);
    tol = tol === undefined ? WINDOW : tol;
    var m = minimum(bCrit, k), target = m.T * (1 + tol);
    var lo = m.B, hi = m.B;
    while (trainingTime(lo, bCrit, k) <= target) lo /= 2;
    while (trainingTime(hi, bCrit, k) <= target) hi *= 2;
    lo = crossing(m.B, lo, bCrit, k, target);
    hi = crossing(m.B, hi, bCrit, k, target);
    return { lo: lo, hi: hi, ratio: hi / lo };
  }

  /**
   * budgetPass(B, budget, bCrit): whether batch size B reaches the goal within the budget.
   * budget is {kind: 'epoch', m = EPOCH_MULTIPLE} (m S_min B_crit examples: B <= (m - 1) B_crit)
   * or {kind: 'step', n = STEP_BUDGET} (n S_min steps: B >= B_crit / (n - 1)).
   */
  function budgetPass(B, budget, bCrit) {
    if (budget.kind === 'epoch') {
      var m = budget.m === undefined ? EPOCH_MULTIPLE : budget.m;
      return B <= (m - 1) * bCrit;
    }
    if (budget.kind === 'step') {
      var n = budget.n === undefined ? STEP_BUDGET : budget.n;
      return n > 1 && B >= bCrit / (n - 1);
    }
    throw new RangeError('TP.scaling.budgetPass: budget.kind must be "epoch" or "step"');
  }

  /** The powers of two from B_REF to B_MAX, the batch sizes F3.2 and F3.3 draw. */
  function batchSizes() {
    var out = [];
    for (var b = B_REF; b <= B_MAX; b *= 2) out.push(b);
    return out;
  }

  TP.scaling = {
    B_REF: B_REF,
    B_MAX: B_MAX,
    B_CRIT: B_CRIT,
    EPOCH_MULTIPLE: EPOCH_MULTIPLE,
    STEP_BUDGET: STEP_BUDGET,
    WINDOW: WINDOW,
    PERFECT_TOLERANCE: PERFECT_TOLERANCE,
    steps: steps,
    stepSaving: stepSaving,
    examples: examples,
    namedPoints: namedPoints,
    perfectEnd: perfectEnd,
    criticalFromEnd: criticalFromEnd,
    knee: knee,
    timePerStep: timePerStep,
    trainingTime: trainingTime,
    normalized: normalized,
    minimum: minimum,
    window: within,
    budgetPass: budgetPass,
    batchSizes: batchSizes
  };
})(typeof window !== 'undefined' ? window : globalThis);
