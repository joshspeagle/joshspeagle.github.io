/*
 * variance.js: the variance-components toy of reruns and repeated studies (TP.variance), for F7.1
 * and SC4.2.
 *
 * Ported from version 1's p3-variance.js (TP.models.variance), with its numbers unchanged. It is
 * the decomposition of Bouthillier et al. (2021, Eq. 7); the Gaussian study offset is ours. In
 * percentage points of validation error, a run of configuration c (A the incumbent, B the
 * candidate) measures
 *   y = mu_c + u_c + e,   mu_A = 23, mu_B = 23 + Delta,
 *   u_c ~ N(0, s_study^2), one per tuning study, shared by every rerun of that study's best trial,
 *   e ~ N(0, s_trial^2), independent for every training run.
 * mu_c is the error of c's best trial averaged over repeated studies. The offset u_c is the luck of
 * one study's selection and belongs to the configuration that study selected, so its reruns gather
 * around mu_c + u_c, the selected configuration's own error, and only a repeated study draws a new
 * offset (build log Batch 5, rulings on the reads, page 7).
 * SC4.2's cases (tests/calibration/cases-c7.calibrate.js) use init(), rerun() and stats() alone,
 * and read each case's gain against the site's adoption yardstick, the standard error of the
 * difference of the two rerun means, sqrt(s_A^2/N_A + s_B^2/N_B), with no threshold (the site's
 * reading of L1101-L1109, build log Batch 7); F7.1's readout reads the same quantity.
 * Version 1's figure compared two adoption rules, and its functions stay for the tests alone; their
 * thresholded rerun rule is not the site's yardstick. The single comparison adopts B when
 * y_B < y_A, and the rerun rule adopts B when
 * ybar_B - ybar_A < -z sqrt((s_A^2 + s_B^2) / N), z = 2 (ours), with s_A and s_B the sample
 * standard deviations of the N runs. The single comparison's rate is exact in closed form,
 *   P_1(Delta) = Phi(-Delta / sqrt(2 s_study^2 + 2 s_trial^2)),
 * and the rerun rule's rate is simulated by pool() and poolCounts() over the comparisons of seeds 1
 * to 100; pReruns() is the rule's closed form with s_trial in place of the sample standard
 * deviations. With s_study = 0 and Delta = 0 the rule's statistic is t with 2(N - 1) degrees of
 * freedom, so it adopts 9.2% at N = 2 where the closed form gives 2.3% (tests/lib/variance.test.js).
 *
 * Version 2 adds the action form of F7.1 (WO-F7.1, R8, R56). No decision rule is drawn, because
 * the playbook gives no threshold.
 *   init(preset, seed)  the state at step 0: the candidate's study offset, and the incumbent's
 *                       offset and its INCUMBENT_RERUNS reruns. The candidate has no runs yet.
 *   rerun(state, rng)   appends one run of the candidate: its mean over studies MU +
 *                       TRUE_DIFFERENCE, plus its study offset, plus fresh trial noise.
 *   repeat(state, rng)  draws a new study offset and appends the best trial of the repeated study:
 *                       the candidate's mean over studies plus the new offset plus fresh trial
 *                       noise.
 * rng is the generator the runtime hands advance for the step (TP.prng.deriveSeed(seed, t),
 * design-system.md §7.5). Each run carries a jitter in [0, 1), the fixed vertical offset of its
 * marker within its row, drawn with it. init draws standard normals from forks of the seed and
 * scales them by the preset, so one seed gives the same draws under every preset.
 * PRESETS, TRUE_DIFFERENCE and INCUMBENT_RERUNS are calibrated in Batch 1 (implementation plan
 * §5.7, C7); the playbook preset's trial spread is the playbook's +/-0.1% (L1795-L1796) read as a
 * standard deviation of 0.1 points (ours), and its study spread, 0.3 points, is the site's reading
 * of Playbook Figure 3 (the interquartile range of the best of 20 trials, about 0.004, as a standard
 * deviation of about 0.3 points once the trial spread is removed). study-larger doubles it to 0.6.
 * The Bouthillier preset is version 1's reading of their Figure H.4: the study spread is H.4's floor
 * of the mean of 100 reruns (0.30), and the trial spread is derived as sqrt(0.45^2 - 0.30^2) = 0.34
 * from H.4's one run (0.45), so it includes data sampling, which the playbook counts apart.
 * Needs prng.js, looked up when called.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  /* ---------- version 1's model ---------- */

  var COMPARISONS = 200, MAXN = 20, RATE_SEEDS = 100;

  /* The complementary error function of Numerical Recipes (erfcc: a Chebyshev fit with
     fractional error below 1.2e-7 everywhere). */
  function erfc(x) {
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 +
      t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  /** The standard normal distribution function. */
  function Phi(x) { return x < 0 ? 0.5 * erfc(-x / Math.SQRT2) : 1 - 0.5 * erfc(x / Math.SQRT2); }

  var VAR = TP.variance = {
    mu: 23, z: 2, comparisons: COMPARISONS, maxN: MAXN, rateSeeds: RATE_SEEDS,
    deltaRange: [-0.5, 0.3],
    defaults: { delta: 0, sigmaStudy: 0.2, sigmaTrial: 0.1, N: 5, seed: 1 },
    /* noise scales: the playbook's retrain variation read as a standard deviation (README
       L1792-1796), and approximate values read from Bouthillier et al.'s Figures 1 and H.4 */
    presets: {
      playbook: { sigmaTrial: 0.1 },
      bouthillier: { sigmaTrial: 0.3, sigmaStudy: 0.3 }
    },
    Phi: Phi,

    /** Probability that the single comparison adopts the candidate. */
    pSingle: function (delta, sStudy, sTrial) {
      var sd = Math.sqrt(2 * sStudy * sStudy + 2 * sTrial * sTrial);
      return sd > 0 ? Phi(-delta / sd) : (delta < 0 ? 1 : 0);
    },
    /** The rerun rule's closed form with s_trial in place of the sample SDs (the reference
        curve); the rule's own rate comes from pool() and poolCounts(). */
    pReruns: function (delta, sStudy, sTrial, N, z) {
      var t = VAR.threshold(sTrial, N, z), sd = Math.sqrt(2 * sStudy * sStudy + 2 * sTrial * sTrial / N);
      return sd > 0 ? Phi((t - delta) / sd) : (delta < t ? 1 : 0);
    },
    /** The rerun rule's threshold at the true trial standard deviation, -z s_trial sqrt(2/N). */
    threshold: function (sTrial, N, z) { return -(z == null ? VAR.z : z) * sTrial * Math.sqrt(2 / N); },

    /** The seeded draws for one seed: standard normals for the study offsets (uA, uB), the
        single runs (eA, eB) and the prefix sums of the reruns and their squares (sumA, sqA,
        sumB, sqB; entry m * 21 + k covers the first k reruns of comparison m), and uniform
        jitter for the two strips. */
    draws: function (seed) {
      var g = TP.prng.create(seed);
      var gs = g.fork('variance:study'), g1 = g.fork('variance:single'), ga = g.fork('variance:reruns:A');
      var gb = g.fork('variance:reruns:B'), gj = g.fork('variance:jitter');
      var n = COMPARISONS, K = MAXN + 1;
      var d = {
        seed: seed >>> 0,
        uA: new Float64Array(n), uB: new Float64Array(n), eA: new Float64Array(n), eB: new Float64Array(n),
        sumA: new Float64Array(n * K), sqA: new Float64Array(n * K), sumB: new Float64Array(n * K), sqB: new Float64Array(n * K),
        jitter1: new Float64Array(n), jitter2: new Float64Array(n)
      };
      for (var m = 0; m < n; m++) {
        d.uA[m] = gs.normal(); d.uB[m] = gs.normal();
        d.eA[m] = g1.normal(); d.eB[m] = g1.normal();
        var a = 0, aa = 0, b = 0, bb = 0, o = m * K;
        for (var k = 1; k <= MAXN; k++) {
          var x = ga.normal(), y = gb.normal();
          a += x; aa += x * x; b += y; bb += y * y;
          d.sumA[o + k] = a; d.sqA[o + k] = aa; d.sumB[o + k] = b; d.sqB[o + k] = bb;
        }
        d.jitter1[m] = gj.uniform(); d.jitter2[m] = gj.uniform();
      }
      return d;
    },

    /** The 200 comparisons at settings s = {delta, sigmaStudy, sigmaTrial, N}: observed
        differences (single, reruns), each rerun comparison's threshold (thr), the differences
        without delta (base1, baseN), adoption flags and counts. */
    simulate: function (dr, s) {
      var n = COMPARISONS, K = MAXN + 1, N = s.N, z = VAR.z, st = s.sigmaTrial;
      var out = {
        single: new Float64Array(n), reruns: new Float64Array(n), thr: new Float64Array(n),
        base1: new Float64Array(n), baseN: new Float64Array(n), meanA: new Float64Array(n), meanB: new Float64Array(n),
        adopt1: new Uint8Array(n), adoptN: new Uint8Array(n), n1: 0, nN: 0
      };
      for (var m = 0; m < n; m++) {
        var off = s.sigmaStudy * (dr.uB[m] - dr.uA[m]), o = m * K + N;
        var mA = dr.sumA[o] / N, mB = dr.sumB[o] / N;
        var vA = Math.max(0, (dr.sqA[o] - N * mA * mA) / (N - 1)), vB = Math.max(0, (dr.sqB[o] - N * mB * mB) / (N - 1));
        out.meanA[m] = mA; out.meanB[m] = mB;
        out.base1[m] = off + st * (dr.eB[m] - dr.eA[m]);
        out.baseN[m] = off + st * (mB - mA);
        out.thr[m] = -z * st * Math.sqrt((vA + vB) / N);
        out.single[m] = s.delta + out.base1[m];
        out.reruns[m] = s.delta + out.baseN[m];
        if (out.single[m] < 0) { out.adopt1[m] = 1; out.n1++; }
        if (out.reruns[m] < out.thr[m]) { out.adoptN[m] = 1; out.nN++; }
      }
      return out;
    },

    /** Adoptions among the simulated comparisons of sim at another true difference. */
    counts: function (sim, delta) {
      var a = 0, b = 0;
      for (var m = 0; m < sim.base1.length; m++) {
        if (delta + sim.base1[m] < 0) a++;
        if (delta + sim.baseN[m] < sim.thr[m]) b++;
      }
      return { single: a, reruns: b };
    },

    /** The rerun comparisons of seeds 1 to K (default rateSeeds), 200 per seed, in the standard
        units simulate() scales: for comparison i (seed 1 + floor(i / 200)) the difference of the
        study offsets du[i] = uB - uA and, for each N from 2 to 20, the difference of the N-run
        means dm[N][i] = mB - mA and r[N][i] = sqrt((vA + vB) / N). The draws are those of draws()
        (the same forks, in the same order) and the arithmetic is that of simulate(), so the
        rule's adoptions here equal those of simulate(draws(seed), s) seed by seed. The single
        runs and the jitter come from other forks and are not drawn. About 35 ms and 6 MB. */
    pool: function (K) {
      K = K || RATE_SEEDS;
      var n = K * COMPARISONS, du = new Float64Array(n), dm = [], r = [];
      for (var N = 2; N <= MAXN; N++) { dm[N] = new Float64Array(n); r[N] = new Float64Array(n); }
      for (var seed = 1; seed <= K; seed++) {
        var g = TP.prng.create(seed), gs = g.fork('variance:study');
        var ga = g.fork('variance:reruns:A'), gb = g.fork('variance:reruns:B');
        for (var m = 0; m < COMPARISONS; m++) {
          var i = (seed - 1) * COMPARISONS + m, uA = gs.normal(), uB = gs.normal();
          du[i] = uB - uA;
          var a = 0, aa = 0, b = 0, bb = 0;
          for (var k = 1; k <= MAXN; k++) {
            var x = ga.normal(), y = gb.normal();
            a += x; aa += x * x; b += y; bb += y * y;
            if (k < 2) continue;
            var mA = a / k, mB = b / k;
            var vA = Math.max(0, (aa - k * mA * mA) / (k - 1)), vB = Math.max(0, (bb - k * mB * mB) / (k - 1));
            dm[k][i] = mB - mA;
            r[k][i] = Math.sqrt((vA + vB) / k);
          }
        }
      }
      return { seeds: K, n: n, du: du, dm: dm, r: r };
    },

    /** Adoptions by the rerun rule among the pooled comparisons of P at each true difference of
        grid (ascending), at settings s = {sigmaStudy, sigmaTrial, N}. A comparison adopts at
        delta when delta + base < thr, with base and thr computed as simulate() computes them.
        The adopting grid points of a comparison are a prefix of the grid, so one histogram of
        prefix lengths gives every count: O(comparisons + grid), about 0.3 ms for 20,000. */
    poolCounts: function (P, s, grid) {
      var G = grid.length, g0 = grid[0], h = G > 1 ? (grid[G - 1] - g0) / (G - 1) : 1;
      var z = VAR.z, ss = s.sigmaStudy, st = s.sigmaTrial, du = P.du, dm = P.dm[s.N], r = P.r[s.N];
      var hist = new Int32Array(G + 1);
      for (var i = 0; i < P.n; i++) {
        var base = ss * du[i] + st * dm[i], thr = -z * st * r[i];
        /* the number of grid points that adopt: estimated, then settled by the rule itself */
        var j = Math.ceil((thr - base - g0) / h);
        if (!(j >= 0)) j = 0; else if (j > G) j = G;
        while (j > 0 && !(grid[j - 1] + base < thr)) j--;
        while (j < G && grid[j] + base < thr) j++;
        hist[j]++;
      }
      var out = new Int32Array(G), acc = 0;
      for (var k = G - 1; k >= 0; k--) { acc += hist[k + 1]; out[k] = acc; }
      return out;
    }
  };

  /* ---------- version 2: the action form of F7.1 ---------- */

  var MU = 23;                  // the incumbent's error averaged over studies, in points (version 1's)
  var TRUE_DIFFERENCE = -0.2;   // the candidate's mean over studies minus the incumbent's (calibrated; C7)
  var INCUMBENT_RERUNS = 5;     // reruns of the incumbent in the state at step 0 (calibrated; C7)

  /* trialSd and studySd are standard deviations in percentage points. study-larger and
     study-smaller are the contrasting cases of L1091-L1093 (calibrated; C7 and the lead's ruling). */
  var PRESETS = Object.freeze({
    playbook: Object.freeze({ trialSd: 0.1, studySd: 0.3 }),
    bouthillier: Object.freeze({ trialSd: 0.3, studySd: 0.3 }),
    'study-larger': Object.freeze({ trialSd: 0.1, studySd: 0.6 }),
    'study-smaller': Object.freeze({ trialSd: 0.1, studySd: 0.02 })
  });

  function presetOf(preset) {
    if (preset && typeof preset === 'object') return preset;
    var p = PRESETS[preset];
    if (!p) throw new RangeError('TP.variance: unknown preset ' + preset);
    return p;
  }

  /**
   * init(preset, seed = 1, o) -> the state at step 0, a plain object the runtime can clone:
   * {preset, trialSd, studySd, mu, delta, candidate: {offset, runs: []}, incumbent: {offset,
   * runs: [{value, jitter}]}, studies: []}. preset is a key of PRESETS or {trialSd, studySd}.
   * o = {delta = TRUE_DIFFERENCE, incumbentReruns = INCUMBENT_RERUNS} sets the settings SC4.2's
   * cases state (a true gain of 0.03 or 0.4 points, read against the standard error of the
   * difference of the rerun means). Offsets are in percentage points. The candidate's and the incumbent's study
   * offsets are normals 1 and 2 of fork 'reruns:offsets' of the seed, the incumbent's k-th rerun
   * uses normal k of fork 'reruns:incumbent', and its jitter uniform k of fork 'reruns:jitter'.
   */
  function init(preset, seed, o) {
    var p = presetOf(preset);
    o = o || {};
    if (!TP.prng) throw new Error('TP.variance: load prng.js first');
    var g = TP.prng.create(seed === undefined ? 1 : seed);
    var go = g.fork('reruns:offsets'), gi = g.fork('reruns:incumbent'), gj = g.fork('reruns:jitter');
    var zB = go.normal(), zA = go.normal();
    var runs = [], nInc = o.incumbentReruns === undefined ? INCUMBENT_RERUNS : o.incumbentReruns;
    for (var k = 0; k < nInc; k++) {
      runs.push({ value: MU + p.studySd * zA + p.trialSd * gi.normal(), jitter: gj.uniform() });
    }
    return {
      preset: typeof preset === 'string' ? preset : null,
      trialSd: p.trialSd,
      studySd: p.studySd,
      mu: MU,
      delta: o.delta === undefined ? TRUE_DIFFERENCE : o.delta,
      candidate: { offset: p.studySd * zB, runs: [] },
      incumbent: { offset: p.studySd * zA, runs: runs },
      studies: []
    };
  }

  /** rerun(state, rng): appends {value, jitter} to state.candidate.runs, in place; returns state. */
  function rerun(state, rng) {
    var value = state.mu + state.delta + state.candidate.offset + state.trialSd * rng.normal();
    state.candidate.runs.push({ value: value, jitter: rng.uniform() });
    return state;
  }

  /**
   * repeat(state, rng): draws a new study offset and appends the repeated study's best trial,
   * {value, offset, jitter}, to state.studies, in place; returns state. The candidate's reruns
   * and offset are unchanged.
   */
  function repeat(state, rng) {
    var offset = state.studySd * rng.normal();
    var value = state.mu + state.delta + offset + state.trialSd * rng.normal();
    state.studies.push({ value: value, offset: offset, jitter: rng.uniform() });
    return state;
  }

  /** {n, mean, sd, se} of a list of numbers or of runs {value}; sd and se are null below 2. */
  function stats(list) {
    var n = list.length, s = 0, ss = 0;
    for (var i = 0; i < n; i++) { var v = typeof list[i] === 'number' ? list[i] : list[i].value; s += v; ss += v * v; }
    if (!n) return { n: 0, mean: null, sd: null, se: null };
    var mean = s / n;
    if (n < 2) return { n: n, mean: mean, sd: null, se: null };
    var sd = Math.sqrt(Math.max(0, (ss - n * mean * mean) / (n - 1)));
    return { n: n, mean: mean, sd: sd, se: sd / Math.sqrt(n) };
  }

  /**
   * summary(state) -> {candidate: stats, incumbent: stats, difference: {value, se}, studies: {m, lo,
   * hi}}: what F7.1's readout and record print (the candidate's mean after n reruns, the incumbent's
   * over k reruns, and the range of the m repeated studies' best trials; lo and hi are null while m
   * is 0). difference.value is the candidate's mean minus the incumbent's (null before the first
   * rerun), and difference.se the standard error of that difference, sqrt(s_c^2 / n_c + s_i^2 / n_i),
   * the adoption yardstick of the lead's Batch 7 ruling, the site's reading of "taking into account
   * the retrain variance of both" (L1101-L1109); null until both means have a standard error.
   */
  function summary(state) {
    var vals = state.studies.map(function (s) { return s.value; });
    var c = stats(state.candidate.runs), i = stats(state.incumbent.runs);
    return {
      candidate: c,
      incumbent: i,
      difference: {
        value: c.n && i.n ? c.mean - i.mean : null,
        se: c.se != null && i.se != null ? Math.sqrt(c.se * c.se + i.se * i.se) : null
      },
      studies: {
        m: vals.length,
        lo: vals.length ? Math.min.apply(null, vals) : null,
        hi: vals.length ? Math.max.apply(null, vals) : null
      }
    };
  }

  VAR.MU = MU;
  VAR.TRUE_DIFFERENCE = TRUE_DIFFERENCE;
  VAR.INCUMBENT_RERUNS = INCUMBENT_RERUNS;
  VAR.PRESETS = PRESETS;
  VAR.init = init;
  VAR.rerun = rerun;
  VAR.repeat = repeat;
  VAR.stats = stats;
  VAR.summary = summary;
})(typeof window !== 'undefined' ? window : globalThis);
