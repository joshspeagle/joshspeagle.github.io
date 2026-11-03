/*
 * p03-figures.js: the stepping-stone figures of post 3 (batch size) that do not use TP.fig.
 *
 *   #fig-hardware   memory use and time per step against batch size (slider)
 *   #fig-noise      mini-batch gradient estimates, progress per step and per example (slider)
 *   #fig-regimes    the three regimes of steps against batch size, with the named points (static)
 *   #fig-retune     the best SGD learning rate against batch size (static)
 *
 * Each is a figure.schematic: site.js numbers it and builds its toolbar, and this script draws
 * the SVG at the container's pixel width (so text sizes are real CSS pixels) and redraws on
 * resize. Colors are the site's CSS variables, so both themes work.
 *
 * Models (arbitrary constants, labeled as such on the page):
 *   - Time per step: TP.throughput.timePerStep(B, 'saturating'), the toy accelerator of the
 *     doubling figure (t0 = 0.1 s, B_sat = 512, sharpness 4). Memory: a fixed 4 GB for weights,
 *     gradients and optimizer state plus 2.5 MB of activations per example, on a 16 GB device,
 *     so that 4,096 fits and 8,192 does not (the doubling figure's memory limit).
 *   - Gradient noise: McCandlish et al. (2018) Eqs. 2.6-2.7. The best step's loss improvement is
 *     dL_max / (1 + B_noise / B), so progress per step relative to the noise-free step is
 *     1 / (1 + B_noise / B) and progress per example relative to a very small batch is
 *     1 / (1 + B / B_noise). B_noise = 128 in the toy. The arrows are g + z_i sigma / sqrt(B) with
 *     fixed standard normal z_i and tr(Sigma) / |g|^2 = B_noise (their Eq. 2.9, B_simple).
 *   - Regimes: S / S_min = 1 + B_crit / B (McCandlish Eq. 2.11 at fixed B).
 *   - Learning rate: eta*(B) = eta_max / (1 + B_noise / B) (McCandlish Eq. 2.6, SGD).
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------------- small helpers ---------------- */
  function svgEl(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function text(parent, x, y, str, attrs) {
    var a = { x: x, y: y, 'class': 'p03-t' };
    for (var k in attrs || {}) a[k] = attrs[k];
    var t = svgEl('text', a, parent);
    /* "B_crit" draws as B with a subscript "crit" */
    var parts = String(str).split(/([A-Za-z\u03b7]_[a-z]+)/);
    parts.forEach(function (part) {
      var m = /^([A-Za-z\u03b7])_([a-z]+)$/.exec(part);
      if (!m) { if (part) t.appendChild(document.createTextNode(part)); return; }
      t.appendChild(document.createTextNode(m[1]));
      var sub = svgEl('tspan', { 'baseline-shift': 'sub', 'font-size': '0.78em' }, t);
      sub.textContent = m[2];
      /* a zero-width tspan resets the baseline for any text after the subscript */
      var rest = svgEl('tspan', { 'baseline-shift': '0' }, t);
      rest.textContent = '';
    });
    return t;
  }
  function fmtInt(v) { return Math.round(v).toLocaleString('en-US'); }
  function fmtSig(v, n) { return Number(v.toPrecision(n || 2)).toLocaleString('en-US'); }
  function pct(v) { return Math.round(v * 100) + '%'; }
  function phone() { return window.innerWidth < 640; }

  /** Draw fn(svg, width) into host now and whenever its width changes. */
  function responsive(host, fn) {
    var last = -1;
    function go() {
      var w = Math.floor(host.clientWidth);
      if (w <= 0 || w === last) return;
      last = w;
      host.innerHTML = '';
      fn(w);
    }
    go();
    if (window.ResizeObserver) new ResizeObserver(go).observe(host);
    else window.addEventListener('resize', go);
    return function () { last = -1; go(); };
  }

  function logScale(d0, d1, r0, r1) {
    var a = Math.log(d0), b = Math.log(d1);
    var f = function (v) { return r0 + (Math.log(v) - a) / (b - a) * (r1 - r0); };
    f.inv = function (p) { return Math.exp(a + (p - r0) / (r1 - r0) * (b - a)); };
    return f;
  }
  function linScale(d0, d1, r0, r1) {
    return function (v) { return r0 + (v - d0) / (d1 - d0) * (r1 - r0); };
  }
  function pathOf(pts) {
    return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
  }

  /** A labelled log-log frame. Returns {x, y, g, w, h}. */
  function frame(svg, o) {
    var g = svgEl('g', { transform: 'translate(' + o.left + ',' + o.top + ')' }, svg);
    var x = logScale(o.xd[0], o.xd[1], 0, o.w), y = logScale(o.yd[0], o.yd[1], o.h, 0);
    svgEl('rect', { x: 0, y: 0, width: o.w, height: o.h, 'class': 'p03-plot' }, g);
    (o.yTicks || []).forEach(function (v) {
      svgEl('line', { x1: 0, x2: o.w, y1: y(v), y2: y(v), 'class': 'p03-grid' }, g);
      text(g, -6, y(v) + 4, o.yFmt ? o.yFmt(v) : String(v), { 'text-anchor': 'end', 'class': 'p03-t p03-tick' });
    });
    (o.xTicks || []).forEach(function (v) {
      svgEl('line', { x1: x(v), x2: x(v), y1: o.h, y2: o.h + 4, 'class': 'p03-axis' }, g);
      text(g, x(v), o.h + 17, o.xFmt ? o.xFmt(v) : String(v), { 'text-anchor': 'middle', 'class': 'p03-t p03-tick' });
    });
    svgEl('line', { x1: 0, x2: o.w, y1: o.h, y2: o.h, 'class': 'p03-axis' }, g);
    svgEl('line', { x1: 0, x2: 0, y1: 0, y2: o.h, 'class': 'p03-axis' }, g);
    if (o.xLabel) text(g, o.w / 2, o.h + 36, o.xLabel, { 'text-anchor': 'middle', 'class': 'p03-t p03-axlabel' });
    if (o.yLabel) {
      var t = text(g, 0, 0, o.yLabel, { 'text-anchor': 'middle', 'class': 'p03-t p03-axlabel' });
      t.setAttribute('transform', 'translate(' + (-o.left + 14) + ',' + (o.h / 2) + ') rotate(-90)');
    }
    return { x: x, y: y, g: g, w: o.w, h: o.h };
  }

  /** A power-of-two slider: input range over indices, with a visible output. */
  function powSlider(host, o) {
    var vals = [];
    for (var b = o.min; b <= o.max; b *= 2) vals.push(b);
    var wrap = document.createElement('div');
    wrap.className = 'p03-ctl';
    var id = o.id + '-range';
    wrap.innerHTML = '<label for="' + id + '">' + o.label + ' <output for="' + id + '"></output></label>' +
      '<div class="p03-range"><button type="button" class="p03-step" data-d="-1" aria-label="Halve the batch size">−</button>' +
      '<input type="range" id="' + id + '" min="0" max="' + (vals.length - 1) + '" step="1">' +
      '<button type="button" class="p03-step" data-d="1" aria-label="Double the batch size">+</button></div>';
    host.appendChild(wrap);
    var input = wrap.querySelector('input'), out = wrap.querySelector('output');
    function set(i, silent) {
      i = Math.max(0, Math.min(vals.length - 1, i));
      input.value = i;
      out.textContent = fmtInt(vals[i]);
      input.setAttribute('aria-valuetext', 'batch size ' + fmtInt(vals[i]));
      if (!silent) o.onChange(vals[i]);
    }
    input.addEventListener('input', function () { set(+input.value); });
    Array.prototype.forEach.call(wrap.querySelectorAll('.p03-step'), function (btn) {
      btn.addEventListener('click', function () { set(+input.value + (+btn.getAttribute('data-d'))); });
    });
    set(vals.indexOf(o.value), true);
    return { set: function (B) { set(vals.indexOf(B)); }, values: vals };
  }

  function register(id, api) {
    TP.figures = TP.figures || {};
    TP.p03 = TP.p03 || {};
    TP.p03[id] = api;
  }

  /* ================= Figure: memory and time per step ================= */
  var MEM = { device: 16, fixed: 4, perExample: 0.0025 }; // GB; arbitrary constants
  function memoryAt(B) { return MEM.fixed + MEM.perExample * B; }

  function initHardware(fig) {
    var T = TP.throughput;
    if (!T) return;
    var ctlHost = fig.querySelector('.p03-controls'), plotHost = fig.querySelector('.p03-canvas');
    var readout = fig.querySelector('.p03-readout');
    var state = { B: 1024 };
    var tOf = function (B) { return T.timePerStep(B, 'saturating'); };
    var limit = T.MEMORY_LIMIT, bSat = T.PRESETS.saturating.bSat;

    function draw(W) {
      var ph = W < 560;
      var svg = svgEl('svg', { width: W, 'class': 'p03-svg', role: 'img', 'aria-label': 'Memory use and time per step at the chosen batch size' }, plotHost);
      var B = state.B, mem = memoryAt(B), oom = B > limit;
      /* (a) memory: a horizontal stacked bar */
      var padL = ph ? 8 : 10, barW = W - padL - (ph ? 12 : 24), maxGB = 24;
      var xm = linScale(0, maxGB, padL, padL + barW);
      var gA = svgEl('g', { transform: 'translate(0,0)' }, svg);
      text(gA, padL, 16, '(a) accelerator memory', { 'class': 'p03-t p03-ptitle' });
      var by = 30, bh = 26;
      svgEl('rect', { x: xm(0), y: by, width: xm(MEM.fixed) - xm(0), height: bh, 'class': 'p03-mem-fixed' }, gA);
      svgEl('rect', { x: xm(MEM.fixed), y: by, width: Math.max(0, xm(Math.min(mem, maxGB)) - xm(MEM.fixed)), height: bh, 'class': oom ? 'p03-mem-oom' : 'p03-mem-act' }, gA);
      svgEl('line', { x1: xm(MEM.device), x2: xm(MEM.device), y1: by - 6, y2: by + bh + 6, 'class': 'p03-limit' }, gA);
      text(gA, xm(MEM.device) + 5, by - 1, ph ? '16 GB limit' : 'device memory, 16 GB', { 'class': 'p03-t p03-small p03-limit-t' });
      text(gA, Math.min(xm(Math.min(mem, maxGB)) + 6, W - 70), by + bh / 2 + 5, fmtSig(mem, 2) + ' GB', { 'class': 'p03-t p03-label' });
      var ly = by + bh + 18;
      text(gA, xm(0), ly, ph ? 'weights + optimizer' : 'weights, gradients, optimizer state', { 'class': 'p03-t p03-small p03-third-t' });
      var actLabel = oom ? 'activations: out of memory' : 'activations, grow with B';
      var ax = Math.min(xm(MEM.fixed) + 8, W - 8);
      if (!ph) text(gA, Math.max(ax, xm(0) + 230), ly, actLabel, { 'class': 'p03-t p03-small ' + (oom ? 'p03-data-t' : 'p03-model-t') });
      else text(gA, xm(0), ly + 16, actLabel, { 'class': 'p03-t p03-small ' + (oom ? 'p03-data-t' : 'p03-model-t') });
      var topB = ph ? ly + 34 : ly + 26;

      /* (b) time per step against batch size */
      var left = ph ? 52 : 64, right = ph ? 14 : 24, h = ph ? 180 : 190;
      text(svg, padL, topB + 6, '(b) time per step', { 'class': 'p03-t p03-ptitle' });
      var f = frame(svg, {
        left: left, top: topB + 20, w: W - left - right, h: h,
        xd: [6, 11000], yd: [0.05, 3], xTicks: [8, 64, 512, 4096], xFmt: fmtInt,
        yTicks: [0.1, 0.3, 1, 3], yFmt: function (v) { return v + ' s'; },
        xLabel: 'batch size B (log scale)', yLabel: ph ? 's per step' : 'seconds per step'
      });
      /* regions */
      svgEl('rect', { x: f.x(limit * Math.SQRT2), y: 0, width: f.w - f.x(limit * Math.SQRT2), height: f.h, 'class': 'p03-oom-zone' }, f.g);
      text(f.g, f.w - 4, 14, 'does not fit', { 'text-anchor': 'end', 'class': 'p03-t p03-small p03-data-t' });
      svgEl('line', { x1: f.x(bSat), x2: f.x(bSat), y1: 0, y2: f.h, 'class': 'p03-guide' }, f.g);
      text(f.g, f.x(bSat) - 5, f.h - 8, ph ? 'saturates' : 'accelerator saturates', { 'text-anchor': 'end', 'class': 'p03-t p03-small p03-third-t' });
      var pts = [], ptsOff = [];
      for (var e = Math.log2(8); e <= Math.log2(8192) + 1e-9; e += 1 / 16) {
        var b = Math.pow(2, e);
        (b <= limit * 1.0001 ? pts : ptsOff).push([f.x(b), f.y(tOf(b))]);
      }
      ptsOff.unshift(pts[pts.length - 1]);
      svgEl('path', { d: pathOf(pts), 'class': 'p03-curve p03-third' }, f.g);
      svgEl('path', { d: pathOf(ptsOff), 'class': 'p03-curve p03-third p03-dashed' }, f.g);
      if (!ph) {
        text(f.g, f.x(24), f.y(0.1) - 10, 'flat: same time, more examples', { 'class': 'p03-t p03-small p03-ink2' });
        text(f.g, f.x(1600) + 10, f.y(tOf(1600)) + 20, 'doubles with each doubling of B', { 'class': 'p03-t p03-small p03-ink2' });
      }
      svgEl('circle', { cx: f.x(B), cy: f.y(tOf(B)), r: 6.5, 'class': oom ? 'p03-dot-oom' : 'p03-dot' }, f.g);
      svgEl('line', { x1: f.x(B), x2: f.x(B), y1: f.y(tOf(B)) + 7, y2: f.h, 'class': 'p03-reader' }, f.g);
      svg.setAttribute('height', topB + 20 + h + 44);
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + (topB + 20 + h + 44));
    }
    var redraw = responsive(plotHost, draw);
    function say() {
      var B = state.B, mem = memoryAt(B);
      if (B > limit) {
        readout.textContent = 'Batch size ' + fmtInt(B) + ' needs ' + fmtSig(mem, 3) + ' GB of the 16 GB on the device, so the run fails with an out-of-memory error.';
      } else {
        var t = tOf(B);
        readout.textContent = 'Batch size ' + fmtInt(B) + ' uses ' + fmtSig(mem, 2) + ' of 16 GB and takes ' + (t < 1 ? t.toFixed(2) : t.toFixed(1)) + ' s per step, a throughput of ' +
          fmtInt(Math.round(B / t / 10) * 10) + ' examples per second.';
      }
    }
    var slider = powSlider(ctlHost, { id: 'fig-hardware', label: 'Batch size', min: 8, max: 8192, value: state.B,
      onChange: function (B) { state.B = B; redraw(); say(); } });
    say();
    register('fig-hardware', { set: function (B) { slider.set(B); }, reset: function () { slider.set(1024); } });
  }

  /* ================= Figure: gradient noise ================= */
  var B_NOISE = 128;
  /* fixed standard normal pairs for the 24 mini-batch draws (Box-Muller on a fixed LCG) */
  var Z = (function () {
    var s = 12345, out = [];
    function u() { s = (s * 1103515245 + 12345) % 2147483648; return (s + 0.5) / 2147483648; }
    for (var i = 0; i < 24; i++) {
      var r = Math.sqrt(-2 * Math.log(u())), th = 2 * Math.PI * u();
      out.push([r * Math.cos(th), r * Math.sin(th)]);
    }
    return out;
  })();

  function initNoise(fig) {
    var ctlHost = fig.querySelector('.p03-controls'), plotHost = fig.querySelector('.p03-canvas');
    var readout = fig.querySelector('.p03-readout');
    var state = { B: 32 };
    var sigma = Math.sqrt(B_NOISE / 2); // per-coordinate sd of one example's gradient, |g| = 1

    function draw(W) {
      var ph = W < 600, B = state.B;
      var arrowW = ph ? W : Math.min(360, W * 0.46), arrowH = ph ? 210 : 250;
      var barsX = ph ? 0 : arrowW + 28, barsY = ph ? arrowH + 18 : 0, barsW = ph ? W : W - barsX;
      var H = ph ? arrowH + 18 + 205 : 250;
      var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'class': 'p03-svg', style: 'overflow:hidden', role: 'img',
        'aria-label': 'Mini-batch gradient estimates and progress per step and per example at the chosen batch size' }, plotHost);
      var defs = svgEl('defs', {}, svg);
      var clip = svgEl('clipPath', { id: 'p03-noise-clip' }, defs);
      svgEl('rect', { x: 0, y: 22, width: arrowW, height: arrowH - 22 }, clip);
      ['model', 'ink'].forEach(function (c) {
        var m = svgEl('marker', { id: 'p03-ah-' + c, viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs);
        svgEl('path', { d: 'M0 1 L9 5 L0 9 z', 'class': 'p03-ah-' + c }, m);
      });
      text(svg, 0, 15, '(a) gradient estimates from ' + (ph ? '24 batches' : '24 different mini-batches'), { 'class': 'p03-t p03-ptitle' });
      var g = svgEl('g', { 'clip-path': 'url(#p03-noise-clip)' }, svg);
      svgEl('rect', { x: 0, y: 22, width: arrowW, height: arrowH - 22, 'class': 'p03-plot' }, g);
      var ox = arrowW * 0.2, oy = 22 + (arrowH - 22) / 2, L = arrowW * 0.5; // |g| in px
      var sd = sigma / Math.sqrt(B);
      Z.forEach(function (z) {
        var tx = ox + L * (1 + z[0] * sd), ty = oy - L * z[1] * sd;
        /* an estimate longer than the panel is shortened to the panel edge and drawn dashed, so
           every arrow keeps its head and the reader can tell which ones run further */
        var dx = tx - ox, dy = ty - oy, k = 1, pad = 8;
        if (dx > 0) k = Math.min(k, (arrowW - pad - ox) / dx); else if (dx < 0) k = Math.min(k, (pad - ox) / dx);
        if (dy > 0) k = Math.min(k, (arrowH - pad - oy) / dy); else if (dy < 0) k = Math.min(k, (22 + pad - oy) / dy);
        var cut = k < 1;
        svgEl('line', { x1: ox, y1: oy, x2: ox + dx * k, y2: oy + dy * k, 'class': 'p03-est' + (cut ? ' is-cut' : ''), 'marker-end': 'url(#p03-ah-model)' }, g);
      });
      svgEl('line', { x1: ox, y1: oy, x2: ox + L, y2: oy, 'class': 'p03-true', 'marker-end': 'url(#p03-ah-ink)' }, g);
      svgEl('circle', { cx: ox, cy: oy, r: 3.5, 'class': 'p03-origin' }, g);
      text(svg, ox + L + 2, oy + 22, 'full-data gradient', { 'class': 'p03-t p03-small p03-ink-t p03-halo', 'text-anchor': 'middle' });
      text(svg, 8, arrowH - 8, 'spread shrinks as 1/√B', { 'class': 'p03-t p03-small p03-model-t p03-halo' });

      /* (b) the two efficiencies as bars */
      var perStep = 1 / (1 + B_NOISE / B), perEx = 1 / (1 + B / B_NOISE);
      var gb = svgEl('g', { transform: 'translate(' + barsX + ',' + barsY + ')' }, svg);
      text(gb, 0, 15, '(b) what one step achieves', { 'class': 'p03-t p03-ptitle' });
      var bw = barsW - 52, rows = [
        { y: 44, v: perStep, cls: 'p03-bar-step', name: 'progress per step', sub: ph ? 'vs. full-data gradient' : 'compared with a step on the full-data gradient' },
        { y: 112, v: perEx, cls: 'p03-bar-ex', name: 'progress per example', sub: ph ? 'vs. a very small batch' : 'compared with a very small batch' }
      ];
      rows.forEach(function (r) {
        text(gb, 0, r.y, r.name, { 'class': 'p03-t p03-label' });
        text(gb, 0, r.y + 16, r.sub, { 'class': 'p03-t p03-small p03-ink2' });
        svgEl('rect', { x: 0, y: r.y + 24, width: bw, height: 16, 'class': 'p03-bar-bg' }, gb);
        svgEl('rect', { x: 0, y: r.y + 24, width: bw * r.v, height: 16, 'class': r.cls }, gb);
        text(gb, bw + 6, r.y + 37, pct(r.v), { 'class': 'p03-t p03-label' });
      });
      svgEl('line', { x1: bw / 2, x2: bw / 2, y1: 60, y2: 180, 'class': 'p03-guide' }, gb);
      text(gb, bw / 2 + 4, 194, '50%: B equals the noise scale', { 'class': 'p03-t p03-small p03-ink2' });
    }
    var redraw = responsive(plotHost, draw);
    function say() {
      var B = state.B, s = 1 + B_NOISE / B, e = 1 + B / B_NOISE;
      readout.textContent = 'At batch size ' + fmtInt(B) + ' the run needs ' + fmtSig(s, 3) + '× the minimum number of steps and ' +
        fmtSig(e, 3) + '× the minimum number of examples (noise scale ' + B_NOISE + ').';
    }
    var slider = powSlider(ctlHost, { id: 'fig-noise', label: 'Batch size', min: 8, max: 4096, value: state.B,
      onChange: function (B) { state.B = B; redraw(); say(); } });
    say();
    register('fig-noise', { set: function (B) { slider.set(B); }, reset: function () { slider.set(32); } });
  }

  /* ================= Figure: three regimes (static) ================= */
  function initRegimes(fig) {
    var host = fig.querySelector('.p03-canvas');
    responsive(host, function (W) {
      var ph = W < 600, left = ph ? 80 : 84, right = ph ? 18 : 38, h = ph ? 230 : 280, top = ph ? 34 : 30;
      var H = top + h + 48;
      var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'class': 'p03-svg', role: 'img',
        'aria-label': 'Steps needed against batch size on log axes: perfect scaling, diminishing returns and maximal data parallelism' }, host);
      var f = frame(svg, {
        left: left, top: top, w: W - left - right, h: h, xd: [0.01, 100], yd: [0.7, 140],
        xTicks: ph ? [0.1, 1, 10] : [0.01, 0.1, 1, 10, 100], xFmt: function (v) { return v === 1 ? 'B_crit' : v < 1 ? (v === 0.1 ? 'B_crit/10' : 'B_crit/100') : (v === 10 ? '10 B_crit' : '100 B_crit'); },
        yTicks: [1, 2, 10, 100], yFmt: function (v) { return v === 1 ? 'S_min' : v + ' S_min'; },
        xLabel: 'batch size (log scale)', yLabel: ph ? 'steps needed' : 'steps needed (log scale)'
      });
      /* regime bands */
      var bands = [[0.01, 0.2, 'perfect scaling', 'p03-band-a'], [0.2, 10, 'diminishing returns', 'p03-band-b'], [10, 100, ph ? 'plateau' : 'maximal data parallelism', 'p03-band-c']];
      bands.forEach(function (b) {
        svgEl('rect', { x: f.x(b[0]), y: 0, width: f.x(b[1]) - f.x(b[0]), height: f.h, 'class': b[3] }, f.g);
        var cx = (f.x(b[0]) + f.x(b[1])) / 2;
        text(f.g, cx, -10, b[2], { 'text-anchor': 'middle', 'class': 'p03-t p03-label p03-ink2' });
      });
      /* perfect-scaling line and floor */
      svgEl('path', { d: pathOf([[f.x(0.01), f.y(100)], [f.x(1 / 0.7), f.y(0.7)]]), 'class': 'p03-curve p03-ref' }, f.g);
      svgEl('line', { x1: 0, x2: f.w, y1: f.y(1), y2: f.y(1), 'class': 'p03-curve p03-ref' }, f.g);
      if (!ph) text(f.g, f.x(0.02) + 6, f.y(1 / 0.02) - 6, 'halves with each doubling', { 'class': 'p03-t p03-small p03-ink2', 'transform': '' });
      var pts = [];
      for (var e = -2; e <= 2.0001; e += 0.02) { var x = Math.pow(10, e); pts.push([f.x(x), f.y(1 + 1 / x)]); }
      svgEl('path', { d: pathOf(pts), 'class': 'p03-curve p03-fourth' }, f.g);
      /* named points */
      var named = [
        { x: 0.2, name: 'B_crit/5', dx: 9, dy: -8, anchor: 'start' },
        { x: 1, name: 'B_crit', dx: 9, dy: -8, anchor: 'start' },
        { x: 10, name: '10 B_crit', dx: 0, dy: -13, anchor: 'middle' }
      ];
      named.forEach(function (n) {
        var cx = f.x(n.x), cy = f.y(1 + 1 / n.x);
        svgEl('circle', { cx: cx, cy: cy, r: 5.5, 'class': 'p03-named' }, f.g);
        text(f.g, cx + n.dx, cy + n.dy, n.name, { 'class': 'p03-t p03-label p03-fourth-t', 'text-anchor': n.anchor });
      });
    });
  }

  /* ================= Figure: best learning rate (static) ================= */
  function initRetune(fig) {
    var host = fig.querySelector('.p03-canvas');
    responsive(host, function (W) {
      var ph = W < 600, left = ph ? 84 : 84, right = ph ? 18 : 38, h = ph ? 210 : 240, top = 14;
      var H = top + h + 48;
      var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'class': 'p03-svg', role: 'img',
        'aria-label': 'Best SGD learning rate against batch size: proportional to batch size below the noise scale, then flat' }, host);
      var f = frame(svg, {
        left: left, top: top, w: W - left - right, h: h, xd: [0.01, 100], yd: [0.004, 2.5],
        xTicks: ph ? [0.1, 1, 10] : [0.01, 0.1, 1, 10, 100], xFmt: function (v) { return v === 1 ? 'B_noise' : v === 0.1 ? 'B_noise/10' : v === 0.01 ? 'B_noise/100' : v === 10 ? '10 B_noise' : '100 B_noise'; },
        yTicks: [0.01, 0.1, 1], yFmt: function (v) { return v === 1 ? 'η_max' : v === 0.1 ? 'η_max/10' : 'η_max/100'; },
        xLabel: 'batch size (log scale)', yLabel: ph ? 'best learning rate' : 'best learning rate (log scale)'
      });
      /* linear rule through the small-batch end and square-root rule through the same point */
      var x0 = 0.01, y0 = 1 / (1 + 1 / x0);
      var lin = [[f.x(x0), f.y(y0)], [f.x(2.5 / y0 * x0), f.y(2.5)]];
      svgEl('path', { d: pathOf(lin), 'class': 'p03-curve p03-ref' }, f.g);
      var sq = []; for (var e = -2; e <= 2.0001; e += 0.05) { var xx = Math.pow(10, e); sq.push([f.x(xx), f.y(y0 * Math.sqrt(xx / x0))]); }
      svgEl('path', { d: pathOf(sq), 'class': 'p03-curve p03-ref p03-dotted' }, f.g);
      var pts = []; for (e = -2; e <= 2.0001; e += 0.02) { var x = Math.pow(10, e); pts.push([f.x(x), f.y(1 / (1 + 1 / x))]); }
      svgEl('path', { d: pathOf(pts), 'class': 'p03-curve p03-model' }, f.g);
      text(f.g, f.x(0.25) - 6, f.y(0.4), ph ? 'linear, η ∝ B' : 'linear scaling rule, η ∝ B', { 'class': 'p03-t p03-small p03-ink2', 'text-anchor': 'end' });
      text(f.g, f.x(3), f.y(y0 * Math.sqrt(3 / x0)) + 18, ph ? 'η ∝ √B' : 'square-root rule, η ∝ √B', { 'class': 'p03-t p03-small p03-ink2' });
      text(f.g, f.x(ph ? 12 : 20), f.y(1) - 10, ph ? 'SGD model' : 'SGD, McCandlish et al. Eq. 2.6', { 'class': 'p03-t p03-small p03-model-t', 'text-anchor': 'middle' });
    });
  }

  document.addEventListener('tp:ready', function () {
    var map = { 'fig-hardware': initHardware, 'fig-noise': initNoise, 'fig-regimes': initRegimes, 'fig-retune': initRetune };
    Object.keys(map).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { try { map[id](el); } catch (e) { console.error('p03: ' + id + ' failed: ' + e); } }
    });
  });
})();
