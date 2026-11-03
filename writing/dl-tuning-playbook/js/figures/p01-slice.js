/*
 * p01-slice.js: the fixed-learning-rate comparison on page 1 (#fig-slice), the stepping stone
 * before the three roles. One idea: which of two models looks better at a learning rate held fixed
 * for both depends on that learning rate, and comparing each model at its own best learning rate
 * gives the answer the experiment asks for.
 *
 * The toy (deterministic, no noise): two parabolas in x = log10(learning rate),
 *   L(x) = L* + C (x - x*)^2,  C = 0.05 per squared decade,
 *   four layers: L* = 0.250 at x* = -2.5;  six layers: L* = 0.235 at x* = -3.3.
 * The rankings cross at x = -2.7125 (about 1.9e-3). The page's prose and tour quote these numbers.
 *
 * Parameters: lr (the fixed learning rate, a handle on the axis, log scale, snapped to 0.05 decade)
 * and fair (a checkbox, "each at its best", which marks each curve's minimum). No seed, no presets:
 * the guided tour sets values through data-params.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};
  var ID = 'fig-slice';
  var C_ = 0.05;
  var MODELS = [
    { id: 'four', name: '4 layers (current)', short: '4 layers', role: 'third', Ls: 0.250, xs: -2.5 },
    { id: 'six', name: '6 layers (candidate)', short: '6 layers', role: 'model', Ls: 0.235, xs: -3.3 }
  ];
  var XLO = -5, XHI = -1, YLO = 0.2, YHI = 0.42;
  var SNAP = (function () { var s = []; for (var k = 0; k <= 80; k++) s.push(Math.pow(10, XLO + k * 0.05)); return s; })();
  var DEFAULT_LR = Math.pow(10, -2.5);

  function loss(m, x) { return m.Ls + C_ * (x - m.xs) * (x - m.xs); }
  function lg(v) { return Math.log(v) / Math.LN10; }
  var f3 = function (v) { return v.toFixed(3); };
  function fmtLr(v) {
    var e = lg(v), k = Math.floor(e + 1e-9), m = Math.pow(10, e - k);
    var mm = Math.round(m * 10) / 10;
    if (mm >= 10) { mm = 1; k += 1; }
    var sup = String(k).replace('-', '⁻').replace(/\d/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'.charAt(+d); });
    return (mm === 1 ? '' : (mm % 1 === 0 ? mm.toFixed(0) : mm.toFixed(1)) + ' × ') + '10' + sup;
  }

  function apply(values) {
    var x = lg(values.lr);
    var at = MODELS.map(function (m) { return loss(m, x); });
    return {
      lr: values.lr, x: x, fair: values.fair,
      at: at,
      curves: MODELS.map(function (m) {
        var rows = [];
        for (var i = 0; i <= 80; i++) { var xx = XLO + i * 0.05; rows.push({ key: m.id + i, x: xx, y: loss(m, xx) }); }
        return rows;
      })
    };
  }

  var fig = null, pa = null, cur = null, curCtx = { hold: false };

  function drawA(p) {
    var s = cur, C = TP.chart;
    if (!s) return;
    var X = function (r) { return Math.pow(10, r.x); }, Y = function (r) { return Math.min(r.y, YHI + 0.05); };
    MODELS.forEach(function (m, i) {
      C.line(p, s.curves[i], X, Y, { role: m.role, series: m.id, key: 'curve-' + m.id });
    });
    /* the fixed learning rate and what each model scores there */
    C.level(p, 'x', s.lr, { role: 'reader', text: fmtLr(s.lr), line: true, series: 'fixed', key: 'fixed' });
    MODELS.forEach(function (m, i) {
      C.markers(p, [{ key: 'at-' + m.id, x: s.x, y: s.at[i] }], X, function (r) { return r.y; },
        { role: m.role, series: m.id, fill: 'open', size: 7 });
    });
    var items = MODELS.map(function (m, i) {
      /* each curve is named near its left end, where the two curves are far apart */
      var xl = m.id === 'four' ? -4.1 : -1.75;
      return { id: 'name-' + m.id, text: m.short, role: m.role, series: m.id,
        feature: { type: 'point', x: Math.pow(10, xl), y: loss(m, xl), r: 2 } };
    });
    if (s.fair) {
      MODELS.forEach(function (m) {
        C.markers(p, [{ key: 'best-' + m.id, x: m.xs, y: m.Ls }], X, function (r) { return r.y; }, { role: m.role, series: m.id, size: 7 });
        C.level(p, 'y', m.Ls, { role: m.role, text: f3(m.Ls), series: 'best-' + m.id, key: 'lvl-' + m.id });
      });
    } else {
      MODELS.forEach(function (m, i) {
        C.level(p, 'y', s.at[i], { role: m.role, text: f3(s.at[i]), series: 'at-' + m.id, key: 'lvl-' + m.id });
      });
    }
    C.handle(p, {
      id: 'lr', axis: 'x', value: s.lr, snap: SNAP, min: SNAP[0], max: SNAP[SNAP.length - 1], scale: 'log',
      label: 'Fixed learning rate', format: fmtLr, onLine: true,
      onChange: function (v) { fig.set({ lr: v }, { transient: true }); },
      onSettle: function (v) { fig.set({ lr: v }); }
    });
    C.place(p, items, curCtx);
  }

  function build(f) {
    pa = TP.chart.panel(f.panels, {
      describe: 'validation error against learning rate for two depths',
      xLog: 10, xDomain: [Math.pow(10, XLO), Math.pow(10, XHI)], yDomain: [0.18, YHI],
      xLabel: 'learning rate (log scale)', yLabel: 'validation error',
      xTicks: [1e-5, 1e-4, 1e-3, 1e-2, 1e-1], xFormat: function (v) { return TP.fmt.exp10(Math.round(lg(v))); },
      yTicks: [0.2, 0.25, 0.3, 0.35, 0.4], yFormat: function (v) { return v.toFixed(2); },
      grid: 'y',
      aspect: function (w, phone) { return phone ? 0.78 : 0.42; },
      maxHeight: function (w, phone) { return phone ? 280 : 310; },
      margin: function (w, phone) { return phone ? { t: 10, r: 14, b: 44, l: 60 } : { t: 12, r: 24, b: 44, l: 68 }; }
    });
    pa.update(drawA);
  }

  function draw(state, ctx) {
    if (!pa) build(ctx.fig);
    cur = state;
    curCtx = ctx || { hold: false };
    pa.update();
  }

  function readout(s) {
    var a = s.at[0], b = s.at[1];
    var lead = a < b ? 'four layers look better' : a > b ? 'six layers look better' : 'the two tie';
    var t = 'At a fixed learning rate of ' + fmtLr(s.lr) + ', four layers score ' + f3(a) + ' and six layers ' + f3(b) + ', so ' + lead + '.';
    if (s.fair) t += ' Each at its own best, six layers reach 0.235 and four layers 0.250.';
    return t;
  }

  function table(s) {
    var rows = [];
    for (var e = XLO; e <= XHI; e += 0.5) rows.push({ lr: Math.pow(10, e), a: loss(MODELS[0], e), b: loss(MODELS[1], e) });
    return {
      columns: [
        { key: 'lr', label: 'Learning rate', format: fmtLr },
        { key: 'a', label: 'Validation error, 4 layers', format: f3 },
        { key: 'b', label: 'Validation error, 6 layers', format: f3 }
      ],
      rows: rows,
      caption: 'The two toy curves every half decade. Four layers are lowest at 3.2 × 10⁻³ (0.250), six layers at 5 × 10⁻⁴ (0.235).'
    };
  }

  function quantities(s) {
    return { lr: s.lr, 'four-at': s.at[0], 'six-at': s.at[1], 'four-best': 0.25, 'six-best': 0.235, crossover: Math.pow(10, -2.7125) };
  }

  document.addEventListener('tp:ready', function () {
    var el = document.getElementById(ID);
    if (!el || !TP.fig || !TP.chart) return;
    fig = TP.fig(el, {
      kind: 'fixed',
      params: {
        lr: { type: 'number', default: DEFAULT_LR, domain: [SNAP[0], SNAP[SNAP.length - 1]], snap: SNAP, scale: 'log',
          change: 'transition', ghost: false, label: 'Fixed learning rate', control: 'handle', handle: 'a', format: fmtLr },
        fair: { type: 'bool', default: false, change: 'cut', label: 'Also show each model at its own best learning rate', control: 'check', dock: false }
      },
      apply: apply,
      draw: draw,
      readout: readout,
      table: table,
      quantities: quantities
    });
  });
})();
