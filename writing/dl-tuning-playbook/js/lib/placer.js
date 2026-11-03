/*
 * placer.js: the label placer's geometry (TP.placer). No DOM; it loads in the browser as a
 * classic script and in Node for node --test, in the pattern of prng.js.
 *
 * It carries out notes/revamp/design-system.md (DS) §5.2 to §5.6 and §5.10 rule 2, as
 * notes/revamp/implementation-plan.md WO-I3 specifies. chart.js measures text, records
 * obstacles and renders the labels. This file decides where each label goes.
 *
 * UNITS. Coordinates are plot pixels: the origin is the top left of the frame (the plot area)
 * and y points down. Every length is in CSS px. h is the text height (14 at 640 px and wider,
 * 13 below), and every rule below is a multiple of h.
 *
 * USE FROM chart.js. A redraw builds an index as it draws, ix = TP.placer.index(p.width,
 * p.height), adding each mark with its kind and seriesId. C.place converts each label's feature
 * to plot px, measures its text and its phone text at the rendered size, and calls place() with
 * previous set to the panel's last result and hold true on the frames of a drag, of play and of
 * a transition. It draws each 'full', 'phone' and 'margin' entry in its box (text-anchor =
 * anchor, baseline at y plus the measured ascent), each leader, and each 'header' entry in the
 * panel header, and keeps the result for C.labelReport. An annotation's line goes in the index
 * as kind 'annotation', and its text is a label whose feature is the annotation's anchor.
 * place() never adds the labels it places to the index.
 *
 * ---------------------------------------------------------------------------------------------
 * THE INDEX
 *
 *   var ix = TP.placer.index(width, height, cell)   // a uniform grid over the frame; cell in px
 *                                                   // (default 16)
 *   ix.add(obstacle)      returns ix, so adds chain
 *   ix.addAll(list)       returns ix
 *   ix.query(box)         the obstacles whose cells meet box, in the order they were added
 *   ix.size()             the number of obstacles
 *   ix.clear()            removes every obstacle
 *
 *   obstacle = {id, seriesId, kind, type, geom, width, r}
 *
 *   kind   'rival'       a mark with a role: series lines and markers, references, limits and
 *                        levels. The default for a missing kind.
 *          'structure'   axes, ticks, gridlines, rugs, the crosshair, window edges. Labels
 *                        ignore it (DS §5.2 item 3).
 *          'annotation'  a bracket, a tangent or a callout's line. No label box may touch it,
 *                        and it is not a rival (DS §5.10 rule 2).
 *          'region'      a band, a tint or a reader window. It captures any label it does not
 *                        name (DS §5.2 item 7). Its id is what a label's `names` refers to.
 *   type and geom
 *          'segment'     [[x0, y0], [x1, y1]] or {x0, y0, x1, y1}
 *          'polyline'    [[x, y], ...] or a flat [x0, y0, x1, y1, ...]; a non-finite point
 *                        breaks the line
 *          'point'       {x, y, r}: a marker, r its drawn radius with its ring
 *          'points'      [[x, y], ...] or flat, every point with the drawn radius obstacle.r
 *          'rect'        {x0, y0, x1, y1} or {x, y, w, h}: a filled rectangle (a bar, a band)
 *          'polygon'     [[x, y], ...], closed: a filled area. An unfilled outline is a polyline
 *   width  the stroke width of a segment, a polyline, or a rect's or polygon's edge (default 0)
 *   seriesId  shared by the marks of one series. A label's own series is never its rival.
 *
 *   Every distance is measured to the drawn ink: half a stroke's width and a point's radius are
 *   subtracted (DS §5.2). Obstacles beyond the grid's width and height are kept in its edge
 *   cells, so a query anywhere, the right margin included, finds everything near the box.
 *
 * ---------------------------------------------------------------------------------------------
 * PLACEMENT
 *
 *   var result = TP.placer.place({
 *     frame: {width, height},        // the plot area. Labels in forms 'full' and 'phone' stay in it
 *     h: 14,                         // text height
 *     labels: [{
 *       id, text,
 *       box: {w, h},                 // the text's box measured at its rendered size (this h is
 *                                    // the box's height, which may hold several lines)
 *       feature: {type: 'point', x, y, r}        // r: the mark's drawn radius, ring included
 *              | {type: 'line', points, width}   // points as for 'polyline'; width: the stroke
 *              | {type: 'value', x, y, r}        // a value printed where the curve takes it;
 *                                                // r (default 0) keeps the box off the curve
 *              | {type: 'region', box},          // the label names the region and sits inside it
 *       seriesId,                    // the label's own series
 *       names,                       // the id of a region the label names, which may hold it
 *       phone: {text, box} | {header: true} | null,  // the phone form of DS §5.6
 *       captionNames: false,         // the caption names this token at every width
 *       keySentence: false           // the caption's key sentence names it
 *     }],
 *     index,                         // a TP.placer.index of the frame's obstacles (not changed)
 *     regions: [{id, box} | {id, poly}],   // capturing regions kept outside the index
 *     previous: null,                // the last result, or {labelId: {candidate, form, tier}}
 *     hold: false,                   // true on the frames of a drag, of play and of a transition
 *     phone: false,                  // the phone layout, below 640 px
 *     nameMargin: 0,                 // width of the right margin reserved for names (DS §11.5)
 *     explain: false                 // true adds each label's rejected candidates to the result
 *   })
 *
 *   result = {
 *     labels: [{                     // one per input label, in input order
 *       id, text,                    // text: what is drawn, the phone text in form 'phone'
 *       form,                        // 'full' | 'phone' | 'margin' | 'header' | 'dropped'
 *       x, y,                        // top left of the box; null for 'header' and 'dropped'
 *       box: {x0, y0, x1, y1},       // the label's box, or null. A margin box lies right of
 *                                    // the frame, x0 > frame.width
 *       anchor,                      // 'start' | 'middle' | 'end': how lines align in the box.
 *                                    // Render with text-anchor = anchor at x0, the centre or x1
 *       candidate, position,         // the candidate's index and name; -1 and null off the frame
 *       tier,                        // 'clear' | 'ratio' | 'leader' | null (see RULES below)
 *       leader,                      // {x1, y1, x2, y2} from the box to the mark's edge, or null
 *       dFeature,                    // px from the box to the named feature's drawn edge
 *       dRival,                      // px from the box to the nearest rival's ink; Infinity if none
 *       ratio,                       // dRival / dFeature; Infinity where dFeature is 0 or no rival
 *       toCaption,                   // true where the label is dropped and the caption names its
 *                                    // token, so the name reaches the reader through the caption
 *       reason,                      // why a label is off the frame, else null: 'no admissible
 *                                    // position', 'feature outside the frame', 'density',
 *                                    // 'dropped to make room', 'no room in the margin',
 *                                    // 'no feature', or the previous reason under hold
 *       rejected                     // with explain: [{form, candidate, position, reason}] for
 *                                    // every candidate tried and not taken; reason is one of
 *                                    // the codes above evaluate(), or an unused tier
 *     }],
 *     density,                       // label box area inside the frame over the frame's area
 *     faults: [labelId],             // labels dropped though the caption does not name them
 *     densityFault                   // true when the boxes still cover more than 12.5 per cent
 *   }
 *   dFeature, dRival and ratio are null for 'header' and 'dropped'.
 *
 * ---------------------------------------------------------------------------------------------
 * RULES (DS §5.2 to §5.6; the multiples of h are in TP.placer.RULES)
 *
 * Candidates (item 4), in order:
 *   point and value  top right, top left, bottom left, bottom right, right, top, left, bottom,
 *                    each 0.2 h from the mark's drawn edge (a corner at 45 degrees)
 *   line             above the line at 15, 30, 50, 70 and 85 per cent of its visible horizontal
 *                    extent, then below at the same five. The box is centred there, kept inside
 *                    the frame, and set exactly 0.5 h from the stroke's edge
 *   region           inside the region, 0.25 h from its edges: top left, top, top right, bottom
 *                    left, bottom, bottom right (DS §8.1 puts a window's name at its top); then
 *                    left and right at mid-height; then the quarter points of the top, bottom,
 *                    left and right edges; then the centre (REGION_AT)
 * A candidate is rejected when it leaves the frame, lies farther than 0.5 h from its feature or
 * on it, touches any series' ink (its own included), touches an annotation's line, sits in a
 * region it does not name, comes within 1 h of another label's feature (item 1, third distance),
 * or when a rival crosses the segment from the box's centre to the feature (item 6). The rest are
 * classed by the three distances and the ratio r = dRival / dFeature (items 1 and 2):
 *   'clear'   no rival within 1 h, so r >= 2 as well. Preferred.
 *   'ratio'   a rival within 1 h but r >= 1.5: admissible, because where the absolute bound and
 *             the ratio disagree the ratio wins (canon, "Nearness is a ratio").
 *   'leader'  1.1 <= r < 1.5, with a leader (DS §5.4) that runs from the feature's point nearest
 *             the box's centre, on the mark's drawn edge, toward that centre, starts where it
 *             leaves the box, crosses no rival, and arrives at 45 degrees or more to the line
 *             it names (the label's line, or its own series' line through a marker). Used only
 *             when no admissible position exists in any form, after every label that has one
 *             is placed.
 * A region's name needs a 'clear' position, since its distance to the region is 0.
 *
 * Order (item 5). The label with the fewest admissible candidates is placed first, ties in input
 * order, and every count is recomputed after each placement. A label takes its first 'clear'
 * candidate in order, else its first 'ratio' one; a leader takes the candidate of highest ratio.
 * Two label boxes keep 0.5 h apart, and no box touches a placed leader.
 *
 * Density (item 8). If the boxes would cover more than 12.5 per cent of the frame, labels take
 * their phone forms, then labels whose token the caption names are dropped (those the key
 * sentence does not name first), until they fit.
 *
 * No admissible position (DS §5.6). The steps are: the full form, the phone form (a header phone
 * form moves the label to the panel header), a leader in either form, then outside the frame. The
 * phone layout runs the same steps, from the full form, with its own h and without the margin. A
 * line's name goes to the right margin at the height its line leaves by, when nameMargin holds
 * it and the layout is not the phone layout. A value goes to the header. Anything else is
 * dropped. In the phone layout, while some label has no admissible position, one label whose
 * token the caption names is dropped (first those the key sentence does not name, the unplaced
 * label itself before others, then the one nearest it) and every label is placed again.
 *
 * Hold. With hold true, a label keeps the form and candidate of `previous` while that candidate,
 * recomputed on the moved feature, stays admissible (a leader position while it stays a leader
 * position), and only the other labels are placed. Dropped and header labels stay so, and there
 * is no dropping. With hold false every label is placed from scratch, and the result depends on
 * the input alone: placement keeps no state between calls and never changes the index.
 */
