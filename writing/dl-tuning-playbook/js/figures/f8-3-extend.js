/*
 * f8-3-extend.js: figure F8.3, extending a schedule (fig-extend).
 *
 * Work order: notes/revamp/implementation-plan.md §6.18 (WO-F8.3), with §6.0. Entry:
 * notes/revamp/figure-plan.md F8.3, and review/synthesis.md R11. Design: notes/revamp/design-system.md
 * §3.4, §3.5, §4, §5 and §9. Revised in the November 2026 review (post07): a fixed figure
 * (fig l-wide) with one slider, the Round 2 length k from 1.5 to 8 Round 1 lengths, a readout, and
 * the schedules computed from TP.schedules at the current k. CAL keeps the default state (k = 4)
 * and the caption's quantities. It draws the playbook's Round 2 advice (README L1346-L1352) and the pitfall
 * the playbook names (L1287-L1288) as closed-form shapes.
 *
 * The model. TP.schedules (site/js/lib/schedules.js) in closed form, base rate 1, Round 1 of length 1
 * and Round 2 of length k, with k and Round 1's constant fraction c from CAL.defaults (4 and 0.8,
 * version 1's settings). For each family, TP.schedules.schedule(family, kind, {k, c}) gives Round 1
 * ('round1'), the playbook's extension ('extension': the linear decay keeps its length, L1348-L1349;
 * the cosine stretches to k, L1350-L1352) and the pitfall ('pitfall': Round 1 continued at its final
 * rate, 0, to k). TP.schedules.belowHalf gives the steps each Round 2 schedule spends below half the
 * base rate and their fraction of Round 2. Half the base rate is the site's measure of the
 * playbook's "too small of a learning rate" (L1287-L1288).
 *
 * The panels, one per family, share both axes: x step as a multiple of Round 1's length, 0 to k, and
 * y learning rate as a fraction of the base rate, 0 to 1 (CAL.domains).
 *   (a) linear decay after a constant phase, and (b) cosine decay. Each frame draws Round 1 in context
 *       grey to step 1, the pitfall's continuation from step 1 to k in third gold with open circles,
 *       and the playbook's extension in model blue with filled circles, markers thinned to 24 px
 *       (DS §4.2) on the rows of CAL.tables.schedules. On [0, 1] the pitfall is Round 1 itself, so
 *       its gold line starts where Round 1 ends. Half the base rate is a dashed limit named on the y
 *       axis, "half the base rate (ours)".
 *   Under each frame a strip (its own panel, data-panel "a-below" or "b-below", on the frame's x
 *   pixel range) marks, one row per Round 2 schedule, the steps below half the base rate: a filled
 *   model-blue bar for the extension and an open third-gold bar for the pitfall, so that the rows
 *   differ by fill as well as by hue (DS §2.3 rule 4), with the fraction of Round 2 printed at each
 *   row's end in the row's label tone. The strips keep the two schedules' regions apart where they
 *   overlap (WO-F8.3, plan's decision).
 *   From 900 px the families sit side by side as small multiples (DS §3.5 item 7): one y axis on (a),
 *   and a first grid column that gives (a) the width of its y axis, so that both frames take one
 *   pixel range (fig-extend.css). Below 900 px they stack, each with its own axes.
 *
 * No parameter, preset or seed. The data table lists the four Round 2 schedules at the 50 steps of
 * CAL.tables.schedules.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};

  /* BEGIN GENERATED table-cal */
  // From tests/calibration/out/fig-extend.json by npm run generate (tests/lib/write-generated.js).
  var CAL = {
    "defaults": {"k": 4, "c": 0.8},
    "presets": {},
    "states": {},
    "domains": {"a": {"x": [0, 4], "y": [0, 1]}, "b": {"x": [0, 4], "y": [0, 1]}},
    "tables": {
      "schedules": [
        {
          "t": 0,
          "linear:round1": 1,
          "linear:extension": 1,
          "linear:pitfall": 1,
          "cosine:round1": 1,
          "cosine:extension": 1,
          "cosine:pitfall": 1
        },
        {
          "t": 0.08163265306122448,
          "linear:round1": 1,
          "linear:extension": 1,
          "linear:pitfall": 1,
          "cosine:round1": 0.9836474315195147,
          "cosine:extension": 0.9989726963751682,
          "cosine:pitfall": 0.9836474315195147
        },
        {
          "t": 0.16326530612244897,
          "linear:round1": 1,
          "linear:extension": 1,
          "linear:pitfall": 1,
          "cosine:round1": 0.9356593520616947,
          "cosine:extension": 0.995895006911623,
          "cosine:pitfall": 0.9356593520616947
        },
        {
          "t": 0.24489795918367346,
          "linear:round1": 1,
          "linear:extension": 1,
          "linear:pitfall": 1,
          "cosine:round1": 0.8591746750488638,
          "cosine:extension": 0.9907795784955327,
          "cosine:pitfall": 0.8591746750488638
        },
        {
          "t": 0.32653061224489793,
          "linear:round1": 1,
          "linear:extension": 1,
          "linear:pitfall": 1,
          "cosine:round1": 0.7591962841552626,
          "cosine:extension": 0.9836474315195147,
          "cosine:pitfall": 0.7591962841552626
        },
        {
          "t": 0.40816326530612246,
          "linear:round1": 1,
          "linear:extension": 1,
          "linear:pitfall": 1,
          "cosine:round1": 0.6422637933155162,
          "cosine:extension": 0.9745278735053343,
          "cosine:pitfall": 0.6422637933155162
        },
        {
          "t": 0.4897959183673469,
          "linear:round1": 1,
          "linear:extension": 1,
          "linear:pitfall": 1,
          "cosine:round1": 0.5160257887858277,
          "cosine:extension": 0.9634583786730109,
          "cosine:pitfall": 0.5160257887858277
        },
        {
          "t": 0.5714285714285714,
          "linear:round1": 1,
          "linear:extension": 1,
          "linear:pitfall": 1,
          "cosine:round1": 0.38873953302184283,
          "cosine:extension": 0.9504844339512095,
          "cosine:pitfall": 0.38873953302184283
        },
        {
          "t": 0.6530612244897959,
          "linear:round1": 1,
          "linear:extension": 1,
          "linear:pitfall": 1,
          "cosine:round1": 0.2687308548795825,
          "cosine:extension": 0.9356593520616947,
          "cosine:pitfall": 0.2687308548795825
        },
        {
          "t": 0.7346938775510204,
          "linear:round1": 1,
          "linear:extension": 1,
          "linear:pitfall": 1,
          "cosine:round1": 0.16384955486934155,
          "cosine:extension": 0.9190440524459202,
          "cosine:pitfall": 0.16384955486934155
        },
        {
          "t": 0.8163265306122449,
          "linear:round1": 0.9183673469387756,
          "linear:extension": 1,
          "linear:pitfall": 0.9183673469387756,
          "cosine:round1": 0.0809559475540797,
          "cosine:extension": 0.9007068109339783,
          "cosine:pitfall": 0.0809559475540797
        },
        {
          "t": 0.8979591836734694,
          "linear:round1": 0.5102040816326532,
          "linear:extension": 1,
          "linear:pitfall": 0.5102040816326532,
          "cosine:round1": 0.02547212649466568,
          "cosine:extension": 0.8807229791845672,
          "cosine:pitfall": 0.02547212649466568
        },
        {
          "t": 0.9795918367346939,
          "linear:round1": 0.10204081632653075,
          "linear:extension": 1,
          "linear:pitfall": 0.10204081632653075,
          "cosine:round1": 0.0010273036248318324,
          "cosine:extension": 0.8591746750488638,
          "cosine:pitfall": 0.0010273036248318324
        },
        {
          "t": 1.0612244897959184,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.8361504451306584,
          "cosine:pitfall": 0
        },
        {
          "t": 1.1428571428571428,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.8117449009293668,
          "cosine:pitfall": 0
        },
        {
          "t": 1.2244897959183674,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.7860583300610848,
          "cosine:pitfall": 0
        },
        {
          "t": 1.3061224489795917,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.7591962841552626,
          "cosine:pitfall": 0
        },
        {
          "t": 1.3877551020408163,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.7312691451204177,
          "cosine:pitfall": 0
        },
        {
          "t": 1.469387755102041,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.7023916715611969,
          "cosine:pitfall": 0
        },
        {
          "t": 1.5510204081632653,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.6726825272106538,
          "cosine:pitfall": 0
        },
        {
          "t": 1.6326530612244898,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.6422637933155162,
          "cosine:pitfall": 0
        },
        {
          "t": 1.7142857142857142,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.6112604669781572,
          "cosine:pitfall": 0
        },
        {
          "t": 1.7959183673469388,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.5797999475166896,
          "cosine:pitfall": 0
        },
        {
          "t": 1.8775510204081634,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.5480115129538409,
          "cosine:pitfall": 0
        },
        {
          "t": 1.9591836734693877,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.5160257887858277,
          "cosine:pitfall": 0
        },
        {
          "t": 2.0408163265306123,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.4839742112141724,
          "cosine:pitfall": 0
        },
        {
          "t": 2.122448979591837,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.4519884870461591,
          "cosine:pitfall": 0
        },
        {
          "t": 2.204081632653061,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.4202000524833105,
          "cosine:pitfall": 0
        },
        {
          "t": 2.2857142857142856,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.38873953302184283,
          "cosine:pitfall": 0
        },
        {
          "t": 2.36734693877551,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.3577362066844838,
          "cosine:pitfall": 0
        },
        {
          "t": 2.4489795918367347,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.32731747278934625,
          "cosine:pitfall": 0
        },
        {
          "t": 2.5306122448979593,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.2976083284388031,
          "cosine:pitfall": 0
        },
        {
          "t": 2.6122448979591835,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.2687308548795825,
          "cosine:pitfall": 0
        },
        {
          "t": 2.693877551020408,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.24080371584473748,
          "cosine:pitfall": 0
        },
        {
          "t": 2.7755102040816326,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.21394166993891528,
          "cosine:pitfall": 0
        },
        {
          "t": 2.857142857142857,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.18825509907063326,
          "cosine:pitfall": 0
        },
        {
          "t": 2.938775510204082,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.16384955486934155,
          "cosine:pitfall": 0
        },
        {
          "t": 3.020408163265306,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.14082532495113625,
          "cosine:pitfall": 0
        },
        {
          "t": 3.1020408163265305,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.11927702081543279,
          "cosine:pitfall": 0
        },
        {
          "t": 3.183673469387755,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.09929318906602175,
          "cosine:pitfall": 0
        },
        {
          "t": 3.2653061224489797,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.0809559475540797,
          "cosine:pitfall": 0
        },
        {
          "t": 3.3469387755102042,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.0643406479383053,
          "cosine:pitfall": 0
        },
        {
          "t": 3.4285714285714284,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.04951556604879048,
          "cosine:pitfall": 0
        },
        {
          "t": 3.510204081632653,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.03654162132698918,
          "cosine:pitfall": 0
        },
        {
          "t": 3.5918367346938775,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.02547212649466568,
          "cosine:pitfall": 0
        },
        {
          "t": 3.673469387755102,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.016352568480485274,
          "cosine:pitfall": 0
        },
        {
          "t": 3.7551020408163267,
          "linear:round1": null,
          "linear:extension": 1,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.00922042150446728,
          "cosine:pitfall": 0
        },
        {
          "t": 3.836734693877551,
          "linear:round1": null,
          "linear:extension": 0.816326530612246,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.004104993088376974,
          "cosine:pitfall": 0
        },
        {
          "t": 3.9183673469387754,
          "linear:round1": null,
          "linear:extension": 0.408163265306123,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0.0010273036248318324,
          "cosine:pitfall": 0
        },
        {
          "t": 4,
          "linear:round1": null,
          "linear:extension": 0,
          "linear:pitfall": 0,
          "cosine:round1": null,
          "cosine:extension": 0,
          "cosine:pitfall": 0
        }
      ],
      "below": {
        "linear:round1": [[0.9, 1]],
        "linear:extension": [[3.9, 4]],
        "linear:pitfall": [[0.9, 4]],
        "cosine:round1": [[0.5, 1]],
        "cosine:extension": [[2, 4]],
        "cosine:pitfall": [[0.5, 4]]
      }
    },
    "quantities": {
      "model": {
        "factor": 4,
        "constant-fraction": 0.8,
        "linear-extension-below": 0.025000000000000022,
        "linear-pitfall-below": 0.775,
        "cosine-extension-below": 0.5,
        "cosine-pitfall-below": 0.875
      }
    }
  };
  /* END GENERATED table-cal */

  var ID = 'fig-extend';
  var CF = CAL.defaults.c;
  var K_MIN = 1.5, K_MAX = 8, K_STEP = 0.5, N_ROWS = 50;
  var FAMILIES = ['linear', 'cosine'];
  var LETTER = { linear: 'a', cosine: 'b' };
  var NOTE = { linear: 'linear decay after a constant phase', cosine: 'cosine decay' };
  var HALF = 0.5;
  /* the widths of the frames' margins, in px (fig-extend.css reads Y_AXIS - GAP as --ext-yaxis) */
  var Y_AXIS = { desktop: 84, phone: 66 };
  var GAP = 18;
  var FRAC_MARGIN = { desktop: 50, phone: 46 };

  function by(name) { return TP.fmt.byName(name); }
  function frac(v) { return by('sig3')(v); }
  /* html.tp-print is laid out as a 680-px viewport, the paper's column (design-system.md §6.7), so
     the families stack in print whatever the screen's width */
  function sideBySide() {
    if (document.documentElement.classList.contains('tp-print')) return false;
    return window.matchMedia && window.matchMedia('(min-width: 900px)').matches;
  }

  /* ============================== the model ============================== */

  /** The line of one schedule: exact vertices for the piecewise-linear family, 241 samples for the
      cosine, over [from, to]. */
  function curve(family, kind, from, to, K) {
    var s = TP.schedules.schedule(family, kind, { k: K, c: CF }), pts = [];
    if (family === 'linear') {
      var xs = [from, to];
      var D = 1 - CF, L = s.length;
      [L - D, L, 1 - D, 1].forEach(function (t) { if (t > from && t < to) xs.push(t); });
      xs.sort(function (a, b) { return a - b; });
      xs.forEach(function (t) { pts.push({ t: t, r: s.rate(t) }); });
    } else {
      for (var i = 0; i <= 240; i++) { var t = from + (to - from) * i / 240; pts.push({ t: t, r: s.rate(t) }); }
    }
    return pts;
  }

  /** The derived state. Every array's rows carry a key (DS §9). */
  function apply(values) {
    var K = values.k;
    var S = TP.schedules, o = { k: K, c: CF };
    var fam = {};
    FAMILIES.forEach(function (f) {
      var ext = S.belowHalf(f, 'extension', o), pit = S.belowHalf(f, 'pitfall', o);
      fam[f] = {
        family: f,
        round1: curve(f, 'round1', 0, 1, K),
        pitfall: curve(f, 'pitfall', 1, K, K),
        extension: curve(f, 'extension', 0, K, K),
        below: {
          extension: { key: f + '-extension', fraction: ext.fraction, intervals: ext.intervals },
          pitfall: { key: f + '-pitfall', fraction: pit.fraction, intervals: pit.intervals }
        }
      };
    });
    /* the 50 evenly spaced steps of Round 2 that the markers and the data table use */
    var sch = {};
    FAMILIES.forEach(function (f) {
      sch[f] = { ext: S.schedule(f, 'extension', o).rate, pit: S.schedule(f, 'pitfall', o).rate };
    });
    var rows = [];
    for (var i = 0; i < N_ROWS; i++) {
      var t = K * i / (N_ROWS - 1);
      rows.push({ key: 't' + i, t: t, linExt: sch.linear.ext(t), linPit: sch.linear.pit(t), cosExt: sch.cosine.ext(t), cosPit: sch.cosine.pit(t) });
    }
    return { k: K, c: CF, half: HALF, families: fam, rows: rows };
  }

  /* ============================== the figure ============================== */

  var P = {}, cur = null, curCtx = null;

  function marginsOf(family, strip) {
    return function (w, phone) {
      var inner = family === 'cosine' && !phone && sideBySide();
      var l = inner ? GAP : (phone ? Y_AXIS.phone : Y_AXIS.desktop);
      var r = phone ? FRAC_MARGIN.phone : FRAC_MARGIN.desktop;
      /* a strip's bottom margin holds its tick labels and, on its own line under them, the axis
         title: at 34 px the title's line met the tick labels' in the phone layout, and below
         390 px their glyphs overlapped (accessibility finding Z5) */
      return strip ? { t: 4, r: r, b: 44, l: l } : { t: 10, r: r, b: 10, l: l };
    };
  }
  function innerOf(family) {
    return function (phone) { return family === 'cosine' && !phone && sideBySide(); };
  }
  function xTicks(dom) { var out = [], hi = dom ? Math.max(dom[0], dom[1]) : 4; for (var i = 0; i <= hi + 1e-9; i++) out.push(i); return out; }

  function frameOpts(family) {
    var L = LETTER[family], dom = CAL.domains[L];
    var m = marginsOf(family, false);
    return {
      letter: '(' + L + ')', key: L,
      describe: 'learning rate against step, ' + NOTE[family],
      note: NOTE[family],
      xDomain: dom.x.slice(), yDomain: dom.y.slice(),
      xTicks: xTicks, xFormat: function () { return ''; }, xLabel: '',
      yTicks: [0, 1], yFormat: function (v) { return String(v); },
      yLabel: function (p) { return p.phone ? 'rate / base rate' : 'learning rate / base rate'; },
      inner: innerOf(family),
      aspect: function (w, phone) {
        var mm = m(w, phone), plot = phone ? 128 : Math.min(210, Math.max(150, 0.5 * (w - mm.l - mm.r)));
        return (plot + mm.t + mm.b) / Math.max(w, 1);
      },
      margin: m
    };
  }
  function stripOpts(family) {
    var L = LETTER[family], dom = CAL.domains[L];
    var m = marginsOf(family, true);
    return {
      key: L + '-below',
      describe: '(' + L + ') steps each Round 2 schedule spends below half the base rate',
      xDomain: dom.x.slice(), yDomain: [0, 2],
      xTicks: xTicks, xFormat: function (v) { return String(v); },
      xLabel: 'step / Round 1’s length',
      yTicks: 'none', grid: 'none',
      inner: function () { return false; },
      aspect: function (w, phone) {
        var mm = m(w, phone), plot = phone ? 30 : 34;
        return (plot + mm.t + mm.b) / Math.max(w, 1);
      },
      margin: m
    };
  }

  /* the rows of a strip, as fractions of its y domain [0, 2]: the extension above, the pitfall below */
  var ROW = { extension: [1.12, 1.88], pitfall: [0.12, 0.88] };
  var ROLE = { extension: 'model', pitfall: 'third' };

  function drawFrame(p, family) {
    var C = TP.chart, s = cur;
    if (!s) return;
    var f = s.families[family];
    var T = function (q) { return q.t; }, R = function (q) { return q.r; };
    /* the limit the site states: half the base rate, dashed, named on the y axis (DS §4.7, §5.5) */
    if (innerOf(family)(p.phone)) C.ref(p, { y: s.half }, { kind: 'limit' });
    else C.level(p, 'y', s.half, { role: 'ref', line: true, text: p.phone ? ['half'] : ['half the', 'base rate'] });
    /* Round 1 in context grey, then the two Round 2 schedules, the extension above the pitfall */
    C.line(p, f.round1, T, R, { role: 'context', series: 'round1', key: family + '-round1' });
    C.line(p, f.pitfall, T, R, { role: 'third', series: 'pitfall', key: family + '-pitfall' });
    C.line(p, f.extension, T, R, { role: 'model', series: 'extension', key: family + '-extension' });
    /* markers on the table's steps, thinned to 24 px; the pitfall's from step 1, and without its
       last step, where the extension's last marker stands at the same point */
    var colPit = family === 'linear' ? 'linPit' : 'cosPit', colExt = family === 'linear' ? 'linExt' : 'cosExt';
    var pitRows = s.rows.filter(function (r, i) { return r.t >= 1 && i < s.rows.length - 1; });
    C.markers(p, pitRows, function (r) { return r.t; }, function (r) { return r[colPit]; },
      { role: 'third', series: 'pitfall', shape: 'circle', fill: 'open', thin: 24, key: function (r) { return family + '-pitfall-' + r.key; } });
    C.markers(p, s.rows, function (r) { return r.t; }, function (r) { return r[colExt]; },
      { role: 'model', series: 'extension', shape: 'circle', fill: 'filled', thin: 24, key: function (r) { return family + '-extension-' + r.key; } });
    /* the direct labels (WO-F8.3) */
    C.place(p, LABELS.map(function (Lb) {
      return { id: Lb.id, text: Lb.text, role: Lb.role, series: Lb.id, tone: Lb.tone, feature: featureOf(f, Lb.id),
        phone: Lb.phone ? { text: Lb.phone } : undefined, captionNames: true, keySentence: Lb.id !== 'round1' };
    }), curCtx || {});
  }
  /* The two Round 2 labels name their lines. Round 1's label names the point where Round 1 runs at a
     quarter of the base rate, below the limit line, where it stands apart from both Round 2
     schedules: the linear Round 1's constant phase lies under the extension, its decay is too steep
     for a label above or below it, and the cosine Round 1 spans one unit of the step axis, about
     60 px on a phone. */
  var ROUND1_AT = 0.25;
  function featureOf(f, id) {
    if (id !== 'round1') return { type: 'line', of: id };
    var t = f.family === 'linear' ? 1 - ROUND1_AT * (1 - CF) : Math.acos(2 * ROUND1_AT - 1) / Math.PI;
    return { type: 'point', x: t, y: ROUND1_AT, r: 0 };
  }
  var LABELS = [
    { id: 'round1', text: 'Round 1', role: 'context', tone: 'ink' },
    { id: 'pitfall', text: 'the pitfall, Round 1 continued', role: 'third', phone: 'pitfall' },
    { id: 'extension', text: 'the Playbook’s extension', role: 'model', phone: 'extension' }
  ];

  function drawStrip(p, family) {
    var C = TP.chart, s = cur;
    if (!s) return;
    var f = s.families[family];
    ['extension', 'pitfall'].forEach(function (kind) {
      var b = f.below[kind], row = ROW[kind];
      C.bars(p, b.intervals.map(function (iv, i) { return { key: b.key + '-' + i, x0: iv[0], x1: iv[1], y: row[1] }; }),
        { role: ROLE[kind], series: kind, base: row[0], gap: 0, fill: kind === 'pitfall' ? 'open' : 'filled', key: function (r) { return r.key; } });
      /* the pitfall's bar is open (a 2-px edge in its token on the surface), the extension's filled */
      /* the fraction of Round 2 at the row's end, in the row's label tone */
      p.layers.marks.append('text').attr('class', 'label frac r-' + ROLE[kind])
        .attr('data-frac', b.key).attr('text-anchor', 'start')
        .attr('x', (p.width + 6).toFixed(2)).attr('y', p.y((row[0] + row[1]) / 2).toFixed(2)).attr('dy', '0.35em')
        .text(TP.fmt.byName('sig3')(100 * b.fraction) + '%');
    });
    p.el.setAttribute('data-fractions', JSON.stringify({ extension: f.below.extension.fraction, pitfall: f.below.pitfall.fraction }));
  }

  function draw(state, ctx) {
    if (!P.a) {
      FAMILIES.forEach(function (family) {
        var L = LETTER[family];
        P[L] = TP.chart.panel(ctx.fig.panels, frameOpts(family));
        P[L + 'Below'] = TP.chart.panel(ctx.fig.panels, stripOpts(family));
        P[L].update(function (q) { drawFrame(q, family); });
        P[L + 'Below'].update(function (q) { drawStrip(q, family); });
      });
    }
    cur = state;
    curCtx = ctx ? { hold: !!ctx.hold } : {};
    /* the step axis runs over Round 2, so it follows k */
    if (state) ['a', 'aBelow', 'b', 'bBelow'].forEach(function (k) { P[k].x.domain([0, state.k]); });
    ['a', 'aBelow', 'b', 'bBelow'].forEach(function (k) { P[k].update(); });
  }

  function table(state) {
    var f3 = by('fixed3');
    var cols = [
      { key: 't', label: 'Step / Round 1’s length', format: f3 },
      { key: 'linExt', label: 'Linear, playbook’s extension', format: f3 },
      { key: 'linPit', label: 'Linear, the pitfall', format: f3 },
      { key: 'cosExt', label: 'Cosine, playbook’s extension', format: f3 },
      { key: 'cosPit', label: 'Cosine, the pitfall', format: f3 }
    ];
    var iv = function (b) { return b.intervals.map(function (x) { return f3(x[0]) + ' to ' + f3(x[1]); }).join(', '); };
    var L = state.families.linear.below, Cs = state.families.cosine.below;
    return {
      columns: cols,
      rows: state.rows.map(function (r) { return { t: r.t, linExt: r.linExt, linPit: r.linPit, cosExt: r.cosExt, cosPit: r.cosPit }; }),
      caption: 'Learning rate as a fraction of the base rate at 50 evenly spaced steps of Round 2, which is ' + by('sig3')(state.k) +
        ' times as long as Round 1. Up to step 1 each pitfall equals its Round 1. Below half the base rate: linear extension ' +
        iv(L.extension) + ' (' + frac(L.extension.fraction) + ' of Round 2), linear pitfall ' + iv(L.pitfall) + ' (' + frac(L.pitfall.fraction) +
        '), cosine extension ' + iv(Cs.extension) + ' (' + frac(Cs.extension.fraction) + '), cosine pitfall ' + iv(Cs.pitfall) +
        ' (' + frac(Cs.pitfall.fraction) + ').'
    };
  }

  function quantities(state) {
    var F = state.families;
    return {
      factor: state.k,
      'constant-fraction': state.c,
      'linear-extension-below': F.linear.below.extension.fraction,
      'linear-pitfall-below': F.linear.below.pitfall.fraction,
      'cosine-extension-below': F.cosine.below.extension.fraction,
      'cosine-pitfall-below': F.cosine.below.pitfall.fraction
    };
  }

  function pct(v) { return TP.fmt.byName('sig3')(100 * v) + '%'; }
  function readout(state) {
    var L = state.families.linear.below, Cs = state.families.cosine.below;
    return 'With Round 2 ' + by('sig3')(state.k) + ' times as long as Round 1, the linear extension spends ' + pct(L.extension.fraction) +
      ' of Round 2 below half the base rate and its pitfall ' + pct(L.pitfall.fraction) + '. The stretched cosine spends ' +
      pct(Cs.extension.fraction) + ' and its pitfall ' + pct(Cs.pitfall.fraction) + '.';
  }

  function init(element) {
    TP.fig(element, {
      kind: 'fixed',
      params: {
        k: {
          type: 'number', default: CAL.defaults.k, domain: [K_MIN, K_MAX], snap: K_STEP, change: 'cut', ghost: false,
          label: 'Round 2 length, in Round 1 lengths', control: 'slider',
          format: function (v) { return by('sig3')(v) + '×'; }
        }
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
    if (el && TP.schedules && TP.chart) init(el);
  });
})();
