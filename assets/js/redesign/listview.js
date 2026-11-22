/* Generic interactive list: search + filter chips + sort + load-more + grouping + chart triggers.
   Dependency-free progressive enhancement over pre-rendered DOM:
   with JS off every card stays visible and the page is fully usable.

   Markup contract — wrap a list area in a root element:
     <div data-listview data-lv-batch="20" data-lv-sort="year">
       <section data-lv-pinned>…</section>              (optional; hidden while filtering)
       <input data-lv-search>                           (optional)
       <select data-lv-sort-control>…</select>          (optional; values match sort keys)
       <div data-lv-filters> <button class="chip" data-cat="all" aria-pressed="true">…</button> … </div>
       <div data-lv-active class="lv-active-bar" hidden></div> (optional; created dynamically)
       <p data-lv-status role="status" aria-live="polite" class="sr-only"></p>
       <div data-lv-list>
         <article data-lv-item data-cat="a b" data-search="lowercased text"
                  data-year="2020" data-num="2162" data-title="lowercased">…</article>
       </div>
       <p data-lv-empty hidden>… <button data-lv-reset>Show all</button></p>
       <button data-lv-more>Load more</button>          (optional; omit/leave batch=0 to show all)
     </div>

   External chart/metric triggers: any <button data-lv-trigger> anywhere in the document
   can set data-lv-cat / data-lv-facet / data-lv-year / data-lv-query (and optional
   data-lv-target="#selector") to cross-filter the listview bidirectionally. */
