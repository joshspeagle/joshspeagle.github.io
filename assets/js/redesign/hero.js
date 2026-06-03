/* Inference-field hero: organic constellation -> activations -> posterior.
   Decorative (canvas is aria-hidden). Theme-aware, reduced-motion-safe,
   pauses off-screen / when the tab is hidden. Progressive enhancement:
   the CSS .backdrop renders a clean gradient if this never runs. */
(function () {
  const canvas = document.getElementById('hero-sky');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const R = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, t) => a + (b - a) * t;

  const PAL = {
    dark:  { star: '226,233,255', edge: '150,170,235', node: '190,200,240', v: [150,128,255], c: [70,224,238], img: 'assets/images/hero-posterior-dark.webp',  starMax: 0.7, edgeMax: 0.22 },
    light: { star: '70,66,120',   edge: '80,78,130',   node: '70,66,120',  v: [91,67,214],  c: [14,154,168], img: 'assets/images/hero-posterior-light.webp', starMax: 0.5, edgeMax: 0.26 },
  };

  let W = 0, H = 0, DPR = 1, FX = 0, FY = 0;
  let stars = [], nodes = [], edges = [], paths = [];
  let theme = document.documentElement.getAttribute('data-theme') || 'dark';
  let pal = PAL[theme] || PAL.dark;
  let img = new Image(); let imgReady = false;
  let running = false, visible = true, rafId = null, lastT = 0;

  function loadImg() {
    imgReady = false; img = new Image();
    img.onload = () => { imgReady = true; if (!running) drawOnce(); };
    img.src = pal.img;
  }

  function build() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(640, rect.width); H = Math.max(420, rect.height);
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    FX = W * 0.74; FY = H * 0.5;

    stars = [];
    for (let i = 0; i < Math.round(W * H / 5200); i++)
      stars.push({ x: R(0, W), y: R(0, H), r: R(0.3, 1.5), a: R(0.1, pal.starMax), ph: R(0, 6.28), sp: R(0.6, 1.8) });

    nodes = [];
    const n = 50;
    for (let i = 0; i < n; i++) nodes.push({ x: R(W * 0.08, W * 0.97), y: R(H * 0.1, H * 0.92), r: R(1.1, 2.5) });
    edges = [];
    for (let i = 0; i < n; i++) {
      const nb = nodes.map((p, j) => ({ j, d: (p.x - nodes[i].x) ** 2 + (p.y - nodes[i].y) ** 2 })).sort((a, b) => a.d - b.d).slice(1, 4);
      for (const k of nb) { const a = Math.min(i, k.j), b = Math.max(i, k.j); if (!edges.some(e => e.a === a && e.b === b)) edges.push({ a, b, d: Math.sqrt(k.d) }); }
    }
    // activation paths: from left nodes, hop greedily toward the focus
    const left = nodes.map((p, j) => ({ j, x: p.x })).sort((a, b) => a.x - b.x).slice(2, 16);
    const seeds = [left[1], left[5], left[9], left[12]].filter(Boolean);
    paths = [];
    for (const s of seeds) {
      let p = [s.j], vis = new Set([s.j]), cur = s.j;
      for (let h = 0; h < 6; h++) {
        let best = -1, bd = 1e9;
        for (const e of edges) { const j = e.a === cur ? e.b : (e.b === cur ? e.a : -1); if (j < 0 || vis.has(j)) continue; const d = (nodes[j].x - FX) ** 2 + (nodes[j].y - FY) ** 2; if (d < bd) { bd = d; best = j; } }
        if (best < 0) break; p.push(best); vis.add(best); cur = best;
      }
      const pts = p.map(i => ({ x: nodes[i].x, y: nodes[i].y })); pts.push({ x: FX, y: FY });
      paths.push({ pts, phase: R(0, 1), speed: R(0.06, 0.11) });
    }
  }

  function glow(cx, cy, r, rgb, a) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill(); }
  function smooth(pts) { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length - 1; i++) { const xc = (pts[i].x + pts[i + 1].x) / 2, yc = (pts[i].y + pts[i + 1].y) / 2; ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc); } ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y); }
  function ptAt(pts, f) { const seg = (pts.length - 1) * Math.max(0, Math.min(1, f)); const i = Math.min(pts.length - 2, Math.floor(seg)); const t = seg - i; return { x: lerp(pts[i].x, pts[i + 1].x, t), y: lerp(pts[i].y, pts[i + 1].y, t) }; }

  function render(t) {
    ctx.clearRect(0, 0, W, H);
    const V = pal.v, C = pal.c;
    // stars (twinkle)
    for (const s of stars) { const a = s.a * (0.6 + 0.4 * Math.sin(t * s.sp + s.ph)); ctx.fillStyle = `rgba(${pal.star},${Math.max(0, a)})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
    // base edges
    for (const e of edges) { const op = Math.max(0, pal.edgeMax - e.d / 3000); if (op <= 0) continue; ctx.strokeStyle = `rgba(${pal.edge},${op})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(nodes[e.a].x, nodes[e.a].y); ctx.lineTo(nodes[e.b].x, nodes[e.b].y); ctx.stroke(); }
    // base nodes
    for (const nd of nodes) { ctx.fillStyle = `rgba(${pal.node},0.5)`; ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r, 0, 7); ctx.fill(); }
    // posterior
    if (imgReady) { glow(FX, FY, Math.min(W, H) * 0.42, `${C[0]},${C[1]},${C[2]}`, 0.18); const w = Math.min(W * 0.62, 720), h = w * 0.77; ctx.globalAlpha = 0.95; ctx.drawImage(img, FX - w / 2, FY - h / 2, w, h); ctx.globalAlpha = 1; }
    // activation beams + traveling pulses
    for (const P of paths) {
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(${V[0]},${V[1]},${V[2]},0.13)`; ctx.lineWidth = 7; smooth(P.pts); ctx.stroke();
      const g = ctx.createLinearGradient(P.pts[0].x, P.pts[0].y, FX, FY); g.addColorStop(0, `rgb(${V})`); g.addColorStop(1, `rgb(${C})`); ctx.strokeStyle = g; ctx.lineWidth = 2; smooth(P.pts); ctx.stroke();
      for (let i = 0; i < P.pts.length - 1; i++) { const nd = P.pts[i], tt = i / (P.pts.length - 1); const col = `${Math.round(lerp(V[0], C[0], tt))},${Math.round(lerp(V[1], C[1], tt))},${Math.round(lerp(V[2], C[2], tt))}`; glow(nd.x, nd.y, 13, col, 0.5); }
      // pulse travels phase->focus
      const f = (P.phase + t * P.speed) % 1; const pp = ptAt(P.pts, f); const col = `${Math.round(lerp(V[0], C[0], f))},${Math.round(lerp(V[1], C[1], f))},${Math.round(lerp(V[2], C[2], f))}`;
      glow(pp.x, pp.y, 11, col, 0.9); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(pp.x, pp.y, 2, 0, 7); ctx.fill();
    }
  }

  function drawOnce() { render(reduce ? 0.5 : (performance.now ? 0 : 0)); }

  function loop(now) {
    if (!running) return;
    if (now - lastT >= 33) { lastT = now; render(now / 1000); } // ~30fps
    rafId = requestAnimationFrame(loop);
  }
  function start() { if (running || reduce || !visible) return; running = true; rafId = requestAnimationFrame(loop); }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }

  function init() { build(); loadImg(); if (reduce) { drawOnce(); } else { start(); } }

  // pause when off-screen
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) start(); else stop(); }, { threshold: 0.01 }).observe(canvas);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  // theme change -> swap palette + posterior
  new MutationObserver(() => { const t = document.documentElement.getAttribute('data-theme') || 'dark'; if (t !== theme) { theme = t; pal = PAL[t] || PAL.dark; loadImg(); for (const s of stars) s.a = Math.min(s.a, pal.starMax); if (reduce) drawOnce(); } }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  // debounced resize
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); if (reduce) drawOnce(); }, 200); });

  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
