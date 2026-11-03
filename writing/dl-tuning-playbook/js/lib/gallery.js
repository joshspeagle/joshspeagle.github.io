/*
 * gallery.js: the training-curve patterns of figure F6.2, its gallery and its check (TP.gallery).
 * notes/revamp/figure-plan.md F6.2; notes/revamp/implementation-plan.md WO-I8 and WO-F6.2.
 *
 * Every curve is a training loss and a validation error against step, 0 to 10,000, evaluated every
 * 100 steps (101 points), with t = step / 10,000 and the base shape
 *   L(t; L0, Linf, tau) = Linf + (L0 - Linf) exp(-t / tau),   L0 = 0.7 (TP.curves.parametricLoss).
 * The constants are chosen by hand, and the error scale is arbitrary. Needs prng.js and curves.js,
 * looked up when a curve is computed. No DOM.
 *
 * The port. curvePathologyParams, curvePathologies(params) and curvePathologyStats(entry) are version
 * 1's model of figure `curve-pathologies` (p6-curves.js, now under notes/revamp/v1-archive/) with every
 * number unchanged: five patterns, each with one severity parameter whose default is the constant of
 *   1 overfit    onset t0, 1.0 to 0.2, default 0.35: validation + 0.4 max(0, t - t0)^2
 *   2 variance   noise multiplier a, 0 to 3, default 1: training + 0.004 a eps_t, validation
 *                + 0.02 a eps'_t; drawn twice, with the noise of seeds 1 and 2
 *   3 improving  time constant tau, 0.15 to 1.0, default 0.6
 *   4 saturated  time constant tau, 0.15 to 0.02, default 0.04
 *   5 rising     slope multiplier b, 0 to 2, default 1: both curves + 0.3 b max(0, t - 0.5)
 * eps_t and eps'_t are standard normals from the forks 'train' and 'validation' of TP.prng.create(seed).
 *
 * The additions of version 2 (WO-I8, WO-F6.2), whose constants Batch 1 calibrates (group C3):
 *   PANELS, the eight panel keys of the gallery and its recap (implementation-plan §6.24): the five
 *     patterns 'overfitting', 'variance', 'improving', 'saturated' and 'training-rising', at version
 *     1's defaults, and the three shapes 'periodic', 'early-instability' and 'sudden-rise'.
 *   SHAPES, the specs of the three shapes; CASES, the specs of the six check curves (FP F6.2).
 *   curve(spec) draws a curve pair from a spec (below); feature(key, points, clean) gives the position
 *     of a pattern's diagnostic feature; panel(key) and panels(keys) give a gallery panel with its
 *     feature; check(i) gives a check curve with its options, its accepted answers and its feature.
 *
 * A spec: {tau, train, val} (the time constant and the floors Linf of the two curves), and optional
 * terms, each added to the curves named:
 *   overfit  {onset, coef}           validation + coef max(0, t - onset)^2
 *   rise     {from, slope}           both + slope max(0, t - from)
 *   periodic {amp, period}           validation + amp sin(2 pi t / period)
 *   spike    {at, width, height}     both + height s e^(1 - s), s = max(0, t - at) / width: a rise
 *                                    to height at t = at + width, and a recovery
 *   jump     {at, width, height}     both + height (1 - e^(-max(0, t - at) / width))
 *   noise    {train, val, seed}      training + train eps_t, validation + val eps'_t, drawn as above
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var STEPS = 10000, EVERY = 100, N = STEPS / EVERY + 1, SEEDS = [1, 2];
  var LEVEL = 0.005;   // panels 3 and 4: a curve is level once it falls by less than this to the final step (ours)
  var LAST = 1000;     // panels 3 and 4: the fall over the last 1,000 steps, while the curve is not yet level there

  function L(t, Linf, tau) { return TP.curves.parametricLoss(t, { L0: 0.7, Linf: Linf, tau: tau }); }
  function ramp(t, t0) { return Math.max(0, t - t0); }

  /* noise: training eps_t and validation eps'_t from forks of the seed's generator. The draws never
     change (the multiplier a scales them), so each seed's are made once. */
  var NOISE = {};
  function noise(seed) {
    if (!NOISE[seed]) {
      var draw = function (label) {
        var g = TP.prng.create(seed).fork(label), out = [];
        for (var k = 0; k < N; k++) out.push(g.normal());
        return out;
      };
      NOISE[seed] = { train: draw('train'), val: draw('validation') };
    }
    return NOISE[seed];
  }

  /* ---------- version 1's model, unchanged ---------- */

  /* The severity parameters: the left end of the slider ("none", no pattern), the far end, the
     default (the spec's constants) and the slider step. */
  var PARAMS = Object.freeze({
    onset: Object.freeze({ key: 'overfit', none: 1, far: 0.2, def: 0.35, step: 0.01 }),
    noise: Object.freeze({ key: 'variance', none: 0, far: 3, def: 1, step: 0.1 }),
    tauImproving: Object.freeze({ key: 'improving', none: 0.15, far: 1, def: 0.6, step: 0.01 }),
    tauSaturated: Object.freeze({ key: 'saturated', none: 0.15, far: 0.02, def: 0.04, step: 0.005 }),
    slope: Object.freeze({ key: 'rising', none: 0, far: 2, def: 1, step: 0.1 })
  });

  var PATHOLOGIES = [
    {
      key: 'overfit', title: 'Problematic overfitting', param: 'onset',
      train: function (t) { return L(t, 0.02, 0.12); },
      val: function (t, k, z, t0) { return L(t, 0.25, 0.12) + 0.4 * Math.pow(ramp(t, t0), 2); }
    },
    {
      key: 'variance', title: 'High step-to-step variance late in training', param: 'noise', seeds: SEEDS,
      train: function (t, k, z, a) { return L(t, 0.10, 0.15) + 0.004 * a * z.train[k]; },
      val: function (t, k, z, a) { return L(t, 0.20, 0.15) + 0.02 * a * z.val[k]; }
    },
    {
      key: 'improving', title: 'Still improving at the end', param: 'tauImproving',
      train: function (t, k, z, tau) { return L(t, 0.05, tau); },
      val: function (t, k, z, tau) { return L(t, 0.18, tau); }
    },
    {
      key: 'saturated', title: 'Saturated long before the end', param: 'tauSaturated',
      train: function (t, k, z, tau) { return L(t, 0.05, tau); },
      val: function (t, k, z, tau) { return L(t, 0.18, tau); }
    },
    {
      key: 'rising', title: 'Training loss increasing', param: 'slope',
      train: function (t, k, z, b) { return L(t, 0.05, 0.12) + 0.3 * b * ramp(t, 0.5); },
      val: function (t, k, z, b) { return L(t, 0.20, 0.12) + 0.3 * b * ramp(t, 0.5); }
    }
  ];

  /* the parameters with their defaults filled in; an unknown name is a TypeError, a value that is
     not a number inside its slider's range a RangeError */
  function settings(params) {
    var out = {};
    Object.keys(PARAMS).forEach(function (name) { out[name] = PARAMS[name].def; });
    if (params == null) return out;
    Object.keys(params).forEach(function (name) {
      var spec = PARAMS[name], v = params[name];
      if (!spec) throw new TypeError('TP.gallery.curvePathologies: unknown parameter ' + name);
      if (v === undefined) return;
      var lo = Math.min(spec.none, spec.far), hi = Math.max(spec.none, spec.far);
      if (typeof v !== 'number' || !isFinite(v) || v < lo - 1e-9 || v > hi + 1e-9) {
        throw new RangeError('TP.gallery.curvePathologies: ' + name + ' must be a number from ' + lo + ' to ' + hi);
      }
      out[name] = v;
    });
    return out;
  }

  function computeOne(pa, v) {
    var runs = (pa.seeds || [null]).map(function (seed) {
      var z = seed == null ? null : noise(seed);
      var points = new Array(N);
      for (var k = 0; k < N; k++) {
        var step = k * EVERY, t = step / STEPS;
        points[k] = { step: step, train: pa.train(t, k, z, v), val: pa.val(t, k, z, v) };
      }
      return { seed: seed, points: points, final: points[N - 1] };
    });
    return { key: pa.key, title: pa.title, param: pa.param, value: v, runs: runs };
  }

  /**
   * curvePathologies({onset = 0.35, noise = 1, tauImproving = 0.6, tauSaturated = 0.04, slope = 1})
   * returns [{key, title, param, value, runs: [{seed, points: [{step, train, val}], final}]}]:
   * one run per pathology, two (seeds 1 and 2) for the variance pathology. Each parameter moves
   * only its own pathology's curves; the defaults are the constants of the spec's table.
   */
  function curvePathologies(params) {
    var p = settings(params);
    return PATHOLOGIES.map(function (pa) { return computeOne(pa, p[pa.param]); });
  }

  /* the index of the lowest value, the earliest on a tie */
  function lowest(points, acc) {
    var b = 0;
    for (var k = 1; k < points.length; k++) if (acc(points[k]) < acc(points[b])) b = k;
    return b;
  }

  /**
   * curvePathologyStats(entry), for one entry of curvePathologies(): the numbers the sentence
   * under its panel reports.
   *   overfit    {bestStep, best, final, gap}: the lowest validation error, its step, the final
   *              validation error, and final minus lowest
   *   rising     the same for the training error
   *   variance   {finals: [trial 1, trial 2], diff}: the final validation errors and |difference|
   *   improving, saturated  {levelSteps, lastDrop}: the length of the final stretch over which the
   *              validation error falls by less than 0.005 (a multiple of 100 steps, 0 when there
   *              is none), and its fall over the last 1,000 steps
   */
  function curvePathologyStats(entry) {
    var pts = entry.runs[0].points, last = pts.length - 1;
    function minimum(acc) {
      var b = lowest(pts, acc);
      return { bestStep: pts[b].step, best: acc(pts[b]), final: acc(pts[last]), gap: acc(pts[last]) - acc(pts[b]) };
    }
    if (entry.key === 'overfit') return minimum(function (q) { return q.val; });
    if (entry.key === 'rising') return minimum(function (q) { return q.train; });
    if (entry.key === 'variance') {
      var f = entry.runs.map(function (r) { return r.final.val; });
      return { finals: f, diff: Math.abs(f[0] - f[1]) };
    }
    var end = pts[last].val, k = last;
    while (k > 0 && pts[k - 1].val - end < LEVEL) k--;
    return { levelSteps: pts[last].step - pts[k].step, lastDrop: pts[last - LAST / EVERY].val - end };
  }

  /* ---------- version 2: specs, shapes, features, panels and the check ---------- */

  /** The gallery's panel keys, in order: the five patterns, then the three shapes. */
  var PANELS = Object.freeze(['overfitting', 'variance', 'improving', 'saturated', 'training-rising',
    'periodic', 'early-instability', 'sudden-rise']);
  /* the version 1 pattern behind each of the five pattern panels */
  var PATTERN_OF = Object.freeze({ overfitting: 'overfit', variance: 'variance', improving: 'improving', saturated: 'saturated', 'training-rising': 'rising' });

  function deepFreeze(o) {
    Object.keys(o).forEach(function (k) { if (o[k] && typeof o[k] === 'object') deepFreeze(o[k]); });
    return Object.freeze(o);
  }

  /**
   * The three shapes the playbook names elsewhere (FP F6.2), drawn from a spec and marked as such. Batch
   * 1's calibration raised the periodic amplitude from 0.015 to 0.035, so that the last full period spans
   * at least 8% of the y domain the gallery's panels share (0 to 0.75), close to the variance panel's
   * late spread (notes/revamp/calibration/c3-curves.md).
   */
  var SHAPES = deepFreeze({
    periodic: { tau: 0.12, train: 0.05, val: 0.2, periodic: { amp: 0.035, period: 0.1 } },
    'early-instability': { tau: 0.12, train: 0.05, val: 0.2, spike: { at: 0.02, width: 0.02, height: 0.6 } },
    'sudden-rise': { tau: 0.12, train: 0.05, val: 0.2, jump: { at: 0.6, width: 0.01, height: 0.5 } }
  });

  /** The start of the late stretch whose spread marks late step-to-step variance (ours). */
  var LATE_FROM = 7000;

  /**
   * The six check curves (FP F6.2, "The check's cases"): each with its three options, the answers the
   * check accepts (case 6 accepts both defensible ones), the pattern whose feature decides it, and its
   * spec, noise seed included. Batch 1's calibration (notes/revamp/calibration/c3-curves.md) measured each
   * case against the criteria listed there, and moved case 2's noise seed from 12 to 19, the first seed
   * from 12 whose late validation error has no trend of half a noise standard deviation.
   */
  var CASES = deepFreeze([
    { options: ['overfitting', 'variance', 'improving'], answers: ['overfitting'], decides: 'overfitting',
      spec: { tau: 0.12, train: 0.02, val: 0.25, overfit: { onset: 0.4, coef: 0.4 }, noise: { train: 0.002, val: 0.008, seed: 11 } } },
    { options: ['variance', 'overfitting', 'saturated'], answers: ['variance'], decides: 'variance',
      spec: { tau: 0.15, train: 0.1, val: 0.2, noise: { train: 0.004, val: 0.02, seed: 19 } } },
    { options: ['improving', 'saturated', 'variance'], answers: ['improving'], decides: 'improving',
      spec: { tau: 0.5, train: 0.05, val: 0.18, noise: { train: 0.001, val: 0.003, seed: 13 } } },
    { options: ['saturated', 'improving', 'overfitting'], answers: ['saturated'], decides: 'saturated',
      spec: { tau: 0.05, train: 0.05, val: 0.18, noise: { train: 0.001, val: 0.003, seed: 14 } } },
    { options: ['training-rising', 'overfitting', 'variance'], answers: ['training-rising'], decides: 'training-rising',
      spec: { tau: 0.12, train: 0.05, val: 0.2, rise: { from: 0.45, slope: 0.25 }, noise: { train: 0.003, val: 0.006, seed: 15 } } },
    { options: ['overfitting', 'variance', 'improving'], answers: ['overfitting', 'variance'], decides: 'overfitting',
      spec: { tau: 0.12, train: 0.02, val: 0.22, overfit: { onset: 0.65, coef: 0.3 }, noise: { train: 0.004, val: 0.02, seed: 16 } } }
  ]);

  /* the noise-free curves of a spec at t */
  function cleanAt(spec, t) {
    var train = L(t, spec.train, spec.tau), val = L(t, spec.val, spec.tau), both = 0;
    if (spec.overfit) val += spec.overfit.coef * Math.pow(ramp(t, spec.overfit.onset), 2);
    if (spec.rise) both += spec.rise.slope * ramp(t, spec.rise.from);
    if (spec.periodic) val += spec.periodic.amp * Math.sin(2 * Math.PI * t / spec.periodic.period);
    if (spec.spike) {
      var s = ramp(t, spec.spike.at) / spec.spike.width;
      both += spec.spike.height * s * Math.exp(1 - s);
    }
    if (spec.jump) both += spec.jump.height * (1 - Math.exp(-ramp(t, spec.jump.at) / spec.jump.width));
    return { train: train + both, val: val + both };
  }

  /**
   * curve(spec): the curve pair of a spec at the 101 evaluation steps. Returns {points: [{step, train,
   * val}], clean: the same without the noise, final}.
   */
  function curve(spec) {
    var z = spec.noise ? noise(spec.noise.seed) : null, points = new Array(N), clean = new Array(N);
    for (var k = 0; k < N; k++) {
      var step = k * EVERY, c = cleanAt(spec, step / STEPS);
      clean[k] = { step: step, train: c.train, val: c.val };
      points[k] = z
        ? { step: step, train: c.train + spec.noise.train * z.train[k], val: c.val + spec.noise.val * z.val[k] }
        : clean[k];
    }
    return { points: points, clean: clean, final: points[N - 1] };
  }

  /* least-squares slope and fitted value at the last point of the validation error over the last LAST steps */
  function endTrend(pts) {
    var n = LAST / EVERY + 1, from = pts.length - n, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (var k = from; k < pts.length; k++) { var x = pts[k].step, y = pts[k].val; sx += x; sy += y; sxx += x * x; sxy += x * y; }
    var slope = (n * sxy - sx * sy) / (n * sxx - sx * sx), mean = sy / n, xm = sx / n;
    return { slope: slope, value: mean + slope * (pts[pts.length - 1].step - xm) };
  }

  /**
   * feature(key, points, clean): where the diagnostic feature of pattern `key` sits on a curve, the
   * position an annotation marks. clean is the curve without noise (points itself when omitted); every
   * feature but the spread is read from it.
   *   overfitting       {kind: 'minimum', step, value, finalStep, finalValue, rise}: the lowest
   *                     validation error, and how far it rises by the end
   *   variance          {kind: 'spread', from, to, low, high}: the range of the (noisy) validation
   *                     error from LATE_FROM to the end
   *   improving         {kind: 'slope', step, value, slope}: the least-squares slope per step of the
   *                     validation error over the last LAST steps, through its fitted value at the end
   *   saturated         {kind: 'plateau', from, to, value}: the final stretch over which the validation
   *                     error falls by less than LEVEL, as in version 1's levelSteps
   *   training-rising   {kind: 'minimum', step, value, finalStep, finalValue, rise}: as overfitting,
   *                     for the training loss
   *   periodic          {kind: 'period', from, to, value}: the last full period of the validation
   *                     error, between two of its maxima
   *   early-instability {kind: 'peak', step, value}: the highest training loss
   *   sudden-rise       {kind: 'rise', step, value, finalValue}: the lowest training loss before the
   *                     rise, and the final one
   */
  function feature(key, points, clean) {
    clean = clean || points;
    var last = clean.length - 1, b, k;
    var val = function (q) { return q.val; }, train = function (q) { return q.train; };
    if (key === 'overfitting' || key === 'training-rising') {
      var acc = key === 'overfitting' ? val : train;
      b = lowest(clean, acc);
      return { kind: 'minimum', step: clean[b].step, value: acc(clean[b]), finalStep: clean[last].step, finalValue: acc(clean[last]), rise: acc(clean[last]) - acc(clean[b]) };
    }
    if (key === 'variance') {
      var lo = Infinity, hi = -Infinity;
      points.forEach(function (q) { if (q.step >= LATE_FROM) { lo = Math.min(lo, q.val); hi = Math.max(hi, q.val); } });
      return { kind: 'spread', from: LATE_FROM, to: points[points.length - 1].step, low: lo, high: hi };
    }
    if (key === 'improving') {
      var tr = endTrend(clean);
      return { kind: 'slope', step: clean[last].step, value: tr.value, slope: tr.slope };
    }
    if (key === 'saturated') {
      var end = clean[last].val;
      k = last;
      while (k > 0 && clean[k - 1].val - end < LEVEL) k--;
      return { kind: 'plateau', from: clean[k].step, to: clean[last].step, value: end };
    }
    if (key === 'periodic') {
      var peaks = [];
      for (k = 1; k < last; k++) if (clean[k].val > clean[k - 1].val && clean[k].val >= clean[k + 1].val) peaks.push(k);
      if (peaks.length < 2) return { kind: 'period', from: null, to: null, value: null };
      var p1 = peaks[peaks.length - 1], p0 = peaks[peaks.length - 2];
      return { kind: 'period', from: clean[p0].step, to: clean[p1].step, value: clean[p1].val };
    }
    if (key === 'early-instability') {
      b = 0;
      for (k = 1; k <= last; k++) if (clean[k].train > clean[b].train) b = k;
      return { kind: 'peak', step: clean[b].step, value: clean[b].train };
    }
    if (key === 'sudden-rise') {
      b = lowest(clean, train);
      return { kind: 'rise', step: clean[b].step, value: clean[b].train, finalValue: clean[last].train };
    }
    throw new TypeError('TP.gallery.feature: unknown key ' + key);
  }

  /**
   * panel(key): a gallery panel. Returns {key, kind ('pattern' or 'shape'), runs: [{seed, points,
   * final}], clean (the first run without noise), feature}. A pattern panel is version 1's pattern at
   * its default (the variance panel keeps version 1's two runs, seeds 1 and 2, and its feature is read
   * from the first); a shape panel is curve(SHAPES[key]).
   */
  function panel(key) {
    if (PATTERN_OF[key]) {
      var i = PATHOLOGIES.map(function (pa) { return pa.key; }).indexOf(PATTERN_OF[key]);
      var entry = computeOne(PATHOLOGIES[i], PARAMS[PATHOLOGIES[i].param].def);
      var clean = key === 'variance' ? computeOne(PATHOLOGIES[i], 0).runs[0].points : entry.runs[0].points;
      return { key: key, kind: 'pattern', runs: entry.runs, clean: clean, feature: feature(key, entry.runs[0].points, clean) };
    }
    if (SHAPES[key]) {
      var c = curve(SHAPES[key]);
      return { key: key, kind: 'shape', runs: [{ seed: null, points: c.points, final: c.final }], clean: c.clean, feature: feature(key, c.points, c.clean) };
    }
    throw new TypeError('TP.gallery.panel: unknown key ' + key);
  }

  /** panels(keys): the panels of the keys given, PANELS by default, in that order. */
  function panels(keys) {
    return (keys || PANELS).map(panel);
  }

  /**
   * check(i): check curve i (0 to 5). Returns {index, options, answers, decides, points, clean, final,
   * feature}, where feature is the deciding pattern's feature on this curve.
   */
  function check(i) {
    var c = CASES[i];
    if (!c) throw new RangeError('TP.gallery.check: no case ' + i);
    var cv = curve(c.spec);
    return {
      index: i, options: c.options.slice(), answers: c.answers.slice(), decides: c.decides,
      points: cv.points, clean: cv.clean, final: cv.final, feature: feature(c.decides, cv.points, cv.clean)
    };
  }

  TP.gallery = {
    STEPS: STEPS,
    EVERY: EVERY,
    LEVEL: LEVEL,
    LAST: LAST,
    LATE_FROM: LATE_FROM,
    curvePathologyParams: PARAMS,
    curvePathologies: curvePathologies,
    curvePathologyStats: curvePathologyStats,
    PANELS: PANELS,
    SHAPES: SHAPES,
    CASES: CASES,
    curve: curve,
    feature: feature,
    panel: panel,
    panels: panels,
    check: check
  };
})(typeof window !== 'undefined' ? window : globalThis);
