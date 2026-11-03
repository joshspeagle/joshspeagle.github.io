/*
 * f8-2-budget-line.js: figure F8.2, the step-budget line (fig-budget-line), on page 8 #refine, and
 * its recap TP.recaps['F8.2:strip'] (R7, page 10 #round).
 *
 * Work order: notes/revamp/implementation-plan.md §6.17 (WO-F8.2), with §6.0 and §6.24. Entry:
 * notes/revamp/figure-plan.md F8.2, and review/synthesis.md R11 and R40. Design:
 * notes/revamp/design-system.md §3.4, §3.5, §4, §5, §6, §8 and §9. A fixed-frame figure with a
 * budget handle, a pin and a recap.
 *
 * The model is TP.budget (site/js/lib/budget.js): twelve trials of the curve family of
 * site/js/lib/curves.js, evaluated every INTERVAL steps to AXIS_END. TP.budget.bestAt(trials, B) is
 * each trial's lowest evaluation at or before the budget B (retrospective checkpoint selection), and
 * TP.budget.counts(trials, B) counts the best steps in the first tenth (fraction <= 0.1) and the last
 * quarter (fraction > 0.75). The curves do not depend on the budget, which holds for a constant
 * learning rate, so moving the budget truncates the same evaluations. This is the computation of
 * tests/calibration/fig-budget-line.calibrate.js, so the quantities equal the ledger's rows.
 *
 * The panels, (a) above (b) at every width, with the same left and right margins.
 *   (a) validation error against step: x log over CAL.domains.a.x, y over CAL.domains.a.y. The twelve
 *       curves are an ensemble (DS §4.6: model blue at 0.3 opacity and 1.5 px), each keyed by its
 *       trial. Each trial's best evaluation at or before the budget is a filled marker. The budget is a
 *       reader line with its handle (and a press band along the line) and its value named on the x
 *       axis. Two highlight windows, the first tenth and the last quarter of the run, move with the
 *       line; (b) names them. The provisional budget is a tick named "provisional budget" at every
 *       state. A pin is a dashed reader line named by its budget.
 *   (b) best step as a fraction of the budget: x from 0 to 1. The twelve best steps are filled
 *       model-blue dots in one row, keyed by trial and linked to their curves (C.link). Dots less than
 *       one marker apart stack upward in their row. The windows "first tenth" (0 to 0.1) and "last
 *       quarter" (0.75 to 1) carry their names at the top; at phone width "first tenth, 0 to 0.1" is
 *       (b)'s header form, and the axis shows 0.1 in place of 0. While a pin stands, a second row above the
 *       first holds the best steps at the pinned budget, named "pinned at B steps" on the y axis.
 *
 * The parameters: budget (TP.budget.budgets(), a log handle on (a), transition, no ghost) and the
 * seed ("Draw again", a cut). The November 2026 review (post07) removed the pin to keep the controls
 * to the handle, the presets and "Draw again"; the pinned-row code stays and is inert without it. The presets "provisional budget", "all in the first tenth" and "all in the last quarter" are
 * functions of the seed: at CAL.seed they return CAL.presets, and at another seed the thresholds of
 * that seed's study (TP.budget.thresholds). "Draw again", the presets and Reset sit in more.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};
  TP.recaps = TP.recaps || {};

  /* BEGIN GENERATED table-cal */
  // From tests/calibration/out/fig-budget-line.json by npm run generate (tests/lib/write-generated.js).
  var CAL = {
    "defaults": {"budget": 20000, "seed": 52},
    "presets": {
      "provisional-budget": {"budget": 20000},
      "all-first-tenth": {"budget": 150000},
      "all-last-quarter": {"budget": 2200}
    },
    "states": {},
    "seed": 52,
    "domains": {"a": {"x": [200, 500000], "y": [0.1, 1.2]}, "b": {"x": [0, 1]}},
    "tables": {
      "counts": [
        [2000, 0, 12],
        [2200, 0, 12],
        [2400, 0, 11],
        [2600, 0, 11],
        [2800, 0, 11],
        [3000, 0, 11],
        [3200, 0, 11],
        [3400, 0, 11],
        [3600, 0, 11],
        [3800, 0, 10],
        [4000, 0, 9],
        [4200, 0, 9],
        [4400, 0, 9],
        [4800, 0, 9],
        [5000, 0, 9],
        [5400, 0, 10],
        [5600, 0, 9],
        [6000, 0, 9],
        [6400, 0, 7],
        [6600, 0, 7],
        [7000, 0, 6],
        [7600, 0, 6],
        [8000, 0, 6],
        [8400, 0, 6],
        [9000, 0, 6],
        [9400, 0, 6],
        [10000, 0, 6],
        [10600, 0, 6],
        [11200, 0, 5],
        [12000, 0, 3],
        [12600, 0, 3],
        [13400, 0, 2],
        [14200, 0, 1],
        [15000, 0, 1],
        [15800, 0, 1],
        [16800, 0, 1],
        [17800, 0, 1],
        [18800, 1, 1],
        [20000, 1, 0],
        [21200, 1, 0],
        [22400, 1, 0],
        [23800, 1, 0],
        [25200, 1, 0],
        [26600, 1, 0],
        [28200, 1, 0],
        [30000, 2, 0],
        [31600, 2, 0],
        [33600, 2, 0],
        [35600, 2, 0],
        [37600, 2, 0],
        [40000, 2, 0],
        [42200, 2, 0],
        [44800, 2, 0],
        [47400, 3, 0],
        [50200, 4, 0],
        [53200, 4, 0],
        [56400, 4, 0],
        [59800, 4, 0],
        [63200, 4, 0],
        [67000, 5, 0],
        [71000, 5, 0],
        [75200, 6, 0],
        [79600, 6, 0],
        [84400, 7, 0],
        [89400, 8, 0],
        [94600, 9, 0],
        [100200, 10, 0],
        [106200, 11, 0],
        [112400, 11, 0],
        [119200, 11, 0],
        [126200, 11, 0],
        [133600, 11, 0],
        [141600, 11, 0],
        [150000, 12, 0],
        [158800, 12, 0],
        [168200, 12, 0],
        [178200, 12, 0],
        [188800, 12, 0],
        [200000, 12, 0],
        [211800, 12, 0],
        [224400, 12, 0],
        [237800, 12, 0],
        [251800, 12, 0],
        [266800, 12, 0],
        [282600, 12, 0],
        [299200, 12, 0],
        [317000, 12, 0],
        [335800, 12, 0],
        [355600, 12, 0],
        [376800, 12, 0],
        [399000, 12, 0],
        [422600, 12, 0],
        [447800, 12, 0],
        [474200, 12, 0],
        [500000, 12, 0]
      ]
    },
    "quantities": {
      "model": {"provisional-budget": 20000, "interval": 200, "axis-end": 500000, "trials": 12},
      "default": {"last-quarter": 0, "first-tenth": 1},
      "all-first-tenth": {"budget": 150000},
      "all-last-quarter": {"budget": 2200},
      "seed": {
        "chosen": 52,
        "statistic": "the median best step of the twelve trials at the axis end; admitted: all",
        "n": 300,
        "admitted": 300,
        "median": 7900
      }
    }
  };
  /* END GENERATED table-cal */

  var ID = 'fig-budget-line';
  function M() { return TP.budget; }
  var fmt = {
    int: function (v) { return TP.fmt.byName('int')(v); },
    err: function (v) { return TP.fmt.byName('fixed3')(v); },
    frac: function (v) { return TP.fmt.byName('fixed2')(v); },
    tick: function (v) { return v === 0 ? '0' : v === 1 ? '1' : String(v); }
  };

  /* ============================== the model ============================== */

  /* the study of a seed, cached for the four most recent seeds */
  var studies = [];
  function trialsOf(seed) {
    for (var i = 0; i < studies.length; i++) if (studies[i].seed === seed) return studies[i].trials;
    var t = M().trials(seed);
    studies.unshift({ seed: seed, trials: t, lines: {} });
    if (studies.length > 4) studies.pop();
    return t;
  }
  /* the curves' line caches of a seed (C.line's cache option), so that a drag redraws no path data */
  function linesOf(seed) {
    for (var i = 0; i < studies.length; i++) if (studies[i].seed === seed) return studies[i].lines;
    return {};
  }
  function zoneOf(b) {
    if (!b) return '';
    return 10 * b.step <= b.budget ? 'first' : 4 * b.step > 3 * b.budget ? 'last' : '';
  }
  /** Each trial's best at budget B, as rows keyed by trial ("t0" to "t11"). */
  function bestRows(trials, B) {
    return M().bestAt(trials, B).map(function (b, j) {
      if (!b) return null;
      return { key: 't' + j, index: j, step: b.step, value: b.value, fraction: b.fraction, budget: B };
    }).filter(Boolean);
  }

  /** The derived state for the values. Every array of rows carries a key (DS §9). */
  function apply(values) {
    var trials = trialsOf(values.seed), B = values.budget, c = M().counts(trials, B);
    return {
      budget: B, lb: Math.log(B), seed: values.seed,
      rows: bestRows(trials, B),
      first: String(c.firstTenth), last: String(c.lastQuarter), n: String(c.n)
    };
  }

  /* The presets. At CAL.seed each returns CAL's budget. At another seed the thresholds come from that
     seed's study, and where no listed budget puts all twelve in a window, the preset takes the end of
     the handle's range on that side, where the readout states the counts. */
  /* Unused since the post07 review moved the presets to states; kept for a seed-aware preset later. */
  function thresholdPreset(which) {
    var f = function (seed) {
      if (seed === CAL.seed) return { budget: CAL.presets[which].budget };
      var th = M().thresholds(trialsOf(seed)), list = M().budgets();
      var v = which === 'all-first-tenth' ? th.allFirstTenth : th.allLastQuarter;
      if (v == null) v = which === 'all-first-tenth' ? list[list.length - 1] : list[0];
      return { budget: v };
    };
    f.key = which;
    return f;
  }

  /* ============================== the drawing ============================== */

  var fig = null, pa = null, pb = null, link = null, cur = null, curCtx = { hold: false }, view = null;

  function marginFor(w, phone) {
    return phone ? { l: 50, r: 12 } : { l: 66, r: 16 };
  }

  function buildStrip(container, o) {
    return TP.chart.panel(container, {
      letter: o.letter, key: 'b',
      describe: 'best step as a fraction of the budget',
      note: o.note,
      xDomain: CAL.domains.b.x.slice(), yDomain: [0, 1],
      xLabel: function (p) { return p.phone ? 'best step / budget' : 'best step as a fraction of the budget'; },
      yLabel: '',
      /* at phone width 0 and 0.1 stand closer than xMinGap, and the 0.1 tick names the first tenth's
         edge, so the phone axis keeps 0.1 and leaves 0 to the frame's left edge (reader 8) */
      xTicks: function (d, px) { return px < 400 ? [0.1, 0.5, 0.75, 1] : [0, 0.1, 0.5, 0.75, 1]; },
      xFormat: fmt.tick, yTicks: 'none', grid: 'x',
      aspect: function (w, phone) { return (phone ? 130 : 118) / Math.max(w, 1); },
      /* the recap has no pin, so it needs no room for the pinned row's name */
      margin: function (w, phone) { var m = marginFor(w, phone); return { t: 4, r: m.r, b: phone ? 42 : 44, l: o.recap ? 16 : m.l }; }
    });
  }

  function build(f) {
    var box = f.panels, dA = CAL.domains.a;
    pa = TP.chart.panel(box, {
      letter: '(a)', key: 'a',
      describe: 'validation error against step',
      xLog: 10, yLog: false, xDomain: dA.x.slice(), yDomain: dA.y.slice(),
      xLabel: 'step', yLabel: 'validation error',
      xTicks: [1000, 10000, 100000], xFormat: fmt.int,
      yTicks: function (d, px) { return px < 150 ? [0.2, 0.6, 1] : [0.2, 0.4, 0.6, 0.8, 1, 1.2]; },
      yFormat: function (v) { return TP.fmt.byName('fixed1')(v); },
      grid: 'y',
      aspect: function (w, phone) { return (phone ? 170 : 220) / Math.max(w, 1); },
      margin: function (w, phone) { var m = marginFor(w, phone); return phone ? { t: 8, r: m.r, b: 58, l: m.l } : { t: 10, r: m.r, b: 62, l: m.l }; }
    });
    pb = buildStrip(box, { letter: '(b)' });
    link = TP.chart.link([pa, pb], { key: function (v, pt) { return pt ? pt.key : null; } });
    TP.chart.pointHover(pa, { points: pointsA, by: 'trial' });
    TP.chart.pointHover(pb, { points: pointsB, by: 'trial' });
    pa.update(drawA);
    pb.update(function (p) { if (view) view.dots = drawStrip(p, view.rows, view.pinRows, view.pinB, curCtx); });
  }

  /* ---------- reading ---------- */

  function tipRows(r) {
    return [
      { value: fmt.int(r.step), label: 'best step', role: 'model' },
      { value: fmt.err(r.value), label: 'best validation error' },
      { value: fmt.frac(r.fraction), label: 'of the budget of ' + fmt.int(r.budget) + ' steps' }
    ];
  }
  function zoneLine(r) {
    var z = zoneOf(r);
    return z === 'first' ? ['in the first tenth of the run'] : z === 'last' ? ['in the last quarter of the run'] : [];
  }
  function pointsA() {
    if (!view) return [];
    return view.rows.slice().sort(function (a, b) { return a.step - b.step || a.index - b.index; }).map(function (r) {
      return { x: r.step, y: r.value, key: r.key, head: 'Trial ' + (r.index + 1), rows: tipRows(r), lines: zoneLine(r) };
    });
  }
  function pointsB() {
    if (!view || !view.dots) return [];
    return view.dots.slice().sort(function (a, b) { return a.r.fraction - b.r.fraction || a.r.index - b.r.index; }).map(function (d) {
      return {
        x: d.r.fraction, y: d.y, key: d.r.key,
        head: 'Trial ' + (d.r.index + 1) + (d.pinned ? ', the pinned budget' : ''),
        rows: tipRows(d.r), lines: zoneLine(d.r)
      };
    });
  }

  /* ---------- (a) the curves and the budget line ---------- */

  function drawA(p) {
    var C = TP.chart, v = view;
    var P = M().PROVISIONAL_BUDGET;
    /* the provisional budget: a tick named on the step axis at every state (RM §7 item 15) */
    var names = [];
    if (!v) {
      var n0 = C.level(p, 'x', P, { role: 'ref', text: p.phone ? 'provisional' : 'provisional budget', series: 'provisional' });
      if (n0 && n0.record) arrangeNames(p, [{ rec: n0.record, fixed: false }]);
      return;
    }
    var B = v.B, trials = v.trials, lines = linesOf(v.seed);
    /* the first tenth and the last quarter of the run, highlight windows that move with the line */
    C.window(p, CAL.domains.a.x[0], 0.1 * B, { kind: 'highlight', id: 'first-tenth-a' });
    C.window(p, 0.75 * B, B, { kind: 'highlight', id: 'last-quarter-a' });
    /* the twelve curves, an ensemble (DS §4.6), each keyed by its trial. (a) places no label, so the
       curves' 30,000 points record no obstacles for the placer, which would index them on every
       frame of a drag or a transition. */
    var step = function (e) { return e.step; }, val = function (e) { return e.value; };
    trials.forEach(function (t, j) {
      var key = 't' + j;
      lines[key] = lines[key] || {};
      C.line(p, t.evals, step, val, { role: 'model', series: 'curves', key: key, alpha: 0.3, weight: 1.5, cache: lines[key], ghost: false, obstacle: false });
    });
    /* the pinned budget: a dashed reader line named on the axis by its budget (DS §4.8) */
    if (v.pinB != null) {
      C.ref(p, { x: v.pinB }, { kind: 'pin', series: 'pin', key: 'pin' });
      var pn = C.level(p, 'x', v.pinB, { role: 'reader', text: fmt.int(v.pinB), series: 'pin-name' });
      if (pn && pn.record) names.push({ rec: pn.record, pin: true });
    }
    /* the budget: a reader line named on the axis by its value, with its handle and a press band */
    var bn = C.level(p, 'x', B, { role: 'reader', text: fmt.int(B), line: true, series: 'budget', key: 'budget' });
    if (bn && bn.record) names.unshift({ rec: bn.record, live: true });
    var pv = C.level(p, 'x', P, { role: 'ref', text: p.phone ? 'provisional' : 'provisional budget', series: 'provisional' });
    if (pv && pv.record) names.push({ rec: pv.record });
    arrangeNames(p, names);
    /* each trial's best evaluation at or before the budget */
    C.markers(p, v.rows, step, val, { role: 'model', series: 'best', key: function (r) { return r.key; } });
    var list = M().budgets();
    C.handle(p, {
      id: 'budget', axis: 'x', value: B, snap: list, min: list[0], max: list[list.length - 1], scale: 'log',
      label: 'Step budget, max_train_steps', format: fmt.int, onLine: true,
      onChange: function (x) { fig.set({ budget: x }, { transient: true }); },
      onSettle: function (x) { fig.set({ budget: x }); }
    });
  }

  /* The names on the step axis stand in two rows under the axis. The budget's value keeps the first
     row at its value. Each other name takes the first row where it is clear of the names already
     placed there, and otherwise the second row, and within its row moves sideways only as far as it
     must. A name in the second row hides no tick label, since the tick labels stand in the first. */
  function arrangeNames(p, list) {
    var gap = 6, rows = [[], []], lh = Math.round(p.h * 1.15);
    var lo = -p.margin.l + 1, hi = p.width + p.margin.r - 1;
    function clear(row, a, b) { return rows[row].every(function (s) { return b + gap <= s[0] || a >= s[1] + gap; }); }
    list.forEach(function (it, i) {
      var r = it.rec, w = r.w, c = r.pos, row = 0, x = c;
      if (i > 0 || !it.live) {
        var tries = [[0, c], [1, c]];
        [0, 1].forEach(function (rw) {
          rows[rw].forEach(function (s) { tries.push([rw, s[1] + gap + w / 2], [rw, s[0] - gap - w / 2]); });
        });
        var ok = tries.filter(function (t) { return t[1] - w / 2 >= lo && t[1] + w / 2 <= hi && clear(t[0], t[1] - w / 2, t[1] + w / 2); });
        /* a name at its own value first, in the first row and then the second; a shifted name last */
        var moved = function (t) { return Math.abs(t[1] - c) > 0.01 ? 1 : 0; };
        ok.sort(function (a, b) { return moved(a) - moved(b) || a[0] - b[0] || Math.abs(a[1] - c) - Math.abs(b[1] - c); });
        if (ok.length) { row = ok[0][0]; x = ok[0][1]; }
      }
      rows[row].push([x - w / 2, x + w / 2]);
      var t = r.node.querySelector('text');
      if (t && (row || Math.abs(x - c) > 0.01)) t.setAttribute('transform', 'translate(' + (x - c).toFixed(2) + ',' + (row * lh) + ')');
      r.node.setAttribute('data-row', String(row));
      if (row) {
        var k = p._names.x.indexOf(r);
        if (k >= 0) p._names.x.splice(k, 1);
      } else r.pos = x;
    });
  }

  /* ---------- (b) the strip ---------- */

  /* The rows' geometry in plot px: a strip at the top for the windows' names, clear of the dots by
     one text height, then the pinned row's band and, at the bottom, the budget's row. Without a pin
     the budget's row takes both bands, so that a tall stack of equal best steps keeps its spacing. */
  function strip(p, phone, pinned) {
    var h = p.h, nameLines = phone ? 2 : 1;
    var top = 0.25 * h + nameLines * h * 1.15 + h + 1;
    var band = Math.max(18, (p.height - top) / 2);
    return { top: top, band: pinned ? band : 2 * band, pinBand: band, live: p.height - 5.5, pin: p.height - band - 5.5 };
  }
  /* Dots whose centres lie within one marker of one another stack upward from the row's baseline, at
     one spacing for the whole row, so that every dot stays visible (DS §4.1: 8-px markers). */
  function stack(p, rows, base, band, pinned) {
    var R = 9.5, order = rows.slice().sort(function (a, b) { return a.fraction - b.fraction || a.index - b.index; });
    var placed = [], top = 0;
    order.forEach(function (r) {
      var X = p.x(r.fraction), L = 0;
      while (placed.some(function (q) { return q.L === L && Math.abs(q.X - X) < R; })) L++;
      placed.push({ r: r, X: X, L: L });
      top = Math.max(top, L);
    });
    var s = top > 0 ? Math.min(R, (band - R) / top) : 0;
    return placed.map(function (q) { return { r: q.r, L: q.L, Y: base - q.L * s, y: p.y.invert(base - q.L * s), pinned: !!pinned }; });
  }
  function drawStrip(p, rows, pinRows, pinB, ctx, recap) {
    var C = TP.chart, g = strip(p, p.phone, !!pinRows);
    /* In the recap's phone layout a dot near 0.1 stands within its own radius of the first tenth's
       edge (a fraction of 0.088 lies 3 px from it), so the dots inside the first tenth are drawn open
       and the header's name says so, as F9.1's phone header ties "(bracket)" to its mark (page 10's
       reader finding 15) */
    var openFirst = !!(recap && p.phone);
    /* the first tenth is about 30 px wide at phone width, too narrow for its name: the name goes to
       (b)'s header there (DS §5.6), and the axis keeps its 0.1 tick (reader 8) */
    C.window(p, 0, 0.1, { kind: 'highlight', id: 'first-tenth', name: p.phone ? (openFirst ? 'first tenth, 0 to 0.1 (open dots)' : 'first tenth, 0 to 0.1') : 'first tenth', phone: p.phone ? { header: true } : { text: ['first', 'tenth'] }, captionNames: true });
    C.window(p, 0.75, 1, { kind: 'highlight', id: 'last-quarter', name: 'last quarter', phone: { text: ['last', 'quarter'] }, captionNames: true });
    var dots = stack(p, rows, g.live, g.band, false);
    if (pinRows) {
      dots = dots.concat(stack(p, pinRows, g.pin, g.pinBand, true));
      C.level(p, 'y', p.y.invert(g.pin - 0.3 * g.pinBand), {
        role: 'reader', text: p.phone ? 'pinned' : ['pinned at', fmt.int(pinB) + ' steps'], series: 'pin-row', key: 'pin-row'
      });
    }
    var xOf = function (d) { return d.r.fraction; }, yOf = function (d) { return d.y; };
    var inFirst = function (d) { return openFirst && zoneOf(d.r) === 'first'; };
    C.markers(p, dots.filter(function (d) { return !d.pinned && !inFirst(d); }), xOf, yOf, { role: 'model', series: 'strip', key: function (d) { return d.r.key; } });
    if (openFirst) C.markers(p, dots.filter(function (d) { return !d.pinned && inFirst(d); }), xOf, yOf, { role: 'model', series: 'strip', fill: 'open', key: function (d) { return d.r.key; } });
    if (pinRows) C.markers(p, dots.filter(function (d) { return d.pinned; }), xOf, yOf, { role: 'model', series: 'strip-pinned', key: function (d) { return d.r.key; } });
    p.el.setAttribute('data-budget', String(rows.length ? rows[0].budget : ''));
    C.place(p, [], ctx || {});
    return dots;
  }

  /* ---------- the draw ---------- */

  function viewOf(state, ctx) {
    if (!state) return null;
    var trials = trialsOf(state.seed);
    /* a transition's frames draw the budget between its ends, as a drag would, so every frame is a
       valid state of the figure (DS §9 rule 1) */
    var B = ctx && ctx.transition ? Math.exp(state.lb) : state.budget;
    var rows = ctx && ctx.transition ? bestRows(trials, B) : state.rows;
    var pinB = ctx && ctx.pin && ctx.pin.values ? ctx.pin.values.budget : null;
    return { B: B, seed: state.seed, trials: trials, rows: rows, pinB: pinB, pinRows: pinB != null ? bestRows(trials, pinB) : null };
  }

  function draw(state, ctx) {
    if (!pa) build(ctx.fig);
    cur = state;
    curCtx = ctx || { hold: false };
    view = viewOf(state, curCtx);
    pa.update();
    pb.update();
  }

  /* ---------- readout, table, quantities ---------- */

  function readout(state) {
    return 'At a budget of ' + fmt.int(state.budget) + ' steps, ' + state.last + ' of the ' + state.n +
      ' trials’ best steps fall in the last quarter of the run and ' + state.first + ' in the first tenth.';
  }

  function table(state, ctx) {
    var trials = trialsOf(state.seed), pinB = ctx && ctx.pin && ctx.pin.values ? ctx.pin.values.budget : null;
    var pinRows = pinB != null ? bestRows(trials, pinB) : null;
    var zone = function (r) { var z = zoneOf(r); return z === 'first' ? 'first tenth' : z === 'last' ? 'last quarter' : ''; };
    var cols = [
      { key: 'trial', label: 'Trial', format: String },
      { key: 'step', label: 'Best step at ' + fmt.int(state.budget) + ' steps', format: fmt.int },
      { key: 'value', label: 'Best validation error', format: fmt.err },
      { key: 'fraction', label: 'Fraction of the budget', format: fmt.frac },
      { key: 'zone', label: 'Window' }
    ];
    if (pinRows) {
      cols.push({ key: 'pstep', label: 'Best step at the pinned ' + fmt.int(pinB) + ' steps', format: fmt.int });
      cols.push({ key: 'pfraction', label: 'Fraction of the pinned budget', format: fmt.frac });
      cols.push({ key: 'pzone', label: 'Window at the pinned budget' });
    }
    return {
      columns: cols,
      rows: state.rows.map(function (r, i) {
        var out = { trial: r.index + 1, step: r.step, value: r.value, fraction: r.fraction, zone: zone(r) };
        if (pinRows) { var q = pinRows[i]; out.pstep = q.step; out.pfraction = q.fraction; out.pzone = zone(q); }
        return out;
      }),
      caption: 'Each trial’s best evaluation at or before a budget of ' + fmt.int(state.budget) + ' steps, with evaluations every ' +
        fmt.int(M().INTERVAL) + ' steps, seed ' + state.seed + (pinRows ? ', beside the pinned budget of ' + fmt.int(pinB) + ' steps' : '')
    };
  }

  function quantities(state, ctx) {
    var q = {
      budget: state.budget, 'first-tenth': +state.first, 'last-quarter': +state.last, trials: +state.n,
      'pinned-budget': ctx && ctx.pin && ctx.pin.values ? ctx.pin.values.budget : null
    };
    var cq = CAL.quantities || {};
    ['model', 'seed'].forEach(function (setting) {
      var m = cq[setting] || {};
      Object.keys(m).forEach(function (name) { if (q[name] === undefined) q[name] = m[name]; });
    });
    return q;
  }

  function init(element) {
    var list = M().budgets();
    fig = TP.fig(element, {
      kind: 'fixed',
      params: {
        budget: {
          type: 'number', default: CAL.defaults.budget, domain: [list[0], list[list.length - 1]], snap: list, scale: 'log',
          change: 'transition', ghost: false, label: 'Step budget, max_train_steps', control: 'handle', handle: 'a', format: fmt.int,
          encode: function (v) { return String(v); }
        }
      },
      seed: CAL.seed,
      /* The three named budgets are ledger states and the guided tour's steps (post07 review): as
         preset buttons they duplicated the tour and doubled the height of the controls. */
      states: {
        'provisional-budget': { budget: CAL.presets['provisional-budget'].budget },
        'all-first-tenth': { budget: CAL.presets['all-first-tenth'].budget },
        'all-last-quarter': { budget: CAL.presets['all-last-quarter'].budget }
      },
      prepare: function () { trialsOf(CAL.seed); },
      apply: apply,
      draw: draw,
      readout: readout,
      table: table,
      quantities: quantities
    });
  }

  /* ============================== the recap (§6.24, R7) ============================== */

  /* TP.recaps['F8.2:strip']: panel (b) alone, at the budget its setting names (the provisional budget
     by default) and at the default seed, or setting.seed. No controls, no pin, no reading. */
  TP.recaps['F8.2:strip'] = function (el, setting) {
    setting = setting || {};
    var list = M().budgets();
    var B = setting.budget ? TP.chart.snap(+setting.budget, list, { log: true, min: list[0], max: list[list.length - 1] }) : CAL.defaults.budget;
    var seed = setting.seed ? (+setting.seed >>> 0) : CAL.seed;
    /* the recap's header carries no number (PW §10 item 17): the caption names the budget */
    var p = buildStrip(el, { recap: true });
    p.update(function (q) { drawStrip(q, bestRows(trialsOf(seed), B), null, null, {}, true); });
  };

  document.addEventListener('tp:ready', function () {
    var el = document.getElementById(ID);
    if (el) init(el);
  });
})();
