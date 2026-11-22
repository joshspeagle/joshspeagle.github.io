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
  var reduce = Boolean(reduceMQ && reduceMQ.matches);

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

  var DOMAIN = 3.15;
  var GRID_N = 54;
  var CYCLE_SEC = 14.0;
  var REDUCED_TIME = 7.6; // Converged full posterior phase (flowFraction === 1.0)
  var GRID_TICKS = [-2, -1, 0, 1, 2];
  var ISO_FRACS = [0.10, 0.24, 0.42, 0.64, 0.84];

  function targetFromPrior(zx, zy, mode2Flag) {
    if (mode2Flag) {
      var a2 = zx * 0.48, b2 = zy * 0.24;
      var ang2 = 0.44;
      var rx2 = a2 * Math.cos(ang2) - b2 * Math.sin(ang2);
      var ry2 = a2 * Math.sin(ang2) + b2 * Math.cos(ang2);
      return [
        clamp(-1.38 + rx2, -DOMAIN + 0.15, DOMAIN - 0.15),
        clamp(1.32 + ry2, -DOMAIN + 0.15, DOMAIN - 0.15)
      ];
    }
    var r = zx * 1.12;
    var d = zy * 0.36 + 0.36 * (r * r - 0.82);
    var ang1 = -0.52;
    var rx1 = r * Math.cos(ang1) - d * Math.sin(ang1);
    var ry1 = r * Math.sin(ang1) + d * Math.cos(ang1);
    return [
      clamp(0.38 + rx1, -DOMAIN + 0.15, DOMAIN - 0.15),
      clamp(-0.22 + ry1, -DOMAIN + 0.15, DOMAIN - 0.15)
    ];
  }

  function interpEdge(a, b, va, vb, level) {
    var den = vb - va;
    var frac = Math.abs(den) < 1e-7 ? 0.5 : clamp((level - va) / den, 0, 1);
    return a + frac * (b - a);
  }

  function strokeCell(mask, px, py, step, v0, v1, v2, v3, level) {
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
      case 1: case 14: ctx.moveTo(lx, ly); ctx.lineTo(bx, by); break;
      case 2: case 13: ctx.moveTo(bx, by); ctx.lineTo(rx, ry); break;
      case 3: case 12: ctx.moveTo(lx, ly); ctx.lineTo(rx, ry); break;
      case 4: case 11: ctx.moveTo(tx, ty); ctx.lineTo(rx, ry); break;
      case 5:
        ctx.moveTo(lx, ly); ctx.lineTo(tx, ty);
        ctx.moveTo(bx, by); ctx.lineTo(rx, ry);
        break;
      case 6: case 9: ctx.moveTo(tx, ty); ctx.lineTo(bx, by); break;
      case 7: case 8: ctx.moveTo(lx, ly); ctx.lineTo(tx, ty); break;
      case 10:
        ctx.moveTo(tx, ty); ctx.lineTo(rx, ry);
        ctx.moveTo(lx, ly); ctx.lineTo(bx, by);
        break;
    }
  }

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
      marginalFill: '14,141,156',
      marginalStroke: '14,118,136',
      marginalFillAlpha: 0.14,
      sample: '34,52,108',
      tracer: '188,88,0'
    }
  };

  var W = 0, H = 0, DPR = 1;
  var bgStars = [], samples = [], streamlines = [];
  var theme = document.documentElement.getAttribute('data-theme') || 'dark';
  var pal = PAL[theme] || PAL.dark;
  var running = false, visible = true, rafId = null;
  var simTime = 5.8, lastPerf = 0;

  var gridBuf = new Float32Array(GRID_N * GRID_N);
  var margX = new Float32Array(GRID_N);
  var margY = new Float32Array(GRID_N);
  var priorMarg = new Float32Array(GRID_N);

  var stage = { px: 0, py: 0, size: 0, mh: 0, mw: 0, gap: 8, isStacked: false };

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

  function build() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(320, rect.width);
    H = Math.max(200, rect.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var isStacked = window.getComputedStyle(canvas).position !== 'absolute';
    stage.isStacked = isStacked;
    if (isStacked) {
      stage.gap = H < 255 ? 6 : 8;
      stage.mh = Math.round(clamp(H * 0.165, 32, 44));
      stage.mw = stage.mh;
      var maxSz = Math.min(H - stage.mh - stage.gap - 34, W - stage.mw - stage.gap - 54);
      stage.size = Math.round(clamp(maxSz, 120, 190));
      var totalW = stage.size + stage.gap + stage.mw;
      var totalH = stage.mh + stage.gap + stage.size;
      stage.px = Math.round((W - totalW) * 0.5 + 8);
      stage.py = Math.round((H - totalH) * 0.5 + stage.mh + stage.gap - 4);
    } else {
      var textRight = measureHeroTextRight(rect);
      var rightLimit = W - 28;
      var availW = Math.max(220, Math.min(480, rightLimit - textRight));
      var availH = Math.min(435, H - 68);
      stage.gap = availW < 360 ? 8 : 10;
      var rawTotal = Math.min(availW - 28, availH - 28);
      stage.size = Math.round(rawTotal * 0.77);
      stage.mw = Math.round(rawTotal * 0.21);
      stage.mh = stage.mw;
      var totalWDesktop = stage.size + stage.gap + stage.mw;
      var totalHDesktop = stage.mh + stage.gap + stage.size;
      var centeredLeft = textRight + (rightLimit - textRight - totalWDesktop) * 0.52;
      var maxLeft = Math.max(textRight, rightLimit - totalWDesktop);
      stage.px = Math.round(clamp(centeredLeft, textRight, maxLeft));
      stage.py = Math.round((H - totalHDesktop) * 0.5 + stage.mh + stage.gap);
    }

    var rng = mulberry32(42071);

    bgStars = [];
    var nBg = isStacked ? 28 : 54;
    for (var i = 0; i < nBg; i++) {
      bgStars.push({
        x: rng() * W,
        y: rng() * H,
        r: 0.55 + rng() * 0.8,
        a: 0.14 + rng() * 0.26,
        ph: rng() * 6.283
      });
    }

    samples = [];
    var nSamples = isStacked ? 84 : 128;
    for (var si = 0; si < nSamples; si++) {
      var g = boxMuller(rng);
      var z0 = g[0] * 1.05, z1 = g[1] * 1.05;
      var isM2 = rng() < 0.26;
      var tgt = targetFromPrior(g[0], g[1], isM2);
      samples.push({
        zx: clamp(z0, -DOMAIN + 0.2, DOMAIN - 0.2),
        zy: clamp(z1, -DOMAIN + 0.2, DOMAIN - 0.2),
        tx: tgt[0],
        ty: tgt[1],
        swirl: (rng() - 0.5) * 0.9,
        r: isStacked ? (1.1 + rng() * 0.7) : (1.35 + rng() * 0.85),
        tracer: si < (isStacked ? 9 : 14)
      });
    }

    streamlines = [];
    var nStreams = isStacked ? 14 : 22;
    for (var fi = 0; fi < nStreams; fi++) {
      streamlines.push(samples[Math.floor((fi / nStreams) * samples.length)]);
    }

    for (var gi = 0; gi < GRID_N; gi++) {
      var xVal = lerp(-DOMAIN, DOMAIN, gi / (GRID_N - 1));
      priorMarg[gi] = Math.exp(-0.5 * (xVal / 1.05) * (xVal / 1.05));
    }
  }

  function flowFraction(t) {
    var cyc = ((t % CYCLE_SEC) + CYCLE_SEC) % CYCLE_SEC / CYCLE_SEC;
    if (cyc < 0.48) return lerp(0.06, 1.0, smoothstep(cyc / 0.48));
    if (cyc < 0.68) return 1.0;
    if (cyc < 0.94) return lerp(1.0, 0.06, smoothstep((cyc - 0.68) / 0.26));
    return 0.06;
  }

  function sampleArcPoint(sp, s) {
    var mx = 0.5 * (sp.zx + sp.tx) - (sp.ty - sp.zy) * 0.22 * sp.swirl;
    var my = 0.5 * (sp.zy + sp.ty) + (sp.tx - sp.zx) * 0.22 * sp.swirl;
    var u = 1 - s;
    return [
      u * u * sp.zx + 2 * u * s * mx + s * s * sp.tx,
      u * u * sp.zy + 2 * u * s * my + s * s * sp.ty
    ];
  }

  function evaluateDensity(s) {
    var cx1 = lerp(0, 0.38, s), cy1 = lerp(0, -0.22, s);
    var bend1 = 0.36 * s;
    var sigR1 = lerp(1.05, 1.12, s);
    var sigD1 = lerp(1.05, 0.38, s);
    var ang1 = -0.52 * s;
    var c1 = Math.cos(-ang1), sn1 = Math.sin(-ang1);

    var cx2 = lerp(0, -1.38, s), cy2 = lerp(0, 1.32, s);
    var sigA2 = lerp(1.05, 0.50, s);
    var sigB2 = lerp(1.05, 0.25, s);
    var ang2 = 0.44 * s;
    var c2 = Math.cos(-ang2), sn2 = Math.sin(-ang2);
    var w2 = 0.60 * smoothstep(clamp((s - 0.08) / 0.72, 0, 1));

    margX.fill(0);
    margY.fill(0);
    var peak = 1e-6;

    for (var iy = 0; iy < GRID_N; iy++) {
      var y = lerp(DOMAIN, -DOMAIN, iy / (GRID_N - 1));
      var rowSum = 0;
      for (var ix = 0; ix < GRID_N; ix++) {
        var x = lerp(-DOMAIN, DOMAIN, ix / (GRID_N - 1));
        var dx1 = x - cx1, dy1 = y - cy1;
        var r = dx1 * c1 - dy1 * sn1;
        var st = dx1 * sn1 + dy1 * c1;
        var d = st - bend1 * (r * r - 0.82 * s);
        var val = Math.exp(-0.5 * ((r / sigR1) * (r / sigR1) + (d / sigD1) * (d / sigD1)));

        if (w2 > 0.002) {
          var dx2 = x - cx2, dy2 = y - cy2;
          var a = dx2 * c2 - dy2 * sn2;
          var b = dx2 * sn2 + dy2 * c2;
          val += w2 * Math.exp(-0.5 * ((a / sigA2) * (a / sigA2) + (b / sigB2) * (b / sigB2)));
        }

        gridBuf[iy * GRID_N + ix] = val;
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
    return { peak: peak, mxMax: mxMax, myMax: myMax };
  }

  function strokeIsoLevel(level, x0, y0, size) {
    var step = size / (GRID_N - 1);
    ctx.beginPath();
    for (var iy = 0; iy < GRID_N - 1; iy++) {
      var py = y0 + iy * step;
      var rowOff = iy * GRID_N;
      var nextOff = rowOff + GRID_N;
      for (var ix = 0; ix < GRID_N - 1; ix++) {
        var v0 = gridBuf[rowOff + ix];
        var v1 = gridBuf[rowOff + ix + 1];
        var v2 = gridBuf[nextOff + ix + 1];
        var v3 = gridBuf[nextOff + ix];
        var mask = (v0 >= level ? 8 : 0) | (v1 >= level ? 4 : 0) | (v2 >= level ? 2 : 0) | (v3 >= level ? 1 : 0);
        if (mask === 0 || mask === 15) continue;
        strokeCell(mask, x0 + ix * step, py, step, v0, v1, v2, v3, level);
      }
    }
    ctx.stroke();
  }

  function render(time) {
    ctx.clearRect(0, 0, W, H);
    var s = flowFraction(time);

    // Subtle crisp background sky field (fade softly behind desktop copy)
    for (var bi = 0; bi < bgStars.length; bi++) {
      var bs = bgStars[bi];
      var fadeLeft = stage.isStacked ? 1 : clamp((bs.x - W * 0.04) / (W * 0.42), 0.18, 1);
      var tw = reduce ? 1 : (0.72 + 0.28 * Math.sin(time * 0.7 + bs.ph));
      ctx.fillStyle = 'rgba(' + pal.dot + ',' + (bs.a * fadeLeft * tw).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(bs.x, bs.y, bs.r, 0, 6.2832);
      ctx.fill();
    }

    var x0 = stage.px, y0 = stage.py, sz = stage.size, mh = stage.mh, mw = stage.mw, gap = stage.gap;
    var normStats = evaluateDensity(s);

    function toCanvasX(ux) { return x0 + ((ux + DOMAIN) / (2 * DOMAIN)) * sz; }
    function toCanvasY(uy) { return y0 + ((DOMAIN - uy) / (2 * DOMAIN)) * sz; }

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, sz, sz);
    ctx.clip();

    // Fine coordinate grid inside 2D posterior pane
    ctx.strokeStyle = 'rgba(' + pal.copper + ',' + (theme === 'dark' ? '0.08' : '0.10') + ')';
    ctx.lineWidth = 1;
    for (var gi = 0; gi < GRID_TICKS.length; gi++) {
      var gx = toCanvasX(GRID_TICKS[gi]), gy = toCanvasY(GRID_TICKS[gi]);
      ctx.beginPath();
      ctx.moveTo(gx, y0); ctx.lineTo(gx, y0 + sz);
      ctx.moveTo(x0, gy); ctx.lineTo(x0 + sz, gy);
      ctx.stroke();
    }

    // Dashed isotropic prior reference circles (1σ, 2σ)
    ctx.strokeStyle = 'rgba(' + pal.prior + ',' + (theme === 'dark' ? '0.24' : '0.28') + ')';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    var cx0 = toCanvasX(0), cy0 = toCanvasY(0), scalePx = sz / (2 * DOMAIN);
    for (var pr = 1; pr <= 2; pr++) {
      ctx.beginPath();
      ctx.arc(cx0, cy0, 1.05 * pr * scalePx, 0, 6.2832);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Continuous transport streamlines (prior -> posterior)
    for (var fi = 0; fi < streamlines.length; fi++) {
      var fl = streamlines[fi];
      var pStartX = toCanvasX(fl.zx), pStartY = toCanvasY(fl.zy);
      var mx = 0.5 * (fl.zx + fl.tx) - (fl.ty - fl.zy) * 0.22 * fl.swirl;
      var my = 0.5 * (fl.zy + fl.ty) + (fl.tx - fl.zx) * 0.22 * fl.swirl;
      var pCtrlX = toCanvasX(mx), pCtrlY = toCanvasY(my);
      var pEndX = toCanvasX(fl.tx), pEndY = toCanvasY(fl.ty);
      var grad = ctx.createLinearGradient(pStartX, pStartY, pEndX, pEndY);
      grad.addColorStop(0, 'rgba(' + pal.flowA + ',0.04)');
      grad.addColorStop(0.55, 'rgba(' + pal.flowB + ',' + (0.14 + 0.10 * s).toFixed(3) + ')');
      grad.addColorStop(1, 'rgba(' + pal.energy + ',' + (0.08 + 0.14 * s).toFixed(3) + ')');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.moveTo(pStartX, pStartY);
      ctx.quadraticCurveTo(pCtrlX, pCtrlY, pEndX, pEndY);
      ctx.stroke();
    }

    // Marching-squares iso-density contours
    for (var li = 0; li < ISO_FRACS.length; li++) {
      ctx.strokeStyle = 'rgba(' + pal.contours[li] + ',' + (0.42 + li * 0.11).toFixed(2) + ')';
      ctx.lineWidth = li >= 3 ? 1.45 : (li === 2 ? 1.2 : 1.0);
      strokeIsoLevel(normStats.peak * ISO_FRACS[li], x0, y0, sz);
    }

    // Advected sample points & active tracer tails
    for (var si = 0; si < samples.length; si++) {
      var sm = samples[si];
      var pt = sampleArcPoint(sm, s);
      var px = toCanvasX(pt[0]), py = toCanvasY(pt[1]);
      if (sm.tracer) {
        if (!reduce) {
          var tailS = clamp(s - 0.12, 0.04, 1.0);
          var ptTail = sampleArcPoint(sm, tailS);
          ctx.strokeStyle = 'rgba(' + pal.tracer + ',0.45)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(toCanvasX(ptTail[0]), toCanvasY(ptTail[1]));
          ctx.lineTo(px, py);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(' + pal.energy + ',0.95)';
        ctx.beginPath();
        ctx.arc(px, py, sm.r + 0.45, 0, 6.2832);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(' + pal.sample + ',' + (0.50 + 0.25 * s).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(px, py, sm.r, 0, 6.2832);
        ctx.fill();
      }
    }
    ctx.restore();

    // Top 1D marginal p(theta1 | D) + dashed Gaussian prior
    var topY = y0 - gap;
    ctx.save();
    ctx.strokeStyle = 'rgba(' + pal.prior + ',0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (var ix = 0; ix < GRID_N; ix++) {
      var xPos = x0 + (ix / (GRID_N - 1)) * sz;
      var pyPrior = topY - priorMarg[ix] * (mh * 0.76);
      if (ix === 0) ctx.moveTo(xPos, pyPrior); else ctx.lineTo(xPos, pyPrior);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(x0, topY);
    for (var ix2 = 0; ix2 < GRID_N; ix2++) {
      ctx.lineTo(x0 + (ix2 / (GRID_N - 1)) * sz, topY - (margX[ix2] / normStats.mxMax) * (mh * 0.90));
    }
    ctx.lineTo(x0 + sz, topY);
    ctx.closePath();
    ctx.fillStyle = 'rgba(' + pal.marginalFill + ',' + pal.marginalFillAlpha + ')';
    ctx.fill();

    ctx.beginPath();
    for (var ix3 = 0; ix3 < GRID_N; ix3++) {
      var xp3 = x0 + (ix3 / (GRID_N - 1)) * sz;
      var yp3 = topY - (margX[ix3] / normStats.mxMax) * (mh * 0.90);
      if (ix3 === 0) ctx.moveTo(xp3, yp3); else ctx.lineTo(xp3, yp3);
    }
    ctx.strokeStyle = 'rgba(' + pal.marginalStroke + ',0.9)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    // Right 1D marginal p(theta2 | D) + dashed Gaussian prior
    var rightX = x0 + sz + gap;
    ctx.save();
    ctx.strokeStyle = 'rgba(' + pal.prior + ',0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    for (var iy = 0; iy < GRID_N; iy++) {
      var yPos = y0 + (iy / (GRID_N - 1)) * sz;
      var pxPrior = rightX + priorMarg[iy] * (mw * 0.76);
      if (iy === 0) ctx.moveTo(pxPrior, yPos); else ctx.lineTo(pxPrior, yPos);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(rightX, y0);
    for (var iy2 = 0; iy2 < GRID_N; iy2++) {
      ctx.lineTo(rightX + (margY[iy2] / normStats.myMax) * (mw * 0.90), y0 + (iy2 / (GRID_N - 1)) * sz);
    }
    ctx.lineTo(rightX, y0 + sz);
    ctx.closePath();
    ctx.fillStyle = 'rgba(' + pal.marginalFill + ',' + pal.marginalFillAlpha + ')';
    ctx.fill();

    ctx.beginPath();
    for (var iy3 = 0; iy3 < GRID_N; iy3++) {
      var y3 = y0 + (iy3 / (GRID_N - 1)) * sz;
      var x3 = rightX + (margY[iy3] / normStats.myMax) * (mw * 0.90);
      if (iy3 === 0) ctx.moveTo(x3, y3); else ctx.lineTo(x3, y3);
    }
    ctx.strokeStyle = 'rgba(' + pal.marginalStroke + ',0.9)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    // Editorial copper frame, marginal baselines, and axis ticks
    ctx.strokeStyle = 'rgba(' + pal.copper + ',0.68)';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, sz - 1, sz - 1);

    ctx.strokeStyle = 'rgba(' + pal.copper + ',0.38)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, topY + 0.5); ctx.lineTo(x0 + sz, topY + 0.5);
    ctx.moveTo(rightX - 0.5, y0); ctx.lineTo(rightX - 0.5, y0 + sz);
    for (var ti = 0; ti < GRID_TICKS.length; ti++) {
      var tx = toCanvasX(GRID_TICKS[ti]), ty = toCanvasY(GRID_TICKS[ti]);
      ctx.moveTo(tx, y0 + sz); ctx.lineTo(tx, y0 + sz + 4);
      ctx.moveTo(x0 - 4, ty); ctx.lineTo(x0, ty);
    }
    ctx.stroke();

    // Restrained monospace annotations
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

  function drawReduced() { render(REDUCED_TIME); }

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
    if (reduce) drawReduced(); else start();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () {
        build();
        if (reduce) drawReduced(); else render(simTime);
      });
    }
  }

  if (reduceMQ) {
    var onReduceChange = function (e) {
      reduce = e.matches;
      if (reduce) {
        stop();
        drawReduced();
      } else {
        start();
      }
    };
    if (reduceMQ.addEventListener) reduceMQ.addEventListener('change', onReduceChange);
    else if (reduceMQ.addListener) reduceMQ.addListener(onReduceChange);
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0.01 }).observe(canvas);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  new MutationObserver(function () {
    var t = document.documentElement.getAttribute('data-theme') || 'dark';
    if (t !== theme) {
      theme = t;
      pal = PAL[t] || PAL.dark;
      build();
      if (reduce) drawReduced(); else render(simTime);
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      build();
      if (reduce) drawReduced(); else render(simTime);
    }, 180);
  });

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
