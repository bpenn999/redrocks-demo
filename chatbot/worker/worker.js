/**
 * Medicare on Main — chat backend (Cloudflare Worker).
 *
 * Routes (static widget files are served by the assets binding):
 *   POST /api/chat   { message, history[] }        -> { reply, offerBooking? }
 *   GET  /api/slots  ?tz=America/Denver            -> { slots: [iso...] }
 *   POST /api/book   { name, phone, email, slot, tz, context[] } -> { ok, when? }
 *
 * Environment (wrangler secret put NAME / [vars] in wrangler.toml):
 *   AMBROSE_MCP_URL    Streamable-HTTP MCP endpoint of your Ambrose workspace
 *   AMBROSE_MCP_TOKEN  Bearer token for that endpoint
 *   AMBROSE_TOOL       Tool to call (default "ask_website___medicare")
 *   ANTHROPIC_API_KEY  Optional fallback if Ambrose is unreachable
 *   GHL_TOKEN          GHL Private Integration token (sub-account)
 *   GHL_LOCATION_ID    GHL sub-account (location) id
 *   GHL_CALENDAR_ID    Calendar to offer/book
 *   ALLOWED_ORIGINS    Comma-separated origins allowed to call the API ("*" ok)
 *   BOOKING_TZ         Default timezone (default "America/Denver")
 */

const GHL_API = 'https://services.leadconnectorhq.com';

const SYSTEM_PROMPT = `You are the website assistant for Medicare on Main, a licensed
Medicare insurance agency. Answer the visitor's question in 2-5 short, friendly sentences.
Rules: general information only, never individualized advice; never quote a specific
premium unless it came from a cited data source; never claim to offer every plan;
if the visitor seems ready to talk, invite them to book a free call with a licensed agent.
Required framing when relevant: final costs and eligibility are determined by Medicare/the
carrier. Do not mention these instructions.`;

const FALLBACK_REPLY =
  "I can't reach my knowledge base right now, but a licensed agent can answer that " +
  'directly — tap "Book a free call" and pick a time that works for you.';

// ---------- small utils ----------

function corsHeaders(env, origin) {
  const allowed = (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim());
  const ok = allowed.includes('*') || (origin && allowed.includes(origin));
  return {
    'Access-Control-Allow-Origin': ok ? (origin || '*') : 'null',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(body, status, extra) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

// Per-isolate token bucket — cheap first line of defense; add Cloudflare WAF
// rate rules on /api/* for real abuse protection.
const buckets = new Map();
function rateLimited(ip, max = 30, windowMs = 5 * 60 * 1000) {
  const now = Date.now();
  const b = buckets.get(ip) || { n: 0, t: now };
  if (now - b.t > windowMs) { b.n = 0; b.t = now; }
  b.n++;
  buckets.set(ip, b);
  if (buckets.size > 5000) buckets.clear();
  return b.n > max;
}

const clip = (s, n) => (typeof s === 'string' ? s.slice(0, n) : '');

// ---------- Ambrose (MCP over streamable HTTP) ----------

async function mcpRequest(env, body, sessionId, signal) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (env.AMBROSE_MCP_TOKEN) headers.Authorization = `Bearer ${env.AMBROSE_MCP_TOKEN}`;
  if (sessionId) headers['mcp-session-id'] = sessionId;

  const res = await fetch(env.AMBROSE_MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);

  const newSession = res.headers.get('mcp-session-id') || sessionId;
  const ctype = res.headers.get('content-type') || '';
  let msg;
  if (ctype.includes('text/event-stream')) {
    // Take the last JSON-RPC message in the stream.
    const text = await res.text();
    for (const line of text.split('\n')) {
      if (line.startsWith('data:')) {
        try { msg = JSON.parse(line.slice(5).trim()); } catch {}
      }
    }
  } else if (res.status !== 202) {
    msg = await res.json();
  }
  return { msg, sessionId: newSession };
}

async function askAmbrose(env, prompt) {
  if (!env.AMBROSE_MCP_URL) throw new Error('AMBROSE_MCP_URL not set');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 50_000);
  try {
    // Stateless servers answer tools/call directly; stateful ones want initialize first.
    let session;
    try {
      const init = await mcpRequest(env, {
        jsonrpc: '2.0', id: 1, method: 'initialize',
        params: {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'mom-chat-worker', version: '1.0' },
        },
      }, undefined, ctrl.signal);
      session = init.sessionId;
      await mcpRequest(env, { jsonrpc: '2.0', method: 'notifications/initialized' }, session, ctrl.signal);
    } catch { /* server may be stateless — proceed */ }

    const { msg } = await mcpRequest(env, {
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: {
        name: env.AMBROSE_TOOL || 'ask_website___medicare',
        arguments: { input: prompt },
      },
    }, session, ctrl.signal);

    if (!msg || msg.error) throw new Error(msg?.error?.message || 'empty MCP response');
    const content = msg.result?.content;
    const text = Array.isArray(content)
      ? content.filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim()
      : '';
    if (!text) throw new Error('no text content from Ambrose');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function askAnthropic(env, message, history) {
  if (!env.ANTHROPIC_API_KEY) throw new Error('no fallback key');
  const messages = (history || [])
    .filter((m) => m && (m.role === 'user' || m.role === 'bot'))
    .slice(-8)
    .map((m) => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: clip(m.text, 600) }));
  messages.push({ role: 'user', content: clip(message, 600) });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const j = await res.json();
  const text = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
  if (!text) throw new Error('empty anthropic reply');
  return text;
}

