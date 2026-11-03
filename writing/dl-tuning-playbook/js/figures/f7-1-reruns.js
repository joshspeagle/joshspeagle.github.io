/*
 * f7-1-reruns.js: figure F7.1, reruns against repeated studies (#fig-reruns), on page 7 #reruns.
 *
 * Design: notes/revamp/figure-plan.md (FP) F7.1 and notes/revamp/implementation-plan.md WO-F7.1
 * (§6.15), with review/synthesis.md R8, R12 and R56, on the figure contract of site.js (TP.fig) and
 * the runtime of runtime.js (TP.run) in its action form (design-system.md §7.2).
 *
 * The model is TP.variance (site/js/lib/variance.js), version 1's variance-components toy in
 * percentage points of validation error. A run measures the configuration's true value, plus the
 * offset of the study that produced it, plus trial noise. init(preset, seed) draws the candidate's
 * study offset and the incumbent's offset and its five reruns; the candidate has no run at step 0.
 * A step is one action: 'rerun' appends one run of the candidate with its own offset and fresh trial
 * noise (TP.variance.rerun), and 'repeat' draws a new study offset and appends the best trial of
 * the repeated study (TP.variance.repeat). The study offset belongs to the configuration the study
 * selected: reruns keep it, so they gather around that configuration's own error, mu + delta +
 * offset, and the figure draws no mark at mu + delta, which no number of reruns reaches. Each step draws from the runtime's generator for
 * TP.prng.deriveSeed(seed, t), as tests/calibration/fig-reruns.calibrate.js does, so the ledger's
 * default numbers are the ones autoplay's five reruns draw. The record row of step t holds
 * {value, mean, se, n, m}: the value the step appended, the candidate's running mean and its
 * standard error, the candidate's reruns and the repeated studies so far (WO-F7.1).
 *
 * One panel, "validation error of each run, in percentage points", with three rows on one value
 * axis, CAL.domains.a.x, which covers every preset over seeds 1 to 1,000 and 60 steps of either
 * kind. Row 1 holds the candidate's reruns as filled model-blue markers with their running mean as
 * a 3-px tick and an error bar of one standard error; row 2 the incumbent's reruns as open
 * third-gold circles with their mean and interval drawn the same way; row 3 the best trials of
 * repeated studies as open fourth-indigo diamonds, and the reader's mark. Each marker's vertical
 * place within its row is the run's jitter, drawn with it by the model. The brackets "trial
 * variance" (over the candidate's reruns) and "study and trial variance" (over the candidate's
 * running mean and every point of row 3; phone form "study + trial") stand exactly while rows 1
 * and 3 both hold points.
 *
 * The reader's mark is figure state outside params (plan's decision in WO-F7.1). A press, a tap or
 * Enter on the panel's reading element at a place of row 3 sets it to the value read there; it is
 * then a handle on row 3 along the value axis, in steps of MARK_SNAP. snapshot and restore keep it,
 * clear (Reset and printing) removes it, and it is never written to the URL.
 *
 * Work-order exceptions (notes/revamp/reports/fig-reruns.md):
 *   1. LIMIT (60) is the figure's constant, as WO-F7.1 states it; the calibration's LIMIT, which
 *      its domain sweep uses, must change with it (F5.2 keeps its LIMIT the same way).
 *   2. A value outside CAL.domains.a.x, which a seed beyond 1,000 can draw, stands at the frame's
 *      edge (DS §9 rule 3); the readout and the data table give its value.
 *   3. The reading element of row 3 reads places every MARK_SNAP along the value axis as well as
 *      the drawn diamonds, so that a press anywhere on row 3 finds a value to mark.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

/* BEGIN GENERATED table-cal */
// From tests/calibration/out/fig-reruns.json by npm run generate (tests/lib/write-generated.js).
var CAL = {
  "defaults": {"preset": "playbook", "seed": 225},
  "presets": {
    "playbook": {"preset": "playbook"},
    "bouthillier": {"preset": "bouthillier"},
    "study-larger": {"preset": "study-larger"},
    "study-smaller": {"preset": "study-smaller"}
  },
  "states": {},
  "seed": 225,
  "trueDifference": -0.2,
  "incumbentReruns": 5,
  "mu": 23,
  "spreads": {
    "playbook": {"trialSd": 0.1, "studySd": 0.3},
    "bouthillier": {"trialSd": 0.3, "studySd": 0.3},
    "study-larger": {"trialSd": 0.1, "studySd": 0.6},
    "study-smaller": {"trialSd": 0.1, "studySd": 0.02}
  },
  "domains": {"a": {"x": [20, 25.5]}},
  "tables": {
    "bouthillierRead": {
      "fig1": {
        "dataSampling": 0.36,
        "dataOrder": 0.27,
        "init": 0.23,
        "augment": 0.22,
        "randomSearch": 0.23,
        "bayesOpt": 0.29,
        "noisyGrid": 0.33
      },
      "figH4": {"oneRun": 0.45, "floorAll100": 0.3, "floorInit100": 0.37}
    },
    "default": {
      "incumbent": [
        {"value": 23.118068932109534, "jitter": 0.09587430441752076},
        {"value": 23.203533748627795, "jitter": 0.1813449882902205},
        {"value": 23.280323037004088, "jitter": 0.48125501116737723},
        {"value": 23.08002377974842, "jitter": 0.500500854337588},
        {"value": 22.89949493403025, "jitter": 0.8076447467319667}
      ],
      "candidate": [
        {"value": 22.753547846839957, "jitter": 0.18544752965681255},
        {"value": 22.835825778595158, "jitter": 0.3154908453579992},
        {"value": 22.696197525939237, "jitter": 0.5917388370726258},
        {"value": 22.879797617220838, "jitter": 0.7016876898705959},
        {"value": 22.89430450110444, "jitter": 0.44526981213130057}
      ]
    }
  },
  "quantities": {
    "model": {
      "true-difference": -0.2,
      "incumbent-reruns": 5,
      "incumbent-true": 23,
      "limit": 60,
      "h4-one-run": 0.45,
      "h4-floor-100": 0.3
    },
    "default": {
      "trial-sd": 0.1,
      "study-sd": 0.3,
      "studies-sd": 0.31622776601683794,
      "gain": 0.30435423236409065,
      "se-diff": 0.07470002484696754,
      "gain-in-se": 4.074352491683889,
      "candidate-sd": 0.08480132868277573,
      "incumbent-sd": 0.14390692552592346,
      "reruns": 5,
      "candidate-mean": 22.811934653939925,
      "candidate-se": 0.03792430710339784,
      "incumbent-mean": 23.116288886304016,
      "incumbent-se": 0.0643571335817929,
      "candidate-offset": 0.019627276603995106,
      "incumbent-offset": 0.1707972178162788
    },
    "bouthillier": {
      "trial-sd": 0.3,
      "study-sd": 0.3,
      "studies-sd": 0.4242640687119285,
      "candidate-mean": 22.796549408611785,
      "incumbent-mean": 23.007272223279493,
      "incumbent-offset": 0.1707972178162788,
      "candidate-se": 0.11377292131069315,
      "incumbent-se": 0.19307140074478987,
      "gain": 0.21072281466770804,
      "se-diff": 0.22410007454064898,
      "gain-in-se": 0.9403067584856404,
      "candidate-sd": 0.25440398604944436,
      "incumbent-sd": 0.4317207765764537
    },
    "study-larger": {
      "trial-sd": 0.1,
      "study-sd": 0.6,
      "studies-sd": 0.6082762530298219,
      "candidate-mean": 22.83156193054392,
      "incumbent-mean": 23.2870861041203,
      "incumbent-offset": 0.3415944356325576,
      "candidate-se": 0.03792430710369762,
      "incumbent-se": 0.0643571335814396,
      "gain": 0.45552417357637864,
      "se-diff": 0.07470002484681536,
      "gain-in-se": 6.098045810700942,
      "candidate-sd": 0.08480132868344605,
      "incumbent-sd": 0.14390692552513346
    },
    "study-smaller": {
      "trial-sd": 0.1,
      "study-sd": 0.02,
      "studies-sd": 0.10198039027185571,
      "candidate-mean": 22.793615862442863,
      "incumbent-mean": 22.956878149675493,
      "incumbent-offset": 0.01138648118775192,
      "candidate-se": 0.03792430710369762,
      "incumbent-se": 0.0643571335814396,
      "gain": 0.16326228723263014,
      "se-diff": 0.07470002484681536,
      "gain-in-se": 2.185572060617466,
      "candidate-sd": 0.08480132868344605,
      "incumbent-sd": 0.14390692552513346
    },
    "seed": {
      "chosen": 225,
      "statistic": "the candidate's running mean after five reruns minus its error averaged over studies; admitted: the incumbent's mean minus its error averaged over studies lies in the middle half of its distribution over the seeds",
      "n": 1000,
      "admitted": 500,
      "median": 0.011312370845208974
    }
  }
};
/* END GENERATED table-cal */

  var V = TP.variance;
  var STEPS = CAL.quantities['default'].reruns;     // autoplay's reruns (5)
  var LIMIT = 60;                                   // WO-F7.1 "limit: 60" (exception 1)
  /* the value axis, in points. CAL.domains.a.x ([20, 25.5]) covers every preset over 1,000 seeds and
     60 steps, which left the runs in the middle fifth of the frame; post 6 (Nov 2026) narrows it to
     the range the three presets it offers use, and a rare value outside stands at the edge
     (exception 2) */
  var X_DOMAIN = [21.75, 24.75];
  var MARK_SNAP = 0.05;                             // the mark's step along the value axis (ours)
  var PRESET_KEYS = Object.keys(CAL.presets);       // playbook, bouthillier, study-larger, study-smaller

  /* ---------- the model, without the DOM ---------- */

  function initState(preset, seed) { return V.init(preset, seed); }
  /** One step of kind 'rerun' or 'repeat', with the step's generator. Changes s in place. */
  function advanceState(s, rng, kind) {
    return kind === 'repeat' ? V.repeat(s, rng) : V.rerun(s, rng);
  }
  /** The record row of a step: the value it appended and the summary after it. */
  function recordOf(s, kind) {
    var sm = V.summary(s), list = kind === 'repeat' ? s.studies : kind === 'rerun' ? s.candidate.runs : null;
    return {
      value: list && list.length ? list[list.length - 1].value : null,
      mean: sm.candidate.mean, se: sm.candidate.se, n: sm.candidate.n, m: sm.studies.m
    };
  }

  var fmt = TP.fmt;
  function by(name) { return function (v) { return TP.fmt.byName(name)(v); }; }
  var f2 = by('fixed2');

  /** The readout (FP F7.1), ending "and no study has been repeated" while m is 0. No verdict. From
      the second rerun it gives the standard error of the difference of the two rerun means, the
      site's adoption yardstick (Batch 7 ruling); the incumbent's mean then stands in the difference.
      At most 29 words. */
  function differenceText(d) {
    var t = f2(Math.abs(d));
    return t === '0.00' ? 'equal to the incumbent\'s' : t + (d < 0 ? ' below' : ' above') + ' the incumbent\'s';
  }
  function readoutText(s) {
    if (!s) return '';
    var sm = V.summary(s), c = sm.candidate, i = sm.incumbent, st = sm.studies, d = sm.difference;
    var k = fmt.int(i.n) + (i.n === 1 ? ' rerun' : ' reruns');
    var head = c.n
      ? 'After ' + fmt.int(c.n) + (c.n === 1 ? ' rerun' : ' reruns') + ' the candidate\'s mean is ' + f2(c.mean) + ' points, ' + differenceText(d.value) +
        (d.se != null ? ' (standard error of the difference ' + f2(d.se) + ')' : '')
      : 'The candidate has no rerun yet, the incumbent\'s mean is ' + f2(i.mean) + ' points over ' + k;
    var tail = !st.m ? 'and no study has been repeated'
      : st.m === 1 ? 'and 1 repeated study\'s best trial lies at ' + f2(st.lo)
        : 'and ' + fmt.int(st.m) + ' repeated studies\' best trials span ' + f2(st.lo) + ' to ' + f2(st.hi);
    return head + ', ' + tail + '.';
  }

  /** The named quantities of a state (plan WO-I5.1), with the model and seed rows of CAL. */
  function quantitiesOf(s) {
    var q = {}, sm = V.summary(s);
    q['trial-sd'] = s.trialSd;
    q['study-sd'] = s.studySd;
    q.reruns = sm.candidate.n;
    q.repeats = sm.studies.m;
    q['candidate-mean'] = sm.candidate.mean;
    q['candidate-se'] = sm.candidate.se;
    q['incumbent-mean'] = sm.incumbent.mean;
    q['incumbent-se'] = sm.incumbent.se;
    q['candidate-sd'] = sm.candidate.sd;
    q['incumbent-sd'] = sm.incumbent.sd;
    /* the candidate's gain, the incumbent's mean minus the candidate's, and the standard error of
       the difference, the yardstick of the Batch 7 ruling */
    q.gain = sm.difference.value == null ? null : -sm.difference.value;
    q['gain-in-se'] = q.gain != null && sm.difference.se ? q.gain / sm.difference.se : null;
    q['se-diff'] = sm.difference.se;
    q['candidate-offset'] = s.candidate.offset;
    q['incumbent-offset'] = s.incumbent.offset;
    q['studies-lo'] = sm.studies.lo;
    q['studies-hi'] = sm.studies.hi;
    q['true-difference'] = s.delta;
    q['incumbent-reruns'] = sm.incumbent.n;
    q['incumbent-true'] = s.mu;
    /* the standard deviation of row 3 in the model, sqrt(trial^2 + study^2) (the paragraph after
       the figure states it for each preset beside the rerun spread, trial-sd) */
    q['studies-sd'] = Math.sqrt(s.trialSd * s.trialSd + s.studySd * s.studySd);
    var cq = CAL.quantities || {};
    ['model', 'seed'].forEach(function (setting) {
      var m = cq[setting] || {};
      Object.keys(m).forEach(function (name) { if (q[name] === undefined) q[name] = m[name]; });
    });
    return q;
  }

  TP.models = TP.models || {};
  TP.models.rerunsFigure = {
    STEPS: STEPS, LIMIT: LIMIT, X_DOMAIN: X_DOMAIN, MARK_SNAP: MARK_SNAP, init: initState,
    advance: advanceState, record: recordOf, readout: readoutText, quantities: quantitiesOf
  };

  /* ---------- drawing ---------- */

  var doc = global.document;
  if (!doc) return;
  var SVGNS = 'http://www.w3.org/2000/svg';
  function C() { return TP.chart; }
  function svg(tag, cls, attrs) {
    var n = doc.createElementNS(SVGNS, tag);
    if (cls) n.setAttribute('class', cls);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function r1(v) { return Math.round(v * 10) / 10; }

  /* The rows, top to bottom, at fixed heights on y from Y_LO to Y_HI. Row k takes y from its base
     to base + 1, with its markers between BAND[0] and BAND[1] above the base and its name at its
     left, level with the markers. The strip above row 1, up to Y_HI, holds the bracket of the
     trial variance, and the strip under row 3, down to Y_LO, the bracket of the study variance. */
  var ROW = { candidate: 2, incumbent: 1, studies: 0 };
  var BAND = [0.28, 0.72], MID = (BAND[0] + BAND[1]) / 2, Y_LO = -0.5, Y_HI = 3.4;
  function yIn(base, jitter) { return base + BAND[0] + (BAND[1] - BAND[0]) * jitter; }
  function xIn(v) { return Math.min(X_DOMAIN[1], Math.max(X_DOMAIN[0], v)); }   // exception 2

  function panelOpts() {
    return {
      describe: 'validation error of each run, in percentage points',
      xDomain: X_DOMAIN, yDomain: [Y_LO, Y_HI],
      xTicks: function (dom, px) {
        var out = [], step = px >= 420 ? 0.25 : 0.5;
        for (var v = Math.ceil(dom[0] / step) * step; v <= dom[1] + 1e-9; v += step) out.push(+v.toFixed(2));
        return out;
      },
      xFormat: function (v) { return String(v); },
      yTicks: 'none', grid: 'x',
      xLabel: 'validation error, in percentage points', yLabel: '',
      margin: function (w, phone) { return { t: 6, r: 24, b: 42, l: 24 }; },
      aspect: function (w, phone) { return phone ? 280 / Math.max(w, 1) : 220 / Math.max(w, 1); }
    };
  }

  /* The nodes of each row's mean and interval, made once and put back into the cleared marks layer
     on every render, with an attribute written only when its value changes. */
  function put(node, attrs) {
    var a = node.__tp || (node.__tp = {});
    for (var k in attrs) {
      var v = String(attrs[k]);
      if (a[k] !== v) { node.setAttribute(k, v); a[k] = v; }
    }
    return node;
  }
  var meanNodes = {};
  function nodesOf(row, role) {
    if (meanNodes[row]) return meanNodes[row];
    return (meanNodes[row] = {
      grp: svg('g', 'reruns-mean r-' + role, { 'data-key': 'mean-' + row, 'data-row': row }),
      stem: svg('line', 'stem'), capL: svg('line', 'stem'), capR: svg('line', 'stem'),
      casing: svg('line', 'casing median'), tick: svg('line', 'median')
    });
  }

  /**
   * The mean of one row as a 3-px tick over the row's markers, with an error bar of one standard
   * error around it along the value axis (none while the row holds one run). Returns the tick's
   * feature for a label.
   */
  function drawMean(p, stats, row, role, series) {
    if (!stats.n) return null;
    var base = ROW[row], N = nodesOf(row, role), layer = p.layers.marks.node();
    var X = p.x(xIn(stats.mean)), yt = p.y(base + BAND[1] + 0.04), yb = p.y(base + BAND[0] - 0.04), ym = p.y(base + MID);
    put(N.grp, { 'data-mean': stats.mean, 'data-se': stats.se == null ? '' : stats.se, 'data-n': stats.n });
    while (N.grp.firstChild) N.grp.removeChild(N.grp.firstChild);
    if (stats.se != null) {
      var X0 = p.x(xIn(stats.mean - stats.se)), X1 = p.x(xIn(stats.mean + stats.se));
      N.grp.appendChild(put(N.stem, { x1: r1(X0), x2: r1(X1), y1: r1(ym), y2: r1(ym) }));
      N.grp.appendChild(put(N.capL, { x1: r1(X0), x2: r1(X0), y1: r1(ym - 3), y2: r1(ym + 3) }));
      N.grp.appendChild(put(N.capR, { x1: r1(X1), x2: r1(X1), y1: r1(ym - 3), y2: r1(ym + 3) }));
      C().obstacle(p, { x0: X0, y0: ym - 3, x1: X1, y1: ym + 3 }, { kind: 'rival', type: 'rect', width: 1.5, series: series });
    }
    N.grp.appendChild(put(N.casing, { x1: r1(X), x2: r1(X), y1: r1(yt), y2: r1(yb) }));
    N.grp.appendChild(put(N.tick, { x1: r1(X), x2: r1(X), y1: r1(yt), y2: r1(yb) }));
    layer.appendChild(N.grp);
    C().obstacle(p, [[X, yt], [X, yb]], { kind: 'rival', type: 'segment', width: 3, series: series });
    return { x: stats.mean, y: base + MID, X: X, top: yt, bottom: yb };
  }

  /**
   * Draw the panel for state s. o = {mark, hold, onMark(value, transient)}. Returns the reading
   * points: the runs of each row, the two means, and the places of row 3 at every MARK_SNAP.
   */
  function drawPanel(p, s, o) {
    var items = [], points = [], sm = V.summary(s), phone = p.phone;
    var cand = s.candidate.runs, inc = s.incumbent.runs, stu = s.studies;
    var X = function (d) { return xIn(d.value); };
    /* row names, in text ink at the left of each row, level with its markers (WO-F7.1 "Labels"):
       the feature is a point in plot px at the frame's left edge, set below the row's middle by
       half a text height, so that the placer's first candidate, top right, centres the name on
       the row */
    [['candidate', 'candidate, reruns', 'candidate'], ['incumbent', 'incumbent, reruns', 'incumbent'],
      ['studies', 'repeated studies, best trial', 'repeated studies']].forEach(function (r) {
      items.push({ id: 'row-' + r[0], text: r[1], tone: 'ink', series: 'name-' + r[0],
        feature: { type: 'point', px: true, x: 0, y: p.y(ROW[r[0]] + MID) + 0.5 * p.h + 3, r: 1 },
        phone: { text: r[2] }, captionNames: true, keySentence: r[0] !== 'incumbent' });
    });
    /* row 2 first, so that its marks sit under nothing of row 1 */
    if (inc.length) {
      C().markers(p, inc, X, function (d) { return yIn(ROW.incumbent, d.jitter); },
        { role: 'third', series: 'incumbent', key: function (d, i) { return 'i' + (i + 1); } });
    }
    drawMean(p, sm.incumbent, 'incumbent', 'third', 'incumbent');
    if (cand.length) {
      C().markers(p, cand, X, function (d) { return yIn(ROW.candidate, d.jitter); },
        { role: 'model', series: 'candidate', key: function (d, i) { return 'c' + (i + 1); } });
    }
    var mc = drawMean(p, sm.candidate, 'candidate', 'model', 'candidate');
    if (mc && sm.candidate.se != null) {
      items.push({ id: 'interval', text: 'mean ± 1 standard error', role: 'model', series: 'candidate', tone: 'role',
        feature: { type: 'point', px: true, x: mc.X, y: mc.bottom, r: 1.5 }, phone: { text: '± 1 SE' }, captionNames: true });
    }
    if (stu.length) {
      C().markers(p, stu, X, function (d) { return yIn(ROW.studies, d.jitter); },
        { role: 'fourth', series: 'studies', key: function (d, i) { return 's' + (i + 1); } });
    }
    /* the brackets, computed from the state, exactly while rows 1 and 3 both hold points. The lower
       bracket spans row 3 and the candidate's mean, and each best trial there carries a new study
       offset and a new trial draw, so it is named for both spreads (build log Batch 5, rulings on
       the reads, page 7) */
    if (cand.length && stu.length) {
      var cv = cand.map(function (d) { return xIn(d.value); }), sv = stu.map(function (d) { return xIn(d.value); });
      C().annotation(p, { kind: 'bracket', id: 'trial-variance', text: 'trial variance', side: 'above',
        anchor: { x0: Math.min.apply(null, cv), x1: Math.max.apply(null, cv), y: ROW.candidate + BAND[1] + 0.02, series: 'candidate' },
        captionNames: true, keySentence: true });
      var all = sv.concat([xIn(sm.candidate.mean)]);
      C().annotation(p, { kind: 'bracket', id: 'study-variance', text: 'study and trial variance', side: 'below', phone: { text: 'study + trial' },
        anchor: { x0: Math.min.apply(null, all), x1: Math.max.apply(null, all), y: ROW.studies + BAND[0] - 0.02, series: 'studies' },
        captionNames: true, keySentence: true });
    }
    /* the reader's mark on row 3: a reader line across the row and the handle (DS §4.10) */
    if (o.mark != null) {
      var mTop = ROW.studies + BAND[1] + 0.04;
      C().ref(p, [[o.mark, ROW.studies + BAND[0] - 0.04], [o.mark, mTop]], { kind: 'reader', series: 'mark' });
      /* the name stands at the top end of the mark's line, above row 3's markers; with no position
         there it moves to the panel's header, and on a phone it may be dropped, since the caption
         names the mark (DS §5.6) */
      items.push({ id: 'mark', text: 'your mark', role: 'reader', series: 'mark', tone: 'role',
        feature: { type: 'point', px: true, x: p.x(xIn(o.mark)), y: p.y(mTop), r: 1.5 },
        phone: phone ? { text: 'your mark' } : { header: true }, captionNames: true });
      if (o.onMark) {
        C().handle(p, {
          id: 'mark', axis: 'x', value: o.mark, at: ROW.studies + MID, snap: MARK_SNAP, min: X_DOMAIN[0], max: X_DOMAIN[1],
          scale: 'linear', label: 'Your mark, the validation error you expect for the next study\'s best trial',
          format: function (v) { return f2(v) + ' points'; },
          onChange: function (v) { o.onMark(v, true); },
          onSettle: function (v) { o.onMark(v, false); }
        });
      }
    }
    C().place(p, items, { hold: !!o.hold });

    /* reading points: row 1, its mean, row 2, its mean, row 3, then the places of row 3 */
    function runPoint(row, d, i, head, role, key) {
      return { x: xIn(d.value), y: yIn(ROW[row], d.jitter), key: key + (i + 1), row: row,
        head: head + ' ' + (i + 1), rows: [{ value: f2(d.value), label: 'validation error, points', role: role }] };
    }
    function meanPoint(row, st, role, what) {
      if (!st.n) return null;
      return { x: xIn(st.mean), y: ROW[row] + MID, key: 'mean-' + row, row: row, head: 'Mean of the ' + what + '\'s ' + fmt.int(st.n) + (st.n === 1 ? ' rerun' : ' reruns'),
        rows: [{ value: f2(st.mean), label: 'mean, points', role: role }].concat(st.se == null ? [] : [{ value: f2(st.se), label: 'standard error, points', role: role }]),
        lines: (row === 'candidate' ? cand : inc).map(function (d, i) { return 'rerun ' + (i + 1) + ': ' + f2(d.value); }) };
    }
    cand.forEach(function (d, i) { points.push(runPoint('candidate', d, i, 'Candidate, rerun', 'model', 'c')); });
    var m1 = meanPoint('candidate', sm.candidate, 'model', 'candidate');
    if (m1) points.push(m1);
    inc.forEach(function (d, i) { points.push(runPoint('incumbent', d, i, 'Incumbent, rerun', 'third', 'i')); });
    var m2 = meanPoint('incumbent', sm.incumbent, 'third', 'incumbent');
    if (m2) points.push(m2);
    stu.forEach(function (d, i) { points.push(runPoint('studies', d, i, 'Repeated study', 'fourth', 's')); });
    return points.concat(placesOf());
  }
  /* The places of row 3 at every MARK_SNAP, which depend on nothing in the state: made once, so
     that a frame of play allocates none of them. */
  var PLACES = null;
  function placesOf() {
    if (PLACES) return PLACES;
    PLACES = [];
    var nPlaces = Math.round((X_DOMAIN[1] - X_DOMAIN[0]) / MARK_SNAP);
    for (var k = 0; k <= nPlaces; k++) {
      var v = +(X_DOMAIN[0] + k * MARK_SNAP).toFixed(2);
      PLACES.push({ x: v, y: ROW.studies + MID, key: 'place-' + k, row: 'studies', place: true,
        head: 'Row 3 at ' + f2(v) + ' points', rows: [], lines: ['A press or Enter sets your mark here.'] });
    }
    return PLACES;
  }

  /* ---------- the figure ---------- */

  function init(element) {
    var pa = null, hoverSet = false, points = [], mark = null, dragging = false, fig, run;
    TP.models.rerunsFigure.readingPoints = function () { return points; };
    TP.models.rerunsFigure.mark = function () { return mark; };
    /* for the browser check: sets the mark as a settled change, as a press on row 3 does */
    TP.models.rerunsFigure.setMark = function (v) { setMark(v, false); };
    function setMark(v, transient) {
      mark = v == null ? null : C().snap(v, MARK_SNAP, { min: X_DOMAIN[0], max: X_DOMAIN[1] });
      dragging = !!transient;
      /* the mark is the reader's handle, so it touches the run (DS §7.7 item 6) */
      if (run) run.touch();
      fig.redraw(transient ? {} : { settle: true });
    }
    fig = TP.fig(element, {
      kind: 'running',
      seed: CAL.seed,
      params: {
        preset: {
          type: 'choice', domain: PRESET_KEYS.slice(), default: CAL.defaults.preset,
          change: 'restart', showEnd: true, ghost: false, control: 'none', label: 'Spreads'
        }
      },
      /* post 6 (Nov 2026) offers three of the four calibrated spreads, named by what they set;
         study-larger stays in CAL and the ledger */
      presets: {
        'search spread 3× seed spread': { key: 'playbook', preset: CAL.presets.playbook.preset },
        'equal spreads': { key: 'bouthillier', preset: CAL.presets.bouthillier.preset },
        'search spread negligible': { key: 'study-smaller', preset: CAL.presets['study-smaller'].preset }
      },
      actions: [{ name: 'rerun', label: 'Rerun', dock: true }, { name: 'repeat', label: 'Repeat the study', dock: true }],
      snapshot: function () { return { mark: mark }; },
      restore: function (x) { mark = x && x.mark != null ? x.mark : null; },
      clear: function () { mark = null; dragging = false; },
      draw: function (state, ctx) {
        if (!pa) pa = C().panel(ctx.fig.panels, panelOpts());
        run = ctx.run || run || null;
        if (ctx.counter) pa.setNote(ctx.counter);
        pa.update(function (p) {
          if (!state) return;
          points = drawPanel(p, state, { mark: mark, hold: ctx.hold || dragging, onMark: setMark });
        });
        if (run && !hoverSet) {
          hoverSet = true;
          C().pointHover(pa, {
            by: 'run', label: 'Reading of the runs, and of row 3 for your mark',
            points: function () { return points; },
            select: function (i, pt) { if (pt && pt.row === 'studies') setMark(pt.x, false); }
          });
        }
      },
      readout: function (state) { return readoutText(state); },
      table: function (state, ctx) {
        var rows = [], sm = V.summary(state);
        state.candidate.runs.forEach(function (d, i) { rows.push({ what: 'Candidate, rerun ' + (i + 1), value: d.value }); });
        state.incumbent.runs.forEach(function (d, i) { rows.push({ what: 'Incumbent, rerun ' + (i + 1), value: d.value }); });
        state.studies.forEach(function (d, i) { rows.push({ what: 'Repeated study ' + (i + 1) + ', best trial', value: d.value, offset: d.offset }); });
        rows.push({ what: 'Candidate, mean', value: sm.candidate.mean, se: sm.candidate.se, offset: state.candidate.offset });
        rows.push({ what: 'Incumbent, mean', value: sm.incumbent.mean, se: sm.incumbent.se, offset: state.incumbent.offset });
        if (mark != null) rows.push({ what: 'Your mark', value: mark });
        var num = function (v) { return v == null ? '' : f2(v); };
        return {
          columns: [{ key: 'what', label: 'Run' }, { key: 'value', label: 'Validation error, points', format: num },
            { key: 'se', label: 'Standard error, points', format: num }, { key: 'offset', label: 'Study offset, points', format: num }],
          rows: rows,
          caption: 'Every run at ' + (ctx && ctx.counter ? ctx.counter : '') + ', with the trial spread ' + TP.fmt.byName('sig2')(state.trialSd) +
            ' and the study spread ' + TP.fmt.byName('sig2')(state.studySd) + ' points, at seed ' + ((ctx && ctx.values && ctx.values.seed) || fig.values().seed) + '.'
        };
      },
      quantities: function (state) { return quantitiesOf(state); }
    });
    run = TP.run(fig, {
      init: function (params) { return initState(params.preset, params.seed); },
      advance: function (s, params, rng, t, kind) { return advanceState(s, rng, kind); },
      record: function (s, t, kind) { return recordOf(s, kind); },
      actions: ['rerun', 'repeat'],
      steps: STEPS, limit: LIMIT, pace: 'ease', easeSteps: 3, duration: 2500,
      unit: 'run', reset: 'show'
    });
  }

  doc.addEventListener('tp:ready', function () {
    var el = doc.getElementById('fig-reruns');
    if (el && TP.fig && TP.run && TP.chart && TP.variance) init(el);
  });
})(typeof window !== 'undefined' ? window : globalThis);
