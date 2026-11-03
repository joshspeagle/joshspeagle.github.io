/*
 * runtime.js: the runtime of running figures, TP.run(fig, spec).
 *
 * Design: notes/revamp/design-system.md (DS) §7 in full, with §4.8 and §4.9 (the ghost, the
 * record and the cursor), §6.7 (state and printing), §9 (motion) and §10 (accessibility), and
 * notes/revamp/implementation-plan.md (the plan) WO-I6. A classic script on window.TP. Every page
 * with a running figure loads it after site.js and chart.js. It needs TP.prng (lib/prng.js). The
 * engine needs no DOM, so Node loads this file for tests/lib/runtime.test.js and drives it with
 * the third argument of TP.run (section G).
 *
 * This comment is the reference for figure builders:
 *   A. What the runtime owns, and the handshake with TP.fig
 *   B. The spec
 *   C. The methods of the run
 *   D. Events and the draw context
 *   E. Time: the loop, the paces, keyframes and chunked computation
 *   F. Changes, actions, autoplay and the run strip
 *   G. Tests: the environment argument and the hooks the conformance harness reads
 *
 * A. WHAT THE RUNTIME OWNS
 *   var run = TP.run(fig, spec) right after var fig = TP.fig(element, contract), where the
 *   contract has kind: 'running'. The runtime owns time: the loop and its pace, the record and
 *   its keyframes, the run strip, autoplay, reduced motion and parameter changes during a run. The
 *   figure's draw draws the state it is handed. The runtime reads each parameter's change class
 *   ('live', 'restart' or 'redraw'), its ghost flag and its showEnd flag from fig.params, the
 *   default seed from fig.params.seed, and the starting values, the URL's cursor and whether the
 *   URL restored the figure from fig.initial(). It calls fig.attach(run) once, appends
 *   div.run-strip to fig.dock, and computes nothing until fig.on('prepare') fires, when the
 *   figure first comes within one viewport of the screen (DS §7.7 item 1). Before that the strip
 *   shows step 0 and TP.fig has drawn the frames alone. TP.fig routes every control, preset,
 *   "Draw again" and Reset to run.setMany, run.settle, run.reset and run.scrub, and updates the
 *   live region, the data table and the URL on run.on('settle').
 *
 * B. THE SPEC (DS §7.2; a "function" field may be a number or a function of the parameters)
 *   init(params, rng)            the state at step 0. rng is the generator of the label "init".
 *   advance(state, params, rng, t, kind)   the state at step t + 1 from the state at step t. It
 *                                may change state in place and return it, because the runtime
 *                                clones at keyframes and in stateAt and never hands it a keyframe.
 *                                params are the parameters in force at step t, read-only (the
 *                                runtime shares the object between steps). rng is the generator
 *                                of TP.prng.deriveSeed(seed, t), built on its first draw. kind is
 *                                the step's kind in the action form, and undefined otherwise.
 *   record(state, t, kind)       the row the record keeps for step t, plain numbers. The runtime
 *                                adds `t` (when the row has none) and `kind`.
 *   compute(params, seed, from, to)   optional fast runner (Toy D, the update rules). Returns
 *                                {rows, keyframes, state, until}: rows for steps from to to in
 *                                order (or each carrying t); keyframes {t: state} for every
 *                                multiple of `keyframe` in [from, to]; state, the state at `to`;
 *                                until, the first step in (from, to] at which the run's until
 *                                holds, or null. The runtime then steps nothing through advance
 *                                at the frontier. Only for figures whose parameters are all
 *                                restart or redraw. It may recompute from step 0 or cache.
 *   actions: ['rerun', 'repeat'] the kinds of step the reader performs (the action form).
 *                                Autoplay performs the first, and Play the kind pressed last.
 *   steps                        function: the step of the default state; autoplay stops there
 *   limit                        function: the last step computed (default steps). Infinity is
 *                                an open run, which needs until.
 *   until(state, t, params)      true when the run reaches its natural end, tested after every
 *                                step. Play stops there; Forward still steps to limit.
 *   pace: 'linear'|'log'|'ease'  the map from playback time to steps (default 'linear')
 *   easeSteps: 3                 under 'ease', the first steps that take 500 ms each at 1×
 *   stride: 1                    the steps of one Forward or Back, and the scrubber's increment
 *   every: 1                     function: the record keeps one row every `every` steps, and
 *                                always a row for the frontier (at most 50,000 rows)
 *   keyframe: 64                 a full copy of the state every `keyframe` steps
 *   clone(state)                 a deep copy (default structuredClone, else JSON)
 *   duration: 6000               function: ms that steps 0 to `steps` take at 1× (at most 8000)
 *   unit: 'step'                 the counter's noun ("checkpoint 7 of 20"), and the scrubber's
 *                                aria-label ("Checkpoint")
 *   span                         function: steps a live change plays when paused (default
 *                                ⌈steps / 4⌉)
 *   ahead: false                 when true the record is computed to `limit` ahead of the cursor
 *   recordPanel: 'a'             the panel whose record scrubs (pass run.recordHandlers() to
 *                                C.hover); the runtime writes the counter into its header note
 *   reset: 'show'|'replay'       what Reset does (DS §7.3)
 *   counter(t, frontier, run)    optional: the counter's text ("16 trials"). The default is
 *                                "step 340 of 1,000", "step 340" for an open run, and, with
 *                                actions, "5 reruns, 1 repeat" (each kind with an s added)
 *
 * C. THE METHODS (DS §7.3, plan WO-I6)
 *   run.start(from)      play from the cursor (or step from). At the end (until or limit) it
 *                        replays from step 0. Steps are of the kind pressed last.
 *   run.pause()          pause and settle
 *   run.step(k)          move by k strides (±1), computing past the frontier where needed, pause,
 *                        settle. Past until, Forward still steps to limit.
 *   run.act(name)        append one step of kind name at the cursor, discarding the later
 *                        record, then pause and settle; Play then performs that kind
 *   run.scrub(t, {transient})   pause and set the cursor, clamped to 0 .. limit (0 .. frontier
 *                        for an open run). transient: no settle (a drag on the scrubber).
 *   run.press(t, phase)  the record panel's press: 'start' pauses, 'start' and 'move' scrub
 *                        transiently, 'end' settles (C.hover's press option)
 *   run.preview(t|null)  while paused, draws step t with ctx.preview = t (hover on the record);
 *                        null draws the cursor again. Ignored while playing.
 *   run.recordHandlers() {press, onRead} to pass to C.hover on the record panel
 *   run.speed(x)         set 0.5, 1 or 2; run.speed() returns it
 *   run.set(name, value, {transient}), run.setMany(values, {transient})   a change of the
 *                        strongest class among the names (restart, then live, then redraw)
 *   run.settle()         settle after transient changes (a handle's release)
 *   run.reset({now})     default parameters and seed, no ghost, the default state: 'show'
 *                        computes to the end and settles; 'replay' plays from step 0. now: true
 *                        (printing, tests) shows the default state at once in either mode.
 *   run.finish()         compute to the end of autoplay at once and show it, paused, labels
 *                        placed from scratch. Equal to autoplay's end.
 *   run.snapshot()       {params, seed, t, frontier, changes: [{t, name, value}], actions:
 *                        [{t, kind}], ghost, kind, speed, autoDone, touched}. actions lists each
 *                        step t (the step that produced state t) whose kind is not the first
 *                        action. autoDone and touched let a figure printed before it autoplayed
 *                        still autoplay after printing.
 *   run.restore(snap)    recomputes that record and shows step t
 *   run.touch()          marks the figure touched (DS §7.7 item 6) for a figure's own handle or
 *                        press that changes no parameter, such as F7.1's mark: autoplay ends,
 *                        the run continues as the reader's, and the figure never plays by itself
 *                        again
 *   run.onTick(fn)       fn(t, state, run) after every draw
 *   run.on(name, fn), run.off(name, fn)   section D
 *   Readers: run.t(), run.frontier(), run.state(), run.stateAt(t), run.rows(), run.ghost()
 *   (the previous run's rows or null), run.changes(), run.params() (in force at the cursor,
 *   seed included), run.playing(), run.touched(), run.steps(), run.limit(), run.span(),
 *   run.end() (the step autoplay stops at: steps, or until when it holds earlier),
 *   run.untilStep() (the first step at which until held, or null), run.kind() (the kind Play
 *   performs), run.counter() (the counter's text), run.pending() (a chunked computation runs),
 *   run.timeTo(t) (the playback time at 1× from step 0 to step t, in ms)
 *
 * D. EVENTS AND THE DRAW CONTEXT
 *   run.on('settle', fn(info))   after a pause, the end of a run, a step, an action, a scrub that
 *                        is not transient, a change that is not transient, Reset, finish and
 *                        restore. The final draw before it has playing and transient false, so
 *                        labels are placed from scratch. info = {reason, quiet}; quiet is true
 *                        for the settle at load of a reduced-motion or restored figure.
 *   run.on('end', fn)    play reached its stop (steps in autoplay, until or limit)
 *   run.on('restart', fn)   a restart began a new run (after its record exists at the cursor)
 *   run.on('play', fn), run.on('pause', fn)   play started or stopped, for any reason
 *   fig.draw(state, ctx) is called once per animation frame in which the cursor moved, after
 *   every change, and while a chunked computation adds rows. ctx:
 *     t, frontier, steps, limit   the cursor, the frontier, and the run's two lengths
 *     rows, ghostRows      the record and the previous run's record (null without a ghost);
 *                          read them without copying. Rows beyond t are drawn ahead in the
 *                          trail tone (DS §4.9).
 *     changes              [{t, name, value}], the live changes, each marked on the step axis
 *     kind                 the kind of the step that produced state t (action form)
 *     playing, transient   hold labels in place when either is true
 *     preview              the step a hover on the record shows, or undefined
 *     pending, pendingRows a restart is being computed in chunks; state and rows are still the
 *                          previous run's, and pendingRows the new run's rows so far
 *     counter              the counter's text; run the record panel's note from it
 *     run
 *
 * E. TIME
 *   The loop (DS §7.4): each animation frame adds dt (at most 100 ms) × speed to the playback
 *   clock, maps the clock to a step through the pace, and advances the cursor whole step by
 *   whole step toward it, testing until after each step and computing for at most 8 ms, after
 *   which it sets the clock back to the cursor's time. It draws once. A paused figure requests
 *   no frames.
 *   Paces, with S = steps, D = duration and E = easeSteps:
 *     linear  time(t) = D t / S
 *     log     time(t) = D ln(1 + t) / ln(1 + S), so each decade takes equal time
 *     ease    time(t) = 500 t for t <= E, then a constant rate over the rest of D
 *   Past S each pace keeps the rate it had at S. TP.run.pace(kind, S, D, E) returns
 *   {step(clock), time(t)} for tests.
 *   The record and keyframes (DS §7.5): stateAt(t) copies the keyframe at or before t and
 *   advances the copy with the parameters in force at each step and each step's own generator,
 *   so any step is recomputed exactly. Behind the frontier, play and scrubbing recompute and add
 *   nothing; at the frontier, play extends the record with the current parameters.
 *   Chunked computation: a restart, a scrub past the frontier, the ahead record or a Reset that
 *   needs more than 10 ms continues in chunks of at most 8 ms per animation frame. The view
 *   keeps the previous state until the state at the cursor exists; a newer restart cancels the
 *   pending one; any other operation first completes it. finish(), reset({now}) and restore
 *   compute at once whatever the budget, as printing requires (DS §6.7).
 *
 * F. CHANGES, ACTIONS, AUTOPLAY AND THE STRIP (DS §7.6 to §7.8)
 *   live      the value applies from the cursor's step on; the later record and changes are
 *             discarded and the change is kept with its step. A playing run continues; a paused
 *             one plays `span` steps once the change settles (computed at once under reduced
 *             motion); with `ahead` the record is recomputed ahead and the cursor stays.
 *   restart   a new run from step 0 with the parameters in force at the cursor and the new
 *             values; the cursor stays (clamped to limit), or moves to the new run's end for a
 *             showEnd parameter. In the action form each step of the new run takes the kind
 *             recorded for it in the run it replaces, so a reader's reruns and repeats survive
 *             a preset or "Draw again"; a step beyond that record takes the kind Play performs.
 *             The previous record becomes the ghost when every changed parameter declares
 *             ghost: true, and the ghost clears otherwise. During a drag the
 *             ghost is the run at the drag's start, and one settle follows the release.
 *   redraw    draws again from the same run and computes nothing.
 *   Autoplay: once, from step 0, when at least 60% of fig.panels (of the viewport's height, for
 *   panels taller than the viewport) is in view, the figure is untouched, motion is allowed, the
 *   page is visible and the URL did not restore the figure. It pauses at the end of autoplay.
 *   TP.run.pageQueue lets one figure play by itself at a time; a waiting figure starts when the
 *   first stops, if it is still eligible. Below 20% in view, or on a hidden page, any run pauses;
 *   an untouched one resumes at 60%. Any strip control, handle, button or change touches the
 *   figure. Under reduced motion the first computation shows the end state, restart parameters
 *   compute at once, a replaying Reset shows the end at once, and a switch to reduced motion
 *   during autoplay finishes the run.
 *   The strip: div.run-strip[role=group][aria-label=Playback] in fig.dock holds
 *   button.run-btn.run-play (Play, Pause or Replay by aria-label, title and icon),
 *   button.run-btn.run-back, button.run-btn.run-fwd, input.run-scrub (0 .. limit, or the
 *   frontier for an open run; log-spaced under 'log'; aria-valuetext the counter), div.seg.run-speed
 *   (0.5×, 1×, 2×, shown from 640 px) and button.run-speed-cycle ("Speed, 1×", below 640 px).
 *   The scrubber handles its own keys: arrows by stride, Page Up and Page Down by a tenth of the
 *   range (of the log range under 'log'), Home and End.
 *
 * G. TESTS
 *   TP.run(fig, spec, env) takes an optional env: {now(), raf(fn), caf(id), reduced(),
 *   hidden(), document}. With document null the runtime builds no strip and observes nothing;
 *   run._view(fraction) and run._pageVisible(bool) then stand in for the observers. Hooks:
 *   run.stats() {generators (built), frames, draws, maxFrameMs, frameMs (the last 600
 *   playback and chunk frames: computation and draw), settleMs (the settle that ends a run,
 *   timed apart from its frame: the final draw with labels placed from scratch and TP.fig's
 *   table and URL), drawMs (the last 600 calls of fig.draw, the figure's share of a frame),
 *   chunkMs (the computation of each chunk frame, without its draw)},
 *   run.info() {pace, unit, stride, keyframe, recordPanel, ahead, reset, actions, easeSteps,
 *   duration, compute, until, open, spanGiven},
 *   run._keyframes() (the keyframe array), run.verify(to) (compute's rows against advance's,
 *   {equal, t, a, c}). TP.run.all lists every run on the page.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};
  var hasOwn = Object.prototype.hasOwnProperty;
  var MAX_ROWS = 50000;
  var MAX_OPEN = 1e7;          // the furthest an open run is computed to reach its until
  var FRAME_BUDGET = 8;        // ms of computation per animation frame (DS §7.4)
  var INPUT_BUDGET = 10;       // ms an input may compute before chunking (DS §1)

  function isFn(f) { return typeof f === 'function'; }
  function finite(v) { return typeof v === 'number' && isFinite(v); }
  function copy(o) { var out = {}; if (o) for (var k in o) if (hasOwn.call(o, k)) out[k] = o[k]; return out; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function fmtInt(v) {
    if (TP.fmt && isFn(TP.fmt.int)) return TP.fmt.int(v);
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function defaultClone(s) {
    if (typeof global.structuredClone === 'function') return global.structuredClone(s);
    return JSON.parse(JSON.stringify(s));
  }

  /* ======================================================================================
     The paces (DS §7.4). step(clock) is the last whole step reached at playback time clock
     (ms at 1×), and time(t) its inverse. Past S each keeps its rate at S.
     ====================================================================================== */
  var EPS = 1e-7;
  function makePace(kind, S, D, E) {
    S = Math.max(1, S);
    D = Math.max(1, D);
    if (kind === 'log') {
      var L = Math.log(1 + S), rate = (1 + S) * L / D;   // steps per ms at S
      return {
        kind: kind,
        time: function (t) { return t <= S ? D * Math.log(1 + t) / L : D + (t - S) / rate; },
        step: function (c) {
          if (c <= 0) return 0;
          if (c <= D) return Math.min(S, Math.floor(Math.exp(c * L / D) - 1 + EPS));
          return S + Math.floor((c - D) * rate + EPS);
        }
      };
    }
    if (kind === 'ease') {
      E = Math.max(0, Math.min(E == null ? 3 : E, S));
      var head = 500 * E, rest = D - head;
      var r = S > E && rest > 0 ? (S - E) / rest : 1 / 500;   // steps per ms after the first E
      return {
        kind: kind,
        time: function (t) { return t <= E ? 500 * t : head + (t - E) / r; },
        step: function (c) {
          if (c <= 0) return 0;
          if (c <= head) return Math.floor(c / 500 + EPS);
          return E + Math.floor((c - head) * r + EPS);
        }
      };
    }
    var lr = S / D;
    return {
      kind: 'linear',
      time: function (t) { return t / lr; },
      step: function (c) { return c <= 0 ? 0 : Math.floor(c * lr + EPS); }
    };
  }

  /* ======================================================================================
     The page queue (DS §7.7 item 3): one running figure plays by itself at a time.
     ====================================================================================== */
  var pageQueue = {
    current: null,
    waiting: [],
    request: function (r) {
      if (!this.current || this.current === r) { this.current = r; r._autoStart(); return true; }
      if (this.waiting.indexOf(r) < 0) this.waiting.push(r);
      return false;
    },
    release: function (r) {
      var i = this.waiting.indexOf(r);
      if (i >= 0) this.waiting.splice(i, 1);
      if (this.current !== r) return;
      this.current = null;
      while (this.waiting.length) {
        var n = this.waiting.shift();
        if (n._eligible()) { this.current = n; n._autoStart(); return; }
      }
    }
  };

  /* A generator for one seed, built on its first draw (DS §7.5). fork builds none. */
  function lazyRng(seed, stats) {
    var g = null;
    function get() {
      if (!g) { g = TP.prng.create(seed); stats.generators += 1; }
      return g;
    }
    return {
      seed: seed,
      uniform: function () { return get().uniform(); },
      normal: function () { return get().normal(); },
      studentT: function (df) { return get().studentT(df); },
      int: function (n) { return get().int(n); },
      shuffle: function (a) { return get().shuffle(a); },
      fork: function (label) { return lazyRng(TP.prng.deriveSeed(seed, label), stats); }
    };
  }

  var ICONS = {
    play: 'M4 2.5v11l9-5.5z',
    pause: 'M3.5 2.5h3.2v11H3.5zM9.3 2.5h3.2v11H9.3z',
    replay: 'M8 2.2a5.8 5.8 0 1 1-5.6 7.3l1.9-.5A3.8 3.8 0 1 0 8 4.2v2.3L4.4 3.2 8 0z',
    back: 'M2.5 2.5h2v11h-2zM13.5 2.5v11L5.5 8z',
    fwd: 'M11.5 2.5h2v11h-2zM2.5 2.5v11l8-5.5z'
  };
  var SPEEDS = [0.5, 1, 2];
  function speedText(x) { return (x === 0.5 ? '0.5' : String(x)) + '×'; }
  function capital(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  var ALL = [];

  /* ======================================================================================
     TP.run
     ====================================================================================== */
  TP.run = function (fig, spec, env) {
    var hasEnv = env != null;
    spec = spec || {};
    env = env || {};
    var doc = hasOwn.call(env, 'document') ? env.document : global.document;
    var E = {
      now: env.now || function () { return global.performance && global.performance.now ? global.performance.now() : Date.now(); },
      raf: env.raf || function (fn) {
        return global.requestAnimationFrame ? global.requestAnimationFrame(fn) : global.setTimeout(function () { fn(E.now()); }, 16);
      },
      caf: env.caf || function (id) {
        if (global.cancelAnimationFrame) global.cancelAnimationFrame(id); else global.clearTimeout(id);
      },
      reduced: env.reduced || function () { return !!(TP.motion && isFn(TP.motion.reduced) && TP.motion.reduced()); },
      hidden: env.hidden || function () { return !!(doc && doc.visibilityState === 'hidden'); }
    };
    var id = fig && fig.id || 'run';
    function report(msg) { if (global.console) global.console.error('TP.run: ' + id + ' ' + msg); }
    if (!isFn(spec.init) || !isFn(spec.advance) || !isFn(spec.record)) report('needs init, advance and record');
    if (spec.steps == null) report('needs steps');

    /* ---------- the parameters (from the figure contract) ---------- */
    var P = (fig && fig.params) || {};
    var ORDER = (fig && fig.order) || Object.keys(P);
    var DEFAULTS = {};
    ORDER.forEach(function (n) { if (P[n]) DEFAULTS[n] = P[n]['default']; });
    var initial = fig && isFn(fig.initial) ? fig.initial() : { values: copy(DEFAULTS), t: null, restored: false };
    var startValues = copy(initial.values || DEFAULTS);
    var restored = !!initial.restored, initialT = initial.t;
    var ACTIONS = Array.isArray(spec.actions) && spec.actions.length ? spec.actions.slice() : null;
    var KF = Math.max(1, Math.floor(spec.keyframe || 64));
    var STRIDE = Math.max(1, Math.floor(spec.stride || 1));
    var UNIT = spec.unit || 'step';
    var PACE = spec.pace || 'linear';
    var clone = isFn(spec.clone) ? spec.clone : defaultClone;
    var COMPUTE = isFn(spec.compute) ? spec.compute : null;
    var stats = { generators: 0, frames: 0, draws: 0, maxFrameMs: 0, frameMs: [], settleMs: [], drawMs: [], chunkMs: [] };

    function val(f, params, dflt) {
      var v = isFn(f) ? f(params) : f;
      return v == null ? dflt : v;
    }
    function classOf(name) { return P[name] ? (P[name].change || 'restart') : null; }

    /* ---------- the record ---------- */
    var R = null;            // the record of the run shown
    var cursor = 0, cur = null, inited = false;
    var ghostRows = null, dragGhost = false;
    var playKind = ACTIONS ? ACTIONS[0] : undefined;
    var speedX = 1;
    var touched = false, autoDone = false, autoplaying = false, autoPaused = false;
    var playing = false, stopAt = 0, clock = 0, last = 0, raf = 0, pace = null, playReason = '';
    var job = null, jobRaf = 0, resumeAfterJob = false;
    var transientDirty = false, spanPending = false, pendingSettleReason = null;
    var view = 0, pageVisible = true;
    var listeners = { settle: [], end: [], restart: [], play: [], pause: [] }, ticks = [];
    var warnedRows = false;

    function seedOf(base) { return base && base.seed != null ? base.seed >>> 0 : 0; }
    function newRecord(base) {
      return {
        base: copy(base), seed: seedOf(base), changes: [], kinds: ACTIONS ? [null] : null, plan: null,
        rows: [], tail: false, kf: [], frontier: 0, tip: null, untilT: null,
        every: Math.max(1, Math.floor(val(spec.every, base, 1))), chunk: 256
      };
    }
    function paramsAt(Rr, t) {
      if (!Rr.changes.length) return Rr.base;
      var p = copy(Rr.base);
      for (var i = 0; i < Rr.changes.length; i++) {
        var c = Rr.changes[i];
        if (c.t <= t) p[c.name] = c.value;
      }
      return p;
    }
    function latest() { return R ? paramsAt(R, Infinity) : startValues; }
    function stepsOf(params) { return Math.max(0, Math.round(val(spec.steps, params, 0))); }
    function limitOf(params) {
      var L = spec.limit == null ? stepsOf(params) : val(spec.limit, params, stepsOf(params));
      return L === Infinity ? Infinity : Math.max(stepsOf(params), Math.round(L));
    }
    function stepsNow() { return Math.min(stepsOf(latest()), limitNow()); }
    function limitNow() { return limitOf(latest()); }
    function durationNow() { return Math.min(8000, Math.max(1, val(spec.duration, latest(), 6000))); }
    function spanNow() { return Math.max(1, Math.ceil(val(spec.span, latest(), stepsNow() / 4))); }
    function rngAt(seed, t) { return lazyRng(TP.prng.deriveSeed(seed, t), stats); }

    function addRow(Rr, t, row) {
      if (row == null || typeof row !== 'object') row = { value: row };
      if (row.t == null) row.t = t;
      if (ACTIONS) row.kind = Rr.kinds[t];
      if (Rr.tail) { Rr.rows.pop(); Rr.tail = false; }
      Rr.rows.push(row);
      if (t % Rr.every !== 0) Rr.tail = true;
      if (Rr.rows.length > MAX_ROWS && !warnedRows) {
        warnedRows = true;
        report('keeps more than ' + MAX_ROWS + ' rows; raise `every` (DS §7.5)');
      }
    }
    function testUntil(Rr, t) {
      if (Rr.untilT == null && isFn(spec.until) && spec.until(Rr.tip, t, paramsAt(Rr, t))) Rr.untilT = t;
    }
    function initRecord(Rr) {
      Rr.tip = spec.init(Rr.base, lazyRng(TP.prng.deriveSeed(Rr.seed, 'init'), stats));
      Rr.frontier = 0;
      Rr.kf[0] = clone(Rr.tip);
      addRow(Rr, 0, spec.record(Rr.tip, 0, ACTIONS ? null : undefined));
      return Rr;
    }
    /* one step at the frontier through advance */
    function extendOne(Rr, kind) {
      var F = Rr.frontier;
      /* a restart's new run takes the kind recorded for each step of the run it replaces (plan) */
      var k = ACTIONS ? (kind || (Rr.plan && Rr.plan[F + 1]) || playKind) : undefined;
      var s = spec.advance(Rr.tip, paramsAt(Rr, F), rngAt(Rr.seed, F), F, k);
      if (s != null) Rr.tip = s;
      Rr.frontier = F + 1;
      if (ACTIONS) Rr.kinds[F + 1] = k;
      addRow(Rr, F + 1, spec.record(Rr.tip, F + 1, k));
      if ((F + 1) % KF === 0) Rr.kf[(F + 1) / KF] = clone(Rr.tip);
      testUntil(Rr, F + 1);
    }
    /* a stretch at the frontier through compute */
    function extendCompute(Rr, to) {
      var from = Rr.frontier;
      if (to <= from) return;
      var res = spec.compute(Rr.base, Rr.seed, from, to) || {};
      var rows = res.rows || [];
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i], t = row && row.t != null ? row.t : from + i;
        if (t <= from || t > to) continue;
        if (t % Rr.every === 0 || t === to) addRow(Rr, t, row);
      }
      var kfs = res.keyframes || {};
      Object.keys(kfs).forEach(function (k) {
        var t = +k;
        if (t > from && t <= to && t % KF === 0) Rr.kf[t / KF] = kfs[k];
      });
      Rr.tip = res.state != null ? clone(res.state) : Rr.tip;
      Rr.frontier = to;
      if (to % KF === 0 && !Rr.kf[to / KF]) Rr.kf[to / KF] = clone(Rr.tip);
      if (Rr.untilT == null) {
        if (finite(res.until) && res.until > from && res.until <= to) Rr.untilT = res.until;
        else if (res.until == null) testUntil(Rr, to);
      }
    }
    /* extend Rr toward target: one step through advance, or a stretch through compute whose
       length adapts so that a call takes about a third of the frame budget */
    function extendBy(Rr, target, kind) {
      if (COMPUTE) {
        var t0 = E.now(), to = Math.min(target, Rr.frontier + Rr.chunk);
        extendCompute(Rr, to);
        var dt = E.now() - t0;
        if (dt < FRAME_BUDGET / 3) Rr.chunk = Math.min(1 << 20, Rr.chunk * 2);
        else if (dt > FRAME_BUDGET) Rr.chunk = Math.max(16, Rr.chunk >> 1);
        return;
      }
      extendOne(Rr, kind);
    }
    function stateAt(t, Rr) {
      Rr = Rr || R;
      if (!Rr || t < 0 || t > Rr.frontier) return null;
      if (t === Rr.frontier) return clone(Rr.tip);
      var k = Math.floor(t / KF);
      while (k > 0 && !Rr.kf[k]) k--;
      var s = clone(Rr.kf[k]);
      for (var j = k * KF; j < t; j++) {
        var n = spec.advance(s, paramsAt(Rr, j), rngAt(Rr.seed, j), j, ACTIONS ? Rr.kinds[j + 1] : undefined);
        if (n != null) s = n;
      }
      return s;
    }
    /* the invariant: cur === R.tip only while cursor === R.frontier */
    function detachTip() { if (R && cur === R.tip) R.tip = clone(R.tip); }
    function moveTo(t) {
      if (t === cursor && cur) return;
      if (t === R.frontier) { cur = R.tip; cursor = t; return; }
      if (t > cursor && t <= R.frontier && cur && t - cursor <= KF) {
        while (cursor < t) {
          var n = spec.advance(cur, paramsAt(R, cursor), rngAt(R.seed, cursor), cursor, ACTIONS ? R.kinds[cursor + 1] : undefined);
          if (n != null) cur = n;
          cursor += 1;
        }
        return;
      }
      cur = stateAt(t);
      cursor = t;
    }
    /* Move the cursor toward target (> cursor): behind the frontier it jumps to the nearer of
       target, the frontier and the step at which until first held; at the frontier it extends the
       record by one step through advance, or by a stretch through compute. */
    function advanceCursor(kind, target) {
      if (target == null) target = cursor + 1;
      if (cursor >= R.frontier && job && job.R === R) flushJob();
      var dest;
      if (cursor < R.frontier) {
        dest = Math.min(target, R.frontier);
        if (R.untilT != null && R.untilT > cursor && R.untilT < dest) dest = R.untilT;
        moveTo(dest);
        return;
      }
      if (COMPUTE) {
        extendBy(R, target);
        dest = Math.min(target, R.frontier);
        if (R.untilT != null && R.untilT > cursor && R.untilT < dest) dest = R.untilT;
        moveTo(dest);
        return;
      }
      if (cur !== R.tip) R.tip = cur;
      extendOne(R, kind);
      cur = R.tip;
      cursor = R.frontier;
    }
    /* discard the record after the cursor (a live change or an action) */
    function truncate() {
      if (cursor >= R.frontier) { R.tip = cur; return; }
      R.frontier = cursor;
      R.tip = cur;
      R.kf.length = Math.floor(cursor / KF) + 1;
      while (R.rows.length && R.rows[R.rows.length - 1].t > cursor) R.rows.pop();
      R.tail = false;
      if (ACTIONS) R.kinds.length = cursor + 1;
      if (!R.rows.length || R.rows[R.rows.length - 1].t !== cursor) {
        addRow(R, cursor, spec.record(cur, cursor, ACTIONS ? R.kinds[cursor] : undefined));
      } else if (cursor % R.every !== 0) R.tail = true;
      R.changes = R.changes.filter(function (c) { return c.t <= cursor; });
      if (R.untilT != null && R.untilT > cursor) R.untilT = null;
      R.chunk = 256;
    }

    /* A job that stops at until keeps no record beyond it: compute works in stretches and may
       overshoot, and the record's extent must not depend on how it was reached. */
    function trimTo(Rr, t) {
      if (Rr.frontier <= t || (Rr === R && cursor > t)) return;
      var shown = Rr === R && cursor <= t ? cur : null;
      var s = stateAt(t, Rr);
      Rr.frontier = t;
      Rr.tip = shown && cursor === t ? shown : s;
      Rr.kf.length = Math.floor(t / KF) + 1;
      while (Rr.rows.length && Rr.rows[Rr.rows.length - 1].t > t) Rr.rows.pop();
      Rr.tail = false;
      if (ACTIONS) Rr.kinds.length = t + 1;
      if (!Rr.rows.length || Rr.rows[Rr.rows.length - 1].t !== t) addRow(Rr, t, spec.record(Rr.tip, t, ACTIONS ? Rr.kinds[t] : undefined));
      else if (t % Rr.every !== 0) Rr.tail = true;
      Rr.chunk = 256;
    }

    /* ---------- drawing ---------- */
    function countKinds(upTo) {
      var n = {};
      ACTIONS.forEach(function (k) { n[k] = 0; });
      for (var t = 1; t <= upTo; t++) { var k = R ? R.kinds[t] : null; if (k != null) n[k] = (n[k] || 0) + 1; }
      return n;
    }
    function counterText() {
      if (isFn(spec.counter)) return String(spec.counter(cursor, R ? R.frontier : 0, api));
      if (ACTIONS) {
        var n = countKinds(cursor);
        return ACTIONS.map(function (k) { return n[k] + ' ' + k + (n[k] === 1 ? '' : 's'); }).join(', ');
      }
      var L = limitNow();
      return UNIT + ' ' + fmtInt(cursor) + (L === Infinity ? '' : ' of ' + fmtInt(L));
    }
    var recordPanelEl = null;
    function writeCounter(text) {
      if (!spec.recordPanel || !doc || !fig || !fig.el) return;
      var key = String(spec.recordPanel).replace(/[()]/g, '');
      if (!recordPanelEl || !recordPanelEl.isConnected) recordPanelEl = fig.el.querySelector('.panel[data-panel="' + key + '"]');
      var p = recordPanelEl && TP.chart && TP.chart.panelOf ? TP.chart.panelOf(recordPanelEl) : null;
      if (p && isFn(p.setNote)) p.setNote(text);
    }
    var drawing = false, previewT = null;
    function draw(extra) {
      if (!inited) return;
      if (drawing) return;
      drawing = true;
      try { drawNow(extra); } finally { drawing = false; }
    }
    function drawNow(extra) {
      extra = extra || {};
      var ctx = {
        t: cursor, frontier: R.frontier, steps: stepsNow(), limit: limitNow(),
        rows: R.rows, ghostRows: ghostRows, changes: R.changes,
        kind: ACTIONS ? R.kinds[cursor] : undefined,
        playing: !!(extra.playing), transient: !!extra.transient, run: api,
        counter: counterText()
      };
      if (extra.preview != null) ctx.preview = extra.preview;
      else previewT = null;
      if (job && job.R !== R) { ctx.pending = true; ctx.pendingRows = job.R.rows; }
      var state = extra.state || cur;
      stats.draws += 1;
      var d0 = E.now();
      if (fig && isFn(fig.draw)) fig.draw(state, ctx);
      stats.drawMs.push(E.now() - d0);
      if (stats.drawMs.length > 600) stats.drawMs.shift();
      writeCounter(ctx.counter);
      ticks.slice().forEach(function (fn) {
        try { fn(cursor, state, api); } catch (e) { report('threw in an onTick listener: ' + (e && e.stack || e)); }
      });
      updateStrip(ctx.counter);
    }
    function emit(name, arg) {
      (listeners[name] || []).slice().forEach(function (fn) {
        try { fn(arg); } catch (e) { report('threw in a ' + name + ' listener: ' + (e && e.stack || e)); }
      });
    }
    function settle(reason, quiet) {
      transientDirty = false;
      dragGhost = false;
      if (!inited) return;
      draw({});
      if (quiet) {
        /* The settle at load builds the table and writes nothing a reader hears: the live twin
           is put back as it was (see the report's note on site.js). */
        var live = doc && fig && fig.el ? fig.el.querySelector('p.fig-readout + p.sr-only[aria-live]') : null;
        var text = live ? live.textContent : null;
        emit('settle', { reason: reason, quiet: true });
        if (live && live.textContent !== text) live.textContent = text;
        return;
      }
      emit('settle', { reason: reason, quiet: false });
    }

    /* ---------- chunked computation (DS §7.5) ---------- */
    /* job: {R, target, stopAtUntil, swapAt, onSwap, onDone, kind} */
    /* Extend the job's record for at most budget ms (null: to the end). When a restart's new
       run reaches the cursor it replaces the run shown: at once within the input event, and
       otherwise at the start of the next chunk frame, so that no frame holds both a chunk of
       computation and the swap's draw and settle. */
    function runJob(budget, sync) {
      var t0 = E.now(), j = job;
      if (j.swapReady) { doSwap(j); if (job !== j) return true; return budget == null ? runJob(null, sync) : false; }
      while (j.R.frontier < j.target) {
        if (j.stopAtUntil && j.R.untilT != null) { trimTo(j.R, j.R.untilT); break; }
        if (j.R === R) detachTip();
        extendBy(j.R, j.target, j.kind);
        if (j.R !== R && j.swapAt != null && j.R.frontier >= j.swapAt && j.onSwap) {
          if (sync || budget == null) { doSwap(j); if (job !== j) return true; }
          else { j.swapReady = true; return false; }
        }
        if (budget != null && E.now() - t0 > budget) return false;
      }
      if (j.stopAtUntil && j.R.untilT != null) trimTo(j.R, j.R.untilT);
      return true;
    }
    function doSwap(j) {
      j.swapReady = false;
      var sw = j.onSwap;
      j.onSwap = null;
      if (sw) sw();
    }
    function endJob() {
      var j = job;
      job = null;
      if (jobRaf) { E.caf(jobRaf); jobRaf = 0; }
      if (j && j.onSwap) { var sw = j.onSwap; j.onSwap = null; sw(); }
      if (j && j.onDone) j.onDone();
    }
    /* One chunk per animation frame. The computation takes at most 8 ms less the figure's
       recent draw time (and at least 2 ms), so that the frame with its draw stays near the
       10-ms budget. */
    function recentDraw() {
      var d = stats.drawMs, n = Math.min(5, d.length), m = 0;
      for (var i = d.length - n; i < d.length; i++) m = Math.max(m, d[i]);
      return m;
    }
    function jobFrame() {
      jobRaf = 0;
      if (!job) return;
      var t0 = E.now();
      if (job.swapReady) {
        /* this frame replaces the run shown, and computes nothing more */
        var j = job;
        doSwap(j);
        if (job === j) { if (j.R.frontier >= j.target || (j.stopAtUntil && j.R.untilT != null)) endJob(); else jobRaf = E.raf(jobFrame); }
        noteFrame(E.now() - t0);
        return;
      }
      var done = runJob(Math.max(2, FRAME_BUDGET - recentDraw()));
      stats.chunkMs.push(E.now() - t0);
      if (stats.chunkMs.length > 600) stats.chunkMs.shift();
      if (done) endJob();
      else { draw({}); jobRaf = E.raf(jobFrame); }
      noteFrame(E.now() - t0);
    }
    function startJob(j, budget) {
      if (job) { job = null; if (jobRaf) { E.caf(jobRaf); jobRaf = 0; } }
      job = j;
      var done = runJob(budget, true);
      if (job !== j) return;
      if (done) endJob();
      else if (!jobRaf) jobRaf = E.raf(jobFrame);
    }
    function flushJob() { if (!job) return; runJob(null); endJob(); }
    /* the step at which the run's autoplay stops: steps, or until when it holds before */
    function endStep() {
      var S = stepsNow();
      return R && R.untilT != null && R.untilT < S ? R.untilT : S;
    }
    /* compute R at once until the end of autoplay exists (and to limit with ahead) */
    function computeEndNow(Rr) {
      Rr = Rr || R;
      var S = Math.min(stepsOf(paramsAt(Rr, Infinity)), limitOf(paramsAt(Rr, Infinity)));
      while (Rr.frontier < S && !(Rr.untilT != null)) {
        if (Rr === R) detachTip();
        extendBy(Rr, S);
      }
      if (Rr.untilT != null && Rr.untilT < S && !spec.ahead && (Rr !== R || cursor <= Rr.untilT)) trimTo(Rr, Rr.untilT);
      if (spec.ahead) {
        var L = limitOf(paramsAt(Rr, Infinity));
        while (Rr.frontier < L && L !== Infinity) { if (Rr === R) detachTip(); extendBy(Rr, L); }
      }
      return Rr.untilT != null && Rr.untilT < S ? Rr.untilT : S;
    }
    function aheadJob(budget) {
      if (!spec.ahead) return;
      var L = limitNow();
      if (L === Infinity || R.frontier >= L) return;
      startJob({ R: R, target: L, onDone: function () { draw({ playing: playing }); maybeAutoplay(); } }, budget);
    }

    /* ---------- playing ---------- */
    function noteFrame(ms) {
      stats.frames += 1;
      if (ms > stats.maxFrameMs) stats.maxFrameMs = ms;
      stats.frameMs.push(ms);
      if (stats.frameMs.length > 600) stats.frameMs.shift();
    }
    function atEnd() {
      if (!R) return false;
      if (R.untilT != null && cursor >= R.untilT) return true;
      return cursor >= limitNow();
    }
    function untilStop() { return R.untilT != null && cursor >= R.untilT && playFrom < R.untilT; }
    var playFrom = 0;
    function startLoop(stop, auto, reason) {
      if (playing) return;
      pace = makePace(PACE, Math.max(1, stepsNow()), durationNow(), spec.easeSteps == null ? 3 : spec.easeSteps);
      playing = true;
      autoplaying = !!auto;
      autoPaused = false;
      playReason = reason || '';
      stopAt = stop;
      playFrom = cursor;
      clock = pace.time(cursor);
      last = E.now();
      raf = E.raf(frame);
      emit('play');
      updateStrip();
    }
    function frame(now) {
      raf = 0;
      if (!playing) return;
      var tStart = E.now();
      if (!finite(now)) now = tStart;
      var dt = Math.min(Math.max(0, now - last), 100);
      last = now;
      clock += dt * speedX;
      var target = Math.min(pace.step(clock), stopAt);
      var moved = false;
      while (cursor < target) {
        if (untilStop()) break;
        advanceCursor(playKind, target);
        moved = true;
        if (untilStop()) break;
        if (E.now() - tStart > FRAME_BUDGET) { clock = pace.time(cursor); break; }
      }
      if (moved) draw({ playing: true });
      noteFrame(E.now() - tStart);
      if (cursor >= stopAt || untilStop()) {
        var tS = E.now();
        stopLoop('end');
        stats.settleMs.push(E.now() - tS);
        if (stats.settleMs.length > 50) stats.settleMs.shift();
      } else raf = E.raf(frame);
    }
    /* stop playing. why: 'end' (reached the stop), 'pause', 'hidden', 'view', 'job' */
    function stopLoop(why, noSettle) {
      if (!playing) return;
      var wasAuto = autoplaying;
      playing = false;
      if (raf) { E.caf(raf); raf = 0; }
      if (why === 'end' && wasAuto && cursor >= Math.min(stepsNow(), endStep())) autoDone = true;
      if (wasAuto && (why === 'view' || why === 'hidden') && !touched) autoPaused = true;
      autoplaying = false;
      emit('pause');
      if (wasAuto) pageQueue.release(api);
      if (why === 'end') emit('end');
      if (!noSettle) settle(why === 'end' ? (playReason === 'span' ? 'span' : 'end') : 'pause');
      else updateStrip();
    }
    function touch() {
      touched = true;
      autoplaying = false;
      pageQueue.release(api);
    }
    function ensureInit() { if (!inited) initRun(); }

    /* ---------- the public methods ---------- */
    function start(from) {
      touch();
      ensureInit();
      flushJob();
      if (playing) {
        if (from == null && !autoplaying) return;
        stopLoop('pause', true);
      }
      var was = cursor;
      if (from != null) moveTo(clamp(Math.round(from), 0, R.frontier));
      else if (atEnd()) moveTo(0);
      startLoop(limitNow(), false, 'reader');
      if (cursor !== was) draw({ playing: true });
    }
    function pause() {
      touch();
      if (playing) stopLoop('pause');
      else settle('pause');
    }
    function maxReach() { var L = limitNow(); return L === Infinity ? Infinity : L; }
    function goTo(t, kind, then) {
      if (t <= R.frontier) { moveTo(t); then(); return; }
      startJob({
        R: R, target: t, kind: kind,
        onDone: function () { moveTo(Math.min(t, R.frontier)); then(); }
      }, INPUT_BUDGET);
      if (job) draw({});
    }
    function step(k) {
      touch();
      ensureInit();
      flushJob();
      if (playing) stopLoop('pause', true);
      var t = clamp(cursor + (k < 0 ? -STRIDE : STRIDE), 0, maxReach());
      goTo(t, playKind, function () { settle('step'); });
    }
    function act(name) {
      touch();
      ensureInit();
      flushJob();
      if (!ACTIONS || ACTIONS.indexOf(name) < 0) { report('has no action "' + name + '"'); return; }
      if (playing) stopLoop('pause', true);
      if (cursor >= limitNow()) return;
      playKind = name;
      truncate();
      if (cur !== R.tip) R.tip = cur;
      extendOne(R, name);
      cur = R.tip;
      cursor = R.frontier;
      aheadJob(INPUT_BUDGET);
      settle('act');
    }
    function scrub(t, opts) {
      opts = opts || {};
      ensureInit();
      if (!opts.quiet) touch();
      flushJob();
      if (playing) stopLoop('pause', true);
      var reach = limitNow() === Infinity ? R.frontier : limitNow();
      t = clamp(Math.round(+t || 0), 0, reach);
      goTo(t, playKind, function () {
        if (opts.transient) { transientDirty = true; pendingSettleReason = 'scrub'; draw({ transient: true }); }
        else settle('scrub');
      });
    }
    function press(t, phase) {
      if (phase === 'end') { settle('scrub'); return; }
      scrub(t, { transient: true });
    }
    /* A hover on the record while paused. Calls made during a draw (a reader refreshing its
       reading as the panel redraws) and repeats of the step shown are ignored. */
    function preview(t) {
      if (!inited || playing || job || drawing) return;
      if (t != null) t = clamp(Math.round(t), 0, R.frontier);
      if (t === previewT) return;
      previewT = t;
      if (t == null || t === cursor) { draw({}); return; }
      draw({ state: stateAt(t), preview: t });
    }
    function setSpeed(x) {
      if (x == null) return speedX;
      touch();
      if (SPEEDS.indexOf(+x) < 0) { report('has no speed ' + x); return speedX; }
      if (playing) { clock = pace.time(cursor); }
      speedX = +x;
      updateStrip();
      return speedX;
    }
    function strongest(names) {
      var cls = 'redraw';
      names.forEach(function (n) {
        var c = classOf(n);
        if (c === 'restart') cls = 'restart';
        else if (c === 'live' && cls !== 'restart') cls = 'live';
      });
      return cls;
    }
    function setMany(values, opts) {
      opts = opts || {};
      var names = Object.keys(values || {}).filter(function (n) {
        if (!P[n]) { report('has no parameter "' + n + '"'); return false; }
        return true;
      });
      if (!names.length) return;
      touch();
      ensureInit();
      var cls = strongest(names);
      if (cls !== 'restart') flushJob();
      if (cls === 'redraw') {
        names.forEach(function (n) { R.base[n] = values[n]; });
        if (opts.transient) { transientDirty = true; pendingSettleReason = 'change'; draw({ transient: true, playing: playing }); }
        else if (playing) draw({ playing: true });
        else settle('change');
        return;
      }
      if (cls === 'live') { applyLive(names, values, opts); return; }
      applyRestart(names, values, opts);
    }
    function applyLive(names, values, opts) {
      truncate();
      names.forEach(function (n) {
        if (classOf(n) === 'redraw') { R.base[n] = values[n]; return; }
        R.changes = R.changes.filter(function (c) { return !(c.t === cursor && c.name === n); });
        R.changes.push({ t: cursor, name: n, value: values[n] });
      });
      if (spec.ahead) aheadJob(INPUT_BUDGET);
      if (playing) { draw({ playing: true }); return; }
      if (opts.transient) {
        transientDirty = true; spanPending = true; pendingSettleReason = 'change';
        draw({ transient: true });
        return;
      }
      settle('change');
      playSpan();
    }
    function playSpan() {
      spanPending = false;
      if (spec.ahead || playing) return;
      var stop = Math.min(cursor + spanNow(), limitNow());
      if (stop <= cursor) return;
      if (E.reduced()) {
        while (cursor < stop) advanceCursor(playKind, stop);
        settle('span');
        return;
      }
      startLoop(stop, false, 'span');
    }
    function applyRestart(names, values, opts) {
      var transient = !!opts.transient;
      var ghostAll = names.every(function (n) { return classOf(n) !== 'restart' || !!P[n].ghost; });
      var showEnd = names.some(function (n) { return classOf(n) === 'restart' && !!P[n].showEnd; });
      /* the ghost: the previous run, or during a drag the run at the drag's start */
      var prevRows = R.rows;
      if (!ghostAll) ghostRows = null;
      else if (!(transient && dragGhost)) ghostRows = prevRows;
      if (transient) dragGhost = true;
      var base = copy(paramsAt(R, cursor));
      names.forEach(function (n) { base[n] = values[n]; });
      var wasPlaying = playing || (job && resumeAfterJob);
      if (playing) stopLoop('pause', true);
      var R2 = initRecord(newRecord(base));
      if (ACTIONS) R2.plan = R.kinds.slice(0, R.frontier + 1);
      var L2 = limitOf(base);
      var keepAt = Math.min(cursor, L2 === Infinity ? cursor : L2);
      var target, swapAt;
      if (showEnd) { target = L2 === Infinity ? MAX_OPEN : L2; swapAt = null; }
      else { target = spec.ahead && L2 !== Infinity ? L2 : keepAt; swapAt = keepAt; }
      resumeAfterJob = !!wasPlaying && !showEnd;
      var swapped = false;
      var swappedFrontier = -1;
      function swap() {
        if (swapped) return;
        swapped = true;
        R = R2;
        var t = showEnd ? (R.untilT != null ? R.untilT : R.frontier) : Math.min(keepAt, R.frontier);
        cursor = -1;
        cur = null;
        moveTo(t);
        emit('restart');
        if (resumeAfterJob) {
          resumeAfterJob = false;
          startLoop(limitNow(), false, 'reader');
          return;
        }
        swappedFrontier = R.frontier;
        if (transient) { transientDirty = true; pendingSettleReason = 'change'; draw({ transient: true }); }
        else settle('change');
      }
      var reduced = E.reduced();
      startJob({
        R: R2, target: target, stopAtUntil: showEnd, swapAt: swapAt,
        onSwap: swap,
        onDone: function () { if (!swapped) swap(); else if (R.frontier !== swappedFrontier) draw({ playing: playing, transient: transient && transientDirty }); }
      }, reduced ? null : INPUT_BUDGET);
      if (job && job.R === R2) draw({ transient: transient });
    }
    function settlePublic() {
      if (spanPending) { settle('change'); playSpan(); return; }
      if (transientDirty) settle(pendingSettleReason || 'change');
    }
    function resetDefaults() {
      if (job) { job = null; if (jobRaf) { E.caf(jobRaf); jobRaf = 0; } }
      if (playing) stopLoop('pause', true);
      ghostRows = null;
      dragGhost = false;
      transientDirty = false;
      spanPending = false;
      playKind = ACTIONS ? ACTIONS[0] : undefined;
      R = initRecord(newRecord(DEFAULTS));
      cursor = 0;
      cur = R.tip;
    }
    function reset(opts) {
      opts = opts || {};
      if (!opts.now) touch();
      inited = true;
      resetDefaults();
      if (opts.now || spec.reset !== 'replay' || E.reduced()) {
        if (opts.now) {
          var end = computeEndNow(R);
          moveTo(end);
          settle('reset');
          return;
        }
        startJob({
          R: R, target: Math.min(stepsNow(), limitNow()), stopAtUntil: true,
          onDone: function () {
            if (spec.ahead) { var L = limitNow(); while (R.frontier < L && L !== Infinity) { detachTip(); extendBy(R, L); } }
            moveTo(endStep());
            settle('reset');
          }
        }, INPUT_BUDGET);
        if (job) draw({});
        return;
      }
      /* replay: from step 0 to steps */
      aheadJob(INPUT_BUDGET);
      settle('reset');
      startLoop(Math.min(stepsNow(), limitNow()), false, 'replay');
    }
    function finish() {
      ensureInit();
      flushJob();
      if (playing) stopLoop('pause', true);
      var end = computeEndNow(R);
      moveTo(end);
      autoDone = true;
      pageQueue.release(api);
      settle('finish');
    }
    function snapshot() {
      var base = copy(R ? R.base : startValues), seed = base.seed != null ? base.seed : null;
      delete base.seed;
      var acts = [];
      if (ACTIONS && R) for (var t = 1; t <= R.frontier; t++) if (R.kinds[t] !== ACTIONS[0]) acts.push({ t: t, kind: R.kinds[t] });
      return {
        params: base, seed: seed, t: cursor, frontier: R ? R.frontier : 0,
        changes: R ? R.changes.map(copy) : [], actions: acts,
        ghost: ghostRows, kind: playKind, speed: speedX, autoDone: autoDone, touched: touched
      };
    }
    function restore(snap) {
      if (!snap) return;
      if (job) { job = null; if (jobRaf) { E.caf(jobRaf); jobRaf = 0; } }
      if (playing) stopLoop('pause', true);
      inited = true;
      var base = copy(DEFAULTS);
      var sp = snap.params || {};
      for (var k in sp) if (hasOwn.call(sp, k)) base[k] = sp[k];
      if (snap.seed != null) base.seed = snap.seed;
      var Rr = initRecord(newRecord(base));
      var changes = (snap.changes || []).slice().sort(function (a, b) { return a.t - b.t; });
      var kinds = {};
      (snap.actions || []).forEach(function (a) { kinds[a.t] = a.kind; });
      var F = Math.max(0, snap.frontier || 0), ci = 0;
      R = Rr;
      cursor = 0; cur = R.tip;
      if (COMPUTE && !changes.length) {
        while (R.frontier < F) extendBy(R, F);
      } else {
        for (var t = 0; t < F; t++) {
          while (ci < changes.length && changes[ci].t <= t) { R.changes.push(copy(changes[ci])); ci++; }
          extendOne(R, ACTIONS ? (kinds[t + 1] || ACTIONS[0]) : undefined);
        }
        while (ci < changes.length && changes[ci].t <= F) { R.changes.push(copy(changes[ci])); ci++; }
      }
      cur = R.tip; cursor = R.frontier;
      moveTo(clamp(snap.t || 0, 0, R.frontier));
      ghostRows = snap.ghost || null;
      if (ACTIONS && snap.kind) playKind = snap.kind;
      if (snap.speed) speedX = snap.speed;
      if (snap.autoDone != null) autoDone = !!snap.autoDone;
      if (snap.touched != null) touched = !!snap.touched;
      settle('restore');
      maybeAutoplay();
    }
    function verify(to, tol) {
      if (!COMPUTE) return { equal: true, t: null };
      tol = tol == null ? 0 : tol;
      var base = copy(latest());
      var A = initRecord(newRecord(base)), Cc = initRecord(newRecord(base));
      while (A.frontier < to) extendOne(A);
      while (Cc.frontier < to) extendCompute(Cc, Math.min(to, Cc.frontier + 4096));
      function same(x, y) {
        var ka = Object.keys(x).filter(function (k) { return k !== 'kind'; });
        for (var i = 0; i < ka.length; i++) {
          var a = x[ka[i]], b = y[ka[i]];
          if (typeof a === 'number' && typeof b === 'number') {
            if (a === b || (isNaN(a) && isNaN(b))) continue;
            if (Math.abs(a - b) <= tol * Math.max(1, Math.abs(a), Math.abs(b))) continue;
            return false;
          }
          if (JSON.stringify(a) !== JSON.stringify(b)) return false;
        }
        return true;
      }
      if (A.rows.length !== Cc.rows.length) return { equal: false, t: null, a: A.rows.length, c: Cc.rows.length };
      for (var i = 0; i < A.rows.length; i++) {
        if (!same(A.rows[i], Cc.rows[i]) || !same(Cc.rows[i], A.rows[i])) return { equal: false, t: A.rows[i].t, a: A.rows[i], c: Cc.rows[i] };
      }
      return { equal: true, t: null, rows: A.rows.length };
    }

    /* ---------- the first computation ---------- */
    function initRun() {
      if (inited) return;
      inited = true;
      R = initRecord(newRecord(startValues));
      cursor = 0;
      cur = R.tip;
      var startAtEnd = !hasEnv && spec.startAtEnd !== false && !(global && global.__tpTestAutoplay);
      if (restored || E.reduced() || startAtEnd) {
        var end = computeEndNow(R);
        var t = restored && initialT != null ? clamp(Math.round(initialT), 0, maxReach()) : end;
        while (R.frontier < t) { detachTip(); extendBy(R, t); }
        moveTo(Math.min(t, R.frontier));
        if (!restored) autoDone = true;
        settle('load', true);
        return;
      }
      aheadJob(INPUT_BUDGET);
      draw({});
      maybeAutoplay();
    }

    /* ---------- autoplay and visibility (DS §7.7) ---------- */
    function eligible() {
      return inited && !touched && !restored && !autoDone && !playing && !job && !E.reduced()
        && cursor < endStep()
        && pageVisible && !E.hidden() && view >= 0.6;
    }
    function maybeAutoplay() { if (eligible()) pageQueue.request(api); }
    function autoStart() {
      if (!eligible()) { pageQueue.release(api); return; }
      startLoop(Math.min(stepsNow(), limitNow()), true, 'auto');
    }
    function onView(frac) {
      view = frac;
      if (!inited) return;
      if (frac < 0.2) {
        if (playing) stopLoop('view');
        else pageQueue.release(api);
      } else if (frac >= 0.6) maybeAutoplay();
    }
    function onPageVisible(vis) {
      pageVisible = vis;
      if (!vis) { if (playing) stopLoop('hidden'); }
      else maybeAutoplay();
    }

    /* ---------- the run strip (DS §7.8) ---------- */
    var strip = null, playBtn = null, backBtn = null, fwdBtn = null, scrubEl = null, segEl = null, cycleBtn = null;
    var playState = '';
    function svgIcon(d) {
      var ns = 'http://www.w3.org/2000/svg';
      var s = doc.createElementNS(ns, 'svg');
      s.setAttribute('viewBox', '0 0 16 16');
      s.setAttribute('aria-hidden', 'true');
      s.setAttribute('focusable', 'false');
      var p = doc.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      s.appendChild(p);
      return s;
    }
    function button(cls, label, icon) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = cls;
      b.setAttribute('aria-label', label);
      b.title = label;
      if (icon) b.appendChild(svgIcon(icon));
      return b;
    }
    function scrubMax() {
      if (!R) { var L0 = limitOf(startValues); return L0 === Infinity ? 0 : L0; }
      var L = limitNow();
      return L === Infinity ? R.frontier : L;
    }
    var LOGRES = 1000;
    function toPos(t, M) {
      if (PACE !== 'log') return t;
      return M <= 0 ? 0 : Math.round(LOGRES * Math.log(1 + t) / Math.log(1 + M));
    }
    function fromPos(v, M) {
      if (PACE !== 'log') return Math.round(v / STRIDE) * STRIDE;
      var t = Math.round(Math.exp(v / LOGRES * Math.log(1 + M)) - 1);
      return clamp(Math.round(t / STRIDE) * STRIDE, 0, M);
    }
    function buildStrip() {
      if (!doc || !fig || !fig.dock) return;
      strip = doc.createElement('div');
      strip.className = 'run-strip';
      strip.setAttribute('role', 'group');
      strip.setAttribute('aria-label', 'Playback');
      playBtn = button('run-btn run-play', 'Play', ICONS.play);
      backBtn = button('run-btn run-back', 'Back one ' + UNIT, ICONS.back);
      fwdBtn = button('run-btn run-fwd', 'Forward one ' + UNIT, ICONS.fwd);
      scrubEl = doc.createElement('input');
      scrubEl.type = 'range';
      scrubEl.className = 'run-scrub';
      scrubEl.min = '0';
      scrubEl.step = PACE === 'log' ? '1' : String(STRIDE);
      scrubEl.setAttribute('aria-label', capital(UNIT));
      segEl = doc.createElement('div');
      segEl.className = 'seg run-speed';
      segEl.setAttribute('role', 'group');
      segEl.setAttribute('aria-label', 'Speed');
      SPEEDS.forEach(function (x) {
        var b = doc.createElement('button');
        b.type = 'button';
        b.textContent = speedText(x);
        b.setAttribute('aria-pressed', String(x === speedX));
        b.setAttribute('data-speed', String(x));
        b.addEventListener('click', function () { setSpeed(x); });
        segEl.appendChild(b);
      });
      cycleBtn = doc.createElement('button');
      cycleBtn.type = 'button';
      cycleBtn.className = 'run-speed-cycle';
      cycleBtn.addEventListener('click', function () {
        var i = SPEEDS.indexOf(speedX);
        setSpeed(SPEEDS[(i + 1) % SPEEDS.length]);
      });
      strip.appendChild(playBtn);
      strip.appendChild(backBtn);
      strip.appendChild(fwdBtn);
      strip.appendChild(scrubEl);
      strip.appendChild(segEl);
      strip.appendChild(cycleBtn);
      fig.dock.appendChild(strip);

      playBtn.addEventListener('click', function () {
        if (playing) pause(); else start();
      });
      backBtn.addEventListener('click', function () { step(-1); });
      fwdBtn.addEventListener('click', function () { step(1); });
      scrubEl.addEventListener('pointerdown', function () {
        touch();
        if (playing) stopLoop('pause', true);
      });
      scrubEl.addEventListener('input', function () {
        scrub(fromPos(+scrubEl.value, scrubMax()), { transient: true });
      });
      scrubEl.addEventListener('change', function () {
        var t = fromPos(+scrubEl.value, scrubMax());
        if (!inited || t !== cursor) scrub(t);
        else settle('scrub');
      });
      scrubEl.addEventListener('keydown', function (ev) {
        var M = scrubMax(), t = null, k = ev.key;
        if (k === 'ArrowRight' || k === 'ArrowUp') t = cursor + STRIDE;
        else if (k === 'ArrowLeft' || k === 'ArrowDown') t = cursor - STRIDE;
        else if (k === 'PageUp' || k === 'PageDown') {
          var dir = k === 'PageUp' ? 1 : -1;
          if (PACE === 'log') t = fromPos(clamp(toPos(cursor, M) + dir * LOGRES / 10, 0, LOGRES), M);
          else t = cursor + dir * Math.max(STRIDE, Math.round(M / 10 / STRIDE) * STRIDE);
          if (t === cursor) t = cursor + dir * STRIDE;
        } else if (k === 'Home') t = 0;
        else if (k === 'End') t = M;
        if (t == null) return;
        ev.preventDefault();
        scrub(clamp(t, 0, M));
      });
      updateStrip();
    }
    function updateStrip(counter) {
      if (!strip) return;
      var state = playing ? 'pause' : atEnd() ? 'replay' : 'play';
      if (state !== playState) {
        playState = state;
        var label = state === 'pause' ? 'Pause' : state === 'replay' ? 'Replay' : 'Play';
        playBtn.setAttribute('aria-label', label);
        playBtn.title = label;
        playBtn.setAttribute('data-state', state);
        while (playBtn.firstChild) playBtn.removeChild(playBtn.firstChild);
        playBtn.appendChild(svgIcon(ICONS[state]));
      }
      var M = scrubMax(), maxAttr = String(PACE === 'log' ? LOGRES : M);
      if (scrubEl.max !== maxAttr) scrubEl.max = maxAttr;
      var pos = String(toPos(Math.min(cursor, M), M));
      if (scrubEl.value !== pos) scrubEl.value = pos;
      var text = counter != null ? counter : (inited ? counterText() : UNIT + ' 0' + (limitOf(startValues) === Infinity ? '' : ' of ' + fmtInt(limitOf(startValues))));
      if (scrubEl.getAttribute('aria-valuetext') !== text) scrubEl.setAttribute('aria-valuetext', text);
      Array.prototype.forEach.call(segEl.children, function (b) {
        var on = String(+b.getAttribute('data-speed') === speedX);
        if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on);
      });
      var st = speedText(speedX);
      if (cycleBtn.textContent !== st) {
        cycleBtn.textContent = st;
        cycleBtn.setAttribute('aria-label', 'Speed, ' + st);
        cycleBtn.title = 'Speed, ' + st;
      }
    }

    /* ---------- the run object ---------- */
    var api = {
      id: id,
      start: start,
      pause: pause,
      step: step,
      act: act,
      scrub: scrub,
      press: press,
      preview: preview,
      recordHandlers: function () {
        return {
          press: function (xv, phase) { press(xv, phase); },
          onRead: function (xv) { if (!playing) preview(xv == null ? null : xv); }
        };
      },
      speed: setSpeed,
      set: function (name, value, opts) { var v = {}; v[name] = value; setMany(v, opts); },
      setMany: setMany,
      settle: settlePublic,
      reset: reset,
      finish: finish,
      snapshot: snapshot,
      restore: restore,
      onTick: function (fn) { if (isFn(fn)) ticks.push(fn); return api; },
      on: function (name, fn) {
        if (!listeners[name] || !isFn(fn)) { report('has no event "' + name + '"'); return api; }
        listeners[name].push(fn);
        return api;
      },
      off: function (name, fn) {
        var l = listeners[name], i = l ? l.indexOf(fn) : -1;
        if (i >= 0) l.splice(i, 1);
        return api;
      },
      t: function () { return cursor; },
      frontier: function () { return R ? R.frontier : 0; },
      state: function () { return cur; },
      stateAt: function (t) { ensureInit(); return stateAt(t); },
      rows: function () { return R ? R.rows : []; },
      ghost: function () { return ghostRows; },
      changes: function () { return R ? R.changes.map(copy) : []; },
      params: function () { return copy(R ? paramsAt(R, cursor) : startValues); },
      playing: function () { return playing; },
      touched: function () { return touched; },
      touch: function () { touch(); return api; },
      steps: function () { return stepsNow(); },
      limit: function () { return limitNow(); },
      span: function () { return spanNow(); },
      end: function () { return endStep(); },
      untilStep: function () { return R ? R.untilT : null; },
      kind: function () { return playKind; },
      counter: function () { return counterText(); },
      timeTo: function (t) {
        var p = makePace(PACE, Math.max(1, stepsNow()), durationNow(), spec.easeSteps == null ? 3 : spec.easeSteps);
        return p.time(t);
      },
      pending: function () { return !!job; },
      autoplaying: function () { return playing && autoplaying; },
      stats: function () { return stats; },
      info: function () {
        return {
          pace: PACE, unit: UNIT, stride: STRIDE, keyframe: KF, recordPanel: spec.recordPanel || null,
          ahead: !!spec.ahead, reset: spec.reset === 'replay' ? 'replay' : 'show',
          actions: ACTIONS ? ACTIONS.slice() : null, easeSteps: spec.easeSteps == null ? 3 : spec.easeSteps,
          duration: durationNow(), compute: !!COMPUTE, until: isFn(spec.until), open: limitNow() === Infinity,
          spanGiven: spec.span != null
        };
      },
      verify: verify,
      _keyframes: function () { return R ? R.kf : []; },
      _eligible: eligible,
      _autoStart: autoStart,
      _view: onView,
      _pageVisible: onPageVisible,
      _init: function () { initRun(); }
    };

    /* ---------- wiring ---------- */
    ALL.push(api);
    if (fig && isFn(fig.attach)) fig.attach(api);
    buildStrip();
    if (fig && isFn(fig.on)) fig.on('prepare', function () { initRun(); });
    if (doc && fig && global.IntersectionObserver) {
      var target = fig.panels || fig.el;
      var th = [];
      for (var i = 0; i <= 20; i++) th.push(i / 20);
      var io = new global.IntersectionObserver(function (entries) {
        var e = entries[entries.length - 1];
        var rootH = e.rootBounds ? e.rootBounds.height : (global.innerHeight || 1);
        var h = Math.min(e.boundingClientRect.height, rootH) || 1;
        onView(e.isIntersecting ? Math.min(1, e.intersectionRect.height / h) : 0);
      }, { threshold: th });
      if (target) io.observe(target);
    }
    if (doc) doc.addEventListener('visibilitychange', function () { onPageVisible(!E.hidden()); });
    if (TP.motion && isFn(TP.motion.on)) TP.motion.on(function (reduced) {
      if (reduced && playing && autoplaying) finish();
    });
    return api;
  };

  TP.run.pace = makePace;
  TP.run.pageQueue = pageQueue;
  TP.run.all = ALL;
})(typeof window !== 'undefined' ? window : globalThis);
