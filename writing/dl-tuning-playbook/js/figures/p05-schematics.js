/*
 * p05-schematics.js: static figures and small page behaviours for page 5 (05-reading-the-results).
 *
 *  1. #fig-iso-steps: the stepping stone to isolation plots. A synthetic study in the layout of the
 *     Playbook's Figure 2 (five weight-decay values, each tried with 20 learning rates). Panel (a)
 *     shows every run, panel (b) keeps the best run at each weight decay. The numbers are synthetic
 *     and say so in the caption.
 *  2. A second Playbook image in a figure's "The Playbook's figure" pane: site.js builds the pane from
 *     data-playbook-img; a figure that also carries data-playbook-img2 gets that image appended here,
 *     side by side with the first (the Playbook's Figure 1 has two plots).
 *
 * Colors come from CSS classes in css/pages/05-reading-the-results.css, which use the semantic
 * tokens (--model, --third, --accent, --ink-3), so both themes work.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};
  var NS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text != null) e.textContent = text;
    return e;
  }

  /* ---------------- 1. the stepping stone ---------------- */

  var WD = [-7, -5.75, -4.5, -3.25, -2];                 /* log10 weight decay */
  var BASE = [0.292, 0.258, 0.236, 0.249, 0.41];         /* best reachable error at each value */
  var NLR = 20;
  var ULO = -4.5, UHI = -0.8;                             /* log10 learning rate range searched */
  var UDIV = -1.3;                                       /* above this the run diverges */
  function optLR(k) { return -1.95 - 0.16 * (WD[k] + 7); }
  function rnd(i) { var s = Math.sin(i * 78.233 + 1.7) * 43758.5453; return s - Math.floor(s); }
  var RUNS = (function () {
    var out = [];
    WD.forEach(function (v, k) {
      for (var j = 0; j < NLR; j++) {
        var u = ULO + (j + 0.25 + 0.5 * rnd(k * 31 + j)) / NLR * (UHI - ULO);
        var d = u - optLR(k);
        var y = BASE[k] + 0.07 * d * d + 0.006 * (rnd(k * 97 + j * 13) - 0.5);
        var div = u > UDIV;
        out.push({ k: k, j: j, u: u, y: div ? null : Math.min(y, 0.74), div: div });
      }
    });
    return out;
  })();
  var BEST = WD.map(function (v, k) {
    return RUNS.filter(function (r) { return r.k === k && !r.div; }).sort(function (a, b) { return a.y - b.y; })[0];
  });
  TP.p05 = TP.p05 || {};
  TP.p05.isoSteps = { runs: RUNS, best: BEST };

  var PW = 400, PH = 280, M = { l: 52, r: 14, t: 26, b: 50 };
  var YLO = 0.15, YHI = 0.75, XTOP = 0.8, JW = 34;
  function px(k) { return M.l + 22 + k * (PW - M.l - M.r - 44) / (WD.length - 1); }
  function py(y) { return M.t + (YHI - y) / (YHI - YLO) * (PH - M.t - M.b); }
  function frame(s, title) {
    [0.2, 0.4, 0.6].forEach(function (t) {
      s.appendChild(svg('line', { x1: M.l, x2: PW - M.r, y1: py(t), y2: py(t), class: 'iso-grid' }));
      s.appendChild(svg('text', { x: M.l - 8, y: py(t) + 4.5, 'text-anchor': 'end', class: 'iso-tick' }, t.toFixed(1)));
    });
    s.appendChild(svg('line', { x1: M.l, x2: PW - M.r, y1: PH - M.b, y2: PH - M.b, class: 'iso-axis' }));
    /* x tick labels: first, middle and last value, so they never collide on a phone */
    [[0, '10⁻⁷'], [2, '3 × 10⁻⁵'], [4, '10⁻²']].forEach(function (p) {
      s.appendChild(svg('text', { x: px(p[0]), y: PH - M.b + 18, 'text-anchor': 'middle', class: 'iso-tick' }, p[1]));
    });
    s.appendChild(svg('text', { x: (M.l + PW - M.r) / 2, y: PH - 8, 'text-anchor': 'middle', class: 'iso-axlabel' }, 'weight decay'));
    var yl = svg('text', { x: 0, y: 0, 'text-anchor': 'middle', class: 'iso-axlabel', transform: 'translate(15 ' + ((M.t + PH - M.b) / 2) + ') rotate(-90)' }, 'validation error');
    s.appendChild(yl);
    s.setAttribute('aria-label', title);
  }

  function drawIsoSteps(fig) {
    var a = fig.querySelector('.iso-panel[data-panel="a"]'), b = fig.querySelector('.iso-panel[data-panel="b"]');
    if (!a || !b || a.querySelector('svg')) return;
    var sa = svg('svg', { viewBox: '0 0 ' + PW + ' ' + PH, width: String(PW), height: String(PH), role: 'img', class: 'iso-svg' });
    frame(sa, 'All 100 runs: validation error against weight decay, 20 learning rates at each of five weight-decay values, the best run at each value highlighted');
    RUNS.forEach(function (r) {
      var x = px(r.k) + (r.j / (NLR - 1) - 0.5) * JW;
      if (r.div) {
        var y = M.t - 12;
        sa.appendChild(svg('path', { d: 'M' + (x - 3) + ' ' + (y - 3) + ' l6 6 m0 -6 l-6 6', class: 'iso-cross' }));
      } else if (BEST[r.k] !== r) {
        sa.appendChild(svg('circle', { cx: x, cy: py(r.y), r: 3, class: 'iso-run' }));
      }
    });
    BEST.forEach(function (r) {
      var x = px(r.k) + (r.j / (NLR - 1) - 0.5) * JW;
      sa.appendChild(svg('circle', { cx: x, cy: py(r.y), r: 5, class: 'iso-best' }));
    });
    a.appendChild(sa);

    var sb = svg('svg', { viewBox: '0 0 ' + PW + ' ' + PH, width: String(PW), height: String(PH), role: 'img', class: 'iso-svg' });
    frame(sb, 'The isolation plot: the best run at each of the five weight-decay values, joined by a line');
    var d = BEST.map(function (r, k) { return (k ? 'L' : 'M') + px(k) + ' ' + py(r.y); }).join(' ');
    sb.appendChild(svg('path', { d: d, class: 'iso-line' }));
    var lo = 0;
    BEST.forEach(function (r, k) { if (r.y < BEST[lo].y) lo = k; });
    BEST.forEach(function (r, k) {
      sb.appendChild(svg('circle', { cx: px(k), cy: py(r.y), r: k === lo ? 6.5 : 5, class: k === lo ? 'iso-best iso-winner' : 'iso-best' }));
    });
    sb.appendChild(svg('text', { x: px(lo), y: py(BEST[lo].y) - 16, 'text-anchor': 'middle', class: 'iso-note' }, 'best weight decay'));
    b.appendChild(sb);
  }

  /* ---------------- 2. a second Playbook image ---------------- */

  function addSecondImages() {
    var root = (document.body && document.body.getAttribute('data-root')) || '';
    Array.prototype.forEach.call(document.querySelectorAll('figure[data-playbook-img2]'), function (f) {
      var pane = f.querySelector('.fig-pb');
      if (!pane || pane.querySelector('img.fig-pb-img2')) return;
      var first = pane.querySelector('img');
      var img = document.createElement('img');
      img.className = 'fig-pb-img2';
      img.src = root + f.getAttribute('data-playbook-img2');
      img.alt = f.getAttribute('data-playbook-alt2') || 'Second panel of the Playbook figure';
      img.loading = 'lazy';
      var pair = document.createElement('div');
      pair.className = 'fig-pb-pair';
      if (first) {
        if (f.getAttribute('data-playbook-alt1')) first.alt = f.getAttribute('data-playbook-alt1');
        first.parentNode.insertBefore(pair, first);
        pair.appendChild(first);
      } else pane.insertBefore(pair, pane.firstChild);
      pair.appendChild(img);
    });
  }

  function init() {
    var f = document.getElementById('fig-iso-steps');
    if (f) drawIsoSteps(f);
    addSecondImages();
  }
  document.addEventListener('tp:ready', function () { init(); setTimeout(addSecondImages, 0); });
  if (document.readyState !== 'loading') setTimeout(init, 0);
  else document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); });
})();
