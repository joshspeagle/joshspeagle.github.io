/* Hero: observations (left) -> a feed-forward network drawn as a constellation (middle)
   -> samples that land and accumulate into a posterior (right).
   Each "pass" is a real forward pass: an input vector taken from a galaxy lights the input
   layer; activations a_k = squash(W_k a_{k-1}) propagate layer by layer with fixed (seeded)
   weights, so every input produces a different, visible activation pattern; edges light in
   proportion to activation x |weight|; the output layer's activations decide where the
   sample lands. 30 fps cap, pauses off-screen, still frame under reduced motion. */
(function () {
  const canvas = document.getElementById('hero-sky');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // seeded RNG so the scene (and the weights) are the same every load
  let seed = 20260907; const R = (a, b) => { seed = (seed * 1664525 + 1013904223) >>> 0; return a + (seed / 4294967296) * (b - a); };
  function gauss() { let u = R(1e-6, 1), v = R(0, 1); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); }
  function cssRGB(name, fb) { const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim(); return v ? v.split(/\s+/).map(Number) : fb; }

  const PAL = {
    dark:  { star: '226,233,255', edge: '184,128,94', node: '236,222,200', starMax: 0.6, edgeMax: 0.22, gal: [[150, 190, 255], [255, 212, 172], [216, 178, 198]] },
    light: { star: '120,120,165', edge: '168,113,74', node: '110,70,36',   starMax: 0.45, edgeMax: 0.32, gal: [[64, 92, 168], [150, 92, 44], [120, 78, 108]] },
  };
  let W = 0, H = 0, DPR = 1, stars = [], galaxies = [], layers = [], weights = [], passes = [], samples = [];
  let PX = 0, PY = 0, pw = 0, ph = 0, ANG = -0.6;
  let theme = document.documentElement.getAttribute('data-theme') || 'dark';
  let pal = PAL[theme] || PAL.dark;
  let E = [242, 140, 40], EH = [255, 228, 194];        // energy + hot core, read from CSS tokens
  let running = false, visible = true, rafId = null, lastT = 0, tLast = 0, nextPass = 0;
  const MAXS = 160, SIZES = [5, 7, 6, 3];                 // input, hidden, hidden, output
  const COLS = [0.535, 0.615, 0.695, 0.775];             // layer x (fraction of W)
  const PASS_T = 2.6;                                     // seconds per forward pass

  function readEnergy() { E = cssRGB('--energy-rgb', E); EH = theme === 'dark' ? [255, 228, 194] : [255, 240, 220]; }

  function sampleFrom(out) {                              // output activations -> a point in the posterior
    const z1 = (out[0] - 0.5) * 3.2 + gauss() * 0.35, z2 = (out[1] - out[2]) * 2.6 + gauss() * 0.35;
    const a = z1 * 1.0, b = z2 * 0.42;
    const rx = a * Math.cos(ANG) - b * Math.sin(ANG), ry = a * Math.sin(ANG) + b * Math.cos(ANG);
    return { x: clamp(PX + rx * pw, W * 0.80, W * 0.985), y: clamp(PY + ry * ph, H * 0.08, H * 0.92) };
  }
  const squash = (x) => 1 / (1 + Math.exp(-3.2 * x));

  function newPass(t0) {
    const src = galaxies[(R(0, 1) * galaxies.length) | 0];
    const acts = [Array.from({ length: SIZES[0] }, () => clamp(0.15 + R(0, 1) * 0.85, 0, 1))];
    for (let k = 1; k < SIZES.length; k++) {
      const prev = acts[k - 1], Wk = weights[k - 1], a = [];
      for (let j = 0; j < SIZES[k]; j++) { let s = 0; for (let i = 0; i < prev.length; i++) s += Wk[j][i] * (prev[i] - 0.45); a.push(squash(s)); }
      acts.push(a);
    }
    return { t0, src, acts, land: sampleFrom(acts[SIZES.length - 1]), landed: false };
  }

  function layout() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(1, rect.width); H = Math.max(1, rect.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed = 20260907;
    PX = W * 0.895; PY = H * 0.50; pw = W * 0.04; ph = H * 0.095;

    stars = [];
    for (let i = 0; i < Math.round(W * H / 6400); i++) stars.push({ x: R(0, W), y: R(0, H), r: R(0.3, 1.4), af: R(0, 1), a: 0, ph: R(0, 6.28), sp: R(0.5, 1.6) });
    galaxies = [];
    const NG = Math.round(W / 40); let tries = 0;
    const addGal = (fx, fy, depth, scale, alpha, forceType) => {
      const type = forceType || (depth < 0.4 ? (R(0, 1) < 0.6 ? 'd' : 'e') : (R(0, 1) < 0.5 ? 's' : 'e'));
      const gi = type === 's' ? 0 : type === 'e' ? 1 : 2;
      galaxies.push({ x: W * fx, y: H * fy, rot: R(0, 6.28), ph: R(0, 6.28), type, gi, tint: pal.gal[gi], r: lerp(1.4, 4.6, depth) * scale, a: alpha });
    };
    while (galaxies.length < NG && tries < NG * 8) {
      tries++; const fx = R(0.03, 0.46), fy = R(0.06, 0.94);
      if (fx < 0.44 && fy > 0.28 && fy < 0.72) continue;
      const depth = clamp((fx - 0.02) / 0.45, 0, 1);
      addGal(fx, fy, depth, R(0.7, 1.3), lerp(0.24, 0.56, depth) * R(0.8, 1.12));
    }
    addGal(0.115, 0.155, 0.5, 1.9, 0.6, 's'); addGal(0.305, 0.125, 0.65, 1.4, 0.52, 'e'); addGal(0.165, 0.85, 0.55, 1.7, 0.55, 's'); addGal(0.30, 0.88, 0.6, 1.3, 0.5, 'e');
    // richer field right next to the network: the survey the model is fed from
    for (let i = 0; i < 9; i++) addGal(R(0.44, 0.49), lerp(0.14, 0.86, i / 8) + R(-0.03, 0.03), 0.9, R(0.9, 1.5), R(0.55, 0.85));

    layers = SIZES.map((n, k) => Array.from({ length: n }, (_, i) => ({ x: W * COLS[k] + R(-W * 0.006, W * 0.006), y: H * lerp(0.2, 0.8, n === 1 ? 0.5 : i / (n - 1)) + R(-6, 6), r: R(1.6, 2.4), act: 0 })));
    weights = [];
    for (let k = 1; k < SIZES.length; k++) { const Wk = []; for (let j = 0; j < SIZES[k]; j++) { const row = []; for (let i = 0; i < SIZES[k - 1]; i++) row.push(gauss() * 0.9); Wk.push(row); } weights.push(Wk); }

    samples = []; passes = []; nextPass = 0;
    if (reduce) {                                    // still frame: a filled posterior + one pass mid-way
      for (let i = 0; i < 110; i++) { const p = newPass(0); samples.push({ x: p.land.x, y: p.land.y, born: -1 }); }
      passes.push(Object.assign(newPass(0), { t0: -1.45 })); passes.push(Object.assign(newPass(0), { t0: -0.55 }));
    }
    applyPalette();
  }
  function applyPalette() { for (const s of stars) s.a = lerp(0.08, pal.starMax, s.af); for (const g of galaxies) g.tint = pal.gal[g.gi]; readEnergy(); }

  function glow(cx, cy, r, rgb, a) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); }
  function star4(cx, cy, r) { const s = r * 0.3; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx + s, cy - s); ctx.lineTo(cx + r, cy); ctx.lineTo(cx + s, cy + s); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - s, cy + s); ctx.lineTo(cx - r, cy); ctx.lineTo(cx - s, cy - s); ctx.closePath(); ctx.fill(); }
  function ellipse(cx, cy, rl, rs, ang) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.scale(rl, rs); ctx.beginPath(); ctx.arc(0, 0, 1, 0, 7); ctx.restore(); }
  function drawGalaxy(g, now, bright) {
    const tint = `${g.tint[0]},${g.tint[1]},${g.tint[2]}`, a = g.a * (bright ? 1 : 0.85 + 0.15 * Math.sin(now * 0.7 + g.ph));
    glow(g.x, g.y, g.r * (bright ? 4.6 : 3.4), tint, a * (bright ? 0.4 : 0.26));
    if (g.type === 'e') { ellipse(g.x, g.y, g.r * 1.5, g.r * 0.95, g.rot); ctx.fillStyle = `rgba(${tint},${a * 0.9})`; ctx.fill(); }
    else if (g.type === 's') { ctx.strokeStyle = `rgba(${tint},${a * 0.55})`; ctx.lineWidth = 0.8; ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot); ctx.beginPath(); for (let arm = 0; arm < 2; arm++) { for (let t = 0; t <= 2.6; t += 0.2) { const rr = g.r * 0.3 * Math.exp(0.32 * t), th = t + arm * Math.PI; const x = rr * Math.cos(th), y = rr * 0.55 * Math.sin(th); t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } } ctx.stroke(); ctx.restore(); ctx.fillStyle = `rgba(${tint},${a})`; ctx.beginPath(); ctx.arc(g.x, g.y, g.r * 0.45, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = `rgba(${tint},${a * 0.8})`; ctx.beginPath(); ctx.arc(g.x, g.y, g.r * 0.7, 0, 7); ctx.fill(); }
  }

  function render(now) {
    ctx.clearRect(0, 0, W, H);
    const Ec = `${E[0]},${E[1]},${E[2]}`, Hc = `${EH[0]},${EH[1]},${EH[2]}`;
    for (const s of stars) { const a = s.a * (0.6 + 0.4 * Math.sin(now * s.sp + s.ph)); ctx.fillStyle = `rgba(${pal.star},${Math.max(0, a)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
    for (const g of galaxies) drawGalaxy(g, now, false);

    // posterior: glow, two iso-density contours, accumulated samples
    glow(PX, PY, Math.min(W, H) * 0.24, Ec, 0.09);
    ctx.strokeStyle = `rgba(${pal.edge},0.45)`; ctx.lineWidth = 1;
    for (const k of [1.1, 2.1]) { ctx.beginPath(); for (let q = 0; q <= 6.2832 + 0.001; q += 0.2) { const a = k * Math.cos(q), b = 0.42 * k * Math.sin(q); const rx = a * Math.cos(ANG) - b * Math.sin(ANG), ry = a * Math.sin(ANG) + b * Math.cos(ANG); const x = PX + rx * pw, y = PY + ry * ph; q === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); }
    for (const sm of samples) { const age = sm.born < 0 ? 1 : clamp((now - sm.born) / 0.5, 0, 1); ctx.fillStyle = `rgba(${Ec},${0.6 * age})`; ctx.beginPath(); ctx.arc(sm.x, sm.y, 1.6, 0, 7); ctx.fill(); }

    // network: faint copper edges (fully connected between adjacent layers)
    ctx.lineWidth = 0.9; ctx.strokeStyle = `rgba(${pal.edge},${pal.edgeMax})`;
    for (let k = 0; k < layers.length - 1; k++) for (const a of layers[k]) for (const b of layers[k + 1]) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    for (const L of layers) for (const nd of L) nd.act = 0;

    // passes: 0..0.18 ingest (galaxy -> input layer), then one layer transition per 0.2, then the sample flies
    ctx.lineCap = 'round';
    for (const p of passes) {
      const ph = (now - p.t0) / PASS_T;
      if (ph < 0) continue;
      // ingestion: a bright point leaves the galaxy toward the input layer's centroid
      if (ph < 0.18) {
        const q = ph / 0.18, cx = layers[0].reduce((s, n) => s + n.x, 0) / layers[0].length, cy = layers[0].reduce((s, n) => s + n.y, 0) / layers[0].length;
        const x = lerp(p.src.x, cx, q), y = lerp(p.src.y, cy, q);
        ctx.strokeStyle = `rgba(${Ec},${0.35 * (1 - q)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.src.x, p.src.y); ctx.lineTo(x, y); ctx.stroke();
        glow(x, y, 9, Ec, 0.8); ctx.fillStyle = `rgb(${Hc})`; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, 7); ctx.fill();
        glow(p.src.x, p.src.y, p.src.r * 5, Ec, 0.35 * (1 - q));
      }
      // layer-by-layer propagation
      for (let k = 0; k < layers.length; k++) {
        const start = 0.18 + k * 0.2, rise = clamp((ph - start) / 0.08, 0, 1);         // node k lights over 80 ms
        const fade = clamp(1 - (ph - start - 0.55) / 0.45, 0, 1);                       // and lingers, then fades
        const level = rise * fade;
        layers[k].forEach((nd, i) => { const a = p.acts[k][i] * level; if (a > nd.act) nd.act = a; });
        if (k > 0) {                                                                    // edges k-1 -> k light with the front
          const q = clamp((ph - (start - 0.2)) / 0.2, 0, 1); if (q <= 0 || fade <= 0) continue;
          const Wk = weights[k - 1]; let wmax = 0; for (const row of Wk) for (const w of row) wmax = Math.max(wmax, Math.abs(w));
          layers[k - 1].forEach((a, i) => layers[k].forEach((b, j) => {
            const s = p.acts[k - 1][i] * Math.abs(Wk[j][i]) / wmax; if (s < 0.12) return;
            const ex = lerp(a.x, b.x, q), ey = lerp(a.y, b.y, q);
            ctx.strokeStyle = `rgba(${Ec},${(0.15 + 0.85 * s) * (q < 1 ? 1 : fade)})`; ctx.lineWidth = 0.8 + 1.4 * s;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ex, ey); ctx.stroke();
            if (q < 1 && s > 0.5) { ctx.fillStyle = `rgb(${Hc})`; ctx.beginPath(); ctx.arc(ex, ey, 1.2, 0, 7); ctx.fill(); }
          }));
        }
      }
      // the sample: leaves the output layer and lands in the posterior
      const fly0 = 0.18 + (layers.length - 1) * 0.2 + 0.1;
      if (ph >= fly0) {
        const q = clamp((ph - fly0) / 0.22, 0, 1), out = layers[layers.length - 1];
        const ox = out.reduce((s, n) => s + n.x, 0) / out.length, oy = out.reduce((s, n) => s + n.y, 0) / out.length;
        const x = lerp(ox, p.land.x, q), y = lerp(oy, p.land.y, q) - Math.sin(q * Math.PI) * 18;
        ctx.strokeStyle = `rgba(${Ec},${0.5 * (1 - q)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(x, y); ctx.stroke();
        glow(x, y, 10, Ec, 0.9 * (1 - 0.5 * q)); ctx.fillStyle = `rgb(${Hc})`; ctx.beginPath(); ctx.arc(x, y, 2, 0, 7); ctx.fill();
        if (q >= 1 && !p.landed) { p.landed = true; samples.push({ x: p.land.x, y: p.land.y, born: now }); if (samples.length > MAXS) samples.shift(); }
      }
    }
    passes = passes.filter(p => (now - p.t0) / PASS_T < 1.25);

    // nodes: four-point stars whose brightness is their activation
    for (const L of layers) for (const nd of L) {
      if (nd.act > 0.03) glow(nd.x, nd.y, 6 + 14 * nd.act, Ec, 0.75 * nd.act);
      ctx.fillStyle = nd.act > 0.03 ? `rgba(${Hc},${0.55 + 0.45 * nd.act})` : `rgba(${pal.node},0.55)`;
      star4(nd.x, nd.y, nd.r * 2.2 + 3.2 * nd.act);
    }
  }

  function loop(now) {
    if (!running) return;
    if (now - lastT >= 33) { lastT = now; const t = now / 1000; if (t >= nextPass) { passes.push(newPass(t)); nextPass = t + 1.05; } render(t); }
    rafId = requestAnimationFrame(loop);
  }
  function start() { if (running || reduce || !visible) return; running = true; rafId = requestAnimationFrame(loop); }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }
  function init() { layout(); if (reduce) render(0); else start(); }
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) start(); else stop(); }, { threshold: 0.01 }).observe(canvas);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  new MutationObserver(() => { const t = document.documentElement.getAttribute('data-theme') || 'dark'; if (t !== theme) { theme = t; pal = PAL[t] || PAL.dark; applyPalette(); if (reduce) render(0); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-energy'] });
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); if (reduce) render(0); }, 200); });
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
