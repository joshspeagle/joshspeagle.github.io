/*
 * budget.js: where the best steps of a study's trials fall within a training budget (TP.budget), the
 * model of figure F8.2 (notes/revamp/figure-plan.md F8.2; notes/revamp/implementation-plan.md WO-I8 and
 * WO-F8.2) and the provisional budget that page 2 states.
 *
 * Ported from version 1's p7-best-step.js (notes/revamp/v1-archive/site/js/figures/), figure
 * `best-step-reader` of notes/specs/pages-7-9.md. Version 1 evaluated 50 trials 100 times within each
 * budget, so every budget had its own evaluation steps. Version 2 evaluates 12 trials every INTERVAL
 * steps to AXIS_END, so that moving the budget truncates the same evaluations: the curves do not depend
 * on the budget, which holds for a constant learning rate. The curves are version 1's, from
 * TP.curves.simulateTrials at its defaults:
 *   V_j(t) = 0.2 + exp(-t / tau_j) + 0.01 ln(1 + t / tau_j) + 0.005 z_{j,k},  tau_j = 1000 exp(0.5 u_j),
 * evaluated at steps k INTERVAL, k = 1, 2, ..., AXIS_END / INTERVAL. Trial j draws u_j and then z_{j,1},
 * z_{j,2}, ... from its own generator, so at a budget of 100 INTERVAL steps (20,000) the twelve trials
 * are version 1's first twelve trials of the same seed at that budget, evaluation for evaluation.
 *
 * A trial's best step at a budget is its evaluation with the lowest value at or before the budget, the
 * earlier one on a tie (retrospective checkpoint selection). Its fraction is the best step over the
 * budget. The playbook's zones (README L1198-L1202), with version 1's edges: the first tenth is a
 * fraction of at most 0.1, and the last quarter a fraction above 0.75.
 *
 * PROVISIONAL_BUDGET and INTERVAL keep version 1's default budget and its evaluation interval at that
 * budget (20,000 and 200 steps), which Batch 1's calibration kept (C3). AXIS_END is Batch 1's: version 1's
 * longest budget, 300,000 steps, left 42 of seeds 1 to 300 with no budget on the axis at which all twelve
 * best steps fall in the first tenth, and 500,000 leaves 3 (notes/revamp/calibration/c3-curves.md).
 * Needs prng.js and curves.js, looked up when trials() is called. No DOM.
 *
 * API: TP.budget.{PROVISIONAL_BUDGET, INTERVAL, AXIS_END, N_TRIALS, FIRST_TENTH, LAST_QUARTER,
 *   trials(seed), bestAt(trials, budget), counts(trials, budget), budgets(), thresholds(trials, list)}
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var PROVISIONAL_BUDGET = 20000;
  var INTERVAL = 200;
  var AXIS_END = 500000;
  var N_TRIALS = 12;
  var FIRST_TENTH = 0.1, LAST_QUARTER = 0.75;   // the zones' edges: fraction <= 0.1, and fraction > 0.75

  /**
   * trials(seed): the study's twelve trials, [{index, tau, evals: [{step, value}], best}], evaluated
   * every INTERVAL steps to AXIS_END; best[k] is the index of the lowest of evals[0..k], the earlier
   * one on a tie.
   */
  function trials(seed) {
    var n = Math.round(AXIS_END / INTERVAL);
    var raw = TP.curves.simulateTrials({ nTrials: N_TRIALS, nEvals: n, maxSteps: AXIS_END, seed: seed });
    return raw.map(function (t, j) {
      var best = new Int32Array(n), b = 0;
      for (var k = 0; k < n; k++) {
        if (t.evals[k].value < t.evals[b].value) b = k;
        best[k] = b;
      }
      return { index: j, tau: t.tau, evals: t.evals, best: best };
    });
  }

  /* the index of the last evaluation at or before the budget, -1 if none */
  function lastIndex(tr, budget) {
    var k = Math.floor(budget / INTERVAL) - 1;
    return Math.min(k, tr.evals.length - 1);
  }

  /**
   * bestAt(trials, budget): each trial's best evaluation at or before the budget,
   * [{index, step, value, fraction}], fraction = step / budget; null for a trial with no evaluation
   * within the budget.
   */
  function bestAt(ts, budget) {
    return ts.map(function (tr) {
      var k = lastIndex(tr, budget);
      if (k < 0) return null;
      var e = tr.evals[tr.best[k]];
      return { index: tr.index, step: e.step, value: e.value, fraction: e.step / budget };
    });
  }

  function inFirstTenth(step, budget) { return 10 * step <= budget; }   // step / budget <= 0.1, exactly
  function inLastQuarter(step, budget) { return 4 * step > 3 * budget; } // step / budget > 0.75, exactly

  /**
   * counts(trials, budget): {firstTenth, lastQuarter, n}, the number of trials whose best step at the
   * budget falls in the first tenth and in the last quarter of the run, of n trials.
   */
  function counts(ts, budget) {
    var first = 0, last = 0, n = 0;
    bestAt(ts, budget).forEach(function (b) {
      if (!b) return;
      n++;
      if (inFirstTenth(b.step, budget)) first++;
      if (inLastQuarter(b.step, budget)) last++;
    });
    return { firstTenth: first, lastQuarter: last, n: n };
  }

  /**
   * budgets(): the budgets the figure's handle snaps to (WO-F8.2): the multiples of INTERVAL nearest to
   * 40 log-spaced values per decade from 10 INTERVAL to AXIS_END, with PROVISIONAL_BUDGET and AXIS_END,
   * ascending and without repeats.
   */
  function budgets() {
    var lo = 10 * INTERVAL, out = [], seen = {};
    function add(v) { if (!seen[v]) { seen[v] = true; out.push(v); } }
    for (var j = 0; ; j++) {
      var v = lo * Math.pow(10, j / 40);
      if (v > AXIS_END * (1 + 1e-12)) break;
      add(Math.min(AXIS_END, Math.max(lo, Math.round(v / INTERVAL) * INTERVAL)));
    }
    add(PROVISIONAL_BUDGET);
    add(AXIS_END);
    return out.sort(function (a, b) { return a - b; });
  }

  /**
   * thresholds(trials, list = budgets()): {allFirstTenth, allLastQuarter}, the smallest listed budget
   * at which every trial's best step falls in the first tenth, and the largest at which every one falls
   * in the last quarter (null where no listed budget does), F8.2's two presets.
   */
  function thresholds(ts, list) {
    list = list || budgets();
    var first = null, last = null;
    list.forEach(function (B) {
      var c = counts(ts, B);
      if (c.n === ts.length && c.firstTenth === c.n && first === null) first = B;
      if (c.n === ts.length && c.lastQuarter === c.n) last = B;
    });
    return { allFirstTenth: first, allLastQuarter: last };
  }

  TP.budget = {
    PROVISIONAL_BUDGET: PROVISIONAL_BUDGET,
    INTERVAL: INTERVAL,
    AXIS_END: AXIS_END,
    N_TRIALS: N_TRIALS,
    FIRST_TENTH: FIRST_TENTH,
    LAST_QUARTER: LAST_QUARTER,
    trials: trials,
    bestAt: bestAt,
    counts: counts,
    budgets: budgets,
    thresholds: thresholds
  };
})(typeof window !== 'undefined' ? window : globalThis);
