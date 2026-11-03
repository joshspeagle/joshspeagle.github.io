/* Reference page: the sticky bar's filter and section menu.

   The filter hides every [data-filter] item (rules, table rows, glossary terms) whose text does
   not contain all of the typed words, hides a rule group with no match, shows a section's
   p.ref-empty when none of its items match, and reports the counts with links to the sections.
   Escape clears the filter, and "/" focuses it from anywhere outside a form field. The bar's
   height is written to --ref-bar-h so that anchors land below it. */
(function (global) {
  'use strict';
  var doc = global.document;

  function norm(s) {
    return (s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/_/g, ' ').replace(/\s+/g, ' ');
  }

  function init() {
    var main = doc.querySelector('main.ref-page');
    var bar = doc.querySelector('nav.ref-bar');
    var input = doc.getElementById('ref-filter');
    var status = doc.getElementById('ref-filter-status');
    var select = doc.getElementById('ref-jump-select');
    if (!main || !bar || !input || !status) return;

    /* the bar's height, for scroll-margin-top */
    function measure() {
      main.style.setProperty('--ref-bar-h', Math.ceil(bar.getBoundingClientRect().height) + 'px');
    }
    measure();
    if (global.ResizeObserver) new global.ResizeObserver(measure).observe(bar);

    /* index the filterable items once, after KaTeX has rendered (the text then holds the TeX
       annotation, so a query such as "beta_1" or "epsilon" still matches) */
    var sections = [];
    Array.prototype.forEach.call(main.querySelectorAll('section'), function (sec) {
      var items = Array.prototype.map.call(sec.querySelectorAll('[data-filter]'), function (el) {
        return { el: el, text: norm(el.textContent), core: el.hasAttribute('data-core') };
      });
      if (!items.length) return;
      var h2 = sec.querySelector('h2');
      sections.push({
        sec: sec, items: items,
        groups: Array.prototype.slice.call(sec.querySelectorAll('[data-filter-group]')),
        empty: sec.querySelector('.ref-empty'),
        name: h2 ? h2.textContent.replace(/\s+/g, ' ').trim() : sec.id
      });
    });

    var short = { rules: 'Rules', retune: 'Re-tuning', 'symptom-triage': 'Symptoms', glossary: 'Glossary' };
    var coreOnly = false;
    var scopeBtns = Array.prototype.slice.call(main.querySelectorAll('[data-rule-scope]'));

    function setScope(mode) {
      coreOnly = mode === 'core';
      scopeBtns.forEach(function (btn) {
        var on = btn.getAttribute('data-rule-scope') === (coreOnly ? 'core' : 'all');
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      apply();
    }
    scopeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setScope(btn.getAttribute('data-rule-scope'));
      });
    });

    function apply() {
      var words = norm(input.value).trim().split(' ').filter(Boolean);
      var active = words.length > 0;
      var parts = [];
      var total = 0;
      sections.forEach(function (s) {
        var isRules = s.sec.id === 'rules';
        var shown = 0;
        s.items.forEach(function (it) {
          var scopeHit = !isRules || !coreOnly || it.core;
          var textHit = !active || words.every(function (w) { return it.text.indexOf(w) >= 0; });
          var hit = scopeHit && textHit;
          it.el.hidden = !hit;
          if (hit) shown++;
        });
        s.groups.forEach(function (g) {
          g.hidden = (active || (isRules && coreOnly)) && !g.querySelector('[data-filter]:not([hidden])');
        });
        if (s.empty) s.empty.hidden = !active || shown > 0;
        if (active) {
          total += shown;
          if (shown) parts.push({ id: s.sec.id, label: (short[s.sec.id] || s.name) + ' ' + shown });
        }
      });
      status.textContent = '';
      if (active) {
        status.appendChild(doc.createTextNode(total ? total + (total === 1 ? ' match' : ' matches') : 'No matches'));
        parts.forEach(function (p) {
          var a = doc.createElement('a');
          a.href = '#' + p.id;
          a.textContent = p.label;
          status.appendChild(doc.createTextNode(' '));
          status.appendChild(a);
        });
      }
      measure();
    }

    var t = 0;
    input.addEventListener('input', function () {
      global.clearTimeout(t);
      t = global.setTimeout(apply, 80);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && input.value) {
        input.value = '';
        apply();
        e.preventDefault();
      } else if (e.key === 'Enter') {
        /* Enter jumps to the first section with a match */
        var first = status.querySelector('a');
        if (first) { e.preventDefault(); global.location.hash = first.getAttribute('href'); }
      }
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      var tg = e.target;
      if (tg && (tg.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(tg.tagName))) return;
      e.preventDefault();
      input.focus();
      input.select();
    });

    /* A link from a post lands here before KaTeX and the references have laid out, so the browser's
       first jump misses. Repeat it once the page has settled. */
    var hash = global.location.hash.slice(1);
    var hashTarget = hash && doc.getElementById(decodeURIComponent(hash));
    if (hashTarget) {
      global.requestAnimationFrame(function () {
        hashTarget.scrollIntoView({ block: 'start' });
      });
    }

    /* following a link to an item the filter hides clears the filter */
    global.addEventListener('hashchange', function () {
      var el = doc.getElementById(decodeURIComponent(global.location.hash.slice(1)));
      if (!el) return;
      if (el.closest('[hidden]') || el.hidden) {
        input.value = '';
        if (coreOnly) setScope('all');
        else apply();
        el.scrollIntoView({ block: 'start' });
      }
    });

    if (select) {
      select.addEventListener('change', function () {
        var id = select.value;
        select.value = '';
        if (!id) return;
        var target = doc.getElementById(id);
        if (!target) return;
        global.location.hash = id;
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    }
  }

  /* site.js renders KaTeX and the references on DOMContentLoaded; index after it */
  function start() { global.setTimeout(init, 0); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})(typeof window !== 'undefined' ? window : this);
