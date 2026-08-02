(function () {
  var params = new URLSearchParams(window.location.search);
  var urlLang = params.get('lang');
  var lang = 'en';

  if (urlLang === 'fr' || urlLang === 'en') {
    lang = urlLang;
    try { localStorage.setItem('site-lang', lang); } catch (e) {}
  } else {
    try {
      var stored = localStorage.getItem('site-lang');
      if (stored === 'fr' || stored === 'en') lang = stored;
    } catch (e) {}
  }

  document.documentElement.lang = lang;
  document.documentElement.classList.add('lang-' + lang);
})();