(function (global) {
  'use strict';
  var TP = global.TP = global.TP || {};

  var RULES = {
    near: 0.5,       // a label sits within 0.5 h of its feature (DS §5.2 item 1)
    rival: 1,        // no rival within 1 h of a 'clear' label (item 1)
    other: 1,        // no other label within 1 h of a label's feature (item 1)
    ratio: 1.5,      // rival distance over feature distance (item 2)
    leader: 1.1,     // leaders between ratios 1.1 and 1.5 (DS §5.4)
    angle: 45,       // a leader arrives at 45 degrees or more to the line it names (DS §5.4)
    pointGap: 0.2,   // gap between a point label's box and its mark's edge (placer's choice)
    labelGap: 0.5,   // least gap between two label boxes (placer's choice)
    regionPad: 0.25, // inset of a region's name from the region's edges (placer's choice)
    density: 0.125   // label boxes cover at most 12.5 per cent of the frame (item 8)
  };
  var EPS = 1e-6;
  var BLOCK = 16;       // segments per block of a label's line (see prepFeature)
  var TT = [0, 1];      // scratch for clipT
  var POINT_NAMES = ['top right', 'top left', 'bottom left', 'bottom right', 'right', 'top', 'left', 'bottom'];
  var LINE_AT = [0.15, 0.3, 0.5, 0.7, 0.85];
  // A region's name: the corners and the mid-edges of the region's part of the frame, then the
  // quarter points along each edge, then the centre (DS §5.2 item 4, §5.10 "A region name").
  // Each is [name, fraction across, fraction down, anchor]; the first six keep version 1's order.
  var REGION_AT = [
    ['top left inside', 0, 0, 'start'], ['top inside', 0.5, 0, 'middle'], ['top right inside', 1, 0, 'end'],
    ['bottom left inside', 0, 1, 'start'], ['bottom inside', 0.5, 1, 'middle'], ['bottom right inside', 1, 1, 'end'],
    ['left inside', 0, 0.5, 'start'], ['right inside', 1, 0.5, 'end'],
    ['top 25% inside', 0.25, 0, 'middle'], ['top 75% inside', 0.75, 0, 'middle'],
    ['bottom 25% inside', 0.25, 1, 'middle'], ['bottom 75% inside', 0.75, 1, 'middle'],
    ['left 25% inside', 0, 0.25, 'start'], ['left 75% inside', 0, 0.75, 'start'],
    ['right 25% inside', 1, 0.25, 'end'], ['right 75% inside', 1, 0.75, 'end'],
    ['centre inside', 0.5, 0.5, 'middle']
  ];
  var REGION_NAMES = REGION_AT.map(function (q) { return q[0]; });

  /* ---------- geometry (all in plot px) ---------- */

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function finite(v) { return typeof v === 'number' && isFinite(v); }

  // Distance from a point to a box [x0, x1] x [y0, y1] (0 inside).
  function ptBox(px, py, x0, y0, x1, y1) {
    var dx = px < x0 ? x0 - px : px > x1 ? px - x1 : 0;
    var dy = py < y0 ? y0 - py : py > y1 ? py - y1 : 0;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Distance from a point to a segment.
  function ptSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, t = 0;
    if (L > 0) {
      t = ((px - ax) * dx + (py - ay) * dy) / L;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
    }
    var qx = ax + t * dx - px, qy = ay + t * dy - py;
    return Math.sqrt(qx * qx + qy * qy);
  }

  // Liang-Barsky: does the segment meet the closed box? With out, the clipped part's parameters
  // are written to out[0] and out[1].
  function clipT(ax, ay, bx, by, x0, y0, x1, y1, out) {
    var t0 = 0, t1 = 1, dx = bx - ax, dy = by - ay, p, q, r;
    for (var k = 0; k < 4; k++) {
      if (k === 0) { p = -dx; q = ax - x0; }
      else if (k === 1) { p = dx; q = x1 - ax; }
      else if (k === 2) { p = -dy; q = ay - y0; }
      else { p = dy; q = y1 - ay; }
      if (p === 0) { if (q < 0) return false; }
      else {
        r = q / p;
        if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
        else { if (r < t0) return false; if (r < t1) t1 = r; }
      }
    }
    if (out) { out[0] = t0; out[1] = t1; }
    return true;
  }

  // Distance from a segment to a box (0 where they meet). Both are convex, so the least distance
  // is from an endpoint to the box or from a corner to the segment.
  function segBox(ax, ay, bx, by, x0, y0, x1, y1) {
    if (clipT(ax, ay, bx, by, x0, y0, x1, y1, null)) return 0;
    var d = Math.min(ptBox(ax, ay, x0, y0, x1, y1), ptBox(bx, by, x0, y0, x1, y1));
    d = Math.min(d, ptSeg(x0, y0, ax, ay, bx, by), ptSeg(x1, y0, ax, ay, bx, by));
    return Math.min(d, ptSeg(x1, y1, ax, ay, bx, by), ptSeg(x0, y1, ax, ay, bx, by));
  }

  function orient(ax, ay, bx, by, cx, cy) { return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); }

  // Distance between two segments (0 where they cross or touch).
  function segSeg(ax, ay, bx, by, cx, cy, dx, dy) {
    var d1 = orient(cx, cy, dx, dy, ax, ay), d2 = orient(cx, cy, dx, dy, bx, by);
    var d3 = orient(ax, ay, bx, by, cx, cy), d4 = orient(ax, ay, bx, by, dx, dy);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return 0;
    return Math.min(ptSeg(ax, ay, cx, cy, dx, dy), ptSeg(bx, by, cx, cy, dx, dy),
      ptSeg(cx, cy, ax, ay, bx, by), ptSeg(dx, dy, ax, ay, bx, by));
  }

  // Distance between two boxes (0 where they meet).
  function boxBox(ax0, ay0, ax1, ay1, bx0, by0, bx1, by1) {
    var dx = Math.max(ax0 - bx1, bx0 - ax1, 0), dy = Math.max(ay0 - by1, by0 - ay1, 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Even-odd test of a point against a polygon given as a flat [x0, y0, x1, y1, ...].
  function inPoly(px, py, P) {
    var inside = false, n = P.length;
    for (var i = 0, j = n - 2; i < n; j = i, i += 2) {
      var xi = P[i], yi = P[i + 1], xj = P[j], yj = P[j + 1];
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  // Distance from a filled polygon to a box (0 where they meet).
  function polyBox(P, x0, y0, x1, y1) {
    var n = P.length, d = Infinity;
    if (inPoly(x0, y0, P) || inPoly(x1, y1, P)) return 0;
    for (var i = 0, j = n - 2; i < n; j = i, i += 2) {
      if (P[i] >= x0 && P[i] <= x1 && P[i + 1] >= y0 && P[i + 1] <= y1) return 0;
      var e = segBox(P[j], P[j + 1], P[i], P[i + 1], x0, y0, x1, y1);
      if (e < d) d = e;
      if (d === 0) return 0;
    }
    return d;
  }

  // Distance from a filled polygon to a segment (0 where they meet).
  function polySeg(P, ax, ay, bx, by) {
    var n = P.length, d = Infinity;
    if (inPoly(ax, ay, P) || inPoly(bx, by, P)) return 0;
    for (var i = 0, j = n - 2; i < n; j = i, i += 2) {
      var e = segSeg(P[j], P[j + 1], P[i], P[i + 1], ax, ay, bx, by);
      if (e < d) d = e;
      if (d === 0) return 0;
    }
    return d;
  }

  // A box from {x0, y0, x1, y1}, {x, y, w, h} or {x, y, width, height}, as a new plain object.
  function normBox(b) {
    if (!b) return null;
    if (finite(b.x0) && finite(b.y0) && finite(b.x1) && finite(b.y1)) {
      return { x0: Math.min(b.x0, b.x1), y0: Math.min(b.y0, b.y1), x1: Math.max(b.x0, b.x1), y1: Math.max(b.y0, b.y1) };
    }
    var w = finite(b.w) ? b.w : b.width, h = finite(b.h) ? b.h : b.height;
    if (finite(b.x) && finite(b.y) && finite(w) && finite(h)) {
      return { x0: Math.min(b.x, b.x + w), y0: Math.min(b.y, b.y + h), x1: Math.max(b.x, b.x + w), y1: Math.max(b.y, b.y + h) };
    }
    return null;
  }

  // Points as a flat array, from [[x, y], ...], [{x, y}, ...] or a flat array; a non-finite
  // coordinate stays NaN, which breaks a line.
  function flatPoints(pts) {
    if (!pts || !pts.length) return [];
    var out = [], i;
    if (typeof pts[0] === 'number') {
      for (i = 0; i + 1 < pts.length; i += 2) out.push(+pts[i], +pts[i + 1]);
      return out;
    }
    for (i = 0; i < pts.length; i++) {
      var q = pts[i];
      if (Array.isArray(q) || (q && typeof q[0] === 'number')) out.push(+q[0], +q[1]);
      else if (q) out.push(+q.x, +q.y);
      else out.push(NaN, NaN);
    }
    return out;
  }

  /* ---------- the index ---------- */

  // Item types. Every obstacle is stored as items: segments (a polyline's pieces, a long segment
  // split so that each piece spans few cells), points, filled rects and filled polygons.
  var SEG = 0, PT = 1, RECT = 2, POLY = 3;
  // Obstacle kinds.
  var RIVAL = 0, STRUCTURE = 1, ANNOTATION = 2, REGION = 3;
  var KINDS = { rival: RIVAL, structure: STRUCTURE, annotation: ANNOTATION, region: REGION };
  var TYPES = { segment: 1, polyline: 1, point: 1, points: 1, rect: 1, polygon: 1 };

  function clampI(v, n) { return v < 0 ? 0 : v >= n ? n - 1 : v; }

  function Index(width, height, cell) {
    this.width = +width > 0 ? +width : 1;
    this.height = +height > 0 ? +height : 1;
    this.cell = +cell > 0 ? +cell : 16;
    this.nx = Math.max(1, Math.ceil(this.width / this.cell));
    this.ny = Math.max(1, Math.ceil(this.height / this.cell));
    this.clear();
  }

  Index.prototype.clear = function () {
    this.cells = new Array(this.nx * this.ny);
    this.obs = [];        // {src, kind, series, id}
    this.aux = [];        // a polygon item's flat vertices
    this.codes = new Map(); // seriesId -> a small integer, so an item's series is one compare
    this.n = 0;
    this.cap = 0;
    this._grow(256);
    this.stamp = 0;
    return this;
  };

  // Empty the index for a new set of obstacles and keep its item arrays at their grown capacity
  // (chart.js reuses one index per panel while the plot's size is unchanged).
  Index.prototype.reset = function () {
    this.cells = new Array(this.nx * this.ny);
    this.obs = [];
    this.aux = [];
    this.codes.clear();
    this.n = 0;
    return this;
  };

  // Per item: type t, geometry a to d, half-width or radius w, obstacle ob, kind kd, series code
  // sr (-1 for none), and the inked bounding box x0 to y1 that prunes exact distances.
  var FIELDS = [['t', Uint8Array], ['a', Float64Array], ['b', Float64Array], ['c', Float64Array],
    ['d', Float64Array], ['w', Float64Array], ['ob', Int32Array], ['kd', Uint8Array], ['sr', Int32Array],
    ['x0', Float64Array], ['y0', Float64Array], ['x1', Float64Array], ['y1', Float64Array]];

  Index.prototype._grow = function (cap) {
    for (var f = 0; f < FIELDS.length; f++) {
      var name = FIELDS[f][0], A = new FIELDS[f][1](cap);
      if (this.cap && this[name]) A.set(this[name].subarray(0, this.n));
      this[name] = A;
    }
    this.seen = new Int32Array(cap);
    this.stamp = 0;
    this.cap = cap;
  };

  // A label's series as this index codes it; -2, which no item carries, for none or unknown.
  Index.prototype._code = function (series) {
    var c = series == null ? undefined : this.codes.get(series);
    return c === undefined ? -2 : c;
  };

  // Store one item and enter it in every cell its inked bounding box meets.
  Index.prototype._item = function (type, a, b, c, d, w, oi, aux) {
    if (this.n === this.cap) this._grow(this.cap * 2);
    var i = this.n++, o = this.obs[oi];
    this.t[i] = type; this.a[i] = a; this.b[i] = b; this.c[i] = c; this.d[i] = d; this.w[i] = w; this.ob[i] = oi;
    this.kd[i] = o.kind; this.sr[i] = o.code;
    if (aux) this.aux[i] = aux;
    var x0, y0, x1, y1;
    if (type === SEG) { x0 = Math.min(a, c) - w; x1 = Math.max(a, c) + w; y0 = Math.min(b, d) - w; y1 = Math.max(b, d) + w; }
    else if (type === PT) { x0 = a - w; x1 = a + w; y0 = b - w; y1 = b + w; }
    else { x0 = a - w; y0 = b - w; x1 = c + w; y1 = d + w; }
    this.x0[i] = x0; this.y0[i] = y0; this.x1[i] = x1; this.y1[i] = y1;
    var cs = this.cell, nx = this.nx, ny = this.ny, cells = this.cells;
    var i0 = clampI(Math.floor(x0 / cs), nx), i1 = clampI(Math.floor(x1 / cs), nx);
    var j0 = clampI(Math.floor(y0 / cs), ny), j1 = clampI(Math.floor(y1 / cs), ny);
    for (var j = j0; j <= j1; j++) {
      for (var k = i0; k <= i1; k++) {
        var ci = j * nx + k;
        if (cells[ci]) cells[ci].push(i); else cells[ci] = [i];
      }
    }
  };

  // A segment, split into pieces no longer than two cells so that a long diagonal does not sit
  // in every cell of its bounding box.
  Index.prototype._seg = function (ax, ay, bx, by, hw, oi) {
    if (!(finite(ax) && finite(ay) && finite(bx) && finite(by))) return;
    var len = Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
    var k = Math.max(1, Math.ceil(len / (2 * this.cell)));
    for (var s = 0; s < k; s++) {
      var t0 = s / k, t1 = (s + 1) / k;
      this._item(SEG, ax + (bx - ax) * t0, ay + (by - ay) * t0, ax + (bx - ax) * t1, ay + (by - ay) * t1, hw, oi, null);
    }
  };

  Index.prototype.add = function (o) {
    if (!o || typeof o !== 'object') throw new TypeError('TP.placer: an obstacle must be an object');
    var kind = o.kind == null ? RIVAL : KINDS[o.kind];
    if (kind === undefined) throw new TypeError('TP.placer: unknown obstacle kind ' + o.kind);
    if (!TYPES[o.type]) throw new TypeError('TP.placer: unknown obstacle type ' + o.type);
    var oi = this.obs.length, g = o.geom, hw = (finite(o.width) && o.width > 0 ? o.width : 0) / 2, i, p, r;
    var code = -1;
    if (o.seriesId != null) {
      code = this.codes.get(o.seriesId);
      if (code === undefined) { code = this.codes.size; this.codes.set(o.seriesId, code); }
    }
    this.obs.push({ src: o, kind: kind, series: o.seriesId, id: o.id, code: code });
    switch (o.type) {
      case 'segment':
        if (Array.isArray(g)) p = flatPoints(g); else p = g ? [+g.x0, +g.y0, +g.x1, +g.y1] : [];
        if (p.length >= 4) this._seg(p[0], p[1], p[2], p[3], hw, oi);
        break;
      case 'polyline':
        p = flatPoints(g);
        for (i = 0; i + 3 < p.length; i += 2) this._seg(p[i], p[i + 1], p[i + 2], p[i + 3], hw, oi);
        break;
      case 'point':
        p = Array.isArray(g) ? [+g[0], +g[1]] : g ? [+g.x, +g.y] : [NaN, NaN];
        r = g && finite(g.r) ? g.r : finite(o.r) ? o.r : 0;
        if (finite(p[0]) && finite(p[1])) this._item(PT, p[0], p[1], 0, 0, Math.max(0, r), oi, null);
        break;
      case 'points':
        p = flatPoints(g);
        r = finite(o.r) ? Math.max(0, o.r) : 0;
        for (i = 0; i + 1 < p.length; i += 2) if (finite(p[i]) && finite(p[i + 1])) this._item(PT, p[i], p[i + 1], 0, 0, r, oi, null);
        break;
      case 'rect':
        p = normBox(g);
        if (p) this._item(RECT, p.x0, p.y0, p.x1, p.y1, hw, oi, null);
        break;
      case 'polygon':
        p = flatPoints(g);
        var q = [], x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (i = 0; i + 1 < p.length; i += 2) {
          if (!finite(p[i]) || !finite(p[i + 1])) continue;
          q.push(p[i], p[i + 1]);
          x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]);
        }
        if (q.length >= 6) this._item(POLY, x0, y0, x1, y1, hw, oi, q);
        break;
      default:
        throw new TypeError('TP.placer: unknown obstacle type ' + o.type);
    }
    return this;
  };

  Index.prototype.addAll = function (list) {
    for (var i = 0; i < (list ? list.length : 0); i++) this.add(list[i]);
    return this;
  };

  Index.prototype.size = function () { return this.obs.length; };

  // The items in the cells a box meets, each once, into out; returns how many.
  Index.prototype._near = function (x0, y0, x1, y1, out) {
    var cs = this.cell, nx = this.nx, ny = this.ny, cells = this.cells, seen = this.seen;
    var i0 = clampI(Math.floor(x0 / cs), nx), i1 = clampI(Math.floor(x1 / cs), nx);
    var j0 = clampI(Math.floor(y0 / cs), ny), j1 = clampI(Math.floor(y1 / cs), ny);
    if (++this.stamp > 2000000000) { seen.fill(0); this.stamp = 1; }
    var st = this.stamp, n = 0;
    for (var j = j0; j <= j1; j++) {
      for (var k = i0; k <= i1; k++) {
        var arr = cells[j * nx + k];
        if (!arr) continue;
        for (var m = 0; m < arr.length; m++) {
          var it = arr[m];
          if (seen[it] !== st) { seen[it] = st; out[n++] = it; }
        }
      }
    }
    return n;
  };

  // True when the cells of the box cover the whole grid, so _near returned every item.
  Index.prototype._covers = function (x0, y0, x1, y1) {
    var cs = this.cell;
    return Math.floor(x0 / cs) <= 0 && Math.floor(y0 / cs) <= 0 &&
      Math.floor(x1 / cs) >= this.nx - 1 && Math.floor(y1 / cs) >= this.ny - 1;
  };

  Index.prototype.query = function (box) {
    var b = normBox(box);
    if (!b) return [];
    var buf = [], n = this._near(b.x0, b.y0, b.x1, b.y1, buf), mark = {}, ids = [];
    for (var i = 0; i < n; i++) {
      var o = this.ob[buf[i]];
      if (!mark[o]) { mark[o] = true; ids.push(o); }
    }
    ids.sort(function (p, q) { return p - q; });
    var obs = this.obs;
    return ids.map(function (o) { return obs[o].src; });
  };

  // A lower bound on the distance from item i's ink to a box: the gap between their boxes.
  Index.prototype._lb = function (i, x0, y0, x1, y1) {
    var dx = Math.max(this.x0[i] - x1, x0 - this.x1[i], 0), dy = Math.max(this.y0[i] - y1, y0 - this.y1[i], 0);
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Distance from item i's ink to a box; 0 or less where they meet.
  Index.prototype._boxDist = function (i, x0, y0, x1, y1) {
    var t = this.t[i], w = this.w[i];
    if (t === SEG) return segBox(this.a[i], this.b[i], this.c[i], this.d[i], x0, y0, x1, y1) - w;
    if (t === PT) return ptBox(this.a[i], this.b[i], x0, y0, x1, y1) - w;
    if (t === RECT) return boxBox(this.a[i], this.b[i], this.c[i], this.d[i], x0, y0, x1, y1) - w;
    return polyBox(this.aux[i], x0, y0, x1, y1) - w;
  };

  // Distance from item i's ink to a segment; 0 or less where they meet.
  Index.prototype._segDist = function (i, ax, ay, bx, by) {
    var t = this.t[i], w = this.w[i];
    if (t === SEG) return segSeg(this.a[i], this.b[i], this.c[i], this.d[i], ax, ay, bx, by) - w;
    if (t === PT) return ptSeg(this.a[i], this.b[i], ax, ay, bx, by) - w;
    if (t === RECT) return segBox(ax, ay, bx, by, this.a[i], this.b[i], this.c[i], this.d[i]) - w;
    return polySeg(this.aux[i], ax, ay, bx, by) - w;
  };

  /* ---------- features ---------- */

  // A label's feature, prepared once per call: a line is clipped to the frame, and a line whose
  // x never decreases (or never increases, reversed) is searched by bisection on x.
  function prepFeature(f, W, H) {
    if (!f || typeof f !== 'object') return null;
    if (f.type === 'point' || f.type === 'value') {
      var x = +f.x, y = +f.y, r = finite(+f.r) && +f.r > 0 ? +f.r : 0;
      if (!finite(x) || !finite(y)) return null;
      return { type: f.type, x: x, y: y, r: r, hw: 0 };
    }
    if (f.type === 'region') {
      var b = normBox(f.box);
      return b ? { type: 'region', box: b, hw: 0 } : null;
    }
    if (f.type !== 'line') return null;
    var p = flatPoints(f.points), hw = (finite(+f.width) && +f.width > 0 ? +f.width : 0) / 2;
    var m = Math.max(0, p.length / 2 - 1), s = new Float64Array(4 * m), n = 0, tt = TT, i;
    for (i = 0; i + 3 < p.length; i += 2) {
      var ax = p[i], ay = p[i + 1], bx = p[i + 2], by = p[i + 3];
      if (!(finite(ax) && finite(ay) && finite(bx) && finite(by))) continue;
      if (!(ax >= 0 && ax <= W && bx >= 0 && bx <= W && ay >= 0 && ay <= H && by >= 0 && by <= H)) {
        if (!clipT(ax, ay, bx, by, 0, 0, W, H, tt)) continue;
        var t0 = tt[0], t1 = tt[1], dx = bx - ax, dy = by - ay;
        bx = ax + dx * t1; by = ay + dy * t1; ax += dx * t0; ay += dy * t0;
      }
      s[4 * n] = ax; s[4 * n + 1] = ay; s[4 * n + 2] = bx; s[4 * n + 3] = by;
      n++;
    }
    if (!n) return { type: 'line', hw: hw, n: 0, s: new Float64Array(0), mono: true, ext0: NaN, ext1: NaN };
    s = s.subarray(0, 4 * n);
    var up = true, down = true;
    for (i = 0; i < n; i++) {
      if (s[4 * i] > s[4 * i + 2] + EPS) up = false;
      if (s[4 * i] < s[4 * i + 2] - EPS) down = false;
      if (i > 0 && s[4 * i - 2] > s[4 * i] + EPS) up = false;
      if (i > 0 && s[4 * i - 2] < s[4 * i] - EPS) down = false;
    }
    if (!up && down) {                 // run right to left: reverse into increasing x
      var rev = new Float64Array(4 * n);
      for (i = 0; i < n; i++) {
        var j = n - 1 - i;
        rev[4 * i] = s[4 * j + 2]; rev[4 * i + 1] = s[4 * j + 3]; rev[4 * i + 2] = s[4 * j]; rev[4 * i + 3] = s[4 * j + 1];
      }
      s = rev;
      up = true;
    }
    // Blocks of BLOCK segments with their bounding boxes, so that whole blocks are skipped.
    var nb = Math.ceil(n / BLOCK), bk = new Float64Array(4 * nb), ext0 = Infinity, ext1 = -Infinity, exitX = -Infinity, exitY = NaN;
    for (var b = 0; b < nb; b++) {
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, end = Math.min(n, (b + 1) * BLOCK);
      for (i = b * BLOCK; i < end; i++) {
        for (var e = 0; e < 4; e += 2) {
          var sx = s[4 * i + e], sy = s[4 * i + e + 1];
          if (sx < x0) x0 = sx;
          if (sx > x1) x1 = sx;
          if (sy < y0) y0 = sy;
          if (sy > y1) y1 = sy;
          if (sx > exitX) { exitX = sx; exitY = sy; }
        }
      }
      bk[4 * b] = x0; bk[4 * b + 1] = y0; bk[4 * b + 2] = x1; bk[4 * b + 3] = y1;
      if (x0 < ext0) ext0 = x0;
      if (x1 > ext1) ext1 = x1;
    }
    return { type: 'line', hw: hw, n: n, s: s, bk: bk, mono: up, ext0: ext0, ext1: ext1, exitX: exitX, exitY: exitY };
  }

  // For a line searched by bisection: the first segment whose right end reaches qa, and the first
  // whose left end passes qb. The segments between meet [qa, qb] in x.
  function rangeLo(pf, qa) {
    if (!pf.mono) return 0;
    var lo = 0, hi = pf.n, s = pf.s;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (s[4 * mid + 2] < qa) lo = mid + 1; else hi = mid; }
    return lo;
  }
  function rangeHi(pf, qb) {
    if (!pf.mono) return pf.n;
    var lo = 0, hi = pf.n, s = pf.s;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (s[4 * mid] <= qb) lo = mid + 1; else hi = mid; }
    return lo;
  }

  var PAIR = [0, 0, 0, 0];

  // Distance between block b's bounding box and a box.
  function blockDist(pf, b, x0, y0, x1, y1) {
    var B = pf.bk;
    return boxBox(B[4 * b], B[4 * b + 1], B[4 * b + 2], B[4 * b + 3], x0, y0, x1, y1);
  }

  // Does the box come within dist of the line's drawn edge? Stops at the first segment that does.
  function lineWithin(pf, x0, y0, x1, y1, dist) {
    var s = pf.s, thr = dist + pf.hw - EPS, lo = rangeLo(pf, x0 - thr), hi = rangeHi(pf, x1 + thr);
    for (var i = lo; i < hi;) {
      var b = (i / BLOCK) | 0, end = Math.min(hi, (b + 1) * BLOCK);
      if (blockDist(pf, b, x0, y0, x1, y1) >= thr) { i = end; continue; }
      for (; i < end; i++) {
        var ax = s[4 * i], ay = s[4 * i + 1], bx = s[4 * i + 2], by = s[4 * i + 3];
        if (boxBox(Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by), x0, y0, x1, y1) >= thr) continue;
        if (segBox(ax, ay, bx, by, x0, y0, x1, y1) < thr) return true;
      }
    }
    return false;
  }

  // The nearest points of a segment and a box that may not meet: writes [sx, sy, bx, by] to out
  // and returns their distance (0 where they meet).
  function segBoxPair(ax, ay, bx, by, x0, y0, x1, y1, out) {
    if (clipT(ax, ay, bx, by, x0, y0, x1, y1, TT)) {
      out[0] = out[2] = ax + (bx - ax) * TT[0];
      out[1] = out[3] = ay + (by - ay) * TT[0];
      return 0;
    }
    var best = Infinity, dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy, qx, qy, d, k;
    qx = clamp(ax, x0, x1); qy = clamp(ay, y0, y1); d = Math.sqrt((ax - qx) * (ax - qx) + (ay - qy) * (ay - qy));
    if (d < best) { best = d; out[0] = ax; out[1] = ay; out[2] = qx; out[3] = qy; }
    qx = clamp(bx, x0, x1); qy = clamp(by, y0, y1); d = Math.sqrt((bx - qx) * (bx - qx) + (by - qy) * (by - qy));
    if (d < best) { best = d; out[0] = bx; out[1] = by; out[2] = qx; out[3] = qy; }
    for (k = 0; k < 4; k++) {
      var cx = k === 0 || k === 3 ? x0 : x1, cy = k < 2 ? y0 : y1;
      var t = L > 0 ? clamp(((cx - ax) * dx + (cy - ay) * dy) / L, 0, 1) : 0;
      var px = ax + t * dx, py = ay + t * dy;
      d = Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
      if (d < best) { best = d; out[0] = px; out[1] = py; out[2] = cx; out[3] = cy; }
    }
    return best;
  }

  // Nearest points of a feature and a box. Sets out.d (distance from the box to the feature's
  // drawn edge; 0 or less where the box covers it), out.bx, out.by (on the box), out.cx, out.cy
  // (the mark's centre, or the centreline's point) and out.fx, out.fy (on the drawn edge). A line
  // is searched no farther than R past the box; out.d is Infinity when nothing lies within R.
  function featureNear(pf, x0, y0, x1, y1, R, out) {
    if (pf.type === 'line') {
      var s = pf.s, best = Infinity, reach = R + pf.hw;
      var lo = rangeLo(pf, x0 - reach), hi = rangeHi(pf, x1 + reach);
      for (var i = lo; i < hi;) {
        var blk = (i / BLOCK) | 0, end = Math.min(hi, (blk + 1) * BLOCK), lbb = blockDist(pf, blk, x0, y0, x1, y1);
        if (lbb >= best || lbb > reach) { i = end; continue; }
        for (; i < end; i++) {
          var ax = s[4 * i], ay = s[4 * i + 1], bx = s[4 * i + 2], by = s[4 * i + 3];
          var lb = boxBox(Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by), x0, y0, x1, y1);
          if (lb >= best || lb > reach) continue;
          var d = segBoxPair(ax, ay, bx, by, x0, y0, x1, y1, PAIR);
          if (d < best) { best = d; out.cx = PAIR[0]; out.cy = PAIR[1]; out.bx = PAIR[2]; out.by = PAIR[3]; }
        }
      }
      if (best === Infinity) { out.d = Infinity; return Infinity; }
      out.d = best - pf.hw;
      toEdge(out, pf.hw);
      return out.d;
    }
    out.cx = pf.x; out.cy = pf.y;
    out.bx = clamp(pf.x, x0, x1); out.by = clamp(pf.y, y0, y1);
    out.d = Math.sqrt((out.bx - pf.x) * (out.bx - pf.x) + (out.by - pf.y) * (out.by - pf.y)) - pf.r;
    toEdge(out, pf.r);
    return out.d;
  }
  function toEdge(out, r) {
    var dx = out.bx - out.cx, dy = out.by - out.cy, L = Math.sqrt(dx * dx + dy * dy);
    if (L > 0 && r > 0) { var k = Math.min(r, L) / L; out.fx = out.cx + dx * k; out.fy = out.cy + dy * k; }
    else { out.fx = out.cx; out.fy = out.cy; }
  }

  /* ---------- candidates (DS §5.2 item 4) ---------- */

  // The height of the line's clearance curve c over x, for a box spanning [x0, x1]: c over the
  // box, falling as a quarter circle over the c past each end.
  function capAt(x, x0, x1, c) {
    var u = x < x0 ? x0 - x : x > x1 ? x - x1 : 0;
    return u >= c ? 0 : u > 0 ? Math.sqrt(c * c - u * u) : c;
  }

  // For a box spanning [x0, x1] above (or below) a line: the lowest bottom edge (or highest top
  // edge) at which every point of the centreline lies at least c from the box, one of them at c.
  // It is the least of y - capAt(x) (or the most of y + capAt(x)) over the centreline's points
  // with x in [x0 - c, x1 + c]. On each segment that function is linear over the box and convex
  // (concave) over each cap, so its extreme lies at an end, at x0 or x1, or where its slope is 0,
  // at a horizontal distance u = |m| c / sqrt(1 + m^2) past the box, m being the segment's
  // slope. NaN when no part of the line lies within that range.
  function envelope(pf, x0, x1, c, above) {
    var s = pf.s, B = pf.bk, qa = x0 - c, qb = x1 + c, sg = above ? 1 : -1, best = Infinity;
    var lo = rangeLo(pf, qa), hi = rangeHi(pf, qb), v, xs;
    // best holds sg * value, so that one minimum serves both sides
    function at(xv, ax, ay, m) {
      var r = sg * (ay + m * (xv - ax)) - capAt(xv, x0, x1, c);
      if (r < best) best = r;
    }
    for (var i = lo; i < hi;) {
      var b = (i / BLOCK) | 0, end = Math.min(hi, (b + 1) * BLOCK);
      if (B[4 * b] > qb || B[4 * b + 2] < qa) { i = end; continue; }
      if (i === b * BLOCK && B[4 * b] >= x0 && B[4 * b + 2] <= x1 && end === Math.min(pf.n, (b + 1) * BLOCK)) {
        v = above ? B[4 * b + 1] - c : -(B[4 * b + 3] + c);      // a whole block over the box
        if (v < best) best = v;
        i = end;
        continue;
      }
      for (; i < end; i++) {
        var ax = s[4 * i], ay = s[4 * i + 1], bx = s[4 * i + 2], by = s[4 * i + 3];
        if (ax > bx) { v = ax; ax = bx; bx = v; v = ay; ay = by; by = v; }
        if (bx < qa || ax > qb) continue;
        if (ax >= x0 && bx <= x1) {                                // over the box
          v = above ? Math.min(ay, by) - c : -(Math.max(ay, by) + c);
          if (v < best) best = v;
          continue;
        }
        if (bx - ax < 1e-9) {                                      // vertical, beside the box
          v = (above ? Math.min(ay, by) : -Math.max(ay, by)) - capAt(ax, x0, x1, c);
          if (v < best) best = v;
          continue;
        }
        var m = (by - ay) / (bx - ax), ea = Math.max(ax, qa), eb = Math.min(bx, qb);
        at(ea, ax, ay, m);
        at(eb, ax, ay, m);
        if (x0 > ea && x0 < eb) at(x0, ax, ay, m);
        if (x1 > ea && x1 < eb) at(x1, ax, ay, m);
        var k = c / Math.sqrt(1 + m * m), uL = above ? m * k : -m * k, uR = above ? -m * k : m * k;
        xs = x0 - uL;
        if (uL > 0 && xs > ea && xs < eb) at(xs, ax, ay, m);
        xs = x1 + uR;
        if (uR > 0 && xs > ea && xs < eb) at(xs, ax, ay, m);
      }
    }
    return finite(best) ? sg * best : NaN;
  }

  // The candidate boxes of a feature for a box w wide and bh tall, in the order of DS §5.2 item 4.
  // Each is {x0, y0, x1, y1, name, anchor}; a box that cannot be built has NaN coordinates.
  function candidates(pf, w, bh, S) {
    var out = [], h = S.h, i;
    function push(x0, y0, name, anchor) {
      out.push({ x0: x0, y0: y0, x1: x0 + w, y1: y0 + bh, name: name, anchor: anchor });
    }
    if (pf.type === 'point' || pf.type === 'value') {
      var x = pf.x, y = pf.y, R = pf.r + RULES.pointGap * h, q = R / Math.SQRT2;
      push(x + q, y - q - bh, POINT_NAMES[0], 'start');
      push(x - q - w, y - q - bh, POINT_NAMES[1], 'end');
      push(x - q - w, y + q, POINT_NAMES[2], 'end');
      push(x + q, y + q, POINT_NAMES[3], 'start');
      push(x + R, y - bh / 2, POINT_NAMES[4], 'start');
      push(x - w / 2, y - R - bh, POINT_NAMES[5], 'middle');
      push(x - R - w, y - bh / 2, POINT_NAMES[6], 'end');
      push(x - w / 2, y + R, POINT_NAMES[7], 'middle');
      return out;
    }
    if (pf.type === 'line') {
      var c = pf.hw + RULES.near * h, side, t, x0;
      for (side = 0; side < 2; side++) {
        for (i = 0; i < LINE_AT.length; i++) {
          var name = (side ? 'below ' : 'above ') + Math.round(LINE_AT[i] * 100) + '%';
          if (!pf.n || w > S.W) { push(NaN, NaN, name, 'middle'); continue; }
          x0 = clamp(pf.ext0 + LINE_AT[i] * (pf.ext1 - pf.ext0) - w / 2, 0, S.W - w);
          t = envelope(pf, x0, x0 + w, c, side === 0);
          push(x0, side === 0 ? t - bh : t, name, 'middle');
        }
      }
      return out;
    }
    // region: inside the region's part of the frame
    var b = pf.box, pad = RULES.regionPad * h;
    var rx0 = Math.max(b.x0, 0), ry0 = Math.max(b.y0, 0), rx1 = Math.min(b.x1, S.W), ry1 = Math.min(b.y1, S.H);
    var fits = rx1 - rx0 >= w + 2 * pad && ry1 - ry0 >= bh + 2 * pad;
    var spanX = rx1 - rx0 - 2 * pad - w, spanY = ry1 - ry0 - 2 * pad - bh;
    for (i = 0; i < REGION_AT.length; i++) {
      var at = REGION_AT[i];
      push(fits ? rx0 + pad + at[1] * spanX : NaN, fits ? ry0 + pad + at[2] * spanY : NaN, at[0], at[3]);
    }
    return out;
  }

  /* ---------- evaluating a candidate ---------- */

  // Why a candidate is rejected, in the order the tests run:
  //   'none'        no box could be built there (no visible line, or a region too small)
  //   'frame'       the box leaves the frame
  //   'on'          the box touches or covers its own feature (item 1, "never on it")
  //   'far'         the box lies farther than 0.5 h from its feature (item 1)
  //   'outside'     a region's name not inside its region
  //   'ink'         the box touches a series' ink, its own series included
  //   'region'      the box sits in a region it does not name (item 7)
  //   'annotation'  the box touches an annotation's line (DS §5.10 rule 2)
  //   'feature'     the box comes within 1 h of another label's feature (item 1)
  //   'between'     a rival crosses the segment from the box's centre to its feature (item 6)
  //   'rival'       a region's name with a rival within 1 h
  //   'ratio'       ratio under 1.1 (item 2, DS §5.4)
  //   'angle'       a leader would arrive at under 45 degrees to its line (DS §5.4)
  //   'label'       within 0.5 h of a placed label's box, or touching a placed leader
  var NR = { d: 0, bx: 0, by: 0, cx: 0, cy: 0, fx: 0, fy: 0 }, NR2 = { d: 0, bx: 0, by: 0, cx: 0, cy: 0, fx: 0, fy: 0 };

  // Rule 3 of item 1 is not applied between two labels of one series where either feature is a
  // line or a region: the line holds the other's point, so no position could satisfy it.
  function exempt(P, O) {
    if (P.series == null || P.series !== O.series) return false;
    return P.pf.type === 'line' || P.pf.type === 'region' || O.pf.type === 'line' || O.pf.type === 'region';
  }

  // Does the box come within dist of feature pf? A region never counts as another's feature,
  // because rule 7 already keeps other labels out of it.
  function nearFeature(pf, x0, y0, x1, y1, dist) {
    if (pf.type === 'region') return false;
    if (pf.type === 'line') return pf.n > 0 && lineWithin(pf, x0, y0, x1, y1, dist);
    return ptBox(pf.x, pf.y, x0, y0, x1, y1) - pf.r < dist - EPS;
  }

  // Does a rival of label P cross the segment? Rivals are marks of another series.
  function crossed(S, P, ax, ay, bx, by) {
    var ix = S.ix, buf = S.buf, x0 = Math.min(ax, bx), y0 = Math.min(ay, by), x1 = Math.max(ax, bx), y1 = Math.max(ay, by);
    var n = ix._near(x0, y0, x1, y1, buf);
    for (var j = 0; j < n; j++) {
      var it = buf[j];
      if (ix.kd[it] !== RIVAL || ix.sr[it] === P.sc || ix._lb(it, x0, y0, x1, y1) > EPS) continue;
      if (ix._segDist(it, ax, ay, bx, by) <= EPS) return true;
    }
    return false;
  }

  // The leader of a box (DS §5.4): it runs from the feature's point nearest the box's centre, on
  // the mark's drawn edge, toward that centre, and starts where it leaves the box. Returns
  // [x1, y1, x2, y2], from the box to the mark, and sets LP.x, LP.y to the centreline point (the
  // mark's centre for a point). reach bounds the search of a line.
  var LP = { x: 0, y: 0 };
  function leaderOf(pf, x0, y0, x1, y1, reach) {
    var mx = (x0 + x1) / 2, my = (y0 + y1) / 2, px = pf.x, py = pf.y, r = pf.r;
    if (pf.type === 'line') {
      var s = pf.s, best = Infinity, lo = rangeLo(pf, mx - reach), hi = rangeHi(pf, mx + reach);
      r = pf.hw;
      for (var i = lo; i < hi; i++) {
        var ax = s[4 * i], ay = s[4 * i + 1], dx = s[4 * i + 2] - ax, dy = s[4 * i + 3] - ay, L = dx * dx + dy * dy;
        var t = L > 0 ? clamp(((mx - ax) * dx + (my - ay) * dy) / L, 0, 1) : 0, qx = ax + t * dx, qy = ay + t * dy;
        var d = (qx - mx) * (qx - mx) + (qy - my) * (qy - my);
        if (d < best) { best = d; px = qx; py = qy; }
      }
    }
    LP.x = px; LP.y = py;
    var vx = mx - px, vy = my - py, vl = Math.sqrt(vx * vx + vy * vy);
    var ex = vl > 0 ? px + vx / vl * r : px, ey = vl > 0 ? py + vy / vl * r : py;
    var sx = ex, sy = ey;
    if (clipT(mx, my, ex, ey, x0, y0, x1, y1, TT)) { sx = mx + (ex - mx) * TT[1]; sy = my + (ey - my) * TT[1]; }
    return [sx, sy, ex, ey];
  }

  // Does the leader arrive at 45 degrees or more to every line through its end? The lines are
  // the feature's own segments through the centreline point (cx, cy) for a line, and the own
  // series' segments through the mark's centre for a point or a value.
  function steep(S, P, ld, cx, cy) {
    var vx = ld[2] - ld[0], vy = ld[3] - ld[1], vl = Math.sqrt(vx * vx + vy * vy), lim = Math.cos(RULES.angle * Math.PI / 180) + 1e-9;
    if (!(vl > 0)) return true;
    function ok(ax, ay, bx, by) {
      var tx = bx - ax, ty = by - ay, tl = Math.sqrt(tx * tx + ty * ty);
      return !(tl > 0) || Math.abs(vx * tx + vy * ty) / (vl * tl) <= lim;
    }
    var pf = P.pf, j;
    if (pf.type === 'line') {
      var s = pf.s, lo = rangeLo(pf, cx - 1e-6), hi = rangeHi(pf, cx + 1e-6);
      for (j = lo; j < hi; j++) {
        if (ptSeg(cx, cy, s[4 * j], s[4 * j + 1], s[4 * j + 2], s[4 * j + 3]) > 1e-6) continue;
        if (!ok(s[4 * j], s[4 * j + 1], s[4 * j + 2], s[4 * j + 3])) return false;
      }
      return true;
    }
    if (P.sc < 0) return true;
    var ix = S.ix, buf = S.buf, r = pf.r + 1, n = ix._near(pf.x - r, pf.y - r, pf.x + r, pf.y + r, buf);
    for (j = 0; j < n; j++) {
      var it = buf[j];
      if (ix.t[it] !== SEG || ix.kd[it] !== RIVAL || ix.sr[it] !== P.sc) continue;
      if (ptSeg(pf.x, pf.y, ix.a[it], ix.b[it], ix.c[it], ix.d[it]) > 0.5) continue;
      if (!ok(ix.a[it], ix.b[it], ix.c[it], ix.d[it])) return false;
    }
    return true;
  }

  // Everything about a candidate that does not depend on the other labels' positions. Returns
  // {tier, reason, dF, dR, ratio, lead}: tier 'clear', 'ratio' or 'leader' where the candidate
  // can be used, else a reason. dR is exact where a rival lies within 1 h, and at least 1 h
  // otherwise.
  function evaluate(S, P, c) {
    var h = S.h, pf = P.pf, x0 = c.x0, y0 = c.y0, x1 = c.x1, y1 = c.y1;
    var ev = { tier: null, reason: null, dF: NaN, dR: Infinity, ratio: NaN, lead: null };
    if (!(finite(x0) && finite(y0) && finite(x1) && finite(y1))) { ev.reason = 'none'; return ev; }
    if (x0 < -EPS || y0 < -EPS || x1 > S.W + EPS || y1 > S.H + EPS) { ev.reason = 'frame'; return ev; }
    var region = pf.type === 'region';
    if (region) {
      var b = pf.box;
      if (x0 < b.x0 - EPS || y0 < b.y0 - EPS || x1 > b.x1 + EPS || y1 > b.y1 + EPS) { ev.reason = 'outside'; return ev; }
      ev.dF = 0;
    } else {
      featureNear(pf, x0, y0, x1, y1, RULES.near * h + 1, NR);
      if (NR.d <= EPS) { ev.reason = 'on'; return ev; }
      if (NR.d > RULES.near * h + EPS) { ev.reason = 'far'; return ev; }
      ev.dF = NR.d;
    }
    var ix = S.ix, buf = S.buf, R = RULES.rival * h, j;
    var n = ix._near(x0 - R, y0 - R, x1 + R, y1 + R, buf), reg = false, ann = false, dR = Infinity;
    for (j = 0; j < n; j++) {
      var it = buf[j], k = ix.kd[it];
      if (k === STRUCTURE) continue;
      var lb = ix._lb(it, x0, y0, x1, y1);
      if (k === REGION) {
        if (!reg && lb <= EPS && !(P.names != null && ix.obs[ix.ob[it]].id === P.names) &&
          ix._boxDist(it, x0, y0, x1, y1) <= EPS) reg = true;
        continue;
      }
      var own = ix.sr[it] === P.sc;
      if (lb > EPS && (own || k === ANNOTATION || lb >= (dR < R ? dR : R))) continue;
      var d = ix._boxDist(it, x0, y0, x1, y1);
      if (k === ANNOTATION) { if (d <= EPS) ann = true; continue; }
      if (d <= EPS) { ev.reason = 'ink'; return ev; }
      if (!own && d < dR) dR = d;
    }
    for (j = 0; j < S.regions.length && !reg; j++) {
      var q = S.regions[j];
      if (P.names != null && q.id === P.names) continue;
      if ((q.poly ? polyBox(q.poly, x0, y0, x1, y1) : boxBox(q.x0, q.y0, q.x1, q.y1, x0, y0, x1, y1)) <= EPS) reg = true;
    }
    if (reg) { ev.reason = 'region'; return ev; }
    if (ann) { ev.reason = 'annotation'; return ev; }
    for (j = 0; j < S.act.length; j++) {
      var O = S.act[j];
      if (O === P || exempt(P, O)) continue;
      if (nearFeature(O.pf, x0, y0, x1, y1, RULES.other * h)) { ev.reason = 'feature'; return ev; }
    }
    if (!region && crossed(S, P, (x0 + x1) / 2, (y0 + y1) / 2, NR.fx, NR.fy)) { ev.reason = 'between'; return ev; }
    ev.dR = dR;
    if (region) {
      ev.ratio = Infinity;
      if (dR >= R - EPS) ev.tier = 'clear'; else ev.reason = 'rival';
      return ev;
    }
    ev.ratio = dR / ev.dF;
    if (dR >= R - EPS && ev.ratio >= RULES.ratio - EPS) ev.tier = 'clear';
    else if (ev.ratio >= RULES.ratio - EPS) ev.tier = 'ratio';
    else if (ev.ratio >= RULES.leader - EPS) {
      var half = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0)) / 2;
      var ld = leaderOf(pf, x0, y0, x1, y1, half + ev.dF + pf.hw + 1);
      if (!steep(S, P, ld, LP.x, LP.y)) ev.reason = 'angle';
      else if (crossed(S, P, ld[0], ld[1], ld[2], ld[3])) ev.reason = 'between';
      else { ev.tier = 'leader'; ev.lead = ld; }
    } else ev.reason = 'ratio';
    return ev;
  }

  // Does a box, with its leader if it has one, clash with a placed label?
  function clash(S, c, lead, placed) {
    var g = RULES.labelGap * S.h;
    for (var i = 0; i < placed.length; i++) {
      var q = placed[i], b = q.box;
      if (boxBox(c.x0, c.y0, c.x1, c.y1, b.x0, b.y0, b.x1, b.y1) < g - EPS) return true;
      if (q.lead && segBox(q.lead[0], q.lead[1], q.lead[2], q.lead[3], c.x0, c.y0, c.x1, c.y1) <= EPS) return true;
      if (lead) {
        if (segBox(lead[0], lead[1], lead[2], lead[3], b.x0, b.y0, b.x1, b.y1) <= EPS) return true;
        if (q.lead && segSeg(lead[0], lead[1], lead[2], lead[3], q.lead[0], q.lead[1], q.lead[2], q.lead[3]) <= EPS) return true;
      }
    }
    return false;
  }

  /* ---------- placing ---------- */

  function byIndex(a, b) { return a.i - b.i; }
  function areaOf(F) { return F.w * F.bh; }

  function prepLabel(L, i, S) {
    L = L || {};
    var box = L.box || {}, w = +box.w, bh = +box.h;
    var P = {
      i: i, id: L.id, series: L.seriesId, sc: S.ix._code(L.seriesId), names: L.names,
      captionNames: !!L.captionNames, keySentence: !!L.keySentence,
      pf: prepFeature(L.feature, S.W, S.H),
      forms: [{ kind: 'full', text: L.text, w: finite(w) && w > 0 ? w : 0, bh: finite(bh) && bh > 0 ? bh : 0 }],
      phoneHeader: false, start: 0, cands: [], evals: [], why: null,
      status: 'compete', reason: null, prev: null
    };
    var ph = L.phone;
    if (ph && ph.header) P.phoneHeader = true;
    else if (ph && ph.box && ph.text !== undefined && ph.text !== L.text) {
      var pw = +ph.box.w, pbh = +ph.box.h;
      P.forms.push({ kind: 'phone', text: ph.text, w: finite(pw) && pw > 0 ? pw : 0, bh: finite(pbh) && pbh > 0 ? pbh : 0 });
    }
    if (P.pf && P.pf.type === 'line' && P.pf.n) {
      var s = P.pf.s, y0 = Infinity, y1 = -Infinity;
      for (var k = 1; k < s.length; k += 2) { if (s[k] < y0) y0 = s[k]; if (s[k] > y1) y1 = s[k]; }
      P.pf.bb = { x0: P.pf.ext0, y0: y0, x1: P.pf.ext1, y1: y1 };
    }
    return P;
  }

  function cand(S, P, f) {
    return P.cands[f] || (P.cands[f] = candidates(P.pf, P.forms[f].w, P.forms[f].bh, S));
  }
  function evalOf(S, P, f, k) {
    var E = P.evals[f] || (P.evals[f] = []);
    return E[k] || (E[k] = evaluate(S, P, cand(S, P, f)[k]));
  }

  // How many candidates of form f label P can take now: 'clear' and 'ratio' ones in phase 1,
  // 'leader' ones in phase 2. With explain, records why each candidate can or cannot be taken.
  function count(S, P, f, placed, leader) {
    var C = cand(S, P, f), n = 0, why = null;
    if (S.explain) { P.why = P.why || []; why = P.why[f] = []; }
    for (var k = 0; k < C.length; k++) {
      var ev = evalOf(S, P, f, k), w = ev.reason || ev.tier, usable = false;
      if (ev.tier) {
        if (clash(S, C[k], ev.tier === 'leader' ? ev.lead : null, placed)) w = 'label';
        else usable = leader ? ev.tier === 'leader' : ev.tier !== 'leader';
      }
      if (why) why[k] = w;
      if (usable) n++;
    }
    return n;
  }

  // The candidate label P takes in form f: its first 'clear' one in order, else its first 'ratio'
  // one; in phase 2 the leader position of highest ratio, ties in order.
  function choose(S, P, f, placed, leader) {
    var C = cand(S, P, f), pick = -1, best = -Infinity, k, ev, round;
    if (!leader) {
      for (round = 0; round < 2 && pick < 0; round++) {
        for (k = 0; k < C.length; k++) {
          ev = evalOf(S, P, f, k);
          if (ev.tier === (round ? 'ratio' : 'clear') && !clash(S, C[k], null, placed)) { pick = k; break; }
        }
      }
    } else {
      for (k = 0; k < C.length; k++) {
        ev = evalOf(S, P, f, k);
        if (ev.tier === 'leader' && !clash(S, C[k], ev.lead, placed) && ev.ratio > best) { best = ev.ratio; pick = k; }
      }
    }
    ev = evalOf(S, P, f, pick);
    return { P: P, fi: f, k: pick, ev: ev, box: C[pick], lead: leader ? ev.lead : null };
  }

  // Places labels most constrained first, recounting after each placement (item 5), until every
  // competing label is placed or has no admissible position in any form (then it is deferred) or
  // moves to the header by its phone form.
  function runOrder(S, pending, placed, res, leader, onNone) {
    var fi = [], i, P;
    pending.sort(byIndex);
    for (i = 0; i < pending.length; i++) fi[pending[i].i] = pending[i].start;
    while (pending.length) {
      var best = null, bestN = Infinity;
      for (i = 0; i < pending.length; i++) {
        P = pending[i];
        var f = fi[P.i], n = count(S, P, f, placed, leader);
        while (n === 0 && f + 1 < P.forms.length) { f++; n = count(S, P, f, placed, leader); }
        fi[P.i] = f;
        if (n === 0) { pending.splice(i--, 1); onNone(P); continue; }
        if (n < bestN) { best = P; bestN = n; }
      }
      if (!best) break;
      var e = choose(S, best, fi[best.i], placed, leader);
      placed.push(e);
      res[best.i] = e;
      pending.splice(pending.indexOf(best), 1);
    }
  }

  function phase1(S) {
    var placed = S.fixed.slice(), res = [], deferred = [], pending = [], i, P;
    for (i = 0; i < placed.length; i++) res[placed[i].P.i] = placed[i];
    for (i = 0; i < S.act.length; i++) {
      P = S.act[i];
      P.evals = [];
      P.why = null;
      if (P.status === 'compete') pending.push(P);
    }
    runOrder(S, pending, placed, res, false, function (P) {
      if (P.phoneHeader) res[P.i] = { P: P, off: 'header', reason: 'no admissible position' };
      else deferred.push(P);
    });
    return { placed: placed, res: res, deferred: deferred };
  }

  function outside(S, P) {
    var pf = P.pf;
    if (pf.type === 'line') return !pf.n;
    if (pf.type === 'region') return pf.box.x1 < 0 || pf.box.y1 < 0 || pf.box.x0 > S.W || pf.box.y0 > S.H;
    return pf.x < 0 || pf.y < 0 || pf.x > S.W || pf.y > S.H;
  }

  // A line's name may stand in the right margin: the desktop layout, a margin reserved, a
  // visible line, and a text form narrow enough.
  function marginOK(S, P) {
    if (S.phone || !S.nameMargin || !P.pf || P.pf.type !== 'line' || !P.pf.n) return false;
    var room = S.nameMargin - RULES.pointGap * S.h;
    for (var f = 0; f < P.forms.length; f++) if (P.forms[f].w <= room + EPS) return true;
    return false;
  }

  // Phase 2, leaders for the deferred labels, and phase 3, the steps outside the frame (DS §5.6).
  function finish(S, out) {
    var failing = [], i, P;
    runOrder(S, out.deferred.slice(), out.placed, out.res, true, function (P) { failing.push(P); });
    failing.sort(byIndex);
    for (i = 0; i < failing.length; i++) {
      P = failing[i];
      var why = outside(S, P) ? 'feature outside the frame' : 'no admissible position';
      var off = P.pf.type === 'value' ? 'header' : marginOK(S, P) ? 'margin' : 'dropped';
      out.res[P.i] = { P: P, off: off, reason: why };
    }
  }

  // Does label P have a phase-1 position in some form with no other label in the frame? A label
  // without one cannot gain a position by the drop of another label.
  function placeableAlone(S, P) {
    var act = S.act, ok = false;
    S.act = [P];
    try {
      for (var f = 0; f < P.forms.length && !ok; f++) {
        var C = cand(S, P, f);
        for (var k = 0; k < C.length && !ok; k++) {
          var ev = evaluate(S, P, C[k]);
          if (ev.tier && ev.tier !== 'leader') ok = true;
        }
      }
    } finally { S.act = act; }
    return ok;
  }

  // The label to drop in the phone layout while some label has no admissible position (DS §5.6):
  // a label whose token the caption names, first among those the key sentence does not name; the
  // unplaced label itself when it is one of them, else the one nearest its feature. The unplaced
  // label is the first deferred one, by index, that has a position with no other label in the
  // frame; a deferred label without one is left to phases 2 and 3, and no label with a clear
  // position is dropped for it (F9.1's spike callout on a phone, which cost "every step").
  function victim(S, out) {
    var ds = out.deferred.slice().sort(byIndex), f = null, pool = [], low = [], i, P;
    S.hopeless = S.hopeless || [];
    for (i = 0; i < ds.length && !f; i++) {
      if (S.hopeless.indexOf(ds[i]) >= 0) continue;
      if (placeableAlone(S, ds[i])) f = ds[i];
      else S.hopeless.push(ds[i]);
    }
    if (!f) return null;
    for (i = 0; i < S.act.length; i++) {
      P = S.act[i];
      var r = out.res[P.i];
      if (!P.captionNames || P.status !== 'compete' || (r && r.off)) continue;
      pool.push(P);
      if (!P.keySentence) low.push(P);
    }
    var cls = low.length ? low : pool;
    if (!cls.length) return null;
    if (cls.indexOf(f) >= 0) return f;
    var best = cls[0], bd = Infinity;
    for (i = 0; i < cls.length; i++) {
      P = cls[i];
      var b = out.res[P.i] && out.res[P.i].box, pf = P.pf, d;
      if (!b) b = pf.type === 'line' ? pf.bb : pf.type === 'region' ? pf.box : { x0: pf.x, y0: pf.y, x1: pf.x, y1: pf.y };
      if (!b) d = Infinity;
      else if (f.pf.type === 'region') d = boxBox(b.x0, b.y0, b.x1, b.y1, f.pf.box.x0, f.pf.box.y0, f.pf.box.x1, f.pf.box.y1);
      else d = featureNear(f.pf, b.x0, b.y0, b.x1, b.y1, Infinity, NR2);
      if (d < bd) { bd = d; best = P; }
    }
    return best;
  }

  // Item 8, before any placement: if the boxes would cover more than 12.5 per cent of the frame,
  // labels take their phone forms, then labels whose token the caption names are dropped, in the
  // order of DS §5.6, until they fit. Returns true when they still do not.
  function densityStep(S, labels) {
    var limit = RULES.density * S.W * S.H, area = 0, order = [], i, P;
    for (i = 0; i < labels.length; i++) {
      P = labels[i];
      if (P.status === 'fixed') area += areaOf(P.forms[P.fixedForm]);
      else if (P.status === 'compete') { area += areaOf(P.forms[P.start]); order.push(P); }
    }
    if (area <= limit + EPS) return false;
    function rank(P) { return P.captionNames ? (P.keySentence ? 1 : 0) : 2; }
    order.sort(function (a, b) { return rank(a) - rank(b) || a.i - b.i; });
    for (i = 0; i < order.length && area > limit + EPS; i++) {
      P = order[i];
      if (P.forms.length > 1 && areaOf(P.forms[1]) < areaOf(P.forms[0])) {
        area -= areaOf(P.forms[0]) - areaOf(P.forms[1]);
        P.start = 1;
      } else if (P.phoneHeader) {
        area -= areaOf(P.forms[0]);
        P.status = 'header'; P.reason = 'density';
      }
    }
    for (i = 0; i < order.length && area > limit + EPS; i++) {
      P = order[i];
      if (!P.captionNames || P.status !== 'compete') continue;
      area -= areaOf(P.forms[P.start]);
      P.status = 'dropped'; P.reason = 'density';
    }
    return area > limit + EPS;
  }

  // Names in the right margin, each at the height its line leaves the frame by, pushed apart by
  // 0.5 h and kept within the frame's height.
  function layoutMargin(S, list) {
    var g = RULES.pointGap * S.h, gap = RULES.labelGap * S.h, room = S.nameMargin - g, items = [], i, it;
    for (i = 0; i < list.length; i++) {
      var r = list[i], P = r.P, f = -1;
      for (var q = 0; q < P.forms.length && f < 0; q++) if (P.forms[q].w <= room + EPS) f = q;
      if (f < 0) { r.off = 'dropped'; r.reason = 'no room in the margin'; continue; }
      items.push({ r: r, f: f, w: P.forms[f].w, bh: P.forms[f].bh, want: P.pf.exitY - P.forms[f].bh / 2 });
    }
    items.sort(function (a, b) { return a.want - b.want || a.r.P.i - b.r.P.i; });
    for (;;) {
      var total = 0;
      for (i = 0; i < items.length; i++) total += items[i].bh + (i ? gap : 0);
      if (total <= S.H + EPS || !items.length) break;
      var worst = 0;
      for (i = 1; i < items.length; i++) if (items[i].r.P.i > items[worst].r.P.i) worst = i;
      items[worst].r.off = 'dropped';
      items[worst].r.reason = 'no room in the margin';
      items.splice(worst, 1);
    }
    var y = 0;
    for (i = 0; i < items.length; i++) {
      it = items[i];
      it.y0 = Math.max(it.want, y);
      y = it.y0 + it.bh + gap;
    }
    var lim = S.H;
    for (i = items.length - 1; i >= 0; i--) {
      it = items[i];
      if (it.y0 + it.bh > lim) it.y0 = lim - it.bh;
      lim = it.y0 - gap;
    }
    for (i = 0; i < items.length; i++) {
      it = items[i];
      it.r.fi = it.f;
      it.r.box = { x0: S.W + g, y0: it.y0, x1: S.W + g + it.w, y1: it.y0 + it.bh };
    }
  }

  // The exact distance from a box to the nearest rival's ink, searching outward.
  function exactRival(S, P, x0, y0, x1, y1) {
    var ix = S.ix, buf = S.buf, R = S.h, best = Infinity;
    for (;;) {
      var n = ix._near(x0 - R, y0 - R, x1 + R, y1 + R, buf);
      for (var j = 0; j < n; j++) {
        var it = buf[j];
        if (ix.kd[it] !== RIVAL || ix.sr[it] === P.sc || ix._lb(it, x0, y0, x1, y1) >= best) continue;
        var d = ix._boxDist(it, x0, y0, x1, y1);
        if (d < best) best = d;
      }
      if (best <= R || ix._covers(x0 - R, y0 - R, x1 + R, y1 + R)) return Math.max(0, best);
      R *= 4;
    }
  }

  function entry(S, P, r) {
    var e = {
      id: P.id, text: P.forms[0].text, form: 'dropped', x: null, y: null, box: null, anchor: null,
      candidate: -1, position: null, tier: null, leader: null, dFeature: null, dRival: null, ratio: null, reason: null
    };
    var inFrame = r && !r.off && r.box;
    if (S.explain) {
      e.rejected = [];
      for (var f = 0; P.why && f < P.why.length; f++) {
        var W = P.why[f] || [], C = P.cands[f] || [];
        for (var k = 0; k < W.length; k++) {
          if (inFrame && f === r.fi && k === r.k) continue;
          e.rejected.push({ form: P.forms[f].kind, candidate: k, position: C[k] ? C[k].name : null, reason: W[k] });
        }
      }
    }
    if (!r || !r.box || r.off === 'header' || r.off === 'dropped') {
      e.form = r && r.off === 'header' ? 'header' : 'dropped';
      e.reason = r && r.reason ? r.reason : 'no admissible position';
      return e;
    }
    var F = P.forms[r.fi], b = r.box;
    e.text = F.text;
    e.x = b.x0; e.y = b.y0;
    e.box = { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
    if (r.off === 'margin') {
      e.form = 'margin'; e.anchor = 'start'; e.position = 'margin'; e.reason = r.reason;
      e.dFeature = Math.max(0, featureNear(P.pf, b.x0, b.y0, b.x1, b.y1, Infinity, NR2));
    } else {
      e.form = F.kind; e.anchor = b.anchor; e.candidate = r.k; e.position = b.name; e.tier = r.ev.tier;
      if (r.lead) e.leader = { x1: r.lead[0], y1: r.lead[1], x2: r.lead[2], y2: r.lead[3] };
      e.dFeature = r.ev.dF;
    }
    e.dRival = exactRival(S, P, b.x0, b.y0, b.x1, b.y1);
    e.ratio = e.dFeature > 0 ? e.dRival / e.dFeature : Infinity;
    return e;
  }

  function normPrevious(prev) {
    if (!prev) return null;
    var list = Array.isArray(prev) ? prev : Array.isArray(prev.labels) ? prev.labels : null;
    if (!list) return prev;
    var map = {};
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id != null) map[list[i].id] = list[i];
    return map;
  }

  function normRegions(list) {
    var out = [];
    for (var i = 0; i < (list ? list.length : 0); i++) {
      var q = list[i];
      if (!q) continue;
      if (q.poly) {
        var p = flatPoints(q.poly).filter(finite);
        if (p.length >= 6) out.push({ id: q.id, poly: p });
        continue;
      }
      var b = normBox(q.box || q);
      if (b) out.push({ id: q.id, x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 });
    }
    return out;
  }

  function place(o) {
    o = o || {};
    var fr = o.frame || {}, W = +fr.width, H = +fr.height, i, P;
    if (!(W > 0 && H > 0 && isFinite(W) && isFinite(H))) throw new RangeError('TP.placer: the frame needs a positive width and height');
    var S = {
      W: W, H: H, h: finite(+o.h) && +o.h > 0 ? +o.h : 14,
      ix: o.index || new Index(W, H), buf: [], regions: normRegions(o.regions),
      phone: !!o.phone, nameMargin: finite(+o.nameMargin) && +o.nameMargin > 0 ? +o.nameMargin : 0,
      explain: !!o.explain, act: [], fixed: []
    };
    var labels = (o.labels || []).map(function (L, k) { return prepLabel(L, k, S); });
    var prev = o.hold ? normPrevious(o.previous) : null, tentative = [];

    // Hold: labels dropped, in the header or in the margin stay there; a label in the frame is
    // tested at its previous form and candidate once the set of labels is known.
    for (i = 0; i < labels.length; i++) {
      P = labels[i];
      if (!P.pf) { P.status = 'dropped'; P.reason = 'no feature'; continue; }
      var pv = prev && P.id != null ? prev[P.id] : null;
      if (!pv) continue;
      if (pv.form === 'dropped' || pv.form === 'header') { P.status = pv.form; P.reason = pv.reason || 'held'; }
      else if (pv.form === 'margin' && marginOK(S, P)) { P.status = 'margin'; P.reason = pv.reason || 'held'; }
      else if (pv.form === 'full' || pv.form === 'phone') {
        var f = pv.form === 'full' ? 0 : P.forms.length > 1 ? 1 : -1, k = pv.candidate;
        if (f >= 0 && typeof k === 'number' && k >= 0 && k % 1 === 0 && k < cand(S, P, f).length) {
          tentative.push({ P: P, f: f, k: k, leader: pv.tier === 'leader' || (pv.tier == null && !!pv.leader) });
        }
      }
    }
    S.act = labels.filter(function (Q) { return Q.status !== 'dropped' && Q.status !== 'header'; });
    for (i = 0; i < tentative.length; i++) {
      var T = tentative[i], c = cand(S, T.P, T.f)[T.k], ev = evaluate(S, T.P, c);
      var keep = ev.tier === 'clear' || ev.tier === 'ratio' || (T.leader && ev.tier === 'leader');
      var lead = ev.tier === 'leader' ? ev.lead : null;
      if (keep && !clash(S, c, lead, S.fixed)) {
        S.fixed.push({ P: T.P, fi: T.f, k: T.k, ev: ev, box: c, lead: lead });
        T.P.status = 'fixed';
        T.P.fixedForm = T.f;
      }
    }

    var densityFault = densityStep(S, labels);
    S.act = labels.filter(function (Q) { return Q.status !== 'dropped' && Q.status !== 'header'; });

    var out = phase1(S);
    if (S.phone && !o.hold) {
      while (out.deferred.length) {
        var v = victim(S, out);
        if (!v) break;
        v.status = 'dropped';
        v.reason = 'dropped to make room';
        S.act = S.act.filter(function (Q) { return Q !== v; });
        out = phase1(S);
      }
    }
    finish(S, out);

    var margins = [];
    for (i = 0; i < labels.length; i++) {
      P = labels[i];
      if (P.status === 'margin') out.res[i] = { P: P, off: 'margin', reason: P.reason };
      else if (P.status === 'header' || P.status === 'dropped') out.res[i] = { P: P, off: P.status, reason: P.reason };
      if (out.res[i] && out.res[i].off === 'margin') margins.push(out.res[i]);
    }
    layoutMargin(S, margins);

    var result = { labels: [], density: 0, faults: [], densityFault: densityFault }, area = 0;
    for (i = 0; i < labels.length; i++) {
      var e = entry(S, labels[i], out.res[i]);
      result.labels.push(e);
      if (e.box && (e.form === 'full' || e.form === 'phone')) area += (e.box.x1 - e.box.x0) * (e.box.y1 - e.box.y0);
      e.toCaption = e.form === 'dropped' && labels[i].captionNames;
      if (e.form === 'dropped' && !labels[i].captionNames) result.faults.push(e.id);
    }
    result.density = area / (W * H);
    if (result.density > RULES.density + EPS) result.densityFault = true;
    return result;
  }

  TP.placer = {
    RULES: RULES,
    POINT_CANDIDATES: POINT_NAMES.slice(),
    REGION_CANDIDATES: REGION_NAMES.slice(),
    index: function (width, height, cell) { return new Index(width, height, cell); },
    place: place
  };
})(typeof window !== 'undefined' ? window : globalThis);
