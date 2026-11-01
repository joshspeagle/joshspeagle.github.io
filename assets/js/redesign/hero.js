/**
 * Hero canvas: Astronomical deep-field galaxies (left/center) -> Constellation neural
 * network (middle) -> Bayesian posterior contour & sample cloud (right).
 *
 * Decorative (canvas is aria-hidden). Theme-aware, reduced-motion-safe, and pauses
 * when off-screen or tab-hidden.
 */
(function () {
  var canvas = document.getElementById('hero-sky');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function R(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function gauss() {
    var u = Math.random() || 1e-9, v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v);
  }

  var PAL = {
    dark: {
      star: '226,233,255',
      edge: '150,170,235',
      node: '215,222,255',
      v: [150, 125, 255],
      c: [43, 200, 216],
      g: [255, 194, 102],
      starMax: 0.62,
      edgeMax: 0.18,
      sample: '120,218,245',
      gal: [[140, 185, 255], [255, 206, 145], [190, 155, 255]]
    },
    light: {
      star: '110,115,155',
      edge: '110,115,165',
      node: '75,70,130',
      v: [67, 36, 168],
      c: [14, 141, 156],
      g: [196, 109, 0],
      starMax: 0.45,
      edgeMax: 0.22,
      sample: '25,100,180',
      gal: [[45, 85, 165], [165, 95, 30], [105, 65, 155]]
    }
  };

  var W = 0, H = 0, DPR = 1;
  var stars = [], galaxies = [], inputs = [], layers = [], edges = [], signals = [], samples = [];
  var PX = 0, PY = 0, pw = 0, ph = 0;
  var theme = document.documentElement.getAttribute('data-theme') || 'dark';
  var pal = PAL[theme] || PAL.dark;
  var running = false, visible = true, rafId = null, lastT = 0, animating = true;

  var MAXS = 140;
  var LAYER_X = [0.585, 0.670, 0.755];
  var INPUT_X = 0.495;
  var ANG = -0.58;

  function sampleTarget() {
    var a = gauss() * 1.0, b = gauss() * 0.42;
    var rx = a * Math.cos(ANG) - b * Math.sin(ANG);
    var ry = a * Math.sin(ANG) + b * Math.cos(ANG);
    return {
      x: clamp(PX + rx * pw, W * 0.74, W * 0.98),
      y: clamp(PY + ry * ph, H * 0.10, H * 0.90)
    };
  }

  function newSignal(phase) {
    var inp = inputs[(Math.random() * inputs.length) | 0];
    var a = layers[0][(Math.random() * layers[0].length) | 0];
    var b = layers[1][(Math.random() * layers[1].length) | 0];
    var d = layers[2][(Math.random() * layers[2].length) | 0];
    var land = sampleTarget();
    return {
      pts: [inp, a, b, d, land],
      nodes: [a, b, d],
      t: phase || 0,
      speed: R(0.055, 0.088),
      land: land
    };
  }

  function build() {
    var rect = canvas.getBoundingClientRect();
    W = Math.max(360, rect.width);
    H = Math.max(380, rect.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    var isMobile = W < 760;
    PX = W * (isMobile ? 0.80 : 0.875);
    PY = H * (isMobile ? 0.72 : 0.50);
    pw = W * (isMobile ? 0.085 : 0.046);
    ph = H * (isMobile ? 0.085 : 0.098);

    stars = [];
    var nStars = Math.round((W * H) / 6000);
    for (var i = 0; i < nStars; i++) {
      stars.push({
        x: R(0, W),
        y: R(0, H),
        r: R(0.35, 1.45),
        a: R(0.08, pal.starMax),
        ph: R(0, 6.28),
        sp: R(0.5, 1.5)
      });
    }

    galaxies = [];
    var NG = Math.round(W / 36);
    var tries = 0;
    function addGal(fx, fy, depth, scale, alpha, forceType) {
      var type = forceType || (depth < 0.4 ? (Math.random() < 0.6 ? 'd' : 'e') : (Math.random() < 0.55 ? 's' : 'e'));
      galaxies.push({
        x: W * fx,
        y: H * fy,
        rot: R(0, 6.28),
        ph: R(0, 6.28),
        type: type,
        tint: pal.gal[type === 's' ? 0 : type === 'e' ? 1 : 2],
        r: lerp(1.6, 4.8, depth) * scale,
        a: alpha
      });
    }
    while (galaxies.length < NG && tries < NG * 8) {
      tries++;
      var fx = R(0.03, 0.48), fy = R(0.06, 0.94);
      if (!isMobile && fx < 0.43 && fy > 0.26 && fy < 0.72) continue;
      if (isMobile && fy < 0.52) continue;
      var depth = clamp((fx - 0.02) / 0.46, 0, 1);
      addGal(fx, fy, depth, R(0.75, 1.35), lerp(0.26, 0.60, depth) * R(0.85, 1.15));
    }
    if (!isMobile) {
      addGal(0.11, 0.14, 0.55, 2.0, 0.62, 's');
      addGal(0.31, 0.12, 0.70, 1.5, 0.56, 'e');
      addGal(0.16, 0.86, 0.60, 1.8, 0.58, 's');
      addGal(0.33, 0.87, 0.65, 1.4, 0.54, 'e');
    }

    inputs = [];
    var inX = isMobile ? 0.18 : INPUT_X;
    for (var k = 0; k < 5; k++) {
      var fyIn = isMobile ? lerp(0.58, 0.88, k / 4) : lerp(0.22, 0.78, k / 4);
      inputs.push({
        x: W * R(inX - 0.02, inX + 0.015),
        y: H * fyIn + R(-8, 8),
        r: R(2.4, 3.5),
        rot: R(0, 6.28),
        ph: R(0, 6.28),
        a: R(0.75, 0.96),
        type: k % 2 === 0 ? 's' : 'e',
        tint: pal.gal[k % 2 === 0 ? 0 : 1]
      });
    }

    var lx = isMobile ? [0.34, 0.48, 0.62] : LAYER_X;
    layers = lx.map(function (fxCol, li) {
      var count = [4, 5, 4][li];
      var arr = [];
      for (var j = 0; j < count; j++) {
        var yMin = isMobile ? 0.56 : 0.19;
        var yMax = isMobile ? 0.90 : 0.81;
        arr.push({
          x: W * fxCol + R(-W * 0.01, W * 0.01),
          y: H * lerp(yMin, yMax, j / (count - 1)) + R(-8, 8),
          r: R(1.8, 2.8),
          act: 0
        });
      }
      return arr;
    });

    edges = [];
    function connect(A, B) {
      for (var ai = 0; ai < A.length; ai++) {
        var p = A[ai];
        var nb = B.map(function (q) {
          return { q: q, d: (p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y) };
        }).sort(function (m, n) { return m.d - n.d; }).slice(0, 2);
        for (var bi = 0; bi < nb.length; bi++) {
          edges.push([p, nb[bi].q]);
        }
      }
    }
    connect(inputs, layers[0]);
    connect(layers[0], layers[1]);
    connect(layers[1], layers[2]);

    samples = [];
    signals = [];
    for (var sIdx = 0; sIdx < 6; sIdx++) signals.push(newSignal(sIdx / 6));

    for (var pIdx = 0; pIdx < 85; pIdx++) {
      var s0 = sampleTarget();
      samples.push({ x: s0.x, y: s0.y, born: -1 });
    }
    if (reduce || !animating) {
      signals.forEach(function (s, idx) { s.t = (0.25 + 0.12 * idx) % 1; });
    }
  }

  function glow(cx, cy, r, rgb, a) {
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 7);
    ctx.fill();
  }

  function ptAt(pts, f) {
    var seg = (pts.length - 1) * clamp(f, 0, 1);
    var i = Math.min(pts.length - 2, Math.floor(seg));
    var t = seg - i;
    return { x: lerp(pts[i].x, pts[i + 1].x, t), y: lerp(pts[i].y, pts[i + 1].y, t) };
  }

  function drawGalaxy(g, t, bright) {
    var tw = 0.85 + 0.15 * Math.sin(t * 0.5 + g.ph);
    var a = g.a * tw;
    var tint = g.tint.join(',');
    glow(g.x, g.y, g.r * (bright ? 4.8 : 3.5), tint, a * (bright ? 0.42 : 0.28));
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.rot);
    var grd = ctx.createRadialGradient(0, 0, 0, 0, 0, g.r * 1.8);
    grd.addColorStop(0, 'rgba(' + tint + ',' + a + ')');
    grd.addColorStop(1, 'rgba(' + tint + ',0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(0, 0, g.r * 1.8, g.r * (g.type === 's' ? 0.66 : 1.0), 0, 0, 7);
    ctx.fill();
    if (g.type === 's') {
      ctx.strokeStyle = 'rgba(' + tint + ',' + (a * 0.58) + ')';
      ctx.lineWidth = 0.85;
      for (var k = 0; k < 2; k++) {
        ctx.beginPath();
        for (var u = 0; u <= 1.01; u += 0.12) {
          var ang = u * 3.2 + k * Math.PI;
          var rr = g.r * 1.7 * u;
          var x = Math.cos(ang) * rr;
          var y = Math.sin(ang) * rr * 0.66;
          if (u === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    if (g.type !== 'd' || bright) {
      ctx.fillStyle = 'rgba(255,255,255,' + (a * 0.65) + ')';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.7, g.r * 0.32), 0, 7);
      ctx.fill();
    }
    ctx.restore();
  }

  function render(time) {
    ctx.clearRect(0, 0, W, H);
    var V = pal.v, C = pal.c, G = pal.g, now = time;

    // 1. Background sky stars
    for (var i = 0; i < stars.length; i++) {
      var st = stars[i];
      var a = st.a * (0.6 + 0.4 * Math.sin(now * st.sp + st.ph));
      ctx.fillStyle = 'rgba(' + pal.star + ',' + Math.max(0, a) + ')';
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, 7);
      ctx.fill();
    }

    // 2. Deep-field galaxies
    for (var gi = 0; gi < galaxies.length; gi++) {
      drawGalaxy(galaxies[gi], now, false);
    }

    // 3. Posterior on right: soft density glow + 1σ, 2σ, 3σ iso-density ellipses + MCMC/nested samples
    glow(PX, PY, Math.min(W, H) * 0.25, C.join(','), 0.14);
    var kLevels = [0.95, 1.65, 2.35];
    for (var ki = 0; ki < kLevels.length; ki++) {
      var k = kLevels[ki];
      ctx.strokeStyle = ki === 0
        ? 'rgba(' + G.join(',') + ',0.38)'
        : 'rgba(' + C.join(',') + ',' + (0.26 - ki * 0.06) + ')';
      ctx.lineWidth = ki === 0 ? 1.25 : 1.0;
      ctx.beginPath();
      for (var q = 0; q <= 6.2832 + 0.001; q += 0.16) {
        var ea = k * Math.cos(q), eb = 0.42 * k * Math.sin(q);
        var rx = ea * Math.cos(ANG) - eb * Math.sin(ANG);
        var ry = ea * Math.sin(ANG) + eb * Math.cos(ANG);
        var ex = PX + rx * pw, ey = PY + ry * ph;
        if (q === 0) ctx.moveTo(ex, ey); else ctx.lineTo(ex, ey);
      }
      ctx.stroke();
    }
    for (var smi = 0; smi < samples.length; smi++) {
      var sm = samples[smi];
      var age = sm.born < 0 ? 1 : clamp((now - sm.born) / 0.5, 0, 1);
      ctx.fillStyle = 'rgba(' + pal.sample + ',' + (0.58 * age) + ')';
      ctx.beginPath();
      ctx.arc(sm.x, sm.y, 1.7, 0, 7);
      ctx.fill();
    }

    // 4. Constellation graph edges
    ctx.lineWidth = 1;
    for (var ei = 0; ei < edges.length; ei++) {
      var ed = edges[ei];
      ctx.strokeStyle = 'rgba(' + pal.edge + ',' + pal.edgeMax + ')';
      ctx.beginPath();
      ctx.moveTo(ed[0].x, ed[0].y);
      ctx.lineTo(ed[1].x, ed[1].y);
      ctx.stroke();
    }

    // 5. Advance signal pulses & node activations
    for (var li = 0; li < layers.length; li++) {
      for (var ni = 0; ni < layers[li].length; ni++) {
        layers[li][ni].act = 0;
      }
    }
    for (var si = 0; si < signals.length; si++) {
      var s = signals[si];
      if (animating) s.t += s.speed * 0.55;
      if (s.t >= 1) {
        samples.push({ x: s.land.x, y: s.land.y, born: now });
        if (samples.length > MAXS) samples.shift();
        var next = newSignal(0);
        s.pts = next.pts;
        s.nodes = next.nodes;
        s.t = 0;
        s.speed = next.speed;
        s.land = next.land;
      }
      var seg = s.t * (s.pts.length - 1);
      for (var nj = 0; nj < s.nodes.length; nj++) {
        var nd = s.nodes[nj];
        var reach = clamp(1 - (seg - (nj + 1)) / 1.6, 0, 1) * clamp(seg - nj * 0.4, 0, 1);
        if (reach > nd.act) nd.act = reach;
      }
    }

    // 6. Draw active signal beams (violet -> cyan -> gold)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var pIdx = 0; pIdx < signals.length; pIdx++) {
      var sig = signals[pIdx];
      var head = clamp(sig.t, 0, 1);
      var n = sig.pts.length - 1;
      var segF = head * n;
      var hp = ptAt(sig.pts, head);
      var grad = ctx.createLinearGradient(sig.pts[0].x, sig.pts[0].y, sig.land.x, sig.land.y);
      grad.addColorStop(0, 'rgba(' + V.join(',') + ',0)');
      grad.addColorStop(0.45, 'rgb(' + V.join(',') + ')');
      grad.addColorStop(0.82, 'rgb(' + C.join(',') + ')');
      grad.addColorStop(1, 'rgb(' + G.join(',') + ')');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(sig.pts[0].x, sig.pts[0].y);
      for (var kSeg = 1; kSeg <= Math.floor(segF); kSeg++) {
        ctx.lineTo(sig.pts[kSeg].x, sig.pts[kSeg].y);
      }
      ctx.lineTo(hp.x, hp.y);
      ctx.stroke();

      var col = Math.round(lerp(V[0], C[0], head)) + ',' +
                Math.round(lerp(V[1], C[1], head)) + ',' +
                Math.round(lerp(V[2], C[2], head));
      glow(hp.x, hp.y, 11, col, 0.85);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, 2.0, 0, 7);
      ctx.fill();
    }

    // 7. Draw constellation nodes
    for (var lIdx = 0; lIdx < layers.length; lIdx++) {
      for (var nIdx = 0; nIdx < layers[lIdx].length; nIdx++) {
        var node = layers[lIdx][nIdx];
        if (node.act > 0.02) {
          var ncol = Math.round(lerp(V[0], C[0], 0.5)) + ',' +
                     Math.round(lerp(V[1], C[1], 0.5)) + ',' +
                     Math.round(lerp(V[2], C[2], 0.5));
          glow(node.x, node.y, 11 * node.act + 4, ncol, 0.62 * node.act);
        }
        ctx.fillStyle = 'rgba(' + pal.node + ',' + (0.48 + 0.5 * node.act) + ')';
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, 7);
        ctx.fill();
      }
    }

    // 8. Draw input galaxies feeding the network
    for (var inIdx = 0; inIdx < inputs.length; inIdx++) {
      drawGalaxy(inputs[inIdx], now, true);
    }
  }

  function drawOnce() { render(0.6); }
  function loop(now) {
    if (!running) return;
    if (now - lastT >= 33) {
      lastT = now;
      render(now / 1000);
    }
    rafId = requestAnimationFrame(loop);
  }
  function start() {
    if (running || reduce || !visible) return;
    running = true;
    animating = true;
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }
  function init() {
    animating = !reduce;
    build();
    if (reduce) drawOnce(); else start();
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
      if (reduce) drawOnce();
    }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      build();
      if (reduce) drawOnce();
    }, 200);
  });

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
