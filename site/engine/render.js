#!/usr/bin/env node
/* ============================================================
   engine/render.js — Ambrose-style static site generator
   Formula: borealis × gridline × medicare-advantage
   Reads content/agency.json → writes the full multi-page site to dist/.
   Run:  node site/engine/render.js
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.resolve(__dirname, '..', '..'); // publish to the repo root
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'agency.json'), 'utf8'));
const blogFile = path.join(ROOT, 'content', 'blog.json');
const blog = fs.existsSync(blogFile) ? (JSON.parse(fs.readFileSync(blogFile, 'utf8')).posts || []) : [];
const A = data.agency, B = data.brand, C = data.compliance;
const YEAR = new Date('2026-07-11').getFullYear(); // build stamp (fixed for reproducibility)
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const isPh = s => /PLACEHOLDER/.test(String(s || ''));
const phone = isPh(A.phone) ? '' : A.phone;
const email = isPh(A.email) ? '' : A.email;

/* ---------- shared chrome ---------- */
function brandTokens() {
  return `:root{--ink:${B.ink};--primary:${B.primary};--primary-deep:${B.primaryDeep};--accent:${B.accent};--teal:${B.teal || '#27a6bd'};--bg:${B.bg};--surface:${B.surface};--soft:${B.soft};--line:${B.line};--muted:${B.muted};${B.fontDisplay ? `--font-display:${B.fontDisplay};` : ''}--font-head:${B.fontHead};--font-body:${B.fontBody};}`;
}

// Faceted iceberg mark — recreates the Everything Senior Insurance logo icon.
// Drop the REAL logo into site/assets/logo.(svg|png|webp|jpg) and the nav uses it automatically.
const ICEBERG = '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true">' +
  '<path d="M20 4l8 16H12z" fill="#ffffff"/>' +
  '<path d="M20 4v16h-8z" fill="#dff2f8"/>' +
  '<path d="M14 12l4 8h-8z" fill="#eaf8fc"/>' +
  '<path d="M6 21h28l-5 8.5L20 37l-9-7.5z" fill="#f2fbfd"/>' +
  '<path d="M20 21h14l-5 8.5L20 37z" fill="#cfeaf3"/>' +
  '<path d="M11 29.5L20 37V21h-6z" fill="#e4f5fa"/>' +
  '<path d="M20 21h6l3 8.5L20 33z" fill="#bfe2ee"/>' +
  '</svg>';
const LOGO_EXT = ['svg', 'png', 'webp', 'jpg', 'jpeg'].find(e => fs.existsSync(path.join(ROOT, 'assets', 'logo.' + e)));
const LOGO_SRC = LOGO_EXT ? '/assets/logo.' + LOGO_EXT : null;
function brandMark(dark) {
  // Use the real horizontal logo file in the light nav if provided; SVG iceberg elsewhere.
  if (LOGO_SRC && !dark) return `<a class="brand brand-img" href="/"><img class="logo-full" src="${LOGO_SRC}" alt="${esc(A.name)} — ${esc(A.formerly || '')}" height="46"></a>`;
  return null;
}

