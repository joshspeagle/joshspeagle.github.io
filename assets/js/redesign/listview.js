/* Generic interactive list: search + filter chips + sort + load-more.
   Dependency-free. Enhances pre-rendered DOM (progressive enhancement).

   Markup contract — wrap a list area in a root element:
     <div data-listview data-lv-batch="20" data-lv-sort="year">
       <input data-lv-search>                         (optional)
       <select data-lv-sort-control>...</select>       (optional; values match sort keys)
       <div data-lv-filters> <button class="chip" data-cat="all" aria-pressed="true">…</button> … </div>  (optional)
       <div data-lv-list>
         <article data-lv-item data-cat="a b" data-search="lowercased text"
                  data-year="2020" data-num="2162" data-title="lowercased">…</article>
         …
       </div>
       <p data-lv-empty hidden>… <button data-lv-reset>Show all</button></p>
       <button data-lv-more>Load more</button>          (optional; omit/leave batch=0 to show all)
     </div>
   Sort keys: "year" (data-year desc, tie -> data-num desc), "num" (data-num desc),
              "az" (data-title asc), "default" (original DOM order).
   data-cat on an item may be space-separated (matches if the selected chip's data-cat is in the set). */
(function () {
  function initRoot(root) {
    const list = root.querySelector('[data-lv-list]');
    if (!list) return;
    const items = Array.from(list.querySelectorAll('[data-lv-item]'));
    const searchEl = root.querySelector('[data-lv-search]');
    const sortEl = root.querySelector('[data-lv-sort-control]');
    const filtersEl = root.querySelector('[data-lv-filters]');
    const emptyEl = root.querySelector('[data-lv-empty]');
    const moreEl = root.querySelector('[data-lv-more]');
    const resetEl = root.querySelector('[data-lv-reset]');
    const batch = parseInt(root.dataset.lvBatch || '0', 10) || 0; // 0 = show all
    const origin = items.slice(); // original order

    const state = { cat: 'all', q: '', sort: root.dataset.lvSort || 'default', shown: batch || items.length };

    function cats(el) { return (el.dataset.cat || '').split(/\s+/).filter(Boolean); }

    function compute() {
      let matched = origin.filter(el =>
        (state.cat === 'all' || cats(el).indexOf(state.cat) !== -1) &&
        (state.q === '' || (el.dataset.search || '').indexOf(state.q) !== -1));

      const s = state.sort;
      if (s === 'year') matched.sort((a, b) => (+b.dataset.year - +a.dataset.year) || (+b.dataset.num - +a.dataset.num));
      else if (s === 'num') matched.sort((a, b) => (+b.dataset.num - +a.dataset.num));
      else if (s === 'az') matched.sort((a, b) => (a.dataset.title || '').localeCompare(b.dataset.title || ''));
      // 'default' keeps origin order (matched already in origin order)

      const matchedSet = new Set(matched);
      matched.forEach(el => list.appendChild(el));                 // reorder
      origin.forEach(el => { if (!matchedSet.has(el)) { el.classList.add('is-hidden'); list.appendChild(el); } });

      const limit = batch ? state.shown : matched.length;
      matched.forEach((el, i) => el.classList.toggle('is-hidden', i >= limit));

      if (emptyEl) emptyEl.hidden = matched.length > 0;
      if (moreEl) moreEl.hidden = !batch || state.shown >= matched.length || matched.length === 0;
    }

    if (searchEl) searchEl.addEventListener('input', () => { state.q = searchEl.value.trim().toLowerCase(); state.shown = batch || origin.length; compute(); });
    if (sortEl) sortEl.addEventListener('change', () => { state.sort = sortEl.value; compute(); });
    if (filtersEl) filtersEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip'); if (!chip) return;
      state.cat = chip.dataset.cat || 'all'; state.shown = batch || origin.length;
      filtersEl.querySelectorAll('.chip').forEach(c => {
        const on = c === chip; c.classList.toggle('is-active', on); c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      compute();
    });
    if (moreEl) moreEl.addEventListener('click', () => { state.shown += (batch || 0); compute(); });
    if (resetEl) resetEl.addEventListener('click', () => {
      state.q = ''; state.cat = 'all'; state.shown = batch || origin.length;
      if (searchEl) searchEl.value = '';
      if (filtersEl) filtersEl.querySelectorAll('.chip').forEach(c => {
        const on = (c.dataset.cat || 'all') === 'all'; c.classList.toggle('is-active', on); c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      compute();
    });

    compute();
  }

  function init() { document.querySelectorAll('[data-listview]').forEach(initRoot); }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
