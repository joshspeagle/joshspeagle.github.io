/*
 * f2-1-update-rules.js: figure F2.1, the update rules (#fig-update-rules), on page 2 #optimizer,
 * and its recap TP.recaps['F2.1:summary'] (plan §6.24, R2 on page 4 and R4 on page 9).
 *
 * Work order: notes/revamp/implementation-plan.md §6.3 (WO-F2.1), with §6.0. Entry:
 * notes/revamp/figure-plan.md F2.1, with review/synthesis.md R6 and R54. Design:
 * notes/revamp/design-system.md §3.4, §3.5, §4 to §9. A running figure on TP.fig and TP.run.
 *
 * The model is TP.optimizers (site/js/lib/optimizers.js): the six update rules as README
 * L2034-L2086 write them, on the quadratic with loss scale c (the parameter `scale`: 1, 10 or 100,
 * default 100, Batch 7), condition number 20, rotation 0 and start (-4, 3.5) in the loss's
 * coordinates, with target loss TP.optimizers.targetFor(c), 0.01 c. The loss scale moves SGD's
 * fastest rate and bound by its factor while Adam's fastest rate stays (the playbook's L680-L686).
 *   - The run of the shown rules at one learning rate is TP.optimizers.trace(rules, hps), recorded
 *     at every step to the step axis's end (CAL.quantities.model['axis-end']), cached by its
 *     parameters. Its `until` is the step at which every shown rule's run has ended (converged,
 *     diverged or no new minimum for 200 steps), which is TP.optimizers.endStep.
 *   - The summary curve of a rule is TP.optimizers.summary(rule, hp, CAL.tables.rates). At the
 *     rule's default hyperparameters the figure reads CAL.tables.summary[scale], where -1 is a
 *     divergence, -2 a slow run (still falling at the axis's end, drawn with no mark) and null no
 *     progress. Another setting is computed once, on the settle of the change, and
 *     cached; during a drag of a hyperparameter the curve keeps its settled form.
 *
 * The runtime. A step is one step of training. The runtime's state is {t, key}, where key names
 * the cached trace of the run's parameters. advance increments t, and record reads the positions
 * and losses at step t from the trace, so compute (which slices the trace for a stretch of steps)
 * and advance give the same rows (check 23). pace 'log', duration 6,000 ms, steps = until,
 * limit = the axis end, recordPanel 'c', reset 'show'. Every parameter but focus is a restart
 * parameter with showEnd. focus is 'redraw'. The loss scale is a segment control in div.fig-side,
 * above the focus rule's equation and sliders, which takes no height from the working area on a
 * desktop (the dock and more would each add a row) and keeps the phone dock to one row.
 *
 * Tokens (DS §2.3 rule 3): the shown rules take model blue, third gold and fourth indigo in the
 * order of the playbook (TP.optimizers.RULES), in all three panels. Their markers are the filled
 * circle, the open circle and the open diamond.
 *
 * The panels (WO-F2.1 letters them in reading order, so the summary panel is (b)):
 *   (a) the quadratic's contours (structure), each shown rule's path in its trail tone and its
 *       position at the cursor as its marker; a rule whose path has diverged ends in a cross where
 *       the path leaves the frame. Capped at 360 px tall.
 *   (b) steps to the target against learning rate: one curve per shown rule, crosses at the top
 *       edge where the rule diverges, open markers at the top edge where it makes no progress
 *       (named "no progress"), a ring on each rule's fastest rate (the largest rate on a tie), the
 *       handle for the learning rate with its reader line, and the focus rule's stability limit
 *       as a dash-dotted level named on the axis ("2 / sharpness" for SGD, "stability limit" for
 *       momentum and Nesterov; "limit" in the phone layout).
 *   (c) loss against step (the record panel): each rule's loss up to the cursor, a cross at the top
 *       edge at the step a rule diverged, the target loss dotted and labelled, the cursor, and the
 *       previous run dashed as the ghost. A frame of play that moves the cursor forward appends
 *       each line's new segment and the markers it passed to the last render and moves the cursor
 *       (stepC), with the labels as that render placed them; a divergence in the new steps, a new
 *       mark or the cursor meeting a placed label, or any other change renders (c) in full, as
 *       does every settled draw.
 * The rule names on (b) and (c) are selecting labels (DS §6.4) that set the focus rule. The focus
 * rule's update, as README L2034-L2086 writes it, sits in div.fig-side above its sliders, each
 * symbol wrapped in \htmlClass{hp hp-<parameter>} (DS §6.3).
 *
 * TP.recaps['F2.1:summary'](el, {rules, bound, scale}) draws panel (b) alone for the rules named,
 * at default hyperparameters and the default loss scale unless scale names another, with each rule's fastest rate ringed and, with bound=1, the bound of each
 * SGD-family rule named on the axis.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

/* BEGIN GENERATED table-cal */
// From tests/calibration/out/fig-update-rules.json by npm run generate (tests/lib/write-generated.js).
var CAL = {
  "defaults": {"rules": ["sgd", "momentum", "adam"], "focus": "sgd", "lr": 0.082, "scale": "1"},
  "presets": {"sgd-fastest": {"scale": "1", "lr": 0.091}, "loss-scale-100": {"scale": "100", "lr": 0.082}},
  "states": {"adam-tie": {"scale": "100", "lr": 0.13}, "scale-1": {"scale": "1", "lr": 0.091}},
  "seed": null,
  "domains": {
    "a": {"x": [-5, 5], "y": [-4, 4]},
    "b": {"x": [0.0001, 1], "y": [1, 10000]},
    "c": {"x": [1, 10000], "y": [1e-14, 1000000]}
  },
  "tables": {
    "rates": [0.0001, 0.00011, 0.00012, 0.00013, 0.00015, 0.00016, 0.00018, 0.0002, 0.00022, 0.00024, 0.00027, 0.0003, 0.00033, 0.00036, 0.00039, 0.00043, 0.00047, 0.00051, 0.00056, 0.00062, 0.00068, 0.00075, 0.00082, 0.00091, 0.001, 0.0011, 0.0012, 0.0013, 0.0015, 0.0016, 0.0018, 0.002, 0.0022, 0.0024, 0.0027, 0.003, 0.0033, 0.0036, 0.0039, 0.0043, 0.0047, 0.0051, 0.0056, 0.0062, 0.0068, 0.0075, 0.0082, 0.0091, 0.01, 0.011, 0.012, 0.013, 0.015, 0.016, 0.018, 0.02, 0.022, 0.024, 0.027, 0.03, 0.033, 0.036, 0.039, 0.043, 0.047, 0.051, 0.056, 0.062, 0.068, 0.075, 0.082, 0.091, 0.1, 0.11, 0.12, 0.13, 0.15, 0.16, 0.18, 0.2, 0.22, 0.24, 0.27, 0.3, 0.33, 0.36, 0.39, 0.43, 0.47, 0.51, 0.56, 0.62, 0.68, 0.75, 0.82, 0.91, 1],
    "scales": ["1", "10", "100"],
    "summary": {
      "1": {
        "sgd": [-2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, 9722, 8912, 8227, 7461, 6826, 6291, 5729, 5174, 4718, 4277, 3912, 3525, 3208, 2916, 2673, 2467, 2138, 2004, 1782, 1603, 1457, 1336, 1187, 1068, 971, 890, 822, 745, 682, 628, 572, 516, 471, 427, 390, 352, 320, 291, 266, 246, 213, 199, 177, 159, 145, 133, 118, 106, 96, 88, 81, 74, 67, 62, 56, 51, 46, 42, 38, 34, null, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        "momentum": [3188, 2896, 2653, 2447, 2118, 1984, 1761, 1583, 1437, 1316, 1167, 1048, 951, 870, 801, 725, 661, 607, 551, 496, 450, 406, 369, 330, 298, 269, 244, 223, 190, 176, 154, 135, 121, 107, 98, 92, 88, 85, 91, 88, 92, 89, 86, 89, 92, 89, 92, 88, 90, 92, 88, 91, 90, 92, 91, 91, 91, 92, 90, 93, 92, 91, 94, 92, 94, 93, 94, 91, 96, 95, 97, 97, 97, 97, 98, 102, 104, 107, 120, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        "nesterov": [3190, 2898, 2655, 2449, 2120, 1986, 1763, 1585, 1439, 1318, 1169, 1050, 953, 872, 803, 727, 663, 609, 553, 498, 452, 408, 371, 332, 300, 271, 246, 226, 192, 179, 156, 138, 123, 110, 95, 82, 73, 65, 59, 54, 48, 43, 40, 62, 61, 59, 57, 55, 52, 49, 47, 45, 42, 40, 53, 52, 50, 48, 46, 44, 42, 40, 38, 36, 35, 33, 32, 38, null, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        "rmsprop": [4010, 3649, 3348, 3093, 2686, 2520, 2244, 2024, 1843, 1692, 1508, 1361, 1240, 1140, 1055, 960, 881, 814, 744, 675, 618, 563, 518, 469, 429, 393, 362, 336, 295, 278, 249, 226, 208, 192, 188, 173, 161, 151, 142, 132, 124, 117, 109, 101, 95, 89, 94, 89, 84, 80, 77, 74, 77, 75, 72, 76, 74, 72, 75, 73, 71, 75, 73, 76, 74, null, null, 120, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
        "adam": [-2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, 9592, 8955, 8330, 7801, 7228, 6745, 6290, 5900, 5561, 4997, 4760, 4351, 4010, 3720, 3471, 3155, 2892, 2670, 2479, 2314, 2125, 1964, 1825, 1677, 1527, 1402, 1278, 1174, 1062, 969, 883, 810, 747, 647, 605, 536, 479, 433, 394, 346, 308, 276, 249, 227, 201, 179, 161, 141, 122, 106, 91, 108, 104, 97, 90, 84, 79, 93, 90, 84, 79, 91, 88, 82, 91, 88, 84, 81, 88, 85, 82, 88, 84, 89, 86, 83, 87, 83],
        "nadam": [-2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, 9592, 8955, 8329, 7801, 7227, 6745, 6289, 5899, 5560, 4996, 4759, 4349, 4008, 3718, 3469, 3153, 2890, 2668, 2477, 2312, 2123, 1962, 1823, 1674, 1525, 1399, 1275, 1171, 1060, 966, 880, 807, 744, 644, 602, 533, 476, 430, 391, 344, 305, 273, 247, 224, 199, 177, 159, 139, 120, 104, 90, 78, 99, 93, 87, 81, 75, 86, 84, 79, 74, 69, 65, 74, 70, 67, 63, 60, 56, 62, 60, 57, 54, 51, 48, 45, 42, 40]
      },
      "10": {
        "sgd": [3208, 2916, 2673, 2467, 2138, 2004, 1782, 1603, 1457, 1336, 1187, 1068, 971, 890, 822, 745, 682, 628, 572, 516, 471, 427, 390, 352, 320, 291, 266, 246, 213, 199, 177, 159, 145, 133, 118, 106, 96, 88, 81, 74, 67, 62, 56, 51, 46, 42, 38, 34, null, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        "momentum": [298, 269, 244, 223, 190, 176, 154, 135, 121, 107, 98, 92, 88, 85, 91, 88, 92, 89, 86, 89, 92, 89, 92, 88, 90, 92, 88, 91, 90, 92, 91, 91, 91, 92, 90, 93, 92, 91, 94, 92, 94, 93, 94, 91, 96, 95, 97, 97, 97, 97, 98, 102, 104, 107, 120, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        "nesterov": [300, 271, 246, 226, 192, 179, 156, 138, 123, 110, 95, 82, 73, 65, 59, 54, 48, 43, 40, 62, 61, 59, 57, 55, 52, 49, 47, 45, 42, 40, 53, 52, 50, 48, 46, 44, 42, 40, 38, 36, 35, 33, 32, 38, null, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        "rmsprop": [4010, 3649, 3348, 3093, 2686, 2520, 2244, 2024, 1843, 1692, 1508, 1361, 1240, 1140, 1055, 960, 881, 814, 744, 675, 618, 563, 518, 469, 429, 393, 362, 336, 295, 278, 249, 226, 208, 192, 188, 173, 161, 151, 142, 132, 124, 117, 109, 102, 95, 89, 94, 89, 84, 80, 77, 74, 77, 75, 72, 76, 74, 72, 75, 73, 71, 75, 73, 76, 74, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
        "adam": [-2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, 9592, 8955, 8330, 7801, 7228, 6745, 6290, 5900, 5561, 4997, 4760, 4351, 4010, 3720, 3471, 3155, 2892, 2670, 2479, 2314, 2125, 1964, 1825, 1677, 1527, 1402, 1278, 1174, 1062, 969, 883, 810, 747, 647, 605, 536, 479, 433, 394, 346, 308, 276, 249, 227, 201, 179, 161, 141, 122, 106, 91, 108, 104, 97, 90, 84, 79, 93, 90, 84, 79, 91, 88, 82, 91, 88, 84, 81, 88, 85, 82, 88, 84, 89, 86, 83, 87, 83],
        "nadam": [-2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, 9592, 8955, 8329, 7801, 7227, 6745, 6289, 5899, 5560, 4996, 4759, 4349, 4008, 3718, 3469, 3153, 2890, 2668, 2477, 2312, 2123, 1962, 1823, 1674, 1525, 1399, 1275, 1171, 1060, 966, 880, 807, 744, 644, 602, 533, 476, 430, 391, 344, 305, 273, 247, 224, 199, 177, 159, 139, 120, 104, 90, 78, 99, 93, 87, 81, 75, 86, 84, 79, 74, 69, 65, 74, 70, 67, 63, 60, 56, 62, 60, 57, 54, 51, 48, 45, 42, 40]
      },
      "100": {
        "sgd": [320, 291, 266, 246, 213, 199, 177, 159, 145, 133, 118, 106, 96, 88, 81, 74, 67, 62, 56, 51, 46, 42, 38, 34, null, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        "momentum": [90, 92, 88, 91, 90, 92, 91, 91, 91, 92, 90, 93, 92, 91, 94, 92, 94, 93, 94, 91, 96, 95, 97, 97, 97, 97, 98, 102, 104, 107, 120, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        "nesterov": [52, 49, 47, 45, 42, 40, 53, 52, 50, 48, 46, 44, 42, 40, 38, 36, 35, 33, 32, 38, null, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1],
        "rmsprop": [4010, 3649, 3348, 3093, 2686, 2520, 2244, 2024, 1843, 1692, 1508, 1361, 1240, 1140, 1055, 960, 881, 814, 744, 675, 618, 563, 518, 469, 429, 393, 362, 336, 295, 278, 249, 226, 208, 192, 188, 173, 161, 151, 142, 132, 124, 117, 109, 102, 95, 89, 94, 89, 84, 80, 77, 74, 77, 75, 72, 76, 74, 72, 75, 73, 71, 75, 73, 76, 74, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
        "adam": [-2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, 9592, 8955, 8330, 7801, 7228, 6745, 6290, 5900, 5561, 4997, 4760, 4351, 4010, 3720, 3471, 3155, 2892, 2670, 2479, 2314, 2125, 1964, 1825, 1677, 1527, 1402, 1278, 1174, 1062, 969, 883, 810, 747, 647, 605, 536, 479, 433, 394, 346, 308, 276, 249, 227, 201, 179, 161, 141, 122, 106, 91, 108, 104, 97, 90, 84, 79, 93, 90, 84, 79, 91, 88, 82, 91, 88, 84, 81, 88, 85, 82, 88, 84, 89, 86, 83, 87, 83],
        "nadam": [-2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, -2, 9592, 8955, 8329, 7801, 7227, 6745, 6289, 5899, 5560, 4996, 4759, 4349, 4008, 3718, 3469, 3153, 2890, 2668, 2477, 2312, 2123, 1962, 1823, 1674, 1525, 1399, 1275, 1171, 1060, 966, 880, 807, 744, 644, 602, 533, 476, 430, 391, 344, 305, 273, 247, 224, 199, 177, 159, 139, 120, 104, 90, 78, 99, 93, 87, 81, 75, 86, 84, 79, 74, 69, 65, 74, 70, 67, 63, 60, 56, 62, 60, 57, 54, 51, 48, 45, 42, 40]
      }
    },
    "fastest": {
      "1": {
        "sgd": {"lr": 0.091, "steps": 34, "ties": [0.091]},
        "momentum": {"lr": 0.0036, "steps": 85, "ties": [0.0036]},
        "nesterov": {"lr": 0.056, "steps": 32, "ties": [0.056]},
        "rmsprop": {"lr": 0.033, "steps": 71, "ties": [0.033]},
        "adam": {"lr": 0.2, "steps": 79, "ties": [0.13, 0.2]},
        "nadam": {"lr": 1, "steps": 40, "ties": [1]}
      },
      "10": {
        "sgd": {"lr": 0.0091, "steps": 34, "ties": [0.0091]},
        "momentum": {"lr": 0.00036, "steps": 85, "ties": [0.00036]},
        "nesterov": {"lr": 0.0056, "steps": 32, "ties": [0.0056]},
        "rmsprop": {"lr": 0.033, "steps": 71, "ties": [0.033]},
        "adam": {"lr": 0.2, "steps": 79, "ties": [0.13, 0.2]},
        "nadam": {"lr": 1, "steps": 40, "ties": [1]}
      },
      "100": {
        "sgd": {"lr": 0.00091, "steps": 34, "ties": [0.00091]},
        "momentum": {"lr": 0.00012, "steps": 88, "ties": [0.00012]},
        "nesterov": {"lr": 0.00056, "steps": 32, "ties": [0.00056]},
        "rmsprop": {"lr": 0.033, "steps": 71, "ties": [0.033]},
        "adam": {"lr": 0.2, "steps": 79, "ties": [0.13, 0.2]},
        "nadam": {"lr": 1, "steps": 40, "ties": [1]}
      }
    },
    "atDefault": {
      "sgd": {"crossing": null, "divergedAt": 1, "noProgressSince": null, "end": 1},
      "momentum": {"crossing": null, "divergedAt": 1, "noProgressSince": null, "end": 1},
      "nesterov": {"crossing": null, "divergedAt": 1, "noProgressSince": null, "end": 1},
      "rmsprop": {"crossing": null, "divergedAt": null, "noProgressSince": 108, "end": 308},
      "adam": {"crossing": 79, "divergedAt": null, "noProgressSince": null, "end": 324},
      "nadam": {"crossing": 74, "divergedAt": null, "noProgressSince": null, "end": 313}
    },
    "noProgress": {
      "1": {
        "sgd": [0.1],
        "momentum": [],
        "nesterov": [0.068],
        "rmsprop": [0.051, 0.056, 0.068, 0.075, 0.082, 0.091, 0.1, 0.11, 0.12, 0.13, 0.15, 0.16, 0.18, 0.2, 0.22, 0.24, 0.27, 0.3, 0.33, 0.36, 0.39, 0.43, 0.47, 0.51, 0.56, 0.62, 0.68, 0.75, 0.82, 0.91, 1],
        "adam": [],
        "nadam": []
      },
      "10": {
        "sgd": [0.01],
        "momentum": [],
        "nesterov": [0.0068],
        "rmsprop": [0.051, 0.056, 0.062, 0.068, 0.075, 0.082, 0.091, 0.1, 0.11, 0.12, 0.13, 0.15, 0.16, 0.18, 0.2, 0.22, 0.24, 0.27, 0.3, 0.33, 0.36, 0.39, 0.43, 0.47, 0.51, 0.56, 0.62, 0.68, 0.75, 0.82, 0.91, 1],
        "adam": [],
        "nadam": []
      },
      "100": {
        "sgd": [0.001],
        "momentum": [],
        "nesterov": [0.00068],
        "rmsprop": [0.051, 0.056, 0.062, 0.068, 0.075, 0.082, 0.091, 0.1, 0.11, 0.12, 0.13, 0.15, 0.16, 0.18, 0.2, 0.22, 0.24, 0.27, 0.3, 0.33, 0.36, 0.39, 0.43, 0.47, 0.51, 0.56, 0.62, 0.68, 0.75, 0.82, 0.91, 1],
        "adam": [],
        "nadam": []
      }
    },
    "slow": {
      "1": {
        "sgd": [0.0001, 0.00011, 0.00012, 0.00013, 0.00015, 0.00016, 0.00018, 0.0002, 0.00022, 0.00024, 0.00027, 0.0003],
        "momentum": [],
        "nesterov": [],
        "rmsprop": [],
        "adam": [0.0001, 0.00011, 0.00012, 0.00013, 0.00015, 0.00016, 0.00018, 0.0002, 0.00022, 0.00024, 0.00027, 0.0003, 0.00033, 0.00036, 0.00039, 0.00043, 0.00047, 0.00051, 0.00056],
        "nadam": [0.0001, 0.00011, 0.00012, 0.00013, 0.00015, 0.00016, 0.00018, 0.0002, 0.00022, 0.00024, 0.00027, 0.0003, 0.00033, 0.00036, 0.00039, 0.00043, 0.00047, 0.00051, 0.00056]
      },
      "10": {
        "sgd": [],
        "momentum": [],
        "nesterov": [],
        "rmsprop": [],
        "adam": [0.0001, 0.00011, 0.00012, 0.00013, 0.00015, 0.00016, 0.00018, 0.0002, 0.00022, 0.00024, 0.00027, 0.0003, 0.00033, 0.00036, 0.00039, 0.00043, 0.00047, 0.00051, 0.00056],
        "nadam": [0.0001, 0.00011, 0.00012, 0.00013, 0.00015, 0.00016, 0.00018, 0.0002, 0.00022, 0.00024, 0.00027, 0.0003, 0.00033, 0.00036, 0.00039, 0.00043, 0.00047, 0.00051, 0.00056]
      },
      "100": {
        "sgd": [],
        "momentum": [],
        "nesterov": [],
        "rmsprop": [],
        "adam": [0.0001, 0.00011, 0.00012, 0.00013, 0.00015, 0.00016, 0.00018, 0.0002, 0.00022, 0.00024, 0.00027, 0.0003, 0.00033, 0.00036, 0.00039, 0.00043, 0.00047, 0.00051, 0.00056],
        "nadam": [0.0001, 0.00011, 0.00012, 0.00013, 0.00015, 0.00016, 0.00018, 0.0002, 0.00022, 0.00024, 0.00027, 0.0003, 0.00033, 0.00036, 0.00039, 0.00043, 0.00047, 0.00051, 0.00056]
      }
    }
  },
  "quantities": {
    "model": {
      "default-scale": 100,
      "sharpness-c1": 20,
      "sgd-bound-c1": 0.1,
      "momentum-bound-c1": 0.19,
      "nesterov-bound-c1": 0.06785714285714287,
      "target-c1": 0.01,
      "sharpness-c10": 200,
      "sgd-bound-c10": 0.01,
      "momentum-bound-c10": 0.019,
      "nesterov-bound-c10": 0.006785714285714286,
      "target-c10": 0.1,
      "sharpness": 2000,
      "sgd-bound": 0.001,
      "momentum-bound": 0.0019,
      "nesterov-bound": 0.0006785714285714286,
      "target": 1,
      "axis-end": 10000,
      "rates": 97,
      "divergence-threshold": 1000,
      "converged-fraction": 0.000001,
      "end-steps": 200,
      "max-crossing": 9592,
      "sgd-fastest-lr-c1": 0.091,
      "sgd-fastest-steps-c1": 34,
      "momentum-fastest-lr-c1": 0.0036,
      "momentum-fastest-steps-c1": 85,
      "nesterov-fastest-lr-c1": 0.056,
      "nesterov-fastest-steps-c1": 32,
      "rmsprop-fastest-lr-c1": 0.033,
      "rmsprop-fastest-steps-c1": 71,
      "adam-fastest-lr-c1": 0.2,
      "adam-fastest-steps-c1": 79,
      "nadam-fastest-lr-c1": 1,
      "nadam-fastest-steps-c1": 40,
      "adam-over-sgd-fastest-c1": 2.197802197802198,
      "sgd-fastest-lr-c10": 0.0091,
      "sgd-fastest-steps-c10": 34,
      "momentum-fastest-lr-c10": 0.00036,
      "momentum-fastest-steps-c10": 85,
      "nesterov-fastest-lr-c10": 0.0056,
      "nesterov-fastest-steps-c10": 32,
      "rmsprop-fastest-lr-c10": 0.033,
      "rmsprop-fastest-steps-c10": 71,
      "adam-fastest-lr-c10": 0.2,
      "adam-fastest-steps-c10": 79,
      "nadam-fastest-lr-c10": 1,
      "nadam-fastest-steps-c10": 40,
      "adam-over-sgd-fastest-c10": 21.978021978021978,
      "sgd-fastest-lr": 0.00091,
      "sgd-fastest-steps": 34,
      "momentum-fastest-lr": 0.00012,
      "momentum-fastest-steps": 88,
      "nesterov-fastest-lr": 0.00056,
      "nesterov-fastest-steps": 32,
      "rmsprop-fastest-lr": 0.033,
      "rmsprop-fastest-steps": 71,
      "adam-fastest-lr": 0.2,
      "adam-fastest-steps": 79,
      "nadam-fastest-lr": 1,
      "nadam-fastest-steps": 40,
      "adam-over-sgd-fastest": 219.7802197802198
    },
    "default": {
      "lr": 0.2,
      "scale": 100,
      "adam-steps": 79,
      "adam-first-crossing": 55,
      "sgd-diverged-at": 1,
      "end-step": 324
    },
    "sgd-fastest": {"lr": 0.00091, "sgd-steps": 34, "adam-steps": 7228, "end-step": 8211},
    "scale-1": {"scale": 1, "lr": 0.091, "sgd-steps": 34, "adam-steps": 104, "end-step": 342},
    "adam-tie": {"lr": 0.13, "adam-steps": 79, "sgd-diverged-at": 1}
  }
};
/* END GENERATED table-cal */

  var O = TP.optimizers;
  if (!O) return;
  var RATES = CAL.tables.rates;
  /** The loss scale of the values v, as a number (the default scale when v names none). */
  function scaleOf(v) { return +((v && v.scale) || CAL.defaults.scale); }
  function targetOf(v) { return O.targetFor(scaleOf(v)); }
  var AXIS_END = CAL.quantities.model['axis-end'];
  var ROLES = ['model', 'third', 'fourth'];
  var NAME = {};
  O.RULES.forEach(function (r) { NAME[r] = O.info[r].name; });
  var BOUNDED = { sgd: true, momentum: true, nesterov: true };

  /* the figure's parameter for each hyperparameter a rule introduces (WO-F2.1) */
  var HP = {
    sgd: {},
    momentum: { gamma: 'mg' },
    nesterov: { gamma: 'ng' },
    rmsprop: { gamma: 'rg', rho: 'rr', eps: 're' },
    adam: { beta1: 'ab1', beta2: 'ab2', eps: 'ae' },
    nadam: { beta1: 'nb1', beta2: 'nb2', eps: 'ne' }
  };
  var SYMBOL = { gamma: 'γ', rho: 'ρ', beta1: 'β₁', beta2: 'β₂', eps: 'ε' };

  /* a pure format kept per value: the axes and the controls format the same values on every step */
  function memo(f) { var m = {}, n = 0; return function (v) { var k = String(v); if (m[k] !== undefined) return m[k]; if (++n > 2000) { m = {}; n = 1; } return (m[k] = f(v)); }; }
  var fmt = {
    lr: memo(function (v) { return TP.fmt.byName('sig2')(v); }),
    int: function (v) { return TP.fmt.int(v); },
    eps: function (v) { return TP.fmt.byName('exp10')(v); },
    loss: function (v) {
      if (v === 0) return '0';
      return Math.abs(v) >= 0.001 && Math.abs(v) < 1e5 ? TP.fmt.byName('sig2')(v) : TP.fmt.byName('exp10')(v);
    },
    pos: function (v) { return TP.fmt.byName('sig3')(v); }
  };
  function hpText(k, v) { return SYMBOL[k] + ' ' + (k === 'eps' ? fmt.eps(v) : String(v)); }

  /* ---------- the model, without the DOM ---------- */

  /** The hyperparameters of rule under the values v, the learning rate included. */
  function hpOf(rule, v) {
    var h = { lr: v.lr }, m = HP[rule];
    for (var k in m) h[k] = v[m[k]] != null ? v[m[k]] : O.defaults[rule][k];
    return h;
  }
  function hpDefault(rule, v) {
    var m = HP[rule];
    for (var k in m) if (v[m[k]] != null && v[m[k]] !== O.defaults[rule][k]) return false;
    return true;
  }
  function hpKey(rule, v) {
    var m = HP[rule], out = ['c=' + scaleOf(v)];
    for (var k in m) out.push(k + '=' + (v[m[k]] != null ? v[m[k]] : O.defaults[rule][k]));
    return rule + '(' + out.join(',') + ')';
  }
  function shownRules(v) {
    var list = v && v.rules ? v.rules : CAL.defaults.rules;
    return O.RULES.filter(function (r) { return list.indexOf(r) >= 0; });
  }
  function runKey(v) {
    return 'lr=' + v.lr + ';' + shownRules(v).map(function (r) { return hpKey(r, v); }).join(';');   // hpKey holds the scale
  }

  /* the traces, by key; SPECS keeps every key's parameters, so an evicted trace is recomputed */
  var SPECS = {}, TRACES = [];
  function traceOf(v) { var k = runKey(v); SPECS[k] = SPECS[k] || { lr: v.lr, rules: shownRules(v), values: copyVals(v) }; return traceBy(k); }
  /* The runtime asks for the run's steps and end on every step with the same parameters object
     (the record's base), so the run's key is kept per object and not built again from its values.
     The runtime writes a redraw parameter (focus) into that object in place, and the key depends on
     the restart parameters alone. */
  var KEYS = typeof WeakMap === 'function' ? new WeakMap() : null;
  function traceFor(p) {
    var k = KEYS && p && typeof p === 'object' ? KEYS.get(p) : null;
    if (k == null) { k = traceOf(p).key; if (KEYS && p && typeof p === 'object') KEYS.set(p, k); }
    return traceBy(k);
  }
  function copyVals(v) { var o = {}; for (var k in v) o[k] = Array.isArray(v[k]) ? v[k].slice() : v[k]; return o; }
  function traceBy(key) {
    for (var i = 0; i < TRACES.length; i++) if (TRACES[i].key === key) return TRACES[i];
    var s = SPECS[key];
    if (!s) return null;
    var hps = {};
    s.rules.forEach(function (r) { hps[r] = hpOf(r, s.values); });
    var c = scaleOf(s.values), target = O.targetFor(c);
    var tr = O.trace(s.rules, hps, { limit: AXIS_END, c: c });
    tr.runs.forEach(function (run) {
      run.first = null;
      var n = run.loss.length;
      for (var t = 0; t < n; t++) if (run.loss[t] < target) { run.first = t; break; }
    });
    var entry = { key: key, rules: s.rules, lr: s.lr, c: c, target: target, until: tr.until, runs: tr.runs, byRule: {} };
    tr.runs.forEach(function (run) { entry.byRule[run.rule] = run; });
    TRACES.push(entry);
    if (TRACES.length > 8) TRACES.shift();
    return entry;
  }
  /** The record row of step t of the run named key: each rule's x, y and loss, null after it diverged. */
  function rowOf(key, t) {
    var tr = traceBy(key), row = { t: t };
    if (!tr) return row;
    tr.runs.forEach(function (run) {
      var ok = t <= run.steps;
      row['x_' + run.rule] = ok ? run.x[t] : null;
      row['y_' + run.rule] = ok ? run.y[t] : null;
      row['l_' + run.rule] = ok ? run.loss[t] : null;
    });
    return row;
  }

  /* the summary curves, by rule, scale and hyperparameters: [{lr, crossing, diverged, slow}] */
  var SUMMARIES = [];
  function fromTable(rule, c) {
    var col = CAL.tables.summary[String(c)][rule];
    return RATES.map(function (lr, i) {
      var s = col[i];
      return { lr: lr, crossing: s != null && s >= 0 ? s : null, diverged: s === -1, slow: s === -2 };
    });
  }
  /** The summary curve of rule at the values v, or null when it is not computed and compute is false. */
  function summaryOf(rule, v, compute) {
    var key = hpKey(rule, v);
    for (var i = 0; i < SUMMARIES.length; i++) if (SUMMARIES[i].key === key) return SUMMARIES[i].rows;
    if (!hpDefault(rule, v) && compute === false) return null;
    var c = scaleOf(v);
    var rows = hpDefault(rule, v) ? fromTable(rule, c) : O.summary(rule, hpOf(rule, v), RATES, { c: c });
    SUMMARIES.push({ key: key, rows: rows });
    if (SUMMARIES.length > 16) SUMMARIES.shift();
    return rows;
  }
  /** The fewest steps on a summary curve, the largest rate on a tie, and every rate of the tie. */
  function fastestOf(rows) {
    var best = null, ties = [];
    rows.forEach(function (r) {
      if (r.crossing == null) return;
      if (best == null || r.crossing < best.crossing) { best = r; ties = [r.lr]; }
      else if (r.crossing === best.crossing) { best = r; ties.push(r.lr); }
    });
    return best ? { lr: best.lr, steps: best.crossing, ties: ties } : null;
  }
  function boundOf(rule, v) {
    if (!BOUNDED[rule]) return null;
    var P = O.problem({ c: scaleOf(v) });
    var g = rule === 'sgd' ? undefined : hpOf(rule, v).gamma;
    return O.divergenceBound(rule, P.c, P.kappa, g);
  }

  /** Each rule's status at step t of its run: {kind, step, loss}, kind one of diverged, crossing,
      stalled, open (ended at the limit above the target) or running. */
  function statusAt(run, t) {
    if (run.divergedAt != null && t >= run.divergedAt) return { kind: 'diverged', step: run.divergedAt };
    if (t >= run.end) {
      if (run.crossing != null) return { kind: 'crossing', step: run.crossing };
      if (run.noProgressSince != null) return { kind: 'stalled', step: run.noProgressSince };
      return { kind: 'open', step: run.end };
    }
    return { kind: 'running', loss: run.loss[Math.min(t, run.steps)] };
  }
  function ordered(rules, focus) {
    return rules.filter(function (r) { return r === focus; }).concat(rules.filter(function (r) { return r !== focus; }));
  }
  /** The readout (FP F2.1, WO-F2.1): each shown rule's result at the current rate, focus rule first. */
  function readoutText(v, tr, t) {
    var rules = ordered(tr.rules, v.focus), running = false;
    var parts = rules.map(function (r) {
      var s = statusAt(tr.byRule[r], t), n = NAME[r];
      if (s.kind === 'diverged') return n + ' diverges at step ' + fmt.int(s.step);
      if (s.kind === 'stalled') return n + ' has made no progress since step ' + fmt.int(s.step);
      if (s.kind === 'open') return n + ' has not reached the target by step ' + fmt.int(s.step);
      if (s.kind === 'running') { running = true; return n + '\'s loss is ' + fmt.loss(s.loss); }
      var text = n + ' last crosses the target at step ' + fmt.int(s.step);
      var sum = summaryOf(r, v, false), f = sum ? fastestOf(sum) : null;
      if (f && f.steps === s.step && f.ties.length > 1 && f.ties.indexOf(v.lr) >= 0) {
        var others = f.ties.filter(function (x) { return x !== v.lr; }).slice(0, 2).map(fmt.lr);
        text += ', its fewest steps, also taken at ' + others.join(' and ');
      }
      return text;
    });
    var head = 'At loss scale ' + scaleOf(v) + (running ? ', learning rate ' + fmt.lr(v.lr) + ' and step ' + fmt.int(t) : ' and learning rate ' + fmt.lr(v.lr)) + ', ';
    var commas = parts.some(function (x) { return x.indexOf(',') >= 0; });
    var body = parts.length < 3 ? parts.join(commas ? ', and ' : ' and ') : parts.slice(0, -1).join(', ') + (commas ? ', and ' : ' and ') + parts[parts.length - 1];
    var out = head + body + '.';
    if (out.split(/\s+/).length > 30) out = head + parts.map(function (p) { return p.replace(/, its fewest steps.*$/, ''); }).join(', ').replace(/, ([^,]*)$/, ' and $1') + '.';
    return out;
  }

  /** The named quantities (plan WO-I5.1): the run's at the current rate, and the model's. */
  function quantitiesOf(v, tr, t) {
    var q = { lr: v.lr, scale: scaleOf(v), 'end-step': tr.until, step: t, focus: v.focus, rules: tr.rules.join('+') };
    tr.rules.forEach(function (r) {
      var run = tr.byRule[r];
      q[r + '-steps'] = run.crossing;
      /* a run that stalls may still diverge later on its path (Nesterov at its bound): the result
         is the natural end's, and the path's divergence is its own quantity */
      q[r + '-diverged-at'] = run.divergedAt != null && run.divergedAt <= run.end ? run.divergedAt : null;
      q[r + '-path-diverged-at'] = run.divergedAt;
      q[r + '-no-progress-since'] = run.noProgressSince;
      q[r + '-first-crossing'] = run.first;
      q[r + '-end'] = run.end;
      q[r + '-loss'] = run.loss[Math.min(t, run.steps)];
    });
    q['axis-end'] = AXIS_END;
    /* the model's constants, from the model itself (ledger rows fig-update-rules:model:*): at the
       default loss scale without a suffix, and at the other scales with the suffix -c1 or -c10,
       whatever the state's scale */
    q.rates = RATES.length;
    q['divergence-threshold'] = O.DIVERGE;
    q['converged-fraction'] = O.CONVERGED;
    q['end-steps'] = O.NO_PROGRESS;
    var S0 = (CAL.quantities && CAL.quantities.model && CAL.quantities.model['default-scale']) || +CAL.defaults.scale;
    O.SCALES.forEach(function (c) {
      var x = c === S0 ? '' : '-c' + c, dv = { scale: String(c) }, P = O.problem({ c: c }), fa = {};
      q['sharpness' + x] = P.c * Math.max(P.kappa, 1);
      q['target' + x] = O.targetFor(c);
      O.RULES.forEach(function (r) {
        if (BOUNDED[r]) q[r + '-bound' + x] = O.divergenceBound(r, P.c, P.kappa, r === 'sgd' ? undefined : O.defaults[r].gamma);
        var f = fastestOf(summaryOf(r, dv));
        fa[r] = f;
        q[r + '-fastest-lr' + x] = f ? f.lr : null;
        q[r + '-fastest-steps' + x] = f ? f.steps : null;
      });
      q['adam-over-sgd-fastest' + x] = fa.adam && fa.sgd ? fa.adam.lr / fa.sgd.lr : null;
    });
    q.scale = scaleOf(v);
    q['default-scale'] = S0;
    /* the latest last crossing over the six rules at default hyperparameters and scale (model:max-crossing) */
    var maxCross = 0;
    O.RULES.forEach(function (r) {
      summaryOf(r, { scale: String(S0) }).forEach(function (x) { if (x.crossing != null) maxCross = Math.max(maxCross, x.crossing); });
    });
    q['max-crossing'] = maxCross;
    return q;
  }

  TP.models = TP.models || {};
  TP.models.updateRules = {
    traceOf: traceOf, rowOf: rowOf, summaryOf: summaryOf, fastestOf: fastestOf, boundOf: boundOf,
    statusAt: statusAt, readout: readoutText, quantities: quantitiesOf, hpOf: hpOf, runKey: runKey
  };

  /* ---------- drawing ---------- */

  var doc = global.document;
  if (!doc) return;
  function C() { return TP.chart; }
  var clampLoss = function (v) { var d = CAL.domains.c.y; return v == null || !isFinite(v) ? d[1] : v < d[0] ? d[0] : v > d[1] ? d[1] : v; };

  /* ---- (a) the quadratic's contours ---- */
  var START = [-4, 3.5];
  var contourCache = null;
  /** The contours at 1, 1/4, 1/16, ... of the starting loss, as closed ellipses (v1's form). */
  function contours() {
    if (contourCache) return contourCache;
    var P = O.problem({}), kappa = P.kappa, S = kappa * START[0] * START[0] + START[1] * START[1], rings = [];
    for (var k = 0; k < 16; k++) {
      var f = Math.pow(4, -k), au = Math.sqrt(f * S / kappa), av = Math.sqrt(f * S);
      if (av < 0.03) break;
      var pts = [];
      for (var i = 0; i <= 120; i++) {
        var s = 2 * Math.PI * i / 120;
        pts.push(O.fromEigen(P, [au * Math.cos(s), av * Math.sin(s)]));
      }
      rings.push(pts);
    }
    contourCache = rings;
    return rings;
  }
  function panelAOpts(o) {
    return Object.assign({
      letter: '(a)', describe: 'the quadratic\'s contours',
      xDomain: CAL.domains.a.x, yDomain: CAL.domains.a.y, xLabel: 'θ₁', yLabel: 'θ₂',
      xTicks: [-4, -2, 0, 2, 4], yTicks: [-4, -2, 0, 2, 4], grid: 'none',
      margin: function (w, phone) { return phone ? { t: 6, r: 8, b: 42, l: 34 } : { t: 8, r: 10, b: 44, l: 40 }; },
      plotAspect: (CAL.domains.a.y[1] - CAL.domains.a.y[0]) / (CAL.domains.a.x[1] - CAL.domains.a.x[0]),
      maxHeight: function (w, phone) { return phone ? 230 : 236; }
    }, o || {});
  }
  /* where the segment a -> b leaves the frame (a inside) */
  function exitPoint(a, b) {
    var X = CAL.domains.a.x, Y = CAL.domains.a.y, t = 1;
    if (b[0] > X[1]) t = Math.min(t, (X[1] - a[0]) / (b[0] - a[0]));
    if (b[0] < X[0]) t = Math.min(t, (X[0] - a[0]) / (b[0] - a[0]));
    if (b[1] > Y[1]) t = Math.min(t, (Y[1] - a[1]) / (b[1] - a[1]));
    if (b[1] < Y[0]) t = Math.min(t, (Y[0] - a[1]) / (b[1] - a[1]));
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  }
  function inFrameA(x, y) { var X = CAL.domains.a.x, Y = CAL.domains.a.y; return x >= X[0] && x <= X[1] && y >= Y[0] && y <= Y[1]; }
  /* The contours are structure that no state changes, so they are drawn once per frame size into
     the grid layer, which C.panel does not clear between renders (its gridlines are joined by
     class, and (a) draws none). A playing frame then builds no contour. */
  function drawContours(p) {
    var key = [p.width, p.height].join('x'), grid = p.layers.grid;
    if (p._contourKey === key && !grid.select('g.contours path').empty()) return;
    p._contourKey = key;
    grid.selectAll('g.contours').remove();
    /* the group takes the clip path of the layers C.panel clips, so the ellipses end at the frame */
    var g = grid.append('g').attr('class', 'contours').attr('clip-path', p.layers.bands.attr('clip-path'));
    contours().forEach(function (ring) {
      var d = '';
      ring.forEach(function (q, i) { d += (i ? 'L' : 'M') + p.x(q[0]).toFixed(1) + ',' + p.y(q[1]).toFixed(1); });
      g.append('path').attr('class', 'structure contour').attr('d', d + 'Z');
    });
  }
  /* The path of a run clipped to the frame widened by a quarter of its size on each side, as runs of
     points, each run inside that box with the points where it enters and leaves it. A diverging
     path reaches coordinates of 10^3, and a trail drawn to them would make the placer's index of
     obstacles span tens of thousands of pixels; the clip path hides everything outside the frame. */
  var BOX = (function () {
    var X = CAL.domains.a.x, Y = CAL.domains.a.y, dx = (X[1] - X[0]) / 4, dy = (Y[1] - Y[0]) / 4;
    return [X[0] - dx, X[1] + dx, Y[0] - dy, Y[1] + dy];
  })();
  function inBox(x, y) { return x >= BOX[0] && x <= BOX[1] && y >= BOX[2] && y <= BOX[3]; }
  /* the parameters t0 <= t1 of the part of the segment a + t (b - a), t in [0, 1], inside BOX, or null */
  function clipSeg(ax, ay, bx, by) {
    var t0 = 0, t1 = 1, dx = bx - ax, dy = by - ay;
    var P = [-dx, dx, -dy, dy], Q = [ax - BOX[0], BOX[1] - ax, ay - BOX[2], BOX[3] - ay];
    for (var i = 0; i < 4; i++) {
      if (P[i] === 0) { if (Q[i] < 0) return null; continue; }
      var r = Q[i] / P[i];
      if (P[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    return [t0, t1];
  }
  function clippedRuns(rx, ry, last) {
    if (last === 0) return inBox(rx[0], ry[0]) ? [[[rx[0], ry[0]]]] : [];
    var st = { runs: [], ks: [], cur: null, curK: null, k: 0 };
    clipTo(st, rx, ry, last);
    return st.runs;
  }
  /* Extend the clipped runs in st through step `last`. Each point carries in st.ks the step k whose
     segment added it. The steps are visited in order, so the runs up to a step are the prefixes of
     the runs of a longer stretch whose points have k up to that step (clippedPrefix). */
  function clipTo(st, rx, ry, last) {
    var runs = st.runs, ks = st.ks, cur = st.cur, curK = st.curK;
    for (var k = st.k + 1; k <= last; k++) {
      var ax = rx[k - 1], ay = ry[k - 1], bx = rx[k], by = ry[k];
      if (!(isFinite(ax) && isFinite(ay) && isFinite(bx) && isFinite(by))) { cur = null; continue; }
      if (inBox(ax, ay) && inBox(bx, by)) {
        if (!cur) { cur = [[ax, ay]]; runs.push(cur); curK = [k]; ks.push(curK); }
        cur.push([bx, by]);
        curK.push(k);
        continue;
      }
      var c = clipSeg(ax, ay, bx, by);
      if (!c) { cur = null; continue; }
      var p0 = [ax + c[0] * (bx - ax), ay + c[0] * (by - ay)], p1 = [ax + c[1] * (bx - ax), ay + c[1] * (by - ay)];
      if (!cur || c[0] > 0) { cur = [p0]; runs.push(cur); curK = [k]; ks.push(curK); }
      cur.push(p1);
      curK.push(k);
      if (c[1] < 1) cur = null;
    }
    if (last > st.k) st.k = last;
    st.cur = cur; st.curK = curK;
  }
  /** clippedRuns(run.x, run.y, last), from the clipped runs the run keeps, which are extended
      only through the steps not yet clipped: a step of play clips only its new segments. The
      arrays returned are not changed. */
  function clippedPrefix(run, last) {
    if (last === 0) return clippedRuns(run.x, run.y, 0);
    if (!run._clip) run._clip = { runs: [], ks: [], cur: null, curK: null, k: 0 };
    if (last > run._clip.k) clipTo(run._clip, run.x, run.y, last);
    var R = run._clip.runs, K = run._clip.ks, out = [];
    for (var i = 0; i < R.length; i++) {
      var kk = K[i];
      if (kk[0] > last) break;
      var n = kk.length;
      while (n > 0 && kk[n - 1] > last) n--;
      out.push(n === kk.length ? R[i] : R[i].slice(0, n));
    }
    return out;
  }
  /** The number of parts of at least two points that clippedPrefix(run, last) returns, counted
      without building them (aState runs on every frame of play). */
  function countParts(run, last) {
    if (last === 0) return 0;
    if (!run._clip) run._clip = { runs: [], ks: [], cur: null, curK: null, k: 0 };
    if (last > run._clip.k) clipTo(run._clip, run.x, run.y, last);
    var K = run._clip.ks, n = 0;
    for (var i = 0; i < K.length; i++) {
      var kk = K[i];
      if (kk[0] > last) break;
      var m = kk.length;
      while (m > 0 && kk[m - 1] > last) m--;
      if (m >= 2) n++;
    }
    return n;
  }
  /** A rule's mark at step t in (a): its marker at its position, or, where the path has left the
      frame, a cross where it left when the run has diverged by now and otherwise the marker at the
      frame's edge where it left (DS §9 rule 3). {kind: 'marker' | 'cross', pt: [x, y]} */
  function headOf(run, t) {
    var rx = run.x, ry = run.y, last = Math.min(t, run.steps), head = [rx[last], ry[last]];
    if (inFrameA(head[0], head[1])) return { kind: 'marker', pt: head };
    var k0 = 0;
    for (var j = 0; j <= last; j++) if (!inFrameA(rx[j], ry[j])) { k0 = j; break; }
    var ex = exitPoint(k0 > 0 ? [rx[k0 - 1], ry[k0 - 1]] : [rx[0], ry[0]], [rx[k0], ry[k0]]);
    return { kind: run.divergedAt != null && t >= run.divergedAt ? 'cross' : 'marker', pt: ex };
  }
  /** What (a) shows of step t, to compare two steps in play (sameA): per rule, the last step its
      path reaches, whether its mark has left the frame, its mark's kind and position in plot px,
      and the number of parts its path draws. */
  function aState(p, tr, t) {
    return {
      key: tr.key, w: p.width, h: p.height, phone: p.phone,
      rules: tr.rules.map(function (r) {
        var run = tr.byRule[r], hd = headOf(run, t), last = Math.min(t, run.steps);
        var parts = countParts(run, last);
        return { last: last, gone: !inFrameA(run.x[last], run.y[last]), kind: hd.kind, X: p.x(hd.pt[0]), Y: p.y(hd.pt[1]), parts: parts };
      })
    };
  }
  /* Whether (a) drawn at state u (the last render) shows state w alike, to within 0.5 px, in a frame
     of play. Per rule: its path reaches the same step, or its mark is in the frame at both steps
     and every point its path adds after u's step lies within 0.5 px of u's mark. The new segments
     then lie under the mark drawn at u (a marker's radius is at least 4 px), and the mark stands
     within 0.5 px of its place. A mark that has left the frame while its run goes on is drawn
     again on every step. */
  function sameA(p, tr, u, w) {
    if (!u || !w || u.key !== w.key || u.w !== w.w || u.h !== w.h || u.phone !== w.phone || u.rules.length !== w.rules.length) return false;
    for (var i = 0; i < u.rules.length; i++) {
      var a = u.rules[i], b = w.rules[i];
      if (a.last === b.last) continue;
      if (a.gone || b.gone || a.kind !== b.kind || a.parts !== b.parts || b.last < a.last) return false;
      var run = tr.byRule[tr.rules[i]];
      for (var k = a.last + 1; k <= b.last; k++) {
        var dX = p.x(run.x[k]) - a.X, dY = p.y(run.y[k]) - a.Y;
        if (!(dX * dX + dY * dY < 0.25)) return false;
      }
    }
    return true;
  }
  function drawA(p, tr, t, ctx) {
    drawContours(p);
    var items = [];
    tr.rules.forEach(function (r, i) {
      var run = tr.byRule[r], role = ROLES[i], series = 'rule-' + r, last = Math.min(t, run.steps);
      var parts = clippedPrefix(run, last).filter(function (q) { return q.length >= 2; });
      /* every part takes the rule's series, and the longest is drawn last, so that it is the line
         C.trail keeps for the series, which the label follows */
      parts.sort(function (u, w) { return u.length - w.length; });
      parts.forEach(function (pts) { C().trail(p, pts, { role: role, series: series, head: false, key: 'path-' + r }); });
      var hd = headOf(run, t), pt = hd.pt, feat = { type: 'point', x: pt[0], y: pt[1], r: 6 };
      if (hd.kind === 'cross') C().cross(p, [pt], X0, X1, { role: role, series: series, key: 'head-' + r });
      else C().markers(p, [pt], X0, X1, { role: role, series: series, key: 'head-' + r });
      /* Settled, the name sits on the path, which keeps it clear of the other rule's marker where
         both end at the minimum. While the run plays it follows the marker, because testing a
         held position against a path that grows every frame costs several milliseconds. */
      var onPath = parts.length > 0 && !(ctx && ctx.playing);
      var it = { id: 'a-' + r, text: NAME[r], role: role, series: series, feature: onPath ? { type: 'line', of: series } : feat, captionNames: true };
      if (!p.phone) it.phone = { header: true };
      items.push(it);
    });
    C().place(p, items, ctx || {});
  }
  function X0(q) { return q[0]; }
  function X1(q) { return q[1]; }

  /* ---- (b) the summary panel ---- */
  function panelBOpts(o) {
    return Object.assign({
      letter: '(b)', describe: 'steps to the target against learning rate',
      xLog: 10, yLog: 10, xDomain: CAL.domains.b.x, yDomain: [0.6, CAL.domains.b.y[1]],
      xLabel: 'learning rate', yLabel: 'steps to target',
      xTicks: [0.0001, 0.001, 0.01, 0.1, 1], yTicks: [1, 10, 100, 1000, 10000],
      xFormat: function (v) { return phoneNow() ? pow10(v) : fmt.lr(v); }, yFormat: pow10,
      margin: function (w, phone) { return phone ? { t: 8, r: 8, b: 42, l: 46 } : { t: 10, r: 12, b: 44, l: 56 }; },
      aspect: function (w, phone) { return phone ? 0.66 : 0.8; },
      maxHeight: function (w, phone) { return phone ? 240 : 236; }
    }, o || {});
  }
  /** Rows kept at least px apart along x, the first kept (DS §4.2 thinning, for the crosses and the
      open markers along the top edge, whose rates are closer together than their marks). */
  function thinned(p, rows, px) {
    var out = [], last = -Infinity;
    rows.forEach(function (r) {
      var X = p.x(r.lr);
      if (X - last >= px) { out.push(r); last = X; }
    });
    return out;
  }
  /* The summary panel for the rules with their values v. o: {focus, lr, handle (onChange,
     onSettle), ghost ([{rule, rows}]), bound ('focus' | 'all' | false), select (fn), ctx} */
  function drawB(p, rules, v, o) {
    o = o || {};
    var top = CAL.domains.b.y[1], items = [], fastest = [], placed = {};
    var TOP = function () { return top; };
    /* the ghost of a summary curve whose hyperparameters changed */
    (o.ghost || []).forEach(function (g) {
      var i = rules.indexOf(g.rule);
      if (i < 0) return;
      segments(g.rows).forEach(function (seg) {
        C().line(p, seg, LR, CROSSING, { role: ROLES[i], series: 'summary-' + g.rule, dash: 'ghost' });
      });
    });
    rules.forEach(function (r, i) {
      var rows = o.summaries[r], role = ROLES[i], series = 'summary-' + r;
      if (!rows) return;
      var segs = segments(rows), longest = null;
      segs.forEach(function (seg) {
        C().line(p, seg, LR, CROSSING, { role: role, series: series, key: 'sum-' + r });
        if (!longest || seg.length > longest.length) longest = seg;
      });
      var f = fastestOf(rows);
      var ok = rows.filter(function (x) { return x.crossing != null; });
      C().markers(p, ok, LR, CROSSING, { role: role, series: series, thin: 24, keep: function (d) { return f && d.lr === f.lr; } });
      var div = rows.filter(function (x) { return x.diverged; });
      /* a slow run (still falling at the axis's end) has its steps above the axis and no mark */
      var np = rows.filter(function (x) { return !x.diverged && !x.slow && x.crossing == null; });
      if (div.length) C().cross(p, thinned(p, div, 10), LR, function () { return NaN; }, { role: role, series: series, edge: 'top' });
      if (np.length) {
        var npk = thinned(p, np, 12);
        C().markers(p, npk, LR, TOP, { role: role, series: 'np-' + r, fill: 'open' });
        if (!placed.np) {
          placed.np = true;
          var q = npk[0];
          /* in the phone layout the name is dropped where no position admits it, since the header
             of (b), 170 px wide, then wraps to three lines with the rules' names (Batch 7); the
             caption names the open markers */
          items.push({ id: 'no-progress', text: 'no progress', tone: 'ink', role: role, series: 'np-' + r,
            feature: { type: 'point', x: q.lr, y: top, r: 5.5 }, captionNames: true, phone: p.phone ? null : { header: true } });
        }
      }
      if (f) fastest.push({ rule: r, role: role, series: series, lr: f.lr, steps: f.steps, X: p.x(f.lr), Y: p.y(f.steps) });
      var extra = [];
      if (o.focus && r !== o.focus && !hpDefault(r, v)) {
        var m = HP[r], h = hpOf(r, v);
        for (var k in m) if (h[k] !== O.defaults[r][k]) extra.push(hpText(k, h[k]));
      }
      if (longest && longest.length >= 2) {
        var it = { id: 'b-' + r, text: NAME[r] + (extra.length ? ' (' + extra.join(', ') + ')' : ''), role: role, series: series,
          feature: { type: 'line', points: longest.map(function (x) { return [x.lr, x.crossing]; }) }, captionNames: true, keySentence: true };
        if (o.select) it.select = { pressed: o.focus === r, onPress: o.select(r) };
        /* a name with no admissible position goes to the panel header, in the phone layout too,
           so that (b) names every shown rule and "no progress" (reader finding 15) */
        it.phone = { header: true };
        items.push(it);
      }
    });
    /* the ring on each rule's fastest rate, except where two rules' fastest rates lie within 10 px
       (DS §4.4) */
    fastest.forEach(function (a) {
      var near = fastest.some(function (b) { return b !== a && Math.hypot(a.X - b.X, a.Y - b.Y) < 10; });
      if (!near) C().ring(p, a.lr, a.steps, { role: a.role, series: a.series, key: 'fastest-' + a.rule });
    });
    /* the divergence bound as a level of the toy, named on the axis (DS §4.7, §5.5) */
    var named = [];
    if (o.bound) {
      rules.forEach(function (r, i) {
        if (o.bound === 'focus' && r !== o.focus) return;
        var b = boundOf(r, v);
        if (b == null) return;
        var text = p.phone ? 'limit' : r === 'sgd' ? '2 / sharpness' : 'stability limit';
        var lv = C().level(p, 'x', b, { role: ROLES[i], text: text, line: true, series: 'bound-' + r });
        named.push({ rule: r, value: b, text: text, node: lv && lv.name });
      });
    }
    if (o.lr != null) {
      var lvr = C().level(p, 'x', o.lr, { role: 'reader', text: fmt.lr(o.lr), line: true, series: 'lr' });
      if (named.length && lvr && lvr.name) apart(p, named[0], { value: o.lr, text: fmt.lr(o.lr), node: lvr.name });
      if (o.handle) {
        C().handle(p, {
          id: 'lr', axis: 'x', value: o.lr, snap: RATES, scale: 'log', label: 'Learning rate',
          format: fmt.lr, onChange: o.handle.onChange, onSettle: o.handle.onSettle
        });
      }
    }
    C().place(p, items, o.ctx || {});
    return { fastest: fastest, named: named };
  }
  /* Two names on (b)'s x axis, the bound's and the learning rate's, are centred on their values by
     C.level. Where they would overlap, the left one ends at its value and the right one starts at
     its value, and where even that leaves under 4 px between the values, the learning rate's name
     is left out; the slider's output and the handle's own name on focus still give it. */
  function apart(p, a, b) {
    if (!a.node || !b.node) return;
    var Xa = p.x(a.value), Xb = p.x(b.value);
    var wa = C().measureText([a.text], 'tick', p).w, wb = C().measureText([b.text], 'tick', p).w;
    if (Math.abs(Xa - Xb) >= (wa + wb) / 2 + 4) return;
    var L = Xa <= Xb ? a : b, R = L === a ? b : a, XL = Math.min(Xa, Xb), XR = Math.max(Xa, Xb);
    /* the panel's record of its axis names, which hides the tick labels a name covers, follows
       the moved text (p._names, the entries C.level adds) */
    var rec = function (node) { return (p._names && p._names.x || []).filter(function (n) { return n.node === node; })[0]; };
    if (XR - XL < 5) {
      var gone = rec(b.node);
      if (gone) p._names.x.splice(p._names.x.indexOf(gone), 1);
      b.node.parentNode.removeChild(b.node);
      return;
    }
    var tl = L.node.querySelector('text'), tr = R.node.querySelector('text');
    var wl = L === a ? wa : wb, wr = R === a ? wa : wb, nl = rec(L.node), nr = rec(R.node);
    tl.setAttribute('text-anchor', 'end'); tl.setAttribute('x', (XL - 2).toFixed(1));
    tr.setAttribute('text-anchor', 'start'); tr.setAttribute('x', (XR + 2).toFixed(1));
    if (nl) nl.pos = XL - 2 - wl / 2;
    if (nr) nr.pos = XR + 2 + wr / 2;
  }
  function LR(d) { return d.lr; }
  var PHONE_MQ = global.matchMedia ? global.matchMedia('(max-width: 639px)') : null;
  function phoneNow() { return !!(PHONE_MQ && PHONE_MQ.matches); }
  /** A power of ten as a tick label: 1, 10, then 10², 10³ and on (and 10⁻⁴ below 1). */
  var pow10 = memo(function (v) { return v === 1 ? '1' : v === 10 ? '10' : TP.fmt.byName('exp10')(v); });
  function CROSSING(d) { return d.crossing; }
  function segments(rows) {
    var out = [], cur = null;
    rows.forEach(function (r) {
      if (r.crossing != null) { if (!cur) { cur = []; out.push(cur); } cur.push(r); }
      else cur = null;
    });
    return out;
  }

  /* ---- (c) loss against step, the record panel ---- */
  function panelCOpts() {
    return {
      letter: '(c)', describe: 'loss against step',
      xLog: 10, yLog: 10, xDomain: CAL.domains.c.x, yDomain: CAL.domains.c.y,
      xLabel: 'step', yLabel: 'loss',
      xTicks: function (d, px) { return px < 300 ? [1, 100, 10000] : [1, 10, 100, 1000, 10000]; },
      yTicks: [1e-14, 1e-10, 1e-6, 1e-2, 100, 1e6],
      xFormat: function (v) { return phoneNow() ? pow10(v) : TP.fmt.int(v); },
      yFormat: pow10,
      margin: function (w, phone) { return phone ? { t: 8, r: 20, b: 42, l: 56 } : { t: 10, r: 24, b: 44, l: 56 }; },
      aspect: function (w, phone) { return phone ? 0.66 : 0.8; },
      maxHeight: function (w, phone) { return phone ? 240 : 236; }
    };
  }
  /* the steps at which (c) draws markers: log-spaced about 24 px apart (DS §4.2) */
  var markSteps = { w: 0, list: [] };
  function markStepsFor(p) {
    if (markSteps.w === p.width) return markSteps.list;
    var dec = Math.log10(CAL.domains.c.x[1] / CAL.domains.c.x[0]), step = dec * 24 / Math.max(60, p.width), out = [];
    for (var e = 0; e <= dec + 1e-9; e += step) {
      var t = Math.round(Math.pow(10, e));
      if (!out.length || t > out[out.length - 1]) out.push(t);
    }
    markSteps = { w: p.width, list: out };
    return out;
  }
  /* whether the ghost's record of a rule equals the current run's, as after a change of a hidden
     rule's hyperparameter, which restarts an identical run: such a ghost lies under the series and
     is not drawn */
  var sameCache = { rows: null, key: null, same: {} };
  function sameAsGhost(ghostRows, tr, r) {
    if (sameCache.rows !== ghostRows || sameCache.key !== tr.key) sameCache = { rows: ghostRows, key: tr.key, same: {} };
    if (sameCache.same[r] != null) return sameCache.same[r];
    var run = tr.byRule[r], same = true;
    for (var i = 0; i < ghostRows.length && same; i++) {
      var g = ghostRows[i], k = g.t, v = g['l_' + r];
      var c = k <= run.steps ? run.loss[k] : null;
      if (!(v === c || (v == null && c == null))) same = false;
    }
    sameCache.same[r] = same;
    return same;
  }
  function drawC(p, tr, t, ghostRows, o) {
    var d = CAL.domains.c;
    if (ghostRows && ghostRows.length) {
      tr.rules.forEach(function (r, i) {
        if (!(('l_' + r) in ghostRows[0]) || sameAsGhost(ghostRows, tr, r)) return;
        C().line(p, ghostRows, function (row) { return row.t; }, function (row) { var v = row['l_' + r]; return v == null ? NaN : clampLoss(v); },
          { role: ROLES[i], series: 'ghost-' + r, dash: 'ghost', decimate: true });
      });
    }
    C().ref(p, { y: tr.target }, { kind: 'truth', series: 'target' });
    var items = [{ id: 'target', text: 'target loss', role: 'ref', tone: 'ink', series: 'target',
      feature: { type: 'line', points: [[d.x[0], tr.target], [d.x[1], tr.target]] }, phone: { text: 'target' }, captionNames: true }];
    var marks = markStepsFor(p);
    tr.rules.forEach(function (r, i) {
      var run = tr.byRule[r], role = ROLES[i], series = 'loss-' + r, last = Math.min(t, run.steps);
      if (last >= 1) {
        var seg = run.loss.subarray(1, last + 1);
        C().line(p, seg, function (v, k) { return k + 1; }, clampLoss, { role: role, series: series, key: 'loss-' + r, decimate: true });
        var mk = marks.filter(function (s) { return s <= last; });
        C().markers(p, mk, function (s) { return s; }, function (s) { return clampLoss(run.loss[s]); }, { role: role, series: series });
        var gone = run.divergedAt != null && t >= run.divergedAt;
        if (gone) C().cross(p, [run.divergedAt], function (s) { return s; }, function () { return NaN; }, { role: role, series: series, edge: 'top' });
        /* a diverged rule's curve runs along the top edge, so its name stands at its cross; on a
           desktop a name with no admissible position goes to the panel header (DS §5.6) */
        var feat = gone ? { type: 'point', x: run.divergedAt, y: d.y[1], r: 5 } : { type: 'line', of: series };
        var it = { id: 'c-' + r, text: NAME[r], role: role, series: series, feature: feat, captionNames: true, keySentence: true };
        if (!p.phone) it.phone = { header: true };
        if (o.select) it.select = { pressed: o.focus === r, onPress: o.select(r) };
        items.push(it);
      }
    });
    var cursor = t >= 1 ? C().level(p, 'x', t, { role: 'reader', text: TP.fmt.int(t), line: true, series: 'cursor' }) : null;
    C().place(p, items, o.ctx || {});
    return cursor;
  }

  /*
   * (c) in a frame of play, drawn onto the last render (plan WO-F2.1, the Batch 5 ruling on the
   * frame cost). A full render of (c) on every step rebuilds both loss lines, the markers, the
   * label placement and its index. In a frame of play that only moves the cursor forward, stepC
   * appends each rule's new segment of the loss line and the markers of the steps it passed, and
   * moves the cursor and its name on the step axis. The labels stand as the last render placed
   * them. stepC returns false, and the figure renders (c) in full, when the run, the ghost, the
   * focus or the panel's size has changed, when the cursor moves back, when a rule diverges in the
   * new steps (its name moves to its cross), or when a new point, a new marker or the cursor
   * would meet a placed label's box. Every settled draw renders (c) in full.
   */
  function cMark(p, tr, t, ghostRows, focus, cursor) {
    var last = {}, boxes = [];
    tr.rules.forEach(function (r) { last[r] = Math.min(t, tr.byRule[r].steps); });
    C().labelReport(p).forEach(function (e) {
      if (e.form === 'dropped' || e.form === 'header' || !e.box) return;
      boxes.push(e.box);
      /* a leader, {x1, y1, x2, y2}, is guarded by its bounding box */
      var l = e.leader;
      if (l) boxes.push({ x0: Math.min(l.x1, l.x2), x1: Math.max(l.x1, l.x2), y0: Math.min(l.y1, l.y2), y1: Math.max(l.y1, l.y2) });
    });
    return { key: tr.key, t: t, ghostRows: ghostRows, focus: focus, width: p.width, height: p.height, phone: p.phone,
      last: last, boxes: boxes, cursor: cursor };
  }
  var HIT = 3;   // px kept between a new mark and a placed label's box
  function hitsBox(boxes, X, Y) {
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (X >= b.x0 - HIT && X <= b.x1 + HIT && (Y == null || (Y >= b.y0 - HIT && Y <= b.y1 + HIT))) return true;
    }
    return false;
  }
  function stepC(p, d, tr, t, ghostRows, focus) {
    if (!d || !d.cursor || !d.cursor.record || !d.cursor.line || d.key !== tr.key || d.ghostRows !== ghostRows || d.focus !== focus ||
      d.width !== p.width || d.height !== p.height || d.phone !== p.phone || !(t > d.t)) return false;
    var tick = p._tickHide && p._tickHide.x;
    if (!tick) return false;
    var X = p.x(t);
    if (!(X >= 0 && X <= p.width) || hitsBox(d.boxes, X, null)) return false;
    var adds = [], marks = markStepsFor(p);
    for (var i = 0; i < tr.rules.length; i++) {
      var r = tr.rules[i], run = tr.byRule[r], last = Math.min(t, run.steps), prev = d.last[r];
      if (run.divergedAt != null && t >= run.divergedAt && d.t < run.divergedAt) return false;
      if (last <= prev) continue;
      var from = Math.max(1, prev), mk = [];
      for (var k = from; k <= last; k++) {
        if (d.boxes.length && hitsBox(d.boxes, p.x(k), p.y(clampLoss(run.loss[k])))) return false;
      }
      for (var j = 0; j < marks.length && marks[j] <= last; j++) if (marks[j] > prev) mk.push(marks[j]);
      adds.push({ r: r, i: i, run: run, from: from, last: last, mk: mk });
    }
    adds.forEach(function (a) {
      var series = 'loss-' + a.r, keep = p._lines[series], role = ROLES[a.i], from = a.from, run = a.run;
      /* a segment is no key and no line record of its own: the last render's line stays the
         series' record until the next render */
      if (a.last > from) C().line(p, run.loss.subarray(from, a.last + 1), function (v, k) { return k + from; }, clampLoss, { role: role, series: series, decimate: true });
      p._lines[series] = keep;
      if (a.mk.length) C().markers(p, a.mk, function (s) { return s; }, function (s) { return clampLoss(run.loss[s]); }, { role: role, series: series });
      d.last[a.r] = a.last;
    });
    moveCursor(p, d.cursor, t, X, tick);
    d.t = t;
    return true;
  }
  /* the cursor's line and its name on the step axis at step t, and the tick labels the name
     hides, as C.level and chart.js's tick hiding place them */
  function moveCursor(p, cur, t, X, tick) {
    var Xs = Math.round(X * 100) / 100;
    cur.line.attr('d', 'M' + Xs + ',-2L' + Xs + ',' + (Math.round((p.height + 2) * 100) / 100));
    var rec = cur.record, text = TP.fmt.int(t), w = C().measureText([text], 'tick', p).w;
    var half = w / 2, lo = -p.margin.l + half + 1, hi = p.width + p.margin.r - half - 1;
    var pos = hi > lo ? Math.max(lo, Math.min(hi, X)) : X;
    var g = rec.node, stem = g.querySelector('line.stem'), label = g.querySelector('text');
    if (stem) { stem.setAttribute('x1', X); stem.setAttribute('x2', X); }
    if (label) { label.setAttribute('x', pos); if (label.textContent !== text) C().svgText(label, [text]); }
    rec.pos = pos; rec.w = w; rec.value = t;
    var hide = C().hiddenTicks(tick.ticks, p._names.x, p.h, 'x');
    tick.nodes.forEach(function (n, i) {
      var want = hide[i] ? 'hidden' : '';
      if (n.style.visibility !== want) n.style.visibility = want;
    });
    tick.namesSig = null;
  }

  /* ---- the focus rule's update, README L2034-L2086 ---- */
  function H(name, tex) { return '\\htmlClass{hp hp-' + name + '}{' + tex + '}'; }
  var GRAD = '\\nabla \\mathcal{l}(\\theta_t)';
  function ruleTex(rule) {
    /* the learning rate is eta for every rule (the Playbook writes alpha for Adam and NAdam) */
    var ETA = H('lr', '\\eta_t'), ALPHA = ETA, m = HP[rule];
    var G = m.gamma ? H(m.gamma, '\\gamma') : '', RHO = m.rho ? H(m.rho, '\\rho') : '', EPS = m.eps ? H(m.eps, '\\epsilon') : '';
    var B1 = m.beta1 ? H(m.beta1, '\\beta_1') : '', B2 = m.beta2 ? H(m.beta2, '\\beta_2') : '';
    var lines;
    switch (rule) {
      case 'sgd': lines = ['\\theta_{t+1} &= \\theta_{t} - ' + ETA + ' ' + GRAD]; break;
      /* momentum's velocity is u on this site (the Playbook writes v), so that v stays Adam's second moment */
      case 'momentum': lines = ['u_0 &= 0', 'u_{t+1} &= ' + G + ' u_{t} + ' + GRAD, '\\theta_{t+1} &= \\theta_{t} - ' + ETA + ' u_{t+1}']; break;
      case 'nesterov': lines = ['u_0 &= 0', 'u_{t+1} &= ' + G + ' u_{t} + ' + GRAD,
        '\\theta_{t+1} &= \\theta_{t} - ' + ETA + '( ' + G + ' u_{t+1} + ' + GRAD + ')']; break;
      case 'rmsprop': lines = ['v_0 &= 1 \\text{,}\\ m_0 = 0', 'v_{t+1} &= ' + RHO + ' v_{t} + (1 - ' + RHO + ') ' + GRAD + '^2',
        'm_{t+1} &= ' + G + ' m_{t} + \\frac{' + ETA + '}{\\sqrt{v_{t+1} + ' + EPS + '}}' + GRAD, '\\theta_{t+1} &= \\theta_{t} - m_{t+1}']; break;
      default: {
        var head = ['m_0 &= 0 \\text{,}\\ v_0 = 0',
          'm_{t+1} &= ' + B1 + ' m_{t} + (1 - ' + B1 + ') ' + GRAD,
          'v_{t+1} &= ' + B2 + ' v_{t} + (1 - ' + B2 + ') ' + GRAD + '^2',
          'b_{t+1} &= \\frac{\\sqrt{1 - ' + B2 + '^{t+1}}}{1 - ' + B1 + '^{t+1}}'];
        lines = head.concat([rule === 'adam'
          ? '\\theta_{t+1} &= \\theta_{t} - ' + ALPHA + ' \\frac{m_{t+1}}{\\sqrt{v_{t+1}} + ' + EPS + '} b_{t+1}'
          : '\\theta_{t+1} &= \\theta_{t} - ' + ALPHA + ' \\frac{' + B1 + ' m_{t+1} + (1 - ' + B1 + ') ' + GRAD + '}{\\sqrt{v_{t+1}} + ' + EPS + '} b_{t+1}']);
      }
    }
    return '\\begin{aligned}' + lines.join(' \\\\ ') + '\\end{aligned}';
  }
  function renderRule(box, rule) {
    if (box._rule === rule) return;
    box._rule = rule;
    box.textContent = '';
    var head = doc.createElement('p');
    head.className = 'fig-eq-head';
    head.textContent = NAME[rule] + ' update rule';
    var eq = doc.createElement('div');
    eq.className = 'fig-eq-tex';
    var tex = ruleTex(rule);
    if (global.katex) {
      try {
        global.katex.render(tex, eq, { displayMode: true, throwOnError: false, strict: 'ignore',
          trust: function (c) { return c.command === '\\htmlClass'; } });
      } catch (e) { eq.textContent = tex; }
    } else eq.textContent = tex;
    box.appendChild(head);
    box.appendChild(eq);
  }

  /* ---------- the figure ---------- */

  var TICKS = {};
  function params() {
    var P = {
      lr: {
        type: 'number', default: CAL.defaults.lr, snap: RATES.slice(), scale: 'log', domain: [RATES[0], RATES[RATES.length - 1]],
        change: 'restart', showEnd: true, ghost: true, control: 'slider', handle: 'b', dock: true, label: 'Learning rate',
        format: fmt.lr,
        ticks: function (v) {
          /* the list is kept per focus rule and momentum, as the controls ask for it on every step */
          var g = BOUNDED[v.focus] && v.focus !== 'sgd' ? hpOf(v.focus, v).gamma : '', k = v.focus + '|' + g + '|' + scaleOf(v);
          if (TICKS[k]) return TICKS[k];
          var b = boundOf(v.focus, v);
          return (TICKS[k] = b == null ? [] : [{ value: b, text: 'diverges above' }]);
        }
      },
      scale: {
        type: 'choice', default: CAL.defaults.scale, domain: CAL.tables.scales.slice(),
        change: 'restart', showEnd: true, ghost: true, control: 'segment', place: 'side', label: 'Loss scale s'
      },
      rules: {
        type: 'set', default: CAL.defaults.rules.slice(), domain: O.RULES.slice(), max: 3, min: 1,
        change: 'restart', showEnd: true, ghost: false, control: 'toggles', label: 'Rules shown',
        labels: NAME
      },
      focus: {
        type: 'choice', default: CAL.defaults.focus, domain: function (v) { return shownRules(v); },
        change: 'redraw', ghost: false, control: 'none', label: 'Focus rule'
      }
    };
    function hp(rule, key, name, entry) {
      var e = Object.assign({
        type: 'number', default: O.defaults[rule][key], change: 'restart', showEnd: true, ghost: true,
        control: 'slider', place: 'side', when: function (v) { return v.focus === rule; }
      }, entry);
      P[name] = e;
    }
    var gamma = { domain: [0, 0.99], snap: 0.01, format: function (v) { return String(v); } };
    hp('momentum', 'gamma', 'mg', Object.assign({ label: 'momentum γ' }, gamma));
    hp('nesterov', 'gamma', 'ng', Object.assign({ label: 'momentum γ' }, gamma));
    hp('rmsprop', 'gamma', 'rg', Object.assign({ label: 'momentum γ' }, gamma));
    hp('rmsprop', 'rho', 'rr', { label: 'decay ρ', snap: [0.5, 0.9, 0.95, 0.99, 0.995, 0.999], format: function (v) { return String(v); } });
    var b1 = { domain: [0, 0.99], snap: 0.01, format: function (v) { return String(v); } };
    var b2 = { snap: [0.9, 0.95, 0.99, 0.995, 0.999, 0.9999], format: function (v) { return String(v); } };
    var eps = { snap: [1e-10, 1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 1e-1, 1], scale: 'log', format: fmt.eps };
    hp('adam', 'beta1', 'ab1', Object.assign({ label: 'beta1 β₁' }, b1));
    hp('nadam', 'beta1', 'nb1', Object.assign({ label: 'beta1 β₁' }, b1));
    hp('adam', 'beta2', 'ab2', Object.assign({ label: 'beta2 β₂' }, b2));
    hp('nadam', 'beta2', 'nb2', Object.assign({ label: 'beta2 β₂' }, b2));
    hp('rmsprop', 'eps', 're', Object.assign({ label: 'epsilon ε' }, eps));
    hp('adam', 'eps', 'ae', Object.assign({ label: 'epsilon ε' }, eps));
    hp('nadam', 'eps', 'ne', Object.assign({ label: 'epsilon ε' }, eps));
    return P;
  }

  function init(element) {
    var pa = null, pb = null, pc = null, eqBox = null, hoverSet = false;
    var settledSig = null, ghostSummary = null, lastGhost = null, settledSummaries = {};
    var lastMemo = null, lastMemoState = null, lastMemoRows = null, lastMemoGhost = null, memoLive = false;
    var lastBSig = null, lastBGhost = null;
    var aNow = { tr: null, t: 0, ctx: null }, aDrawn = null, stepList = [];
    function drawAHeld(p) {
      if (!aNow.tr) return;
      drawA(p, aNow.tr, aNow.t, aNow.ctx);
      aDrawn = aState(p, aNow.tr, aNow.t);
    }
    /* (c), like (a), is drawn from a holder, so a render chart.js starts itself draws the current
       step; cDrawn describes the last render for stepC */
    var cNow = { tr: null, t: 0, ghostRows: null, o: null }, cDrawn = null;
    function drawCHeld(p) {
      if (!cNow.tr) return;
      var cursor = drawC(p, cNow.tr, cNow.t, cNow.ghostRows, cNow.o);
      cDrawn = cMark(p, cNow.tr, cNow.t, cNow.ghostRows, cNow.o.focus, cursor);
    }
    var fig;

    function select(r) { return function () { fig.set({ focus: r }); }; }
    function sigOf(v) { var s = {}; shownRules(v).forEach(function (r) { s[r] = hpKey(r, v); }); return s; }

    fig = TP.fig(element, {
      kind: 'running',
      params: params(),
      states: CAL.states,
      constrain: function (next) {
        var shown = shownRules(next);
        if (shown.indexOf(next.focus) < 0) next.focus = shown[0];
        return next;
      },
      draw: function (state, ctx) {
        if (!pa) {
          pa = C().panel(ctx.fig.panels, panelAOpts());
          pb = C().panel(ctx.fig.panels, panelBOpts());
          pc = C().panel(ctx.fig.panels, panelCOpts());
          if (ctx.fig.side) {
            eqBox = doc.createElement('div');
            eqBox.className = 'fig-eq';
            ctx.fig.side.insertBefore(eqBox, ctx.fig.side.firstChild);
          }
        }
        var v = ctx.values || {};
        /* A restart computed within its input event reaches the figure twice in that event: the
           runtime draws when the new run replaces the old one (a settled draw, or a transient one
           during a drag) and again when its computation ends, with the same state, step and
           record. Each draw renders the three panels, so the second doubled the cost of the
           event. A draw whose inputs equal the last draw's in the same task is skipped: it would
           render the same marks and place the labels where they stand. The memo lapses at the
           next microtask checkpoint, so a redraw in a later task (after a resize, after printing)
           always renders. */
        var memo = state ? [state.key, state.t, ctx.t, ctx.frontier, ctx.steps, ctx.limit, !!ctx.pending, !!ctx.playing, !!ctx.transient,
          !!ctx.hold, pa.width, pb.width, pc.width, pa.phone, JSON.stringify(v)].join('|') : null;
        if (memo && memoLive && memo === lastMemo && state === lastMemoState && ctx.rows === lastMemoRows && ctx.ghostRows === lastMemoGhost) return;
        lastMemo = memo; lastMemoState = state; lastMemoRows = ctx.rows; lastMemoGhost = ctx.ghostRows;
        if (!memoLive) { memoLive = true; Promise.resolve().then(function () { memoLive = false; }); }
        if (eqBox && v.focus) renderRule(eqBox, v.focus);
        if (!state) { aDrawn = null; cDrawn = null; cNow.tr = null; pa.update(function () {}); pb.update(function () {}); pc.update(function () {}); return; }
        var tr = traceBy(state.key) || traceOf(v), t = state.t;
        var rules = tr.rules, hold = ctx.hold || ctx.playing || ctx.transient;
        var settled = !ctx.transient && !ctx.playing;
        /* the summary curves: computed on a settled draw, kept as settled during a drag */
        var sums = {};
        rules.forEach(function (r) { sums[r] = summaryOf(r, v, settled) || settledSummaries[r] || summaryOf(r, {}, true); });
        if (settled) {
          var sig = sigOf(v), gr = ctx.run ? ctx.run.ghost() : null;
          if (!gr) ghostSummary = null;
          else if (gr !== lastGhost) {
            ghostSummary = [];
            if (settledSig) rules.forEach(function (r) {
              if (settledSig[r] && settledSig[r] !== sig[r] && settledSummaries[r]) ghostSummary.push({ rule: r, rows: settledSummaries[r] });
            });
          }
          lastGhost = gr;
          settledSig = sig;
          settledSummaries = sums;
        }
        var pctx = { hold: hold, playing: !!ctx.playing };
        /* (a) is drawn from a holder, so a render chart.js starts itself (a width change) draws the
           current step. A frame of play leaves (a) as it is while it would draw it alike (sameA);
           every other draw renders it. */
        aNow.tr = tr; aNow.t = t; aNow.ctx = pctx;
        var aNext = ctx.playing && !ctx.transient && aDrawn ? aState(pa, tr, t) : null;
        if (!(aNext && sameA(pa, tr, aDrawn, aNext))) pa.update(drawAHeld);
        /* (b) draws nothing that changes with the step, so a playing frame leaves it as it is */
        var bSig = [tr.key, v.focus, v.lr, ghostSummary, pb.width, pb.phone].map(String).join('|') + (ghostSummary ? ghostSummary.length : '');
        if (!(ctx.playing && bSig === lastBSig && ghostSummary === lastBGhost)) pb.update(function (p) {
          drawB(p, rules, v, {
            summaries: sums, focus: v.focus, lr: v.lr, ghost: ghostSummary, bound: 'focus', select: select, ctx: pctx,
            handle: {
              onChange: function (x) { fig.set({ lr: x }, { transient: true, from: 'lr' }); },
              onSettle: function (x) { fig.set({ lr: x }); }
            }
          });
        });
        lastBSig = bSig; lastBGhost = ghostSummary;
        cNow.tr = tr; cNow.t = t; cNow.ghostRows = ctx.ghostRows; cNow.o = { select: select, focus: v.focus, ctx: pctx };
        if (!(ctx.playing && !ctx.transient && stepC(pc, cDrawn, tr, t, ctx.ghostRows, v.focus))) pc.update(drawCHeld);
        var run = ctx.run;
        if (run && !hoverSet) {
          hoverSet = true;
          var h = run.recordHandlers();
          C().hover(pc, {
            /* the list is kept while the frontier stands, as the reading asks for its length on
               every render */
            xValues: function () {
              var n = run.frontier();
              if (stepList.length !== n) { stepList = []; for (var k = 1; k <= n; k++) stepList.push(k); }
              return stepList;
            },
            by: 'step', format: function (x) { return 'Step ' + TP.fmt.int(x); }, tick: function (x) { return TP.fmt.int(x); },
            series: [0, 1, 2].map(function (i) {
              return {
                role: ROLES[i], fmt: fmt.loss,
                label: function () { var r = shownRules(run.params())[i]; return r ? NAME[r] + ' loss' : ''; },
                show: function () { return !!shownRules(run.params())[i]; },
                y: function (x) { var r = shownRules(run.params())[i], row = run.rows()[x]; return r && row ? row['l_' + r] : null; }
              };
            }),
            press: h.press, onRead: h.onRead
          });
          C().hover(pb, {
            xValues: RATES, by: 'learning rate', format: function (x) { return 'Learning rate ' + fmt.lr(x); }, tick: fmt.lr,
            series: [0, 1, 2].map(function (i) {
              return {
                role: ROLES[i], fmt: function (s) { return TP.fmt.int(s) + ' steps'; },
                label: function () { var r = shownRules(run.params())[i]; return r ? NAME[r] : ''; },
                show: function () { return !!shownRules(run.params())[i]; },
                y: function (x) {
                  var r = shownRules(run.params())[i], rows = r ? settledSummaries[r] : null, k = RATES.indexOf(x);
                  return rows && k >= 0 ? rows[k].crossing : null;
                }
              };
            }),
            extra: function (x) {
              var out = [], k = RATES.indexOf(x);
              shownRules(run.params()).forEach(function (r) {
                var rows = settledSummaries[r];
                if (!rows || k < 0) return;
                if (rows[k].diverged) out.push(NAME[r] + ' diverges');
                else if (rows[k].slow) out.push(NAME[r] + ' needs more than ' + TP.fmt.int(AXIS_END) + ' steps');
                else if (rows[k].crossing == null) out.push(NAME[r] + ' makes no progress');
              });
              return out;
            }
          });
          var hEl = pb.el.querySelector('.handle[data-handle="lr"]');
          if (hEl) fig.linkSymbol('lr', hEl);
        }
      },
      readout: function (state, ctx) {
        var v = ctx.values, tr = traceBy(state.key) || traceOf(v);
        return readoutText(v, tr, state.t);
      },
      table: function (state, ctx) {
        var v = ctx.values, tr = traceBy(state.key) || traceOf(v), t = state.t, rules = tr.rules;
        var cols = [{ key: 'lr', label: 'Learning rate', format: fmt.lr }];
        rules.forEach(function (r) { cols.push({ key: r, label: NAME[r] + ', steps to the target' }); });
        var sums = {};
        rules.forEach(function (r) { sums[r] = summaryOf(r, v, false) || settledSummaries[r] || []; });
        var rows = RATES.map(function (lr, k) {
          var row = { lr: lr };
          rules.forEach(function (r) {
            var s = sums[r][k];
            row[r] = !s ? '' : s.diverged ? 'diverges' : s.slow ? 'more than ' + TP.fmt.int(AXIS_END) : s.crossing == null ? 'no progress' : TP.fmt.int(s.crossing);
          });
          return row;
        });
        var at = rules.map(function (r) {
          var run = tr.byRule[r], k = Math.min(t, run.steps), st = statusAt(run, t);
          var where = inFrameA(run.x[k], run.y[k]) || Math.abs(run.x[k]) < 1e5 ? '(' + fmt.pos(run.x[k]) + ', ' + fmt.pos(run.y[k]) + ')' : 'outside the plane drawn';
          var res = st.kind === 'diverged' ? 'diverges at step ' + fmt.int(st.step) : st.kind === 'crossing' ? 'last crosses the target at step ' + fmt.int(st.step)
            : st.kind === 'stalled' ? 'no progress since step ' + fmt.int(st.step) : st.kind === 'open' ? 'not at the target by step ' + fmt.int(st.step) : 'running';
          return NAME[r] + ' at ' + where + ', loss ' + fmt.loss(run.loss[k]) + ', ' + res;
        });
        return {
          columns: cols, rows: rows,
          caption: 'Steps to the target loss of ' + fmt.loss(tr.target) + ' at loss scale ' + tr.c + ' and each learning rate. At step ' + fmt.int(t) + ' of the run at ' + fmt.lr(v.lr) + ': ' + at.join('; ') + '.'
        };
      },
      quantities: function (state, ctx) {
        var v = ctx.values, tr = traceBy(state.key) || traceOf(v);
        return quantitiesOf(v, tr, state.t);
      }
    });

    TP.run(fig, {
      init: function (p) { var tr = traceOf(p); return { t: 0, key: tr.key }; },
      advance: function (s) { s.t += 1; return s; },
      record: function (s, t) { return rowOf(s.key, t); },
      compute: function (p, seed, from, to) {
        var tr = traceOf(p), rows = [], kf = {};
        for (var t = from + 1; t <= to; t++) {
          rows.push(rowOf(tr.key, t));
          if (t % 64 === 0) kf[t] = { t: t, key: tr.key };
        }
        return { rows: rows, keyframes: kf, state: { t: to, key: tr.key }, until: tr.until };
      },
      until: function (s, t, p) { return t >= traceFor(p).until; },
      steps: function (p) { return traceFor(p).until; },
      limit: AXIS_END,
      pace: 'log', duration: 6000, unit: 'step', recordPanel: 'c', reset: 'show'
    });
  }

  /* ---------- the recap (plan §6.24, R2 and R4) ---------- */

  TP.recaps = TP.recaps || {};
  /** Panel (b) alone for the rules the setting names, at default hyperparameters and the default
      loss scale (or the setting's scale), each fastest rate ringed, and with bound=1 each SGD-family
      rule's bound named on the axis. */
  TP.recaps['F2.1:summary'] = function (el, setting) {
    setting = setting || {};
    var names = String(setting.rules || 'sgd+adam').split('+');
    var rules = O.RULES.filter(function (r) { return names.indexOf(r) >= 0; }).slice(0, 3);
    var bound = String(setting.bound || '') === '1';
    var v = { scale: String(setting.scale || CAL.defaults.scale) }, sums = {};
    rules.forEach(function (r) { sums[r] = summaryOf(r, v, true); });
    var p = C().panel(el, panelBOpts({
      letter: '', describe: 'steps to the target against learning rate, at default hyperparameters',
      /* the drawing, the panel's header included, is at most 240 px tall at 1440 px and 180 px in
         the phone layout (plan §6.24). Above 640 px the SVG leaves 28 px for the panel's header, which
         R2's label "no progress" takes at 1440 px (20 px and a 4-px gap). */
      maxHeight: function (w, phone) { return phone ? 180 : 212; },
      aspect: function (w, phone) { return phone ? 0.5 : 0.36; }
    }));
    p.update(function (q) { drawB(q, rules, v, { summaries: sums, bound: bound ? 'all' : false }); });
    return p;
  };

  doc.addEventListener('tp:ready', function () {
    var el = doc.getElementById('fig-update-rules');
    if (el && TP.fig && TP.run && TP.chart) init(el);
  });
})(typeof window !== 'undefined' ? window : globalThis);
