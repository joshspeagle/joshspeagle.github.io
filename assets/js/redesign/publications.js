/* Publications page progressive enhancement.
   The list is pre-rendered by build_html.py (newest-first, then most-cited).
   This script adds search, sort, category filtering and "load more" paging.
   Dependency-free; if it never runs the static list is fully usable. */
(function () {
  function init() {
  const list = document.getElementById('pub-list');
  if (!list) return;

  const search = document.getElementById('pub-search');
  const sortSel = document.getElementById('pub-sort');
  const filters = document.getElementById('pub-filters');
  const empty = document.getElementById('pub-empty');
  const reset = document.getElementById('pub-reset');
  const loadmore = document.getElementById('pub-loadmore');

  const BATCH = 20;
  const state = { cat: 'all', q: '', sort: 'year', shown: BATCH };

  const papers = Array.prototype.slice.call(list.querySelectorAll('.paper'));

  function byYear(a, b) {
    const dy = (+b.dataset.year) - (+a.dataset.year);
    if (dy !== 0) return dy;
    return (+b.dataset.cites) - (+a.dataset.cites);
  }
  function byCites(a, b) {
    return (+b.dataset.cites) - (+a.dataset.cites);
  }

  function compute() {
    const cat = state.cat;
    const q = state.q;

    const matched = [];
    const unmatched = [];
    for (let i = 0; i < papers.length; i++) {
      const el = papers[i];
      const catOk = cat === 'all' || el.dataset.cat === cat;
      const qOk = q === '' ||
        (el.dataset.title || '').indexOf(q) !== -1 ||
        (el.dataset.authors || '').indexOf(q) !== -1;
      if (catOk && qOk) matched.push(el);
      else unmatched.push(el);
    }

    matched.sort(state.sort === 'cites' ? byCites : byYear);

    // Re-append in sorted order: matched first, then unmatched (kept hidden).
    for (let i = 0; i < matched.length; i++) list.appendChild(matched[i]);
    for (let i = 0; i < unmatched.length; i++) {
      list.appendChild(unmatched[i]);
      unmatched[i].classList.add('is-hidden');
    }

    for (let i = 0; i < matched.length; i++) {
      if (i < state.shown) matched[i].classList.remove('is-hidden');
      else matched[i].classList.add('is-hidden');
    }

    if (empty) empty.hidden = matched.length > 0;
    if (loadmore) loadmore.hidden = matched.length === 0 || state.shown >= matched.length;
  }

  if (search) {
    search.addEventListener('input', function () {
      state.q = this.value.trim().toLowerCase();
      state.shown = BATCH;
      compute();
    });
  }

  if (sortSel) {
    sortSel.addEventListener('change', function () {
      state.sort = this.value;
      compute();
    });
  }

  if (filters) {
    filters.addEventListener('click', function (e) {
      const chip = e.target.closest('.chip');
      if (!chip || !filters.contains(chip)) return;
      state.cat = chip.dataset.cat;
      const chips = filters.querySelectorAll('.chip');
      for (let i = 0; i < chips.length; i++) {
        const active = chips[i] === chip;
        chips[i].classList.toggle('is-active', active);
        chips[i].setAttribute('aria-pressed', active ? 'true' : 'false');
      }
      state.shown = BATCH;
      compute();
    });
  }

  if (loadmore) {
    loadmore.addEventListener('click', function () {
      state.shown += BATCH;
      compute();
    });
  }

  if (reset) {
    reset.addEventListener('click', function () {
      state.q = '';
      state.cat = 'all';
      state.shown = BATCH;
      if (search) search.value = '';
      if (filters) {
        const chips = filters.querySelectorAll('.chip');
        for (let i = 0; i < chips.length; i++) {
          const isAll = chips[i].dataset.cat === 'all';
          chips[i].classList.toggle('is-active', isAll);
          chips[i].setAttribute('aria-pressed', isAll ? 'true' : 'false');
        }
      }
      compute();
    });
  }

  compute();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
