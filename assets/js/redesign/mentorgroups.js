/* Group-aware live search for the Mentorship page (progressive enhancement).
   Filters [data-search] cards within [data-mentor-group] groups inside
   [data-mentor-section] sections; hides empty groups/sections and updates the
   live counts ([data-mentor-count] per group, [data-mentor-seccount] per
   section). Dependency-free. Markup is pre-rendered by pages_mentorship.py. */
(function () {
  function initRoot(root) {
    const input = root.querySelector('[data-mentor-search]');
    if (!input) return;
    const cards = Array.from(root.querySelectorAll('[data-search]'));
    const groups = Array.from(root.querySelectorAll('[data-mentor-group]'));
    const sections = Array.from(root.querySelectorAll('[data-mentor-section]'));
    const empty = root.querySelector('[data-mentor-empty]');
    const reset = root.querySelector('[data-mentor-reset]');

    function visibleCards(scope) {
      return scope.querySelectorAll('[data-search]:not(.is-hidden)').length;
    }

    function apply() {
      const q = input.value.trim().toLowerCase();
      let anyVisible = false;

      cards.forEach((c) => {
        const match = !q || (c.dataset.search || '').indexOf(q) !== -1;
        c.classList.toggle('is-hidden', !match);
        if (match) anyVisible = true;
      });

      groups.forEach((g) => {
        const n = visibleCards(g);
        g.classList.toggle('is-hidden', n === 0);
        const cnt = g.querySelector('[data-mentor-count]');
        if (cnt) cnt.textContent = n;
      });

      sections.forEach((s) => {
        const groupsVisible = s.querySelectorAll('[data-mentor-group]:not(.is-hidden)').length;
        s.classList.toggle('is-hidden', groupsVisible === 0);
        const sc = s.querySelector('[data-mentor-seccount]');
        if (sc) sc.textContent = visibleCards(s);
      });

      if (empty) empty.hidden = anyVisible;
    }

    input.addEventListener('input', apply);
    if (reset) reset.addEventListener('click', () => { input.value = ''; apply(); input.focus(); });
  }

  function init() { document.querySelectorAll('[data-mentor-root]').forEach(initRoot); }
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
