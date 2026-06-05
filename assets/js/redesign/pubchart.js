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
  window.addEventListener('scroll', hide, { passive: true });
})();