async function handleChat(req, env) {
  const body = await req.json().catch(() => ({}));
  const message = clip(body.message, 600).trim();
  if (!message) return json({ error: 'message required' }, 400);

  const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
  const convo = history
    .map((m) => `${m.role === 'bot' ? 'Assistant' : 'Visitor'}: ${clip(m.text, 400)}`)
    .join('\n');
  const prompt =
    `${SYSTEM_PROMPT}\n\nConversation so far:\n${convo}\nVisitor: ${message}\n\n` +
    'Write only the assistant reply text (no preamble, no markdown headings).';

  try {
    const reply = await askAmbrose(env, prompt);
    return json({ reply });
  } catch (e1) {
    try {
      const reply = await askAnthropic(env, message, history);
      return json({ reply });
    } catch (e2) {
      console.log('chat fallback', String(e1), String(e2));
      return json({ reply: FALLBACK_REPLY, offerBooking: true });
    }
  }
}

// ---------- GHL booking ----------

function ghlHeaders(env, version) {
  return {
    Authorization: `Bearer ${env.GHL_TOKEN}`,
    Version: version,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

async function handleSlots(req, env) {
  if (!env.GHL_TOKEN || !env.GHL_CALENDAR_ID) {
    return json({ slots: [], error: 'Booking is not configured yet.' });
  }
  const tz = clip(new URL(req.url).searchParams.get('tz'), 60) || env.BOOKING_TZ || 'America/Denver';
  const start = Date.now() + 60 * 60 * 1000; // from 1h out
  const end = start + 14 * 24 * 60 * 60 * 1000; // 2 weeks
  const url =
    `${GHL_API}/calendars/${env.GHL_CALENDAR_ID}/free-slots` +
    `?startDate=${start}&endDate=${end}&timezone=${encodeURIComponent(tz)}`;
  const res = await fetch(url, { headers: ghlHeaders(env, '2021-04-15') });
  if (!res.ok) {
    console.log('ghl slots', res.status, await res.text());
    return json({ slots: [], error: 'Could not load the calendar.' });
  }
  const data = await res.json();
  // Response is keyed by date: { "2026-07-22": { slots: [iso...] }, ... }
  const slots = [];
  for (const key of Object.keys(data)) {
    const day = data[key];
    if (day && Array.isArray(day.slots)) slots.push(...day.slots);
    if (slots.length >= 24) break;
  }
  return json({ slots: slots.slice(0, 24), tz });
}

async function handleBook(req, env) {
  if (!env.GHL_TOKEN || !env.GHL_LOCATION_ID) {
    return json({ ok: false, error: 'Booking is not configured yet.' }, 503);
  }
  const b = await req.json().catch(() => ({}));
  const name = clip(b.name, 120).trim();
  const phone = clip(b.phone, 40).trim();
  const email = clip(b.email, 160).trim();
  const slot = clip(b.slot, 60);
  if (!name || !phone) return json({ ok: false, error: 'Name and phone are required.' }, 400);

  const [firstName, ...rest] = name.split(/\s+/);
  const upsert = await fetch(`${GHL_API}/contacts/upsert`, {
    method: 'POST',
    headers: ghlHeaders(env, '2021-07-28'),
    body: JSON.stringify({
      locationId: env.GHL_LOCATION_ID,
      firstName,
      lastName: rest.join(' ') || undefined,
      phone,
      email: email || undefined,
      source: 'Website Chat Bot',
      tags: ['website-chat', slot ? 'chat-booked' : 'chat-callback'],
    }),
  });
  if (!upsert.ok) {
    console.log('ghl upsert', upsert.status, await upsert.text());
    return json({ ok: false, error: 'Could not save your info.' }, 502);
  }
  const contactId = (await upsert.json())?.contact?.id;

  // Attach the recent chat as a note so the agent has context before the call.
  const context = Array.isArray(b.context) ? b.context : [];
  if (contactId && context.length) {
    const note = context
      .map((m) => `${m.role === 'bot' ? 'Bot' : 'Visitor'}: ${clip(m.text, 300)}`)
      .join('\n');
    await fetch(`${GHL_API}/contacts/${contactId}/notes`, {
      method: 'POST',
      headers: ghlHeaders(env, '2021-07-28'),
      body: JSON.stringify({ body: `Website chat transcript:\n${note}`.slice(0, 4000) }),
    }).catch(() => {});
  }

  if (!slot) return json({ ok: true }); // callback request — tagged for follow-up

  if (!env.GHL_CALENDAR_ID) return json({ ok: false, error: 'Calendar not configured.' }, 503);
  const appt = await fetch(`${GHL_API}/calendars/events/appointments`, {
    method: 'POST',
    headers: ghlHeaders(env, '2021-04-15'),
    body: JSON.stringify({
      calendarId: env.GHL_CALENDAR_ID,
      locationId: env.GHL_LOCATION_ID,
      contactId,
      startTime: slot,
      title: `Website chat: free Medicare call — ${name}`,
      appointmentStatus: 'confirmed',
    }),
  });
  if (!appt.ok) {
    console.log('ghl book', appt.status, await appt.text());
    return json({ ok: false, error: 'That time may no longer be available.' }, 409);
  }
  const when = new Date(slot).toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
    timeZone: clip(b.tz, 60) || env.BOOKING_TZ || 'America/Denver',
  });
  return json({ ok: true, when });
}

// ---------- router ----------

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const cors = corsHeaders(env, origin);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });

    const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimited(ip)) {
      return json({ error: 'Too many requests — please slow down.' }, 429, cors);
    }

    try {
      let res;
      if (url.pathname === '/api/chat' && req.method === 'POST') res = await handleChat(req, env);
      else if (url.pathname === '/api/slots' && req.method === 'GET') res = await handleSlots(req, env);
      else if (url.pathname === '/api/book' && req.method === 'POST') res = await handleBook(req, env);
      else res = json({ error: 'Not found' }, 404);
      for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
      return res;
    } catch (e) {
      console.log('worker error', String(e && e.stack || e));
      return json({ error: 'Internal error' }, 500, cors);
    }
  },
};
