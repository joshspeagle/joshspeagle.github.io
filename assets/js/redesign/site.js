/* Site chrome shared by every page: the primary nav (desktop dropdowns + mobile
   accordion) and the theme toggle. Loaded on all pages; the only inline script left
   in the shell is the theme boot line, which must run before first paint.

   Nav model — CSS + .nav-group.open are the single source of truth:
     desktop (>=861px)  .nav-group:hover and .nav-group.open reveal .menu; clicking a
                        trigger toggles .open (without opening merely on Tab focus),
                        and Escape / an outside click / focusout close it and restore
                        focus to the active trigger.
     mobile  (<=860px)  .nav-open + .nav-group.open drive an accordion; opening one
                        group closes its siblings, and Escape / an outside click /
                        following a link closes everything and restores focus. */
(function () {
  const root = document.documentElement;

  // ---- theme toggle (also keeps <meta name="theme-color"> and aria-pressed synced) ----
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const toggle = document.getElementById('theme-toggle');

  function paintTheme() {
    const dark = root.getAttribute('data-theme') !== 'light';
    if (toggle) {
      toggle.textContent = dark ? '☾' : '☀';
      toggle.setAttribute('aria-pressed', dark ? 'false' : 'true');
    }
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
    // Desktop: hover reveals visually and mirrors aria-expanded; clicking the trigger
    // toggles .open explicitly so Tab focus alone does not trap keyboard users inside menus.
    function syncDesktop() {
      if (!desktop.matches) return;
      setExpanded(g, g.classList.contains('open') || g.matches(':hover'));
    }
    ['mouseenter', 'mouseleave'].forEach(function (ev) {
      g.addEventListener(ev, function () { setTimeout(syncDesktop, 0); });
    });
    g.addEventListener('focusout', function (e) {
      if (!desktop.matches) return;
      if (e.relatedTarget && g.contains(e.relatedTarget)) return;
      g.classList.remove('open');
      syncDesktop();
    });
    if (t) t.addEventListener('click', function () {
      const open = !g.classList.contains('open');
      closeGroups();
      g.classList.toggle('open', open);
      setExpanded(g, open);
    });
  });

  nav.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', closeMenu));

  document.addEventListener('click', function (e) {
    if (anyOpen() && !nav.contains(e.target)) closeMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (nav.classList.contains('nav-open')) {   // mobile drawer + accordion
      closeMenu();
      if (burger) burger.focus();
    } else if (anyOpen() || (desktop.matches && groups.some(x => x.contains(document.activeElement)))) {
      const g = groups.find(x => x.classList.contains('open') || x.contains(document.activeElement));
      closeGroups();
      if (g && trigger(g)) trigger(g).focus();
    }
  });

  // Crossing the breakpoint must not leave a mobile-only class behind.
  const onBreak = function () { closeMenu(); };
  if (desktop.addEventListener) desktop.addEventListener('change', onBreak);
  else if (desktop.addListener) desktop.addListener(onBreak);
})();
