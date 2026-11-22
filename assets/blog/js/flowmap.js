/* Generic interactive process flowchart component (window.Blog.flowmap / TP.initPlaybookMapImpl).
 * Reads node, phase, edge, and return metadata from window.BLOG_FLOWMAP (or TP.flowmapData).
 */
(function (global) {
  'use strict';
  var TP = global.Blog = global.TP = global.Blog || global.TP || {};
  var doc = global.document;
  (function ensureCss() {
    if (!doc || doc.querySelector('link[href$="diagram-map.css"]')) return;
    var me = doc.currentScript && doc.currentScript.src;
    var href = me ? me.replace(/js\/flowmap\.js(\?.*)?$/, 'css/diagram-map.css') : null;
    if (!href) return;
    var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = href;
    doc.head.appendChild(l);
  })();
  var SVGNS = 'http://www.w3.org/2000/svg';

  function cfg() { return global.BLOG_FLOWMAP || TP.flowmapData || {}; }
  var DATA, PB, SRC_LINK_LABEL, STORE_KEY, PHASES, STEPS, LEGACY_NODES, LEGACY_ZONES, VBW, VBH, NW, NH, TIP, BANDS, POS, RETURNS, EDGES, BY_ID;
  function loadSpec() {
    DATA = cfg();
    PB = DATA.sourceBaseUrl || '';
    SRC_LINK_LABEL = DATA.sourceLinkLabel || 'Read the source section ↗';
    STORE_KEY = DATA.storeKey || 'blog-posts-opened';
    PHASES = DATA.phases || [];
    STEPS = DATA.steps || [];
    LEGACY_NODES = DATA.legacyNodes || {};
    LEGACY_ZONES = DATA.legacyZones || {};
    VBW = DATA.vbW || 1000; VBH = DATA.vbH || 664; NW = DATA.nw || 166; NH = DATA.nh || 56; TIP = DATA.tip || 13;
    BANDS = DATA.bands || {};
    POS = DATA.pos || {};
    RETURNS = DATA.returns || [];
    EDGES = DATA.edges || [];
    BY_ID = {};
    STEPS.forEach(function (st, i) { st.num = i + 1; BY_ID[st.id] = st; });
    TP.playbookMapSteps = STEPS;
  }
  function xy(id) { var p = POS[id]; return p ? { x: p[0], y: p[1] } : { x: 0, y: 0 }; }
  function pts(list) { return list.map(function (p) { return p[0] + ',' + p[1]; }).join(' '); }

  /* ---------- helpers ---------- */
  function h(tag, attrs, kids) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); });
    (kids == null ? [] : [].concat(kids)).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  }
  function s(tag, attrs) {
    var n = doc.createElementNS(SVGNS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) n.setAttribute(k, attrs[k]); });
    return n;
  }
  function readOpened() {
    try { var v = JSON.parse(global.localStorage.getItem(STORE_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function writeOpened(list) { try { global.localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch (e) {} }

  function pageInfo() {
    var page = (doc.body && doc.body.getAttribute('data-page')) || '';
    var root = (doc.body && doc.body.getAttribute('data-root')) || '';
    var entry = (TP.pages || []).filter(function (p) { return p.file === page; })[0];
    var post = entry && !entry.unnumbered && entry.num >= 1 && entry.num <= 9 ? entry.num : 0;
    return { root: root, post: post };
  }
  function postEntry(n) { return (TP.pages || []).filter(function (p) { return p.num === n && !p.unnumbered; })[0]; }
  function postShort(n) {
    var en = postEntry(n);
    var t = en && en.short ? String(en.short).replace(/^\d+\.\s*/, '') : '';
    return 'Part ' + n + (t ? ' · ' + t : '');
  }
  function postHref(root, n, hash) {
    var en = postEntry(n);
    return en ? root + en.file + (hash ? '#' + hash : '') : '#';
  }

  function metaText(st, isHere, isOpened) {
    var others = st.posts.filter(function (p) { return !isHere || p !== isHere; });
    var t = isHere ? 'This part' + (others.length ? ' and Part ' + others.join(', ') : '') : 'Part ' + st.posts.join(', ');
    return t + (isOpened && !isHere ? ' \u00b7 opened' : '');
  }

  function phaseOf(id) { return PHASES.filter(function (p) { return p.id === id; })[0]; }
  function phasePosts(phId) {
    var set = [];
    STEPS.forEach(function (st) { if (st.phase === phId) st.posts.forEach(function (p) { if (set.indexOf(p) < 0) set.push(p); }); });
    set.sort(function (a, b) { return a - b; });
    if (set.length === 1) return 'Part ' + set[0];
    return 'Parts ' + set.slice(0, -1).join(', ') + ' and ' + set[set.length - 1];
  }

  /* ---------- the component ---------- */
  function build(mapEl, info, opened) {
    var rawNode = mapEl.getAttribute('data-default-node') || '';
    var rawZone = mapEl.getAttribute('data-active-zone') || '';
    var zone = phaseOf(rawZone) ? rawZone : (LEGACY_ZONES[rawZone] || '');
    var here = info.post;
    var hereSteps = STEPS.filter(function (st) { return here && st.posts.indexOf(here) >= 0; });
    var wanted = BY_ID[rawNode] ? rawNode : (LEGACY_NODES[rawNode] || '');
    var initial = wanted;
    if (here && hereSteps.length && (!wanted || BY_ID[wanted].posts.indexOf(here) < 0)) initial = hereSteps[0].id;
    if (!initial) initial = STEPS[0].id;

    var uid = 'pmap-' + Math.random().toString(36).slice(2, 8);
    mapEl.innerHTML = '';
    mapEl.classList.add('pmap');
    if (here) mapEl.classList.add('pmap-on-post');

    /* header */
    var head = h('div', { class: 'pmap-head' });
    head.appendChild(h('h3', { class: 'pmap-title', id: uid + '-title' }, here ? 'Where Part ' + here + ' fits in the tuning process' : 'The tuning process, step by step'));
    head.appendChild(h('p', { class: 'pmap-sub' }, here
      ? 'Steps covered in this part are marked. Select any step to see what it involves and which part covers it.'
      : 'Select a step to see what it involves, what the Playbook says about it and which part of the series covers it.'));
    var key = h('ul', { class: 'pmap-key', 'aria-label': 'Key' });
    key.appendChild(h('li', null, [h('span', { class: 'pmap-key-icon is-action', 'aria-hidden': 'true' }), 'Action']));
    key.appendChild(h('li', null, [h('span', { class: 'pmap-key-icon is-decision', 'aria-hidden': 'true' }), 'Decision']));
    key.appendChild(h('li', null, [h('span', { class: 'pmap-key-badge', 'aria-hidden': 'true' }, '4'), 'Part that covers the step']));
    if (here) key.appendChild(h('li', null, [h('span', { class: 'pmap-key-badge is-here', 'aria-hidden': 'true' }, String(here)), 'This part']));
    if (opened.length) key.appendChild(h('li', null, [h('span', { class: 'pmap-key-badge is-opened', 'aria-hidden': 'true' }, '✓'), 'Parts you have opened']));
    head.appendChild(key);
    mapEl.appendChild(head);

    var state = { sel: null };
    var deskNodes = {}, listItems = {}, edgeEls = [];

    /* ----- wide view: SVG ----- */
    var desk = h('div', { class: 'pmap-desk' });
    var svg = s('svg', { viewBox: '0 0 ' + VBW + ' ' + VBH, class: 'pmap-svg', role: 'group', 'aria-labelledby': uid + '-title' });
    var defs = s('defs');
    var mk = s('marker', { id: uid + '-arrow', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7', orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' });
    mk.appendChild(s('path', { d: 'M0,0.5 L10,5 L0,9.5 z', class: 'pmap-arrowhead' }));
    var mkOn = s('marker', { id: uid + '-arrow-on', viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '8', markerHeight: '8', orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' });
    mkOn.appendChild(s('path', { d: 'M0,0.5 L10,5 L0,9.5 z', class: 'pmap-arrowhead is-on' }));
    defs.appendChild(mk); defs.appendChild(mkOn);
    svg.appendChild(defs);

    var labelLayer = s('g', { class: 'pmap-band-labels', 'aria-hidden': 'true' });
    PHASES.forEach(function (ph) {
      var b = BANDS[ph.id];
      var g = s('g', { class: 'pmap-band' + (zone === ph.id ? ' is-zone' : ''), 'data-phase': ph.id, 'aria-hidden': 'true' });
      g.appendChild(s('rect', { x: 28, y: b.top, width: 956, height: b.bottom - b.top, rx: 10, class: 'pmap-band-bg' }));
      svg.appendChild(g);
      var t = s('text', { x: 44, y: b.top + 20, class: 'pmap-band-label' });
      t.textContent = ph.n + '  ' + ph.name;
      labelLayer.appendChild(t);
      var t2 = s('text', { x: 968, y: b.top + 20, class: 'pmap-band-posts', 'text-anchor': 'end' });
      t2.textContent = phasePosts(ph.id);
      labelLayer.appendChild(t2);
    });

    var edgeLayer = s('g', { class: 'pmap-edges', 'aria-hidden': 'true' });
    EDGES.forEach(function (ed) {
      var g = s('g', { class: 'pmap-edge ' + ed.cls });
      var line = s('polyline', { points: pts(ed.points), class: 'pmap-edge-line', 'marker-end': 'url(#' + uid + '-arrow)' });
      g.appendChild(line);
      if (ed.label) {
        var lt = s('text', { x: ed.lx, y: ed.ly, class: 'pmap-edge-label', 'text-anchor': 'middle' });
        lt.textContent = ed.label;
        g.appendChild(lt);
      }
      edgeLayer.appendChild(g);
      edgeEls.push({ g: g, line: line, from: ed.from, to: ed.to });
    });
    svg.appendChild(edgeLayer);
    svg.appendChild(labelLayer);

    function shapeFor(st) {
      var c = xy(st.id), x0 = c.x - NW / 2, y0 = c.y - NH / 2;
      if (st.kind === 'decision') {
        return s('polygon', { class: 'pmap-shape', points: pts([[x0, c.y], [x0 + TIP, y0], [x0 + NW - TIP, y0], [x0 + NW, c.y], [x0 + NW - TIP, y0 + NH], [x0 + TIP, y0 + NH]]) });
      }
      return s('rect', { class: 'pmap-shape', x: x0, y: y0, width: NW, height: NH, rx: 8 });
    }

    STEPS.forEach(function (st) {
      var c = xy(st.id);
      var isHere = here && st.posts.indexOf(here) >= 0;
      var isOpened = st.posts.some(function (p) { return opened.indexOf(p) >= 0; });
      var g = s('g', {
        class: 'pmap-node is-' + st.kind + (isHere ? ' is-here' : '') + (isOpened ? ' is-opened' : '') + (zone && st.phase === zone ? ' is-zone' : ''),
        'data-step': st.id, tabindex: '0', role: 'button', 'aria-pressed': 'false',
        'aria-label': 'Step ' + st.num + ', ' + (st.kind === 'decision' ? 'decision: ' : '') + st.title + '. Covered in Part ' + st.posts.join(' and ') + (isHere ? ' (this part)' : '') + '.'
      });
      var ring = shapeFor(st); ring.setAttribute('class', 'pmap-ring');
      g.appendChild(ring);
      g.appendChild(shapeFor(st));
      var n = st.label.length;
      st.label.forEach(function (line, i) {
        var t = s('text', { x: c.x, y: c.y + (i - (n - 1) / 2) * 18 + 5, class: 'pmap-node-label', 'text-anchor': 'middle' });
        t.textContent = line;
        g.appendChild(t);
      });
      var bx = c.x + NW / 2 - 4, by = c.y - NH / 2 + 2;
      g.appendChild(s('circle', { cx: bx, cy: by, r: 11, class: 'pmap-badge' }));
      var bt = s('text', { x: bx, y: by + 4.5, class: 'pmap-badge-text', 'text-anchor': 'middle' });
      bt.textContent = String(st.posts[0]);
      g.appendChild(bt);
      if (isOpened && !isHere) {
        g.appendChild(s('circle', { cx: bx - 19, cy: by - 4, r: 6.5, class: 'pmap-check-bg' }));
        g.appendChild(s('path', { d: 'M' + (bx - 22) + ',' + (by - 4) + ' l2.2,2.2 l4.3,-4.5', class: 'pmap-check' }));
      }
      g.addEventListener('click', function () { select(st.id, { from: 'desk' }); });
      g.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(st.id, { from: 'desk' }); }
        else if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { ev.preventDefault(); moveFocus(st.num); }
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { ev.preventDefault(); moveFocus(st.num - 2); }
      });
      svg.appendChild(g);
      deskNodes[st.id] = g;
    });
    function moveFocus(idx) {
      var st = STEPS[Math.max(0, Math.min(STEPS.length - 1, idx))];
      if (st && deskNodes[st.id]) deskNodes[st.id].focus();
    }

    RETURNS.forEach(function (r) {
      var cx = r.x, w = 152, hh = 34;
      var tgt = BY_ID[r.target];
      var g = s('g', { class: 'pmap-return', tabindex: '0', role: 'button', 'aria-label': 'Go back to step ' + tgt.num + ': ' + tgt.title });
      g.appendChild(s('rect', { x: cx - w / 2, y: r.y - hh / 2, width: w, height: hh, rx: hh / 2, class: 'pmap-return-shape' }));
      var t = s('text', { x: cx, y: r.y + 5, class: 'pmap-return-label', 'text-anchor': 'middle' });
      t.textContent = r.text;
      g.appendChild(t);
      function go() { select(r.target, { from: 'desk' }); if (deskNodes[r.target]) deskNodes[r.target].focus(); }
      g.addEventListener('click', go);
      g.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
      svg.appendChild(g);
    });

    desk.appendChild(h('div', { class: 'pmap-canvas' }, svg));

    /* inspector */
    var insp = h('div', { class: 'pmap-inspector', 'aria-live': 'polite' });
    var iMain = h('div', { class: 'pmap-insp-main' });
    var iKicker = h('div', { class: 'pmap-insp-kicker' });
    var iTitle = h('h4', { class: 'pmap-insp-title' });
    var iWhat = h('p', { class: 'pmap-insp-what' });
    var iPb = h('p', { class: 'pmap-insp-pb' });
    iMain.appendChild(iKicker); iMain.appendChild(iTitle); iMain.appendChild(iWhat); iMain.appendChild(iPb);
    var iSide = h('div', { class: 'pmap-insp-side' });
    var iReadHead = h('div', { class: 'pmap-insp-head' }, 'Read in the notes');
    var iLinks = h('ul', { class: 'pmap-insp-links' });
    var iNextHead = h('div', { class: 'pmap-insp-head' });
    var iNext = h('div', { class: 'pmap-insp-next' });
    iSide.appendChild(iReadHead); iSide.appendChild(iLinks); iSide.appendChild(iNextHead); iSide.appendChild(iNext);
    insp.appendChild(iMain); insp.appendChild(iSide);
    desk.appendChild(insp);
    mapEl.appendChild(desk);

    /* ----- narrow view: grouped accordion list ----- */
    var list = h('ol', { class: 'pmap-list', 'aria-labelledby': uid + '-title' });
    PHASES.forEach(function (ph) {
      var li = h('li', { class: 'pmap-phase' + (zone === ph.id ? ' is-zone' : '') });
      li.appendChild(h('div', { class: 'pmap-phase-head' }, [
        h('span', { class: 'pmap-phase-num', 'aria-hidden': 'true' }, String(ph.n)),
        h('span', { class: 'pmap-phase-name' }, ph.name),
        h('span', { class: 'pmap-phase-posts' }, phasePosts(ph.id))
      ]));
      var ol = h('ol', { class: 'pmap-steps' });
      STEPS.filter(function (st) { return st.phase === ph.id; }).forEach(function (st) {
        var isHere = here && st.posts.indexOf(here) >= 0;
        var isOpened = st.posts.some(function (p) { return opened.indexOf(p) >= 0; });
        var item = h('li', { class: 'pmap-step is-' + st.kind + (isHere ? ' is-here' : '') + (isOpened ? ' is-opened' : ''), 'data-step': st.id });
        var pid = uid + '-p-' + st.id;
        var btn = h('button', { type: 'button', class: 'pmap-step-btn', 'aria-expanded': 'false', 'aria-controls': pid }, [
          h('span', { class: 'pmap-step-icon', 'aria-hidden': 'true' }, String(st.num)),
          h('span', { class: 'pmap-step-text' }, [
            h('span', { class: 'pmap-step-title' }, st.title),
            h('span', { class: 'pmap-step-meta' }, metaText(st, isHere ? here : 0, isOpened))
          ]),
          h('span', { class: 'pmap-step-chev', 'aria-hidden': 'true' })
        ]);
        var panel = h('div', { class: 'pmap-step-panel', id: pid, hidden: 'hidden' });
        btn.addEventListener('click', function () {
          if (state.sel === st.id && btn.getAttribute('aria-expanded') === 'true') collapse(st.id);
          else select(st.id, { from: 'list' });
        });
        item.appendChild(btn); item.appendChild(panel);
        ol.appendChild(item);
        listItems[st.id] = { li: item, btn: btn, panel: panel };
      });
      li.appendChild(ol);
      list.appendChild(li);
    });
    mapEl.appendChild(list);

    /* ----- shared content ----- */
    function linkList(st, ul) {
      st.links.forEach(function (lk) {
        var a = h('a', { href: postHref(info.root, lk.post, lk.hash) }, [h('span', { class: 'pmap-link-part' }, 'Part ' + lk.post), lk.label]);
        if (here && lk.post === here) a.appendChild(h('span', { class: 'pmap-link-here' }, ' (this part)'));
        ul.appendChild(h('li', null, a));
      });
    }
    function pbLine(st, p) {
      p.textContent = st.pb.text + ' ';
      p.appendChild(h('a', { href: PB + st.pb.anchor, target: '_blank', rel: 'noopener' }, SRC_LINK_LABEL));
    }
    function nextButtons(st, box, from) {
      st.next.forEach(function (nx) {
        var tgt = BY_ID[nx.target];
        var lab = (nx.answer ? nx.answer + ': ' : '') + (nx.label || tgt.title);
        var b = h('button', { type: 'button', class: 'pmap-next-btn' + (nx.answer ? ' is-branch' : '') }, [
          h('span', { class: 'pmap-next-label' }, lab),
          h('span', { class: 'pmap-next-step' }, 'Step ' + tgt.num + (nx.label ? ' · ' + tgt.title : '') + ' →')
        ]);
        b.addEventListener('click', function () {
          select(nx.target, { from: from });
          if (from === 'list' && listItems[nx.target]) {
            listItems[nx.target].btn.focus({ preventScroll: true });
            listItems[nx.target].li.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        });
        box.appendChild(b);
      });
    }

    function collapse(id) {
      var it = listItems[id];
      if (!it) return;
      it.btn.setAttribute('aria-expanded', 'false');
      it.panel.setAttribute('hidden', 'hidden');
      it.li.classList.remove('is-open');
    }

    function select(id, opts) {
      var st = BY_ID[id];
      if (!st) return;
      state.sel = id;
      Object.keys(deskNodes).forEach(function (k) {
        var on = k === id;
        deskNodes[k].classList.toggle('is-selected', on);
        deskNodes[k].setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      edgeEls.forEach(function (ed) {
        var on = ed.from === id || ed.to === id;
        ed.g.classList.toggle('is-on', on);
        ed.line.setAttribute('marker-end', 'url(#' + uid + (on ? '-arrow-on' : '-arrow') + ')');
      });
      var ph = phaseOf(st.phase);
      iKicker.textContent = 'Step ' + st.num + ' of ' + STEPS.length + ' · ' + ph.name + (st.kind === 'decision' ? ' · Decision' : '');
      iTitle.textContent = st.title;
      iWhat.textContent = st.what;
      pbLine(st, iPb);
      iLinks.innerHTML = '';
      linkList(st, iLinks);
      iNext.innerHTML = '';
      iNextHead.textContent = st.next.length ? (st.kind === 'decision' ? 'Answer' : 'Next') : '';
      iNextHead.hidden = !st.next.length;
      nextButtons(st, iNext, 'desk');

      Object.keys(listItems).forEach(function (k) {
        var it = listItems[k];
        var on = k === id;
        it.li.classList.toggle('is-selected', on);
        if (on) {
          it.panel.innerHTML = '';
          it.panel.appendChild(h('p', { class: 'pmap-insp-what' }, st.what));
          var p = h('p', { class: 'pmap-insp-pb' }); pbLine(st, p); it.panel.appendChild(p);
          var ul = h('ul', { class: 'pmap-insp-links' }); linkList(st, ul); it.panel.appendChild(ul);
          if (st.next.length) {
            var box = h('div', { class: 'pmap-insp-next' });
            nextButtons(st, box, 'list');
            it.panel.appendChild(box);
          }
          it.btn.setAttribute('aria-expanded', 'true');
          it.panel.removeAttribute('hidden');
          it.li.classList.add('is-open');
        } else {
          collapse(k);
        }
      });
    }

    select(initial, { from: 'init' });
    TP.playbookMaps = TP.playbookMaps || [];
    TP.playbookMaps.push({ el: mapEl, select: select, steps: STEPS.map(function (x) { return x.id; }) });
  }

  TP.initPlaybookMapImpl = TP.initFlowMapImpl = function initPlaybookMap(scope) {
    loadSpec(); if (!STEPS.length) return;
    var rootEl = scope || doc;
    var maps = rootEl.querySelectorAll('.playbook-map');
    var info = pageInfo();
    var opened = readOpened();
    if (info.post && opened.indexOf(info.post) < 0) { opened = opened.concat([info.post]).sort(function (a, b) { return a - b; }); writeOpened(opened); }
    Array.prototype.forEach.call(maps, function (mapEl) {
      if (mapEl.getAttribute('data-pbm-ready') === '1') return;
      mapEl.setAttribute('data-pbm-ready', '1');
      build(mapEl, info, opened);
    });
  };
  TP.playbookMapSteps = STEPS;
})(typeof window !== 'undefined' ? window : globalThis);
