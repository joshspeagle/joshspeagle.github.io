/*
 * prng.js: seeded random numbers for every simulated figure (TP.prng).
 *
 * Implements the PRNG convention of notes/specs/pages-4-6.md ("Shared conventions")
 * and notes/phase3-design.md section 1: mulberry32 seeded with a 32-bit integer, and
 * Gaussian draws by Box-Muller from two consecutive uniforms. studentT follows the
 * clipping-threshold spec in notes/specs/pages-7-9.md (a normal divided by
 * sqrt(chi-square_df / df), with the chi-square built from df squared normals).
 *
 * Usage: var g = TP.prng.create(1); g.uniform(); g.normal(); g.fork('noise');
 * The same seed always gives the same sequence. No dependencies.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  // MurmurHash3's 32-bit finalizer. A bijection on 32-bit integers with good avalanche:
  // flipping one input bit flips about half of the output bits.
  function fmix32(h) {
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }

  // A fork label as a 32-bit integer. A number is used as its value >>> 0; anything else
  // is hashed with 32-bit FNV-1a (offset basis 0x811c9dc5, prime 0x01000193) over the
  // UTF-16 code units of String(label). So fork(3) and fork('3') are different streams.
  function labelHash(label) {
    if (typeof label === 'number') return label >>> 0;
    var s = String(label);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /**
   * The seed of the generator that create(seed).fork(label) returns:
   *
   *   deriveSeed(seed, label) = fmix32( (fmix32(seed >>> 0) + labelHash(label) * 0x9e3779b9) mod 2^32 )
   *
   * fmix32 is a bijection and 0x9e3779b9 is odd, so with the seed fixed, distinct numeric
   * labels (mod 2^32) always give distinct derived seeds, and with the label fixed,
   * distinct seeds do too. Use it wherever a spec says "a seed derived from (seed, j)",
   * for example TP.halton.sequence({seed: TP.prng.deriveSeed(seed, j), ...}).
   */
  function deriveSeed(seed, label) {
    if (label === undefined || label === null) {
      throw new TypeError('TP.prng: fork and deriveSeed need a string or number label');
    }
    return fmix32((fmix32(seed >>> 0) + Math.imul(labelHash(label), 0x9e3779b9)) >>> 0);
  }

  /**
   * A generator seeded with seed >>> 0 (any number is accepted: 1.9 gives 1, -1 gives
   * 4294967295, undefined or NaN gives 0). Methods close over the state, so they can be
   * passed around unbound (e.g. d3.range(5).map(g.uniform)).
   *
   *   g.seed         the 32-bit seed in use
   *   g.uniform()    a float in [0, 1), a multiple of 2^-32
   *   g.normal()     a standard normal by Box-Muller; each call to the method that finds
   *                  no cached value uses two consecutive uniforms and caches the second
   *                  normal of the pair for the next call
   *   g.studentT(df) Student-t with integer df >= 1 (uses 1 + df normals)
   *   g.int(n)       an integer in [0, n) for a positive integer n (at most 2^32)
   *   g.shuffle(a)   Fisher-Yates shuffle of the array a in place; returns a
   *   g.fork(label)  a new generator seeded with deriveSeed(g.seed, label); it depends only
   *                  on g.seed and the label, not on how many values g has drawn, and it
   *                  does not advance g
   *
   * mulberry32 has a 32-bit state on a single cycle of length 2^32, so each fork is a
   * pseudo-random starting point on that one cycle. With n forks drawing L values each, about
   * n^2 L / 2^32 pairs of forks share a stretch of values. That is far below one pair for
   * most figures here (best-step-reader: 50 forks of about 100 draws), and about one pair in
   * the how-many-trials fresh mode (7,500 studies of about 25 draws), where it would
   * correlate two studies' draws without visibly changing the box plots.
   */
  function create(seed) {
    var s = seed >>> 0;
    var state = s | 0;
    var spare = 0;
    var hasSpare = false;

    // mulberry32 (Tommy Ettinger, public domain), in the JavaScript form by bryc,
    // with the state kept as a wrapped 32-bit integer.
    function uniform() {
      state = (state + 0x6d2b79f5) | 0;
      var t = Math.imul(state ^ (state >>> 15), state | 1);
      t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    function normal() {
      if (hasSpare) {
        hasSpare = false;
        return spare;
      }
      var u1 = 1 - uniform(); // in (0, 1], so the logarithm is finite
      var u2 = uniform();
      var r = Math.sqrt(-2 * Math.log(u1));
      var theta = 2 * Math.PI * u2;
      spare = r * Math.sin(theta);
      hasSpare = true;
      return r * Math.cos(theta);
    }

    function studentT(df) {
      if (!(df >= 1) || df !== Math.floor(df)) {
        throw new RangeError('TP.prng: studentT needs a positive integer df');
      }
      var z = normal();
      var chi2 = 0;
      for (var i = 0; i < df; i++) {
        var g = normal();
        chi2 += g * g;
      }
      return z / Math.sqrt(chi2 / df);
    }

    function randInt(n) {
      if (!(n >= 1) || n !== Math.floor(n)) {
        throw new RangeError('TP.prng: int(n) needs a positive integer n');
      }
      return Math.floor(uniform() * n);
    }

    function shuffle(a) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = randInt(i + 1);
        var tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
      }
      return a;
    }

    function fork(label) {
      return create(deriveSeed(s, label));
    }

    return {
      seed: s,
      uniform: uniform,
      normal: normal,
      studentT: studentT,
      int: randInt,
      shuffle: shuffle,
      fork: fork
    };
  }

  TP.prng = {
    create: create,
    deriveSeed: deriveSeed
  };
})(typeof window !== 'undefined' ? window : globalThis);
