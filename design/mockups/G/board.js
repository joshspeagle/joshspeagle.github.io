/* board.js — the page is a board. Measures every [data-chip] after layout, routes copper traces
   from a trunk (fed by the hero network) into each chip's pin, and sends a pulse of energy along
   the trace when the chip scrolls into view. Static traces are pure SVG; motion is gated by
   prefers-reduced-motion (parked pulse + lit pins instead). No JS = no board. */
(function () {
  const svg = document.getElementById('board');
  if (!svg) return;
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const still = reduce || location.hash === '#still';
  let routes = [];          // {chip, path, len, pin, pulse, glow, lit}
  let raf = null, idle = null;

  function el(name, attrs, parent) {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(n);
    return n;
  }
  const abs = (r) => ({ left: r.left + scrollX, top: r.top + scrollY, right: r.right + scrollX, bottom: r.bottom + scrollY, width: r.width, height: r.height });

  function build() {
    routes.forEach(r => { r.chip.classList.remove('lit'); });
    routes = [];
    svg.innerHTML = '';
    const doc = document.documentElement;
    const H = Math.max(doc.scrollHeight, document.body.scrollHeight);
    const W = doc.clientWidth;
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const cont = document.querySelector('.container');
    const hero = document.querySelector('.hero');
    const foot = document.querySelector('footer');
    if (!cont || !hero) return;
    const c = abs(cont.getBoundingClientRect());
    const h = abs(hero.getBoundingClientRect());
    const narrow = W < 760;
    const tx = narrow ? 14 : Math.max(18, c.left - 34);       // trunk x, in the left gutter
    const g = el('g', { class: 'traces' });

    // 1. Feed: the hero network's output leaves the canvas, runs along the hero's bottom edge and
    //    drops into the trunk (45° corners only).
    const outX = narrow ? W * 0.5 : W * 0.69, outY = h.bottom - 70;
    const trunkTop = h.bottom + 6;
    el('path', { d: `M${outX} ${outY} V${h.bottom - 30} L${outX - 16} ${h.bottom - 14} H${tx + 16} L${tx} ${trunkTop + 2}`, class: 'tr tr-feed' }, g);
    el('use', { href: '#via', x: outX - 5, y: outY - 5, width: 10, height: 10, class: 'cu' }, g);

    // 2. Trunk down the gutter to the footer ground.
    const trunkBottom = foot ? abs(foot.getBoundingClientRect()).top + 28 : H - 60;
    const trunk = el('path', { d: `M${tx} ${trunkTop} V${trunkBottom}`, class: 'tr tr-trunk' }, g);
    idle = { path: trunk, len: trunk.getTotalLength(), glow: el('circle', { r: 7, class: 'idle-glow', opacity: 0 }, g), dot: el('circle', { r: 1.8, class: 'idle', opacity: 0 }, g), t: 0.35 };
    el('use', { href: '#gnd', x: tx - 9, y: trunkBottom - 2, width: 18, height: 18, class: 'cu' }, g);

    // 3. One branch per chip. Chips in a [data-bus] row share a bus above the row.
    const chips = Array.from(document.querySelectorAll('[data-chip]'));
    const buses = new Map();
    chips.forEach(chip => {
      const r = abs(chip.getBoundingClientRect());
      const busKey = chip.closest('[data-bus]');
      let d, pinX, pinY, pinSide;
      if (busKey && !narrow) {
        // bus: horizontal trace 16px above the row, tapped from the trunk once; each chip drops in from the top
        let b = buses.get(busKey);
        if (!b) {
          const rr = abs(busKey.getBoundingClientRect());
          const by = rr.top - 18;
          b = { y: by, x0: tx, x1: rr.right - 24 };
          buses.set(busKey, b);
          el('path', { d: `M${tx} ${by - 16} L${tx + 16} ${by} H${b.x1}`, class: 'tr' }, g);
          el('use', { href: '#via', x: tx - 5, y: by - 21, width: 10, height: 10, class: 'cu' }, g);
        }
        pinX = r.left + Math.min(56, r.width * 0.5); pinY = r.top; pinSide = 'top';
        d = `M${tx} ${b.y - 16} L${tx + 16} ${b.y} H${pinX} V${pinY - 6}`;
      } else {
        // left pin, 28px below the chip's top edge
        pinY = r.top + 28; pinX = r.left; pinSide = 'left';
        d = narrow ? `M${tx} ${pinY - 14} L${tx + 14} ${pinY} H${pinX - 6}` : `M${tx} ${pinY - 16} L${tx + 16} ${pinY} H${pinX - 6}`;
        el('use', { href: '#via', x: tx - 5, y: pinY - 21, width: 10, height: 10, class: 'cu' }, g);
      }
      const path = el('path', { d, class: 'tr tr-branch' }, g);
      // the pin: a small copper land on the chip edge
      const pin = pinSide === 'left'
        ? el('rect', { x: pinX - 7, y: pinY - 2.5, width: 8, height: 5, class: 'pin' }, g)
        : el('rect', { x: pinX - 2.5, y: pinY - 7, width: 5, height: 8, class: 'pin' }, g);
      const glow = el('circle', { r: 9, class: 'pulse-glow', opacity: 0 }, g);
      const pulse = el('circle', { r: 2.2, class: 'pulse', opacity: 0 }, g);
      routes.push({ chip, path, len: path.getTotalLength(), pin, pulse, glow, lit: false, t: -1 });
    });

    if (idle) {                        // a slow pulse rides the trunk continuously (parked when still)
      const place = (t) => { const p = idle.path.getPointAtLength(idle.len * t); idle.dot.setAttribute('cx', p.x); idle.dot.setAttribute('cy', p.y); idle.glow.setAttribute('cx', p.x); idle.glow.setAttribute('cy', p.y); idle.dot.setAttribute('opacity', 1); idle.glow.setAttribute('opacity', .7); };
      place(idle.t);
      if (!still) { const t0 = performance.now(); const period = 9000; (function ride(now) { if (idle.path !== trunk) return; idle.t = ((now - t0) % period) / period; place(idle.t); requestAnimationFrame(ride); })(t0); }
    }
    if (still) {                       // reduced motion / render: park a pulse mid-trace, light what's on screen
      routes.forEach((r, i) => {
        if (i % 4 === 1) {                       // one chip in four shows the pulse arriving
          const p = r.path.getPointAtLength(r.len * 0.72);
          r.pulse.setAttribute('cx', p.x); r.pulse.setAttribute('cy', p.y); r.pulse.setAttribute('opacity', 1);
          r.glow.setAttribute('cx', p.x); r.glow.setAttribute('cy', p.y); r.glow.setAttribute('opacity', .6);
        }
        if (i % 4 === 2) { r.pin.classList.add('lit'); r.chip.classList.add('lit'); }   // one has just powered up
      });
    }
  }

  // energy: when a chip enters view, a pulse travels its branch and the pin lights
  const active = new Set();
  function fire(r) { if (r.t >= 0 || r.lit) return; r.t = 0; r.pulse.setAttribute('opacity', 1); active.add(r); tick(); }
  let last = 0;
  function tick(now) {
    if (!active.size) { raf = null; return; }
    now = now || performance.now();
    const dt = last ? Math.min(40, now - last) : 16; last = now;
    for (const r of Array.from(active)) {
      r.t += dt / 900;                                       // ~0.9 s per branch
      const t = Math.min(1, r.t);
      const p = r.path.getPointAtLength(r.len * t);
      r.pulse.setAttribute('cx', p.x); r.pulse.setAttribute('cy', p.y);
      r.glow.setAttribute('cx', p.x); r.glow.setAttribute('cy', p.y);
      r.glow.setAttribute('opacity', 0.35 + 0.35 * Math.sin(t * Math.PI));
      if (t >= 1) { active.delete(r); r.lit = true; r.pulse.setAttribute('opacity', 0); r.glow.setAttribute('opacity', 0);
        r.pin.classList.add('lit'); r.chip.classList.add('lit'); setTimeout(() => r.chip.classList.remove('lit'), 1800); }
    }
    raf = requestAnimationFrame(tick);
  }

  function observe() {
    if (still || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { const r = routes.find(x => x.chip === e.target); if (r) fire(r); } }), { threshold: 0.35 });
    routes.forEach(r => io.observe(r.chip));
  }

  function init() { build(); observe(); }
  let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { build(); observe(); }, 250); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else init();
})();
