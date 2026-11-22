/**
 * Hero canvas: Prior-to-Posterior Corner Flow.
 * Smooth continuous normalizing flow morphing an isotropic Gaussian prior into
 * a curved bimodal posterior, rendered with marching-squares iso-density
 * contours, live 1D marginals, curved streamlines, and advected samples.
 *
 * Decorative (canvas is aria-hidden). Theme-native dark/light palettes,
 * deterministic seeded layout, reduced-motion-safe, and pauses off-screen.
 */
(function () {
  var canvas = document.getElementById('hero-sky');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduceMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var printMQ = window.matchMedia ? window.matchMedia('print') : null;
  var reduce = Boolean(reduceMQ && reduceMQ.matches);

  // ---- Config, model parameters & palettes ----
  var DOMAIN = 3.15;
  var GRID_N = 54;
  var CYCLE_SEC = 14.0;
  var REDUCED_TIME = 7.6; // Converged full posterior phase (flowFraction === 1.0)
  var GRID_TICKS = [-2, -1, 0, 1, 2];
  var ISO_FRACS = [0.10, 0.24, 0.42, 0.64, 0.84];
  var TRACER_COUNT = { desktop: 14, stacked: 9 };

  var PRIOR_SIGMA = 1.05;
  var MODE1 = { cx: 0.38, cy: -0.22, sigR: 1.12, sigD: 0.38, bend: 0.36, rOffset: 0.82, ang: -0.52 };
  var MODE2 = { cx: -1.38, cy: 1.32, sigA: 0.50, sigB: 0.25, ang: 0.44, weight: 0.60 };
  var COS1 = Math.cos(MODE1.ang), SIN1 = Math.sin(MODE1.ang);
  var COS2 = Math.cos(MODE2.ang), SIN2 = Math.sin(MODE2.ang);

  var PAL = {
    dark: {
      dot: '205,216,248',
      copper: '184,128,94',
      label: '164,176,214',
      prior: '148,163,208',
      flowA: '150,125,255',
      flowB: '43,200,216',
      energy: '242,177,58',
      contours: ['88,166,255', '43,200,216', '112,216,232', '242,177,58', '255,214,132'],
      gridAlpha: '0.08',
      priorAlpha: '0.24',
      marginalFill: '43,200,216',
      marginalStroke: '120,216,235',
      marginalFillAlpha: 0.16,
      sample: '218,236,255',
      tracer: '255,226,162'
    },
    light: {
      dot: '65,78,118',
      copper: '138,86,52',
      label: '74,82,110',
      prior: '100,112,148',
      flowA: '67,36,168',
      flowB: '14,141,156',
      energy: '196,109,0',
      contours: ['25,100,200', '14,141,156', '67,36,168', '196,109,0', '152,66,0'],
      gridAlpha: '0.10',
      priorAlpha: '0.28',
      marginalFill: '14,141,156',
      marginalStroke: '14,118,136',
      marginalFillAlpha: 0.14,
      sample: '34,52,108',
      tracer: '188,88,0'
    }
  };

  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function boxMuller(rng) {
    var u = Math.max(1e-7, rng()), v = rng();
    var mag = Math.sqrt(-2 * Math.log(u));
    return [mag * Math.cos(6.2831853 * v), mag * Math.sin(6.2831853 * v)];
  }

  // ---- Static precomputed domain tables ----
  var gridBuf = new Float32Array(GRID_N * GRID_N);
  var margX = new Float32Array(GRID_N);
  var margY = new Float32Array(GRID_N);
  var priorMarg = new Float32Array(GRID_N);
  var margCurve = new Float32Array(GRID_N);
  var unitFracs = new Float32Array(GRID_N);
  var domainX = new Float32Array(GRID_N);
  var domainY = new Float32Array(GRID_N);
  for (var giInit = 0; giInit < GRID_N; giInit++) {
    var uf = giInit / (GRID_N - 1);
    unitFracs[giInit] = uf;
    var xv = lerp(-DOMAIN, DOMAIN, uf);
    domainX[giInit] = xv;
    domainY[giInit] = -xv;
    var z = xv / PRIOR_SIGMA;
    priorMarg[giInit] = Math.exp(-0.5 * z * z);
  }
  var densityStats = { peak: 1, mxMax: 1, myMax: 1 };

  // ---- Pure flow & density math ----
  function targetFromPrior(zx, zy, mode2Flag) {
    if (mode2Flag) {
      var a2 = zx * 0.48, b2 = zy * 0.24;
      return [
        clamp(MODE2.cx + a2 * COS2 - b2 * SIN2, -DOMAIN + 0.15, DOMAIN - 0.15),
        clamp(MODE2.cy + a2 * SIN2 + b2 * COS2, -DOMAIN + 0.15, DOMAIN - 0.15)
      ];
    }
    var r = zx * MODE1.sigR;
    var d = zy * 0.36 + MODE1.bend * (r * r - MODE1.rOffset);
    return [
      clamp(MODE1.cx + r * COS1 - d * SIN1, -DOMAIN + 0.15, DOMAIN - 0.15),
      clamp(MODE1.cy + r * SIN1 + d * COS1, -DOMAIN + 0.15, DOMAIN - 0.15)
    ];
  }

  function flowFraction(t) {
    var cyc = ((t % CYCLE_SEC) + CYCLE_SEC) % CYCLE_SEC / CYCLE_SEC;
    if (cyc < 0.48) return lerp(0.06, 1.0, smoothstep(cyc / 0.48));
    if (cyc < 0.68) return 1.0;
    if (cyc < 0.94) return lerp(1.0, 0.06, smoothstep((cyc - 0.68) / 0.26));
    return 0.06;
  }

  function evaluateDensity(s, out) {
    var cx1 = MODE1.cx * s, cy1 = MODE1.cy * s;
    var bend1 = MODE1.bend * s;
    var rOffsetS = MODE1.rOffset * s;
    var invSigR1 = 1 / lerp(PRIOR_SIGMA, MODE1.sigR, s);
    var invSigD1 = 1 / lerp(PRIOR_SIGMA, MODE1.sigD, s);
    var ang1 = MODE1.ang * -s;
    var c1 = Math.cos(ang1), sn1 = Math.sin(ang1);

    var cx2 = MODE2.cx * s, cy2 = MODE2.cy * s;
    var invSigA2 = 1 / lerp(PRIOR_SIGMA, MODE2.sigA, s);
    var invSigB2 = 1 / lerp(PRIOR_SIGMA, MODE2.sigB, s);
    var ang2 = MODE2.ang * -s;
    var c2 = Math.cos(ang2), sn2 = Math.sin(ang2);
    var w2 = MODE2.weight * smoothstep(clamp((s - 0.08) / 0.72, 0, 1));
    var useMode2 = w2 > 0.002;

    margX.fill(0);
    margY.fill(0);
    var peak = 1e-6;

    for (var iy = 0; iy < GRID_N; iy++) {
      var dy1 = domainY[iy] - cy1;
      var dy1C = -dy1 * sn1;
      var dy1S = dy1 * c1;
      var dy2 = domainY[iy] - cy2;
      var dy2C = -dy2 * sn2;
      var dy2S = dy2 * c2;
      var rowOff = iy * GRID_N;
      var rowSum = 0;

      for (var ix = 0; ix < GRID_N; ix++) {
        var dx1 = domainX[ix] - cx1;
        var r = dx1 * c1 + dy1C;
        var st = dx1 * sn1 + dy1S;
        var d = st - bend1 * (r * r - rOffsetS);
        var u1 = r * invSigR1, v1 = d * invSigD1;
        var val = Math.exp(-0.5 * (u1 * u1 + v1 * v1));

        if (useMode2) {
          var dx2 = domainX[ix] - cx2;
          var a = dx2 * c2 + dy2C;
          var b = dx2 * sn2 + dy2S;
          var u2 = a * invSigA2, v2 = b * invSigB2;
          val += w2 * Math.exp(-0.5 * (u2 * u2 + v2 * v2));
        }

        gridBuf[rowOff + ix] = val;
        if (val > peak) peak = val;
        margX[ix] += val;
        rowSum += val;
      }
      margY[iy] = rowSum;
    }

    var mxMax = 1e-6, myMax = 1e-6;
    for (var k = 0; k < GRID_N; k++) {
      if (margX[k] > mxMax) mxMax = margX[k];
      if (margY[k] > myMax) myMax = margY[k];
    }
    out.peak = peak;
    out.mxMax = mxMax;
    out.myMax = myMax;
  }

  // ---- Marching squares contour extraction ----
  function interpEdge(a, b, va, vb, level) {
    var den = vb - va;
    var frac = Math.abs(den) < 1e-7 ? 0.5 : clamp((level - va) / den, 0, 1);
    return a + frac * (b - a);
  }

  function strokeCell(g, mask, px, py, step, v0, v1, v2, v3, level) {
    var tx, ty, rx, ry, bx, by, lx, ly;
    if (mask === 1 || mask === 3 || mask === 5 || mask === 7 || mask === 8 || mask === 10 || mask === 12 || mask === 14) {
      lx = px;
      ly = interpEdge(py, py + step, v0, v3, level);
    }
    if (mask === 1 || mask === 2 || mask === 5 || mask === 6 || mask === 9 || mask === 10 || mask === 13 || mask === 14) {
      bx = interpEdge(px, px + step, v3, v2, level);
      by = py + step;
    }
    if (mask === 2 || mask === 3 || mask === 4 || mask === 5 || mask === 10 || mask === 11 || mask === 12 || mask === 13) {
      rx = px + step;
      ry = interpEdge(py, py + step, v1, v2, level);
    }
    if (mask === 4 || mask === 5 || mask === 6 || mask === 7 || mask === 8 || mask === 9 || mask === 10 || mask === 11) {
      tx = interpEdge(px, px + step, v0, v1, level);
      ty = py;
    }
    switch (mask) {
      case 1: case 14: g.moveTo(lx, ly); g.lineTo(bx, by); break;
      case 2: case 13: g.moveTo(bx, by); g.lineTo(rx, ry); break;
      case 3: case 12: g.moveTo(lx, ly); g.lineTo(rx, ry); break;
      case 4: case 11: g.moveTo(tx, ty); g.lineTo(rx, ry); break;
      case 5:
        g.moveTo(lx, ly); g.lineTo(tx, ty);
        g.moveTo(bx, by); g.lineTo(rx, ry);
        break;
      case 6: case 9: g.moveTo(tx, ty); g.lineTo(bx, by); break;
      case 7: case 8: g.moveTo(lx, ly); g.lineTo(tx, ty); break;
      case 10:
        g.moveTo(tx, ty); g.lineTo(rx, ry);
        g.moveTo(lx, ly); g.lineTo(bx, by);
        break;
    }
  }

  function strokeIsoLevel(g, grid, n, level, x0, y0, size) {
    var step = size / (n - 1);
    g.beginPath();
    for (var iy = 0; iy < n - 1; iy++) {
      var py = y0 + iy * step;
      var rowOff = iy * n;
      var nextOff = rowOff + n;
      for (var ix = 0; ix < n - 1; ix++) {
        var v0 = grid[rowOff + ix];
        var v1 = grid[rowOff + ix + 1];
        var v2 = grid[nextOff + ix + 1];
        var v3 = grid[nextOff + ix];
        var mask = (v0 >= level ? 8 : 0) | (v1 >= level ? 4 : 0) | (v2 >= level ? 2 : 0) | (v3 >= level ? 1 : 0);
        if (mask === 0 || mask === 15) continue;
        strokeCell(g, mask, x0 + ix * step, py, step, v0, v1, v2, v3, level);
      }
    }
    g.stroke();
  }

  // ---- Layout & deterministic scene builder ----
  var W = 0, H = 0, DPR = 1;
  var bgStars = [], samples = [], streamlines = [];
  var theme = document.documentElement.getAttribute('data-theme') || 'dark';
  var pal = PAL[theme] || PAL.dark;
  var running = false, visible = true, stageReady = false, needsRebuild = true, dirtyPaint = false;
  var rafId = null, simTime = 5.8, lastPerf = 0;
  var stage = { px: 0, py: 0, size: 0, marg: 0, gap: 8, scale: 1, isStacked: false, nTracers: 0 };

  function measureHeroTextRight(canvasRect) {
    var right = canvasRect.width * 0.50;
    var nameEl = document.querySelector('.hero-title .hero-name');
    if (nameEl) right = Math.max(right, nameEl.getBoundingClientRect().right - canvasRect.left);
    var zhEl = document.querySelector('.hero-title .zh');
    if (zhEl) right = Math.max(right, zhEl.getBoundingClientRect().right - canvasRect.left);
    var tagEl = document.querySelector('.hero-inner .tagline');
    if (tagEl && document.createRange) {
      try {
        var rngT = document.createRange();
        rngT.selectNodeContents(tagEl);
        right = Math.max(right, rngT.getBoundingClientRect().right - canvasRect.left);
      } catch (_err) {
        right = Math.max(right, tagEl.getBoundingClientRect().right - canvasRect.left);
      }
    }
    return right + 38;
  }

  function domainToPxX(ux) { return stage.px + (ux + DOMAIN) * stage.scale; }
  function domainToPxY(uy) { return stage.py + (DOMAIN - uy) * stage.scale; }

  function build() {
    var rect = canvas.getBoundingClientRect();
    var cs = window.getComputedStyle(canvas);
    if (cs.display === 'none' || rect.width < 1 || rect.height < 1) {
      needsRebuild = true;
      return false;
    }

    W = rect.width;
    H = rect.height;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var isStacked = cs.position !== 'absolute';
    stage.isStacked = isStacked;
    if (isStacked) {
      stage.gap = H < 255 ? 6 : 8;
      stage.marg = Math.round(clamp(H * 0.165, 32, 44));
      var maxSz = Math.min(H - stage.marg - stage.gap - 34, W - stage.marg - stage.gap - 54);
      stage.size = Math.round(clamp(maxSz, 120, 190));
      var totalS = stage.size + stage.gap + stage.marg;
      stage.px = Math.round((W - totalS) * 0.5 + 8);
      stage.py = Math.round((H - totalS) * 0.5 + stage.marg + stage.gap - 4);
    } else {
      var textRight = measureHeroTextRight(rect);
      var rightLimit = W - 28;
      var gapAvail = rightLimit - textRight;
      var availW = Math.min(480, Math.max(120, gapAvail));
      var availH = Math.min(435, H - 68);
      stage.gap = availW < 360 ? 8 : 10;
      var rawTotal = Math.max(80, Math.min(availW - 24, availH - 28));
      stage.size = Math.round(rawTotal * 0.77);
      stage.marg = Math.round(rawTotal * 0.21);
      var totalD = stage.size + stage.gap + stage.marg;
      stage.px = Math.round(textRight + Math.max(0, gapAvail - totalD) * 0.52);
      stage.py = Math.round((H - totalD) * 0.5 + stage.marg + stage.gap);
    }
    stage.scale = stage.size / (2 * DOMAIN);

    var rng = mulberry32(42071);

    bgStars = [];
    var nBg = isStacked ? 28 : 54;
    for (var i = 0; i < nBg; i++) {
      var bx = rng() * W;
      var fadeLeft = isStacked ? 1 : clamp((bx - W * 0.04) / (W * 0.42), 0.18, 1);
      bgStars.push({
        x: bx,
        y: rng() * H,
        r: 0.55 + rng() * 0.8,
        a: (0.14 + rng() * 0.26) * fadeLeft,
        ph: rng() * 6.283
      });
    }

    samples = [];
    var nSamples = isStacked ? 84 : 128;
    var nTracers = isStacked ? TRACER_COUNT.stacked : TRACER_COUNT.desktop;
    stage.nTracers = nTracers;
    for (var si = 0; si < nSamples; si++) {
      var g = boxMuller(rng);
      var zx = clamp(g[0] * PRIOR_SIGMA, -DOMAIN + 0.2, DOMAIN - 0.2);
      var zy = clamp(g[1] * PRIOR_SIGMA, -DOMAIN + 0.2, DOMAIN - 0.2);
      var isM2 = rng() < 0.26;
      var tgt = targetFromPrior(g[0], g[1], isM2);
      var tx = tgt[0], ty = tgt[1];
      var swirl = (rng() - 0.5) * 0.9;
      var mx = 0.5 * (zx + tx) - (ty - zy) * 0.22 * swirl;
      var my = 0.5 * (zy + ty) + (tx - zx) * 0.22 * swirl;
      samples.push({
        px0: domainToPxX(zx),
        py0: domainToPxY(zy),
        pmx: domainToPxX(mx),
        pmy: domainToPxY(my),
        ptx: domainToPxX(tx),
        pty: domainToPxY(ty),
        r: (isStacked ? (1.1 + rng() * 0.7) : (1.35 + rng() * 0.85)) + (si < nTracers ? 0.45 : 0)
      });
    }

    streamlines = [];
    var nStreams = isStacked ? 14 : 22;
    for (var fi = 0; fi < nStreams; fi++) {
      var ref = samples[Math.floor((fi / nStreams) * samples.length)];
      streamlines.push({
        px0: ref.px0, py0: ref.py0,
        pmx: ref.pmx, pmy: ref.pmy,
        ptx: ref.ptx, pty: ref.pty,
        grad: null, gradS: -1, gradTheme: ''
      });
    }

    stageReady = true;
    needsRebuild = false;
    return true;
  }

  // ---- Single-purpose render passes ----
  function drawBgStars(time) {
    var phaseT = time * 0.7;
    for (var bi = 0; bi < bgStars.length; bi++) {
      var bs = bgStars[bi];
      var tw = reduce ? 1 : (0.72 + 0.28 * Math.sin(phaseT + bs.ph));
      ctx.fillStyle = 'rgba(' + pal.dot + ',' + (bs.a * tw).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(bs.x, bs.y, bs.r, 0, 6.2832);
      ctx.fill();
    }
  }

  function drawPaneBackdrop(x0, y0, sz) {
    ctx.strokeStyle = 'rgba(' + pal.copper + ',' + pal.gridAlpha + ')';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gi = 0; gi < GRID_TICKS.length; gi++) {
      var gx = domainToPxX(GRID_TICKS[gi]), gy = domainToPxY(GRID_TICKS[gi]);
      ctx.moveTo(gx, y0); ctx.lineTo(gx, y0 + sz);
      ctx.moveTo(x0, gy); ctx.lineTo(x0 + sz, gy);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(' + pal.prior + ',' + pal.priorAlpha + ')';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    var cx0 = domainToPxX(0), cy0 = domainToPxY(0);
    for (var pr = 1; pr <= 2; pr++) {
      ctx.beginPath();
      ctx.arc(cx0, cy0, PRIOR_SIGMA * pr * stage.scale, 0, 6.2832);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawStreamlines(s) {
    var stop0 = 'rgba(' + pal.flowA + ',0.04)';
    var stopMid = 'rgba(' + pal.flowB + ',' + (0.14 + 0.10 * s).toFixed(3) + ')';
    var stopEnd = 'rgba(' + pal.energy + ',' + (0.08 + 0.14 * s).toFixed(3) + ')';
    ctx.lineWidth = 0.85;
    for (var fi = 0; fi < streamlines.length; fi++) {
      var fl = streamlines[fi];
      if (!fl.grad || fl.gradTheme !== theme || Math.abs(fl.gradS - s) >= 0.015) {
        var grad = ctx.createLinearGradient(fl.px0, fl.py0, fl.ptx, fl.pty);
        grad.addColorStop(0, stop0);
        grad.addColorStop(0.55, stopMid);
        grad.addColorStop(1, stopEnd);
        fl.grad = grad;
        fl.gradS = s;
        fl.gradTheme = theme;
      }
      ctx.strokeStyle = fl.grad;
      ctx.beginPath();
      ctx.moveTo(fl.px0, fl.py0);
      ctx.quadraticCurveTo(fl.pmx, fl.pmy, fl.ptx, fl.pty);
      ctx.stroke();
    }
  }

  function drawContours(x0, y0, sz, peak) {
    for (var li = 0; li < ISO_FRACS.length; li++) {
      ctx.strokeStyle = 'rgba(' + pal.contours[li] + ',' + (0.42 + li * 0.11).toFixed(2) + ')';
      ctx.lineWidth = li >= 3 ? 1.45 : (li === 2 ? 1.2 : 1.0);
      strokeIsoLevel(ctx, gridBuf, GRID_N, peak * ISO_FRACS[li], x0, y0, sz);
    }
  }

  function drawSamples(s) {
    var nTr = stage.nTracers;
    var u = 1 - s, w0 = u * u, w1 = 2 * u * s, w2 = s * s;

    // 1. Tracer tails
    if (!reduce && nTr > 0) {
      var tailS = clamp(s - 0.12, 0.04, 1.0);
      var tu = 1 - tailS, tw0 = tu * tu, tw1 = 2 * tu * tailS, tw2 = tailS * tailS;
      ctx.strokeStyle = 'rgba(' + pal.tracer + ',0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (var ti = 0; ti < nTr; ti++) {
        var tr = samples[ti];
        ctx.moveTo(tw0 * tr.px0 + tw1 * tr.pmx + tw2 * tr.ptx, tw0 * tr.py0 + tw1 * tr.pmy + tw2 * tr.pty);
        ctx.lineTo(w0 * tr.px0 + w1 * tr.pmx + w2 * tr.ptx, w0 * tr.py0 + w1 * tr.pmy + w2 * tr.pty);
      }
      ctx.stroke();
    }

    // 2. Tracer heads
    if (nTr > 0) {
      ctx.fillStyle = 'rgba(' + pal.energy + ',0.95)';
      ctx.beginPath();
      for (var hi = 0; hi < nTr; hi++) {
        var hd = samples[hi];
        var hx = w0 * hd.px0 + w1 * hd.pmx + w2 * hd.ptx;
        var hy = w0 * hd.py0 + w1 * hd.pmy + w2 * hd.pty;
        ctx.moveTo(hx + hd.r, hy);
        ctx.arc(hx, hy, hd.r, 0, 6.2832);
      }
      ctx.fill();
    }

    // 3. Regular posterior samples
    ctx.fillStyle = 'rgba(' + pal.sample + ',' + (0.50 + 0.25 * s).toFixed(2) + ')';
    ctx.beginPath();
    for (var si = nTr; si < samples.length; si++) {
      var sm = samples[si];
      var sx = w0 * sm.px0 + w1 * sm.pmx + w2 * sm.ptx;
      var sy = w0 * sm.py0 + w1 * sm.pmy + w2 * sm.pty;
      ctx.moveTo(sx + sm.r, sy);
      ctx.arc(sx, sy, sm.r, 0, 6.2832);
    }
    ctx.fill();
  }

  function drawMarginal(vals, maxVal, spanStart, base, sz, extent, isVertical) {
    var sign = isVertical ? 1 : -1;
    var priorAmp = extent * 0.76;
    var curveAmp = extent * 0.90;
    for (var i = 0; i < GRID_N; i++) {
      margCurve[i] = (vals[i] / maxVal) * curveAmp;
    }

    ctx.save();
    ctx.strokeStyle = 'rgba(' + pal.prior + ',0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (var ip = 0; ip < GRID_N; ip++) {
      var coordP = spanStart + unitFracs[ip] * sz;
      var offP = base + sign * priorMarg[ip] * priorAmp;
      var pxP = isVertical ? offP : coordP;
      var pyP = isVertical ? coordP : offP;
      if (ip === 0) ctx.moveTo(pxP, pyP); else ctx.lineTo(pxP, pyP);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    if (isVertical) ctx.moveTo(base, spanStart); else ctx.moveTo(spanStart, base);
    for (var ic = 0; ic < GRID_N; ic++) {
      var coordC = spanStart + unitFracs[ic] * sz;
      var offC = base + sign * margCurve[ic];
      ctx.lineTo(isVertical ? offC : coordC, isVertical ? coordC : offC);
    }
    if (isVertical) ctx.lineTo(base, spanStart + sz); else ctx.lineTo(spanStart + sz, base);
    ctx.closePath();
    ctx.fillStyle = 'rgba(' + pal.marginalFill + ',' + pal.marginalFillAlpha + ')';
    ctx.fill();

    ctx.beginPath();
    for (var is = 0; is < GRID_N; is++) {
      var coordS = spanStart + unitFracs[is] * sz;
      var offS = base + sign * margCurve[is];
      var pxS = isVertical ? offS : coordS;
      var pyS = isVertical ? coordS : offS;
      if (is === 0) ctx.moveTo(pxS, pyS); else ctx.lineTo(pxS, pyS);
    }
    ctx.strokeStyle = 'rgba(' + pal.marginalStroke + ',0.9)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  function drawFrameAndLabels(x0, y0, sz, topY, rightX) {
    ctx.strokeStyle = 'rgba(' + pal.copper + ',0.68)';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, sz - 1, sz - 1);

    ctx.strokeStyle = 'rgba(' + pal.copper + ',0.38)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, topY + 0.5); ctx.lineTo(x0 + sz, topY + 0.5);
    ctx.moveTo(rightX - 0.5, y0); ctx.lineTo(rightX - 0.5, y0 + sz);
    for (var ti = 0; ti < GRID_TICKS.length; ti++) {
      var tx = domainToPxX(GRID_TICKS[ti]), ty = domainToPxY(GRID_TICKS[ti]);
      ctx.moveTo(tx, y0 + sz); ctx.lineTo(tx, y0 + sz + 4);
      ctx.moveTo(x0 - 4, ty); ctx.lineTo(x0, ty);
    }
    ctx.stroke();

    ctx.fillStyle = 'rgba(' + pal.label + ',0.88)';
    ctx.font = '500 ' + (stage.isStacked ? 9 : 10) + 'px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(stage.isStacked ? 'θ1 · FLOW POSTERIOR' : 'θ1 (POSTERIOR PARAMETER)', x0 + sz * 0.5, y0 + sz + (stage.isStacked ? 7 : 10));

    ctx.save();
    ctx.translate(x0 - (stage.isStacked ? 14 : 18), y0 + sz * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('θ2', 0, 0);
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(' + pal.label + ',0.78)';
    ctx.font = '500 ' + (stage.isStacked ? 8.5 : 9.5) + 'px "JetBrains Mono", monospace';
    ctx.fillText('p(θ | D)', rightX + 4, topY - 4);
  }

  function render(time) {
    if (!stageReady) return;
    ctx.clearRect(0, 0, W, H);
    var s = flowFraction(time);
    drawBgStars(time);

    var x0 = stage.px, y0 = stage.py, sz = stage.size, marg = stage.marg, gap = stage.gap;
    evaluateDensity(s, densityStats);

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, sz, sz);
    ctx.clip();
    drawPaneBackdrop(x0, y0, sz);
    drawStreamlines(s);
    drawContours(x0, y0, sz, densityStats.peak);
    drawSamples(s);
    ctx.restore();

    var topY = y0 - gap;
    var rightX = x0 + sz + gap;
    drawMarginal(margX, densityStats.mxMax, x0, topY, sz, marg, false);
    drawMarginal(margY, densityStats.myMax, y0, rightX, sz, marg, true);
    drawFrameAndLabels(x0, y0, sz, topY, rightX);
  }

  // ---- Animation & lifecycle management ----
  function paintFrame() {
    if (!stageReady || document.hidden || !visible) {
      dirtyPaint = true;
      return;
    }
    dirtyPaint = false;
    render(reduce ? REDUCED_TIME : simTime);
  }

  function syncAndPaint(rebuildNow) {
    if (!visible || document.hidden) {
      if (rebuildNow) needsRebuild = true;
      dirtyPaint = true;
      return;
    }
    if (rebuildNow || needsRebuild) build();
    paintFrame();
  }

  function loop(now) {
    if (!running) return;
    if (!lastPerf) lastPerf = now;
    var dt = Math.min(0.1, (now - lastPerf) / 1000);
    lastPerf = now;
    simTime += dt;
    render(simTime);
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (running || reduce || !visible || document.hidden) return;
    if (needsRebuild || !stageReady) build();
    if (!stageReady) return;
    if (dirtyPaint) paintFrame();
    running = true;
    lastPerf = 0;
    rafId = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function init() {
    build();
    if (reduce) paintFrame(); else start();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { syncAndPaint(true); });
    }
  }

  if (reduceMQ) {
    var onReduceChange = function (e) {
      reduce = e.matches;
      if (reduce) {
        stop();
        syncAndPaint(false);
      } else {
        start();
      }
    };
    if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onReduceChange);
    else if (reduceMQ.addListener) reduceMQ.addListener(onReduceChange);
  }

  if (printMQ) {
    var onPrintChange = function (e) {
      if (!e.matches) syncAndPaint(true);
    };
    if (printMQ.addEventListener) printMQ.addEventListener('change', onPrintChange);
    else if (printMQ.addListener) printMQ.addListener(onPrintChange);
  }
  window.addEventListener('afterprint', function () { syncAndPaint(true); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) {
        if (needsRebuild) build();
        if (reduce) paintFrame(); else start();
      } else {
        stop();
      }
    }, { threshold: 0.01 }).observe(canvas);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      stop();
    } else {
      if (needsRebuild) build();
      if (reduce) paintFrame(); else start();
    }
  });

  new MutationObserver(function () {
    var t = document.documentElement.getAttribute('data-theme') || 'dark';
    if (t !== theme) {
      theme = t;
      pal = PAL[t] || PAL.dark;
      syncAndPaint(false);
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () { syncAndPaint(true); }, 180);
  });

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
