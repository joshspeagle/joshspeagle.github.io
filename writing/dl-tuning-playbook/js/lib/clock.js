/*
 * clock.js: one training run on two clocks, wall-clock time and training step (TP.clock), the model of
 * figure F11.1 (notes/revamp/figure-plan.md, notes/revamp/implementation-plan.md WO-F11.1).
 *
 * Ported from version 1's p9-clock.js (notes/revamp/v1-archive/site/js/figures/), figure
 * `eval-step-vs-time` of notes/specs/pages-7-9.md, with every number unchanged. F11.1 runs it at the
 * defaults with the periodic component off, which is stepEvals() and timeEvals() with b = 0 or omitted.
 *
 * Clock (wall-clock time tau in seconds to training step): 10 steps per second, except from 1,000 s to
 * 1,600 s, when the slowdown divides the speed (slowRate steps per second, 3 by default). With the
 * preemption on (the default), the job is preempted when it reaches step 17,800 (at 2,200 s by default)
 * and is down for 300 s. Checkpoints are saved every 1,000 steps, so it restarts from the checkpoint at
 * step 17,000 and trains steps 17,001 to 17,800 a second time. It reaches step 20,000 at 2,800 s by
 * default. The preemption is tied to the step, so the slowdown moves it in time without changing which
 * steps are repeated.
 *
 * Validation loss of the model state at step t:
 *   V(t) = 0.2 + exp(-t / 1000) + 0.01 ln(1 + t / 1000) + b sin(2 pi t / 1000) + 0.003 z,
 * with b = 0 (the periodic component off) or 0.01. z is one standard normal per model state. Pass 0
 * (the first time a step is trained) and pass 1 (after the restart) each have a draw for every multiple
 * of 25 steps, from separate forks of the seeded generator (seed 1 by default); pass 0 has draws up to
 * step 20,000, so the run without the preemption reads the same sequence. The restored checkpoint at
 * step 17,000 is the pass-0 state, so it keeps its pass-0 draw; the steps trained again after the
 * restart get fresh draws. A time-interval evaluation can land between multiples of 25 steps; such a
 * state gets one draw from a generator seeded by the pass and the step. Both evaluation schedules and
 * both values of b read the same draws.
 *
 * Step-interval evaluations run every evalSteps steps (250 by default); time-interval evaluations every
 * evalSeconds seconds (25 by default) while the job is up, each reading the model at the last completed
 * step. No evaluation runs while the job is down.
 *
 * Needs prng.js and curves.js, looked up when stepClock is called. No DOM.
 *
 * API:
 *   TP.clock.CLOCK, TP.clock.stepClockDefaults, TP.clock.stepClockOptions
 *   TP.clock.stepClock({evalSteps, evalSeconds, preempt, slowRate (or slowdown), seed})
 *     -> {clock, derived, at(tau), timeOf(pass, step), noiseFree(step, b), loss(pass, step, b),
 *         stepEvals(b), timeEvals(b), constants}
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var CLOCK = Object.freeze({
    rate: 10, slowFrom: 1000, slowTo: 1600, preemptStep: 17800, down: 300,
    checkpointEvery: 1000, endStep: 20000
  });
  var RESTORE = Math.floor(CLOCK.preemptStep / CLOCK.checkpointEvery) * CLOCK.checkpointEvery;   // 17,000
  var GRID = 25, SIGMA = 0.003, BUG = 0.01, PERIOD = 1000;
  var DEFAULTS = Object.freeze({ evalSteps: 250, evalSeconds: 25, preempt: true, slowRate: 3, seed: 1 });
  var OPTIONS = Object.freeze({ evalSteps: [100, 250, 500], evalSeconds: [10, 25, 60], slowRate: [10, 8, 6, 5, 4, 3, 2.5] });

  /**
   * stepClock({evalSteps = 250, evalSeconds = 25, preempt = true, slowRate = 3 (or slowdown, the
   * factor 10 / slowRate), seed = 1}) returns {clock, derived, at(tau), timeOf(pass, step),
   * noiseFree(step, b), loss(pass, step, b), stepEvals(b), timeEvals(b), constants}.
   * at(tau) gives {step, pass (0, 1, or null while down), phase ('normal' | 'slow' | 'down' |
   * 'repeat')}; step is continuous, and an evaluation reads the last completed step. An evaluation is
   * {step, time, pass, repeat, loss}; repeat marks the evaluations of pass-1 states at or below the
   * step reached before the preemption. Without the preemption, derived.atPreempt, preemptAt, restore,
   * restart and caughtUp are null.
   */
  function stepClock(o) {
    o = o || {};
    var c = CLOCK;
    var E = o.evalSteps || DEFAULTS.evalSteps, T = o.evalSeconds || DEFAULTS.evalSeconds;
    var preempt = o.preempt == null ? DEFAULTS.preempt : !!o.preempt;
    var slowRate = o.slowRate != null ? o.slowRate : o.slowdown != null ? Math.round(c.rate / o.slowdown * 1e9) / 1e9 : DEFAULTS.slowRate;
    var seed = o.seed == null ? DEFAULTS.seed : o.seed;
    var atSlowFrom = c.slowFrom * c.rate;                                   // 10,000
    var atSlowTo = atSlowFrom + (c.slowTo - c.slowFrom) * slowRate;         // 11,800
    var d = {
      atSlowFrom: atSlowFrom, atSlowTo: atSlowTo, slowRate: slowRate, slowdown: c.rate / slowRate, preempt: preempt,
      atPreempt: null, preemptAt: null, restore: null, restart: null, caughtUp: null, end: null
    };
    if (preempt) {
      d.atPreempt = c.preemptStep;                                          // 17,800
      d.preemptAt = c.slowTo + (d.atPreempt - atSlowTo) / c.rate;           // 2,200
      d.restore = RESTORE;                                                  // 17,000
      d.restart = d.preemptAt + c.down;                                     // 2,500
      d.caughtUp = d.restart + (d.atPreempt - d.restore) / c.rate;          // 2,580
      d.end = d.restart + (c.endStep - d.restore) / c.rate;                 // 2,800
    } else {
      d.end = c.slowTo + (c.endStep - atSlowTo) / c.rate;                   // 2,420
    }

    function at(tau) {
      if (tau < c.slowFrom) return { step: tau * c.rate, pass: 0, phase: 'normal' };
      if (tau < c.slowTo) return { step: atSlowFrom + (tau - c.slowFrom) * slowRate, pass: 0, phase: slowRate < c.rate ? 'slow' : 'normal' };
      if (!preempt || tau < d.preemptAt) return { step: Math.min(c.endStep, atSlowTo + (tau - c.slowTo) * c.rate), pass: 0, phase: 'normal' };
      if (tau < d.restart) return { step: d.restore, pass: null, phase: 'down' };
      var s = Math.min(c.endStep, d.restore + (tau - d.restart) * c.rate);
      return { step: s, pass: 1, phase: s <= d.atPreempt ? 'repeat' : 'normal' };
    }
    /* the wall-clock time at which a pass reaches a step */
    function timeOf(pass, step) {
      if (pass === 1) return d.restart + (step - d.restore) / c.rate;
      if (step <= atSlowFrom) return step / c.rate;
      if (step <= atSlowTo) return c.slowFrom + (step - atSlowFrom) / slowRate;
      return c.slowTo + (step - atSlowTo) / c.rate;
    }

    /* one draw per model state: pass 0 on the 25-step grid over steps 0..20,000, pass 1 over
       17,000..20,000, and a draw per (pass, step) off the grid */
    var root = TP.prng.create(seed);
    var g0 = root.fork('first pass'), g1 = root.fork('after restart');
    var z0 = new Float64Array(c.endStep / GRID + 1), z1 = new Float64Array((c.endStep - RESTORE) / GRID + 1), k;
    for (k = 0; k < z0.length; k++) z0[k] = g0.normal();
    for (k = 0; k < z1.length; k++) z1[k] = g1.normal();
    var offSeeds = [TP.prng.deriveSeed(root.seed, 'first pass, off the grid'), TP.prng.deriveSeed(root.seed, 'after restart, off the grid')];
    var offDraws = {};
    function z(pass, step) {
      if (step !== Math.floor(step)) throw new RangeError('TP.clock.stepClock: no noise draw at step ' + step);
      var p = pass === 1 && preempt && step > d.restore ? 1 : 0;
      if (step % GRID === 0) return p ? z1[(step - RESTORE) / GRID] : z0[step / GRID];
      var key = p + ':' + step;
      if (offDraws[key] === undefined) offDraws[key] = TP.prng.create(TP.prng.deriveSeed(offSeeds[p], step)).normal();
      return offDraws[key];
    }
    function noiseFree(step, b) {
      return TP.curves.validation(step, {}) + (b || 0) * Math.sin(2 * Math.PI * step / PERIOD);
    }
    function loss(pass, step, b) { return noiseFree(step, b) + SIGMA * z(pass, step); }
    function evaluation(pass, step, time, b) {
      return { step: step, time: time, pass: pass, repeat: pass === 1 && step <= d.atPreempt, loss: loss(pass, step, b) };
    }

    function stepEvals(b) {
      var out = [], s, last0 = preempt ? d.atPreempt : c.endStep;
      for (s = 0; s <= last0; s += E) out.push(evaluation(0, s, timeOf(0, s), b));
      if (preempt) for (s = (Math.floor(d.restore / E) + 1) * E; s <= c.endStep; s += E) out.push(evaluation(1, s, timeOf(1, s), b));
      return out;
    }
    function timeEvals(b) {
      var out = [];
      for (var i = 0; i * T <= d.end + 1e-9; i++) {
        var tau = i * T, a = at(tau);
        if (a.pass == null) continue;                   // no evaluation while the job is down
        out.push(evaluation(a.pass, Math.floor(a.step + 1e-6), tau, b));
      }
      return out;
    }
    return {
      clock: Object.freeze(Object.assign({}, c, { slowRate: slowRate, preempt: preempt, preemptAt: d.preemptAt })),
      derived: d, at: at, timeOf: timeOf, noiseFree: noiseFree, loss: loss, stepEvals: stepEvals, timeEvals: timeEvals,
      constants: { evalSteps: E, evalSeconds: T, grid: GRID, sigma: SIGMA, bug: BUG, period: PERIOD, seed: seed }
    };
  }

  TP.clock = {
    CLOCK: CLOCK,
    stepClockDefaults: DEFAULTS,
    stepClockOptions: OPTIONS,
    stepClock: stepClock
  };
})(typeof window !== 'undefined' ? window : globalThis);
