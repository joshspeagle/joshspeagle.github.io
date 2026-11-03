/*
 * p02-gd-step.js: "One learning rate, two curvatures" (#fig-gd-step) on page 2, section #update-step.
 *
 * The stepping stone before F2.1. Plain gradient descent on the valley
 *   l(theta) = 1/2 (20 theta_1^2 + theta_2^2),
 * the same loss as F2.1 at loss scale 1 (A1 = 20, A2 = 1), from the same start (-4, 3.5). Each
 * coordinate evolves on its own, theta_i,t = (1 - eta mu_i)^t theta_i,0 with mu = (20, 1), so the
 * figure is closed-form and needs no runtime.
 *
 *   (a) the contours and the path of the first PATH_STEPS steps at the chosen eta, clipped where a
 *       diverging path leaves the frame.
 *   (b) the per-step factor |1 - eta mu_i| against eta (log axis) for the steep coordinate (role
 *       'data') and the floor coordinate (role 'fifth'), the "no change" level at 1, the bound
 *       2 / sharpness = 0.1 as a named limit with the diverging region tinted, and the chosen eta
 *       as a reader line with markers on both curves. The learning rate is a handle on (b) and a
 *       docked slider (one parameter, two controls sharing a state).
 *
 * The caption's numbers are filled from the default state into span[data-p02="gd:*"]. The page's
 * prose quotes the same numbers; they are computed here, not typed.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};
  var ID = 'fig-gd-step';
  var MU = [20, 1];
  var START = [-4, 3.5];
  var TARGET = 0.01;            // the target loss of F2.1 at loss scale 1
  var PATH_STEPS = 60;
  var X_DOM = [-5, 5], Y_DOM = [-4, 4];
  var LR_DOM = [0.001, 0.2];
  var DEFAULT_LR = 0.091;

  /* E24 learning rates from 0.001 to 0.2, as F2.1 uses */
  var RATES = (function () {
    var e24 = [1, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2, 2.2, 2.4, 2.7, 3, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
    var out = [];
    [0.001, 0.01, 0.1].forEach(function (d) { e24.forEach(function (m) { var v = +(m * d).toPrecision(2); if (v >= LR_DOM[0] - 1e-12 && v <= LR_DOM[1] + 1e-12) out.push(v); }); });
    out.push(0.05);   // the rate that removes the steep coordinate in one step
    out.sort(function (a, b) { return a - b; });
    return out;
  })();

  function fmt2(v) { return TP.fmt && TP.fmt.byName ? TP.fmt.byName('sig2')(v) : String(+v.toPrecision(2)); }
  function factor(eta, mu) { return 1 - eta * mu; }
  function lossAt(th) { return 0.5 * (MU[0] * th[0] * th[0] + MU[1] * th[1] * th[1]); }
  function bound() { return 2 / Math.max(MU[0], MU[1]); }

  /** Steps until the loss is below TARGET, or null when the run diverges or does not get there in
      100,000 steps. With both factors below 1 in size, each squared coordinate falls every step, so
      the first crossing is the last. */
  function stepsToTarget(eta) {
    var r1 = factor(eta, MU[0]), r2 = factor(eta, MU[1]);
    if (Math.abs(r1) >= 1 || Math.abs(r2) >= 1) return null;
    var th = START.slice();
    for (var t = 1; t <= 100000; t++) {
      th = [th[0] * r1, th[1] * r2];
      if (lossAt(th) < TARGET) return t;
    }
    return null;
  }
  function path(eta) {
    var r1 = factor(eta, MU[0]), r2 = factor(eta, MU[1]), out = [START.slice()], th = START.slice();
    for (var t = 1; t <= PATH_STEPS; t++) {
      th = [th[0] * r1, th[1] * r2];
      out.push(th.slice());
      if (Math.abs(th[0]) > 40 || Math.abs(th[1]) > 40) break;
    }
    return out;
  }
  function inFrame(q) { return q[0] >= X_DOM[0] && q[0] <= X_DOM[1] && q[1] >= Y_DOM[0] && q[1] <= Y_DOM[1]; }
  function exitPoint(a, b) {
    var t = 1;
    if (b[0] > X_DOM[1]) t = Math.min(t, (X_DOM[1] - a[0]) / (b[0] - a[0]));
    if (b[0] < X_DOM[0]) t = Math.min(t, (X_DOM[0] - a[0]) / (b[0] - a[0]));
    if (b[1] > Y_DOM[1]) t = Math.min(t, (Y_DOM[1] - a[1]) / (b[1] - a[1]));
    if (b[1] < Y_DOM[0]) t = Math.min(t, (Y_DOM[0] - a[1]) / (b[1] - a[1]));
    return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  }
  /** The path up to where it first leaves the frame, with the exit point; and whether it left. */
  function clipped(pts) {
    var out = [pts[0]];
    for (var i = 1; i < pts.length; i++) {
      if (inFrame(pts[i])) { out.push(pts[i]); continue; }
      out.push(exitPoint(pts[i - 1], pts[i]));
      return { pts: out, left: true };
    }
    return { pts: out, left: false };
  }

  function apply(values) {
    var eta = values.lr, r1 = factor(eta, MU[0]), r2 = factor(eta, MU[1]);
    var p = path(eta), c = clipped(p);
    return {
      lr: eta, r1: r1, r2: r2, steps: stepsToTarget(eta), diverges: Math.abs(r1) >= 1,
      path: c.pts, left: c.left, shown: Math.min(p.length - 1, PATH_STEPS),
      rows: [{ key: 'steep', mu: MU[0], r: r1 }, { key: 'floor', mu: MU[1], r: r2 }]
    };
  }

  /* ---------- drawing ---------- */
  var C = function () { return TP.chart; };
  var fig = null, pa = null, pb = null, cur = null;
  var SAMPLES = (function () {
    var out = [], lo = Math.log10(LR_DOM[0]), hi = Math.log10(LR_DOM[1]);
    for (var i = 0; i <= 240; i++) out.push(Math.pow(10, lo + (hi - lo) * i / 240));
    out.push(0.05); out.push(0.1);
    out.sort(function (a, b) { return a - b; });
    return out;
  })();
  var YMAX = 2;

  function contours() {
    var S = lossAt(START), rings = [];
    for (var k = 0; k < 12; k++) {
      var f = Math.pow(4, -k), a1 = Math.sqrt(2 * f * S / MU[0]), a2 = Math.sqrt(2 * f * S / MU[1]);
      if (a1 < 0.03) break;
      var pts = [];
      for (var i = 0; i <= 120; i++) { var s = 2 * Math.PI * i / 120; pts.push([a1 * Math.cos(s), a2 * Math.sin(s)]); }
      rings.push(pts);
    }
    return rings;
  }
  var RINGS = null;
  function drawContours(p) {
    var key = [p.width, p.height].join('x'), grid = p.layers.grid;
    if (p._p02Key === key && !grid.select('g.contours path').empty()) return;
    p._p02Key = key;
    grid.selectAll('g.contours').remove();
    var g = grid.append('g').attr('class', 'contours').attr('clip-path', p.layers.bands.attr('clip-path'));
    (RINGS = RINGS || contours()).forEach(function (ring) {
      var d = '';
      ring.forEach(function (q, i) { d += (i ? 'L' : 'M') + p.x(q[0]).toFixed(1) + ',' + p.y(q[1]).toFixed(1); });
      g.append('path').attr('class', 'structure contour').attr('d', d + 'Z');
    });
  }

  function panelAOpts() {
    return {
      letter: '(a)', describe: 'the path of gradient descent on the valley',
      xDomain: X_DOM, yDomain: Y_DOM, xLabel: 'θ₁ (across the valley)', yLabel: 'θ₂ (along the floor)',
      xTicks: [-4, -2, 0, 2, 4], yTicks: [-4, -2, 0, 2, 4], grid: 'none',
      plotAspect: (Y_DOM[1] - Y_DOM[0]) / (X_DOM[1] - X_DOM[0]),
      margin: function (w, phone) { return phone ? { t: 8, r: 10, b: 42, l: 42 } : { t: 10, r: 12, b: 44, l: 46 }; },
      maxHeight: function (w, phone) { return phone ? 250 : 300; }
    };
  }
  function panelBOpts() {
    return {
      letter: '(b)', describe: 'per-step factor of each coordinate against learning rate',
      xLog: 10, xDomain: LR_DOM, yDomain: [0, YMAX],
      xLabel: 'learning rate η', yLabel: 'factor per step',
      xTicks: [0.001, 0.01, 0.1], yTicks: [0.5, 1, 1.5, 2],
      xFormat: function (v) { return String(v); }, yFormat: function (v) { return String(v); },
      margin: function (w, phone) { return phone ? { t: 8, r: 10, b: 42, l: 40 } : { t: 10, r: 14, b: 44, l: 50 }; },
      aspect: function (w, phone) { return phone ? 0.68 : 0.8; },
      maxHeight: function (w, phone) { return phone ? 250 : 300; }
    };
  }

  function drawA(p, ctx) {
    drawContours(p);
    var s = cur;
    if (!s) return;
    C().markers(p, [[0, 0]], function (q) { return q[0]; }, function (q) { return q[1]; }, { role: 'ref', series: 'min', shape: 'diamond', fill: 'open', key: 'min' });
    C().trail(p, s.path, { role: 'model', series: 'path', key: 'path', head: false });
    var steps = s.path.slice(1, s.left ? s.path.length - 1 : s.path.length);
    if (steps.length) C().markers(p, steps, function (q) { return q[0]; }, function (q) { return q[1]; }, { role: 'model', series: 'path', size: 3, key: function (d, i) { return 'st' + i; } });
    C().markers(p, [START], function (q) { return q[0]; }, function (q) { return q[1]; }, { role: 'model', series: 'start', key: 'start' });
    var items = [
      { id: 'start', text: 'start', role: 'model', series: 'start', feature: { type: 'point', x: START[0], y: START[1], r: 6 } },
      { id: 'min', text: 'minimum', role: 'ref', series: 'min', feature: { type: 'point', x: 0, y: 0, r: 6 }, phone: { text: 'min' } }
    ];
    if (s.left) {
      var e = s.path[s.path.length - 1];
      C().cross(p, [e], function (q) { return q[0]; }, function (q) { return q[1]; }, { role: 'model', series: 'exit', key: 'exit' });
      items.push({ id: 'exit', text: 'diverges', role: 'model', series: 'exit', feature: { type: 'point', x: e[0], y: e[1], r: 6 } });
    }
    C().place(p, items, ctx || {});
  }

  function drawB(p, ctx) {
    var s = cur;
    var b = bound();
    C().band(p, b, LR_DOM[1], { role: 'data', id: 'div' });
    C().ref(p, { y: 1 }, { kind: 'level', series: 'one', key: 'one' });
    C().ref(p, { x: b }, { kind: 'limit', series: 'bound', key: 'bound' });
    var steepRows = SAMPLES.filter(function (eta) { return Math.abs(factor(eta, MU[0])) <= YMAX; });
    var steep = function (eta) { return Math.abs(factor(eta, MU[0])); };
    var floor = function (eta) { return Math.abs(factor(eta, MU[1])); };
    C().line(p, steepRows, function (v) { return v; }, steep, { role: 'data', series: 'steep', key: 'steep' });
    C().line(p, SAMPLES, function (v) { return v; }, floor, { role: 'fifth', series: 'floor', key: 'floor' });
    var items = [
      { id: 'steep', text: p.phone ? 'across, μ₁ = 20' : 'across the valley, μ₁ = 20', role: 'data', series: 'steep', feature: { type: 'line', of: 'steep' } },
    ];
    /* fixed annotations: the floor curve's name above its left end, and the diverging region's
       name written up its tint (the placer finds no free slot for them beside the level at 1) */
    p.g.selectAll('g.p02-ann').remove();
    var ann = p.g.append('g').attr('class', 'p02-ann');
    ann.append('text').attr('class', 'p02-ann-floor').attr('x', p.x(0.0012)).attr('y', p.y(1) - 8)
      .text('along the floor, μ₂ = 1');
    ann.append('text').attr('class', 'p02-ann-div').attr('transform', 'translate(' + (p.x(0.2) - 6) + ',' + p.y(0.06) + ') rotate(-90)')
      .text('diverges');
    if (s) {
      C().level(p, 'x', s.lr, { role: 'reader', text: fmt2(s.lr), line: true, series: 'lr' });
      if (steep(s.lr) <= YMAX) C().markers(p, [s.lr], function (v) { return v; }, steep, { role: 'data', series: 'steep', key: 'at-steep' });
      C().markers(p, [s.lr], function (v) { return v; }, floor, { role: 'fifth', series: 'floor', key: 'at-floor' });
      C().handle(p, {
        id: 'lr', axis: 'x', value: s.lr, snap: RATES, scale: 'log', min: LR_DOM[0], max: LR_DOM[1],
        label: 'Learning rate', onLine: true, format: function (v) { return 'η = ' + fmt2(v); },
        onChange: function (v) { fig.set({ lr: v }, { transient: true }); },
        onSettle: function (v) { fig.set({ lr: v }); }
      });
    }
    C().place(p, items, ctx || {});
  }

  function draw(state, ctx) {
    if (!pa) {
      pa = C().panel(ctx.fig.panels, panelAOpts());
      pb = C().panel(ctx.fig.panels, panelBOpts());
    }
    cur = state;
    pa.update(function (p) { drawA(p, ctx); });
    pb.update(function (p) { drawB(p, ctx); });
  }

  function signed(v) { return (v < 0 ? '−' : '') + Math.abs(v).toFixed(2); }
  function readout(s) {
    var head = 'At η = ' + fmt2(s.lr) + ' each step multiplies θ₁ by ' + signed(s.r1) + ' and θ₂ by ' + signed(s.r2);
    if (s.diverges) return head + ', so θ₁ grows and the run diverges.';
    if (s.steps == null) return head + ', and the loss does not reach ' + TARGET + ' within 100,000 steps.';
    return head + ', and the loss falls below ' + TARGET + ' after ' + TP.fmt.int(s.steps) + ' steps.';
  }
  function table(s) {
    return {
      columns: [
        { key: 'name', label: 'Coordinate' },
        { key: 'mu', label: 'Curvature μ' },
        { key: 'r', label: 'Factor per step, 1 − ημ', format: signed }
      ],
      rows: [
        { key: 'steep', name: 'θ₁ (across the valley)', mu: MU[0], r: s.r1 },
        { key: 'floor', name: 'θ₂ (along the floor)', mu: MU[1], r: s.r2 }
      ],
      caption: 'Per-step factors at learning rate ' + fmt2(s.lr) + (s.steps != null ? '; steps to loss ' + TARGET + ': ' + s.steps : '; the run diverges')
    };
  }
  function quantities(s) {
    return { lr: s.lr, r1: s.r1, r2: s.r2, steps: s.steps, bound: bound() };
  }

  /* fill the caption's numbers from the default state */
  function fillCaption() {
    var s = apply({ lr: DEFAULT_LR });
    var set = function (k, v) { document.querySelectorAll('[data-p02="gd:' + k + '"]').forEach(function (n) { n.textContent = v; }); };
    set('lr', fmt2(s.lr));
    set('r1', Math.abs(s.r1).toFixed(2));
    set('r2', Math.abs(s.r2).toFixed(2));
    set('steps', String(s.steps));
  }

  function init(el) {
    fig = TP.fig(el, {
      kind: 'fixed',
      params: {
        lr: {
          type: 'number', default: DEFAULT_LR, domain: LR_DOM, snap: RATES.slice(), scale: 'log',
          change: 'cut', ghost: false, control: 'slider', handle: 'b', dock: true, label: 'Learning rate η',
          format: fmt2, encode: function (v) { return String(v); }
        }
      },
      docked: ['reset'],
      apply: apply, draw: draw, readout: readout, table: table, quantities: quantities
    });
    fillCaption();
  }

  document.addEventListener('tp:ready', function () {
    var el = document.getElementById(ID);
    if (el) init(el);
  });
})();
