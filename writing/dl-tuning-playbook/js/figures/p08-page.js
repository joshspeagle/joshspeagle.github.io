/*
 * p08-page.js: page 8's small additions to the shared figure frame.
 *
 * A figure whose toy has two counterparts in the Playbook carries data-playbook-img2 (and
 * data-playbook-alt2) beside data-playbook-img. site.js builds "The Playbook's figure" pane with
 * the first image on DOMContentLoaded (initFigureTabs). This listener is registered later, so it
 * runs after that pane exists, and it sets the second image beside the first.
 */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    var root = (document.body && document.body.getAttribute('data-root')) || '';
    Array.prototype.forEach.call(document.querySelectorAll('figure[data-playbook-img2]'), function (fig) {
      var pane = fig.querySelector('.fig-pb');
      var first = pane && pane.querySelector('img');
      if (!first || (first.parentNode && first.parentNode.classList.contains('fig-pb-pair'))) return;
      var pair = document.createElement('div');
      pair.className = 'fig-pb-pair';
      first.parentNode.insertBefore(pair, first);
      pair.appendChild(first);
      var img = document.createElement('img');
      img.src = root + fig.getAttribute('data-playbook-img2');
      img.alt = fig.getAttribute('data-playbook-alt2') || 'A second figure from the Deep Learning Tuning Playbook';
      img.loading = 'lazy';
      pair.appendChild(img);
    });
  });
})();
