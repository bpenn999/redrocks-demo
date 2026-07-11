#!/usr/bin/env node
/* Packages the home page into ONE self-contained file for an Artifact preview:
   inlines CSS + JS, drops external font/YouTube hosts (Artifact CSP blocks them),
   makes internal nav links inert. Output: site/preview.html (body content only). */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const S = path.resolve(__dirname, '..');

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(S, 'designs', 'gridline.css'), 'utf8');
const borealis = fs.readFileSync(path.join(S, 'experiences', 'borealis.js'), 'utf8');
const app = fs.readFileSync(path.join(S, 'assets', 'app.js'), 'utf8');

// brand-token <style> block from head
const tokens = (html.match(/<style>:root\{[\s\S]*?<\/style>/) || [''])[0];
// body inner
let body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
// drop the external script includes (we inline below)
body = body.replace(/<script src="[^"]*"[^>]*><\/script>/g, '');
// replace the YouTube iframe with an outbound link card (external hosts are blocked in artifacts)
body = body.replace(/<div class="videoframe">[\s\S]*?<\/div>/,
  '<a class="videoframe" href="https://youtu.be/BS-HOCb1fRQ" target="_blank" rel="noopener" style="display:grid;place-items:center;text-decoration:none;color:#fff;background:linear-gradient(135deg,#14294a,#1c3d6e)"><span style="text-align:center"><span style="display:block;font-size:3rem">▶</span><b style="font-family:var(--font-head);color:#fff">Watch Christian\'s intro on YouTube</b></span></a>');
// make internal links inert for the single-page preview
body = body.replace(/href="\/(?:services|learn|tools|about|contact)\/?"/g, 'href="#"');
body = body.replace(/href="\/"/g, 'href="#"');

const banner = '<div style="background:#14294a;color:#fff;text-align:center;padding:9px 16px;font:600 13px/1.4 system-ui,sans-serif">Interactive preview — the home page only (move the aurora, run the quote funnel). The full multi-page site deploys live on Vercel.</div>';

const out = `<style>\n${css}\n</style>\n${tokens}\n${banner}\n${body}\n<script>\n${borealis}\n</script>\n<script>\n${app}\n</script>\n`;
fs.writeFileSync(path.join(S, 'preview.html'), out);
console.log('✓ wrote site/preview.html (' + Math.round(out.length / 1024) + ' KB)');
