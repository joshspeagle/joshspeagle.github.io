/* Progressive-enhancement tooltips for the inline-SVG publication charts.
   Shows a styled tooltip on hover (mouse) and on focus (keyboard) for any
   element carrying a data-tip attribute. Accessibility baseline without JS:
   focusable elements carry aria-label, so screen readers announce the same
   text; this only adds the visual tooltip. */
(function () {
  var tip = document.createElement('div');
  tip.className = 'pf-tip';
  tip.hidden = true;
  document.body.appendChild(tip);

  function show(text, x, y) {
    if (!text) return;
    tip.textContent = text;
    tip.hidden = false;
    var r = tip.getBoundingClientRect();
    var left = Math.min(window.innerWidth - r.width - 8, Math.max(8, x + 12));
    var top = Math.max(8, y - r.height - 10);
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }
  function hide() { tip.hidden = true; }

  document.addEventListener('pointerover', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el) show(el.getAttribute('data-tip'), e.clientX, e.clientY);
  });
  document.addEventListener('pointermove', function (e) {
    if (tip.hidden) return;
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el) show(el.getAttribute('data-tip'), e.clientX, e.clientY);
  });
  document.addEventListener('pointerout', function (e) {
    if (e.target.closest && e.target.closest('[data-tip]')) hide();
  });
  document.addEventListener('focusin', function (e) {
    var el = e.target.closest && e.target.closest('[data-tip]');
    if (el) { var b = el.getBoundingClientRect(); show(el.getAttribute('data-tip'), b.left + b.width / 2, b.top); }
  });
  document.addEventListener('focusout', function (e) {
    if (e.target.closest && e.target.closest('[data-tip]')) hide();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') hide();
  });
  window.addEventListener('scroll', hide, { passive: true });

  function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach(function (container) {
      var tabs = Array.prototype.slice.call(container.querySelectorAll('[role="tab"]'));
      var panels = Array.prototype.slice.call(container.querySelectorAll('[role="tabpanel"]'));
      if (!tabs.length || !panels.length) return;
      function activate(targetTab, moveFocus) {
        var targetId = targetTab.getAttribute('aria-controls');
        tabs.forEach(function (tab) {
          var on = tab === targetTab;
          tab.setAttribute('aria-selected', on ? 'true' : 'false');
          tab.tabIndex = on ? 0 : -1;
        });
        panels.forEach(function (panel) {
          panel.hidden = panel.id !== targetId;
        });
        hide();
        if (moveFocus) targetTab.focus();
      }
      tabs.forEach(function (tab, idx) {
        tab.addEventListener('click', function () { activate(tab, false); });
        tab.addEventListener('keydown', function (e) {
          var next = -1;
          if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
          else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
          else if (e.key === 'Home') next = 0;
          else if (e.key === 'End') next = tabs.length - 1;
          if (next !== -1) {
            e.preventDefault();
            activate(tabs[next], true);
          }
        });
      });
    });
  }
  if (document.readyState !== 'loading') initTabs(); else document.addEventListener('DOMContentLoaded', initTabs);
})();
