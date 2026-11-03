/*
 * p04-schematics.js: the computed schematics of page 4 (04-searching-the-space.html).
 *
 *   #fig-projection-collapse  nine trials as a 3 x 3 grid and as nine random points, with the
 *                             validation error curve of the hyperparameter that matters on top
 *                             (after Bergstra and Bengio 2012, Figure 1). Fixed, illustrative
 *                             points; the valley sits between two grid columns on purpose.
 *   #fig-gaps                 16 trials projected onto the learning rate: evenly spaced, uniform
 *                             random and quasi-random, with each row's largest gap marked. The
 *                             random and quasi-random points are TP.coverage's at seed 1 and four
 *                             hyperparameters, the default of #fig-coverage, so the gaps equal
 *                             that figure's ledger values (0.19 and 0.094).
 *
 * Both are static SVG drawn once, coloured through CSS classes (css/pages/04-searching-the-space.css)
 * so that the theme toggle needs no redraw. Each panel is its own small SVG laid out by CSS grid, so
 * the text keeps its size on a phone, where the panels stack.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};
  var doc = global.document;
  if (!doc) return;
  var NS = 'http://www.w3.org/2000/svg';

  function s(tag, attrs, parent, text) {
    var n = doc.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function h(tag, cls, parent, html) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    if (parent) parent.appendChild(n);
    return n;
  }
  function r2(v) { return Math.round(v * 100) / 100; }

  /* ---------- Figure: projection collapse ---------- */

  /* validation error of the hyperparameter that matters, on [0, 1]: a valley at X0 of width W */
  var X0 = 0.66, W = 0.15;
  function err(x) { return 1 - Math.exp(-Math.pow((x - X0) / W, 2)); }

  var GRID9 = [];
  [1 / 6, 1 / 2, 5 / 6].forEach(function (x) { [1 / 6, 1 / 2, 5 / 6].forEach(function (y) { GRID9.push([x, y]); }); });
  var RAND9 = [[0.07, 0.62], [0.21, 0.18], [0.30, 0.84], [0.43, 0.40], [0.53, 0.70], [0.64, 0.28], [0.74, 0.90], [0.86, 0.52], [0.95, 0.12]];

  function projectionPanel(host, method) {
    var pts = method === 'grid' ? GRID9 : RAND9;
    var cls = method === 'grid' ? 'p04-c-grid' : 'p04-c-random';
    var wrap = h('div', 'p04-proj-panel', host);
    h('div', 'p04-proj-name ' + cls, wrap, method === 'grid' ? 'Grid, 3 &times; 3' : 'Random, 9 trials');
    var W0 = 320, H0 = 282;
    var svg = s('svg', { viewBox: '0 0 ' + W0 + ' ' + H0, role: 'img', 'aria-label': method === 'grid' ?
      'Nine grid trials fall on three learning rates; the valley of the error curve lies between two of them.' :
      'Nine random trials fall on nine different learning rates; one falls in the valley of the error curve.' }, wrap);
    var L = 46, R = 306, CT = 22, CB = 92, ST = 112, SB = 252;
    var X = function (x) { return L + x * (R - L); };
    var Yc = function (v) { return CB - v * (CB - CT); };
    var Ys = function (y) { return SB - y * (SB - ST); };
    /* the error curve */
    var d = '';
    for (var i = 0; i <= 120; i++) { var x = i / 120; d += (i ? 'L' : 'M') + r2(X(x)) + ',' + r2(Yc(err(x))); }
    s('path', { d: d, class: 'p04-curve' }, svg);
    s('text', { x: L, y: 10, class: 'p04-t-small', 'text-anchor': 'start' }, svg, 'validation error');
    s('text', { x: L - 8, y: CT + 4, class: 'p04-t-small', 'text-anchor': 'end' }, svg, 'high');
    s('text', { x: L - 8, y: CB, class: 'p04-t-small', 'text-anchor': 'end' }, svg, 'low');
    /* the box of the two hyperparameters */
    s('rect', { x: L, y: ST, width: R - L, height: SB - ST, class: 'p04-frame' }, svg);
    /* drop lines from each tested learning rate up to the curve */
    var xs = [];
    pts.forEach(function (p) { if (xs.indexOf(p[0]) < 0) xs.push(p[0]); });
    xs.forEach(function (x) {
      s('line', { x1: X(x), x2: X(x), y1: SB, y2: Yc(err(x)), class: 'p04-drop ' + cls }, svg);
    });
    /* the trials */
    pts.forEach(function (p) { s('circle', { cx: X(p[0]), cy: Ys(p[1]), r: 5.5, class: 'p04-pt ' + cls }, svg); });
    /* where each tested learning rate meets the curve, and the best of them */
    var best = xs.reduce(function (a, b) { return err(b) < err(a) ? b : a; });
    xs.forEach(function (x) { s('circle', { cx: X(x), cy: Yc(err(x)), r: 4, class: 'p04-pt ' + cls }, svg); });
    s('circle', { cx: X(best), cy: Yc(err(best)), r: 9, class: 'p04-ring ' + cls }, svg);
    var bx = X(best), anchor = bx > 230 ? 'end' : 'start', off = anchor === 'end' ? -14 : 14;
    s('text', { x: bx + off, y: Yc(err(best)) + (method === 'grid' ? -2 : -10), class: 'p04-t-label ' + cls, 'text-anchor': anchor }, svg, 'best tried');
    /* axes */
    s('text', { x: (L + R) / 2, y: SB + 22, class: 'p04-t', 'text-anchor': 'middle' }, svg, 'learning rate (matters)');
    s('text', { x: 0, y: 0, class: 'p04-t', 'text-anchor': 'middle', transform: 'translate(' + (L - 14) + ',' + ((ST + SB) / 2) + ') rotate(-90)' }, svg, 'weight decay');
    h('div', 'p04-proj-foot', wrap, method === 'grid' ?
      '<strong>3 learning rates</strong> tried, 3 trials each' : '<strong>9 learning rates</strong> tried, 1 trial each');
  }

  function drawProjection(el) {
    var host = el.querySelector('.p04-proj');
    if (!host || host.childNodes.length) return;
    projectionPanel(host, 'grid');
    projectionPanel(host, 'random');
  }

  /* ---------- Figure: the largest gap ---------- */

  /** The sorted values and the largest gap [a, b] of a set on [0, 1], the ends included. */
  function gapOf(vals) {
    var v = vals.slice().sort(function (a, b) { return a - b; });
    var edges = [0].concat(v, [1]), best = [0, 0];
    for (var i = 1; i < edges.length; i++) if (edges[i] - edges[i - 1] > best[1] - best[0]) best = [edges[i - 1], edges[i]];
    return { v: v, a: best[0], b: best[1], gap: best[1] - best[0] };
  }

  function gapRow(host, key, name, vals) {
    var g = gapOf(vals);
    var row = h('div', 'p04-gap-row p04-c-' + key, host);
    var lab = h('div', 'p04-gap-label', row);
    h('span', 'p04-gap-name', lab, name);
    var fmt = TP.fmt && TP.fmt.byName ? TP.fmt.byName('sig2') : function (x) { return x.toPrecision(2); };
    h('span', 'p04-gap-val', lab, 'largest gap <strong>' + fmt(g.gap) + '</strong>');
    var svg = s('svg', { viewBox: '0 0 600 34', preserveAspectRatio: 'none', class: 'p04-gap-strip', role: 'img',
      'aria-label': name + ': 16 trials; the largest gap runs from ' + g.a.toFixed(2) + ' to ' + g.b.toFixed(2) + '.' }, row);
    s('rect', { x: g.a * 600, y: 3, width: (g.b - g.a) * 600, height: 28, class: 'p04-gap-hi' }, svg);
    s('line', { x1: 0, x2: 600, y1: 31, y2: 31, class: 'p04-gap-axis' }, svg);
    g.v.forEach(function (x) { s('line', { x1: x * 600, x2: x * 600, y1: 6, y2: 31, class: 'p04-gap-tick' }, svg); });
    row.setAttribute('data-gap', g.gap.toFixed(4));
    return g;
  }

  function drawGaps(el) {
    var host = el.querySelector('.p04-gaps');
    if (!host || host.childNodes.length || !TP.coverage) return;
    var N = 16, even = [];
    for (var i = 1; i <= N; i++) even.push(i / (N + 1));
    var C = TP.coverage;
    gapRow(host, 'even', 'Evenly spaced', even);
    gapRow(host, 'random', 'Uniform random', C.points('random', 4, N, 1).map(function (p) { return p[0]; }));
    gapRow(host, 'quasi', 'Quasi-random (Halton)', C.points('quasi', 4, N, 1).map(function (p) { return p[0]; }));
    var ax = h('div', 'p04-gap-axislabels', host);
    h('span', '', ax, '0');
    h('span', 'p04-gap-axisname', ax, 'learning rate, rescaled to the range 0 to 1');
    h('span', '', ax, '1');
  }

  function init() {
    var a = doc.getElementById('fig-projection-collapse');
    if (a) drawProjection(a);
    var b = doc.getElementById('fig-gaps');
    if (b) drawGaps(b);
  }
  TP.p04 = { gapOf: gapOf, err: err };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
  doc.addEventListener('tp:ready', init);
})(typeof window !== 'undefined' ? window : globalThis);
