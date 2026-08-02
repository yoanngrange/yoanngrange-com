(function () {
  function swapAttr(sourceAttr, targetAttr) {
    document.querySelectorAll('[' + sourceAttr + ']').forEach(function (el) {
      el.setAttribute(targetAttr, el.getAttribute(sourceAttr));
    });
  }

  function run() {
    var lang = document.documentElement.lang === 'fr' ? 'fr' : 'en';
    var target = lang === 'fr' ? 'en' : 'fr';

    if (lang === 'fr') {
      swapAttr('data-fr-alt', 'alt');
      swapAttr('data-fr-aria-label', 'aria-label');
      swapAttr('data-fr-content', 'content');
      swapAttr('data-fr-title', 'data-title');
      swapAttr('data-fr-description', 'data-description');

      var titleEl = document.querySelector('title[data-fr]');
      if (titleEl) document.title = titleEl.getAttribute('data-fr');
    }

    document.querySelectorAll('[data-lang-switch]').forEach(function (link) {
      var url = new URL(window.location.href);
      url.searchParams.set('lang', target);
      link.setAttribute('href', url.pathname + '?' + url.searchParams.toString() + url.hash);
      var label = link.querySelector('[data-lang-switch-label]') || link;
      label.textContent = target === 'fr' ? 'Français' : 'English';
      link.setAttribute('aria-label', target === 'fr' ? 'Passer le site en français' : 'Switch site to English');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
