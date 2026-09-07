/* Site chrome shared by every page: the primary nav (desktop dropdowns + mobile
   accordion) and the theme toggle. Loaded on all pages; the only inline script left
   in the shell is the theme boot line, which must run before first paint.

   Nav model — the CSS is the single source of truth for what is visible:
     desktop (>=861px)  .nav-group:hover / :focus-within reveals .menu, so JS never
                        toggles a class here; it only mirrors that state into
                        aria-expanded (the D3/E10 bug was JS claiming otherwise).
     mobile  (<=860px)  .nav-open + .nav-group.open drive an accordion; opening one
                        group closes its siblings, and Escape / an outside click /
                        following a link closes everything and restores focus. */
(function () {
  const root = document.documentElement;

  // ---- theme toggle (also keeps <meta name="theme-color"> honest, D20) ----
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const toggle = document.getElementById('theme-toggle');

  function paintTheme() {
    const dark = root.getAttribute('data-theme') !== 'light';
    if (toggle) toggle.textContent = dark ? '☾' : '☀';
    if (themeMeta) {
      const bg = getComputedStyle(root).getPropertyValue('--bg-0').trim();
      if (bg) themeMeta.setAttribute('content', bg);
    }
  }

  if (toggle) toggle.addEventListener('click', function () {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('preferred-theme', next); } catch (e) { /* private mode */ }
    paintTheme();
  });
  paintTheme();

  // ---- navigation ----
  const nav = document.querySelector('.nav');
  const burger = document.getElementById('hamburger');
  if (!nav) return;
  const groups = Array.from(nav.querySelectorAll('.nav-group'));
  const desktop = window.matchMedia('(min-width: 861px)');

  function trigger(g) { return g.querySelector('.nav-trigger'); }
  function setExpanded(g, on) {
    const t = trigger(g);
    if (t) t.setAttribute('aria-expanded', on ? 'true' : 'false');
  }
  function closeGroups() { groups.forEach(g => { g.classList.remove('open'); setExpanded(g, false); }); }
  function closeMenu() {
    nav.classList.remove('nav-open');
    if (burger) burger.setAttribute('aria-expanded', 'false');
    closeGroups();
  }
  function anyOpen() { return nav.classList.contains('nav-open') || groups.some(g => g.classList.contains('open')); }

  if (burger) burger.addEventListener('click', function () {
    const open = nav.classList.toggle('nav-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (!open) closeGroups();
  });

  groups.forEach(function (g) {
    const t = trigger(g);
    // Desktop: report exactly what :hover / :focus-within is showing. The state is
    // read after the event settles so focusout sees the new activeElement.
    function sync() {
      if (!desktop.matches) return;
      setExpanded(g, g.matches(':hover') || g.contains(document.activeElement));
    }
    ['mouseenter', 'mouseleave', 'focusin', 'focusout'].forEach(function (ev) {
      g.addEventListener(ev, function () { setTimeout(sync, 0); });
    });
    // Mobile: tap-to-expand accordion, one group at a time.
    if (t) t.addEventListener('click', function () {
      if (desktop.matches) return;
      const open = !g.classList.contains('open');
      closeGroups();
      g.classList.toggle('open', open);
      setExpanded(g, open);
    });
  });

  nav.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', closeMenu));

  document.addEventListener('click', function (e) {
    if (nav.classList.contains('nav-open') && !nav.contains(e.target)) closeMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (anyOpen()) {                       // mobile menu / accordion
      closeMenu();
      if (burger) burger.focus();
    } else if (desktop.matches) {          // desktop menu held open by focus
      const g = groups.find(x => x.contains(document.activeElement));
      if (g && document.activeElement !== trigger(g)) document.activeElement.blur();
    }
  });

  // Crossing the breakpoint must not leave a mobile-only class behind.
  const onBreak = function () { closeMenu(); };
  if (desktop.addEventListener) desktop.addEventListener('change', onBreak);
  else if (desktop.addListener) desktop.addListener(onBreak);
})();
