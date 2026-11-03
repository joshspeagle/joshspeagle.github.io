/*
 * baseline.js: the shapes of the fair and the unfair baseline (TP.baseline), for the static F6.4.
 *
 * New in version 2 (R2, WO-F6.4). The figure draws two curves of validation error against
 * u = log10 learning rate, one for the best weight decay ('wd') and one for no weight decay
 * ('none'), each a parabola in u:
 *
 *   E_wd(u) = E_WD + CURVATURE (u - U_WD)^2,      E_none(u) = E_NONE + CURVATURE (u - U_NONE)^2,
 *
 * each with a noise band of half-width BAND. Panel (a) tunes the baseline over its full range, and
 * the two optima differ by tie() = E_NONE - E_WD, which lies within the band. Panel (b) runs the
 * baseline at PREFERRED, the rates the weight-decay study preferred, and the baseline's best there
 * exceeds the weight-decay optimum by falseWin(), which lies beyond the band.
 *
 * The curves are shapes, the site's, and fitted to no data. They share Toy S's form and scale (an
 * optimum of 0.23 at 10^-2.5 and a curvature of 0.06 per decade squared). Batch 1 calibrated the
 * constants (implementation plan §5.7, C7, tests/calibration/fig-baseline.calibrate.js), and each is
 * one exported line. PREFERRED is the interval of rates, rounded to 0.1 decade, over which the
 * weight-decay curve stays within BAND of its optimum. The playbook's claim is L1024-L1027.
 *
 * Batch 7 (the lead's ruling on the adoption yardstick): BAND is 0.001, the playbook's retrain
 * variation of about ±0.1% (L1792-L1796) as page 5 reads it, where it was 0.003, three times that.
 * E_NONE moved from 0.2315 to 0.2305, so that the fair comparison ties within the new band (a gap of
 * half the band), and PREFERRED narrowed from [-2.7, -2.3] to [-2.6, -2.4], the interval over which
 * the weight-decay curve stays within the new band. The curvature and both optima's rates are kept.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var U_WD = -2.5;                               // optimum of the best weight decay's curve (log10 rate)
  var E_WD = 0.230;                              // its error
  var U_NONE = -1.9;                             // optimum of the curve without weight decay
  var E_NONE = 0.2305;                           // its error
  var CURVATURE = 0.06;                          // both curves' curvature per decade squared
  var BAND = 0.001;                              // half-width of each curve's noise band: the playbook's ±0.1% as page 5 reads it (Batch 7)
  var PREFERRED = Object.freeze([-2.6, -2.4]);   // the rates the weight-decay study preferred: where E_wd stays within BAND of E_WD (C7)
  var AXIS = Object.freeze([-4, -1]);            // the learning-rate axis both panels share

  function vertex(kind) {
    if (kind === 'wd') return { u: U_WD, e: E_WD };
    if (kind === 'none') return { u: U_NONE, e: E_NONE };
    throw new RangeError('TP.baseline: kind must be "wd" or "none"');
  }

  /** The curve's error at u. */
  function curve(kind, u) {
    var o = vertex(kind), d = u - o.u;
    return o.e + CURVATURE * d * d;
  }

  /** The curve's optimum over all rates, {u, e}. */
  function optimum(kind) { return vertex(kind); }

  /** The curve's lowest point with u in [lo, hi], {u, e}: the vertex clamped to the interval. */
  function bestWithin(kind, lo, hi) {
    var u = Math.min(hi, Math.max(lo, vertex(kind).u));
    return { u: u, e: curve(kind, u) };
  }

  /** The margin of the tie in panel (a): the baseline's optimum minus the weight-decay optimum. */
  function tie() { return E_NONE - E_WD; }

  /** The margin of the false win in panel (b): the baseline's best within PREFERRED minus E_WD. */
  function falseWin() { return bestWithin('none', PREFERRED[0], PREFERRED[1]).e - E_WD; }

  /** n points {u, e} of a curve, evenly spaced over AXIS. */
  function sample(kind, n) {
    n = n || 121;
    var out = new Array(n);
    for (var i = 0; i < n; i++) {
      var u = AXIS[0] + (AXIS[1] - AXIS[0]) * i / (n - 1);
      out[i] = { u: u, e: curve(kind, u) };
    }
    return out;
  }

  /**
   * shapes() -> everything F6.4 draws and its checks read: {band, tie, falseWin, preferred, axis,
   * optima: {wd, none}, unfairBest (the baseline's best within PREFERRED), tieWithinBand,
   * falseWinBeyondBand}.
   */
  function shapes() {
    return {
      band: BAND,
      tie: tie(),
      falseWin: falseWin(),
      preferred: PREFERRED.slice(),
      axis: AXIS.slice(),
      optima: { wd: optimum('wd'), none: optimum('none') },
      unfairBest: bestWithin('none', PREFERRED[0], PREFERRED[1]),
      tieWithinBand: Math.abs(tie()) < BAND,
      falseWinBeyondBand: falseWin() > BAND
    };
  }

  TP.baseline = {
    U_WD: U_WD,
    E_WD: E_WD,
    U_NONE: U_NONE,
    E_NONE: E_NONE,
    CURVATURE: CURVATURE,
    BAND: BAND,
    PREFERRED: PREFERRED,
    AXIS: AXIS,
    curve: curve,
    optimum: optimum,
    bestWithin: bestWithin,
    tie: tie,
    falseWin: falseWin,
    sample: sample,
    shapes: shapes
  };
})(typeof window !== 'undefined' ? window : globalThis);
