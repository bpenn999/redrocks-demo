const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const DIST = path.join(__dirname, 'dist');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  let fp = path.join(DIST, p);
  if (fp.endsWith('/')) fp = path.join(fp, 'index.html');
  if (!fs.existsSync(fp) && fs.existsSync(fp + '/index.html')) fp = fp + '/index.html';
  if (!fs.existsSync(fp) && fs.existsSync(path.join(DIST, p, 'index.html'))) fp = path.join(DIST, p, 'index.html');
  fs.readFile(fp, (e, buf) => { if (e) { res.writeHead(404); res.end('404'); } else { res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream' }); res.end(buf); } });
});
(async () => {
  await new Promise(r => server.listen(4599, r));
  const browser = await chromium.launch({ executablePath: process.env.PW || undefined });
  const errors = [];
  const shots = [['/', 'home'], ['/tools/', 'tools'], ['/services/medicare-advantage/', 'service'], ['/learn/advantage-vs-medigap/', 'article'], ['/contact/', 'contact']];
  for (const [url, name] of shots) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('console', m => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`); });
    page.on('pageerror', e => errors.push(`[${name}] ${e.message}`));
    await page.goto('http://localhost:4599' + url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(__dirname, `shot-${name}.png`), fullPage: name !== 'home' });
    if (name === 'home') await page.screenshot({ path: path.join(__dirname, 'shot-home-full.png'), fullPage: true });
    await page.close();
  }
  await browser.close(); server.close();
  console.log('errors:', errors.length ? '\n' + errors.join('\n') : 'none');
})();
