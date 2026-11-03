/*
 * Toy D: expected-loss dynamics of SGD on a quadratic with one sharp direction.
 *
 * Spec: notes/specs/pages-7-9.md ("Preamble: shared toy training dynamics"), with the
 * curvature rule revised in notes/specs/addenda-literature.md ("Toy D preamble").
 * Calibration and timings: notes/toyD-calibration.md.
 *
 * Model. Fixed directions i = 1..n (curvatures params.h) and one sharp direction s.
 * Each step with learning rate eta_t updates the second moments exactly:
 *   m_i <- (1 - eta_t h_i)^2 m_i + eta_t^2 sigma2 h_i        (the same for s, with h_s)
 * and the expected training loss is L_t = sum_i h_i m_i / 2 (minimum 0).
 * After the step the sharp curvature relaxes toward a target h*:
 *   h_s <- h* + (h_s - h*) exp(-eta_t / tauC)
 *   rule 'responsive' (default): h*(eta) = min(h0, max(hInf, 2c / eta))
 *   rule 'fixed' (the original preamble): h* = hInf
 * Start: each fixed direction holds loss 1/n (m_i = 2 / (n h_i)); the sharp direction holds
 * epsSharp (m_s = 2 epsSharp / h0) at curvature h0. The run diverges, and stops, when
 * L > divergeAt or L is not finite. "Instability off" is params.h0 = params.hInf.
 *
 * Learning-rate scale. Every rate the API takes or returns (a schedule's values, stepState's eta,
 * hStar's eta, run's lr, trace's eta, unstableBaseLR's result) is the printed rate. The model's
 * dynamics above read the model rate eta = printed rate / LR_SCALE, with LR_SCALE = 0.5 (build log,
 * Batch 7, the first ruling): the scale puts the unstable base rate on the quarter-decade grid at
 * 10^-1.5 = 0.0316, the rate above which Toy S's trials diverge, so that the worked case's study and
 * its sweeps read one learning-rate axis. The products eta_t h_s (trace's firstAbove, stepsAbove and
 * peakEtaH) use the model rate, so the stability limit on the printed axis is 2 LR_SCALE / h_s
 * (TP.toyD.limitRate). LR_SCALE is a power of two, so the conversion is exact in both directions.
 * The params stay in the model's units. A curvature is an inverse rate and tauC a rate, so a text
 * that prints the constants beside printed rates takes them from TP.toyD.printedParams: the
 * curvatures over LR_SCALE (h0 100, hInf 5), tauC times LR_SCALE (0.35), c, sigma2, epsSharp and
 * divergeAt unchanged. In those units h*(eta) = min(h0, max(hInf, 2c / eta)), eta h_s and the
 * limit 2 / h_s read the printed rate exactly as the model's formulas read the model rate.
 *
 * Speed. Exact steps while t < 2000, during a warmup ramp, and while |h_s - h*| > 1e-6 hInf;
 * otherwise closed-form blocks between evaluation points (exact for a constant learning rate;
 * the sharp direction uses its block-averaged curvature). Function schedules use blocks only
 * where eta varies by less than 0.1% across the block (eta at the block midpoint), which is
 * accurate to about 1e-3 relative. A block whose end loss would exceed the cap is redone step
 * by step, so the divergence step is exact. run({exact: true}) steps every step.
 *
 * API (plain script; attaches to the global TP):
 *   TP.toyD.defaults
 *   TP.toyD.run({schedule, steps, params, evalEvery, nEval, exact})
 *     schedule: number (constant) | function(t) -> eta_t |
 *       {type: 'warmup', base, warmupSteps, postWarmupSteps}   eta_t = base * min(1, (t + 1) / W)
 *       {type: 'constant-warmup', low, base, warmupSteps, postWarmupSteps}   low for t < W, then base
 *     steps defaults to W + postWarmupSteps (postWarmupSteps defaults to 2W) or 20000.
 *     evalEvery: evaluate every k steps; otherwise about nEval (400) log-spaced steps.
 *     Returns {steps, loss, hs, lr} (Float64Arrays at the evaluation steps, ending at the
 *     divergence step if any; lr[k] is eta at steps[k]), diverged, divergedAt, final, L0,
 *     peakEarly (max loss over steps 0..100 / L0), peak and peakStep (over every computed step),
 *     minLoss and minStep (the lowest loss over every computed step, and its step; with blocks,
 *     the steps computed are the exact steps and the ends of blocks).
 *     settleTol (advanced) overrides the 1e-6 block tolerance, in units of hInf.
 *     In a constant segment lr[k] is the segment's rate, so at the last step of a
 *     'constant-warmup' hold it is the hold's rate, where schedule(t) is already the base.
 *   TP.toyD.initState(params) -> {t: 0, m, hs, L, L0, diverged}, the state at step 0 (m: the
 *     second moments, fixed directions in params.h order, then the sharp one).
 *   TP.toyD.stepState(state, eta, params) advances the state one exact step in place, with run()'s
 *     arithmetic, and returns it; diverged is set when L > divergeAt (or not finite), and a
 *     diverged state is not stepped again.
 *   TP.toyD.trace({schedule, steps, params, every, keyframe}) steps exactly and returns {rows: {t,
 *     loss, hs, eta, gnorm}, keyframes: [{t, state}], diverged, divergedAt, steps, L0, peak, peakStep,
 *     minLoss, minStep, firstAbove, stepsAbove, peakEtaH}; see the function for each field. Its
 *     rows equal run({exact: true, evalEvery: every}) wherever run()'s lr is schedule(t).
 *   TP.toyD.stepsToThreshold(run, threshold)  first crossing below threshold, interpolated in
 *     log loss between evaluation points; null if never reached.
 *   TP.toyD.sweep({learningRates, steps, params, evalEvery})  constant-rate trials:
 *     [{eta, run, final, diverged, divergedAt, peakEarly, stepsToThreshold(threshold)}]
 *   TP.toyD.bestIndex(trials)  index of the lowest final loss among feasible trials, or -1.
 *   TP.toyD.shortestWarmup({base, candidates, params, postFactor, kind, low})
 *     each W run independently for max((1 + postFactor) W, 2000) steps; kind 'linear' (default)
 *     or 'constant' (hold at low, then jump). Returns {base, trials: [{W, pass, divergedAt,
 *     peak, run}], shortest, nonMonotone}.
 *   TP.toyD.unstableBaseLR(params, {grid, steps, refine})  smallest constant rate on the
 *     quarter-decade grid 0.001..1 that diverges within 20,000 steps. With refine: true, the
 *     threshold is bisected between that grid point and the one below and returned rounded up
 *     to two significant figures (itself a diverging rate).
 *   TP.toyD.quarterDecades(lo, hi), TP.toyD.lrGrid(centerLog10, count), TP.toyD.closedForm(...)
 *   TP.toyD.LR_SCALE (0.5), TP.toyD.limitRate(hs) = 2 LR_SCALE / hs, the printed rate at eta h_s = 2.
 *   TP.toyD.printedParams(params) -> the params with h, h0 and hInf over LR_SCALE and tauC times it.
 *   closedForm and the params (curvatures, sigma2, tauC, c) are in the model's units.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var defaults = {
    h: [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1],
    sigma2: 0.002,
    hInf: 2.5,
    h0: 50,
    tauC: 0.7,
    c: 0.8,
    epsSharp: 1e-6,
    divergeAt: 100,
    rule: 'responsive'
  };

  var EXACT_UNTIL = 2000;   // always step exactly before this step
  // Blocks only while |h_s - h*| <= SETTLE_TOL * hInf. The spec's 1e-3 left errors of 2e-4 in
  // the sharp direction's floor after long ramps (m_s lags its moving fixed point); 1e-6 costs
  // a few hundred extra exact steps at most and keeps blocks within 1e-6 of exact stepping.
  var SETTLE_TOL = 1e-6;
  var MIN_BLOCK = 16;       // shorter stretches are cheaper to step exactly
  var SMOOTH_TOL = 1e-3;    // function schedules: max relative change of eta across a block
  var EARLY_STEPS = 100;    // window for peakEarly
  var N_EVAL = 400;
  var DEFAULT_STEPS = 20000;
  // The printed rate over the model rate (the header's "Learning-rate scale"). One half puts the
  // unstable base rate at 10^-1.5, Toy S's divergence threshold (build log, Batch 7, first ruling).
  var LR_SCALE = 0.5;
  function modelRate(eta) { return eta / LR_SCALE; }
  // The constants in the printed rate's units (the header's "Learning-rate scale"), for the texts.
  function printedParams(p) {
    var P = mergeParams(p), out = {}, k;
    for (k in P) out[k] = P[k];
    out.h = P.h.map(function (v) { return v / LR_SCALE; });
    out.h0 = P.h0 / LR_SCALE;
    out.hInf = P.hInf / LR_SCALE;
    out.tauC = P.tauC * LR_SCALE;
    return out;
  }

  function mergeParams(p) {
    var out = {}, k;
    for (k in defaults) out[k] = defaults[k];
    if (p) for (k in p) if (p[k] !== undefined) out[k] = p[k];
    return out;
  }

  function hStar(P, eta) {
    if (P.rule === 'fixed') return P.hInf;
    return Math.min(P.h0, Math.max(P.hInf, 2 * P.c / eta));
  }

  // Second moment after n steps of m <- (1 - eta h)^2 m + eta^2 sigma2 h at constant eta, h.
  function closedForm(m0, eta, h, sigma2, n) {
    if (n <= 0) return m0;
    var x = eta * h;
    if (x === 0) return m0;
    if (x === 2) return m0 + n * eta * eta * sigma2 * h;
    // log r^n with r = (1 - x)^2, computed without cancellation near x = 0 and x = 2
    var lrn = x === 1 ? -Infinity : 2 * n * (x < 1 ? Math.log1p(-x) : Math.log1p(x - 2));
    var mStar = eta * sigma2 / (2 - x);          // fixed point; negative when x > 2
    return m0 * Math.exp(lrn) - mStar * Math.expm1(lrn);
  }

  // Normalized schedule: eta(t) as the model rate, constant or ramping segments, default length.
  function makeSchedule(s) {
    if (typeof s === 'number') {
      var sm = modelRate(s);
      return { eta: function () { return sm; }, length: null,
        segs: [{ start: 0, end: Infinity, eta: sm, mode: 'const' }] };
    }
    if (typeof s === 'function') {
      return { eta: function (t) { return modelRate(s(t)); }, length: null,
        segs: [{ start: 0, end: Infinity, eta: NaN, mode: 'smooth' }] };
    }
    if (s && s.type === 'warmup') {
      var base = modelRate(+s.base), W = Math.max(0, Math.round(s.warmupSteps || 0));
      var post = s.postWarmupSteps != null ? Math.max(0, Math.round(s.postWarmupSteps)) : 2 * W;
      if (W <= 1) {
        return { eta: function () { return base; }, length: W + post,
          segs: [{ start: 0, end: Infinity, eta: base, mode: 'const' }] };
      }
      return {
        eta: function (t) { return base * Math.min(1, (t + 1) / W); },
        length: W + post,
        segs: [{ start: 0, end: W - 1, eta: NaN, mode: 'exact' },
               { start: W - 1, end: Infinity, eta: base, mode: 'const' }]
      };
    }
    if (s && s.type === 'constant-warmup') {
      var lo = modelRate(+s.low), b = modelRate(+s.base), Wc = Math.max(0, Math.round(s.warmupSteps || 0));
      var postc = s.postWarmupSteps != null ? Math.max(0, Math.round(s.postWarmupSteps)) : 2 * Wc;
      var segs = Wc > 0
        ? [{ start: 0, end: Wc, eta: lo, mode: 'const' }, { start: Wc, end: Infinity, eta: b, mode: 'const' }]
        : [{ start: 0, end: Infinity, eta: b, mode: 'const' }];
      return { eta: function (t) { return t < Wc ? lo : b; }, length: Wc + postc, segs: segs };
    }
    throw new Error('TP.toyD: unknown schedule ' + JSON.stringify(s));
  }

  // Evaluation steps: 0, then every k steps or about n log-spaced steps, always ending at N.
  function evalGrid(N, evalEvery, nEval) {
    var out = [0], t;
    if (N <= 0) return out;
    if (evalEvery && evalEvery > 0) {
      var k = Math.max(1, Math.round(evalEvery)), cnt = Math.floor((N - 1) / k) + 2;
      var g = new Float64Array(cnt);
      for (var j = 1; j < cnt - 1; j++) g[j] = j * k;
      g[cnt - 1] = N;
      return g;
    }
    var n = Math.max(2, nEval || N_EVAL), lg = Math.log(N), last = 0;
    for (var i = 0; i < n; i++) {
      t = Math.min(N, Math.round(Math.exp(lg * i / (n - 1))));
      if (t > last) { out.push(t); last = t; }
    }
    if (last !== N) out.push(N);
    return out;
  }

  function newOutput(size) {
    var buf = new Float64Array(4 * size);
    return { n: 0, t: buf.subarray(0, size), L: buf.subarray(size, 2 * size),
      h: buf.subarray(2 * size, 3 * size), e: buf.subarray(3 * size, 4 * size) };
  }

  function put(out, t, L, hs, eta) {
    var j = out.n++;
    out.t[j] = t; out.L[j] = L; out.h[j] = hs; out.e[j] = eta * LR_SCALE;   // the printed rate
  }

  function run(opts) {
    opts = opts || {};
    var P = mergeParams(opts.params);
    var sch = makeSchedule(opts.schedule);
    var N = opts.steps != null ? Math.max(0, Math.round(opts.steps))
      : (sch.length != null ? sch.length : DEFAULT_STEPS);
    var exactAll = !!opts.exact;
    var ev = evalGrid(N, opts.evalEvery, opts.nEval);
    var segs = sch.segs, etaFn = sch.eta;

    var nf = P.h.length, S = nf, nd = nf + 1, i;
    var hv = new Float64Array(nd), m = new Float64Array(nd), mt = new Float64Array(nd);
    for (i = 0; i < nf; i++) { hv[i] = P.h[i]; m[i] = 2 / (nf * P.h[i]); }
    hv[S] = P.h0; m[S] = 2 * P.epsSharp / P.h0;

    var s2 = P.sigma2, cap = P.divergeAt, tauC = P.tauC, h0 = P.h0;
    var settleTol = (opts.settleTol != null ? opts.settleTol : SETTLE_TOL) * P.hInf;

    var out = newOutput(ev.length + 1);

    var L = 0;
    for (i = 0; i < nd; i++) L += hv[i] * m[i];
    L *= 0.5;
    var L0 = L, peakEarlyL = L, peakL = L, peakStep = 0, minL = L, minStep = 0;
    put(out, 0, L, hv[S], etaFn(0));

    var t = 0, k = 1, si = 0, diverged = false, divergedAt = null, noBlockUntil = 0;
    var lastEta = NaN, decay = 1, hst = h0, e2s = 0;

    while (t < N && !diverged) {
      while (segs[si].end <= t) si++;
      var seg = segs[si];
      var segEnd = Math.min(seg.end, N);
      var tEnd = Math.min(ev[k], segEnd);
      var len = tEnd - t, done = false, eta, sum;

      // Closed-form block up to the next evaluation step (or the end of the segment)
      if (!exactAll && t >= EXACT_UNTIL && t >= noBlockUntil && len >= MIN_BLOCK && seg.mode !== 'exact') {
        eta = NaN;
        if (seg.mode === 'const') {
          eta = seg.eta;
        } else {
          while (len >= MIN_BLOCK) {
            var ea = etaFn(t), eb = etaFn(t + len - 1), em = etaFn(t + (len >> 1));
            var tol = SMOOTH_TOL * Math.abs(em);
            if (Math.abs(eb - ea) <= tol && Math.abs(em - ea) <= tol && Math.abs(em - eb) <= tol) { eta = em; break; }
            len >>= 1;
          }
        }
        if (len >= MIN_BLOCK && eta === eta) {
          var hs0 = hv[S], hsT = hStar(P, eta);
          if (Math.abs(hs0 - hsT) <= settleTol) {
            var q = len * eta / tauC;
            var dec = Math.exp(-q);
            var hsAvg = q > 0 ? hsT + (hs0 - hsT) * (-Math.expm1(-q)) / q : hs0;
            var hs1 = hsT + (hs0 - hsT) * dec;
            sum = 0;
            for (i = 0; i < nf; i++) { mt[i] = closedForm(m[i], eta, hv[i], s2, len); sum += hv[i] * mt[i]; }
            mt[S] = closedForm(m[S], eta, hsAvg, s2, len);
            sum += hs1 * mt[S];
            var Lb = 0.5 * sum;
            if (Lb <= cap) {
              for (i = 0; i < nd; i++) m[i] = mt[i];
              hv[S] = hs1; t += len; L = Lb;
              if (L > peakL) { peakL = L; peakStep = t; }
              if (L < minL) { minL = L; minStep = t; }
              if (t === ev[k]) { put(out, t, L, hs1, etaFn(t)); k++; }
              done = true;
            } else {
              noBlockUntil = tEnd;   // redo this stretch step by step to find the divergence step
            }
          }
        }
      }

      // Exact steps, straight through evaluation steps, until the segment ends or (outside a
      // ramp) a block of at least MIN_BLOCK steps to the next evaluation step becomes possible
      if (!done) {
        var isConst = seg.mode === 'const', segEta = seg.eta, smooth = seg.mode === 'smooth';
        var mayBlock = !exactAll && seg.mode !== 'exact', sinceTry = 0;
        while (t < segEnd) {
          eta = isConst ? segEta : etaFn(t);
          if (eta !== lastEta) {
            lastEta = eta;
            decay = Math.exp(-eta / tauC);
            hst = hStar(P, eta);
            e2s = eta * eta * s2;
          }
          sum = 0;
          for (i = 0; i < nf; i++) {
            var a = 1 - eta * hv[i];
            m[i] = a * a * m[i] + e2s * hv[i];
            sum += hv[i] * m[i];
          }
          var hs = hv[S], as = 1 - eta * hs;
          m[S] = as * as * m[S] + e2s * hs;
          hs = hst + (hs - hst) * decay;
          hv[S] = hs;
          sum += hs * m[S];
          L = 0.5 * sum;
          t++;
          if (!(L <= cap)) { diverged = true; divergedAt = t; put(out, t, L, hs, etaFn(t)); break; }
          if (t <= EARLY_STEPS && L > peakEarlyL) peakEarlyL = L;
          if (L > peakL) { peakL = L; peakStep = t; }
          if (L < minL) { minL = L; minStep = t; }
          if (t === ev[k]) { put(out, t, L, hs, isConst ? segEta : etaFn(t)); k++; }
          if (mayBlock && t >= EXACT_UNTIL && t >= noBlockUntil && ev[k] - t >= MIN_BLOCK &&
              Math.abs(hs - hst) <= settleTol && (!smooth || ++sinceTry >= MIN_BLOCK)) break;
        }
      }
    }

    var peakEarly, peak;
    if (diverged) {
      var r = isFinite(L) ? L / L0 : Infinity;
      peak = Math.max(peakL / L0, r);
      peakStep = r >= peakL / L0 ? divergedAt : peakStep;
      peakEarly = divergedAt <= EARLY_STEPS ? Math.max(peakEarlyL / L0, r) : peakEarlyL / L0;
    } else {
      peak = peakL / L0;
      peakEarly = peakEarlyL / L0;
    }

    return {
      steps: out.t.subarray(0, out.n),
      loss: out.L.subarray(0, out.n),
      hs: out.h.subarray(0, out.n),
      lr: out.e.subarray(0, out.n),
      diverged: diverged,
      divergedAt: divergedAt,
      final: L,
      L0: L0,
      peakEarly: peakEarly,
      peak: peak,
      peakStep: peakStep,
      minLoss: minL,
      minStep: minStep,
      stepsRun: t,
      params: P
    };
  }

  /* The state of a run: the second moments m (the fixed directions in params.h order, then the sharp
     one), the sharp curvature hs, the expected loss L and the starting loss L0, after t steps. */
  function initState(params) {
    var P = mergeParams(params), nf = P.h.length, m = new Float64Array(nf + 1), L = 0, i;
    for (i = 0; i < nf; i++) m[i] = 2 / (nf * P.h[i]);
    m[nf] = 2 * P.epsSharp / P.h0;
    for (i = 0; i < nf; i++) L += P.h[i] * m[i];
    L += P.h0 * m[nf];
    L *= 0.5;
    return { t: 0, m: m, hs: P.h0, L: L, L0: L, diverged: false };
  }

  /* One exact step at learning rate eta, in place, with the arithmetic of run()'s exact steps. A state
     that has diverged is returned unchanged, because a run stops at its divergence step. */
  function stepState(state, eta, params) {
    if (state.diverged) return state;
    var P = mergeParams(params), h = P.h, nf = h.length, m = state.m;
    eta = modelRate(eta);
    var decay = Math.exp(-eta / P.tauC), hst = hStar(P, eta), e2s = eta * eta * P.sigma2;
    var sum = 0, i;
    for (i = 0; i < nf; i++) {
      var a = 1 - eta * h[i];
      m[i] = a * a * m[i] + e2s * h[i];
      sum += h[i] * m[i];
    }
    var hs = state.hs, as = 1 - eta * hs;
    m[nf] = as * as * m[nf] + e2s * hs;
    hs = hst + (hs - hst) * decay;
    state.hs = hs;
    sum += hs * m[nf];
    state.L = 0.5 * sum;
    state.t++;
    if (!(state.L <= P.divergeAt)) state.diverged = true;
    return state;
  }

  /*
   * trace({schedule, steps, params, every, keyframe}): the run stepped exactly, as run({exact: true})
   * steps it, for the figures that play it on the runtime (F9.2's compute).
   *   rows: {t, loss, hs, eta, gnorm}, parallel Float64Arrays at every multiple of `every` (default 1)
   *     from step 0, and at the last step computed (the end, or the divergence step) when it is not one.
   *     eta[k] is the printed rate of the step from t[k] to t[k] + 1, schedule(t[k]); gnorm[k] is the root of
   *     the expected squared gradient norm, sqrt(sum_i h_i^2 m_i), the sharp direction included.
   *   keyframes: [{t, state}] every `keyframe` steps from step 0 (none without `keyframe`), each state a
   *     copy in the form of initState(), from which stepState() continues the run.
   *   diverged, divergedAt (null if none), steps (the last step computed), L0, peak and peakStep (the
   *     largest loss over every step, divergence step included, over L0, as run() gives them), minLoss
   *     and minStep.
   *   firstAbove, stepsAbove and peakEtaH: over every step t from 0 to the last computed, the first t at
   *     which eta(t) h_s(t), eta the model rate, exceeds 2 (null if none), the number of such t, and the largest eta(t) h_s(t).
   *   resume: the state at the last step computed with the running summaries, for opts.from.
   * Resuming: trace({schedule, steps: N2, params, every, keyframe, from: r}), with r an earlier result
   *   of the same schedule, params, every and keyframe, continues r's run from step r.steps to N2 (the
   *   last step, counted from step 0). Its rows and keyframes hold only the steps after r.steps, and
   *   its summaries (peak, minLoss, firstAbove, stepsAbove, peakEtaH, divergedAt) cover the whole run
   *   from step 0. The arithmetic is the same, so r's rows followed by the continuation's equal one
   *   trace to N2 when every is 1 (with a larger every, r's end row at a step that is not a multiple
   *   of every is one the single trace does not have). A diverged r, or N2 <= r.steps, gives no rows.
   *   F9.2 extends its cached runs this way, so that no single frame traces a whole long run.
   */
  function trace(opts) {
    opts = opts || {};
    var P = mergeParams(opts.params);
    var sch = makeSchedule(opts.schedule), etaFn = sch.eta;
    var N = opts.steps != null ? Math.max(0, Math.round(opts.steps))
      : (sch.length != null ? sch.length : DEFAULT_STEPS);
    var every = opts.every != null ? Math.max(1, Math.round(opts.every)) : 1;
    var kf = opts.keyframe != null ? Math.max(0, Math.round(opts.keyframe)) : 0;

    var nf = P.h.length, S = nf, nd = nf + 1, i;
    var hv = new Float64Array(nd), m = new Float64Array(nd);
    for (i = 0; i < nf; i++) { hv[i] = P.h[i]; m[i] = 2 / (nf * P.h[i]); }
    hv[S] = P.h0; m[S] = 2 * P.epsSharp / P.h0;
    var s2 = P.sigma2, cap = P.divergeAt, tauC = P.tauC;

    var size = Math.floor(N / every) + 2;
    var buf = new Float64Array(5 * size);
    var rT = buf.subarray(0, size), rL = buf.subarray(size, 2 * size), rH = buf.subarray(2 * size, 3 * size);
    var rE = buf.subarray(3 * size, 4 * size), rG = buf.subarray(4 * size, 5 * size), nr = 0;
    var keyframes = [];

    function row(t, L, hs, eta) {
      var g2 = 0;
      for (var q = 0; q < nf; q++) g2 += hv[q] * hv[q] * m[q];
      g2 += hs * hs * m[S];
      rT[nr] = t; rL[nr] = L; rH[nr] = hs; rE[nr] = eta * LR_SCALE; rG[nr] = Math.sqrt(g2); nr++;
    }
    function keep(t, L, L0) {
      keyframes.push({ t: t, state: { t: t, m: Float64Array.from(m), hs: hv[S], L: L, L0: L0, diverged: false } });
    }

    var from = opts.from ? (opts.from.resume || opts.from) : null;
    var L, L0, peakL, peakStep, minL, minStep, x, firstAbove, stepsAbove, peakEtaH;
    var t = 0, diverged = false, divergedAt = null, lastEta = NaN, decay = 1, hst = P.h0, e2s = 0, eta, sum, etaT;
    if (from) {
      for (i = 0; i < nd; i++) m[i] = from.m[i];
      hv[S] = from.hs;
      L = from.L; L0 = from.L0; peakL = from.peakL; peakStep = from.peakStep; minL = from.minL; minStep = from.minStep;
      firstAbove = from.firstAbove; stepsAbove = from.stepsAbove; peakEtaH = from.peakEtaH;
      t = from.t; diverged = from.diverged; divergedAt = from.divergedAt;
      etaT = etaFn(t);
      if (diverged) N = t;
    } else {
      L = 0;
      for (i = 0; i < nd; i++) L += hv[i] * m[i];
      L *= 0.5;
      L0 = L; peakL = L; peakStep = 0; minL = L; minStep = 0;
      var eta0 = etaFn(0);
      x = eta0 * hv[S];
      firstAbove = x > 2 ? 0 : null; stepsAbove = x > 2 ? 1 : 0; peakEtaH = x;
      row(0, L, hv[S], eta0);
      if (kf) keep(0, L, L0);
      etaT = eta0;
    }
    while (t < N) {
      eta = etaT;                 // schedule(t), found at the end of the previous step
      if (eta !== lastEta) {
        lastEta = eta;
        decay = Math.exp(-eta / tauC);
        hst = hStar(P, eta);
        e2s = eta * eta * s2;
      }
      sum = 0;
      for (i = 0; i < nf; i++) {
        var a = 1 - eta * hv[i];
        m[i] = a * a * m[i] + e2s * hv[i];
        sum += hv[i] * m[i];
      }
      var hs = hv[S], as = 1 - eta * hs;
      m[S] = as * as * m[S] + e2s * hs;
      hs = hst + (hs - hst) * decay;
      hv[S] = hs;
      sum += hs * m[S];
      L = 0.5 * sum;
      t++;
      etaT = etaFn(t);
      x = etaT * hs;
      if (x > 2) { if (firstAbove === null) firstAbove = t; stepsAbove++; }
      if (x > peakEtaH) peakEtaH = x;
      if (!(L <= cap)) {
        diverged = true; divergedAt = t;
        row(t, L, hs, etaT);
        if (!isFinite(L) || L > peakL) { peakL = isFinite(L) ? L : Infinity; peakStep = t; }
        break;
      }
      if (L > peakL) { peakL = L; peakStep = t; }
      if (L < minL) { minL = L; minStep = t; }
      if (t % every === 0 || t === N) row(t, L, hs, etaT);
      if (kf && t % kf === 0) keep(t, L, L0);
    }

    var resume = {
      t: t, m: Float64Array.from(m), hs: hv[S], L: L, L0: L0, peakL: peakL, peakStep: peakStep, minL: minL,
      minStep: minStep, firstAbove: firstAbove, stepsAbove: stepsAbove, peakEtaH: peakEtaH,
      diverged: diverged, divergedAt: divergedAt
    };
    return {
      resume: resume,
      rows: { t: rT.subarray(0, nr), loss: rL.subarray(0, nr), hs: rH.subarray(0, nr), eta: rE.subarray(0, nr), gnorm: rG.subarray(0, nr) },
      keyframes: keyframes,
      diverged: diverged,
      divergedAt: divergedAt,
      steps: t,
      L0: L0,
      peak: peakL / L0,
      peakStep: peakStep,
      minLoss: minL,
      minStep: minStep,
      firstAbove: firstAbove,
      stepsAbove: stepsAbove,
      peakEtaH: peakEtaH,
      params: P
    };
  }

  function stepsToThreshold(r, threshold) {
    var s = r.steps, L = r.loss, n = s.length;
    for (var j = 0; j < n; j++) {
      if (L[j] < threshold) {
        if (j === 0) return s[0];
        var la = Math.log(L[j - 1]), lb = Math.log(L[j]), lt = Math.log(threshold);
        if (!isFinite(la) || la === lb) return s[j];
        return s[j - 1] + (la - lt) / (la - lb) * (s[j] - s[j - 1]);
      }
    }
    return null;
  }

  function sweep(opts) {
    opts = opts || {};
    var steps = opts.steps != null ? opts.steps : DEFAULT_STEPS;
    return opts.learningRates.map(function (eta) {
      var r = run({ schedule: eta, steps: steps, params: opts.params, evalEvery: opts.evalEvery, nEval: opts.nEval });
      return {
        eta: eta,
        run: r,
        final: r.final,
        diverged: r.diverged,
        divergedAt: r.divergedAt,
        peakEarly: r.peakEarly,
        stepsToThreshold: function (threshold) { return stepsToThreshold(r, threshold); }
      };
    });
  }

  function bestIndex(trials) {
    var best = -1;
    for (var j = 0; j < trials.length; j++) {
      if (trials[j].diverged) continue;
      if (best < 0 || trials[j].final < trials[best].final) best = j;
    }
    return best;
  }

  // 10^(k/4) for every quarter decade from lo to hi inclusive.
  function quarterDecades(lo, hi) {
    var a = Math.round(4 * Math.log10(lo)), b = Math.round(4 * Math.log10(hi)), out = [];
    for (var k = a; k <= b; k++) out.push(Math.pow(10, k / 4));
    return out;
  }

  // count points at spacing (default a quarter decade) centered on 10^centerLog10.
  function lrGrid(centerLog10, count, spacing) {
    count = count || 7; spacing = spacing || 0.25;
    var out = [];
    for (var j = 0; j < count; j++) out.push(Math.pow(10, centerLog10 + (j - (count - 1) / 2) * spacing));
    return out;
  }

  var WARMUP_CANDIDATES = [10, 30, 100, 300, 1000, 3000, 10000, 30000];

  function shortestWarmup(opts) {
    opts = opts || {};
    var cands = opts.candidates || WARMUP_CANDIDATES;
    var postFactor = opts.postFactor != null ? opts.postFactor : 2;
    var minSteps = opts.minSteps != null ? opts.minSteps : 2000;
    var constant = opts.kind === 'constant';
    var trials = cands.map(function (W) {
      var sched = constant
        ? { type: 'constant-warmup', low: opts.low, base: opts.base, warmupSteps: W, postWarmupSteps: postFactor * W }
        : { type: 'warmup', base: opts.base, warmupSteps: W, postWarmupSteps: postFactor * W };
      var r = run({ schedule: sched, steps: Math.max(Math.round((1 + postFactor) * W), minSteps),
        params: opts.params, evalEvery: opts.evalEvery, nEval: opts.nEval });
      return { W: W, pass: !r.diverged, divergedAt: r.divergedAt, peak: r.peak, run: r };
    });
    var shortest = null, nonMonotone = false;
    trials.forEach(function (a) {
      if (a.pass && (shortest === null || a.W < shortest)) shortest = a.W;
      trials.forEach(function (b) { if (a.pass && !b.pass && b.W > a.W) nonMonotone = true; });
    });
    return { base: opts.base, trials: trials, shortest: shortest, nonMonotone: nonMonotone };
  }

  function unstableBaseLR(params, opts) {
    opts = opts || {};
    var grid = (opts.grid || quarterDecades(0.001, 1)).slice().sort(function (a, b) { return a - b; });
    var steps = opts.steps != null ? opts.steps : DEFAULT_STEPS;
    var diverges = function (eta) {
      return run({ schedule: eta, steps: steps, params: params, nEval: 2 }).diverged;
    };
    var prev = null, found = null;
    for (var j = 0; j < grid.length; j++) {
      if (diverges(grid[j])) { found = grid[j]; break; }
      prev = grid[j];
    }
    if (found === null || !opts.refine) return found;
    if (prev === null) return found;
    var lo = prev, hi = found;
    while (hi / lo > 1.001) {
      var mid = Math.sqrt(lo * hi);
      if (diverges(mid)) hi = mid; else lo = mid;
    }
    // round up to two significant figures; the result must itself diverge
    var p = Math.pow(10, Math.floor(Math.log10(hi)) - 1);
    var v = Math.ceil(hi / p - 1e-9) * p;
    for (var tries = 0; tries < 20 && !diverges(v); tries++) v += p;
    return +v.toPrecision(2);
  }

  TP.toyD = {
    defaults: defaults,
    run: run,
    initState: initState,
    stepState: stepState,
    trace: trace,
    sweep: sweep,
    bestIndex: bestIndex,
    stepsToThreshold: stepsToThreshold,
    shortestWarmup: shortestWarmup,
    unstableBaseLR: unstableBaseLR,
    quarterDecades: quarterDecades,
    lrGrid: lrGrid,
    closedForm: closedForm,
    hStar: function (eta, params) { return hStar(mergeParams(params), modelRate(eta)); },
    LR_SCALE: LR_SCALE,
    printedParams: printedParams,
    // the printed rate at which eta h_s = 2 for a sharp curvature h_s: the stability limit on a figure's axis
    limitRate: function (hs) { return 2 * LR_SCALE / hs; },
    WARMUP_CANDIDATES: WARMUP_CANDIDATES,
    EXACT_UNTIL: EXACT_UNTIL
  };
})(typeof window !== 'undefined' ? window : globalThis);
