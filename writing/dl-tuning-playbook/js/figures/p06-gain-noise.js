/*
 * p06-gain-noise.js: "How big a gain is believable" (#fig-gain-noise), post 6, section #reruns.
 *
 * One idea: a gap between two configurations means something only when it is large compared with
 * the gaps that seed noise produces between two identical configurations, and averaging N reruns
 * per configuration shrinks those noise-only gaps by a factor of sqrt(N).
 *
 * The toy, in percentage points of validation error ("points"):
 *   baseline run k   = MU + sigma * zb_k
 *   candidate run k  = MU - gain + sigma * zc_k,       k = 1..N
 * with zb, zc standard normals drawn once per seed (the first N are used, so raising N adds runs
 * and keeps the earlier ones). The observed gap is mean(baseline) - mean(candidate), so a positive
 * gap favours the candidate. Noise alone (gain 0) gives gaps with standard deviation
 * se = sigma * sqrt(2 / N), the standard error of the gap. Panel (b) draws NULL_N such noise-only
 * gaps, se * zn_m, as a histogram, the band of +/- 2 se, and the observed gap.
 * sigma is the true seed-to-seed standard deviation; the band uses it, not a sample estimate.
 * Defaults: sigma 0.1 points, the Playbook's "+/- 0.1% on a validation error rate of ~23%" for a
 * ResNet-50 on ImageNet read as a standard deviation (our reading); MU = 23 for the same reason.
 *
 * Panel (a) draws the runs: baseline open third-gold circles, candidate filled model-blue circles,
 * each row's mean as a tick, and the gap between the means. Panel (b) is the noise-only histogram.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  /* BEGIN GENERATED table-cal */
  // computed from this file's apply() at seed 142 for every preset (see the post06 report)
  var CAL = {"defaults": {"reruns": 1, "noise": 0.1, "gain": 0.15, "seed": 142},
    "presets": {"single-run": {"reruns": 1, "noise": 0.1, "gain": 0.15},
    "five-reruns": {"reruns": 5, "noise": 0.1, "gain": 0.15},
    "no-gain": {"reruns": 5, "noise": 0.1, "gain": 0},
    "noisy-seeds": {"reruns": 5, "noise": 0.3, "gain": 0.15},
    "noisy-twenty": {"reruns": 20, "noise": 0.3, "gain": 0.15}},
    "quantities": {"default": {"reruns": 1, "noise": 0.1, "gain": 0.15, "baseline-mean": 23.197179915585878, "candidate-mean": 23.065643966303092, "gap": 0.13153594928278523, "se-gap": 0.14142135623730953, "band": 0.28284271247461906, "gap-in-se": 0.9300996170766721, "share-below": 85.5, "est-se": null},
    "single-run": {"reruns": 1, "noise": 0.1, "gain": 0.15, "baseline-mean": 23.197179915585878, "candidate-mean": 23.065643966303092, "gap": 0.13153594928278523, "se-gap": 0.14142135623730953, "band": 0.28284271247461906, "gap-in-se": 0.9300996170766721, "share-below": 85.5, "est-se": null},
    "five-reruns": {"reruns": 5, "noise": 0.1, "gain": 0.15, "baseline-mean": 23.063159346725474, "candidate-mean": 22.91150563091959, "gap": 0.15165371580588527, "se-gap": 0.0632455532033676, "band": 0.1264911064067352, "gap-in-se": 2.3978557878723756, "share-below": 98.75, "est-se": 0.06877917783405742},
    "no-gain": {"reruns": 5, "noise": 0.1, "gain": 0, "baseline-mean": 23.063159346725474, "candidate-mean": 23.06150563091959, "gap": 0.001653715805883138, "se-gap": 0.0632455532033676, "band": 0.1264911064067352, "gap-in-se": 0.026147542746057975, "share-below": 54.75, "est-se": 0.06877917783356154},
    "noisy-seeds": {"reruns": 5, "noise": 0.3, "gain": 0.15, "baseline-mean": 23.189478040176425, "candidate-mean": 23.03451689275877, "gap": 0.1549611474176551, "se-gap": 0.18973665961010275, "band": 0.3794733192202055, "gap-in-se": 0.8167169577881829, "share-below": 82.75, "est-se": 0.20633753350123557},
    "noisy-twenty": {"reruns": 20, "noise": 0.3, "gain": 0.15, "baseline-mean": 23.11404093044005, "candidate-mean": 22.91653931080277, "gap": 0.19750161963728274, "se-gap": 0.09486832980505137, "band": 0.18973665961010275, "gap-in-se": 2.0818498654201725, "share-below": 98.5, "est-se": 0.08641024539126825}}};
  /* END GENERATED table-cal */

  var MU = 23, MAXN = 20, NULL_N = 400;
  var RERUNS = [1, 2, 3, 5, 10, 20];
  var A_DOMAIN = [21.9, 23.8], B_DOMAIN = [-0.8, 0.8], BIN = 0.025;

  var drawCache = {};
  function draws(seed) {
    if (drawCache[seed]) return drawCache[seed];
    var g = TP.prng.create(seed);
    var gb = g.fork('gain:baseline'), gc = g.fork('gain:candidate'), gn = g.fork('gain:null'), gj = g.fork('gain:jitter');
    var d = { zb: [], zc: [], zn: [], jb: [], jc: [] };
    for (var k = 0; k < MAXN; k++) { d.zb.push(gb.normal()); d.zc.push(gc.normal()); d.jb.push(gj.uniform()); d.jc.push(gj.uniform()); }
    for (var m = 0; m < NULL_N; m++) d.zn.push(gn.normal());
    drawCache = {}; drawCache[seed] = d;
    return d;
  }

  function stats(vals) {
    var n = vals.length, s = 0, ss = 0;
    vals.forEach(function (v) { s += v; ss += v * v; });
    var mean = s / n, sd = n > 1 ? Math.sqrt(Math.max(0, (ss - n * mean * mean) / (n - 1))) : null;
    return { n: n, mean: mean, sd: sd };
  }

  /** The state for values {reruns, noise, gain, seed}. */
  function apply(v) {
    var d = draws(v.seed), N = v.reruns, s = v.noise;
    var base = [], cand = [];
    for (var k = 0; k < N; k++) {
      base.push({ key: 'b' + (k + 1), value: MU + s * d.zb[k], jitter: d.jb[k] });
      cand.push({ key: 'c' + (k + 1), value: MU - v.gain + s * d.zc[k], jitter: d.jc[k] });
    }
    var sb = stats(base.map(function (r) { return r.value; })), sc = stats(cand.map(function (r) { return r.value; }));
    var se = s * Math.sqrt(2 / N), gap = sb.mean - sc.mean;
    var nulls = d.zn.map(function (z) { return se * z; });
    var below = 0;
    nulls.forEach(function (x) { if (x < gap) below++; });
    /* the histogram of noise-only gaps, on fixed bins of BIN points */
    var nb = Math.round((B_DOMAIN[1] - B_DOMAIN[0]) / BIN), counts = new Array(nb).fill(0);
    nulls.forEach(function (x) {
      var i = Math.floor((x - B_DOMAIN[0]) / BIN);
      if (i < 0) i = 0; if (i >= nb) i = nb - 1;
      counts[i]++;
    });
    var bins = [];
    counts.forEach(function (c, i) { if (c) bins.push({ key: 'bin' + i, x0: B_DOMAIN[0] + i * BIN, x1: B_DOMAIN[0] + (i + 1) * BIN, y: c }); });
    var estSe = sb.sd != null && sc.sd != null ? Math.sqrt(sb.sd * sb.sd / N + sc.sd * sc.sd / N) : null;
    return {
      reruns: N, noise: s, gain: v.gain, seed: v.seed,
      base: base, cand: cand, baseMean: sb.mean, candMean: sc.mean, baseSd: sb.sd, candSd: sc.sd,
      gap: gap, se: se, estSe: estSe, z: gap / se, band: 2 * se,
      share: below / NULL_N, beyond: gap > 2 * se, bins: bins, maxCount: Math.max.apply(null, counts)
    };
  }

  var f2 = function (v) { return v == null ? '' : (Math.round(v * 100) / 100).toFixed(2); };
  var pct = function (v) { return Math.round(v * 100) + '%'; };

  function readout(s) {
    var runs = s.reruns === 1 ? 'one run' : s.reruns + ' runs';
    var verdict = s.beyond ? 'outside the noise band, so seed noise alone rarely produces a gap this large'
      : 'inside the noise band, so seed noise alone could produce it';
    return 'With ' + runs + ' per configuration, the gap between identical configurations has a standard error of ' + f2(s.se) +
      ' points. The observed gap of ' + f2(s.gap) + ' points is ' + verdict + '.';
  }

  function quantities(s) {
    return {
      reruns: s.reruns, noise: s.noise, gain: s.gain,
      'baseline-mean': s.baseMean, 'candidate-mean': s.candMean,
      gap: s.gap, 'se-gap': s.se, band: s.band, 'gap-in-se': s.z, 'share-below': s.share * 100,
      'est-se': s.estSe
    };
  }

  TP.models = TP.models || {};
  TP.models.gainNoise = { apply: apply, quantities: quantities, readout: readout, CAL: CAL, MU: MU, RERUNS: RERUNS };

  var doc = global.document;
  if (!doc) return;
  function C() { return TP.chart; }

  /* rows of panel (a): candidate on top, baseline below */
  var ROWY = { cand: 1, base: 0 }, BAND = [0.22, 0.78];
  function yIn(row, j) { return ROWY[row] + BAND[0] + (BAND[1] - BAND[0]) * j; }
  function clampX(v, dom) { return Math.min(dom[1], Math.max(dom[0], v)); }

  function init(element) {
    var pa = null, pb = null, cur = null, fig;

    function drawA(p) {
      var s = cur;
      if (!s) return;
      var items = [];
      var X = function (d) { return clampX(d.value, A_DOMAIN); };
      C().markers(p, s.base, X, function (d) { return yIn('base', d.jitter); }, { role: 'third', series: 'baseline', key: function (d) { return d.key; } });
      C().markers(p, s.cand, X, function (d) { return yIn('cand', d.jitter); }, { role: 'model', series: 'candidate', key: function (d) { return d.key; } });
      [['base', s.baseMean, 'third'], ['cand', s.candMean, 'model']].forEach(function (m) {
        var y0 = ROWY[m[0]] + BAND[0] - 0.06, y1 = ROWY[m[0]] + BAND[1] + 0.06;
        C().ref(p, [[clampX(m[1], A_DOMAIN), y0], [clampX(m[1], A_DOMAIN), y1]], { kind: 'level', role: m[2], series: m[0] === 'base' ? 'baseline' : 'candidate', key: 'mean-' + m[0] });
      });
      items.push({ id: 'name-cand', text: s.reruns === 1 ? 'candidate, 1 run' : 'candidate, ' + s.reruns + ' runs', tone: 'role', role: 'model', series: 'name-cand',
        feature: { type: 'point', px: true, x: 0, y: p.y(ROWY.cand + 0.5) + 0.5 * p.h + 3, r: 1 }, phone: { text: 'candidate' } });
      items.push({ id: 'name-base', text: s.reruns === 1 ? 'baseline, 1 run' : 'baseline, ' + s.reruns + ' runs', tone: 'role', role: 'third', series: 'name-base',
        feature: { type: 'point', px: true, x: 0, y: p.y(ROWY.base + 0.5) + 0.5 * p.h + 3, r: 1 }, phone: { text: 'baseline' } });
      C().place(p, items, {});
    }

    function drawB(p) {
      var s = cur;
      if (!s) return;
      C().band(p, -s.band, s.band, { role: 'context', id: 'noise-band' });
      C().bars(p, s.bins, { role: 'context', series: 'nulls', gap: 0, key: function (d) { return d.key; } });
      var gx = clampX(s.gap, B_DOMAIN);
      /* the observed gap, named on the axis in the data role (regular tick labels within 1 h give way) */
      C().level(p, 'x', gx, { role: 'data', line: true, series: 'gap', key: 'gap', text: (p.phone ? 'gap ' : 'observed gap ') + f2(s.gap) });
    }

    function build(f) {
      pa = C().panel(f.panels, {
        letter: '(a)', describe: 'validation error of each run, baseline and candidate', note: 'the runs of each configuration',
        xDomain: A_DOMAIN.slice(), yDomain: [-0.05, 2.05], yTicks: 'none', grid: 'x',
        xTicks: function (dom, px) { var out = [], st = px > 420 ? 0.25 : 0.5; for (var v = Math.ceil(dom[0] / st) * st; v <= dom[1] + 1e-9; v += st) out.push(+v.toFixed(2)); return out; },
        xFormat: function (v) { return String(v); },
        xLabel: 'validation error, percentage points', yLabel: '',
        aspect: function (w, phone) { return phone ? 160 / Math.max(w, 1) : 165 / Math.max(w, 1); },
        margin: function (w, phone) { return { t: 6, r: 14, b: 40, l: 10 }; }
      });
      pb = C().panel(f.panels, {
        letter: '(b)', describe: 'gaps between two identical configurations from seed noise alone', note: 'gaps from noise alone (400 draws); shaded ±2 SE',
        xDomain: B_DOMAIN.slice(), yDomain: [0, 1], yTicks: 'none', grid: 'none',
        xTicks: function (dom, px) { return px > 420 ? [-0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8] : [-0.8, -0.4, 0, 0.4, 0.8]; },
        xFormat: function (v) { return String(v); },
        xLabel: function (p) { return p.phone ? 'gap, points (> 0 favours candidate)' : 'gap between means, points (> 0 favours candidate)'; }, yLabel: '',
        aspect: function (w, phone) { return phone ? 180 / Math.max(w, 1) : 185 / Math.max(w, 1); },
        margin: function (w, phone) { return { t: 8, r: 14, b: 40, l: 10 }; }
      });
      C().pointHover(pa, {
        by: 'run', label: 'Reading of the runs',
        points: function () {
          if (!cur) return [];
          var pts = [];
          cur.cand.forEach(function (d, i) { pts.push({ x: clampX(d.value, A_DOMAIN), y: yIn('cand', d.jitter), key: d.key, head: 'Candidate, run ' + (i + 1), rows: [{ value: f2(d.value), label: 'validation error, points', role: 'model' }] }); });
          cur.base.forEach(function (d, i) { pts.push({ x: clampX(d.value, A_DOMAIN), y: yIn('base', d.jitter), key: d.key, head: 'Baseline, run ' + (i + 1), rows: [{ value: f2(d.value), label: 'validation error, points', role: 'third' }] }); });
          return pts;
        }
      });
    }

    fig = TP.fig(element, {
      kind: 'fixed',
      seed: CAL.defaults.seed,
      params: {
        reruns: { type: 'number', default: CAL.defaults.reruns, snap: RERUNS.slice(), domain: [1, 20], scale: 'log', change: 'cut', dock: true,
          label: 'Runs per configuration, N', format: function (v) { return String(v); }, encode: function (v) { return String(v); } },
        noise: { type: 'number', default: CAL.defaults.noise, domain: [0.05, 0.3], snap: 0.05, change: 'cut',
          label: 'Seed-to-seed spread σ, points', format: f2 },
        gain: { type: 'number', default: CAL.defaults.gain, domain: [0, 0.5], snap: 0.05, change: 'cut',
          label: 'True gain of the candidate, points', format: f2 }
      },
      presets: {
        'one run each': { key: 'single-run', reruns: 1, noise: 0.1, gain: 0.15 },
        'five runs each': { key: 'five-reruns', reruns: 5, noise: 0.1, gain: 0.15 },
        'no real gain': { key: 'no-gain', reruns: 5, noise: 0.1, gain: 0 },
        'noisier seeds': { key: 'noisy-seeds', reruns: 5, noise: 0.3, gain: 0.15 },
        'noisier seeds, twenty runs': { key: 'noisy-twenty', reruns: 20, noise: 0.3, gain: 0.15 }
      },
      apply: function (values) { return apply(values); },
      draw: function (state, ctx) {
        if (!pa) build(ctx.fig);
        cur = state;
        pa.update(drawA);
        pb.update(function (p) {
          /* the histogram's height follows its tallest bin */
          if (cur) p.y.domain([0, cur.maxCount * 1.08]);
          drawB(p);
        });
      },
      readout: function (state) { return readout(state); },
      table: function (state) {
        var rows = [];
        state.cand.forEach(function (d, i) { rows.push({ what: 'Candidate, run ' + (i + 1), value: d.value }); });
        state.base.forEach(function (d, i) { rows.push({ what: 'Baseline, run ' + (i + 1), value: d.value }); });
        rows.push({ what: 'Candidate, mean', value: state.candMean });
        rows.push({ what: 'Baseline, mean', value: state.baseMean });
        rows.push({ what: 'Observed gap', value: state.gap });
        rows.push({ what: 'Standard error of the gap, σ√(2/N)', value: state.se });
        rows.push({ what: 'Share of noise-only gaps below the observed gap', value: null, text: pct(state.share) });
        return {
          columns: [{ key: 'what', label: 'Quantity' }, { key: 'value', label: 'Points', format: f2 }, { key: 'text', label: 'Share' }],
          rows: rows,
          caption: 'Runs and summaries at N = ' + state.reruns + ', σ = ' + f2(state.noise) + ', true gain ' + f2(state.gain) + ', seed ' + state.seed + '.'
        };
      },
      quantities: function (state) { return quantities(state); }
    });
  }

  doc.addEventListener('tp:ready', function () {
    var el = doc.getElementById('fig-gain-noise');
    if (el && TP.fig && TP.chart && TP.prng) init(el);
  });
})(typeof window !== 'undefined' ? window : globalThis);
