/*
 * halton.js: scrambled, shifted Halton points for the quasi-random search figures (TP.halton).
 *
 * Implements the quasi-random convention of notes/specs/pages-4-6.md ("Shared conventions"),
 * with the scrambling and shift described in notes/refs/bousquet2017.md (implementation notes).
 * For index i and base b, with d_0, d_1, ... the base-b digits of i (least significant first):
 *
 *   h_b(i) = sum over k of pi_{b,k}(d_k) * b^-(k+1),      u = (h_b(i) + s_b) mod 1,
 *
 * where pi_{b,k} is a seeded random permutation of {0, ..., b-1} with pi_{b,k}(0) = 0, one per
 * base and digit position, and s_b is a seeded uniform shift per base. Dimension j uses base
 * 2, 3, 5, 7, 11, 13 for j = 0..5. Indices run 1 + skip, 2 + skip, ..., n + skip.
 * Needs prng.js, looked up when called, so the order of the script tags does not matter.
 *
 * Keeping 0 fixed means leading zeros stay zero, so h_b(i) needs only the digits of i and is
 * exact. It also means the only base-2 permutation is the identity: in base 2 the seed acts
 * through the shift alone (bousquet2017.md makes the same remark).
 *
 * Random draws: base b uses its own generator, TP.prng.create(TP.prng.deriveSeed(seed, 'halton:' + b)).
 * It draws the shift s_b first, then one Fisher-Yates shuffle of [1, ..., b-1] per digit
 * position k = 0, 1, 2, ... in order. Consequences, all relied on by the figures:
 *   - the first m points of a longer sequence with the same seed are the m-point sequence,
 *     so adding trials never moves the existing ones;
 *   - coordinate j is the same whatever dims is, and vanDerCorput is the first coordinate;
 *   - turning scramble off leaves the shift unchanged, and turning shift off leaves the
 *     permutations unchanged.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var BASES = [2, 3, 5, 7, 11, 13];

  // Digit positions per base: 32 for base 2, and for the other bases enough that b^D >= 2^53
  // (double precision), D = ceil(53 / log2 b). With pi(0) = 0, digits past the length of an
  // index contribute nothing, so D only caps the index: base 2 (always present) limits
  // indices to 2^32 - 1, and every other base covers any index below that.
  var MAX_DIGITS = { 2: 32, 3: 34, 5: 23, 7: 19, 11: 16, 13: 15 };

  function isCount(x) {
    return typeof x === 'number' && x >= 0 && x === Math.floor(x);
  }

  function numDigits(m, b) {
    var k = 0;
    while (m > 0) {
      m = Math.floor(m / b);
      k++;
    }
    return k;
  }

  // Shift and digit permutations for one base; only the first nDigits positions are drawn,
  // which gives the same values as drawing all MAX_DIGITS[b] because positions are drawn in order.
  function baseRandomization(seed, b, nDigits) {
    if (!TP.prng) throw new Error('TP.halton: load prng.js before using scrambled or shifted points');
    var rng = TP.prng.create(TP.prng.deriveSeed(seed, 'halton:' + b));
    var shift = rng.uniform();
    var perms = new Array(nDigits);
    for (var k = 0; k < nDigits; k++) {
      var rest = [];
      for (var d = 1; d < b; d++) rest.push(d);
      rng.shuffle(rest);
      perms[k] = [0].concat(rest);
    }
    return { shift: shift, perms: perms };
  }

  // Radical inverse of i in base b, digits optionally permuted. The reversed digits are
  // accumulated as an exact integer numerator over b^K (K = number of digits of i, both
  // below 2^53), then divided once, so the result is the correctly rounded exact value.
  function radicalInverse(i, b, perms) {
    var num = 0;
    var den = 1;
    var k = 0;
    while (i > 0) {
      var d = i % b;
      num = num * b + (perms ? perms[k][d] : d);
      den *= b;
      i = (i - d) / b;
      k++;
    }
    return num / den;
  }

  /**
   * sequence({n, dims = 1, seed = 1, scramble = true, shift = true, skip = 0})
   * returns an array of n points, each an array of dims numbers in [0, 1).
   * dims is at most 6; skip + n must not exceed 2^32 - 1.
   */
  function sequence(opts) {
    opts = opts || {};
    var n = opts.n;
    var dims = opts.dims === undefined ? 1 : opts.dims;
    var seed = opts.seed === undefined ? 1 : opts.seed;
    var scramble = opts.scramble === undefined ? true : !!opts.scramble;
    var shift = opts.shift === undefined ? true : !!opts.shift;
    var skip = opts.skip === undefined ? 0 : opts.skip;

    if (!isCount(n)) throw new RangeError('TP.halton.sequence: n must be a non-negative integer');
    if (!isCount(skip)) throw new RangeError('TP.halton.sequence: skip must be a non-negative integer');
    if (!(isCount(dims) && dims >= 1 && dims <= BASES.length)) {
      throw new RangeError('TP.halton.sequence: dims must be an integer from 1 to ' + BASES.length);
    }
    var maxIndex = skip + n;
    var j;
    for (j = 0; j < dims; j++) {
      if (numDigits(maxIndex, BASES[j]) > MAX_DIGITS[BASES[j]]) {
        throw new RangeError('TP.halton.sequence: indices must stay below 2^32 (skip + n = ' + maxIndex + ')');
      }
    }

    var rand = new Array(dims);
    if (scramble || shift) {
      for (j = 0; j < dims; j++) {
        rand[j] = baseRandomization(seed, BASES[j], numDigits(maxIndex, BASES[j]));
      }
    }

    var points = new Array(n);
    for (var p = 0; p < n; p++) {
      var i = skip + p + 1;
      var point = new Array(dims);
      for (j = 0; j < dims; j++) {
        var x = radicalInverse(i, BASES[j], scramble ? rand[j].perms : null);
        if (shift) {
          x += rand[j].shift; // both terms are in [0, 1), so one subtraction wraps mod 1
          if (x >= 1) x -= 1;
        }
        point[j] = x;
      }
      points[p] = point;
    }
    return points;
  }

  /**
   * vanDerCorput({n, seed = 1, scramble = true, shift = true, skip = 0}): the one-dimensional
   * base-2 case, returned as a flat array of n numbers in [0, 1). Equal to the first
   * coordinate of sequence() with the same seed and options.
   */
  function vanDerCorput(opts) {
    opts = opts || {};
    var pts = sequence({
      n: opts.n,
      dims: 1,
      seed: opts.seed,
      scramble: opts.scramble,
      shift: opts.shift,
      skip: opts.skip
    });
    var out = new Array(pts.length);
    for (var p = 0; p < pts.length; p++) out[p] = pts[p][0];
    return out;
  }

  /** map(u, lo, hi) = lo + u * (hi - lo): a unit coordinate into a range (log10 units for rates). */
  function map(u, lo, hi) {
    return lo + u * (hi - lo);
  }

  TP.halton = {
    bases: BASES.slice(),
    sequence: sequence,
    vanDerCorput: vanDerCorput,
    map: map
  };
})(typeof window !== 'undefined' ? window : globalThis);
