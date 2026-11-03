/*
 * f4-2-spread.js: figure F4.2, spreading a fixed number of trials (fig-spread), on page 4 #budget.
 *
 * Work order: notes/revamp/implementation-plan.md §6.8 (WO-F4.2), with §6.0. Entry:
 * notes/revamp/figure-plan.md F4.2 and review/synthesis.md R3 and R14. Design:
 * notes/revamp/design-system.md §3.4, §3.5, §4, §5, §6 and §9. A fixed-frame figure with a width
 * handle on both panels, two segment controls in the dock, three presets and "Draw again".
 *
 * The model is TP.desiderata (site/js/lib/desiderata.js), rebuilt by C6. The probability curve of
 * panel (a) is never computed in the page: the 30 curves (2 to 6 scientific values by 24, 48 or 96
 * trials by the two gap settings, at the 39 widths of CAL.tables.widths) are the table
 * CAL.tables.curves, which
 * tests/calibration/fig-spread.calibrate.js writes from TP.desiderata.curve over the fixed repeat
 * seeds 1 to 200. A change of any control therefore costs a lookup, and "Draw again" never changes
 * the curve. Panel (b) is TP.desiderata.study at the current setting and seed.
 *
 * The derived state carries keyed rows (DS §9): the curve's 39 points ('w0' to 'w38'), the studies
 * ('v1' to 'v6') and their trials ('v<j>-<i>'). A study's trials depend on its own seed and on the
 * first n points of its sequence, so a change of the number of values or trials keeps the trials
 * that remain, and a change of width maps the same sequence indices into the new range (DS §9
 * rule 6). Numbers that must stay whole (the pick) are kept in strings.
 *
 * The panels.
 *   (a) the share of the 200 repeated designs that pick the truly best value, against the range
 *       width in decades (linear, 0.25 to 5; y 0 to 1 printed as a percentage). The curve in model
 *       blue; the reader's width as a reader line named on the x axis, with its handle on the axis
 *       and a press band along the line; the curve's value there as a filled marker, named on the
 *       y axis in the reader token. The region names "too narrow: the optimum is outside" over the
 *       widths below the width at which the truly best value's optimum enters the range, and "too
 *       wide: too sparse" along the curve from its best width to 5 decades. A change of `values`
 *       or `trials` leaves the previous curve dashed (DS §4.8).
 *   (b) one study per scientific value, one row per value in six fixed slots, so the panel's height
 *       never changes: each row's trials as filled markers against the learning rate (log10 units
 *       over CAL.domains.b.x), the height inside a row the trial's validation error above the toy's
 *       lowest on a square-root scale (a trial more than DCAP decades from its value's optimum
 *       stands at the row's top), each study's best trial ringed, the searched range as one reader
 *       window across the rows with a handle at each edge, and the truly best value's row named
 *       "truly best value (the toy's)" (phone "truly best") inside the row's band. The header names
 *       the design's pick.
 *   The panels stack at every width, each at a fixed height (site/css/figures/fig-spread.css).
 *
 * The parameters: values (2 to 6, a segment, docked, transition, ghost), trials (24, 48, 96, a
 * segment, docked, transition, ghost), width (0.25 to 5 by 0.125, handles on (a) and (b),
 * transition, no ghost), gap ('separated' or 'close', no control, transition, ghost: set by the
 * preset "values close together" and cleared by Reset; the readout names it while it stands) and
 * the seed ("Draw again" in more, cut). The presets "too narrow", "too wide", "a fourth value" (key
 * fourth-value) and "values close together" (key close-values, Batch 7 ruling) came from CAL.
 *
 * 2026-11 review (post01): panel (b) redrawn as one strip per option (see drawB), panel (a) shorter,
 * the preset buttons removed (the guided tour sets values through data-params), and the controls
 * renamed "Options compared" and "Total trials". The gap parameter stays, without a control. "Draw again" and Reset sit in
 * div.fig-controls-more (DS §3.5 item 8).
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};

  /* BEGIN GENERATED table-cal */
  // From tests/calibration/out/fig-spread.json by npm run generate (tests/lib/write-generated.js).
  var CAL = {
    "defaults": {"values": 3, "trials": 48, "width": 3, "gap": "separated"},
    "presets": {
      "too-narrow": {"width": 0.75},
      "too-wide": {"width": 5},
      "fourth-value": {"values": 4},
      "close-values": {"values": 3, "trials": 48, "width": 3, "gap": "close"}
    },
    "states": {},
    "seed": 4,
    "repeats": 200,
    "domains": {"a": {"x": [0.25, 5], "y": [0, 1]}, "b": {"x": [-5.5, -0.5], "rows": 6}},
    "tables": {
      "widths": [0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1, 1.125, 1.25, 1.375, 1.5, 1.625, 1.75, 1.875, 2, 2.125, 2.25, 2.375, 2.5, 2.625, 2.75, 2.875, 3, 3.125, 3.25, 3.375, 3.5, 3.625, 3.75, 3.875, 4, 4.125, 4.25, 4.375, 4.5, 4.625, 4.75, 4.875, 5],
      "curves": [
        {
          "gap": "separated",
          "values": 2,
          "trials": 24,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.245, 0.765, 0.82, 0.78, 0.77, 0.765, 0.815, 0.84, 0.775, 0.715, 0.66, 0.675, 0.68, 0.645, 0.625, 0.605, 0.6, 0.615, 0.65, 0.625, 0.62, 0.62, 0.61, 0.575, 0.57, 0.57, 0.57, 0.565, 0.555, 0.565, 0.56, 0.59]
        },
        {
          "gap": "separated",
          "values": 2,
          "trials": 48,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.34, 0.95, 0.99, 0.965, 0.955, 0.94, 0.91, 0.935, 0.895, 0.905, 0.885, 0.865, 0.86, 0.85, 0.83, 0.83, 0.805, 0.78, 0.795, 0.76, 0.71, 0.7, 0.705, 0.675, 0.685, 0.685, 0.695, 0.69, 0.66, 0.665, 0.67, 0.69]
        },
        {
          "gap": "separated",
          "values": 2,
          "trials": 96,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.455, 1, 1, 1, 1, 0.995, 1, 1, 0.995, 1, 0.995, 1, 0.99, 0.99, 0.99, 0.99, 0.975, 0.97, 0.965, 0.955, 0.935, 0.94, 0.94, 0.915, 0.915, 0.91, 0.92, 0.94, 0.895, 0.88, 0.87, 0.87]
        },
        {
          "gap": "separated",
          "values": 3,
          "trials": 24,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.175, 0.54, 0.725, 0.62, 0.54, 0.585, 0.605, 0.64, 0.585, 0.495, 0.44, 0.5, 0.49, 0.465, 0.475, 0.47, 0.455, 0.44, 0.455, 0.445, 0.405, 0.415, 0.405, 0.385, 0.365, 0.33, 0.34, 0.315, 0.31, 0.29, 0.305, 0.31]
        },
        {
          "gap": "separated",
          "values": 3,
          "trials": 48,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.225, 0.905, 0.98, 0.95, 0.935, 0.88, 0.87, 0.885, 0.82, 0.785, 0.755, 0.765, 0.715, 0.635, 0.625, 0.62, 0.645, 0.615, 0.61, 0.635, 0.575, 0.54, 0.52, 0.505, 0.49, 0.505, 0.5, 0.48, 0.475, 0.495, 0.495, 0.515]
        },
        {
          "gap": "separated",
          "values": 3,
          "trials": 96,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.29, 1, 1, 1, 1, 0.995, 0.995, 1, 0.995, 1, 0.985, 1, 0.985, 0.985, 0.995, 0.99, 0.96, 0.96, 0.95, 0.93, 0.905, 0.885, 0.845, 0.855, 0.82, 0.835, 0.81, 0.795, 0.765, 0.73, 0.735, 0.72]
        },
        {
          "gap": "separated",
          "values": 4,
          "trials": 24,
          "p": [0, 0, 0, 0, 0, 0, 0.01, 0.14, 0.415, 0.55, 0.475, 0.4, 0.49, 0.52, 0.51, 0.43, 0.405, 0.34, 0.355, 0.395, 0.375, 0.385, 0.41, 0.41, 0.405, 0.41, 0.4, 0.385, 0.405, 0.38, 0.345, 0.335, 0.31, 0.33, 0.305, 0.28, 0.28, 0.275, 0.275]
        },
        {
          "gap": "separated",
          "values": 4,
          "trials": 48,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.19, 0.72, 0.805, 0.76, 0.74, 0.695, 0.745, 0.8, 0.675, 0.585, 0.55, 0.6, 0.605, 0.54, 0.51, 0.515, 0.52, 0.49, 0.495, 0.495, 0.46, 0.455, 0.44, 0.42, 0.41, 0.4, 0.425, 0.41, 0.43, 0.435, 0.43, 0.44]
        },
        {
          "gap": "separated",
          "values": 4,
          "trials": 96,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.26, 0.95, 0.98, 0.955, 0.95, 0.925, 0.9, 0.925, 0.86, 0.855, 0.835, 0.85, 0.84, 0.815, 0.79, 0.775, 0.755, 0.735, 0.73, 0.725, 0.675, 0.64, 0.63, 0.62, 0.61, 0.6, 0.61, 0.595, 0.57, 0.585, 0.6, 0.62]
        },
        {
          "gap": "separated",
          "values": 5,
          "trials": 24,
          "p": [0, 0, 0, 0, 0, 0, 0.005, 0.155, 0.35, 0.45, 0.405, 0.32, 0.4, 0.405, 0.39, 0.33, 0.335, 0.315, 0.305, 0.31, 0.3, 0.29, 0.29, 0.285, 0.265, 0.27, 0.265, 0.26, 0.285, 0.275, 0.255, 0.235, 0.23, 0.25, 0.23, 0.235, 0.22, 0.225, 0.225]
        },
        {
          "gap": "separated",
          "values": 5,
          "trials": 48,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.18, 0.615, 0.735, 0.645, 0.58, 0.6, 0.615, 0.685, 0.62, 0.5, 0.44, 0.46, 0.505, 0.475, 0.455, 0.46, 0.44, 0.405, 0.425, 0.415, 0.39, 0.395, 0.38, 0.36, 0.345, 0.31, 0.335, 0.325, 0.335, 0.33, 0.34, 0.36]
        },
        {
          "gap": "separated",
          "values": 5,
          "trials": 96,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.255, 0.93, 0.98, 0.955, 0.95, 0.885, 0.875, 0.865, 0.845, 0.8, 0.81, 0.79, 0.765, 0.685, 0.675, 0.685, 0.7, 0.68, 0.68, 0.68, 0.605, 0.555, 0.53, 0.515, 0.505, 0.5, 0.495, 0.49, 0.5, 0.535, 0.535, 0.56]
        },
        {
          "gap": "separated",
          "values": 6,
          "trials": 24,
          "p": [0, 0, 0, 0, 0, 0, 0.005, 0.155, 0.35, 0.45, 0.405, 0.32, 0.4, 0.405, 0.39, 0.33, 0.335, 0.315, 0.305, 0.305, 0.295, 0.29, 0.285, 0.285, 0.265, 0.27, 0.265, 0.255, 0.28, 0.27, 0.245, 0.22, 0.21, 0.23, 0.215, 0.215, 0.2, 0.21, 0.2]
        },
        {
          "gap": "separated",
          "values": 6,
          "trials": 48,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.175, 0.54, 0.725, 0.62, 0.54, 0.585, 0.605, 0.63, 0.58, 0.49, 0.43, 0.46, 0.47, 0.455, 0.45, 0.455, 0.445, 0.435, 0.43, 0.425, 0.37, 0.375, 0.375, 0.335, 0.325, 0.28, 0.29, 0.275, 0.255, 0.255, 0.265, 0.285]
        },
        {
          "gap": "separated",
          "values": 6,
          "trials": 96,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.225, 0.905, 0.98, 0.95, 0.935, 0.88, 0.87, 0.885, 0.82, 0.785, 0.755, 0.765, 0.715, 0.635, 0.625, 0.62, 0.645, 0.615, 0.61, 0.635, 0.575, 0.54, 0.515, 0.5, 0.485, 0.5, 0.5, 0.465, 0.475, 0.495, 0.495, 0.505]
        },
        {
          "gap": "close",
          "values": 2,
          "trials": 24,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.065, 0.55, 0.55, 0.485, 0.58, 0.54, 0.53, 0.655, 0.585, 0.475, 0.49, 0.53, 0.545, 0.52, 0.465, 0.47, 0.505, 0.545, 0.515, 0.55, 0.56, 0.545, 0.53, 0.505, 0.49, 0.495, 0.515, 0.495, 0.51, 0.515, 0.525, 0.515]
        },
        {
          "gap": "close",
          "values": 2,
          "trials": 48,
          "p": [0, 0, 0, 0, 0, 0, 0, 0, 0.62, 0.595, 0.53, 0.585, 0.58, 0.585, 0.585, 0.54, 0.51, 0.58, 0.57, 0.565, 0.565, 0.54, 0.525, 0.575, 0.565, 0.495, 0.5, 0.485, 0.49, 0.485, 0.475, 0.46, 0.5, 0.5, 0.475, 0.505, 0.5, 0.52, 0.52]
        },
        {
          "gap": "close",
          "values": 2,
          "trials": 96,
          "p": [0, 0, 0, 0, 0, 0, 0, 0, 0.68, 0.62, 0.65, 0.605, 0.575, 0.665, 0.63, 0.64, 0.625, 0.635, 0.595, 0.555, 0.605, 0.585, 0.605, 0.63, 0.635, 0.57, 0.575, 0.505, 0.555, 0.555, 0.55, 0.525, 0.565, 0.595, 0.56, 0.595, 0.55, 0.565, 0.575]
        },
        {
          "gap": "close",
          "values": 3,
          "trials": 24,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.025, 0.35, 0.38, 0.375, 0.35, 0.305, 0.38, 0.42, 0.43, 0.345, 0.33, 0.335, 0.355, 0.375, 0.37, 0.365, 0.37, 0.385, 0.38, 0.35, 0.345, 0.35, 0.355, 0.32, 0.305, 0.285, 0.28, 0.275, 0.275, 0.26, 0.27, 0.27]
        },
        {
          "gap": "close",
          "values": 3,
          "trials": 48,
          "p": [0, 0, 0, 0, 0, 0, 0, 0, 0.435, 0.385, 0.36, 0.455, 0.36, 0.385, 0.45, 0.43, 0.41, 0.405, 0.435, 0.37, 0.35, 0.32, 0.36, 0.39, 0.405, 0.35, 0.365, 0.34, 0.36, 0.32, 0.325, 0.32, 0.33, 0.32, 0.325, 0.37, 0.345, 0.375, 0.37]
        },
        {
          "gap": "close",
          "values": 3,
          "trials": 96,
          "p": [0, 0, 0, 0, 0, 0, 0, 0, 0.505, 0.435, 0.555, 0.47, 0.49, 0.435, 0.415, 0.455, 0.465, 0.47, 0.415, 0.355, 0.41, 0.415, 0.405, 0.425, 0.47, 0.405, 0.37, 0.38, 0.38, 0.42, 0.395, 0.38, 0.375, 0.34, 0.37, 0.395, 0.4, 0.4, 0.385]
        },
        {
          "gap": "close",
          "values": 4,
          "trials": 24,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.025, 0.265, 0.305, 0.275, 0.245, 0.265, 0.32, 0.32, 0.31, 0.22, 0.185, 0.19, 0.235, 0.25, 0.255, 0.275, 0.3, 0.32, 0.3, 0.28, 0.275, 0.275, 0.285, 0.27, 0.27, 0.26, 0.245, 0.235, 0.24, 0.235, 0.245, 0.22]
        },
        {
          "gap": "close",
          "values": 4,
          "trials": 48,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.005, 0.375, 0.365, 0.33, 0.405, 0.31, 0.345, 0.435, 0.325, 0.26, 0.3, 0.33, 0.295, 0.31, 0.265, 0.28, 0.315, 0.35, 0.32, 0.29, 0.275, 0.28, 0.285, 0.27, 0.27, 0.25, 0.225, 0.24, 0.275, 0.27, 0.285, 0.31]
        },
        {
          "gap": "close",
          "values": 4,
          "trials": 96,
          "p": [0, 0, 0, 0, 0, 0, 0, 0, 0.475, 0.355, 0.39, 0.455, 0.445, 0.41, 0.405, 0.395, 0.34, 0.39, 0.4, 0.355, 0.34, 0.34, 0.33, 0.375, 0.405, 0.37, 0.32, 0.315, 0.315, 0.3, 0.33, 0.305, 0.295, 0.28, 0.28, 0.32, 0.305, 0.36, 0.34]
        },
        {
          "gap": "close",
          "values": 5,
          "trials": 24,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.04, 0.24, 0.29, 0.23, 0.21, 0.195, 0.285, 0.265, 0.25, 0.195, 0.17, 0.18, 0.185, 0.19, 0.195, 0.17, 0.18, 0.21, 0.215, 0.205, 0.185, 0.195, 0.2, 0.195, 0.21, 0.195, 0.195, 0.17, 0.185, 0.19, 0.18, 0.18]
        },
        {
          "gap": "close",
          "values": 5,
          "trials": 48,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.01, 0.34, 0.335, 0.315, 0.32, 0.245, 0.35, 0.415, 0.34, 0.245, 0.225, 0.26, 0.25, 0.245, 0.25, 0.245, 0.285, 0.32, 0.285, 0.25, 0.195, 0.205, 0.215, 0.2, 0.205, 0.19, 0.18, 0.185, 0.21, 0.225, 0.245, 0.24]
        },
        {
          "gap": "close",
          "values": 5,
          "trials": 96,
          "p": [0, 0, 0, 0, 0, 0, 0, 0, 0.425, 0.36, 0.35, 0.44, 0.43, 0.375, 0.41, 0.38, 0.33, 0.375, 0.38, 0.36, 0.35, 0.31, 0.3, 0.38, 0.405, 0.37, 0.34, 0.265, 0.265, 0.255, 0.275, 0.24, 0.245, 0.245, 0.245, 0.28, 0.265, 0.32, 0.325]
        },
        {
          "gap": "close",
          "values": 6,
          "trials": 24,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.02, 0.235, 0.285, 0.225, 0.19, 0.175, 0.265, 0.25, 0.245, 0.175, 0.145, 0.165, 0.16, 0.17, 0.16, 0.15, 0.17, 0.195, 0.2, 0.185, 0.155, 0.15, 0.16, 0.17, 0.17, 0.16, 0.16, 0.14, 0.15, 0.16, 0.155, 0.15]
        },
        {
          "gap": "close",
          "values": 6,
          "trials": 48,
          "p": [0, 0, 0, 0, 0, 0, 0, 0.005, 0.31, 0.34, 0.33, 0.305, 0.23, 0.34, 0.385, 0.315, 0.235, 0.225, 0.245, 0.245, 0.215, 0.22, 0.22, 0.27, 0.3, 0.28, 0.24, 0.195, 0.195, 0.195, 0.18, 0.16, 0.16, 0.145, 0.14, 0.16, 0.185, 0.195, 0.19]
        },
        {
          "gap": "close",
          "values": 6,
          "trials": 96,
          "p": [0, 0, 0, 0, 0, 0, 0, 0, 0.425, 0.36, 0.34, 0.445, 0.35, 0.36, 0.42, 0.365, 0.34, 0.36, 0.39, 0.335, 0.32, 0.27, 0.29, 0.33, 0.36, 0.32, 0.305, 0.265, 0.27, 0.26, 0.27, 0.245, 0.245, 0.24, 0.235, 0.26, 0.25, 0.295, 0.29]
        }
      ]
    },
    "quantities": {
      "model": {
        "curvature": 2.4,
        "trial-noise": 0.001,
        "gap-to-noise": 6.000000000000005,
        "gap": 0.006000000000000005,
        "close-gap-to-noise": 0.5000000000000004,
        "center": 0.001,
        "best-offset": 0.6000000000000001,
        "other-offset-max": 0.2999999999999998,
        "optimum-enters": 1.2000000000000002,
        "repeats": 200,
        "curves": 30
      },
      "default": {
        "values": 3,
        "trials": 48,
        "width": 3,
        "p": 0.62,
        "best-width": 1.375,
        "p-best": 0.98,
        "p-at-5": 0.515,
        "narrowest-fair-width": 1.2000000000000002,
        "best-width-1000": 1.375,
        "p-best-1000": 0.984,
        "best-edge-distance": 0.048481366131454706,
        "best-edge-share": 0.994
      },
      "fourth-value": {"best-width": 1.375, "p-best": 0.805, "p": 0.515, "p-at-default-best": 0.805, "p-at-5": 0.44},
      "close-values": {
        "best-width": 1.625,
        "p-best": 0.455,
        "p": 0.36,
        "p-at-5": 0.37,
        "chance": 0.3333333333333333
      },
      "too-narrow": {"width": 0.75, "p": 0},
      "too-wide": {"width": 5, "p": 0.515},
      "seed": {
        "chosen": 4,
        "statistic": "none: the curve uses the fixed repeat seeds 1 to 200; the displayed studies take the smallest seed whose design at the default picks the truly best value"
      }
    }
  };
  /* END GENERATED table-cal */

  var ID = 'fig-spread';
  var ROWS = CAL.domains.b.rows;   // the fixed slots of panel (b)
  var PAD = 0.16;        // the inset of a row's floor and ceiling, as a fraction of the row
  var DCAP = 3;          // the depth at a row's ceiling, in decades from the value's optimum

  function D() { return TP.desiderata; }

  var fmt = {
    width: function (w) { return TP.fmt.byName('none')(+(+w).toFixed(3)); },
    decades: function (w) { var t = fmt.width(w); return t + (t === '1' ? ' decade' : ' decades'); },
    pct: function (v) { return TP.fmt.byName('pct0')(v); },
    lr: function (v) { return TP.fmt.exp10(v); }
  };

  /* ============================== the model ============================== */

  function curveOf(S, T, g) {
    var list = CAL.tables.curves;
    g = g || CAL.defaults.gap;
    for (var i = 0; i < list.length; i++) if (list[i].gap === g && list[i].values === S && list[i].trials === T) return list[i].p;
    throw new Error('fig-spread: no curve for ' + S + ' values, ' + T + ' trials and gap ' + g + ' in CAL.tables.curves');
  }
  function indexOf(w) { return Math.round((w - CAL.tables.widths[0]) / 0.125); }
  function pAt(curve, w) { return curve[Math.max(0, Math.min(curve.length - 1, indexOf(w)))]; }
  /* the best width: the first width at the curve's maximum, as the calibration takes it */
  function best(curve) {
    var bi = 0;
    for (var i = 1; i < curve.length; i++) if (curve[i] > curve[bi]) bi = i;
    return { i: bi, w: CAL.tables.widths[bi], p: curve[bi] };
  }
  /* the width at which the truly best value's optimum enters the range */
  function enters(S) {
    var M = D(), s = M.values(S)[M.truth(S) - 1];
    return 2 * Math.abs(M.xStar(s) - M.CENTER);
  }
  /* the floor of the rows' error scale, the lowest E_min over the fixed list */
  function floor() { var M = D(); return Math.min.apply(null, M.VALUES.map(M.eMin)); }
  /* a trial's height in its row: sqrt of its error above the floor over the curvature, in decades */
  function depth(y) { return Math.sqrt(Math.max(0, y - floor()) / D().CURVATURE); }

  /** The derived state for the values. Every array of rows carries a key (DS §9). */
  function apply(values) {
    var S = values.values, T = +values.trials, W = values.width, G = values.gap, M = D();
    var curve = curveOf(S, T, G), b = best(curve), def = best(curveOf(CAL.defaults.values, CAL.defaults.trials));
    var st = M.study({ S: S, W: W, T: T, seed: values.seed, gap: G });
    var trials = [], studies = [];
    st.studies.forEach(function (sd) {
      sd.trials.forEach(function (t) {
        trials.push({ key: 'v' + sd.j + '-' + t.i, row: 'v' + sd.j, x: t.x, d: depth(t.y), y: t.y });
      });
      studies.push({
        key: 'v' + sd.j, j: String(sd.j), s: sd.s, xStar: sd.xStar, bx: sd.best.x, bd: depth(sd.best.y), by: sd.best.y,
        bi: String(sd.best.i), inRange: sd.inRange ? 'yes' : 'no'
      });
    });
    return {
      values: S, trials: T, width: W, gap: G, seed: values.seed,
      lo: st.lo, hi: st.hi, n: String(st.n),
      truth: String(st.truth), pick: String(st.pick),
      p: pAt(curve, W), bestWidth: b.w, pBest: b.p, pAt5: curve[curve.length - 1],
      pAtDefaultBest: pAt(curve, def.w), enters: enters(S),
      rows: CAL.tables.widths.map(function (w, i) { return { key: 'w' + i, w: w, p: curve[i] }; }),
      studies: studies, pts: trials
    };
  }

  /* ============================== the figure ============================== */

  var fig = null, pa = null, pb = null, cur = null, curCtx = { hold: false };

  function build(f) {
    var dA = CAL.domains.a, dB = CAL.domains.b;
    /* fixed heights: the panels stack at every width, and neither height depends on the state */
    var height = function (hPhone, hDesk) { return function (w, phone) { return (phone ? hPhone : hDesk) / Math.max(w, 1); }; };
    pa = TP.chart.panel(f.panels, {
      letter: '(a)',
      describe: 'probability of picking the truly best value against range width',
      xDomain: dA.x.slice(), yDomain: dA.y.slice(),
      xLabel: function (p) { return p.phone ? 'range width (decades)' : 'range width (decades of learning rate)'; },
      yLabel: 'probability',
      xTicks: [1, 2, 3, 4, 5], xFormat: fmt.width,
      yTicks: [0, 0.25, 0.5, 0.75, 1], yFormat: fmt.pct,
      grid: 'y',
      aspect: height(150, 168),
      margin: function (w, phone) { return phone ? { t: 8, r: 14, b: 42, l: 56 } : { t: 10, r: 18, b: 44, l: 62 }; }
    });
    pb = TP.chart.panel(f.panels, {
      letter: '(b)',
      describe: 'one simulated design: each option\'s trials along the learning-rate axis',
      xDomain: dB.x.slice(), yDomain: [0, 1],
      xLabel: function (p) { return p.phone ? 'learning rate' : 'learning rate (log scale)'; }, yLabel: '',
      xTicks: [-5, -4, -3, -2, -1], xFormat: fmt.lr,
      yTicks: 'none',
      grid: 'none',
      aspect: function (w, phone) { return (phone ? 190 : 188) / Math.max(w, 1); },
      margin: function (w, phone) { return phone ? { t: 6, r: 66, b: 42, l: 82 } : { t: 8, r: 150, b: 44, l: 92 }; }
    });
    pa.update(drawA);
    pb.update(drawB);
  }

  /* ---------- panel (a) ---------- */

  var wOf = function (r) { return r.w; }, pOf = function (r) { return r.p; };

  function drawA(p) {
    var s = cur;
    if (!s) return;
    var C = TP.chart, ctx = curCtx;
    /* the ghost: the curve before the last change of the number of values, of trials or of the gaps */
    var g = ctx.ghost;
    if (g && g.rows && (Math.abs(g.values - s.values) > 1e-9 || Math.abs(g.trials - s.trials) > 1e-9 || g.gap !== s.gap)) {
      C.line(p, g.rows, wOf, pOf, { role: 'model', series: 'ghost', dash: 'ghost', ghost: false, key: 'ghost-curve' });
    }
    C.line(p, s.rows, wOf, pOf, { role: 'model', series: 'curve', key: 'curve' });
    /* the reader's width and the curve's value there */
    var W = s.width;
    C.level(p, 'x', W, { role: 'reader', text: fmt.width(W), line: true, series: 'width', key: 'width' });
    C.markers(p, [{ key: 'reading', w: W, p: s.p }], wOf, pOf, { role: 'model', series: 'curve' });
    C.level(p, 'y', s.p, { role: 'reader', text: fmt.pct(s.p), series: 'reading', key: 'reading-p' });

    /* the region names. "too narrow" spans the widths below the width at which the truly best
       value's optimum enters the range; "too wide" runs along the curve from its best width. */
    /* In the phone layout the region is about 56 px wide and the curve rises at its right edge, so
       no position inside it keeps 1 h from the curve. The name's phone form is then the panel
       header (DS §5.6), where it names the widths the region spans. */
    C.annotation(p, {
      kind: 'region', id: 'too-narrow', captionNames: true,
      text: p.phone ? 'too narrow: below ' + fmt.decades(s.enters) : narrowText(p), phone: p.phone ? { header: true } : { text: 'too narrow' },
      anchor: { x0: CAL.tables.widths[0], x1: s.enters, y0: 0, y1: 1 }
    });
    C.annotation(p, {
      kind: 'region', id: 'too-wide', captionNames: true,
      text: 'too wide: too sparse', phone: { text: 'too wide' },
      anchor: { series: 'curve', points: s.rows.filter(function (r) { return r.w >= s.bestWidth - 1e-9; }).map(function (r) { return [r.w, r.p]; }) }
    });

    var snap = CAL.tables.widths;
    C.handle(p, {
      id: 'width', axis: 'x', value: W, snap: snap, min: snap[0], max: snap[snap.length - 1],
      label: 'Range width', format: fmt.decades, onLine: true,
      onChange: function (v) { fig.set({ width: v }, { transient: true }); },
      onSettle: function (v) { fig.set({ width: v }); }
    });
    C.place(p, [], ctx);
  }

  /* The name of the narrow region in as few lines as the region's width holds, from one line to
     six. The room ends 1.5 h before the curve first leaves zero, or before the reader's line where
     that stands inside the region, since both are rivals of the name (DS §5.2). */
  var NARROW = [
    ['too narrow: the optimum is outside'], ['too narrow:', 'the optimum is outside'], ['too narrow:', 'the optimum', 'is outside'],
    ['too narrow:', 'the', 'optimum', 'is outside'], ['too', 'narrow:', 'the', 'optimum', 'is outside'],
    ['too', 'narrow:', 'the', 'optimum', 'is', 'outside']
  ];
  function narrowText(p) {
    var W = CAL.tables.widths, end = Math.min(cur.enters, cur.width);
    for (var i = 0; i < cur.rows.length; i++) if (cur.rows[i].p > 0) { end = Math.min(end, W[i]); break; }
    var room = p.x(end) - p.x(W[0]) - 1.5 * p.h - 2;
    for (var i = 0; i < NARROW.length; i++) {
      var list = NARROW[i], w = 0;
      list.forEach(function (t) { w = Math.max(w, TP.chart.measureText(t, 'label', p).w); });
      if (w <= room) return list.length === 1 ? list[0] : list;
    }
    return NARROW[NARROW.length - 1];
  }

  /* ---------- panel (b) ----------
     2026-11 review (post01): one strip per option. Each row holds the option's trials as dots along
     the learning-rate axis, its true best learning rate as a diamond (the toy knows it, a real study
     does not), its best trial ringed, and, in the right margin, the best trial's score. The row the
     design picks is marked "picked" and the truly best option's name carries a star. The searched
     range is one reader window across the rows, with a handle at each edge. The v4 version drew each
     option's valley as a dashed curve squeezed into its row, which read as noise. */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgText(layer, cls, x, y, text, anchor) {
    var t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('class', cls); t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('dominant-baseline', 'central');
    if (anchor) t.setAttribute('text-anchor', anchor);
    t.textContent = text;
    layer.appendChild(t);
    return t;
  }
  function drawB(p) {
    var s = cur;
    if (!s) return;
    var C = TP.chart, n = s.studies.length, M = D();
    var rowY = function (j) { return 1 - (j - 0.5) / n; };      // row j (1-based) centred, top first
    for (var k = 1; k < n; k++) {
      var Y = p.y(1 - k / n);
      p.layers.bands.append('line').attr('class', 'gridline').attr('x1', 0).attr('x2', p.width).attr('y1', Y).attr('y2', Y);
    }
    C.window(p, s.lo, s.hi, { kind: 'reader', id: 'range', handles: false });
    var layer = p.layers.marks.node();
    s.studies.forEach(function (sd) {
      var j = +sd.j, yv = rowY(j), series = 'row-' + j;
      var pts = s.pts.filter(function (t) { return t.row === sd.key; });
      C.markers(p, pts, function (t) { return t.x; }, function () { return yv; }, { role: 'model', series: series, key: function (t) { return t.key; }, size: 5 });
      C.markers(p, [{ key: 'opt-' + sd.key, x: sd.xStar, y: yv }], function (t) { return t.x; }, function (t) { return t.y; },
        { role: 'fourth', series: series, shape: 'diamond', fill: 'filled' });
      C.ring(p, sd.bx, yv, { role: 'model', series: series, key: 'best-' + sd.key });
      var Yp = p.y(yv), truth = +s.truth === j, picked = +s.pick === j;
      svgText(layer, 'sp-row-name' + (truth ? ' is-truth' : ''), -10, Yp, (truth ? '\u2605 ' : '') + 'option ' + j, 'end');
      svgText(layer, 'sp-row-val' + (picked ? ' is-picked' : ''), p.width + 10, Yp,
        TP.fmt.byName('fixed3')(sd.by) + (picked && !p.phone ? '  \u2190 picked' : picked ? ' \u2190' : ''), 'start');
    });
    edgeHandles(p, s);
    var ok = s.pick === s.truth;
    p.setNote((p.phone ? 'picks option ' : 'this design picks option ') + s.pick + (ok ? ', the truly best' : '; option ' + s.truth + ' is truly best'));
    C.place(p, [], curCtx);
  }

  /* The range's edges as handles. Each snaps to the edge of a width on the grid, and sets the
     width, since the range stays centred at CAL's centre. */
  function edgeHandles(p, s) {
    var C = TP.chart, M = D(), c = M.CENTER, widths = CAL.tables.widths;
    var loSnap = widths.map(function (w) { return c - w / 2; }).reverse();
    var hiSnap = widths.map(function (w) { return c + w / 2; });
    var toW = function (v) { return 2 * Math.abs(v - c); };
    var fmtEdge = function (v) { return fmt.lr(v) + ', width ' + fmt.decades(toW(v)); };
    C.handle(p, {
      id: 'lo', axis: 'x', value: s.lo, snap: loSnap, min: loSnap[0], max: loSnap[loSnap.length - 1],
      label: 'Lower edge of the range', format: fmtEdge,
      onChange: function (v) { fig.set({ width: toW(v) }, { transient: true }); },
      onSettle: function (v) { fig.set({ width: toW(v) }); }
    });
    C.handle(p, {
      id: 'hi', axis: 'x', value: s.hi, snap: hiSnap, min: hiSnap[0], max: hiSnap[hiSnap.length - 1],
      label: 'Upper edge of the range', format: fmtEdge,
      onChange: function (v) { fig.set({ width: toW(v) }, { transient: true }); },
      onSettle: function (v) { fig.set({ width: toW(v) }); }
    });
  }

  function draw(state, ctx) {
    if (!pa) build(ctx.fig);
    cur = state;
    curCtx = ctx || { hold: false };
    pa.update();
    pb.update();
  }

  /* ---------- readout, table, quantities ---------- */

  function readout(state) {
    var close = state.gap === 'close' ? 'With the options close together, a' : 'A';
    return close + 't a width of ' + fmt.decades(state.width) + ', ' + state.values + ' options and ' + state.trials + ' trials (' + state.n +
      ' per option), the design picks the truly best option in ' + fmt.pct(state.p) + ' of ' + CAL.repeats + ' repeats. Its best is ' +
      fmt.pct(state.pBest) + ', at ' + fmt.decades(state.bestWidth) + '.';
  }

  function table(state) {
    var bestW = state.bestWidth, W = state.width;
    var studies = state.studies.map(function (sd) {
      return 'value ' + sd.j + ' at ' + fmt.lr(sd.bx) + ' (error ' + TP.fmt.byName('fixed4')(sd.by) + ')';
    }).join(', ');
    return {
      columns: [
        { key: 'w', label: 'Range width (decades)', format: fmt.width },
        { key: 'p', label: 'Share of ' + CAL.repeats + ' repeated designs that pick the truly best value', format: fmt.pct },
        { key: 'note', label: 'Marked' }
      ],
      rows: state.rows.map(function (r) {
        var notes = [];
        if (Math.abs(r.w - W) < 1e-9) notes.push('the reader\'s width');
        if (Math.abs(r.w - bestW) < 1e-9) notes.push('the best width');
        if (r.w < state.enters - 1e-9) notes.push('the truly best value\'s optimum lies outside the range');
        return { w: r.w, p: r.p, note: notes.join('; ') };
      }),
      caption: 'The curve of panel (a) for ' + state.values + ' scientific values and ' + state.trials + ' trials' +
        (state.gap === 'close' ? ', with the values closer together than the trial noise' : '') + '. The displayed design (seed ' +
        state.seed + ') runs ' + state.n + ' trials per study over ' + fmt.lr(state.lo) + ' to ' + fmt.lr(state.hi) +
        '. Each study\'s best trial: ' + studies + '. It picks value ' + state.pick + ', and the truly best value is value ' + state.truth + '.'
    };
  }

  function quantities(state) {
    var M = D(), v = M.VALUES;
    return {
      width: state.width, p: state.p, 'best-width': state.bestWidth, 'p-best': state.pBest, 'p-at-5': state.pAt5,
      'p-at-default-best': state.pAtDefaultBest, values: state.values, trials: state.trials,
      chance: 1 / state.values,
      gap: M.eMin(v[0]) - M.eMin(v[1]),
      'close-gap-to-noise': (M.eMin(v[0], 'close') - M.eMin(v[1], 'close')) / M.SIGMA,
      pick: +state.pick, truth: +state.truth,
      curvature: M.CURVATURE, 'trial-noise': M.SIGMA, repeats: M.REPEATS,
      'gap-to-noise': (M.eMin(v[0]) - M.eMin(v[1])) / M.SIGMA,
      center: Math.pow(10, M.CENTER),
      'best-offset': state.enters / 2,
      'other-offset-max': Math.max.apply(null, v.filter(function (s, k) { return k !== M.truth(2) - 1; }).map(function (s) { return Math.abs(M.xStar(s) - M.CENTER); })),
      'optimum-enters': state.enters,
      'narrowest-fair-width': Math.max.apply(null, M.values(state.values).map(function (s) { return 2 * Math.abs(M.xStar(s) - M.CENTER); })),
      chosen: CAL.seed,
      curves: CAL.tables.curves.length,
      /* at the state's peak width and the displayed seed, the truly best value's best trial below
         the upper edge as a share of the width; the share of seeds within 10% is the calibration's */
      'best-edge-distance': (function () {
        var st = M.study({ S: state.values, W: state.bestWidth, T: +state.trials, seed: CAL.seed });
        return (st.hi - st.studies[M.truth(state.values) - 1].best.x) / (st.hi - st.lo);
      })(),
      'best-edge-share': ((CAL.quantities || {})['default'] || {})['best-edge-share']
    };
  }

  function init(element) {
    fig = TP.fig(element, {
      kind: 'fixed',
      params: {
        values: {
          type: 'number', default: CAL.defaults.values, domain: [2, D().SMAX], snap: 1,
          change: 'transition', ghost: true, label: 'Options compared', control: 'segment', dock: true
        },
        trials: {
          type: 'choice', default: String(CAL.defaults.trials), domain: D().TRIALS.map(String),
          change: 'transition', ghost: true, label: 'Total trials', control: 'segment', dock: true
        },
        width: {
          type: 'number', default: CAL.defaults.width, domain: [CAL.tables.widths[0], CAL.tables.widths[CAL.tables.widths.length - 1]],
          snap: 0.125, snapOrigin: CAL.tables.widths[0],
          change: 'transition', ghost: false, label: 'Range width', control: 'handle', handle: 'a', format: fmt.decades
        },
        gap: {
          type: 'choice', default: CAL.defaults.gap, domain: Object.keys(D().GAPS),
          change: 'transition', ghost: true, label: 'Gaps between the values', control: 'none'
        }
      },
      seed: CAL.seed,
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
