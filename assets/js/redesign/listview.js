/* Generic interactive list: search + filter chips + sort + load-more + grouping.
   Dependency-free, URL-less. Enhances pre-rendered DOM (progressive enhancement):
   with JS off every card stays visible and the page is fully usable.

   Markup contract — wrap a list area in a root element:
     <div data-listview data-lv-batch="20" data-lv-sort="year">
       <section data-lv-pinned>…</section>              (optional; hidden while filtering)
       <input data-lv-search>                           (optional)
       <select data-lv-sort-control>…</select>          (optional; values match sort keys)
       <div data-lv-filters> <button class="chip" data-cat="all" aria-pressed="true">…</button> … </div>
       <p data-lv-status role="status" aria-live="polite" class="sr-only"></p>
       <div data-lv-list>
         <article data-lv-item data-cat="a b" data-search="lowercased text"
                  data-year="2020" data-num="2162" data-title="lowercased">…</article>
       </div>
       <p data-lv-empty hidden>… <button data-lv-reset>Show all</button></p>
       <button data-lv-more>Load more</button>          (optional; omit/leave batch=0 to show all)
     </div>

   Filtering: EVERY [data-lv-filters] group is an independent single-select dimension,
   and the groups are ANDed (e.g. career stage AND current/former). A chip's data-cat
   matches an item when the item's space-separated data-cat set contains it; "all" matches
   everything. Sort keys: "year" (data-year desc, tie -> data-num desc), "num" (data-num
   desc), "az" (data-title asc), "default" (original DOM order).

   Grouped mode: if the root contains [data-lv-group] containers (optionally nested in
   [data-lv-section] blocks), items are filtered in place — groups and sections that end
   up empty are hidden, and their [data-lv-count] / [data-lv-seccount] spans are updated.
   Grouped mode keeps the pre-rendered order (no re-sorting across groups). */
(function () {
  function initRoot(root) {
    const groupEls = Array.from(root.querySelectorAll('[data-lv-group]'));
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

    // One selected category per filter group; groups are ANDed.
    const picks = filterEls.map(() => 'all');
    const state = { q: '', sort: root.dataset.lvSort || 'default', shown: batch || items.length };

    function cats(el) { return (el.dataset.cat || '').split(/\s+/).filter(Boolean); }
    function filtering() { return state.q !== '' || picks.some(function (p) { return p !== 'all'; }); }

    function passes(el) {
      if (state.q !== '' && (el.dataset.search || '').indexOf(state.q) === -1) return false;
      const own = cats(el);
      for (let i = 0; i < picks.length; i++) {
        if (picks[i] !== 'all' && own.indexOf(picks[i]) === -1) return false;
      }
      return true;
    }

    function visibleIn(scope) {
      return scope.querySelectorAll('[data-lv-item]:not(.is-hidden)').length;
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

      if (grouped) {
        groupEls.forEach(g => {
          const n = visibleIn(g);
          g.classList.toggle('is-hidden', n === 0);
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

      const active = filtering();
      pinnedEls.forEach(el => el.classList.toggle('is-hidden', active));
      if (emptyEl) emptyEl.hidden = matched.length > 0;
      if (moreEl) moreEl.hidden = !batch || state.shown >= matched.length || matched.length === 0;
      if (statusEl) statusEl.textContent = visible.size + ' of ' + origin.length + ' shown';
    }

    function resetPaging() { state.shown = batch || origin.length; }

    function syncChips(el, pick) {
      el.querySelectorAll('.chip').forEach(c => {
        const on = (c.dataset.cat || 'all') === pick;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
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
    if (resetEl) resetEl.addEventListener('click', () => {
      state.q = '';
      resetPaging();
      if (searchEl) searchEl.value = '';
      filterEls.forEach((el, gi) => { picks[gi] = 'all'; syncChips(el, 'all'); });
      compute();
    });

    compute();
  }

  function init() { document.querySelectorAll('[data-listview]').forEach(initRoot); }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
