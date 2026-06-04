/* Simulation-based-inference hero: data (left) -> a star-network that lights up
   left-to-right (activations flowing like signal/light) -> samples that land and
   accumulate into an astronomical posterior on the right.
   Decorative (canvas is aria-hidden). Theme-aware, reduced-motion-safe, pauses
   off-screen / when the tab is hidden. The CSS .backdrop is the static fallback. */
(function () {
  const canvas = document.getElementById('hero-sky');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const R = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  function gauss() { let u = Math.random() || 1e-9, v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); }

  const PAL = {
    dark:  { star: '226,233,255', edge: '150,170,235', node: '200,208,245', v: [150, 128, 255], c: [70, 224, 238], starMax: 0.6, edgeMax: 0.16, sample: '150,224,255', gal: [[150, 190, 255], [255, 212, 172], [216, 178, 198]] },
    light: { star: '120,120,165', edge: '120,122,170', node: '90,86,140',   v: [91, 67, 214],   c: [14, 154, 168], starMax: 0.45, edgeMax: 0.22, sample: '60,120,190', gal: [[64, 92, 168], [150, 92, 44], [120, 78, 108]] },
  };

  let W = 0, H = 0, DPR = 1;
  let stars = [], galaxies = [], inputs = [], layers = [], edges = [], signals = [], samples = [];
  let PX = 0, PY = 0, pw = 0, ph = 0;
  let theme = document.documentElement.getAttribute('data-theme') || 'dark';
  let pal = PAL[theme] || PAL.dark;
  let running = false, visible = true, rafId = null, lastT = 0, animating = true;

  const MAXS = 150;
  const LAYER_X = [0.605, 0.685, 0.765];   // hidden-layer columns (fraction of W)
  const INPUT_X = 0.525;

  // Target posterior: a compact, rotated (correlated) degeneracy — classic inference look.
  const ANG = -0.6;
  function sampleTarget() {
    const a = gauss() * 1.0, b = gauss() * 0.42;     // long / short axis
    const rx = a * Math.cos(ANG) - b * Math.sin(ANG);
    const ry = a * Math.sin(ANG) + b * Math.cos(ANG);
    return { x: clamp(PX + rx * pw, W * 0.74, W * 0.985), y: clamp(PY + ry * ph, H * 0.08, H * 0.92) };
  }

  function newSignal(phase) {
    const inp = inputs[(Math.random() * inputs.length) | 0];
    const a = layers[0][(Math.random() * layers[0].length) | 0];
    const b = layers[1][(Math.random() * layers[1].length) | 0];
    const d = layers[2][(Math.random() * layers[2].length) | 0];
    const land = sampleTarget();
    return { pts: [inp, a, b, d, land], nodes: [a, b, d], t: phase || 0, speed: R(0.055, 0.09), land };
  }

  function build() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(640, rect.width); H = Math.max(420, rect.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    PX = W * 0.875; PY = H * 0.50; pw = W * 0.045; ph = H * 0.095;   // sample x/y scales

    // faint full-width sky
    stars = [];
    for (let i = 0; i < Math.round(W * H / 6400); i++)
      stars.push({ x: R(0, W), y: R(0, H), r: R(0.3, 1.4), a: R(0.08, pal.starMax), ph: R(0, 6.28), sp: R(0.5, 1.6) });

    // left "data" field: a deep field of galaxies (the observations). Distant/faint
    // on the far left, richer toward the network — a quiet nod to cosmic evolution.
    // The central text band is kept clear so the copy stays clean.
    galaxies = [];
    const NG = Math.round(W / 38);
    let tries = 0;
    const addGal = (fx, fy, depth, scale, alpha, forceType) => {
      const type = forceType || (depth < 0.4 ? (Math.random() < 0.6 ? 'd' : 'e') : (Math.random() < 0.5 ? 's' : 'e'));
      galaxies.push({ x: W * fx, y: H * fy, rot: R(0, 6.28), ph: R(0, 6.28), type,
        tint: pal.gal[type === 's' ? 0 : type === 'e' ? 1 : 2],
        r: lerp(1.4, 4.6, depth) * scale, a: alpha });
    };
    while (galaxies.length < NG && tries < NG * 8) {
      tries++;
      const fx = R(0.02, 0.47), fy = R(0.05, 0.95);
      if (fx < 0.44 && fy > 0.30 && fy < 0.70) continue;          // keep the headline band clear
      const depth = clamp((fx - 0.02) / 0.45, 0, 1);              // 0 far-left .. 1 near network
      addGal(fx, fy, depth, R(0.7, 1.3), lerp(0.24, 0.56, depth) * R(0.8, 1.12));
    }
    // a few prominent "feature" galaxies anchoring the top-left and lower-left
    addGal(0.115, 0.155, 0.5, 1.9, 0.6, 's');
    addGal(0.305, 0.125, 0.65, 1.4, 0.52, 'e');
    addGal(0.165, 0.85, 0.55, 1.7, 0.55, 's');
    addGal(0.30, 0.88, 0.6, 1.3, 0.5, 'e');

    // bright "input" galaxies adjacent to the network — pulses originate here
    inputs = [];
    for (let i = 0; i < 5; i++) inputs.push({ x: W * R(INPUT_X - 0.02, INPUT_X + 0.01), y: H * lerp(0.24, 0.76, i / 4) + R(-10, 10),
      r: R(2.2, 3.2), rot: R(0, 6.28), ph: R(0, 6.28), a: R(0.7, 0.95), type: i % 2 === 0 ? 's' : 'e', tint: pal.gal[i % 2 === 0 ? 0 : 1] });

    // layered network (nodes styled as stars)
    layers = LAYER_X.map((fx, li) => {
      const k = [4, 5, 4][li];
      const arr = [];
      for (let i = 0; i < k; i++) arr.push({ x: W * fx + R(-W * 0.01, W * 0.01), y: H * lerp(0.2, 0.8, i / (k - 1)) + R(-10, 10), r: R(1.4, 2.6), act: 0 });
      return arr;
    });

    // edges between consecutive layers (each node -> 2 nearest in next layer) + inputs -> layer0
    edges = [];
    const connect = (A, B) => {
      for (const p of A) {
        const nb = B.map((q) => ({ q, d: (p.x - q.x) ** 2 + (p.y - q.y) ** 2 })).sort((m, n) => m.d - n.d).slice(0, 2);
        for (const { q } of nb) edges.push([p, q]);
      }
    };
    connect(inputs, layers[0]); connect(layers[0], layers[1]); connect(layers[1], layers[2]);

    samples = [];
    signals = [];
    for (let i = 0; i < 6; i++) signals.push(newSignal(i / 6));

    if (reduce || !animating) {            // prefill a static posterior + mid-flight signals
      for (let i = 0; i < 95; i++) { const s = sampleTarget(); samples.push({ x: s.x, y: s.y, born: -1 }); }
      signals.forEach((s, i) => { s.t = (0.25 + 0.12 * i) % 1; });
    }
  }

  function glow(cx, cy, r, rgb, a) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); }
  function smooth(pts) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length - 1; i++) { const xc = (pts[i].x + pts[i + 1].x) / 2, yc = (pts[i].y + pts[i + 1].y) / 2; ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc); } ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y); }
  function ptAt(pts, f) { const seg = (pts.length - 1) * clamp(f, 0, 1); const i = Math.min(pts.length - 2, Math.floor(seg)); const t = seg - i; return { x: lerp(pts[i].x, pts[i + 1].x, t), y: lerp(pts[i].y, pts[i + 1].y, t) }; }
  function ellipse(cx, cy, rl, rs, ang) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.beginPath(); ctx.ellipse(0, 0, rl, rs, 0, 0, 7); ctx.stroke(); ctx.restore(); }
  function drawGalaxy(g, t, bright) {
    const tw = 0.85 + 0.15 * Math.sin(t * 0.5 + g.ph), a = g.a * tw, tint = g.tint.join(',');
    glow(g.x, g.y, g.r * (bright ? 4.6 : 3.4), tint, a * (bright ? 0.4 : 0.26));
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot);
    const grd = ctx.createRadialGradient(0, 0, 0, 0, 0, g.r * 1.8);
    grd.addColorStop(0, `rgba(${tint},${a})`); grd.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = grd; ctx.beginPath(); ctx.ellipse(0, 0, g.r * 1.8, g.r * (g.type === 's' ? 0.66 : 1.0), 0, 0, 7); ctx.fill();
    if (g.type === 's') {
      ctx.strokeStyle = `rgba(${tint},${a * 0.55})`; ctx.lineWidth = 0.8;
      for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let u = 0; u <= 1.01; u += 0.12) { const ang = u * 3.2 + k * Math.PI, rr = g.r * 1.7 * u, x = Math.cos(ang) * rr, y = Math.sin(ang) * rr * 0.66; u === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
    }
    if (g.type !== 'd' || bright) { ctx.fillStyle = `rgba(255,255,255,${a * 0.6})`; ctx.beginPath(); ctx.arc(0, 0, Math.max(0.6, g.r * 0.3), 0, 7); ctx.fill(); }
    ctx.restore();
  }

  function render(time) {
    ctx.clearRect(0, 0, W, H);
    const V = pal.v, C = pal.c, now = time;
    // (early-universe glow is a CSS layer — .hero .dawn — so it sits above the
    //  readability scrim instead of being washed out by it.)

    // faint sky
    for (const s of stars) { const a = s.a * (0.6 + 0.4 * Math.sin(now * s.sp + s.ph)); ctx.fillStyle = `rgba(${pal.star},${Math.max(0, a)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
    // left data field: galaxies (the observations)
    for (const g of galaxies) drawGalaxy(g, now, false);

    // --- posterior (right): glow + iso-density contours + accumulated samples ---
    glow(PX, PY, Math.min(W, H) * 0.26, `${C}`, 0.12);
    ctx.strokeStyle = `rgba(${C},0.16)`; ctx.lineWidth = 1;
    for (const k of [1.1, 2.1]) {   // iso-density ellipses matching the sample map
      ctx.beginPath();
      for (let q = 0; q <= 6.2832 + 0.001; q += 0.2) {
        const a = k * Math.cos(q), b = 0.42 * k * Math.sin(q);
        const rx = a * Math.cos(ANG) - b * Math.sin(ANG), ry = a * Math.sin(ANG) + b * Math.cos(ANG);
        const x = PX + rx * pw, y = PY + ry * ph;
        q === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (const sm of samples) {
      const age = sm.born < 0 ? 1 : clamp((now - sm.born) / 0.5, 0, 1);
      ctx.fillStyle = `rgba(${pal.sample},${0.55 * age})`;
      ctx.beginPath(); ctx.arc(sm.x, sm.y, 1.7, 0, 7); ctx.fill();
    }

    // --- network edges (faint) ---
    ctx.lineWidth = 1;
    for (const [a, b] of edges) { ctx.strokeStyle = `rgba(${pal.edge},${pal.edgeMax})`; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }

    // reset activation, advance signals
    for (const L of layers) for (const nd of L) nd.act *= 0.0;
    for (const s of signals) {
      if (animating) s.t += s.speed * 0.6;
      if (s.t >= 1) { samples.push({ x: s.land.x, y: s.land.y, born: now }); if (samples.length > MAXS) samples.shift(); Object.assign(s, newSignal(0)); }
      const seg = s.t * (s.pts.length - 1);
      s.nodes.forEach((nd, i) => { const reach = clamp(1 - (seg - (i + 1)) / 1.6, 0, 1) * clamp(seg - i * 0.4, 0, 1); if (reach > nd.act) nd.act = reach; });
    }

    // --- activations flow along the real edges (data -> network -> sample) ---
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const s of signals) {
      const head = clamp(s.t, 0, 1), n = s.pts.length - 1, segF = head * n;
      const hp = ptAt(s.pts, head);
      const g = ctx.createLinearGradient(s.pts[0].x, s.pts[0].y, s.land.x, s.land.y);
      g.addColorStop(0, `rgba(${V[0]},${V[1]},${V[2]},0)`); g.addColorStop(0.45, `rgb(${V})`); g.addColorStop(1, `rgb(${C})`);
      ctx.strokeStyle = g; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(s.pts[0].x, s.pts[0].y);
      for (let i = 1; i <= Math.floor(segF); i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
      ctx.lineTo(hp.x, hp.y); ctx.stroke();
      const f = head, col = `${Math.round(lerp(V[0], C[0], f))},${Math.round(lerp(V[1], C[1], f))},${Math.round(lerp(V[2], C[2], f))}`;
      glow(hp.x, hp.y, 11, col, 0.85); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hp.x, hp.y, 2, 0, 7); ctx.fill();
    }

    // --- nodes (stars that light up) ---
    for (const L of layers) for (const nd of L) {
      if (nd.act > 0.02) { const col = `${Math.round(lerp(V[0], C[0], 0.5))},${Math.round(lerp(V[1], C[1], 0.5))},${Math.round(lerp(V[2], C[2], 0.5))}`; glow(nd.x, nd.y, 11 * nd.act + 4, col, 0.6 * nd.act); }
      ctx.fillStyle = `rgba(${pal.node},${0.45 + 0.5 * nd.act})`; ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r, 0, 7); ctx.fill();
    }
    // input galaxies (the observed sample feeding the network)
    for (const p of inputs) drawGalaxy(p, now, true);
  }

  function drawOnce() { render(0.6); }
  function loop(now) { if (!running) return; if (now - lastT >= 33) { lastT = now; render(now / 1000); } rafId = requestAnimationFrame(loop); }
  function start() { if (running || reduce || !visible) return; running = true; animating = true; rafId = requestAnimationFrame(loop); }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }
  function init() { animating = !reduce; build(); if (reduce) drawOnce(); else start(); }

  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) start(); else stop(); }, { threshold: 0.01 }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  new MutationObserver(() => { const t = document.documentElement.getAttribute('data-theme') || 'dark'; if (t !== theme) { theme = t; pal = PAL[t] || PAL.dark; build(); if (reduce) drawOnce(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduce) drawOnce(); }, 200); });

  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
