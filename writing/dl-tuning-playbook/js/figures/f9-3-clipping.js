/*
 * f9-3-clipping.js: figure F9.3, the clipping threshold (fig-clipping), on page 9 #clipping.
 *
 * Work order: notes/revamp/implementation-plan.md §6.21 (WO-F9.3), with §6.0. Entry:
 * notes/revamp/figure-plan.md F9.3 and review/synthesis.md R11. Design: notes/revamp/design-system.md
 * §3.4, §3.5, §4, §5, §6, §8 and §9. A fixed-frame figure with one handle and no dock.
 *
 * The model is TP.clipping (site/js/lib/clipping.js): version 1's synthetic series of 5,000 logged,
 * unclipped gradient norms, with the spike rate fixed at TP.clipping.SPIKE_RATE. For a threshold
 * lambda, TP.clipping.stats gives its percentile, the fraction of updates clipped (the share of norms
 * above lambda) and the mean multiplier on the gradient, the mean of min(1, lambda / ||g||). The
 * readout, the curves, the table and the quantities all come from stats, the computation of
 * tests/calibration/fig-clipping.calibrate.js, so the quantities equal the ledger's rows at the
 * default and at the preset "half the updates clipped".
 *
 * Two stacked panels share the x axis, the norm or threshold on a log axis over CAL.domains.a.x:
 * (a) steps against unclipped gradient norm: the histogram at TP.clipping.BINS_PER_DECADE bins per
 *     decade in model blue; the 90th percentile of the norms a model-blue dash-dot level named on
 *     the x axis; the threshold a reader line named on the x axis by its value, with its handle on
 *     the axis and a press band along the line. Where the two lines stand within 2 px, as at the
 *     default, the level is drawn above the reader's line so both show.
 * (b) fraction of updates against threshold: the fraction clipped (model blue, filled markers) and
 *     the mean multiplier (third gold, open circles), sampled PER_DECADE times per decade with the
 *     current threshold added as a sample, markers thinned to 24 px and kept at the threshold (DS
 *     §4.2); half the updates a dashed limit named on the y axis; the threshold's reader line
 *     continued. The header carries the current fraction clipped (DS §5.7).
 *
 * The parameters: threshold (the handle, continuous on a log axis, cut, no ghost) and the seed
 * ("Draw again", cut). The threshold is held to four significant figures whenever it is set
 * (constrain), and its URL text is those four figures, so a URL restores it exactly (the plan's
 * decision on the encoding). The default is CAL's, the default seed's 90th percentile, unrounded.
 * The handle's keys follow WO-F9.3: the arrows move 0.01 decade and Page Up and Page Down 0.1
 * decade (C.handle's step and page options), and Home and End go to the ends.
 * Presets "90th percentile" (key p90), "half the updates clipped" (key half) and "nearly all updates
 * clipped" (key nearly-all) are functions of the seed that set the threshold at the current seed's
 * 90th percentile, median or 1st percentile (CAL.quantities['nearly-all'].quantile) (WO-I5.4). No
 * dock: the presets, "Draw again" and Reset sit in more.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};

  /* BEGIN GENERATED table-cal */
  // From tests/calibration/out/fig-clipping.json by npm run generate (tests/lib/write-generated.js).
  var CAL = {
    "defaults": {"threshold": 1.7139445884180566, "seed": 226},
    "presets": {
      "p90": {"threshold": 1.7139445884180566},
      "half": {"threshold": 1.042701019988019},
      "nearly-all": {"threshold": 0.40175671546985847}
    },
    "states": {},
    "seed": 226,
    "spikeRate": 0.005,
    "domains": {"a": {"x": [0.1, 100], "y": [0, 900]}, "b": {"x": [0.1, 100], "y": [0, 1]}},
    "tables": {
      "histogram": [1, 0, 1, 2, 4, 2, 3, 0, 4, 3, 11, 16, 23, 35, 95, 126, 216, 395, 564, 742, 748, 655, 445, 287, 180, 113, 76, 51, 40, 36, 20, 22, 17, 13, 12, 4, 8, 3, 4, 3, 3, 0, 2, 5, 4, 1, 0, 2, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]
    },
    "quantities": {
      "model": {
        "spike-rate": 0.005,
        "steps": 5000,
        "early-factor": 5,
        "early-steps": 200,
        "core-scale": 0.25,
        "core-df": 4,
        "spike-low": 3,
        "spike-high": 20,
        "bins-per-decade": 20,
        "range-low": 0.1,
        "range-high": 100,
        "samples-per-decade": 100,
        "sim-dim": 1000,
        "sim-steps": 3000,
        "sim-clipped-8": 0.17433333333333334,
        "sim-sgdm-8": 0.9164423011477661,
        "sim-adam-8": 1.0409163761928342,
        "sim-clipped-5": 0.5,
        "sim-sgdm-5": 0.7471775808584988,
        "sim-adam-5": 1.0774427740634245,
        "sim-clipped-1": 0.9996666666666667,
        "sim-sgdm-1": 0.17457643212998974,
        "sim-adam-1": 1.101377566160847
      },
      "default": {
        "threshold": 1.7139445884180566,
        "median": 1.042701019988019,
        "clipped": 0.1,
        "multiplier": 0.9697089246310648,
        "spikes": 25
      },
      "half": {"threshold": 1.042701019988019, "clipped": 0.5, "multiplier": 0.877668096742451},
      "nearly-all": {
        "quantile": 0.01,
        "threshold": 0.40175671546985847,
        "clipped": 0.99,
        "multiplier": 0.40154220433897303
      },
      "seed": {
        "chosen": 226,
        "statistic": "the 90th percentile of the norms divided by their median",
        "n": 1000,
        "admitted": 1000,
        "statistic-median": 1.6437240754038185
      }
    }
  };
  /* END GENERATED table-cal */

  var ID = 'fig-clipping';
  var PER_DECADE = CAL.quantities.model['samples-per-decade'];   /* samples of the curves in (b) per decade of threshold (100) */
  var KEY_STEP = 0.01, PAGE_STEP = 0.1;   /* the handle's keys, in decades (WO-F9.3) */
  var LEVEL_TEXT = '90th percentile';
  var HALF_TEXT = ['half the updates'], HALF_PHONE = 'half';

  function CL() { return TP.clipping; }
  function round4(v) { return Number(Number(v).toPrecision(4)); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  var fmt = {
    lam: function (v) { return TP.fmt.byName('sig3')(v); },
    mult: function (v) { return TP.fmt.byName('fixed2')(v); },
    int: function (v) { return TP.fmt.byName('int')(v); },
    /* a fraction as a percentage: whole percent, one significant figure below 1%, and two decimals
       between 99% and 100%, so that no share other than none or all prints as 0% or 100% */
    pct: function (v) {
      if (v > 0 && v < 0.01) return TP.fmt.sig(100 * v, 1) + '%';
      if (v > 0.99 && v < 1) return String(+(100 * v).toFixed(2)) + '%';
      return TP.fmt.byName('pct0')(v);
    },
    tick: function (v) { return TP.fmt.sig(v, 3); }
  };
  function ordinal(n) {
    var k = n % 100, e = k >= 11 && k <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th';
    return n + e;
  }

  /* ============================== the model ============================== */

  /* The series of the last few seeds, each with its percentiles and its sampled curves. A series
     takes about 10 ms to draw, so returning to a seed redraws only. */
  var seen = [];
  function seriesOf(seed) {
    for (var i = 0; i < seen.length; i++) if (seen[i].seed === seed) return seen[i];
    var M = CL(), ser = M.series(M.draws(seed));
    var X = CAL.domains.b.x, n = Math.round(PER_DECADE * Math.log10(X[1] / X[0])), curve = [];
    for (var k = 0; k <= n; k++) {
      var lam = X[0] * Math.pow(10, k / PER_DECADE), st = M.stats(ser, lam);
      curve.push({ key: 's' + k, x: lam, clipped: st.clipped, mult: st.meanMult });
    }
    var S = {
      seed: seed, ser: ser, curve: curve,
      p90: M.quantile(ser.sorted, 0.9), median: M.quantile(ser.sorted, 0.5), p01: M.quantile(ser.sorted, NEARLY_ALL),
      bins: ser.bins.map(function (b, j) { return { key: 'b' + j, x0: b.x0, x1: b.x1, y: b.count }; })
    };
    seen.unshift(S);
    if (seen.length > 4) seen.pop();
    return S;
  }

  /* the presets, functions of the seed (WO-I5.4) */
  function p90Preset(seed) { return { threshold: seriesOf(seed).p90 }; }
  p90Preset.key = 'p90';
  function halfPreset(seed) { return { threshold: seriesOf(seed).median }; }
  halfPreset.key = 'half';
  /* a threshold that clips nearly all updates, at the seed's NEARLY_ALL quantile (the ledger's
     fig-clipping:nearly-all:quantile), where the mean multiplier shows clipping as a smaller
     learning rate (page 9's fidelity finding 15) */
  var NEARLY_ALL = CAL.quantities['nearly-all'].quantile;
  function nearlyAllPreset(seed) { return { threshold: seriesOf(seed).p01 }; }
  nearlyAllPreset.key = 'nearly-all';

  /** The derived state for the values. Every array of rows carries a key (DS §9). */
  function apply(values) {
    var S = seriesOf(values.seed), lam = values.threshold, st = CL().stats(S.ser, lam);
    /* the current threshold is a sample of both curves, so that the lines pass through the
       readout's values at the handle */
    var curve = S.curve.filter(function (r) { return Math.abs(Math.log10(r.x / lam)) > 1e-9; });
    curve.push({ key: 'lambda', x: lam, clipped: st.clipped, mult: st.meanMult });
    curve.sort(function (a, b) { return a.x - b.x; });
    return {
      seed: values.seed, threshold: lam, p90: S.p90, median: S.median, nSpikes: S.ser.nSpikes,
      below: st.below, percentile: st.percentile, clipped: st.clipped, mult: st.meanMult,
      bins: S.bins, curve: curve
    };
  }

  /* ============================== the figure ============================== */

  var fig = null, pa = null, pb = null, cur = null, curCtx = { hold: false };

  /* 2026-11 review (post08): the two panels are the two plots the Playbook says to generate by
     default, the unclipped gradient norm against step and the histogram of the norms. The former
     panel of the fraction clipped and the mean multiplier against threshold is gone; the readout
     and (b)'s header carry both numbers for the current threshold.
     (a) the logged norm against step (log y), the threshold a horizontal reader line with its
         handle on the y axis, and the band above it tinted as the clipped region.
     (b) the histogram of the norms (log x), the threshold a vertical reader line named by its
         value, and the 90th percentile a model-blue dash-dot level named on the x axis. */
  function margin(w, phone) { return phone ? { t: 8, r: 14, b: 38, l: 48 } : { t: 10, r: 20, b: 42, l: 64 }; }
  var traceCache = { seed: null, rows: null };
  function traceRows(S) {
    if (traceCache.seed === S.seed) return traceCache.rows;
    var n = S.ser.norms, rows = new Array(n.length);
    for (var i = 0; i < n.length; i++) rows[i] = { t: i + 1, g: n[i] };
    traceCache = { seed: S.seed, rows: rows };
    return rows;
  }
  function build(f) {
    var X = CAL.domains.a.x;
    pa = TP.chart.panel(f.panels, {
      letter: '(a)', key: 'a',
      describe: 'unclipped gradient norm against step',
      xDomain: [0, CL().steps], yLog: 10, yDomain: X.slice(),
      xLabel: 'step', yLabel: function (p) { return p.phone ? 'grad norm' : 'gradient norm'; },
      xTicks: [0, 1000, 2000, 3000, 4000, 5000], xFormat: fmt.int,
      yTicks: [0.1, 1, 10, 100], yFormat: fmt.tick,
      grid: 'y',
      aspect: function (w, phone) { return (phone ? 190 : 230) / Math.max(w, 1); },
      margin: margin
    });
    pb = TP.chart.panel(f.panels, {
      letter: '(b)', key: 'b',
      describe: 'steps against unclipped gradient norm, the histogram',
      xLog: 10, yLog: false, xDomain: X.slice(), yDomain: CAL.domains.a.y.slice(),
      xLabel: 'unclipped gradient norm', yLabel: 'steps',
      xTicks: 'pow10', xFormat: fmt.tick,
      yTicks: function (dom, px) { return px < 120 ? [0, 450, 900] : [0, 300, 600, 900]; }, yFormat: fmt.int,
      grid: 'y',
      aspect: function (w, phone) { return (phone ? 170 : 190) / Math.max(w, 1); },
      margin: margin
    });
    pa.update(drawA);
    pb.update(drawB);
  }

  /* The threshold's value named on the axis moves sideways, clear of the 90th percentile's name,
     where the two would overlap. Its stem stays at its value. */
  function separateNames(p, fixed, moving) {
    if (!fixed || !moving) return;
    var gap = 6, a = fixed, b = moving;
    var aLo = a.pos - a.w / 2, aHi = a.pos + a.w / 2, bLo = b.pos - b.w / 2, bHi = b.pos + b.w / 2;
    if (bLo >= aHi + gap || bHi <= aLo - gap) return;
    var lo = -p.margin.l + b.w / 2 + 1, hi = p.width + p.margin.r - b.w / 2 - 1;
    var right = aHi + gap + b.w / 2, left = aLo - gap - b.w / 2;
    var want = b.value >= a.value ? (right <= hi ? right : left) : (left >= lo ? left : right);
    var t = b.node.querySelector('text');
    if (t) t.setAttribute('transform', 'translate(' + (want - b.pos).toFixed(2) + ',0)');
    b.pos = want;
  }

  var lineCache = {};
  function drawA(p) {
    var s = cur;
    if (!s) return;
    var C = TP.chart, X = CAL.domains.a.x, S = seriesOf(s.seed);
    C.band(p, s.threshold, X[1], { axis: 'y', role: 'data', id: 'clipped', name: p.phone ? 'clipped' : 'clipped steps', key: 'clipped' });
    C.line(p, traceRows(S), function (r) { return r.t; }, function (r) { return r.g; },
      { role: 'model', series: 'norm', key: 'norm', weight: 1.25, decimate: true, cache: lineCache });
    C.level(p, 'y', s.threshold, { role: 'reader', text: fmt.lam(s.threshold), line: true, series: 'threshold', key: 'threshold' });
    C.handle(p, {
      id: 'threshold', axis: 'y', value: s.threshold, min: X[0], max: X[1], scale: 'log',
      label: 'Clipping threshold', format: fmt.lam, onLine: true, step: KEY_STEP, page: PAGE_STEP,
      onChange: function (v) { fig.set({ threshold: v }, { transient: true }); },
      onSettle: function (v) { fig.set({ threshold: v }); }
    });
    var note = fmt.pct(s.clipped) + (p.phone ? ' clipped' : ' of steps clipped');
    var n = p.head && p.head.querySelector('.panel-note');
    if (!n || n.textContent !== note) p.setNote(note);
    C.place(p, [{ id: 'norm', text: p.phone ? 'norm' : 'unclipped norm', role: 'model', series: 'norm', feature: { type: 'line', of: 'norm' } }], curCtx);
  }

  function drawB(p) {
    var s = cur;
    if (!s) return;
    var C = TP.chart;
    C.bars(p, s.bins, { role: 'model', series: 'histogram', key: function (r) { return r.key; }, gap: 1 });
    var lv = C.level(p, 'x', s.p90, { role: 'model', text: LEVEL_TEXT, line: true, series: 'p90', key: 'p90' }) || {};
    var th = C.level(p, 'x', s.threshold, { role: 'reader', text: fmt.lam(s.threshold), line: true, series: 'threshold', key: 'threshold' }) || {};
    separateNames(p, lv.record, th.record);
    var lvNode = lv.line && (lv.line.node ? lv.line.node() : lv.line);
    if (lvNode && lvNode.parentNode && Math.abs(p.x(s.p90) - p.x(s.threshold)) < 2) lvNode.parentNode.appendChild(lvNode);
    var note = 'mean multiplier ' + fmt.mult(s.mult);
    var n = p.head && p.head.querySelector('.panel-note');
    if (!n || n.textContent !== note) p.setNote(note);
  }

  function draw(state, ctx) {
    if (!pa) build(ctx.fig);
    cur = state;
    curCtx = ctx || { hold: false };
    pa.update();
    pb.update();
  }

  /* ---------- readout, table, quantities ---------- */

  function where(state) {
    var N = CL().steps;
    if (state.below === 0) return 'below every logged norm';
    if (state.below === N) return 'above every logged norm';
    return 'the ' + ordinal(clamp(Math.round(state.percentile), 1, 99)) + ' percentile';
  }
  function readout(state) {
    return 'At a threshold of ' + fmt.lam(state.threshold) + ', ' + where(state) + ', clipping acts on ' + fmt.pct(state.clipped) +
      ' of updates, and the mean multiplier on the gradient is ' + fmt.mult(state.mult) + '.';
  }

  function table(state) {
    var S = seriesOf(state.seed), M = CL(), rows = [];
    var mark = function (lam, text) {
      var st = M.stats(S.ser, lam);
      rows.push({ t: lam, n: null, c: st.clipped, m: st.meanMult, note: text, order: lam });
    };
    S.bins.forEach(function (b) {
      var st = M.stats(S.ser, b.x0);
      rows.push({ t: b.x0, t1: b.x1, n: b.y, c: st.clipped, m: st.meanMult, note: '', order: b.x0 });
    });
    mark(S.median, 'the median norm');
    mark(S.p90, 'the 90th percentile');
    mark(state.threshold, 'the current threshold');
    rows.sort(function (a, b) { return a.order - b.order; });
    return {
      columns: [
        { key: 't', label: 'Threshold', format: fmt.lam },
        { key: 'n', label: 'Steps with a norm from the threshold to the next row\'s bin edge', format: function (v) { return v == null ? '' : fmt.int(v); } },
        { key: 'c', label: 'Fraction of updates clipped', format: fmt.pct },
        { key: 'm', label: 'Mean multiplier on the gradient', format: fmt.mult },
        { key: 'note', label: 'Marked' }
      ],
      rows: rows,
      caption: 'The histogram of the ' + fmt.int(M.steps) + ' logged norms at seed ' + state.seed + ', one row per bin of ' +
        fmt.int(M.BINS_PER_DECADE) + ' per decade, with the fraction of updates clipped and the mean multiplier at each bin\'s lower edge as the threshold, ' +
        'and rows for the median norm, the 90th percentile and the current threshold of ' + fmt.lam(state.threshold)
    };
  }

  function quantities(state) {
    var q = {
      threshold: state.threshold, median: state.median, p90: state.p90, percentile: state.percentile,
      clipped: state.clipped, multiplier: state.mult, spikes: state.nSpikes
    };
    var fixed = CAL.quantities || {};
    ['model', 'seed'].forEach(function (setting) {
      var m = fixed[setting] || {};
      Object.keys(m).forEach(function (name) { if (!(name in q)) q[name] = m[name]; });
    });
    return q;
  }

  function init(element) {
    var X = CAL.domains.a.x;
    fig = TP.fig(element, {
      kind: 'fixed',
      params: {
        threshold: {
          type: 'number', default: CAL.defaults.threshold, domain: X.slice(), scale: 'log',
          encode: function (v) { return String(round4(v)); },
          change: 'cut', ghost: false, label: 'Clipping threshold', control: 'handle', handle: 'a', format: fmt.lam
        }
      },
      seed: CAL.seed,
      presets: { '90th percentile': p90Preset, 'half clipped': halfPreset, 'nearly all clipped': nearlyAllPreset },
      states: CAL.states,
      /* the threshold, whenever it is set, is held to the four significant figures of its URL text */
      constrain: function (next, prev, changed) {
        if (changed.indexOf('threshold') >= 0 && isFinite(next.threshold)) next.threshold = clamp(round4(next.threshold), X[0], X[1]);
        return next;
      },
      prepare: function () { seriesOf(CAL.seed); },
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
