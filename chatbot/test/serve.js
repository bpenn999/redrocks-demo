// Local test server: serves the widget files plus mocked /api endpoints,
// mimicking the deployed Worker. Usage: node chatbot/test/serve.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.argv[2]) || 8787;
const WIDGET = path.join(__dirname, '..', 'widget');

const slots = [];
for (let d = 1; d <= 3; d++) {
  for (const h of [9, 11, 14]) {
    const t = new Date();
    t.setDate(t.getDate() + d);
    t.setHours(h, 0, 0, 0);
    slots.push(t.toISOString());
  }
}

function sendJson(res, body, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/api/chat' && req.method === 'POST') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const msg = (JSON.parse(raw || '{}').message || '').toLowerCase();
        setTimeout(() =>
          sendJson(res, {
            reply: msg.includes('advantage')
              ? 'Medicare Advantage bundles your coverage through a private plan, while a Supplement (Medigap) pays alongside Original Medicare. The right fit depends on your doctors, budget, and travel. Want to book a free call to compare your options?'
              : 'MOCK REPLY: ' + msg,
          }), 300);
      });
      return;
    }
    if (url.pathname === '/api/slots') return sendJson(res, { slots });
    if (url.pathname === '/api/book' && req.method === 'POST') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        const b = JSON.parse(raw || '{}');
        if (!b.name || !b.phone) return sendJson(res, { ok: false, error: 'missing fields' }, 400);
        sendJson(res, { ok: true, when: b.slot ? new Date(b.slot).toLocaleString() : undefined });
      });
      return;
    }
    // static
    let file = url.pathname === '/' || url.pathname === '/demo.html'
      ? path.join(__dirname, 'demo.html')
      : path.join(WIDGET, path.basename(url.pathname));
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end('nope'); }
      const type = file.endsWith('.js') ? 'text/javascript' : 'text/html';
      res.writeHead(200, { 'Content-Type': type });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log(`test server on http://localhost:${PORT}`));
