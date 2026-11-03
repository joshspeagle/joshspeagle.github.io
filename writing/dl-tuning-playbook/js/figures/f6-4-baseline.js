/*
 * f6-4-baseline.js: figure F6.4, the fair and the unfair baseline (fig-baseline).
 *
 * Work order: notes/revamp/implementation-plan.md §6.14 (WO-F6.4), with §6.0. Entry:
 * notes/revamp/figure-plan.md F6.4, and review/synthesis.md R2. Design: notes/revamp/design-system.md
 * §3.4, §3.5, §4, §5 and §9. A static figure (fig static l-wide) with no controls, no readout and
 * no recap. The claim it draws is the playbook's (README L1024-L1027); the shapes are the site's.
 *
 * The model. TP.baseline (site/js/lib/baseline.js), shapes only: two parabolas of validation error
 * in u = log10(learning rate), one for the best weight decay ('wd') and one for no weight decay
 * ('none'), each with a noise band of half-width CAL.shapes.band. The curves are drawn from
 * CAL.tables.curves (121 rows over u from -4 to -1), and the optima, the band and the preferred
 * rates come from CAL.shapes, which tests/calibration/fig-baseline.calibrate.js wrote. The baseline's
 * best within the preferred rates is TP.baseline.bestWithin at CAL.shapes.preferred.
 *
 * The panels share both axes: x learning rate, log 10, and y validation error, over CAL.domains.
 *   (a) the baseline tuned equally well. Both curves in their tokens (model blue for the best
 *       weight decay, third gold for no weight decay), each over its band as the opaque tint, with
 *       markers on a subset of each curve (DS §4.2: filled circles for the first condition, open
 *       circles for the second), and each curve's optimum ringed (DS §4.4). A bracket on the y axis
 *       spans the two optima, "within the band".
 *   (b) the baseline at the weight-decay study's rates. The same curves and bands, the preferred
 *       rates as a bracket on the x axis, "rates the weight-decay study preferred" (phone "preferred
 *       rates"), the weight-decay optimum and the baseline's best within the preferred rates ringed,
 *       and a bracket on the y axis over their difference, "outside the band".
 *   Direct labels "best weight decay" and "no weight decay" name the curves in both panels.
 *
 * No parameter, preset or seed. The data table lists both curves at every sampled rate.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};

  /* BEGIN GENERATED table-cal */
  // From tests/calibration/out/fig-baseline.json by npm run generate (tests/lib/write-generated.js).
  var CAL = {
    "defaults": {},
    "presets": {},
    "states": {},
    "shapes": {
      "uWd": -2.5,
      "eWd": 0.23,
      "uNone": -1.9,
      "eNone": 0.2305,
      "curvature": 0.06,
      "band": 0.001,
      "preferred": [-2.6, -2.4],
      "axis": [-4, -1]
    },
    "domains": {"a": {"x": [0.0001, 0.1], "y": [0.21, 0.27]}, "b": {"x": [0.0001, 0.1], "y": [0.21, 0.27]}},
    "tables": {
      "curves": [
        {"u": -4, "lr": 0.00009999999999999999, "wd": 0.365, "none": 0.4951},
        {"u": -3.975, "lr": 0.00010592537251772886, "wd": 0.3605375, "none": 0.48883750000000004},
        {"u": -3.95, "lr": 0.0001122018454301963, "wd": 0.3561500000000001, "none": 0.48265},
        {"u": -3.925, "lr": 0.00011885022274370189, "wd": 0.35183749999999997, "none": 0.4765375},
        {"u": -3.9, "lr": 0.00012589254117941674, "wd": 0.3476, "none": 0.47050000000000003},
        {"u": -3.875, "lr": 0.0001333521432163324, "wd": 0.3434375, "none": 0.46453750000000005},
        {
          "u": -3.85,
          "lr": 0.0001412537544622754,
          "wd": 0.33935000000000004,
          "none": 0.45865000000000006
        },
        {"u": -3.825, "lr": 0.00014962356560944327, "wd": 0.3353375, "none": 0.45283750000000006},
        {"u": -3.8, "lr": 0.00015848931924611142, "wd": 0.3314, "none": 0.44709999999999994},
        {"u": -3.775, "lr": 0.00016788040181225607, "wd": 0.3275375, "none": 0.4414375},
        {"u": -3.75, "lr": 0.0001778279410038923, "wd": 0.32375, "none": 0.43585},
        {
          "u": -3.725,
          "lr": 0.00018836490894898,
          "wd": 0.32003750000000003,
          "none": 0.43033750000000004
        },
        {"u": -3.7, "lr": 0.00019952623149688788, "wd": 0.3164, "none": 0.42490000000000006},
        {"u": -3.675, "lr": 0.00021134890398366476, "wd": 0.3128375, "none": 0.4195375},
        {"u": -3.65, "lr": 0.000223872113856834, "wd": 0.30935, "none": 0.41425},
        {"u": -3.625, "lr": 0.00023713737056616554, "wd": 0.30593750000000003, "none": 0.4090375},
        {
          "u": -3.6,
          "lr": 0.00025118864315095795,
          "wd": 0.30260000000000004,
          "none": 0.40390000000000004
        },
        {
          "u": -3.575,
          "lr": 0.00026607250597988083,
          "wd": 0.29933750000000003,
          "none": 0.39883750000000007
        },
        {"u": -3.55, "lr": 0.0002818382931264455, "wd": 0.29614999999999997, "none": 0.39385},
        {"u": -3.525, "lr": 0.000298538261891796, "wd": 0.2930375, "none": 0.38893750000000005},
        {"u": -3.5, "lr": 0.00031622776601683794, "wd": 0.29000000000000004, "none": 0.3841},
        {"u": -3.475, "lr": 0.0003349654391578276, "wd": 0.2870375, "none": 0.3793375},
        {"u": -3.45, "lr": 0.0003548133892335753, "wd": 0.28415, "none": 0.37465000000000004},
        {"u": -3.425, "lr": 0.0003758374042884443, "wd": 0.2813375, "none": 0.3700375},
        {"u": -3.4, "lr": 0.0003981071705534973, "wd": 0.2786, "none": 0.36550000000000005},
        {"u": -3.375, "lr": 0.00042169650342858224, "wd": 0.2759375, "none": 0.3610375},
        {"u": -3.35, "lr": 0.00044668359215096305, "wd": 0.27335000000000004, "none": 0.35665},
        {"u": -3.325, "lr": 0.0004731512589614803, "wd": 0.2708375, "none": 0.3523375},
        {
          "u": -3.3,
          "lr": 0.0005011872336272725,
          "wd": 0.26839999999999997,
          "none": 0.34809999999999997
        },
        {"u": -3.275, "lr": 0.0005308844442309885, "wd": 0.2660375, "none": 0.3439375},
        {
          "u": -3.25,
          "lr": 0.0005623413251903491,
          "wd": 0.26375000000000004,
          "none": 0.33985000000000004
        },
        {"u": -3.225, "lr": 0.0005956621435290103, "wd": 0.26153750000000003, "none": 0.3358375},
        {"u": -3.2, "lr": 0.000630957344480193, "wd": 0.2594, "none": 0.33190000000000003},
        {"u": -3.175, "lr": 0.0006683439175686149, "wd": 0.2573375, "none": 0.3280375},
        {"u": -3.15, "lr": 0.0007079457843841381, "wd": 0.25535, "none": 0.32425000000000004},
        {"u": -3.125, "lr": 0.0007498942093324557, "wd": 0.2534375, "none": 0.32053750000000003},
        {"u": -3.1, "lr": 0.0007943282347242813, "wd": 0.2516, "none": 0.3169},
        {
          "u": -3.075,
          "lr": 0.0008413951416451947,
          "wd": 0.24983750000000002,
          "none": 0.31333750000000005
        },
        {"u": -3.05, "lr": 0.0008912509381337459, "wd": 0.24815, "none": 0.30985},
        {"u": -3.025, "lr": 0.0009440608762859235, "wd": 0.2465375, "none": 0.30643750000000003},
        {"u": -3, "lr": 0.001, "wd": 0.245, "none": 0.30310000000000004},
        {
          "u": -2.975,
          "lr": 0.0010592537251772887,
          "wd": 0.24353750000000002,
          "none": 0.29983750000000003
        },
        {"u": -2.95, "lr": 0.001122018454301963, "wd": 0.24215000000000003, "none": 0.29665},
        {"u": -2.925, "lr": 0.001188502227437019, "wd": 0.2408375, "none": 0.2935375},
        {"u": -2.9, "lr": 0.0012589254117941675, "wd": 0.2396, "none": 0.2905},
        {"u": -2.875, "lr": 0.001333521432163324, "wd": 0.23843750000000002, "none": 0.2875375},
        {"u": -2.85, "lr": 0.0014125375446227542, "wd": 0.23735, "none": 0.28465},
        {"u": -2.825, "lr": 0.0014962356560944327, "wd": 0.2363375, "none": 0.2818375},
        {"u": -2.8, "lr": 0.001584893192461114, "wd": 0.2354, "none": 0.2791},
        {"u": -2.775, "lr": 0.0016788040181225606, "wd": 0.2345375, "none": 0.2764375},
        {"u": -2.75, "lr": 0.0017782794100389228, "wd": 0.23375, "none": 0.27385000000000004},
        {"u": -2.725, "lr": 0.0018836490894898002, "wd": 0.2330375, "none": 0.2713375},
        {
          "u": -2.7,
          "lr": 0.001995262314968879,
          "wd": 0.23240000000000002,
          "none": 0.26890000000000003
        },
        {"u": -2.675, "lr": 0.0021134890398366475, "wd": 0.2318375, "none": 0.2665375},
        {"u": -2.65, "lr": 0.00223872113856834, "wd": 0.23135, "none": 0.26425},
        {
          "u": -2.625,
          "lr": 0.0023713737056616554,
          "wd": 0.23093750000000002,
          "none": 0.26203750000000003
        },
        {"u": -2.6, "lr": 0.0025118864315095794, "wd": 0.2306, "none": 0.2599},
        {"u": -2.575, "lr": 0.0026607250597988083, "wd": 0.2303375, "none": 0.25783750000000005},
        {"u": -2.55, "lr": 0.002818382931264455, "wd": 0.23015000000000002, "none": 0.25585},
        {"u": -2.525, "lr": 0.0029853826189179603, "wd": 0.2300375, "none": 0.25393750000000004},
        {"u": -2.5, "lr": 0.0031622776601683794, "wd": 0.23, "none": 0.2521},
        {"u": -2.475, "lr": 0.003349654391578276, "wd": 0.2300375, "none": 0.25033750000000005},
        {
          "u": -2.45,
          "lr": 0.0035481338923357532,
          "wd": 0.23015000000000002,
          "none": 0.24865000000000004
        },
        {"u": -2.425, "lr": 0.003758374042884443, "wd": 0.2303375, "none": 0.2470375},
        {"u": -2.4, "lr": 0.003981071705534973, "wd": 0.2306, "none": 0.2455},
        {
          "u": -2.375,
          "lr": 0.004216965034285823,
          "wd": 0.23093750000000002,
          "none": 0.24403750000000002
        },
        {"u": -2.35, "lr": 0.0044668359215096305, "wd": 0.23135, "none": 0.24265000000000003},
        {"u": -2.325, "lr": 0.004731512589614803, "wd": 0.2318375, "none": 0.24133750000000004},
        {"u": -2.3, "lr": 0.005011872336272725, "wd": 0.23240000000000002, "none": 0.2401},
        {"u": -2.275, "lr": 0.005308844442309885, "wd": 0.2330375, "none": 0.23893750000000002},
        {"u": -2.25, "lr": 0.005623413251903491, "wd": 0.23375, "none": 0.23785},
        {"u": -2.225, "lr": 0.005956621435290103, "wd": 0.2345375, "none": 0.2368375},
        {"u": -2.2, "lr": 0.00630957344480193, "wd": 0.2354, "none": 0.23590000000000003},
        {"u": -2.175, "lr": 0.006683439175686149, "wd": 0.2363375, "none": 0.2350375},
        {"u": -2.15, "lr": 0.00707945784384138, "wd": 0.23735, "none": 0.23425},
        {"u": -2.125, "lr": 0.007498942093324558, "wd": 0.23843750000000002, "none": 0.2335375},
        {"u": -2.1, "lr": 0.007943282347242814, "wd": 0.2396, "none": 0.23290000000000002},
        {"u": -2.075, "lr": 0.008413951416451947, "wd": 0.2408375, "none": 0.2323375},
        {"u": -2.05, "lr": 0.008912509381337459, "wd": 0.24215000000000003, "none": 0.23185},
        {
          "u": -2.025,
          "lr": 0.009440608762859235,
          "wd": 0.24353750000000002,
          "none": 0.23143750000000002
        },
        {"u": -2, "lr": 0.01, "wd": 0.245, "none": 0.2311},
        {"u": -1.975, "lr": 0.010592537251772886, "wd": 0.2465375, "none": 0.2308375},
        {
          "u": -1.9500000000000002,
          "lr": 0.01122018454301963,
          "wd": 0.24815,
          "none": 0.23065000000000002
        },
        {
          "u": -1.9249999999999998,
          "lr": 0.01188502227437019,
          "wd": 0.24983750000000002,
          "none": 0.2305375
        },
        {"u": -1.9, "lr": 0.012589254117941675, "wd": 0.2516, "none": 0.2305},
        {"u": -1.875, "lr": 0.01333521432163324, "wd": 0.2534375, "none": 0.2305375},
        {"u": -1.85, "lr": 0.01412537544622754, "wd": 0.25535, "none": 0.23065000000000002},
        {"u": -1.8250000000000002, "lr": 0.014962356560944329, "wd": 0.2573375, "none": 0.2308375},
        {"u": -1.7999999999999998, "lr": 0.01584893192461114, "wd": 0.2594, "none": 0.2311},
        {
          "u": -1.775,
          "lr": 0.016788040181225608,
          "wd": 0.26153750000000003,
          "none": 0.23143750000000002
        },
        {"u": -1.75, "lr": 0.01778279410038923, "wd": 0.26375000000000004, "none": 0.23185},
        {"u": -1.725, "lr": 0.018836490894898, "wd": 0.2660375, "none": 0.2323375},
        {
          "u": -1.7000000000000002,
          "lr": 0.01995262314968879,
          "wd": 0.26839999999999997,
          "none": 0.2329
        },
        {"u": -1.6749999999999998, "lr": 0.021134890398366475, "wd": 0.2708375, "none": 0.2335375},
        {"u": -1.65, "lr": 0.0223872113856834, "wd": 0.27335000000000004, "none": 0.23425},
        {"u": -1.625, "lr": 0.02371373705661655, "wd": 0.2759375, "none": 0.2350375},
        {"u": -1.6, "lr": 0.025118864315095794, "wd": 0.2786, "none": 0.2359},
        {"u": -1.5750000000000002, "lr": 0.026607250597988085, "wd": 0.2813375, "none": 0.2368375},
        {"u": -1.5499999999999998, "lr": 0.02818382931264455, "wd": 0.28415, "none": 0.23785},
        {"u": -1.525, "lr": 0.029853826189179603, "wd": 0.2870375, "none": 0.23893750000000002},
        {"u": -1.5, "lr": 0.03162277660168379, "wd": 0.29000000000000004, "none": 0.2401},
        {"u": -1.475, "lr": 0.03349654391578276, "wd": 0.2930375, "none": 0.2413375},
        {
          "u": -1.4500000000000002,
          "lr": 0.03548133892335753,
          "wd": 0.29614999999999997,
          "none": 0.24265
        },
        {
          "u": -1.4249999999999998,
          "lr": 0.03758374042884443,
          "wd": 0.29933750000000003,
          "none": 0.24403750000000002
        },
        {"u": -1.4, "lr": 0.039810717055349734, "wd": 0.30260000000000004, "none": 0.2455},
        {"u": -1.375, "lr": 0.042169650342858224, "wd": 0.30593750000000003, "none": 0.2470375},
        {"u": -1.35, "lr": 0.04466835921509631, "wd": 0.30935, "none": 0.24865},
        {"u": -1.3250000000000002, "lr": 0.04731512589614803, "wd": 0.3128375, "none": 0.2503375},
        {"u": -1.2999999999999998, "lr": 0.05011872336272725, "wd": 0.3164, "none": 0.2521},
        {
          "u": -1.275,
          "lr": 0.053088444423098846,
          "wd": 0.32003750000000003,
          "none": 0.25393750000000004
        },
        {"u": -1.25, "lr": 0.056234132519034905, "wd": 0.32375, "none": 0.25585},
        {"u": -1.225, "lr": 0.059566214352901034, "wd": 0.3275375, "none": 0.2578375},
        {
          "u": -1.2000000000000002,
          "lr": 0.0630957344480193,
          "wd": 0.3314,
          "none": 0.25989999999999996
        },
        {
          "u": -1.1749999999999998,
          "lr": 0.06683439175686148,
          "wd": 0.3353375,
          "none": 0.26203750000000003
        },
        {"u": -1.15, "lr": 0.0707945784384138, "wd": 0.33935000000000004, "none": 0.26425},
        {"u": -1.125, "lr": 0.07498942093324558, "wd": 0.3434375, "none": 0.2665375},
        {"u": -1.1, "lr": 0.07943282347242814, "wd": 0.3476, "none": 0.2689},
        {
          "u": -1.0750000000000002,
          "lr": 0.08413951416451948,
          "wd": 0.35183749999999997,
          "none": 0.2713375
        },
        {
          "u": -1.0499999999999998,
          "lr": 0.08912509381337459,
          "wd": 0.3561500000000001,
          "none": 0.27385000000000004
        },
        {"u": -1.025, "lr": 0.09440608762859236, "wd": 0.3605375, "none": 0.2764375},
        {"u": -1, "lr": 0.1, "wd": 0.365, "none": 0.2791}
      ]
    },
    "quantities": {
      "model": {
        "curvature": 0.06,
        "band": 0.001,
        "tie": 0.0005000000000000004,
        "false-win": 0.015499999999999986,
        "wd-best-lr": 0.0031622776601683794,
        "wd-best-error": 0.23,
        "none-best-lr": 0.012589254117941675,
        "none-best-error": 0.2305,
        "preferred-lo": 0.0025118864315095794,
        "preferred-hi": 0.003981071705534973,
        "unfair-best-error": 0.2455
      }
    }
  };
  /* END GENERATED table-cal */

  var ID = 'fig-baseline';
  var SH = CAL.shapes;
  var ROWS = CAL.tables.curves;

  function pow10(u) { return Math.pow(10, u); }
  function by(name) { return TP.fmt.byName(name); }
  function decade(v) { return TP.fmt.exp10(Math.round(Math.log(v) / Math.LN10)); }
  function near(a, b) { return Math.abs(a - b) < 1e-9; }

  /* ============================== the model ============================== */

  /** The derived state. Every array's rows carry a key (DS §9). */
  function apply() {
    var B = TP.baseline;
    var wd = { u: SH.uWd, e: SH.eWd }, none = { u: SH.uNone, e: SH.eNone };
    var unfair = B.bestWithin('none', SH.preferred[0], SH.preferred[1]);
    return {
      band: SH.band,
      preferred: SH.preferred.slice(),
      optima: { wd: wd, none: none },
      unfair: unfair,
      tie: none.e - wd.e,
      falseWin: unfair.e - wd.e,
      rows: ROWS.map(function (r) { return { key: 'u' + r.u.toFixed(3), u: r.u, lr: r.lr, wd: r.wd, none: r.none }; })
    };
  }

  /* ============================== the figure ============================== */

  var fig = null, pa = null, pb = null, cur = null;

  function panelOpts(letter) {
    var dom = CAL.domains[letter];
    return {
      letter: '(' + letter + ')',
      describe: letter === 'a' ? 'validation error against learning rate, the baseline tuned equally well'
        : 'validation error against learning rate, the baseline at the rates the weight-decay study preferred',
      note: letter === 'a' ? 'each learning rate tuned' : 'baseline held to the candidate’s rates',
      xLog: 10, xDomain: dom.x.slice(), yDomain: dom.y.slice(),
      xLabel: 'learning rate', yLabel: 'validation error',
      xTicks: function () { var out = []; for (var e = SH.axis[0]; e <= SH.axis[1]; e++) out.push(pow10(e)); return out; },
      xFormat: decade,
      /* the domain's top is 0.27 since Batch 7's band of 0.001 */
      yTicks: function (d, px) { return px < 140 ? [0.22, 0.26] : [0.22, 0.24, 0.26]; },
      yFormat: function (v) { return by('fixed2')(v); },
      aspect: function (w, phone) { return phone ? 230 / Math.max(w, 1) : 0.62; },
      maxHeight: function (w, phone) { return phone ? 230 : 290; },
      margin: function (w, phone) { return phone ? { t: 8, r: 16, b: 36, l: 50 } : { t: 12, r: 16, b: 42, l: 58 }; }
    };
  }

  function drawPanel(p, letter) {
    var C = TP.chart, s = cur;
    if (!s) return;
    var X = function (r) { return r.lr; };
    var yWd = function (r) { return r.wd; }, yNone = function (r) { return r.none; };
    var band = s.band;
    /* the bands: each curve's opaque tint, under the gridlines (DS §4.6) */
    C.area(p, s.rows, X, function (r) { return r.none - band; }, function (r) { return r.none + band; }, { role: 'third', id: 'band-none' });
    C.area(p, s.rows, X, function (r) { return r.wd - band; }, function (r) { return r.wd + band; }, { role: 'model', id: 'band-wd' });
    /* the curves, the second condition first so that the first stands above it */
    C.line(p, s.rows, X, yNone, { role: 'third', series: 'none', key: 'none' });
    C.line(p, s.rows, X, yWd, { role: 'model', series: 'wd', key: 'wd' });
    /* the points the panel compares (WO-F6.4), each a marker in its condition's form (DS §4.2, §4.3):
       the best weight decay's optimum, and the baseline's optimum in (a) or its best within the
       preferred rates in (b) */
    var noneSel = letter === 'a' ? s.optima.none : s.unfair;
    var pts = [
      { key: 'wd-opt', series: 'wd', u: s.optima.wd.u, e: s.optima.wd.e },
      { key: letter === 'a' ? 'none-opt' : 'none-within', series: 'none', u: noneSel.u, e: noneSel.e }
    ];
    var mX = function (r) { return pow10(r.u); }, mY = function (r) { return r.e; }, mK = function (r) { return r.key; };
    C.markers(p, pts.slice(1), mX, mY, { role: 'third', series: 'none', shape: 'circle', fill: 'open', key: mK });
    C.markers(p, pts.slice(0, 1), mX, mY, { role: 'model', series: 'wd', shape: 'circle', fill: 'filled', key: mK });
    p.el.setAttribute('data-selected', JSON.stringify({ wd: [s.optima.wd.u, s.optima.wd.e], none: [noneSel.u, noneSel.e] }));

    /* the annotations (DS §5.10), each computed from the shapes */
    var x0 = CAL.domains[letter].x[0];
    if (letter === 'a') {
      C.annotation(p, { kind: 'bracket', id: 'tie', text: 'a tie', side: 'right', phone: { header: true },
        anchor: { y0: s.optima.wd.e, y1: s.optima.none.e, x: x0 } });
    } else {
      C.annotation(p, { kind: 'bracket', id: 'false-win', text: 'apparent gain', side: 'right', phone: { header: true },
        anchor: { y0: s.optima.wd.e, y1: s.unfair.e, x: x0 } });
      C.annotation(p, { kind: 'bracket', id: 'preferred', text: 'rates searched', side: 'below',
        phone: { header: true }, anchor: { x0: pow10(s.preferred[0]), x1: pow10(s.preferred[1]) } });
    }

    /* the direct labels (WO-F6.4: the same form at both widths), each naming its own band, so that
       it may stand inside the tint of its curve (DS §5.2 item 7). A label in a tint takes text ink
       (DS §5.3), which chart.js gives every label that names a region. */
    C.place(p, LABELS.map(function (L) {
      return { id: L.id, text: L.text, role: L.role, series: L.id, names: 'band-' + L.id, feature: lineFeature(s, letter, L.id),
        captionNames: true, keySentence: true };
    }), curCtx);
    if (!searching && lastWidth[letter] !== p.width) {
      lastWidth[letter] = p.width;
      if (!drawing) Promise.resolve().then(function () { settleLabels(p, letter); });
    }
  }

  /* ---------- the direct labels of the curves ---------- */

  /* Each curve's label names the whole curve (the feature {of: series}) where the placer admits a
     position on it. Each curve is a steep U whose branches leave the frame, and the other curve and
     the brackets take the ground beside it, so a label may instead name a stretch of its curve
     STRETCH decades long, tried from the right end of the axis leftward by STEP decades. After each
     draw at a new width, each label takes the first stretch at which the placer sets it in its full
     form, searched from the whole curve, so that the positions depend on the width alone (DS §5.2).
     The search runs after the render, never inside it. */
  var LABELS = [
    { id: 'wd', text: 'with weight decay', role: 'model' },
    { id: 'none', text: 'no weight decay', role: 'third' }
  ];
  var STRETCH = 0.8, STEP = 0.2;
  var STRETCHES = (function () {
    var out = [null];
    for (var hi = SH.axis[1]; hi - STRETCH >= SH.axis[0] - 1e-9; hi -= STEP) out.push([hi - STRETCH, hi]);
    return out;
  })();
  var choice = { a: { wd: 0, none: 0 }, b: { wd: 0, none: 0 } };
  var lastWidth = { a: null, b: null }, searching = false, drawing = false;
  function lineFeature(s, letter, id) {
    var r = STRETCHES[choice[letter][id]];
    if (!r) return { type: 'line', of: id };
    var pts = s.rows.filter(function (q) { return q.u >= r[0] - 1e-9 && q.u <= r[1] + 1e-9; })
      .map(function (q) { return [q.lr, q[id]]; });
    return { type: 'line', points: pts };
  }
  /* The pairs of stretches (wd, none) in the order the search tries them: the whole curves, then a
     stretch for one label, then a stretch for both. */
  var PAIRS = (function () {
    var out = [], n = STRETCHES.length;
    for (var i = 0; i < n; i++) for (var j = 0; j < n; j++) out.push([i, j]);
    return out.sort(function (a, b) { return ((a[0] > 0) + (a[1] > 0)) - ((b[0] > 0) + (b[1] > 0)) || (a[0] + a[1]) - (b[0] + b[1]) || a[0] - b[0]; });
  })();
  function curvesFull(p) {
    return TP.chart.labelReport(p).filter(function (e) { return (e.id === 'wd' || e.id === 'none') && e.form === 'full' && !e.fault; }).length;
  }
  function settleLabels(p, letter) {
    if (!cur) return;
    searching = true;
    try {
      var c = choice[letter], best = PAIRS[0], bestN = -1;
      for (var k = 0; k < PAIRS.length; k++) {
        c.wd = PAIRS[k][0];
        c.none = PAIRS[k][1];
        p.update();
        var n = curvesFull(p);
        if (n > bestN) { bestN = n; best = PAIRS[k]; }
        if (n === LABELS.length) break;
      }
      if (c.wd !== best[0] || c.none !== best[1]) {
        c.wd = best[0];
        c.none = best[1];
        p.update();
      }
      p.el.setAttribute('data-stretches', best.join(','));
    } finally { searching = false; }
  }

  var curCtx = null;
  function draw(state, ctx) {
    drawing = true;
    try {
      if (!pa) {
        pa = TP.chart.panel(ctx.fig.panels, panelOpts('a'));
        pb = TP.chart.panel(ctx.fig.panels, panelOpts('b'));
        pa.update(function (q) { drawPanel(q, 'a'); });
        pb.update(function (q) { drawPanel(q, 'b'); });
      }
      cur = state;
      curCtx = ctx;
      pa.update();
      pb.update();
    } finally { drawing = false; }
    if (state) { settleLabels(pa, 'a'); settleLabels(pb, 'b'); }
  }

  function table(state) {
    var f3 = by('fixed3'), f4 = by('fixed4');
    var lo = state.preferred[0], hi = state.preferred[1];
    return {
      columns: [
        { key: 'lr', label: 'Learning rate', format: function (v) { return TP.fmt.exp10(Math.log(v) / Math.LN10); } },
        { key: 'wd', label: 'Validation error, best weight decay', format: f4 },
        { key: 'none', label: 'Validation error, no weight decay', format: f4 },
        { key: 'note', label: 'Marked' }
      ],
      rows: state.rows.map(function (r) {
        var notes = [];
        if (near(r.u, state.optima.wd.u)) notes.push('best weight decay’s optimum, (a) and (b)');
        if (near(r.u, state.optima.none.u)) notes.push('no weight decay’s optimum, (a)');
        if (near(r.u, state.unfair.u)) notes.push('no weight decay’s best within the preferred rates, (b)');
        if (r.u >= lo - 1e-9 && r.u <= hi + 1e-9) notes.push('preferred rate');
        return { lr: r.lr, wd: r.wd, none: r.none, note: notes.join('; ') };
      }),
      caption: 'Validation error of the two curves at each sampled learning rate. Each curve’s noise band spans ' +
        f3(state.band) + ' above and below it. The preferred rates run from ' + TP.fmt.exp10(lo) + ' to ' + TP.fmt.exp10(hi) + '.'
    };
  }

  function quantities(state) {
    return {
      curvature: TP.baseline.CURVATURE,
      band: state.band,
      tie: state.tie,
      'false-win': state.falseWin,
      'wd-best-lr': pow10(state.optima.wd.u),
      'wd-best-error': state.optima.wd.e,
      'none-best-lr': pow10(state.optima.none.u),
      'none-best-error': state.optima.none.e,
      'preferred-lo': pow10(state.preferred[0]),
      'preferred-hi': pow10(state.preferred[1]),
      'unfair-best-error': state.unfair.e,
      'unfair-best-lr': pow10(state.unfair.u),
      'tie-within-band': Math.abs(state.tie) < state.band,
      'false-win-beyond-band': state.falseWin > state.band
    };
  }

  function init(element) {
    fig = TP.fig(element, {
      kind: 'static',
      params: {},
      apply: apply,
      draw: draw,
      table: table,
      quantities: quantities
    });
  }

  document.addEventListener('tp:ready', function () {
    var el = document.getElementById(ID);
    if (el) init(el);
  });
})();
