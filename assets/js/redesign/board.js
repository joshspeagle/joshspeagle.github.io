/**
 * Architectural section-rail layer (#board) for the homepage.
 *
 * On wide desktop viewports on the homepage, renders a subtle vertical margin
 * rail with 45-degree junctions into each top-level `.sec-head` section title
 * and a scroll-coupled progress indicator. Does not draw header traces or card
 * bus stubs on secondary pages.
 */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var XLINK = 'http://www.w3.org/1999/xlink';

  function el(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === 'href') {
          node.setAttribute('href', attrs[k]);
          node.setAttributeNS(XLINK, 'xlink:href', attrs[k]);
        } else {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function n(v) {
    return Math.round(v * 2) / 2;
  }

  function abs(r) {
    var sx = window.scrollX || window.pageXOffset || 0;
    var sy = window.scrollY || window.pageYOffset || 0;
    return {
      left: r.left + sx,
      top: r.top + sy,
      right: r.right + sx,
      bottom: r.bottom + sy,
      width: r.width,
      height: r.height
    };
  }

  var svg = document.getElementById('board');
  var pulsePath = null;
  var pulseStar = null;
  var trunkWaypoints = null;
  var trunkLen = 0;

  function build() {
    if (!svg) return;
    svg.innerHTML = '';
    pulsePath = null;
    pulseStar = null;
    trunkLen = 0;

    var hero = document.querySelector('.hero');
    if (!hero) return;

    var doc = document.documentElement;
    var H = Math.max(doc.scrollHeight, document.body.scrollHeight);
    var W = doc.clientWidth;
    if (W < 1180) return;

    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    var main = document.querySelector('main');
    var cont = (main && main.querySelector('.container')) || document.querySelector('.container');
    var foot = document.querySelector('footer');
    if (!cont || !main) return;

    var c = abs(cont.getBoundingClientRect());
    var tx = Math.max(20, n(c.left - 28));
    if (c.left < 52) return;

    var hb = abs(hero.getBoundingClientRect());
    var trunkTop = n(hb.bottom + 12);
    var trunkBottom = n(foot ? abs(foot.getBoundingClientRect()).top - 16 : H - 60);
    if (trunkBottom <= trunkTop + 40) return;

    var defs = el('defs', null, svg);
    var grad = el('linearGradient', {
      id: 'board-pulse-grad',
      x1: '0', y1: '0', x2: '0', y2: '1'
    }, defs);
    el('stop', { offset: '0%',   'stop-color': 'var(--energy)', 'stop-opacity': '0.12' }, grad);
    el('stop', { offset: '80%',  'stop-color': 'var(--energy)', 'stop-opacity': '0.65' }, grad);
    el('stop', { offset: '100%', 'stop-color': 'var(--energy)', 'stop-opacity': '0.95' }, grad);

    var g = el('g', { 'class': 'traces' }, svg);

    el('path', { d: 'M' + tx + ' ' + trunkTop + ' V' + trunkBottom, 'class': 'tr tr-trunk' }, g);
    el('use', { href: '#gnd', x: tx - 9, y: trunkBottom - 2, width: 18, height: 18, 'class': 'cu' }, g);

    trunkLen = trunkBottom - trunkTop;
    trunkWaypoints = { x: tx, y0: trunkTop, y1: trunkBottom };
    pulsePath = el('path', {
      'class': 'b-pulse',
      d: 'M' + tx + ' ' + trunkTop + ' L' + tx + ' ' + trunkTop
    }, g);
    pulseStar = el('use', {
      href: '#star4',
      'class': 'b-star b-pulse-star',
      x: tx - 6,
      y: trunkTop - 6,
      width: 12,
      height: 12
    }, g);

    var secHeads = document.querySelectorAll('main .sec-head');
    for (var s = 0; s < secHeads.length; s++) {
      var sb = abs(secHeads[s].getBoundingClientRect());
      var sy = n(sb.top + sb.height * 0.5);
      if (sy > trunkTop + 12 && sy < trunkBottom - 12) {
        el('path', {
          d: 'M' + tx + ' ' + (sy - 10) + ' L' + (tx + 10) + ' ' + sy + ' H' + n(sb.left - 8),
          'class': 'tr'
        }, g);
        el('use', { href: '#via', x: tx - 5, y: sy - 15, width: 10, height: 10, 'class': 'cu' }, g);
      }
    }

    updateScrollHorizon();
  }

  function updateScrollHorizon() {
    if (!pulsePath || !trunkLen || !trunkWaypoints) return;
    var sy = window.scrollY || window.pageYOffset || 0;
    var vh = window.innerHeight || document.documentElement.clientHeight || 1;
    var maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    var p;
    if (sy <= 2) {
      var rest = vh * 0.60 - trunkWaypoints.y0;
      p = Math.max(0.08, Math.min(0.28, rest / trunkLen));
    } else {
      var horizon = sy + vh * 0.65;
      var byViewport = (horizon - trunkWaypoints.y0) / trunkLen;
      var byScroll = sy / maxScroll;
      p = Math.max(0.08, Math.min(1, Math.max(byViewport, byScroll)));
    }
    var y = n(trunkWaypoints.y0 + p * trunkLen);
    pulsePath.setAttribute('d', 'M' + trunkWaypoints.x + ' ' + trunkWaypoints.y0 +
                                ' L' + trunkWaypoints.x + ' ' + y);
    if (pulseStar) {
      pulseStar.setAttribute('y', y - 6);
    }
  }

  var scrollRaf = false;
  window.addEventListener('scroll', function () {
    if (scrollRaf) return;
    scrollRaf = true;
    requestAnimationFrame(function () {
      scrollRaf = false;
      updateScrollHorizon();
    });
  }, { passive: true });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(build, 200);
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(build);
  } else {
    build();
  }
})();
