const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const DIST = path.join(__dirname, 'dist');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); let fp = path.join(DIST, p);
  if (fp.endsWith('/')) fp = path.join(fp, 'index.html');
  fs.readFile(fp, (e, buf) => { if (e) { res.writeHead(404); res.end('404'); } else { res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' }); res.end(buf); } });
});
(async () => {
  await new Promise(r => server.listen(4600, r));
  const b = await chromium.launch({ executablePath: process.env.PW });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await pg.goto('http://localhost:4600/', { waitUntil: 'load' });
  // funnel: type ZIP + continue
  await pg.fill('#zip', '84101'); await pg.click('#zip-go');
  await pg.fill('#age', '66'); await pg.click('#age-go');
  await pg.click('[data-key="path"][data-choice="advantage"]');
  await pg.click('[data-key="doctors"][data-choice="med"]');
  await pg.click('[data-key="rx"][data-choice="few"]');
  await pg.waitForTimeout(300);
  const resultVisible = await pg.isVisible('[data-step="result"] .result-body .big');
  const resultText = await pg.textContent('[data-step="result"] .result-body').catch(() => '');
  await pg.screenshot({ path: path.join(__dirname, 'shot-funnel-result.png') });
  // calculator: eligibility
  await pg.goto('http://localhost:4600/tools/', { waitUntil: 'load' });
  await pg.selectOption('#elig-month', '4'); await pg.fill('#elig-year', '1961');
  await pg.waitForTimeout(200);
  const eligOut = await pg.textContent('#elig-out');
  await pg.fill('#pb-months', '24'); await pg.waitForTimeout(150);
  const pbOut = await pg.textContent('#pb-out');
  await b.close(); server.close();
  console.log('FUNNEL result visible:', resultVisible);
  console.log('FUNNEL text:', resultText.replace(/\s+/g, ' ').trim().slice(0, 160));
  console.log('ELIG out:', eligOut.replace(/\s+/g, ' ').trim());
  console.log('PARTB out:', pbOut.replace(/\s+/g, ' ').trim());
})();