(function () {
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const URL_FACET_PARAMS = ['cat', 'role', 'theme', 'stage', 'domain', 'status'];

  function initRoot(root, rootIdx) {
    const groupEls = Array.from(root.querySelectorAll('[data-lv-group]'));
    groupEls.forEach(g => {
      if (g.tagName === 'DETAILS') g.dataset.defaultOpen = g.open ? '1' : '0';
    });
    const sectionEls = Array.from(root.querySelectorAll('[data-lv-section]'));
    const grouped = groupEls.length > 0;
    const list = root.querySelector('[data-lv-list]');
    if (!grouped && !list) return;

    const items = grouped
      ? Array.from(root.querySelectorAll('[data-lv-item]'))
      : Array.from(list.querySelectorAll('[data-lv-item]'));
    const searchEl = root.querySelector('[data-lv-search]');
    const sortEl = root.querySelector('[data-lv-sort-control]');
    const filterEls = Array.from(root.querySelectorAll('[data-lv-filters]'));
    const emptyEl = root.querySelector('[data-lv-empty]');
    const moreEl = root.querySelector('[data-lv-more]');
    const resetEl = root.querySelector('[data-lv-reset]');
    const statusEl = root.querySelector('[data-lv-status]');
    const pinnedEls = Array.from(root.querySelectorAll('[data-lv-pinned]'));
    const batch = parseInt(root.dataset.lvBatch || '0', 10) || 0; // 0 = show all
    const origin = items.slice(); // original (pre-rendered) order

    let activeEl = root.querySelector('[data-lv-active]');
    if (!activeEl) {
      activeEl = document.createElement('div');
      activeEl.className = 'lv-active-bar';
      activeEl.setAttribute('data-lv-active', '');
      activeEl.hidden = true;
      if (statusEl && statusEl.parentNode) {
        statusEl.parentNode.insertBefore(activeEl, statusEl);
      } else {
        root.prepend(activeEl);
      }
    }

    const triggers = Array.from(document.querySelectorAll('[data-lv-trigger]')).filter(btn => {
      const targetSel = btn.dataset.lvTarget;
      if (targetSel) {
        try { return document.querySelector(targetSel) === root; }
        catch (err) { return false; }
      }
      return rootIdx === 0;
    });

    // One selected category per filter group; groups are ANDed.
    const picks = filterEls.map(() => 'all');
    const state = {
      q: '',
      year: '',
      facet: null,
      sort: root.dataset.lvSort || 'default',
      shown: batch || items.length,
    };

    function cats(el) { return (el.dataset.cat || '').split(/\s+/).filter(Boolean); }
    function filtering() {
      return state.q !== '' || state.year !== '' || state.facet !== null || picks.some(p => p !== 'all');
    }

    function findChipGroup(tok) {
      for (let gi = 0; gi < filterEls.length; gi++) {
        const match = Array.from(filterEls[gi].querySelectorAll('.chip')).find(c => (c.dataset.cat || '') === tok);
        if (match) return { gi, el: filterEls[gi], chip: match };
      }
      return null;
    }

    function passes(el) {
      if (state.q !== '' && (el.dataset.search || '').indexOf(state.q) === -1) return false;
      if (state.year !== '' && (el.dataset.year || '').trim() !== state.year) return false;
      const own = cats(el);
      if (state.facet && own.indexOf(state.facet.token) === -1) return false;
      for (let i = 0; i < picks.length; i++) {
        if (picks[i] !== 'all' && own.indexOf(picks[i]) === -1) return false;
      }
      return true;
    }

    function visibleIn(scope) {
      return scope.querySelectorAll('[data-lv-item]:not(.is-hidden)').length;
    }

    function triggerActive(btn) {
      if (btn.dataset.lvYear) return state.year === btn.dataset.lvYear;
      if (btn.dataset.lvFacet) return Boolean(state.facet && state.facet.token === btn.dataset.lvFacet);
      if (btn.dataset.lvQuery) return state.q !== '' && state.q === btn.dataset.lvQuery.trim().toLowerCase();
      const cat = btn.dataset.lvCat;
      if (cat === 'all') return !filtering();
      if (cat) {
        const found = findChipGroup(cat);
        if (found) return picks[found.gi] === cat;
        return Boolean(state.facet && state.facet.token === cat);
      }
      return false;
    }

    function syncTriggers() {
      triggers.forEach(btn => {
        const on = triggerActive(btn);
        btn.classList.toggle('is-active', on);
        if (btn.hasAttribute('aria-pressed')) {
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
      });
    }

    function renderActiveBar() {
      if (!activeEl) return;
      activeEl.textContent = '';
      if (!state.year && !state.facet) {
        activeEl.hidden = true;
        return;
      }
      activeEl.hidden = false;
      const lbl = document.createElement('span');
      lbl.className = 'lv-active-label';
      lbl.textContent = 'Chart filter:';
      activeEl.appendChild(lbl);

      if (state.year) {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'lv-active-pill';
        pill.setAttribute('aria-label', 'Clear year filter ' + state.year);
        pill.textContent = 'Year: ' + state.year + ' ×';
        pill.addEventListener('click', () => {
          state.year = '';
          resetPaging();
          compute();
        });
        activeEl.appendChild(pill);
      }

      if (state.facet) {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = 'lv-active-pill';
        pill.setAttribute('aria-label', 'Clear filter ' + state.facet.label);
        pill.textContent = state.facet.label + ' ×';
        pill.addEventListener('click', () => {
          state.facet = null;
          resetPaging();
          compute();
        });
        activeEl.appendChild(pill);
      }

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'lv-active-clear';
      clearBtn.textContent = 'Reset chart filters';
      clearBtn.addEventListener('click', () => {
        state.year = '';
        state.facet = null;
        resetPaging();
        compute();
      });
      activeEl.appendChild(clearBtn);
    }

    function compute() {
      const matched = origin.filter(passes);

      if (!grouped) {                                     // sort + reorder (flat lists only)
        const s = state.sort;
        if (s === 'year') matched.sort((a, b) => (+b.dataset.year - +a.dataset.year) || (+b.dataset.num - +a.dataset.num));
        else if (s === 'num') matched.sort((a, b) => (+b.dataset.num - +a.dataset.num));
        else if (s === 'az') matched.sort((a, b) => (a.dataset.title || '').localeCompare(b.dataset.title || ''));
        const matchedSet = new Set(matched);
        matched.forEach(el => list.appendChild(el));
        origin.forEach(el => { if (!matchedSet.has(el)) list.appendChild(el); });
      }

      const limit = batch ? state.shown : matched.length;
      const visible = new Set(matched.slice(0, limit));
      origin.forEach(el => el.classList.toggle('is-hidden', !visible.has(el)));

      const active = filtering();

      if (grouped) {
        groupEls.forEach(g => {
          const n = visibleIn(g);
          g.classList.toggle('is-hidden', n === 0);
          if (g.tagName === 'DETAILS') {
            g.open = active ? n > 0 : g.dataset.defaultOpen === '1';
          }
          const c = g.querySelector('[data-lv-count]');
          if (c) c.textContent = n;
        });
        sectionEls.forEach(s => {
          const n = visibleIn(s);
          s.classList.toggle('is-hidden', n === 0);
          const c = s.querySelector('[data-lv-seccount]');
          if (c) c.textContent = n;
        });
      }

      pinnedEls.forEach(el => el.classList.toggle('is-hidden', active));
      if (emptyEl) emptyEl.hidden = matched.length > 0;
      if (moreEl) moreEl.hidden = !batch || state.shown >= matched.length || matched.length === 0;
      if (statusEl) statusEl.textContent = visible.size + ' of ' + origin.length + ' shown';
      renderActiveBar();
      syncTriggers();
    }

    function resetPaging() { state.shown = batch || origin.length; }

    function syncChips(el, pick) {
      el.querySelectorAll('.chip').forEach(c => {
        const on = (c.dataset.cat || 'all') === pick;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    function resetAll() {
      state.q = '';
      state.year = '';
      state.facet = null;
      resetPaging();
      if (searchEl) searchEl.value = '';
      filterEls.forEach((el, gi) => { picks[gi] = 'all'; syncChips(el, 'all'); });
      compute();
    }

    function maybeScrollToList(btn) {
      if (btn.dataset.lvScroll === '0') return;
      const target = root.querySelector('.pub-controls') || root;
      const rect = target.getBoundingClientRect();
      if (rect.top > window.innerHeight * 0.78) {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }

    if (searchEl) searchEl.addEventListener('input', () => {
      state.q = searchEl.value.trim().toLowerCase(); resetPaging(); compute();
    });
    if (sortEl) sortEl.addEventListener('change', () => { state.sort = sortEl.value; compute(); });
    filterEls.forEach((el, gi) => el.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip || !el.contains(chip)) return;
      picks[gi] = chip.dataset.cat || 'all';
      resetPaging();
      syncChips(el, picks[gi]);
      compute();
    }));
    if (moreEl) moreEl.addEventListener('click', () => { state.shown += (batch || 0); compute(); });
    if (resetEl) resetEl.addEventListener('click', resetAll);

    triggers.forEach(btn => btn.addEventListener('click', () => {
      let activated = false;
      if (btn.dataset.lvYear) {
        const y = btn.dataset.lvYear.trim();
        activated = state.year !== y;
        state.year = activated ? y : '';
      } else if (btn.dataset.lvFacet) {
        const tok = btn.dataset.lvFacet.trim();
        const same = Boolean(state.facet && state.facet.token === tok);
        activated = !same;
        state.facet = same ? null : { token: tok, label: btn.dataset.lvLabel || tok };
      } else if (btn.dataset.lvQuery) {
        const raw = btn.dataset.lvQuery.trim();
        const low = raw.toLowerCase();
        activated = state.q !== low;
        state.q = activated ? low : '';
        if (searchEl) searchEl.value = activated ? raw : '';
      } else if (btn.dataset.lvCat) {
        const tok = btn.dataset.lvCat.trim();
        if (tok === 'all') {
          resetAll();
          return;
        }
        const found = findChipGroup(tok);
        if (found) {
          activated = picks[found.gi] !== tok;
          picks[found.gi] = activated ? tok : 'all';
          syncChips(found.el, picks[found.gi]);
        } else {
          const same = Boolean(state.facet && state.facet.token === tok);
          activated = !same;
          state.facet = same ? null : { token: tok, label: btn.dataset.lvLabel || btn.textContent.trim() };
        }
      }
      resetPaging();
      compute();
      if (activated) maybeScrollToList(btn);
    }));

    // Read initial query parameters for deep-linking (only on primary listview unless addressed by id)
    if (rootIdx === 0 && window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      URL_FACET_PARAMS.forEach(k => {
        const raw = (params.get(k) || '').trim();
        if (!raw) return;
        const found = findChipGroup(raw) || ((k === 'role' || k === 'theme') ? findChipGroup(k + '-' + raw) : null);
        if (found) {
          picks[found.gi] = found.chip.dataset.cat || raw;
          syncChips(found.el, picks[found.gi]);
        } else {
          const facetTok = (k === 'role' || k === 'theme') && raw.indexOf(k + '-') !== 0 ? k + '-' + raw : raw;
          state.facet = { token: facetTok, label: raw };
        }
      });
      const py = (params.get('year') || '').trim();
      if (/^\d{4}$/.test(py)) state.year = py;
      const pq = (params.get('q') || '').trim();
      if (pq) {
        state.q = pq.toLowerCase();
        if (searchEl) searchEl.value = pq;
      }
    }

    compute();
  }

  function initTimelineExpand() {
    document.querySelectorAll('[data-tm-expand]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const key = btn.getAttribute('data-tm-expand');
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.querySelectorAll('[data-tm-sub="' + key + '"]').forEach(function (row) {
          row.classList.toggle('is-hidden', !open);
        });
      });
    });
  }

  const printOpened = [];
  window.addEventListener('beforeprint', function () {
    printOpened.length = 0;
    document.querySelectorAll('details[data-lv-group], details.pub-fig-note-details').forEach(function (d) {
      if (!d.open) {
        d.open = true;
        printOpened.push(d);
      }
    });
  });
  window.addEventListener('afterprint', function () {
    while (printOpened.length) {
      printOpened.pop().open = false;
    }
  });

  function init() {
    document.querySelectorAll('[data-listview]').forEach((root, idx) => initRoot(root, idx));
    initTimelineExpand();
  }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
