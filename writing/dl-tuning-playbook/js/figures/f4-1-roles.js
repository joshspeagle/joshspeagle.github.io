/*
 * f4-1-roles.js: the roles exercise on page 1 (#fig-roles).
 *
 * 2026-11 review (post01): rewritten. The v4 matrix (eleven rows by three goals, an inspector card and
 * "key insight" pills) crashed on load (a null cell's .answer), showed "? click to set" in every cell
 * and cut off its third column at desktop width. This version shows one goal at a time:
 *   - a segment control picks the goal (the three goals of TP.roles, the Playbook's own examples);
 *   - a second segment switches between "Show the roles" and "Test yourself";
 *   - each hyperparameter that exists under the goal is one row, with its three role buttons;
 *   - pressing a row's name or a role opens a short explanation under the row: a plain sentence
 *     (written for this page), the Playbook's reason (a verbatim quotation from TP.roles, checked
 *     against the README by tests/lib/roles.test.js) and, where the reader pressed or picked another
 *     role, the Playbook-based reason against it.
 * In "Test yourself" the roles are hidden until the reader picks one, and each pick is marked at once
 * as matching, also acceptable, or different. Picks are kept per goal in the figure's own state
 * (snapshot, restore, clear), never in the URL.
 *
 * The data are TP.roles (site/js/lib/roles.js), unchanged. CAL keeps the quantities the page cites.
 */
