/* Medicare on Main — chat embed loader.
 * Paste ONE script tag in GHL (Settings → Custom Code → Body/Footer):
 *   <script src="https://YOUR-WORKER.workers.dev/embed.js" async></script>
 * This file stays tiny (<2KB gzip) and loads nothing else until the visitor
 * taps the bubble, so it has zero impact on page-load metrics.
 */
(function () {
  'use strict';
  if (window.__momChatLoaded) return;
  window.__momChatLoaded = 1;

  var script = document.currentScript;
  var base = script && script.src ? script.src.replace(/\/embed\.js.*$/, '') : '';
  if (!base) return;

  function init() {
    var css =
      '#mom-chat-btn{position:fixed;bottom:20px;right:20px;z-index:2147483000;' +
      'width:60px;height:60px;border-radius:50%;border:0;cursor:pointer;' +
      'background:linear-gradient(135deg,#C4001A,#8E0715);color:#fff;' +
      'box-shadow:0 4px 14px rgba(142,7,21,.35);display:flex;align-items:center;' +
      'justify-content:center;padding:0;transition:transform .15s ease}' +
      '#mom-chat-btn:hover{transform:scale(1.06)}' +
      '#mom-chat-btn svg{width:28px;height:28px;fill:none;stroke:#fff;stroke-width:2}' +
      '#mom-chat-btn .mom-dot{position:absolute;top:2px;right:2px;width:12px;height:12px;' +
      'border-radius:50%;background:#D6AB4C;border:2px solid #fff}' +
      '@media (prefers-reduced-motion:reduce){#mom-chat-btn{transition:none}}';
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var btn = document.createElement('button');
    btn.id = 'mom-chat-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Chat with Medicare on Main');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" ' +
      'd="M8 10h.01M12 10h.01M16 10h.01M21 12a8.96 8.96 0 0 1-9 9 8.96 8.96 0 0 1-4.1-.98L3 21l1-4.9A8.96 8.96 0 0 1 3 12a9 9 0 1 1 18 0z"/></svg>' +
      '<span class="mom-dot"></span>';
    document.body.appendChild(btn);

    var loading = false;
    function loadWidget(open) {
      if (window.__momChatOpen) { window.__momChatOpen(); return; }
      if (loading) return;
      loading = true;
      var s = document.createElement('script');
      s.src = base + '/widget.js';
      s.async = true; // widget.js opens itself on load
      s.onerror = function () { loading = false; };
      window.__momChatBase = base;
      window.__momChatBtn = btn;
      document.head.appendChild(s);
    }

    btn.addEventListener('click', function () { loadWidget(true); });
    // Warm the cache once the page is fully idle — still off the critical path.
    var warm = function () {
      var l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = base + '/widget.js';
      l.as = 'script';
      document.head.appendChild(l);
    };
    if ('requestIdleCallback' in window) requestIdleCallback(warm, { timeout: 8000 });
    else setTimeout(warm, 6000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
