/*
 * clipping.js: a synthetic series of logged, unclipped gradient norms and the clipping statistics at a
 * threshold (TP.clipping), the model of figure F9.3 (notes/revamp/figure-plan.md F9.3;
 * notes/revamp/implementation-plan.md WO-F9.3).
 *
 * Ported from version 1's p8-clipping.js (notes/revamp/v1-archive/site/js/figures/), figure
 * `clipping-threshold` of notes/specs/pages-7-9.md, with every number unchanged. Version 2 fixes the
 * spike rate at version 1's default, SPIKE_RATE = 0.005, which series() uses when no rate is given.
 *
 * The series, t = 1..5,000 (no model is trained):
 *   log ||g_t|| = a exp(-t / t_e) + s w_t + S_t,   a = ln 5, t_e = 200, s = 0.25,
 * w_t Student-t with 4 degrees of freedom (TP.prng studentT: a normal over sqrt(chi-square_4 / 4)),
 * S_t = ln F_t with probability p (the spike rate) and 0 otherwise, F_t uniform on [3, 20].
 * The draws come from three streams of the seed (core, spike indicator u_t, spike size), so a step
 * spikes when u_t < p and a higher spike rate keeps every spike of a lower one.
 * Percentiles are type 7 (linear between order statistics) on the sorted 5,000 norms. For a threshold
 * lambda: its percentile is 100 x (norms <= lambda) / 5,000, the clipped fraction is
 * (norms > lambda) / 5,000, and the mean multiplier on the gradient is the mean of
 * min(1, lambda / ||g_t||), from a suffix sum of 1 / ||g|| over the sorted norms.
 * The histogram has 20 bins per decade from 0.1 to 100; values outside go to the end bins.
 *
 * Needs prng.js, looked up when draws() is called. No DOM.
 *
 * API: TP.clipping.{steps, a, tE, s, df, spikeFactor, SPIKE_RATE, BINS_PER_DECADE, RANGE,
 *   draws(seed), series(draws, p = SPIKE_RATE), quantile(sorted, q), countLE(sorted, lambda),
 *   stats(series, lambda) -> {lambda, below, percentile, clipped, meanMult}, histogram(sorted)}
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var N = 5000, A = Math.log(5), TE = 200, SCALE = 0.25, DF = 4, F_LO = 3, F_HI = 20;
  var BINS_PER_DECADE = 20, H_LO = 0.1, H_HI = 100;
  var SPIKE_RATE = 0.005;
  var EARLY = new Float64Array(N);                  // a exp(-t / t_e), the elevated early phase
  for (var t0 = 0; t0 < N; t0++) EARLY[t0] = A * Math.exp(-(t0 + 1) / TE);

  var CL = TP.clipping = {
    steps: N, a: A, tE: TE, s: SCALE, df: DF, spikeFactor: [F_LO, F_HI],
    SPIKE_RATE: SPIKE_RATE, BINS_PER_DECADE: BINS_PER_DECADE, RANGE: [H_LO, H_HI],

    /** The seeded draws for one seed: w (Student-t), u (spike indicator), f (spike factor). */
    draws: function (seed) {
      var g = TP.prng.create(seed);
      var gw = g.fork('clipping:core'), gu = g.fork('clipping:spike-at'), gf = g.fork('clipping:spike-size');
      var w = new Float64Array(N), u = new Float64Array(N), f = new Float64Array(N);
      for (var i = 0; i < N; i++) {
        w[i] = gw.studentT(DF);
        u[i] = gu.uniform();
        f[i] = F_LO + (F_HI - F_LO) * gf.uniform();
      }
      return { seed: seed, w: w, u: u, f: f };
    },

    /** The series for spike rate p (a fraction, SPIKE_RATE by default): {norms, spike, sorted, inv, nSpikes, bins}. */
    series: function (dr, p) {
      if (p == null) p = SPIKE_RATE;
      var norms = new Float64Array(N), spike = new Uint8Array(N), nSpikes = 0;
      for (var i = 0; i < N; i++) {
        var sp = dr.u[i] < p;
        if (sp) { spike[i] = 1; nSpikes++; }
        norms[i] = Math.exp(EARLY[i] + SCALE * dr.w[i] + (sp ? Math.log(dr.f[i]) : 0));
      }
      var sorted = Float64Array.from(norms).sort();
      var inv = new Float64Array(N + 1);             // inv[k] = sum of 1 / sorted[j] for j >= k
      for (var j = N - 1; j >= 0; j--) inv[j] = inv[j + 1] + 1 / sorted[j];
      return { norms: norms, spike: spike, sorted: sorted, inv: inv, nSpikes: nSpikes, bins: CL.histogram(sorted) };
    },

    /** Quantile q of an ascending array, linear between order statistics (type 7). */
    quantile: function (sorted, q) {
      var h = (sorted.length - 1) * q, lo = Math.floor(h);
      return lo + 1 < sorted.length ? sorted[lo] + (h - lo) * (sorted[lo + 1] - sorted[lo]) : sorted[lo];
    },

    /** The number of values <= lambda in an ascending array. */
    countLE: function (sorted, lambda) {
      var lo = 0, hi = sorted.length;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (sorted[mid] <= lambda) lo = mid + 1; else hi = mid; }
      return lo;
    },

    /** {lambda, below (count), percentile (0..100), clipped (fraction), meanMult} for a threshold. */
    stats: function (ser, lambda) {
      var le = CL.countLE(ser.sorted, lambda);
      return { lambda: lambda, below: le, percentile: 100 * le / N, clipped: (N - le) / N, meanMult: (le + lambda * ser.inv[le]) / N };
    },

    /** Counts in bins of equal width in log10, BINS_PER_DECADE per decade from 0.1 to 100; values
        outside go to the end bins. */
    histogram: function (sorted) {
      var nb = Math.round(BINS_PER_DECADE * Math.log10(H_HI / H_LO)), counts = new Array(nb).fill(0);
      for (var i = 0; i < sorted.length; i++) {
        var k = Math.floor(BINS_PER_DECADE * Math.log10(sorted[i] / H_LO));
        counts[Math.max(0, Math.min(nb - 1, k))]++;
      }
      return counts.map(function (c, k) {
        return { x0: H_LO * Math.pow(10, k / BINS_PER_DECADE), x1: H_LO * Math.pow(10, (k + 1) / BINS_PER_DECADE), count: c };
      });
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
