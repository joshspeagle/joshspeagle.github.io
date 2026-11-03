/*
 * throughput.js: the toy accelerator of the doubling procedure (TP.throughput), for F3.1, the knee
 * of F3.2 (scaling.js) and the worked case's throughput table.
 *
 * Ported from version 1's p2-throughput.js (TP.models.timePerStep, throughput, worthConsidering),
 * with its numbers unchanged. The compute time per step is
 *
 *   t_c(B) = T0 (1 + (B / B_sat)^SHARPNESS)^(1 / SHARPNESS),   T0 = 0.1 s, SHARPNESS = 4,
 *
 * an input pipeline that delivers at most R_io examples per second makes the time per step
 * t(B) = max(t_c(B), B / R_io), and the throughput is X(B) = B / t(B). Well above B_sat the time
 * per step grows in proportion to B, so the accelerator's peak throughput is B_sat / T0. The
 * constants are arbitrary.
 *
 * Version 2 adds (notes/revamp/implementation-plan.md WO-I8, WO-F3.1, R10):
 *   - a multiplicative log-normal measurement noise: a run at B measures X(B) exp(NOISE_SD z),
 *     with z the run's standard normal;
 *   - a memory limit: a batch size above MEMORY_LIMIT fails for memory;
 *   - the presets `saturating` and `input` (the input pipeline limited case);
 *   - runs(preset, seed), the doubling procedure from B = 8 through the first size that fails;
 *   - mark(runs), version 1's rule: the largest batch size up to which every doubling raised the
 *     measured throughput by at least THRESHOLD (10%, the site's tolerance for measurement noise).
 * NOISE_SD, MEMORY_LIMIT and PRESETS are calibrated in Batch 1 (implementation plan §5.7, C4), and
 * each is one exported line below. MEMORY_LIMIT and the saturating preset keep version 1's values.
 *
 * Random draws: run k (k = 0 at B = 8) takes normal number k of
 * TP.prng.create(TP.prng.deriveSeed(seed, 'throughput:noise')). So one seed gives the same noise
 * at each batch size under both presets, and a run never depends on a later one. Needs prng.js,
 * looked up when runs() is called, so the order of the script tags does not matter.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var T0 = 0.1;              // seconds per step while the accelerator is not saturated (arbitrary)
  var SHARPNESS = 4;         // sharpness of the saturation bend (arbitrary)
  var B_MIN = 8;             // the procedure's first batch size
  var MEMORY_LIMIT = 4096;   // largest batch size that fits in memory (version 1's value; C4)
  var THRESHOLD = 0.10;      // the site's gain per doubling (R10)
  var NOISE_SD = 0.02;       // standard deviation of the log of the measurement noise (C4)

  /* The presets set the saturation batch size and the input pipeline's limit in examples per
     second (null for none). Version 1's figure opened at B_sat = 512 with no input limit; its
     input slider offered 2,000 examples per second, below the peak of 5,120 (C4). */
  var PRESETS = Object.freeze({
    saturating: Object.freeze({ bSat: 512, rIo: null }),
    input: Object.freeze({ bSat: 512, rIo: 2000 })
  });

  function params(preset) {
    if (preset && typeof preset === 'object') return preset;
    var p = PRESETS[preset];
    if (!p) throw new RangeError('TP.throughput: unknown preset ' + preset);
    return p;
  }

  /**
   * timePerStep(B, p) in seconds, with p = {bSat, rIo (examples per second; null or 0 for no
   * input limit), constant (true: always T0)} or a key of PRESETS. Version 1's function.
   */
  function timePerStep(B, p) {
    p = typeof p === 'string' ? params(p) : p || {};
    if (p.constant) return T0;
    var tc = T0 * Math.pow(1 + Math.pow(B / p.bSat, SHARPNESS), 1 / SHARPNESS);
    return p.rIo ? Math.max(tc, B / p.rIo) : tc;
  }

  /** The noise-free throughput in examples per second, B / t(B). Version 1's function. */
  function throughput(B, p) {
    return B / timePerStep(B, p);
  }

  /** The accelerator's peak throughput, B_sat / T0, which X(B) approaches as B grows. */
  function peak(p) {
    return params(p).bSat / T0;
  }

  /** The level throughput levels off at: the input limit where it is below the peak, else the peak. */
  function plateau(p) {
    p = params(p);
    var top = p.bSat / T0;
    return p.rIo ? Math.min(p.rIo, top) : top;
  }

  /**
   * worthConsidering(p): version 1's rule on the noise-free throughput. The largest power of two
   * from 16 to MEMORY_LIMIT such that every doubling up to it raised throughput by at least
   * THRESHOLD, and 8 if even the first doubling did not.
   */
  function worthConsidering(p) {
    p = params(p);
    var best = B_MIN;
    for (var b = 2 * B_MIN; b <= MEMORY_LIMIT; b *= 2) {
      if (throughput(b, p) / throughput(b / 2, p) >= 1 + THRESHOLD) best = b;
      else break;
    }
    return best;
  }

  /**
   * runs(preset, seed = 1) -> [{B, throughput, noiseFree, failed}], one run at each power of two
   * from 8 through the first batch size above MEMORY_LIMIT, which fails for memory. A run that fits
   * has throughput = noiseFree * exp(NOISE_SD z). The failed run has throughput null, and its
   * noiseFree is the toy's value had the batch fit. preset is a key of PRESETS or {bSat, rIo}.
   */
  function runs(preset, seed) {
    var p = params(preset);
    if (!TP.prng) throw new Error('TP.throughput: load prng.js before runs()');
    var noise = TP.prng.create(TP.prng.deriveSeed(seed === undefined ? 1 : seed, 'throughput:noise'));
    var out = [];
    for (var B = B_MIN; ; B *= 2) {
      var x = throughput(B, p);
      if (B > MEMORY_LIMIT) {
        out.push({ B: B, throughput: null, noiseFree: x, failed: true });
        return out;
      }
      out.push({ B: B, throughput: x * Math.exp(NOISE_SD * noise.normal()), noiseFree: x, failed: false });
    }
  }

  /**
   * gains(runs) -> [{B, gain}] for each run that fits after the first: its measured throughput
   * divided by that of the run before it.
   */
  function gains(list) {
    var out = [];
    for (var i = 1; i < list.length; i++) {
      if (list[i].failed || list[i - 1].failed) continue;
      out.push({ B: list[i].B, gain: list[i].throughput / list[i - 1].throughput });
    }
    return out;
  }

  /**
   * mark(runs): the batch size at the mark by version 1's rule. It is the largest run such that
   * every doubling up to it raised the measured throughput by at least THRESHOLD, and the first run
   * when the first doubling did not. Runs that failed are never marked. Null when no run fits.
   */
  function mark(list) {
    var fit = list.filter(function (r) { return !r.failed; });
    if (!fit.length) return null;
    var best = fit[0].B;
    for (var i = 1; i < fit.length; i++) {
      if (fit[i].throughput / fit[i - 1].throughput >= 1 + THRESHOLD) best = fit[i].B;
      else break;
    }
    return best;
  }

  TP.throughput = {
    T0: T0,
    SHARPNESS: SHARPNESS,
    B_MIN: B_MIN,
    MEMORY_LIMIT: MEMORY_LIMIT,
    THRESHOLD: THRESHOLD,
    NOISE_SD: NOISE_SD,
    PRESETS: PRESETS,
    timePerStep: timePerStep,
    throughput: throughput,
    peak: peak,
    plateau: plateau,
    worthConsidering: worthConsidering,
    runs: runs,
    gains: gains,
    mark: mark
  };
})(typeof window !== 'undefined' ? window : globalThis);
