# Christian Brindle Insurance Services — website

Independent Medicare, ACA & senior insurance site for Salt Lake City, Utah.
Built with the Ambrose template formula **`borealis × gridline × medicare-advantage`**.

> Standalone site — unrelated to the Red Rocks demo (`/index.html`, `/nil.html`) at the repo root.

## Stack

A tiny data-driven static-site generator (no framework, no build step beyond Node):

| Path | What it is |
|------|-----------|
| `content/agency.json` | **Single source of truth** — profile, product lines, Learn articles, tools, market data, FAQ, compliance. Edit data, not pages. |
| `designs/gridline.css` | The "gridline" light **tech** design skin — themes every page. Swap the `brand.*` tokens in `agency.json` to match Christian's real logo colors. |
| `experiences/borealis.js` | The **borealis** WebGL2 aurora hero (starfield + aurora curtains) with a canvas/reduced-motion fallback. |
| `assets/app.js` | Nav, scroll reveal, count-up, and the hero **ZIP-first quote funnel**. |
| `assets/calculators.js` | The 6 Free-Tools calculators. |
| `engine/render.js` | Reads `agency.json` → writes the full site to `dist/`. |
| `engine/add-post.js` | **Daily blog engine** entry point — prepends a new article, then re-render. |

## Build

```bash
node site/engine/render.js      # → site/dist/  (17 pages)
```

Preview: serve `site/dist/` with any static server (e.g. `npx serve site/dist`).
Deploy: point Vercel/Cloudflare Pages at `site/dist` (or run the engine in CI).

## Pages (17)

Home · Services hub + 4 product pages (Medicare Advantage, Medigap, Part D, ACA) ·
Learn hub + 7 articles · Tools (6 calculators) · About · Contact ·
plus `llms.txt`, `robots.txt`, `sitemap.xml`.

## Daily auto-blog engine

```bash
# 1. Ambrose medicare-blog-writer drafts a post as JSON (draft.json):
#    { slug, title, category, read, excerpt, body:[{h, p:[...], list:[...]}] }
node site/engine/add-post.js ./draft.json
node site/engine/render.js
# 2. commit + deploy
```

Wire steps 1–2 to a daily scheduled Ambrose sequence / cron to auto-publish.

## ⚠️ Before launch — fill the placeholders

Four facts can't be invented; they're marked `[PLACEHOLDER …]` in `agency.json → agency`:

- `npn` (only remaining placeholder — phone/email/address are real)
- **Real logo:** drop the file at `site/assets/logo.png` (or `.svg`) and the nav uses it automatically — no code change. A faithful faceted-iceberg SVG mark ships as the fallback.
- Wire the Contact form to **GoHighLevel (GHL)** (form/webhook)
- Optional: replace the funnel's client-side estimate with a live
  `plan_quoter.medicare_plans` (THE BRAIN) call for real Salt Lake County plan counts

## Compliance

Medicare TPMO disclaimer (76 organizations / 2,345 plans), CMS non-affiliation,
Integrity Marketing Partners statement, and "informational only" notice render in the
footer of **every** page. Calculators and the funnel are year-stamped (2025) and
estimate-framed. Reference model: eseniorinsurance.com.
