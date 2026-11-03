/*
 * p02-schematics.js: the computed static schematics of page 2 (02-starting-a-project.html).
 *
 *   #fig-arch-family  An architecture is a family of models: a 3 x 3 grid of block-stack glyphs
 *                     (depth 4, 8, 16 blocks against width 64, 128, 256 channels; illustrative),
 *                     the small starting member marked, an arrow toward the larger members, and a
 *                     brace naming the whole grid as the architecture choice.
 *   #fig-three-rules  The first N steps of SGD, momentum and Adam on the valley
 *                     l = 1/2 (20 theta_1^2 + theta_2^2) from (-4, 3.5), computed with the update
 *                     rules as the Playbook's appendix writes them, and under each path two strips
 *                     of the per-step updates Delta theta_1 and Delta theta_2 on one shared signed
 *                     log scale (so that the two strips and the three rules compare directly).
 *                     The caption's numbers (settings and remaining losses) are written into
 *                     span[data-p02="rules:*"] from the computation.
 *
 * Both draw with CSS custom properties through classes in css/pages/02-starting-a-project.css, so
 * the light and dark themes need no redraw. Pure SVG, no TP.fig: these figures are static.
 */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  function mk(tag, attrs, parent, text) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ====================== #fig-arch-family ====================== */
  function drawFamily() {
    var svg = document.querySelector('#fig-arch-family svg.p02-family');
    if (!svg) return;
    svg.setAttribute('viewBox', '0 0 600 372');
    var g = svg.querySelector('g.p02-family-grid');
    while (g.firstChild) g.removeChild(g.firstChild);
    var defs = mk('defs', {}, g);
    var mrk = mk('marker', { id: 'p02-arrowhead', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    mk('path', { d: 'M0 1L9 5L0 9z', class: 'p02-svg-arrowhead' }, mrk);
    var depths = [4, 8, 16], widths = [64, 128, 256];
    var colX = [190, 300, 430], barLen = [44, 72, 112];
    var BH = 4.2, GAP = 1.6;
    /* row 1, then a 38-px lane for the labels and the arrow, then rows 2 and 3 */
    var rowTop = [58, 162, 228], rowH = [36, 56, 100];
    mk('text', { x: 310, y: 20, class: 'p02-svg-axis', 'text-anchor': 'middle' }, g, 'width (channels per layer) →');
    widths.forEach(function (w, j) { mk('text', { x: colX[j], y: 44, class: 'p02-svg-tick', 'text-anchor': 'middle' }, g, String(w)); });
    mk('text', { x: 14, y: 44, class: 'p02-svg-axis' }, g, 'depth ↓');
    depths.forEach(function (d, i) { mk('text', { x: 14, y: rowTop[i] + rowH[i] / 2 + 5, class: 'p02-svg-tick' }, g, d + ' blocks'); });
    depths.forEach(function (d, i) {
      widths.forEach(function (w, j) {
        var h = d * BH + (d - 1) * GAP, top = rowTop[i] + (rowH[i] - h) / 2, L = barLen[j];
        var cell = mk('g', { class: 'p02-cell' + (i === 0 && j === 0 ? ' is-start' : '') }, g);
        for (var k = 0; k < d; k++) mk('rect', { x: colX[j] - L / 2, y: top + k * (BH + GAP), width: L, height: BH, rx: 1, class: 'p02-blk' }, cell);
      });
    });
    var sx = colX[0] - barLen[0] / 2 - 9, sy = rowTop[0] - 7, sw = barLen[0] + 18, sh = rowH[0] + 14;
    mk('rect', { x: sx, y: sy, width: sw, height: sh, rx: 5, class: 'p02-start-ring' }, g);
    mk('text', { x: sx, y: sy + sh + 17, class: 'p02-svg-note p02-svg-accent' }, g, 'start here');
    var laneY = 146, xr = colX[2] + barLen[2] / 2 + 34, y3 = rowTop[2] + rowH[2] / 2;
    mk('path', { d: 'M ' + (sx + sw) + ' ' + laneY + ' H ' + xr + ' V ' + y3 + ' H ' + (colX[2] + barLen[2] / 2 + 8), class: 'p02-svg-arrow', 'marker-end': 'url(#p02-arrowhead)' }, g);
    mk('text', { x: xr - 6, y: laneY - 7, class: 'p02-svg-note', 'text-anchor': 'end' }, g, 'later rounds compare larger members');
    var bx0 = colX[0] - barLen[0] / 2 - 14, bx1 = colX[2] + barLen[2] / 2 + 8, by = 336;
    mk('path', { d: 'M ' + bx0 + ' ' + by + ' v 8 H ' + bx1 + ' v -8', class: 'p02-svg-brace' }, g);
    mk('text', { x: (bx0 + bx1) / 2, y: by + 26, class: 'p02-svg-axis', 'text-anchor': 'middle' }, g, 'choosing the architecture fixes this whole family');
  }

  /* ====================== #fig-three-rules ====================== */
  var START = [-4, 3.5], MU = [20, 1], N = 16;
  var SETTINGS = {
    sgd: { lr: 0.09 },
    momentum: { lr: 0.04, gamma: 0.6 },
    adam: { lr: 0.3, beta1: 0.9, beta2: 0.999, eps: 1e-8 }
  };
  function grad(th) { return [MU[0] * th[0], MU[1] * th[1]]; }
  function loss(th) { return 0.5 * (MU[0] * th[0] * th[0] + MU[1] * th[1] * th[1]); }
  /** The first n steps of a rule, as written in the Playbook's appendix, with a constant rate. */
  function runRule(rule, hp, n) {
    var th = START.slice(), v = [0, 0], m = [0, 0], s = [0, 0], pts = [th.slice()], deltas = [];
    for (var t = 0; t < n; t++) {
      var g = grad(th), d;
      if (rule === 'sgd') d = [-hp.lr * g[0], -hp.lr * g[1]];
      else if (rule === 'momentum') {
        v = [hp.gamma * v[0] + g[0], hp.gamma * v[1] + g[1]];
        d = [-hp.lr * v[0], -hp.lr * v[1]];
      } else {
        m = [hp.beta1 * m[0] + (1 - hp.beta1) * g[0], hp.beta1 * m[1] + (1 - hp.beta1) * g[1]];
        s = [hp.beta2 * s[0] + (1 - hp.beta2) * g[0] * g[0], hp.beta2 * s[1] + (1 - hp.beta2) * g[1] * g[1]];
        var b = Math.sqrt(1 - Math.pow(hp.beta2, t + 1)) / (1 - Math.pow(hp.beta1, t + 1));
        d = [-hp.lr * b * m[0] / (Math.sqrt(s[0]) + hp.eps), -hp.lr * b * m[1] / (Math.sqrt(s[1]) + hp.eps)];
      }
      th = [th[0] + d[0], th[1] + d[1]];
      pts.push(th.slice());
      deltas.push(d);
    }
    return { pts: pts, deltas: deltas, loss: loss(th) };
  }

  /* the map: theta_1 horizontal, theta_2 vertical, as in F2.1's panel (a) */
  var MX = [-4.6, 4.6], MY = [-1.4, 4.3];
  var MAP = { x0: 6, y0: 6, w: 308, h: 0 };
  MAP.h = MAP.w * (MY[1] - MY[0]) / (MX[1] - MX[0]);
  function px(th) { return MAP.x0 + (th[0] - MX[0]) / (MX[1] - MX[0]) * MAP.w; }
  function py(th) { return MAP.y0 + (MY[1] - th[1]) / (MY[1] - MY[0]) * MAP.h; }

  /* the strips: signed log10 of the step size, from 0.01 to 10 */
  var LOG_LO = -2, LOG_HI = 1;
  function barLen(d, half) {
    var a = Math.abs(d);
    if (a <= Math.pow(10, LOG_LO)) return 0;
    return Math.min(1, (Math.log10(a) - LOG_LO) / (LOG_HI - LOG_LO)) * half;
  }

  function drawRule(card, rule, idx) {
    var svg = card.querySelector('svg.p02-rule-svg');
    var hp = SETTINGS[rule], res = runRule(rule, hp, N);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var stripTop = MAP.y0 + MAP.h + 18, stripH = 38, stripGap = 10;
    var H = stripTop + 2 * stripH + stripGap + 6;
    svg.setAttribute('viewBox', '0 0 320 ' + Math.round(H));
    var cid = 'p02-clip-' + rule;
    var defs = mk('defs', {}, svg);
    var cp = mk('clipPath', { id: cid }, defs);
    mk('rect', { x: MAP.x0, y: MAP.y0, width: MAP.w, height: MAP.h }, cp);
    mk('rect', { x: MAP.x0, y: MAP.y0, width: MAP.w, height: MAP.h, class: 'p02-map-frame' }, svg);
    var cg = mk('g', { 'clip-path': 'url(#' + cid + ')' }, svg);
    /* contours at the starting loss divided by powers of 4 */
    var S = loss(START);
    for (var k = 0; k < 9; k++) {
      var f = Math.pow(4, -k), a1 = Math.sqrt(2 * f * S / MU[0]), a2 = Math.sqrt(2 * f * S / MU[1]);
      var rx = a1 / (MX[1] - MX[0]) * MAP.w, ry = a2 / (MY[1] - MY[0]) * MAP.h;
      if (rx < 1) break;
      mk('ellipse', { cx: px([0, 0]), cy: py([0, 0]), rx: rx, ry: ry, class: 'p02-contour' }, cg);
    }
    /* the minimum */
    var m0x = px([0, 0]), m0y = py([0, 0]);
    mk('path', { d: 'M' + (m0x - 4) + ' ' + (m0y - 4) + 'l8 8m0 -8l-8 8', class: 'p02-min' }, cg);
    /* the path */
    var d = '';
    res.pts.forEach(function (q, i) { d += (i ? 'L' : 'M') + px(q).toFixed(1) + ' ' + py(q).toFixed(1); });
    mk('path', { d: d, class: 'p02-path p02-c-' + rule }, cg);
    res.pts.forEach(function (q, i) {
      mk('circle', { cx: px(q).toFixed(1), cy: py(q).toFixed(1), r: i === 0 ? 4.5 : 2.6, class: 'p02-dot p02-c-' + rule + (i === 0 ? ' is-start' : '') }, cg);
    });
    mk('text', { x: px(START) - 4, y: py(START) - 9, class: 'p02-svg-small' }, svg, 'start');
    mk('text', { x: m0x + 7, y: m0y + 15, class: 'p02-svg-small' }, svg, 'minimum');
    /* the strips */
    var x0 = 54, x1 = 314, slot = (x1 - x0) / N, bw = Math.min(10, slot * 0.62);
    [0, 1].forEach(function (c) {
      var top = stripTop + c * (stripH + stripGap), mid = top + stripH / 2, half = stripH / 2 - 1;
      mk('rect', { x: x0 - 2, y: top, width: x1 - x0 + 4, height: stripH, class: 'p02-strip-bg' }, svg);
      mk('line', { x1: x0 - 2, x2: x1 + 2, y1: mid, y2: mid, class: 'p02-strip-mid' }, svg);
      mk('text', { x: 4, y: mid + 4.5, class: 'p02-svg-small' }, svg, c === 0 ? 'Δθ₁' : 'Δθ₂');
      res.deltas.forEach(function (dd, i) {
        var L = barLen(dd[c], half), x = x0 + i * slot + (slot - bw) / 2;
        if (L <= 0) return;
        mk('rect', { x: x.toFixed(1), y: (dd[c] > 0 ? mid - L : mid).toFixed(1), width: bw.toFixed(1), height: L.toFixed(1), class: 'p02-bar p02-c-' + rule + (c === 0 ? ' is-steep' : ' is-floor') }, svg);
      });
    });
    return res;
  }

  function fmtLoss(v) { return v >= 10 ? String(Math.round(v)) : String(+v.toPrecision(2)); }
  function drawRules() {
    var host = document.getElementById('p02-rules-host');
    if (!host) return;
    var out = {};
    ['sgd', 'momentum', 'adam'].forEach(function (r, i) {
      var card = host.querySelector('.p02-rule[data-rule="' + r + '"]');
      if (card) out[r] = drawRule(card, r, i);
    });
    var set = function (k, v) { document.querySelectorAll('[data-p02="rules:' + k + '"]').forEach(function (n) { n.textContent = v; }); };
    set('n', String(N));
    set('sgd-lr', String(SETTINGS.sgd.lr));
    set('mom-lr', String(SETTINGS.momentum.lr));
    set('adam-lr', String(SETTINGS.adam.lr));
    if (out.sgd) set('sgd-loss', fmtLoss(out.sgd.loss));
    if (out.momentum) set('mom-loss', fmtLoss(out.momentum.loss));
    if (out.adam) set('adam-loss', fmtLoss(out.adam.loss));
  }

  function init() { drawFamily(); drawRules(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
