/*
 * desiderata.js: the toy for spreading a fixed number of trials (TP.desiderata), for F4.2.
 *
 * Version 1's p4-desiderata.js (TP.models.desiderata), rebuilt by Batch 1 (implementation plan §5.7,
 * C6, and WO-F4.2) to the conditions of synthesis ruling R3. The stated form is kept: one quadratic
 * valley per scientific value in the nuisance learning rate. The constants are arbitrary and were
 * chosen by measurement (notes/revamp/calibration/c6-design.md):
 *   - the scientific values are a fixed list, VALUES, and a design with S values uses the first S of
 *     it, so adding a value never moves the truly best one (the second value, s = 0.2, at every S);
 *   - the best value's gap to each neighbour in E_min is GAP = 6 times SIGMA, and the setting
 *     'close' (GAPS.close, 0.5) puts it below the trial noise, for F4.2's preset "values close
 *     together";
 *   - CURVATURE makes the probability at 5 decades about half at the default (3 values, 48 trials);
 *   - the probability is computed over the fixed repeat seeds 1 to REPEATS, which do not depend on
 *     the seed of the displayed studies, so "Draw again" never changes the curve.
 *
 * Toy model: scientific values s in VALUES = [0, 0.2, 0.4, 0.6, 0.8, 1]; with x = log10 learning rate,
 *   E(x; s) = E_min(s) + CURVATURE (x - x*(s))^2,
 *   E_min(s; g) = E_BEST + g SIGMA ((s - 0.2) / 0.2)^2  (lowest at s = 0.2, where it is 0.24), with g
 *   the gap to each neighbour in units of the trial noise: GAPS.separated (6) by default and
 *   GAPS.close (0.5) under the preset,
 *   x*(s) = CENTER + OFFSETS[k] for the k-th value of VALUES. The offsets, in decades from the
 *   range's centre, are [0, +0.6, -0.3, +0.3, -0.15, +0.15]: the truly best value's optimum (+0.6) is
 *   the farthest from the centre at every S, and every other value's lies within 0.3 decades of it.
 *   So at every S the narrowest range that holds every value's optimum is the one the truly best
 *   value's optimum enters, 1.2 decades, and each value's optimum leaves the range below 2|offset|
 *   decades (1.2 for the truly best value, 0.6 for the third and fourth, 0.3 for the fifth and
 *   sixth, never for the first). Batch 4's figure fixes set this layout, which replaced a line of
 *   optima 0.6 decades apart (the first at the centre), under the lead's ruling on the page 4 reads:
 *   at the width where the curve peaks, every value's optimum lies inside the range, and the truly
 *   best value's optimum is the farthest from the range's centre. With the old line the peak (1.375
 *   decades) left the third value's optimum outside. Among the layouts tried (tests/calibration/
 *   fig-spread.calibrate.js), this one also keeps every curve's maximum falling as values are added.
 * One study per scientific value, n = floor(T / S) trials each, over the range
 * [CENTER - W/2, CENTER + W/2]. Study j of a design with seed d places its trials at the first n
 * points of a randomly shifted van der Corput sequence seeded with TP.prng.deriveSeed(d, j), and trial
 * i reports y = E + SIGMA eps_i, with eps_i the i-th normal of TP.prng.create(deriveSeed(that seed,
 * 'noise')). The design picks the s_j whose best trial is lowest; the truly best value is
 * argmin_j E_min(s_j). P is the share of the REPEATS designs, with seeds 1 .. REPEATS, whose pick is
 * the truly best value. curve(S, T) gives P at each width of WIDTHS.
 *
 * Batch 7 (the lead's ruling on the practitioner's finding 3): SIGMA is 0.001, the playbook's retrain
 * spread of about ±0.1% as page 5 reads it, where it was 0.0001. The pick depends on the errors only
 * through their differences over the noise, so the gaps (6 SIGMA) and CURVATURE were scaled by the
 * same factor of 10 (0.0006 to 0.006, and 0.24 to 2.4). Every probability of the repeat designs is
 * therefore unchanged, and so is panel (b)'s depth, sqrt((E - E_min) / CURVATURE). Kept at 0.24, the
 * curvature would leave the default's curve at 98% from 1.25 decades to 5 (measured: 100% at the peak,
 * 98% at 5 decades), with no fall at wide ranges.
 *
 * Cost (version 1's note): study() calls TP.halton.vanDerCorput. The repeats compute the same
 * numbers directly: in base 2 the only digit permutation that keeps 0 fixed is the identity, so a
 * sequence is the plain radical inverse plus the shift, and the shift is the first uniform of
 * TP.prng.create(deriveSeed(seed, 'halton:2')) (both stated in halton.js). The repeats draw that
 * uniform and their normals with prng.js's generator written out inline, which allocates nothing
 * per stream, and cache the shifts and noise of each (repeat seed, j). tests/lib/desiderata.test.js
 * checks the direct numbers against TP.halton and TP.prng. Needs prng.js and halton.js, looked up
 * when called.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  /* ---------- the calibrated constants (C6) ---------- */
  var VALUES = Object.freeze([0, 0.2, 0.4, 0.6, 0.8, 1]);
  var E_BEST = 0.24;
  var GAPS = Object.freeze({ separated: 6, close: 0.5 });
  var GAP = GAPS.separated;
  var OFFSETS = Object.freeze([0, 0.6, -0.3, 0.3, -0.15, 0.15]);
  var CENTER = -3;
  var CURVATURE = 2.4;
  var SIGMA = 0.001;
  var REPEATS = 200;

  /* ---------- the figure's grids ---------- */
  var NMAX = 48, SMAX = VALUES.length;
  var TRIALS = Object.freeze([24, 48, 96]);
  var WIDTHS = (function () {
    var w = [];
    for (var k = 2; k <= 40; k++) w.push(k / 8);
    return Object.freeze(w);
  })();

  /* the gap to each neighbour in units of SIGMA: a number, a key of GAPS, or absent for GAP */
  function gapOf(g) {
    if (g == null) return GAP;
    if (typeof g === 'string') {
      if (!Object.prototype.hasOwnProperty.call(GAPS, g)) throw new RangeError('TP.desiderata: no gap setting ' + g);
      return GAPS[g];
    }
    return g;
  }
  function eMin(s, g) { var z = (s - 0.2) / 0.2; return E_BEST + gapOf(g) * SIGMA * z * z; }
  function xStar(s) {
    var k = VALUES.indexOf(s);
    if (k < 0) throw new RangeError('TP.desiderata: ' + s + ' is not one of the scientific values');
    return CENTER + OFFSETS[k];
  }
  function error(x, s, g) { var d = x - xStar(s); return eMin(s, g) + CURVATURE * d * d; }
  function checkS(S) {
    if (!(S >= 2 && S <= SMAX && S === Math.floor(S))) throw new RangeError('TP.desiderata: S must be an integer from 2 to ' + SMAX);
  }
  /** The first S values of the fixed list. */
  function values(S) { checkS(S); return VALUES.slice(0, S); }
  /** The 1-based index of the truly best of the first S values. */
  function truth(S) {
    var v = values(S), b = 0;
    for (var j = 1; j < S; j++) if (eMin(v[j], 1) < eMin(v[b], 1)) b = j;
    return b + 1;
  }
  function range(W) { return [CENTER - W / 2, CENTER + W / 2]; }

  /* Base-2 radical inverses of 1..NMAX, computed as halton.js does (exact numerator over 2^K). */
  var VDC = new Float64Array(NMAX + 1);
  for (var i0 = 1; i0 <= NMAX; i0++) {
    var num = 0, den = 1, ii = i0;
    while (ii > 0) { var d = ii % 2; num = num * 2 + d; den *= 2; ii = (ii - d) / 2; }
    VDC[i0] = num / den;
  }

  /** The seed of study j (1-based) of a design with this seed. */
  function studySeed(seed, j) { return TP.prng.deriveSeed(seed, j); }

  /** The first n units of study j's sequence, computed directly (same numbers as TP.halton). */
  function unitsDirect(sj, n) {
    var shift = TP.prng.create(TP.prng.deriveSeed(sj, 'halton:2')).uniform(), out = new Float64Array(n);
    for (var i = 0; i < n; i++) { var x = VDC[i + 1] + shift; if (x >= 1) x -= 1; out[i] = x; }
    return out;
  }
  function noise(sj, n) {
    var g = TP.prng.create(TP.prng.deriveSeed(sj, 'noise')), out = new Float64Array(n);
    for (var i = 0; i < n; i++) out[i] = g.normal();
    return out;
  }

  /* The generator of prng.js (mulberry32, and Box-Muller normals from two consecutive uniforms,
     cosine first, then the cached sine) written out without allocating a generator object. The
     same numbers as TP.prng.create(seed).uniform() and .normal(). */
  function firstUniform(seed) {
    var state = ((seed >>> 0) + 0x6d2b79f5) | 0;
    var t = Math.imul(state ^ (state >>> 15), state | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function fillNormals(seed, out, off, n) {
    var state = (seed >>> 0) | 0, i = 0, t, u1, u2, r, th;
    while (i < n) {
      state = (state + 0x6d2b79f5) | 0;
      t = Math.imul(state ^ (state >>> 15), state | 1);
      t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
      u1 = 1 - ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      state = (state + 0x6d2b79f5) | 0;
      t = Math.imul(state ^ (state >>> 15), state | 1);
      t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
      u2 = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      r = Math.sqrt(-2 * Math.log(u1));
      th = 2 * Math.PI * u2;
      out[off + i++] = r * Math.cos(th);
      if (i < n) out[off + i++] = r * Math.sin(th);
    }
    return out;
  }

  /**
   * study({S, W, T, seed, gap}) -> {n, lo, hi, perDecade, truth, pick, covered, studies: [{j, s,
   * eMin, xStar, inRange, trials: [{i, x, y}], best}]}: the displayed design. The sequences come from
   * TP.halton.vanDerCorput. gap is a key of GAPS or a number (units of SIGMA), GAP when absent; it
   * moves no trial's position or noise, only each value's E_min.
   */
  function study(o) {
    var n = Math.floor(o.T / o.S), r = range(o.W), v = values(o.S), pick = 0, covered = 0;
    var studies = v.map(function (s, k) {
      var j = k + 1, sj = studySeed(o.seed, j);
      var u = TP.halton.vanDerCorput({ n: n, seed: sj }), eps = noise(sj, n), trials = [], best = null;
      for (var i = 0; i < n; i++) {
        var x = TP.halton.map(u[i], r[0], r[1]), t = { i: i + 1, x: x, y: error(x, s, o.gap) + SIGMA * eps[i] };
        trials.push(t);
        if (!best || t.y < best.y) best = t;
      }
      var xs = xStar(s), inRange = xs >= r[0] - 1e-12 && xs <= r[1] + 1e-12;
      if (inRange) covered++;
      return { j: j, s: s, eMin: eMin(s, o.gap), xStar: xs, inRange: inRange, trials: trials, best: best };
    });
    studies.forEach(function (st, k) { if (st.best.y < studies[pick].best.y) pick = k; });
    return { n: n, lo: r[0], hi: r[1], perDecade: n / o.W, truth: truth(o.S), pick: pick + 1, covered: covered, studies: studies };
  }

  /**
   * runRepeats({S, W, T, gap}, cache) -> {hits, P, picks}: the design rerun with the fixed seeds 1 ..
   * REPEATS (any seed in the argument is ignored). gap as in study(). cache (a Map, optional) keeps, per repeat seed,
   * the sequence shift of each study j, its normals, and how many normals are stored. Normals are
   * drawn up to the n in use; a larger n later redraws that study's stream from its start, which
   * gives the same first values. n is at most NMAX.
   */
  function runRepeats(o, cache) {
    cache = cache || new Map();
    var n = Math.floor(o.T / o.S), r = range(o.W), w = r[1] - r[0], v = values(o.S), want = truth(o.S);
    if (n > NMAX) throw new RangeError('TP.desiderata: at most ' + NMAX + ' trials per study');
    var em = v.map(function (s) { return eMin(s, o.gap); }), xs = v.map(xStar), hits = 0, picks = new Array(o.S + 1).fill(0);
    for (var rep = 1; rep <= REPEATS; rep++) {
      var c = cache.get(rep);
      if (!c) {
        c = { shift: new Float64Array(SMAX), e: new Float64Array(SMAX * NMAX), len: new Uint8Array(SMAX), has: new Uint8Array(SMAX) };
        cache.set(rep, c);
      }
      var bestJ = 0, bestY = Infinity;
      for (var k = 0; k < o.S; k++) {
        if (!c.has[k] || c.len[k] < n) {
          var sj = studySeed(rep, k + 1);
          if (!c.has[k]) { c.shift[k] = firstUniform(TP.prng.deriveSeed(sj, 'halton:2')); c.has[k] = 1; }
          fillNormals(TP.prng.deriveSeed(sj, 'noise'), c.e, k * NMAX, n);
          c.len[k] = n;
        }
        var m = Infinity, e = c.e, off = k * NMAX, shift = c.shift[k], x0 = r[0] - xs[k], base = em[k];
        for (var i = 0; i < n; i++) {
          var u = VDC[i + 1] + shift;
          if (u >= 1) u -= 1;
          var dx = x0 + u * w, y = base + CURVATURE * dx * dx + SIGMA * e[off + i];
          if (y < m) m = y;
        }
        if (m < bestY) { bestY = m; bestJ = k + 1; }
      }
      picks[bestJ]++;
      if (bestJ === want) hits++;
    }
    return { hits: hits, P: hits / REPEATS, picks: picks };
  }

  /** curve(S, T, cache, gap) -> P at each width of WIDTHS, the curve of F4.2's panel (a). The cache
      holds no E_min, so one cache serves both gap settings. */
  function curve(S, T, cache, gap) {
    cache = cache || new Map();
    return WIDTHS.map(function (W) { return runRepeats({ S: S, W: W, T: T, gap: gap }, cache).P; });
  }

  TP.desiderata = {
    VALUES: VALUES,
    E_BEST: E_BEST,
    GAP: GAP,
    GAPS: GAPS,
    OFFSETS: OFFSETS,
    CENTER: CENTER,
    CURVATURE: CURVATURE,
    SIGMA: SIGMA,
    REPEATS: REPEATS,
    NMAX: NMAX,
    SMAX: SMAX,
    TRIALS: TRIALS,
    WIDTHS: WIDTHS,
    gapOf: gapOf,
    eMin: eMin,
    xStar: xStar,
    error: error,
    values: values,
    truth: truth,
    range: range,
    studySeed: studySeed,
    unitsDirect: unitsDirect,
    noise: noise,
    study: study,
    runRepeats: runRepeats,
    curve: curve,
    firstUniform: firstUniform,
    fillNormals: fillNormals
  };
})(typeof window !== 'undefined' ? window : globalThis);
