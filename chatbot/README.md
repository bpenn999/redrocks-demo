# Medicare on Main — website chat bot (Ambrose Q&A + GHL booking)

A chat bubble for the Medicare on Main site that answers visitor questions
through **Ambrose** (your `Website - Medicare` team) and books appointments
straight onto your **GoHighLevel calendar** — built so it cannot slow the
site down.

## Why it won't slow your site

- The only thing the page loads is `embed.js` — **~1.5KB gzipped**, loaded
  `async`, no fonts, no frameworks, no third-party calls. It just draws the
  bubble.
- The full chat UI (`widget.js`, ~4.8KB gzipped) loads **only when a visitor
  taps the bubble** (it is quietly prefetched after the page is idle so the
  first tap feels instant).
- All AI and calendar calls happen from a Cloudflare Worker — zero API keys or
  heavy SDKs in the browser.

## What's in here

```
chatbot/
├── wrangler.toml        Cloudflare Worker config (serves widget + API)
├── worker/worker.js     Backend: /api/chat, /api/slots, /api/book
├── widget/embed.js      The tiny loader you paste into GHL
├── widget/widget.js     Full chat UI (lazy-loaded)
└── test/                Local mock server + Playwright e2e test
```

## Deploy (one time, ~10 minutes)

1. **Cloudflare:** `npm i -g wrangler && wrangler login`, then from `chatbot/`:

   ```bash
   wrangler secret put AMBROSE_MCP_TOKEN   # from Ambrose → Settings → MCP access
   wrangler secret put AMBROSE_MCP_URL     # your workspace MCP endpoint URL
   wrangler secret put GHL_TOKEN           # GHL → Settings → Private Integrations → create token
                                           # scopes: contacts.write, calendars.write, calendars/events.write, notes.write
   wrangler secret put ANTHROPIC_API_KEY   # optional backup brain if Ambrose is down
   wrangler deploy
   ```

2. **IDs:** in `wrangler.toml`, fill in and redeploy:
   - `GHL_LOCATION_ID` — GHL sub-account id (Settings → Business Profile)
   - `GHL_CALENDAR_ID` — Calendars → Calendar Settings → your booking calendar → ⚙ → copy id
   - `ALLOWED_ORIGINS` — set to `https://medicareonmain.com` (and any funnel domains) once live

3. **Embed in GHL:** Sites → your site/funnel → Settings → Custom Code →
   **Footer**, paste one line:

   ```html
   <script src="https://mom-chat.YOUR-SUBDOMAIN.workers.dev/embed.js" async></script>
   ```

   (Works site-wide via the sub-account's custom code too: Settings → Company → Custom Code.)

## ⚠️ Before it can answer questions

While building this I tested your Ambrose team and it returned:
**"Your credit balance is too low to access the Anthropic API."**
Top up billing in your Ambrose platform (Plans & Billing) or the bot will
run on its fallback: if `ANTHROPIC_API_KEY` is set it answers with Claude
directly (with a compliant Medicare system prompt); otherwise it politely
offers to book a call instead of answering.

## How each piece works

- **Q&A** — `/api/chat` sends the visitor's question + short history to your
  Ambrose `ask_website___medicare` tool over MCP (with an initialize handshake
  for stateful servers). Falls back to the Anthropic API, then to a
  "book a call" message. 50s timeout, per-IP rate limiting.
- **Booking** — `/api/slots` pulls real free slots from the GHL calendar in the
  visitor's timezone; `/api/book` upserts the contact (tags `website-chat`,
  `chat-booked`/`chat-callback`, source "Website Chat Bot"), saves the chat
  transcript as a contact note so you have context before the call, then books
  the appointment. If slots can't load, it degrades to a call-back request.
- **Compliance** — TPMO non-affiliation + "general information, not advice"
  are pinned in the widget footer; the system prompt forbids quoting premiums
  without a source and "we offer every plan" claims; TCPA consent line sits on
  the lead form.

## Test locally

```bash
node chatbot/test/serve.js   # mock backend + demo page on :8787
node chatbot/test/e2e.js     # Playwright: open, chat, book, toggle — must all pass
```

## Nice next steps

- Add a Cloudflare WAF rate-limit rule on `/api/*` (belt-and-suspenders).
- Point a custom domain (e.g. `chat.medicareonmain.com`) at the Worker.
- Set `ALLOWED_ORIGINS` to your real domains once verified.
