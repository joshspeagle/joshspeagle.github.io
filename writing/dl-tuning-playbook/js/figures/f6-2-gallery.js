/*
 * f6-2-gallery.js: the training-curve symptom chart (figure.schematic#fig-gallery) on page 5 #curves.
 *
 * Revised 2026-11 (post05 review). The earlier version drew an eight-panel interactive gallery and a
 * six-item exercise (fig-curve-check). Both are retired. The figure is now a static set of small
 * multiples: one card per question the Playbook asks of training curves (README, "Examining the
 * training curves"), plus one card for loss spikes, which the Playbook's checklist routes to its
 * section on optimization failures. The card text (symptom, likely cause, what to check) lives in
 * the page's HTML. This script draws only the small plot at the top of each card, into
 * div.sym-plot[data-curve].
 *
 * Every plot is a schematic: analytic shapes with no units, error on the vertical axis and training
 * step on the horizontal axis. Validation error is the solid model-blue line, training error the
 * dashed ochre line (--third). One highlight per plot (accent) marks the feature the card names.
 * The SVG carries no text, so its size can follow the card width on any screen; the legend is HTML.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};
  var NS = 'http://www.w3.org/2000/svg';
  var W = 240, H = 130, PAD = { l: 10, r: 10, t: 10, b: 12 };
  var N = 120;

  function xs() { var a = []; for (var i = 0; i <= N; i++) a.push(i / N); return a; }
  /* a fixed, repeatable jitter in [-1, 1] */
  function jit(i) { var s = Math.sin(i * 12.9898 + 4.1) * 43758.5453; return 2 * (s - Math.floor(s)) - 1; }
  function decay(t, a, k) { return a * Math.exp(-k * t); }

  /* Each shape returns {train(t, i), val(t, i), mark}: mark describes the highlight. Errors are in
     [0, 1], 1 at the top of the plot. */
  var SHAPES = {
    overfit: {
      train: function (t) { return 0.08 + decay(t, 0.72, 4.2); },
      val: function (t) { return 0.3 + decay(t, 0.5, 5) + 0.42 * Math.pow(Math.max(0, t - 0.38), 1.6); },
      mark: { kind: 'min', of: 'val' }
    },
    variance: {
      train: function (t, i) { return 0.12 + decay(t, 0.68, 4) + 0.015 * jit(i + 7) * t; },
      val: function (t, i) { return 0.28 + decay(t, 0.5, 4.2) + (0.02 + 0.09 * Math.max(0, t - 0.45)) * jit(i); },
      mark: { kind: 'band', from: 0.6, to: 1 }
    },
    improving: {
      train: function (t) { return 0.12 + 0.68 * Math.pow(1 - t, 1.6) * 0.75 + decay(t, 0.17, 6); },
      val: function (t) { return 0.27 + 0.55 * Math.pow(1 - t, 1.4) * 0.7 + decay(t, 0.17, 6); },
      mark: { kind: 'slope', of: 'val' }
    },
    saturated: {
      train: function (t) { return 0.12 + decay(t, 0.7, 16); },
      val: function (t) { return 0.3 + decay(t, 0.52, 15); },
      mark: { kind: 'band', from: 0.3, to: 1 }
    },
    rising: {
      train: function (t) { return 0.12 + decay(t, 0.68, 6) + 0.36 * Math.pow(Math.max(0, t - 0.4), 1.3); },
      val: function (t) { return 0.3 + decay(t, 0.5, 6) + 0.34 * Math.pow(Math.max(0, t - 0.4), 1.3); },
      mark: { kind: 'segment', of: 'train', from: 0.42, to: 1 }
    },
    spike: {
      train: function (t) { return 0.1 + decay(t, 0.7, 5) + spike(t) * 0.55; },
      val: function (t) { return 0.29 + decay(t, 0.5, 5) + spike(t) * 0.5; },
      mark: { kind: 'point', of: 'val', at: 0.55 }
    }
  };
  function spike(t) { var d = (t - 0.55) / 0.025; return t < 0.55 ? Math.exp(-d * d * 4) : Math.exp(-(t - 0.55) / 0.06); }

  function svg(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function X(t) { return PAD.l + t * (W - PAD.l - PAD.r); }
  function Y(v) { return PAD.t + (1 - v) * (H - PAD.t - PAD.b); }
  function path(fn) {
    return xs().map(function (t, i) { return (i ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(fn(t, i)).toFixed(1); }).join(' ');
  }

  function drawOne(host) {
    var key = host.getAttribute('data-curve'), S = SHAPES[key];
    if (!S || host.querySelector('svg')) return;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: String(W), height: String(H), class: 'sym-svg', 'aria-hidden': 'true', focusable: 'false' });
    var m = S.mark;
    if (m.kind === 'band') {
      s.appendChild(svg('rect', { x: X(m.from), y: PAD.t, width: X(m.to) - X(m.from), height: H - PAD.t - PAD.b, class: 'sym-band' }));
    }
    /* axes: an L with an arrow on the step axis */
    s.appendChild(svg('path', { d: 'M' + PAD.l + ' ' + PAD.t + ' V' + (H - PAD.b) + ' H' + (W - PAD.r), class: 'sym-axis' }));
    s.appendChild(svg('path', { d: path(S.train), class: 'sym-train' }));
    s.appendChild(svg('path', { d: path(S.val), class: 'sym-val' }));
    if (m.kind === 'min') {
      var best = 0, bv = 9;
      xs().forEach(function (t, i) { var v = S[m.of](t, i); if (v < bv) { bv = v; best = t; } });
      s.appendChild(svg('line', { x1: X(best), x2: X(best), y1: PAD.t, y2: H - PAD.b, class: 'sym-guide' }));
      s.appendChild(svg('circle', { cx: X(best), cy: Y(bv), r: 5, class: 'sym-mark' }));
    } else if (m.kind === 'slope') {
      var t0 = 0.86, t1 = 1, v0 = S.val(t0), v1 = S.val(t1), dx = X(t1) - X(t0), dy = Y(v1) - Y(v0);
      var ext = 1.6;
      s.appendChild(svg('line', { x1: X(t0) - dx * 0.2, y1: Y(v0) - dy * 0.2, x2: X(t0) + dx * ext, y2: Y(v0) + dy * ext, class: 'sym-tangent' }));
      s.appendChild(svg('circle', { cx: X(1), cy: Y(v1), r: 4.5, class: 'sym-mark' }));
    } else if (m.kind === 'segment') {
      var seg = xs().filter(function (t) { return t >= m.from && t <= m.to; });
      var d = seg.map(function (t, i) { return (i ? 'L' : 'M') + X(t).toFixed(1) + ' ' + Y(S[m.of](t)).toFixed(1); }).join(' ');
      s.appendChild(svg('path', { d: d, class: 'sym-hl' }));
    } else if (m.kind === 'point') {
      var top = 0, tt = m.at;
      xs().forEach(function (t, i) { var v = S[m.of](t, i); if (v > top && t > 0.4) { top = v; tt = t; } });
      s.appendChild(svg('circle', { cx: X(tt), cy: Y(top), r: 6, class: 'sym-mark' }));
    }
    host.appendChild(s);
  }

  function init() {
    var fig = document.getElementById('fig-gallery');
    if (!fig) return;
    Array.prototype.forEach.call(fig.querySelectorAll('.sym-plot[data-curve]'), drawOne);
  }

  TP.symptomShapes = SHAPES;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  document.addEventListener('tp:ready', init);
})();
