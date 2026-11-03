/*
 * optimizers.js: the six update rules of the playbook's FAQ (README L2034-2086) on a
 * two-dimensional quadratic (TP.optimizers), for figure F2.1 of version 2 (notes/revamp/figure-plan.md)
 * and, before it, version 1's `p10-optimizer-explorer` (notes/specs/promotion.md, section A;
 * notes/specs/pages-1-3.md, `p1-optimizer-update-rules`).
 *
 * The loss, with the loss scale c, the condition number kappa and the rotation phi (degrees):
 *
 *   l(theta) = c/2 (kappa u^2 + v^2),   (u, v) = R(phi) theta,   R(phi) = [[cos, sin], [-sin, cos]]
 *
 * so the sharp axis (curvature c kappa) points along (cos phi, sin phi) and the flat axis
 * (curvature c) along (-sin phi, cos phi). The gradient is c R^T diag(kappa, 1) R theta. A start
 * point given in the loss's own coordinates (u0, v0) sits at R^T (u0, v0), so it turns with the
 * loss when phi changes.
 *
 * The rules, as README L2034-2086 write them, with a constant learning rate (eta_t = eta,
 * alpha_t = alpha), t counted from 0, g the gradient at the current theta, and squares and square
 * roots taken per coordinate:
 *
 *   sgd       theta <- theta - eta g
 *   momentum  v <- gamma v + g;  theta <- theta - eta v                               v_0 = 0
 *   nesterov  v <- gamma v + g;  theta <- theta - eta (gamma v + g)                   v_0 = 0
 *   rmsprop   v <- rho v + (1 - rho) g^2;  m <- gamma m + eta g / sqrt(v + eps);
 *             theta <- theta - m                                                     v_0 = 1, m_0 = 0
 *   adam      m <- beta1 m + (1 - beta1) g;  v <- beta2 v + (1 - beta2) g^2;
 *             b = sqrt(1 - beta2^(t+1)) / (1 - beta1^(t+1));
 *             theta <- theta - alpha b m / (sqrt(v) + eps)                           m_0 = v_0 = 0
 *   nadam     as adam, with the numerator beta1 m + (1 - beta1) g (m already updated)
 *
 * In every rule the "v" and "m" on the right of theta's update are the new values v_{t+1}, m_{t+1}.
 * The hyperparameters use one key for the learning rate, lr (eta or alpha), and gamma, rho,
 * beta1, beta2, eps.
 *
 * Divergence bounds (per eigen-direction of curvature h, the largest being h = c max(kappa, 1)):
 * plain SGD diverges iff eta h > 2; heavy-ball momentum (the playbook's momentum) iff
 * eta h > 2 (1 + gamma). For Nesterov the bound is found numerically: the largest eta at which the
 * spectral radius of the 2 x 2 iteration matrix of (theta, v) for curvature h is at most 1, by
 * bisection. RMSProp, Adam and NAdam get no bound (null): their step is not a fixed multiple of
 * the gradient, so no single linear bound governs it.
 *
 * API (no DOM; the file loads in Node for tests):
 *   RULES, info[rule], defaults[rule]
 *   problem({c, kappa, phi}) -> {c, kappa, phi, cos, sin}
 *   grad(prob, theta), loss(prob, theta), fromEigen(prob, [u0, v0])
 *   init(rule, theta) -> {t, theta, v, m}
 *   step(rule, state, grad, hp) -> the next state (a new object; state is not changed)
 *   run({rule, hp, c, kappa, phi, start, startEigen, steps, limit, box}) -> {path, divergedAt, leftAt, steps}
 *   divergenceBound(rule, c, kappa, gamma) -> eta or null
 *   nesterovRadius(x, gamma), spectralRadius2(a, b, c, d)
 *
 * The summary curves of figure F2.1 (notes/revamp/implementation-plan.md WO-I8 and WO-F2.1):
 *   TARGET (0.01), NO_PROGRESS (200), CONVERGED (1e-6), DIVERGE (1e3), AXIS_END (10,000), RATES,
 *   SCALES ([1, 10, 100]), targetFor(c) (TARGET c)
 *   stepsToTarget(rule, hp, o) -> {crossing, divergedAt, noProgressSince, end}
 *   summary(rule, hp, lrs, o) -> [{lr, crossing, diverged, slow}]
 *   trace(rules, hps, o) -> {until, runs: [{rule, lr, x, y, loss, steps, end, crossing, divergedAt, noProgressSince}]}
 *   endStep(rules, hps, o) -> the step at which every rule's run has ended
 * with o = {c, kappa, phi, start, startEigen, target, limit}. Here o.limit is the last step computed
 * (the step axis's end), not run()'s coordinate bound, which is DIVERGE. The target defaults to
 * targetFor(c), TARGET times the loss scale, so that it stays the same fraction of the starting loss
 * at every scale (Batch 7).
 *
 * The loss scale (Batch 7, the lead's ruling on the practitioner's finding 5, F2.1's control
 * c = 1, 10, 100). SGD, momentum and Nesterov multiply the gradient by the learning rate, so a run at
 * scale c and rate eta takes the same steps as a run at scale 1 and rate c eta, and their fastest rates
 * and bounds fall by the factor c. RMSProp, Adam and NAdam divide by the root of the gradients' second
 * moment, so their steps are nearly the same at every scale (exactly, apart from eps and RMSProp's
 * v_0 = 1), and so are their fastest rates. With the target scaled by c the SGD family's step counts
 * are the same at every scale.
 *
 * A rule's run ends at o.limit, or earlier at its natural end, the first of these:
 *   diverged   a coordinate beyond DIVERGE in absolute value, or not finite (as in run());
 *   converged  the loss has stayed below CONVERGED times its start for NO_PROGRESS steps;
 *   stalled    the loss has made no new minimum (strictly lower) for NO_PROGRESS steps.
 * A run that reaches o.limit without any of these, with no crossing, is slow: it was still making
 * new minima, and its steps to the target lie beyond the axis. summary() marks it with slow: true.
 * crossing is the last step at which the loss fell below the target, provided the loss stayed below it
 * to the end of the run; at a natural end it must also have stayed below it for the last NO_PROGRESS
 * steps. It is null otherwise. noProgressSince is the step of the last new minimum of a stalled run,
 * and null otherwise.
 *
 * The plan (WO-I8) judges the crossing at o.limit and ends a run at the first step below 1e-6 of its
 * start. Both are changed here, because of what the rules do on the figure's quadratic at default
 * hyperparameters. Adam and NAdam converge and then leave the minimum again once their second moment
 * has decayed (Adam at 0.2 is below 1e-300 by step 7,000 and back above 0.01 at step 8,629; at 1.0,
 * at step 4,522), so a crossing judged at a distant o.limit would report those late excursions.
 * RMSProp at 0.09 to 0.3 and Nesterov at 0.03 dip below 1e-6 of their start for a single step while
 * still cycling through the minimum, so a one-step test would end them early. Running every rate to
 * o.limit also costs 40 to 150 ms per rule over RATES at a limit of 5,000 steps, because the loss of a
 * converged run falls into subnormal numbers.
 *
 * The runs step exactly as step() does, with the same floating-point operations in the same order,
 * without allocating per step; at phi = 0 the rotation, which is then the identity, is skipped, which
 * changes no value (a zero may change sign). Adam's and NAdam's bias corrections come from a table
 * computed as step() computes them. summary() ends a plain SGD run at its first crossing when eta c max(kappa, 1) <= 2, because
 * the loss can then never rise, so its crossing is the one stepsToTarget() finds at the natural end.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};
  var O = TP.optimizers = TP.optimizers || {};

  /** The rules in the playbook's order. */
  O.RULES = ['sgd', 'momentum', 'nesterov', 'rmsprop', 'adam', 'nadam'];

  /** Display name, learning-rate symbol, hyperparameter keys, and the README lines of each rule. */
  O.info = {
    sgd: { name: 'SGD', lrSymbol: 'eta', hp: ['lr'], lines: '2034-2036' },
    momentum: { name: 'Momentum', lrSymbol: 'eta', hp: ['lr', 'gamma'], lines: '2038-2044' },
    nesterov: { name: 'Nesterov', lrSymbol: 'eta', hp: ['lr', 'gamma'], lines: '2046-2052' },
    rmsprop: { name: 'RMSProp', lrSymbol: 'eta', hp: ['lr', 'gamma', 'rho', 'eps'], lines: '2054-2062' },
    adam: { name: 'Adam', lrSymbol: 'alpha', hp: ['lr', 'beta1', 'beta2', 'eps'], lines: '2064-2074' },
    nadam: { name: 'NAdam', lrSymbol: 'alpha', hp: ['lr', 'beta1', 'beta2', 'eps'], lines: '2076-2086' }
  };

  /** Default hyperparameters (notes/specs/pages-1-3.md): 0.02 for the SGD family and RMSProp, 0.1 for Adam and NAdam. */
  O.defaults = {
    sgd: { lr: 0.02 },
    momentum: { lr: 0.02, gamma: 0.9 },
    nesterov: { lr: 0.02, gamma: 0.9 },
    rmsprop: { lr: 0.02, gamma: 0.9, rho: 0.9, eps: 1e-8 },
    adam: { lr: 0.1, beta1: 0.9, beta2: 0.999, eps: 1e-8 },
    nadam: { lr: 0.1, beta1: 0.9, beta2: 0.999, eps: 1e-8 }
  };

  function known(rule) {
    if (!O.info[rule]) throw new Error('TP.optimizers: unknown rule ' + rule);
  }

  /* ---------- the quadratic ---------- */

  /** The loss's constants, with cos and sin of phi (given in degrees). */
  O.problem = function (o) {
    var c = o.c != null ? o.c : 1, kappa = o.kappa != null ? o.kappa : 20, phi = o.phi || 0;
    var r = phi * Math.PI / 180;
    return { c: c, kappa: kappa, phi: phi, cos: Math.cos(r), sin: Math.sin(r) };
  };

  /** The loss's own coordinates (u, v) = R(phi) theta. */
  function toEigen(P, th) {
    return [P.cos * th[0] + P.sin * th[1], -P.sin * th[0] + P.cos * th[1]];
  }

  /** theta = R(phi)^T (u, v): the parameter-space point with loss coordinates (u, v). */
  O.fromEigen = function (P, uv) {
    return [P.cos * uv[0] - P.sin * uv[1], P.sin * uv[0] + P.cos * uv[1]];
  };

  /** Gradient c R^T diag(kappa, 1) R theta. */
  O.grad = function (P, th) {
    var uv = toEigen(P, th), a = P.c * P.kappa * uv[0], b = P.c * uv[1];
    return [P.cos * a - P.sin * b, P.sin * a + P.cos * b];
  };

  /** Loss c/2 (kappa u^2 + v^2). */
  O.loss = function (P, th) {
    var uv = toEigen(P, th);
    return 0.5 * P.c * (P.kappa * uv[0] * uv[0] + uv[1] * uv[1]);
  };

  /* ---------- the update rules ---------- */

  /** The state before the first step: v_0 and m_0 as README L2034-2086 set them. */
  O.init = function (rule, theta) {
    known(rule);
    var n = theta.length, z = function (x) { var a = new Array(n); for (var i = 0; i < n; i++) a[i] = x; return a; };
    var s = { t: 0, theta: theta.slice(), v: null, m: null };
    if (rule === 'momentum' || rule === 'nesterov') s.v = z(0);
    else if (rule === 'rmsprop') { s.v = z(1); s.m = z(0); }
    else if (rule === 'adam' || rule === 'nadam') { s.v = z(0); s.m = z(0); }
    return s;
  };

  /**
   * One step of rule from state (t, theta_t and the rule's v_t, m_t) with grad = the gradient at
   * theta_t, and hyperparameters hp. Returns the state at t + 1 as a new object.
   */
  O.step = function (rule, s, g, hp) {
    known(rule);
    var n = s.theta.length, th = new Array(n), i;
    var v = s.v ? new Array(n) : null, m = s.m ? new Array(n) : null;
    var lr = hp.lr;
    switch (rule) {
      case 'sgd':
        for (i = 0; i < n; i++) th[i] = s.theta[i] - lr * g[i];
        break;
      case 'momentum':
        for (i = 0; i < n; i++) {
          v[i] = hp.gamma * s.v[i] + g[i];
          th[i] = s.theta[i] - lr * v[i];
        }
        break;
      case 'nesterov':
        for (i = 0; i < n; i++) {
          v[i] = hp.gamma * s.v[i] + g[i];
          th[i] = s.theta[i] - lr * (hp.gamma * v[i] + g[i]);
        }
        break;
      case 'rmsprop':
        for (i = 0; i < n; i++) {
          v[i] = hp.rho * s.v[i] + (1 - hp.rho) * g[i] * g[i];
          m[i] = hp.gamma * s.m[i] + lr / Math.sqrt(v[i] + hp.eps) * g[i];
          th[i] = s.theta[i] - m[i];
        }
        break;
      default: {   // adam, nadam
        var b = Math.sqrt(1 - Math.pow(hp.beta2, s.t + 1)) / (1 - Math.pow(hp.beta1, s.t + 1));
        for (i = 0; i < n; i++) {
          m[i] = hp.beta1 * s.m[i] + (1 - hp.beta1) * g[i];
          v[i] = hp.beta2 * s.v[i] + (1 - hp.beta2) * g[i] * g[i];
          var num = rule === 'adam' ? m[i] : hp.beta1 * m[i] + (1 - hp.beta1) * g[i];
          var den = Math.sqrt(v[i]) + hp.eps;
          /* den is 0 only with eps = 0 and no gradient so far in that coordinate, when num is 0 too */
          th[i] = s.theta[i] - (den > 0 ? lr * num / den * b : 0);
        }
      }
    }
    return { t: s.t + 1, theta: th, v: v, m: m };
  };

  /**
   * run(o): o.steps steps of o.rule with hyperparameters o.hp on the quadratic {c, kappa, phi},
   * from o.start (parameter space) or o.startEigen (the loss's coordinates, turned with phi).
   * The run stops at the first iterate with a coordinate beyond o.limit (default 1e3) in absolute
   * value, or not finite: divergedAt is that step. leftAt is the first step whose iterate lies
   * outside the square [-o.box, o.box]^2 (null without o.box, or if it never does).
   * Returns {path: [[theta1, theta2], ...] from step 0, divergedAt, leftAt, steps}.
   */
  O.run = function (o) {
    var P = O.problem(o);
    var start = o.start || O.fromEigen(P, o.startEigen || [-4, 3.5]);
    var s = O.init(o.rule, start), steps = o.steps != null ? o.steps : 100;
    var limit = o.limit != null ? o.limit : 1e3, box = o.box != null ? o.box : null;
    var path = [s.theta.slice()], divergedAt = null, leftAt = null;
    for (var t = 0; t < steps; t++) {
      s = O.step(o.rule, s, O.grad(P, s.theta), o.hp);
      var x = s.theta[0], y = s.theta[1];
      path.push([x, y]);
      if (box != null && leftAt == null && !(Math.abs(x) <= box && Math.abs(y) <= box)) leftAt = t + 1;
      if (!(Math.abs(x) <= limit && Math.abs(y) <= limit)) { divergedAt = t + 1; break; }
    }
    return { path: path, divergedAt: divergedAt, leftAt: leftAt, steps: steps };
  };

  /* ---------- divergence bounds ---------- */

  /** Spectral radius of the real 2 x 2 matrix [[a, b], [c, d]]. */
  O.spectralRadius2 = function (a, b, c, d) {
    var tr = a + d, det = a * d - b * c, disc = tr * tr - 4 * det;
    if (disc >= 0) {
      var r = Math.sqrt(disc);
      return Math.max(Math.abs((tr + r) / 2), Math.abs((tr - r) / 2));
    }
    return Math.sqrt(det);   // a complex pair, |lambda|^2 = det
  };

  /**
   * Spectral radius of the playbook's Nesterov iteration on one direction of curvature h, as a
   * function of x = eta h. With the state (theta, v): v' = gamma v + h theta and
   * theta' = theta - eta (gamma v' + h theta), so the matrix is
   * [[1 - x (1 + gamma), -eta gamma^2], [h, gamma]], whose eigenvalues depend on x and gamma only;
   * here h = 1 and eta = x.
   */
  O.nesterovRadius = function (x, gamma) {
    return O.spectralRadius2(1 - x * (1 + gamma), -x * gamma * gamma, 1, gamma);
  };

  /**
   * The learning rate above which rule diverges on the quadratic with loss scale c and condition
   * number kappa (gamma for momentum and Nesterov); null for RMSProp, Adam and NAdam.
   */
  O.divergenceBound = function (rule, c, kappa, gamma) {
    known(rule);
    var h = c * Math.max(kappa, 1);
    if (rule === 'sgd') return 2 / h;
    if (rule === 'momentum') return 2 * (1 + gamma) / h;
    if (rule === 'nesterov') {
      /* the stable set in x = eta h is an interval (0, x*), and x* <= 2 (1 + gamma) */
      var lo = 0, hi = 2 * (1 + gamma) + 1;
      for (var k = 0; k < 80; k++) {
        var mid = (lo + hi) / 2;
        if (O.nesterovRadius(mid, gamma) <= 1) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2 / h;
    }
    return null;
  };

  /* ---------- the summary curves of F2.1 ---------- */

  /** The target loss of F2.1 (WO-F2.1). */
  O.TARGET = 0.01;
  /** A run that makes no new minimum for this many steps has stalled; a converged run has stayed converged this long. */
  O.NO_PROGRESS = 200;
  /** A run has converged once its loss stays below this fraction of its starting loss (for NO_PROGRESS steps). */
  O.CONVERGED = 1e-6;
  /** A run diverges when a coordinate passes this in absolute value, run()'s default limit. */
  O.DIVERGE = 1e3;
  /** The step axis's end of F2.1, and the last step computed when o.limit is not given. Calibrated in Batch 1
      (tests/calibration/fig-update-rules.calibrate.js): at default hyperparameters every rule's crossing over the
      rates from 0.001 was at most 6,745 steps (Adam and NAdam at 0.001), so the axis ends at the next decade.
      Batch 7's rates reach 0.0001, and the runs that need more steps than the axis holds are slow. */
  O.AXIS_END = 10000;

  /** The learning rates of F2.1's slider (Batch 7): the E24 series, 24 values per decade (1.0, 1.1, 1.2,
      1.3, 1.5, ..., 8.2, 9.1), from 0.0001 to 1, 97 in all. The list reaches 0.0001 so that SGD's rates at
      loss scale 100 lie on it (its bound there is 0.001). The two-significant-figure list over the same four
      decades, 361 rates, took 25 ms for Adam's summary, over the 12-ms budget; the E24 list takes about 8. */
  O.E24 = Object.freeze([10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91]);
  O.RATES = (function () {
    var out = [];
    for (var e = -5; e <= -2; e++) for (var i = 0; i < O.E24.length; i++) out.push(Number(O.E24[i] + 'e' + e));
    out.push(1);
    return Object.freeze(out);
  })();

  /** The loss scales of F2.1's control (Batch 7). */
  O.SCALES = Object.freeze([1, 10, 100]);
  /** The target loss at loss scale c: TARGET c, the same fraction of the starting loss at every scale. */
  O.targetFor = function (c) { return O.TARGET * (c != null ? c : 1); };

  var CODE = { sgd: 0, momentum: 1, nesterov: 2, rmsprop: 3, adam: 4, nadam: 5 };
  var END_LIMIT = 0, END_DIVERGED = 1, END_CONVERGED = 2, END_STALLED = 3, END_CROSSED = 4;

  /* Adam's and NAdam's b_{t+1} for t = 0, 1, ..., n - 1, by the expression step() uses; the last table is kept */
  var biasKept = { b1: NaN, b2: NaN, table: new Float64Array(0) };
  function biasTable(b1, b2, n) {
    var k = biasKept;
    if (k.b1 === b1 && k.b2 === b2 && k.table.length >= n) return k.table;
    var tb = new Float64Array(n);
    for (var i = 0; i < n; i++) tb[i] = Math.sqrt(1 - Math.pow(b2, i + 1)) / (1 - Math.pow(b1, i + 1));
    biasKept = { b1: b1, b2: b2, table: tb };
    return tb;
  }

  /* The fixed part of a run: the rule, the quadratic, the start, the hyperparameters (the rule's defaults
     overridden by hp) and the options. */
  function setup(rule, hp, o) {
    known(rule);
    o = o || {};
    var P = O.problem(o), start = o.start || O.fromEigen(P, o.startEigen || [-4, 3.5]);
    var h = {}, k, d = O.defaults[rule];
    for (k in d) h[k] = d[k];
    if (hp) for (k in hp) if (hp[k] != null) h[k] = hp[k];
    var limit = o.limit != null ? Math.max(0, Math.floor(o.limit)) : O.AXIS_END;
    var code = CODE[rule];
    return {
      code: code, P: P, x0: start[0], y0: start[1], h: h, limit: limit,
      target: o.target != null ? o.target : O.targetFor(P.c),
      rotated: !(P.cos === 1 && P.sin === 0),
      bt: code >= 4 ? biasTable(h.beta1, h.beta2, limit) : null
    };
  }

  /*
   * Runs one rule at every learning rate of lrs side by side, one step at a time, so that the runs of
   * different rates overlap in the processor. Each run stops at its natural end (see the header) or at
   * the limit; with full, it goes on to the limit or its divergence, and its natural end is recorded as
   * it passes. With sgdExit, a plain SGD run whose loss cannot rise stops at its first crossing. With rec
   * ({x, y, loss}, Float64Arrays of length limit + 1), the path of the first rate is recorded.
   * Returns the per-rate results as typed arrays, -1 standing for null.
   */
  function lanes(S, lrs, full, sgdExit, rec) {
    var n = lrs.length, code = S.code, P = S.P, h = S.h;
    var cs = P.cos, sn = P.sin, c = P.c, kappa = P.kappa, ck = c * kappa, hc = 0.5 * c, rotated = S.rotated;
    var target = S.target, limit = S.limit, bt = S.bt, NP = O.NO_PROGRESS, DV = O.DIVERGE;
    var g = h.gamma, rho = h.rho, b1 = h.beta1, b2 = h.beta2, eps = h.eps;
    var orho = 1 - rho, ob1 = 1 - b1, ob2 = 1 - b2;   // step() computes each of these the same way
    var hmax = c * Math.max(kappa, 1);

    /* per rate, side by side: F holds x, y, the rule's two buffers (v, then m) in each coordinate, the
       learning rate and the lowest loss so far; I holds the step of that lowest loss, the step of the
       last fall below the target (-1 for none), the first step of the current stretch below the
       convergence level (-1 for none), and flags (1: below the target now, 2: SGD may stop at its
       first crossing) */
    var F = new Float64Array(8 * n), I = new Int32Array(4 * n), ACT = new Int32Array(n);
    var END = new Int32Array(n), WHY = new Uint8Array(n), CROSS = new Int32Array(n), DIVAT = new Int32Array(n), NOPROG = new Int32Array(n);

    var u = cs * S.x0 + sn * S.y0, w = -sn * S.x0 + cs * S.y0;
    var L0 = hc * (kappa * u * u + w * w), conv = O.CONVERGED * L0, below0 = L0 < target;
    var a0 = code === 3 ? 1 : 0;   // RMSProp starts from v_0 = 1
    var k, f, q;
    for (k = 0; k < n; k++) {
      f = 8 * k; q = 4 * k;
      F[f] = S.x0; F[f + 1] = S.y0; F[f + 2] = a0; F[f + 3] = a0; F[f + 6] = lrs[k]; F[f + 7] = L0;
      I[q + 1] = below0 ? 0 : -1; I[q + 2] = L0 < conv ? 0 : -1;
      I[q + 3] = (below0 ? 1 : 0) | (sgdExit && code === 0 && lrs[k] * hmax <= 2 ? 2 : 0);
      END[k] = -1; CROSS[k] = -1; DIVAT[k] = -1; NOPROG[k] = -1; ACT[k] = k;
    }
    if (rec) { rec.x[0] = S.x0; rec.y[0] = S.y0; rec.loss[0] = L0; }

    /* the result of a run that ends at step t for reason why */
    function finish(k, t, why) {
      var q = 4 * k, last = I[q + 1];
      END[k] = t; WHY[k] = why;
      if (why === END_DIVERGED || !(I[q + 3] & 1)) CROSS[k] = -1;
      else if (why === END_CONVERGED || why === END_STALLED) CROSS[k] = last <= t - NP + 1 ? last : -1;
      else CROSS[k] = last;
      NOPROG[k] = why === END_STALLED ? I[q] : -1;
    }

    var na = n, t;
    for (t = 1; t <= limit && na > 0; t++) {
      var bb = bt ? bt[t - 1] : 0, j = 0;
      for (var i = 0; i < na; i++) {
        k = ACT[i]; f = 8 * k; q = 4 * k;
        var x = F[f], y = F[f + 1], lr = F[f + 6], gx, gy, a, b;
        if (rotated) {
          u = cs * x + sn * y; w = -sn * x + cs * y;
          a = ck * u; b = c * w;
          gx = cs * a - sn * b; gy = sn * a + cs * b;
        } else {
          gx = ck * x; gy = c * y;
        }
        switch (code) {
          case 0:
            x = x - lr * gx; y = y - lr * gy;
            break;
          case 1: {
            var p0 = g * F[f + 2] + gx, p1 = g * F[f + 3] + gy;
            F[f + 2] = p0; F[f + 3] = p1;
            x = x - lr * p0; y = y - lr * p1;
            break;
          }
          case 2: {
            var q0 = g * F[f + 2] + gx, q1 = g * F[f + 3] + gy;
            F[f + 2] = q0; F[f + 3] = q1;
            x = x - lr * (g * q0 + gx); y = y - lr * (g * q1 + gy);
            break;
          }
          case 3: {
            var r0 = rho * F[f + 2] + orho * gx * gx, r1 = rho * F[f + 3] + orho * gy * gy;
            var s0 = g * F[f + 4] + lr / Math.sqrt(r0 + eps) * gx, s1 = g * F[f + 5] + lr / Math.sqrt(r1 + eps) * gy;
            F[f + 2] = r0; F[f + 3] = r1; F[f + 4] = s0; F[f + 5] = s1;
            x = x - s0; y = y - s1;
            break;
          }
          default: {
            var m0 = b1 * F[f + 4] + ob1 * gx, m1 = b1 * F[f + 5] + ob1 * gy;
            var v0 = b2 * F[f + 2] + ob2 * gx * gx, v1 = b2 * F[f + 3] + ob2 * gy * gy;
            F[f + 2] = v0; F[f + 3] = v1; F[f + 4] = m0; F[f + 5] = m1;
            var n0 = code === 4 ? m0 : b1 * m0 + ob1 * gx, n1 = code === 4 ? m1 : b1 * m1 + ob1 * gy;
            var d0 = Math.sqrt(v0) + eps, d1 = Math.sqrt(v1) + eps;
            x = x - (d0 > 0 ? lr * n0 / d0 * bb : 0);
            y = y - (d1 > 0 ? lr * n1 / d1 * bb : 0);
          }
        }
        F[f] = x; F[f + 1] = y;
        var L;
        if (rotated) {
          u = cs * x + sn * y; w = -sn * x + cs * y;
          L = hc * (kappa * u * u + w * w);
        } else {
          L = hc * (kappa * x * x + y * y);
        }
        if (rec !== null && k === 0) { rec.x[t] = x; rec.y[t] = y; rec.loss[t] = L; }
        if (!(Math.abs(x) <= DV && Math.abs(y) <= DV)) {
          DIVAT[k] = t;
          if (END[k] < 0) finish(k, t, END_DIVERGED);
          continue;
        }
        if (full && END[k] >= 0) { ACT[j++] = k; continue; }   // the natural end has passed
        var fl = I[q + 3];
        if (L < target) {
          if (!(fl & 1)) {
            I[q + 3] = fl | 1; I[q + 1] = t;
            if (fl & 2) { finish(k, t, END_CROSSED); continue; }
          }
        } else if (fl & 1) I[q + 3] = fl & 2;
        if (L < F[f + 7]) { F[f + 7] = L; I[q] = t; }
        var cf = I[q + 2];
        if (L < conv) { if (cf < 0) I[q + 2] = cf = t; } else I[q + 2] = cf = -1;
        if (cf >= 0 && t - cf + 1 >= NP) { finish(k, t, END_CONVERGED); if (!full) continue; }
        else if (t - I[q] >= NP) { finish(k, t, END_STALLED); if (!full) continue; }
        ACT[j++] = k;
      }
      na = j;
    }
    for (var e = 0; e < na; e++) if (END[ACT[e]] < 0) finish(ACT[e], limit, END_LIMIT);
    return { crossing: CROSS, divergedAt: DIVAT, noProgressSince: NOPROG, end: END, why: WHY, steps: t - 1 };
  }

  function orNull(v) { return v < 0 ? null : v; }

  /**
   * stepsToTarget(rule, hp, o): one run of rule at hp.lr, with the rule's defaults under hp, on the
   * quadratic of o, stopped at its natural end or at o.limit (the header gives the rules). Returns
   * {crossing, divergedAt, noProgressSince, end}, end being the step at which the run ended.
   */
  O.stepsToTarget = function (rule, hp, o) {
    var S = setup(rule, hp, o), r = lanes(S, [S.h.lr], false, false, null);
    return { crossing: orNull(r.crossing[0]), divergedAt: orNull(r.divergedAt[0]), noProgressSince: orNull(r.noProgressSince[0]), end: r.end[0] };
  };

  /**
   * summary(rule, hp, lrs, o): the summary curve of rule, stepsToTarget at every learning rate of lrs
   * (O.RATES when omitted), the rule's other hyperparameters from hp. Returns [{lr, crossing, diverged,
   * slow}], slow true when the run reached o.limit with no crossing while still making new minima.
   */
  O.summary = function (rule, hp, lrs, o) {
    lrs = lrs || O.RATES;
    var S = setup(rule, hp, o), r = lanes(S, lrs, false, true, null), out = new Array(lrs.length);
    for (var k = 0; k < lrs.length; k++) {
      var cr = orNull(r.crossing[k]), dv = r.divergedAt[k] >= 0;
      out[k] = { lr: lrs[k], crossing: cr, diverged: dv, slow: cr == null && !dv && r.why[k] === END_LIMIT };
    }
    return out;
  };

  function hpOf(hps, rules, i) {
    return hps == null ? null : Array.isArray(hps) ? hps[i] : hps[rules[i]];
  }

  /**
   * endStep(rules, hps, o): the step at which the run of every rule in rules has ended, at most o.limit,
   * where hps holds each rule's hyperparameters (keyed by rule, or an array parallel to rules). The run
   * of F2.1 plays to this step (its `until`).
   */
  O.endStep = function (rules, hps, o) {
    var until = 0;
    for (var i = 0; i < rules.length; i++) {
      var S = setup(rules[i], hpOf(hps, rules, i), o);
      until = Math.max(until, lanes(S, [S.h.lr], false, false, null).end[0]);
    }
    return until;
  };

  /**
   * trace(rules, hps, o): every rule's run to o.limit, or to its divergence, recorded at every step, and
   * the step at which all of them have ended (until, equal to endStep). Each run is {rule, lr, x, y,
   * loss, steps, end, crossing, divergedAt, noProgressSince}: x, y and loss are Float64Arrays indexed by
   * step from 0 to steps, the last step computed; end, crossing and noProgressSince are stepsToTarget's
   * (the run's natural end), and divergedAt is the step at which the path diverged, if it did.
   */
  O.trace = function (rules, hps, o) {
    var runs = [], until = 0;
    for (var i = 0; i < rules.length; i++) {
      var S = setup(rules[i], hpOf(hps, rules, i), o);
      var rec = { x: new Float64Array(S.limit + 1), y: new Float64Array(S.limit + 1), loss: new Float64Array(S.limit + 1) };
      var r = lanes(S, [S.h.lr], true, false, rec), steps = r.steps;
      if (r.divergedAt[0] >= 0) steps = r.divergedAt[0];
      runs.push({
        rule: rules[i], lr: S.h.lr,
        x: rec.x.subarray(0, steps + 1), y: rec.y.subarray(0, steps + 1), loss: rec.loss.subarray(0, steps + 1),
        steps: steps, end: r.end[0], crossing: orNull(r.crossing[0]),
        divergedAt: orNull(r.divergedAt[0]), noProgressSince: orNull(r.noProgressSince[0])
      });
      until = Math.max(until, r.end[0]);
    }
    return { until: until, runs: runs };
  };
})(typeof window !== 'undefined' ? window : globalThis);