(function () {
  'use strict';
  var TP = window.TP = window.TP || {};

  /* BEGIN GENERATED table-cal */
  // From tests/calibration/out/fig-roles.json by npm run generate (tests/lib/write-generated.js).
  var CAL = {
    "defaults": {},
    "presets": {},
    "states": {},
    "trials": {"goal": "g2", "perValue": 12},
    "domains": {},
    "tables": {},
    "quantities": {"model": {"trials-goal": 2, "trials-per-value": 12, "changing-rows": 4}}
  };
  /* END GENERATED table-cal */

  var ID = 'fig-roles';
  var LABEL = { scientific: 'Scientific', nuisance: 'Nuisance', fixed: 'Fixed' };
  var SHORT = { scientific: 'sci', nuisance: 'nuis', fixed: 'fixed' };

  var GOALS = {
    g1: { tab: 'Add dropout?', head: 'Should we add dropout?',
      context: 'The pipeline trains with Nesterov momentum, weight decay and ReLU, and has no dropout yet.' },
    g2: { tab: 'More layers?', head: 'Do more hidden layers reduce validation error?',
      context: 'Dropout was adopted in an earlier round. Each depth gets a study of ' + CAL.trials.perValue + ' trials.' },
    g3: { tab: 'Adam or Nesterov?', head: 'Which optimizer gives the lower validation error, Adam or Nesterov momentum?',
      context: 'The pipeline has weight decay and no dropout. Each optimizer brings its own settings.' }
  };

  /* One plain sentence per cell, written for this page. Keys are row:goal. */
  var PLAIN = {
    'optimizer:g1': 'This round does not compare optimizers, so it keeps the current one. The answer then holds for that optimizer.',
    'optimizer:g2': 'This round does not compare optimizers, so it keeps the current one. The answer then holds for that optimizer.',
    'optimizer:g3': 'Comparing the two optimizers is the question of the round.',
    'learning_rate:g1': 'Its best value can move when dropout is added, so each setting of dropout gets its own learning-rate search.',
    'learning_rate:g2': 'The best learning rate generally depends on the architecture, so each depth gets its own search.',
    'lr_nesterov:g3': 'Nesterov momentum gets its own learning-rate search.',
    'lr_adam:g3': 'Adam gets its own learning-rate search, since good learning rates for the two optimizers can differ by orders of magnitude.',
    'momentum:g1': 'An optimizer setting that may interact with the change. Tune it if the budget allows. Fixing it is acceptable, with a caveat.',
    'momentum:g2': 'With 12 trials per depth, the exercise saves trials by fixing momentum. Tuning it is also defensible.',
    'momentum:g3': 'Momentum exists only under Nesterov momentum, so it is tuned within that optimizer\'s study.',
    'adam_betas_epsilon:g3': 'These exist only under Adam. The Playbook\'s rule of thumb tunes more of them as the number of trials grows.',
    'weight_decay:g1': 'Regularization strengths are usually nuisance hyperparameters. Fixing it is acceptable, with a caveat.',
    'weight_decay:g2': 'The best weight decay typically depends on model size, so a single fixed value would favor some depths.',
    'weight_decay:g3': 'Regularization strengths are usually nuisance hyperparameters. Fixing it is acceptable, with a caveat.',
    'dropout:g1': 'Whether to add dropout is the question of the round.',
    'dropout:g2': 'An earlier round adopted dropout, so it stays on.',
    'dropout:g3': 'This pipeline has no dropout. Adding it would be a second change in a comparison of optimizers.',
    'dropout_rate:g1': 'The rate exists only when dropout is on. It is tuned so that dropout is judged at a good rate.',
    'dropout_rate:g2': 'Once dropout is adopted, the Playbook makes its rate a nuisance hyperparameter. Fixing it to save trials is also acceptable here.',
    'num_hidden_layers:g1': 'Depth changes training speed and memory use, so it stays fixed unless depth is the question.',
    'num_hidden_layers:g2': 'The number of hidden layers is the question of the round.',
    'num_hidden_layers:g3': 'Depth changes training speed and memory use, so it stays fixed unless depth is the question.',
    'activation_function:g1': 'Fixing it costs no trials, and the answer then holds for ReLU. Tuning it per option is also acceptable.',
    'activation_function:g2': 'Fixing it costs no trials, and the answer then holds for ReLU. Tuning it for each depth is also acceptable.',
    'activation_function:g3': 'Fixing it costs no trials. Tuning it for each optimizer is also acceptable.'
  };

  var doc = document;
  function el(tag, attrs, kids) {
    var n = doc.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (attrs[k] == null || attrs[k] === false) return;
      if (k === 'class') n.className = attrs[k]; else n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    });
    (kids == null ? [] : Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
    });
    return n;
  }
  function lineUrl(ref) { return TP.playbookRawLineUrl ? TP.playbookRawLineUrl(ref[0] + '-' + ref[1]) : null; }

  /* A note of TP.roles (a list of parts) as DOM: quotations in quotation marks, line references as
     a link labelled "Playbook", code as <code>, italics as <em>. */
  function parts(p, out) {
    out = out || doc.createDocumentFragment();
    if (p == null) return out;
    if (typeof p === 'string') { out.appendChild(doc.createTextNode(p)); return out; }
    if (Array.isArray(p)) { p.forEach(function (x) { parts(x, out); }); return out; }
    if (p.q != null) {
      out.appendChild(doc.createTextNode('“'));
      parts(p.q, out);
      out.appendChild(doc.createTextNode('”'));
      return out;
    }
    if (p.code != null) { out.appendChild(el('code', null, p.code)); return out; }
    if (p.i != null) { out.appendChild(el('em', null, p.i)); return out; }
    if (p.ref) {
      var u = lineUrl(p.ref);
      out.appendChild(u ? el('a', { href: u, target: '_blank', rel: 'noopener' }, 'Playbook ↗') : doc.createTextNode('Playbook'));
      return out;
    }
    return out;
  }

  function rowsOf(goal) {
    return TP.roles.rows.filter(function (r) { return r.cells[goal]; });
  }

  /* ---------- the figure's own state ---------- */
  var fig = null, box = null;
  var picks = { g1: {}, g2: {}, g3: {} };   // the reader's roles in "Test yourself", per goal
  var open = {};                            // the open row per goal, and the role pressed in it
  var focusKey = null;

  function verdict(c, role) { return TP.roles.classify(c, role); }

  function explanation(row, goal, mode, pressed) {
    var c = row.cells[goal], wrap = el('div', { class: 'rl-why', id: 'rl-why-' + row.id });
    var shownRole = mode === 'quiz' ? pressed : c.role;
    if (mode === 'quiz' && pressed) {
      var v = verdict(c, pressed);
      var msg = v === 'match' ? 'Matches the Playbook-based answer.' :
        v === 'accepted' ? 'Also acceptable. The preferred answer is ' + LABEL[c.role].toLowerCase() + '.' :
          'The Playbook-based answer is ' + LABEL[c.role].toLowerCase() + '.';
      wrap.appendChild(el('p', { class: 'rl-verdict rl-' + v }, msg));
    }
    if (mode === 'show' || pressed) {
      wrap.appendChild(el('p', { class: 'rl-plain' }, [el('strong', null, LABEL[c.role] + '. '), PLAIN[row.id + ':' + goal] || '']));
      var q = el('p', { class: 'rl-quote' }, [el('span', { class: 'rl-src' }, 'The Playbook: '), parts(c.reason)]);
      var u = lineUrl(c.reason.ref);
      if (u) { q.appendChild(doc.createTextNode(' ')); q.appendChild(el('a', { href: u, target: '_blank', rel: 'noopener' }, '↗')); }
      wrap.appendChild(q);
      var other = pressed && pressed !== c.role ? pressed : null;
      if (other) {
        var note = c.alt[other] || c.why[other];
        if (note) wrap.appendChild(el('p', { class: 'rl-other' }, [el('strong', null, (c.alt[other] ? 'Why ' : 'Why not ') + LABEL[other].toLowerCase() + '? '), parts(note)]));
      }
      if (c.choice) wrap.appendChild(el('p', { class: 'rl-choice' }, 'The Playbook leaves this choice open. The role shown is this exercise\'s.'));
    }
    void shownRole;
    return wrap;
  }

  function render(state) {
    if (!box) return;
    var goal = state.goal, mode = state.mode, g = GOALS[goal];
    var active = doc.activeElement && box.contains(doc.activeElement) ? doc.activeElement.getAttribute('data-fk') : focusKey;
    box.innerHTML = '';
    box.appendChild(el('div', { class: 'rl-goal' }, [el('p', { class: 'rl-goal-q' }, g.head), el('p', { class: 'rl-goal-ctx' }, g.context)]));
    var legend = el('div', { class: 'rl-legend', 'aria-hidden': 'true' }, ['scientific', 'nuisance', 'fixed'].map(function (r) {
      return el('span', { class: 'rl-key rl-' + SHORT[r] }, LABEL[r]);
    }));
    box.appendChild(legend);
    var list = el('ul', { class: 'rl-list' });
    rowsOf(goal).forEach(function (row) {
      var c = row.cells[goal], o = open[goal] && open[goal].row === row.id ? open[goal] : null;
      var pick = picks[goal][row.id] || null;
      var li = el('li', { class: 'rl-row' + (o ? ' is-open' : ''), 'data-row': row.id });
      var name = el('button', { type: 'button', class: 'rl-name', 'aria-expanded': o ? 'true' : 'false', 'aria-controls': 'rl-why-' + row.id, 'data-fk': row.id + ':name' },
        [el('span', { class: 'rl-label' }, row.label), el('span', { class: 'rl-chev', 'aria-hidden': 'true' }, o ? '−' : '+')]);
      name.addEventListener('click', function () {
        open[goal] = o ? null : { row: row.id, role: mode === 'quiz' ? pick : null };
        focusKey = row.id + ':name';
        fig.redraw({ settle: true });
      });
      var roles = el('div', { class: 'rl-roles', role: 'group', 'aria-label': 'Role of ' + row.label });
      ['scientific', 'nuisance', 'fixed'].forEach(function (r) {
        var cls = 'rl-role rl-' + SHORT[r], pressed = false;
        if (mode === 'show') {
          if (r === c.role) { cls += ' is-answer'; pressed = true; }
          else if (c.accepted.indexOf(r) >= 0) cls += ' is-accepted';
        } else if (pick) {
          if (r === pick) { pressed = true; cls += ' is-picked rl-v-' + verdict(c, r); }
          if (r === c.role && pick !== c.role) cls += ' is-answer-reveal';
        }
        var b = el('button', { type: 'button', class: cls, 'aria-pressed': pressed ? 'true' : 'false', 'data-fk': row.id + ':' + r },
          [LABEL[r], mode === 'show' && c.accepted.indexOf(r) >= 0 ? el('span', { class: 'rl-also' }, ' (also ok)') : null]);
        b.addEventListener('click', function () {
          if (mode === 'quiz') picks[goal][row.id] = r;
          open[goal] = { row: row.id, role: r };
          focusKey = row.id + ':' + r;
          fig.redraw({ settle: true });
        });
        roles.appendChild(b);
      });
      li.appendChild(name);
      li.appendChild(roles);
      if (o) li.appendChild(explanation(row, goal, mode, mode === 'quiz' ? (pick || null) : o.role));
      list.appendChild(li);
    });
    box.appendChild(list);
    if (active) {
      var f = box.querySelector('[data-fk="' + active + '"]');
      if (f) f.focus({ preventScroll: true });
    }
    focusKey = null;
  }

  function summary(state) {
    var goal = state.goal, rows = rowsOf(goal);
    if (state.mode === 'quiz') {
      var n = 0, m = 0, a = 0;
      rows.forEach(function (r) {
        var p = picks[goal][r.id];
        if (!p) return;
        n++;
        var v = verdict(r.cells[goal], p);
        if (v === 'match') m++; else if (v === 'accepted') a++;
      });
      if (!n) return 'Pick a role for each of the ' + rows.length + ' hyperparameters. Each pick is checked at once.';
      return 'You have assigned ' + n + ' of ' + rows.length + ' hyperparameters. ' + m + ' match the Playbook-based answer' +
        (a ? ', and ' + a + ' ' + (a === 1 ? 'is' : 'are') + ' also acceptable' : '') + '.';
    }
    var by = { scientific: [], nuisance: [], fixed: [] };
    rows.forEach(function (r) { by[r.cells[goal].role].push(r.label); });
    var join = function (l) { return l.length < 2 ? l.join('') : l.slice(0, -1).join(', ') + ' and ' + l[l.length - 1]; };
    return 'For “' + GOALS[goal].tab + '” the scientific hyperparameter is ' + join(by.scientific) + '. Nuisance: ' + join(by.nuisance) + '. Fixed: ' + join(by.fixed) + '.';
  }

  document.addEventListener('tp:ready', function () {
    var elFig = doc.getElementById(ID);
    if (!elFig || !TP.fig || !TP.roles) return;
    fig = TP.fig(elFig, {
      kind: 'fixed',
      params: {
        goal: { type: 'choice', default: 'g1', domain: ['g1', 'g2', 'g3'], change: 'cut', control: 'segment', label: 'Goal of the round',
          labels: { g1: GOALS.g1.tab, g2: GOALS.g2.tab, g3: GOALS.g3.tab } },
        mode: { type: 'choice', default: 'show', domain: ['show', 'quiz'], change: 'cut', control: 'segment', label: 'Mode',
          labels: { show: 'Show the roles', quiz: 'Test yourself' } }
      },
      apply: function (values) { return { goal: values.goal, mode: values.mode }; },
      draw: function (state, ctx) {
        if (!box) { box = el('div', { class: 'rl' }); ctx.fig.panels.appendChild(box); }
        if (state) render(state);
      },
      readout: summary,
      table: function (state) {
        return {
          columns: [{ key: 'hp', label: 'Hyperparameter' }, { key: 'role', label: 'Role' }, { key: 'also', label: 'Also acceptable' }],
          rows: rowsOf(state.goal).map(function (r) {
            var c = r.cells[state.goal];
            return { hp: r.label, role: LABEL[c.role], also: c.accepted.map(function (x) { return LABEL[x]; }).join(', ') };
          }),
          caption: 'Roles under the goal “' + GOALS[state.goal].head + '”'
        };
      },
      quantities: function () { return Object.assign({}, CAL.quantities.model); },
      snapshot: function () { return { picks: JSON.parse(JSON.stringify(picks)), open: JSON.parse(JSON.stringify(open)) }; },
      restore: function (x) { if (x) { picks = x.picks || picks; open = x.open || {}; } },
      clear: function () { picks = { g1: {}, g2: {}, g3: {} }; open = {}; }
    });
  });
})();
