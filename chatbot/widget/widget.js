/* Medicare on Main — full chat widget (lazy-loaded by embed.js on first tap). */
(function () {
  'use strict';
  if (window.__momChatOpen) return;

  var BASE = window.__momChatBase || '';
  var BTN = window.__momChatBtn;
  var BRAND = {
    red: '#C4001A', redDark: '#8E0715', gold: '#D6AB4C',
    cream: '#F7F1EC', ink: '#2B2118'
  };
  var GREETING =
    "Hi! I'm the Medicare on Main assistant. I can answer general Medicare " +
    "questions or help you book a free call with a licensed agent. What can I help with?";
  var DISCLAIMER =
    'General information only — not insurance, tax, or legal advice. ' +
    'We do not offer every plan available in your area. ' +
    'Not connected with or endorsed by the U.S. government or the federal Medicare program.';

  var state = {
    open: false,
    busy: false,
    booking: null, // {slots, chosen, step}
    history: []    // [{role, text}]
  };
  try {
    var saved = sessionStorage.getItem('momChatHistory');
    if (saved) state.history = JSON.parse(saved).slice(-20);
  } catch (e) {}

  /* ---------- styles ---------- */
  var css = [
    '#mom-chat-panel{position:fixed;bottom:92px;right:20px;z-index:2147483001;',
    'width:min(380px,calc(100vw - 24px));height:min(560px,calc(100vh - 120px));',
    'display:flex;flex-direction:column;border-radius:16px;overflow:hidden;',
    'background:#fff;box-shadow:0 12px 40px rgba(43,33,24,.28);',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;',
    'opacity:0;transform:translateY(12px);pointer-events:none;transition:opacity .18s ease,transform .18s ease}',
    '#mom-chat-panel.mom-open{opacity:1;transform:none;pointer-events:auto}',
    '@media (prefers-reduced-motion:reduce){#mom-chat-panel{transition:none}}',
    '.mom-head{background:linear-gradient(135deg,' + BRAND.red + ',' + BRAND.redDark + ');color:#fff;',
    'padding:14px 16px;display:flex;align-items:center;gap:10px}',
    '.mom-head h2{margin:0;font-size:15px;font-weight:700;letter-spacing:.2px}',
    '.mom-head p{margin:2px 0 0;font-size:11.5px;opacity:.85}',
    '.mom-close{margin-left:auto;background:none;border:0;color:#fff;font-size:22px;line-height:1;cursor:pointer;padding:4px}',
    '.mom-msgs{flex:1;overflow-y:auto;padding:14px;background:' + BRAND.cream + ';display:flex;flex-direction:column;gap:10px}',
    '.mom-msg{max-width:85%;padding:9px 12px;border-radius:14px;font-size:13.5px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}',
    '.mom-msg.bot{background:#fff;color:' + BRAND.ink + ';border-bottom-left-radius:4px;align-self:flex-start;box-shadow:0 1px 3px rgba(43,33,24,.08)}',
    '.mom-msg.user{background:' + BRAND.red + ';color:#fff;border-bottom-right-radius:4px;align-self:flex-end}',
    '.mom-quick{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start}',
    '.mom-quick button,.mom-slot{background:#fff;border:1px solid ' + BRAND.gold + ';color:' + BRAND.redDark + ';',
    'border-radius:999px;padding:7px 12px;font-size:12.5px;cursor:pointer;font-weight:600}',
    '.mom-quick button:hover,.mom-slot:hover{background:' + BRAND.gold + ';color:#fff}',
    '.mom-typing{align-self:flex-start;background:#fff;border-radius:14px;padding:10px 14px;display:flex;gap:4px}',
    '.mom-typing i{width:6px;height:6px;border-radius:50%;background:' + BRAND.gold + ';animation:momB 1s infinite}',
    '.mom-typing i:nth-child(2){animation-delay:.15s}.mom-typing i:nth-child(3){animation-delay:.3s}',
    '@keyframes momB{0%,60%,100%{opacity:.3}30%{opacity:1}}',
    '.mom-form{display:flex;flex-direction:column;gap:8px;background:#fff;padding:12px;border-radius:12px;align-self:stretch}',
    '.mom-form label{font-size:11.5px;font-weight:600;color:' + BRAND.ink + '}',
    '.mom-form input{border:1px solid #d9cfc4;border-radius:8px;padding:9px 10px;font-size:13.5px}',
    '.mom-form small{font-size:10.5px;color:#7a6f64;line-height:1.4}',
    '.mom-cta{background:' + BRAND.red + ';color:#fff;border:0;border-radius:8px;padding:10px;font-size:13.5px;font-weight:700;cursor:pointer}',
    '.mom-cta[disabled]{opacity:.6;cursor:default}',
    '.mom-inbar{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #eee3d8}',
    '.mom-inbar input{flex:1;border:1px solid #d9cfc4;border-radius:999px;padding:10px 14px;font-size:13.5px;outline-color:' + BRAND.gold + '}',
    '.mom-send{width:40px;height:40px;border-radius:50%;border:0;background:' + BRAND.red + ';color:#fff;cursor:pointer;flex:none;display:flex;align-items:center;justify-content:center}',
    '.mom-foot{background:#fff;padding:6px 12px 10px;font-size:9.5px;color:#8d8175;line-height:1.35;text-align:center}'
  ].join('');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- DOM ---------- */
  var panel = document.createElement('div');
  panel.id = 'mom-chat-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Medicare on Main chat');
  panel.innerHTML =
    '<div class="mom-head"><div><h2>Medicare on Main</h2><p>Ask a question or book a free call</p></div>' +
    '<button class="mom-close" aria-label="Close chat">&times;</button></div>' +
    '<div class="mom-msgs" aria-live="polite"></div>' +
    '<div class="mom-inbar"><input type="text" placeholder="Type your question…" aria-label="Your message" maxlength="600">' +
    '<button class="mom-send" aria-label="Send"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>' +
    '<div class="mom-foot">' + DISCLAIMER + '</div>';
  document.body.appendChild(panel);

  var msgs = panel.querySelector('.mom-msgs');
  var input = panel.querySelector('.mom-inbar input');
  var sendBtn = panel.querySelector('.mom-send');

  function scrollDown() { msgs.scrollTop = msgs.scrollHeight; }
  function addMsg(role, text) {
    var d = document.createElement('div');
    d.className = 'mom-msg ' + role;
    d.textContent = text;
    msgs.appendChild(d);
    state.history.push({ role: role, text: text });
    state.history = state.history.slice(-20);
    try { sessionStorage.setItem('momChatHistory', JSON.stringify(state.history)); } catch (e) {}
    scrollDown();
    return d;
  }
  function addNode(node) { msgs.appendChild(node); scrollDown(); }
  function typing(on) {
    var t = msgs.querySelector('.mom-typing');
    if (on && !t) {
      t = document.createElement('div');
      t.className = 'mom-typing';
      t.innerHTML = '<i></i><i></i><i></i>';
      msgs.appendChild(t);
      scrollDown();
    } else if (!on && t) t.remove();
  }

  function quickReplies() {
    var wrap = document.createElement('div');
    wrap.className = 'mom-quick';
    [
      ['📅 Book a free call', 'BOOK'],
      ["I'm turning 65", "I'm turning 65 soon. What do I need to know about enrolling in Medicare?"],
      ['Advantage vs Supplement', "What's the difference between Medicare Advantage and a Medicare Supplement?"],
      ['Drug coverage (Part D)', 'How does Medicare Part D drug coverage work?']
    ].forEach(function (q) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = q[0];
      b.onclick = function () {
        wrap.remove();
        if (q[1] === 'BOOK') startBooking();
        else { addMsg('user', q[1]); ask(q[1]); }
      };
      wrap.appendChild(b);
    });
    addNode(wrap);
  }

  /* ---------- chat ---------- */
  function ask(text) {
    if (state.busy) return;
    state.busy = true;
    typing(true);
    fetch(BASE + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: state.history.slice(-10) })
    })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        typing(false);
        state.busy = false;
        addMsg('bot', j.reply || j.error ||
          "Sorry — I couldn't get an answer just now. Want to book a free call instead?");
        if (j.offerBooking) offerBookingChip();
      })
      .catch(function () {
        typing(false);
        state.busy = false;
        addMsg('bot', "I'm having trouble connecting right now. You can book a free call and a licensed agent will help you directly.");
        offerBookingChip();
      });
  }
  function offerBookingChip() {
    var wrap = document.createElement('div');
    wrap.className = 'mom-quick';
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = '📅 Book a free call';
    b.onclick = function () { wrap.remove(); startBooking(); };
    wrap.appendChild(b);
    addNode(wrap);
  }

  /* ---------- booking ---------- */
  function startBooking() {
    addMsg('bot', 'Great — let me pull up available times…');
    typing(true);
    var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'America/Denver';
    fetch(BASE + '/api/slots?tz=' + encodeURIComponent(tz))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        typing(false);
        var slots = (j.slots || []).slice(0, 9);
        if (!slots.length) {
          addMsg('bot', j.error || 'I could not load the calendar right now. Please try again in a moment, or leave your info and we will call you.');
          leadForm(null, tz);
          return;
        }
        addMsg('bot', 'Here are the next openings (' + tz.replace(/_/g, ' ') + '). Pick one:');
        var wrap = document.createElement('div');
        wrap.className = 'mom-quick';
        slots.forEach(function (iso) {
          var d = new Date(iso);
          var b = document.createElement('button');
          b.type = 'button';
          b.className = 'mom-slot';
          b.textContent = d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
          b.onclick = function () {
            wrap.remove();
            addMsg('user', b.textContent);
            leadForm(iso, tz);
          };
          wrap.appendChild(b);
        });
        addNode(wrap);
      })
      .catch(function () {
        typing(false);
        addMsg('bot', 'I could not load the calendar right now — leave your info and we will call you back.');
        leadForm(null, tz);
      });
  }

  function leadForm(slotIso, tz) {
    var f = document.createElement('form');
    f.className = 'mom-form';
    f.innerHTML =
      '<label>Name<input name="name" required autocomplete="name"></label>' +
      '<label>Phone<input name="phone" type="tel" required autocomplete="tel"></label>' +
      '<label>Email<input name="email" type="email" autocomplete="email"></label>' +
      '<small>By submitting, you agree that Medicare on Main may call, text, or email you about your request. Consent is not a condition of purchase. Msg &amp; data rates may apply.</small>' +
      '<button class="mom-cta" type="submit">' + (slotIso ? 'Confirm appointment' : 'Request a call back') + '</button>';
    f.onsubmit = function (ev) {
      ev.preventDefault();
      var btn = f.querySelector('.mom-cta');
      btn.disabled = true;
      btn.textContent = 'Booking…';
      var data = {
        name: f.name.value.trim(),
        phone: f.phone.value.trim(),
        email: f.email.value.trim(),
        slot: slotIso,
        tz: tz,
        context: state.history.slice(-6)
      };
      fetch(BASE + '/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          f.remove();
          if (j.ok) {
            addMsg('bot', slotIso
              ? '🎉 You are booked! ' + (j.when || '') + ' A licensed agent will call you. You will also get a confirmation by text/email if provided.'
              : "Got it — you're on our list and a licensed agent will reach out shortly.");
          } else {
            addMsg('bot', (j.error || 'That time may have just been taken.') + ' Want to try another time?');
            offerBookingChip();
          }
        })
        .catch(function () {
          f.remove();
          addMsg('bot', 'Something went wrong on my end. Please try again, or call us directly.');
          offerBookingChip();
        });
    };
    addNode(f);
    f.querySelector('input').focus();
  }

  /* ---------- send handlers ---------- */
  function submit() {
    var t = input.value.trim();
    if (!t || state.busy) return;
    input.value = '';
    addMsg('user', t);
    if (/book|appointment|schedule|call me/i.test(t)) startBooking();
    else ask(t);
  }
  sendBtn.addEventListener('click', submit);
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  panel.querySelector('.mom-close').addEventListener('click', close);

  function open() {
    state.open = true;
    panel.classList.add('mom-open');
    if (!msgs.children.length) {
      if (state.history.length) {
        state.history.forEach(function (m) {
          var d = document.createElement('div');
          d.className = 'mom-msg ' + m.role;
          d.textContent = m.text;
          msgs.appendChild(d);
        });
        scrollDown();
      } else {
        addMsg('bot', GREETING);
        quickReplies();
      }
    }
    setTimeout(function () { input.focus(); }, 200);
    if (BTN) BTN.setAttribute('aria-expanded', 'true');
  }
  function close() {
    state.open = false;
    panel.classList.remove('mom-open');
    if (BTN) { BTN.setAttribute('aria-expanded', 'false'); BTN.focus(); }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.open) close(); });

  // embed.js keeps the single bubble click listener and calls this toggle.
  window.__momChatOpen = function () { state.open ? close() : open(); };
  open();
})();