function nav(active) {
  const items = [['Home', '/'], ['Services', '/services/'], ['Learn', '/learn/'], ['Blog', '/blog/'], ['Tools', '/tools/'], ['About', '/about/'], ['Contact', '/contact/']];
  const brand = brandMark(false) || `<a class="brand" href="/"><span class="logo" aria-hidden="true">${ICEBERG}</span><b>${esc(A.shortName)}<span>Medicare · ACA · Senior — Utah</span></b></a>`;
  return `<header class="nav"><div class="wrap nav-inner">
  ${brand}
  <nav class="nav-links" aria-label="Primary">${items.map(([l, h]) => `<a href="${h}"${h === active ? ' aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
  <div class="nav-cta">${phone ? `<a class="btn btn-ghost" href="tel:${esc(phone.replace(/[^0-9+]/g, ''))}">${esc(phone)}</a>` : ''}<a class="btn btn-primary" href="/contact/">${esc(A.cta)}</a>
  <button class="nav-toggle" aria-label="Menu">☰</button></div>
  </div></header>`;
}

function footer() {
  const COLS = [
    { h: 'Company', links: [
      ['About Us', '/about/'], ['Meet the Team', '/about/'], ['Services', '/services/'],
      ['Locations', '/contact/'], ['Blog & Resources', '/blog/'], ['The Everything Medicare Podcast', '/about/'], ['Reviews', '/about/'],
      ['License Verification', '/contact/'], ['Medicare Forms', '/tools/'], ['FAQ', '/#faq'],
      ['Contact', '/contact/'], ['Privacy Policy', '/contact/'] ] },
    { h: 'Medicare 101', links: [
      ['Medicare Guide', '/learn/medicare-parts-explained/'], ['What Is Medicare?', '/learn/medicare-parts-explained/'],
      ['Medicare vs Medicaid', '/learn/'], ['Medicare Eligibility', '/tools/#tool-eligibility'],
      ['Medicare Enrollment Periods', '/learn/when-to-enroll-medicare/'], ['How to Enroll in Medicare', '/learn/when-to-enroll-medicare/'],
      ['Understanding Medicare Part D', '/services/part-d-prescription/'] ] },
    { h: 'Plans & Coverage', links: [
      ['Medicare Advantage Plans', '/services/medicare-advantage/'], ['Medicare Supplement (Medigap) Plans', '/services/medicare-supplement/'],
      ['Part D Prescription Drug Plans', '/services/part-d-prescription/'], ['ACA Health Insurance (Under 65)', '/services/aca-marketplace/'],
      ['Medicare HMO Plans', '/services/medicare-advantage/'], ['Medicare PPO Plans', '/services/medicare-advantage/'],
      ['Special Needs Plans (SNPs)', '/services/medicare-advantage/'] ] },
    { h: 'Free Tools', links: [
      ['Medicare Cost Calculator', '/tools/#tool-cost-estimator'], ['MA vs Medigap Quiz', '/tools/#tool-ma-vs-medigap'],
      ['Medicare Eligibility Checker', '/tools/#tool-eligibility'], ['Part B Penalty Estimator', '/tools/#tool-part-b-penalty'],
      ['Part D Penalty Estimator', '/tools/#tool-part-d-penalty'], ['IRMAA Bracket Lookup', '/tools/#tool-irmaa'],
      ['Enrollment Timeline', '/learn/when-to-enroll-medicare/'] ] }
  ];
  const cols = COLS.map(c => `<div><h5>${esc(c.h)}</h5><ul>${c.links.map(([l, h]) => `<li><a href="${h}">${esc(l)}</a></li>`).join('')}</ul></div>`).join('');
  const contact = `<div><h5>Contact</h5><ul class="foot-contact">
    ${phone ? `<li><a href="tel:${esc(phone.replace(/[^0-9+]/g, ''))}">${esc(phone)}</a></li>` : ''}
    ${email ? `<li><a href="mailto:${esc(email)}">${esc(email)}</a></li>` : ''}
    <li>${esc(A.street || A.address)}</li><li>${esc([A.locality, A.region, A.postal].filter(Boolean).join(', '))}</li>
    <li>${esc(A.hours)}</li>
    ${A.reviews ? `<li style="color:#e8a13a;font-weight:600">★ ${esc(A.reviews.rating)} · ${esc(A.reviews.count)} ${esc(A.reviews.source)} reviews</li>` : ''}
  </ul></div>`;
  return `<footer class="site"><div class="wrap">
  <div class="foot-brand"><span class="logo">${ICEBERG}</span><div><b>${esc(A.name)}</b>${A.formerly ? `<span style="font-style:italic">${esc(A.formerly)}</span>` : ''}</div></div>
  <div class="foot-grid">
    ${cols}
    ${contact}
  </div>
  <div class="disclaimer">
    <p><strong>${esc(A.name)}</strong>${A.formerly ? ` (${esc(A.formerly)})` : ''} &middot; ${esc(A.address)} &middot; NPN ${esc(A.npn)} &middot; ${esc(A.hours)}${A.reviews ? ` &middot; ★ ${esc(A.reviews.rating)} (${esc(A.reviews.count)} ${esc(A.reviews.source)} reviews)` : ''}</p>
    <p>${esc(C.nonAffiliation)}</p>
    <p>${esc(C.tpmo)}</p>
    ${C.integrity ? `<p>${esc(C.integrity)}</p>` : ''}
    <p>${esc(C.informational)}</p>
    <p>&copy; ${YEAR} ${esc(A.name)}. All rights reserved. Reference model: <a href="${esc(data.meta.reference)}" rel="nofollow">eseniorinsurance.com</a>.</p>
  </div>
  </div></footer>`;
}

function jsonld(objs) {
  return objs.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
}
const orgAuthor = { '@type': 'Organization', name: `${A.shortName} Data Desk`, url: 'https://www.medicare.gov' };
function localBusiness() {
  return { '@context': 'https://schema.org', '@type': 'InsuranceAgency', name: A.name, alternateName: A.formerly ? 'Christian Brindle Insurance Services' : undefined, description: A.tagline, areaServed: A.serviceArea, address: { '@type': 'PostalAddress', streetAddress: A.street || undefined, addressLocality: A.locality || 'Sandy', addressRegion: A.region || 'UT', postalCode: A.postal || undefined, addressCountry: 'US' }, ...(phone ? { telephone: phone } : {}), ...(email ? { email } : {}), ...(A.reviews ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: A.reviews.rating, reviewCount: A.reviews.count, bestRating: '5' } } : {}), employee: { '@type': 'Person', name: A.advisor, jobTitle: A.advisorTitle } };
}
function faqSchema(items) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
}
function crumbSchema(trail) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t[0], item: t[1] })) };
}

function page({ title, desc, active, schema = [], body, extraJs = '' }) {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/designs/gridline.css">
<style>${brandTokens()}</style>
${jsonld(schema)}
</head><body>
${nav(active)}
${body}
${footer()}
<script src="/assets/app.js" defer></script>
${extraJs}
</body></html>`;
}

function crumbs(trail) {
  return `<div class="wrap"><nav class="crumbs" aria-label="Breadcrumb">${trail.map((t, i) => i < trail.length - 1 ? `<a href="${t[1]}">${esc(t[0])}</a> › ` : `<span>${esc(t[0])}</span>`).join('')}</nav></div>`;
}

/* ---------- HOME ---------- */
function home() {
  const badges = [(A.reviews ? `★ ${A.reviews.rating} on ${A.reviews.source} (${A.reviews.count} reviews)` : 'Independent agency'), 'Sandy · Salt Lake City, UT', 'No cost to compare', 'Medicare · ACA · Senior'].map(b => `<span>${esc(b)}</span>`).join('');
  const hero = `<section class="hero">
  <canvas class="borealis" data-borealis aria-hidden="true"></canvas><div class="hero-grad"></div>
  <div class="wrap hero-inner">
    <div>
      <span class="eyebrow">${esc(A.city)} · Independent</span>
      <h1>Everything Senior Insurance — Medicare made clear</h1>
      ${A.formerly ? `<p style="font-style:italic;color:rgba(255,255,255,.7);margin:-4px 0 10px;font-size:.95rem">${esc(A.formerly)}</p>` : ''}
      <p class="lead">${esc(A.tagline)}. Compare Medicare Advantage, Medigap, Part D and ACA plans against your own doctors and prescriptions — with no pressure and no cost to you.</p>
      <div class="hero-badges">${badges}</div>
    </div>
    <div class="funnel" data-funnel>
      <div class="funnel-head"><span class="k">Find your plans</span><span class="step-count">Step 1 of 6</span></div>
      <div class="progress"><i></i></div>
      <div class="step active" data-step="zip"><h4>What's your ZIP code?</h4><p class="hint">We start local — plan availability is set by your county.</p>
        <input type="text" id="zip" inputmode="numeric" maxlength="5" placeholder="e.g. 84101" aria-label="ZIP code">
        <div class="funnel-actions"><span></span><button class="btn btn-primary" id="zip-go">Continue →</button></div></div>
      <div class="step" data-step="age"><h4>How old are you?</h4><p class="hint">This tells us whether Medicare or an ACA plan fits.</p>
        <input type="number" id="age" inputmode="numeric" placeholder="e.g. 65" aria-label="Age">
        <div class="funnel-actions"><button class="link-back">← Back</button><button class="btn btn-primary" id="age-go">Continue →</button></div></div>
      <div class="step" data-step="path"><h4>Which best describes you?</h4><p class="hint">Pick one — you can change this anytime.</p>
        <div class="choices">
          <button class="choice" data-key="path" data-choice="advantage"><b>All-in-one simplicity</b><small>Lean toward Medicare Advantage</small></button>
          <button class="choice" data-key="path" data-choice="medigap"><b>Freedom to see any doctor</b><small>Lean toward Medigap</small></button>
          <button class="choice" data-key="path" data-choice="original"><b>Just help me understand it</b><small>Original Medicare + drug plan</small></button>
        </div><div class="funnel-actions"><button class="link-back">← Back</button><span></span></div></div>
      <div class="step" data-step="doctors"><h4>How often do you see doctors?</h4><p class="hint">Helps us weigh networks vs. freedom.</p>
        <div class="choices">
          <button class="choice" data-key="doctors" data-choice="low"><b>Rarely</b><small>Routine care only</small></button>
          <button class="choice" data-key="doctors" data-choice="med"><b>Sometimes</b><small>A few specialists</small></button>
          <button class="choice" data-key="doctors" data-choice="high"><b>Often</b><small>Ongoing conditions</small></button>
        </div><div class="funnel-actions"><button class="link-back">← Back</button><span></span></div></div>
      <div class="step" data-step="rx"><h4>Do you take prescriptions?</h4><p class="hint">We match your drugs to the lowest-cost plan.</p>
        <div class="choices">
          <button class="choice" data-key="rx" data-choice="none"><b>None right now</b></button>
          <button class="choice" data-key="rx" data-choice="few"><b>A few</b><small>1–4 medications</small></button>
          <button class="choice" data-key="rx" data-choice="many"><b>Several</b><small>5 or more</small></button>
        </div><div class="funnel-actions"><button class="link-back">← Back</button><span></span></div></div>
      <div class="step" data-step="result"><div class="result-card"><div class="result-body"></div>
        <a class="btn btn-accent" href="/contact/" style="width:100%;justify-content:center;margin-top:6px">${esc(A.cta)} →</a>
        <p class="hint" style="text-align:center;margin-top:10px">${esc(C.tcpa)}</p>
        <div class="funnel-actions"><button class="link-back">← Back</button><span></span></div></div></div>
    </div>
  </div></section>`;

  const trustbar = `<section class="trustbar"><div class="wrap"><div class="carriers">${data.trust.carriers.map(c => `<span>${esc(c)}</span>`).join('')}</div></div></section>`;

  const services = `<section class="section"><div class="wrap">
    <div class="center reveal"><span class="eyebrow">What we help with</span><h2>One advisor for every stage of senior coverage</h2><p class="lead">We're independent, so we compare across carriers to fit your life — not a sales quota.</p></div>
    <div class="grid cols-2" style="margin-top:40px">${data.productLines.map((p, i) => `<div class="card hover reveal"><div class="ic">${['🩺', '🛡️', '💊', '➕'][i] || '✓'}</div><span class="tag">${esc(p.name.split('(')[0].trim())}</span><h3 style="margin-top:10px">${esc(p.name)}</h3><p style="color:var(--muted)">${esc(p.short)}</p><a class="more" href="/services/${p.slug}/">Explore ${esc(p.name.split('(')[0].split(' ')[0])} →</a></div>`).join('')}</div>
  </div></section>`;

  const databand = `<section class="section databand"><div class="wrap">
    <div class="center reveal"><span class="eyebrow" style="color:#7fe0d4">By the numbers</span><h2>Real Medicare data, plainly stated</h2><p class="lead">Figures year-stamped ${data.meta.dataYear} from CMS, Medicare.gov and KFF. Your county's live plan counts populate through the quote tool above.</p></div>
    <div class="grid cols-3" style="margin-top:40px">${data.marketData.stats.map(s => `<div class="datastat reveal"><b data-countup="${esc(s.value)}">${esc(s.value)}</b><small>${esc(s.label)}</small><br><a href="${esc(s.url)}" rel="nofollow">${esc(s.source)}</a></div>`).join('')}</div>
  </div></section>`;

  const how = `<section class="section"><div class="wrap">
    <div class="center reveal"><span class="eyebrow">How it works</span><h2>Three simple steps</h2></div>
    <div class="steps" style="margin-top:48px">
      <div class="step-item reveal"><h3>Tell us your situation</h3><p style="color:var(--muted)">Your ZIP, your doctors, your prescriptions. Five minutes on the phone or online.</p></div>
      <div class="step-item reveal"><h3>We compare your options</h3><p style="color:var(--muted)">We check every plan we offer against your exact doctors and drugs — networks, formularies, and costs.</p></div>
      <div class="step-item reveal"><h3>You choose with confidence</h3><p style="color:var(--muted)">We enroll you, then review it every fall so your plan still fits. No cost to you, ever.</p></div>
    </div></div></section>`;

  const video = `<section class="section tight"><div class="wrap"><div class="bio">
    <div><span class="eyebrow">Meet your advisor</span><h2>${esc(A.advisor)}</h2><p class="lead" style="margin-bottom:14px">${esc(A.brandVoice)}</p><p style="color:var(--muted)">${esc(A.advisor)} is an independent, ${esc(A.city)}–based ${esc(A.advisorTitle).toLowerCase()} who helps Utah families cut through Medicare and ACA confusion and choose coverage that actually fits. Watch the quick intro, then reach out whenever you're ready.</p><a class="btn btn-primary" href="/about/">More about ${esc(A.advisor.split(' ')[0])} →</a></div>
    <div class="videoframe"><iframe src="https://www.youtube-nocookie.com/embed/${esc(A.videoId)}" title="${esc(A.videoTitle)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
  </div></div></section>`;

  const podcast = A.podcast ? `<section class="section tight"><div class="wrap"><div class="ctaband reveal podband" style="background:linear-gradient(135deg,#1c8ba6,var(--primary-deep))">
    <div style="font-size:3.2rem" aria-hidden="true">🎙️</div>
    <div><span class="eyebrow" style="color:#9fe8f2">Since ${esc(A.podcast.since)}</span><h2 style="margin-bottom:6px">${esc(A.podcast.name)}</h2><p style="margin:0;text-align:left;max-width:64ch">${esc(A.podcast.tagline)} Hosted by ${esc(A.podcast.host)}, each episode answers real listener questions and keeps you current on Medicare rules, policies, and coverage choices.</p></div>
    <a class="btn btn-accent" href="${esc(A.podcast.url)}" target="_blank" rel="noopener" style="white-space:nowrap">Listen to the podcast →</a>
  </div></div></section>` : '';
  const faq = `<section class="section" id="faq"><div class="wrap" style="max-width:820px">
    <div class="center reveal"><span class="eyebrow">Common questions</span><h2>Straight answers</h2></div>
    <div class="faq" style="margin-top:36px">${data.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>
  </div></section>`;

  const cta = `<section class="section"><div class="wrap"><div class="ctaband reveal"><h2>Ready to make Medicare simple?</h2><p>Talk to a licensed, local advisor who compares your options across carriers — with zero pressure and no cost to you.</p><a class="btn btn-accent" href="/contact/">${esc(A.cta)} →</a></div></div></section>`;

  return page({
    title: `${A.name} — Medicare, ACA & Senior Insurance in ${A.city}`,
    desc: `${A.tagline}. Independent, local help comparing Medicare Advantage, Medigap, Part D and ACA plans. No cost to compare.`,
    active: '/',
    schema: [localBusiness(), faqSchema(data.faq)],
    body: hero + trustbar + services + databand + how + video + podcast + faq + cta,
    extraJs: `<script src="/experiences/borealis.js" defer></script>`
  });
}

/* ---------- BLOG (local Sandy / SLC) ---------- */
function fmtDate(iso) { const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); }
function blogHub() {
  const trail = [['Home', '/'], ['Blog', '/blog/']];
  const posts = blog.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const cards = posts.map(p => `<a class="card hover" href="/blog/${p.slug}/" style="text-decoration:none;color:inherit"><span class="tag">${esc(p.category)}${p.location ? ' · ' + esc(p.location) : ''}</span><h3 style="margin-top:12px">${esc(p.title)}</h3><p style="color:var(--muted)">${esc(p.excerpt)}</p><span class="more">${fmtDate(p.date)} · ${esc(p.read)} →</span></a>`).join('');
  const body = `${crumbs(trail)}
  <section class="pagehead"><div class="wrap"><span class="eyebrow">Blog</span><h1>Medicare news & tips for Sandy & Salt Lake City</h1><p class="lead">Local, plain-English Medicare updates from your ${esc(A.city)} advisor — refreshed regularly.</p></div></section>
  <section class="section"><div class="wrap"><div class="grid cols-3">${cards || '<p>New posts are on the way.</p>'}</div></div></section>`;
  return page({ title: `Blog — Medicare news for Sandy & Salt Lake City — ${A.shortName}`, desc: 'Local Sandy and Salt Lake City Medicare news, tips, and 2026 updates from an independent advisor.', active: '/blog/', schema: [crumbSchema(trail), { '@context': 'https://schema.org', '@type': 'Blog', name: `${A.name} Blog`, url: '/blog/', publisher: orgAuthor }], body });
}
function blogPost(p) {
  const trail = [['Home', '/'], ['Blog', '/blog/'], [p.title.split(':')[0], `/blog/${p.slug}/`]];
  const artSchema = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.excerpt, author: orgAuthor, publisher: orgAuthor, datePublished: p.date, dateModified: p.updated || p.date, reviewedBy: { '@type': 'Person', name: A.advisor, jobTitle: A.advisorTitle }, mainEntityOfPage: `/blog/${p.slug}/`, about: 'Medicare', keywords: (p.keywords || []).join(', ') };
  const datasets = (p.sources || []).map(s => ({ '@context': 'https://schema.org', '@type': 'Dataset', name: s.name, creator: { '@type': 'Organization', name: s.name, url: s.url }, license: 'https://creativecommons.org/publicdomain/zero/1.0/', isAccessibleForFree: true }));
  const schema = [artSchema, crumbSchema(trail)].concat(p.faq ? [faqSchema(p.faq)] : []).concat(datasets);
  const tldr = p.tldr ? `<div class="card" style="background:var(--soft);border-left:4px solid var(--accent)"><h3 style="margin-top:0">Key takeaways</h3><ul>${p.tldr.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : '';
  const bodyHtml = p.body.map(s => `<h2>${esc(s.h)}</h2>${(s.p || []).filter(Boolean).map(x => `<p>${esc(x)}</p>`).join('')}${s.list ? `<ul>${s.list.map(li => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}`).join('');
  const faqHtml = p.faq ? `<h2>Frequently asked questions</h2><div class="faq">${p.faq.map(f => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>` : '';
  const sourcesHtml = p.sources ? `<h2>Sources</h2><ul>${p.sources.map(s => `<li><a href="${esc(s.url)}" rel="nofollow">${esc(s.name)}</a></li>`).join('')}</ul>` : '';
  const related = blog.filter(x => x.slug !== p.slug).slice(0, 3);
  const relHtml = related.length ? `<section class="section tight"><div class="wrap"><h2>More from the blog</h2><div class="grid cols-3" style="margin-top:24px">${related.map(r => `<a class="card hover" href="/blog/${r.slug}/" style="text-decoration:none;color:inherit"><span class="tag">${esc(r.category)}</span><h3 style="margin-top:10px;font-size:1.1rem">${esc(r.title)}</h3><span class="more">Read →</span></a>`).join('')}</div></div></section>` : '';
  const body = `${crumbs(trail)}
  <section class="pagehead"><div class="wrap" style="max-width:820px"><span class="tag">${esc(p.category)}${p.location ? ' · ' + esc(p.location) : ''} · ${esc(p.read)} read</span><h1 style="margin-top:14px">${esc(p.title)}</h1><p class="lead">${esc(p.excerpt)}</p><p style="font-size:.85rem;color:var(--muted)">By the ${esc(A.shortName)} Data Desk · Reviewed by ${esc(A.advisor)}, ${esc(A.advisorTitle)} · Published ${fmtDate(p.date)}${p.updated && p.updated !== p.date ? ` · Updated ${fmtDate(p.updated)}` : ''}</p></div></section>
  <section class="section"><div class="wrap" style="max-width:760px"><div class="prose">
  ${tldr}
  ${bodyHtml}
  ${faqHtml}
  <div class="card" style="margin-top:36px;background:var(--soft)"><h3>Questions about this in Sandy or Salt Lake City?</h3><p style="color:var(--muted)">Talk to a local, licensed advisor — free, no pressure.</p><a class="btn btn-primary" href="/contact/">${esc(A.cta)} →</a></div>
  ${sourcesHtml}
  <p class="disclaimer" style="border-top:1px solid var(--line);color:var(--muted);font-size:.78rem;margin-top:24px;padding-top:16px">${esc(C.informational)} ${esc(C.tpmo)}</p>
  </div></div></section>
  ${relHtml}`;
  return page({ title: `${p.title} — ${A.shortName}`, desc: p.excerpt, active: '/blog/', schema, body });
}

