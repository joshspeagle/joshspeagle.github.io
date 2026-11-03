/*
 * f3-3-budgets.js: figure F3.3, epoch budget against step budget (fig-budgets).
 *
 * Work order: notes/revamp/implementation-plan.md §6.6 (WO-F3.3), with §6.0. Entry:
 * notes/revamp/figure-plan.md F3.3, and review/synthesis.md R10. Design: notes/revamp/design-system.md
 * §3.4, §3.5, §4, §5, §6, §8 and §9. A fixed-frame figure read by pointing, with no recap.
 *
 * The model. TP.scaling.examples(B, B_crit) = 1 + B / B_crit, the examples needed to reach the goal
 * in units of S_min B_crit (the minimum number of examples), and TP.scaling.steps(B, B_crit) =
 * 1 + B_crit / B, the steps needed in units of S_min (the minimum number of steps): McCandlish et
 * al. (2018) Eq. 2.11 at a fixed batch size. TP.scaling.budgetPass decides the gate: under an epoch
 * budget of m S_min B_crit examples a batch size reaches the goal when B <= (m - 1) B_crit, and
 * under a step budget of n S_min steps when B >= B_crit / (n - 1). B_crit, m and n come from CAL,
 * which tests/calibration/fig-budgets.calibrate.js wrote, so the figure's quantities equal the
 * ledger's rows.
 *
 * The panels share the batch-size axis, log base 2 over CAL.domains.a.x, and each y axis is log
 * base 10 over its CAL domain, as a multiple of the minimum.
 *   (a) examples needed against batch size: the examples curve in model blue, one marker per power
 *       of two from 8 to 16,384, filled where the batch size reaches the goal under the epoch budget
 *       and open where it does not (the gate of DS §4.3), and the epoch budget as a dashed limit
 *       named "epoch budget" on the y axis (DS §4.7, §5.5).
 *   (b) steps needed against batch size: the same for the steps and the step budget, named
 *       "step budget".
 *   The pointed batch size, the parameter `batch`, is a reader line through both frames with its
 *   value named on the x axis in the reader token (DS §4.10, "a value read at"). Each panel reads
 *   by point through div.reader (C.pointHover), and the two are linked by C.link with the key
 *   "b<batch size>". Pointing highlights a batch size in both panels and shows its examples and
 *   steps in the tooltip. A press, Enter or Space commits it as `batch`, and so does each arrow,
 *   Page, Home or End key on a reading element (WO-F3.3). A key under the panels names the two
 *   fills, because no axis carries the gate.
 *
 * v4 review (post03, 2026-11): the key of filled and open circles moved above the panels
 * (fig-budgets.css); presets labelled by their batch sizes.
 *
 * The parameter: batch (powers of two from 8 to 16,384, default CAL.defaults.batch, cut, no ghost,
 * control 'none'). No preset, no seed, no dock. Reset sits in div.fig-controls-more.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};

  /* BEGIN GENERATED table-cal */
  // From tests/calibration/out/fig-budgets.json by npm run generate (tests/lib/write-generated.js).
  var CAL = {
    "defaults": {"batch": 256},
    "presets": {"small": {"batch": 32}, "epoch-pass": {"batch": 256}, "step-pass": {"batch": 512}, "large": {"batch": 4096}},
    "states": {},
    "seed": null,
    "critical": 320,
    "epochMultiple": 2,
    "stepBudget": 2,
    "domains": {"a": {"x": [4, 32768], "y": [0.5, 100]}, "b": {"x": [4, 32768], "y": [0.5, 100]}},
    "tables": {},
    "quantities": {
      "model": {"critical": 320, "epoch-multiple": 2, "step-budget": 2},
      "default": {"epoch-largest": 256, "step-smallest": 512, "batch": 256, "examples": 1.8, "steps": 2.25}
    }
  };
  /* END GENERATED table-cal */

  var ID = 'fig-budgets';
  var S = TP.scaling;
  var BATCHES = S.batchSizes();
  var BUDGETS = {
    a: { kind: 'epoch', m: CAL.epochMultiple, level: CAL.epochMultiple, name: 'epoch budget', quantity: 'examples' },
    b: { kind: 'step', n: CAL.stepBudget, level: CAL.stepBudget, name: 'step budget', quantity: 'steps' }
  };

  function sig3(v) { return TP.fmt.byName('sig3')(v); }
  function int(v) { return TP.fmt.byName('int')(v); }
  function examplesAt(b) { return S.examples(b, CAL.critical); }
  function stepsAt(b) { return S.steps(b, CAL.critical); }
  function passes(b, letter) { return S.budgetPass(b, BUDGETS[letter], CAL.critical); }
  function valueOf(letter, b) { return letter === 'a' ? examplesAt(b) : stepsAt(b); }

  /* ============================== the model ============================== */

  /** The derived state: the pointed batch size and one row per batch size, each with a key (DS §9). */
  function apply(values) {
    return {
      batch: values.batch,
      rows: BATCHES.map(function (b) {
        return { key: 'b' + b, b: b, examples: examplesAt(b), steps: stepsAt(b), epoch: passes(b, 'a'), step: passes(b, 'b') };
      })
    };
  }
  function rowOf(state, b) {
    for (var i = 0; i < state.rows.length; i++) if (state.rows[i].b === b) return state.rows[i];
    return null;
  }
  /* "reaches the goal under the epoch budget and misses it under the step budget", by the cases */
  function cases(r) {
    if (r.epoch && r.step) return 'reaches the goal under both budgets';
    if (!r.epoch && !r.step) return 'misses the goal under both budgets';
    if (r.epoch) return 'reaches the goal under the epoch budget and misses it under the step budget';
    return 'misses the goal under the epoch budget and reaches it under the step budget';
  }

  /* ============================== the figure ============================== */

  var fig = null, pa = null, pb = null, link = null, cur = null;
  var keyForm = null, figEl = null;            /* the key's form drawn last: 'full' or 'phone' */

  function build(f) {
    var box = f.panels;
    figEl = f.el;
    pa = TP.chart.panel(box, panelOpts('a'));
    pb = TP.chart.panel(box, panelOpts('b'));
    link = TP.chart.link([pa, pb], { axis: 'x', key: function (v, pt) { return pt ? pt.key : null; } });
    [pa, pb].forEach(function (p) {
      var letter = p === pa ? 'a' : 'b';
      TP.chart.pointHover(p, {
        points: function () { return pointsFor(letter); },
        by: 'batch size',
        startIndex: function () { return cur ? BATCHES.indexOf(cur.batch) : 0; },
        select: function (i, pt) { commit(pt); },
        /* the arrow, Page, Home and End keys on the reading element commit the batch size they reach */
        onRead: function (pt, i, info) { if (info && info.source === 'key') commit(pt); }
      });
      p.update(function (q) { drawPanel(q, letter); });
    });
  }

  /* The key of the two fills, under the panels. In the phone layout the first entry takes two
     lines, so that the key fits a 320-px viewport. */
  function drawKey(el, phone) {
    var form = phone ? 'phone' : 'full';
    if (form === keyForm) return;
    keyForm = form;
    TP.chart.key(el, [
      { kind: 'dot', role: 'model', text: phone ? ['reaches the goal under', 'the panel’s budget'] : 'reaches the goal under the panel’s budget' },
      { kind: 'open', role: 'model', text: 'misses the goal' }
    ]);
  }

  function commit(pt) {
    if (!pt || !cur || pt.b === cur.batch) return;
    fig.set({ batch: pt.b });
  }

  function panelOpts(letter) {
    var dom = CAL.domains[letter];
    return {
      letter: '(' + letter + ')',
      describe: letter === 'a' ? 'examples needed against batch size' : 'steps needed against batch size',
      note: letter === 'a' ? 'examples needed' : 'steps needed',
      xLog: 2, yLog: 10, xDomain: dom.x.slice(), yDomain: dom.y.slice(),
      xLabel: function (p) { return p.phone && letter === 'a' ? '' : 'batch size'; },
      /* in the phone layout the frame is about 110 px tall, and the title takes its short form */
      yLabel: function (p) { return p.phone ? '\u00d7 minimum' : 'multiple of the minimum'; },
      xTicks: function (d, px) {
        var out = [], stepE = px < 330 ? 3 : 2;
        for (var e = 3; e <= 14; e += stepE) out.push(Math.pow(2, e));
        return out;
      },
      xFormat: int,
      yTicks: [1, 10, 100],
      yFormat: function (v) { return int(v); },
      aspect: function (w, phone) { return phone ? 164 / Math.max(w, 1) : 0.62; },
      maxHeight: function (w, phone) { return phone ? 164 : 290; },
      /* (a)'s phone bottom of 25 px holds the reader line's name under the axis in Firefox, whose
         box for that text is 22 px tall where Chromium's is 15 (a bottom of 22 put "256" 1.7 px
         below the SVG) */
      margin: function (w, phone) {
        return phone ? { t: 10, r: 12, b: letter === 'a' ? 25 : 42, l: 104 } : { t: 12, r: 16, b: 44, l: 126 };
      }
    };
  }

  function pointsFor(letter) {
    if (!cur) return [];
    return cur.rows.map(function (r) {
      return {
        x: r.b, y: valueOf(letter, r.b), key: r.key, b: r.b, head: 'Batch size ' + int(r.b),
        rows: [
          { value: sig3(r.examples), label: 'examples needed, as a multiple of the minimum', role: 'model' },
          { value: sig3(r.steps), label: 'steps needed, as a multiple of the minimum', role: 'model' }
        ],
        lines: [cases(r)]
      };
    });
  }

  /* the curve, sampled more finely than its markers, between the smallest and largest batch size */
  var SAMPLES = (function () {
    var out = [], lo = Math.log(BATCHES[0]), hi = Math.log(BATCHES[BATCHES.length - 1]);
    for (var i = 0; i <= 96; i++) out.push(Math.exp(lo + (hi - lo) * i / 96));
    return out;
  })();

  function drawPanel(p, letter) {
    var C = TP.chart, s = cur, bud = BUDGETS[letter];
    if (letter === 'a' && figEl) drawKey(figEl, p.phone);
    /* the budget: a dashed limit the text states, named on the y axis (DS §4.7, §5.5). */
    C.level(p, 'y', bud.level, { role: 'ref', text: bud.name, line: true });
    if (!s) return;
    var yOf = function (b) { return valueOf(letter, b); };
    C.line(p, SAMPLES, function (b) { return b; }, yOf, { role: 'model', series: bud.quantity, key: bud.quantity });
    var pass = letter === 'a' ? 'epoch' : 'step';
    var xOf = function (r) { return r.b; }, yRow = function (r) { return yOf(r.b); }, keyOf = function (r) { return r.key; };
    C.markers(p, s.rows.filter(function (r) { return r[pass]; }), xOf, yRow, { role: 'model', series: bud.quantity, fill: 'filled', key: keyOf });
    C.markers(p, s.rows.filter(function (r) { return !r[pass]; }), xOf, yRow, { role: 'model', series: bud.quantity, fill: 'open', key: keyOf });
    /* the pointed batch size: a reader line through both frames, its value named on the x axis */
    C.level(p, 'x', s.batch, { role: 'reader', text: int(s.batch), line: true });
    p.el.setAttribute('data-batch', String(s.batch));
  }

  function draw(state, ctx) {
    if (!pa) build(ctx.fig);
    cur = state;
    pa.update();
    pb.update();
  }

  function readout(state) {
    var r = rowOf(state, state.batch);
    return 'Batch size ' + int(r.b) + ' needs ' + sig3(r.examples) + '× the minimum examples and ' + sig3(r.steps) +
      '× the minimum steps, and ' + cases(r) + '.';
  }

  function table(state) {
    var yesNo = function (v) { return v ? 'reaches' : 'misses'; };
    return {
      columns: [
        { key: 'b', label: 'Batch size', format: int },
        { key: 'examples', label: 'Examples needed, multiple of the minimum', format: sig3 },
        { key: 'steps', label: 'Steps needed, multiple of the minimum', format: sig3 },
        { key: 'epoch', label: 'The goal under the epoch budget', format: yesNo },
        { key: 'step', label: 'The goal under the step budget', format: yesNo },
        { key: 'note', label: 'Marked' }
      ],
      rows: state.rows.map(function (r) {
        return { b: r.b, examples: r.examples, steps: r.steps, epoch: r.epoch, step: r.step, note: r.b === state.batch ? 'pointed batch size' : '' };
      }),
      caption: 'Examples and steps needed to reach the goal at each batch size, with B_crit ' + int(CAL.critical) +
        ', an epoch budget of ' + CAL.epochMultiple + ' times the minimum examples and a step budget of ' + CAL.stepBudget + ' times the minimum steps'
    };
  }

  function quantities(state) {
    var r = rowOf(state, state.batch);
    var epochOK = BATCHES.filter(function (b) { return passes(b, 'a'); });
    var stepOK = BATCHES.filter(function (b) { return passes(b, 'b'); });
    var q = {
      'epoch-largest': epochOK.length ? epochOK[epochOK.length - 1] : null,
      'step-smallest': stepOK.length ? stepOK[0] : null,
      batch: state.batch, examples: r.examples, steps: r.steps,
      'epoch-pass': r.epoch, 'step-pass': r.step
    };
    var m = (CAL.quantities || {}).model || {};
    Object.keys(m).forEach(function (name) { if (!(name in q)) q[name] = m[name]; });
    return q;
  }

  function init(element) {
    fig = TP.fig(element, {
      kind: 'fixed',
      params: {
        batch: {
          type: 'number', default: CAL.defaults.batch, domain: [BATCHES[0], BATCHES[BATCHES.length - 1]],
          snap: BATCHES.slice(), scale: 'log', change: 'cut', ghost: false,
          label: 'Batch size', control: 'none', format: int,
          /* the URL names the batch size itself, such as batch:1024 (the default encoding would
             write the shortest text that snaps to it, 1000) */
          encode: function (v) { return String(v); }
        }
      },
      presets: {
        'B = 32': { key: 'small', batch: CAL.presets.small.batch },
        'B = 256': { key: 'epoch-pass', batch: CAL.presets['epoch-pass'].batch },
        'B = 512': { key: 'step-pass', batch: CAL.presets['step-pass'].batch },
        'B = 4,096': { key: 'large', batch: CAL.presets.large.batch }
      },
      states: CAL.states,
      apply: apply,
      draw: draw,
      readout: readout,
      table: table,
      quantities: quantities
    });
  }

  document.addEventListener('tp:ready', function () {
    var el = document.getElementById(ID);
    if (el) init(el);
  });
})();
