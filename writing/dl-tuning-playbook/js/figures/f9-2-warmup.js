/*
 * f9-2-warmup.js: figure F9.2, warmup under the toy's limit (#fig-warmup), on page 9 #warmup.
 *
 * Work order: notes/revamp/implementation-plan.md §6.20 (WO-F9.2), with §6.0. Entry:
 * notes/revamp/figure-plan.md F9.2, with review/synthesis.md R1, R12, R13 and R14. Design:
 * notes/revamp/design-system.md §3.4, §3.5, §4 to §9. A running figure on TP.fig and TP.run.
 *
 * The model is Toy D (site/js/lib/toyD.js) on workload B (tauC 0.7, the default) with early
 * instability on, as tests/calibration/fig-warmup.calibrate.js runs it. The unstable base rate is
 * CAL.unstableLr (0.0316 = 10^-1.5). Every rate is the printed rate, CAL.lrScale (TP.toyD.LR_SCALE,
 * one half) times the model rate (toyD.js, "Learning-rate scale"). The trace's h_s is in the model's
 * units, so the limit on the printed axis is TP.toyD.limitRate(h_s) = 2 LR_SCALE / h_s, which is
 * 2/h_s with h_s in the printed rate's units, and eta h_s is the printed rate over LR_SCALE times
 * the trace's h_s (etaH below). A ramp of W steps is {type: 'warmup', base, warmupSteps: W,
 * postWarmupSteps: 2W}; "hold, then jump" is {type: 'constant-warmup', low: CAL.holdRate, base,
 * warmupSteps: W, postWarmupSteps: 2W}; base is 10 or 3 times the unstable rate. Each run lasts
 * max(3W, 2,000) steps.
 *   - compute(params, seed, from, to) slices TP.toyD.trace of the whole run, evaluated every step
 *     and cached per parameters (six runs kept), with keyframes every 64 steps. advance steps
 *     TP.toyD.stepState, and runtime check 23 compares the two.
 *   - A diverged state is not stepped again (stepState's rule), so after the divergence step the
 *     record repeats the divergence step's sharpness and loss, and `until` holds.
 *   - The state is initState()'s {t, m, hs, L, L0, diverged}, with `key` (the run's parameters,
 *     which record reads to give the learning rate of step t) and `n` (the runtime's step, which
 *     keeps counting after a divergence, when stepState no longer advances t).
 *   - The readout, the quantities and the strip read the whole run's outcome from
 *     CAL.tables.strip, whatever the cursor (WO-F9.2).
 *
 * The runtime: pace 'log', duration 6,000 ms, steps and limit max(3W, 2,000), every
 * ceil(steps / 50,000), recordPanel 'a', reset 'show'. end, base and kind are restart
 * parameters with ghost: true. kind has no control and only the presets set it.
 *
 * Panels:
 *   (a) learning rate against step, log-log on the fixed domain CAL.domains.a: the schedule as the
 *       reader's 3-px line with the handle at the ramp's end, the ramp's end named on the step axis
 *       in the reader token, the current run's stability limit 2/h_s(t) up to the cursor as the
 *       model's dash-dot level, the previous run's limit dashed as the ghost, the cursor, and the
 *       annotations "first above the limit" and "diverged" on the step axis once the cursor has
 *       passed their steps. It is the record panel.
 *   (b) warmup lengths tried: one row per schedule and base rate (CAL.domains.b.rows), with the
 *       x axis of (a), so that each length stands under its step on (a) (the list itself is
 *       CAL.domains.b.x). Each committed attempt is a filled circle (the loss never rose above its
 *       start), an open circle (it rose and recovered) or a cross (it diverged), in model blue;
 *       the current cell takes the reader's 20-px ring; the cap at 10% of max_train_steps is a
 *       dashed limit named on the axis. The row names stand left of the list, in the decade the
 *       list leaves empty. A press on a mark sets the figure to that attempt.
 *
 * The strip is figure state outside params (snapshot, restore and clear of the contract). Each
 * settle commits the current cell's mark, looked up in CAL.tables.strip, and replaces an earlier
 * mark of that cell; a frame of a drag or of play commits nothing. The readout and the data table,
 * which TP.fig builds on the settle before its listeners run, read the strip with the current
 * cell's mark included, which is the strip the settle leaves.
 *
 * Presets: "ramp" sets the schedule alone; "hold, then jump" sets the calibration's whole state
 * hold (a 1,000-step hold, then a jump to 10 times the unstable rate), and "100 steps" and "300
 * steps" the whole states w100 and w300 (a ramp of that length to 10 times the unstable rate), so
 * that each of the three reproduces the paragraph after the figure that names it from any state
 * (build log Batch 7). `docked` names "ramp" and "hold, then
 * jump" one by one ('preset:ramp', 'preset:hold'), so site.js puts the other two in
 * div.fig-controls-more before Reset.
 *
 * Test hook: TP.models.warmupFigure.slowMs (0 by default). The figure's check sets it through the
 * harness's `slow` option, and compute then waits that many milliseconds per step it returns, so
 * that a restart runs in chunks for runtime check 19. Neither the figure nor its page sets it.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

/* BEGIN GENERATED table-cal */
// From tests/calibration/out/fig-warmup.json by npm run generate (tests/lib/write-generated.js).
var CAL = {
  "defaults": {"end": 1000, "base": "10x", "kind": "ramp"},
  "presets": {"ramp": {"kind": "ramp"}, "hold": {"kind": "hold"}},
  "states": {
    "w100": {"end": 100, "base": "10x", "kind": "ramp"},
    "w300": {"end": 300, "base": "10x", "kind": "ramp"},
    "hold": {"end": 1000, "base": "10x", "kind": "hold"}
  },
  "seed": null,
  "ends": [10, 30, 100, 300, 1000, 3000, 10000, 30000],
  "bases": {"10x": 10, "3x": 3},
  "unstableLr": 0.03162277660168379,
  "lrScale": 0.5,
  "holdRate": 0.015811388300841896,
  "cap": 10000,
  "maxTrainSteps": 100000,
  "params": {"tauC": 0.7},
  "domains": {
    "a": {
      "x": [1, 90000],
      "y": [0.000001, 1],
      "extent": [0.000006324555320336758, 0.39528470752104733],
      "rate": [0.000006324555320336758, 0.3162277660168379],
      "limit": [0.02, 0.39528470752104733]
    },
    "b": {"x": [10, 30000], "rows": ["ramp-10x", "ramp-3x", "hold-10x", "hold-3x"]}
  },
  "tables": {
    "strip": {
      "ramp-10x": [
        {
          "W": 10,
          "mark": "cross",
          "firstAbove": 0,
          "stepsAbove": 5,
          "peakEtaH": 8.61758,
          "divergedAt": 4,
          "peak": 429.066,
          "peakStep": 4
        },
        {
          "W": 30,
          "mark": "cross",
          "firstAbove": 1,
          "stepsAbove": 7,
          "peakEtaH": 5.23381,
          "divergedAt": 7,
          "peak": 814.891,
          "peakStep": 7
        },
        {
          "W": 100,
          "mark": "cross",
          "firstAbove": 6,
          "stepsAbove": 9,
          "peakEtaH": 3.36243,
          "divergedAt": 14,
          "peak": 181.178,
          "peakStep": 14
        },
        {
          "W": 300,
          "mark": "cross",
          "firstAbove": 19,
          "stepsAbove": 16,
          "peakEtaH": 2.4752,
          "divergedAt": 34,
          "peak": 138.543,
          "peakStep": 34
        },
        {
          "W": 1000,
          "mark": "filled",
          "firstAbove": null,
          "stepsAbove": 0,
          "peakEtaH": 1.97993,
          "divergedAt": null,
          "peak": 1,
          "peakStep": 0
        },
        {
          "W": 3000,
          "mark": "filled",
          "firstAbove": null,
          "stepsAbove": 0,
          "peakEtaH": 1.76335,
          "divergedAt": null,
          "peak": 1,
          "peakStep": 0
        },
        {
          "W": 10000,
          "mark": "filled",
          "firstAbove": null,
          "stepsAbove": 0,
          "peakEtaH": 1.65889,
          "divergedAt": null,
          "peak": 1,
          "peakStep": 0
        },
        {
          "W": 30000,
          "mark": "filled",
          "firstAbove": null,
          "stepsAbove": 0,
          "peakEtaH": 1.62159,
          "divergedAt": null,
          "peak": 1,
          "peakStep": 0
        }
      ],
      "ramp-3x": [
        {
          "W": 10,
          "mark": "cross",
          "firstAbove": 2,
          "stepsAbove": 6,
          "peakEtaH": 5.01659,
          "divergedAt": 7,
          "peak": 269.494,
          "peakStep": 7
        },
        {
          "W": 30,
          "mark": "cross",
          "firstAbove": 6,
          "stepsAbove": 9,
          "peakEtaH": 3.36243,
          "divergedAt": 14,
          "peak": 181.178,
          "peakStep": 14
        },
        {
          "W": 100,
          "mark": "cross",
          "firstAbove": 21,
          "stepsAbove": 18,
          "peakEtaH": 2.41649,
          "divergedAt": 38,
          "peak": 171.815,
          "peakStep": 38
        },
        {
          "W": 300,
          "mark": "filled",
          "firstAbove": null,
          "stepsAbove": 0,
          "peakEtaH": 1.97993,
          "divergedAt": null,
          "peak": 1,
          "peakStep": 0
        },
        {
          "W": 1000,
          "mark": "filled",
          "firstAbove": null,
          "stepsAbove": 0,
          "peakEtaH": 1.74997,
          "divergedAt": null,
          "peak": 1,
          "peakStep": 0
        },
        {
          "W": 3000,
          "mark": "filled",
          "firstAbove": null,
          "stepsAbove": 0,
          "peakEtaH": 1.65889,
          "divergedAt": null,
          "peak": 1,
          "peakStep": 0
        },
        {
          "W": 10000,
          "mark": "filled",
          "firstAbove": null,
          "stepsAbove": 0,
          "peakEtaH": 1.61956,
          "divergedAt": null,
          "peak": 1,
          "peakStep": 0
        },
        {
          "W": 30000,
          "mark": "filled",
          "firstAbove": null,
          "stepsAbove": 0,
          "peakEtaH": 1.60682,
          "divergedAt": null,
          "peak": 1,
          "peakStep": 0
        }
      ],
      "hold-10x": [
        {
          "W": 10,
          "mark": "cross",
          "firstAbove": 10,
          "stepsAbove": 3,
          "peakEtaH": 31.6228,
          "divergedAt": 12,
          "peak": 153.473,
          "peakStep": 12
        },
        {
          "W": 30,
          "mark": "cross",
          "firstAbove": 30,
          "stepsAbove": 3,
          "peakEtaH": 31.6228,
          "divergedAt": 32,
          "peak": 153.438,
          "peakStep": 32
        },
        {
          "W": 100,
          "mark": "cross",
          "firstAbove": 100,
          "stepsAbove": 3,
          "peakEtaH": 31.6228,
          "divergedAt": 102,
          "peak": 153.356,
          "peakStep": 102
        },
        {
          "W": 300,
          "mark": "cross",
          "firstAbove": 300,
          "stepsAbove": 3,
          "peakEtaH": 31.6228,
          "divergedAt": 302,
          "peak": 153.248,
          "peakStep": 302
        },
        {
          "W": 1000,
          "mark": "cross",
          "firstAbove": 1000,
          "stepsAbove": 3,
          "peakEtaH": 31.6228,
          "divergedAt": 1002,
          "peak": 153.112,
          "peakStep": 1002
        },
        {
          "W": 3000,
          "mark": "cross",
          "firstAbove": 3000,
          "stepsAbove": 3,
          "peakEtaH": 31.6228,
          "divergedAt": 3002,
          "peak": 152.987,
          "peakStep": 3002
        },
        {
          "W": 10000,
          "mark": "cross",
          "firstAbove": 10000,
          "stepsAbove": 3,
          "peakEtaH": 31.6228,
          "divergedAt": 10002,
          "peak": 152.865,
          "peakStep": 10002
        },
        {
          "W": 30000,
          "mark": "cross",
          "firstAbove": 30000,
          "stepsAbove": 3,
          "peakEtaH": 31.6228,
          "divergedAt": 30002,
          "peak": 152.789,
          "peakStep": 30002
        }
      ],
      "hold-3x": [
        {
          "W": 10,
          "mark": "cross",
          "firstAbove": 10,
          "stepsAbove": 4,
          "peakEtaH": 9.48683,
          "divergedAt": 13,
          "peak": 230.682,
          "peakStep": 13
        },
        {
          "W": 30,
          "mark": "cross",
          "firstAbove": 30,
          "stepsAbove": 4,
          "peakEtaH": 9.48683,
          "divergedAt": 33,
          "peak": 230.622,
          "peakStep": 33
        },
        {
          "W": 100,
          "mark": "cross",
          "firstAbove": 100,
          "stepsAbove": 4,
          "peakEtaH": 9.48683,
          "divergedAt": 103,
          "peak": 230.512,
          "peakStep": 103
        },
        {
          "W": 300,
          "mark": "cross",
          "firstAbove": 300,
          "stepsAbove": 4,
          "peakEtaH": 9.48683,
          "divergedAt": 303,
          "peak": 230.39,
          "peakStep": 303
        },
        {
          "W": 1000,
          "mark": "cross",
          "firstAbove": 1000,
          "stepsAbove": 4,
          "peakEtaH": 9.48683,
          "divergedAt": 1003,
          "peak": 230.249,
          "peakStep": 1003
        },
        {
          "W": 3000,
          "mark": "cross",
          "firstAbove": 3000,
          "stepsAbove": 4,
          "peakEtaH": 9.48683,
          "divergedAt": 3003,
          "peak": 230.122,
          "peakStep": 3003
        },
        {
          "W": 10000,
          "mark": "cross",
          "firstAbove": 10000,
          "stepsAbove": 4,
          "peakEtaH": 9.48683,
          "divergedAt": 10003,
          "peak": 229.999,
          "peakStep": 10003
        },
        {
          "W": 30000,
          "mark": "cross",
          "firstAbove": 30000,
          "stepsAbove": 4,
          "peakEtaH": 9.48683,
          "divergedAt": 30003,
          "peak": 229.923,
          "peakStep": 30003
        }
      ]
    },
    "default": {
      "t": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310, 320, 330, 340, 350, 360, 370, 380, 390, 400, 410, 420, 430, 440, 450, 460, 470, 480, 490, 500, 510, 520, 530, 540, 550, 560, 570, 580, 590, 600, 610, 620, 630, 640, 650, 660, 670, 680, 690, 700, 710, 720, 730, 740, 750, 760, 770, 780, 790, 800, 810, 820, 830, 840, 850, 860, 870, 880, 890, 900, 910, 920, 930, 940, 950, 960, 970, 980, 990, 1000, 1010, 1020, 1030, 1040, 1050, 1060, 1070, 1080, 1090, 1100, 1110, 1120, 1130, 1140, 1150, 1160, 1170, 1180, 1190, 1200, 1210, 1220, 1230, 1240, 1250, 1260, 1270, 1280, 1290, 1300, 1310, 1320, 1330, 1340, 1350, 1360, 1370, 1380, 1390, 1400, 1410, 1420, 1430, 1440, 1450, 1460, 1470, 1480, 1490, 1500, 1510, 1520, 1530, 1540, 1550, 1560, 1570, 1580, 1590, 1600, 1610, 1620, 1630, 1640, 1650, 1660, 1670, 1680, 1690, 1700, 1710, 1720, 1730, 1740, 1750, 1760, 1770, 1780, 1790, 1800, 1810, 1820, 1830, 1840, 1850, 1860, 1870, 1880, 1890, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020, 2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100, 2110, 2120, 2130, 2140, 2150, 2160, 2170, 2180, 2190, 2200, 2210, 2220, 2230, 2240, 2250, 2260, 2270, 2280, 2290, 2300, 2310, 2320, 2330, 2340, 2350, 2360, 2370, 2380, 2390, 2400, 2410, 2420, 2430, 2440, 2450, 2460, 2470, 2480, 2490, 2500, 2510, 2520, 2530, 2540, 2550, 2560, 2570, 2580, 2590, 2600, 2610, 2620, 2630, 2640, 2650, 2660, 2670, 2680, 2690, 2700, 2710, 2720, 2730, 2740, 2750, 2760, 2770, 2780, 2790, 2800, 2810, 2820, 2830, 2840, 2850, 2860, 2870, 2880, 2890, 2900, 2910, 2920, 2930, 2940, 2950, 2960, 2970, 2980, 2990, 3000],
      "loss": [1, 0.999741, 0.999224, 0.998452, 0.997428, 0.996155, 0.994635, 0.992871, 0.990868, 0.98863, 0.986164, 0.983474, 0.98057, 0.977459, 0.974149, 0.97065, 0.96697, 0.963119, 0.959107, 0.954944, 0.950639, 0.946204, 0.941648, 0.936981, 0.932215, 0.92736, 0.922425, 0.917421, 0.912358, 0.907245, 0.902091, 0.896907, 0.891702, 0.886482, 0.881258, 0.876036, 0.870825, 0.865632, 0.860464, 0.855327, 0.850228, 0.845173, 0.840168, 0.835218, 0.830328, 0.825505, 0.820753, 0.816078, 0.811486, 0.806982, 0.802574, 0.798269, 0.794068, 0.789972, 0.785985, 0.782112, 0.778356, 0.774724, 0.77122, 0.76785, 0.76462, 0.761536, 0.758603, 0.755826, 0.753211, 0.750762, 0.748479, 0.746366, 0.744419, 0.742635, 0.741004, 0.739516, 0.738152, 0.736892, 0.735706, 0.734563, 0.733424, 0.732247, 0.730987, 0.729597, 0.728029, 0.726241, 0.724191, 0.721847, 0.719186, 0.716196, 0.712874, 0.709234, 0.705296, 0.701097, 0.696677, 0.692086, 0.687376, 0.682601, 0.677812, 0.673056, 0.668376, 0.663805, 0.65937, 0.655088, 0.650971, 0.617975, 0.593363, 0.572228, 0.553257, 0.535904, 0.519843, 0.504856, 0.490787, 0.477521, 0.464971, 0.453062, 0.441733, 0.430928, 0.420599, 0.4107, 0.401195, 0.39205, 0.383236, 0.37473, 0.366511, 0.358564, 0.350873, 0.343426, 0.336213, 0.329223, 0.322448, 0.315878, 0.309504, 0.30332, 0.297315, 0.291483, 0.285815, 0.280304, 0.274943, 0.269724, 0.264641, 0.259688, 0.254858, 0.250147, 0.245548, 0.241058, 0.236671, 0.232384, 0.228192, 0.224093, 0.220083, 0.216159, 0.212318, 0.208557, 0.204874, 0.201266, 0.197732, 0.194269, 0.190875, 0.187548, 0.184286, 0.181088, 0.177951, 0.174874, 0.171855, 0.168893, 0.165986, 0.163132, 0.160331, 0.15758, 0.154878, 0.152224, 0.149617, 0.147056, 0.144538, 0.142064, 0.139632, 0.137241, 0.13489, 0.132579, 0.130305, 0.128069, 0.12587, 0.123706, 0.121577, 0.119483, 0.117423, 0.115396, 0.113401, 0.111439, 0.109508, 0.107608, 0.105738, 0.103898, 0.102088, 0.100281, 0.0985472, 0.0968565, 0.0952078, 0.0935996, 0.0920304, 0.0904988, 0.0890036, 0.0875436, 0.0861177, 0.0847246, 0.0833634, 0.0820331, 0.0807326, 0.0794611, 0.0782177, 0.0770014, 0.0758117, 0.0746475, 0.0735082, 0.0723931, 0.0713015, 0.0702327, 0.069186, 0.0681609, 0.0671567, 0.0661728, 0.0652088, 0.0642641, 0.0633381, 0.0624303, 0.0615404, 0.0606677, 0.059812, 0.0589726, 0.0581492, 0.0573414, 0.0565489, 0.0557711, 0.0550078, 0.0542585, 0.0535231, 0.052801, 0.052092, 0.0513958, 0.050712, 0.0500404, 0.0493807, 0.0487326, 0.0480958, 0.0474701, 0.0468552, 0.0462508, 0.0456568, 0.0450729, 0.0444989, 0.0439345, 0.0433796, 0.0428339, 0.0422972, 0.0417694, 0.0412502, 0.0407395, 0.0402371, 0.0397428, 0.0392564, 0.0387778, 0.0383069, 0.0378434, 0.0373872, 0.0369382, 0.0364962, 0.0360611, 0.0356327, 0.035211, 0.0347957, 0.0343868, 0.0339842, 0.0335876, 0.0331971, 0.0328124, 0.0324336, 0.0320604, 0.0316927, 0.0313305, 0.0309737, 0.0306222, 0.0302758, 0.0299345, 0.0295982, 0.0292668, 0.0289402, 0.0286183, 0.0283011, 0.0279884, 0.0276802, 0.0273764, 0.027077, 0.0267818, 0.0264908, 0.0262039, 0.0259211, 0.0256422, 0.0253673, 0.0250962, 0.0248289, 0.0245653, 0.0243054, 0.024049, 0.0237963, 0.023547, 0.0233012, 0.0230587, 0.0228196, 0.0225837, 0.0223511, 0.0221217, 0.0218953, 0.0216721, 0.0214519, 0.0212346, 0.0210203, 0.0208089, 0.0206004, 0.0203946, 0.0201916, 0.0199913, 0.0197938, 0.0195988, 0.0194065, 0.0192167, 0.0190295, 0.0188447, 0.0186624, 0.0184825, 0.018305, 0.0181299, 0.017957, 0.0177865, 0.0176181, 0.0174521, 0.0172881, 0.0171264, 0.0169668, 0.0168092, 0.0166537, 0.0165003, 0.0163489, 0.0161994, 0.0160519, 0.0159063, 0.0157626, 0.0156208, 0.0154808, 0.0153427, 0.0152063, 0.0150717, 0.0149389, 0.0148078, 0.0146783, 0.0145506, 0.0144245, 0.0143, 0.0141771, 0.0140559, 0.0139362, 0.013818, 0.0137013, 0.0135862, 0.0134725, 0.0133603, 0.0132495, 0.0131402, 0.0130322, 0.0129257, 0.0128205, 0.0127166, 0.0126141, 0.0125129, 0.012413, 0.0123144, 0.012217, 0.0121209, 0.012026, 0.0119323, 0.0118399, 0.0117485, 0.0116584, 0.0115694, 0.0114816, 0.0113948, 0.0113092, 0.0112247, 0.0111412, 0.0110588, 0.0109774, 0.0108971, 0.0108178, 0.0107395, 0.0106622],
      "hs": [50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 49.9822, 49.9211, 49.8187, 49.6773, 49.4989, 49.2856, 49.0395, 48.7627, 48.4572, 48.1251, 47.7684, 47.3889, 46.9887, 46.5696, 46.1333, 45.6816, 45.2162, 44.7387, 44.2507, 43.7536, 43.249, 42.738, 42.2221, 41.7024, 41.1802, 40.6564, 40.1321, 39.6082, 39.0857, 38.5653, 38.0478, 37.5339, 37.0243, 36.5194, 36.0199, 35.5263, 35.0388, 34.558, 34.0842, 33.6175, 33.1584, 32.7069, 32.2633, 31.8276, 31.4001, 30.9807, 30.5696, 30.1666, 29.7719, 29.3855, 25.9557, 23.2271, 21.0462, 19.2733, 17.802, 16.5569, 15.486, 14.5526, 13.7304, 12.9996, 12.3452, 11.7555, 11.2209, 10.7339, 10.2884, 9.87901, 9.50154, 9.15231, 8.82821, 8.52659, 8.24515, 7.98192, 7.73516, 7.50335, 7.28517, 7.07943, 6.88509, 6.70122, 6.52699, 6.36166, 6.20455, 6.05507, 5.91266, 5.77684, 5.64715, 5.52319, 5.40458, 5.29099, 5.18209, 5.07761, 4.97727, 4.88084, 4.78809, 4.69881, 4.61282, 4.52992, 4.44996, 4.37279, 4.29826, 4.22623, 4.15658, 4.0892, 4.02397, 3.9608, 3.89959, 3.84024, 3.78268, 3.72682, 3.67259, 3.61992, 3.56875, 3.519, 3.47063, 3.42356, 3.37776, 3.33318, 3.28975, 3.24745, 3.20622, 3.16603, 3.12683, 3.08859, 3.05128, 3.01486, 2.97931, 2.94458, 2.91065, 2.8775, 2.84509, 2.81341, 2.78243, 2.75212, 2.72247, 2.69345, 2.66504, 2.63723, 2.60999, 2.58331, 2.55717, 2.53155, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982, 2.52982],
      "eta": [0.000316228, 0.000632456, 0.000948683, 0.00126491, 0.00158114, 0.00189737, 0.00221359, 0.00252982, 0.00284605, 0.00316228, 0.00347851, 0.00379473, 0.00411096, 0.00442719, 0.00474342, 0.00505964, 0.00537587, 0.0056921, 0.00600833, 0.00632456, 0.00664078, 0.00695701, 0.00727324, 0.00758947, 0.00790569, 0.00822192, 0.00853815, 0.00885438, 0.00917061, 0.00948683, 0.00980306, 0.0101193, 0.0104355, 0.0107517, 0.011068, 0.0113842, 0.0117004, 0.0120167, 0.0123329, 0.0126491, 0.0129653, 0.0132816, 0.0135978, 0.013914, 0.0142302, 0.0145465, 0.0148627, 0.0151789, 0.0154952, 0.0158114, 0.0161276, 0.0164438, 0.0167601, 0.0170763, 0.0173925, 0.0177088, 0.018025, 0.0183412, 0.0186574, 0.0189737, 0.0192899, 0.0196061, 0.0199223, 0.0202386, 0.0205548, 0.020871, 0.0211873, 0.0215035, 0.0218197, 0.0221359, 0.0224522, 0.0227684, 0.0230846, 0.0234009, 0.0237171, 0.0240333, 0.0243495, 0.0246658, 0.024982, 0.0252982, 0.0256144, 0.0259307, 0.0262469, 0.0265631, 0.0268794, 0.0271956, 0.0275118, 0.027828, 0.0281443, 0.0284605, 0.0287767, 0.029093, 0.0294092, 0.0297254, 0.0300416, 0.0303579, 0.0306741, 0.0309903, 0.0313065, 0.0316228, 0.031939, 0.0351013, 0.0382636, 0.0414258, 0.0445881, 0.0477504, 0.0509127, 0.0540749, 0.0572372, 0.0603995, 0.0635618, 0.0667241, 0.0698863, 0.0730486, 0.0762109, 0.0793732, 0.0825354, 0.0856977, 0.08886, 0.0920223, 0.0951846, 0.0983468, 0.101509, 0.104671, 0.107834, 0.110996, 0.114158, 0.117321, 0.120483, 0.123645, 0.126807, 0.12997, 0.133132, 0.136294, 0.139456, 0.142619, 0.145781, 0.148943, 0.152106, 0.155268, 0.15843, 0.161592, 0.164755, 0.167917, 0.171079, 0.174241, 0.177404, 0.180566, 0.183728, 0.186891, 0.190053, 0.193215, 0.196377, 0.19954, 0.202702, 0.205864, 0.209027, 0.212189, 0.215351, 0.218513, 0.221676, 0.224838, 0.228, 0.231162, 0.234325, 0.237487, 0.240649, 0.243812, 0.246974, 0.250136, 0.253298, 0.256461, 0.259623, 0.262785, 0.265948, 0.26911, 0.272272, 0.275434, 0.278597, 0.281759, 0.284921, 0.288083, 0.291246, 0.294408, 0.29757, 0.300733, 0.303895, 0.307057, 0.310219, 0.313382, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228, 0.316228],
      "gnorm": [0.642395, 0.642158, 0.641833, 0.641528, 0.641292, 0.64111, 0.64092, 0.64064, 0.640193, 0.639528, 0.63862, 0.637469, 0.63609, 0.634506, 0.632741, 0.630819, 0.628765, 0.6266, 0.624347, 0.622028, 0.619668, 0.617288, 0.614916, 0.612575, 0.610295, 0.608102, 0.606027, 0.6041, 0.602355, 0.600825, 0.599548, 0.59856, 0.597902, 0.597616, 0.597748, 0.598345, 0.599458, 0.601144, 0.603459, 0.606469, 0.610243, 0.614858, 0.620398, 0.626957, 0.634639, 0.643564, 0.653867, 0.665703, 0.679254, 0.694731, 0.712383, 0.732318, 0.754301, 0.778093, 0.803651, 0.830991, 0.860143, 0.891141, 0.924012, 0.95877, 0.995422, 1.03395, 1.07432, 1.11647, 1.1603, 1.20567, 1.25243, 1.30033, 1.34911, 1.39844, 1.44793, 1.49714, 1.54555, 1.59262, 1.63774, 1.68028, 1.71957, 1.75494, 1.78574, 1.81132, 1.83112, 1.84463, 1.85144, 1.85128, 1.84396, 1.82949, 1.80799, 1.77976, 1.74524, 1.705, 1.65975, 1.61027, 1.55744, 1.50216, 1.44536, 1.38793, 1.33073, 1.27451, 1.21997, 1.16766, 1.118, 0.785495, 0.640002, 0.558889, 0.505712, 0.467536, 0.438297, 0.414813, 0.395289, 0.378641, 0.364177, 0.351428, 0.340062, 0.329836, 0.320563, 0.312099, 0.304328, 0.297155, 0.290504, 0.284311, 0.278523, 0.273095, 0.267989, 0.263173, 0.258621, 0.254307, 0.250212, 0.246317, 0.242607, 0.239067, 0.235686, 0.232452, 0.229354, 0.226384, 0.223533, 0.220794, 0.218159, 0.215622, 0.213178, 0.21082, 0.208544, 0.206345, 0.204218, 0.202161, 0.200169, 0.198239, 0.196368, 0.194552, 0.19279, 0.191078, 0.189415, 0.187798, 0.186225, 0.184695, 0.183204, 0.181753, 0.180339, 0.178961, 0.177617, 0.176306, 0.175027, 0.173779, 0.17256, 0.171369, 0.170207, 0.16907, 0.167959, 0.166873, 0.165811, 0.164772, 0.163755, 0.16276, 0.161786, 0.160832, 0.159898, 0.158983, 0.158087, 0.157208, 0.156347, 0.155503, 0.154675, 0.153864, 0.153068, 0.152287, 0.151521, 0.150769, 0.150031, 0.149307, 0.148597, 0.147899, 0.147214, 0.146667, 0.146643, 0.14662, 0.146598, 0.146576, 0.146556, 0.146536, 0.146516, 0.146498, 0.14648, 0.146462, 0.146445, 0.146429, 0.146413, 0.146398, 0.146383, 0.146368, 0.146354, 0.146341, 0.146327, 0.146315, 0.146302, 0.14629, 0.146278, 0.146267, 0.146255, 0.146245, 0.146234, 0.146224, 0.146214, 0.146204, 0.146195, 0.146185, 0.146176, 0.146168, 0.146159, 0.146151, 0.146143, 0.146135, 0.146127, 0.146119, 0.146112, 0.146105, 0.146098, 0.146091, 0.146085, 0.146078, 0.146072, 0.146065, 0.146059, 0.146053, 0.146048, 0.146042, 0.146037, 0.146031, 0.146026, 0.146021, 0.146016, 0.146011, 0.146006, 0.146001, 0.145996, 0.145992, 0.145988, 0.145983, 0.145979, 0.145975, 0.145971, 0.145967, 0.145963, 0.145959, 0.145955, 0.145951, 0.145948, 0.145944, 0.145941, 0.145937, 0.145934, 0.145931, 0.145928, 0.145924, 0.145921, 0.145918, 0.145915, 0.145912, 0.145909, 0.145907, 0.145904, 0.145901, 0.145898, 0.145896, 0.145893, 0.145891, 0.145888, 0.145886, 0.145883, 0.145881, 0.145879, 0.145876, 0.145874, 0.145872, 0.14587, 0.145868, 0.145865, 0.145863, 0.145861, 0.145859, 0.145857, 0.145855, 0.145854, 0.145852, 0.14585, 0.145848, 0.145846, 0.145844, 0.145843, 0.145841, 0.145839, 0.145838, 0.145836, 0.145834, 0.145833, 0.145831, 0.14583, 0.145828, 0.145827, 0.145825, 0.145824, 0.145822, 0.145821, 0.14582, 0.145818, 0.145817, 0.145816, 0.145814, 0.145813, 0.145812, 0.145811, 0.145809, 0.145808, 0.145807, 0.145806, 0.145805, 0.145803, 0.145802, 0.145801, 0.1458, 0.145799, 0.145798, 0.145797, 0.145796, 0.145795, 0.145794, 0.145793, 0.145792, 0.145791, 0.14579, 0.145789, 0.145788, 0.145787, 0.145786, 0.145785, 0.145785, 0.145784, 0.145783, 0.145782, 0.145781, 0.14578, 0.14578, 0.145779, 0.145778, 0.145777, 0.145776, 0.145776, 0.145775, 0.145774, 0.145773, 0.145773, 0.145772, 0.145771, 0.145771, 0.14577, 0.145769, 0.145769, 0.145768, 0.145767, 0.145767, 0.145766, 0.145765, 0.145765, 0.145764, 0.145764, 0.145763, 0.145762, 0.145762, 0.145761, 0.145761, 0.14576, 0.14576, 0.145759],
      "note": "the default run (ramp of 1,000 steps to 10×, 3,000 steps), every step to 100, then every 10 steps"
    }
  },
  "quantities": {
    "model": {
      "unstable-lr": 0.03162277660168379,
      "hold-rate": 0.015811388300841896,
      "cap": 10000,
      "max-train-steps": 100000,
      "shortest-10x": 1000,
      "shortest-3x": 300,
      "late-limit": 0.4,
      "late-limit-multiple": 12.649110640673518,
      "base-multiple": 10,
      "h0": 100,
      "h-inf": 5,
      "c": 0.8,
      "tau-c": 0.35,
      "diverge-at": 100,
      "unstable-horizon": 20000,
      "fixed-directions": 7,
      "post-warmup-factor": 2,
      "run-floor": 2000,
      "no-pass-multiple": 30,
      "hold-passing-count": 0
    },
    "default": {
      "end": 1000,
      "first-above": null,
      "steps-above": 0,
      "peak": 1.97992724005928,
      "divergence-step": null
    },
    "w100": {"first-above": 6, "steps-above": 9, "peak": 3.3624320404679073, "divergence-step": 14},
    "w300": {"first-above": 19, "steps-above": 16, "peak": 2.475204458093119, "divergence-step": 34},
    "hold": {"divergence-step": 1002, "steps-after-jump": 2}
  }
};
/* END GENERATED table-cal */

  var D = TP.toyD;
  var LIST = CAL.ends;                              // the half-decade list of ramp ends
  var ROWS = CAL.domains.b.rows;                    // ramp-10x, ramp-3x, hold-10x, hold-3x
  /* 2026-11 review (post08): the page follows the Playbook's default target, 10 times the
     unstable base rate, so the strip shows the two 10x rows and the base rate has no control. */
  var SHOWN = ['ramp-10x', 'hold-10x'];
  var U = CAL.unstableLr, LOW = CAL.holdRate;
  var CAP = CAL.cap, MAX_TRAIN = CAL.maxTrainSteps;
  var KF = 64;
  var ROW_TEXT = {
    'ramp-10x': 'ramp to 10×', 'ramp-3x': 'ramp to 3×',
    'hold-10x': 'hold, then jump to 10×', 'hold-3x': 'hold, then jump to 3×'
  };
  var ROW_PHONE = { 'ramp-10x': 'ramp', 'ramp-3x': 'ramp 3×', 'hold-10x': 'hold', 'hold-3x': 'hold 3×' };
  var BASE_TEXT = { '10x': '10×', '3x': '3×' };

  var fmt = {
    int: function (v) { return TP.fmt ? TP.fmt.int(v) : String(v); },
    sig3: function (v) { return TP.fmt.byName('sig3')(v); },
    sig2: function (v) { return TP.fmt.byName('sig2')(v); },
    lr: function (v) { return Math.abs(v) >= 0.001 ? TP.fmt.byName('sig3')(v) : TP.fmt.byName('exp10')(v); }
  };

  /* ---------- the model, without the DOM ---------- */

  /* eta h_s with eta a printed rate and h_s the trace's (model) curvature: the model's product */
  function etaH(eta, hs) { return eta / D.LR_SCALE * hs; }

  function runLength(W) { return Math.max(3 * W, 2000); }
  function rowKey(v) { return v.kind + '-' + v.base; }
  function baseRate(v) { return CAL.bases[v.base] * U; }
  function keyOf(v) { return v.kind + '|' + v.base + '|' + v.end; }
  function valuesOfKey(k) { var a = k.split('|'); return { kind: a[0], base: a[1], end: +a[2] }; }
  function scheduleOf(v) {
    var base = baseRate(v), W = v.end;
    return v.kind === 'hold'
      ? { type: 'constant-warmup', low: LOW, base: base, warmupSteps: W, postWarmupSteps: 2 * W }
      : { type: 'warmup', base: base, warmupSteps: W, postWarmupSteps: 2 * W };
  }
  /* eta(t), the rate of the step from t to t + 1, with the arithmetic of toyD.js's schedules */
  var etaCache = {};
  function etaFn(v) {
    var k = keyOf(v);
    if (etaCache[k]) return etaCache[k];
    var base = baseRate(v), W = v.end, f;
    if (v.kind === 'hold') f = function (t) { return t < W ? LOW : base; };
    else f = function (t) { return base * Math.min(1, (t + 1) / W); };
    etaCache[k] = f;
    return f;
  }
  /** The calibration's outcome of a cell: {W, mark, firstAbove, stepsAbove, peakEtaH, divergedAt, ...}. */
  function cellOf(v) {
    var row = CAL.tables.strip[rowKey(v)], i = LIST.indexOf(v.end);
    return row && i >= 0 ? row[i] : null;
  }
  function shortestOf(rk) {
    var row = CAL.tables.strip[rk];
    for (var i = 0; i < row.length; i++) if (row[i].mark !== 'cross') return row[i].W;
    return null;
  }

  /* The traces, cached per parameters: TP.toyD.trace every step with keyframes every 64, extended
     by resuming (trace's `from`) to the step the runtime asks for, so that the first compute of a
     long cell traces one chunk and not the whole run (a 30,000-step ramp runs 90,000 steps). A
     cache entry holds the rows so far in growing arrays, {hs, loss}, indexed by step. */
  var TRACES = [];
  function grow(a, n) {
    if (a.length >= n) return a;
    var b = new Float64Array(Math.max(n, 2 * a.length));
    b.set(a);
    return b;
  }
  function extendTrace(c, N) {
    if (c.steps >= N || c.tr.divergedAt != null) return;
    var r = D.trace({ schedule: c.schedule, steps: N, keyframe: KF, from: c.res }), R = r.rows, n = R.t.length;
    if (n) {
      var need = R.t[n - 1] + 1;
      c.tr.rows.hs = grow(c.tr.rows.hs, need);
      c.tr.rows.loss = grow(c.tr.rows.loss, need);
      for (var k = 0; k < n; k++) { c.tr.rows.hs[R.t[k]] = R.hs[k]; c.tr.rows.loss[R.t[k]] = R.loss[k]; }
      c.last = R.t[n - 1];
    }
    for (var j = 0; j < r.keyframes.length; j++) c.tr.keyframes.push(r.keyframes[j]);
    c.tr.divergedAt = r.divergedAt;
    c.res = r.resume;
    c.steps = r.divergedAt != null ? r.divergedAt : N;
  }
  function traceOf(v, to) {
    var k = keyOf(v), N = to != null ? to : runLength(v.end), c = null;
    for (var i = 0; i < TRACES.length; i++) if (TRACES[i].key === k) c = TRACES[i];
    if (c && TRACES[TRACES.length - 1] !== c) { TRACES.splice(TRACES.indexOf(c), 1); TRACES.push(c); }
    if (!c) {
      var sch = scheduleOf(v), r0 = D.trace({ schedule: sch, steps: 0, keyframe: KF });
      c = { key: k, schedule: sch, steps: 0, res: r0.resume, eta: etaFn(v), last: 0, div: null,
        tr: { rows: { hs: Float64Array.from(r0.rows.hs), loss: Float64Array.from(r0.rows.loss) }, keyframes: r0.keyframes.slice(), divergedAt: null } };
      TRACES.push(c);
      if (TRACES.length > 6) TRACES.shift();
    }
    extendTrace(c, N);
    return c;
  }
  function copyState(s, key, n) {
    return { t: s.t, m: Float64Array.from(s.m), hs: s.hs, L: s.L, L0: s.L0, diverged: !!s.diverged, key: key, n: n };
  }
  /* the exact state at step t (t at most the divergence step), from the keyframe at or before it */
  function exactState(c, t) {
    var kf = c.tr.keyframes[Math.floor(t / KF)], s = copyState(kf.state, c.key, kf.t);
    for (var j = kf.t; j < t; j++) D.stepState(s, c.eta(j));
    s.n = t;
    return s;
  }
  /** The state at step t of the cached run c; past the divergence step, the divergence state. */
  function stateOf(c, t) {
    var dA = c.tr.divergedAt;
    if (dA != null && t >= dA) {
      if (!c.div) c.div = exactState(c, dA);
      var s = copyState(c.div, c.key, t);
      s.diverged = true;
      return s;
    }
    return exactState(c, t);
  }
  /** The record's row of step t: the learning rate, the sharpness and the loss. */
  function rowOf(c, t) {
    var i = Math.min(t, c.last), R = c.tr.rows;
    return { t: t, eta: c.eta(t), hs: R.hs[i], loss: R.loss[i] };
  }
  var hook = { slowMs: 0 };
  function wait(ms) {
    if (!(ms > 0)) return;
    var now = global.performance ? function () { return global.performance.now(); } : Date.now;
    var end = now() + ms;
    while (now() < end) { /* the test hook's delay */ }
  }
  /** The run's natural end: its divergence step, or its last step when it does not diverge. */
  function endOf(p) {
    var c = cellOf(p);
    return c && c.divergedAt != null ? c.divergedAt : runLength(p.end);
  }
  /** The runtime's compute (DS §7.2): rows, keyframes and the state for steps from + 1 to to. */
  function compute(p, seed, from, to) {
    var c = traceOf(p, to), rows = [], kf = {}, u = c.tr.divergedAt != null ? c.tr.divergedAt : runLength(p.end);
    for (var t = from + 1; t <= to; t++) rows.push(rowOf(c, t));
    for (var k = Math.ceil((from + 1) / KF) * KF; k <= to; k += KF) kf[k] = stateOf(c, k);
    wait(hook.slowMs * (to - from));
    return { rows: rows, keyframes: kf, state: stateOf(c, to), until: u > from && u <= to ? u : null };
  }
  function initState(p) {
    var s = D.initState();
    s.key = keyOf(p);
    s.n = 0;
    return s;
  }
  function advanceState(s, p, t) {
    D.stepState(s, etaFn(p)(t));
    s.n = t + 1;
    return s;
  }
  function recordOf(s, t) {
    return { t: t, eta: etaFn(valuesOfKey(s.key))(t), hs: s.hs, loss: s.L };
  }

  /* ---------- the strip, the readout and the quantities ---------- */

  /** Is the mark a pass: filled or open. */
  function passes(mark) { return mark === 'filled' || mark === 'open'; }
  /** The strip with the cell of v committed: {rowKey: {W: mark}}. */
  function withCell(strip, v) {
    var out = {}, rk = rowKey(v), c = cellOf(v);
    Object.keys(strip || {}).forEach(function (r) { out[r] = Object.assign({}, strip[r]); });
    if (c) { out[rk] = out[rk] || {}; out[rk][v.end] = c.mark; }
    return out;
  }
  function describe(v) {
    var W = fmt.int(v.end), B = BASE_TEXT[v.base];
    return v.kind === 'hold' ? 'A ' + W + '-step hold then jump to ' + B : 'A ' + W + '-step ramp to ' + B;
  }
  /** Does any length of v's row pass, by the calibration's table (CAL.tables.strip), whatever
      marks the reader has tried (build log Batch 5, rulings on the reads, page 9). */
  function rowPasses(v) {
    var row = CAL.tables.strip[rowKey(v)] || [];
    return row.some(function (cell) { return passes(cell.mark); });
  }
  /**
   * The readout (FP F9.2, WO-F9.2) of the whole run of v, whatever the cursor. A diverging run on a
   * row where no length of the list passes, by CAL.tables.strip, reports that no length on its row
   * passes; the marks the reader has tried do not decide it. With the cursor t before the run's
   * last step (the divergence step, or the run's length), the sentence opens "At step t, ", so that
   * Back, Forward and the scrubber change what the live twin says (accessibility report, L1).
   */
  function readoutText(v, t) {
    var c = cellOf(v);
    if (!c) return '';
    var last = c.divergedAt != null ? c.divergedAt : runLength(v.end), d = describe(v);
    var head = (t != null && t < last ? 'At step ' + fmt.int(t) + ', ' + d.charAt(0).toLowerCase() + d.slice(1) : d) + ' ';
    var cross = c.firstAbove != null ? 'first crosses the limit at step ' + fmt.int(c.firstAbove) : null;
    if (c.divergedAt != null && !rowPasses(v)) {
      return head + (cross ? cross + ' and ' : '') + 'diverges at step ' + fmt.int(c.divergedAt) + ', and no length on its row passes.';
    }
    var above = cross ? cross + ', stays above it for ' + fmt.int(c.stepsAbove) + (c.stepsAbove === 1 ? ' step' : ' steps') + ', ' : 'never crosses the limit, ';
    var peak = 'peaks at η·μₘₐₓ = ' + fmt.sig3(c.peakEtaH);
    var end = c.divergedAt != null ? ' and diverges at step ' + fmt.int(c.divergedAt) + '.' : ' and reaches the base rate.';
    return head + above + peak + end;
  }
  /** The named quantities (plan WO-I5.1): the whole run's outcome and the model's constants. */
  function quantitiesOf(v, strip) {
    var c = cellOf(v) || {}, q = {};
    q.end = v.end; q.base = v.base; q.kind = v.kind;
    q['base-lr'] = baseRate(v);
    q['run-steps'] = runLength(v.end);
    q['first-above'] = c.firstAbove != null ? c.firstAbove : null;
    q['steps-above'] = c.stepsAbove != null ? c.stepsAbove : null;
    q.peak = c.peakEtaH != null ? c.peakEtaH : null;
    q['divergence-step'] = c.divergedAt != null ? c.divergedAt : null;
    q['steps-after-jump'] = v.kind === 'hold' && c.divergedAt != null ? c.divergedAt - v.end : null;
    q.mark = c.mark || null;
    var s = strip || {}, n = 0;
    q['row-passes'] = rowPasses(v) ? 1 : 0;
    Object.keys(s).forEach(function (r) { n += Object.keys(s[r]).length; });
    q['strip-marks'] = n;
    q['unstable-lr'] = U;
    q['hold-rate'] = LOW;
    q.cap = CAP;
    q['max-train-steps'] = MAX_TRAIN;
    q['shortest-10x'] = shortestOf('ramp-10x');
    q['shortest-3x'] = shortestOf('ramp-3x');
    q['late-limit'] = D.limitRate(D.defaults.hInf);
    q['late-limit-multiple'] = D.limitRate(D.defaults.hInf) / U;
    var m = (CAL.quantities && CAL.quantities.model) || {};
    Object.keys(m).forEach(function (name) { if (!(name in q)) q[name] = m[name]; });
    return q;
  }

  TP.models = TP.models || {};
  var M = TP.models.warmupFigure = {
    LIST: LIST, ROWS: ROWS, runLength: runLength, rowKey: rowKey, cellOf: cellOf, etaFn: etaFn, baseRate: baseRate,
    traceOf: traceOf, compute: compute, endOf: endOf, init: initState, advance: advanceState, record: recordOf,
    readout: readoutText, quantities: quantitiesOf, withCell: withCell
  };
  Object.defineProperty(M, 'slowMs', { get: function () { return hook.slowMs; }, set: function (x) { hook.slowMs = +x || 0; } });

  /* ---------- drawing ---------- */

  var doc = global.document;
  if (!doc) return;
  function C() { return TP.chart; }
  var XA = CAL.domains.a.x, YA = CAL.domains.a.y;
  var PHONE_MQ = global.matchMedia ? global.matchMedia('(max-width: 639px)') : null;
  function phoneNow() { return !!(PHONE_MQ && PHONE_MQ.matches); }
  /** A power of ten as a tick label: 1, 10, then 10², 10³ and on, and 10⁻¹ and below. */
  function pow10(v) { return v === 1 ? '1' : v === 10 ? '10' : TP.fmt.byName('exp10')(v); }
  function stepTick(v) { return phoneNow() ? pow10(v) : fmt.int(v); }

  function margins(w, phone) { return phone ? { t: 6, r: 10, b: 38, l: 56 } : { t: 10, r: 14, b: 38, l: 58 }; }
  function panelAOpts() {
    return {
      letter: '(a)', describe: 'learning rate against step',
      /* 2026-11 review (post08): the rate axis starts at 10^-4, where the default ramp starts, so
         the stability limit and the ramp's top fill the panel; the longest ramps enter from below */
      xLog: 10, yLog: 10, xDomain: XA, yDomain: [1e-4, 1],
      xLabel: 'step', yLabel: 'learning rate',
      xTicks: [1, 10, 100, 1000, 10000],
      yTicks: function (d, px) { return px < 160 ? [1e-4, 1e-2, 1] : [1e-4, 1e-3, 1e-2, 1e-1, 1]; },
      xFormat: stepTick, yFormat: pow10,
      margin: margins,
      aspect: function (w, phone) { return phone ? 0.55 : 0.3; },
      maxHeight: function (w, phone) { return phone ? 200 : 280; }
    };
  }
  function panelBOpts() {
    return {
      letter: '(b)', describe: 'warmup lengths tried', note: 'warmup_steps tried',
      xLog: 10, xDomain: XA, yDomain: [SHOWN.length - 0.5, -0.5],
      xLabel: '', yLabel: '',
      xTicks: function (d, px) { return px < 500 ? [10, 100, 1000, 10000] : LIST.slice(); },
      yTicks: 'none', grid: 'none',
      xFormat: stepTick,
      margin: function (w, phone) { var m = margins(w, phone); return { t: 3, r: m.r, b: 22, l: m.l }; },
      aspect: function (w, phone) { return 74 / Math.max(1, w); },
      maxHeight: function () { return 74; }
    };
  }

  /* The steps at which (a) samples the limit: log-spaced about 3 px apart over the step axis,
     from step 1, kept per plot width. The limit bends over tens of pixels, so the line keeps its
     form, and a frame of play draws at most a few hundred points. */
  var sampleCache = { w: 0, list: [] };
  function sampleSteps(width) {
    if (sampleCache.w === width) return sampleCache.list;
    var dec = Math.log10(XA[1] / XA[0]), n = Math.max(40, Math.ceil(width / 3)), out = [];
    for (var j = 0; j <= n; j++) {
      var t = Math.round(XA[0] * Math.pow(10, dec * j / n));
      if (!out.length || t > out[out.length - 1]) out.push(t);
    }
    sampleCache = { w: width, list: out };
    return out;
  }
  /** The record row at or before step t (rows every `every` steps, with the frontier's row). */
  function rowAt(rows, t) {
    if (!rows || !rows.length) return null;
    var lo = 0, hi = rows.length - 1;
    if (rows[hi].t <= t) return rows[hi];
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (rows[mid].t <= t) lo = mid; else hi = mid - 1;
    }
    return rows[lo];
  }
  /** The limit 2/h_s from step 1 to step tEnd, sampled from the record: [[t, limit], ...]. */
  function limitPoints(rows, tEnd, width) {
    var out = [], S = sampleSteps(width), last = -1;
    for (var j = 0; j < S.length && S[j] <= tEnd; j++) {
      var r = rowAt(rows, S[j]);
      if (!r || r.t < 1 || r.t === last) continue;
      out.push([r.t, D.limitRate(r.hs)]);
      last = r.t;
    }
    var e = rowAt(rows, tEnd);
    if (e && e.t >= 1 && e.t !== last) out.push([e.t, D.limitRate(e.hs)]);
    return out;
  }
  /** The schedule's shape from step 1 to the run's last step, as the corners of its line. */
  function schedulePoints(v) {
    var W = v.end, L = runLength(W), base = baseRate(v), eta = etaFn(v);
    if (v.kind === 'hold') return [[1, LOW], [W, LOW], [W, base], [L, base]];
    return [[1, eta(1)], [W - 1, base], [L, base]];
  }
  function X0(q) { return q[0]; }
  function X1(q) { return q[1]; }

  /** A 1-px tick in text ink on the step axis at step x, 8 px tall, recorded as an annotation's line. */
  function axisTick(p, x, id) {
    var X = p.x(Math.max(x, XA[0])), Y = p.height;
    p.layers.annotations.append('path').attr('class', 'annotation').attr('data-annotation', id + '-tick')
      .attr('d', 'M' + X.toFixed(2) + ',' + Y.toFixed(2) + 'V' + (Y - 8).toFixed(2));
    C().obstacle(p, [[X, Y], [X, Y - 8]], { kind: 'annotation', type: 'segment', width: 1 });
  }

  function init(element) {
    var pa = null, pb = null, fig, run = null, hoverSet = false, xCache = { rows: null, n: 0, list: [] };
    var strip = {}, suppress = false;
    var lastB = null;

    function currentValues(ctx) { return (ctx && ctx.values) || fig.values(); }

    /* ---- (a) ---- */
    function drawA(p, state, ctx) {
      var v = currentValues(ctx), t = ctx.t || 0, rows = ctx.rows, W = v.end, items = [];
      var c = cellOf(v), dA = c ? c.divergedAt : null;
      /* the previous run's limit, dashed (DS §4.8) */
      if (ctx.ghostRows && ctx.ghostRows.length > 1) {
        var gEnd = ctx.ghostRows[ctx.ghostRows.length - 1].t, g = ctx.ghostRows, gd = null;
        for (var i = 0; i < g.length; i++) if (!(g[i].loss <= 100)) { gd = g[i].t; break; }
        var gp = limitPoints(g, gd != null ? gd : gEnd, p.width);
        if (gp.length >= 2) C().line(p, gp, X0, X1, { role: 'model', series: 'limit-ghost', dash: 'ghost', weight: 2, key: 'limit-ghost', obstacle: false });
      }
      /* the current run's limit up to the cursor, and to the divergence step at most. Until the
         runs part, the current limit lies on the ghost's, so it is drawn in the ghost layer, above
         the ghost, over a --surface casing 4 px wider: where the two coincide the dash-dot reads
         alone, and the dashed ghost shows only where the previous run's limit departs from it or
         outlasts it (page 9's reader finding 14, DS §4.8). The reader's schedule stays above both. */
      var tEnd = Math.min(t, dA != null ? dA : Infinity);
      var lp = tEnd >= 1 ? limitPoints(rows, tEnd, p.width) : [];
      if (lp.length >= 2) {
        var lpath = C().line(p, lp, X0, X1, { role: 'model', series: 'limit', dash: 'level', key: 'limit', layer: p.layers.ghosts });
        if (lpath && ctx.ghostRows && ctx.ghostRows.length > 1) {
          var ln = lpath.node(), casing = ln.cloneNode(false);
          casing.setAttribute('class', 'casing line');
          casing.removeAttribute('data-key');
          casing.removeAttribute('style');
          casing.style.strokeWidth = '6px';
          ln.parentNode.insertBefore(casing, ln);
        }
        /* Settled, the label is placed along the whole limit. While the run plays, its feature is
           the limit's first stretch, to step 30 at most, which stops changing after the first
           frames, so that the held position stays admissible and no frame places it again. */
        var feat = { type: 'line', of: 'limit' };
        if (ctx.playing) {
          var early = lp.filter(function (q) { return q[0] <= 30; });
          if (early.length >= 2) feat = { type: 'line', points: early };
        }
        items.push({ id: 'limit', text: 'stability limit (2 / sharpness)', role: 'model', series: 'limit',
          feature: feat, phone: { text: 'limit' }, captionNames: true, keySentence: true });
      }
      /* the schedule, the reader's shape (DS §4.10) */
      C().line(p, schedulePoints(v), X0, X1, { role: 'reader', series: 'schedule', key: 'schedule' });
      /* the events on the step axis, each once the cursor has passed it */
      if (c && c.firstAbove != null && t >= c.firstAbove) {
        axisTick(p, c.firstAbove, 'first-above');
        C().annotation(p, { kind: 'callout', id: 'first-above', text: 'first above the limit', phone: { text: 'above' },
          anchor: { x: Math.max(c.firstAbove, XA[0]), y: p.y.invert(p.height - 8), r: 1 }, captionNames: true });
      }
      /* the run stops at its divergence step, so the cursor usually stands on this tick: the text
         names the cursor's step there, and the cursor is its own series, never its rival */
      if (dA != null && t >= dA) {
        axisTick(p, dA, 'diverged');
        C().annotation(p, { kind: 'callout', id: 'diverged', text: 'diverged', phone: { text: 'diverged' },
          anchor: { x: Math.max(dA, XA[0]), y: p.y.invert(p.height - 8), r: 1, series: 'cursor' }, captionNames: true, keySentence: true });
      }
      /* the ramp's end named on the step axis, and the cursor with its step unless the two names
         would overlap (the counter in the header gives the step) */
      var endName = fmt.int(W);
      C().level(p, 'x', W, { role: 'reader', text: endName, series: 'end' });
      if (t >= 1) {
        var tName = fmt.int(t), apart = true;
        if (C().measureText) {
          var w1 = C().measureText([endName], 'tick', p).w, w2 = C().measureText([tName], 'tick', p).w;
          apart = Math.abs(p.x(t) - p.x(W)) >= (w1 + w2) / 2 + 6;
        }
        C().level(p, 'x', t, { role: 'reader', text: apart ? tName : '', line: true, series: 'cursor', cursor: true });
      }
      /* the handle at the ramp's end, on the corner of the reader's line */
      C().handle(p, {
        id: 'end', axis: 'x', value: W, at: baseRate(v), snap: LIST, min: LIST[0], max: LIST[LIST.length - 1], scale: 'log',
        label: fig.params.end.label, format: function (x) { return fmt.int(x) + ' steps'; },
        onChange: function (x) { fig.set({ end: x }, { transient: true }); },
        onSettle: function (x) { fig.set({ end: x }); }
      });
      C().place(p, items, { hold: !!ctx.hold });
    }

    /* ---- (b) ---- */
    var bPoints = [];
    function drawB(p, v, shownStrip, ctx) {
      var phone = p.phone;
      /* the cap at 10% of max_train_steps, a dashed limit named on the axis (DS §4.7) */
      C().level(p, 'x', CAP, { role: 'ref', text: phone ? '10% cap' : '10% of max_train_steps', line: true, series: 'cap' });
      /* the row names, left of the list, in the decade it leaves empty */
      var names = p.layers.names || p.layers.labels;
      SHOWN.forEach(function (rk, i) {
        names.append('text').attr('class', 'row-name').attr('data-row', rk)
          .attr('x', (p.x(LIST[0]) - 8).toFixed(1)).attr('y', p.y(i).toFixed(1))
          .attr('text-anchor', 'end').attr('dominant-baseline', 'central')
          .text(phone ? ROW_PHONE[rk] : ROW_TEXT[rk]);
      });
      bPoints = [];
      SHOWN.forEach(function (rk, i) {
        var row = shownStrip[rk] || {};
        var Ws = Object.keys(row).map(Number).sort(function (a, b) { return a - b; });
        var filled = [], open = [], cross = [];
        Ws.forEach(function (W) {
          var d = { W: W, i: i, key: rk + '@' + W };
          (row[W] === 'filled' ? filled : row[W] === 'open' ? open : cross).push(d);
          var cell = CAL.tables.strip[rk][LIST.indexOf(W)];
          var out = row[W] === 'cross' ? 'diverged at step ' + fmt.int(cell.divergedAt) : row[W] === 'filled' ? 'reached the base rate, loss never above its start' : 'reached the base rate after a rise in the loss';
          bPoints.push({ x: W, y: i, key: d.key, head: ROW_TEXT[rk] + ', ' + fmt.int(W) + ' steps', cell: { rk: rk, W: W },
            rows: [{ value: out, label: '', role: 'model' }] });
        });
        var WX = function (d) { return d.W; }, IY = function (d) { return d.i; }, K = function (d) { return d.key; };
        if (filled.length) C().markers(p, filled, WX, IY, { role: 'model', series: 'strip', key: K });
        if (open.length) C().markers(p, open, WX, IY, { role: 'model', series: 'strip', fill: 'open', key: K });
        if (cross.length) C().cross(p, cross, WX, IY, { role: 'model', series: 'strip', key: K });
      });
      /* the current cell, ringed in the reader token */
      var ci = SHOWN.indexOf(rowKey(v));
      if (ci >= 0) C().ring(p, v.end, ci, { role: 'reader', series: 'current', key: 'current' });
      C().place(p, [], { hold: !!(ctx && ctx.hold) });
    }
    function redrawB(ctx) {
      if (!pb) return;
      var v = currentValues(ctx);
      pb.update(function (p) { drawB(p, v, strip, ctx || {}); });
      lastB = null;
    }

    /* ---- the strip: commit on each settle (DS §7.6) ---- */
    function commit() {
      if (suppress || !run) return;
      var v = run.params ? run.params() : fig.values(), c = cellOf(v);
      if (!c) return;
      var rk = rowKey(v);
      if (strip[rk] && strip[rk][v.end] === c.mark) return;
      strip[rk] = strip[rk] || {};
      strip[rk][v.end] = c.mark;
      redrawB({ values: v });
    }
    function clearStrip() {
      strip = {};
      suppress = true;
      try { redrawB(); if (fig) fig.redraw({ settle: true }); } finally { suppress = false; }
    }

    fig = TP.fig(element, {
      kind: 'running',
      params: {
        end: {
          type: 'number', default: CAL.defaults.end, domain: [LIST[0], LIST[LIST.length - 1]], snap: LIST.slice(), scale: 'log',
          change: 'restart', ghost: true, showEnd: true, control: 'handle', handle: 'a', label: 'End of the warmup ramp, warmup_steps',
          format: function (x) { return fmt.int(x) + ' steps'; }
        },
        base: {
          type: 'choice', default: CAL.defaults.base, domain: Object.keys(CAL.bases), change: 'restart', ghost: true, showEnd: true,
          control: 'none', label: 'Base rate',
          labels: { '10x': '10×', '3x': '3×' }
        },
        kind: {
          type: 'choice', default: CAL.defaults.kind, domain: ['ramp', 'hold'], change: 'restart', ghost: true, showEnd: true,
          control: 'none', label: 'Schedule'
        }
      },
      /* "100 steps", "300 steps" and "hold, then jump" set the calibration's whole states w100, w300
         and hold, which the paragraphs after the figure describe (PW §2.3) */
      presets: {
        'ramp': { key: 'ramp', kind: CAL.presets.ramp.kind },
        'hold, then jump': Object.assign({ key: 'hold' }, CAL.states.hold)
      },
      /* the ledger's settings, which the calibration writes as whole states (w100, w300, and
         hold: the preset "hold, then jump" at the default length), so that the ledger check
         reaches each from any state */
      states: CAL.states,
      /* the two presets the task line names sit in the dock with the run strip, and "100 steps" and
         "300 steps" stand in div.fig-controls-more before Reset, so that the phone dock stays within
         two rows of 44-px targets (DS §3.5 item 4) */
      docked: ['preset:ramp', 'preset:hold', 'reset'],
      snapshot: function () { return JSON.parse(JSON.stringify(strip)); },
      restore: function (s) { strip = s ? JSON.parse(JSON.stringify(s)) : {}; redrawB(); },
      clear: function () { strip = {}; },
      draw: function (state, ctx) {
        if (!pa) {
          pa = C().panel(ctx.fig.panels, panelAOpts());
          pb = C().panel(ctx.fig.panels, panelBOpts());
        }
        var v = currentValues(ctx);
        if (!state) { pa.update(function () {}); pb.update(function () {}); return; }
        pa.update(function (p) { drawA(p, state, ctx); });
        /* (b) changes with the parameters and the strip alone, so a frame of play leaves it */
        var sig = [keyOf(v), pb.width, pb.phone, JSON.stringify(strip)].join('|');
        if (!(ctx.playing && sig === lastB)) {
          pb.update(function (p) { drawB(p, v, strip, ctx); });
          lastB = sig;
        }
        run = ctx.run || run;
        if (run && !hoverSet) {
          hoverSet = true;
          var h = run.recordHandlers();
          C().hover(pa, {
            /* the recorded steps from 1, kept while the record neither changes nor grows */
            xValues: function () {
              var R = run.rows(), n = R.length;
              if (xCache.rows !== R || xCache.n !== n) {
                var list = [];
                for (var i = 0; i < n; i++) if (R[i].t >= 1) list.push(R[i].t);
                xCache = { rows: R, n: n, list: list };
              }
              return xCache.list;
            },
            by: 'step', label: 'Reading of (a) by step',
            format: function (x) { return 'Step ' + fmt.int(x); }, tick: function (x) { return fmt.int(x); },
            series: [
              { label: 'learning rate', role: 'reader', fmt: fmt.lr, y: function (x) { var r = rowAt(run.rows(), x); return r && r.t === x ? r.eta : r ? etaFn(run.params())(x) : null; } },
              { label: 'stability limit', role: 'model', fmt: fmt.lr, y: function (x) { var r = rowAt(run.rows(), x); return r ? D.limitRate(r.hs) : null; } }
            ],
            extra: function (x) {
              var r = rowAt(run.rows(), x), c = cellOf(run.params());
              if (!r) return [];
              var out = ['η·μₘₐₓ = ' + fmt.sig3(etaH(etaFn(run.params())(x), r.hs))];
              if (c && c.divergedAt != null && x >= c.divergedAt) out.push('diverged at step ' + fmt.int(c.divergedAt));
              return out;
            },
            press: h.press, onRead: h.onRead
          });
          C().pointHover(pb, {
            by: 'attempt', label: 'Reading of (b) by attempt',
            points: function () { return bPoints; },
            select: function (i, pt) {
              if (!pt || !pt.cell) return;
              var a = pt.cell.rk.split('-');
              fig.set({ kind: a[0], base: a[1], end: pt.cell.W });
            }
          });
        }
      },
      readout: function (state, ctx) { return readoutText(currentValues(ctx), ctx && ctx.t != null ? ctx.t : run ? run.t() : null); },
      table: function (state, ctx) {
        var v = currentValues(ctx), rows = [], R = ctx.rows || (run ? run.rows() : []), c = cellOf(v);
        var F = R.length ? R[R.length - 1].t : 0, eta = etaFn(v), L0 = R.length ? R[0].loss : 1;
        var want = [];
        for (var t = 1; t <= Math.min(20, F); t++) want.push(t);
        for (var e = 1.35; e <= Math.log10(Math.max(F, 1)) + 1e-9; e += 0.05) {
          var s = Math.round(Math.pow(10, e));
          if (s > 20 && s <= F && s !== want[want.length - 1]) want.push(s);
        }
        [c && c.firstAbove, c && c.divergedAt, v.end, F].forEach(function (s) { if (s != null && s >= 1 && s <= F && want.indexOf(s) < 0) want.push(s); });
        want.sort(function (a, b) { return a - b; });
        want.forEach(function (s) {
          var r = rowAt(R, s);
          if (!r) return;
          rows.push({ what: 'Step ' + fmt.int(r.t), lr: eta(r.t), limit: D.limitRate(r.hs), x: etaH(eta(r.t), r.hs), loss: r.loss / L0 });
        });
        var S = withCell(strip, v);
        ROWS.forEach(function (rk) {
          Object.keys(S[rk] || {}).map(Number).sort(function (a, b) { return a - b; }).forEach(function (W) {
            var cell = CAL.tables.strip[rk][LIST.indexOf(W)];
            rows.push({ what: 'Strip: ' + ROW_TEXT[rk] + ', ' + fmt.int(W) + ' steps',
              outcome: cell.mark === 'cross' ? 'diverged at step ' + fmt.int(cell.divergedAt) : cell.mark === 'filled' ? 'passed; the loss never rose above its start' : 'passed after a rise in the loss' });
          });
        });
        var num = function (f) { return function (x) { return x == null || !isFinite(x) ? '' : f(x); }; };
        return {
          columns: [
            { key: 'what', label: 'Row' },
            { key: 'lr', label: 'Learning rate', format: num(fmt.lr) },
            { key: 'limit', label: 'Stability limit 2/μₘₐₓ', format: num(fmt.lr) },
            { key: 'x', label: 'η·μₘₐₓ', format: num(fmt.sig3) },
            { key: 'loss', label: 'Loss over its start', format: num(fmt.sig3) },
            { key: 'outcome', label: 'Attempt on the strip' }
          ],
          rows: rows,
          caption: describe(v) + ', a run of ' + fmt.int(runLength(v.end)) + ' steps computed to step ' + fmt.int(F) +
            ', sampled at every step to 20 and at 20 steps per decade after, with the steps of its events, then the attempts on the strip.'
        };
      },
      quantities: function (state, ctx) { var v = currentValues(ctx); return quantitiesOf(v, withCell(strip, v)); }
    });
    fig.on('settle', commit);

    run = TP.run(fig, {
      init: function (p) { return initState(p); },
      advance: function (s, p, rng, t) { return advanceState(s, p, t); },
      record: function (s, t) { return recordOf(s, t); },
      compute: compute,
      until: function (s, t, p) { return !!s.diverged || t >= runLength(p.end); },
      steps: function (p) { return runLength(p.end); },
      limit: function (p) { return runLength(p.end); },
      every: function (p) { return Math.ceil(runLength(p.end) / 50000); },
      keyframe: KF,
      pace: 'log', duration: 6000, unit: 'step', recordPanel: 'a', reset: 'show'
    });
    M.strip = function () { return JSON.parse(JSON.stringify(strip)); };
    M.readingPoints = function () { return bPoints; };
  }

  doc.addEventListener('tp:ready', function () {
    var el = doc.getElementById('fig-warmup');
    if (el && TP.fig && TP.run && TP.chart && TP.toyD) init(el);
  });
})(typeof window !== 'undefined' ? window : globalThis);
