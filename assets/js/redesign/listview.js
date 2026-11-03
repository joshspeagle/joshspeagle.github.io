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

  function initSeriesProgress() {
    document.querySelectorAll('[data-series-progress]').forEach(function (panel) {
      const key = panel.getAttribute('data-storage-key') || 'tp-posts-opened';
      const total = parseInt(panel.getAttribute('data-total-parts') || '9', 10) || 9;
      let opened = [];
      try {
        const raw = JSON.parse(window.localStorage.getItem(key) || '[]');
        if (Array.isArray(raw)) {
          opened = raw.map(Number).filter(function (n) { return n >= 1 && n <= total; });
        }
      } catch (e) {
        opened = [];
      }
      const openedSet = new Set(opened);
      const count = openedSet.size;
      const pct = Math.round((count / total) * 100);

      const labelEl = panel.querySelector('[data-progress-label]');
      const pctEl = panel.querySelector('[data-progress-pct]');
      const barEl = panel.querySelector('[data-progress-bar]');
      const fillEl = panel.querySelector('[data-progress-fill]');
      const ctaEl = panel.querySelector('[data-progress-cta]');

      if (labelEl) labelEl.textContent = 'Reading progress: ' + count + ' of ' + total + ' parts opened';
      if (pctEl) pctEl.textContent = pct + '%';
      if (barEl) barEl.setAttribute('aria-valuenow', String(count));
      if (fillEl) fillEl.style.width = pct + '%';

      let nextUnread = null;
      for (let i = 1; i <= total; i++) {
        const card = panel.querySelector('.wr-part-card[data-part-num="' + i + '"]');
        const isRead = openedSet.has(i);
        if (card) {
          card.classList.toggle('is-opened', isRead);
          const st = card.querySelector('[data-part-status]');
          if (st) {
            const def = st.getAttribute('data-default-label') || '';
            st.textContent = isRead ? ('✓ Opened · ' + def) : def;
          }
          if (!isRead && !nextUnread) {
            nextUnread = { num: i, url: card.getAttribute('data-part-url') || card.getAttribute('href') };
          }
        }
      }

      if (ctaEl && count > 0 && nextUnread && nextUnread.url) {
        ctaEl.setAttribute('href', nextUnread.url);
        ctaEl.textContent = 'Continue to Part ' + nextUnread.num;
      }

      document.querySelectorAll('.writing-card[data-part-num]').forEach(function (item) {
        const pnum = parseInt(item.getAttribute('data-part-num') || '0', 10);
        const isRead = openedSet.has(pnum);
        item.classList.toggle('is-opened', isRead);
        const badge = item.querySelector('[data-part-read-badge]');
        if (badge) badge.hidden = !isRead;
      });
    });
  }

  function init() {
    document.querySelectorAll('[data-listview]').forEach(initRoot);
    initTimelineExpand();
    initSeriesProgress();
  }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