/* ---------- SERVICES HUB + PAGES ---------- */
function servicesHub() {
  const body = `${crumbs([['Home', '/'], ['Services', '/services/']])}
  <section class="pagehead"><div class="wrap"><span class="eyebrow">Services</span><h1>Coverage we help you compare</h1><p class="lead">Independent guidance across Medicare and ACA. We do not offer every plan available in your area — but we'll always tell you your options.</p></div></section>
  <section class="section"><div class="wrap"><div class="grid cols-2">
  ${data.productLines.map((p, i) => `<div class="card hover"><div class="ic">${['🩺','🛡️','💊','➕'][i]||'✓'}</div><h3>${esc(p.name)}</h3><p style="color:var(--muted)">${esc(p.short)}</p><p style="font-size:.92rem"><b>Who it's for:</b> ${esc(p.who)}</p><a class="more" href="/services/${p.slug}/">Full details →</a></div>`).join('')}
  </div></div></section>`;
  return page({ title: `Services — ${A.shortName}`, desc: 'Medicare Advantage, Medigap, Part D and ACA plans — compared independently for Salt Lake City and all of Utah.', active: '/services/', schema: [crumbSchema([['Home', '/'], ['Services', '/services/']])], body });
}

function servicePage(p) {
  const trail = [['Home', '/'], ['Services', '/services/'], [p.name, `/services/${p.slug}/`]];
  const svcSchema = { '@context': 'https://schema.org', '@type': 'Service', name: p.name, serviceType: p.name, description: p.short, areaServed: A.serviceArea, provider: localBusiness(), author: orgAuthor };
  const body = `${crumbs(trail)}
  <section class="pagehead"><div class="wrap"><span class="eyebrow">Service</span><h1>${esc(p.name)}</h1><p class="lead">${esc(p.short)}</p></div></section>
  <section class="section"><div class="wrap split-side">
    <div class="prose">${p.long.map(par => `<p>${esc(par)}</p>`).join('')}
      <h2>What's included</h2><ul>${p.bullets.map(b => `<li>${esc(b)}</li>`).join('')}</ul>
      <h2>Who it's for</h2><p>${esc(p.who)}</p>
    </div>
    <aside class="card"><h3>Compare ${esc(p.name.split('(')[0].split(' ')[0])} plans</h3><p style="color:var(--muted);font-size:.95rem">Get an independent comparison against your own doctors and prescriptions — free.</p><a class="btn btn-primary" href="/contact/" style="width:100%;justify-content:center">${esc(A.cta)} →</a>${phone ? `<p style="text-align:center;margin-top:12px;font-size:.95rem">or call <a href="tel:${esc(phone.replace(/[^0-9+]/g,''))}">${esc(phone)}</a></p>` : ''}
    <p class="disclaimer" style="border:0;color:var(--muted);font-size:.75rem;margin-top:14px;padding:0">${esc(C.tpmo)}</p></aside>
  </div></section>
  <section class="section tight"><div class="wrap"><div class="ctaband"><h2>Not sure this is the right fit?</h2><p>That's what we're here for. A quick, no-pressure call sorts it out.</p><a class="btn btn-accent" href="/contact/">Talk it through →</a></div></div></section>`;
  return page({ title: `${p.name} in Utah — ${A.shortName}`, desc: p.short, active: '/services/', schema: [svcSchema, crumbSchema(trail)], body });
}

/* ---------- LEARN HUB + ARTICLES ---------- */
function learnHub() {
  const body = `${crumbs([['Home', '/'], ['Learn', '/learn/']])}
  <section class="pagehead"><div class="wrap"><span class="eyebrow">Learn</span><h1>Medicare & ACA, explained</h1><p class="lead">Plain-English guides from your ${esc(A.city)} advisor. Updated as the rules change.</p></div></section>
  <section class="section"><div class="wrap"><div class="grid cols-3">
  ${data.learn.map(l => `<a class="card hover" href="/learn/${l.slug}/" style="text-decoration:none;color:inherit"><span class="tag">${esc(l.category)}</span><h3 style="margin-top:12px">${esc(l.title)}</h3><p style="color:var(--muted)">${esc(l.excerpt)}</p><span class="more">Read · ${esc(l.read)} →</span></a>`).join('')}
  </div></div></section>`;
  return page({ title: `Learn — Medicare & ACA guides — ${A.shortName}`, desc: 'Plain-English Medicare and ACA guides from an independent Salt Lake City advisor.', active: '/learn/', schema: [crumbSchema([['Home', '/'], ['Learn', '/learn/']])], body });
}

function articlePage(l) {
  const trail = [['Home', '/'], ['Learn', '/learn/'], [l.title.split(':')[0], `/learn/${l.slug}/`]];
  const artSchema = { '@context': 'https://schema.org', '@type': 'Article', headline: l.title, description: l.excerpt, author: orgAuthor, publisher: orgAuthor, datePublished: `${YEAR}-01-01`, dateModified: `${YEAR}-07-11`, mainEntityOfPage: `/learn/${l.slug}/`, about: 'Medicare' };
  const related = data.learn.filter(x => x.slug !== l.slug).slice(0, 3);
  const body = `${crumbs(trail)}
  <section class="pagehead"><div class="wrap" style="max-width:800px"><span class="tag">${esc(l.category)} · ${esc(l.read)} read</span><h1 style="margin-top:14px">${esc(l.title)}</h1><p class="lead">${esc(l.excerpt)}</p><p style="font-size:.85rem;color:var(--muted)">By the ${esc(A.shortName)} Data Desk · Reviewed by ${esc(A.advisor)}, ${esc(A.advisorTitle)} · Updated ${YEAR}</p></div></section>
  <section class="section"><div class="wrap" style="max-width:760px"><div class="prose">
  ${l.body.map(s => `<h2>${esc(s.h)}</h2>${(s.p || []).filter(Boolean).map(p => `<p>${esc(p)}</p>`).join('')}${s.list ? `<ul>${s.list.map(li => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}`).join('')}
  <div class="card" style="margin-top:36px;background:var(--soft)"><h3>Have a question about this?</h3><p style="color:var(--muted)">Your ${esc(A.city)} advisor is happy to walk through it with you — free, no pressure.</p><a class="btn btn-primary" href="/contact/">${esc(A.cta)} →</a></div>
  <p class="disclaimer" style="border-top:1px solid var(--line);color:var(--muted);font-size:.78rem;margin-top:24px;padding-top:16px">${esc(C.informational)}</p>
  </div></div></section>
  <section class="section tight"><div class="wrap"><h2>Keep reading</h2><div class="grid cols-3" style="margin-top:24px">${related.map(r => `<a class="card hover" href="/learn/${r.slug}/" style="text-decoration:none;color:inherit"><span class="tag">${esc(r.category)}</span><h3 style="margin-top:10px;font-size:1.1rem">${esc(r.title)}</h3><span class="more">Read →</span></a>`).join('')}</div></div></section>`;
  return page({ title: `${l.title} — ${A.shortName}`, desc: l.excerpt, active: '/learn/', schema: [artSchema, crumbSchema(trail)], body });
}

/* ---------- TOOLS ---------- */
function toolsPage() {
  const trail = [['Home', '/'], ['Tools', '/tools/']];
  const body = `${crumbs(trail)}
  <section class="pagehead"><div class="wrap"><span class="eyebrow">Free tools</span><h1>Medicare calculators</h1><p class="lead">Quick, private estimates — nothing is stored or sent. Year-stamped ${data.meta.dataYear}, educational only.</p></div></section>
  <section class="section"><div class="wrap"><div class="grid-tools">
    <div class="tool" id="tool-eligibility"><h3>🗓️ Eligibility & IEP checker</h3><p style="color:var(--muted);font-size:.95rem">When does your Initial Enrollment Period open?</p>
      <label for="elig-month">Birth month</label><select id="elig-month"><option value="">Select…</option>${['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select>
      <label for="elig-year">Birth year</label><input id="elig-year" type="number" placeholder="e.g. 1961" inputmode="numeric">
      <div class="out" id="elig-out">Enter your birth month and year to see your window.</div></div>

    <div class="tool" id="tool-cost-estimator"><h3>💵 Cost estimator</h3><p style="color:var(--muted);font-size:.95rem">Ballpark your yearly Medicare costs.</p>
      <label for="ce-path">Coverage path</label><select id="ce-path"><option value="advantage">Medicare Advantage</option><option value="medigap">Medigap (Plan G) + Part D</option><option value="original">Original Medicare only</option></select>
      <label for="ce-rx">Estimated yearly drug costs ($)</label><input id="ce-rx" type="text" inputmode="numeric" placeholder="e.g. 1200">
      <div class="out" id="ce-out">Choose a path and drug estimate for a yearly figure.</div></div>

    <div class="tool" id="tool-part-b-penalty"><h3>⏰ Part B late penalty</h3><p style="color:var(--muted);font-size:.95rem">Delaying Part B without other coverage adds a lifelong penalty.</p>
      <label for="pb-months">Months you were eligible but not enrolled</label><input id="pb-months" type="number" inputmode="numeric" placeholder="e.g. 24">
      <div class="out" id="pb-out">Enter months to estimate the penalty.</div></div>

    <div class="tool" id="tool-part-d-penalty"><h3>💊 Part D late penalty</h3><p style="color:var(--muted);font-size:.95rem">Going without creditable drug coverage adds a penalty too.</p>
      <label for="pd-months">Months without creditable drug coverage</label><input id="pd-months" type="number" inputmode="numeric" placeholder="e.g. 15">
      <div class="out" id="pd-out">Enter months to estimate the penalty.</div></div>

    <div class="tool" id="tool-irmaa"><h3>📊 IRMAA bracket lookup</h3><p style="color:var(--muted);font-size:.95rem">Higher incomes pay more for Parts B & D (2025, from 2023 income).</p>
      <label for="irmaa-file">Filing status</label><select id="irmaa-file"><option value="single">Single</option><option value="married">Married filing jointly</option></select>
      <label for="irmaa-magi">Modified Adjusted Gross Income ($)</label><input id="irmaa-magi" type="text" inputmode="numeric" placeholder="e.g. 120000">
      <div class="out" id="irmaa-out">Enter your income to see your bracket.</div></div>

    <div class="tool" id="tool-ma-vs-medigap"><h3>⚖️ MA-vs-Medigap quiz</h3><p style="color:var(--muted);font-size:.95rem">Five quick questions to see which path likely fits.</p>
      <label>Do you travel or split time between states?</label><select><option value="">Select…</option><option value="-1">Yes, often</option><option value="1">Rarely</option></select>
      <label>How important is the lowest monthly premium?</label><select><option value="">Select…</option><option value="1">Very important</option><option value="-1">I'll pay more for freedom</option></select>
      <label>Do you want dental/vision/hearing extras built in?</label><select><option value="">Select…</option><option value="1">Yes</option><option value="-1">Not essential</option></select>
      <label>Are you comfortable using a provider network?</label><select><option value="">Select…</option><option value="1">Yes</option><option value="-1">I want any doctor</option></select>
      <label>Do you have ongoing health conditions?</label><select><option value="">Select…</option><option value="-1">Yes, several</option><option value="1">Not really</option></select>
      <div class="out" id="quiz-out">Answer all 5 questions for a suggestion.</div></div>
  </div>
  <p class="disclaimer" style="border-top:1px solid var(--line);color:var(--muted);font-size:.78rem;margin-top:26px;padding-top:16px">${esc(C.informational)} ${esc(C.tpmo)}</p>
  </div></section>`;
  return page({ title: `Free Medicare Tools & Calculators — ${A.shortName}`, desc: 'Free Medicare calculators: eligibility/IEP, Part B & Part D late penalties, IRMAA lookup, cost estimator, and an MA-vs-Medigap quiz.', active: '/tools/', schema: [crumbSchema(trail)], body, extraJs: `<script src="/assets/calculators.js" defer></script>` });
}

/* ---------- ABOUT ---------- */
function aboutPage() {
  const trail = [['Home', '/'], ['About', '/about/']];
  const body = `${crumbs(trail)}
  <section class="pagehead"><div class="wrap"><span class="eyebrow">About</span><h1>Meet ${esc(A.advisor)}</h1><p class="lead">${esc(A.brandVoice)}</p></div></section>
  <section class="section"><div class="wrap"><div class="bio">
    <div class="videoframe"><iframe src="https://www.youtube-nocookie.com/embed/${esc(A.videoId)}" title="${esc(A.videoTitle)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>
    <div class="prose"><p>${esc(A.advisor)} is an independent, ${esc(A.city)}–based ${esc(A.advisorTitle).toLowerCase()} focused on Medicare and senior insurance. Independent means ${esc(A.advisor.split(' ')[0])} isn't tied to one insurance company — so the guidance you get is based on your doctors, your prescriptions, and your budget, not a single carrier's lineup.</p>
    <h2>How we work</h2><p>We keep it human. You'll get a real person who explains your options in plain English, checks that your doctors and medications are covered before you enroll, and reviews your plan every fall so it keeps fitting as plans change.</p>
    <h2>What we help with</h2><ul>${data.productLines.map(p => `<li><b>${esc(p.name)}</b> — ${esc(p.short)}</li>`).join('')}</ul>
    ${A.podcast ? `<h2>${esc(A.podcast.name)}</h2><p>${esc(A.podcast.tagline)}</p><p>${esc(A.podcast.blurb)}</p><p><a class="btn btn-ghost" href="${esc(A.podcast.url)}" target="_blank" rel="noopener">🎙️ Listen to the podcast →</a></p>` : ''}
    <h2>Our promise</h2><p>No pressure, no jargon, and no cost to compare. If a plan isn't right for you, we'll say so.</p>
    <a class="btn btn-primary" href="/contact/">${esc(A.cta)} →</a></div>
  </div></div></section>`;
  return page({ title: `About ${A.advisor} — ${A.shortName}`, desc: `Meet ${A.advisor}, an independent Medicare and senior insurance advisor serving Salt Lake City and all of Utah.`, active: '/about/', schema: [localBusiness(), crumbSchema(trail)], body });
}

/* ---------- CONTACT ---------- */
function contactPage() {
  const trail = [['Home', '/'], ['Contact', '/contact/']];
  const body = `${crumbs(trail)}
  <section class="pagehead"><div class="wrap"><span class="eyebrow">Contact</span><h1>Talk to a licensed advisor</h1><p class="lead">Free, local, no pressure. Reach out and ${esc(A.advisor.split(' ')[0])} will help you compare your options.</p></div></section>
  <section class="section"><div class="wrap split2">
    <div class="card">
      <h3>Send a message</h3>
      <form onsubmit="event.preventDefault();this.querySelector('.out').style.display='block';" >
        <label>Name</label><input type="text" required style="width:100%;padding:12px 14px;border:1.5px solid var(--line);border-radius:10px;margin-bottom:6px">
        <label>Phone</label><input type="tel" required style="width:100%;padding:12px 14px;border:1.5px solid var(--line);border-radius:10px;margin-bottom:6px">
        <label>Email</label><input type="email" style="width:100%;padding:12px 14px;border:1.5px solid var(--line);border-radius:10px;margin-bottom:6px">
        <label>ZIP code</label><input type="text" inputmode="numeric" maxlength="5" style="width:100%;padding:12px 14px;border:1.5px solid var(--line);border-radius:10px;margin-bottom:6px">
        <label>What can we help with?</label><textarea rows="3" style="width:100%;padding:12px 14px;border:1.5px solid var(--line);border-radius:10px;margin-bottom:12px"></textarea>
        <label style="font-weight:400;font-size:.82rem;display:flex;gap:8px;align-items:flex-start"><input type="checkbox" required style="width:auto;margin-top:4px"> <span>${esc(C.tcpa)}</span></label>
        <button class="btn btn-primary" type="submit" style="width:100%;justify-content:center;margin-top:14px">Send →</button>
        <div class="out" style="display:none;margin-top:14px">Thanks! This is a demo form — connect it to GoHighLevel (GHL) to capture leads. ${phone ? 'Meanwhile, call ' + esc(phone) + '.' : ''}</div>
      </form>
      <p class="disclaimer" style="border:0;color:var(--muted);font-size:.75rem;padding:0;margin-top:10px">Form is not yet wired to a CRM. Add your GHL form/webhook to go live.</p>
    </div>
    <div>
      <div class="card" style="margin-bottom:22px"><h3>Reach us directly</h3>
        ${A.reviews ? `<p style="margin:0 0 10px;font-weight:600;color:var(--accent)">★ ${esc(A.reviews.rating)} on ${esc(A.reviews.source)} · ${esc(A.reviews.count)} reviews</p>` : ''}
        <p style="margin:6px 0"><b>Address:</b> ${esc(A.address)}</p>
        <p style="margin:6px 0"><b>Phone:</b> ${phone ? `<a href="tel:${esc(phone.replace(/[^0-9+]/g,''))}">${esc(phone)}</a>` : '<span style="color:#c0392b">[add phone]</span>'}</p>
        <p style="margin:6px 0"><b>Email:</b> ${email ? `<a href="mailto:${esc(email)}">${esc(email)}</a>` : '<span style="color:#c0392b">[add email]</span>'}</p>
        <p style="margin:6px 0"><b>Serving:</b> ${esc(A.serviceArea.join(', '))}</p>
        <p style="margin:6px 0"><b>Hours:</b> ${esc(A.hours)}</p>
      </div>
      <div class="card" style="background:var(--soft)"><h3>Prefer to watch first?</h3><div class="videoframe" style="margin-top:12px"><iframe src="https://www.youtube-nocookie.com/embed/${esc(A.videoId)}" title="${esc(A.videoTitle)}" loading="lazy" allowfullscreen></iframe></div></div>
    </div>
  </div></section>`;
  return page({ title: `Contact — ${A.shortName}`, desc: `Contact ${A.advisor}, independent Medicare & ACA advisor in Salt Lake City. Free, no-pressure help.`, active: '/contact/', schema: [localBusiness(), crumbSchema(trail)], body });
}

/* ---------- write everything ---------- */
function write(rel, html) {
  const dir = path.join(DIST, rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  return rel || '/';
}
function copyDir(src, dstRel) {
  const dst = path.join(DIST, dstRel);
  fs.mkdirSync(dst, { recursive: true });
  for (const f of fs.readdirSync(src)) fs.copyFileSync(path.join(src, f), path.join(dst, f));
}

// Publish into the repo root — clean ONLY generated targets (never site/ or .git).
const GEN_DIRS = ['services', 'learn', 'tools', 'about', 'contact', 'designs', 'experiences', 'assets'];
const GEN_FILES = ['index.html', 'llms.txt', 'robots.txt', 'sitemap.xml'];
GEN_DIRS.forEach(d => fs.rmSync(path.join(DIST, d), { recursive: true, force: true }));
GEN_FILES.forEach(f => fs.rmSync(path.join(DIST, f), { force: true }));
fs.mkdirSync(DIST, { recursive: true });

const written = [];
written.push(write('', home()));
written.push(write('services', servicesHub()));
data.productLines.forEach(p => written.push(write(`services/${p.slug}`, servicePage(p))));
written.push(write('learn', learnHub()));
data.learn.forEach(l => written.push(write(`learn/${l.slug}`, articlePage(l))));
written.push(write('blog', blogHub()));
blog.forEach(p => written.push(write(`blog/${p.slug}`, blogPost(p))));
written.push(write('tools', toolsPage()));
written.push(write('about', aboutPage()));
written.push(write('contact', contactPage()));

// static assets
copyDir(path.join(ROOT, 'designs'), 'designs');
copyDir(path.join(ROOT, 'experiences'), 'experiences');
copyDir(path.join(ROOT, 'assets'), 'assets');

// agentic readiness: llms.txt + robots.txt
const allUrls = written.map(u => '/' + u).map(u => u.replace(/\/$/, '') || '/');
fs.writeFileSync(path.join(DIST, 'llms.txt'), `# ${A.name}\n> ${A.tagline}. Independent Medicare, ACA & senior insurance advisor in ${A.city}.\n\n## Pages\n${allUrls.map(u => `- ${u}`).join('\n')}\n\n## Compliance\n${C.nonAffiliation}\n${C.tpmo}\n\n## Contact\nAdvisor: ${A.advisor} (${A.advisorTitle})\nArea: ${A.serviceArea.join(', ')}\n`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n# AI crawlers welcome\nUser-agent: GPTBot\nAllow: /\nUser-agent: OAI-SearchBot\nAllow: /\nUser-agent: ChatGPT-User\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: /sitemap.xml\n`);
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${allUrls.map(u => `<url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);

console.log(`✓ Built ${written.length} pages → ${DIST}`);
written.forEach(u => console.log('  /' + u));
