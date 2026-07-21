// End-to-end check of the widget against the mock server.
// Usage: node chatbot/test/serve.js &  then  node chatbot/test/e2e.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage();
  const fail = (m) => { console.error('FAIL:', m); process.exit(1); };

  await page.goto('http://localhost:8787/demo.html');

  // 1. Loader renders the bubble; the heavy widget is NOT loaded yet.
  await page.waitForSelector('#mom-chat-btn');
  const widgetRequested = await page.evaluate(() =>
    performance.getEntriesByType('resource').some((r) => r.name.endsWith('/widget.js') && r.initiatorType === 'script'));
  if (widgetRequested) fail('widget.js was loaded before any interaction');
  console.log('ok: bubble visible, widget.js not yet executed');

  // 2. Click opens panel with greeting + quick replies.
  await page.click('#mom-chat-btn');
  await page.waitForSelector('#mom-chat-panel.mom-open');
  await page.waitForSelector('.mom-msg.bot');
  await page.waitForSelector('.mom-quick');
  console.log('ok: panel opens with greeting and quick replies');

  // 3. Ask a question, get the mocked answer.
  await page.fill('.mom-inbar input', 'What is Medicare Advantage vs a supplement?');
  await page.press('.mom-inbar input', 'Enter');
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.mom-msg.bot')].some((e) => e.textContent.includes('Medigap')));
  console.log('ok: Q&A round-trip works');

  // 4. Booking: quick chip -> slots -> form -> confirmation.
  await page.waitForSelector('.mom-quick button');
  await page.click('.mom-quick button'); // "Book a free call" chip after answer
  await page.waitForSelector('.mom-slot');
  await page.click('.mom-slot');
  await page.waitForSelector('.mom-form');
  await page.fill('.mom-form input[name="name"]', 'Test Person');
  await page.fill('.mom-form input[name="phone"]', '801-555-0100');
  await page.fill('.mom-form input[name="email"]', 'test@example.com');
  await page.click('.mom-form .mom-cta');
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.mom-msg.bot')].some((e) => e.textContent.includes('booked')));
  console.log('ok: booking flow completes');

  // 5. Toggle close/open via bubble.
  await page.click('#mom-chat-btn');
  await page.waitForFunction(() => !document.querySelector('#mom-chat-panel.mom-open'));
  await page.click('#mom-chat-btn');
  await page.waitForSelector('#mom-chat-panel.mom-open');
  console.log('ok: bubble toggles the panel');

  await page.screenshot({ path: 'chatbot/test/shot-widget.png' });
  await browser.close();
  console.log('ALL E2E CHECKS PASSED');
})().catch((e) => { console.error('FAIL:', e); process.exit(1); });
