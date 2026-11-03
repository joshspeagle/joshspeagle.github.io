/*
 * p08-overshoot.js: gradient descent on a one-dimensional quadratic (#fig-overshoot), on page 8 #mechanism.
 *
 * One idea: gradient descent on L(theta) = mu theta^2 / 2 multiplies the distance to the minimum by
 * (1 - eta mu) at every step, so it converges when eta < 2 / mu and diverges when eta > 2 / mu. A
 * larger curvature mu has a smaller largest stable step. The curvature is mu (SPEC section 2); the
 * choice keys stay 'narrow' (mu = 4) and 'wide' (mu = 2) for URL and tour compatibility.
 *
 * Exact arithmetic, no noise: theta_{t+1} = (1 - eta mu) theta_t from theta_0 = THETA0.
 *
 * Panels (side by side from 640 px, stacked on a phone):
 *   (a) the quadratic: L against theta, the parabola in the context tone and the iterates joined in
 *       order as a trail (model blue), the start ringed.
 *   (b) theta_t against step t, linear axes: markers joined by a line, the minimum (theta = 0) a
 *       reference level, crosses on the frame's edge for iterates that leave it.
 * Parameters: eta (slider, 0.05 to 0.75 in steps of 0.05) and bowl (segment: wide mu = 2, narrow
 * mu = 4). No presets: the guided tour sets the values (data-params), so the controls stay at two.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};
  var ID = 'fig-overshoot';
  var THETA0 = -2, STEPS = 12, XMAX = 3.2;
  var H = { wide: 2, narrow: 4 };
  var YMAX_A = 0.5 * H.narrow * XMAX * XMAX;

  function f2(v) { return (Math.round(v * 100) / 100).toFixed(2); }
  function sgn(v) { return v < 0 ? '−' + f2(-v) : f2(v); }

  function apply(values) {
    var h = H[values.bowl], eta = values.eta, r = 1 - eta * h, th = THETA0, rows = [];
    for (var t = 0; t <= STEPS; t++) {
      rows.push({ key: 's' + t, t: t, theta: th, loss: 0.5 * h * th * th, inside: Math.abs(th) <= XMAX });
      th = r * th;
    }
    var firstOut = null;
    for (var i = 0; i < rows.length; i++) if (!rows[i].inside) { firstOut = rows[i].t; break; }
    return { eta: eta, bowl: values.bowl, h: h, eh: eta * h, ratio: r, limit: 2 / h, rows: rows, firstOut: firstOut };
  }

  function regime(s) {
    if (Math.abs(s.eh - 2) < 1e-9) return 'edge';
    if (s.eh > 2) return 'diverge';
    if (s.eh > 1 + 1e-9) return 'zigzag';
    return 'smooth';
  }

  var pa = null, pb = null, cur = null, curCtx = { hold: false };
  function C() { return TP.chart; }
  function margin(w, phone) { return phone ? { t: 8, r: 12, b: 38, l: 44 } : { t: 10, r: 16, b: 42, l: 50 }; }

  function build(f) {
    pa = C().panel(f.panels, {
      key: 'a', letter: '(a)', describe: 'loss against the weight, with the steps of gradient descent',
      note: ' ',
      xDomain: [-XMAX, XMAX], yDomain: [0, YMAX_A],
      xLabel: 'weight θ', yLabel: 'loss',
      xTicks: [-3, -2, -1, 0, 1, 2, 3], yTicks: function (d, px) { return px < 140 ? [0, 10, 20] : [0, 5, 10, 15, 20]; },
      grid: 'y',
      aspect: function (w, phone) { return phone ? 200 / Math.max(w, 1) : 0.72; },
      maxHeight: function (w, phone) { return phone ? 200 : 290; },
      margin: margin
    });
    pb = C().panel(f.panels, {
      key: 'b', letter: '(b)', describe: 'the weight against step',
      note: ' ',
      xDomain: [0, STEPS], yDomain: [-XMAX, XMAX],
      xLabel: 'step', yLabel: 'weight θ',
      xTicks: [0, 2, 4, 6, 8, 10, 12], yTicks: [-3, -2, -1, 0, 1, 2, 3],
      grid: 'y',
      aspect: function (w, phone) { return phone ? 200 / Math.max(w, 1) : 0.72; },
      maxHeight: function (w, phone) { return phone ? 200 : 290; },
      margin: margin
    });
    pa.update(drawA);
    pb.update(drawB);
  }

  function setNoteOnce(p, text) {
    var n = p.head && p.head.querySelector('.panel-note');
    if (!n || n.textContent !== text) p.setNote(text);
  }

  function drawA(p) {
    var s = cur;
    if (!s) return;
    var c = C(), bowl = [];
    for (var k = 0; k <= 160; k++) {
      var x = -XMAX + 2 * XMAX * k / 160;
      bowl.push({ x: x, y: 0.5 * s.h * x * x });
    }
    c.line(p, bowl, function (d) { return d.x; }, function (d) { return d.y; }, { role: 'context', series: 'bowl', key: 'bowl' });
    /* the iterates in order; the trail is clipped at the frame, so a run that leaves shows the
       first step out as a segment to the edge */
    var pts = [];
    for (var i = 0; i < s.rows.length; i++) {
      var r = s.rows[i];
      pts.push([r.theta, r.loss]);
      if (!r.inside) break;
    }
    c.trail(p, pts, { role: 'model', series: 'steps', key: 'steps', head: false });
    var inside = s.rows.filter(function (r) { return r.inside; });
    c.markers(p, inside, function (r) { return r.theta; }, function (r) { return r.loss; }, { role: 'model', series: 'steps', key: function (r) { return r.key; } });
    c.ring(p, s.rows[0].theta, s.rows[0].loss, { role: 'model', series: 'steps', key: 'start' });
    setNoteOnce(p, 'ημ = ' + f2(s.eh) + (p.phone ? '' : ', stable for η < 2/μ = ' + f2(s.limit)));
    c.place(p, [
      { id: 'bowl', text: p.phone ? 'loss' : 'loss ½μθ²', role: 'context', series: 'bowl', feature: { type: 'line', of: 'bowl' } },
      { id: 'start', text: 'start', role: 'model', series: 'steps', feature: { type: 'point', x: s.rows[0].theta, y: s.rows[0].loss, r: 10 } }
    ], curCtx);
  }

  function drawB(p) {
    var s = cur;
    if (!s) return;
    var c = C();
    c.ref(p, { y: 0 }, { kind: 'level', role: 'ref', series: 'min', key: 'min' });
    var shown = [];
    for (var i = 0; i < s.rows.length; i++) { shown.push(s.rows[i]); if (!s.rows[i].inside) break; }
    c.line(p, shown, function (r) { return r.t; }, function (r) { return r.theta; }, { role: 'model', series: 'theta', key: 'theta', weight: 2 });
    c.markers(p, shown.filter(function (r) { return r.inside; }), function (r) { return r.t; }, function (r) { return r.theta; },
      { role: 'model', series: 'theta', key: function (r) { return 'm' + r.key; } });
    var out = shown.filter(function (r) { return !r.inside; });
    var up = out.filter(function (r) { return r.theta > 0; }), down = out.filter(function (r) { return r.theta < 0; });
    if (up.length) c.cross(p, up, function (r) { return r.t; }, function () { return null; }, { role: 'model', series: 'theta', key: 'out-up', edge: 'top' });
    if (down.length) c.cross(p, down, function (r) { return r.t; }, function () { return null; }, { role: 'model', series: 'theta', key: 'out-down', edge: 'bottom' });
    setNoteOnce(p, 'each step multiplies θ by 1 − ημ = ' + sgn(s.ratio));
    c.place(p, [], curCtx);
  }

  function draw(state, ctx) {
    if (!pa) build(ctx.fig);
    cur = state;
    curCtx = ctx || { hold: false };
    pa.update();
    pb.update();
  }

  function readout(s) {
    var head = 'At η = ' + f2(s.eta) + ' with curvature μ = ' + s.h + ', ημ = ' + f2(s.eh) + ' and each step multiplies the distance to the minimum by ' + sgn(s.ratio) + '. ';
    switch (regime(s)) {
      case 'smooth': return head + 'The weight approaches the minimum from one side without crossing it.';
      case 'zigzag': return head + 'The weight crosses to the other side of the minimum on each step, and each iterate is closer to the minimum than the last.';
      case 'edge': return head + 'The weight alternates between −2 and 2 indefinitely, neither converging nor diverging.';
      default: return head + 'Each iterate is farther from the minimum than the last, and the weight leaves the frame at step ' + s.firstOut + '. The largest stable learning rate at this curvature is 2/μ = ' + f2(s.limit) + '.';
    }
  }

  function table(s) {
    return {
      columns: [
        { key: 't', label: 'Step' },
        { key: 'theta', label: 'Weight θ', format: function (v) { return Math.abs(v) < 1e4 ? sgn(v) : v.toExponential(2); } },
        { key: 'loss', label: 'Loss', format: function (v) { return v < 1e4 ? f2(v) : v.toExponential(2); } }
      ],
      rows: s.rows,
      caption: 'Gradient descent from θ = ' + THETA0 + ' at η = ' + f2(s.eta) + ' with curvature μ = ' + s.h
    };
  }

  function quantities(s) {
    return { eta: s.eta, h: s.h, eh: s.eh, ratio: s.ratio, limit: s.limit, 'first-out': s.firstOut };
  }

  function init(el) {
    TP.fig(el, {
      kind: 'fixed',
      params: {
        eta: {
          type: 'number', default: 0.2, domain: [0.05, 0.75], snap: 0.05, change: 'cut', ghost: false,
          control: 'slider', label: 'Learning rate η', format: f2,
          ticks: function (v) { var h = H[v.bowl || 'narrow']; return [{ value: 2 / h, text: '2/μ' }]; }
        },
        bowl: {
          type: 'choice', default: 'narrow', domain: ['narrow', 'wide'], change: 'cut', ghost: false,
          control: 'segment', label: 'Curvature', labels: { narrow: 'μ = 4', wide: 'μ = 2' }
        }
      },
      apply: apply,
      draw: draw,
      readout: readout,
      table: table,
      quantities: quantities
    });
  }

  document.addEventListener('tp:ready', function () {
    var el = document.getElementById(ID);
    if (el && TP.fig && TP.chart) init(el);
  });
})();
