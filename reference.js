/* WhydahStory reference pages — shared behavior.
   Three small features carried over from the dashboard; everything else
   (tabs, admin gate, game gate) was classroom machinery and is retired. */
document.addEventListener('DOMContentLoaded', function () {
  // Accordions (delegated — covers any .accordion-header on the page)
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.accordion-header');
    if (!btn) return;
    var open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    var body = document.getElementById(btn.getAttribute('aria-controls'));
    if (body) body.hidden = open;
  });

  // If the page is opened at an anchor inside a collapsed accordion, open it.
  function revealHash() {
    var id = (window.location.hash || '').slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var body = el.closest('.accordion-body[hidden]');
    if (body) {
      body.hidden = false;
      var hdr = document.querySelector('.accordion-header[aria-controls="' + body.id + '"]');
      if (hdr) hdr.setAttribute('aria-expanded', 'true');
      el.scrollIntoView();
    }
  }
  revealHash();
  window.addEventListener('hashchange', revealHash);

  // Glossary search filter
  var glossarySearch = document.getElementById('glossary-search');
  if (glossarySearch) {
    glossarySearch.addEventListener('input', function () {
      var q = this.value.toLowerCase().trim();
      document.querySelectorAll('.glossary-list dt').forEach(function (dt) {
        var dd = dt.nextElementSibling;
        var text = (dt.textContent + ' ' + (dd ? dd.textContent : '')).toLowerCase();
        var match = !q || text.indexOf(q) !== -1;
        dt.classList.toggle('hidden', !match);
        if (dd) dd.classList.toggle('hidden', !match);
      });
    });
  }

  // Click-to-load for heavy live-map embeds — keeps pages fast
  document.querySelectorAll('.lazy-embed').forEach(function (wrap) {
    var btn = wrap.querySelector('.lazy-embed-btn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var markup = wrap.getAttribute('data-embed');
      if (markup) wrap.innerHTML = markup; // data-embed holds a single trusted <iframe> string
    });
  });
});
