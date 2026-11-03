/*
 * coverage.js: grid, uniform random and quasi-random trials in d hyperparameters, and how they
 * cover one hyperparameter (TP.coverage), for F5.1.
 *
 * Ported from version 1's p5-coverage.js (TP.models.coverage), which drew the three methods in two
 * dimensions; version 2 draws them in d dimensions (R7) and drops version 1's test function g(x).
 * Points lie in the unit cube, coordinate 0 standing for the learning rate and coordinate 1 for
 * the weight decay:
 *
 *   grid    the largest full grid within n trials, k points per axis with k^d <= n, at
 *           ((i + 1/2) / k) on each axis, coordinate 0 varying fastest; no seed. grid(n, d) gives
 *           {k, count = k^d}, and the other n - count trials are the ones a grid cannot use.
 *   random  uniform points from the seed. Coordinates 0 and 1 of point i are uniforms 2i and
 *           2i + 1 of TP.prng.create(TP.prng.deriveSeed(seed, 'coverage:random')), version 1's
 *           stream, and coordinate j >= 2 is uniform i of deriveSeed(seed, 'coverage:random:' + j).
 *   quasi   scrambled, shifted Halton points, TP.halton.sequence({n, dims: d, seed}): bases 2, 3,
 *           5 and 7, the learning rate on base 2 (Bousquet et al. 2017, Remark 2).
 *
 * In two dimensions the three methods give version 1's points. Each coordinate of a random or
 * quasi-random point is the same whatever d is, and the first m points of n are the m-point set,
 * so adding a hyperparameter never moves the learning rates already drawn.
 *
 * The projection statistics are version 1's: values within TOLERANCE of each other count as one
 * distinct value, and the largest gap between neighbouring sorted values includes the gaps from 0
 * to the smallest value and from the largest to 1. The largest projected gap is the site's
 * statistic. Needs prng.js and halton.js, looked up when called.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var METHODS = ['grid', 'random', 'quasi'];
  var TOLERANCE = 1e-9;
  var MAX_DIMS = 6;   // the Halton generator's bases

  function checkArgs(d, n) {
    if (!(d >= 1 && d <= MAX_DIMS && d === Math.floor(d))) throw new RangeError('TP.coverage: d must be an integer from 1 to ' + MAX_DIMS);
    if (!(n >= 0 && n === Math.floor(n))) throw new RangeError('TP.coverage: n must be a non-negative integer');
  }

  function ipow(k, d) { var p = 1; for (var j = 0; j < d; j++) p *= k; return p; }

  /** grid(n, d) -> {k, count}: the largest full grid within n trials, k^d = count <= n. */
  function grid(n, d) {
    checkArgs(d, n);
    var k = Math.floor(Math.pow(n, 1 / d));
    while (ipow(k + 1, d) <= n) k++;
    while (k > 0 && ipow(k, d) > n) k--;
    return { k: k, count: ipow(k, d) };
  }

  function gridPoints(n, d) {
    var k = grid(n, d).k, count = ipow(k, d), pts = new Array(count);
    for (var idx = 0; idx < count; idx++) {
      var p = new Array(d), rest = idx;
      for (var j = 0; j < d; j++) {
        var digit = rest % k;
        p[j] = (digit + 0.5) / k;
        rest = (rest - digit) / k;
      }
      pts[idx] = p;
    }
    return pts;
  }

  function randomPoints(n, d, seed) {
    var first = TP.prng.create(TP.prng.deriveSeed(seed, 'coverage:random'));
    var more = [];
    for (var j = 2; j < d; j++) more.push(TP.prng.create(TP.prng.deriveSeed(seed, 'coverage:random:' + j)));
    var pts = new Array(n);
    for (var i = 0; i < n; i++) {
      var p = new Array(d), x = first.uniform(), y = first.uniform();
      p[0] = x;
      if (d > 1) p[1] = y;
      for (j = 2; j < d; j++) p[j] = more[j - 2].uniform();
      pts[i] = p;
    }
    return pts;
  }

  /**
   * points(method, d, n, seed = 1) -> an array of points, each an array of d numbers in [0, 1).
   * method is 'grid' (which returns grid(n, d).count points), 'random' or 'quasi'.
   */
  function points(method, d, n, seed) {
    checkArgs(d, n);
    seed = seed === undefined ? 1 : seed;
    if (method === 'grid') return gridPoints(n, d);
    if (!TP.prng) throw new Error('TP.coverage: load prng.js before drawing random or quasi-random points');
    if (method === 'random') return randomPoints(n, d, seed);
    if (method === 'quasi') {
      if (!TP.halton) throw new Error('TP.coverage: load halton.js before drawing quasi-random points');
      return TP.halton.sequence({ n: n, dims: d, seed: seed });
    }
    throw new RangeError('TP.coverage: method must be one of ' + METHODS.join(', '));
  }

  function sorted(values) {
    return Array.prototype.slice.call(values).sort(function (a, b) { return a - b; });
  }

  /** The number of distinct values, counting values within TOLERANCE of each other as one. */
  function distinct(values) {
    var xs = sorted(values), count = 0, last = -Infinity;
    for (var i = 0; i < xs.length; i++) {
      if (xs[i] - last > TOLERANCE) { count++; last = xs[i]; }
    }
    return count;
  }

  /** The largest gap between neighbouring values in [0, 1], the gaps to 0 and 1 included; 1 if none. */
  function largestGap(values) {
    var xs = sorted(values);
    if (!xs.length) return 1;
    var gap = xs[0];
    for (var i = 1; i < xs.length; i++) gap = Math.max(gap, xs[i] - xs[i - 1]);
    return Math.max(gap, 1 - xs[xs.length - 1]);
  }

  /** project(points, axis = 0) -> {values (sorted), distinct, gap}: the points projected on one axis. */
  function project(pts, axis) {
    axis = axis || 0;
    var values = sorted(pts.map(function (p) { return p[axis]; }));
    return { values: values, distinct: distinct(values), gap: largestGap(values) };
  }

  TP.coverage = {
    METHODS: METHODS,
    TOLERANCE: TOLERANCE,
    grid: grid,
    points: points,
    distinct: distinct,
    largestGap: largestGap,
    project: project
  };
})(typeof window !== 'undefined' ? window : globalThis);
