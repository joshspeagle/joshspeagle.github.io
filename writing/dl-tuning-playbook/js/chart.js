/*
 * chart.js: the chart helpers of version 2 (TP.chart).
 *
 * It carries out notes/revamp/design-system.md (DS) §11.5 with DS §4 (marks), §5 (labels and
 * annotations), §6.2 (handles), §8 (linking, reading, tooltips, dismissal) and §9 (motion), as
 * notes/revamp/implementation-plan.md WO-I4 specifies. The label placer's geometry lives in
 * site/js/lib/placer.js (TP.placer), which this file feeds and renders. Colours come from the role
 * classes and mark classes of site/css/site.css (DS §2.3 rule 7), so a theme change needs no redraw.
 * Classic script. The pure helpers (snapping, stepping, keys, ticks, interpolation, the ramp) load
 * in Node for node --test. The DOM helpers need a document and D3 v7.
 *
 * ================================================================================================
 * PUBLIC API. Coordinates passed to helpers are data units unless a name says px. "Plot px" are
 * pixels inside the frame (the plot area), origin at its top left, y down.
 * ================================================================================================
 *
 * ROLES. role is one of 'model' (toy output, the default), 'data', 'third', 'fourth', 'fifth',
 * 'context', 'ref', 'reader'. Every mark takes the class r-<role> and a mark class of site.css.
 * series: the id that ties a series' line, markers and label together for the placer (a label's
 * own series is never its rival). It defaults to the role, so give series where two series share
 * a role. key: an accessor (d, i) => key, or a constant. Every element a helper draws with a key
 * carries data-key. Multi-element helpers default to d.key when rows carry a key field.
 *
 * PANEL
 *   var p = C.panel(container, {
 *     letter: '(a)',                  // panel letter; omit for a one-panel figure
 *     describe: 'loss against step',  // fixed description of the axes. The group's name is
 *                                     // letter + ' ' + describe (default: yLabel against xLabel)
 *     note: 'step 340 of 2,000',      // live text of span.panel-note; p.setNote(text) changes it
 *     aspect: 0.62 | fn(w, phone),    // SVG height over width (default 0.62)
 *     plotAspect: n | fn(w, phone),   // or the frame's height over width, for a slope panel
 *     maxHeight: px | fn(w, phone),   // a height cap met by shrinking the width, centred
 *     nameMargin: px,                 // right margin reserved for names outside the frame
 *                                     // (desktop layout only, DS §5.6)
 *     inner: true | fn(phone),        // an inner frame of small multiples: no y tick labels or
 *                                     // y title, and no x tick labels or x title below 640 px;
 *                                     // a function decides it per layout (a stack on a phone)
 *     xLog, yLog: true (base 2) | 10, xDomain, yDomain, xLabel, yLabel (string or fn(p)),
 *     xTicks, yTicks: array | fn(domain, px) | 'pow2' | 'pow10' | 'none' | count,
 *     xMinorTicks, xFormat, yFormat, xMinGap (34), yMinGap (20),
 *     grid: 'y' (default) | 'x' | 'both' | 'none',   // gridlines perpendicular to what is read
 *     margin: {t, r, b, l} | fn(w, phone), key (data-panel, default the letter's character)
 *   })
 *   p = {el, head, svg, g, layers, x, y, width, height, W, H, margin, h (text height, 14 or 13),
 *        phone, update(fn), render(), setNote(text), toEl(X, Y) -> {left, top} (plot px to the
 *        panel element's px), origin() -> {left, top, k} (the plot's top left in the panel
 *        element's px, and the SVG's scale), index() (the placer index of this render's
 *        obstacles), clear(), redrawMarks(fn)}
 *   p.update(fn) sets the draw function fn(p) and redraws: axes, then cleared layers, the ghost,
 *   fn, then the labels queued by annotations, bands and windows (placed if fn did not call
 *   C.place), tick hiding, handles, reading and linking. A ResizeObserver redraws on width
 *   changes, and after such a redraw the panel element dispatches the bubbling event
 *   'tp:panel-resize'. That redraw calls fn alone, so a figure that settles its labels for the
 *   panel's size redraws itself on the event (TP.fig does). The panel element takes no focus.
 *   Nothing in flow may follow the SVG in a panel.
 *   C.panelOf(el), C.panels(root) -> panel objects; C.renderAll(root) measures every panel's
 *   width and redraws it now (printing); it dispatches no event.
 *   p.origin() is measured from the layout once and kept across renders. It is measured again
 *   after the SVG's size, margins or place in the panel change (a render's size step), and when
 *   a ResizeObserver on the header reports a height other than the one the origin was measured
 *   with. That observer runs after the browser's layout and before the frame is painted, and it
 *   places the handles, the reading element and the label buttons on the new origin. A render
 *   therefore reads no layout while its size stays the same: the note (p.setNote) and the header
 *   forms of labels wait for the observer. Code that reads a handle's or a label button's
 *   position in the same task as a change of the header's height reads it before the observer
 *   has run.
 *   p.index() builds the index once per render from p.obstacles, reusing the panel's previous
 *   index (its item arrays keep their capacity) while the plot's size is unchanged.
 *   p.clear() empties the cleared layers and the render's records (obstacles, keyed marks, lines,
 *   regions, annotations, axis names, queued labels), the first step of every render.
 *   p.redrawMarks(fn) is a partial redraw for a frame of play: p.clear(), then fn(p). The axes,
 *   the ghost, label placement, the header labels, tick hiding, the handles, the reading element
 *   and linking stay as the last full render left them, and C.labelReport(p) keeps that render's
 *   labels. Use it only for a panel whose frame of play draws no label, axis name or handle, and
 *   whose reading's positions do not change; any other draw calls p.update or p.render.
 *
 * MARKS (each returns what it drew)
 *   C.line(p, rows, x, y, {role, series, key, dash: 'ghost'|'level'|'trail', weight, alpha,
 *                          ghost, cache, decimate, layer})
 *       3-px series line (context: 1.5 px). alpha is allowed on a line only for an ensemble of
 *       seeds (DS §4.6, ruled for F8.2): 0.3 opacity at 1.5 px, full opacity on highlight.
 *       ghost: false keeps the line out of C.ghost's copy.
 *   C.markers(p, rows, x, y, {role, series, key, shape: 'circle'|'diamond'|'square',
 *                             fill: 'filled'|'open', size, color: fn(d, i), thin: px, keep})
 *       sizes of DS §4.1 by shape and fill; defaults by role (DS §4.2): model filled circle,
 *       third open circle, fourth open diamond, data open square. thin keeps markers at least
 *       thin px apart along x, both ends and keep(d, i) kept, and no thinned marker within thin
 *       px of a kept one; beside a kept point the spacing counts outward from it (rows in order
 *       of x). color(d, i) returns a colour that
 *       goes to the marker's inline --c with class ramp, so that .has-hi greying still applies.
 *   C.markerPath(p, rows, x, y, {role, key, shape: 'circle'|'left'|'right', fill, r})
 *       hundreds of markers as one path.
 *   C.dots(p, rows, x, y, {role, series, key, r (2), alpha, include, cache, round, obstacle})
 *       a cloud of 4-px dots; alpha only for a dense cloud or an ensemble (DS §4.6).
 *   C.bars(p, rows [{x0, x1, y, key}], {role, series, key, base, gap, maxWidth, fill: 'filled'|'open'})
 *       open: a 2-px edge in the role's mark tone on the surface (site.css .bar.open)
 *   C.rug(p, xs, {role, key, y0, y1})          structure, or 1.5-px ticks in the role's token
 *   C.band(p, x0, x1, {role, name, key, id, axis: 'x'|'y', y0, y1})   opaque tint, a region
 *   C.area(p, rows, x, y0, y1, {role, name, key, id})               a band around a curve
 *   C.boxplot(p, rows [{x, min, q1, median, q3, max, draws, key}], {role, key, dots, width})
 *       dots: a stack of 4-px draws with the unfilled, cased box over it (DS §4.6)
 *   C.ring(p, x, y, {role, key, series})       the best trial's 20-px ring
 *   C.cross(p, rows, x, y, {role, key, series, edge: 'top'|'bottom'}) -> count
 *       infeasible crosses; a value outside the frame or undefined stands at the frame edge
 *   C.ref(p, points, {kind: 'truth'|'limit'|'level'|'reader'|'pin', role, key, series, cursor})
 *       points: [[x, y], ...], or {x: v} (vertical) or {y: v} (horizontal) across the frame.
 *       A reader's line with series 'cursor' or cursor: true is a running figure's cursor
 *       (DS §4.9) and carries the attribute data-cursor, which the runtime harness reads.
 *   C.level(p, 'x'|'y', value, {role ('ref'), text, line, tick, side, series, key, cursor})
 *       -> {name, line, record}
 *       names a level on the axis in its role's label tone and hides regular tick labels within
 *       1 h. line: true (or a kind) also draws the line: ref -> limit, reader -> reader,
 *       other roles -> level. record is the name's entry {node, pos, w, axis, value, role, side}
 *       in the panel's list of axis names; a figure that moves a name moves record.pos with it.
 *   C.window(p, x0, x1, {kind: 'reader'|'highlight', name, id, handles: 'edges'|'center'|false,
 *                        label, labels: [lo, hi], snap, min, max, format, minGap, onChange, onSettle,
 *                        rival: true | {series, gaps: [{x, y, px}]}})
 *       reader: two edges, a 4-px axis bar and handles; highlight: the tint, context edges and the
 *       name at the top inside. onChange([x0, x1], {transient}), onSettle([x0, x1]).
 *       A reader window's edges are structure, which a label may cross (DS §5.2 item 3). With
 *       rival they are also rivals of series rival.series (default the window's id), so a label
 *       of another series keeps 1 h clear of them and one of that series may stand beside them.
 *       Each gap leaves the edge at data x out within px of data y, for example around a ring on
 *       the edge whose callout's leader must not meet the angle rule against the edge (F8.1).
 *   C.trail(p, points, {role, key, series, head, x, y})   travelled path with its marker at the head
 *   C.ghost(panelOrPanels, {points}) -> count   keeps the panels' lines and levels as last drawn and
 *       draws them dashed under the series on every later render. C.ghost(p, false) or
 *       C.ghost.clear(p) clears it (Reset, a change with ghost: false).
 *   C.obstacle(p, geom, {kind, type, series, width, r})   a mark drawn outside these helpers
 *   C.axisBreak(p, x)
 *
 * LABELS AND ANNOTATIONS
 *   C.place(p, items, {hold, playing, transient, transition} | ctx) -> report entries
 *     item: {id, text (string or lines), role, series, tone: 'role'|'ink',
 *            feature: {type: 'point', x, y, r} | {type: 'value', x, y, r}
 *                   | {type: 'line', points: [[x, y], ...]} | {type: 'line', of: series}
 *                   | {type: 'region', x0, x1, y0, y1} | {type: 'region', of: regionId},
 *            names: regionId, phone: {text} | {header: true}, captionNames, keySentence,
 *            select: {pressed, onPress}}     // a label that selects its series (DS §6.4)
 *     Places the items with the labels queued by C.annotation, C.band and C.window, from scratch,
 *     or with hold keeping positions that stay admissible: hold when any of hold, playing,
 *     transient or transition is true (pass the draw context), or by default during
 *     C.transition frames and handle drags. Only a draw with none of them places from scratch. Renders
 *     text.label with the halo, leaders, header forms in the panel head. {explain: true} (or
 *     C.explain = true for every panel) adds each label's rejected candidates to the report.
 *   C.tryPlace(p, items, ctx, ids) -> [{id, form, box, fault}] | null
 *     the placement C.place(p, items, ctx) would give in place of the current render's last
 *     C.place: the same obstacles before that call's labels, its queued labels and the placement it
 *     held. It draws nothing and changes nothing, so a label search tries features against one
 *     render (F3.2). Null when no C.place ran in the current render. ids, a list of label ids,
 *     limits the search for far positions of callouts (DS §5.10) to the callouts it names. The
 *     entries of labels that are not callouts are exact for any ids.
 *   C.labelReport(panel | element | id) -> [{id, text, form, x, y, box, anchor, position, tier,
 *       dFeature, dRival, ratio, leader, reason, toCaption, fault, panel, annotation}]
 *   C.annotation(p, {kind: 'bracket'|'tangent'|'region'|'callout', anchor, text, id, side, gap, series,
 *                    names, reach, phone, captionNames, keySentence}) -> record
 *     names is the id of a region (a band, a tint or a window) whose name or whose features the
 *     text concerns, which may hold the text (DS §5.2 item 7), as for C.place items. A callout
 *     (anchor {x, y, r, series}) is placed as a point label within 0.5 h of its mark; where that
 *     gives no position in the frame, it stands up to reach h from the mark (default 3, which is
 *     also the largest reach: the far positions stop at 3 h whatever reach says; 0 keeps it
 *     within 0.5 h) with a leader to the mark (DS §5.10, §5.4), reported with tier 'leader',
 *     position 'far <direction>' and ratio Infinity, its dRival at least 1 h.
 *     bracket anchor {x0, x1, y} (y omitted: on the x axis) or {y0, y1, x}; side 'above'|'below'|
 *     'left'|'right' says where the bracket stands relative to the marks, and gap (px, default 6)
 *     how far from its anchor. tangent anchor
 *     {x, y, slope, length}: slope in the plotted space (log units on a log axis). region anchor
 *     {points: [[x, y], ...]} along a curve or {x0, x1, y0, y1} along an axis. callout anchor {x, y}.
 *     Nothing is drawn when the anchor lies outside the frame.
 *   C.annotationReport(panel | element | id) -> [{panel, id, kind, text, anchor, drawn}]
 *
 * READING, LINKING AND HANDLES
 *   C.hover(p, {xValues (array or fn), series: [{label, role, y: fn(xv), fmt, show, dot}], format,
 *               extra, startIndex, by, label, onRead(xv | null, i, {source}), press(xv, phase)})
 *   C.pointHover(p, {points: [{x, y, key, head, rows: [{value, label, role}], lines}] or fn,
 *                    select(i, point), startIndex, by, label, onRead(point | null, i, {source})})
 *     source is what moved the reading: 'key' (an arrow, Page Up or Down, Home, End, Escape),
 *     'pointer', 'focus' (focus in or out), or 'program' (a redraw, or the returned show and hide).
 *     Both read through div.reader over the frame (role slider, arrows, Page Up/Down by a
 *     twentieth, Home, End, Escape), with an aria-hidden div.tip and a polite live region.
 *     press (the record panel of a running figure): phase 'start' | 'move' | 'end'.
 *   C.link(panels, {axis: 'x'|'y', key: fn(value, point), grey}) -> {highlight(key), clear(),
 *       current()}: one highlight across panels by key, the crosshair across panels that share
 *       the axis, aligned margins. grey (default true) greys the rest of each family (.has-hi).
 *   C.handle(p, {id, axis: 'x'|'y', value, at, snap, step, page, min, max, scale: 'log'|'linear',
 *                label, format, onChange(value, {transient}), onSettle(value), onLine: true | {from, to}})
 *     -> {el, id, value()}. Call it in the draw function on every render. div.handle is a slider
 *     over the SVG: drag (transient changes, one settle on release), keyboard (arrows one snap,
 *     Page Up/Down a tenth of the range or a decade, Home, End; handled keys stop propagating),
 *     step and page (in data units, or decades on a log scale) set the arrows' and the Page
 *     keys' steps without snapping a drag, as F9.3's 0.01 and 0.1 decade do,
 *     a click on the axis, touch value block, value named on the axis while dragged or focused.
 *
 * COLOUR AND KEYS
 *   C.ramp(role, t) -> CSS colour between the stops of DS §2.4 ('model' only; t in [0, 1])
 *   C.colorbar(panel | element, {role, domain, log, label, ticks, format, steps, thickness, gap})
 *       -> {node, t(value)}: the ramp's key in SVG, right of the frame for a panel
 *   C.key(figure | panel, [{kind, role, text}], {layout: 'row'|'column', x, y}) -> svg node
 *       kinds: line dot open diamond square cross ring ghost level truth limit reader pin handle
 *       band trail context ramp annotation (a bracket, its name in text.annotation)
 *       Entries are laid out from their text's getComputedTextLength() at draw time, so the
 *       spacing in effect is measured, and a figure's key is laid out again when its width changes.
 *
 * MOTION
 *   C.transition(from, to, {draw(state, ctx), duration, owner, onEnd}) -> {finish(), cancel(),
 *       running(), finished (a promise), duration}
 *     DS §9 rule 1: rows matched by key, numbers interpolated under cubic in-out, draw called once
 *     per frame with ctx {transition: true, hold: true}, then draw(to, {transition: false,
 *     hold: false, end: true}). duration omitted: 750 ms, or 400 ms when the largest move of a
 *     keyed mark is under 40 px. A cut under reduced motion. A new transition with the same owner
 *     first finishes the old one.
 *   C.interpolate(from, to, t), C.ease(t), C.reduced(), C.holding()
 *
 * UTILITIES (pure)
 *   C.snap(v, snap, {log, min, max}), C.stepValue(v, snap, dir (±1, ±10, 'home', 'end'), {log, min, max}),
 *   C.thinMarkers(points [{X, d, i}], thin, keep) (C.markers' thinning, on points in order of X),
 *   C.keyOf(key, d, i), C.tickValues(domain, spec, log, px, axis), C.hiddenTicks(ticks, names, h,
 *   axis), C.largestMove(before, after), C.durationFor(px), C.m4(pts), C.pow2Ticks, C.pow10Ticks,
 *   C.fmtNum, C.powersOf2, C.sample, C.plain, C.html, C.svgText, C.measureText, C.textWidth,
 *   C.wrapText
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};
  var C = TP.chart = TP.chart || {};
  var d3 = global.d3;
  var doc = global.document;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var ROLES = ['model', 'data', 'third', 'fourth', 'fifth', 'context', 'ref', 'reader'];
  C.ROLES = ROLES.slice();

  /* ============================== pure helpers ============================== */

  function finite(v) { return typeof v === 'number' && isFinite(v); }
  /* The CSS zoom in effect on a node (1 where the browser has no currentCSSZoom). Client rectangles
     include it, and the lengths a script writes to a style or an attribute are zoomed again, so a
     length taken from rectangles is divided by it (accessibility finding Z7). Browser zoom does not
     enter it. */
  function zoomOf(node) {
    var z = node && node.currentCSSZoom;
    return typeof z === 'number' && z > 0 ? z : 1;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function pick(v, dflt) { return v != null ? v : dflt; }
  var warned = {};
  function warnOnce(msg) {
    if (warned[msg]) return;
    warned[msg] = true;
    if (global.console) global.console.error(msg);
  }
  function roleOf(r) {
    if (r == null) return 'model';
    if (ROLES.indexOf(r) < 0) { warnOnce('TP.chart: unknown role "' + r + '" (roles: ' + ROLES.join(', ') + ')'); return 'model'; }
    return r;
  }

  /** The key of datum d at index i: key(d, i) for a function, key itself for a constant, else
      d.key when d carries one. Returned as a string, or null. */
  C.keyOf = function (key, d, i) {
    var k = typeof key === 'function' ? key(d, i) : key != null ? key : (d && typeof d === 'object' && !Array.isArray(d) && d.key != null ? d.key : null);
    return k == null ? null : String(k);
  };

  /* DS §4.2's thinning of markers on a dense curve: both ends and every kept point stay, and the
     others stand at least thin px apart along x and at least thin px from every kept point. A
     stretch between a kept point and an end is thinned outward from the kept point, so that the
     spacing is measured from the point the argument selects; a stretch between two kept points,
     or between the two ends, is thinned from its left end. */
  function thinMarkers(cand, thin, keep) {
    var n = cand.length, anchors = [], i, on = new Uint8Array(n), kept = new Uint8Array(n);
    for (i = 0; i < n; i++) {
      if (keep && keep(cand[i].d, cand[i].i)) kept[i] = 1;
      if (kept[i] || i === 0 || i === n - 1) { anchors.push(i); on[i] = 1; }
    }
    function walk(from, to, step) {
      var last = cand[from].X;
      for (var j = from + step; j !== to; j += step) {
        if (Math.abs(cand[j].X - last) >= thin && Math.abs(cand[to].X - cand[j].X) >= thin) { on[j] = 1; last = cand[j].X; }
      }
    }
    for (var k = 0; k < anchors.length - 1; k++) {
      var a = anchors[k], b = anchors[k + 1];
      if (b - a < 2) continue;
      /* outward from a kept point: rightward from one on the left, leftward from one on the right
         only; a stretch with no kept point at either end is walked from the left */
      if (!kept[a] && kept[b]) walk(b, a, -1);
      else walk(a, b, 1);
    }
    var out = [];
    for (i = 0; i < n; i++) if (on[i]) out.push(cand[i]);
    return out;
  }
  C.thinMarkers = thinMarkers;

  /* ---------- ticks ---------- */

  function powTicks(domain, base) {
    var lo = Math.min(domain[0], domain[1]), hi = Math.max(domain[0], domain[1]), out = [];
    var k0 = Math.ceil(Math.log(lo) / Math.log(base) - 1e-9), k1 = Math.floor(Math.log(hi) / Math.log(base) + 1e-9);
    for (var k = k0; k <= k1; k++) out.push(+Math.pow(base, k).toPrecision(12));
    return out;
  }
  C.pow2Ticks = function (domain) { return powTicks(domain, 2); };
  C.pow10Ticks = function (domain) { return powTicks(domain, 10); };
  /** Tick values of an axis: spec is an array, fn(domain, px), 'pow2', 'pow10', 'none' or a count.
      A log axis without a spec takes powers of 10 (base 10, or a y axis spanning 3 decades) or 2. */
  C.tickValues = function (domain, spec, log, px, axis) {
    var lo = Math.min(domain[0], domain[1]), hi = Math.max(domain[0], domain[1]), tol = 1e-9 * Math.max(Math.abs(lo), Math.abs(hi), 1);
    if (spec === 'none') return [];
    if (Array.isArray(spec)) return spec.filter(function (v) { return v >= lo - tol && v <= hi + tol; });
    if (typeof spec === 'function') return spec(domain, px);
    if (spec === 'pow2') return powTicks(domain, 2);
    if (spec === 'pow10') return powTicks(domain, 10);
    if (log) return log === 10 || (axis === 'y' && powTicks(domain, 10).length >= 3) ? powTicks(domain, 10) : powTicks(domain, 2);
    var n = typeof spec === 'number' ? spec : axis === 'x' ? 6 : 5;
    return d3 ? d3.ticks(lo, hi, n) : [lo, hi];
  };
  C.fmtNum = function (v) {
    if (!TP.fmt) return String(v);
    return Math.abs(v) >= 1000 ? TP.fmt.int(v) : TP.fmt.sig(v, 3);
  };
  C.powersOf2 = function (lo, hi) { var out = []; for (var b = lo; b <= hi * (1 + 1e-9); b *= 2) out.push(b); return out; };
  C.sample = function (lo, hi, n, log) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var f = n > 1 ? i / (n - 1) : 0;
      out.push(log ? lo * Math.pow(hi / lo, f) : lo + (hi - lo) * f);
    }
    return out;
  };

  /** Which regular tick labels a named level hides (DS §5.5): those within h of a name along
      the axis and, on the x axis, those whose label box comes within 2 px of the name's box.
      ticks and names: [{pos, w}] in px along the axis (pos the centre). Returns booleans. */
  C.hiddenTicks = function (ticks, names, h, axis) {
    return ticks.map(function (t) {
      return names.some(function (n) {
        if (Math.abs(n.pos - t.pos) < h) return true;
        if (axis !== 'x') return false;
        var a0 = t.pos - (t.w || 0) / 2, a1 = t.pos + (t.w || 0) / 2, b0 = n.pos - (n.w || 0) / 2, b1 = n.pos + (n.w || 0) / 2;
        return a0 < b1 + 2 && b0 < a1 + 2;
      });
    });
  };

  /* ---------- snapping and stepping ---------- */

  function tr(v, log) { return log ? Math.log(v) / Math.LN10 : v; }
  function untr(t, log) { return log ? Math.pow(10, t) : t; }
  function tidy(v) { return finite(v) ? +v.toPrecision(12) : v; }
  function snapList(snap, lo, hi) {
    var out = snap.filter(function (s) {
      if (!finite(s)) return false;
      if (finite(lo) && s < lo - 1e-12 * Math.max(1, Math.abs(lo))) return false;
      if (finite(hi) && s > hi + 1e-12 * Math.max(1, Math.abs(hi))) return false;
      return true;
    });
    out.sort(function (a, b) { return a - b; });
    return out;
  }
  /** The value a handle snaps to (DS §6.2): the nearest of a list (nearest in log space on a log
      axis, the lower on a tie), or a multiple of a step (on a log axis a step in decades), within
      [min, max]. */
  C.snap = function (v, snap, o) {
    o = o || {};
    var log = !!o.log, lo = o.min, hi = o.max;
    if (!finite(v)) return v;
    if (log && v <= 0) v = finite(lo) && lo > 0 ? lo : 1e-300;
    if (Array.isArray(snap) && snap.length) {
      var list = snapList(snap, lo, hi);
      if (!list.length) return v;
      var tv = tr(v, log), best = list[0], bd = Infinity;
      for (var i = 0; i < list.length; i++) {
        var d = Math.abs(tr(list[i], log) - tv);
        if (d < bd - 1e-12) { bd = d; best = list[i]; }
      }
      return best;
    }
    if (finite(lo)) v = Math.max(v, lo);
    if (finite(hi)) v = Math.min(v, hi);
    if (finite(snap) && snap > 0) {
      var r = tidy(untr(Math.round(tr(v, log) / snap) * snap, log));
      if (finite(lo) && r < lo) r = tidy(untr(Math.ceil(tr(lo, log) / snap - 1e-9) * snap, log));
      if (finite(hi) && r > hi) r = tidy(untr(Math.floor(tr(hi, log) / snap + 1e-9) * snap, log));
      return r;
    }
    return v;
  };
  /** One keyboard step of a handle (DS §6.2). dir: 1 or -1 (an arrow, one snap step), 10 or -10
      (Page Up or Down: a tenth of the range, a decade on a log axis, at least one snap step),
      'home' or 'end'. Without a snap an arrow moves a hundredth of the range. */
  C.stepValue = function (v, snap, dir, o) {
    o = o || {};
    var log = !!o.log, lo = o.min, hi = o.max;
    var list = Array.isArray(snap) && snap.length ? snapList(snap, lo, hi) : null;
    if (list && !list.length) return v;
    var LO = list ? list[0] : lo, HI = list ? list[list.length - 1] : hi;
    if (dir === 'home') return list ? LO : C.snap(lo, snap, o);
    if (dir === 'end') return list ? HI : C.snap(hi, snap, o);
    var sgn = dir > 0 ? 1 : -1, page = Math.abs(dir) > 1;
    var span = finite(LO) && finite(HI) ? tr(HI, log) - tr(LO, log) : NaN;
    var big = log ? 1 : span / 10;
    if (list) {
      var i = list.indexOf(C.snap(v, list, o));
      if (!page) return list[clamp(i + sgn, 0, list.length - 1)];
      var j = i + sgn;
      if (j < 0 || j >= list.length) return list[i];
      var target = tr(list[i], log) + sgn * big, best = j, bd = Math.abs(tr(list[j], log) - target);
      for (var k = j + sgn; k >= 0 && k < list.length; k += sgn) {
        var d = Math.abs(tr(list[k], log) - target);
        if (d < bd - 1e-12) { bd = d; best = k; } else break;
      }
      return list[best];
    }
    var step = page ? big : (finite(snap) && snap > 0 ? snap : span / 100);
    if (!finite(step) || step <= 0) return v;
    var r = untr(tr(v, log) + sgn * step, log);
    if (finite(lo)) r = Math.max(r, lo);
    if (finite(hi)) r = Math.min(r, hi);
    return finite(snap) && snap > 0 ? C.snap(r, snap, o) : tidy(r);
  };

  /* ---------- the family ramp (DS §2.4) ---------- */

  /** A colour between two stops of the model ramp as a color-mix() of custom properties, so a
      theme change needs no redraw. t = 0 is q0 (the least of the quantity), t = 1 is q6. Four
      members take t = 0, 1/3, 2/3, 1 (q0, q2, q4, q6); three take 0, 0.5, 1 (q0, q3, q6). */
  C.ramp = function (role, t) {
    if (role !== 'model') {
      warnOnce('TP.chart.ramp: only the model role has a bound ramp (DS 2.4), not "' + role + '"');
      return 'var(--' + roleOf(role) + ')';
    }
    t = clamp(finite(t) ? t : 0, 0, 1);
    var s = t * 6, i = Math.floor(s + 1e-9), f = s - i;
    if (i >= 6) return 'var(--model-q6)';
    if (f < 1e-6) return 'var(--model-q' + i + ')';
    if (f > 1 - 1e-6) return 'var(--model-q' + (i + 1) + ')';
    var pct = Math.round((1 - f) * 1000) / 10;
    return 'color-mix(in oklab, var(--model-q' + i + ') ' + pct + '%, var(--model-q' + (i + 1) + '))';
  };

  /* ---------- M4 reduction ---------- */

  /** M4 reduction of a polyline in plot px whose x never decreases: in each pixel column keep the
      first, highest, lowest and last point, in order. The drawn line is the same to the pixel. */
  C.m4 = function (pts) {
    var out = [], n = pts.length, i = 0;
    while (i < n) {
      var col = Math.floor(pts[i][0]), j = i, lo = i, hi = i;
      while (j + 1 < n && Math.floor(pts[j + 1][0]) === col) {
        j++;
        if (pts[j][1] < pts[lo][1]) lo = j;
        if (pts[j][1] > pts[hi][1]) hi = j;
      }
      var keep = [i, lo, hi, j].sort(function (a, b) { return a - b; });
      for (var k = 0; k < 4; k++) if (k === 0 || keep[k] !== keep[k - 1]) out.push(pts[keep[k]]);
      i = j + 1;
    }
    return out;
  };

  /* ---------- interpolation by key (DS §9 rule 1) ---------- */

  function isPlain(o) {
    if (o === null || typeof o !== 'object' || Array.isArray(o) || ArrayBuffer.isView(o)) return false;
    var proto = Object.getPrototypeOf(o);
    return proto === Object.prototype || proto === null;
  }
  function keyedRows(a) {
    if (!Array.isArray(a) || !a.length) return false;
    for (var i = 0; i < a.length; i++) if (!a[i] || typeof a[i] !== 'object' || a[i].key == null) return false;
    return true;
  }
  function interp(a, b, t) {
    if (a === b) return a;
    if (typeof a === 'number' && typeof b === 'number') return finite(a) && finite(b) ? a + (b - a) * t : (t < 1 ? a : b);
    if (Array.isArray(a) && Array.isArray(b)) {
      var ka = keyedRows(a), kb = keyedRows(b);
      if ((ka && (kb || !b.length)) || (kb && !a.length)) {
        var map = new Map(), out = [], i;
        for (i = 0; i < a.length; i++) map.set(String(a[i].key), a[i]);
        for (i = 0; i < b.length; i++) {
          var q = map.get(String(b[i].key));
          if (q !== undefined) out.push(interp(q, b[i], t));
        }
        return out;
      }
      if (a.length === b.length) {
        var arr = new Array(a.length);
        for (var j = 0; j < a.length; j++) arr[j] = interp(a[j], b[j], t);
        return arr;
      }
      return t < 1 ? a : b;
    }
    if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b) && a.constructor === b.constructor && a.length === b.length) {
      var ta = new a.constructor(a.length);
      for (var m = 0; m < a.length; m++) ta[m] = finite(a[m]) && finite(b[m]) ? a[m] + (b[m] - a[m]) * t : (t < 1 ? a[m] : b[m]);
      return ta;
    }
    if (isPlain(a) && isPlain(b)) {
      var o = {}, k;
      for (k in a) if (!(k in b)) o[k] = a[k];            // held to the end
      for (k in b) if (k in a) o[k] = interp(a[k], b[k], t);   // fields only in b arrive at the end
      return o;
    }
    return t < 1 ? a : b;
  }
  /** The frame of a transition at eased time t (DS §9 rule 1). Arrays of rows that carry a key
      are matched by key and kept in the order of `to`: a row only in `from` is cut out at the
      start, a row only in `to` is cut in at the end. Numbers interpolate linearly, arrays of equal
      length element by element. Strings, booleans, paths of different point sets and other values
      keep their `from` value until the end. At t >= 1 the result is `to` itself. */
  C.interpolate = function (from, to, t) {
    if (!(t < 1)) return to;
    return interp(from, to, t > 0 ? t : 0);
  };
  C.ease = function (t) {
    t = clamp(finite(t) ? t : 0, 0, 1);
    if (d3 && d3.easeCubicInOut) return d3.easeCubicInOut(t);
    return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
  };

  function dist(a, b) { var dx = a[0] - b[0], dy = a[1] - b[1]; return Math.sqrt(dx * dx + dy * dy); }
  function centroid(pts) {
    var x = 0, y = 0;
    for (var i = 0; i < pts.length; i++) { x += pts[i][0]; y += pts[i][1]; }
    return [x / pts.length, y / pts.length];
  }
  /** The largest move in px between two drawings, from maps key -> [[X, Y], ...]: point by point
      where a key has as many points in both, else between centroids. null when no key is shared. */
  C.largestMove = function (before, after) {
    var best = null, A = new Map();
    function each(m, fn) {
      if (!m) return;
      if (m instanceof Map) m.forEach(function (v, k) { fn(k, v); });
      else Object.keys(m).forEach(function (k) { fn(k, m[k]); });
    }
    each(before, function (k, v) { A.set(String(k), v); });
    each(after, function (k, b) {
      var a = A.get(String(k));
      if (!a || !b || !a.length || !b.length) return;
      var d = 0;
      if (a.length === b.length) for (var i = 0; i < a.length; i++) d = Math.max(d, dist(a[i], b[i]));
      else d = dist(centroid(a), centroid(b));
      if (finite(d)) best = best == null ? d : Math.max(best, d);
    });
    return best;
  };
  /** The duration of a transition (DS §9): 400 ms where the largest move is under 40 px, else
      750 ms, and 750 ms when nothing keyed moves. */
  C.durationFor = function (px) { return px == null || !finite(px) ? 750 : px < 40 ? 400 : 750; };

  /* ---------- motion: hold, reduced motion, the transition ---------- */

  var holdDepth = 0, measuring = null;
  /** True during a transition's frames and a handle's transient changes, when C.place holds. */
  C.holding = function () { return holdDepth > 0; };
  C.reduced = function () {
    try {
      if (TP.motion && typeof TP.motion.reduced === 'function') return !!TP.motion.reduced();
      return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  };
  function now() { return global.performance && global.performance.now ? global.performance.now() : Date.now(); }
  function nextFrame(fn) {
    if (typeof global.requestAnimationFrame === 'function') return { raf: global.requestAnimationFrame(fn) };
    return { timer: setTimeout(function () { fn(now()); }, 16) };
  }
  function cancelFrame(h) {
    if (!h) return;
    if (h.raf != null && typeof global.cancelAnimationFrame === 'function') global.cancelAnimationFrame(h.raf);
    if (h.timer != null) clearTimeout(h.timer);
  }
  function withHold(fn) {
    holdDepth++;
    try { return fn(); } finally { holdDepth--; }
  }
  var running = new Map();
  /** A measuring session: the keyed marks drawn while it is open record their px positions. */
  function measure(fn) {
    var prev = measuring, session = { marks: new Map(), saved: new Map() };
    measuring = session;
    try { fn(); } finally { measuring = prev; }
    return session;
  }
  function autoDuration(draw, from, to) {
    var f0 = C.interpolate(from, to, 0), after, before;
    withHold(function () {
      after = measure(function () { draw(to, { transition: true, hold: true, measure: true }); });
      /* drawing `to` must not become the start of the held labels */
      after.saved.forEach(function (last, p) { p._lastPlaced = last; });
      before = measure(function () { draw(f0, { transition: true, hold: true, t: 0 }); });
    });
    return C.durationFor(C.largestMove(before.marks, after.marks));
  }
  C.transition = function (from, to, o) {
    o = o || {};
    var draw = o.draw;
    if (typeof draw !== 'function') throw new TypeError('TP.chart.transition needs o.draw(state, ctx)');
    if (o.owner != null && running.has(o.owner)) running.get(o.owner).finish();
    var handle = null, done = false, resolveFn = null, start = 0;
    var ctl = {
      finished: typeof Promise === 'function' ? new Promise(function (r) { resolveFn = r; }) : null,
      running: function () { return !done; },
      finish: function () {
        if (done) return;
        done = true;
        cancelFrame(handle);
        if (o.owner != null && running.get(o.owner) === ctl) running.delete(o.owner);
        draw(to, { transition: false, hold: false, end: true });
        if (o.onEnd) o.onEnd(to);
        if (resolveFn) resolveFn(to);
      },
      cancel: function () {
        if (done) return;
        done = true;
        cancelFrame(handle);
        if (o.owner != null && running.get(o.owner) === ctl) running.delete(o.owner);
        if (resolveFn) resolveFn(null);
      }
    };
    if (C.reduced() || o.duration === 0) { ctl.duration = 0; ctl.finish(); return ctl; }
    var duration = o.duration > 0 ? o.duration : autoDuration(draw, from, to);
    ctl.duration = duration;
    if (!(o.duration > 0)) { /* autoDuration drew frame 0 */ }
    else withHold(function () { draw(C.interpolate(from, to, 0), { transition: true, hold: true, t: 0 }); });
    if (o.owner != null) running.set(o.owner, ctl);
    start = now();
    function step() {
      if (done) return;
      var t = (now() - start) / duration;
      if (t >= 1) { ctl.finish(); return; }
      withHold(function () { draw(C.interpolate(from, to, C.ease(t)), { transition: true, hold: true, t: t }); });
      handle = nextFrame(step);
    }
    handle = nextFrame(step);
    return ctl;
  };

  /* ============================== DOM helpers ============================== */

  if (!doc) return;

  var uid = 0;
  function html(tag, cls) { var n = doc.createElement(tag); if (cls) n.className = cls; return n; }
  function svgEl(tag, cls) { var n = doc.createElementNS(SVGNS, tag); if (cls) n.setAttribute('class', cls); return n; }
  /* one media query list for the page: matchMedia builds a new list on every call */
  var phoneMQ;
  function isPhone() {
    try {
      if (phoneMQ === undefined) phoneMQ = global.matchMedia ? global.matchMedia('(max-width: 639px)') : null;
      return !!(phoneMQ && phoneMQ.matches);
    } catch (e) { return false; }
  }
  /* A viewport under 200 px wide is transient (Chromium reports 1 × 1 while it captures an
     element beyond the viewport), and a layout at that width is ignored. */
  function degenerateViewport() { return (global.innerWidth || 0) > 0 && global.innerWidth < 200; }
  /* A coordinate rounded to 0.01 px, as text. The text equals String(Math.round(v * 100) / 100); it
     is built from the integer number of hundredths, because converting the float to text was most of
     the cost of a long path's d attribute. */
  function fx2(v) {
    var k = Math.round(v * 100);
    if (!(k > -1e15 && k < 1e15)) return String(k / 100);
    if (k === 0) return '0';
    var neg = k < 0, a = neg ? -k : k, ip = Math.floor(a / 100), f = a - ip * 100;
    return (neg ? '-' : '') + ip + (f === 0 ? '' : f % 10 === 0 ? '.' + (f / 10) : f < 10 ? '.0' + f : '.' + f);
  }
  /* A placer index emptied for reuse: the state Index.clear leaves, except that the item arrays
     keep the capacity they grew to, so a render's obstacles are added without growing them again
     (TP.placer's reset when it has one). An item's stored fields are written again when it is
     added, and the index's stamp keeps counting, so the seen marks of earlier queries never match
     a new query. */
  function emptyIndex(ix) {
    if (typeof ix.reset === 'function') return ix.reset();
    if (!Array.isArray(ix.cells) || !ix.codes || !ix.cap || !(ix.nx > 0) || !(ix.ny > 0)) return ix.clear();
    ix.cells = new Array(ix.nx * ix.ny);
    ix.obs = [];
    ix.aux = [];
    ix.codes.clear();
    ix.n = 0;
    return ix;
  }

  /* ---------- rich text ---------- */

  function parseRich(str) {
    var out = [], re = /([_^])\{([^}]*)\}/g, last = 0, m;
    str = String(str);
    while ((m = re.exec(str))) {
      if (m.index > last) out.push({ t: str.slice(last, m.index), k: '' });
      out.push({ t: m[2], k: m[1] === '_' ? 'sub' : 'sup' });
      last = re.lastIndex;
    }
    if (last < str.length) out.push({ t: str.slice(last), k: '' });
    return out;
  }
  /** Plain text of a rich string: "S_{min}" becomes "S min", "10^{3}" becomes "10^3". */
  C.plain = function (str) {
    return String(str).replace(/_\{([^}]*)\}/g, ' $1').replace(/\^\{([^}]*)\}/g, '^$1');
  };
  /** Fill an HTML element with rich text (text nodes and sub/sup elements only). */
  C.html = function (el, str) {
    el.textContent = '';
    parseRich(str).forEach(function (part) {
      if (!part.k) { el.appendChild(doc.createTextNode(part.t)); return; }
      var s = doc.createElement(part.k);
      s.textContent = part.t;
      el.appendChild(s);
    });
    return el;
  };
  /** Fill an SVG text node with lines of rich text; lines after the first restart at x = 0 and
      step down by lineHeight (1.2 times the font size, DS §3.1). */
  C.svgText = function (node, lines, lineHeight) {
    while (node.firstChild) node.removeChild(node.firstChild);
    if (!Array.isArray(lines)) lines = [lines];
    var lh = lineHeight || 16.8, shift = 0;
    lines.forEach(function (line, li) {
      parseRich(line).forEach(function (part, pi) {
        var ts = doc.createElementNS(SVGNS, 'tspan');
        var target = part.k === 'sub' ? 3.5 : part.k === 'sup' ? -5 : 0;
        var dy = target - shift;
        if (pi === 0 && li > 0) { ts.setAttribute('x', node.getAttribute('x') || '0'); dy += lh; }
        if (dy) ts.setAttribute('dy', String(dy));
        if (part.k) ts.setAttribute('font-size', '0.8em');
        shift = target;
        ts.textContent = part.t;
        node.appendChild(ts);
      });
    });
    return node;
  };

  /* ---------- text measurement ----------
     Text is measured on a canvas at the size it renders, with the computed letter spacing and word
     spacing (DS §11.5, the audit's P18), cached per string. The sizes and spacings come from probe
     text elements inside each panel's SVG, so they follow --fs-label, --fs-tick and any
     text-spacing override. */
  var ctx2d = null, sizeCache = new Map(), docType = null;
  function canvasCtx() { if (!ctx2d) ctx2d = doc.createElement('canvas').getContext('2d'); return ctx2d; }
  function pxOf(v, dflt) { var n = parseFloat(v); return finite(n) ? n : dflt; }
  function defaultType() {
    if (docType) return docType;
    var fam = 'system-ui, sans-serif', lab = NaN, tick = NaN;
    try {
      if (doc.body) fam = global.getComputedStyle(doc.body).fontFamily || fam;
      var rs = global.getComputedStyle(doc.documentElement);
      lab = parseFloat(rs.getPropertyValue('--fs-label'));
      tick = parseFloat(rs.getPropertyValue('--fs-tick'));
    } catch (e) { /* defaults below */ }
    docType = { family: fam, label: finite(lab) ? lab : 14, tick: finite(tick) ? tick : 13, ls: 0, ws: 0, lsTick: 0, wsTick: 0 };
    return docType;
  }
  function measureLines(lines, px, weight, type, tick) {
    var ls = tick ? type.lsTick : type.ls, ws = tick ? type.wsTick : type.ws;
    var key = px + '|' + weight + '|' + type.family + '|' + ls + '|' + ws + '|' + lines.join('\n');
    var hit = sizeCache.get(key);
    if (hit) return hit;
    var c = canvasCtx();
    c.font = weight + ' ' + px + 'px ' + type.family;
    var m = c.measureText('Hg');
    var asc = m.fontBoundingBoxAscent || px * 0.8, desc = m.fontBoundingBoxDescent || px * 0.22, w = 0;
    lines.forEach(function (line) {
      var lw = 0;
      parseRich(line).forEach(function (part) {
        c.font = weight + ' ' + (part.k ? px * 0.8 : px) + 'px ' + type.family;
        lw += c.measureText(part.t).width + ls * part.t.length + ws * (part.t.split(' ').length - 1);
      });
      w = Math.max(w, lw);
    });
    var lh = 1.2 * px, res = { w: w, asc: asc, desc: desc, lh: lh, h: asc + desc + lh * (lines.length - 1) };
    if (sizeCache.size > 5000) sizeCache.clear();
    sizeCache.set(key, res);
    return res;
  }
  function typeOf(p) { return (p && p.type) || defaultType(); }
  /** The box of text lines at the size of cls ('label', 'annotation', 'strong' or 'tick'), in
      panel p's type (or the page's): {w, h, asc, desc, lh}. */
  C.measureText = function (lines, cls, p) {
    var type = typeOf(p), tick = cls === 'tick' || cls === 'level-name';
    return measureLines(Array.isArray(lines) ? lines.map(String) : [String(lines)], tick ? type.tick : type.label, cls === 'strong' ? 600 : 400, type, tick);
  };
  /** Width of one line of plain text at px (default the label size) and weight (default 400). */
  C.textWidth = function (str, px, weight) {
    var type = defaultType();
    return measureLines([String(str)], px || type.label, weight || 400, type, false).w;
  };
  /** Greedy word wrap into lines at most maxWidth px wide (a word wider gets a line to itself). */
  C.wrapText = function (str, maxWidth, px, weight) {
    var lines = [], cur = '';
    String(str).split(/\s+/).filter(Boolean).forEach(function (w) {
      var next = cur ? cur + ' ' + w : w;
      if (!cur || C.textWidth(next, px, weight) <= maxWidth) cur = next;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  };

  /* ---------- scales ---------- */

  function scaleFor(log) { return log ? d3.scaleLog().base(log === true ? 2 : log) : d3.scaleLinear(); }
  /* The mapping of a d3 linear or log scale as plain arithmetic, for loops over thousands of points. */
  function direct(sc, log) {
    var d = sc.domain(), r = sc.range();
    if (log) {
      var l0 = Math.log(d[0]), k = (r[1] - r[0]) / (Math.log(d[1]) - l0);
      return function (v) { return r[0] + (Math.log(v) - l0) * k; };
    }
    var m = (r[1] - r[0]) / (d[1] - d[0]);
    return function (v) { return r[0] + (v - d[0]) * m; };
  }
  function okPoint(p, xv, yv) {
    if (!finite(xv) || !finite(yv)) return false;
    if (p.opts.xLog && xv <= 0) return false;
    if (p.opts.yLog && yv <= 0) return false;
    return true;
  }
  function okX(p, v) { return finite(v) && !(p.opts.xLog && v <= 0); }
  function okY(p, v) { return finite(v) && !(p.opts.yLog && v <= 0); }
  function majors(values, scale, minGap) {
    if (values.length < 2) return values.map(function () { return true; });
    var gap = Infinity;
    for (var i = 1; i < values.length; i++) gap = Math.min(gap, Math.abs(scale(values[i]) - scale(values[i - 1])));
    var step = Math.max(1, Math.ceil(minGap / gap));
    return values.map(function (v, k) { return k % step === 0; });
  }

  /* ---------- the panel registry ---------- */

  var LAYERS = ['bands', 'grid', 'axes', 'ghosts', 'series', 'refs', 'marks', 'annotations', 'names', 'labels', 'keys', 'hover'];
  var CLEARED = ['bands', 'ghosts', 'series', 'refs', 'marks', 'annotations', 'names', 'labels', 'keys'];
  var CLIPPED = ['bands', 'ghosts', 'series', 'refs'];

  C.panelOf = function (el) {
    while (el && el !== doc) {
      if (el.__tpPanel) return el.__tpPanel;
      el = el.parentNode;
    }
    return null;
  };
  function panelsFor(target) {
    if (!target) return [];
    if (Array.isArray(target)) return target.reduce(function (a, t) { return a.concat(panelsFor(t)); }, []);
    if (typeof target === 'string') target = doc.getElementById(target.replace(/^#/, ''));
    if (!target) return [];
    if (target.el && target.svg) return [target];
    if (target.__tpPanel) return [target.__tpPanel];
    if (!target.querySelectorAll) return [];
    return Array.prototype.map.call(target.querySelectorAll('.panel'), function (el) { return el.__tpPanel; }).filter(Boolean);
  }
  /** The panel objects inside root (default the document). */
  C.panels = function (root) { return panelsFor(root || doc.body); };
  /** Redraw every panel inside root now, reading each width from the layout (for printing). */
  C.renderAll = function (root) { C.panels(root).forEach(function (p) { p.render(true); }); };

  /* ---------- obstacles and keyed marks ---------- */

  function addObstacle(p, o) {
    p.obstacles.push(o);
    if (p._index) p._index.add(o);
    return o;
  }
  function flatRuns(pts, lo, hi) {
    /* a polyline as a flat array, broken (NaN) where it leaves the band [lo, hi] of y, so a line
       that leaves and re-enters does not become a spurious straight segment */
    var out = [], prevIn = false;
    for (var i = 0; i < pts.length; i++) {
      var q = pts[i], ok = q[1] >= lo && q[1] <= hi;
      if (ok) out.push(q[0], q[1]);
      else if (prevIn) out.push(NaN, NaN);
      prevIn = ok;
    }
    return out;
  }
  function regKey(p, k, entry) {
    if (k == null) return;
    (p._keyed[k] = p._keyed[k] || []).push(entry);
    if (measuring) {
      var id = p.uid + '|' + k, list = measuring.marks.get(id) || [];
      if (entry.pts) for (var i = 0; i < entry.pts.length; i++) list.push([entry.pts[i][0], entry.pts[i][1]]);
      else list.push([entry.X, entry.Y]);
      measuring.marks.set(id, list);
    }
  }
  function seriesOf(o, role) { return o.series != null ? String(o.series) : role; }
  function seen(p, series) { p._seriesSeen[series] = true; }

  /* The placer's first call in a page pays for compiling its code (3 to 5 ms), which would land on
     the first frame of play. One tiny placement at idle pays it earlier. */
  (function warm() {
    function run() {
      if (!TP.placer) return;
      try {
        var ix = TP.placer.index(200, 120, 16).add({ kind: 'rival', type: 'polyline', geom: [0, 100, 200, 20], width: 3, seriesId: 'w' });
        TP.placer.place({ frame: { width: 200, height: 120 }, h: 14, index: ix, labels: [
          { id: 'a', text: 'a', box: { w: 30, h: 16 }, feature: { type: 'line', points: [[0, 100], [200, 20]], width: 3 }, seriesId: 'w' },
          { id: 'b', text: 'b', box: { w: 30, h: 16 }, feature: { type: 'point', x: 60, y: 60, r: 5 } }] });
      } catch (e) { /* a warm-up only */ }
    }
    if (global.requestIdleCallback) global.requestIdleCallback(run, { timeout: 2000 });
    else setTimeout(run, 200);
  })();

  /* ============================== the panel ============================== */

  C.panel = function (container, opts) {
    opts = opts || {};
    if (!d3) throw new Error('TP.chart.panel needs D3 v7');
    var el;
    if (container && container.classList && container.classList.contains('panel')) el = container;
    else { el = html('div', 'panel'); container.appendChild(el); }
    var letter = opts.letter || '';
    var pkey = opts.key || (letter ? letter.replace(/[^A-Za-z0-9]/g, '') : '');
    if (pkey) el.setAttribute('data-panel', pkey);
    el.setAttribute('role', 'group');
    el.removeAttribute('tabindex');

    var head = html('div', 'panel-head');
    el.appendChild(head);
    var letterSpan = null, noteSpan = null, labelSpan = null;
    if (letter) { letterSpan = html('span', 'panel-letter'); letterSpan.textContent = letter; head.appendChild(letterSpan); }

    var svg = d3.select(el).append('svg').attr('aria-hidden', 'true').attr('focusable', 'false');
    var svgNode = svg.node();
    var defs = svg.append('defs');
    var clipId = 'tp-clip-' + (++uid);
    var clipRect = defs.append('clipPath').attr('id', clipId).append('rect');
    /* probes read the rendered sizes and spacings of labels and ticks (text measurement) */
    var probeLabel = defs.append('text').attr('class', 'label').text('x').node();
    var probeTick = defs.append('g').attr('class', 'axis').append('text').text('x').node();
    var g = svg.append('g').attr('class', 'plot');
    var layers = {};
    LAYERS.forEach(function (name) { layers[name] = g.append('g').attr('class', 'layer-' + name); });
    layers.grid.classed('grid', true);
    CLIPPED.forEach(function (name) { layers[name].attr('clip-path', 'url(#' + clipId + ')'); });

    var x = scaleFor(opts.xLog).domain(opts.xDomain || [0, 1]);
    var y = scaleFor(opts.yLog).domain(opts.yDomain || [0, 1]);

    var p = {
      uid: uid, el: el, head: head, svg: svg, g: g, layers: layers, x: x, y: y, opts: opts,
      letter: letter, key: pkey, width: 0, height: 0, W: 0, H: 0, margin: null, offX: 0, panelW: 0,
      phone: isPhone(), h: 14, type: null, nameMargin: 0,
      obstacles: [], _index: null, _pending: [], _placedNow: false, _reportNow: [], _report: [],
      _lastPlaced: null, _keyed: {}, _drawn: [], _lines: {}, _regions: {}, _annotations: [],
      _names: { x: [], y: [] }, _temp: [], _seriesSeen: {}, _handles: {}, _labelButtons: {},
      _axisZones: {}, _links: [], _ghost: null, _reader: null, _origin: null, _headLabels: []
    };
    el.__tpPanel = p;

    function describeText() {
      if (opts.describe) return C.plain(opts.describe);
      var xl = typeof opts.xLabel === 'string' ? C.plain(opts.xLabel) : '', yl = typeof opts.yLabel === 'string' ? C.plain(opts.yLabel) : '';
      if (xl && yl) return yl + ' against ' + xl;
      return yl || xl || 'chart';
    }
    /* The name is the visible letter and a fixed description of the axes (DS §5.7). The live note
       never enters it. */
    el.setAttribute('aria-label', letter ? letter + ' ' + describeText() : describeText());

    /** Set the live note of the header (a control's value or a measurement), never in the name.
        A note that changes the header's height moves the plot. The header's ResizeObserver
        (watchHead) then measures the origin again and positions the handles, the reading element
        and the label buttons before the frame is painted: the runtime writes the counter after
        fig.draw, and a handle positioned in that draw would otherwise stand off its axis until
        the next draw. The note's text, and adding or removing the note, read no layout. */
    p.setNote = function (text) {
      text = text == null ? '' : String(text);
      var was = p._origin;
      if (!text) {
        if (noteSpan && noteSpan.parentNode) {
          if (noteSpan.previousSibling && noteSpan.previousSibling.nodeType === 3) head.removeChild(noteSpan.previousSibling);
          head.removeChild(noteSpan);
        }
        return rehandle(was);
      }
      if (!noteSpan) noteSpan = html('span', 'panel-note');
      if (!noteSpan.parentNode) {
        var before = labelSpan && labelSpan.parentNode ? labelSpan : null;
        if (letterSpan) head.insertBefore(doc.createTextNode(' '), before);
        head.insertBefore(noteSpan, before);
      }
      if (noteSpan.textContent !== text) noteSpan.textContent = text;
      return rehandle(was);
    };
    function rehandle(was) {
      if (p._origin || !p.margin) return p;
      var ids = Object.keys(p._handles);
      if (!ids.length) return p;
      var now = p.origin();
      if (was && Math.abs(was.top - now.top) < 0.01 && Math.abs(was.left - now.left) < 0.01 && was.k === now.k) return p;
      ids.forEach(function (id) { if (p._handles[id].el.parentNode) positionHandle(p, p._handles[id]); });
      return p;
    }
    if (opts.note) p.setNote(opts.note);
    /* header forms of labels that have no admissible position (DS §5.6) */
    p._setHeadLabels = function (list) {
      var sig = list.map(function (l) { return l.cls + '|' + l.text; }).join('\n');
      if (sig === p._headSig) return;
      p._headSig = sig;
      /* The span is added, filled or removed in endFrame, before the reading element and the
         label buttons read the origin. The origin is kept: when the header's height changes, its
         ResizeObserver (watchHead) measures the origin again and places the handles, the reading
         element and the label buttons on it before the frame is painted. */
      if (!list.length) {
        if (labelSpan && labelSpan.parentNode) head.removeChild(labelSpan);
        return;
      }
      if (!labelSpan) labelSpan = html('span', 'panel-labels');
      labelSpan.textContent = '';
      list.forEach(function (l, i) {
        var s = html('span', 'panel-label ' + l.cls);
        s.textContent = (i ? '; ' : '') + l.text;
        labelSpan.appendChild(s);
      });
      if (!labelSpan.parentNode) head.appendChild(labelSpan);
    };

    function readType() {
      var s1 = null, s2 = null;
      try { s1 = global.getComputedStyle(probeLabel); s2 = global.getComputedStyle(probeTick); } catch (e) { s1 = s2 = null; }
      var dt = defaultType();
      p.type = {
        family: (s1 && s1.fontFamily) || dt.family,
        label: pxOf(s1 && s1.fontSize, dt.label), tick: pxOf(s2 && s2.fontSize, dt.tick),
        ls: pxOf(s1 && s1.letterSpacing, 0), ws: pxOf(s1 && s1.wordSpacing, 0),
        lsTick: pxOf(s2 && s2.letterSpacing, 0), wsTick: pxOf(s2 && s2.wordSpacing, 0)
      };
      p.h = p.type.label;
    }

    function innerOf(phone) { return typeof opts.inner === 'function' ? !!opts.inner(phone) : !!opts.inner; }
    function ownMargin(w, phone) {
      var m = typeof opts.margin === 'function' ? opts.margin(w, phone) : (opts.margin || {});
      var inner = innerOf(phone);
      var out = { t: pick(m.t, 14), r: pick(m.r, 16), b: pick(m.b, inner && phone ? 14 : 42), l: pick(m.l, inner ? 10 : 58) };
      var nm = !phone && opts.nameMargin ? (typeof opts.nameMargin === 'function' ? opts.nameMargin(w) : opts.nameMargin) : 0;
      out.nameMargin = nm > 0 ? nm : 0;
      out.r += out.nameMargin;
      return out;
    }
    p._ownMargin = function (w) { return ownMargin(w, isPhone()); };
    function margins(w, phone) {
      var m = ownMargin(w, phone);
      p._links.forEach(function (G) {
        if (!G.axis) return;
        G.panels.forEach(function (q) {
          if (q === p || !q._ownMargin) return;
          var mq = q._ownMargin(q.panelW || w);
          if (G.axis === 'x') { m.l = Math.max(m.l, mq.l); m.r = Math.max(m.r, mq.r); }
          else { m.t = Math.max(m.t, mq.t); m.b = Math.max(m.b, mq.b); }
        });
      });
      return m;
    }

    var knownW = 0, lastW = -1, lastPhone = null, geomSig = '';
    function size(measureNow) {
      var w = (!measureNow && knownW) || el.getBoundingClientRect().width / zoomOf(el) || el.clientWidth || 320;
      if (measureNow) knownW = w;
      var phone = isPhone();
      if (!p.type || phone !== lastPhone || w !== lastW) { p.phone = phone; readType(); }
      lastPhone = phone;
      var m = margins(w, phone);
      var a = typeof opts.aspect === 'function' ? opts.aspect(w, phone) : (opts.aspect || 0.62);
      var pa = typeof opts.plotAspect === 'function' ? opts.plotAspect(w, phone) : opts.plotAspect;
      var W = w, H = pa ? Math.round((w - m.l - m.r) * pa + m.t + m.b) : Math.round(w * a);
      var cap = typeof opts.maxHeight === 'function' ? opts.maxHeight(w, phone) : opts.maxHeight;
      if (finite(cap) && cap > 0 && H > cap) {
        W = pa ? (cap - m.t - m.b) / pa + m.l + m.r : cap / a;
        W = Math.max(m.l + m.r + 40, Math.round(W));
        H = Math.round(cap);
      }
      lastW = w;
      p.panelW = w; p.W = W; p.H = H; p.margin = m; p.nameMargin = m.nameMargin;
      p.offX = Math.max(0, (w - W) / 2);
      p.width = Math.max(20, W - m.l - m.r);
      p.height = Math.max(20, H - m.t - m.b);
      x.range([0, p.width]);
      y.range([p.height, 0]);
      /* The SVG's attributes are written, and the origin is measured again, only when the SVG's
         size, its margins or its place in the panel change. */
      var gs = [w, W, H, p.offX, m.l, m.t, m.r, m.b, phone].join('|');
      if (gs === geomSig) return;
      geomSig = gs;
      p._origin = null;
      svg.attr('viewBox', '0 0 ' + W + ' ' + H).attr('width', W).attr('height', H);
      g.attr('transform', 'translate(' + m.l + ',' + m.t + ')');
      clipRect.attr('x', -2).attr('y', -2).attr('width', p.width + 4).attr('height', p.height + 4);
    }

    function ticksFor(axis) {
      var sc = axis === 'x' ? x : y;
      return C.tickValues(sc.domain(), opts[axis + 'Ticks'], opts[axis + 'Log'], axis === 'x' ? p.width : p.height, axis);
    }
    function minorTicks(spec, skip) {
      if (!spec) return [];
      var dom = x.domain(), lo = Math.min(dom[0], dom[1]), hi = Math.max(dom[0], dom[1]);
      var vals = typeof spec === 'function' ? spec(dom, p.width) : spec;
      return vals.filter(function (v) { return v >= lo && v <= hi && skip.indexOf(v) < 0; });
    }
    function richTicks(axisSel) {
      axisSel.selectAll('.tick text').each(function () {
        var t = this.textContent;
        if (t.indexOf('^{') >= 0 || t.indexOf('_{') >= 0) C.svgText(this, t);
      });
    }
    function drawAxes() {
      var phone = p.phone, inner = innerOf(phone);
      var fx = opts.xFormat || C.fmtNum, fy = opts.yFormat || C.fmtNum;
      var xt = ticksFor('x'), yt = ticksFor('y');
      var xm = majors(xt, x, opts.xMinGap || 34), ym = majors(yt, y, opts.yMinGap || 20);
      var xMaj = xt.filter(function (v, i) { return xm[i]; }), yMaj = yt.filter(function (v, i) { return ym[i]; });
      var xAll = xt.concat(minorTicks(opts.xMinorTicks, xt));
      var hideX = inner && phone, hideY = inner;
      var xLab = hideX ? '' : typeof opts.xLabel === 'function' ? opts.xLabel(p) : opts.xLabel;
      var yLab = hideY ? '' : typeof opts.yLabel === 'function' ? opts.yLabel(p) : opts.yLabel;
      var grid = opts.grid || 'y';
      var sig = [p.width, p.height, p.margin.l, p.margin.b, x.domain().join(','), y.domain().join(','), xAll.join(','),
        xt.map(function (v, i) { return xm[i] && !hideX ? fx(v) : ''; }).join('|'), yMaj.join(','),
        yMaj.map(function (v) { return hideY ? '' : fy(v); }).join('|'), xLab || '', yLab || '', grid].join('#');
      if (sig === p._axisSig) return;
      p._axisSig = sig;
      layers.grid.selectAll('line.gx').data(grid === 'x' || grid === 'both' ? xMaj : []).join('line').attr('class', 'gx')
        .attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', p.height);
      layers.grid.selectAll('line.gy').data(grid === 'y' || grid === 'both' ? yMaj : []).join('line').attr('class', 'gy')
        .attr('x1', 0).attr('x2', p.width).attr('y1', y).attr('y2', y);
      var gx = layers.axes.selectAll('g.x-axis').data([0]).join('g').attr('class', 'axis x-axis')
        .attr('transform', 'translate(0,' + p.height + ')');
      gx.call(d3.axisBottom(x).tickValues(xAll).tickSizeOuter(0).tickSize(4).tickPadding(4)
        .tickFormat(function (v, i) { return !hideX && i < xt.length && xm[i] ? fx(v) : ''; }));
      gx.selectAll('.tick line').attr('y2', function (v) { var k = xt.indexOf(v); return k >= 0 && xm[k] ? 4 : 2; });
      richTicks(gx);
      var gy = layers.axes.selectAll('g.y-axis').data([0]).join('g').attr('class', 'axis y-axis');
      gy.call(d3.axisLeft(y).tickValues(yMaj).tickSize(0).tickPadding(6).tickFormat(function (v) { return hideY ? '' : fy(v); }));
      gy.select('.domain').remove();
      richTicks(gy);
      p._gx = gx; p._gy = gy;
      var xl = layers.axes.selectAll('text.axis-label.xl').data(xLab ? [xLab] : []).join('text')
        .attr('class', 'axis-label xl').attr('text-anchor', 'middle')
        .attr('transform', 'translate(' + (p.width / 2) + ',' + (p.height + p.margin.b - 8) + ')');
      xl.each(function (t) { C.svgText(this, t); });
      var yl = layers.axes.selectAll('text.axis-label.yl').data(yLab ? [yLab] : []).join('text')
        .attr('class', 'axis-label yl').attr('text-anchor', 'middle')
        .attr('transform', 'translate(' + (-p.margin.l + 14) + ',' + (p.height / 2) + ') rotate(-90)');
      yl.each(function (t) { C.svgText(this, t); });
    }

    function beginFrame() {
      /* emptying each layer's element removes its children at once (a selection of every
         descendant would remove each nested node one by one) */
      CLEARED.forEach(function (name) { var n = layers[name].node(); if (n.firstChild) n.textContent = ''; });
      p._gen = (p._gen || 0) + 1;
      p.obstacles = [];
      p._index = null;
      p._pending = [];
      p._placedNow = false;
      p._reportNow = [];
      p._keyed = {};
      p._drawn = [];
      p._lines = {};
      p._regions = {};
      p._annotations = [];
      p._names = { x: [], y: [] };
      p._seriesSeen = {};
      p._headLabels = [];
      Object.keys(p._handles).forEach(function (k) { p._handles[k].seen = false; });
      Object.keys(p._labelButtons).forEach(function (k) { p._labelButtons[k]._seen = false; });
      if (measuring && !measuring.saved.has(p)) measuring.saved.set(p, p._lastPlaced);
    }
    function endFrame() {
      if (p._pending.length || !p._placedNow) {
        if (p._pending.length) C.place(p, []);
        else { p._report = []; }
      }
      p._setHeadLabels(p._headLabels);
      sweepHandles(p);
      sweepLabelButtons(p);
      updateTickHiding(p);
      if (p._reader) p._reader.refresh();
      p._links.forEach(function (G) { if (G._current) G._apply(p); });
    }
    p.clear = beginFrame;
    p.redrawMarks = function (fn) {
      beginFrame();
      if (typeof fn === 'function') fn(p);
      return p;
    };

    var drawFn = null;
    function render(measureNow) {
      size(measureNow === true);
      drawAxes();
      beginFrame();
      if (p._ghost) drawGhost(p);
      if (drawFn) drawFn(p);
      endFrame();
    }
    p.render = render;
    /** Set the draw function (optional) and redraw. */
    p.update = function (fn) {
      if (typeof fn === 'function') drawFn = fn;
      render();
      return p;
    };
    /* One placer index per panel, emptied for each render's obstacles while the plot's size is
       unchanged, so a render allocates no new grid or item arrays. */
    var keptIndex = null;
    p.index = function () {
      if (!p._index) {
        if (!TP.placer) throw new Error('TP.chart needs TP.placer (site/js/lib/placer.js)');
        if (keptIndex && keptIndex.width === p.width && keptIndex.height === p.height) emptyIndex(keptIndex);
        else keptIndex = TP.placer.index(p.width, p.height, 16);
        p._index = keptIndex.addAll(p.obstacles);
      }
      return p._index;
    };
    p.origin = function () {
      if (p._origin) return p._origin;
      var o = { left: p.offX + p.margin.l, top: p.margin.t, k: 1 };
      try {
        var r = svgNode.getBoundingClientRect(), e = el.getBoundingClientRect(), z = zoomOf(el);
        if (r.width > 0 && e.width > 0) {
          o.k = p.W > 0 ? r.width / z / p.W : 1;
          o.left = (r.left - e.left) / z + p.margin.l * o.k;
          o.top = (r.top - e.top) / z + p.margin.t * o.k;
        }
      } catch (err) { /* the estimate above */ }
      p._origin = o;
      /* the header's height with this origin (the layout was just read, so this reads no more) */
      p._originHead = head.offsetHeight;
      return o;
    };
    /** Plot px to the panel element's px, for elements positioned over the SVG. */
    p.toEl = function (X, Y) { var o = p.origin(); return { left: o.left + X * o.k, top: o.top + Y * o.k }; };

    /* Redraw in the next frame, not inside the observer callback: a size change inside the
       callback would loop. */
    var pending = false;
    function schedule() {
      if (pending) return;
      pending = true;
      global.requestAnimationFrame(function () {
        pending = false;
        if (Math.abs(knownW - lastW) >= 0.5 || isPhone() !== lastPhone) {
          render();
          /* the redraw above calls the draw function alone; a figure whose labels are settled
             for the panel's size (the order of anchors it tries) settles them again on this
             event, so that the labels at a size do not depend on the sizes drawn before it */
          if (typeof global.CustomEvent === 'function') el.dispatchEvent(new global.CustomEvent('tp:panel-resize', { bubbles: true }));
        }
      });
    }
    if (global.ResizeObserver) {
      new global.ResizeObserver(function (entries) {
        var w = entries[entries.length - 1].contentRect.width;
        if (w > 0 && !degenerateViewport()) { knownW = w; p._origin = null; schedule(); }
      }).observe(el);
      /* watchHead: the header's height is read after the browser's own layout, before the frame
         is painted. When it differs from the height the kept origin was measured with, the origin
         is measured again (the layout is clean here, so the read is cheap) and the handles and the
         reading element are placed on it. A render therefore never reads the layout to learn
         whether a new note or header label moved the plot. */
      new global.ResizeObserver(function () {
        /* not in a degenerate viewport: an element screenshot taller than the viewport sets it
           to 1 x 1 px for a moment, where the header wraps and a measured origin would move the
           handles and the reading element off their places (F6.3's reduced-motion check) */
        if (!p._origin || !p.margin || degenerateViewport()) return;
        var hh = head.offsetHeight;
        if (Math.abs(hh - (p._originHead == null ? hh : p._originHead)) < 0.01) return;
        var was = p._origin;
        p._origin = null;
        rehandle(was);
        if (p._reader) p._reader.refresh();
        Object.keys(p._labelButtons).forEach(function (k) { placeLabelButton(p, p._labelButtons[k]); });
      }).observe(head);
    } else {
      global.addEventListener('resize', function () {
        if (degenerateViewport()) return;
        knownW = el.getBoundingClientRect().width / zoomOf(el); schedule();
      });
    }
    render();
    return p;
  };

  /* ---------- tick hiding and names on the axes ---------- */

  /* The tick labels' nodes and widths are kept per axis until drawAxes draws the axis again (its
     signature changes), so a render measures no tick label; the hidden flags are computed again
     only when the names on the axis move. */
  function updateTickHiding(p) {
    p._tickHide = p._tickHide || {};
    ['x', 'y'].forEach(function (axis) {
      var gAxis = axis === 'x' ? p._gx : p._gy;
      if (!gAxis) return;
      var names = p._names[axis].concat(p._temp.filter(function (t) { return t.axis === axis; }));
      var c = p._tickHide[axis];
      if (!c || c.axisSig !== p._axisSig || c.h !== p.h || c.g !== gAxis.node()) {
        var nodes = [], ticks = [];
        gAxis.selectAll('.tick text').each(function (v) {
          if (!this.textContent) return;
          var sc = axis === 'x' ? p.x : p.y;
          nodes.push(this);
          ticks.push({ pos: sc(v), w: axis === 'x' ? C.measureText(this.textContent, 'tick', p).w : 0 });
        });
        c = p._tickHide[axis] = { axisSig: p._axisSig, h: p.h, g: gAxis.node(), nodes: nodes, ticks: ticks, namesSig: null };
      }
      var ns = names.map(function (n) { return n.pos + ':' + (n.w || 0); }).join(',');
      if (ns === c.namesSig) return;
      c.namesSig = ns;
      var hide = names.length ? C.hiddenTicks(c.ticks, names, p.h, axis) : [];
      c.nodes.forEach(function (n, i) {
        var want = hide[i] ? 'hidden' : '';
        if (n.style.visibility !== want) n.style.visibility = want;
      });
    });
  }
  /* A name on an axis: a text in the tone of its role, at the tick size, with a short tick on the
     x axis. Returns {node, pos, w, axis}. */
  function axisName(p, layer, axis, value, text, roleName, o) {
    o = o || {};
    var sc = axis === 'x' ? p.x : p.y, P = sc(value);
    if (!finite(P) || P < -0.5 || P > (axis === 'x' ? p.width : p.height) + 0.5) return null;
    var lines = Array.isArray(text) ? text : [String(text)], m = C.measureText(lines, 'tick', p);
    var gN = layer.append('g').attr('class', 'axis-name r-' + roleOf(roleName));
    var t = gN.append('text').attr('class', 'level-name');
    var pos = P;
    if (axis === 'x') {
      if (o.tick !== false) gN.append('line').attr('class', 'stem').attr('x1', P).attr('x2', P).attr('y1', p.height).attr('y2', p.height + 5);
      var half = m.w / 2, lo = -p.margin.l + half + 1, hi = p.width + p.margin.r - half - 1;
      pos = hi > lo ? clamp(P, lo, hi) : P;
      t.attr('text-anchor', 'middle').attr('x', pos).attr('y', p.height + 8).attr('dy', '0.71em');
    } else if (o.side === 'right') {
      t.attr('text-anchor', 'start').attr('x', p.width + 6).attr('y', P).attr('dy', '0.32em');
    } else {
      t.attr('text-anchor', 'end').attr('x', -6).attr('y', P).attr('dy', '0.32em');
    }
    C.svgText(t.node(), lines, m.lh);
    return { node: gN.node(), pos: pos, w: m.w, axis: axis, value: value, role: roleOf(roleName), side: o.side };
  }
  function addTemp(p, axis, value, text, roleName) {
    var n = axisName(p, p.layers.hover, axis, value, text, roleName, { tick: false });
    if (!n) return null;
    p._temp.push(n);
    updateTickHiding(p);
    return n;
  }
  function removeTemp(p, n) {
    if (!n) return;
    var i = p._temp.indexOf(n);
    if (i >= 0) p._temp.splice(i, 1);
    if (n.node && n.node.parentNode) n.node.parentNode.removeChild(n.node);
    updateTickHiding(p);
  }

  /* ============================== marks ============================== */

  function lineClass(dash, r) {
    if (dash === 'ghost') return 'ghost';
    if (dash === 'level') return 'level';
    if (dash === 'trail') return 'trail';
    return r === 'context' ? 'context' : 'line';
  }
  /* coordinates rounded to 0.01 px by fx2 (toFixed on every point cost a third of a long line's
     render) */
  function pathOf(pts) {
    var s = '';
    for (var i = 0; i < pts.length; i++) s += (i ? 'L' : 'M') + fx2(pts[i][0]) + ',' + fx2(pts[i][1]);
    return s;
  }
  function linePoints(p, rows, xAcc, yAcc, decimate) {
    var n = rows.length, pts = [];
    var fx = n > 500 ? direct(p.x, p.opts.xLog) : p.x, fy = n > 500 ? direct(p.y, p.opts.yLog) : p.y;
    if (!(decimate && n > 4 * p.width)) {
      for (var i = 0; i < n; i++) {
        var xv = xAcc(rows[i], i), yv = yAcc(rows[i], i);
        if (okPoint(p, xv, yv)) pts.push([fx(xv), fy(yv)]);
      }
      return pts;
    }
    /* A long line to decimate: the points go into flat arrays and only the points C.m4 keeps
       become [x, y] pairs. The result equals C.m4 of the full list of pairs (one array per row
       was most of a long line's cost, with the garbage it left). */
    var X = new Float64Array(n), Y = new Float64Array(n), m = 0;
    for (var k = 0; k < n; k++) {
      var a = xAcc(rows[k], k), b = yAcc(rows[k], k);
      if (okPoint(p, a, b)) { X[m] = fx(a); Y[m] = fy(b); m++; }
    }
    if (m <= 4 * p.width) {
      for (var c = 0; c < m; c++) pts.push([X[c], Y[c]]);
      return pts;
    }
    return m4Flat(X, Y, m);
  }
  /* C.m4 over flat arrays: the same points in the same order */
  function m4Flat(X, Y, n) {
    var out = [], i = 0;
    while (i < n) {
      var col = Math.floor(X[i]), j = i, lo = i, hi = i;
      while (j + 1 < n && Math.floor(X[j + 1]) === col) {
        j++;
        if (Y[j] < Y[lo]) lo = j;
        if (Y[j] > Y[hi]) hi = j;
      }
      var a = lo < hi ? lo : hi, b = lo < hi ? hi : lo;
      out.push([X[i], Y[i]]);
      if (a !== i) out.push([X[a], Y[a]]);
      if (b !== a) out.push([X[b], Y[b]]);
      if (j !== b) out.push([X[j], Y[j]]);
      i = j + 1;
    }
    return out;
  }

  /** A series line through rows (accessors in data units). */
  C.line = function (p, rows, xAcc, yAcc, o) {
    o = o || {};
    var r = roleOf(o.role), series = seriesOf(o, r), dash = o.dash, pts, d;
    var xd = p.x.domain(), yd = p.y.domain();
    var sig = o.cache ? [p.width, p.height, xd[0], xd[1], yd[0], yd[1], !!o.decimate].join('|') : null;
    if (o.cache && o.cache.data === rows && o.cache.sig === sig) { pts = o.cache.pts; d = o.cache.d; }
    else {
      pts = linePoints(p, rows, xAcc, yAcc, o.decimate);
      if (pts.length < 2) return null;
      d = pathOf(pts);
      if (o.cache) { o.cache.data = rows; o.cache.sig = sig; o.cache.pts = pts; o.cache.d = d; }
    }
    var layer = o.layer || (dash === 'ghost' ? p.layers.ghosts : dash === 'level' ? p.layers.refs : p.layers.series);
    var path = layer.append('path').attr('class', lineClass(dash, r) + ' r-' + r).attr('d', d);
    var weight = o.weight || (dash === 'ghost' ? 2.5 : dash === 'level' || dash === 'trail' ? 2 : r === 'context' ? 1.5 : 3);
    if (o.weight) path.style('stroke-width', o.weight + 'px');
    if (o.alpha != null && o.alpha < 1) {
      /* DS §4.6: an ensemble of seeds at 0.3 opacity and 1.5 px; alpha is never emphasis */
      path.style('stroke-opacity', o.alpha).attr('data-alpha', o.alpha);
    }
    var k = typeof o.key === 'function' ? C.keyOf(o.key, rows, 0) : o.key != null ? String(o.key) : null;
    if (k != null) { path.attr('data-key', k); regKey(p, k, { el: path.node(), type: 'line', pts: pts }); }
    var sid = dash === 'ghost' ? 'ghost:' + series : series;
    if (o.obstacle !== false) addObstacle(p, { kind: 'rival', type: 'polyline', geom: flatRuns(pts, -40, p.height + 40), width: weight, seriesId: sid });
    if (dash !== 'ghost') {
      p._lines[series] = pts;
      if (k != null && !p._lines[k]) p._lines[k] = pts;
      /* a level line counts as a series of the frame, so that a label beside it and one other
         series takes its role's label tone (DS §5.3); a trail is a second reading of its series */
      if (dash !== 'trail') seen(p, series);
      p._drawn.push({ kind: dash === 'level' ? 'level' : 'line', role: r, series: series, rows: rows, x: xAcc, y: yAcc, ghost: o.ghost !== false && r !== 'context' && r !== 'ref' && dash !== 'trail' });
    }
    return path;
  };

  /* marker geometry by shape and fill (DS §4.1): r is the drawn size's half, ring the stroke */
  function markerSpec(r, o) {
    var shape = o.shape || (r === 'data' ? 'square' : r === 'fourth' ? 'diamond' : 'circle');
    var fill = o.fill || (r === 'data' || r === 'third' || r === 'fourth' ? 'open' : 'filled');
    var size = o.size || (fill === 'open' ? (shape === 'diamond' ? 10 : 9) : 8);
    var stroke = fill === 'open' ? 2 : 1.5;
    return { shape: shape, fill: fill, half: size / 2, stroke: stroke, drawn: size / 2 + stroke / 2 };
  }
  function markerElement(layer, spec, X, Y) {
    var n, h = spec.half;
    if (spec.shape === 'diamond') {
      n = svgEl('path');
      n.setAttribute('d', 'M' + fx2(X) + ',' + fx2(Y - h) + 'L' + fx2(X + h) + ',' + fx2(Y) + 'L' + fx2(X) + ',' + fx2(Y + h) + 'L' + fx2(X - h) + ',' + fx2(Y) + 'Z');
    } else if (spec.shape === 'square') {
      n = svgEl('rect');
      n.setAttribute('x', fx2(X - h)); n.setAttribute('y', fx2(Y - h));
      n.setAttribute('width', fx2(2 * h)); n.setAttribute('height', fx2(2 * h));
    } else {
      n = svgEl('circle');
      n.setAttribute('cx', fx2(X)); n.setAttribute('cy', fx2(Y)); n.setAttribute('r', h);
    }
    layer.node().appendChild(n);
    return n;
  }
  /** Markers, one element per row, sized by role and form (DS §4.1, §4.2). */
  C.markers = function (p, rows, xAcc, yAcc, o) {
    o = o || {};
    var r = roleOf(o.role), series = seriesOf(o, r), spec = markerSpec(r, o);
    var cls = (spec.fill === 'open' ? 'open' : 'dot') + (spec.shape !== 'circle' ? ' ' + spec.shape : '') + ' r-' + r;
    var layer = o.layer || p.layers.marks, pts, flat = [];
    var cand = [];
    rows.forEach(function (d, i) {
      var xv = xAcc(d, i), yv = yAcc(d, i);
      if (okPoint(p, xv, yv)) cand.push({ d: d, i: i, X: p.x(xv), Y: p.y(yv) });
    });
    if (o.thin > 0 && cand.length > 2) pts = thinMarkers(cand, o.thin, o.keep);
    else pts = cand;
    pts.forEach(function (q) {
      var n = markerElement(layer, spec, q.X, q.Y);
      n.setAttribute('class', cls);
      if (o.color) {
        var col = o.color(q.d, q.i);
        /* the colour goes to the marker's own --c, which .dot and .open read, with class ramp, so
           that the greying rule of .has-hi (site.css) can still turn the marker context grey; an
           inline fill would outrank that rule */
        if (col) { n.style.setProperty('--c', col); n.classList.add('ramp'); }
      }
      var k = C.keyOf(o.key, q.d, q.i);
      if (k != null) { n.setAttribute('data-key', k); regKey(p, k, { el: n, type: 'point', X: q.X, Y: q.Y, r: spec.drawn }); }
      q.node = n;
      flat.push(q.X, q.Y);
    });
    if (o.obstacle !== false && flat.length) addObstacle(p, { kind: 'rival', type: 'points', geom: flat, r: spec.drawn, seriesId: series });
    seen(p, series);
    p._drawn.push({ kind: 'points', role: r, series: series, rows: rows, x: xAcc, y: yAcc, ghost: o.ghost !== false });
    var sel = d3.selectAll(pts.map(function (q) { return q.node; }));
    sel.pts = pts;
    return sel;
  };

  /** Hundreds of markers as one path: circles, or triangles pointing 'left' or 'right' (a point
      beyond that end of the axis). */
  C.markerPath = function (p, rows, xAcc, yAcc, o) {
    o = o || {};
    var r = roleOf(o.role), series = seriesOf(o, r), fill = o.fill || 'filled', rad = o.r || (fill === 'open' ? 4.5 : 4);
    var fx = direct(p.x, p.opts.xLog), fy = direct(p.y, p.opts.yLog);
    var tri = o.shape === 'left' || o.shape === 'right', T = rad * 1.3, sg = o.shape === 'left' ? -1 : 1;
    var arc = 'a' + rad + ',' + rad + ' 0 1,0 ', d = [], n = 0, flat = [];
    for (var i = 0; i < rows.length; i++) {
      var xv = xAcc(rows[i], i), yv = yAcc(rows[i], i);
      if (!okPoint(p, xv, yv)) continue;
      var X = fx(xv), Y = fy(yv);
      d.push(tri
        ? 'M' + (X - sg * T).toFixed(1) + ',' + (Y - T).toFixed(1) + 'L' + (X + sg * T).toFixed(1) + ',' + Y.toFixed(1) + 'L' + (X - sg * T).toFixed(1) + ',' + (Y + T).toFixed(1) + 'Z'
        : 'M' + (X - rad).toFixed(1) + ',' + Y.toFixed(1) + arc + (2 * rad) + ',0' + arc + (-2 * rad) + ',0');
      flat.push(X, Y);
      n++;
    }
    var path = (o.layer || p.layers.marks).append('path').attr('class', (fill === 'open' ? 'open' : 'dot') + ' r-' + r)
      .attr('data-n', n).attr('data-shape', tri ? o.shape : 'circle').attr('d', n ? d.join('') : 'M0,0');
    if (o.key != null) path.attr('data-key', C.keyOf(o.key, rows, 0));
    if (o.obstacle !== false && flat.length) addObstacle(p, { kind: 'rival', type: 'points', geom: flat, r: rad + 1, seriesId: series });
    seen(p, series);
    return path;
  };

  /** A cloud of small dots (4 px): one path, or one circle per dot where alpha is set so that
      overlaps pile up. alpha is for density or an ensemble alone (DS §2.3 rule 5, §4.6). */
  C.dots = function (p, rows, xAcc, yAcc, o) {
    o = o || {};
    var r = roleOf(o.role), series = seriesOf(o, r), rad = o.r || 2;
    var xd = p.x.domain(), yd = p.y.domain();
    var sig = [p.width, p.height, xd[0], xd[1], yd[0], yd[1], !!o.round].join('|');
    var cache = o.cache || {}, pos, state;
    if (cache.data === rows && cache.sig === sig) { pos = cache.pos; state = cache.state; }
    else {
      pos = new Float64Array(2 * rows.length);
      state = new Int8Array(rows.length);
      cache.data = rows; cache.sig = sig; cache.pos = pos; cache.state = state;
    }
    var fx = direct(p.x, p.opts.xLog), fy = direct(p.y, p.opts.yLog);
    var alpha = o.alpha != null && o.alpha < 1 ? o.alpha : null;
    var layer = o.layer || p.layers.marks, d = [], flat = [];
    var arc = 'a' + rad + ',' + rad + ' 0 1,0 ';
    var group = alpha != null ? layer.append('g').attr('class', 'cloud-group r-' + r).attr('data-alpha', alpha) : null;
    for (var j = 0; j < rows.length; j++) {
      if (state[j] < 0 || (o.include && !o.include(rows[j], j))) continue;
      if (state[j] === 0) {
        var xv = xAcc(rows[j], j), yv = yAcc(rows[j], j);
        var X = okPoint(p, xv, yv) ? fx(xv) : NaN, Y = okPoint(p, xv, yv) ? fy(yv) : NaN;
        if (!(X >= -rad && X <= p.width + rad && Y >= -rad && Y <= p.height + rad)) { state[j] = -1; continue; }
        if (o.round) { X = Math.round(X); Y = Math.round(Y); }
        pos[2 * j] = X; pos[2 * j + 1] = Y;
        state[j] = 1;
      }
      var PX = pos[2 * j], PY = pos[2 * j + 1];
      if (group) {
        var c = svgEl('circle', 'cloud r-' + r);
        c.setAttribute('cx', fx2(PX)); c.setAttribute('cy', fx2(PY)); c.setAttribute('r', rad);
        c.style.fillOpacity = alpha;
        group.node().appendChild(c);
      } else {
        d.push('M' + (PX - rad).toFixed(1) + ',' + PY.toFixed(1) + arc + (2 * rad) + ',0' + arc + (-2 * rad) + ',0');
      }
      flat.push(PX, PY);
      if (typeof o.key === 'function' || (o.key == null && rows[j] && rows[j].key != null)) {
        var k = C.keyOf(o.key, rows[j], j);
        if (k != null) regKey(p, k, { type: 'point', X: PX, Y: PY, r: rad });
      }
    }
    var out = group || layer.append('path').attr('class', 'cloud r-' + r).attr('d', d.length ? d.join('') : 'M0,0');
    if (o.key != null && typeof o.key !== 'function') out.attr('data-key', String(o.key));
    if (o.obstacle !== false && flat.length && flat.length <= 10000) addObstacle(p, { kind: 'rival', type: 'points', geom: flat, r: rad, seriesId: series });
    seen(p, series);
    return out;
  };

  /** Bars, such as a histogram: rows [{x0, x1, y, key}] rising from base (default the bottom of
      the y domain) to y, in the role's mark tone. */
  C.bars = function (p, rows, o) {
    o = o || {};
    var r = roleOf(o.role), series = seriesOf(o, r);
    var dom = p.y.domain(), lo = Math.min(dom[0], dom[1]);
    var Yb = clamp(p.y(o.base != null ? o.base : lo), 0, p.height), layer = o.layer || p.layers.series, out = [];
    rows.forEach(function (row, i) {
      if (!okY(p, row.y)) return;
      var X0 = clamp(p.x(row.x0), 0, p.width), X1 = clamp(p.x(row.x1), 0, p.width);
      var gap = Math.min(row.gap != null ? row.gap : o.gap != null ? o.gap : 1, (X1 - X0) / 3);
      if (!(X1 - X0 - gap > 0)) return;
      var Y = clamp(p.y(row.y), 0, p.height), top = Math.min(Y, Yb), h = Math.abs(Yb - Y);
      if (h <= 0) return;
      var left = X0, w = X1 - X0 - gap;
      if (o.maxWidth && w > o.maxWidth) { left = X0 + (w - o.maxWidth) / 2; w = o.maxWidth; }
      var n = layer.append('rect').attr('class', 'bar' + (o.fill === 'open' ? ' open' : '') + ' r-' + r)
        .attr('x', fx2(left)).attr('y', fx2(top)).attr('width', fx2(w)).attr('height', fx2(h)).node();
      var k = C.keyOf(o.key, row, i);
      if (k != null) { n.setAttribute('data-key', k); regKey(p, k, { el: n, type: 'bar', X: left + w / 2, Y: top, r: 0 }); }
      addObstacle(p, { kind: 'rival', type: 'rect', geom: { x0: left, y0: top, x1: left + w, y1: top + h }, seriesId: series });
      out.push({ row: row, X0: left, X1: left + w, Y: top, node: n });
    });
    seen(p, series);
    return out;
  };

  /** A rug: one tick per x value, structure in context grey, or 1.5-px ticks in a role's token. */
  C.rug = function (p, xs, o) {
    o = o || {};
    var Y0 = o.y0 != null ? p.y(o.y0) : p.height, Y1 = o.y1 != null ? p.y(o.y1) : 0, d = '', flat = [];
    xs.forEach(function (xv) {
      if (!okX(p, xv)) return;
      var X = p.x(xv);
      if (X < -0.5 || X > p.width + 0.5) return;
      d += 'M' + X.toFixed(2) + ',' + Y0.toFixed(2) + 'V' + Y1.toFixed(2);
      flat.push(X, Y0, X, Y1, NaN, NaN);
    });
    var path = (o.layer || p.layers.marks).append('path').attr('class', o.role ? 'stem r-' + roleOf(o.role) : 'structure').attr('d', d || 'M0,0');
    if (o.key != null) path.attr('data-key', String(C.keyOf(o.key, xs, 0)));
    if (flat.length) addObstacle(p, { kind: 'structure', type: 'polyline', geom: flat, width: 1.5 });
    return path;
  };

  /* A region: kept for the placer (it captures labels it does not name) and for names. */
  function addRegion(p, id, box, poly) {
    p._regions[id] = box;
    addObstacle(p, poly ? { id: id, kind: 'region', type: 'polygon', geom: poly } : { id: id, kind: 'region', type: 'rect', geom: box });
  }
  function queueName(p, id, name, box, o) {
    if (!name) return;
    p._pending.push({ id: id, text: name, tone: 'ink', names: o.regionId, feature: { type: 'region', px: true, box: box }, phone: o.phone, captionNames: o.captionNames, keySentence: o.keySentence });
  }

  /** An opaque tint over [x0, x1] (axis 'x', full height unless y0, y1) or [y0, y1] (axis 'y'),
      under the gridlines (DS §4.6), with its name inside it in text ink. */
  C.band = function (p, a0, a1, o) {
    o = o || {};
    var r = roleOf(o.role), axis = o.axis || 'x', X0, X1, Y0, Y1;
    if (axis === 'y') {
      Y0 = clamp(Math.min(p.y(a0), p.y(a1)), 0, p.height); Y1 = clamp(Math.max(p.y(a0), p.y(a1)), 0, p.height);
      X0 = 0; X1 = p.width;
    } else {
      X0 = clamp(Math.min(p.x(a0), p.x(a1)), 0, p.width); X1 = clamp(Math.max(p.x(a0), p.x(a1)), 0, p.width);
      Y0 = o.y1 != null ? clamp(p.y(o.y1), 0, p.height) : 0; Y1 = o.y0 != null ? clamp(p.y(o.y0), 0, p.height) : p.height;
    }
    if (!(X1 > X0) || !(Y1 > Y0)) return null;
    var id = String(o.id || o.name || ('band-' + (++uid)));
    var rect = p.layers.bands.append('rect').attr('class', 'band r-' + r)
      .attr('x', fx2(X0)).attr('y', fx2(Y0)).attr('width', fx2(X1 - X0)).attr('height', fx2(Y1 - Y0));
    if (o.key != null) { rect.attr('data-key', String(o.key)); regKey(p, String(o.key), { el: rect.node(), type: 'region', X: (X0 + X1) / 2, Y: (Y0 + Y1) / 2 }); }
    var box = { x0: X0, y0: Y0, x1: X1, y1: Y1 };
    addRegion(p, id, box);
    queueName(p, 'band:' + id, o.name, box, { regionId: id, phone: o.phone, captionNames: o.captionNames, keySentence: o.keySentence });
    return { node: rect.node(), id: id, box: box };
  };

  /** A band around a curve: the tint between y0(d) and y1(d). */
  C.area = function (p, rows, xAcc, y0Acc, y1Acc, o) {
    o = o || {};
    var r = roleOf(o.role), top = [], bottom = [];
    rows.forEach(function (d, i) {
      var xv = xAcc(d, i), a = y0Acc(d, i), b = y1Acc(d, i);
      if (!okPoint(p, xv, a) || !okPoint(p, xv, b)) return;
      var X = p.x(xv);
      top.push([X, p.y(b)]);
      bottom.push([X, p.y(a)]);
    });
    if (top.length < 2) return null;
    var poly = top.concat(bottom.reverse());
    var path = p.layers.bands.append('path').attr('class', 'band r-' + r).attr('d', pathOf(poly) + 'Z');
    var id = String(o.id || o.name || ('area-' + (++uid)));
    if (o.key != null) path.attr('data-key', String(o.key));
    var flat = [], bx = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
    poly.forEach(function (q) {
      flat.push(q[0], q[1]);
      bx.x0 = Math.min(bx.x0, q[0]); bx.y0 = Math.min(bx.y0, q[1]); bx.x1 = Math.max(bx.x1, q[0]); bx.y1 = Math.max(bx.y1, q[1]);
    });
    bx = { x0: clamp(bx.x0, 0, p.width), y0: clamp(bx.y0, 0, p.height), x1: clamp(bx.x1, 0, p.width), y1: clamp(bx.y1, 0, p.height) };
    addRegion(p, id, bx, flat);
    queueName(p, 'band:' + id, o.name, bx, { regionId: id, phone: o.phone, captionNames: o.captionNames, keySentence: o.keySentence });
    return { node: path.node(), id: id, box: bx };
  };

  /** Box plots (DS §4.6): rows [{x, min, q1, median, q3, max, draws, key}]. With dots, a stack of
      4-px draws with the unfilled box over it, its edges and median over a surface casing;
      without, the box in the tint with its edge in the token. Whiskers leaving the frame stop at
      the edge under an arrowhead. Returns the boxes in plot px. */
  C.boxplot = function (p, rows, o) {
    o = o || {};
    var r = roleOf(o.role), series = seriesOf(o, r), layer = o.layer || p.layers.marks;
    var xs = rows.map(function (row) { return p.x(row.x); }).sort(function (a, b) { return a - b; });
    var gap = Infinity;
    for (var i = 1; i < xs.length; i++) gap = Math.min(gap, xs[i] - xs[i - 1]);
    var w = o.width || Math.min(40, 0.6 * (finite(gap) ? gap : 40));
    var dom = p.y.domain(), lo = Math.min(dom[0], dom[1]), hi = Math.max(dom[0], dom[1]);
    function Y(v) { return p.y(clamp(v, lo, hi)); }
    function line(gr, cls, x1, y1, x2, y2) {
      return gr.append('line').attr('class', cls).attr('x1', fx2(x1)).attr('y1', fx2(y1)).attr('x2', fx2(x2)).attr('y2', fx2(y2));
    }
    var out = [];
    rows.forEach(function (row, ri) {
      var X = p.x(row.x);
      if (!(X >= -1 && X <= p.width + 1)) return;
      var b = { row: row, X: X, w: w, yQ1: Y(row.q1), yQ3: Y(row.q3), yMedian: Y(row.median), yMin: Y(row.min), yMax: Y(row.max), cutMin: row.min < lo, cutMax: row.max > hi };
      var gr = layer.append('g').attr('class', 'boxplot r-' + r);
      var k = C.keyOf(o.key, row, ri);
      if (k != null) { gr.attr('data-key', k); regKey(p, k, { el: gr.node(), type: 'box', X: X, Y: b.yMedian, r: w / 2 }); }
      var dots = o.dots && row.draws && row.draws.length;
      if (dots) {
        /* the stack: dots binned by 4-px rows of y, placed side by side from the centre */
        var bins = {}, flat = [];
        row.draws.slice().sort(function (a, c) { return a - c; }).forEach(function (v) {
          if (!okY(p, v)) return;
          var Yv = p.y(v);
          if (Yv < -2 || Yv > p.height + 2) return;
          var bin = Math.round(Yv / 4), n = bins[bin] = (bins[bin] || 0) + 1, j = n - 1;
          var off = (j % 2 ? 1 : -1) * Math.ceil(j / 2) * 4.5;
          var c = gr.append('circle').attr('class', 'cloud').attr('cx', fx2(X + off)).attr('cy', fx2(bin * 4)).attr('r', 2);
          flat.push(X + off, bin * 4);
          c.attr('data-draw', v);
        });
        if (flat.length) addObstacle(p, { kind: 'rival', type: 'points', geom: flat, r: 2, seriesId: series });
      }
      [[b.yQ1, b.yMin, b.cutMin], [b.yQ3, b.yMax, b.cutMax]].forEach(function (seg) {
        if (Math.abs(seg[1] - seg[0]) < 0.5) return;
        if (dots) line(gr, 'casing stem', X, seg[0], X, seg[1]);
        line(gr, 'stem', X, seg[0], X, seg[1]);
        addObstacle(p, { kind: 'rival', type: 'segment', geom: [[X, seg[0]], [X, seg[1]]], width: 1.5, seriesId: series });
        if (seg[2]) {
          var s = seg[1] < seg[0] ? 1 : -1;
          var head = [[X - 3.5, seg[1] + 6 * s], [X, seg[1]], [X + 3.5, seg[1] + 6 * s]];
          gr.append('path').attr('class', 'arrowhead').attr('d', pathOf(head) + 'Z');
        } else {
          if (dots) line(gr, 'casing stem', X - w / 8, seg[1], X + w / 8, seg[1]);
          line(gr, 'stem', X - w / 8, seg[1], X + w / 8, seg[1]);
        }
      });
      var bh = Math.max(1, b.yQ1 - b.yQ3);
      if (dots) gr.append('rect').attr('class', 'casing box').attr('x', fx2(X - w / 2)).attr('y', fx2(b.yQ3)).attr('width', fx2(w)).attr('height', fx2(bh));
      gr.append('rect').attr('class', dots ? 'box over' : 'box').attr('x', fx2(X - w / 2)).attr('y', fx2(b.yQ3)).attr('width', fx2(w)).attr('height', fx2(bh));
      if (dots) line(gr, 'casing median', X - w / 2, b.yMedian, X + w / 2, b.yMedian);
      line(gr, 'median', X - w / 2, b.yMedian, X + w / 2, b.yMedian);
      addObstacle(p, { kind: 'rival', type: 'rect', geom: { x0: X - w / 2, y0: b.yQ3, x1: X + w / 2, y1: b.yQ3 + bh }, width: 1.5, seriesId: series });
      out.push(b);
    });
    seen(p, series);
    return out;
  };

  /** The best trial's ring: 20 px, 2 px, no fill, in the series' token (DS §4.4). */
  C.ring = function (p, xv, yv, o) {
    o = o || {};
    var r = roleOf(o.role);
    if (!okPoint(p, xv, yv)) return null;
    var X = p.x(xv), Y = p.y(yv);
    var c = (o.layer || p.layers.marks).append('circle').attr('class', 'ring r-' + r).attr('cx', fx2(X)).attr('cy', fx2(Y)).attr('r', 10);
    if (o.key != null) { c.attr('data-key', String(o.key)); regKey(p, String(o.key), { el: c.node(), type: 'point', X: X, Y: Y, r: 11 }); }
    addObstacle(p, { kind: 'rival', type: 'point', geom: { x: X, y: Y, r: 11 }, seriesId: seriesOf(o, r) });
    return c;
  };

  /** Infeasible crosses (DS §4.5): 10 px, 2 px, round caps, in the runner's token, at the trial's
      value, or at the frame edge its result left by (undefined results at o.edge, default the top).
      Returns the count, for the header's "k of n diverged". */
  C.cross = function (p, rows, xAcc, yAcc, o) {
    o = o || {};
    var r = roleOf(o.role), series = seriesOf(o, r), layer = o.layer || p.layers.marks, n = 0, flat = [];
    rows.forEach(function (d, i) {
      var xv = xAcc(d, i), yv = yAcc(d, i);
      if (!okX(p, xv)) return;
      var X = clamp(p.x(xv), 0, p.width), Y;
      if (okY(p, yv)) Y = clamp(p.y(yv), 0, p.height);
      else Y = o.edge === 'bottom' ? p.height : 0;
      var a = 4, path = layer.append('path').attr('class', 'cross r-' + r)
        .attr('d', 'M' + fx2(X - a) + ',' + fx2(Y - a) + 'L' + fx2(X + a) + ',' + fx2(Y + a) + 'M' + fx2(X - a) + ',' + fx2(Y + a) + 'L' + fx2(X + a) + ',' + fx2(Y - a));
      var k = C.keyOf(o.key, d, i);
      if (k != null) { path.attr('data-key', k); regKey(p, k, { el: path.node(), type: 'point', X: X, Y: Y, r: 5 }); }
      flat.push(X, Y);
      n++;
    });
    if (flat.length) addObstacle(p, { kind: 'rival', type: 'points', geom: flat, r: 5, seriesId: series });
    return n;
  };

  function refPoints(p, points) {
    if (points && !Array.isArray(points)) {
      if (points.x != null && okX(p, points.x)) { var X = p.x(points.x); return [[X, -2], [X, p.height + 2]]; }
      if (points.y != null && okY(p, points.y)) { var Y = p.y(points.y); return [[-2, Y], [p.width + 2, Y]]; }
      return [];
    }
    var out = [];
    (points || []).forEach(function (q) {
      var xv = Array.isArray(q) ? q[0] : q.x, yv = Array.isArray(q) ? q[1] : q.y;
      if (okPoint(p, xv, yv)) out.push([p.x(xv), p.y(yv)]);
    });
    return out;
  }
  var REF_CLASS = { truth: 'ref-truth', limit: 'ref-limit', reader: 'reader-line', pin: 'reader-pin' };
  /** A reference (DS §4.7): a truth (dotted), a limit the text states (dashed 4 4), a level the
      toy computes (dash-dot in the toy's hue), a reader's line or a pinned reader line. */
  C.ref = function (p, points, o) {
    o = o || {};
    var kind = o.kind || 'truth', r = roleOf(o.role || (kind === 'level' ? 'model' : kind === 'reader' || kind === 'pin' ? 'reader' : 'ref'));
    var pts = refPoints(p, points);
    if (pts.length < 2) return null;
    var cls = kind === 'level' ? 'level r-' + r : REF_CLASS[kind] || 'ref-truth';
    if (kind !== 'level' && REF_CLASS[kind] == null) warnOnce('TP.chart.ref: unknown kind "' + kind + '"');
    var path = (o.layer || p.layers.refs).append('path').attr('class', cls).attr('d', pathOf(pts));
    var k = o.key != null ? String(o.key) : null;
    if (k != null) { path.attr('data-key', k); regKey(p, k, { el: path.node(), type: 'line', pts: pts }); }
    /* a running figure's cursor (DS §4.9): the reader's line of series 'cursor', or o.cursor */
    if (kind === 'reader' && (o.cursor || o.series === 'cursor')) path.attr('data-cursor', '');
    var width = kind === 'truth' ? 2.5 : kind === 'level' ? 2 : 1.5;
    var sid = o.series != null ? String(o.series) : kind === 'level' ? 'level:' + r : 'ref:' + kind;
    addObstacle(p, { kind: 'rival', type: 'polyline', geom: flatRuns(pts, -40, p.height + 40), width: width, seriesId: sid });
    if (kind === 'level') {
      p._drawn.push({ kind: 'level', role: r, series: sid, pxPts: pts, data: dataOf(p, pts), ghost: o.ghost !== false });
      seen(p, sid);
    }
    p._lines[sid] = pts;
    return path;
  };
  function dataOf(p, pts) { return pts.map(function (q) { return [p.x.invert(q[0]), p.y.invert(q[1])]; }); }

  /** Name a level on an axis (DS §5.5): its value at the axis in its role's label tone, with the
      regular tick labels within 1 h hidden. line draws its line across the frame as well.
      Returns {name, line, record}: record is the name's entry {node, pos, w, axis, value, role,
      side}, the one kept in the panel's list of axis names, or null. */
  C.level = function (p, axis, value, o) {
    o = o || {};
    var r = roleOf(o.role || 'ref');
    var ok = axis === 'x' ? okX(p, value) : okY(p, value);
    if (!ok) return null;
    var out = { name: null, line: null, record: null };
    if (o.line) {
      var kind = typeof o.line === 'string' ? o.line : r === 'ref' ? 'limit' : r === 'reader' ? 'reader' : 'level';
      out.line = C.ref(p, axis === 'x' ? { x: value } : { y: value }, { kind: kind, role: r === 'ref' ? undefined : r, series: o.series, key: o.key, cursor: o.cursor });
    }
    if (o.text != null && o.text !== '') {
      var n = axisName(p, p.layers.names, axis, value, o.text, r, o);
      if (n) { p._names[axis].push(n); out.name = n.node; out.record = n; }
    }
    return out;
  };

  /** A reader window or a highlight window over [x0, x1] (DS §4.10, §8.1). */
  C.window = function (p, a0, a1, o) {
    o = o || {};
    var kind = o.kind || 'reader', id = String(o.id || o.name || ('window-' + (++uid)));
    var X0 = p.x(Math.min(a0, a1)), X1 = p.x(Math.max(a0, a1));
    if (!finite(X0) || !finite(X1)) return null;
    var C0 = clamp(Math.min(X0, X1), 0, p.width), C1 = clamp(Math.max(X0, X1), 0, p.width);
    var box = { x0: C0, y0: 0, x1: C1, y1: p.height }, out = { id: id, box: box, handles: [] };
    if (C1 - C0 > 0) addRegion(p, id, box);
    if (kind === 'highlight') {
      if (C1 - C0 > 0) p.layers.bands.append('rect').attr('class', 'hi-window').attr('data-window', id)
        .attr('x', fx2(C0)).attr('y', 0).attr('width', fx2(C1 - C0)).attr('height', fx2(p.height));
      [X0, X1].forEach(function (X) {
        if (X < -0.5 || X > p.width + 0.5) return;
        p.layers.refs.append('line').attr('class', 'structure').attr('x1', fx2(X)).attr('x2', fx2(X)).attr('y1', 0).attr('y2', fx2(p.height));
        addObstacle(p, { kind: 'structure', type: 'segment', geom: [[X, 0], [X, p.height]], width: 1 });
      });
      if (C1 - C0 > 0) queueName(p, 'window:' + id, o.name, box, { regionId: id, phone: o.phone, captionNames: o.captionNames, keySentence: o.keySentence });
      return out;
    }
    /* the reader window: two 1.5-px edges, a 4-px bar along the axis, handles, no fill */
    var rv = o.rival ? (o.rival === true ? {} : o.rival) : null;
    var rvSeries = rv ? (rv.series != null ? String(rv.series) : id) : null;
    [X0, X1].forEach(function (X) {
      if (X < -0.5 || X > p.width + 0.5) return;
      p.layers.refs.append('line').attr('class', 'reader-line').attr('x1', fx2(X)).attr('x2', fx2(X)).attr('y1', 0).attr('y2', fx2(p.height));
      addObstacle(p, { kind: 'structure', type: 'segment', geom: [[X, 0], [X, p.height]], width: 1.5 });
      if (!rv) return;
      /* the edge as a rival, less its gaps */
      var spans = [[0, p.height]];
      (rv.gaps || []).forEach(function (g) {
        if (!g || !okX(p, g.x) || !okY(p, g.y) || Math.abs(p.x(g.x) - X) > 0.5) return;
        var Y = p.y(g.y), r = g.px != null ? g.px : 12, next = [];
        spans.forEach(function (sp) {
          if (Y + r <= sp[0] || Y - r >= sp[1]) { next.push(sp); return; }
          if (Y - r > sp[0]) next.push([sp[0], Y - r]);
          if (Y + r < sp[1]) next.push([Y + r, sp[1]]);
        });
        spans = next;
      });
      spans.forEach(function (sp) {
        if (sp[1] - sp[0] > 1) addObstacle(p, { kind: 'rival', type: 'segment', geom: [[X, Math.max(0, sp[0])], [X, Math.min(p.height, sp[1])]], width: 1.5, seriesId: rvSeries });
      });
    });
    if (C1 - C0 > 0) p.layers.marks.append('rect').attr('class', 'window-bar').attr('data-window', id)
      .attr('x', fx2(C0)).attr('y', fx2(p.height - 2)).attr('width', fx2(C1 - C0)).attr('height', 4);
    if (o.name && C1 - C0 > 0) queueName(p, 'window:' + id, o.name, box, { regionId: id, phone: o.phone, captionNames: o.captionNames, keySentence: o.keySentence });
    var mode = o.handles === undefined ? (o.onChange ? 'edges' : false) : o.handles;
    if (!mode) return out;
    var lo = Math.min(a0, a1), hi = Math.max(a0, a1), common = {
      axis: 'x', snap: o.snap, min: o.min, max: o.max, scale: o.scale, format: o.format
    };
    function spec(extra) { var s = {}, k; for (k in common) s[k] = common[k]; for (k in extra) s[k] = extra[k]; return s; }
    var gapOk = function (a, b) {
      if (!(a < b)) return false;
      return !(o.minGap > 0) || (p.opts.xLog ? Math.log(b / a) / Math.LN10 : b - a) >= o.minGap - 1e-12;
    };
    if (mode === 'center') {
      var logx = common.scale === 'log' || (common.scale == null && p.opts.xLog);
      var mid = logx ? Math.sqrt(lo * hi) : (lo + hi) / 2, half = logx ? Math.sqrt(hi / lo) : (hi - lo) / 2;
      var toWin = function (c) { return logx ? [c / half, c * half] : [c - half, c + half]; };
      out.handles.push(C.handle(p, spec({
        id: id + ':center', value: mid, label: o.label || (o.name ? o.name + ', centre' : 'Window centre'),
        onChange: function (v, info) { if (o.onChange) o.onChange(toWin(v), info); },
        onSettle: function (v) { if (o.onSettle) o.onSettle(toWin(v)); }
      })));
      return out;
    }
    var labels = o.labels || ['Lower edge of the window', 'Upper edge of the window'];
    out.handles.push(C.handle(p, spec({
      id: id + ':lo', value: lo, label: labels[0],
      onChange: function (v, info) { if (gapOk(v, hi) && o.onChange) o.onChange([v, hi], info); },
      onSettle: function (v) { if (o.onSettle) o.onSettle(gapOk(v, hi) ? [v, hi] : [lo, hi]); }
    })));
    out.handles.push(C.handle(p, spec({
      id: id + ':hi', value: hi, label: labels[1],
      onChange: function (v, info) { if (gapOk(lo, v) && o.onChange) o.onChange([lo, v], info); },
      onSettle: function (v) { if (o.onSettle) o.onSettle(gapOk(lo, v) ? [lo, v] : [lo, hi]); }
    })));
    return out;
  };

  /** A travelled path in the trail tone (2 px) with the filled marker at its head (DS §4.9). */
  C.trail = function (p, points, o) {
    o = o || {};
    var r = roleOf(o.role), series = seriesOf(o, r);
    var xa = o.x || function (d) { return Array.isArray(d) ? d[0] : d.x; }, ya = o.y || function (d) { return Array.isArray(d) ? d[1] : d.y; };
    var pts = linePoints(p, points, xa, ya, true);
    var out = { path: null, head: null };
    if (pts.length >= 2) {
      out.path = (o.layer || p.layers.series).append('path').attr('class', 'trail r-' + r).attr('d', pathOf(pts)).node();
      addObstacle(p, { kind: 'rival', type: 'polyline', geom: flatRuns(pts, -40, p.height + 40), width: 2, seriesId: series });
      p._lines[series] = pts;
      if (o.key != null && !p._lines[String(o.key)]) p._lines[String(o.key)] = pts;
    }
    if (o.head !== false && pts.length) {
      var q = pts[pts.length - 1];
      var c = p.layers.marks.append('circle').attr('class', 'dot r-' + r).attr('cx', fx2(q[0])).attr('cy', fx2(q[1])).attr('r', 4);
      var k = o.key != null ? String(o.key) : null;
      if (k != null) { c.attr('data-key', k); regKey(p, k, { el: c.node(), type: 'point', X: q[0], Y: q[1], r: 4.75 }); }
      addObstacle(p, { kind: 'rival', type: 'point', geom: { x: q[0], y: q[1], r: 4.75 }, seriesId: series });
      out.head = c.node();
    }
    seen(p, series);
    return out;
  };

  /* ---------- the ghost (DS §4.8) ---------- */

  function copyData(d) {
    if (d.data) return d.data.slice();
    var out = [];
    for (var i = 0; i < d.rows.length; i++) {
      var xv = d.x(d.rows[i], i), yv = d.y(d.rows[i], i);
      if (finite(xv) && finite(yv)) out.push([xv, yv]);
    }
    return out;
  }
  /** Keep the panels' lines and levels as last drawn, drawn dashed under the series until the
      next C.ghost or C.ghost(p, false). With {points: true}, markers stay as hollow context-grey
      markers. Returns the number of series kept. */
  C.ghost = function (target, o) {
    var ps = Array.isArray(target) ? target : [target];
    if (o === false || (o && o.clear)) { ps.forEach(function (p) { if (p) p._ghost = null; }); return 0; }
    o = o || {};
    var n = 0;
    ps.forEach(function (p) {
      if (!p) return;
      var kept = [];
      p._drawn.forEach(function (d) {
        if (!d.ghost) return;
        if (d.kind === 'points' && !o.points) return;
        kept.push({ kind: d.kind, role: d.role, series: d.series, data: copyData(d) });
      });
      p._ghost = kept;
      n += kept.length;
    });
    return n;
  };
  C.ghost.clear = function (target) { return C.ghost(target, false); };
  function drawGhost(p) {
    p._ghost.forEach(function (gs) {
      if (gs.kind === 'points') {
        gs.data.forEach(function (q) {
          if (!okPoint(p, q[0], q[1])) return;
          p.layers.ghosts.append('circle').attr('class', 'open r-context ghost-point')
            .attr('cx', fx2(p.x(q[0]))).attr('cy', fx2(p.y(q[1]))).attr('r', 4.5);
        });
        return;
      }
      var pts = linePoints(p, gs.data, function (q) { return q[0]; }, function (q) { return q[1]; }, true);
      if (pts.length < 2) return;
      p.layers.ghosts.append('path').attr('class', (gs.kind === 'level' ? 'level ghost' : 'ghost') + ' r-' + gs.role).attr('d', pathOf(pts));
      addObstacle(p, { kind: 'rival', type: 'polyline', geom: flatRuns(pts, -40, p.height + 40), width: gs.kind === 'level' ? 2 : 2.5, seriesId: 'ghost:' + gs.series });
    });
  }

  /** Register a mark drawn outside these helpers, in plot px: geom and {kind ('rival'),
      type ('polyline'), series, width, r} as TP.placer's obstacles take them. */
  C.obstacle = function (p, geom, o) {
    o = o || {};
    if (typeof o === 'string') o = { type: o === 'line' ? 'polyline' : o === 'poly' ? 'polygon' : o };
    return addObstacle(p, { kind: o.kind || 'rival', type: o.type || 'polyline', geom: geom, width: o.width, r: o.r, seriesId: o.series, id: o.id });
  };

  /** A break in the x axis at data x: a gap in the baseline crossed by two short strokes. */
  C.axisBreak = function (p, xv) {
    var X = p.x(xv), Y = p.height;
    if (!(X >= 0 && X <= p.width)) return null;
    var gb = p.layers.names.append('g').attr('class', 'axis-break');
    gb.append('rect').attr('x', X - 4).attr('y', Y - 3).attr('width', 8).attr('height', 6).style('fill', 'var(--surface)');
    [-4, 4].forEach(function (dx) {
      gb.append('line').attr('class', 'structure').attr('x1', X + dx - 2.5).attr('y1', Y + 5).attr('x2', X + dx + 2.5).attr('y2', Y - 5);
    });
    return gb;
  };

  /* ============================== labels ============================== */

  function textLines(t) { return Array.isArray(t) ? t.map(String) : [String(t == null ? '' : t)]; }
  function featurePx(p, f) {
    if (!f) return null;
    if (f.px) return f.type === 'region' ? { type: 'region', box: f.box } : f;
    var type = f.type || 'point';
    if (type === 'line') {
      if (f.of != null) {
        var pts = p._lines[String(f.of)];
        return pts && pts.length >= 2 ? { type: 'line', points: pts, width: f.width || 3 } : null;
      }
      var out = [];
      (f.points || []).forEach(function (q) {
        var xv = Array.isArray(q) ? q[0] : q.x, yv = Array.isArray(q) ? q[1] : q.y;
        out.push(okPoint(p, xv, yv) ? [p.x(xv), p.y(yv)] : [NaN, NaN]);
      });
      return out.length >= 2 ? { type: 'line', points: out, width: f.width || 3 } : null;
    }
    if (type === 'region') {
      if (f.of != null) { var b = p._regions[String(f.of)]; return b ? { type: 'region', box: b } : null; }
      var X0 = f.x0 != null && okX(p, f.x0) ? p.x(f.x0) : 0, X1 = f.x1 != null && okX(p, f.x1) ? p.x(f.x1) : p.width;
      var Y0 = f.y1 != null && okY(p, f.y1) ? p.y(f.y1) : 0, Y1 = f.y0 != null && okY(p, f.y0) ? p.y(f.y0) : p.height;
      return { type: 'region', box: { x0: Math.min(X0, X1), y0: Math.min(Y0, Y1), x1: Math.max(X0, X1), y1: Math.max(Y0, Y1) } };
    }
    if (!okPoint(p, f.x, f.y)) return null;
    return { type: type === 'value' ? 'value' : 'point', x: p.x(f.x), y: p.y(f.y), r: f.r != null ? f.r : type === 'value' ? 0 : 5 };
  }
  function toneClass(p, it) {
    if (it.tone === 'ink' || it.names != null || (it.feature && it.feature.type === 'region')) return 'r-context';
    if (it.role === 'context') return 'r-context';
    var many = Object.keys(p._seriesSeen).length > 1;
    if (it.tone === 'role' || (it.tone == null && many)) return 'r-' + roleOf(it.role || 'model');
    return 'r-context';
  }

  /* ---------- callouts beyond 0.5 h (DS §5.10) ----------
     A callout is text with a leader to its feature. The placer places it as a point label within
     0.5 h of its mark. Where that gives no position in the frame (the label would be dropped or
     go to the header), farCallouts tries positions farther out, at 0.75 h to reach h from the
     mark's drawn edge, in the directions of FAR_DIRS (straight up and down first, because a
     callout's feature is often the extreme of a curve), and takes the first where:
       the box lies in the frame and touches no ink, its own series' included;
       no rival lies within 1 h of the box (the 'clear' distance of DS §5.2 item 1);
       the box sits in no region it does not name (item 7);
       the box keeps 0.5 h from annotation lines, from every placed label's box and leader, and
       1 h from every other label's point feature;
       the leader (DS §5.4), from the mark's edge toward the box's centre, crosses no rival, no
       annotation and no label, and arrives at 45 degrees or more to its own series' line through
       the mark.
     The entry takes tier 'leader', position 'far <direction>', candidate -1 and ratio Infinity (the
     leader touches the box; dFeature keeps the distance to the mark). The pass runs on
     every placement, from the state alone, so a settled position does not depend on the frames
     before it. */
  var FAR_GAPS = [0.75, 1, 1.5, 2, 2.5, 3];
  /* the leader's directions, in degrees counter-clockwise from the right, with the box's anchor:
     straight up and down first, then steeper diagonals before 45 degrees, then left and right */
  var FAR_DIRS = [
    [90, 'middle', 'top'], [270, 'middle', 'bottom'], [60, 'start', 'top right'], [120, 'end', 'top left'],
    [240, 'end', 'bottom left'], [300, 'start', 'bottom right'], [45, 'start', 'top right 45'], [135, 'end', 'top left 45'],
    [225, 'end', 'bottom left 45'], [315, 'start', 'bottom right 45'], [0, 'start', 'right'], [180, 'end', 'left']
  ];
  function gPtSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    var t = L > 0 ? clamp(((px - ax) * dx + (py - ay) * dy) / L, 0, 1) : 0;
    var qx = ax + t * dx - px, qy = ay + t * dy - py;
    return Math.sqrt(qx * qx + qy * qy);
  }
  function gSegSeg(ax, ay, bx, by, cx, cy, dx, dy) {
    function o(px, py, qx, qy, rx, ry) { return (qx - px) * (ry - py) - (qy - py) * (rx - px); }
    var d1 = o(cx, cy, dx, dy, ax, ay), d2 = o(cx, cy, dx, dy, bx, by), d3 = o(ax, ay, bx, by, cx, cy), d4 = o(ax, ay, bx, by, dx, dy);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0;
    return Math.min(gPtSeg(ax, ay, cx, cy, dx, dy), gPtSeg(bx, by, cx, cy, dx, dy), gPtSeg(cx, cy, ax, ay, bx, by), gPtSeg(dx, dy, ax, ay, bx, by));
  }
  function gPtBox(px, py, b) {
    var dx = Math.max(b.x0 - px, 0, px - b.x1), dy = Math.max(b.y0 - py, 0, py - b.y1);
    return Math.sqrt(dx * dx + dy * dy);
  }
  function gBoxBox(a, b) {
    var dx = Math.max(a.x0 - b.x1, b.x0 - a.x1, 0), dy = Math.max(a.y0 - b.y1, b.y0 - a.y1, 0);
    return Math.sqrt(dx * dx + dy * dy);
  }
  function gSegBox(ax, ay, bx, by, b) {
    if (gPtBox(ax, ay, b) === 0 || gPtBox(bx, by, b) === 0) return 0;
    var E = [[b.x0, b.y0, b.x1, b.y0], [b.x1, b.y0, b.x1, b.y1], [b.x1, b.y1, b.x0, b.y1], [b.x0, b.y1, b.x0, b.y0]], d = Infinity;
    for (var i = 0; i < 4; i++) d = Math.min(d, gSegSeg(ax, ay, bx, by, E[i][0], E[i][1], E[i][2], E[i][3]));
    return d;
  }
  /* an obstacle's geometry as segments [ax, ay, bx, by], points [x, y, r] and boxes */
  function gPairs(g) {
    var out = [], i;
    if (!g) return out;
    if (Array.isArray(g) && g.length && Array.isArray(g[0])) { for (i = 0; i < g.length; i++) out.push(+g[i][0], +g[i][1]); return out; }
    if (Array.isArray(g)) return g.map(Number);
    return out;
  }
  function gShape(ob) {
    var g = ob.geom, hw = (finite(ob.width) && ob.width > 0 ? ob.width : 0) / 2, sh = { segs: [], pts: [], boxes: [], polys: [], hw: hw }, f, i;
    switch (ob.type) {
      case 'segment':
        f = Array.isArray(g) ? gPairs(g) : g ? [+g.x0, +g.y0, +g.x1, +g.y1] : [];
        if (f.length >= 4) sh.segs.push(f.slice(0, 4));
        break;
      case 'polyline':
        f = gPairs(g);
        for (i = 0; i + 3 < f.length; i += 2) if (finite(f[i]) && finite(f[i + 1]) && finite(f[i + 2]) && finite(f[i + 3])) sh.segs.push([f[i], f[i + 1], f[i + 2], f[i + 3]]);
        break;
      case 'point':
        if (g && finite(g.x) && finite(g.y)) sh.pts.push([+g.x, +g.y, finite(g.r) ? +g.r : finite(ob.r) ? +ob.r : 0]);
        break;
      case 'points':
        f = gPairs(g);
        for (i = 0; i + 1 < f.length; i += 2) if (finite(f[i]) && finite(f[i + 1])) sh.pts.push([f[i], f[i + 1], finite(ob.r) ? +ob.r : 0]);
        break;
      case 'rect':
        if (g) sh.boxes.push(g.w != null ? { x0: +g.x, y0: +g.y, x1: +g.x + +g.w, y1: +g.y + +g.h } : { x0: Math.min(g.x0, g.x1), y0: Math.min(g.y0, g.y1), x1: Math.max(g.x0, g.x1), y1: Math.max(g.y0, g.y1) });
        break;
      case 'polygon':
        f = gPairs(g);
        if (f.length >= 6) sh.polys.push(f);
        break;
    }
    return sh;
  }
  function gInPoly(f, x, y) {
    var inside = false, n = f.length / 2;
    for (var i = 0, j = n - 1; i < n; j = i++) {
      var xi = f[2 * i], yi = f[2 * i + 1], xj = f[2 * j], yj = f[2 * j + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  /* the distance from a box (or, with seg, a segment) to an obstacle's ink */
  function gDist(ob, b, seg) {
    var sh = gShape(ob), d = Infinity, i, q;
    for (i = 0; i < sh.segs.length; i++) {
      q = sh.segs[i];
      d = Math.min(d, (seg ? gSegSeg(seg[0], seg[1], seg[2], seg[3], q[0], q[1], q[2], q[3]) : gSegBox(q[0], q[1], q[2], q[3], b)) - sh.hw);
    }
    for (i = 0; i < sh.pts.length; i++) {
      q = sh.pts[i];
      d = Math.min(d, (seg ? gPtSeg(q[0], q[1], seg[0], seg[1], seg[2], seg[3]) : gPtBox(q[0], q[1], b)) - q[2]);
    }
    for (i = 0; i < sh.boxes.length; i++) d = Math.min(d, (seg ? gSegBox(seg[0], seg[1], seg[2], seg[3], sh.boxes[i]) : gBoxBox(sh.boxes[i], b)) - sh.hw);
    for (i = 0; i < sh.polys.length; i++) {
      var f = sh.polys[i], n = f.length / 2;
      if (seg ? gInPoly(f, seg[0], seg[1]) || gInPoly(f, seg[2], seg[3]) : gInPoly(f, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2) || gPtBox(f[0], f[1], b) === 0) { d = 0; continue; }
      for (var k = 0; k < n; k++) {
        var j = (k + 1) % n;
        d = Math.min(d, (seg ? gSegSeg(seg[0], seg[1], seg[2], seg[3], f[2 * k], f[2 * k + 1], f[2 * j], f[2 * j + 1]) : gSegBox(f[2 * k], f[2 * k + 1], f[2 * j], f[2 * j + 1], b)) - sh.hw);
      }
    }
    return Math.max(0, d);
  }
  function farCallouts(p, list, labels, res, ids) {
    var h = p.h, W = p.width, H = p.height, ix = null;
    list.forEach(function (it, i) {
      var e = res.labels[i], L = labels[i], pf = L.feature;
      /* the far search changes this callout's entry alone, so a caller that reads other ids skips it */
      if (ids && ids.indexOf(it.id) < 0) return;
      if (it.annotation !== 'callout' || !(it.reach > 0.5) || !e || (e.form !== 'dropped' && e.form !== 'header')) return;
      if (!pf || pf.type !== 'point' || !finite(pf.x) || !finite(pf.y) || !inFrame(p, pf.x, pf.y)) return;
      if (!ix) { try { ix = p.index(); } catch (err) { return; } }
      var r = finite(pf.r) ? pf.r : 0, series = it.series, names = it.names;
      var placed = res.labels.filter(function (x, j) { return j !== i && x.box && (x.form === 'full' || x.form === 'phone' || x.form === 'margin'); });
      var others = labels.filter(function (x, j) { return j !== i && x.feature && x.feature.type === 'point' && finite(x.feature.x); }).map(function (x) { return x.feature; });
      /* the own series' segments through the mark, for the leader's angle */
      var through = [];
      ix.query({ x0: pf.x - r - 1, y0: pf.y - r - 1, x1: pf.x + r + 1, y1: pf.y + r + 1 }).forEach(function (ob) {
        if (series == null || ob.seriesId !== series || (ob.kind && ob.kind !== 'rival')) return;
        gShape(ob).segs.forEach(function (q) { if (gPtSeg(pf.x, pf.y, q[0], q[1], q[2], q[3]) <= 0.5) through.push(q); });
      });
      var forms = [{ form: 'full', box: L.box }];
      if (p.phone && L.phone && L.phone.box) forms.push({ form: 'phone', box: L.phone.box });
      var found = null, why = C.explain ? [] : null;
      for (var fi = 0; fi < forms.length && !found; fi++) {
        var w = forms[fi].box.w, bh = forms[fi].box.h;
        for (var gi = 0; gi < FAR_GAPS.length && !found && FAR_GAPS[gi] <= it.reach + 1e-9; gi++) {
          var R = r + FAR_GAPS[gi] * h;
          for (var k = 0; k < FAR_DIRS.length && !found; k++) {
            /* the leader's end, R from the mark's centre in the direction; the box stands on it */
            var D = FAR_DIRS[k], th = D[0] * Math.PI / 180, ux = Math.cos(th), uy = -Math.sin(th);
            var Px = pf.x + R * ux, Py = pf.y + R * uy;
            var x0 = D[1] === 'start' ? Px : D[1] === 'end' ? Px - w : Px - w / 2;
            var y0 = uy < 0 ? Py - bh : Py;
            var b = { x0: x0, y0: y0, x1: x0 + w, y1: y0 + bh };
            var ev = farTry(p, ix, b, pf, r, [Px, Py], series, names, placed, others, through);
            if (ev && !ev.reason) found = { b: b, anchor: D[1], name: D[2], form: forms[fi].form, ev: ev };
            else if (why) why.push({ form: forms[fi].form, gap: FAR_GAPS[gi], position: 'far ' + D[2], reason: ev ? ev.reason : 'none' });
          }
        }
      }
      if (!found) { if (why) e.rejectedFar = why; return; }
      var b0 = found.b, ld = found.ev.lead;
      e.form = found.form; e.x = b0.x0; e.y = b0.y0; e.box = b0; e.anchor = found.anchor;
      e.candidate = -1; e.position = 'far ' + found.name; e.tier = 'leader';
      e.leader = { x1: ld[0], y1: ld[1], x2: ld[2], y2: ld[3] };
      /* The leader joins the box to its mark, so the label's distance to what it names, through its
         leader, is 0 and its ratio Infinity, as the placer reports a label on its region. dFeature
         keeps the distance from the box to the mark, and dRival is at least 1 h. */
      e.dFeature = found.ev.dF; e.dRival = found.ev.dR; e.ratio = Infinity;
      e.reason = null; e.toCaption = false;
      if (found.form === 'phone' && L.phone && L.phone.text) e.text = L.phone.text;
      var fx = res.faults.indexOf(e.id);
      if (fx >= 0) res.faults.splice(fx, 1);
    });
  }
  /* one far candidate: {reason} when it is rejected, else {dF, dR, lead} */
  function farTry(p, ix, b, pf, r, P, series, names, placed, others, through) {
    var h = p.h, EPS = 1e-6;
    if (b.x0 < -EPS || b.y0 < -EPS || b.x1 > p.width + EPS || b.y1 > p.height + EPS) return { reason: 'frame' };
    var dF = Math.max(0, gPtBox(pf.x, pf.y, b) - r), dR = Infinity, bad = null;
    /* the leader, from the box's edge at P to the mark's edge */
    var vx = P[0] - pf.x, vy = P[1] - pf.y, vl = Math.sqrt(vx * vx + vy * vy);
    if (!(vl > 0)) return { reason: 'none' };
    var ex = pf.x + vx / vl * r, ey = pf.y + vy / vl * r, sx = P[0], sy = P[1];
    var lead = [sx, sy, ex, ey];
    /* a leader shorter than a pixel is no leader; the box would lie within reach of the placer */
    if (Math.sqrt((sx - ex) * (sx - ex) + (sy - ey) * (sy - ey)) < 1) return { reason: 'none' };
    var cos45 = Math.cos(Math.PI / 4) + 1e-9;
    for (var t = 0; t < through.length; t++) {
      var q = through[t], ux = q[2] - q[0], uy = q[3] - q[1], ul = Math.sqrt(ux * ux + uy * uy);
      if (ul > 0 && Math.abs(vx * ux + vy * uy) / (vl * ul) > cos45) return { reason: 'angle' };
    }
    var R = h, qb = { x0: Math.min(b.x0, sx, ex) - R, y0: Math.min(b.y0, sy, ey) - R, x1: Math.max(b.x1, sx, ex) + R, y1: Math.max(b.y1, sy, ey) + R };
    ix.query(qb).forEach(function (ob) {
      if (bad) return;
      var kind = ob.kind || 'rival';
      if (kind === 'structure') return;
      if (kind === 'region') {
        if (names != null && ob.id === names) return;
        if (gDist(ob, b) <= 0) bad = 'region';
        return;
      }
      var d = gDist(ob, b);
      if (kind === 'annotation') { if (d < 0.5 * h || gDist(ob, null, lead) <= 0) bad = 'annotation'; return; }
      if (d <= 0) { bad = 'ink'; return; }
      var own = series != null && ob.seriesId === series;
      if (!own) {
        if (d < h) { bad = 'rival'; return; }
        dR = Math.min(dR, d);
        if (gDist(ob, null, lead) <= 0) bad = 'between';
      }
    });
    if (bad) return { reason: bad };
    for (var j = 0; j < placed.length; j++) {
      var pb = placed[j].box;
      if (gBoxBox(pb, b) < 0.5 * h || gSegBox(lead[0], lead[1], lead[2], lead[3], pb) <= 0) return { reason: 'label' };
      var pl = placed[j].leader;
      if (pl && (gSegBox(pl.x1, pl.y1, pl.x2, pl.y2, b) < 0.5 * h || gSegSeg(pl.x1, pl.y1, pl.x2, pl.y2, lead[0], lead[1], lead[2], lead[3]) <= 0)) return { reason: 'label' };
    }
    for (var o = 0; o < others.length; o++) {
      var of = others[o];
      if (gPtBox(of.x, of.y, b) - (of.r || 0) < h) return { reason: 'feature' };
    }
    return { dF: dF, dR: dR, lead: lead };
  }
  /** Place labels (DS §5.2 to §5.6) through TP.placer and draw them. See the API block. */
  /* The placement of C.place without its output: the items and the queued labels pending, against
     the index ix, with previous as the last placement held. It changes nothing in the panel. */
  function placeCompute(p, items, o, pending, ix, previous, ids) {
    /* labels hold while the figure plays, during a transient change or a transition, and when
       asked; they are placed from scratch only on a draw with none of these (a settle, the end of
       autoplay, finish()), so both of those place alike. o may be the draw context itself. */
    var hold = !!(o.hold || o.playing || o.transient || o.transition) || (o.hold == null && C.holding());
    var list = (items || []).map(function (it, i) {
      it = it || {};
      var f = it.feature || {};
      return {
        id: it.id != null ? String(it.id) : 'label-' + i, lines: textLines(it.text), role: it.role != null ? roleOf(it.role) : null,
        series: it.series != null ? String(it.series) : f.of != null ? String(f.of) : it.role != null ? roleOf(it.role) : null,
        feature: f, names: it.names != null ? String(it.names) : null, phone: it.phone || null, captionNames: !!it.captionNames,
        keySentence: !!it.keySentence, tone: it.tone || null, annotation: it.annotation || null, strong: !!it.strong, select: it.select || null
      };
    });
    pending.forEach(function (it) {
      list.push({
        id: it.id, lines: textLines(it.text), role: it.role || null, series: it.series != null ? String(it.series) : null,
        feature: it.feature, names: it.names != null ? String(it.names) : null, phone: it.phone || null,
        captionNames: !!it.captionNames, keySentence: !!it.keySentence, tone: it.tone || null, annotation: it.annotation || null,
        reach: it.reach || 0
      });
    });
    var labels = [];
    list.forEach(function (it) {
      var cls = it.annotation ? 'annotation' : it.strong || (it.select && it.select.pressed) ? 'strong' : 'label';
      var m = C.measureText(it.lines, cls, p);
      it.m = m;
      var L = {
        id: it.id, text: it.lines, box: { w: m.w, h: m.h }, feature: featurePx(p, it.feature), seriesId: it.series,
        names: it.names, captionNames: it.captionNames, keySentence: it.keySentence, phone: null
      };
      if (it.phone && it.phone.header) L.phone = { header: true };
      else if (it.phone && it.phone.text != null) {
        var pl = textLines(it.phone.text), pm = C.measureText(pl, cls, p);
        it.pm = pm; it.plines = pl;
        L.phone = { text: pl, box: { w: pm.w, h: pm.h } };
      }
      labels.push(L);
    });
    var res = TP.placer.place({
      frame: { width: p.width, height: p.height }, h: p.h, labels: labels, index: ix,
      previous: hold ? previous : null, hold: hold, phone: p.phone, nameMargin: p.phone ? 0 : p.nameMargin,
      explain: !!(o.explain || C.explain)
    });
    farCallouts(p, list, labels, res, ids);
    return { list: list, labels: labels, res: res, hold: hold };
  }

  C.place = function (p, items, o) {
    o = o || {};
    if (!TP.placer) { warnOnce('TP.chart.place needs TP.placer (site/js/lib/placer.js)'); return []; }
    /* what C.tryPlace needs to place again as this call places: the obstacles before this call's
       labels, the queued labels and the last placement */
    p._placeBase = { gen: p._gen, n: p.obstacles.length, pending: p._pending.slice(), previous: p._lastPlaced };
    var pending = p._pending.splice(0);
    var ix = p.index();
    var c = placeCompute(p, items, o, pending, ix, p._lastPlaced);
    var list = c.list, res = c.res, hold = c.hold;
    var entries = [];
    res.labels.forEach(function (e, i) {
      var it = list[i], tone = it.annotation ? '' : toneClass(p, it);
      var lines = e.form === 'phone' && it.plines ? it.plines : it.lines, m = e.form === 'phone' && it.pm ? it.pm : it.m;
      var entry = {
        id: e.id, text: lines.map(C.plain).join(' '), form: e.form, x: e.x, y: e.y, box: e.box, anchor: e.anchor,
        position: e.position, tier: e.tier, dFeature: e.dFeature, dRival: e.dRival, ratio: e.ratio, leader: e.leader,
        reason: e.reason, toCaption: !!e.toCaption, fault: res.faults.indexOf(e.id) >= 0, panel: p.key,
        annotation: it.annotation, candidate: e.candidate, tone: tone, captionNames: it.captionNames, keySentence: it.keySentence
      };
      if (e.rejected) entry.rejected = e.rejected;
      if (e.rejectedFar) entry.rejectedFar = e.rejectedFar;
      entries.push(entry);
      if ((e.form === 'full' || e.form === 'phone' || e.form === 'margin') && e.box) {
        var b = e.box, ax = e.anchor === 'middle' ? (b.x0 + b.x1) / 2 : e.anchor === 'end' ? b.x1 : b.x0;
        var t = p.layers.labels.append('text').attr('class', it.annotation ? 'annotation' : 'label ' + tone)
          .attr('text-anchor', e.anchor === 'middle' ? 'middle' : e.anchor === 'end' ? 'end' : 'start')
          .attr('x', fx2(ax)).attr('y', fx2(b.y0 + m.asc)).attr('data-label', e.id);
        C.svgText(t.node(), lines, m.lh);
        entry.node = t.node();
        if (it.select && it.select.pressed) {
          t.style('font-weight', 600);
          p.layers.labels.append('line').attr('class', 'reader-line').style('stroke-width', '3px')
            .attr('x1', fx2(b.x0)).attr('x2', fx2(b.x1)).attr('y1', fx2(b.y1 + 2)).attr('y2', fx2(b.y1 + 2));
        }
        if (e.leader) {
          p.layers.labels.append('line').attr('class', 'leader ' + (it.annotation ? 'r-context' : tone))
            .attr('x1', fx2(e.leader.x1)).attr('y1', fx2(e.leader.y1)).attr('x2', fx2(e.leader.x2)).attr('y2', fx2(e.leader.y2));
        }
        /* a later C.place in the same render keeps clear of this box */
        addObstacle(p, { kind: 'annotation', type: 'rect', geom: { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 } });
      } else if (e.form === 'header') {
        p._headLabels.push({ text: lines.map(C.plain).join(' '), cls: it.annotation ? 'r-context' : tone });
      }
      if (it.select) labelButton(p, entry, it);
    });
    p._placedNow = true;
    p._reportNow = p._reportNow.concat(entries);
    p._report = p._reportNow;
    var byId = {};
    (p._lastPlaced || []).forEach(function (e) { byId[e.id] = e; });
    if (!hold || !p._lastPlaced) byId = {};
    entries.forEach(function (e) { byId[e.id] = e; });
    p._lastPlaced = Object.keys(byId).map(function (k) { return byId[k]; });
    p._density = res.density;
    return entries;
  };

  /* C.tryPlace(p, items, o): the report C.place(p, items, o) would give if the render's last C.place
     had been called with items instead: the same obstacles before its labels, the same queued labels
     and the same last placement. It draws nothing and changes nothing in the panel, so a figure can
     try a label's features against one render instead of rendering again for each (F3.2's search).
     Entries carry id, form, box and fault. Null when no C.place ran in the current render. */
  C.tryPlace = function (p, items, o, ids) {
    o = o || {};
    var base = p._placeBase;
    if (!TP.placer || !base || base.gen !== p._gen) return null;
    var T = p._tryBase;
    if (!T || T.gen !== p._gen || T.n !== base.n || T.w !== p.width || T.h !== p.height) {
      T = p._tryBase = { gen: p._gen, n: base.n, w: p.width, h: p.height, ix: TP.placer.index(p.width, p.height, 16).addAll(p.obstacles.slice(0, base.n)) };
    }
    var saved = p._index, c;
    p._index = T.ix;
    try { c = placeCompute(p, items, o, base.pending, T.ix, base.previous, ids || null); } finally { p._index = saved; }
    return c.res.labels.map(function (e) { return { id: e.id, form: e.form, box: e.box, fault: c.res.faults.indexOf(e.id) >= 0 }; });
  };

  /* A label that selects its series (DS §6.4): an HTML button over the label's box with
     aria-pressed, the label's text as its name and a 44 x 44-px target. */
  function labelButton(p, entry, it) {
    var B = p._labelButtons[it.id];
    if (!B) {
      B = p._labelButtons[it.id] = html('button', 'label-select');
      B.type = 'button';
      B.addEventListener('click', function () { if (B._select && B._select.onPress) B._select.onPress(); });
      p.el.appendChild(B);
    }
    B._seen = true;
    B._select = it.select;
    B.setAttribute('aria-pressed', it.select.pressed ? 'true' : 'false');
    if (B.textContent !== entry.text) B.textContent = entry.text;
    if (!entry.box || entry.form === 'dropped' || entry.form === 'header') { B.hidden = true; B._box = null; return; }
    B.hidden = false;
    B._box = entry.box;
    placeLabelButton(p, B);
  }
  /* the button's 44 x 44-px target centred on its label's box, on the panel's origin */
  function placeLabelButton(p, B) {
    var b = B._box;
    if (!b || B.hidden) return;
    var w = Math.max(44, b.x1 - b.x0 + 4), h = Math.max(44, b.y1 - b.y0 + 4);
    var c = p.toEl((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2);
    B.style.left = (c.left - w / 2) + 'px'; B.style.top = (c.top - h / 2) + 'px';
    B.style.width = w + 'px'; B.style.height = h + 'px';
  }
  function sweepLabelButtons(p) {
    Object.keys(p._labelButtons).forEach(function (k) {
      var B = p._labelButtons[k];
      if (B._seen) return;
      if (B.parentNode) B.parentNode.removeChild(B);
      delete p._labelButtons[k];
    });
  }

  /** The placer's record of every label and annotation text drawn in the latest render. */
  C.labelReport = function (target) {
    return panelsFor(target).reduce(function (all, p) {
      return all.concat(p._report.map(function (e) {
        var c = {}, k;
        for (k in e) if (k !== 'node') c[k] = e[k];
        return c;
      }));
    }, []);
  };

  /* ============================== annotations (DS §5.10) ============================== */

  function inFrame(p, X, Y) { return X >= -0.5 && X <= p.width + 0.5 && Y >= -0.5 && Y <= p.height + 0.5; }
  var CALLOUT_REACH = 3;   // a callout may stand up to 3 h from its mark, with a leader (DS §5.10)
  C.annotation = function (p, o) {
    o = o || {};
    var kind = o.kind, a = o.anchor || {}, id = String(o.id || (kind + '-' + p._annotations.length));
    var rec = { panel: p.key, id: id, kind: kind, text: o.text, anchor: a, drawn: false };
    p._annotations.push(rec);
    var layer = p.layers.annotations, feature = null, pathD = null;
    if (kind === 'bracket') {
      var t = 4, gap = o.gap != null ? o.gap : 6;
      if (a.x0 != null && a.x1 != null) {
        if (!okX(p, a.x0) || !okX(p, a.x1)) return rec;
        var X0 = p.x(Math.min(a.x0, a.x1)), X1 = p.x(Math.max(a.x0, a.x1));
        if (X1 < 0 || X0 > p.width) return rec;
        X0 = clamp(X0, 0, p.width); X1 = clamp(X1, 0, p.width);
        var side = o.side || (a.y == null ? 'below' : 'above'), Y;
        if (a.y == null) Y = p.height - gap;
        else { if (!okY(p, a.y)) return rec; Y = p.y(a.y) + (side === 'above' ? -gap : gap); }
        if (Y < -0.5 || Y > p.height + 0.5) return rec;
        var s = side === 'above' ? 1 : -1;   // ticks turn toward the marks
        pathD = 'M' + fx2(X0) + ',' + fx2(Y + s * t) + 'V' + fx2(Y) + 'H' + fx2(X1) + 'V' + fx2(Y + s * t);
        addObstacle(p, { kind: 'annotation', type: 'polyline', geom: [X0, Y + s * t, X0, Y, X1, Y, X1, Y + s * t], width: 1 });
        feature = { type: 'value', px: true, x: (X0 + X1) / 2, y: Y, r: 1 };
      } else if (a.y0 != null && a.y1 != null && a.x != null) {
        if (!okY(p, a.y0) || !okY(p, a.y1) || !okX(p, a.x)) return rec;
        var Ya = clamp(Math.min(p.y(a.y0), p.y(a.y1)), 0, p.height), Yb = clamp(Math.max(p.y(a.y0), p.y(a.y1)), 0, p.height);
        var sd = o.side || 'right', X = p.x(a.x) + (sd === 'right' ? gap : -gap), sx = sd === 'right' ? -1 : 1;
        if (X < -0.5 || X > p.width + 0.5) return rec;
        pathD = 'M' + fx2(X + sx * t) + ',' + fx2(Ya) + 'H' + fx2(X) + 'V' + fx2(Yb) + 'H' + fx2(X + sx * t);
        addObstacle(p, { kind: 'annotation', type: 'polyline', geom: [X + sx * t, Ya, X, Ya, X, Yb, X + sx * t, Yb], width: 1 });
        feature = { type: 'value', px: true, x: X, y: (Ya + Yb) / 2, r: 1 };
      } else return rec;
    } else if (kind === 'tangent') {
      if (!okPoint(p, a.x, a.y) || !finite(a.slope)) return rec;
      var PX = p.x(a.x), PY = p.y(a.y);
      if (!inFrame(p, PX, PY)) return rec;
      var bx = p.opts.xLog ? (p.opts.xLog === true ? 2 : p.opts.xLog) : 0, by = p.opts.yLog ? (p.opts.yLog === true ? 2 : p.opts.yLog) : 0;
      var x2 = bx ? a.x * bx : a.x + 1, y2 = by ? a.y * Math.pow(by, a.slope) : a.y + a.slope;
      var dx = p.x(x2) - PX, dy = p.y(y2) - PY, L = Math.sqrt(dx * dx + dy * dy);
      if (!(L > 0) || !finite(L)) return rec;
      var len = a.length || 36, ux = dx / L * len, uy = dy / L * len;
      var A = [PX - ux, PY - uy], B = [PX + ux, PY + uy];
      pathD = 'M' + fx2(A[0]) + ',' + fx2(A[1]) + 'L' + fx2(B[0]) + ',' + fx2(B[1]);
      addObstacle(p, { kind: 'annotation', type: 'segment', geom: [A, B], width: 1 });
      feature = { type: 'point', px: true, x: B[0], y: B[1], r: 1 };
    } else if (kind === 'region') {
      if (a.points) {
        var pts = [];
        a.points.forEach(function (q) {
          var xv = Array.isArray(q) ? q[0] : q.x, yv = Array.isArray(q) ? q[1] : q.y;
          if (okPoint(p, xv, yv)) pts.push([p.x(xv), p.y(yv)]);
        });
        if (pts.length < 2 || !pts.some(function (q) { return inFrame(p, q[0], q[1]); })) return rec;
        feature = { type: 'line', px: true, points: pts, width: a.width || 3 };
      } else {
        var f = featurePx(p, { type: 'region', x0: a.x0, x1: a.x1, y0: a.y0, y1: a.y1 });
        if (!f) return rec;
        if (a.y0 == null && a.y1 == null) f.box = { x0: f.box.x0, y0: Math.max(0, p.height - 3 * p.h), x1: f.box.x1, y1: p.height };
        if (f.box.x1 < 0 || f.box.x0 > p.width || f.box.x1 - f.box.x0 < 1) return rec;
        f.box.x0 = clamp(f.box.x0, 0, p.width); f.box.x1 = clamp(f.box.x1, 0, p.width);
        feature = { type: 'region', px: true, box: f.box };
      }
    } else if (kind === 'callout') {
      if (!okPoint(p, a.x, a.y)) return rec;
      var CX = p.x(a.x), CY = p.y(a.y);
      if (!inFrame(p, CX, CY)) return rec;
      feature = { type: 'point', px: true, x: CX, y: CY, r: a.r != null ? a.r : 5 };
    } else {
      warnOnce('TP.chart.annotation: unknown kind "' + kind + '"');
      return rec;
    }
    if (pathD) layer.append('path').attr('class', 'annotation').attr('data-annotation', id).attr('d', pathD);
    rec.drawn = true;
    if (o.text != null && o.text !== '') {
      p._pending.push({
        id: 'annotation:' + id, text: o.text, annotation: kind, feature: feature, series: a.series != null ? String(a.series) : null,
        names: o.names != null ? String(o.names) : null, reach: kind === 'callout' ? (o.reach != null ? +o.reach : CALLOUT_REACH) : 0,
        phone: o.phone, captionNames: o.captionNames, keySentence: o.keySentence
      });
    }
    return rec;
  };
  C.annotationReport = function (target) {
    return panelsFor(target).reduce(function (all, p) {
      return all.concat(p._annotations.map(function (r) { return { panel: r.panel, id: r.id, kind: r.kind, text: r.text, anchor: r.anchor, drawn: r.drawn }; }));
    }, []);
  };

  /* ============================== handles (DS §6.2, §4.10) ============================== */

  var HANDLE_KEYS = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10, Home: 'home', End: 'end' };

  function handleScale(p, H) {
    var s = H.spec, axis = s.axis === 'y' ? 'y' : 'x';
    var log = s.scale === 'log' || (s.scale == null && !!p.opts[axis + 'Log']);
    var dom = (axis === 'x' ? p.x : p.y).domain();
    var lo = s.min != null ? s.min : Math.min(dom[0], dom[1]), hi = s.max != null ? s.max : Math.max(dom[0], dom[1]);
    return { axis: axis, log: log, min: lo, max: hi, sc: axis === 'x' ? p.x : p.y };
  }
  function handleFmt(H, v) {
    var f = H.spec.format;
    return f ? String(f(v)) : C.fmtNum(v);
  }
  function makeHandle(p, id) {
    var el = html('div', 'handle');
    el.setAttribute('role', 'slider');
    el.tabIndex = 0;
    el.setAttribute('data-handle', id);
    p.el.appendChild(el);
    var H = { id: id, el: el, p: p, value: null, spec: {}, seen: true, dragging: false, keyPending: false, band: null, temp: null, block: null };
    H.api = { el: el, id: id, value: function () { return H.value; }, focus: function () { el.focus(); } };

    function change(v) {
      var sc = handleScale(p, H), s = H.spec;
      v = C.snap(v, s.snap, { log: sc.log, min: sc.min, max: sc.max });
      if (!finite(v) || v === H.value) return false;
      H.value = v;
      withHold(function () { if (s.onChange) s.onChange(v, { transient: true }); });
      positionHandle(p, H);
      return true;
    }
    function settle() { if (H.spec.onSettle) H.spec.onSettle(H.value); }
    H.change = change;
    H.settle = settle;

    function valueAtPointer(ev) {
      var sc = handleScale(p, H), r = H.rect, k = r.width > 0 && p.W > 0 ? r.width / p.W : 1;
      var P = sc.axis === 'x' ? (ev.clientX - r.left) / k - p.margin.l - H.grab : (ev.clientY - r.top) / k - p.margin.t - H.grab;
      P = clamp(P, 0, sc.axis === 'x' ? p.width : p.height);
      var v = sc.sc.invert(P);
      return clamp(v, Math.min(sc.min, sc.max), Math.max(sc.min, sc.max));
    }
    function start(ev, target) {
      if (ev.button != null && ev.button > 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      H.dragging = true;
      H.pointerType = ev.pointerType;
      H.rect = p.svg.node().getBoundingClientRect();
      var sc = handleScale(p, H), k = H.rect.width > 0 && p.W > 0 ? H.rect.width / p.W : 1;
      var pos = sc.sc(H.value);
      var ptr = sc.axis === 'x' ? (ev.clientX - H.rect.left) / k - p.margin.l : (ev.clientY - H.rect.top) / k - p.margin.t;
      H.grab = finite(pos) ? ptr - pos : 0;
      try { target.setPointerCapture(ev.pointerId); } catch (e) { /* capture is optional */ }
      el.classList.add('dragging');
      showTemp(p, H);
      if (ev.pointerType === 'touch') showBlock(p, H, ev);
      H.moved = false;
    }
    function move(ev) {
      if (!H.dragging) return;
      ev.preventDefault();
      if (change(valueAtPointer(ev))) H.moved = true;
      if (H.pointerType === 'touch') showBlock(p, H, ev);
    }
    function end() {
      if (!H.dragging) return;
      H.dragging = false;
      el.classList.remove('dragging');
      hideBlock(H);
      if (doc.activeElement !== el) hideTemp(p, H);
      settle();
    }
    function wire(target) {
      target.addEventListener('pointerdown', function (ev) { start(ev, target); });
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', end);
      target.addEventListener('pointercancel', end);
      target.addEventListener('lostpointercapture', end);
    }
    wire(el);
    H.wire = wire;
    el.addEventListener('keydown', function (ev) {
      var dir = HANDLE_KEYS[ev.key];
      if (dir == null) return;
      ev.preventDefault();
      ev.stopPropagation();
      var sc = handleScale(p, H), s = H.spec, v;
      /* step (the arrows) and page (Page Up and Down), in data units or decades on a log scale,
         replace the snap's steps for the keys alone; a drag still snaps to snap */
      var by = typeof dir === 'number' ? (Math.abs(dir) > 1 ? s.page : s.step) : null;
      if (finite(by) && by > 0) {
        v = untr(tr(H.value, sc.log) + (dir > 0 ? by : -by), sc.log);
        v = clamp(v, Math.min(sc.min, sc.max), Math.max(sc.min, sc.max));
      } else v = C.stepValue(H.value, s.snap, dir, { log: sc.log, min: sc.min, max: sc.max });
      change(v);
      H.keyPending = true;
      showTemp(p, H);
    });
    el.addEventListener('keyup', function (ev) {
      if (HANDLE_KEYS[ev.key] == null) return;
      ev.stopPropagation();
      if (H.keyPending) { H.keyPending = false; settle(); }
    });
    el.addEventListener('focus', function () { showTemp(p, H); });
    el.addEventListener('blur', function () {
      if (H.keyPending) { H.keyPending = false; settle(); }
      if (!H.dragging) hideTemp(p, H);
    });
    return H;
  }
  function positionHandle(p, H) {
    var sc = handleScale(p, H), s = H.spec, P = sc.sc(H.value);
    if (!finite(P)) P = 0;
    var X, Y;
    if (sc.axis === 'x') {
      X = clamp(P, 0, p.width);
      Y = s.at != null && okY(p, s.at) ? clamp(p.y(s.at), 0, p.height) : p.height;
    } else {
      Y = clamp(P, 0, p.height);
      X = s.at != null && okX(p, s.at) ? clamp(p.x(s.at), 0, p.width) : 0;
    }
    var c = p.toEl(X, Y), k = p.origin().k;
    H.el.style.left = c.left.toFixed(2) + 'px';
    H.el.style.top = c.top.toFixed(2) + 'px';
    var text = handleFmt(H, H.value);
    H.el.setAttribute('aria-valuenow', String(H.value));
    H.el.setAttribute('aria-valuetext', text);
    if (H.temp) { removeTemp(p, H.temp); H.temp = addTemp(p, sc.axis, H.value, text, 'reader'); }
    if (H.block) H.block.textContent = text;
    if (H.band) {
      var from = s.onLine && s.onLine.from, to = s.onLine && s.onLine.to, b0, b1;
      if (sc.axis === 'x') {
        b0 = to != null && okY(p, to) ? clamp(p.y(to), 0, p.height) : 0; b1 = from != null && okY(p, from) ? clamp(p.y(from), 0, p.height) : p.height;
        var t0 = p.toEl(X, Math.min(b0, b1));
        H.band.style.left = (t0.left - 22) + 'px'; H.band.style.top = t0.top + 'px';
        H.band.style.width = '44px'; H.band.style.height = (Math.abs(b1 - b0) * k) + 'px';
      } else {
        b0 = from != null && okX(p, from) ? clamp(p.x(from), 0, p.width) : 0; b1 = to != null && okX(p, to) ? clamp(p.x(to), 0, p.width) : p.width;
        var t1 = p.toEl(Math.min(b0, b1), Y);
        H.band.style.left = t1.left + 'px'; H.band.style.top = (t1.top - 22) + 'px';
        H.band.style.width = (Math.abs(b1 - b0) * k) + 'px'; H.band.style.height = '44px';
      }
    }
  }
  function showTemp(p, H) {
    if (H.temp) return;
    var sc = handleScale(p, H);
    /* a value the figure already names on the axis is not named twice */
    var P = sc.sc(H.value), named = p._names[sc.axis].some(function (n) { return n.role === 'reader' && Math.abs(sc.sc(n.value) - P) < 0.5; });
    if (named) return;
    H.temp = addTemp(p, sc.axis, H.value, handleFmt(H, H.value), 'reader');
  }
  function hideTemp(p, H) { if (H.temp) { removeTemp(p, H.temp); H.temp = null; } }
  function showBlock(p, H, ev) {
    if (!H.block) { H.block = html('div', 'handle-value'); H.block.setAttribute('aria-hidden', 'true'); p.el.appendChild(H.block); }
    var e = p.el.getBoundingClientRect(), z = zoomOf(p.el);
    H.block.style.left = (ev.clientX - e.left) / z + 'px';
    H.block.style.top = ((ev.clientY - e.top) / z - 44) + 'px';
    H.block.textContent = handleFmt(H, H.value);
  }
  function hideBlock(H) { if (H.block && H.block.parentNode) H.block.parentNode.removeChild(H.block); H.block = null; }

  /* The axis route (WCAG 2.5.7): a click or tap on the axis below (x) or beside (y) the frame
     moves the nearest handle on that axis there and settles. */
  function axisZone(p, axis) {
    var Z = p._axisZones[axis];
    if (!Z) {
      var el = html('div', 'handle-axis');
      el.setAttribute('aria-hidden', 'true');
      p.el.appendChild(el);
      Z = p._axisZones[axis] = { el: el, axis: axis };
      el.addEventListener('click', function (ev) {
        var r = p.svg.node().getBoundingClientRect(), k = r.width > 0 && p.W > 0 ? r.width / p.W : 1;
        var P = axis === 'x' ? (ev.clientX - r.left) / k - p.margin.l : (ev.clientY - r.top) / k - p.margin.t;
        var best = null, bd = Infinity;
        Object.keys(p._handles).forEach(function (id) {
          var H = p._handles[id];
          if (handleScale(p, H).axis !== axis) return;
          var d = Math.abs(handleScale(p, H).sc(H.value) - P);
          if (d < bd) { bd = d; best = H; }
        });
        if (!best) return;
        var sc = handleScale(p, best);
        var v = clamp(sc.sc.invert(clamp(P, 0, axis === 'x' ? p.width : p.height)), Math.min(sc.min, sc.max), Math.max(sc.min, sc.max));
        best.change(v);
        best.settle();
      });
    }
    Z.seen = true;
    var o = p.origin(), k = o.k;
    if (axis === 'x') {
      Z.el.style.left = o.left + 'px'; Z.el.style.top = (o.top + p.height * k + 2) + 'px';
      Z.el.style.width = (p.width * k) + 'px'; Z.el.style.height = Math.max(12, (p.margin.b - 4) * k) + 'px';
    } else {
      Z.el.style.left = Math.max(0, o.left - p.margin.l * k) + 'px'; Z.el.style.top = o.top + 'px';
      Z.el.style.width = Math.max(12, (p.margin.l - 2) * k) + 'px'; Z.el.style.height = (p.height * k) + 'px';
    }
    return Z;
  }

  /** A handle: see the API block. Call it in the draw function on every render. */
  C.handle = function (p, spec) {
    spec = spec || {};
    var id = String(spec.id || spec.label || ('handle-' + Object.keys(p._handles).length));
    var H = p._handles[id];
    if (!H) H = p._handles[id] = makeHandle(p, id);
    H.spec = spec;
    H.seen = true;
    var sc = handleScale(p, H);
    var v = finite(spec.value) ? spec.value : H.value;
    if (finite(v)) H.value = v;
    var el = H.el;
    if (el.getAttribute('aria-label') !== String(spec.label || id)) el.setAttribute('aria-label', String(spec.label || id));
    el.setAttribute('aria-orientation', sc.axis === 'x' ? 'horizontal' : 'vertical');
    el.setAttribute('aria-valuemin', String(Math.min(sc.min, sc.max)));
    el.setAttribute('aria-valuemax', String(Math.max(sc.min, sc.max)));
    if (spec.onLine && !H.band) {
      H.band = html('div', 'handle-band ' + sc.axis);
      H.band.setAttribute('aria-hidden', 'true');
      p.el.insertBefore(H.band, el);
      H.wire(H.band);
    } else if (!spec.onLine && H.band) { H.band.parentNode.removeChild(H.band); H.band = null; }
    positionHandle(p, H);
    axisZone(p, sc.axis);
    return H.api;
  };
  function sweepHandles(p) {
    Object.keys(p._handles).forEach(function (id) {
      var H = p._handles[id];
      if (H.seen) { positionHandle(p, H); return; }
      hideTemp(p, H);
      hideBlock(H);
      if (H.band && H.band.parentNode) H.band.parentNode.removeChild(H.band);
      if (H.el.parentNode) H.el.parentNode.removeChild(H.el);
      delete p._handles[id];
    });
    Object.keys(p._axisZones).forEach(function (axis) {
      var Z = p._axisZones[axis];
      var any = Object.keys(p._handles).some(function (id) { return handleScale(p, p._handles[id]).axis === axis; });
      if (any) { axisZone(p, axis); return; }
      if (Z.el.parentNode) Z.el.parentNode.removeChild(Z.el);
      delete p._axisZones[axis];
    });
  }

  /* ============================== reading (DS §8.3 to §8.5) ============================== */

  var readers = [], docWired = false;
  function wireDoc() {
    if (docWired) return;
    docWired = true;
    /* Escape pressed anywhere hides a tooltip that shows (WCAG 1.4.13); it moves nothing else */
    doc.addEventListener('keydown', function (ev) {
      if (ev.key !== 'Escape') return;
      readers.forEach(function (R) { if (R.shown) R.hide(); });
    });
    /* a tap or press elsewhere hides a tooltip the pointer opened */
    doc.addEventListener('pointerdown', function (ev) {
      readers.forEach(function (R) { if (R.shown && !R.focused && !R.el.contains(ev.target)) R.hide(); });
    }, true);
  }
  function tipRow(tip, roleName, value, label) {
    var row = html('div', 'row');
    if (value != null && value !== '') { var b = html('b'); b.textContent = value; row.appendChild(b); }
    if (roleName) { var key = html('i', 'r-' + roleOf(roleName)); row.appendChild(key); }
    if (label != null && label !== '') row.appendChild(C.html(html('span'), label));
    tip.appendChild(row);
  }
  function plainText(node) {
    if (node.nodeType === 3) return node.data;
    var inner = Array.prototype.map.call(node.childNodes, plainText).join('');
    return node.tagName === 'SUB' ? ' ' + inner : node.tagName === 'SUP' ? '^' + inner : inner;
  }
  /* The tooltip as one sentence: rows joined by "; ", value and name separated by a space. */
  function liveText(tip) {
    return Array.prototype.map.call(tip.childNodes, function (n) {
      return n.classList && n.classList.contains('row')
        ? Array.prototype.map.call(n.childNodes, function (c) { return plainText(c).trim(); }).filter(Boolean).join(' ')
        : plainText(n).trim();
    }).filter(Boolean).join('; ');
  }
  function sortedAsc(vals) {
    for (var i = 1; i < vals.length; i++) if (!(vals[i] >= vals[i - 1])) return false;
    return true;
  }

  function makeReader(p) {
    var el = html('div', 'reader');
    el.setAttribute('role', 'slider');
    el.tabIndex = 0;
    el.setAttribute('aria-valuemin', '1');
    /* the reader comes before the handles: a sibling of them, after the SVG */
    var firstHandle = p.el.querySelector(':scope > .handle, :scope > .handle-band');
    p.el.insertBefore(el, firstHandle || null);
    var tip = html('div', 'tip');
    tip.setAttribute('aria-hidden', 'true');
    tip.style.display = 'none';
    p.el.appendChild(tip);
    var live = html('p', 'sr-only');
    live.setAttribute('aria-live', 'polite');
    p.el.appendChild(live);
    var hl = p.layers.hover;
    var R = {
      p: p, el: el, tip: tip, live: live, mode: null, o: {}, idx: -1, shown: false, focused: false, pressing: false,
      cross: hl.append('line').attr('class', 'crosshair').style('display', 'none').node(),
      dots: hl.append('g').attr('class', 'reader-dots').node(),
      ring: hl.append('circle').attr('class', 'hi-ring').attr('r', 14).style('display', 'none').node(),
      linkCross: hl.append('line').attr('class', 'crosshair').style('display', 'none').node(),
      linkDots: hl.append('g').attr('class', 'reader-dots').node(),
      temp: null, linkTemp: null
    };
    readers.push(R);
    wireDoc();

    function values() { var v = R.o.xValues; return typeof v === 'function' ? v() : (v || []); }
    function points() { var v = R.o.points; return typeof v === 'function' ? v() : (v || []); }
    R.count = function () { return R.mode === 'point' ? points().length : values().length; };
    function localPos(ev) {
      var r = p.svg.node().getBoundingClientRect(), k = r.width > 0 && p.W > 0 ? r.width / p.W : 1;
      return [(ev.clientX - r.left) / k - p.margin.l, (ev.clientY - r.top) / k - p.margin.t];
    }
    function nearestX(X) {
      var vals = values(), n = vals.length;
      if (!n) return -1;
      if (vals !== R._sortedFor) { R._sortedFor = vals; R._sorted = sortedAsc(vals); }
      if (R._sorted) {
        var lo = 0, hi = n - 1;
        while (lo < hi) { var mid = (lo + hi) >> 1; if (p.x(vals[mid]) < X) lo = mid + 1; else hi = mid; }
        if (lo > 0 && Math.abs(p.x(vals[lo - 1]) - X) <= Math.abs(p.x(vals[lo]) - X)) lo--;
        return lo;
      }
      var bi = 0, bd = Infinity;
      vals.forEach(function (v, i) { var d = Math.abs(p.x(v) - X); if (d < bd) { bd = d; bi = i; } });
      return bi;
    }
    function nearestPoint(P) {
      var list = points(), bi = -1, bd = 40 * 40;
      list.forEach(function (q, i) {
        if (!okPoint(p, q.x, q.y)) return;
        var dx = p.x(q.x) - P[0], dy = p.y(q.y) - P[1], d = dx * dx + dy * dy;
        if (d < bd) { bd = d; bi = i; }
      });
      return bi;
    }
    R.nearest = function (ev) {
      var P = localPos(ev);
      return R.mode === 'point' ? nearestPoint(P) : nearestX(P[0]);
    };
    function clearMarks() {
      R.cross.style.display = 'none';
      R.ring.style.display = 'none';
      while (R.dots.firstChild) R.dots.removeChild(R.dots.firstChild);
      if (R.temp) { removeTemp(p, R.temp); R.temp = null; }
    }
    function seriesDots(layer, xv, X) {
      var dom = p.y.domain(), lo = Math.min(dom[0], dom[1]), hi = Math.max(dom[0], dom[1]), rows = [];
      (R.o.series || []).forEach(function (s) {
        if (s.show && !s.show()) return;
        var v = s.y(xv);
        if (v == null || !finite(v)) return;
        rows.push({ s: s, v: v });
        if (s.dot === false || v < lo || v > hi || !okY(p, v)) return;
        var c = svgEl('circle', 'dot r-' + roleOf(s.role));
        c.setAttribute('cx', fx2(X)); c.setAttribute('cy', fx2(p.y(v))); c.setAttribute('r', 4);
        layer.appendChild(c);
      });
      return rows;
    }
    function fillTip(headText, rows, lines) {
      tip.textContent = '';
      if (headText != null && headText !== '') tip.appendChild(C.html(html('div', 'head'), headText));
      rows.forEach(function (r) { tipRow(tip, r.role, r.value, r.label); });
      (lines || []).forEach(function (l) { tipRow(tip, null, null, l); });
    }
    /** Show reading i. announce writes the live region (keyboard); pointer moves do not. source
        says what moved the reading: 'key', 'pointer', 'focus', or 'program' (a redraw or the
        returned show). */
    R.show = function (i, announce, source) {
      var n = R.count();
      if (!n) return;
      R.idx = clamp(i, 0, n - 1);
      clearMarks();
      var info;
      if (R.mode === 'point') {
        var q = points()[R.idx];
        if (!okPoint(p, q.x, q.y)) return;
        var X = p.x(q.x), Y = p.y(q.y);
        R.ring.setAttribute('cx', fx2(X)); R.ring.setAttribute('cy', fx2(Y));
        R.ring.setAttribute('data-hi-key', q.key != null ? String(q.key) : '');
        R.ring.style.display = '';
        fillTip(q.head, (q.rows || []).map(function (r) { return { role: r.role, value: r.value, label: r.label }; }), q.lines);
        placeTip(R, X, Y);
        info = { point: q, key: q.key != null ? String(q.key) : null };
      } else {
        var xv = values()[R.idx], XX = p.x(xv);
        R.cross.setAttribute('x1', fx2(XX)); R.cross.setAttribute('x2', fx2(XX));
        R.cross.setAttribute('y1', 0); R.cross.setAttribute('y2', fx2(p.height));
        R.cross.style.display = '';
        var rows = seriesDots(R.dots, xv, XX);
        fillTip(R.o.format ? R.o.format(xv) : String(xv), rows.map(function (r) {
          return { role: r.s.role, value: r.s.fmt ? r.s.fmt(r.v, xv) : TP.fmt ? TP.fmt.sig(r.v, 3) : String(r.v), label: typeof r.s.label === 'function' ? r.s.label() : r.s.label };
        }), R.o.extra ? R.o.extra(xv) : null);
        R.temp = addTemp(p, 'x', xv, R.o.tick ? R.o.tick(xv) : (p.opts.xFormat || C.fmtNum)(xv), 'ref');
        placeTip(R, XX, null);
        info = { value: xv };
      }
      R.shown = true;
      el.setAttribute('aria-valuemax', String(n));
      el.setAttribute('aria-valuenow', String(R.idx + 1));
      var text = liveText(tip);
      el.setAttribute('aria-valuetext', text);
      if (announce && live.textContent !== text) live.textContent = text;
      notifyLinks(p, info);
      if (R.o.onRead) R.o.onRead(R.mode === 'point' ? info.point : info.value, R.idx, { source: source || 'program' });
    };
    R.hide = function (source) {
      var was = R.shown;
      R.shown = false;
      clearMarks();
      tip.style.display = 'none';
      if (was) {
        notifyLinks(p, null);
        if (R.o.onRead) R.o.onRead(null, -1, { source: typeof source === 'string' ? source : 'program' });
      }
    };
    /* the crosshair and dots of a reading in a linked panel that shares the axis */
    R.showLinked = function (value) {
      R.hideLinked();
      if (!okX(p, value)) return;
      var X = p.x(value);
      if (X < -0.5 || X > p.width + 0.5) return;
      R.linkCross.setAttribute('x1', fx2(X)); R.linkCross.setAttribute('x2', fx2(X));
      R.linkCross.setAttribute('y1', 0); R.linkCross.setAttribute('y2', fx2(p.height));
      R.linkCross.style.display = '';
      if (R.mode === 'hover') seriesDots(R.linkDots, value, X);
    };
    R.hideLinked = function () {
      R.linkCross.style.display = 'none';
      while (R.linkDots.firstChild) R.linkDots.removeChild(R.linkDots.firstChild);
    };
    R.refresh = function () {
      var o = p.origin();
      el.style.left = o.left + 'px'; el.style.top = o.top + 'px';
      el.style.width = (p.width * o.k) + 'px'; el.style.height = (p.height * o.k) + 'px';
      var name = R.o.label || (p.letter ? 'Reading of ' + p.letter : 'Reading') + ' by ' + (R.o.by || (R.mode === 'point' ? 'point' : (typeof p.opts.xLabel === 'string' ? C.plain(p.opts.xLabel) : 'value')));
      if (el.getAttribute('aria-label') !== name) el.setAttribute('aria-label', name);
      el.setAttribute('aria-valuemax', String(Math.max(1, R.count())));
      if (!el.hasAttribute('aria-valuenow')) el.setAttribute('aria-valuenow', '1');
      if (R.shown) R.show(R.idx, false, 'program');
    };

    el.addEventListener('pointerdown', function (ev) {
      if (ev.button != null && ev.button > 0) return;
      var i = R.nearest(ev);
      if (R.o.press && R.mode === 'hover' && i >= 0) {
        R.pressing = true;
        try { el.setPointerCapture(ev.pointerId); } catch (e) { /* optional */ }
        R.show(i, false, 'pointer');
        R.o.press(values()[i], 'start');
        return;
      }
      if (i >= 0) R.show(i, false, 'pointer');
      else if (!R.focused) R.hide('pointer');
    });
    el.addEventListener('pointermove', function (ev) {
      if (R.pressing) {
        var j = R.nearest(ev);
        if (j >= 0 && j !== R.idx) { R.show(j, false, 'pointer'); R.o.press(values()[j], 'move'); }
        return;
      }
      if (ev.pointerType === 'touch' && !ev.buttons) return;
      var i = R.nearest(ev);
      if (i >= 0) { if (i !== R.idx || !R.shown) R.show(i, false, 'pointer'); }
      else if (!R.focused && R.shown) R.hide('pointer');
    });
    function endPress() {
      if (!R.pressing) return;
      R.pressing = false;
      if (R.o.press) R.o.press(values()[R.idx], 'end');
    }
    el.addEventListener('pointerup', endPress);
    el.addEventListener('pointercancel', endPress);
    el.addEventListener('pointerleave', function (ev) { if (ev.pointerType === 'mouse' && !R.focused && !R.pressing) R.hide('pointer'); });
    el.addEventListener('click', function (ev) {
      if (R.mode !== 'point' || !R.o.select) return;
      var i = R.nearest(ev);
      if (i >= 0) R.o.select(i, points()[i]);
    });
    el.addEventListener('focus', function () {
      R.focused = true;
      var s = typeof R.o.startIndex === 'function' ? R.o.startIndex() : R.o.startIndex;
      var i = s != null && s >= 0 ? s : R.idx >= 0 ? R.idx : R.mode === 'point' ? 0 : Math.floor(R.count() / 2);
      R.show(i, true, 'focus');
    });
    el.addEventListener('blur', function () { R.focused = false; R.hide('focus'); });
    el.addEventListener('keydown', function (ev) {
      var n = R.count(), k = ev.key, i = R.idx < 0 ? 0 : R.idx, page = Math.max(1, Math.round(n / 20));
      if (k === 'ArrowRight' || k === 'ArrowUp') i++;
      else if (k === 'ArrowLeft' || k === 'ArrowDown') i--;
      else if (k === 'PageUp') i += page;
      else if (k === 'PageDown') i -= page;
      else if (k === 'Home') i = 0;
      else if (k === 'End') i = n - 1;
      else if (k === 'Escape') { R.hide('key'); return; }
      else if ((k === 'Enter' || k === ' ') && R.mode === 'point' && R.o.select) {
        ev.preventDefault();
        if (R.idx >= 0) R.o.select(R.idx, points()[R.idx]);
        return;
      } else return;
      ev.preventDefault();
      R.show(i, true, 'key');
    });
    return R;
  }
  /* The tooltip on the side with more empty ground, clear of the hovered mark and its label
     (DS §8.4): each candidate is scored by the obstacles and label boxes it covers. */
  function placeTip(R, X, Y) {
    var p = R.p, tip = R.tip;
    tip.style.display = 'block';
    tip.style.left = '0px'; tip.style.top = '0px';
    var o = p.origin(), k = o.k || 1, tw = tip.offsetWidth / k, th = tip.offsetHeight / k, g = 14;
    var cands = Y == null
      ? [[X + g, 4], [X - g - tw, 4]]
      : [[X + g, Y - g - th], [X - g - tw, Y - g - th], [X + g, Y + g], [X - g - tw, Y + g]];
    var ix = null;
    try { ix = p.index(); } catch (e) { ix = null; }
    var labels = p._report || [], panelW = p.panelW || p.el.clientWidth || (p.W || 0);
    var best = null;
    cands.forEach(function (c, ci) {
      var b = { x0: c[0], y0: c[1], x1: c[0] + tw, y1: c[1] + th }, score = 0;
      if (ix) ix.query(b).forEach(function (ob) { if (ob.kind === 'rival' || ob.kind == null) score += 1; });
      labels.forEach(function (e) {
        if (!e.box) return;
        var hit = e.box.x0 < b.x1 && e.box.x1 > b.x0 && e.box.y0 < b.y1 && e.box.y1 > b.y0;
        if (!hit) return;
        var own = Y != null && e.box && Math.abs((e.box.x0 + e.box.x1) / 2 - X) < 60 && Math.abs((e.box.y0 + e.box.y1) / 2 - Y) < 30;
        score += own ? 100 : 5;
      });
      var left = o.left + b.x0 * k;
      if (left < 0 || left + tw * k > panelW) score += 50;
      var room = Y == null ? (ci === 0 ? p.width - X : X) : 0;
      if (!best || score < best.score || (score === best.score && room > best.room)) best = { score: score, b: b, room: room };
    });
    var L = clamp(o.left + best.b.x0 * k, 0, Math.max(0, panelW - tw * k));
    var T = Math.max(0, o.top + best.b.y0 * k);
    tip.style.left = L.toFixed(1) + 'px';
    tip.style.top = T.toFixed(1) + 'px';
  }

  function ensureReader(p, mode, o) {
    var R = p._reader || (p._reader = makeReader(p));
    if (R.mode && R.mode !== mode && R.shown) R.hide();
    R.mode = mode;
    R.o = o || {};
    R.refresh();
    return {
      el: R.el, show: function (i) { R.show(i, false, 'program'); }, hide: function () { R.hide('program'); }, index: function () { return R.idx; },
      refresh: R.refresh
    };
  }
  /** Read curves by x value (DS §8.3): crosshair, a temporary tick in text ink, each series'
      marker and the tooltip. See the API block. */
  C.hover = function (p, o) { return ensureReader(p, 'hover', o); };
  /** Read points: the nearest point within 40 px takes the 28-px highlight ring and the tooltip. */
  C.pointHover = function (p, o) { return ensureReader(p, 'point', o); };

  /* ============================== linking (DS §8.1, §8.2) ============================== */

  function notifyLinks(p, info) {
    p._links.forEach(function (G) {
      if (!info) { G.clear(); return; }
      var k = info.key != null ? info.key : null;
      if (G.key) k = C.keyOf(G.key(info.value, info.point), null, 0);
      else if (k == null && info.value != null) k = String(info.value);
      G._show({ source: p, value: info.value, key: k });
    });
  }
  function cssKey(k) { return global.CSS && global.CSS.escape ? global.CSS.escape(k) : String(k).replace(/["\\]/g, '\\$&'); }
  C.link = function (panels, o) {
    o = o || {};
    var G = { panels: (panels || []).filter(Boolean), axis: o.axis || null, key: o.key || null, grey: o.grey !== false, _current: null, _marks: new Map() };
    function clearPanel(q) {
      var list = G._marks.get(q) || [];
      list.forEach(function (m) {
        if (m.node && m.node.parentNode) m.node.parentNode.removeChild(m.node);
        if (m.el) {
          m.el.classList.remove('is-hi');
          if (m.alpha != null) m.el.style.strokeOpacity = m.alpha;
          if (m.weight != null) m.el.style.strokeWidth = m.weight;
        }
      });
      G._marks.set(q, []);
      q.el.classList.remove('has-hi');
      if (q._reader) q._reader.hideLinked();
      if (q._linkCross && q._linkCross.parentNode) { q._linkCross.parentNode.removeChild(q._linkCross); q._linkCross = null; }
    }
    G._apply = function (q) {
      clearPanel(q);
      var cur = G._current;
      if (!cur) return;
      var marks = G._marks.get(q), entries = cur.key != null ? q._keyed[cur.key] || [] : [];
      if (entries.length && G.grey) q.el.classList.add('has-hi');
      entries.forEach(function (e) {
        if (e.el) {
          e.el.classList.add('is-hi');
          var rec = { el: e.el, alpha: null, weight: null };
          var a = e.el.getAttribute('data-alpha');
          if (a != null) { rec.alpha = a; e.el.style.strokeOpacity = '1'; }
          /* an ensemble member drawn at 1.5 px takes the highlighted weight of its class */
          if (e.type === 'line' && e.el.style.strokeWidth) { rec.weight = e.el.style.strokeWidth; e.el.style.strokeWidth = ''; }
          marks.push(rec);
          if (e.type === 'line' && e.el.parentNode) {
            /* the highlighted line over a surface casing 4 px wider, above its family */
            var casing = e.el.cloneNode(false);
            casing.setAttribute('class', 'casing line');
            casing.removeAttribute('data-key');
            casing.removeAttribute('style');
            var parent = e.el.parentNode;
            parent.appendChild(casing);
            parent.appendChild(e.el);
            marks.push({ node: casing });
          }
        }
        if (e.type === 'point' && !(q === cur.source && q._reader && q._reader.mode === 'point')) {
          var ring = svgEl('circle', 'hi-ring');
          ring.setAttribute('cx', fx2(e.X)); ring.setAttribute('cy', fx2(e.Y)); ring.setAttribute('r', 14);
          ring.setAttribute('data-hi-key', cur.key);
          q.layers.hover.node().appendChild(ring);
          marks.push({ node: ring });
        }
      });
      if (G.axis && cur.value != null && q !== cur.source) {
        if (q._reader) q._reader.showLinked(cur.value);
        else if (G.axis === 'x' && okX(q, cur.value)) {
          var X = q.x(cur.value);
          if (X >= -0.5 && X <= q.width + 0.5) {
            var ln = svgEl('line', 'crosshair');
            ln.setAttribute('x1', fx2(X)); ln.setAttribute('x2', fx2(X)); ln.setAttribute('y1', 0); ln.setAttribute('y2', fx2(q.height));
            q.layers.hover.node().appendChild(ln);
            q._linkCross = ln;
          }
        }
      }
    };
    G._show = function (cur) {
      G._current = cur;
      G.panels.forEach(function (q) { G._apply(q); });
    };
    G.clear = function () {
      G._current = null;
      G.panels.forEach(clearPanel);
    };
    /** Highlight the item with this key in every linked panel, as a reading would. */
    G.highlight = function (k, source) {
      if (k == null) { G.clear(); return; }
      G._show({ source: source || null, value: null, key: String(k) });
    };
    G.current = function () { return G._current ? G._current.key : null; };
    G.selector = function (k) { return '[data-key="' + cssKey(k) + '"]'; };
    G.panels.forEach(function (q) { q._links.push(G); G._marks.set(q, []); });
    if (G.axis) G.panels.forEach(function (q) { if (q.W) q.render(); });
    return G;
  };

  /* ============================== colour bar and keys ============================== */

  /** The ramp's key in SVG (DS §2.4, §5.1). A panel target draws it right of the frame. */
  C.colorbar = function (target, spec) {
    spec = spec || {};
    var r = spec.role || 'model', dom = spec.domain || [0, 1], log = !!spec.log, n = spec.steps || 32;
    var isPanel = target && target.el && target.svg, p = isPanel ? target : null;
    var thick = spec.thickness || 10, len, host, ox, oy;
    if (isPanel) {
      len = spec.length || p.height;
      host = p.layers.keys.append('g').attr('class', 'colorbar');
      ox = spec.x != null ? spec.x : p.width + (spec.gap != null ? spec.gap : 14);
      oy = spec.y != null ? spec.y : 0;
    } else {
      len = spec.length || 120;
      var s = d3.select(target).append('svg').attr('aria-hidden', 'true').attr('focusable', 'false').attr('class', 'colorbar-svg');
      s.attr('width', thick + 70).attr('height', len + 20).attr('viewBox', '0 0 ' + (thick + 70) + ' ' + (len + 20));
      host = s.append('g').attr('class', 'colorbar');
      ox = 2; oy = 10;
    }
    host.attr('transform', 'translate(' + ox + ',' + oy + ')');
    var sc = (log ? d3.scaleLog() : d3.scaleLinear()).domain(dom).range([len, 0]);
    function tOf(v) {
      var a = log ? Math.log(v) : v, lo = log ? Math.log(dom[0]) : dom[0], hi = log ? Math.log(dom[1]) : dom[1];
      return clamp((a - lo) / (hi - lo), 0, 1);
    }
    for (var i = 0; i < n; i++) {
      host.append('rect').attr('class', 'colorbar-step').style('fill', C.ramp(r, (i + 0.5) / n))
        .attr('x', 0).attr('y', fx2(len * (1 - (i + 1) / n))).attr('width', thick).attr('height', fx2(len / n + 0.5));
    }
    host.append('rect').attr('class', 'structure').attr('x', 0).attr('y', 0).attr('width', thick).attr('height', len);
    var ticks = spec.ticks || (log ? C.tickValues(dom, null, 10, len, 'y') : sc.ticks(4));
    var fmt = spec.format || C.fmtNum, ax = host.append('g').attr('class', 'axis');
    ticks.forEach(function (v) {
      var Yv = sc(v);
      if (!(Yv >= -0.5 && Yv <= len + 0.5)) return;
      ax.append('line').attr('x1', thick).attr('x2', thick + 4).attr('y1', fx2(Yv)).attr('y2', fx2(Yv));
      ax.append('text').attr('x', thick + 6).attr('y', fx2(Yv)).attr('dy', '0.32em').text(fmt(v));
    });
    if (spec.label) {
      var lt = host.append('text').attr('class', 'axis-label').attr('text-anchor', 'middle')
        .attr('transform', 'translate(' + (thick + 44) + ',' + (len / 2) + ') rotate(90)');
      C.svgText(lt.node(), spec.label);
    }
    return { node: host.node(), t: tOf, scale: sc };
  };

  var KEY_W = 24;
  function keySwatch(gk, e, h) {
    var r = roleOf(e.role || (e.kind === 'truth' || e.kind === 'limit' || e.kind === 'annotation' ? 'ref' : e.kind === 'reader' || e.kind === 'pin' || e.kind === 'handle' ? 'reader' : e.kind === 'context' ? 'context' : 'model'));
    var mid = h / 2, cx = KEY_W / 2, sw = gk.append('g').attr('class', 'key-swatch r-' + r);
    function ln(cls) { sw.append('line').attr('class', cls).attr('x1', 1).attr('x2', KEY_W - 1).attr('y1', fx2(mid)).attr('y2', fx2(mid)); }
    switch (e.kind) {
      case 'line': ln('line'); break;
      case 'context': ln('context'); break;
      case 'ghost': ln('ghost'); break;
      case 'level': ln('level'); break;
      case 'trail': ln('trail'); break;
      case 'truth': ln('ref-truth'); break;
      case 'limit': ln('ref-limit'); break;
      case 'reader': ln('reader-line'); break;
      case 'pin': ln('reader-pin'); break;
      case 'band': sw.append('rect').attr('class', 'band').attr('x', 2).attr('y', fx2(mid - 6)).attr('width', KEY_W - 4).attr('height', 12); break;
      case 'cross': sw.append('path').attr('class', 'cross').attr('d', 'M' + (cx - 4) + ',' + (mid - 4) + 'L' + (cx + 4) + ',' + (mid + 4) + 'M' + (cx - 4) + ',' + (mid + 4) + 'L' + (cx + 4) + ',' + (mid - 4)); break;
      /* a bracket in text ink at structure weight (DS 5.10), 4-px ticks down from its bar */
      case 'annotation': sw.append('path').attr('class', 'annotation').attr('d', 'M1.5,' + fx2(mid + 2.5) + 'V' + fx2(mid - 1.5) + 'H' + (KEY_W - 1.5) + 'V' + fx2(mid + 2.5)); break;
      case 'ring': sw.append('circle').attr('class', 'ring').attr('cx', cx).attr('cy', fx2(mid)).attr('r', 7); break;
      case 'handle':
        sw.append('circle').attr('class', 'dot r-reader').attr('cx', cx).attr('cy', fx2(mid)).attr('r', 7).style('stroke-width', '2px');
        break;
      case 'ramp':
        for (var i = 0; i < 6; i++) sw.append('rect').style('fill', C.ramp('model', (i + 0.5) / 6)).attr('x', 1 + i * (KEY_W - 2) / 6).attr('y', fx2(mid - 5)).attr('width', fx2((KEY_W - 2) / 6 + 0.3)).attr('height', 10);
        break;
      default: {
        var spec = markerSpec(r, { shape: e.kind === 'diamond' ? 'diamond' : e.kind === 'square' ? 'square' : 'circle', fill: e.kind === 'open' || e.kind === 'diamond' || e.kind === 'square' ? (e.fill || 'open') : (e.fill || 'filled') });
        var nd = markerElement(sw, spec, cx, mid);
        nd.setAttribute('class', (spec.fill === 'open' ? 'open' : 'dot') + (spec.shape !== 'circle' ? ' ' + spec.shape : ''));
      }
    }
  }
  /* The drawn width of a key entry's text: the longest line's getComputedTextLength(), read after
     the text is in the document, so that it includes the letter and word spacing in effect when
     the key is drawn (the text-spacing overrides of WCAG 1.4.12, accessibility finding Z8). The
     canvas measurement stands where the text is not rendered (a hidden figure, Node). */
  function drawnTextWidth(node, fallback) {
    var w = 0;
    try {
      var parts = node.querySelectorAll('tspan');
      if (parts.length) Array.prototype.forEach.call(parts, function (t) { w = Math.max(w, t.getComputedTextLength()); });
      else w = node.getComputedTextLength();
    } catch (err) { w = 0; }
    return w > 0 ? w : fallback;
  }
  function layoutKey(gk, entries, type, maxW, layout) {
    gk.selectAll('*').remove();
    var m0 = measureLines(['Hg'], type.label, 400, type, false), h = Math.max(16, m0.asc + m0.desc), x = 0, y = 0, w = 0, rowH = h + 6;
    entries.forEach(function (e) {
      var lines = textLines(e.text), m = measureLines(lines, type.label, 400, type, false);
      /* the entry is drawn first and placed once its text's drawn width is known */
      var it = gk.append('g').attr('class', 'key-item');
      keySwatch(it, e, h);
      var t = it.append('text').attr('class', e.kind === 'annotation' ? 'annotation' : 'label r-context').attr('x', KEY_W + 6).attr('y', fx2((h - m0.asc - m0.desc) / 2 + m0.asc));
      C.svgText(t.node(), lines, m.lh);
      var iw = KEY_W + 6 + drawnTextWidth(t.node(), m.w), ih = Math.max(h, m.h);
      if (layout === 'column') { if (x || y) { y += rowH; } x = 0; }
      else if (x > 0 && x + iw > maxW) { x = 0; y += rowH; }
      it.attr('transform', 'translate(' + fx2(x) + ',' + fx2(y) + ')');
      rowH = Math.max(rowH, ih + 6);
      w = Math.max(w, x + iw);
      x += iw + 18;
    });
    return { w: Math.ceil(w), h: Math.ceil(y + rowH - 6) };
  }
  /** A key for an encoding no axis carries (DS §5.1), in SVG so it prints. See the API block. */
  C.key = function (target, entries, o) {
    o = o || {};
    entries = entries || [];
    if (target && target.el && target.svg) {
      var p = target, gk = p.layers.keys.append('g').attr('class', 'fig-key-svg');
      var sz = layoutKey(gk, entries, typeOf(p), o.maxWidth || p.W, o.layout);
      var X = o.x != null ? o.x : 0, Y = o.y != null ? o.y : -p.margin.t + 2;
      gk.attr('transform', 'translate(' + fx2(X) + ',' + fx2(Y) + ')');
      sz.node = gk.node();
      return sz;
    }
    var fig = typeof target === 'string' ? doc.getElementById(target) : target;
    if (!fig) return null;
    var hostParent = fig.querySelector('.fig-panels') || fig;
    var host = hostParent.querySelector(':scope > .fig-keys');
    if (!host) {
      host = html('div', 'fig-keys');
      hostParent.appendChild(host);
    }
    host.textContent = '';
    var svgK = d3.select(host).append('svg').attr('aria-hidden', 'true').attr('focusable', 'false');
    var g2 = svgK.append('g');
    function lay() {
      var maxW = host.clientWidth || (hostParent.clientWidth || 600);
      var s2 = layoutKey(g2, entries, defaultType(), maxW - 4, o.layout);
      svgK.attr('width', s2.w + 4).attr('height', s2.h + 4).attr('viewBox', '-2 -2 ' + (s2.w + 4) + ' ' + (s2.h + 4));
    }
    lay();
    /* the key is laid out again when its host's width changes; the observer calls the latest
       key's layout, since a later C.key on the same figure replaces the SVG */
    host.__tpKeyLay = lay;
    if (!host.__tpKeyObs) {
      var lastW = host.clientWidth;
      var relay = function () {
        if (Math.abs(host.clientWidth - lastW) < 1) return;
        lastW = host.clientWidth;
        global.requestAnimationFrame(function () { if (host.__tpKeyLay) host.__tpKeyLay(); });
      };
      if (global.ResizeObserver) { host.__tpKeyObs = new global.ResizeObserver(relay); host.__tpKeyObs.observe(host); }
      else { host.__tpKeyObs = true; global.addEventListener('resize', relay); }
    }
    return svgK.node();
  };
})(typeof window !== 'undefined' ? window : globalThis);
