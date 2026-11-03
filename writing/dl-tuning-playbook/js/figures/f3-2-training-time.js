/*
 * f3-2-training-time.js: figure F3.2, training time as a product (fig-training-time), on page 3
 * #training-time.
 *
 * Work order: notes/revamp/implementation-plan.md §6.5 (WO-F3.2), with §6.0. Entry:
 * notes/revamp/figure-plan.md F3.2 and review/synthesis.md R10. Design: notes/revamp/design-system.md
 * §3.4, §3.5, §4, §5, §6, §8 and §9. A fixed-frame figure with two handles and no dock.
 *
 * The model is TP.scaling (site/js/lib/scaling.js) with the knee at F3.1's saturating B_sat
 * (TP.scaling.knee(), CAL.knee). The handle `critical` is the playbook's critical batch size, the
 * end of perfect scaling, which the model puts at B_crit / 5, so the model's B_crit is
 * TP.scaling.criticalFromEnd(critical). Each curve is reported relative to its value at batch size
 * 8 (TP.scaling.normalized), so that on the log axis the training-time curve is the sum of the
 * other two. The minimum and the 5% window are TP.scaling.minimum and TP.scaling.window, the
 * computation of tests/calibration/fig-training-time.calibrate.js, so the quantities equal the
 * ledger's rows at the default and at both presets.
 *
 * The derived state holds the natural logarithms of batch size and of the three curves, so that a
 * transition interpolates in log space, where the product stays the sum of its factors at every
 * frame. Its arrays carry keys: the curves sampled 16 times per doubling ('s0' to 's176') and the
 * 12 powers of two ('p8' to 'p16384'), which carry the markers.
 *
 * The panel, log-log: x batch size, 8 to 16,384; y each curve relative to batch size 8, over
 * CAL.domains.a.y. Time per step in third gold (open circles), steps to the result in fourth
 * indigo (open diamonds), training time in model blue (filled circles), markers at the powers of
 * two, the batch sizes the model samples (DS §4.2). The minimum of training time is a filled
 * marker with the callout "minimum". The batch sizes within 5% of the minimum are a highlight
 * window named "within 5% of the minimum (ours)". The knee is a level of the toy in third gold,
 * named on the x axis "accelerator saturates" (phone "saturates"). The reader's batch size is a
 * reader line through the three curves, named on the x axis by its value, with its handle on the
 * axis and a press band along the line. The critical batch size's handle sits on the step curve.
 * A change of `critical` leaves the previous step and training-time curves dashed (DS §4.8).
 *
 * The parameters: critical (powers of two over CAL.domains.critical, transition, ghost) and batch
 * (powers of two from 8 to 16,384, transition, no ghost), both handles on the panel. The presets
 * "limit inside perfect scaling" (key inside) and "limit beyond the critical batch size" (key
 * beyond) set `critical` from CAL. No dock: the presets and Reset sit in more.
 *
 * v4 review (post03, 2026-11): default batch moved from 4,096 to 2,048 so that the reader line no
 * longer coincides with the critical handle at load (CAL default row updated by hand to match);
 * presets relabelled; the handle is labelled "End of perfect scaling"; the readout names the minimum.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};

  /* BEGIN GENERATED table-cal */
  // From tests/calibration/out/fig-training-time.json by npm run generate (tests/lib/write-generated.js).
  var CAL = {
    "defaults": {"critical": 4096, "batch": 2048},
    "presets": {"inside": {"critical": 16384}, "beyond": {"critical": 64}},
    "states": {},
    "seed": null,
    "knee": 512,
    "domains": {"a": {"x": [8, 16384], "y": [0.0001, 100]}, "critical": [8, 16384]},
    "tables": {},
    "quantities": {
      "model": {
        "knee": 512,
        "window": 0.05,
        "perfect-tolerance": 0.2,
        "sharpness": 4,
        "reference-batch": 8,
        "handle-low": 8,
        "handle-high": 16384,
        "minimum-over-knee-low": 0.6005622169907157,
        "minimum-over-knee-high": 2.75945932292243,
        "window-ratio-low": 1.7732402113601884,
        "window-ratio-high": 8.453702783828795
      },
      "default": {
        "batch": 2048,
        "critical": 4096,
        "b-crit": 20480,
        "minimum": 1070.7349018534637,
        "window-low": 650.4556284697403,
        "window-high": 2427.073675673967,
        "window-ratio": 3.7313439525212386,
        "excess": 0.03312009561347429,
        "window-batch-low": 1024,
        "window-batch-high": 2048
      },
      "inside": {
        "critical": 16384,
        "b-crit": 81920,
        "minimum": 1412.843173336284,
        "window-low": 704.2044698334998,
        "window-high": 5953.135287016139,
        "window-ratio": 8.453702783828795,
        "excess": 0.027857675426248507
      },
      "beyond": {
        "critical": 64,
        "b-crit": 320,
        "minimum": 466.06443597467654,
        "window-low": 346.026853430523,
        "window-high": 618.4622032495905,
        "window-ratio": 1.787324299019378,
        "excess": 3.487664469651481
      }
    }
  };
  /* END GENERATED table-cal */

  var ID = 'fig-training-time';
  var PER_DOUBLING = 16;

  function powers(lo, hi) { var out = []; for (var b = lo; b <= hi * (1 + 1e-9); b *= 2) out.push(b); return out; }
  var fmt = {
    int: function (v) { return TP.fmt.byName('int')(v); },
    times: function (v) { return TP.fmt.byName('times2')(v); },
    rel: function (v) { return TP.fmt.byName('sig2')(v); },
    /* the excess over the minimum: whole percent, or one decimal below 1% (the ledger rounds to
       whole percent, and every ledger setting lies above 1%) */
    pct: function (v) { return v < 0.00995 ? TP.fmt.byName('pct1')(v) : TP.fmt.byName('pct0')(v); },
    decade: function (v) {
      var e = Math.round(Math.log(v) / Math.LN10);
      return e === 0 ? '1' : e === 1 ? '10' : e === 2 ? '100' : TP.fmt.exp10(e);
    }
  };

  /* ============================== the model ============================== */

  function S() { return TP.scaling; }
  function knee() { return CAL.knee; }

  /** The quantities of a setting, exact, from TP.scaling as the calibration computes them. */
  function measure(critical, batch) {
    var M = S(), k = knee(), bCrit = M.criticalFromEnd(critical);
    var m = M.minimum(bCrit, k), w = M.window(bCrit, k);
    /* the plotted batch sizes within the window, as the calibration takes them */
    var inside = M.batchSizes().filter(function (B) { return M.trainingTime(B, bCrit, k) <= m.T * (1 + M.WINDOW); });
    return {
      critical: critical, batch: batch, bCrit: bCrit, knee: k,
      min: m.B, tMin: M.trainingTime(m.B, bCrit, k), lo: w.lo, hi: w.hi, ratio: w.ratio,
      excess: M.trainingTime(batch, bCrit, k) / m.T - 1,
      insideLow: inside.length ? inside[0] : null, insideHigh: inside.length ? inside[inside.length - 1] : null
    };
  }

  /** The derived state for the values. Every array of rows carries a key (DS §9). */
  function apply(values) {
    var M = S(), k = knee(), q = measure(values.critical, values.batch);
    var X = CAL.domains.a.x, n = Math.round(PER_DOUBLING * Math.log(X[1] / X[0]) / Math.LN2);
    var ln = Math.log;
    function row(key, B) {
      var v = M.normalized(B, q.bCrit, k);
      return { key: key, lb: ln(B), lt: ln(v.timePerStep), ls: ln(v.steps), lT: ln(v.trainingTime) };
    }
    var rows = [];
    for (var i = 0; i <= n; i++) rows.push(row('s' + i, X[0] * Math.pow(X[1] / X[0], i / n)));
    var pts = powers(X[0], X[1]).map(function (B) { return row('p' + B, B); });
    return {
      critical: values.critical, batch: values.batch,
      lc: ln(values.critical), lbatch: ln(values.batch),
      lcs: ln(M.steps(values.critical, q.bCrit) / M.steps(M.B_REF, q.bCrit)),
      lmin: ln(q.min), lTmin: ln(q.tMin), llo: ln(q.lo), lhi: ln(q.hi),
      excess: q.excess,
      rows: rows, pts: pts
    };
  }

  /* ============================== the figure ============================== */

  var fig = null, pa = null, cur = null, curCtx = { hold: false };

  function build(f) {
    var dA = CAL.domains.a;
    pa = TP.chart.panel(f.panels, {
      key: 'a',
      describe: 'time per step, steps and training time, each relative to batch size 8, against batch size',
      xLog: 2, yLog: 10, xDomain: dA.x.slice(), yDomain: dA.y.slice(),
      xLabel: 'batch size', yLabel: 'relative to batch size 8',
      xTicks: 'pow2', xFormat: fmt.int, xMinGap: 44,
      yTicks: 'pow10', yFormat: fmt.decade,
      grid: 'y',
      aspect: function (w, phone) { return phone ? 0.86 : 0.6; },
      maxHeight: function (w, phone) { return phone ? 318 : 420; },
      margin: function (w, phone) { return phone ? { t: 10, r: 18, b: 44, l: 56 } : { t: 12, r: 26, b: 48, l: 60 }; }
    });
    pa.update(drawA);
  }

  function E(v) { return Math.exp(v); }
  var xOf = function (r) { return E(r.lb); };

  /* The value named on the axis for the reader's batch size moves sideways, clear of the knee's
     name, when the two would overlap. Its stem stays at its value. */
  function separateNames(p, kneeName, readerName) {
    if (!kneeName || !readerName) return;
    var gap = 6, a = kneeName, b = readerName;
    var aLo = a.pos - a.w / 2, aHi = a.pos + a.w / 2, bLo = b.pos - b.w / 2, bHi = b.pos + b.w / 2;
    if (bLo >= aHi + gap || bHi <= aLo - gap) return;
    var lo = -p.margin.l + b.w / 2 + 1, hi = p.width + p.margin.r - b.w / 2 - 1;
    var right = aHi + gap + b.w / 2, left = aLo - gap - b.w / 2;
    var want = b.value >= a.value ? (right <= hi ? right : left) : (left >= lo ? left : right);
    var dx = want - b.pos;
    var t = b.node.querySelector('text');
    if (t) t.setAttribute('transform', 'translate(' + dx.toFixed(2) + ',0)');
    b.pos = want;
  }

  function drawA(p) {
    var s = cur;
    if (!s) return;
    var C = TP.chart, ctx = curCtx, phone = p.phone;
    var yT = function (r) { return E(r.lT); }, yS = function (r) { return E(r.ls); }, yt = function (r) { return E(r.lt); };

    /* the ghost: the step and training-time curves before the last change of `critical` */
    var g = ctx.ghost;
    if (g && g.rows && Math.abs(g.lc - s.lc) > 1e-9) {
      C.line(p, g.rows, xOf, yS, { role: 'fourth', series: 'ghost-steps', dash: 'ghost', ghost: false, key: 'ghost-steps' });
      C.line(p, g.rows, xOf, yT, { role: 'model', series: 'ghost-time', dash: 'ghost', ghost: false, key: 'ghost-time' });
    }

    /* the batch sizes within 5% of the minimum, a highlight window under the curves. Its name
       breaks into as many lines as the window's width needs (windowName). */
    var wName = windowName(p, E(s.llo), E(s.lhi), [CAL.knee, E(s.lbatch)]);
    C.window(p, E(s.llo), E(s.lhi), {
      kind: 'highlight', id: 'within', name: wName.full, phone: { text: wName.phone }, captionNames: true
    });

    /* the knee, a level of the toy in the time-per-step token, named on the x axis */
    var kneeName = (C.level(p, 'x', CAL.knee, { role: 'third', text: phone ? 'saturates' : 'accelerator saturates', line: true, series: 'knee', key: 'knee' }) || {}).record;

    /* the three curves, with markers at the powers of two */
    C.line(p, s.rows, xOf, yt, { role: 'third', series: 'time-per-step', key: 'time-per-step' });
    C.line(p, s.rows, xOf, yS, { role: 'fourth', series: 'steps', key: 'steps' });
    C.line(p, s.rows, xOf, yT, { role: 'model', series: 'training-time', key: 'training-time' });
    C.markers(p, s.pts, xOf, yt, { role: 'third', series: 'time-per-step', key: function (r) { return 't-' + r.key; } });
    C.markers(p, s.pts, xOf, yS, { role: 'fourth', series: 'steps', key: function (r) { return 's-' + r.key; } });
    /* the training-time curve's markers include its minimum, which the thinning of DS §4.2 keeps,
       so that no marker at a power of two stands within 24 px of the minimum's */
    var mB = E(s.lmin), mT = E(s.lTmin);
    var tRows = s.pts.concat([{ key: 'minimum', lb: s.lmin, lT: s.lTmin }]).sort(function (a, b) { return a.lb - b.lb; });
    C.markers(p, tRows, xOf, yT, {
      role: 'model', series: 'training-time', thin: 24,
      keep: function (r) { return r.key === 'minimum'; },
      key: function (r) { return r.key === 'minimum' ? 'minimum' : 'T-' + r.key; }
    });

    /* the reader's batch size: a reader line through the three curves, named on the axis */
    /* a transition's frames move the handles and lines in log space; a settled state gives the
       exact powers of two */
    var batch = ctx.transition ? E(s.lbatch) : s.batch, critical = ctx.transition ? E(s.lc) : s.critical;
    var readerName = (C.level(p, 'x', batch, { role: 'reader', text: fmt.int(batch), line: true, series: 'batch', key: 'batch' }) || {}).record;
    separateNames(p, kneeName, readerName);

    /* The minimum lies inside the window at every state, so its callout names the window as well
       and may stand in it (DS §5.2 item 7 keeps out the labels a region does not concern). */
    C.annotation(p, {
      kind: 'callout', id: 'minimum', text: 'minimum', captionNames: true, names: 'within',
      anchor: { x: mB, y: mT, r: 5, series: 'training-time' }
    });

    /* the handles: the batch size's first, so that the critical batch size's handle stands above
       the batch size's press band where the two meet */
    var snap = powers(CAL.domains.a.x[0], CAL.domains.a.x[1]);
    C.handle(p, {
      id: 'batch', axis: 'x', value: batch, snap: snap, min: snap[0], max: snap[snap.length - 1], scale: 'log',
      label: 'Batch size', format: fmt.int, onLine: true,
      onChange: function (v) { fig.set({ batch: v }, { transient: true }); },
      onSettle: function (v) { fig.set({ batch: v }); }
    });
    var cSnap = powers(CAL.domains.critical[0], CAL.domains.critical[1]);
    C.handle(p, {
      id: 'critical', axis: 'x', value: critical, at: E(s.lcs), snap: cSnap, min: cSnap[0], max: cSnap[cSnap.length - 1], scale: 'log',
      label: 'End of perfect scaling', format: fmt.int,
      onChange: function (v) { fig.set({ critical: v }, { transient: true }); },
      onSettle: function (v) { fig.set({ critical: v }); }
    });

    C.place(p, labelItems(s), ctx);
  }
  /* the curves' labels at the current choice of stretches */
  function labelItems(s) {
    return LABELS.map(function (L) {
      var item = { id: L.id, text: L.text, role: L.role, series: L.id, feature: lineFeature(s, L), captionNames: true };
      if (L.phone) item.phone = { text: L.phone };
      if (L.key) item.keySentence = true;
      return item;
    });
  }

  /* ---------- the direct labels of the curves ---------- */

  /* Each curve's label names the whole curve (the feature {of: series}) where the placer admits a
     position on it. The step and training-time curves coincide below the knee and pass through
     the window and the reader's line above it, so a label may instead name a stretch of its curve
     two doublings long, tried from the right end of the axis leftward by one doubling. After a
     settled draw, each label takes the first stretch at which the placer sets it in its full form
     (or its phone form in the phone layout), searched from the start at every settle, so that the
     positions depend on the settled state alone (DS §5.2). A held draw keeps the last choice. */
  var LABELS = [
    { id: 'training-time', text: 'training time', phone: 'time', role: 'model', y: 'lT', key: true },
    { id: 'steps', text: 'steps to the result', phone: 'steps', role: 'fourth', y: 'ls' },
    { id: 'time-per-step', text: 'time per step', role: 'third', y: 'lt' }
  ];
  var STRETCHES = (function () {
    var out = [null], lo = 3, hi = 14, width = 2;
    for (var a = hi - width; a >= lo - 1e-9; a -= 1) out.push([a * Math.LN2, (a + width) * Math.LN2]);
    return out;
  })();
  var choice = { 'training-time': 0, steps: 0, 'time-per-step': 0 };
  function lineFeature(s, L) {
    var r = STRETCHES[choice[L.id]] || null;
    if (!r) return { type: 'line', of: L.id };
    var pts = s.rows.filter(function (q) { return q.lb >= r[0] - 1e-9 && q.lb <= r[1] + 1e-9; })
      .map(function (q) { return [E(q.lb), E(q[L.y])]; });
    return { type: 'line', points: pts };
  }
  function formOf(p, id) {
    var e = TP.chart.labelReport(p).filter(function (x) { return x.id === id; })[0];
    return e && !e.fault ? e.form : 'dropped';
  }
  /* A stretch is tried by placing the labels again against the render's marks (TP.chart.tryPlace),
     which draws nothing: a search renders the panel once with every label on its whole curve, tries
     the stretches, and renders once more with the stretches chosen. Rendering for every stretch
     tried took up to 24 renders at a settle (critical batch size 16,384), over the 50-ms limit of a
     task. The choice depends on the settled state, the ghost and the panel's geometry and text size
     alone, so it is kept by those (settledKey): a settle whose key is kept renders once with the
     kept stretches, and searches again when a label's form differs from the kept one. */
  var settled = {}, settledCount = 0;
  function settledKey(p) {
    var s = cur, g = curCtx.ghost, gl = g && g.rows && Math.abs(g.lc - s.lc) > 1e-9 ? g.lc : '';
    return [s.critical, s.batch, gl, p.width, p.height, p.phone, p.h, TP.chart.measureText('steps to the result', 'label', p).w].join('|');
  }
  function settleLabels(p) {
    var good = function (f) { return f === 'full' || (p.phone && f === 'phone'); };
    var key = settledKey(p), kept = settled[key];
    if (kept) {
      LABELS.forEach(function (L) { choice[L.id] = kept.choice[L.id]; });
      p.update();
      if (LABELS.every(function (L) { return formOf(p, L.id) === kept.form[L.id]; })) return;
    }
    LABELS.forEach(function (L) { choice[L.id] = 0; });
    p.update();
    /* dirty: the choices differ from those of the last render, whose report formOf reads */
    var dirty = false;
    var form = function (id) {
      if (dirty) {
        var r = TP.chart.tryPlace ? TP.chart.tryPlace(p, labelItems(cur), curCtx, [id]) : null;
        if (r) { var e = r.filter(function (x) { return x.id === id; })[0]; return e && !e.fault ? e.form : 'dropped'; }
        p.update();
        dirty = false;
      }
      return formOf(p, id);
    };
    LABELS.forEach(function (L) {
      if (good(form(L.id))) return;
      var fallback = null;
      for (var i = 1; i < STRETCHES.length; i++) {
        choice[L.id] = i;
        dirty = true;
        var f = form(L.id);
        if (good(f)) return;
        if (fallback == null && f !== 'dropped') fallback = i;
      }
      choice[L.id] = fallback == null ? 0 : fallback;
      dirty = true;
    });
    if (dirty) p.update();
    if (settledCount > 400) { settled = {}; settledCount = 0; }
    var rec = { choice: {}, form: {} };
    LABELS.forEach(function (L) { rec.choice[L.id] = choice[L.id]; rec.form[L.id] = formOf(p, L.id); });
    settled[key] = rec; settledCount++;
  }

  /* The window's name in as few lines as the window's widest stretch holds, from one line to four.
     The reader's line and the knee's level cross the window at some states, and a region's name
     keeps 1 h clear of both (DS §5.2), so the stretch is the widest part between them. */
  var WINDOW_NAMES = [
    ['within 5% of the minimum'],
    ['within 5% of the', 'minimum'],
    ['within 5%', 'of the minimum'],
    ['within 5%', 'of the', 'minimum']
  ];
  var WINDOW_PHONE = [['within 5%']];
  function windowName(p, lo, hi, cuts) {
    var X0 = Math.max(0, p.x(lo)), X1 = Math.min(p.width, p.x(hi)), pad = 0.25 * p.h + 1;
    var edges = [{ X: X0, gap: pad }];
    (cuts || []).map(function (v) { return p.x(v); }).filter(function (X) { return X > X0 && X < X1; })
      .sort(function (a, b) { return a - b; }).forEach(function (X) { edges.push({ X: X, gap: p.h + 2 }); });
    edges.push({ X: X1, gap: pad });
    var room = 0;
    for (var k = 1; k < edges.length; k++) room = Math.max(room, edges[k].X - edges[k - 1].X - edges[k].gap - edges[k - 1].gap);
    var fit = function (list) {
      for (var i = 0; i < list.length; i++) if (TP.chart.measureText(list[i], 'label', p).w <= room) return list[i];
      return list[list.length - 1];
    };
    var full = fit(WINDOW_NAMES), phone = fit(WINDOW_PHONE);
    return { full: full.length === 1 ? full[0] : full, phone: phone.length === 1 ? phone[0] : phone };
  }

  function draw(state, ctx) {
    if (!pa) build(ctx.fig);
    cur = state;
    curCtx = ctx || { hold: false };
    /* a settled draw renders in the label search alone */
    if (state && !curCtx.hold) settleLabels(pa);
    else pa.update();
  }

  /* ---------- readout, table, quantities ---------- */

  function readout(state) {
    var lead = 'With perfect scaling ending at ' + fmt.int(state.critical) + ', training time is shortest near batch size ' +
      fmt.int(Math.exp(state.lmin)) + '. ';
    return lead + (state.excess < 0.005 ? 'Batch size ' + fmt.int(state.batch) + ' is at that minimum.'
      : 'At batch size ' + fmt.int(state.batch) + ' it is ' + fmt.pct(state.excess) + ' above the minimum.');
  }

  function table(state) {
    var q = measure(state.critical, state.batch), M = S();
    return {
      columns: [
        { key: 'b', label: 'Batch size', format: fmt.int },
        { key: 't', label: 'Time per step, relative to batch size 8', format: fmt.rel },
        { key: 's', label: 'Steps to the result, relative to batch size 8', format: fmt.rel },
        { key: 'T', label: 'Training time, relative to batch size 8', format: fmt.rel },
        { key: 'x', label: 'Above the minimum', format: fmt.pct },
        { key: 'note', label: 'Marked' }
      ],
      rows: powers(CAL.domains.a.x[0], CAL.domains.a.x[1]).map(function (B) {
        var v = M.normalized(B, q.bCrit, q.knee), x = v.trainingTime / q.tMin - 1, notes = [];
        if (x <= M.WINDOW) notes.push('within 5% of the minimum');
        if (B === q.knee) notes.push('the accelerator saturates');
        if (B === q.critical) notes.push('the critical batch size');
        if (B === q.batch) notes.push('the reader\'s batch size');
        return { b: B, t: v.timePerStep, s: v.steps, T: v.trainingTime, x: x, note: notes.join('; ') };
      }),
      caption: 'The three curves at each plotted batch size, with a critical batch size of ' + fmt.int(q.critical) +
        '. Training time is lowest at batch size ' + fmt.int(q.min) + ', ' + fmt.rel(q.tMin) + ' of its value at batch size 8, and stays within 5% of that from ' +
        fmt.int(q.lo) + ' to ' + fmt.int(q.hi) + ', a factor of ' + fmt.times(q.ratio) + ' in batch size'
    };
  }

  function quantities(state) {
    var q = measure(state.critical, state.batch);
    var out = {
      critical: q.critical, 'b-crit': q.bCrit, minimum: q.min, 'window-low': q.lo, 'window-high': q.hi,
      'window-ratio': q.ratio, excess: q.excess, batch: q.batch, knee: q.knee,
      'window-batch-low': q.insideLow, 'window-batch-high': q.insideHigh
    };
    var m = (CAL.quantities && CAL.quantities.model) || {};
    Object.keys(m).forEach(function (name) { if (!(name in out)) out[name] = m[name]; });
    return out;
  }

  function init(element) {
    var cSnap = powers(CAL.domains.critical[0], CAL.domains.critical[1]);
    var bSnap = powers(CAL.domains.a.x[0], CAL.domains.a.x[1]);
    fig = TP.fig(element, {
      kind: 'fixed',
      params: {
        critical: {
          type: 'number', default: CAL.defaults.critical, domain: CAL.domains.critical.slice(), snap: cSnap, scale: 'log',
          change: 'transition', ghost: true, label: 'End of perfect scaling', control: 'handle', handle: 'a', format: fmt.int
        },
        batch: {
          type: 'number', default: CAL.defaults.batch, domain: CAL.domains.a.x.slice(), snap: bSnap, scale: 'log',
          change: 'transition', ghost: false, label: 'Batch size', control: 'handle', handle: 'a', format: fmt.int
        }
      },
      presets: {
        'steps halve well past saturation': { key: 'inside', critical: CAL.presets.inside.critical },
        'steps stop halving before saturation': { key: 'beyond', critical: CAL.presets.beyond.critical }
      },
      states: CAL.states,
      apply: apply,
      draw: draw,
      readout: readout,
      table: table,
      quantities: quantities
    });
  }

  document.addEventListener('tp:ready', function () {
    var el = document.getElementById(ID);
    if (el) init(el);
  });
})();
