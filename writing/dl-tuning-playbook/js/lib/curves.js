/*
 * curves.js: made-up loss curves for the training-length and checkpoint figures (TP.curves).
 *
 * Implements the validation-curve family V of `best-step-reader` and `retro-checkpoint-select`
 * in notes/specs/pages-7-9.md:
 *
 *   V_j(t) = V* + A exp(-t / tau_j) + beta ln(1 + t / tau_j) + sigma_v z_{j,k},
 *   tau_j  = tauMean exp(tauSpread u_j),  u_j and z_{j,k} standard normals from the seed,
 *
 * evaluated at steps T/nEvals, 2T/nEvals, ..., T (T = max_train_steps), and the base curve
 * L(t) = Linf + (L0 - Linf) exp(-t / tau) of `curve-pathologies` in notes/specs/pages-4-6.md.
 * Not a training model: the curves are shaped by hand. simulateTrials needs prng.js, looked up
 * when called, so the order of the script tags does not matter.
 *
 * retro-checkpoint-select (one run with tau = 1000, noise on a 20-step grid, subsampled) is
 * simulateTrials({nTrials: 1, tauSpread: 0, nEvals: 1000, maxSteps: 20000, seed}) followed by
 * taking every (interval / 20)-th evaluation, with the interval snapped to a multiple of 20.
 * checkpointRun() is that computation, ported from version 1's select() in p9-checkpoint.js (now
 * under notes/revamp/v1-archive/) with its numbers unchanged, for figure F1.1; bufferAt() and
 * trialCurve() are the additions of notes/revamp/implementation-plan.md WO-I8 for F1.1 and F1.2.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var defaults = Object.freeze({
    vStar: 0.2,
    A: 1,
    tau: 1000,
    beta: 0.01,
    sigmaV: 0.005,
    nTrials: 50,
    nEvals: 100,
    maxSteps: 20000,
    tauMean: 1000,
    tauSpread: 0.5
  });

  function opt(opts, key) {
    return opts[key] === undefined ? defaults[key] : opts[key];
  }

  function isPositiveInt(x) {
    return typeof x === 'number' && x >= 1 && x === Math.floor(x);
  }

  /** validation(t, {vStar = 0.2, A = 1, tau = 1000, beta = 0.01}) = vStar + A e^(-t/tau) + beta ln(1 + t/tau). */
  function validation(t, p) {
    p = p || {};
    var x = t / opt(p, 'tau');
    return opt(p, 'vStar') + opt(p, 'A') * Math.exp(-x) + opt(p, 'beta') * Math.log1p(x);
  }

  /**
   * noiseFreeMinimumStep({tau = 1000, beta = 0.01, A = 1}): the step where validation() is
   * lowest. Setting dV/dt = 0 gives exp(-x)(1 + x) = beta / A with x = t / tau; the left side
   * falls from 1 at x = 0 toward 0, so the root is unique and found by bisection. Returns
   * x * tau (about 6,638 at the defaults), 0 when beta >= A (the curve rises from the start),
   * and Infinity when beta <= 0 (the curve falls forever). A must be positive.
   */
  function noiseFreeMinimumStep(p) {
    p = p || {};
    var tau = opt(p, 'tau');
    var r = opt(p, 'beta') / opt(p, 'A');
    if (!(r > 0)) return Infinity;
    if (r >= 1) return 0;
    var g = function (x) { return Math.exp(-x) * (1 + x); };
    var lo = 0;
    var hi = 1;
    while (g(hi) > r) hi *= 2;
    for (var it = 0; it < 100; it++) {
      var mid = 0.5 * (lo + hi);
      if (g(mid) > r) lo = mid;
      else hi = mid;
    }
    return 0.5 * (lo + hi) * tau;
  }

  // Cache of the standard-normal draws, keyed by the string "seed|nTrials|nEvals" with the
  // seed coerced to 32 bits (seed >>> 0), holding the 8 most recently used keys. Nothing
  // else enters the key: maxSteps, beta, sigmaV, tauMean, tauSpread, vStar and A only
  // transform the draws, so moving any of those sliders reuses the same numbers. The cache
  // saves time only; a miss regenerates identical draws, because trial j always takes
  // them from its own generator TP.prng.create(deriveSeed(deriveSeed(seed, 'curves'), j)):
  // first u_j (for tau_j), then z_{j,1}, ..., z_{j,nEvals}. So trial j never depends on
  // nTrials, and z_{j,k} never depends on maxSteps.
  var CACHE_SIZE = 8;
  var cache = [];

  function draws(seed, nTrials, nEvals) {
    var key = (seed >>> 0) + '|' + nTrials + '|' + nEvals;
    for (var c = 0; c < cache.length; c++) {
      if (cache[c].key === key) return cache[c].value;
    }
    if (!TP.prng) throw new Error('TP.curves: load prng.js before simulateTrials');
    var base = TP.prng.deriveSeed(seed, 'curves');
    var zTau = new Float64Array(nTrials);
    var zNoise = new Float64Array(nTrials * nEvals);
    for (var j = 0; j < nTrials; j++) {
      var rng = TP.prng.create(TP.prng.deriveSeed(base, j));
      zTau[j] = rng.normal();
      for (var k = 0; k < nEvals; k++) zNoise[j * nEvals + k] = rng.normal();
    }
    var value = { zTau: zTau, zNoise: zNoise };
    cache.push({ key: key, value: value });
    if (cache.length > CACHE_SIZE) cache.shift();
    return value;
  }

  /**
   * simulateTrials({nTrials = 50, seed = 1, nEvals = 100, maxSteps = 20000, sigmaV = 0.005,
   *                 beta = 0.01, tauMean = 1000, tauSpread = 0.5, vStar = 0.2, A = 1})
   * returns an array of nTrials objects {tau, evals: [{step, value}], bestStep, bestValue, bestFraction}.
   *
   * Evaluation k (k = 1..nEvals) is at step k * maxSteps / nEvals (exact when nEvals divides
   * maxSteps) and has value V(step) + sigmaV z_{j,k}. The best evaluation is the lowest value,
   * the earliest one on a tie. bestFraction = k / nEvals for the best k, computed from the
   * index so that zone tests such as bestFraction <= 0.1 or > 0.75 are exact at the edges.
   * Evaluations at the same fraction k / nEvals share the same noise draw for every maxSteps.
   */
  function simulateTrials(opts) {
    opts = opts || {};
    var nTrials = opt(opts, 'nTrials');
    var nEvals = opt(opts, 'nEvals');
    var maxSteps = opt(opts, 'maxSteps');
    var seed = opts.seed === undefined ? 1 : opts.seed;
    var sigmaV = opt(opts, 'sigmaV');
    var tauMean = opt(opts, 'tauMean');
    var tauSpread = opt(opts, 'tauSpread');
    if (!isPositiveInt(nTrials) || !isPositiveInt(nEvals)) {
      throw new RangeError('TP.curves.simulateTrials: nTrials and nEvals must be positive integers');
    }
    if (!(maxSteps > 0)) throw new RangeError('TP.curves.simulateTrials: maxSteps must be positive');

    var z = draws(seed, nTrials, nEvals);
    var trials = new Array(nTrials);
    for (var j = 0; j < nTrials; j++) {
      var curve = {
        vStar: opt(opts, 'vStar'),
        A: opt(opts, 'A'),
        beta: opt(opts, 'beta'),
        tau: tauMean * Math.exp(tauSpread * z.zTau[j])
      };
      var evals = new Array(nEvals);
      var best = 0;
      for (var k = 0; k < nEvals; k++) {
        var step = (k + 1) * maxSteps / nEvals;
        var value = validation(step, curve) + sigmaV * z.zNoise[j * nEvals + k];
        evals[k] = { step: step, value: value };
        if (value < evals[best].value) best = k;
      }
      trials[j] = {
        tau: curve.tau,
        evals: evals,
        bestStep: evals[best].step,
        bestValue: evals[best].value,
        bestFraction: (best + 1) / nEvals
      };
    }
    return trials;
  }

  /**
   * parametricLoss(t, {L0 = 0.7, Linf, tau}) = Linf + (L0 - Linf) exp(-t / tau), the base curve of
   * the training-curve pathology figure (t = step / 10,000 there). Linf and tau are required.
   */
  function parametricLoss(t, p) {
    p = p || {};
    if (typeof p.Linf !== 'number' || typeof p.tau !== 'number') {
      throw new TypeError('TP.curves.parametricLoss: Linf and tau are required numbers');
    }
    var L0 = p.L0 === undefined ? 0.7 : p.L0;
    return p.Linf + (L0 - p.Linf) * Math.exp(-t / p.tau);
  }

  /** The run of F1.1: 20,000 steps, noise drawn on a 20-step grid, a checkpoint every 1,000 steps, a buffer of 3. */
  var checkpointDefaults = Object.freeze({ steps: 20000, grid: 20, interval: 1000, buffer: 3 });

  /**
   * checkpointRun({seed = 1, interval = 1000, steps = 20000, grid = 20, beta}): one run of the family
   * with tau = 1000 and beta passed to the curve (undefined: the family's default, 0.01), its noise drawn once per seed at every grid step (grid, 2 grid, ..., steps), and a
   * checkpoint saved at every interval-th step, the interval snapped to a multiple of grid. steps / grid
   * must be a whole number. Returns {seed, interval (as snapped), evals: [{step, value, noiseFree}],
   * selectedIndex, lastIndex, gainObserved, gainNoiseFree}: the selected checkpoint has the lowest
   * observed value, the earlier one on a tie (retrospective selection); the last is the one at the
   * final step; each gain is the last checkpoint's value minus the selected one's. Runs of one seed at
   * different intervals share the draw at every step they both evaluate.
   */
  function checkpointRun(o) {
    o = o || {};
    var seed = o.seed === undefined ? 1 : o.seed;
    var steps = o.steps != null ? o.steps : checkpointDefaults.steps;
    var grid = o.grid != null ? o.grid : checkpointDefaults.grid;
    var interval = o.interval != null ? o.interval : checkpointDefaults.interval;
    var trial = simulateTrials({ nTrials: 1, tauSpread: 0, nEvals: steps / grid, maxSteps: steps, seed: seed, beta: o.beta })[0];
    var every = Math.max(1, Math.round(interval / grid));
    var evals = [], best = 0;
    for (var k = every - 1; k < trial.evals.length; k += every) {
      var e = trial.evals[k];
      evals.push({ step: e.step, value: e.value, noiseFree: validation(e.step, { beta: o.beta }) });
    }
    if (!evals.length) throw new RangeError('TP.curves.checkpointRun: the interval is longer than the run');
    for (var i = 1; i < evals.length; i++) if (evals[i].value < evals[best].value) best = i;
    var last = evals.length - 1;
    return {
      seed: seed, interval: every * grid, evals: evals, selectedIndex: best, lastIndex: last,
      gainObserved: evals[last].value - evals[best].value,
      gainNoiseFree: evals[last].noiseFree - evals[best].noiseFree
    };
  }

  /**
   * bufferAt(evals, k, n = 3): the indices of the n lowest values among evals[0..k-1], the buffer of
   * the n best checkpoints after the k-th evaluation, lowest first and the earlier one on a tie. Fewer
   * than n while k < n.
   */
  function bufferAt(evals, k, n) {
    n = n == null ? checkpointDefaults.buffer : n;
    var idx = [], m = Math.min(k, evals.length);
    for (var i = 0; i < m; i++) idx.push(i);
    idx.sort(function (a, b) { return evals[a].value - evals[b].value || a - b; });
    return idx.slice(0, n);
  }

  /**
   * trialCurve({value, seed, index, steps = 20000, interval = 1000, grid = 20}): the training curve of
   * trial `index` of a study drawn with `seed`, a checkpointRun() whose noise comes from the seed
   * TP.prng.deriveSeed(seed, 'trial:' + index), shifted by a constant so that its selected checkpoint's
   * value equals `value` exactly. The noise-free values are shifted with it. Returns checkpointRun()'s
   * object with seed set to the study's seed, and noiseSeed, index and shift added.
   */
  function trialCurve(o) {
    if (!TP.prng) throw new Error('TP.curves: load prng.js before trialCurve');
    var noiseSeed = TP.prng.deriveSeed(o.seed, 'trial:' + o.index);
    var r = checkpointRun({ seed: noiseSeed, interval: o.interval, steps: o.steps, grid: o.grid });
    var shift = o.value - r.evals[r.selectedIndex].value;
    r.evals.forEach(function (e) { e.value += shift; e.noiseFree += shift; });
    r.evals[r.selectedIndex].value = o.value;
    r.gainObserved = r.evals[r.lastIndex].value - r.evals[r.selectedIndex].value;
    r.gainNoiseFree = r.evals[r.lastIndex].noiseFree - r.evals[r.selectedIndex].noiseFree;
    r.seed = o.seed;
    r.noiseSeed = noiseSeed;
    r.index = o.index;
    r.shift = shift;
    return r;
  }

  TP.curves = {
    defaults: defaults,
    validation: validation,
    noiseFreeMinimumStep: noiseFreeMinimumStep,
    simulateTrials: simulateTrials,
    parametricLoss: parametricLoss,
    checkpointDefaults: checkpointDefaults,
    checkpointRun: checkpointRun,
    bufferAt: bufferAt,
    trialCurve: trialCurve
  };
})(typeof window !== 'undefined' ? window : globalThis);
