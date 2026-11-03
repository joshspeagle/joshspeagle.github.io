/*
 * p09-schematics.js: the drawn schematics of Post 9 that need geometry or repetition.
 *
 *   fig-checkpoint-buffer   a validation curve with an evaluation every 1,000 steps, the three
 *                           lowest evaluations ranked, the last checkpoint marked, and the buffer's
 *                           three slots beside the plot (below it on a phone). The values are drawn
 *                           for illustration (the caption says so). The page's sr-only text names
 *                           the buffer's steps, 9,000, 11,000 and 14,000; keep them in step.
 *   fig-norm-multihost      four small grids of activations (16 examples on 2 devices by 6
 *                           features) with the cells one mean and variance use shaded, for
 *                           per-device, synchronized and ghost batch norm and for layer norm.
 *
 * Schematics carry no TP.fig contract. The SVG is drawn at the container's pixel width with
 * fixed-size text, and redrawn when that width changes, so text never scales below 12 px.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};
  var SVGNS = 'http://www.w3.org/2000/svg';

  function svgEl(name, attrs, parent) {
    var n = document.createElementNS(SVGNS, name);
    for (var k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function text(parent, x, y, str, cls, anchor) {
    var t = svgEl('text', { x: x, y: y, 'class': cls || '', 'text-anchor': anchor || 'start' }, parent);
    t.textContent = str;
    return t;
  }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function int(v) { return TP.fmt && TP.fmt.byName ? TP.fmt.byName('int')(v) : String(v); }
  function onWidth(node, fn) {
    var last = 0;
    function go() { var w = Math.round(node.clientWidth); if (w && w !== last) { last = w; fn(w); } }
    go();
    if (window.ResizeObserver) new ResizeObserver(go).observe(node);
    else window.addEventListener('resize', go);
  }

  /* ============================== checkpoint buffer ============================== */

  var CKPT = [
    [1000, 0.300], [2000, 0.272], [3000, 0.257], [4000, 0.249], [5000, 0.244], [6000, 0.241],
    [7000, 0.2385], [8000, 0.2372], [9000, 0.2318], [10000, 0.2372], [11000, 0.2325], [12000, 0.2361],
    [13000, 0.2388], [14000, 0.2331], [15000, 0.2367], [16000, 0.2352], [17000, 0.2394], [18000, 0.2346],
    [19000, 0.2378], [20000, 0.2391]
  ].map(function (r) { return { step: r[0], value: r[1] }; });
  var N_BEST = 3;

  function drawCheckpoint(root) {
    root.textContent = '';
    var plot = el('div', 'p09-ckpt-plot'), buf = el('div', 'p09-ckpt-buffer');
    root.appendChild(plot); root.appendChild(buf);
    var ranked = CKPT.slice().sort(function (a, b) { return a.value - b.value; }).slice(0, N_BEST);
    var rankOf = {};
    ranked.forEach(function (r, i) { rankOf[r.step] = i + 1; });
    var last = CKPT[CKPT.length - 1];

    buf.appendChild(el('div', 'p09-ckpt-buffer-head', 'Buffer (N = ' + N_BEST + ')'));
    var slots = el('ol', 'p09-ckpt-slots');
    ranked.forEach(function (r, i) {
      var li = el('li', 'p09-ckpt-slot' + (i === 0 ? ' is-top' : ''));
      li.innerHTML = '<span class="p09-ckpt-rank">' + (i + 1) + '</span><span class="p09-ckpt-step">step ' + int(r.step) +
        '</span><span class="p09-ckpt-val">' + r.value.toFixed(4) + '</span>';
      slots.appendChild(li);
    });
    buf.appendChild(slots);
    buf.appendChild(el('div', 'p09-ckpt-buffer-foot', 'Slot 1 is the trial’s result.'));

    onWidth(plot, function (W) {
      plot.textContent = '';
      var phone = W < 420;
      var m = { t: 16, r: 14, b: 38, l: phone ? 62 : 64 }, H = phone ? 190 : 210;
      var pw = W - m.l - m.r, ph = H - m.t - m.b;
      var x0 = 0, x1 = 20500, y0 = 0.228, y1 = 0.302;
      var X = function (s) { return m.l + (s - x0) / (x1 - x0) * pw; };
      var Y = function (v) { return m.t + (1 - (v - y0) / (y1 - y0)) * ph; };
      var svg = svgEl('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, 'class': 'p09-sch-svg' }, plot);
      [0.24, 0.26, 0.28, 0.30].forEach(function (v) {
        svgEl('line', { x1: m.l, x2: m.l + pw, y1: Y(v), y2: Y(v), 'class': 'p09-sch-grid' }, svg);
        text(svg, m.l - 8, Y(v) + 4, v.toFixed(2), 'p09-sch-tick', 'end');
      });
      (phone ? [0, 10000, 20000] : [0, 5000, 10000, 15000, 20000]).forEach(function (s) {
        text(svg, X(s), m.t + ph + 16, int(s), 'p09-sch-tick', s === 0 ? 'start' : 'middle');
      });
      svgEl('line', { x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph, 'class': 'p09-sch-axis' }, svg);
      text(svg, m.l + pw / 2, H - 4, 'step', 'p09-sch-axisname', 'middle');
      var yl = text(svg, 0, 0, 'validation error', 'p09-sch-axisname', 'middle');
      yl.setAttribute('transform', 'translate(' + 11 + ',' + (m.t + ph / 2) + ') rotate(-90)');
      var d = CKPT.map(function (r, i) { return (i ? 'L' : 'M') + X(r.step).toFixed(1) + ',' + Y(r.value).toFixed(1); }).join('');
      svgEl('path', { d: d, 'class': 'p09-ckpt-line' }, svg);
      CKPT.forEach(function (r) {
        var rk = rankOf[r.step];
        if (rk) return;
        svgEl('circle', { cx: X(r.step), cy: Y(r.value), r: r === last ? 5 : 3.5, 'class': r === last ? 'p09-ckpt-last' : 'p09-ckpt-dot' }, svg);
      });
      ranked.forEach(function (r, i) {
        var cx = X(r.step), cy = Y(r.value);
        svgEl('circle', { cx: cx, cy: cy, r: 9, 'class': 'p09-ckpt-kept' + (i === 0 ? ' is-top' : '') }, svg);
        text(svg, cx, cy + 4, String(i + 1), 'p09-ckpt-kept-num', 'middle');
      });
      /* the last checkpoint's name, above it */
      var lx = X(last.step), ly = Y(last.value);
      text(svg, lx, ly - 12, phone ? 'last' : 'last checkpoint', 'p09-ckpt-lastname', 'end');
      /* the level the run fluctuates about */
      if (!phone) text(svg, X(5600), Y(0.2448) - 10, 'levels off, then fluctuates', 'p09-sch-note', 'start');
    });
  }

  /* ============================== normalization grids ============================== */

  var ROWS = 16, COLS = 6, DEV = 8, FEAT = 2;
  var NORMS = [
    { id: 'bn', name: 'Per-device batch norm', n: 'n = B / D = 8', b: true, d: true,
      cell: function (r, c) { return c !== FEAT ? '' : r < DEV ? 'on' : 'alt'; } },
    { id: 'sync', name: 'Synchronized batch norm', n: 'n = B = 16', b: true, d: false,
      cell: function (r, c) { return c === FEAT ? 'on' : ''; } },
    { id: 'ghost', name: 'Ghost batch norm', n: 'n = 4, fixed', b: false, d: false,
      cell: function (r, c) { if (c !== FEAT) return ''; var g = Math.floor(r / 4); return g === 0 ? 'on' : g % 2 ? 'alt2' : 'alt'; } },
    { id: 'ln', name: 'Layer norm', n: '6 features of one example', b: false, d: false,
      cell: function (r, c) { return r === 5 ? 'on' : ''; } }
  ];

  function drawNorm(root) {
    root.textContent = '';
    NORMS.forEach(function (N) {
      var card = el('div', 'p09-norm-card is-' + N.id);
      card.appendChild(el('h3', 'p09-norm-name', N.name));
      var grid = el('div', 'p09-norm-cells');
      for (var r = 0; r < ROWS; r++) {
        if (r === DEV) grid.appendChild(el('span', 'p09-norm-split'));
        for (var c = 0; c < COLS; c++) {
          var k = N.cell(r, c);
          grid.appendChild(el('i', k ? 'is-' + k : ''));
        }
      }
      var devs = el('div', 'p09-norm-devs');
      devs.innerHTML = '<span>device 0</span><span>device 1</span>';
      var body = el('div', 'p09-norm-body');
      body.appendChild(devs);
      body.appendChild(grid);
      card.appendChild(body);
      card.appendChild(el('p', 'p09-norm-n', N.n));
      var dep = el('p', 'p09-norm-dep');
      dep.innerHTML = 'Changes with batch size: <b class="' + (N.b ? 'yes' : 'no') + '">' + (N.b ? 'yes' : 'no') + '</b><br>' +
        'Changes with device count: <b class="' + (N.d ? 'yes' : 'no') + '">' + (N.d ? 'yes' : 'no') + '</b>';
      card.appendChild(dep);
      root.appendChild(card);
    });
  }

  document.addEventListener('tp:ready', function () {
    var ck = document.querySelector('[data-schematic="checkpoint-buffer"]');
    if (ck) drawCheckpoint(ck);
    var nm = document.querySelector('[data-norm-panels]');
    if (nm) drawNorm(nm);
  });
})();
